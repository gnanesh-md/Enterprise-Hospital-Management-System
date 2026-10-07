import { usePharmacyData } from "../data/usePharmacyData"
import { useState, useEffect } from "react"
import {
  Search,
  X,
  Plus,
  Minus,
  Printer,
  CreditCard,
  Smartphone,
  Wallet,
  Trash2,
  ChevronDown,
  CheckCircle,
  RefreshCw,
  QrCode,
  Play,
} from "lucide-react"
import { PharmacyDatabase } from "../../../services/pharmacyDb"
import PageHeader from "../components/PageHeader"
import InvoicePrintModal from "../components/InvoicePrintModal"

const paymentMethods = [
  { id: "cash", label: "Cash", icon: Wallet },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
]

function numberToWords(num: number): string {
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
    str += numberToWords(Math.floor(num / 10000000)) + "Crore "
    num %= 10000000
  }
  if (num >= 100000) {
    str += numberToWords(Math.floor(num / 100000)) + "Lakh "
    num %= 100000
  }
  if (num >= 1000) {
    str += numberToWords(Math.floor(num / 1000)) + "Thousand "
    num %= 1000
  }
  if (num >= 100) {
    str += numberToWords(Math.floor(num / 100)) + "Hundred "
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

interface DispensingProps {
  onNavigate: (page: string) => void
}

export default function Dispensing({ onNavigate }: DispensingProps) {
  const { medicines, bills } = usePharmacyData()
  const [searchQuery, setSearchQuery] = useState("")
  const [cart, setCart] = useState<any[]>([])

  const [activeTab, setActiveTab] = useState<"new_sale" | "sales_history">(
    "new_sale",
  )
  const [historySearch, setHistorySearch] = useState("")
  const [printBill, setPrintBill] = useState<any>(null)

  const [payments, setPayments] = useState<Record<string, number>>({})
  const [paymentRefs, setPaymentRefs] = useState<Record<string, string>>({})
  const [tenderedCash, setTenderedCash] = useState<number>(0)

  const [patientName, setPatientName] = useState("")
  const [posStatus, setPosStatus] = useState<string | null>(null)
  const [rxId, setRxId] = useState("")
  const [discount, setDiscount] = useState(0)

  const [showInvoice, setShowInvoice] = useState(false)
  const [lastBillId, setLastBillId] = useState<any>("")
  const [printDate, setPrintDate] = useState("")
  const [loadedRxMeta, setLoadedRxMeta] = useState<any>(null)
  const [showUpiQrModal, setShowUpiQrModal] = useState(false)
  const [hospitalUpiId, setHospitalUpiId] = useState(() => {
    const saved = localStorage.getItem("hospai_pharmacy_upi_id")
    if (!saved || saved === "vhpharmacy@sbi") {
      localStorage.setItem("hospai_pharmacy_upi_id", "8790689532@ibl")
      return "8790689532@ibl"
    }
    return saved
  })
  const [isEditingUpiId, setIsEditingUpiId] = useState(false)
  const [paymentToast, setPaymentToast] = useState<{
    show: boolean
    title: string
    message: string
    amount: number
    ref: string
  } | null>(null)

  const playPaymentChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12) // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.log("Audio not supported or blocked by user gesture:", e)
    }
  }

  const confirmUpiPayment = (targetAmt?: number, enteredUtr?: string) => {
    const amt = targetAmt !== undefined ? Number(targetAmt) : (payments["upi"] || (balanceDue > 0 ? balanceDue : finalAmount) || 1)
    const ref = enteredUtr?.trim() || paymentRefs["upi"]?.trim() || "CASHIER_VERIFIED"

    setPayments((prev) => ({ ...prev, upi: amt }))
    setPaymentRefs((prev) => ({ ...prev, upi: ref }))
    setShowUpiQrModal(false)

    // Play chime sound
    playPaymentChime()

    // Show floating toast
    setPaymentToast({
      show: true,
      title: `₹${amt.toFixed(2)} UPI Payment Recorded!`,
      message: `Received on ${hospitalUpiId}. Ref: ${ref}. Deducted from bill.`,
      amount: amt,
      ref,
    })

    // Store notification in database
    try {
      PharmacyDatabase.addNotification(
        `UPI Payment Received: ₹${amt.toFixed(2)}`,
        `Received ₹${amt.toFixed(2)} on ${hospitalUpiId} for ${patientName || "Mr. G KUMAR"}. Ref: ${ref}`,
        "success",
      )
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    } catch (e) {
      console.error(e)
    }

    setTimeout(() => {
      setPaymentToast(null)
    }, 6000)
  }

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    const savedRx = localStorage.getItem("_v2_pharmacy_dispense_rx")
    if (savedRx) {
      setRxId(savedRx)
      localStorage.removeItem("_v2_pharmacy_dispense_rx")
      setTimeout(() => autoLoadRx(savedRx), 100)
    }
  }, [])

  const autoLoadRx = (targetRxId: string) => {
    const prescriptions = PharmacyDatabase.getPrescriptions()
    const rx = prescriptions.find((p) => p.id === targetRxId)
    if (!rx) return

    setLoadedRxMeta(rx)
    setPatientName(rx.patientName)

    const newCart: any[] = []
    const allMedicines = PharmacyDatabase.getMedicines()

    const outOfStock: string[] = []
    const notFound: string[] = []

    rx.items?.forEach((item) => {
      let med = allMedicines.find((m) => m.id === item.medicineId)
      if (!med) {
        med = allMedicines.find(
          (m) =>
            m.medicineName.toLowerCase() === item.medicineName.toLowerCase() ||
            m.brandName?.toLowerCase() === item.medicineName.toLowerCase(),
        )
      }
      if (!med) {
        // Looser fallback: match partial names like "Amoxicillin" matching "Amoxicillin 500mg"
        med = allMedicines.find(
          (m) =>
            m.medicineName
              .toLowerCase()
              .includes(item.medicineName.toLowerCase()) ||
            item.medicineName
              .toLowerCase()
              .includes(m.medicineName.toLowerCase()),
        )
      }

      if (!med) {
        notFound.push(item.medicineName)
        return
      }
      const batches = PharmacyDatabase.getBatches().filter(
        (b) => b.medicineId === med.id,
      )
      let { splits } = PharmacyDatabase.executeFEFOSplit(
        med.id,
        item.quantity,
        batches,
      )

      if (splits.length === 0 && batches.some((b) => b.availableQuantity > 0)) {
        const available = batches
          .filter((b) => b.availableQuantity > 0)
          .sort(
            (a, b) =>
              new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
          )
        let remaining = item.quantity
        for (const b of available) {
          if (remaining <= 0) break
          const take = Math.min(b.availableQuantity, remaining)
          splits.push({ batch: b, usedQty: take })
          remaining -= take
        }
      }

      if (splits.length === 0) {
        outOfStock.push(item.medicineName)
      }

      splits.forEach((split) => {
        const b = split.batch
        newCart.push({
          id: Date.now() + Math.random(),
          medicineId: med.id,
          batchId: b.id,
          medicine: med.brandName || med.medicineName,
          generic: med.genericName,
          batch: b.batchNumber,
          expiry: b.expiryDate,
          qty: split.usedQty,
          mrp: b.mrp,
          discount: 0,
          tax: med.taxPercentage ?? 5,
          hsnCode: med.hsnCode || "3004 039",
          mnf: (med as any).mnfCode || (med.manufacturer ? med.manufacturer.substring(0, 3).toUpperCase() : "MAN"),
          sh: med.scheduleType || "H",
          binNo: (b as any).location || (med as any).binNo || "",
          total: b.mrp * split.usedQty * (1 + (med.taxPercentage ?? 5) / 100),
        })
      })
    })
    setCart(newCart)

    if (outOfStock.length > 0 || notFound.length > 0) {
      let msg = "Could not load all items from prescription:\n\n"
      if (outOfStock.length > 0)
        msg += `Out of Stock (Need GRN): ${outOfStock.join(", ")}\n`
      if (notFound.length > 0)
        msg += `Not in Medicine Master: ${notFound.join(", ")}\n`
      alert(msg)
    }
  }

  const loadPrescriptionFEFO = () => {
    if (!rxId) return alert("Enter Prescription ID")
    autoLoadRx(rxId)
  }

  const filteredMeds =
    searchQuery.length > 1
      ? medicines
          .filter(
            (m) =>
              m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              m.generic.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .slice(0, 6)
      : []

  const subtotal = cart.reduce((s, i) => s + i.mrp * i.qty, 0)
  const discountAmt = (subtotal * discount) / 100
  // Calculate exact GST splits for invoice based on each item
  let totalCGST = 0
  let totalSGST = 0
  cart.forEach((item) => {
    const taxable =
      item.mrp * item.qty - (item.mrp * item.qty * (item.discount || 0)) / 100
    const taxTotal = taxable * (item.tax / 100)
    totalCGST += taxTotal / 2
    totalSGST += taxTotal / 2
  })

  const grand = subtotal - discountAmt + totalCGST + totalSGST
  const roundOff = Math.round(grand) - grand
  const finalAmount = Math.round(grand)

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              qty: Math.max(1, i.qty + delta),
              total:
                Math.max(1, i.qty + delta) *
                i.mrp *
                (1 - (i.discount || 0) / 100) *
                (1 + (i.tax || 0) / 100),
            }
          : i,
      ),
    )
  }
  const removeItem = (id: number) =>
    setCart((prev) => prev.filter((i) => i.id !== id))

  const addMedicine = (med: typeof medicines[0]) => {
    const exists = cart.find((i) => i.medicine === med.name)
    if (exists) {
      updateQty(exists.id, 1)
      return
    }

    // Use FEFO (First Expiry First Out) to pick the oldest batch
    const allBatches = PharmacyDatabase.getBatches().filter(
      (b) => b.medicineId === med.id && b.availableQuantity > 0,
    )
    const sortedBatches = allBatches.sort(
      (a, b) =>
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    )

    const b = sortedBatches[0]
    if (!b) {
      alert("No stock available for this medicine!")
      return
    }

    const taxPct = med.gst !== undefined ? med.gst : 5
    const itemMrp = b.mrp || med.mrp || 0

    const newItem = {
      id: Date.now() + Math.random(),
      medicineId: med.id,
      batchId: b.id,
      medicine: med.name,
      generic: med.generic,
      batch: b.batchNumber,
      expiry: b.expiryDate,
      qty: 1,
      mrp: itemMrp,
      discount: 0,
      tax: taxPct,
      hsnCode: (med as any).hsnCode || med.sku || "3004 039",
      mnf: (med as any).mnfCode || (med.manufacturer ? med.manufacturer.substring(0, 3).toUpperCase() : "MAN"),
      sh: med.schedule || "H",
      binNo: (b as any).location || (med as any).binNo || "",
      total: itemMrp * (1 + taxPct / 100),
    }
    setCart((prev) => [...prev, newItem])
    setSearchQuery("")
  }

  const totalPaid = Object.values(payments).reduce(
    (a, b) => a + (Number(b) || 0),
    0,
  )
  const balanceDue = finalAmount - totalPaid
  const isPaid = balanceDue <= 0 && finalAmount > 0

  const confirmCardPayment = (amount: number, refCode?: string) => {
    const amt = Number(amount) || (balanceDue > 0 ? balanceDue : finalAmount) || 1
    const ref = refCode || "AUTH_" + Math.floor(100000 + Math.random() * 900000)

    setPayments((prev) => ({ ...prev, card: amt }))
    setPaymentRefs((prev) => ({ ...prev, card: ref }))

    // Play chime sound
    playPaymentChime()

    // Show floating toast
    setPaymentToast({
      show: true,
      title: `₹${amt.toFixed(2)} Card Payment Approved!`,
      message: `Card terminal transaction approved. Auth Code: ${ref}. Deducted from bill.`,
      amount: amt,
      ref,
    })

    // Store notification in database
    try {
      PharmacyDatabase.addNotification(
        `Card Payment Received: ₹${amt.toFixed(2)}`,
        `Received ₹${amt.toFixed(2)} via Debit/Credit Card for ${patientName || "Mr. G KUMAR"}. Auth: ${ref}`,
        "success",
      )
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    } catch (e) {
      console.error(e)
    }

    setTimeout(() => {
      setPaymentToast(null)
    }, 6000)
  }

  const handlePhysicalPOSPayment = (amount: number) => {
    setPosStatus("Connecting to POS Terminal (192.168.1.100)...")

    // Simulate network delay to POS machine
    setTimeout(
      () => {
        setPosStatus("Waiting for Patient to Swipe/Tap Card...")

        // Simulate patient swiping card and POS sending webhook back
        setTimeout(
          () => {
            setPosStatus("Approved!")
            const authRef = "POS_AUTH_" + Math.floor(100000 + Math.random() * 900000)
            confirmCardPayment(amount, authRef)

            // Clear status after 2 seconds
            setTimeout(() => setPosStatus(null), 2000)
          },
          2500,
        )
      },
      800,
    )
  }

  const handleRazorpayPayment = (method: string, amount: number) => {
    if (!(window as any).Razorpay) {
      alert(
        "Payment Gateway failed to load. Please check your internet connection.",
      )
      return
    }

    const options = {
      key: "rzp_test_TYrv3Z5h61z8uC", // Global Hospital Test Key
      amount: Math.round(amount * 100), // Convert INR to Paisa
      currency: "INR",
      name: "Global Hospital Pharmacy",
      description: "Pharmacy Bill Payment",
      image: "https://cdn-icons-png.flaticon.com/512/3063/3063126.png",
      handler: function (response: any) {
        // Success callback triggered instantly by bank webhook
        confirmCardPayment(amount, response.razorpay_payment_id)
      },
      prefill: {
        name: patientName || "Walk-in Patient",
      },
      theme: {
        color: "#0F766E",
      },
    }

    const rzp1 = new (window as any).Razorpay(options)
    rzp1.on("payment.failed", function (response: any) {
      alert("Payment Failed! " + response.error.description)
    })
    rzp1.open()
  }
  const completeTransaction = () => {
    if (cart.length === 0) return

    // Real-world sequential bill ID generation
    const allBills = PharmacyDatabase.getBills()
    const year = new Date().getFullYear()
    const currentYearBills = allBills.filter((b) =>
      b.billNumber.startsWith(`BILL-${year}-`),
    )

    let nextSeq = 1
    if (currentYearBills.length > 0) {
      const sequences = currentYearBills
        .map((b) => {
          const parts = b.billNumber.split("-")
          return parts.length === 3 ? parseInt(parts[2], 10) : 0
        })
        .filter((n) => !isNaN(n))

      if (sequences.length > 0) {
        nextSeq = Math.max(...sequences) + 1
      }
    }

    const seqString = String(nextSeq).padStart(6, "0")
    const billId = `BILL-${year}-${seqString}`
    setLastBillId(billId)
    setPrintDate(new Date().toLocaleString())

    // Fetch prescription metadata to link the patient history globally
    let rxMeta = null
    if (rxId) {
      rxMeta = PharmacyDatabase.getPrescriptions().find((p) => p.id === rxId)
    }

    // Update DB
    const bill = {
      id: billId,
      billNumber: billId,
      patientId: rxMeta?.patientId || "WALK-IN",
      patientName: patientName || "Walk-in Patient",
      uhid: rxMeta?.uhid || "",
      doctorName: rxMeta?.doctorName || "Self",
      department: rxMeta?.department || "Pharmacy",
      billType: "Cash",
      paymentStatus: "Paid",
      paymentMode:
        Object.keys(payments).length > 0
          ? Object.keys(payments).join(",")
          : "Cash",
      paymentsData: { amounts: payments, refs: paymentRefs },
      prescriptionId: rxId || undefined,
      items: cart.map((c: any) => ({
        medicineId: c.medicineId,
        medicineName: c.medicine,
        batchNumber: c.batch,
        expiryDate: c.expiry,
        quantity: c.qty,
        unitPrice: c.mrp,
        grossAmount: c.qty * c.mrp,
        discount: c.discount || 0,
        hsnCode: c.hsnCode || "3004 039",
        mnf: c.mnf || "MAN",
        sh: c.sh || "H",
        binNo: c.binNo || "",
        taxableAmount: c.total - c.total * (c.tax / (100 + c.tax)),
        cgstAmount: (c.total * (c.tax / (100 + c.tax))) / 2,
        sgstAmount: (c.total * (c.tax / (100 + c.tax))) / 2,
        tax: c.tax,
        totalPrice: c.total,
      })),
      subTotal: subtotal,
      discount: discountAmt,
      tax: totalCGST + totalSGST,
      taxableTotal: subtotal - discountAmt,
      cgstTotal: totalCGST,
      sgstTotal: totalSGST,
      totalAmount: finalAmount,
      totalPaid: totalPaid,
      balanceDue: Math.max(0, balanceDue),
      createdBy: "Pharmacist",
      createdAt: new Date().toISOString(),
    }

    PharmacyDatabase.addPharmacyBill(bill as any)
    setLastBillId(bill) // Pass the whole bill object to the modal

    // Update Batches
    const currentBatches = PharmacyDatabase.getBatches()
    cart.forEach((c) => {
      const b = currentBatches.find((bat) => bat.id === c.batchId)
      if (b) {
        b.availableQuantity -= c.qty
        PharmacyDatabase.updateBatch(b.id, b)

        PharmacyDatabase.addTransaction({
          id: "TXN" + Math.floor(Math.random() * 100000),
          date: new Date().toISOString(),
          medicineId: c.medicineId,
          batchId: c.batchId,
          quantity: c.qty,
          transactionType: "DISPENSED",
          userId: "Pharmacist",
          billId: billId,
        })
      }
    })

    if (rxId) {
      PharmacyDatabase.updatePrescription(rxId, {
        status: isPaid ? "Dispensed" : "Processing",
        dispensingStatus: isPaid ? "Dispensed" : "Partially Dispensed",
        paidAmount: totalPaid,
        remainingDue: Math.max(0, balanceDue),
      } as any)
    }

    PharmacyDatabase.logAudit(
      "Pharmacist (You)",
      "Created",
      "Billing",
      billId,
      "Created bill for " + finalAmount,
    )

    // Push real-time notification for sale & dispense completion
    try {
      PharmacyDatabase.addNotification(
        `Sale & Dispense Completed (${billId})`,
        `Successfully dispensed ${cart.length} item(s) for ${patientName || "Walk-in Patient"}. Bill Total: ₹${finalAmount.toFixed(2)} (Paid: ₹${totalPaid.toFixed(2)}${balanceDue > 0 ? `, Due: ₹${balanceDue.toFixed(2)}` : ""}) via ${bill.paymentMode}.`,
        "success",
      )
      window.dispatchEvent(new CustomEvent("hospai_pharmacy_updated"))
    } catch (e) {
      console.error(e)
    }

    playPaymentChime()
    setPaymentToast({
      show: true,
      title: `Transaction Completed (${billId})`,
      message: `Dispensed ${cart.length} item(s) for ${patientName || "Mr. G KUMAR"}. Bill Total: ₹${finalAmount.toFixed(2)}.`,
      amount: finalAmount,
      ref: billId,
    })

    setShowInvoice(true)
  }

  const closeInvoice = () => {
    setShowInvoice(false)
    setCart([])
    setRxId("")
    setPatientName("")
    setPayments({})
    setPaymentRefs({})
    setTenderedCash(0)
    setDiscount(0)
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Real-time Payment Success Notification Toast */}
      {paymentToast && (
        <div className="fixed top-5 right-5 z-[9999] max-w-md w-full bg-white border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={22} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-[14px] font-bold text-emerald-900">
                {paymentToast.title}
              </h4>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                REAL-TIME
              </span>
            </div>
            <p className="text-[12px] text-emerald-700 mt-0.5">
              {paymentToast.message}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200">
              <span>Ref / UTR: <strong>{paymentToast.ref}</strong></span>
              <span className="ml-auto font-bold text-emerald-700">Deducted from Bill ✓</span>
            </div>
          </div>
          <button
            onClick={() => setPaymentToast(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Invoice Modal Overlay */}
      {showInvoice && lastBillId && (
        <InvoicePrintModal bill={lastBillId as any} onClose={closeInvoice} />
      )}

      {printBill && (
        <InvoicePrintModal
          bill={printBill}
          onClose={() => setPrintBill(null)}
        />
      )}

      {/* Main Container */}

      <div className="flex-1 flex flex-col overflow-hidden print:hidden bg-[#F8FAFC]">
        <div className="p-6 pb-0">
          <PageHeader
            breadcrumbs={[
              { label: "Pharmacy" },
              { label: "Dispensing & Billing" },
            ]}
            title="Dispensing & Billing"
            description={
              activeTab === "new_sale" ? "New sale · POS" : "Past transactions"
            }
            actions={
              <div className="flex rounded border border-[#E2E8F0] overflow-hidden text-[13px]">
                <button
                  onClick={() => setActiveTab("new_sale")}
                  className="px-5 py-2 font-medium transition-colors"
                  style={{
                    background: activeTab === "new_sale" ? "#0F1624" : "#fff",
                    color: activeTab === "new_sale" ? "#fff" : "#64748B",
                  }}
                >
                  New Sale
                </button>
                <button
                  onClick={() => setActiveTab("sales_history")}
                  className="px-5 py-2 font-medium transition-colors"
                  style={{
                    background:
                      activeTab === "sales_history" ? "#0F1624" : "#fff",
                    color: activeTab === "sales_history" ? "#fff" : "#64748B",
                  }}
                >
                  Sales History
                </button>
              </div>
            }
            onNavigate={onNavigate}
          />
        </div>

        {activeTab === "sales_history" ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                <h3 className="font-bold text-[15px] text-[#0F1624]">
                  Completed Transactions
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("hospai_pharmacy_toast", {
                          detail: { message: "Customer Add modal opened!" },
                        }),
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] text-[12px] font-medium text-[#334155] hover:bg-[#F5F7FA]"
                  >
                    <Plus size={14} /> Add Customer
                  </button>
                  <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded px-3 py-1.5 w-64">
                    <Search size={14} className="text-[#94A3B8]" />
                    <input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search bill no or patient..."
                      className="text-[13px] outline-none text-[#0F1624] placeholder:text-[#94A3B8] flex-1"
                    />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setActiveTab("new_sale")
                    closeInvoice()
                  }}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded text-[13px] font-semibold text-[#1B4FD8] bg-[#EFF6FF] hover:bg-[#DBEAFE] transition-colors"
                >
                  <Plus size={14} /> New Sale
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#F8FAFC] sticky top-0 border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider">
                        Bill No
                      </th>
                      <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider text-right">
                        Total (₹)
                      </th>
                      <th className="px-5 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {bills
                      .filter(
                        (b) =>
                          !historySearch ||
                          b.billNumber.includes(historySearch) ||
                          b.patientName
                            .toLowerCase()
                            .includes(historySearch.toLowerCase()),
                      )
                      .map((inv, i) => {
                        const isModified =
                          inv.isModifiedReturnBill ||
                          inv.billNumber?.startsWith("MOD-")
                        const billReturns = PharmacyDatabase.getReturnsForBill(
                          inv.billNumber,
                        )
                        const hasReturns = billReturns.length > 0
                        const totalRefunded = billReturns.reduce(
                          (s, r) => s + (r.refundAmount || 0),
                          0,
                        )

                        return (
                          <tr
                            key={i}
                            className="hover:bg-[#F0FDFA] transition-colors"
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[12px] font-semibold text-[#0F766E]">
                                  {inv.billNumber}
                                </span>
                                {isModified && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 font-bold rounded">
                                    MODIFIED
                                  </span>
                                )}
                                {hasReturns && !isModified && (
                                  <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 font-bold rounded">
                                    RETURN PROCESSED
                                  </span>
                                )}
                              </div>
                              {isModified && inv.originalBillNumber && (
                                <span className="block text-[11px] text-[#94A3B8] font-mono">
                                  Original: {inv.originalBillNumber}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-[12px] text-[#64748B]">
                              {new Date(
                                inv.createdAt ||
                                  (inv as any).date ||
                                  (inv as any).billDate,
                              ).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 font-medium text-[13px] text-[#0F1624]">
                              {inv.patientName}
                            </td>
                            <td className="px-5 py-3 text-[13px] text-center">
                              {inv.items ? inv.items.length : 0}
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#E8EDF5] text-[#0F766E]">
                                {inv.paymentMode || "Cash"}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-[13px] font-bold text-[#0F1624] text-right">
                              <div>
                                ₹
                                {(inv.totalAmount || 0).toLocaleString(
                                  "en-IN",
                                  {
                                    minimumFractionDigits: 2,
                                  },
                                )}
                              </div>
                              {hasReturns && !isModified && (
                                <div className="text-[11px] text-red-500 font-normal">
                                  -₹
                                  {totalRefunded.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                  })}{" "}
                                  refund
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => setPrintBill(inv)}
                                className="p-1.5 rounded bg-white border border-[#E2E8F0] hover:bg-[#F0F2F5] text-[#475569] transition-colors inline-flex items-center justify-center shadow-xs"
                              >
                                <Printer size={14} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    {bills.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-12 text-[#94A3B8] text-[13px]"
                        >
                          No sales recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 flex flex-col">
            {/* Patient / Rx Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-5 flex gap-4 items-end hover:shadow-md transition-shadow">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Prescription ID
                  </label>
                  <input
                    value={rxId}
                    onChange={(e) => setRxId(e.target.value)}
                    placeholder="e.g. RX-2026-1041"
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-[13px] text-[#0F1624] focus:border-[#0F766E] focus:outline-none transition-colors bg-[#F5F7FA] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1">
                    Patient Name
                  </label>
                  <input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[#E2E8F0] text-[13px] text-[#0F1624] focus:border-[#0F766E] focus:outline-none transition-colors bg-[#F5F7FA] focus:bg-white"
                  />
                </div>
              </div>
              <button
                onClick={loadPrescriptionFEFO}
                className="bg-[#0F766E] text-white px-5 py-2 h-[42px] rounded-lg text-[13px] font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all whitespace-nowrap"
              >
                Load Rx & Auto-Allocate
              </button>
            </div>

            {/* Medicine Search */}
            <div className="relative">
              <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-[#E2E8F0] px-5 py-3 focus-within:border-[#0F766E] focus-within:ring-4 focus-within:ring-[#0F766E]/10 transition-all">
                <Search size={16} className="text-[#64748B] flex-shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medicine by name, generic, SKU or scan barcode..."
                  className="flex-1 text-[14px] text-[#0F1624] outline-none placeholder:text-[#94A3B8]"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    <X size={14} className="text-[#94A3B8]" />
                  </button>
                )}
              </div>
              {filteredMeds.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-xl border border-[#E2E8F0] shadow-2xl overflow-hidden">
                  {filteredMeds.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addMedicine(m)}
                      className="w-full flex items-center px-4 py-3 hover:bg-[#F5F7FA] transition-colors border-b border-[#F0F2F5] last:border-0"
                    >
                      <div className="flex-1 text-left">
                        <p className="text-[13px] font-semibold text-[#0F1624]">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          {m.generic} · {m.form} · {m.manufacturer}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-[13px] font-bold text-[#0F1624]">
                          ₹{m.mrp}
                        </p>
                        <p
                          className="text-[11px]"
                          style={{
                            color:
                              m.stock > 50
                                ? "#15803d"
                                : m.stock > 0
                                  ? "#d97706"
                                  : "#dc2626",
                          }}
                        >
                          {m.stock > 0 ? `Stock: ${m.stock}` : "Out of stock"}
                        </p>
                      </div>
                      <div
                        className="ml-3 w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: "#E8EDF5" }}
                      >
                        <Plus size={14} style={{ color: "#0F766E" }} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
              <table>
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left px-5 py-4 bg-[#F8FAFC] text-[12px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                      Medicine
                    </th>
                    <th className="text-left px-5 py-4 bg-[#F8FAFC] text-[12px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                      Batch
                    </th>
                    <th className="text-left px-5 py-4 bg-[#F8FAFC] text-[12px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                      Expiry
                    </th>
                    <th className="text-center px-5 py-4 bg-[#F8FAFC] text-[12px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                      Qty
                    </th>
                    <th className="text-right px-5 py-4 bg-[#F8FAFC] text-[12px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                      MRP (₹)
                    </th>
                    <th className="text-center px-5 py-4 bg-[#F8FAFC] text-[12px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                      Tax%
                    </th>
                    <th className="text-right px-5 py-4 bg-[#F8FAFC] text-[12px] font-extrabold text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                      Total (₹)
                    </th>
                    <th className="px-5 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-12 text-center text-[#94A3B8]"
                      >
                        <Search size={28} className="mx-auto mb-2 opacity-40" />
                        <p className="font-medium">No medicines added</p>
                        <p className="text-[12px] mt-1">
                          Search or Load Rx above
                        </p>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, i) => (
                      <tr key={i} className="hover:bg-[#F0FDFA] transition-colors border-b border-[#E2E8F0] last:border-0 hover:bg-[#F5F7FA]"
                      >
                        <td className="px-5 py-4 font-medium text-[13px] text-[#0F1624]">
                          {item.medicine}
                        </td>
                        <td className="px-5 py-4 text-[#64748B] font-mono text-[12px]">
                          {item.batch}
                        </td>
                        <td className="px-5 py-4 text-[#64748B] text-[13px]">
                          {item.expiry}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="p-1 hover:bg-[#DDE2EC] rounded text-[#64748B]"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-medium text-[13px] text-[#0F1624]">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="p-1 hover:bg-[#DDE2EC] rounded text-[#64748B]"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-[13px] text-[#0F1624]">
                          {(item.mrp || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-center text-[13px] text-[#0F1624]">
                          {item.tax || 0}%
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-[13px] text-[#0F1624]">
                          {(item.total || 0).toFixed(2)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-[#94A3B8] hover:text-[#dc2626] transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Right: Payment summary (Only shown in New Sale tab) */}
      {activeTab === "new_sale" && (
        <div className="w-[420px] bg-white border-l border-[#E2E8F0] shadow-[-10px_0_40px_rgba(0,0,0,0.04)] flex flex-col print:hidden z-10">
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <h3 className="font-black text-[18px] text-[#0F1624] tracking-tight">
              Payment Summary
            </h3>
          </div>

          <div className="p-5 space-y-4 flex-1 overflow-y-auto">
            {/* Bill Breakup */}
            <div className="space-y-3 bg-[#F8FAFC] p-6 rounded-2xl border border-[#E2E8F0]">
              <div className="flex justify-between text-[13px] text-[#475569]">
                <span>Subtotal</span>
                <span className="font-medium text-[#0F1624]">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-[13px] text-[#475569]">
                <span>Discount</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-12 px-2 py-1 text-right border border-[#E2E8F0] bg-white text-[#0F1624] focus:border-[#0F766E] focus:outline-none"
                  />
                  <span className="text-[#94A3B8]">%</span>
                  <span className="font-medium text-[#16a34a]">
                    -₹{discountAmt.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-[13px] text-[#475569]">
                <span>CGST</span>
                <span className="font-medium text-[#0F1624]">
                  ₹{totalCGST.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[13px] text-[#475569]">
                <span>SGST</span>
                <span className="font-medium text-[#0F1624]">
                  ₹{totalSGST.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[13px] text-[#475569]">
                <span>Round Off</span>
                <span className="font-medium text-[#0F1624]">
                  ₹{roundOff > 0 ? "+" : ""}
                  {roundOff.toFixed(2)}
                </span>
              </div>

              <div className="h-px bg-[#DDE2EC] my-3"></div>

              {/* Live Real-time Payment & Balance Due Summary */}
              <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#64748B] font-medium">Total Bill Amount:</span>
                  <span className="font-bold text-[#0F1624] text-[15px]">₹{finalAmount.toFixed(2)}</span>
                </div>

                {totalPaid > 0 && (
                  <div className="flex justify-between items-center text-[13px] text-[#047857] font-bold bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Deducted / Paid {payments["upi"] ? `(UPI: ₹${Number(payments["upi"]).toFixed(2)})` : ""}{payments["card"] ? ` (Card: ₹${Number(payments["card"]).toFixed(2)})` : ""}{payments["cash"] ? ` (Cash: ₹${Number(payments["cash"]).toFixed(2)})` : ""}:
                    </span>
                    <span className="text-[14px] font-mono">- ₹{totalPaid.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-[#E2E8F0]">
                  <div>
                    <span className="text-[12px] font-bold text-[#334155] uppercase tracking-wide block">
                      {balanceDue <= 0 ? "Payment Status" : "Remaining to Pay"}
                    </span>
                    {balanceDue > 0 && (
                      <span className="text-[10px] text-[#64748B]">After deducting paid ₹{totalPaid.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-[28px] font-black leading-none ${balanceDue <= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {balanceDue <= 0 ? "PAID ✓" : `₹${balanceDue.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Allocation */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">
                  Payment Allocation
                </label>
                <span className="text-[12px] font-bold text-[#dc2626]">
                  Balance: ₹{Math.max(0, balanceDue).toFixed(2)}
                </span>
              </div>

              <div className="space-y-3">
                {/* Cash */}
                <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center gap-2 bg-[#F8FAFC] p-3 border-b border-[#E2E8F0]">
                    <Wallet size={16} className="text-[#1B4FD8]" />
                    <span className="text-[13px] font-semibold text-[#0F1624]">
                      Cash
                    </span>
                  </div>
                  <div className="p-3 bg-white space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] text-[#475569]">
                          Paying (₹)
                        </span>
                        {balanceDue > 0 && (
                          <button
                            type="button"
                            onClick={() => setPayments((p) => ({ ...p, cash: balanceDue }))}
                            className="text-[10px] text-[#1B4FD8] font-semibold hover:underline"
                          >
                            (Fill Balance ₹{balanceDue.toFixed(2)})
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        value={payments["cash"] || ""}
                        onChange={(e) =>
                          setPayments((p) => ({
                            ...p,
                            cash: Number(e.target.value),
                          }))
                        }
                        className="w-24 px-2 py-1 text-right text-[13px] border border-[#E2E8F0] focus:border-[#1B4FD8] outline-none rounded font-bold"
                        placeholder="0.00"
                      />
                    </div>
                    {payments["cash"] > 0 && (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F0F2F5]">
                        <span className="text-[12px] text-[#475569]">
                          Tendered
                        </span>
                        <input
                          type="number"
                          value={tenderedCash || ""}
                          onChange={(e) =>
                            setTenderedCash(Number(e.target.value))
                          }
                          className="w-24 px-2 py-1 text-right text-[13px] border border-[#E2E8F0] focus:border-[#1B4FD8] outline-none rounded"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                    {tenderedCash > 0 && payments["cash"] > 0 && (
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="text-[#64748B] font-medium uppercase tracking-wide">
                          Change Due:
                        </span>
                        <span className="text-[16px] font-black text-[#16a34a] bg-[#DCFCE7] px-2 py-0.5 rounded">
                          ₹
                          {Math.max(0, tenderedCash - payments["cash"]).toFixed(
                            2,
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* UPI */}
                {/* UPI */}
                <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between bg-[#F8FAFC] p-3 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} className="text-[#0F766E]" />
                      <span className="text-[13px] font-semibold text-[#0F1624]">
                        UPI (GPay / PhonePe / QR)
                      </span>
                    </div>
                    {paymentRefs["upi"] && (
                      <span className="text-[10px] bg-[#DCFCE7] text-[#15803d] px-1.5 py-0.5 rounded font-mono">
                        {paymentRefs["upi"]}
                      </span>
                    )}
                  </div>
                  <div className="p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] text-[#475569]">Amount (₹)</span>
                        {(!payments["upi"] || payments["upi"] === 0) && balanceDue > 0 && (
                          <button
                            type="button"
                            onClick={() => setPayments((p) => ({ ...p, upi: balanceDue }))}
                            className="text-[10px] text-[#0F766E] font-semibold hover:underline"
                          >
                            (Fill ₹{balanceDue.toFixed(2)})
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        value={payments["upi"] || ""}
                        onChange={(e) => {
                          setPayments((p) => ({
                            ...p,
                            upi: Number(e.target.value),
                          }))
                        }}
                        className="w-28 px-3 py-1.5 text-right text-[14px] font-bold border border-[#CBD5E1] focus:border-[#0F766E] outline-none rounded"
                        placeholder="0.00"
                      />
                    </div>

                    {/* LIVE UPI RECEIVER CONFIGURATION */}
                    <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[#0F766E] flex items-center gap-1">
                          <span>Your Receiver UPI ID (Live Real-Time)</span>
                        </label>
                        <span className="text-[9px] bg-[#CCFBF1] text-[#0F766E] font-bold px-1.5 py-0.5 rounded uppercase">
                          Real-Time QR
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={hospitalUpiId}
                          onChange={(e) => {
                            setHospitalUpiId(e.target.value)
                            localStorage.setItem("hospai_pharmacy_upi_id", e.target.value)
                          }}
                          placeholder="8790689532@ibl"
                          className="flex-1 px-2.5 py-1.5 text-[12px] font-mono font-bold bg-white border border-[#5EEAD4] focus:border-[#0F766E] rounded outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const amt = payments["upi"] || (balanceDue > 0 ? balanceDue : finalAmount)
                            setPayments((p) => ({ ...p, upi: amt }))
                            setShowUpiQrModal(true)
                          }}
                          className="flex-1 py-1.5 bg-[#0F766E] text-white text-[11px] rounded font-bold flex items-center justify-center gap-1.5 hover:bg-[#0c5e58] transition-colors shadow-sm cursor-pointer"
                        >
                          <QrCode size={13} /> Open Live Scan & Pay QR
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F0F2F5]">
                      <input
                        type="text"
                        value={paymentRefs["upi"] || ""}
                        onChange={(e) =>
                          setPaymentRefs((p) => ({
                            ...p,
                            upi: e.target.value,
                          }))
                        }
                        placeholder="12-digit Bank UTR / Ref No."
                        className="flex-1 px-2.5 py-1 text-[11px] border border-[#E2E8F0] outline-none rounded font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const amt = payments["upi"] || (balanceDue > 0 ? balanceDue : finalAmount)
                          setPayments((p) => ({ ...p, upi: amt }))
                          if (!paymentRefs["upi"]) {
                            setPaymentRefs((p) => ({
                              ...p,
                              upi: "UTR" + Date.now().toString().slice(-8),
                            }))
                          }
                        }}
                        className="px-2.5 py-1 bg-[#16a34a] text-white text-[11px] rounded font-semibold hover:bg-[#15803d] transition-colors"
                      >
                        ✓ Mark Paid
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card - Physical POS */}
                <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between bg-[#F8FAFC] p-3 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-[#1B4FD8]" />
                      <span className="text-[13px] font-semibold text-[#0F1624]">
                        Card (Debit / Credit POS)
                      </span>
                    </div>
                    {paymentRefs["card"] && (
                      <span className="text-[10px] bg-[#DCFCE7] text-[#15803d] px-1.5 py-0.5 rounded font-mono">
                        {paymentRefs["card"]}
                      </span>
                    )}
                  </div>
                  <div className="p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] text-[#475569]">Amount (₹)</span>
                        {(!payments["card"] || payments["card"] === 0) && balanceDue > 0 && (
                          <button
                            type="button"
                            onClick={() => setPayments((p) => ({ ...p, card: balanceDue }))}
                            className="text-[10px] text-[#1B4FD8] font-semibold hover:underline"
                          >
                            (Fill ₹{balanceDue.toFixed(2)})
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        value={payments["card"] || ""}
                        onChange={(e) => {
                          setPayments((p) => ({
                            ...p,
                            card: Number(e.target.value),
                          }))
                        }}
                        className="w-28 px-3 py-1.5 text-right text-[14px] font-bold border border-[#CBD5E1] focus:border-[#1B4FD8] outline-none rounded"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F0F2F5]">
                      <input
                        type="text"
                        value={paymentRefs["card"] || ""}
                        onChange={(e) =>
                          setPaymentRefs((p) => ({
                            ...p,
                            card: e.target.value,
                          }))
                        }
                        placeholder="POS Auth Code / Slip No."
                        className="flex-1 px-2.5 py-1 text-[11px] border border-[#E2E8F0] outline-none rounded font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const amt = payments["card"] || (balanceDue > 0 ? balanceDue : finalAmount)
                          confirmCardPayment(amt)
                        }}
                        className="px-2.5 py-1 bg-[#1B4FD8] text-white text-[11px] rounded font-semibold hover:bg-[#1540B3] transition-colors"
                      >
                        Swiped & Paid
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePhysicalPOSPayment(
                            payments["card"] || (balanceDue > 0 ? balanceDue : finalAmount)
                          )
                        }
                        disabled={posStatus !== null}
                        className="px-2 py-1 border border-[#CBD5E1] text-[#334155] text-[11px] rounded font-medium hover:bg-[#F8FAFC] transition-colors"
                        title="Simulate Card Machine Tap"
                      >
                        Send POS
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleRazorpayPayment(
                            "card",
                            payments["card"] || (balanceDue > 0 ? balanceDue : finalAmount)
                          )
                        }
                        className="px-2 py-1 bg-[#0F1624] text-white text-[11px] rounded font-medium hover:bg-[#1E293B] transition-colors"
                        title="Open Card Checkout Gateway"
                      >
                        Card PG
                      </button>
                    </div>

                    {posStatus && (
                      <div
                        className={`text-[11px] font-semibold p-2 rounded ${
                          posStatus === "Approved!"
                            ? "bg-[#DCFCE7] text-[#15803d]"
                            : "bg-[#E8EDF5] text-[#0F766E]"
                        }`}
                      >
                        <RefreshCw
                          size={12}
                          className={`inline mr-1 ${
                            posStatus === "Approved!"
                              ? "hidden"
                              : "animate-spin"
                          }`}
                        />
                        {posStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-[#E2E8F0] bg-white space-y-2.5">
            {balanceDue > 0 && totalPaid > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPayments((p) => ({ ...p, cash: balanceDue }))
                }}
                className="w-full py-2.5 bg-[#1B4FD8] hover:bg-[#1640b0] text-white text-[12px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Wallet size={15} /> Settle Remaining ₹{balanceDue.toFixed(2)} in Cash
              </button>
            )}

            <button
              onClick={completeTransaction}
              disabled={cart.length === 0}
              className={`w-full py-4 text-[14px] font-bold rounded-lg shadow-sm transition-colors uppercase tracking-wide flex items-center justify-center gap-2 ${
                cart.length > 0
                  ? isPaid
                    ? "bg-[#0F766E] text-white hover:bg-[#0c5e58]"
                    : "bg-[#D97706] text-white hover:bg-[#b45309]"
                  : "bg-[#F0F2F5] text-[#94A3B8] cursor-not-allowed"
              }`}
            >
              {isPaid ? (
                <>
                  <CheckCircle size={18} /> Dispense & Print Invoice (Full Paid)
                </>
              ) : totalPaid > 0 ? (
                <>
                  <Play size={18} /> Dispense (₹{totalPaid.toFixed(2)} Paid · ₹{balanceDue.toFixed(2)} Due)
                </>
              ) : (
                "Select Payment Method Above"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Counter UPI QR Code Modal */}
      {showUpiQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.7)" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative border border-[#E2E8F0] animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowUpiQrModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#F1F5F9] text-[#64748B] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#E6FFFA] text-[#0F766E] flex items-center justify-center mx-auto mb-2.5 border border-[#99F6E4]">
              <QrCode size={24} />
            </div>

            <h3 className="text-[17px] font-bold text-[#0F1624]">
              Scan & Pay via UPI
            </h3>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              GPay · PhonePe · Paytm · BHIM · Any Bank UPI App
            </p>

            {/* Editable Receiver UPI ID directly on modal */}
            <div className="mt-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 text-left">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">
                  Receiver UPI ID (Your Account):
                </label>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                  Live Active
                </span>
              </div>
              <input
                type="text"
                value={hospitalUpiId}
                onChange={(e) => {
                  setHospitalUpiId(e.target.value)
                  localStorage.setItem("hospai_pharmacy_upi_id", e.target.value)
                }}
                placeholder="8790689532@ibl"
                className="w-full px-2.5 py-1.5 text-[13px] border border-[#CBD5E1] focus:border-[#0F766E] rounded font-mono font-bold text-[#0F1624] outline-none bg-white shadow-sm"
              />
            </div>

            {/* QR Code Container */}
            <div className="bg-[#F8FAFC] border-2 border-dashed border-[#0D9488] rounded-xl p-4 my-3 flex flex-col items-center justify-center">
              {hospitalUpiId.trim() ? (
                <>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
                      `upi://pay?pa=${hospitalUpiId.trim()}&pn=VH Pharmacy&am=${((payments["upi"] || finalAmount) || 0).toFixed(2)}&cu=INR`
                    )}`}
                    alt="UPI QR Code"
                    className="w-48 h-48 rounded-lg shadow-sm bg-white p-2 border border-[#E2E8F0]"
                  />
                  <div className="mt-2.5 flex flex-col items-center">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">Amount to Pay</span>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-[18px] font-black text-[#0F766E]">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={payments["upi"] !== undefined ? payments["upi"] : finalAmount}
                        onChange={(e) => setPayments((p) => ({ ...p, upi: Number(e.target.value) }))}
                        className="w-24 text-[22px] font-black text-[#0F766E] border-b-2 border-[#0D9488] text-center outline-none bg-transparent"
                      />
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setPayments((p) => ({ ...p, upi: 1 }))}
                        className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold hover:bg-emerald-200 transition-colors"
                      >
                        ⚡ Quick ₹1 Test
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayments((p) => ({ ...p, upi: finalAmount }))}
                        className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold hover:bg-slate-200 transition-colors"
                      >
                        Full (₹{finalAmount})
                      </button>
                    </div>
                  </div>
                  <a
                    href={`upi://pay?pa=${hospitalUpiId.trim()}&pn=VH Pharmacy&am=${((payments["upi"] || finalAmount) || 0).toFixed(2)}&cu=INR`}
                    className="mt-2 text-[11px] text-[#0F766E] hover:underline font-semibold flex items-center gap-1"
                  >
                    Open directly in UPI App ↗
                  </a>
                </>
              ) : (
                <div className="py-8 text-center text-rose-600 font-semibold text-[13px]">
                  Please enter your receiver UPI ID above
                </div>
              )}
            </div>

            {/* Real 12-digit UPI Ref entry */}
            <div className="text-left mb-3 bg-[#F1F5F9] p-3 rounded-xl border border-[#CBD5E1]">
              <label className="block text-[11px] font-bold text-[#1E293B] mb-1">
                Enter 12-digit UPI Ref / UTR (from PhonePe / GPay screen):
              </label>
              <input
                type="text"
                maxLength={16}
                value={paymentRefs["upi"] || ""}
                onChange={(e) => setPaymentRefs((p) => ({ ...p, upi: e.target.value.trim() }))}
                placeholder="e.g. 427189104821 (Check PhonePe receipt)"
                className="w-full px-2.5 py-1.5 bg-white border border-[#94A3B8] rounded font-mono font-bold text-[13px] text-[#0F1624] tracking-wider outline-none"
              />
              <span className="text-[10px] text-[#64748B] mt-1 block">
                💡 Look at your PhonePe/GPay screen for <strong>UPI Ref No</strong>. Type it here so your bill has the 100% real bank UTR!
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowUpiQrModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-[13px] font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const amt = payments["upi"] !== undefined && payments["upi"] > 0 ? payments["upi"] : 1
                  confirmUpiPayment(amt, paymentRefs["upi"])
                }}
                className="flex-1 py-2.5 rounded-lg text-white text-[13px] font-bold bg-[#16a34a] hover:bg-[#15803d] shadow-md transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={16} /> ✓ Confirm & Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
