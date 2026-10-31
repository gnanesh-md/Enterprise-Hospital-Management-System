/**
 * Enterprise Hospital Management System - Surgery & Operation Theatre (OT) Database Service
 * Fully integrates the 14-Page Imperial Hospitals Physical OT Booklet:
 *  - Page 2: Pre-Anaesthetic Assessment (PAC)
 *  - Page 3: Anaesthesia Plan & Immediate Pre-Op Re-Evaluation
 *  - Page 4 & 5: Consent for Surgery / Invasive Procedure / High Risk
 *  - Page 6 & 7: Consent for Anaesthesia / Analgesia / Sedation
 *  - Page 8: Surgery Master Checklist (Pre-Op 1-10, Intra-Op 11-15, Post-Op 16-21)
 *  - Page 9: Pre-Preparation Form for Operation (Ward -> OT Nurse Handover)
 *  - Page 10: WHO Surgical Safety Checklist (Sign-In, Time-Out, Sign-Out)
 *  - Page 11: Anaesthesia Record (Intra-op Monitoring, Regional Block, Drugs)
 *  - Page 12 & 13: Operation Record & Surgeon Procedure Notes
 *  - Page 14: Recovery Evaluation & Modified Aldrete Score (0-10) + Ward Handover
 *
 * Backed by the real `/api/ot/cases` routes (hospital-backend/backend/modules/ot/routes.py) --
 * every stage-transition button routes through PATCH .../status, which is the
 * server-side gate: it rejects (409) unless the relevant booklet section
 * (PAC opinion, WHO checklist signatures, Aldrete score) actually proves the
 * stage was completed. `localStorage` is kept only as a write-through cache
 * so a mid-edit booklet survives a dropped connection, same posture as the
 * ICU flowsheet (see AGENTS.md).
 */

import { apiFetch } from "../lib/api"

export type SurgeryStatus = "PAC Pending" | "PAC Cleared" | "Pre-Op Holding" | "In Surgery" | "PACU Recovery" | "Completed" | "Cancelled"

export type UrgencyLevel = "Elective" | "Urgent" | "Emergency STAT"

export interface PreAnaestheticAssessment {
  history: {
    diabetes: boolean
    hypertension: boolean
    ihd: boolean
    cva: boolean
    hospitalisation: boolean
    anestheticExposure: boolean
    coughSputum: boolean
    breathlessness: boolean
    asthmaCopd: boolean
    tb: boolean
    convulsions: boolean
    palpitations: boolean
    allergies: boolean
    smokingAlcoholDrugAbuse: boolean
    snoring: boolean
    bleedingTendency: boolean
    jaundice: boolean
    syncopalAttacks: boolean
    backache: boolean
    scolineSensitivity: boolean
    timeOfLastMeal: string
    presentMedications: string[]
    otherHistory: string
  }
  clinicalExam: {
    built: "Obese" | "Moderate" | "Thin"
    hydration: string
    pallor: boolean
    cyanosis: boolean
    clubbing: boolean
    pedalEdema: boolean
    ascites: boolean
    mouthOpening: string
    teeth: "Normal" | "Loose" | "Protruding" | "Missing" | "Dentures"
    tmjMovement: string
    shortNeck: boolean
    goitre: boolean
    trachea: string
    mallampatiGrade: "Class I" | "Class II" | "Class III" | "Class IV"
    spine: string
  }
  vitalsExam: {
    bp: string
    pulse: number
    rhythm: string
    volume: string
    rr: number
    temp: string
    heartSounds: string
    murmurs: string
    cardiomegaly: boolean
    lungsAirEntryLeft: string
    lungsAirEntryRight: string
    breathSounds: string
    advSounds: string
  }
  investigations: {
    urineAlbuminSugar: string
    hbPercent: string
    btCt: string
    ptInr: string
    bloodGroup: string
    bloodSugar: string
    bloodUrea: string
    sCreatinine: string
    electrolytesNaK: string
    cxr: string
    ecg: string
    lft: string
    echo2d: string
    otherLabs: string
  }
  opinionAsa: {
    opinion: "May be posted" | "Needs further special evaluation" | "Needs treatment"
    asaGrade: "ASA I" | "ASA II" | "ASA III" | "ASA IV" | "ASA V-E"
    anesthesiaPlanned: "General Anesthesia" | "Spinal/Epidural" | "Regional Block" | "Local"
    evaluatorSignature: string
    date: string
    time: string
  }
  clearanceStatus?: "Pending" | "Cleared" | "High Risk Cleared" | "Rejected" | string
}

