import React, { useState, useEffect } from "react"
import { Users, Search, DollarSign, Calendar, Clock, CheckCircle2, ShieldAlert } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"
import { ReceivableItem } from "../../types/accounts"

export default function AccountsReceivableView() {
  const [arList, setArList] = useState<ReceivableItem[]>(AccountsDatabase.getReceivables())
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [bucketFilter, setBucketFilter] = useState<string>("ALL")
  const [selectedItem, setSelectedItem] = useState<ReceivableItem | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)

  const reloadData = () => {
    setArList(AccountsDatabase.getReceivables())
  }

  useEffect(() => {
    reloadData()
    const handleUpdate = () => reloadData()
    window.addEventListener("hospai_accounts_updated", handleUpdate)
    return () => window.removeEventListener("hospai_accounts_updated", handleUpdate)
  }, [])

  const filtered = arList.filter(item => {
    const q = search.toLowerCase()
    const matchesSearch = item.invoice_no.toLowerCase().includes(q) || item.patient_name.toLowerCase().includes(q) || item.payer_name.toLowerCase().includes(q)
    const matchesType = typeFilter === "ALL" || item.payer_type === typeFilter
    const matchesBucket = bucketFilter === "ALL" || item.ageing_bucket === bucketFilter
    return matchesSearch && matchesType && matchesBucket
  })

  // Ageing Totals
  const b0_30 = arList.filter(r => r.ageing_bucket === "0-30").reduce((sum, r) => sum + r.due_amount, 0)
  const b31_60 = arList.filter(r => r.ageing_bucket === "31-60").reduce((sum, r) => sum + r.due_amount, 0)
  const b61_90 = arList.filter(r => r.ageing_bucket === "61-90").reduce((sum, r) => sum + r.due_amount, 0)
  const b90_plus = arList.filter(r => r.ageing_bucket === "90+").reduce((sum, r) => sum + r.due_amount, 0)
  const totalDue = arList.reduce((sum, r) => sum + r.due_amount, 0)

  const handleAllocatePayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || paymentAmount <= 0) return
    try {
      AccountsDatabase.postJournal({
        transaction_type: "PATIENT_PAYMENT",
        source_module: "accounts_receivable",
        source_reference_id: selectedItem.invoice_no,
        description: `Receipt Allocation for Invoice ${selectedItem.invoice_no}`,
        lines: [
          { account_code: "1120", debit: paymentAmount, credit: 0, narration: `Collection against ${selectedItem.invoice_no}` },
          { account_code: "1310", debit: 0, credit: paymentAmount, narration: `AR Allocation for ${selectedItem.patient_name}`, sub_ledger_id: selectedItem.patient_id, sub_ledger_name: selectedItem.patient_name },
        ],
      })
      AccountsDatabase.upsertReceivable({
        ...selectedItem,
        paid_amount: selectedItem.paid_amount + paymentAmount,
      })
      setSelectedItem(null)
      setPaymentAmount(0)
      reloadData()
    } catch (err: any) {
      alert(err.message || "Allocation failed.")
    }
  }

  return (
    <div className="space-y-5 text-[#0F172A]">
      {/* Header */}
      <div className="bg-white p-4.5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Users className="text-[#B45309]" size={20} />
            Accounts Receivable (AR) & Ageing Analysis
          </h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Patient, Corporate & Insurance Receivables Tracking & Payment Allocation
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-[#64748B] font-medium">Total Outstanding AR</span>
          <div className="text-lg font-extrabold text-[#B45309]">₹{totalDue.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Ageing Summary Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#DDE2EC] p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] text-[#64748B] font-semibold">0 - 30 Days (Current)</span>
          <div className="text-lg font-extrabold text-[#047857] mt-0.5">₹{b0_30.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white border border-[#DDE2EC] p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] text-[#64748B] font-semibold">31 - 60 Days</span>
          <div className="text-lg font-extrabold text-[#B45309] mt-0.5">₹{b31_60.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white border border-[#DDE2EC] p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] text-[#64748B] font-semibold">61 - 90 Days</span>
          <div className="text-lg font-extrabold text-[#D97706] mt-0.5">₹{b61_90.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white border border-[#DDE2EC] p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] text-[#64748B] font-semibold">90+ Days (Critical)</span>
          <div className="text-lg font-extrabold text-[#BE123C] mt-0.5">₹{b90_plus.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-[#DDE2EC] shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-[#94A3B8]" size={16} />
          <input
            type="text"
            placeholder="Search invoice no, patient, or payer name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
          >
            <option value="ALL">All Payer Types</option>
            <option value="Patient">Patient</option>
            <option value="Corporate">Corporate</option>
            <option value="Insurance">Insurance</option>
          </select>

          <select
            value={bucketFilter}
            onChange={e => setBucketFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
          >
            <option value="ALL">All Ageing Buckets</option>
            <option value="0-30">0-30 Days</option>
            <option value="31-60">31-60 Days</option>
            <option value="61-90">61-90 Days</option>
            <option value="90+">90+ Days</option>
          </select>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Invoice No</th>
                <th className="px-4 py-3">Patient & Payer</th>
                <th className="px-4 py-3">Payer Type</th>
                <th className="px-4 py-3">Invoice Date</th>
                <th className="px-4 py-3">Ageing</th>
                <th className="px-4 py-3 text-right">Total (₹)</th>
                <th className="px-4 py-3 text-right">Paid (₹)</th>
                <th className="px-4 py-3 text-right">Due (₹)</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-[#F8FAFC] transition">
                  <td className="px-4 py-3 font-mono font-semibold text-[#1B4FD8]">{item.invoice_no}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#0F172A]">{item.patient_name}</div>
                    <div className="text-[11px] text-[#64748B]">{item.payer_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
                      {item.payer_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#64748B] font-mono">{item.invoice_date}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.ageing_bucket === "0-30"
                          ? "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]"
                          : item.ageing_bucket === "31-60"
                          ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                          : item.ageing_bucket === "61-90"
                          ? "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]"
                          : "bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]"
                      }`}
                    >
                      {item.ageing_days} days ({item.ageing_bucket})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[#0F172A] font-medium">₹{item.total_amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#047857] font-bold">₹{item.paid_amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#B45309]">₹{item.due_amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-center">
                    {item.due_amount > 0 ? (
                      <button
                        onClick={() => {
                          setSelectedItem(item)
                          setPaymentAmount(item.due_amount)
                        }}
                        className="px-3 py-1 bg-[#047857] hover:bg-[#065F46] text-white text-[11px] font-semibold rounded shadow-xs transition cursor-pointer"
                      >
                        Allocate Receipt
                      </button>
                    ) : (
                      <span className="text-[#047857] text-xs font-bold">Fully Paid</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#64748B]">
                    No accounts receivable found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Allocation Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl text-[#0F172A]">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A]">Allocate Receipt [{selectedItem.invoice_no}]</h3>
              <button onClick={() => setSelectedItem(null)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAllocatePayment} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <p className="text-[#0F172A]"><strong>Patient:</strong> {selectedItem.patient_name}</p>
                <p className="text-[#0F172A]"><strong>Outstanding Balance:</strong> ₹{selectedItem.due_amount.toLocaleString("en-IN")}</p>
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Receipt Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedItem.due_amount}
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#047857] font-bold font-mono focus:ring-2 focus:ring-[#047857]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#047857] hover:bg-[#065F46] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Confirm & Post Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
