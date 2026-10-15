import { seedPharmacyHospitalData, seedTestPrescriptionForSelling } from "./pharmacySeedData"

export interface AppUser {
  id: string
  name: string
  role: string
  department: string
  email: string
  phone: string
  status: "Active" | "Inactive"
  lastLogin: string
}

export interface AppNotification {
  id: string
  title: string
  message: string
  type: "alert" | "info" | "success" | "warning" | "critical"
  timestamp: string
  read: boolean
  actionPage?: string
  actionLabel?: string
  category?: "stock" | "expiry" | "prescription" | "transfer" | "return" | "general"
}

export interface AppAuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  module: string
  record: string
  details: string
  // Origin address, when something upstream recorded one. Entries written by
  // `logAudit` in the browser have no way to know it, so this stays unset and
  // the log renders it as unknown -- an audit trail must not invent an origin.
  ip?: string
}

export interface AppCategory {
  id: string
  categoryName: string
  description: string
  status: "Active" | "Inactive"
  createdAt: string
}

export interface AppSupplier {
  id: string
  supplierName: string
  contactInformation: string
  phone?: string
  email?: string
  address: string
  gstInformation: string
  licenseDetails: string
  paymentTerms: string
  status: "Active" | "Inactive"
  createdAt: string
}

export interface AppMedicine {
  id: string
  medicineName: string
  genericName: string
  brandName: string
  hsnCode?: string
  packing?: string
  categoryId?: string
  manufacturer: string
  dosageForm: string
  strength: string
  unit: string
  barcode: string
  taxPercentage: number
  reorderLevel: number
  storageCondition: string
  scheduleType: string
  controlledSubstanceFlag: boolean
  activeStatus: "Active" | "Inactive"
  createdAt: string
  mnfCode?: string
  binNo?: string
  supplierName?: string
}

// FEFO enabled Batch
export interface AppBatch {
  id: string
  medicineId: string
  batchNumber: string
  expiryDate: string
  manufacturingDate: string
  availableQuantity: number // For FEFO
  purchasePrice: number
  // Quantity received and the retail price, as `addBatch` actually stores them.
  // The GRN path (PharmacyOld) additionally fills in the procurement fields
  // below; batches created by `addBatch` leave them unset, so everything the
  // lean path omits is optional rather than a lie about what is on disk.
  quantity: number
  mrp: number
  discount?: number
  grnId?: string
  status?: string
  initialQuantity?: number
  sellingPrice?: number
  supplierId?: string
  supplierName?: string
  invoiceNumber?: string
  location?: string // Phase 4 - Transfer capability
  createdAt: string
}

// Procurement - Phase 2
export interface PurchaseOrderItem {
  medicineId: string
  quantity: number
  purchasePrice: number
  taxPercentage: number
  discount: number
  totalAmount: number
}

export type POStatus = "Draft" | "Submitted" | "Approved" | "Ordered" | "Partially Received" | "Received" | "Cancelled"

export interface AppPurchaseOrder {
  id: string
  supplierId: string
  poDate: string
  expectedDeliveryDate: string
  status: POStatus
  items: PurchaseOrderItem[]
  totalOrderValue: number
  createdAt: string
  createdBy: string // user id
}

export interface AppGRNItem {
  medicineId: string
  orderedQty: number
  receivedQty: number
  batchNumber: string
  manufacturingDate: string
  expiryDate: string
  purchasePrice: number
  sellingPrice: number
}

export interface AppGRN {
  id: string
  purchaseOrderId: string
  supplierId: string
  invoiceNumber: string
  grnDate: string
  items: AppGRNItem[]
  receivedBy: string // user id
  createdAt: string
}

export type StockTransactionType = "PURCHASE_RECEIVED" | "DISPENSED" | "RETURNED" | "EXPIRED" | "ADJUSTMENT" | "DAMAGED" | "WRITE_OFF" | "TRANSFER_OUT" | "TRANSFER_IN" | "SUPPLIER_RETURN"

export interface AppStockTransaction {
  id: string
  date: string
  medicineId: string
  batchId: string
  quantity: number
  transactionType: StockTransactionType
  userId: string
  reason?: string
  patientId?: string
  billId?: string
  prescriptionId?: string
}

// Phase 3 - Dispensing & Billing

export type PrescriptionSource = "DIGITAL" | "UPLOADED_IMAGE" | "OCR"
export type PrescriptionStatus = "Draft" | "Sent To Pharmacy" | "Received" | "OCR Processing" | "Verification Pending" | "Verified" | "Approved" | "Preparing" | "Ready For Dispensing" | "Dispensed" | "Cancelled" | "Rejected"

/**
 * Statuses that mean a prescription is still waiting on the pharmacist.
 *
 * Shared rather than re-listed per screen: the dashboard's "awaiting
 * verification" tile used its own shorter list and omitted "Sent To Pharmacy",
 * which is exactly the status the doctor portal dispatches with -- so a
 * prescription sat in the verification queue while the pharmacist's landing
 * screen told them there was nothing to do.
 */
export const AWAITING_VERIFICATION_STATUSES: PrescriptionStatus[] = [
  "Sent To Pharmacy",
  "Received",
  "OCR Processing",
  "Verification Pending",
]

export function isAwaitingVerification(status: PrescriptionStatus): boolean {
  return AWAITING_VERIFICATION_STATUSES.includes(status)
}
export type DispensingStatus = "Waiting" | "Preparing" | "Ready" | "Dispensed" | "Cancelled"
export type PrescriptionPriority = "Normal" | "Urgent" | "Emergency"

export interface AppPrescriptionItem {
  id: string
  medicineName: string // OCR text or real name
  genericName?: string
  medicineId?: string // Resolved ID
  strength?: string
  dosage: string
  frequency?: string
  duration: string
  route?: string
  instructions?: string
  quantity: number
  remarks?: string
  substitutionAllowed: boolean
  substitutionMedicineId?: string
}

export interface AppPrescription {
  id: string
  patientId: string
  patientName: string
  uhid: string
  age?: number
  gender?: string
  visitId?: string
  appointmentId?: string
  doctorId: string
  doctorName: string
  department: string
  diagnosis?: string
  date: string

  sourceType: PrescriptionSource
  priority: PrescriptionPriority
  status: PrescriptionStatus
  dispensingStatus: DispensingStatus

  imageUrl?: string
  items: AppPrescriptionItem[]

  verifiedBy?: string
  verifiedDate?: string
  rejectedReason?: string
  verificationNotes?: string

  createdAt: string
}

export interface AppPrescriptionClarification {
  id: string
  prescriptionId: string
  pharmacistId: string
  doctorId: string
  issueType: "Wrong Medicine" | "Stock Not Available" | "Dose Clarification Needed" | "Allergy Concern" | "Other"
  message: string
  status: "Pending" | "Resolved"
  resolutionMessage?: string
  createdAt: string
}

export type BillType = "Cash" | "Insurance" | "Corporate" | "IP_Ward"
export type PaymentStatus = "Pending" | "Partially Paid" | "Paid" | "Insurance Pending" | "Credit Approved"

export interface AppPharmacyBillItem {
  medicineId: string
  medicineName: string
  batchNumber: string
  batchLocation?: string // Barcode/Shelf
  barcode?: string
  expiryDate: string
  quantity: number
  unitPrice: number
  grossAmount: number
  discount: number
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  tax: number
  totalPrice: number
  hsnCode?: string
  mfgShortCode?: string
}

// Removed duplicate interface AppPharmacyBillItem

export interface AppPharmacyBill {
  id: string
  billNumber: string
  patientId: string
  patientName: string
  uhid: string
  doctorName: string
  department: string

  billType: BillType
  paymentStatus: PaymentStatus
  paymentMode?: string

  prescriptionId?: string
  items: AppPharmacyBillItem[]

  subTotal: number
  discount: number
  tax: number
  taxableTotal: number
  cgstTotal: number
  sgstTotal: number
  totalAmount: number

  createdBy: string
  createdAt: string
  isModifiedReturnBill?: boolean
  originalBillNumber?: string
  paymentsData?: {
    amounts: Record<string, number>
    refs?: Record<string, string>
  }
  totalPaid?: number
  balanceDue?: number
}

// Phase 4 - Returns, Transfers, Expiry

export type ReturnStatus = "Requested" | "Approved" | "Rejected" | "Completed"

export interface AppPharmacyReturnItem {
  medicineId: string
  medicineName: string
  batchNumber: string
  expiryDate?: string
  originalQuantity: number
  returnQuantity: number
  finalQuantity: number
  unitPrice: number
  originalAmount: number
  refundAmount: number
  finalAmount: number
  tax?: number
  discount?: number
}

export interface AppPharmacyReturn {
  id: string
  returnNumber: string
  patientUhid: string
  patientName?: string
  patientId?: string
  doctorName?: string
  department?: string
  originalBillId: string
  originalBillNumber?: string
  modifiedBillId?: string
  modifiedBillNumber?: string
  items?: AppPharmacyReturnItem[]
  // Backwards compatibility for single-item fields
  medicineId?: string
  batchNumber?: string
  returnQuantity?: number
  originalTotalAmount?: number
  modifiedTotalAmount?: number
  refundAmount?: number
  returnReason: string
  notes?: string
  approvedBy?: string
  createdBy?: string
  status: ReturnStatus
  createdAt: string
}

export type TransferStatus = "Requested" | "Approved" | "Transferred" | "Received" | "Cancelled"

export interface AppStockTransfer {
  id: string
  transferId: string
  fromLocation: string
  toLocation: string
  medicineId: string
  batchId: string
  quantity: number
  requestedBy: string
  approvedBy?: string
  receivedBy?: string
  status: TransferStatus
  createdAt: string
}

