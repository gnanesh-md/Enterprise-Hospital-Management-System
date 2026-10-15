import React, { useState, useEffect } from "react"
import { FlaskConical } from "lucide-react"
import LabDashboardView from "./LabDashboardView"
import LabOrdersAndCollectionView from "./LabOrdersAndCollectionView"
import LabWorkbenchView from "./LabWorkbenchView"
import LabReportsView from "./LabReportsView"
import LaboratoryInventory from "./LaboratoryInventory"
import QualityControlView from "./QualityControlView"
import AdminConfigurationView from "./AdminConfigurationView"
import { LabOrder, LabOrderTest } from "../../services/labOrdersDb"

interface LaboratoryManagementSuiteProps {
  technician?: string
  activeSubPage?: string
  onNavigate?: (module: string) => void
}

export type LisSubModule =
  | "lab_dashboard"
  | "lab_orders_collection"
  | "lab_workbench"
  | "lab_reports"
  | "lab_inventory"
  | "lab_quality_analytics"
  | "lab_admin_config"
  // Legacy / granular keys for seamless routing:
  | "lab_orders"
  | "lab_sample_collection"
  | "lab_worklists"
  | "lab_analyzers"
  | "lab_result_entry"
  | "lab_pathologist_review"
  | "lab_critical_alerts"
  | "lab_review_reports"
  | "lab_test_master"
  | "lab_settings"
  | "lab_tat"

const MODULE_HEADER_INFO: Record<
  string,
  { title: string; subtitle: string; badge?: string }
> = {
  lab_dashboard: {
    title: "Laboratory Dashboard",
    subtitle: "Real-time diagnostic workload, turnaround times, and pending specimen queues",
    badge: "Operational Overview",
  },
  lab_orders_collection: {
    title: "Lab Orders & Sample Collection",
    subtitle: "Doctor order intake, billing clearance verification, vacuum tube selection, and barcode phlebotomy queue",
    badge: "Order Intake & Phlebotomy",
  },
  lab_workbench: {
    title: "Lab Workbench",
    subtitle: "Department analytical bench queues, structured result entry, and pathologist clinical approval",
    badge: "Testing & Review",
  },
  lab_reports: {
    title: "Laboratory Diagnostic Reports",
    subtitle: "Audit-ready pathology reports repository, release history, high-fidelity PDF printing, and EMR integration",
    badge: "Diagnostic Archive",
  },
  lab_inventory: {
    title: "Laboratory Consumables & Reagents",
    subtitle: "Reagents, test kits, vacuum collection tubes, and consumable stock management",
    badge: "Inventory Management",
  },
  lab_quality_analytics: {
    title: "Quality & Analytics",
    subtitle: "Levey-Jennings visual charts, Westgard multi-rules, operational analytics, and TAT SLA monitoring",
    badge: "Quality & SLAs",
  },
  lab_admin_config: {
    title: "Admin Configuration",
    subtitle: "Master directory of 200+ hospital diagnostic tests, tariffs, NABL/CAP accreditation, and tube rules",
    badge: "Catalogue & Policies",
  },
}

export default function LaboratoryManagementSuite({
  technician = "Lab Technician",
  activeSubPage = "lab_dashboard",
  onNavigate,
}: LaboratoryManagementSuiteProps) {
  // Normalize module keys into the consolidated Option 2 LIS architecture
  const normalizeKey = (key: string): LisSubModule => {
    if (key === "laboratory" || key === "lab" || key === "lab_dashboard") return "lab_dashboard"
    // Merged 1: Lab Orders & Sample Collection
    if (key === "lab_orders" || key === "lab_sample_collection" || key === "lab_orders_collection") {
      return "lab_orders_collection"
    }
    // Sample Reception removed as separate step -> routed to workbench
    if (key === "lab_sample_reception") return "lab_workbench"
    // Merged 2: Lab Workbench (Worklists + Result Entry + Pathologist Review)
    if (
      key === "lab_worklists" ||
      key === "lab_result_entry" ||
      key === "lab_pathologist_review" ||
      key === "lab_analyzers" ||
      key === "lab_processing" ||
      key === "lab_workbench" ||
      key === "lab_critical" ||
      key === "lab_critical_alerts"
    ) {
      return "lab_workbench"
    }
    // Merged 3: Solely Reports module
    if (key === "lab_reports" || key === "lab_review_reports") {
      return "lab_reports"
    }
    // Inventory
    if (key === "lab_inventory") return "lab_inventory"
    // Quality & Analytics (QC + Analytics + TAT)
    if (key === "lab_quality_analytics" || key === "lab_analytics" || key === "lab_tat") {
      return "lab_quality_analytics"
    }
    // Admin Configuration (Test Master + Settings)
    if (key === "lab_admin_config" || key === "lab_test_master" || key === "lab_catalog" || key === "lab_settings") {
      return "lab_admin_config"
    }

    return "lab_dashboard"
  }

  const [currentTab, setCurrentTab] = useState<LisSubModule>(normalizeKey(activeSubPage))
  const [activeOrderForBench, setActiveOrderForBench] = useState<LabOrder | null>(null)
  const [activeTestForBench, setActiveTestForBench] = useState<LabOrderTest | null>(null)

  useEffect(() => {
    if (activeSubPage) {
      setCurrentTab(normalizeKey(activeSubPage))
    }
  }, [activeSubPage])

  const handleTabChange = (tabId: LisSubModule) => {
    const normalized = normalizeKey(tabId)
    setCurrentTab(normalized)
    if (onNavigate) {
      onNavigate(normalized)
    }
  }

  const handleOpenBenchWithOrder = (order: LabOrder, test?: LabOrderTest) => {
    setActiveOrderForBench(order)
    setActiveTestForBench(test || null)
    handleTabChange("lab_workbench")
  }

  const currentHeader = MODULE_HEADER_INFO[currentTab] || {
    title: "Laboratory Information System (LIS)",
    subtitle: "Enterprise Diagnostic Workflow: Doctor Order → Specimen Collection → Bench Testing → Pathologist Review → Report Distribution",
    badge: "NABL & CAP Certified",
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-slate-800 p-6 space-y-5">
      {/* ── LIS MASTER HEADER ──────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#7552B8] to-[#583994] text-white rounded-xl shadow-xs">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 tracking-tight">
                  {currentHeader.title}
                </h1>
                {currentHeader.badge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-[#7552B8] uppercase">
                    {currentHeader.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentHeader.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONSOLIDATED SUB-MODULE WORKSPACES ─────────────────────────────── */}
      <div className="transition-all">
        {currentTab === "lab_dashboard" && (
          <LabDashboardView
            onNavigate={(mod) => handleTabChange(normalizeKey(mod))}
            onOpenOrder={(ord) => handleOpenBenchWithOrder(ord)}
          />
        )}

        {currentTab === "lab_orders_collection" && (
          <LabOrdersAndCollectionView
            onOpenWorkbench={(ord, t) => handleOpenBenchWithOrder(ord, t)}
            onOpenReport={() => handleTabChange("lab_reports")}
          />
        )}

        {currentTab === "lab_workbench" && (
          <LabWorkbenchView
            initialOrder={activeOrderForBench || undefined}
            initialTest={activeTestForBench || undefined}
            onCompleteToReports={() => handleTabChange("lab_reports")}
          />
        )}

        {currentTab === "lab_reports" && <LabReportsView />}

        {currentTab === "lab_inventory" && <LaboratoryInventory />}

        {currentTab === "lab_quality_analytics" && <QualityControlView />}

        {currentTab === "lab_admin_config" && <AdminConfigurationView />}
      </div>
    </div>
  )
}
