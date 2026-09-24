import { usePharmacyData } from "../data/usePharmacyData"
import { useState } from "react"
import {
  AlertTriangle,
  Clock,
  XCircle,
  TrendingDown,
  ShoppingBag,
} from "lucide-react"
import PageHeader from "../components/PageHeader"

function urgencyLabel(
  days: number,
): { label: string ;color: string ;bg: string } {
  if (days <= 0) return { label: "Expired", color: "#B91C1C", bg: "#FEE2E2" }
  if (days <= 15)
    return { label: `${days}d • Critical`, color: "#dc2626", bg: "#FEE2E2" }
  if (days <= 30)
    return { label: `${days}d • Urgent`, color: "#d97706", bg: "#FEF3C7" }
  if (days <= 60)
    return { label: `${days}d • Soon`, color: "#D97706", bg: "#FEF3C7" }
  return { label: `${days}d`, color: "#64748B", bg: "#F5F7FA" }
}

interface ExpiryLowStockProps {
  onNavigate: (page: string) => void
}

export default function ExpiryLowStock({ onNavigate }: ExpiryLowStockProps) {
  const { medicines, expiringMedicines } = usePharmacyData()
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
            className="flex items-center gap-2 px-4 py-2.5 rounded border font-medium text-[13px] transition-all"
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
          <table>
            <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Current Stock</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Reorder Level</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((m, i) => (
                <tr className="hover:bg-[#F0FDFA] transition-colors" key={i}>
                  <td className="font-semibold text-[13px] text-[#0F1624]">
                    {m.name}
                  </td>
                  <td
                    className="text-[13px] font-bold"
                    style={{ color: "#d97706" }}
                  >
                    {m.stock}
                  </td>
                  <td className="text-[13px] text-[#64748B]">
                    {m.reorderLevel}
                  </td>
                  <td>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700">
                      Low Stock
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => onNavigate("purchase-orders")}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-[#E8EDF5] text-[#0F766E]"
                    >
                      <ShoppingBag size={12} /> Order
                    </button>
                  </td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
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
          <table>
            <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
              <tr>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Current Stock</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outOfStock.map((m, i) => (
                <tr className="hover:bg-[#F0FDFA] transition-colors" key={i}>
                  <td className="font-semibold text-[13px] text-[#0F1624]">
                    {m.name}
                  </td>
                  <td className="text-[13px] font-bold text-[#dc2626]">
                    {m.stock}
                  </td>
                  <td>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700">
                      Out of Stock
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => onNavigate("purchase-orders")}
                      className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-[#E8EDF5] text-[#0F766E]"
                    >
                      <ShoppingBag size={12} /> Order
                    </button>
                  </td>
                </tr>
              ))}
              {outOfStock.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
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
          <table>
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
                  const daysLeft = Math.ceil(
                    (new Date(m.expiry).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                  const urg = urgencyLabel(daysLeft)
                  return (
                    <tr className="hover:bg-[#F0FDFA] transition-colors" key={i}>
                      <td className="font-semibold text-[13px] text-[#0F1624]">
                        {m.name}
                      </td>
                      <td className="font-mono text-[11px] text-[#64748B]">
                        {m.batch}
                      </td>
                      <td className="text-[13px] font-medium text-[#334155]">
                        {m.stock}
                      </td>
                      <td className="text-[12px] font-medium text-[#0F1624]">
                        {m.expiry}
                      </td>
                      <td>
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
    </div>
  )
}
