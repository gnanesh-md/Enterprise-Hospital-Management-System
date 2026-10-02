import { useState, useMemo } from "react"
import {
  ArrowLeft,
  Printer,
  MoreHorizontal,
  Send,
  User,
  Calendar,
  Bed,
  Shield,
  CreditCard,
  CheckCircle2,
  FileText,
  AlertCircle,
  Clock,
  Upload,
  Plus,
  ArrowRight,
  Sparkles,
  Home,
  Mail,
  Check,
  Building,
  DollarSign,
  FileCheck,
} from "lucide-react"
import type { ComprehensiveClaimRecord } from "../../types/insurance"
import { DESK_STEPS, stepOf } from "./deskGuide"
import { DocumentChecklist, NextStep } from "./forms"
import { MailComposer, MailThread } from "./mail"
import { Hint, KV, NEXT_HINT, StatusPill, fmtDate, fmtDateTime, inr, type Notify } from "./ui"
import { AuditTable, BillLines, Consumption, Readiness } from "./widgets"
import ClaimPharmacyBillsView from "./ClaimPharmacyBillsView"
import ClaimPatientJourneyView from "./ClaimPatientJourneyView"
import ClaimEmailTrackerView from "./ClaimEmailTrackerView"

const TABS = ["Current Step", "Bills & Pharmacy", "Patient Journey", "Emails", "Documents", "Details", "History"] as const
type Tab = (typeof TABS)[number]

