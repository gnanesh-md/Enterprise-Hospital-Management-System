import { useState } from "react"
import { Search, Filter, Download, ChevronDown } from "lucide-react"
import PageHeader from "../components/PageHeader"

const ledgerData = [
  {
    date: "2026-09-12 10:45",
    ref: "INV-2026-8845",
    medicine: "Paracetamol 500mg",
    batch: "P2025A",
    type: "Sale",
    opening: 850,
    in: 0,
    out: 10,
    balance: 840,
    user: "Kavitha R.",
  },
  {
    date: "2026-09-12 09:58",
    ref: "GRN-2026-0342",
    medicine: "Metformin 500mg",
    batch: "M2025D",
    type: "Purchase",
    opening: 8,
    in: 200,
    out: 0,
    balance: 208,
    user: "Arjun M.",
  },
  {
    date: "2026-09-12 09:32",
    ref: "ADJ-2026-0089",
    medicine: "Pantoprazole 40mg",
    batch: "P2024C",
    type: "Adjustment",
    opening: 12,
    in: 0,
    out: 4,
    balance: 8,
    user: "Arjun M.",
  },
  {
    date: "2026-09-11 16:20",
    ref: "INV-2026-8821",
    medicine: "Azithromycin 500mg",
    batch: "A2025B",
    type: "Sale",
    opening: 162,
    in: 0,
    out: 6,
    balance: 156,
    user: "Priya N.",
  },
  {
    date: "2026-09-11 14:55",
    ref: "TRF-2026-0124",
    medicine: "Cetirizine 10mg",
    batch: "C2025A",
    type: "Transfer",
    opening: 660,
    in: 0,
    out: 40,
    balance: 620,
    user: "Arjun M.",
  },
  {
    date: "2026-09-11 11:30",
    ref: "RTN-2026-0032",
    medicine: "Amoxicillin 250mg",
    batch: "A2024D",
    type: "Return",
    opening: 38,
    in: 4,
    out: 0,
    balance: 42,
    user: "Kavitha R.",
  },
  {
    date: "2026-09-10 17:45",
    ref: "EXP-2026-0018",
    medicine: "Digoxin 0.25mg",
    batch: "D2023C",
    type: "Expiry",
    opening: 80,
    in: 0,
    out: 20,
    balance: 60,
    user: "System",
  },
  {
    date: "2026-09-10 15:22",
    ref: "GRN-2026-0341",
    medicine: "Dolo 650mg",
    batch: "D2025F",
    type: "Purchase",
    opening: 900,
    in: 300,
    out: 0,
    balance: 1200,
    user: "Arjun M.",
  },
]

const typeColors: Record<string, { color: string bg: string }> = {
  Sale: { color: "#2563eb", bg: "#eff6ff" },
  Purchase: { color: "#15803d", bg: "#f0fdf4" },
  Return: { color: "#7c3aed", bg: "#faf5ff" },
  Transfer: { color: "#0284c7", bg: "#f0f9ff" },
  Adjustment: { color: "#d97706", bg: "#fffbeb" },
  Damage: { color: "#dc2626", bg: "#fef2f2" },
  Expiry: { color: "#9f1239", bg: "#fff1f2" },
}

interface InventoryLedgerProps {
  onNavigate: (page: string) => void
}

export default function InventoryLedger({ onNavigate }: InventoryLedgerProps) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")

  const types = [
    "All",
    "Sale",
    "Purchase",
    "Return",
    "Transfer",
    "Adjustment",
    "Expiry",
  ]
  const filtered = ledgerData.filter((r) => {
    const matchSearch =
      !search ||
      r.medicine.toLowerCase().includes(search.toLowerCase()) ||
      r.ref.includes(search)
    const matchType = typeFilter === "All" || r.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Stock" },
          { label: "Inventory Ledger" },
        ]}
        title="Inventory Ledger"
        description="Complete transaction history for all stock movements"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-[#374151] hover:bg-[#f8fafc] transition-colors">
            <Download size={13} /> Export
          </button>
        }
        onNavigate={onNavigate}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total IN (Today)", value: "+500 units", color: "#15803d" },
          { label: "Total OUT (Today)", value: "-16 units", color: "#dc2626" },
          { label: "Adjustments", value: "1 entry", color: "#d97706" },
          {
            label: "Transactions Today",
            value: "28 entries",
            color: "#2563eb",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4 border border-[#e2e8f0]"
          >
            <p className="text-[11px] text-[#64748b] font-medium">{s.label}</p>
            <p
              className="text-[18px] font-bold mt-1"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-lg px-3 py-2">
          <Search size={14} className="text-[#94a3b8]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine or reference…"
            className="text-[13px] outline-none text-[#0f172a] placeholder:text-[#94a3b8] w-56"
          />
        </div>
        <div className="flex gap-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
              style={{
                background:
                  typeFilter === t ? (typeColors[t]?.bg ?? "#0f172a") : "#fff",
                color:
                  typeFilter === t
                    ? (typeColors[t]?.color ?? "#fff")
                    : "#64748b",
                border: "1px solid #e2e8f0",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="date"
            defaultValue="2026-09-12"
            className="px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] bg-white focus:border-[#2563eb] focus:outline-none"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Reference</th>
              <th>Medicine</th>
              <th>Batch</th>
              <th>Type</th>
              <th>Opening</th>
              <th className="text-emerald-600">IN</th>
              <th className="text-red-600">OUT</th>
              <th>Balance</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td className="text-[12px] text-[#64748b] whitespace-nowrap">
                  {r.date}
                </td>
                <td
                  className="font-mono text-[12px] font-semibold"
                  style={{ color: "#2563eb" }}
                >
                  {r.ref}
                </td>
                <td className="font-medium text-[13px] text-[#0f172a]">
                  {r.medicine}
                </td>
                <td className="font-mono text-[11px] text-[#64748b]">
                  {r.batch}
                </td>
                <td>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: typeColors[r.type]?.bg,
                      color: typeColors[r.type]?.color,
                    }}
                  >
                    {r.type}
                  </span>
                </td>
                <td className="text-[13px] text-[#374151]">{r.opening}</td>
                <td
                  className="text-[13px] font-semibold"
                  style={{ color: r.in > 0 ? "#15803d" : "#94a3b8" }}
                >
                  {r.in > 0 ? `+${r.in}` : "—"}
                </td>
                <td
                  className="text-[13px] font-semibold"
                  style={{ color: r.out > 0 ? "#dc2626" : "#94a3b8" }}
                >
                  {r.out > 0 ? `-${r.out}` : "—"}
                </td>
                <td className="text-[13px] font-bold text-[#0f172a]">
                  {r.balance}
                </td>
                <td className="text-[12px] text-[#64748b]">{r.user}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
