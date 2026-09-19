
export interface AppUser {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
  lastLogin: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "alert" | "info" | "success" | "warning";
  timestamp: string;
  read: boolean;
}

export interface AppAuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  record: string;
  details: string;
  // Origin address, when something upstream recorded one. Entries written by
  // `logAudit` in the browser have no way to know it, so this stays unset and
  // the log renders it as unknown -- an audit trail must not invent an origin.
  ip?: string;
}

export interface AppCategory {
  id: string;
  categoryName: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

export interface AppSupplier {
  id: string;
  supplierName: string;
  contactInformation: string;
  phone?: string;
  email?: string;
  address: string;
  gstInformation: string;
  licenseDetails: string;
  paymentTerms: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

export interface AppMedicine {
  id: string;
  medicineName: string;
  genericName: string;
  brandName: string;
  hsnCode?: string;
  categoryId: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  unit: string;
  barcode: string;
  taxPercentage: number;
  reorderLevel: number;
  storageCondition: string;
  scheduleType: string;
  controlledSubstanceFlag: boolean;
  activeStatus: "Active" | "Inactive";
  createdAt: string;
}

// FEFO enabled Batch
export interface AppBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  manufacturingDate: string;
  availableQuantity: number; // For FEFO
  purchasePrice: number;
  // Quantity received and the retail price, as `addBatch` actually stores them.
  // The GRN path (PharmacyOld) additionally fills in the procurement fields
  // below; batches created by `addBatch` leave them unset, so everything the
  // lean path omits is optional rather than a lie about what is on disk.
  quantity: number;
  mrp: number;
  grnId?: string;
  status?: string;
  initialQuantity?: number;
  sellingPrice?: number;
  supplierId?: string;
  invoiceNumber?: string;
  location?: string; // Phase 4 - Transfer capability
  createdAt: string;
}

// Procurement - Phase 2
export interface PurchaseOrderItem {
  medicineId: string;
  quantity: number;
  purchasePrice: number;
  taxPercentage: number;
  discount: number;
  totalAmount: number;
}

export type POStatus = "Draft" | "Submitted" | "Approved" | "Ordered" | "Partially Received" | "Received" | "Cancelled";

export interface AppPurchaseOrder {
  id: string;
  supplierId: string;
  poDate: string;
  expectedDeliveryDate: string;
  status: POStatus;
  items: PurchaseOrderItem[];
  totalOrderValue: number;
  createdAt: string;
  createdBy: string; // user id
}

export interface AppGRNItem {
  medicineId: string;
  orderedQty: number;
  receivedQty: number;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
}

export interface AppGRN {
  id: string;
  purchaseOrderId: string;
  supplierId: string;
  invoiceNumber: string;
  grnDate: string;
  items: AppGRNItem[];
  receivedBy: string; // user id
  createdAt: string;
}

export type StockTransactionType = "PURCHASE_RECEIVED" | "DISPENSED" | "RETURNED" | "EXPIRED" | "ADJUSTMENT" | "DAMAGED" | "TRANSFER_OUT" | "TRANSFER_IN" | "SUPPLIER_RETURN";

export interface AppStockTransaction {
  id: string;
  date: string;
  medicineId: string;
  batchId: string;
  quantity: number;
  transactionType: StockTransactionType;
  userId: string;
  reason?: string;
  patientId?: string;
  billId?: string;
  prescriptionId?: string;
}

// Phase 3 - Dispensing & Billing

export type PrescriptionSource = "DIGITAL" | "UPLOADED_IMAGE" | "OCR";
export type PrescriptionStatus = "Draft" | "Sent To Pharmacy" | "Received" | "OCR Processing" | "Verification Pending" | "Verified" | "Approved" | "Preparing" | "Ready For Dispensing" | "Dispensed" | "Cancelled" | "Rejected";

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
];

export function isAwaitingVerification(status: PrescriptionStatus): boolean {
  return AWAITING_VERIFICATION_STATUSES.includes(status);
}
export type DispensingStatus = "Waiting" | "Preparing" | "Ready" | "Dispensed" | "Cancelled";
export type PrescriptionPriority = "Normal" | "Urgent" | "Emergency";

