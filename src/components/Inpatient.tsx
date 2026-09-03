import { useEffect, useMemo, useState } from "react";
import { FiBell, FiClock, FiUsers } from "react-icons/fi";
import { Btn } from "./shared";
import { bedGenderVariant, bedOccupantName } from "./bed/BedCard";
import { WardBedBoard } from "./bed/WardBedBoard";
import ICU from "./ICU";
import { apiFetch } from "../lib/api";
import { formatDateTimeIST } from "../lib/format";

type BedStatus = "Available" | "Occupied" | "Maintenance";

type Bed = {
  id: number;
  ward: string;
  room_no: string;
  bed_no: string;
  bed_type: string;
  status: BedStatus;
  admission_date: string | null;
  expected_discharge_date: string | null;
  patient_id: string | null;
  patient_name: string | null;
  patient_last_name: string | null;
  patient_phone: string | null;
  patient_age: number | null;
  patient_gender: string | null;
  admission_id: number | null;
  allocation_id: number | null;
  allocated_at: string | null;
};

type Summary = { total: number; available: number; occupied: number; maintenance: number };

type ErBedRequest = {
  id: number;
  visit_no: string;
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
  return name || "Patient";
}

function isOverdue(bed: Bed): boolean {
  if (bed.status !== "Occupied" || !bed.expected_discharge_date) return false;
  return Date.now() > new Date(bed.expected_discharge_date).getTime();
}

function overdueDays(bed: Bed): number {
  if (!bed.expected_discharge_date) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(bed.expected_discharge_date).getTime()) / 86400000));
}

// A room where an occupied male bed and an occupied female bed sit together
// is a real ward-compliance concern (most hospitals segregate rooms by
// gender) -- this reuses the same gender read as the bed card's color, so
// the alert and the color coding can never disagree with each other.
function findMixedGenderRooms(beds: Bed[]): { ward: string; room_no: string; beds: Bed[] }[] {
  const rooms = new Map<string, Bed[]>();
  for (const bed of beds) {
    if (bed.status !== "Occupied") continue;
    const key = `${bed.ward}||${bed.room_no}`;
    if (!rooms.has(key)) rooms.set(key, []);
    rooms.get(key)!.push(bed);
  }
  const flagged: { ward: string; room_no: string; beds: Bed[] }[] = [];
  for (const [key, roomBeds] of rooms) {
    const genders = new Set(roomBeds.map((b) => bedGenderVariant(b)).filter((g) => g !== "other"));
    if (genders.size > 1) {
      const [ward, room_no] = key.split("||");
      flagged.push({ ward, room_no, beds: roomBeds });
    }
  }
  return flagged;
}

// A patient is "in ICU" if their bed's ward name contains ICU -- covers the
// umbrella "ICU" ward plus its SICU/IICU rooms, since ward is free text the
// hospital names however it likes (see Bed Management's ward field).
function isIcuBed(bed: Bed): boolean {
  return bed.ward.toUpperCase().includes("ICU");
}

// Keyed on allocation_id, not admission_id -- a transfer INTO an ICU bed is
// its own new bed_allocations row (allocation_id changes) even though the
// underlying hospital admission_date doesn't, and a transfer is exactly the
// kind of event ICU staff need notified about, same as a fresh admission.
function icuAdmissionKey(bed: Bed): string {
  return `${bed.id}:${bed.allocation_id ?? bed.admission_id ?? bed.admission_date ?? ""}`;
}

const ICU_ACK_STORAGE_KEY = "hms_icu_admission_acks";

