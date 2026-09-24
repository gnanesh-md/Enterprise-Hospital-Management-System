import React, { useState } from "react"
import { Table, TR, TD, StatusBadge, AlertBanner, Btn } from "./shared"
import { Icon } from "./icons"

const ALERTS = [
  {
    type: "critical" as const,
    title: "Critical Lab Result — John Smith (MRN #100245)",
    body: "Potassium 6.2 mmol/L — High risk hyperkalemia. Requires immediate physician review.",
    action: "Review Now",
  },
  {
    type: "warning" as const,
    title: "Emergency Dept Capacity Warning",
    body: "ED census at 38/42 beds (90% capacity). 8 patients waiting > 30 minutes.",
    action: "View ED Board",
  },
]

const METRICS = [
  {
    id: "patients",
    label: "Patients Today",
    value: "428",
    sub: "12 from yesterday",
    trend: "+2.8%",
    trendDir: "up" as const,
    icon: Icon.Patients,
    domain: "Patients",
    color: "#2563EB", // Royal Blue
    bgColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    action: "View All",
    target: "patients",
  },
  {
    id: "appointments",
    label: "Appointments",
    value: "126",
    sub: "14 remaining today",
    trend: "88% checked-in",
    trendDir: "neutral" as const,
    icon: Icon.Calendar,
    domain: "Outpatient",
    color: "#4F46E5", // Indigo
    bgColor: "#EEF2FF",
    borderColor: "#C7D2FE",
    action: "Schedule",
    target: "appointments",
  },
  {
    id: "admissions",
    label: "Inpatient Admissions",
    value: "38",
    sub: "7 pending bed assignment",
    trend: "+3 pending",
    trendDir: "up" as const,
    icon: Icon.Bed,
    domain: "Inpatient",
    color: "#7C3AED", // Violet/Purple
    bgColor: "#F5F3FF",
    borderColor: "#DDD6FE",
    action: "Bed Board",
    target: "inpatient",
  },
  {
    id: "discharges",
    label: "Discharges Ready",
    value: "31",
    sub: "6 ready for checkout",
    trend: "94% on schedule",
    trendDir: "down" as const, // Down is good for discharge wait times!
    icon: Icon.Discharge,
    domain: "Discharge",
    color: "#059669", // Emerald Green
    bgColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    action: "View Queue",
    target: "discharge",
  },
  {
    id: "ed_waiting",
    label: "ED Waiting Room",
    value: "8",
    sub: "3 ESI-1 or ESI-2 critical",
    trend: "Avg wait 18m",
    trendDir: "up" as const,
    icon: Icon.Emergency,
    domain: "Emergency",
    color: "#E11D48", // Crimson Red
    bgColor: "#FFF1F2",
    borderColor: "#FECDD3",
    action: "View ED",
    target: "emergency",
  },
  {
    id: "alerts",
    label: "Critical Alerts",
    value: "7",
    sub: "2 unacknowledged",
    trend: "High Urgency",
    trendDir: "up" as const,
    icon: Icon.Alert,
    domain: "Safety",
    color: "#DC2626", // Red
    bgColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    action: "Review",
    target: "emergency",
  },
]

const QUEUES = [
  {
    dept: "Emergency Department",
    code: "ED",
    waiting: 8,
    critical: 3,
    inCare: 30,
    available: 4,
    capacity: 42,
    color: "#E11D48",
    icon: Icon.Emergency,
  },
  {
    dept: "Inpatient 3-North (Medical)",
    code: "3N",
    waiting: 0,
    critical: 2,
    inCare: 24,
    available: 2,
    capacity: 26,
    color: "#7C3AED",
    icon: Icon.Inpatient,
  },
  {
    dept: "Inpatient 4-South (Surgical)",
    code: "4S",
    waiting: 0,
    critical: 1,
    inCare: 28,
    available: 4,
    capacity: 32,
    color: "#2563EB",
    icon: Icon.Bed,
  },
  {
    dept: "Intensive Care Unit (ICU)",
    code: "ICU",
    waiting: 0,
    critical: 6,
    inCare: 12,
    available: 2,
    capacity: 14,
    color: "#9333EA",
    icon: Icon.Stethoscope,
  },
  {
    dept: "Surgical Operating Rooms",
    code: "OR",
    waiting: 2,
    critical: 0,
    inCare: 3,
    available: 2,
    capacity: 5,
    color: "#059669",
    icon: Icon.Surgery,
  },
]

