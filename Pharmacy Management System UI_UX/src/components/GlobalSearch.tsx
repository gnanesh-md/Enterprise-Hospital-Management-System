import { useState, useEffect, useRef } from "react"
import {
  Search,
  Pill,
  ClipboardList,
  FileText,
  Truck,
  ShoppingBag,
  Package,
  ArrowLeftRight,
  X,
} from "lucide-react"

interface GlobalSearchProps {
  onClose: () => void
  onNavigate: (page: string) => void
}

const searchResults = [
  {
    group: "Medicines",
    icon: Pill,
    items: [
      {
        label: "Paracetamol 500mg",
        sub: "Cipla Ltd · Stock: 840",
        page: "medicines",
      },
      {
        label: "Azithromycin 500mg",
        sub: "Cipla Ltd · Stock: 156",
        page: "medicines",
      },
      {
        label: "Metformin 500mg",
        sub: "Dr. Reddy's · Stock: 18 ⚠ Low",
        page: "medicines",
      },
    ],
  },
  {
    group: "Prescriptions",
    icon: ClipboardList,
    items: [
      {
        label: "RX-2026-1042",
        sub: "Lakshmi Devi · Dr. Rajan Pillai · Processing",
        page: "prescriptions",
      },
      {
        label: "RX-2026-1046",
        sub: "Kavya Nambiar · Dr. Priya Menon · Pending",
        page: "prescriptions",
      },
    ],
  },
  {
    group: "Invoices",
    icon: FileText,
    items: [
      {
        label: "INV-2026-8845",
        sub: "Arjun Sharma · ₹1,240 · 12 Sep 2026",
        page: "sales-returns",
      },
      {
        label: "INV-2026-8821",
        sub: "Suresh Babu · ₹780 · 12 Sep 2026 · Cancelled",
        page: "sales-returns",
      },
    ],
  },
  {
    group: "Suppliers",
    icon: Truck,
    items: [
      {
        label: "Medline Distributors",
        sub: "GSTIN: 29AABCM1234A1Z5",
        page: "suppliers",
      },
    ],
  },
  {
    group: "Purchase Orders",
    icon: ShoppingBag,
    items: [
      {
        label: "PO-2026-0892",
        sub: "Medline Distributors · ₹1,24,500 · Ordered",
        page: "purchase-orders",
      },
    ],
  },
]

export default function GlobalSearch({
  onClose,
  onNavigate,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const filtered =
    query.trim().length > 0
      ? searchResults
          .map((g) => ({
            ...g,
            items: g.items.filter(
              (i) =>
                i.label.toLowerCase().includes(query.toLowerCase()) ||
                i.sub.toLowerCase().includes(query.toLowerCase()),
            ),
          }))
          .filter((g) => g.items.length > 0)
      : searchResults

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#e2e8f0]">
          <Search size={18} className="text-[#64748b] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicines, patients, prescriptions, invoices…"
            className="flex-1 text-[15px] text-[#0f172a] outline-none placeholder:text-[#94a3b8]"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#f1f5f9] text-[#94a3b8] hover:text-[#0f172a] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.map((group) => (
            <div key={group.group} className="mb-1">
              <div className="flex items-center gap-2 px-5 py-2">
                <group.icon size={13} className="text-[#94a3b8]" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                  {group.group}
                </p>
              </div>
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onNavigate(item.page)
                    onClose()
                  }}
                  className="w-full flex items-start px-5 py-2.5 hover:bg-[#f1f5f9] text-left transition-colors gap-4"
                >
                  <div>
                    <p className="text-[14px] font-medium text-[#0f172a]">
                      {item.label}
                    </p>
                    <p className="text-[12px] text-[#64748b] mt-0.5">
                      {item.sub}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-[14px] text-[#94a3b8]">
                No results for "
                <span className="text-[#0f172a] font-medium">{query}</span>"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#f1f5f9] flex items-center gap-4 text-[11px] text-[#94a3b8]">
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-[#e2e8f0] bg-[#f8fafc] text-[10px]">
              ↵
            </kbd>{" "}
            to select
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-[#e2e8f0] bg-[#f8fafc] text-[10px]">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-[#e2e8f0] bg-[#f8fafc] text-[10px]">
              Esc
            </kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  )
}
