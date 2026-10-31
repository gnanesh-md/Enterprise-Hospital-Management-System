import React, { useState } from "react"
import { Lock, Unlock, CheckCircle2, ShieldAlert, Calendar } from "lucide-react"

interface PeriodItem {
  id: string
  period_name: string
  fiscal_year: string
  is_closed: boolean
}

const INITIAL_PERIODS: PeriodItem[] = [
  { id: "FP-2026-04", period_name: "April 2026", fiscal_year: "2026-2027", is_closed: false },
  { id: "FP-2026-03", period_name: "March 2026", fiscal_year: "2025-2026", is_closed: true },
  { id: "FP-2026-02", period_name: "February 2026", fiscal_year: "2025-2026", is_closed: true },
  { id: "FP-2026-01", period_name: "January 2026", fiscal_year: "2025-2026", is_closed: true },
]

export default function PeriodClosingView() {
  const [periods, setPeriods] = useState<PeriodItem[]>(INITIAL_PERIODS)

  const togglePeriod = (id: string) => {
    setPeriods(periods.map(p => p.id === id ? { ...p, is_closed: !p.is_closed } : p))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Lock className="text-[#B45309]" size={20} />
            Fiscal Period Management & Period Locking
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Month-End Financial Closure, Controlled Reopening & Backdated Entry Controls
          </p>
        </div>
      </div>

      {/* Month End Checklist */}
      <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-3 shadow-xs">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <CheckCircle2 size={18} className="text-[#047857]" />
          Financial Month-End Closure Pre-Flight Checklist
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#334155] pt-1">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>All Daily Cashier Shift Sessions Closed & Verified</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Bank Statements Reconciled against General Ledger</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Pharmacy GRNs & Supplier Invoices Matched</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Monthly Fixed Asset Depreciation Journals Executed</span>
          </div>
        </div>
      </div>

      {/* Period Locking Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
            <Calendar size={16} className="text-[#1B4FD8]" />
            Fiscal Periods Register
          </h3>
          <span className="text-[11px] text-[#64748B]">Click toggle to lock or unlock period</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0]">
            <tr>
              <th className="py-2.5 px-4">Period Code</th>
              <th className="py-2.5 px-4">Period Name</th>
              <th className="py-2.5 px-4">Fiscal Year</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
            {periods.map(p => (
              <tr key={p.id} className="hover:bg-[#F8FAFC]">
                <td className="py-2.5 px-4 font-mono font-bold text-[#1B4FD8]">{p.id}</td>
                <td className="py-2.5 px-4 font-semibold text-[#0F172A]">{p.period_name}</td>
                <td className="py-2.5 px-4 font-medium">{p.fiscal_year}</td>
                <td className="py-2.5 px-4">
                  <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                    p.is_closed ? "bg-[#FEF2F2] text-[#B42318]" : "bg-[#ECFDF5] text-[#047857]"
                  }`}>
                    {p.is_closed ? "Locked / Closed" : "Open for Postings"}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => togglePeriod(p.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                      p.is_closed
                        ? "bg-[#EFF6FF] text-[#1B4FD8] hover:bg-[#DBEAFE]"
                        : "bg-[#FEF2F2] text-[#B42318] hover:bg-[#FEE2E2]"
                    }`}
                  >
                    {p.is_closed ? "Unlock Period" : "Lock Period"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
