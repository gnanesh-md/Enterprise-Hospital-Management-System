import React, { useState } from "react"
import type { IcuPatient } from "../ICU"
import { formatDateTimeIST } from "../../lib/format"
import { BedDatabase } from "../../services/bedDb"

export type IcuDischargeRecord = {
  id: string
  patientName: string
  mrn: string
  bed: string
  unit: string
  dischargeType: "Ward Stepdown" | "Home Discharge" | "Facility Transfer"
  destinationWard?: string
  dischargeCondition: "Stable" | "Improved" | "Satisfactory" | "Critical / Transfer"
  dischargeDiagnosis: string
  attendingDoctor: string
  nurseInCharge: string
  ventStatus: string
  infusionClearance: string
  dischargedAt: string
  receptionStatus: "Awaiting Reception Settlement" | "Acknowledged at Reception" | "Bed Allocated at Reception"
  clinicalSummaryNotes: string
}

interface IcuDischargeModalProps {
  patient: IcuPatient
  isOpen: boolean
  onClose: () => void
  onConfirmDischarge: (record: IcuDischargeRecord) => void
}

const RECEPTION_DISCHARGES_KEY = "hms_icu_reception_discharges_v1"

export function getDischargedIcuPatients(): IcuDischargeRecord[] {
  try {
    const raw = localStorage.getItem(RECEPTION_DISCHARGES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveDischargedIcuPatient(record: IcuDischargeRecord) {
  try {
    const existing = getDischargedIcuPatients()
    const updated = [record, ...existing.filter((r) => r.id !== record.id)]
    localStorage.setItem(RECEPTION_DISCHARGES_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent("icu:patient_discharged_to_reception", { detail: record }),
    )
  } catch {}
}

export function updateIcuDischargeStatus(
  id: string,
  receptionStatus: IcuDischargeRecord["receptionStatus"],
) {
  try {
    const existing = getDischargedIcuPatients()
    const updated = existing.map((r) =>
      r.id === id ? { ...r, receptionStatus } : r,
    )
    localStorage.setItem(RECEPTION_DISCHARGES_KEY, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent("icu:patient_discharged_to_reception", { detail: { id, receptionStatus } }),
    )
  } catch {}
}


export function IcuDischargeModal({
  patient,
  isOpen,
  onClose,
  onConfirmDischarge,
}: IcuDischargeModalProps) {
  const [dischargeType, setDischargeType] = useState<
    "Ward Stepdown" | "Home Discharge" | "Facility Transfer"
  >("Ward Stepdown")
  const [destinationWard, setDestinationWard] = useState("3N Medical/Surgical")
  const [dischargeCondition, setDischargeCondition] = useState<
    "Stable" | "Improved" | "Satisfactory" | "Critical / Transfer"
  >("Stable")
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState(
    patient.dx || "ICU Clinical Care",
  )
  const [attendingDoctor, setAttendingDoctor] = useState(
    patient.provider || "Dr. Shah",
  )
  const [nurseInCharge, setNurseInCharge] = useState(
    patient.nurse || "RN Murphy",
  )
  const [ventStatus, setVentStatus] = useState("Weaned to Room Air")
  const [infusionClearance, setInfusionClearance] = useState(
    "All IV vasopressor drips stopped, peripheral line intact",
  )
  const [clinicalSummaryNotes, setClinicalSummaryNotes] = useState(
    `Patient ${patient.name || "Occupant"} cleared for ICU discharge. Hemodynamically stable for >24h. Transfer file transmitted to Reception counter.`,
  )

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const now = new Date().toISOString()
    const record: IcuDischargeRecord = {
      id: `ICU-DISC-${Math.floor(10000 + Math.random() * 90000)}`,
      patientName: patient.name || "Unassigned Patient",
      mrn: patient.mrn || "100999",
      bed: patient.bed,
      unit: patient.unit,
      dischargeType,
      destinationWard: dischargeType === "Ward Stepdown" ? destinationWard : undefined,
      dischargeCondition,
      dischargeDiagnosis,
      attendingDoctor,
      nurseInCharge,
      ventStatus,
      infusionClearance,
      dischargedAt: now,
      receptionStatus: "Awaiting Reception Settlement",
      clinicalSummaryNotes,
    }

    saveDischargedIcuPatient(record)

    // Archive in BedDatabase if physical bed exists
    try {
      const beds = BedDatabase.load()
      const match = beds.find(
        (b) =>
          b.bed_no === patient.bed ||
          b.patient_id === patient.mrn ||
          (b.patient_name && b.patient_name.includes(patient.name || "___")),
      )
      if (match) {
        BedDatabase.releaseBed(match.id, `ICU Discharge: ${dischargeType}`)
      }
    } catch {}

    onConfirmDischarge(record)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/80 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-rose-700 text-white px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-xs flex items-center justify-center text-lg">
                📋
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">
                  ICU Patient Discharge &amp; Reception Transfer
                </h3>
                <p className="text-xs text-rose-100 mt-0.5">
                  Complete clinical clearance, generate handover notes, and dispatch record to Reception.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Patient Summary Banner */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 flex flex-wrap items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-medium">Patient:</span>
            <strong className="text-slate-900 font-bold text-sm">{patient.name || "Occupant"}</strong>
            <span className="bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full font-mono text-[11px]">
              {patient.bed} · MRN {patient.mrn}
            </span>
          </div>
          <div className="text-slate-600 font-medium flex items-center gap-1.5">
            <span>Length of Stay:</span>
            <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
              {patient.los}
            </span>
          </div>
        </div>

        {/* Discharge Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* 1. Destination Type */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Select Discharge &amp; Transfer Destination
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "Ward Stepdown",
                  label: "🏥 Stepdown Ward",
                  desc: "Transfer to general inpatient ward via Reception",
                },
                {
                  id: "Home Discharge",
                  label: "🏠 Home Discharge",
                  desc: "Discharge home — final billing at Reception",
                },
                {
                  id: "Facility Transfer",
                  label: "🚑 Tertiary Transfer",
                  desc: "Transfer to external hospital / specialized center",
                },
              ].map((dest) => (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() => setDischargeType(dest.id as any)}
                  className={`p-3.5 text-left border rounded-xl transition-all cursor-pointer ${
                    dischargeType === dest.id
                      ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 text-rose-950 font-bold shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="font-bold text-xs">{dest.label}</div>
                  <div className="text-[10.5px] text-slate-500 mt-1 leading-relaxed">
                    {dest.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Destination Ward Selection if Ward Stepdown */}
          {dischargeType === "Ward Stepdown" && (
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-4 space-y-2">
              <label className="block text-[11px] font-bold text-blue-950 uppercase tracking-wider">
                Target Stepdown Ward (Reception Bed Allocation)
              </label>
              <select
                value={destinationWard}
                onChange={(e) => setDestinationWard(e.target.value)}
                className="w-full bg-white border border-blue-300/80 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value="3N Medical/Surgical">3N Medical/Surgical Ward</option>
                <option value="4S Surgical">4S Surgical Ward</option>
                <option value="2nd Floor Ward">2nd Floor Deluxe Ward</option>
                <option value="General Medical Ward">General Medical Ward</option>
                <option value="ICU Stepdown Unit">ICU Stepdown Intermediate Care</option>
              </select>
            </div>
          )}

          {/* 2. Clinical Condition & Diagnosis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Discharge Clinical Condition
              </label>
              <select
                value={dischargeCondition}
                onChange={(e) => setDischargeCondition(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              >
                <option value="Stable">Stable</option>
                <option value="Improved">Improved</option>
                <option value="Satisfactory">Satisfactory</option>
                <option value="Critical / Transfer">Critical / Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Attending Physician Clearance
              </label>
              <input
                type="text"
                value={attendingDoctor}
                onChange={(e) => setAttendingDoctor(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                required
              />
            </div>
          </div>

          {/* 3. Respiratory & Infusion Clearances */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Ventilator / Airway Weaning Status
              </label>
              <select
                value={ventStatus}
                onChange={(e) => setVentStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              >
                <option value="Weaned to Room Air">Weaned to Room Air</option>
                <option value="Nasal Cannula 2L">Nasal Cannula 2L/min</option>
                <option value="Extubated 12h ago">Extubated Successfully &gt;12h</option>
                <option value="Tracheostomy Collar">Tracheostomy Collar</option>
                <option value="Non-invasive BiPAP">Non-invasive BiPAP / CPAP</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                ICU Nurse In-Charge
              </label>
              <input
                type="text"
                value={nurseInCharge}
                onChange={(e) => setNurseInCharge(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              IV Infusion &amp; Lines Clearance Notes
            </label>
            <input
              type="text"
              value={infusionClearance}
              onChange={(e) => setInfusionClearance(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              placeholder="e.g. All vasopressor drips stopped, peripheral lines intact..."
            />
          </div>

          {/* 4. Handover Notes to Reception */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Clinical Discharge Summary &amp; Reception Handover Instructions
            </label>
            <textarea
              rows={3}
              value={clinicalSummaryNotes}
              onChange={(e) => setClinicalSummaryNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-3.5 text-xs text-slate-800 leading-relaxed font-sans focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>📋 Confirm ICU Discharge &amp; Send to Reception →</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Printable ICU Discharge & Reception Transfer Summary Slip Modal ──────── */
export function IcuDischargeSummarySlipModal({
  record,
  onClose,
}: {
  record: IcuDischargeRecord | null
  onClose: () => void
}) {
  if (!record) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden rounded-none my-auto">
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between print:hidden">
          <span className="font-bold text-xs flex items-center gap-2">
            <span>🖨</span> Official ICU Discharge Summary &amp; Reception Handover
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-none cursor-pointer"
            >
              Print Summary
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-slate-300 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6 text-slate-900 font-sans text-xs print:p-4">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                Enterprise Hospital Management System
              </h1>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                Department of Critical Care Medicine &amp; Intensive Care Unit
              </p>
            </div>
            <div className="text-right">
              <div className="bg-red-100 text-red-800 border border-red-300 px-3 py-1 text-[11px] font-black uppercase tracking-wider inline-block">
                ICU DISCHARGE SUMMARY
              </div>
              <div className="text-[10.5px] font-mono text-slate-500 mt-1">
                Ref ID: <strong>{record.id}</strong>
              </div>
            </div>
          </div>

          {/* Patient Details Table */}
          <div className="bg-slate-50 border border-slate-300 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Patient Name</span>
              <strong className="text-sm font-bold text-slate-900">{record.patientName}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">MRN / UMR</span>
              <strong className="font-mono text-blue-800 text-xs">{record.mrn}</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Discharged Unit</span>
              <strong className="text-slate-900">{record.unit} ({record.bed})</strong>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Discharge Time</span>
              <strong className="font-mono text-slate-900">{formatDateTimeIST(record.dischargedAt)}</strong>
            </div>
          </div>

          {/* Clinical Discharge Details */}
          <div className="border border-slate-300 divide-y divide-slate-200">
            <div className="p-3 bg-slate-100 font-bold uppercase text-[11px] tracking-wider text-slate-800">
              1. Clinical Clearance Parameters
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10.5px] text-slate-500 block">Discharge Type &amp; Destination:</span>
                  <strong className="text-blue-900 font-bold">{record.dischargeType} {record.destinationWard ? `(${record.destinationWard})` : ""}</strong>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-500 block">Clinical Condition:</span>
                  <strong className="text-emerald-700 font-bold">{record.dischargeCondition}</strong>
                </div>
              </div>

              <div>
                <span className="text-[10.5px] text-slate-500 block">Primary Diagnosis:</span>
                <span className="font-semibold text-slate-900">{record.dischargeDiagnosis}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[10.5px] text-slate-500 block">Ventilator / Airway Weaning:</span>
                  <span className="font-mono font-bold text-slate-800">{record.ventStatus}</span>
                </div>
                <div>
                  <span className="text-[10.5px] text-slate-500 block">Infusion &amp; Drip Clearances:</span>
                  <span className="font-mono text-slate-800">{record.infusionClearance}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-100 font-bold uppercase text-[11px] tracking-wider text-slate-800">
              2. Reception Handover &amp; Summary Notes
            </div>
            <div className="p-4 text-slate-800 leading-relaxed font-sans text-xs bg-white">
              {record.clinicalSummaryNotes}
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 flex justify-between items-end border-t border-slate-300 text-xs">
            <div>
              <div className="font-bold text-slate-900">{record.nurseInCharge}</div>
              <div className="text-[10.5px] text-slate-500">ICU Shift Charge Nurse</div>
            </div>
            <div className="text-center">
              <div className="text-[10.5px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 mb-2">
                RECEPTION STATUS: {record.receptionStatus.toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-900">{record.attendingDoctor}</div>
              <div className="text-[10.5px] text-slate-500">Attending Critical Care Physician</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IcuDischargeModal