export interface AppSupplierReturn {
  id: string // returnId internal
  debitNoteNumber: string // DN-YYYY-XXXXX
  returnNumber?: string
  supplierId: string
  supplierName?: string
  medicineId: string
  medicineName?: string
  batchId: string
  batchNumber?: string
  quantity: number
  purchaseRate: number
  unitCost?: number
  returnAmount: number
  reason: string
  status: "Draft" | "Submitted" | "Approved" | "Sent To Supplier" | "Credit Note Pending" | "Credit Received" | "Closed" | "Credit Note Received" | string
  poNumber?: string
  grnNumber?: string
  invoiceNumber?: string
  creditNoteId?: string
  notes?: string
  requestedBy?: string
  createdBy?: string
  approvedBy?: string
  returnDate?: string
  createdAt: string
  updatedAt?: string
}

export interface AppStockAdjustment {
  id: string
  adjustmentNumber?: string
  medicineId: string
  medicineName?: string
  batchId: string
  batchNumber?: string
  supplierId?: string
  supplierName?: string
  category?: string
  quantity?: number
  unitCost?: number
  lossValue?: number
  systemQuantity: number
  physicalQuantity: number
  difference: number
  reason: "Physical Mismatch" | "Damage" | "Missing Stock" | string
  disposalMethod?: string
  location?: string
  witnessName?: string
  reportedBy?: string
  adjustmentDate?: string
  approvedBy?: string
  status?: "Approved" | string
  createdAt: string
}

export interface AppMedicineWriteOff {
  id: string
  receiptNumber: string
  date: string
  medicineId: string
  medicineName: string
  medicineCode?: string
  genericName?: string
  batchId: string
  batchNumber: string
  expiryDate?: string
  unitOfMeasure: string
  quantity: number
  previousStock: number
  remainingStock: number
  unitCost: number
  totalLossValue: number
  reason: string
  remarks?: string
  writtenOffBy: string
  status: "COMPLETED" | "CANCELLED"
  createdAt: string
}

const USERS_KEY = "hospai_pharm_users_v4"
const NOTIFICATIONS_KEY = "hospai_pharm_notifications_v4"
const DISMISSED_NOTIFICATIONS_KEY = "hospai_pharm_dismissed_notifs_v4"
const READ_NOTIFICATIONS_KEY = "hospai_pharm_read_notifs_v4"
const AUDIT_LOGS_KEY = "hospai_pharm_audit_logs_v4"

const CATEGORIES_KEY = "hospai_pharm_categories_v4"
const SUPPLIERS_KEY = "hospai_pharm_suppliers_v4"
const MEDICINES_KEY = "hospai_pharm_medicines_v4"
const BATCHES_KEY = "hospai_pharm_batches_v4"
const POS_KEY = "hospai_pharm_pos_v4"
const GRNS_KEY = "hospai_pharm_grns_v4"
const STOCK_TXS_KEY = "hospai_pharm_stock_txs_v4"
const PRESCRIPTIONS_KEY = "hospai_pharm_rx_v4"
const BILLS_KEY = "hospai_pharm_bills_v4"
const RETURNS_KEY = "hospai_pharm_returns_v4"
const TRANSFERS_KEY = "hospai_pharm_transfers_v4"
const SUPPLIER_RETURNS_KEY = "hospai_pharm_supp_returns_v4"
const ADJUSTMENTS_KEY = "hospai_pharm_adjustments_v4"
const CLARIFICATIONS_KEY = "hospai_pharm_clarifications_v4"
const WRITE_OFFS_KEY = "hospai_pharm_write_offs_v4"

/**
 * Purges all sample, demo, test, and seed data from the Pharmacy stores.
 * Removes mock medicines, test batches, demo purchase orders, test GRNs, demo returns,
 * sample suppliers, and demo bills, leaving only genuine real-world records.
 */