export interface SurgicalImplant {
  id: string
  name: string
  serialOrLotNumber: string
  manufacturer: string
  expiryDate?: string
  status: "Sterilized" | "Implanted" | "Wasted"
  cost: number
}

export interface AnaesthesiaPlan {
  preopInstructions: string
  premedication: string
  typeOfAnaesthesia: string
  npoSolidsHours: number
  npoClearFluidsHours: number
  specialMonitoringRequired: string
  anticipatedPostOpCare: string
  arrangeBloodProducts: string
  investigationsRequired: string
  immediateReEval: {
    date: string
    time: string
    patientSiteIdentified: boolean
    changeOfPlan: string
    heartRate: number
    bp: string
    npoStatus: string
    evaluatorSignature: string
  }
}

export interface PrePreparationForm {
  vitals: {
    bp: string
    pulse: number
    temp: string
  }
  idTagVerified: boolean
  weightKg: number
  premedicationGiven: boolean
  nasoGastricTube: boolean
  enemaGiven: boolean
  timeOfLastMicturition: string
  timeOfLastFeed: string
  nailPolishRemoved: boolean
  teethJewelsRemoved: boolean
  prepShaveSiteDone: boolean
  xrayReportsEnclosed: boolean
  bloodLabReportsEnclosed: boolean
  handedOverByNurse: string
  takenOverByOtNurse: string
}

export interface MasterSurgeryChecklist {
  preOpItems: {
    bloodProductsArranged: boolean
    financialApprovalDone: boolean
    pacCompleted: boolean
    patientPreparationDone: boolean
    anaesthesiaConsentSigned: boolean
    surgeryConsentSigned: boolean
    highRiskConsentSigned: boolean
    bloodTransfusionConsentSigned: boolean
    antibioticProphylaxisGiven: boolean
    prePreparationFormComplete: boolean
    wardNurseSignature: string
    receivedBySignature: string
  }
  intraOpItems: {
    anaesthesiaNotesRecorded: boolean
    whoSafetyChecklistComplete: boolean
    operationNotesRecorded: boolean
    surgeonNotesRecorded: boolean
    medicationChartUpdated: boolean
    checkedBySignature: string
  }
  postOpItems: {
    recoveryEvaluationDone: boolean
    anaestheticRecoveryRecordComplete: boolean
    patientHandoverNurseNotesSigned: boolean
    qualityIndicatorsUpdated: boolean
    photosVideosArchived: boolean
    radiologyFilmsHandedOver: boolean
    recoveryNurseSignature: string
  }
}

export interface WhoSafetyChecklist {
  signIn: {
    patientConfirmedIdConsent: boolean
    siteMarked: boolean
    anaesthesiaMachineCheckComplete: boolean
    pulseOximeterFunctioning: boolean
    allergiesChecked: boolean
    difficultAirwayRisk: boolean
    bloodLossRiskOver500ml: boolean
    signedByNurse: string
    completedAt?: string
  }
  timeOut: {
    teamMembersIntroduced: boolean
    patientNameProcedureSiteConfirmed: boolean
    antibioticProphylaxisWithin60min: boolean
    surgeonCriticalStepsDiscussed: boolean
    anaesthetistPatientConcernsDiscussed: boolean
    nurseSterilityEquipmentVerified: boolean
    imagingDisplayed: boolean
    signedBySurgeon: string
    completedAt?: string
  }
  signOut: {
    procedureNameRecorded: boolean
    swabInstrumentNeedleCountCorrect: boolean
    specimenLabeledAloud: boolean
    equipmentProblemsNoted: boolean
    postOpRecoveryConcernsDiscussed: boolean
    signedByScrubNurse: string
    completedAt?: string
  }
}

