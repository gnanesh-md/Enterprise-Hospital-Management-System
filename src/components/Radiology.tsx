import React, { useState, useEffect, useMemo, useRef } from "react"
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card } from "./shared"
import { BillingDatabase, RadiologyStudyRecord } from "../services/billingDb"
import { db } from "../services/db"

const QUEUES = [
  { label: "All Studies", key: "all" },
  { label: "Pre-Paid (Ready for Scan)", key: "paid" },
  { label: "Payment Pending (Locked)", key: "unpaid" },
  { label: "In Progress (On Table)", key: "in_progress" },
  { label: "Images Ready (In PACS)", key: "images_ready" },
  { label: "Final Reports", key: "final" },
]

const MODALITIES = [
  { id: "ALL", label: "All Modalities" },
  { id: "XR", label: "XR · Digital X-Ray" },
  { id: "CT", label: "CT · Multi-Slice CT" },
  { id: "MR", label: "MR · 3.0T MRI" },
  { id: "US", label: "US · Ultrasound & Echo" },
  { id: "NM", label: "NM · Nuclear Medicine" },
]

const MODALITY_COLORS: Record<string, {
  bg: string
  text: string
  border: string
}> = {
  CT: { bg: "#EDE9FE", text: "#6D28D9", border: "#DDD6FE" },
  MR: { bg: "#E0F2FE", text: "#0369A1", border: "#BAE6FD" },
  XR: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  US: { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" },
  NM: { bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA" },
}

export const IMAGING_CATALOG = [
  {
    study: "Chest X-Ray PA/Lateral",
    modality: "XR" as const,
    price: 450,
    room: "XR-1",
    indication:
      "Shortness of breath, cough, rule out consolidation or cardiomegaly.",
    technique: "Digital PA and lateral upright chest radiographs.",
    defaultFindings: [
      "Lungs: Clear bilaterally without focal consolidation, pleural effusion, or pneumothorax.",
      "Cardiovascular: Cardiac silhouette is normal in size (CTR < 0.50). Normal mediastinal contours.",
      "Bones & Soft Tissues: Intact bony thorax without acute fracture.",
    ],
    defaultImpression: [
      "1. No acute cardiopulmonary disease.",
      "2. Lungs are clear.",
    ],
  },
  {
    study: "CT Head w/o IV Contrast",
    modality: "CT" as const,
    price: 3500,
    room: "CT-1",
    indication:
      "Acute onset neurological deficit / severe acute headache. Rule out intracranial hemorrhage.",
    technique:
      "Non-contrast axial helical CT scan of the brain with 1.25mm thin reconstructions.",
    defaultFindings: [
      "Brain Parenchyma: No acute intra-axial or extra-axial hemorrhage. No territorial acute ischemic infarct.",
      "Ventricles & Cisterns: Symmetrical and normal in size for age. No midline shift or mass effect.",
      "Calvarium: Calvarium and skull base are intact without fracture.",
    ],
    defaultImpression: [
      "1. No acute intracranial hemorrhage or territorial vascular stroke.",
      "2. Correlate clinically. MRI with DWI recommended if symptoms persist.",
    ],
  },
  {
    study: "CT Abdomen & Pelvis with IV Contrast",
    modality: "CT" as const,
    price: 5500,
    room: "CT-2",
    indication:
      "Right lower quadrant abdominal pain, fever, suspected appendicitis.",
    technique:
      "Axial multidetector CT of abdomen and pelvis following 85mL IV Omnipaque 350 contrast.",
    defaultFindings: [
      "Appendix: Blind-ending tubular structure in the right lower quadrant measuring 8.5mm in diameter with mural hyperemia and periappendiceal fat stranding.",
      "Solid Organs: Liver, spleen, pancreas, adrenals, and kidneys are unremarkable without focal lesion.",
      "Peritoneum: Small volume reactive fluid in the right iliac fossa. No free intraperitoneal air.",
    ],
    defaultImpression: [
      "1. Findings highly consistent with acute uncomplicated appendicitis.",
      "2. No evidence of perforation, phlegmon, or abscess.",
    ],
  },
  {
    study: "MRI Brain with & without Contrast",
    modality: "MR" as const,
    price: 8500,
    room: "MR-1",
    indication: "Tension headache, vertigo, rule out space-occupying lesion.",
    technique:
      "Multiplanar 3.0T MRI including T1W, T2W, FLAIR, DWI/ADC, and Post-Contrast 3D T1 sequences.",
    defaultFindings: [
      "Parenchyma: Scattered punctate T2/FLAIR hyperintensities in subcortical white matter, typical for mild microvascular changes.",
      "Diffusion: No restricted diffusion to suggest acute infarction.",
      "Enhancement: No abnormal parenchymal or leptomeningeal enhancement.",
    ],
    defaultImpression: [
      "1. Mild chronic microvascular ischemic changes, normal for age. No acute stroke.",
      "2. No mass effect, midline shift, or abnormal contrast enhancement.",
    ],
  },
  {
    study: "MRI Lumbar Spine (L-Spine)",
    modality: "MR" as const,
    price: 7500,
    room: "MR-1",
    indication:
      "Lower back pain radiating down right lower extremity (Sciatica).",
    technique:
      "Sagittal and axial T1, T2, and STIR MR sequences of the lumbar spine.",
    defaultFindings: [
      "L4-L5: Right paracentral disc herniation/protrusion causing moderate right lateral recess stenosis and impingement on the descending right L5 nerve root.",
      "L5-S1: Mild diffuse disc bulge without significant neural foraminal narrowing.",
      "Conus Medullaris: Terminates normally at L1 level without abnormal signal.",
    ],
    defaultImpression: [
      "1. L4-L5 right paracentral disc protrusion compromising right L5 nerve root.",
      "2. Mild lower lumbar spondylosis.",
    ],
  },
  {
    study: "Ultrasound Whole Abdomen & Pelvis",
    modality: "US" as const,
    price: 1400,
    room: "US-1",
    indication:
      "Epigastric and right upper quadrant colic pain. Rule out cholelithiasis.",
    technique:
      "Real-time grayscale and color Doppler sonography of the abdomen and pelvis.",
    defaultFindings: [
      "Gallbladder: Well-distended with multiple mobile acoustic shadowing calculi, largest 11mm. Wall thickness is normal (2.1mm). Murphy sign is negative.",
      "Liver: Normal size and echotexture without focal parenchymal lesions.",
      "Biliary Tree: Common bile duct is normal in caliber (3.8mm) without stone.",
    ],
    defaultImpression: [
      "1. Cholelithiasis (multiple mobile gallstones) without acute cholecystitis.",
      "2. Otherwise unremarkable whole abdomen sonogram.",
    ],
  },
  {
    study: "Transthoracic 2D Echocardiogram (Echo)",
    modality: "US" as const,
    price: 2200,
    room: "Echo-1",
    indication:
      "Hypertension, evaluate left ventricular ejection fraction and wall motion.",
    technique:
      "Complete 2D, M-Mode, and Color / Continuous-Wave Doppler echocardiography.",
    defaultFindings: [
      "Left Ventricle: Normal cavity dimensions. Preserved systolic function. LVEF estimated at 60-65%.",
      "Valves: Structurally normal. Trace mitral regurgitation. No aortic stenosis.",
      "Pericardium: No pericardial effusion.",
    ],
    defaultImpression: [
      "1. Normal left ventricular systolic function (LVEF 60-65%).",
      "2. No regional wall motion abnormality. No significant valvulopathy.",
    ],
  },
  {
    study: "X-Ray Right Hip AP & Frog-Leg Lateral",
    modality: "XR" as const,
    price: 550,
    room: "XR-1",
    indication:
      "Fall from standing height, right groin pain, inability to bear weight.",
    technique:
      "Digital AP and frog-leg lateral radiographs of the right hip and pelvis.",
    defaultFindings: [
      "Femoral Neck: Non-displaced subcapital fracture of the right femoral neck with cortical disruption.",
      "Acetabulum: Intact without dislocation.",
      "Joint Space: Well-preserved articular cartilage space.",
    ],
    defaultImpression: [
      "1. Acute subcapital right femoral neck fracture.",
      "2. Urgent orthopedic surgery consultation recommended for internal fixation / arthroplasty.",
    ],
  },
]

export default function Radiology({ technician = "Radiology Specialist" }: {
  technician?: string
} = {}) {
  const [activeQueue, setActiveQueue] = useState(0)
  const [selectedModality, setSelectedModality] = useState("ALL")
  const [priorityFilter, setPriorityFilter] =
    useState<"all" | "STAT" | "Routine" | "Elective">("all")
  const [studies, setStudies] = useState<RadiologyStudyRecord[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error" | "info"
  } | null>(null)

  // Modality Room Status State
  const [modalitySuites, setModalitySuites] = useState([
    {
      label: "CT Scanner 1 (64-Slice)",
      room: "CT-1",
      status: "In Use",
      color: "#DC2626",
    },
    {
      label: "CT Scanner 2 (128-Slice)",
      room: "CT-2",
      status: "Available",
      color: "#16A34A",
    },
    {
      label: "MRI Suite 1 (3.0T)",
      room: "MR-1",
      status: "In Use",
      color: "#DC2626",
    },
    {
      label: "Digital X-Ray 1",
      room: "XR-1",
      status: "Available",
      color: "#16A34A",
    },
    {
      label: "Digital X-Ray 2",
      room: "XR-2",
      status: "In Use",
      color: "#DC2626",
    },
    {
      label: "Ultrasound Suite 1",
      room: "US-1",
      status: "Available",
      color: "#16A34A",
    },
    {
      label: "Echo / Doppler Suite",
      room: "Echo-1",
      status: "Available",
      color: "#16A34A",
    },
  ])

  // Modals state
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [showPacsModal, setShowPacsModal] = useState(false)
  const [showReportEditorModal, setShowReportEditorModal] = useState(false)
  const [showPdfReportModal, setShowPdfReportModal] = useState(false)

  // PACS Viewer Simulator Controls State
  const [pacsSlice, setPacsSlice] = useState(1)
  const [pacsPreset, setPacsPreset] =
    useState<"bone" | "soft" | "lung" | "brain" | "angio">("soft")
  const [pacsZoom, setPacsZoom] = useState(1)
  const [pacsInvert, setPacsInvert] = useState(false)
  const [pacsBrightness, setPacsBrightness] = useState(100)
  const [pacsContrast, setPacsContrast] = useState(100)
  const [pacsRotation, setPacsRotation] = useState(0)
  const [pacsMeasureMode, setPacsMeasureMode] = useState(false)
  const [customUploadUrl, setCustomUploadUrl] = useState<string | null>(null)

  // Form states for modals
  const [newOrderForm, setNewOrderForm] = useState({
    patient: "",
    mrn: "",
    studyName: IMAGING_CATALOG[0].study,
    priority: "Routine" as "STAT" | "Routine" | "Elective",
    provider: "Dr. Vikram Seth (Emergency)",
    paymentStatus: "Paid" as "Paid" | "Payment Pending",
  })

  const [reportingForm, setReportingForm] = useState({
    indication: "",
    technique: "",
    findings: [] as string[],
    impression: [] as string[],
    comparison: "",
    radiologist: "Dr. Laura Kim, MD · Senior Consultant Radiologist",
    reportStatus: "Final" as "Draft" | "Final",
  })

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3800)
  }

  const refreshData = () => {
    const data = BillingDatabase.getRadiologyStudies()
    setStudies(data)
  }

  useEffect(() => {
    refreshData()
    const unsub = BillingDatabase.onUpdate(refreshData)
    return () => unsub()
  }, [])

  const registeredPatients = useMemo(() => {
    return db.getPatients()
  }, [])

  const statStudies = useMemo(() => {
    return studies.filter((s) => s.priority === "STAT" && s.status !== "Final")
  }, [studies])

  const filteredStudies = useMemo(() => {
    const queue = QUEUES[activeQueue]
    let list = studies

    if (queue.key === "paid")
      list = list.filter((s) => s.paymentStatus === "Paid")
    else if (queue.key === "unpaid")
      list = list.filter((s) => s.paymentStatus === "Payment Pending")
    else if (queue.key === "in_progress")
      list = list.filter((s) => s.status === "In Progress")
    else if (queue.key === "images_ready")
      list = list.filter((s) => s.status === "Images Ready")
    else if (queue.key === "final")
      list = list.filter((s) => s.status === "Final")

    if (selectedModality !== "ALL") {
      list = list.filter((s) => s.modality === selectedModality)
    }

    if (priorityFilter !== "all") {
      list = list.filter((s) => s.priority === priorityFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.patient.toLowerCase().includes(q) ||
          s.mrn.toLowerCase().includes(q) ||
          (s.umr && s.umr.toLowerCase().includes(q)) ||
          s.study.toLowerCase().includes(q) ||
          (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q)) ||
          (s.paidReceiptNo && s.paidReceiptNo.toLowerCase().includes(q)) ||
          (s.accessionNo && s.accessionNo.toLowerCase().includes(q)) ||
          s.provider.toLowerCase().includes(q) ||
          s.room.toLowerCase().includes(q) ||
          (s.department && s.department.toLowerCase().includes(q)) ||
          (s.indication && s.indication.toLowerCase().includes(q)) ||
          (s.orderedItems &&
            s.orderedItems.some((it) =>
              it.description.toLowerCase().includes(q),
            )),
      )
    }

    return list
  }, [studies, activeQueue, selectedModality, priorityFilter, searchQuery])

  const selectedStudy: RadiologyStudyRecord | undefined =
    filteredStudies[selectedIdx] || filteredStudies[0] || studies[0]

  const counts = useMemo(() => {
    return {
      all: studies.length,
      paid: studies.filter((s) => s.paymentStatus === "Paid").length,
      unpaid: studies.filter((s) => s.paymentStatus === "Payment Pending")
        .length,
      in_progress: studies.filter((s) => s.status === "In Progress").length,
      images_ready: studies.filter((s) => s.status === "Images Ready").length,
      stat: statStudies.length,
      final: studies.filter((s) => s.status === "Final").length,
    }
  }, [studies, statStudies])

  // Start Scan Protocol
  const handleStartScan = (study: RadiologyStudyRecord) => {
    if (study.paymentStatus !== "Paid") {
      showToast(
        `⚠ Cannot start scan for ${study.patient}! Payment of ₹${study.price} is pending at Central Billing.`,
        "error",
      )
      return
    }
    try {
      BillingDatabase.updateRadiologyStudy(study.id, {
        status: "In Progress",
      })
      // Update room status
      setModalitySuites((prev) =>
        prev.map((m) =>
          m.room === study.room
            ? { ...m, status: "In Use", color: "#DC2626" }
            : m,
        ),
      )
      showToast(
        `⚡ Imaging scan initiated for ${study.patient} in Suite ${study.room}`,
        "info",
      )
      refreshData()
    } catch {
      showToast("Failed to update scan status", "error")
    }
  }

  // Complete Scan & Mark Images Ready
  const handleCompleteScan = (study: RadiologyStudyRecord) => {
    try {
      BillingDatabase.updateRadiologyStudy(study.id, {
        status: "Images Ready",
      })
      showToast(
        `✓ Diagnostic DICOM images acquired & uploaded to PACS: ${study.patient}`,
        "success",
      )
      refreshData()
    } catch {
      showToast("Failed to update study status", "error")
    }
  }

  // Open Reporting Editor
  const openReportingEditor = (study: RadiologyStudyRecord) => {
    const catItem =
      IMAGING_CATALOG.find((c) => c.study === study.study) || IMAGING_CATALOG[0]
    setReportingForm({
      indication: study.indication || catItem.indication,
      technique: study.technique || catItem.technique,
      findings:
        study.findings && study.findings.length > 0
          ? study.findings
          : catItem.defaultFindings,
      impression:
        study.impression && study.impression.length > 0
          ? study.impression
          : catItem.defaultImpression,
      comparison:
        study.comparison ||
        "No prior studies available for interval comparison.",
      radiologist:
        study.radiologist ||
        "Dr. Laura Kim, MD · Senior Consultant Radiologist",
      reportStatus: study.reportStatus as any || "Final",
    })
    setShowReportEditorModal(true)
  }

  // Save / Finalize Report
  const handleSaveReport = (status: "Draft" | "Final") => {
    if (!selectedStudy) return
    try {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      BillingDatabase.updateRadiologyStudy(selectedStudy.id, {
        indication: reportingForm.indication,
        technique: reportingForm.technique,
        findings: reportingForm.findings,
        impression: reportingForm.impression,
        comparison: reportingForm.comparison,
        radiologist: reportingForm.radiologist,
        reportStatus: status,
        signedAt: status === "Final" ? now : undefined,
        status: status === "Final" ? "Final" : "Reporting",
      })
      setShowReportEditorModal(false)
      showToast(
        status === "Final"
          ? `✓ Diagnostic radiology report signed out & finalized by ${reportingForm.radiologist}`
          : "✓ Draft radiology report saved successfully",
        "success",
      )
      refreshData()
    } catch {
      showToast("Failed to save report", "error")
    }
  }

  // Create New Imaging Order
  const handleCreateNewOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrderForm.patient.trim()) {
      showToast("Please enter or select a patient name", "error")
      return
    }

    const catItem =
      IMAGING_CATALOG.find((c) => c.study === newOrderForm.studyName) ||
      IMAGING_CATALOG[0]
    const isPaid = newOrderForm.paymentStatus === "Paid"
    const receiptNo = isPaid
      ? `RCPT-2026-${Math.floor(5500 + Math.random() * 4000)}`
      : undefined

    const newStudy = BillingDatabase.createRadiologyStudy({
      patient: newOrderForm.patient,
      mrn: newOrderForm.mrn || `100${Math.floor(100 + Math.random() * 900)}`,
      study: newOrderForm.studyName,
      modality: catItem.modality,
      priority: newOrderForm.priority,
      ordered: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      provider: newOrderForm.provider,
      status: "Orders",
      room: catItem.room,
      price: catItem.price,
      paymentStatus: newOrderForm.paymentStatus,
      paidReceiptNo: receiptNo,
      paidAt: isPaid ? new Date().toISOString() : undefined,
      indication: catItem.indication,
      technique: catItem.technique,
      findings: catItem.defaultFindings,
      impression: catItem.defaultImpression,
    })

    setShowNewOrderModal(false)
    showToast(
      `✓ New radiology study created: ${newStudy.id} (${newStudy.study})`,
      "success",
    )
    refreshData()
  }

  // Export CSV Worklist
  const handleExportCSV = () => {
    if (filteredStudies.length === 0) {
      showToast("No studies to export", "info")
      return
    }
    const headers = [
      "Study ID",
      "Invoice No",
      "Accession No",
      "Patient",
      "MRN",
      "Modality",
      "Study Description",
      "Priority",
      "Room / Suite",
      "Payment Status",
      "Radiology Status",
      "Provider",
      "Price (INR)",
    ]
    const rows = filteredStudies.map((s) => [
      s.id,
      s.invoiceNo || "—",
      s.accessionNo || "—",
      `"${s.patient}"`,
      s.mrn,
      s.modality,
      `"${s.study}"`,
      s.priority,
      s.room,
      s.paymentStatus,
      s.status,
      `"${s.provider}"`,
      s.price,
    ])
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `Hospital_Radiology_Worklist_${new Date().toISOString().split("T")[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast("✓ Radiology worklist exported to CSV", "success")
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5] text-slate-900 flex flex-col min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold border animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-700"
              : toast.type === "error"
                ? "bg-rose-900 text-rose-100 border-rose-700"
                : "bg-teal-900 text-teal-100 border-teal-700"
          }`}
        >
          <span>
            {toast.type === "success"
              ? "✓"
              : toast.type === "error"
                ? "⚠"
                : "ℹ"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Header Toolbar */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold text-gray-900 tracking-tight">
              Diagnostic Radiology &amp; Medical Imaging Suite
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold">
              ● Central Billing Connected · AERB &amp; NABH Compliant
            </span>
          </div>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Synced with Central Billing Desk &amp; Patient Records · Operator:{" "}
            <strong>{technician}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <span>📥</span> Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedStudy) {
                setShowPacsModal(true)
              } else {
                showToast("Please select a study first", "info")
              }
            }}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <span>🩻</span> PACS Viewer
          </button>
          <button
            type="button"
            onClick={() => setShowNewOrderModal(true)}
            className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>+</span> Manual Entry / New Study
          </button>
        </div>
      </div>

      {/* 2. STAT Emergency Studies Notification Bar */}
      {statStudies.length > 0 && (
        <div className="bg-[#FEF2F2] border-b border-[#FECACA] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#B91C1C] font-semibold">
            <span className="text-base animate-pulse">🚨</span>
            <span>
              <strong>
                {statStudies.length} STAT Emergency Imaging Study / Studies
              </strong>{" "}
              active requiring immediate table priority!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const s = statStudies[0]
                if (s) {
                  const idx = filteredStudies.findIndex((st) => st.id === s.id)
                  if (idx >= 0) setSelectedIdx(idx)
                  if (
                    s.paymentStatus === "Paid" &&
                    (s.status === "Orders" || s.status === "Scheduled")
                  ) {
                    handleStartScan(s)
                  } else {
                    showToast(
                      `STAT Order: ${s.patient} · Suite ${s.room}`,
                      "info",
                    )
                  }
                }
              }}
              className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-[11px] cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
            >
              <span>⚡</span> Expedite STAT Patient
            </button>
          </div>
        </div>
      )}

      {/* 3. Universal Search and Quick Filters Bar */}
      <div className="bg-slate-50 border-b border-[#DDE2EC] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Search patient name, MRN, UMR, Invoice No (e.g. INV-801), study name, suite, or doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium shadow-2xs"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span>Modality:</span>
            <select
              value={selectedModality}
              onChange={(e) => setSelectedModality(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {MODALITIES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Priorities</option>
              <option value="STAT">⚡ STAT Priority</option>
              <option value="Routine">Routine</option>
              <option value="Elective">Elective</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono font-bold">
          <span className="text-emerald-700 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>✓{" "}
            {counts.paid} Cleared &amp; Active
          </span>
          <span className="text-amber-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>⏳{" "}
            {counts.unpaid} Payment Pending
          </span>
        </div>
      </div>

      {/* Modality Scanner Suites Live Status Bar */}
      <div className="bg-slate-950 text-white px-4 py-2.5 flex items-center gap-3 overflow-x-auto border-b border-slate-800 text-xs shadow-inner min-h-[48px]">
        <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase tracking-wider text-[11px] shrink-0 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-800/80 shadow-xs">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.9)]"></span>
          <span>Scanner Suites:</span>
        </div>
        <div className="flex items-center gap-2 flex-nowrap shrink-0">
          {modalitySuites.map((m, i) => {
            const isAvailable = m.status === "Available"
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setModalitySuites((prev) =>
                    prev.map((suite, idx) =>
                      idx === i
                        ? {
                            ...suite,
                            status:
                              suite.status === "Available"
                                ? "In Use"
                                : "Available",
                            color:
                              suite.status === "Available"
                                ? "#EF4444"
                                : "#10B981",
                          }
                        : suite,
                    ),
                  )
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all select-none cursor-pointer whitespace-nowrap shadow-xs ${
                  isAvailable
                    ? "bg-slate-900 border-emerald-500/50 text-slate-100 hover:bg-slate-800 hover:border-emerald-400"
                    : "bg-slate-900 border-rose-500/50 text-slate-100 hover:bg-slate-800 hover:border-rose-400"
                }`}
                title="Click to toggle suite availability"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isAvailable
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)]"
                      : "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.95)]"
                  }`}
                />
                <span className="text-white font-semibold tracking-wide">
                  {m.label}{" "}
                  <span className="text-slate-300 font-mono text-[11.5px]">
                    ({m.room})
                  </span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10.5px] font-extrabold uppercase tracking-wider ${
                    isAvailable
                      ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/60"
                      : "bg-rose-500/30 text-rose-300 border border-rose-500/60"
                  }`}
                >
                  {m.status}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. Queue Tabs */}
      <div className="bg-white border-b border-[#DDE2EC] flex overflow-x-auto shadow-2xs">
        {QUEUES.map((q, i) => {
          const count =
            q.key === "all"
              ? counts.all
              : q.key === "paid"
                ? counts.paid
                : q.key === "unpaid"
                  ? counts.unpaid
                  : q.key === "in_progress"
                    ? counts.in_progress
                    : q.key === "images_ready"
                      ? counts.images_ready
                      : counts.final

          return (
            <QueueTab
              key={i}
              label={q.label}
              count={count}
              active={activeQueue === i}
              onClick={() => {
                setActiveQueue(i)
                setSelectedIdx(0)
              }}
            />
          )
        })}
      </div>

      {/* 5. Main Workbench Split */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 items-start">
        {/* Left: Worklist (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title={`Radiology Worklist (${filteredStudies.length} Patient${
              filteredStudies.length === 1 ? "" : "s"
            } / Studies)`}
            actions={
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  Synced with Central Billing &amp; PACS
                </span>
              </div>
            }
          >
            <Table
              headers={[
                "Patient / MRN",
                "Study Ordered by Billing / Doctor",
                "Financial Clearance",
                "Modality & Suite",
                "Imaging Status",
                "Prescribing MD",
                "Bench Actions",
              ]}
            >
              {filteredStudies.length === 0 ? (
                <TR>
                  <TD colSpan={7}>
                    <div className="p-10 text-center text-slate-400 space-y-2">
                      <div className="text-2xl">🩻</div>
                      <div className="text-xs font-semibold">
                        No imaging studies match this search or queue filter.
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNewOrderModal(true)}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                      >
                        + Create New Imaging Order
                      </button>
                    </div>
                  </TD>
                </TR>
              ) : (
                filteredStudies.map((s, i) => {
                  const isPaid = s.paymentStatus === "Paid"
                  const isSelected = selectedStudy?.id === s.id
                  const isStat = s.priority === "STAT"
                  const mc = MODALITY_COLORS[s.modality] || {
                    bg: "#F1F5F9",
                    text: "#374151",
                    border: "#E2E8F0",
                  }

                  return (
                    <TR
                      key={s.id || i}
                      onClick={() => setSelectedIdx(i)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "bg-teal-50/80 border-l-4 border-l-teal-600"
                          : isStat
                            ? "bg-rose-50/30 hover:bg-rose-50/60"
                            : "hover:bg-slate-50"
                      }`}
                    >
                      <TD>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{s.patient}</span>
                            {isStat && (
                              <span
                                className="text-rose-600 text-xs"
                                title="STAT Emergency Study"
                              >
                                ⚡
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                            <span>MRN: {s.mrn}</span>
                            {s.invoiceNo && (
                              <>
                                <span>·</span>
                                <span className="text-teal-700 font-bold">
                                  {s.invoiceNo}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </TD>

                      <TD>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                              style={{
                                backgroundColor: mc.bg,
                                color: mc.text,
                              }}
                            >
                              {s.modality}
                            </span>
                            <span>{s.study}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                s.priority === "STAT"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {s.priority}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              ₹{s.price}
                            </span>
                          </div>
                        </div>
                      </TD>

                      <TD>
                        {isPaid ? (
                          <div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10.5px] flex items-center gap-1 w-fit shadow-2xs">
                              <span>✓</span> Cleared
                            </span>
                            <div className="text-[9.5px] font-mono text-emerald-700 mt-0.5">
                              {s.paidReceiptNo || "RCPT-2026-5501"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10.5px] flex items-center gap-1 w-fit border border-amber-300 shadow-2xs">
                              <span>🔒</span> Unpaid
                            </span>
                            <div className="text-[9.5px] text-amber-800 font-semibold mt-0.5">
                              ₹{s.price} Due
                            </div>
                          </div>
                        )}
                      </TD>

                      <TD>
                        <div>
                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                            <span>{s.room}</span>
                            <span className="text-[10.5px] text-slate-500 font-normal">
                              ({s.modality})
                            </span>
                          </div>
                          <div className="text-[10.5px] font-mono text-slate-500">
                            {s.accessionNo || "RAD-ACC-8801"}
                          </div>
                        </div>
                      </TD>

                      <TD>
                        <StatusBadge status={s.status} />
                      </TD>

                      <TD>
                        <span className="text-[#64748B] text-[11.5px]">
                          {s.provider}
                        </span>
                      </TD>

                      <TD>
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isPaid ? (
                            s.status === "Orders" ||
                            s.status === "Scheduled" ? (
                              <button
                                type="button"
                                onClick={() => handleStartScan(s)}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
                              >
                                ⚡ Start Scan
                              </button>
                            ) : s.status === "In Progress" ? (
                              <button
                                type="button"
                                onClick={() => handleCompleteScan(s)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
                              >
                                ✓ Ingest PACS
                              </button>
                            ) : s.status === "Images Ready" ||
                              s.status === "Reporting" ? (
                              <button
                                type="button"
                                onClick={() => openReportingEditor(s)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
                              >
                                📝 Dictate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowPdfReportModal(true)}
                                className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 font-bold rounded text-[11px] cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
                              >
                                📄 Report
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                showToast(
                                  `🔒 Action locked: ${s.patient} must settle ₹${s.price} at Central Billing Counter first!`,
                                  "error",
                                )
                              }
                              className="px-2 py-1 bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-800 font-bold rounded text-[10.5px] cursor-not-allowed border border-dashed border-slate-300"
                            >
                              🔒 Locked
                            </button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  )
                })
              )}
            </Table>
          </Card>
        </div>

        {/* Right: Selected Study Report & Action Panel (1 col) */}
        <div className="space-y-4">
          {selectedStudy ? (
            <>
              {/* Study Header & Scanner Suite Card */}
              <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor:
                            MODALITY_COLORS[selectedStudy.modality]?.bg,
                          color: MODALITY_COLORS[selectedStudy.modality]?.text,
                        }}
                      >
                        {selectedStudy.modality}
                      </span>
                      <span className="font-extrabold text-sm text-gray-900">
                        {selectedStudy.study}
                      </span>
                      <StatusBadge status={selectedStudy.status} />
                    </div>
                    {(() => {
                      const pat = registeredPatients.find(
                        (p) =>
                          (selectedStudy.umr && p.umr === selectedStudy.umr) ||
                          p.name.toLowerCase() ===
                            selectedStudy.patient.toLowerCase() ||
                          p.umr.replace(/\D/g, "") === selectedStudy.mrn,
                      )
                      return (
                        <div className="text-xs text-[#64748B] font-semibold space-y-0.5">
                          <div>
                            Patient:{" "}
                            <strong className="text-slate-900">
                              {selectedStudy.patient}
                            </strong>{" "}
                            (MRN: {selectedStudy.mrn}
                            {selectedStudy.umr
                              ? ` · UMR: ${selectedStudy.umr}`
                              : pat
                                ? ` · UMR: ${pat.umr}`
                                : ""}
                            ){pat && ` · ${pat.age}y ${pat.sex}`}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Accession:{" "}
                            <strong>
                              {selectedStudy.accessionNo || "RAD-ACC-8801"}
                            </strong>
                            {pat?.phone && ` · Contact: ${pat.phone}`}
                          </div>
                        </div>
                      )
                    })()}
                    <div className="text-[11.5px] text-[#64748B] mt-1">
                      Ordered by: <strong>{selectedStudy.provider}</strong> ·
                      Scanner Suite: <strong>{selectedStudy.room}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    {selectedStudy.paymentStatus === "Paid" ? (
                      <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        ✓ Paid (₹{selectedStudy.price})
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 text-[11px] font-bold">
                        🔒 Due ₹{selectedStudy.price}
                      </span>
                    )}
                  </div>
                </div>

                {/* Billing Dept Clearance & Exact Advised Imaging Studies Card */}
                <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-teal-950 text-[11.5px] uppercase tracking-wider flex items-center gap-1.5">
                      <span>💳</span> Billing Dept Clearance &amp; Orders Sent
                    </span>
                    <span className="font-mono text-[11px] font-bold text-teal-800">
                      {selectedStudy.invoiceNo
                        ? `Invoice: ${selectedStudy.invoiceNo}`
                        : "Central Billing"}
                    </span>
                  </div>

                  <div className="text-[11.5px] text-slate-700 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Department Source:</span>
                      <strong className="text-slate-900">
                        {selectedStudy.department ||
                          "Outpatient / ER / Inpatient"}
                      </strong>
                    </div>
                    {selectedStudy.indication && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Clinical Indication:
                        </span>
                        <span className="font-semibold text-slate-900 text-right max-w-[280px]">
                          {selectedStudy.indication}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Clearance:</span>
                      <strong
                        className={
                          selectedStudy.paymentStatus === "Paid"
                            ? "text-emerald-700"
                            : "text-amber-800"
                        }
                      >
                        {selectedStudy.paymentStatus === "Paid"
                          ? `✓ Cleared at Cashier (${selectedStudy.paidReceiptNo || "RCPT-2026-5501"})`
                          : `🔒 Unsettled · ₹${selectedStudy.price} Due`}
                      </strong>
                    </div>
                  </div>

                  {/* List of exact ordered imaging studies sent by billing */}
                  <div className="pt-2 border-t border-teal-200/80">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-teal-950 block mb-1.5">
                      Advised Imaging Study / Studies from Billing / Doctor:
                    </span>
                    <div className="space-y-1">
                      {selectedStudy.orderedItems &&
                      selectedStudy.orderedItems.length > 0 ? (
                        selectedStudy.orderedItems.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-white rounded-lg border border-teal-100 text-[11.5px]"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="text-teal-600 font-bold">▪</span>{" "}
                              {it.description}
                              {it.cptCode && (
                                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                  ({it.cptCode})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-slate-700 font-semibold">
                              ₹{it.price * (it.quantity || 1)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 bg-white rounded-lg border border-teal-100 text-[11.5px] font-bold text-slate-800 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="text-teal-600 font-bold">▪</span>{" "}
                            {selectedStudy.study}
                          </span>
                          <span className="font-mono text-slate-700 font-semibold">
                            ₹{selectedStudy.price}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Accession No:</span>
                    <strong className="font-mono text-slate-800">
                      {selectedStudy.accessionNo || "RAD-ACC-8801"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scanner Suite:</span>
                    <span className="text-slate-800 font-medium">
                      {selectedStudy.room} ({selectedStudy.modality})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Imaging Technique:</span>
                    <span className="text-slate-800 font-medium truncate max-w-[200px]">
                      {selectedStudy.technique || "Standard Protocol"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prescribing MD:</span>
                    <span className="text-slate-800 font-medium">
                      {selectedStudy.provider}
                    </span>
                  </div>
                </div>

                {/* Status-specific Workflow Actions */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {selectedStudy.paymentStatus === "Paid" ? (
                      selectedStudy.status === "Orders" ||
                      selectedStudy.status === "Scheduled" ? (
                        <button
                          type="button"
                          onClick={() => handleStartScan(selectedStudy)}
                          className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <span>⚡</span> Position &amp; Start Scan
                        </button>
                      ) : selectedStudy.status === "In Progress" ? (
                        <button
                          type="button"
                          onClick={() => handleCompleteScan(selectedStudy)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
                        >
                          <span>✓</span> Complete &amp; Upload PACS
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <span>✓</span> Ingested in PACS
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-rose-700 font-bold">
                        🔒 Scan locked pending Central Billing payment
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPacsModal(true)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
                    >
                      <span>🩻</span> PACS
                    </button>
                    <button
                      type="button"
                      onClick={() => openReportingEditor(selectedStudy)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
                    >
                      <span>📝</span> Dictate
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPdfReportModal(true)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
                    >
                      <span>📄</span> PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* PACS Interactive Preview Widget */}
              <div
                onClick={() => setShowPacsModal(true)}
                className="bg-[#0A101D] rounded-xl border border-[#1E2D42] p-4 text-slate-200 cursor-pointer hover:border-teal-500 transition-all shadow-md group relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold font-mono text-teal-400">
                      PACS DICOM SERVER · {selectedStudy.study}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 group-hover:text-teal-300 transition-colors">
                    Click to launch PACS viewer ↗
                  </span>
                </div>

                <div className="h-44 bg-black rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden">
                  <div className="text-center space-y-1">
                    <div className="text-4xl text-teal-400">
                      {selectedStudy.modality === "XR"
                        ? "🫁"
                        : selectedStudy.modality === "CT"
                          ? "🧠"
                          : selectedStudy.modality === "MR"
                            ? "🦴"
                            : "🩺"}
                    </div>
                    <div className="text-xs font-bold text-slate-200">
                      {selectedStudy.study}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {selectedStudy.modality} · Matrix 2048x2048 · Slice 1/8 ·
                      Suite: {selectedStudy.room}
                    </div>
                  </div>

                  <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400">
                    <div>{selectedStudy.patient}</div>
                    <div>MRN: {selectedStudy.mrn}</div>
                  </div>

                  <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-400">
                    <div>W: 400 L: 40</div>
                    <div>FOV: 350mm</div>
                  </div>
                </div>
              </div>

              {/* Diagnostic Report Overview Card */}
              <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-3 border-b border-[#DDE2EC] bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Diagnostic Impression &amp; Findings
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      {selectedStudy.reportStatus || "Draft"}
                    </span>
                    <button
                      type="button"
                      onClick={() => openReportingEditor(selectedStudy)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      ✏ Edit Findings
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900 mb-1">
                      Clinical Indication:
                    </h5>
                    <p className="text-slate-700 text-[11.5px] italic">
                      "
                      {selectedStudy.indication ||
                        "Shortness of breath, clinical imaging requested."}
                      "
                    </p>
                  </div>

                  <div>
                    <h5 className="font-bold text-slate-900 mb-1">Findings:</h5>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11.5px]">
                      {(selectedStudy.findings &&
                      selectedStudy.findings.length > 0
                        ? selectedStudy.findings
                        : IMAGING_CATALOG[0].defaultFindings
                      ).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <h5 className="font-bold text-slate-900 mb-1">
                      Impression:
                    </h5>
                    <div className="p-2.5 bg-slate-50 rounded-lg text-slate-800 font-semibold text-[11.5px] border border-slate-200 space-y-0.5">
                      {(selectedStudy.impression &&
                      selectedStudy.impression.length > 0
                        ? selectedStudy.impression
                        : IMAGING_CATALOG[0].defaultImpression
                      ).map((imp, i) => (
                        <div key={i}>{imp}</div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                    <span>
                      Radiologist:{" "}
                      <strong>
                        {selectedStudy.radiologist || "Dr. Laura Kim, MD"}
                      </strong>
                    </span>
                    <span>
                      Status: <strong>{selectedStudy.status}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs font-semibold">
              Select an imaging study from the left queue to review diagnostic
              images and clearance status.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW IMAGING ORDER                                         */}
      {/* ========================================================================= */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩻</span>
                <h3 className="font-bold text-sm">
                  Create New Diagnostic Radiology Study
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewOrderModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateNewOrder}
              className="p-6 space-y-4 text-xs"
            >
              {/* Patient Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Select Patient *
                </label>
                <div className="space-y-2">
                  <select
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                    onChange={(e) => {
                      const found = registeredPatients.find(
                        (p) =>
                          p.umr === e.target.value || p.name === e.target.value,
                      )
                      if (found) {
                        setNewOrderForm((prev) => ({
                          ...prev,
                          patient: found.name,
                          mrn: found.umr.replace(/\D/g, "") || found.umr,
                        }))
                      }
                    }}
                  >
                    <option value="">
                      -- Choose from Registered Patients or Type Below --
                    </option>
                    {registeredPatients.map((p) => (
                      <option key={p.umr} value={p.umr}>
                        {p.name} (UMR: {p.umr} · {p.age}y {p.sex})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Patient Full Name"
                      value={newOrderForm.patient}
                      onChange={(e) =>
                        setNewOrderForm((prev) => ({
                          ...prev,
                          patient: e.target.value,
                        }))
                      }
                      required
                      className="bg-white border border-slate-300 rounded-lg p-2 font-medium"
                    />
                    <input
                      type="text"
                      placeholder="MRN (e.g. 100245)"
                      value={newOrderForm.mrn}
                      onChange={(e) =>
                        setNewOrderForm((prev) => ({
                          ...prev,
                          mrn: e.target.value,
                        }))
                      }
                      className="bg-white border border-slate-300 rounded-lg p-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Study Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Imaging Study Catalog *
                </label>
                <select
                  value={newOrderForm.studyName}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({
                      ...prev,
                      studyName: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800"
                >
                  {IMAGING_CATALOG.map((c) => (
                    <option key={c.study} value={c.study}>
                      [{c.modality}] {c.study} — ₹{c.price} (Room: {c.room})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Priority */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Priority
                  </label>
                  <select
                    value={newOrderForm.priority}
                    onChange={(e) =>
                      setNewOrderForm((prev) => ({
                        ...prev,
                        priority: e.target.value as any,
                      }))
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="Routine">Routine</option>
                    <option value="STAT">
                      ⚡ STAT (Emergency / Immediate)
                    </option>
                    <option value="Elective">Elective / Scheduled</option>
                  </select>
                </div>

                {/* Financial Clearance */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Financial Clearance
                  </label>
                  <select
                    value={newOrderForm.paymentStatus}
                    onChange={(e) =>
                      setNewOrderForm((prev) => ({
                        ...prev,
                        paymentStatus: e.target.value as any,
                      }))
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                  >
                    <option value="Paid">✓ Verified Pre-Paid</option>
                    <option value="Payment Pending">
                      🔒 Payment Pending at Billing
                    </option>
                  </select>
                </div>
              </div>

              {/* Ordering Physician */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Ordering Physician
                </label>
                <input
                  type="text"
                  value={newOrderForm.provider}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({
                      ...prev,
                      provider: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold cursor-pointer shadow-xs transition-colors"
                >
                  Save &amp; Generate Study Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INTERACTIVE PACS DICOM VIEWER SIMULATOR                          */}
      {/* ========================================================================= */}
      {showPacsModal && selectedStudy && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4">
          {/* Top Bar */}
          <div className="bg-[#0F172A] text-white px-6 py-3 rounded-t-2xl border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl text-blue-400">🩻</span>
              <div>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>PACS VIEWER · {selectedStudy.study}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-900 text-blue-200 text-[10.5px]">
                    {selectedStudy.modality}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {selectedStudy.patient} · MRN: {selectedStudy.mrn} ·
                  Accession: {selectedStudy.accessionNo || "RAD-ACC-8801"}
                </div>
              </div>
            </div>

            {/* Quick Toolbar */}
            <div className="flex items-center gap-3 text-xs font-bold">
              {/* Presets */}
              <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                {(["soft", "bone", "lung", "brain", "angio"] as const).map(
                  (preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setPacsPreset(preset)
                        if (preset === "bone") {
                          setPacsBrightness(120)
                          setPacsContrast(160)
                        } else if (preset === "lung") {
                          setPacsBrightness(130)
                          setPacsContrast(110)
                        } else if (preset === "brain") {
                          setPacsBrightness(95)
                          setPacsContrast(140)
                        } else {
                          setPacsBrightness(100)
                          setPacsContrast(100)
                        }
                      }}
                      className={`px-2 py-1 rounded text-[11px] uppercase transition-colors ${
                        pacsPreset === preset
                          ? "bg-blue-600 text-white"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {preset}
                    </button>
                  ),
                )}
              </div>

              {/* Invert */}
              <button
                type="button"
                onClick={() => setPacsInvert((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                  pacsInvert
                    ? "bg-amber-600 border-amber-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                }`}
              >
                ☯ Invert
              </button>

              {/* Measure Caliper Mode */}
              <button
                type="button"
                onClick={() => setPacsMeasureMode((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                  pacsMeasureMode
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                }`}
              >
                📏 Caliper (14.2 mm)
              </button>

              {/* Rotate */}
              <button
                type="button"
                onClick={() => setPacsRotation((r) => (r + 90) % 360)}
                className="px-2.5 py-1.5 rounded-lg border bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                ↻ 90°
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={() => {
                  setPacsZoom(1)
                  setPacsBrightness(100)
                  setPacsContrast(100)
                  setPacsRotation(0)
                  setPacsInvert(false)
                  setPacsMeasureMode(false)
                }}
                className="px-2.5 py-1.5 rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => setShowPacsModal(false)}
                className="text-white hover:text-rose-400 text-xl font-bold ml-3"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Main PACS Canvas Body */}
          <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden select-none">
            {/* Multi-slice navigation sidebar (Left) */}
            <div className="absolute left-4 top-4 bottom-4 w-28 bg-[#0F172A]/80 backdrop-blur-md rounded-xl border border-slate-800 p-2 space-y-2 overflow-y-auto z-10">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-1">
                Slices (1-8)
              </div>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <div
                  key={s}
                  onClick={() => setPacsSlice(s)}
                  className={`p-2 rounded-lg border cursor-pointer text-center font-mono text-xs transition-colors ${
                    pacsSlice === s
                      ? "bg-blue-600 border-blue-400 text-white font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <div className="text-lg">🩻</div>
                  <div className="text-[10px]">Slice {s}/8</div>
                </div>
              ))}
            </div>

            {/* Canvas Rendering / Interactive Display */}
            <div
              style={{
                transform: `scale(${pacsZoom}) rotate(${pacsRotation}deg)`,
                filter: `brightness(${pacsBrightness}%) contrast(${pacsContrast}%) ${
                  pacsInvert ? "invert(1)" : ""
                }`,
                transition: "transform 0.15s ease-out",
              }}
              className="w-[580px] h-[580px] bg-[#020617] rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-center relative overflow-hidden"
            >
              {customUploadUrl ? (
                <img
                  src={customUploadUrl}
                  alt="PACS Scan"
                  className="w-full h-full object-contain"
                />
              ) : selectedStudy.modality === "XR" ? (
                /* Chest / Skeletal X-Ray Simulation Graphic */
                <svg
                  viewBox="0 0 400 400"
                  className="w-full h-full p-6 text-slate-300"
                >
                  <rect width="400" height="400" fill="#030712" />
                  {/* Spine */}
                  <line
                    x1="200"
                    y1="40"
                    x2="200"
                    y2="360"
                    stroke="#64748B"
                    strokeWidth="8"
                    strokeDasharray="12 4"
                  />
                  {/* Clavicles */}
                  <path
                    d="M 80,90 Q 200,100 200,90 Q 200,100 320,90"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="7"
                  />
                  {/* Ribs (Left & Right) */}
                  {[120, 150, 180, 210, 240, 270, 300].map((y, i) => (
                    <g key={i}>
                      <path
                        d={`M 195,${y - 10} Q 100,${y} 80,${y + 20}`}
                        fill="none"
                        stroke="#475569"
                        strokeWidth="5"
                      />
                      <path
                        d={`M 205,${y - 10} Q 300,${y} 320,${y + 20}`}
                        fill="none"
                        stroke="#475569"
                        strokeWidth="5"
                      />
                    </g>
                  ))}
                  {/* Cardiac Silhouette */}
                  <path
                    d="M 170,180 C 140,220 160,280 230,280 C 260,280 240,220 200,180 Z"
                    fill="#334155"
                    opacity="0.85"
                  />
                  {/* Diaphragms */}
                  <path
                    d="M 60,330 Q 130,290 190,320"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="6"
                  />
                  <path
                    d="M 210,320 Q 270,290 340,330"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="6"
                  />
                </svg>
              ) : selectedStudy.modality === "CT" ? (
                /* CT Head / Brain Scan Graphic */
                <svg
                  viewBox="0 0 400 400"
                  className="w-full h-full p-6 text-slate-300"
                >
                  <rect width="400" height="400" fill="#030712" />
                  {/* Skull Calvarium */}
                  <ellipse
                    cx="200"
                    cy="200"
                    rx="140"
                    ry="165"
                    fill="#1E293B"
                    stroke="#E2E8F0"
                    strokeWidth="12"
                  />
                  {/* Brain Parenchyma */}
                  <ellipse
                    cx="200"
                    cy="200"
                    rx="128"
                    ry="153"
                    fill="#334155"
                    opacity="0.9"
                  />
                  {/* Ventricles (Frontal Horns & Body) */}
                  <path
                    d="M 185,160 Q 170,200 185,230 Q 195,200 185,160 Z"
                    fill="#0F172A"
                  />
                  <path
                    d="M 215,160 Q 230,200 215,230 Q 205,200 215,160 Z"
                    fill="#0F172A"
                  />
                  {/* Sulci / Gyri contours */}
                  <path
                    d="M 120,150 Q 150,170 120,200 Q 140,240 120,270"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="3"
                  />
                  <path
                    d="M 280,150 Q 250,170 280,200 Q 260,240 280,270"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="3"
                  />
                </svg>
              ) : selectedStudy.modality === "MR" ? (
                /* MRI Spine Graphic */
                <svg
                  viewBox="0 0 400 400"
                  className="w-full h-full p-6 text-slate-300"
                >
                  <rect width="400" height="400" fill="#030712" />
                  {/* Spinal Cord / Thecal Sac */}
                  <rect x="185" y="40" width="30" height="320" fill="#1E293B" />
                  {/* Vertebral Bodies L1 to L5 */}
                  {[60, 120, 180, 240, 300].map((y, i) => (
                    <g key={i}>
                      <rect
                        x="110"
                        y={y}
                        width="65"
                        height="42"
                        rx="4"
                        fill="#64748B"
                        stroke="#CBD5E1"
                        strokeWidth="2"
                      />
                      {/* Intervertebral Disc */}
                      <rect
                        x="112"
                        y={y + 44}
                        width="61"
                        height="12"
                        rx="2"
                        fill="#38BDF8"
                        opacity="0.8"
                      />
                      {/* Spinous process */}
                      <polygon
                        points={`220,${y + 10} 270,${y + 25} 220,${y + 35}`}
                        fill="#475569"
                      />
                    </g>
                  ))}
                </svg>
              ) : (
                /* Ultrasound Graphic */
                <svg
                  viewBox="0 0 400 400"
                  className="w-full h-full p-6 text-slate-300"
                >
                  <rect width="400" height="400" fill="#030712" />
                  {/* Sector Pie Field of View */}
                  <path
                    d="M 200,40 L 70,360 A 240,240 0 0,0 330,360 Z"
                    fill="#0F172A"
                    stroke="#334155"
                    strokeWidth="2"
                  />
                  {/* Gallbladder lumen */}
                  <ellipse
                    cx="190"
                    cy="220"
                    rx="45"
                    ry="30"
                    fill="#020617"
                    stroke="#475569"
                    strokeWidth="3"
                  />
                  {/* Gallstones */}
                  <circle cx="180" cy="225" r="7" fill="#E2E8F0" />
                  <circle cx="198" cy="220" r="5" fill="#E2E8F0" />
                  {/* Acoustic Shadowing */}
                  <polygon
                    points="173,232 205,232 220,350 160,350"
                    fill="#000000"
                    opacity="0.9"
                  />
                </svg>
              )}

              {/* Overlay Caliper Measurement if enabled */}
              {pacsMeasureMode && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <svg viewBox="0 0 400 400" className="w-full h-full">
                    <line
                      x1="160"
                      y1="180"
                      x2="240"
                      y2="220"
                      stroke="#10B981"
                      strokeWidth="3"
                      strokeDasharray="4 2"
                    />
                    <circle cx="160" cy="180" r="4" fill="#10B981" />
                    <circle cx="240" cy="220" r="4" fill="#10B981" />
                    <text
                      x="205"
                      y="195"
                      fill="#10B981"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      14.2 mm
                    </text>
                  </svg>
                </div>
              )}

              {/* Corner DICOM Overlay Badges */}
              <div className="absolute top-3 left-3 text-[10.5px] font-mono text-emerald-400 space-y-0.5 pointer-events-none">
                <div>{selectedStudy.patient}</div>
                <div>MRN: {selectedStudy.mrn}</div>
                <div>{selectedStudy.study}</div>
              </div>

              <div className="absolute top-3 right-3 text-[10.5px] font-mono text-emerald-400 text-right pointer-events-none">
                <div>APOLLO RADIOLOGY PACS</div>
                <div>ROOM: {selectedStudy.room}</div>
                <div>MODALITY: {selectedStudy.modality}</div>
              </div>

              <div className="absolute bottom-3 left-3 text-[10.5px] font-mono text-emerald-400 pointer-events-none">
                <div>SLICE: {pacsSlice} / 8</div>
                <div>THICKNESS: 1.25 mm</div>
                <div>FOV: 350 mm</div>
              </div>

              <div className="absolute bottom-3 right-3 text-[10.5px] font-mono text-emerald-400 text-right pointer-events-none">
                <div>
                  W: {pacsContrast * 4} L: {pacsBrightness - 60}
                </div>
                <div>ZOOM: {Math.round(pacsZoom * 100)}%</div>
                <div>PRESET: {pacsPreset.toUpperCase()}</div>
              </div>
            </div>
          </div>

          {/* Bottom Control Bar */}
          <div className="bg-[#0F172A] text-white px-6 py-3 rounded-b-2xl border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Zoom:</span>
                <input
                  type="range"
                  min="0.6"
                  max="2.5"
                  step="0.1"
                  value={pacsZoom}
                  onChange={(e) => setPacsZoom(parseFloat(e.target.value))}
                  className="w-24 accent-blue-500"
                />
                <span className="font-mono text-slate-300 w-10">
                  {Math.round(pacsZoom * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Brightness:</span>
                <input
                  type="range"
                  min="50"
                  max="180"
                  value={pacsBrightness}
                  onChange={(e) =>
                    setPacsBrightness(parseInt(e.target.value, 10))
                  }
                  className="w-24 accent-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Contrast:</span>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={pacsContrast}
                  onChange={(e) =>
                    setPacsContrast(parseInt(e.target.value, 10))
                  }
                  className="w-24 accent-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1">
                <span>📁</span> Upload Custom Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = URL.createObjectURL(file)
                      setCustomUploadUrl(url)
                      showToast(
                        "✓ Custom medical image loaded in PACS",
                        "success",
                      )
                    }
                  }}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowPacsModal(false)
                  openReportingEditor(selectedStudy)
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors"
              >
                📝 Dictate Findings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RADIOLOGIST DIAGNOSTIC REPORTING & DICTATION EDITOR              */}
      {/* ========================================================================= */}
      {showReportEditorModal && selectedStudy && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <h3 className="font-bold text-sm">
                  Radiologist Diagnostic Dictation &amp; Report Sign-Off
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportEditorModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs">
                <div>
                  <span className="font-bold text-indigo-950 text-sm">
                    {selectedStudy.patient}
                  </span>
                  <div className="text-indigo-800 font-mono text-[11px]">
                    MRN: {selectedStudy.mrn} · Accession:{" "}
                    {selectedStudy.accessionNo || "RAD-ACC-8801"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-indigo-900 text-xs">
                    {selectedStudy.study}
                  </span>
                  <div className="text-[11px] text-indigo-700">
                    Room: {selectedStudy.room} ({selectedStudy.modality})
                  </div>
                </div>
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Load Structured Diagnostic Template
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800"
                  onChange={(e) => {
                    const match = IMAGING_CATALOG.find(
                      (c) => c.study === e.target.value,
                    )
                    if (match) {
                      setReportingForm((prev) => ({
                        ...prev,
                        indication: match.indication,
                        technique: match.technique,
                        findings: match.defaultFindings,
                        impression: match.defaultImpression,
                      }))
                      showToast(
                        `✓ Loaded ${match.study} clinical template`,
                        "info",
                      )
                    }
                  }}
                >
                  <option value="">
                    -- Choose Template to Pre-populate Findings --
                  </option>
                  {IMAGING_CATALOG.map((c) => (
                    <option key={c.study} value={c.study}>
                      {c.study} ({c.modality})
                    </option>
                  ))}
                </select>
              </div>

              {/* Clinical Indication */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Clinical Indication *
                </label>
                <input
                  type="text"
                  value={reportingForm.indication}
                  onChange={(e) =>
                    setReportingForm((prev) => ({
                      ...prev,
                      indication: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              {/* Technique */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Imaging Technique &amp; Protocol
                </label>
                <input
                  type="text"
                  value={reportingForm.technique}
                  onChange={(e) =>
                    setReportingForm((prev) => ({
                      ...prev,
                      technique: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              {/* Findings */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Diagnostic Findings (Line by line) *
                </label>
                <textarea
                  rows={4}
                  value={reportingForm.findings.join("\n")}
                  onChange={(e) =>
                    setReportingForm((prev) => ({
                      ...prev,
                      findings: e.target.value
                        .split("\n")
                        .filter((l) => l.trim().length > 0),
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 text-xs font-mono"
                />
              </div>

              {/* Impression */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Diagnostic Impression *
                </label>
                <textarea
                  rows={3}
                  value={reportingForm.impression.join("\n")}
                  onChange={(e) =>
                    setReportingForm((prev) => ({
                      ...prev,
                      impression: e.target.value
                        .split("\n")
                        .filter((l) => l.trim().length > 0),
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 text-xs font-mono"
                />
              </div>

              {/* Radiologist */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Signing Radiologist Credentials
                </label>
                <input
                  type="text"
                  value={reportingForm.radiologist}
                  onChange={(e) =>
                    setReportingForm((prev) => ({
                      ...prev,
                      radiologist: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleSaveReport("Draft")}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold cursor-pointer transition-colors text-xs"
              >
                Save Draft
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportEditorModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReport("Final")}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold cursor-pointer shadow-xs transition-colors text-xs"
                >
                  ✓ Sign &amp; Finalize Official Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: OFFICIAL DIAGNOSTIC RADIOLOGY REPORT (PRINTABLE)                 */}
      {/* ========================================================================= */}
      {showPdfReportModal && selectedStudy && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span>📄</span>
                <h3 className="font-bold text-sm">
                  Official Diagnostic Radiology Report
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                >
                  <span>🖨️</span> Print Report
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfReportModal(false)}
                  className="text-white/80 hover:text-white text-lg font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-white text-slate-900 font-sans">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-teal-900 tracking-tight">
                    APOLLO DEPARTMENT OF DIAGNOSTIC RADIOLOGY
                  </h2>
                  <div className="text-xs text-slate-600 font-medium">
                    Diagnostic &amp; Interventional Imaging Division
                  </div>
                  <div className="text-[11px] text-slate-500">
                    AERB Licensed · ISO 9001:2015 · PACS Network ID:
                    RAD-NET-2026
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="font-bold text-slate-900">
                    ACCESSION: {selectedStudy.accessionNo || "RAD-ACC-8801"}
                  </div>
                  <div className="text-slate-500">
                    Date: {new Date().toLocaleDateString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Patient Demographics */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div>
                    Patient Name:{" "}
                    <strong className="text-slate-900">
                      {selectedStudy.patient}
                    </strong>
                  </div>
                  <div>
                    MRN / UHID:{" "}
                    <strong className="font-mono text-slate-900">
                      {selectedStudy.mrn}
                    </strong>
                  </div>
                  <div>
                    Age / Gender: <strong>41 Yrs / Male</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div>
                    Referring Physician:{" "}
                    <strong className="text-slate-900">
                      {selectedStudy.provider}
                    </strong>
                  </div>
                  <div>
                    Modality:{" "}
                    <strong>
                      {selectedStudy.modality} (Room: {selectedStudy.room})
                    </strong>
                  </div>
                  <div>
                    Study Ordered: <strong>{selectedStudy.ordered}</strong>
                  </div>
                </div>
              </div>

              {/* Study Description & Technique */}
              <div className="space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wide border-b pb-1">
                    Study: {selectedStudy.study}
                  </h4>
                  <div className="mt-2">
                    <span className="font-bold text-slate-800">
                      Indication:{" "}
                    </span>
                    <span className="text-slate-700">
                      {selectedStudy.indication ||
                        "Shortness of breath, chest discomfort."}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="font-bold text-slate-800">
                      Technique:{" "}
                    </span>
                    <span className="text-slate-700">
                      {selectedStudy.technique ||
                        "Standard multiplanar digital radiography."}
                    </span>
                  </div>
                </div>

                {/* Findings */}
                <div className="pt-2 border-t border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1.5 uppercase">
                    Findings:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11.5px]">
                    {(selectedStudy.findings &&
                    selectedStudy.findings.length > 0
                      ? selectedStudy.findings
                      : IMAGING_CATALOG[0].defaultFindings
                    ).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                {/* Impression */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <h4 className="font-bold text-slate-900 uppercase">
                    Impression:
                  </h4>
                  <div className="text-slate-800 font-semibold text-[11.5px] space-y-0.5">
                    {(selectedStudy.impression &&
                    selectedStudy.impression.length > 0
                      ? selectedStudy.impression
                      : IMAGING_CATALOG[0].defaultImpression
                    ).map((imp, i) => (
                      <div key={i}>{imp}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex items-end justify-between text-xs border-t border-slate-300">
                <div>
                  <div className="font-bold text-slate-900">
                    Radiology Technologist
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {selectedStudy.technician || "Alex Rivera, RT(R)"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-teal-900">
                    {selectedStudy.radiologist || "Dr. Laura Kim, MD"}
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Senior Consultant Radiologist
                  </div>
                  <div className="text-slate-400 font-mono text-[10px]">
                    Signed: {selectedStudy.signedAt || "10:15 AM"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
