import { ACTIVE_DOCTORS, ACTIVE_SPECIALTIES } from "./doctorMaster"
/**
 * Doctor Portal store.
 *
 * Backs the per-doctor portal: the inbox of patients appointed to *this* doctor,
 * and the consultation artefacts the doctor produces for one visit (recorded
 * consultation video, the whiteboard prescription sheet, an uploaded/scanned
 * prescription, and the AI split of that sheet into medicines vs. investigations).
 *
 * Notifications are *derived*, not stored: the OP encounter in `db` is the source
 * of truth for "who has been appointed to whom", so the inbox is recomputed from
 * it on every read and only the read/seen state is persisted here. That way a
 * queue change made anywhere else in the app (reception, queue management, the
 * OP workflow) shows up in the doctor's inbox without a second write path that
 * could drift out of sync.
 */

import { db, DBOPEncounter, DBPatient } from "./db"
import type {
  ConsultationNoteSummary,
  TranscriptTurn,
} from "../lib/medicalVoiceAI"

// ── Doctor roster ────────────────────────────────────────────────────────────
// Mirrors the names OP registration's AI triage assigns encounters to, since the
// inbox is matched on `encounter.assignedDoctor`.

export interface DoctorAccount {
  id: string
  username: string
  name: string
  specialty: string
  room: string
  staffId: string
  qualification: string
}

/**
 * Every doctor who can sign in and hold a workspace.
 *
 * Derived from the Imperial Hospitals doctor master rather than listed here, so
 * the roster, the login credentials, symptom triage and appointment booking
 * cannot drift apart -- they were previously nine hardcoded names repeated
 * across ten files. Only doctors whose name and specialty are legible on the OP
 * card appear; see `doctorMaster.ts` for why the rest are held back.
 */
export const DOCTOR_ROSTER: DoctorAccount[] = ACTIVE_DOCTORS.map((d) => ({
  id: d.id,
  username: d.username as string,
  name: d.name,
  specialty: d.specialty as string,
  room: d.room,
  staffId: d.staffId,
  qualification: d.qualification,
}))

export function getDoctorById(doctorId?: string | null): DoctorAccount {
  return DOCTOR_ROSTER.find((d) => d.id === doctorId) || DOCTOR_ROSTER[0]
}

export function getDoctorByName(
  name?: string | null,
): DoctorAccount | undefined {
  if (!name) return undefined
  const normalized = name.trim().toLowerCase()
  return DOCTOR_ROSTER.find((d) => d.name.toLowerCase() === normalized)
}

