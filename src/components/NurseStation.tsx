import React, { useEffect, useMemo, useRef, useState } from "react"
import { db, DBOPEncounter } from "../services/db"
import { useStickyState } from "../hooks/useStickyState"
import { Icon } from "./icons"
import {
  getFloorAlerts,
  markFloorAlertsRead,
  subscribe as subscribeNotifications,
  type PatientNotification,
} from "../services/patientNotifications"

/** Statuses considered awaiting triage at Nurse Station */
const AWAITING_VITALS: DBOPEncounter["status"][] = [
  "Registered",
  "In Queue",
  "Symptoms Captured",
  "AI Recommended",
  "Awaiting Doctor",
  "Doctor Assigned",
  "Awaiting Consultation",
]

const EMPTY_VITALS: DBOPEncounter["vitals"] = {
  bp: "",
  pulse: "",
  temp: "",
  spo2: "",
  weight: "",
  notes: "",
}

const PRESET_CHIPS: Record<keyof DBOPEncounter["vitals"], string[]> = {
  bp: ["120/80", "110/70", "130/85", "140/90"],
  pulse: ["72", "80", "90", "100"],
  temp: ["98.6", "99.5", "100.4", "101.2"],
  spo2: ["99", "98", "96", "94"],
  weight: ["55", "65", "70", "80"],
  notes: [],
}

type Field = {
  key: keyof DBOPEncounter["vitals"]
  label: string
  unit: string
  placeholder: string
  icon: string
}

const FIELDS: Field[] = [
  {
    key: "bp",
    label: "Blood Pressure",
    unit: "mmHg",
    placeholder: "120/80",
    icon: "🩺",
  },
  {
    key: "pulse",
    label: "Pulse Rate",
    unit: "bpm",
    placeholder: "72",
    icon: "❤️",
  },
  {
    key: "temp",
    label: "Temperature",
    unit: "°F",
    placeholder: "98.6",
    icon: "🌡️",
  },
  {
    key: "spo2",
    label: "Oxygen SpO₂",
    unit: "%",
    placeholder: "98",
    icon: "🫁",
  },
  {
    key: "weight",
    label: "Body Weight",
    unit: "kg",
    placeholder: "70",
    icon: "⚖️",
  },
]

/** Ranges that flag for nurse attention */
function flagFor(
  key: keyof DBOPEncounter["vitals"],
  raw: string,
): { label: string ;level: "warn" | "danger" } | null {
  const n = parseFloat(raw)
  if (!raw.trim() || Number.isNaN(n)) return null
  switch (key) {
    case "pulse":
      if (n < 50) return { label: "Bradycardia (<50)", level: "danger" }
      if (n > 120) return { label: "Tachycardia (>120)", level: "danger" }
      if (n > 100) return { label: "Elevated Pulse (>100)", level: "warn" }
      return null
    case "temp":
      if (n >= 102.2) return { label: "High Fever (≥102.2°F)", level: "danger" }
      if (n >= 100.4) return { label: "Febrile (≥100.4°F)", level: "warn" }
      if (n < 95) return { label: "Hypothermia (<95°F)", level: "danger" }
      return null
    case "spo2":
      if (n < 92) return { label: "Severe Hypoxia (<92%)", level: "danger" }
      if (n < 95) return { label: "Low Oxygen (<95%)", level: "warn" }
      return null
    case "bp": {
      const sys = parseFloat(raw.split("/")[0])
      if (Number.isNaN(sys)) return null
      if (sys >= 160) return { label: "Stage 2 HTN (≥160)", level: "danger" }
      if (sys >= 140) return { label: "High BP (≥140)", level: "warn" }
      if (sys < 90) return { label: "Hypotension (<90)", level: "danger" }
      return null
    }
    default:
      return null
  }
}

