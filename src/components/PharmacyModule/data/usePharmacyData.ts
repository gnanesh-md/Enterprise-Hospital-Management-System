import { useState, useEffect } from "react"

import {
  PharmacyDatabase,
  isAwaitingVerification,
} from "../../../services/pharmacyDb"

import type {
  AppNotification,
  AppPrescription,
  AppStockTransfer,
} from "../../../services/pharmacyDb"

// Adapter between the stored records in `PharmacyDatabase` and the vocabulary

// this module's screens were written against (`name`/`mrp`/`billDate`, lowercase

// statuses, and so on). Every reshaping lives here rather than in the pages, so

// a field the store renames is corrected in one place; the pages that read a

// name the store never had were silently rendering `undefined` before.

// The pages style notifications from a three-way severity (`typeConfig` has no

// entry for the stored "alert"/"success", so those rendered an undefined icon).

const NOTIFICATION_SEVERITY: Record<string, "critical" | "warning" | "info"> = {
  alert: "critical",
  critical: "critical",
  warning: "warning",
  info: "info",
  success: "info",
}

// "Transferred" is the in-transit leg; the transfers screen tests for it by that

// name when deciding whether to offer "Receive".

const TRANSFER_STAGE: Record<AppStockTransfer["status"], string> = {
  Requested: "requested",

  Approved: "approved",

  Transferred: "in_transit",

  Received: "received",

  Cancelled: "cancelled",
}

function prescriptionStage(
  status: AppPrescription["status"],
): "pending" | "ready" | "dispensed" | "rejected" {
  // "Awaiting verification" is decided by the shared helper rather than a list

  // kept here, so this queue cannot drift from the rest of the app -- the doctor

  // portal dispatches with "Sent To Pharmacy", and a screen carrying its own

  // shorter list is exactly how a dispatched prescription ends up invisible to

  // the pharmacist who is supposed to verify it.

  if (isAwaitingVerification(status)) return "pending"

  switch (status) {
    case "Dispensed":
      return "dispensed"

    case "Cancelled":

    case "Rejected":
      return "rejected"

    case "Verified":

    case "Approved":

    case "Preparing":

    case "Ready For Dispensing":
      return "ready"

    default:
      return "pending"
  }
}

function initials(name: string): string {
  return name

    .split(/\s+/)

    .filter(Boolean)

    .slice(0, 2)

    .map((part) => part[0]?.toUpperCase() ?? "")

    .join("")
}

