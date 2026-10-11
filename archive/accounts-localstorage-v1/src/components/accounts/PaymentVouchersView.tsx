import React, { useState, useEffect } from "react"
import { ArrowUpRight, Plus, Search, CheckCircle2, ShieldCheck, Clock } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"
import { PaymentVoucher, ChartOfAccount } from "../../types/accounts"

export default function PaymentVouchersView() {
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>(AccountsDatabase.getPaymentVouchers())
  const [coa] = useState<ChartOfAccount[]>(AccountsDatabase.getChartOfAccounts())
  const [search, setSearch] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)

  // Form State
  const [payeeType, setPayeeType] = useState<PaymentVoucher["payee_type"]>("Supplier")
  const [payeeName, setPayeeName] = useState("")
  const [expenseAccount, setExpenseAccount] = useState("2110")
  const [bankAccount, setBankAccount] = useState("1210")
  const [paymentMethod, setPaymentMethod] = useState<PaymentVoucher["payment_method"]>("Bank Transfer")
  const [amount, setAmount] = useState<number>(0)
  const [narration, setNarration] = useState("")

  const reloadData = () => {
    setVouchers(AccountsDatabase.getPaymentVouchers())
  }

  useEffect(() => {
    reloadData()
    const handleUpdate = () => reloadData()
    window.addEventListener("hospai_accounts_updated", handleUpdate)
    return () => window.removeEventListener("hospai_accounts_updated", handleUpdate)
  }, [])

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault()
    if (!payeeName || amount <= 0) return

    AccountsDatabase.createPaymentVoucher({
      voucher_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      payee_type: payeeType,
      payee_name: payeeName.trim(),
      expense_or_liability_account: expenseAccount,
      source_bank_account_code: bankAccount,
      payment_method: paymentMethod,
      amount,
      tax_deducted: 0,
      net_disbursed: amount,
      requested_by: "Accountant User",
      narration: narration.trim(),
    })

    setShowAddModal(false)
    setPayeeName("")
    setAmount(0)
    setNarration("")
    reloadData()
  }

  const handleApprove = (vId: string) => {
    try {
      AccountsDatabase.approvePaymentVoucher(vId, "Finance Manager")
      reloadData()
    } catch (err: any) {
      alert(err.message || "Approval failed.")
    }
  }

  const handleDisburse = (vId: string) => {
    try {
      AccountsDatabase.disbursePaymentVoucher(vId, "Accountant")
      reloadData()
    } catch (err: any) {
      alert(err.message || "Disbursement failed.")
    }
  }

  const filtered = vouchers.filter(v => {
    const q = search.toLowerCase()
    return v.voucher_no.toLowerCase().includes(q) || v.payee_name.toLowerCase().includes(q) || v.narration.toLowerCase().includes(q)
  })

  const totalDisbursed = vouchers.filter(v => v.status === "Disbursed").reduce((sum, v) => sum + v.amount, 0)

  return (
    <div className="space-y-5 text-[#0F172A]">
      {/* Header */}
      <div className="bg-white p-4.5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpRight className="text-[#BE123C]" size={20} />
            Payment Vouchers & Disbursement Workflow
          </h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Trade Supplier Disbursements, Expense Vouchers & Finance Manager Approval Lifecycle
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <span className="text-[11px] text-[#64748B] font-medium">Total Disbursed (YTD)</span>
            <div className="text-lg font-extrabold text-[#BE123C]">₹{totalDisbursed.toLocaleString("en-IN")}</div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-[#1B4FD8] hover:bg-[#1541B0] text-white font-semibold rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            Prepare Payment Voucher
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-[#94A3B8]" size={16} />
        <input
          type="text"
          placeholder="Search voucher no, payee name, or narration..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Voucher No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payee & Type</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3 text-center">Approval Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map(pv => (
                <tr key={pv.id} className="hover:bg-[#F8FAFC] transition">
                  <td className="px-4 py-3 font-mono font-semibold text-[#BE123C]">{pv.voucher_no}</td>
                  <td className="px-4 py-3 text-[#64748B] font-mono">{pv.voucher_date}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-[#0F172A]">{pv.payee_name}</div>
                    <div className="text-[11px] text-[#64748B]">{pv.payee_type}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-[#F1F5F9] text-[#334155] rounded text-[10px] font-semibold border border-[#CBD5E1]">
                      {pv.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#BE123C]">
                    ₹{pv.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        pv.status === "Disbursed"
                          ? "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]"
                          : pv.status === "Approved"
                          ? "bg-[#EFF6FF] text-[#1B4FD8] border border-[#BFDBFE]"
                          : "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                      }`}
                    >
                      {pv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {pv.status === "Submitted" && (
                        <button
                          onClick={() => handleApprove(pv.id)}
                          className="px-2.5 py-1 bg-[#1B4FD8] hover:bg-[#1541B0] text-white text-[10px] font-semibold rounded cursor-pointer shadow-xs"
                        >
                          Approve
                        </button>
                      )}
                      {pv.status === "Approved" && (
                        <button
                          onClick={() => handleDisburse(pv.id)}
                          className="px-2.5 py-1 bg-[#047857] hover:bg-[#065F46] text-white text-[10px] font-semibold rounded cursor-pointer shadow-xs"
                        >
                          Disburse
                        </button>
                      )}
                      {pv.status === "Disbursed" && (
                        <span className="text-[#047857] text-xs font-bold">Completed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                    No payment vouchers found in system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Prepare Payment Voucher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl text-[#0F172A]">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A]">Prepare Payment Voucher</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateVoucher} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#475569] font-semibold mb-1">Payee Type</label>
                  <select
                    value={payeeType}
                    onChange={e => setPayeeType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                  >
                    <option value="Supplier">Trade Supplier</option>
                    <option value="Employee">Staff / Employee</option>
                    <option value="Utility">Hospital Utility</option>
                    <option value="Doctor Specialist">Doctor Specialist</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#475569] font-semibold mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Payee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cipla Healthcare Suppliers"
                  value={payeeName}
                  onChange={e => setPayeeName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Debit Liability / Expense Account</label>
                <select
                  value={expenseAccount}
                  onChange={e => setExpenseAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] font-mono focus:ring-2 focus:ring-[#1B4FD8]"
                >
                  {coa.filter(a => ["Liability", "Expense", "AP", "Payroll"].includes(a.account_type)).map(a => (
                    <option key={a.account_code} value={a.account_code}>
                      [{a.account_code}] {a.account_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Disbursement Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount || ""}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#BE123C] font-bold font-mono focus:ring-2 focus:ring-[#BE123C]"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Payment Narration</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Settlement of Pharmacy GRN Invoice CIP-9921"
                  value={narration}
                  onChange={e => setNarration(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
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
                  className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1541B0] text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Submit Payment Voucher for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
