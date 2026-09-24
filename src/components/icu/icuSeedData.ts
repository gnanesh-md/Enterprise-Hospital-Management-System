import type { FlowsheetRecord } from "./IcuFlowsheet"

const storageKey = (patientId: string, date: string) =>
  `icu.flowsheet.${patientId}.${date}`

/** Generate YYYY-MM-DD date string offset by -daysAgo from today */
export function getPastDateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

/** Return current system date (YYYY-MM-DD) and time (HH:mm) */
export function getCurrentDateTimeFormatted(): {
  dateStr: string
  timeStr: string
} {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  return { dateStr, timeStr: `${hours}:${minutes}` }
}

/**
 * Get array of stay day objects for a patient with length of stay (default 10 days).
 * Sorted NEWEST FIRST (Day 10 TODAY at top, down to Day 1).
 */
export function getPatientStayDays(
  totalDays: number = 10,
): { dayNumber: number ;dateStr: string ;label: string ;isToday: boolean }[] {
  const days: {
    dayNumber: number
    dateStr: string
    label: string
    isToday: boolean
  }[] = []
  for (let i = 0; i < totalDays; i++) {
    const dayNumber = totalDays - i
    const dateStr = getPastDateStr(i)
    const dateObj = new Date(dateStr + "T00:00:00")
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    const isToday = i === 0
    days.push({
      dayNumber,
      dateStr,
      label: `Day ${dayNumber} (${formattedDate})`,
      isToday,
    })
  }
  return days
}

export type SuggestedMed = {
  drug: string
  dose: string
  route: string
  freq: string
  indication: string
}

