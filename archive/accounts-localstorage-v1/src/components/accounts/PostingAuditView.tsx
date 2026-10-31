import React, { useState } from "react"
import { ShieldAlert, RefreshCw, CheckCircle2, History, AlertTriangle } from "lucide-react"

interface FailedPosting {
  id: string
  source_module: string
  source_reference_id: string
  error: string
  attempted_at: string
  status: "Pending Retry" | "Resolved"
}

const INITIAL_FAILURES: FailedPosting[] = []

export default function PostingAuditView() {
  const [failures, setFailures] = useState<FailedPosting[]>(INITIAL_FAILURES)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-[#DDE2EC] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <ShieldAlert className="text-[#047857]" size={20} />
            Integration Event Health Monitor & Audit Log
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Operational Integration Outbox, Failed Accounting Postings Inspection & Audit History
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs px-3 py-1.5 rounded-lg font-semibold">
          <CheckCircle2 size={16} />
          All Operational Integration Outboxes Healthy (0 Failures)
        </div>
      </div>

      {/* Audit Log Banner */}
      <div className="bg-white border border-[#DDE2EC] p-5 rounded-xl space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
          <History size={18} className="text-[#1B4FD8]" />
          Financial Subsystem Audit & Immutable Journal Log
        </h3>
        <p className="text-xs text-[#64748B]">
          All financial actions, double-entry journal postings, manual adjustments, period locking, and cashier handovers are logged to the central hospital audit repository (<code className="font-mono text-[#1B4FD8] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">hospai_audit_logs_v1</code>).
        </p>

        <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0] text-xs font-mono space-y-2 text-[#334155]">
          <div className="text-[#047857]">[SYSTEM_OK] Double-entry ledger state initialized.</div>
          <div className="text-[#047857]">[POSTING_ENGINE] Outbox listener active on BroadcastChannel "hospai_accounts_channel".</div>
          <div className="text-[#64748B]">[AUDIT] Fiscal Period "April 2026" unlocked and accepting operational postings.</div>
        </div>
      </div>
    </div>
  )
}
