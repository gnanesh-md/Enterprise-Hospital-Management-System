import { useState, useEffect } from "react";
import { PharmacyDatabase, isAwaitingVerification } from "../../../services/pharmacyDb";
import type { AppNotification, AppPrescription, AppStockTransfer } from "../../../services/pharmacyDb";

// Adapter between the stored records in `PharmacyDatabase` and the vocabulary
// this module's screens were written against (`name`/`mrp`/`billDate`, lowercase
// statuses, and so on). Every reshaping lives here rather than in the pages, so
// a field the store renames is corrected in one place; the pages that read a
// name the store never had were silently rendering `undefined` before.

// The pages style notifications from a three-way severity (`typeConfig` has no
// entry for the stored "alert"/"success", so those rendered an undefined icon).
const NOTIFICATION_SEVERITY: Record<AppNotification["type"], "critical" | "warning" | "info"> = {
  alert: "critical",
  warning: "warning",
  info: "info",
  success: "info",
};

// "Transferred" is the in-transit leg; the transfers screen tests for it by that
// name when deciding whether to offer "Receive".
const TRANSFER_STAGE: Record<AppStockTransfer["status"], string> = {
  Requested: "requested",
  Approved: "approved",
  Transferred: "in_transit",
  Received: "received",
  Cancelled: "cancelled",
};

