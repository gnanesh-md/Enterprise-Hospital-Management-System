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
        <span className="px-3 py-1 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-xs font-semibold rounded-lg">
          GST Registered Entity
        </span>
      </div>

      {/* Setup Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <Building2 size={18} className="text-[#1B4FD8]" />
            Hospital GST Master Setup
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[#334155] font-medium mb-1">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] font-mono uppercase focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-medium mb-1">Legal Registered Entity Name</label>
              <input
                type="text"
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            <div>
              <label className="block text-[#334155] font-medium mb-1">Default Place of Supply</label>
              <input
                type="text"
                value={placeOfSupply}
                onChange={e => setPlaceOfSupply(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[#334155] font-medium mb-1">CGST (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={cgstRate}
                  onChange={e => setCgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-white border border-[#CBD5E1] rounded text-center text-[#0F172A] font-mono focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>
              <div>
                <label className="block text-[#334155] font-medium mb-1">SGST (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sgstRate}
                  onChange={e => setSgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-white border border-[#CBD5E1] rounded text-center text-[#0F172A] font-mono focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>
              <div>
                <label className="block text-[#334155] font-medium mb-1">IGST (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={igstRate}
                  onChange={e => setIgstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 bg-white border border-[#CBD5E1] rounded text-center text-[#0F172A] font-mono focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>
            </div>

            <button
              onClick={() => alert("GST Tax Parameters saved successfully.")}
              className="w-full py-2 bg-[#047857] hover:bg-[#065F46] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Save GST Configuration
            </button>
          </div>
        </div>

        {/* GST Liability & Input Credit Summary */}
        <div className="lg:col-span-2 bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
            <FileCheck2 size={18} className="text-[#047857]" />
            Current Tax Liabilities & Input Tax Credit (ITC) Summary
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
              <span className="text-[#64748B] font-semibold">Output Tax Liability (Collections)</span>
              <div className="text-xl font-bold text-[#BE123C]">₹91,000</div>
              <div className="text-[11px] text-[#64748B] space-y-1">
                <div className="flex justify-between"><span>Output CGST (2.5%):</span><span>₹38,000</span></div>
                <div className="flex justify-between"><span>Output SGST (2.5%):</span><span>₹38,000</span></div>
                <div className="flex justify-between"><span>Output IGST (5.0%):</span><span>₹15,000</span></div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-2">
              <span className="text-[#64748B] font-semibold">Eligible Input Tax Credit (Purchases)</span>
              <div className="text-xl font-bold text-[#047857]">₹102,000</div>
              <div className="text-[11px] text-[#64748B] space-y-1">
                <div className="flex justify-between"><span>Input CGST (Eligible):</span><span>₹45,000</span></div>
                <div className="flex justify-between"><span>Input SGST (Eligible):</span><span>₹45,000</span></div>
                <div className="flex justify-between"><span>Input IGST (Eligible):</span><span>₹12,000</span></div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1B4FD8] rounded-xl text-xs flex justify-between items-center">
            <div>
              <div className="font-bold">Net GST Settlement Position</div>
              <div className="text-[#64748B] text-[11px]">Input Tax Credit exceeds Output Liability (Net Carryforward Credit)</div>
            </div>
            <div className="text-lg font-bold text-[#047857] font-mono">₹11,000 (ITC Credit)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
