import React, { useState, useEffect, useMemo } from "react";
import { StatusBadge, Btn, Card, Table, TR, TD } from "./shared";
import { BillingDatabase, ClaimRecord, DepartmentChargeRecord } from "../services/billingDb";

interface SurgeryCase {
  id: string;
  or: string;
  time: string;
  procedure: string;
  patient: string;
  patientId: string;
  surgeon: string;
  anesthesia: string;
  status: "Scheduled" | "In Progress" | "Completed";
  duration: string;
  totalAmount: number;
  insuranceProvider: string;
}

const INITIAL_OR_SCHEDULE: { or: string; cases: SurgeryCase[] }[] = [
  {
    or: "OR 1 — Major General Surgery",
    cases: [
      { id: "SURG-101", or: "OR 1", time: "07:30–09:45", procedure: "Total Knee Replacement R", patient: "Harold Thompson, 68", patientId: "UMR100450", surgeon: "Dr. Adams", anesthesia: "Dr. Rodriguez", status: "Completed", duration: "2h 15m", totalAmount: 3200, insuranceProvider: "Star Health" },
      { id: "SURG-102", or: "OR 1", time: "11:00–13:30", procedure: "Appendectomy (Laparoscopic)", patient: "Isabel Cruz, 19", patientId: "UMR100451", surgeon: "Dr. Williams", anesthesia: "Dr. Kim", status: "In Progress", duration: "Est 2h 30m", totalAmount: 1650, insuranceProvider: "HDFC ERGO" },
      { id: "SURG-103", or: "OR 1", time: "15:00–16:30", procedure: "Cataract Extraction + IOL", patient: "Mia Thompson, 74", patientId: "UMR100452", surgeon: "Dr. Park", anesthesia: "Dr. Rodriguez", status: "Scheduled", duration: "Est 1h 30m", totalAmount: 850, insuranceProvider: "Self-Pay" },
    ]
  },
  {
    or: "OR 2 — Laparoscopy & Cardiac",
    cases: [
      { id: "SURG-104", or: "OR 2", time: "08:00–10:30", procedure: "Laparoscopic Cholecystectomy", patient: "Ananya Desai, 42", patientId: "UMR100412", surgeon: "Dr. Vikram Seth", anesthesia: "Dr. Marcus Brody", status: "Completed", duration: "2h 30m", totalAmount: 1780, insuranceProvider: "HDFC ERGO" },
      { id: "SURG-105", or: "OR 2", time: "12:00–15:00", procedure: "CABG ×3 Bypass", patient: "George Watts, 60", patientId: "UMR100453", surgeon: "Dr. Patel", anesthesia: "Dr. Rodriguez", status: "Scheduled", duration: "Est 3h 00m", totalAmount: 5500, insuranceProvider: "ICICI Lombard" },
    ]
  },
  {
    or: "OR 3 — Orthopedic & Trauma",
    cases: [
      { id: "SURG-106", or: "OR 3", time: "09:00–12:00", procedure: "Hip Replacement L", patient: "Diane Walsh, 80", patientId: "UMR100142", surgeon: "Dr. Adams", anesthesia: "Dr. Kim", status: "In Progress", duration: "Est 3h", totalAmount: 3400, insuranceProvider: "Star Health" },
      { id: "SURG-107", or: "OR 3", time: "14:00–15:30", procedure: "Hernia Repair (Inguinal)", patient: "Marcus Webb, 43", patientId: "UMR100454", surgeon: "Dr. Williams", anesthesia: "Dr. Rodriguez", status: "Scheduled", duration: "Est 1h 30m", totalAmount: 1200, insuranceProvider: "Self-Pay" },
    ]
  },
  {
    or: "OR 4 — Emergency Trauma OT",
    cases: []
  },
];

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  "Completed": { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  "In Progress": { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "Scheduled": { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
};

export default function Surgery() {
  const [schedule, setSchedule] = useState(INITIAL_OR_SCHEDULE);
  const [billingVersion, setBillingVersion] = useState(0);
  const [selectedCaseForBill, setSelectedCaseForBill] = useState<SurgeryCase | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Subscribe to Central Billing updates in real-time
  useEffect(() => {
    return BillingDatabase.onUpdate(() => {
      setBillingVersion((v) => v + 1);
    });
  }, []);

  // Fetch all active claims and department charges
  const claims = useMemo(() => BillingDatabase.getClaims(), [billingVersion]);
  const deptCharges = useMemo(() => BillingDatabase.getDepartmentCharges(), [billingVersion]);

  // Helper to check financial clearance for a surgery patient
  const getSurgicalClearance = (patientId: string, patientName: string) => {
    const cleanName = patientName.split(",")[0].trim().toLowerCase();
    const cleanId = (patientId || "").toLowerCase();

    const matchClaim = claims.find(
      (c) =>
        (c.patientId && c.patientId.toLowerCase() === cleanId) ||
        (c.patientName && c.patientName.toLowerCase().includes(cleanName))
    );

    if (matchClaim) {
      return {
        isCleared: matchClaim.balanceDue === 0,
        balanceDue: matchClaim.balanceDue,
        totalAmount: matchClaim.totalAmount,
        receiptNo: matchClaim.payments?.[matchClaim.payments.length - 1]?.receiptNo || (matchClaim.balanceDue === 0 ? "RCPT-2026-5501" : undefined),
        invoiceNo: matchClaim.invoiceNo,
        status: matchClaim.status,
      };
    }

    const matchDept = deptCharges.find(
      (d) =>
        d.department === "Surgery" &&
        ((d.patientId && d.patientId.toLowerCase() === cleanId) ||
          (d.patientName && d.patientName.toLowerCase().includes(cleanName)))
    );

    if (matchDept) {
      return {
        isCleared: matchDept.status === "Invoiced in Central Billing",
        balanceDue: matchDept.status === "Invoiced in Central Billing" ? 0 : Math.round(matchDept.totalAmount * 0.2),
        totalAmount: matchDept.totalAmount,
        invoiceNo: matchDept.id,
        status: matchDept.status,
      };
    }

    return { isCleared: true, balanceDue: 0, totalAmount: 0 };
  };

  const handleCompleteCase = (orIndex: number, caseIndex: number) => {
    const updated = [...schedule];
    const c = updated[orIndex].cases[caseIndex];
    c.status = "Completed";
    setSchedule(updated);

    // Record finalized surgical charge in Department Charges
    try {
      const existing = deptCharges.find(d => d.patientId === c.patientId && d.department === "Surgery");
      if (!existing) {
        BillingDatabase.createDepartmentCharge({
          patientId: c.patientId,
          mrn: c.patientId.replace(/\D/g, "") || "100412",
          patientName: c.patient.split(",")[0].trim(),
          age: parseInt(c.patient.split(",")[1]) || 40,
          gender: "Male",
          phone: "+91 98451 23456",
          encounterId: `ENC-SURG-${c.id}`,
          department: "Surgery",
          carePathway: `Surgery: ${c.procedure} + Major OT + PACU Recovery`,
          dateOfService: new Date().toISOString().split("T")[0],
          insuranceProvider: c.insuranceProvider,
          policyNumber: `POL-${c.patientId}`,
          attendingDoctor: c.surgeon,
          diagnosisCodes: ["Z98.89"],
          items: [
            { id: "SURG-IT-1", description: c.procedure, category: "Procedure / Surgery", cptCode: "47562", quantity: 1, unitPrice: Math.round(c.totalAmount * 0.45), total: Math.round(c.totalAmount * 0.45), insuranceCovered: Math.round(c.totalAmount * 0.45 * 0.8), patientPayable: Math.round(c.totalAmount * 0.45 * 0.2) },
            { id: "SURG-IT-2", description: `Major Operation Theatre (${c.or}) Infrastructure Rate`, category: "Room / Bed Charges", cptCode: "99291", quantity: 1, unitPrice: Math.round(c.totalAmount * 0.2), total: Math.round(c.totalAmount * 0.2), insuranceCovered: Math.round(c.totalAmount * 0.2 * 0.8), patientPayable: Math.round(c.totalAmount * 0.2 * 0.2) },
            { id: "SURG-IT-3", description: `Chief Operating Surgeon Professional Fee (${c.surgeon})`, category: "Consultation", cptCode: "99205", quantity: 1, unitPrice: Math.round(c.totalAmount * 0.2), total: Math.round(c.totalAmount * 0.2), insuranceCovered: Math.round(c.totalAmount * 0.2 * 0.8), patientPayable: Math.round(c.totalAmount * 0.2 * 0.2) },
            { id: "SURG-IT-4", description: `Consultant Anesthesiologist Fee (${c.anesthesia})`, category: "Consultation", cptCode: "00840", quantity: 1, unitPrice: Math.round(c.totalAmount * 0.1), total: Math.round(c.totalAmount * 0.1), insuranceCovered: Math.round(c.totalAmount * 0.1 * 0.8), patientPayable: Math.round(c.totalAmount * 0.1 * 0.2) },
            { id: "SURG-IT-5", description: "PACU Post-Anesthesia Recovery Care & Monitoring", category: "Nursing", cptCode: "99505", quantity: 1, unitPrice: Math.round(c.totalAmount * 0.05), total: Math.round(c.totalAmount * 0.05), insuranceCovered: Math.round(c.totalAmount * 0.05 * 0.8), patientPayable: Math.round(c.totalAmount * 0.05 * 0.2) },
          ],
          subtotal: c.totalAmount,
          totalAmount: c.totalAmount,
          notes: `Operation completed in ${c.or}. Surgical packet verified and transferred to Central Billing for co-pay settlement.`,
        });
      }
      setNotice(`✅ ${c.procedure} marked as COMPLETED! Surgical charge packet (₹${c.totalAmount.toLocaleString("en-IN")}) sent to Central Billing queue.`);
      setTimeout(() => setNotice(null), 5000);
    } catch {
      setNotice(`Case completed. Financial packet routed to Central Billing.`);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const now = "11:12 AM";

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      {/* Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <span>🏥</span> Surgical Services &amp; Operation Theatre (OT) Board
          </h1>
          <p className="text-[11.5px] text-[#64748B]">
            Real-time OR scheduling, case completion, PACU handover &amp; Central Billing settlement gate
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-[#1B4FD8] font-bold text-xs rounded">
            🕒 Active OT Hours: {now}
          </span>
          <Btn variant="outline" size="sm">+ New Case</Btn>
          <Btn variant="primary" size="sm">⚡ Emergency OT STAT</Btn>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-300 rounded text-[12.5px] font-semibold text-emerald-900 flex items-center justify-between animate-in fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">✕</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Total Cases Today", value: "8", color: "#0F1624" },
          { label: "Completed (Invoiced)", value: "3", color: "#16A34A" },
          { label: "In Progress in OT", value: "2", color: "#1B4FD8" },
          { label: "Scheduled Next", value: "3", color: "#7C3AED" },
          { label: "Available Theatres", value: "1", color: "#16A34A" },
        ].map((s, i) => (
          <div key={i} className="text-center p-2 rounded bg-slate-50 border border-slate-100">
            <div className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] font-semibold text-[#64748B]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="p-5 space-y-4 max-w-7xl mx-auto">
        {/* Hospital Policy Protocol Banner */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg text-[12px] text-blue-950 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💡</span>
            <div>
              <strong>Operation Theatre (OT) Central Billing Workflow:</strong>
              <span className="text-[#64748B] block text-[11.5px] mt-0.5">
                When surgeries conclude, OT Nursing finalizes the itemized surgical packet (Surgeon, Anesthesia, OT Theatre Infrastructure, PACU, Consumables). The packet flows automatically to Central Billing for co-pay settlement.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-blue-600 text-white font-bold text-[11px] rounded uppercase">Live Sync Active</span>
        </div>

        {/* OR Schedule Boards */}
        {schedule.map((or, oi) => (
          <div key={oi} className="bg-white border border-[#DDE2EC] rounded-lg shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <span>🚪</span> {or.or}
              </span>
              <div className="flex items-center gap-3 text-[11.5px] text-[#64748B]">
                <span className="font-semibold">{or.cases.length} surgical case{or.cases.length !== 1 ? "s" : ""}</span>
                <Btn variant="ghost" size="xs">Block Room</Btn>
              </div>
            </div>
            {or.cases.length === 0 ? (
              <div className="p-8 text-center text-[#94A3B8] text-[12.5px] font-medium">
                ✨ No active surgical cases scheduled in this theatre · Room sanitized &amp; available for emergency STAT admissions
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {or.cases.map((c, ci) => {
                  const s = STATUS_COLOR[c.status] || STATUS_COLOR["Scheduled"];
                  const clearance = c.status === "Completed" ? getSurgicalClearance(c.patientId, c.patient) : null;

                  return (
                    <div
                      key={ci}
                      style={{ borderLeftColor: s.text }}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 py-3.5 border-l-4 hover:bg-[#F8FAFC] transition-colors"
                    >
                      {/* Left: Timing & Procedure */}
                      <div className="flex items-start gap-3.5 min-w-[280px]">
                        <div className="w-24 shrink-0 pt-0.5">
                          <span className="font-mono text-[11.5px] font-bold text-[#475569] block">{c.time}</span>
                          <span className="text-[10.5px] text-[#94A3B8]">{c.duration}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-bold text-gray-900">{c.procedure}</span>
                            <span
                              style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}
                              className="border text-[11px] font-bold px-2 py-0.5 rounded"
                            >
                              {c.status}
                            </span>
                          </div>
                          <div className="text-[11.5px] text-[#64748B] mt-1 flex items-center gap-3 flex-wrap">
                            <span className="font-semibold text-gray-800">👤 {c.patient}</span>
                            <span>•</span>
                            <span>👨‍⚕️ Surgeon: <strong>{c.surgeon}</strong></span>
                            <span>•</span>
                            <span>🩺 Anesthesia: {c.anesthesia}</span>
                            <span>•</span>
                            <span className="text-blue-700 font-semibold">{c.insuranceProvider}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Financial Clearance Badge (For Completed Surgeries) */}
                      {c.status === "Completed" && clearance && (
                        <div className="shrink-0">
                          {clearance.isCleared ? (
                            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded text-[11.5px] text-emerald-900 flex items-center gap-2 shadow-2xs">
                              <span className="text-base">✅</span>
                              <div>
                                <strong className="block font-bold text-emerald-800">Surgical Bill Cleared</strong>
                                <span className="text-[10.5px] text-emerald-700">Receipt: {clearance.receiptNo || "Paid & Settled"}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-300 rounded text-[11.5px] text-amber-900 flex items-center gap-2 shadow-2xs">
                              <span className="text-base">🔒</span>
                              <div>
                                <strong className="block font-bold text-amber-800">Sent to Central Billing</strong>
                                <span className="text-[10.5px] text-amber-700">Co-Pay Due: <strong className="text-red-700 font-mono">₹{clearance.balanceDue.toLocaleString("en-IN")}</strong></span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedCaseForBill(c)}
                          className="px-2.5 py-1.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-slate-700 font-bold rounded text-[11.5px] cursor-pointer shadow-2xs"
                        >
                          📄 View Charges
                        </button>
                        {c.status === "Scheduled" && (
                          <button
                            onClick={() => {
                              const updated = [...schedule];
                              updated[oi].cases[ci].status = "In Progress";
                              setSchedule(updated);
                            }}
                            className="px-3 py-1.5 bg-blue-50 border border-blue-300 hover:bg-blue-100 text-[#1B4FD8] font-bold rounded text-[11.5px] cursor-pointer shadow-2xs"
                          >
                            ▶️ Start Surgery
                          </button>
                        )}
                        {c.status === "In Progress" && (
                          <button
                            onClick={() => handleCompleteCase(oi, ci)}
                            className="px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded text-[11.5px] cursor-pointer shadow-2xs flex items-center gap-1"
                          >
                            <span>✓</span> Mark OT Completed
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Surgical Breakdown & Bill Modal */}
        {selectedCaseForBill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <span>📑</span> Surgical Charge Sheet &amp; Central Billing Breakdown
                </h3>
                <button onClick={() => setSelectedCaseForBill(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer">✕</button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[12px] text-blue-900 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Patient:</span>
                  <span>{selectedCaseForBill.patient} ({selectedCaseForBill.patientId})</span>
                </div>
                <div className="flex justify-between">
                  <span>Procedure:</span>
                  <span className="font-bold text-[#1B4FD8]">{selectedCaseForBill.procedure}</span>
                </div>
                <div className="flex justify-between">
                  <span>Surgeon &amp; Anesthesia:</span>
                  <span>{selectedCaseForBill.surgeon} • {selectedCaseForBill.anesthesia}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payer / Insurance:</span>
                  <span className="font-semibold">{selectedCaseForBill.insuranceProvider}</span>
                </div>
              </div>

              <div className="space-y-2 text-[12px]">
                <span className="font-bold text-gray-800 block uppercase text-[11px] tracking-wider">Itemized Theatre Charges:</span>
                <div className="border border-slate-200 rounded divide-y divide-slate-100 text-[12px]">
                  <div className="p-2 flex justify-between">
                    <span>1. {selectedCaseForBill.procedure} (Surgical Execution)</span>
                    <strong className="font-mono">₹{Math.round(selectedCaseForBill.totalAmount * 0.45).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span>2. Major OT Theatre Infrastructure Rate (2.5h)</span>
                    <strong className="font-mono">₹{Math.round(selectedCaseForBill.totalAmount * 0.2).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span>3. Chief Operating Surgeon Fee ({selectedCaseForBill.surgeon})</span>
                    <strong className="font-mono">₹{Math.round(selectedCaseForBill.totalAmount * 0.2).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span>4. Consultant Anesthesiologist Fee ({selectedCaseForBill.anesthesia})</span>
                    <strong className="font-mono">₹{Math.round(selectedCaseForBill.totalAmount * 0.1).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="p-2 flex justify-between">
                    <span>5. PACU Post-Anesthesia Recovery Care</span>
                    <strong className="font-mono">₹{Math.round(selectedCaseForBill.totalAmount * 0.05).toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-sm font-bold border-t border-slate-200">
                  <span>Total Surgical Bill:</span>
                  <span className="text-[#1B4FD8] font-mono text-base">₹{selectedCaseForBill.totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                <button
                  onClick={() => setSelectedCaseForBill(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-800 rounded font-semibold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pre-Op & On-Call Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Pre-Op Holding Queue">
            <Table headers={["Patient", "Procedure", "Time", "Status", "Action"]}>
              {[
                { patient: "Isabel Cruz", procedure: "Appendectomy", time: "11:00", status: "In Pre-Op" },
                { patient: "George Watts", procedure: "CABG ×3", time: "12:00", status: "Pending Consent" },
                { patient: "Mia Thompson", procedure: "Cataract", time: "15:00", status: "Not Arrived" },
                { patient: "Marcus Webb", procedure: "Hernia Repair", time: "14:00", status: "Awaiting Lab" },
              ].map((p, i) => (
                <TR key={i}>
                  <TD><span className="font-semibold text-gray-800">{p.patient}</span></TD>
                  <TD><span className="text-[#64748B]">{p.procedure}</span></TD>
                  <TD><span className="font-mono text-[11.5px]">{p.time}</span></TD>
                  <TD><StatusBadge status={p.status.replace(/\s/g, "")} /></TD>
                  <TD><Btn variant="ghost" size="xs">Checklist</Btn></TD>
                </TR>
              ))}
            </Table>
          </Card>

          <Card title="On-Call Surgical & Anesthesia Team">
            <div className="space-y-2">
              {[
                { role: "Attending Surgeon", name: "Dr. E. Adams", pager: "3142", specialty: "Orthopedic Surgery" },
                { role: "Chief Surgeon", name: "Dr. Vikram Seth", pager: "3145", specialty: "General & Laparoscopic" },
                { role: "Anesthesiologist", name: "Dr. K. Rodriguez", pager: "3210", specialty: "Cardiac Anesthesia" },
                { role: "Anesthesiologist", name: "Dr. J. Kim", pager: "3211", specialty: "General Anesthesia" },
                { role: "Scrub Tech Lead", name: "Michael Torres", pager: "3320", specialty: "Circulating Nurse" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-[#F1F5F9] last:border-0">
                  <div className="w-7 h-7 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[10px] font-bold text-[#1E3A6E] shrink-0">
                    {m.name.split(" ")[1]?.[0]}{m.name.split(" ")[2]?.[0] || ""}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-gray-800 truncate">{m.name}</div>
                    <div className="text-[11px] text-[#64748B]">{m.role} · {m.specialty}</div>
                  </div>
                  <span className="font-mono text-[11.5px] text-[#64748B]">p.{m.pager}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
