import React, { useState, useMemo } from "react"
import {
  HelpCircle,
  X,
  Keyboard,
  BookOpen,
  Command,
  Search,
  ShieldAlert,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  ArrowRight,
  Calendar,
  Layers,
  Sparkles,
  Stethoscope,
  Radio,
  Pill,
  CreditCard,
  BedDouble,
  Siren,
  Check,
  FileText,
  Activity,
  UserCheck,
  Printer,
  HeartPulse,
} from "lucide-react"

export interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenCommandPalette: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onZoomReset?: () => void
  onSetZoom?: (zoom: number) => void
  currentZoom?: number
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
  onToggleSidebar?: () => void
  sidebarCollapsed?: boolean
  onOpenMessages?: () => void
  onNavigate?: (module: string, sub?: string) => void
  onOpenApplyLeave?: () => void
}

export default function HelpModal({
  isOpen,
  onClose,
  onOpenCommandPalette,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSetZoom,
  currentZoom = 1,
  onToggleFullscreen,
  isFullscreen = false,
  onToggleSidebar,
  sidebarCollapsed = false,
  onOpenMessages,
  onNavigate,
  onOpenApplyLeave,
}: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<
    "controls" | "commands" | "shortcuts" | "emergency" | "workflows"
  >("controls")
  const [searchQuery, setSearchQuery] = useState("")

  const zoomPercent = Math.round(currentZoom * 100)

  // Zoom presets for 1-click accurate scaling
  const ZOOM_PRESETS = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3]

  // All Hospital Commands & Tools
  const ALL_COMMANDS = useMemo(
    () => [
      // DISPLAY & WORKSTATION
      {
        id: "cmd-zoom-in",
        title: "Zoom In Text Size (A+)",
        category: "Display & Workstation",
        description: "Increase UI font and layout scale by +10%",
        keys: ["Ctrl", "+"],
        actionLabel: `${zoomPercent}% → ${Math.min(130, zoomPercent + 10)}%`,
        icon: ZoomIn,
        onExecute: () => onZoomIn?.(),
      },
      {
        id: "cmd-zoom-out",
        title: "Zoom Out Text Size (A-)",
        category: "Display & Workstation",
        description: "Decrease UI font and layout scale by -10%",
        keys: ["Ctrl", "-"],
        actionLabel: `${zoomPercent}% → ${Math.max(70, zoomPercent - 10)}%`,
        icon: ZoomOut,
        onExecute: () => onZoomOut?.(),
      },
      {
        id: "cmd-zoom-reset",
        title: "Reset Text Size to 100% (A)",
        category: "Display & Workstation",
        description: "Restore standard 100% default scale",
        keys: ["Ctrl", "0"],
        actionLabel: "Set 100%",
        icon: RotateCcw,
        onExecute: () => onZoomReset?.(),
      },
      {
        id: "cmd-fullscreen",
        title: "Toggle Fullscreen Mode",
        category: "Display & Workstation",
        description: "Expand workstation to full monitor display",
        keys: ["F11"],
        actionLabel: isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen",
        icon: isFullscreen ? Minimize2 : Maximize2,
        onExecute: () => onToggleFullscreen?.(),
      },
      {
        id: "cmd-sidebar",
        title: "Toggle Sidebar Navigation",
        category: "Display & Workstation",
        description: "Expand or collapse navigation strip",
        keys: ["Ctrl", "B"],
        actionLabel: sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar",
        icon: sidebarCollapsed ? PanelLeftOpen : PanelLeftClose,
        onExecute: () => onToggleSidebar?.(),
      },
      {
        id: "cmd-palette",
        title: "Universal Command Palette",
        category: "Display & Workstation",
        description: "Instant search for patients, records, and tools",
        keys: ["Ctrl", "K"],
        actionLabel: "Launch Palette",
        icon: Command,
        onExecute: () => {
          onClose()
          onOpenCommandPalette()
        },
      },
      {
        id: "cmd-messages",
        title: "Staff Messages & Handovers",
        category: "Display & Workstation",
        description: "Inter-department clinical communication drawer",
        keys: ["Ctrl", "M"],
        actionLabel: "Open Messages",
        icon: MessageSquare,
        onExecute: () => {
          onClose()
          onOpenMessages?.()
        },
      },
      {
        id: "cmd-leave",
        title: "Apply for Staff Leave",
        category: "Staff & HRMS",
        description: "Submit leave request or track pending approval",
        keys: ["Click"],
        actionLabel: "Apply Leave",
        icon: Calendar,
        onExecute: () => {
          onClose()
          onOpenApplyLeave?.()
        },
      },

      // CLINICAL & DIAGNOSTIC DEPARTMENTS
      {
        id: "cmd-radiology",
        title: "Radiology Scans & Investigation Queue",
        category: "Clinical & Diagnostics",
        description: "View prescribed X-Rays, CTs, MRIs; verify billing & mark DONE",
        keys: ["Alt", "R"],
        actionLabel: "Open Radiology",
        icon: Radio,
        onExecute: () => {
          onClose()
          onNavigate?.("radiology")
        },
      },
      {
        id: "cmd-radiology-reports",
        title: "Radiology Completed Reports & Printing",
        category: "Clinical & Diagnostics",
        description: "Enter radiologist impressions, generate & print official PDF reports",
        keys: ["Click"],
        actionLabel: "Open Reports",
        icon: Printer,
        onExecute: () => {
          onClose()
          onNavigate?.("radiology", "reports")
        },
      },
      {
        id: "cmd-doctor-portal",
        title: "Doctor Consultation Workspace",
        category: "Clinical & Diagnostics",
        description: "Live queue, SOAP voice consultation, Rx whiteboard & split dispatch",
        keys: ["Alt", "D"],
        actionLabel: "Open Doctor Portal",
        icon: Stethoscope,
        onExecute: () => {
          onClose()
          onNavigate?.("doctor_portal")
        },
      },
      {
        id: "cmd-lab",
        title: "Laboratory Diagnostics & Pathology",
        category: "Clinical & Diagnostics",
        description: "Access paid test worklist, process samples, input critical values",
        keys: ["Alt", "L"],
        actionLabel: "Open Lab",
        icon: Activity,
        onExecute: () => {
          onClose()
          onNavigate?.("lab")
        },
      },
      {
        id: "cmd-pharmacy",
        title: "Central Pharmacy Dispensing",
        category: "Clinical & Diagnostics",
        description: "Review doctor Rx queue, OCR split verify, barcode dispense & stock",
        keys: ["Alt", "P"],
        actionLabel: "Open Pharmacy",
        icon: Pill,
        onExecute: () => {
          onClose()
          onNavigate?.("pharmacy_dispensing")
        },
      },
      {
        id: "cmd-emergency",
        title: "Emergency Department Track Board",
        category: "Emergency & Inpatient",
        description: "Trauma bay allocation, Manchester triage, resuscitation flowsheet",
        keys: ["Alt", "E"],
        actionLabel: "Open Emergency",
        icon: Siren,
        onExecute: () => {
          onClose()
          onNavigate?.("emergency")
        },
      },
      {
        id: "cmd-inpatient",
        title: "Inpatient Ward & Bed Board",
        category: "Emergency & Inpatient",
        description: "Bed management, ward admissions, clinical charting & transfers",
        keys: ["Alt", "I"],
        actionLabel: "Open Inpatient",
        icon: BedDouble,
        onExecute: () => {
          onClose()
          onNavigate?.("inpatient")
        },
      },
      {
        id: "cmd-icu",
        title: "ICU Daily Flowsheets & Vitals",
        category: "Emergency & Inpatient",
        description: "Intensive care 24h flowsheet, ventilator parameters & fluid balance",
        keys: ["Click"],
        actionLabel: "Open ICU",
        icon: HeartPulse,
        onExecute: () => {
          onClose()
          onNavigate?.("icu")
        },
      },
      {
        id: "cmd-reception",
        title: "Reception & Patient Registration",
        category: "Hospital Admin",
        description: "Register new OP visitors, book appointments, check token status",
        keys: ["Alt", "N"],
        actionLabel: "Open Registration",
        icon: UserCheck,
        onExecute: () => {
          onClose()
          onNavigate?.("register")
        },
      },
      {
        id: "cmd-billing",
        title: "Billing Counter & Cashier",
        category: "Hospital Admin",
        description: "OP consultations, lab test payments, pharmacy receipts & insurance pre-auth",
        keys: ["Alt", "B"],
        actionLabel: "Open Billing",
        icon: CreditCard,
        onExecute: () => {
          onClose()
          onNavigate?.("billing")
        },
      },
    ],
    [
      zoomPercent,
      isFullscreen,
      sidebarCollapsed,
      onZoomIn,
      onZoomOut,
      onZoomReset,
      onToggleFullscreen,
      onToggleSidebar,
      onOpenCommandPalette,
      onOpenMessages,
      onOpenApplyLeave,
      onNavigate,
      onClose,
    ]
  )

  // Emergency Codes
  const EMERGENCY_CODES = [
    {
      code: "CODE BLUE",
      name: "Cardiac / Respiratory Arrest",
      extension: "2222",
      color: "border-blue-600 bg-blue-50/80 text-blue-950",
      pillColor: "bg-blue-600 text-white",
      description: "Immediate cardiopulmonary resuscitation team dispatch. Bring crash cart to stated bed/zone.",
      protocol: "1. State patient location clearly 3 times • 2. Begin CPR (30:2) • 3. Prepare defibrillator and suction.",
    },
    {
      code: "CODE RED",
      name: "Fire / Smoke Emergency",
      extension: "1111",
      color: "border-rose-600 bg-rose-50/80 text-rose-950",
      pillColor: "bg-rose-600 text-white",
      description: "RACE protocol activated: Rescue persons, Alarm & notify, Confine smoke/doors, Extinguish/evacuate.",
      protocol: "PASS extinguisher technique: Pull pin, Aim nozzle, Squeeze handle, Sweep side-to-side.",
    },
    {
      code: "CODE YELLOW",
      name: "Disaster / Mass Casualty",
      extension: "3333",
      color: "border-amber-500 bg-amber-50/80 text-amber-950",
      pillColor: "bg-amber-600 text-white",
      description: "Emergency room surge protocol. All off-duty triage staff mobilize to Emergency Bay.",
      protocol: "Triage tagging: Red (Immediate/STAT), Yellow (Delayed), Green (Minor/Walking), Black (Expectant).",
    },
    {
      code: "STAT PHARMACY / LAB",
      name: "Critical Antidote & Panic Values",
      extension: "4444",
      color: "border-purple-600 bg-purple-50/80 text-purple-950",
      pillColor: "bg-purple-600 text-white",
      description: "Immediate delivery of reversal agents, inotropes, or verification of critical lab panic flags.",
      protocol: "Read-back protocol mandatory for all verbal phone orders and critical potassium/troponin values.",
    },
    {
      code: "CODE PINK",
      name: "Infant / Child Security Alert",
      extension: "5555",
      color: "border-pink-600 bg-pink-50/80 text-pink-950",
      pillColor: "bg-pink-600 text-white",
      description: "Immediate perimeter lockdown of NICU, Maternity, and Pediatric wards.",
      protocol: "All stairwells and exit elevators locked. Inspect all bags and carriers at security posts.",
    },
    {
      code: "CODE BLACK",
      name: "Security / Violence / Threat",
      extension: "6666",
      color: "border-slate-800 bg-slate-100 text-slate-900",
      pillColor: "bg-slate-900 text-white",
      description: "Physical threat or aggressive behavior containment team mobilization.",
      protocol: "Do not confront armed individual. Isolate ward and guide patients to protected nursing areas.",
    },
  ]

  // Department Workflows
  const WORKFLOWS = [
    {
      id: "rad-wf",
      title: "Radiology Department (End-to-End Workflow)",
      icon: Radio,
      badge: "Diagnostics",
      module: "radiology",
      steps: [
        "1. Doctor Investigation Order: Physician prescribes X-Ray, CT, or MRI from OP/IP/ER.",
        "2. Nurse Verification: Nurse verifies clinical justification; orders dispatch simultaneously to central Billing & Radiology.",
        "3. Live Payment Status: Radiology displays PAID or PENDING based on central billing counter receipt.",
        "4. Scan Execution: Radiology staff view patient details, perform diagnostic scan, and mark as DONE.",
        "5. Technical Report: Completed scans transfer to reporting technician to document actual findings & impressions.",
        "6. PDF & Print: Generate structured hospital report with window.print() formatting and direct PDF download.",
      ],
    },
    {
      id: "doc-wf",
      title: "Physician Workspace & Digital Prescription",
      icon: Stethoscope,
      badge: "Clinical",
      module: "doctor_portal",
      steps: [
        "1. Live Waiting Queue: View appointed OP patient queue, wait timers, and clinic alerts.",
        "2. SOAP Voice Consultation: Web Speech audio transcribed into structured Subjective/Objective/Assessment note.",
        "3. Digital Rx Sheet: Upload scan, type lines, or draw ink strokes on whiteboard canvas.",
        "4. AI OCR & Split: Separate medicines and lab tests independently before dispatch.",
        "5. Independent Dispatch: Medicines forward to Pharmacy queue; Lab tests forward to reception counter for payment.",
      ],
    },
    {
      id: "er-wf",
      title: "Emergency Department & Bed Allocation",
      icon: Siren,
      badge: "Emergency",
      module: "emergency",
      steps: [
        "1. Arrival & Fast-Track Triage: Immediate ESI/Manchester triage scoring.",
        "2. Bed Board Allocation: Real-time bed occupancy, resuscitation bay allocation, and vital sign monitoring.",
        "3. Disposition: Discharge, transfer to ICU/Ward, or mark for emergency observation.",
      ],
    },
    {
      id: "pharma-wf",
      title: "Central Pharmacy Dispensing & Inventory",
      icon: Pill,
      badge: "Dispensing",
      module: "pharmacy_dispensing",
      steps: [
        "1. Queue Verification: Pharmacist reviews doctor e-prescriptions and cross-checks OCR sheets.",
        "2. Dispensing: Barcode batch verification, stock subtraction, and instant bill generation.",
        "3. Procurement & Returns: Purchase orders, supplier return processing, and expiry tracking.",
      ],
    },
  ]

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return ALL_COMMANDS
    const q = searchQuery.toLowerCase()
    return ALL_COMMANDS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.keys.some((k) => k.toLowerCase().includes(q))
    )
  }, [searchQuery, ALL_COMMANDS])

  // Filter emergency
  const filteredEmergency = useMemo(() => {
    if (!searchQuery.trim()) return EMERGENCY_CODES
    const q = searchQuery.toLowerCase()
    return EMERGENCY_CODES.filter(
      (e) =>
        e.code.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.extension.includes(q)
    )
  }, [searchQuery, EMERGENCY_CODES])

  // Filter workflows
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return WORKFLOWS
    const q = searchQuery.toLowerCase()
    return WORKFLOWS.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.steps.some((step) => step.toLowerCase().includes(q))
    )
  }, [searchQuery, WORKFLOWS])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="bg-[#0B132B] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold shadow-inner">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Hospital System Controls &amp; Quick Command Center
                <span className="text-[11px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-mono font-semibold">
                  Scale: {zoomPercent}%
                </span>
                {isFullscreen && (
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                    FULLSCREEN ON
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Text Zoom (A+/A-), Fullscreen (F11), Live Shortcuts &amp; Department Guides
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Help (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── ALWAYS-VISIBLE QUICK CONTROLS BAR (ZOOM & FULLSCREEN) ─────── */}
        <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-inner">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ZoomIn size={14} className="text-blue-400" />
              <span>Text Size:</span>
            </span>

            {/* A- Button */}
            <button
              onClick={() => onZoomOut?.()}
              title="Decrease text size by 10% (Ctrl + -)"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-blue-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              A-
            </button>

            {/* Preset Buttons */}
            <div className="flex items-center gap-1">
              {ZOOM_PRESETS.map((p) => {
                const pct = Math.round(p * 100)
                const isActive = Math.abs(currentZoom - p) < 0.04
                return (
                  <button
                    key={pct}
                    onClick={() => {
                      if (onSetZoom) onSetZoom(p)
                      else if (p === 1.0) onZoomReset?.()
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-blue-500 text-white shadow-xs scale-105"
                        : "bg-slate-700/60 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    {pct}%
                  </button>
                )
              })}
            </div>

            {/* A+ Button */}
            <button
              onClick={() => onZoomIn?.()}
              title="Increase text size by 10% (Ctrl + +)"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-blue-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              A+
            </button>

            {/* Reset to 100% */}
            {zoomPercent !== 100 && (
              <button
                onClick={() => onZoomReset?.()}
                title="Reset zoom to default 100% (Ctrl + 0)"
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold transition-all cursor-pointer ml-1"
              >
                Reset 100%
              </button>
            )}
          </div>

          {/* Fullscreen & Workstation Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFullscreen?.()}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                isFullscreen
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              }`}
              title="Toggle Fullscreen Display (F11)"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isFullscreen ? "Exit Fullscreen (F11)" : "Toggle Fullscreen (F11)"}</span>
            </button>

            <button
              onClick={() => onToggleSidebar?.()}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Toggle Sidebar (Ctrl + B)"
            >
              {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
              <span>Sidebar: {sidebarCollapsed ? "Expand" : "Collapse"}</span>
            </button>
          </div>
        </div>

        {/* ── SEARCH BAR ─────────────────────────────────────────────────── */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to filter commands, shortcuts, or emergency codes (e.g. 'zoom', 'radiology', 'f11', 'code blue', 'rx')..."
            className="w-full text-xs bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400 font-medium"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 cursor-pointer"
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* ── TAB STRIP ───────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab("controls")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "controls"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles size={15} />
            <span>Quick Controls &amp; Scaling</span>
          </button>
          <button
            onClick={() => setActiveTab("commands")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "commands"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Command size={15} />
            <span>Interactive Commands ({filteredCommands.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "shortcuts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Keyboard size={15} />
            <span>Keyboard Shortcuts Guide</span>
          </button>
          <button
            onClick={() => setActiveTab("emergency")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "emergency"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert size={15} />
            <span>Emergency Codes ({filteredEmergency.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("workflows")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "workflows"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen size={15} />
            <span>Department SOPs ({filteredWorkflows.length})</span>
          </button>
        </div>

        {/* ── MODAL BODY ──────────────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {/* TAB 1: QUICK CONTROLS & SCALING */}
          {activeTab === "controls" && (
            <div className="space-y-4">
              {/* Feature Card 1: Text Size Zoom */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <ZoomIn size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Typography &amp; Text Size Scaling
                      </h4>
                      <p className="text-xs text-slate-500">
                        Dynamically adjust app font scale from 70% up to 130% with instant persistence
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                      Current: {zoomPercent}%
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onZoomOut?.()}
                      className="px-3 py-2 bg-white hover:bg-blue-600 text-slate-800 hover:text-white border border-slate-300 hover:border-transparent rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <ZoomOut size={15} />
                      <span>Zoom Out (A-)</span>
                    </button>

                    <button
                      onClick={() => onZoomReset?.()}
                      className="px-3 py-2 bg-white hover:bg-slate-800 text-slate-800 hover:text-white border border-slate-300 hover:border-transparent rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} />
                      <span>Standard 100% (A)</span>
                    </button>

                    <button
                      onClick={() => onZoomIn?.()}
                      className="px-3 py-2 bg-white hover:bg-blue-600 text-slate-800 hover:text-white border border-slate-300 hover:border-transparent rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <ZoomIn size={15} />
                      <span>Zoom In (A+)</span>
                    </button>
                  </div>

                  {/* Preset Scale Buttons */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 mr-1">Presets:</span>
                    {ZOOM_PRESETS.map((p) => {
                      const pct = Math.round(p * 100)
                      const isSelected = Math.abs(currentZoom - p) < 0.04
                      return (
                        <button
                          key={pct}
                          onClick={() => {
                            if (onSetZoom) onSetZoom(p)
                            else if (p === 1.0) onZoomReset?.()
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                          }`}
                        >
                          {pct}%
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Feature Card 2: Fullscreen & Display */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Maximize2 size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Display Mode &amp; Fullscreen
                      </h4>
                      <p className="text-xs text-slate-500">
                        Maximize hospital workspace to full monitor resolution without browser URL bars
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleFullscreen?.()}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                      isFullscreen
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-slate-900 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    <span>{isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}</span>
                  </button>
                </div>
              </div>

              {/* Feature Card 3: Universal Search & Communication */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <Command size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">Universal Palette</h5>
                      <p className="text-[11px] text-slate-500">Patient &amp; action search (Ctrl + K)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose()
                      onOpenCommandPalette()
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer border border-blue-200 hover:border-transparent"
                  >
                    Launch
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">Staff Messages</h5>
                      <p className="text-[11px] text-slate-500">Clinical handovers (Ctrl + M)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose()
                      onOpenMessages?.()
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-xs font-semibold transition-all cursor-pointer border border-emerald-200 hover:border-transparent"
                  >
                    Open Drawer
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE COMMANDS */}
          {activeTab === "commands" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredCommands.map((cmd) => {
                  const IconCmp = cmd.icon
                  return (
                    <div
                      key={cmd.id}
                      className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-blue-400 hover:shadow-xs transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <IconCmp size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-bold text-slate-900 truncate">
                              {cmd.title}
                            </h5>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate leading-tight">
                            {cmd.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Key badges */}
                        <div className="flex items-center gap-0.5 font-mono text-[10px]">
                          {cmd.keys.map((k, idx) => (
                            <React.Fragment key={idx}>
                              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-semibold text-slate-700">
                                {k}
                              </kbd>
                              {idx < cmd.keys.length - 1 && <span className="text-slate-400">+</span>}
                            </React.Fragment>
                          ))}
                        </div>

                        {/* Execute button */}
                        <button
                          onClick={cmd.onExecute}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-md transition-colors cursor-pointer border border-blue-200 hover:border-transparent shrink-0"
                        >
                          {cmd.actionLabel}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: KEYBOARD SHORTCUTS GUIDE */}
          {activeTab === "shortcuts" && (
            <div className="space-y-3">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center gap-2">
                <Keyboard size={16} className="text-blue-600 shrink-0" />
                <span>
                  All keyboard shortcuts are active hospital-wide. Press shortcut keys anytime outside text inputs.
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Action / Feature</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4">Keyboard Combination</th>
                      <th className="py-2.5 px-4 text-right">Quick Run</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCommands.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <c.icon size={14} className="text-slate-400" />
                          <span>{c.title}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                          {c.category}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px]">
                          <div className="flex items-center gap-1">
                            {c.keys.map((k, idx) => (
                              <React.Fragment key={idx}>
                                <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-semibold text-slate-800">
                                  {k}
                                </kbd>
                                {idx < c.keys.length - 1 && <span className="text-slate-400">+</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={c.onExecute}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white rounded transition-colors cursor-pointer"
                          >
                            Run
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EMERGENCY CODES */}
          {activeTab === "emergency" && (
            <div className="space-y-3">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-rose-800 text-xs font-medium">
                <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                <span>
                  Immediate hospital emergency extensions. When broadcasting, state ward, bed number, and code name clearly 3 times.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredEmergency.map((ec) => (
                  <div
                    key={ec.code}
                    className={`border-l-4 rounded-r-xl border-y border-r p-3.5 flex flex-col justify-between ${ec.color} shadow-2xs`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-xs tracking-wide">
                          {ec.code} ({ec.name})
                        </span>
                        <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full ${ec.pillColor} shadow-xs`}>
                          Ext: {ec.extension}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed mb-2 font-medium">
                        {ec.description}
                      </p>
                    </div>

                    <div className="text-[10px] pt-1.5 border-t border-black/10 opacity-80 font-mono">
                      {ec.protocol}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: WORKFLOWS */}
          {activeTab === "workflows" && (
            <div className="space-y-3">
              {filteredWorkflows.map((wf) => {
                const IconCmp = wf.icon
                return (
                  <div
                    key={wf.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <IconCmp size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{wf.title}</h4>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                            {wf.badge}
                          </span>
                        </div>
                      </div>

                      {onNavigate && (
                        <button
                          onClick={() => {
                            onNavigate(wf.module)
                            onClose()
                          }}
                          className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        >
                          <span>Open Module</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>

                    <ol className="space-y-1.5 pl-4 list-decimal text-slate-700 text-[11.5px] leading-relaxed">
                      {wf.steps.map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ol>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">HospAI Healthcare Enterprise</span>
            <span className="text-slate-300">•</span>
            <span>Emergency Dial: Ext 2222 (Code Blue)</span>
            <span className="text-slate-300">•</span>
            <span>Hotline: Ext 1000 (Central Reception)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
