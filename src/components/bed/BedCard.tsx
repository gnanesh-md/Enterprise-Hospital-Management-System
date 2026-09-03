import { FaBed } from "react-icons/fa";
import { FiTool } from "react-icons/fi";
import { formatDateTimeIST } from "../../lib/format";

export type BedCardData = {
  id: number | string;
  room_no: string;
  bed_no: string;
  bed_type: string;
  status: "Available" | "Occupied" | "Maintenance";
  admission_date?: string | null;
  patient_id?: string | null;
  patient_name?: string | null;
  patient_last_name?: string | null;
  patient_phone?: string | null;
  patient_age?: number | null;
  patient_gender?: string | null;
};

export function bedOccupantName(bed: BedCardData): string {
  return `${bed.patient_name || ""} ${bed.patient_last_name || ""}`.trim() || "-";
}

// Drives the card's fill color for an occupied bed -- "other" covers both an
// actual non-binary gender on file and a bed whose gender wasn't recorded,
// so a card is never left uncolored.
export function bedGenderVariant(bed: BedCardData): "male" | "female" | "other" {
  const g = (bed.patient_gender || "").trim().toLowerCase();
  if (g.startsWith("m")) return "male";
  if (g.startsWith("f")) return "female";
  return "other";
}

function daysSinceAdmission(iso: string): number {
  return Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) + 1);
}

// The one bed tile used by both the Inpatient Bed Board (read-only overview)
// and Bed Management (the allocate/transfer/discharge workflow) so the two
// screens read identically -- patient name/age/gender sit right on the card
// (not hidden behind a hover), and a hover tooltip adds the secondary detail
// (phone, admission timestamp) that doesn't fit on the card. No cost/rate is
// shown here by design -- this board is about occupancy, not billing.
export function BedCard({
  bed,
  onClick,
  onPatientClick,
  readOnly,
}: {
  bed: BedCardData;
  onClick?: () => void;
  // Opens the patient's real clinical chart -- kept separate from `onClick`
  // (which opens the bed-allocation modal) so the two actions don't collide;
  // the patient name renders as its own clickable link when this is set.
  onPatientClick?: (bed: BedCardData) => void;
  // Inpatient Bed Board renders these read-only (it's a monitoring view, not
  // a workflow) -- a plain div instead of a button so it doesn't look
  // clickable when there's nothing behind the click.
  readOnly?: boolean;
}) {
  const variant =
    bed.status === "Occupied"
      ? `occupied-${bedGenderVariant(bed)}`
      : bed.status === "Maintenance"
        ? "maintenance"
        : "available";
  return (
    <div className={`bed-info-card bed-info-card-${variant}${bed.bed_type === "ICU" ? " bed-info-card-icu" : ""}`}>
      <div
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        className={`bed-info-card-main${readOnly ? " bed-info-card-main-static" : ""}`}
        onClick={readOnly ? undefined : onClick}
        onKeyDown={
          readOnly
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") onClick?.();
              }
        }
      >
        <div className="bed-info-card-top">
          <span className="bed-info-card-label">
            <FaBed className="bed-info-card-icon" aria-hidden />
            Room {bed.room_no} &middot; Bed {bed.bed_no}
          </span>
          <span className="bed-info-card-type">{bed.bed_type}</span>
        </div>

        {bed.status === "Occupied" ? (
          <div className="bed-info-card-occupant">
            {onPatientClick && bed.patient_id ? (
              <span
                className="bed-info-card-name bed-info-card-name-link"
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onPatientClick(bed);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onPatientClick(bed);
                  }
                }}
              >
                {bedOccupantName(bed)}
              </span>
            ) : (
              <span className="bed-info-card-name">{bedOccupantName(bed)}</span>
            )}
            <span className="bed-info-card-meta">
              {bed.patient_age ? `${bed.patient_age}y · ` : ""}
              {bed.patient_gender || "Gender N/A"}
              {bed.patient_id ? ` · ${bed.patient_id}` : ""}
            </span>
            {bed.admission_date && (
              <span className="bed-info-card-meta">Day {daysSinceAdmission(bed.admission_date)}</span>
            )}
          </div>
        ) : bed.status === "Maintenance" ? (
          <div className="bed-info-card-status">
            <FiTool aria-hidden /> Under maintenance
          </div>
        ) : (
          <div className="bed-info-card-status">Available</div>
        )}
      </div>

      {bed.status === "Occupied" && (bed.patient_phone || bed.admission_date) && (
        <div className="bed-info-card-tooltip" role="tooltip">
          <strong>{bedOccupantName(bed)}</strong>
          {bed.patient_phone && <span>{bed.patient_phone}</span>}
          {bed.admission_date && <span>Admitted {formatDateTimeIST(bed.admission_date)}</span>}
        </div>
      )}
    </div>
  );
}
