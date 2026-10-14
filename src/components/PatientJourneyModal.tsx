import React, { useState } from "react"
import { createPortal } from "react-dom"
import { db, DBOPEncounter } from "../services/db"
import { DoctorPortalDatabase } from "../services/doctorPortalDb"
import { Icon } from "./icons"
import { SendToPatientButton } from "./messaging/SendToPatientDialog"
import {
  buildJourneyDocument,
  journeyMessageVars,
  type JourneyStep,
} from "../lib/patientDocuments"
import { downloadPatientDocument } from "../lib/patientDocumentPdf"

interface PatientJourneyModalProps {
  encounter: DBOPEncounter | null
  onClose: () => void
  onNavigateToDoctorPortal?: (encId: string) => void
  onNavigateToOPWorkflow?: (encId: string, step?: number) => void
}

// The steps of this OP visit that actually happened, in order, for the PDF the
// patient is sent. Only recorded timestamps -- a step with no time did not
// happen yet and is not listed as if it had.
const JOURNEY_STEPS: [keyof DBOPEncounter["timestamps"], string][] = [
  ["arrival", "Arrived at the hospital"],
  ["registration", "Registered at the OP desk"],
  ["symptoms", "Symptoms recorded"],
  ["doctorAssigned", "Doctor assigned"],
  ["calledToNurse", "Called to the nurse station"],
  ["vitalsRecorded", "Vitals recorded"],
  ["consultationStart", "Consultation started"],
  ["consultationEnd", "Consultation completed"],
  ["billingCompleted", "Bill settled"],
  ["visitCompleted", "Visit completed"],
]

function journeySteps(enc: DBOPEncounter): JourneyStep[] {
  const t = enc.timestamps || ({} as DBOPEncounter["timestamps"])
  const detail: Partial<Record<keyof DBOPEncounter["timestamps"], string>> = {
    arrival: `Token: #${enc.queueToken || enc.opNumber} (${enc.isNew ? "New Patient" : "Returning Patient"})`,
    registration: `OP No. ${enc.opNumber} issued, permanent UMR ${enc.umr} confirmed`,
    symptoms: enc.chiefComplaint || (enc.symptoms?.length ? enc.symptoms.join(", ") : "General outpatient triage"),
    doctorAssigned: [enc.assignedDoctor, enc.dept, enc.room ? `Room ${enc.room}` : undefined].filter(Boolean).join(" · "),
    calledToNurse: "Patient directed to OPD Triage / Vitals desk",
    vitalsRecorded: enc.vitals?.bp
      ? `BP ${enc.vitals.bp}, Pulse ${enc.vitals.pulse || "--"} bpm, Temp ${enc.vitals.temp || "--"}°F, SpO2 ${enc.vitals.spo2 || "--"}%`
      : (t.vitalsBy ? `Triage assessed by ${t.vitalsBy}` : "Baseline physiological vitals recorded"),
    consultationStart: `Consultation chamber: ${enc.room || "Room 101"} · ${enc.assignedDoctor || "Physician"}`,
    consultationEnd: enc.diagnosis ? `Clinical Diagnosis: ${enc.diagnosis}` : "Physical evaluation completed",
    billingCompleted: enc.billing?.total ? `Amount: ₹${enc.billing.total} · Status: ${enc.billing.status || "Settled"}` : "Official bill settled",
    visitCompleted: "Outpatient visit completed",
  }
  return JOURNEY_STEPS.filter(([key]) => t[key]).map(([key, label]) => ({
    label,
    at: String(t[key]),
    detail: detail[key],
  }))
}