/** Resolves the doctor a session belongs to, from whatever the login handed back. */
export function resolveDoctorAccount(hint?: {
  doctorId?: string | null
  username?: string | null
  name?: string | null
}): DoctorAccount {
  if (!hint) return DOCTOR_ROSTER[0]
  return (
    DOCTOR_ROSTER.find((d) => d.id === hint.doctorId) ||
    DOCTOR_ROSTER.find(
      (d) => d.username === (hint.username || "").toLowerCase(),
    ) ||
    getDoctorByName(hint.name) ||
    DOCTOR_ROSTER[0]
  )
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface DoctorNotification {
  id: string
  doctorId: string
  encounterId: string
  umr: string
  patientName: string
  age: number
  sex: string
  phone: string
  opNumber: string
  dept: string
  room: string
  token: string
  queuePosition: number
  isNewPatient: boolean
  chiefComplaint: string
  symptoms: string[]
  aiConfidence: number
  aiReasoning?: string
  vitals: DBOPEncounter["vitals"]
  status: DBOPEncounter["status"]
  arrivedAt: string
  /** Who took the baseline vitals at the OP nurse station, and when. */
  vitalsBy?: string
  vitalsAt?: string
  read: boolean
}

export interface ParsedMedication {
  name: string
  strength: string
  dosage: string
  frequency: string
  route: string
  duration: string
  instructions: string
  quantity: number
}

export interface ParsedLabTest {
  name: string
  category: string
  urgency: "Routine" | "STAT" | string
}

export interface ConsultationAttachment {
  name: string
  type: string
  size: number
  /** Session-scoped blob URL. Absent after a reload -- see the note on video below. */
  objectUrl?: string
  /** Persisted preview (images only, downscaled). Videos are never inlined. */
  dataUrl?: string
  recordedAt: string
}

export type DispatchState = "Draft" | "Dispatched"

export interface ConsultationRecord {
  id: string
  encounterId: string
  umr: string
  patientName: string
  opNumber: string
  doctorId: string
  doctorName: string
  department: string
  createdAt: string
  updatedAt: string

  /** Recorded/uploaded consultation video (metadata persisted, bytes are not). */
  video?: ConsultationAttachment
  /** The whiteboard sheet the doctor wrote the prescription on, as a PNG data URL. */
  whiteboardImage?: string
  /** A photographed/scanned prescription the doctor uploaded instead of writing one. */
  uploadedPrescription?: ConsultationAttachment

  /**
   * The spoken consultation: separated doctor/patient turns and the clinical
   * note summarised from them.
   *
   * This is the history-and-advice record, never a source of orders -- a doctor
   * does not dictate a prescription at the patient, so nothing in here reaches
   * the pharmacy or the lab. The audio itself is not persisted (same quota
   * reasoning as `video`); the transcript is the clinical artefact worth keeping.
   */
  voice?: {
    turns: TranscriptTurn[]
    summary: ConsultationNoteSummary
    durationSeconds: number
    recordedAt: string
  }

  /** The single prescription sheet, as text, before it was split. */
  rawText: string
  /** Which engine produced the split: the LLM, keyword fallback, or the doctor by hand. */
  aiEngine: string
  diagnosis: string
  advice: string
  summary: string
  medications: ParsedMedication[]
  labTests: ParsedLabTest[]
  /** Lines the split could not confidently place -- the doctor files these by hand. */
  unclassified: string[]

  dispatch: DispatchState
  dispatchedAt?: string
  prescriptionId?: string
  labOrderId?: string
}

// ── Storage ──────────────────────────────────────────────────────────────────

const READ_NOTIFICATIONS_KEY = "hospai_doctor_portal_read_v1"
const CONSULTATIONS_KEY = "hospai_doctor_consultations_v1"
const ACKNOWLEDGED_ALERTS_KEY = "hospai_doctor_acked_alerts_v1"
const CHANNEL_NAME = "hospai_doctor_portal"

const listeners = new Set<() => void>()
let channel: BroadcastChannel | null = null

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined")
    return null
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = () => listeners.forEach((fn) => fn())
  }
  return channel
}

function notify(broadcast = true) {
  listeners.forEach((fn) => fn())
  if (broadcast) ensureChannel()?.postMessage("changed")
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    // Quota is the realistic failure here (whiteboard PNGs and Rx photos are the
    // bulk of it). Report it rather than silently dropping clinical content.
    console.error("Doctor portal: could not persist", key, err)
    return false
  }
}

// ── Notifications (derived from the OP encounter queue) ──────────────────────

/** Statuses that mean the patient is still the doctor's to see. */
const OPEN_STATUSES: DBOPEncounter["status"][] = [
  "Registered",
  "Symptoms Captured",
  "AI Recommended",
  "Awaiting Doctor",
  "Doctor Assigned",
  "In Queue",
  "Under Consultation",
  "Vitals Recorded",
  "Awaiting Consultation",
]

/**
 * Whether this visit gets an admit card (new patient) or a prior-history panel.
 *
 * Two sources have to agree: the visit index (is there an earlier encounter for
 * this UMR?) and how reception registered them (`encounter.isNew`). Reception's
 * flag is authoritative for "not new" -- a patient whose earlier visits predate
 * this store, or were seen at another site, is still a revisit even though the
 * local index has nothing before today.
 */
export function isFirstVisit(
  encounter: DBOPEncounter,
  allEncounters?: DBOPEncounter[],
): boolean {
  if (encounter.isNew === false) return false
  const history = (allEncounters || db.getEncounters()).filter(
    (e) => e.umr.toUpperCase() === encounter.umr.toUpperCase(),
  )
  if (history.length <= 1) return true
  const earliest = history.reduce((a, b) =>
    new Date(a.timestamps?.arrival || a.registrationTime) <=
    new Date(b.timestamps?.arrival || b.registrationTime)
      ? a
      : b,
  )
  return earliest.id === encounter.id
}

export class DoctorPortalDatabase {
  static subscribe(listener: () => void): () => void {
    listeners.add(listener)
    ensureChannel()
    const unsubDb = db.subscribe(() => listener())
    return () => {
      listeners.delete(listener)
      unsubDb()
    }
  }