export function purgeSampleData(): boolean {
  if (typeof window === "undefined") return false
  try {
    const SAMPLE_MED_IDS = new Set([
      "MED-001",
      "MED-002",
      "MED-003",
      "MED-004",
      "MED-005",
      "MED-006",
      "MED-007",
      "MED-008",
      "MED-009",
      "MED-010",
    ])
    const SAMPLE_MED_NAMES = new Set([
      "dolo 500mg",
      "mox 500mg",
      "azee 500mg",
      "pan 40mg",
      "cetizine 10mg",
      "glycomet 500mg",
      "atorva 20mg",
      "limcee 500mg",
      "ascoril dx syrup",
      "zenflox drops",
      "paracetamol 500mg (demo)",
      "amoxicillin 250mg (demo)",
    ])
    const SAMPLE_BATCH_IDS = new Set([
      "BAT-001",
      "BAT-002",
      "BAT-003",
      "BAT-004",
      "BAT-005",
      "BAT-006",
      "BAT-007",
      "BAT-008",
      "BAT-009",
      "BAT-010",
    ])
    const SAMPLE_PO_IDS = new Set([
      "PO-2026-001",
      "PO-2026-002",
      "PO-2026-003",
      "PO-2026-004",
      "PO-2026-005",
      "PO-2026-006",
      "PO-2026-007",
      "PO-2026-008",
    ])
    const SAMPLE_GRN_IDS = new Set([
      "GRN-2026-001",
      "GRN-2026-002",
      "GRN-2026-003",
      "GRN-2026-004",
    ])
    const SAMPLE_RET_IDS = new Set([
      "RET-2026-001",
      "RET-2026-002",
      "RET-2026-003",
      "RET-2026-004",
      "RET-2026-005",
      "RET-2026-006",
    ])
    const SAMPLE_SUP_IDS = new Set([
      "SUP-001",
      "SUP-002",
      "SUP-003",
      "SUP-004",
      "SUP-005",
    ])
    const SAMPLE_SUP_NAMES = new Set([
      "apollo pharma distributors",
      "sun medisource ltd",
      "cipla health supplies",
      "zydus life sciences",
      "torrent medical solutions",
    ])
    const SAMPLE_CAT_IDS = new Set([
      "CAT-001",
      "CAT-002",
      "CAT-003",
      "CAT-004",
      "CAT-005",
      "CAT-006",
      "CAT-007",
      "CAT-008",
      "CAT-009",
    ])

    let changed = false

    // 1. Medicines
    const storedMeds = window.localStorage.getItem(MEDICINES_KEY)
    if (storedMeds) {
      try {
        const meds = JSON.parse(storedMeds)
        const isSampleMed = (m: any) => {
          const id = (m.id || "").toLowerCase()
          return (
            SAMPLE_MED_IDS.has(m.id) ||
            id.startsWith("med-00") ||
            id.startsWith("med-demo")
          )
        }
        const filtered = meds.filter((m: any) => !isSampleMed(m))
        if (filtered.length !== meds.length) {
          window.localStorage.setItem(MEDICINES_KEY, JSON.stringify(filtered))
          changed = true
        }
      } catch {}
    }

    // 2. Batches
    const storedBatches = window.localStorage.getItem(BATCHES_KEY)
    if (storedBatches) {
      try {
        const batches = JSON.parse(storedBatches)
        const filtered = batches.filter((b: any) => {
          const id = (b.id || "").toLowerCase()
          if (SAMPLE_BATCH_IDS.has(b.id) || SAMPLE_MED_IDS.has(b.medicineId))
            return false
          if (id.startsWith("bat-demo")) return false
          return true
        })
        if (filtered.length !== batches.length) {
          window.localStorage.setItem(BATCHES_KEY, JSON.stringify(filtered))
          changed = true
        }
      } catch {}
    }

    // 3. Purchase Orders (both current POS_KEY and alternate legacy key)
    const poKeys = [POS_KEY, "hospai_pharm_purchase_orders_v2"]
    poKeys.forEach((key) => {
      const storedPOs = window.localStorage.getItem(key)
      if (storedPOs) {
        try {
          const pos = JSON.parse(storedPOs)
          const filtered = pos.filter((p: any) => {
            const id = (p.id || "").toLowerCase()
            const supId = (p.supplierId || "").toLowerCase()
            if (SAMPLE_PO_IDS.has(p.id)) return false
            if (
              id.startsWith("po-2026-") ||
              id.startsWith("po-demo") ||
              id.startsWith("po-test")
            )
              return false
            if (
              supId.startsWith("sup-00") ||
              supId.startsWith("sup-01") ||
              SAMPLE_SUP_IDS.has(p.supplierId)
            )
              return false
            if (p.totalOrderValue === 99900) return false
            if (Array.isArray(p.items)) {
              const hasSampleItem = p.items.some((item: any) => {
                const medId = (item.medicineId || "").toLowerCase()
                return (
                  medId.startsWith("med-00") ||
                  medId.startsWith("med-01") ||
                  medId.startsWith("med-cof") ||
                  medId.startsWith("med-vtc") ||
                  medId.startsWith("med-met") ||
                  medId.startsWith("med-atv") ||
                  medId.startsWith("med-azm") ||
                  medId.startsWith("med-pan") ||
                  medId.startsWith("med-pcm") ||
                  medId.startsWith("med-amx") ||
                  medId.startsWith("med-ctz")
                )
              })
              if (hasSampleItem) return false
            }
            return true
          })
          if (filtered.length !== pos.length) {
            window.localStorage.setItem(key, JSON.stringify(filtered))
            changed = true
          }
        } catch {}
      }
    })

    // 4. GRNs
    const storedGRNs = window.localStorage.getItem(GRNS_KEY)
    if (storedGRNs) {
      try {
        const grns = JSON.parse(storedGRNs)
        const filtered = grns.filter((g: any) => {
          const id = (g.id || "").toLowerCase()
          const poId = (g.purchaseOrderId || "").toLowerCase()
          const supId = (g.supplierId || "").toLowerCase()
          if (SAMPLE_GRN_IDS.has(g.id)) return false
          if (
            id.startsWith("grn-2026-") ||
            id.startsWith("grn-demo") ||
            id.startsWith("grn-test")
          )
            return false
          if (
            poId.startsWith("po-2026-") ||
            poId.startsWith("po-demo") ||
            poId.startsWith("po-test") ||
            SAMPLE_PO_IDS.has(g.purchaseOrderId)
          )
            return false
          if (
            supId.startsWith("sup-00") ||
            supId.startsWith("sup-01") ||
            SAMPLE_SUP_IDS.has(g.supplierId)
          )
            return false
          return true
        })
        if (filtered.length !== grns.length) {
          window.localStorage.setItem(GRNS_KEY, JSON.stringify(filtered))
          changed = true
        }
      } catch {}
    }

    // 5. Returns
    const storedReturns = window.localStorage.getItem(RETURNS_KEY)
    if (storedReturns) {
      try {
        const returns = JSON.parse(storedReturns)
        const filtered = returns.filter((r: any) => {
          const id = (r.id || "").toLowerCase()
          const retNo = (r.returnNumber || "").toLowerCase()
          const billNo = (r.originalBillNumber || "").toLowerCase()
          const patient = (r.patientName || "").toLowerCase()
          if (SAMPLE_RET_IDS.has(r.id) || SAMPLE_RET_IDS.has(r.returnNumber))
            return false
          if (
            id.startsWith("ret-2026-") ||
            retNo.startsWith("ret-2026-") ||
            id.startsWith("ret-demo") ||
            retNo.startsWith("ret-demo")
          )
            return false
          if (id === "ret-2026-62111" || retNo === "ret-2026-62111")
            return false
          if (
            billNo === "bill-2026-001245" ||
            billNo === "inv-2026-8845" ||
            billNo === "inv-2026-8844" ||
            billNo.startsWith("pb-2026-00")
          )
            return false
          if (
            patient === "rahul verma" ||
            patient === "priya sharma" ||
            patient === "amit kumar"
          )
            return false
          if (SAMPLE_MED_IDS.has(r.medicineId)) return false
          if (Array.isArray(r.items)) {
            const hasSample = r.items.some((item: any) => {
              const medId = (item.medicineId || "").toLowerCase()
              const medName = (item.medicineName || "").toLowerCase()
              return (
                medId.startsWith("med-azm") ||
                medId.startsWith("med-pan") ||
                medId.startsWith("med-vtc") ||
                medId.startsWith("med-pcm") ||
                medId.startsWith("med-amx") ||
                medId.startsWith("med-ctz") ||
                medId.startsWith("med-00") ||
                medId.startsWith("med-01") ||
                medName.includes("azithromycin") ||
                medName.includes("pantoprazole") ||
                medName.includes("vitamin c") ||
                medName.includes("amoxicillin") ||
                medName.includes("paracetamol")
              )
            })
            if (hasSample) return false
          }
          return true
        })
        if (filtered.length !== returns.length) {
          window.localStorage.setItem(RETURNS_KEY, JSON.stringify(filtered))
          changed = true
        }
      } catch {}
    }

    // 6. Suppliers
    const storedSups = window.localStorage.getItem(SUPPLIERS_KEY)
    if (storedSups) {
      try {
        const sups = JSON.parse(storedSups)
        const filtered = sups.filter((s: any) => {
          if (SAMPLE_SUP_IDS.has(s.id)) return false
          const nameNorm = (s.supplierName || s.name || "").toLowerCase().trim()
          if (
            SAMPLE_SUP_NAMES.has(nameNorm) &&
            (s.id.startsWith("SUP-00") || s.id.startsWith("SUP-01"))
          )
            return false
          return true
        })
        if (filtered.length !== sups.length) {
          window.localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(filtered))
          changed = true
        }
      } catch {}
    }

    // 7. Categories
    const storedCats = window.localStorage.getItem(CATEGORIES_KEY)
    if (storedCats) {
      try {
        const cats = JSON.parse(storedCats)
        const filtered = cats.filter((c: any) => {
          if (SAMPLE_CAT_IDS.has(c.id)) return false
          if (typeof c.id === "string" && c.id.startsWith("CAT-00"))
            return false
          return true
        })
        if (filtered.length !== cats.length) {
          window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(filtered))
          changed = true
        }
      } catch {}
    }

    // 8. Bills
    const storedBills = window.localStorage.getItem(BILLS_KEY)
    if (storedBills) {
      try {
        const bills = JSON.parse(storedBills)
        const filtered = bills.filter((b: any) => {
          const id = (b.id || "").toLowerCase()
          const billNo = (b.billNumber || "").toLowerCase()
          const patient = (b.patientName || "").toLowerCase()
          if (typeof b.id === "string" && b.id.startsWith("BILL-DEMO-"))
            return false
          if (
            typeof b.billNumber === "string" &&
            b.billNumber.startsWith("BILL-DEMO-")
          )
            return false
          if (
            id.startsWith("pb-2026-00") ||
            billNo === "bill-2026-001245" ||
            billNo === "inv-2026-8845" ||
            billNo === "inv-2026-8844"
          )
            return false
          if (
            patient === "rahul verma" ||
            patient === "priya sharma" ||
            patient === "amit kumar"
          )
            return false
          if (
            b.createdBy === "Pharmacist" &&
            (b.totalAmount === 115 ||
              b.totalAmount === 440 ||
              b.totalAmount === 555)
          )
            return false
          if (Array.isArray(b.items)) {
            const hasSampleItem = b.items.some((item: any) => {
              const medId = (item.medicineId || "").toLowerCase()
              const medName = (item.medicineName || "").toLowerCase()
              return (
                medId === "med-azm-500" ||
                medId === "med-pan-40" ||
                medId === "med-vtc-500" ||
                medId === "med-pcm-500" ||
                medId === "med-amx-500" ||
                medId === "med-ctz-10" ||
                medName.includes("azithromycin 500mg") ||
                medName.includes("pantoprazole 40mg") ||
                medName.includes("vitamin c 500mg") ||
                medName.includes("amoxicillin 500mg")
              )
            })
            if (
              hasSampleItem &&
              (b.createdBy === "Pharmacist" ||
                patient === "" ||
                patient === "walk-in patient")
            )
              return false
          }
          return true
        })
        if (filtered.length !== bills.length) {
          window.localStorage.setItem(BILLS_KEY, JSON.stringify(filtered))
          changed = true
        }
      } catch {}
    }

    // 9. Stock Transactions
    const storedTxs = window.localStorage.getItem(STOCK_TXS_KEY)
    if (storedTxs) {
      try {
        const txs = JSON.parse(storedTxs)
        const filtered = txs.filter(
          (t: any) =>
            !SAMPLE_MED_IDS.has(t.medicineId) &&
            !SAMPLE_BATCH_IDS.has(t.batchId),
        )
        if (filtered.length !== txs.length) {
          window.localStorage.setItem(STOCK_TXS_KEY, JSON.stringify(filtered))
          changed = true
        }
      } catch {}
    }

    // 10. Supplier Returns (both current and legacy keys)
    const suppRetKeys = [
      SUPPLIER_RETURNS_KEY,
      "hospai_pharm_supplier_returns_v2",
    ]
    suppRetKeys.forEach((key) => {
      const storedSRs = window.localStorage.getItem(key)
      if (storedSRs) {
        try {
          const srs = JSON.parse(storedSRs)
          const filtered = srs.filter(
            (sr: any) =>
              !SAMPLE_SUP_IDS.has(sr.supplierId) &&
              !(typeof sr.id === "string" && sr.id.startsWith("SR-2026-00")),
          )
          if (filtered.length !== srs.length) {
            window.localStorage.setItem(key, JSON.stringify(filtered))
            changed = true
          }
        } catch {}
      }
    })

    if (changed) {
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
    return changed
  } catch (e) {
    console.error("Failed to purge sample pharmacy data:", e)
    return false
  }
}

/**
 * Resets all Pharmacy records to an empty state for a clean real-world start.
 */
export function clearAllPharmacyData(): void {
  if (typeof window === "undefined") return
  try {
    // Scan and remove any existing pharmacy keys across all versions
    const toRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (
        k &&
        (k.startsWith("hospai_pharm_") ||
          k.startsWith("pharm_") ||
          k.startsWith("pharmacy_") ||
          k.startsWith("_v2_pharmacy_") ||
          k.includes("pharmacy")) &&
        k !== "hospai_pharmacy_upi_id"
      ) {
        toRemove.push(k)
      }
    }
    toRemove.forEach((k) => window.localStorage.removeItem(k))

    // Explicitly initialize all stores to empty lists so zero demo records remain
    window.localStorage.setItem(CATEGORIES_KEY, "[]")
    window.localStorage.setItem(SUPPLIERS_KEY, "[]")
    window.localStorage.setItem(MEDICINES_KEY, "[]")
    window.localStorage.setItem(BATCHES_KEY, "[]")
    window.localStorage.setItem(POS_KEY, "[]")
    window.localStorage.setItem(GRNS_KEY, "[]")
    window.localStorage.setItem(STOCK_TXS_KEY, "[]")
    window.localStorage.setItem(PRESCRIPTIONS_KEY, "[]")
    window.localStorage.setItem(BILLS_KEY, "[]")
    window.localStorage.setItem(RETURNS_KEY, "[]")
    window.localStorage.setItem(TRANSFERS_KEY, "[]")
    window.localStorage.setItem(SUPPLIER_RETURNS_KEY, "[]")
    window.localStorage.setItem(ADJUSTMENTS_KEY, "[]")
    window.localStorage.setItem(CLARIFICATIONS_KEY, "[]")
    window.localStorage.setItem(WRITE_OFFS_KEY, "[]")
    window.localStorage.setItem(NOTIFICATIONS_KEY, "[]")
    window.localStorage.setItem(AUDIT_LOGS_KEY, "[]")
    window.localStorage.setItem(USERS_KEY, "[]")
    window.localStorage.removeItem("_v2_pharmacy_dispense_rx")
    window.localStorage.setItem("hospai_pharm_fresh_clean_slate_v2026_ready", "true")

    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
  } catch (e) {
    console.error("Failed to clear pharmacy data:", e)
  }
}

