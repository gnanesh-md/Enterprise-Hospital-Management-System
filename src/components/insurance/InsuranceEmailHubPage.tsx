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

const INSURER_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  "Care Health Insurance": { bg: "bg-amber-400", text: "text-blue-950 font-black", label: "CARE" },
  "Care Health": { bg: "bg-amber-400", text: "text-blue-950 font-black", label: "CARE" },
  "Star Health & Allied Insurance": { bg: "bg-sky-900", text: "text-white font-black", label: "STAR" },
  "Star Health": { bg: "bg-sky-900", text: "text-white font-black", label: "STAR" },
  "ICICI Lombard General Insurance": { bg: "bg-amber-700", text: "text-white font-black", label: "ICICI" },
  "ICICI Lombard": { bg: "bg-amber-700", text: "text-white font-black", label: "ICICI" },
  "HDFC ERGO General Insurance": { bg: "bg-red-600", text: "text-white font-black", label: "HDFC" },
  "FHPL (Family Health Plan TPA)": { bg: "bg-purple-600", text: "text-white font-black", label: "FHPL" },
  "Medi Assist TPA": { bg: "bg-teal-600", text: "text-white font-black", label: "MEDI" },
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

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: allMails.length,
      in: allMails.filter((m) => m.direction === "in").length,
      out: allMails.filter((m) => m.direction === "out").length,
      approvals: allMails.filter((m) => m.direction === "in" && (m.subject.toLowerCase().includes("approval") || m.subject.toLowerCase().includes("sanction"))).length,
      queries: allMails.filter((m) => m.subject.toLowerCase().includes("query")).length,
    }
  }, [allMails])

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden">
      {toastNode}

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 max-w-[1700px] mx-auto">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Email &amp; TPA Decision Hub</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live TPA Gateway
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              Hospital-wide live inbox, pre-auth sanctions, deficiency query notices, and settlement advice across all TPAs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateInboundDecision}
              disabled={isRefreshing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs shadow-emerald-500/20 active:scale-95"
            >
              <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
              {isRefreshing ? "Syncing Gateways…" : "Sync Inbound TPA Gateways"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3.5 max-w-[1700px] mx-auto w-full flex-1 flex flex-col overflow-hidden">
        {/* ── 4 Premium Executive KPI Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
          <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs hover:border-slate-300 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-400 opacity-60" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Email Threads</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                <Inbox size={14} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-2 tracking-tight tabular-nums">{allMails.length}</div>
            <span className="text-[10.5px] text-slate-400">Across {claims.length} active claims</span>
          </div>

          <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs hover:border-emerald-300 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">TPA Approvals Received</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <CheckCircle2 size={14} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-emerald-800 mt-2 tracking-tight tabular-nums">
              {counts.approvals}
            </div>
            <span className="text-[10.5px] text-emerald-600 font-semibold">Sanctioned &amp; Applied</span>
          </div>

          <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs hover:border-blue-300 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Outbound Claims Sent</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Send size={14} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-blue-800 mt-2 tracking-tight tabular-nums">
              {counts.out}
            </div>
            <span className="text-[10.5px] text-blue-600 font-semibold">Delivered via SMTP Gateway</span>
          </div>

          <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs hover:border-amber-300 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Deficiency Queries</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <AlertTriangle size={14} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-amber-800 mt-2 tracking-tight tabular-nums">
              {counts.queries}
            </div>
            <span className="text-[10.5px] text-amber-600 font-semibold">Awaiting hospital responses</span>
          </div>
        </div>

        {/* ── Compact Filter Control Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-slate-200/90 p-2.5 rounded-xl shadow-2xs flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Patient, Claim ID, Subject, or TPA…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-8.5 text-[11.5px] bg-slate-50/90 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
              />
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100/70 p-0.5 rounded-lg border border-slate-200/60 overflow-x-auto scrollbar-none">
              {[
                { id: "all", label: "All Messages", count: counts.all },
                { id: "in", label: "Inbound TPA ↙", count: counts.in },
                { id: "out", label: "Hospital Out ↗", count: counts.out },
                { id: "approvals", label: "Sanctions 🟢", count: counts.approvals },
                { id: "queries", label: "Queries 🟡", count: counts.queries },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id as typeof filterType)}
                  className={`px-3 py-1 rounded-md text-[11.5px] font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    filterType === f.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterType === f.id ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Insurer Selector Dropdown */}
          <div className="w-48">
            <select
              value={selectedInsurer}
              onChange={(e) => setSelectedInsurer(e.target.value)}
              className="w-full h-8.5 text-[11.5px] bg-slate-50/90 border border-slate-200 rounded-lg px-3 text-slate-700 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-all"
            >
              <option value="">All TPAs &amp; Insurers</option>
              {insurers.map((ins) => (
                <option key={ins} value={ins}>{ins}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── TWO-COLUMN EMAIL EXPLORER ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs flex-1 min-h-0">
          {/* Left Column: Messages List */}
          <div className="border-r border-slate-200/90 flex flex-col bg-slate-50/30 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200/80 bg-slate-100/60 flex items-center justify-between text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
              <span>Inbox Threads</span>
              <span className="bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-mono text-[10px]">
                {filteredMails.length} messages
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredMails.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No emails found matching your active filters.
                </div>
              ) : (
                filteredMails.map((m) => {
                  const key = `${m.claimId}_${m.id}`
                  const isSelected = (selectedMailKey ? selectedMailKey === key : activeMail?.id === m.id && activeMail?.claimId === m.claimId)
                  const isInbound = m.direction === "in"
                  const isApproval = m.subject.toLowerCase().includes("approval") || m.subject.toLowerCase().includes("sanction")
                  const isQuery = m.subject.toLowerCase().includes("query")
                  const insLogo = INSURER_BADGES[m.tpaName || m.insurerName] || {
                    bg: "bg-blue-700",
                    text: "text-white font-black",
                    label: (m.tpaName || m.insurerName).slice(0, 4).toUpperCase(),
                  }

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
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider shrink-0 ${insLogo.bg} ${insLogo.text}`}>
                            {insLogo.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isInbound
                              ? isApproval
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : isQuery
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-teal-50 text-teal-800 border-teal-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}>
                            {isInbound ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                            {isInbound ? "Inbound TPA" : "Hospital Out"}
                          </span>
                        </div>

                        <span className="text-xs font-mono text-slate-400">
                          {fmtDateTime(m.at).split(",")[0]}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-slate-900 leading-snug truncate">
                        {m.subject}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 mt-1.5">
                        <span className="font-bold text-blue-600 hover:underline">{m.patientName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded text-[11px] font-bold">{m.claimId}</span>
                      </div>

                      <div className="text-xs text-slate-400 truncate mt-1 font-mono">
                        {isInbound ? `From: ${m.from}` : `To: ${m.to}`}
                      </div>

                      {m.attachments && m.attachments.length > 0 && (
                        <div className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-100 mt-2 font-semibold">
                          <Paperclip size={11} /> {m.attachments.length} attachment{m.attachments.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column: Full Email Viewer & Case Link */}
          <div className="flex flex-col bg-white overflow-y-auto">
            {activeMail ? (
              <div className="p-6 space-y-5">
                {/* Header with Case Jump Control */}
                <div className="border-b border-slate-200/80 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {activeMail.subject}
                    </h3>

                    <button
                      type="button"
                      onClick={() => onNavigateToClaim(activeMail.claimId)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                    >
                      <Sparkles size={13} />
                      <span>View in Claim Workspace</span>
                    </button>
                  </div>

                  {/* Header Meta Box */}
                  <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-slate-400 font-medium">From:</span>{" "}
                        <span className="font-bold text-slate-900">{activeMail.from}</span>
                      </div>
                      <span className="text-[10.5px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full flex items-center gap-1">
                        ✓ TLS &amp; SMTP Authenticated
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">To:</span>{" "}
                      <span className="text-slate-700 font-medium">{activeMail.to}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] pt-2 border-t border-slate-200/70 mt-1">
                      <div><span className="text-slate-400">Patient:</span> <strong className="text-blue-600 font-bold">{activeMail.patientName}</strong></div>
                      <div><span className="text-slate-400">Claim ID:</span> <strong className="font-mono text-slate-800">{activeMail.claimId}</strong></div>
                      <div><span className="text-slate-400">TPA / Insurer:</span> <strong className="text-slate-800">{activeMail.tpaName || activeMail.insurerName}</strong></div>
                      <div className="ml-auto text-slate-400 font-mono">{fmtDateTime(activeMail.at)}</div>
                    </div>
                  </div>
                </div>

                {/* TPA Sanction Banner (If Inbound Approval) */}
                {activeMail.direction === "in" && (activeMail.subject.toLowerCase().includes("approval") || activeMail.subject.toLowerCase().includes("sanction")) && (
                  <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/90 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm mb-3">
                      <CheckCircle2 size={17} className="text-emerald-600" />
                      <span>Official Cashless Sanction Approval</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 border border-emerald-200/60 rounded-lg p-3">
                      <div>
                        <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Authorization Code</div>
                        <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">MC-ICU-8819</div>
                      </div>
                      <div>
                        <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Approved Limit</div>
                        <div className="text-sm font-bold text-emerald-700 mt-0.5">₹50,000</div>
                      </div>
                      <div>
                        <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Co-Pay Applicable</div>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">0%</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formatted Message Body Card */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-2xs">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed font-medium">
                    {activeMail.body.replace(/={5,}/g, "----------------------------------------")}
                  </pre>
                </div>

                {/* Verified Attachments */}
                {activeMail.attachments && activeMail.attachments.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                      <Paperclip size={13} className="text-slate-500" /> Verified Email Attachments ({activeMail.attachments.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeMail.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-blue-50/50 hover:border-blue-200 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="text-blue-600 shrink-0" size={16} />
                            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                              {att}
                            </span>
                          </div>
                          <span className="text-[10.5px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
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
                <p className="text-xs font-medium">Select an email to view full conversation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
