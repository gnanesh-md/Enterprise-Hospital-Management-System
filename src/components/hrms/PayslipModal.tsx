import React from "react"
import { StaffMember } from "../../services/hrmsDb"
import { X, Printer, Download, CheckCircle, ShieldCheck } from "lucide-react"

interface PayslipModalProps {
  staff: StaffMember | null
  month?: string
  year?: number
  isOpen: boolean
  onClose: () => void
}

export default function PayslipModal({
  staff,
  month = "September",
  year = 2026,
  isOpen,
  onClose,
}: PayslipModalProps) {
  if (!isOpen || !staff) return null

  const gross = staff.salary.basic + staff.salary.hra + staff.salary.allowances
  const deductions = staff.salary.pf + staff.salary.tax
  const netPay = gross - deductions

  const handlePrint = () => {
    window.print()
  }

  // Convert number to Indian currency words
  const numberToWords = (num: number): string => {
    const a = [
      "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
      "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
    ]
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    const inWords = (n: number): string => {
      let str = ""
      if (n > 9999999) {
        str += inWords(Math.floor(n / 10000000)) + "Crore "
        n %= 10000000
      }
      if (n > 99999) {
        str += inWords(Math.floor(n / 100000)) + "Lakh "
        n %= 100000
      }
      if (n > 999) {
        str += inWords(Math.floor(n / 1000)) + "Thousand "
        n %= 1000
      }
      if (n > 99) {
        str += inWords(Math.floor(n / 100)) + "Hundred "
        n %= 100
      }
      if (n > 0) {
        if (str !== "") str += "and "
        if (n < 20) str += a[n]
        else {
          str += b[Math.floor(n / 10)]
          if (n % 10 > 0) str += " " + a[n % 10]
          else str += " "
        }
      }
      return str
    }

    const res = inWords(num).trim()
    return res ? `Rupees ${res} Only` : "Rupees Zero Only"
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden on print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Official Payslip Preview</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-300 font-mono">{staff.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Payslip
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="flex-1 overflow-y-auto p-8 text-slate-900 font-sans print:p-0">
          {/* Hospital Header */}
          <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center text-xl font-black">
                IH
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-blue-950 uppercase">
                  Imperial Hospitals & Research Institute
                </h1>
                <p className="text-xs text-slate-600">
                  Accredited by NABH & JCI • Plot 42, Health City, Jubilee Hills, Hyderabad - 500033
                </p>
                <p className="text-[11px] text-slate-500">Phone: +91 40 6828 9999 | Email: payroll@imperialhospitals.org</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold uppercase text-slate-600 tracking-wider">Salary Voucher</div>
              <div className="text-sm font-black text-blue-900 mt-0.5">
                {month.toUpperCase()} {year}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                PAY-REF: {year}-{month.slice(0, 3).toUpperCase()}-{staff.id}
              </div>
            </div>
          </div>

          {/* Employee Details Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Employee Name:</span>
              <span className="font-bold text-slate-900">{staff.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Employee ID:</span>
              <span className="font-mono font-bold text-slate-900">{staff.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Department:</span>
              <span className="font-semibold text-slate-900">{staff.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Designation:</span>
              <span className="font-semibold text-slate-900">{staff.designation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Bank Name:</span>
              <span className="font-semibold text-slate-900">{staff.bankDetails.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Bank Account No:</span>
              <span className="font-mono font-semibold text-slate-900">{staff.bankDetails.accountNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">IFSC Code:</span>
              <span className="font-mono font-semibold text-slate-900">{staff.bankDetails.ifsc}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">PAN Number:</span>
              <span className="font-mono font-semibold text-slate-900">{staff.bankDetails.pan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Joining Date:</span>
              <span className="font-semibold text-slate-900">{staff.joiningDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Working / Paid Days:</span>
              <span className="font-bold text-emerald-700">30 / 30 Days</span>
            </div>
          </div>

          {/* Dual Table: Earnings & Deductions */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Earnings */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-xs text-slate-800 flex justify-between">
                <span>EARNINGS</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-700">Basic Salary</span>
                  <span className="font-semibold font-mono">₹{staff.salary.basic.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">House Rent Allowance (HRA)</span>
                  <span className="font-semibold font-mono">₹{staff.salary.hra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Special & Medical Allowance</span>
                  <span className="font-semibold font-mono">₹{staff.salary.allowances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Night Shift / OT Allowance</span>
                  <span className="font-mono">₹0</span>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-300 font-bold text-xs flex justify-between text-slate-900">
                <span>TOTAL GROSS (A)</span>
                <span className="font-mono text-emerald-700">₹{gross.toLocaleString()}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-bold text-xs text-slate-800 flex justify-between">
                <span>DEDUCTIONS</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div className="p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-700">Employee Provident Fund (EPF)</span>
                  <span className="font-semibold font-mono text-rose-600">₹{staff.salary.pf.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Tax Deducted at Source (TDS)</span>
                  <span className="font-semibold font-mono text-rose-600">₹{staff.salary.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Professional Tax (PT)</span>
                  <span className="font-semibold font-mono text-rose-600">₹200</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Other Penalties / LOP</span>
                  <span className="font-mono">₹0</span>
                </div>
              </div>
              <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-300 font-bold text-xs flex justify-between text-slate-900">
                <span>TOTAL DEDUCTIONS (B)</span>
                <span className="font-mono text-rose-700">₹{(deductions + 200).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Callout */}
          <div className="bg-blue-50 border-2 border-blue-900/30 rounded-xl p-4 flex items-center justify-between mb-6">
            <div>
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                NET SALARY PAYABLE (A - B)
              </div>
              <div className="text-xs text-blue-800 mt-1 font-medium italic">
                {numberToWords(netPay - 200)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-blue-950 font-mono">
                ₹{(netPay - 200).toLocaleString()}
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 justify-end mt-0.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Disbursed via Electronic Direct NEFT
              </div>
            </div>
          </div>

          {/* Signatures & Seal */}
          <div className="pt-8 mt-4 border-t border-slate-300 flex justify-between items-end text-xs text-slate-600">
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-slate-400">Auth Token: IH-HR-2026-SYSVERIFIED</div>
              <p className="text-[11px] italic">
                Note: This is a system-generated electronic payslip and does not require a physical signature.
              </p>
            </div>

            <div className="text-center">
              <div className="w-40 border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-800">
                Dr. R. K. Shrivastava
              </div>
              <div className="text-[11px] text-slate-500">Director of Human Resources</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
