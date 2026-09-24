import React, { useState, useEffect, useMemo } from "react"
import { QueueTab, Table, TR, TD, StatusBadge, Btn, Card } from "./shared"
import {
  BillingDatabase,
  LabOrderRecord,
  LabResultItem,
} from "../services/billingDb"
import { db } from "../services/db"

const QUEUES = [
  { label: "All Orders", key: "all" },
  { label: "Pre-Paid (Ready)", key: "paid" },
  { label: "Payment Pending (Locked)", key: "unpaid" },
  { label: "Sample Collected", key: "collected" },
  { label: "Processing (On Bench)", key: "processing" },
  { label: "Critical Values", key: "critical" },
  { label: "Completed & Verified", key: "completed" },
]

export const TEST_CATALOG: {
  name: string
  category: string
  price: number
  sampleType: string
  analyzer: string
  defaultResults: LabResultItem[]
}[] = [
  {
    name: "CBC w/ Differential (Complete Blood Count)",
    category: "Hematology",
    price: 350,
    sampleType: "Whole Blood (Lavender EDTA)",
    analyzer: "Sysmex XN-1000 Hematology",
    defaultResults: [
      {
        component: "WBC Count",
        value: "8.4",
        unit: "10^3/μL",
        ref: "4.5–11.0",
        flag: "",
      },
      {
        component: "RBC Count",
        value: "4.85",
        unit: "10^6/μL",
        ref: "4.5–5.9",
        flag: "",
      },
      {
        component: "Hemoglobin",
        value: "14.6",
        unit: "g/dL",
        ref: "13.5–17.5",
        flag: "",
      },
      {
        component: "Hematocrit",
        value: "43.2",
        unit: "%",
        ref: "41.0–53.0",
        flag: "",
      },
      {
        component: "MCV",
        value: "88.2",
        unit: "fL",
        ref: "80.0–100.0",
        flag: "",
      },
      {
        component: "Platelet Count",
        value: "245",
        unit: "10^3/μL",
        ref: "150–400",
        flag: "",
      },
      {
        component: "Neutrophils %",
        value: "62.0",
        unit: "%",
        ref: "50.0–70.0",
        flag: "",
      },
      {
        component: "Lymphocytes %",
        value: "28.5",
        unit: "%",
        ref: "20.0–40.0",
        flag: "",
      },
      {
        component: "Monocytes %",
        value: "6.5",
        unit: "%",
        ref: "2.0–8.0",
        flag: "",
      },
      {
        component: "Eosinophils %",
        value: "2.5",
        unit: "%",
        ref: "1.0–4.0",
        flag: "",
      },
    ],
  },
  {
    name: "BMP (Basic Metabolic Panel)",
    category: "Biochemistry",
    price: 600,
    sampleType: "Serum (Gold Top SST)",
    analyzer: "Beckman Coulter AU680",
    defaultResults: [
      {
        component: "Sodium",
        value: "140",
        unit: "mmol/L",
        ref: "135–145",
        flag: "",
      },
      {
        component: "Potassium",
        value: "4.2",
        unit: "mmol/L",
        ref: "3.5–5.1",
        flag: "",
      },
      {
        component: "Chloride",
        value: "102",
        unit: "mmol/L",
        ref: "98–107",
        flag: "",
      },
      {
        component: "Carbon Dioxide (CO2)",
        value: "24",
        unit: "mmol/L",
        ref: "22–29",
        flag: "",
      },
      {
        component: "Blood Urea Nitrogen (BUN)",
        value: "14",
        unit: "mg/dL",
        ref: "7–20",
        flag: "",
      },
      {
        component: "Serum Creatinine",
        value: "0.92",
        unit: "mg/dL",
        ref: "0.7–1.3",
        flag: "",
      },
      {
        component: "Fasting Blood Glucose",
        value: "98",
        unit: "mg/dL",
        ref: "70–99",
        flag: "",
      },
      {
        component: "Calcium",
        value: "9.4",
        unit: "mg/dL",
        ref: "8.6–10.2",
        flag: "",
      },
    ],
  },
  {
    name: "Troponin I (High Sensitivity)",
    category: "Cardiac",
    price: 1800,
    sampleType: "Serum (Gold Top SST)",
    analyzer: "Roche Cobas e411 Immunoassay",
    defaultResults: [
      {
        component: "High-Sensitivity Troponin I",
        value: "1.80",
        unit: "ng/mL",
        ref: "< 0.04",
        flag: "Critical",
      },
      {
        component: "CK-MB Mass",
        value: "18.4",
        unit: "ng/mL",
        ref: "0.0–5.0",
        flag: "H",
      },
      {
        component: "Myoglobin",
        value: "112",
        unit: "ng/mL",
        ref: "28–72",
        flag: "H",
      },
    ],
  },
  {
    name: "Liver Function Test (LFT Profile)",
    category: "Biochemistry",
    price: 900,
    sampleType: "Serum (Gold Top SST)",
    analyzer: "Beckman Coulter AU680",
    defaultResults: [
      {
        component: "Total Bilirubin",
        value: "0.85",
        unit: "mg/dL",
        ref: "0.2–1.2",
        flag: "",
      },
      {
        component: "Direct Bilirubin",
        value: "0.20",
        unit: "mg/dL",
        ref: "0.0–0.3",
        flag: "",
      },
      {
        component: "AST (SGOT)",
        value: "28",
        unit: "U/L",
        ref: "10–40",
        flag: "",
      },
      {
        component: "ALT (SGPT)",
        value: "32",
        unit: "U/L",
        ref: "7–56",
        flag: "",
      },
      {
        component: "Alkaline Phosphatase (ALP)",
        value: "85",
        unit: "U/L",
        ref: "44–147",
        flag: "",
      },
      {
        component: "Total Protein",
        value: "7.2",
        unit: "g/dL",
        ref: "6.0–8.3",
        flag: "",
      },
      {
        component: "Serum Albumin",
        value: "4.4",
        unit: "g/dL",
        ref: "3.5–5.0",
        flag: "",
      },
    ],
  },
  {
    name: "Lipid Profile Panel",
    category: "Biochemistry",
    price: 850,
    sampleType: "Serum (Gold Top SST)",
    analyzer: "Beckman Coulter AU680",
    defaultResults: [
      {
        component: "Total Cholesterol",
        value: "185",
        unit: "mg/dL",
        ref: "< 200",
        flag: "",
      },
      {
        component: "Triglycerides",
        value: "135",
        unit: "mg/dL",
        ref: "< 150",
        flag: "",
      },
      {
        component: "HDL Cholesterol",
        value: "52",
        unit: "mg/dL",
        ref: "> 40",
        flag: "",
      },
      {
        component: "LDL Cholesterol",
        value: "106",
        unit: "mg/dL",
        ref: "< 100",
        flag: "H",
      },
      {
        component: "VLDL Cholesterol",
        value: "27",
        unit: "mg/dL",
        ref: "< 30",
        flag: "",
      },
    ],
  },
  {
    name: "Lactic Acid (Plasma Lactate)",
    category: "Biochemistry",
    price: 650,
    sampleType: "Plasma (Gray Top on Ice)",
    analyzer: "Radiometer ABL90 FLEX",
    defaultResults: [
      {
        component: "Plasma Lactate",
        value: "4.2",
        unit: "mmol/L",
        ref: "0.5–2.0",
        flag: "Critical",
      },
    ],
  },
  {
    name: "Thyroid Profile (TSH, Free T3, Free T4)",
    category: "Immunology",
    price: 750,
    sampleType: "Serum (Gold Top SST)",
    analyzer: "Roche Cobas e411 Immunoassay",
    defaultResults: [
      {
        component: "TSH (3rd Gen)",
        value: "2.45",
        unit: "μIU/mL",
        ref: "0.45–4.50",
        flag: "",
      },
      {
        component: "Free T3",
        value: "3.1",
        unit: "pg/mL",
        ref: "2.0–4.4",
        flag: "",
      },
      {
        component: "Free T4",
        value: "1.25",
        unit: "ng/dL",
        ref: "0.82–1.77",
        flag: "",
      },
    ],
  },
  {
    name: "Urinalysis Complete w/ Microscopic",
    category: "Urinalysis",
    price: 250,
    sampleType: "Mid-Stream Clean Catch Urine",
    analyzer: "Siemens Clinitek Status",
    defaultResults: [
      {
        component: "Color",
        value: "Pale Yellow",
        unit: "",
        ref: "Straw/Yellow",
        flag: "",
      },
      {
        component: "Clarity",
        value: "Clear",
        unit: "",
        ref: "Clear",
        flag: "",
      },
      {
        component: "Specific Gravity",
        value: "1.018",
        unit: "",
        ref: "1.005–1.030",
        flag: "",
      },
      { component: "pH", value: "6.0", unit: "", ref: "5.0–8.0", flag: "" },
      {
        component: "Protein",
        value: "Negative",
        unit: "",
        ref: "Negative",
        flag: "",
      },
      {
        component: "Glucose",
        value: "Negative",
        unit: "",
        ref: "Negative",
        flag: "",
      },
      {
        component: "Ketones",
        value: "Negative",
        unit: "",
        ref: "Negative",
        flag: "",
      },
      {
        component: "Leukocyte Esterase",
        value: "Negative",
        unit: "",
        ref: "Negative",
        flag: "",
      },
      {
        component: "Nitrite",
        value: "Negative",
        unit: "",
        ref: "Negative",
        flag: "",
      },
      {
        component: "Microscopic RBC",
        value: "0–2",
        unit: "/HPF",
        ref: "0–3 /HPF",
        flag: "",
      },
      {
        component: "Microscopic WBC",
        value: "1–3",
        unit: "/HPF",
        ref: "0–5 /HPF",
        flag: "",
      },
    ],
  },
  {
    name: "HbA1c (Glycated Hemoglobin)",
    category: "Biochemistry",
    price: 700,
    sampleType: "Whole Blood (Lavender EDTA)",
    analyzer: "Bio-Rad D-10 HPLC",
    defaultResults: [
      {
        component: "HbA1c",
        value: "6.2",
        unit: "%",
        ref: "< 5.7 (Normal), 5.7–6.4 (Prediabetes)",
        flag: "H",
      },
      {
        component: "Estimated Average Glucose (eAG)",
        value: "131",
        unit: "mg/dL",
        ref: "70–126",
        flag: "H",
      },
    ],
  },
  {
    name: "Coagulation Profile (PT / INR / aPTT)",
    category: "Hematology",
    price: 800,
    sampleType: "Citrated Plasma (Light Blue Top)",
    analyzer: "Sysmex CS-2500 Coagulation",
    defaultResults: [
      {
        component: "Prothrombin Time (PT)",
        value: "12.4",
        unit: "sec",
        ref: "11.0–13.5",
        flag: "",
      },
      { component: "INR", value: "1.05", unit: "", ref: "0.85–1.15", flag: "" },
      {
        component: "aPTT",
        value: "31.2",
        unit: "sec",
        ref: "25.0–36.0",
        flag: "",
      },
    ],
  },
]

