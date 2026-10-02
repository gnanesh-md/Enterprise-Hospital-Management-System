import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  ClipboardList,
  FileText,
  Siren,
  BedDouble,
  HeartPulse,
  Syringe,
  FlaskConical,
  Scan,
  Pill,
  Scissors,
  CreditCard,
  ShieldCheck,
  UsersRound,
  Calendar,
  Sparkles,
  BarChart3,
} from "lucide-react"

import { Icon, type IconProps } from "./components/icons"

import Login from "./components/Login"

import Dashboard from "./components/Dashboard"

import PatientSearch from "./components/PatientSearch"

import PatientChart from "./components/PatientChart"

import ErPage from "./pages/ErPage"

import BedManagementPage from "./pages/BedManagementPage"

import NursingPortal from "./components/nursing/NursingPortal"

import type { Notice } from "./types"

import { apiFetch } from "./lib/api"

import Laboratory from "./components/Laboratory"

import Pharmacy from "./components/Pharmacy"
import EmergencyUI from "./components/Emergency"

import Billing from "./components/Billing"
import LabBillingQueue from "./components/LabBillingQueue"
import InsuranceClaims from "./components/insurance/ClaimsHome"
import InsuranceSettlementPage from "./components/insurance/SettlementPage"
import InsuranceMastersPage from "./components/insurance/MastersPage"
import InsuranceDashboardView from "./components/insurance/InsuranceDashboardView"
import InsuranceCommandDashboard from "./components/insurance/InsuranceCommandDashboard"
import CashlessCaseBoard from "./components/insurance/CashlessCaseBoard"
import InsuranceCaseDetailView from "./components/insurance/InsuranceCaseDetailView"
import DischargeFinalizationView from "./components/insurance/DischargeFinalizationView"
import InsuranceReportsView from "./components/insurance/InsuranceReportsView"
import InsuranceEmailHubPage from "./components/insurance/InsuranceEmailHubPage"
import InsuranceIntakeView from "./components/insurance/InsuranceIntakeView"
import PreAuthRequestView from "./components/insurance/PreAuthRequestView"
import { InsuranceEngineService } from "./services/insuranceDb"
import { HospAILogo } from "./components/HospAILogo"
import BillingDashboard from "./components/billing/BillingDashboard"

import RevenueDashboard from "./components/billing/RevenueDashboard"

import Inpatient from "./components/Inpatient"

import Surgery from "./components/Surgery"

import Appointments from "./components/Appointments"

import Radiology from "./components/Radiology"

import ICU from "./components/ICU"

import Analytics from "./components/Analytics"

import Discharge from "./components/Discharge"

import Triage from "./components/Triage"


import OrderDrawer from "./components/OrderDrawer"

import CommandPalette from "./components/CommandPalette"

import Registration from "./components/Registration"

import NurseStation from "./components/NurseStation"

import OPWorkflow from "./components/OPWorkflow"

import SmartOCR from "./components/SmartOCR"

import DpiOcrPortal from "./components/DpiOcrPortal"

import SymptomAI from "./components/SymptomAI"

import ClinicalRAG from "./components/ClinicalRAG"

import ClinicalSummaries from "./components/ClinicalSummaries"

import BulkAI from "./components/BulkAI"

import NLFiltering from "./components/NLFiltering"

import IntelligenceHub from "./components/IntelligenceHub"

import QueueManagement from "./components/QueueManagement"

import OPManagement from "./components/OPManagement"
import OPDProcedures from "./components/OPDProcedures"
import DoctorPortal from "./components/doctor/DoctorPortal"

import DoctorScheduling from "./components/DoctorScheduling"

import PatientExperience from "./components/PatientExperience"

import HRMS from "./components/HRMS"

import Employees from "./components/Employees"

import Admissions from "./components/Admissions"

import Readmission from "./components/Readmission"

import PaymentCollection from "./components/PaymentCollection"

import RevenueReports from "./components/RevenueReports"

import Administration from "./components/Administration"

import OpReportsPage from "./components/reports/OpReportsPage"

import GeneralReportsOverviewPage from "./components/reports/GeneralReportsOverviewPage"

import GenericReportPage, {
  ReportType,
} from "./components/reports/GenericReportPage"

import { AuditDatabase } from "./services/auditDb"

import { ALL_SYSTEM_MODULES, RoleDatabase } from "./services/roleDb"

import {
  DoctorAccount,
  DoctorPortalDatabase,
  resolveDoctorAccount,
} from "./services/doctorPortalDb"

import { LabOrderDatabase } from "./services/labOrdersDb"
import { PharmacyDatabase, isAwaitingVerification } from "./services/pharmacyDb"
import { ErDatabase } from "./services/erDb"
import { BedDatabase } from "./services/bedDb"
import { db } from "./services/db"
import { getDischargedIcuPatients } from "./components/icu/IcuDischargeModal"

/** Insurance sub-modules and legacy key mappings */
const insuranceModule = (m: string): string =>
  m === "insurance_reconciliation"
    ? "insurance_settlement"
    : m === "insurance_desk"
      ? "insurance_overview"
      : m === "insurance"
        ? "insurance_claims"
        : m


type Module = "dashboard" | "patients" | "appointments" | "emergency" | "emergency_ui" | "clinical" | "inpatient" | "nursing" | "laboratory" | "radiology" | "pharmacy" | "pharmacy_dispensing" | "pharmacy_rx" | "pharmacy_ocr" | "pharmacy_returns" | "pharmacy_supplier_returns" | "pharmacy_medicine" | "pharmacy_category" | "pharmacy_suppliers" | "pharmacy_po" | "pharmacy_grn" | "pharmacy_ledger" | "pharmacy_transfers" | "pharmacy_expiry" | "pharmacy_analytics" | "pharmacy_notifications" | "pharmacy_users" | "pharmacy_audit" | "pharmacy_settings" | "surgery" | "billing" | "billing_op" | "billing_ip" | "billing_er" | "billing_unified" | "billing_revenue" | "icu" | "icu_micu" | "icu_sicu" | "icu_ccu" | "icu_nicu" | "icu_picu" | "discharge" | "triage" | "insurance" | "insurance_overview" | "insurance_desk" | "insurance_board" | "insurance_case" | "insurance_discharge" | "insurance_reports" | "insurance_preauth" | "insurance_eligibility" | "insurance_claims" | "insurance_queries" | "insurance_emails" | "insurance_settlement" | "insurance_reconciliation" | "insurance_masters" | "insurance_tpas" | "insurance_packages" | "insurance_pricing" | "insurance_docrules" | "analytics" | "reports" | "reports_overview" | "reports_patients" | "reports_op" | "reports_er" | "reports_inpatient" | "reports_appointments" | "reports_doctors" | "reports_pharmacy" | "reports_laboratory" | "reports_radiology" | "reports_beds" | "reports_admissions" | "reports_discharges" | "reports_staff" | "admin" | "chart" | "register" | "outpatient" | "queue" | "op_management" | "op_registration" | "op_workflow" | "op_nurse" | "opd_procedures" | "doctor_workflow" | "doctor_portal" | "scheduling" | "lab_billing" | "admissions" | "readmission" | "payments" | "revenue_reports" | "reports_pharmacy_damaged" | "reports_supplier_returns" | "hrms" | "employees" | "patient_exp" | "intelligence" | "ocr" | "dpi_ocr" | "symptom_ai" | "clinical_rag" | "clinical_summaries" | "bulk_ai" | "nl_filtering" | "beds"

interface NavItem {
  key: Module

  label: string

  Icon: React.ComponentType<{ className?: string; size?: number | string }>

  badge?: number

  children?: { key: Module; label: string; group?: string }[]
}


