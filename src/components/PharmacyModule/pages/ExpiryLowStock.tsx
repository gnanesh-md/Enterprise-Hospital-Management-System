import { usePharmacyData } from "../data/usePharmacyData"
import { PharmacyDatabase } from "../../../services/pharmacyDb"
import { useState, useEffect } from "react"
import {
  AlertTriangle,
  Clock,
  XCircle,
  TrendingDown,
  Eye,
  X,
  Package,
  Layers,
  Calendar,
  DollarSign,
  Tag,
  Building,
  Info,
} from "lucide-react"
import PageHeader from "../components/PageHeader"

function cleanExpiryDate(val: string | undefined): string {
  if (!val) return "N/A"
  let trimmed = String(val).trim().replace(/^00(\d{2})/, "20$1")
  const parts = trimmed.split(/[-/]/)
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10)
    if (year < 100) {
      year += 2000
      trimmed = `${year}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
    }
  }
  return trimmed
}

function urgencyLabel(
  days: number,
): { label: string; color: string; bg: string } {
  if (days <= 0) return { label: "Expired", color: "#B91C1C", bg: "#FEE2E2" }
  if (days <= 30)
    return { label: `${days}d • Urgent`, color: "#dc2626", bg: "#FEE2E2" }
  if (days <= 60)
    return { label: `${days}d • Soon`, color: "#D97706", bg: "#FEF3C7" }
  return { label: "Valid", color: "#065F46", bg: "#ECFDF5" }
}

interface ExpiryLowStockProps {
  onNavigate: (page: string) => void
}

export default function ExpiryLowStock({ onNavigate }: ExpiryLowStockProps) {
  const { medicines, expiringMedicines, refresh } = usePharmacyData()
  const [selectedMedicine, setSelectedMedicine] = useState<any | null>(null)

  useEffect(() => {
    const handleUpdate = () => refresh()
    window.addEventListener("hospai_pharmacy_updated", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    return () => {
      window.removeEventListener("hospai_pharmacy_updated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [refresh])

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedMedicine(null)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const outOfStock = medicines.filter((m) => m.stock === 0)
  const lowStock = medicines.filter(
    (m) => m.stock > 0 && m.stock < m.reorderLevel,
  )
  const expiredMeds = expiringMedicines.filter((m) => m.status === "expired")
  const expiringSoon = expiringMedicines.filter((m) => m.status === "expiring")

  const tabs = [
    {
      id: "low",
      label: "Low Stock",
      icon: TrendingDown,
      count: lowStock.length,
      color: "#d97706",
    },
    {
      id: "expiring",
      label: "Expiring Soon",
      icon: Clock,
      count: expiringSoon.length,
      color: "#D97706",
    },
    {
      id: "expired",
      label: "Expired",
      icon: XCircle,
      count: expiredMeds.length,
      color: "#dc2626",
    },
    {
      id: "outofstock",
      label: "Out of Stock",
      icon: AlertTriangle,
      count: outOfStock.length,
      color: "#7c3aed",
    },
  ]

  const [activeTab, setActiveTab] = useState("low")

  const handleOpenDetails = (item: any) => {
    const found = medicines.find(
      (m) =>
        (item.medicineId && m.id === item.medicineId) ||
        (item.id && m.id === item.id) ||
        (item.name && m.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()) ||
        (item.medicine && m.name?.trim().toLowerCase() === item.medicine?.trim().toLowerCase()),
    )

    if (found) {
      setSelectedMedicine(found)
    } else {
      setSelectedMedicine({
        id: item.id || item.medicineId || "MED-" + Date.now(),
        name: item.name || item.medicine || "Unknown Medicine",
        generic: item.generic || "",
        form: item.form || "",
        packing: item.packing || "",
        manufacturer: item.manufacturer || "",
        mnfCode: item.mnfCode || "",
        hsnCode: item.hsnCode || item.sku || "",
        supplierName: item.supplierName || "",
        mrp: item.mrp || 0,
        purchasePrice: item.purchasePrice || 0,
        gst: item.gst || 5,
        stock: item.stock ?? item.quantity ?? 0,
      })
    }
  }

  // Find all batches associated with the selected medicine
  const selectedMedBatches = selectedMedicine
    ? PharmacyDatabase.getBatches().filter(
        (b) =>
          b.medicineId === selectedMedicine.id ||
          (selectedMedicine.batchNumber && b.batchNumber === selectedMedicine.batchNumber) ||
          (selectedMedicine.name &&
            (b as any).medicineName?.trim().toLowerCase() ===
              selectedMedicine.name?.trim().toLowerCase()),
      )
    : []

  // Check if generic name is genuinely different from brand name
  const hasDistinctGeneric =
    selectedMedicine?.generic &&
    selectedMedicine.generic.trim() !== "" &&
    selectedMedicine.generic.trim().toLowerCase() !== "n/a" &&
    selectedMedicine.generic.trim().toLowerCase() !== selectedMedicine.name?.trim().toLowerCase()

  // Check if real supplier is specified (not default dummy)
  const hasRealSupplier =
    selectedMedicine?.supplierName &&
    selectedMedicine.supplierName.trim() !== "" &&
    selectedMedicine.supplierName.trim().toUpperCase() !== "VH MEDICALS AND CHEMICALS"

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Stock" },
          { label: "Expiry & Low Stock" },
        ]}
        title="Inventory Alert Center"
        description="Monitor critical stock levels and expiry dates"
        onNavigate={onNavigate}
      />

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded border font-medium text-[13px] transition-all cursor-pointer shadow-sm"
            style={{
              background: activeTab === t.id ? "#0F1624" : "#fff",
              color: activeTab === t.id ? "#fff" : "#334155",
              borderColor: activeTab === t.id ? "#0F1624" : "#DDE2EC",
            }}
          >
            <t.icon
              size={14}
              style={{ color: activeTab === t.id ? "#fff" : t.color }}
            />
            {t.label}
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{
                background:
                  activeTab === t.id ? "rgba(255,255,255,0.2)" : `${t.color}20`,
                color: activeTab === t.id ? "#fff" : t.color,
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        {activeTab === "low" && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Current Stock</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Reorder Level</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((m, i) => (
                <tr
                  key={i}
                  onClick={() => handleOpenDetails(m)}
                  className="hover:bg-[#F0FDFA] transition-colors cursor-pointer group border-b border-[#F1F5F9] last:border-0"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-[#0F1624] group-hover:text-[#0F766E] transition-colors">
                        {m.name}
                      </span>
                      <span className="text-[10px] text-[#0F766E] bg-[#CCFBF1] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                        <Eye size={11} /> View Details
                      </span>
                    </div>
                  </td>
                  <td
                    className="py-3 px-4 text-[13px] font-bold"
                    style={{ color: "#d97706" }}
                  >
                    {m.stock}
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#64748B]">
                    {m.reorderLevel}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      Low Stock
                    </span>
                  </td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center p-8 text-[#64748B] text-[13px]"
                  >
                    No low stock medicines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === "outofstock" && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Current Stock</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {outOfStock.map((m, i) => (
                <tr
                  key={i}
                  onClick={() => handleOpenDetails(m)}
                  className="hover:bg-[#FAF5FF] transition-colors cursor-pointer group border-b border-[#F1F5F9] last:border-0"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[13px] text-[#0F1624] group-hover:text-purple-700 transition-colors">
                        {m.name}
                      </span>
                      <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                        <Eye size={11} /> View Details
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[13px] font-bold text-[#dc2626]">
                    {m.stock}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                      Out of Stock
                    </span>
                  </td>
                </tr>
              ))}
              {outOfStock.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="text-center p-8 text-[#64748B] text-[13px]"
                  >
                    No out of stock medicines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {(activeTab === "expiring" || activeTab === "expired") && (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Batch No.</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Stock Left</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Expiry Date</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Time Left</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === "expiring" ? expiringSoon : expiredMeds).map(
                (m, i) => {
                  const cleanedExp = cleanExpiryDate(m.expiry)
                  const expTime = new Date(cleanedExp).getTime()
                  const daysLeft = isNaN(expTime)
                    ? 0
                    : Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24))
                  const urg = urgencyLabel(daysLeft)
                  return (
                    <tr
                      key={i}
                      onClick={() => handleOpenDetails(m)}
                      className="hover:bg-[#F0FDFA] transition-colors cursor-pointer group border-b border-[#F1F5F9] last:border-0"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[13px] text-[#0F1624] group-hover:text-[#0F766E] transition-colors">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-[#0F766E] bg-[#CCFBF1] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                            <Eye size={11} /> View Details
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">
                        {m.batch}
                      </td>
                      <td className="py-3 px-4 text-[13px] font-medium text-[#334155]">
                        {m.stock}
                      </td>
                      <td className="py-3 px-4 text-[12px] font-medium text-[#0F1624]">
                        {cleanedExp}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap"
                          style={{ background: urg.bg, color: urg.color }}
                        >
                          {urg.label}
                        </span>
                      </td>
                    </tr>
                  )
                },
              )}
              {(activeTab === "expiring" ? expiringSoon : expiredMeds)
                .length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center p-8 text-[#64748B] text-[13px]"
                  >
                    No matching medicines found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* CLEAN MEDICINE DETAILS MODAL - MAIN IMPORTANT ONES ONLY */}
      {selectedMedicine && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedMedicine(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-[#0F1624]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#0F766E] via-[#0D9488] to-[#0F1624] text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {selectedMedicine.form && selectedMedicine.form !== "N/A" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm">
                      {selectedMedicine.form}
                    </span>
                  )}
                  {selectedMedicine.packing && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/20 text-teal-100">
                      Pack: {selectedMedicine.packing}
                    </span>
                  )}
                  {selectedMedicine.stock === 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/30">
                      Out of Stock
                    </span>
                  ) : selectedMedicine.stock < (selectedMedicine.reorderLevel || 10) ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/30 text-amber-200 border border-amber-300/30">
                      Low Stock Alert
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-400/30 text-emerald-200 border border-emerald-300/30">
                      In Stock
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  {selectedMedicine.name}
                </h2>
                {hasDistinctGeneric && (
                  <p className="text-sm text-teal-100/90 mt-0.5">
                    Generic: <span className="font-semibold text-white">{selectedMedicine.generic}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedMedicine(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Key Important Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    <Package size={13} className="text-[#0D9488]" /> Current Stock
                  </div>
                  <div
                    className="text-xl font-bold mt-1"
                    style={{
                      color:
                        selectedMedicine.stock === 0
                          ? "#DC2626"
                          : selectedMedicine.stock < (selectedMedicine.reorderLevel || 10)
                          ? "#D97706"
                          : "#0F766E",
                    }}
                  >
                    {selectedMedicine.stock}{" "}
                    <span className="text-xs font-medium text-slate-500">units</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    <DollarSign size={13} className="text-emerald-600" /> M.R.P.
                  </div>
                  <div className="text-xl font-bold mt-1 text-slate-900">
                    ₹{Number(selectedMedicine.mrp || 0).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    <Tag size={13} className="text-indigo-600" /> Purchase Rate
                  </div>
                  <div className="text-xl font-bold mt-1 text-slate-900">
                    ₹{Number(selectedMedicine.purchasePrice || selectedMedicine.price || 0).toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    <Layers size={13} className="text-blue-600" /> GST Rate
                  </div>
                  <div className="text-xl font-bold mt-1 text-slate-900">
                    {selectedMedicine.gst ?? 5}%
                  </div>
                </div>
              </div>

              {/* Core Medicine Information - Main Important Ones Only */}
              <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[12px] flex-wrap">
                {selectedMedicine.manufacturer && (
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Manufacturer</span>
                    <span className="font-semibold text-slate-900">
                      {selectedMedicine.manufacturer}
                      {selectedMedicine.mnfCode && selectedMedicine.mnfCode !== selectedMedicine.manufacturer && (
                        <span className="text-slate-500 text-[11px] ml-1">({selectedMedicine.mnfCode})</span>
                      )}
                    </span>
                  </div>
                )}

                {(selectedMedicine.hsnCode || selectedMedicine.sku) && (
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">HSN Code</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {selectedMedicine.hsnCode || selectedMedicine.sku}
                    </span>
                  </div>
                )}

                {hasRealSupplier && (
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Supplier</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1">
                      <Building size={12} className="text-slate-400" />
                      {selectedMedicine.supplierName}
                    </span>
                  </div>
                )}
              </div>

              {/* Batches Table */}
              <div>
                <h3 className="text-[12px] font-bold text-slate-800 flex items-center gap-1.5 mb-2.5">
                  <Calendar size={14} className="text-[#0D9488]" />
                  Registered Batches & Expiry Dates ({selectedMedBatches.length})
                </h3>

                {selectedMedBatches.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-[12px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Batch Number</th>
                          <th className="py-2.5 px-3">Expiry Date</th>
                          <th className="py-2.5 px-3">Available Stock</th>
                          <th className="py-2.5 px-3">Cost Rate</th>
                          <th className="py-2.5 px-3">M.R.P.</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedMedBatches.map((b, idx) => {
                          const cleanedExp = cleanExpiryDate(b.expiryDate)
                          const expTime = new Date(cleanedExp).getTime()
                          const daysLeft = isNaN(expTime)
                            ? 0
                            : Math.ceil((expTime - Date.now()) / (1000 * 60 * 60 * 24))
                          const urg = urgencyLabel(daysLeft)
                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 font-mono font-medium text-slate-900">
                                {b.batchNumber}
                              </td>
                              <td className="py-2 px-3 text-slate-700 font-medium">
                                {cleanedExp}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-900">
                                {b.availableQuantity ?? b.quantity ?? 0}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                ₹{Number(b.purchasePrice || selectedMedicine.purchasePrice || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                ₹{Number(b.mrp || selectedMedicine.mrp || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap"
                                  style={{ background: urg.bg, color: urg.color }}
                                >
                                  {urg.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-[12px] flex items-center gap-2">
                    <Info size={15} className="text-slate-400 shrink-0" />
                    <span>
                      Tracked directly in catalog with stock: <strong>{selectedMedicine.stock} units</strong>.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedMedicine(null)}
                className="px-4 py-2 rounded-lg bg-[#0F1624] hover:bg-slate-800 text-white text-[12px] font-semibold transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
