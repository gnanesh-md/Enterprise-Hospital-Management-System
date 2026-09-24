import { useState } from "react"
import {
  Plus,
  Download,
  Eye,
  Send,
  Check,
  X,
  ChevronDown,
  Trash2,
} from "lucide-react"
import { purchaseOrders, suppliers } from "../data/mockData"
import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"

const kpis = [
  { label: "Draft", value: 1, color: "#64748b", bg: "#f8fafc" },
  { label: "Pending Approval", value: 1, color: "#d97706", bg: "#fffbeb" },
  { label: "Ordered", value: 1, color: "#2563eb", bg: "#eff6ff" },
  { label: "Partial Received", value: 1, color: "#f97316", bg: "#fff7ed" },
  { label: "Completed", value: 2, color: "#15803d", bg: "#f0fdf4" },
]

interface PurchaseOrdersProps {
  onNavigate: (page: string) => void
}

export default function PurchaseOrders({ onNavigate }: PurchaseOrdersProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState("All")

  const filtered =
    filter === "All"
      ? purchaseOrders
      : purchaseOrders.filter(
          (po) => po.status === filter.toLowerCase().replace(" ", "_"),
        )

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Purchasing" },
          { label: "Purchase Orders" },
        ]}
        title="Purchase Orders"
        description="Manage medicine procurement from suppliers"
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-[#374151] hover:bg-[#f8fafc] transition-colors">
              <Download size={13} /> Export
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-medium"
              style={{ background: "#2563eb" }}
            >
              <Plus size={14} /> Create PO
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white rounded-xl p-4 border border-[#e2e8f0] text-center cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilter(k.label)}
          >
            <p className="text-[24px] font-bold" style={{ color: k.color }}>
              {k.value}
            </p>
            <p className="text-[11px] text-[#64748b] mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          "All",
          "Draft",
          "Pending Approval",
          "Ordered",
          "Partially Received",
          "Completed",
        ].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
            style={{
              background: filter === f ? "#0f172a" : "#fff",
              color: filter === f ? "#fff" : "#64748b",
              border: "1px solid #e2e8f0",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Order Date</th>
              <th>Expected</th>
              <th>Items</th>
              <th>Total (₹)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id}>
                <td
                  className="font-mono text-[12px] font-semibold"
                  style={{ color: "#2563eb" }}
                >
                  {po.id}
                </td>
                <td className="text-[13px] text-[#374151]">{po.supplier}</td>
                <td className="text-[12px] text-[#64748b]">{po.date}</td>
                <td className="text-[12px] text-[#64748b]">{po.expected}</td>
                <td className="text-[13px] font-semibold text-center">
                  {po.items}
                </td>
                <td className="text-[13px] font-semibold text-[#0f172a]">
                  ₹{po.total.toLocaleString("en-IN")}
                </td>
                <td>
                  <StatusBadge status={po.status} size="sm" />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#64748b] transition-colors"
                      title="View"
                    >
                      <Eye size={13} />
                    </button>
                    {po.status === "draft" && (
                      <button
                        className="p-1.5 rounded hover:bg-[#eff6ff] text-[#2563eb] transition-colors"
                        title="Send"
                      >
                        <Send size={13} />
                      </button>
                    )}
                    {po.status === "pending_approval" && (
                      <button
                        className="p-1.5 rounded hover:bg-[#f0fdf4] text-[#15803d] transition-colors"
                        title="Approve"
                      >
                        <Check size={13} />
                      </button>
                    )}
                    {po.status === "ordered" && (
                      <button
                        onClick={() => onNavigate("grn")}
                        className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded"
                        style={{ background: "#eff6ff", color: "#2563eb" }}
                      >
                        Receive
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create PO Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
              <p className="font-bold text-[16px] text-[#0f172a]">
                Create Purchase Order
              </p>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                    Supplier *
                  </label>
                  <select className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors">
                    <option>Select supplier…</option>
                    {suppliers.map((s) => (
                      <option key={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                {["Order Date", "Expected Delivery", "Payment Terms"].map(
                  (l) => (
                    <div key={l}>
                      <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                        {l}
                      </label>
                      <input
                        type={
                          l.includes("Date") || l.includes("Delivery")
                            ? "date"
                            : "text"
                        }
                        className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors"
                      />
                    </div>
                  ),
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide">
                    Medicines
                  </p>
                  <button
                    className="flex items-center gap-1 text-[12px] font-medium"
                    style={{ color: "#2563eb" }}
                  >
                    <Plus size={12} /> Add Row
                  </button>
                </div>
                <div className="rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Quantity</th>
                        <th>Purchase Price (₹)</th>
                        <th>GST%</th>
                        <th>Total (₹)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2].map((i) => (
                        <tr key={i}>
                          <td>
                            <input
                              placeholder="Search medicine…"
                              className="w-full text-[13px] outline-none text-[#0f172a] placeholder:text-[#94a3b8]"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              defaultValue={100}
                              className="w-20 text-[13px] outline-none text-[#0f172a]"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              defaultValue={8.5}
                              className="w-24 text-[13px] outline-none text-[#0f172a]"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              defaultValue={5}
                              className="w-16 text-[13px] outline-none text-[#0f172a]"
                            />
                          </td>
                          <td className="text-[13px] font-semibold text-[#0f172a]">
                            ₹{(100 * 8.5 * 1.05).toFixed(2)}
                          </td>
                          <td>
                            <button className="p-1 rounded hover:bg-[#fef2f2] text-[#dc2626]">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#e2e8f0] flex gap-3">
              <button
                className="px-4 py-2.5 rounded-xl text-white font-semibold text-[13px]"
                style={{ background: "#2563eb" }}
              >
                Submit for Approval
              </button>
              <button className="px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition-colors">
                Save Draft
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="ml-auto px-4 py-2.5 rounded-xl text-[13px] font-medium text-[#94a3b8] hover:text-[#374151] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
