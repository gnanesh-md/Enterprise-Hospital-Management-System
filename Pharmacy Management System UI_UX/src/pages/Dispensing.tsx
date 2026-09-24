import { useState } from "react"
import {
  Search,
  X,
  Plus,
  Minus,
  Printer,
  CreditCard,
  Smartphone,
  Wallet,
  ShieldCheck,
  ReceiptText,
  Trash2,
  ChevronDown,
} from "lucide-react"
import { medicines, cartItems as initialCart } from "../data/mockData"
import PageHeader from "../components/PageHeader"

const paymentMethods = [
  { id: "cash", label: "Cash", icon: Wallet },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "insurance", label: "Insurance", icon: ShieldCheck },
  { id: "credit", label: "Credit", icon: ReceiptText },
]

interface DispensingProps {
  onNavigate: (page: string) => void
}

export default function Dispensing({ onNavigate }: DispensingProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState(initialCart)
  const [payment, setPayment] = useState("cash")
  const [patientName, setPatientName] = useState("Arjun Sharma")
  const [rxId, setRxId] = useState("RX-2026-1041")
  const [discount, setDiscount] = useState(5)

  const filteredMeds =
    searchQuery.length > 1
      ? medicines
          .filter(
            (m) =>
              m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              m.generic.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .slice(0, 6)
      : []

  const subtotal = cart.reduce((s, i) => s + i.total, 0)
  const discountAmt = (subtotal * discount) / 100
  const gst = (subtotal - discountAmt) * 0.05
  const grand = subtotal - discountAmt + gst
  const roundOff = Math.round(grand) - grand

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              qty: Math.max(1, i.qty + delta),
              total:
                Math.max(1, i.qty + delta) *
                i.mrp *
                (1 - i.discount / 100) *
                (1 + i.tax / 100),
            }
          : i,
      ),
    )
  }
  const removeItem = (id: number) =>
    setCart((prev) => prev.filter((i) => i.id !== id))
  const addMedicine = (med: typeof medicines[0]) => {
    const exists = cart.find((i) => i.medicine === med.name)
    if (exists) {
      updateQty(exists.id, 1)
      return
    }
    const newItem = {
      id: Date.now(),
      medicine: med.name,
      batch: "B2025A",
      expiry: "2027-06-30",
      qty: 1,
      mrp: med.mrp,
      discount: 0,
      tax: med.gst,
      total: med.mrp * (1 + med.gst / 100),
    }
    setCart((prev) => [...prev, newItem])
    setSearchQuery("")
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: main dispensing area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0">
          <PageHeader
            breadcrumbs={[
              { label: "Pharmacy" },
              { label: "Dispensing & Billing" },
            ]}
            title="Dispensing & Billing"
            description="New sale · POS"
            onNavigate={onNavigate}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Patient / Rx Info */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Patient Name",
                  value: patientName,
                  setter: setPatientName,
                },
                { label: "Prescription ID", value: rxId, setter: setRxId },
                { label: "Doctor", value: "Dr. Priya Menon", setter: () => {} },
                { label: "Patient ID", value: "PAT-9821", setter: () => {} },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                    {f.label}
                  </label>
                  <input
                    value={f.value}
                    onChange={(e) => f.setter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] text-[#0f172a] focus:border-[#2563eb] focus:outline-none transition-colors bg-[#f8fafc] focus:bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Medicine Search */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-[#e2e8f0] px-4 py-3 focus-within:border-[#2563eb] transition-colors">
              <Search size={16} className="text-[#64748b] flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicine by name, generic, SKU or scan barcode…"
                className="flex-1 text-[14px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X size={14} className="text-[#94a3b8]" />
                </button>
              )}
            </div>
            {filteredMeds.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white rounded-xl border border-[#e2e8f0] shadow-xl overflow-hidden">
                {filteredMeds.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => addMedicine(m)}
                    className="w-full flex items-center px-4 py-3 hover:bg-[#f8fafc] transition-colors border-b border-[#f1f5f9] last:border-0"
                  >
                    <div className="flex-1 text-left">
                      <p className="text-[13px] font-semibold text-[#0f172a]">
                        {m.name}
                      </p>
                      <p className="text-[11px] text-[#64748b]">
                        {m.generic} · {m.form} · {m.manufacturer}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-[13px] font-bold text-[#0f172a]">
                        ₹{m.mrp}
                      </p>
                      <p
                        className="text-[11px]"
                        style={{
                          color:
                            m.stock > 50
                              ? "#15803d"
                              : m.stock > 0
                                ? "#d97706"
                                : "#dc2626",
                        }}
                      >
                        {m.stock > 0 ? `Stock: ${m.stock}` : "Out of stock"}
                      </p>
                    </div>
                    <div
                      className="ml-3 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "#eff6ff" }}
                    >
                      <Plus size={14} style={{ color: "#2563eb" }} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Qty</th>
                  <th>MRP (₹)</th>
                  <th>Disc%</th>
                  <th>Tax%</th>
                  <th>Total (₹)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-[#94a3b8]"
                    >
                      <Search size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="font-medium">No medicines added</p>
                      <p className="text-[12px] mt-1">
                        Search and add medicines above
                      </p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium text-[13px] text-[#0f172a]">
                        {item.medicine}
                      </td>
                      <td className="font-mono text-[11px] text-[#64748b]">
                        {item.batch}
                      </td>
                      <td className="text-[12px] text-[#64748b]">
                        {item.expiry}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQty(item.id, -1)}
                            className="w-6 h-6 rounded border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f1f5f9] transition-colors"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-8 text-center text-[13px] font-semibold">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1)}
                            className="w-6 h-6 rounded border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f1f5f9] transition-colors"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </td>
                      <td className="text-[13px]">₹{item.mrp.toFixed(2)}</td>
                      <td className="text-[13px] text-[#d97706]">
                        {item.discount}%
                      </td>
                      <td className="text-[13px] text-[#64748b]">
                        {item.tax}%
                      </td>
                      <td className="font-semibold text-[13px] text-[#0f172a]">
                        ₹{item.total.toFixed(2)}
                      </td>
                      <td>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded hover:bg-[#fef2f2] text-[#dc2626] transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right: Billing Summary */}
      <div className="w-72 xl:w-80 bg-white border-l border-[#e2e8f0] flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-[#f1f5f9]">
          <h2 className="text-[15px] font-semibold text-[#0f172a]">
            Billing Summary
          </h2>
          <p className="text-[12px] text-[#64748b]">
            {cart.length} items · {cart.reduce((s, i) => s + i.qty, 0)} units
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Amounts */}
          <div className="space-y-2.5">
            {[
              { label: "Subtotal", value: subtotal },
              {
                label: `Discount (${discount}%)`,
                value: -discountAmt,
                color: "#15803d",
              },
              { label: "GST (5%)", value: gst },
              { label: "Round Off", value: roundOff },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="text-[#64748b]">{r.label}</span>
                <span
                  className="font-medium"
                  style={{ color: r.color ?? "#0f172a" }}
                >
                  {r.value < 0 ? "-" : ""}₹{Math.abs(r.value).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between text-[15px] font-bold border-t border-[#e2e8f0] pt-2.5">
              <span className="text-[#0f172a]">Grand Total</span>
              <span style={{ color: "#2563eb" }}>
                ₹
                {Math.round(grand).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Discount slider */}
          <div>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-[#64748b] font-medium">Discount</span>
              <span className="font-semibold text-[#0f172a]">{discount}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={discount}
              onChange={(e) => setDiscount(+e.target.value)}
              className="w-full accent-[#2563eb]"
            />
          </div>

          {/* Payment methods */}
          <div>
            <p className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-2">
              Payment Method
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {paymentMethods.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPayment(p.id)}
                  className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-[11px] font-medium transition-all"
                  style={{
                    borderColor: payment === p.id ? "#2563eb" : "#e2e8f0",
                    background: payment === p.id ? "#eff6ff" : "#fff",
                    color: payment === p.id ? "#2563eb" : "#64748b",
                  }}
                >
                  <p.icon size={14} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-[#e2e8f0] space-y-2">
          <button
            className="w-full py-3 rounded-xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "#2563eb" }}
          >
            Complete Sale · ₹{Math.round(grand).toLocaleString("en-IN")}
          </button>
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-[#e2e8f0] text-[#374151] hover:bg-[#f8fafc] flex items-center justify-center gap-1.5 transition-colors">
              <Printer size={13} /> Print
            </button>
            <button className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-[#e2e8f0] text-[#374151] hover:bg-[#f8fafc] transition-colors">
              Hold Bill
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
