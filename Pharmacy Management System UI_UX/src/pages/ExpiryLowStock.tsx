import { useState } from "react"
import {
  AlertTriangle,
  Clock,
  XCircle,
  TrendingDown,
  ShoppingBag,
} from "lucide-react"
import { medicines, expiringMedicines } from "../data/mockData"
import PageHeader from "../components/PageHeader"

const tabs = [
  {
    id: "low",
    label: "Low Stock",
    icon: TrendingDown,
    count: 24,
    color: "#d97706",
  },
  {
    id: "expiring",
    label: "Expiring Soon",
    icon: Clock,
    count: 12,
    color: "#f97316",
  },
  {
    id: "expired",
    label: "Expired",
    icon: XCircle,
    count: 3,
    color: "#dc2626",
  },
  {
    id: "outofstock",
    label: "Out of Stock",
    icon: AlertTriangle,
    count: 8,
    color: "#7c3aed",
  },
]

const expiredMeds = [
  {
    medicine: "Digoxin 0.25mg",
    batch: "D2023B",
    expiry: "2026-08-31",
    quantity: 20,
    value: 280,
  },
  {
    medicine: "Nifedipine 10mg",
    batch: "N2023A",
    expiry: "2026-07-15",
    quantity: 60,
    value: 840,
  },
  {
    medicine: "Metronidazole 400mg",
    batch: "M2022C",
    expiry: "2026-06-30",
    quantity: 15,
    value: 120,
  },
]

const outOfStock = medicines.filter((m) => m.stock === 0)
const lowStock = medicines.filter(
  (m) => m.stock > 0 && m.stock < m.reorderLevel,
)

function urgencyLabel(
  days: number,
): { label: string color: string bg: string } {
  if (days <= 0) return { label: "Expired", color: "#9f1239", bg: "#fff1f2" }
  if (days <= 15)
    return { label: `${days}d · Critical`, color: "#dc2626", bg: "#fef2f2" }
  if (days <= 30)
    return { label: `${days}d · Urgent`, color: "#d97706", bg: "#fffbeb" }
  if (days <= 60)
    return { label: `${days}d · Soon`, color: "#f97316", bg: "#fff7ed" }
  return { label: `${days}d`, color: "#64748b", bg: "#f8fafc" }
}

interface ExpiryLowStockProps {
  onNavigate: (page: string) => void
}