// Expose utility globally for manual testing if needed (does NOT auto-wipe data)
if (typeof window !== "undefined") {
  try {
    ;(window as any).clearAllPharmacyData = clearAllPharmacyData
    ;(window as any).purgeSamplePharmacyData = purgeSampleData
  } catch (e) {
    console.error("Failed to bind pharmacy window utilities:", e)
  }
}

export const INITIAL_SEED_PRESCRIPTIONS: AppPrescription[] = [
  {
    id: "RX-2026-0088",
    patientId: "P-100888",
    patientName: "Appanna Chinnapati",
    uhid: "UMR10088",
    age: 54,
    gender: "Male",
    doctorId: "DOC-VANCE",
    doctorName: "Dr. Vance",
    department: "General Surgery / Trauma",
    diagnosis:
      "Grade IV Splenic Rupture, Massive Hemoperitoneum s/p Emergency Laparotomy & Splenectomy",
    date: "2026-10-04T08:00:00.000Z",
    createdAt: "2026-10-04T08:00:00.000Z",
    sourceType: "DIGITAL",
    priority: "Emergency",
    status: "Dispensed",
    dispensingStatus: "Dispensed",
    items: [
      {
        id: "RXI-88-1",
        medicineName: "Inj. Meropenem",
        strength: "1g",
        dosage: "1 vial",
        frequency: "Q8H",
        duration: "7 days",
        route: "IV",
        instructions: "IV infusion over 30 mins",
        quantity: 21,
        substitutionAllowed: false,
      },
      {
        id: "RXI-88-2",
        medicineName: "Inj. Metronidazole",
        strength: "500mg",
        dosage: "100 mL",
        frequency: "Q8H",
        duration: "5 days",
        route: "IV",
        instructions: "Slow IV infusion",
        quantity: 15,
        substitutionAllowed: false,
      },
      {
        id: "RXI-88-3",
        medicineName: "Inj. Pantoprazole",
        strength: "40mg",
        dosage: "1 vial",
        frequency: "OD",
        duration: "10 days",
        route: "IV",
        instructions: "IV push before morning feeds",
        quantity: 10,
        substitutionAllowed: false,
      },
      {
        id: "RXI-88-4",
        medicineName: "Inj. Paracetamol",
        strength: "1000mg",
        dosage: "100 mL",
        frequency: "Q8H",
        duration: "5 days",
        route: "IV",
        instructions: "IV piggyback for pain/temperature",
        quantity: 15,
        substitutionAllowed: false,
      },
      {
        id: "RXI-88-5",
        medicineName: "Inj. Tramadol",
        strength: "50mg",
        dosage: "1 amp",
        frequency: "BD",
        duration: "3 days",
        route: "IV",
        instructions: "Slow IV push SOS severe pain",
        quantity: 6,
        substitutionAllowed: false,
      },
      {
        id: "RXI-88-6",
        medicineName: "0.9% Normal Saline",
        strength: "1000mL",
        dosage: "1000 mL",
        frequency: "Continuous",
        duration: "5 days",
        route: "IV",
        instructions: "75 mL/hr maintenance fluid",
        quantity: 10,
        substitutionAllowed: false,
      },
    ],
  },
  {
    id: "RX-2026-0099",
    patientId: "P-100888",
    patientName: "Appanna Chinnapati",
    uhid: "UMR10088",
    age: 54,
    gender: "Male",
    doctorId: "DOC-VANCE",
    doctorName: "Dr. Vance",
    department: "General Surgery / Trauma",
    diagnosis:
      "Post-op Day 11 Discharge post Exploratory Laparotomy & Splenectomy (10-day ICU critical care stay)",
    date: "2026-10-15T10:30:00.000Z",
    createdAt: "2026-10-15T10:30:00.000Z",
    sourceType: "DIGITAL",
    priority: "Normal",
    status: "Dispensed",
    dispensingStatus: "Dispensed",
    items: [
      {
        id: "RXI-99-1",
        medicineName: "Tab. Cefuroxime Axetil",
        strength: "500mg",
        dosage: "1 tab",
        frequency: "BD",
        duration: "7 days",
        route: "Oral",
        instructions: "Take 1 tablet twice daily after food",
        quantity: 14,
        substitutionAllowed: false,
      },
      {
        id: "RXI-99-2",
        medicineName: "Tab. Pantoprazole",
        strength: "40mg",
        dosage: "1 tab",
        frequency: "OD",
        duration: "14 days",
        route: "Oral",
        instructions: "Take 1 tablet once daily before breakfast",
        quantity: 14,
        substitutionAllowed: false,
      },
      {
        id: "RXI-99-3",
        medicineName: "Tab. Paracetamol",
        strength: "650mg",
        dosage: "1 tab",
        frequency: "TDS",
        duration: "5 days",
        route: "Oral",
        instructions: "Take 1 tablet as needed for surgical wound ache",
        quantity: 15,
        substitutionAllowed: false,
      },
      {
        id: "RXI-99-4",
        medicineName: "Tab. Autrin (Iron + Folic Acid)",
        strength: "100mg",
        dosage: "1 capsule",
        frequency: "OD",
        duration: "30 days",
        route: "Oral",
        instructions: "Take 1 capsule daily after lunch",
        quantity: 30,
        substitutionAllowed: false,
      },
      {
        id: "RXI-99-5",
        medicineName: "Tab. Limcee (Vitamin C 500mg + Zinc)",
        strength: "500mg",
        dosage: "1 tab",
        frequency: "OD",
        duration: "15 days",
        route: "Oral",
        instructions: "Chew 1 tablet daily for wound healing",
        quantity: 15,
        substitutionAllowed: false,
      },
      {
        id: "RXI-99-6",
        medicineName: "Inj. Pneumococcal Conjugate Vaccine (PCV20)",
        strength: "0.5mL",
        dosage: "0.5 mL",
        frequency: "Single Dose",
        duration: "1 day",
        route: "IM",
        instructions: "Administered prior to discharge (post-splenectomy immunization)",
        quantity: 1,
        substitutionAllowed: false,
      },
      {
        id: "RXI-99-7",
        medicineName: "Inj. Meningococcal Conjugate Vaccine (MenACWY)",
        strength: "0.5mL",
        dosage: "0.5 mL",
        frequency: "Single Dose",
        duration: "1 day",
        route: "IM",
        instructions: "Administered prior to discharge (post-splenectomy immunization)",
        quantity: 1,
        substitutionAllowed: false,
      },
    ],
  },
]

export class PharmacyDatabase {
  static purgeSampleData = purgeSampleData
  static clearAllPharmacyData = clearAllPharmacyData
  static seedHospitalTestData = seedPharmacyHospitalData
  static seedTestPrescriptionForSelling = seedTestPrescriptionForSelling
  // Categories

