import React, { useMemo, useState } from "react";
import { Btn } from "../shared";
import { formatElapsed } from "../../hooks/useLiveClinic";
import { DoctorAccount } from "../../services/doctorPortalDb";
import { LabOrderDatabase } from "../../services/labOrdersDb";
import {
  acknowledgeAlert,
  acknowledgeAll,
  buildDoctorLiveBoard,
  callPatientIn,
  holdPatient,
  LiveAlert,
  LONG_WAIT_MINUTES,
  withdrawLabOrder,
} from "../../services/doctorLiveFeed";

/**
 * The doctor's real-time board: the clinic as it stands this second, and the
 * handful of things only the doctor can move forward.
 *
 * Everything shown is derived from stores other desks write to, so reception
 * taking payment, the pharmacist dispensing or the lab entering a result all
 * land here within a tick -- including from another browser tab.
 */

const SEVERITY_STYLES: Record<LiveAlert["severity"], { border: string; bg: string; text: string; dot: string; label: string }> = {
  critical: { border: "#FECACA", bg: "#FEF2F2", text: "#B91C1C", dot: "#DC2626", label: "Critical" },
  warning: { border: "#FDE68A", bg: "#FFFBEB", text: "#92400E", dot: "#D97706", label: "Attention" },
  info: { border: "#E2E8F0", bg: "#F8FAFC", text: "#475569", dot: "#64748B", label: "Update" },
};

const KIND_ICONS: Record<LiveAlert["kind"], string> = {
  "new-patient": "🔔",
  "vitals-ready": "🩹",
  "waiting-long": "⏳",
  "in-consultation": "🩺",
  "lab-awaiting-payment": "🧾",
  "lab-in-progress": "🧪",
  "lab-result": "📊",
  "lab-critical": "⚠",
  "rx-ready": "💊",
  "rx-dispensed": "✅",
  "rx-rejected": "⛔",
};