export default function ClaimWorkspace({
  c,
  notify,
  onBack,
  onOpenBilling,
  onOpenEmailHub,
}: {
  c: ComprehensiveClaimRecord
  notify: Notify
  onBack: () => void
  onOpenBilling?: () => void
  onOpenEmailHub?: () => void
}) {
  const [tab, setTab] = useState<Tab>("Current Step")
  const stage = stepOf(c)
  const closed = c.status === "CLOSED"
  const stopped = ["NOT_ELIGIBLE", "PREAUTH_REJECTED", "REJECTED"].includes(c.status)
  const mand = c.documents.filter((d) => d.isMandatory)
  const verified = mand.filter((d) => d.isUploaded && d.status === "Verified").length
  const initials = c.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()

  const approvalCode = c.preAuth?.approvalCode || "PA-2026-4482"
  const invoiceNumber = c.invoiceNo || "INV-2026-0814"
  const policyNum = c.policy.policyNumber || "CH1234567890"

  const hospitalBill = c.totalHospitalBill || c.finalClaimAmount || 5300
  const claimAmount = c.finalClaimAmount || c.preAuth?.requestedAmount || hospitalBill
  const nonPayable = 0
  const patientShare = 0

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* ── Top Header & Actions Bar ── */}
      <div className="bg-white border-b border-slate-200/80 px-8 py-4.5 sticky top-0 z-30 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1700px] mx-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Back to Claims Register"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{c.patientName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  {c.id}
                </span>
                <StatusPill status={c.status} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.policy.insurerName} • Policy: <span className="font-mono text-slate-700 font-medium">{policyNum}</span> • Stage {stage.n}/8: {stage.title}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Printer size={14} className="text-slate-500" />
              <span>Print Dossier</span>
            </button>
            <button
              type="button"
              onClick={() => notify("Additional claim options opened", "success")}
              className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <MoreHorizontal size={15} className="text-slate-500" />
            </button>
            <button
              type="button"
              onClick={() => notify("Claim package sent to insurer gateway!", "success")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <span>Send to Insurer</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-[1700px] mx-auto w-full">
        {/* ── Patient Profile Hero Card ── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4.5">
            <div className="w-14 h-14 rounded-2xl bg-[#D1FAE5] text-emerald-800 font-extrabold text-lg flex items-center justify-center shrink-0 border border-emerald-200">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{c.patientName}</h1>
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Claim ready
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium flex flex-wrap items-center gap-2">
                <span className="font-mono text-slate-600">{c.id}</span>
                <span className="text-slate-300">|</span>
                <span>{c.encounterType || "ICU"} - Admitted: {fmtDate(c.admissionDate)}</span>
                <span className="text-slate-300">|</span>
                <span>Male, 45 yrs</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium flex flex-wrap items-center gap-2">
                <span>{c.policy.insurerName} / {c.policy.tpaName || "FHPL (Family Health Plan TPA)"}</span>
                <span className="text-slate-300">|</span>
                <span className="font-mono">Policy: {policyNum}</span>
              </div>
            </div>
          </div>

          {/* 4 Compact Meta Pill Badges on Right */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-cyan-50/70 border border-cyan-100 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-100/80 text-cyan-700 flex items-center justify-center shrink-0">
                <User size={13} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Ward</div>
                <div className="text-xs font-bold text-slate-800">{c.encounterType || "ICU"}</div>
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                <Calendar size={13} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Admission</div>
                <div className="text-xs font-bold text-slate-800">{fmtDate(c.admissionDate)}</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-200/70 text-slate-700 flex items-center justify-center shrink-0">
                <Bed size={13} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Discharge</div>
                <div className="text-xs font-bold text-slate-800">Pending</div>
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                <Shield size={13} />
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">Policy No.</div>
                <div className="text-xs font-bold text-slate-800 font-mono truncate max-w-[85px]">{policyNum}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5 Financial KPI Summary Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Hospital Bill */}
          <div className="bg-[#FAF5FF]/70 border border-purple-100/90 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Hospital Bill</div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight">{inr(hospitalBill)}</div>
            </div>
          </div>

          {/* Card 2: Pre-auth Approved */}
          <div className="bg-[#ECFDF5]/70 border border-emerald-100/90 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Pre-auth Approved</div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight">Yes</div>
              <div className="text-[10px] text-slate-400 font-mono">Approval No: {approvalCode}</div>
            </div>
          </div>

          {/* Card 3: Claim Amount */}
          <div className="bg-[#EFF6FF]/70 border border-blue-100/90 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <CreditCard size={18} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Claim Amount</div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight">{inr(claimAmount)}</div>
            </div>
          </div>

          {/* Card 4: Non-payable */}
          <div className="bg-[#FFF1F2]/70 border border-rose-100/90 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Shield size={18} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Non-payable</div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight">{inr(nonPayable)}</div>
            </div>
          </div>

          {/* Card 5: Settled Amount */}
          <div className="bg-[#FFFBEB]/70 border border-amber-100/90 rounded-2xl p-4 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Home size={18} />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Settled Amount</div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight">—</div>
              <div className="text-[10px] text-slate-400">Not yet settled</div>
            </div>
          </div>
        </div>

        {/* ── Main Layout (Left Stepper + Right Tabs Content) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
          {/* ── Left Stepper: Claim Progress ── */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Claim Progress</h3>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                In progress
              </span>
            </div>

            <ol className="relative pl-1 space-y-5">
              {/* Step 1 */}
              <li className="relative flex items-start gap-3">
                <span className="absolute left-[11px] top-6 bottom-[-20px] w-0.5 bg-emerald-400" />
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 z-10">
                  <Check size={13} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Patient Admission</div>
                  <div className="text-[11px] text-slate-400">Completed • 23 Aug 2026</div>
                </div>
              </li>

              {/* Step 2 */}
              <li className="relative flex items-start gap-3">
                <span className="absolute left-[11px] top-6 bottom-[-20px] w-0.5 bg-emerald-400" />
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 z-10">
                  <Check size={13} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Eligibility Verification</div>
                  <div className="text-[11px] text-slate-400">Completed • 24 Aug 2026</div>
                </div>
              </li>

              {/* Step 3 */}
              <li className="relative flex items-start gap-3">
                <span className="absolute left-[11px] top-6 bottom-[-20px] w-0.5 bg-emerald-400" />
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 z-10">
                  <Check size={13} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Pre-Authorization</div>
                  <div className="text-[11px] text-slate-400">Approved • 25 Aug 2026</div>
                </div>
              </li>

              {/* Step 4 */}
              <li className="relative flex items-start gap-3">
                <span className="absolute left-[11px] top-6 bottom-[-20px] w-0.5 bg-emerald-400" />
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 z-10">
                  <Check size={13} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Treatment / Surgery</div>
                  <div className="text-[11px] text-slate-400">Completed • 28 Aug 2026</div>
                </div>
              </li>

              {/* Step 5: Active */}
              <li className="relative flex items-start gap-3">
                <span className="absolute left-[11px] top-6 bottom-[-20px] w-0.5 bg-slate-200" />
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 z-10 ring-4 ring-blue-100">
                  5
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-900">Discharge &amp; Final Bill</div>
                  <div className="text-[11px] text-blue-600 font-semibold">In progress</div>
                </div>
              </li>

              {/* Step 6 */}
              <li className="relative flex items-start gap-3">
                <span className="absolute left-[11px] top-6 bottom-[-20px] w-0.5 bg-slate-200" />
                <div className="w-6 h-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0 z-10 bg-white">
                  6
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Claim Submission</div>
                  <div className="text-[11px] text-slate-400">Pending</div>
                </div>
              </li>

              {/* Step 7 */}
              <li className="relative flex items-start gap-3">
                <span className="absolute left-[11px] top-6 bottom-[-20px] w-0.5 bg-slate-200" />
                <div className="w-6 h-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0 z-10 bg-white">
                  7
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Claim Adjudication</div>
                  <div className="text-[11px] text-slate-400">Pending</div>
                </div>
              </li>

              {/* Step 8 */}
              <li className="relative flex items-start gap-3">
                <div className="w-6 h-6 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold shrink-0 z-10 bg-white">
                  8
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-500">Settlement</div>
                  <div className="text-[11px] text-slate-400">Pending</div>
                </div>
              </li>
            </ol>
          </div>

          {/* ── Right Content Pane with Tab Bar ── */}
          <div className="space-y-5 min-w-0">
            {/* Tabs Header */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-2xs flex items-center gap-1 overflow-x-auto scrollbar-none">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    tab === t
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <span>{t}</span>
                  {t === "Emails" && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab === t ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}>
                      3
                    </span>
                  )}
                  {t === "Documents" && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab === t ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                      0/2
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            {tab === "Current Step" && (
              <div className="space-y-5">
                {/* ── Active Step Banner (Discharge & Final Bill) ── */}
                <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-blue-50/30 border border-blue-100/90 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Send size={18} className="-rotate-12" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Discharge &amp; Final Bill</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Final bill received. Verify every claim document, then email the claim to the insurer.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenEmailHub}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-200/80 hover:bg-blue-50/80 text-blue-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <Mail size={14} className="text-blue-600" />
                    <span>View Full Email Hub</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* ── 2 Summary Boxes (Grid 2 cols) ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Box 1: Pre-Submission Checklist */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck size={16} className="text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-900">Pre-Submission Checklist</h4>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        3/4 Completed
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80">
                        <div className="flex items-center gap-2 font-medium text-slate-800">
                          <CheckCircle2 size={15} className="text-emerald-500" />
                          <span>Pre-auth approved</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">Approval No: {approvalCode}</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80">
                        <div className="flex items-center gap-2 font-medium text-slate-800">
                          <CheckCircle2 size={15} className="text-emerald-500" />
                          <span>Final bill ready</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">Invoice: {invoiceNumber}</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80">
                        <div className="flex items-center gap-2 font-medium text-slate-800">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                          <span>Documents uploaded &amp; verified</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">1 of 2 uploaded</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80">
                        <div className="flex items-center gap-2 font-medium text-slate-800">
                          <CheckCircle2 size={15} className="text-emerald-500" />
                          <span>Insurance clearance</span>
                        </div>
                        <span className="text-emerald-600 font-bold text-[11px]">Clear</span>
                      </div>
                    </div>
                  </div>

                  {/* Box 2: Claim Summary */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-900">Claim Summary</h4>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Hospital bill</span>
                        <span className="font-bold font-mono text-slate-900">{inr(hospitalBill)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Non-payable</span>
                        <span className="font-bold font-mono text-slate-900">{inr(nonPayable)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 text-slate-600">
                        <span>Patient share</span>
                        <span className="font-bold font-mono text-slate-900">{inr(patientShare)}</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 text-blue-900 font-bold mt-2">
                        <span className="font-semibold">Claim amount</span>
                        <span className="font-extrabold font-mono text-sm">{inr(claimAmount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Check the claim documents Section ── */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Check the claim documents</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Upload anything missing and verify each document against the original.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 font-medium">0/2 uploaded • 0/2 verified • 2 to upload</span>
                      <button
                        type="button"
                        onClick={() => notify("Requirement modal opened", "success")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add requirement</span>
                      </button>
                    </div>
                  </div>

                  {/* Document Category 1: Patient Documents */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <FileText size={15} className="text-blue-600" />
                      <span>Patient documents</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-slate-800">Patient ID Proof (Aadhaar / PAN)</div>
                            <div className="text-[11px] text-slate-400">Not uploaded</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => notify("Uploading ID Proof...", "success")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <Upload size={13} />
                          <span>Upload</span>
                        </button>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-slate-800">Signed Claim Form</div>
                            <div className="text-[11px] text-slate-400">Not uploaded</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => notify("Uploading Signed Claim Form...", "success")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <Upload size={13} />
                          <span>Upload</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Document Category 2: Hospital Documents */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <Building size={15} className="text-emerald-600" />
                      <span>Hospital documents</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-slate-800">Final Hospital Bill</div>
                            <div className="text-[11px] text-slate-400">Not uploaded</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => notify("Uploading Final Hospital Bill...", "success")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <Upload size={13} />
                          <span>Upload</span>
                        </button>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-slate-800">Discharge Summary</div>
                            <div className="text-[11px] text-slate-400">Not uploaded</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => notify("Uploading Discharge Summary...", "success")}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                        >
                          <Upload size={13} />
                          <span>Upload</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "Bills & Pharmacy" && (
              <ClaimPharmacyBillsView c={c} notify={notify} />
            )}

            {tab === "Patient Journey" && (
              <ClaimPatientJourneyView c={c} />
            )}

            {tab === "Emails" && (
              <ClaimEmailTrackerView c={c} notify={notify} />
            )}

            {tab === "Documents" && (
              <DocumentChecklist c={c} notify={notify} />
            )}

            {tab === "Details" && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Comprehensive Policy &amp; Clinical Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-[11px]">Primary Insurer</div>
                    <div className="font-bold text-slate-800 mt-0.5">{c.policy.insurerName}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-[11px]">TPA Network</div>
                    <div className="font-bold text-slate-800 mt-0.5">{c.policy.tpaName || "Direct"}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-[11px]">Member ID</div>
                    <div className="font-bold text-slate-800 mt-0.5 font-mono">{c.policy.memberId || "MEM-99210"}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-[11px]">Policy Sum Insured</div>
                    <div className="font-bold text-slate-800 mt-0.5 font-mono">{inr(c.policy.sumInsured || 500000)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-[11px]">Co-Pay Clause</div>
                    <div className="font-bold text-slate-800 mt-0.5">{c.policy.copayPercentage || 0}%</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-slate-400 text-[11px]">Pre-Auth Limit</div>
                    <div className="font-bold text-slate-800 mt-0.5 font-mono">{inr(c.approvedPreAuthAmount || 50000)}</div>
                  </div>
                </div>
              </div>
            )}

            {tab === "History" && (
              <AuditTable c={c} notify={notify} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
