import { usePharmacyData } from "../data/usePharmacyData"
import { PharmacyDatabase } from "../../../services/pharmacyDb"
import { useState, useMemo } from "react"
import {
  Search,
  X,
  Plus,
  Printer,
  RefreshCw,
  Undo2,
  ArrowRight,
  CheckCircle2,
  FileText,
  Send,
  Building2,
  Package,
  XCircle,
} from "lucide-react"
import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"
import SupplierInvoiceModal from "../components/SupplierInvoiceModal"
import toast from "react-hot-toast"

const RETURN_REASONS = [
  "Expired",
  "Near Expiry",
  "Damaged",
  "Manufacturer Recall",
  "Wrong Supply",
  "Quality Issue",
  "Excess Stock",
]

const STATUS_ORDER = [
  "Draft",
  "Submitted",
  "Approved",
  "Sent To Supplier",
  "Credit Note Pending",
  "Credit Received",
  "Closed",
]

export default function SupplierReturns({
  onNavigate,
}: {
  onNavigate: (page: string) => void
}) {
  const { supplierReturns, suppliers, batches, medicines, refresh } =
    usePharmacyData()
  const [viewState, setViewState] = useState<"list" | "create" | "print">(
    "list",
  )

  // Create Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [selectedMedicineId, setSelectedMedicineId] = useState("")
  const [selectedBatchId, setSelectedBatchId] = useState("")
  const [returnQuantity, setReturnQuantity] = useState("")
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0])
  const [poNumber, setPoNumber] = useState("")
  const [grnNumber, setGrnNumber] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")

  // Print State
  const [printReturnId, setPrintReturnId] = useState("")
  const [invoiceModalData, setInvoiceModalData] = useState<any | null>(null)

  const openOriginalInvoice = (customInvNo?: string, customSupId?: string) => {
    const invNo = customInvNo || invoiceNumber
    const supId = customSupId || selectedSupplierId
    if (!invNo) {
      toast.error("No original supplier invoice recorded for this batch.")
      return
    }

    const sup = suppliers.find((s) => s.id === supId)
    const med = medicines.find((m) => m.id === selectedMedicineId)
    const rate = selectedBatch?.purchasePrice || purchaseRate || 0
    const qty = selectedBatch?.quantity || 1
    const gross = rate * qty
    const gstRate = med?.gst || 5
    const gstAmt = (gross * gstRate) / 100
    const total = gross + gstAmt

    setInvoiceModalData({
      supplierName: (sup?.supplierName || sup?.name || "SUPPLIER").toUpperCase(),
      supplierAddress: sup?.address || "Registered Supplier Depot",
      supplierPhone: sup?.phone || "",
      supplierLicence: sup?.licenseDetails || "",
      supplierGstin: sup?.gstInformation || sup?.gstin || "",
      partyName: "VH PHARMACY",
      partyAddress: "In the premises of Varma Hospitals, Bhimavaram",
      partyLicence: "",
      partyGstin: "",
      invoiceNo: invNo,
      invoiceDate: new Date().toLocaleDateString("en-IN"),
      dueDate: new Date().toLocaleDateString("en-IN"),
      paymentMode: "CREDIT",
      items: [
        {
          sNo: 1,
          qty: qty,
          discountPercent: 0,
          mfr: med?.manufacturer || "",
          pack: med?.strength || "1 Unit",
          productName: (med?.name || "MEDICINE").toUpperCase(),
          oMrp: 0,
          batch: selectedBatch?.batchNumber || "BATCH",
          exp: selectedBatch?.expiryDate || "N/A",
          hsn: (med as any)?.hsnCode || "300490",
          mrp: (selectedBatch?.mrp || rate).toString(),
          rate: rate,
          dis: 0,
          sgstPercent: gstRate / 2,
          sgstVal: (gstAmt / 2).toFixed(2),
          cgstPercent: gstRate / 2,
          cgstVal: (gstAmt / 2).toFixed(2),
          amount: gross.toFixed(2),
          netAmount: total.toFixed(2),
        },
      ],
      gstRate: `${gstRate}%`,
      totalGross: gross.toFixed(2),
      totalDiscount: "0.00",
      taxableAmt: gross.toFixed(2),
      sgstAmt: (gstAmt / 2).toFixed(2),
      cgstAmt: (gstAmt / 2).toFixed(2),
      totalGst: gstAmt.toFixed(2),
      roundOff: 0,
      grandTotal: total.toFixed(2),
      amountInWords: `₹${total.toFixed(2)}`,
      bankName: "",
      ifscCode: "",
    })
  }

  // Batches strictly bought from the selected supplier with available stock
  const supplierBatches = useMemo(() => {
    if (!selectedSupplierId) return []
    return batches.filter(
      (b) => b.supplierId === selectedSupplierId && b.availableQuantity > 0,
    )
  }, [batches, selectedSupplierId])

  // Distinct medicines bought from the selected supplier
  const supplierMedicines = useMemo(() => {
    if (!selectedSupplierId) return []
    const medIds = new Set(supplierBatches.map((b) => b.medicineId))
    return medicines.filter((m) => medIds.has(m.id))
  }, [supplierBatches, medicines, selectedSupplierId])

  // Active batches for the chosen medicine from this supplier
  const activeBatches = useMemo(() => {
    if (!selectedSupplierId) return []
    if (selectedMedicineId) {
      return supplierBatches.filter((b) => b.medicineId === selectedMedicineId)
    }
    return supplierBatches
  }, [supplierBatches, selectedMedicineId])

  const selectedBatch = batches.find((b) => b.id === selectedBatchId)
  const purchaseRate = selectedBatch?.purchasePrice || 0
  const returnAmountPreview =
    parseInt(returnQuantity || "0") * purchaseRate || 0

  const handleInitiateReturn = () => {
    if (!selectedSupplierId || !selectedBatchId || !returnQuantity) {
      toast.error("Please fill all required fields")
      return
    }

    const qty = parseInt(returnQuantity, 10)
    if (isNaN(qty) || qty <= 0) {
      toast.error("Invalid quantity")
      return
    }

    if (selectedBatch && qty > selectedBatch.availableQuantity) {
      toast.error(
        `Return quantity cannot exceed available stock (${selectedBatch.availableQuantity})`,
      )
      return
    }

    try {
      // Create return as Draft
      PharmacyDatabase.processSupplierReturn(
        {
          supplierId: selectedSupplierId,
          medicineId: selectedBatch!.medicineId,
          batchId: selectedBatch!.id,
          quantity: qty,
          reason: returnReason,
          poNumber,
          grnNumber,
          invoiceNumber,
          createdBy: "Pharmacist", // Pass inside payload
        },
        "Pharmacist",
      )
      toast.success("Draft Return Created (Stock not deducted yet)")
      setViewState("list")
      setSelectedSupplierId("")
      setSelectedMedicineId("")
      setSelectedBatchId("")
      setReturnQuantity("")
      setPoNumber("")
      setGrnNumber("")
      setInvoiceNumber("")
      refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to process return")
    }
  }

  const advanceStatus = (returnId: string, currentStatus: string) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus)
    if (currentIndex === -1 || currentIndex === STATUS_ORDER.length - 1) return

    const nextStatus = STATUS_ORDER[currentIndex + 1] as any
    try {
      PharmacyDatabase.updateSupplierReturnStatus(
        returnId,
        nextStatus,
        "Pharmacy Manager",
      )
      toast.success(`Status advanced to ${nextStatus}`)
      refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to advance status")
    }
  }

  const getSupplierName = (id: string) =>
    suppliers.find((s) => s.id === id)?.name || id
  const getMedicineName = (id: string) =>
    medicines.find((m) => m.id === id)?.name || id
  const getBatchNumber = (id: string) =>
    batches.find((b) => b.id === id)?.batchNumber || id

  if (viewState === "create") {
    return (
      <div className="space-y-6 font-sans text-[#0F1624]">
        <PageHeader
          breadcrumbs={[
            { label: "Pharmacy" },
            { label: "Inventory" },
            { label: "Supplier Returns" },
            { label: "Initiate Return" },
          ]}
          title="Initiate Supplier Return"
          description="Create a draft Debit Note and link to original purchase"
          onNavigate={onNavigate}
        />

        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 space-y-8">
          {/* Section 1: Supplier & Product */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[14px] text-[#0F1624] flex items-center gap-2">
              <Building2 size={16} className="text-[#0F766E]" /> 1. Select
              Supplier & Product
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  1. Supplier *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => {
                    setSelectedSupplierId(e.target.value)
                    setSelectedMedicineId("")
                    setSelectedBatchId("")
                  }}
                  className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px] rounded focus:border-[#0F766E] focus:outline-none bg-white"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplierName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  2. Purchased Medicine *
                </label>
                <select
                  value={selectedMedicineId}
                  onChange={(e) => {
                    const mId = e.target.value
                    setSelectedMedicineId(mId)
                    setSelectedBatchId("")
                  }}
                  disabled={!selectedSupplierId}
                  className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px] rounded disabled:bg-[#F8FAFC] focus:border-[#0F766E] focus:outline-none bg-white"
                >
                  <option value="">
                    {!selectedSupplierId
                      ? "-- Select Supplier First --"
                      : (supplierMedicines?.length || 0) === 0
                      ? "-- No medicines purchased from this supplier --"
                      : "-- Choose Medicine --"}
                  </option>
                  {(supplierMedicines || []).map((m) => {
                    const totalStock = (supplierBatches || [])
                      .filter((b) => b.medicineId === m.id)
                      .reduce((sum, b) => sum + (b.availableQuantity || 0), 0)
                    return (
                      <option key={m.id} value={m.id}>
                        {(m as any).medicineName || m.name} (In-Stock: {totalStock})
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  3. Batch (In Stock) *
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    const bId = e.target.value
                    setSelectedBatchId(bId)
                    const b = batches.find((x) => x.id === bId)
                    if (b) {
                      if (b.invoiceNumber && !invoiceNumber) setInvoiceNumber(b.invoiceNumber)
                      if (b.grnId && !grnNumber) setGrnNumber(b.grnId)
                    }
                  }}
                  disabled={!selectedMedicineId}
                  className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px] rounded disabled:bg-[#F8FAFC] focus:border-[#0F766E] focus:outline-none bg-white"
                >
                  <option value="">
                    {!selectedMedicineId
                      ? "-- Select Medicine First --"
                      : (activeBatches?.length || 0) === 0
                      ? "-- No active batches found --"
                      : "-- Choose Batch --"}
                  </option>
                  {(activeBatches || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber} (Exp: {b.expiryDate} | Stock: {b.availableQuantity} | Rate: ₹{b.purchasePrice})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-[#F0F2F5]" />

          {/* Section 2: Reference Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[14px] text-[#0F1624] flex items-center gap-2">
              <FileText size={16} className="text-[#1B4FD8]" /> 2. Original
              Purchase Details (Optional)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  PO Number
                </label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="PO-2026-..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px] rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  GRN Number
                </label>
                <input
                  type="text"
                  value={grnNumber}
                  onChange={(e) => setGrnNumber(e.target.value)}
                  placeholder="GRN-2026-..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px] rounded"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
                    Supplier Invoice
                  </label>
                  {invoiceNumber && (
                    <button
                      type="button"
                      onClick={() => openOriginalInvoice()}
                      className="text-[11px] font-semibold text-[#0F766E] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FileText size={12} /> View Original Receipt
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px] rounded"
                />
              </div>
            </div>
          </div>

          <hr className="border-[#F0F2F5]" />

          {/* Section 3: Return Specifics */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[14px] text-[#0F1624] flex items-center gap-2">
              <Package size={16} className="text-[#1B4FD8]" /> 3. Return Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  Return Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px] rounded"
                  placeholder="e.g. 50"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                  Reason
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] text-[13px] rounded"
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-4 flex justify-between items-center mt-4">
              <div>
                <p className="text-[12px] font-semibold text-[#64748B] uppercase">
                  Purchase Rate
                </p>
                <p className="text-[16px] font-bold text-[#334155]">
                  ₹{purchaseRate.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-semibold text-[#64748B] uppercase">
                  Total Return Value
                </p>
                <p className="text-[20px] font-bold text-[#dc2626]">
                  ₹{returnAmountPreview.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#EFF6FF] text-[#1D4ED8] p-3 rounded text-[12px] flex gap-2 items-start">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <p>
              Creating this return will save it as a <strong>Draft</strong>.
              Stock will <strong>not</strong> be deducted until the Pharmacy
              Manager Approves it.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#F0F2F5]">
            <button
              onClick={() => setViewState("list")}
              className="px-6 py-2.5 rounded border border-[#E2E8F0] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInitiateReturn}
              className="px-6 py-2.5 rounded text-white font-semibold text-[13px] hover:bg-[#1e40af] transition-colors"
              style={{ background: "#0F766E" }}
            >
              Create Draft Return
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (viewState === "print" && printReturnId) {
    const rtn = supplierReturns.find((r) => r.id === printReturnId)
    if (!rtn) return null
    const batch = batches.find((b) => b.id === rtn.batchId)

    return (
      <div className="p-6">
        <div
          className="max-w-2xl mx-auto bg-white border border-[#E2E8F0] p-10 shadow-sm"
          style={{ fontFamily: "monospace" }}
        >
          <div className="text-center mb-8 border-b-2 border-dashed border-[#94A3B8] pb-4">
            <h1 className="text-xl font-bold">HOSPITAL NAME</h1>
            <h2 className="text-lg mt-2">DEBIT NOTE</h2>
          </div>

          <div className="flex justify-between mb-8">
            <div>
              <p>
                Debit Note No: <strong>{rtn.debitNoteNumber}</strong>
              </p>
              <p>Date: {new Date(rtn.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p>
                Supplier: <strong>{getSupplierName(rtn.supplierId)}</strong>
              </p>
              {rtn.poNumber && <p>PO Ref: {rtn.poNumber}</p>}
              {rtn.invoiceNumber && <p>Inv Ref: {rtn.invoiceNumber}</p>}
            </div>
          </div>

          <div className="border-t-2 border-b-2 border-dashed border-[#94A3B8] py-2 mb-8">
            <table className="w-full text-left">
              <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
                <tr>
                  <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Batch</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Qty</th>
                  <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Rate</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="mt-2">
                <tr>
                  <td className="pt-2">{getMedicineName(rtn.medicineId)}</td>
                  <td className="pt-2">{getBatchNumber(rtn.batchId)}</td>
                  <td className="pt-2">{rtn.quantity}</td>
                  <td className="pt-2">₹{rtn.purchaseRate}</td>
                  <td className="pt-2 text-right">₹{rtn.returnAmount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right mb-8">
            <p>
              Total: <strong>₹{rtn.returnAmount}</strong>
            </p>
          </div>

          <div className="mb-12">
            <p>Reason: {rtn.reason}</p>
            <p>Status: {rtn.status}</p>
          </div>

          <div className="border-t-2 border-dashed border-[#94A3B8] pt-4 mt-16 flex justify-between">
            <div>
              <p>Created By: {rtn.createdBy}</p>
            </div>
            <div className="text-center">
              <p className="mt-8 border-t border-black pt-1">Authorized By</p>
              <p>{rtn.approvedBy || "Pharmacy Manager"}</p>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto mt-6 flex justify-between">
          <button
            onClick={() => setViewState("list")}
            className="px-4 py-2 border rounded"
          >
            Back to List
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
          >
            <Printer size={16} /> Print Document
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans text-[#0F1624]">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Inventory" },
          { label: "Supplier Returns" },
        ]}
        title="Purchase Returns (Debit Notes)"
        description={`${supplierReturns.length} historical returns tracking`}
        actions={
          <button
            onClick={() => setViewState("create")}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-white text-[13px] font-medium"
            style={{ background: "#0F766E" }}
          >
            <Plus size={14} /> Initiate Return
          </button>
        }
        onNavigate={onNavigate}
      />

      <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
        <table>
          <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
            <tr>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Debit Note No</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Date</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Supplier</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Medicine / Batch</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Return Val</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Reason</th>
              <th className="py-3 px-4 text-[11px] font-bold text-[#065F46] uppercase tracking-wider">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {supplierReturns.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-8 text-[#94A3B8] text-[13px]"
                >
                  No supplier returns found. Create one to get started.
                </td>
              </tr>
            ) : (
              supplierReturns.map((rtn) => {
                const nextStatus =
                  STATUS_ORDER[STATUS_ORDER.indexOf(rtn.status) + 1]
                return (
                  <tr className="hover:bg-[#F0FDFA] transition-colors" key={rtn.id}>
                    <td>
                      <p className="font-mono text-[13px] font-medium text-[#0F766E]">
                        {rtn.debitNoteNumber}
                      </p>
                      {(rtn.poNumber || rtn.grnNumber) && (
                        <p className="text-[10px] text-[#64748B] mt-0.5">
                          PO: {rtn.poNumber || "-"} | GRN:{" "}
                          {rtn.grnNumber || "-"}
                        </p>
                      )}
                    </td>
                    <td className="text-[13px] text-[#334155]">
                      {new Date(rtn.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-[13px] font-semibold text-[#0F1624]">
                      {getSupplierName(rtn.supplierId)}
                    </td>
                    <td>
                      <p className="font-semibold text-[13px] text-[#0F1624]">
                        {getMedicineName(rtn.medicineId)}
                      </p>
                      <p className="text-[11px] text-[#94A3B8]">
                        Batch: {getBatchNumber(rtn.batchId)} | Qty:{" "}
                        {rtn.quantity}
                      </p>
                    </td>
                    <td className="text-[13px] font-bold text-[#dc2626]">
                      ₹{Number(rtn.returnAmount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="text-[13px] text-[#64748B]">{rtn.reason}</td>
                    <td>
                      <div
                        className={`inline-flex px-2 py-1 rounded text-[11px] font-semibold border
                        ${
                          rtn.status === "Draft"
                            ? "bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]"
                            : rtn.status === "Approved"
                              ? "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
                              : rtn.status === "Credit Received" ||
                                  rtn.status === "Closed"
                                ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]"
                                : "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]"
                        }
                      `}
                      >
                        {rtn.status}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        {nextStatus && (
                          <button
                            onClick={() => advanceStatus(rtn.id, rtn.status)}
                            className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#0F766E]"
                            title={`Advance to ${nextStatus}`}
                          >
                            <ArrowRight size={15} />
                          </button>
                        )}
                        {rtn.invoiceNumber && (
                          <button
                            onClick={() => openOriginalInvoice(rtn.invoiceNumber, rtn.supplierId)}
                            className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#0F766E]"
                            title={`View Original Supplier Invoice (${rtn.invoiceNumber})`}
                          >
                            <FileText size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPrintReturnId(rtn.id)
                            setViewState("print")
                          }}
                          className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B]"
                          title="Print Document"
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Original Supplier Invoice Modal */}
      {invoiceModalData && (
        <SupplierInvoiceModal
          invoice={typeof invoiceModalData === "object" ? invoiceModalData : undefined}
          onClose={() => setInvoiceModalData(null)}
        />
      )}
    </div>
  )
}
