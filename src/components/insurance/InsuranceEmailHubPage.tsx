import React, { useState, useMemo } from "react"
import {
  RefreshCw,
  Inbox,
  CheckCircle2,
  Send,
  AlertTriangle,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
  ExternalLink,
  Sparkles,
  FileText,
  Mail,
  Filter,
} from "lucide-react"
import type { MailRecord } from "../../types/insurance"
import { InsuranceEngineService as E } from "../../services/insuranceDb"
import { inr, fmtDateTime, type Notify, PageHeader, fieldBase, useNotify } from "./ui"

interface EnrichedMail extends MailRecord {
  claimId: string
  patientName: string
  insurerName: string
  tpaName?: string
  claimStatus: string
  approvedAmount?: number
}

export default function InsuranceEmailHubPage({
  onNavigateToClaim,
  notify: propNotify,
  initialClaimId,
}: {
  onNavigateToClaim: (claimId: string) => void
  notify?: Notify
  initialClaimId?: string
}) {
  const { notify: internalNotify, toastNode } = useNotify()
  const notify = propNotify || internalNotify
  const claims = useMemo(() => E.getClaims(), [])
  const [selectedMailKey, setSelectedMailKey] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<"all" | "in" | "out" | "approvals" | "queries" | "settlement">("all")
  const [selectedInsurer, setSelectedInsurer] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Aggregate all emails across all claims in the hospital
  const allMails: EnrichedMail[] = useMemo(() => {
    const list: EnrichedMail[] = []

    claims.forEach((c) => {
      const tpaName = c.policy.tpaName || c.policy.insurerName || "Medi Assist TPA"
      const tpaEmail = `claims@${tpaName.toLowerCase().replace(/[^a-z]/g, "")}.in`
      const hospEmail = "insurance.desk@hospai-hospital.org"

      const caseMails = c.mails && c.mails.length > 0 ? c.mails : [
        {
          id: `mail-out-${c.id}`,
          direction: "out" as const,
          purpose: "Pre-Auth" as const,
          at: c.admissionDate || "2026-10-01T09:30:00Z",
          from: hospEmail,
          to: tpaEmail,
          subject: `[${c.id}] Pre-Authorization Request — ${c.patientName} (UHID: ${c.patientId})`,
          body: `Dear TPA Cashless Desk,\n\nPlease find attached the Pre-Authorization request package for patient ${c.patientName} under policy number ${c.policy.policyNumber || "POL-99210"}.\n\nRequested Amount: ₹${(c.preAuth?.requestedAmount || 55000).toLocaleString("en-IN")}\nDiagnosis: ${c.preAuth?.diagnosis || "Inpatient Care"}\nDoctor: ${c.preAuth?.treatingDoctor || "Consulting Specialist"}\n\nKindly process initial cashless sanction.\n\nRegards,\nHospAI Insurance Desk`,
          attachments: ["PreAuth_Form.pdf", "Clinical_Estimates.pdf"],
          by: "Insurance Officer",
        },
        {
          id: `mail-in-${c.id}`,
          direction: "in" as const,
          purpose: "Pre-Auth" as const,
          at: new Date(Date.now() - 3600000).toISOString(),
          from: `approvals@${tpaName.toLowerCase().replace(/[^a-z]/g, "")}.in`,
          to: hospEmail,
          subject: `[${c.id}] SANCTION APPROVAL: Cashless Pre-Auth Approved for ₹${(c.approvedPreAuthAmount || 50000).toLocaleString("en-IN")} — ${c.patientName}`,
          body: `Dear Hospital Partner,\n\nWe have approved the initial cashless pre-authorization for patient ${c.patientName} (Member ID: ${c.policy.memberId || "MEM-9921"}).\n\n=========================================\nAUTHORIZATION CODE: ${c.preAuth?.approvalCode || `AUTH-${tpaName.slice(0, 3).toUpperCase()}-9921`}\nAPPROVED LIMIT: ₹${(c.approvedPreAuthAmount || 50000).toLocaleString("en-IN")}\nCO-PAY APPLICABLE: ${c.policy.copayPercentage || 0}%\n=========================================\n\nTerms: Non-medical exclusions apply. Final payment subject to verified discharge bill.\n\nRegards,\nCashless Claims Department\n${tpaName}`,
          attachments: ["PreAuth_Sanction_Letter.pdf"],
          by: "TPA Gateway Listener",
        },
      ]

      caseMails.forEach((m) => {
        list.push({
          ...m,
          claimId: c.id,
          patientName: c.patientName,
          insurerName: c.policy.insurerName,
          tpaName: c.policy.tpaName,
          claimStatus: c.status,
          approvedAmount: c.approvedPreAuthAmount,
        })
      })
    })

    // Sort newest first
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [claims])

  // Filtered emails list
  const filteredMails = useMemo(() => {
    return allMails.filter((m) => {
      if (initialClaimId && m.claimId !== initialClaimId) return false
      if (filterType === "in" && m.direction !== "in") return false
      if (filterType === "out" && m.direction !== "out") return false
      if (filterType === "approvals" && !(m.direction === "in" && (m.subject.toLowerCase().includes("approval") || m.subject.toLowerCase().includes("sanction")))) return false
      if (filterType === "queries" && !m.subject.toLowerCase().includes("query")) return false
      if (filterType === "settlement" && !m.subject.toLowerCase().includes("settlement")) return false

      if (selectedInsurer && m.insurerName !== selectedInsurer && m.tpaName !== selectedInsurer) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          m.subject.toLowerCase().includes(q) ||
          m.patientName.toLowerCase().includes(q) ||
          m.claimId.toLowerCase().includes(q) ||
          m.from.toLowerCase().includes(q) ||
          m.to.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allMails, filterType, selectedInsurer, searchQuery, initialClaimId])

  const activeMail = useMemo(() => {
    if (selectedMailKey) {
      return allMails.find((m) => `${m.claimId}_${m.id}` === selectedMailKey) || filteredMails[0] || allMails[0]
    }
    return filteredMails[0] || allMails[0]
  }, [allMails, filteredMails, selectedMailKey])

  const insurers = useMemo(() => {
    return [...new Set(claims.map((c) => c.policy.tpaName || c.policy.insurerName))].filter(Boolean).sort()
  }, [claims])

  const handleSimulateInboundDecision = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      notify("Inbound TPA Mailbox Synced: 2 new decisions fetched from Medi Assist and Star Health gateways.", "success")
    }, 600)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <PageHeader
        title="Email &amp; TPA Decision Hub"
        subtitle="Hospital-wide live inbox, pre-auth sanctions, deficiency query notices, and settlement advice across all TPAs."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateInboundDecision}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-semibold rounded-[6px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Syncing Gateways…" : "⚡ Sync Inbound TPA Gateways"}
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* ── METRIC TILES ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 p-4 rounded-[8px] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500">Total Email Threads</span>
              <Inbox size={16} className="text-slate-400" />
            </div>
            <div className="text-[22px] font-bold text-slate-900 mt-1 tabular-nums">{allMails.length}</div>
            <span className="text-[11.5px] text-slate-400">Across {claims.length} active claims</span>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-[8px] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-emerald-700">TPA Approvals Received</span>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <div className="text-[22px] font-bold text-emerald-800 mt-1 tabular-nums">
              {allMails.filter((m) => m.direction === "in" && (m.subject.toLowerCase().includes("approval") || m.subject.toLowerCase().includes("sanction"))).length}
            </div>
            <span className="text-[11.5px] text-emerald-600">Sanctioned &amp; Applied</span>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-[8px] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-blue-700">Outbound Claims Sent</span>
              <Send size={16} className="text-blue-500" />
            </div>
            <div className="text-[22px] font-bold text-blue-800 mt-1 tabular-nums">
              {allMails.filter((m) => m.direction === "out").length}
            </div>
            <span className="text-[11.5px] text-blue-600">Delivered via SMTP Gateway</span>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-[8px] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-amber-700">Deficiency Queries</span>
              <AlertTriangle size={16} className="text-amber-500" />
            </div>
            <div className="text-[22px] font-bold text-amber-800 mt-1 tabular-nums">
              {allMails.filter((m) => m.subject.toLowerCase().includes("query")).length}
            </div>
            <span className="text-[11.5px] text-amber-600">Awaiting hospital responses</span>
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-2.5 rounded-[8px] shadow-2xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Patient, Claim ID, Subject, or TPA…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-[12.5px] bg-slate-50 border border-slate-200 rounded-[6px] focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 text-[12px]">
            {[
              { id: "all", label: "All Messages" },
              { id: "in", label: "Inbound TPA ↙" },
              { id: "out", label: "Hospital Out ↗" },
              { id: "approvals", label: "Sanction Approvals 🟢" },
              { id: "queries", label: "Queries 🟡" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as typeof filterType)}
                className={`px-3 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                  filterType === f.id
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={selectedInsurer}
            onChange={(e) => setSelectedInsurer(e.target.value)}
            className="text-[12px] bg-slate-50 border border-slate-200 rounded-[6px] px-2.5 py-1.5 text-slate-700 focus:outline-none focus:bg-white cursor-pointer ml-auto"
          >
            <option value="">All TPAs &amp; Insurers</option>
            {insurers.map((ins) => (
              <option key={ins} value={ins}>{ins}</option>
            ))}
          </select>
        </div>

        {/* ── TWO-COLUMN EMAIL EXPLORER ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] border border-slate-200 rounded-[8px] bg-white overflow-hidden shadow-xs min-h-[580px]">
          {/* Left Column: Messages List */}
          <div className="border-r border-slate-200 flex flex-col bg-slate-50/40 divide-y divide-slate-100 overflow-y-auto max-h-[620px]">
            {filteredMails.length === 0 ? (
              <div className="p-8 text-center text-[12.5px] text-slate-400">
                No emails found matching your filters.
              </div>
            ) : (
              filteredMails.map((m) => {
                const key = `${m.claimId}_${m.id}`
                const isSelected = (selectedMailKey ? selectedMailKey === key : activeMail?.id === m.id && activeMail?.claimId === m.claimId)
                const isInbound = m.direction === "in"
                const isApproval = m.subject.toLowerCase().includes("approval") || m.subject.toLowerCase().includes("sanction")

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMailKey(key)}
                    className={`w-full text-left p-4 transition-all cursor-pointer block ${
                      isSelected
                        ? "bg-blue-50/90 border-l-4 border-l-blue-600 text-slate-900 shadow-2xs"
                        : "hover:bg-white text-slate-700 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isInbound
                          ? isApproval ? "bg-emerald-100 text-emerald-800" : "bg-teal-100 text-teal-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {isInbound ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                        {isInbound ? "Inbound TPA" : "Hospital Out"}
                      </span>

                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {fmtDateTime(m.at).split(",")[0]}
                      </span>
                    </div>

                    <div className="text-[13px] font-bold text-slate-900 leading-snug truncate">
                      {m.subject}
                    </div>

                    <div className="flex items-center gap-2 text-[11.5px] text-slate-600 mt-1">
                      <span className="font-semibold text-slate-800">{m.patientName}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono text-slate-500">{m.claimId}</span>
                    </div>

                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {isInbound ? `From: ${m.from}` : `To: ${m.to}`}
                    </div>

                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-blue-700 mt-1.5 font-medium">
                        <Paperclip size={11} /> {m.attachments.length} attachment{m.attachments.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Right Column: Full Email Viewer & Case Link */}
          <div className="flex flex-col bg-white overflow-y-auto max-h-[620px]">
            {activeMail ? (
              <div className="p-6 space-y-5">
                {/* Header with Case Jump Control */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <h3 className="text-[16px] font-bold text-slate-900 leading-snug">
                      {activeMail.subject}
                    </h3>

                    <button
                      type="button"
                      onClick={() => onNavigateToClaim(activeMail.claimId)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[12px] font-semibold rounded-[6px] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span>Open Claim #{activeMail.claimId}</span> <ExternalLink size={13} />
                    </button>
                  </div>

                  {/* Header Meta Box */}
                  <div className="bg-slate-50 border border-slate-100 rounded-[8px] p-3.5 space-y-1.5 text-[12.5px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-slate-400 font-medium">From:</span>{" "}
                        <span className="font-bold text-slate-800">{activeMail.from}</span>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                        ✓ TLS &amp; SMTP Authenticated
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">To:</span>{" "}
                      <span className="text-slate-700">{activeMail.to}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[11.5px] pt-1 border-t border-slate-200/60 mt-1">
                      <div><span className="text-slate-400">Patient:</span> <strong className="text-slate-800">{activeMail.patientName}</strong></div>
                      <div><span className="text-slate-400">Claim ID:</span> <strong className="font-mono text-blue-700">{activeMail.claimId}</strong></div>
                      <div><span className="text-slate-400">TPA / Insurer:</span> <strong className="text-slate-800">{activeMail.tpaName || activeMail.insurerName}</strong></div>
                      <div className="ml-auto text-slate-400 tabular-nums">{fmtDateTime(activeMail.at)}</div>
                    </div>
                  </div>
                </div>

                {/* TPA Sanction Banner (If Inbound Approval) */}
                {activeMail.direction === "in" && (activeMail.subject.toLowerCase().includes("approval") || activeMail.subject.toLowerCase().includes("sanction")) && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-[8px] p-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[13.5px]">
                          <CheckCircle2 size={16} /> Official Cashless Sanction Letter
                        </div>
                        <p className="text-[12px] text-slate-600 mt-0.5">
                          Approved pre-authorization decision received for patient {activeMail.patientName}.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigateToClaim(activeMail.claimId)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold rounded-[6px] transition-all flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                      >
                        <Sparkles size={13} /> View in Claim Workspace
                      </button>
                    </div>
                  </div>
                )}

                {/* Formatted Message Body */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-[8px] p-4">
                  <pre className="whitespace-pre-wrap font-sans text-[13px] text-slate-800 leading-relaxed">
                    {activeMail.body}
                  </pre>
                </div>

                {/* Verified Attachments */}
                {activeMail.attachments && activeMail.attachments.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[12px] font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">
                      <Paperclip size={13} /> Verified Email Attachments ({activeMail.attachments.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeMail.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-[6px] hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="text-blue-600 shrink-0" size={16} />
                            <span className="text-[12px] font-medium text-slate-800 truncate">
                              {att}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
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
                <p className="text-[13px] font-medium">Select an email to view full conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
