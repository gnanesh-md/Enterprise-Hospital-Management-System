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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#047857]" />
            <span className="text-[#334155]">All billing invoices and receipt vouchers posted</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#047857]" />
            <span className="text-[#334155]">Cashier shift handovers balanced and verified</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#047857]" />
            <span className="text-[#334155]">Bank reconciliation statements completed</span>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#047857]" />
            <span className="text-[#334155]">Monthly fixed asset depreciation posted</span>
          </div>
        </div>
      </div>

      {/* Fiscal Periods Register */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Period Name</th>
                <th className="px-4 py-3">Fiscal Year</th>
                <th className="px-4 py-3 text-center">Closure Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {periods.map(p => (
                <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">{p.period_name}</td>
                  <td className="px-4 py-3 text-[#64748B] font-mono">{p.fiscal_year}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold border ${
                      p.is_closed ? "bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]" : "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]"
                    }`}>
                      {p.is_closed ? "Closed & Locked" : "Active & Open"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePeriod(p.id)}
                      className={`px-3 py-1 text-[11px] font-semibold rounded shadow-xs transition-colors flex items-center gap-1 mx-auto cursor-pointer ${
                        p.is_closed ? "bg-[#047857] hover:bg-[#065F46] text-white" : "bg-[#BE123C] hover:bg-[#9F1239] text-white"
                      }`}
                    >
                      {p.is_closed ? <Unlock size={14} /> : <Lock size={14} />}
                      {p.is_closed ? "Reopen Period" : "Lock Fiscal Period"}
                    </button>
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