export default function Laboratory({ technician = "Laboratory Specialist" }: {
  technician?: string
} = {}) {
  const [activeQueue, setActiveQueue] = useState(0)
  const [labOrders, setLabOrders] = useState<LabOrderRecord[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] =
    useState<"all" | "STAT" | "Routine">("all")
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "error" | "info"
  } | null>(null)

  // Modals state
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [showAccessionModal, setShowAccessionModal] = useState(false)
  const [showResultEntryModal, setShowResultEntryModal] = useState(false)
  const [showCriticalAlertModal, setShowCriticalAlertModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // Form states for modals
  const [newOrderForm, setNewOrderForm] = useState({
    patient: "",
    mrn: "",
    testName: TEST_CATALOG[0].name,
    priority: "Routine" as "STAT" | "Routine",
    provider: "Dr. Vikram Seth (Emergency)",
    paymentStatus: "Paid" as "Paid" | "Payment Pending",
  })

  const [accessionForm, setAccessionForm] = useState({
    sampleType: "Whole Blood (Lavender EDTA)",
    collectedBy: "Staff RN (Phlebotomy)",
    barcode: "",
  })

  const [editableResults, setEditableResults] = useState<LabResultItem[]>([])
  const [clinicalComments, setClinicalComments] = useState("")
  const [verifierName, setVerifierName] = useState(
    "Dr. K. Srinivasan, MD (Senior Pathologist)",
  )

  // Critical notification form
  const [criticalNotifyForm, setCriticalNotifyForm] = useState({
    providerContacted: "",
    channel: "Direct Phone Call",
    readBackVerified: true,
    notes: "Critical value verbally communicated. Read-back verified.",
  })

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3800)
  }

  const refreshData = () => {
    const orders = BillingDatabase.getLabOrders()
    setLabOrders(orders)
  }

  useEffect(() => {
    refreshData()
    const unsub = BillingDatabase.onUpdate(refreshData)
    return () => unsub()
  }, [])

  const registeredPatients = useMemo(() => {
    return db.getPatients()
  }, [])

  // Universal Search Filter (matches Patient Name, MRN, UMR, Invoice No, Receipt No, Test, Doctor, Diagnosis, Line Items)
  const filteredOrders = useMemo(() => {
    const queue = QUEUES[activeQueue]
    let list = labOrders

    if (queue.key === "paid")
      list = list.filter((o) => o.paymentStatus === "Paid")
    else if (queue.key === "unpaid")
      list = list.filter((o) => o.paymentStatus === "Payment Pending")
    else if (queue.key === "collected")
      list = list.filter((o) => o.status === "Collected")
    else if (queue.key === "processing")
      list = list.filter((o) => o.status === "Processing")
    else if (queue.key === "critical")
      list = list.filter((o) =>
        o.results?.some(
          (r) => r.flag === "Critical" || r.flag === "HH" || r.flag === "LL",
        ),
      )
    else if (queue.key === "completed")
      list = list.filter((o) => o.status === "Completed")

    if (priorityFilter !== "all") {
      list = list.filter((o) => o.priority === priorityFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (o) =>
          o.patient.toLowerCase().includes(q) ||
          o.mrn.toLowerCase().includes(q) ||
          (o.umr && o.umr.toLowerCase().includes(q)) ||
          o.test.toLowerCase().includes(q) ||
          (o.invoiceNo && o.invoiceNo.toLowerCase().includes(q)) ||
          (o.paidReceiptNo && o.paidReceiptNo.toLowerCase().includes(q)) ||
          (o.accessionNo && o.accessionNo.toLowerCase().includes(q)) ||
          o.provider.toLowerCase().includes(q) ||
          (o.department && o.department.toLowerCase().includes(q)) ||
          (o.diagnosis && o.diagnosis.toLowerCase().includes(q)) ||
          (o.orderedItems &&
            o.orderedItems.some((it) =>
              it.description.toLowerCase().includes(q),
            )),
      )
    }

    return list
  }, [labOrders, activeQueue, priorityFilter, searchQuery])

  const selectedOrder: LabOrderRecord | undefined =
    filteredOrders[selectedIdx] || filteredOrders[0] || labOrders[0]

  // Critical alerts count
  const criticalOrders = useMemo(() => {
    return labOrders.filter((o) =>
      o.results?.some(
        (r) => r.flag === "Critical" || r.flag === "HH" || r.flag === "LL",
      ),
    )
  }, [labOrders])

  const counts = useMemo(() => {
    return {
      all: labOrders.length,
      paid: labOrders.filter((o) => o.paymentStatus === "Paid").length,
      unpaid: labOrders.filter((o) => o.paymentStatus === "Payment Pending")
        .length,
      collected: labOrders.filter((o) => o.status === "Collected").length,
      processing: labOrders.filter((o) => o.status === "Processing").length,
      critical: criticalOrders.length,
      completed: labOrders.filter((o) => o.status === "Completed").length,
    }
  }, [labOrders, criticalOrders])

  // Open Accession Modal
  const openAccessionModal = (order: LabOrderRecord) => {
    if (order.paymentStatus !== "Paid") {
      showToast(
        `⚠ Cannot collect sample for ${order.patient}! Payment of ₹${order.price} is pending at Central Billing.`,
        "error",
      )
      return
    }
    const catItem =
      TEST_CATALOG.find((t) => t.name === order.test) || TEST_CATALOG[0]
    setAccessionForm({
      sampleType: order.sampleType || catItem.sampleType,
      collectedBy: technician || "Phlebotomist Roy",
      barcode:
        order.accessionNo ||
        `ACC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    })
    setShowAccessionModal(true)
  }

  // Confirm Sample Accession
  const handleConfirmAccession = () => {
    if (!selectedOrder) return
    try {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      BillingDatabase.updateLabOrder(selectedOrder.id, {
        status: "Collected",
        collected: now,
        collectedAt: now,
        collectedBy: accessionForm.collectedBy,
        sampleType: accessionForm.sampleType,
        accessionNo: accessionForm.barcode,
      })
      setShowAccessionModal(false)
      showToast(
        `✓ Specimen accessioned (${accessionForm.barcode}) & sample collected for ${selectedOrder.patient}`,
        "success",
      )
      refreshData()
    } catch {
      showToast("Failed to update accession status", "error")
    }
  }

  // Start Processing / Put on Analyzer Bench
  const handleStartProcessing = (order: LabOrderRecord) => {
    try {
      const catItem =
        TEST_CATALOG.find((t) => t.name === order.test) || TEST_CATALOG[0]
      BillingDatabase.updateLabOrder(order.id, {
        status: "Processing",
        analyzer: order.analyzer || catItem.analyzer,
      })
      showToast(
        `✓ Specimen loaded on analyzer: ${order.analyzer || catItem.analyzer}`,
        "info",
      )
      refreshData()
    } catch {
      showToast("Failed to update analyzer bench status", "error")
    }
  }

  // Open Result Entry Modal
  const openResultEntryModal = (order: LabOrderRecord) => {
    const catItem =
      TEST_CATALOG.find((t) => t.name === order.test) || TEST_CATALOG[0]
    const initialResults =
      order.results && order.results.length > 0
        ? order.results
        : catItem.defaultResults
    setEditableResults(JSON.parse(JSON.stringify(initialResults)))
    setClinicalComments(
      order.comments ||
        "Diagnostic test performed on validated automated platform. Biological reference intervals verified.",
    )
    setShowResultEntryModal(true)
  }

  // Update a result component value
  const handleResultChange = (index: number, val: string) => {
    setEditableResults((prev) => {
      const next = [...prev]
      next[index].value = val
      const numVal = parseFloat(val)
      const refRange = next[index].ref
      if (!isNaN(numVal) && refRange.includes("–")) {
        const [lowStr, highStr] = refRange
          .split("–")
          .map((s) => parseFloat(s.trim()))
        if (!isNaN(lowStr) && !isNaN(highStr)) {
          if (numVal < lowStr) next[index].flag = "L"
          else if (numVal > highStr) next[index].flag = "H"
          else next[index].flag = ""
        }
      }
      return next
    })
  }

  // Save / Verify Results
  const handleSaveAndVerifyResults = (markCompleted: boolean = true) => {
    if (!selectedOrder) return
    try {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      const hasCritical = editableResults.some(
        (r) => r.flag === "Critical" || r.flag === "HH" || r.flag === "LL",
      )

      BillingDatabase.updateLabOrder(selectedOrder.id, {
        results: editableResults,
        comments: clinicalComments,
        status: markCompleted
          ? "Completed"
          : hasCritical
            ? "Critical"
            : "Processing",
        verifiedBy: markCompleted ? verifierName : undefined,
        verifiedAt: markCompleted ? now : undefined,
      })
      setShowResultEntryModal(false)
      showToast(
        markCompleted
          ? `✓ Lab results verified and officially signed out by ${verifierName}`
          : "✓ Draft lab results saved successfully",
        "success",
      )
      refreshData()
    } catch {
      showToast("Failed to save results", "error")
    }
  }

  // Create New Lab Order
  const handleCreateNewOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrderForm.patient.trim()) {
      showToast("Please enter or select a patient name", "error")
      return
    }

    const catItem =
      TEST_CATALOG.find((t) => t.name === newOrderForm.testName) ||
      TEST_CATALOG[0]
    const isPaid = newOrderForm.paymentStatus === "Paid"
    const receiptNo = isPaid
      ? `RCPT-2026-${Math.floor(5500 + Math.random() * 4000)}`
      : undefined

    const newOrder = BillingDatabase.createLabOrder({
      patient: newOrderForm.patient,
      mrn: newOrderForm.mrn || `100${Math.floor(100 + Math.random() * 900)}`,
      test: newOrderForm.testName,
      category: catItem.category,
      priority: newOrderForm.priority,
      sampleType: catItem.sampleType,
      analyzer: catItem.analyzer,
      status: "Pending",
      provider: newOrderForm.provider,
      price: catItem.price,
      paymentStatus: newOrderForm.paymentStatus,
      paidReceiptNo: receiptNo,
      paidAt: isPaid ? new Date().toISOString() : undefined,
      results: catItem.defaultResults,
      orderedItems: [
        {
          description: newOrderForm.testName,
          price: catItem.price,
          quantity: 1,
        },
      ],
    })

    setShowNewOrderModal(false)
    showToast(
      `✓ New lab order created: ${newOrder.id} for ${newOrder.patient}`,
      "success",
    )
    refreshData()
  }

  // Critical Notification Submit
  const handleLogCriticalNotification = () => {
    if (!selectedOrder) return
    try {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      BillingDatabase.updateLabOrder(selectedOrder.id, {
        criticalNotified: {
          notified: true,
          notifiedTo:
            criticalNotifyForm.providerContacted || selectedOrder.provider,
          notifiedAt: now,
          channel: criticalNotifyForm.channel,
          readBackVerified: criticalNotifyForm.readBackVerified,
        },
      })
      setShowCriticalAlertModal(false)
      showToast(
        `✓ Critical alert documented: Verbal read-back verified with ${criticalNotifyForm.providerContacted || selectedOrder.provider}`,
        "success",
      )
      refreshData()
    } catch {
      showToast("Failed to log critical notification", "error")
    }
  }

  // Export CSV Worklist
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      showToast("No orders to export", "info")
      return
    }
    const headers = [
      "Order ID",
      "Invoice No",
      "Accession No",
      "Patient",
      "MRN",
      "Test Name",
      "Category",
      "Priority",
      "Payment Status",
      "Lab Status",
      "Collected At",
      "Provider",
      "Price (INR)",
    ]
    const rows = filteredOrders.map((o) => [
      o.id,
      o.invoiceNo || "—",
      o.accessionNo || "—",
      `"${o.patient}"`,
      o.mrn,
      `"${o.test}"`,
      o.category || "General",
      o.priority,
      o.paymentStatus,
      o.status,
      o.collected || "—",
      `"${o.provider}"`,
      o.price,
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
      `Hospital_Lab_Worklist_${new Date().toISOString().split("T")[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast("✓ Lab worklist exported to CSV", "success")
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
                : "bg-blue-900 text-blue-100 border-blue-700"
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
              Clinical Laboratory &amp; Pathology Suite
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
              ● Central Billing Connected · NABL Accredited
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
              if (selectedOrder) {
                openAccessionModal(selectedOrder)
              } else {
                showToast("Please select an order first", "info")
              }
            }}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <span>🏷️</span> Accession
          </button>
          <button
            type="button"
            onClick={() => setShowNewOrderModal(true)}
            className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#153eb3] text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>+</span> Manual Entry / New Order
          </button>
        </div>
      </div>

      {/* 2. Critical Alerts Notification Bar */}
      {criticalOrders.length > 0 && (
        <div className="bg-[#FEF2F2] border-b border-[#FECACA] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#B91C1C] font-semibold">
            <span className="text-base animate-pulse">🚨</span>
            <span>
              <strong>{criticalOrders.length} Critical Panic Value(s)</strong>{" "}
              detected requiring mandatory verbal provider read-back
              notification!
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const critOrder = criticalOrders[0]
                if (critOrder) {
                  const idx = filteredOrders.findIndex(
                    (o) => o.id === critOrder.id,
                  )
                  if (idx >= 0) setSelectedIdx(idx)
                  setCriticalNotifyForm({
                    providerContacted: critOrder.provider,
                    channel: "Direct Phone Call",
                    readBackVerified: true,
                    notes: `Critical value (${critOrder.test}) verbally communicated. Read-back verified.`,
                  })
                  setShowCriticalAlertModal(true)
                }
              }}
              className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-[11px] cursor-pointer shadow-2xs flex items-center gap-1 transition-colors"
            >
              <span>📞</span> Log Provider Notification
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
              placeholder="Search patient name, MRN, UMR, Invoice No (e.g. INV-801), test name, or doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium shadow-2xs"
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
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="STAT">⚡ STAT Priority</option>
              <option value="Routine">Routine</option>
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
                  : q.key === "collected"
                    ? counts.collected
                    : q.key === "processing"
                      ? counts.processing
                      : q.key === "critical"
                        ? counts.critical
                        : counts.completed

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
            title={`Laboratory Worklist (${filteredOrders.length} Patient${
              filteredOrders.length === 1 ? "" : "s"
            } / Orders)`}
            actions={
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-medium">
                  Synced with Central Billing desk
                </span>
              </div>
            }
          >
            <Table
              headers={[
                "Patient / MRN",
                "Test(s) Ordered by Billing / Doctor",
                "Financial Clearance",
                "Specimen & Accession",
                "Lab Status",
                "Prescribing MD",
                "Bench Actions",
              ]}
            >
              {filteredOrders.length === 0 ? (
                <TR>
                  <TD colSpan={7}>
                    <div className="p-10 text-center text-slate-400 space-y-2">
                      <div className="text-2xl">🧪</div>
                      <div className="text-xs font-semibold">
                        No lab orders match this search or queue filter.
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNewOrderModal(true)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer transition-colors"
                      >
                        + Create New Lab Order
                      </button>
                    </div>
                  </TD>
                </TR>
              ) : (
                filteredOrders.map((o, i) => {
                  const isPaid = o.paymentStatus === "Paid"
                  const isSelected = selectedOrder?.id === o.id
                  const hasCritical = o.results?.some(
                    (r) =>
                      r.flag === "Critical" ||
                      r.flag === "HH" ||
                      r.flag === "LL",
                  )

                  return (
                    <TR
                      key={o.id || i}
                      onClick={() => setSelectedIdx(i)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50/80 border-l-4 border-l-blue-600"
                          : hasCritical
                            ? "bg-rose-50/40 hover:bg-rose-50/80"
                            : "hover:bg-slate-50"
                      }`}
                    >
                      <TD>
                        <div>
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span>{o.patient}</span>
                            {hasCritical && (
                              <span
                                className="text-rose-600 text-xs"
                                title="Critical Panic Value"
                              >
                                🚨
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[11px] text-[#64748B] flex items-center gap-1 mt-0.5">
                            <span>MRN: {o.mrn}</span>
                            {o.invoiceNo && (
                              <>
                                <span>·</span>
                                <span className="text-blue-700 font-bold">
                                  {o.invoiceNo}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </TD>

                      <TD>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">
                            {o.test}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                o.priority === "STAT"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {o.priority}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              ₹{o.price}
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
                              {o.paidReceiptNo || "RCPT-2026-5501"}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10.5px] flex items-center gap-1 w-fit border border-amber-300 shadow-2xs">
                              <span>🔒</span> Unpaid
                            </span>
                            <div className="text-[9.5px] text-amber-800 font-semibold mt-0.5">
                              ₹{o.price} Due
                            </div>
                          </div>
                        )}
                      </TD>

                      <TD>
                        <div>
                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                            <span>
                              {o.sampleType
                                ? o.sampleType.split(" ")[0]
                                : "Blood"}
                            </span>
                          </div>
                          <div className="text-[10.5px] font-mono text-slate-500">
                            {o.accessionNo ||
                              (o.collected !== "—"
                                ? `Col: ${o.collected}`
                                : "Not Accessioned")}
                          </div>
                        </div>
                      </TD>

                      <TD>
                        <StatusBadge
                          status={
                            hasCritical && o.status !== "Completed"
                              ? "Critical"
                              : o.status
                          }
                        />
                      </TD>

                      <TD>
                        <span className="text-[#64748B] text-[11.5px]">
                          {o.provider}
                        </span>
                      </TD>

                      <TD>
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isPaid ? (
                            o.status === "Pending" ? (
                              <button
                                type="button"
                                onClick={() => openAccessionModal(o)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
                              >
                                💉 Collect
                              </button>
                            ) : o.status === "Collected" ? (
                              <button
                                type="button"
                                onClick={() => handleStartProcessing(o)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
                              >
                                ⚙ Process
                              </button>
                            ) : o.status === "Processing" ? (
                              <button
                                type="button"
                                onClick={() => openResultEntryModal(o)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[11px] cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
                              >
                                📝 Enter Results
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowReportModal(true)}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold rounded text-[11px] cursor-pointer shadow-2xs transition-colors whitespace-nowrap"
                              >
                                📄 Report
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                showToast(
                                  `🔒 Action locked: ${o.patient} must settle ₹${o.price} at Central Billing Counter first!`,
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

        {/* Right: Selected Test Detail, Billing Prescriptions & Diagnostic Dossier */}
        <div className="space-y-4">
          {selectedOrder ? (
            <>
              {/* Patient & Financial Clearance Dossier Card */}
              <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {selectedOrder.patient}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          selectedOrder.priority === "STAT"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {selectedOrder.priority}
                      </span>
                    </div>
                    {(() => {
                      const pat = registeredPatients.find(
                        (p) =>
                          (selectedOrder.umr && p.umr === selectedOrder.umr) ||
                          p.name.toLowerCase() ===
                            selectedOrder.patient.toLowerCase() ||
                          p.umr.replace(/\D/g, "") === selectedOrder.mrn,
                      )
                      return (
                        <div className="text-xs text-slate-500 font-mono mt-0.5 space-y-0.5">
                          <div>
                            MRN: {selectedOrder.mrn}
                            {selectedOrder.umr
                              ? ` · UMR: ${selectedOrder.umr}`
                              : pat
                                ? ` · UMR: ${pat.umr}`
                                : ""}
                            {pat && ` · ${pat.age}y ${pat.sex}`}
                          </div>
                          <div>
                            Order ID: {selectedOrder.id}
                            {pat?.phone && ` · Ph: ${pat.phone}`}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  <div className="text-right">
                    {selectedOrder.paymentStatus === "Paid" ? (
                      <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        ✓ Paid (₹{selectedOrder.price})
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 text-[11px] font-bold">
                        🔒 Due ₹{selectedOrder.price}
                      </span>
                    )}
                  </div>
                </div>

                {/* Billing Dept Clearance & Exact Advised Tests Card */}
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-900 text-[11.5px] uppercase tracking-wider flex items-center gap-1.5">
                      <span>💳</span> Billing Dept Clearance &amp; Orders Sent
                    </span>
                    <span className="font-mono text-[11px] font-bold text-blue-800">
                      {selectedOrder.invoiceNo
                        ? `Invoice: ${selectedOrder.invoiceNo}`
                        : "Central Billing"}
                    </span>
                  </div>

                  <div className="text-[11.5px] text-slate-700 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Department Source:</span>
                      <strong className="text-slate-900">
                        {selectedOrder.department || "Outpatient / ER"}
                      </strong>
                    </div>
                    {selectedOrder.diagnosis && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Clinical Diagnosis:
                        </span>
                        <span className="font-semibold text-slate-900">
                          {selectedOrder.diagnosis}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Clearance:</span>
                      <strong
                        className={
                          selectedOrder.paymentStatus === "Paid"
                            ? "text-emerald-700"
                            : "text-amber-800"
                        }
                      >
                        {selectedOrder.paymentStatus === "Paid"
                          ? `✓ Cleared at Cashier (${selectedOrder.paidReceiptNo || "RCPT-2026-5501"})`
                          : `🔒 Unsettled · ₹${selectedOrder.price} Due`}
                      </strong>
                    </div>
                  </div>

                  {/* List of exact ordered tests sent by billing */}
                  <div className="pt-2 border-t border-blue-200/80">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-blue-950 block mb-1">
                      Advised Test(s) from Billing / Doctor:
                    </span>
                    <div className="space-y-1">
                      {selectedOrder.orderedItems &&
                      selectedOrder.orderedItems.length > 0 ? (
                        selectedOrder.orderedItems.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 bg-white rounded border border-blue-100 text-[11.5px]"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <span className="text-blue-600">▪</span>{" "}
                              {it.description}
                            </span>
                            <span className="font-mono text-slate-600 font-semibold">
                              ₹{it.price * (it.quantity || 1)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-1.5 bg-white rounded border border-blue-100 text-[11.5px] font-bold text-slate-800 flex items-center justify-between">
                          <span>▪ {selectedOrder.test}</span>
                          <span className="font-mono text-slate-600">
                            ₹{selectedOrder.price}
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
                      {selectedOrder.accessionNo || "Not assigned"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Specimen Tube:</span>
                    <span className="text-slate-800 font-medium">
                      {selectedOrder.sampleType || "Standard Collection"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Analyzer Bench:</span>
                    <span className="text-slate-800 font-medium">
                      {selectedOrder.analyzer || "Auto-routed"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Prescribing MD:</span>
                    <span className="text-slate-800 font-medium">
                      {selectedOrder.provider}
                    </span>
                  </div>
                </div>

                {/* Status-specific Action Bar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {selectedOrder.paymentStatus === "Paid" ? (
                      selectedOrder.status === "Pending" ? (
                        <button
                          type="button"
                          onClick={() => openAccessionModal(selectedOrder)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer shadow-2xs"
                        >
                          💉 Collect &amp; Accession
                        </button>
                      ) : selectedOrder.status === "Collected" ? (
                        <button
                          type="button"
                          onClick={() => handleStartProcessing(selectedOrder)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer shadow-2xs"
                        >
                          ⚙ Start Analyzer Run
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openResultEntryModal(selectedOrder)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold cursor-pointer shadow-2xs"
                        >
                          📝 Edit Results
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-amber-800 font-bold">
                        🔒 Payment required at Central Billing
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-xs font-bold cursor-pointer shadow-2xs flex items-center gap-1"
                  >
                    <span>📄</span> Full PDF Report
                  </button>
                </div>
              </div>

              {/* Live Test Results Table Card */}
              <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-2xs overflow-hidden">
                <div className="px-4 py-3 border-b border-[#DDE2EC] bg-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {selectedOrder.test} Results
                    </h3>
                    <div className="text-[11px] text-[#64748B]">
                      {selectedOrder.status === "Completed"
                        ? `✓ Verified by ${selectedOrder.verifiedBy || "Pathologist"}`
                        : "● Live Results Workbench"}
                    </div>
                  </div>
                  {selectedOrder.paymentStatus === "Paid" && (
                    <button
                      type="button"
                      onClick={() => openResultEntryModal(selectedOrder)}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold cursor-pointer shadow-2xs"
                    >
                      ✏ Edit / Verify
                    </button>
                  )}
                </div>

                <div className="p-3 space-y-1">
                  {selectedOrder.results && selectedOrder.results.length > 0 ? (
                    selectedOrder.results.map((r, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between py-1.5 px-2.5 rounded text-xs border-b border-slate-50 last:border-0 ${
                          r.flag === "Critical" ||
                          r.flag === "HH" ||
                          r.flag === "LL"
                            ? "bg-rose-50 text-rose-900 font-bold border-l-4 border-l-rose-600"
                            : r.flag === "H"
                              ? "bg-amber-50 text-amber-900 font-semibold border-l-2 border-l-amber-500"
                              : r.flag === "L"
                                ? "bg-blue-50 text-blue-900 font-semibold border-l-2 border-l-blue-500"
                                : "text-slate-800"
                        }`}
                      >
                        <span className="w-32 truncate font-medium">
                          {r.component}
                        </span>
                        <span className="font-mono font-bold text-xs">
                          {r.value}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-mono w-14 text-right">
                          {r.unit}
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono w-20 text-right hidden sm:block">
                          {r.ref}
                        </span>
                        <span
                          className={`w-14 text-right font-mono font-extrabold text-[11px] ${
                            r.flag === "Critical" ||
                            r.flag === "HH" ||
                            r.flag === "LL"
                              ? "text-rose-600 animate-pulse"
                              : r.flag === "H"
                                ? "text-amber-600"
                                : r.flag === "L"
                                  ? "text-blue-600"
                                  : "text-slate-300"
                          }`}
                        >
                          {r.flag || "NORMAL"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No results entered yet. Click "Collect &amp; Accession" or
                      "Enter Results" to begin.
                    </div>
                  )}
                </div>

                {selectedOrder.comments && (
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11.5px] text-slate-700">
                    <span className="font-bold text-slate-900 block mb-0.5">
                      Pathologist Impression &amp; Remarks:
                    </span>
                    <span>{selectedOrder.comments}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs font-semibold">
              Select an order from the list to review diagnostic results and
              specimen clearance.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE NEW LAB ORDER */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-[#1B4FD8] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧪</span>
                <h3 className="font-bold text-sm">
                  Create New Clinical Laboratory Order
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

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Diagnostic Test Panel *
                </label>
                <select
                  value={newOrderForm.testName}
                  onChange={(e) =>
                    setNewOrderForm((prev) => ({
                      ...prev,
                      testName: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800"
                >
                  {TEST_CATALOG.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} — ₹{t.price} ({t.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  </select>
                </div>

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

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Prescribing Physician
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
                  className="px-5 py-2 bg-[#1B4FD8] hover:bg-[#153eb3] text-white rounded-lg font-bold cursor-pointer shadow-xs transition-colors"
                >
                  Save &amp; Generate Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ACCESSION & SAMPLE COLLECTION */}
      {showAccessionModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💉</span>
                <h3 className="font-bold text-sm">
                  Specimen Collection &amp; Accessioning
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAccessionModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <div className="font-bold text-emerald-950 text-sm">
                  {selectedOrder.patient}
                </div>
                <div className="text-emerald-800 font-mono">
                  MRN: {selectedOrder.mrn} · Order: {selectedOrder.id}
                </div>
                <div className="text-emerald-900 font-semibold pt-1">
                  Test: {selectedOrder.test}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Generated Accession Barcode
                </label>
                <div className="p-3 bg-slate-100 rounded-lg text-center font-mono font-bold text-sm tracking-widest text-slate-800 border border-slate-300">
                  ||||| | |||| ||| ||||| {accessionForm.barcode}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Specimen Collection Tube / Container *
                </label>
                <select
                  value={accessionForm.sampleType}
                  onChange={(e) =>
                    setAccessionForm((prev) => ({
                      ...prev,
                      sampleType: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800"
                >
                  <option value="Whole Blood (Lavender EDTA)">
                    🟣 Lavender Top (EDTA) — Whole Blood / Hematology
                  </option>
                  <option value="Serum (Gold Top SST)">
                    🟡 Gold Top (SST with Gel Separator) — Chemistry / Serology
                  </option>
                  <option value="Citrated Plasma (Light Blue Top)">
                    🔵 Light Blue Top (Sodium Citrate) — Coagulation
                  </option>
                  <option value="Plasma (Green Top Heparin)">
                    🟢 Green Top (Sodium Heparin) — STAT Chemistry / Ammonia
                  </option>
                  <option value="Plasma (Gray Top Fluoride/Oxalate)">
                    🔘 Gray Top (Sodium Fluoride) — Glucose / Lactate
                  </option>
                  <option value="Mid-Stream Clean Catch Urine">
                    🧪 Sterile Specimen Cup — Urinalysis
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Phlebotomist / Collector Name
                </label>
                <input
                  type="text"
                  value={accessionForm.collectedBy}
                  onChange={(e) =>
                    setAccessionForm((prev) => ({
                      ...prev,
                      collectedBy: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccessionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAccession}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold cursor-pointer shadow-xs transition-colors"
                >
                  ✓ Confirm Accession &amp; Collect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RESULT ENTRY & VALIDATION WORKBENCH */}
      {showResultEntryModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <h3 className="font-bold text-sm">
                  Diagnostic Test Results Entry &amp; Sign-Off
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResultEntryModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs">
                <div>
                  <span className="font-bold text-indigo-950 text-sm">
                    {selectedOrder.patient}
                  </span>
                  <div className="text-indigo-800 font-mono text-[11px]">
                    MRN: {selectedOrder.mrn} · Accession:{" "}
                    {selectedOrder.accessionNo || "ACC-2026-9042"}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-indigo-900 text-xs">
                    {selectedOrder.test}
                  </span>
                  <div className="text-[11px] text-indigo-700">
                    {selectedOrder.analyzer || "Automated Analyzer"}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Test Component</th>
                      <th className="p-2.5">Result Value</th>
                      <th className="p-2.5">Unit</th>
                      <th className="p-2.5">Reference Range</th>
                      <th className="p-2.5 text-right">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {editableResults.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-medium text-slate-800">
                          {r.component}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={r.value}
                            onChange={(e) =>
                              handleResultChange(idx, e.target.value)
                            }
                            className={`w-28 p-1.5 font-mono font-bold text-xs border rounded ${
                              r.flag === "Critical" || r.flag === "HH"
                                ? "bg-rose-50 border-rose-400 text-rose-800"
                                : r.flag === "H"
                                  ? "bg-amber-50 border-amber-400 text-amber-900"
                                  : r.flag === "L"
                                    ? "bg-blue-50 border-blue-400 text-blue-900"
                                    : "bg-white border-slate-300 text-slate-800"
                            }`}
                          />
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">
                          {r.unit}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500">
                          {r.ref}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          <select
                            value={r.flag}
                            onChange={(e) => {
                              const val = e.target.value as any
                              setEditableResults((prev) => {
                                const next = [...prev]
                                next[idx].flag = val
                                return next
                              })
                            }}
                            className="bg-white border border-slate-200 rounded p-1 text-[11px] font-mono font-bold"
                          >
                            <option value="">Normal</option>
                            <option value="H">H (High)</option>
                            <option value="L">L (Low)</option>
                            <option value="Critical">🚨 Critical</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Pathologist / Clinical Comments &amp; Remarks
                </label>
                <textarea
                  rows={2}
                  value={clinicalComments}
                  onChange={(e) => setClinicalComments(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Signing Pathologist Electronic Stamp
                </label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleSaveAndVerifyResults(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold cursor-pointer transition-colors text-xs"
              >
                Save Draft
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowResultEntryModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAndVerifyResults(true)}
                  className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold cursor-pointer shadow-xs transition-colors text-xs"
                >
                  ✓ Verify &amp; Officially Release
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CRITICAL VALUE ALERT */}
      {showCriticalAlertModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-rose-300 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚨</span>
                <h3 className="font-bold text-sm">
                  Log Mandatory Critical Value Alert
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCriticalAlertModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="font-bold text-rose-950 text-sm">
                  Patient: {selectedOrder.patient} (MRN: {selectedOrder.mrn})
                </div>
                <div className="text-rose-900 font-semibold">
                  Test: {selectedOrder.test}
                </div>
                <div className="text-rose-800 text-[11px]">
                  Critical result values:{" "}
                  {selectedOrder.results
                    ?.filter(
                      (r) =>
                        r.flag === "Critical" ||
                        r.flag === "HH" ||
                        r.flag === "LL",
                    )
                    .map((r) => `${r.component}: ${r.value} ${r.unit}`)
                    .join(", ")}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Provider Contacted *
                </label>
                <input
                  type="text"
                  value={criticalNotifyForm.providerContacted}
                  onChange={(e) =>
                    setCriticalNotifyForm((prev) => ({
                      ...prev,
                      providerContacted: e.target.value,
                    }))
                  }
                  placeholder="e.g. Dr. Anderson, MD (Attending Physician)"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Communication Channel
                </label>
                <select
                  value={criticalNotifyForm.channel}
                  onChange={(e) =>
                    setCriticalNotifyForm((prev) => ({
                      ...prev,
                      channel: e.target.value,
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                >
                  <option value="Direct Phone Call">
                    📞 Direct In-Person Phone Call
                  </option>
                  <option value="Hospital Emergency Extension">
                    ☎ Hospital Emergency Extension
                  </option>
                  <option value="EHR Critical Alert Push">
                    💻 EHR Critical Alert System
                  </option>
                  <option value="Bedside In-Person">
                    🏥 Bedside In-Person Notification
                  </option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                <input
                  type="checkbox"
                  id="readback"
                  checked={criticalNotifyForm.readBackVerified}
                  onChange={(e) =>
                    setCriticalNotifyForm((prev) => ({
                      ...prev,
                      readBackVerified: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-rose-600 rounded"
                />
                <label
                  htmlFor="readback"
                  className="text-xs text-amber-900 font-semibold cursor-pointer"
                >
                  MANDATORY: Physician verbally read back the patient name, MRN,
                  and critical value for accuracy.
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCriticalAlertModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogCriticalNotification}
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold cursor-pointer shadow-xs transition-colors"
                >
                  ✓ Log &amp; Document Verbal Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: OFFICIAL NABL REPORT */}
      {showReportModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span>📄</span>
                <h3 className="font-bold text-sm">
                  Official Diagnostic Laboratory Report
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                >
                  <span>🖨️</span> Print Report
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="text-white/80 hover:text-white text-lg font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto flex-1 bg-white text-slate-900 font-sans">
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-blue-900 tracking-tight">
                    APOLLO CENTRAL CLINICAL LABORATORIES
                  </h2>
                  <div className="text-xs text-slate-600 font-medium">
                    Department of Pathology, Biochemistry &amp; Hematology
                  </div>
                  <div className="text-[11px] text-slate-500">
                    NABL Accredited Medical Testing Laboratory · ISO 15189:2012
                    Certified · Reg: NABL-MED-2026-8801
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="font-bold text-slate-900">
                    ACCESSION: {selectedOrder.accessionNo || "ACC-2026-9042"}
                  </div>
                  <div className="text-slate-500">
                    Date: {new Date().toLocaleDateString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div>
                    Patient Name:{" "}
                    <strong className="text-slate-900">
                      {selectedOrder.patient}
                    </strong>
                  </div>
                  <div>
                    MRN / UHID:{" "}
                    <strong className="font-mono text-slate-900">
                      {selectedOrder.mrn}
                    </strong>
                  </div>
                  <div>
                    Invoice Ref:{" "}
                    <strong className="text-blue-800 font-mono">
                      {selectedOrder.invoiceNo || "INV-2026-0801"}
                    </strong>
                  </div>
                </div>
                <div className="text-right">
                  <div>
                    Prescribing Doctor:{" "}
                    <strong className="text-slate-900">
                      {selectedOrder.provider}
                    </strong>
                  </div>
                  <div>
                    Specimen:{" "}
                    <strong>{selectedOrder.sampleType || "Whole Blood"}</strong>
                  </div>
                  <div>
                    Collected:{" "}
                    <strong>{selectedOrder.collected || "09:30 AM"}</strong>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide border-b pb-1">
                  Investigation: {selectedOrder.test}
                </h4>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-y border-slate-300">
                    <tr>
                      <th className="py-2 px-2">Investigation Component</th>
                      <th className="py-2 px-2">Observed Value</th>
                      <th className="py-2 px-2">Units</th>
                      <th className="py-2 px-2">
                        Biological Reference Interval
                      </th>
                      <th className="py-2 px-2 text-right">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {selectedOrder.results &&
                    selectedOrder.results.length > 0 ? (
                      selectedOrder.results.map((r, i) => (
                        <tr
                          key={i}
                          className={
                            r.flag === "Critical"
                              ? "bg-rose-50 font-bold"
                              : r.flag
                                ? "bg-amber-50/50"
                                : ""
                          }
                        >
                          <td className="py-2 px-2 text-slate-900">
                            {r.component}
                          </td>
                          <td className="py-2 px-2 font-mono font-bold text-slate-900">
                            {r.value}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-600">
                            {r.unit}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-600">
                            {r.ref}
                          </td>
                          <td
                            className={`py-2 px-2 text-right font-mono font-extrabold ${
                              r.flag === "Critical"
                                ? "text-rose-600"
                                : r.flag
                                  ? "text-amber-600"
                                  : "text-slate-400"
                            }`}
                          >
                            {r.flag || "NORMAL"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-4 text-center text-slate-400"
                        >
                          Results under analyzer processing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
                <span className="font-bold text-slate-900">
                  Clinical Remarks:
                </span>
                <p className="text-slate-700 text-[11.5px]">
                  {selectedOrder.comments ||
                    "Test results correlate with clinical indications. Quality control parameters within acceptable limits."}
                </p>
              </div>

              <div className="pt-8 flex items-end justify-between text-xs border-t border-slate-300">
                <div>
                  <div className="font-bold text-slate-900">
                    Technical Operator
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    {technician}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-900">
                    {selectedOrder.verifiedBy || "Dr. K. Srinivasan, MD"}
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Senior Consultant Clinical Pathologist
                  </div>
                  <div className="text-slate-400 font-mono text-[10px]">
                    Verified: {selectedOrder.verifiedAt || "10:00 AM"}
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
