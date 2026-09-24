import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle,
  Save,
  Printer,
  X,
  Info,
} from "lucide-react"
import PageHeader from "../components/PageHeader"

const grnItems = [
  {
    medicine: "Paracetamol 500mg",
    ordered: 500,
    received: 500,
    damaged: 0,
    batch: "P2025H",
    mfg: "2025-03-01",
    expiry: "2027-03-31",
    price: 8.5,
    mrp: 12.5,
    gst: 5,
    status: "ok",
  },
  {
    medicine: "Metformin 500mg",
    ordered: 200,
    received: 180,
    damaged: 0,
    batch: "M2025E",
    mfg: "2025-02-15",
    expiry: "2027-02-28",
    price: 3.8,
    mrp: 5.5,
    gst: 5,
    status: "short",
  },
  {
    medicine: "Amoxicillin 250mg",
    ordered: 300,
    received: 300,
    damaged: 12,
    batch: "A2025D",
    mfg: "2025-01-20",
    expiry: "2026-01-31",
    price: 5.2,
    mrp: 8.0,
    gst: 12,
    status: "damaged",
  },
  {
    medicine: "Azithromycin 500mg",
    ordered: 100,
    received: 100,
    damaged: 0,
    batch: "Z2025C",
    mfg: "2025-04-01",
    expiry: "2027-04-30",
    price: 28.0,
    mrp: 42.0,
    gst: 12,
    status: "ok",
  },
]

interface GRNProps {
  onNavigate: (page: string) => void
}

export default function GRN({ onNavigate }: GRNProps) {
  const [items, setItems] = useState(grnItems)

  const updateItem = (idx: number, field: string, value: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: value }
        const issues =
          updated.received < updated.ordered
            ? "short"
            : updated.damaged > 0
              ? "damaged"
              : "ok"
        return { ...updated, status: issues }
      }),
    )
  }

  const statusIcon = (s: string) => {
    if (s === "ok")
      return <CheckCircle size={14} className="text-emerald-500" />
    if (s === "short") return <Info size={14} className="text-amber-500" />
    return <AlertTriangle size={14} className="text-red-500" />
  }

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Purchasing" },
          { label: "GRN / Receiving" },
        ]}
        title="Goods Received Note"
        description="Record and verify stock received from suppliers"
        onNavigate={onNavigate}
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-[#374151] hover:bg-[#f8fafc] transition-colors">
              <Printer size={13} /> Print GRN
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-medium"
              style={{ background: "#0f766e" }}
            >
              <CheckCircle size={14} /> Post to Inventory
            </button>
          </div>
        }
      />

      {/* GRN Header */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "GRN Number", value: "GRN-2026-0343", editable: false },
            { label: "Purchase Order", value: "PO-2026-0892", editable: false },
            {
              label: "Supplier",
              value: "Medline Distributors",
              editable: false,
            },
            {
              label: "Invoice Number",
              value: "",
              editable: true,
              placeholder: "Enter invoice no.",
            },
            { label: "Invoice Date", value: "", editable: true, type: "date" },
            {
              label: "Received Date",
              value: "2026-09-12",
              editable: true,
              type: "date",
            },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                {f.label}
              </label>
              {f.editable ? (
                <input
                  type={(f as any).type ?? "text"}
                  defaultValue={f.value}
                  placeholder={(f as any).placeholder}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors bg-[#f8fafc] focus:bg-white"
                />
              ) : (
                <p className="px-3 py-2 rounded-lg bg-[#f8fafc] text-[13px] font-medium text-[#0f172a]">
                  {f.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            icon: Info,
            label: "Short Delivery",
            count: items.filter((i) => i.status === "short").length,
            color: "#d97706",
            bg: "#fffbeb",
          },
          {
            icon: AlertTriangle,
            label: "Damaged Items",
            count: items.filter((i) => i.status === "damaged").length,
            color: "#dc2626",
            bg: "#fef2f2",
          },
          {
            icon: CheckCircle,
            label: "Items OK",
            count: items.filter((i) => i.status === "ok").length,
            color: "#15803d",
            bg: "#f0fdf4",
          },
        ].map((a) => (
          <div
            key={a.label}
            className="flex items-center gap-3 p-4 rounded-xl border"
            style={{ background: a.bg, borderColor: a.bg }}
          >
            <a.icon size={18} style={{ color: a.color }} />
            <div>
              <p className="text-[20px] font-bold" style={{ color: a.color }}>
                {a.count}
              </p>
              <p className="text-[12px]" style={{ color: a.color }}>
                {a.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Receiving Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#f1f5f9] flex items-center justify-between">
          <p className="font-semibold text-[14px] text-[#0f172a]">
            Receiving Details
          </p>
          <p className="text-[12px] text-[#64748b]">Click cells to edit</p>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Damaged</th>
                <th>Batch No.</th>
                <th>Mfg. Date</th>
                <th>Expiry Date</th>
                <th>Purchase Price</th>
                <th>MRP (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="font-medium text-[13px] text-[#0f172a]">
                    {item.medicine}
                  </td>
                  <td className="text-[13px] text-[#374151]">{item.ordered}</td>
                  <td>
                    <input
                      type="number"
                      value={item.received}
                      onChange={(e) =>
                        updateItem(idx, "received", +e.target.value)
                      }
                      className="w-20 px-2 py-1 rounded border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none text-center"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.damaged}
                      onChange={(e) =>
                        updateItem(idx, "damaged", +e.target.value)
                      }
                      className="w-16 px-2 py-1 rounded border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none text-center"
                    />
                  </td>
                  <td>
                    <input
                      defaultValue={item.batch}
                      className="w-24 px-2 py-1 rounded border border-[#e2e8f0] text-[12px] font-mono focus:border-[#2563eb] focus:outline-none"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      defaultValue={item.mfg}
                      className="w-36 px-2 py-1 rounded border border-[#e2e8f0] text-[12px] focus:border-[#2563eb] focus:outline-none"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      defaultValue={item.expiry}
                      className="w-36 px-2 py-1 rounded border border-[#e2e8f0] text-[12px] focus:border-[#2563eb] focus:outline-none"
                      style={{
                        color:
                          new Date(item.expiry) < new Date("2027-01-01")
                            ? "#d97706"
                            : undefined,
                      }}
                    />
                  </td>
                  <td className="text-[13px] text-[#374151]">
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td className="text-[13px] font-medium">
                    ₹{item.mrp.toFixed(2)}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(item.status)}
                      <span
                        className="text-[12px] font-medium"
                        style={{
                          color:
                            item.status === "ok"
                              ? "#15803d"
                              : item.status === "short"
                                ? "#d97706"
                                : "#dc2626",
                        }}
                      >
                        {item.status === "ok"
                          ? "OK"
                          : item.status === "short"
                            ? "Short"
                            : "Damaged"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[11px] text-[#64748b] uppercase font-semibold tracking-wide">
              Total Ordered
            </p>
            <p className="text-[20px] font-bold text-[#0f172a]">
              {items.reduce((s, i) => s + i.ordered, 0)} units
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#64748b] uppercase font-semibold tracking-wide">
              Total Received
            </p>
            <p className="text-[20px] font-bold text-[#0f172a]">
              {items.reduce((s, i) => s + i.received, 0)} units
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#64748b] uppercase font-semibold tracking-wide">
              Invoice Value
            </p>
            <p className="text-[20px] font-bold text-[#0f172a]">
              ₹
              {items
                .reduce(
                  (s, i) => s + i.received * i.price * (1 + i.gst / 100),
                  0,
                )
                .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
