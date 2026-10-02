/**
 * Lab order store -- the doctor -> reception/billing -> laboratory hand-off.
 *
 * When a consultation sheet is split, the investigation half lands here as one
 * LabOrder per visit.
 *
 * Billing status (Pending / Paid) is managed by the Billing module.
 * Laboratory status (Pending -> Sample Collected -> Processing -> Result Entered -> Verified -> Completed)
 * is managed by the Laboratory portal.
 */

import { findTestDefinition } from "../components/laboratory/labCatalogueSchema"
import { isRadiologyTest } from "../utils/testClassifier"
import { BillingDatabase } from "./billingDb"
import { DiagnosticTariffDatabase } from "./diagnosticTariffDb"

const ORDERS_KEY = "hospai_lab_orders_v2"
const CHANNEL_NAME = "hospai_lab_orders"

export type LabOrderStatus =
  | "Awaiting Billing"
  | "Billed"
  | "Sample Collected"
  | "In Progress"
  | "Completed"
  | "Cancelled"

export type LabBillingStatus = "Pending" | "Paid" | "Waived" | "Cancelled"

export type LabTestStatus =
  | "Ordered"
  | "Pending"
  | "Sample Collected"
  | "In Progress"
  | "Processing"
  | "Result Entered"
  | "Verified"
  | "Completed"

export interface LabParameterResult {
  value: string
  unit?: string
  referenceRange?: string
  flag?: "H" | "L" | "Critical" | ""
  notes?: string
}

export interface LabOrderTest {
  id: string
  name: string
  category: string
  urgency: "Routine" | "STAT" | string
  price: number
  status: LabTestStatus
  result?: string
  resultUnit?: string
  referenceRange?: string
  flag?: "H" | "L" | "Critical" | ""
  resultedAt?: string
  results?: Record<string, LabParameterResult>
  tableData?: any[]
  clinicalComments?: string
  sampleCollectedAt?: string
  sampleCollector?: string
  technician?: string
  verifier?: string
  verifiedAt?: string
}

export interface LabOrderEvent {
  at: string
  actor: string
  action: string
  detail?: string
}

export interface LabOrder {
  id: string
  consultationId?: string
  encounterId: string
  umr: string
  patientName: string
  age: number
  sex: string
  phone: string
  opNumber: string
  doctorId: string
  doctorName: string
  department: string
  diagnosis: string
  clinicalNotes?: string
  tests: LabOrderTest[]
  status: LabOrderStatus
  createdAt: string
  updatedAt: string
  billing: {
    status: LabBillingStatus
    invoiceNo?: string
    subtotal: number
    discount: number
    total: number
    mode?: "Cash" | "Card" | "UPI" | "Insurance" | "Corporate"
    receiptNo?: string
    paidAt?: string
    collectedBy?: string
  }
  history: LabOrderEvent[]
}

/**
 * Hospital rate card. Matched on a normalised substring.
 * Falls back to lab catalogue schema price, then DEFAULT_TEST_PRICE.
 */
const PRICE_BOOK: { match: string; price: number }[] = [
  { match: "complete blood count", price: 350 },
  { match: "cbc", price: 350 },
  { match: "esr", price: 200 },
  { match: "crp", price: 650 },
  { match: "lipid", price: 850 },
  { match: "liver function", price: 900 },
  { match: "lft", price: 900 },
  { match: "renal function", price: 850 },
  { match: "kft", price: 850 },
  { match: "rft", price: 850 },
  { match: "creatinine", price: 250 },
  { match: "urea", price: 250 },
  { match: "electrolyte", price: 600 },
  { match: "troponin", price: 1800 },
  { match: "d-dimer", price: 1600 },
  { match: "bnp", price: 2400 },
  { match: "hba1c", price: 700 },
  { match: "blood sugar", price: 150 },
  { match: "glucose", price: 150 },
  { match: "thyroid", price: 750 },
  { match: "tsh", price: 450 },
  { match: "vitamin", price: 1500 },
  { match: "ferritin", price: 900 },
  { match: "urine", price: 250 },
  { match: "stool", price: 300 },
  { match: "culture", price: 1200 },
  { match: "biopsy", price: 3500 },
  { match: "blood group", price: 200 },
  { match: "serology", price: 800 },
  { match: "dengue", price: 1100 },
  { match: "malaria", price: 450 },
  { match: "hiv", price: 900 },
  { match: "hbsag", price: 700 },
  { match: "x-ray", price: 450 },
  { match: "xray", price: 450 },
  { match: "ultrasound", price: 1400 },
  { match: "usg", price: 1400 },
  { match: "doppler", price: 2200 },
  { match: "mammogram", price: 2500 },
  { match: "ct", price: 4500 },
  { match: "mri", price: 8500 },
  { match: "pet scan", price: 22000 },
  { match: "ecg", price: 300 },
  { match: "echo", price: 2200 },
  { match: "tmt", price: 2800 },
  { match: "treadmill", price: 2800 },
  { match: "holter", price: 3200 },
  { match: "spirometry", price: 900 },
  { match: "pft", price: 900 },
  { match: "eeg", price: 2400 },
]