function prescriptionStage(status: AppPrescription["status"]): "pending" | "ready" | "dispensed" | "rejected" {
  // "Awaiting verification" is decided by the shared helper rather than a list
  // kept here, so this queue cannot drift from the rest of the app -- the doctor
  // portal dispatches with "Sent To Pharmacy", and a screen carrying its own
  // shorter list is exactly how a dispatched prescription ends up invisible to
  // the pharmacist who is supposed to verify it.
  if (isAwaitingVerification(status)) return "pending";
  switch (status) {
    case "Dispensed":
      return "dispensed";
    case "Cancelled":
    case "Rejected":
      return "rejected";
    case "Verified":
    case "Approved":
    case "Preparing":
    case "Ready For Dispensing":
      return "ready";
    default:
      return "pending";
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function usePharmacyData() {
  const [medicines, setMedicines] = useState(() => PharmacyDatabase.getMedicines());
  const [prescriptions, setPrescriptions] = useState(() => PharmacyDatabase.getPrescriptions());
  const [suppliers, setSuppliers] = useState(() => PharmacyDatabase.getSuppliers());
  const [purchaseOrders, setPurchaseOrders] = useState(() => PharmacyDatabase.getPurchaseOrders());
  const [categories, setCategories] = useState(() => PharmacyDatabase.getCategories());
  const [batches, setBatches] = useState(() => PharmacyDatabase.getBatches());
  const [bills, setBills] = useState(() => PharmacyDatabase.getBills());

  // New States
  const [users, setUsers] = useState(() => PharmacyDatabase.getUsers());
  const [notifications, setNotifications] = useState(() => PharmacyDatabase.getNotifications());
  const [auditLogs, setAuditLogs] = useState(() => PharmacyDatabase.getAuditLogs());
  const [stockTransfers, setStockTransfers] = useState(() => PharmacyDatabase.getTransfers());
  const [stockTransactions, setStockTransactions] = useState(() => PharmacyDatabase.getStockTransactions());
  const [supplierReturns, setSupplierReturns] = useState(() => PharmacyDatabase.getSupplierReturns());
  const [grns, setGrns] = useState(() => PharmacyDatabase.getGRNs());

  const mappedMedicines = medicines.map(m => {
    const mBatches = batches.filter(b => b.medicineId === m.id);
    const latestBatch = mBatches.length > 0 ? mBatches[mBatches.length - 1] : null;
    const mrp = latestBatch ? latestBatch.mrp : 0;
    return {
      id: m.id,
      name: m.brandName || m.medicineName,
      generic: m.genericName,
      strength: m.strength || "N/A",
      form: m.dosageForm || "N/A",
      manufacturer: m.manufacturer,
      // Stock for *this* medicine -- summing every batch in the store counted
      // the whole pharmacy's inventory against each row.
      stock: mBatches.reduce((sum, b) => sum + b.availableQuantity, 0),
      mrp: mrp,
      price: mrp * 0.8,
      gst: m.taxPercentage || 12,
      status: m.activeStatus === "Active" ? "active" : "inactive",
      sku: m.hsnCode || m.id,
      barcode: m.barcode || "89000000000",
      schedule: m.scheduleType || "H",
      prescription: m.controlledSubstanceFlag || false,
      category: m.categoryId || "General",
      reorderLevel: m.reorderLevel || 10
    };
  });

  const expiringMedicines = batches
    .filter(b => new Date(b.expiryDate).getTime() < new Date().getTime() + 90 * 24 * 60 * 60 * 1000)
    .map(b => {
      const m = medicines.find(m => m.id === b.medicineId);
      const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      return {
        id: b.id,
        name: m ? m.medicineName : "Unknown",
        medicine: m ? m.medicineName : "Unknown",
        batch: b.batchNumber,
        expiry: b.expiryDate,
        stock: b.availableQuantity,
        quantity: b.availableQuantity,
        daysLeft,
        status: new Date(b.expiryDate) < new Date() ? "expired" : "expiring"
      };
    });

  const last7Days = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const mappedBills = bills.map(b => ({
    ...b,
    billDate: b.createdAt,
    finalAmount: b.totalAmount,
    pharmacistId: b.createdBy,
    items: b.items.map(i => ({ ...i, price: i.unitPrice })),
  }));

  const salesData = last7Days.map(dateStr => {
    // Only original bills (not modified return bills) count toward orders and gross sales
    const dayBills = mappedBills.filter(
      b => (b.billDate || "").startsWith(dateStr) && !b.isModifiedReturnBill
    );
    const dayReturns = PharmacyDatabase.getReturns().filter(
      r => (r.createdAt || "").startsWith(dateStr)
    );
    const dayGross = dayBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const dayRefunds = dayReturns.reduce((acc, r) => acc + (r.refundAmount || 0), 0);
    const dayNetRevenue = Math.max(0, dayGross - dayRefunds);

    return {
      date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: dayNetRevenue,
      gross: dayGross,
      refunds: dayRefunds,
      orders: dayBills.length
    };
  });

  const refresh = () => {
    setMedicines(PharmacyDatabase.getMedicines());
    setPrescriptions(PharmacyDatabase.getPrescriptions());
    setSuppliers(PharmacyDatabase.getSuppliers());
    setPurchaseOrders(PharmacyDatabase.getPurchaseOrders());
    setCategories(PharmacyDatabase.getCategories());
    setBatches(PharmacyDatabase.getBatches());
    setBills(PharmacyDatabase.getBills());
    setUsers(PharmacyDatabase.getUsers());
    setNotifications(PharmacyDatabase.getNotifications());
    setAuditLogs(PharmacyDatabase.getAuditLogs());
    setStockTransfers(PharmacyDatabase.getTransfers());
    setStockTransactions(PharmacyDatabase.getStockTransactions());
    setSupplierReturns(PharmacyDatabase.getSupplierReturns());
    setGrns(PharmacyDatabase.getGRNs());
  };

  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener("hospai_pharmacy_updated", handleUpdate);
    return () => window.removeEventListener("hospai_pharmacy_updated", handleUpdate);
  }, []);

  return {
    medicines: mappedMedicines,
    prescriptions: prescriptions.map(p => ({
      id: p.id,
      patient: p.patientName,
      age: p.age || 45,
      gender: p.gender || "Male",
      contact: p.patientId || "+91 9999999999",
      doctor: p.doctorName,
      department: p.department,
      regNo: "MCI/123",
      date: p.date,
      diagnosis: p.diagnosis || "N/A",
      items: p.items ? p.items.length : 0,
      priority: p.priority || "normal",
      status: prescriptionStage(p.status),
      pharmacist: p.verifiedBy || null,
      time: "10:00 AM",
      rawItems: p.items || []
    })),
    suppliers: suppliers.map(s => ({
      ...s,
      name: s.supplierName,
      contact: s.contactInformation,
      gstin: s.gstInformation,
      drugLicense: s.licenseDetails,
      phone: s.phone,
      email: s.email,
      outstanding: 0,
      lastPurchase: "2026-09-12",
      totalPurchase: 0,
    })),
    purchaseOrders: purchaseOrders.map(p => ({
      ...p,
      supplier: suppliers.find(s => s.id === p.supplierId)?.supplierName || "Unknown",
      itemsCount: p.items.length,
      items: p.items,
      total: p.totalOrderValue || 0,
      date: p.poDate,
      expected: p.expectedDeliveryDate,
    })),
    salesData,
    users: users.map(u => ({
      ...u,
      avatar: initials(u.name),
      branch: u.department,
      status: u.status === "Active" ? "active" : "inactive",
    })),
    notifications: notifications.map(n => ({
      ...n,
      type: NOTIFICATION_SEVERITY[n.type],
      time: n.timestamp,
    })),
    auditLogs,
    expiringMedicines,
    batches,
    bills: mappedBills,
    cartItems: [],
    stockTransfers: stockTransfers.map(t => ({
      ...t,
      from: t.fromLocation,
      to: t.toLocation,
      // One medicine line per transfer record.
      medicines: 1,
      date: t.createdAt,
      status: TRANSFER_STAGE[t.status],
    })),
    categories: categories.map(c => ({
      id: c.id,
      name: c.categoryName,
      description: c.description,
      medicines: medicines.filter(m => m.categoryId === c.id).length,
      status: c.status === "Active" ? "active" : "inactive",
      created: c.createdAt,
    })),
    stockTransactions,
    supplierReturns,
    grns,
    refresh
  };
}
