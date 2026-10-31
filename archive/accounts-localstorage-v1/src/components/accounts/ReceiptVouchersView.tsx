import React, { useState, useEffect } from "react"
import { FileText, Plus, Search, CheckCircle2, Printer, ArrowDownLeft } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"
import { ReceiptVoucher, ChartOfAccount } from "../../types/accounts"

export default function ReceiptVouchersView() {
  const [vouchers, setVouchers] = useState<ReceiptVoucher[]>(AccountsDatabase.getReceiptVouchers())
  const [coa] = useState<ChartOfAccount[]>(AccountsDatabase.getChartOfAccounts())
  const [search, setSearch] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedRv, setSelectedRv] = useState<ReceiptVoucher | null>(null)

  // Form State
  const [patientId, setPatientId] = useState("")
  const [patientName, setPatientName] = useState("")
  const [payerType, setPayerType] = useState<"Patient" | "Corporate" | "Insurance">("Patient")
  const [payerName, setPayerName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<ReceiptVoucher["payment_method"]>("Cash")
  const [destAccount, setDestAccount] = useState("1120")
  const [amount, setAmount] = useState<number>(0)
  const [referenceNo, setReferenceNo] = useState("")
  const [notes, setNotes] = useState("")

  const reloadData = () => {
    setVouchers(AccountsDatabase.getReceiptVouchers())
  }

  useEffect(() => {
    reloadData()
    const handleUpdate = () => reloadData()
    window.addEventListener("hospai_accounts_updated", handleUpdate)
    return () => window.removeEventListener("hospai_accounts_updated", handleUpdate)
  }, [])

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientName || amount <= 0) return

    const destAccObj = coa.find(a => a.account_code === destAccount)

    AccountsDatabase.createReceiptVoucher({
      receipt_date: new Date().toISOString().split("T")[0],
      patient_id: patientId.trim() || `P-${Date.now()}`,
      patient_name: patientName.trim(),
      payer_type: payerType,
      payer_name: payerName.trim() || patientName.trim(),
      payment_method: paymentMethod,
      destination_account_code: destAccount,
      destination_account_name: destAccObj ? destAccObj.account_name : "Cash Account",
      amount_received: amount,
      allocated_amount: amount,
      unallocated_amount: 0,
      reference_no: referenceNo.trim() || `REF-${Date.now()}`,
      allocated_invoices: [{ invoice_no: `INV-${Math.floor(10000 + Math.random() * 90000)}`, amount }],
      status: "Posted",
      created_by: "Accountant",
      notes: notes.trim(),
    })

    setShowAddModal(false)
    setPatientId("")
    setPatientName("")
    setPayerName("")
    setAmount(0)
    setReferenceNo("")
    setNotes("")
    reloadData()
  }

  const filtered = vouchers.filter(v => {
    const q = search.toLowerCase()
    return v.voucher_no.toLowerCase().includes(q) || v.patient_name.toLowerCase().includes(q) || v.reference_no.toLowerCase().includes(q)
  })

  const totalCollected = vouchers.reduce((sum, v) => sum + v.amount_received, 0)

  return (
    <div className="space-y-5 text-[#0F172A]">
      {/* Header */}
      <div className="bg-white p-4.5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ArrowDownLeft className="text-[#047857]" size={20} />
            Receipt Vouchers & Cash Collections Register
          </h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Official Patient & Corporate Receipt Vouchers with Instant GL Posting & Invoice Allocation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <span className="text-[11px] text-[#64748B] font-medium">Total Collections Recorded</span>
            <div className="text-lg font-extrabold text-[#047857]">₹{totalCollected.toLocaleString("en-IN")}</div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-[#047857] hover:bg-[#065F46] text-white font-semibold rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            Issue Receipt Voucher
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-[#94A3B8]" size={16} />
        <input
          type="text"
          placeholder="Search by voucher no, patient name, or reference no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
        />
      </div>

      {/* Vouchers Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Voucher No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Patient & Payer</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Destination Account</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map(rv => (
                <tr key={rv.id} className="hover:bg-[#F8FAFC] transition">
                  <td className="px-4 py-3 font-mono font-semibold text-[#047857]">{rv.voucher_no}</td>
                  <td className="px-4 py-3 text-[#64748B] font-mono">{rv.receipt_date}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#0F172A]">{rv.patient_name}</div>
                    <div className="text-[11px] text-[#64748B]">{rv.payer_name} ({rv.payer_type})</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-[#F1F5F9] text-[#334155] rounded text-[10px] font-semibold border border-[#CBD5E1]">
                      {rv.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#334155] font-mono text-[11px] font-medium">
                    [{rv.destination_account_code}] {rv.destination_account_name}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#047857]">
                    ₹{rv.amount_received.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                      {rv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedRv(rv)}
                      className="p-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded-md transition cursor-pointer border border-[#CBD5E1]"
                      title="Print / Inspect Voucher"
                    >
                      <Printer size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">
                    No receipt vouchers issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Voucher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl text-[#0F172A]">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A]">Issue Official Receipt Voucher</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateVoucher} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#475569] font-semibold mb-1">Patient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Sharma"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#475569] font-semibold mb-1">Payer Type</label>
                  <select
                    value={payerType}
                    onChange={e => setPayerType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                  >
                    <option value="Patient">Self Pay Patient</option>
                    <option value="Corporate">Corporate Payer</option>
                    <option value="Insurance">Insurance / TPA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#475569] font-semibold mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Destination Cash/Bank Account</label>
                <select
                  value={destAccount}
                  onChange={e => setDestAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] font-mono focus:ring-2 focus:ring-[#1B4FD8]"
                >
                  {coa.filter(a => ["Cash", "Bank"].includes(a.account_type)).map(a => (
                    <option key={a.account_code} value={a.account_code}>
                      [{a.account_code}] {a.account_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount || ""}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#047857] font-bold font-mono focus:ring-2 focus:ring-[#047857]"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Reference / UTR / Cheque No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-992182019"
                  value={referenceNo}
                  onChange={e => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] font-mono focus:ring-2 focus:ring-[#1B4FD8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#047857] hover:bg-[#065F46] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Issue & Post Receipt Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Voucher Inspector Modal */}
      {selectedRv && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl text-[#0F172A]">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Printer size={18} className="text-[#047857]" />
                HospAI Receipt Voucher [{selectedRv.voucher_no}]
              </h3>
              <button onClick={() => setSelectedRv(null)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">✕</button>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs space-y-2.5 text-[#0F172A] font-mono">
              <div className="flex justify-between border-b border-[#E2E8F0] pb-1.5">
                <span>Voucher No:</span><span className="text-[#047857] font-bold">{selectedRv.voucher_no}</span>
              </div>
              <div className="flex justify-between"><span>Date:</span><span>{selectedRv.receipt_date}</span></div>
              <div className="flex justify-between"><span>Patient:</span><span className="text-[#0F172A] font-sans font-bold">{selectedRv.patient_name}</span></div>
              <div className="flex justify-between"><span>Payer Type:</span><span>{selectedRv.payer_type} ({selectedRv.payer_name})</span></div>
              <div className="flex justify-between"><span>Payment Method:</span><span>{selectedRv.payment_method}</span></div>
              <div className="flex justify-between"><span>Destination:</span><span>[{selectedRv.destination_account_code}] {selectedRv.destination_account_name}</span></div>
              <div className="flex justify-between"><span>Reference No:</span><span>{selectedRv.reference_no}</span></div>
              <div className="flex justify-between border-t border-[#E2E8F0] pt-2 text-sm font-bold text-[#047857]">
                <span>Amount Collected:</span><span>₹{selectedRv.amount_received.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1541B0] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer size={14} /> Print Official Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
