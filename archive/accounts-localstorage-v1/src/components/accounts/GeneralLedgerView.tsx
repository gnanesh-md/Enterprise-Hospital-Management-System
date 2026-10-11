import React, { useState, useEffect } from "react"
import { BookOpen, Plus, RefreshCw, AlertCircle, CheckCircle2, RotateCcw, Eye, Search } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"
import { JournalEntry, ChartOfAccount } from "../../types/accounts"

export default function GeneralLedgerView() {
  const [journals, setJournals] = useState<JournalEntry[]>(AccountsDatabase.getJournals())
  const [coa, setCoa] = useState<ChartOfAccount[]>(AccountsDatabase.getChartOfAccounts())
  const [search, setSearch] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null)
  const [reversalReason, setReversalReason] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Guided Form State
  const [description, setDescription] = useState("")
  const [lines, setLines] = useState<{ account_code: string; debit: number; credit: number; narration: string }[]>([
    { account_code: "1120", debit: 1000, credit: 0, narration: "" },
    { account_code: "4110", debit: 0, credit: 1000, narration: "" },
  ])

  const reloadData = () => {
    setJournals(AccountsDatabase.getJournals())
    setCoa(AccountsDatabase.getChartOfAccounts())
  }

  useEffect(() => {
    reloadData()
    const handleUpdate = () => reloadData()
    window.addEventListener("hospai_accounts_updated", handleUpdate)
    return () => window.removeEventListener("hospai_accounts_updated", handleUpdate)
  }, [])

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  const handleAddLine = () => {
    setLines([...lines, { account_code: coa[0]?.account_code || "1120", debit: 0, credit: 0, narration: "" }])
  }

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return
    setLines(lines.filter((_, i) => i !== idx))
  }

  const handlePostJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!description.trim()) {
      setErrorMsg("Description is required.")
      return
    }
    if (!isBalanced) {
      setErrorMsg("Journal entry must be balanced! Total Debits must equal Total Credits.")
      return
    }

    try {
      AccountsDatabase.postJournal({
        transaction_type: "MANUAL_JOURNAL",
        source_module: "general_ledger",
        source_reference_id: `MAN-${Date.now()}`,
        description: description.trim(),
        lines,
        created_by: "Accountant User",
      })
      setShowAddModal(false)
      setDescription("")
      setLines([
        { account_code: "1120", debit: 1000, credit: 0, narration: "" },
        { account_code: "4110", debit: 0, credit: 1000, narration: "" },
      ])
      reloadData()
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to post journal entry.")
    }
  }

  const handleReversal = (jId: string) => {
    if (!reversalReason.trim()) return
    try {
      AccountsDatabase.reverseJournal(jId, reversalReason.trim(), "Finance Approver")
      setSelectedJournal(null)
      setReversalReason("")
      reloadData()
    } catch (err: any) {
      alert(err.message || "Reversal failed.")
    }
  }

  const filtered = journals.filter(j => {
    const q = search.toLowerCase()
    return j.journal_number.toLowerCase().includes(q) || j.description.toLowerCase().includes(q) || j.source_module.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5 text-[#0F172A]">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4.5 rounded-xl border border-[#DDE2EC] shadow-xs">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="text-[#1B4FD8]" size={20} />
            General Ledger & Journal Register
          </h2>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            Immutable Double-Entry Accounting Records & Controlled Reversal Audit Trail
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null)
            setShowAddModal(true)
          }}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#1B4FD8] hover:bg-[#1541B0] rounded-lg shadow-xs transition cursor-pointer"
        >
          <Plus size={16} />
          Create Manual Journal
        </button>
      </div>

      {/* Search & Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-[#94A3B8]" size={16} />
        <input
          type="text"
          placeholder="Search by journal number, description, or module..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1B4FD8]"
        />
      </div>

      {/* Journal Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Journal No</th>
                <th className="px-4 py-3">Effective Date</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit (₹)</th>
                <th className="px-4 py-3 text-right">Credit (₹)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map(j => (
                <tr key={j.id} className="hover:bg-[#F8FAFC] transition">
                  <td className="px-4 py-3 font-mono font-semibold text-[#1B4FD8]">{j.journal_number}</td>
                  <td className="px-4 py-3 text-[#64748B] font-medium">{j.effective_date}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]">
                      {j.source_module}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#0F172A] font-medium">{j.description}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#047857]">₹{j.total_debit.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#BE123C]">₹{j.total_credit.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        j.status === "Posted" ? "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]" : "bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]"
                      }`}
                    >
                      {j.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedJournal(j)}
                      className="p-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded-md transition cursor-pointer border border-[#CBD5E1]"
                      title="Inspect Journal Details"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">
                    No journal entries found in ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guided Create Manual Journal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 w-full max-w-2xl space-y-4 shadow-xl max-h-[90vh] overflow-y-auto text-[#0F172A]">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <Plus size={18} className="text-[#1B4FD8]" />
                Post Guided Double-Entry Journal
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">✕</button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] text-xs rounded-lg flex items-center gap-2 font-medium">
                <AlertCircle size={16} />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePostJournalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#475569] font-semibold mb-1">Journal Narration / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly ICU Equipment Maintenance Accrual"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8]"
                />
              </div>

              {/* Lines Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#0F172A]">Journal Lines (Debits & Credits)</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-[#1B4FD8] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>

                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-2">
                  {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select
                          value={line.account_code}
                          onChange={e => {
                            const newLines = [...lines]
                            newLines[idx].account_code = e.target.value
                            setLines(newLines)
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded text-[#0F172A] focus:ring-2 focus:ring-[#1B4FD8] font-mono text-xs font-semibold"
                        >
                          {coa.filter(a => !a.is_header).map(a => (
                            <option key={a.account_code} value={a.account_code}>
                              [{a.account_code}] {a.account_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Debit ₹"
                          value={line.debit || ""}
                          onChange={e => {
                            const newLines = [...lines]
                            newLines[idx].debit = parseFloat(e.target.value) || 0
                            if (parseFloat(e.target.value) > 0) newLines[idx].credit = 0
                            setLines(newLines)
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded text-right font-mono text-[#047857] font-bold focus:ring-2 focus:ring-[#047857] text-xs"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Credit ₹"
                          value={line.credit || ""}
                          onChange={e => {
                            const newLines = [...lines]
                            newLines[idx].credit = parseFloat(e.target.value) || 0
                            if (parseFloat(e.target.value) > 0) newLines[idx].debit = 0
                            setLines(newLines)
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded text-right font-mono text-[#BE123C] font-bold focus:ring-2 focus:ring-[#BE123C] text-xs"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-[#BE123C] hover:text-[#9F1239] font-bold cursor-pointer"
                          title="Delete line"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Double-Entry Balancing Verification Panel */}
              <div className={`p-3 rounded-lg border flex justify-between items-center ${isBalanced ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]" : "bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C]"}`}>
                <div className="flex items-center gap-2">
                  {isBalanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span className="font-bold">{isBalanced ? "Journal Entry is Balanced!" : "Imbalanced Journal Entry"}</span>
                </div>
                <div className="text-right font-mono text-xs">
                  <div>Debits: ₹{totalDebit.toLocaleString("en-IN")} | Credits: ₹{totalCredit.toLocaleString("en-IN")}</div>
                  {!isBalanced && <div className="text-[#BE123C] font-bold">Difference: ₹{Math.abs(totalDebit - totalCredit).toLocaleString("en-IN")}</div>}
                </div>
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
                  disabled={!isBalanced}
                  className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1541B0] text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  Post Journal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Journal Inspector & Reversal Modal */}
      {selectedJournal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-xl p-6 w-full max-w-xl space-y-4 shadow-xl text-[#0F172A]">
            <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                  <BookOpen size={18} className="text-[#1B4FD8]" />
                  Journal Inspector [{selectedJournal.journal_number}]
                </h3>
                <p className="text-[11px] text-[#64748B]">Source: {selectedJournal.source_module} | Date: {selectedJournal.effective_date}</p>
              </div>
              <button onClick={() => setSelectedJournal(null)} className="text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer">✕</button>
            </div>

            <div className="text-xs space-y-2 text-[#0F172A]">
              <p><span className="font-semibold text-[#64748B]">Description:</span> {selectedJournal.description}</p>
              <p><span className="font-semibold text-[#64748B]">Status:</span> <span className="text-[#047857] font-bold">{selectedJournal.status}</span></p>
              <p><span className="font-semibold text-[#64748B]">Posted By:</span> {selectedJournal.created_by}</p>
            </div>

            {/* Lines List */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left text-[#0F172A]">
                <thead className="bg-[#F8FAFC] text-[#475569] font-bold uppercase tracking-wider text-[11px] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="p-2">Code</th>
                    <th className="p-2">Account Name</th>
                    <th className="p-2 text-right">Debit (₹)</th>
                    <th className="p-2 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {selectedJournal.lines.map(l => (
                    <tr key={l.id}>
                      <td className="p-2 font-mono text-[#1B4FD8] font-semibold">{l.account_code}</td>
                      <td className="p-2 text-[#0F172A] font-medium">{l.account_name}</td>
                      <td className="p-2 text-right font-mono text-[#047857] font-bold">₹{l.debit.toLocaleString("en-IN")}</td>
                      <td className="p-2 text-right font-mono text-[#BE123C] font-bold">₹{l.credit.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Controlled Reversal Action */}
            {selectedJournal.status === "Posted" && (
              <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                <label className="block text-xs text-[#BE123C] font-bold">Controlled Journal Reversal</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter reason for reversal..."
                    value={reversalReason}
                    onChange={e => setReversalReason(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-[#CBD5E1] rounded text-xs text-[#0F172A] focus:ring-2 focus:ring-[#BE123C]"
                  />
                  <button
                    onClick={() => handleReversal(selectedJournal.id)}
                    className="px-3.5 py-1.5 bg-[#BE123C] hover:bg-[#9F1239] text-white font-semibold rounded text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    Reverse Journal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
