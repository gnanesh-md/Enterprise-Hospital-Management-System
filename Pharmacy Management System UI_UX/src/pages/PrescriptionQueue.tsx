import { useState } from "react"
import {
  Search,
  Filter,
  X,
  User,
  Stethoscope,
  FileText,
  CheckCircle,
  Play,
  XCircle,
  MessageSquare,
  ChevronRight,
} from "lucide-react"
import { prescriptions } from "../data/mockData"
import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"

const filters = [
  "All",
  "Pending",
  "Processing",
  "Ready",
  "Dispensed",
  "Rejected",
]

interface PrescriptionQueueProps {
  onNavigate: (page: string) => void
}

export default function PrescriptionQueue({
  onNavigate,
}: PrescriptionQueueProps) {
  const [activeFilter, setActiveFilter] = useState("All")
  const [selected, setSelected] = useState<typeof prescriptions[0] | null>(null)
  const [search, setSearch] = useState("")

  const filtered = prescriptions.filter((rx) => {
    const matchStatus =
      activeFilter === "All" || rx.status === activeFilter.toLowerCase()
    const matchSearch =
      !search ||
      rx.patient.toLowerCase().includes(search.toLowerCase()) ||
      rx.id.includes(search) ||
      rx.doctor.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const rxMeds = [
    {
      name: "Metformin 500mg",
      dosage: "1 tablet",
      frequency: "Twice daily",
      duration: "30 days",
      instructions: "After meals",
    },
    {
      name: "Amlodipine 5mg",
      dosage: "1 tablet",
      frequency: "Once daily",
      duration: "30 days",
      instructions: "Morning, with water",
    },
    {
      name: "Atorvastatin 10mg",
      dosage: "1 tablet",
      frequency: "Once daily",
      duration: "30 days",
      instructions: "At bedtime",
    },
    {
      name: "Pantoprazole 40mg",
      dosage: "1 tablet",
      frequency: "Once daily",
      duration: "14 days",
      instructions: "Before breakfast",
    },
  ]

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0">
          <PageHeader
            breadcrumbs={[
              { label: "Pharmacy" },
              { label: "Prescription Queue" },
            ]}
            title="Prescription Queue"
            description="128 prescriptions processed today · 4 pending"
            onNavigate={onNavigate}
          />

          {/* Filters */}
          <div className="flex items-center gap-3 mt-4 mb-0 flex-wrap">
            <div className="flex rounded-lg border border-[#e2e8f0] overflow-hidden bg-white text-[13px]">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="px-4 py-2 font-medium transition-colors border-r last:border-r-0 border-[#e2e8f0]"
                  style={{
                    background: activeFilter === f ? "#0f172a" : "#fff",
                    color: activeFilter === f ? "#fff" : "#64748b",
                  }}
                >
                  {f}
                  {f === "Pending" && (
                    <span
                      className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background:
                          activeFilter === f
                            ? "rgba(255,255,255,0.2)"
                            : "#fef2f2",
                        color: activeFilter === f ? "#fff" : "#dc2626",
                      }}
                    >
                      4
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2">
                <Search size={14} className="text-[#94a3b8]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient, doctor, ID…"
                  className="text-[13px] outline-none text-[#0f172a] placeholder:text-[#94a3b8] w-44"
                />
              </div>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-[#374151] hover:bg-[#f8fafc] transition-colors">
                <Filter size={13} /> Filter
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Prescription ID</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Pharmacist</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <ClipboardIcon />
                      <p className="font-medium text-[#374151] mt-3">
                        No prescriptions found
                      </p>
                      <p className="text-[12px] text-[#94a3b8] mt-1">
                        Try adjusting your search or filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((rx) => (
                    <tr
                      key={rx.id}
                      onClick={() => setSelected(rx)}
                      className="cursor-pointer"
                    >
                      <td
                        className="font-mono text-[12px] font-semibold"
                        style={{ color: "#2563eb" }}
                      >
                        {rx.id}
                      </td>
                      <td>
                        <p className="font-medium text-[#0f172a] text-[13px]">
                          {rx.patient}
                        </p>
                        <p className="text-[11px] text-[#94a3b8]">
                          {rx.age}y · {rx.gender} · {rx.contact}
                        </p>
                      </td>
                      <td>
                        <p className="text-[13px] text-[#374151]">
                          {rx.doctor}
                        </p>
                        <p className="text-[11px] text-[#94a3b8]">
                          {rx.department}
                        </p>
                      </td>
                      <td className="text-[12px] text-[#64748b]">{rx.date}</td>
                      <td className="text-[13px] font-semibold text-center">
                        {rx.items}
                      </td>
                      <td>
                        <StatusBadge status={rx.priority} size="sm" />
                      </td>
                      <td>
                        <StatusBadge status={rx.status} size="sm" />
                      </td>
                      <td className="text-[13px] text-[#64748b]">
                        {rx.pharmacist ?? (
                          <span className="text-[#94a3b8] text-[12px]">—</span>
                        )}
                      </td>
                      <td>
                        <button className="flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-lg border border-[#e2e8f0] text-[#374151] hover:bg-[#f1f5f9] transition-colors">
                          View <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="w-96 bg-white border-l border-[#e2e8f0] flex flex-col flex-shrink-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f1f5f9]">
            <div>
              <p className="font-semibold text-[14px] text-[#0f172a]">
                {selected.id}
              </p>
              <p className="text-[12px] text-[#64748b]">
                {selected.date} · {selected.time}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="p-1.5 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Patient */}
            <Section icon={<User size={14} />} title="Patient">
              <Row label="Name" value={selected.patient} />
              <Row
                label="Age / Gender"
                value={`${selected.age}y · ${selected.gender}`}
              />
              <Row label="Contact" value={selected.contact} />
              <Row label="Priority">
                <StatusBadge status={selected.priority} size="sm" />
              </Row>
            </Section>

            {/* Doctor */}
            <Section icon={<Stethoscope size={14} />} title="Doctor">
              <Row label="Name" value={selected.doctor} />
              <Row label="Department" value={selected.department} />
              <Row label="Reg. No." value={selected.regNo} />
            </Section>

            {/* Prescription */}
            <Section icon={<FileText size={14} />} title="Prescription">
              <Row label="Date" value={selected.date} />
              <Row label="Diagnosis" value={selected.diagnosis} />
            </Section>

            {/* Medicines */}
            <div>
              <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-2">
                Prescribed Medicines
              </p>
              <div className="space-y-2">
                {rxMeds.slice(0, selected.items).map((m, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-[#f1f5f9] bg-[#f8fafc]"
                  >
                    <p className="text-[13px] font-semibold text-[#0f172a]">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-[#64748b] mt-0.5">
                      {m.dosage} · {m.frequency} · {m.duration}
                    </p>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5 italic">
                      {m.instructions}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[12px] text-[#64748b]">Status</span>
              <StatusBadge status={selected.status} />
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-[#e2e8f0] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white text-[12px] font-medium"
                style={{ background: "#0f766e" }}
              >
                <CheckCircle size={13} /> Verify
              </button>
              <button
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white text-[12px] font-medium"
                style={{ background: "#2563eb" }}
              >
                <Play size={13} /> Dispense
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#e2e8f0] text-[12px] font-medium text-[#dc2626] hover:bg-[#fef2f2] transition-colors">
                <XCircle size={13} /> Reject
              </button>
              <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#e2e8f0] text-[12px] font-medium text-[#374151] hover:bg-[#f8fafc] transition-colors">
                <MessageSquare size={13} /> Clarify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[#64748b]">{icon}</span>
        <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wide">
          {title}
        </p>
      </div>
      <div className="space-y-1.5 pl-5">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  children,
}: {
  label: string
  value?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-[#94a3b8] flex-shrink-0">{label}</span>
      {children ?? (
        <span className="text-[13px] text-[#0f172a] font-medium text-right">
          {value}
        </span>
      )}
    </div>
  )
}

function ClipboardIcon() {
  return (
    <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center mx-auto">
      <FileText size={22} className="text-[#94a3b8]" />
    </div>
  )
}