  // ── Inbox ──────────────────────────────────────────────────────────────────

  private static getReadIds(): string[] {
    return readJson<string[]>(READ_NOTIFICATIONS_KEY, [])
  }

  /**
   * Every patient currently appointed to this doctor, newest arrival first.
   * Pass `includeClosed` to also list visits this doctor has already finished.
   */
  static getNotifications(
    doctorId: string,
    includeClosed = false,
  ): DoctorNotification[] {
    const doctor = getDoctorById(doctorId)
    const encounters = db.getEncounters()
    const readIds = new Set(this.getReadIds())

    return encounters
      .filter((e) => e.assignedDoctor === doctor.name)
      .filter((e) => includeClosed || OPEN_STATUSES.includes(e.status))
      .map<DoctorNotification>((e) => ({
        id: `NOTIF-${e.id}`,
        doctorId: doctor.id,
        encounterId: e.id,
        umr: e.umr,
        patientName: e.patientName,
        age: e.age,
        sex: e.sex,
        phone: e.phone,
        opNumber: e.opNumber,
        dept: e.dept,
        room: e.room || doctor.room,
        token: e.queueToken,
        queuePosition: e.queuePosition,
        isNewPatient: isFirstVisit(e, encounters),
        chiefComplaint: e.chiefComplaint,
        symptoms: e.symptoms || [],
        aiConfidence: e.aiConfidence,
        aiReasoning: e.aiReasoning,
        vitals: e.vitals,
        status: e.status,
        arrivedAt: e.timestamps?.arrival || e.registrationTime,
        vitalsBy: e.timestamps?.vitalsBy,
        vitalsAt: e.timestamps?.vitalsRecorded,
        read: readIds.has(`NOTIF-${e.id}`),
      }))
      .sort(
        (a, b) =>
          new Date(b.arrivedAt).getTime() - new Date(a.arrivedAt).getTime(),
      )
  }

  /**
   * Patients waiting in this doctor's own department who have **no doctor
   * assigned yet**, newest arrival first.
   *
   * Registration deliberately does not pick a doctor -- `createNewPatientEncounter`
   * and `createRevisitEncounter` both write `assignedDoctor: ""` and leave the
   * choice to triage. The inbox matches on `assignedDoctor === doctor.name`, so
   * until someone assigns them these patients are visible on the hospital-wide
   * board and in nobody's portal. This is the queue they sit in, and
   * `claimEncounter` is how a doctor takes one.
   */
  static getUnassigned(doctorId: string): DoctorNotification[] {
    const doctor = getDoctorById(doctorId)
    const encounters = db.getEncounters()
    const readIds = new Set(this.getReadIds())

    return (
      encounters
        .filter((e) => !e.assignedDoctor?.trim())
        .filter((e) => OPEN_STATUSES.includes(e.status))
        // Same specialty, not yet triaged into one -- or in a department that has
        // no bookable consultant at all, which would otherwise leave the patient
        // visible to nobody. Cardiology and Orthopedics are in that position on
        // the current Imperial master: every doctor printed under them has a name
        // the OP card did not render legibly, so those visits need whoever is free.
        .filter((e) => {
          const dept = (e.dept || "").trim()
          if (!dept || dept === "Awaiting Triage" || dept === doctor.specialty)
            return true
          return !ACTIVE_SPECIALTIES.includes(dept)
        })
        .map<DoctorNotification>((e) => ({
          id: `NOTIF-${e.id}`,
          doctorId: doctor.id,
          encounterId: e.id,
          umr: e.umr,
          patientName: e.patientName,
          age: e.age,
          sex: e.sex,
          phone: e.phone,
          opNumber: e.opNumber,
          dept: e.dept,
          room: e.room || doctor.room,
          token: e.queueToken,
          queuePosition: e.queuePosition,
          isNewPatient: isFirstVisit(e, encounters),
          chiefComplaint: e.chiefComplaint,
          symptoms: e.symptoms || [],
          aiConfidence: e.aiConfidence,
          aiReasoning: e.aiReasoning,
          vitals: e.vitals,
          status: e.status,
          arrivedAt: e.timestamps?.arrival || e.registrationTime,
          vitalsBy: e.timestamps?.vitalsBy,
          vitalsAt: e.timestamps?.vitalsRecorded,
          read: readIds.has(`NOTIF-${e.id}`),
        }))
        .sort(
          (a, b) =>
            new Date(b.arrivedAt).getTime() - new Date(a.arrivedAt).getTime(),
        )
    )
  }

