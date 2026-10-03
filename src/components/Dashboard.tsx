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
    emoji: "🏥",
    actionKey: "patients",
    subKey: "register",
    color: "#2563EB",
    bg: "from-blue-500/10 to-indigo-500/5",
    hoverBorder: "hover:border-blue-400",
  },
  {
    label: "Schedule Appointment",
    desc: "Outpatient Consults",
    icon: Icon.Calendar,
    emoji: "📅",
    actionKey: "appointments",
    color: "#4F46E5",
    bg: "from-indigo-500/10 to-purple-500/5",
    hoverBorder: "hover:border-indigo-400",
  },
  {
    label: "ED Track Board",
    desc: "Emergency Room Grid",
    icon: Icon.Emergency,
    emoji: "🚨",
    actionKey: "emergency",
    color: "#E11D48",
    bg: "from-rose-500/10 to-red-500/5",
    hoverBorder: "hover:border-rose-400",
  },
  {
    label: "Bed Allocation Board",
    desc: "Inpatient Bed Census",
    icon: Icon.Bed,
    emoji: "🛏️",
    actionKey: "inpatient",
    color: "#7C3AED",
    bg: "from-purple-500/10 to-violet-500/5",
    hoverBorder: "hover:border-purple-400",
  },
  {
    label: "Lab Orders & Diagnostics",
    desc: "Chemistry, CBC, Pathology",
    icon: Icon.FlaskConical,
    emoji: "🔬",
    actionKey: "laboratory",
    color: "#D97706",
    bg: "from-amber-500/10 to-orange-500/5",
    hoverBorder: "hover:border-amber-400",
  },
  {
    label: "Pharmacy Dispensing",
    desc: "Rx Queue & E-Prescribe",
    icon: Icon.Pharmacy,
    emoji: "💊",
    actionKey: "pharmacy",
    color: "#0891B2",
    bg: "from-cyan-500/10 to-sky-500/5",
    hoverBorder: "hover:border-cyan-400",
  },
  {
    label: "Surgery OR Board",
    desc: "Operating Suites Status",
    icon: Icon.Surgery,
    emoji: "🔪",
    actionKey: "surgery",
    color: "#059669",
    bg: "from-emerald-500/10 to-teal-500/5",
    hoverBorder: "hover:border-emerald-400",
  },
  {
    label: "Billing & Claims",
    desc: "Invoices & Coverage",
    icon: Icon.Billing,
    emoji: "💳",
    actionKey: "billing",
    color: "#6366F1",
    bg: "from-blue-600/10 to-indigo-600/5",
    hoverBorder: "hover:border-blue-400",
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
      weekday: "short",
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
          emoji: "🩺",
          targetWard: "3N Medical/Surgical",
        },
        {
          unit: "4S Special Care",
          total: 32,
          occupied: 24,
          critical: 1,
          icon: Icon.Inpatient,
          emoji: "🏨",
          targetWard: "4S Special Care",
        },
        {
          unit: "Intensive Care Unit (ICU)",
          total: 14,
          occupied: 12,
          critical: 6,
          icon: Icon.Stethoscope,
          emoji: "🫀",
          targetWard: "ICU",
        },
        {
          unit: "Oncology 5-West",
          total: 24,
          occupied: 18,
          critical: 0,
          icon: Icon.Clinical,
          emoji: "🎗️",
          targetWard: "General Medical Ward",
        },
        {
          unit: "Surgical Recovery 2E",
          total: 20,
          occupied: 10,
          critical: 0,
          icon: Icon.Surgery,
          emoji: "🔪",
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
      emoji: ward.toUpperCase().includes("ICU")
        ? "🫀"
        : ward.includes("4S") || ward.toLowerCase().includes("surgical")
          ? "🔪"
          : "🛏️",
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
        emoji: "🚨",
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
        emoji: "🩺",
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
        emoji: "🔪",
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
        emoji: "🫀",
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
        emoji: "🔬",
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
        title: `🚨 Critical Lab Result — ${top.patientName} (MRN #${top.umr})`,
        body: `${critTestName} marked STAT Critical. Requires immediate physician review.`,
        action: "Review Now",
        target: "laboratory",
      })
    }

    // ER Capacity Warning
    if (activeErVisits.length > 0) {
      alerts.push({
        type: "warning",
        title: "⚡ Emergency Dept Live Census Alert",
        body: `ED census at ${activeErVisits.length} active patients. ${criticalErCount} high-priority ESI-1/2 cases in care.`,
        action: "View ED Board",
        target: "emergency",
      })
    }

    // ICU Discharge handoffs alert
    if (icuDischarges.length > 0) {
      alerts.push({
        type: "warning",
        title: `🚪 ICU Discharge Handoffs Pending (${icuDischarges.length})`,
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
        emoji: "👥",
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
        emoji: "📅",
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
        emoji: "🛌",
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
        emoji: "🚪",
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
        emoji: "🚑",
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
        emoji: "🚨",
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
    <div className="flex-1 overflow-y-auto bg-[#F4F6F9] space-y-6 pb-12">
      {/* ── Domain Hero Header ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-white via-blue-50/40 to-indigo-50/30 border-b border-[#DDE2EC] px-6 py-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1B4FD8]/10 text-[#1B4FD8] border border-[#BFDBFE] flex items-center justify-center text-2xl shadow-sm transform hover:scale-110 transition-transform">
                {portalBanner.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none flex items-center gap-1.5">
                    <span>{portalBanner.title}</span>
                    <span>✨</span>
                  </h1>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs tracking-wider ${portalBanner.color}`}
                  >
                    {portalBanner.badge}
                  </span>
                </div>
                <p className="text-[12.5px] text-[#64748B] mt-1.5 flex items-center gap-2 flex-wrap font-medium">
                  <span>
                    👋 Welcome, <strong className="text-gray-900">{activeStaff?.name || "User"}</strong> (
                    {activeStaff?.title || "Staff"})
                  </span>
                  <span>•</span>
                  <span className="text-[#1B4FD8] font-bold">🏢 {activeStaff?.department || "General Hospital"}</span>
                  <span>•</span>
                  <span className="font-mono text-[#475569]">
                    🗓️ {formattedToday}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[11px] bg-blue-100/80 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                    🏥 {hospitalCode}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Operational Status Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-[12px] font-bold shadow-xs hover:scale-105 transition-transform">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>⚡ Live Systems Operational</span>
            </div>

            {/* ED Alert Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-[12px] font-bold shadow-xs hover:scale-105 transition-transform">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] animate-ping" />
              <span>🚑 ED Active: {activeErVisits.length}</span>
            </div>

            {/* Animated Refresh Button */}
            <Btn
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="shadow-sm transition-all active:scale-90 hover:shadow-md cursor-pointer hover:bg-blue-50 border-blue-200"
            >
              <Icon.Refresh
                className={`w-3.5 h-3.5 text-[#1B4FD8] transition-transform duration-500 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span className="font-bold text-[#1B4FD8]">{isRefreshing ? "Syncing..." : "🔄 Refresh"}</span>
            </Btn>
          </div>
        </div>
      </div>

      <div className="px-6 w-full space-y-6">
        {/* ── High-Urgency Alerts ────────────────────────────────────────────── */}
        {dynamicAlerts.length > 0 && (
          <div className="space-y-3">
            {dynamicAlerts.map((a, i) => (
              <AlertBanner
                key={i}
                {...a}
                onAction={() => navigate(a.target, a.subTarget)}
              />
            ))}
          </div>
        )}

        {/* ── Domain Key Metrics Grid (6 Grid Cards with Hover & Emojis) ────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {METRICS.map((m) => {
            const IconComp = m.icon
            return (
              <div
                key={m.id}
                onClick={() => navigate(m.target)}
                className="group relative bg-white border border-[#E2E8F0] rounded-2xl p-4.5 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-[#2563EB] transition-all duration-300 transform hover:-translate-y-1.5 cursor-pointer overflow-hidden"
              >
                {/* Domain top accent strip */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 transition-all group-hover:h-2"
                  style={{ backgroundColor: m.color }}
                />

                <div className="flex items-start justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-1">
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </span>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-125 group-hover:rotate-6 shadow-xs"
                    style={{ backgroundColor: m.bgColor, color: m.color }}
                  >
                    <IconComp className="w-4.5 h-4.5" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-black text-gray-900 tracking-tight font-mono group-hover:text-[#1B4FD8] transition-colors">
                    {m.value}
                  </span>
                  {m.trend && (
                    <span
                      className={`text-[11px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                        m.trendDir === "up" && m.id !== "discharges"
                          ? "bg-rose-50 text-[#DC2626] border border-rose-200"
                          : m.trendDir === "down" || m.id === "discharges"
                            ? "bg-emerald-50 text-[#16A34A] border border-emerald-200"
                            : "bg-gray-100 text-[#64748B]"
                      }`}
                    >
                      {m.trend}
                    </span>
                  )}
                </div>

                <div className="text-[11.5px] font-medium text-[#64748B] mt-1 truncate">
                  {m.sub}
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-[11.5px]">
                  <span
                    className="font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    style={{ color: m.color }}
                  >
                    {m.action} →
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
                    {m.domain}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Department Census & Today's Appointments ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Census Table (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-r from-[#FAFCFF] to-blue-50/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center text-base shadow-xs">
                  🏥
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                    <span>Department Census &amp; Capacity</span>
                    <span className="text-[11px] font-mono text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Live</span>
                  </h2>
                  <p className="text-[11.5px] text-[#64748B] font-medium">
                    Real-time patient distribution &amp; bed occupancy meters across care units
                  </p>
                </div>
              </div>
              <Btn
                variant="ghost"
                size="xs"
                onClick={() => navigate("inpatient")}
                className="hover:bg-blue-50 text-[#1B4FD8] font-bold transition-all hover:translate-x-1 cursor-pointer"
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
                  <TR key={i} className="hover:bg-blue-50/40 transition-colors group cursor-pointer">
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-xs transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: `${q.color}15`,
                            color: q.color,
                          }}
                        >
                          <span>{q.emoji}</span>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-[12.5px] group-hover:text-[#1B4FD8] transition-colors">
                            {q.dept}
                          </div>
                          <div className="text-[10.5px] font-mono text-[#94A3B8]">
                            {q.code} Wing
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <span className="font-mono text-[13px] font-extrabold text-gray-900">
                        {q.inCare}
                      </span>
                    </TD>
                    <TD>
                      {q.waiting > 0 ? (
                        <span className="font-mono text-[11.5px] font-bold text-[#D97706] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
                          ⏳ {q.waiting} waiting
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] font-mono text-[12px]">
                          —
                        </span>
                      )}
                    </TD>
                    <TD>
                      {q.critical > 0 ? (
                        <span className="font-mono text-[11.5px] font-bold text-[#DC2626] bg-[#FEE2E2] px-2.5 py-0.5 rounded-full border border-[#FECACA] animate-pulse">
                          🚨 {q.critical} ESI-1/2
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] font-mono text-[12px]">
                          —
                        </span>
                      )}
                    </TD>
                    <TD>
                      <span className="font-mono text-[11.5px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-0.5 rounded-full border border-green-200">
                        🛏️ {q.available} beds
                      </span>
                    </TD>
                    <TD>
                      <div className="w-28">
                        <div className="flex items-center justify-between text-[10.5px] font-mono mb-1">
                          <span className="text-gray-700 font-bold">
                            {occPct}%
                          </span>
                          <span className="text-[#94A3B8]">
                            {q.inCare}/{q.capacity}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden p-0.5">
                          <div
                            className="h-full rounded-full transition-all duration-500 shadow-xs"
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
                        className="font-bold text-[#1B4FD8] hover:bg-blue-100/60"
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
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-r from-[#FAFCFF] to-indigo-50/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] flex items-center justify-center text-base shadow-xs">
                  📅
                </div>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">
                  Today's Appointments
                </h2>
              </div>
              <Btn
                variant="ghost"
                size="xs"
                onClick={() => navigate("appointments")}
                className="hover:bg-indigo-50 text-[#4F46E5] font-bold transition-all hover:translate-x-1 cursor-pointer"
              >
                View All →
              </Btn>
            </div>

            <div className="p-4 flex-1 divide-y divide-[#F1F5F9] overflow-y-auto max-h-[380px] space-y-2">
              {liveAppointments.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#64748B] font-medium">
                  <span>📅</span> No appointments booked for today.
                </div>
              ) : (
                liveAppointments.map((a, i) => (
                  <div
                    key={a.id || i}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 hover:bg-blue-50/30 p-2 rounded-xl transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] text-[#0369A1] font-extrabold text-[12px] flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-110 transition-transform">
                        {a.patient
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-bold text-gray-900 truncate group-hover:text-[#1B4FD8] transition-colors">
                          {a.patient}
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate font-medium">
                          👨‍⚕️ {a.provider} ·{" "}
                          <span className="text-[#475569] font-bold">{a.spec}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        ⏰ {a.time}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Lab Results (2 Cols) - Live Lab Orders */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-r from-[#FAFCFF] to-amber-50/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] flex items-center justify-center text-base shadow-xs">
                  🔬
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">
                    Pending Diagnostic Labs &amp; Pathology
                  </h2>
                  <p className="text-[11.5px] text-[#64748B] font-medium">
                    Active laboratory diagnostic orders in processing or critical STAT review
                  </p>
                </div>
              </div>
              <Btn
                variant="ghost"
                size="xs"
                onClick={() => navigate("laboratory")}
                className="hover:bg-amber-50 text-[#D97706] font-bold transition-all hover:translate-x-1 cursor-pointer"
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
                    <div className="p-6 text-center text-xs text-[#64748B] font-medium">
                      🧪 No active pending diagnostic lab orders.
                    </div>
                  </TD>
                </TR>
              ) : (
                livePendingLabs.map((l, i) => (
                  <TR key={l.id || i} className="hover:bg-amber-50/30 transition-colors group cursor-pointer">
                    <TD>
                      <span className="font-bold text-gray-900 text-[12.5px] group-hover:text-[#D97706] transition-colors">
                        👤 {l.patient}
                      </span>
                    </TD>
                    <TD>
                      <span className="font-mono text-[11.5px] text-[#475569] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-bold">
                        #{l.mrn}
                      </span>
                    </TD>
                    <TD>
                      <span className="font-semibold text-gray-800 text-[12px]">
                        🧪 {l.test}
                      </span>
                    </TD>
                    <TD>
                      <span className="text-[11px] font-bold text-[#475569]">
                        {l.dept}
                      </span>
                    </TD>
                    <TD>
                      <span className="font-mono text-[11.5px] text-gray-700 font-medium">
                        ⏰ {l.ordered}
                      </span>
                    </TD>
                    <TD>
                      {l.status === "Critical" ? (
                        <span className="inline-flex items-center gap-1 bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#FECACA] animate-pulse">
                          🚨 Critical STAT
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

          {/* Domain Quick Actions (1 Col with Emojis & Animations) */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#E2E8F0] bg-gradient-to-r from-[#FAFCFF] to-blue-50/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center text-base shadow-xs">
                  ⚡
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">
                    Hospital Quick Actions
                  </h2>
                </div>
              </div>
              <span className="text-[10.5px] font-mono text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full font-bold border border-[#BFDBFE]">
                Shortcuts
              </span>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 flex-1 items-center justify-center">
              {QUICK_ACTIONS.map((q, i) => {
                const ActionIcon = q.icon
                return (
                  <button
                    key={i}
                    onClick={() => navigate(q.actionKey, q.subKey)}
                    className={`group flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 hover:shadow-md focus:outline-none cursor-pointer bg-gradient-to-br ${q.bg} ${q.hoverBorder}`}
                    style={{
                      borderColor: `${q.color}30`,
                    }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1.5">
                      <span className="text-xl group-hover:scale-125 transition-transform">{q.emoji}</span>
                    </div>
                    <span className="text-[11.5px] font-extrabold text-gray-900 group-hover:text-[#2563EB] text-center leading-tight transition-colors">
                      {q.label}
                    </span>
                    <span className="text-[10px] text-[#64748B] text-center font-medium mt-0.5">
                      {q.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Hospital Unit Bed Utilization Heatmap ────────────────────────────── */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] flex items-center justify-center text-lg shadow-xs">
                🛏️
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <span>Hospital Unit Occupancy &amp; Capacity Overview</span>
                  <span className="text-[11px] font-mono text-[#7C3AED] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 font-bold">Heatmap</span>
                </h2>
                <p className="text-[11.5px] text-[#64748B] font-medium">
                  Live bed utilization meters &amp; capacity limits across inpatient care wards
                </p>
              </div>
            </div>
            <Btn
              variant="outline"
              size="xs"
              onClick={() => navigate("inpatient")}
              className="hover:bg-purple-50 text-[#7C3AED] font-bold border-purple-200 transition-all hover:translate-x-1 cursor-pointer"
            >
              View All Wards →
            </Btn>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {UNITS.map((u, i) => {
              const pct = Math.round((u.occupied / u.total) * 100)
              const color =
                pct >= 85 ? "#DC2626" : pct >= 70 ? "#D97706" : "#16A34A"
              const bgColor =
                pct >= 85 ? "#FEF2F2" : pct >= 70 ? "#FFFBEB" : "#F0FDF4"
              const borderColor =
                pct >= 85 ? "#FECACA" : pct >= 70 ? "#FDE68A" : "#BBF7D0"

              return (
                <div
                  key={i}
                  onClick={() => navigate("inpatient", u.targetWard)}
                  className="group bg-gradient-to-b from-[#FAFCFF] to-white border border-[#E2E8F0] hover:border-[#2563EB] cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[12.5px] font-bold text-gray-900 truncate group-hover:text-[#2563EB] transition-colors flex items-center gap-1.5">
                        <span>{u.emoji}</span>
                        <span>{u.unit}</span>
                      </span>
                    </div>

                    <div className="relative h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden my-2.5 p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-500 shadow-xs"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-2 border-t border-slate-100">
                    <span className="font-bold text-xs" style={{ color }}>
                      🛏️ {u.occupied} / {u.total}
                    </span>
                    <span
                      className="font-bold px-2 py-0.5 rounded-full text-[10.5px]"
                      style={{ backgroundColor: bgColor, color, border: `1px solid ${borderColor}` }}
                    >
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