function loadAckedIcuAdmissions(): Set<string> {
  try {
    const raw = window.localStorage.getItem(ICU_ACK_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveAckedIcuAdmissions(keys: Set<string>) {
  try {
    // Cap stored history so this can't grow unbounded over months of use.
    window.localStorage.setItem(ICU_ACK_STORAGE_KEY, JSON.stringify(Array.from(keys).slice(-500)));
  } catch {
    // Best-effort -- a private/blocked storage context just means the same
    // alert may resurface next visit, not a functional failure.
  }
}

function wardOccupancyLevel(occupied: number, total: number): "low" | "high" | "critical" {
  if (total === 0) return "low";
  const pct = (occupied / total) * 100;
  if (pct >= 90) return "critical";
  if (pct >= 70) return "high";
  return "low";
}

type Props = {
  navigate?: (page: string, sub?: string) => void;
  onOpenPatientClinical?: (patientId: string) => void;
  permissions?: string[];
};

export default function Inpatient({ navigate, onOpenPatientClinical, permissions }: Props) {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, available: 0, occupied: 0, maintenance: 0 });
  const [pendingRequests, setPendingRequests] = useState<ErBedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bedsRes, requestsRes] = await Promise.all([
          apiFetch<{ beds: Bed[]; summary: Summary }>("/api/beds"),
          apiFetch<{ bed_requests: ErBedRequest[] }>("/api/er/bed-requests?status=pending").catch(() => ({
            bed_requests: [] as ErBedRequest[],
          })),
        ]);
        setBeds(bedsRes.beds || []);
        setSummary(bedsRes.summary || { total: 0, available: 0, occupied: 0, maintenance: 0 });
        setPendingRequests(requestsRes.bed_requests || []);
      } catch {
        setBeds([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groupedByWard = useMemo(() => {
    const wards = new Map<string, Map<string, Bed[]>>();
    for (const bed of beds) {
      const ward = bed.ward || "Unassigned Ward";
      if (!wards.has(ward)) wards.set(ward, new Map());
      const rooms = wards.get(ward)!;
      if (!rooms.has(bed.room_no)) rooms.set(bed.room_no, []);
      rooms.get(bed.room_no)!.push(bed);
    }
    return wards;
  }, [beds]);

  const wardNames = useMemo(() => Array.from(groupedByWard.keys()).sort(), [groupedByWard]);
  const activeWard = selectedWard && groupedByWard.has(selectedWard) ? selectedWard : wardNames[0] || null;
  const activeRooms = activeWard ? groupedByWard.get(activeWard)! : new Map<string, Bed[]>();

  const overdueBeds = useMemo(() => beds.filter(isOverdue), [beds]);
  const mixedGenderRooms = useMemo(() => findMixedGenderRooms(beds), [beds]);
  const hasAlerts = overdueBeds.length > 0 || mixedGenderRooms.length > 0;

  const [ackedIcuAdmissions, setAckedIcuAdmissions] = useState<Set<string>>(new Set());
  useEffect(() => {
    setAckedIcuAdmissions(loadAckedIcuAdmissions());
  }, []);
  const icuAdmissionAlerts = useMemo(
    () =>
      beds.filter(
        (b) =>
          b.status === "Occupied" &&
          isIcuBed(b) &&
          (b.allocated_at || b.admission_date) &&
          !ackedIcuAdmissions.has(icuAdmissionKey(b)),
      ),
    [beds, ackedIcuAdmissions],
  );
  const acknowledgeIcuAdmission = (bed: Bed) => {
    const next = new Set(ackedIcuAdmissions);
    next.add(icuAdmissionKey(bed));
    setAckedIcuAdmissions(next);
    saveAckedIcuAdmissions(next);
  };

  const goToBedManagement = () => navigate?.("beds");
  const openWard = (ward: string) => {
    setSelectedWard(ward);
    document.getElementById("ward-room-board")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Inpatient Bed Board</h1>
          <p className="text-[11.5px] text-[#64748B]">
            Hospital-wide occupancy &amp; alerts &middot; read-only &mdash; use Bed Management to allocate, transfer, or discharge
          </p>
        </div>
        <Btn variant="primary" size="sm" onClick={goToBedManagement}>Open Bed Management →</Btn>
      </div>

      {/* Summary */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3 flex items-center gap-8 text-[12.5px]">
        <div><span className="font-mono font-semibold text-gray-900 text-lg">{summary.total}</span> <span className="text-[#64748B]">Total Beds</span></div>
        <div><span className="font-mono font-semibold text-[#1B4FD8] text-lg">{summary.occupied}</span> <span className="text-[#64748B]">Occupied</span></div>
        <div><span className="font-mono font-semibold text-[#16A34A] text-lg">{summary.available}</span> <span className="text-[#64748B]">Available</span></div>
        <div><span className="font-mono font-semibold text-[#D97706] text-lg">{summary.maintenance}</span> <span className="text-[#64748B]">Maintenance</span></div>
        <div className="ml-auto flex items-center gap-3 text-[11.5px]">
          <span className="bed-legend-item"><span className="bed-legend-swatch bed-legend-swatch-available" /> Available</span>
          <span className="bed-legend-item"><span className="bed-legend-swatch bed-legend-swatch-male" /> Male</span>
          <span className="bed-legend-item"><span className="bed-legend-swatch bed-legend-swatch-female" /> Female</span>
          <span className="bed-legend-item"><span className="bed-legend-swatch bed-legend-swatch-maintenance" /> Maintenance</span>
          <span className="bed-legend-item"><span className="bed-legend-swatch bed-legend-swatch-icu" /> ICU</span>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-[12.5px] text-[#64748B]">Loading bed board...</p>
        ) : wardNames.length === 0 ? (
          <div className="bg-white border border-[#DDE2EC] rounded p-6 text-center">
            <p className="text-[13px] font-semibold text-gray-800">No beds set up yet</p>
            <p className="text-[12px] text-[#64748B] mt-1">Add wards and beds from Bed Management to populate this board.</p>
            <Btn variant="primary" size="sm" className="mt-3" onClick={goToBedManagement}>Go to Bed Management</Btn>
          </div>
        ) : (
          <>
            {/* ICU admission notifications -- persists per-browser via
                localStorage until acknowledged, so a fresh allocation always
                surfaces here even after the page is reloaded. */}
            {icuAdmissionAlerts.length > 0 && (
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded mb-5 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#FCA5A5] flex items-center gap-2">
                  <FiBell className="text-[#B91C1C] animate-pulse" aria-hidden />
                  <span className="text-xs font-bold text-[#991B1B] uppercase tracking-wider">
                    ICU Admission Alert{icuAdmissionAlerts.length > 1 ? "s" : ""} ({icuAdmissionAlerts.length})
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {icuAdmissionAlerts.map((bed) => (
                    <div
                      key={icuAdmissionKey(bed)}
                      className="flex items-center gap-3 p-2.5 bg-white border border-[#FCA5A5] rounded"
                    >
                      <div className="flex-1">
                        <div className="text-[12.5px] font-semibold text-gray-900">
                          {bedOccupantName(bed)} allocated to {bed.ward} &middot; Room {bed.room_no} &middot; Bed {bed.bed_no}
                        </div>
                        <div className="text-[11.5px] text-[#64748B]">
                          {bed.patient_age ? `${bed.patient_age}y · ` : ""}
                          {bed.patient_gender || "Gender N/A"} &middot; Allocated {formatDateTimeIST(bed.allocated_at || bed.admission_date!)}
                        </div>
                      </div>
                      <Btn variant="outline" size="xs" onClick={() => acknowledgeIcuAdmission(bed)}>
                        Acknowledge
                      </Btn>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ward occupancy heatmap -- click a ward to jump to its beds below */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-5">
              {wardNames.map((ward) => {
                const wardBeds = Array.from(groupedByWard.get(ward)!.values()).flat();
                const occupied = wardBeds.filter((b) => b.status === "Occupied").length;
                const total = wardBeds.length;
                const pct = total ? Math.round((occupied / total) * 100) : 0;
                const level = wardOccupancyLevel(occupied, total);
                const levelStyle =
                  level === "critical"
                    ? { bg: "#FEF2F2", border: "#FCA5A5", text: "#B91C1C", bar: "#DC2626" }
                    : level === "high"
                      ? { bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", bar: "#D97706" }
                      : { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", bar: "#16A34A" };
                return (
                  <button
                    key={ward}
                    onClick={() => openWard(ward)}
                    className="text-left rounded p-3 border transition-transform hover:-translate-y-0.5"
                    style={{ backgroundColor: levelStyle.bg, borderColor: levelStyle.border }}
                  >
                    <div className="text-[12px] font-semibold text-gray-800 truncate">{ward}</div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-mono font-bold" style={{ color: levelStyle.text }}>{pct}%</span>
                      <span className="text-[10.5px] text-[#64748B]">full</span>
                    </div>
                    <div className="text-[10.5px] text-[#64748B] mt-0.5">{occupied}/{total} beds</div>
                    <div className="h-1 rounded-full bg-white/60 mt-2 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: levelStyle.bar }} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Alerts */}
            <div className="bg-white border border-[#DDE2EC] rounded mb-5">
              <div className="px-4 py-2.5 border-b border-[#DDE2EC]">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Alerts</span>
              </div>
              {!hasAlerts ? (
                <p className="text-[12px] text-[#94A3B8] px-4 py-3">No active alerts &mdash; all clear.</p>
              ) : (
                <div className="p-3 space-y-2">
                  {overdueBeds.map((bed) => (
                    <div key={`overdue-${bed.id}`} className="flex items-center gap-3 p-2.5 border border-[#FCA5A5] bg-[#FEF2F2] rounded">
                      <FiClock className="text-[#B91C1C] flex-shrink-0" aria-hidden />
                      <div className="flex-1">
                        <div className="text-[12.5px] font-semibold text-gray-800">
                          {bedOccupantName(bed)} &mdash; extended stay
                        </div>
                        <div className="text-[11.5px] text-[#64748B]">
                          {bed.ward} &middot; Room {bed.room_no} &middot; Bed {bed.bed_no} &middot;{" "}
                          {overdueDays(bed)}d past expected discharge
                        </div>
                      </div>
                    </div>
                  ))}
                  {mixedGenderRooms.map(({ ward, room_no, beds: roomBeds }) => (
                    <div key={`mixed-${ward}-${room_no}`} className="flex items-center gap-3 p-2.5 border border-[#FDE68A] bg-[#FFFBEB] rounded">
                      <FiUsers className="text-[#B45309] flex-shrink-0" aria-hidden />
                      <div className="flex-1">
                        <div className="text-[12.5px] font-semibold text-gray-800">Mixed-gender room</div>
                        <div className="text-[11.5px] text-[#64748B]">
                          {ward} &middot; Room {room_no} &middot; {roomBeds.map((b) => bedOccupantName(b)).join(", ")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ward board -- pick a ward, then click a room to open it */}
            <div className="bg-white border border-[#DDE2EC] rounded p-4" id="ward-room-board">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <select
                  className="ui-input bed-ward-select"
                  aria-label="Select ward"
                  value={activeWard || ""}
                  onChange={(e) => setSelectedWard(e.target.value)}
                >
                  {wardNames.map((ward) => (
                    <option key={ward} value={ward}>{ward}</option>
                  ))}
                </select>
                {activeWard && (
                  <span className="text-[11.5px] text-[#64748B]">
                    {Array.from(activeRooms.values()).flat().filter((b) => b.status === "Occupied").length} occupied &middot;{" "}
                    {Array.from(activeRooms.values()).flat().filter((b) => b.status === "Available").length} available
                  </span>
                )}
              </div>
              {activeWard === "ICU" ? (
                <ICU embedded navigate={navigate} onOpenPatientClinical={onOpenPatientClinical} permissions={permissions} />
              ) : (
                <WardBedBoard
                  rooms={activeRooms}
                  readOnly
                  onPatientClick={
                    onOpenPatientClinical
                      ? (bed) => bed.patient_id && onOpenPatientClinical(bed.patient_id)
                      : undefined
                  }
                />
              )}
            </div>
          </>
        )}

        {/* Pending Bed Assignments -- real ER bed requests awaiting allocation */}
        <div className="mt-4 bg-white border border-[#DDE2EC] rounded">
          <div className="px-4 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Pending Bed Assignments</span>
            <span className="bg-[#FEF3C7] text-[#B45309] text-[11px] font-semibold px-2 py-0.5 rounded">
              {pendingRequests.length} awaiting
            </span>
          </div>
          <div className="p-3 space-y-2">
            {pendingRequests.length === 0 ? (
              <p className="text-[12px] text-[#94A3B8] px-1 py-2">No ER visits are currently awaiting a bed.</p>
            ) : (
              pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-3 p-2.5 border border-[#DDE2EC] rounded hover:border-[#1B4FD8] transition-colors">
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold text-gray-800">{erRequestPatientLabel(req)}</div>
                    <div className="text-[11.5px] text-[#64748B]">
                      {req.visit_no} &middot; {req.requested_level_of_care.toUpperCase()}
                      {req.requested_specialty ? ` · ${req.requested_specialty}` : ""}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#94A3B8]">{formatDateTimeIST(req.requested_at)}</span>
                  <Btn variant="primary" size="xs" onClick={goToBedManagement}>Assign Bed</Btn>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
