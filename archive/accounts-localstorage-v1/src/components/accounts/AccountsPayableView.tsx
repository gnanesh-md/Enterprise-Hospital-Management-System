import React, { useState, useEffect } from "react"
import { Building, Search, Plus, DollarSign, CheckCircle2, Clock } from "lucide-react"
import { AccountsDatabase } from "../../services/accountsDb"
import { PayableItem } from "../../types/accounts"

export default function AccountsPayableView() {
  const [apList, setApList] = useState<PayableItem[]>(AccountsDatabase.getPayables())
  const [search, setSearch] = useState("")
  const [selectedItem, setSelectedItem] = useState<PayableItem | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [showAddModal, setShowAddModal] = useState(false)

  const [supplierName, setSupplierName] = useState("")
  const [invoiceNo, setInvoiceNo] = useState("")
  const [grnNo, setGrnNo] = useState("")
  const [totalAmount, setTotalAmount] = useState<number>(0)

  const reloadData = () => {
    setApList(AccountsDatabase.getPayables())
  }

  useEffect(() => {
    reloadData()
    const handleUpdate = () => reloadData()
    window.addEventListener("hospai_accounts_updated", handleUpdate)
    return () => window.removeEventListener("hospai_accounts_updated", handleUpdate)
  }, [])

  const filtered = apList.filter(item => {
    const q = search.toLowerCase()
    return item.supplier_invoice_no.toLowerCase().includes(q) || item.supplier_name.toLowerCase().includes(q)
  })

  const totalDue = apList.reduce((sum, p) => sum + p.due_amount, 0)

  const handleCreatePayable = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierName || !invoiceNo || totalAmount <= 0) return

    // Post Double-Entry Journal: Debit Inventory (1410), Credit AP (2110)
    AccountsDatabase.postJournal({
      transaction_type: "PHARMACY_GRN",
      source_module: "accounts_payable",
      source_reference_id: invoiceNo.trim(),
      description: `Trade Supplier Invoice ${invoiceNo.trim()} from ${supplierName.trim()}`,
      lines: [
        { account_code: "1410", debit: totalAmount, credit: 0, narration: `Inventory Capitalization GRN ${grnNo.trim()}` },
        { account_code: "2110", debit: 0, credit: totalAmount, narration: `Supplier Payable to ${supplierName.trim()}`, sub_ledger_name: supplierName.trim() },
      ],
    })

    AccountsDatabase.upsertPayable({
      supplier_invoice_no: invoiceNo.trim(),
      supplier_name: supplierName.trim(),
      grn_no: grnNo.trim() || undefined,
      total_amount: totalAmount,
      department: "Pharmacy",
    })

    setShowAddModal(false)
    setSupplierName("")
    setInvoiceNo("")
    setGrnNo("")
    setTotalAmount(0)
    reloadData()
  }

  const handlePaySupplier = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || paymentAmount <= 0) return
    try {
      // Debit AP (2110), Credit Bank (1210)
      AccountsDatabase.postJournal({
        transaction_type: "SUPPLIER_PAYMENT",
        source_module: "accounts_payable",
        source_reference_id: selectedItem.supplier_invoice_no,
        description: `Supplier Payment Voucher for ${selectedItem.supplier_name}`,
        lines: [
          { account_code: "2110", debit: paymentAmount, credit: 0, narration: `Disbursement against Invoice ${selectedItem.supplier_invoice_no}`, sub_ledger_name: selectedItem.supplier_name },
          { account_code: "1210", debit: 0, credit: paymentAmount, narration: `Bank Payment Voucher to ${selectedItem.supplier_name}` },
        ],
      })

      AccountsDatabase.upsertPayable({
        ...selectedItem,
        paid_amount: selectedItem.paid_amount + paymentAmount,
      })

      setSelectedItem(null)
      setPaymentAmount(0)
      reloadData()
    } catch (err: any) {
      alert(err.message || "Payment voucher failed.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Building className="text-[#BE123C]" size={20} />
            Accounts Payable (AP) & Supplier Invoices
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Trade Supplier Invoices, GRN Matching, Payment Vouchers & Payables Ageing
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs font-medium text-[#64748B]">Total Outstanding AP</span>
            <div className="text-xl font-bold text-[#BE123C]">₹{totalDue.toLocaleString("en-IN")}</div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1541B0] text-white font-semibold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} />
            Record Supplier Invoice
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-[#94A3B8]" size={16} />
        <input
          type="text"
          placeholder="Search by supplier invoice no or vendor name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B4FD8] focus:ring-1 focus:ring-[#1B4FD8]"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#475569] font-bold text-[11px] uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Supplier Invoice No</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">GRN / PO Reference</th>
                <th className="px-4 py-3">Invoice Date</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Total (₹)</th>
                <th className="px-4 py-3 text-right">Paid (₹)</th>
                <th className="px-4 py-3 text-right">Due (₹)</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-[#BE123C]">{item.supplier_invoice_no}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{item.supplier_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.grn_no || item.po_no || "GRN-MATCHED"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.invoice_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{item.due_date}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#0F172A]">₹{item.total_amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-mono text-[#047857]">₹{item.paid_amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-[#BE123C]">₹{item.due_amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-center">
                    {item.due_amount > 0 ? (
                      <button
                        onClick={() => {
                          setSelectedItem(item)
                          setPaymentAmount(item.due_amount)
                        }}
                        className="px-3 py-1 bg-[#BE123C] hover:bg-[#9F1239] text-white text-[11px] font-semibold rounded shadow-xs transition-colors"
                      >
                        Payment Voucher
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                        Settled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#94A3B8]">
                    No trade payables found in system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Supplier Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl text-[#0F172A]">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A]">Record Trade Supplier Invoice</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#64748B] hover:text-[#0F172A]">✕</button>
            </div>
            <form onSubmit={handleCreatePayable} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#334155] font-medium mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cipla Pharma Distributors Ltd"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div>
                <label className="block text-[#334155] font-medium mb-1">Supplier Invoice No</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-CIP-9921"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] font-mono focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div>
                <label className="block text-[#334155] font-medium mb-1">GRN Reference No (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. GRN-2026-0811"
                  value={grnNo}
                  onChange={e => setGrnNo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] font-mono focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div>
                <label className="block text-[#334155] font-medium mb-1">Total Invoice Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={totalAmount || ""}
                  onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] font-mono focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1541B0] text-white rounded-lg font-semibold shadow-xs"
                >
                  Post Payable & Capitalize Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Voucher Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl text-[#0F172A]">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-base font-bold text-[#0F172A]">Disburse Payment Voucher</h3>
              <button onClick={() => setSelectedItem(null)} className="text-[#64748B] hover:text-[#0F172A]">✕</button>
            </div>
            <form onSubmit={handlePaySupplier} className="space-y-3 text-xs">
              <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-1">
                <p className="text-[#334155]"><strong>Vendor:</strong> {selectedItem.supplier_name}</p>
                <p className="text-[#334155]"><strong>Invoice No:</strong> {selectedItem.supplier_invoice_no}</p>
                <p className="text-[#334155]"><strong>Outstanding Dues:</strong> ₹{selectedItem.due_amount.toLocaleString("en-IN")}</p>
              </div>

              <div>
                <label className="block text-[#334155] font-medium mb-1">Disbursement Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedItem.due_amount}
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] font-mono focus:outline-none focus:border-[#BE123C]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#BE123C] hover:bg-[#9F1239] text-white rounded-lg font-semibold shadow-xs"
                >
                  Disburse Bank Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
