/**
 * Lab order store -- the doctor -> reception/billing -> laboratory hand-off.
 *
 * When a consultation sheet is split, the investigation half lands here as one
 * LabOrder per visit. An order is deliberately NOT visible to the lab until
 * reception has taken payment for it: `Awaiting Billing` is a reception queue,
 * and only a paid order moves to `Billed` and appears on the lab's worklist.
 * That ordering is the whole point of the store, so it is enforced here rather
 * than left to each screen to remember (see `markBilled` / `getLabWorklist`).
 *
 * The medicine half of the same sheet goes to `PharmacyDatabase` instead -- the
 * pharmacy queue already existed and is reused as-is.
 */

const ORDERS_KEY = "hospai_lab_orders_v1"
const CHANNEL_NAME = "hospai_lab_orders"

export type LabOrderStatus = "Awaiting Billing" | "Billed" | "Sample Collected" | "In Progress" | "Completed" | "Cancelled"

export type LabBillingStatus = "Pending" | "Paid" | "Waived" | "Cancelled"

export interface LabOrderTest {
  id: string
  name: string
  category: string
  urgency: "Routine" | "STAT" | string
  price: number
  status: "Ordered" | "Sample Collected" | "In Progress" | "Completed"
  result?: string
  resultUnit?: string
  referenceRange?: string
  flag?: "H" | "L" | "Critical" | ""
  resultedAt?: string
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
 * Hospital rate card. Matched on a normalised substring so "Serum Troponin I"
 * bills at the troponin rate; anything unlisted falls back to DEFAULT_TEST_PRICE
 * so an order is never dispatched with a zero total.
 */
const PRICE_BOOK: { match: string ;price: number }[] = [
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
  const normalized = (testName || "").toLowerCase()
  // Longest match wins, so "ct angiogram" doesn't bill at the bare "ct" rate
  // only because that entry happens to come first in the list.
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

// Backfills fields every real LabOrder is supposed to have but an older,
// already-persisted browser record might not (the type has evolved since
// this store first shipped -- `billing` in particular used to not exist,
// and a stale record missing it crashes every screen that reads
// `order.billing.status` directly, e.g. DoctorPortal's PatientContextPanel).
// Normalizing once here, at the single chokepoint every read goes through,
// protects all of them instead of guarding each call site separately.
function normalizeOrder(order: LabOrder): LabOrder {
  return {
    ...order,
    tests: order.tests || [],
    history: order.history || [],
    billing: order.billing || {
      status: "Pending",
      subtotal: 0,
      discount: 0,
      total: 0,
    },
  }
}

function readOrders(): LabOrder[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(ORDERS_KEY)
    const parsed = raw ? (JSON.parse(raw) as LabOrder[]) : []
    return parsed.map(normalizeOrder)
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
    return readOrders().sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
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
      (o) => o.status === "Awaiting Billing" && o.billing.status === "Pending",
    )
  }

  /**
   * The laboratory's worklist. Unpaid orders are excluded by design -- the lab
   * only ever sees work that reception has already settled.
   */
  static getLabWorklist(): LabOrder[] {
    return this.getOrders().filter(
      (o) => o.status !== "Awaiting Billing" && o.status !== "Cancelled",
    )
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
    tests: { name: string ;category?: string ;urgency?: string }[]
  }): LabOrder {
    const orders = readOrders()
    const now = new Date().toISOString()

    const tests: LabOrderTest[] = input.tests.map((test, index) => ({
      id: `LT-${index + 1}`,
      name: test.name,
      category: test.category || "Pathology",
      urgency: test.urgency as LabOrderTest["urgency"] || "Routine",
      price: priceForTest(test.name),
      status: "Ordered",
    }))

    const subtotal = tests.reduce((sum, t) => sum + t.price, 0)
    const order: LabOrder = {
      id: nextSequence("LAB", orders.length),
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
        invoiceNo: nextSequence("INV", orders.length),
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

  /** Reception takes payment. This is what releases the order to the laboratory. */
  static markBilled(
    id: string,
    payment: {
      mode: NonNullable<LabOrder["billing"]["mode"]>
      discount?: number
      collectedBy: string
    },
  ): LabOrder | undefined {
    return this.mutate(id, (order) => {
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
          receiptNo: `RCP-${Date.now().toString(36).toUpperCase()}`,
          paidAt: new Date().toISOString(),
          collectedBy: payment.collectedBy,
        },
        history: [
          ...order.history,
          {
            at: new Date().toISOString(),
            actor: payment.collectedBy,
            action: "Payment collected",
            detail: `₹${total.toLocaleString("en-IN")} via ${payment.mode} -- released to laboratory`,
          },
        ],
      }
    })
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
              t.status === "Completed" ? t : { ...t, status },
            )
          : order.tests,
      history: [
        ...order.history,
        { at: new Date().toISOString(), actor, action: status },
      ],
    }))
  }

  static recordResult(
    id: string,
    testId: string,
    result: {
      value: string
      unit?: string
      referenceRange?: string
      flag?: LabOrderTest["flag"]
    },
    actor: string,
  ): LabOrder | undefined {
    return this.mutate(id, (order) => {
      const tests = order.tests.map((t) =>
        t.id === testId
          ? {
              ...t,
              status: "Completed" as const,
              result: result.value,
              resultUnit: result.unit,
              referenceRange: result.referenceRange,
              flag: (result.flag || "") as LabOrderTest["flag"],
              resultedAt: new Date().toISOString(),
            }
          : t,
      )
      const allDone = tests.every((t) => t.status === "Completed")
      return {
        ...order,
        tests,
        // A result arriving means the bench has started, whether or not anyone
        // pressed "Start processing" after collecting the sample.
        status: allDone
          ? "Completed"
          : order.status === "Billed" || order.status === "Sample Collected"
            ? "In Progress"
            : order.status,
        history: [
          ...order.history,
          {
            at: new Date().toISOString(),
            actor,
            action: "Result entered",
            detail: `${order.tests.find((t) => t.id === testId)?.name || testId}: ${result.value}`,
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
