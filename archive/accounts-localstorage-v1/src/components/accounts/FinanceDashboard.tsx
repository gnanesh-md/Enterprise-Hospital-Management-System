import React, { useState, useEffect } from "react"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  BarChart3,
  RefreshCw,
} from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"
import { AccountingPostingEngine } from "../../services/accountingPostingEngine"

export default function FinanceDashboard() {
  const [pnl, setPnl] = useState(AccountsDatabase.getProfitAndLoss())
  const [bs, setBs] = useState(AccountsDatabase.getBalanceSheet())
  const [arList, setArList] = useState(AccountsDatabase.getReceivables())
  const [apList, setApList] = useState(AccountsDatabase.getPayables())
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  const reloadData = () => {
    setPnl(AccountsDatabase.getProfitAndLoss())
    setBs(AccountsDatabase.getBalanceSheet())
    setArList(AccountsDatabase.getReceivables())
    setApList(AccountsDatabase.getPayables())
  }

  useEffect(() => {
    reloadData()
    const handleUpdate = () => reloadData()
    window.addEventListener("hospai_accounts_updated", handleUpdate)
    return () => window.removeEventListener("hospai_accounts_updated", handleUpdate)
  }, [])

  const handleSyncOperational = () => {
    const res = AccountingPostingEngine.syncAllOperationalEvents()
    setSyncStatus(`Synced ${res.processedCount} operational transactions into General Ledger.`)
    reloadData()
    setTimeout(() => setSyncStatus(null), 4000)
  }

  const totalPatientAR = arList.filter(r => r.payer_type === "Patient").reduce((sum, r) => sum + r.due_amount, 0)
  const totalInsuranceAR = arList.filter(r => r.payer_type === "Insurance").reduce((sum, r) => sum + r.due_amount, 0)
  const totalAP = apList.reduce((sum, p) => sum + p.due_amount, 0)

  // Cash and Bank Balances from COA
  const coa = AccountsDatabase.getChartOfAccounts()
  const cashTotal = coa.filter(a => a.account_type === "Cash").reduce((sum, a) => sum + a.current_balance, 0)
  const bankTotal = coa.filter(a => a.account_type === "Bank").reduce((sum, a) => sum + a.current_balance, 0)

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-[#DDE2EC] p-4.5 rounded-xl shadow-xs gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="text-[#1B4FD8]" size={20} />
            Financial Command & General Ledger Overview
          </h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Real-Time Double-Entry Ledger, AR/AP Sub-ledgers, Cash & Bank Balances
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus && (
            <span className="text-[12px] font-medium text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 size={14} />
              {syncStatus}
            </span>
          )}
          <button
            onClick={handleSyncOperational}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4FD8] hover:bg-[#1541B0] rounded-lg shadow-xs transition cursor-pointer"
          >
            <RefreshCw size={14} />
            Sync Operational Events
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#DDE2EC] hover:border-[#CBD5E1] p-4.5 rounded-xl shadow-xs transition-all space-y-2">
          <div className="flex justify-between items-center text-[#64748B] text-xs font-medium">
            <span>Total Revenue (YTD)</span>
            <div className="p-2 bg-[#ECFDF5] text-[#047857] rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">₹{pnl.total_revenue.toLocaleString("en-IN")}</div>
          <div className="text-xs text-[#047857] font-medium flex items-center gap-1">
            <ArrowUpRight size={14} />
            <span>Operational income verified</span>
          </div>
        </div>

        <div className="bg-white border border-[#DDE2EC] hover:border-[#CBD5E1] p-4.5 rounded-xl shadow-xs transition-all space-y-2">
          <div className="flex justify-between items-center text-[#64748B] text-xs font-medium">
            <span>Operating Expenses (YTD)</span>
            <div className="p-2 bg-[#FFF1F2] text-[#BE123C] rounded-lg">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">₹{pnl.total_expenses.toLocaleString("en-IN")}</div>
          <div className="text-xs text-[#BE123C] font-medium flex items-center gap-1">
            <ArrowDownRight size={14} />
            <span>Clinical & Overhead costs</span>
          </div>
        </div>

        <div className="bg-white border border-[#DDE2EC] hover:border-[#CBD5E1] p-4.5 rounded-xl shadow-xs transition-all space-y-2">
          <div className="flex justify-between items-center text-[#64748B] text-xs font-medium">
            <span>Net Operating Profit</span>
            <div className={`p-2 rounded-lg ${pnl.net_profit >= 0 ? "bg-[#EFF6FF] text-[#1B4FD8]" : "bg-[#FFF1F2] text-[#BE123C]"}`}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className={`text-2xl font-extrabold ${pnl.net_profit >= 0 ? "text-[#047857]" : "text-[#BE123C]"}`}>
            ₹{pnl.net_profit.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-[#64748B] font-medium">
            P&L Margin: {pnl.total_revenue > 0 ? ((pnl.net_profit / pnl.total_revenue) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="bg-white border border-[#DDE2EC] hover:border-[#CBD5E1] p-4.5 rounded-xl shadow-xs transition-all space-y-2">
          <div className="flex justify-between items-center text-[#64748B] text-xs font-medium">
            <span>Cash & Bank Balances</span>
            <div className="p-2 bg-[#EEF2FF] text-[#4F46E5] rounded-lg">
              <Wallet size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">₹{(cashTotal + bankTotal).toLocaleString("en-IN")}</div>
          <div className="text-xs text-[#64748B] font-medium">
            Cash: ₹{cashTotal.toLocaleString("en-IN")} | Bank: ₹{bankTotal.toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {/* Receivables & Payables Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#DDE2EC] p-4.5 rounded-xl shadow-xs space-y-2.5">
          <h3 className="text-xs font-bold text-[#B45309] uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={16} className="text-[#B45309]" />
            Patient Receivables (AR)
          </h3>
          <div className="text-2xl font-extrabold text-[#B45309]">₹{totalPatientAR.toLocaleString("en-IN")}</div>
          <p className="text-xs text-[#64748B]">Self-pay patient balances outstanding</p>
        </div>

        <div className="bg-white border border-[#DDE2EC] p-4.5 rounded-xl shadow-xs space-y-2.5">
          <h3 className="text-xs font-bold text-[#1B4FD8] uppercase tracking-wider flex items-center gap-2">
            <Building2 size={16} className="text-[#1B4FD8]" />
            Insurance & TPA Receivables
          </h3>
          <div className="text-2xl font-extrabold text-[#1B4FD8]">₹{totalInsuranceAR.toLocaleString("en-IN")}</div>
          <p className="text-xs text-[#64748B]">Submitted claim pre-auth & settlement dues</p>
        </div>

        <div className="bg-white border border-[#DDE2EC] p-4.5 rounded-xl shadow-xs space-y-2.5">
          <h3 className="text-xs font-bold text-[#BE123C] uppercase tracking-wider flex items-center gap-2">
            <Lock size={16} className="text-[#BE123C]" />
            Supplier Payables (AP)
          </h3>
          <div className="text-2xl font-extrabold text-[#BE123C]">₹{totalAP.toLocaleString("en-IN")}</div>
          <p className="text-xs text-[#64748B]">Pharmacy & Lab supplier trade invoices</p>
        </div>
      </div>

      {/* Detailed Revenue & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Accounts */}
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <BarChart3 size={18} className="text-[#047857]" />
            Revenue Breakdown by Category
          </h3>
          <div className="space-y-2.5">
            {pnl.revenue.map(r => (
              <div key={r.code} className="flex justify-between items-center p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs">
                <div>
                  <span className="font-mono text-[#64748B] font-semibold mr-2">[{r.code}]</span>
                  <span className="text-[#0F172A] font-medium">{r.name}</span>
                </div>
                <span className="font-bold text-[#047857]">₹{r.amount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Accounts */}
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <PieIcon size={18} className="text-[#BE123C]" />
            Expense Breakdown by Category
          </h3>
          <div className="space-y-2.5">
            {pnl.expenses.map(e => (
              <div key={e.code} className="flex justify-between items-center p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs">
                <div>
                  <span className="font-mono text-[#64748B] font-semibold mr-2">[{e.code}]</span>
                  <span className="text-[#0F172A] font-medium">{e.name}</span>
                </div>
                <span className="font-bold text-[#BE123C]">₹{e.amount.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