  static getUsers(): AppUser[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(USERS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  static saveUsers(users: AppUser[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }
  static addUser(user: AppUser) {
    const users = this.getUsers()
    users.push(user)
    this.saveUsers(users)
  }
  static updateUser(id: string, updates: Partial<AppUser>) {
    const users = this.getUsers()
    const idx = users.findIndex((u) => u.id === id)
    if (idx > -1) {
      users[idx] = { ...users[idx], ...updates }
      this.saveUsers(users)
    }
  }

  static getDismissedNotificationIds(): string[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static dismissNotification(id: string) {
    if (typeof window === "undefined") return
    try {
      const dismissed = this.getDismissedNotificationIds()
      if (!dismissed.includes(id)) {
        dismissed.push(id)
        window.localStorage.setItem(
          DISMISSED_NOTIFICATIONS_KEY,
          JSON.stringify(dismissed),
        )
      }
      let notifs = this.getNotifications()
      if (notifs.some((n) => n.id === id)) {
        notifs = notifs.filter((n) => n.id !== id)
        this.saveNotifications(notifs)
      } else {
        window.dispatchEvent(new Event("storage"))
        window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
      }
    } catch (e) {
      console.error("Failed to dismiss notification", e)
    }
  }

  static getReadNotificationIds(): string[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(READ_NOTIFICATIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static markNotificationRead(id: string, read: boolean = true) {
    if (typeof window === "undefined") return
    try {
      const readIds = this.getReadNotificationIds()
      if (read) {
        if (!readIds.includes(id)) readIds.push(id)
      } else {
        const idx = readIds.indexOf(id)
        if (idx > -1) readIds.splice(idx, 1)
      }
      window.localStorage.setItem(
        READ_NOTIFICATIONS_KEY,
        JSON.stringify(readIds),
      )
      const notifs = this.getNotifications()
      const idx = notifs.findIndex((n) => n.id === id)
      if (idx > -1) {
        notifs[idx].read = read
        this.saveNotifications(notifs)
      } else {
        window.dispatchEvent(new Event("storage"))
        window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
      }
    } catch (e) {
      console.error("Failed to mark notification read", e)
    }
  }

  static markAllNotificationsRead(ids?: string[]) {
    if (typeof window === "undefined") return
    try {
      const readIds = this.getReadNotificationIds()
      if (ids && ids.length > 0) {
        ids.forEach((id) => {
          if (!readIds.includes(id)) readIds.push(id)
        })
      }
      window.localStorage.setItem(
        READ_NOTIFICATIONS_KEY,
        JSON.stringify(readIds),
      )
      const notifs = this.getNotifications()
      notifs.forEach((n) => {
        n.read = true
      })
      this.saveNotifications(notifs)
    } catch (e) {
      console.error("Failed to mark all notifications read", e)
    }
  }

  static getNotifications(): AppNotification[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(NOTIFICATIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  static saveNotifications(notifications: AppNotification[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        NOTIFICATIONS_KEY,
        JSON.stringify(notifications),
      )
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static updateNotification(id: string, updates: Partial<AppNotification>) {
    if (updates.read !== undefined) {
      this.markNotificationRead(id, updates.read)
    }
    const notifs = this.getNotifications()
    const idx = notifs.findIndex((n) => n.id === id)
    if (idx > -1) {
      notifs[idx] = { ...notifs[idx], ...updates }
      this.saveNotifications(notifs)
    }
  }

  static deleteNotification(id: string) {
    this.dismissNotification(id)
  }

  static addNotification(
    title: string,
    message: string,
    type: AppNotification["type"],
    actionPage?: string,
    actionLabel?: string,
    category?: AppNotification["category"],
  ) {
    const notifs = this.getNotifications()
    const newNotif: AppNotification = {
      id: "NOTIF" + Date.now() + Math.floor(Math.random() * 1000),
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: false,
      actionPage,
      actionLabel,
      category,
    }
    notifs.unshift(newNotif)
    this.saveNotifications(notifs)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hospai_pharmacy_toast", { detail: newNotif }),
      )
    }
  }

  static getAuditLogs(): AppAuditLog[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(AUDIT_LOGS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  static saveAuditLogs(logs: AppAuditLog[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static getCategories(): AppCategory[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(CATEGORIES_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  static saveCategories(categories: AppCategory[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static addCategory(cat: AppCategory) {
    const cats = this.getCategories()
    cats.push(cat)
    this.saveCategories(cats)
  }

  static updateCategory(id: string, updates: Partial<AppCategory>) {
    const cats = this.getCategories()
    const idx = cats.findIndex((c) => c.id === id)
    if (idx !== -1) {
      cats[idx] = { ...cats[idx], ...updates }
      this.saveCategories(cats)
    }
  }

  static deleteCategory(id: string) {
    this.saveCategories(this.getCategories().filter((c) => c.id !== id))
  }

  // Suppliers
  static getSuppliers(): AppSupplier[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(SUPPLIERS_KEY)
      let list: AppSupplier[] = stored ? JSON.parse(stored) : []
      if (!Array.isArray(list)) list = []
      if (!list.some((s) => (s.supplierName || "").toLowerCase().includes("vh medicals"))) {
        list.push({
          id: "SUP-VH-01",
          supplierName: "VH MEDICALS AND CHEMICALS",
          contactInformation: "Distributor & Wholesaler",
          phone: "+91 98480 12345",
          email: "orders@vhmedicals.com",
          address: "Pharma Complex, Main Road",
          gstInformation: "37AABCV1234F1Z5",
          licenseDetails: "DL-AP-1029/2024",
          paymentTerms: "Credit 30 Days",
          status: "Active",
          createdAt: new Date().toISOString(),
        })
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(list))
        }
      }
      return list
    } catch {
      return []
    }
  }
  static saveSuppliers(suppliers: AppSupplier[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static addSupplier(sup: AppSupplier) {
    const sups = this.getSuppliers()
    sups.push(sup)
    this.saveSuppliers(sups)
  }

  static updateSupplier(id: string, updates: Partial<AppSupplier>) {
    const sups = this.getSuppliers()
    const idx = sups.findIndex((s) => s.id === id)
    if (idx !== -1) {
      sups[idx] = { ...sups[idx], ...updates }
      this.saveSuppliers(sups)
    }
  }

  static deleteSupplier(id: string) {
    this.saveSuppliers(this.getSuppliers().filter((s) => s.id !== id))
  }

  // Medicines
  static getMedicines(): AppMedicine[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(MEDICINES_KEY)
      const list: AppMedicine[] = stored ? JSON.parse(stored) : []
      if (Array.isArray(list)) {
        let changed = false
        list.forEach((m: any) => {
          if (!m.supplierName) {
            m.supplierName = "VH MEDICALS AND CHEMICALS"
            changed = true
          }
        })
        if (changed && typeof window !== "undefined") {
          window.localStorage.setItem(MEDICINES_KEY, JSON.stringify(list))
        }
        return list
      }
      return []
    } catch {
      return []
    }
  }
  static saveMedicines(medicines: AppMedicine[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static addMedicine(med: AppMedicine) {
    const meds = this.getMedicines()
    if (!med.supplierName) {
      med.supplierName = "VH MEDICALS AND CHEMICALS"
    }
    meds.push(med)
    this.saveMedicines(meds)
  }

  static updateMedicine(id: string, updates: any) {
    const meds = this.getMedicines()
    const idx = meds.findIndex((m) => m.id === id)
    if (idx !== -1) {
      meds[idx] = {
        ...meds[idx],
        ...updates,
        medicineName: updates.name || meds[idx].medicineName,
      }
      this.saveMedicines(meds)
    }
  }

  static deleteMedicine(id: string) {
    const meds = this.getMedicines()
    this.saveMedicines(meds.filter((m) => m.id !== id))
  }

  // Batches
  static getBatches(): AppBatch[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(BATCHES_KEY)
      const list: AppBatch[] = stored ? JSON.parse(stored) : []
      if (Array.isArray(list)) {
        let changed = false
        list.forEach((b: any) => {
          if (b.expiryDate && typeof b.expiryDate === "string") {
            const healed = b.expiryDate.replace(/^00(\d{2})/, "20$1")
            if (healed !== b.expiryDate) {
              b.expiryDate = healed
              changed = true
            }
          }
        })
        if (changed && typeof window !== "undefined") {
          window.localStorage.setItem(BATCHES_KEY, JSON.stringify(list))
        }
        return list
      }
      return []
    } catch {
      return []
    }
  }
  static saveBatches(batches: AppBatch[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BATCHES_KEY, JSON.stringify(batches))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static updateBatch(id: string, updates: Partial<AppBatch>) {
    const batches = this.getBatches()
    const idx = batches.findIndex((b) => b.id === id)
    if (idx !== -1) {
      batches[idx] = { ...batches[idx], ...updates }
      this.saveBatches(batches)
    }
  }

  static addBatch(batch: any): string {
    const batches = this.getBatches()
    const targetId = batch.id || ("BAT" + Date.now() + Math.floor(Math.random() * 1000))
    const existingIdx = batches.findIndex((b) => b.id === targetId)

    const batchRecord: AppBatch = {
      ...batch,
      id: targetId,
      medicineId: batch.medicineId,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      manufacturingDate: batch.manufacturingDate || batch.mfg || new Date().toISOString().split("T")[0],
      quantity: Number(batch.quantity) || 0,
      availableQuantity: Number(batch.availableQuantity !== undefined ? batch.availableQuantity : batch.quantity) || 0,
      purchasePrice: Number(batch.purchasePrice) || 0,
      supplierId: batch.supplierId || "SUP-01",
      supplierName: batch.supplierName || "VH MEDICALS AND CHEMICALS",
      invoiceNumber: batch.invoiceNumber || "INV-GEN-01",
      mrp: Number(batch.mrp) || 0,
      discount: Number(batch.discount) || 0,
      grnId: batch.grnId || "GRN-SYS",
      location: batch.location || "Main Pharmacy",
      status: batch.status || "Available",
      createdAt: batch.createdAt || new Date().toISOString(),
    }

    if (existingIdx !== -1) {
      batches[existingIdx] = { ...batches[existingIdx], ...batchRecord }
    } else {
      batches.push(batchRecord)
    }
    this.saveBatches(batches)
    return targetId
  }

  // Purchase Orders
  static getPurchaseOrders(): AppPurchaseOrder[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(POS_KEY)
      const list: AppPurchaseOrder[] = stored ? JSON.parse(stored) : []
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }
  static savePurchaseOrders(pos: AppPurchaseOrder[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(POS_KEY, JSON.stringify(pos))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static addPurchaseOrder(po: AppPurchaseOrder) {
    const pos = this.getPurchaseOrders()
    pos.push(po)
    this.savePurchaseOrders(pos)
  }

  static updatePurchaseOrder(id: string, updates: Partial<AppPurchaseOrder>) {
    const pos = this.getPurchaseOrders()
    const idx = pos.findIndex((p) => p.id === id)
    if (idx !== -1) {
      pos[idx] = { ...pos[idx], ...updates }
      this.savePurchaseOrders(pos)
    }
  }

  // GRNs
  static getGRNs(): AppGRN[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(GRNS_KEY)
      if (!stored) return []
      const list: AppGRN[] = JSON.parse(stored)
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }
  static saveGRNs(grns: AppGRN[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GRNS_KEY, JSON.stringify(grns))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static addGRN(grn: AppGRN) {
    const grns = this.getGRNs()
    grns.push(grn)
    this.saveGRNs(grns)
  }

  // Stock Transactions
  static getStockTransactions(): AppStockTransaction[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(STOCK_TXS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  static saveStockTransactions(txs: AppStockTransaction[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STOCK_TXS_KEY, JSON.stringify(txs))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static addTransaction(tx: AppStockTransaction) {
    const txs = this.getStockTransactions()
    txs.push(tx)
    this.saveStockTransactions(txs)
  }

  // Prescriptions
  static getPrescriptions(): AppPrescription[] {
    if (typeof window === "undefined") return INITIAL_SEED_PRESCRIPTIONS
    try {
      const stored = window.localStorage.getItem(PRESCRIPTIONS_KEY)
      const prescriptions: AppPrescription[] = stored ? JSON.parse(stored) : []
      const currentIds = new Set(prescriptions.map((p) => p.id))
      const missing = INITIAL_SEED_PRESCRIPTIONS.filter((p) => !currentIds.has(p.id))
      if (missing.length > 0) {
        const merged = [...prescriptions, ...missing]
        this.savePrescriptions(merged)
        return merged
      }
      return prescriptions
    } catch {
      return INITIAL_SEED_PRESCRIPTIONS
    }
  }
  static savePrescriptions(rx: AppPrescription[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(rx))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  // Bills
  static getBills(): AppPharmacyBill[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(BILLS_KEY)
      let bills: AppPharmacyBill[] = stored ? JSON.parse(stored) : []
      if (!Array.isArray(bills)) return []

      // Self-heal: ensure modified return bills with 0 remaining items are strictly 0 totalAmount
      let changed = false
      bills = bills.map((b) => {
        if (b.isModifiedReturnBill || b.billNumber?.startsWith("MOD-")) {
          const hasRemainingItems = Array.isArray(b.items) && b.items.some((it) => (it.quantity || 0) > 0)
          if (!hasRemainingItems && ((b.totalAmount || 0) !== 0 || (b.subTotal || 0) !== 0 || (b.tax || 0) !== 0)) {
            changed = true
            return {
              ...b,
              totalAmount: 0,
              subTotal: 0,
              tax: 0,
              taxableTotal: 0,
              cgstTotal: 0,
              sgstTotal: 0,
              items: [],
              paymentStatus: "Paid",
            }
          }
        }
        return b
      })

      if (changed) {
        window.localStorage.setItem(BILLS_KEY, JSON.stringify(bills))
      }
      return bills
    } catch {
      return []
    }
  }
  static saveBills(bills: AppPharmacyBill[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BILLS_KEY, JSON.stringify(bills))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static addPharmacyBill(bill: AppPharmacyBill) {
    const bills = this.getBills()
    bills.unshift(bill)
    this.saveBills(bills)
  }

  static updatePharmacyBill(billId: string, updates: Partial<AppPharmacyBill>): AppPharmacyBill | null {
    const bills = this.getBills()
    const idx = bills.findIndex((b) => b.id === billId || b.billNumber === billId)
    if (idx !== -1) {
      bills[idx] = { ...bills[idx], ...updates }
      this.saveBills(bills)
      return bills[idx]
    }
    return null
  }

  // Returns
  static getReturns(): AppPharmacyReturn[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(RETURNS_KEY)
      let list: AppPharmacyReturn[] = stored ? JSON.parse(stored) : []
      if (!Array.isArray(list)) return []

      // Self-healing migration: if all items from original bill were returned, ensure refundAmount covers full bill total
      let changed = false
      const billsStored = window.localStorage.getItem(BILLS_KEY)
      const allBills: AppPharmacyBill[] = billsStored ? JSON.parse(billsStored) : []

      list = list.map((r) => {
        const origBill = allBills.find(
          (b) =>
            !b.isModifiedReturnBill &&
            (b.billNumber === r.originalBillNumber || b.id === r.originalBillId),
        )
        if (origBill && origBill.totalAmount) {
          const origTotalQty = (origBill.items || []).reduce((s, it) => s + (it.quantity || 0), 0)
          const retTotalQty = (r.items || []).reduce((s, it) => s + (it.returnQuantity || 0), 0) || r.returnQuantity || 0
          if (origTotalQty > 0 && retTotalQty >= origTotalQty && (r.refundAmount || 0) < origBill.totalAmount) {
            changed = true
            return {
              ...r,
              refundAmount: origBill.totalAmount,
            }
          }
        }
        return r
      })

      if (changed) {
        window.localStorage.setItem(RETURNS_KEY, JSON.stringify(list))
      }
      return list
    } catch {
      return []
    }
  }
  static saveReturns(returns: AppPharmacyReturn[]) {
    if (typeof window !== "undefined") {
      // Deduplicate returns by ID or returnNumber to ensure zero duplicates in Returns History
      const seen = new Set<string>()
      const uniqueReturns = returns.filter((r) => {
        const key = r.id || r.returnNumber
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      window.localStorage.setItem(RETURNS_KEY, JSON.stringify(uniqueReturns))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static deleteReturn(id: string) {
    const returns = this.getReturns()
    const retToDelete = returns.find(
      (r) => r.id === id || r.returnNumber === id,
    )
    const filteredReturns = returns.filter(
      (r) => r.id !== id && r.returnNumber !== id,
    )
    this.saveReturns(filteredReturns)

    // Also remove the corresponding modified bill if present
    if (retToDelete?.modifiedBillNumber) {
      const bills = this.getBills()
      const filteredBills = bills.filter(
        (b) =>
          b.billNumber !== retToDelete.modifiedBillNumber &&
          b.id !== retToDelete.modifiedBillId,
      )
      this.saveBills(filteredBills)
    }
  }

  static getReturnsForBill(billNumberOrId: string): AppPharmacyReturn[] {
    if (!billNumberOrId) return []
    const allReturns = this.getReturns()
    const query = billNumberOrId.toLowerCase().trim()
    return allReturns.filter((r) => {
      const origNo = (r.originalBillNumber || "").toLowerCase()
      const origId = (r.originalBillId || "").toLowerCase()
      const modNo = (r.modifiedBillNumber || "").toLowerCase()
      const modId = (r.modifiedBillId || "").toLowerCase()
      return origNo === query || origId === query || modNo === query || modId === query
    })
  }

  static processMedicineReturn(
    originalBill: AppPharmacyBill,
    returnedItems: AppPharmacyReturnItem[],
    returnReason: string,
    notes?: string,
  ): { returnRecord: AppPharmacyReturn; modifiedBill: AppPharmacyBill } {
    const returnNumber =
      "RET-" +
      new Date().getFullYear() +
      "-" +
      String(Math.floor(10000 + Math.random() * 90000))
    const targetBillNumber =
      originalBill.originalBillNumber || originalBill.billNumber
    const now = new Date().toISOString()

    // 1. Fetch current bills and find the true original bill to keep master items list
    const allBills = this.getBills()
    const trueOriginalBill =
      allBills.find(
        (b) =>
          !b.isModifiedReturnBill &&
          (b.billNumber === targetBillNumber || b.originalBillNumber === targetBillNumber),
      ) || originalBill

    // 2. Fetch all previous returns for this bill
    const previousReturns = this.getReturnsForBill(targetBillNumber)
    const previouslyReturnedMap: Record<string, number> = {}
    let allPreviousRefundAmount = 0
    previousReturns.forEach((ret) => {
      allPreviousRefundAmount += (ret.refundAmount || 0)
      ;(ret.items || []).forEach((item) => {
        const key = `${item.medicineId}_${item.batchNumber}`
        previouslyReturnedMap[key] =
          (previouslyReturnedMap[key] || 0) + (item.returnQuantity || 0)
      })
      if (
        ret.medicineId &&
        ret.returnQuantity &&
        (!ret.items || ret.items.length === 0)
      ) {
        const key = `${ret.medicineId}_${ret.batchNumber || ""}`
        previouslyReturnedMap[key] =
          (previouslyReturnedMap[key] || 0) + ret.returnQuantity
      }
    })

    const refundAmount = returnedItems.reduce(
      (sum, item) => sum + (item.refundAmount || 0),
      0,
    )
    const baseOriginalTotal = trueOriginalBill.totalAmount || 0

    // 3. Build modified bill items using master items
    const masterItems =
      trueOriginalBill.items && trueOriginalBill.items.length > 0
        ? trueOriginalBill.items
        : originalBill.items

    const modifiedBillItems: AppPharmacyBillItem[] = masterItems
      .map((origItem) => {
        const key = `${origItem.medicineId}_${origItem.batchNumber}`
        const prevReturned = previouslyReturnedMap[key] || 0
        const currentReturned =
          returnedItems.find(
            (r) =>
              r.medicineId === origItem.medicineId &&
              r.batchNumber === origItem.batchNumber,
          )?.returnQuantity || 0

        const totalReturned = prevReturned + currentReturned
        const finalQty = Math.max(0, origItem.quantity - totalReturned)
        const unitPrice = origItem.unitPrice
        const grossAmount = finalQty * unitPrice
        const discount = origItem.discount || 0
        const discAmt = grossAmount * (discount / 100)
        const taxable = grossAmount - discAmt
        const taxRate = origItem.tax || 12
        const cgstAmt = (taxable * (taxRate / 2)) / 100
        const sgstAmt = (taxable * (taxRate / 2)) / 100
        const totalPrice = taxable + cgstAmt + sgstAmt

        return {
          ...origItem,
          quantity: finalQty,
          grossAmount,
          taxableAmount: taxable,
          cgstAmount: cgstAmt,
          sgstAmount: sgstAmt,
          totalPrice,
        }
      })
      .filter((item) => item.quantity > 0)

    const isAllRemainingReturned = modifiedBillItems.length === 0
    const calculatedRefund = returnedItems.reduce(
      (sum, item) => sum + (item.refundAmount || 0),
      0,
    )
    const effectiveRefundAmount = isAllRemainingReturned
      ? Math.max(calculatedRefund, baseOriginalTotal - allPreviousRefundAmount)
      : calculatedRefund

    const subTotal = isAllRemainingReturned
      ? 0
      : modifiedBillItems.reduce((s, i) => s + (i.taxableAmount || 0), 0)
    const cgstTotal = isAllRemainingReturned
      ? 0
      : modifiedBillItems.reduce((s, i) => s + (i.cgstAmount || 0), 0)
    const sgstTotal = isAllRemainingReturned
      ? 0
      : modifiedBillItems.reduce((s, i) => s + (i.sgstAmount || 0), 0)
    const totalTax = cgstTotal + sgstTotal
    const itemsTotal = modifiedBillItems.reduce(
      (s, i) => s + (i.totalPrice || 0),
      0,
    )
    const modifiedTotalAmount = isAllRemainingReturned
      ? 0
      : Math.max(0, Number(itemsTotal.toFixed(2)))

    const modifiedBill: AppPharmacyBill = {
      id: "MOD-" + Date.now(),
      billNumber: targetBillNumber,
      originalBillNumber: targetBillNumber,
      isModifiedReturnBill: true,
      patientId: trueOriginalBill.patientId,
      patientName: trueOriginalBill.patientName,
      uhid: trueOriginalBill.uhid,
      doctorName: trueOriginalBill.doctorName,
      department: trueOriginalBill.department,
      billType: trueOriginalBill.billType,
      paymentStatus:
        modifiedTotalAmount === 0 ? "Paid" : trueOriginalBill.paymentStatus,
      paymentMode: trueOriginalBill.paymentMode,
      prescriptionId: trueOriginalBill.prescriptionId,
      items: modifiedBillItems,
      subTotal,
      discount: isAllRemainingReturned ? 0 : trueOriginalBill.discount || 0,
      tax: totalTax,
      taxableTotal: subTotal,
      cgstTotal,
      sgstTotal,
      totalAmount: modifiedTotalAmount,
      createdBy: "Pharmacist",
      createdAt: now,
    }

    // 4. Create the return record
    const returnRecord: AppPharmacyReturn = {
      id: "RET-" + Date.now(),
      returnNumber,
      patientUhid: trueOriginalBill.uhid,
      patientName: trueOriginalBill.patientName,
      patientId: trueOriginalBill.patientId,
      doctorName: trueOriginalBill.doctorName,
      department: trueOriginalBill.department,
      originalBillId: trueOriginalBill.id,
      originalBillNumber: targetBillNumber,
      modifiedBillId: modifiedBill.id,
      modifiedBillNumber: targetBillNumber,
      items: returnedItems,
      medicineId: returnedItems[0]?.medicineId || "",
      batchNumber: returnedItems[0]?.batchNumber || "",
      returnQuantity: returnedItems.reduce(
        (sum, i) => sum + i.returnQuantity,
        0,
      ),
      originalTotalAmount: baseOriginalTotal,
      modifiedTotalAmount,
      refundAmount: effectiveRefundAmount,
      returnReason,
      notes,
      approvedBy: "Pharmacist",
      createdBy: "Pharmacist",
      status: "Completed",
      createdAt: now,
    }

    // 5. Save return record
    const returns = this.getReturns()
    returns.unshift(returnRecord)
    this.saveReturns(returns)

    // 6. Save modified bill (replace previous modified bill for this billNumber, keep original)
    const currentBills = this.getBills()
    const updatedBills = currentBills.filter(
      (b) =>
        !(
          b.isModifiedReturnBill &&
          (b.billNumber === targetBillNumber ||
            b.originalBillNumber === targetBillNumber)
        ),
    )
    updatedBills.unshift(modifiedBill)
    this.saveBills(updatedBills)

    // 5. Restock batches and record stock transactions
    const batches = this.getBatches()
    const medicines = this.getMedicines()

    returnedItems.forEach((item) => {
      if (item.returnQuantity <= 0) return

      let batch = batches.find(
        (b) =>
          b.medicineId === item.medicineId &&
          b.batchNumber?.trim().toLowerCase() === item.batchNumber?.trim().toLowerCase(),
      )
      if (!batch) {
        batch = batches.find((b) => b.medicineId === item.medicineId)
      }

      if (batch) {
        batch.availableQuantity = (batch.availableQuantity || 0) + item.returnQuantity
        this.updateBatch(batch.id, batch)
      } else {
        this.addBatch({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber || "B" + Math.floor(100000 + Math.random() * 900000),
          expiryDate: item.expiryDate || "2027-12-31",
          quantity: item.returnQuantity,
          availableQuantity: item.returnQuantity,
          purchasePrice: (item.unitPrice || 0) * 0.7,
          mrp: item.unitPrice || 0,
        })
      }

      // Directly update the medicine master stock as well
      const med = medicines.find(
        (m) =>
          m.id === item.medicineId ||
          m.medicineName?.toLowerCase() === item.medicineName?.toLowerCase() ||
          m.brandName?.toLowerCase() === item.medicineName?.toLowerCase(),
      )
      if (med) {
        const curStock = (med as any).stock ?? (med as any).currentStock ?? 0
        this.updateMedicine(med.id, {
          stock: curStock + item.returnQuantity,
          currentStock: curStock + item.returnQuantity,
        } as any)
      }

      this.addTransaction({
        id: "TXN" + Math.floor(Math.random() * 100000),
        date: now,
        medicineId: item.medicineId,
        batchId: batch ? batch.id : "B-" + item.batchNumber,
        quantity: item.returnQuantity,
        transactionType: "RETURNED",
        userId: "Pharmacist",
        reason: returnReason,
        patientId: originalBill.patientId,
        billId: originalBill.billNumber,
      })
    })

    // 6. Log audit
    this.logAudit(
      "Pharmacist",
      "Medicine Return",
      "Pharmacy Returns",
      returnNumber,
      `Processed return ${returnNumber} for bill ${originalBill.billNumber}. Refund: ₹${refundAmount.toFixed(2)}. Modified bill: ${modifiedBill.billNumber}`,
    )

    // 7. Push notification
    this.addNotification(
      "Medicine Return Processed",
      `Return ${returnNumber} processed for bill ${originalBill.billNumber}. Refund amount: ₹${refundAmount.toFixed(2)}. ${returnedItems.reduce((s, i) => s + i.returnQuantity, 0)} units restocked to inventory.`,
      "info",
      "Sales & Returns",
      "View Returns",
      "return",
    )

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }

    return { returnRecord, modifiedBill }
  }

  // Transfers
  static getTransfers(): AppStockTransfer[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(TRANSFERS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  static saveTransfers(transfers: AppStockTransfer[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TRANSFERS_KEY, JSON.stringify(transfers))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  // Supplier Returns
  static getSupplierReturns(): AppSupplierReturn[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(SUPPLIER_RETURNS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  static saveSupplierReturns(returns: AppSupplierReturn[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SUPPLIER_RETURNS_KEY, JSON.stringify(returns))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static processSupplierReturn(
    payload: Omit<AppSupplierReturn, "id" | "debitNoteNumber" | "status" | "createdAt" | "returnAmount" | "purchaseRate">,
    createdBy: string,
  ): AppSupplierReturn {
    const returns = this.getSupplierReturns()

    // Auto-calculate financial value
    const batches = this.getBatches()
    const batch = batches.find((b) => b.id === payload.batchId)
    if (!batch) throw new Error("Batch not found.")
    if (batch.availableQuantity < payload.quantity)
      throw new Error("Return quantity cannot exceed available stock.")

    const purchaseRate = batch.purchasePrice || 0
    const returnAmount = payload.quantity * purchaseRate

    // Immediately deduct stock from inventory so damaged or returned medicines are removed from shelf
    batch.availableQuantity -= payload.quantity
    this.updateBatch(batch.id, batch)

    // Also deduct from overall medicine stock to maintain live inventory balance
    const medicines = this.getMedicines()
    const med = medicines.find((m) => m.id === payload.medicineId)
    if (med) {
      const currentStock = Number((med as any).stock) || 0
      const updatedStock = Math.max(0, currentStock - payload.quantity)
      this.updateMedicine(med.id, { stock: updatedStock } as any)
    }

    const suppliers = this.getSuppliers()
    const supObj = suppliers.find((s) => s.id === payload.supplierId)
    const resolvedSupplierName =
      payload.supplierName ||
      supObj?.supplierName ||
      (supObj as any)?.name ||
      batch.supplierName ||
      med?.supplierName ||
      "Supplier"
    const resolvedMedicineName =
      payload.medicineName || med?.medicineName || (med as any)?.name || "Medicine"
    const resolvedBatchNumber =
      payload.batchNumber || batch.batchNumber || "Batch"

    const newReturn: AppSupplierReturn = {
      ...payload,
      id: "RET-" + Date.now(),
      supplierName: resolvedSupplierName,
      medicineName: resolvedMedicineName,
      batchNumber: resolvedBatchNumber,
      debitNoteNumber:
        "DN-" +
        new Date().getFullYear() +
        "-" +
        String(Math.floor(1 + Math.random() * 90000)).padStart(5, "0"),
      purchaseRate,
      returnAmount,
      status: "Submitted (Stock Deducted)",
      createdBy,
      createdAt: new Date().toISOString(),
    }

    // Record stock deduction in Inventory Ledger
    this.addTransaction({
      id: "TXN" + Math.floor(Math.random() * 100000),
      date: new Date().toISOString(),
      medicineId: payload.medicineId,
      batchId: payload.batchId,
      quantity: payload.quantity,
      transactionType: "SUPPLIER_RETURN",
      userId: createdBy,
      reason: `Supplier Return (DN: ${newReturn.debitNoteNumber}): ${payload.reason}`,
    })

    returns.push(newReturn)
    this.saveSupplierReturns(returns)

    this.logAudit(
      createdBy,
      "Supplier Return Submitted",
      "Inventory",
      newReturn.debitNoteNumber,
      `Submitted return of ${payload.quantity} units of batch ${batch.batchNumber} to supplier. Stock deducted immediately. Reason: ${payload.reason}`,
    )

    this.addNotification(
      "Supplier Return Submitted",
      `Debit Note ${newReturn.debitNoteNumber} issued. ${payload.quantity} units deducted from inventory for supplier return.`,
      "info",
      "supplier-returns",
      "View Debit Note",
      "return",
    )

    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))

    return newReturn
  }

  static updateSupplierReturnStatus(
    returnId: string,
    newStatus: AppSupplierReturn["status"],
    user: string,
  ): AppSupplierReturn {
    const returns = this.getSupplierReturns()
    const rtn = returns.find((r) => r.id === returnId)
    if (!rtn) throw new Error("Return not found.")

    const oldStatus = rtn.status
    rtn.status = newStatus
    rtn.updatedAt = new Date().toISOString()

    // Stock Deduction Logic (only if not already deducted upon return submission)
    const alreadyDeducted = oldStatus.includes("Stock Deducted") || (rtn as any).stockDeducted
    if (newStatus === "Approved" && oldStatus !== "Approved" && !alreadyDeducted) {
      rtn.approvedBy = user
      const batches = this.getBatches()
      const batch = batches.find((b) => b.id === rtn.batchId)

      if (batch) {
        if (batch.availableQuantity >= rtn.quantity) {
          batch.availableQuantity -= rtn.quantity
          this.updateBatch(batch.id, batch)

          this.addTransaction({
            id: "TXN" + Math.floor(Math.random() * 100000),
            date: new Date().toISOString(),
            medicineId: rtn.medicineId,
            batchId: rtn.batchId,
            quantity: rtn.quantity,
            transactionType: "SUPPLIER_RETURN",
            userId: user,
            reason: `Supplier Return (DN: ${rtn.debitNoteNumber}): ${rtn.reason}`,
          })
          this.logAudit(
            user,
            "Stock Deducted",
            "Inventory",
            rtn.debitNoteNumber,
            `Stock deducted for Approved Return (${rtn.quantity} units)`,
          )
        } else {
          throw new Error(
            `Cannot approve: Insufficient stock available. Only ${batch.availableQuantity} left.`,
          )
        }
      }
    }

    this.saveSupplierReturns(returns)
    this.logAudit(
      user,
      `Return ${newStatus}`,
      "Inventory",
      rtn.debitNoteNumber,
      `Return status changed from ${oldStatus} to ${newStatus}`,
    )

    if (newStatus === "Approved") {
      this.addNotification(
        "Return Approved",
        `Debit Note ${rtn.debitNoteNumber} approved and stock deducted.`,
        "success",
      )
    } else if (newStatus === "Credit Received") {
      this.addNotification(
        "Credit Received",
        `Credit applied for Debit Note ${rtn.debitNoteNumber} (₹${rtn.returnAmount}).`,
        "success",
      )
    }

    return rtn
  }

  // Adjustments
  static getAdjustments(): AppStockAdjustment[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(ADJUSTMENTS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  static saveAdjustments(adjustments: AppStockAdjustment[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADJUSTMENTS_KEY, JSON.stringify(adjustments))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  // Medicine Write-Offs (Damaged & Non-Saleable Stock)
  static getWriteOffs(): AppMedicineWriteOff[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(WRITE_OFFS_KEY)
      const list: AppMedicineWriteOff[] = stored ? JSON.parse(stored) : []
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }

  static saveWriteOffs(writeOffs: AppMedicineWriteOff[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WRITE_OFFS_KEY, JSON.stringify(writeOffs))
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static executeMedicineWriteOff(
    payload: {
      medicineId: string
      batchId: string
      quantity: number
      reason: string
      remarks?: string
    },
    user: string = "Pharmacist",
  ): { success: boolean; writeOff: AppMedicineWriteOff; batch: AppBatch } {
    // 1. Validate inputs
    if (!payload.medicineId) throw new Error("Please select a medicine.")
    if (!payload.batchId) throw new Error("Please select a batch.")
    if (!payload.quantity || payload.quantity <= 0)
      throw new Error("Write-off quantity must be greater than zero.")
    if (!payload.reason || !payload.reason.trim())
      throw new Error("Reason for write-off is required.")

    // 2. Fetch fresh medicine and batch records
    const medicines = this.getMedicines()
    const med = medicines.find((m) => m.id === payload.medicineId)
    if (!med) throw new Error("Medicine not found in inventory.")

    const batches = this.getBatches()
    const batch = batches.find((b) => b.id === payload.batchId)
    if (!batch) throw new Error("Batch not found in inventory.")

    // 3. Revalidate stock availability atomically
    if (batch.availableQuantity < payload.quantity) {
      throw new Error(
        `Insufficient stock: Available quantity is ${batch.availableQuantity}, cannot write off ${payload.quantity}.`,
      )
    }

    const previousStock = batch.availableQuantity
    const remainingStock = previousStock - payload.quantity
    const unitCost = batch.purchasePrice || 0
    const totalLossValue = payload.quantity * unitCost
    const now = new Date().toISOString()
    const year = new Date().getFullYear()

    // 4. Generate sequential receipt number
    const writeOffs = this.getWriteOffs()
    const currentYearPrefix = `WO-${year}-`
    const currentYearWos = writeOffs.filter((w) =>
      w.receiptNumber?.startsWith(currentYearPrefix),
    )
    let nextSeq = 1
    if (currentYearWos.length > 0) {
      const seqs = currentYearWos
        .map((w) => {
          const parts = w.receiptNumber.split("-")
          return parts.length === 3 ? parseInt(parts[2], 10) : 0
        })
        .filter((n) => !isNaN(n))
      if (seqs.length > 0) nextSeq = Math.max(...seqs) + 1
    }
    const receiptNumber = `${currentYearPrefix}${String(nextSeq).padStart(6, "0")}`

    // 5. Create write-off record
    const writeOffRecord: AppMedicineWriteOff = {
      id: receiptNumber,
      receiptNumber,
      date: now,
      medicineId: med.id,
      medicineName: med.brandName || med.medicineName,
      medicineCode: med.hsnCode || med.barcode || med.id,
      genericName: med.genericName,
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      unitOfMeasure: med.unit || med.dosageForm || "Units",
      quantity: payload.quantity,
      previousStock,
      remainingStock,
      unitCost,
      totalLossValue,
      reason: payload.reason.trim(),
      remarks: payload.remarks?.trim() || "",
      writtenOffBy: user,
      status: "COMPLETED",
      createdAt: now,
    }

    // 6. Deduct stock from batch atomically
    batch.availableQuantity = remainingStock
    this.updateBatch(batch.id, batch)
    if ((med as any).stock !== undefined) {
      (med as any).stock = Math.max(0, ((med as any).stock || 0) - payload.quantity)
      this.updateMedicine(med.id, med)
    }

    // 7. Record in stock transactions
    this.addTransaction({
      id: "TXN" + Math.floor(Math.random() * 100000),
      date: now,
      medicineId: med.id,
      batchId: batch.id,
      quantity: payload.quantity,
      transactionType: "WRITE_OFF",
      userId: user,
      reason: `Write-Off (${receiptNumber}): ${payload.reason.trim()}`,
    })

    // 8. Persist write-off record
    writeOffs.unshift(writeOffRecord)
    this.saveWriteOffs(writeOffs)

    // 9. Log in audit log
    this.logAudit(
      user,
      "Medicine Write-Off",
      "Inventory",
      receiptNumber,
      `Written off ${payload.quantity} units of ${writeOffRecord.medicineName} (Batch: ${batch.batchNumber}). Reason: ${payload.reason.trim()}. Loss: ₹${totalLossValue.toFixed(2)}`,
    )

    // 10. Record notification
    this.addNotification(
      `Medicine Written Off (${receiptNumber})`,
      `${payload.quantity} units of ${writeOffRecord.medicineName} written off from Batch ${batch.batchNumber}. Reason: ${payload.reason.trim()}`,
      "warning",
    )

    // 11. Dispatch toast event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hospai_pharmacy_toast", {
          detail: {
            message: `Write-Off ${receiptNumber} completed successfully. Stock updated.`,
            type: "success",
          },
        }),
      )
    }

    return { success: true, writeOff: writeOffRecord, batch }
  }

  // Clarifications
  static getClarifications(): AppPrescriptionClarification[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(CLARIFICATIONS_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  static saveClarifications(clarifications: AppPrescriptionClarification[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CLARIFICATIONS_KEY,
        JSON.stringify(clarifications),
      )
      window.dispatchEvent(new Event("storage"))
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    }
  }

  static updatePrescription(id: string, updates: Partial<AppPrescription>) {
    const rxs = this.getPrescriptions()
    const idx = rxs.findIndex((r) => r.id === id)
    if (idx > -1) {
      rxs[idx] = { ...rxs[idx], ...updates }
      this.savePrescriptions(rxs)
    }
  }

  static logAudit(
    user: string,
    action: string,
    module: string,
    record: string,
    details?: string,
  ) {
    const logs = this.getAuditLogs()
    logs.unshift({
      id: "LOG" + Date.now(),
      timestamp: new Date().toISOString(),
      user,
      action,
      module,
      record: details !== undefined ? record : "SYS",
      details: details !== undefined ? details : record,
    })
    this.saveAuditLogs(logs)
  }

  // FEFO Helper Engine
  // Given a medicine and quantity, it returns the exact batch splits required to fulfill the order based on Earliest Expiry.
  static executeFEFOSplit(
    medicineId: string,
    requiredQty: number,
    currentBatches: AppBatch[],
    location?: string,
  ): {
    success: boolean
    splits: { batch: AppBatch ;usedQty: number }[]
    remainingBatches: AppBatch[]
  } {
    const availableBatches = currentBatches.filter(
      (b) =>
        b.medicineId === medicineId &&
        (b.availableQuantity ?? b.quantity ?? 0) > 0 &&
        (!location ||
          location.toLowerCase() === "all" ||
          location === "Main Pharmacy" ||
          (b.location || "Main Pharmacy") === location ||
          b.location?.startsWith("Rack") ||
          Boolean(b.location))
    )

    // Calculate total available to see if fulfillment is possible
    const totalAvailable = availableBatches.reduce(
      (sum, b) => sum + b.availableQuantity,
      0,
    )
    if (totalAvailable < requiredQty) {
      return { success: false, splits: [], remainingBatches: currentBatches }
    }

    // Sort by Expiry Date (FEFO)
    availableBatches.sort(
      (a, b) =>
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    )

    let remainingToFulfill = requiredQty
    const splits: { batch: AppBatch ;usedQty: number }[] = []

    // Deep copy to prevent mutating the original array passed in until caller saves
    const updatedBatches = JSON.parse(
      JSON.stringify(currentBatches),
    ) as AppBatch[]

    for (const batch of availableBatches) {
      if (remainingToFulfill <= 0) break

      const targetBatchIndex = updatedBatches.findIndex(
        (b) => b.id === batch.id,
      )
      if (targetBatchIndex === -1) continue

      const targetBatch = updatedBatches[targetBatchIndex]
      const canTake = Math.min(
        targetBatch.availableQuantity,
        remainingToFulfill,
      )

      splits.push({ batch: { ...targetBatch }, usedQty: canTake })

      targetBatch.availableQuantity -= canTake
      remainingToFulfill -= canTake
    }

    return {
      success: remainingToFulfill === 0,
      splits,
      remainingBatches: updatedBatches,
    }
  }
}
