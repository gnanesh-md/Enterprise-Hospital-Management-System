import { useState } from "react"
import {
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  Edit2,
  Trash2,
  Eye,
  ChevronDown,
  X,
} from "lucide-react"
import { medicines } from "../data/mockData"
import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"

interface MedicineMasterProps {
  onNavigate: (page: string) => void
}

export default function MedicineMaster({ onNavigate }: MedicineMasterProps) {
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<typeof medicines[0] | null>(null)

  const categories = [
    "All",
    ...Array.from(new Set(medicines.map((m) => m.category))),
  ]
  const filtered = medicines.filter((m) => {
    const matchSearch =
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.generic.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === "All" || m.category === filterCategory
    return matchSearch && matchCat
  })

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Inventory" },
          { label: "Medicine Master" },
        ]}
        title="Medicine Master"
        description={`${medicines.length} medicines · ${medicines.filter((m) => m.status === "active").length} active`}
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-[#374151] hover:bg-[#f8fafc] transition-colors">
              <Upload size={13} /> Import
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-[#374151] hover:bg-[#f8fafc] transition-colors">
              <Download size={13} /> Export
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-medium"
              style={{ background: "#2563eb" }}
            >
              <Plus size={14} /> Add Medicine
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-[#94a3b8] flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, generic, SKU…"
            className="text-[13px] outline-none text-[#0f172a] placeholder:text-[#94a3b8] w-full"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={12} className="text-[#94a3b8]" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-[13px] outline-none text-[#374151] bg-transparent pr-6"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="text-[#94a3b8] -ml-5 pointer-events-none"
          />
        </div>
        <div className="ml-auto flex items-center gap-2 text-[13px] text-[#64748b]">
          <span className="font-medium text-[#0f172a]">{filtered.length}</span>{" "}
          results
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Generic Name</th>
              <th>Strength</th>
              <th>Form</th>
              <th>Manufacturer</th>
              <th>Stock</th>
              <th>MRP (₹)</th>
              <th>Price (₹)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td>
                  <div>
                    <p className="font-semibold text-[13px] text-[#0f172a]">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-[#94a3b8]">SKU: {m.sku}</p>
                  </div>
                </td>
                <td className="text-[13px] text-[#374151]">{m.generic}</td>
                <td className="text-[13px] font-medium text-[#374151]">
                  {m.strength}
                </td>
                <td className="text-[12px] text-[#64748b]">{m.form}</td>
                <td className="text-[13px] text-[#374151]">{m.manufacturer}</td>
                <td>
                  <span
                    className="font-semibold text-[13px]"
                    style={{
                      color:
                        m.stock === 0
                          ? "#dc2626"
                          : m.stock < m.reorderLevel
                            ? "#d97706"
                            : "#15803d",
                    }}
                  >
                    {m.stock}
                  </span>
                  {m.prescription && (
                    <span
                      className="ml-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ background: "#faf5ff", color: "#7c3aed" }}
                    >
                      Rx
                    </span>
                  )}
                </td>
                <td className="text-[13px] font-medium text-[#0f172a]">
                  ₹{m.mrp.toFixed(2)}
                </td>
                <td className="text-[13px] text-[#374151]">
                  ₹{m.price.toFixed(2)}
                </td>
                <td>
                  <StatusBadge status={m.status} size="sm" />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelected(m)}
                      className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#64748b] transition-colors"
                      title="View"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-[#eff6ff] text-[#2563eb] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="p-1.5 rounded hover:bg-[#fef2f2] text-[#dc2626] transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Medicine Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
              <div>
                <p className="font-bold text-[16px] text-[#0f172a]">
                  {selected.name}
                </p>
                <p className="text-[12px] text-[#64748b]">
                  {selected.generic} · SKU: {selected.sku}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              <Grid
                title="Basic Information"
                rows={[
                  ["Medicine Name", selected.name],
                  ["Generic Name", selected.generic],
                  ["Manufacturer", selected.manufacturer],
                  ["Category", selected.category],
                ]}
              />
              <Grid
                title="Product Information"
                rows={[
                  ["Dosage Form", selected.form],
                  ["Strength", selected.strength],
                  ["Barcode", selected.barcode],
                  ["Schedule", selected.schedule],
                  [
                    "Prescription Required",
                    selected.prescription ? "Yes" : "No",
                  ],
                ]}
              />
              <Grid
                title="Pricing"
                rows={[
                  ["MRP", `₹${selected.mrp.toFixed(2)}`],
                  ["Selling Price", `₹${selected.price.toFixed(2)}`],
                  ["GST", `${selected.gst}%`],
                ]}
              />
              <Grid
                title="Inventory"
                rows={[
                  ["Current Stock", selected.stock.toString()],
                  ["Reorder Level", selected.reorderLevel.toString()],
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
              <p className="font-bold text-[16px] text-[#0f172a]">
                Add New Medicine
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Medicine Name",
                  "Generic Name",
                  "Strength",
                  "Dosage Form",
                  "Manufacturer",
                  "Category",
                  "MRP (₹)",
                  "Selling Price (₹)",
                ].map((label) => (
                  <div key={label}>
                    <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                      {label}
                    </label>
                    <input className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] text-[#0f172a] focus:border-[#2563eb] focus:outline-none transition-colors" />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-[13px]"
                  style={{ background: "#2563eb" }}
                >
                  Add Medicine
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Grid({ title, rows }: { title: string rows: [string, string][] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="p-3 rounded-lg bg-[#f8fafc]">
            <p className="text-[11px] text-[#94a3b8]">{label}</p>
            <p className="text-[13px] font-semibold text-[#0f172a] mt-0.5">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
