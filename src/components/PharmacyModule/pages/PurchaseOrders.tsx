import { usePharmacyData } from "../data/usePharmacyData"
import { PharmacyDatabase } from "../../../services/pharmacyDb"
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

import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"

interface PurchaseOrdersProps {
  onNavigate: (page: string) => void
}

export default function PurchaseOrders({ onNavigate }: PurchaseOrdersProps) {
  const { purchaseOrders, suppliers, medicines, refresh } = usePharmacyData()
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState("All")

  // Form State
  const [supplierId, setSupplierId] = useState("")
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0])
  const [expectedDate, setExpectedDate] = useState("")
  const [items, setItems] = useState<any[]>([])
  const [medicineSearch, setMedicineSearch] = useState("")

  const filtered =
    filter === "All"
      ? purchaseOrders
      : purchaseOrders.filter((po) => po.status === filter)

  const addItem = (med: any) => {
    setItems((prev) => [
      ...prev,
      {
        medicineId: med.id,
        name: med.name,
        qty: 100,
        price: med.price,
        gst: med.gst,
      },
    ])
    setMedicineSearch("")
  }

  const handleCreate = (status: "Draft" | "Submitted") => {
    if (!supplierId || items.length === 0)
      return alert("Please select a supplier and add items.")

    const newPo = {
      id: "PO" + Date.now(),
      supplierId,
      poDate,
      expectedDeliveryDate: expectedDate,
      status: status,
      items: items.map((i) => {
        const itemTotal = i.qty * i.price * (1 + i.gst / 100)
        return {
          medicineId: i.medicineId,
          quantity: i.qty,
          purchasePrice: i.price,
          taxPercentage: i.gst,
          discount: 0,
          totalAmount: itemTotal,
        }
      }),
      totalOrderValue: items.reduce(
        (sum, i) => sum + i.qty * i.price * (1 + i.gst / 100),
        0,
      ),
      createdAt: new Date().toISOString(),
      createdBy: "SYS",
    }

    PharmacyDatabase.addPurchaseOrder(newPo as any)
    refresh()
    setShowCreate(false)
  }

  const handleApprove = (id: string) => {
    PharmacyDatabase.updatePurchaseOrder(id, { status: "Approved" } as any)
    refresh()
  }

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
            <button
              onClick={() => {
                setSupplierId("")
                setItems([])
                setShowCreate(true)
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded text-white text-[13px] font-medium"
              style={{ background: "#0F766E" }}
            >
              <Plus size={14} /> Create PO
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {["All", "Draft", "Submitted", "Approved", "Ordered", "Received"].map(
          (f) => {
            const count =
              f === "All"
                ? purchaseOrders.length
                : purchaseOrders.filter((po) => po.status === f).length
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded text-[12px] font-medium transition-colors"
                style={{
                  background: filter === f ? "#0F1624" : "#fff",
                  color: filter === f ? "#fff" : "#64748B",
                  border: "1px solid #DDE2EC",
                }}
              >
                {f}{" "}
                <span className="opacity-70 ml-1 text-[11px]">({count})</span>
              </button>
            )
          },
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <table>
          <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
            <tr>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">PO Number</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Supplier</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Order Date</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Expected</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Items</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Total (₹)</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Status</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((po) => (
              <tr className="hover:bg-[#F0FDFA] transition-colors" key={po.id}>
                <td
                  className="font-mono text-[12px] font-semibold"
                  style={{ color: "#0F766E" }}
                >
                  {po.id}
                </td>
                <td className="text-[13px] text-[#334155]">{po.supplier}</td>
                <td className="text-[12px] text-[#64748B]">
                  {po.poDate || po.date}
                </td>
                <td className="text-[12px] text-[#64748B]">
                  {po.expectedDeliveryDate || po.expected}
                </td>
                <td className="text-[13px] font-semibold text-center">
                  {po.itemsCount}
                </td>
                <td className="text-[13px] font-semibold text-[#0F1624]">
                  ₹{(po.total || 0).toLocaleString("en-IN")}
                </td>
                <td>
                  <StatusBadge status={po.status} size="sm" />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("hospai_pharmacy_toast", {
                            detail: { message: "Opened PO Details!" },
                          }),
                        )
                      }
                      className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B] transition-colors"
                      title="View"
                    >
                      <Eye size={13} />
                    </button>
                    {po.status === "Draft" && (
                      <button
                        onClick={() => {
                          handleApprove(po.id)
                          window.dispatchEvent(
                            new CustomEvent("hospai_pharmacy_toast", {
                              detail: { message: "PO Sent to Supplier!" },
                            }),
                          )
                        }}
                        className="p-1.5 rounded hover:bg-[#E8EDF5] text-[#0F766E] transition-colors"
                        title="Send"
                      >
                        <Send size={13} />
                      </button>
                    )}
                    {po.status === "Submitted" && (
                      <button
                        onClick={() => handleApprove(po.id)}
                        className="p-1.5 rounded hover:bg-[#DCFCE7] text-[#15803d] transition-colors"
                        title="Approve"
                      >
                        <Check size={13} />
                      </button>
                    )}
                    {po.status === "Approved" && (
                      <button
                        onClick={() => onNavigate("grn")}
                        className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded"
                        style={{ background: "#E8EDF5", color: "#0F766E" }}
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
          <div className="bg-white rounded shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
              <p className="font-bold text-[16px] text-[#0F1624]">
                Create Purchase Order
              </p>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded hover:bg-[#F0F2F5] text-[#94A3B8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Supplier *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-[13px] focus:border-[#0F766E] focus:outline-none transition-colors"
                  >
                    <option value="">Select supplier…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.supplierName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Order Date
                  </label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Expected Delivery
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-[13px]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide">
                    Medicines
                  </p>
                </div>

                <div className="mb-4 relative">
                  <input
                    value={medicineSearch}
                    onChange={(e) => setMedicineSearch(e.target.value)}
                    placeholder="Search medicine to add…"
                    className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px]"
                  />
                  {medicineSearch && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-[#E2E8F0] shadow-xl max-h-48 overflow-y-auto z-10">
                      {medicines
                        .filter((m) =>
                          m.name
                            .toLowerCase()
                            .includes(medicineSearch.toLowerCase()),
                        )
                        .map((m) => (
                          <div
                            key={m.id}
                            onClick={() => addItem(m)}
                            className="px-3 py-2 hover:bg-[#F5F7FA] cursor-pointer text-[13px] flex justify-between"
                          >
                            <span>{m.name}</span>
                            <span className="text-[#94A3B8]">
                              Stock: {m.stock}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="rounded border border-[#E2E8F0] overflow-hidden">
                  <table>
                    <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
                      <tr>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Quantity</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Purchase Price (₹)</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">GST%</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Total (₹)</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr className="hover:bg-[#F0FDFA] transition-colors" key={idx}>
                          <td className="text-[13px] font-semibold">
                            {item.name}
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => {
                                const newItems = [...items]
                                newItems[idx].qty = Number(e.target.value)
                                setItems(newItems)
                              }}
                              className="w-20 px-2 py-1 text-[13px] border border-[#E2E8F0]"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...items]
                                newItems[idx].price = Number(e.target.value)
                                setItems(newItems)
                              }}
                              className="w-24 px-2 py-1 text-[13px] border border-[#E2E8F0]"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={item.gst}
                              onChange={(e) => {
                                const newItems = [...items]
                                newItems[idx].gst = Number(e.target.value)
                                setItems(newItems)
                              }}
                              className="w-16 px-2 py-1 text-[13px] border border-[#E2E8F0]"
                            />
                          </td>
                          <td className="text-[13px] font-semibold text-[#0F1624]">
                            ₹
                            {(
                              item.qty *
                              item.price *
                              (1 + item.gst / 100)
                            ).toFixed(2)}
                          </td>
                          <td>
                            <button
                              onClick={() =>
                                setItems(items.filter((_, i) => i !== idx))
                              }
                              className="p-1 rounded hover:bg-[#FEE2E2] text-[#dc2626]"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {items.length > 0 && (
                    <div className="p-3 bg-[#F5F7FA] border-t border-[#E2E8F0] text-right font-bold text-[14px]">
                      Total: ₹
                      {items
                        .reduce(
                          (sum, i) => sum + i.qty * i.price * (1 + i.gst / 100),
                          0,
                        )
                        .toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#E2E8F0] flex gap-3">
              <button
                onClick={() => handleCreate("Submitted")}
                className="px-4 py-2.5 rounded text-white font-semibold text-[13px]"
                style={{ background: "#0F766E" }}
              >
                Submit for Approval
              </button>
              <button
                onClick={() => handleCreate("Draft")}
                className="px-4 py-2.5 rounded border border-[#E2E8F0] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="ml-auto px-4 py-2.5 rounded text-[13px] font-medium text-[#94A3B8] hover:text-[#334155] transition-colors"
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