/** Return patient-specific suggested doctor medications based on diagnosis */
export function getPatientSuggestedMedications(
  dx: string | null,
): SuggestedMed[] {
  if (!dx) {
    return [
      {
        drug: "Norepinephrine Drip",
        dose: "0.08 mcg/kg/min",
        route: "IV",
        freq: "Continuous",
        indication: "Hemodynamic support",
      },
      {
        drug: "Vancomycin",
        dose: "1g",
        route: "IV",
        freq: "Q12H",
        indication: "Empiric coverage",
      },
      {
        drug: "Furosemide",
        dose: "20 mg",
        route: "IV",
        freq: "BD",
        indication: "Diuresis",
      },
    ]
  }

  const d = dx.toLowerCase()

  if (d.includes("stemi") || d.includes("pci") || d.includes("cardiac")) {
    return [
      {
        drug: "Norepinephrine Drip",
        dose: "0.12 mcg/kg/min",
        route: "IV",
        freq: "Continuous",
        indication: "MAP > 65 mmHg",
      },
      {
        drug: "Heparin Sodium Drip",
        dose: "1,200 units/hr",
        route: "IV",
        freq: "Continuous",
        indication: "Post-PCI anticoagulation",
      },
      {
        drug: "Ticagrelor (Brilinta)",
        dose: "90 mg",
        route: "PO/NG",
        freq: "BD",
        indication: "Dual antiplatelet",
      },
      {
        drug: "Aspirin",
        dose: "81 mg",
        route: "PO/NG",
        freq: "OD",
        indication: "Cardioprotection",
      },
      {
        drug: "Atorvastatin",
        dose: "80 mg",
        route: "PO",
        freq: "OD",
        indication: "Plaque stabilization",
      },
      {
        drug: "Nitroglycerin Drip",
        dose: "10 mcg/min",
        route: "IV",
        freq: "Continuous",
        indication: "Ischemia / Preload reduction",
      },
      {
        drug: "Furosemide (Lasix)",
        dose: "40 mg",
        route: "IV",
        freq: "BD",
        indication: "Pulmonary congestion",
      },
    ]
  }

  if (
    d.includes("septic") ||
    d.includes("pneumonia") ||
    d.includes("infection")
  ) {
    return [
      {
        drug: "Norepinephrine Drip",
        dose: "0.08 mcg/kg/min",
        route: "IV",
        freq: "Continuous",
        indication: "Septic shock protocol",
      },
      {
        drug: "Vancomycin",
        dose: "1g",
        route: "IV",
        freq: "Q12H",
        indication: "Gram-positive coverage",
      },
      {
        drug: "Pip-Tazo (Zosyn)",
        dose: "3.375g",
        route: "IV",
        freq: "Q6H",
        indication: "Pseudomonal coverage",
      },
      {
        drug: "Meropenem",
        dose: "1g",
        route: "IV",
        freq: "Q8H",
        indication: "Resistant sepsis",
      },
      {
        drug: "Hydrocortisone",
        dose: "50 mg",
        route: "IV",
        freq: "Q6H",
        indication: "Refractory shock",
      },
    ]
  }

  if (
    d.includes("cabg") ||
    d.includes("laparotomy") ||
    d.includes("surgery") ||
    d.includes("post-op")
  ) {
    return [
      {
        drug: "Nitroglycerin Drip",
        dose: "10 mcg/min",
        route: "IV",
        freq: "Continuous",
        indication: "Graft spasm prevention",
      },
      {
        drug: "Hydromorphone (Dilaudid) PCA",
        dose: "0.2 mg/hr",
        route: "IV",
        freq: "Continuous",
        indication: "Post-op analgesia",
      },
      {
        drug: "Cefazolin (Ancef)",
        dose: "1g",
        route: "IV",
        freq: "Q8H",
        indication: "Surgical prophylaxis",
      },
      {
        drug: "Furosemide",
        dose: "20 mg",
        route: "IV",
        freq: "OD",
        indication: "Volume management",
      },
    ]
  }

  if (
    d.includes("stroke") ||
    d.includes("thrombectomy") ||
    d.includes("tbi") ||
    d.includes("neuro")
  ) {
    return [
      {
        drug: "Labetalol Drip",
        dose: "2 mg/min",
        route: "IV",
        freq: "Continuous",
        indication: "Strict SBP < 140 mmHg",
      },
      {
        drug: "Nicardipine Drip",
        dose: "5 mg/hr",
        route: "IV",
        freq: "Continuous",
        indication: "Cerebral perfusion control",
      },
      {
        drug: "Mannitol 20%",
        dose: "100 mL",
        route: "IV",
        freq: "Q6H",
        indication: "ICP management",
      },
      {
        drug: "Aspirin",
        dose: "81 mg",
        route: "PO",
        freq: "OD",
        indication: "Secondary stroke prevention",
      },
    ]
  }

  if (
    d.includes("dka") ||
    d.includes("diabetes") ||
    d.includes("ketoacidosis")
  ) {
    return [
      {
        drug: "Insulin Regular Drip",
        dose: "0.05 u/kg/hr",
        route: "IV",
        freq: "Continuous",
        indication: "DKA protocol",
      },
      {
        drug: "D5 1/2 NS + 20 mEq KCl",
        dose: "150 mL/hr",
        route: "IV",
        freq: "Continuous",
        indication: "Euglycemic hydration",
      },
      {
        drug: "Potassium Chloride IV",
        dose: "20 mEq",
        route: "IV",
        freq: "STAT",
        indication: "Hypokalemia prevention",
      },
    ]
  }

  if (
    d.includes("rsv") ||
    d.includes("pediatric") ||
    d.includes("bronchiolitis")
  ) {
    return [
      {
        drug: "Pediatric Albuterol Nebulizer",
        dose: "2.5 mg",
        route: "Neb",
        freq: "Q4H",
        indication: "Bronchospasm",
      },
      {
        drug: "3% Hypertonic Saline",
        dose: "4 mL",
        route: "Neb",
        freq: "Q6H",
        indication: "Mucus clearance",
      },
      {
        drug: "D5 1/4 NS",
        dose: "25 mL/hr",
        route: "IV",
        freq: "Continuous",
        indication: "Maintenance IV fluids",
      },
      {
        drug: "Acetaminophen (Tylenol)",
        dose: "120 mg",
        route: "PO/PR",
        freq: "Q6H",
        indication: "Fever control",
      },
    ]
  }

  return [
    {
      drug: "Norepinephrine Drip",
      dose: "0.08 mcg/kg/min",
      route: "IV",
      freq: "Continuous",
      indication: "Vasoactive support",
    },
    {
      drug: "Vancomycin",
      dose: "1g",
      route: "IV",
      freq: "Q12H",
      indication: "Antibiotic therapy",
    },
    {
      drug: "Furosemide",
      dose: "20 mg",
      route: "IV",
      freq: "BD",
      indication: "Fluid management",
    },
  ]
}