  /**
   * Take an unassigned patient. Refuses one already assigned to someone else,
   * so two doctors claiming at once cannot silently steal the patient from
   * whoever got there first.
   */
  static claimEncounter(doctorId: string, encounterId: string): {
    ok: boolean
    message: string
  } {
    const doctor = getDoctorById(doctorId)
    const encounter = db.getEncounters().find((e) => e.id === encounterId)
    if (!encounter)
      return { ok: false, message: "That visit no longer exists." }

    const current = encounter.assignedDoctor?.trim()
    if (current && current !== doctor.name) {
      return {
        ok: false,
        message: `${encounter.patientName} was just taken by ${current}.`,
      }
    }

    db.updateEncounter(encounterId, {
      assignedDoctor: doctor.name,
      dept:
        encounter.dept && encounter.dept !== "Awaiting Triage"
          ? encounter.dept
          : doctor.specialty,
      room: encounter.room || doctor.room,
      status:
        encounter.status === "Under Consultation"
          ? encounter.status
          : "In Queue",
    })
    notify()
    return {
      ok: true,
      message: `${encounter.patientName} added to your queue.`,
    }
  }

  static getUnreadCount(doctorId: string): number {
    return this.getNotifications(doctorId).filter((n) => !n.read).length
  }

  static markRead(notificationIds: string[]): void {
    if (!notificationIds.length) return
    const merged = Array.from(
      new Set([...this.getReadIds(), ...notificationIds]),
    )
    writeJson(READ_NOTIFICATIONS_KEY, merged)
    notify()
  }

  static markAllRead(doctorId: string): void {
    this.markRead(this.getNotifications(doctorId).map((n) => n.id))
  }

  // ── Patient context ────────────────────────────────────────────────────────

  /**
   * What the doctor needs before opening their mouth: the patient record, every
   * prior visit with its diagnosis/medication/investigations, and whether this is
   * a first visit (admit card) or a revisit (history panel).
   */
  static getPatientContext(umr: string, currentEncounterId?: string): {
    patient?: DBPatient
    currentVisit?: DBOPEncounter
    previousVisits: DBOPEncounter[]
    consultations: ConsultationRecord[]
    isNewPatient: boolean
  } {
    const patient = db.getPatientByUmr(umr)
    const visits = db
      .getEncountersForPatient(umr)
      .sort(
        (a, b) =>
          new Date(b.timestamps?.arrival || b.registrationTime).getTime() -
          new Date(a.timestamps?.arrival || a.registrationTime).getTime(),
      )
    const currentVisit = currentEncounterId
      ? visits.find((v) => v.id === currentEncounterId)
      : visits[0]
    const previousVisits = visits.filter((v) => v.id !== currentVisit?.id)

    return {
      patient,
      currentVisit,
      previousVisits,
      consultations: this.getConsultationsForPatient(umr).filter(
        (c) => c.encounterId !== currentVisit?.id,
      ),
      isNewPatient: currentVisit
        ? isFirstVisit(currentVisit, visits)
        : previousVisits.length === 0,
    }
  }

  // ── Consultations ──────────────────────────────────────────────────────────

  static getConsultations(): ConsultationRecord[] {
    return readJson<ConsultationRecord[]>(CONSULTATIONS_KEY, [])
  }

  static getConsultationsForPatient(umr: string): ConsultationRecord[] {
    const normalized = umr.toUpperCase()
    return this.getConsultations()
      .filter((c) => c.umr.toUpperCase() === normalized)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }

  static getConsultationForEncounter(
    encounterId: string,
  ): ConsultationRecord | undefined {
    return this.getConsultations().find((c) => c.encounterId === encounterId)
  }

