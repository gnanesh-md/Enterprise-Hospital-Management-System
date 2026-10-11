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
            Budgeting & Cost Centre Accounting
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Departmental Revenue & Expense Budgets, Cost Centre Allocations & Variance Analysis
          </p>
        </div>
        <span className="px-3 py-1 bg-[#EFF6FF] text-[#1B4FD8] border border-[#BFDBFE] text-xs font-semibold rounded-lg">
          FY 2026-2027 Active Budget
        </span>
      </div>

      {/* Budget Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Cost Centre Code</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Annual Budget (₹)</th>
                <th className="px-4 py-3 text-right">Actual YTD (₹)</th>
                <th className="px-4 py-3 text-right">Variance (₹)</th>
                <th className="px-4 py-3 text-center">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {budgets.map(b => {
                const variance = b.actual_ytd - b.annual_budget
                const utilization = ((b.actual_ytd / b.annual_budget) * 100).toFixed(1)
                const utilNum = parseFloat(utilization)

                return (
                  <tr key={b.cost_centre} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-mono text-[#1B4FD8] font-semibold">{b.cost_centre}</td>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{b.department}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        b.category === "Revenue" ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]" : "bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]"
                      }`}>
                        {b.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#0F172A]">₹{b.annual_budget.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-[#0F172A]">₹{b.actual_ytd.toLocaleString("en-IN")}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${variance >= 0 ? "text-[#047857]" : "text-[#BE123C]"}`}>
                      ₹{variance.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#F1F5F9] h-2 rounded-full overflow-hidden border border-[#E2E8F0]">
                          <div
                            className={`h-full ${utilNum > 100 ? "bg-[#BE123C]" : utilNum > 80 ? "bg-[#B45309]" : "bg-[#047857]"}`}
                            style={{ width: `${Math.min(100, utilNum)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-[#334155] w-10">{utilization}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