export type ExtractedRxItem = {
  drug: string
  dose: string
  route: string
  freq: string
  instructions: string
  confidence: number
}

export type SampleHandwrittenRx = {
  id: string
  doctorName: string
  dateStr: string
  timeStr: string
  specialty: string
  imageUrl: string
  previewTitle: string
  extractedItems: ExtractedRxItem[]
}

export const SAMPLE_HANDWRITTEN_PRESCRIPTIONS: SampleHandwrittenRx[] = [
  {
    id: "rx-stemi",
    doctorName: "Dr. Shah, MD (Critical Care)",
    dateStr: getPastDateStr(0),
    timeStr: "14:30",
    specialty: "Cardiology & ICU",
    imageUrl:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80",
    previewTitle: "Handwritten Rx — STEMI Post-PCI Protocol",
    extractedItems: [
      {
        drug: "Norepinephrine Drip",
        dose: "0.12 mcg/kg/min",
        route: "IV",
        freq: "Continuous",
        instructions: "Titrate to MAP > 65 mmHg",
        confidence: 98,
      },
      {
        drug: "Heparin Sodium Drip",
        dose: "1,200 units/hr",
        route: "IV",
        freq: "Continuous",
        instructions: "Target aPTT 60-80s",
        confidence: 96,
      },
      {
        drug: "Ticagrelor (Brilinta)",
        dose: "90 mg",
        route: "PO",
        freq: "BD",
        instructions: "Take with water at 09:00, 21:00",
        confidence: 94,
      },
      {
        drug: "Furosemide (Lasix)",
        dose: "40 mg",
        route: "IV",
        freq: "BD",
        instructions: "Give IV push slowly over 2 mins",
        confidence: 95,
      },
    ],
  },
  {
    id: "rx-sepsis",
    doctorName: "Dr. Patel, MD (Infectious Disease)",
    dateStr: getPastDateStr(0),
    timeStr: "11:15",
    specialty: "Critical Care Sepsis Protocol",
    imageUrl:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80",
    previewTitle: "Handwritten Rx — Septic Shock Antimicrobials",
    extractedItems: [
      {
        drug: "Vancomycin",
        dose: "1g",
        route: "IV",
        freq: "Q12H",
        instructions: "Infuse over 120 mins; trough before 4th dose",
        confidence: 97,
      },
      {
        drug: "Pip-Tazo (Zosyn)",
        dose: "3.375g",
        route: "IV",
        freq: "Q6H",
        instructions: "Extended infusion over 4 hours",
        confidence: 95,
      },
      {
        drug: "Hydrocortisone",
        dose: "50 mg",
        route: "IV",
        freq: "Q6H",
        instructions: "IV push for refractory hypotension",
        confidence: 93,
      },
    ],
  },
  {
    id: "rx-stroke",
    doctorName: "Dr. Wong, MD (Neurosurgery)",
    dateStr: getPastDateStr(0),
    timeStr: "09:45",
    specialty: "Neuro ICU Stroke Protocol",
    imageUrl:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80",
    previewTitle: "Handwritten Rx — Acute Stroke & ICP Control",
    extractedItems: [
      {
        drug: "Labetalol Drip",
        dose: "2 mg/min",
        route: "IV",
        freq: "Continuous",
        instructions: "Maintain SBP 120-140 mmHg",
        confidence: 98,
      },
      {
        drug: "Mannitol 20%",
        dose: "100 mL",
        route: "IV",
        freq: "Q6H",
        instructions: "Filter tube; monitor serum osmolality",
        confidence: 92,
      },
      {
        drug: "Atorvastatin",
        dose: "80 mg",
        route: "PO",
        freq: "OD",
        instructions: "Nighttime administration",
        confidence: 96,
      },
    ],
  },
]

/**
 * Generate rich, clinical 10-day ICU flowsheet seed data for Thomas Reed (MRN 100301) or other patients.
 */
