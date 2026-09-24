import { DBOPEncounter } from "./db"

/**
 * Messages addressed to the patient's own phone, plus the matching alert for
 * the OP department floor.
 *
 * ## This does not send anything
 *
 * There is no SMS gateway wired into this app. Every message is written to an
 * **outbox** with status `queued`, which is exactly what it is: a record of what
 * should go out, waiting for a provider to be connected. Nothing here may claim
 * a message was delivered, because nothing here can know that -- telling a
 * receptionist "the patient has been notified" when no SMS left the building is
 * how a patient ends up sitting in a waiting room nobody called.
 *
 * When a gateway is added, `dispatchQueued()` is the seam: hand it a sender and
 * it walks the outbox, marking each entry `sent` or `failed` with the reason.
 */

export type NotificationChannel = "sms" | "op-floor"
export type NotificationStatus = "queued" | "sent" | "failed"

export interface PatientNotification {
  id: string
  encounterId: string
  umr: string
  patientName: string
  /** The patient's number for `sms`; empty for an on-screen floor alert. */
  phone: string
  channel: NotificationChannel
  /** What the patient (or the floor) is being told. */
  message: string
  status: NotificationStatus
  /** Why a dispatch failed, once a gateway exists to fail. */
  error?: string
  createdAt: string
  /** Read state for the OP floor alerts. */
  read?: boolean
}

const OUTBOX_KEY = "hospai_patient_notifications_v1"
const CHANNEL = "hospai_patient_notifications"

const listeners = new Set<() => void>()
let channel: BroadcastChannel | null = null
let crossTabReady = false

function ensureCrossTab() {
  if (crossTabReady || typeof window === "undefined") return
  crossTabReady = true
  try {
    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = () => listeners.forEach((fn) => fn())
  } catch {
    /* falls back to the storage event below */
  }
  window.addEventListener("storage", (e) => {
    if (e.key === OUTBOX_KEY) listeners.forEach((fn) => fn())
  })
}

function read(): PatientNotification[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY)
    return raw ? JSON.parse(raw) as PatientNotification[] : []
  } catch {
    return []
  }
}

function write(all: PatientNotification[]) {
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(all))
  } catch {
    // A full quota must not break the clinical action that triggered the
    // message -- the patient still gets called, the record just is not kept.
    return
  }
  listeners.forEach((fn) => fn())
  ensureCrossTab()
  try {
    channel?.postMessage(Date.now())
  } catch {
    /* closed channel */
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  ensureCrossTab()
  return () => listeners.delete(listener)
}

export function getOutbox(): PatientNotification[] {
  return read()
}

/** Undelivered floor alerts, newest first. */
export function getFloorAlerts(): PatientNotification[] {
  return read()
    .filter((n) => n.channel === "op-floor" && !n.read)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function markFloorAlertsRead(ids: string[]) {
  if (!ids.length) return
  const set = new Set(ids)
  write(read().map((n) => (set.has(n.id) ? { ...n, read: true } : n)))
}

function push(entry: Omit<PatientNotification, "id" | "createdAt" | "status">) {
  const all = read()
  all.unshift({
    ...entry,
    id: `MSG-${Date.now()}-${Math.random().toString(36).slice(-4)}`,
    status: "queued",
    createdAt: new Date().toISOString(),
  })
  // Keep the outbox from growing without bound on a long-running desk.
  write(all.slice(0, 300))
}

/**
 * The doctor has called this patient into the room.
 *
 * Raises two things at once: a message for the patient's phone, and an alert for
 * the OP floor so the sister knows to walk them through.
 */
export function notifyPatientCalled(
  encounter: DBOPEncounter,
  doctorName: string,
) {
  const room = encounter.room || "the consulting room"
  const token = encounter.queueToken ? ` (token ${encounter.queueToken})` : ""

  push({
    encounterId: encounter.id,
    umr: encounter.umr,
    patientName: encounter.patientName,
    phone: encounter.phone || "",
    channel: "sms",
    message:
      `${encounter.patientName}${token}: ${doctorName} is ready for you now. ` +
      `Please proceed to ${room}. — Imperial Hospitals`,
  })

  push({
    encounterId: encounter.id,
    umr: encounter.umr,
    patientName: encounter.patientName,
    phone: "",
    channel: "op-floor",
    message: `${doctorName} has called ${encounter.patientName} into ${room}${token}.`,
    read: false,
  })
}

/**
 * The OP desk has called this patient through to the nurse station.
 *
 * Only the patient is messaged here -- the nurse already sees them on her
 * waiting list, so a floor alert would be telling her something she is looking at.
 */
export function notifyPatientCalledToNurse(encounter: DBOPEncounter) {
  const token = encounter.queueToken ? ` (token ${encounter.queueToken})` : ""
  push({
    encounterId: encounter.id,
    umr: encounter.umr,
    patientName: encounter.patientName,
    phone: encounter.phone || "",
    channel: "sms",
    message:
      `${encounter.patientName}${token}: please come to the OP nurse station now for your ` +
      `blood pressure and weight before seeing the doctor. — Imperial Hospitals`,
  })
}

/**
 * Hand the queued messages to a real sender once one exists.
 *
 * Deliberately not called anywhere yet: with no gateway configured there is
 * nothing to hand them to, and marking them `sent` without a send would make the
 * outbox lie.
 */
export async function dispatchQueued(
  send: (n: PatientNotification) => Promise<void>,
): Promise<{ sent: number ;failed: number }> {
  const all = read()
  let sent = 0
  let failed = 0

  for (const n of all) {
    if (n.status !== "queued" || n.channel !== "sms") continue
    if (!n.phone.trim()) {
      n.status = "failed"
      n.error = "No phone number on the patient record"
      failed++
      continue
    }
    try {
      await send(n)
      n.status = "sent"
      sent++
    } catch (e) {
      n.status = "failed"
      n.error = e instanceof Error ? e.message : "Send failed"
      failed++
    }
  }

  write(all)
  return { sent, failed }
}
