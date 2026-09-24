import { CheckCircle, Printer, RotateCcw } from "lucide-react"
import { PharmacyDatabase } from "../../../services/pharmacyDb"

export function numberToWords(num: number): string {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ]
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ]
  if ((num = Math.floor(num)) === 0) return "Zero"
  if (num < 0) return "Negative " + numberToWords(Math.abs(num))
  let str = ""
  if (num >= 10000000) {
    str += numberToWords(Math.floor(num / 10000000)) + " Crore "
    num %= 10000000
  }
  if (num >= 100000) {
    str += numberToWords(Math.floor(num / 100000)) + " Lakh "
    num %= 100000
  }
  if (num >= 1000) {
    str += numberToWords(Math.floor(num / 1000)) + " Thousand "
    num %= 1000
  }
  if (num >= 100) {
    str += numberToWords(Math.floor(num / 100)) + " Hundred "
    num %= 100
  }
  if (num > 0) {
    if (str !== "") str += "and "
    if (num < 20) str += a[num]
    else {
      str += b[Math.floor(num / 10)]
      if (num % 10 > 0) str += "-" + a[num % 10]
    }
  }
  return str.trim()
}

interface InvoicePrintModalProps {
  bill: any
  returnRecord?: any
  onClose: () => void
}

export default function InvoicePrintModal({
  bill,
  returnRecord,
  onClose,
}: InvoicePrintModalProps) {
  const printInvoice = () => window.print()

  if (!bill && !returnRecord) return null

  const effectiveBill = bill || {}
  const activeReturn = returnRecord || effectiveBill.returnRecord
  const isReturnBill = Boolean(
    activeReturn ||
      effectiveBill.isReturn ||
      effectiveBill.billNumber?.startsWith("MOD-"),
  )

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm print:absolute print:inset-0 print:p-0 print:bg-white">
      <style>{`
                @media print { 
                    body * { visibility: hidden; } 
                    #printable-invoice, #printable-invoice * { visibility: visible; } 
                    #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; } 
                    @page { size: landscape; margin: 10mm; }
                }
            `}</style>
      <div
        id="printable-invoice"
        className="bg-white rounded shadow-2xl w-full max-w-4xl max-h-full overflow-y-auto print:max-w-none print:shadow-none print:w-full print:m-0 print:overflow-visible relative"
      >
        <div className="p-6 print:p-0 border-b border-[#DDE2EC] flex justify-between items-center print:hidden bg-[#F5F7FA] sticky top-0 z-10">
          <h2 className="text-xl font-bold text-[#0F1624] flex items-center gap-2">
            {isReturnBill ? (
              <>
                <RotateCcw className="text-amber-600" />
                Modified Bill & Credit Note{" "}
                {activeReturn?.returnNumber
                  ? `(${activeReturn.returnNumber})`
                  : effectiveBill.billNumber}
              </>
            ) : (
              <>
                <CheckCircle className="text-green-600" />
                Invoice {effectiveBill.billNumber}
              </>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="bg-white border border-[#DDE2EC] hover:bg-gray-100 text-[#0F1624] px-4 py-2 text-sm font-semibold transition-colors rounded flex items-center gap-1.5 shadow-sm"
            >
              ← Back to Returns
            </button>
            <button
              onClick={printInvoice}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors rounded shadow-sm"
            >
              <Printer size={16} /> Print{" "}
              {isReturnBill ? "Modified Bill" : "Receipt"}
            </button>
          </div>
        </div>

        {/* Detailed A4 Print Layout */}
        <div className="p-8 print:p-0 font-sans text-sm print:text-[9px] text-black w-full max-w-5xl print:max-w-full mx-auto bg-white">
          <div className="flex justify-between border-b-2 border-black pb-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl print:text-lg font-bold tracking-wider mb-2">
                VH PHARMACY
              </h1>
              <p className="print:text-[9px]">
                27-1-7/3/1, Premises Of Imperial Hospital,
              </p>
              <p className="print:text-[9px]">
                J P Road, Bhimavaram, West Godavari,
              </p>
              <p className="print:text-[9px]">Andhra Pradesh-534202</p>
              <p className="font-bold print:text-[9px] mt-1">
                GST No : 37AASFV7563M1Z1
              </p>
              <h2 className="text-lg print:text-sm font-bold uppercase mt-2">
                {isReturnBill
                  ? "MEDICINE RETURN CREDIT NOTE / MODIFIED INVOICE"
                  : "Pharmacy Receipt — TAX INVOICE"}
              </h2>
            </div>
            <div className="flex-1">
              <table className="w-full text-left print:text-[9px] border-collapse">
                <tbody>
                  {isReturnBill ? (
                    <>
                      <tr>
                        <td className="py-0.5 font-semibold">
                          Original Bill No
                        </td>
                        <td>
                          :{" "}
                          <span className="font-bold">
                            {activeReturn?.originalBillNumber ||
                              effectiveBill.originalBillNumber ||
                              effectiveBill.billNumber}
                          </span>
                        </td>
                        <td className="font-semibold w-24">Return ID</td>
                        <td>
                          :{" "}
                          <span className="font-bold text-amber-700">
                            {activeReturn?.returnNumber || "RET-2026-0001"}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-semibold">
                          Modified Bill No
                        </td>
                        <td>
                          :{" "}
                          <span className="font-bold text-indigo-700">
                            {activeReturn?.modifiedBillNumber ||
                              effectiveBill.billNumber}
                          </span>
                        </td>
                        <td className="font-semibold w-24">Return Date</td>
                        <td>
                          :{" "}
                          {new Date(
                            activeReturn?.createdAt ||
                              effectiveBill.createdAt ||
                              Date.now(),
                          ).toLocaleDateString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-semibold">Patient Name</td>
                        <td>
                          :{" "}
                          {activeReturn?.patientName ||
                            effectiveBill.patientName ||
                            "Walk-in Patient"}
                        </td>
                        <td className="font-semibold w-24">UMR / UHID</td>
                        <td>
                          :{" "}
                          {activeReturn?.patientUhid ||
                            effectiveBill.uhid ||
                            "UMR10050"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-semibold">Doctor Name</td>
                        <td>
                          :{" "}
                          {activeReturn?.doctorName ||
                            effectiveBill.doctorName ||
                            "Self"}
                        </td>
                        <td className="font-semibold w-24">Reason</td>
                        <td>
                          : {activeReturn?.returnReason || "Patient Return"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-semibold">Status</td>
                        <td>
                          :{" "}
                          <span className="font-bold uppercase text-green-700">
                            {activeReturn?.status || "Completed"}
                          </span>
                        </td>
                        <td className="font-semibold w-24">D.L.No.</td>
                        <td>: AP/05/02/2017-13965</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="py-0.5 font-semibold">Bill No</td>
                        <td>: {effectiveBill.billNumber}</td>
                        <td className="font-semibold w-24">Bill Date</td>
                        <td>
                          :{" "}
                          {
                            new Date(
                              effectiveBill.createdAt || effectiveBill.date,
                            )
                              .toLocaleString()
                              .split(",")[0]
                          }
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-semibold">UMR No</td>
                        <td>: {effectiveBill.uhid || "UMR10050"}</td>
                        <td className="font-semibold w-24">Dt of Supply</td>
                        <td>
                          :{" "}
                          {new Date(
                            effectiveBill.createdAt || effectiveBill.date,
                          ).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-semibold">Patient Name</td>
                        <td colSpan={3}>
                          : {effectiveBill.patientName || "Walk-in Patient"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-semibold">Doctor Name</td>
                        <td colSpan={3}>
                          : {effectiveBill.doctorName || "Self"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5 font-semibold">RCM Invoice</td>
                        <td>: NO</td>
                        <td className="font-semibold w-24">D.L.No.</td>
                        <td>: AP/05/02/2017-13965</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Return Specific Items Table */}
          {isReturnBill && activeReturn?.items ? (
            <table
              className="w-full mb-4 print:text-[8px] table-fixed uppercase"
              style={{ borderCollapse: "collapse" }}
            >
              <thead className="border-y-2 border-black">
                <tr>
                  <th className="w-[26%] p-1 text-left font-semibold align-bottom">
                    ITEM DESCRIPTION
                  </th>
                  <th className="w-[12%] p-1 text-left font-semibold align-bottom">
                    BATCH NO
                  </th>
                  <th className="w-[9%] p-1 text-left font-semibold align-bottom">
                    EXP DT
                  </th>
                  <th className="w-[7%] p-1 text-right font-semibold align-bottom">
                    ORIG QTY
                  </th>
                  <th className="w-[7%] p-1 text-right font-semibold align-bottom text-amber-700">
                    RET QTY
                  </th>
                  <th className="w-[7%] p-1 text-right font-semibold align-bottom text-indigo-700">
                    FINAL QTY
                  </th>
                  <th className="w-[8%] p-1 text-right font-semibold align-bottom">
                    RATE (₹)
                  </th>
                  <th className="w-[12%] p-1 text-right font-semibold align-bottom text-amber-700">
                    REFUND (₹)
                  </th>
                  <th className="w-[12%] p-1 text-right font-semibold align-bottom">
                    FINAL (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeReturn.items.map((item: any, i: number) => {
                  const origQty = item.originalQuantity || 0
                  const retQty = item.returnQuantity || 0
                  const finQty =
                    item.finalQuantity !== undefined
                      ? item.finalQuantity
                      : origQty - retQty
                  const rate = item.unitPrice || 0
                  const refund =
                    item.refundAmount !== undefined
                      ? item.refundAmount
                      : retQty * rate
                  const finalAmt =
                    item.finalAmount !== undefined
                      ? item.finalAmount
                      : finQty * rate

                  return (
                    <tr key={i} className="align-top border-b border-gray-200">
                      <td className="p-1 text-left font-medium break-words">
                        {item.medicineName || "Medicine"}
                      </td>
                      <td className="p-1 text-left font-mono">
                        {item.batchNumber || "-"}
                      </td>
                      <td className="p-1 text-left">
                        {item.expiryDate || "2027-12"}
                      </td>
                      <td className="p-1 text-right">{origQty}</td>
                      <td className="p-1 text-right font-bold text-amber-700">
                        -{retQty}
                      </td>
                      <td className="p-1 text-right font-bold text-indigo-700">
                        {finQty}
                      </td>
                      <td className="p-1 text-right">{rate.toFixed(2)}</td>
                      <td className="p-1 text-right font-bold text-amber-700">
                        ₹{refund.toFixed(2)}
                      </td>
                      <td className="p-1 text-right font-semibold">
                        ₹{finalAmt.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-y-2 border-black font-bold text-[9px]">
                <tr>
                  <td
                    colSpan={6}
                    className="p-1 text-left font-bold text-[10px]"
                  >
                    TOTAL RETURN & MODIFIED SUMMARY
                  </td>
                  <td className="p-1 text-right font-normal">Original:</td>
                  <td className="p-1 text-right font-bold text-amber-700">
                    Refund: ₹{(activeReturn.refundAmount || 0).toFixed(2)}
                  </td>
                  <td className="p-1 text-right font-bold text-indigo-700">
                    Net: ₹
                    {(
                      activeReturn.modifiedTotalAmount ||
                      effectiveBill.totalAmount ||
                      0
                    ).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            /* Standard Sales Items Table */
            <table
              className="w-full mb-4 print:text-[8px] table-fixed uppercase"
              style={{ borderCollapse: "collapse" }}
            >
              <thead className="border-y-2 border-black">
                <tr>
                  <th className="w-[18%] p-1 text-left font-semibold align-bottom">
                    ITEM DESC
                  </th>
                  <th className="w-[6%] p-1 text-left font-semibold align-bottom">
                    HSN
                    <br />
                    CODE
                  </th>
                  <th className="w-[4%] p-1 text-left font-semibold align-bottom">
                    MNF
                  </th>
                  <th className="w-[3%] p-1 text-left font-semibold align-bottom">
                    SH
                  </th>
                  <th className="w-[10%] p-1 text-left font-semibold align-bottom">
                    BATCH NO
                  </th>
                  <th className="w-[5%] p-1 text-left font-semibold align-bottom">
                    EXP DT
                  </th>
                  <th className="w-[3%] p-1 text-left font-semibold align-bottom">
                    BIN
                    <br />
                    NO
                  </th>
                  <th className="w-[4%] p-1 text-right font-semibold align-bottom">
                    QTY
                  </th>
                  <th className="w-[5%] p-1 text-right font-semibold align-bottom">
                    RATE
                  </th>
                  <th className="w-[6%] p-1 text-right font-semibold align-bottom">
                    AMOUNT
                  </th>
                  <th className="w-[5%] p-1 text-right font-semibold align-bottom">
                    DISC
                    <br />
                    AMT
                  </th>
                  <th className="w-[7%] p-1 text-right font-semibold align-bottom">
                    TAXABLE
                    <br />
                    AMT
                  </th>
                  <th className="w-[8%] p-1 align-bottom font-semibold">
                    <div className="text-center">CGST</div>
                    <div className="flex justify-between text-[7px] mt-1 px-1">
                      <span>%</span>
                      <span>AMT</span>
                    </div>
                  </th>
                  <th className="w-[8%] p-1 align-bottom font-semibold">
                    <div className="text-center">SGST</div>
                    <div className="flex justify-between text-[7px] mt-1 px-1">
                      <span>%</span>
                      <span>AMT</span>
                    </div>
                  </th>
                  <th className="w-[8%] p-1 text-right font-semibold align-bottom">
                    BILL
                    <br />
                    AMT
                  </th>
                </tr>
              </thead>
              <tbody>
                {(effectiveBill.items || []).map((c: any, i: number) => {
                  let medName = c.medicineName || c.medicine
                  if (!medName && c.medicineId) {
                    const med = PharmacyDatabase.getMedicines().find(
                      (m) => m.id === c.medicineId,
                    )
                    if (med) medName = med.brandName || med.medicineName
                  }
                  medName = medName || "Unknown Medicine"

                  const mrp = c.unitPrice || c.mrp || 0
                  const qty = c.quantity || c.qty || 0
                  const discount = c.discount || 0
                  const tax = c.tax || 12

                  const amount = qty * mrp
                  const discAmt = amount * (discount / 100)
                  const taxable = amount - discAmt
                  const cgstRate = tax / 2
                  const sgstRate = tax / 2
                  const cgstAmt = taxable * (cgstRate / 100)
                  const sgstAmt = taxable * (sgstRate / 100)
                  const billAmt = taxable + cgstAmt + sgstAmt

                  return (
                    <tr key={i} className="align-top">
                      <td className="p-1 text-left break-words pr-2">
                        {medName}
                      </td>
                      <td className="p-1 text-left">{c.hsnCode || "300490"}</td>
                      <td className="p-1 text-left">
                        {medName.substring(0, 3)}
                      </td>
                      <td className="p-1 text-left">
                        {(c.batchNumber || c.batch || "H").charAt(0)}
                      </td>
                      <td className="p-1 text-left break-all">
                        {c.batchNumber || c.batch}
                      </td>
                      <td className="p-1 text-left">
                        {c.expiryDate || c.expiry || "2026-12"}
                      </td>
                      <td className="p-1 text-left"></td>
                      <td className="p-1 text-right">{qty}</td>
                      <td className="p-1 text-right">{mrp.toFixed(2)}</td>
                      <td className="p-1 text-right">{amount.toFixed(2)}</td>
                      <td className="p-1 text-right">{discAmt.toFixed(2)}</td>
                      <td className="p-1 text-right">{taxable.toFixed(2)}</td>
                      <td className="p-1">
                        <div className="flex justify-between px-1">
                          <span>{cgstRate}</span>
                          <span>{cgstAmt.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="p-1">
                        <div className="flex justify-between px-1">
                          <span>{sgstRate}</span>
                          <span>{sgstAmt.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="p-1 text-right font-bold">
                        {billAmt.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-y-2 border-black font-bold text-[9px]">
                <tr>
                  <td
                    colSpan={7}
                    className="p-1 text-right font-normal text-[8px] italic"
                  ></td>
                  <td className="p-1 text-right"></td>
                  <td className="p-1 text-right"></td>
                  <td className="p-1 text-right">
                    {(effectiveBill.subTotal || 0).toFixed(2)}
                  </td>
                  <td className="p-1 text-right">
                    {(effectiveBill.discount || 0).toFixed(2)}
                  </td>
                  <td className="p-1 text-right">
                    {(
                      effectiveBill.taxableTotal ||
                      effectiveBill.subTotal - effectiveBill.discount ||
                      0
                    ).toFixed(2)}
                  </td>
                  <td className="p-1">
                    <div className="flex justify-end px-1">
                      <span>
                        {(
                          effectiveBill.cgstTotal ||
                          (effectiveBill.tax || 0) / 2 ||
                          0
                        ).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="p-1">
                    <div className="flex justify-end px-1">
                      <span>
                        {(
                          effectiveBill.sgstTotal ||
                          (effectiveBill.tax || 0) / 2 ||
                          0
                        ).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="p-1 text-right">
                    {(effectiveBill.totalAmount || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* Financial Summary & Footers */}
          <div className="flex justify-between items-end mt-4 print:text-[9px]">
            <div>
              {isReturnBill ? (
                <div className="space-y-1">
                  <p className="text-[12px] print:text-[9px]">
                    Previous Bill Total:{" "}
                    <span className="font-bold">
                      ₹
                      {(
                        activeReturn?.originalTotalAmount ||
                        effectiveBill.totalAmount ||
                        0
                      ).toFixed(2)}
                    </span>
                  </p>
                  <p className="text-[12px] print:text-[9px] text-amber-700 font-bold">
                    Less: Refund / Credit Amount: -₹
                    {(activeReturn?.refundAmount || 0).toFixed(2)}
                  </p>
                  <p className="text-[14px] print:text-[10px] text-indigo-900 font-bold">
                    Modified Net Payable Total: ₹
                    {(
                      activeReturn?.modifiedTotalAmount ??
                      effectiveBill.totalAmount ??
                      0
                    ).toFixed(2)}
                  </p>
                  <p className="mt-2 text-[11px] print:text-[8px] italic text-gray-700">
                    Refund sum of{" "}
                    <span className="font-bold uppercase">
                      {numberToWords(activeReturn?.refundAmount || 0)} Rupees
                      Only
                    </span>{" "}
                    approved towards medicine return.
                  </p>
                </div>
              ) : (
                <div>
                  <p>
                    Received sum of{" "}
                    <span className="font-bold uppercase">
                      {numberToWords(effectiveBill.totalAmount || 0)} Rupees
                      Only
                    </span>{" "}
                    towards Above Bill
                  </p>
                  <div className="mt-6 border-t border-dashed border-black pt-2">
                    <p className="font-bold mb-1">Payment Breakdown:</p>
                    {Object.entries(
                      effectiveBill.paymentsData?.amounts || {
                        Cash: effectiveBill.totalAmount,
                      },
                    ).map(([method, amount]) => (
                      <div
                        key={method}
                        className="flex justify-between w-48 text-[9px] uppercase"
                      >
                        <span>
                          {method}{" "}
                          {(effectiveBill.paymentsData?.refs as any)?.[method]
                            ? `(${(effectiveBill.paymentsData?.refs as any)[method]})`
                            : ""}
                          :
                        </span>
                        <span className="font-bold">
                          {(Number(amount) || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="text-right pb-4">
              <p className="font-bold">For VH PHARMACY</p>
              <div className="h-12 border-b border-dashed border-gray-400 w-48 ml-auto mt-2"></div>
              <p className="mt-1">Authorized Pharmacist / Signatory</p>
            </div>
          </div>

          {/* Bottom action controls - hidden on print */}
          <div className="mt-8 pt-4 border-t border-[#DDE2EC] flex justify-between items-center print:hidden">
            <button
              onClick={onClose}
              className="bg-white border border-[#DDE2EC] hover:bg-gray-100 text-[#0F1624] px-4 py-2 text-sm font-semibold transition-colors rounded flex items-center gap-1.5 shadow-sm"
            >
              ← Back to Returns
            </button>
            <button
              onClick={printInvoice}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-sm font-semibold flex items-center gap-2 transition-colors rounded shadow-sm"
            >
              <Printer size={16} /> Print{" "}
              {isReturnBill ? "Modified Bill" : "Receipt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