export interface AppPrescriptionItem {
  id: string;
  medicineName: string; // OCR text or real name
  genericName?: string;
  medicineId?: string; // Resolved ID
  strength?: string;
  dosage: string;
  frequency?: string;
  duration: string;
  route?: string;
  instructions?: string;
  quantity: number;
  remarks?: string;
  substitutionAllowed: boolean;
  substitutionMedicineId?: string;
}

export interface AppPrescription {
  id: string;
  patientId: string;
  patientName: string;
  uhid: string;
  age?: number;
  gender?: string;
  visitId?: string;
  appointmentId?: string;
  doctorId: string;
  doctorName: string;
  department: string;
  diagnosis?: string;
  date: string;
  
  sourceType: PrescriptionSource;
  priority: PrescriptionPriority;
  status: PrescriptionStatus;
  dispensingStatus: DispensingStatus;
  
  imageUrl?: string;
  items: AppPrescriptionItem[];
  
  verifiedBy?: string;
  verifiedDate?: string;
  rejectedReason?: string;
  verificationNotes?: string;
  
  createdAt: string;
}

export interface AppPrescriptionClarification {
  id: string;
  prescriptionId: string;
  pharmacistId: string;
  doctorId: string;
  issueType: "Wrong Medicine" | "Stock Not Available" | "Dose Clarification Needed" | "Allergy Concern" | "Other";
  message: string;
  status: "Pending" | "Resolved";
  resolutionMessage?: string;
  createdAt: string;
}

export type BillType = "Cash" | "Insurance" | "Corporate" | "IP_Ward";
export type PaymentStatus = "Pending" | "Partially Paid" | "Paid" | "Insurance Pending" | "Credit Approved";

export interface AppPharmacyBillItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  batchLocation?: string; // Barcode/Shelf
  barcode?: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  tax: number;
  totalPrice: number;
  hsnCode?: string;
  mfgShortCode?: string;
}

// Removed duplicate interface AppPharmacyBillItem

export interface AppPharmacyBill {
  id: string;
  billNumber: string;
  patientId: string;
  patientName: string;
  uhid: string;
  doctorName: string;
  department: string;
  
  billType: BillType;
  paymentStatus: PaymentStatus;
  paymentMode?: string;
  
  prescriptionId?: string;
  items: AppPharmacyBillItem[];
  
  subTotal: number;
  discount: number;
  tax: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  totalAmount: number;
  
  createdBy: string;
  createdAt: string;
  isModifiedReturnBill?: boolean;
  originalBillNumber?: string;
}

// Phase 4 - Returns, Transfers, Expiry

export type ReturnStatus = "Requested" | "Approved" | "Rejected" | "Completed";

export interface AppPharmacyReturnItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate?: string;
  originalQuantity: number;
  returnQuantity: number;
  finalQuantity: number;
  unitPrice: number;
  originalAmount: number;
  refundAmount: number;
  finalAmount: number;
  tax?: number;
  discount?: number;
}

export interface AppPharmacyReturn {
  id: string;
  returnNumber: string;
  patientUhid: string;
  patientName?: string;
  patientId?: string;
  doctorName?: string;
  department?: string;
  originalBillId: string;
  originalBillNumber?: string;
  modifiedBillId?: string;
  modifiedBillNumber?: string;
  items?: AppPharmacyReturnItem[];
  // Backwards compatibility for single-item fields
  medicineId?: string;
  batchNumber?: string;
  returnQuantity?: number;
  originalTotalAmount?: number;
  modifiedTotalAmount?: number;
  refundAmount?: number;
  returnReason: string;
  notes?: string;
  approvedBy?: string;
  createdBy?: string;
  status: ReturnStatus;
  createdAt: string;
}

export type TransferStatus = "Requested" | "Approved" | "Transferred" | "Received" | "Cancelled";

export interface AppStockTransfer {
  id: string;
  transferId: string;
  fromLocation: string;
  toLocation: string;
  medicineId: string;
  batchId: string;
  quantity: number;
  requestedBy: string;
  approvedBy?: string;
  receivedBy?: string;
  status: TransferStatus;
  createdAt: string;
}

