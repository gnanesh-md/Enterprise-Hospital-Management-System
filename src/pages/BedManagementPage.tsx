import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiPlus,
  FiRepeat,
  FiSearch,
  FiTool,
  FiUser,
  FiX,
} from "react-icons/fi";
import StatCard from "../components/StatCard";
import {
  Button,
  Input,
  Label,
  Modal,
  Table,
  TableCell,
  TableHead,
  TableRow,
  Textarea,
} from "../components/ui";
import { apiFetch, reportError } from "../lib/api";
import { generateAndSaveDischargeSummary } from "../lib/dischargeSummary";
import { formatDateTimeIST } from "../lib/format";
import type { Notice, Patient } from "../types";
import DischargedDirectoryView from "../components/bed/DischargedDirectoryView";
import { WardBedBoard } from "../components/bed/WardBedBoard";

type Props = {
  setNotice: (notice: Notice | null) => void;
  // Lets a bed card's patient name jump straight to that patient's real
  // Clinical chart (Patient Chart) instead of just opening this page's own
  // bed-allocation modal.
  onOpenPatientClinical?: (patientId: string) => void;
};

type BedStatus = "Available" | "Occupied" | "Maintenance";

type Bed = {
  id: number;
  ward: string;
  room_no: string;
  bed_no: string;
  bed_type: string;
  status: BedStatus;
  daily_rate: number | null;
  allocation_id: number | null;
  admission_id: number | null;
  allocated_at: string | null;
  admission_date: string | null;
  expected_discharge_date: string | null;
  patient_id: string | null;
  patient_name: string | null;
  patient_last_name: string | null;
  patient_phone: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  admission_notes: string | null;
  room_charges_so_far: number | null;
};

type ErBedRequest = {
  id: number;
  er_visit_id: number;
  visit_no: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_last_name: string | null;
  is_unknown_patient: boolean;
  unknown_patient_label: string | null;
  requested_level_of_care: string;
  requested_specialty: string | null;
  requested_at: string;
};

function erRequestPatientLabel(req: ErBedRequest): string {
  if (req.is_unknown_patient) return req.unknown_patient_label || "Unknown patient";
  const name = `${req.patient_name || ""} ${req.patient_last_name || ""}`.trim();
  return name || req.patient_id || "Patient";
}

type RoomChargeSegment = {
  ward: string;
  room_no: string;
  bed_no: string;
  days: number;
  daily_rate: number;
  amount: number;
};

type Summary = {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
};

type DischargeChecklist = {
  billing: { ok: boolean; pending_invoices: { invoice_no: string; due_amount: number }[] };
  prescriptions: { ok: boolean; pending_count: number };
  documents: { count: number };
  room_charges: { segments: RoomChargeSegment[]; total: number };
  clear: boolean;
};

const BED_TYPES = ["General", "ICU", "Private", "Semi-Private"];

// Starting per-day room rates by bed type -- mirrors
// BED_TYPE_DEFAULT_DAILY_RATE in backend/utils/database.py. Just a seed for
// the Add Bed form; every bed's rate is freely editable afterward.
const BED_TYPE_DEFAULT_DAILY_RATE: Record<string, number> = {
  General: 1500,
  "Semi-Private": 2500,
  Private: 4000,
  ICU: 8000,
};

