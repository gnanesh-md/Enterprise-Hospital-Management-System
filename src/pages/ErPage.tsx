import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  FiArrowLeft,
  FiPlus,
  FiRefreshCw,
  FiUser,
  FiUserPlus,
  FiHelpCircle,
  FiSearch,
  FiClipboard,
  FiActivity,
  FiAlertTriangle,
  FiZap,
  FiUserCheck,
  FiFileText,
  FiFlag,
  FiClock,
  FiCheck,
  FiUsers,
  FiWatch,
  FiBell,
  FiHome,
  FiPrinter,
  FiShield,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import {
  Button,
  Input,
  Label,
  Modal,
  Select,
  Table,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TabsTrigger,
  Textarea,
} from "../components/ui";
import PrescriptionUploadModal from "../components/PrescriptionUploadModal";
import { apiFetch, reportError, getHospitalCode } from "../lib/api";
import { API_BASE } from "../lib/constants";
import { formatDateTimeIST } from "../lib/format";
import type { Notice, Patient } from "../types";

// apiFetch always sends Content-Type: application/json, which breaks a
// multipart file upload -- this is the one place in the ER module that needs
// a raw fetch instead (attaching a scanned/photographed signed consent form).
async function uploadConsentDocument(consentId: number, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/er/consents/${consentId}/document`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Hospital-Code": getHospitalCode() },
    body: formData,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to upload the signed document.");
  }
}

type Props = {
  setNotice: (notice: Notice | null) => void;
  onNavigate?: (page: string, extraData?: any) => void;
  // Handed back by AddPatientPage after a patient registered via the "New"
  // mode card below completes -- see App.tsx's navigateToPage. Lets Quick
  // Intake pick up exactly where staff left off instead of making them
  // search for the patient they just registered.
  prefillPatient?: { patient_id: string; name: string; last_name?: string } | null;
  // Handed back after a patient registered via an unknown visit's "Register
  // as New Patient" button (see MergeUnknownPatient) -- merges that patient
  // into the visit they came from and reopens it, instead of leaving staff
  // to redo the merge by hand after being bounced back to the ER queue.
  mergeTarget?: { visitId: number; patientId: string } | null;
};

type ErVisit = {
  id: number;
  visit_no: string;
  patient_id: string | null;
  is_unknown_patient: boolean;
  unknown_patient_label: string | null;
  arrival_mode: string | null;
  condition_at_arrival: string | null;
  arrival_at: string | null;
  status: string;
  assigned_doctor_name: string | null;
  assigned_specialty: string | null;
  doctor_assigned_at: string | null;
  doctor_accepted_at: string | null;
  triage_category: string | null;
  triage_bed_label: string | null;
  closed_at: string | null;
  patient_name?: string | null;
  patient_last_name?: string | null;
  patient_gender?: string | null;
  patient_age?: number | null;
  patient_phone?: string | null;
  patient_emergency_contact?: string | null;
  patient?: Patient | null;
};

type ErComplaint = {
  id: number;
  complaint: string;
  severity: string | null;
  case_category: string | null;
  duration: string | null;
  reported_by: string | null;
  created_at: string;
};

type ErVitals = {
  id: number;
  recorded_at: string;
  recorded_by: string | null;
  heart_rate: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  respiratory_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  consciousness_level: string | null;
  blood_glucose: number | null;
  pain_score: number | null;
  gcs: number | null;
  notes: string | null;
};

type ErTriage = {
  category: string;
  triage_bed_label: string | null;
  reason: string | null;
  triaged_at: string;
  assigned_by: string | null;
} | null;

type ErTreatment = {
  id: number;
  intervention_type: string;
  description: string | null;
  performed_at: string;
  administered_by: string | null;
};

type ErClinicalNote = {
  id: number;
  note_type: string;
  author: string | null;
  content: string;
  created_at: string;
};

type ErDisposition = {
  outcome: string;
  required_specialty: string | null;
  clinical_reason: string;
  decided_by: string | null;
  decided_at: string;
  priority: string | null;
} | null;

type ErBedRequest = {
  id: number;
  status: string;
  requested_level_of_care: string;
  requested_specialty: string | null;
  requested_at: string;
  allocated_bed_id: number | null;
  allocated_admission_id: number | null;
  allocated_at: string | null;
};

type ErConsent = {
  id: number;
  hospital_id?: number;
  patient_id?: string;
  patient_name: string;
  consent_type: string;
  signed_by: string;
  relation_to_patient?: string;
  status: string;
  witness_doctor?: string;
  signed_by_phone?: string;
  refusal_reason?: string;
  legal_waiver_acknowledged: boolean;
  er_visit_id?: number;
  notes?: string;
  signed_at?: string;
  document_filename?: string | null;
  document_mime_type?: string | null;
};

type ErVisitDetail = ErVisit & {
  complaints: ErComplaint[];
  vitals: ErVitals[];
  triage: ErTriage;
  treatments: ErTreatment[];
  clinical_notes: ErClinicalNote[];
  disposition: ErDisposition;
  bed_requests: ErBedRequest[];
  consents?: ErConsent[];
};

type TriageCategory = {
  id: number;
  category_code: string;
  category_label: string;
  description: string | null;
  color: string | null;
  sort_order: number;
};

// Real clinical emergency triage presentation conditions based on standard medical emergency data
const ARRIVAL_CONDITION_OPTIONS = [
  "Conscious, Alert & Oriented (GCS 15)",
  "Conscious with Acute Distress (Severe Pain / Dyspnea)",
  "Drowsy / Confused / Altered Sensorium (GCS 9-14)",
  "Unconscious / Unresponsive / Comatose (GCS ≤ 8)",
  "Acute Respiratory Failure / Severe Hypoxia / Stridor",
  "Hemodynamically Unstable / In Shock (Hypotensive, Cold Clammy)",
  "Acute Severe Hemorrhage / Active Bleeding Trauma",
  "Acute Chest Pain / Suspected STEMI / Acute Coronary Syndrome",
  "Acute Stroke / Hemiplegia / Neurological Deficit (FAST Positive)",
  "Actively Convulsing / Status Epilepticus",
  "Severe Polytrauma / Major Road Traffic Accident (RTA) / Crush Injury",
  "Acute Poisoning / Toxic Ingestion / Envenomation (Snakebite)",
  "Severe Thermal / Chemical Burns / Inhalation Injury",
  "Cardiac Arrest / Pulseless (CPR in Progress)",
  "Brought Dead / Dead on Arrival (DOA)",
];

// Real clinical emergency arrival / transport modes
const ARRIVAL_MODE_OPTIONS = [
  { value: "walk-in", label: "Walk-in / Self Ambulatory" },
  { value: "ambulance_108", label: "108 Emergency Ambulance (BLS/ALS)" },
  { value: "ambulance_private", label: "Private / Hospital Ambulance (ICU on Wheels)" },
  { value: "brought_by_family", label: "Brought by Family / Relatives" },
  { value: "brought_by_public", label: "Brought by Bystanders / Good Samaritan" },
  { value: "referral", label: "Hospital Referral / Inter-facility Transfer" },
  { value: "police", label: "Police Escort / Medico-Legal (MLC)" },
  { value: "air_ambulance", label: "Air Ambulance / Emergency Helivac" },
  { value: "other", label: "Other Mode of Transport" },
];

// Certain presentations (RTA, assault, burns, poisoning, hanging) are MLC
// by standard hospital/police-reporting practice regardless of who's
// asking, while ordinary illness (fever, cardiac, etc.) isn't. The New ER
// Patient form filters this list by the MLC answer, so both sides need
// their own catch-all "Other" entry.
const CASE_CATEGORY_OPTIONS: { value: string; label: string; mlc: boolean }[] = [
  { value: "general_illness", label: "Fever / General Illness", mlc: false },
  { value: "cardiac", label: "Cardiac", mlc: false },
  { value: "pregnancy", label: "Pregnancy-related", mlc: false },
  { value: "seizure", label: "Seizure", mlc: false },
  { value: "neurological", label: "Neurological", mlc: false },
  { value: "drowning", label: "Drowning", mlc: false },
  { value: "farm_injury", label: "Farm / Agricultural Injury", mlc: false },
  { value: "trauma", label: "Trauma / Accidental Injury (non-RTA)", mlc: false },
  { value: "other", label: "Other", mlc: false },
  { value: "rta", label: "Road Traffic Accident", mlc: true },
  { value: "assault", label: "Assault / Stabbing / Violence", mlc: true },
  { value: "burns", label: "Burns", mlc: true },
  { value: "poisoning", label: "Poisoning", mlc: true },
  { value: "hanging", label: "Hanging / Strangulation", mlc: true },
  { value: "other_mlc", label: "Other Medico-Legal Case", mlc: true },
];

const OUTCOMES_REQUIRING_BED = new Set(["ward", "icu", "ot", "observation"]);
const OUTCOME_OPTIONS = [
  { value: "discharge", label: "Discharge (Routine / Recovered)" },
  { value: "observation", label: "ER Short Stay Observation" },
  { value: "ward", label: "Inpatient General Ward Admission" },
  { value: "icu", label: "ICU (Intensive Care Unit) Admission" },
  { value: "ot", label: "OT / Emergency Surgery" },
  { value: "lama", label: "LAMA (Leave Against Medical Advice)" },
  { value: "dama", label: "DAMA (Discharge Against Medical Advice)" },
  { value: "specialized_department", label: "Specialized Department Transfer" },
  { value: "referral", label: "Referral / External Transfer" },
  { value: "death", label: "Death / Brought Dead" },
  { value: "other", label: "Other Disposition" },
];

const STATUS_LABELS: Record<string, string> = {
  registered: "Registered",
  triaged: "Triaged",
  under_treatment: "Under Treatment",
  doctor_assigned: "Doctor Assigned",
  under_investigation: "Under Investigation",
  stabilized: "Stabilized",
  awaiting_disposition: "Awaiting Disposition",
  bed_requested: "Bed Requested",
  bed_allocated: "Bed Allocated",
  transferred: "Transferred",
  closed: "Closed",
};

// Five semantic groups a status falls into, for the badge color -- see
// styles.css's "Emergency Room" section for the intake/active/pending/
// resolved/closed color scale this drives.
const STATUS_GROUP: Record<string, string> = {
  registered: "intake",
  triaged: "intake",
  under_treatment: "active",
  doctor_assigned: "active",
  under_investigation: "active",
  stabilized: "active",
  awaiting_disposition: "pending",
  bed_requested: "pending",
  bed_allocated: "resolved",
  transferred: "resolved",
  closed: "closed",
};

const CORE_STEPS = [
  { key: "registered", label: "Registered", hint: "Intake" },
  { key: "triaged", label: "Triaged", hint: "Priority set" },
  { key: "under_treatment", label: "Treatment", hint: "Stabilizing" },
  { key: "doctor_assigned", label: "Doctor", hint: "Assessment" },
  { key: "awaiting_disposition", label: "Disposition", hint: "Next step" },
];

function coreStepIndex(status: string): number {
  switch (status) {
    case "registered":
      return 0;
    case "triaged":
      return 1;
    case "under_treatment":
    case "under_investigation":
    case "stabilized":
      return 2;
    case "doctor_assigned":
      return 3;
    default:
      // awaiting_disposition, bed_requested, bed_allocated, transferred, closed
      return 4;
  }
}

function elapsedSince(iso: string | null): string {
  if (!iso) return "-";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const group = STATUS_GROUP[status] || "closed";
  return (
    <span className={`er-status-badge er-status-${group}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function triageColorFor(category: string | null | undefined, categories: TriageCategory[]): string {
  if (!category) return "#c3cbd6";
  return categories.find((c) => c.category_code === category)?.color || "#6b7280";
}

function TriageChip({
  category,
  categories,
  bedLabel,
  compact,
}: {
  category: string;
  categories: TriageCategory[];
  bedLabel?: string | null;
  compact?: boolean;
}) {
  const cat = categories.find((c) => c.category_code === category);
  const color = cat?.color || "#6b7280";
  return (
    <span className="er-triage-chip" style={{ background: `${color}22`, color }}>
      <span className="er-triage-dot" />
      {compact ? category : cat ? `${cat.category_code} — ${cat.category_label}` : category}
      {!compact && bedLabel ? ` · ${bedLabel}` : ""}
    </span>
  );
}

function isAbnormal(field: string, value: number | null): boolean {
  if (value == null) return false;
  switch (field) {
    case "heart_rate":
      return value < 60 || value > 100;
    case "spo2":
      return value < 95;
    case "bp_systolic":
      return value < 90 || value > 140;
    case "bp_diastolic":
      return value < 60 || value > 90;
    case "respiratory_rate":
      return value < 12 || value > 20;
    case "temperature":
      if (value > 45) {
        // Temperature recorded in Fahrenheit (e.g. 98.6°F)
        return value < 96.0 || value > 100.4;
      }
      // Temperature recorded in Celsius (e.g. 37.0°C)
      return value < 36.0 || value > 38.0;
    case "blood_glucose":
      return value < 70 || value > 180;
    case "pain_score":
      return value >= 5;
    default:
      return false;
  }
}

// Maps an AI urgency label to one of the hospital's own configured triage
// categories -- never invents/assumes a code (e.g. "B1"-"B5") that the
// hospital may not have configured (triage categories are deliberately not
// pre-filled, see TriageConfigPanel). Tries a label-keyword match first,
// falls back to the conventional B-code only if that exact code exists, and
// returns "" (meaning: leave untriaged, staff must set it manually) if
// nothing configured matches -- the same safe-degradation behavior as the
// AI Triage Assistant panel on an existing visit.
function mapUrgencyToTriageCategory(urgency: string, categories: TriageCategory[]): string {
  const lower = (urgency || "").toLowerCase();
  let labelKeyword = "";
  let fallbackCode = "";
  if (lower.includes("critical") || lower.includes("immediate") || lower.includes("resuscitation")) {
    labelKeyword = "immediate";
    fallbackCode = "B1";
  } else if (lower.includes("high") || lower.includes("severe") || lower.includes("emergent")) {
    labelKeyword = "high";
    fallbackCode = "B2";
  } else if (lower.includes("moderate") || lower.includes("medium") || lower.includes("urgent")) {
    labelKeyword = "moderate";
    fallbackCode = "B3";
  } else if (lower.includes("low") || lower.includes("minor") || lower.includes("less urgent")) {
    labelKeyword = "low";
    fallbackCode = "B4";
  }
  if (!labelKeyword) return "";
  const byLabel = categories.find((c) => c.category_label.toLowerCase().includes(labelKeyword));
  if (byLabel) return byLabel.category_code;
  const byCode = categories.find((c) => c.category_code === fallbackCode);
  return byCode ? byCode.category_code : "";
}

type BedNeedSuggestion = { levelOfCare: string; specialty: string | null; reason: string } | null;

// Suggests which ward/level-of-care a visit will likely need at disposition
// time, purely from what's already been charted in the ER (triage category's
// acuity + the specialty a doctor was already assigned under) -- no new AI
// call, so it's free and instant, and it never overrides staff: DispositionForm
// only offers it as a one-click "Apply" hint, staff still choose the outcome.
function suggestBedNeed(
  triageCategory: string | null,
  assignedSpecialty: string | null,
  categories: TriageCategory[],
): BedNeedSuggestion {
  const cat = categories.find((c) => c.category_code === triageCategory);
  const label = (cat?.category_label || "").toLowerCase();
  let levelOfCare = "";
  if (label.includes("immediate") || label.includes("critical") || label.includes("resuscitation")) {
    levelOfCare = "icu";
  } else if (label.includes("high") || label.includes("severe") || label.includes("emergent")) {
    levelOfCare = "icu";
  } else if (label.includes("moderate") || label.includes("urgent")) {
    levelOfCare = "ward";
  } else if (label.includes("low") || label.includes("minor")) {
    levelOfCare = "observation";
  }
  if (!levelOfCare && !assignedSpecialty) return null;
  const reasonParts: string[] = [];
  if (cat) reasonParts.push(`triage ${cat.category_code} — ${cat.category_label}`);
  if (assignedSpecialty) reasonParts.push(`assigned to ${assignedSpecialty}`);
  return {
    levelOfCare: levelOfCare || "ward",
    specialty: assignedSpecialty || null,
    reason: reasonParts.join(", ") || "ER assessment",
  };
}

// Turns a visit's recorded complaints + most recent vitals into the free-text
// "symptoms" the AI triage prompt reasons over -- the same shape Quick Intake,
// the AI Triage Assistant panel, and Doctor Assignment's AI suggestion all
// feed it, so a doctor/department suggestion is only ever grounded in what's
// actually been charted for this patient.
function buildSymptomsSummary(complaints: ErComplaint[], vitals: ErVitals[]): string {
  const complaintText = complaints.map((c) => c.complaint).join(", ");
  const vitalsParts: string[] = [];
  const latest = vitals[vitals.length - 1];
  if (latest) {
    if (latest.heart_rate) vitalsParts.push(`HR: ${latest.heart_rate} bpm`);
    if (latest.bp_systolic && latest.bp_diastolic) vitalsParts.push(`BP: ${latest.bp_systolic}/${latest.bp_diastolic} mmHg`);
    if (latest.spo2 != null) vitalsParts.push(`SpO2: ${latest.spo2}%`);
    if (latest.respiratory_rate != null) vitalsParts.push(`RR: ${latest.respiratory_rate} /min`);
    if (latest.temperature != null) {
      const tempVal = Number(latest.temperature);
      const tempUnit = tempVal > 45 ? "°F" : "°C";
      vitalsParts.push(`Temp: ${latest.temperature}${tempUnit}`);
    }
    if (latest.blood_glucose != null) vitalsParts.push(`GRBS: ${latest.blood_glucose} mg/dL`);
    if (latest.pain_score != null) vitalsParts.push(`Pain: ${latest.pain_score}/10`);
    if (latest.consciousness_level) vitalsParts.push(`Consciousness: ${latest.consciousness_level}`);
  }
  const vitalsText = vitalsParts.length > 0 ? `Vitals: ${vitalsParts.join(", ")}` : "No vitals recorded.";
  return `Complaints: ${complaintText || "None"}. ${vitalsText}`;
}

// Single source of truth for "ask the AI which department/doctor fits this
// patient" -- fetches the real department/doctor lists (department_name is
// the actual field on /api/registration/departments; a prior bug read a
// nonexistent `.name` here and silently sent the AI an empty list) and calls
// the triage endpoint. Used by Quick Intake, the AI Triage Assistant panel,
// and Doctor Assignment's AI suggestion so all three reason from identical data.
type AiTriageSuggestion = {
  department: string;
  urgency: string;
  reasoning: string;
  doctor: string;
  suggested_treatment?: { intervention_type: string; description: string } | null;
  suggested_treatments?: { intervention_type: string; description: string }[];
};

async function fetchAiTriageSuggestion(symptoms: string): Promise<AiTriageSuggestion> {
  const deptsRes = await apiFetch<{ departments: { department_name: string }[] }>("/api/registration/departments");
  const docsRes = await apiFetch<{ doctors: { doctor_name: string; department: string }[] }>("/api/op/doctors");
  const available_departments = deptsRes.departments.map((d) => d.department_name);
  // "Name (Department)" -- required by the shared doctor-matching backstop
  // (match_doctor_to_department in utils/database.py): it only fires when the
  // model itself doesn't return a doctor, and without the "(Department)"
  // suffix it can never match anything.
  const available_doctors = docsRes.doctors.map((d) => `${d.doctor_name} (${d.department || "General"})`);
  return apiFetch<AiTriageSuggestion>(
    "/api/symptom-ai/triage",
    { method: "POST", body: JSON.stringify({ symptoms, available_departments, available_doctors }) },
  );
}

export default function ErPage({ setNotice, onNavigate, prefillPatient, mergeTarget }: Props) {
  const [tab, setTab] = useState<"queue" | "config">("queue");
  const [visits, setVisits] = useState<ErVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ErVisitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newVisitOpen, setNewVisitOpen] = useState(false);
  const [categories, setCategories] = useState<TriageCategory[]>([]);
  const [prescriptionTarget, setPrescriptionTarget] = useState<{
    id: string;
    name: string;
    doctorName?: string;
  } | null>(null);

  // Backend already supports both ?active_only=true and ?status=closed (see
  // GET /api/er/visits) -- this was just never exposed in the UI, so once a
  // visit closed (discharge/referral/transfer/LAMA/death) there was no way
  // to look at it again anywhere in the ER module.
  const [queueFilter, setQueueFilter] = useState<"active" | "closed" | "all">("active");

  const loadVisits = async () => {
    setLoading(true);
    try {
      const qs = queueFilter === "active" ? "?active_only=true" : queueFilter === "closed" ? "?status=closed" : "";
      const data = await apiFetch<{ visits: ErVisit[] }>(`/api/er/visits${qs}`);
      setVisits(data.visits);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to load ER visits.");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiFetch<{ categories: TriageCategory[] }>(
        "/api/er/triage-config",
      );
      setCategories(data.categories);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to load triage categories.");
    }
  };

  const loadDetail = async (visitId: number) => {
    setDetailLoading(true);
    try {
      const data = await apiFetch<ErVisitDetail>(`/api/er/visits/${visitId}`);
      setDetail(data);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to load this ER visit.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [queueFilter]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedVisitId) loadDetail(selectedVisitId);
  }, [selectedVisitId]);

  useEffect(() => {
    if (!mergeTarget) return;
    (async () => {
      try {
        await apiFetch(`/api/er/visits/${mergeTarget.visitId}/merge-unknown`, {
          method: "POST",
          body: JSON.stringify({ patient_id: mergeTarget.patientId }),
        });
        setNotice({ type: "success", message: "New patient registered and merged into the visit." });
        setSelectedVisitId(mergeTarget.visitId);
      } catch (error: any) {
        reportError(setNotice, error, "Patient was registered, but merging into the visit failed -- merge manually from the visit's Identity panel.");
        setSelectedVisitId(mergeTarget.visitId);
      }
    })();
    // Runs once per distinct mergeTarget object -- App.tsx clears it on any
    // other navigation to "er", so this won't re-fire on a later unrelated visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeTarget]);

  const summary = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const v of visits) {
      if (v.status !== "closed") byStatus[v.status] = (byStatus[v.status] || 0) + 1;
    }
    return byStatus;
  }, [visits]);

  const refreshAfterAction = async () => {
    await loadVisits();
    if (selectedVisitId) await loadDetail(selectedVisitId);
  };

  // A patient handed back from the registration-redirect flow (see
  // App.tsx's navigateToPage) needs the intake modal open to actually see
  // themselves pre-selected in it -- the panel now only renders while this
  // modal is open, unlike the old always-visible sidebar.
  useEffect(() => {
    if (prefillPatient) setNewVisitOpen(true);
  }, [prefillPatient]);

  if (selectedVisitId && detail) {
    return (
      <>
        <VisitDetailPanel
          detail={detail}
          loading={detailLoading}
          categories={categories}
          setNotice={setNotice}
          onNavigate={onNavigate}
          onBack={() => {
            setSelectedVisitId(null);
            setDetail(null);
            loadVisits();
          }}
          onRefresh={refreshAfterAction}
          onOrderMedication={() =>
            setPrescriptionTarget({
              id: detail.patient_id || "",
              name: detail.patient_id
                ? detail.patient_id
                : detail.unknown_patient_label || detail.visit_no,
              doctorName: detail.assigned_doctor_name || undefined,
            })
          }
        />
        {/* Order Medication (on VisitDetailPanel, above) sets prescriptionTarget,
            but this component early-returns just VisitDetailPanel while a visit is
            open -- without rendering the modal here too, that button could never
            actually open anything. */}
        {prescriptionTarget && (
          <PrescriptionUploadModal
            patientId={prescriptionTarget.id}
            patientName={prescriptionTarget.name}
            doctorName={prescriptionTarget.doctorName}
            mode="manual"
            setNotice={setNotice}
            onClose={() => setPrescriptionTarget(null)}
          />
        )}
      </>
    );
  }

  const activeCount = visits.filter((v) => v.status !== "closed").length;
  const awaitingDoctorCount = (summary["registered"] || 0) + (summary["triaged"] || 0);
  const bedRequestedCount = summary["bed_requested"] || 0;
  const bedAllocatedCount = summary["bed_allocated"] || 0;

  return (
    <section className="module-page">
      <div className="module-panel-head">
        <p className="muted">
          One board for every patient in the department right now — triaged by
          acuity, tracked from arrival to disposition. Reception allocates the
          physical bed in Bed Management once a bed is requested here.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button variant="ghost" onClick={loadVisits}>
            <FiRefreshCw aria-hidden /> Refresh
          </Button>
          <Button onClick={() => setNewVisitOpen(true)}>
            <FiPlus aria-hidden /> New ER Patient
          </Button>
        </div>
      </div>

      <div className="er-queue-area" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="er-stat-grid" style={{ gap: "1.5rem" }}>
            <div className="er-stat-tile-modern er-stat-tile-neutral">
              <span className="er-stat-icon"><FiUsers aria-hidden /></span>
              <div>
                <p>Active Visits</p>
                <h3>{activeCount}</h3>
              </div>
            </div>
            <div className="er-stat-tile-modern er-stat-tile-active">
              <span className="er-stat-icon"><FiWatch aria-hidden /></span>
              <div>
                <p>Awaiting Doctor</p>
                <h3>{awaitingDoctorCount}</h3>
              </div>
            </div>
            <div className="er-stat-tile-modern er-stat-tile-pending">
              <span className="er-stat-icon"><FiBell aria-hidden /></span>
              <div>
                <p>Bed Requested</p>
                <h3>{bedRequestedCount}</h3>
              </div>
            </div>
            <div className="er-stat-tile-modern er-stat-tile-resolved">
              <span className="er-stat-icon"><FiHome aria-hidden /></span>
              <div>
                <p>Bed Allocated</p>
                <h3>{bedAllocatedCount}</h3>
              </div>
            </div>
          </div>

          <div className="panel">
            <Tabs>
              <TabsTrigger active={tab === "queue"} onClick={() => setTab("queue")}>
                Queue
              </TabsTrigger>
              <TabsTrigger active={tab === "config"} onClick={() => setTab("config")}>
                Triage Configuration
              </TabsTrigger>
            </Tabs>

            {tab === "queue" && (
              <div style={{ display: "flex", justifyContent: "flex-end", margin: "0.7rem 0 0" }}>
                <Select
                  value={queueFilter}
                  onChange={(e) => setQueueFilter(e.target.value as "active" | "closed" | "all")}
                  style={{ width: "auto", minWidth: "160px" }}
                  aria-label="Filter ER visits"
                >
                  <option value="active">Active visits</option>
                  <option value="closed">Closed visits</option>
                  <option value="all">All visits</option>
                </Select>
              </div>
            )}

            {tab === "queue" ? (
              loading ? (
                <p className="muted">Loading ER visits...</p>
              ) : visits.length === 0 ? (
                <div className="module-empty-state">
                  <p className="module-empty-state-title">
                    {queueFilter === "closed" ? "No closed ER visits" : queueFilter === "all" ? "No ER visits yet" : "No active ER visits"}
                  </p>
                  <p className="module-empty-state-hint">
                    {queueFilter === "active" ? "Register a new ER visit to get started." : "Switch the filter above to see other visits."}
                  </p>
                </div>
              ) : (
                <div className="er-queue-table">
                  <Table>
                    <TableHead>
                      <TableCell>Visit</TableCell>
                      <TableCell>Triage</TableCell>
                      <TableCell>Patient</TableCell>
                      <TableCell>Arrived</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Doctor</TableCell>
                      <TableCell />
                    </TableHead>
                    {visits.map((v) => (
                      <TableRow
                        key={v.id}
                        className="er-queue-row-modern"
                        style={{ boxShadow: `inset 4px 0 0 0 ${triageColorFor(v.triage_category, categories)}` }}
                      >
                        <TableCell style={{ fontWeight: 700 }}>{v.visit_no}</TableCell>
                        <TableCell>
                          {v.triage_category ? (
                            <TriageChip category={v.triage_category} categories={categories} compact />
                          ) : (
                            <span className="muted" style={{ fontSize: "0.8rem" }}>Not triaged</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {v.is_unknown_patient ? (
                            <span>
                              <FiHelpCircle aria-hidden style={{ marginRight: "0.3rem", color: "#b3451f" }} />
                              <span className="er-queue-patient-name">{v.unknown_patient_label || "Unidentified Trauma Patient"}</span>
                            </span>
                          ) : (
                            <div>
                              <span className="er-queue-patient-name" style={{ fontWeight: 600 }}>
                                {[v.patient_name, v.patient_last_name].filter(Boolean).join(" ") || v.patient_id}
                              </span>
                              <span className="muted" style={{ fontSize: "0.75rem", display: "block" }}>
                                {v.patient_id}{v.patient_gender ? ` · ${v.patient_gender}` : ""}{v.patient_age ? ` · ${v.patient_age}y` : ""}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="er-elapsed">
                            <FiClock aria-hidden style={{ marginRight: "0.3rem" }} />
                            {elapsedSince(v.arrival_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={v.status} />
                        </TableCell>
                        <TableCell>
                          {v.assigned_doctor_name || (
                            <span className="muted">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedVisitId(v.id)}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </Table>
                </div>
              )
            ) : (
              <TriageConfigPanel
                categories={categories}
                setNotice={setNotice}
                onCreated={loadCategories}
              />
            )}
          </div>
        </div>

      {prescriptionTarget && (
        <PrescriptionUploadModal
          patientId={prescriptionTarget.id}
          patientName={prescriptionTarget.name}
          doctorName={prescriptionTarget.doctorName}
          mode="manual"
          setNotice={setNotice}
          onClose={() => setPrescriptionTarget(null)}
        />
      )}

      <Modal
        open={newVisitOpen}
        onClose={() => setNewVisitOpen(false)}
        title="New ER Patient"
        description="Register, log complaints/vitals, and run AI triage in one flow -- you'll land on the patient's visit page as soon as it's created."
        className="ui-modal-wide"
      >
        <QuickIntakePanel
          setNotice={setNotice}
          categories={categories}
          prefillPatient={prefillPatient}
          onCreated={(visitId) => {
            setNewVisitOpen(false);
            loadVisits();
            setSelectedVisitId(visitId);
          }}
          onNavigate={onNavigate}
        />
      </Modal>
    </section>
  );
}

// ==================== Quick Intake ====================

type PatientMode = "existing" | "new" | "unknown";

function QuickIntakePanel({
  setNotice,
  categories,
  prefillPatient,
  onCreated,
  onNavigate,
}: {
  setNotice: (notice: Notice | null) => void;
  categories: TriageCategory[];
  prefillPatient?: { patient_id: string; name: string; last_name?: string } | null;
  onCreated: (visitId: number) => void;
  onNavigate?: (page: string, extraData?: any) => void;
}) {
  const [patientMode, setPatientMode] = useState<PatientMode>("new");

  // Existing patient search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // New ER Patient Registration Fields
  const [newName, setNewName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newGender, setNewGender] = useState("Male");
  const [newAge, setNewAge] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmergencyContact, setNewEmergencyContact] = useState("");
  const [newGuardianName, setNewGuardianName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newAllergies, setNewAllergies] = useState("");
  // Medico-Legal Case -- required on every real ED admission record (RTA,
  // assault, poisoning, etc. must be flagged for police/legal reporting);
  // always has a determinate value, defaulting to "No" rather than blank.
  const [newMlc, setNewMlc] = useState<"No" | "Yes">("No");

  // Unknown patient description
  const [unknownLabel, setUnknownLabel] = useState("");

  // Clinical Intake
  const [arrivalMode, setArrivalMode] = useState("walk-in");
  const [conditionAtArrival, setConditionAtArrival] = useState("");
  const [complaint, setComplaint] = useState("");
  const [caseCategory, setCaseCategory] = useState("");
  // Initial Emergency Vitals
  const [vitalsHr, setVitalsHr] = useState("");
  const [vitalsBpSys, setVitalsBpSys] = useState("");
  const [vitalsBpDia, setVitalsBpDia] = useState("");
  const [vitalsSpo2, setVitalsSpo2] = useState("");
  const [vitalsRr, setVitalsRr] = useState("");
  const [vitalsTemp, setVitalsTemp] = useState("");
  const [vitalsGrbs, setVitalsGrbs] = useState("");
  const [vitalsPainScore, setVitalsPainScore] = useState("");
  const [vitalsConsciousness, setVitalsConsciousness] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prefillPatient) return;
    setPatientMode("existing");
    setSelectedPatient(prefillPatient as Patient);
  }, [prefillPatient]);

  useEffect(() => {
    if (patientMode !== "existing" || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await apiFetch<{ patients: Patient[] }>(
          `/api/patients?q=${encodeURIComponent(searchQuery.trim())}`,
        );
        setSearchResults((data.patients || []).slice(0, 8));
      } catch (error) {
        console.error(error);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [searchQuery, patientMode]);

  const submit = async () => {
    if (patientMode === "existing" && !selectedPatient) {
      setNotice({ type: "error", message: "Select a patient first." });
      return;
    }
    if (patientMode === "new") {
      const missing: string[] = [];
      if (!newName.trim()) missing.push("Name");
      if (!newAge.trim()) missing.push("Age");
      if (!newGender) missing.push("Gender");
      if (!newPhone.trim()) missing.push("Phone");
      if (!newEmergencyContact.trim()) missing.push("Emergency Contact");
      if (missing.length) {
        setNotice({ type: "error", message: `Required for ER registration: ${missing.join(", ")}.` });
        return;
      }
      if (!/^\d{10}$/.test(newPhone.trim())) {
        setNotice({ type: "warning", message: "Patient phone number must be exactly 10 digits." });
        return;
      }
      if (!/^\d{10}$/.test(newEmergencyContact.trim())) {
        setNotice({ type: "warning", message: "Emergency contact number must be exactly 10 digits." });
        return;
      }
    }
    if (patientMode === "unknown" && !unknownLabel.trim()) {
      setNotice({
        type: "error",
        message: 'Describe the unknown patient (e.g. "Unidentified male, approx 35-40").',
      });
      return;
    }

    setSaving(true);
    try {
      let visitId: number;
      let visitNo: string;
      let registeredId: string;

      if (patientMode === "new") {
        // Direct Standalone ER Patient Registration
        const vPayload: any = {};
        if (vitalsHr.trim()) vPayload.heart_rate = parseInt(vitalsHr);
        if (vitalsBpSys.trim()) vPayload.bp_systolic = parseInt(vitalsBpSys);
        if (vitalsBpDia.trim()) vPayload.bp_diastolic = parseInt(vitalsBpDia);
        if (vitalsSpo2.trim()) vPayload.spo2 = parseInt(vitalsSpo2);
        if (vitalsRr.trim()) vPayload.respiratory_rate = parseInt(vitalsRr);
        if (vitalsTemp.trim()) vPayload.temperature = parseFloat(vitalsTemp);
        if (vitalsGrbs.trim()) vPayload.blood_glucose = parseInt(vitalsGrbs);
        if (vitalsPainScore.trim()) vPayload.pain_score = parseInt(vitalsPainScore);
        if (vitalsConsciousness.trim()) vPayload.consciousness_level = vitalsConsciousness.trim();

        const regRes = await apiFetch<{
          patient_id: string;
          patient: Patient;
          visit: { id: number; visit_no: string };
        }>("/api/er/register-patient", {
          method: "POST",
          body: JSON.stringify({
            patient: {
              name: newName.trim(),
              last_name: newLastName.trim(),
              gender: newGender,
              age: newAge.trim() ? parseInt(newAge) : undefined,
              phone: newPhone.trim(),
              emergency_contact: newEmergencyContact.trim(),
              guardian_name: newGuardianName.trim(),
              address: newAddress.trim(),
              allergies: newAllergies.trim(),
            },
            visit: {
              arrival_mode: arrivalMode,
              condition_at_arrival: conditionAtArrival || undefined,
              police_involved: newMlc === "Yes",
            },
            complaint: complaint.trim()
              ? [{ complaint: complaint.trim(), case_category: caseCategory || undefined }]
              : undefined,
            vitals: Object.keys(vPayload).length > 0 ? vPayload : undefined,
          }),
        });

        visitId = regRes.visit.id;
        visitNo = regRes.visit.visit_no;
        registeredId = regRes.patient_id;
      } else {
        // Existing or Unknown mode
        let patientId: string | undefined;
        if (patientMode === "existing") {
          patientId = selectedPatient!.patient_id;
        }

        const payload: Record<string, unknown> = {
          arrival_mode: arrivalMode,
          condition_at_arrival: conditionAtArrival || undefined,
          police_involved: newMlc === "Yes",
        };
        if (patientMode === "unknown") {
          payload.is_unknown_patient = true;
          payload.unknown_patient_label = unknownLabel.trim();
        } else {
          payload.patient_id = patientId;
        }

        const visitRes = await apiFetch<{ id: number; visit_no: string }>(
          "/api/er/visits",
          { method: "POST", body: JSON.stringify(payload) },
        );
        visitId = visitRes.id;
        visitNo = visitRes.visit_no;
        registeredId = patientId || unknownLabel;

        // Add Complaints
        if (complaint.trim()) {
          await apiFetch(`/api/er/visits/${visitId}/complaints`, {
            method: "POST",
            body: JSON.stringify({
              complaint: complaint.trim(),
              case_category: caseCategory || undefined,
            }),
          });
        }

        // Add Vitals
        const vPayload: any = {};
        if (vitalsHr.trim()) vPayload.heart_rate = parseInt(vitalsHr);
        if (vitalsBpSys.trim()) vPayload.bp_systolic = parseInt(vitalsBpSys);
        if (vitalsBpDia.trim()) vPayload.bp_diastolic = parseInt(vitalsBpDia);
        if (vitalsSpo2.trim()) vPayload.spo2 = parseInt(vitalsSpo2);
        if (vitalsRr.trim()) vPayload.respiratory_rate = parseInt(vitalsRr);
        if (vitalsTemp.trim()) vPayload.temperature = parseFloat(vitalsTemp);
        if (vitalsGrbs.trim()) vPayload.blood_glucose = parseInt(vitalsGrbs);
        if (vitalsPainScore.trim()) vPayload.pain_score = parseInt(vitalsPainScore);
        if (vitalsConsciousness.trim()) vPayload.consciousness_level = vitalsConsciousness.trim();
        if (Object.keys(vPayload).length > 0) {
          await apiFetch(`/api/er/visits/${visitId}/vitals`, {
            method: "POST",
            body: JSON.stringify(vPayload),
          });
        }
      }

      // Build symptoms text for AI triage
      let symptomsText = "";
      if (complaint.trim()) symptomsText += `Complaints: ${complaint.trim()}. `;
      const vitalsParts: string[] = [];
      if (vitalsHr.trim()) vitalsParts.push(`HR: ${vitalsHr} bpm`);
      if (vitalsBpSys.trim() && vitalsBpDia.trim()) vitalsParts.push(`BP: ${vitalsBpSys}/${vitalsBpDia} mmHg`);
      if (vitalsSpo2.trim()) vitalsParts.push(`SpO2: ${vitalsSpo2}%`);
      if (vitalsRr.trim()) vitalsParts.push(`RR: ${vitalsRr} /min`);
      if (vitalsTemp.trim()) {
        const tempVal = parseFloat(vitalsTemp);
        const tempUnit = tempVal > 45 ? "°F" : "°C";
        vitalsParts.push(`Temp: ${vitalsTemp}${tempUnit}`);
      }
      if (vitalsGrbs.trim()) vitalsParts.push(`GRBS: ${vitalsGrbs} mg/dL`);
      if (vitalsPainScore.trim()) vitalsParts.push(`Pain: ${vitalsPainScore}/10`);
      if (vitalsConsciousness.trim()) vitalsParts.push(`Consciousness: ${vitalsConsciousness}`);
      if (vitalsParts.length > 0) symptomsText += `Vitals: ${vitalsParts.join(", ")}`;

      // Run AI Triage if complaints/vitals exist
      if (symptomsText.trim()) {
        try {
          const aiRes = await fetchAiTriageSuggestion(symptomsText);
          const categoryCode = mapUrgencyToTriageCategory(aiRes.urgency, categories);
          if (categoryCode) {
            await apiFetch(`/api/er/visits/${visitId}/triage`, {
              method: "POST",
              body: JSON.stringify({
                category: categoryCode,
                reason: (aiRes.reasoning || "AI Clinical Triage").substring(0, 500),
              }),
            });
          }

          if (aiRes.doctor || aiRes.department) {
            await apiFetch(`/api/er/visits/${visitId}/assign-doctor`, {
              method: "POST",
              body: JSON.stringify({
                specialty: aiRes.department || "Emergency",
                doctor_name: aiRes.doctor || undefined,
              }),
            });
          }

          const treatmentsToApply = aiRes.suggested_treatments && aiRes.suggested_treatments.length > 0
            ? aiRes.suggested_treatments
            : aiRes.suggested_treatment?.intervention_type
            ? [aiRes.suggested_treatment]
            : [];

          for (const tr of treatmentsToApply) {
            if (tr.intervention_type) {
              await apiFetch(`/api/er/visits/${visitId}/treatments`, {
                method: "POST",
                body: JSON.stringify({
                  intervention_type: tr.intervention_type,
                  description: tr.description || "Emergency protocol per AI Triage",
                }),
              });
            }
          }
        } catch (aiErr) {
          console.warn("AI Triage auto-execution failed:", aiErr);
        }
      }

      setNotice({
        type: "success",
        message:
          patientMode === "new"
            ? `ER Patient ${registeredId} registered (${visitNo}) & AI triaged.`
            : `ER visit ${visitNo} admitted & AI triaged.`,
      });

      // Reset form
      setNewName("");
      setNewLastName("");
      setNewAge("");
      setNewPhone("");
      setNewEmergencyContact("");
      setNewGuardianName("");
      setNewAddress("");
      setNewMlc("No");
      setCaseCategory("");
      setNewAllergies("");
      setSearchQuery("");
      setSelectedPatient(null);
      setUnknownLabel("");
      setComplaint("");
      setVitalsHr("");
      setVitalsBpSys("");
      setVitalsBpDia("");
      setVitalsSpo2("");
      setVitalsTemp("");
      setVitalsGrbs("");

      onCreated(visitId);
    } catch (error: any) {
      reportError(
        setNotice,
        error,
        "Failed to complete the Emergency Intake process.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="er-intake-panel">
      {/* 1. Identity Section */}
      <div style={{ marginBottom: "1.2rem" }}>
        <Label>1. Patient Registration & Identity</Label>
        <div className="er-mode-grid" style={{ marginBottom: "1rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            className={`er-mode-card${patientMode === "new" ? " er-mode-card-active" : ""}`}
            onClick={() => setPatientMode("new")}
          >
            <FiUserPlus aria-hidden />
            New ER Patient
          </button>
          <button
            type="button"
            className={`er-mode-card${patientMode === "existing" ? " er-mode-card-active" : ""}`}
            onClick={() => setPatientMode("existing")}
          >
            <FiSearch aria-hidden />
            Search Existing
          </button>
          <button
            type="button"
            className={`er-mode-card${patientMode === "unknown" ? " er-mode-card-active" : ""}`}
            onClick={() => setPatientMode("unknown")}
          >
            <FiHelpCircle aria-hidden />
            Unidentified
          </button>
        </div>

        {patientMode === "new" && (
          <div className="er-registration-form">
            <div className="er-registration-section">
              <p className="er-registration-section-title">Patient Details</p>
              <div className="er-registration-grid">
                <div>
                  <Label htmlFor="er-new-name" className="er-field-label">
                    First Name<span className="er-field-required">*</span>
                  </Label>
                  <Input id="er-new-name" placeholder="e.g. Rahul" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="er-new-lastname" className="er-field-label">Last Name</Label>
                  <Input id="er-new-lastname" placeholder="e.g. Sharma" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="er-new-age" className="er-field-label">
                    Age<span className="er-field-required">*</span>
                  </Label>
                  <Input id="er-new-age" type="number" placeholder="Yrs" value={newAge} onChange={(e) => setNewAge(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="er-new-gender" className="er-field-label">
                    Gender<span className="er-field-required">*</span>
                  </Label>
                  <Select id="er-new-gender" value={newGender} onChange={(e) => setNewGender(e.target.value)}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="er-new-phone" className="er-field-label">
                    Phone<span className="er-field-required">*</span>
                  </Label>
                  <Input
                    id="er-new-phone"
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="er-new-emg-contact" className="er-field-label">
                    Emergency Contact<span className="er-field-required">*</span>
                  </Label>
                  <Input
                    id="er-new-emg-contact"
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit emergency contact number"
                    value={newEmergencyContact}
                    onChange={(e) => setNewEmergencyContact(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="er-registration-section">
              <p className="er-registration-section-title">Family & Address</p>
              <div className="er-registration-grid">
                <div>
                  <Label htmlFor="er-new-guardian" className="er-field-label">Guardian / Family Member Name</Label>
                  <Input id="er-new-guardian" placeholder="Enter father's / spouse's / relative's name" value={newGuardianName} onChange={(e) => setNewGuardianName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="er-new-address" className="er-field-label">Address</Label>
                  <Input id="er-new-address" placeholder="Enter residential address (Street, Area, City/Town)" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
                </div>
                <div className="full-span">
                  <Label htmlFor="er-new-allergies" className="er-field-label">Known Allergies</Label>
                  <Input id="er-new-allergies" placeholder="e.g. Penicillin, NSAIDs (optional)" value={newAllergies} onChange={(e) => setNewAllergies(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {patientMode === "existing" && (
          <div>
            {selectedPatient ? (
              <div className="er-selected-patient">
                <span>
                  {selectedPatient.name} {selectedPatient.last_name} — {selectedPatient.patient_id}
                </span>
                <Button size="sm" variant="ghost" onClick={() => { setSelectedPatient(null); setSearchQuery(""); }}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="ai-search-bar">
                  <FiSearch className="ai-search-icon" aria-hidden />
                  <Input
                    className="ai-search-input"
                    placeholder="Search name, ID, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="er-patient-search-results">
                    {searchResults.map((p) => (
                      <button
                        key={p.patient_id}
                        type="button"
                        className="er-patient-search-row"
                        onClick={() => setSelectedPatient(p)}
                      >
                        <span>
                          {p.name} {p.last_name}
                        </span>
                        <span className="muted">{p.patient_id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {patientMode === "unknown" && (
          <div>
            <Label htmlFor="er-unknown-label">Unidentified Patient Description</Label>
            <Input
              id="er-unknown-label"
              placeholder="e.g. Unidentified male, approx 35-40, found unconscious"
              value={unknownLabel}
              onChange={(e) => setUnknownLabel(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* 2. Clinical Intake Section */}
      <div style={{ marginBottom: "1.2rem" }}>
        <Label>2. Arrival & Complaints</Label>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", marginBottom: "0.5rem" }}>
          <div style={{ flex: 1 }}>
            <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Arrival Mode</Label>
            <Select value={arrivalMode} onChange={(e) => setArrivalMode(e.target.value)}>
              {ARRIVAL_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div style={{ flex: 1 }}>
            <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Condition on arrival</Label>
            <Select value={conditionAtArrival} onChange={(e) => setConditionAtArrival(e.target.value)}>
              <option value="">Select...</option>
              {ARRIVAL_CONDITION_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Chief Complaints / Trauma Details</Label>
          <Textarea
            rows={2}
            placeholder="e.g. Severe acute chest pain radiating to left arm, shortness of breath..."
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
          />
        </div>
        <div className="er-registration-grid" style={{ marginTop: "0.6rem" }}>
          <div>
            <Label htmlFor="er-mlc" className="er-field-label">
              Medico-Legal Case (MLC)<span className="er-field-required">*</span>
            </Label>
            <Select
              id="er-mlc"
              value={newMlc}
              onChange={(e) => {
                const value = e.target.value as "No" | "Yes";
                setNewMlc(value);
                // The category list below is filtered by this choice --
                // clear a selection that no longer belongs to it rather
                // than silently leaving a mismatched category in place.
                const stillValid = CASE_CATEGORY_OPTIONS.find((c) => c.value === caseCategory)?.mlc === (value === "Yes");
                if (!stillValid) setCaseCategory("");
              }}
            >
              <option value="No">No -- ordinary illness (e.g. fever)</option>
              <option value="Yes">Yes -- RTA, assault, burns, poisoning, etc.</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="er-case-category" className="er-field-label">Case Category</Label>
            <Select
              id="er-case-category"
              value={caseCategory}
              onChange={(e) => setCaseCategory(e.target.value)}
            >
              <option value="">Select...</option>
              {CASE_CATEGORY_OPTIONS.filter((c) => c.mlc === (newMlc === "Yes")).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <p className="er-field-hint full-span">
            Case categories shown depend on the MLC answer -- switch it above to see the other set.
            Requires police intimation: RTA, assault/stabbing, burns, poisoning, hanging.
          </p>
        </div>
      </div>

      {/* 3. Vitals Section */}
      <div style={{ marginBottom: "1.2rem" }}>
        <Label>3. Initial Emergency Vitals (Triage)</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem" }}>
          <div>
            <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Pulse / Heart Rate (bpm)</Label>
            <Input type="number" placeholder="e.g. 78 (60-100)" value={vitalsHr} onChange={e => setVitalsHr(e.target.value)} />
          </div>
          <div>
            <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Oxygen Saturation SpO₂ (%)</Label>
            <Input type="number" placeholder="e.g. 98 (95-100%)" value={vitalsSpo2} onChange={e => setVitalsSpo2(e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Systolic BP (mmHg)</Label>
              <Input type="number" placeholder="e.g. 120" value={vitalsBpSys} onChange={e => setVitalsBpSys(e.target.value)} />
            </div>
            <span style={{ marginTop: "1.2rem", color: "#94a3b8", fontWeight: 700 }}>/</span>
            <div style={{ flex: 1 }}>
              <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Diastolic BP (mmHg)</Label>
              <Input type="number" placeholder="e.g. 80" value={vitalsBpDia} onChange={e => setVitalsBpDia(e.target.value)} />
            </div>
          </div>
          <div>
            <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Respiratory Rate (breaths/min)</Label>
            <Input type="number" placeholder="e.g. 16 (12-20)" value={vitalsRr} onChange={e => setVitalsRr(e.target.value)} />
          </div>
          <div>
            <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Body Temperature (°F / °C)</Label>
            <Input type="number" step="0.1" placeholder="e.g. 98.6°F or 37.0°C" value={vitalsTemp} onChange={e => setVitalsTemp(e.target.value)} />
          </div>
          <div>
            <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Blood Glucose / GRBS (mg/dL)</Label>
            <Input type="number" placeholder="e.g. 110 (70-140)" value={vitalsGrbs} onChange={e => setVitalsGrbs(e.target.value)} />
          </div>
          <div>
            <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Pain Score (0–10 VAS)</Label>
            <Input type="number" min={0} max={10} placeholder="0 (None) to 10 (Severe)" value={vitalsPainScore} onChange={e => setVitalsPainScore(e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Consciousness Level (AVPU Scale)</Label>
            <Select value={vitalsConsciousness} onChange={e => setVitalsConsciousness(e.target.value)}>
              <option value="">Select consciousness assessment...</option>
              {CONSCIOUSNESS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <Button
          style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", fontWeight: 600 }}
          onClick={submit}
          disabled={
            saving ||
            (patientMode === "new" &&
              (!newName.trim() || !newAge.trim() || !newGender || !newPhone.trim() || !newEmergencyContact.trim())) ||
            (patientMode === "unknown" && !unknownLabel.trim()) ||
            (patientMode === "existing" && !selectedPatient)
          }
        >
          {saving ? (
            "Registering & Triaging..."
          ) : patientMode === "new" ? (
            <>
              <FiUserPlus aria-hidden style={{ marginRight: "0.4rem" }} /> Register & Admit to ER
            </>
          ) : patientMode === "unknown" ? (
            <>
              <FiHelpCircle aria-hidden style={{ marginRight: "0.4rem" }} /> Admit Unidentified Patient
            </>
          ) : (
            <>
              <FiPlus aria-hidden style={{ marginRight: "0.4rem" }} /> Admit Patient to ER
            </>
          )}
        </Button>
        <p className="muted" style={{ fontSize: "0.75rem", textAlign: "center", marginTop: "0.5rem" }}>
          Instant standalone ER registration with automatic AI triage priority.
        </p>
      </div>
    </div>
  );
}

// ==================== Triage Configuration ====================

function TriageConfigPanel({
  categories,
  setNotice,
  onCreated,
}: {
  categories: TriageCategory[];
  setNotice: (notice: Notice | null) => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#c0392b");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!code.trim() || !label.trim()) {
      setNotice({ type: "error", message: "Category code and label are required." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/er/triage-config", {
        method: "POST",
        body: JSON.stringify({
          category_code: code.trim(),
          category_label: label.trim(),
          description: description.trim() || undefined,
          color,
          sort_order: categories.length,
        }),
      });
      setCode("");
      setLabel("");
      setDescription("");
      setNotice({ type: "success", message: "Triage category added." });
      onCreated();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to add triage category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {categories.length === 0 ? (
        <div className="module-empty-state">
          <p className="module-empty-state-title">No triage categories configured</p>
          <p className="module-empty-state-hint">
            Triage can't be used until your hospital's clinical team defines its own
            priority categories (e.g. B1-B4) below — nothing is pre-filled on purpose.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.25rem" }}>
          {categories.map((c) => (
            <div key={c.id} title={c.description || undefined}>
              <TriageChip category={c.category_code} categories={categories} />
            </div>
          ))}
        </div>
      )}

      <div className="module-form-grid">
        <div>
          <Label htmlFor="triage-code">Category code</Label>
          <Input id="triage-code" placeholder="B1" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="triage-label">Label</Label>
          <Input
            id="triage-label"
            placeholder="Immediate / Life-threatening"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="triage-desc">Clinical criteria / description</Label>
          <Textarea
            id="triage-desc"
            placeholder="Describe your hospital's own criteria for this category"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="triage-color">Color</Label>
          <Input id="triage-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </div>
      <Button onClick={submit} disabled={saving} style={{ marginTop: "0.75rem" }}>
        {saving ? "Adding..." : "Add Triage Category"}
      </Button>
    </div>
  );
}

// ==================== Visit Detail ====================

function SectionHead({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="er-section-head">
      <span className="er-section-icon">{icon}</span>
      <h3>{title}</h3>
      {action && <div className="er-section-head-actions">{action}</div>}
    </div>
  );
}

function VisitDetailPanel({
  detail,
  loading,
  categories,
  setNotice,
  onNavigate,
  onBack,
  onRefresh,
  onOrderMedication,
}: {
  detail: ErVisitDetail;
  loading: boolean;
  categories: TriageCategory[];
  setNotice: (notice: Notice | null) => void;
  onNavigate?: (page: string, extraData?: any) => void;
  onBack: () => void;
  onRefresh: () => void;
  onOrderMedication: () => void;
}) {
  const patientFullName = detail.patient
    ? [detail.patient.name, detail.patient.last_name].filter(Boolean).join(" ")
    : null;
  const patientLabel = detail.is_unknown_patient
    ? detail.unknown_patient_label || "Unidentified Trauma Patient"
    : patientFullName
      ? `${patientFullName} (${detail.patient_id})`
      : detail.patient_id;

  // Set by AITriagePanel's onSuggestion -- flows down into TriageForm /
  // DoctorAssignForm / AddTreatmentForm as a one-shot starting value for
  // their own fields (never written to the visit directly). A fresh object
  // reference each run so each form's useEffect re-fires even if the AI
  // suggests the exact same thing twice in a row.
  const [aiPrefills, setAiPrefills] = useState<AiSectionPrefills>({
    triage: null,
    doctor: null,
    treatment: null,
  });

  const [viewTab, setViewTab] = useState<"clinical" | "timeline">("clinical");
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [consents, setConsents] = useState<ErConsent[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState<"admission" | "emergency" | null>(null);
  const [showLamaModal, setShowLamaModal] = useState(false);

  const loadConsents = async () => {
    setLoadingConsents(true);
    try {
      const res = await apiFetch<{ consents: ErConsent[] }>(`/api/er/visits/${detail.id}/consents`);
      setConsents(res.consents || []);
    } catch {
      setConsents([]);
    } finally {
      setLoadingConsents(false);
    }
  };

  useEffect(() => {
    void loadConsents();
  }, [detail.id]);

  const pendingBedRequest = detail.bed_requests.find((r) => r.status === "pending");
  const closedOrNoBedNeeded =
    detail.disposition && !OUTCOMES_REQUIRING_BED.has(detail.disposition.outcome);
  const currentStep = coreStepIndex(detail.status);

  return (
    <section className="module-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <Button variant="ghost" onClick={onBack} className="er-visit-header-back">
          <FiArrowLeft aria-hidden /> Back to Queue
        </Button>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowHandoverModal(true)}
            style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}
          >
            <FiPrinter aria-hidden /> Clinical Handover Sheet
          </Button>
        </div>
      </div>

      <div className="er-visit-header">
        <div>
          <h2 className="er-visit-no">{detail.visit_no}</h2>
          <p className="er-visit-sub">
            {detail.is_unknown_patient && <FiHelpCircle aria-hidden style={{ marginRight: "0.3rem" }} />}
            {patientLabel} &middot; Arrived {formatDateTimeIST(detail.arrival_at)}
            {detail.arrival_mode ? ` (${detail.arrival_mode})` : ""}
          </p>
        </div>
        <div className="er-visit-header-meta">
          <StatusBadge status={detail.status} />
          {detail.triage && (
            <TriageChip
              category={detail.triage.category}
              categories={categories}
              bedLabel={detail.triage.triage_bed_label}
            />
          )}
        </div>
      </div>

      {/* View Switcher: Clinical Flow vs Chronological Timeline */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          type="button"
          className={`btn btn-sm ${viewTab === "clinical" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setViewTab("clinical")}
          style={{ borderRadius: "20px", padding: "0.35rem 1.2rem", fontSize: "0.85rem" }}
        >
          <FiActivity aria-hidden style={{ marginRight: "0.3rem" }} /> Clinical Workflow & Care
        </button>
        <button
          type="button"
          className={`btn btn-sm ${viewTab === "timeline" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setViewTab("timeline")}
          style={{ borderRadius: "20px", padding: "0.35rem 1.2rem", fontSize: "0.85rem" }}
        >
          <FiClock aria-hidden style={{ marginRight: "0.3rem" }} /> Chronological Event Timeline
        </button>
      </div>

      {viewTab === "timeline" ? (
        <div className="panel">
          <SectionHead icon={<FiClock aria-hidden />} title="Chronological Emergency Event Timeline (Hosp AI)" />
          <ErTimelineView detail={detail} categories={categories} />
        </div>
      ) : (
        <>
          <div className="journey-steps" role="list" aria-label="ER visit progress">
            {CORE_STEPS.map((s, index) => {
              const isDone = index < currentStep;
              const isActive = index === currentStep;
              const state = isActive
                ? "journey-step-active"
                : isDone
                  ? "journey-step-completed"
                  : "journey-step-upcoming";
              return (
                <div className="journey-step-wrap" key={s.key}>
                  <div className={`journey-step ${state}`}>
                    <span className="journey-step-circle">
                      {isDone ? <FiCheck aria-hidden /> : index + 1}
                    </span>
                    <span className="journey-step-text">
                      <span className="journey-step-label">{s.label}</span>
                      <span className="journey-step-hint">{s.hint}</span>
                    </span>
                  </div>
                  {index < CORE_STEPS.length - 1 && (
                    <span className={isDone ? "journey-step-connector filled" : "journey-step-connector"} />
                  )}
                </div>
              );
            })}
          </div>

          {loading && <p className="muted">Refreshing...</p>}

          <div className="er-detail-layout">
            <div className="er-detail-sidebar">
              {!detail.is_unknown_patient && (
                <div className="panel" style={{ borderLeft: "4px solid #3b82f6" }}>
                  <SectionHead icon={<FiUser aria-hidden />} title="Patient Record" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem" }}>
                    <div>
                      <strong style={{ fontSize: "1rem", color: "#1e293b", display: "block" }}>
                        {patientFullName || detail.patient_id}
                      </strong>
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        ID: {detail.patient_id}
                      </span>
                    </div>
                    {detail.patient && (
                      <>
                        <div style={{ display: "flex", gap: "0.8rem", color: "#475569", flexWrap: "wrap" }}>
                          {detail.patient.gender && <span>Gender: <strong>{detail.patient.gender}</strong></span>}
                          {detail.patient.age && <span>Age: <strong>{detail.patient.age}y</strong></span>}
                          {detail.patient.blood_group && <span>Blood: <strong>{detail.patient.blood_group}</strong></span>}
                        </div>
                        {detail.patient.phone && (
                          <div style={{ color: "#475569" }}>
                            Phone: <span>{detail.patient.phone}</span>
                          </div>
                        )}
                        {detail.patient.guardian_name && (
                          <div style={{ color: "#475569" }}>
                            Guardian / Relative: <strong>{detail.patient.guardian_name}</strong>
                          </div>
                        )}
                        {detail.patient.emergency_contact && (
                          <div style={{ color: "#dc2626" }}>
                            Emergency Contact: <strong>{detail.patient.emergency_contact}</strong>
                          </div>
                        )}
                        {detail.patient.address && (
                          <div style={{ color: "#475569", fontSize: "0.85rem" }}>
                            Address: <span>{detail.patient.address}</span>
                          </div>
                        )}
                        {detail.patient.allergies && (
                          <div style={{ color: "#b45309" }}>
                            Allergies: <span>{detail.patient.allergies}</span>
                          </div>
                        )}
                      </>
                    )}
                    {detail.arrival_mode && (
                      <div className="muted" style={{ fontSize: "0.8rem", marginTop: "0.2rem" }}>
                        Arrival Mode: <strong>{detail.arrival_mode}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detail.is_unknown_patient && (
                <MergeUnknownPatient
                  visitId={detail.id}
                  setNotice={setNotice}
                  onMerged={onRefresh}
                  onNavigate={onNavigate}
                />
              )}

              <div className="panel">
                <SectionHead icon={<FiActivity aria-hidden />} title="Vitals" />
                <VitalsList vitals={detail.vitals} />
                <AddVitalsForm visitId={detail.id} setNotice={setNotice} onAdded={onRefresh} />
              </div>

              <div className="panel">
                <SectionHead icon={<FiAlertTriangle aria-hidden />} title="Triage" />
                {detail.triage ? (
                  <p>
                    <TriageChip category={detail.triage.category} categories={categories} bedLabel={detail.triage.triage_bed_label} />
                    <br />
                    <span className="muted" style={{ display: "inline-block", marginTop: "0.4rem" }}>
                      {detail.triage.reason} &middot; {formatDateTimeIST(detail.triage.triaged_at)}
                    </span>
                  </p>
                ) : (
                  <p className="muted">Not yet triaged.</p>
                )}
                <TriageForm
                  visitId={detail.id}
                  categories={categories}
                  existing={detail.triage}
                  aiPrefill={aiPrefills.triage}
                  setNotice={setNotice}
                  onSaved={onRefresh}
                />
              </div>
            </div>

            <div className="er-detail-main">
              <AITriagePanel
                detail={detail}
                categories={categories}
                setNotice={setNotice}
                onRefresh={onRefresh}
                onSuggestion={(prefills) => setAiPrefills(prefills)}
              />

              <div className="panel">
                <SectionHead icon={<FiClipboard aria-hidden />} title="Chief Complaints" />
                <ComplaintList complaints={detail.complaints} />
                <AddComplaintForm visitId={detail.id} setNotice={setNotice} onAdded={onRefresh} />
              </div>

              <div className="panel">
                <SectionHead
                  icon={<FiZap aria-hidden />}
                  title="Emergency Treatment"
                  action={
                    <Button size="sm" onClick={onOrderMedication}>
                      Order Medication
                    </Button>
                  }
                />
                <TreatmentList treatments={detail.treatments} />
                <AddTreatmentForm
                  visitId={detail.id}
                  aiPrefill={aiPrefills.treatment}
                  setNotice={setNotice}
                  onAdded={onRefresh}
                />
              </div>

              <div className="panel">
                <SectionHead icon={<FiUserCheck aria-hidden />} title="Doctor Assignment" />
                <p>
                  {detail.assigned_doctor_name ? (
                    <>
                      <strong>{detail.assigned_doctor_name}</strong> ({detail.assigned_specialty})
                      {detail.doctor_accepted_at ? (
                        <span className="er-status-badge er-status-resolved" style={{ marginLeft: "0.5rem" }}>Accepted</span>
                      ) : (
                        <span className="er-status-badge er-status-pending" style={{ marginLeft: "0.5rem" }}>Pending accept</span>
                      )}
                    </>
                  ) : (
                    <span className="muted">No doctor assigned yet.</span>
                  )}
                </p>
                <DoctorAssignForm
                  visitId={detail.id}
                  existingDoctor={detail.assigned_doctor_name}
                  existingSpecialty={detail.assigned_specialty}
                  aiPrefill={aiPrefills.doctor}
                  setNotice={setNotice}
                  onSaved={onRefresh}
                />
                {detail.assigned_doctor_name && !detail.doctor_accepted_at && (
                  <Button
                    size="sm"
                    variant="secondary"
                    style={{ marginTop: "0.5rem" }}
                    onClick={async () => {
                      try {
                        await apiFetch(`/api/er/visits/${detail.id}/accept`, { method: "POST" });
                        onRefresh();
                      } catch (error: any) {
                        reportError(setNotice, error, "Failed to accept the assignment.");
                      }
                    }}
                  >
                    Doctor Accepts Patient
                  </Button>
                )}
              </div>

              <div className="panel">
                <SectionHead icon={<FiFileText aria-hidden />} title="Clinical Notes" />
                <NotesList notes={detail.clinical_notes} />
                <AddNoteForm visitId={detail.id} setNotice={setNotice} onAdded={onRefresh} />
              </div>

              <div className="panel" style={{ borderLeft: "4px solid #f59e0b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <SectionHead icon={<FiShield aria-hidden />} title="Legal Consents & LAMA (Refusal of Care)" />
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <Button size="sm" variant="secondary" onClick={() => setShowConsentModal("admission")}>
                      + Admission Consent
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowConsentModal("emergency")}>
                      + Emergency Procedure Consent
                    </Button>
                    {detail.status !== "closed" && (
                      <Button
                        size="sm"
                        style={{ background: "#dc2626", color: "#fff", borderColor: "#b91c1c" }}
                        onClick={() => setShowLamaModal(true)}
                      >
                        ⚠️ Process LAMA Discharge
                      </Button>
                    )}
                  </div>
                </div>
                <ConsentsList consents={consents} loading={loadingConsents} setNotice={setNotice} onDocumentChanged={loadConsents} />
              </div>

              <div className="panel">
                <SectionHead icon={<FiFlag aria-hidden />} title="Disposition" />
                {detail.disposition ? (
                  <p>
                    <strong>{OUTCOME_OPTIONS.find((o) => o.value === detail.disposition!.outcome)?.label || detail.disposition.outcome}</strong>
                    <br />
                    <span className="muted">{detail.disposition.clinical_reason}</span>
                  </p>
                ) : (
                  <p className="muted">No disposition recorded yet.</p>
                )}

                {!detail.disposition && (
                  <DispositionForm
                    visitId={detail.id}
                    bedNeed={suggestBedNeed(detail.triage_category, detail.assigned_specialty, categories)}
                    setNotice={setNotice}
                    onSaved={onRefresh}
                  />
                )}

                {pendingBedRequest && (
                  <p className="muted">
                    Bed request sent to Bed Management ({pendingBedRequest.requested_level_of_care.toUpperCase()}) —
                    awaiting allocation.
                  </p>
                )}

                {closedOrNoBedNeeded && detail.status !== "closed" && (
                  <CloseVisitPanel visitId={detail.id} setNotice={setNotice} onClosed={onRefresh} />
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showHandoverModal && (
        <ErHandoverModal
          detail={detail}
          categories={categories}
          onClose={() => setShowHandoverModal(false)}
        />
      )}

      {showConsentModal && (
        <ErConsentModal
          detail={detail}
          type={showConsentModal}
          onClose={() => setShowConsentModal(null)}
          onSaved={() => {
            void loadConsents();
            onRefresh();
          }}
          setNotice={setNotice}
        />
      )}

      {showLamaModal && (
        <ErLamaModal
          detail={detail}
          onClose={() => setShowLamaModal(false)}
          onSaved={() => {
            void loadConsents();
            onRefresh();
          }}
          setNotice={setNotice}
        />
      )}
    </section>
  );
}

function ErTimelineView({
  detail,
  categories,
}: {
  detail: ErVisitDetail;
  categories: TriageCategory[];
}) {
  const events: {
    timestamp: string;
    title: string;
    subtitle?: string;
    badge?: string;
    type: "arrival" | "vitals" | "triage" | "treatment" | "doctor" | "note" | "disposition" | "bed";
  }[] = [];

  if (detail.arrival_at) {
    events.push({
      timestamp: detail.arrival_at,
      title: "Patient Arrived at Emergency Department",
      subtitle: `Arrival Mode: ${detail.arrival_mode || "Walk-in"}${detail.condition_at_arrival ? ` · Condition: ${detail.condition_at_arrival}` : ""}`,
      badge: "Arrival",
      type: "arrival",
    });
  }

  detail.complaints.forEach((c) => {
    events.push({
      timestamp: c.created_at,
      title: `Chief Complaint: ${c.complaint}`,
      subtitle: c.reported_by ? `Reported by: ${c.reported_by}` : undefined,
      badge: "Complaint",
      type: "note",
    });
  });

  detail.vitals.forEach((v) => {
    const parts = [];
    if (v.heart_rate) parts.push(`HR: ${v.heart_rate} bpm`);
    if (v.bp_systolic && v.bp_diastolic) parts.push(`BP: ${v.bp_systolic}/${v.bp_diastolic}`);
    if (v.spo2) parts.push(`SpO2: ${v.spo2}%`);
    if (v.temperature) parts.push(`Temp: ${v.temperature}°C`);
    if (v.respiratory_rate) parts.push(`RR: ${v.respiratory_rate}/min`);
    events.push({
      timestamp: v.recorded_at,
      title: "Emergency Vitals Recorded",
      subtitle: parts.join(" · "),
      badge: "Vitals",
      type: "vitals",
    });
  });

  if (detail.triage) {
    const cat = categories.find((c) => c.category_code === detail.triage!.category);
    events.push({
      timestamp: detail.triage.triaged_at,
      title: `Emergency Triage: ${detail.triage.category} - ${cat?.category_label || detail.triage.category}`,
      subtitle: `Triage Bay: ${detail.triage.triage_bed_label || "B1-B4"} · Reason: ${detail.triage.reason || "Clinical assessment"}`,
      badge: detail.triage.category,
      type: "triage",
    });
  }

  detail.treatments.forEach((t) => {
    events.push({
      timestamp: t.performed_at,
      title: `Emergency Intervention: ${t.intervention_type}`,
      subtitle: t.description || undefined,
      badge: "Intervention",
      type: "treatment",
    });
  });

  if (detail.doctor_assigned_at) {
    events.push({
      timestamp: detail.doctor_assigned_at,
      title: `Doctor Assigned: Dr. ${detail.assigned_doctor_name}`,
      subtitle: `Specialty: ${detail.assigned_specialty}`,
      badge: "Doctor",
      type: "doctor",
    });
  }
  if (detail.doctor_accepted_at) {
    events.push({
      timestamp: detail.doctor_accepted_at,
      title: `Doctor Accepted Patient: Dr. ${detail.assigned_doctor_name}`,
      subtitle: "Active Clinical Care & Assessment Initiated",
      badge: "Accepted",
      type: "doctor",
    });
  }

  detail.clinical_notes.forEach((n) => {
    events.push({
      timestamp: n.created_at,
      title: `Clinical Note (${n.note_type})`,
      subtitle: n.content,
      badge: "Note",
      type: "note",
    });
  });

  if (detail.disposition) {
    events.push({
      timestamp: detail.disposition.decided_at,
      title: `Clinical Disposition: ${detail.disposition.outcome.toUpperCase()}`,
      subtitle: `Reason: ${detail.disposition.clinical_reason}${detail.disposition.decided_by ? ` · Decided by: ${detail.disposition.decided_by}` : ""}`,
      badge: "Disposition",
      type: "disposition",
    });
  }

  detail.bed_requests.forEach((r) => {
    if (r.status === "allocated" && r.allocated_at) {
      events.push({
        timestamp: r.allocated_at,
        title: `Physical Bed Allocated: Bed #${r.allocated_bed_id}`,
        subtitle: `Admission #${r.allocated_admission_id} · Assigned by Reception / Bed Management`,
        badge: "Bed Allocated",
        type: "bed",
      });
    }
  });

  if (detail.closed_at) {
    events.push({
      timestamp: detail.closed_at,
      title: "Emergency Visit Closed / Discharged",
      badge: "Closed",
      type: "disposition",
    });
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="er-timeline-container" style={{ padding: "0.5rem" }}>
      <div style={{ position: "relative", paddingLeft: "1.5rem", borderLeft: "2px solid #cbd5e1" }}>
        {events.map((ev, idx) => (
          <div key={idx} style={{ marginBottom: "1.25rem", position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "-1.95rem",
                top: "0.2rem",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor:
                  ev.type === "triage"
                    ? "#dc2626"
                    : ev.type === "vitals"
                      ? "#3b82f6"
                      : ev.type === "treatment"
                        ? "#10b981"
                        : ev.type === "doctor"
                          ? "#8b5cf6"
                          : "#64748b",
                border: "2px solid #fff",
                boxShadow: "0 0 0 2px #cbd5e1",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1e293b" }}>{ev.title}</div>
              <span className="muted" style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                {formatDateTimeIST(ev.timestamp)}
              </span>
            </div>
            {ev.subtitle && (
              <p className="muted" style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#475569" }}>
                {ev.subtitle}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ErHandoverModal({
  detail,
  categories,
  onClose,
}: {
  detail: ErVisitDetail;
  categories: TriageCategory[];
  onClose: () => void;
}) {
  const patientName = detail.patient
    ? [detail.patient.name, detail.patient.last_name].filter(Boolean).join(" ")
    : detail.patient_id;
  // detail.vitals comes back ordered oldest-first (ASC by recorded_at, see
  // get_er_visit) -- index 0 is the FIRST reading taken, not the latest.
  const initialVitals = detail.vitals[0];
  const latestVitals = detail.vitals[detail.vitals.length - 1];

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title="Structured ER Clinical Handover Sheet" onClose={onClose} open>
      <div className="printable-handover-document" style={{ padding: "0.5rem", fontSize: "0.9rem", color: "#1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0f172a", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>HOSP AI EMERGENCY DEPARTMENT</h2>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Phase 1 Clinical Handover & Transfer Summary (Section 36)</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>Encounter: {detail.visit_no}</div>
            <div className="muted" style={{ fontSize: "0.8rem" }}>Generated: {formatDateTimeIST(new Date().toISOString())}</div>
          </div>
        </div>

        {/* 1. Patient Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", backgroundColor: "#f8fafc", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem" }}>
          <div><strong>Patient:</strong> {patientName} ({detail.patient_id})</div>
          <div><strong>Age / Gender:</strong> {detail.patient?.age || "—"}y / {detail.patient?.gender || "—"}</div>
          <div><strong>Arrival Time:</strong> {formatDateTimeIST(detail.arrival_at)} ({detail.arrival_mode})</div>
          <div><strong>Emergency Contact:</strong> {detail.patient?.emergency_contact || detail.patient?.phone || "—"}</div>
          <div style={{ color: "#b91c1c" }}><strong>Known Allergies:</strong> {detail.patient?.allergies || "None Reported"}</div>
          <div><strong>Triage Acuity:</strong> {detail.triage?.category || "Untriaged"} (Bay: {detail.triage?.triage_bed_label || "B1-B4"})</div>
        </div>

        {/* 2. Chief Complaints */}
        <div style={{ marginBottom: "1rem" }}>
          <strong style={{ display: "block", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.2rem", marginBottom: "0.3rem" }}>
            1. Chief Complaints & Incident
          </strong>
          {detail.complaints.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {detail.complaints.map((c) => (
                <li key={c.id}>{c.complaint}</li>
              ))}
            </ul>
          ) : (
            <span className="muted">No primary complaints recorded.</span>
          )}
        </div>

        {/* 3. Vitals Evolution */}
        <div style={{ marginBottom: "1rem" }}>
          <strong style={{ display: "block", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.2rem", marginBottom: "0.3rem" }}>
            2. Vitals Evolution (Initial vs. Latest)
          </strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
              <strong>Initial Vitals:</strong>
              {initialVitals ? (
                <div>HR: {initialVitals.heart_rate || "—"} | BP: {initialVitals.bp_systolic || "—"}/{initialVitals.bp_diastolic || "—"} | SpO2: {initialVitals.spo2 || "—"}% | Temp: {initialVitals.temperature || "—"}°C | GRBS: {initialVitals.blood_glucose || "—"} mg/dL</div>
              ) : <span>Not recorded</span>}
            </div>
            <div style={{ padding: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "4px", backgroundColor: "#f0fdf4" }}>
              <strong>Latest Stabilized Vitals:</strong>
              {latestVitals ? (
                <div>HR: {latestVitals.heart_rate || "—"} | BP: {latestVitals.bp_systolic || "—"}/{latestVitals.bp_diastolic || "—"} | SpO2: {latestVitals.spo2 || "—"}% | Temp: {latestVitals.temperature || "—"}°C | GRBS: {latestVitals.blood_glucose || "—"} mg/dL</div>
              ) : <span>Not recorded</span>}
            </div>
          </div>
        </div>

        {/* 4. Emergency Interventions & Meds */}
        <div style={{ marginBottom: "1rem" }}>
          <strong style={{ display: "block", color: "#475569", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.2rem", marginBottom: "0.3rem" }}>
            3. Emergency Interventions & Medications Administered
          </strong>
          {detail.treatments.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {detail.treatments.map((t) => (
                <li key={t.id}>
                  <strong>{t.intervention_type}</strong> - {t.description || "Performed"} ({formatDateTimeIST(t.performed_at)})
                </li>
              ))}
            </ul>
          ) : (
            <span className="muted">No interventions charted.</span>
          )}
        </div>

        {/* 5. Destination */}
        <div style={{ marginBottom: "1rem", backgroundColor: "#eff6ff", padding: "0.75rem", borderRadius: "6px" }}>
          <strong style={{ display: "block", color: "#1e3a8a", marginBottom: "0.3rem" }}>
            4. Destination & Transfer Authorization
          </strong>
          <div><strong>Clinical Decision:</strong> {detail.disposition?.outcome?.toUpperCase() || "In Assessment"}</div>
          <div><strong>Clinical Reason:</strong> {detail.disposition?.clinical_reason || "—"}</div>
          <div><strong>Assigned Doctor:</strong> {detail.assigned_doctor_name ? `Dr. ${detail.assigned_doctor_name} (${detail.assigned_specialty})` : "ER Covering Staff"}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={handlePrint}><FiPrinter style={{ marginRight: "0.3rem" }} /> Print Handover Sheet</Button>
        </div>
      </div>
    </Modal>
  );
}

function MergeUnknownPatient({
  visitId,
  setNotice,
  onMerged,
  onNavigate,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onMerged: () => void;
  onNavigate?: (page: string, extraData?: any) => void;
}) {
  // Search-first: staff searching by name/phone/ID once someone identifies
  // the patient is far more realistic than requiring them to already know
  // the exact PAT-XXXXXX string. If this really is a brand-new person with
  // no existing record, "Register as New Patient" below sends them to
  // Patient Registration and comes straight back here already merged.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedPatient || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await apiFetch<{ patients: Patient[] }>(
          `/api/patients?q=${encodeURIComponent(searchQuery.trim())}`,
        );
        setSearchResults((data.patients || []).slice(0, 8));
      } catch (error) {
        console.error(error);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [searchQuery, selectedPatient]);

  const submit = async () => {
    if (!selectedPatient) {
      setNotice({ type: "error", message: "Search and select the confirmed patient first." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/merge-unknown`, {
        method: "POST",
        body: JSON.stringify({ patient_id: selectedPatient.patient_id }),
      });
      setNotice({ type: "success", message: "Visit merged into the confirmed patient record." });
      onMerged();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to merge this visit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel" style={{ borderColor: "#e67e22" }}>
      <SectionHead icon={<FiHelpCircle aria-hidden />} title="Identity Not Yet Confirmed" />
      <p className="muted">
        Once this patient's identity is confirmed, merge this visit into their real
        patient record. Everything recorded so far stays exactly where it is.
      </p>

      {selectedPatient ? (
        <div className="er-selected-patient" style={{ marginBottom: "0.6rem" }}>
          <span>
            {selectedPatient.name} {selectedPatient.last_name} — {selectedPatient.patient_id}
          </span>
          <Button size="sm" variant="ghost" onClick={() => { setSelectedPatient(null); setSearchQuery(""); }}>
            Change
          </Button>
        </div>
      ) : (
        <div style={{ marginBottom: "0.6rem" }}>
          <Label htmlFor="merge-patient-search">Search by name, phone, or patient ID</Label>
          <Input
            id="merge-patient-search"
            placeholder="e.g. Ramesh, 98765xxxxx, or PAT-100001"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="er-patient-search-results">
              {searchResults.map((p) => (
                <button
                  key={p.patient_id}
                  type="button"
                  className="er-patient-search-row"
                  onClick={() => { setSelectedPatient(p); setSearchResults([]); }}
                >
                  <span>{p.name} {p.last_name}</span>
                  <span className="muted">{p.patient_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <Button onClick={submit} disabled={saving || !selectedPatient}>
          {saving ? "Merging..." : "Merge"}
        </Button>
        <span className="muted" style={{ fontSize: "0.8rem" }}>or</span>
        <Button
          variant="secondary"
          disabled={!onNavigate}
          onClick={() => onNavigate?.("add", { returnTo: "er-merge", mergeVisitId: visitId })}
        >
          <FiUserPlus aria-hidden /> Register as New Patient
        </Button>
      </div>
    </div>
  );
}

function ComplaintList({ complaints }: { complaints: ErComplaint[] }) {
  if (complaints.length === 0) return <p className="muted">No complaints recorded.</p>;
  return (
    <ul className="er-list">
      {complaints.map((c) => (
        <li key={c.id}>
          <strong>{c.complaint}</strong>
          {c.severity ? ` (${c.severity})` : ""}
          {c.case_category ? ` — ${c.case_category}` : ""}
          <span className="muted"> &middot; {formatDateTimeIST(c.created_at)}</span>
        </li>
      ))}
    </ul>
  );
}

function AddComplaintForm({
  visitId,
  setNotice,
  onAdded,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onAdded: () => void;
}) {
  const [complaint, setComplaint] = useState("");
  const [severity, setSeverity] = useState("");
  const [caseCategory, setCaseCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!complaint.trim()) {
      setNotice({ type: "error", message: "Enter a complaint." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/complaints`, {
        method: "POST",
        body: JSON.stringify({
          complaint: complaint.trim(),
          severity: severity || undefined,
          case_category: caseCategory || undefined,
        }),
      });
      setComplaint("");
      setSeverity("");
      setCaseCategory("");
      onAdded();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to add complaint.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-form-grid" style={{ marginTop: "0.75rem" }}>
      <Input placeholder="Complaint (e.g. Chest pain)" value={complaint} onChange={(e) => setComplaint(e.target.value)} />
      <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
        <option value="">Severity</option>
        <option value="mild">Mild</option>
        <option value="moderate">Moderate</option>
        <option value="severe">Severe</option>
      </Select>
      <Select value={caseCategory} onChange={(e) => setCaseCategory(e.target.value)}>
        <option value="">Case category</option>
        {CASE_CATEGORY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}{c.mlc ? " (MLC)" : ""}</option>
        ))}
      </Select>
      <Button size="sm" onClick={submit} disabled={saving}>
        {saving ? "Adding..." : "Add Complaint"}
      </Button>
    </div>
  );
}

function formatTimeShortIST(iso: string | null): string {
  if (!iso) return "-";
  const hasOffset = /([zZ]|[+-]\d{2}:\d{2})$/.test(iso);
  const parsed = new Date(hasOffset ? iso : `${iso}Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);
}

function VitalChip({
  label,
  value,
  abnormal,
}: {
  label: string;
  value: string | number | null | undefined;
  abnormal?: boolean;
}) {
  if (value == null || value === "") return null;
  return (
    <span className={`er-vital-chip${abnormal ? " er-vital-chip-abnormal" : ""}`}>
      <span className="er-vital-chip-label">{label}</span>
      <span className="er-vital-chip-value">{value}</span>
    </span>
  );
}

function VitalsList({ vitals }: { vitals: ErVitals[] }) {
  if (vitals.length === 0) return <p className="muted">No vitals recorded yet.</p>;
  const mostRecentFirst = [...vitals].reverse();
  return (
    <div className="er-vitals-timeline">
      {mostRecentFirst.map((v, idx) => (
        <div key={v.id} className={`er-vitals-reading${idx === 0 ? " er-vitals-reading-latest" : ""}`}>
          <div className="er-vitals-reading-time">
            <FiClock aria-hidden />
            {formatTimeShortIST(v.recorded_at)}
            {idx === 0 && <span className="er-vitals-latest-tag">Latest</span>}
          </div>
          <div className="er-vitals-reading-chips">
            <VitalChip
              label="BP"
              value={v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic} mmHg` : null}
              abnormal={isAbnormal("bp_systolic", v.bp_systolic) || isAbnormal("bp_diastolic", v.bp_diastolic)}
            />
            <VitalChip label="Pulse" value={v.heart_rate != null ? `${v.heart_rate} bpm` : null} abnormal={isAbnormal("heart_rate", v.heart_rate)} />
            <VitalChip
              label="SpO₂"
              value={v.spo2 != null ? `${v.spo2}%` : null}
              abnormal={isAbnormal("spo2", v.spo2)}
            />
            <VitalChip
              label="RR"
              value={v.respiratory_rate != null ? `${v.respiratory_rate} /min` : null}
              abnormal={isAbnormal("respiratory_rate", v.respiratory_rate)}
            />
            <VitalChip
              label="Temp"
              value={v.temperature != null ? (v.temperature > 45 ? `${v.temperature}°F` : `${v.temperature}°C`) : null}
              abnormal={isAbnormal("temperature", v.temperature)}
            />
            <VitalChip
              label="GRBS"
              value={v.blood_glucose != null ? `${v.blood_glucose} mg/dL` : null}
              abnormal={isAbnormal("blood_glucose", v.blood_glucose)}
            />
            <VitalChip
              label="Pain"
              value={v.pain_score != null ? `${v.pain_score}/10` : null}
              abnormal={v.pain_score != null && v.pain_score >= 5}
            />
            <VitalChip
              label="AVPU"
              value={v.consciousness_level}
              abnormal={!!v.consciousness_level && v.consciousness_level !== "Alert"}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const CONSCIOUSNESS_OPTIONS = [
  { value: "Alert", label: "Alert (A) — fully conscious & oriented" },
  { value: "Verbal", label: "Verbal (V) — responds to verbal stimuli" },
  { value: "Pain", label: "Pain (P) — responds to painful stimuli only" },
  { value: "Unresponsive", label: "Unresponsive (U) — comatose / no response" },
];

function AddVitalsForm({
  visitId,
  setNotice,
  onAdded,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onAdded: () => void;
}) {
  const [heartRate, setHeartRate] = useState("");
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [spo2, setSpo2] = useState("");
  const [rr, setRr] = useState("");
  const [temp, setTemp] = useState("");
  const [grbs, setGrbs] = useState("");
  const [painScore, setPainScore] = useState("");
  const [consciousness, setConsciousness] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/vitals`, {
        method: "POST",
        body: JSON.stringify({
          heart_rate: heartRate ? Number(heartRate) : undefined,
          bp_systolic: bpSystolic ? Number(bpSystolic) : undefined,
          bp_diastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
          spo2: spo2 ? Number(spo2) : undefined,
          respiratory_rate: rr ? Number(rr) : undefined,
          temperature: temp ? Number(temp) : undefined,
          blood_glucose: grbs ? Number(grbs) : undefined,
          pain_score: painScore ? Number(painScore) : undefined,
          consciousness_level: consciousness || undefined,
        }),
      });
      setHeartRate("");
      setBpSystolic("");
      setBpDiastolic("");
      setSpo2("");
      setRr("");
      setTemp("");
      setGrbs("");
      setPainScore("");
      setConsciousness("");
      onAdded();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to record vitals.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="er-sidebar-form" style={{ marginTop: "0.75rem" }}>
      <div className="er-sidebar-form-row">
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Pulse / Heart Rate (bpm)</Label>
          <Input type="number" placeholder="80" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>SpO₂ Saturation (%)</Label>
          <Input type="number" placeholder="98" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
        </div>
      </div>
      <div className="er-sidebar-form-row">
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Systolic BP (mmHg)</Label>
          <Input type="number" placeholder="120" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} />
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Diastolic BP (mmHg)</Label>
          <Input type="number" placeholder="80" value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} />
        </div>
      </div>
      <div className="er-sidebar-form-row">
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Respiratory Rate (breaths/min)</Label>
          <Input type="number" placeholder="16" value={rr} onChange={(e) => setRr(e.target.value)} />
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Temperature (°F / °C)</Label>
          <Input type="number" step="0.1" placeholder="98.6" value={temp} onChange={(e) => setTemp(e.target.value)} />
        </div>
      </div>
      <div className="er-sidebar-form-row">
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>GRBS / RBS (mg/dL)</Label>
          <Input type="number" placeholder="110" value={grbs} onChange={(e) => setGrbs(e.target.value)} />
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Pain Score (0–10)</Label>
          <Input type="number" min={0} max={10} placeholder="0-10" value={painScore} onChange={(e) => setPainScore(e.target.value)} />
        </div>
      </div>
      <div>
        <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Consciousness Level (AVPU Scale)</Label>
        <Select value={consciousness} onChange={(e) => setConsciousness(e.target.value)}>
          <option value="">Select consciousness assessment...</option>
          {CONSCIOUSNESS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
      <Button size="sm" onClick={submit} disabled={saving} style={{ width: "100%" }}>
        {saving ? "Saving..." : "Record Vitals"}
      </Button>
    </div>
  );
}

function TriageForm({
  visitId,
  categories,
  existing,
  aiPrefill,
  setNotice,
  onSaved,
}: {
  visitId: number;
  categories: TriageCategory[];
  existing: ErTriage;
  aiPrefill: { category: string; reason: string } | null;
  setNotice: (notice: Notice | null) => void;
  onSaved: () => void;
}) {
  // Already triaged -> this form is only for a correction (e.g. condition
  // changed, or the wrong category was picked), not a required step, so it
  // stays collapsed behind an explicit toggle instead of always showing a
  // second full form under the triage that's already been recorded.
  const [open, setOpen] = useState(!existing);
  const [category, setCategory] = useState(existing?.category || "");
  const [bedLabel, setBedLabel] = useState(existing?.triage_bed_label || "");
  const [reason, setReason] = useState(existing?.reason || "");
  const [saving, setSaving] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  // A fresh AI suggestion always wins visually -- open the form (even if
  // already triaged, so a correction is right there to review) and load its
  // pick into the same fields staff would type into by hand. Nothing here
  // writes anything; "Save Triage"/"Save Correction" below still does that.
  useEffect(() => {
    if (!aiPrefill) return;
    setCategory(aiPrefill.category);
    setReason(aiPrefill.reason);
    setAiFilled(true);
    setOpen(true);
  }, [aiPrefill]);

  if (categories.length === 0) {
    return (
      <p className="muted">
        No triage categories configured yet — an admin must add them under the
        Triage Configuration tab before this visit can be triaged.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        style={{ marginTop: "0.6rem" }}
        onClick={() => {
          setCategory(existing?.category || "");
          setBedLabel(existing?.triage_bed_label || "");
          setReason(existing?.reason || "");
          setOpen(true);
        }}
      >
        Correct / update triage
      </Button>
    );
  }

  const submit = async () => {
    if (!category) {
      setNotice({ type: "error", message: "Select a triage category." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/triage`, {
        method: "POST",
        body: JSON.stringify({
          category,
          triage_bed_label: bedLabel || undefined,
          reason: reason || undefined,
        }),
      });
      setAiFilled(false);
      if (existing) setOpen(false);
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to save triage.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="er-sidebar-form" style={{ marginTop: "0.75rem" }}>
      {!existing && (
        <p className="muted" style={{ fontSize: "0.78rem", margin: "0 0 0.2rem" }}>
          Required before treatment can proceed.
        </p>
      )}
      {aiFilled && (
        <p className="er-ai-field-note">
          <FiZap aria-hidden /> AI-suggested — review before saving
        </p>
      )}
      <div>
        <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Category</Label>
        <Select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setAiFilled(false); }}
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.category_code}>
              {c.category_code} — {c.category_label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Triage bay (optional)</Label>
        <Input placeholder="e.g. B1" value={bedLabel} onChange={(e) => setBedLabel(e.target.value)} />
      </div>
      <div>
        <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Reason</Label>
        <Input placeholder="Clinical reason for this category" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <Button size="sm" onClick={submit} disabled={saving} style={{ flex: 1 }}>
          {saving ? "Saving..." : existing ? "Save Correction" : "Save Triage"}
        </Button>
        {existing && (
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

// What AI Triage Assistant hands each downstream section -- it never writes
// to the visit itself (see AITriagePanel below). Each section's own form
// picks this up as a starting point in its own fields, pre-filled but fully
// editable, and the human still has to press that section's own save button
// for anything to actually be recorded. That's deliberate: the AI can be
// wrong, and every field it fills in must remain a plain, ordinary form
// field a person can just overwrite -- never a separate auto-applied action.
type AiSectionPrefills = {
  triage: { category: string; reason: string } | null;
  doctor: { specialty: string; doctorName: string } | null;
  treatment: { interventionType: string; description: string } | null;
};

function AITriagePanel({
  detail,
  categories,
  setNotice,
  onRefresh,
  onSuggestion,
}: {
  detail: ErVisitDetail;
  categories: TriageCategory[];
  setNotice: (notice: Notice | null) => void;
  onRefresh?: () => void;
  onSuggestion?: (prefills: AiSectionPrefills, reasoning: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);

  const hasChartedData = detail.complaints.length > 0 || detail.vitals.length > 0;
  const isAlreadyTriaged = Boolean(detail.triage);
  const isDoctorAssigned = Boolean(detail.assigned_doctor_name || detail.assigned_specialty);

  const runAITriageAuto = async () => {
    if (!hasChartedData) {
      setNotice({
        type: "warning",
        message: "Record complaints or vitals first before running AI Triage.",
      });
      return;
    }
    setLoading(true);
    try {
      const symptoms = buildSymptomsSummary(detail.complaints, detail.vitals);
      const aiRes = await fetchAiTriageSuggestion(symptoms);
      const categoryMatch = mapUrgencyToTriageCategory(aiRes.urgency, categories);

      // Auto-apply triage
      if (categoryMatch) {
        await apiFetch(`/api/er/visits/${detail.id}/triage`, {
          method: "POST",
          body: JSON.stringify({
            category: categoryMatch,
            reason: (aiRes.reasoning || "AI Triage analysis").substring(0, 500),
          }),
        });
      }

      // Auto-assign doctor/specialty
      if (aiRes.department || aiRes.doctor) {
        await apiFetch(`/api/er/visits/${detail.id}/assign-doctor`, {
          method: "POST",
          body: JSON.stringify({
            specialty: aiRes.department || "Emergency",
            doctor_name: aiRes.doctor || undefined,
          }),
        });
      }

      // Auto-log multi-step suggested treatments if visit doesn't have treatments
      const treatmentsToApply = aiRes.suggested_treatments && aiRes.suggested_treatments.length > 0
        ? aiRes.suggested_treatments
        : aiRes.suggested_treatment?.intervention_type
        ? [aiRes.suggested_treatment]
        : [];

      if (treatmentsToApply.length > 0 && detail.treatments.length === 0) {
        for (const tr of treatmentsToApply) {
          if (tr.intervention_type) {
            await apiFetch(`/api/er/visits/${detail.id}/treatments`, {
              method: "POST",
              body: JSON.stringify({
                intervention_type: tr.intervention_type,
                description: tr.description || "Emergency care protocol per AI Triage",
              }),
            });
          }
        }
      }

      const prefills: AiSectionPrefills = {
        triage: categoryMatch ? { category: categoryMatch, reason: aiRes.reasoning } : null,
        doctor:
          aiRes.department || aiRes.doctor
            ? { specialty: aiRes.department || "", doctorName: aiRes.doctor || "" }
            : null,
        treatment: aiRes.suggested_treatment
          ? {
              interventionType: aiRes.suggested_treatment.intervention_type,
              description: aiRes.suggested_treatment.description,
            }
          : null,
      };
      if (onSuggestion) onSuggestion(prefills, aiRes.reasoning);

      setLastAnalysis(aiRes.reasoning);
      setNotice({
        type: "success",
        message: "AI Triage & Clinical Protocol updated successfully.",
      });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      reportError(setNotice, error, "AI Triage failed.");
    } finally {
      setLoading(false);
    }
  };

  const displayReasoning = lastAnalysis || detail.triage?.reason;

  return (
    <div className="panel er-ai-panel" style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div className="er-ai-panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FiZap aria-hidden style={{ color: "#7c3aed", fontSize: "1.2rem" }} />
          <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>
            AI Clinical Triage Assistant
          </h4>
          {isAlreadyTriaged && (
            <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.55rem", borderRadius: "999px", background: "#ecfdf5", color: "#059669", fontWeight: 600 }}>
              ✓ Auto-Triaged
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={runAITriageAuto}
          disabled={loading || !hasChartedData}
          className="er-ai-run-button"
          style={{ background: "#7c3aed", color: "#fff", borderColor: "#7c3aed" }}
        >
          {loading ? "Evaluating..." : isAlreadyTriaged ? "Re-evaluate with AI" : "Auto-Triage with AI"}
        </Button>
      </div>

      {!hasChartedData ? (
        <p className="muted er-ai-panel-hint" style={{ marginTop: "0.5rem" }}>
          Record complaints or initial vitals to enable automated AI Triage evaluation.
        </p>
      ) : isAlreadyTriaged || displayReasoning ? (
        <div className="er-ai-result" style={{ marginTop: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.9rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", alignItems: "center", marginBottom: "0.65rem", paddingBottom: "0.65rem", borderBottom: "1px solid #e2e8f0" }}>
            {detail.triage && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Triage Level:</span>
                <TriageChip category={detail.triage.category} categories={categories} bedLabel={detail.triage.triage_bed_label} />
              </div>
            )}
            {isDoctorAssigned && (
              <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                <span style={{ color: "#64748b", fontWeight: 600 }}>Department:</span> <strong>{detail.assigned_specialty || "Emergency"}</strong>
                {detail.assigned_doctor_name && (
                  <> &middot; <span style={{ color: "#64748b", fontWeight: 600 }}>Doctor:</span> <strong>{detail.assigned_doctor_name}</strong></>
                )}
              </div>
            )}
          </div>
          {displayReasoning && (
            <p className="er-ai-reasoning" style={{ fontSize: "0.88rem", lineHeight: "1.5", margin: 0, color: "#1e293b" }}>
              <strong style={{ color: "#0f172a" }}>Clinical Assessment & Reasoning:</strong> {displayReasoning}
            </p>
          )}
        </div>
      ) : (
        <div style={{ marginTop: "0.6rem", fontSize: "0.85rem", color: "#64748b" }}>
          Vitals and complaints are charted. Click <strong>Auto-Triage with AI</strong> to automatically classify urgency, assign specialty doctor, and suggest protocols.
        </div>
      )}
    </div>
  );
}

const INTERVENTION_LABELS: Record<string, string> = {
  oxygen: "Oxygen Therapy",
  iv_access: "IV Access / Cannulation",
  fluids: "IV Fluid Resuscitation",
  cardiac_monitoring: "12-Lead ECG & Monitoring",
  medication: "Emergency Pharmacotherapy",
  nebulization: "Emergency Nebulization",
  cpr: "Cardiopulmonary Resuscitation (CPR)",
  defibrillation: "Defibrillation / Shock",
  airway_management: "Advanced Airway Management",
  wound_care: "Hemorrhage Control & Wound Care",
  blood_transfusion: "Emergency Blood Transfusion",
  gastric_lavage: "Gastric Lavage & Decontamination",
  other: "Other Clinical Procedure",
};

function TreatmentList({ treatments }: { treatments: ErTreatment[] }) {
  if (treatments.length === 0) return <p className="muted">No interventions logged.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "0.5rem" }}>
      {treatments.map((t, idx) => {
        const label = INTERVENTION_LABELS[t.intervention_type] || t.intervention_type;
        return (
          <div
            key={t.id || idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "0.6rem 0.8rem",
            }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
                background: "#e0e7ff",
                color: "#4338ca",
                whiteSpace: "nowrap",
                marginTop: "0.1rem",
              }}
            >
              {label}
            </span>
            <div style={{ flex: 1, fontSize: "0.86rem", color: "#1e293b" }}>
              <div style={{ fontWeight: 500 }}>{t.description || "Procedure performed as part of emergency clinical care."}</div>
              <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.2rem" }}>
                Logged &middot; {formatDateTimeIST(t.performed_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddTreatmentForm({
  visitId,
  aiPrefill,
  setNotice,
  onAdded,
}: {
  visitId: number;
  aiPrefill: { interventionType: string; description: string } | null;
  setNotice: (notice: Notice | null) => void;
  onAdded: () => void;
}) {
  const [interventionType, setInterventionType] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  // Pre-fills the fields only -- logging an actual intervention is a real
  // clinical action, so it still requires the explicit "Log Intervention"
  // click below no matter how it got into these fields.
  useEffect(() => {
    if (!aiPrefill) return;
    setInterventionType(aiPrefill.interventionType);
    setDescription(aiPrefill.description);
    setAiFilled(true);
  }, [aiPrefill]);

  const submit = async () => {
    if (!interventionType) {
      setNotice({ type: "error", message: "Select an intervention type." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/treatments`, {
        method: "POST",
        body: JSON.stringify({
          intervention_type: interventionType,
          description: description || undefined,
        }),
      });
      setInterventionType("");
      setDescription("");
      setAiFilled(false);
      onAdded();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to log intervention.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      {aiFilled && (
        <p className="er-ai-field-note">
          <FiZap aria-hidden /> AI-suggested — review before logging
        </p>
      )}
      <div className="module-form-grid">
        <Select
          value={interventionType}
          onChange={(e) => { setInterventionType(e.target.value); setAiFilled(false); }}
        >
          <option value="">Select Intervention Type...</option>
          <option value="oxygen">Oxygen Therapy</option>
          <option value="iv_access">IV Access / Cannulation</option>
          <option value="fluids">IV Fluid Resuscitation</option>
          <option value="cardiac_monitoring">12-Lead ECG & Cardiac Monitoring</option>
          <option value="medication">Emergency Pharmacotherapy</option>
          <option value="nebulization">Emergency Nebulization</option>
          <option value="cpr">CPR (Cardiopulmonary Resuscitation)</option>
          <option value="defibrillation">Defibrillation / Cardioversion</option>
          <option value="airway_management">Advanced Airway Management</option>
          <option value="wound_care">Hemorrhage Control & Wound Care</option>
          <option value="blood_transfusion">Emergency Blood Transfusion</option>
          <option value="gastric_lavage">Gastric Lavage & Decontamination</option>
          <option value="other">Other Clinical Procedure</option>
        </Select>
        <Input placeholder="Clinical details / instructions (e.g. 100% O2 via NRBM)" value={description} onChange={(e) => { setDescription(e.target.value); setAiFilled(false); }} />
        <Button size="sm" onClick={submit} disabled={saving}>
          {saving ? "Logging..." : "Log Intervention"}
        </Button>
      </div>
    </div>
  );
}

function DoctorAssignForm({
  visitId,
  existingDoctor,
  existingSpecialty,
  aiPrefill,
  setNotice,
  onSaved,
}: {
  visitId: number;
  existingDoctor?: string | null;
  existingSpecialty?: string | null;
  aiPrefill: { specialty: string; doctorName: string } | null;
  setNotice: (notice: Notice | null) => void;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(!existingDoctor);
  const [departments, setDepartments] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<{ doctor_name: string; department: string }[]>([]);
  const [specialty, setSpecialty] = useState(existingSpecialty || "");
  const [doctorName, setDoctorName] = useState(existingDoctor || "");
  const [saving, setSaving] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  // When AI Triage Assistant provides a recommendation, prefill fields and open form with review tag
  useEffect(() => {
    if (!aiPrefill) return;
    setSpecialty(aiPrefill.specialty);
    setDoctorName(aiPrefill.doctorName);
    setAiFilled(true);
    setOpen(true);
  }, [aiPrefill]);

  useEffect(() => {
    if (!existingDoctor) {
      setOpen(true);
      setSpecialty("");
      setDoctorName("");
    } else {
      setSpecialty(existingSpecialty || "");
      setDoctorName(existingDoctor || "");
    }
  }, [existingDoctor, existingSpecialty]);

  useEffect(() => {
    (async () => {
      try {
        const deptsRes = await apiFetch<{ departments: { department_name: string }[] }>("/api/registration/departments");
        const docsRes = await apiFetch<{ doctors: { doctor_name: string; department: string }[] }>("/api/op/doctors");
        setDepartments(deptsRes.departments.map((d) => d.department_name));
        setDoctors(docsRes.doctors);
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  const doctorsInSpecialty = specialty
    ? doctors.filter((d) => (d.department || "").toLowerCase() === specialty.toLowerCase())
    : doctors;
  const doctorOptions = doctorsInSpecialty.length > 0 ? doctorsInSpecialty : doctors;

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        style={{ marginTop: "0.6rem" }}
        onClick={() => {
          setSpecialty(existingSpecialty || "");
          setDoctorName(existingDoctor || "");
          setOpen(true);
        }}
      >
        Change doctor
      </Button>
    );
  }

  const submit = async () => {
    if (!specialty.trim()) {
      setNotice({ type: "error", message: "Select the required specialty." });
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<{ doctor_name: string; matched_specialty: string; used_fallback: boolean }>(
        `/api/er/visits/${visitId}/assign-doctor`,
        {
          method: "POST",
          body: JSON.stringify({
            specialty: specialty.trim(),
            doctor_name: doctorName.trim() || undefined,
          }),
        },
      );
      let message: string;
      if (!result.doctor_name) {
        message = "No doctor is on staff at all yet -- add one under Doctor Scheduling, or assign one manually once available.";
      } else if (result.used_fallback) {
        message = `No ${specialty.trim()} specialist on staff -- assigned ${result.doctor_name} (${result.matched_specialty}) as the covering doctor instead. Confirm or override before they accept.`;
      } else {
        message = `Assigned doctor: ${result.doctor_name}. Confirm or override before the doctor accepts.`;
      }
      setNotice({ type: result.doctor_name ? "success" : "warning", message });
      setAiFilled(false);
      if (existingDoctor) setOpen(false);
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to assign a doctor.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      {aiFilled && (
        <p className="er-ai-field-note">
          <FiZap aria-hidden /> AI-suggested — review before assigning
        </p>
      )}
      <div className="er-sidebar-form" style={{ marginTop: "0.4rem" }}>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Required specialty</Label>
          <Select
            value={specialty}
            onChange={(e) => {
              setSpecialty(e.target.value);
              setDoctorName("");
              setAiFilled(false);
            }}
          >
            <option value="">Select specialty...</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label style={{ fontSize: "0.8rem", color: "#64748b" }}>Doctor (optional -- overrides suggestion)</Label>
          <Select
            value={doctorName}
            onChange={(e) => {
              setDoctorName(e.target.value);
              setAiFilled(false);
            }}
          >
            <option value="">Auto -- let the system pick</option>
            {doctorOptions.map((d) => (
              <option key={d.doctor_name} value={d.doctor_name}>
                {d.doctor_name} ({d.department})
              </option>
            ))}
          </Select>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          <Button size="sm" onClick={submit} disabled={saving} style={{ flex: 1 }}>
            {saving ? "Assigning..." : "Assign Doctor"}
          </Button>
          {existingDoctor && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setAiFilled(false);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function NotesList({ notes }: { notes: ErClinicalNote[] }) {
  if (notes.length === 0) return <p className="muted">No clinical notes yet.</p>;
  return (
    <ul className="er-list">
      {notes.map((n) => (
        <li key={n.id}>
          <strong>{n.note_type === "reassessment" ? "Reassessment" : "Assessment"}</strong>
          {n.author ? ` — Dr. ${n.author}` : ""}
          <span className="muted"> &middot; {formatDateTimeIST(n.created_at)}</span>
          <br />
          {n.content}
        </li>
      ))}
    </ul>
  );
}

const LAMA_REFUSAL_REASONS = [
  "Going to another hospital / facility of choice",
  "Financial constraints / unaffordable treatment or bed charges",
  "Personal / family preference to manage and nurse at home",
  "Refusal of ICU admission / invasive mechanical ventilation",
  "Dissatisfaction with treatment / refusal of emergency procedure",
  "Other clinical refusal",
];

const RELATION_OPTIONS = [
  "Self (Patient)",
  "Father",
  "Mother",
  "Spouse",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Guardian / Relative",
  "Friend / Colleague",
  "Other",
];

function ConsentDocumentControl({
  consentId,
  filename,
  setNotice,
  onChanged,
}: {
  consentId: number;
  filename?: string | null;
  setNotice: (notice: Notice | null) => void;
  onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handlePick = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadConsentDocument(consentId, file);
      setNotice({ type: "success", message: "Signed document attached." });
      onChanged();
    } catch (error: any) {
      setNotice({ type: "error", message: error.message || "Failed to upload the signed document." });
    } finally {
      setUploading(false);
    }
  };

  if (filename) {
    return (
      <a
        href={`${API_BASE}/api/er/consents/${consentId}/document`}
        target="_blank"
        rel="noreferrer"
        className="bed-link-button"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.35rem" }}
      >
        <FiFileText aria-hidden /> View signed document
      </a>
    );
  }

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        marginTop: "0.35rem",
        fontSize: "0.76rem",
        fontWeight: 600,
        color: uploading ? "#94a3b8" : "#1B4FD8",
        cursor: uploading ? "not-allowed" : "pointer",
      }}
    >
      <FiPrinter aria-hidden />
      {uploading ? "Uploading..." : "Attach signed paper form"}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        disabled={uploading}
        onChange={(e) => handlePick(e.target.files?.[0])}
        style={{ display: "none" }}
      />
    </label>
  );
}

function ConsentsList({
  consents,
  loading,
  setNotice,
  onDocumentChanged,
}: {
  consents: ErConsent[];
  loading: boolean;
  setNotice: (notice: Notice | null) => void;
  onDocumentChanged: () => void;
}) {
  if (loading) return <p className="muted" style={{ fontSize: "0.85rem" }}>Loading consents...</p>;
  if (consents.length === 0) {
    return (
      <p className="muted" style={{ fontSize: "0.85rem", margin: "0.4rem 0" }}>
        No formal consents or waivers recorded yet for this visit.
      </p>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.4rem" }}>
      {consents.map((c) => {
        const isLama = c.consent_type === "lama" || c.consent_type === "dama";
        const isAdmission = c.consent_type === "admission";
        const isEmergency = c.consent_type === "emergency" || c.consent_type === "procedure";
        return (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              background: isLama ? "#fef2f2" : isAdmission ? "#eff6ff" : "#f0fdf4",
              border: isLama ? "1px solid #fecaca" : isAdmission ? "1px solid #bfdbfe" : "1px solid #bbf7d0",
              borderRadius: "6px",
              padding: "0.6rem 0.8rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span
                  style={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    background: isLama ? "#fee2e2" : isAdmission ? "#dbeafe" : "#dcfce7",
                    color: isLama ? "#991b1b" : isAdmission ? "#1e40af" : "#166534",
                    textTransform: "uppercase",
                  }}
                >
                  {isLama ? "⚠️ LAMA Legal Waiver" : isAdmission ? "📋 Inpatient Admission Consent" : isEmergency ? "⚡ Emergency Procedure Consent" : c.consent_type}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Signed {formatDateTimeIST(c.signed_at)}
                </span>
              </div>
              <div style={{ fontSize: "0.86rem", color: "#1e293b", marginTop: "0.3rem" }}>
                Signer: <strong>{c.signed_by}</strong> {c.relation_to_patient ? `(${c.relation_to_patient})` : ""}
                {c.witness_doctor && <> &middot; Witness Doctor: <strong>{c.witness_doctor}</strong></>}
              </div>
              {c.refusal_reason && (
                <div style={{ fontSize: "0.8rem", color: "#b91c1c", marginTop: "0.2rem" }}>
                  <strong>Refusal Reason:</strong> {c.refusal_reason}
                </div>
              )}
              <ConsentDocumentControl
                consentId={c.id}
                filename={c.document_filename}
                setNotice={setNotice}
                onChanged={onDocumentChanged}
              />
            </div>
            <span
              style={{
                fontSize: "0.74rem",
                fontWeight: 700,
                color: isLama ? "#b91c1c" : "#059669",
                whiteSpace: "nowrap",
                marginTop: "0.2rem",
              }}
            >
              ✔ Recorded &amp; Binding
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ErLamaModal({
  detail,
  onClose,
  onSaved,
  setNotice,
}: {
  detail: ErVisitDetail;
  onClose: () => void;
  onSaved: () => void;
  setNotice: (notice: Notice | null) => void;
}) {
  const patientFullName = detail.patient
    ? [detail.patient.name, detail.patient.last_name].filter(Boolean).join(" ")
    : detail.unknown_patient_label || "Emergency Patient";
  
  const [refusalReason, setRefusalReason] = useState(LAMA_REFUSAL_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [signedBy, setSignedBy] = useState(detail.patient?.guardian_name || patientFullName);
  const [relation, setRelation] = useState(detail.patient?.guardian_name ? "Guardian / Relative" : "Self (Patient)");
  const [phone, setPhone] = useState(detail.patient?.emergency_contact || detail.patient?.phone || "");
  const [witnessDoctor, setWitnessDoctor] = useState(detail.assigned_doctor_name || "Dr. G. Suryanarayana");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!signedBy.trim()) {
      setNotice({ type: "error", message: "Signer name is required." });
      return;
    }
    if (phone && phone.replace(/\D/g, "").length !== 10) {
      setNotice({ type: "error", message: "Enter a valid 10-digit mobile number." });
      return;
    }
    if (!witnessDoctor.trim()) {
      setNotice({ type: "error", message: "Witness doctor is required." });
      return;
    }
    if (!acknowledged) {
      setNotice({ type: "error", message: "You must acknowledge the legal indemnity declaration to execute LAMA." });
      return;
    }

    const finalReason = refusalReason === "Other clinical refusal" && customReason.trim() ? customReason.trim() : refusalReason;
    setSubmitting(true);
    try {
      await apiFetch(`/api/er/visits/${detail.id}/lama`, {
        method: "POST",
        body: JSON.stringify({
          patient_name: patientFullName,
          signed_by: signedBy.trim(),
          relation_to_patient: relation,
          signed_by_phone: phone.replace(/\D/g, "") || undefined,
          witness_doctor: witnessDoctor.trim(),
          refusal_reason: finalReason,
          legal_waiver_acknowledged: true,
        }),
      });
      setNotice({
        type: "warning",
        message: "LAMA Declaration recorded. Legal waiver saved, bed requests cancelled, and ER visit closed.",
      });
      onClose();
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to record LAMA declaration.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="⚠️ Leave Against Medical Advice (LAMA / DAMA) Legal Waiver"
      description={`Patient: ${patientFullName} (${detail.visit_no})`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "0.85rem",
            color: "#7f1d1d",
            fontSize: "0.85rem",
            lineHeight: "1.5",
          }}
        >
          <strong style={{ display: "block", color: "#991b1b", marginBottom: "0.3rem", fontSize: "0.9rem" }}>
            MANDATORY MEDICAL-LEGAL INDEMNITY DECLARATION:
          </strong>
          I/We hereby declare that I am leaving the hospital / refusing recommended inpatient/ICU admission against the medical advice (LAMA) of the attending physicians. The severe medical risks, including disease deterioration, permanent organ impairment, and death, have been clearly explained to me in a language I understand. I voluntarily choose to leave, assume full responsibility, and fully release and indemnify the hospital, doctors, and clinical staff from all legal, medical, and financial liability.
        </div>

        <div>
          <Label>Primary Reason for Refusal / Leaving</Label>
          <Select value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)}>
            {LAMA_REFUSAL_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
          {refusalReason === "Other clinical refusal" && (
            <Input
              style={{ marginTop: "0.4rem" }}
              placeholder="Specify custom refusal reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <Label>Signer Name (Patient / Guardian)</Label>
            <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Full name of signer" />
          </div>
          <div>
            <Label>Relationship to Patient</Label>
            <Select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {RELATION_OPTIONS.map((rel) => (
                <option key={rel} value={rel}>{rel}</option>
              ))}
            </Select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <Label>Signer 10-Digit Mobile Number</Label>
            <Input
              maxLength={10}
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <Label>Attending / Witness Doctor</Label>
            <Input value={witnessDoctor} onChange={(e) => setWitnessDoctor(e.target.value)} placeholder="Doctor name" />
          </div>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            background: "#fff1f2",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #fda4af",
            cursor: "pointer",
            fontSize: "0.85rem",
            color: "#881337",
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ marginTop: "0.2rem" }}
          />
          <span>
            <strong>I confirm that I have explained/understood all medical risks</strong> and that the patient/guardian has willingly signed this waiver to discharge on LAMA terms.
          </span>
        </label>

        <div className="ui-modal-actions" style={{ marginTop: "0.5rem" }}>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            style={{ background: "#dc2626", color: "#fff", borderColor: "#b91c1c" }}
            onClick={handleSubmit}
            disabled={submitting || !acknowledged}
          >
            {submitting ? "Recording LAMA..." : "Execute & Sign LAMA Discharge"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ErConsentModal({
  detail,
  type,
  onClose,
  onSaved,
  setNotice,
}: {
  detail: ErVisitDetail;
  type: "admission" | "emergency";
  onClose: () => void;
  onSaved: () => void;
  setNotice: (notice: Notice | null) => void;
}) {
  const patientFullName = detail.patient
    ? [detail.patient.name, detail.patient.last_name].filter(Boolean).join(" ")
    : detail.unknown_patient_label || "Emergency Patient";

  const [signedBy, setSignedBy] = useState(detail.patient?.guardian_name || patientFullName);
  const [relation, setRelation] = useState(detail.patient?.guardian_name ? "Guardian / Relative" : "Self (Patient)");
  const [phone, setPhone] = useState(detail.patient?.emergency_contact || detail.patient?.phone || "");
  const [witnessDoctor, setWitnessDoctor] = useState(detail.assigned_doctor_name || "Dr. G. Suryanarayana");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Real-world consents are often paper-first -- staff may tick this
  // checkbox before (or after) the patient/guardian actually signs the
  // physical form. This optional attachment is the durable proof: a photo
  // or scan of that signed paper, uploaded right alongside the typed record.
  const [signedDocument, setSignedDocument] = useState<File | null>(null);

  const title = type === "admission" ? "📋 Informed Inpatient / ICU Admission Consent" : "⚡ Emergency High-Risk Treatment Consent";

  const handleSubmit = async () => {
    if (!signedBy.trim()) {
      setNotice({ type: "error", message: "Signer name is required." });
      return;
    }
    if (phone && phone.replace(/\D/g, "").length !== 10) {
      setNotice({ type: "error", message: "Enter a valid 10-digit mobile number." });
      return;
    }
    if (!acknowledged) {
      setNotice({ type: "error", message: "Please accept the consent terms." });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch<{ consent_id: number }>(`/api/er/visits/${detail.id}/consents`, {
        method: "POST",
        body: JSON.stringify({
          patient_name: patientFullName,
          consent_type: type,
          signed_by: signedBy.trim(),
          relation_to_patient: relation,
          signed_by_phone: phone.replace(/\D/g, "") || undefined,
          witness_doctor: witnessDoctor.trim(),
          legal_waiver_acknowledged: true,
          notes: type === "admission" ? "Inpatient Admission Consent recorded prior to bed transfer" : "Emergency Clinical Treatment Consent recorded",
        }),
      });
      if (signedDocument) {
        try {
          await uploadConsentDocument(result.consent_id, signedDocument);
        } catch (uploadError: any) {
          // The consent record itself is already saved and legally valid on
          // its own -- a failed attachment upload shouldn't look like the
          // whole consent failed, just that the proof photo didn't make it.
          setNotice({ type: "warning", message: `${title} recorded, but the attached document failed to upload: ${uploadError.message}` });
          onClose();
          onSaved();
          return;
        }
      }
      setNotice({ type: "success", message: `${title} recorded.` });
      onClose();
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to record consent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={title}
      description={`Patient: ${patientFullName} (${detail.visit_no})`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div
          style={{
            background: type === "admission" ? "#eff6ff" : "#fefce8",
            border: type === "admission" ? "1px solid #bfdbfe" : "1px solid #fef08a",
            borderRadius: "8px",
            padding: "0.85rem",
            color: type === "admission" ? "#1e3a8a" : "#854d0e",
            fontSize: "0.85rem",
            lineHeight: "1.5",
          }}
        >
          <strong style={{ display: "block", marginBottom: "0.3rem" }}>
            {type === "admission" ? "INPATIENT ADMISSION & CARE POLICIES:" : "EMERGENCY CLINICAL PROCEDURE NOTICE:"}
          </strong>
          {type === "admission" ? (
            <span>
              I/We hereby consent to admission into the General / Semi-Private / Private / ICU ward as clinically deemed necessary. I agree to abide by hospital rules, standard nursing protocols, diagnostic investigations, medication administration, and applicable room tariffs.
            </span>
          ) : (
            <span>
              I/We consent to urgent emergency procedures (including CPR, endotracheal intubation, IV access, telemetry, fluid resuscitation, nebulization, blood transfusion, or emergency pharmacotherapy). The critical condition and necessity of these interventions have been explained.
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <Label>Signer Name</Label>
            <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Full name of signer" />
          </div>
          <div>
            <Label>Relationship to Patient</Label>
            <Select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {RELATION_OPTIONS.map((rel) => (
                <option key={rel} value={rel}>{rel}</option>
              ))}
            </Select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <Label>Signer 10-Digit Phone</Label>
            <Input
              maxLength={10}
              placeholder="10-digit phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <Label>Attending Doctor</Label>
            <Input value={witnessDoctor} onChange={(e) => setWitnessDoctor(e.target.value)} placeholder="Doctor name" />
          </div>
        </div>

        <div>
          <Label>Attach signed paper form (optional)</Label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            onChange={(e) => setSignedDocument(e.target.files?.[0] || null)}
          />
          <p className="er-field-hint">
            A photo or scan of the physically-signed form -- proof independent of the checkbox below,
            for when the paper is signed before or after this is recorded on the system.
          </p>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            background: "#f8fafc",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            cursor: "pointer",
            fontSize: "0.85rem",
            color: "#1e293b",
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ marginTop: "0.2rem" }}
          />
          <span>
            <strong>I give voluntary informed consent</strong> for the proposed clinical admission and interventions, accepting hospital terms and medical protocols.
          </span>
        </label>

        <div className="ui-modal-actions" style={{ marginTop: "0.5rem" }}>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !acknowledged}>
            {submitting ? "Signing..." : "Sign & Record Consent"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddNoteForm({
  visitId,
  setNotice,
  onAdded,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onAdded: () => void;
}) {
  const [noteType, setNoteType] = useState<"assessment" | "reassessment">("assessment");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!content.trim()) {
      setNotice({ type: "error", message: "Enter note content." });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/er/visits/${visitId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note_type: noteType, content: content.trim() }),
      });
      setContent("");
      onAdded();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to add note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-form-grid" style={{ marginTop: "0.75rem" }}>
      <Select value={noteType} onChange={(e) => setNoteType(e.target.value as "assessment" | "reassessment")}>
        <option value="assessment">Assessment</option>
        <option value="reassessment">Reassessment</option>
      </Select>
      <Textarea placeholder="Clinical note" value={content} onChange={(e) => setContent(e.target.value)} />
      <Button size="sm" onClick={submit} disabled={saving}>
        {saving ? "Saving..." : "Add Note"}
      </Button>
    </div>
  );
}

function DispositionForm({
  visitId,
  bedNeed,
  setNotice,
  onSaved,
}: {
  visitId: number;
  bedNeed: BedNeedSuggestion;
  setNotice: (notice: Notice | null) => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState("");
  const [requiredSpecialty, setRequiredSpecialty] = useState("");
  const [clinicalReason, setClinicalReason] = useState("");
  const [priority, setPriority] = useState("");
  const [saving, setSaving] = useState(false);

  const applyBedNeedSuggestion = () => {
    if (!bedNeed) return;
    setOutcome(bedNeed.levelOfCare);
    if (bedNeed.specialty) setRequiredSpecialty(bedNeed.specialty);
  };

  const submit = async () => {
    if (!outcome || !clinicalReason.trim()) {
      setNotice({ type: "error", message: "Select an outcome and enter the clinical reason." });
      return;
    }
    setSaving(true);
    try {
      const result = await apiFetch<{ bed_request_id: number | null }>(
        `/api/er/visits/${visitId}/disposition`,
        {
          method: "POST",
          body: JSON.stringify({
            outcome,
            required_specialty: requiredSpecialty || undefined,
            clinical_reason: clinicalReason.trim(),
            priority: priority || undefined,
          }),
        },
      );
      setNotice({
        type: "success",
        message: result.bed_request_id
          ? "Disposition recorded. A bed request has been sent to Bed Management."
          : "Disposition recorded.",
      });
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to record disposition.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="module-form-grid" style={{ marginTop: "0.75rem" }}>
      {bedNeed && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.6rem",
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "8px",
            padding: "0.55rem 0.75rem",
          }}
        >
          <span style={{ fontSize: "0.82rem", color: "#0369a1" }}>
            <strong>Suggested: {OUTCOME_OPTIONS.find((o) => o.value === bedNeed.levelOfCare)?.label || bedNeed.levelOfCare}</strong>
            {bedNeed.specialty ? ` · ${bedNeed.specialty}` : ""}
            <span className="muted"> (based on {bedNeed.reason})</span>
          </span>
          <Button size="sm" variant="secondary" onClick={applyBedNeedSuggestion}>
            Apply
          </Button>
        </div>
      )}
      <Select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
        <option value="">Select outcome</option>
        {OUTCOME_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {outcome && OUTCOMES_REQUIRING_BED.has(outcome) && (
        <Input
          placeholder="Required specialty"
          value={requiredSpecialty}
          onChange={(e) => setRequiredSpecialty(e.target.value)}
        />
      )}
      <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="">Priority</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </Select>
      <Textarea
        placeholder="Clinical reason for this decision"
        value={clinicalReason}
        onChange={(e) => setClinicalReason(e.target.value)}
      />
      <Button onClick={submit} disabled={saving}>
        {saving ? "Recording..." : "Record Disposition"}
      </Button>
    </div>
  );
}

function CloseVisitPanel({
  visitId,
  setNotice,
  onClosed,
}: {
  visitId: number;
  setNotice: (notice: Notice | null) => void;
  onClosed: () => void;
}) {
  const [consultationFee, setConsultationFee] = useState("500");
  const [items, setItems] = useState<{ label: string; amount: number }[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [closing, setClosing] = useState(false);

  const preview = async () => {
    setLoadingPreview(true);
    try {
      const data = await apiFetch<{ items: { label: string; amount: number }[]; total: number }>(
        `/api/er/visits/${visitId}/charges?consultation_fee=${encodeURIComponent(consultationFee || "0")}`,
      );
      setItems(data.items);
      setTotal(data.total);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to compute charges.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const confirmClose = async () => {
    setClosing(true);
    try {
      const result = await apiFetch<{ invoice_id: number | null; total: number }>(
        `/api/er/visits/${visitId}/close`,
        {
          method: "POST",
          body: JSON.stringify({
            consultation_fee: Number(consultationFee) || 0,
            total_amount: total,
          }),
        },
      );
      setNotice({
        type: "success",
        message: result.invoice_id
          ? `Visit closed. Invoice raised for ${result.total}.`
          : "Visit closed.",
      });
      onClosed();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to close the visit.");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="panel" style={{ marginTop: "0.75rem" }}>
      <h4 style={{ marginTop: 0 }}>Close Visit &amp; Raise Invoice</h4>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <div>
          <Label htmlFor="er-consultation-fee">Consultation fee</Label>
          <Input
            id="er-consultation-fee"
            value={consultationFee}
            onChange={(e) => setConsultationFee(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={preview} disabled={loadingPreview}>
          {loadingPreview ? "Calculating..." : "Preview Charges"}
        </Button>
      </div>

      {items && (
        <>
          <Table>
            <TableHead>
              <TableCell>Item</TableCell>
              <TableCell>Amount</TableCell>
            </TableHead>
            {items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.label}</TableCell>
                <TableCell>{item.amount}</TableCell>
              </TableRow>
            ))}
          </Table>
          <div style={{ margin: "0.5rem 0" }}>
            <Label htmlFor="er-total-review">Total (editable)</Label>
            <Input
              id="er-total-review"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value) || 0)}
            />
          </div>
          <Button onClick={confirmClose} disabled={closing}>
            {closing ? "Closing..." : "Confirm Close & Raise Invoice"}
          </Button>
        </>
      )}
    </div>
  );
}