/** Calculate NEWS2 warnings */
function calcNEWS2(
  v: DBOPEncounter["vitals"],
): { score: number ;risk: "Low" | "Medium" | "High" ;color: string } {
  let score = 0
  if (!v)
    return {
      score: 0,
      risk: "Low",
      color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    }

  const pulse = parseInt(v.pulse || "72")
  if (!isNaN(pulse)) {
    if (pulse <= 40 || pulse >= 131) score += 3
    else if (pulse >= 111) score += 2
    else if (pulse <= 50 || pulse >= 91) score += 1
  }

  const tempF = parseFloat(v.temp || "98.6")
  if (!isNaN(tempF)) {
    if (tempF < 95.0) score += 3
    else if (tempF >= 102.2) score += 2
    else if (tempF <= 96.8 || tempF >= 100.4) score += 1
  }

  const spo2 = parseInt(v.spo2 || "98")
  if (!isNaN(spo2)) {
    if (spo2 <= 91) score += 3
    else if (spo2 <= 93) score += 2
    else if (spo2 <= 95) score += 1
  }

  const sys = parseFloat((v.bp || "").split("/")[0])
  if (!isNaN(sys)) {
    if (sys <= 90 || sys >= 220) score += 3
    else if (sys <= 100) score += 2
    else if (sys <= 110) score += 1
  }

  if (score >= 5)
    return {
      score,
      risk: "High",
      color: "bg-red-100 text-red-900 border-red-300",
    }
  if (score >= 3)
    return {
      score,
      risk: "Medium",
      color: "bg-amber-100 text-amber-900 border-amber-300",
    }
  return {
    score,
    risk: "Low",
    color: "bg-emerald-100 text-emerald-900 border-emerald-300",
  }
}