function formatINR(amount: number) {
  return `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;
}

const EMPTY_NEW_BED = {
  ward: "",
  room_no: "",
  bed_no: "",
  bed_type: "General",
  daily_rate: String(BED_TYPE_DEFAULT_DAILY_RATE.General),
};
const EMPTY_BED_RANGE = {
  ward: "",
  room_no: "",
  from_bed: "",
  to_bed: "",
  bed_type: "General",
  daily_rate: String(BED_TYPE_DEFAULT_DAILY_RATE.General),
};

function bedOccupantName(bed: Bed) {
  return `${bed.patient_name || ""} ${bed.patient_last_name || ""}`.trim() || "-";
}

function statusCounts(bedsInGroup: Bed[]) {
  return {
    available: bedsInGroup.filter((b) => b.status === "Available").length,
    occupied: bedsInGroup.filter((b) => b.status === "Occupied").length,
    maintenance: bedsInGroup.filter((b) => b.status === "Maintenance").length,
  };
}

// Length-of-stay progress, derived purely from admission_date/expected_discharge_date
// so the "day X of N" figure can never drift out of sync with a separately-stored
// day count -- there isn't one, the date is the only source of truth.
function losProgress(bed: Bed) {
  if (!bed.admission_date) return null;
  const start = new Date(bed.admission_date);
  const today = new Date();
  const dayNum = Math.max(
    1,
    Math.floor((today.getTime() - start.getTime()) / 86400000) + 1,
  );
  if (!bed.expected_discharge_date) return { dayNum, totalDays: null, overdue: false, pct: null };
  const end = new Date(bed.expected_discharge_date);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  const overdue = today.getTime() > end.getTime();
  const pct = Math.min(100, Math.round((dayNum / totalDays) * 100));
  return { dayNum, totalDays, overdue, pct };
}

function bedTypeStyle(bedType: string): CSSProperties {
  if (bedType === "ICU") {
    return { background: "#ede9fe", color: "#5b21b6", border: "1px solid #c4b5fd" };
  }
  if (bedType === "Private") {
    return { background: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd" };
  }
  if (bedType === "Semi-Private") {
    return { background: "#f0fdf4", color: "#166534", border: "1px solid #86efac" };
  }
  return { background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" };
}

export default function BedManagementPage({ setNotice, onOpenPatientClinical }: Props) {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [selectedWard, setSelectedWard] = useState("all");

  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [editingBedDetails, setEditingBedDetails] = useState(false);
  const [editBedForm, setEditBedForm] = useState(EMPTY_NEW_BED);
  const [savingBedEdit, setSavingBedEdit] = useState(false);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [assignNotes, setAssignNotes] = useState("");
  const [expectedLosDays, setExpectedLosDays] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const [addBedOpen, setAddBedOpen] = useState(false);
  const [newBedRange, setNewBedRange] = useState(EMPTY_BED_RANGE);
  const [addingBed, setAddingBed] = useState(false);

  // Transfer (ward change / shift to ICU) -- moves the patient to a different
  // bed while keeping the same admission, unlike release-then-reassign.
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFilter, setTransferFilter] = useState("");
  const [transferTargetId, setTransferTargetId] = useState<number | null>(null);
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Discharge checklist -- warns about pending dues/prescriptions but never
  // blocks; staff can confirm anyway with a reason (discharge-against-advice).
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [checklist, setChecklist] = useState<DischargeChecklist | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [dischargeReason, setDischargeReason] = useState("");
  const [roomChargeSegments, setRoomChargeSegments] = useState<RoomChargeSegment[]>([]);

  // ER Bed Requests -- Reception's side of the ER handoff. This is
  // deliberately surfaced here rather than in the ER module's own page: the
  // ER doctor only ever records a clinical decision (Ward/ICU/OT/Observation
  // needed); picking the actual bed is a Bed Management action, gated on the
  // same beds.write permission as every other bed action on this page.
  const [erRequests, setErRequests] = useState<ErBedRequest[]>([]);
  const [erRequestsLoading, setErRequestsLoading] = useState(false);
  const [allocatingRequest, setAllocatingRequest] = useState<ErBedRequest | null>(null);
  const [lamaRequest, setLamaRequest] = useState<ErBedRequest | null>(null);
  const [allocateFilter, setAllocateFilter] = useState("");
  const [allocateBedId, setAllocateBedId] = useState<number | null>(null);
  const [allocateNotes, setAllocateNotes] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [filterMatchingOnly, setFilterMatchingOnly] = useState(true);

  // Discharged Directory View
  const [activeView, setActiveView] = useState<"bed_board" | "discharged">("bed_board");
  const [dischargedPatients, setDischargedPatients] = useState<any[]>([]);
  const [dischargedLoading, setDischargedLoading] = useState(false);
  const [dischargedSearch, setDischargedSearch] = useState("");

  const loadDischarged = async () => {
    setDischargedLoading(true);
    try {
      const data = await apiFetch<{ discharged_patients: any[] }>("/api/beds/discharged");
      setDischargedPatients(data.discharged_patients || []);
    } catch {
      setDischargedPatients([]);
    } finally {
      setDischargedLoading(false);
    }
  };

  const requestedCareType = useMemo(() => {
    if (!allocatingRequest) return null;
    const loc = (allocatingRequest.requested_level_of_care || "").toLowerCase();
    const spec = (allocatingRequest.requested_specialty || "").toLowerCase();
    if (loc === "icu" || spec.includes("icu") || spec.includes("critical") || spec.includes("cardiac")) {
      return { type: "ICU", label: "ICU (Intensive Care Unit)" };
    }
    if (loc === "private" || spec.includes("private") || spec.includes("deluxe")) {
      return { type: "Private", label: "Private Deluxe Ward" };
    }
    if (loc === "semi-private" || spec.includes("semi")) {
      return { type: "Semi-Private", label: "Semi-Private Ward" };
    }
    if (loc === "ward" || loc === "general" || loc === "observation" || spec.includes("general") || spec.includes("ward")) {
      return { type: "General", label: "General Ward" };
    }
    return null;
  }, [allocatingRequest]);

  // The requested specialty (e.g. "Cardiology", from the doctor already
  // assigned to the patient in the ER) is free text, not one of the four
  // bed_type buckets above -- so it's matched separately against actual
  // ward names, letting a specialty-named ward (e.g. "Cardiology Ward")
  // surface as the top pick even though it isn't literally "ICU"/"General".
  const specialtyWardWords = useMemo(() => {
    const spec = (allocatingRequest?.requested_specialty || "").trim().toLowerCase();
    if (!spec) return [];
    return spec.split(/[^a-z]+/).filter((w) => w.length > 3);
  }, [allocatingRequest]);

  const bedMatchesSpecialtyWard = (bed: Bed): boolean => {
    if (specialtyWardWords.length === 0) return false;
    const ward = bed.ward.toLowerCase();
    return specialtyWardWords.some((w) => ward.includes(w));
  };

  const loadErRequests = async () => {
    setErRequestsLoading(true);
    try {
      const data = await apiFetch<{ bed_requests: ErBedRequest[] }>(
        "/api/er/bed-requests?status=pending",
      );
      setErRequests(data.bed_requests || []);
    } catch {
      setErRequests([]);
    } finally {
      setErRequestsLoading(false);
    }
  };

  const availableBedsForAllocation = useMemo(() => {
    const text = allocateFilter.trim().toLowerCase();
    const filtered = beds
      .filter((b) => b.status === "Available")
      .filter((b) => {
        if (filterMatchingOnly && requestedCareType) {
          const isMatch =
            b.bed_type.toLowerCase() === requestedCareType.type.toLowerCase() ||
            b.ward.toLowerCase().includes(requestedCareType.type.toLowerCase()) ||
            bedMatchesSpecialtyWard(b);
          if (!isMatch) return false;
        }
        if (!text) return true;
        return [b.ward, b.room_no, b.bed_no, b.bed_type]
          .filter(Boolean)
          .some((field) => (field as string).toLowerCase().includes(text));
      });
    // Specialty-ward matches (e.g. a "Cardiology Ward" bed for a patient
    // assigned to Cardiology) are the most specific recommendation available,
    // so they're surfaced ahead of a same-bed_type bed in an unrelated ward.
    return [...filtered].sort((a, b) => {
      const aMatch = bedMatchesSpecialtyWard(a) ? 1 : 0;
      const bMatch = bedMatchesSpecialtyWard(b) ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [beds, allocateFilter, filterMatchingOnly, requestedCareType, specialtyWardWords]);

  const closeAllocateModal = () => {
    setAllocatingRequest(null);
    setAllocateFilter("");
    setAllocateBedId(null);
    setAllocateNotes("");
    setFilterMatchingOnly(true);
  };

  const handleAllocateErBed = async () => {
    if (!allocatingRequest || !allocateBedId) return;
    setAllocating(true);
    try {
      await apiFetch(`/api/er/bed-requests/${allocatingRequest.id}/allocate`, {
        method: "POST",
        body: JSON.stringify({ bed_id: allocateBedId, notes: allocateNotes }),
      });
      setNotice({ type: "success", message: "Bed allocated from ER request." });
      closeAllocateModal();
      await Promise.all([loadBeds(), loadErRequests()]);
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to allocate this bed.",
      );
    } finally {
      setAllocating(false);
    }
  };

  const loadBeds = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ beds: Bed[]; summary: Summary }>(
        "/api/beds",
      );
      setBeds(data.beds || []);
      setSummary(
        data.summary || { total: 0, available: 0, occupied: 0, maintenance: 0 },
      );
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to load beds.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBeds();
    void loadErRequests();
    void loadDischarged();
  }, []);

  useEffect(() => {
    if (patientQuery.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const data = await apiFetch<{ patients: Patient[] }>(
          `/api/patients?q=${encodeURIComponent(patientQuery.trim())}`,
        );
        setPatientResults((data.patients || []).slice(0, 8));
      } catch {
        setPatientResults([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [patientQuery]);

  const resetSelection = () => {
    setSelectedBed(null);
    setEditingBedDetails(false);
    setPatientQuery("");
    setPatientResults([]);
    setSelectedPatient(null);
    setAssignNotes("");
    setExpectedLosDays("");
    setTransferOpen(false);
    setTransferFilter("");
    setTransferTargetId(null);
    setTransferReason("");
    setDischargeOpen(false);
    setChecklist(null);
    setDischargeReason("");
    setRoomChargeSegments([]);
  };

  const openBed = (bed: Bed) => {
    setSelectedBed(bed);
    setEditingBedDetails(false);
    setEditBedForm({
      ward: bed.ward,
      room_no: bed.room_no,
      bed_no: bed.bed_no,
      bed_type: bed.bed_type,
      daily_rate: String(
        bed.daily_rate ?? BED_TYPE_DEFAULT_DAILY_RATE[bed.bed_type] ?? BED_TYPE_DEFAULT_DAILY_RATE.General,
      ),
    });
    setPatientQuery("");
    setPatientResults([]);
    setSelectedPatient(null);
    setAssignNotes("");
    setExpectedLosDays("");
    setTransferOpen(false);
    setDischargeOpen(false);
    setChecklist(null);
    setRoomChargeSegments([]);
  };

  // All ward names, independent of the current search text or ward selection,
  // so the dropdown always lists every ward that exists.
  const wardOptions = useMemo(() => {
    const names = new Set(beds.map((bed) => bed.ward || "Unassigned Ward"));
    return Array.from(names).sort();
  }, [beds]);

  const wardScopedBeds = useMemo(() => {
    if (selectedWard === "all") return beds;
    return beds.filter((bed) => (bed.ward || "Unassigned Ward") === selectedWard);
  }, [beds, selectedWard]);

  // Stat cards reflect the selected ward (scope) but not the free-text search
  // (a further narrowing within that scope) -- same principle as before, just
  // now scoped to one ward at a time instead of always being hospital-wide.
  const displaySummary = useMemo(() => {
    if (selectedWard === "all") return summary;
    const counts = statusCounts(wardScopedBeds);
    return { total: wardScopedBeds.length, ...counts };
  }, [selectedWard, summary, wardScopedBeds]);

  const filteredBeds = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    if (!text) return wardScopedBeds;
    return wardScopedBeds.filter((bed) =>
      [
        bed.ward,
        bed.room_no,
        bed.bed_no,
        bed.bed_type,
        bedOccupantName(bed),
        bed.patient_id,
      ]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(text)),
    );
  }, [wardScopedBeds, filterText]);

  const groupedByWard = useMemo(() => {
    const wards = new Map<string, Map<string, Bed[]>>();
    for (const bed of filteredBeds) {
      const ward = bed.ward || "Unassigned Ward";
      const room = bed.room_no || "Unassigned Room";
      if (!wards.has(ward)) wards.set(ward, new Map());
      const rooms = wards.get(ward)!;
      if (!rooms.has(room)) rooms.set(room, []);
      rooms.get(room)!.push(bed);
    }
    return wards;
  }, [filteredBeds]);

  const otherAvailableBeds = useMemo(() => {
    const text = transferFilter.trim().toLowerCase();
    return beds
      .filter((b) => b.status === "Available" && b.id !== selectedBed?.id)
      .filter((b) => {
        if (!text) return true;
        return [b.ward, b.room_no, b.bed_no, b.bed_type]
          .filter(Boolean)
          .some((field) => (field as string).toLowerCase().includes(text));
      });
  }, [beds, transferFilter, selectedBed]);

  const handleAssign = async () => {
    if (!selectedBed || !selectedPatient) return;
    setAssigning(true);
    try {
      await apiFetch(`/api/beds/${selectedBed.id}/assign`, {
        method: "POST",
        body: JSON.stringify({
          patient_id: selectedPatient.patient_id,
          notes: assignNotes.trim(),
          expected_los_days: expectedLosDays.trim() || undefined,
        }),
      });
      setNotice({
        type: "success",
        message: `${selectedPatient.name || "Patient"} admitted to ${selectedBed.ward} / Room ${selectedBed.room_no} / Bed ${selectedBed.bed_no}.`,
      });
      resetSelection();
      await loadBeds();
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to assign this bed.",
      );
    } finally {
      setAssigning(false);
    }
  };

  const openTransfer = () => {
    setTransferOpen(true);
    setTransferFilter("");
    setTransferTargetId(null);
    setTransferReason("");
  };

  const handleTransfer = async () => {
    if (!selectedBed || !transferTargetId) return;
    setTransferring(true);
    try {
      await apiFetch(`/api/beds/${selectedBed.id}/transfer`, {
        method: "POST",
        body: JSON.stringify({
          to_bed_id: transferTargetId,
          reason: transferReason.trim(),
        }),
      });
      const target = beds.find((b) => b.id === transferTargetId);
      setNotice({
        type: "success",
        message: target
          ? `${bedOccupantName(selectedBed)} transferred to ${target.ward} / Room ${target.room_no} / Bed ${target.bed_no}.`
          : "Patient transferred.",
      });
      resetSelection();
      await loadBeds();
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to transfer this patient.",
      );
    } finally {
      setTransferring(false);
    }
  };

  const openDischarge = async (bed?: Bed) => {
    const targetBed = bed ?? selectedBed;
    if (!targetBed) return;
    setDischargeOpen(true);
    setChecklistLoading(true);
    setDischargeReason("");
    try {
      const data = await apiFetch<DischargeChecklist>(
        `/api/beds/${targetBed.id}/discharge-checklist`,
      );
      setChecklist(data);
      setRoomChargeSegments(data.room_charges?.segments || []);
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to load the discharge checklist.",
      );
      setChecklist(null);
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!selectedBed) return;
    setReleasing(true);
    try {
      const roomChargeTotal = roomChargeSegments.reduce(
        (sum, s) => sum + s.days * s.daily_rate,
        0,
      );
      await apiFetch(`/api/beds/${selectedBed.id}/release`, {
        method: "POST",
        body: JSON.stringify({
          discharge_override_reason: dischargeReason.trim() || undefined,
          room_charge_total: roomChargeSegments.length > 0 ? roomChargeTotal : undefined,
        }),
      });

      // Compile everything recorded during this stay (doctor/nurse notes,
      // vitals, diagnoses, medications, lab results) into a permanent
      // discharge summary -- best-effort: the bed is already released above,
      // so a summary failure here shouldn't look like the discharge failed.
      let summaryFailed = false;
      if (selectedBed.patient_id) {
        try {
          await generateAndSaveDischargeSummary(selectedBed.patient_id, selectedBed.admission_id ?? undefined);
        } catch {
          summaryFailed = true;
        }
      }

      setNotice({
        type: summaryFailed ? "warning" : "success",
        message:
          (roomChargeSegments.length > 0
            ? `Bed ${selectedBed.bed_no} released. Room charges bill: ${formatINR(roomChargeTotal)}.`
            : `Bed ${selectedBed.bed_no} released and patient discharged.`) +
          (summaryFailed ? " (Discharge summary could not be generated -- add it manually from the patient's chart.)" : ""),
      });
      resetSelection();
      await Promise.all([loadBeds(), loadDischarged()]);
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to release this bed.",
      );
    } finally {
      setReleasing(false);
    }
  };

  const handleSaveBedEdit = async () => {
    if (!selectedBed) return;
    setSavingBedEdit(true);
    try {
      await apiFetch(`/api/beds/${selectedBed.id}`, {
        method: "PUT",
        body: JSON.stringify(editBedForm),
      });
      setNotice({ type: "success", message: "Bed details updated." });
      resetSelection();
      await loadBeds();
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to update this bed.",
      );
    } finally {
      setSavingBedEdit(false);
    }
  };

  const handleDeleteBed = async () => {
    if (!selectedBed) return;
    try {
      await apiFetch(`/api/beds/${selectedBed.id}`, { method: "DELETE" });
      setNotice({ type: "success", message: `Bed ${selectedBed.bed_no} deleted.` });
      resetSelection();
      await loadBeds();
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to delete this bed.",
      );
    }
  };

  const handleToggleMaintenance = async () => {
    if (!selectedBed) return;
    const nextStatus = selectedBed.status === "Maintenance" ? "Available" : "Maintenance";
    setSavingBedEdit(true);
    try {
      await apiFetch(`/api/beds/${selectedBed.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      setNotice({
        type: "success",
        message: `Bed ${selectedBed.bed_no} marked as ${nextStatus}.`,
      });
      resetSelection();
      await loadBeds();
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to update bed status.",
      );
    } finally {
      setSavingBedEdit(false);
    }
  };

  const handleAddBed = async () => {
    setAddingBed(true);
    try {
      const result = await apiFetch<{
        created_count: number;
        skipped_count: number;
      }>("/api/beds/bulk", {
        method: "POST",
        body: JSON.stringify({
          ward: newBedRange.ward.trim(),
          room_no: newBedRange.room_no.trim(),
          from_bed: newBedRange.from_bed.trim(),
          to_bed: newBedRange.to_bed.trim(),
          bed_type: newBedRange.bed_type,
          daily_rate: Number(newBedRange.daily_rate) || 0,
        }),
      });
      const parts = [
        result.created_count > 0
          ? `${result.created_count} bed${result.created_count === 1 ? "" : "s"} added`
          : null,
        result.skipped_count > 0
          ? `${result.skipped_count} already existed`
          : null,
      ].filter(Boolean);
      setNotice({
        type: result.created_count > 0 ? "success" : "error",
        message: parts.join(", ") || "Nothing to add.",
      });
      setNewBedRange((prev) => ({ ...prev, from_bed: "", to_bed: "" }));
      await loadBeds();
    } catch (error) {
      reportError(
        setNotice,
        error as { message?: string; status?: number },
        "Unable to add these beds.",
      );
    } finally {
      setAddingBed(false);
    }
  };

  const filteredDischarged = dischargedPatients.filter((dp) => {
    const q = dischargedSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (dp.patientName || "").toLowerCase().includes(q) ||
      (dp.mrn || "").includes(q) ||
      (dp.ward || "").toLowerCase().includes(q) ||
      (dp.bedNo || "").toLowerCase().includes(q) ||
      (dp.dischargeReason || "").toLowerCase().includes(q)
    );
  });

  return (
    <section className="w-full min-h-screen bg-[#F8FAFC]">
      {/* ── SEGMENTED TOP NAVIGATION HEADER TABS ── */}
      <div className="w-full bg-white border-b border-[#E2E8F0] px-6 sm:px-8 pt-4 pb-0 mb-4 flex items-center justify-between flex-wrap gap-4 shadow-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveView("bed_board")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2.5 cursor-pointer ${
              activeView === "bed_board"
                ? "border-[#1B4FD8] text-[#1B4FD8] bg-transparent"
                : "border-transparent text-[#64748B] hover:text-[#0F172A] bg-transparent"
            }`}
          >
            <span>🛏️ Assign &amp; Manage Beds</span>
            <span
              className={`px-2 py-0.5 text-xs font-mono rounded-full font-bold ${
                activeView === "bed_board"
                  ? "bg-[#EFF6FF] text-[#1B4FD8]"
                  : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              {beds.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView("discharged");
              void loadDischarged();
            }}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2.5 cursor-pointer ${
              activeView === "discharged"
                ? "border-[#1B4FD8] text-[#1B4FD8] bg-transparent"
                : "border-transparent text-[#64748B] hover:text-[#0F172A] bg-transparent"
            }`}
          >
            <span>📑 Discharged Patients Directory</span>
            <span
              className={`px-2 py-0.5 text-xs font-mono rounded-full font-bold ${
                activeView === "discharged"
                  ? "bg-[#EFF6FF] text-[#1B4FD8]"
                  : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              {dischargedPatients.length}
            </span>
          </button>
        </div>

        {activeView === "bed_board" && (
          <div className="pb-2">
            <Button onClick={() => setAddBedOpen(true)}>
              <FiPlus aria-hidden /> Add Bed
            </Button>
          </div>
        )}
      </div>

      {activeView === "discharged" ? (
        <DischargedDirectoryView
          dischargedPatients={dischargedPatients}
          loading={dischargedLoading}
          onRefresh={loadDischarged}
        />
      ) : (
        <div className="px-6 sm:px-8 pb-12">
        <>
          <div className="stat-grid">
            <StatCard
              label={selectedWard === "all" ? "Total Beds" : `${selectedWard} — Beds`}
              value={displaySummary.total}
            />
            <StatCard label="Available" value={displaySummary.available} />
            <StatCard label="Occupied" value={displaySummary.occupied} />
            <StatCard label="Maintenance" value={displaySummary.maintenance} />
          </div>

          {(erRequestsLoading || erRequests.length > 0) && (
            <div className="panel">
              <div className="module-panel-head">
                <h3 style={{ margin: 0 }}>ER Bed Requests</h3>
                <p className="muted" style={{ margin: 0 }}>
                  The ER doctor's clinical decision -- pick the actual bed here.
                </p>
              </div>
              {erRequestsLoading ? (
                <p className="muted">Loading ER requests...</p>
              ) : (
                <Table>
                  <TableHead>
                    <TableCell>ER Visit</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Level of Care</TableCell>
                    <TableCell>Specialty</TableCell>
                    <TableCell>Requested</TableCell>
                    <TableCell />
                  </TableHead>
                  {erRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.visit_no}</TableCell>
                      <TableCell>{erRequestPatientLabel(req)}</TableCell>
                      <TableCell style={{ textTransform: "uppercase" }}>
                        {req.requested_level_of_care}
                      </TableCell>
                      <TableCell>{req.requested_specialty || "-"}</TableCell>
                      <TableCell>{formatDateTimeIST(req.requested_at)}</TableCell>
                      <TableCell style={{ textAlign: "right" }}>
                        <Button
                          type="button"
                          onClick={() => setAllocatingRequest(req)}
                        >
                          Allocate Bed
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          style={{ marginLeft: "0.5rem" }}
                          onClick={() => setLamaRequest(req)}
                        >
                          LAMA / Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              )}
            </div>
          )}

      <div className="panel">
        <div className="bed-map-toolbar">
          <select
            className="ui-input bed-ward-select"
            aria-label="Filter by ward"
            value={selectedWard}
            onChange={(event) => setSelectedWard(event.target.value)}
          >
            <option value="all">All Wards</option>
            {wardOptions.map((ward) => (
              <option key={ward} value={ward}>
                {ward}
              </option>
            ))}
          </select>
          <div className="ai-search-bar" style={{ maxWidth: "420px" }}>
            <FiSearch className="ai-search-icon" aria-hidden />
            <Input
              className="ai-search-input"
              placeholder="Filter by room, bed number, or patient name"
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
            />
          </div>
          <div className="bed-map-legend">
            <span className="bed-legend-item">
              <span className="bed-legend-swatch bed-legend-swatch-available" /> Available
            </span>
            <span className="bed-legend-item">
              <span className="bed-legend-swatch bed-legend-swatch-male" /> Occupied (Male)
            </span>
            <span className="bed-legend-item">
              <span className="bed-legend-swatch bed-legend-swatch-female" /> Occupied (Female)
            </span>
            <span className="bed-legend-item">
              <span className="bed-legend-swatch bed-legend-swatch-maintenance" /> Maintenance
            </span>
            <span className="bed-legend-item">
              <span className="bed-legend-swatch bed-legend-swatch-icu" /> ICU
            </span>
          </div>
        </div>

        {loading ? (
          <p className="muted">Loading beds...</p>
        ) : beds.length === 0 ? (
          <div className="module-empty-state">
            <p className="module-empty-state-title">No beds set up yet</p>
            <p className="module-empty-state-hint">
              Click "Add Bed" above to start building out your ward layout.
            </p>
          </div>
        ) : filteredBeds.length === 0 ? (
          <p className="muted">
            {filterText
              ? `No beds match "${filterText}".`
              : `No beds in ${selectedWard}.`}
          </p>
        ) : (
          Array.from(groupedByWard.entries()).map(([ward, rooms]) => {
            const wardBeds = Array.from(rooms.values()).flat();
            const wardCounts = statusCounts(wardBeds);
            const total = wardBeds.length || 1;
            return (
              <div className="bed-ward-block" key={ward}>
                <div className="bed-ward-header">
                  <h4 className="bed-ward-title">{ward}</h4>
                  <div className="bed-ward-counts">
                    <span
                      className="bed-count-badge bed-count-badge-available"
                      title="Available"
                    >
                      {wardCounts.available}
                    </span>
                    <span
                      className="bed-count-badge bed-count-badge-occupied"
                      title="Occupied"
                    >
                      {wardCounts.occupied}
                    </span>
                    {wardCounts.maintenance > 0 && (
                      <span
                        className="bed-count-badge bed-count-badge-maintenance"
                        title="Maintenance"
                      >
                        {wardCounts.maintenance}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="bed-occupancy-bar"
                  title={`${wardCounts.available} available, ${wardCounts.occupied} occupied, ${wardCounts.maintenance} maintenance`}
                >
                  {wardCounts.available > 0 && (
                    <span
                      className="bed-occupancy-segment bed-occupancy-segment-available"
                      style={{ width: `${(wardCounts.available / total) * 100}%` }}
                    />
                  )}
                  {wardCounts.occupied > 0 && (
                    <span
                      className="bed-occupancy-segment bed-occupancy-segment-occupied"
                      style={{ width: `${(wardCounts.occupied / total) * 100}%` }}
                    />
                  )}
                  {wardCounts.maintenance > 0 && (
                    <span
                      className="bed-occupancy-segment bed-occupancy-segment-maintenance"
                      style={{ width: `${(wardCounts.maintenance / total) * 100}%` }}
                    />
                  )}
                </div>
                <WardBedBoard
                  rooms={rooms}
                  onBedClick={openBed}
                  onPatientClick={
                    onOpenPatientClinical
                      ? (bed) => bed.patient_id && onOpenPatientClinical(bed.patient_id)
                      : undefined
                  }
                />
              </div>
            );
          })
        )}
      </div>

      {/* Add Bed(s) */}
      <Modal
        open={addBedOpen}
        onClose={() => setAddBedOpen(false)}
        title="Add Beds"
        description='Add one bed, or a whole numbered range at once -- e.g. 1 to 20 creates 20 beds in that room.'
      >
        <div className="module-form-grid">
          <Label>
            Ward
            <Input
              value={newBedRange.ward}
              onChange={(e) =>
                setNewBedRange({ ...newBedRange, ward: e.target.value })
              }
              placeholder="e.g. General Ward"
            />
          </Label>
          <Label>
            Room No.
            <Input
              value={newBedRange.room_no}
              onChange={(e) =>
                setNewBedRange({ ...newBedRange, room_no: e.target.value })
              }
              placeholder="e.g. 101"
            />
          </Label>
          <Label>
            From Bed No.
            <Input
              type="number"
              min={1}
              value={newBedRange.from_bed}
              onChange={(e) =>
                setNewBedRange({ ...newBedRange, from_bed: e.target.value })
              }
              placeholder="e.g. 1"
            />
          </Label>
          <Label>
            To Bed No. (optional)
            <Input
              type="number"
              min={1}
              value={newBedRange.to_bed}
              onChange={(e) =>
                setNewBedRange({ ...newBedRange, to_bed: e.target.value })
              }
              placeholder="Leave blank for a single bed"
            />
          </Label>
          <Label>
            Bed Type
            <select
              className="ui-input"
              value={newBedRange.bed_type}
              onChange={(e) =>
                setNewBedRange({
                  ...newBedRange,
                  bed_type: e.target.value,
                  daily_rate: String(BED_TYPE_DEFAULT_DAILY_RATE[e.target.value] ?? BED_TYPE_DEFAULT_DAILY_RATE.General),
                })
              }
            >
              {BED_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Label>
          <Label>
            Daily Rate (₹)
            <Input
              type="number"
              min={0}
              value={newBedRange.daily_rate}
              onChange={(e) =>
                setNewBedRange({ ...newBedRange, daily_rate: e.target.value })
              }
              placeholder="Room charge per day"
            />
          </Label>
        </div>
        <div className="ui-modal-actions" style={{ marginTop: "1rem" }}>
          <Button variant="ghost" onClick={() => setAddBedOpen(false)}>
            Done
          </Button>
          <Button
            onClick={handleAddBed}
            disabled={
              addingBed ||
              !newBedRange.ward.trim() ||
              !newBedRange.room_no.trim() ||
              !newBedRange.from_bed.trim()
            }
          >
            {addingBed
              ? "Adding..."
              : newBedRange.to_bed.trim() &&
                  newBedRange.to_bed.trim() !== newBedRange.from_bed.trim()
                ? `Add Beds ${newBedRange.from_bed || "?"}-${newBedRange.to_bed}`
                : "Add Bed"}
          </Button>
        </div>
      </Modal>

      {/* Bed detail / assign / transfer / discharge */}
      <Modal
        open={!!selectedBed}
        onClose={resetSelection}
        title={
          selectedBed
            ? `${selectedBed.ward} -- Room ${selectedBed.room_no} -- Bed ${selectedBed.bed_no}`
            : ""
        }
        description={selectedBed ? `${selectedBed.bed_type} bed` : undefined}
      >
        {selectedBed && selectedBed.status === "Occupied" && !transferOpen && !dischargeOpen && (
          <>
            <div className="bed-detail-patient">
              <FiUser aria-hidden />
              <div>
                <p className="bed-detail-patient-name">
                  {bedOccupantName(selectedBed)}
                </p>
                <p className="muted">
                  {selectedBed.patient_id}
                  {selectedBed.patient_age ? ` -- ${selectedBed.patient_age} yrs` : ""}
                  {selectedBed.patient_gender ? ` -- ${selectedBed.patient_gender}` : ""}
                  {selectedBed.patient_phone ? ` -- ${selectedBed.patient_phone}` : ""}
                </p>
              </div>
            </div>
            {selectedBed.allocated_at && (
              <p className="muted">
                Admitted {formatDateTimeIST(selectedBed.allocated_at)}
              </p>
            )}
            {(() => {
              const los = losProgress(selectedBed);
              return los ? (
                <p className="muted">
                  Day {los.dayNum}
                  {los.totalDays ? ` of ${los.totalDays} expected` : " (no expected discharge date set)"}
                  {los.overdue ? " — past expected discharge date" : ""}
                </p>
              ) : null;
            })()}
            {selectedBed.admission_notes && (
              <p style={{ marginTop: "0.5rem" }}>{selectedBed.admission_notes}</p>
            )}

            <div className="ui-modal-actions" style={{ marginTop: "1rem" }}>
              <Button variant="ghost" onClick={resetSelection}>
                Close
              </Button>
              {onOpenPatientClinical && selectedBed.patient_id && (
                <Button
                  variant="ghost"
                  onClick={() => onOpenPatientClinical(selectedBed.patient_id!)}
                >
                  <FiUser aria-hidden /> View Clinical Chart
                </Button>
              )}
              <Button variant="ghost" onClick={openTransfer}>
                <FiRepeat aria-hidden /> Transfer
              </Button>
              <Button variant="destructive" onClick={() => void openDischarge()}>
                Discharge
              </Button>
            </div>
          </>
        )}

        {/* Transfer panel */}
        {selectedBed && transferOpen && (
          <>
            <p className="muted">
              Move {bedOccupantName(selectedBed)} to a different bed -- e.g. a
              room change, or shifting them to ICU. This keeps the same
              admission and bed history intact.
            </p>
            <Label style={{ marginTop: "0.5rem" }}>
              Find an Available Bed
              <Input
                value={transferFilter}
                onChange={(e) => setTransferFilter(e.target.value)}
                placeholder="Search by ward, room, bed number, or type (try 'ICU')"
              />
            </Label>
            <div className="bed-transfer-target-list">
              {otherAvailableBeds.length === 0 ? (
                <p className="muted" style={{ padding: "0.5rem 0" }}>
                  No available beds match.
                </p>
              ) : (
                otherAvailableBeds.map((bed) => (
                  <button
                    type="button"
                    key={bed.id}
                    className={`bed-transfer-target${transferTargetId === bed.id ? " bed-transfer-target-selected" : ""}`}
                    onClick={() => setTransferTargetId(bed.id)}
                  >
                    <span>
                      {bed.ward} / Room {bed.room_no} / Bed {bed.bed_no}
                    </span>
                    <span
                      className="bed-card-type-badge"
                      style={bedTypeStyle(bed.bed_type)}
                    >
                      {bed.bed_type}
                    </span>
                  </button>
                ))
              )}
            </div>
            <Label style={{ marginTop: "0.75rem" }}>
              Reason for Transfer
              <Textarea
                rows={2}
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="e.g. Condition worsened, requires ICU monitoring"
              />
            </Label>
            <div className="ui-modal-actions" style={{ marginTop: "1rem" }}>
              <Button
                variant="ghost"
                onClick={() => setTransferOpen(false)}
                disabled={transferring}
              >
                Back
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={transferring || !transferTargetId || !transferReason.trim()}
              >
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </div>
          </>
        )}

        {/* Discharge checklist panel */}
        {selectedBed && dischargeOpen && (
          <>
            <p className="muted">
              Review before discharging {bedOccupantName(selectedBed)}. Pending
              items are shown as a warning -- you can still discharge if
              needed (e.g. discharge against medical advice).
            </p>
            {checklistLoading ? (
              <p className="muted" style={{ padding: "0.75rem 0" }}>
                Loading checklist...
              </p>
            ) : checklist ? (
              <div className="discharge-checklist">
                <div
                  className={`discharge-checklist-row${checklist.billing?.ok ? " discharge-checklist-row-ok" : " discharge-checklist-row-warn"}`}
                >
                  <span>
                    {checklist.billing?.ok ? (
                      <FiCheckCircle aria-hidden />
                    ) : (
                      <FiAlertTriangle aria-hidden />
                    )}{" "}
                    Billing
                  </span>
                  <span>
                    {checklist.billing?.ok
                      ? "All invoices settled"
                      : `${checklist.billing?.pending_invoices?.length || 0} invoice(s) with dues`}
                  </span>
                </div>
                <div
                  className={`discharge-checklist-row${checklist.prescriptions?.ok ? " discharge-checklist-row-ok" : " discharge-checklist-row-warn"}`}
                >
                  <span>
                    {checklist.prescriptions?.ok ? (
                      <FiCheckCircle aria-hidden />
                    ) : (
                      <FiAlertTriangle aria-hidden />
                    )}{" "}
                    Prescriptions
                  </span>
                  <span>
                    {checklist.prescriptions?.ok
                      ? "All fulfilled"
                      : `${checklist.prescriptions?.pending_count || 0} pending`}
                  </span>
                </div>
                <div className="discharge-checklist-row discharge-checklist-row-info">
                  <span>Documents</span>
                  <span>{checklist.documents?.count ?? 0} on file for this stay</span>
                </div>
              </div>
            ) : (
              <p className="muted" style={{ padding: "0.75rem 0" }}>
                Couldn't load the checklist -- you can still discharge below.
              </p>
            )}

            {roomChargeSegments.length > 0 && (
              <>
                <p className="muted" style={{ marginTop: "1rem" }}>
                  Room charges for this stay -- one line per ward/bed the
                  patient occupied. Rates are editable before billing.
                </p>
                <div className="table-responsive">
                  <Table>
                    <TableHead>
                      <TableCell>Ward / Room / Bed</TableCell>
                      <TableCell>Days</TableCell>
                      <TableCell>Rate / Day</TableCell>
                      <TableCell>Amount</TableCell>
                    </TableHead>
                    {roomChargeSegments.map((segment, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {segment.ward} / Room {segment.room_no} / Bed {segment.bed_no}
                        </TableCell>
                        <TableCell>{segment.days}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            style={{ width: "90px" }}
                            value={segment.daily_rate}
                            aria-label={`Daily rate for ${segment.ward} segment`}
                            onChange={(e) => {
                              const next = [...roomChargeSegments];
                              next[idx] = {
                                ...next[idx],
                                daily_rate: Number(e.target.value) || 0,
                              };
                              setRoomChargeSegments(next);
                            }}
                          />
                        </TableCell>
                        <TableCell style={{ fontWeight: 600 }}>
                          {formatINR(segment.days * segment.daily_rate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Table>
                </div>
                <div className="module-panel-head" style={{ marginTop: "0.75rem" }}>
                  <h3>
                    Room Charges Total:{" "}
                    {formatINR(
                      roomChargeSegments.reduce((sum, s) => sum + s.days * s.daily_rate, 0),
                    )}
                  </h3>
                </div>
              </>
            )}

            {checklist && !checklist.clear && (
              <Label style={{ marginTop: "0.75rem" }}>
                Reason for discharging despite pending items
                <Textarea
                  rows={2}
                  value={dischargeReason}
                  onChange={(e) => setDischargeReason(e.target.value)}
                  placeholder="e.g. Discharge against medical advice, dues to be settled later"
                />
              </Label>
            )}
            <div className="ui-modal-actions" style={{ marginTop: "1rem" }}>
              <Button
                variant="ghost"
                onClick={() => setDischargeOpen(false)}
                disabled={releasing}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleRelease}
                disabled={
                  releasing ||
                  (!!checklist && !checklist.clear && !dischargeReason.trim())
                }
              >
                {releasing
                  ? "Discharging..."
                  : checklist && !checklist.clear
                    ? "Discharge Anyway"
                    : "Confirm Discharge"}
              </Button>
            </div>
          </>
        )}

        {selectedBed && selectedBed.status !== "Occupied" && !editingBedDetails && (
          <>
            {selectedBed.status === "Maintenance" && (
              <p className="notice warning">
                <FiTool aria-hidden /> This bed is marked under maintenance.
              </p>
            )}
            {selectedBed.status === "Available" && (
              <>
                <Label>Find Patient</Label>
                <Input
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setSelectedPatient(null);
                  }}
                  placeholder="Search by name, phone, or patient ID"
                />
                {selectedPatient ? (
                  <div className="bed-selected-patient">
                    <span>
                      {selectedPatient.name} {selectedPatient.last_name || ""}{" "}
                      <span className="muted">({selectedPatient.patient_id})</span>
                    </span>
                    <button
                      type="button"
                      className="bed-selected-patient-clear"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientQuery("");
                      }}
                      aria-label="Clear selected patient"
                    >
                      <FiX aria-hidden />
                    </button>
                  </div>
                ) : (
                  patientResults.length > 0 && (
                    <div className="bed-patient-results">
                      {patientResults.map((patient) => (
                        <button
                          type="button"
                          key={patient.patient_id}
                          className="bed-patient-result"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setPatientQuery(
                              `${patient.name} ${patient.last_name || ""}`.trim(),
                            );
                            setPatientResults([]);
                          }}
                        >
                          <strong>
                            {patient.name} {patient.last_name || ""}
                          </strong>
                          <span className="muted">
                            {patient.patient_id}
                            {patient.phone ? ` -- ${patient.phone}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                )}
                <Label style={{ marginTop: "0.75rem" }}>
                  Expected Length of Stay (days, optional)
                  <Input
                    type="number"
                    min={1}
                    value={expectedLosDays}
                    onChange={(e) => setExpectedLosDays(e.target.value)}
                    placeholder="e.g. 3"
                  />
                </Label>
                <Label style={{ marginTop: "0.75rem" }}>
                  Admission Notes (optional)
                  <Textarea
                    rows={3}
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    placeholder="Reason for admission, attending doctor, etc."
                  />
                </Label>
                <div className="ui-modal-actions" style={{ marginTop: "1rem" }}>
                  <Button variant="ghost" onClick={resetSelection}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssign}
                    disabled={assigning || !selectedPatient}
                  >
                    {assigning ? "Admitting..." : (
                      <>
                        <FiCheckCircle aria-hidden /> Admit to This Bed
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            <div className="bed-detail-footer-actions">
              <button
                type="button"
                className="bed-link-button"
                onClick={handleToggleMaintenance}
                disabled={savingBedEdit}
              >
                {selectedBed.status === "Maintenance"
                  ? "Mark Available"
                  : "Mark Under Maintenance"}
              </button>
              <button
                type="button"
                className="bed-link-button"
                onClick={() => setEditingBedDetails(true)}
              >
                Edit Bed Details
              </button>
            </div>
          </>
        )}

        {selectedBed && editingBedDetails && (
          <>
            <div className="module-form-grid">
              <Label>
                Ward
                <Input
                  value={editBedForm.ward}
                  onChange={(e) =>
                    setEditBedForm({ ...editBedForm, ward: e.target.value })
                  }
                />
              </Label>
              <Label>
                Room No.
                <Input
                  value={editBedForm.room_no}
                  onChange={(e) =>
                    setEditBedForm({ ...editBedForm, room_no: e.target.value })
                  }
                />
              </Label>
              <Label>
                Bed No.
                <Input
                  value={editBedForm.bed_no}
                  onChange={(e) =>
                    setEditBedForm({ ...editBedForm, bed_no: e.target.value })
                  }
                />
              </Label>
              <Label>
                Bed Type
                <select
                  className="ui-input"
                  value={editBedForm.bed_type}
                  onChange={(e) =>
                    setEditBedForm({ ...editBedForm, bed_type: e.target.value })
                  }
                >
                  {BED_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                Daily Rate (₹)
                <Input
                  type="number"
                  min={0}
                  value={editBedForm.daily_rate}
                  onChange={(e) =>
                    setEditBedForm({ ...editBedForm, daily_rate: e.target.value })
                  }
                  placeholder="Room charge per day"
                />
              </Label>
            </div>
            <div className="ui-modal-actions" style={{ marginTop: "1rem" }}>
              <Button
                variant="destructive"
                onClick={handleDeleteBed}
                disabled={savingBedEdit}
              >
                Delete Bed
              </Button>
              <Button
                variant="ghost"
                onClick={() => setEditingBedDetails(false)}
                disabled={savingBedEdit}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveBedEdit} disabled={savingBedEdit}>
                {savingBedEdit ? "Saving..." : "Save"}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        open={!!allocatingRequest}
        onClose={closeAllocateModal}
        title="Allocate Bed"
        description={
          allocatingRequest
            ? `ER Admission: ${allocatingRequest.visit_no} — ${erRequestPatientLabel(allocatingRequest)}`
            : undefined
        }
      >
        {allocatingRequest && (
          <>
            {requestedCareType && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: requestedCareType.type === "ICU" ? "#f5f3ff" : "#f0f9ff",
                  border: requestedCareType.type === "ICU" ? "1px solid #ddd6fe" : "1px solid #bae6fd",
                  borderRadius: "8px",
                  padding: "0.65rem 0.85rem",
                  marginBottom: "0.85rem",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Specialty / Care Level:
                  </span>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: requestedCareType.type === "ICU" ? "#5b21b6" : "#0369a1",
                      marginTop: "0.1rem",
                    }}
                  >
                    {requestedCareType.label}
                    {allocatingRequest.requested_specialty && (
                      <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "#64748b", marginLeft: "0.4rem" }}>
                        ({allocatingRequest.requested_specialty})
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  <button
                    type="button"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.35rem 0.65rem",
                      borderRadius: "6px",
                      border: filterMatchingOnly ? "1px solid #7c3aed" : "1px solid #cbd5e1",
                      background: filterMatchingOnly ? "#7c3aed" : "#fff",
                      color: filterMatchingOnly ? "#fff" : "#475569",
                      cursor: "pointer",
                    }}
                    onClick={() => setFilterMatchingOnly(true)}
                  >
                    {requestedCareType.type} Beds Only
                  </button>
                  <button
                    type="button"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      padding: "0.35rem 0.65rem",
                      borderRadius: "6px",
                      border: !filterMatchingOnly ? "1px solid #0284c7" : "1px solid #cbd5e1",
                      background: !filterMatchingOnly ? "#0284c7" : "#fff",
                      color: !filterMatchingOnly ? "#fff" : "#475569",
                      cursor: "pointer",
                    }}
                    onClick={() => setFilterMatchingOnly(false)}
                  >
                    All Available Beds
                  </button>
                </div>
              </div>
            )}

            <div className="ai-search-bar" style={{ marginBottom: "0.75rem" }}>
              <FiSearch className="ai-search-icon" aria-hidden />
              <Input
                className="ai-search-input"
                placeholder="Filter by room or bed number (e.g. ICU-1, Bed 3)"
                value={allocateFilter}
                onChange={(e) => setAllocateFilter(e.target.value)}
              />
            </div>

            {availableBedsForAllocation.length === 0 ? (
              <div style={{ padding: "1.25rem", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
                  No available {filterMatchingOnly && requestedCareType ? requestedCareType.label : ""} beds match this criteria.
                </p>
                {filterMatchingOnly && (
                  <button
                    type="button"
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.8rem",
                      color: "#2563eb",
                      background: "none",
                      border: "none",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                    onClick={() => setFilterMatchingOnly(false)}
                  >
                    View all other available hospital beds
                  </button>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "0.6rem",
                  maxHeight: "280px",
                  overflowY: "auto",
                  padding: "0.2rem",
                }}
              >
                {availableBedsForAllocation.map((bed) => {
                  const isSelected = allocateBedId === bed.id;
                  const isBestMatch = bedMatchesSpecialtyWard(bed);
                  return (
                    <button
                      key={bed.id}
                      type="button"
                      style={{
                        textAlign: "left",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                        background: isSelected ? "#eff6ff" : "#ffffff",
                        boxShadow: isSelected ? "0 2px 6px rgba(37,99,235,0.15)" : "none",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.3rem",
                        transition: "all 0.15s ease-in-out",
                      }}
                      onClick={() => setAllocateBedId(bed.id)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "0.92rem", color: isSelected ? "#1e40af" : "#0f172a" }}>
                          Bed {bed.bed_no}
                        </strong>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.45rem",
                            borderRadius: "4px",
                            ...bedTypeStyle(bed.bed_type),
                          }}
                        >
                          {bed.bed_type}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                        {bed.ward} &middot; Room {bed.room_no}
                      </div>
                      {isBestMatch && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#15803d" }}>
                          ✓ Best match for {allocatingRequest.requested_specialty}
                        </span>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.2rem" }}>
                        <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#059669" }}>
                          {formatINR(bed.daily_rate ?? BED_TYPE_DEFAULT_DAILY_RATE[bed.bed_type] ?? 1500)}/day
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563eb" }}>
                            ✔ Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <Label style={{ marginTop: "0.85rem" }}>
              Admission Notes (optional)
              <Textarea
                rows={2}
                value={allocateNotes}
                onChange={(e) => setAllocateNotes(e.target.value)}
                placeholder="Admission reason, attending consultant, or handover details..."
              />
            </Label>
            <div className="ui-modal-actions" style={{ marginTop: "1rem" }}>
              <Button variant="ghost" onClick={closeAllocateModal} disabled={allocating}>
                Cancel
              </Button>
              <Button
                onClick={handleAllocateErBed}
                disabled={!allocateBedId || allocating}
              >
                {allocating ? "Allocating..." : "Confirm & Allocate Bed"}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {lamaRequest && (
        <BedRequestLamaModal
          request={lamaRequest}
          onClose={() => setLamaRequest(null)}
          onSaved={async () => {
            setLamaRequest(null);
            await Promise.all([loadBeds(), loadErRequests()]);
          }}
          setNotice={setNotice}
        />
      )}
        </>
        </div>
      )}
    </section>
  );
}

function BedRequestLamaModal({
  request,
  onClose,
  onSaved,
  setNotice,
}: {
  request: ErBedRequest;
  onClose: () => void;
  onSaved: () => void;
  setNotice: (notice: Notice | null) => void;
}) {
  const patientLabel = erRequestPatientLabel(request);
  const [refusalReason, setRefusalReason] = useState("Going to another hospital / facility of choice");
  const [signedBy, setSignedBy] = useState(patientLabel);
  const [relation, setRelation] = useState("Self (Patient)");
  const [phone, setPhone] = useState("");
  const [witnessDoctor, setWitnessDoctor] = useState("Dr. G. Suryanarayana");
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
      setNotice({ type: "error", message: "Please acknowledge the legal waiver." });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/api/er/bed-requests/${request.id}/lama`, {
        method: "POST",
        body: JSON.stringify({
          signed_by: signedBy.trim(),
          relation_to_patient: relation,
          signed_by_phone: phone.replace(/\D/g, "") || undefined,
          witness_doctor: witnessDoctor.trim(),
          refusal_reason: refusalReason,
          legal_waiver_acknowledged: true,
        }),
      });
      setNotice({
        type: "warning",
        message: "LAMA Legal Waiver recorded. Bed request cancelled and patient discharged under LAMA.",
      });
      onSaved();
    } catch (error: any) {
      reportError(setNotice, error, "Failed to record LAMA refusal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="⚠️ LAMA / Patient Refusal to Admit (Legal Waiver)"
      description={`ER Bed Request: ${request.visit_no} — ${patientLabel} (${request.requested_level_of_care.toUpperCase()})`}
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
          <strong style={{ display: "block", color: "#991b1b", marginBottom: "0.3rem" }}>
            HOSPITAL LEGAL INDEMNITY &amp; LAMA WAIVER:
          </strong>
          The patient/family refuses the recommended inpatient/ICU bed admission against doctor advice. By executing this document, the patient/guardian assumes full clinical responsibility and absolves the hospital and doctors from all liability for any subsequent complications or fatality.
        </div>

        <div>
          <Label>Refusal Reason</Label>
          <select
            className="ui-input"
            value={refusalReason}
            onChange={(e) => setRefusalReason(e.target.value)}
          >
            <option value="Going to another hospital / facility of choice">Going to another hospital / facility of choice</option>
            <option value="Financial constraints / unaffordable treatment or bed charges">Financial constraints / unaffordable treatment or bed charges</option>
            <option value="Personal / family preference to manage and nurse at home">Personal / family preference to manage and nurse at home</option>
            <option value="Refusal of ICU admission / invasive mechanical ventilation">Refusal of ICU admission / invasive mechanical ventilation</option>
            <option value="Dissatisfaction with treatment / refusal of emergency procedure">Dissatisfaction with treatment / refusal of emergency procedure</option>
            <option value="Other clinical refusal">Other clinical refusal</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <Label>Signer Name</Label>
            <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Full name of signer" />
          </div>
          <div>
            <Label>Relationship</Label>
            <select
              className="ui-input"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
            >
              <option value="Self (Patient)">Self (Patient)</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Spouse">Spouse</option>
              <option value="Son">Son</option>
              <option value="Daughter">Daughter</option>
              <option value="Guardian / Relative">Guardian / Relative</option>
              <option value="Other">Other</option>
            </select>
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
            <Label>Witness Doctor</Label>
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
            <strong>I acknowledge the LAMA declaration</strong>, releasing the hospital and treating medical staff from all liability and cancelling this bed request.
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
            {submitting ? "Processing..." : "Sign LAMA & Cancel Bed Request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
