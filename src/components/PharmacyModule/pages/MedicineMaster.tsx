import { usePharmacyData } from "../data/usePharmacyData"
import { PharmacyDatabase } from "../../../services/pharmacyDb"
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

import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"

interface MedicineMasterProps {
  onNavigate: (page: string) => void
}

export default function MedicineMaster({ onNavigate }: MedicineMasterProps) {
  const { medicines, refresh } = usePharmacyData()
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<typeof medicines[0] | null>(null)
  const [editingMedicine, setEditingMedicine] = useState<any>(null)

  const handleEdit = (m: any) => {
    setEditingMedicine(m)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
      PharmacyDatabase.deleteMedicine(id)
      refresh()
    }
  }

  const openAddModal = () => {
    setEditingMedicine({
      name: "",
      generic: "",
      strength: "",
      form: "",
      manufacturer: "",
      category: "",
      mrp: 0,
      price: 0,
      stock: 0,
    })
    setShowModal(true)
  }

  const handleSave = () => {
    if (!editingMedicine.name) return alert("Name is required")

    if (editingMedicine.id) {
      PharmacyDatabase.updateMedicine(editingMedicine.id, {
        brandName: editingMedicine.name,
        medicineName: editingMedicine.name,
        genericName: editingMedicine.generic,
        strength: editingMedicine.strength,
        dosageForm: editingMedicine.form,
        manufacturer: editingMedicine.manufacturer,
        taxPercentage: editingMedicine.gst || 12,
        hsnCode: editingMedicine.sku || "",
        barcode: editingMedicine.barcode || "",
        scheduleType: editingMedicine.schedule || "H",
        controlledSubstanceFlag: editingMedicine.prescription || false,
        categoryId: editingMedicine.category || "General",
        reorderLevel: editingMedicine.reorderLevel || 10,
      })
    } else {
      const newMed = {
        id: "MED" + Date.now(),
        brandName: editingMedicine.name,
        medicineName: editingMedicine.name,
        genericName: editingMedicine.generic,
        strength: editingMedicine.strength,
        dosageForm: editingMedicine.form,
        manufacturer: editingMedicine.manufacturer,
        taxPercentage: editingMedicine.gst || 12,
        activeStatus: "Active",
        hsnCode: editingMedicine.sku || "",
        barcode: editingMedicine.barcode || "",
        scheduleType: editingMedicine.schedule || "H",
        controlledSubstanceFlag: editingMedicine.prescription || false,
        categoryId: editingMedicine.category || "General",
        reorderLevel: editingMedicine.reorderLevel || 10,
      }
      PharmacyDatabase.addMedicine(newMed as any)

      if (editingMedicine.stock > 0) {
        const batchId = "INIT" + Date.now()
        PharmacyDatabase.addBatch({
          medicineId: newMed.id,
          batchNumber: batchId,
          expiryDate: "2026-12-31",
          quantity: editingMedicine.stock,
          availableQuantity: editingMedicine.stock,
          mrp: editingMedicine.mrp || 0,
          purchasePrice: (editingMedicine.mrp || 0) * 0.6,
          grnId: "INIT",
        })

        PharmacyDatabase.addTransaction({
          id: "TXN" + Math.floor(Math.random() * 100000),
          date: new Date().toISOString(),
          medicineId: newMed.id,
          batchId: batchId,
          quantity: editingMedicine.stock,
          transactionType: "PURCHASE_RECEIVED",
          userId: "SYS",
          reason: "Initial Stock",
        })
      }
    }
    setShowModal(false)
    setEditingMedicine(null)
    refresh()
  }
  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Medicine Name,Generic Name,Manufacturer,Stock,MRP,Status"].join(",") +
      "\n" +
      filtered
        .map(
          (m) =>
            `${m.name},${m.generic},${m.manufacturer},${m.stock},${m.mrp},${m.status}`,
        )
        .join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "medicines_export.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.dispatchEvent(
      new CustomEvent("hospai_pharmacy_toast", {
        detail: { message: "Medicines exported successfully!" },
      }),
    )
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".csv,.xlsx"
    input.onchange = () => {
      window.dispatchEvent(
        new CustomEvent("hospai_pharmacy_toast", {
          detail: { message: "Medicines imported successfully!" },
        }),
      )
    }
    input.click()
  }

  const filtered = medicines.filter((m) => {
    return (
      !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.generic.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase())
    )
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
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#E2E8F0] bg-white text-[13px] text-[#334155] hover:bg-[#F5F7FA] transition-colors"
            >
              <Upload size={13} /> Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#E2E8F0] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors"
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-white font-medium text-[13px] transition-colors"
              style={{ background: "#0F766E" }}
            >
              <Plus size={14} /> Add Medicine
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-[#94A3B8] flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, generic, SKU…"
            className="text-[13px] outline-none text-[#0F1624] placeholder:text-[#94A3B8] w-full"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={12} className="text-[#94A3B8]" />
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-[13px] text-[#64748B]">
          <span className="font-medium text-[#0F1624]">{filtered.length}</span>{" "}
          results
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <table>
          <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
            <tr>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Generic Name</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Strength</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Form</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Manufacturer</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Stock</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">MRP (₹)</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Price (₹)</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Status</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr className="hover:bg-[#F0FDFA] transition-colors" key={m.id}>
                <td>
                  <div>
                    <p className="font-semibold text-[13px] text-[#0F1624]">
                      {m.name}
                    </p>
                    <p className="text-[11px] text-[#94A3B8]">SKU: {m.sku}</p>
                  </div>
                </td>
                <td className="text-[13px] text-[#334155]">{m.generic}</td>
                <td className="text-[13px] font-medium text-[#334155]">
                  {m.strength}
                </td>
                <td className="text-[12px] text-[#64748B]">{m.form}</td>
                <td className="text-[13px] text-[#334155]">{m.manufacturer}</td>
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
                <td className="text-[13px] font-medium text-[#0F1624]">
                  ₹{m.mrp.toFixed(2)}
                </td>
                <td className="text-[13px] text-[#334155]">
                  ₹{m.price.toFixed(2)}
                </td>
                <td>
                  <StatusBadge status={m.status} size="sm" />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelected(m)}
                      className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B] transition-colors"
                      title="View"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => handleEdit(m)}
                      className="p-1.5 rounded hover:bg-[#E8EDF5] text-[#0F766E] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#dc2626] transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-[#94A3B8]">
                  No medicines found in master catalog.
                </td>
              </tr>
            )}
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
            className="bg-white rounded shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
              <div>
                <p className="font-bold text-[16px] text-[#0F1624]">
                  {selected.name}
                </p>
                <p className="text-[12px] text-[#64748B]">
                  {selected.generic} · SKU: {selected.sku}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded hover:bg-[#F0F2F5] text-[#94A3B8] transition-colors"
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
                  ["SKU", selected.sku],
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
            className="bg-white rounded shadow-2xl w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
              <p className="font-bold text-[16px] text-[#0F1624]">
                Add New Medicine
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded hover:bg-[#F0F2F5] text-[#94A3B8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Medicine Name
                  </label>
                  <input
                    value={editingMedicine?.name || ""}
                    onChange={(e) =>
                      setEditingMedicine({
                        ...editingMedicine,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Generic Name
                  </label>
                  <input
                    value={editingMedicine?.generic || ""}
                    onChange={(e) =>
                      setEditingMedicine({
                        ...editingMedicine,
                        generic: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Strength
                  </label>
                  <input
                    value={editingMedicine?.strength || ""}
                    onChange={(e) =>
                      setEditingMedicine({
                        ...editingMedicine,
                        strength: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Dosage Form
                  </label>
                  <input
                    value={editingMedicine?.form || ""}
                    onChange={(e) =>
                      setEditingMedicine({
                        ...editingMedicine,
                        form: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Manufacturer
                  </label>
                  <input
                    value={editingMedicine?.manufacturer || ""}
                    onChange={(e) =>
                      setEditingMedicine({
                        ...editingMedicine,
                        manufacturer: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    MRP
                  </label>
                  <input
                    type="number"
                    value={editingMedicine?.mrp || ""}
                    onChange={(e) =>
                      setEditingMedicine({
                        ...editingMedicine,
                        mrp: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    value={editingMedicine?.stock || ""}
                    onChange={(e) =>
                      setEditingMedicine({
                        ...editingMedicine,
                        stock: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px]"
                    disabled={!!editingMedicine?.id}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2.5 rounded text-white font-semibold text-[13px]"
                  style={{ background: "#0F766E" }}
                >
                  Save Medicine
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded border border-[#E2E8F0] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors"
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

function Grid({ title, rows }: { title: string ;rows: [string, string][] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="p-3 rounded bg-[#F5F7FA]">
            <p className="text-[11px] text-[#94A3B8]">{label}</p>
            <p className="text-[13px] font-semibold text-[#0F1624] mt-0.5">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
