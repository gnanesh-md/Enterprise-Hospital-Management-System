/**
 * Client for the prescription splitter.
 *
 * A doctor writes medicines and investigations on one sheet; the pharmacy and
 * the laboratory each need only their half of it. `splitPrescription` sends the
 * sheet (typed text, a whiteboard PNG, or a photographed prescription) to
 * `POST /api/ai/prescription-parse`, which OCRs it if needed and returns the two
 * halves separately.
 *
 * If that call fails -- backend down, no session, vLLM unreachable -- the same
 * split is done in the browser by `localSplit` below and flagged as such, so a
 * consultation is never blocked on the AI stack being up. The doctor reviews and
 * edits the split before anything is dispatched either way.
 */

import { API_BASE } from "./constants"
import { withAuthHeaders } from "./api"
import type {
  ParsedLabTest,
  ParsedMedication,
} from "../services/doctorPortalDb"

export interface PrescriptionSplit {
  diagnosis: string
  advice: string
  summary: string
  medications: ParsedMedication[]
  labTests: ParsedLabTest[]
  unclassified: string[]
  /** "llm" | "heuristic" (server keyword match) | "browser" (offline fallback) */
  engine: string
  ocrText: string
  /** Set when the server could not be reached and the browser did the split. */
  degradedReason?: string
}

interface ServerSplit {
  diagnosis?: string
  advice?: string
  summary?: string
  medications?: Partial<ParsedMedication>[]
  lab_tests?: Partial<ParsedLabTest>[]
  unclassified?: string[]
  engine?: string
  ocr_text?: string
}

const REQUEST_TIMEOUT_MS = 90_000 // OCR + a 7B model on a scanned sheet is slow.

function normalizeServerSplit(
  payload: ServerSplit,
  fallbackText: string,
): PrescriptionSplit {
  return {
    diagnosis: payload.diagnosis || "",
    advice: payload.advice || "",
    summary: payload.summary || "",
    medications: (payload.medications || [])
      .map((m) => ({
        name: m.name || "",
        strength: m.strength || "",
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        route: m.route || "Oral",
        duration: m.duration || "",
        instructions: m.instructions || "",
        quantity: Number(m.quantity) > 0 ? Number(m.quantity) : 1,
      }))
      .filter((m) => m.name),
    labTests: (payload.lab_tests || [])
      .map((t) => ({
        name: t.name || "",
        category: t.category || "Pathology",
        urgency: t.urgency || "Routine",
      }))
      .filter((t) => t.name),
    unclassified: payload.unclassified || [],
    engine: payload.engine || "llm",
    ocrText: payload.ocr_text || fallbackText,
  }
}

async function postSplit(
  body: BodyInit,
  headers: Record<string, string>,
): Promise<ServerSplit> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`${API_BASE}/api/ai/prescription-parse`, {
      method: "POST",
      credentials: "include",
      headers: withAuthHeaders(headers, "POST"),
      body,
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}))
      throw new Error(
        detail?.error || `Prescription service returned ${response.status}`,
      )
    }
    return (await response.json()) as ServerSplit
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Whether the AI splitter can actually be used right now.
 *
 * A raw fetch on purpose: `apiFetch` answers `/api/auth/session` from its own
 * offline mock with `authenticated: true`, which is the right behaviour for a
 * UI that must work without a backend but useless for deciding whether a
 * *server-side* OCR call will succeed. A typed sheet degrades to the browser
 * splitter, but an uploaded photograph cannot -- there is no OCR in the browser
 * -- so the prescription step needs to say so before the doctor uploads, rather
 * than after.
 */