export function usePharmacyData() {
  const [medicines, setMedicines] = useState(() =>
    PharmacyDatabase.getMedicines(),
  )

  const [prescriptions, setPrescriptions] = useState(() =>
    PharmacyDatabase.getPrescriptions(),
  )

  const [suppliers, setSuppliers] = useState(() =>
    PharmacyDatabase.getSuppliers(),
  )

  const [purchaseOrders, setPurchaseOrders] = useState(() =>
    PharmacyDatabase.getPurchaseOrders(),
  )

  const [categories, setCategories] = useState(() =>
    PharmacyDatabase.getCategories(),
  )

  const [batches, setBatches] = useState(() => PharmacyDatabase.getBatches())

  const [bills, setBills] = useState(() => PharmacyDatabase.getBills())

  // New States

  const [users, setUsers] = useState(() => PharmacyDatabase.getUsers())

  const [notifications, setNotifications] = useState(() =>
    PharmacyDatabase.getNotifications(),
  )

  const [auditLogs, setAuditLogs] = useState(() =>
    PharmacyDatabase.getAuditLogs(),
  )

  const [stockTransfers, setStockTransfers] = useState(() =>
    PharmacyDatabase.getTransfers(),
  )

  const [stockTransactions, setStockTransactions] = useState(() =>
    PharmacyDatabase.getStockTransactions(),
  )

  const [grns, setGrns] = useState(() => PharmacyDatabase.getGRNs())

  const [supplierReturns, setSupplierReturns] = useState(() =>
    PharmacyDatabase.getSupplierReturns(),
  )

  const [adjustments, setAdjustments] = useState(() =>
    PharmacyDatabase.getAdjustments(),
  )

  const [returns, setReturns] = useState(() => PharmacyDatabase.getReturns())

  const [writeOffs, setWriteOffs] = useState(() =>
    PharmacyDatabase.getWriteOffs(),
  )

  const mappedMedicines = medicines.map((m) => {
    const mBatches = batches.filter((b) => b.medicineId === m.id)
    const latestBatch =
      mBatches.length > 0 ? mBatches[mBatches.length - 1] : null

    const mrp = latestBatch?.mrp || (m as any).mrp || 0
    const batchStock = mBatches.reduce((sum, b) => sum + (b.availableQuantity ?? b.quantity ?? 0), 0)
    const stock = Math.max(0, mBatches.length > 0 ? batchStock : ((m as any).stock || 0))
    const purchasePrice = latestBatch?.purchasePrice || (m as any).purchasePrice || (mrp > 0 ? +(mrp * 0.75).toFixed(2) : 0)
    const gstRate = m.taxPercentage !== undefined ? m.taxPercentage : 5

    return {
      id: m.id,
      name: m.brandName || m.medicineName,
      generic: m.genericName,
      strength: m.strength || "N/A",
      form: m.dosageForm || "N/A",
      packing: (m as any).packing || (m as any).pack || "",
      manufacturer: m.manufacturer,
      stock,
      mrp,
      price: purchasePrice,
      purchasePrice,
      gst: gstRate,
      batchNumber: latestBatch?.batchNumber || (m as any).batchNumber || "",
      expiryDate: latestBatch?.expiryDate || (m as any).expiryDate || "",
      discount: latestBatch?.discount || (m as any).discount || 0,
      status: m.activeStatus === "Active" ? "active" : "inactive",
      sku: m.hsnCode || m.id,
      hsnCode: m.hsnCode || "3004 039",
      mnfCode: (m as any).mnfCode || (m.manufacturer ? m.manufacturer.substring(0, 4).toUpperCase() : "MANK"),
      binNo: (latestBatch as any)?.location || (m as any).binNo || "",
      supplierName: (m as any).supplierName || latestBatch?.supplierName || "VH MEDICALS AND CHEMICALS",
      barcode: m.barcode || "89000000000",
      schedule: m.scheduleType || "H",
      prescription: m.controlledSubstanceFlag || false,
      category: (m as any).categoryId || "General",
      reorderLevel: m.reorderLevel || 10,
    }
  })

  const expiringMedicines = batches
    .filter((b) => medicines.some((m) => m.id === b.medicineId))
    .filter(
      (b) =>
        new Date(b.expiryDate).getTime() <
        new Date().getTime() + 90 * 24 * 60 * 60 * 1000,
    )
    .map((b) => {
      const m = medicines.find((m) => m.id === b.medicineId)
      const daysLeft = Math.ceil(
        (new Date(b.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      )
      return {
        id: b.id,
        medicineId: b.medicineId,
        name: m ? m.medicineName : "Unknown",
        medicine: m ? m.medicineName : "Unknown",
        batch: b.batchNumber,
        expiry: b.expiryDate,
        stock: b.availableQuantity,
        quantity: b.availableQuantity,
        daysLeft,
        status: new Date(b.expiryDate) < new Date() ? "expired" : "expiring",
      }
    })

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()

    d.setDate(d.getDate() - (6 - i))

    return d.toISOString().split("T")[0]
  })

  const mappedBills = bills.map((b) => ({
    ...b,

    billDate: b.createdAt,
    finalAmount: b.totalAmount,
    pharmacistId: b.createdBy,
    items: b.items.map((i) => ({ ...i, price: i.unitPrice })),
  }))

  const salesData = last7Days.map((dateStr) => {
    // Only original bills (not modified return bills) count toward orders and gross sales
    const dayBills = mappedBills.filter(
      (b) =>
        (b.billDate || "").startsWith(dateStr) &&
        !b.billNumber?.startsWith("MOD-") &&
        !(b as any).isModifiedReturnBill,
    )
    const dayReturns = returns.filter((r: any) =>
      (r.createdAt || "").startsWith(dateStr),
    )
    const dayGross = dayBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0)
    const dayRefunds = dayReturns.reduce(
      (acc: number, r: any) => acc + (r.refundAmount || 0),
      0,
    )
    const dayNetRevenue = Math.max(0, dayGross - dayRefunds)

    return {
      date: new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" }),
      revenue: dayNetRevenue,
      gross: dayGross,
      refunds: dayRefunds,
      orders: dayBills.length,
    }
  })

  const refresh = () => {
    setMedicines(PharmacyDatabase.getMedicines())
    setPrescriptions(PharmacyDatabase.getPrescriptions())
    setSuppliers(PharmacyDatabase.getSuppliers())
    setPurchaseOrders(PharmacyDatabase.getPurchaseOrders())
    setCategories(PharmacyDatabase.getCategories())
    setBatches(PharmacyDatabase.getBatches())
    setBills(PharmacyDatabase.getBills())
    setUsers(PharmacyDatabase.getUsers())
    setNotifications(PharmacyDatabase.getNotifications())
    setAuditLogs(PharmacyDatabase.getAuditLogs())
    setStockTransfers(PharmacyDatabase.getTransfers())
    setStockTransactions(PharmacyDatabase.getStockTransactions())
    setGrns(PharmacyDatabase.getGRNs())
    setSupplierReturns(PharmacyDatabase.getSupplierReturns())
    setAdjustments(PharmacyDatabase.getAdjustments())
    setReturns(PharmacyDatabase.getReturns())
    setWriteOffs(PharmacyDatabase.getWriteOffs())
  }

  useEffect(() => {
    refresh()

    const handleUpdate = () => refresh()

    window.addEventListener("hospai_pharmacy_updated", handleUpdate)
    window.addEventListener("storage", handleUpdate)

    return () => {
      window.removeEventListener("hospai_pharmacy_updated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [])

  const mappedSupplierReturns = supplierReturns.map((r) => {
    const s = suppliers.find((sup) => sup.id === r.supplierId)

    const m = medicines.find((med) => med.id === r.medicineId)

    const b = batches.find((bat) => bat.id === r.batchId)

    const unitCost = r.unitCost ?? (b ? b.purchasePrice : 0)

    const returnAmount = r.returnAmount ?? r.quantity * unitCost

    return {
      ...r,

      supplierName: r.supplierName || (s ? s.supplierName : "Unknown Supplier"),

      medicineName: r.medicineName || (m ? m.medicineName : "Unknown Medicine"),

      batchNumber: r.batchNumber || (b ? b.batchNumber : "N/A"),

      unitCost,

      returnAmount,
    }
  })

  const mappedDamagedStock = adjustments.map((a) => {
    const m = medicines.find((med) => med.id === a.medicineId)

    const b = batches.find((bat) => bat.id === a.batchId)

    const s = suppliers.find(
      (sup) => sup.id === (a.supplierId || b?.supplierId),
    )

    const cat = categories.find((c) => c.id === (m as any)?.categoryId)

    const quantity =
      a.quantity ??
      (a.difference < 0
        ? Math.abs(a.difference)
        : Math.max(0, a.systemQuantity - a.physicalQuantity))

    const unitCost = a.unitCost ?? (b ? b.purchasePrice : 0)

    const lossValue = a.lossValue ?? quantity * unitCost

    return {
      ...a,

      medicineName: a.medicineName || (m ? m.medicineName : "Unknown Medicine"),

      batchNumber: a.batchNumber || (b ? b.batchNumber : "N/A"),

      supplierName:
        a.supplierName || (s ? s.supplierName : "Hospital Central Stores"),

      category: a.category || (cat ? cat.categoryName : "Pharmaceuticals"),

      quantity,

      unitCost,

      lossValue,
    }
  })

  const dismissedIds = PharmacyDatabase.getDismissedNotificationIds()
  const readIds = PharmacyDatabase.getReadNotificationIds()

  const dynamicNotifications: Array<{
    id: string
    title: string
    message: string
    type: "critical" | "warning" | "info"
    timestamp: string
    time: string
    read: boolean
    actionPage?: string
    actionLabel?: string
    category?: "stock" | "expiry" | "prescription" | "transfer" | "return" | "general"
  }> = []

  // 1. Stockout Alerts (Critical)
  mappedMedicines
    .filter((m) => m.status === "active" && m.stock === 0)
    .forEach((m) => {
      const id = `sys-stockout-${m.id}`
      if (!dismissedIds.includes(id)) {
        dynamicNotifications.push({
          id,
          title: `Stockout: ${m.name}`,
          message: `Zero units in stock. Immediate supplier replenishment required.`,
          type: "critical",
          timestamp: "Urgent",
          time: "Urgent",
          read: readIds.includes(id),
          actionPage: "ocr",
          actionLabel: "Inward Stock",
          category: "stock",
        })
      }
    })

  // 2. Expired Batches (Critical)
  expiringMedicines
    .filter((b) => b.status === "expired" && b.stock > 0)
    .forEach((b) => {
      const id = `sys-expired-${b.id}`
      if (!dismissedIds.includes(id)) {
        dynamicNotifications.push({
          id,
          title: `Expired Drug: ${b.name} (Batch ${b.batch})`,
          message: `Batch expired on ${b.expiry} with ${b.stock} units remaining. Quarantine & initiate return.`,
          type: "critical",
          timestamp: "Urgent",
          time: "Urgent",
          read: readIds.includes(id),
          actionPage: "expiry-low-stock",
          actionLabel: "Inspect Expiry",
          category: "expiry",
        })
      }
    })

  // 3. Low Stock Alerts (Warning)
  mappedMedicines
    .filter(
      (m) =>
        m.status === "active" &&
        m.stock > 0 &&
        m.stock <= (m.reorderLevel || 10),
    )
    .forEach((m) => {
      const id = `sys-lowstock-${m.id}`
      if (!dismissedIds.includes(id)) {
        dynamicNotifications.push({
          id,
          title: `Low Stock: ${m.name}`,
          message: `Current stock (${m.stock} units) has reached reorder threshold (${m.reorderLevel || 10} units).`,
          type: "warning",
          timestamp: "Warning",
          time: "Warning",
          read: readIds.includes(id),
          actionPage: "ocr",
          actionLabel: "Inward Stock",
          category: "stock",
        })
      }
    })

  // 4. Near-Expiry Batches (Warning)
  expiringMedicines
    .filter((b) => b.status === "expiring" && b.daysLeft <= 30 && b.stock > 0)
    .forEach((b) => {
      const id = `sys-near-expiry-${b.id}`
      if (!dismissedIds.includes(id)) {
        dynamicNotifications.push({
          id,
          title: `Near Expiry: ${b.name} (${b.daysLeft}d left)`,
          message: `Batch ${b.batch} expires on ${b.expiry} (${b.stock} units). Dispense under FEFO protocol.`,
          type: "warning",
          timestamp: `${b.daysLeft}d left`,
          time: `${b.daysLeft}d left`,
          read: readIds.includes(id),
          actionPage: "expiry-low-stock",
          actionLabel: "View Batches",
          category: "expiry",
        })
      }
    })

  // 5. Pending Doctor Prescriptions (Info)
  const pendingRxCount = prescriptions.filter(
    (p) => isAwaitingVerification(p.status) || p.status === "Sent To Pharmacy",
  ).length
  if (pendingRxCount > 0) {
    const id = "sys-pending-rx"
    if (!dismissedIds.includes(id)) {
      dynamicNotifications.push({
        id,
        title: `${pendingRxCount} Doctor Prescription${pendingRxCount > 1 ? "s" : ""} Pending`,
        message: `${pendingRxCount} clinical prescription(s) dispatched from doctor consultation queue.`,
        type: "info",
        timestamp: "Live Queue",
        time: "Live Queue",
        read: readIds.includes(id),
        actionPage: "prescriptions",
        actionLabel: "Dispense Queue",
        category: "prescription",
      })
    }
  }



  // 7. Persisted custom notifications from database (e.g. Sales Returns, Supplier Credits)
  const persistedNotifications = notifications
    .filter((n) => !dismissedIds.includes(n.id))
    .map((n) => ({
      ...n,
      type: (NOTIFICATION_SEVERITY[n.type] || "info") as
        | "critical"
        | "warning"
        | "info",
      time: n.timestamp,
      read: n.read || readIds.includes(n.id),
      actionPage: n.actionPage,
      actionLabel: n.actionLabel,
      category: (n.category || "general") as
        | "stock"
        | "expiry"
        | "prescription"
        | "transfer"
        | "return"
        | "general",
    }))

  const combinedNotifications = [
    ...dynamicNotifications,
    ...persistedNotifications,
  ]

  return {
    medicines: mappedMedicines,

    prescriptions: prescriptions.map((p) => ({
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

      rawItems: p.items || [],
    })),

    suppliers: suppliers.map((s) => ({
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
    purchaseOrders: purchaseOrders
      .filter(
        (p) => p.supplierId && suppliers.some((s) => s.id === p.supplierId),
      )
      .map((p) => ({
        ...p,
        supplier:
          suppliers.find((s) => s.id === p.supplierId)?.supplierName ||
          "Supplier",
        itemsCount: p.items ? p.items.length : 0,
        items: p.items || [],
        total: p.totalOrderValue || 0,
        date: p.poDate,
        expected: p.expectedDeliveryDate,
      })),
    salesData,

    users: users.map((u) => ({
      ...u,

      avatar: initials(u.name),

      branch: u.department,

      status: u.status === "Active" ? "active" : "inactive",
    })),

    notifications: combinedNotifications,

    auditLogs,

    expiringMedicines,

    batches,

    bills: mappedBills,

    cartItems: [],

    stockTransfers: stockTransfers.map((t) => ({
      ...t,

      from: t.fromLocation,

      to: t.toLocation,

      // One medicine line per transfer record.

      medicines: 1,

      date: t.createdAt,

      status: TRANSFER_STAGE[t.status],
    })),

    categories: categories.map((c) => ({
      id: c.id,

      name: c.categoryName,

      description: c.description,

      medicines: medicines.filter((m) => (m as any).categoryId === c.id).length,

      status: c.status === "Active" ? "active" : "inactive",

      created: c.createdAt,
    })),

    stockTransactions,

    grns,

    supplierReturns: mappedSupplierReturns,

    damagedStock: mappedDamagedStock,

    adjustments,

    returns,

    writeOffs,

    refresh,
  }
}
