import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FiActivity, FiArrowLeft, FiClipboard, FiMic, FiPlus, FiSearch, FiSquare, FiTarget, FiUser } from "react-icons/fi";
import { Btn, Card, StatusBadge, TabBar, Table, TD, TimelineItem, TR } from "./shared";
import { apiFetch, getCsrfToken, getHospitalCode, reportError } from "../lib/api";
import { API_BASE } from "../lib/constants";
import { formatDateTimeIST } from "../lib/format";
import type { Notice, Patient } from "../types";

// apiFetch always sends Content-Type: application/json, which breaks a
// multipart upload -- same reasoning as ErPage.tsx's uploadConsentDocument,
// this needs a raw fetch instead.
// Whisper's ISO-639-1 codes for the languages this hospital's staff
// realistically dictate in -- pinning one (see PatientChart.tsx's earlier
// WHISPER_DEFAULT_LANGUAGE note) beats auto-detection on a short clip, but
// only if the doctor can actually pick the language they're speaking.
const TRANSCRIPTION_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "ur", label: "Urdu" },
];

async function transcribeAudio(blob: Blob, language: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");
  formData.append("language", language);
  const csrfToken = getCsrfToken();
  const response = await fetch(`${API_BASE}/api/ai/transcribe`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Hospital-Code": getHospitalCode(),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Failed to transcribe the recording.");
  }
  return payload.text || "";
}

// Saves the raw recording itself (not just the transcript) as a real
// document on the patient's chart, via the same generic document-upload
// endpoint every other file (prescriptions, scans, consent forms) already
// uses -- so it shows up on the Documents tab and is played back through
// the existing GET /api/documents/<id>/file route, no new storage path needed.
async function uploadAudioDocument(
  patientId: string,
  blob: Blob,
  transcript: string,
  admissionId?: number,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", blob, "clinical-recording.webm");
  formData.append("doc_type", "clinical_audio_note");
  formData.append("ocr_text", transcript);
  if (admissionId) formData.append("admission_id", String(admissionId));
  const csrfToken = getCsrfToken();
  const response = await fetch(`${API_BASE}/api/patients/${patientId}/documents`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Hospital-Code": getHospitalCode(),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: formData,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to save the audio recording.");
  }
}

// ==================== Directory (search across OP / IP / ER / ICU) ====================

type CareStream = "OP" | "IP" | "ER";

type PatientRow = {
  patient_id: string;
  name: string;
  last_name?: string | null;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  care_stream: CareStream;
  active_bed?: string | null;
  active_er_visit_id?: number | null;
  active_er_visit_no?: string | null;
  active_er_status?: string | null;
  er_triage_category?: string | null;
  appointment_status?: string | null;
  appointment_doctor?: string | null;
  appointment_dept?: string | null;
};

type StreamCounts = { all: number; op: number; ip: number; er: number };

type CareFilter = "all" | "op" | "ip" | "icu" | "er";

function rowDisplayName(row: PatientRow): string {
  return `${row.name || ""} ${row.last_name || ""}`.trim() || row.patient_id;
}

function isIcuBed(activeBed?: string | null): boolean {
  return !!activeBed && activeBed.toLowerCase().includes("icu");
}

// A patient's current location badge -- ER (with triage) takes priority over
// IP (the backend's own care_stream computation already does the same), IP
// shows the ward/bed (ICU included, since ICU is just a ward, not its own
// encounter type), and OP shows their last appointment status.
function LocationBadge({ row }: { row: PatientRow }) {
  if (row.care_stream === "ER") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEE2E2] text-[#B91C1C]">
        ER {row.active_er_visit_no ? `· ${row.active_er_visit_no}` : ""}
        {row.er_triage_category ? ` · ${row.er_triage_category}` : ""}
      </span>
    );
  }
  if (row.care_stream === "IP") {
    const icu = isIcuBed(row.active_bed);
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
          icu ? "bg-[#EDE9FE] text-[#5B21B6]" : "bg-[#EFF6FF] text-[#1E40AF]"
        }`}
      >
        {icu ? "ICU" : "IP"} {row.active_bed ? `· ${row.active_bed}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F5F9] text-[#334155]">
      OP {row.appointment_dept ? `· ${row.appointment_dept}` : ""}
    </span>
  );
}

