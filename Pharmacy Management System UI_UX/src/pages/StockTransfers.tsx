import { useState } from "react"
import { Plus, ArrowRight, Check, X, Truck, Package } from "lucide-react"
import { stockTransfers } from "../data/mockData"
import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"

interface StockTransfersProps {
  onNavigate: (page: string) => void
}

const workflowSteps = [
  "Draft",
  "Requested",
  "Approved",
  "In Transit",
  "Received",
]

export default function StockTransfers({ onNavigate }: StockTransfersProps) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Stock" },
          { label: "Stock Transfers" },
        ]}
        title="Stock Transfers"
        description="Inter-branch inventory movement management"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-medium"
            style={{ background: "#2563eb" }}
          >
            <Plus size={14} /> Create Transfer
          </button>
        }
        onNavigate={onNavigate}
      />

      {/* Workflow steps */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
        <p className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-4">
          Transfer Workflow
        </p>
        <div className="flex items-center gap-2">
          {workflowSteps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "#eff6ff", color: "#2563eb" }}
                >
                  {i + 1}
                </div>
                <span className="text-[12px] font-medium text-[#374151]">
                  {step}
                </span>
              </div>
              {i < workflowSteps.length - 1 && (
                <ArrowRight size={14} className="text-[#94a3b8]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transfers table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Transfer ID</th>
              <th>From</th>
              <th>To</th>
              <th>Medicines</th>
              <th>Requested By</th>
              <th>Approved By</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stockTransfers.map((t) => (
              <tr key={t.id}>
                <td
                  className="font-mono text-[12px] font-semibold"
                  style={{ color: "#2563eb" }}
                >
                  {t.id}
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: "#eff6ff" }}
                    >
                      <Package size={11} style={{ color: "#2563eb" }} />
                    </div>
                    <span className="text-[13px] text-[#0f172a]">{t.from}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: "#f0fdf4" }}
                    >
                      <Package size={11} style={{ color: "#15803d" }} />
                    </div>
                    <span className="text-[13px] text-[#0f172a]">{t.to}</span>
                  </div>
                </td>
                <td className="text-[13px] font-semibold text-center">
                  {t.medicines}
                </td>
                <td className="text-[13px] text-[#374151]">{t.requestedBy}</td>
                <td className="text-[13px] text-[#64748b]">
                  {t.approvedBy ?? (
                    <span className="text-[#94a3b8]">Pending</span>
                  )}
                </td>
                <td className="text-[12px] text-[#64748b]">{t.date}</td>
                <td>
                  <StatusBadge status={t.status} size="sm" />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    {t.status === "requested" && (
                      <button
                        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded"
                        style={{ background: "#f0fdf4", color: "#15803d" }}
                      >
                        <Check size={10} /> Approve
                      </button>
                    )}
                    {t.status === "in_transit" && (
                      <button
                        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded"
                        style={{ background: "#eff6ff", color: "#2563eb" }}
                      >
                        <Truck size={10} /> Receive
                      </button>
                    )}
                    {t.status === "received" && (
                      <span className="text-[11px] text-[#94a3b8]">
                        Completed
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Transfer Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
              <p className="font-bold text-[16px] text-[#0f172a]">
                Create Stock Transfer
              </p>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {["From Pharmacy", "To Pharmacy"].map((l) => (
                  <div key={l}>
                    <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                      {l} *
                    </label>
                    <select className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors">
                      <option>Main Branch</option>
                      <option>Branch 2</option>
                      <option>Branch 3</option>
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                    Transfer Date
                  </label>
                  <input
                    type="date"
                    defaultValue="2026-09-12"
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                    Reason
                  </label>
                  <select className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors">
                    <option>Stock rebalancing</option>
                    <option>Emergency supply</option>
                    <option>Branch request</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide">
                    Medicines to Transfer
                  </p>
                  <button
                    className="flex items-center gap-1 text-[12px] font-medium"
                    style={{ color: "#2563eb" }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="rounded-xl border border-[#e2e8f0] overflow-hidden">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Batch</th>
                        <th>Available</th>
                        <th>Transfer Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2].map((i) => (
                        <tr key={i}>
                          <td>
                            <input
                              placeholder="Search…"
                              className="w-full text-[13px] outline-none text-[#0f172a] placeholder:text-[#94a3b8]"
                            />
                          </td>
                          <td>
                            <input
                              placeholder="Batch"
                              className="w-20 text-[12px] outline-none font-mono text-[#64748b]"
                            />
                          </td>
                          <td className="text-[13px] text-[#64748b]">—</td>
                          <td>
                            <input
                              type="number"
                              defaultValue={50}
                              className="w-20 px-2 py-1 rounded border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none"
                            />
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
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-[13px]"
                style={{ background: "#2563eb" }}
              >
                Submit Request
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition-colors"
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
