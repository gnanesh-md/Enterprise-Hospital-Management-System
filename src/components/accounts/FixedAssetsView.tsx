import React, { useState } from "react"
import { ShieldCheck, Plus, RefreshCw, Calculator, Layers } from "lucide-react"

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

    setAssets(updated)
    setDepMsg(`Monthly depreciation of ₹${totalDep.toLocaleString("en-IN")} calculated and recorded.`)
    setShowDepModal(false)
    setTimeout(() => setDepMsg(null), 4000)
  }

  const totalCost = assets.reduce((s, a) => s + a.cost, 0)
  const totalAccDep = assets.reduce((s, a) => s + a.accumulated_dep, 0)
  const totalNbv = assets.reduce((s, a) => s + a.nbv, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Calculator className="text-[#1B4FD8]" size={20} />
            Fixed Assets Register & Depreciation Schedule
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Asset Capitalization, Useful Life Tracking & Monthly Depreciation (SLM / WDV)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDepModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1B4FD8] text-white rounded-lg text-xs font-semibold hover:bg-[#1640B2] transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} />
            Run Monthly Depreciation
          </button>
        </div>
      </div>

      {depMsg && (
        <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs font-semibold text-[#047857]">
          {depMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Gross Fixed Asset Cost</span>
          <div className="text-xl font-bold text-[#0F172A] mt-1">₹{totalCost.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Total Capitalized Assets</div>
        </div>

        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Accumulated Depreciation</span>
          <div className="text-xl font-bold text-[#BE123C] mt-1">₹{totalAccDep.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Contra-Asset Balance</div>
        </div>

        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs">
          <span className="text-xs text-[#64748B] font-medium">Net Book Value (NBV)</span>
          <div className="text-xl font-bold text-[#047857] mt-1">₹{totalNbv.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Carrying Value on Balance Sheet</div>
        </div>
      </div>

      {/* Asset Register Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-[#1B4FD8]" />
            Capitalized Asset Inventory
          </h3>
          <span className="text-[11px] text-[#64748B]">{assets.length} Registered Assets</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0]">
            <tr>
              <th className="py-2.5 px-4">Asset Code</th>
              <th className="py-2.5 px-4">Description</th>
              <th className="py-2.5 px-4">Category</th>
              <th className="py-2.5 px-4">Method</th>
              <th className="py-2.5 px-4 text-right">Cost (₹)</th>
              <th className="py-2.5 px-4 text-right">Accumulated Dep. (₹)</th>
              <th className="py-2.5 px-4 text-right">Net Book Value (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
            {assets.map(a => (
              <tr key={a.id} className="hover:bg-[#F8FAFC]">
                <td className="py-2.5 px-4 font-mono font-bold text-[#1B4FD8]">{a.code}</td>
                <td className="py-2.5 px-4 font-semibold text-[#0F172A]">{a.name}</td>
                <td className="py-2.5 px-4">{a.category}</td>
                <td className="py-2.5 px-4 text-gray-600">{a.method} ({a.useful_life} yrs)</td>
                <td className="py-2.5 px-4 text-right font-mono font-medium">₹{a.cost.toLocaleString("en-IN")}</td>
                <td className="py-2.5 px-4 text-right font-mono font-medium text-[#BE123C]">₹{a.accumulated_dep.toLocaleString("en-IN")}</td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-[#047857]">₹{a.nbv.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Depreciation Confirmation Modal */}
      {showDepModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#CBD5E1]">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <RefreshCw className="text-[#1B4FD8]" size={18} />
              Execute Monthly Depreciation Run
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              This action will calculate straight-line and reducing-balance depreciation across all 5 registered assets and update the accumulated depreciation balances.
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
              <button
                onClick={() => setShowDepModal(false)}
                className="px-4 py-2 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRunDepreciation}
                className="px-4 py-2 bg-[#1B4FD8] text-white rounded-lg text-xs font-semibold hover:bg-[#1640B2] cursor-pointer"
              >
                Confirm & Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
