import React, { useState } from "react"
import { PieChart, TrendingUp, DollarSign, BarChart2 } from "lucide-react"

interface BudgetRow {
  department: string
  cost_centre: string
  category: "Revenue" | "Expense"
  annual_budget: number
  actual_ytd: number
}

const INITIAL_BUDGETS: BudgetRow[] = [
  { department: "Outpatient (OPD)", cost_centre: "CC-OPD-01", category: "Revenue", annual_budget: 15000000, actual_ytd: 12500000 },
  { department: "Inpatient (IPD)", cost_centre: "CC-IPD-01", category: "Revenue", annual_budget: 45000000, actual_ytd: 38000000 },
  { department: "Emergency (ER)", cost_centre: "CC-ER-01", category: "Revenue", annual_budget: 11000000, actual_ytd: 9200000 },
  { department: "Critical Care (ICU)", cost_centre: "CC-ICU-01", category: "Revenue", annual_budget: 25000000, actual_ytd: 21000000 },
  { department: "Operation Theatre (OT)", cost_centre: "CC-OT-01", category: "Revenue", annual_budget: 28000000, actual_ytd: 24500000 },
  { department: "Laboratory", cost_centre: "CC-LAB-01", category: "Revenue", annual_budget: 18000000, actual_ytd: 14800000 },
  { department: "Pharmacy", cost_centre: "CC-PHM-01", category: "Expense", annual_budget: 14000000, actual_ytd: 11200000 },
  { department: "Clinical Doctors", cost_centre: "CC-DOC-01", category: "Expense", annual_budget: 32000000, actual_ytd: 28500000 },
  { department: "Staff Salaries & Wages", cost_centre: "CC-HR-01", category: "Expense", annual_budget: 40000000, actual_ytd: 34200000 },
  { department: "Hospital Utilities", cost_centre: "CC-ADM-01", category: "Expense", annual_budget: 6000000, actual_ytd: 4800000 },
]

export default function BudgetingView() {
  const [budgets] = useState<BudgetRow[]>(INITIAL_BUDGETS)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <PieChart className="text-[#1B4FD8]" size={20} />
            Cost Centre Budgeting & Variance Monitoring
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Departmental Revenue & Expense Targets vs Actual Ledger Performance
          </p>
        </div>
      </div>

      {/* Budget Summary Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
            <BarChart2 size={16} className="text-[#1B4FD8]" />
            Departmental Cost Centre Performance Register (FY 2026-2027)
          </h3>
          <span className="text-[11px] text-[#64748B]">Updated from General Ledger</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0]">
            <tr>
              <th className="py-2.5 px-4">Department</th>
              <th className="py-2.5 px-4">Cost Centre</th>
              <th className="py-2.5 px-4">Category</th>
              <th className="py-2.5 px-4 text-right">Annual Budget (₹)</th>
              <th className="py-2.5 px-4 text-right">Actual YTD (₹)</th>
              <th className="py-2.5 px-4 text-right">Variance (₹)</th>
              <th className="py-2.5 px-4 text-right">Utilization %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
            {budgets.map((b, i) => {
              const variance = b.annual_budget - b.actual_ytd
              const pct = ((b.actual_ytd / b.annual_budget) * 100).toFixed(1)
              return (
                <tr key={i} className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-semibold text-[#0F172A]">{b.department}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-[#1B4FD8]">{b.cost_centre}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                      b.category === "Revenue" ? "bg-[#ECFDF5] text-[#047857]" : "bg-[#EFF6FF] text-[#1B4FD8]"
                    }`}>
                      {b.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-medium">₹{b.annual_budget.toLocaleString("en-IN")}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0F172A]">₹{b.actual_ytd.toLocaleString("en-IN")}</td>
                  <td className={`py-2.5 px-4 text-right font-mono font-medium ${variance >= 0 ? "text-[#047857]" : "text-[#B42318]"}`}>
                    {variance >= 0 ? "+" : ""}₹{variance.toLocaleString("en-IN")}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono font-bold text-xs">{pct}%</span>
                      <div className="w-16 bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${parseFloat(pct) > 90 ? "bg-[#B42318]" : parseFloat(pct) > 75 ? "bg-[#D97706]" : "bg-[#047857]"}`}
                          style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