export interface AnaesthesiaRecordDetail {
  startingTime: string
  finishedTime: string
  anaestheticTechnique: string
  preoxygenationDone: boolean
  airwayManagement: {
    maskLmaEttSize: string
    ventilation: "Spontaneous" | "Controlled"
    intubation: "Easy" | "Difficult" | "Failed"
    sellickManoeuvre: boolean
    patientPosition: string
  }
  regionalBlock: {
    position: string
    space: string
    needleType: string
    drugDosage: string
    onsetLevel: string
    bromageScale: string
  }
  drugsUsed: Array<{ drug: string; dose: string; time: string }>
  shiftingCondition: string
  anesthesiologistSignature: string
}

export interface OperationRecordDetail {
  surgeonPreparedInOr: string
  preOpDiagnosis: string
  postOpDiagnosis: string
  procedureProposed: string
  procedureExecuted: string
  asstSurgeons: string[]
  skinPreparation: string
  histopathologySent: boolean
  photosVideosRecorded: boolean
  swabCountCorrect: boolean
  instrumentCountCorrect: boolean
  suturesUsed: string
  drainageCount: number
  bloodLossMl: number
  surgeryStartTime: string
  surgeryEndTime: string
  operatingTimeMins: number
  complications: string
  surgeonProcedureNotes: string
  postOpInstructions: string
  surgeonSignature: string
}

export interface RecoveryAldreteDetail {
  bedNumber: string
  admissionTime: string
  dischargeTime?: string
  aldreteScore: {
    activity: number // 0-2
    respiration: number // 0-2
    circulation: number // 0-2
    consciousness: number // 0-2
    o2Saturation: number // 0-2
    totalScore: number // 0-10
  }
  vitals: {
    bp: string
    hr: number
    spo2: number
  }
  dischargeStatus: "In PACU" | "Cleared for Ward" | "Transferred to ICU"
  wardHandoverNurse: string
  dischargedBy: string
}

// Fields the backend has no dedicated column for -- kept in booklet.caseInfo
// (see toSurgicalCase/toCaseInfo below), same "frontend owns the shape"
// trade-off as the rest of the booklet.
export interface SurgicalCaseInfo {
  patientName: string
  age: number
  gender: "Male" | "Female" | "Other"
  mrn: string
  ipNo: string
  cptCode: string
  icd10Code: string
  specialty: string
  assistantSurgeon?: string
  anesthesiologist: string
  scrubNurse: string
  circulatingNurse: string
  scheduledTime: string
  durationEst: string
  urgency: UrgencyLevel
  insuranceProvider: string
}

export interface SurgicalCase extends SurgicalCaseInfo {
  id: string
  caseNo: string
  orRoom: string
  patientId: string
  procedureName: string
  surgeon: string
  totalAmount: number
  status: SurgeryStatus
  billedAt: string | null
  invoiceId: number | null

  // Complete Digital OT Booklet Records (Imperial Hospitals Booklet Page 1-14)
  pac?: PreAnaestheticAssessment
  anaesthesiaPlan?: AnaesthesiaPlan
  prePrepForm?: PrePreparationForm
  masterChecklist?: MasterSurgeryChecklist
  whoChecklist?: WhoSafetyChecklist
  anaesthesiaRecord?: AnaesthesiaRecordDetail
  operationRecord?: OperationRecordDetail
  recoveryAldrete?: RecoveryAldreteDetail

  createdAt: string
  updatedAt: string
}

export interface SurgeonPreferenceCard {
  id: string
  surgeonName: string
  specialty: string
  procedure: string
  gloveSize: string
  preferredTrays: string[]
  suturePreferences: string[]
  disposables: string[]
  specialInstructions: string
}

/** Reason string from a 409 gate rejection, so the UI can show *why*. */
export class OtGateError extends Error {
  reason: string
  constructor(reason: string) {
    super(reason)
    this.reason = reason
  }
}

const CACHE_KEY = "hospai_surgery_cases_cache_v1"
const CHANNEL_NAME = "hospai_surgery_updates"

