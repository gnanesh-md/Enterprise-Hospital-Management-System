import { useState } from "react"
import { Search, Download, Printer, RefreshCcw, Eye, X } from "lucide-react"
import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"

const invoices = [
  {
    id: "INV-2026-8845",
    date: "2026-09-12 10:35",
    patient: "Arjun Sharma",
    pharmacist: "Kavitha R.",
    items: 4,
    payment: "UPI",
    total: 1240.5,
    status: "completed",
  },
  {
    id: "INV-2026-8844",
    date: "2026-09-12 10:18",
    patient: "Lakshmi Devi",
    pharmacist: "Deepak S.",
    items: 6,
    payment: "Card",
    total: 3280.0,
    status: "completed",
  },
  {
    id: "INV-2026-8843",
    date: "2026-09-12 09:55",
    patient: "Mohammed Rizwan",
    pharmacist: "Kavitha R.",
    items: 3,
    payment: "Cash",
    total: 680.25,
    status: "completed",
  },
  {
    id: "INV-2026-8842",
    date: "2026-09-12 09:40",
    patient: "Ananya Krishnan",
    pharmacist: "Priya N.",
    items: 5,
    payment: "Insurance",
    total: 2140.0,
    status: "completed",
  },
  {
    id: "INV-2026-8841",
    date: "2026-09-12 09:22",
    patient: "Suresh Babu",
    pharmacist: "Deepak S.",
    items: 2,
    payment: "Cash",
    total: 450.0,
    status: "refunded",
  },
  {
    id: "INV-2026-8840",
    date: "2026-09-12 09:05",
    patient: "Kavya Nambiar",
    pharmacist: "Kavitha R.",
    items: 3,
    payment: "UPI",
    total: 780.0,
    status: "completed",
  },
  {
    id: "INV-2026-8821",
    date: "2026-09-12 08:30",
    patient: "Rohan Mehta",
    pharmacist: "Priya N.",
    items: 2,
    payment: "Cash",
    total: 450.0,
    status: "cancelled",
  },
]

const invoiceItems = [
  {
    medicine: "Paracetamol 500mg",
    batch: "P2025A",
    qty: 10,
    mrp: 12.5,
    discount: 5,
    gst: 5,
    total: 118.75,
  },
  {
    medicine: "Azithromycin 500mg",
    batch: "A2025B",
    qty: 6,
    mrp: 42.0,
    discount: 0,
    gst: 12,
    total: 282.24,
  },
  {
    medicine: "Pantoprazole 40mg",
    batch: "P2025C",
    qty: 10,
    mrp: 7.0,
    discount: 10,
    gst: 5,
    total: 66.15,
  },
  {
    medicine: "Cetirizine 10mg",
    batch: "C2025A",
    qty: 15,
    mrp: 3.5,
    discount: 0,
    gst: 5,
    total: 55.13,
  },
]

interface SalesReturnsProps {
  onNavigate: (page: string) => void
}