function PatientDirectory({
  onSelect,
  onBack,
  setNotice,
}: {
  onSelect: (row: PatientRow) => void;
  onBack: () => void;
  setNotice: (notice: Notice | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [careFilter, setCareFilter] = useState<CareFilter>("all");
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [counts, setCounts] = useState<StreamCounts>({ all: 0, op: 0, ip: 0, er: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const careType = careFilter === "icu" ? "ip" : careFilter;
        const qs = new URLSearchParams();
        if (query.trim()) qs.set("q", query.trim());
        if (careType !== "all") qs.set("care_type", careType);
        const data = await apiFetch<{ patients: PatientRow[]; counts: StreamCounts }>(
          `/api/patients${qs.toString() ? `?${qs.toString()}` : ""}`,
        );
        const patients = data.patients || [];
        setRows(careFilter === "icu" ? patients.filter((p) => isIcuBed(p.active_bed)) : patients);
        setCounts(data.counts || { all: 0, op: 0, ip: 0, er: 0 });
      } catch (error: any) {
        reportError(setNotice, error, "Failed to load patients.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [query, careFilter]);

  const icuCount = useMemo(
    () => (careFilter === "icu" ? rows.length : undefined),
    [careFilter, rows],
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5] p-5">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Clinical — Patient Directory</h1>
            <p className="text-[11.5px] text-[#64748B]">
              Every patient across every department &mdash; OP, IP, ICU, and ER &mdash; in one place.
            </p>
          </div>
          <Btn variant="ghost" size="sm" onClick={onBack}>
            <FiArrowLeft aria-hidden /> Back
          </Btn>
        </div>

        <div className="ai-search-bar mb-3">
          <FiSearch className="ai-search-icon" aria-hidden />
          <input
            className="ai-search-input"
            placeholder="Search by name, patient ID, or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {(
            [
              { key: "all", label: "All", count: counts.all },
              { key: "op", label: "OP", count: counts.op },
              { key: "ip", label: "IP", count: counts.ip },
              { key: "icu", label: "ICU", count: icuCount },
              { key: "er", label: "ER", count: counts.er },
            ] as { key: CareFilter; label: string; count?: number }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setCareFilter(f.key)}
              className={`px-3.5 py-1.5 text-[12px] font-semibold rounded-full border transition-colors ${
                careFilter === f.key
                  ? "bg-[#1B4FD8] text-white border-[#1B4FD8]"
                  : "bg-white text-[#64748B] border-[#DDE2EC] hover:border-[#94A3B8]"
              }`}
            >
              {f.label}
              {f.count !== undefined && <span className="ml-1.5 opacity-80">({f.count})</span>}
            </button>
          ))}
        </div>

        <div className="bg-white border border-[#DDE2EC] rounded">
          {loading ? (
            <p className="text-[12.5px] text-[#64748B] p-4">Loading patients...</p>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[13px] font-semibold text-gray-800">No patients found</p>
              <p className="text-[12px] text-[#64748B] mt-1">
                {query ? "Try a different search term." : "No patients in this category yet."}
              </p>
            </div>
          ) : (
            <Table headers={["Patient", "Age / Gender", "Location", "Doctor", ""]}>
              {rows.map((row) => (
                <TR key={row.patient_id} onClick={() => onSelect(row)}>
                  <TD>
                    <div className="font-medium text-gray-900">{rowDisplayName(row)}</div>
                    <div className="text-[11px] text-[#94A3B8] font-mono">{row.patient_id}</div>
                  </TD>
                  <TD>
                    <span className="text-[12px] text-[#64748B]">
                      {row.age ? `${row.age}y` : "—"}{row.gender ? ` · ${row.gender}` : ""}
                    </span>
                  </TD>
                  <TD><LocationBadge row={row} /></TD>
                  <TD>
                    <span className="text-[12px] text-[#64748B]">
                      {row.care_stream === "OP" ? row.appointment_doctor || "—" : "—"}
                    </span>
                  </TD>
                  <TD>
                    <Btn variant="ghost" size="xs">Open Chart</Btn>
                  </TD>
                </TR>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Chart (real EMR data for one patient) ====================

type ClinicalNoteRow = { id: number; chief_complaint?: string | null; notes?: string | null; follow_up?: string | null; created_at: string };
type ObservationNoteRow = { id: number; doctor_name?: string | null; note: string; treatment_plan?: string | null; created_at: string; role?: string | null };
type PatientVitalRow = { id: number; bp?: string | null; pulse?: string | null; temperature?: string | null; created_at: string };
type DiagnosisRow = { id: number; diagnosis_name: string; created_at: string };
type AdmissionRow = { id: number; admission_date: string; discharge_date?: string | null; notes?: string | null };
type MedicationScheduleRow = { id: number; medicine_name: string; dosage?: string | null; schedule_time: string; administered?: number | boolean; notes?: string | null };
type LabRow = { id: number; test_name: string; amount?: number; status?: string; doctor_name?: string | null; created_at: string };
type JourneyEvent = { stage: string; label: string; timestamp?: string | null; detail?: Record<string, unknown> };
type PrescriptionRow = { prescription_id: number; medicine_name: string; dosage?: string | null; quantity?: number | null; unit_price?: number | null; status?: string | null; created_at: string; fulfilled_at?: string | null };
type DocumentRow = { id: number; doc_type: string; file_name?: string | null; mime_type?: string | null; created_at: string; ocr_text?: string | null; has_ocr_text?: boolean };
type InvoiceRow = { id: number; invoice_no: string; module: string; total_amount: number; paid_amount: number; due_amount: number; payment_status: string; created_at: string };
type InvoicePaymentRow = { id: number; invoice_id: number; amount: number; payment_mode: string; created_at: string };
type InsuranceClaimRow = { id: number; invoice_id: number; insurer_name: string; claim_amount: number; approved_amount: number; claim_status: string; submitted_at: string };
type CertificateRow = { id: number; certificate_type: string; title: string; body: string; issued_by?: string | null; created_at: string };

type EmrResponse = {
  patient: Patient;
  admissions: AdmissionRow[];
  notes: ClinicalNoteRow[];
  vitals: PatientVitalRow[];
  diagnoses: DiagnosisRow[];
  observation_notes: ObservationNoteRow[];
  medication_schedules: MedicationScheduleRow[];
  prescriptions: PrescriptionRow[];
  labs: LabRow[];
  documents: DocumentRow[];
  invoices: InvoiceRow[];
  invoice_payments: InvoicePaymentRow[];
  insurance_claims: InsuranceClaimRow[];
  certificates: CertificateRow[];
  timeline: JourneyEvent[];
};

type ErVisitDetail = {
  id: number;
  visit_no: string;
  assigned_doctor_name?: string | null;
  assigned_specialty?: string | null;
  complaints: { id: number; complaint: string; created_at: string }[];
  vitals: { id: number; heart_rate?: number | null; bp_systolic?: number | null; bp_diastolic?: number | null; spo2?: number | null; recorded_at: string }[];
  clinical_notes: { id: number; note_type: string; content: string; created_at: string }[];
  treatments: { id: number; intervention_type: string; description?: string | null; performed_at: string }[];
};

type DayEntry = {
  date: string;
  time: string;
  type: string;
  title: string;
  body: string;
  extra?: string;
};

function dateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

// Merges every source of "what happened to this patient" -- OP/IP clinical
// notes, observation/treatment-plan entries, vitals, diagnoses, and (when the
// patient has an active ER visit) the ER's own complaints/vitals/notes/
// treatments -- into one day-grouped feed. This is the actual "day to day
// evaluations and day-wise treatment" view; every other tab is a narrower
// slice of the same underlying data.
function buildDayGroups(emr: EmrResponse, erDetail: ErVisitDetail | null): Map<string, DayEntry[]> {
  const entries: DayEntry[] = [];

  for (const n of emr.notes) {
    entries.push({
      date: dateKey(n.created_at),
      time: n.created_at,
      type: "Clinical Note",
      title: n.chief_complaint || "Clinical Note",
      body: n.notes || "",
      extra: n.follow_up ? `Follow-up: ${n.follow_up}` : undefined,
    });
  }
  for (const o of emr.observation_notes) {
    const roleLabel = o.role === "nurse" ? "Nurse Note" : o.role === "doctor" ? "Doctor Note" : "Evaluation & Treatment";
    entries.push({
      date: dateKey(o.created_at),
      time: o.created_at,
      type: roleLabel,
      title: o.doctor_name || (o.role === "nurse" ? "Nurse" : "Observation"),
      body: o.note,
      extra: o.treatment_plan ? `Treatment plan: ${o.treatment_plan}` : undefined,
    });
  }
  for (const v of emr.vitals) {
    entries.push({
      date: dateKey(v.created_at),
      time: v.created_at,
      type: "Vitals",
      title: "Vitals recorded",
      body: [v.bp && `BP ${v.bp}`, v.pulse && `Pulse ${v.pulse}`, v.temperature && `Temp ${v.temperature}`]
        .filter(Boolean)
        .join(" · ") || "No values recorded",
    });
  }
  for (const d of emr.diagnoses) {
    entries.push({
      date: dateKey(d.created_at),
      time: d.created_at,
      type: "Diagnosis",
      title: d.diagnosis_name,
      body: "",
    });
  }

  if (erDetail) {
    for (const c of erDetail.complaints) {
      entries.push({ date: dateKey(c.created_at), time: c.created_at, type: "ER Complaint", title: "Chief complaint", body: c.complaint });
    }
    for (const v of erDetail.vitals) {
      entries.push({
        date: dateKey(v.recorded_at),
        time: v.recorded_at,
        type: "Vitals",
        title: "ER vitals recorded",
        body: [
          v.heart_rate != null && `HR ${v.heart_rate}`,
          v.bp_systolic != null && v.bp_diastolic != null && `BP ${v.bp_systolic}/${v.bp_diastolic}`,
          v.spo2 != null && `SpO2 ${v.spo2}%`,
        ]
          .filter(Boolean)
          .join(" · ") || "No values recorded",
      });
    }
    for (const n of erDetail.clinical_notes) {
      entries.push({ date: dateKey(n.created_at), time: n.created_at, type: "ER Note", title: n.note_type, body: n.content });
    }
    for (const t of erDetail.treatments) {
      entries.push({
        date: dateKey(t.performed_at),
        time: t.performed_at,
        type: "Treatment",
        title: t.intervention_type,
        body: t.description || "",
      });
    }
  }

  entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const groups = new Map<string, DayEntry[]>();
  for (const e of entries) {
    if (!groups.has(e.date)) groups.set(e.date, []);
    groups.get(e.date)!.push(e);
  }
  return groups;
}

// Every real doctor name on record for this patient -- OP appointment,
// ER assignment, and whoever's logged an evaluation -- deduplicated by name.
// There's no separate "care team" table, so this is the closest honest
// substitute: who has actually been involved, per the data that exists.
function buildCareTeam(row: PatientRow, emr: EmrResponse, erDetail: ErVisitDetail | null): { name: string; role: string }[] {
  const seen = new Set<string>();
  const team: { name: string; role: string }[] = [];
  const add = (name: string | null | undefined, role: string) => {
    const trimmed = (name || "").trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    team.push({ name: trimmed, role });
  };
  add(row.appointment_doctor, "OP Consultation");
  add(erDetail?.assigned_doctor_name, erDetail?.assigned_specialty ? `ER · ${erDetail.assigned_specialty}` : "ER");
  for (const o of emr.observation_notes) {
    add(o.doctor_name, o.role === "nurse" ? "Nurse Note" : o.role === "doctor" ? "Doctor Note" : "Evaluation");
  }
  return team;
}

const ENTRY_TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  "Clinical Note": { bg: "#EFF6FF", text: "#1E40AF" },
  "Doctor Note": { bg: "#F0FDF4", text: "#15803D" },
  "Nurse Note": { bg: "#FFF7ED", text: "#C2410C" },
  "Evaluation & Treatment": { bg: "#F0FDF4", text: "#15803D" },
  Vitals: { bg: "#FDF4FF", text: "#86198F" },
  Diagnosis: { bg: "#FFFBEB", text: "#92400E" },
  "ER Complaint": { bg: "#FEF2F2", text: "#B91C1C" },
  "ER Note": { bg: "#FEF2F2", text: "#B91C1C" },
  Treatment: { bg: "#ECFEFF", text: "#0E7490" },
};

const CHART_TABS = ["Summary", "Day-wise", "Timeline", "Problems", "Medications", "Allergies", "Vitals", "Labs", "Documents", "Billing"];

export default function PatientChart({
  onBack,
  setNotice,
  initialPatientId,
  onConsumeInitialPatient,
}: {
  onBack: () => void;
  setNotice: (notice: Notice | null) => void;
  // Set by another page (e.g. clicking a patient's name in Bed Management)
  // to jump straight into that patient's chart instead of landing on the
  // directory -- consumed once so navigating away and back doesn't re-fire.
  initialPatientId?: string | null;
  onConsumeInitialPatient?: () => void;
}) {
  const [selectedRow, setSelectedRow] = useState<PatientRow | null>(null);
  const [emr, setEmr] = useState<EmrResponse | null>(null);
  const [erDetail, setErDetail] = useState<ErVisitDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("Summary");
  const [addOpen, setAddOpen] = useState(false);
  const [expandedCertId, setExpandedCertId] = useState<number | null>(null);

  const loadPatient = async (row: PatientRow) => {
    setLoading(true);
    setTab("Summary");
    try {
      const [emrData, erData] = await Promise.all([
        apiFetch<EmrResponse>(`/api/emr/${row.patient_id}`),
        row.active_er_visit_id
          ? apiFetch<ErVisitDetail>(`/api/er/visits/${row.active_er_visit_id}`).catch(() => null)
          : Promise.resolve(null),
      ]);
      setEmr(emrData);
      setErDetail(erData);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to load this patient's record.");
      setEmr(null);
    } finally {
      setLoading(false);
    }
  };

  const backToDirectory = () => {
    setSelectedRow(null);
    setEmr(null);
    setErDetail(null);
  };

  useEffect(() => {
    if (!initialPatientId) return;
    (async () => {
      try {
        const data = await apiFetch<{ patients: PatientRow[] }>(
          `/api/patients?q=${encodeURIComponent(initialPatientId)}`,
        );
        const row = (data.patients || []).find((p) => p.patient_id === initialPatientId);
        if (row) {
          setSelectedRow(row);
          void loadPatient(row);
        } else {
          reportError(setNotice, undefined, "Could not find that patient.");
        }
      } catch (error: any) {
        reportError(setNotice, error, "Failed to open that patient's chart.");
      } finally {
        onConsumeInitialPatient?.();
      }
    })();
    // Only re-run when a *new* patient id is handed in -- onConsumeInitialPatient
    // clears it right after, so this never loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPatientId]);

  if (!selectedRow) {
    return (
      <PatientDirectory
        onSelect={(row) => {
          setSelectedRow(row);
          void loadPatient(row);
        }}
        onBack={onBack}
        setNotice={setNotice}
      />
    );
  }

  const dayGroups = emr ? buildDayGroups(emr, erDetail) : new Map<string, DayEntry[]>();
  const sortedDates = Array.from(dayGroups.keys()).sort((a, b) => (a < b ? 1 : -1));
  const patient = emr?.patient;
  const careTeam = emr ? buildCareTeam(selectedRow, emr, erDetail) : [];
  const latestAdmission = emr?.admissions[0];
  const latestInsurance = emr?.insurance_claims[0];
  const allergyList = (patient?.allergies || "").split(",").map((a) => a.trim()).filter(Boolean);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Patient Banner */}
      <div className="bg-white border-b border-[#DDE2EC] px-5 py-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <button
              onClick={backToDirectory}
              className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:bg-[#E2E8F0] flex-shrink-0"
              title="All Patients"
            >
              <FiArrowLeft aria-hidden />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#1B4FD8] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              <FiUser aria-hidden />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-semibold text-gray-900">{rowDisplayName(selectedRow)}</span>
                {patient?.allergies && (
                  <span className="bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-semibold px-2 py-0.5 rounded border border-[#FECACA]">
                    ⚠ Allergy: {patient.allergies}
                  </span>
                )}
                <LocationBadge row={selectedRow} />
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11.5px] text-[#64748B] flex-wrap">
                <span className="font-mono text-[#374151]">{selectedRow.patient_id}</span>
                {selectedRow.age && <span>{selectedRow.age}y · {selectedRow.gender || "—"}</span>}
                {selectedRow.phone && <span>{selectedRow.phone}</span>}
                {patient?.blood_group && <span>Blood: {patient.blood_group}</span>}
              </div>
            </div>
          </div>
          <Btn variant="primary" size="xs" onClick={() => setAddOpen(true)}>
            <FiPlus aria-hidden /> Add Evaluation
          </Btn>
        </div>
      </div>

      <TabBar tabs={CHART_TABS} active={tab} onChange={setTab} />

      <div className="flex-1 overflow-y-auto bg-[#F0F2F5] p-5">
        {loading || !emr ? (
          <p className="text-[12.5px] text-[#64748B]">Loading patient record...</p>
        ) : (
          <>
            {tab === "Summary" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card title="Active Problems">
                      {emr.diagnoses.length === 0 ? (
                        <p className="text-[12px] text-[#94A3B8]">No diagnoses recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {emr.diagnoses.slice(0, 5).map((p) => (
                            <div key={p.id} className="flex items-start gap-2 py-1 border-b border-[#F1F5F9] last:border-0">
                              <span className="text-[12.5px] text-gray-800">{p.diagnosis_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                    <Card title="Allergies">
                      {allergyList.length === 0 ? (
                        <p className="text-[12px] text-[#94A3B8]">No known allergies on file.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {allergyList.map((a) => (
                            <span key={a} className="bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-semibold px-2 py-0.5 rounded border border-[#FECACA]">
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card title="Current Medications">
                      {emr.medication_schedules.length === 0 ? (
                        <p className="text-[12px] text-[#94A3B8]">No medications scheduled.</p>
                      ) : (
                        <div className="space-y-1">
                          {emr.medication_schedules.slice(0, 5).map((m) => (
                            <div key={m.id} className="flex items-center justify-between py-1 border-b border-[#F1F5F9] last:border-0">
                              <div>
                                <div className="text-[12.5px] font-medium text-gray-800">{m.medicine_name}</div>
                                <div className="text-[11px] text-[#64748B] font-mono">{m.dosage || "—"}</div>
                              </div>
                              <StatusBadge status={m.administered ? "Administered" : "Pending"} />
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    <Card title="Recent Vitals">
                      {emr.vitals.length === 0 ? (
                        <p className="text-[12px] text-[#94A3B8]">No vitals recorded.</p>
                      ) : (
                        <div>
                          {(() => {
                            const latest = emr.vitals[0];
                            return (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <div className="flex items-baseline justify-between py-0.5">
                                  <span className="text-[11.5px] text-[#64748B]">Blood Pressure</span>
                                  <span className="font-mono text-[12px] font-semibold">{latest.bp || "—"}</span>
                                </div>
                                <div className="flex items-baseline justify-between py-0.5">
                                  <span className="text-[11.5px] text-[#64748B]">Pulse</span>
                                  <span className="font-mono text-[12px] font-semibold">{latest.pulse || "—"}</span>
                                </div>
                                <div className="flex items-baseline justify-between py-0.5">
                                  <span className="text-[11.5px] text-[#64748B]">Temperature</span>
                                  <span className="font-mono text-[12px] font-semibold">{latest.temperature || "—"}</span>
                                </div>
                              </div>
                            );
                          })()}
                          <div className="mt-2 text-[11px] text-[#94A3B8]">Last recorded: {formatDateTimeIST(emr.vitals[0].created_at)}</div>
                        </div>
                      )}
                    </Card>
                  </div>

                  <Card title="Recent Lab Results">
                    {emr.labs.length === 0 ? (
                      <p className="text-[12px] text-[#94A3B8]">No lab tests on record.</p>
                    ) : (
                      <Table headers={["Test", "Doctor", "Status", "Ordered"]}>
                        {emr.labs.slice(0, 5).map((l) => (
                          <TR key={l.id}>
                            <TD><span className="font-medium text-gray-700">{l.test_name}</span></TD>
                            <TD><span className="text-[#64748B] text-[11.5px]">{l.doctor_name || "—"}</span></TD>
                            <TD><StatusBadge status={l.status || "due"} /></TD>
                            <TD><span className="font-mono text-[11px] text-[#94A3B8]">{formatDateTimeIST(l.created_at)}</span></TD>
                          </TR>
                        ))}
                      </Table>
                    )}
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card title="Care Team">
                    {careTeam.length === 0 ? (
                      <p className="text-[12px] text-[#94A3B8]">No doctor recorded for this patient yet.</p>
                    ) : (
                      careTeam.map((c) => (
                        <div key={c.name} className="flex items-center gap-2.5 py-1.5 border-b border-[#F1F5F9] last:border-0">
                          <div className="w-7 h-7 rounded-full bg-[#E8EDF5] flex items-center justify-center text-[10px] font-bold text-[#1E3A6E]">
                            {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                          </div>
                          <div>
                            <div className="text-[12px] font-medium text-gray-800">{c.name}</div>
                            <div className="text-[11px] text-[#64748B]">{c.role}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </Card>

                  <Card title="Encounter Info">
                    {latestAdmission ? (
                      <div className="space-y-1.5 text-[12px]">
                        {[
                          { l: "Admit Date", v: formatDateTimeIST(latestAdmission.admission_date) },
                          { l: "Discharge Date", v: latestAdmission.discharge_date ? formatDateTimeIST(latestAdmission.discharge_date) : "Still admitted" },
                          { l: "Ward / Bed", v: selectedRow.active_bed || "—" },
                          { l: "Notes", v: latestAdmission.notes || "—" },
                        ].map(({ l, v }) => (
                          <div key={l} className="flex justify-between py-0.5 border-b border-[#F8FAFC] last:border-0">
                            <span className="text-[#64748B]">{l}</span>
                            <span className="font-medium text-gray-800 text-right ml-2">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : selectedRow.care_stream === "OP" ? (
                      <div className="space-y-1.5 text-[12px]">
                        {[
                          { l: "Department", v: selectedRow.appointment_dept || "—" },
                          { l: "Doctor", v: selectedRow.appointment_doctor || "—" },
                          { l: "Status", v: selectedRow.appointment_status || "—" },
                        ].map(({ l, v }) => (
                          <div key={l} className="flex justify-between py-0.5 border-b border-[#F8FAFC] last:border-0">
                            <span className="text-[#64748B]">{l}</span>
                            <span className="font-medium text-gray-800 text-right ml-2">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#94A3B8]">No active admission on file.</p>
                    )}
                  </Card>

                  <Card title="Insurance">
                    {latestInsurance ? (
                      <div className="space-y-1.5 text-[12px]">
                        {[
                          { l: "Insurer", v: latestInsurance.insurer_name },
                          { l: "Claim Amount", v: `₹${latestInsurance.claim_amount.toLocaleString("en-IN")}` },
                          { l: "Approved", v: `₹${latestInsurance.approved_amount.toLocaleString("en-IN")}` },
                          { l: "Status", v: latestInsurance.claim_status },
                        ].map(({ l, v }) => (
                          <div key={l} className="flex justify-between py-0.5 border-b border-[#F8FAFC] last:border-0">
                            <span className="text-[#64748B]">{l}</span>
                            <span className="font-medium text-gray-800">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#94A3B8]">No insurance claims on file.</p>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {tab === "Day-wise" && (
              <div className="max-w-4xl mx-auto space-y-4">
                {sortedDates.length === 0 ? (
                  <div className="bg-white border border-[#DDE2EC] rounded p-8 text-center">
                    <p className="text-[13px] font-semibold text-gray-800">No evaluations recorded yet</p>
                    <p className="text-[12px] text-[#64748B] mt-1">Use "Add Evaluation" above to log today's clinical evaluation and treatment.</p>
                  </div>
                ) : (
                  sortedDates.map((date) => (
                    <Card
                      key={date}
                      title={new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
                    >
                      <div className="space-y-3">
                        {dayGroups.get(date)!.map((entry, i) => {
                          const color = ENTRY_TYPE_COLOR[entry.type] || { bg: "#F1F5F9", text: "#334155" };
                          return (
                            <div key={i} className="pb-3 border-b border-[#F1F5F9] last:border-0 last:pb-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-[10.5px] text-[#94A3B8]">
                                  {new Date(entry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span
                                  className="text-[11px] font-semibold px-1.5 py-px rounded"
                                  style={{ backgroundColor: color.bg, color: color.text }}
                                >
                                  {entry.type}
                                </span>
                                <span className="text-[12.5px] font-medium text-gray-800">{entry.title}</span>
                              </div>
                              {entry.body && <p className="text-[12px] text-gray-700 ml-0.5">{entry.body}</p>}
                              {entry.extra && <p className="text-[11.5px] text-[#64748B] ml-0.5 mt-0.5">{entry.extra}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {tab === "Timeline" && (
              <div className="max-w-2xl">
                <div className="bg-white border border-[#DDE2EC] rounded p-4">
                  {emr.timeline.length === 0 ? (
                    <p className="text-[12.5px] text-[#64748B]">No journey events recorded yet.</p>
                  ) : (
                    emr.timeline.map((e, i, arr) => (
                      <TimelineItem
                        key={i}
                        time={e.timestamp ? formatDateTimeIST(e.timestamp) : "—"}
                        type={e.stage}
                        title={e.label}
                        isLast={i === arr.length - 1}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === "Problems" && (
              <Card title="Diagnoses">
                {emr.diagnoses.length === 0 ? (
                  <p className="text-[12.5px] text-[#64748B]">No diagnoses recorded.</p>
                ) : (
                  <Table headers={["Diagnosis", "Recorded"]}>
                    {emr.diagnoses.map((d) => (
                      <TR key={d.id}>
                        <TD><span className="font-medium text-gray-800">{d.diagnosis_name}</span></TD>
                        <TD><span className="font-mono text-[11.5px] text-[#64748B]">{formatDateTimeIST(d.created_at)}</span></TD>
                      </TR>
                    ))}
                  </Table>
                )}
              </Card>
            )}

            {tab === "Medications" && (
              <div className="space-y-4">
                <Card title="Medication Schedule">
                  {emr.medication_schedules.length === 0 ? (
                    <p className="text-[12.5px] text-[#64748B]">No medications scheduled.</p>
                  ) : (
                    <Table headers={["Medication", "Dose", "Scheduled", "Status", "Notes"]}>
                      {emr.medication_schedules.map((m) => (
                        <TR key={m.id}>
                          <TD><span className="font-medium text-gray-800">{m.medicine_name}</span></TD>
                          <TD><span className="font-mono text-[12px]">{m.dosage || "—"}</span></TD>
                          <TD><span className="font-mono text-[11.5px]">{formatDateTimeIST(m.schedule_time)}</span></TD>
                          <TD><StatusBadge status={m.administered ? "Administered" : "Pending"} /></TD>
                          <TD><span className="text-[#64748B] text-[11.5px]">{m.notes || "—"}</span></TD>
                        </TR>
                      ))}
                    </Table>
                  )}
                </Card>

                <Card title="Pharmacy Prescriptions">
                  {emr.prescriptions.length === 0 ? (
                    <p className="text-[12.5px] text-[#64748B]">No pharmacy prescriptions on record.</p>
                  ) : (
                    <Table headers={["Medicine", "Dosage", "Quantity", "Status", "Prescribed"]}>
                      {emr.prescriptions.map((p, i) => (
                        <TR key={`${p.prescription_id}-${i}`}>
                          <TD><span className="font-medium text-gray-800">{p.medicine_name}</span></TD>
                          <TD><span className="font-mono text-[12px]">{p.dosage || "—"}</span></TD>
                          <TD><span className="font-mono text-[12px]">{p.quantity ?? "—"}</span></TD>
                          <TD><StatusBadge status={p.status || "pending"} /></TD>
                          <TD><span className="font-mono text-[11.5px] text-[#64748B]">{formatDateTimeIST(p.created_at)}</span></TD>
                        </TR>
                      ))}
                    </Table>
                  )}
                </Card>
              </div>
            )}

            {tab === "Allergies" && (
              <Card title="Known Allergies">
                {allergyList.length === 0 ? (
                  <p className="text-[12.5px] text-[#64748B]">No known allergies on file for this patient.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allergyList.map((a) => (
                      <span key={a} className="bg-[#FEE2E2] text-[#B91C1C] text-[12px] font-semibold px-3 py-1 rounded border border-[#FECACA]">
                        ⚠ {a}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {tab === "Vitals" && (
              <Card title="Recorded Vitals">
                {emr.vitals.length === 0 ? (
                  <p className="text-[12.5px] text-[#64748B]">No vitals recorded.</p>
                ) : (
                  <Table headers={["Recorded", "BP", "Pulse", "Temperature"]}>
                    {emr.vitals.map((v) => (
                      <TR key={v.id}>
                        <TD><span className="font-mono text-[11.5px]">{formatDateTimeIST(v.created_at)}</span></TD>
                        <TD>{v.bp || "—"}</TD>
                        <TD>{v.pulse || "—"}</TD>
                        <TD>{v.temperature || "—"}</TD>
                      </TR>
                    ))}
                  </Table>
                )}
              </Card>
            )}

            {tab === "Labs" && (
              <Card title="Diagnostics / Lab Tests">
                {emr.labs.length === 0 ? (
                  <p className="text-[12.5px] text-[#64748B]">No lab tests on record.</p>
                ) : (
                  <Table headers={["Test", "Doctor", "Status", "Ordered"]}>
                    {emr.labs.map((l) => (
                      <TR key={l.id}>
                        <TD><span className="font-medium text-gray-700">{l.test_name}</span></TD>
                        <TD><span className="text-[#64748B] text-[11.5px]">{l.doctor_name || "—"}</span></TD>
                        <TD><StatusBadge status={l.status || "due"} /></TD>
                        <TD><span className="font-mono text-[11px] text-[#94A3B8]">{formatDateTimeIST(l.created_at)}</span></TD>
                      </TR>
                    ))}
                  </Table>
                )}
              </Card>
            )}

            {tab === "Documents" && (
              <div className="space-y-4">
                <Card title="Discharge Summaries">
                  {emr.certificates.filter((c) => c.certificate_type === "discharge_summary").length === 0 ? (
                    <p className="text-[12.5px] text-[#64748B]">
                      No discharge summary yet -- one is generated automatically when this patient is discharged from a bed.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {emr.certificates
                        .filter((c) => c.certificate_type === "discharge_summary")
                        .map((c) => (
                          <div key={c.id} className="border border-[#DDE2EC] rounded">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 flex items-center justify-between"
                              onClick={() => setExpandedCertId(expandedCertId === c.id ? null : c.id)}
                            >
                              <span className="text-[12.5px] font-medium text-gray-800">{c.title}</span>
                              <span className="font-mono text-[11px] text-[#94A3B8]">{formatDateTimeIST(c.created_at)}</span>
                            </button>
                            {expandedCertId === c.id && (
                              <pre className="px-3 pb-3 text-[11.5px] text-gray-700 whitespace-pre-wrap font-sans border-t border-[#F1F5F9] pt-2">
                                {c.body}
                              </pre>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </Card>

                <Card title="Clinical Voice Notes">
                  {emr.documents.filter((d) => d.doc_type === "clinical_audio_note").length === 0 ? (
                    <p className="text-[12.5px] text-[#64748B]">
                      No recorded evaluations yet -- use Record in "Add Evaluation" to dictate one.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {emr.documents
                        .filter((d) => d.doc_type === "clinical_audio_note")
                        .map((d) => (
                          <div key={d.id} className="border border-[#DDE2EC] rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] text-[#94A3B8] font-mono">{formatDateTimeIST(d.created_at)}</span>
                            </div>
                            <audio controls className="w-full h-8" src={`${API_BASE}/api/documents/${d.id}/file`} />
                            {d.ocr_text && (
                              <p className="text-[12px] text-gray-700 mt-2 bg-[#F8FAFC] p-2 rounded border border-[#F1F5F9]">
                                <strong className="text-[11px] uppercase tracking-wide text-gray-500 block mb-0.5">Transcript</strong>
                                {d.ocr_text}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </Card>

                <Card title="Documents">
                  {emr.documents.filter((d) => d.doc_type !== "clinical_audio_note").length === 0 ? (
                    <p className="text-[12.5px] text-[#64748B]">No documents uploaded for this patient.</p>
                  ) : (
                    <Table headers={["Document", "Type", "Uploaded", ""]}>
                      {emr.documents
                        .filter((d) => d.doc_type !== "clinical_audio_note")
                        .map((d) => (
                          <TR key={d.id}>
                            <TD><span className="font-medium text-gray-800">{d.file_name || "Untitled"}</span></TD>
                            <TD><span className="text-[#64748B] text-[11.5px] uppercase">{d.doc_type}</span></TD>
                            <TD><span className="font-mono text-[11.5px]">{formatDateTimeIST(d.created_at)}</span></TD>
                            <TD>{d.has_ocr_text && <StatusBadge status="OCR Available" />}</TD>
                          </TR>
                        ))}
                    </Table>
                  )}
                </Card>
              </div>
            )}

            {tab === "Billing" && (
              <div className="space-y-4">
                <Card title="Invoices">
                  {emr.invoices.length === 0 ? (
                    <p className="text-[12.5px] text-[#64748B]">No invoices raised for this patient.</p>
                  ) : (
                    <Table headers={["Invoice", "Module", "Total", "Paid", "Due", "Status"]}>
                      {emr.invoices.map((inv) => (
                        <TR key={inv.id}>
                          <TD><span className="font-mono text-[12px] font-medium text-gray-800">{inv.invoice_no}</span></TD>
                          <TD><span className="text-[#64748B] text-[11.5px]">{inv.module}</span></TD>
                          <TD><span className="font-mono text-[12px]">₹{inv.total_amount.toLocaleString("en-IN")}</span></TD>
                          <TD><span className="font-mono text-[12px] text-[#15803D]">₹{inv.paid_amount.toLocaleString("en-IN")}</span></TD>
                          <TD><span className="font-mono text-[12px] text-[#B91C1C]">₹{inv.due_amount.toLocaleString("en-IN")}</span></TD>
                          <TD><StatusBadge status={inv.payment_status} /></TD>
                        </TR>
                      ))}
                    </Table>
                  )}
                </Card>

                <Card title="Payments">
                  {emr.invoice_payments.length === 0 ? (
                    <p className="text-[12.5px] text-[#64748B]">No payments recorded.</p>
                  ) : (
                    <Table headers={["Amount", "Mode", "Recorded"]}>
                      {emr.invoice_payments.map((p) => (
                        <TR key={p.id}>
                          <TD><span className="font-mono text-[12px]">₹{p.amount.toLocaleString("en-IN")}</span></TD>
                          <TD><span className="text-[#64748B] text-[11.5px] uppercase">{p.payment_mode}</span></TD>
                          <TD><span className="font-mono text-[11.5px]">{formatDateTimeIST(p.created_at)}</span></TD>
                        </TR>
                      ))}
                    </Table>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {addOpen && emr && (
        <AddEvaluationModal
          patientId={selectedRow.patient_id}
          admissionId={emr.admissions[0]?.id}
          setNotice={setNotice}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            void loadPatient(selectedRow);
          }}
        />
      )}
    </div>
  );
}

function AddEvaluationModal({
  patientId,
  admissionId,
  setNotice,
  onClose,
  onSaved,
}: {
  patientId: string;
  admissionId?: number;
  setNotice: (n: Notice | null) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<"doctor" | "nurse" | "">("");
  const [doctorName, setDoctorName] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [spo2, setSpo2] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [note, setNote] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("en");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // Held here, not uploaded yet -- the recording only becomes part of the
  // patient's chart when the whole evaluation is actually saved (Save to
  // Chart), same as every other field in this form. Re-recording replaces it;
  // closing the modal without saving discards it.
  const pendingAudioBlobRef = useRef<Blob | null>(null);
  const [hasPendingAudio, setHasPendingAudio] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        pendingAudioBlobRef.current = blob;
        setHasPendingAudio(true);
        setTranscribing(true);
        try {
          const text = await transcribeAudio(blob, transcriptionLanguage);
          if (text.trim()) {
            setNote((prev) => (prev.trim() ? `${prev.trim()}\n${text.trim()}` : text.trim()));
          } else {
            setNotice({ type: "warning", message: "Recording didn't produce any transcribable speech. The audio will still be saved with this evaluation." });
          }
        } catch (error: any) {
          reportError(setNotice, error, "Failed to transcribe the recording. The audio will still be saved with this evaluation.");
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setNotice({ type: "error", message: "Microphone access was denied or is unavailable." });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setNotice({ type: "error", message: "Evaluation notes are required." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/patients/${patientId}/notes`, {
        method: "POST",
        body: JSON.stringify({
          admission_id: admissionId,
          doctor_name: doctorName.trim() || undefined,
          note: note.trim(),
          treatment_plan: treatmentPlan.trim() || undefined,
          role: role || undefined,
          diagnosis: diagnosis.trim() || undefined,
          vitals: {
            bp: bp.trim() || undefined,
            pulse: pulse.trim() || undefined,
            temperature: temperature.trim() || undefined,
            spo2: spo2.trim() || undefined,
            respiratory_rate: respiratoryRate.trim() || undefined,
          },
        }),
      });
      // The recording only becomes part of the chart here, alongside the
      // note it was dictated into -- not the moment "Stop" was pressed.
      if (pendingAudioBlobRef.current) {
        try {
          await uploadAudioDocument(patientId, pendingAudioBlobRef.current, note.trim(), admissionId);
        } catch (error: any) {
          reportError(setNotice, error, "Evaluation saved, but the recording failed to save -- try recording again.");
          return;
        }
      }
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to save this evaluation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-[#DDE2EC] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-[#1B4FD8] text-white px-5 py-3.5 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="font-bold text-[14px]">Add Evaluation &amp; Treatment</h3>
            <p className="text-[11px] text-white/75 mt-0.5">Record today's clinical round -- vitals, diagnosis, evaluation, and treatment plan in one place.</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-lg flex-shrink-0">✕</button>
        </div>

        <form onSubmit={submit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-[12px]">
          {/* Section 1: Who */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              <FiUser aria-hidden /> Recorded By
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-[#64748B] block mb-1">Role</label>
                <div className="flex gap-1.5">
                  {(["doctor", "nurse"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(role === r ? "" : r)}
                      className={`flex-1 px-3 py-2 rounded border text-[12px] font-semibold capitalize transition-colors ${
                        role === r
                          ? "bg-[#1B4FD8] text-white border-[#1B4FD8]"
                          : "bg-white text-[#64748B] border-[#DDE2EC] hover:border-[#94A3B8]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748B] block mb-1">Name (optional)</label>
                <input
                  className="w-full border border-[#DDE2EC] p-2 rounded"
                  placeholder="Doctor / nurse name"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Vitals */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              <FiActivity aria-hidden /> Vitals <span className="text-[10px] font-normal text-[#94A3B8] normal-case">(optional)</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <div>
                <label className="text-[11px] font-medium text-[#64748B] block mb-1">BP</label>
                <input className="w-full border border-[#DDE2EC] p-2 rounded" placeholder="120/80" value={bp} onChange={(e) => setBp(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748B] block mb-1">Pulse</label>
                <input className="w-full border border-[#DDE2EC] p-2 rounded" placeholder="78 bpm" value={pulse} onChange={(e) => setPulse(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748B] block mb-1">Temp</label>
                <input className="w-full border border-[#DDE2EC] p-2 rounded" placeholder="98.6°F" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748B] block mb-1">SpO2</label>
                <input className="w-full border border-[#DDE2EC] p-2 rounded" placeholder="97%" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#64748B] block mb-1">Resp. Rate</label>
                <input className="w-full border border-[#DDE2EC] p-2 rounded" placeholder="16/min" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section 3: Clinical evaluation */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              <FiClipboard aria-hidden /> Clinical Evaluation
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-medium text-[#64748B] block mb-1">Diagnosis / Impression (optional)</label>
                <input
                  className="w-full border border-[#DDE2EC] p-2 rounded"
                  placeholder="e.g. Improving pneumonia, stable post-op day 2"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <label className="text-[11px] font-medium text-[#64748B]">Evaluation Notes *</label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={transcriptionLanguage}
                      onChange={(e) => setTranscriptionLanguage(e.target.value)}
                      disabled={recording || transcribing}
                      className="border border-[#DDE2EC] rounded text-[11px] font-medium text-[#64748B] py-1 px-1.5 bg-white disabled:opacity-60"
                      title="Language spoken in the recording"
                    >
                      {TRANSCRIPTION_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>{l.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={recording ? stopRecording : startRecording}
                      disabled={transcribing}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        recording
                          ? "bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]"
                          : "bg-[#EFF6FF] text-[#1B4FD8] border border-[#BFDBFE] hover:bg-[#DBEAFE]"
                      } disabled:opacity-60`}
                    >
                      {recording ? (
                        <>
                          <FiSquare aria-hidden /> Stop
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
                        </>
                      ) : transcribing ? (
                        "Transcribing..."
                      ) : (
                        <>
                          <FiMic aria-hidden /> {hasPendingAudio ? "Re-record" : "Record"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  rows={4}
                  placeholder="Today's clinical evaluation / observations... or click Record to dictate"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border border-[#DDE2EC] p-2 rounded"
                  required
                />
                {hasPendingAudio && !recording && !transcribing && (
                  <p className="text-[10.5px] text-[#15803D] mt-1 flex items-center gap-1">
                    <FiMic aria-hidden /> Recording ready -- will be saved with this evaluation when you click "Save to Chart".
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Treatment plan */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              <FiTarget aria-hidden /> Treatment Plan <span className="text-[10px] font-normal text-[#94A3B8] normal-case">(optional)</span>
            </div>
            <textarea
              rows={3}
              placeholder="Today's treatment plan -- medication changes, procedures, next steps..."
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              className="w-full border border-[#DDE2EC] p-2 rounded"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#DDE2EC] bg-[#F8FAFC] flex-shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 border border-[#DDE2EC] rounded bg-white">Cancel</button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-1.5 bg-[#1B4FD8] text-white font-bold rounded disabled:opacity-60"
          >
            {saving ? "Saving..." : "✓ Save to Chart"}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}
