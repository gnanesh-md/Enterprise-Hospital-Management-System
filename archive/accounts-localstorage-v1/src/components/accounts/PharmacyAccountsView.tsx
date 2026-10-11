import React, { useState } from "react"
import { Pill, Box, RefreshCcw, TrendingUp, AlertTriangle } from "lucide-react"

export default function PharmacyAccountsView() {
  const [stockValuation] = useState(950000)
  const [cogsYtd] = useState(1120000)
  const [salesRevenueYtd] = useState(1850000)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Pill className="text-[#1B4FD8]" size={20} />
            Pharmacy Accounts & Inventory Cost Accounting
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Medicine Sales Revenue, Inventory Stock Valuation, COGS & Goods Received Notes (GRN) Integration
          </p>
        </div>
      </div>

      {/* Pharmacy Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Pharmacy Inventory Stock Valuation</span>
          <div className="text-xl font-bold text-[#1B4FD8] mt-1">₹{stockValuation.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Account Code: [1410] Stock Inventory</div>
        </div>

        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Cost of Goods Sold (COGS YTD)</span>
          <div className="text-xl font-bold text-[#BE123C] mt-1">₹{cogsYtd.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Account Code: [5110] COGS Pharmacy</div>
        </div>

        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs hover:border-[#CBD5E1] transition-all">
          <span className="text-xs text-[#64748B] font-medium">Pharmacy Sales Revenue (YTD)</span>
          <div className="text-xl font-bold text-[#047857] mt-1">₹{salesRevenueYtd.toLocaleString("en-IN")}</div>
          <div className="text-[11px] text-[#64748B] mt-1">Account Code: [4310] Pharmacy Sales</div>
        </div>
      </div>

      {/* Inventory Accounting Rules Banner */}
      <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-3 shadow-xs text-xs">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <Box size={18} className="text-[#1B4FD8]" />
          Synchronized Pharmacy Stock Valuation & GL Reconciliation
        </h3>
        <p className="text-[#334155]">
          The Accounts module shares stock quantity and batch valuation directly with <code className="font-mono text-[#1B4FD8] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">pharmacyDb.ts</code> and the Pharmacy Inventory Ledger. No duplicate stock quantities are created inside Accounts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="font-semibold text-[#047857]">1. Goods Received Note (GRN) Capitalization</div>
            <div className="text-[#64748B] mt-1">Debit: [1410] Pharmacy Stock Inventory | Credit: [2110] Accounts Payable</div>
          </div>
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="font-semibold text-[#BE123C]">2. Medicine Dispensing & COGS Recognition</div>
            <div className="text-[#64748B] mt-1">Debit: [5110] Cost of Goods Sold | Credit: [1410] Pharmacy Stock Inventory</div>
          </div>
        </div>
      </div>
    </div>
  )
}
