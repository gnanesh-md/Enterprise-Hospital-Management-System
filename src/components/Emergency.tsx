import React, { useState } from "react"
import {
  AcuityBadge,
  StatusBadge,
  Table,
  TR,
  TD,
  Btn,
  Card,
  MetricCard,
} from "./shared"
import { Icon } from "./icons"

const ED_PATIENTS = [
  {
    id: "ED-01",
    name: "Thomas Reed",
    age: 68,
    chief: "Chest pain, SOB",
    acuity: 1,
    room: "Trauma 1",
    wait: "0m",
    provider: "Dr. Shah",
    status: "In Care",
    nurses: "RN Murphy",
  },
  {
    id: "ED-02",
    name: "Ann Martinez",
    age: 52,
    chief: "Altered mental status",
    acuity: 2,
    room: "12",
    wait: "8m",
    provider: "Dr. Chen",
    status: "In Care",
    nurses: "RN Davis",
  },
  {
    id: "ED-03",
    name: "James Liu",
    age: 35,
    chief: "Abdominal pain",
    acuity: 2,
    room: "7",
    wait: "12m",
    provider: "Dr. Shah",
    status: "In Care",
    nurses: "RN Davis",
  },
  {
    id: "ED-04",
    name: "Patricia Okonkwo",
    age: 71,
    chief: "Fall, R hip pain",
    acuity: 3,
    room: "4",
    wait: "24m",
    provider: "Dr. Chen",
    status: "In Care",
    nurses: "RN Pham",
  },
  {
    id: "ED-05",
    name: "Kevin Park",
    age: 28,
    chief: "Laceration R hand",
    acuity: 3,
    room: "9",
    wait: "31m",
    provider: "Dr. Williams",
    status: "In Care",
    nurses: "RN Pham",
  },
  {
    id: "ED-06",
    name: "Sandra Brown",
    age: 44,
    chief: "Migraine",
    acuity: 3,
    room: "6",
    wait: "18m",
    provider: "Dr. Williams",
    status: "In Care",
    nurses: "RN Brown",
  },
  {
    id: "ED-07",
    name: "George Watts",
    age: 60,
    chief: "Hypertensive urgency",
    acuity: 3,
    room: "11",
    wait: "22m",
    provider: "Dr. Chen",
    status: "In Care",
    nurses: "RN Murphy",
  },
  {
    id: "ED-08",
    name: "Isabel Cruz",
    age: 19,
    chief: "Ankle sprain",
    acuity: 4,
    room: "Wait",
    wait: "48m",
    provider: "—",
    status: "Waiting",
    nurses: "—",
  },
  {
    id: "ED-09",
    name: "Harold Bloom",
    age: 77,
    chief: "Urinary symptoms",
    acuity: 4,
    room: "Wait",
    wait: "55m",
    provider: "—",
    status: "Waiting",
    nurses: "—",
  },
  {
    id: "ED-10",
    name: "Mia Thompson",
    age: 31,
    chief: "Nausea/vomiting",
    acuity: 4,
    room: "Wait",
    wait: "1h 2m",
    provider: "—",
    status: "Waiting",
    nurses: "—",
  },
  {
    id: "ED-11",
    name: "Frank Olsen",
    age: 42,
    chief: "Back pain",
    acuity: 5,
    room: "Wait",
    wait: "1h 18m",
    provider: "—",
    status: "Waiting",
    nurses: "—",
  },
  {
    id: "ED-12",
    name: "Rachel Green",
    age: 26,
    chief: "Sore throat",
    acuity: 5,
    room: "Wait",
    wait: "1h 35m",
    provider: "—",
    status: "Waiting",
    nurses: "—",
  },
]

