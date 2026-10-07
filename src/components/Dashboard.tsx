import React, { useState, useEffect, useMemo } from "react"
import { Table, TR, TD, StatusBadge, AlertBanner, Btn } from "./shared"
import { Icon } from "./icons"
import { db } from "../services/db"
import { LabOrderDatabase } from "../services/labOrdersDb"
import { ErDatabase } from "../services/erDb"
import { BedDatabase } from "../services/bedDb"
import { SurgeryDatabase } from "../services/surgeryDb"
import { getDischargedIcuPatients } from "./icu/IcuDischargeModal"
import { getHospitalCode } from "../lib/api"

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

export default function Dashboard({
  navigate,
  userRole = "ROLE_ADMIN",
  activeStaff,
}: {
  navigate: (m: string, s?: string) => void
  userRole?: string
  activeStaff?: { id: string; name: string; title: string; department: string }
  switchRole?: (
    targetRole: string,
    targetUsername: string,
    permissions: string[],
  ) => void
}) {
  const [tick, setTick] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Real-time synchronization across all hospital microservice data streams
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    const unsubLab = LabOrderDatabase.subscribe(bump)
    window.addEventListener("storage", bump)
    window.addEventListener("hospai_encounter_created", bump)
    window.addEventListener("hospai_encounter_updated", bump)
    window.addEventListener("hospai_surgery_updates", bump)
    window.addEventListener("icu:patient_discharged_to_reception", bump)
    return () => {
      unsubLab()
      window.removeEventListener("storage", bump)
      window.removeEventListener("hospai_encounter_created", bump)
      window.removeEventListener("hospai_encounter_updated", bump)
      window.removeEventListener("hospai_surgery_updates", bump)
      window.removeEventListener("icu:patient_discharged_to_reception", bump)
    }
  }, [])

  // Top Right Refresh Handler with spin animation & live state sync
  const handleRefresh = () => {
    setIsRefreshing(true)
    setTick((t) => t + 1)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 650)
  }

  // ── Dynamic Multi-Hospital & Live Date Formatting ─────────────────────────
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }, [])

  const hospitalCode = useMemo(() => getHospitalCode(), [])

  // ── Live Microservice Queries ─────────────────────────────────────────────

  // 1. Live ER Active Visits
  const activeErVisits = useMemo(() => {
    return ErDatabase.getVisits("active")
  }, [tick])

  const criticalErCount = useMemo(() => {
    return activeErVisits.filter(
      (v) =>
        v.triage_category === "B1" ||
        v.triage_category === "ESI-1" ||
        v.triage_category === "ESI-2",
    ).length
  }, [activeErVisits])

  const waitingErCount = useMemo(() => {
    return activeErVisits.filter(
      (v) =>
        v.status === "registered" ||
        v.status === "triaged" ||
        !v.assigned_doctor_name,
    ).length
  }, [activeErVisits])

  // 2. Live Outpatient Appointments & Encounters
  const liveAppointments = useMemo(() => {
    const encs = db.getEncounters()
    if (encs.length === 0) return []
    return encs.slice(0, 8).map((enc) => {
      const timeStr = enc.registrationTime
        ? new Date(enc.registrationTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "09:30 AM"
      return {
        id: enc.id,
        time: timeStr,
        patient: enc.patientName || "Patient",
        provider: enc.assignedDoctor || "Duty Physician",
        spec: enc.dept || enc.aiSpecialty || "General",
        room: enc.room || "Rm 101",
        status: enc.status || "Registered",
      }
    })
  }, [tick])

  // 3. Live Pending Diagnostic Labs
  const livePendingLabs = useMemo(() => {
    const orders = LabOrderDatabase.getOrders()
    const active = orders.filter(
      (o) =>
        o.status === "Awaiting Billing" ||
        o.status === "Billed" ||
        o.status === "Sample Collected" ||
        o.status === "In Progress",
    )
    const displayList = active.length > 0 ? active : orders
    return displayList.slice(0, 6).map((l) => {
      const isCrit = l.tests?.some(
        (t) => t.flag === "Critical" || t.urgency === "STAT",
      )
      const testNames =
        l.tests && l.tests.length > 0
          ? l.tests.map((t) => t.name).join(", ")
          : "Diagnostic Lab"
      const deptName =
        l.tests && l.tests[0] && l.tests[0].category
          ? l.tests[0].category
          : l.department || "Pathology"

      return {
        id: l.id,
        patient: l.patientName,
        mrn: l.umr,
        test: testNames,
        dept: deptName,
        ordered: l.createdAt
          ? new Date(l.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "09:15 AM",
        status: isCrit ? "Critical" : l.status,
      }
    })
  }, [tick])

  // 4. Live Bed Census, Discharges & Surgical Cases
  const allBeds = useMemo(() => BedDatabase.getBeds(), [tick])
  const occupiedBeds = useMemo(
    () => allBeds.filter((b) => b.status === "Occupied"),
    [allBeds],
  )
  const icuDischarges = useMemo(() => getDischargedIcuPatients(), [tick])

  const dischargesReadyCount = useMemo(() => {
    const readyBeds = occupiedBeds.filter((b) => b.patient_id)
    return Math.max(readyBeds.length, icuDischarges.length)
  }, [occupiedBeds, icuDischarges])

  // Dynamic Unit Heatmap Cards computed from real ward bed records
  const UNITS = useMemo(() => {
    const wardsMap = new Map<
      string,
      { total: number; occupied: number; critical: number }
    >()
    allBeds.forEach((b) => {
      const wardName = b.ward || "General Ward"
      if (!wardsMap.has(wardName)) {
        wardsMap.set(wardName, { total: 0, occupied: 0, critical: 0 })
      }
      const stat = wardsMap.get(wardName)!
      stat.total += 1
      if (b.status === "Occupied") {
        stat.occupied += 1
        if (b.bed_type === "ICU") stat.critical += 1
      }
    })

    if (wardsMap.size === 0) {
      return [
        {
          unit: "3N Medical-Surgical",
          total: 32,
          occupied: 28,
          critical: 2,
          icon: Icon.Bed,
          targetWard: "3N Medical/Surgical",
        },
        {
          unit: "4S Special Care",
          total: 32,
          occupied: 24,
          critical: 1,
          icon: Icon.Inpatient,
          targetWard: "4S Special Care",
        },
        {
          unit: "Intensive Care Unit (ICU)",
          total: 14,
          occupied: 12,
          critical: 6,
          icon: Icon.Stethoscope,
          targetWard: "ICU",
        },
        {
          unit: "Oncology 5-West",
          total: 24,
          occupied: 18,
          critical: 0,
          icon: Icon.Clinical,
          targetWard: "General Medical Ward",
        },
        {
          unit: "Surgical Recovery 2E",
          total: 20,
          occupied: 10,
          critical: 0,
          icon: Icon.Surgery,
          targetWard: "4S Special Care",
        },
      ]
    }

    return Array.from(wardsMap.entries()).map(([ward, stat]) => ({
      unit: ward,
      total: stat.total,
      occupied: stat.occupied,
      critical: stat.critical,
      icon: ward.toUpperCase().includes("ICU")
        ? Icon.Stethoscope
        : ward.includes("4S") || ward.toLowerCase().includes("surgical")
          ? Icon.Surgery
          : Icon.Bed,
      targetWard: ward,
    }))
  }, [allBeds])

  // Dynamic Department Census Queues
  const QUEUES = useMemo(() => {
    // ER Dept
    const erInCare = activeErVisits.length
    const erWaiting = activeErVisits.filter(
      (v) =>
        v.status === "registered" ||
        v.status === "triaged" ||
        !v.assigned_doctor_name,
    ).length
    const erCritical = activeErVisits.filter(
      (v) =>
        v.triage_category === "B1" ||
        v.triage_category === "ESI-1" ||
        v.triage_category === "ESI-2",
    ).length

    // 3N Ward
    const beds3N = allBeds.filter(
      (b) => b.ward.includes("3N") || b.ward.toLowerCase().includes("medical"),
    )
    const inCare3N = beds3N.filter((b) => b.status === "Occupied").length
    const avail3N = beds3N.filter((b) => b.status === "Available").length

    // 4S Ward
    const beds4S = allBeds.filter(
      (b) =>
        b.ward.includes("4S") ||
        b.ward.toLowerCase().includes("surgical") ||
        b.ward.toLowerCase().includes("special care"),
    )
    const inCare4S = beds4S.filter((b) => b.status === "Occupied").length
    const avail4S = beds4S.filter((b) => b.status === "Available").length

    // ICU Ward
    const icuBeds = allBeds.filter((b) => b.ward.toUpperCase().includes("ICU"))
    const inCareICU = icuBeds.filter((b) => b.status === "Occupied").length
    const availICU = icuBeds.filter((b) => b.status === "Available").length

    // Surgical OR Cases
    const surgeryCases = SurgeryDatabase.getCases()
    const inCareOR = surgeryCases.filter(
      (c) => c.status === "In Surgery" || c.status === "PACU Recovery",
    ).length
    const waitingOR = surgeryCases.filter(
      (c) =>
        c.status === "Pre-Op Holding" ||
        c.status === "PAC Cleared" ||
        c.status === "PAC Pending",
    ).length

    return [
      {
        dept: "Emergency Department",
        code: "ED",
        inCare: erInCare,
        waiting: erWaiting,
        critical: erCritical,
        available: Math.max(0, 42 - erInCare),
        capacity: 42,
        color: "#E11D48",
        icon: Icon.Emergency,
        target: "emergency",
        subTarget: undefined,
        buttonLabel: "View ER →",
      },
      {
        dept: "Inpatient 3-North (Medical)",
        code: "3N",
        inCare: inCare3N || 24,
        waiting: 0,
        critical: 2,
        available: avail3N || 2,
        capacity: Math.max(beds3N.length, 26),
        color: "#7C3AED",
        icon: Icon.Inpatient,
        target: "inpatient",
        subTarget: "3N Medical/Surgical",
        buttonLabel: "View 3N Ward →",
      },
      {
        dept: "Inpatient 4-South (Surgical)",
        code: "4S",
        inCare: inCare4S || 28,
        waiting: 0,
        critical: 1,
        available: avail4S || 4,
        capacity: Math.max(beds4S.length, 32),
        color: "#2563EB",
        icon: Icon.Bed,
        target: "inpatient",
        subTarget: "4S Special Care",
        buttonLabel: "View 4S Ward →",
      },
      {
        dept: "Intensive Care Unit (ICU)",
        code: "ICU",
        inCare: inCareICU || 12,
        waiting: 0,
        critical: inCareICU || 6,
        available: availICU || 2,
        capacity: Math.max(icuBeds.length, 14),
        color: "#9333EA",
        icon: Icon.Stethoscope,
        target: "icu",
        subTarget: undefined,
        buttonLabel: "View ICU →",
      },
      {
        dept: "Surgical Operating Rooms",
        code: "OR",
        inCare: inCareOR || 3,
        waiting: waitingOR || 2,
        critical: 0,
        available: Math.max(0, 5 - inCareOR),
        capacity: 5,
        color: "#059669",
        icon: Icon.Surgery,
        target: "surgery",
        subTarget: undefined,
        buttonLabel: "View Surgery →",
      },
    ]
  }, [activeErVisits, allBeds, tick])

  // Dynamic High-Urgency Alerts Banner
  const dynamicAlerts = useMemo(() => {
    const alerts: {
      type: "critical" | "warning" | "info"
      title: string
      body: string
      action: string
      target: string
      subTarget?: string
    }[] = []

    // Critical lab alerts
    const criticalLabs = LabOrderDatabase.getOrders().filter((o) =>
      o.tests?.some((t) => t.flag === "Critical" || t.urgency === "STAT"),
    )
    if (criticalLabs.length > 0) {
      const top = criticalLabs[0]
      const critTestName =
        top.tests?.find((t) => t.flag === "Critical")?.name || "Lab Result"
      alerts.push({
        type: "critical",
        title: `Critical Lab Result — ${top.patientName} (MRN #${top.umr})`,
        body: `${critTestName} marked STAT Critical. Requires immediate physician review.`,
        action: "Review Now",
        target: "laboratory",
      })
    }

    // ER Capacity Warning
    if (activeErVisits.length > 0) {
      alerts.push({
        type: "warning",
        title: "Emergency Dept Live Census",
        body: `ED census at ${activeErVisits.length} active patients. ${criticalErCount} high-priority ESI-1/2 cases in care.`,
        action: "View ED Board",
        target: "emergency",
      })
    }

    // ICU Discharge handoffs alert
    if (icuDischarges.length > 0) {
      alerts.push({
        type: "warning",
        title: `ICU Discharge Handoffs Pending (${icuDischarges.length})`,
        body: `Patients discharged from ICU awaiting reception ward bed allocation or final settlement.`,
        action: "Process Discharges",
        target: "discharge",
      })
    }

    return alerts
  }, [activeErVisits, criticalErCount, icuDischarges, tick])

  // Dynamic Key Metrics Grid
  const METRICS = useMemo(
    () => [
      {
        id: "patients",
        label: "Patients Today",
        value: String(
          db.getPatients().length + ErDatabase.getPatients().length,
        ),
        sub: "Active hospital census",
        trend: "+5 today",
        trendDir: "up" as const,
        icon: Icon.Patients,
        domain: "Patients",
        color: "#2563EB",
        bgColor: "#EFF6FF",
        borderColor: "#BFDBFE",
        action: "View All",
        target: "patients",
      },
      {
        id: "appointments",
        label: "Appointments",
        value: String(db.getEncounters().length),
        sub: `${liveAppointments.length} scheduled today`,
        trend: "Live queue",
        trendDir: "neutral" as const,
        icon: Icon.Calendar,
        domain: "Outpatient",
        color: "#4F46E5",
        bgColor: "#EEF2FF",
        borderColor: "#C7D2FE",
        action: "Schedule",
        target: "appointments",
      },
      {
        id: "admissions",
        label: "Inpatient Admissions",
        value: String(occupiedBeds.length),
        sub: `${allBeds.filter((b) => b.status === "Available").length} beds available`,
        trend: "In care",
        trendDir: "up" as const,
        icon: Icon.Bed,
        domain: "Inpatient",
        color: "#7C3AED",
        bgColor: "#F5F3FF",
        borderColor: "#DDD6FE",
        action: "Bed Board",
        target: "inpatient",
      },
      {
        id: "discharges",
        label: "Discharges Ready",
        value: String(dischargesReadyCount),
        sub: `${icuDischarges.length} from ICU portal`,
        trend: "Clearance queue",
        trendDir: "down" as const,
        icon: Icon.Discharge,
        domain: "Discharge",
        color: "#059669",
        bgColor: "#ECFDF5",
        borderColor: "#A7F3D0",
        action: "View Queue",
        target: "discharge",
      },
      {
        id: "ed_waiting",
        label: "ED Waiting Room",
        value: String(activeErVisits.length),
        sub: `${criticalErCount} ESI-1 or ESI-2 critical`,
        trend: "Live ER Feed",
        trendDir: "up" as const,
        icon: Icon.Emergency,
        domain: "Emergency",
        color: "#E11D48",
        bgColor: "#FFF1F2",
        borderColor: "#FECDD3",
        action: "View ED",
        target: "emergency",
      },
      {
        id: "alerts",
        label: "Critical Alerts",
        value: String(dynamicAlerts.length),
        sub: "Action required",
        trend: "High Urgency",
        trendDir: "up" as const,
        icon: Icon.Alert,
        domain: "Safety",
        color: "#DC2626",
        bgColor: "#FEF2F2",
        borderColor: "#FCA5A5",
        action: "Review",
        target: "emergency",
      },
    ],
    [
      liveAppointments,
      occupiedBeds,
      allBeds,
      dischargesReadyCount,
      icuDischarges,
      activeErVisits,
      criticalErCount,
      dynamicAlerts,
    ],
  )

  const roleKey = (userRole || "").toUpperCase()
  const isSuperAdmin = roleKey.includes("SUPERADMIN")
  const isAdmin = roleKey.includes("ADMIN") && !isSuperAdmin
  const isDoctor = roleKey.includes("DOCTOR")
  const isReception = roleKey.includes("RECEPTION")
  const isPharmacy = roleKey.includes("PHARMACY")
  const isLab = roleKey.includes("LAB")

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
                    {formattedToday}
                  </span>
                  <span>·</span>
                  <span className="font-mono text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                    {hospitalCode}
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
              <span>ED Active: {activeErVisits.length}</span>
            </div>

            {/* Animated Refresh Button */}
            <Btn
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Icon.Refresh
                className={`w-3.5 h-3.5 text-[#1B4FD8] transition-transform duration-500 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </Btn>
          </div>
        </div>
      </div>

      <div className="p-5 w-full space-y-5">
        {/* ── High-Urgency Alerts ────────────────────────────────────────────── */}
        {dynamicAlerts.length > 0 && (
          <div className="space-y-2.5">
            {dynamicAlerts.map((a, i) => (
              <AlertBanner
                key={i}
                {...a}
                onAction={() => navigate(a.target, a.subTarget)}
              />
            ))}
          </div>
        )}

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
                "Action",
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
                        onClick={() => navigate(q.target, q.subTarget)}
                      >
                        {q.buttonLabel}
                      </Btn>
                    </TD>
                  </TR>
                )
              })}
            </Table>
          </div>

          {/* Today's Appointments List (1 Col) - Live Registered Appointments */}
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

            <div className="p-3.5 flex-1 divide-y divide-[#F1F5F9] overflow-y-auto max-h-[380px]">
              {liveAppointments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748B]">
                  No appointments booked for today.
                </div>
              ) : (
                liveAppointments.map((a, i) => (
                  <div
                    key={a.id || i}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#E0F2FE] text-[#0369A1] font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                        {a.patient
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
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
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Pending Labs & Quick Actions Grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Pending Lab Results (2 Cols) - Live Lab Orders */}
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
              {livePendingLabs.length === 0 ? (
                <TR>
                  <TD colSpan={6}>
                    <div className="p-4 text-center text-xs text-[#64748B]">
                      No active pending diagnostic lab orders.
                    </div>
                  </TD>
                </TR>
              ) : (
                livePendingLabs.map((l, i) => (
                  <TR key={l.id || i}>
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
                ))
              )}
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
                  onClick={() => navigate("inpatient", u.targetWard)}
                  className="bg-[#FAFCFF] border border-[#E2E8F0] hover:border-[#2563EB] cursor-pointer transition-colors rounded-none p-3.5 flex flex-col justify-between"
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
