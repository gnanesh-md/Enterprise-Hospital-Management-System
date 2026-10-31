import React, { useState, useEffect } from "react"
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, FileText, Lock, Building2 } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"
import { PaymentVoucher } from "../../types/accounts"

export default function FinanceManagerPortal() {
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>(AccountsDatabase.getPaymentVouchers())
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const reloadData = () => {
    setVouchers(AccountsDatabase.getPaymentVouchers())
  }

  useEffect(() => {
    reloadData()
    const handleUpdate = () => reloadData()
    window.addEventListener("hospai_accounts_updated", handleUpdate)
    return () => window.removeEventListener("hospai_accounts_updated", handleUpdate)
  }, [])

  const pendingVouchers = vouchers.filter(v => v.status === "Submitted")

  const handleApproveVoucher = (vId: string, voucherNo: string) => {
    try {
      AccountsDatabase.approvePaymentVoucher(vId, "Finance Manager (Dr. Vance)")
      setActionMsg(`Payment Voucher ${voucherNo} approved successfully.`)
      reloadData()
      setTimeout(() => setActionMsg(null), 3000)
    } catch (err: any) {
      alert(err.message || "Approval failed.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <ShieldCheck className="text-[#1B4FD8]" size={20} />
            Finance Manager & Approver Executive Hub
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Separation of Duties: Review & Authorize Payment Vouchers, Manual Journals & Fiscal Period Closure
          </p>
        </div>
        <div className="flex items-center gap-3">
          {actionMsg && <span className="text-xs text-[#047857] font-semibold bg-[#ECFDF5] border border-[#A7F3D0] p-2 rounded-lg">{actionMsg}</span>}
          <span className="px-3 py-1.5 bg-[#EFF6FF] text-[#1B4FD8] border border-[#BFDBFE] text-xs font-semibold rounded-lg">
            {pendingVouchers.length} Pending Approvals
          </span>
        </div>
      </div>

      {/* Pending Vouchers Section */}
      <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <FileText size={18} className="text-[#B45309]" />
          Pending Payment Voucher Authorization Requests
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Voucher No</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payee Name</th>
                <th className="px-4 py-3">Payee Type</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {pendingVouchers.map(pv => (
                <tr key={pv.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#B45309]">{pv.voucher_no}</td>
                  <td className="px-4 py-3 text-[#64748B] font-mono">{pv.voucher_date}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{pv.payee_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{pv.payee_type}</td>
                  <td className="px-4 py-3 text-[#334155]">{pv.requested_by}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#BE123C]">
                    ₹{pv.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleApproveVoucher(pv.id, pv.voucher_no)}
                      className="px-3 py-1 bg-[#047857] hover:bg-[#065F46] text-white font-semibold rounded text-xs shadow-xs flex items-center gap-1 mx-auto cursor-pointer transition-colors"
                    >
                      <CheckCircle2 size={14} /> Authorize & Approve
                    </button>
                  </td>
                </tr>
              ))}
              {pendingVouchers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#94A3B8]">
                    No pending payment vouchers awaiting approval.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