export default function Emergency({ onSelect }: { onSelect?: () => void }) {
  const [view, setView] = useState<"board" | "list">("board")

  const critical = ED_PATIENTS.filter((p) => p.acuity <= 2).length
  const waiting = ED_PATIENTS.filter((p) => p.status === "Waiting").length
  const inCare = ED_PATIENTS.filter((p) => p.status === "In Care").length

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">
            Emergency Department
          </h1>
          <p className="text-[11.5px] text-[#64748B]">
            General Hospital ED · Real-time census · Aug 23, 2026 · 10:47 AM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#DDE2EC] rounded overflow-hidden">
            <button
              onClick={() => setView("board")}
              className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                view === "board"
                  ? "bg-[#1B4FD8] text-white"
                  : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                view === "list"
                  ? "bg-[#1B4FD8] text-white"
                  : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
            >
              List
            </button>
          </div>
          <Btn variant="primary" size="sm">
            <Icon.Plus /> Register Patient
          </Btn>
        </div>
      </div>

      {/* Census bar */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 grid grid-cols-4 md:grid-cols-6 gap-4">
        <div className="text-center">
          <div className="text-2xl font-semibold font-mono text-gray-900">
            {ED_PATIENTS.length}
          </div>
          <div className="text-[11px] font-medium text-[#64748B]">
            Total Census
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold font-mono text-[#DC2626]">
            {critical}
          </div>
          <div className="text-[11px] font-medium text-[#64748B]">
            ESI 1–2 (Critical)
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold font-mono text-[#D97706]">
            {waiting}
          </div>
          <div className="text-[11px] font-medium text-[#64748B]">Waiting</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold font-mono text-[#16A34A]">
            {inCare}
          </div>
          <div className="text-[11px] font-medium text-[#64748B]">In Care</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold font-mono text-[#0284C7]">
            6
          </div>
          <div className="text-[11px] font-medium text-[#64748B]">
            Rooms Available
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold font-mono text-[#7C3AED]">
            3
          </div>
          <div className="text-[11px] font-medium text-[#64748B]">
            Awaiting Admission
          </div>
        </div>
      </div>

      <div className="p-5">
        {view === "board" ? (
          /* Track Board */
          <div className="bg-white border border-[#DDE2EC] rounded overflow-hidden">
            <div
              className="grid text-[10.5px] font-semibold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC] border-b border-[#DDE2EC]"
              style={{
                gridTemplateColumns:
                  "32px 1fr 80px 70px 60px 120px 120px 100px 80px",
              }}
            >
              {[
                "",
                "Patient",
                "Chief Complaint",
                "Acuity",
                "Room",
                "Wait Time",
                "Provider",
                "Status",
                "",
              ].map((h, i) => (
                <div key={i} className="px-3 py-2">
                  {h}
                </div>
              ))}
            </div>
            {ED_PATIENTS.map((p, i) => (
              <div
                key={i}
                className={`grid items-center border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] cursor-pointer transition-colors
                  ${
                    p.acuity === 1
                      ? "bg-[#FEF2F2]"
                      : p.acuity === 2
                        ? "bg-[#FFFBEB]"
                        : ""
                  }`}
                style={{
                  gridTemplateColumns:
                    "32px 1fr 80px 70px 60px 120px 120px 100px 80px",
                }}
                onClick={onSelect}
              >
                <div className="pl-3 text-[11px] font-mono text-[#94A3B8]">
                  {i + 1}
                </div>
                <div className="px-3 py-2.5">
                  <div className="text-[12.5px] font-semibold text-gray-900">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    {p.age} yrs · {p.nurses}
                  </div>
                </div>
                <div className="px-3 text-[11.5px] text-gray-700 truncate">
                  {p.chief}
                </div>
                <div className="px-3">
                  <AcuityBadge level={p.acuity} />
                </div>
                <div className="px-3">
                  <span
                    className={`font-mono font-semibold text-[12px] ${
                      p.room === "Wait" ? "text-[#D97706]" : "text-gray-800"
                    }`}
                  >
                    {p.room}
                  </span>
                </div>
                <div className="px-3">
                  <span
                    className={`font-mono text-[12px] ${
                      parseInt(p.wait) > 60 || p.wait.includes("h")
                        ? "text-[#DC2626] font-semibold"
                        : parseInt(p.wait) > 30
                          ? "text-[#D97706] font-semibold"
                          : "text-gray-700"
                    }`}
                  >
                    {p.wait}
                  </span>
                </div>
                <div className="px-3 text-[11.5px] text-[#64748B] truncate">
                  {p.provider}
                </div>
                <div className="px-3">
                  <StatusBadge
                    status={p.status === "In Care" ? "inprogress" : p.status}
                  />
                </div>
                <div className="px-2">
                  <div className="flex gap-1">
                    <Btn
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        onSelect?.()
                      }}
                    >
                      Chart
                    </Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#DDE2EC] rounded overflow-hidden">
            <Table
              headers={[
                "Patient",
                "Age",
                "Chief Complaint",
                "Acuity",
                "Room",
                "Wait",
                "Provider",
                "Status",
                "",
              ]}
            >
              {ED_PATIENTS.map((p, i) => (
                <TR key={i} onClick={onSelect}>
                  <TD>
                    <span className="font-semibold text-gray-900">
                      {p.name}
                    </span>
                  </TD>
                  <TD>
                    <span className="font-mono text-[#64748B]">{p.age}</span>
                  </TD>
                  <TD>{p.chief}</TD>
                  <TD>
                    <AcuityBadge level={p.acuity} />
                  </TD>
                  <TD>
                    <span className="font-mono font-semibold">{p.room}</span>
                  </TD>
                  <TD>
                    <span
                      className={`font-mono ${
                        p.wait.includes("h")
                          ? "text-[#DC2626] font-semibold"
                          : ""
                      }`}
                    >
                      {p.wait}
                    </span>
                  </TD>
                  <TD>
                    <span className="text-[#64748B]">{p.provider}</span>
                  </TD>
                  <TD>
                    <StatusBadge
                      status={p.status === "In Care" ? "inprogress" : p.status}
                    />
                  </TD>
                  <TD>
                    <Btn
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        onSelect?.()
                      }}
                    >
                      Chart
                    </Btn>
                  </TD>
                </TR>
              ))}
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