const APPOINTMENTS = [
  {
    time: "09:00 AM",
    patient: "Sarah Connelly",
    provider: "Dr. Adams",
    spec: "Cardiology",
    room: "Rm 101",
    status: "Completed",
  },
  {
    time: "09:30 AM",
    patient: "Marcus Webb",
    provider: "Dr. Lee",
    spec: "Neurology",
    room: "Rm 102",
    status: "In Progress",
  },
  {
    time: "10:00 AM",
    patient: "Elena Torres",
    provider: "Dr. Adams",
    spec: "Cardiology",
    room: "Rm 103",
    status: "Checked In",
  },
  {
    time: "10:30 AM",
    patient: "Robert Kim",
    provider: "Dr. Patel",
    spec: "Orthopedics",
    room: "Rm 104",
    status: "Pending",
  },
  {
    time: "11:00 AM",
    patient: "Jennifer Walsh",
    provider: "Dr. Lee",
    spec: "Neurology",
    room: "Rm 102",
    status: "Pending",
  },
  {
    time: "11:30 AM",
    patient: "David Chu",
    provider: "Dr. Adams",
    spec: "General",
    room: "Rm 101",
    status: "Pending",
  },
]

const PENDING_LABS = [
  {
    patient: "John Smith",
    mrn: "100245",
    test: "BMP (Basic Metabolic)",
    ordered: "08:42 AM",
    dept: "Chemistry",
    status: "Critical",
  },
  {
    patient: "Mary Jones",
    mrn: "100246",
    test: "CBC w/ differential",
    ordered: "09:10 AM",
    dept: "Hematology",
    status: "Collected",
  },
  {
    patient: "Thomas Reed",
    mrn: "100301",
    test: "Troponin I Serial x2",
    ordered: "09:28 AM",
    dept: "Cardiac Lab",
    status: "Critical",
  },
  {
    patient: "Anna Weiss",
    mrn: "100189",
    test: "Urinalysis Complete",
    ordered: "09:55 AM",
    dept: "Microbiology",
    status: "Processing",
  },
]

