import { useState, useMemo } from "react"
import {
  Search,
  Download,
  Printer,
  RefreshCcw,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  CornerDownRight,
  FileText,
  Trash2,
} from "lucide-react"
import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"
import InvoicePrintModal from "../components/InvoicePrintModal"
import { usePharmacyData } from "../data/usePharmacyData"
import {
  PharmacyDatabase,
  AppPharmacyBill,
  AppPharmacyReturn,
  AppPharmacyReturnItem,
} from "../../../services/pharmacyDb"

interface SalesReturnsProps {
  onNavigate: (page: string) => void
}

export default function SalesReturns({ onNavigate }: SalesReturnsProps) {
  const { bills, refresh } = usePharmacyData()
  const [view, setView] = useState<"sales" | "returns">("sales")
  const [selectedInv, setSelectedInv] = useState<any | null>(null)
  const [printInv, setPrintInv] = useState<any | null>(null)
  const [printReturnModal, setPrintReturnModal] = useState<{
    bill: any
    returnRecord: any
  } | null>(null)
  const [search, setSearch] = useState("")

  // Returns tab states
  const [searchBillNo, setSearchBillNo] = useState("")
  const [searchedBill, setSearchedBill] = useState<AppPharmacyBill | null>(null)
  const [searchError, setSearchError] = useState("")
  const [returnQuantities, setReturnQuantities] =
    useState<Record<string, number>>({})
  const [returnReason, setReturnReason] = useState("Patient not using")
  const [returnNotes, setReturnNotes] = useState("")
  const [processSuccess, setProcessSuccess] = useState<string | null>(null)
  const [processedReturn, setProcessedReturn] =
    useState<AppPharmacyReturn | null>(null)
  const [processedModifiedBill, setProcessedModifiedBill] =
    useState<AppPharmacyBill | null>(null)
  const [recentReturns, setRecentReturns] = useState<AppPharmacyReturn[]>(() =>
    PharmacyDatabase.getReturns(),
  )

  const filtered = useMemo(() => {
    const matched = bills.filter(
      (inv) =>
        !search ||
        inv.billNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.patientName.toLowerCase().includes(search.toLowerCase()),
    )
    // Deduplicate by billNumber so we only see the latest version in the table
    const seen = new Set<string>()
    return matched.filter((inv) => {
      const key = inv.originalBillNumber || inv.billNumber
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [bills, search])

  // Net Revenue = Gross Sales Revenue (original bills only) - Total Refunds
  const originalBills = useMemo(
    () => bills.filter((b) => !b.isModifiedReturnBill),
    [bills],
  )
  const grossSales = useMemo(
    () => originalBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    [originalBills],
  )
  const totalRefunds = useMemo(
    () => recentReturns.reduce((sum, r) => sum + (r.refundAmount || 0), 0),
    [recentReturns],
  )
  const todayRevenue = grossSales - totalRefunds
  const avgBill =
    originalBills.length > 0 ? todayRevenue / originalBills.length : 0

  // Reset to clean Returns view
  const handleResetToReturns = () => {
    setSearchedBill(null)
    setSearchBillNo("")
    setReturnQuantities({})
    setSearchError("")
    setProcessSuccess(null)
    setProcessedReturn(null)
    setProcessedModifiedBill(null)
    setRecentReturns(PharmacyDatabase.getReturns())
  }

  // Search bill handler
  const handleSearchBill = (queryOverride?: string) => {
    const query = (queryOverride ?? searchBillNo).trim()
    setSearchError("")
    setProcessSuccess(null)
    setProcessedReturn(null)
    setProcessedModifiedBill(null)

    if (!query) {
      setSearchError("Please enter a valid bill number to search.")
      setSearchedBill(null)
      return
    }

    // Lookup bill in database
    const allBills = PharmacyDatabase.getBills()
    const found = allBills.find(
      (b) =>
        !b.isModifiedReturnBill &&
        (b.billNumber.toLowerCase() === query.toLowerCase() ||
          b.id.toLowerCase() === query.toLowerCase()),
    )

    if (!found) {
      setSearchError(
        `Bill "${query}" not found. Please verify the bill number and try again.`,
      )
      setSearchedBill(null)
      setReturnQuantities({})
      return
    }

    setSearchedBill(found)
    setSearchBillNo(found.billNumber)
    // Initialize return quantities to 0
    const initialQty: Record<string, number> = {}
    found.items.forEach((item) => {
      initialQty[`${item.medicineId}_${item.batchNumber}`] = 0
    })
    setReturnQuantities(initialQty)
  }

  // Start return from sales history
  const handleStartReturnFromSales = (bill: AppPharmacyBill) => {
    setView("returns")
    setSearchBillNo(bill.billNumber)
    handleSearchBill(bill.billNumber)
  }

  // Calculate past returns for the searched bill
  const existingReturnsForSearchedBill = useMemo(() => {
    if (!searchedBill) return []
    return PharmacyDatabase.getReturnsForBill(searchedBill.billNumber)
  }, [searchedBill, recentReturns])

  // Calculate previously returned quantities per line item
  const previouslyReturnedMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (!searchedBill) return map

    existingReturnsForSearchedBill.forEach((ret) => {
      ;(ret.items || []).forEach((item) => {
        const key = `${item.medicineId}_${item.batchNumber}`
        map[key] = (map[key] || 0) + (item.returnQuantity || 0)
      })
      if (
        ret.medicineId &&
        ret.returnQuantity &&
        (!ret.items || ret.items.length === 0)
      ) {
        const key = `${ret.medicineId}_${ret.batchNumber || ""}`
        map[key] = (map[key] || 0) + ret.returnQuantity
      }
    })
    return map
  }, [searchedBill, existingReturnsForSearchedBill])

  // Handle return quantity change
  const handleQuantityChange = (
    key: string,
    maxEligible: number,
    val: number,
  ) => {
    const clamped = Math.max(0, Math.min(maxEligible, val))
    setReturnQuantities((prev) => ({
      ...prev,
      [key]: clamped,
    }))
  }

  // Return all items for a line
  const handleReturnAll = (key: string, maxEligible: number) => {
    setReturnQuantities((prev) => ({
      ...prev,
      [key]: maxEligible,
    }))
  }

  // Reset return for a line
  const handleResetLine = (key: string) => {
    setReturnQuantities((prev) => ({
      ...prev,
      [key]: 0,
    }))
  }

  // Calculate live return calculations
  const returnCalculations = useMemo(() => {
    if (!searchedBill) {
      return {
        itemsToReturn: [],
        totalReturnQty: 0,
        totalRefundAmount: 0,
        originalTotalAmount: 0,
        modifiedTotalAmount: 0,
      }
    }

    let totalReturnQty = 0
    let totalRefundAmount = 0

    const itemsToReturn: (AppPharmacyReturnItem & {
      maxEligible: number;
      previouslyReturned: number;
    })[] = []

    searchedBill.items.forEach((origItem) => {
      const key = `${origItem.medicineId}_${origItem.batchNumber}`
      const previouslyReturned = previouslyReturnedMap[key] || 0
      const maxEligible = Math.max(0, origItem.quantity - previouslyReturned)
      const currentReturnQty = returnQuantities[key] || 0
      const finalQuantity = Math.max(0, maxEligible - currentReturnQty)

      const unitPrice = origItem.unitPrice
      const originalAmount =
        origItem.grossAmount || origItem.quantity * unitPrice
      const refundAmount = currentReturnQty * unitPrice
      const finalAmount = finalQuantity * unitPrice

      if (currentReturnQty > 0) {
        totalReturnQty += currentReturnQty
        totalRefundAmount += refundAmount
      }

      itemsToReturn.push({
        medicineId: origItem.medicineId,
        medicineName: origItem.medicineName,
        batchNumber: origItem.batchNumber,
        expiryDate: origItem.expiryDate,
        originalQuantity: origItem.quantity,
        previouslyReturned,
        maxEligible,
        returnQuantity: currentReturnQty,
        finalQuantity,
        unitPrice,
        originalAmount,
        refundAmount,
        finalAmount,
        tax: origItem.tax,
        discount: origItem.discount,
      })
    })

    const originalTotalAmount = searchedBill.totalAmount || 0
    const modifiedTotalAmount = Math.max(
      0,
      originalTotalAmount - totalRefundAmount,
    )

    return {
      itemsToReturn,
      totalReturnQty,
      totalRefundAmount,
      originalTotalAmount,
      modifiedTotalAmount,
    }
  }, [searchedBill, returnQuantities, previouslyReturnedMap])

  // Process return action
  const handleProcessReturn = () => {
    if (!searchedBill) return

    const returnableItems = returnCalculations.itemsToReturn.filter(
      (i) => i.returnQuantity > 0,
    )
    if (returnableItems.length === 0) {
      alert(
        "Please specify a return quantity greater than 0 for at least one medicine.",
      )
      return
    }

    // Execute return in PharmacyDatabase
    const result = PharmacyDatabase.processMedicineReturn(
      searchedBill,
      returnableItems,
      returnReason,
      returnNotes,
    )

    setProcessedReturn(result.returnRecord)
    setProcessedModifiedBill(result.modifiedBill)
    setProcessSuccess(
      `Return ${result.returnRecord.returnNumber} processed successfully! Modified Bill ${result.modifiedBill.billNumber} created.`,
    )
    setRecentReturns(PharmacyDatabase.getReturns())
    refresh()
  }

  // Re-print any past return bill
  const handlePrintPastReturn = (ret: AppPharmacyReturn) => {
    const allBills = PharmacyDatabase.getBills()
    let modBill = allBills.find((b) => b.billNumber === ret.modifiedBillNumber)
    if (!modBill) {
      modBill = {
        id: ret.id,
        billNumber: ret.modifiedBillNumber || "MOD-" + ret.originalBillNumber,
        patientId: ret.patientId || "",
        patientName: ret.patientName || "Patient",
        uhid: ret.patientUhid,
        doctorName: ret.doctorName || "Doctor",
        department: ret.department || "General",
        billType: "Cash",
        paymentStatus: "Paid",
        items: ret.items
          ? ret.items.map((i) => ({
              medicineId: i.medicineId,
              medicineName: i.medicineName,
              batchNumber: i.batchNumber,
              expiryDate: i.expiryDate || "2027-12",
              quantity: i.finalQuantity,
              unitPrice: i.unitPrice,
              grossAmount: i.finalAmount,
              discount: 0,
              taxableAmount: i.finalAmount,
              cgstAmount: 0,
              sgstAmount: 0,
              tax: 0,
              totalPrice: i.finalAmount,
            }))
          : [],
        subTotal: ret.modifiedTotalAmount || 0,
        discount: 0,
        tax: 0,
        taxableTotal: ret.modifiedTotalAmount || 0,
        cgstTotal: 0,
        sgstTotal: 0,
        totalAmount: ret.modifiedTotalAmount || 0,
        createdBy: "Pharmacist",
        createdAt: ret.createdAt,
      }
    }
    setPrintReturnModal({ bill: modBill, returnRecord: ret })
  }

  // Delete return from history
  const handleDeleteReturn = (ret: AppPharmacyReturn) => {
    if (
      window.confirm(
        `Are you sure you want to remove return ${ret.returnNumber} (${ret.patientName || "Return"}) from history?`,
      )
    ) {
      PharmacyDatabase.deleteReturn(ret.id)
      setRecentReturns(PharmacyDatabase.getReturns())
      refresh()
    }
  }

  // Export data based on current tab
  const handleExport = () => {
    let csvData = ""
    if (view === "sales") {
      csvData =
        "Bill Number,Date,Patient,Doctor,Items,Payment Mode,Total Amount,Status\n"
      filtered.forEach((inv) => {
        csvData += `${inv.billNumber},${new Date(inv.createdAt || Date.now()).toLocaleDateString()},${inv.patientName},${inv.doctorName},${inv.items?.length || 0},${inv.paymentMode || "Cash"},${inv.totalAmount || 0},Completed\n`
      })
    } else {
      csvData =
        "Return Number,Original Bill,Date,Patient,Doctor,Refund Amount,Status\n"
      recentReturns.forEach((ret) => {
        csvData += `${ret.returnNumber},${ret.originalBillNumber},${new Date(ret.createdAt || Date.now()).toLocaleDateString()},${ret.patientName || ""},${ret.doctorName || ""},${ret.refundAmount || 0},${ret.status || "Completed"}\n`
      })
    }

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pharmacy_${view}_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5 relative">
      {printInv && (
        <InvoicePrintModal bill={printInv} onClose={() => setPrintInv(null)} />
      )}
      {printReturnModal && (
        <InvoicePrintModal
          bill={printReturnModal.bill}
          returnRecord={printReturnModal.returnRecord}
          onClose={() => setPrintReturnModal(null)}
        />
      )}

      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Sales" },
          { label: "Sales & Returns" },
        ]}
        title="Sales & Medicine Returns"
        description="Search billed invoices, process item-level returns, recalculate bills, and generate modified credit invoices"
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#E2E8F0] bg-white text-[13px] text-[#334155] hover:bg-[#F5F7FA] transition-colors"
            >
              <Download size={13} /> Export
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Revenue",
            value:
              "₹" +
              todayRevenue.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              }),
            color: "#0F766E",
          },
          {
            label: "Transactions",
            value: originalBills.length.toString(),
            color: "#16a34a",
          },
          {
            label: "Total Refunds Processed",
            value:
              "₹" +
              totalRefunds.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              }),
            color: "#dc2626",
          },
          {
            label: "Avg. Bill Value",
            value:
              "₹" +
              avgBill.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
            color: "#7c3aed",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded p-4 border border-[#E2E8F0]"
          >
            <p className="text-[11px] text-[#64748B] font-medium">{s.label}</p>
            <p
              className="text-[20px] font-bold mt-1"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tab switch */}
      <div className="flex items-center gap-4">
        <div className="flex rounded border border-[#E2E8F0] overflow-hidden text-[13px]">
          {(["sales", "returns"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-5 py-2 font-medium transition-colors flex items-center gap-2"
              style={{
                background: view === v ? "#0F1624" : "#fff",
                color: view === v ? "#fff" : "#64748B",
              }}
            >
              {v === "sales" ? <FileText size={14} /> : <RotateCcw size={14} />}
              {v === "sales" ? "Sales History" : "Medicine Returns"}
            </button>
          ))}
        </div>

        {view === "sales" && (
          <>
            <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded px-3 py-2 ml-auto">
              <Search size={14} className="text-[#94A3B8]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, patient…"
                className="text-[13px] outline-none text-[#0F1624] placeholder:text-[#94A3B8] w-44"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                defaultValue="2026-09-15"
                className="px-3 py-2 rounded border border-[#E2E8F0] text-[13px] bg-white focus:border-[#0F766E] focus:outline-none"
              />
            </div>
          </>
        )}
      </div>

      {view === "sales" ? (
        /* SALES HISTORY TAB */
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#ECFDF5] border-y border-[#A7F3D0]">
              <tr className="bg-[#EDF7F5] border-b border-[#E2E8F0]">
                <th className="p-3 text-[12px] font-semibold text-[#475569]">
                  Bill Number
                </th>
                <th className="p-3 text-[12px] font-semibold text-[#475569]">
                  Date & Time
                </th>
                <th className="p-3 text-[12px] font-semibold text-[#475569]">
                  Patient
                </th>
                <th className="p-3 text-[12px] font-semibold text-[#475569]">
                  Doctor
                </th>
                <th className="p-3 text-[12px] font-semibold text-[#475569] text-center">
                  Items
                </th>
                <th className="p-3 text-[12px] font-semibold text-[#475569]">
                  Payment
                </th>
                <th className="p-3 text-[12px] font-semibold text-[#475569] text-right">
                  Total (₹)
                </th>
                <th className="p-3 text-[12px] font-semibold text-[#475569]">
                  Status
                </th>
                <th className="p-3 text-[12px] font-semibold text-[#475569] text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-8 text-center text-[#94A3B8] text-[13px]"
                  >
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const isModifiedBill = inv.isModifiedReturnBill
                  return (
                    <tr key={inv.id} className="hover:bg-[#F0FDFA] transition-colors border-b border-[#F1F5F9] hover:bg-[#EDF7F5]"
                    >
                      <td
                        className="p-3 font-mono text-[12px] font-semibold"
                        style={{
                          color: isModifiedBill ? "#7c3aed" : "#0F766E",
                        }}
                      >
                        {inv.billNumber}
                        {isModifiedBill && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 font-bold rounded">
                            MODIFIED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-[12px] text-[#64748B] whitespace-nowrap">
                        {new Date(
                          inv.createdAt ||
                            (inv as any).date ||
                            (inv as any).billDate ||
                            Date.now(),
                        ).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium text-[13px] text-[#0F1624]">
                        {inv.patientName}
                        <span className="block text-[11px] text-[#94A3B8] font-mono">
                          {inv.uhid}
                        </span>
                      </td>
                      <td className="p-3 text-[13px] text-[#334155]">
                        {inv.doctorName}
                      </td>
                      <td className="p-3 text-[13px] text-center">
                        {inv.items ? inv.items.length : 0}
                      </td>
                      <td className="p-3">
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded"
                          style={{ background: "#F0F2F5", color: "#475569" }}
                        >
                          {inv.paymentMode || "Cash"}
                        </span>
                      </td>
                      <td className="p-3 text-[13px] font-semibold text-[#0F1624] text-right">
                        ₹
                        {(inv.totalAmount || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-3">
                        <StatusBadge status="completed" size="sm" />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedInv(inv)}
                            title="View Invoice Details"
                            className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B] transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => setPrintInv(inv)}
                            title="Print Invoice"
                            className="p-1.5 rounded hover:bg-[#F0F2F5] text-[#64748B] transition-colors"
                          >
                            <Printer size={14} />
                          </button>
                          {!isModifiedBill && (
                            <button
                              onClick={() => handleStartReturnFromSales(inv)}
                              title="Process Return for this Bill"
                              className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded transition-colors"
                              style={{
                                background: "#faf5ff",
                                color: "#7c3aed",
                              }}
                            >
                              <RefreshCcw size={11} /> Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* MEDICINE RETURNS WORKFLOW TAB */
        <div className="space-y-6">
          {/* Section 1: Search Original Bill */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h3 className="font-bold text-[16px] text-[#0F1624] flex items-center gap-2">
                  <RotateCcw size={16} className="text-amber-600" /> Process
                  Medicine Return
                </h3>
                <p className="text-[12px] text-[#64748B]">
                  Enter the original Bill Number below to retrieve billed
                  medicines and process customer returns
                </p>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                <span>Sample Bills:</span>
                <button
                  onClick={() => {
                    setSearchBillNo("BILL-2026-001245")
                    handleSearchBill("BILL-2026-001245")
                  }}
                  className="px-2 py-0.5 bg-teal-50 text-blue-700 font-mono text-[11px] rounded hover:bg-blue-100 transition-colors"
                >
                  BILL-2026-001245 (Rahul Verma)
                </button>
                <button
                  onClick={() => {
                    setSearchBillNo("INV-2026-8845")
                    handleSearchBill("INV-2026-8845")
                  }}
                  className="px-2 py-0.5 bg-purple-50 text-purple-700 font-mono text-[11px] rounded hover:bg-purple-100 transition-colors"
                >
                  INV-2026-8845 (Priya Sharma)
                </button>
              </div>
            </div>

            <div className="max-w-2xl">
              <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                Original Bill Number *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={searchBillNo}
                    onChange={(e) => setSearchBillNo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearchBill()
                    }}
                    placeholder="Enter bill number (e.g. BILL-2026-001245)"
                    className="w-full pl-9 pr-3 py-2.5 rounded border border-[#E2E8F0] text-[13px] font-mono font-medium focus:border-[#0F766E] focus:outline-none"
                  />
                  <Search
                    size={15}
                    className="absolute left-3 top-3.5 text-[#94A3B8]"
                  />
                </div>
                <button
                  onClick={() => handleSearchBill()}
                  className="px-5 py-2.5 rounded text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-colors hover:bg-blue-700 shrink-0"
                  style={{ background: "#0F766E" }}
                >
                  <Search size={14} /> Search Bill
                </button>
              </div>
            </div>

            {searchError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded flex items-center gap-2.5 text-red-700 text-[13px]">
                <AlertCircle size={16} className="shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            {processSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded flex items-start justify-between gap-3 text-green-800 text-[13px]">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2
                    size={18}
                    className="text-green-600 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="font-bold text-[14px] text-green-900">
                      {processSuccess}
                    </p>
                    {processedReturn && (
                      <p className="text-[12px] text-green-700 mt-1">
                        Return ID:{" "}
                        <span className="font-mono font-bold">
                          {processedReturn.returnNumber}
                        </span>{" "}
                        · Total Refund:{" "}
                        <span className="font-bold">
                          ₹{processedReturn.refundAmount?.toFixed(2)}
                        </span>{" "}
                        · Modified Bill:{" "}
                        <span className="font-mono font-bold">
                          {processedReturn.modifiedBillNumber}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleResetToReturns}
                    className="px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-gray-100 text-gray-700 font-semibold text-[12px] rounded flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    ← Back to Returns
                  </button>
                  {processedReturn && processedModifiedBill && (
                    <button
                      onClick={() =>
                        setPrintReturnModal({
                          bill: processedModifiedBill,
                          returnRecord: processedReturn,
                        })
                      }
                      className="px-3.5 py-1.5 bg-green-700 hover:bg-green-800 text-white font-semibold text-[12px] rounded flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Printer size={13} /> Print Modified Bill
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Loaded Bill Details & Return Quantities */}
          {searchedBill && (
            <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] shadow-sm overflow-hidden space-y-6">
              {/* Original Bill Info Card */}
              <div className="p-6 bg-[#EDF7F5] border-b border-[#E2E8F0]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                      Original Bill Details
                    </span>
                    <h4 className="text-[18px] font-bold text-[#0F1624] font-mono mt-0.5">
                      {searchedBill.billNumber}
                    </h4>
                    <p className="text-[12px] text-[#64748B]">
                      Billed on{" "}
                      {new Date(searchedBill.createdAt).toLocaleString()} ·
                      Created by {searchedBill.createdBy || "Pharmacist"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-[13px]">
                    <div>
                      <span className="text-[11px] text-[#94A3B8] uppercase block">
                        Patient Name
                      </span>
                      <span className="font-semibold text-[#0F1624]">
                        {searchedBill.patientName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#94A3B8] uppercase block">
                        UHID / UMR
                      </span>
                      <span className="font-mono font-semibold text-[#0F1624]">
                        {searchedBill.uhid}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#94A3B8] uppercase block">
                        Doctor
                      </span>
                      <span className="font-semibold text-[#0F1624]">
                        {searchedBill.doctorName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-[#94A3B8] uppercase block">
                        Original Total
                      </span>
                      <span className="font-bold text-[16px] text-[#0F766E]">
                        ₹
                        {(searchedBill.totalAmount || 0).toLocaleString(
                          "en-IN",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {existingReturnsForSearchedBill.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-[12px] text-amber-800 flex items-center gap-2">
                    <AlertCircle
                      size={14}
                      className="text-amber-600 shrink-0"
                    />
                    <span>
                      Notice: This bill has{" "}
                      {existingReturnsForSearchedBill.length} previous return
                      transaction(s). Only remaining eligible quantities are
                      returnable.
                    </span>
                  </div>
                )}
              </div>

              {/* Medicine Return Table */}
              <div className="px-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-[14px] text-[#0F1624]">
                    Billed Medicines & Return Selection
                  </h4>
                  <span className="text-[12px] text-[#64748B]">
                    Adjust the{" "}
                    <span className="font-semibold text-amber-700">
                      Return Qty
                    </span>{" "}
                    for medicines being returned
                  </span>
                </div>

                <div className="border border-[#E2E8F0] rounded overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#EDF7F5] border-b border-[#E2E8F0]">
                      <tr>
                        <th className="p-3 text-[11px] font-bold text-[#475569] uppercase">
                          Medicine
                        </th>
                        <th className="p-3 text-[11px] font-bold text-[#475569] uppercase">
                          Batch / Exp
                        </th>
                        <th className="p-3 text-[11px] font-bold text-[#475569] uppercase text-center">
                          Orig Qty
                        </th>
                        <th className="p-3 text-[11px] font-bold text-[#475569] uppercase text-center text-gray-500">
                          Prev Ret
                        </th>
                        <th className="p-3 text-[11px] font-bold text-[#475569] uppercase text-center text-blue-700">
                          Eligible
                        </th>
                        <th className="p-3 text-[11px] font-bold text-amber-700 uppercase text-center w-36">
                          Return Qty
                        </th>
                        <th className="p-3 text-[11px] font-bold text-indigo-700 uppercase text-center">
                          Final Qty
                        </th>
                        <th className="p-3 text-[11px] font-bold text-[#475569] uppercase text-right">
                          Unit Price
                        </th>
                        <th className="p-3 text-[11px] font-bold text-amber-700 uppercase text-right">
                          Refund (₹)
                        </th>
                        <th className="p-3 text-[11px] font-bold text-[#475569] uppercase text-right">
                          Final Amt (₹)
                        </th>
                        <th className="p-3 text-[11px] font-bold text-[#475569] uppercase text-center">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {returnCalculations.itemsToReturn.map((item, idx) => {
                        const key = `${item.medicineId}_${item.batchNumber}`
                        const isFullyReturned = item.maxEligible <= 0
                        const isReturning = item.returnQuantity > 0

                        return (
                          <tr key={idx}
                            className={`hover:bg-[#EDF7F5] ${
                              isReturning ? "bg-amber-50/40" : ""
                            }`}
                          >
                            <td className="p-3 text-[13px] font-medium text-[#0F1624]">
                              {item.medicineName}
                            </td>
                            <td className="p-3 text-[12px] font-mono text-[#64748B]">
                              {item.batchNumber}
                              <span className="block text-[10px] text-[#94A3B8]">
                                Exp: {item.expiryDate || "2027-12"}
                              </span>
                            </td>
                            <td className="p-3 text-[13px] text-center font-semibold">
                              {item.originalQuantity}
                            </td>
                            <td className="p-3 text-[13px] text-center text-gray-500 font-semibold">
                              {item.previouslyReturned}
                            </td>
                            <td className="p-3 text-[13px] text-center font-bold text-blue-700">
                              {item.maxEligible}
                            </td>
                            <td className="p-3 text-center">
                              {isFullyReturned ? (
                                <span className="text-[11px] font-semibold text-gray-400 uppercase">
                                  Fully Returned
                                </span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      handleQuantityChange(
                                        key,
                                        item.maxEligible,
                                        item.returnQuantity - 1,
                                      )
                                    }
                                    disabled={item.returnQuantity <= 0}
                                    className="w-7 h-7 flex items-center justify-center rounded border border-[#E2E8F0] bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.maxEligible}
                                    value={item.returnQuantity}
                                    onChange={(e) =>
                                      handleQuantityChange(
                                        key,
                                        item.maxEligible,
                                        parseInt(e.target.value) || 0,
                                      )
                                    }
                                    className="w-14 text-center py-1 border border-[#E2E8F0] rounded font-bold text-[13px] text-amber-700 focus:outline-none focus:border-amber-500"
                                  />
                                  <button
                                    onClick={() =>
                                      handleQuantityChange(
                                        key,
                                        item.maxEligible,
                                        item.returnQuantity + 1,
                                      )
                                    }
                                    disabled={
                                      item.returnQuantity >= item.maxEligible
                                    }
                                    className="w-7 h-7 flex items-center justify-center rounded border border-[#E2E8F0] bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-[13px] text-center font-bold text-indigo-700">
                              {item.finalQuantity}
                            </td>
                            <td className="p-3 text-[13px] text-right font-mono">
                              ₹{item.unitPrice.toFixed(2)}
                            </td>
                            <td className="p-3 text-[13px] text-right font-bold text-amber-700 font-mono">
                              ₹{item.refundAmount.toFixed(2)}
                            </td>
                            <td className="p-3 text-[13px] text-right font-bold text-[#0F1624] font-mono">
                              ₹{item.finalAmount.toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              {!isFullyReturned && (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() =>
                                      handleReturnAll(key, item.maxEligible)
                                    }
                                    className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded hover:bg-amber-200 transition-colors"
                                  >
                                    Return All
                                  </button>
                                  {item.returnQuantity > 0 && (
                                    <button
                                      onClick={() => handleResetLine(key)}
                                      className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recalculation Summary & Actions */}
              <div className="p-6 bg-[#EDF7F5] border-t border-[#E2E8F0]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                        Return Reason *
                      </label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        disabled={Boolean(processedReturn)}
                        className="w-full px-3 py-2.5 rounded border border-[#E2E8F0] text-[13px] bg-white focus:border-[#0F766E] focus:outline-none font-medium disabled:bg-gray-100 disabled:text-gray-500"
                      >
                        <option>Patient not using</option>
                        <option>Wrong medicine dispensed</option>
                        <option>Doctor changed prescription</option>
                        <option>Adverse drug reaction</option>
                        <option>Excess quantity purchased</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">
                        Pharmacist Return Notes (Optional)
                      </label>
                      <textarea
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        disabled={Boolean(processedReturn)}
                        placeholder="Enter verification or inspection notes regarding returned medicines..."
                        rows={2}
                        className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-[13px] bg-white focus:border-[#0F766E] focus:outline-none disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  {/* Financial Comparison */}
                  <div className="bg-white p-4 rounded border border-[#E2E8F0] shadow-sm space-y-2">
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-[#64748B]">
                        Previous Bill Amount:
                      </span>
                      <span className="font-bold text-[#0F1624] font-mono">
                        ₹
                        {returnCalculations.originalTotalAmount.toLocaleString(
                          "en-IN",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[13px] text-amber-700 font-semibold border-t border-dashed border-[#E2E8F0] pt-2">
                      <span className="flex items-center gap-1">
                        <CornerDownRight size={13} /> Difference / Refund
                        Amount:
                      </span>
                      <span className="font-bold text-[15px] font-mono">
                        -₹
                        {returnCalculations.totalRefundAmount.toLocaleString(
                          "en-IN",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[14px] text-indigo-900 font-bold border-t border-[#E2E8F0] pt-2">
                      <span>Modified Bill Amount:</span>
                      <span className="text-[17px] font-mono">
                        ₹
                        {returnCalculations.modifiedTotalAmount.toLocaleString(
                          "en-IN",
                          { minimumFractionDigits: 2 },
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-4">
                  <button
                    onClick={handleResetToReturns}
                    className="px-4 py-2 border border-[#E2E8F0] rounded text-[13px] font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    ← Back to Returns
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleProcessReturn}
                      disabled={
                        returnCalculations.totalRefundAmount <= 0 ||
                        Boolean(processedReturn)
                      }
                      className="px-6 py-2.5 rounded text-white text-[13px] font-bold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: processedReturn ? "#059669" : "#7c3aed",
                      }}
                    >
                      {processedReturn ? (
                        <>
                          <CheckCircle2 size={15} /> Return Processed (
                          {processedReturn.returnNumber})
                        </>
                      ) : (
                        <>
                          <RotateCcw size={15} /> Generate Modified Bill &
                          Process Return
                        </>
                      )}
                    </button>

                    {processedModifiedBill && processedReturn && (
                      <button
                        onClick={() =>
                          setPrintReturnModal({
                            bill: processedModifiedBill,
                            returnRecord: processedReturn,
                          })
                        }
                        className="px-5 py-2.5 rounded text-white text-[13px] font-bold flex items-center gap-2 shadow-sm transition-colors hover:bg-green-700"
                        style={{ background: "#16a34a" }}
                      >
                        <Printer size={15} /> Print Modified Bill
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Recent Returns Audit History */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div>
                <h4 className="font-bold text-[15px] text-[#0F1624]">
                  Recent Returns History
                </h4>
                <p className="text-[12px] text-[#64748B]">
                  Audit trail of all processed medicine returns and credit notes
                </p>
              </div>
              <span className="text-[12px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded">
                Total Returns: {recentReturns.length}
              </span>
            </div>

            {recentReturns.length === 0 ? (
              <div className="p-8 text-center text-[#94A3B8] text-[13px] border border-dashed border-[#E2E8F0] rounded">
                No return transactions have been processed yet.
              </div>
            ) : (
              <div className="border border-[#E2E8F0] rounded overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#EDF7F5] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="p-3 text-[11px] font-bold text-[#475569] uppercase">
                        Return ID
                      </th>
                      <th className="p-3 text-[11px] font-bold text-[#475569] uppercase">
                        Original Bill
                      </th>
                      <th className="p-3 text-[11px] font-bold text-[#475569] uppercase">
                        Modified Bill
                      </th>
                      <th className="p-3 text-[11px] font-bold text-[#475569] uppercase">
                        Patient
                      </th>
                      <th className="p-3 text-[11px] font-bold text-[#475569] uppercase text-center">
                        Items
                      </th>
                      <th className="p-3 text-[11px] font-bold text-amber-700 uppercase text-right">
                        Refund Amount
                      </th>
                      <th className="p-3 text-[11px] font-bold text-[#475569] uppercase">
                        Reason
                      </th>
                      <th className="p-3 text-[11px] font-bold text-[#475569] uppercase">
                        Date
                      </th>
                      <th className="p-3 text-[11px] font-bold text-[#475569] uppercase text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {recentReturns.map((ret) => (
                      <tr key={ret.id} className="hover:bg-[#F0FDFA] transition-colors hover:bg-[#EDF7F5]">
                        <td className="p-3 font-mono text-[12px] font-bold text-amber-700">
                          {ret.returnNumber}
                        </td>
                        <td className="p-3 font-mono text-[12px] font-semibold text-blue-700">
                          {ret.originalBillNumber || ret.originalBillId}
                        </td>
                        <td className="p-3 font-mono text-[12px] font-semibold text-purple-700">
                          {ret.modifiedBillNumber || "-"}
                        </td>
                        <td className="p-3 text-[13px] font-medium text-[#0F1624]">
                          {ret.patientName || "Walk-in Patient"}
                          <span className="block text-[11px] text-[#94A3B8] font-mono">
                            {ret.patientUhid}
                          </span>
                        </td>
                        <td className="p-3 text-[13px] text-center font-bold">
                          {ret.items?.length || ret.returnQuantity || 1}
                        </td>
                        <td className="p-3 text-[13px] text-right font-bold text-amber-700 font-mono">
                          ₹
                          {(ret.refundAmount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="p-3 text-[12px] text-[#475569]">
                          {ret.returnReason}
                        </td>
                        <td className="p-3 text-[12px] text-[#64748B] whitespace-nowrap">
                          {new Date(ret.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handlePrintPastReturn(ret)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-[#E2E8F0] text-[#334155] rounded hover:bg-gray-50 flex items-center gap-1 mx-auto transition-colors"
                          >
                            <Printer size={12} /> Print
                          </button>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handlePrintPastReturn(ret)}
                              title="Print Return Bill"
                              className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-[#E2E8F0] text-[#334155] rounded hover:bg-gray-50 flex items-center gap-1 transition-colors"
                            >
                              <Printer size={12} /> Print
                            </button>
                            <button
                              onClick={() => handleDeleteReturn(ret)}
                              title="Remove from Returns History"
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoice Detail Modal for Sales History */}
      {selectedInv && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.6)" }}
          onClick={() => setSelectedInv(null)}
        >
          <div
            className="bg-white rounded shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
              <div>
                <p className="font-bold text-[16px] text-[#0F1624]">
                  {selectedInv.billNumber}
                </p>
                <p className="text-[12px] text-[#64748B]">
                  {new Date(
                    selectedInv.createdAt || selectedInv.date,
                  ).toLocaleString()}{" "}
                  · {selectedInv.patientName}
                </p>
              </div>
              <button
                onClick={() => setSelectedInv(null)}
                className="p-2 rounded hover:bg-[#F0F2F5] text-[#94A3B8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 py-4 border-b border-[#F0F2F5] grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <span className="text-[#94A3B8]">Pharmacist</span>
                  <p className="font-medium text-[#0F1624]">
                    {selectedInv.createdBy || "Pharmacist"}
                  </p>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Payment</span>
                  <p className="font-medium text-[#0F1624]">
                    {selectedInv.paymentMode || "Cash"}
                  </p>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Items</span>
                  <p className="font-medium text-[#0F1624]">
                    {selectedInv.items?.length || 0}
                  </p>
                </div>
                <div>
                  <span className="text-[#94A3B8]">Status</span>
                  <StatusBadge status="completed" size="sm" />
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-[#EDF7F5]">
                  <tr>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase">
                      Medicine
                    </th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase">
                      Qty
                    </th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase">
                      MRP
                    </th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase">
                      Disc%
                    </th>
                    <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {(selectedInv.items || []).map((item: any, i: number) => {
                    const qty = item.qty || item.quantity || 0
                    const mrp = item.mrp || item.unitPrice || 0
                    const discount = item.discount || 0
                    const total = qty * mrp * (1 - discount / 100)
                    return (
                      <tr className="hover:bg-[#F0FDFA] transition-colors" key={i}>
                        <td className="px-5 py-3 text-[13px] font-medium text-[#0F1624]">
                          {item.medicine || item.medicineName}
                        </td>
                        <td className="px-5 py-3 text-[13px]">{qty}</td>
                        <td className="px-5 py-3 text-[13px]">
                          ₹{mrp.toFixed(2)}
                        </td>
                        <td className="px-5 py-3 text-[13px] text-[#d97706]">
                          {discount}%
                        </td>
                        <td className="px-5 py-3 text-[13px] font-semibold text-right">
                          ₹{total.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-5 py-4 border-t border-[#F0F2F5] flex justify-end">
                <div className="text-right">
                  <p className="text-[12px] text-[#64748B]">Grand Total</p>
                  <p className="text-[20px] font-bold text-[#0F1624]">
                    ₹
                    {(selectedInv.totalAmount || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#E2E8F0] flex gap-3">
              <button
                onClick={() => {
                  setPrintInv(selectedInv)
                  setSelectedInv(null)
                }}
                className="flex items-center gap-1.5 flex-1 py-2.5 rounded border border-[#E2E8F0] text-[13px] font-medium text-[#334155] hover:bg-[#F5F7FA] transition-colors justify-center"
              >
                <Printer size={13} /> Print / Download
              </button>
              {!selectedInv.billNumber?.startsWith("MOD-") && (
                <button
                  onClick={() => {
                    setSelectedInv(null)
                    handleStartReturnFromSales(selectedInv)
                  }}
                  className="flex-1 py-2.5 rounded text-white font-semibold text-[13px] transition-colors"
                  style={{ background: "#7c3aed" }}
                >
                  Process Return
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