const DEFAULT_SURGEON_CARDS: SurgeonPreferenceCard[] = [
  {
    id: "SPC-101",
    surgeonName: "Dr. Adams",
    specialty: "Orthopedics",
    procedure: "Total Knee Replacement",
    gloveSize: "7.5 Powder-Free",
    preferredTrays: [
      "Major Ortho Instrument Set #3",
      "Stryker Power Tool Kit",
      "Knee Trial Implants Set",
    ],
    suturePreferences: [
      "Ethicon Vicryl 2-0",
      "Monocryl 3-0 Cutting",
      "Stapler 35 Wide",
    ],
    disposables: [
      "Coban 4 inch",
      "Aquacel Ag Surgical Dressing",
      "Suction Tubing x2",
    ],
    specialInstructions:
      "Tourniquet pressure 250mmHg right thigh. Prefers pulsatile lavage prior to cementation.",
  },
  {
    id: "SPC-102",
    surgeonName: "Dr. Vikram Seth",
    specialty: "General & Laparoscopy",
    procedure: "Laparoscopic Cholecystectomy",
    gloveSize: "8.0 Micro-textured",
    preferredTrays: [
      "Karl Storz 4K Laparoscopic Tower Set",
      "Veress Needle & Trocar Pack (10mm/5mm)",
    ],
    suturePreferences: ["Endoloop Vicryl 0", "PDS II 3-0 Subcuticular"],
    disposables: [
      "Endo Catch Bag 10mm",
      "Harmonic Scalpel Shears",
      "CO2 Insufflation Tubing",
    ],
    specialInstructions:
      "Position patient in reverse Trendelenburg with left tilt. Keep cholangiography set on standby.",
  },
]