const QUICK_ACTIONS = [
  {
    label: "Patient Registration",
    desc: "Demographics & Triage",
    icon: Icon.Patients,
    actionKey: "patients",
    subKey: "register",
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    label: "Schedule Appointment",
    desc: "Outpatient Consults",
    icon: Icon.Calendar,
    actionKey: "appointments",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  {
    label: "ED Track Board",
    desc: "Emergency Room Grid",
    icon: Icon.Emergency,
    actionKey: "emergency",
    color: "#E11D48",
    bg: "#FFF1F2",
  },
  {
    label: "Bed Allocation Board",
    desc: "Inpatient Bed Census",
    icon: Icon.Bed,
    actionKey: "inpatient",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    label: "Lab Orders & Diagnostics",
    desc: "Chemistry, CBC, Pathology",
    icon: Icon.FlaskConical,
    actionKey: "laboratory",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  {
    label: "Pharmacy Dispensing",
    desc: "Rx Queue & E-Prescribe",
    icon: Icon.Pharmacy,
    actionKey: "pharmacy",
    color: "#0891B2",
    bg: "#E0F2FE",
  },
  {
    label: "Surgery OR Board",
    desc: "Operating Suites Status",
    icon: Icon.Surgery,
    actionKey: "surgery",
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    label: "Billing & Claims",
    desc: "Invoices & Coverage",
    icon: Icon.Billing,
    actionKey: "billing",
    color: "#6366F1",
    bg: "#F5F3FF",
  },
]

const UNITS = [
  {
    unit: "3N Medical-Surgical",
    total: 32,
    occupied: 28,
    critical: 2,
    icon: Icon.Bed,
  },
  {
    unit: "4S Special Care",
    total: 32,
    occupied: 24,
    critical: 1,
    icon: Icon.Inpatient,
  },
  {
    unit: "Intensive Care Unit (ICU)",
    total: 14,
    occupied: 12,
    critical: 6,
    icon: Icon.Stethoscope,
  },
  {
    unit: "Oncology 5-West",
    total: 24,
    occupied: 18,
    critical: 0,
    icon: Icon.Clinical,
  },
  {
    unit: "Surgical Recovery 2E",
    total: 20,
    occupied: 10,
    critical: 0,
    icon: Icon.Surgery,
  },
]

export default function Dashboard({
  navigate,
  userRole = "ROLE_ADMIN",
  activeStaff,
  switchRole,
}: {
  navigate: (m: string, s?: string) => void
  userRole?: string
  activeStaff?: { id: string ;name: string ;title: string ;department: string }
  switchRole?: (
    targetRole: string,
    targetUsername: string,
    permissions: string[],
  ) => void
}) {
  const [_, setRefresh] = useState(0)

  const roleKey = (userRole || "").toUpperCase()
  const isSuperAdmin = roleKey.includes("SUPERADMIN")
  const isAdmin = roleKey.includes("ADMIN") && !isSuperAdmin
  const isDoctor = roleKey.includes("DOCTOR")
  const isReception = roleKey.includes("RECEPTION")
  const isPharmacy = roleKey.includes("PHARMACY")
  const isLab = roleKey.includes("LAB")
  const isNurse = roleKey.includes("NURSE") || roleKey.includes("RN")

  const portalBanner = isSuperAdmin
    ? {
        title: "Super Admin Platform Control Suite",
        badge: "SUPER ADMIN",
        color: "bg-[#1E3A8A] text-white",
        icon: "👑",
      }
    : isAdmin
      ? {
          title: "Hospital Operations & Census Command",
          badge: "HOSPITAL ADMIN",
          color: "bg-[#166534] text-white",
          icon: "🏢",
        }
      : isDoctor
        ? {
            title: "Doctor Clinical EMR & Orders Portal",
            badge: "PHYSICIAN PORTAL",
            color: "bg-[#78350F] text-white",
            icon: "👨‍⚕️",
          }
        : isReception
          ? {
              title: "Receptionist & Patient Services Portal",
              badge: "FRONT DESK",
              color: "bg-[#581C87] text-white",
              icon: "📋",
            }
          : isPharmacy
            ? {
                title: "Pharmacy Dispensing & Paper Rx OCR Portal",
                badge: "PHARMACY PORTAL",
                color: "bg-[#064E3B] text-white",
                icon: "💊",
              }
            : isLab
              ? {
                  title: "Laboratory & Diagnostic Testing Portal",
                  badge: "PATHOLOGY & LAB",
                  color: "bg-[#831843] text-white",
                  icon: "🔬",
                }
              : {
                  title: "Registered Nurse & ICU Station Portal",
                  badge: "NURSE WARD",
                  color: "bg-[#7C2D12] text-white",
                  icon: "👩‍⚕️",
                }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F4F6F9]">
      {/* ── Domain Hero Header ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{portalBanner.icon}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                    {portalBanner.title}
                  </h1>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${portalBanner.color}`}
                  >
                    {portalBanner.badge}
                  </span>
                </div>
                <p className="text-[12px] text-[#64748B] mt-1 flex items-center gap-2">
                  <span>
                    Welcome, <strong>{activeStaff?.name || "User"}</strong> (
                    {activeStaff?.title || "Staff"})
                  </span>
                  <span>·</span>
                  <span>{activeStaff?.department || "General Hospital"}</span>
                  <span>·</span>
                  <span className="font-mono text-[#475569]">
                    Sept 11, 2026
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Operational Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[12px] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>All Systems Operational</span>
            </div>

            {/* ED Alert Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-[12px] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
              <span>ED Occupancy 90%</span>
            </div>

            <Btn
              variant="outline"
              size="sm"
              onClick={() => setRefresh((n) => n + 1)}
              className="shadow-sm"
            >
              <Icon.Refresh className="w-3.5 h-3.5 text-[#1B4FD8]" />
              <span>Refresh</span>
            </Btn>
          </div>
        </div>
      </div>

      <div className="p-5 max-w-[1600px] mx-auto space-y-5">
        {/* ── High-Urgency Alerts ────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          {ALERTS.map((a, i) => (
            <AlertBanner
              key={i}
              {...a}
              onAction={() => {
                if (a.action === "View ED Board") navigate("emergency")
                else if (a.action === "Review Now") navigate("laboratory")
              }}
            />
          ))}
        </div>

        {/* ── Domain Key Metrics Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {METRICS.map((m) => {
            const IconComp = m.icon
            return (
              <div
                key={m.id}
                onClick={() => navigate(m.target)}
                className="group relative bg-white border border-[#E2E8F0] rounded-none p-4 shadow-sm hover:shadow-md hover:border-[#2563EB] transition-all cursor-pointer overflow-hidden"
              >
                {/* Domain accent strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: m.color }}
                />

                <div className="flex items-start justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    {m.label}
                  </span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: m.bgColor, color: m.color }}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-gray-900 tracking-tight font-mono">
                    {m.value}
                  </span>
                  {m.trend && (
                    <span
                      className={`text-[11px] font-semibold font-mono ${
                        m.trendDir === "up" && m.id !== "discharges"
                          ? "text-[#DC2626]"
                          : m.trendDir === "down" || m.id === "discharges"
                            ? "text-[#16A34A]"
                            : "text-[#64748B]"
                      }`}
                    >
                      {m.trend}
                    </span>
                  )}
                </div>

                <div className="text-[11.5px] text-[#94A3B8] mt-1 truncate">
                  {m.sub}
                </div>

                <div className="mt-3 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px]">
                  <span
                    className="font-medium group-hover:underline flex items-center gap-1"
                    style={{ color: m.color }}
                  >
                    {m.action} →
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                    {m.domain}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Department Census & Today's Appointments ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Department Census Table (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                  <Icon.Inpatient className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                    Department Census & Capacity
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Real-time patient distribution across care units
                  </p>
                </div>
              </div>
              <Btn
                variant="ghost"
                size="xs"
                onClick={() => navigate("inpatient")}
              >
                Full Bed Board →
              </Btn>
            </div>

            <Table
              headers={[
                "Department",
                "In Care",
                "Waiting",
                "Critical",
                "Available",
                "Capacity",
                "",
              ]}
            >
              {QUEUES.map((q, i) => {
                const QueueIcon = q.icon
                const occPct = Math.round((q.inCare / q.capacity) * 100)
                return (
                  <TR key={i}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-xs"
                          style={{
                            backgroundColor: `${q.color}15`,
                            color: q.color,
                          }}
                        >
                          <QueueIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-[12.5px]">
                            {q.dept}
                          </div>
                          <div className="text-[10.5px] font-mono text-[#94A3B8]">
                            {q.code} Wing
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <span className="font-mono text-[13px] font-bold text-gray-800">
                        {q.inCare}
                      </span>
                    </TD>
                    <TD>
                      {q.waiting > 0 ? (
                        <span className="font-mono text-[12px] font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                          {q.waiting} waiting
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] font-mono text-[12px]">
                          —
                        </span>
                      )}
                    </TD>
                    <TD>
                      {q.critical > 0 ? (
                        <span className="font-mono text-[12px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full border border-[#FECACA]">
                          {q.critical} ESI-1/2
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] font-mono text-[12px]">
                          —
                        </span>
                      )}
                    </TD>
                    <TD>
                      <span className="font-mono text-[12px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                        {q.available} beds
                      </span>
                    </TD>
                    <TD>
                      <div className="w-24">
                        <div className="flex items-center justify-between text-[10.5px] font-mono mb-1">
                          <span className="text-gray-600 font-medium">
                            {occPct}%
                          </span>
                          <span className="text-[#94A3B8]">
                            {q.inCare}/{q.capacity}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${occPct}%`,
                              backgroundColor:
                                occPct > 85
                                  ? "#DC2626"
                                  : occPct > 70
                                    ? "#D97706"
                                    : "#16A34A",
                            }}
                          />
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Btn
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          navigate(
                            q.dept.includes("Emergency")
                              ? "emergency"
                              : "inpatient",
                          )
                        }
                      >
                        View →
                      </Btn>
                    </TD>
                  </TR>
                )
              })}
            </Table>
          </div>

          {/* Today's Appointments List (1 Col) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center">
                  <Icon.Calendar className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                  Today's Appointments
                </h2>
              </div>
              <Btn
                variant="ghost"
                size="xs"
                onClick={() => navigate("appointments")}
              >
                View All →
              </Btn>
            </div>

            <div className="p-3.5 flex-1 divide-y divide-[#F1F5F9] overflow-y-auto">
              {APPOINTMENTS.map((a, i) => (
                <div
                  key={i}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#E0F2FE] text-[#0369A1] font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                      {a.patient
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-bold text-gray-900 truncate">
                        {a.patient}
                      </div>
                      <div className="text-[11px] text-[#64748B] truncate">
                        {a.provider} ·{" "}
                        <span className="text-[#475569]">{a.spec}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="font-mono text-[11px] font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                      {a.time}
                    </span>
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Pending Labs & Quick Actions Grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Pending Lab Results (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
                  <Icon.FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                    Pending Diagnostic Labs
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Active orders in processing or critical review
                  </p>
                </div>
              </div>
              <Btn
                variant="ghost"
                size="xs"
                onClick={() => navigate("laboratory")}
              >
                Laboratory Hub →
              </Btn>
            </div>

            <Table
              headers={[
                "Patient",
                "MRN",
                "Test Name",
                "Laboratory Dept",
                "Ordered Time",
                "Status",
              ]}
            >
              {PENDING_LABS.map((l, i) => (
                <TR key={i}>
                  <TD>
                    <span className="font-bold text-gray-900 text-[12.5px]">
                      {l.patient}
                    </span>
                  </TD>
                  <TD>
                    <span className="font-mono text-[11.5px] text-[#64748B] bg-gray-100 px-1.5 py-0.5 rounded">
                      #{l.mrn}
                    </span>
                  </TD>
                  <TD>
                    <span className="font-medium text-gray-800 text-[12px]">
                      {l.test}
                    </span>
                  </TD>
                  <TD>
                    <span className="text-[11px] font-semibold text-[#475569]">
                      {l.dept}
                    </span>
                  </TD>
                  <TD>
                    <span className="font-mono text-[11.5px] text-gray-700">
                      {l.ordered}
                    </span>
                  </TD>
                  <TD>
                    {l.status === "Critical" ? (
                      <span className="inline-flex items-center gap-1 bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-bold px-2 py-0.5 rounded-full border border-[#FECACA] animate-pulse">
                        <Icon.Alert className="w-3 h-3 text-[#DC2626]" />{" "}
                        Critical
                      </span>
                    ) : (
                      <StatusBadge status={l.status} />
                    )}
                  </TD>
                </TR>
              ))}
            </Table>
          </div>

          {/* Domain Quick Actions (1 Col) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0] bg-[#FAFCFF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shadow-xs">
                  <Icon.Cmd className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                    Hospital Quick Actions
                  </h2>
                </div>
              </div>
              <span className="text-[10.5px] font-mono text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full font-semibold">
                Domain Shortcuts
              </span>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 items-center justify-center">
              {QUICK_ACTIONS.map((q, i) => {
                const ActionIcon = q.icon
                return (
                  <button
                    key={i}
                    onClick={() => navigate(q.actionKey, q.subKey)}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 hover:scale-105 hover:shadow-md focus:outline-none cursor-pointer"
                    style={{
                      backgroundColor: q.bg,
                      borderColor: `${q.color}35`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 mb-1.5"
                      style={{ color: q.color }}
                    >
                      <ActionIcon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <span className="text-[11.5px] font-bold text-gray-800 group-hover:text-[#2563EB] text-center leading-tight">
                      {q.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Hospital Unit Bed Utilization Heatmap ────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center">
                <Icon.Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                  Hospital Unit Occupancy & Capacity Overview
                </h2>
                <p className="text-[11.5px] text-[#64748B]">
                  Live bed utilization meters across inpatient wards
                </p>
              </div>
            </div>
            <Btn
              variant="outline"
              size="xs"
              onClick={() => navigate("inpatient")}
            >
              View All Wards →
            </Btn>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {UNITS.map((u, i) => {
              const UnitIcon = u.icon
              const pct = Math.round((u.occupied / u.total) * 100)
              const color =
                pct >= 85 ? "#DC2626" : pct >= 70 ? "#D97706" : "#16A34A"
              const bgColor =
                pct >= 85 ? "#FEF2F2" : pct >= 70 ? "#FFFBEB" : "#F0FDF4"

              return (
                <div
                  key={i}
                  className="bg-[#FAFCFF] border border-[#E2E8F0] rounded-none p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-bold text-gray-900 truncate">
                        {u.unit}
                      </span>
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: bgColor, color }}
                      >
                        <UnitIcon className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="relative h-2 bg-[#E2E8F0] rounded-full overflow-hidden my-2">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono mt-1">
                    <span className="font-bold" style={{ color }}>
                      {u.occupied} / {u.total} beds
                    </span>
                    <span className="font-semibold text-gray-600">
                      {pct}% Occupied
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
