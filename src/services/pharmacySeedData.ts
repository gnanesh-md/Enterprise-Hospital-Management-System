/**
 * Baseline hospital state for live production / fresh start.
 * All stores are initialized as clean empty records.
 */

export function seedPharmacyHospitalData(_force: boolean = false) {
  if (typeof window === "undefined") return

  const keys = [
    "hospai_pharm_medicines_v4",
    "hospai_pharm_batches_v4",
    "hospai_pharm_suppliers_v4",
    "hospai_pharm_categories_v4",
    "hospai_pharm_pos_v4",
    "hospai_pharm_grns_v4",
    "hospai_pharm_rx_v4",
    "hospai_pharm_bills_v4",
    "hospai_pharm_returns_v4",
    "hospai_pharm_supp_returns_v4",
    "hospai_pharm_transfers_v4",
    "hospai_pharm_stock_txs_v4",
    "hospai_pharm_audit_logs_v4",
    "hospai_pharm_users_v4",
    "hospai_pharm_adjustments_v4",
    "hospai_pharm_clarifications_v4",
    "hospai_pharm_purchase_orders_v2",
    "hospai_pharm_supplier_returns_v2",
    "hospai_pharm_notifications_v4",
    "hospai_pharm_write_offs_v4",
  ]

  // Scan and remove any existing pharmacy keys across all versions
  const toRemove: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (
      k &&
      (k.startsWith("hospai_pharm_") ||
        k.startsWith("pharm_") ||
        k.startsWith("pharmacy_") ||
        k.includes("pharmacy")) &&
      k !== "hospai_pharmacy_upi_id"
    ) {
      toRemove.push(k)
    }
  }
  toRemove.forEach((k) => window.localStorage.removeItem(k))

  // Set all collections to clean empty arrays []
  keys.forEach((key) => {
    window.localStorage.setItem(key, "[]")
  })

  // Clear notification trackers and dispense temporary keys
  window.localStorage.removeItem("hospai_pharm_dismissed_notifs_v4")
  window.localStorage.removeItem("hospai_pharm_read_notifs_v4")
  window.localStorage.removeItem("hospai_pharm_notifications_v4")
  window.localStorage.removeItem("_v2_pharmacy_dispense_rx")

  // Dispatch live update events across the whole app
  window.dispatchEvent(new Event("storage"))
  window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
}

export function seedTestPrescriptionForSelling() {
  // Demo and test seed data permanently disabled
  return
}