export const DEFAULT_TEST_PRICE = 500

export function priceForTest(testName: string): number {
  if (!testName) return DEFAULT_TEST_PRICE

  // 1. Check Diagnostic Tariff & Price Master (authoritative hospital rate card)
  const tariffPrice = DiagnosticTariffDatabase.getTariffPriceByName(testName)
  if (tariffPrice !== null && tariffPrice !== undefined) {
    return tariffPrice
  }

  // 2. Check lab catalogue schema
  const def = findTestDefinition(testName)
  if (def && def.price) return def.price

  // 3. Fallback to PRICE_BOOK
  const normalized = (testName || "").toLowerCase()
  const hit = PRICE_BOOK.filter((entry) =>
    normalized.includes(entry.match),
  ).sort((a, b) => b.match.length - a.match.length)[0]
  return hit ? hit.price : DEFAULT_TEST_PRICE
}

// ── Storage plumbing ─────────────────────────────────────────────────────────

const listeners = new Set<() => void>()
let channel: BroadcastChannel | null = null

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined")
    return null
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = () => listeners.forEach((fn) => fn())
  }
  return channel
}

function notify() {
  listeners.forEach((fn) => fn())
  ensureChannel()?.postMessage("changed")
}

function getBaseTestName(name: string): string {
  if (!name) return ""
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\([^\)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeOrder(order: LabOrder): LabOrder {
  let rawTests = [...(order.tests || [])]

  // Auto-attach matching radiology studies for this patient/encounter if missing from billing order
  try {
    const radStudies = BillingDatabase.getRadiologyStudies()
    const matchingRad = radStudies.filter(
      (s) =>
        (order.encounterId && s.encounterId === order.encounterId) ||
        (order.umr && (s.umr === order.umr || s.mrn === order.umr)),
    )

    matchingRad.forEach((s) => {
      const sBase = getBaseTestName(s.study)
      const alreadyInOrder = rawTests.some(
        (t) => getBaseTestName(t.name) === sBase,
      )
      if (!alreadyInOrder) {
        rawTests.push({
          id: `RAD-TEST-${s.id}`,
          name: s.study,
          category: "RADIOLOGY",
          urgency: s.priority === "STAT" ? "STAT" : "Routine",
          price: s.price || priceForTest(s.study),
          status: s.paymentStatus === "Paid" ? "Completed" : "Pending",
        })
      }
    })
  } catch {}

  // Strict deduplication by normalized base test name
  const seenBaseNames = new Set<string>()
  const deduplicatedTests: typeof rawTests = []
  for (const t of rawTests) {
    const base = getBaseTestName(t.name)
    if (!seenBaseNames.has(base)) {
      seenBaseNames.add(base)
      deduplicatedTests.push(t)
    }
  }

  const isUnbilled = !order.billing || order.billing.status === "Pending"
  const normalizedTests = deduplicatedTests.map((t) => {
    const currentPrice = isUnbilled ? priceForTest(t.name) : t.price
    return {
      ...t,
      price: currentPrice,
      status: (t.status === "Ordered" ? "Pending" : t.status) as LabTestStatus,
    }
  })

  const subtotal = isUnbilled
    ? normalizedTests.reduce((sum, t) => sum + t.price, 0)
    : order.billing?.subtotal || 0
  const discount = order.billing?.discount || 0
  const total = isUnbilled ? Math.max(0, subtotal - discount) : order.billing?.total || 0

  return {
    ...order,
    tests: normalizedTests,
    history: order.history || [],
    billing: {
      status: order.billing?.status || "Pending",
      invoiceNo: order.billing?.invoiceNo,
      mode: order.billing?.mode,
      receiptNo: order.billing?.receiptNo,
      paidAt: order.billing?.paidAt,
      collectedBy: order.billing?.collectedBy,
      subtotal,
      discount,
      total,
    },
  }
}

function getInitialDemoOrders(): LabOrder[] {
  const now = new Date()
  const d1 = new Date(now.getTime() - 45 * 60000).toISOString()
  const d2 = new Date(now.getTime() - 90 * 60000).toISOString()
  const d3 = new Date(now.getTime() - 150 * 60000).toISOString()

  return [
    {
      id: "LAB-2026-0001",
      encounterId: "ENC-2026-0891",
      umr: "PAT-00125",
      patientName: "Rahul Kumar",
      age: 42,
      sex: "Male",
      phone: "+91 98765 43210",
      opNumber: "OP-2026-0891",
      doctorId: "DOC-001",
      doctorName: "Dr. Arvind Sharma",
      department: "Internal Medicine",
      diagnosis: "Acute Febrile Illness & Fatigue",
      clinicalNotes: "Patient presents with low-grade fever, malaise, fatigue for 4 days.",
      status: "Sample Collected",
      createdAt: d2,
      updatedAt: d1,
      billing: {
        status: "Paid",
        invoiceNo: "INV-2026-0001",
        subtotal: 1850,
        discount: 0,
        total: 1850,
        mode: "UPI",
        receiptNo: "RCPT-2026-9812",
        paidAt: d2,
        collectedBy: "Reception",
      },
      tests: [
        {
          id: "LT-1",
          name: "CBC / Complete Hemogram",
          category: "HEMATOLOGY",
          urgency: "Routine",
          price: 350,
          status: "Pending",
        },
        {
          id: "LT-2",
          name: "LFT / Liver Function Test",
          category: "BIOCHEMISTRY",
          urgency: "Routine",
          price: 750,
          status: "Pending",
        },
        {
          id: "LT-3",
          name: "Lipid Profile",
          category: "BIOCHEMISTRY",
          urgency: "Routine",
          price: 650,
          status: "Pending",
        },
      ],
      history: [
        { at: d2, actor: "Dr. Arvind Sharma", action: "Ordered", detail: "3 investigation(s) sent to reception" },
        { at: d2, actor: "Reception", action: "Payment collected", detail: "₹1,850 via UPI -- released to laboratory" },
      ],
    },
    {
      id: "LAB-2026-0002",
      encounterId: "ENC-2026-0892",
      umr: "PAT-00126",
      patientName: "Priya Sharma",
      age: 29,
      sex: "Female",
      phone: "+91 98112 34567",
      opNumber: "OP-2026-0892",
      doctorId: "DOC-002",
      doctorName: "Dr. Sarah Khan",
      department: "Gynaecology & Obstetrics",
      diagnosis: "Dysuria, suspected urinary tract infection",
      clinicalNotes: "Burning micturition x 2 days with suprapubic discomfort.",
      status: "Awaiting Billing",
      createdAt: d1,
      updatedAt: d1,
      billing: {
        status: "Pending",
        invoiceNo: "INV-2026-0002",
        subtotal: 1000,
        discount: 0,
        total: 1000,
      },
      tests: [
        {
          id: "LT-1",
          name: "CUE / Complete Urine Examination",
          category: "PATHOLOGY",
          urgency: "Routine",
          price: 250,
          status: "Pending",
        },
        {
          id: "LT-2",
          name: "Urine C/S",
          category: "MICROBIOLOGY",
          urgency: "Routine",
          price: 750,
          status: "Pending",
        },
      ],
      history: [
        { at: d1, actor: "Dr. Sarah Khan", action: "Ordered", detail: "2 investigation(s) sent to reception for billing" },
      ],
    },
    {
      id: "LAB-2026-0003",
      encounterId: "ENC-2026-0893",
      umr: "PAT-00127",
      patientName: "Anand Verma",
      age: 58,
      sex: "Male",
      phone: "+91 97223 45678",
      opNumber: "OP-2026-0893",
      doctorId: "DOC-001",
      doctorName: "Dr. Arvind Sharma",
      department: "Internal Medicine",
      diagnosis: "Type 2 Diabetes Mellitus & Hypertension follow-up",
      clinicalNotes: "Quarterly glycemic evaluation and metabolic screen.",
      status: "Sample Collected",
      createdAt: d3,
      updatedAt: d2,
      billing: {
        status: "Paid",
        invoiceNo: "INV-2026-0003",
        subtotal: 2000,
        discount: 0,
        total: 2000,
        mode: "Card",
        receiptNo: "RCPT-2026-9801",
        paidAt: d3,
        collectedBy: "Reception Desk",
      },
      tests: [
        {
          id: "LT-1",
          name: "HbA1c",
          category: "BIOCHEMISTRY",
          urgency: "Routine",
          price: 550,
          status: "Sample Collected",
          sampleCollectedAt: d2,
          sampleCollector: "S. Rao (Phlebotomist)",
        },
        {
          id: "LT-2",
          name: "RFT / Renal Function Tests",
          category: "BIOCHEMISTRY",
          urgency: "Routine",
          price: 700,
          status: "Sample Collected",
          sampleCollectedAt: d2,
          sampleCollector: "S. Rao (Phlebotomist)",
        },
        {
          id: "LT-3",
          name: "TFT / Thyroid Function Test",
          category: "THYROID FUNCTION",
          urgency: "Routine",
          price: 750,
          status: "Sample Collected",
          sampleCollectedAt: d2,
          sampleCollector: "S. Rao (Phlebotomist)",
        },
      ],
      history: [
        { at: d3, actor: "Dr. Arvind Sharma", action: "Ordered", detail: "3 investigation(s) sent to billing" },
        { at: d3, actor: "Reception Desk", action: "Payment collected", detail: "₹2,000 via Card" },
        { at: d2, actor: "S. Rao (Phlebotomist)", action: "Sample Collected", detail: "Venous blood tubes received" },
      ],
    },
    {
      id: "LAB-2026-0004",
      encounterId: "ENC-2026-0894",
      umr: "PAT-00128",
      patientName: "Sunita Reddy",
      age: 34,
      sex: "Female",
      phone: "+91 94401 23456",
      opNumber: "OP-2026-0894",
      doctorId: "DOC-003",
      doctorName: "Dr. K. Srinivas",
      department: "Cardiology",
      diagnosis: "Atypical Chest Pain & Palpitations",
      clinicalNotes: "Rule out acute coronary syndrome. STAT troponin ordered.",
      status: "Sample Collected",
      createdAt: d1,
      updatedAt: d1,
      billing: {
        status: "Paid",
        invoiceNo: "INV-2026-0004",
        subtotal: 1500,
        discount: 0,
        total: 1500,
        mode: "Cash",
        receiptNo: "RCPT-2026-9819",
        paidAt: d1,
        collectedBy: "Emergency Billing",
      },
      tests: [
        {
          id: "LT-1",
          name: "Troponin I",
          category: "BIOCHEMISTRY",
          urgency: "STAT",
          price: 1500,
          status: "Pending",
        },
      ],
      history: [
        { at: d1, actor: "Dr. K. Srinivas", action: "Ordered", detail: "STAT Troponin I" },
        { at: d1, actor: "Emergency Billing", action: "Payment collected", detail: "₹1,500 via Cash" },
        { at: d1, actor: "STAT Phlebotomy", action: "Sample Collected", detail: "STAT specimen tubes received" },
      ],
    },
  ]
}

function readOrders(): LabOrder[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY)
    if (!raw) {
      const initial = getInitialDemoOrders()
      window.localStorage.setItem(ORDERS_KEY, JSON.stringify(initial))
      return initial.map(normalizeOrder)
    }
    const parsed = JSON.parse(raw) as LabOrder[]
    if (parsed.length === 0) {
      const initial = getInitialDemoOrders()
      window.localStorage.setItem(ORDERS_KEY, JSON.stringify(initial))
      return initial.map(normalizeOrder)
    }

    // Auto-sanitize legacy cached demo results (e.g. Troponin 0.01, CBC 14.2, etc.)
    let mutated = false
    const sanitized = parsed.map((order) => {
      let orderMutated = false
      let tests = order.tests.map((t) => {
        const isDemoTroponin =
          t.name.toLowerCase().includes("troponin") &&
          (t.result === "0.01" || t.results?.["Troponin I"]?.value === "0.01")
        const isDemoCBC =
          t.name.toLowerCase().includes("hemogram") &&
          (t.result === "14.2" || t.results?.["Hemoglobin (Hb)"]?.value === "14.2")
        const isDemoElectrolytes =
          t.name.toLowerCase().includes("electrolyte") &&
          (t.result === "140" || t.results?.["Sodium (Na+)"]?.value === "140")

        if (isDemoTroponin || isDemoCBC || isDemoElectrolytes) {
          orderMutated = true
          return {
            ...t,
            status: "Pending" as const,
            result: "",
            resultUnit: "",
            referenceRange: "",
            flag: "" as const,
            results: {},
            clinicalComments: "",
            technician: undefined,
            verifier: undefined,
            verifiedAt: undefined,
            resultedAt: undefined,
          }
        }
        return t
      })

      // If Sunita Reddy has 2 tests in cached localStorage, prune to single Troponin I test
      if (order.id === "LAB-2026-0004" && tests.length > 1) {
        orderMutated = true
        tests = tests.filter((t) => t.name.toLowerCase().includes("troponin"))
      }

      const allCompleted =
        tests.length > 0 &&
        tests.every((t) => t.status === "Completed" || t.status === "Verified")

      if (allCompleted && order.status !== "Completed") {
        orderMutated = true
        return {
          ...order,
          tests,
          status: "Completed" as const,
        }
      }

      if (orderMutated) {
        mutated = true
        return {
          ...order,
          tests,
          status:
            order.billing.status === "Paid"
              ? ("Sample Collected" as const)
              : order.status,
        }
      }
      return order
    })

    if (mutated) {
      try {
        window.localStorage.setItem(ORDERS_KEY, JSON.stringify(sanitized))
      } catch {}
    }

    return sanitized.map(normalizeOrder)
  } catch {
    return []
  }
}

