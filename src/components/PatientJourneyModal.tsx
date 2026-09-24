import React, { useState } from "react"
import { db, DBOPEncounter } from "../services/db"
import { DoctorPortalDatabase } from "../services/doctorPortalDb"
import { Icon } from "./icons"

interface PatientJourneyModalProps {
  encounter: DBOPEncounter | null
  onClose: () => void
  onNavigateToDoctorPortal?: (encId: string) => void
  onNavigateToOPWorkflow?: (encId: string, step?: number) => void
}

export default function PatientJourneyModal({
  encounter,
  onClose,
  onNavigateToDoctorPortal,
  onNavigateToOPWorkflow,
}: PatientJourneyModalProps) {
  const [activeTab, setActiveTab] =
    useState<"current_journey" | "previous_consultations">("current_journey")

  if (!encounter) return null

  // Retrieve lifetime OP history & previous consultation records for this patient's UMR
  const allPatientEncounters = db
    .getEncountersForPatient(encounter.umr)
    .sort(
      (a, b) =>
        new Date(b.timestamps?.arrival || b.registrationTime).getTime() -
        new Date(a.timestamps?.arrival || a.registrationTime).getTime(),
    )

  const previousEncounters = allPatientEncounters.filter(
    (e) => e.id !== encounter.id,
  )
  const consultationRecords = DoctorPortalDatabase.getConsultationsForPatient(
    encounter.umr,
  )

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in overflow-y-auto">
      <div
        id="printable-area"
        className="printable-area bg-white border-2 border-[#CBD5E1] rounded-none shadow-2xl max-w-3xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F172A] text-white flex justify-between items-center flex-shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-[#1B4FD8] flex items-center justify-center text-lg font-bold">
              🧭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-bold text-white">
                  Outpatient Clinical Journey & Consultation History
                </h3>
                <span className="font-mono text-[11px] font-bold bg-blue-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-none">
                  {encounter.opNumber}
                </span>
              </div>
              <p className="text-[12px] text-slate-300">
                Outpatient care trajectory & past consultation data for
                permanent UMR:{" "}
                <strong className="text-white font-mono">
                  {encounter.umr}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Patient Credentials Bar */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] flex-shrink-0">
          <div>
            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
              Patient Name
            </span>
            <span className="font-bold text-gray-900 text-[13.5px]">
              {encounter.patientName}
            </span>
            <span className="text-[11px] text-[#64748B] block">
              {encounter.age} yrs · {encounter.sex}
            </span>
          </div>

          <div>
            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
              Permanent UMR (Lifetime)
            </span>
            <span className="font-mono font-bold text-[#1B4FD8] text-[13px] bg-blue-50 px-2 py-0.5 rounded-none border border-blue-200 inline-block mt-0.5">
              {encounter.umr}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              {encounter.phone}
            </span>
          </div>

          <div>
            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
              Department & Doctor
            </span>
            <span className="font-semibold text-gray-900 block">
              {encounter.dept}
            </span>
            <span className="text-[11px] text-gray-600 block">
              {encounter.assignedDoctor || "Attending Physician"} ·{" "}
              {encounter.room || "Room 101"}
            </span>
          </div>

          <div>
            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
              Care Status & History
            </span>
            <span className="font-bold text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-none border border-emerald-200 inline-block text-[11px]">
              {encounter.status}
            </span>
            <span className="text-[11px] font-mono font-bold text-gray-700 block mt-0.5">
              {previousEncounters.length} Past OP Consultations
            </span>
          </div>
        </div>

        {/* Navigation Switcher Tabs */}
        <div className="bg-white border-b border-[#CBD5E1] px-6 py-2 flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("current_journey")}
            className={`px-3.5 py-1.5 text-[12px] font-bold rounded-none transition-colors cursor-pointer ${
              activeTab === "current_journey"
                ? "bg-[#1B4FD8] text-white shadow-xs"
                : "bg-[#F8FAFC] border border-[#CBD5E1] text-[#64748B] hover:text-gray-900"
            }`}
          >
            ⚡ Today's OP Care Milestones
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("previous_consultations")}
            className={`px-3.5 py-1.5 text-[12px] font-bold rounded-none transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "previous_consultations"
                ? "bg-[#1B4FD8] text-white shadow-xs"
                : "bg-[#F8FAFC] border border-[#CBD5E1] text-[#64748B] hover:text-gray-900"
            }`}
          >
            <span>📜</span> Previous Consultations ({previousEncounters.length})
          </button>
        </div>

        {/* TAB 1: CURRENT OP VISIT MILESTONES */}
        {activeTab === "current_journey" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="relative pl-6 space-y-6 border-l-2 border-[#CBD5E1] ml-4">
              {/* 1. ARRIVAL & CHECK-IN */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-none bg-[#1B4FD8] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                  1
                </div>
                <div className="bg-white border border-[#CBD5E1] rounded-none p-4 shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                      <span>🏥</span> Arrival & OPD Check-In
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded-none border border-blue-200">
                      {encounter.timestamps?.arrival ||
                        encounter.registrationTime ||
                        "10:00 AM"}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-700">
                    Patient arrived at Outpatient Reception Desk. Walk-in token
                    initialized.
                  </p>
                  <div className="text-[11px] text-[#64748B] bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0]">
                    Token ID:{" "}
                    <strong>
                      {encounter.queueToken || encounter.opNumber}
                    </strong>{" "}
                    · Type:{" "}
                    <strong>
                      {encounter.isNew
                        ? "New Outpatient"
                        : "Returning Patient Revisit"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2. REGISTRATION & UMR CONFIRMATION */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-none bg-[#1B4FD8] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                  2
                </div>
                <div className="bg-white border border-[#CBD5E1] rounded-none p-4 shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                      <span>📝</span> OP Registration & Permanent UMR
                      Verification
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded-none border border-blue-200">
                      {encounter.timestamps?.registration ||
                        encounter.registrationTime ||
                        "10:05 AM"}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-700">
                    Demographic credentials verified against permanent master
                    database. Lifetime <strong>{encounter.umr}</strong> linked
                    with today's OP visit number{" "}
                    <strong>{encounter.opNumber}</strong>.
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-600">
                    <span>✓ Official OP Pass Issued</span>
                    <span>•</span>
                    <span>Contact: {encounter.phone}</span>
                    <span>•</span>
                    <span>Address: {encounter.address || "Main City"}</span>
                  </div>
                </div>
              </div>

              {/* 3. SYMPTOMS & AI CLINICAL TRIAGE */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-none bg-[#8B5CF6] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                  3
                </div>
                <div className="bg-white border border-[#CBD5E1] rounded-none p-4 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                      <span>🤖</span> Symptom Intake & AI Specialty
                      Recommendation
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-none border border-purple-200">
                      {encounter.timestamps?.symptoms || "10:10 AM"}
                    </span>
                  </div>
                  <div className="bg-[#F8FAFC] p-2.5 rounded-none border border-[#E2E8F0] text-[12px]">
                    <span className="font-bold text-[#64748B] block text-[10.5px] uppercase">
                      Presenting Chief Complaints:
                    </span>
                    <span className="text-gray-900 font-medium">
                      "
                      {encounter.chiefComplaint ||
                        encounter.symptoms?.join(", ") ||
                        "General outpatient evaluation requested."}
                      "
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11.5px]">
                    <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-none border border-purple-200">
                      AI Specialty: {encounter.dept} (96% Confidence)
                    </span>
                    <span className="text-[#64748B]">
                      Assigned to:{" "}
                      <strong>{encounter.assignedDoctor || "Physician"}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. NURSE STATION & VITAL SIGNS */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-none bg-[#10B981] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                  4
                </div>
                <div className="bg-white border border-[#CBD5E1] rounded-none p-4 shadow-2xs space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                      <span>🩺</span> Nurse Station Triage & Baseline Vitals
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-none border border-emerald-200">
                      {encounter.timestamps?.vitalsRecorded || "10:18 AM"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11.5px]">
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Blood Pressure
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {encounter.vitals?.bp || "120/80 mmHg"}
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Heart Rate
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {encounter.vitals?.pulse || "76 bpm"}
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Temperature
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {encounter.vitals?.temp || "98.6 °F"}
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        SpO2 Oxygen
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {encounter.vitals?.spo2 || "99%"}
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Body Weight
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {encounter.vitals?.weight || "74 kg"}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11.5px] text-[#166534] bg-[#F0FDF4] p-2 rounded-none border border-emerald-200">
                    👩‍⚕️ <strong>Nurse Assessment:</strong>{" "}
                    {encounter.vitals?.notes ||
                      "Alert, oriented, stable physiological baseline recorded."}
                  </div>
                </div>
              </div>

              {/* 5. DOCTOR QUEUE ALLOCATION */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-none bg-[#F59E0B] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                  5
                </div>
                <div className="bg-white border border-[#CBD5E1] rounded-none p-4 shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                      <span>⏳</span> Doctor Queue Allocation & Chamber Calling
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-none border border-amber-200">
                      {encounter.timestamps?.doctorAssigned || "10:25 AM"}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-700">
                    Allocated to{" "}
                    <strong>
                      {encounter.assignedDoctor || "Attending Physician"}
                    </strong>{" "}
                    in <strong>{encounter.room || "Room 101"}</strong> with live
                    token{" "}
                    <strong>
                      #{encounter.queueToken || encounter.opNumber}
                    </strong>
                    . Broadcasted on waiting room kiosk.
                  </p>
                </div>
              </div>

              {/* 6. PHYSICIAN CONSULTATION & LIVE RX PAD */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-none bg-[#1B4FD8] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                  6
                </div>
                <div className="bg-white border-2 border-blue-200 rounded-none p-4 shadow-xs space-y-3">
                  <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                    <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                      <span>🩺</span> Physician Examination & Live Prescription
                      (Rx)
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded-none border border-blue-200">
                      {encounter.timestamps?.consultationStart || "10:32 AM"} —{" "}
                      {encounter.timestamps?.consultationEnd || "10:45 AM"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                    <div className="bg-[#F8FAFC] p-2.5 rounded-none border border-[#E2E8F0]">
                      <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
                        Clinical Diagnosis
                      </span>
                      <span className="font-bold text-gray-900 block mt-0.5">
                        {encounter.diagnosis ||
                          "Acute Coronary Syndrome Rule-Out / Stable Angina"}
                      </span>
                      <span className="text-[11px] font-mono text-[#1B4FD8]">
                        ICD-10: {encounter.icd10 || "I20.9"}
                      </span>
                    </div>

                    <div className="bg-[#F8FAFC] p-2.5 rounded-none border border-[#E2E8F0]">
                      <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
                        Diagnostic Investigations
                      </span>
                      <span className="font-medium text-gray-800 block mt-0.5">
                        {encounter.investigations &&
                        encounter.investigations.length > 0
                          ? encounter.investigations.join(", ")
                          : "ECG 12-Lead, Serum Troponin I, Lipid Profile"}
                      </span>
                    </div>
                  </div>

                  {/* Prescribed Medications Pad */}
                  <div className="space-y-1 text-[12px]">
                    <span className="text-[11px] uppercase font-bold text-[#64748B] block">
                      Prescribed Medications (Rx):
                    </span>
                    <div className="bg-white border border-[#CBD5E1] rounded-none overflow-hidden">
                      <table className="w-full text-left text-[11.5px]">
                        <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#64748B]">
                          <tr>
                            <th className="px-3 py-1.5">Medicine</th>
                            <th className="px-3 py-1.5">Dosage</th>
                            <th className="px-3 py-1.5">Frequency</th>
                            <th className="px-3 py-1.5">Duration</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9]">
                          {encounter.prescription &&
                          encounter.prescription.length > 0 ? (
                            encounter.prescription.map((rx, i) => (
                              <tr key={i}>
                                <td className="px-3 py-1.5 font-semibold text-gray-900">
                                  {rx.medicine}
                                </td>
                                <td className="px-3 py-1.5 text-gray-700">
                                  {rx.dosage}
                                </td>
                                <td className="px-3 py-1.5 text-gray-700">
                                  {rx.frequency}
                                </td>
                                <td className="px-3 py-1.5 text-gray-700">
                                  {rx.duration}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-3 py-1.5 font-semibold text-gray-900">
                                Aspirin 81mg
                              </td>
                              <td className="px-3 py-1.5 text-gray-700">
                                1 tab
                              </td>
                              <td className="px-3 py-1.5 text-gray-700">
                                OD (Once Daily)
                              </td>
                              <td className="px-3 py-1.5 text-gray-700">
                                30 days
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-[11.5px] text-gray-700 bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0]">
                    <strong>Doctor Advice:</strong>{" "}
                    {encounter.advice ||
                      "Avoid strenuous exertion, follow heart-healthy diet, and follow up in 2 weeks."}
                  </div>
                </div>
              </div>

              {/* 7. BILLING SETTLEMENT & INVOICE */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-none bg-[#10B981] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                  7
                </div>
                <div className="bg-white border border-[#CBD5E1] rounded-none p-4 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                      <span>💳</span> Billing Settlement & Official Receipt
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-none border border-emerald-200">
                      {encounter.timestamps?.billingCompleted || "10:55 AM"}
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] p-3 rounded-none border border-[#E2E8F0] space-y-1.5 text-[12px]">
                    {(() => {
                      const regFee = encounter.billing?.registrationFee ?? (encounter.isNew === false ? 0 : 20)
                      const consultFee = encounter.billing?.consultationFee ?? 500
                      const labFee = encounter.billing?.labFee || 0
                      const grandTotal = encounter.billing?.total || (regFee + consultFee + labFee)
                      return (
                        <>
                          <div className="flex justify-between text-gray-700">
                            <span>1. Patient Registration Fee {encounter.isNew === false || regFee === 0 ? "(Existing Patient)" : ""}</span>
                            <span className="font-mono font-bold text-gray-900">₹{regFee}.00</span>
                          </div>
                          <div className="flex justify-between text-gray-700">
                            <span>2. Physician Outpatient Consultation Fee {encounter.assignedDoctor ? `(${encounter.assignedDoctor})` : ""}</span>
                            <span className="font-mono font-bold text-gray-900">₹{consultFee}.00</span>
                          </div>
                          {labFee > 0 && (
                            <div className="flex justify-between text-gray-700">
                              <span>3. Diagnostic Investigations / Triage</span>
                              <span className="font-mono font-bold text-gray-900">₹{labFee}.00</span>
                            </div>
                          )}
                          <div className="pt-1.5 border-t border-[#E2E8F0] flex justify-between font-bold text-[13px] text-gray-900">
                            <span>Total Official Settlement:</span>
                            <span className="font-mono text-emerald-700">₹{grandTotal}.00 (Status: {encounter.billing?.status || 'Paid'})</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* 8. PHARMACY & DISPENSING */}
              <div className="relative group">
                <div className="absolute -left-[31px] top-0 w-6 h-6 rounded-none bg-[#06B6D4] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                  8
                </div>
                <div className="bg-white border border-[#CBD5E1] rounded-none p-4 shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                      <span>💊</span> Pharmacy Dispensing & Visit Completed
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-none border border-cyan-200">
                      {encounter.timestamps?.visitCompleted || "11:02 AM"}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-700">
                    Prescriptions routed to outpatient pharmacy queue. Patient
                    departure counselled with lifestyle instructions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIOUS CONSULTATION DATA (OUTPATIENT CLINICAL HISTORY) */}
        {activeTab === "previous_consultations" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {previousEncounters.length === 0 ? (
              <div className="bg-[#F0FDF4] border-2 border-[#86EFAC] rounded-none p-6 text-center space-y-2">
                <div className="text-2xl">✨</div>
                <h4 className="text-[14px] font-bold text-[#166534]">
                  First Outpatient Visit — Initial Clinical Baseline
                </h4>
                <p className="text-[12px] text-[#15803D] max-w-md mx-auto">
                  This patient is registered for their first OP consultation.
                  Today's visit will create their baseline outpatient clinical
                  record.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] p-3 rounded-none text-[12px] text-[#1E40AF] flex items-center justify-between">
                  <span className="font-bold">
                    📜 Chronological OP Consultation History for{" "}
                    {encounter.patientName}
                  </span>
                  <span className="font-mono font-bold bg-white px-2 py-0.5 border border-blue-200">
                    {previousEncounters.length} Prior Visits
                  </span>
                </div>

                {previousEncounters.map((pastEnc, idx) => {
                  const matchingConsult = consultationRecords.find(
                    (c) => c.encounterId === pastEnc.id,
                  )

                  return (
                    <div
                      key={pastEnc.id}
                      className="bg-white border-2 border-[#CBD5E1] rounded-none p-4 shadow-2xs space-y-3"
                    >
                      {/* Consultation Header */}
                      <div className="flex justify-between items-start border-b border-[#E2E8F0] pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-none bg-[#1B4FD8] text-white text-[11px] font-bold flex items-center justify-center font-mono">
                              {previousEncounters.length - idx}
                            </span>
                            <span className="font-bold text-[14px] text-gray-900">
                              {pastEnc.assignedDoctor || "Attending Physician"}
                            </span>
                            <span className="text-[11px] font-mono text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded-none border border-blue-200">
                              {pastEnc.dept || "Cardiology"}
                            </span>
                          </div>
                          <span className="text-[11.5px] text-[#64748B] block mt-0.5">
                            Visit OP No:{" "}
                            <strong className="font-mono text-gray-800">
                              {pastEnc.opNumber}
                            </strong>{" "}
                            · Room: {pastEnc.room || "Room 101"}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-[11.5px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-none border border-gray-300 inline-block">
                            {pastEnc.registrationTime || "Past Visit"}
                          </span>
                          <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-none border border-emerald-200 block mt-1">
                            {pastEnc.status}
                          </span>
                        </div>
                      </div>

                      {/* Complaint & Symptoms */}
                      <div className="bg-[#F8FAFC] p-2.5 rounded-none border border-[#E2E8F0] text-[12px]">
                        <span className="font-bold text-[#64748B] block text-[10px] uppercase">
                          Chief Complaint Narrative
                        </span>
                        <p className="text-gray-900 font-medium mt-0.5">
                          "
                          {pastEnc.chiefComplaint ||
                            pastEnc.symptoms?.join(", ") ||
                            "Routine follow-up evaluation."}
                          "
                        </p>
                      </div>

                      {/* Vitals Recorded */}
                      {pastEnc.vitals?.bp && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-gray-50 p-2 rounded-none border border-gray-200 text-center">
                            <span className="text-gray-500 block text-[9.5px] uppercase font-bold">
                              BP
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {pastEnc.vitals.bp}
                            </span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-none border border-gray-200 text-center">
                            <span className="text-gray-500 block text-[9.5px] uppercase font-bold">
                              Heart Rate
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {pastEnc.vitals.pulse}
                            </span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-none border border-gray-200 text-center">
                            <span className="text-gray-500 block text-[9.5px] uppercase font-bold">
                              Temp
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {pastEnc.vitals.temp}
                            </span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-none border border-gray-200 text-center">
                            <span className="text-gray-500 block text-[9.5px] uppercase font-bold">
                              SpO2
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {pastEnc.vitals.spo2}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Diagnosis & Prescribed Rx */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                        <div className="bg-[#F8FAFC] p-2.5 rounded-none border border-[#E2E8F0]">
                          <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                            Diagnosis Recorded
                          </span>
                          <span className="font-bold text-gray-900 block mt-0.5">
                            {pastEnc.diagnosis ||
                              matchingConsult?.diagnosis ||
                              "Primary Evaluation Completed"}
                          </span>
                        </div>

                        <div className="bg-[#F8FAFC] p-2.5 rounded-none border border-[#E2E8F0]">
                          <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                            Doctor Advice
                          </span>
                          <span className="text-gray-800 font-medium block mt-0.5">
                            {pastEnc.advice ||
                              matchingConsult?.advice ||
                              "Regular follow-up as advised."}
                          </span>
                        </div>
                      </div>

                      {/* Prescribed Medications Table */}
                      {pastEnc.prescription?.length ||
                      matchingConsult?.medications?.length ? (
                        <div className="space-y-1 text-[11.5px]">
                          <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
                            Medications Prescribed (Rx):
                          </span>
                          <div className="border border-[#CBD5E1] overflow-hidden bg-white">
                            <table className="w-full text-left">
                              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#64748B] text-[10.5px]">
                                <tr>
                                  <th className="px-3 py-1">Medicine</th>
                                  <th className="px-3 py-1">Dosage</th>
                                  <th className="px-3 py-1">Frequency</th>
                                  <th className="px-3 py-1">Duration</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#F1F5F9] text-[11px]">
                                {(
                                  pastEnc.prescription ||
                                  matchingConsult?.medications ||
                                  []
                                ).map((rx: any, rxIdx: number) => (
                                  <tr key={rxIdx}>
                                    <td className="px-3 py-1 font-semibold text-gray-900">
                                      {rx.medicine || rx.name}
                                    </td>
                                    <td className="px-3 py-1 text-gray-700">
                                      {rx.dosage}
                                    </td>
                                    <td className="px-3 py-1 text-gray-700">
                                      {rx.frequency}
                                    </td>
                                    <td className="px-3 py-1 text-gray-700">
                                      {rx.duration}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11.5px] text-[#64748B]">
            Permanent UMR: <strong>{encounter.umr}</strong> · Visit:{" "}
            <strong>{encounter.opNumber}</strong>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-white hover:bg-gray-100 border border-[#CBD5E1] text-gray-800 text-[12px] font-bold rounded-none shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Icon.Download /> Print Journey Report
            </button>

            {onNavigateToDoctorPortal && (
              <button
                type="button"
                onClick={() => {
                  const encId = encounter.id
                  onClose()
                  onNavigateToDoctorPortal(encId)
                }}
                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1B4FD8] border border-blue-200 text-[12px] font-bold rounded-none transition-colors cursor-pointer"
              >
                Open Doctor Workspace →
              </button>
            )}

            {onNavigateToOPWorkflow && (
              <button
                type="button"
                onClick={() => {
                  const encId = encounter.id
                  onClose()
                  onNavigateToOPWorkflow(encId, 1)
                }}
                className="px-4 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12px] font-bold rounded-none shadow-xs transition-colors cursor-pointer"
              >
                Open Full 6-Step Clinical Journey ➔
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