export default function PatientJourneyModal({
  encounter,
  onClose,
  onNavigateToDoctorPortal,
  onNavigateToOPWorkflow,
}: PatientJourneyModalProps) {
  const [activeTab, setActiveTab] =
    useState<"current_journey" | "previous_consultations">("current_journey")
  const [, setTick] = useState(0)
  const [downloading, setDownloading] = useState(false)

  React.useEffect(() => {
    const unsubDb = db.subscribe(() => setTick((t) => t + 1))
    const unsubDoc = DoctorPortalDatabase.subscribe(() => setTick((t) => t + 1))
    return () => {
      unsubDb()
      unsubDoc()
    }
  }, [])

  if (!encounter) return null

  // Retrieve current live encounter instance from DB if available
  const liveEncounter = db.getEncounterById(encounter.id) || encounter

  // Retrieve lifetime OP history & previous consultation records for this patient's UMR
  const allPatientEncounters = db
    .getEncountersForPatient(liveEncounter.umr)
    .sort(
      (a, b) =>
        new Date(b.timestamps?.arrival || b.registrationTime).getTime() -
        new Date(a.timestamps?.arrival || a.registrationTime).getTime(),
    )

  const previousEncounters = allPatientEncounters.filter(
    (e) => e.id !== liveEncounter.id,
  )
  const consultationRecords = DoctorPortalDatabase.getConsultationsForPatient(
    liveEncounter.umr,
  )
  const currentConsult = consultationRecords.find(
    (c) => c.encounterId === liveEncounter.id,
  )

  const activeDoctor =
    liveEncounter.assignedDoctor ||
    currentConsult?.doctorName ||
    "Attending Consultant Physician"
  const activeDiagnosis =
    liveEncounter.diagnosis || currentConsult?.diagnosis || "Routine Clinical Evaluation"
  const activeAdvice =
    liveEncounter.advice ||
    currentConsult?.advice ||
    currentConsult?.summary ||
    "Follow routine clinical precautions and revisit if symptoms persist."
  const activePrescription =
    liveEncounter.prescription && liveEncounter.prescription.length > 0
      ? liveEncounter.prescription
      : currentConsult?.medications && currentConsult.medications.length > 0
        ? currentConsult.medications.map((m) => ({
            medicine: m.name || (m as any).medicine,
            dosage: m.dosage || "-",
            frequency: m.frequency || "-",
            duration: m.duration || "-",
          }))
        : []
  const activeInvestigations =
    liveEncounter.investigations && liveEncounter.investigations.length > 0
      ? liveEncounter.investigations
      : currentConsult?.labTests && currentConsult.labTests.length > 0
        ? currentConsult.labTests.map((t) => t.name || (t as any).testName)
        : []
  const regFee =
    liveEncounter.billing?.registrationFee ??
    (liveEncounter.isNew === false ? 0 : 20)
  const consultFee = liveEncounter.billing?.consultationFee ?? 500
  const labFee = liveEncounter.billing?.labFee || 0
  const totalSettlement =
    liveEncounter.billing?.total || regFee + consultFee + labFee
  const billStatus = liveEncounter.billing?.status || "Paid"

  const buildCurrentJourneyDoc = () =>
    buildJourneyDocument({
      name: liveEncounter.patientName,
      id: liveEncounter.umr,
      phone: liveEncounter.phone,
      email: (liveEncounter as any).email || (liveEncounter as any).patientEmail,
      opNumber: liveEncounter.opNumber,
      token: liveEncounter.queueToken,
      department: liveEncounter.dept,
      doctor: activeDoctor,
      room: liveEncounter.room,
      status: liveEncounter.status,
      dateOfVisit: liveEncounter.timestamps?.arrival || liveEncounter.registrationTime,
      chiefComplaint: liveEncounter.chiefComplaint,
      symptoms: liveEncounter.symptoms,
      vitals: liveEncounter.vitals,
      diagnosis: activeDiagnosis,
      icd10: liveEncounter.icd10,
      advice: activeAdvice,
      prescriptions: activePrescription.length > 0 ? activePrescription : undefined,
      investigations: activeInvestigations.length > 0 ? activeInvestigations : undefined,
      billing: {
        total: totalSettlement,
        status: billStatus,
      },
      extra: [
        ["OP number", liveEncounter.opNumber],
        ["Token", `#${liveEncounter.queueToken || liveEncounter.opNumber}`],
        ["Department", liveEncounter.dept],
        ["Doctor", activeDoctor],
        ["Status", liveEncounter.status],
      ],
      steps: journeySteps(liveEncounter),
    })

  const handlePrint = () => {
    try {
      const printEl = document.getElementById("patient-journey-print-sheet")
      if (!printEl) {
        window.print()
        return
      }

      // Remove any previously created print iframe
      const oldFrame = document.getElementById("patient-journey-print-frame")
      if (oldFrame) oldFrame.remove()

      const iframe = document.createElement("iframe")
      iframe.id = "patient-journey-print-frame"
      iframe.style.position = "fixed"
      iframe.style.left = "-9999px"
      iframe.style.top = "0"
      iframe.style.width = "794px"
      iframe.style.height = "1123px"
      iframe.style.border = "0"
      iframe.style.opacity = "0"
      iframe.style.pointerEvents = "none"
      document.body.appendChild(iframe)

      const frameDoc = iframe.contentWindow?.document
      if (frameDoc) {
        frameDoc.open()
        const styleTags = Array.from(
          document.querySelectorAll("style, link[rel='stylesheet']"),
        )
          .map((el) => el.outerHTML)
          .join("\n")

        // Strip 'hidden' and convert print:block to block so iframe prints cleanly
        const cleanContentHtml = printEl.outerHTML
          .replace(/\bhidden\b/g, "")
          .replace(/\bprint:block\b/g, "block")

        frameDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Patient Journey - ${liveEncounter.patientName} (${liveEncounter.opNumber})</title>
              ${styleTags}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 6mm 8mm;
                }
                * {
                  box-sizing: border-box;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                html, body {
                  background: #ffffff !important;
                  color: #0f172a !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                #patient-journey-print-sheet,
                .patient-journey-print-sheet {
                  display: block !important;
                  visibility: visible !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                }
                .break-inside-avoid, table, .border {
                  break-inside: avoid !important;
                  page-break-inside: avoid !important;
                }
              </style>
            </head>
            <body>
              ${cleanContentHtml}
            </body>
          </html>
        `)
        frameDoc.close()

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus()
            iframe.contentWindow?.print()
          } catch (err) {
            console.error("Iframe print call failed, falling back to window.print():", err)
            window.print()
          } finally {
            setTimeout(() => {
              iframe.remove()
            }, 3000)
          }
        }, 350)
        return
      }
    } catch (e) {
      console.warn("Iframe printing failed, falling back to window.print():", e)
    }
    window.print()
  }

  const printSheet = (
    <div
      id="patient-journey-print-sheet"
      className="patient-journey-print-sheet hidden print:block p-0 text-slate-900 bg-white font-sans text-[9.5px] space-y-1.5 w-full"
    >
      {/* 1. Official Hospital Header */}
      <div className="border-b-2 border-slate-900 pb-2 break-inside-avoid page-break-inside-avoid">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
              ENTERPRISE HOSPITAL MANAGEMENT SYSTEM
            </h1>
            <p className="text-[11px] text-slate-700 font-semibold uppercase tracking-wide mt-0.5">
              DEPARTMENT OF CLINICAL SERVICES · OUTPATIENT CARE DIVISION
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Helpline: +91 40 6812 3456 · 24/7 Priority Emergency &amp; OPD Services · info@enterprise-hospital.org
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 text-[10px] font-bold bg-slate-100 border border-slate-400 text-slate-900 uppercase">
              NABH ACCREDITED HEALTHCARE
            </span>
            <div className="text-[12px] font-bold text-blue-900 mt-1 uppercase tracking-tight">
              Official Outpatient Journey Record
            </div>
            <p className="text-[9.5px] text-slate-500 mt-0.5">
              Generated: {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Structured Patient Demographics Table */}
      <div className="border border-slate-300 break-inside-avoid page-break-inside-avoid">
        <div className="bg-slate-900 text-white px-3 py-1 text-[10.5px] font-bold uppercase tracking-wide">
          Patient Identification &amp; Outpatient Credentials
        </div>
        <table className="w-full text-left border-collapse text-[10px]">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-28 bg-slate-50 px-2.5 py-1 font-bold text-slate-600">Patient Name:</td>
              <td className="px-2.5 py-1 font-bold text-slate-900">{liveEncounter.patientName} ({liveEncounter.age} yrs · {liveEncounter.sex})</td>
              <td className="w-32 bg-slate-50 px-2.5 py-1 font-bold text-slate-600">Permanent UMR:</td>
              <td className="px-2.5 py-1 font-mono font-bold text-blue-900">{liveEncounter.umr}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="bg-slate-50 px-2.5 py-1 font-bold text-slate-600">OP Number:</td>
              <td className="px-2.5 py-1 font-mono font-bold text-slate-900">{liveEncounter.opNumber}</td>
              <td className="bg-slate-50 px-2.5 py-1 font-bold text-slate-600">Queue Token:</td>
              <td className="px-2.5 py-1 font-mono font-bold text-emerald-800">#{liveEncounter.queueToken || liveEncounter.opNumber}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="bg-slate-50 px-2.5 py-1 font-bold text-slate-600">Attending Doctor:</td>
              <td className="px-2.5 py-1 font-bold text-slate-900">{activeDoctor}</td>
              <td className="bg-slate-50 px-2.5 py-1 font-bold text-slate-600">Department / OPD:</td>
              <td className="px-2.5 py-1 text-slate-900">{liveEncounter.dept} · Chamber {liveEncounter.room || "101"}</td>
            </tr>
            <tr>
              <td className="bg-slate-50 px-2.5 py-1 font-bold text-slate-600">Contact Mobile:</td>
              <td className="px-2.5 py-1 text-slate-800">{liveEncounter.phone}</td>
              <td className="bg-slate-50 px-2.5 py-1 font-bold text-slate-600">Care Status:</td>
              <td className="px-2.5 py-1 font-bold text-emerald-800">{liveEncounter.status} ({liveEncounter.isNew === false ? "Returning Revisit" : "New Registration"})</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. Section: Presenting Complaints & Clinical Triage */}
      <div className="border border-slate-300 break-inside-avoid page-break-inside-avoid">
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
          1. Presenting Complaints &amp; AI Clinical Triage
        </div>
        <div className="p-2 grid grid-cols-2 gap-3 text-[10px]">
          <div>
            <span className="font-bold text-slate-600 block text-[9px] uppercase">Chief Complaints:</span>
            <span className="text-slate-900 font-semibold">{liveEncounter.chiefComplaint || "General outpatient medical consultation."}</span>
          </div>
          <div>
            <span className="font-bold text-slate-600 block text-[9px] uppercase">Reported Symptoms:</span>
            <span className="text-slate-900">{liveEncounter.symptoms && liveEncounter.symptoms.length > 0 ? liveEncounter.symptoms.join(", ") : "None reported"}</span>
          </div>
        </div>
      </div>

      {/* 4. Section: Nurse Station Baseline Vital Signs */}
      <div className="border border-slate-300 break-inside-avoid page-break-inside-avoid">
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
          2. Baseline Vital Signs (Nurse Station Intake)
        </div>
        <table className="w-full text-center border-collapse text-[10px]">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[9px] uppercase">
            <tr>
              <th className="px-2 py-0.5">Blood Pressure</th>
              <th className="px-2 py-0.5">Heart Rate (Pulse)</th>
              <th className="px-2 py-0.5">Body Temp</th>
              <th className="px-2 py-0.5">SpO2 Oxygen</th>
              <th className="px-2 py-0.5">Body Weight</th>
            </tr>
          </thead>
          <tbody className="divide-x divide-slate-200">
            <tr className="font-mono font-bold text-slate-900">
              <td className="px-2 py-1">{liveEncounter.vitals?.bp || "--"} mmHg</td>
              <td className="px-2 py-1">{liveEncounter.vitals?.pulse ? `${liveEncounter.vitals.pulse} bpm` : "--"}</td>
              <td className="px-2 py-1">{liveEncounter.vitals?.temp ? `${liveEncounter.vitals.temp} °F` : "--"}</td>
              <td className="px-2 py-1">{liveEncounter.vitals?.spo2 ? `${liveEncounter.vitals.spo2}%` : "--"}</td>
              <td className="px-2 py-1">{liveEncounter.vitals?.weight ? `${liveEncounter.vitals.weight} kg` : "--"}</td>
            </tr>
          </tbody>
        </table>
        {liveEncounter.vitals?.notes && (
          <div className="px-2.5 py-1 bg-slate-50 border-t border-slate-200 text-[9.5px] text-slate-700">
            <strong>Nurse Observations:</strong> {liveEncounter.vitals.notes}
          </div>
        )}
      </div>

      {/* 5. Section: Physician Examination & Clinical Diagnosis */}
      <div className="border border-slate-300 break-inside-avoid page-break-inside-avoid">
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
          3. Physician Examination &amp; Clinical Assessment
        </div>
        <div className="p-2 space-y-1 text-[10px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-slate-600 block text-[9px] uppercase">Clinical Diagnosis:</span>
              <span className="text-slate-900 font-bold text-[11.5px]">{activeDiagnosis}</span>
            </div>
            {liveEncounter.icd10 && (
              <span className="font-mono text-[9.5px] font-bold bg-slate-100 border border-slate-300 px-2 py-0.5">
                ICD-10: {liveEncounter.icd10}
              </span>
            )}
          </div>
          <div className="border-t border-slate-200 pt-1">
            <span className="font-bold text-slate-600 block text-[9px] uppercase">Consultant Physician Advice &amp; Plan:</span>
            <p className="text-slate-800 mt-0.5 leading-relaxed">{activeAdvice}</p>
          </div>
        </div>
      </div>

      {/* 6. Section: Prescribed Medications (Rx Pad Table) */}
      <div className="border border-slate-300 break-inside-avoid page-break-inside-avoid">
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
          4. Prescribed Medications (Rx Pad)
        </div>
        {activePrescription.length > 0 ? (
          <table className="w-full text-left border-collapse text-[10px]">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[9px] uppercase">
              <tr>
                <th className="px-2 py-0.5 w-8">#</th>
                <th className="px-2 py-0.5">Medicine Name</th>
                <th className="px-2 py-0.5">Dosage</th>
                <th className="px-2 py-0.5">Frequency</th>
                <th className="px-2 py-0.5">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activePrescription.map((rx: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-2 py-1 font-mono text-slate-500">{idx + 1}</td>
                  <td className="px-2 py-1 font-bold text-slate-900">{rx.medicine || rx.name}</td>
                  <td className="px-2 py-1 text-slate-800">{rx.dosage || "-"}</td>
                  <td className="px-2 py-1 text-slate-800">{rx.frequency || "-"}</td>
                  <td className="px-2 py-1 text-slate-800">{rx.duration || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-2 text-slate-500 italic text-[10px]">
            No prescription medications recorded for this outpatient visit.
          </div>
        )}
      </div>

      {/* 7. Section: Diagnostic Investigations Ordered */}
      {activeInvestigations.length > 0 && (
        <div className="border border-slate-300 break-inside-avoid page-break-inside-avoid">
          <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
            5. Diagnostic Investigations Ordered
          </div>
          <div className="p-2 flex flex-wrap gap-1.5">
            {activeInvestigations.map((test: string, idx: number) => (
              <span key={idx} className="bg-slate-50 border border-slate-300 px-2 py-0.5 text-[9.5px] font-semibold text-slate-800">
                🔬 {test}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 8. Section: Outpatient Care Milestones Chronology Table */}
      <div className="border border-slate-300 break-inside-avoid page-break-inside-avoid">
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
          {activeInvestigations.length > 0 ? "6." : "5."} Outpatient Care Milestones Chronology
        </div>
        <table className="w-full text-left border-collapse text-[9.5px]">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase text-[8.5px]">
            <tr>
              <th className="px-2 py-0.5 w-8">#</th>
              <th className="px-2 py-0.5 w-40">Care Stage</th>
              <th className="px-2 py-0.5 w-28">Timestamp</th>
              <th className="px-2 py-0.5">Department &amp; Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {journeySteps(liveEncounter).map((s, idx) => (
              <tr key={idx}>
                <td className="px-2 py-0.5 font-mono text-slate-500">{idx + 1}</td>
                <td className="px-2 py-0.5 font-semibold text-slate-900">{s.label}</td>
                <td className="px-2 py-0.5 font-mono text-slate-600">{s.at || "Recorded"}</td>
                <td className="px-2 py-0.5 text-slate-700">{s.detail || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 9. Section: Official Billing Settlement Summary */}
      <div className="border border-slate-300 break-inside-avoid page-break-inside-avoid">
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1 text-[10px] font-bold text-slate-800 uppercase tracking-wide">
          {activeInvestigations.length > 0 ? "7." : "6."} Official Billing Settlement Summary
        </div>
        <div className="p-2 flex justify-between items-center text-[10px]">
          <div className="flex gap-4 text-slate-700">
            <span>Registration: <strong>₹{regFee}.00</strong></span>
            <span>Consultation: <strong>₹{consultFee}.00</strong></span>
            {labFee > 0 && <span>Diagnostics: <strong>₹{labFee}.00</strong></span>}
          </div>
          <div className="font-bold text-[10.5px] text-slate-900">
            Official Settlement Total: <span className="font-mono text-emerald-800">₹{totalSettlement}.00</span> ({billStatus})
          </div>
        </div>
      </div>

      {/* 10. Electronic Verification & Physician Attestation Block */}
      <div className="pt-1.5 border-t-2 border-slate-900 break-inside-avoid page-break-inside-avoid">
        <div className="grid grid-cols-2 gap-3 text-[9.5px]">
          <div className="border border-slate-300 p-2 bg-slate-50">
            <span className="font-bold uppercase tracking-wider text-slate-700 block text-[9px]">
              Electronic Verification &amp; Attestation
            </span>
            <p className="text-slate-600 mt-0.5 leading-tight text-[9px]">
              Digitally verified from Enterprise Hospital Information System (HIS).
              Clinical parameters authenticated against certified attending practitioner entries.
            </p>
            <div className="mt-1.5 text-[8px] font-mono text-slate-500 border-t border-slate-200 pt-0.5">
              Audit Ref: OP-{liveEncounter.opNumber}-{liveEncounter.umr} · Generated: {new Date().toLocaleString("en-IN")}
            </div>
          </div>

          <div className="border border-slate-300 p-2 flex flex-col justify-between">
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-700 block text-[9px]">
                Attending Physician / Clinical Desk
              </span>
              <p className="text-slate-900 font-bold mt-0.5 text-[10.5px]">
                {activeDoctor}
              </p>
              <p className="text-slate-500 text-[8.5px]">
                {liveEncounter.dept} · Chamber {liveEncounter.room || "OPD"}
              </p>
            </div>
            <div className="mt-2 pt-1 border-t border-dashed border-slate-400 flex justify-between items-center text-[8px] text-slate-500">
              <span>Authorized Signatory &amp; Stamp</span>
              <span className="font-mono">NABH Accr. #HIS-CARE-2026</span>
            </div>
          </div>
        </div>

        <div className="mt-1.5 text-center text-[7.5px] text-slate-500 border-t border-slate-200 pt-0.5">
          Enterprise Hospital Management System · 24/7 Outpatient &amp; Emergency Helpline: +91 40 6812 3456 · Strictly Confidential Medical Document
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Interactive On-Screen Journey Modal (Hidden on Print) ── */}
      <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in overflow-y-auto print:hidden">
        <div className="bg-white border-2 border-[#CBD5E1] rounded-none shadow-2xl max-w-3xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
        <div className="px-6 py-4 bg-[#0F172A] text-white flex justify-between items-center flex-shrink-0 border-b border-slate-800 print:hidden">
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
                  {liveEncounter.opNumber}
                </span>
              </div>
              <p className="text-[12px] text-slate-300">
                Outpatient care trajectory & past consultation data for
                permanent UMR:{" "}
                <strong className="text-white font-mono">
                  {liveEncounter.umr}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <SendToPatientButton
              label="Send journey"
              kind="patient_journey"
              patient={{
                name: liveEncounter.patientName,
                phone: liveEncounter.phone,
                email: (liveEncounter as any).email || (liveEncounter as any).patientEmail,
                id: liveEncounter.umr,
                encounterId: liveEncounter.id,
              }}
              vars={journeyMessageVars(liveEncounter)}
              documentLabel={`Visit journey ${liveEncounter.opNumber}`}
              buildDocument={buildCurrentJourneyDoc}
              className="px-3 py-1.5 text-[12px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 cursor-pointer shadow-xs rounded-none transition-colors"
            />
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Patient Credentials Bar */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] flex-shrink-0 print:hidden">
          <div>
            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
              Patient Name
            </span>
            <span className="font-bold text-gray-900 text-[13.5px]">
              {liveEncounter.patientName}
            </span>
            <span className="text-[11px] text-[#64748B] block">
              {liveEncounter.age} yrs · {liveEncounter.sex}
            </span>
          </div>

          <div>
            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
              Permanent UMR (Lifetime)
            </span>
            <span className="font-mono font-bold text-[#1B4FD8] text-[13px] bg-blue-50 px-2 py-0.5 rounded-none border border-blue-200 inline-block mt-0.5">
              {liveEncounter.umr}
            </span>
            <span className="text-[11px] text-gray-500 block mt-0.5">
              {liveEncounter.phone}
            </span>
          </div>

          <div>
            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
              Department & Doctor
            </span>
            <span className="font-semibold text-gray-900 block">
              {liveEncounter.dept}
            </span>
            <span className="text-[11px] text-gray-600 block">
              {liveEncounter.assignedDoctor || "Attending Physician"} ·{" "}
              {liveEncounter.room || "Room 101"}
            </span>
          </div>

          <div>
            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
              Care Status & History
            </span>
            <span className="font-bold text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-none border border-emerald-200 inline-block text-[11px]">
              {liveEncounter.status}
            </span>
            <span className="text-[11px] font-mono font-bold text-gray-700 block mt-0.5">
              {previousEncounters.length} Past OP Consultations
            </span>
          </div>
        </div>

        {/* Navigation Switcher Tabs */}
        <div className="bg-white border-b border-[#CBD5E1] px-6 py-2 flex items-center gap-2 flex-shrink-0 print:hidden">
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6 print:hidden">
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
                      {liveEncounter.timestamps?.arrival ||
                        liveEncounter.registrationTime ||
                        "Arrival Recorded"}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-700">
                    Patient arrived at Outpatient Reception Desk. Walk-in token
                    initialized.
                  </p>
                  <div className="text-[11px] text-[#64748B] bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0]">
                    Token ID:{" "}
                    <strong>
                      {liveEncounter.queueToken || liveEncounter.opNumber}
                    </strong>{" "}
                    · Type:{" "}
                    <strong>
                      {liveEncounter.isNew
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
                      {liveEncounter.timestamps?.registration ||
                        liveEncounter.registrationTime ||
                        "Registration Recorded"}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-700">
                    Demographic credentials verified against permanent master
                    database. Lifetime <strong>{liveEncounter.umr}</strong> linked
                    with today's OP visit number{" "}
                    <strong>{liveEncounter.opNumber}</strong>.
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-gray-600">
                    <span>✓ Official OP Pass Issued</span>
                    <span>•</span>
                    <span>Contact: {liveEncounter.phone}</span>
                    <span>•</span>
                    <span>Address: {liveEncounter.address || "Main City"}</span>
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
                      {liveEncounter.timestamps?.symptoms || liveEncounter.timestamps?.arrival || "Captured"}
                    </span>
                  </div>
                  <div className="bg-[#F8FAFC] p-2.5 rounded-none border border-[#E2E8F0] text-[12px]">
                    <span className="font-bold text-[#64748B] block text-[10.5px] uppercase">
                      Presenting Chief Complaints:
                    </span>
                    <span className="text-gray-900 font-medium">
                      {liveEncounter.chiefComplaint ||
                        (liveEncounter.symptoms && liveEncounter.symptoms.length > 0
                          ? liveEncounter.symptoms.join(", ")
                          : "General outpatient evaluation requested.")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11.5px] flex-wrap">
                    <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-none border border-purple-200">
                      AI Specialty: {liveEncounter.aiSpecialty || liveEncounter.dept} {liveEncounter.aiConfidence ? `(${liveEncounter.aiConfidence}%)` : ""}
                    </span>
                    <span className="text-[#64748B]">
                      Assigned to:{" "}
                      <strong>{liveEncounter.assignedDoctor || "Physician Triage"}</strong>
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
                      {liveEncounter.timestamps?.vitalsRecorded || (liveEncounter.vitals?.bp ? "Vitals Recorded" : "Pending Vitals")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11.5px]">
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Blood Pressure
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {liveEncounter.vitals?.bp || "--"}
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Heart Rate
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {liveEncounter.vitals?.pulse ? `${liveEncounter.vitals.pulse} bpm` : "--"}
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Temperature
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {liveEncounter.vitals?.temp ? `${liveEncounter.vitals.temp} °F` : "--"}
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        SpO2 Oxygen
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {liveEncounter.vitals?.spo2 ? `${liveEncounter.vitals.spo2}%` : "--"}
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0] text-center">
                      <span className="text-[#64748B] block text-[10px] uppercase font-bold">
                        Body Weight
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-[13px]">
                        {liveEncounter.vitals?.weight ? `${liveEncounter.vitals.weight} kg` : "--"}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11.5px] text-[#166534] bg-[#F0FDF4] p-2 rounded-none border border-emerald-200">
                    👩‍⚕️ <strong>Nurse Assessment:</strong>{" "}
                    {liveEncounter.vitals?.notes ||
                      (liveEncounter.vitals?.bp ? "Baseline physiological vitals recorded." : "Vitals assessment pending at nurse station.")}
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
                      {liveEncounter.timestamps?.doctorAssigned || (liveEncounter.assignedDoctor ? "Assigned" : "Pending Queue")}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-700">
                    Allocated to{" "}
                    <strong>
                      {liveEncounter.assignedDoctor || "Attending Physician Triage"}
                    </strong>{" "}
                    in <strong>{liveEncounter.room || "Consultation Room"}</strong> with token{" "}
                    <strong>
                      #{liveEncounter.queueToken || liveEncounter.opNumber}
                    </strong>
                    .
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
                      <span>🩺</span> Physician Examination & Live Prescription (Rx)
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded-none border border-blue-200">
                      {liveEncounter.timestamps?.consultationStart
                        ? `${liveEncounter.timestamps.consultationStart} ${liveEncounter.timestamps?.consultationEnd ? `— ${liveEncounter.timestamps.consultationEnd}` : ""}`
                        : (liveEncounter.diagnosis ? "Consultation Recorded" : "Under Evaluation / Pending")}
                    </span>
                  </div>

                  {(() => {
                    const activePrescription =
                      liveEncounter.prescription && liveEncounter.prescription.length > 0
                        ? liveEncounter.prescription
                        : currentConsult?.medications && currentConsult.medications.length > 0
                          ? currentConsult.medications.map((m) => ({
                              medicine: m.name || (m as any).medicine,
                              dosage: m.dosage || "-",
                              frequency: m.frequency || "-",
                              duration: m.duration || "-",
                            }))
                          : []

                    const activeInvestigations =
                      liveEncounter.investigations && liveEncounter.investigations.length > 0
                        ? liveEncounter.investigations
                        : currentConsult?.labTests && currentConsult.labTests.length > 0
                          ? currentConsult.labTests.map((t) => t.name || (t as any).testName)
                          : []

                    const activeDiagnosis = liveEncounter.diagnosis || currentConsult?.diagnosis
                    const activeAdvice = liveEncounter.advice || currentConsult?.advice || currentConsult?.summary

                    return (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                          <div className="bg-[#F8FAFC] p-2.5 rounded-none border border-[#E2E8F0]">
                            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
                              Clinical Diagnosis
                            </span>
                            <span className="font-bold text-gray-900 block mt-0.5">
                              {activeDiagnosis || "Pending Physician Diagnosis"}
                            </span>
                            {liveEncounter.icd10 && (
                              <span className="text-[11px] font-mono text-[#1B4FD8]">
                                ICD-10: {liveEncounter.icd10}
                              </span>
                            )}
                          </div>

                          <div className="bg-[#F8FAFC] p-2.5 rounded-none border border-[#E2E8F0]">
                            <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">
                              Diagnostic Investigations
                            </span>
                            <span className="font-medium text-gray-800 block mt-0.5">
                              {activeInvestigations.length > 0
                                ? activeInvestigations.join(", ")
                                : "No diagnostic tests ordered."}
                            </span>
                          </div>
                        </div>

                        {/* Prescribed Medications Pad */}
                        <div className="space-y-1 text-[12px]">
                          <span className="text-[11px] uppercase font-bold text-[#64748B] block">
                            Prescribed Medications (Rx):
                          </span>
                          {activePrescription.length > 0 ? (
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
                                  {activePrescription.map((rx: any, i: number) => (
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
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-[12px] text-gray-500 italic bg-[#F8FAFC] p-2 border border-[#E2E8F0]">
                              No medications prescribed for this encounter.
                            </div>
                          )}
                        </div>

                        <div className="text-[11.5px] text-gray-700 bg-[#F8FAFC] p-2 rounded-none border border-[#E2E8F0]">
                          <strong>Doctor Advice:</strong>{" "}
                          {activeAdvice || "No specific advice recorded yet."}
                        </div>
                      </>
                    )
                  })()}
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
                      {liveEncounter.timestamps?.billingCompleted || (liveEncounter.billing?.status === 'Paid' ? 'Settled' : 'Pending')}
                    </span>
                  </div>

                  <div className="bg-[#F8FAFC] p-3 rounded-none border border-[#E2E8F0] space-y-1.5 text-[12px]">
                    {(() => {
                      const regFee = liveEncounter.billing?.registrationFee ?? (liveEncounter.isNew === false ? 0 : 20)
                      const consultFee = liveEncounter.billing?.consultationFee ?? 500
                      const labFee = liveEncounter.billing?.labFee || 0
                      const grandTotal = liveEncounter.billing?.total || (regFee + consultFee + labFee)
                      return (
                        <>
                          <div className="flex justify-between text-gray-700">
                            <span>1. Patient Registration Fee {liveEncounter.isNew === false || regFee === 0 ? "(Existing Patient)" : ""}</span>
                            <span className="font-mono font-bold text-gray-900">₹{regFee}.00</span>
                          </div>
                          <div className="flex justify-between text-gray-700">
                            <span>2. Physician Outpatient Consultation Fee {liveEncounter.assignedDoctor ? `(${liveEncounter.assignedDoctor})` : ""}</span>
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
                            <span className="font-mono text-emerald-700">₹{grandTotal}.00 (Status: {liveEncounter.billing?.status || 'Paid'})</span>
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
                      <span>💊</span> Pharmacy Dispensing & Visit Status
                    </div>
                    <span className="font-mono text-[11.5px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-none border border-cyan-200">
                      {liveEncounter.timestamps?.visitCompleted || liveEncounter.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-700">
                    {liveEncounter.prescription && liveEncounter.prescription.length > 0
                      ? "Prescriptions routed to outpatient pharmacy queue."
                      : "Outpatient visit recorded in hospital system."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIOUS CONSULTATION DATA (OUTPATIENT CLINICAL HISTORY) */}
        {activeTab === "previous_consultations" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 print:hidden">
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
        <div className="px-6 py-3.5 bg-slate-50 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 print:hidden">
          <div className="text-[11.5px] text-[#64748B]">
            Permanent UMR: <strong>{encounter.umr}</strong> · Visit:{" "}
            <strong>{encounter.opNumber}</strong>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white text-[12px] font-bold rounded-none shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              title="Print clean structured journey record (or Save as PDF)"
            >
              🖨️ Print Journey
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

    {/* ── Dedicated Structured Clinical Print Sheet (Portalled to document.body) ── */}
    {typeof document !== "undefined" && createPortal(printSheet, document.body)}
  </>
)
}