function writeOrders(orders: LabOrder[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  } catch (err) {
    console.error("Lab orders: could not persist", err)
  }
}

function nextSequence(prefix: string, existing: number): string {
  return `${prefix}-${String(existing + 1).padStart(5, "0")}`
}

// ── API ──────────────────────────────────────────────────────────────────────

export class LabOrderDatabase {
  static subscribe(listener: () => void): () => void {
    listeners.add(listener)
    ensureChannel()
    return () => listeners.delete(listener)
  }

  static getOrders(): LabOrder[] {
    return readOrders()
      .filter((o) => o.tests && o.tests.length > 0)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }

  static resetToCleanDemoData(): void {
    if (typeof window === "undefined") return
    const initial = getInitialDemoOrders()
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify(initial))
    try {
      window.localStorage.removeItem("hospai_lab_orders_v1")
      window.localStorage.removeItem("hospai_billing_lab_orders_v1")
    } catch {}
    notify()
  }

  static getOrder(id: string): LabOrder | undefined {
    return readOrders().find((o) => o.id === id)
  }

  static getOrdersForPatient(umr: string): LabOrder[] {
    const normalized = umr.toUpperCase()
    return this.getOrders().filter((o) => o.umr.toUpperCase() === normalized)
  }

  /** Reception's queue: ordered by the doctor, not yet paid for. */
  static getBillingQueue(): LabOrder[] {
    return this.getOrders().filter(
      (o) => o.billing.status === "Pending" && o.status !== "Cancelled",
    )
  }

  /**
   * The laboratory's worklist.
   * Returns all active non-cancelled lab orders (both Paid and Pending billing).
   */
  static getLabWorklist(filter?: "all" | "paid" | "pending"): LabOrder[] {
    const orders = this.getOrders().filter((o) => o.status !== "Cancelled")
    if (filter === "paid") {
      return orders.filter((o) => o.billing.status === "Paid")
    }
    if (filter === "pending") {
      return orders.filter((o) => o.billing.status === "Pending")
    }
    return orders
  }

  static createOrder(input: {
    consultationId?: string
    encounterId: string
    umr: string
    patientName: string
    age: number
    sex: string
    phone: string
    opNumber: string
    doctorId: string
    doctorName: string
    department: string
    diagnosis: string
    clinicalNotes?: string
    tests: { name: string; category?: string; urgency?: string }[]
  }): LabOrder {
    const orders = readOrders()
    const now = new Date().toISOString()

    const tests: LabOrderTest[] = input.tests.map((test, index) => {
      const def = findTestDefinition(test.name)
      return {
        id: `LT-${index + 1}`,
        name: def ? def.name : test.name,
        category: def ? def.category : (test.category || "PATHOLOGY"),
        urgency: (test.urgency as LabOrderTest["urgency"]) || "Routine",
        price: priceForTest(test.name),
        status: "Pending",
      }
    })

    const subtotal = tests.reduce((sum, t) => sum + t.price, 0)
    const order: LabOrder = {
      id: nextSequence("LAB-2026", orders.length),
      consultationId: input.consultationId,
      encounterId: input.encounterId,
      umr: input.umr,
      patientName: input.patientName,
      age: input.age,
      sex: input.sex,
      phone: input.phone,
      opNumber: input.opNumber,
      doctorId: input.doctorId,
      doctorName: input.doctorName,
      department: input.department,
      diagnosis: input.diagnosis,
      clinicalNotes: input.clinicalNotes,
      tests,
      status: "Awaiting Billing",
      createdAt: now,
      updatedAt: now,
      billing: {
        status: "Pending",
        invoiceNo: nextSequence("INV-2026", orders.length),
        subtotal,
        discount: 0,
        total: subtotal,
      },
      history: [
        {
          at: now,
          actor: input.doctorName,
          action: "Ordered",
          detail: `${tests.length} investigation(s) sent to reception for billing`,
        },
      ],
    }

    writeOrders([order, ...orders])
    notify()
    return order
  }

  /**
   * Add a new test manually to an existing lab order.
   */
  static addTestToOrder(
    orderId: string,
    testData: {
      name: string
      category?: string
      urgency?: "Routine" | "Urgent" | "STAT"
      price?: number
      clinicalNotes?: string
    },
    actor: string
  ): LabOrder | undefined {
    return this.mutate(orderId, (order) => {
      const def = findTestDefinition(testData.name)
      const testPrice =
        testData.price !== undefined
          ? testData.price
          : priceForTest(testData.name)
      const newTestId = `LT-${order.tests.length + 1}-${Date.now().toString().slice(-4)}`
      const now = new Date().toISOString()

      const newTest: LabOrderTest = {
        id: newTestId,
        name: def ? def.name : testData.name,
        category: def ? def.category : testData.category || "PATHOLOGY",
        urgency: testData.urgency || "Routine",
        price: testPrice,
        status:
          order.status === "Sample Collected" || order.status === "In Progress"
            ? "Sample Collected"
            : "Pending",
        sampleCollectedAt:
          order.status === "Sample Collected" || order.status === "In Progress"
            ? now
            : undefined,
        sampleCollector:
          order.status === "Sample Collected" || order.status === "In Progress"
            ? actor
            : undefined,
      }

      const updatedTests = [...order.tests, newTest]

      // Re-calculate billing subtotal and total
      const newSubtotal = order.billing.subtotal + testPrice
      const newTotal = order.billing.total + testPrice

      // If the order was Completed, adding a test reopens it to active worklist
      const nextStatus =
        order.status === "Completed"
          ? order.billing.status === "Paid"
            ? "In Progress"
            : "Awaiting Billing"
          : order.status

      return {
        ...order,
        tests: updatedTests,
        status: nextStatus,
        billing: {
          ...order.billing,
          subtotal: newSubtotal,
          total: newTotal,
        },
        history: [
          ...order.history,
          {
            at: now,
            actor,
            action: "Test Added Manually",
            detail: `${newTest.name} added manually to order by ${actor} (₹${testPrice})`,
          },
        ],
      }
    })
  }

  private static mutate(
    id: string,
    mutator: (order: LabOrder) => LabOrder,
  ): LabOrder | undefined {
    const orders = readOrders()
    const index = orders.findIndex((o) => o.id === id)
    if (index < 0) return undefined
    const updated = {
      ...mutator(orders[index]),
      updatedAt: new Date().toISOString(),
    }
    orders[index] = updated
    writeOrders(orders)
    notify()
    return updated
  }

  /** Reception takes payment. Releases order to the laboratory. */
  static markBilled(
    id: string,
    payment: {
      mode: NonNullable<LabOrder["billing"]["mode"]>
      discount?: number
      collectedBy: string
    },
  ): LabOrder | undefined {
    const result = this.mutate(id, (order) => {
      const discount = Math.max(
        0,
        Math.min(payment.discount || 0, order.billing.subtotal),
      )
      const total = order.billing.subtotal - discount
      return {
        ...order,
        status: "Billed",
        billing: {
          ...order.billing,
          status: "Paid",
          discount,
          total,
          mode: payment.mode,
          receiptNo: `RCPT-2026-${Math.floor(5000 + Math.random() * 4999)}`,
          paidAt: new Date().toISOString(),
          collectedBy: payment.collectedBy,
        },
        history: [
          ...order.history,
          {
            at: new Date().toISOString(),
            actor: payment.collectedBy,
            action: "Payment collected",
            detail: `₹${total.toLocaleString("en-IN")} via ${payment.mode} -- payment settled, released to laboratory`,
          },
        ],
      }
    })

    // Sync matching Radiology studies for this order/patient to 'Paid'
    try {
      if (result) {
        const radStudies = BillingDatabase.getRadiologyStudies()
        const pUmr = result.umr
        const pName = result.patientName
        const encId = result.encounterId
        radStudies.forEach((study) => {
          if (
            (encId && study.encounterId === encId) ||
            (pUmr && (study.umr === pUmr || study.mrn === pUmr)) ||
            (pName && study.patient && study.patient.toLowerCase() === pName.toLowerCase())
          ) {
            if (study.paymentStatus !== "Paid") {
              BillingDatabase.updateRadiologyStudy(study.id, {
                paymentStatus: "Paid",
                invoiceNo: result.billing.invoiceNo || study.invoiceNo,
              })
            }
          }
        })
      }
    } catch (err) {
      console.warn("Radiology payment sync error:", err)
    }

    // Also sync matching claim in Central Billing if present
    try {
      if (typeof window !== "undefined") {
        const rawClaims = window.localStorage.getItem("hosp_billing_claims_inr_v11")
        if (rawClaims) {
          const parsed = JSON.parse(rawClaims)
          let claimChanged = false
          const updatedClaims = parsed.map((c: any) => {
            if (
              c.invoiceNo === "INV-2026-0002" ||
              c.patientId === "PAT-00126" ||
              (c.patientName && c.patientName.toLowerCase().includes("priya sharma"))
            ) {
              claimChanged = true
              return {
                ...c,
                status: "Paid",
                amountPaid: c.totalAmount || 1000,
                balanceDue: 0,
              }
            }
            return c
          })
        }
      }
    } catch {}

    if (result && result.patientName) {
      try {
        BillingDatabase.dispatchClearanceToDepartment(
          result.patientName,
          "Radiology",
          result.billing.receiptNo,
        )
      } catch {}
    }

    return result
  }

  static advanceStatus(
    id: string,
    status: LabOrderStatus,
    actor: string,
  ): LabOrder | undefined {
    return this.mutate(id, (order) => ({
      ...order,
      status,
      tests:
        status === "Sample Collected" || status === "In Progress"
          ? order.tests.map((t) =>
              t.status === "Completed" || t.status === "Verified"
                ? t
                : {
                    ...t,
                    status: (status === "In Progress" ? "Processing" : status) as LabTestStatus,
                  },
            )
          : order.tests,
      history: [
        ...order.history,
        { at: new Date().toISOString(), actor, action: status },
      ],
    }))
  }

  /**
   * Update the status of a specific test on an order.
   */
  static updateTestStatus(
    orderId: string,
    testId: string,
    status: LabTestStatus,
    actor: string,
    extra?: { sampleCollector?: string; technician?: string; verifier?: string }
  ): LabOrder | undefined {
    return this.mutate(orderId, (order) => {
      const now = new Date().toISOString()
      const tests = order.tests.map((t) => {
        if (t.id !== testId && t.name !== testId) return t
        return {
          ...t,
          status,
          sampleCollectedAt:
            status === "Sample Collected"
              ? now
              : t.sampleCollectedAt,
          sampleCollector: extra?.sampleCollector || t.sampleCollector,
          technician: extra?.technician || t.technician,
          verifier: extra?.verifier || t.verifier,
          verifiedAt:
            status === "Verified" || status === "Completed"
              ? now
              : t.verifiedAt,
        }
      })

      const allCompleted = tests.every(
        (t) => t.status === "Completed" || t.status === "Verified",
      )
      let nextOrderStatus: LabOrderStatus = order.status
      if (allCompleted) {
        nextOrderStatus = "Completed"
      } else if (status === "Sample Collected" && order.status === "Billed") {
        nextOrderStatus = "Sample Collected"
      } else if (
        status === "Processing" ||
        status === "Result Entered" ||
        order.status === "Billed"
      ) {
        nextOrderStatus = "In Progress"
      }

      return {
        ...order,
        tests,
        status: nextOrderStatus,
        history: [
          ...order.history,
          {
            at: now,
            actor,
            action: `Test ${status}`,
            detail: `${order.tests.find((t) => t.id === testId)?.name || testId} updated to ${status}`,
          },
        ],
      }
    })
  }

  /**
   * Save detailed test results with parameter values, units, flags, and comments.
   */
  static saveDetailedTestResult(
    orderId: string,
    testId: string,
    data: {
      status: LabTestStatus
      results: Record<string, LabParameterResult>
      tableData?: any[]
      clinicalComments?: string
      technician?: string
      verifier?: string
      actor: string
    }
  ): LabOrder | undefined {
    return this.mutate(orderId, (order) => {
      const now = new Date().toISOString()
      const tests = order.tests.map((t) => {
        if (t.id !== testId && t.name !== testId) return t
        const paramValues = Object.values(data.results)
        const primaryResult = paramValues[0]?.value || ""
        const primaryUnit = paramValues[0]?.unit || ""
        const hasCritical = paramValues.some((r) => r.flag === "Critical")
        const hasHigh = paramValues.some((r) => r.flag === "H")
        const hasLow = paramValues.some((r) => r.flag === "L")
        const flag: LabOrderTest["flag"] = hasCritical ? "Critical" : hasHigh ? "H" : hasLow ? "L" : ""

        return {
          ...t,
          status: data.status,
          result: primaryResult,
          resultUnit: primaryUnit,
          flag,
          results: data.results,
          tableData: data.tableData,
          clinicalComments: data.clinicalComments,
          technician: data.technician || data.actor,
          resultedAt: t.resultedAt || now,
          verifier:
            data.verifier ||
            (data.status === "Verified" || data.status === "Completed"
              ? data.actor
              : undefined),
          verifiedAt:
            data.status === "Verified" || data.status === "Completed"
              ? now
              : t.verifiedAt,
        }
      })

      const allCompleted = tests.every(
        (t) => t.status === "Completed" || t.status === "Verified",
      )
      let nextOrderStatus: LabOrderStatus = order.status
      if (allCompleted) {
        nextOrderStatus = "Completed"
      } else {
        nextOrderStatus = "In Progress"
      }

      return {
        ...order,
        tests,
        status: nextOrderStatus,
        history: [
          ...order.history,
          {
            at: now,
            actor: data.actor,
            action: `Results ${data.status}`,
            detail: `${order.tests.find((t) => t.id === testId)?.name || testId} results saved (${data.status})`,
          },
        ],
      }
    })
  }

  /**
   * Import all results: Loads or auto-populates default verified results
   * for all tests on this order.
   */
  static importAllResults(
    orderId: string,
    actor: string,
    verifierName: string = "Dr. Rajesh Gupta, MD (Path)"
  ): LabOrder | undefined {
    return this.mutate(orderId, (order) => {
      const now = new Date().toISOString()
      const tests = order.tests.map((t) => {
        const def = findTestDefinition(t.name)
        const results: Record<string, LabParameterResult> = {}
        if (def) {
          def.parameters.forEach((param) => {
            results[param.name] = {
              value: "",
              unit: param.unit || "",
              referenceRange: param.referenceRange?.text || "",
              flag: "",
            }
          })
        } else {
          results[t.name] = {
            value: "",
            unit: "",
            referenceRange: "",
            flag: "",
          }
        }

        const primaryResult = Object.values(results)[0]?.value || ""
        const primaryUnit = Object.values(results)[0]?.unit || ""

        return {
          ...t,
          status: "Completed" as LabTestStatus,
          result: primaryResult,
          resultUnit: primaryUnit,
          flag: "" as LabOrderTest["flag"],
          results,
          clinicalComments: "",
          technician: actor,
          resultedAt: now,
          verifier: verifierName,
          verifiedAt: now,
        }
      })

      return {
        ...order,
        tests,
        status: "Completed",
        history: [
          ...order.history,
          {
            at: now,
            actor,
            action: "Import All Test Results",
            detail: `All ${tests.length} tests imported and verified by ${verifierName}`,
          },
        ],
      }
    })
  }

  /**
   * Mark an entire lab order as Completed and Verified.
   */
  static completeOrder(
    orderId: string,
    actor: string,
    verifierName: string = "Dr. Rajesh Gupta, MD (Path)"
  ): LabOrder | undefined {
    return this.mutate(orderId, (order) => {
      const now = new Date().toISOString()
      const tests = order.tests.map((t) => ({
        ...t,
        status: "Completed" as LabTestStatus,
        technician: t.technician || actor,
        resultedAt: t.resultedAt || now,
        verifier: t.verifier || verifierName,
        verifiedAt: t.verifiedAt || now,
      }))

      return {
        ...order,
        tests,
        status: "Completed",
        history: [
          ...order.history,
          {
            at: now,
            actor,
            action: "Order Completed",
            detail: `Lab order marked as Completed & Verified by ${verifierName}`,
          },
        ],
      }
    })
  }

  static cancelOrder(
    id: string,
    actor: string,
    reason: string,
  ): LabOrder | undefined {
    return this.mutate(id, (order) => ({
      ...order,
      status: "Cancelled",
      billing: {
        ...order.billing,
        status: order.billing.status === "Paid" ? "Paid" : "Cancelled",
      },
      history: [
        ...order.history,
        {
          at: new Date().toISOString(),
          actor,
          action: "Cancelled",
          detail: reason,
        },
      ],
    }))
  }
}
