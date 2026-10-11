import React, { useState } from "react"
import { ShieldCheck, Plus, RefreshCw, Calculator, Layers } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"

interface AssetRow {
  id: string
  code: string
  name: string
  category: string
  cost: number
  accumulated_dep: number
  nbv: number
  method: "Straight Line" | "Reducing Balance"
  useful_life: number
}

const INITIAL_ASSETS: AssetRow[] = [
  { id: "AST-01", code: "EQP-MRI-01", name: "Siemens 3T MRI Machine", category: "Medical Equipment", cost: 35000000, accumulated_dep: 7000000, nbv: 28000000, method: "Straight Line", useful_life: 10 },
  { id: "AST-02", code: "EQP-CT-01", name: "GE 128-Slice CT Scanner", category: "Medical Equipment", cost: 18000000, accumulated_dep: 3600000, nbv: 14400000, method: "Straight Line", useful_life: 8 },
  { id: "AST-03", code: "EQP-ICU-10", name: "Mindray ICU Ventilators (10 Units)", category: "Medical Equipment", cost: 4500000, accumulated_dep: 900000, nbv: 3600000, method: "Straight Line", useful_life: 5 },
  { id: "AST-04", code: "FUR-BED-50", name: "Hillrom Motorized ICU Beds (20 Units)", category: "Furniture & Fixtures", cost: 2400000, accumulated_dep: 480000, nbv: 1920000, method: "Straight Line", useful_life: 7 },
  { id: "AST-05", code: "IT-SRV-01", name: "Dell PowerEdge Server Rack Cluster", category: "IT Hardware", cost: 1200000, accumulated_dep: 400000, nbv: 800000, method: "Reducing Balance", useful_life: 3 },
]

export default function FixedAssetsView() {
  const [assets, setAssets] = useState<AssetRow[]>(INITIAL_ASSETS)
  const [showDepModal, setShowDepModal] = useState(false)
  const [depMsg, setDepMsg] = useState<string | null>(null)

  const handleRunDepreciation = () => {
    // Post Journal: Debit Depreciation Expense (5410), Credit Accumulated Depreciation (1790)
    let totalDep = 0
    const updated = assets.map(ast => {
      const annualDep = Math.round(ast.cost / ast.useful_life)
      const monthlyDep = Math.round(annualDep / 12)
      totalDep += monthlyDep
      const newAcc = ast.accumulated_dep + monthlyDep
      return {
        ...ast,
        accumulated_dep: newAcc,
        nbv: ast.cost - newAcc,
      }
    })

    try {
      AccountsDatabase.postJournal({
        transaction_type: "ASSET_DEPRECIATION",
        source_module: "fixed_assets",
        source_reference_id: `DEP-${new Date().toISOString().split("T")[0]}`,
        description: `Monthly Fixed Asset Depreciation Run`,
        lines: [
          { account_code: "5410", debit: totalDep, credit: 0, narration: "Fixed Asset Depreciation Expense" },
          { account_code: "1790", debit: 0, credit: totalDep, narration: "Accumulated Depreciation Contra Asset" },
        ],
      })
      setAssets(updated)
      setDepMsg(`Monthly depreciation of ₹${totalDep.toLocaleString("en-IN")} posted to General Ledger.`)
      setTimeout(() => setDepMsg(null), 4000)
    } catch (err: any) {
      alert(err.message || "Depreciation posting failed.")
    }
  }

  const totalCost = assets.reduce((sum, a) => sum + a.cost, 0)
  const totalAccDep = assets.reduce((sum, a) => sum + a.accumulated_dep, 0)
  const totalNBV = assets.reduce((sum, a) => sum + a.nbv, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Calculator className="text-[#1B4FD8]" size={20} />
            Fixed Asset Register & Depreciation Engine
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Asset Capitalization, Useful Life, SLM/WDV Depreciation Schedules & Disposal Accounting
          </p>
        </div>
        <div className="flex items-center gap-3">
          {depMsg && <span className="text-xs text-[#047857] font-semibold bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1.5 rounded-lg">{depMsg}</span>}
          <button
            onClick={handleRunDepreciation}
            className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1541B0] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            Run Monthly Depreciation
          </button>
        </div>
      </div>

      {/* Asset KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Total Asset Acquisition Cost</span>
          <div className="text-xl font-bold text-[#0F172A] mt-1">₹{totalCost.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Accumulated Depreciation</span>
          <div className="text-xl font-bold text-[#BE123C] mt-1">₹{totalAccDep.toLocaleString("en-IN")}</div>
        </div>
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Net Book Value (NBV)</span>
          <div className="text-xl font-bold text-[#047857] mt-1">₹{totalNBV.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* Asset Register Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Asset Code</th>
                <th className="px-4 py-3">Asset Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Depreciation Method</th>
                <th className="px-4 py-3 text-right">Cost (₹)</th>
                <th className="px-4 py-3 text-right">Accum. Dep. (₹)</th>
                <th className="px-4 py-3 text-right">Net Book Value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {assets.map(ast => (
                <tr key={ast.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#1B4FD8]">{ast.code}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{ast.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{ast.category}</td>
                  <td className="px-4 py-3 text-[#64748B]">{ast.method} ({ast.useful_life} yrs)</td>
                  <td className="px-4 py-3 text-right font-mono text-[#0F172A]">₹{ast.cost.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#BE123C]">₹{ast.accumulated_dep.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#047857]">₹{ast.nbv.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