const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },

  { key: "doctor_portal", label: "Doctor Workspace", Icon: Stethoscope },

  {
    key: "patients",
    label: "Reception",
    Icon: Users,

    children: [
      { key: "patients", label: "Patient Search" },

      { key: "register", label: "Registration" },

      { key: "appointments", label: "Appointments" },
    ],
  },

  {
    key: "outpatient",
    label: "OP Department",
    Icon: ClipboardList,
    children: [
      { key: "op_management", label: "OP Management" },
      { key: "queue", label: "Live Queue Board" },
      { key: "op_nurse", label: "Nurse Station" },
      { key: "opd_procedures", label: "OPD Minor Procedures" },
    ],
  },

  {
    key: "clinical",
    label: "Clinical",
    Icon: FileText,

    children: [{ key: "chart", label: "Encounters" }],
  },

  {
    key: "emergency",
    label: "Emergency",
    Icon: Siren,

    children: [
      { key: "emergency", label: "ED Track Board" },
      { key: "emergency_ui", label: "Emergency UI (Updated)" },
      { key: "triage", label: "Triage" },
    ],
  },

  {
    key: "inpatient",
    label: "Inpatient",
    Icon: BedDouble,

    children: [
      { key: "inpatient", label: "Bed Board" },

      { key: "beds", label: "Bed Management" },

      { key: "admissions", label: "Admissions" },

      { key: "readmission", label: "Readmission" },

      { key: "discharge", label: "Discharge" },
    ],
  },

  {
    // Each ICU unit is its own sub-page of one Critical Care workspace; the
    // sub-keys inherit the "icu" grant, so no role needs updating.
    key: "icu",
    label: "Critical Care",
    Icon: HeartPulse,

    children: [
      { key: "icu", label: "All ICUs" },
      { key: "icu_micu", label: "Medical ICU (MICU)" },
      { key: "icu_sicu", label: "Surgical ICU (SICU)" },
      { key: "icu_ccu", label: "Cardiac ICU (CCU)" },
      { key: "icu_nicu", label: "Neuro ICU (NICU)" },
      { key: "icu_picu", label: "Pediatric ICU (PICU)" },
    ],
  },

  { key: "laboratory", label: "Laboratory", Icon: FlaskConical },

  { key: "radiology", label: "Radiology", Icon: Scan },

  {
    key: "pharmacy",
    label: "Pharmacy",
    Icon: Pill,

    children: [
      { key: "pharmacy", label: "Dashboard" },
      {
        key: "pharmacy_dispensing",
        label: "Dispensing & Billing",
        group: "Sales & Dispensing",
      },
      {
        key: "pharmacy_rx",
        label: "Prescription Queue",
        group: "Sales & Dispensing",
      },
      {
        key: "pharmacy_returns",
        label: "Sales Returns",
        group: "Sales & Dispensing",
      },
      { key: "pharmacy_medicine", label: "Medicine Master", group: "Catalog" },
      {
        key: "pharmacy_suppliers",
        label: "Suppliers",
        group: "Inventory Management",
      },
      {
        key: "pharmacy_supplier_returns",
        label: "Supplier Returns",
        group: "Inventory Management",
      },
      {
        key: "pharmacy_po",
        label: "Purchase Orders",
        group: "Procurement & Receiving",
      },
      {
        key: "pharmacy_ocr",
        label: "Scan Invoice (GRN)",
        group: "Procurement & Receiving",
      },
      { key: "pharmacy_ledger", label: "Inventory Ledger", group: "Inventory" },

      {
        key: "pharmacy_expiry",
        label: "Expiry Management",
        group: "Inventory",
      },

      {
        key: "pharmacy_analytics",
        label: "Analytics & Reports",
        group: "Reporting",
      },

      {
        key: "pharmacy_notifications",
        label: "Notifications",
        group: "Administration",
      },

      { key: "pharmacy_audit", label: "Audit Log", group: "Administration" },
    ],
  },

  { key: "surgery", label: "Surgery", Icon: Scissors },

  {
    key: "billing",
    label: "Billing",
    Icon: CreditCard,

    // One page per counter. Grouped children render under a caption, so the
    // counters, the lab desk and the records read as three short lists.
    children: [
      // "billing" is the Billing Dashboard -- the module's landing page, as
      // Dashboard is for the app. Screens that deep-link to "billing" with a
      // bill preselected are forwarded by the dashboard to that bill's counter.
      { key: "billing", label: "Billing Dashboard" },
      { key: "billing_op", label: "OP Billing", group: "Counters" },
      { key: "billing_ip", label: "IP Billing", group: "Counters" },
      { key: "billing_er", label: "Emergency Billing", group: "Counters" },
      { key: "lab_billing", label: "Lab Test Billing", group: "Counters" },
      { key: "billing_unified", label: "Unified Patient Bill", group: "Records" },
      { key: "payments", label: "Payment History", group: "Records" },
      { key: "billing_revenue", label: "Revenue & Dues", group: "Records" },
    ],
  },

  {
    // The insurance engine shared by OP / IP / ER / OT / ICU: one case per
    // insured encounter, from
    // eligibility and pre-auth through claim, queries and settlement.
    key: "insurance",
    label: "Insurance",
    Icon: ShieldCheck,

    children: [
      { key: "insurance_overview", label: "Command Dashboard" },
      { key: "insurance_eligibility", label: "New Patient / Intake" },
      { key: "insurance_preauth", label: "Pre-Authorization" },
      { key: "insurance_board", label: "Cashless Case Board" },
      { key: "insurance_claims", label: "Claims & Queries" },
      { key: "insurance_emails", label: "Email & TPA Decision Hub" },
      { key: "insurance_settlement", label: "Settlements" },
      { key: "insurance_packages", label: "Billing & Packages" },
      { key: "insurance_masters", label: "Master Data" },
      { key: "insurance_reports", label: "Reports" },
      { key: "insurance_docrules", label: "Audit Log & Rules" },
    ],


  },

  {
    key: "hrms",
    label: "HR & Staff",
    Icon: UsersRound,

    children: [
      { key: "hrms", label: "HRMS" },

      { key: "employees", label: "Employees" },
    ],
  },

  { key: "scheduling", label: "Doctor Scheduling", Icon: Calendar },

  {
    key: "intelligence",
    label: "Hosp AI",
    Icon: Sparkles,

    children: [
      { key: "dpi_ocr", label: "Keppler OCR" },

      { key: "symptom_ai", label: "Symptom AI" },

      { key: "clinical_summaries", label: "Clinical Summaries" },

      { key: "bulk_ai", label: "Bulk Patient AI" },

      { key: "nl_filtering", label: "NL Patient Filtering" },
    ],
  },

  {
    key: "reports",
    label: "Reports",
    Icon: BarChart3,

    children: [
      { key: "reports_overview", label: "Overview", group: "General Reports" },

      {
        key: "reports_patients",
        label: "Patient Reports",
        group: "General Reports",
      },

      { key: "reports_op", label: "OP Reports", group: "General Reports" },

      { key: "reports_er", label: "ER Reports", group: "General Reports" },

      {
        key: "reports_inpatient",
        label: "IP / Inpatient Reports",
        group: "General Reports",
      },

      {
        key: "reports_appointments",
        label: "Appointment Reports",
        group: "General Reports",
      },

      {
        key: "reports_doctors",
        label: "Doctor Reports",
        group: "General Reports",
      },

      {
        key: "reports_pharmacy",
        label: "Pharmacy Reports",
        group: "General Reports",
      },

      {
        key: "reports_laboratory",
        label: "Laboratory Reports",
        group: "General Reports",
      },

      {
        key: "reports_radiology",
        label: "Radiology Reports",
        group: "General Reports",
      },

      { key: "reports_beds", label: "Bed Reports", group: "General Reports" },

      {
        key: "reports_admissions",
        label: "Admission Reports",
        group: "General Reports",
      },

      {
        key: "reports_discharges",
        label: "Discharge Reports",
        group: "General Reports",
      },

      {
        key: "reports_staff",
        label: "Staff Reports",
        group: "General Reports",
      },

      {
        key: "revenue_reports",
        label: "Revenue Reports",
        group: "Financial Reports",
      },

      {
        key: "reports_pharmacy_damaged",
        label: "Pharmacy Damaged Stock",
        group: "Financial Reports",
      },

      {
        key: "reports_supplier_returns",
        label: "Supplier Return Ledger",
        group: "Financial Reports",
      },
    ],
  },

  { key: "admin", label: "Administration", Icon: Icon.Admin },
]

// Breadcrumb label for a module. NAV already carries a proper label for every

// entry -- including all 18 pharmacy screens -- so the trail is read from there

// instead of a ternary chain that had to be extended by hand and fell through to

// the raw module key ("Pharmacy_rx") for anything nobody had added yet.

const BREADCRUMB_OVERRIDES: Record<string, string | string[]> = {
  chart: "Patient Chart",

  register: "Registration",

  discharge: "Discharge Workflow",

  op_management: "OP Management",
  op_workflow: "OP Clinical Journey",
  doctor_workflow: "Doctor Workspace",
  doctor_portal: "Doctor Workspace",
  patient_exp: "Patient Experience",

  clinical_rag: "Clinical RAG",

  reports: ["Reports", "General Reports", "Overview"],

  reports_overview: ["Reports", "General Reports", "Overview"],

  reports_patients: ["Reports", "General Reports", "Patient Reports"],

  reports_op: ["Reports", "General Reports", "OP Reports"],

  reports_er: ["Reports", "General Reports", "ER Reports"],

  reports_inpatient: ["Reports", "General Reports", "IP / Inpatient Reports"],

  reports_appointments: ["Reports", "General Reports", "Appointment Reports"],

  reports_doctors: ["Reports", "General Reports", "Doctor Reports"],

  reports_pharmacy: ["Reports", "General Reports", "Pharmacy Reports"],

  reports_laboratory: ["Reports", "General Reports", "Laboratory Reports"],

  reports_radiology: ["Reports", "General Reports", "Radiology Reports"],

  reports_beds: ["Reports", "General Reports", "Bed Reports"],

  reports_admissions: ["Reports", "General Reports", "Admission Reports"],

  reports_discharges: ["Reports", "General Reports", "Discharge Reports"],

  reports_staff: ["Reports", "General Reports", "Staff Reports"],

  revenue_reports: ["Reports", "Financial Reports", "Revenue Reports"],

  reports_pharmacy_damaged: [
    "Reports",
    "Financial Reports",
    "Pharmacy Damaged Stock",
  ],

  reports_supplier_returns: [
    "Reports",
    "Financial Reports",
    "Supplier Return Ledger",
  ],
}

function moduleTrail(module: string): string[] {
  const override = BREADCRUMB_OVERRIDES[module]

  if (override) return Array.isArray(override) ? override : [override]

  for (const item of NAV) {
    if (item.key === module && !item.children) return [item.label]

    const child = item.children?.find((c) => c.key === module)

    if (child) {
      if (child.group) {
        return [item.label, child.group, child.label]
      }

      // A module's own landing page repeats the section name otherwise.

      return child.key === item.key ? [item.label] : [item.label, child.label]
    }

    if (item.key === module) return [item.label]
  }

  return [module]
}