  /** Creates the record for an encounter if it doesn't exist yet, then returns it. */
  static openConsultation(
    encounter: DBOPEncounter,
    doctor: DoctorAccount,
  ): ConsultationRecord {
    const existing = this.getConsultationForEncounter(encounter.id)
    if (existing) return existing

    const now = new Date().toISOString()
    const record: ConsultationRecord = {
      id: `CONS-${Date.now().toString(36).toUpperCase()}`,
      encounterId: encounter.id,
      umr: encounter.umr,
      patientName: encounter.patientName,
      opNumber: encounter.opNumber,
      doctorId: doctor.id,
      doctorName: doctor.name,
      department: encounter.dept || doctor.specialty,
      createdAt: now,
      updatedAt: now,
      rawText: "",
      aiEngine: "",
      diagnosis: encounter.diagnosis || "",
      advice: encounter.advice || "",
      summary: "",
      medications: [],
      labTests: [],
      unclassified: [],
      dispatch: "Draft",
    }
    writeJson(CONSULTATIONS_KEY, [record, ...this.getConsultations()])
    notify()
    return record
  }

  static saveConsultation(record: ConsultationRecord): ConsultationRecord {
    const updated = { ...record, updatedAt: new Date().toISOString() }
    const all = this.getConsultations()
    const index = all.findIndex((c) => c.id === record.id)
    if (index >= 0) all[index] = updated
    else all.unshift(updated)
    writeJson(CONSULTATIONS_KEY, all)
    notify()
    return updated
  }

  static updateConsultation(
    id: string,
    updates: Partial<ConsultationRecord>,
  ): ConsultationRecord | undefined {
    const record = this.getConsultations().find((c) => c.id === id)
    if (!record) return undefined
    return this.saveConsultation({ ...record, ...updates })
  }

  // ── Live alert acknowledgement ─────────────────────────────────────────────
  // Alerts on the live board are derived from other stores on every read, so
  // "I have seen this" cannot live on the alert itself. It is kept here as a
  // set of alert ids the doctor has cleared, keyed by a stable id built from
  // the underlying record (see buildAlertId in doctorLiveFeed.ts) so the same
  // alert stays cleared across reloads and does not resurface.

  static getAcknowledgedAlerts(): Record<string, string> {
    return readJson<Record<string, string>>(ACKNOWLEDGED_ALERTS_KEY, {})
  }

  static acknowledgeAlert(alertId: string): void {
    writeJson(ACKNOWLEDGED_ALERTS_KEY, {
      ...this.getAcknowledgedAlerts(),
      [alertId]: new Date().toISOString(),
    })
    notify()
  }

  static acknowledgeAlerts(alertIds: string[]): void {
    if (!alertIds.length) return
    const now = new Date().toISOString()
    const merged = { ...this.getAcknowledgedAlerts() }
    for (const id of alertIds) merged[id] = now
    writeJson(ACKNOWLEDGED_ALERTS_KEY, merged)
    notify()
  }
}

// ── Attachment helpers ───────────────────────────────────────────────────────

/**
 * Downscales an image to something a browser's localStorage can actually hold.
 * A 12MP phone photo of a prescription is ~4MB of base64 -- past the whole quota
 * on its own -- while 1400px wide at JPEG q0.72 is legible and ~200KB.
 */
/**
 * Reads a prescription the doctor picked off disk into something the portal can
 * both show and send for OCR.
 *
 * Images are downscaled -- a modern phone photo is several megabytes and the
 * whole consultation record lives in localStorage. A PDF cannot go through a
 * canvas at all, so it is read as-is and flagged, and the caller shows a file
 * card rather than an `<img>` that would silently render nothing. Anything that
 * fails to decode as an image is treated the same way rather than thrown away:
 * the server-side OCR may still read it, and a doctor who attached a sheet
 * should never be left looking at a screen that quietly dropped it.
 */
export async function readPrescriptionFile(
  file: File,
): Promise<{ dataUrl: string ;kind: "image" | "document" }> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name)
  if (!isPdf) {
    try {
      return { dataUrl: await compressImageFile(file), kind: "image" }
    } catch {
      // Fall through: keep the bytes, let the OCR service have a go at them.
    }
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () =>
      reject(new Error("Could not read the selected file."))
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
  return { dataUrl, kind: "document" }
}

export function compressImageFile(
  file: File,
  maxWidth = 1400,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () =>
      reject(new Error("Could not read the selected file."))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () =>
        reject(new Error("That file could not be read as an image."))
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas is unavailable in this browser."))
          return
        }
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = (reader.result as string)
    }
    reader.readAsDataURL(file)
  })
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  )
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`
}