export default function LiveBoard({
  doctor,
  now,
  revision,
  onOpenPatient,
  onGoToSheet,
}: {
  doctor: DoctorAccount;
  now: number;
  revision: number;
  onOpenPatient: (encounterId: string) => void;
  onGoToSheet: (encounterId: string) => void;
}) {
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Derived data follows the data revision, not the clock; waiting minutes are
  // recomputed from `now` inside the board so the numbers still tick.
  const board = useMemo(() => buildDoctorLiveBoard(doctor, now), [doctor, revision, Math.floor(now / 30000)]);

  const visibleAlerts = showAcknowledged ? board.alerts : board.alerts.filter(alert => !alert.acknowledged);
  const needsAction = board.actionable;

  const handleCallIn = (encounterId: string) => {
    if (board.active && board.active.encounter.id !== encounterId) {
      setFeedback(
        `${board.active.encounter.patientName} is still in the room. Complete or hold that consultation first.`
      );
      return;
    }
    callPatientIn(encounterId);
    setFeedback(null);
    onGoToSheet(encounterId);
  };

  const handleWithdraw = (alert: LiveAlert) => {
    const order = alert.refId ? LabOrderDatabase.getOrder(alert.refId) : undefined;
    if (!order) return;
    const withdrawn = withdrawLabOrder(order, doctor, "Withdrawn by the ordering doctor from the live board");
    setFeedback(
      withdrawn
        ? `${order.id} withdrawn — reception will no longer bill for it.`
        : `${order.id} has already been paid for; reception has to handle the refund.`
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <LivePulse board={board} now={now} />

      {feedback && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-[12.5px] px-3.5 py-2.5 rounded flex items-start gap-2">
          <span className="flex-1">{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="font-bold">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* ── Live queue ───────────────────────────────────────────────── */}
        <section className="xl:col-span-2 bg-white border border-[#DDE2EC] rounded flex flex-col">
          <div className="px-4 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-gray-900">My live queue</h3>
            <span className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              live
            </span>
          </div>

          {board.active && (
            <div className="px-4 py-3 bg-[#EFF6FF] border-b border-[#BFDBFE]">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-[10.5px] uppercase tracking-wide text-[#1B4FD8] font-bold">In the room now</div>
                  <div className="text-[13px] font-bold text-gray-900 truncate">{board.active.encounter.patientName}</div>
                  <div className="text-[11px] font-mono text-[#64748B]">
                    {board.active.encounter.umr} · {board.active.encounter.opNumber}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10.5px] text-[#64748B]">Consulting</div>
                  <div className="text-[15px] font-bold font-mono text-[#1B4FD8]">
                    {formatElapsed(board.active.encounter.timestamps?.arrival, now)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Btn variant="primary" size="xs" onClick={() => onGoToSheet(board.active!.encounter.id)}>
                  Open consultation
                </Btn>
                <Btn
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    holdPatient(board.active!.encounter.id);
                    setFeedback(`${board.active!.encounter.patientName} put back in the queue.`);
                  }}
                >
                  Put on hold
                </Btn>
              </div>
            </div>
          )}

          <div className="flex-1 divide-y divide-[#F1F5F9] max-h-[420px] overflow-y-auto">
            {board.queue.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12px] text-[#94A3B8]">
                Nobody is waiting for you right now.
              </p>
            ) : (
              board.queue.map((entry, index) => {
                const overdue = entry.waitingMinutes >= LONG_WAIT_MINUTES;
                return (
                  <div key={entry.encounter.id} className="px-4 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-[#94A3B8]">#{index + 1}</span>
                          <span className="text-[12.5px] font-semibold text-gray-900 truncate">
                            {entry.encounter.patientName}
                          </span>
                          <span
                            className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              entry.isNewPatient ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#475569]"
                            }`}
                          >
                            {entry.isNewPatient ? "New" : "Revisit"}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">
                          {entry.encounter.chiefComplaint || "No chief complaint recorded"}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-[12.5px] font-mono font-bold ${overdue ? "text-[#B91C1C]" : "text-[#475569]"}`}>
                          {formatElapsed(entry.encounter.timestamps?.arrival || entry.encounter.registrationTime, now)}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">waiting</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 mt-1.5">
                      <Btn variant="primary" size="xs" onClick={() => handleCallIn(entry.encounter.id)}>
                        Call in
                      </Btn>
                      <Btn variant="ghost" size="xs" onClick={() => onOpenPatient(entry.encounter.id)}>
                        Review first
                      </Btn>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Alerts ───────────────────────────────────────────────────── */}
        <section className="xl:col-span-3 bg-white border border-[#DDE2EC] rounded flex flex-col">
          <div className="px-4 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-[13px] font-bold text-gray-900">
                Needs my attention
                {needsAction.length > 0 && (
                  <span className="ml-2 text-[10px] font-bold bg-[#FEE2E2] text-[#B91C1C] px-1.5 py-0.5 rounded">
                    {needsAction.length}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Live from reception, the laboratory and the pharmacy.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-[#64748B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAcknowledged}
                  onChange={() => setShowAcknowledged(value => !value)}
                  className="w-3.5 h-3.5 accent-[#1B4FD8]"
                />
                Show cleared
              </label>
              {needsAction.length > 0 && (
                <button
                  type="button"
                  onClick={() => acknowledgeAll(board.alerts)}
                  className="text-[11px] text-[#1B4FD8] font-semibold hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 divide-y divide-[#F1F5F9] max-h-[560px] overflow-y-auto">
            {visibleAlerts.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-2xl mb-2">✓</div>
                <p className="text-[12.5px] font-semibold text-[#334155]">Nothing needs you right now</p>
                <p className="text-[11.5px] text-[#94A3B8] mt-1">
                  New appointments, lab results, billing hold-ups and pharmacy movements appear here as they happen.
                </p>
              </div>
            ) : (
              visibleAlerts.map(alert => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  now={now}
                  onOpenPatient={onOpenPatient}
                  onCallIn={handleCallIn}
                  onWithdraw={handleWithdraw}
                  onAcknowledge={() => acknowledgeAlert(alert)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Pulse strip ──────────────────────────────────────────────────────────────

function LivePulse({ board, now }: { board: ReturnType<typeof buildDoctorLiveBoard>; now: number }) {
  const { pulse } = board;
  const tiles: { label: string; value: string; tone?: string; hint?: string }[] = [
    { label: "Waiting", value: String(pulse.waiting), tone: pulse.waiting > 4 ? "text-[#B91C1C]" : undefined },
    {
      label: "Longest wait",
      value: pulse.longestWaitMinutes ? `${pulse.longestWaitMinutes}m` : "--",
      tone: pulse.longestWaitMinutes >= LONG_WAIT_MINUTES ? "text-[#B91C1C]" : undefined,
      hint: pulse.averageWaitMinutes ? `avg ${pulse.averageWaitMinutes}m` : undefined,
    },
    { label: "Seen today", value: String(pulse.completedToday) },
    {
      label: "Results ready",
      value: String(pulse.resultsReady),
      tone: pulse.resultsReady > 0 ? "text-[#15803D]" : undefined,
    },
    {
      label: "Lab in progress",
      value: String(pulse.labInProgress),
      hint: pulse.labAwaitingPayment ? `${pulse.labAwaitingPayment} unpaid` : undefined,
    },
    {
      label: "At pharmacy",
      value: String(pulse.rxAwaitingPharmacy),
      hint: pulse.rxDispensed ? `${pulse.rxDispensed} dispensed` : undefined,
    },
  ];

  return (
    <div className="bg-white border border-[#DDE2EC] rounded px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[13px] font-bold text-gray-900">Clinic right now</h3>
        <span className="text-[11px] font-mono text-[#64748B]">
          {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {tiles.map(tile => (
          <div key={tile.label} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-[#94A3B8] font-bold">{tile.label}</div>
            <div className={`text-[17px] font-bold font-mono ${tile.tone || "text-gray-900"}`}>{tile.value}</div>
            {tile.hint && <div className="text-[10px] text-[#94A3B8]">{tile.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── One alert ────────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  now,
  onOpenPatient,
  onCallIn,
  onWithdraw,
  onAcknowledge,
}: {
  alert: LiveAlert;
  now: number;
  onOpenPatient: (encounterId: string) => void;
  onCallIn: (encounterId: string) => void;
  onWithdraw: (alert: LiveAlert) => void;
  onAcknowledge: () => void;
}) {
  const style = SEVERITY_STYLES[alert.severity];
  return (
    <div
      className={`px-4 py-3 ${alert.acknowledged ? "opacity-55" : ""}`}
      style={alert.acknowledged ? undefined : { backgroundColor: alert.severity === "info" ? undefined : style.bg }}
    >
      <div className="flex items-start gap-3">
        <span className="text-base leading-none mt-0.5">{KIND_ICONS[alert.kind]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-semibold text-gray-900">{alert.title}</span>
            {alert.severity !== "info" && (
              <span
                className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded border"
                style={{ color: style.text, borderColor: style.border, backgroundColor: "#FFFFFF" }}
              >
                {style.label}
              </span>
            )}
            {alert.acknowledged && (
              <span className="text-[9.5px] font-bold uppercase text-[#94A3B8]">cleared</span>
            )}
          </div>
          <p className="text-[11.5px] text-[#475569] mt-0.5 break-words">{alert.detail}</p>
          <div className="text-[10.5px] text-[#94A3B8] mt-1 font-mono">
            {alert.umr} · {formatElapsed(alert.at, now)} ago
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {alert.kind === "new-patient" && alert.encounterId && (
              <>
                <Btn variant="primary" size="xs" onClick={() => onCallIn(alert.encounterId!)}>
                  Call in
                </Btn>
                <Btn variant="ghost" size="xs" onClick={() => onOpenPatient(alert.encounterId!)}>
                  Open record
                </Btn>
              </>
            )}
            {alert.kind === "waiting-long" && alert.encounterId && (
              <Btn variant="primary" size="xs" onClick={() => onCallIn(alert.encounterId!)}>
                Call in now
              </Btn>
            )}
            {(alert.kind === "lab-critical" || alert.kind === "lab-result") && alert.encounterId && (
              <Btn variant="primary" size="xs" onClick={() => onOpenPatient(alert.encounterId!)}>
                Review results
              </Btn>
            )}
            {alert.kind === "lab-awaiting-payment" && (
              <>
                {alert.encounterId && (
                  <Btn variant="ghost" size="xs" onClick={() => onOpenPatient(alert.encounterId!)}>
                    Open record
                  </Btn>
                )}
                {alert.actionable && (
                  <Btn variant="outline" size="xs" onClick={() => onWithdraw(alert)}>
                    Withdraw order
                  </Btn>
                )}
              </>
            )}
            {alert.kind === "rx-rejected" && alert.encounterId && (
              <Btn variant="primary" size="xs" onClick={() => onOpenPatient(alert.encounterId!)}>
                Rewrite prescription
              </Btn>
            )}

            {!alert.acknowledged && (
              <button
                type="button"
                onClick={onAcknowledge}
                className="text-[11px] text-[#64748B] font-semibold hover:text-[#334155] px-1.5"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