export default function ExpiryLowStock({ onNavigate }: ExpiryLowStockProps) {
  const [activeTab, setActiveTab] = useState("low")

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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border font-medium text-[13px] transition-all"
            style={{
              background: activeTab === t.id ? "#0f172a" : "#fff",
              color: activeTab === t.id ? "#fff" : "#374151",
              borderColor: activeTab === t.id ? "#0f172a" : "#e2e8f0",
            }}
          >
            <t.icon
              size={14}
              style={{ color: activeTab === t.id ? "#fff" : t.color }}
            />
            {t.label}
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
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

      {/* Low Stock */}
      {activeTab === "low" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Suggested Order</th>
                <th>Supplier</th>
                <th>Last Price (₹)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-[#f1f5f9] flex items-center justify-center mx-auto mb-3">
                      <TrendingDown size={22} className="text-[#94a3b8]" />
                    </div>
                    <p className="font-medium text-[#374151]">
                      No low stock medicines
                    </p>
                  </td>
                </tr>
              ) : (
                lowStock.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <p className="font-semibold text-[13px] text-[#0f172a]">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-[#94a3b8]">
                        {m.manufacturer}
                      </p>
                    </td>
                    <td>
                      <span
                        className="font-bold text-[14px]"
                        style={{ color: m.stock < 20 ? "#dc2626" : "#d97706" }}
                      >
                        {m.stock}
                      </span>
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-[#f1f5f9] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (m.stock / m.reorderLevel) * 100)}%`,
                            background: m.stock < 20 ? "#dc2626" : "#f59e0b",
                          }}
                        />
                      </div>
                    </td>
                    <td className="text-[13px] text-[#374151]">
                      {m.reorderLevel}
                    </td>
                    <td className="text-[13px] font-semibold text-[#2563eb]">
                      {Math.max(0, m.reorderLevel * 2 - m.stock)}
                    </td>
                    <td className="text-[12px] text-[#64748b]">
                      Medline Dist.
                    </td>
                    <td className="text-[13px] text-[#374151]">
                      ₹{m.price.toFixed(2)}
                    </td>
                    <td>
                      <button
                        onClick={() => onNavigate("purchase-orders")}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                        style={{ background: "#eff6ff", color: "#2563eb" }}
                      >
                        <ShoppingBag size={11} /> Create PO
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Expiring Soon */}
      {activeTab === "expiring" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Batch</th>
                <th>Quantity</th>
                <th>Expiry Date</th>
                <th>Days Remaining</th>
                <th>Stock Value (₹)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {expiringMedicines.map((m) => {
                const u = urgencyLabel(m.daysLeft)
                return (
                  <tr key={m.id}>
                    <td className="font-semibold text-[13px] text-[#0f172a]">
                      {m.medicine}
                    </td>
                    <td className="font-mono text-[12px] text-[#64748b]">
                      {m.batch}
                    </td>
                    <td className="text-[13px] font-medium text-[#374151]">
                      {m.quantity}
                    </td>
                    <td className="text-[12px] text-[#64748b]">{m.expiry}</td>
                    <td>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: u.bg, color: u.color }}
                      >
                        {u.label}
                      </span>
                    </td>
                    <td className="text-[13px] font-medium text-[#0f172a]">
                      ₹{m.value.toLocaleString("en-IN")}
                    </td>
                    <td>
                      <button
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                        style={{ background: "#fffbeb", color: "#d97706" }}
                      >
                        Return to Supplier
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Expired */}
      {activeTab === "expired" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <div
            className="px-5 py-3 flex items-center gap-3 border-b border-[#f1f5f9]"
            style={{ background: "#fef2f2" }}
          >
            <AlertTriangle size={14} className="text-red-600" />
            <p className="text-[13px] font-semibold text-red-700">
              Expired medicines must be removed from stock immediately and
              quarantined.
            </p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Batch</th>
                <th>Expiry Date</th>
                <th>Quantity</th>
                <th>Stock Value (₹)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {expiredMeds.map((m, i) => (
                <tr key={i}>
                  <td className="font-semibold text-[13px] text-[#0f172a]">
                    {m.medicine}
                  </td>
                  <td className="font-mono text-[12px] text-[#64748b]">
                    {m.batch}
                  </td>
                  <td className="text-[12px] text-[#dc2626] font-medium">
                    {m.expiry}
                  </td>
                  <td className="text-[13px] text-[#374151]">{m.quantity}</td>
                  <td className="text-[13px] font-medium text-[#0f172a]">
                    ₹{m.value.toLocaleString("en-IN")}
                  </td>
                  <td>
                    <button
                      className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                      style={{ background: "#fef2f2", color: "#dc2626" }}
                    >
                      Write Off
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Out of Stock */}
      {activeTab === "outofstock" && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th>Prescription</th>
                <th>Reorder Level</th>
                <th>Supplier</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {outOfStock.map((m) => (
                <tr key={m.id}>
                  <td>
                    <p className="font-semibold text-[13px] text-[#0f172a]">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-[#94a3b8]">
                      {m.manufacturer}
                    </p>
                  </td>
                  <td className="text-[12px] text-[#64748b]">{m.category}</td>
                  <td>
                    {m.prescription ? (
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "#faf5ff", color: "#7c3aed" }}
                      >
                        Rx
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#94a3b8]">OTC</span>
                    )}
                  </td>
                  <td className="text-[13px] text-[#374151]">
                    {m.reorderLevel}
                  </td>
                  <td className="text-[12px] text-[#64748b]">Medline Dist.</td>
                  <td>
                    <button
                      onClick={() => onNavigate("purchase-orders")}
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                      style={{ background: "#eff6ff", color: "#2563eb" }}
                    >
                      <ShoppingBag size={11} /> Urgent Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