export default function NurseStation({
  nurseName = "OP Nurse",
  onOpenQueue,
}: {
  nurseName?: string
  onOpenQueue?: () => void
}) {
  const [encounters, setEncounters] = useState<DBOPEncounter[]>(() =>
    db.getEncounters(),
  )
  const [selectedId, setSelectedId] = useStickyState<string | null>(
    "nurse_selected",
    null,
  )
  const [vitals, setVitals] = useState<DBOPEncounter["vitals"]>(EMPTY_VITALS)
  const clearVitalsDraft = () => setVitals({ ...EMPTY_VITALS })
  const [sent, setSent] = useState<{ name: string; doctor: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const unsub = db.subscribe(() => setEncounters(db.getEncounters()))
    return () => {
      unsub()
    }
  }, [])

  const [floorAlerts, setFloorAlerts] = useState<PatientNotification[]>(() =>
    getFloorAlerts(),
  )
  useEffect(() => {
    const unsub = subscribeNotifications(() => setFloorAlerts(getFloorAlerts()))
    return () => {
      unsub()
    }
  }, [])

  const waiting = useMemo(
    () =>
      encounters
        .filter((e) => {
          // Closed/Completed consultations are not waiting for nurse vitals
          if (
            e.status === "Under Consultation" ||
            e.status === "Consultation Completed" ||
            e.status === "OP Completed" ||
            e.status === "Billing Completed"
          ) {
            return false
          }
          // Patient called to nurse station is always in queue until vitals are saved
          if (e.timestamps?.calledToNurse) {
            return !e.timestamps?.vitalsRecorded
          }
          // Otherwise check status list and unrecorded vitals
          return AWAITING_VITALS.includes(e.status) && !e.timestamps?.vitalsRecorded
        })
        .sort((a, b) => {
          const ac = a.timestamps?.calledToNurse ? 0 : 1
          const bc = b.timestamps?.calledToNurse ? 0 : 1
          if (ac !== bc) return ac - bc
          return (a.timestamps?.arrival || "").localeCompare(
            b.timestamps?.arrival || "",
          )
        }),
    [encounters],
  )

  const filteredWaiting = useMemo(() => {
    if (!searchQuery.trim()) return waiting
    const q = searchQuery.toLowerCase().trim()
    return waiting.filter(
      (e) =>
        e.patientName.toLowerCase().includes(q) ||
        e.umr.toLowerCase().includes(q) ||
        e.opNumber.toLowerCase().includes(q) ||
        (e.assignedDoctor || "").toLowerCase().includes(q),
    )
  }, [waiting, searchQuery])

  const readyForDoctor = useMemo(
    () => encounters.filter((e) => e.status === "In Queue"),
    [encounters],
  )

  const withDoctor = useMemo(
    () => readyForDoctor.filter((e) => (e.assignedDoctor || "").trim()),
    [readyForDoctor],
  )
  const stuck = useMemo(
    () => readyForDoctor.filter((e) => !(e.assignedDoctor || "").trim()),
    [readyForDoctor],
  )

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const waitMinutes = (e: DBOPEncounter) => {
    const t = Date.parse(e.timestamps?.arrival || "")
    return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((now - t) / 60000))
  }
  const longestWait = waiting.reduce((m, e) => Math.max(m, waitMinutes(e)), 0)

  const selected = waiting.find((e) => e.id === selectedId) || null

  const seenRef = useRef<Set<string> | null>(null)
  const [arrivals, setArrivals] = useState<DBOPEncounter[]>([])
  useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = new Set(waiting.map((e) => e.id))
      return
    }
    const fresh = waiting.filter((e) => !seenRef.current!.has(e.id))
    if (fresh.length) {
      fresh.forEach((e) => seenRef.current!.add(e.id))
      setArrivals((prev) => [...fresh, ...prev].slice(0, 4))
    }
  }, [waiting])

  const select = (e: DBOPEncounter) => {
    setSelectedId(e.id)
    setSent(null)
    if (e.timestamps?.vitalsRecorded && e.vitals) {
      setVitals({ ...EMPTY_VITALS, ...e.vitals })
    } else {
      setVitals({ ...EMPTY_VITALS })
    }
  }

  const anyRecorded = FIELDS.some((f) => vitals[f.key]?.trim())
  const news2Analysis = calcNEWS2(vitals)
  const [abnormalAck, setAbnormalAck] = useState(false)

  useEffect(() => {
    setAbnormalAck(false)
  }, [selectedId])

  const dispatch = () => {
    if (!selected) return
    db.recordVitals(selected.id, vitals, nurseName)
    setSent({
      name: selected.patientName,
      doctor: selected.assignedDoctor || "the duty doctor",
    })
    setSelectedId(null)
    clearVitalsDraft()
    setAbnormalAck(false)
  }

  // A Medium/High NEWS2 score needs an explicit nurse acknowledgement before
  // dispatch -- previously this was only ever shown as a colored badge, never
  // something that had to be actively confirmed before the patient left the
  // vitals queue.
  const sendToDoctor = () => {
    if (!selected) return
    if (news2Analysis.risk !== "Low" && !abnormalAck) return
    dispatch()
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F1F5F9] text-slate-800 font-sans">
      {/* ── HEADER BAR ── */}
      <div className="bg-white border-b border-[#CBD5E1] px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 text-white font-bold flex items-center justify-center text-base rounded-none shadow-xs">
            🩺
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              OP Nurse Station
              <span className="text-[10.5px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-none font-mono uppercase font-bold">
                Triage &amp; Vitals Baseline
              </span>
            </h1>
            <p className="text-[11.5px] text-slate-500">
              Record baseline observations, check NEWS2 risk factors, and
              dispatch patients to doctor chambers.
            </p>
          </div>
        </div>

        {/* Top KPI Color Cards */}
        <div className="flex items-stretch gap-2.5">
          <div className="bg-amber-50/80 border border-amber-200 border-l-4 border-l-amber-500 rounded-none px-3.5 py-1.5 shadow-2xs min-w-[110px]">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-amber-900">
              Awaiting Vitals
            </p>
            <p className="text-xl font-bold font-mono text-amber-950 leading-tight mt-0.5">
              {waiting.length}
            </p>
            <p className="text-[10px] text-amber-800 font-semibold mt-0.5">
              Patients queued
            </p>
          </div>

          <div
            className={`border border-l-4 rounded-none px-3.5 py-1.5 shadow-2xs min-w-[110px] ${
              longestWait >= 30
                ? "bg-rose-50/80 border-rose-200 border-l-rose-600"
                : "bg-blue-50/80 border-blue-200 border-l-blue-600"
            }`}
          >
            <p
              className={`text-[9.5px] font-bold uppercase tracking-wider ${
                longestWait >= 30 ? "text-rose-900" : "text-blue-900"
              }`}
            >
              Longest Wait
            </p>
            <p
              className={`text-xl font-bold font-mono leading-tight mt-0.5 ${
                longestWait >= 30 ? "text-rose-950" : "text-blue-950"
              }`}
            >
              {longestWait}m
            </p>
            <p
              className={`text-[10px] font-semibold mt-0.5 ${
                longestWait >= 30 ? "text-rose-800" : "text-blue-800"
              }`}
            >
              {longestWait >= 30 ? "Needs triage!" : "In queue"}
            </p>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 border-l-4 border-l-emerald-600 rounded-none px-3.5 py-1.5 shadow-2xs min-w-[110px]">
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-900">
              Sent to Doctor
            </p>
            <p className="text-xl font-bold font-mono text-emerald-950 leading-tight mt-0.5">
              {readyForDoctor.length}
            </p>
            <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">
              Vitals recorded
            </p>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATIONS & ALERTS ── */}
      {floorAlerts.length > 0 && (
        <div className="mx-6 mt-4 rounded-none border border-blue-300 bg-blue-50 px-4 py-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-bold uppercase tracking-wide text-blue-900 flex items-center gap-1.5">
              <span>📢 Doctor Calling Patient ({floorAlerts.length})</span>
            </p>
            <button
              onClick={() => markFloorAlertsRead(floorAlerts.map((a) => a.id))}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
            >
              Acknowledge All
            </button>
          </div>
          <ul className="mt-1.5 space-y-1">
            {floorAlerts.slice(0, 4).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 text-xs bg-white border border-blue-200 p-2 rounded-none"
              >
                <span className="font-semibold text-slate-800">
                  {a.message}
                </span>
                <button
                  onClick={() => markFloorAlertsRead([a.id])}
                  className="text-[11px] font-bold text-blue-700 hover:underline whitespace-nowrap bg-blue-50 px-2 py-0.5 border border-blue-200"
                >
                  Walked Through ✓
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dispatch Confirmation Banner */}
      {sent && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-none bg-emerald-50 border border-emerald-300 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <p className="text-[13px] text-emerald-900 font-medium">
            ✅ Patient <strong>{sent.name}</strong> sent in to{" "}
            <strong>{sent.doctor}</strong>. Vitals recorded and queued.
          </p>
          <div className="flex items-center gap-2">
            {waiting.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  select(waiting[0])
                  setSent(null)
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-none cursor-pointer transition-colors shadow-xs"
              >
                Next Patient: {waiting[0].patientName} →
              </button>
            )}
            {waiting.length === 0 && onOpenQueue && (
              <button
                type="button"
                onClick={onOpenQueue}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-none cursor-pointer transition-colors shadow-xs"
              >
                View Live Queue →
              </button>
            )}
            <button
              onClick={() => setSent(null)}
              className="text-[11px] font-bold text-emerald-800 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Fresh Arrivals Banner */}
      {arrivals.length > 0 && (
        <div className="mx-6 mt-4 space-y-1.5">
          {arrivals.map((a) => (
            <div
              key={a.id}
              className="px-4 py-2 rounded-none bg-sky-50 border border-sky-300 flex items-center justify-between gap-3 text-xs shadow-2xs"
            >
              <p className="text-sky-950 font-medium">
                🆕 <strong>{a.patientName}</strong> just arrived from Reception
                {a.assignedDoctor ? (
                  <>
                    {" "}
                    for <strong>{a.assignedDoctor}</strong>
                  </>
                ) : null}
                {a.dept ? <> ({a.dept})</> : null} — Vitals needed
              </p>
              <button
                onClick={() => {
                  select(a)
                  setArrivals((p) => p.filter((x) => x.id !== a.id))
                }}
                className="text-[11px] font-bold text-sky-800 bg-white hover:bg-sky-100 border border-sky-300 px-2.5 py-0.5 rounded-none whitespace-nowrap cursor-pointer"
              >
                Take Vitals Now →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN TWO-COLUMN WORKSPACE ── */}
      <div className="flex-1 flex min-h-0 gap-4 p-6 pt-4">
        {/* SIDEBAR: WAITING PATIENTS LIST */}
        <aside className="w-[350px] flex-shrink-0 bg-white border border-[#CBD5E1] rounded-none flex flex-col min-h-0 shadow-2xs">
          <div className="p-3 border-b border-[#CBD5E1] bg-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                <span>📋 Waiting for Vitals</span>
              </h2>
              <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-none">
                {filteredWaiting.length} Patients
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, UMR, token..."
                className="w-full pl-7 pr-2 py-1 text-xs border border-slate-300 rounded-none bg-white focus:outline-none focus:border-blue-600 font-medium"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon.Search size={12} />
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
            {filteredWaiting.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 font-medium">
                {waiting.length === 0
                  ? "No patients currently waiting for triage."
                  : "No patient matches your search."}
              </div>
            ) : (
              filteredWaiting.map((e) => {
                const active = e.id === selectedId
                const waitMins = waitMinutes(e)
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => select(e)}
                    className={`w-full text-left p-3 transition-colors border-l-4 cursor-pointer ${
                      active
                        ? "bg-blue-50/90 border-l-blue-600 shadow-2xs"
                        : "hover:bg-slate-50 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-[13px] text-slate-900 truncate">
                        {e.patientName}
                      </span>
                      <span
                        className={`text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded-none border ${
                          waitMins >= 30
                            ? "bg-red-100 text-red-800 border-red-300"
                            : waitMins >= 15
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        ⏱️ {waitMins}m
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-blue-900 mt-1">
                      <span className="bg-blue-100 px-1.5 py-0.2 border border-blue-200">
                        {e.opNumber}
                      </span>
                      <span className="text-slate-500">UMR: {e.umr}</span>
                      <span className="text-slate-500">
                        · {e.age}y ({e.sex})
                      </span>
                    </div>

                    <p className="text-[11.5px] text-slate-600 mt-1 line-clamp-1 font-medium">
                      💬 {e.chiefComplaint || "General Evaluation"}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      {e.assignedDoctor ? (
                        <span className="text-blue-800 font-bold flex items-center gap-1">
                          👨‍⚕️ {e.assignedDoctor}
                        </span>
                      ) : (
                        <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                          ⚠️ No doctor assigned
                        </span>
                      )}

                      {e.timestamps?.calledToNurse ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-emerald-100 text-emerald-900 border border-emerald-300">
                          📢 Called {e.timestamps.calledToNurse}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">
                          Room {e.room || "101"}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* MAIN PANEL: VITALS ENTRY & PATIENT OVERVIEW */}
        <section className="flex-1 min-w-0 overflow-y-auto space-y-4">
          {!selected ? (
            <div className="space-y-4">
              {/* Empty State Banner */}
              <div className="bg-white border border-[#CBD5E1] rounded-none p-8 text-center shadow-2xs">
                <div className="text-4xl mb-3">👩‍⚕️</div>
                <h3 className="text-base font-bold text-slate-900">
                  {waiting.length > 0
                    ? "Select a Patient to Record Vitals"
                    : "Nurse Station Queue Clear"}
                </h3>
                <p className="text-[12.5px] text-slate-600 mt-1.5 max-w-md mx-auto">
                  {waiting.length > 0
                    ? "Select a patient from the left waiting list to capture baseline observations, calculate NEWS2 warning score, and dispatch to their consulting room."
                    : "No patients are currently waiting for baseline vitals."}
                </p>
                {waiting.length > 0 && (
                  <button
                    type="button"
                    onClick={() => select(waiting[0])}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-none transition-colors cursor-pointer shadow-xs"
                  >
                    Triage First Patient: {waiting[0].patientName} (
                    {waitMinutes(waiting[0])}m wait) →
                  </button>
                )}
              </div>

              {/* Unallocated Patients Warning */}
              {stuck.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-none p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <span>⚠️ Pending Doctor Allocation ({stuck.length})</span>
                    </h3>
                    <span className="text-[11px] font-mono font-bold text-amber-800">
                      Requires Reception Action
                    </span>
                  </div>
                  <p className="text-[11.5px] text-amber-900 mt-1">
                    Vitals are recorded for these patients, but no doctor was
                    assigned during booking.
                  </p>
                  <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                    {stuck.map((e) => (
                      <div
                        key={e.id}
                        className="p-2.5 bg-white border border-amber-200 rounded-none flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">
                            {e.patientName}
                          </span>
                          <span className="text-slate-500 font-mono text-[11px] ml-2">
                            UMR: {e.umr} · Dept: {e.dept || "General"}
                          </span>
                        </div>
                        <span className="text-[10.5px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 font-bold">
                          Awaiting Allocation
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patients Already Sent to Doctor */}
              <div className="bg-white border border-[#CBD5E1] rounded-none shadow-2xs overflow-hidden">
                <div className="px-5 py-3 border-b border-[#CBD5E1] bg-slate-100 flex items-center justify-between">
                  <h3 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-600 inline-block"></span>
                    Dispatched to Doctor Queue ({withDoctor.length})
                  </h3>
                  <span className="text-xs text-slate-500 font-mono font-bold">
                    Today's Handover History
                  </span>
                </div>
                {withDoctor.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-500 font-medium">
                    No patients dispatched yet today.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E2E8F0] max-h-72 overflow-y-auto">
                    {withDoctor.map((e) => (
                      <div
                        key={e.id}
                        className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-[13px]">
                            {e.patientName}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium">
                            UMR: {e.umr} · Doctor:{" "}
                            <strong>{e.assignedDoctor}</strong> · Room:{" "}
                            {e.room || "101"}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5">
                            BP: {e.vitals?.bp || "--"} · HR:{" "}
                            {e.vitals?.pulse || "--"}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {e.timestamps?.vitalsRecorded
                              ? `Recorded ${e.timestamps.vitalsRecorded}`
                              : "Vitals on file"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ACTIVE VITALS FORM FOR SELECTED PATIENT */
            <div className="space-y-4">
              {/* Selected Patient Banner */}
              <div className="bg-white border border-[#CBD5E1] rounded-none p-4 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {selected.patientName}
                      </h3>
                      <span className="font-mono text-xs font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5">
                        Token {selected.opNumber}
                      </span>
                    </div>
                    <p className="text-[11.5px] font-mono text-slate-600 font-bold mt-1">
                      UMR: {selected.umr} · {selected.age} yrs ({selected.sex})
                      · {selected.phone} · {selected.dept}
                    </p>
                  </div>
                  <div className="text-right bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-none">
                    <p className="text-[10.5px] uppercase font-bold text-blue-900">
                      Booked Doctor
                    </p>
                    <p className="text-[13px] font-bold text-blue-900">
                      👨‍⚕️ {selected.assignedDoctor || "Not assigned"}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-slate-700">
                      Chamber: {selected.room || "101"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-700">
                      Chief Complaint:{" "}
                    </span>
                    <span className="text-slate-900 font-medium">
                      {selected.chiefComplaint || "General Outpatient Checkup"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono font-bold">
                    Waiting: {waitMinutes(selected)} mins
                  </span>
                </div>
              </div>

              {/* Vitals Recording Card */}
              <div className="bg-white border border-[#CBD5E1] rounded-none shadow-2xs overflow-hidden">
                <div className="px-5 py-3 border-b border-[#CBD5E1] bg-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[13.5px] font-bold text-slate-900 flex items-center gap-2">
                      <span>🩺 Clinical Baseline Observations</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Form is empty by default for fresh entry. Tap a quick chip or preset to populate values.
                    </p>
                  </div>

                  {/* Dynamic NEWS2 Risk Score Preview */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">
                      NEWS2 Score:
                    </span>
                    <span
                      className={`px-2.5 py-1 text-xs font-bold border rounded-none font-mono ${news2Analysis.color}`}
                    >
                      {news2Analysis.score} ({news2Analysis.risk} Risk)
                    </span>
                  </div>
                </div>

                {/* Quick Presets Sub-Bar */}
                <div className="px-5 py-2.5 bg-blue-50/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold text-slate-700 flex items-center gap-1.5">
                    <span>⚡ Quick Actions:</span>
                    <span className="text-slate-500 font-normal">Fast fill measurements</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setVitals({
                          bp: "120/80",
                          pulse: "72",
                          temp: "98.6",
                          spo2: "98",
                          weight: "70",
                          notes: "",
                        })
                      }
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-none cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <span>⚡</span> Fill Normal Adult Preset
                    </button>
                    <button
                      type="button"
                      onClick={clearVitalsDraft}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold rounded-none cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                    >
                      <span>🧹</span> Clear All Fields
                    </button>
                  </div>
                </div>

                {/* Field Inputs Grid */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FIELDS.map((f) => {
                    const flag = flagFor(f.key, vitals[f.key] || "")
                    const chips = PRESET_CHIPS[f.key] || []
                    return (
                      <div key={f.key} className="space-y-1">
                        <label className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <span>{f.icon}</span>
                            <span>{f.label}</span>
                          </span>
                          <span className="font-mono text-slate-500 text-[11px] font-semibold">
                            {f.unit}
                          </span>
                        </label>
                        <div className="relative">
                          <input
                            value={vitals[f.key] || ""}
                            placeholder={f.placeholder}
                            onChange={(e) =>
                              setVitals((v) => ({
                                ...v,
                                [f.key]: e.target.value,
                              }))
                            }
                            className={`w-full border rounded-none px-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                              flag
                                ? flag.level === "danger"
                                  ? "border-red-400 bg-red-50 text-red-950 focus:border-red-600"
                                  : "border-amber-400 bg-amber-50 text-amber-950 focus:border-amber-600"
                                : "border-slate-300 bg-white focus:border-blue-600 text-slate-900"
                            }`}
                          />
                        </div>

                        {/* Quick Chip Shortcuts */}
                        {chips.length > 0 && (
                          <div className="flex items-center gap-1 pt-1 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Preset:</span>
                            {chips.map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() =>
                                  setVitals((v) => ({
                                    ...v,
                                    [f.key]: chip,
                                  }))
                                }
                                className={`px-1.5 py-0.5 text-[10.5px] font-mono font-bold rounded-none border cursor-pointer transition-colors ${
                                  vitals[f.key] === chip
                                    ? "bg-blue-600 text-white border-blue-700"
                                    : "bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border-slate-300"
                                }`}
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}

                        {flag && (
                          <span
                            className={`text-[10.5px] font-bold px-1.5 py-0.5 border rounded-none inline-block mt-1 ${
                              flag.level === "danger"
                                ? "bg-red-100 text-red-900 border-red-300"
                                : "bg-amber-100 text-amber-900 border-amber-300"
                            }`}
                          >
                            ⚠️ {flag.label}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Nurse Notes Section */}
                <div className="px-5 pb-5">
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>📝 Nurse Triage Notes</span>
                    </span>
                    <textarea
                      rows={2}
                      value={vitals.notes || ""}
                      placeholder="Add observations, symptoms, allergies, or instructions for the doctor..."
                      onChange={(e) =>
                        setVitals((v) => ({ ...v, notes: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded-none px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-600 bg-white"
                    />
                  </label>
                </div>

                {/* Abnormal NEWS2 acknowledgement -- required before dispatch */}
                {anyRecorded && news2Analysis.risk !== "Low" && (
                  <div className="px-5 py-2.5 border-t border-amber-300 bg-amber-50 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={abnormalAck}
                        onChange={(e) => setAbnormalAck(e.target.checked)}
                      />
                      NEWS2 {news2Analysis.score} ({news2Analysis.risk} Risk) --
                      I confirm these vitals before sending to the doctor.
                    </label>
                  </div>
                )}

                {/* Action Bar */}
                <div className="px-5 py-3 border-t border-[#CBD5E1] bg-slate-50 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-600">
                    {anyRecorded ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        ✓ Recorded by {nurseName}
                      </span>
                    ) : (
                      <span>
                        No readings entered — patient will be sent with
                        unrecorded vitals.
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={sendToDoctor}
                    disabled={anyRecorded && news2Analysis.risk !== "Low" && !abnormalAck}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-none cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>
                      Send in to {selected.assignedDoctor || "Doctor"}
                    </span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
