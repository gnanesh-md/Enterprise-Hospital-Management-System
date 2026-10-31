import React, { useState, useEffect } from "react"
import { ShieldCheck, Search, DollarSign, Building2, CheckCircle2 } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"

interface InsuranceClaimRow {
  id: string
  claim_no: string
  patient_name: string
  insurer_name: string
  claimed_amount: number
  approved_amount: number
  deducted_amount: number
  settled_amount: number
  status: "Pre-Auth Approved" | "Claim Submitted" | "Settled" | "Disputed"
  submission_date: string
}

const INITIAL_INSURANCE_CLAIMS: InsuranceClaimRow[] = [
  { id: "CLM-01", claim_no: "CLM-2026-8812", patient_name: "Anita Sharma", insurer_name: "Star Health Insurance", claimed_amount: 185000, approved_amount: 170000, deducted_amount: 15000, settled_amount: 170000, status: "Settled", submission_date: "2026-04-02" },
  { id: "CLM-02", claim_no: "CLM-2026-8815", patient_name: "Rahul Verma", insurer_name: "HDFC ERGO Health", claimed_amount: 240000, approved_amount: 225000, deducted_amount: 15000, settled_amount: 0, status: "Pre-Auth Approved", submission_date: "2026-04-05" },
  { id: "CLM-03", claim_no: "CLM-2026-8819", patient_name: "Priya Nair", insurer_name: "ICICI Lombard TPA", claimed_amount: 120000, approved_amount: 110000, deducted_amount: 10000, settled_amount: 110000, status: "Settled", submission_date: "2026-04-07" },
  { id: "CLM-04", claim_no: "CLM-2026-8822", patient_name: "Suresh Gupta", insurer_name: "Max Bupa / Niva Bupa", claimed_amount: 310000, approved_amount: 290000, deducted_amount: 20000, settled_amount: 0, status: "Claim Submitted", submission_date: "2026-04-08" },
]

export default function InsuranceAccountsView() {
  const [claims] = useState<InsuranceClaimRow[]>(INITIAL_INSURANCE_CLAIMS)
  const [search, setSearch] = useState("")

  const filtered = claims.filter(c => {
    const q = search.toLowerCase()
    return c.claim_no.toLowerCase().includes(q) || c.patient_name.toLowerCase().includes(q) || c.insurer_name.toLowerCase().includes(q)
  })

  const totalClaimed = claims.reduce((sum, c) => sum + c.claimed_amount, 0)
  const totalApproved = claims.reduce((sum, c) => sum + c.approved_amount, 0)
  const totalSettled = claims.reduce((sum, c) => sum + c.settled_amount, 0)
  const totalPending = totalApproved - totalSettled

  const handleSettleClaim = (claim: InsuranceClaimRow) => {
    try {
      AccountsDatabase.postJournal({
        transaction_type: "INSURANCE_SETTLED",
        source_module: "insurance_accounts",
        source_reference_id: claim.claim_no,
        description: `TPA Bank Settlement for Claim ${claim.claim_no} (${claim.insurer_name})`,
        lines: [
          { account_code: "1210", debit: claim.approved_amount, credit: 0, narration: `Bank receipt from ${claim.insurer_name}` },
          { account_code: "1330", debit: 0, credit: claim.approved_amount, narration: `Insurance AR settlement for ${claim.patient_name}`, sub_ledger_name: claim.insurer_name },
        ],
      })
      alert(`Bank settlement of ₹${claim.approved_amount.toLocaleString("en-IN")} posted to General Ledger.`)
    } catch (err: any) {
      alert(err.message || "Settlement posting failed.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <ShieldCheck className="text-[#1B4FD8]" size={20} />
            Insurance & TPA Claims Accounting & Settlement Ledger
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            8-Stage Claim Lifecycle Tracking, Deductions, TPA Reconciliation & Bank Receipts
          </p>
        </div>
      </div>

      {/* Insurance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Total Submitted Claims</span>
          <div className="text-xl font-bold text-[#0F172A] mt-1">₹{totalClaimed.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Total Approved Amount</span>
          <div className="text-xl font-bold text-[#1B4FD8] mt-1">₹{totalApproved.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Settled Bank Receipts</span>
          <div className="text-xl font-bold text-[#047857] mt-1">₹{totalSettled.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Pending TPA Receivables</span>
          <div className="text-xl font-bold text-[#B45309] mt-1">₹{totalPending.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-[#94A3B8]" size={16} />
        <input
          type="text"
          placeholder="Search claim no, patient name, or insurer/TPA..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8]"
        />
      </div>

      {/* Claims Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Claim No</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">Insurer / TPA</th>
                <th className="px-4 py-3 text-right">Claimed (₹)</th>
                <th className="px-4 py-3 text-right">Approved (₹)</th>
                <th className="px-4 py-3 text-right">Deducted (₹)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#1B4FD8]">{c.claim_no}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{c.patient_name}</td>
                  <td className="px-4 py-3 text-[#334155]">{c.insurer_name}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#0F172A]">₹{c.claimed_amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#1B4FD8]">₹{c.approved_amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#BE123C]">₹{c.deducted_amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      c.status === "Settled" ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]" : "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.status !== "Settled" ? (
                      <button
                        onClick={() => handleSettleClaim(c)}
                        className="px-3 py-1 bg-[#047857] hover:bg-[#065F46] text-white text-[11px] font-semibold rounded shadow-xs transition-colors cursor-pointer"
                      >
                        Record Bank Settlement
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                        Bank Settled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
