import { useEffect, useMemo, useState } from "react"
import { InsuranceEngineService as E } from "../../services/insuranceDb"
import type { ComprehensiveClaimRecord } from "../../types/insurance"
import { PaymentForm, ReconcileForm, SettlementAdviceForm } from "./forms"
import { Drawer, Empty, Hint, KV, PageHeader, QueueButton, StatusPill, attempt, btn, daysUntil, fmtDate, inr, useCases, useNotify } from "./ui"

// Settlements: approved claims -> settlement advice -> payment -> matched to
// the bank -> closed. One list per step; the row opens its details and the
// single action it needs.

type Nav = (module: string, caseId?: string) => void
type Step = "advice" | "expected" | "reconcile" | "reconciled" | "closed"

const STEPS: { id: Step; label: string; match: (c: ComprehensiveClaimRecord) => boolean }[] = [
  { id: "advice", label: "Awaiting advice", match: (c) => c.status === "APPROVED" || c.status === "PARTIALLY_APPROVED" },
  { id: "expected", label: "Payment expected", match: (c) => c.status === "SETTLEMENT_PENDING" },
  { id: "reconcile", label: "To reconcile", match: (c) => c.status === "PAYMENT_RECEIVED" },
  { id: "reconciled", label: "Reconciled", match: (c) => c.status === "RECONCILED" },
  { id: "closed", label: "Closed", match: (c) => c.status === "CLOSED" && !!c.settlement },
]

export const expectedOf = (c: ComprehensiveClaimRecord) => c.settlement?.expectedAmount ?? c.approvedClaimAmount ?? 0

