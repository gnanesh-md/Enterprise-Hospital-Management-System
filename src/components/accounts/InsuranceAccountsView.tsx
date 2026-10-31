import React, { useState } from "react"
import { ShieldCheck, Search, DollarSign, Building2, CheckCircle2 } from "lucide-react"

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
  const [claims, setClaims] = useState<InsuranceClaimRow[]>(INITIAL_INSURANCE_CLAIMS)
  const [search, setSearch] = useState("")
  const [settledMsg, setSettledMsg] = useState<string | null>(null)

  const filtered = claims.filter(c => {
    const q = search.toLowerCase()
    return c.claim_no.toLowerCase().includes(q) || c.patient_name.toLowerCase().includes(q) || c.insurer_name.toLowerCase().includes(q)
  })

  const totalClaimed = claims.reduce((sum, c) => sum + c.claimed_amount, 0)
  const totalApproved = claims.reduce((sum, c) => sum + c.approved_amount, 0)
  const totalSettled = claims.reduce((sum, c) => sum + c.settled_amount, 0)
  const totalPending = totalApproved - totalSettled

  const handleSettleClaim = (claim: InsuranceClaimRow) => {
    setClaims(claims.map(c => c.id === claim.id ? { ...c, settled_amount: c.approved_amount, status: "Settled" } : c))
    setSettledMsg(`Claim ${claim.claim_no} marked settled for ₹${claim.approved_amount.toLocaleString("en-IN")}.`)
    setTimeout(() => setSettledMsg(null), 4000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <ShieldCheck className="text-[#1B4FD8]" size={20} />
            Insurance & Corporate (TPA) Sub-Ledger Tracking
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Pre-Auth Approval Reconciliation, Co-Pay Deductions & TPA Settlement Vouchers
          </p>
        </div>
      </div>

      {settledMsg && (
        <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs font-semibold text-[#047857]">
          {settledMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Total Claimed</span>
          <div className="text-xl font-bold text-[#0F172A] mt-1">₹{totalClaimed.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#64748B] mt-0.5">{claims.length} Total Claims</div>
        </div>

        <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Approved by Insurer</span>
          <div className="text-xl font-bold text-[#047857] mt-1">₹{totalApproved.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#047857] mt-0.5 font-semibold">TPA Guaranteed Sum</div>
        </div>

        <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Settled & Received</span>
          <div className="text-xl font-bold text-[#1B4FD8] mt-1">₹{totalSettled.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#1B4FD8] mt-0.5 font-semibold">Credited to Bank</div>
        </div>

        <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Pending Settlement</span>
          <div className="text-xl font-bold text-[#B45309] mt-1">₹{totalPending.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#B45309] mt-0.5 font-semibold">Outstanding AR</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#F1F5F9] bg-[#FAFAFA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
            <Building2 size={16} className="text-[#1B4FD8]" />
            TPA / Corporate Claims Register
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-[#94A3B8]" size={14} />
            <input
              type="text"
              placeholder="Search claim, patient or insurer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1B4FD8]"
            />
          </div>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0]">
            <tr>
              <th className="py-2.5 px-4">Claim ID</th>
              <th className="py-2.5 px-4">Patient</th>
              <th className="py-2.5 px-4">Insurer / TPA</th>
              <th className="py-2.5 px-4 text-right">Claimed (₹)</th>
              <th className="py-2.5 px-4 text-right">Approved (₹)</th>
              <th className="py-2.5 px-4 text-right">Settled (₹)</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-[#F8FAFC]">
                <td className="py-2.5 px-4 font-mono font-bold text-[#1B4FD8]">{c.claim_no}</td>
                <td className="py-2.5 px-4 font-semibold text-[#0F172A]">{c.patient_name}</td>
                <td className="py-2.5 px-4">{c.insurer_name}</td>
                <td className="py-2.5 px-4 text-right font-mono">₹{c.claimed_amount.toLocaleString("en-IN")}</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#047857]">₹{c.approved_amount.toLocaleString("en-IN")}</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-[#1B4FD8]">₹{c.settled_amount.toLocaleString("en-IN")}</td>
                <td className="py-2.5 px-4">
                  <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                    c.status === "Settled" ? "bg-[#ECFDF5] text-[#047857]" :
                    c.status === "Pre-Auth Approved" ? "bg-[#EFF6FF] text-[#1B4FD8]" : "bg-[#FEF3C7] text-[#92400E]"
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right">
                  {c.status !== "Settled" ? (
                    <button
                      onClick={() => handleSettleClaim(c)}
                      className="px-2.5 py-1 bg-[#1B4FD8] text-white rounded text-xs font-semibold hover:bg-[#1640B2] cursor-pointer"
                    >
                      Post Settlement
                    </button>
                  ) : (
                    <span className="text-[#047857] font-semibold text-xs flex items-center justify-end gap-1">
                      <CheckCircle2 size={13} /> Settled
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