export default function SalesReturns({ onNavigate }: SalesReturnsProps) {
  const [view, setView] = useState<"sales" | "returns">("sales")
  const [selectedInv, setSelectedInv] = useState<typeof invoices[0] | null>(
    null,
  )
  const [search, setSearch] = useState("")

  const filtered = invoices.filter(
    (inv) =>
      !search ||
      inv.id.includes(search) ||
      inv.patient.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Sales" },
          { label: "Sales & Returns" },
        ]}
        title="Sales & Returns"
        description="Transaction history and return management"
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-[#374151] hover:bg-[#f8fafc] transition-colors">
              <Download size={13} /> Export
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Today's Revenue", value: "₹84,250", color: "#2563eb" },
          { label: "Transactions", value: "128", color: "#0f766e" },
          { label: "Refunds", value: "₹1,230", color: "#dc2626" },
          { label: "Avg. Bill Value", value: "₹658", color: "#7c3aed" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4 border border-[#e2e8f0]"
          >
            <p className="text-[11px] text-[#64748b] font-medium">{s.label}</p>
            <p
              className="text-[20px] font-bold mt-1"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tab switch */}
      <div className="flex items-center gap-4">
        <div className="flex rounded-xl border border-[#e2e8f0] overflow-hidden text-[13px]">
          {(["sales", "returns"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-5 py-2 font-medium transition-colors"
              style={{
                background: view === v ? "#0f172a" : "#fff",
                color: view === v ? "#fff" : "#64748b",
              }}
            >
              {v === "sales" ? "Sales History" : "Returns"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 ml-auto">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, patient…"
            className="text-[13px] outline-none text-[#0f172a] placeholder:text-[#94a3b8] w-44"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            defaultValue="2026-09-12"
            className="px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] bg-white focus:border-[#2563eb] focus:outline-none"
          />
        </div>
      </div>

      {view === "sales" ? (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date & Time</th>
                <th>Patient</th>
                <th>Pharmacist</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total (₹)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td
                    className="font-mono text-[12px] font-semibold"
                    style={{ color: "#2563eb" }}
                  >
                    {inv.id}
                  </td>
                  <td className="text-[12px] text-[#64748b] whitespace-nowrap">
                    {inv.date}
                  </td>
                  <td className="font-medium text-[13px] text-[#0f172a]">
                    {inv.patient}
                  </td>
                  <td className="text-[13px] text-[#374151]">
                    {inv.pharmacist}
                  </td>
                  <td className="text-[13px] text-center">{inv.items}</td>
                  <td>
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: "#f1f5f9", color: "#475569" }}
                    >
                      {inv.payment}
                    </span>
                  </td>
                  <td className="text-[13px] font-semibold text-[#0f172a]">
                    ₹
                    {inv.total.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <StatusBadge status={inv.status} size="sm" />
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedInv(inv)}
                        className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#64748b] transition-colors"
                      >
                        <Eye size={13} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#64748b] transition-colors">
                        <Printer size={13} />
                      </button>
                      {inv.status === "completed" && (
                        <button
                          onClick={() => setView("returns")}
                          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded"
                          style={{ background: "#faf5ff", color: "#7c3aed" }}
                        >
                          <RefreshCcw size={10} /> Return
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 space-y-4">
          <h3 className="font-semibold text-[15px] text-[#0f172a]">
            Process Return
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                Invoice Number *
              </label>
              <div className="flex gap-2">
                <input
                  placeholder="INV-2026-XXXX"
                  className="flex-1 px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none"
                />
                <button
                  className="px-4 py-2 rounded-lg text-white text-[13px] font-medium"
                  style={{ background: "#2563eb" }}
                >
                  Fetch
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                Return Reason *
              </label>
              <select className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none">
                <option>Patient not using</option>
                <option>Wrong medicine dispensed</option>
                <option>Adverse reaction</option>
                <option>Doctor changed prescription</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-dashed border-[#e2e8f0] text-center">
            <p className="text-[13px] text-[#94a3b8]">
              Enter an invoice number above and click Fetch to load medicines
              for return
            </p>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInv && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
          onClick={() => setSelectedInv(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
              <div>
                <p className="font-bold text-[16px] text-[#0f172a]">
                  {selectedInv.id}
                </p>
                <p className="text-[12px] text-[#64748b]">
                  {selectedInv.date} · {selectedInv.patient}
                </p>
              </div>
              <button
                onClick={() => setSelectedInv(null)}
                className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4 border-b border-[#f1f5f9] grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <span className="text-[#94a3b8]">Pharmacist</span>
                  <p className="font-medium text-[#0f172a]">
                    {selectedInv.pharmacist}
                  </p>
                </div>
                <div>
                  <span className="text-[#94a3b8]">Payment</span>
                  <p className="font-medium text-[#0f172a]">
                    {selectedInv.payment}
                  </p>
                </div>
                <div>
                  <span className="text-[#94a3b8]">Items</span>
                  <p className="font-medium text-[#0f172a]">
                    {selectedInv.items}
                  </p>
                </div>
                <div>
                  <span className="text-[#94a3b8]">Status</span>
                  <StatusBadge status={selectedInv.status} size="sm" />
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Qty</th>
                    <th>MRP</th>
                    <th>Disc%</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.slice(0, selectedInv.items).map((item, i) => (
                    <tr key={i}>
                      <td className="text-[13px] font-medium text-[#0f172a]">
                        {item.medicine}
                      </td>
                      <td className="text-[13px]">{item.qty}</td>
                      <td className="text-[13px]">₹{item.mrp}</td>
                      <td className="text-[13px] text-[#d97706]">
                        {item.discount}%
                      </td>
                      <td className="text-[13px] font-semibold">
                        ₹{item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-4 border-t border-[#f1f5f9] flex justify-end">
                <div className="text-right">
                  <p className="text-[12px] text-[#64748b]">Grand Total</p>
                  <p className="text-[20px] font-bold text-[#0f172a]">
                    ₹
                    {selectedInv.total.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#e2e8f0] flex gap-3">
              <button className="flex items-center gap-1.5 flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition-colors justify-center">
                <Printer size={13} /> Print
              </button>
              <button className="flex items-center gap-1.5 flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition-colors justify-center">
                <Download size={13} /> PDF
              </button>
              {selectedInv.status === "completed" && (
                <button
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-[13px]"
                  style={{ background: "#7c3aed" }}
                >
                  Process Return
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