export function generateSeedRecord(
  patientId: string,
  dayNumber: number,
  dateStr: string,
  totalDays: number = 10,
): FlowsheetRecord {
  const hours = Array.from(
    { length: 24 },
    (_, i) => `${String((8 + i) % 24).padStart(2, "0")}:00`,
  )
  const twoHourly = hours.filter((_, i) => i % 2 === 0)

  const isEarly = dayNumber <= 3
  const isMid = dayNumber > 3 && dayNumber <= 6

  const baseHr = isEarly
    ? 114 - (dayNumber - 1) * 3
    : isMid
      ? 104 - (dayNumber - 3) * 3
      : 92 - (dayNumber - 6) * 2
  const sysBp = isEarly
    ? 94 + (dayNumber - 1) * 2
    : isMid
      ? 102 + (dayNumber - 3) * 3
      : 118 + (dayNumber - 6) * 2
  const diaBp = Math.round(sysBp * 0.62)
  const tempVal = isEarly
    ? (38.6 - (dayNumber - 1) * 0.2).toFixed(1)
    : (37.4 - (dayNumber - 4) * 0.1).toFixed(1)
  const spo2Val = isEarly ? 91 + (dayNumber - 1) * 2 : isMid ? 96 : 98

  const ventMode =
    isEarly || dayNumber <= 5
      ? "A/C-VC"
      : dayNumber <= 7
        ? "SIMV+PS"
        : "HFNC / Mask"
  const fio2 = isEarly
    ? 60 - (dayNumber - 1) * 5
    : isMid
      ? 45 - (dayNumber - 3) * 5
      : 30
  const peep = isEarly ? 8 : isMid ? 6 : 5
  const tv = isEarly ? 480 : 450

  const gcsEye = isEarly ? 2 : isMid ? 3 : 4
  const gcsVerbal = isEarly ? 1 : isMid ? 3 : 5
  const gcsMotor = isEarly ? 4 : isMid ? 5 : 6
  const rassScore = isEarly
    ? "-3 Moderate sedation"
    : isMid
      ? "-1 Drowsy"
      : "0 Alert and calm"

  const intakeMl = isEarly
    ? 3400 - (dayNumber - 1) * 150
    : isMid
      ? 2800 - (dayNumber - 3) * 200
      : 2100
  const outputMl = isEarly
    ? 1100 + (dayNumber - 1) * 250
    : isMid
      ? 1850 + (dayNumber - 3) * 200
      : 2300
  const netBalance = intakeMl - outputMl

  let cumBalance = 0
  for (let d = 1; d <= dayNumber; d++) {
    const dIntake =
      d <= 3 ? 3400 - (d - 1) * 150 : d <= 6 ? 2800 - (d - 3) * 200 : 2100
    const dOutput =
      d <= 3 ? 1100 + (d - 1) * 250 : d <= 6 ? 1850 + (d - 3) * 200 : 2300
    cumBalance += dIntake - dOutput
  }

  const lactate = isEarly
    ? (4.8 - (dayNumber - 1) * 0.9).toFixed(1)
    : (2.1 - (dayNumber - 3) * 0.3).toFixed(1)
  const wbc = isEarly
    ? (19.2 - (dayNumber - 1) * 1.2).toFixed(1)
    : (14.5 - (dayNumber - 3) * 1.1).toFixed(1)
  const creat = isEarly
    ? (2.4 - (dayNumber - 1) * 0.2).toFixed(1)
    : (1.8 - (dayNumber - 3) * 0.2).toFixed(1)
  const hb = isEarly
    ? (8.4 + (dayNumber - 1) * 0.3).toFixed(1)
    : (9.6 + (dayNumber - 3) * 0.3).toFixed(1)

  const hourlyObs: Record<string, string> = {}
  hours.forEach((h, idx) => {
    const hrVariation = Math.floor(Math.sin(idx) * 4)
    const bpVariation = Math.floor(Math.cos(idx) * 5)
    hourlyObs[`${h}|temp`] = tempVal
    hourlyObs[`${h}|hr`] = String(baseHr + hrVariation)
    hourlyObs[`${h}|pulse`] = String(baseHr + hrVariation)
    hourlyObs[`${h}|bp`] =
      `${sysBp + bpVariation}/${diaBp + Math.floor(bpVariation * 0.6)}`
    hourlyObs[`${h}|map`] = String(
      Math.round(
        (sysBp + bpVariation + 2 * (diaBp + Math.floor(bpVariation * 0.6))) / 3,
      ),
    )
    hourlyObs[`${h}|spo2`] = String(spo2Val)
    hourlyObs[`${h}|vent_mode`] = ventMode
    hourlyObs[`${h}|fio2`] = String(fio2)
    hourlyObs[`${h}|peep`] = String(peep)
    hourlyObs[`${h}|tv`] = String(tv)
    hourlyObs[`${h}|pip`] = String(isEarly ? 32 : 24)
    hourlyObs[`${h}|rr_t`] = String(isEarly ? 18 : 16)
    hourlyObs[`${h}|ph`] = isEarly ? "7.28" : "7.38"
    hourlyObs[`${h}|pco2`] = isEarly ? "46" : "40"
    hourlyObs[`${h}|po2`] = isEarly ? "78" : "92"
    hourlyObs[`${h}|lactate`] = String(lactate)
  })

  const hourlyRass: Record<string, string> = {}
  twoHourly.forEach((h) => {
    hourlyRass[`${h}|score`] = rassScore
  })

  const scaleGcs: Record<string, string> = {}
  hours.forEach((h) => {
    scaleGcs[`${h}|eyes`] =
      gcsEye === 4 ? "Spontaneously" : gcsEye === 3 ? "To speech" : "To pain"
    scaleGcs[`${h}|verbal`] =
      gcsVerbal === 5
        ? "Oriented, Converses"
        : gcsVerbal === 3
          ? "Inappropriate words"
          : "No response"
    scaleGcs[`${h}|motor`] =
      gcsMotor === 6
        ? "Obeys verbal commands"
        : gcsMotor === 5
          ? "Localises pain"
          : "Flexion withdraws, not able to localise pain"
  })

  const hourlyIntake: Record<string, string> = {}
  const hourlyOutput: Record<string, string> = {}
  const hourlyInPerHr = Math.round(intakeMl / 24)
  const hourlyOutPerHr = Math.round(outputMl / 24)
  hours.forEach((h) => {
    hourlyIntake[`${h}|infusions`] = String(Math.round(hourlyInPerHr * 0.5))
    hourlyIntake[`${h}|iv_fluid`] = String(Math.round(hourlyInPerHr * 0.5))
    hourlyIntake[`${h}|total`] = String(hourlyInPerHr)
    hourlyOutput[`${h}|urine_ml_hr`] = String(hourlyOutPerHr)
    hourlyOutput[`${h}|output_total`] = String(hourlyOutPerHr)
    hourlyOutput[`${h}|balance`] = String(hourlyInPerHr - hourlyOutPerHr)
  })

  return {
    patientId,
    date: dateStr,
    fields: {
      "admission.primary_consultant": "Dr. Patel (Cardiology)",
      "admission.icu_consultant": "Dr. Shah (Critical Care)",
      "admission.day_in_icu": String(dayNumber),
      "admission.doa": getPastDateStr(totalDays - 1),
      "admission.dos": getPastDateStr(totalDays - 1),
      "admission.height": "175",
      "admission.weight": "78",
      "admission.blood_group": "O+",
      "admission.diagnosis":
        "STEMI — Anterior wall, s/p PCI to LAD, Cardiogenic shock",
      "admission.allergy": "Penicillin (rash)",
      "admission.procedure": "Emergency PCI with EES stent to Proximal LAD",
      "admission.past_history": "HTN, Type 2 DM, Hyperlipidemia",
      "admission.active_problem":
        dayNumber <= 5
          ? "Cardiogenic Shock, Respiratory Failure"
          : "Weaning vasopressors, Post-PCI monitoring",
      "admission.diet_plan":
        dayNumber <= 6
          ? "NPO / Enteral tube feed 30ml/hr"
          : "Diabetic, Low Salt Soft Diet",
      "balance_24h.intake": String(intakeMl),
      "balance_24h.output": String(outputMl),
      "balance_24h.uo": String(Math.round(outputMl * 0.85)),
      "balance_24h.drain": "150",
      "balance_24h.balance": String(netBalance),
      "balance_24h.cumulative_balance": String(cumBalance),
      "pressure_ulcer.stage": "Stage 1",
      "pressure_ulcer.site": "Sacrum",
      "handover.m_initials": "RN Murphy",
      "handover.e_initials": "RN Davis",
      "handover.n_initials": "RN Jenkins",
    },
    tables: {
      day_plan: [
        {
          time: "08:00",
          shift: "Day",
          order: "Titrate Norepinephrine to maintain MAP > 65 mmHg",
          dr_sign: "Dr. Shah",
          nurse_sign: "RN Murphy",
        },
        {
          time: "10:00",
          shift: "Day",
          order: "Check ABG post-ventilator adjustment",
          dr_sign: "Dr. Shah",
          nurse_sign: "RN Murphy",
        },
        {
          time: "14:00",
          shift: "Day",
          order:
            dayNumber > 6
              ? "Trial on HFNC 40L 35%"
              : "Daily sedation vacation and GCS assessment",
          dr_sign: "Dr. Patel",
          nurse_sign: "RN Murphy",
        },
        {
          time: "20:00",
          shift: "Night",
          order: "Repeat Troponin I and Lactic Acid",
          dr_sign: "Dr. Shah",
          nurse_sign: "RN Jenkins",
        },
      ],
      drug_chart: [
        {
          drug: "Norepinephrine Drip",
          dose: isEarly ? "0.12 mcg/kg/min" : "0.04 mcg/kg/min",
          route: "IV",
          freq: "Continuous",
          times: "08:00-08:00",
          nurse_sign: "RN Murphy",
        },
        {
          drug: "Heparin Sodium Drip",
          dose: "1,200 units/hr",
          route: "IV",
          freq: "Continuous",
          times: "08:00-08:00",
          nurse_sign: "RN Murphy",
        },
        {
          drug: "Aspirin",
          dose: "81 mg",
          route: "PO/NG",
          freq: "OD",
          times: "09:00",
          nurse_sign: "RN Murphy",
        },
        {
          drug: "Ticagrelor",
          dose: "90 mg",
          route: "PO/NG",
          freq: "BD",
          times: "09:00, 21:00",
          nurse_sign: "RN Murphy",
        },
        {
          drug: "Atorvastatin",
          dose: "80 mg",
          route: "PO",
          freq: "OD",
          times: "21:00",
          nurse_sign: "RN Jenkins",
        },
        {
          drug: "Furosemide",
          dose: "40 mg",
          route: "IV",
          freq: "BD",
          times: "08:00, 20:00",
          nurse_sign: "RN Murphy",
        },
      ],
      labs: [
        {
          date: dateStr,
          time: "06:00",
          hb,
          tlc: wbc,
          platelet: "210",
          urea: "45",
          creatinine: creat,
          na: "138",
          k: "4.2",
          cl: "102",
          bili: "0.9",
        },
      ],
      antibiotics: [
        {
          present: "Cefepime 2g IV Q8H",
          day: String(dayNumber),
          previous: "Pip-Tazo",
          start_date: getPastDateStr(totalDays - 1),
          stop_date: "",
        },
      ],
    },
    grids: {},
    hourly: {
      observations: hourlyObs,
      rass: hourlyRass,
      intake: hourlyIntake,
      output: hourlyOutput,
    },
    scales: {
      gcs: scaleGcs,
    },
    updatedAt: new Date().toISOString(),
  }
}

/** Seed multi-day ICU flow chart records into localStorage for a patient if not already seeded */
export function ensureMultiDaySeedData(
  patientId: string = "100301",
  totalDays: number = 10,
): void {
  try {
    const stayDays = getPatientStayDays(totalDays)
    stayDays.forEach(({ dayNumber, dateStr }) => {
      const key = storageKey(patientId, dateStr)
      const existing = localStorage.getItem(key)
      if (!existing) {
        const record = generateSeedRecord(
          patientId,
          dayNumber,
          dateStr,
          totalDays,
        )
        localStorage.setItem(key, JSON.stringify(record))
      }
    })
  } catch (err) {
    console.warn("Failed to seed multi-day ICU flow chart data:", err)
  }
}
