import { useState } from "react"
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X } from "lucide-react"
import { categories as initialCategories } from "../data/mockData"
import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"

interface CategoryMasterProps {
  onNavigate: (page: string) => void
}

export default function CategoryMaster({ onNavigate }: CategoryMasterProps) {
  const [cats, setCats] = useState(initialCategories)
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const toggle = (id: number) =>
    setCats((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "active" ? "inactive" : "active" }
          : c,
      ),
    )
  const remove = (id: number) => {
    setCats((prev) => prev.filter((c) => c.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Inventory" },
          { label: "Category Master" },
        ]}
        title="Category Master"
        description={`${cats.length} categories · ${cats.filter((c) => c.status === "active").length} active`}
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-medium"
            style={{ background: "#2563eb" }}
          >
            <Plus size={14} /> Add Category
          </button>
        }
        onNavigate={onNavigate}
      />

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Description</th>
              <th>Medicines</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id}>
                <td className="font-semibold text-[13px] text-[#0f172a]">
                  {c.name}
                </td>
                <td className="text-[13px] text-[#64748b]">{c.description}</td>
                <td>
                  <span className="font-semibold text-[13px] text-[#0f172a]">
                    {c.medicines}
                  </span>
                  <span className="text-[12px] text-[#94a3b8] ml-1">items</span>
                </td>
                <td>
                  <StatusBadge status={c.status} size="sm" />
                </td>
                <td className="text-[12px] text-[#64748b]">{c.created}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded hover:bg-[#eff6ff] text-[#2563eb] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => toggle(c.id)}
                      className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#64748b] transition-colors"
                      title="Toggle status"
                    >
                      {c.status === "active" ? (
                        <ToggleRight size={14} style={{ color: "#0f766e" }} />
                      ) : (
                        <ToggleLeft size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(c.id)}
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

      {/* Add Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
              <p className="font-bold text-[16px] text-[#0f172a]">
                Add Category
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                  Category Name *
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors"
                  placeholder="e.g. Antifungal"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors resize-none"
                  placeholder="Brief description of this category"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748b] uppercase tracking-wide mb-1">
                  Status
                </label>
                <select className="w-full px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors">
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setCats((prev) => [
                      ...prev,
                      {
                        id: Date.now(),
                        name: newName,
                        description: newDesc,
                        medicines: 0,
                        status: "active",
                        created: "2026-09-12",
                      },
                    ])
                    setShowModal(false)
                    setNewName("")
                    setNewDesc("")
                  }}
                  className="flex-1 py-2.5 rounded-xl text-white font-semibold text-[13px]"
                  style={{ background: "#2563eb" }}
                >
                  Add Category
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

      {/* Delete Confirm */}
      {deleteConfirm !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "#fef2f2" }}
            >
              <Trash2 size={20} style={{ color: "#dc2626" }} />
            </div>
            <p className="font-bold text-[16px] text-[#0f172a] mb-1">
              Delete Category
            </p>
            <p className="text-[13px] text-[#64748b] mb-5">
              This will permanently delete{" "}
              <strong>{cats.find((c) => c.id === deleteConfirm)?.name}</strong>.
              Medicines in this category will need to be reassigned.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => remove(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-[13px]"
                style={{ background: "#dc2626" }}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
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
