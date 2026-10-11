import React, { useState, useEffect } from "react"
import { Search, Plus, CheckCircle2, XCircle, FileText, Layers } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"
import { ChartOfAccount, AccountCategory, AccountType } from "../../types/accounts"

export default function ChartOfAccountsView() {
  const [coa, setCoa] = useState<ChartOfAccount[]>(AccountsDatabase.getChartOfAccounts())
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [showAddModal, setShowAddModal] = useState(false)

  const [formCode, setFormCode] = useState("")
  const [formName, setFormName] = useState("")
  const [formCategory, setFormCategory] = useState<AccountCategory>("Asset")
  const [formType, setFormType] = useState<AccountType>("Asset")
  const [formDescription, setFormDescription] = useState("")

  const reloadCoa = () => {
    setCoa(AccountsDatabase.getChartOfAccounts())
  }

  useEffect(() => {
    reloadCoa()
    const handleUpdate = () => reloadCoa()
    window.addEventListener("hospai_accounts_updated", handleUpdate)
    return () => window.removeEventListener("hospai_accounts_updated", handleUpdate)
  }, [])

  const filtered = coa.filter(acc => {
    const q = search.toLowerCase()
    const matchesSearch = acc.account_code.toLowerCase().includes(q) || acc.account_name.toLowerCase().includes(q)
    const matchesCategory = categoryFilter === "ALL" || acc.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCode || !formName) return
    AccountsDatabase.upsertAccount({
      account_code: formCode.trim(),
      account_name: formName.trim(),
      category: formCategory,
      account_type: formType,
      normal_balance: ["Asset", "Expense"].includes(formCategory) ? "Debit" : "Credit",
      description: formDescription.trim(),
      is_header: false,
      is_active: true,
      is_control_account: true,
      current_balance: 0,
    })
    setShowAddModal(false)
    setFormCode("")
    setFormName("")
    setFormDescription("")
    reloadCoa()
  }

  return (
    <div className="space-y-5 text-[#0F172A]">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4.5 rounded-xl border border-[#DDE2EC] shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Layers className="text-[#1B4FD8]" size={20} />
            Chart of Accounts (COA) Directory
          </h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Standard 5-Category Hospital Chart of Accounts Hierarchy & Control Account Balances
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4FD8] hover:bg-[#1541B0] rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus size={16} />
          Add Account
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-xl border border-[#DDE2EC] shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-[#94A3B8]" size={16} />
          <input
            type="text"
            placeholder="Search by account code or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "Asset", "Liability", "Equity", "Income", "Expense"].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                categoryFilter === cat
                  ? "bg-[#1B4FD8] text-white shadow-xs"
                  : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* COA Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Account Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Normal Balance</th>
                <th className="px-4 py-3 text-right">Current Balance</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map(acc => (
                <tr key={acc.account_code} className={`hover:bg-[#F8FAFC] transition ${acc.is_header ? "bg-[#F1F5F9]/60 font-bold" : ""}`}>
                  <td className="px-4 py-3 font-mono text-[#1B4FD8] font-semibold">{acc.account_code}</td>
                  <td className="px-4 py-3">
                    <span className={acc.is_header ? "text-[#0F172A] uppercase tracking-wider font-extrabold" : "text-[#0F172A] font-medium"}>
                      {acc.account_name}
                    </span>
                    {acc.description && <p className="text-[11px] text-[#64748B] mt-0.5">{acc.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.category === "Asset"
                          ? "bg-[#EFF6FF] text-[#1B4FD8] border border-[#BFDBFE]"
                          : acc.category === "Liability"
                          ? "bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]"
                          : acc.category === "Equity"
                          ? "bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]"
                          : acc.category === "Income"
                          ? "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]"
                          : "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                      }`}
                    >
                      {acc.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#64748B] font-medium">{acc.account_type}</td>
                  <td className="px-4 py-3 text-[#64748B] font-medium">{acc.normal_balance}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#0F172A]">
                    {acc.is_header ? "-" : `₹${acc.current_balance.toLocaleString("en-IN")}`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {acc.is_active ? (
                      <CheckCircle2 size={16} className="text-[#047857] inline" />
                    ) : (
                      <XCircle size={16} className="text-[#94A3B8] inline" />
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                    No accounts found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl text-[#0F172A]">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A]">Add New Account to COA</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#475569] font-semibold mb-1">Account Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1540"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8] font-mono"
                />
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICU Equipment Reserve"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#475569] font-semibold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as AccountCategory)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#475569] font-semibold mb-1">Type</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="AR">AR</option>
                    <option value="AP">AP</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Tax">Tax</option>
                    <option value="Operating Revenue">Operating Revenue</option>
                    <option value="COGS">COGS</option>
                    <option value="Operating Expense">Operating Expense</option>
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#475569] font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Notes or operational scope..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#F1F5F9] text-[#334155] hover:bg-[#E2E8F0] rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1B4FD8] text-white hover:bg-[#1541B0] rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
