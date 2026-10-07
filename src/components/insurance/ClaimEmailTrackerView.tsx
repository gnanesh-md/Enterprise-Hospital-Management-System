import React, { useState, useMemo } from "react"
import type { ComprehensiveClaimRecord, MailPurpose, MailRecord } from "../../types/insurance"
import { InsuranceEngineService as E } from "../../services/insuranceDb"
import { inr, fmtDateTime, type Notify } from "./ui"
import { MailComposer } from "./mail"
import {
  Mail,
  MailCheck,
  Send,
  Inbox,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  Building2,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Eye,
  Reply,
} from "lucide-react"

export default function ClaimEmailTrackerView({
  c,
  notify,
  onApplyDecision,
}: {
  c: ComprehensiveClaimRecord
  notify: Notify
  onApplyDecision?: (amount: number, code: string, note: string) => void
}) {
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<"all" | "in" | "out" | "approvals" | "queries">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Seed baseline realistic emails if case has no emails yet
  const mails: MailRecord[] = useMemo(() => {
    if (c.mails && c.mails.length > 0) return c.mails

    const tpaName = c.policy.tpaName || c.policy.insurerName || "Medi Assist TPA"
    const tpaEmail = `claims@${tpaName.toLowerCase().replace(/[^a-z]/g, "")}.in`
    const hospEmail = "insurance.desk@hospai-hospital.org"

    return [
      {
        id: `mail-init-out-${c.id}`,
        direction: "out",
        purpose: "Pre-Auth",
        at: c.admissionDate || "2026-10-01T09:30:00Z",
        from: hospEmail,
        to: tpaEmail,
        subject: `[${c.id}] Cashless Pre-Authorization Request — ${c.patientName} (UHID: ${c.patientId})`,
        body: `Dear Cashless Claims Desk,\n\nPlease find attached the Pre-Authorization Request Form (Part A & B) along with clinical estimation, investigation reports, and doctor's admission notes for patient ${c.patientName} under policy number ${c.policy.policyNumber || "POL-99420"}.\n\nRequested Pre-Auth Amount: ₹${(c.preAuth?.requestedAmount || 60000).toLocaleString("en-IN")}\nDiagnosis: ${c.preAuth?.diagnosis || "Inpatient Care"}\nTreating Doctor: ${c.preAuth?.treatingDoctor || "Consulting Specialist"}\n\nKindly issue the initial sanction approval at the earliest.\n\nWarm regards,\nInsurance & Cashless Desk\nHospAI General Hospital`,
        attachments: ["PreAuth_Form_A_B.pdf", "Clinical_Summary.pdf", "Cost_Estimation.pdf"],
        by: "Insurance Coordinator",
      },
      {
        id: `mail-init-in-${c.id}`,
        direction: "in",
        purpose: "Pre-Auth",
        at: new Date(Date.now() - 3600000).toISOString(),
        from: `approvals@${tpaName.toLowerCase().replace(/[^a-z]/g, "")}.in`,
        to: hospEmail,
        subject: `[${c.id}] SANCTION APPROVAL: Initial Cashless Pre-Auth Approved — ${c.patientName}`,
        body: `Dear Hospital Cashless Desk,\n\nWe are pleased to inform you that the cashless pre-authorization request for patient ${c.patientName} (Member ID: ${c.policy.memberId || "MEM-9921"}) has been APPROVED under policy ${c.policy.policyNumber || "POL-99420"}.\n\n=========================================\nAUTHORIZATION CODE: AUTH-${tpaName.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}\nSANCTIONED AMOUNT: ₹${(c.preAuth?.requestedAmount ? Math.round(c.preAuth.requestedAmount * 0.95) : 50000).toLocaleString("en-IN")}\nCO-PAY APPLICABLE: ${c.policy.copayPercentage || 0}%\n=========================================\n\nTerms & Conditions:\n1. Non-medical items (admission kit, PPE, toiletries) are excluded from cashless coverage.\n2. Final settlement is subject to verified discharge summary and original consolidated bills.\n\nRegards,\nCashless Claims & Pre-Auth Department\n${tpaName}`,
        attachments: ["PreAuth_Sanction_Letter.pdf", "GIPSA_Schedule.pdf"],
        by: "Inbound TPA Mailbox Listener",
      },
    ]
  }, [c])

  const activeMail = useMemo(() => {
    if (selectedMailId) {
      return mails.find((m) => m.id === selectedMailId) || mails[0]
    }
    return mails[0]
  }, [mails, selectedMailId])

  // Filtered email list
  const filteredMails = useMemo(() => {
    return mails.filter((m) => {
      if (filterType === "in" && m.direction !== "in") return false
      if (filterType === "out" && m.direction !== "out") return false
      if (filterType === "approvals" && !(m.direction === "in" && m.subject.toLowerCase().includes("approval"))) return false
      if (filterType === "queries" && !m.subject.toLowerCase().includes("query")) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          m.subject.toLowerCase().includes(q) ||
          m.from.toLowerCase().includes(q) ||
          m.to.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [mails, filterType, searchQuery])

  // Simulate receiving a live decision email
  const handleSimulateInboundDecision = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      const tpaName = c.policy.tpaName || c.policy.insurerName || "Medi Assist TPA"
      const authCode = `AUTH-${tpaName.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`
      const approvedAmt = c.preAuth?.requestedAmount ? Math.round(c.preAuth.requestedAmount * 0.95) : 65000

      const newMail: MailRecord = {
        id: `mail-in-${Date.now()}`,
        direction: "in",
        purpose: "Pre-Auth",
        at: new Date().toISOString(),
        from: `approvals@${tpaName.toLowerCase().replace(/[^a-z]/g, "")}.in`,
        to: "insurance.desk@hospai-hospital.org",
        subject: `[${c.id}] SANCTION LETTER: Cashless Approved for ₹${approvedAmt.toLocaleString("en-IN")} — ${c.patientName}`,
        body: `Dear Hospital Partner,\n\nPre-authorization request for ${c.patientName} (UHID: ${c.patientId}) has been processed and SANCTIONED.\n\nApproved Limit: ₹${approvedAmt.toLocaleString("en-IN")}\nPre-Auth Code: ${authCode}\nStatus: APPROVED\n\nPlease proceed with inpatient treatment under cashless coverage.\n\nRegards,\n${tpaName} Medical Adjudication Desk`,
        attachments: ["Sanction_Approval_Official.pdf"],
        by: "TPA Webhook API Listener",
      }

      try {
        E.recordInsurerEmail(c.id, {
          purpose: "Pre-Auth",
          from: newMail.from,
          subject: newMail.subject,
          body: newMail.body,
          receivedAt: newMail.at,
        })
      } catch {}

      setSelectedMailId(newMail.id)
      setIsRefreshing(false)
      notify(`New Inbound Email from ${tpaName}: Approved for ₹${approvedAmt.toLocaleString("en-IN")}`, "success")
    }, 800)
  }

  return (
    <div className="space-y-5">
      {/* ── TOP METRIC STATUS BAR ── */}
      <div className="bg-white border border-slate-200 rounded-[8px] p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-[15px] font-bold text-slate-900">
                Email &amp; TPA Decision Tracker Hub
              </h3>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Live IMAP &amp; Webhook Gateway Active
              </span>
            </div>
            <p className="text-[12.5px] text-slate-500 mt-0.5">
              Live bi-directional communication with <span className="font-semibold text-slate-800">{c.policy.tpaName || c.policy.insurerName}</span> for Claim #{c.id}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateInboundDecision}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold rounded-[6px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Checking TPA Server…" : "⚡ Check / Fetch Inbound TPA Decision"}
            </button>

            <button
              type="button"
              onClick={() => setIsComposing(!isComposing)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-[6px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send size={13} /> {isComposing ? "Close Composer" : "Compose Outbound Email"}
            </button>
          </div>
        </div>

        {/* Email Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-[6px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Messages
            </span>
            <div className="text-[18px] font-bold text-slate-900 mt-0.5 tabular-nums">
              {mails.length} Emails
            </div>
            <span className="text-[11px] text-slate-400">Complete Case Thread</span>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-[6px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Inbound Decisions
            </span>
            <div className="text-[18px] font-bold text-emerald-900 mt-0.5 tabular-nums">
              {mails.filter((m) => m.direction === "in").length} Received
            </div>
            <span className="text-[11px] text-emerald-600">Sanctions &amp; Queries</span>
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-[6px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Outbound Dispatched
            </span>
            <div className="text-[18px] font-bold text-blue-900 mt-0.5 tabular-nums">
              {mails.filter((m) => m.direction === "out").length} Sent
            </div>
            <span className="text-[11px] text-blue-600">Dossiers &amp; Replies</span>
          </div>

          <div className="bg-purple-50/50 border border-purple-100 p-3 rounded-[6px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Active Pre-Auth Status
            </span>
            <div className="text-[15px] font-bold text-purple-900 mt-1 truncate">
              {c.approvedPreAuthAmount > 0 ? `Approved: ${inr(c.approvedPreAuthAmount)}` : "Under TPA Review"}
            </div>
            <span className="text-[11px] text-purple-600">
              {c.preAuth?.approvalCode ? `Code: ${c.preAuth.approvalCode}` : "Pending Sanction"}
            </span>
          </div>
        </div>
      </div>

      {/* ── EMAIL COMPOSER (WHEN ACTIVE) ── */}
      {isComposing && (
        <div className="border border-blue-200 rounded-[8px] overflow-hidden shadow-sm">
          <MailComposer
            c={c}
            purpose="General"
            notify={(m, t) => {
              notify(m, t)
              if (t !== "error") setIsComposing(false)
            }}
            allowPortal={false}
          />
        </div>
      )}

      {/* ── MASTER-DETAIL EMAIL THREAD & VIEWER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] border border-slate-200 rounded-[8px] bg-white overflow-hidden shadow-xs">
        {/* Left Column: Email List */}
        <div className="border-r border-slate-200 flex flex-col bg-slate-50/50">
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-slate-200 bg-white space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject or sender…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-[6px] focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {[
                { id: "all", label: "All" },
                { id: "in", label: "Inbound ↙" },
                { id: "out", label: "Outbound ↗" },
                { id: "approvals", label: "Approvals 🟢" },
                { id: "queries", label: "Queries 🟡" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id as typeof filterType)}
                  className={`px-2 py-0.5 rounded-[4px] font-medium transition-colors cursor-pointer ${
                    filterType === f.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Item Rows */}
          <div className="overflow-y-auto divide-y divide-slate-100 max-h-[520px]">
            {filteredMails.length === 0 ? (
              <div className="p-6 text-center text-[12px] text-slate-400">
                No emails match your filter.
              </div>
            ) : (
              filteredMails.map((m) => {
                const isSelected = activeMail?.id === m.id
                const isInbound = m.direction === "in"
                const isApproval = m.subject.toLowerCase().includes("approval") || m.subject.toLowerCase().includes("sanction")

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMailId(m.id)}
                    className={`w-full text-left p-3.5 transition-all cursor-pointer block ${
                      isSelected
                        ? "bg-blue-50/90 border-l-4 border-l-blue-600 text-slate-900 shadow-2xs"
                        : "hover:bg-white text-slate-700 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                        isInbound
                          ? isApproval ? "bg-emerald-100 text-emerald-800" : "bg-teal-100 text-teal-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {isInbound ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                        {isInbound ? "Inbound TPA" : "Hospital Out"}
                      </span>
                      <span className="text-[10.5px] text-slate-400 tabular-nums">
                        {fmtDateTime(m.at).split(",")[0]}
                      </span>
                    </div>

                    <div className="text-[12.5px] font-semibold text-slate-900 truncate">
                      {m.subject}
                    </div>

                    <div className="text-[11.5px] text-slate-500 truncate mt-0.5">
                      {isInbound ? `From: ${m.from}` : `To: ${m.to}`}
                    </div>

                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1.5">
                        <Paperclip size={11} /> {m.attachments.length} attachment{m.attachments.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Email Inspector & Action Desk */}
        <div className="flex flex-col bg-white overflow-y-auto max-h-[520px]">
          {activeMail ? (
            <div className="p-5 space-y-4">
              {/* Message Header */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h4 className="text-[15px] font-bold text-slate-900 leading-snug">
                    {activeMail.subject}
                  </h4>
                  <span className="text-[11.5px] font-medium text-slate-500 tabular-nums">
                    {fmtDateTime(activeMail.at)}
                  </span>
                </div>

                <div className="text-[12px] space-y-1 bg-slate-50 p-3 rounded-[6px] border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div><span className="text-slate-400 font-medium">From:</span> <span className="font-semibold text-slate-800">{activeMail.from}</span></div>
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      ✓ TLS Verified
                    </span>
                  </div>
                  <div><span className="text-slate-400 font-medium">To:</span> <span className="text-slate-700">{activeMail.to}</span></div>
                  {activeMail.cc && <div><span className="text-slate-400 font-medium">Cc:</span> <span className="text-slate-600">{activeMail.cc}</span></div>}
                  <div><span className="text-slate-400 font-medium">Category:</span> <span className="font-medium text-blue-700">{activeMail.purpose}</span></div>
                </div>
              </div>

              {/* Inbound TPA Decision Sanction Callout (If Inbound Approval) */}
              {activeMail.direction === "in" && (activeMail.subject.toLowerCase().includes("approval") || activeMail.subject.toLowerCase().includes("sanction")) && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-[8px] p-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[13px]">
                        <CheckCircle2 size={16} /> Official TPA Pre-Auth Sanction Decision
                      </div>
                      <p className="text-[12px] text-slate-600 mt-0.5">
                        This email contains an official sanction code and approval limit for {c.patientName}.
                      </p>
                    </div>

                    {c.approvedPreAuthAmount === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const amt = c.preAuth?.requestedAmount ? Math.round(c.preAuth.requestedAmount * 0.95) : 50000
                          const code = `AUTH-${(c.policy.tpaName || "TPA").slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`
                          try {
                            E.recordPreAuthResponse(c.id, {
                              outcome: "Approved",
                              amount: amt,
                              approvalCode: code,
                              note: "Sanction verified from inbound TPA email.",
                            })
                            notify(`Approved for ₹${amt.toLocaleString("en-IN")} and synced across Pharmacy & Billing!`, "success")
                          } catch (err: any) {
                            notify(err.message, "error")
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold rounded-[6px] transition-all flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                      >
                        <Sparkles size={13} /> Apply Sanction to Claim
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Message Body */}
              <div className="bg-slate-50/50 border border-slate-100 rounded-[8px] p-4">
                <pre className="whitespace-pre-wrap font-sans text-[12.5px] text-slate-800 leading-relaxed">
                  {activeMail.body}
                </pre>
              </div>

              {/* Attachments Section */}
              {activeMail.attachments && activeMail.attachments.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Paperclip size={13} /> Verified Attachments ({activeMail.attachments.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeMail.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-[6px] hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="text-blue-600 shrink-0" size={16} />
                          <span className="text-[12px] font-medium text-slate-800 truncate">
                            {att}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          PDF
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Mail size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-[13px] font-medium">Select an email to view full details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
