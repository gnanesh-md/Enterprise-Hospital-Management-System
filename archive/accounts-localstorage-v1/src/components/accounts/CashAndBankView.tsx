import React, { useState, useEffect } from "react"
import { Wallet, Landmark, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, RefreshCcw } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"
import { CashierHandover, ChartOfAccount } from "../../types/accounts"

export default function CashAndBankView() {
  const [handovers, setHandovers] = useState<CashierHandover[]>(AccountsDatabase.getCashierHandovers())
  const [coa, setCoa] = useState<ChartOfAccount[]>(AccountsDatabase.getChartOfAccounts())

  // Cashier Handover form
  const [cashierName, setCashierName] = useState("")
  const [counterName, setCounterName] = useState("OPD Counter 1")
  const [actualCash, setActualCash] = useState<number>(0)
  const [systemCollections, setSystemCollections] = useState<number>(34500)

  const reloadData = () => {
    setHandovers(AccountsDatabase.getCashierHandovers())
    setCoa(AccountsDatabase.getChartOfAccounts())
  }

  useEffect(() => {
    reloadData()
    const handleUpdate = () => reloadData()
    window.addEventListener("hospai_accounts_updated", handleUpdate)
    return () => window.removeEventListener("hospai_accounts_updated", handleUpdate)
  }, [])

  const handleHandoverSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cashierName) return
    AccountsDatabase.recordCashierHandover({
      handover_date: new Date().toISOString().split("T")[0],
      cashier_name: cashierName.trim(),
      counter_name: counterName,
      opening_cash: 5000,
      system_collections: systemCollections,
      actual_cash_counted: actualCash,
    })
    setCashierName("")
    setActualCash(0)
    reloadData()
  }

  const bankAccounts = coa.filter(a => a.account_type === "Bank")
  const cashAccounts = coa.filter(a => a.account_type === "Cash")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Landmark className="text-[#1B4FD8]" size={20} />
            Cash & Bank Management & Cashier Handover
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Billing Counter Cash Closing, Variance Audits & Bank Reconciliation
          </p>
        </div>
      </div>

      {/* Account Balances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cash Vaults */}
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-3 shadow-xs">
          <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
            <Wallet size={16} className="text-[#047857]" />
            Hospital Cash Accounts & Billing Counters
          </h3>
          <div className="space-y-2 text-xs">
            {cashAccounts.map(a => (
              <div key={a.account_code} className="flex justify-between items-center p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div>
                  <span className="font-mono text-[#64748B] mr-2">[{a.account_code}]</span>
                  <span className="text-[#0F172A] font-medium">{a.account_name}</span>
                </div>
                <span className="font-mono font-bold text-[#047857]">₹{a.current_balance.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Accounts */}
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-3 shadow-xs">
          <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
            <Landmark size={16} className="text-[#1B4FD8]" />
            Bank Accounts & Clearings
          </h3>
          <div className="space-y-2 text-xs">
            {bankAccounts.map(a => (
              <div key={a.account_code} className="flex justify-between items-center p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <div>
                  <span className="font-mono text-[#64748B] mr-2">[{a.account_code}]</span>
                  <span className="text-[#0F172A] font-medium">{a.account_name}</span>
                </div>
                <span className="font-mono font-bold text-[#1B4FD8]">₹{a.current_balance.toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cashier Handover Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Record Handover Form */}
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#1B4FD8]" />
            Cashier Shift End Handover
          </h3>
          <form onSubmit={handleHandoverSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-[#334155] font-medium mb-1">Cashier Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh V"
                value={cashierName}
                onChange={e => setCashierName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-medium mb-1">Counter Location</label>
              <select
                value={counterName}
                onChange={e => setCounterName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
              >
                <option value="OPD Counter 1">OPD Counter 1</option>
                <option value="IPD Billing Desk">IPD Billing Desk</option>
                <option value="Emergency Cash Desk">Emergency Cash Desk</option>
                <option value="Pharmacy Cashier">Pharmacy Cashier</option>
              </select>
            </div>

            <div>
              <label className="block text-[#334155] font-medium mb-1">System Collections (Recorded)</label>
              <input
                type="number"
                readOnly
                value={systemCollections}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#64748B] font-mono"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-medium mb-1">Actual Physical Cash Counted (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={actualCash || ""}
                onChange={e => setActualCash(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] font-mono focus:outline-none focus:border-[#047857]"
              />
            </div>

            {/* Live Variance Calculation */}
            <div className={`p-2.5 rounded-lg text-xs flex justify-between items-center font-mono border ${
              actualCash - systemCollections === 0 
                ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]" 
                : "bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]"
            }`}>
              <span>Variance:</span>
              <span className="font-bold">₹{(actualCash - systemCollections).toLocaleString("en-IN")}</span>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#1B4FD8] hover:bg-[#1541B0] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Submit Shift Handover & Close Counter
            </button>
          </form>
        </div>

        {/* Handover Log Table */}
        <div className="lg:col-span-2 bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <CheckCircle2 size={18} className="text-[#047857]" />
            Cashier Shift Handover Audit Register
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0F172A]">
              <thead className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Cashier</th>
                  <th className="p-2.5">Counter</th>
                  <th className="p-2.5 text-right">System (₹)</th>
                  <th className="p-2.5 text-right">Counted (₹)</th>
                  <th className="p-2.5 text-right">Variance (₹)</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {handovers.map(h => (
                  <tr key={h.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-2.5 font-mono text-[#64748B]">{h.handover_date}</td>
                    <td className="p-2.5 font-medium text-[#0F172A]">{h.cashier_name}</td>
                    <td className="p-2.5 text-[#334155]">{h.counter_name}</td>
                    <td className="p-2.5 text-right font-mono text-[#334155]">₹{h.system_collections.toLocaleString("en-IN")}</td>
                    <td className="p-2.5 text-right font-mono text-[#047857]">₹{h.actual_cash_counted.toLocaleString("en-IN")}</td>
                    <td className={`p-2.5 text-right font-mono font-bold ${h.variance === 0 ? "text-[#047857]" : "text-[#BE123C]"}`}>
                      ₹{h.variance.toLocaleString("en-IN")}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        h.status === "Balanced" ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]" : "bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]"
                      }`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {handovers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-[#94A3B8]">
                      No shift handovers logged for today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
