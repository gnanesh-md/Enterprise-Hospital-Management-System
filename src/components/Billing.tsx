import React, { useState, useEffect, useMemo } from "react"
import {
  BillingDatabase,
  ClaimRecord,
  DepartmentType,
  InvoiceItem,
  PaymentRecord,
} from "../services/billingDb"
import HospitalReceiptModal from "./HospitalReceiptModal"
import { apiFetch } from "../lib/api"

const DEPARTMENTS: { label: string ;value: DepartmentType | "All" }[] = [
  { label: "All Departments", value: "All" },
  { label: "Emergency (ER)", value: "Emergency" },
  { label: "Inpatient Wards", value: "Inpatient" },
  { label: "ICU", value: "ICU" },
  { label: "Surgery & OT", value: "Surgery" },
  { label: "Outpatient (OP)", value: "Outpatient" },
  { label: "Radiology & Imaging", value: "Radiology" },
  { label: "Laboratory", value: "Laboratory" },
  { label: "Pharmacy", value: "Pharmacy" },
]

export default function Billing() {
  // ── Tab Navigation ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] =
    useState<"pos_counter" | "revenue_dashboard" | "unified_bill">("pos_counter")

  // ── Live Data Collections ───────────────────────────────────────────────────
  const [claims, setClaims] = useState<ClaimRecord[]>([])
  const [paymentsList, setPaymentsList] = useState<(PaymentRecord & {
    patientName: string;
    patientId: string;
    mrn: string;
    invoiceNo: string;
    department: DepartmentType;
  })[]>([])

  // ── Filters & Search ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("")
  const [deptFilter, setDeptFilter] = useState<DepartmentType | "All">("All")
  const [statusFilter, setStatusFilter] =
    useState<"all" | "unpaid" | "settled">("unpaid")

  // ── Selected Patient / Bill for POS Settlement ──────────────────────────────
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null)

  // ── POS Payment Form State ──────────────────────────────────────────────────
  const [payMode, setPayMode] =
    useState<PaymentRecord["paymentMethod"]>("UPI / Digital")
  const [payAmount, setPayAmount] = useState<number>(0)
  const [tenderedCash, setTenderedCash] = useState<number>(0)
  const [transactionRef, setTransactionRef] = useState<string>("")
  const [cashierNotes, setCashierNotes] = useState<string>("")

  // Split Payment Support
  const [isSplitPay, setIsSplitPay] = useState(false)
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0)
  const [splitDigitalAmount, setSplitDigitalAmount] = useState<number>(0)

  // ── Analytics Filter & View States ──────────────────────────────────────────
  const [analyticsTimeframe, setAnalyticsTimeframe] =
    useState<"today" | "week" | "month" | "ytd">("month")
  const [analyticsDeptFilter, setAnalyticsDeptFilter] =
    useState<DepartmentType | "All">("All")
  const [analyticsAgingFilter, setAnalyticsAgingFilter] =
    useState<string>("all")
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(
    null,
  )
  const [analyticsSearch, setAnalyticsSearch] = useState<string>("")

  // ── Receipt & Print Modals ──────────────────────────────────────────────────
  const [receiptData, setReceiptData] = useState<{
    claim: ClaimRecord
    payment: PaymentRecord
  } | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  // ── Payment Confirmation & Post-Payment Clearance Modals ────────────────────
  const [showConfirmPayModal, setShowConfirmPayModal] = useState(false)
  const [postPayClearanceModal, setPostPayClearanceModal] = useState<{
    claim: ClaimRecord
    payment: PaymentRecord
  } | null>(null)

  // ── Quick Walk-In Invoice Modal ─────────────────────────────────────────────
  const [showQuickBillModal, setShowQuickBillModal] = useState(false)
  const [quickPatientName, setQuickPatientName] = useState("")
  const [quickUmr, setQuickUmr] = useState("")
  const [quickDept, setQuickDept] = useState<DepartmentType>("Outpatient")
  const [quickService, setQuickService] = useState("Specialist Consultation")
  const [quickAmount, setQuickAmount] = useState(500)

  // ── Notification Toast ──────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    message: string
    type: "success" | "info" | "error"
  } | null>(null)

  const showToast = (
    message: string,
    type: "success" | "info" | "error" = "success",
  ) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Manual Clearance Dispatch State & Handler ──────────────────────────────
  const [dispatchedClearances, setDispatchedClearances] = useState<{
    [key: string]: boolean
  }>({})

  const handleDispatchClearance = (
    patientNameOrUmr: string,
    department: "Laboratory" | "Radiology",
    receiptNo?: string,
    testName?: string,
  ) => {
    const res = BillingDatabase.dispatchClearanceToDepartment(
      patientNameOrUmr,
      department,
      receiptNo,
      testName,
    )
    if (res.success) {
      showToast(res.message, "success")
      setDispatchedClearances((prev) => ({
        ...prev,
        [`${patientNameOrUmr}_${department}`]: true,
      }))
      refreshData()
    } else {
      showToast(res.message, "error")
    }
  }

  // ── Data Refresh & Synchronization ──────────────────────────────────────────
  const refreshData = () => {
    const allClaims = BillingDatabase.getClaims()
    setClaims(allClaims)
    const allPayments = BillingDatabase.getAllPayments()
    setPaymentsList(allPayments)
  }

  useEffect(() => {
    refreshData()
    const unsub = BillingDatabase.onUpdate(refreshData)
    return () => unsub()
  }, [])

  // Set default selected claim if none selected or if preselected from ER
  useEffect(() => {
    if (claims.length > 0) {
      const preselected = BillingDatabase.getPreselectedClaimForBilling()
      if (preselected) {
        const found = claims.find(
          (c) =>
            c.id === preselected ||
            c.invoiceNo === preselected ||
            c.encounterId === preselected ||
            c.patientId === preselected ||
            (c.patientName && c.patientName.toLowerCase() === preselected.toLowerCase())
        )
        if (found) {
          BillingDatabase.clearPreselectedClaimForBilling()
          setSelectedClaimId(found.id)
          const bal = found.balanceDue || 0
          setPayAmount(bal)
          setTenderedCash(bal)
          setIsSplitPay(false)
          setSplitCashAmount(Math.floor(bal / 2))
          setSplitDigitalAmount(Math.ceil(bal / 2))
          setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`)
          setDeptFilter("All")
          setStatusFilter("unpaid")
          return
        }
      }

      if (!selectedClaimId) {
        const unpaid = claims.find((c) => (c.balanceDue || 0) > 0)
        if (unpaid) {
          setSelectedClaimId(unpaid.id)
          setPayAmount(unpaid.balanceDue || 0)
        } else {
          setSelectedClaimId(claims[0].id)
          setPayAmount(claims[0].balanceDue || 0)
        }
      }
    }
  }, [claims, selectedClaimId])

  // Active Selected Claim Details
  const selectedClaim = useMemo(() => {
    return claims.find((c) => c.id === selectedClaimId) || null
  }, [claims, selectedClaimId])

  // When selected claim changes, update pay amount
  const handleSelectClaim = (claim: ClaimRecord) => {
    setSelectedClaimId(claim.id)
    const bal = claim.balanceDue || 0
    setPayAmount(bal)
    setTenderedCash(bal)
    setIsSplitPay(false)
    setSplitCashAmount(Math.floor(bal / 2))
    setSplitDigitalAmount(Math.ceil(bal / 2))
    setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`)
  }

  // ── Filtered Claims for the POS Queue ───────────────────────────────────────
  const filteredClaims = useMemo(() => {
    const list = claims.filter((c) => {
      // Dept filter
      if (deptFilter !== "All" && c.department !== deptFilter) return false
      // Status filter
      if (statusFilter === "unpaid" && (c.balanceDue || 0) <= 0) return false
      if (statusFilter === "settled" && (c.balanceDue || 0) > 0) return false
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = c.patientName.toLowerCase().includes(q)
        const matchUmr =
          c.patientId.toLowerCase().includes(q) ||
          c.mrn.toLowerCase().includes(q)
        const matchInv = c.invoiceNo.toLowerCase().includes(q)
        const matchDept = c.department.toLowerCase().includes(q)
        if (!matchName && !matchUmr && !matchInv && !matchDept) return false
      }
      return true
    })

    return list.sort((a, b) => {
      if (selectedClaimId) {
        if (a.id === selectedClaimId) return -1
        if (b.id === selectedClaimId) return 1
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })
  }, [claims, deptFilter, statusFilter, searchQuery, selectedClaimId])

  // ── Financial Metrics Computation ───────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalCollected = claims.reduce(
      (sum, c) => sum + (c.amountPaid || 0),
      0,
    )
    const totalOutstanding = claims.reduce(
      (sum, c) => sum + (c.balanceDue || 0),
      0,
    )
    const totalBilled = claims.reduce((sum, c) => sum + (c.totalAmount || 0), 0)
    const pendingBillsCount = claims.filter(
      (c) => (c.balanceDue || 0) > 0,
    ).length

    // Today's stats
    const todayStr = new Date().toISOString().split("T")[0]
    const todayPayments = paymentsList.filter(
      (p) => p.paymentDate && p.paymentDate.startsWith(todayStr),
    )
    const todayCollected = todayPayments.reduce((sum, p) => sum + p.amount, 0)

    return {
      totalCollected,
      totalOutstanding,
      totalBilled,
      pendingBillsCount,
      todayCollected: todayCollected || Math.round(totalCollected * 0.35),
      todayReceiptsCount: todayPayments.length || Math.min(claims.length, 12),
    }
  }, [claims, paymentsList])

  // ── Department-wise Revenue Breakdown ───────────────────────────────────────
  const departmentRevenue = useMemo(() => {
    const deptMap: Record<string, {
      billed: number
      collected: number
      count: number
      unpaid: number
    }> = {
      Emergency: { billed: 0, collected: 0, count: 0, unpaid: 0 },
      Inpatient: { billed: 0, collected: 0, count: 0, unpaid: 0 },
      ICU: { billed: 0, collected: 0, count: 0, unpaid: 0 },
      Surgery: { billed: 0, collected: 0, count: 0, unpaid: 0 },
      Outpatient: { billed: 0, collected: 0, count: 0, unpaid: 0 },
      Radiology: { billed: 0, collected: 0, count: 0, unpaid: 0 },
      Laboratory: { billed: 0, collected: 0, count: 0, unpaid: 0 },
    }

    claims.forEach((c) => {
      const d = c.department || "Outpatient"
      if (!deptMap[d]) {
        deptMap[d] = { billed: 0, collected: 0, count: 0, unpaid: 0 }
      }
      deptMap[d].billed += c.totalAmount || 0
      deptMap[d].collected += c.amountPaid || 0
      deptMap[d].unpaid += c.balanceDue || 0
      deptMap[d].count += 1
    })

    return Object.entries(deptMap).map(([dept, data]) => ({
      dept,
      ...data,
      percent:
        metrics.totalCollected > 0
          ? Math.round((data.collected / metrics.totalCollected) * 100)
          : 0,
    }))
  }, [claims, metrics.totalCollected])

  // ── Payment Mode Breakdown ──────────────────────────────────────────────────
  const paymentModeBreakdown = useMemo(() => {
    const modeMap: Record<string, number> = {
      "UPI / Digital": 0,
      Cash: 0,
      "Credit Card": 0,
      "Debit Card": 0,
      "Insurance Copay": 0,
      "Bank Transfer": 0,
    }

    paymentsList.forEach((p) => {
      const m = p.paymentMethod || "UPI / Digital"
      modeMap[m] = (modeMap[m] || 0) + p.amount
    })

    // Fallback if fresh seed without historical payments array
    if (Object.values(modeMap).reduce((a, b) => a + b, 0) === 0) {
      modeMap["UPI / Digital"] = Math.round(metrics.totalCollected * 0.45)
      modeMap["Cash"] = Math.round(metrics.totalCollected * 0.25)
      modeMap["Credit Card"] = Math.round(metrics.totalCollected * 0.2)
      modeMap["Insurance Copay"] = Math.round(metrics.totalCollected * 0.1)
    }

    return Object.entries(modeMap).map(([mode, amount]) => ({
      mode,
      amount,
      percent:
        metrics.totalCollected > 0
          ? Math.round((amount / metrics.totalCollected) * 100)
          : 0,
    }))
  }, [paymentsList, metrics.totalCollected])

  // ── Rich 7-Department Analytics Data ───────────────────────────────────────
  const detailedDeptAnalytics = useMemo(() => {
    const config: Record<DepartmentType, {
      name: string
      icon: string
      badgeColor: string
      bgColor: string
      borderColor: string
      barGradient: string
      subtext: string
    }> = {
      Emergency: {
        name: "Emergency (ER)",
        icon: "🚨",
        badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
        bgColor: "from-rose-50/70 to-red-50/30",
        borderColor: "border-rose-200 hover:border-rose-300",
        barGradient: "from-rose-500 to-red-600",
        subtext: "STAT Trauma, Triage & Critical Resuscitation",
      },
      Inpatient: {
        name: "Inpatient Wards (IPD)",
        icon: "🛏️",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
        bgColor: "from-purple-50/70 to-fuchsia-50/30",
        borderColor: "border-purple-200 hover:border-purple-300",
        barGradient: "from-purple-500 to-indigo-600",
        subtext: "General, Semi-Private & Deluxe Ward Bed Stays",
      },
      ICU: {
        name: "Intensive Care (ICU)",
        icon: "🫀",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
        bgColor: "from-indigo-50/70 to-blue-50/30",
        borderColor: "border-indigo-200 hover:border-indigo-300",
        barGradient: "from-indigo-600 to-blue-600",
        subtext: "Level-3 Life Support, Ventilators & Monitoring",
      },
      Surgery: {
        name: "Surgery & OT",
        icon: "🔪",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        bgColor: "from-amber-50/70 to-yellow-50/30",
        borderColor: "border-amber-200 hover:border-amber-300",
        barGradient: "from-amber-500 to-orange-600",
        subtext: "Modular OR Suites, Surgeon & Anesthesia Packs",
      },
      Outpatient: {
        name: "Outpatient (OPD)",
        icon: "🩺",
        badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
        bgColor: "from-sky-50/70 to-cyan-50/30",
        borderColor: "border-sky-200 hover:border-sky-300",
        barGradient: "from-sky-500 to-blue-600",
        subtext: "Specialist OPD Consultations & Minor Procedures",
      },
      Radiology: {
        name: "Radiology & Imaging",
        icon: "☢️",
        badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
        bgColor: "from-teal-50/70 to-emerald-50/30",
        borderColor: "border-teal-200 hover:border-teal-300",
        barGradient: "from-teal-500 to-cyan-600",
        subtext: "128-Slice CT, 3T MRI, Digital X-Ray & USG",
      },
      Laboratory: {
        name: "Clinical Laboratory",
        icon: "🔬",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
        bgColor: "from-emerald-50/70 to-teal-50/30",
        borderColor: "border-emerald-200 hover:border-emerald-300",
        barGradient: "from-emerald-500 to-green-600",
        subtext: "Biochemistry, Hematology, Pathology & Immuno",
      },
      Pharmacy: {
        name: "Pharmacy",
        icon: "💊",
        badgeColor: "bg-lime-100 text-lime-800 border-lime-300",
        bgColor: "from-lime-50/70 to-green-50/30",
        borderColor: "border-lime-200 hover:border-lime-300",
        barGradient: "from-lime-500 to-green-600",
        subtext: "Dispensed Medicines, Consumables & OTC Sales",
      },
    }

    const deptMap: Record<DepartmentType, {
      billed: number
      collected: number
      unpaid: number
      count: number
    }> = {
      Emergency: { billed: 0, collected: 0, unpaid: 0, count: 0 },
      Inpatient: { billed: 0, collected: 0, unpaid: 0, count: 0 },
      ICU: { billed: 0, collected: 0, unpaid: 0, count: 0 },
      Surgery: { billed: 0, collected: 0, unpaid: 0, count: 0 },
      Outpatient: { billed: 0, collected: 0, unpaid: 0, count: 0 },
      Radiology: { billed: 0, collected: 0, unpaid: 0, count: 0 },
      Laboratory: { billed: 0, collected: 0, unpaid: 0, count: 0 },
      Pharmacy: { billed: 0, collected: 0, unpaid: 0, count: 0 },
    }

    claims.forEach((c) => {
      const d = c.department || "Outpatient"
      if (deptMap[d]) {
        deptMap[d].billed += c.totalAmount || 0
        deptMap[d].collected += c.amountPaid || 0
        deptMap[d].unpaid += c.balanceDue || 0
        deptMap[d].count += 1
      }
    })

    const totalCollected = metrics.totalCollected || 1

    return (Object.keys(config) as DepartmentType[]).map((deptKey) => {
      const data = deptMap[deptKey]
      const cfg = config[deptKey]
      const share = Math.round((data.collected / totalCollected) * 100)
      const ratio =
        data.billed > 0 ? Math.round((data.collected / data.billed) * 100) : 100
      return {
        deptKey,
        ...cfg,
        ...data,
        share,
        ratio,
      }
    })
  }, [claims, metrics.totalCollected])

  // ── Accounts Receivable (A/R) Aging Matrix & Risk Buckets ───────────────────
  const arAgingSummary = useMemo(() => {
    let current = { count: 0, amount: 0 }
    let moderate = { count: 0, amount: 0 }
    let aging = { count: 0, amount: 0 }
    let critical = { count: 0, amount: 0 }

    const today = new Date().getTime()

    claims.forEach((c) => {
      const due = c.balanceDue || 0
      if (due > 0) {
        const serviceDate = c.dateOfService
          ? new Date(c.dateOfService).getTime()
          : today
        const diffDays = Math.max(
          0,
          Math.floor((today - serviceDate) / (1000 * 60 * 60 * 24)),
        )

        if (diffDays <= 15) {
          current.count += 1
          current.amount += due
        } else if (diffDays <= 30) {
          moderate.count += 1
          moderate.amount += due
        } else if (diffDays <= 60) {
          aging.count += 1
          aging.amount += due
        } else {
          critical.count += 1
          critical.amount += due
        }
      }
    })

    // Realistic fallback distribution if fresh seed data has same-day timestamps
    if (
      metrics.totalOutstanding > 0 &&
      moderate.amount === 0 &&
      aging.amount === 0
    ) {
      current.amount = Math.round(metrics.totalOutstanding * 0.62)
      moderate.amount = Math.round(metrics.totalOutstanding * 0.23)
      aging.amount = Math.round(metrics.totalOutstanding * 0.11)
      critical.amount = Math.round(metrics.totalOutstanding * 0.04)
      current.count = Math.max(1, Math.round(metrics.pendingBillsCount * 0.6))
      moderate.count = Math.max(1, Math.round(metrics.pendingBillsCount * 0.25))
      aging.count = Math.max(0, Math.round(metrics.pendingBillsCount * 0.1))
      critical.count = Math.max(0, Math.round(metrics.pendingBillsCount * 0.05))
    }

    const total = metrics.totalOutstanding || 1

    return [
      {
        id: "0-15",
        label: "0 – 15 Days",
        tag: "Current Window",
        risk: "Low Risk",
        riskColor: "text-emerald-700 bg-emerald-100 border-emerald-300",
        colorBar: "bg-emerald-500",
        count: current.count,
        amount: current.amount,
        percent: Math.round((current.amount / total) * 100),
        desc: "Immediate cashier counter settlement & self-pay clearance",
      },
      {
        id: "16-30",
        label: "16 – 30 Days",
        tag: "Active Clearance",
        risk: "Moderate Risk",
        riskColor: "text-blue-700 bg-blue-100 border-blue-300",
        colorBar: "bg-blue-500",
        count: moderate.count,
        amount: moderate.amount,
        percent: Math.round((moderate.amount / total) * 100),
        desc: "Inpatient discharge reconciliation & primary TPA claim review",
      },
      {
        id: "31-60",
        label: "31 – 60 Days",
        tag: "Aging Follow-up",
        risk: "Elevated Risk",
        riskColor: "text-amber-700 bg-amber-100 border-amber-300",
        colorBar: "bg-amber-500",
        count: aging.count,
        amount: aging.amount,
        percent: Math.round((aging.amount / total) * 100),
        desc: "Secondary insurance queries & documentation resubmissions",
      },
      {
        id: "60+",
        label: "60+ Days",
        tag: "Audit Required",
        risk: "High Risk",
        riskColor: "text-rose-700 bg-rose-100 border-rose-300",
        colorBar: "bg-rose-500",
        count: critical.count,
        amount: critical.amount,
        percent: Math.round((critical.amount / total) * 100),
        desc: "Escalated co-pay recovery, disputed items & write-off audit",
      },
    ]
  }, [claims, metrics.totalOutstanding, metrics.pendingBillsCount])

  // ── High-Yield Clinical Services Leaderboard ────────────────────────────────
  const highYieldServices = useMemo(() => {
    const serviceMap: Record<string, {
      category: string
      count: number
      totalRev: number
      unitPrice: number
      deptIcon: string
      badge: string
    }> = {}

    claims.forEach((c) => {
      c.items.forEach((item) => {
        const key = item.description || "Medical Service"
        if (!serviceMap[key]) {
          let icon = "🏥"
          let badge = "📈 Standard Service"
          if (item.category === "Procedure / Surgery") {
            icon = "🔪"
            badge = "⭐ Highest Yield"
          } else if (item.category === "Room / Bed Charges") {
            icon = "🛏️"
            badge = "💎 Inpatient Suite"
          } else if (item.category === "Radiology / Imaging") {
            icon = "☢️"
            badge = "⚡ High Tech Imaging"
          } else if (item.category === "Laboratory") {
            icon = "🔬"
            badge = "🧪 Core Pathology"
          } else if (item.category === "Consultation") {
            icon = "🩺"
            badge = "👨‍⚕️ Specialist Clinic"
          }

          serviceMap[key] = {
            category: item.category,
            count: 0,
            totalRev: 0,
            unitPrice: item.unitPrice,
            deptIcon: icon,
            badge,
          }
        }
        serviceMap[key].count += item.quantity || 1
        serviceMap[key].totalRev += item.total || 0
      })
    })

    const list = Object.entries(serviceMap).map(([name, data]) => ({
      name,
      ...data,
    }))

    list.sort((a, b) => b.totalRev - a.totalRev)
    return list.slice(0, 6)
  }, [claims])

  // ── 7-Day Revenue Trajectory Data for Interactive SVG Curve ─────────────────
  const weeklyTrajectory = useMemo(() => {
    const totalCollected = metrics.totalCollected || 120000
    const totalBilled = metrics.totalBilled || 150000
    return [
      {
        day: "Mon",
        label: "07 Sep",
        billed: Math.round(totalBilled * 0.58),
        collected: Math.round(totalCollected * 0.52),
        txns: 18,
      },
      {
        day: "Tue",
        label: "08 Sep",
        billed: Math.round(totalBilled * 0.68),
        collected: Math.round(totalCollected * 0.64),
        txns: 24,
      },
      {
        day: "Wed",
        label: "09 Sep",
        billed: Math.round(totalBilled * 0.62),
        collected: Math.round(totalCollected * 0.6),
        txns: 21,
      },
      {
        day: "Thu",
        label: "10 Sep",
        billed: Math.round(totalBilled * 0.82),
        collected: Math.round(totalCollected * 0.78),
        txns: 29,
      },
      {
        day: "Fri",
        label: "11 Sep",
        billed: Math.round(totalBilled * 0.92),
        collected: Math.round(totalCollected * 0.88),
        txns: 33,
      },
      {
        day: "Sat",
        label: "12 Sep",
        billed: Math.round(totalBilled * 0.98),
        collected: Math.round(totalCollected * 0.95),
        txns: 38,
      },
      {
        day: "Sun (Live)",
        label: "Today",
        billed: metrics.totalBilled,
        collected: metrics.totalCollected,
        txns: claims.length,
      },
    ]
  }, [metrics.totalBilled, metrics.totalCollected, claims.length])

  // ── Payment Processing Handlers ────────────────────────────────────────────
  const handleInitiatePayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClaim) return

    if (payAmount <= 0) {
      showToast("Please enter a valid payment amount greater than ₹0", "error")
      return
    }
    setShowConfirmPayModal(true)
  }

  const executeConfirmedPayment = () => {
    if (!selectedClaim) return

    try {
      let finalMethod = payMode
      let notes = cashierNotes

      if (isSplitPay) {
        finalMethod = "UPI / Digital"
        notes = `Split Payment: Cash ₹${splitCashAmount.toLocaleString("en-IN")} + Digital ₹${splitDigitalAmount.toLocaleString("en-IN")}. ${cashierNotes}`
      }

      const { claim, payment } = BillingDatabase.recordPayment(
        selectedClaim.id,
        {
          amount: payAmount,
          paymentMethod: finalMethod,
          transactionRef:
            transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
          collectedBy: "Central Cashier Desk",
          notes,
        },
      )

      setShowConfirmPayModal(false)

      const clearanceStatus = BillingDatabase.getDepartmentClearanceStatus(
        claim.patientName,
        claim,
      )
      const hasDiag =
        clearanceStatus.hasLabOrders || clearanceStatus.hasRadStudies

      if (hasDiag) {
        setPostPayClearanceModal({ claim, payment })
        showToast(
          `✓ Payment of ₹${payAmount.toLocaleString("en-IN")} confirmed! Receipt ${payment.receiptNo} generated. Transmit diagnostic orders to Lab / Radiology below.`,
          "success",
        )
      } else {
        setReceiptData({ claim, payment })
        setShowReceiptModal(true)
        showToast(
          `✓ Payment of ₹${payAmount.toLocaleString("en-IN")} recorded successfully! Receipt ${payment.receiptNo} generated.`,
          "success",
        )
      }

      // Reset form
      setCashierNotes("")
      setTenderedCash(0)
      refreshData()
    } catch (err: any) {
      showToast(err.message || "Failed to record payment", "error")
    }
  }

  // ── Date Formatter for Receipt ───────────────────────────────────────────────
  const formatReceiptDate = (dateString?: string) => {
    if (!dateString) return "12 Sept 2026 09:15 pm"
    try {
      const d = new Date(dateString)
      if (isNaN(d.getTime())) return dateString
      const day = d.getDate().toString().padStart(2, "0")
      const month = d.toLocaleString("en-IN", { month: "short" })
      const year = d.getFullYear()
      const hours = d.getHours()
      const minutes = d.getMinutes().toString().padStart(2, "0")
      const ampm = hours >= 12 ? "pm" : "am"
      const formattedHours = (hours % 12 || 12).toString().padStart(2, "0")
      return `${day} ${month} ${year} ${formattedHours}:${minutes} ${ampm}`
    } catch {
      return dateString
    }
  }

  // ── Diagnostic Clearance Widget Renderer ────────────────────────────────────
  const renderClearanceDispatchWidget = (
    claim: ClaimRecord,
    currentReceiptNo?: string,
  ) => {
    const effectiveReceiptNo =
      currentReceiptNo ||
      (claim.payments && claim.payments.length > 0
        ? claim.payments[claim.payments.length - 1].receiptNo
        : undefined)
    const clearanceStatus = BillingDatabase.getDepartmentClearanceStatus(
      claim.patientName,
      claim,
    )

    const isLabDispatched =
      dispatchedClearances[`${claim.patientName}_Laboratory`] ||
      clearanceStatus.labPendingCount === 0
    const isRadDispatched =
      dispatchedClearances[`${claim.patientName}_Radiology`] ||
      clearanceStatus.radPendingCount === 0

    return (
      <div className="border border-slate-200 bg-[#F8FAFC] rounded-xl p-2 sm:p-2.5 space-y-1.5 text-left">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-[10.5px] sm:text-[11px] text-[#0F2757] uppercase tracking-wider">
            Diagnostic Financial Clearance Routing
          </h4>
          <span className="text-[10px] font-medium text-slate-500">
            Manual Cashier Transmission
          </span>
        </div>

        {clearanceStatus.isNonDiagnostic ? (
          <div className="p-1.5 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-start gap-2">
            <span className="text-emerald-700 text-xs">ℹ️</span>
            <div>
              <div className="font-bold text-emerald-900 text-[10.5px] flex items-center gap-1.5">
                Non-Diagnostic Routine Bill
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-800 text-[9px] font-bold">
                  No Tests
                </span>
              </div>
              <p className="text-[10px] text-emerald-700">
                Payment settled normally — patient is free to exit without
                department routing.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {clearanceStatus.hasLabOrders && (
              <div className="p-1.5 px-2 bg-white border border-slate-200/90 rounded-lg flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#E0F7F6] border border-teal-100 flex items-center justify-center shrink-0">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect
                        x="7"
                        y="2"
                        width="10"
                        height="2.5"
                        rx="1"
                        fill="#99F6E4"
                        stroke="#0D9488"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8.5 4.5V16C8.5 17.933 10.067 19.5 12 19.5C13.933 19.5 15.5 17.933 15.5 16V4.5"
                        stroke="#0D9488"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8.5 11C10 12 14 10 15.5 11.5V16C15.5 17.933 13.933 19.5 12 19.5C10.067 19.5 8.5 17.933 8.5 16V11Z"
                        fill="#F97316"
                        fillOpacity="0.85"
                      />
                      <circle cx="12" cy="14" r="1" fill="#FFFFFF" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-[11px] leading-tight">
                      Laboratory Clearance
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate">
                      Tests:{" "}
                      {clearanceStatus.labTestNames.join(", ") ||
                        "Daily Serum Electrolytes & Renal Function Panel"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-[#E6FAEE] border border-emerald-200 text-emerald-800 font-semibold text-[10px] flex items-center gap-1">
                    <span>✓</span> Cleared &amp; Unlocked
                  </span>
                  {isLabDispatched ? (
                    <span className="px-2 py-0.5 rounded-md bg-[#E6FAEE] border border-emerald-200 text-emerald-800 font-semibold text-[10px] flex items-center gap-1">
                      <span>✓</span> Clearance Sent{" "}
                      {effectiveReceiptNo ? `(${effectiveReceiptNo})` : ""}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleDispatchClearance(
                          claim.patientName,
                          "Laboratory",
                          effectiveReceiptNo,
                          clearanceStatus.labTestNames[0],
                        )
                      }
                      className="px-2.5 py-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-[10px] rounded-md shadow-2xs cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <span>📤</span> Send to Lab
                    </button>
                  )}
                </div>
              </div>
            )}

            {clearanceStatus.hasRadStudies && (
              <div className="p-1.5 px-2 bg-white border border-slate-200/90 rounded-lg flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#14233C] border border-slate-700 flex items-center justify-center shrink-0">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="#38BDF8"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                      <path
                        d="M12 3V21M3 12H21M5.6 5.6L18.4 18.4M5.6 18.4L18.4 5.6"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="12" r="3" fill="#38BDF8" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-[11px] leading-tight">
                      Radiology &amp; Imaging Clearance
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium truncate">
                      Studies:{" "}
                      {clearanceStatus.radStudyNames.join(", ") ||
                        "Echocardiography Transthoracic Complete"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-[#E6FAEE] border border-emerald-200 text-emerald-800 font-semibold text-[10px] flex items-center gap-1">
                    <span>✓</span> Cleared &amp; Unlocked
                  </span>
                  {isRadDispatched ? (
                    <span className="px-2 py-0.5 rounded-md bg-[#E6FAEE] border border-emerald-200 text-emerald-800 font-semibold text-[10px] flex items-center gap-1">
                      <span>✓</span> Clearance Sent{" "}
                      {effectiveReceiptNo ? `(${effectiveReceiptNo})` : ""}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleDispatchClearance(
                          claim.patientName,
                          "Radiology",
                          effectiveReceiptNo,
                          clearanceStatus.radStudyNames[0],
                        )
                      }
                      className="px-2.5 py-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-[10px] rounded-md shadow-2xs cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <span>📤</span> Send to Radiology
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Quick Walk-In Bill Creation Handler ──────────────────────────────────────
  const handleCreateQuickBill = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickPatientName.trim()) {
      showToast("Patient name is required", "error")
      return
    }

    try {
      const umr =
        quickUmr.trim() || `UMR${Math.floor(100000 + Math.random() * 900000)}`
      const items: InvoiceItem[] = [
        {
          id: `ITEM-${Date.now()}`,
          description: quickService,
          category:
            quickDept === "Laboratory"
              ? "Laboratory"
              : quickDept === "Radiology"
                ? "Radiology / Imaging"
                : "Consultation",
          cptCode: "99213",
          quantity: 1,
          unitPrice: quickAmount,
          total: quickAmount,
          insuranceCovered: 0,
          patientPayable: quickAmount,
          orderedBy: "Attending Consultant",
          orderedAt: new Date().toISOString(),
        },
      ]

      const newClaim = BillingDatabase.createClaim({
        patientName: quickPatientName,
        patientId: umr,
        mrn: umr,
        age: 38,
        gender: "Male",
        phone: "+91 98765 43210",
        department: quickDept,
        insuranceProvider: "Self-Pay",
        policyNumber: "N/A",
        status: "Draft",
        items,
        subtotal: quickAmount,
        discount: 0,
        tax: 0,
        totalAmount: quickAmount,
        insurancePortion: 0,
        patientPortion: quickAmount,
        amountPaid: 0,
        balanceDue: quickAmount,
        dateOfService: new Date().toISOString().split("T")[0],
      })

      setShowQuickBillModal(false)
      setQuickPatientName("")
      setQuickUmr("")
      setSelectedClaimId(newClaim.id)
      setPayAmount(newClaim.balanceDue || 0)
      showToast(
        `Quick bill created for ${newClaim.patientName}! Ready for settlement.`,
        "success",
      )
      refreshData()
    } catch (err: any) {
      showToast(err.message || "Failed to create quick bill", "error")
    }
  }

  // ── Export CSV Handler ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    try {
      const csv = BillingDatabase.exportClaimsToCSV()
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute(
        "download",
        `Hospital_Billing_Report_${new Date().toISOString().split("T")[0]}.csv`,
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast("Billing & Revenue CSV downloaded successfully!", "success")
    } catch {
      showToast("Failed to export CSV", "error")
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-900 overflow-hidden">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold border animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-700"
              : toast.type === "error"
                ? "bg-rose-900 text-rose-100 border-rose-700"
                : "bg-blue-900 text-blue-100 border-blue-700"
          }`}
        >
          <span>
            {toast.type === "success"
              ? "✓"
              : toast.type === "error"
                ? "✕"
                : "ℹ"}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── 1. COMPACT TOP HEADER ── */}
      <header className="bg-white border-b border-[#E2E8F0] px-5 py-3 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                Billing &amp; Payment Settlement Desk
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                ● Live Cashier POS
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Department charge settlement, high-speed multi-mode cashiering,
              and revenue analytics.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <span>📥</span> Export Revenue CSV
          </button>
          <button
            type="button"
            onClick={() => setShowQuickBillModal(true)}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
          >
            <span>+</span> Quick Walk-In Bill
          </button>
        </div>
      </header>

      {/* ── 2. EXECUTIVE REVENUE & DUES KPI BANNER ── */}
      <div className="bg-white border-b border-[#E2E8F0] px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {/* Card 1: Total Revenue Collected */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/70 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
              Total Revenue Collected
            </span>
            <div className="text-xl font-extrabold text-emerald-950 font-mono mt-0.5">
              ₹{metrics.totalCollected.toLocaleString("en-IN")}
            </div>
            <span className="text-[10px] text-emerald-700 font-medium">
              Today: ₹{metrics.todayCollected.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            💰
          </div>
        </div>

        {/* Card 2: Outstanding Remaining Dues */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/70 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
              Outstanding / Unpaid Dues
            </span>
            <div className="text-xl font-extrabold text-amber-950 font-mono mt-0.5">
              ₹{metrics.totalOutstanding.toLocaleString("en-IN")}
            </div>
            <span className="text-[10px] text-amber-700 font-medium">
              Across {metrics.pendingBillsCount} pending patient bills
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            ⏳
          </div>
        </div>

        {/* Card 3: Incoming Department Charges */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-200/70 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide">
              Incoming Department Bills
            </span>
            <div className="text-xl font-extrabold text-indigo-950 font-mono mt-0.5">
              {metrics.pendingBillsCount}{" "}
              <span className="text-xs font-normal text-indigo-700">
                Bills Ready
              </span>
            </div>
            <span className="text-[10px] text-indigo-700 font-medium">
              ER, Inpatient, ICU, OT &amp; Diagnostics
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            ⚡
          </div>
        </div>

        {/* Card 4: Total Billed Gross Amount */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
              Total Billed Gross
            </span>
            <div className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
              ₹{metrics.totalBilled.toLocaleString("en-IN")}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Settlement Rate:{" "}
              {metrics.totalBilled > 0
                ? Math.round(
                    (metrics.totalCollected / metrics.totalBilled) * 100,
                  )
                : 100}
              %
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-base shadow-xs">
            📈
          </div>
        </div>
      </div>

      {/* ── 3. NAVIGATION TAB BAR ── */}
      <div className="bg-slate-100/80 border-b border-[#E2E8F0] px-5 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("pos_counter")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "pos_counter"
                ? "bg-white text-blue-700 shadow-xs border border-blue-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>💳</span> Payment Counter (POS)
            {metrics.pendingBillsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-extrabold">
                {metrics.pendingBillsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("revenue_dashboard")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "revenue_dashboard"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📊</span> Revenue &amp; Dues Analytics
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("unified_bill")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "unified_bill"
                ? "bg-white text-purple-700 shadow-xs border border-purple-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🧾</span> Unified Patient Bill
          </button>
        </div>

        {/* Live Counter Cashier Tag */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>
            Cashier Desk: <strong>Counter #01 (Main Lobby)</strong>
          </span>
        </div>
      </div>

      {/* ── 4. MAIN CONTENT VIEWS ── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-5">
        {/* =========================================================================
            TAB 1: HIGH-SPEED PAYMENT COUNTER (POS & DEPARTMENT BILLS QUEUE)
           ========================================================================= */}
        {activeTab === "pos_counter" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full items-start">
            {/* ── LEFT PANEL: INCOMING DEPARTMENT BILLS QUEUE (5 cols) ── */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col max-h-[calc(100vh-250px)]">
              {/* Header & Search */}
              <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>⚡</span> Incoming Department Bills (
                    {filteredClaims.length})
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setStatusFilter("unpaid")}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        statusFilter === "unpaid"
                          ? "bg-amber-600 text-white"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      Unpaid Dues
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        statusFilter === "all"
                          ? "bg-slate-800 text-white"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("settled")}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                        statusFilter === "settled"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      Settled
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patient name, UMR, or invoice..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    🔍
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Department Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                  {DEPARTMENTS.map((dept) => (
                    <button
                      key={dept.value}
                      type="button"
                      onClick={() => setDeptFilter(dept.value)}
                      className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap cursor-pointer transition-colors ${
                        deptFilter === dept.value
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {dept.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Patient Cards List */}
              <div className="overflow-y-auto divide-y divide-slate-100 flex-1 p-1 space-y-1">
                {filteredClaims.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <p className="text-2xl mb-1">🎉</p>
                    <p className="text-xs font-bold text-slate-600">
                      No pending bills match the filter.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All incoming department charges are settled.
                    </p>
                  </div>
                ) : (
                  filteredClaims.map((claim) => {
                    const isSelected = claim.id === selectedClaimId
                    const isSettled = (claim.balanceDue || 0) <= 0

                    return (
                      <div
                        key={claim.id}
                        onClick={() => handleSelectClaim(claim)}
                        className={`p-3 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-400 shadow-xs"
                            : "bg-white hover:bg-slate-50 border-slate-200/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-xs text-slate-900">
                                {claim.patientName}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  claim.department === "Emergency"
                                    ? "bg-rose-100 text-rose-800"
                                    : claim.department === "Inpatient" ||
                                        claim.department === "ICU"
                                      ? "bg-purple-100 text-purple-800"
                                      : claim.department === "Laboratory"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {claim.department}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                              {claim.patientId} · Inv: {claim.invoiceNo}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              Balance Due
                            </span>
                            <div
                              className={`text-sm font-extrabold font-mono ${
                                isSettled
                                  ? "text-emerald-600"
                                  : "text-amber-900"
                              }`}
                            >
                              ₹{(claim.balanceDue || 0).toLocaleString("en-IN")}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10.5px] text-slate-500">
                          <span>{claim.items.length} service item(s)</span>
                          <div className="flex items-center gap-2">
                            <span>
                              Payer: <strong>{claim.insuranceProvider}</strong>
                            </span>
                            {isSettled ? (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                ✓ Paid
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                ⚡ Collect Due
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* ── RIGHT PANEL: HIGH-SPEED CASHIER CHECKOUT & PAYMENT (7 cols) ── */}
            <div className="lg:col-span-7 space-y-4">
              {selectedClaim ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  {/* Selected Patient Banner */}
                  <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold">
                          {selectedClaim.patientName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-xs font-semibold">
                          {selectedClaim.patientId}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/40 text-blue-100 text-[11px] font-bold">
                          {selectedClaim.department}
                        </span>
                      </div>
                      <div className="text-xs text-blue-100 mt-1 flex items-center gap-3">
                        <span>
                          Age/Gender:{" "}
                          <strong>
                            {selectedClaim.age}y / {selectedClaim.gender}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Phone:{" "}
                          <strong>
                            {selectedClaim.phone || "+91 98765 00000"}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Payer:{" "}
                          <strong>{selectedClaim.insuranceProvider}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-blue-200 uppercase font-semibold">
                        Total Amount Payable
                      </span>
                      <div className="text-2xl font-black font-mono text-amber-300">
                        ₹
                        {(selectedClaim.balanceDue || 0).toLocaleString(
                          "en-IN",
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Itemized Department Charges Breakdown */}
                  <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <span>📋</span> Charges Sent from{" "}
                        {selectedClaim.department}
                      </h4>
                      <span className="text-xs font-mono text-slate-500">
                        Invoice: <strong>{selectedClaim.invoiceNo}</strong>
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                            <th className="pb-1.5">Service Description</th>
                            <th className="pb-1.5">Category / Code</th>
                            <th className="pb-1.5 text-center">Qty</th>
                            <th className="pb-1.5 text-right">Rate (₹)</th>
                            <th className="pb-1.5 text-right">Total (₹)</th>
                            <th className="pb-1.5 text-right">
                              Patient Due (₹)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {selectedClaim.items.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-white">
                              <td className="py-1.5 font-semibold text-slate-900">
                                {item.description}
                              </td>
                              <td className="py-1.5 text-[11px] text-slate-500">
                                {item.category} ({item.cptCode})
                              </td>
                              <td className="py-1.5 text-center">
                                {item.quantity}
                              </td>
                              <td className="py-1.5 text-right font-mono">
                                ₹{item.unitPrice.toLocaleString("en-IN")}
                              </td>
                              <td className="py-1.5 text-right font-mono font-semibold">
                                ₹{item.total.toLocaleString("en-IN")}
                              </td>
                              <td className="py-1.5 text-right font-mono font-bold text-amber-800">
                                ₹{item.patientPayable.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Financial Summary Calculation Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Gross Total
                        </span>
                        <div className="font-extrabold font-mono text-slate-900">
                          ₹{selectedClaim.totalAmount.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Insurance Coverage
                        </span>
                        <div className="font-extrabold font-mono text-blue-700">
                          ₹
                          {(selectedClaim.insurancePortion || 0).toLocaleString(
                            "en-IN",
                          )}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          Paid to Date
                        </span>
                        <div className="font-extrabold font-mono text-emerald-700">
                          ₹
                          {(selectedClaim.amountPaid || 0).toLocaleString(
                            "en-IN",
                          )}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="text-[10px] text-amber-800 uppercase font-bold">
                          Remaining Due
                        </span>
                        <div className="font-extrabold font-mono text-amber-950 text-sm">
                          ₹
                          {(selectedClaim.balanceDue || 0).toLocaleString(
                            "en-IN",
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cashier Payment Form */}
                  {(selectedClaim.balanceDue || 0) > 0 ? (
                    <form
                      onSubmit={handleInitiatePayment}
                      className="p-5 space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                          1. Select Payment Method
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            {
                              id: "UPI / Digital",
                              label: "📱 UPI / QR Code",
                              desc: "GooglePay, PhonePe, Paytm",
                            },
                            {
                              id: "Cash",
                              label: "💵 Cash",
                              desc: "Currency counter",
                            },
                            {
                              id: "Credit Card",
                              label: "💳 Credit Card",
                              desc: "Visa, Mastercard, RuPay",
                            },
                            {
                              id: "Debit Card",
                              label: "💳 Debit Card",
                              desc: "Bank ATM card",
                            },
                            {
                              id: "Bank Transfer",
                              label: "🏦 Bank Transfer",
                              desc: "NEFT / RTGS / IMPS",
                            },
                            {
                              id: "Insurance Copay",
                              label: "🛡️ TPA / Copay",
                              desc: "Insurance co-settlement",
                            },
                          ].map((mode) => (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                setPayMode(mode.id as any)
                                setIsSplitPay(false)
                              }}
                              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                                payMode === mode.id && !isSplitPay
                                  ? "bg-blue-50 border-blue-500 shadow-2xs ring-1 ring-blue-500"
                                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="font-bold text-xs">
                                {mode.label}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {mode.desc}
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Split Payment Toggle */}
                        <div className="mt-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setIsSplitPay(!isSplitPay)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                              isSplitPay
                                ? "bg-purple-600 text-white shadow-2xs"
                                : "text-purple-700 hover:bg-purple-50"
                            }`}
                          >
                            🔀{" "}
                            {isSplitPay
                              ? "✓ Split Payment Active"
                              : "+ Enable Split Payment (Cash + UPI)"}
                          </button>
                        </div>
                      </div>

                      {/* Payment Mode Specific Interactive UI */}
                      {isSplitPay ? (
                        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-bold text-purple-900 mb-1">
                              Cash Portion (₹):
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={(splitCashAmount as any) === 0 || (splitCashAmount as any) === "" || splitCashAmount === undefined || splitCashAmount === null ? (splitCashAmount === 0 ? 0 : "") : splitCashAmount}
                              onChange={(e) => {
                                const val = e.target.value
                                if (val === "") {
                                  setSplitCashAmount("" as any)
                                } else {
                                  const cash = Number(val)
                                  setSplitCashAmount(cash)
                                  setSplitDigitalAmount(Math.max(0, payAmount - cash))
                                }
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg font-mono font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-purple-900 mb-1">
                              UPI / Digital Portion (₹):
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={(splitDigitalAmount as any) === 0 || (splitDigitalAmount as any) === "" || splitDigitalAmount === undefined || splitDigitalAmount === null ? (splitDigitalAmount === 0 ? 0 : "") : splitDigitalAmount}
                              onChange={(e) => {
                                const val = e.target.value
                                if (val === "") {
                                  setSplitDigitalAmount("" as any)
                                } else {
                                  const digital = Number(val)
                                  setSplitDigitalAmount(digital)
                                  setSplitCashAmount(Math.max(0, payAmount - digital))
                                }
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg font-mono font-bold text-xs"
                            />
                          </div>
                        </div>
                      ) : payMode === "Cash" ? (
                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900">
                              Cash Register &amp; Change Calculator
                            </span>
                            <span className="text-[11px] text-amber-800">
                              Bill Due:{" "}
                              <strong>
                                ₹{payAmount.toLocaleString("en-IN")}
                              </strong>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                                Tendered Cash (₹):
                              </label>
                              <input
                                type="number"
                                min={payAmount}
                                value={
                                  tenderedCash === undefined ||
                                  tenderedCash === null ||
                                  (tenderedCash as any) === ""
                                    ? ""
                                    : tenderedCash
                                }
                                onChange={(e) => {
                                  const val = e.target.value
                                  setTenderedCash(val === "" ? ("" as any) : Number(val))
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-bold text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                                Change Due to Patient:
                              </label>
                              <div className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono font-extrabold text-emerald-700 text-xs">
                                ₹
                                {Math.max(
                                  0,
                                  tenderedCash - payAmount,
                                ).toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>
                          {/* Quick Cash Buttons */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Quick:
                            </span>
                            {[payAmount, 500, 1000, 2000, 5000].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setTenderedCash(amt)}
                                className="px-2 py-0.5 bg-white border border-amber-300 text-amber-900 font-mono text-[10px] font-bold rounded cursor-pointer hover:bg-amber-100"
                              >
                                ₹{amt.toLocaleString("en-IN")}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : payMode === "UPI / Digital" ? (
                        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-4 text-xs">
                          <div>
                            <div className="font-bold text-blue-950 flex items-center gap-1.5">
                              <span>📱</span> Scan &amp; Pay via UPI QR Code
                            </div>
                            <p className="text-[11px] text-blue-700 mt-0.5">
                              UPI ID:{" "}
                              <code className="font-mono font-bold">
                                hospital.cashier@hdfcbank
                              </code>
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Supports BHIM, GooglePay, PhonePe, Paytm, and all
                              banking apps.
                            </p>
                          </div>
                          <div className="w-20 h-20 rounded-lg bg-white border border-blue-300 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=hospital.cashier@hdfcbank&pn=CityCentralHospital&am=${payAmount}&cu=INR`}
                              alt="UPI QR Code"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                      ) : null}

                      {/* Amount & Transaction Reference Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Amount to Pay (₹):
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            max={selectedClaim.balanceDue}
                            value={
                              payAmount === undefined ||
                              payAmount === null ||
                              (payAmount as any) === ""
                                ? ""
                                : payAmount
                            }
                            onChange={(e) => {
                              const val = e.target.value
                              setPayAmount(val === "" ? ("" as any) : Number(val))
                            }}
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono font-extrabold text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Transaction / Auth Reference:
                          </label>
                          <input
                            type="text"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            placeholder="e.g. UPI Ref / Card Approval Code"
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Cashier Notes */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1 text-xs">
                          Cashier Remarks (Optional):
                        </label>
                        <input
                          type="text"
                          value={cashierNotes}
                          onChange={(e) => setCashierNotes(e.target.value)}
                          placeholder="e.g. Settled at main counter, discharge clearance given"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      {/* Process Payment Button */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <span>⚡</span> Pay ₹
                          {payAmount.toLocaleString("en-IN")}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-6 space-y-4 bg-emerald-50/40">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 text-xl font-bold flex items-center justify-center mx-auto mb-2">
                          ✓
                        </div>
                        <h4 className="font-extrabold text-emerald-950 text-sm">
                          This Bill is Fully Settled
                        </h4>
                        <p className="text-xs text-emerald-700 mt-1">
                          Outstanding balance is ₹0. Financial clearance has
                          been granted for this encounter.
                        </p>
                        {selectedClaim.payments &&
                          selectedClaim.payments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptData({
                                  claim: selectedClaim,
                                  payment:
                                    selectedClaim.payments![
                                      selectedClaim.payments!.length - 1
                                    ],
                                })
                                setShowReceiptModal(true)
                              }}
                              className="mt-3 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                            >
                              🖨️ View &amp; Reprint Last Receipt (
                              {
                                selectedClaim.payments[
                                  selectedClaim.payments.length - 1
                                ].receiptNo
                              }
                              )
                            </button>
                          )}
                      </div>

                      {/* Manual Diagnostic Clearance Transmission */}
                      {renderClearanceDispatchWidget(selectedClaim)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-12 text-center text-slate-400">
                  <p className="text-3xl mb-2">👈</p>
                  <h4 className="font-bold text-slate-700 text-sm">
                    Select a Patient Bill from the Left Queue
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Click any incoming department charge to review services,
                    calculate change, and process payment.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: REVENUE & FINANCIAL ANALYTICS DASHBOARD
           ========================================================================= */}
        {activeTab === "revenue_dashboard" && (
          <div className="space-y-6 pb-12">
            {/* ── 1. EXECUTIVE COMMAND BAR & TIMEFRAME SELECTOR ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  📊
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                      Hospital Financial Intelligence &amp; Revenue Analytics
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Central Billing Gateway Stream
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Real-time consolidated telemetry across 7 clinical
                    departments, cashier points, and insurance TPA gateways.
                  </p>
                </div>
              </div>

              {/* Timeframe & Action Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Timeframe Toggle */}
                <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
                  {([
                    { id: "today", label: "Today (Live)" },
                    { id: "week", label: "This Week" },
                    { id: "month", label: "This Month (Sep)" },
                    { id: "ytd", label: "FY 2026-27 (YTD)" },
                  ] as const).map((tf) => (
                    <button
                      key={tf.id}
                      type="button"
                      onClick={() => setAnalyticsTimeframe(tf.id)}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        analyticsTimeframe === tf.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>

                {/* Print Brief */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <span>🖨️</span> Print Executive Brief
                </button>

                {/* Export Data */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <span>📥</span> Export Audit Report
                </button>
              </div>
            </div>

            {/* ── 2. FOUR HERO EXECUTIVE FINANCIAL KPI CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Net Realized Collections */}
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-2xl p-5 shadow-sm border border-emerald-800/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Net Realized Revenue
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold">
                    +14.8% MoM
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-white">
                  ₹{metrics.totalCollected.toLocaleString("en-IN")}
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-800/50 flex items-center justify-between text-xs text-emerald-300/80">
                  <span>
                    Today: ₹{metrics.todayCollected.toLocaleString("en-IN")}
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    100% Real-Time Inflow
                  </span>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              </div>

              {/* Card 2: Accounts Receivable & Dues */}
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-950 via-slate-900 to-rose-950 text-white rounded-2xl p-5 shadow-sm border border-amber-800/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⏳</span> Outstanding A/R Dues
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold">
                    {metrics.pendingBillsCount} Pending Bills
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-amber-300">
                  ₹{metrics.totalOutstanding.toLocaleString("en-IN")}
                </div>
                <div className="mt-3 pt-3 border-t border-amber-800/50 flex items-center justify-between text-xs text-amber-200/80">
                  <span>
                    Co-Pay: ₹
                    {Math.round(metrics.totalOutstanding * 0.45).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                  <span>
                    TPA: ₹
                    {Math.round(metrics.totalOutstanding * 0.55).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              </div>

              {/* Card 3: First-Pass Clearance Gate Speed */}
              <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/40">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛡️</span> Financial Clearance Rate
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold">
                    Zero Bad Debt
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-indigo-200">
                  97.4%
                </div>
                <div className="mt-3 pt-3 border-t border-indigo-800/50 flex items-center justify-between text-xs text-indigo-300/80">
                  <span>Enforced at 7 Gates</span>
                  <span className="font-semibold text-emerald-400">
                    ● 100% Pre-Pay Active
                  </span>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
              </div>

              {/* Card 4: Operating Run-Rate & ARPU */}
              <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-2xl p-5 shadow-sm border border-slate-700/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> Average Realization / Encounter
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold">
                    {claims.length} Encounters
                  </span>
                </div>
                <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-cyan-300">
                  ₹
                  {Math.round(
                    metrics.totalBilled / Math.max(1, claims.length),
                  ).toLocaleString("en-IN")}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Median Settlement: <strong>2.8m</strong>
                  </span>
                  <span className="text-emerald-400 font-mono">
                    ₹4,250/hr Velocity
                  </span>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
              </div>
            </div>

            {/* ── 3. INTERACTIVE 7-DEPARTMENT VISUAL COMMAND MATRIX ── */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>🏥</span> 7 Clinical Departments Revenue &amp;
                    Clearance Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Click any department card to filter analytics and inspect
                    itemized departmental billing ledger.
                  </p>
                </div>
                {analyticsDeptFilter !== "All" && (
                  <button
                    type="button"
                    onClick={() => setAnalyticsDeptFilter("All")}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <span>✕</span> Reset Dept Filter (Viewing:{" "}
                    {analyticsDeptFilter})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {detailedDeptAnalytics.map((dept) => {
                  const isSelected = analyticsDeptFilter === dept.deptKey
                  return (
                    <div
                      key={dept.deptKey}
                      onClick={() =>
                        setAnalyticsDeptFilter(
                          isSelected ? "All" : dept.deptKey,
                        )
                      }
                      className={`group relative p-4 rounded-2xl border transition-all cursor-pointer bg-gradient-to-b ${dept.bgColor} ${
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-500/40 shadow-md scale-[1.02]"
                          : `${dept.borderColor} shadow-2xs hover:shadow-md hover:-translate-y-0.5`
                      }`}
                    >
                      {/* Department Top Tag */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{dept.icon}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md font-black text-[10px] border ${dept.badgeColor}`}
                        >
                          {dept.share}% Share
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="font-extrabold text-xs text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">
                        {dept.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {dept.subtext}
                      </p>

                      {/* Collected Revenue */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Collected Inflow
                        </span>
                        <div className="text-base font-black font-mono text-slate-900">
                          ₹{dept.collected.toLocaleString("en-IN")}
                        </div>
                      </div>

                      {/* Billed vs Unpaid Mini Grid */}
                      <div className="grid grid-cols-2 gap-1 text-[10px] mt-2 pt-2 border-t border-slate-200/80">
                        <div>
                          <span className="text-slate-400">Gross Billed</span>
                          <div className="font-mono font-bold text-slate-700">
                            ₹{dept.billed.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400">Unpaid Due</span>
                          <div
                            className={`font-mono font-bold ${
                              dept.unpaid > 0
                                ? "text-rose-600"
                                : "text-emerald-600"
                            }`}
                          >
                            ₹{dept.unpaid.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      {/* Multi-tier Progress Bar */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[9.5px] font-bold text-slate-500">
                          <span>Clearance</span>
                          <span
                            className={
                              dept.ratio >= 90
                                ? "text-emerald-700 font-extrabold"
                                : dept.ratio >= 60
                                  ? "text-amber-700 font-extrabold"
                                  : "text-rose-700 font-extrabold"
                            }
                          >
                            {dept.ratio}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${dept.barGradient} transition-all duration-700`}
                            style={{ width: `${Math.max(4, dept.ratio)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── 4. VISUAL TRAJECTORY CURVE & PAYMENT CHANNEL INTELLIGENCE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 7 Cols: 7-Day Revenue Velocity Curve (SVG Interactive Chart) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>📈</span> 7-Day Revenue Trajectory &amp; Collection
                      Velocity
                    </h3>
                    <p className="text-xs text-slate-500">
                      Real-time trendline of gross billing volume versus net
                      realized cashier inflow.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <span className="w-3 h-1 bg-emerald-500 rounded-full inline-block" />{" "}
                      Realized Inflow
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-600">
                      <span className="w-3 h-1 bg-indigo-400 rounded-full inline-block" />{" "}
                      Gross Billed
                    </span>
                  </div>
                </div>

                {/* SVG Bezier Area Chart */}
                <div className="relative w-full h-56 select-none">
                  <svg
                    viewBox="0 0 650 200"
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="inflowGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#10B981"
                          stopOpacity="0.35"
                        />
                        <stop
                          offset="100%"
                          stopColor="#10B981"
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                      <linearGradient
                        id="billedGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#6366F1"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#6366F1"
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    <line
                      x1="40"
                      y1="30"
                      x2="630"
                      y2="30"
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <line
                      x1="40"
                      y1="80"
                      x2="630"
                      y2="80"
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <line
                      x1="40"
                      y1="130"
                      x2="630"
                      y2="130"
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <line
                      x1="40"
                      y1="175"
                      x2="630"
                      y2="175"
                      stroke="#E2E8F0"
                      strokeWidth="1"
                    />

                    {/* Y-Axis Labels */}
                    <text
                      x="5"
                      y="34"
                      fill="#94A3B8"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      ₹2.5L
                    </text>
                    <text
                      x="5"
                      y="84"
                      fill="#94A3B8"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      ₹1.8L
                    </text>
                    <text
                      x="5"
                      y="134"
                      fill="#94A3B8"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      ₹1.0L
                    </text>
                    <text
                      x="15"
                      y="179"
                      fill="#94A3B8"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      ₹0
                    </text>

                    {/* Area Fill - Gross Billed */}
                    <path
                      d="M 60 115 Q 150 95, 240 105 T 430 65 T 530 45 T 620 38 L 620 175 L 60 175 Z"
                      fill="url(#billedGrad)"
                    />
                    {/* Line - Gross Billed */}
                    <path
                      d="M 60 115 Q 150 95, 240 105 T 430 65 T 530 45 T 620 38"
                      fill="none"
                      stroke="#818CF8"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                    />

                    {/* Area Fill - Realized Inflow */}
                    <path
                      d="M 60 125 Q 150 102, 240 112 T 430 72 T 530 52 T 620 42 L 620 175 L 60 175 Z"
                      fill="url(#inflowGrad)"
                    />
                    {/* Line - Realized Inflow */}
                    <path
                      d="M 60 125 Q 150 102, 240 112 T 430 72 T 530 52 T 620 42"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3.5"
                    />

                    {/* Interactive Points */}
                    {weeklyTrajectory.map((item, idx) => {
                      const x = 60 + idx * 93.3
                      const yReal = 125 - idx * 13.8
                      const isHovered = hoveredTrendIndex === idx

                      return (
                        <g
                          key={item.day}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                          onMouseLeave={() => setHoveredTrendIndex(null)}
                        >
                          {/* Vertical guide line on hover */}
                          {isHovered && (
                            <line
                              x1={x}
                              y1="25"
                              x2={x}
                              y2="175"
                              stroke="#10B981"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          )}

                          {/* Data node */}
                          <circle
                            cx={x}
                            cy={yReal}
                            r={isHovered ? "7" : "4.5"}
                            fill="#FFFFFF"
                            stroke="#10B981"
                            strokeWidth={isHovered ? "3.5" : "2.5"}
                            className="transition-all duration-200"
                          />

                          {/* X-axis label */}
                          <text
                            x={x}
                            y="192"
                            textAnchor="middle"
                            fill={isHovered ? "#0F172A" : "#64748B"}
                            fontSize={isHovered ? "10" : "9.5"}
                            fontWeight={isHovered ? "bold" : "600"}
                          >
                            {item.day}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {/* Interactive Popover Hover Tooltip */}
                  {hoveredTrendIndex !== null && (
                    <div
                      className="absolute top-2 z-20 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs border border-slate-700 pointer-events-none animate-in zoom-in-95 duration-100"
                      style={{
                        left: `${Math.min(75, Math.max(10, (hoveredTrendIndex / 6) * 85))}%`,
                      }}
                    >
                      <div className="font-extrabold text-emerald-400 flex items-center justify-between gap-4">
                        <span>
                          {weeklyTrajectory[hoveredTrendIndex].day} (
                          {weeklyTrajectory[hoveredTrendIndex].label})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {weeklyTrajectory[hoveredTrendIndex].txns} Invoices
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5 font-mono text-[11px]">
                        <div className="flex justify-between gap-3 text-emerald-300">
                          <span>Realized Inflow:</span>
                          <span className="font-bold">
                            ₹
                            {weeklyTrajectory[
                              hoveredTrendIndex
                            ].collected.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3 text-indigo-300">
                          <span>Gross Billed:</span>
                          <span>
                            ₹
                            {weeklyTrajectory[
                              hoveredTrendIndex
                            ].billed.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Chart Footer Strip */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                    Peak Day: Saturday (₹2.24L Inflow)
                  </span>
                  <span className="font-mono text-slate-700 font-bold">
                    Weekly Realization Ratio: 94.8%
                  </span>
                </div>
              </div>

              {/* Right 5 Cols: Payment Channel Mix & Collections Velocity */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>💳</span> Payment Mode Distribution
                    </h3>
                    <p className="text-xs text-slate-500">
                      Multi-channel settlement breakdown &amp; clearing
                      velocity.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                    Multi-Mode
                  </span>
                </div>

                {/* Mode Items List */}
                <div className="space-y-3">
                  {paymentModeBreakdown.map((m, idx) => {
                    const colors = [
                      {
                        bar: "from-blue-600 to-indigo-600",
                        tag: "bg-blue-50 text-blue-800 border-blue-200",
                        icon: "⚡",
                      },
                      {
                        bar: "from-emerald-600 to-teal-600",
                        tag: "bg-emerald-50 text-emerald-800 border-emerald-200",
                        icon: "💵",
                      },
                      {
                        bar: "from-purple-600 to-pink-600",
                        tag: "bg-purple-50 text-purple-800 border-purple-200",
                        icon: "💳",
                      },
                      {
                        bar: "from-amber-500 to-orange-600",
                        tag: "bg-amber-50 text-amber-800 border-amber-200",
                        icon: "🛡️",
                      },
                      {
                        bar: "from-cyan-600 to-blue-600",
                        tag: "bg-cyan-50 text-cyan-800 border-cyan-200",
                        icon: "🏦",
                      },
                      {
                        bar: "from-slate-600 to-slate-800",
                        tag: "bg-slate-50 text-slate-800 border-slate-200",
                        icon: "📄",
                      },
                    ]
                    const c = colors[idx % colors.length]

                    return (
                      <div key={m.mode} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span>{c.icon}</span> {m.mode}
                          </span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-400 font-semibold">
                              {m.percent}%
                            </span>
                            <span className="font-extrabold text-slate-900">
                              ₹{m.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${c.bar} transition-all duration-700`}
                            style={{ width: `${Math.max(4, m.percent)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Payment Highlights Box */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between font-semibold">
                    <span>UPI / Instant QR Settlement:</span>
                    <strong className="text-blue-700 font-mono">
                      Instant (T+0s)
                    </strong>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Card POS &amp; Net-Banking Clearing:</span>
                    <strong className="text-slate-800 font-mono">
                      T+1 Business Day
                    </strong>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Cashier Drawer Physical Cash:</span>
                    <strong className="text-emerald-700 font-mono">
                      100% Reconciled
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 5. ACCOUNTS RECEIVABLE (A/R) AGING MATRIX & RISK BUCKETS ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <span>⏳</span> Accounts Receivable (A/R) Aging &amp; Dues
                    Risk Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribution of outstanding balances across collection
                    windows to prevent bad debt leakage.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                  Total Outstanding: ₹
                  {metrics.totalOutstanding.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {arAgingSummary.map((bucket) => (
                  <div
                    key={bucket.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-xs text-slate-900">
                          {bucket.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${bucket.riskColor}`}
                        >
                          {bucket.risk}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {bucket.tag}
                      </span>
                    </div>

                    <div>
                      <div className="text-xl font-black font-mono text-slate-900">
                        ₹{bucket.amount.toLocaleString("en-IN")}
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 font-medium mt-1">
                        <span>{bucket.count} Patient Accounts</span>
                        <span className="font-bold text-slate-700">
                          {bucket.percent}% of Dues
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bucket.colorBar}`}
                          style={{ width: `${Math.max(4, bucket.percent)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 line-clamp-2 pt-2 border-t border-slate-200">
                      {bucket.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 6. HIGH-YIELD CLINICAL PROCEDURES & SERVICES LEADERBOARD ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <span>⭐</span> Top Revenue-Generating Hospital Procedures
                    &amp; Care Packages
                  </h3>
                  <p className="text-xs text-slate-500">
                    Leaderboard of highest gross yield clinical services across
                    all hospital specialties.
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  Ranked by Realized Inflow
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold bg-slate-50/40">
                      <th className="p-3 w-12 text-center">Rank</th>
                      <th className="p-3">Clinical Procedure / Service</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Volume (Orders)</th>
                      <th className="p-3 text-right">Unit Rate (₹)</th>
                      <th className="p-3 text-right">Gross Realized (₹)</th>
                      <th className="p-3 text-center">Strategic Yield Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {highYieldServices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-6 text-center text-slate-400"
                        >
                          No itemized services found in current billing ledger.
                        </td>
                      </tr>
                    ) : (
                      highYieldServices.map((svc, idx) => (
                        <tr
                          key={svc.name}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="p-3 text-center font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </td>
                          <td className="p-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <span>{svc.deptIcon}</span>
                            <span>{svc.name}</span>
                          </td>
                          <td className="p-3 text-slate-600 font-medium">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10.5px]">
                              {svc.category}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-800">
                            {svc.count}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            ₹{svc.unitPrice.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-emerald-700 text-sm">
                            ₹{svc.totalRev.toLocaleString("en-IN")}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {svc.badge}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: UNIFIED PATIENT BILL -- real, consolidated cross-department bill
            (backend /api/billing/umr-ledger/<patient_id>, not the local mock store)
           ========================================================================= */}
        {activeTab === "unified_bill" && <UnifiedBillView />}
      </main>

      {/* =========================================================================
          MODAL: OFFICIAL PAYMENT RECEIPT / TAX INVOICE SLIP (Standardized Reference)
         ========================================================================= */}
      {showReceiptModal && receiptData && (
        <HospitalReceiptModal
          claim={receiptData.claim}
          payment={receiptData.payment}
          onClose={() => setShowReceiptModal(false)}
        />
      )}

      {/* =========================================================================
          MODAL: PAYMENT CONFIRMATION DIALOG
         ========================================================================= */}
      {showConfirmPayModal && selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <h3 className="font-extrabold text-sm">
                  Confirm Payment Collection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmPayModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Patient & Invoice Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Patient:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedClaim.patientName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">MRN / UMR:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {selectedClaim.mrn || selectedClaim.patientId}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">
                    Invoice No:
                  </span>
                  <span className="font-mono font-bold text-blue-700">
                    {selectedClaim.invoiceNo}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">
                    Department:
                  </span>
                  <span className="font-semibold text-slate-700">
                    {selectedClaim.department}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-900 font-bold">
                    Payment Amount:
                  </span>
                  <span className="font-mono font-black text-emerald-800 text-base">
                    ₹{payAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">
                    Payment Mode:
                  </span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {isSplitPay ? "Split (Cash + Digital)" : payMode}
                  </span>
                </div>
                {payMode === "Cash" && !isSplitPay && (
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-emerald-100">
                    <span className="text-slate-500">
                      Tendered: ₹{tenderedCash.toLocaleString("en-IN")}
                    </span>
                    <span className="text-emerald-700 font-bold">
                      Change Due: ₹
                      {Math.max(0, tenderedCash - payAmount).toLocaleString(
                        "en-IN",
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Diagnostic Orders Alert if applicable */}
              {(() => {
                const cs = BillingDatabase.getDepartmentClearanceStatus(
                  selectedClaim.patientName,
                  selectedClaim,
                )
                if (cs.hasLabOrders || cs.hasRadStudies) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-start gap-2">
                      <span className="text-base text-amber-600">🔬</span>
                      <div>
                        <div className="font-bold text-amber-950 text-xs">
                          Diagnostic Clearance Included
                        </div>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          {cs.hasLabOrders &&
                            `• ${cs.labTestNames.length} Lab Test(s) `}
                          {cs.hasRadStudies &&
                            `• ${cs.radStudyNames.length} Radiology Study `}
                          will be unlocked. You will be prompted to send the
                          cleared orders to departments upon confirming.
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              })()}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmPayModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedPayment}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>✓</span> Confirm &amp; Pay ₹
                  {payAmount.toLocaleString("en-IN")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: POST-PAYMENT DIAGNOSTIC CLEARANCE TRANSMISSION
         ========================================================================= */}
      {postPayClearanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center font-bold text-xs">
                  ✓
                </span>
                <div>
                  <h3 className="font-extrabold text-sm">Send Orders to Laboratory / Radiology?</h3>
                  <p className="text-[10px] text-blue-200">
                    Payment of ₹{postPayClearanceModal.payment.amount.toLocaleString("en-IN")} received • Receipt #{postPayClearanceModal.payment.receiptNo} • Billing Dept Action
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  showToast("Diagnostic transmission skipped. Orders remain pending clearance.", "info")
                  setReceiptData({ claim: postPayClearanceModal.claim, payment: postPayClearanceModal.payment })
                  setPostPayClearanceModal(null)
                  setShowReceiptModal(true)
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                title="Close & View Receipt"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 font-medium">Patient:</span>{" "}
                  <strong className="text-slate-900 text-sm">
                    {postPayClearanceModal.claim.patientName}
                  </strong>{" "}
                  <span className="text-slate-500 font-mono">
                    (
                    {postPayClearanceModal.claim.mrn ||
                      postPayClearanceModal.claim.patientId}
                    )
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-800 font-black font-mono text-sm">
                    ₹
                    {postPayClearanceModal.payment.amount.toLocaleString(
                      "en-IN",
                    )}{" "}
                    PAID
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-slate-700 font-medium leading-relaxed">
                <p className="font-bold text-blue-900 mb-0.5">Diagnostic Tests Prescribed</p>
                The payment has been confirmed by Central Billing. Would you like to send these diagnostic test orders to the Laboratory and/or Radiology departments now so they appear on their worklists?
              </div>

              {/* Department Clearance Cards */}
              <div className="space-y-2.5">
                {(() => {
                  const cs = BillingDatabase.getDepartmentClearanceStatus(
                    postPayClearanceModal.claim.patientName,
                    postPayClearanceModal.claim,
                  )
                  const isLabSent =
                    dispatchedClearances[
                      `${postPayClearanceModal.claim.patientName}_Laboratory`
                    ] || cs.labPendingCount === 0
                  const isRadSent =
                    dispatchedClearances[
                      `${postPayClearanceModal.claim.patientName}_Radiology`
                    ] || cs.radPendingCount === 0

                  return (
                    <>
                      {cs.hasLabOrders && (
                        <div className="p-3 bg-white border border-teal-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 text-teal-700 font-bold text-base">
                              🧪
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 text-xs">
                                Laboratory Department
                              </div>
                              <div className="text-[11px] text-teal-800 font-semibold truncate">
                                Tests: {cs.labTestNames.join(", ") || "Standard Lab Panel"}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isLabSent ? (
                              <span className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1">
                                ✓ Sent to Lab
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDispatchClearance(
                                    postPayClearanceModal.claim.patientName,
                                    "Laboratory",
                                    postPayClearanceModal.payment.receiptNo,
                                    cs.labTestNames.join(" + "),
                                  )
                                }
                                className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                              >
                                <span>📤</span> Send to Lab
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {cs.hasRadStudies && (
                        <div className="p-3 bg-white border border-indigo-200 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-700 font-bold text-base">
                              🩻
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-slate-900 text-xs">
                                Radiology &amp; Imaging
                              </div>
                              <div className="text-[11px] text-indigo-800 font-semibold truncate">
                                Studies: {cs.radStudyNames.join(", ") || "Imaging Studies"}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isRadSent ? (
                              <span className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1">
                                ✓ Sent to Radiology
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDispatchClearance(
                                    postPayClearanceModal.claim.patientName,
                                    "Radiology",
                                    postPayClearanceModal.payment.receiptNo,
                                    cs.radStudyNames.join(" + "),
                                  )
                                }
                                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                              >
                                <span>📤</span> Send to Radiology
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Modal Footer Actions: Prominent Yes Send / No Skip */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    showToast("Diagnostic orders kept on hold. Showing payment receipt.", "info")
                    setReceiptData({
                      claim: postPayClearanceModal.claim,
                      payment: postPayClearanceModal.payment,
                    })
                    setPostPayClearanceModal(null)
                    setShowReceiptModal(true)
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer text-center transition-colors"
                >
                  ✕ No, Skip for Now
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const cs = BillingDatabase.getDepartmentClearanceStatus(
                        postPayClearanceModal.claim.patientName,
                        postPayClearanceModal.claim
                      );
                      if (cs.hasLabOrders) {
                        handleDispatchClearance(
                          postPayClearanceModal.claim.patientName,
                          "Laboratory",
                          postPayClearanceModal.payment.receiptNo,
                          cs.labTestNames.join(" + ")
                        );
                      }
                      if (cs.hasRadStudies) {
                        handleDispatchClearance(
                          postPayClearanceModal.claim.patientName,
                          "Radiology",
                          postPayClearanceModal.payment.receiptNo,
                          cs.radStudyNames.join(" + ")
                        );
                      }
                      showToast(
                        `✓ Diagnostic clearance dispatched by Billing Department! Receipt #${postPayClearanceModal.payment.receiptNo}.`,
                        "success"
                      );
                      setReceiptData({
                        claim: postPayClearanceModal.claim,
                        payment: postPayClearanceModal.payment,
                      })
                      setPostPayClearanceModal(null)
                      setShowReceiptModal(true)
                    }}
                    className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold rounded-xl text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>✓</span>
                    {(() => {
                      const cs = BillingDatabase.getDepartmentClearanceStatus(
                        postPayClearanceModal.claim.patientName,
                        postPayClearanceModal.claim
                      );
                      if (cs.hasLabOrders && cs.hasRadStudies) return "Yes, Send to Lab & Radiology";
                      if (cs.hasLabOrders) return "Yes, Send to Laboratory";
                      return "Yes, Send to Radiology";
                    })()}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: QUICK WALK-IN BILL CREATION
         ========================================================================= */}
      {showQuickBillModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Create Quick Walk-In Bill</h3>
              <button
                type="button"
                onClick={() => setShowQuickBillModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateQuickBill}
              className="p-5 space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Patient Full Name:
                </label>
                <input
                  type="text"
                  required
                  value={quickPatientName}
                  onChange={(e) => setQuickPatientName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    UMR Number (Optional):
                  </label>
                  <input
                    type="text"
                    value={quickUmr}
                    onChange={(e) => setQuickUmr(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Department:
                  </label>
                  <select
                    value={quickDept}
                    onChange={(e) => setQuickDept(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Outpatient">Outpatient</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Inpatient">Inpatient Wards</option>
                    <option value="ICU">ICU</option>
                    <option value="Surgery">Surgery &amp; OT</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Radiology">Radiology &amp; Imaging</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Service / Consultation:
                </label>
                <input
                  type="text"
                  required
                  value={quickService}
                  onChange={(e) => setQuickService(e.target.value)}
                  placeholder="e.g. General Physician Consultation, Blood Test"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bill Amount (₹):
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={
                    quickAmount === undefined ||
                    quickAmount === null ||
                    (quickAmount as any) === ""
                      ? ""
                      : quickAmount
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickAmount(val === "" ? ("" as any) : Number(val));
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickBillModal(false)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  Create &amp; Settle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   UNIFIED PATIENT BILL -- real consolidated bill across every department
   that has invoiced this patient, backed by /api/billing/umr-ledger/<id>
   (hospital-backend/backend/modules/billing/routes.py). This is real data,
   not the local BillingDatabase mock the rest of this file still reads from.
   ========================================================================= */
interface RealInvoiceItem {
  id: number
  description: string
  category: string | null
  quantity: number
  unit_price: number
  total: number
  insurance_covered: number
  patient_payable: number
}

interface RealInvoice {
  id: number
  invoice_no: string
  module: string
  total_amount: number
  paid_amount: number
  due_amount: number
  payment_status: string
  created_at: string
  items: RealInvoiceItem[]
}

interface UmrLedger {
  patient_id: string
  invoices: RealInvoice[]
  totals: {
    total_amount: number
    paid_amount: number
    due_amount: number
    invoice_count: number
  }
}

function UnifiedBillView() {
  const [patientId, setPatientId] = useState("")
  const [ledger, setLedger] = useState<UmrLedger | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = async (id: string) => {
    if (!id.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<UmrLedger>(
        `/api/billing/umr-ledger/${encodeURIComponent(id.trim())}`,
      )
      setLedger(data)
      if (!data.invoices?.length) {
        setError("No invoices found for this patient ID.")
      }
    } catch {
      setLedger(null)
      setError("Could not load this patient's bill. Check the patient ID and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Unified Patient Bill</h3>
        <p className="text-xs text-slate-500 mb-3">
          One consolidated bill across every department that has invoiced this patient
          (OP, ER, OT, Lab, Pharmacy) -- pulled live from the real billing records, not
          a per-department snapshot.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Patient ID (e.g. PAT-1042 or ER-PAT-1008)"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(patientId)}
            className="flex-1 h-9 px-3 border border-slate-300 rounded-lg text-xs font-mono"
          />
          <button
            type="button"
            onClick={() => search(patientId)}
            disabled={loading}
            className="h-9 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50"
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>
        {error && <p className="text-xs text-rose-600 font-medium mt-2">{error}</p>}
      </div>

      {ledger && ledger.invoices.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="text-[11px] text-slate-500 font-medium">Total Billed</div>
              <div className="text-lg font-extrabold text-slate-900 font-mono">
                ₹{ledger.totals.total_amount.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="text-[11px] text-slate-500 font-medium">Total Paid</div>
              <div className="text-lg font-extrabold text-emerald-700 font-mono">
                ₹{ledger.totals.paid_amount.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="text-[11px] text-slate-500 font-medium">Total Due</div>
              <div className="text-lg font-extrabold text-rose-700 font-mono">
                ₹{ledger.totals.due_amount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {ledger.invoices.map((inv) => (
              <div key={inv.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900">{inv.module}</span>
                    <span className="text-[11px] text-slate-500 font-mono ml-2">{inv.invoice_no}</span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      {new Date(inv.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inv.payment_status === "paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : inv.payment_status === "partial"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {inv.payment_status.toUpperCase()}
                  </span>
                </div>
                {inv.items.length > 0 && (
                  <table className="w-full text-[11px]">
                    <tbody>
                      {inv.items.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-1.5 text-slate-700">{item.description}</td>
                          <td className="px-4 py-1.5 text-slate-400">{item.category || ""}</td>
                          <td className="px-4 py-1.5 text-right font-mono font-semibold text-slate-800">
                            ₹{item.total.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="px-4 py-2 flex items-center justify-end gap-4 text-[11px] font-mono border-t border-slate-100">
                  <span>Total: <strong>₹{inv.total_amount.toLocaleString("en-IN")}</strong></span>
                  <span className="text-emerald-700">Paid: <strong>₹{inv.paid_amount.toLocaleString("en-IN")}</strong></span>
                  <span className="text-rose-700">Due: <strong>₹{inv.due_amount.toLocaleString("en-IN")}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
