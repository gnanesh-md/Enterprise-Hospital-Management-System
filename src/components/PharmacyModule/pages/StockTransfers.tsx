import { usePharmacyData } from "../data/usePharmacyData"
import { useState } from "react"
import { Plus, ArrowRight, Check, X, Truck, Package } from "lucide-react"

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
  const { stockTransfers } = usePharmacyData()
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
            className="flex items-center gap-1.5 px-4 py-2 rounded text-white text-[13px] font-medium"
            style={{ background: "#1B4FD8" }}
          >
            <Plus size={14} /> Create Transfer
          </button>
        }
        onNavigate={onNavigate}
      />

      {/* Workflow steps */}
      <div className="bg-white rounded border border-[#DDE2EC] p-5">
        <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide mb-4">
          Transfer Workflow
        </p>
        <div className="flex items-center gap-2">
          {workflowSteps.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "#E8EDF5", color: "#1B4FD8" }}
                >
                  {i + 1}
                </div>
                <span className="text-[12px] font-medium text-[#334155]">
                  {step}
                </span>
              </div>
              {i < workflowSteps.length - 1 && (
                <ArrowRight size={14} className="text-[#94A3B8]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transfers table */}
      <div className="bg-white rounded border border-[#DDE2EC] overflow-hidden">
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
                  style={{ color: "#1B4FD8" }}
                >
                  {t.id}
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: "#E8EDF5" }}
                    >
                      <Package size={11} style={{ color: "#1B4FD8" }} />
                    </div>
                    <span className="text-[13px] text-[#0F1624]">{t.from}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: "#DCFCE7" }}
                    >
                      <Package size={11} style={{ color: "#15803d" }} />
                    </div>
                    <span className="text-[13px] text-[#0F1624]">{t.to}</span>
                  </div>
                </td>
                <td className="text-[13px] font-semibold text-center">
                  {t.medicines}
                </td>
                <td className="text-[13px] text-[#334155]">{t.requestedBy}</td>
                <td className="text-[13px] text-[#64748B]">
                  {t.approvedBy ?? (
                    <span className="text-[#94A3B8]">Pending</span>
                  )}
                </td>
                <td className="text-[12px] text-[#64748B]">{t.date}</td>
                <td>
                  <StatusBadge status={t.status} size="sm" />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    {t.status === "requested" && (
                      <button
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent("hospai_pharmacy_toast", {
                              detail: { message: "Transfer Approved!" },
                            }),
                          )
                        }
                        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded"
                        style={{ background: "#DCFCE7", color: "#15803d" }}
                      >
                        <Check size={10} /> Approve
                      </button>
                    )}
                    {t.status === "in_transit" && (
                      <button
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent("hospai_pharmacy_toast", {
                              detail: { message: "Transfer Received!" },
                            }),
                          )
                        }
                        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded"
                        style={{ background: "#E8EDF5", color: "#1B4FD8" }}
                      >
                        <Truck size={10} /> Receive
                      </button>
                    )}
                    {t.status === "received" && (
                      <span className="text-[11px] text-[#94A3B8]">
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
          <div className="bg-white rounded shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
              <p className="font-bold text-[16px] text-[#0F1624]">
                Create Stock Transfer
              </p>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded hover:bg-[#F0F2F5] text-[#94A3B8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {["From Pharmacy", "To Pharmacy"].map((l) => (
                  <div key={l}>
                    <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                      {l} *
                    </label>
                    <select className="w-full px-3 py-2 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none transition-colors">
                      <option>Main Branch</option>
                      <option>Branch 2</option>
                      <option>Branch 3</option>
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Transfer Date
                  </label>
                  <input
                    type="date"
                    defaultValue="2026-09-12"
                    className="w-full px-3 py-2 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Reason
                  </label>
                  <select className="w-full px-3 py-2 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none transition-colors">
                    <option>Stock rebalancing</option>
                    <option>Emergency supply</option>
                    <option>Branch request</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide">
                    Medicines to Transfer
                  </p>
                  <button
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("hospai_pharmacy_toast", {
                          detail: { message: "Medicine line added!" },
                        }),
                      )
                    }
                    className="flex items-center gap-1 text-[12px] font-medium"
                    style={{ color: "#1B4FD8" }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="rounded border border-[#DDE2EC] overflow-hidden">
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
                              className="w-full text-[13px] outline-none text-[#0F1624] placeholder:text-[#94A3B8]"
                            />
                          </td>
                          <td>
                            <input
                              placeholder="Batch"
                              className="w-20 text-[12px] outline-none font-mono text-[#64748B]"
                            />
                          </td>
                          <td className="text-[13px] text-[#64748B]">—</td>
                          <td>
                            <input
                              type="number"
                              defaultValue={50}
                              className="w-20 px-2 py-1 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#DDE2EC] flex gap-3">
              <button
                onClick={() => {
                  setShowCreate(false)
                  window.dispatchEvent(
                    new CustomEvent("hospai_pharmacy_toast", {
                      detail: {
                        message: "Stock Transfer Requested successfully!",
                      },
                    }),
                  )
                }}
                className="flex-1 py-2.5 rounded text-white font-semibold text-[13px]"
                style={{ background: "#1B4FD8" }}
              >
                Submit Request
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded border border-[#DDE2EC] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors"
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