export async function checkPrescriptionAiStatus(): Promise<{
  online: boolean
  reason?: string
}> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/session`, {
      credentials: "include",
      headers: withAuthHeaders({}, "GET"),
      cache: "no-store",
    })
    if (response.status === 401) {
      return { online: false, reason: "not signed in to the clinical services" }
    }
    if (!response.ok)
      return { online: false, reason: `service returned ${response.status}` }
    const payload = await response.json().catch(() => ({}))
    return payload?.authenticated === false
      ? { online: false, reason: "not signed in to the clinical services" }
      : { online: true }
  } catch {
    return { online: false, reason: "the clinical services are unreachable" }
  }
}

/** Splits a prescription sheet supplied as plain text. */
export async function splitPrescriptionText(
  text: string,
): Promise<PrescriptionSplit> {
  try {
    const payload = await postSplit(JSON.stringify({ text }), {
      "Content-Type": "application/json",
    })
    return normalizeServerSplit(payload, text)
  } catch (err) {
    return { ...localSplit(text), degradedReason: describe(err) }
  }
}

async function trySmartOcr(
  file: Blob,
  filename: string,
): Promise<string | null> {
  try {
    const form = new FormData()
    form.append("file", file, filename)
    form.append("blueprint", "Universal OCR (Any Text)")
    const uploadRes = await fetch(`${API_BASE}/api/ocr-portal/upload`, {
      method: "POST",
      headers: withAuthHeaders({}, "POST"),
      body: form,
      credentials: "include",
    })
    if (!uploadRes.ok) return null
    const uploadData = await uploadRes.json()
    const jobId = uploadData.job_id
    if (!jobId) return null

    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1500))
      const statusRes = await fetch(
        `${API_BASE}/api/ocr-portal/jobs/${jobId}`,
        {
          headers: withAuthHeaders({}, "GET"),
          credentials: "include",
        },
      )
      if (!statusRes.ok) break
      const statusData = await statusRes.json()
      if (statusData.status === "COMPLETED") {
        const resultRes = await fetch(
          `${API_BASE}/api/ocr-portal/jobs/${jobId}/result`,
          {
            headers: withAuthHeaders({}, "GET"),
            credentials: "include",
          },
        )
        if (!resultRes.ok) break
        const resultData = await resultRes.json()
        return resultData.combined_markdown || null
      }
      if (statusData.status === "FAILED") break
    }
  } catch (e) {
    // Smart OCR offline
  }
  return null
}

/**
 * Splits a photographed, scanned or drawn sheet. OCR happens server-side.
 *
 * Three attempts, each weaker than the last, because an uploaded prescription is
 * the doctor's actual order and "nothing happened" is the one outcome that must
 * not occur silently:
 *
 *  1. The prescription endpoint, which OCRs and splits in one pass.
 *  2. The Smart OCR pipeline, whose text is then split in the browser.
 *  3. Neither reachable -- the sheet stays attached and the doctor is told, in
 *     so many words, that they must type the lines in themselves. It is never
 *     reported as an empty-but-successful split, which would read as "this
 *     prescription has no medicines on it".
 */
export async function splitPrescriptionFile(
  file: Blob,
  filename = "prescription.png",
): Promise<PrescriptionSplit> {
  const form = new FormData()
  form.append("file", file, filename)
  form.append("language", "en")

  let primaryError: unknown
  try {
    const payload = await postSplit(form, {})
    const split = normalizeServerSplit(payload, "")
    // A model that read the page but found nothing on it is still worth saying
    // out loud, so the doctor checks the photo rather than the empty table.
    if (
      !split.medications.length &&
      !split.labTests.length &&
      !split.ocrText.trim()
    ) {
      return {
        ...split,
        degradedReason:
          "Nothing could be read off that image. Check it is in focus and the whole sheet is in frame, or type the lines below.",
      }
    }
    return split
  } catch (err) {
    primaryError = err
  }

  const smartOcrText = await trySmartOcr(file, filename)
  if (smartOcrText && smartOcrText.trim()) {
    const split = localSplit(smartOcrText)
    return {
      ...split,
      engine: "smart_ocr",
      ocrText: smartOcrText,
      degradedReason:
        split.medications.length || split.labTests.length
          ? undefined
          : "The sheet was read but no medicine or investigation line could be recognised on it. Add them by hand below.",
    }
  }

  return {
    ...localSplit(""),
    engine: "unavailable",
    ocrText: "",
    degradedReason: `The prescription could not be digitised (${describe(primaryError)}). The sheet is attached to this visit -- type the medicines and investigations below so pharmacy and the lab receive them.`,
  }
}

function describe(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "The prescription service did not respond in time."
  }
  return err instanceof Error
    ? err.message
    : "The prescription service is unreachable."
}

// ── Browser-side fallback ────────────────────────────────────────────────────
// Mirrors the server's keyword split (hospital-backend/backend/ai/service.py).
// Same conservative rule: a line it cannot place goes to neither list.

const LAB_KEYWORDS = [
  "cbc",
  "complete blood count",
  "hemogram",
  "haemogram",
  "esr",
  "crp",
  "c-reactive",
  "lft",
  "liver function",
  "kft",
  "rft",
  "renal function",
  "urea",
  "creatinine",
  "electrolyte",
  "lipid",
  "cholesterol",
  "triglyceride",
  "troponin",
  "ck-mb",
  "bnp",
  "d-dimer",
  "inr",
  "aptt",
  "fbs",
  "ppbs",
  "rbs",
  "hba1c",
  "blood sugar",
  "blood glucose",
  "tsh",
  "t3",
  "t4",
  "thyroid",
  "ferritin",
  "serum",
  "urine",
  "stool",
  "culture",
  "sensitivity",
  "biopsy",
  "cytology",
  "histopath",
  "swab",
  "serology",
  "widal",
  "dengue",
  "malaria",
  "hiv",
  "hbsag",
  "hcv",
  "blood group",
  "peripheral smear",
  "x-ray",
  "xray",
  "mri",
  "ultrasound",
  "usg",
  "sonography",
  "doppler",
  "mammogram",
  "scan",
  "angiogram",
  "ecg",
  "echo",
  "eeg",
  "emg",
  "spirometry",
  "pft",
  "holter",
  "tmt",
  "treadmill",
  "profile",
  "panel",
  "screening",
  "assay",
  "titre",
  "titer",
  "level",
  "count",
]

const MED_KEYWORDS = [
  "tab",
  "tabs",
  "tablet",
  "tablets",
  "cap",
  "caps",
  "capsule",
  "capsules",
  "syrup",
  "syp",
  "susp",
  "suspension",
  "inj",
  "injection",
  "inhaler",
  "puff",
  "puffs",
  "drops",
  "ointment",
  "cream",
  "gel",
  "lotion",
  "spray",
  "patch",
  "sachet",
  "od",
  "bd",
  "tds",
  "tid",
  "qid",
  "qds",
  "hs",
  "sos",
  "prn",
  "mg",
  "mcg",
  "gm",
  "ml",
  "iu",
]

const FREQUENCY_RE =
  /\b(OD|BD|TDS|TID|QID|QDS|HS|SOS|PRN|1-0-1|1-1-1|0-0-1|1-0-0|0-1-0|1-1-0)\b/i
const STRENGTH_RE = /\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|gm|ml|iu|units|%))\b/i
const DURATION_RE = /\b(\d+)\s*(day|days|week|weeks|month|months)\b/i
const DOSAGE_RE =
  /\b(\d+(?:\/\d+)?\s*(?:tab|tabs|tablet|tablets|cap|caps|puff|puffs|drop|drops|ml|tsp))\b/i
const BULLET_RE = /^\s*(?:[-*•–—]|\d+[.)])\s*/
const DIAGNOSIS_RE =
  /^(diagnosis|provisional diagnosis|impression|dx|doctor notes?|clinical notes?|findings?)\s*[:\-]\s*(.*)$/i
const ADVICE_RE =
  /^(advice|advise|patient notes?|patient advice|general advice|instructions?|patient instructions?|follow[\s-]?up|plan|home care)\s*[:\-]\s*(.*)$/i

const LAB_HEADERS = new Set([
  "investigation",
  "investigations",
  "lab",
  "labs",
  "lab test",
  "lab tests",
  "test",
  "tests",
  "advised tests",
  "tests advised",
  "diagnostics",
  "imaging",
  "radiology",
])
const RX_HEADERS = new Set([
  "rx",
  "r/x",
  "medicine",
  "medicines",
  "medication",
  "medications",
  "drugs",
  "treatment",
  "prescription",
])
const DOSES_PER_DAY: Record<string, number> = {
  OD: 1,
  HS: 1,
  BD: 2,
  TDS: 3,
  TID: 3,
  QID: 4,
  QDS: 4,
  "1-0-1": 2,
  "1-1-1": 3,
  "0-0-1": 1,
  "1-0-0": 1,
  "0-1-0": 1,
  "1-1-0": 2,
}
const INSTRUCTION_PHRASES = [
  "after food",
  "before food",
  "after meals",
  "before meals",
  "after breakfast",
  "after dinner",
  "after lunch",
  "at bedtime",
  "empty stomach",
  "with water",
  "rinse mouth",
  "as needed",
  "if required",
]

const hasWord = (line: string, word: string) =>
  new RegExp(
    `(?<![a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`,
    "i",
  ).test(line)

const looksLikeLab = (line: string) =>
  LAB_KEYWORDS.some((k) => line.toLowerCase().includes(k))
const looksLikeMed = (line: string) =>
  MED_KEYWORDS.some((k) => hasWord(line, k))

function parseMedicationLine(line: string): ParsedMedication {
  const strength = STRENGTH_RE.exec(line)
  const frequency = FREQUENCY_RE.exec(line)
  const duration = DURATION_RE.exec(line)
  const dosage = DOSAGE_RE.exec(line)
  const lowered = line.toLowerCase()
  const instructions =
    INSTRUCTION_PHRASES.find((p) => lowered.includes(p)) || ""

  let name = line
  for (const match of [strength, frequency, duration, dosage]) {
    if (match) name = name.replace(match[0], " ")
  }
  if (instructions) name = name.replace(new RegExp(instructions, "i"), " ")
  name = name
    .replace(/\s+[x×]\s*$/i, " ")
    .replace(/[\s,;|]+/g, " ")
    .replace(/^[-–—,;:.xX×\s]+|[-–—,;:.xX×\s]+$/g, "")

  let durationDays = 0
  if (duration) {
    const unit = duration[2].toLowerCase()
    durationDays =
      parseInt(duration[1], 10) *
      (unit.startsWith("week") ? 7 : unit.startsWith("month") ? 30 : 1)
  }

  let route = "Oral"
  if (/\b(inhaler|puff|nebuli)/i.test(line)) route = "Inhalation"
  else if (/\b(inj|injection|iv|im)\b/i.test(line)) route = "IV"
  else if (/\b(ointment|cream|gel|lotion|patch)\b/i.test(line))
    route = "Topical"
  else if (/sublingual/i.test(line)) route = "Sublingual"

  const freq = frequency ? frequency[1].toUpperCase() : ""
  const perDay = DOSES_PER_DAY[freq]
  return {
    name: name || line.trim(),
    strength: strength ? strength[1].trim() : "",
    dosage: dosage ? dosage[1].trim() : "",
    frequency: freq,
    route,
    duration: duration ? `${duration[1]} ${duration[2]}` : "",
    instructions,
    quantity: perDay && durationDays ? Math.max(1, perDay * durationDays) : 1,
  }
}

function buildLabTest(line: string): ParsedLabTest {
  const lowered = line.toLowerCase()
  const radiology = [
    "x-ray",
    "xray",
    "mri",
    "ct ",
    "ct-",
    "scan",
    "ultrasound",
    "usg",
    "doppler",
    "sonography",
    "mammogram",
    "angiogram",
  ].some((k) => lowered.includes(k))
  const cardiology = ["ecg", "echo", "tmt", "holter", "treadmill"].some((k) =>
    lowered.includes(k),
  )
  return {
    name:
      line
        .replace(/\s*[-–—]?\s*\b(stat|urgent)\b\s*$/i, "")
        .replace(/[-–—,;:.\s]+$/, "")
        .trim() || line.trim(),
    category: radiology ? "Radiology" : cardiology ? "Cardiology" : "Pathology",
    urgency: /\b(stat|urgent)\b/i.test(lowered) ? "STAT" : "Routine",
  }
}

/** Keyword split done entirely in the browser. Exported for the offline path and tests. */
export function localSplit(text: string): PrescriptionSplit {
  const diagnosisParts: string[] = []
  const adviceParts: string[] = []
  const medications: ParsedMedication[] = []
  const labTests: ParsedLabTest[] = []
  const unclassified: string[] = []
  let section: "lab" | "rx" | null = null

  for (const rawLine of (text || "").split("\n")) {
    const line = rawLine.replace(BULLET_RE, "").trim()
    if (!line) continue

    const diagnosisMatch = DIAGNOSIS_RE.exec(line)
    if (diagnosisMatch) {
      if (diagnosisMatch[2].trim())
        diagnosisParts.push(diagnosisMatch[2].trim())
      section = null
      continue
    }
    const adviceMatch = ADVICE_RE.exec(line)
    if (adviceMatch) {
      if (adviceMatch[2].trim()) adviceParts.push(adviceMatch[2].trim())
      section = null
      continue
    }

    const colonIndex = line.indexOf(":")
    const header = (colonIndex >= 0 ? line.slice(0, colonIndex) : line)
      .trim()
      .toLowerCase()
    const inline = colonIndex >= 0 ? line.slice(colonIndex + 1).trim() : ""
    if (LAB_HEADERS.has(header) || RX_HEADERS.has(header)) {
      section = LAB_HEADERS.has(header) ? "lab" : "rx"
      if (!inline) continue
      for (const piece of inline
        .split(/[,;]/)
        .map((p) => p.trim())
        .filter(Boolean)) {
        if (section === "lab") labTests.push(buildLabTest(piece))
        else medications.push(parseMedicationLine(piece))
      }
      continue
    }

    const isLab = looksLikeLab(line)
    const isMed = looksLikeMed(line)
    let verdict: "lab" | "rx" | null
    if (section === "lab") verdict = isMed && !isLab ? "rx" : "lab"
    else if (section === "rx") verdict = isLab && !isMed ? "lab" : "rx"
    else if (isLab && !isMed) verdict = "lab"
    else if (isMed && !isLab) verdict = "rx"
    else if (isLab && isMed) verdict = FREQUENCY_RE.test(line) ? "rx" : "lab"
    else verdict = null

    if (verdict === "lab") {
      const pieces = line
        .split(/[,;]/)
        .map((p) => p.trim())
        .filter(Boolean)
      if (pieces.length > 1 && pieces.every(looksLikeLab))
        pieces.forEach((p) => labTests.push(buildLabTest(p)))
      else labTests.push(buildLabTest(line))
    } else if (verdict === "rx") {
      medications.push(parseMedicationLine(line))
    } else {
      unclassified.push(line)
    }
  }

  return {
    diagnosis: diagnosisParts.join(" "),
    advice: adviceParts.join(" "),
    summary: `${medications.length} medicine(s) and ${labTests.length} investigation(s) matched offline -- verify before dispatch.`,
    medications,
    labTests,
    unclassified,
    engine: "browser",
    ocrText: text,
  }
}
