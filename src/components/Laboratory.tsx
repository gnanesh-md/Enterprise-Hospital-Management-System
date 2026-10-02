import React, { useState, useEffect, useMemo } from "react"
import {
  LabOrder,
  LabOrderTest,
  LabOrderDatabase,
  LabTestStatus,
  LabParameterResult,
  priceForTest,
} from "../services/labOrdersDb"
import {
  ALL_LAB_TESTS,
  LAB_CATALOGUE,
  findTestDefinition,
  LabTestDefinition,
} from "./laboratory/labCatalogueSchema"
import TestResultModal from "./laboratory/TestResultModal"
import ImportAllResultsModal from "./laboratory/ImportAllResultsModal"
import CompleteLabReportModal from "./laboratory/CompleteLabReportModal"
import TestCatalogView from "./laboratory/TestCatalogView"
import { AuditDatabase } from "../services/auditDb"

const QUEUE_TABS = [
  { label: "All Orders", key: "all" },
  { label: "Pre-Paid (Ready)", key: "paid" },
  { label: "Payment Pending", key: "pending" },
  { label: "Critical Values", key: "critical" },
  { label: "Completed & Verified", key: "completed" },
]

export default function Laboratory({
  technician = "Laboratory Specialist",
}: {
  technician?: string
}) {
  const [tick, setTick] = useState(0)
  const [activeQueue, setActiveQueue] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"orders" | "catalog">("orders")
  
  // Modals state
  const [activeTestForResult, setActiveTestForResult] = useState<{
    order: LabOrder
    test: LabOrderTest
  } | null>(null)
  const [showImportAllModal, setShowImportAllModal] = useState<LabOrder | null>(null)
  const [showCompleteReportModal, setShowCompleteReportModal] = useState<LabOrder | null>(null)
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null)

  // Direct order creation form state
  const [newOrderForm, setNewOrderForm] = useState({
    patientName: "",
    umr: "",
    age: 35,
    sex: "Male",
    phone: "",
    opNumber: "",
    doctorName: "Dr. Arvind Sharma",
    department: "Internal Medicine",
    diagnosis: "General Investigation",
    selectedTests: ["CBC / Complete Hemogram"],
  })

  // Subscribe to changes in LabOrderDatabase
  useEffect(() => {
    return LabOrderDatabase.subscribe(() => setTick((t) => t + 1))
  }, [])

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Load all lab orders
  const allOrders = useMemo(() => {
    return LabOrderDatabase.getLabWorklist()
  }, [tick])

  // Helper to determine if an order is completed
  const isOrderCompleted = (order: LabOrder): boolean => {
    if (order.status === "Completed") return true
    if (
      order.tests.length > 0 &&
      order.tests.every(
        (t) => t.status === "Completed" || t.status === "Verified"
      )
    ) {
      return true
    }
    return false
  }

  // Filter orders by active queue tab, search query, and category
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      const isCompleted = isOrderCompleted(order)

      // 1. Queue filter
      if (activeQueue === "all" && isCompleted) return false
      if (activeQueue === "paid" && (order.billing.status !== "Paid" || isCompleted)) return false
      if (activeQueue === "pending" && (order.billing.status !== "Pending" || isCompleted)) return false
      if (activeQueue === "collected" && (order.status !== "Sample Collected" || isCompleted)) return false
      if (activeQueue === "processing" && (order.status !== "In Progress" || isCompleted)) return false
      if (activeQueue === "critical") {
        const hasCritical = order.tests.some(
          (t) =>
            t.flag === "Critical" ||
            Object.values(t.results || {}).some((r) => r.flag === "Critical")
        )
        if (!hasCritical) return false
      }
      if (activeQueue === "completed" && !isCompleted) return false

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = order.patientName.toLowerCase().includes(q)
        const matchUmr = order.umr.toLowerCase().includes(q)
        const matchId = order.id.toLowerCase().includes(q)
        const matchDoctor = order.doctorName.toLowerCase().includes(q)
        const matchTest = order.tests.some((t) => t.name.toLowerCase().includes(q))
        if (!matchName && !matchUmr && !matchId && !matchDoctor && !matchTest) return false
      }

      // 3. Category filter
      if (categoryFilter !== "all") {
        const matchCat = order.tests.some(
          (t) => t.category.toLowerCase() === categoryFilter.toLowerCase()
        )
        if (!matchCat) return false
      }

      return true
    })
  }, [allOrders, activeQueue, searchQuery, categoryFilter])

  // Currently opened order in detail view
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null
    return allOrders.find((o) => o.id === selectedOrderId) || null
  }, [allOrders, selectedOrderId])

  // Quick statistics
  const stats = useMemo(() => {
    const activeOrders = allOrders.filter((o) => !isOrderCompleted(o))
    const total = activeOrders.length
    const paid = activeOrders.filter((o) => o.billing.status === "Paid").length
    const pending = activeOrders.filter((o) => o.billing.status === "Pending").length
    const processing = activeOrders.filter(
      (o) => o.status === "In Progress" || o.status === "Sample Collected"
    ).length
    const critical = allOrders.filter((o) =>
      o.tests.some(
        (t) =>
          t.flag === "Critical" ||
          Object.values(t.results || {}).some((r) => r.flag === "Critical")
      )
    ).length
    const completed = allOrders.filter(isOrderCompleted).length
    return { total, paid, pending, processing, critical, completed }
  }, [allOrders])

  // Save individual test result from modal
  const handleSaveTestResult = (
    testId: string,
    status: "Result Entered" | "Completed" | "Verified",
    results: Record<string, LabParameterResult>,
    clinicalComments?: string,
    technicianName?: string,
    verifierName?: string,
    tableData?: any[]
  ) => {
    if (!activeTestForResult) return
    const updated = LabOrderDatabase.saveDetailedTestResult(
      activeTestForResult.order.id,
      testId,
      {
        status,
        results,
        clinicalComments,
        technician: technicianName || technician,
        verifier: verifierName,
        tableData,
        actor: technician,
      }
    )

    if (updated) {
      setActiveTestForResult(null)
      const isNowCompleted = isOrderCompleted(updated)
      showToast(
        isNowCompleted
          ? `✓ All tests completed! Order ${updated.id} moved to Completed & Verified.`
          : `✓ Results for ${activeTestForResult.test.name} saved.`,
        "success"
      )
    }
  }

  // Batch Save all tests from Import All modal
  const handleSaveAllBatch = (
    updatedTestsData: Array<{
      testId: string
      status: "Completed" | "Result Entered"
      results: Record<string, LabParameterResult>
      clinicalComments?: string
      technician?: string
      verifier?: string
    }>
  ) => {
    if (!showImportAllModal) return
    if (showImportAllModal.billing.status !== "Paid") {
      showToast("Action restricted: Billing payment is pending for this patient.", "error")
      return
    }
    const orderId = showImportAllModal.id

    updatedTestsData.forEach((item) => {
      LabOrderDatabase.saveDetailedTestResult(orderId, item.testId, {
        status: item.status,
        results: item.results,
        clinicalComments: item.clinicalComments,
        technician: item.technician || technician,
        verifier: item.verifier,
        actor: technician,
      })
    })

    setShowImportAllModal(null)
    showToast(
      `✓ All ${updatedTestsData.length} test results successfully imported & updated for ${showImportAllModal.patientName}!`,
      "success"
    )
  }

  // Advance test status directly (e.g. Sample Collected -> Processing)
  const handleAdvanceTestStatus = (
    order: LabOrder,
    test: LabOrderTest,
    nextStatus: LabTestStatus
  ) => {
    const updated = LabOrderDatabase.updateTestStatus(
      order.id,
      test.id,
      nextStatus,
      technician,
      {
        sampleCollector: technician,
        technician,
      }
    )

    if (updated) {
      showToast(`✓ ${test.name} status updated to "${nextStatus}"`, "info")
      AuditDatabase.logEvent(
        `Test ${nextStatus}`,
        "Laboratory",
        `${technician} marked ${test.name} as ${nextStatus} for ${order.patientName} (${order.umr}).`,
        "Success"
      )
    }
  }

  // Create new lab order directly from Lab module
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrderForm.patientName.trim()) {
      showToast("Please enter patient name", "error")
      return
    }

    const umr = newOrderForm.umr.trim() || `PAT-${Math.floor(10000 + Math.random() * 90000)}`
    const opNumber = newOrderForm.opNumber.trim() || `OP-2026-${Math.floor(1000 + Math.random() * 9000)}`

    const created = LabOrderDatabase.createOrder({
      encounterId: `ENC-${Math.floor(1000 + Math.random() * 9000)}`,
      umr,
      patientName: newOrderForm.patientName,
      age: Number(newOrderForm.age) || 35,
      sex: newOrderForm.sex,
      phone: newOrderForm.phone || "+91 98765 00000",
      opNumber,
      doctorId: "DOC-DIRECT",
      doctorName: newOrderForm.doctorName,
      department: newOrderForm.department,
      diagnosis: newOrderForm.diagnosis,
      tests: newOrderForm.selectedTests.map((tName) => {
        const def = findTestDefinition(tName)
        return {
          name: def?.name || tName,
          category: def?.category || "PATHOLOGY",
          urgency: "Routine",
        }
      }),
    })

    setShowNewOrderModal(false)
    showToast(
      `✓ New Lab Order ${created.id} created for ${created.patientName}. Sent to billing!`,
      "success"
    )
    AuditDatabase.logEvent(
      "Lab Order Created",
      "Laboratory",
      `New lab order ${created.id} created for ${created.patientName} (${created.umr}) with ${created.tests.length} test(s).`,
      "Success"
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F6F9] overflow-hidden">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-none shadow-lg text-xs font-bold text-white flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-600"
              : toastMessage.type === "error"
              ? "bg-red-600"
              : "bg-blue-600"
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner / Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-none bg-blue-100 text-blue-800 uppercase tracking-wider">
              Diagnostic Pathology
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-600 font-medium">
              LIS & Specimen Bench
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mt-0.5">
            Laboratory Portal
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "catalog" ? "orders" : "catalog")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 border cursor-pointer ${
              viewMode === "catalog"
                ? "bg-slate-800 text-white border-slate-700"
                : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
            }`}
          >
            <span>📖</span> Test Catalog
          </button>
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-none shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>+</span> New Lab Order
          </button>
        </div>
      </div>

      {/* Quick Statistics Strip */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
        <div className="p-2 rounded-none bg-gray-50 border border-gray-100">
          <span className="text-gray-400 block text-[10.5px]">Active Orders</span>
          <strong className="text-base font-bold text-gray-900">{stats.total}</strong>
        </div>
        <div className="p-2 rounded-none bg-emerald-50 border border-emerald-100">
          <span className="text-emerald-700 block text-[10.5px]">Pre-Paid (Ready)</span>
          <strong className="text-base font-bold text-emerald-800">{stats.paid}</strong>
        </div>
        <div className="p-2 rounded-none bg-amber-50 border border-amber-100">
          <span className="text-amber-700 block text-[10.5px]">Awaiting Billing</span>
          <strong className="text-base font-bold text-amber-800">{stats.pending}</strong>
        </div>
        <div className="p-2 rounded-none bg-red-50 border border-red-100">
          <span className="text-red-700 block text-[10.5px]">Critical Alerts</span>
          <strong className="text-base font-bold text-red-800">{stats.critical}</strong>
        </div>
        <div className="p-2 rounded-none bg-indigo-50 border border-indigo-100">
          <span className="text-indigo-700 block text-[10.5px]">Completed & Signed</span>
          <strong className="text-base font-bold text-indigo-800">{stats.completed}</strong>
        </div>
      </div>

      {/* Primary Work Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
        
        {/* CONDITIONAL:
            1. If viewing Test Catalog, show dedicated TEST CATALOG VIEW
            2. If entering test result, show FULL PAGE RESULT VIEW
            3. If patient selected, show PATIENT DETAILS view
            4. Otherwise PATIENT LIST view */}
        {viewMode === "catalog" ? (
          <TestCatalogView onBackToOrders={() => setViewMode("orders")} />
        ) : activeTestForResult ? (
          <TestResultModal
            order={activeTestForResult.order}
            test={activeTestForResult.test}
            onClose={() => setActiveTestForResult(null)}
            onSave={handleSaveTestResult}
          />
        ) : selectedOrder ? (
          /* ========================================================================= */
          /* PATIENT DETAILS & ORDERED TESTS VIEW                                      */
          /* ========================================================================= */
          <div className="flex-1 bg-white rounded-none shadow-xs border border-gray-200 flex flex-col overflow-hidden">
            
            {/* Header / Actions Bar (Clean Eye-Friendly Soft Light Theme) */}
            <div className="bg-white text-gray-900 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-none border border-slate-300 transition-colors flex items-center gap-1.5"
                >
                  <span>←</span> Back to Patient List
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">
                      {selectedOrder.patientName}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 font-mono border border-slate-200">
                      {selectedOrder.umr}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-none font-semibold ${
                        selectedOrder.billing.status === "Paid"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      Billing: {selectedOrder.billing.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 mt-0.5 block">
                    Visit: {selectedOrder.opNumber || selectedOrder.encounterId} · Order: {selectedOrder.id} · Age/Sex: {selectedOrder.age}y/{selectedOrder.sex}
                  </span>
                </div>
              </div>

              {/* Action Buttons (Soft, eye-pleasing executive tones) */}
              <div className="flex items-center gap-2.5">
                <button
                  disabled={selectedOrder.billing.status !== "Paid"}
                  onClick={() => {
                    if (selectedOrder.billing.status !== "Paid") return
                    setShowImportAllModal(selectedOrder)
                  }}
                  title={
                    selectedOrder.billing.status !== "Paid"
                      ? "Action Restricted: Billing payment is pending at reception desk"
                      : "Batch enter results for all ordered tests"
                  }
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-none border transition-colors flex items-center gap-1.5 ${
                    selectedOrder.billing.status === "Paid"
                      ? "text-teal-800 bg-teal-50 hover:bg-teal-100 border-teal-200 cursor-pointer"
                      : "text-gray-400 bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                  }`}
                >
                  <span>⚡</span> Import All Test Results
                </button>
                <button
                  onClick={() => setShowCompleteReportModal(selectedOrder)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-none transition-colors flex items-center gap-1.5"
                >
                  <span>📋</span> Complete Laboratory Report
                </button>
                {isOrderCompleted(selectedOrder) && (
                  <span className="px-3 py-1.5 rounded-none text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    ✓ Completed & Verified
                  </span>
                )}
              </div>
            </div>

            {/* Patient Clinical Info Card */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block text-[11px]">Ordering Physician</span>
                <strong className="text-gray-900">{selectedOrder.doctorName}</strong>
                <span className="text-gray-500 block text-[11px]">{selectedOrder.department}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Clinical Diagnosis</span>
                <strong className="text-gray-900">{selectedOrder.diagnosis || "Under Evaluation"}</strong>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Clinical Notes / Advice</span>
                <span className="text-gray-700">{selectedOrder.clinicalNotes || "Standard diagnostic workup"}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Payment Reference</span>
                {selectedOrder.billing.status === "Paid" ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ Paid ({selectedOrder.billing.receiptNo}) · ₹{selectedOrder.billing.total}
                  </span>
                ) : (
                  <span className="text-amber-700 font-semibold">
                    ⚠️ Unpaid (₹{selectedOrder.billing.total}) · Pending at Reception
                  </span>
                )}
              </div>
            </div>

            {/* Warning Banner if Billing is Pending */}
            {selectedOrder.billing.status === "Pending" && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    <strong>Payment Pending in Billing Desk:</strong> Investigations are listed as ordered by the doctor. Processing and verification are restricted until billing is settled.
                  </span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-none">
                  Awaiting Billing Settlement
                </span>
              </div>
            )}

            {/* Ordered Tests Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Ordered Investigations ({selectedOrder.tests.length})
                  </h3>
                  <span className="text-xs text-gray-500">
                    Doctor prescribed investigations
                  </span>
                </div>
              </div>

              <div className="border border-gray-200 rounded-none overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">Test Name & Code</th>
                      <th className="py-2.5 px-4">Laboratory Module</th>
                      <th className="py-2.5 px-4">Urgency</th>
                      <th className="py-2.5 px-4">Price</th>
                      <th className="py-2.5 px-4">Billing Status</th>
                      <th className="py-2.5 px-4">Result Summary</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {selectedOrder.tests.map((test) => {
                      const def = findTestDefinition(test.name)
                      const isPaid = selectedOrder.billing.status === "Paid"
                      const hasResults = test.results && Object.keys(test.results).length > 0

                      return (
                        <tr key={test.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4">
                            <strong className="text-gray-900 block text-xs">
                              {test.name}
                            </strong>
                            <span className="text-[11px] text-gray-500 font-medium">
                              {def?.code || test.id} {def?.subModule ? `• ${def.subModule}` : ""}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-none bg-gray-100 text-gray-700 text-[11px] font-medium uppercase">
                              {def?.category || test.category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {test.urgency === "STAT" ? (
                              <span className="px-2 py-0.5 rounded-none bg-red-100 text-red-800 font-bold text-[10.5px]">
                                STAT
                              </span>
                            ) : (
                              <span className="text-gray-500 text-[11px]">Routine</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-gray-800">
                            ₹{test.price}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-none font-bold text-[11px] inline-flex items-center gap-1 ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              <span>●</span> {isPaid ? "Paid" : "Pending"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {hasResults ? (
                              <div>
                                <span className="font-bold text-gray-900">
                                  {Object.values(test.results!)[0]?.value}{" "}
                                  {Object.values(test.results!)[0]?.unit}
                                </span>
                                {test.flag === "H" && (
                                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-none">
                                    ▲ High
                                  </span>
                                )}
                                {test.flag === "L" && (
                                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-none">
                                    ▼ Low
                                  </span>
                                )}
                                {test.flag === "Critical" && (
                                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.2 bg-red-600 text-white rounded-none">
                                    CRITICAL
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">
                                {test.result || "No results yet"}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isPaid ? (
                              <span className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-100 rounded-none border border-gray-200 cursor-not-allowed">
                                Restricted
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                {test.status === "Pending" && (
                                  <button
                                    onClick={() => handleAdvanceTestStatus(selectedOrder, test, "Sample Collected")}
                                    className="px-2.5 py-1 text-xs font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 rounded-none transition-colors"
                                  >
                                    Collect Sample
                                  </button>
                                )}
                                {test.status === "Sample Collected" && (
                                  <button
                                    onClick={() => handleAdvanceTestStatus(selectedOrder, test, "Processing")}
                                    className="px-2.5 py-1 text-xs font-bold text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-none transition-colors"
                                  >
                                    Start Processing
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    setActiveTestForResult({
                                      order: selectedOrder,
                                      test,
                                    })
                                  }
                                  className={`px-3 py-1 text-xs font-bold rounded-none transition-colors ${
                                    test.status === "Completed" || test.status === "Verified"
                                      ? "text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300"
                                      : "text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                                  }`}
                                >
                                  {test.status === "Completed" || test.status === "Verified" || test.status === "Result Entered"
                                    ? "View / Edit"
                                    : "Enter Results"}
                                </button>
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

          </div>
        ) : (
          /* ========================================================================= */
          /* LABORATORY PATIENT LIST VIEW                                              */
          /* ========================================================================= */
          <div className="flex-1 bg-white rounded-none shadow-xs border border-gray-200 flex flex-col overflow-hidden">
            
            {/* Filter Tabs */}
            <div className="border-b border-gray-200 px-6 pt-3 flex items-center justify-between overflow-x-auto bg-gray-50/50">
              <div className="flex items-center gap-1">
                {QUEUE_TABS.map((tab) => {
                  const isActive = activeQueue === tab.key
                  let count = 0
                  if (tab.key === "all") count = allOrders.filter((o) => !isOrderCompleted(o)).length
                  if (tab.key === "paid") count = allOrders.filter((o) => o.billing.status === "Paid" && !isOrderCompleted(o)).length
                  if (tab.key === "pending") count = allOrders.filter((o) => o.billing.status === "Pending" && !isOrderCompleted(o)).length
                  if (tab.key === "collected") count = allOrders.filter((o) => o.status === "Sample Collected" && !isOrderCompleted(o)).length
                  if (tab.key === "processing") count = allOrders.filter((o) => o.status === "In Progress" && !isOrderCompleted(o)).length
                  if (tab.key === "critical") count = stats.critical
                  if (tab.key === "completed") count = allOrders.filter(isOrderCompleted).length

                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveQueue(tab.key)}
                      className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                        isActive
                          ? "border-blue-600 text-blue-600 bg-white shadow-2xs rounded-none"
                          : "border-transparent text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10.5px] px-1.5 py-0.2 rounded-none ${
                          isActive
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Search and Secondary Filter Bar */}
            <div className="p-4 border-b border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[280px] max-w-md relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Patient Name, ID (PAT-xxxx), Lab Order ID, Doctor, Test..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-none border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span>Module:</span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="text-xs font-semibold px-2.5 py-1.5 border rounded-none bg-white"
                  >
                    <option value="all">All Modules</option>
                    <option value="hematology">Hematology</option>
                    <option value="pathology">Pathology</option>
                    <option value="microbiology">Microbiology</option>
                    <option value="biochemistry">Biochemistry</option>
                    <option value="immunology / serology">Immunology / Serology</option>
                    <option value="thyroid function">Thyroid Function</option>
                    <option value="other special tests">Other Special Tests</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Patients Table */}
            <div className="flex-1 overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                  <div className="w-12 h-12 rounded-none bg-gray-100 flex items-center justify-center text-2xl mb-2">
                    🧪
                  </div>
                  <h3 className="text-sm font-bold text-gray-700">No Laboratory Orders Found</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    Orders dispatched by doctors from Doctor Portal or walk-ins created here will appear on this worklist.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4">Patient ID / Name</th>
                      <th className="py-2.5 px-4">Visit / Encounter</th>
                      <th className="py-2.5 px-4">Ordering Doctor</th>
                      <th className="py-2.5 px-4">Lab Order ID</th>
                      <th className="py-2.5 px-4">Ordered Tests</th>
                      <th className="py-2.5 px-4">Billing Status</th>
                      <th className="py-2.5 px-4">Date / Time</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredOrders.map((order) => {
                      const isPaid = order.billing.status === "Paid"
                      const hasCritical = order.tests.some(
                        (t) =>
                          t.flag === "Critical" ||
                          Object.values(t.results || {}).some((r) => r.flag === "Critical")
                      )

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          {/* Patient ID / Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <strong className="text-gray-900 block text-xs font-bold">
                                {order.patientName}
                              </strong>
                              {hasCritical && (
                                <span className="px-1.5 py-0.2 rounded-none text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                                  CRITICAL
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                              <span className="font-mono font-semibold text-blue-700">
                                {order.umr}
                              </span>
                              <span>•</span>
                              <span>{order.age}y/{order.sex}</span>
                            </div>
                          </td>

                          {/* Visit / Encounter */}
                          <td className="py-3 px-4 font-mono text-gray-700 text-xs">
                            {order.opNumber || order.encounterId}
                          </td>

                          {/* Doctor */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900 block text-xs">
                              {order.doctorName}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {order.department}
                            </span>
                          </td>

                          {/* Lab Order ID */}
                          <td className="py-3 px-4 font-mono font-bold text-gray-800 text-xs">
                            {order.id}
                          </td>

                          {/* Ordered Tests */}
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {order.tests.slice(0, 3).map((t) => (
                                <span
                                  key={t.id}
                                  className={`px-2 py-0.5 rounded-none text-[10.5px] font-semibold border ${
                                    t.status === "Completed" || t.status === "Verified"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-gray-100 text-gray-700 border border-gray-200"
                                  }`}
                                >
                                  {t.name}
                                  {(t.status === "Completed" || t.status === "Verified") && " ✓"}
                                </span>
                              ))}
                              {order.tests.length > 3 && (
                                <span className="text-[10px] text-blue-600 font-bold self-center">
                                  +{order.tests.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Billing Status */}
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <span
                              className={`px-2.5 py-0.5 rounded-none font-bold text-[11px] inline-flex items-center gap-1 ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              <span>●</span> {order.billing.status}
                            </span>
                          </td>

                          {/* Date / Time */}
                          <td className="py-3 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                            })} · {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedOrderId(order.id)}
                              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-none transition-colors shadow-2xs"
                            >
                              Open Details →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 2. Import All Test Results Modal */}
      {showImportAllModal && (
        <ImportAllResultsModal
          order={showImportAllModal}
          onClose={() => setShowImportAllModal(null)}
          onSaveAll={handleSaveAllBatch}
        />
      )}

      {/* 3. Complete Laboratory Report Modal */}
      {showCompleteReportModal && (
        <CompleteLabReportModal
          order={showCompleteReportModal}
          onClose={() => setShowCompleteReportModal(null)}
        />
      )}

      {/* 4. New Lab Order Modal */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-none shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Create Laboratory Order</h3>
                <p className="text-xs text-blue-200">
                  Dispatches new test request to Laboratory and Billing modules
                </p>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="text-white hover:text-gray-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newOrderForm.patientName}
                  onChange={(e) =>
                    setNewOrderForm({ ...newOrderForm, patientName: e.target.value })
                  }
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full text-xs px-3 py-2 border rounded-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Patient ID / UMR
                  </label>
                  <input
                    type="text"
                    value={newOrderForm.umr}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, umr: e.target.value })
                    }
                    placeholder="PAT-xxxxx"
                    className="w-full text-xs px-3 py-2 border rounded-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={newOrderForm.age}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, age: Number(e.target.value) })
                    }
                    className="w-full text-xs px-3 py-2 border rounded-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Gender
                  </label>
                  <select
                    value={newOrderForm.sex}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, sex: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 border rounded-none bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Referring Doctor
                  </label>
                  <input
                    type="text"
                    value={newOrderForm.doctorName}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, doctorName: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 border rounded-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newOrderForm.department}
                    onChange={(e) =>
                      setNewOrderForm({ ...newOrderForm, department: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 border rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Select Investigations to Order
                </label>
                <div className="max-h-40 overflow-y-auto border rounded-none p-2 space-y-1.5 bg-gray-50">
                  {ALL_LAB_TESTS.slice(0, 25).map((test) => {
                    const isChecked = newOrderForm.selectedTests.includes(test.name)
                    return (
                      <label
                        key={test.id}
                        className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer hover:bg-white p-1 rounded-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewOrderForm({
                                ...newOrderForm,
                                selectedTests: [...newOrderForm.selectedTests, test.name],
                              })
                            } else {
                              setNewOrderForm({
                                ...newOrderForm,
                                selectedTests: newOrderForm.selectedTests.filter(
                                  (t) => t !== test.name
                                ),
                              })
                            }
                          }}
                        />
                        <span className="font-medium">{test.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono ml-auto">
                          ₹{test.price}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="bg-gray-50 -mx-6 -mb-6 p-4 border-t flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 border rounded-none text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-none hover:bg-blue-700 shadow-sm"
                >
                  Create & Send to Billing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