export interface AppSupplierReturn {
  id: string; // returnId internal
  debitNoteNumber: string; // DN-YYYY-XXXXX
  supplierId: string;
  medicineId: string;
  batchId: string;
  quantity: number;
  purchaseRate: number;
  returnAmount: number;
  reason: string;
  status: "Draft" | "Submitted" | "Approved" | "Sent To Supplier" | "Credit Note Pending" | "Credit Received" | "Closed";
  poNumber?: string;
  grnNumber?: string;
  invoiceNumber?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppStockAdjustment {
  id: string;
  medicineId: string;
  batchId: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  reason: "Physical Mismatch" | "Damage" | "Missing Stock";
  approvedBy: string;
  status: "Approved";
  createdAt: string;
}


const USERS_KEY = "hospai_pharm_users_v4";
const NOTIFICATIONS_KEY = "hospai_pharm_notifications_v4";
const AUDIT_LOGS_KEY = "hospai_pharm_audit_logs_v4";

const CATEGORIES_KEY = "hospai_pharm_categories_v4";
const SUPPLIERS_KEY = "hospai_pharm_suppliers_v4";
const MEDICINES_KEY = "hospai_pharm_medicines_v4";
const BATCHES_KEY = "hospai_pharm_batches_v4";
const POS_KEY = "hospai_pharm_pos_v4";
const GRNS_KEY = "hospai_pharm_grns_v4";
const STOCK_TXS_KEY = "hospai_pharm_stock_txs_v4";
const PRESCRIPTIONS_KEY = "hospai_pharm_rx_v4";
const BILLS_KEY = "hospai_pharm_bills_v4";
const RETURNS_KEY = "hospai_pharm_returns_v4";
const TRANSFERS_KEY = "hospai_pharm_transfers_v4";
const SUPPLIER_RETURNS_KEY = "hospai_pharm_supp_returns_v4";
const ADJUSTMENTS_KEY = "hospai_pharm_adjustments_v4";
const CLARIFICATIONS_KEY = "hospai_pharm_clarifications_v4";

export class PharmacyDatabase {
  // Categories

