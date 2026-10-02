import React, { useRef } from "react"
import { LabOrder } from "../../services/labOrdersDb"
import { findTestDefinition } from "./labCatalogueSchema"
import { AuditDatabase } from "../../services/auditDb"

interface CompleteLabReportModalProps {
  order: LabOrder
  onClose: () => void
}

export default function CompleteLabReportModal({
  order,
  onClose,
}: CompleteLabReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    AuditDatabase.logEvent(
      "Laboratory Report Printed",
      "Laboratory",
      `Complete laboratory diagnostic report printed for patient ${order.patientName} (${order.umr}) - Order ${order.id}.`,
      "Success"
    )
    window.print()
  }

  // Group tests by Category / Module
  const testsByCategory = order.tests.reduce((acc, test) => {
    const def = findTestDefinition(test.name)
    const category = def?.category || test.category || "GENERAL PATHOLOGY"
    if (!acc[category]) acc[category] = []
    acc[category].push({ test, def })
    return acc
  }, {} as Record<string, Array<{ test: typeof order.tests[0]; def: ReturnType<typeof findTestDefinition> }>>)

  const reportDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  const reportTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-none shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Modal Top Control Bar */}
        <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-none bg-blue-600 uppercase">
              Official Diagnostic Report
            </span>
            <span className="text-xs text-gray-300">
              Lab Order: <strong>{order.id}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-none transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>🖨️</span> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-8 bg-white text-gray-900 font-sans print:p-0">
          
          {/* Hospital Header */}
          <div className="border-b-2 border-blue-900 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-blue-950 tracking-tight">
                  KIMS HOSPITAL & RESEARCH CENTRE
                </h1>
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-widest">
                  Department of Laboratory Medicine & Diagnostic Pathology
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  NABL Accredited Laboratory (ISO 15189:2022) · CAP Certified · Lic No: LAB-TS-8942
                </p>
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 rounded-none text-center">
                  <span className="text-[10px] text-gray-500 uppercase block font-semibold">
                    Accreditation ID
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-900">
                    NABL-MC-3041
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Demographics & Order Metadata */}
          <div className="bg-gray-50/80 rounded-none p-3.5 border border-gray-200 text-xs mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="text-gray-400 block text-[10.5px]">Patient Name</span>
              <strong className="text-gray-900 text-sm">{order.patientName}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10.5px]">Patient ID / UMR</span>
              <strong className="font-mono text-gray-800 text-xs">{order.umr}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10.5px]">Age / Gender</span>
              <strong className="text-gray-800">{order.age} Yrs / {order.sex}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10.5px]">Visit / OP Number</span>
              <strong className="text-gray-800">{order.opNumber || order.encounterId}</strong>
            </div>

            <div>
              <span className="text-gray-400 block text-[10.5px]">Ordering Physician</span>
              <strong className="text-gray-800">{order.doctorName}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10.5px]">Department</span>
              <strong className="text-gray-800">{order.department}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10.5px]">Collection Date / Time</span>
              <span className="text-gray-700">
                {new Date(order.createdAt).toLocaleDateString("en-IN")} · {new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10.5px]">Report Date / Time</span>
              <strong className="text-gray-800">{reportDate} · {reportTime}</strong>
            </div>
          </div>

          {/* Module-wise Test Results */}
          <div className="space-y-6">
            {Object.entries(testsByCategory).map(([category, items]) => (
              <div key={category} className="border border-gray-300 rounded-none overflow-hidden shadow-2xs">
                
                {/* Category Header */}
                <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider">
                    {category}
                  </h2>
                  <span className="text-[10px] text-slate-300 font-medium">
                    {items.length} Test(s) Performed
                  </span>
                </div>

                {/* Tests inside Category */}
                <div className="divide-y divide-gray-200">
                  {items.map(({ test, def }) => {
                    const hasResults = test.results && Object.keys(test.results).length > 0
                    const isCulture = def?.subModule?.includes("Culture") || test.name.includes("C/S")

                    return (
                      <div key={test.id} className="p-4 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="text-sm font-bold text-blue-900">
                              {test.name}
                            </h3>
                            {def?.subModule && (
                              <span className="text-[11px] text-gray-500 font-medium">
                                Sub-module: {def.subModule} · Specimen: {def.sampleType || "Standard"}
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-none text-[11px] font-bold ${
                              test.status === "Completed" || test.status === "Verified"
                                ? "bg-emerald-100 text-emerald-800"
                                : test.status === "Result Entered"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {test.status}
                          </span>
                        </div>

                        {/* Parameter Results Table */}
                        {hasResults ? (
                          <div className="overflow-x-auto my-2">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-gray-100 text-gray-700 font-semibold text-[11px] border-y border-gray-200">
                                <tr>
                                  <th className="py-1.5 px-3">Investigation Parameter</th>
                                  <th className="py-1.5 px-3">Observed Value</th>
                                  <th className="py-1.5 px-3">Flag</th>
                                  <th className="py-1.5 px-3">Unit</th>
                                  <th className="py-1.5 px-3">Biological Reference Interval</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {Object.entries(test.results!).map(([paramName, res]) => (
                                  <tr key={paramName} className="hover:bg-gray-50/50">
                                    <td className="py-1.5 px-3 font-medium text-gray-800">
                                      {paramName}
                                    </td>
                                    <td className="py-1.5 px-3 font-bold text-gray-900">
                                      {res.value}
                                    </td>
                                    <td className="py-1.5 px-3">
                                      {res.flag === "H" && (
                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-none bg-amber-100 text-amber-800">
                                          ▲ High
                                        </span>
                                      )}
                                      {res.flag === "L" && (
                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-none bg-blue-100 text-blue-800">
                                          ▼ Low
                                        </span>
                                      )}
                                      {res.flag === "Critical" && (
                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-none bg-red-600 text-white">
                                          CRITICAL
                                        </span>
                                      )}
                                      {!res.flag && (
                                        <span className="text-gray-400 text-[10px]">—</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-3 text-gray-600">
                                      {res.unit || "—"}
                                    </td>
                                    <td className="py-1.5 px-3 text-gray-500 font-mono text-[11px]">
                                      {res.referenceRange || "Normal"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-2 text-xs text-gray-500 italic">
                            Result: <strong>{test.result || "Awaiting result entry"}</strong>
                            {test.referenceRange && ` (Ref: ${test.referenceRange})`}
                          </div>
                        )}

                        {/* AST Antibiotic Susceptibility Table if present */}
                        {isCulture && test.tableData && test.tableData.length > 0 && (
                          <div className="mt-3 border border-gray-300 rounded-none overflow-hidden bg-slate-50">
                            <div className="bg-slate-200/80 px-3 py-1 text-[11px] font-bold text-slate-800">
                              Antimicrobial Susceptibility Profile
                            </div>
                            <table className="w-full text-[11px] text-left">
                              <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
                                <tr>
                                  <th className="p-1.5 px-3">Antimicrobial</th>
                                  <th className="p-1.5 px-3">Zone Diameter</th>
                                  <th className="p-1.5 px-3">MIC</th>
                                  <th className="p-1.5 px-3">Interpretation</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {test.tableData.map((row: any, i: number) => (
                                  <tr key={i}>
                                    <td className="p-1.5 px-3 font-medium text-gray-800">{row.antibiotic}</td>
                                    <td className="p-1.5 px-3 text-gray-600">{row.zone}</td>
                                    <td className="p-1.5 px-3 text-gray-600">{row.mic}</td>
                                    <td className="p-1.5 px-3 font-bold">
                                      <span
                                        className={
                                          row.susceptibility === "Sensitive"
                                            ? "text-emerald-700"
                                            : row.susceptibility === "Intermediate"
                                            ? "text-amber-700"
                                            : "text-red-700"
                                        }
                                      >
                                        {row.susceptibility}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Comments */}
                        {test.clinicalComments && (
                          <p className="text-[11px] text-gray-600 mt-2 bg-gray-50 p-2 rounded-none border border-gray-200">
                            <strong>Note:</strong> {test.clinicalComments}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* End of Report Summary & Signatures */}
          <div className="mt-8 pt-4 border-t-2 border-gray-300">
            <div className="text-[11px] text-gray-500 mb-6 italic">
              *** End of Laboratory Examination Report ***<br />
              This is an electronically validated diagnostic report. Results relate strictly to the sample specimen received.
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4 text-xs">
              <div className="border-t border-gray-400 pt-2">
                <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                  Prepared & Tested By
                </span>
                <strong className="text-gray-900 block text-xs">
                  {order.tests[0]?.technician || "Ananya Sen, B.Sc MLT"}
                </strong>
                <span className="text-[10.5px] text-gray-500">
                  Medical Laboratory Technologist
                </span>
              </div>

              <div className="border-t border-gray-400 pt-2">
                <span className="text-[10px] text-gray-400 uppercase block font-semibold">
                  Verified & Authorized By
                </span>
                <strong className="text-gray-900 block text-xs">
                  {order.tests[0]?.verifier || "Dr. Rajesh Gupta, MD (Path)"}
                </strong>
                <span className="text-[10.5px] text-gray-500">
                  Consultant Pathologist · Reg No: 48921
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-gray-100 border-t border-gray-200 px-6 py-3 flex items-center justify-between no-print">
          <span className="text-xs text-gray-500">
            Total Investigations: <strong>{order.tests.length}</strong> · Billing Status: <strong>{order.billing.status}</strong>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-none shadow-xs cursor-pointer"
            >
              Print Report
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-none hover:bg-gray-50 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
