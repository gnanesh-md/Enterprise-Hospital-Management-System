import React, { useState } from "react"
import { ShieldCheck, FileCheck2, Percent, Building2, CheckCircle2 } from "lucide-react"

export default function TaxManagementView() {
  const [gstin, setGstin] = useState("36AAAAA0000A1Z5")
  const [legalName, setLegalName] = useState("HospAI Healthcare Enterprise Pvt Ltd")
  const [placeOfSupply, setPlaceOfSupply] = useState("Telangana (36)")
  const [cgstRate, setCgstRate] = useState(2.5)
  const [sgstRate, setSgstRate] = useState(2.5)
  const [igstRate, setIgstRate] = useState(5.0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Percent className="text-[#047857]" size={20} />
            Indian GST & Tax Framework Configuration
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Configurable CGST, SGST, IGST Rules, Place of Supply & Eligible Input Tax Credit (ITC)
          </p>
        </div>
        <span className="px-3 py-1 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-xs font-semibold rounded-lg flex items-center gap-1.5">
          <CheckCircle2 size={14} />
          GST Engine Active
        </span>
      </div>

      {/* Tax Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hospital Entity Tax Registration */}
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <Building2 size={16} className="text-[#1B4FD8]" />
            Hospital Entity Tax Registration
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                className="w-full text-xs font-mono font-semibold px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Legal Business Name</label>
              <input
                type="text"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">Default Place of Supply</label>
              <input
                type="text"
                value={placeOfSupply}
                onChange={e => setPlaceOfSupply(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>
          </div>
        </div>

        {/* GST Tax Slabs & Rate Rules */}
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <Percent size={16} className="text-[#047857]" />
            Intra-State & Inter-State GST Rates
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">CGST Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={cgstRate}
                  onChange={e => setCgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">SGST Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sgstRate}
                  onChange={e => setSgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">IGST Rate (%) (Inter-State)</label>
              <input
                type="number"
                step="0.1"
                value={igstRate}
                onChange={e => setIgstRate(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-semibold px-3 py-2 border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs space-y-1">
              <div className="flex justify-between font-semibold text-[#334155]">
                <span>Intra-State GST:</span>
                <span className="text-[#047857]">{(cgstRate + sgstRate).toFixed(1)}% (CGST + SGST)</span>
              </div>
              <div className="flex justify-between font-semibold text-[#334155]">
                <span>Inter-State GST:</span>
                <span className="text-[#1B4FD8]">{igstRate.toFixed(1)}% (IGST)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Accounts Mapping Table */}
      <div className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#F1F5F9] bg-[#FAFAFA] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
            <FileCheck2 size={16} className="text-[#047857]" />
            General Ledger Tax Account Mappings
          </h3>
          <span className="text-[11px] text-[#64748B]">Auto-linked with Chart of Accounts</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0]">
            <tr>
              <th className="py-2.5 px-4">Tax Head</th>
              <th className="py-2.5 px-4">Account Code</th>
              <th className="py-2.5 px-4">Account Name</th>
              <th className="py-2.5 px-4">Type</th>
              <th className="py-2.5 px-4">Normal Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="py-2.5 px-4 font-semibold text-[#0F172A]">CGST Output Liability</td>
              <td className="py-2.5 px-4 font-mono font-bold text-[#1B4FD8]">2211</td>
              <td className="py-2.5 px-4">Output CGST Payable</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-semibold text-[10px]">Liability</span></td>
              <td className="py-2.5 px-4 font-semibold text-[#B42318]">Credit</td>
            </tr>
            <tr className="hover:bg-[#F8FAFC]">
              <td className="py-2.5 px-4 font-semibold text-[#0F172A]">SGST Output Liability</td>
              <td className="py-2.5 px-4 font-mono font-bold text-[#1B4FD8]">2212</td>
              <td className="py-2.5 px-4">Output SGST Payable</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-semibold text-[10px]">Liability</span></td>
              <td className="py-2.5 px-4 font-semibold text-[#B42318]">Credit</td>
            </tr>
            <tr className="hover:bg-[#F8FAFC]">
              <td className="py-2.5 px-4 font-semibold text-[#0F172A]">IGST Output Liability</td>
              <td className="py-2.5 px-4 font-mono font-bold text-[#1B4FD8]">2213</td>
              <td className="py-2.5 px-4">Output IGST Payable</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-semibold text-[10px]">Liability</span></td>
              <td className="py-2.5 px-4 font-semibold text-[#B42318]">Credit</td>
            </tr>
            <tr className="hover:bg-[#F8FAFC]">
              <td className="py-2.5 px-4 font-semibold text-[#0F172A]">Eligible Input Tax Credit (ITC)</td>
              <td className="py-2.5 px-4 font-mono font-bold text-[#1B4FD8]">1420</td>
              <td className="py-2.5 px-4">Input GST Credit Receivable</td>
              <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1B4FD8] font-semibold text-[10px]">Asset</span></td>
              <td className="py-2.5 px-4 font-semibold text-[#047857]">Debit</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