export default function SettlementPage({ onNavigate, initialCaseId }: { onNavigate: Nav; initialCaseId?: string }) {
  const cases = useCases()
  const { notify, toastNode } = useNotify()
  const [step, setStep] = useState<Step>("advice")
  const [open, setOpen] = useState<string | undefined>(initialCaseId)

  useEffect(() => {
    const c = initialCaseId && cases.find((x) => x.id === initialCaseId)
    const s = c && STEPS.find((x) => x.match(c))
    if (s) setStep(s.id)
    setOpen(initialCaseId)
  }, [initialCaseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = cases.filter(STEPS.find((s) => s.id === step)!.match)
  const current = open ? cases.find((c) => c.id === open) : undefined
  const totals = useMemo(() => {
    const due = cases.filter((c) => ["APPROVED", "PARTIALLY_APPROVED", "SETTLEMENT_PENDING"].includes(c.status))
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
    return {
      due: due.reduce((a, c) => a + Math.max(0, expectedOf(c) - (c.settlement?.receivedAmount ?? 0)), 0),
      overdue: cases.filter((c) => c.status === "SETTLEMENT_PENDING" && c.settlement?.expectedBy && daysUntil(c.settlement.expectedBy) < 0).length,
      month: cases.filter((c) => c.settlement?.paymentDate && new Date(c.settlement.paymentDate).getTime() >= monthStart).reduce((a, c) => a + (c.settlement?.receivedAmount ?? 0), 0),
      deducted: cases.reduce((a, c) => a + (c.settlement?.deductionsAmount ?? 0), 0),
    }
  }, [cases])

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {toastNode}
      {current && <SettlementDrawer c={current} notify={notify} onClose={() => setOpen(undefined)} onOpenClaim={() => onNavigate("insurance_claims", current.id)} />}
      <PageHeader title="Settlements" subtitle="Approved claims, the insurer's payment, and matching it with the bank." />
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <p className="text-[13px] text-slate-500">
          <span className="text-slate-900 font-medium tabular-nums">{inr(totals.due)}</span> due from insurers
          {totals.overdue ? <span className="text-rose-600"> ({totals.overdue} overdue)</span> : ""} · <span className="text-slate-900 font-medium tabular-nums">{inr(totals.month)}</span> received this month ·{" "}
          <span className="text-slate-900 font-medium tabular-nums">{inr(totals.deducted)}</span> deducted by insurers
        </p>

        <div className="flex flex-wrap items-center gap-1">
          {STEPS.map((s) => (
            <QueueButton key={s.id} active={step === s.id} label={s.label} count={cases.filter(s.match).length} onClick={() => setStep(s.id)} />
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-[8px] overflow-hidden">
          {rows.length === 0 ? (
            <Empty title="Nothing at this step" />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[12px] text-slate-500 border-b border-slate-200 bg-slate-50/60">
                  <th className="px-5 py-2.5 text-left font-medium">Patient</th>
                  <th className="px-3 py-2.5 text-left font-medium">Insurer</th>
                  <th className="px-3 py-2.5 text-right font-medium">Approved</th>
                  <th className="px-3 py-2.5 text-right font-medium">Received</th>
                  <th className="px-3 py-2.5 text-right font-medium">Difference</th>
                  <th className="px-3 py-2.5 text-left font-medium">Reference</th>
                  <th className="px-5 py-2.5 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const exp = expectedOf(c)
                  const rec = c.settlement?.receivedAmount ?? 0
                  const diff = rec ? rec - exp : 0
                  const late = c.status === "SETTLEMENT_PENDING" && c.settlement?.expectedBy && daysUntil(c.settlement.expectedBy) < 0
                  return (
                    <tr key={c.id} onClick={() => setOpen(c.id)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{c.patientName}</div>
                        <div className="text-[12px] text-slate-500">{c.id}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-700">{c.policy.insurerName}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{inr(exp)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{rec ? inr(rec) : "—"}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${diff < 0 ? "text-rose-600" : diff > 0 ? "text-amber-700" : "text-slate-400"}`}>{rec ? (diff ? inr(diff) : "0") : "—"}</td>
                      <td className="px-3 py-3 text-slate-600">{c.settlement?.paymentReferenceNo || c.settlement?.settlementAdviceNo || "—"}</td>
                      <td className={`px-5 py-3 text-right whitespace-nowrap ${late ? "text-rose-600" : "text-slate-500"}`}>
                        {c.settlement?.paymentDate ? fmtDate(c.settlement.paymentDate) : c.settlement?.expectedBy ? `due ${fmtDate(c.settlement.expectedBy)}` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function SettlementDrawer({ c, notify, onClose, onOpenClaim }: { c: ComprehensiveClaimRecord; notify: ReturnType<typeof useNotify>["notify"]; onClose: () => void; onOpenClaim: () => void }) {
  const s = c.settlement
  const exp = expectedOf(c)
  return (
    <Drawer title={c.patientName} subtitle={`${c.id} · ${c.policy.insurerName}`} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <StatusPill status={c.status} />
          <button type="button" className={btn.link} onClick={onOpenClaim}>
            Open claim
          </button>
        </div>
        <div>
          <KV k="Claimed" v={inr(c.finalClaimAmount)} mono />
          <KV k="Approved" v={inr(c.approvedClaimAmount)} mono />
          <KV k="Deductions" v={s?.deductionsAmount ? inr(s.deductionsAmount) : "—"} mono />
          <KV k="Expected payment" v={inr(exp)} mono />
          <KV k="Received" v={s?.receivedAmount ? inr(s.receivedAmount) : "—"} mono />
          <KV k="Settlement advice" v={s?.settlementAdviceNo || "—"} />
          <KV k="UTR / reference" v={s?.paymentReferenceNo || "—"} />
          <KV k="Payment date" v={s?.paymentDate ? fmtDate(s.paymentDate) : s?.expectedBy ? `expected ${fmtDate(s.expectedBy)}` : "—"} />
          <KV k="Reconciliation" v={s?.reconciliationStatus ?? "—"} />
        </div>
        {!!s?.deductionReasons.length && (
          <div>
            <div className="text-[12.5px] font-medium text-slate-700 mb-1">Deducted by the insurer</div>
            {s.deductionReasons.map((d) => (
              <div key={d.id} className="flex justify-between text-[13px] text-slate-600 py-0.5">
                <span>
                  {d.category}
                  {d.remark ? ` — ${d.remark}` : ""}
                </span>
                <span className="tabular-nums">{inr(d.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-slate-100 pt-5">
          {(c.status === "APPROVED" || c.status === "PARTIALLY_APPROVED") && (
            <>
              <h4 className="text-[13.5px] font-semibold text-slate-900 mb-3">Record the settlement advice</h4>
              <SettlementAdviceForm c={c} notify={notify} />
            </>
          )}
          {c.status === "SETTLEMENT_PENDING" && (
            <>
              <h4 className="text-[13.5px] font-semibold text-slate-900 mb-3">Record the payment</h4>
              <PaymentForm c={c} notify={notify} />
            </>
          )}
          {c.status === "PAYMENT_RECEIVED" && (
            <>
              <h4 className="text-[13.5px] font-semibold text-slate-900 mb-3">Match with the bank statement</h4>
              {s?.reconciliationStatus !== "Received" && (
                <div className="mb-3">
                  <Hint tone="amber">The payment is {s?.reconciliationStatus === "Short Payment" ? "less" : "more"} than the settlement advice — explain the difference.</Hint>
                </div>
              )}
              <ReconcileForm c={c} notify={notify} />
            </>
          )}
          {c.status === "RECONCILED" && (
            <button type="button" className={btn.primary} onClick={() => attempt(notify, () => E.closeClaim(c.id), "Claim closed.")}>
              Close claim
            </button>
          )}
          {c.status === "CLOSED" && <p className="text-[13px] text-slate-500">This claim is closed.</p>}
        </div>
      </div>
    </Drawer>
  )
}