  static getUsers(): AppUser[] {
    if (typeof window === "undefined") return [];
    try { const stored = window.localStorage.getItem(USERS_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  }
  static saveUsers(users: AppUser[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(USERS_KEY, JSON.stringify(users)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }
  static addUser(user: AppUser) {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
  }
  static updateUser(id: string, updates: Partial<AppUser>) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...updates };
      this.saveUsers(users);
    }
  }

  static getNotifications(): AppNotification[] {
    if (typeof window === "undefined") return [];
    try { const stored = window.localStorage.getItem(NOTIFICATIONS_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  }
  static saveNotifications(notifications: AppNotification[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }
  static updateNotification(id: string, updates: Partial<AppNotification>) {
    const notifs = this.getNotifications();
    const idx = notifs.findIndex(n => n.id === id);
    if (idx > -1) {
      notifs[idx] = { ...notifs[idx], ...updates };
      this.saveNotifications(notifs);
    }
  }
  static deleteNotification(id: string) {
    let notifs = this.getNotifications();
    notifs = notifs.filter(n => n.id !== id);
    this.saveNotifications(notifs);
  }

  static addNotification(title: string, message: string, type: AppNotification["type"]) {
    const notifs = this.getNotifications();
    const newNotif: AppNotification = {
      id: "NOTIF" + Date.now() + Math.floor(Math.random() * 1000),
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    notifs.unshift(newNotif);
    this.saveNotifications(notifs);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_toast", { detail: newNotif }));
    }
  }

  static getAuditLogs(): AppAuditLog[] {
    if (typeof window === "undefined") return [];
    try { const stored = window.localStorage.getItem(AUDIT_LOGS_KEY); return stored ? JSON.parse(stored) : []; } catch { return []; }
  }
  static saveAuditLogs(logs: AppAuditLog[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static getCategories(): AppCategory[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(CATEGORIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveCategories(categories: AppCategory[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static addCategory(cat: AppCategory) {
    const cats = this.getCategories();
    cats.push(cat);
    this.saveCategories(cats);
  }

  static updateCategory(id: string, updates: Partial<AppCategory>) {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.id === id);
    if (idx !== -1) {
      cats[idx] = { ...cats[idx], ...updates };
      this.saveCategories(cats);
    }
  }

  static deleteCategory(id: string) {
    this.saveCategories(this.getCategories().filter(c => c.id !== id));
  }

  // Suppliers
  static getSuppliers(): AppSupplier[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(SUPPLIERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveSuppliers(suppliers: AppSupplier[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static addSupplier(sup: AppSupplier) {
    const sups = this.getSuppliers();
    sups.push(sup);
    this.saveSuppliers(sups);
  }

  static updateSupplier(id: string, updates: Partial<AppSupplier>) {
    const sups = this.getSuppliers();
    const idx = sups.findIndex(s => s.id === id);
    if (idx !== -1) {
      sups[idx] = { ...sups[idx], ...updates };
      this.saveSuppliers(sups);
    }
  }

  static deleteSupplier(id: string) {
    this.saveSuppliers(this.getSuppliers().filter(s => s.id !== id));
  }

  // Medicines
  static getMedicines(): AppMedicine[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(MEDICINES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveMedicines(medicines: AppMedicine[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static addMedicine(med: AppMedicine) {
    const meds = this.getMedicines();
    meds.push(med);
    this.saveMedicines(meds);
  }

  static updateMedicine(id: string, updates: any) {
    const meds = this.getMedicines();
    const idx = meds.findIndex(m => m.id === id);
    if (idx !== -1) {
      meds[idx] = { ...meds[idx], ...updates, medicineName: updates.name || meds[idx].medicineName };
      this.saveMedicines(meds);
    }
  }

  static deleteMedicine(id: string) {
    const meds = this.getMedicines();
    this.saveMedicines(meds.filter(m => m.id !== id));
  }

  // Batches
  static getBatches(): AppBatch[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(BATCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveBatches(batches: AppBatch[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(BATCHES_KEY, JSON.stringify(batches)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static updateBatch(id: string, updates: Partial<AppBatch>) {
    const batches = this.getBatches();
    const idx = batches.findIndex(b => b.id === id);
    if (idx !== -1) {
      batches[idx] = { ...batches[idx], ...updates };
      this.saveBatches(batches);
    }
  }

  static addBatch(batch: any) {
    const batches = this.getBatches();
    batches.push({
      id: "B" + Date.now() + Math.floor(Math.random()*100),
      medicineId: batch.medicineId,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      manufacturingDate: batch.mfg || "2024-01-01",
      quantity: batch.quantity,
      availableQuantity: batch.availableQuantity ?? batch.quantity,
      purchasePrice: batch.purchasePrice,
      mrp: batch.mrp,
      grnId: batch.grnId || "GRN-SYS",
      location: batch.location || "Main Pharmacy",
      status: "Available",
      createdAt: new Date().toISOString()
    });
    this.saveBatches(batches);
  }

  // Purchase Orders
  static getPurchaseOrders(): AppPurchaseOrder[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(POS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static savePurchaseOrders(pos: AppPurchaseOrder[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(POS_KEY, JSON.stringify(pos)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static addPurchaseOrder(po: AppPurchaseOrder) {
    const pos = this.getPurchaseOrders();
    pos.push(po);
    this.savePurchaseOrders(pos);
  }

  static updatePurchaseOrder(id: string, updates: Partial<AppPurchaseOrder>) {
    const pos = this.getPurchaseOrders();
    const idx = pos.findIndex(p => p.id === id);
    if (idx !== -1) {
      pos[idx] = { ...pos[idx], ...updates };
      this.savePurchaseOrders(pos);
    }
  }

  // GRNs
  static getGRNs(): AppGRN[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(GRNS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveGRNs(grns: AppGRN[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(GRNS_KEY, JSON.stringify(grns)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static addGRN(grn: AppGRN) {
    const grns = this.getGRNs();
    grns.push(grn);
    this.saveGRNs(grns);
  }

  // Stock Transactions
  static getStockTransactions(): AppStockTransaction[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(STOCK_TXS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveStockTransactions(txs: AppStockTransaction[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(STOCK_TXS_KEY, JSON.stringify(txs)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static addTransaction(tx: AppStockTransaction) {
    const txs = this.getStockTransactions();
    txs.push(tx);
    this.saveStockTransactions(txs);
  }

  // Prescriptions
  static getPrescriptions(): AppPrescription[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(PRESCRIPTIONS_KEY);
      const prescriptions: AppPrescription[] = stored ? JSON.parse(stored) : [];
      return prescriptions;
    } catch { return []; }
  }
  static savePrescriptions(rx: AppPrescription[]) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRESCRIPTIONS_KEY, JSON.stringify(rx));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  // Bills
  static getBills(): AppPharmacyBill[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(BILLS_KEY);
      let bills: AppPharmacyBill[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(bills)) bills = [];
      return bills;
    } catch { return []; }
  }
  static saveBills(bills: AppPharmacyBill[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(BILLS_KEY, JSON.stringify(bills)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static addPharmacyBill(bill: AppPharmacyBill) {
    const bills = this.getBills();
    bills.unshift(bill);
    this.saveBills(bills);
  }

  // Returns
  static getReturns(): AppPharmacyReturn[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(RETURNS_KEY);
      let list: AppPharmacyReturn[] = stored ? JSON.parse(stored) : [];
      // Clean up previous test returns for Rahul Verma (BILL-2026-001245)
      const cleaned = list.filter(
        r => r.originalBillNumber !== "BILL-2026-001245" && r.patientName !== "Rahul Verma"
      );
      if (cleaned.length !== list.length) {
        this.saveReturns(cleaned);
        return cleaned;
      }
      return list;
    } catch { return []; }
  }
  static saveReturns(returns: AppPharmacyReturn[]) {
    if (typeof window !== "undefined") {
      // Deduplicate returns by ID or returnNumber to ensure zero duplicates in Returns History
      const seen = new Set<string>();
      const uniqueReturns = returns.filter(r => {
        const key = r.id || r.returnNumber;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      window.localStorage.setItem(RETURNS_KEY, JSON.stringify(uniqueReturns));
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"));
    }
  }

  static deleteReturn(id: string) {
    const returns = this.getReturns();
    const retToDelete = returns.find(r => r.id === id || r.returnNumber === id);
    const filteredReturns = returns.filter(r => r.id !== id && r.returnNumber !== id);
    this.saveReturns(filteredReturns);

    // Also remove the corresponding modified bill if present
    if (retToDelete?.modifiedBillNumber) {
      const bills = this.getBills();
      const filteredBills = bills.filter(
        b => b.billNumber !== retToDelete.modifiedBillNumber && b.id !== retToDelete.modifiedBillId
      );
      this.saveBills(filteredBills);
    }
  }

  static getReturnsForBill(billNumberOrId: string): AppPharmacyReturn[] {
    const allReturns = this.getReturns();
    return allReturns.filter(
      r => r.originalBillNumber === billNumberOrId || r.originalBillId === billNumberOrId
    );
  }

  static processMedicineReturn(
    originalBill: AppPharmacyBill,
    returnedItems: AppPharmacyReturnItem[],
    returnReason: string,
    notes?: string
  ): { returnRecord: AppPharmacyReturn; modifiedBill: AppPharmacyBill } {
    const returnNumber = "RET-" + new Date().getFullYear() + "-" + String(Math.floor(10000 + Math.random() * 90000));
    const modifiedBillNumber = originalBill.originalBillNumber || originalBill.billNumber;
    const now = new Date().toISOString();

    const refundAmount = returnedItems.reduce((sum, item) => sum + (item.refundAmount || 0), 0);
    const modifiedTotalAmount = Math.max(0, (originalBill.totalAmount || 0) - refundAmount);

    // Calculate previous returns to accurately determine line items
    const previousReturns = this.getReturnsForBill(originalBill.billNumber);
    const previouslyReturnedMap: Record<string, number> = {};
    previousReturns.forEach(ret => {
      (ret.items || []).forEach(item => {
        const key = `${item.medicineId}_${item.batchNumber}`;
        previouslyReturnedMap[key] = (previouslyReturnedMap[key] || 0) + (item.returnQuantity || 0);
      });
      if (ret.medicineId && ret.returnQuantity && (!ret.items || ret.items.length === 0)) {
        const key = `${ret.medicineId}_${ret.batchNumber || ""}`;
        previouslyReturnedMap[key] = (previouslyReturnedMap[key] || 0) + ret.returnQuantity;
      }
    });

    // 1. Build modified bill items
    const modifiedBillItems: AppPharmacyBillItem[] = originalBill.items.map(origItem => {
      const key = `${origItem.medicineId}_${origItem.batchNumber}`;
      const prevReturned = previouslyReturnedMap[key] || 0;
      const currentReturned = returnedItems.find(
        r => r.medicineId === origItem.medicineId && r.batchNumber === origItem.batchNumber
      )?.returnQuantity || 0;

      const totalReturned = prevReturned + currentReturned;
      const finalQty = Math.max(0, origItem.quantity - totalReturned);
      const unitPrice = origItem.unitPrice;
      const grossAmount = finalQty * unitPrice;
      const discount = origItem.discount || 0;
      const discAmt = grossAmount * (discount / 100);
      const taxable = grossAmount - discAmt;
      const taxRate = origItem.tax || 12;
      const cgstAmt = (taxable * (taxRate / 2)) / 100;
      const sgstAmt = (taxable * (taxRate / 2)) / 100;
      const totalPrice = taxable + cgstAmt + sgstAmt;

      return {
        ...origItem,
        quantity: finalQty,
        grossAmount,
        taxableAmount: taxable,
        cgstAmount: cgstAmt,
        sgstAmount: sgstAmt,
        totalPrice,
      };
    }).filter(item => item.quantity > 0);

    const subTotal = modifiedBillItems.reduce((s, i) => s + (i.taxableAmount || 0), 0);
    const cgstTotal = modifiedBillItems.reduce((s, i) => s + (i.cgstAmount || 0), 0);
    const sgstTotal = modifiedBillItems.reduce((s, i) => s + (i.sgstAmount || 0), 0);
    const totalTax = cgstTotal + sgstTotal;

    const modifiedBill: AppPharmacyBill = {
      id: "PB-" + Date.now(),
      billNumber: modifiedBillNumber,
      originalBillNumber: originalBill.billNumber,
      isModifiedReturnBill: true,
      patientId: originalBill.patientId,
      patientName: originalBill.patientName,
      uhid: originalBill.uhid,
      doctorName: originalBill.doctorName,
      department: originalBill.department,
      billType: originalBill.billType,
      paymentStatus: modifiedTotalAmount === 0 ? "Paid" : originalBill.paymentStatus,
      paymentMode: originalBill.paymentMode,
      prescriptionId: originalBill.prescriptionId,
      items: modifiedBillItems,
      subTotal,
      discount: originalBill.discount || 0,
      tax: totalTax,
      taxableTotal: subTotal,
      cgstTotal,
      sgstTotal,
      totalAmount: modifiedTotalAmount,
      createdBy: "Pharmacist",
      createdAt: now,
    };

    // 2. Create the return record
    const returnRecord: AppPharmacyReturn = {
      id: "RET-" + Date.now(),
      returnNumber,
      patientUhid: originalBill.uhid,
      patientName: originalBill.patientName,
      patientId: originalBill.patientId,
      doctorName: originalBill.doctorName,
      department: originalBill.department,
      originalBillId: originalBill.id,
      originalBillNumber: originalBill.billNumber,
      modifiedBillId: modifiedBill.id,
      modifiedBillNumber: modifiedBill.billNumber,
      items: returnedItems,
      // For legacy single-item schema compatibility
      medicineId: returnedItems[0]?.medicineId || "",
      batchNumber: returnedItems[0]?.batchNumber || "",
      returnQuantity: returnedItems.reduce((sum, i) => sum + i.returnQuantity, 0),
      originalTotalAmount: originalBill.totalAmount,
      modifiedTotalAmount,
      refundAmount,
      returnReason,
      notes,
      approvedBy: "Pharmacist",
      createdBy: "Pharmacist",
      status: "Completed",
      createdAt: now,
    };

    // 3. Save return record
    const returns = this.getReturns();
    returns.unshift(returnRecord);
    this.saveReturns(returns);

    // 4. Save modified bill (IMPORTANT: Original bill is preserved untouched)
    this.addPharmacyBill(modifiedBill);

    // 5. Restock batches and record stock transactions
    const batches = this.getBatches();
    returnedItems.forEach(item => {
      if (item.returnQuantity <= 0) return;

      const batch = batches.find(
        b => b.medicineId === item.medicineId && b.batchNumber === item.batchNumber
      );
      if (batch) {
        batch.availableQuantity += item.returnQuantity;
        this.updateBatch(batch.id, batch);
      } else {
        this.addBatch({
          medicineId: item.medicineId,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate || "2027-12-31",
          quantity: item.returnQuantity,
          availableQuantity: item.returnQuantity,
          purchasePrice: (item.unitPrice || 0) * 0.7,
          mrp: item.unitPrice || 0,
        });
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
      });
    });

    // 6. Log audit
    this.logAudit(
      "Pharmacist",
      "Medicine Return",
      "Pharmacy Returns",
      returnNumber,
      `Processed return ${returnNumber} for bill ${originalBill.billNumber}. Refund: ₹${refundAmount.toFixed(2)}. Modified bill: ${modifiedBillNumber}`
    );

    // 7. Push notification
    this.addNotification(
      "Medicine Return Processed",
      `Return ${returnNumber} processed for bill ${originalBill.billNumber}. Refund amount: ₹${refundAmount.toFixed(2)}`,
      "info"
    );

    return { returnRecord, modifiedBill };
  }

  // Transfers
  static getTransfers(): AppStockTransfer[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(TRANSFERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveTransfers(transfers: AppStockTransfer[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(TRANSFERS_KEY, JSON.stringify(transfers)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  // Supplier Returns
  static getSupplierReturns(): AppSupplierReturn[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(SUPPLIER_RETURNS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveSupplierReturns(returns: AppSupplierReturn[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(SUPPLIER_RETURNS_KEY, JSON.stringify(returns)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  static processSupplierReturn(payload: Omit<AppSupplierReturn, "id" | "debitNoteNumber" | "status" | "createdAt" | "returnAmount" | "purchaseRate">, createdBy: string): AppSupplierReturn {
    const returns = this.getSupplierReturns();
    
    // Auto-calculate financial value
    const batches = this.getBatches();
    const batch = batches.find(b => b.id === payload.batchId);
    if (!batch) throw new Error("Batch not found.");
    if (batch.availableQuantity < payload.quantity) throw new Error("Return quantity cannot exceed available stock.");
    
    const purchaseRate = batch.purchasePrice || 0;
    const returnAmount = payload.quantity * purchaseRate;

    const newReturn: AppSupplierReturn = {
      ...payload,
      id: "RET-" + Date.now(),
      debitNoteNumber: "DN-" + new Date().getFullYear() + "-" + String(Math.floor(1 + Math.random() * 90000)).padStart(5, '0'),
      purchaseRate,
      returnAmount,
      status: "Draft",
      createdBy,
      createdAt: new Date().toISOString()
    };
    
    // NOTE: Stock is NOT deducted during "Draft" or "Submitted". It happens at "Approved".
    
    returns.push(newReturn);
    this.saveSupplierReturns(returns);
    
    this.logAudit(createdBy, "Return Created", "Inventory", newReturn.debitNoteNumber, `Draft Return created for ${payload.quantity} units of batch ${batch.batchNumber}`);
    return newReturn;
  }

  static updateSupplierReturnStatus(returnId: string, newStatus: AppSupplierReturn["status"], user: string): AppSupplierReturn {
    const returns = this.getSupplierReturns();
    const rtn = returns.find(r => r.id === returnId);
    if (!rtn) throw new Error("Return not found.");
    
    const oldStatus = rtn.status;
    rtn.status = newStatus;
    rtn.updatedAt = new Date().toISOString();
    
    // Stock Deduction Logic (only happens exactly when Approved)
    if (newStatus === "Approved" && oldStatus !== "Approved") {
      rtn.approvedBy = user;
      const batches = this.getBatches();
      const batch = batches.find(b => b.id === rtn.batchId);
      
      if (batch) {
        if (batch.availableQuantity >= rtn.quantity) {
          batch.availableQuantity -= rtn.quantity;
          this.updateBatch(batch.id, batch);
          
          this.addTransaction({
            id: "TXN" + Math.floor(Math.random() * 100000),
            date: new Date().toISOString(),
            medicineId: rtn.medicineId,
            batchId: rtn.batchId,
            quantity: rtn.quantity,
            transactionType: "SUPPLIER_RETURN",
            userId: user,
            reason: `Supplier Return (DN: ${rtn.debitNoteNumber}): ${rtn.reason}`
          });
          this.logAudit(user, "Stock Deducted", "Inventory", rtn.debitNoteNumber, `Stock deducted for Approved Return (${rtn.quantity} units)`);
        } else {
          throw new Error(`Cannot approve: Insufficient stock available. Only ${batch.availableQuantity} left.`);
        }
      }
    }

    this.saveSupplierReturns(returns);
    this.logAudit(user, `Return ${newStatus}`, "Inventory", rtn.debitNoteNumber, `Return status changed from ${oldStatus} to ${newStatus}`);
    
    if (newStatus === "Approved") {
       this.addNotification("Return Approved", `Debit Note ${rtn.debitNoteNumber} approved and stock deducted.`, "success");
    } else if (newStatus === "Credit Received") {
       this.addNotification("Credit Received", `Credit applied for Debit Note ${rtn.debitNoteNumber} (₹${rtn.returnAmount}).`, "success");
    }

    return rtn;
  }

  // Adjustments
  static getAdjustments(): AppStockAdjustment[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(ADJUSTMENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveAdjustments(adjustments: AppStockAdjustment[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(ADJUSTMENTS_KEY, JSON.stringify(adjustments)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }

  // Clarifications
  static getClarifications(): AppPrescriptionClarification[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem(CLARIFICATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }
  static saveClarifications(clarifications: AppPrescriptionClarification[]) {
    if (typeof window !== "undefined") { window.localStorage.setItem(CLARIFICATIONS_KEY, JSON.stringify(clarifications)); window.dispatchEvent(new Event("storage")); window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated")); }
  }


  static updatePrescription(id: string, updates: Partial<AppPrescription>) {
    const rxs = this.getPrescriptions();
    const idx = rxs.findIndex(r => r.id === id);
    if (idx > -1) {
      rxs[idx] = { ...rxs[idx], ...updates };
      this.savePrescriptions(rxs);
    }
  }

  static logAudit(user: string, action: string, module: string, record: string, details?: string) {
    const logs = this.getAuditLogs();
    logs.unshift({
      id: "LOG" + Date.now(),
      timestamp: new Date().toISOString(),
      user,
      action,
      module,
      record: details !== undefined ? record : "SYS",
      details: details !== undefined ? details : record,
    });
    this.saveAuditLogs(logs);
  }

  // FEFO Helper Engine
  // Given a medicine and quantity, it returns the exact batch splits required to fulfill the order based on Earliest Expiry.
  static executeFEFOSplit(medicineId: string, requiredQty: number, currentBatches: AppBatch[], location: string = "Main Pharmacy"): { success: boolean, splits: { batch: AppBatch, usedQty: number }[], remainingBatches: AppBatch[] } {
     const availableBatches = currentBatches.filter(b => b.medicineId === medicineId && b.availableQuantity > 0 && (b.location || "Main Pharmacy") === location);
     
     // Calculate total available to see if fulfillment is possible
     const totalAvailable = availableBatches.reduce((sum, b) => sum + b.availableQuantity, 0);
     if (totalAvailable < requiredQty) {
       return { success: false, splits: [], remainingBatches: currentBatches };
     }

     // Sort by Expiry Date (FEFO)
     availableBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

     let remainingToFulfill = requiredQty;
     const splits: { batch: AppBatch, usedQty: number }[] = [];
     
     // Deep copy to prevent mutating the original array passed in until caller saves
     const updatedBatches = JSON.parse(JSON.stringify(currentBatches)) as AppBatch[];

     for (const batch of availableBatches) {
        if (remainingToFulfill <= 0) break;

        const targetBatchIndex = updatedBatches.findIndex(b => b.id === batch.id);
        if (targetBatchIndex === -1) continue;
        
        const targetBatch = updatedBatches[targetBatchIndex];
        const canTake = Math.min(targetBatch.availableQuantity, remainingToFulfill);
        
        splits.push({ batch: { ...targetBatch }, usedQty: canTake });
        
        targetBatch.availableQuantity -= canTake;
        remainingToFulfill -= canTake;
     }

     return {
       success: remainingToFulfill === 0,
       splits,
       remainingBatches: updatedBatches
     };
  }
}