export const DEFAULT_SEED_CASES: SurgicalCase[] = [
  {
    id: "SURG-101",
    caseNo: "OT-2026-001",
    orRoom: "OR 1",
    patientId: "UMR100450",
    patientName: "Harold Thompson",
    age: 68,
    gender: "Male",
    mrn: "UMR100450",
    ipNo: "IP-884920",
    cptCode: "27447",
    icd10Code: "M17.11",
    procedureName: "Total Knee Replacement R",
    specialty: "Orthopedics",
    surgeon: "Dr. Adams",
    anesthesiologist: "Dr. Rodriguez",
    scrubNurse: "RN Murphy",
    circulatingNurse: "RN Davis",
    scheduledTime: "07:30 AM",
    durationEst: "135 mins",
    urgency: "Elective",
    insuranceProvider: "Star Health",
    totalAmount: 54700,
    status: "Completed",
    billedAt: new Date().toISOString(),
    invoiceId: 100450,
    createdAt: "2026-09-23T07:30:00Z",
    updatedAt: "2026-09-23T10:00:00Z",
  },
  {
    id: "SURG-102",
    caseNo: "OT-2026-002",
    orRoom: "OR 1",
    patientId: "UMR100451",
    patientName: "Isabel Cruz",
    age: 19,
    gender: "Female",
    mrn: "UMR100451",
    ipNo: "IP-884921",
    cptCode: "47562",
    icd10Code: "K35.80",
    procedureName: "Laparoscopic Appendectomy",
    specialty: "General Surgery",
    surgeon: "Dr. Williams",
    anesthesiologist: "Dr. Kim",
    scrubNurse: "RN Murphy",
    circulatingNurse: "RN Pham",
    scheduledTime: "11:00 AM",
    durationEst: "90 mins",
    urgency: "Urgent",
    insuranceProvider: "HDFC ERGO",
    totalAmount: 28000,
    status: "In Surgery",
    billedAt: null,
    invoiceId: null,
    createdAt: "2026-09-23T11:00:00Z",
    updatedAt: "2026-09-23T11:30:00Z",
  },
  {
    id: "SURG-103",
    caseNo: "OT-2026-003",
    orRoom: "OR 1",
    patientId: "UMR100452",
    patientName: "Mia Thompson",
    age: 74,
    gender: "Female",
    mrn: "UMR100452",
    ipNo: "IP-884922",
    cptCode: "66984",
    icd10Code: "H25.11",
    procedureName: "Cataract Extraction + IOL",
    specialty: "Ophthalmology",
    surgeon: "Dr. Park",
    anesthesiologist: "Dr. Rodriguez",
    scrubNurse: "RN Davis",
    circulatingNurse: "RN Murphy",
    scheduledTime: "03:00 PM",
    durationEst: "60 mins",
    urgency: "Elective",
    insuranceProvider: "Self-Pay",
    totalAmount: 15000,
    status: "PAC Pending",
    billedAt: null,
    invoiceId: null,
    createdAt: "2026-09-23T14:00:00Z",
    updatedAt: "2026-09-23T14:00:00Z",
  },
  {
    id: "SURG-104",
    caseNo: "OT-2026-004",
    orRoom: "OR 2",
    patientId: "UMR100412",
    patientName: "Ananya Desai",
    age: 42,
    gender: "Female",
    mrn: "UMR100412",
    ipNo: "IP-884923",
    cptCode: "47562",
    icd10Code: "K80.20",
    procedureName: "Laparoscopic Cholecystectomy",
    specialty: "General Surgery",
    surgeon: "Dr. Vikram Seth",
    anesthesiologist: "Dr. Brody",
    scrubNurse: "RN Pham",
    circulatingNurse: "RN Davis",
    scheduledTime: "08:00 AM",
    durationEst: "150 mins",
    urgency: "Elective",
    insuranceProvider: "HDFC ERGO",
    totalAmount: 32000,
    status: "PAC Cleared",
    billedAt: null,
    invoiceId: null,
    createdAt: "2026-09-23T08:00:00Z",
    updatedAt: "2026-09-23T09:30:00Z",
  },
  {
    id: "SURG-105",
    caseNo: "OT-2026-005",
    orRoom: "OR 2",
    patientId: "UMR100453",
    patientName: "George Watts",
    age: 60,
    gender: "Male",
    mrn: "UMR100453",
    ipNo: "IP-884924",
    cptCode: "33533",
    icd10Code: "I25.10",
    procedureName: "CABG x3 Coronary Bypass",
    specialty: "Cardiothoracic",
    surgeon: "Dr. Patel",
    anesthesiologist: "Dr. Rodriguez",
    scrubNurse: "RN Murphy",
    circulatingNurse: "RN Pham",
    scheduledTime: "12:00 PM",
    durationEst: "240 mins",
    urgency: "Urgent",
    insuranceProvider: "ICICI Lombard",
    totalAmount: 95000,
    status: "Pre-Op Holding",
    billedAt: null,
    invoiceId: null,
    createdAt: "2026-09-23T11:45:00Z",
    updatedAt: "2026-09-23T11:45:00Z",
  },
  {
    id: "SURG-106",
    caseNo: "OT-2026-006",
    orRoom: "OR 3",
    patientId: "UMR100142",
    patientName: "Diane Walsh",
    age: 80,
    gender: "Female",
    mrn: "UMR100142",
    ipNo: "IP-884925",
    cptCode: "27130",
    icd10Code: "M16.12",
    procedureName: "Hip Replacement L",
    specialty: "Orthopedics",
    surgeon: "Dr. Adams",
    anesthesiologist: "Dr. Kim",
    scrubNurse: "RN Davis",
    circulatingNurse: "RN Murphy",
    scheduledTime: "09:00 AM",
    durationEst: "180 mins",
    urgency: "Elective",
    insuranceProvider: "Star Health",
    totalAmount: 58000,
    status: "PACU Recovery",
    billedAt: null,
    invoiceId: null,
    createdAt: "2026-09-23T09:00:00Z",
    updatedAt: "2026-09-23T11:45:00Z",
  },
  {
    id: "SURG-108",
    caseNo: "OT-2026-088",
    orRoom: "Emergency OR 1",
    patientId: "P-100888",
    patientName: "Appanna Chinnapati",
    age: 54,
    gender: "Male",
    mrn: "100888",
    ipNo: "IP-884988",
    cptCode: "38100",
    icd10Code: "S36.032A",
    procedureName: "Emergency Exploratory Laparotomy + Splenectomy + Jejunal Repair",
    specialty: "General Surgery / Trauma",
    surgeon: "Dr. Vance",
    assistantSurgeon: "Dr. Williams",
    anesthesiologist: "Dr. Rodriguez",
    scrubNurse: "RN Murphy",
    circulatingNurse: "RN Davis",
    scheduledTime: "03:45 AM",
    durationEst: "165 mins",
    urgency: "Emergency STAT",
    insuranceProvider: "Star Health / CM Relief Fund",
    totalAmount: 85000,
    status: "Completed",
    billedAt: "2026-10-04T06:30:00Z",
    invoiceId: 100888,
    createdAt: "2026-10-04T03:45:00Z",
    updatedAt: "2026-10-04T06:30:00Z",
    operationRecord: {
      surgeonPreparedInOr: "Dr. Vance",
      preOpDiagnosis: "Blunt Abdominal Trauma, Massive Hemoperitoneum, Splenic Rupture in Hemorrhagic Shock",
      postOpDiagnosis: "Grade IV Splenic Shattered Pole Laceration with 1800 mL Hemoperitoneum, Traumatic Mesenteric Contusion and 2cm Jejunal Seromuscular Tear",
      procedureProposed: "Emergency Exploratory Laparotomy, Splenectomy, Hemoperitoneum Evacuation",
      procedureExecuted: "Exploratory Laparotomy, Splenectomy, Primary Two-Layer Jejunal Repair, Peritoneal Lavage with 4L warm saline, and Bilateral Subdiaphragmatic & Pelvic Closed Suction Drain Placement (28 Fr)",
      asstSurgeons: ["Dr. Williams"],
      skinPreparation: "Povidone Iodine 10% + Chlorhexidine",
      histopathologySent: true,
      photosVideosRecorded: false,
      swabCountCorrect: true,
      instrumentCountCorrect: true,
      suturesUsed: "Loop PDS 1, 3-0 PDS continuous, 3-0 Silk interrupted, Vicryl 2-0, Ethilon 2-0",
      drainageCount: 2,
      bloodLossMl: 1800,
      surgeryStartTime: "2026-10-04T03:45:00Z",
      surgeryEndTime: "2026-10-04T06:30:00Z",
      operatingTimeMins: 165,
      complications: "Intraoperative hemorrhagic shock managed with 3 units PRBC, 2 units FFP, and Norepinephrine infusion",
      surgeonProcedureNotes: "Midline laparotomy incision. Immediate suction of 1800 mL hemoperitoneum and large perisplenic clots. Splenic hilum mobilized and controlled; splenectomy completed with double ligatures. Proximal jejunal 2cm seromuscular tear repaired primarily in two layers with PDS and silk. Thorough warm peritoneal lavage with 4L normal saline. Two 28 Fr closed suction drains placed in left subdiaphragmatic splenic bed and pelvis. Mass closure of abdominal wall with loop PDS. Patient transferred intubated to SICU in guarded condition.",
      postOpInstructions: "Transfer intubated to SICU Bed-3. Strict NPO with Ryle's tube aspiration. Continue IV Meropenem 1g Q8H, Metronidazole 500mg Q8H, IV Tramadol, and IV Pantoprazole. Titrate Norepinephrine for MAP > 65. Serial ABG, Hb, and drain output monitoring Q1H. Transfuse PRBC if Hb < 8 g/dL. Plan post-splenectomy vaccinations prior to discharge.",
      surgeonSignature: "Dr. Vance, MS, MCh (Trauma Surgery)",
    },
  },
]

