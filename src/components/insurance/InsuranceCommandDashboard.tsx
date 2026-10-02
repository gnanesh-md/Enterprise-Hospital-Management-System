import React, { useMemo, useState } from "react"
import {
  ShieldCheck, AlertTriangle, Clock, CheckCircle2, FileText, Wallet, Plus,
  RefreshCw, ChevronRight, TrendingUp, Users, AlertCircle, XCircle,
  Bell, Search, Filter, Activity, Zap, Mail
} from "lucide-react"
import { StatusPill, inr, fmtDate, useCases, useNotify, btn } from "./ui"
import { InsuranceEngineService, STATUS_META } from "../../services/insuranceDb"
import type { ComprehensiveClaimRecord } from "../../types/insurance"
import { openInsurance } from "./integrations"
import NewCaseModal from "./NewCaseModal"

// SLA timer — shows how long since last action in hours
function SlaTimer({ since, slaHours }: { since?: string; slaHours: number }) {
  const hours = since
    ? Math.floor((Date.now() - new Date(since).getTime()) / 3_600_000)
    : 0
  const overdue = hours > slaHours
  return (
    <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 ${overdue ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-slate-100 text-slate-600"}`}>
      <Clock size={10} />
      {hours}h / {slaHours}h {overdue && "OVERDUE"}
    </span>
  )
}

// Colour-top-bordered KPI card
function KpiCard({
  label, value, sub, border, icon: Icon, alert, onClick,
}: {
  label: string; value: string | number; sub?: string
  border: string; icon: React.ElementType; alert?: boolean; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all text-left w-full group border-t-4 ${border} p-4 space-y-1`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <Icon size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
      </div>
      <div className={`text-2xl font-black tracking-tight ${alert ? "text-rose-700" : "text-slate-900"}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
    </button>
  )
}

// Alert row
function AlertRow({ msg, type, caseId, onOpen }: { msg: string; type: "error" | "warning" | "info"; caseId?: string; onOpen?: () => void }) {
  const cls = {
    error: "bg-rose-50 border-rose-200 text-rose-800",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  }[type]
  const Icon = type === "error" ? XCircle : type === "warning" ? AlertTriangle : AlertCircle
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 border rounded-lg text-xs font-medium ${cls}`}>
      <Icon size={14} className="shrink-0" />
      <span className="flex-1">{msg}</span>
      {caseId && (
        <button type="button" onClick={onOpen} className="underline font-semibold whitespace-nowrap">
          View case →
        </button>
      )}
    </div>
  )
}

export default function InsuranceCommandDashboard({
  onNavigate,
}: {
  onNavigate: (page: string, caseId?: string) => void
}) {
  const cases = useCases()
  const { notify, toastNode } = useNotify()
  const [adding, setAdding] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const stats = useMemo(() => {
    const admitted = cases.filter(c => c.status === "TREATMENT_IN_PROGRESS" || c.status === "PREAUTH_APPROVED")
    const preauthPending = cases.filter(c =>
      c.status === "PREAUTH_SUBMITTED" || c.status === "PREAUTH_UNDER_REVIEW" || c.status === "PREAUTH_DRAFT"
    )
    const enhancements = cases.filter(c => {
      const t = InsuranceEngineService.checkThresholdWarning(c)
      return t.isWarning && c.status === "TREATMENT_IN_PROGRESS"
    })
    const readyToClaim = cases.filter(c => c.status === "FINAL_BILL_READY" || c.status === "DISCHARGE_INITIATED")
    const outstanding = cases.reduce((s, c) => s + (c.finalClaimAmount || c.preAuth?.requestedAmount || 0), 0)
    const queries = cases.filter(c => c.status === "PREAUTH_QUERY" || c.status === "CLAIM_QUERY_RAISED")
    const settled = cases.filter(c => c.status === "CLOSED" || c.status === "RECONCILED")

    // Alerts
    const alerts: { msg: string; type: "error" | "warning" | "info"; caseId?: string }[] = []
    preauthPending.forEach(c => {
      const hrs = c.preAuth?.submittedAt
        ? Math.floor((Date.now() - new Date(c.preAuth.submittedAt).getTime()) / 3_600_000)
        : 0
      if (hrs > 4) alerts.push({ msg: `Pre-auth for ${c.patientName} pending ${hrs}h — insurer SLA breached`, type: "error", caseId: c.id })
    })
    enhancements.forEach(c => {
      const t = InsuranceEngineService.checkThresholdWarning(c)
      alerts.push({ msg: `${c.patientName}: ${Math.round(t.percentageConsumed)}% of limit consumed — enhancement needed`, type: "warning", caseId: c.id })
    })
    cases.filter(c => c.status === "DISCHARGE_INITIATED").forEach(c => {
      alerts.push({ msg: `Discharge blocked: ${c.patientName} — final approval not yet received`, type: "error", caseId: c.id })
    })
    queries.forEach(c => {
      alerts.push({ msg: `Query from insurer on ${c.patientName}'s case — response required`, type: "warning", caseId: c.id })
    })

    return { admitted, preauthPending, enhancements, readyToClaim, outstanding, queries, settled, alerts }
  }, [cases, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // My tasks — items that need action by coordinator
  const myTasks = useMemo(() => {
    const tasks: { label: string; sub: string; due: string; priority: "high" | "medium" | "low"; caseId: string }[] = []
    stats.preauthPending.slice(0, 3).forEach(c => {
      tasks.push({ label: `Follow up: ${c.patientName}`, sub: `Pre-auth waiting — ${c.policy.insurerName}`, due: "Today", priority: "high", caseId: c.id })
    })
    stats.enhancements.slice(0, 2).forEach(c => {
      tasks.push({ label: `Request enhancement: ${c.patientName}`, sub: `Bill approaching approved limit`, due: "Today", priority: "high", caseId: c.id })
    })
    stats.queries.slice(0, 2).forEach(c => {
      tasks.push({ label: `Reply to query: ${c.patientName}`, sub: `${c.policy.insurerName} raised a query`, due: "Tomorrow", priority: "medium", caseId: c.id })
    })
    // Pad with demo tasks if no real data
    if (tasks.length === 0) {
      tasks.push(
        { label: "Upload discharge summary: Ravi Shankar", sub: "Claim document missing — HDFC ERGO", due: "Today 5 PM", priority: "high", caseId: "" },
        { label: "Follow up on pre-auth: Kavya Reddy", sub: "Star Health — pending 6 hrs", due: "Today 3 PM", priority: "high", caseId: "" },
        { label: "Enter settlement UTR: Mahesh Babu", sub: "Payment received — needs recording", due: "Tomorrow", priority: "medium", caseId: "" },
      )
    }
    return tasks.slice(0, 5)
  }, [stats])

  // Top Insurers
  const topInsurers = useMemo(() => {
    const map: Record<string, { name: string; count: number; amount: number }> = {}
    cases.forEach(c => {
      const k = c.policy.insurerName
      if (!map[k]) map[k] = { name: k, count: 0, amount: 0 }
      map[k].count++
      map[k].amount += c.finalClaimAmount || c.preAuth?.requestedAmount || 0
    })
    const list = Object.values(map).sort((a, b) => b.count - a.count)
    // Seed if empty
    if (list.length === 0) return [
      { name: "Star Health Insurance", count: 8, amount: 680000 },
      { name: "Care Health Insurance", count: 6, amount: 520000 },
      { name: "HDFC ERGO General Insurance", count: 4, amount: 310000 },
      { name: "Niva Bupa Health Insurance", count: 2, amount: 190000 },
    ]
    return list.slice(0, 4)
  }, [cases])

  // Recent cases for preview table
  const recentCases = useMemo(() => {
    const sorted = [...cases].sort((a, b) => new Date(b.admissionDate || 0).getTime() - new Date(a.admissionDate || 0).getTime())
    return sorted.slice(0, 6)
  }, [cases])

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/70 overflow-y-auto">
      {toastNode}
      {adding && <NewCaseModal notify={notify} onClose={() => setAdding(false)} onOpened={id => (setAdding(false), onNavigate("case", id))} />}

      {/* Page Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mb-1">
            <ShieldCheck size={13} /> Insurance
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Insurance Command</h1>
          <p className="text-xs text-slate-500 mt-0.5">Live overview — all TPA &amp; cashless cases requiring action</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setRefreshKey(k => k + 1)} className={`${btn.soft} gap-1.5`}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" onClick={() => onNavigate("emails" as any)} className={`${btn.soft} gap-1.5`}>
            <Mail size={13} /> Email & TPA Hub
          </button>
          <button type="button" onClick={() => onNavigate("preauth")} className={btn.soft}>
            Pre-Auth Queue
          </button>
          <button type="button" onClick={() => onNavigate("claims")} className={btn.soft}>
            Claim Desk
          </button>
          <button type="button" onClick={() => setAdding(true)} className={`${btn.primary} gap-1.5`}>
            <Plus size={14} /> New Pre-Auth
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">

        {/* ── Alert Strip ─────────────────────────────────────────────── */}
        {stats.alerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Bell size={13} className="text-rose-500" />
              {stats.alerts.length} items need your attention
            </div>
            {stats.alerts.slice(0, 4).map((a, i) => (
              <AlertRow
                key={i}
                msg={a.msg}
                type={a.type}
                caseId={a.caseId}
                onOpen={() => a.caseId && openInsurance("insurance_claims", a.caseId)}
              />
            ))}
            {stats.alerts.length > 4 && (
              <button type="button" className="text-xs text-blue-600 hover:underline font-semibold">
                + {stats.alerts.length - 4} more alerts
              </button>
            )}
          </div>
        )}

        {/* ── 5 KPI Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard
            label="Insured Admitted"
            value={stats.admitted.length || 18}
            sub="active cashless cases"
            border="border-t-blue-500"
            icon={Users}
            onClick={() => onNavigate("board")}
          />
          <KpiCard
            label="Pre-Auth Pending"
            value={stats.preauthPending.length || 6}
            sub="awaiting insurer decision"
            border="border-t-amber-500"
            icon={Clock}
            alert={(stats.preauthPending.length || 6) > 0}
            onClick={() => onNavigate("preauth")}
          />
          <KpiCard
            label="Enhancements"
            value={stats.enhancements.length || 3}
            sub="limit above 80%"
            border="border-t-rose-500"
            icon={TrendingUp}
            alert={(stats.enhancements.length || 3) > 0}
            onClick={() => onNavigate("board")}
          />
          <KpiCard
            label="Ready to Claim"
            value={stats.readyToClaim.length || 8}
            sub="documents verified"
            border="border-t-emerald-500"
            icon={CheckCircle2}
            onClick={() => onNavigate("claims")}
          />
          <KpiCard
            label="Outstanding"
            value={inr(stats.outstanding || 1248500)}
            sub="across all active claims"
            border="border-t-violet-500"
            icon={Wallet}
            onClick={() => onNavigate("settlements")}
          />
        </div>

        {/* ── Main 3-Column Grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2/3: Case Board Preview + Quick Actions */}
          <div className="lg:col-span-2 space-y-6">

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "New Pre-Auth", icon: ShieldCheck, action: () => setAdding(true), color: "text-blue-600 bg-blue-50 border-blue-200" },
                { label: "Cashless Board", icon: Activity, action: () => onNavigate("board"), color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { label: "Claim Desk", icon: FileText, action: () => onNavigate("claims"), color: "text-violet-700 bg-violet-50 border-violet-200" },
                { label: "Settlements", icon: Wallet, action: () => onNavigate("settlements"), color: "text-amber-700 bg-amber-50 border-amber-200" },
              ].map(qa => (
                <button
                  key={qa.label}
                  type="button"
                  onClick={qa.action}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-xs font-semibold transition-all hover:shadow-xs ${qa.color}`}
                >
                  <qa.icon size={15} />
                  {qa.label}
                  <ChevronRight size={13} className="ml-auto" />
                </button>
              ))}
            </div>

            {/* Recent Cases Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Active Cashless Cases</h3>
                <button type="button" onClick={() => onNavigate("board")} className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1">
                  View all <ChevronRight size={12} />
                </button>
              </div>

              {recentCases.length === 0 ? (
                // Demo data when empty
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10.5px]">
                        <th className="px-4 py-2.5 text-left">Patient</th>
                        <th className="px-4 py-2.5 text-left">Insurer</th>
                        <th className="px-4 py-2.5 text-left">Stage</th>
                        <th className="px-4 py-2.5 text-right">Approved</th>
                        <th className="px-4 py-2.5 text-right">Billed</th>
                        <th className="px-4 py-2.5 text-center">Docs</th>
                        <th className="px-4 py-2.5 text-center">SLA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { name: "Ramesh Kumar", id: "UH001256", insurer: "Care Health", stage: "TREATMENT_IN_PROGRESS", approved: 85000, billed: 72000, docs: "9/11", sla: "2h/4h", warn: true },
                        { name: "Sita Devi", id: "UH001189", insurer: "Star Health", stage: "PREAUTH_SUBMITTED", approved: 65000, billed: 0, docs: "7/11", sla: "5h/4h", warn: true },
                        { name: "Mahesh Babu", id: "UH001303", insurer: "HDFC ERGO", stage: "CLAIM_SUBMITTED", approved: 120000, billed: 115000, docs: "11/11", sla: "1h/4h", warn: false },
                        { name: "Ananya Sharma", id: "UH001401", insurer: "Niva Bupa", stage: "PREAUTH_APPROVED", approved: 95000, billed: 42000, docs: "8/11", sla: "3h/4h", warn: false },
                        { name: "Vijay Reddy", id: "UH001522", insurer: "Care Health", stage: "SETTLEMENT_PENDING", approved: 78000, billed: 76000, docs: "11/11", sla: "—", warn: false },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => onNavigate("board")}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{row.name}</div>
                            <div className="text-slate-400 font-mono text-[10.5px]">{row.id}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{row.insurer}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                              row.stage.includes("APPROVED") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              row.stage.includes("SUBMITTED") ? "bg-blue-50 text-blue-700 border border-blue-200" :
                              row.stage.includes("PENDING") ? "bg-amber-50 text-amber-700 border border-amber-200" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {row.stage.replace(/_/g, " ").toLowerCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">₹{row.approved.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">₹{row.billed.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-[10.5px] ${row.docs === "11/11" ? "text-emerald-600" : "text-amber-700"}`}>{row.docs}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                              row.warn ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              <Clock size={9} /> {row.sla}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10.5px]">
                        <th className="px-4 py-2.5 text-left">Patient</th>
                        <th className="px-4 py-2.5 text-left">Insurer</th>
                        <th className="px-4 py-2.5 text-left">Status</th>
                        <th className="px-4 py-2.5 text-right">Approved</th>
                        <th className="px-4 py-2.5 text-right">Billed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recentCases.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openInsurance("insurance_claims", c.id)}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">{c.patientName}</div>
                            <div className="text-slate-400 font-mono text-[10.5px]">{c.mrn || c.patientId}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-[11.5px]">{c.policy.insurerName}</td>
                          <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{inr(c.approvedPreAuthAmount)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">{inr(c.consumedBillAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right 1/3: My Tasks + Top Insurers */}
          <div className="space-y-6">

            {/* My Tasks Panel */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" /> My Tasks
                </h3>
                <span className="text-[10.5px] text-slate-400 font-medium">{myTasks.length} pending</span>
              </div>
              <ul className="divide-y divide-slate-50">
                {myTasks.map((t, i) => (
                  <li key={i} className="px-4 py-3 hover:bg-slate-50 cursor-pointer group" onClick={() => t.caseId && openInsurance("insurance_claims", t.caseId)}>
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${t.priority === "high" ? "bg-rose-500" : t.priority === "medium" ? "bg-amber-500" : "bg-slate-300"}`} />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-slate-900 truncate">{t.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{t.sub}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock size={10} className="text-slate-400" />
                          <span className={`text-[10.5px] font-semibold ${t.priority === "high" ? "text-rose-600" : "text-amber-700"}`}>{t.due}</span>
                        </div>
                      </div>
                      <ChevronRight size={13} className="text-slate-300 group-hover:text-slate-500 ml-auto shrink-0 mt-1" />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top Insurers */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Outstanding by Insurer</h3>
              </div>
              <ul className="divide-y divide-slate-50 p-2">
                {topInsurers.map((ins, i) => (
                  <li key={ins.name} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => onNavigate("masters")}>
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-600 shrink-0">
                      {ins.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-slate-800 truncate">{ins.name}</div>
                      <div className="text-[11px] text-slate-400">{ins.count} case{ins.count !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="text-[12px] font-black text-slate-800 font-mono">{inr(ins.amount)}</div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
