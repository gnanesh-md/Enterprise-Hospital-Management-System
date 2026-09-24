import { usePharmacyData } from "../data/usePharmacyData"
import { useState } from "react"
import { Search, Filter, Download, ChevronDown } from "lucide-react"
import PageHeader from "../components/PageHeader"

const typeColors: Record<string, { color: string ;bg: string }> = {
  Sale: { color: "#1B4FD8", bg: "#E8EDF5" },
  Purchase: { color: "#15803d", bg: "#DCFCE7" },
  Return: { color: "#7c3aed", bg: "#faf5ff" },
  Transfer: { color: "#0284c7", bg: "#E8EDF5" },
  Adjustment: { color: "#d97706", bg: "#FEF3C7" },
  Damage: { color: "#dc2626", bg: "#FEE2E2" },
  Expiry: { color: "#B91C1C", bg: "#FEE2E2" },
}

interface InventoryLedgerProps {
  onNavigate: (page: string) => void
}

export default function InventoryLedger({ onNavigate }: InventoryLedgerProps) {
  const { stockTransactions, medicines, batches, bills } = usePharmacyData()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const ledgerData: any[] = []
  const handledBatches = new Set<string>()
  const handledBills = new Set<string>()

  stockTransactions.forEach((tx) => {
    handledBatches.add(tx.batchId)
    if (tx.billId) handledBills.add(tx.billId)

    const med = medicines.find((m) => m.id === tx.medicineId)
    let typeName: string = tx.transactionType
    if (typeName === "PURCHASE_RECEIVED") typeName = "Purchase"
    if (typeName === "DISPENSED") typeName = "Sale"
    if (typeName === "RETURNED") typeName = "Return"

    const isIn =
      ["PURCHASE_RECEIVED", "RETURNED", "TRANSFER_IN", "ADJUSTMENT"].includes(
        tx.transactionType,
      ) &&
      (tx.transactionType !== "ADJUSTMENT" || tx.quantity > 0)
    const isOut =
      ["DISPENSED", "EXPIRED", "DAMAGED", "TRANSFER_OUT"].includes(
        tx.transactionType,
      ) ||
      (tx.transactionType === "ADJUSTMENT" && tx.quantity < 0)

    ledgerData.push({
      date: new Date(tx.date).toLocaleString(),
      ref:
        tx.billId || tx.reason?.split(":")[1]?.trim() || tx.id.substring(0, 8),
      medicine: med ? med.name : "Unknown",
      batch: tx.batchId,
      type: typeName,
      in: isIn ? Math.abs(tx.quantity) : 0,
      out: isOut ? Math.abs(tx.quantity) : 0,
      user: tx.userId,
    })
  })

  // Synthesize legacy data for batches that have no transaction
  batches.forEach((b) => {
    if (!handledBatches.has(b.id)) {
      const med = medicines.find((m) => m.id === b.medicineId)
      ledgerData.push({
        date: new Date(b.createdAt || new Date()).toLocaleString(),
        ref: b.grnId || "SYS",
        medicine: med ? med.name : "Unknown",
        batch: b.batchNumber,
        type: "Purchase",
        in: b.quantity,
        out: 0,
        user: "SYS",
      })
    }
  })

  // Synthesize legacy data for bills that have no transaction
  bills.forEach((bill) => {
    if (!handledBills.has(bill.id)) {
      bill.items.forEach((item) => {
        ledgerData.push({
          date: new Date(bill.createdAt).toLocaleString(),
          ref: bill.id,
          medicine: item.medicineName,
          batch: item.batchNumber,
          type: "Sale",
          in: 0,
          out: item.quantity,
          user: bill.pharmacistId,
        })
      })
    }
  })

  // Sort by date descending
  ledgerData.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

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

    const rDate = new Date(r.date)
    const matchFrom = !fromDate || rDate >= new Date(fromDate)
    const matchTo = !toDate || rDate <= new Date(toDate + "T23:59:59")

    return matchSearch && matchType && matchFrom && matchTo
  })

  const handleExport = () => {
    if (filtered.length === 0) return alert("No data to export.")
    const headers = [
      "Date & Time",
      "Reference",
      "Medicine",
      "Batch",
      "Type",
      "IN",
      "OUT",
      "User",
    ]
    const rows = [headers.join(",")]
    filtered.forEach((r) => {
      rows.push(
        `"${r.date}","${r.ref}","${r.medicine}","${r.batch}","${r.type}",${r.in},${r.out},"${r.user}"`,
      )
    })
    const blob = new Blob([rows.join("\\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `inventory_ledger_${Date.now()}.csv`
    a.click()
  }

  const totalIn = ledgerData
    .filter((r) => r.type === "Purchase")
    .reduce((sum, r) => sum + r.in, 0)
  const totalOut = ledgerData
    .filter((r) => r.type === "Sale")
    .reduce((sum, r) => sum + r.out, 0)

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
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#DDE2EC] bg-white text-[13px] text-[#334155] hover:bg-[#F5F7FA] transition-colors"
          >
            <Download size={13} /> Export
          </button>
        }
        onNavigate={onNavigate}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Total IN (All Time)",
            value: totalIn + " units",
            color: "#15803d",
          },
          {
            label: "Total OUT (All Time)",
            value: totalOut + " units",
            color: "#dc2626",
          },
          { label: "Adjustments", value: "0 entries", color: "#d97706" },
          {
            label: "Transactions Logged",
            value: ledgerData.length + " entries",
            color: "#1B4FD8",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded p-4 border border-[#DDE2EC]"
          >
            <p className="text-[11px] text-[#64748B] font-medium">{s.label}</p>
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
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
          />
          <input
            placeholder="Search medicine or ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-64 rounded border border-[#DDE2EC] text-[13px] focus:border-[#1B4FD8] focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 rounded border border-[#DDE2EC] text-[13px] text-[#64748B] focus:border-[#1B4FD8] focus:outline-none"
          />
          <span className="text-[#94A3B8]">-</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 rounded border border-[#DDE2EC] text-[13px] text-[#64748B] focus:border-[#1B4FD8] focus:outline-none"
          />
        </div>
        <div className="flex bg-white rounded border border-[#DDE2EC] p-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-4 py-1.5 rounded text-[12px] font-medium transition-colors"
              style={{
                background: typeFilter === t ? "#F0F2F5" : "transparent",
                color: typeFilter === t ? "#0F1624" : "#64748B",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded border border-[#DDE2EC] overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Reference</th>
              <th>Medicine</th>
              <th>Batch</th>
              <th>Type</th>
              <th className="text-emerald-600">IN</th>
              <th className="text-red-600">OUT</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                <td className="text-[12px] text-[#64748B] whitespace-nowrap">
                  {r.date}
                </td>
                <td
                  className="font-mono text-[12px] font-semibold"
                  style={{ color: "#1B4FD8" }}
                >
                  {r.ref}
                </td>
                <td className="font-medium text-[13px] text-[#0F1624]">
                  {r.medicine}
                </td>
                <td className="font-mono text-[11px] text-[#64748B]">
                  {r.batch}
                </td>
                <td>
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded"
                    style={{
                      background: typeColors[r.type]?.bg,
                      color: typeColors[r.type]?.color,
                    }}
                  >
                    {r.type}
                  </span>
                </td>
                <td
                  className="text-[13px] font-semibold"
                  style={{ color: r.in > 0 ? "#15803d" : "#94A3B8" }}
                >
                  {r.in > 0 ? "+" + r.in : "-"}
                </td>
                <td
                  className="text-[13px] font-semibold"
                  style={{ color: r.out > 0 ? "#dc2626" : "#94A3B8" }}
                >
                  {r.out > 0 ? "-" + r.out : "-"}
                </td>
                <td className="text-[12px] text-[#64748B]">{r.user}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-[#64748B] text-[13px]"
                >
                  No transactions found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