type CaseInfoBooklet = Partial<SurgicalCaseInfo> & Record<string, unknown>

function toSurgicalCase(row: any): SurgicalCase {
  const booklet = row.booklet || {}
  const caseInfo: CaseInfoBooklet = booklet.caseInfo || {}
  return {
    id: String(row.id),
    caseNo: row.case_no,
    orRoom: row.or_room || "",
    patientId: row.patient_id,
    patientName: (caseInfo.patientName as string) || row.patient_id,
    age: (caseInfo.age as number) ?? 0,
    gender: (caseInfo.gender as SurgicalCase["gender"]) || "Other",
    mrn: (caseInfo.mrn as string) || "",
    ipNo: (caseInfo.ipNo as string) || "",
    procedureName: row.procedure_name,
    cptCode: (caseInfo.cptCode as string) || "",
    icd10Code: (caseInfo.icd10Code as string) || "",
    specialty: (caseInfo.specialty as string) || "",
    surgeon: row.surgeon || "",
    assistantSurgeon: caseInfo.assistantSurgeon as string | undefined,
    anesthesiologist: (caseInfo.anesthesiologist as string) || "",
    scrubNurse: (caseInfo.scrubNurse as string) || "",
    circulatingNurse: (caseInfo.circulatingNurse as string) || "",
    scheduledTime: (caseInfo.scheduledTime as string) || "",
    durationEst: (caseInfo.durationEst as string) || "",
    urgency: (caseInfo.urgency as UrgencyLevel) || "Elective",
    insuranceProvider: (caseInfo.insuranceProvider as string) || "",
    totalAmount: Number(row.total_amount) || 0,
    status: row.status,
    billedAt: row.billed_at || null,
    invoiceId: row.invoice_id ?? null,
    pac: booklet.pac,
    anaesthesiaPlan: booklet.anaesthesiaPlan,
    prePrepForm: booklet.prePrepForm,
    masterChecklist: booklet.masterChecklist,
    whoChecklist: booklet.whoChecklist,
    anaesthesiaRecord: booklet.anaesthesiaRecord,
    operationRecord: booklet.operationRecord,
    recoveryAldrete: booklet.recoveryAldrete,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function caseInfoOf(c: Partial<SurgicalCase>): SurgicalCaseInfo {
  return {
    patientName: c.patientName || "",
    age: c.age ?? 0,
    gender: c.gender || "Other",
    mrn: c.mrn || "",
    ipNo: c.ipNo || "",
    cptCode: c.cptCode || "",
    icd10Code: c.icd10Code || "",
    specialty: c.specialty || "",
    assistantSurgeon: c.assistantSurgeon,
    anesthesiologist: c.anesthesiologist || "",
    scrubNurse: c.scrubNurse || "",
    circulatingNurse: c.circulatingNurse || "",
    scheduledTime: c.scheduledTime || "",
    durationEst: c.durationEst || "",
    urgency: c.urgency || "Elective",
    insuranceProvider: c.insuranceProvider || "",
  }
}

function bookletOf(c: Partial<SurgicalCase>) {
  return {
    caseInfo: caseInfoOf(c),
    pac: c.pac,
    anaesthesiaPlan: c.anaesthesiaPlan,
    prePrepForm: c.prePrepForm,
    masterChecklist: c.masterChecklist,
    whoChecklist: c.whoChecklist,
    anaesthesiaRecord: c.anaesthesiaRecord,
    operationRecord: c.operationRecord,
    recoveryAldrete: c.recoveryAldrete,
  }
}

async function handleGateResponse(promise: Promise<any>): Promise<any> {
  try {
    return await promise
  } catch (err: any) {
    const reason = err?.payload?.reason || err?.reason
    if (reason) throw new OtGateError(reason)
    throw err
  }
}

class SurgeryDbService {
  private cases: SurgicalCase[] = []
  private preferenceCards: SurgeonPreferenceCard[] = DEFAULT_SURGEON_CARDS
  private channel: BroadcastChannel | null = null
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.loadFromCache()
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = () => {
        this.refresh()
      }
    }
  }

  private loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        this.cases = JSON.parse(raw)
        const currentIds = new Set((this.cases || []).map((c) => c.id))
        const missing = DEFAULT_SEED_CASES.filter((c) => !currentIds.has(c.id))
        if (missing.length > 0) {
          this.cases = [...(this.cases || []), ...missing]
          this.saveToCache()
        }
      }
      if (!this.cases || this.cases.length === 0) {
        this.cases = DEFAULT_SEED_CASES
      }
    } catch {
      this.cases = DEFAULT_SEED_CASES
    }
  }

  private saveToCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(this.cases))
      if (this.channel) {
        this.channel.postMessage({ type: "SURGERY_UPDATED", timestamp: Date.now() })
      }
    } catch {
      // Storage fallback -- non-fatal, cache is a convenience only.
    }
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn())
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  public getCases(): SurgicalCase[] {
    if (!this.cases || this.cases.length === 0) {
      return DEFAULT_SEED_CASES
    }
    return [...this.cases]
  }

  public getCaseById(id: string): SurgicalCase | undefined {
    return this.getCases().find((c) => c.id === id)
  }

  public getPreferenceCards(): SurgeonPreferenceCard[] {
    return [...this.preferenceCards]
  }

  public async refresh(): Promise<SurgicalCase[]> {
    try {
      const res = await apiFetch<{ cases: any[] }>("/api/ot/cases")
      if (res?.cases && res.cases.length > 0) {
        this.cases = res.cases.map(toSurgicalCase)
      } else if (!this.cases || this.cases.length === 0) {
        this.cases = DEFAULT_SEED_CASES
      }
      this.saveToCache()
    } catch {
      if (!this.cases || this.cases.length === 0) {
        this.cases = DEFAULT_SEED_CASES
      }
    }
    this.notifyListeners()
    return this.getCases()
  }

  public async createCase(
    newCase: Omit<SurgicalCase, "id" | "caseNo" | "billedAt" | "invoiceId" | "createdAt" | "updatedAt" | "status"> & { status?: SurgeryStatus },
  ): Promise<SurgicalCase> {
    const row = await apiFetch<any>("/api/ot/cases", {
      method: "POST",
      body: JSON.stringify({
        patient_id: newCase.patientId,
        procedure_name: newCase.procedureName,
        or_room: newCase.orRoom,
        surgeon: newCase.surgeon,
        total_amount: newCase.totalAmount,
      }),
    })
    // The booklet's caseInfo (demographics/scheduling) isn't accepted by the
    // create route -- save it right after so the board has it immediately.
    const withInfo = await apiFetch<any>(`/api/ot/cases/${row.id}/booklet`, {
      method: "PUT",
      body: JSON.stringify({ booklet: { caseInfo: caseInfoOf(newCase) } }),
    })
    const created = toSurgicalCase(withInfo)
    await this.refresh()
    return created
  }

  public async updateCaseStatus(id: string, status: SurgeryStatus): Promise<SurgicalCase> {
    const row = await handleGateResponse(
      apiFetch<any>(`/api/ot/cases/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    )
    const updated = toSurgicalCase(row)
    await this.refresh()
    return updated
  }

  public async saveFullBooklet(id: string, bookletData: Partial<SurgicalCase>): Promise<SurgicalCase> {
    const existing = this.getCaseById(id)
    const merged = { ...existing, ...bookletData }
    const row = await apiFetch<any>(`/api/ot/cases/${id}/booklet`, {
      method: "PUT",
      body: JSON.stringify({ booklet: bookletOf(merged) }),
    })
    const updated = toSurgicalCase(row)
    await this.refresh()
    return updated
  }

  public async savePacAssessment(id: string, pac: PreAnaestheticAssessment): Promise<SurgicalCase> {
    const row = await apiFetch<any>(`/api/ot/cases/${id}/pac`, {
      method: "POST",
      body: JSON.stringify(pac),
    })
    const updated = toSurgicalCase(row)
    await this.refresh()
    return updated
  }

  public async saveWhoChecklist(id: string, who: WhoSafetyChecklist): Promise<SurgicalCase> {
    const row = await apiFetch<any>(`/api/ot/cases/${id}/who-checklist`, {
      method: "POST",
      body: JSON.stringify(who),
    })
    const updated = toSurgicalCase(row)
    await this.refresh()
    return updated
  }

  /** Saving the PACU/Aldrete section also triggers billing server-side once
   * dischargeStatus leaves "In PACU" -- see modules/ot/routes.py's
   * ot_save_pacu, which stamps billed_at exactly once per case. */
  public async savePacuRecord(id: string, pacu: RecoveryAldreteDetail): Promise<SurgicalCase> {
    const row = await apiFetch<any>(`/api/ot/cases/${id}/pacu`, {
      method: "POST",
      body: JSON.stringify(pacu),
    })
    const updated = toSurgicalCase(row)
    await this.refresh()
    return updated
  }
}

export const SurgeryDatabase = new SurgeryDbService()