function NotificationPanel({
  onClose,
  onNavigate,
}: {
  onClose: () => void
  onNavigate: (module: string, sub?: string) => void
}) {
  const [readState, setReadState] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("hospai_dashboard_notifs_read")
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const items = React.useMemo(() => {
    const list: {
      id: string
      type: "critical" | "warning" | "info"
      icon: string
      title: string
      body: string
      time: string
      target: string
      sub?: string
    }[] = []

    // 1. Bed Transfer notifications
    const transfers = BedDatabase.getTransferNotifications()
    transfers.slice(0, 3).forEach((tr) => {
      list.push({
        id: `tr-${tr.id}`,
        type: tr.priority.includes("Stat") ? "critical" : "warning",
        icon: "🛏️",
        title: `Bed Transfer: ${tr.patient_name}`,
        body: `${tr.source_department} → ${tr.target_destination}`,
        time: "Just now",
        target: "inpatient",
        sub: tr.target_ward,
      })
    })

    // 2. Critical & Pending Labs
    const labs = LabOrderDatabase.getOrders()
    labs
      .filter((l) => l.status === "Awaiting Billing" || l.status === "Sample Collected" || l.status === "In Progress" || l.tests?.some(t => t.flag === "Critical"))
      .slice(0, 3)
      .forEach((l) => {
        const isCrit = l.tests?.some((t) => t.flag === "Critical" || t.urgency === "STAT")
        const testName = l.tests && l.tests[0] ? l.tests[0].name : "Diagnostic Order"
        list.push({
          id: `lab-${l.id}`,
          type: isCrit ? "critical" : "info",
          icon: "🧪",
          title: isCrit ? `Critical Lab: ${l.patientName}` : `Pending Lab: ${testName}`,
          body: `${testName} (${l.umr}) · Status: ${l.status}`,
          time: "10m ago",
          target: "laboratory",
        })
      })

    // 3. ER Active Visits / Census
    const erVisits = ErDatabase.getVisits("active")
    const criticalEr = erVisits.filter(
      (v) => v.triage_category === "B1" || v.triage_category === "ESI-1",
    )
    if (erVisits.length > 0) {
      list.push({
        id: "er-census",
        type: criticalEr.length > 0 ? "warning" : "info",
        icon: "🚨",
        title: `ER Census: ${erVisits.length} Active Patients`,
        body: `${criticalEr.length} critical patient(s) in resuscitation/emergency bay`,
        time: "5m ago",
        target: "emergency",
      })
    }

    // 4. ICU Discharges
    const icuDis = getDischargedIcuPatients()
    if (icuDis.length > 0) {
      list.push({
        id: "icu-discharge",
        type: "info",
        icon: "📋",
        title: `ICU Discharge Handoffs (${icuDis.length})`,
        body: `${icuDis[0].patientName} ready for reception bed allocation`,
        time: "15m ago",
        target: "discharge",
      })
    }

    // 5. Today's Appointments
    const encs = db.getEncounters()
    if (encs.length > 0) {
      list.push({
        id: "op-appointments",
        type: "info",
        icon: "📅",
        title: `Appointments: ${encs.length} Booked Today`,
        body: `Next: ${encs[0].patientName} with ${encs[0].assignedDoctor}`,
        time: "Today",
        target: "appointments",
      })
    }

    return list
  }, [])

  const markAllRead = () => {
    const updated: Record<string, boolean> = { ...readState }
    items.forEach((item) => {
      updated[item.id] = true
    })
    setReadState(updated)
    try {
      localStorage.setItem(
        "hospai_dashboard_notifs_read",
        JSON.stringify(updated),
      )
    } catch { }
  }

  const markSingleRead = (id: string, target: string, sub?: string) => {
    const updated = { ...readState, [id]: true }
    setReadState(updated)
    try {
      localStorage.setItem(
        "hospai_dashboard_notifs_read",
        JSON.stringify(updated),
      )
    } catch { }
    onNavigate(target, sub)
    onClose()
  }

  const unreadCount = items.filter((i) => !readState[i.id]).length

  return (
    <div className="absolute right-0 top-full mt-1 w-84 bg-white border border-[#DDE2EC] rounded shadow-xl z-50 overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-[#DDE2EC] bg-[#FAFCFF] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-gray-900">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-mono">
              {unreadCount} New
            </span>
          )}
        </div>
        <button
          onClick={markAllRead}
          className="text-[11px] text-[#1B4FD8] font-semibold hover:underline cursor-pointer"
        >
          Mark all read
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-[#F1F5F9]">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-500">
            No active notifications
          </div>
        ) : (
          items.map((n) => {
            const isRead = Boolean(readState[n.id])
            return (
              <div
                key={n.id}
                onClick={() => markSingleRead(n.id, n.target, n.sub)}
                className={`flex gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-blue-50/60 transition-colors ${!isRead ? "bg-[#F4F7FF]" : "bg-white"
                  }`}
              >
                <span className="text-base mt-0.5">{n.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[12px] truncate ${!isRead
                        ? "font-bold text-gray-900"
                        : "font-medium text-gray-700"
                        }`}
                    >
                      {n.title}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                      {n.time}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[#64748B] truncate mt-0.5">
                    {n.body}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function NursingDashboard() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3">
        <h1 className="text-base font-semibold text-gray-900">
          Nursing Dashboard — 3N Medical
        </h1>
        <p className="text-[11.5px] text-[#64748B]">
          RN Jessica Carter · Shift: 07:00–19:00 · Aug 23, 2026
        </p>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              room: "204",
              patient: "John Smith",
              age: 41,
              vitals: "Due 11:00",
              meds: "Insulin 11:00 ▲",
              status: "Active",
              acuity: 2,
            },

            {
              room: "208",
              patient: "Mary Jones",
              age: 53,
              vitals: "Done ✓",
              meds: "None due",
              status: "Stable",
              acuity: 3,
            },

            {
              room: "212",
              patient: "Frank Torres",
              age: 55,
              vitals: "Due 12:00",
              meds: "Labetalol PRN",
              status: "Active",
              acuity: 2,
            },

            {
              room: "215",
              patient: "Helen Park",
              age: 72,
              vitals: "Done ✓",
              meds: "Done ✓",
              status: "Isolation",
              acuity: 3,
            },

            {
              room: "221",
              patient: "Robert Lee",
              age: 66,
              vitals: "Overdue ⚠",
              meds: "Overdue ⚠",
              status: "Concern",
              acuity: 2,
            },

            {
              room: "225",
              patient: "Sandra Hill",
              age: 48,
              vitals: "Done ✓",
              meds: "None due",
              status: "Stable",
              acuity: 4,
            },
          ].map((p, i) => (
            <div
              key={i}
              className={`bg-white border rounded p-4 ${p.status === "Concern"
                ? "border-[#FECACA]"
                : p.status === "Isolation"
                  ? "border-[#FED7AA]"
                  : "border-[#DDE2EC]"
                }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#94A3B8]">
                      Rm {p.room}
                    </span>
                    <span
                      className={`text-[10.5px] font-semibold px-1.5 py-px rounded ${p.acuity === 2
                        ? "bg-[#FEE2E2] text-[#B91C1C]"
                        : p.acuity === 3
                          ? "bg-[#FEF3C7] text-[#B45309]"
                          : "bg-[#DCFCE7] text-[#15803D]"
                        }`}
                    >
                      Acuity {p.acuity}
                    </span>
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900 mt-0.5">
                    {p.patient}
                  </div>
                  <div className="text-[11.5px] text-[#64748B]">
                    {p.age} yrs
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded ${p.status === "Concern"
                    ? "bg-[#FEE2E2] text-[#B91C1C]"
                    : p.status === "Isolation"
                      ? "bg-[#FEF3C7] text-[#B45309]"
                      : p.status === "Active"
                        ? "bg-[#EFF6FF] text-[#1D4ED8]"
                        : "bg-[#F0FDF4] text-[#15803D]"
                    }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Vitals</span>
                  <span
                    className={`font-medium ${p.vitals.includes("Overdue")
                      ? "text-[#DC2626]"
                      : p.vitals.includes("Due")
                        ? "text-[#D97706]"
                        : "text-[#16A34A]"
                      }`}
                  >
                    {p.vitals}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Medications</span>
                  <span
                    className={`font-medium ${p.meds.includes("Overdue")
                      ? "text-[#DC2626]"
                      : p.meds.includes("▲")
                        ? "text-[#D97706]"
                        : "text-[#16A34A]"
                      }`}
                  >
                    {p.meds}
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button className="flex-1 text-[11px] font-medium py-1 rounded border border-[#DDE2EC] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-gray-700">
                  Vitals
                </button>
                <button className="flex-1 text-[11px] font-medium py-1 rounded border border-[#DDE2EC] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-gray-700">
                  Meds
                </button>
                <button className="flex-1 text-[11px] font-medium py-1 rounded border border-[#DDE2EC] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-gray-700">
                  Notes
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface StaffProfile {
  id: string

  name: string

  role: string

  title: string

  department: string

  activeShift?: string
}

const DEFAULT_STAFF: StaffProfile = {
  id: "ADM-001",

  name: "Hospital Administrator",

  role: "Admin",

  title: "Hospital Administrator",

  department: "Administration",
}

function getRoleProfile(roleId: string, username?: string): StaffProfile {
  const r = (roleId || "").toLowerCase()

  const u = (username || "").toLowerCase()

  if (r.includes("superadmin") || u === "superadmin") {
    return {
      id: "SUP-001",
      name: "Dr. Alexander Vance",
      role: "ROLE_SUPERADMIN",
      title: "Super Administrator",
      department: "Executive Control",
    }
  }

  if (r.includes("doctor") || u === "doctor") {
    return {
      id: "DOC-402",
      name: "Dr. Sarah Jenkins",
      role: "ROLE_DOCTOR",
      title: "Attending Physician / EMR",
      department: "Cardiology & ICU",
    }
  }

  if (r.includes("reception") || u === "reception") {
    return {
      id: "REC-102",
      name: "Elena Torres",
      role: "ROLE_RECEPTION",
      title: "Front Desk Receptionist",
      department: "Patient Services",
    }
  }

  if (r.includes("pharmacy") || u === "pharmacy") {
    return {
      id: "PHM-844",
      name: "Robert Williams, RPh",
      role: "ROLE_PHARMACY",
      title: "Chief Pharmacist",
      department: "Pharmacy Dept",
    }
  }

  if (r.includes("lab") || u === "lab") {
    return {
      id: "LAB-512",
      name: "Michael Chang, CLS",
      role: "ROLE_LAB",
      title: "Lead Lab Technician",
      department: "Pathology & Radiology",
    }
  }

  if (r.includes("nurse") || r.includes("rn") || u === "nurse") {
    return {
      id: "RN-8821",
      name: "Jessica Carter, RN",
      role: "ROLE_NURSE",
      title: "Registered Nurse",
      department: "Inpatient & ICU",
    }
  }

  return {
    id: "ADM-001",
    name: "Hospital Administrator",
    role: "ROLE_ADMIN",
    title: "System Administrator",
    department: "Administration",
  }
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)

  const [userRole, setUserRole] = useState<string>("ROLE_ADMIN")

  const [userPermissions, setUserPermissions] = useState<string[]>([])

  const [activeStaff, setActiveStaff] = useState<StaffProfile>(DEFAULT_STAFF)

  // Set when a physician signs in: their portal is scoped to this one doctor.

  const [activeDoctor, setActiveDoctor] = useState<DoctorAccount | null>(null)

  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

  const [notice, setNotice] = useState<Notice | null>(null)

  const stableSetNotice = useCallback((n: Notice | null) => setNotice(n), [])

  const [module, setModule] = useState<Module>("dashboard")
  // Insurance pages link to one another by case, e.g. a query row -> its claim.
  const [insuranceCaseId, setInsuranceCaseId] = useState<string | undefined>()
  const openInsurance = (m: string, caseId?: string) => {
    setInsuranceCaseId(caseId)
    setModule(insuranceModule(m) as Module)
  }

  // Set alongside setModule("chart") when another page (e.g. a bed card's

  // patient name) wants Patient Chart to open directly on that patient

  // instead of its own directory.

  const [clinicalPatientId, setClinicalPatientId] = useState<string | null>(
    null,
  )

  const openPatientClinical = (patientId: string) => {
    setClinicalPatientId(patientId)

    setModule("chart")
  }

  const [expanded, setExpanded] = useState<string[]>([])
  const [expandedReportGroups, setExpandedReportGroups] = useState<string[]>([
    "General Reports",
  ])
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
  const [subBadges, setSubBadges] = useState<Record<string, number>>({})

  // Bumped whenever the doctor inbox or the lab-order queue changes, so the

  // sidebar counts move without waiting for the next navigation.

  const [badgeTick, setBadgeTick] = useState(0)

  useEffect(
    () => DoctorPortalDatabase.subscribe(() => setBadgeTick((t) => t + 1)),
    [],
  )

  useEffect(
    () => LabOrderDatabase.subscribe(() => setBadgeTick((t) => t + 1)),
    [],
  )

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Keppler OCR is a whole separate React app in an iframe: unmounting it on

  // every nav away means re-downloading its module graph and re-running its

  // silent sign-in on every return (~3s cold). Mount it once, then just hide

  // it, so going back is instant.

  const [ocrMounted, setOcrMounted] = useState(false)

  useEffect(() => {
    if (module === "dpi_ocr") setOcrMounted(true)
  }, [module])

  const mainRef = useRef<HTMLElement>(null)

  // Automatically scroll workspace to top whenever opening or switching modules/reports
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
    window.scrollTo(0, 0)
  }, [module])

  const [orderOpen, setOrderOpen] = useState(false)

  const [cmdOpen, setCmdOpen] = useState(false)

  const [notifOpen, setNotifOpen] = useState(false)

  const [globalSearch, setGlobalSearch] = useState("")

  const [isFullscreen, setIsFullscreen] = useState(false)

  const [zoomLevel, setZoomLevel] = useState(() => {
    // Persisted so a chosen text size survives a reload; storage can throw in

    // private windows, and a bad/stale value must not scale the whole app.

    try {
      const saved = parseFloat(localStorage.getItem("hms.zoomLevel") ?? "")

      if (Number.isFinite(saved)) return Math.min(1.2, Math.max(0.7, saved))
    } catch { }

    return 1
  })

  useEffect(() => {
    try {
      localStorage.setItem("hms.zoomLevel", String(zoomLevel))
    } catch { }
  }, [zoomLevel])

  const [newMenuOpen, setNewMenuOpen] = useState(false)

  const [workflowInitialStep, setWorkflowInitialStep] = useState<number>(2)

  const [selectedWorkflowEncounterId, setSelectedWorkflowEncounterId] =
    useState<string | undefined>()

  const [selectedTriageVisitId, setSelectedTriageVisitId] =
    useState<number | null>(null)

  const isNurse = userRole === "rn"

  /**
   * Whether this user may open a clinical consultation screen at all.
   *
   * The sidebar is already filtered by permission, but the OP screens also carry
   * their own "View in Doctor Portal" / "Doctor Portal ➔" buttons, and those
   * bypassed the nav entirely: a receptionist clicking one was bounced to the
   * dashboard by the route guard below with no explanation. Reception books the
   * appointment and takes payment -- the consultation is not theirs to open --
   * so the entry points are withheld rather than left to fail.
   */

  const canOpenConsultation =
    userPermissions.includes("doctor_workflow") ||
    userPermissions.includes("doctor_portal")

  // Check route access

  useEffect(() => {
    if (
      loggedIn &&
      module !== "dashboard" &&
      !userPermissions.includes(module)
    ) {
      // Check if it matches a child module

      const parentMatch = NAV.find((n) =>
        n.children?.some((c) => c.key === module),
      )

      if (!parentMatch || !userPermissions.includes(parentMatch.key)) {
        setModule("dashboard")
      }
    }
  }, [module, loggedIn, userPermissions])

  const handleLogout = () => {
    let curUsername = activeStaff.name
    try {
      const curData = localStorage.getItem("hospai_current_user")
      if (curData) {
        const u = JSON.parse(curData)
        if (u && u.user) curUsername = u.user
      }
    } catch { }

    AuditDatabase.logEvent(
      "Logout",
      "Authentication",
      `User ${activeStaff.name} logged out.`,
      "Success",
      activeStaff.id,
      curUsername,
    )

    try {
      localStorage.removeItem("hospai_current_user")
    } catch { }

    setLoggedIn(false)
  }

  const switchRole = (
    targetRole: string,
    targetUsername: string,
    permissions: string[],
  ) => {
    setUserRole(targetRole)

    setUserPermissions(permissions)

    setActiveStaff(getRoleProfile(targetRole, targetUsername))

    const doctor =
      targetRole === "ROLE_DOCTOR"
        ? resolveDoctorAccount({ username: targetUsername })
        : null

    setActiveDoctor(doctor)

    setModule(doctor ? "doctor_portal" : "dashboard")

    setRoleMenuOpen(false)

    try {
      localStorage.setItem(
        "hospai_current_user",
        JSON.stringify({ user: targetUsername, staffId: targetRole }),
      )
    } catch { }
  }

  const handleLogin = (userData: {
    user: string

    role: string

    staffId: string

    permissions: string[]

    doctorId?: string
  }) => {
    try {
      localStorage.setItem(
        "hospai_current_user",
        JSON.stringify({ user: userData.user, staffId: userData.staffId, role: userData.role }),
      )
    } catch { }

    setUserRole(userData.role)

    setUserPermissions(userData.permissions)

    const isDoctor =
      userData.role === "ROLE_DOCTOR" ||
      userData.user.toLowerCase().startsWith("doctor")

    const doctor = isDoctor
      ? resolveDoctorAccount({
        doctorId: userData.doctorId,
        username: userData.user,
        name: userData.user,
      })
      : null

    setActiveDoctor(doctor)

    setActiveStaff(
      doctor
        ? {
          id: doctor.staffId,

          name: doctor.name,

          role: "ROLE_DOCTOR",

          title: doctor.qualification,

          department: `${doctor.specialty} · ${doctor.room}`,
        }
        : getRoleProfile(userData.role, userData.user),
    )

    setLoggedIn(true)

    // A physician's home is their own portal -- the inbox of patients appointed

    // to them -- not the hospital-wide dashboard.

    setModule(doctor ? "doctor_portal" : "dashboard")
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => { })
    } else {
      if (document.exitFullscreen) {
        document
          .exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(() => { })
      }
    }
  }

  // Ctrl+K

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setCmdOpen(true)
      }
    }

    window.addEventListener("keydown", h)

    return () => window.removeEventListener("keydown", h)
  }, [])

  const [subModule, setSubModule] = useState<string | undefined>(undefined)

  // Any module (patient chart, admissions, ER, OT, discharge, bed board) can
  // open an insurance page on a case without threading a prop down to it.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ module: string; caseId?: string }>).detail
      if (!d?.module) return
      setInsuranceCaseId(d.caseId)
      if (d.caseId && (d.module === "insurance" || d.module === "insurance_case" || d.module === "insurance_claims")) {
        setModule("insurance_case")
      } else if (d.module === "insurance_preauth") {
        setModule("insurance_preauth")
      } else {
        setModule(insuranceModule(d.module) as Module)
      }
    }
    window.addEventListener("hms:open-insurance", onOpen)
    return () => window.removeEventListener("hms:open-insurance", onOpen)
  }, [])

  const navigate = (m: string, sub?: string) => {
    setModule(m as Module)
    setSubModule(sub)

    if (sub === "register") setModule("register")

    setCmdOpen(false)
  }

  // Counts on the nav itself, so a pharmacist sees what needs attention without opening each page.

  // Recomputed whenever the module changes, which is also when pharmacy data has just been written.

  useEffect(() => {
    if (!loggedIn) return

    try {
      const prescriptions = PharmacyDatabase.getPrescriptions()

      const batches = PharmacyDatabase.getBatches()

      const medicines = PharmacyDatabase.getMedicines()

      const active = batches.filter((b) => b.availableQuantity > 0)

      const expiringSoon = active.filter((b) => {
        const days = Math.ceil(
          (new Date(b.expiryDate).getTime() - Date.now()) / 86400000,
        )

        return days <= 90
      }).length

      const lowStock = medicines.filter(
        (m) =>
          batches
            .filter((b) => b.medicineId === m.id)
            .reduce((a, b) => a + b.availableQuantity, 0) <= m.reorderLevel,
      ).length

      // Merged in, not a full replace -- a separate effect owns the
      // "emergency" key (live ER visit count, polled from the backend) and
      // would get wiped out every time this effect re-runs otherwise.
      setSubBadges((prev) => ({
        ...prev,
        doctor_portal: activeDoctor
          ? DoctorPortalDatabase.getUnreadCount(activeDoctor.id)
          : 0,

        laboratory: LabOrderDatabase.getLabWorklist().filter(
          (o) => o.status !== "Completed",
        ).length,

        // Shared helper, not a list kept here: this badge omitted "Sent To Pharmacy"

        // -- the status the doctor portal dispatches with -- so a prescription sat

        pharmacy_rx: prescriptions.filter((p) =>
          isAwaitingVerification(p.status),
        ).length,
        pharmacy_dispensing: prescriptions.filter(
          (p) =>
            p.status === "Verified" ||
            p.status === "Approved" ||
            p.status === "Preparing" ||
            p.status === "Ready For Dispensing",
        ).length,

        pharmacy_expiry: expiringSoon,

        pharmacy_medicine: lowStock,
      }))
    } catch {
      setSubBadges((prev) => ({
        ...prev,
        doctor_portal: 0,
        laboratory: 0,
        pharmacy_rx: 0,
        pharmacy_dispensing: 0,
        pharmacy_expiry: 0,
        pharmacy_medicine: 0,
      }))
    }
  }, [module, loggedIn, badgeTick, activeDoctor])

  // Emergency's nav badge is a live count of active ER visits, and Bed
  // Management's is pending ER bed requests -- both polled from the real
  // backend, unlike the pharmacy/lab/doctor-portal badges above, which read
  // from an in-memory local store. Triage doesn't get its own badge: it's a
  // child of Emergency now, and child badges sum onto the parent's, so a
  // separate "needs triage" count here would double-count against
  // `emergency`'s total-active count instead of adding real information.
  useEffect(() => {
    if (!loggedIn) return
    let cancelled = false
    const fetchEmergencyCount = async () => {
      try {
        const data = await apiFetch<{ visits: unknown[] }>(
          "/api/er/visits?active_only=true",
        )
        if (!cancelled) {
          setSubBadges((prev) => ({
            ...prev,
            emergency: (data.visits || []).length,
          }))
        }
      } catch {
        // best effort -- picked up again on the next poll tick
      }
      try {
        const bedReqData = await apiFetch<{ bed_requests: unknown[] }>(
          "/api/er/bed-requests?status=pending",
        )
        if (!cancelled) {
          setSubBadges((prev) => ({
            ...prev,
            beds: (bedReqData.bed_requests || []).length,
          }))
        }
      } catch {
        // best effort -- picked up again on the next poll tick; a role
        // without beds.read just never gets this badge, which is fine
      }
    }
    void fetchEmergencyCount()
    const interval = window.setInterval(fetchEmergencyCount, 20000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [loggedIn])

  // Landing on a sub-module from anywhere but the sidebar (command palette, a shortcut button)

  // should still reveal where you are in the tree.

  useEffect(() => {
    const parent = NAV.find((n) =>
      n.children?.some((c) => c.key === module && c.key !== n.key),
    )

    if (!parent) return

    setExpanded((prev) =>
      prev.includes(parent.key) ? prev : [...prev, parent.key],
    )

    if (parent.key === "reports") {
      const child = parent.children?.find((c) => c.key === module)

      if (child?.group) {
        const grp = child.group

        setExpandedReportGroups((prev) =>
          prev.includes(grp) ? prev : [...prev, grp],
        )
      }
    }
  }, [module])

  const toggleExpand = (key: string) => {
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const toggleReportGroup = (group: string) => {
    setExpandedReportGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    )
  }

  return (
    <div
      className="flex flex-col overflow-hidden bg-[#F0F2F5]"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        height: `${100 / zoomLevel}vh`,
        width: `${100 / zoomLevel}vw`,
        zoom: zoomLevel,
      }}
    >
      {!loggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          {/* ── Top Header ───────────────────────────────────────────────── */}
          <header className="bg-[#0C1524] border-b border-[#1E2D42] h-12 flex items-center gap-3 px-3 flex-shrink-0 z-40">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors rounded-lg hover:bg-white/10"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M3 4.5h12M3 9h12M3 13.5h12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Global Search */}
            <div className="w-[400px] ml-auto mr-4 group">
              <button
                onClick={() => setCmdOpen(true)}
                className="w-full relative flex items-center h-9 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-left text-[13px] text-[#94A3B8] transition-all shadow-sm hover:shadow-[0_0_15px_rgba(27,79,216,0.15)] overflow-hidden"
              >
                <span className="absolute left-3 text-[#64748B] group-hover:text-blue-400 transition-colors">
                  <Icon.Search />
                </span>
                <span className="pl-10 pr-16 flex-1 truncate">
                  Search patients, MRN, appointments...
                </span>
                <div className="absolute right-2 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <kbd className="bg-black/30 border border-white/10 text-white text-[10px] px-2 py-0.5 rounded shadow-sm font-mono tracking-wider">
                    Ctrl
                  </kbd>
                  <kbd className="bg-black/30 border border-white/10 text-white text-[10px] px-2 py-0.5 rounded shadow-sm font-mono tracking-wider">
                    K
                  </kbd>
                </div>
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            </div>

            {/* Quick Create */}
            <div className="relative ml-2">
              <button
                onClick={() => setNewMenuOpen((o) => !o)}
                className="flex items-center gap-1.5 h-7 px-2.5 bg-[#1B4FD8] hover:bg-[#1740B4] rounded text-white text-[12px] font-medium transition-colors"
              >
                <Icon.Plus /> New
              </button>
              {newMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#DDE2EC] rounded shadow-lg z-50 py-1">
                  <button
                    onClick={() => {
                      setModule("register")
                      setNewMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-1.5 text-[12px] hover:bg-[#F8FAFC] text-gray-700"
                  >
                    New Patient
                  </button>
                  <button
                    onClick={() => {
                      setModule("appointments")
                      setNewMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-1.5 text-[12px] hover:bg-[#F8FAFC] text-gray-700"
                  >
                    New Appointment
                  </button>
                  <button
                    onClick={() => {
                      setModule("chart")
                      setOrderOpen(true)
                      setNewMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-1.5 text-[12px] hover:bg-[#F8FAFC] text-gray-700"
                  >
                    New Order
                  </button>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1">
              {/* Font Controls */}
              <div className="flex items-center bg-white/5 rounded px-1 mr-1">
                <button
                  title="Smaller text"
                  onClick={() =>
                    setZoomLevel((z) =>
                      Math.max(0.7, Math.round((z - 0.1) * 10) / 10),
                    )
                  }
                  className="w-6 h-6 flex items-center justify-center text-[#94A3B8] hover:text-white text-[10px] font-bold"
                >
                  A-
                </button>
                <button
                  title="Reset text size to 100%"
                  onClick={() => setZoomLevel(1)}
                  className={`h-6 min-w-6 px-1 flex items-center justify-center font-bold hover:text-white ${zoomLevel === 1
                    ? "text-[#94A3B8] text-[12px]"
                    : "text-[#F59E0B] text-[10px]"
                    }`}
                >
                  {zoomLevel === 1 ? "A" : `${Math.round(zoomLevel * 100)}%`}
                </button>
                <button
                  title="Larger text"
                  onClick={() =>
                    setZoomLevel((z) =>
                      Math.min(1.2, Math.round((z + 0.1) * 10) / 10),
                    )
                  }
                  className="w-6 h-6 flex items-center justify-center text-[#94A3B8] hover:text-white text-[14px] font-bold"
                >
                  A+
                </button>
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white rounded hover:bg-white/10 transition-colors mr-1"
              >
                {isFullscreen ? <Icon.Minimize /> : <Icon.Maximize />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen((n) => !n)}
                  className="relative w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white rounded hover:bg-white/10 transition-colors"
                >
                  <Icon.Bell />
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#DC2626] rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                    !
                  </span>
                </button>
                {notifOpen && (
                  <NotificationPanel
                    onClose={() => setNotifOpen(false)}
                    onNavigate={(m, s) => navigate(m, s)}
                  />
                )}
              </div>

              {/* Messages */}
              <button className="relative w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white rounded hover:bg-white/10 transition-colors">
                <Icon.Message />
                <span className="absolute top-1 right-1 w-3 h-3 bg-[#16A34A] rounded-full text-[8px] text-white font-bold flex items-center justify-center">
                  3
                </span>
              </button>

              {/* Help */}
              <button className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white rounded hover:bg-white/10 transition-colors text-[13px] font-bold">
                ?
              </button>

              {/* Role Switcher Menu */}
              <div className="relative ml-1 pl-3 border-l border-white/10">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-2 text-left hover:bg-white/10 p-1.5 rounded transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1B4FD8] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
                    {activeStaff.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-[11.5px] font-medium text-white leading-tight flex items-center gap-1">
                      <span>{activeStaff.name}</span>
                      <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1 rounded font-mono">
                        ▼ Role
                      </span>
                    </div>
                    <div className="text-[10px] text-[#93C5FD]">
                      {activeStaff.title}
                    </div>
                  </div>
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#CBD5E1] shadow-2xl rounded-none z-50 p-2 text-[12px] space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
                      Switch Active Portal / Role
                    </div>
                    {[
                      {
                        roleId: "ROLE_SUPERADMIN",
                        username: "superadmin",
                        label: "Super Administrator",
                        icon: "👑",
                      },

                      {
                        roleId: "ROLE_ADMIN",
                        username: "admin",
                        label: "Hospital Administrator",
                        icon: "🏢",
                      },

                      {
                        roleId: "ROLE_DOCTOR",
                        username: "doctor",
                        label: "Doctor / Physician",
                        icon: "👨‍⚕️",
                      },

                      {
                        roleId: "ROLE_RECEPTION",
                        username: "reception",
                        label: "Receptionist / Front Desk",
                        icon: "📋",
                      },

                      {
                        roleId: "ROLE_PHARMACY",
                        username: "pharmacy",
                        label: "Pharmacy Staff",
                        icon: "💊",
                      },

                      {
                        roleId: "ROLE_LAB",
                        username: "lab",
                        label: "Laboratory Staff",
                        icon: "🔬",
                      },

                      {
                        roleId: "ROLE_NURSE",
                        username: "nurse",
                        label: "Registered Nurse",
                        icon: "👩‍⚕️",
                      },
                    ].map((r) => {
                      const permissions =
                        r.roleId === "ROLE_SUPERADMIN" ||
                          r.roleId === "ROLE_ADMIN"
                          ? ALL_SYSTEM_MODULES
                          : RoleDatabase.getRoles().find(
                            (role) => role.id === r.roleId,
                          )?.allowedModules || ["dashboard"]

                      return (
                        <button
                          key={r.roleId}
                          type="button"
                          onClick={() =>
                            switchRole(r.roleId, r.username, permissions)
                          }
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer ${userRole === r.roleId
                            ? "bg-[#EFF6FF] text-[#1B4FD8] font-bold"
                            : "hover:bg-[#F8FAFC] text-[#334155]"
                            }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{r.icon}</span>
                            <span>{r.label}</span>
                          </span>
                          {userRole === r.roleId && (
                            <span className="text-[10px] text-[#15803D]">
                              ● Active
                            </span>
                          )}
                        </button>
                      )
                    })}
                    <div className="border-t border-[#E2E8F0] pt-1 mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-2.5 py-1 text-[11px] text-[#B91C1C] hover:bg-red-50 font-semibold"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {notice && (
            <div
              className={`px-4 py-2 text-[12.5px] font-medium flex items-center justify-between flex-shrink-0 ${notice.type === "error"
                ? "bg-red-50 text-red-800 border-b border-red-200"
                : notice.type === "success"
                  ? "bg-green-50 text-green-800 border-b border-green-200"
                  : "bg-blue-50 text-blue-800 border-b border-blue-200"
                }`}
            >
              <span>{notice.message}</span>
              <button className="underline" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </div>
          )}

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">
            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside
              className={`bg-[#0C1524] border-r border-[#1E2D42] flex-shrink-0 flex flex-col transition-all duration-200 overflow-y-auto ${sidebarCollapsed ? "w-14" : "w-72"
                }`}
            >
              {/* Top Logo Section */}
              <div className="flex items-center justify-center py-3.5 px-3 border-b border-[#1E2D42]/80 flex-shrink-0 text-center w-full">
                {sidebarCollapsed ? (
                  <HospAILogo variant="icon" className="w-10 h-10 mx-auto" />
                ) : (
                  <HospAILogo variant="horizontal" className="h-40 w-full justify-center mx-auto" />
                )}
              </div>
              <div
                className={`flex-1 py-2 ${sidebarCollapsed ? "px-1" : "px-2"}`}
              >
                {NAV.map((item) => {
                  // Module-based Access Control Filtering

                  const hasAccess = userPermissions.includes(item.key)

                  if (!hasAccess) return null

                  // Sub-items inherit the parent's access unless the role actually enumerates

                  // sub-module keys -- otherwise a role granted only "pharmacy" would collapse

                  // the whole Pharmacy tree down to its Dashboard entry.

                  const subModulesGranted = item.children?.some(
                    (c) =>
                      c.key !== item.key && userPermissions.includes(c.key),
                  )

                  const filteredChildren = item.children?.filter(
                    (c) =>
                      c.key === item.key ||
                      (item.key === "reports" &&
                        userPermissions.includes("reports")) ||
                      (item.key === "insurance" &&
                        userPermissions.includes("insurance")) ||
                      !subModulesGranted ||
                      userPermissions.includes(c.key),
                  )

                  const isActive =
                    module === item.key ||
                    filteredChildren?.some((c) => c.key === module)

                  const isExpanded = expanded.includes(item.key)

                  const childBadgeTotal =
                    filteredChildren?.reduce(
                      (a, c) => a + (subBadges[c.key] || 0),
                      0,
                    ) || 0

                  const navBadge =
                    childBadgeTotal > 0
                      ? childBadgeTotal
                      : subBadges[item.key] || item.badge

                  return (
                    <div key={item.key} className="relative group">
                      <div
                        className={
                          sidebarCollapsed
                            ? `w-10 h-10 mx-auto my-1 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-150 relative ${isActive
                              ? "bg-[#1B4FD8] text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/40"
                              : "hover:bg-white/10 text-white"
                            }`
                            : `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => {
                          if (filteredChildren && filteredChildren.length > 0) {
                            if (sidebarCollapsed) {
                              if (item.key === "intelligence") {
                                setModule("intelligence")
                              } else {
                                setModule(filteredChildren[0].key)
                              }
                            } else {
                              toggleExpand(item.key)

                              if (!expanded.includes(item.key)) {
                                setInsuranceCaseId(undefined)
                                if (item.key === "intelligence") {
                                  setModule("intelligence")
                                } else {
                                  setModule(filteredChildren[0].key)
                                }
                              }
                            }
                          } else {
                            setInsuranceCaseId(undefined)
                            setModule(item.key)
                          }
                        }}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <item.Icon
                          size={sidebarCollapsed ? 20 : 18}
                          className={`${sidebarCollapsed
                            ? "w-5 h-5 transition-transform duration-150 group-hover:scale-110 flex-shrink-0"
                            : "w-4.5 h-4.5 mr-3 flex-shrink-0"
                            } ${isActive ? "text-white" : "text-[#94A3B8] group-hover:text-white"}`}
                        />

                        {/* Collapsed Badge Dot */}
                        {sidebarCollapsed && navBadge && !isActive && (
                          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#DC2626] border border-[#0C1524] rounded-full"></span>
                        )}

                        {/* Collapsed Hover Tooltip */}
                        {sidebarCollapsed && (
                          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-[12px] font-semibold rounded-lg shadow-2xl border border-white/10 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                            <span>{item.label}</span>
                            {navBadge && (
                              <span className="bg-[#DC2626] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                {navBadge}
                              </span>
                            )}
                          </div>
                        )}

                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate">
                              {item.label}
                            </span>
                            {navBadge && !isActive && (
                              <span className="badge bg-[#DC2626] text-white">
                                {navBadge}
                              </span>
                            )}
                            {filteredChildren &&
                              filteredChildren.length > 0 && (
                                <span
                                  className={`transition-transform ${isExpanded ? "rotate-90" : ""
                                    }`}
                                >
                                  <Icon.ChevronRight />
                                </span>
                              )}
                          </>
                        )}
                      </div>
                      {!sidebarCollapsed &&
                        filteredChildren &&
                        filteredChildren.length > 0 &&
                        isExpanded && (
                          <div className="space-y-0.5 my-1">
                            {/* Ungrouped children (a module's own Dashboard) sit directly under the parent. */}
                            {filteredChildren
                              .filter((c) => !c.group)
                              .map((child) => (
                                <div
                                  key={`${child.key}_${child.label}`}
                                  className={`nav-item sub ${module === child.key && isActive
                                    ? "active"
                                    : ""
                                    }`}
                                  onClick={() => {
                                    setInsuranceCaseId(undefined)
                                    setModule(child.key)
                                  }}
                                >
                                  {child.label}
                                </div>
                              ))}

                            {/* Grouped children are laid out under a plain section
                              caption rather than a second accordion: the group was
                              a third click before you could reach a page that the
                              module itself listed in one flat sidebar. The caption
                              keeps the grouping legible without hiding anything. */}
                            {[
                              ...new Set(
                                filteredChildren
                                  .filter((c) => c.group)
                                  .map((c) => c.group as string),
                              ),
                            ].map((group) => {
                              const groupChildren = filteredChildren.filter(
                                (c) => c.group === group,
                              )

                              const isGroupActive = groupChildren.some(
                                (c) => c.key === module,
                              )

                              const isGroupExpanded =
                                expandedReportGroups.includes(group)

                              if (item.key === "reports") {
                                const GroupIcon =
                                  group === "General Reports"
                                    ? Icon.Reports
                                    : Icon.Billing

                                return (
                                  <div
                                    key={`${item.key}:${group}`}
                                    className="mt-1"
                                  >
                                    {/* Category Header: exactly like Inpatient */}
                                    <div
                                      className={`nav-item category ${isGroupActive ? "active" : ""
                                        }`}
                                      onClick={(e) => {
                                        e.stopPropagation()

                                        toggleReportGroup(group)

                                        if (
                                          !isGroupExpanded &&
                                          !isGroupActive &&
                                          groupChildren.length > 0
                                        ) {
                                          setModule(groupChildren[0].key)
                                        }
                                      }}
                                    >
                                      <GroupIcon
                                        size={16}
                                        className="w-4 h-4"
                                      />
                                      <span className="flex-1 truncate">
                                        {group}
                                      </span>
                                      <span
                                        className={`transition-transform duration-200 ${isGroupExpanded ? "rotate-90" : ""
                                          }`}
                                      >
                                        <Icon.ChevronRight />
                                      </span>
                                    </div>

                                    {/* Sub-items: exactly like Bed Board / Inpatient sub-items */}
                                    {isGroupExpanded && (
                                      <div className="space-y-0.5 my-1">
                                        {groupChildren.map((child) => {
                                          const isChildActive =
                                            module === child.key

                                          return (
                                            <div
                                              key={`${child.key}_${child.label}`}
                                              className={`nav-item sub justify-between ${isChildActive ? "active" : ""
                                                }`}
                                              onClick={() =>
                                                setModule(child.key)
                                              }
                                            >
                                              <span className="flex-1 truncate">
                                                {child.label}
                                              </span>
                                              {(subBadges[child.key] || 0) >
                                                0 &&
                                                !isChildActive && (
                                                  <span className="badge bg-[#334155] text-[#CBD5E1]">
                                                    {subBadges[child.key]}
                                                  </span>
                                                )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              }

                              return (
                                <div
                                  key={`${item.key}:${group}`}
                                  className="mt-2 first:mt-1"
                                >
                                  <div
                                    className="px-3 pt-1 pb-1 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors mx-1 rounded"
                                    onClick={() =>
                                      setCollapsedGroups((prev) =>
                                        prev.includes(`${item.key}:${group}`)
                                          ? prev.filter(
                                            (g) =>
                                              g !== `${item.key}:${group}`,
                                          )
                                          : [...prev, `${item.key}:${group}`],
                                      )
                                    }
                                  >
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] select-none">
                                      {group}
                                    </span>
                                    <span
                                      className={`text-[#64748B] transition-transform ${collapsedGroups.includes(
                                        `${item.key}:${group}`,
                                      )
                                        ? "-rotate-90"
                                        : ""
                                        }`}
                                    >
                                      <Icon.ChevronDown size={14} />
                                    </span>
                                  </div>
                                  {!collapsedGroups.includes(
                                    `${item.key}:${group}`,
                                  ) &&
                                    groupChildren.map((child) => (
                                      <div
                                        key={`${child.key}_${child.label}`}
                                        className={`nav-item sub justify-between ${module === child.key && isActive
                                          ? "active"
                                          : ""
                                          }`}
                                        onClick={() => setModule(child.key)}
                                      >
                                        <span className="flex-1 truncate">
                                          {child.label}
                                        </span>
                                        {(subBadges[child.key] || 0) > 0 &&
                                          module !== child.key && (
                                            <span className="badge bg-[#334155] text-[#CBD5E1]">
                                              {subBadges[child.key]}
                                            </span>
                                          )}
                                      </div>
                                    ))}
                                </div>
                              )
                            })}
                          </div>
                        )}
                    </div>
                  )
                })}
              </div>

              {sidebarCollapsed ? (
                <div className="p-2 border-t border-[#1E2D42]/60 flex justify-center">
                  <button
                    onClick={() => setCmdOpen(true)}
                    title="Command Palette (Ctrl+K)"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Icon.Cmd size={18} className="w-8 h-8 p-1.5" />
                  </button>
                </div>
              ) : (
                <div className="p-3 border-t border-[#1E2D42]">
                  <button
                    onClick={() => setCmdOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border border-white/10 text-[#64748B] hover:text-white hover:border-white/20 transition-colors text-[11.5px]"
                  >
                    <Icon.Cmd />
                    <span>Command Palette</span>
                    <kbd className="ml-auto font-mono text-[10px]">Ctrl+K</kbd>
                  </button>
                </div>
              )}
            </aside>

            {/* ── Main Workspace ───────────────────────────────────────── */}
            <main
              ref={mainRef}
              className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden"
            >
              {/* Breadcrumb strip */}
              <div className="bg-white border-b border-slate-200 px-5 py-2 flex items-center gap-2 text-xs text-slate-500 flex-shrink-0 font-medium">
                <button
                  type="button"
                  onClick={() => setModule("dashboard")}
                  className="hover:text-blue-600 transition-colors cursor-pointer flex items-center gap-1 text-slate-600 font-medium"
                >
                  <span className="text-slate-400 text-xs">🏠</span>
                  <span>Home</span>
                </button>
                {moduleTrail(module).map((crumb, i, all) => (
                  <span key={crumb} className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs select-none font-bold">›</span>
                    <span
                      className={
                        i === all.length - 1
                          ? "text-slate-900 font-bold"
                          : "text-slate-600 font-medium hover:text-blue-600 transition-colors"
                      }
                    >
                      {crumb}
                    </span>
                  </span>
                ))}
              </div>

              {/* Module Content */}
              {module === "dashboard" && (
                <Dashboard
                  navigate={navigate}
                  userRole={userRole}
                  activeStaff={activeStaff}
                  switchRole={switchRole}
                />
              )}
              {module === "patients" && (
                <PatientSearch
                  onSelect={(p) => {
                    setClinicalPatientId(
                      p.umr || (p as any).patient_id || (p as any).id,
                    )

                    setModule("chart")
                  }}
                  onRegister={() => setModule("register")}
                  onNavigateToWorkflow={(encounterId) => {
                    setSelectedWorkflowEncounterId(encounterId)

                    setWorkflowInitialStep(2)

                    setModule("op_workflow")
                  }}
                />
              )}
              {module === "register" && (
                <Registration
                  onBookAppointment={(patient) => {
                    if (patient?.id) setSelectedWorkflowEncounterId(patient.id)

                    setModule("appointments")
                  }}
                  onGoToBilling={() => setModule("billing")}
                  onComplete={() => setModule("patients")}
                  onBack={() => setModule("patients")}
                />
              )}
              {module === "chart" && (
                <PatientChart
                  onBack={() => setModule("patients")}
                  setNotice={setNotice}
                  initialPatientId={clinicalPatientId}
                  onConsumeInitialPatient={() => setClinicalPatientId(null)}
                />
              )}
              {module === "appointments" && (
                <Appointments
                  initialEncounterId={selectedWorkflowEncounterId}
                  onSelect={(patientId?: string) => {
                    if (patientId) setClinicalPatientId(patientId)
                    setModule("chart")
                  }}
                  onGoToBilling={() => setModule("billing")}
                />
              )}
              {module === "emergency" && (
                <ErPage
                  setNotice={stableSetNotice}
                  onNavigate={(m) => setModule(m as any)}
                  onOpenTriage={(visitId) => {
                    setSelectedTriageVisitId(visitId)

                    setModule("triage")
                  }}
                />
              )}
              {module === "emergency_ui" && (
                <EmergencyUI />
              )}
              {module === "inpatient" && (
                <Inpatient
                  navigate={navigate}
                  onOpenPatientClinical={openPatientClinical}
                  permissions={userPermissions}
                  initialWard={subModule}
                />
              )}
              {module === "beds" && (
                <BedManagementPage
                  setNotice={stableSetNotice}
                  onOpenPatientClinical={openPatientClinical}
                  permissions={userPermissions}
                />
              )}
              {module === "nursing" && <NursingPortal />}
              {module === "laboratory" && (
                <Laboratory technician={activeStaff.name} />
              )}
              {(module === "pharmacy" || module.startsWith("pharmacy_")) && (
                <Pharmacy
                  activeModule={module}
                  onNavigate={(m) => setModule(m as Module)}
                />
              )}
              {module === "surgery" && <Surgery />}
              {(module === "billing_op" ||
                module === "billing_ip" ||
                module === "billing_er" ||
                module === "billing_unified") && (
                  <Billing
                    view={module === "billing_unified" ? "unified" : "counter"}
                    scope={
                      module === "billing_op"
                        ? "op"
                        : module === "billing_ip"
                          ? "ip"
                          : "er"
                    }
                  />
                )}
              {module === "lab_billing" && <LabBillingQueue />}
              {module === "billing_revenue" && (
                <RevenueDashboard onNavigate={(m) => setModule(m as Module)} />
              )}
              {module === "billing" && (
                <BillingDashboard onNavigate={(m) => setModule(m as Module)} />
              )}
              {module === "radiology" && <Radiology />}
              {(module === "icu" || module.startsWith("icu_")) && (
                <ICU
                  unit={
                    module === "icu"
                      ? "All"
                      : module.slice("icu_".length).toUpperCase()
                  }
                />
              )}
              {module === "analytics" && <Analytics />}
              {module === "discharge" && (
                <Discharge
                  setNotice={stableSetNotice}
                  onComplete={() => setModule("inpatient")}
                />
              )}
              {module === "triage" && (
                <Triage
                  initialVisitId={selectedTriageVisitId}
                  setNotice={stableSetNotice}
                  onNavigate={(m) => setModule(m as any)}
                />
              )}

              {/* Insurance Command Dashboard — new Page 1 */}
              {module === "insurance_overview" && (
                <InsuranceCommandDashboard
                  onNavigate={(page, caseId) => {
                    if (page === "board") setModule("insurance_board" as any)
                    else if (page === "preauth") setModule("insurance_preauth" as any)
                    else if (page === "intake") setModule("insurance_eligibility" as any)
                    else if (page === "claims") setModule("insurance_claims" as any)
                    else if (page === "emails") setModule("insurance_emails" as any)
                    else if (page === "settlements") setModule("insurance_settlement" as any)
                    else if (page === "masters") setModule("insurance_masters" as any)
                    else if (page === "case" && caseId) {
                      setInsuranceCaseId(caseId)
                      setModule("insurance_case" as any)
                    }
                    else setModule("insurance_claims" as any)
                  }}
                />
              )}
              {/* Legacy overview key */}
              {module === "insurance_desk" && (
                <InsuranceDashboardView
                  onOpenCase={(id) => openInsurance("insurance", id)}
                  onOpenIntake={() => setModule("insurance_eligibility" as any)}
                />
              )}
              {/* Page 2: Cashless Case Board */}
              {(module === "insurance_board" as any) && (
                <CashlessCaseBoard
                  onOpenCase={(id) => { setInsuranceCaseId(id); setModule("insurance_case" as any) }}
                  onOpenIntake={() => setModule("insurance_eligibility" as any)}
                />
              )}
              {/* Page 3: Intake */}
              {module === "insurance_eligibility" && (
                <InsuranceIntakeView
                  onBack={() => setModule("insurance_overview" as any)}
                  onComplete={(id) => {
                    setInsuranceCaseId(id)
                    setModule("insurance_preauth" as any)
                  }}
                />
              )}
              {/* Page 4/5: Pre-Auth */}
              {module === "insurance_preauth" && (
                <PreAuthRequestView
                  onBack={() => setModule("insurance_overview" as any)}
                  onSubmitted={(id) => {
                    setInsuranceCaseId(id)
                    setModule("insurance_case" as any)
                  }}
                />
              )}
              {/* Page 6: Full Case Detail Hub */}
              {module === "insurance_case" && (() => {
                const allCasesForDetail = InsuranceEngineService.getClaims()
                const detailCase = allCasesForDetail.find((c) => c.id === insuranceCaseId) || allCasesForDetail[0]
                return detailCase ? (
                  <InsuranceCaseDetailView
                    c={detailCase}
                    onBack={() => setModule("insurance_board")}
                    onOpenBilling={() => setModule("billing_ip")}
                  />
                ) : (
                  <div className="p-6 text-slate-500 text-sm">Case not found. <button className="text-blue-600 underline" onClick={() => setModule("insurance_board")}>Back to board</button></div>
                )
              })()}
              {/* Page 8: Discharge & Final Approval */}
              {module === "insurance_discharge" && (() => {
                const allCasesForDischarge = InsuranceEngineService.getClaims()
                const dischargeCase = allCasesForDischarge.find((c) => c.id === insuranceCaseId) || allCasesForDischarge[0]
                return dischargeCase ? (
                  <DischargeFinalizationView
                    c={dischargeCase}
                    onBack={() => setModule("insurance_board")}
                  />
                ) : null
              })()}
              {/* Pages: Legacy claim / settlement / masters */}
              {(module === "insurance" || module === "insurance_claims" || module === "insurance_queries") && (
                <InsuranceClaims onNavigate={openInsurance} initialCaseId={insuranceCaseId} initialView="needs" />
              )}
              {module === "insurance_emails" && (
                <InsuranceEmailHubPage
                  onNavigateToClaim={(claimId) => openInsurance("insurance_claims", claimId)}
                  initialClaimId={insuranceCaseId}
                />
              )}
              {(module === "insurance_settlement" || module === "insurance_reconciliation") && (
                <InsuranceSettlementPage onNavigate={openInsurance} initialCaseId={insuranceCaseId} />
              )}
              {module === "insurance_masters" && <InsuranceMastersPage section="insurers" />}
              {module === "insurance_tpas" && <InsuranceMastersPage section="tpas" />}
              {module === "insurance_packages" && <InsuranceMastersPage section="packages" />}
              {module === "insurance_pricing" && <InsuranceMastersPage section="pricing" />}
              {module === "insurance_docrules" && <InsuranceMastersPage section="docrules" />}
              {/* Page 15: Insurance Reports */}
              {(module === "insurance_reports" as any) && (
                <InsuranceReportsView onBack={() => setModule("insurance_overview" as any)} />
              )}

              {(module === "reports" || module === "reports_overview") && (
                <GeneralReportsOverviewPage
                  onNavigate={(m) => setModule(m as any)}
                />
              )}
              {module === "reports_op" && (
                <OpReportsPage
                  userRole={userRole}
                  onNavigate={(m) => setModule(m as any)}
                />
              )}
              {module === "revenue_reports" && <RevenueReports />}
              {(module === "reports_patients" ||
                module === "reports_er" ||
                module === "reports_inpatient" ||
                module === "reports_appointments" ||
                module === "reports_doctors" ||
                module === "reports_pharmacy" ||
                module === "reports_laboratory" ||
                module === "reports_radiology" ||
                module === "reports_beds" ||
                module === "reports_admissions" ||
                module === "reports_discharges" ||
                module === "reports_staff" ||
                module === "reports_pharmacy_damaged" ||
                module === "reports_supplier_returns") && (
                  <GenericReportPage
                    key={module}
                    reportType={module as ReportType}
                    onNavigate={(m) => setModule(m as any)}
                  />
                )}
              {module === "op_nurse" && (
                <NurseStation
                  nurseName={activeStaff?.name || "OP Nurse"}
                  onOpenQueue={
                    userPermissions.includes("queue")
                      ? () => setModule("queue")
                      : undefined
                  }
                />
              )}
              {module === "admin" && <Administration />}

              {/* Outpatient Department Modular Suite */}
              {module === "op_management" && (
                <OPManagement
                  staffName={activeStaff?.name || "OP desk"}
                  onNavigateToNurseStation={
                    userPermissions.includes("op_nurse")
                      ? () => setModule("op_nurse")
                      : undefined
                  }
                  onNavigateToQueue={() => setModule("queue")}
                  onNavigateToOPDProcedures={() => setModule("opd_procedures")}
                  onNavigateToOPWorkflow={(encId, step) => {
                    if (encId) setSelectedWorkflowEncounterId(encId)

                    if (step !== undefined) setWorkflowInitialStep(step)

                    setModule("op_workflow")
                  }}
                  onNavigateToDoctorWorkflow={
                    !canOpenConsultation
                      ? undefined
                      : (encId) => {
                        if (encId) setSelectedWorkflowEncounterId(encId)

                        setModule("doctor_portal")
                      }
                  }
                  onNavigateToOPRegistration={() => {
                    setModule("op_registration")
                  }}
                />
              )}
              {module === "queue" && (
                <QueueManagement
                  onNavigateToNurseStation={
                    userPermissions.includes("op_nurse")
                      ? () => setModule("op_nurse")
                      : undefined
                  }
                  onNavigateToOPWorkflow={(encId, step) => {
                    if (encId) setSelectedWorkflowEncounterId(encId)

                    if (step !== undefined) setWorkflowInitialStep(step)

                    setModule("op_workflow")
                  }}
                  onNavigateToDoctorWorkflow={
                    !canOpenConsultation
                      ? undefined
                      : (encId) => {
                        if (encId) setSelectedWorkflowEncounterId(encId)

                        setModule("doctor_portal")
                      }
                  }
                  onNavigateToOPRegistration={() => {
                    setModule("op_registration")
                  }}
                />
              )}
              {module === "opd_procedures" && (
                <OPDProcedures
                  onNavigateToOPManagement={() => setModule("op_management")}
                />
              )}
              {module === "op_workflow" && (
                <OPWorkflow
                  initialStep={workflowInitialStep}
                  initialEncounterId={selectedWorkflowEncounterId}
                  onComplete={() => setModule("op_management")}
                  onOpenDoctorPortal={
                    !canOpenConsultation
                      ? undefined
                      : (encId) => {
                        if (encId) setSelectedWorkflowEncounterId(encId)

                        setModule("doctor_portal")
                      }
                  }
                />
              )}
              {module === "patient_exp" && <PatientExperience />}
              {(module === "doctor_workflow" || module === "doctor_portal") && (
                <DoctorPortal
                  doctor={
                    activeDoctor ||
                    resolveDoctorAccount({ name: activeStaff.name })
                  }
                  onOpenErVisit={(visitId) => {
                    setSelectedTriageVisitId(visitId)

                    setModule("triage")
                  }}
                />
              )}
              {module === "scheduling" && <DoctorScheduling />}
              {module === "admissions" && (
                <Admissions setNotice={setNotice} navigate={navigate} />
              )}
              {module === "readmission" && (
                <Readmission setNotice={setNotice} />
              )}
              {module === "payments" && <PaymentCollection />}
              {module === "hrms" && <HRMS />}
              {module === "employees" && <Employees />}
              {module === "ocr" && <SmartOCR setNotice={setNotice} />}
              {ocrMounted && (
                <div
                  className={module === "dpi_ocr" ? "h-full w-full" : "hidden"}
                >
                  <DpiOcrPortal />
                </div>
              )}
              {module === "symptom_ai" && <SymptomAI setNotice={setNotice} />}
              {module === "clinical_rag" && <ClinicalRAG />}
              {module === "clinical_summaries" && <ClinicalSummaries />}
              {module === "bulk_ai" && <BulkAI setNotice={setNotice} />}
              {module === "nl_filtering" && (
                <NLFiltering setNotice={setNotice} />
              )}
              {module === "intelligence" && (
                <IntelligenceHub navigate={navigate} />
              )}
            </main>
          </div>

          {/* ── Overlays ─────────────────────────────────────────────────── */}
          <OrderDrawer open={orderOpen} onClose={() => setOrderOpen(false)} />
          <CommandPalette
            open={cmdOpen}
            onClose={() => setCmdOpen(false)}
            onNavigate={(key) => {
              if (key === "order") {
                setModule("chart")
                setOrderOpen(true)
              } else if (key === "register") {
                setModule("register")
              } else {
                setModule(key as Module)
              }
            }}
            onSelectPatient={(patientId, encounterId) => {
              setClinicalPatientId(patientId)

              if (encounterId) {
                setSelectedWorkflowEncounterId(encounterId)
              }

              setModule("chart")
            }}
          />
        </>
      )}
    </div>
  )
}
