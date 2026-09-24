import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Btn } from "./shared"
import IcuFlowsheet, {
  flowsheetSummary,
  fetchDays,
  onFlowsheetSync,
  broadcastSave,
  type FlowsheetDay,
  type FlowsheetRecord,
} from "./icu/IcuFlowsheet"
import {
  ensureMultiDaySeedData,
  getPatientStayDays,
  generateSeedRecord,
  getCurrentDateTimeFormatted,
  getPatientSuggestedMedications,
  SAMPLE_HANDWRITTEN_PRESCRIPTIONS,
  type ExtractedRxItem,
  type SampleHandwrittenRx,
  type SuggestedMed,
} from "./icu/icuSeedData"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts"

export type IcuPatient = {
  bed: string
  unit: string
  unitType: "MICU" | "SICU" | "CCU" | "NICU" | "PICU" | "Floor 1" | "Floor 2" | "Floor 3" | "ER"
  name: string | null
  mrn: string
  age: number | null
  sex: "M" | "F" | null
  dx: string | null
  provider: string
  nurse: string
  los: string
  totalDays: number
  code: string
  vitals: {
    bp: string
    hr: string
    rr: string
    temp: string
    spo2: string
    cvp: string
  } | null
  vent: {
    mode: string
    fio2: string
    peep: string
    tv: string
    rr: string
    pip: string
  } | null
  infusions: { drug: string ;rate: string ;concentration: string }[]
  alerts: string[]
  score: { sofa: number ;apache: number ;rass: number }
  hrTrend: { t: string ;v: number }[]
  bpTrend: { t: string ;v: number }[]
}

const ALL_BEDS_DATASET: IcuPatient[] = [
  // ── Medical ICU (MICU) ──────────────────────────────────────────────────
  {
    bed: "MICU-1",
    unit: "Medical ICU",
    unitType: "MICU",
    name: "Thomas Reed",
    mrn: "100301",
    age: 68,
    sex: "M",
    dx: "STEMI — Anterior wall, s/p PCI to LAD",
    provider: "Dr. Shah",
    nurse: "RN Murphy",
    los: "10d 4h",
    totalDays: 10,
    code: "Full Code",
    vitals: {
      bp: "98/62",
      hr: "112",
      rr: "22",
      temp: "38.6°C",
      spo2: "91%",
      cvp: "12",
    },
    vent: {
      mode: "A/C-VC",
      fio2: "60%",
      peep: "8",
      tv: "480mL",
      rr: "18",
      pip: "32",
    },
    infusions: [
      {
        drug: "Norepinephrine",
        rate: "0.12 mcg/kg/min",
        concentration: "8mg/250mL",
      },
      {
        drug: "Heparin Drip",
        rate: "1,200 u/hr",
        concentration: "25,000u/250mL",
      },
      { drug: "Propofol", rate: "20 mcg/kg/min", concentration: "10mg/mL" },
    ],
    alerts: [
      "⚠ BP trending down — 3 readings < 100 systolic",
      "🧪 Troponin rising — peak 18.4 ng/mL",
    ],
    score: { sofa: 9, apache: 22, rass: -2 },
    hrTrend: [
      { t: "07", v: 104 },
      { t: "08", v: 108 },
      { t: "09", v: 112 },
      { t: "10", v: 118 },
      { t: "11", v: 112 },
    ],
    bpTrend: [
      { t: "07", v: 105 },
      { t: "08", v: 100 },
      { t: "09", v: 98 },
      { t: "10", v: 96 },
      { t: "11", v: 98 },
    ],
  },
  {
    bed: "MICU-2",
    unit: "Medical ICU",
    unitType: "MICU",
    name: "Ann Martinez",
    mrn: "100088",
    age: 52,
    sex: "F",
    dx: "Septic shock — Klebsiella pneumonia",
    provider: "Dr. Shah",
    nurse: "RN Davis",
    los: "8d 12h",
    totalDays: 8,
    code: "Full Code",
    vitals: {
      bp: "104/68",
      hr: "98",
      rr: "20",
      temp: "38.2°C",
      spo2: "94%",
      cvp: "9",
    },
    vent: {
      mode: "A/C-VC",
      fio2: "45%",
      peep: "6",
      tv: "420mL",
      rr: "16",
      pip: "28",
    },
    infusions: [
      {
        drug: "Norepinephrine",
        rate: "0.06 mcg/kg/min",
        concentration: "8mg/250mL",
      },
      { drug: "Vancomycin", rate: "1g Q12H", concentration: "1g/200mL" },
      { drug: "Pip-Tazo", rate: "3.375g Q6H", concentration: "3.375g/100mL" },
    ],
    alerts: ["✓ Improving: BP stable > 6h", "🧪 Blood culture pending 36h"],
    score: { sofa: 7, apache: 18, rass: -1 },
    hrTrend: [
      { t: "07", v: 118 },
      { t: "08", v: 112 },
      { t: "09", v: 108 },
      { t: "10", v: 102 },
      { t: "11", v: 98 },
    ],
    bpTrend: [
      { t: "07", v: 88 },
      { t: "08", v: 92 },
      { t: "09", v: 98 },
      { t: "10", v: 102 },
      { t: "11", v: 104 },
    ],
  },
  {
    bed: "MICU-3",
    unit: "Medical ICU",
    unitType: "MICU",
    name: "James Liu",
    mrn: "100412",
    age: 61,
    sex: "M",
    dx: "Post-cardiac arrest monitoring, s/p TTM",
    provider: "Dr. Patel",
    nurse: "RN Jenkins",
    los: "4d 6h",
    totalDays: 4,
    code: "Full Code",
    vitals: {
      bp: "118/72",
      hr: "78",
      rr: "16",
      temp: "36.8°C",
      spo2: "97%",
      cvp: "8",
    },
    vent: {
      mode: "SIMV+PS",
      fio2: "35%",
      peep: "5",
      tv: "450mL",
      rr: "14",
      pip: "22",
    },
    infusions: [
      { drug: "Propofol", rate: "15 mcg/kg/min", concentration: "10mg/mL" },
    ],
    alerts: ["✓ EEG stable, no subclinical seizures"],
    score: { sofa: 5, apache: 14, rass: -1 },
    hrTrend: [
      { t: "07", v: 82 },
      { t: "08", v: 80 },
      { t: "09", v: 78 },
      { t: "10", v: 76 },
      { t: "11", v: 78 },
    ],
    bpTrend: [
      { t: "07", v: 115 },
      { t: "08", v: 118 },
      { t: "09", v: 120 },
      { t: "10", v: 118 },
      { t: "11", v: 118 },
    ],
  },
  {
    bed: "MICU-4",
    unit: "Medical ICU",
    unitType: "MICU",
    name: "Elena Park",
    mrn: "100518",
    age: 44,
    sex: "F",
    dx: "Severe DKA — pH 7.15, Anion Gap 24",
    provider: "Dr. Shah",
    nurse: "RN Murphy",
    los: "3d 2h",
    totalDays: 3,
    code: "Full Code",
    vitals: {
      bp: "112/70",
      hr: "92",
      rr: "18",
      temp: "37.1°C",
      spo2: "99%",
      cvp: "7",
    },
    vent: {
      mode: "Nasal Cannula",
      fio2: "21%",
      peep: "0",
      tv: "—",
      rr: "18",
      pip: "—",
    },
    infusions: [
      {
        drug: "Insulin Drip",
        rate: "0.05 u/kg/hr",
        concentration: "100u/100mL",
      },
      {
        drug: "D5 1/2 NS + 20 KCl",
        rate: "150 mL/hr",
        concentration: "1000mL",
      },
    ],
    alerts: ["✓ Anion gap closed to 10", "🧪 Potassium 4.5 mEq/L"],
    score: { sofa: 3, apache: 10, rass: 0 },
    hrTrend: [
      { t: "07", v: 102 },
      { t: "08", v: 98 },
      { t: "09", v: 95 },
      { t: "10", v: 92 },
      { t: "11", v: 92 },
    ],
    bpTrend: [
      { t: "07", v: 108 },
      { t: "08", v: 110 },
      { t: "09", v: 112 },
      { t: "10", v: 112 },
      { t: "11", v: 112 },
    ],
  },
  {
    bed: "MICU-5",
    unit: "Medical ICU",
    unitType: "MICU",
    name: null,
    mrn: "",
    age: null,
    sex: null,
    dx: null,
    provider: "",
    nurse: "",
    los: "",
    totalDays: 0,
    code: "",
    vitals: null,
    vent: null,
    infusions: [],
    alerts: [],
    score: { sofa: 0, apache: 0, rass: 0 },
    hrTrend: [],
    bpTrend: [],
  },
  {
    bed: "MICU-6",
    unit: "Medical ICU",
    unitType: "MICU",
    name: null,
    mrn: "",
    age: null,
    sex: null,
    dx: null,
    provider: "",
    nurse: "",
    los: "",
    totalDays: 0,
    code: "",
    vitals: null,
    vent: null,
    infusions: [],
    alerts: [],
    score: { sofa: 0, apache: 0, rass: 0 },
    hrTrend: [],
    bpTrend: [],
  },

  // ── Surgical ICU (SICU) ─────────────────────────────────────────────────
  {
    bed: "SICU-1",
    unit: "Surgical ICU",
    unitType: "SICU",
    name: "Robert Taylor",
    mrn: "200105",
    age: 71,
    sex: "M",
    dx: "Post-op CABG x 3 (LIMA-LAD, SVG-RCA, SVG-OM)",
    provider: "Dr. Vance (Cardiothoracic)",
    nurse: "RN O'Connor",
    los: "5d 8h",
    totalDays: 5,
    code: "Full Code",
    vitals: {
      bp: "110/64",
      hr: "84",
      rr: "16",
      temp: "37.3°C",
      spo2: "96%",
      cvp: "10",
    },
    vent: {
      mode: "CPAP/PS",
      fio2: "35%",
      peep: "5",
      tv: "420mL",
      rr: "14",
      pip: "18",
    },
    infusions: [
      {
        drug: "Nitroglycerin Drip",
        rate: "10 mcg/min",
        concentration: "50mg/250mL",
      },
    ],
    alerts: ["✓ Chest tube output < 30mL/hr", "⚠ Pacing wires in situ"],
    score: { sofa: 6, apache: 16, rass: 0 },
    hrTrend: [
      { t: "07", v: 90 },
      { t: "08", v: 88 },
      { t: "09", v: 86 },
      { t: "10", v: 84 },
      { t: "11", v: 84 },
    ],
    bpTrend: [
      { t: "07", v: 105 },
      { t: "08", v: 108 },
      { t: "09", v: 110 },
      { t: "10", v: 110 },
      { t: "11", v: 110 },
    ],
  },
  {
    bed: "SICU-2",
    unit: "Surgical ICU",
    unitType: "SICU",
    name: "Maria Garcia",
    mrn: "200220",
    age: 59,
    sex: "F",
    dx: "Exploratory Laparotomy s/p Perforated Diverticulitis",
    provider: "Dr. Vance",
    nurse: "RN O'Connor",
    los: "3d 14h",
    totalDays: 3,
    code: "Full Code",
    vitals: {
      bp: "116/74",
      hr: "90",
      rr: "18",
      temp: "37.8°C",
      spo2: "95%",
      cvp: "8",
    },
    vent: { mode: "HFNC", fio2: "40%", peep: "0", tv: "—", rr: "18", pip: "—" },
    infusions: [
      { drug: "Hydromorphone PCA", rate: "0.2 mg/hr", concentration: "1mg/mL" },
    ],
    alerts: ["✓ Abdominal drain output serosanguinous"],
    score: { sofa: 5, apache: 12, rass: 0 },
    hrTrend: [
      { t: "07", v: 94 },
      { t: "08", v: 92 },
      { t: "09", v: 90 },
      { t: "10", v: 90 },
      { t: "11", v: 90 },
    ],
    bpTrend: [
      { t: "07", v: 112 },
      { t: "08", v: 114 },
      { t: "09", v: 116 },
      { t: "10", v: 116 },
      { t: "11", v: 116 },
    ],
  },
  {
    bed: "SICU-3",
    unit: "Surgical ICU",
    unitType: "SICU",
    name: null,
    mrn: "",
    age: null,
    sex: null,
    dx: null,
    provider: "",
    nurse: "",
    los: "",
    totalDays: 0,
    code: "",
    vitals: null,
    vent: null,
    infusions: [],
    alerts: [],
    score: { sofa: 0, apache: 0, rass: 0 },
    hrTrend: [],
    bpTrend: [],
  },

  // ── Cardiac ICU (CCU) ───────────────────────────────────────────────────
  {
    bed: "CCU-1",
    unit: "Cardiac ICU",
    unitType: "CCU",
    name: "Sarah Jenkins",
    mrn: "300101",
    age: 64,
    sex: "F",
    dx: "Acute Cardiogenic Shock s/p IABP placement",
    provider: "Dr. Patel (Cardiology)",
    nurse: "RN Miller",
    los: "6d 10h",
    totalDays: 6,
    code: "Full Code",
    vitals: {
      bp: "102/64",
      hr: "106",
      rr: "20",
      temp: "37.4°C",
      spo2: "93%",
      cvp: "14",
    },
    vent: {
      mode: "A/C-VC",
      fio2: "50%",
      peep: "8",
      tv: "440mL",
      rr: "18",
      pip: "30",
    },
    infusions: [
      {
        drug: "Dobutamine Drip",
        rate: "5 mcg/kg/min",
        concentration: "250mg/250mL",
      },
      {
        drug: "Norepinephrine",
        rate: "0.08 mcg/kg/min",
        concentration: "8mg/250mL",
      },
    ],
    alerts: ["⚠ IABP 1:1 augmentation active", "🧪 Cardiac Index 2.1 L/min/m²"],
    score: { sofa: 8, apache: 20, rass: -2 },
    hrTrend: [
      { t: "07", v: 112 },
      { t: "08", v: 110 },
      { t: "09", v: 106 },
      { t: "10", v: 106 },
      { t: "11", v: 106 },
    ],
    bpTrend: [
      { t: "07", v: 98 },
      { t: "08", v: 100 },
      { t: "09", v: 102 },
      { t: "10", v: 102 },
      { t: "11", v: 102 },
    ],
  },
  {
    bed: "CCU-2",
    unit: "Cardiac ICU",
    unitType: "CCU",
    name: null,
    mrn: "",
    age: null,
    sex: null,
    dx: null,
    provider: "",
    nurse: "",
    los: "",
    totalDays: 0,
    code: "",
    vitals: null,
    vent: null,
    infusions: [],
    alerts: [],
    score: { sofa: 0, apache: 0, rass: 0 },
    hrTrend: [],
    bpTrend: [],
  },

  // ── Neuro ICU (NICU) ────────────────────────────────────────────────────
  {
    bed: "NICU-1",
    unit: "Neuro ICU",
    unitType: "NICU",
    name: "Charles Adams",
    mrn: "400101",
    age: 67,
    sex: "M",
    dx: "Acute Basilar Artery Stroke s/p Mechanical Thrombectomy",
    provider: "Dr. Wong (Neurosurgery)",
    nurse: "RN Harris",
    los: "7d 4h",
    totalDays: 7,
    code: "Full Code",
    vitals: {
      bp: "138/82",
      hr: "76",
      rr: "16",
      temp: "36.9°C",
      spo2: "98%",
      cvp: "8",
    },
    vent: {
      mode: "Nasal Cannula",
      fio2: "28%",
      peep: "0",
      tv: "—",
      rr: "16",
      pip: "—",
    },
    infusions: [
      {
        drug: "Labetalol Drip",
        rate: "2 mg/min",
        concentration: "200mg/200mL",
      },
    ],
    alerts: ["✓ EVD closed, ICP 11 mmHg", "🧠 NIHSS improved to 4"],
    score: { sofa: 4, apache: 13, rass: 0 },
    hrTrend: [
      { t: "07", v: 78 },
      { t: "08", v: 76 },
      { t: "09", v: 76 },
      { t: "10", v: 76 },
      { t: "11", v: 76 },
    ],
    bpTrend: [
      { t: "07", v: 142 },
      { t: "08", v: 140 },
      { t: "09", v: 138 },
      { t: "10", v: 138 },
      { t: "11", v: 138 },
    ],
  },
  {
    bed: "NICU-2",
    unit: "Neuro ICU",
    unitType: "NICU",
    name: null,
    mrn: "",
    age: null,
    sex: null,
    dx: null,
    provider: "",
    nurse: "",
    los: "",
    totalDays: 0,
    code: "",
    vitals: null,
    vent: null,
    infusions: [],
    alerts: [],
    score: { sofa: 0, apache: 0, rass: 0 },
    hrTrend: [],
    bpTrend: [],
  },

  // ── Pediatric ICU (PICU) ────────────────────────────────────────────────
  {
    bed: "PICU-1",
    unit: "Pediatric ICU",
    unitType: "PICU",
    name: "Baby Emma Davis",
    mrn: "500101",
    age: 2,
    sex: "F",
    dx: "RSV Bronchiolitis with Severe Respiratory Distress",
    provider: "Dr. Lin (Pediatric ICU)",
    nurse: "RN Taylor",
    los: "4d 18h",
    totalDays: 4,
    code: "Full Code",
    vitals: {
      bp: "90/55",
      hr: "128",
      rr: "36",
      temp: "38.1°C",
      spo2: "96%",
      cvp: "6",
    },
    vent: {
      mode: "Pediatric HFNC",
      fio2: "35%",
      peep: "0",
      tv: "—",
      rr: "36",
      pip: "—",
    },
    infusions: [
      { drug: "D5 1/4 NS", rate: "25 mL/hr", concentration: "500mL" },
    ],
    alerts: ["✓ Work of breathing improved"],
    score: { sofa: 2, apache: 8, rass: 0 },
    hrTrend: [
      { t: "07", v: 135 },
      { t: "08", v: 130 },
      { t: "09", v: 128 },
      { t: "10", v: 128 },
      { t: "11", v: 128 },
    ],
    bpTrend: [
      { t: "07", v: 88 },
      { t: "08", v: 90 },
      { t: "09", v: 90 },
      { t: "10", v: 90 },
      { t: "11", v: 90 },
    ],
  },

  // ── Floor 1 Ward (General Ward) ──────────────────────────────────────────
  {
    bed: "F1-101",
    unit: "Floor 1 Ward",
    unitType: "Floor 1",
    name: "John Miller",
    mrn: "600101",
    age: 58,
    sex: "M",
    dx: "Cellulitis Right Lower Leg",
    provider: "Dr. Evans",
    nurse: "RN Clark",
    los: "3d 4h",
    totalDays: 3,
    code: "Full Code",
    vitals: {
      bp: "124/78",
      hr: "72",
      rr: "16",
      temp: "36.8°C",
      spo2: "98%",
      cvp: "—",
    },
    vent: null,
    infusions: [
      { drug: "Cefazolin IV", rate: "1g Q8H", concentration: "1g/100mL" },
    ],
    alerts: ["✓ Redness receding"],
    score: { sofa: 1, apache: 5, rass: 0 },
    hrTrend: [
      { t: "07", v: 74 },
      { t: "08", v: 72 },
      { t: "09", v: 72 },
      { t: "10", v: 72 },
      { t: "11", v: 72 },
    ],
    bpTrend: [
      { t: "07", v: 122 },
      { t: "08", v: 124 },
      { t: "09", v: 124 },
      { t: "10", v: 124 },
      { t: "11", v: 124 },
    ],
  },

  // ── Floor 2 Ward (Special Ward) ──────────────────────────────────────────
  {
    bed: "F2-201",
    unit: "Floor 2 Ward",
    unitType: "Floor 2",
    name: "William Brown",
    mrn: "700101",
    age: 66,
    sex: "M",
    dx: "Elective Total Knee Arthroplasty (TKA)",
    provider: "Dr. Ortho",
    nurse: "RN White",
    los: "2d 10h",
    totalDays: 2,
    code: "Full Code",
    vitals: {
      bp: "128/80",
      hr: "76",
      rr: "16",
      temp: "36.7°C",
      spo2: "98%",
      cvp: "—",
    },
    vent: null,
    infusions: [{ drug: "Ancef", rate: "1g Q8H", concentration: "1g/100mL" }],
    alerts: ["✓ PT ambulating 50 feet"],
    score: { sofa: 1, apache: 4, rass: 0 },
    hrTrend: [
      { t: "07", v: 78 },
      { t: "08", v: 76 },
      { t: "09", v: 76 },
      { t: "10", v: 76 },
      { t: "11", v: 76 },
    ],
    bpTrend: [
      { t: "07", v: 126 },
      { t: "08", v: 128 },
      { t: "09", v: 128 },
      { t: "10", v: 128 },
      { t: "11", v: 128 },
    ],
  },

  // ── Floor 3 Ward (Deluxe Ward) ───────────────────────────────────────────
  {
    bed: "F3-301",
    unit: "Floor 3 Ward",
    unitType: "Floor 3",
    name: "Patricia Davis",
    mrn: "800101",
    age: 50,
    sex: "F",
    dx: "Laparoscopic Cholecystectomy",
    provider: "Dr. Vance",
    nurse: "RN Lee",
    los: "1d 8h",
    totalDays: 1,
    code: "Full Code",
    vitals: {
      bp: "118/74",
      hr: "70",
      rr: "14",
      temp: "36.6°C",
      spo2: "99%",
      cvp: "—",
    },
    vent: null,
    infusions: [],
    alerts: ["✓ Tolerating regular diet"],
    score: { sofa: 0, apache: 3, rass: 0 },
    hrTrend: [
      { t: "07", v: 72 },
      { t: "08", v: 70 },
      { t: "09", v: 70 },
      { t: "10", v: 70 },
      { t: "11", v: 70 },
    ],
    bpTrend: [
      { t: "07", v: 116 },
      { t: "08", v: 118 },
      { t: "09", v: 118 },
      { t: "10", v: 118 },
      { t: "11", v: 118 },
    ],
  },

  // ── Emergency Room (ER) ──────────────────────────────────────────────────
  {
    bed: "ER-1",
    unit: "Emergency Room",
    unitType: "ER",
    name: "Michael Clark",
    mrn: "900101",
    age: 39,
    sex: "M",
    dx: "Polytrauma — MVC, Closed Femur Fracture",
    provider: "Dr. ER Chief",
    nurse: "RN Trauma",
    los: "0d 6h",
    totalDays: 1,
    code: "Full Code",
    vitals: {
      bp: "108/66",
      hr: "104",
      rr: "22",
      temp: "37.2°C",
      spo2: "95%",
      cvp: "—",
    },
    vent: {
      mode: "Non-rebreather Mask",
      fio2: "100%",
      peep: "0",
      tv: "—",
      rr: "22",
      pip: "—",
    },
    infusions: [
      { drug: "Normal Saline Bolus", rate: "1000 mL", concentration: "1000mL" },
    ],
    alerts: ["⚠ Pending OR for ORIF Femur"],
    score: { sofa: 5, apache: 12, rass: 0 },
    hrTrend: [
      { t: "07", v: 110 },
      { t: "08", v: 106 },
      { t: "09", v: 104 },
      { t: "10", v: 104 },
      { t: "11", v: 104 },
    ],
    bpTrend: [
      { t: "07", v: 102 },
      { t: "08", v: 106 },
      { t: "09", v: 108 },
      { t: "10", v: 108 },
      { t: "11", v: 108 },
    ],
  },
]

function PharmacyOrderModal({
  patient,
  isOpen,
  onClose,
  onOrderSubmitted,
}: {
  patient: IcuPatient
  isOpen: boolean
  onClose: () => void
  onOrderSubmitted: (order: {
    drug: string
    dose: string
    route: string
    freq: string
    urgency: string
    notes: string
  }) => void
}) {
  const { dateStr, timeStr } = getCurrentDateTimeFormatted()
  const [selectedRx, setSelectedRx] = useState<SampleHandwrittenRx>(
    SAMPLE_HANDWRITTEN_PRESCRIPTIONS[0],
  )
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [extractedItems, setExtractedItems] =
    useState<ExtractedRxItem[] | null>(null)
  const [showManualFallback, setShowManualFallback] = useState(false)

  // Single manual order fallback state
  const [manualDrug, setManualDrug] = useState("")
  const [manualDose, setManualDose] = useState("")
  const [manualRoute, setManualRoute] = useState("IV")
  const [manualFreq, setManualFreq] = useState("Continuous")

  const suggestedMeds = useMemo(
    () => getPatientSuggestedMedications(patient.dx),
    [patient.dx],
  )

  if (!isOpen) return null

  const handleRunOcrScan = () => {
    setIsScanning(true)
    setExtractedItems(null)
    setTimeout(() => {
      setIsScanning(false)
      setExtractedItems(selectedRx.extractedItems)
    }, 1000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFileName(file.name)
      // Auto-trigger OCR extraction on upload
      setIsScanning(true)
      setExtractedItems(null)
      setTimeout(() => {
        setIsScanning(false)
        setExtractedItems(selectedRx.extractedItems)
      }, 1100)
    }
  }

  const handleItemChange = (
    idx: number,
    field: keyof ExtractedRxItem,
    val: string | number,
  ) => {
    if (!extractedItems) return
    const updated = [...extractedItems]
    updated[idx] = { ...updated[idx], [field]: val }
    setExtractedItems(updated)
  }

  const handleRemoveItem = (idx: number) => {
    if (!extractedItems) return
    setExtractedItems(extractedItems.filter((_, i) => i !== idx))
  }

  const handleAddBlankItem = () => {
    const newItem: ExtractedRxItem = {
      drug: "New Prescribed Drug",
      dose: "100 mg",
      route: "PO",
      freq: "OD",
      instructions: "Take after food",
      confidence: 99,
    }
    setExtractedItems(extractedItems ? [...extractedItems, newItem] : [newItem])
  }

  const handleSubmitOcrBulk = () => {
    if (!extractedItems || extractedItems.length === 0) return
    extractedItems.forEach((item) => {
      onOrderSubmitted({
        drug: item.drug,
        dose: item.dose,
        route: item.route,
        freq: item.freq,
        urgency: "STAT",
        notes: `Digitized via Keppler OCR from ${selectedRx.doctorName} handwritten prescription sheet (${dateStr} ${timeStr}). ${item.instructions}`,
      })
    })
    onClose()
  }

  const handleManualSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualDrug) return
    onOrderSubmitted({
      drug: manualDrug,
      dose: manualDose || "Standard",
      route: manualRoute,
      freq: manualFreq,
      urgency: "STAT",
      notes: `Single order submitted manually by ${patient.provider || "Doctor"}.`,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#CBD5E1] shadow-2xl w-full max-w-3xl overflow-hidden rounded-none">
        {/* Header */}
        <div className="bg-[#1B4FD8] text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[18px]">📄</span>
              <h3 className="text-[16px] font-bold tracking-tight">
                Prescription Upload & AI Digitization Portal
              </h3>
              <span className="bg-[#DCFCE7] text-[#15803D] text-[10px] font-extrabold px-2 py-0.5 rounded-none">
                OCR ACTIVE
              </span>
            </div>
            <p className="text-[11.5px] text-blue-100 mt-0.5">
              Upload doctor&apos;s handwritten prescription sheet containing
              multiple medications for automatic digitization & pharmacy
              dispatch.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-blue-200 font-bold text-[20px] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Patient Info Bar */}
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-2.5 flex items-center justify-between text-[11.5px] text-[#334155]">
          <div>
            Patient:{" "}
            <strong className="text-[#0F172A]">
              {patient.name || "Bed Occupant"}
            </strong>{" "}
            ({patient.bed} · MRN{" "}
            <span className="font-mono">{patient.mrn}</span>)
            <span className="ml-2 text-[#64748B]">
              · Diagnosis: {patient.dx || "ICU Care"}
            </span>
          </div>
          <div className="font-mono text-[#1E3A8A]">
            Auto-Timestamp: <strong>{dateStr}</strong> at{" "}
            <strong>{timeStr}</strong>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[82vh] space-y-4">
          {/* Main Upload Box */}
          <div className="border-2 border-dashed border-[#1B4FD8]/40 bg-[#F0F5FF] p-6 text-center space-y-3">
            <div className="text-[14px] font-bold text-[#1E3A8A]">
              📷 Upload Doctor&apos;s Paper Prescription Sheet (PNG, JPG, PDF)
            </div>
            <p className="text-[12px] text-[#475569] max-w-lg mx-auto">
              Upload or capture a photo of the doctor&apos;s handwritten paper
              prescription sheet. Keppler AI OCR will read all prescribed
              medications simultaneously into structured orders.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 pt-2">
              <label className="bg-[#1B4FD8] hover:bg-[#1541B0] text-white px-6 py-2.5 text-[13px] font-bold shadow-md cursor-pointer transition-colors inline-flex items-center gap-2">
                <span>📁 Upload / Capture Prescription Photo</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {uploadedFileName ? (
                <span className="text-[12px] font-mono bg-white text-[#15803D] border border-[#BBF7D0] px-3 py-1 font-bold">
                  ✓ {uploadedFileName}
                </span>
              ) : (
                <span className="text-[11px] text-[#64748B]">
                  Supported formats: JPG, PNG, WEBP, PDF
                </span>
              )}
            </div>

            <div className="pt-2 flex justify-center">
              <Btn
                variant="primary"
                size="sm"
                onClick={handleRunOcrScan}
                disabled={isScanning}
              >
                {isScanning
                  ? "Processing Document AI OCR…"
                  : "⚡ Digitize Uploaded Prescription Sheet"}
              </Btn>
            </div>
          </div>

          {/* OCR Processing Overlay */}
          {isScanning && (
            <div className="p-6 bg-[#EFF6FF] border border-[#BFDBFE] text-center space-y-2">
              <div className="inline-block w-6 h-6 border-2 border-[#1B4FD8] border-t-transparent animate-spin" />
              <div className="font-bold text-[#1E3A8A] text-[13px]">
                Keppler AI OCR & Medical Text Summarizer Active
              </div>
              <div className="text-[11.5px] text-[#475569]">
                Reading doctor handwriting, deciphering multi-medication names,
                dosages, routes, and clinical instructions...
              </div>
            </div>
          )}

          {/* Extracted Multiple Medications Table */}
          {extractedItems && !isScanning && (
            <div className="border border-[#BBF7D0] bg-[#F0FDF4] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#BBF7D0] pb-2.5">
                <div>
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 mr-2">
                    DIGITIZED PRESCRIPTION SHEET
                  </span>
                  <strong className="text-[#0F172A] text-[13px]">
                    {selectedRx.doctorName}
                  </strong>
                  <span className="text-[#64748B] text-[11.5px] ml-2 font-mono">
                    ({selectedRx.specialty})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#15803D] font-bold block">
                    ✓ {extractedItems.length} Multiple Medications Extracted
                  </span>
                  <span className="text-[10px] text-[#64748B]">
                    Verify and edit details before dispatching
                  </span>
                </div>
              </div>

              {/* Table of extracted multiple medications */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11.5px] border-collapse bg-white shadow-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC]">
                      <th className="border border-[#CBD5E1] px-2.5 py-1.5 text-left font-bold text-[#475569]">
                        Medication Name
                      </th>
                      <th className="border border-[#CBD5E1] px-2.5 py-1.5 text-left font-bold text-[#475569]">
                        Dose
                      </th>
                      <th className="border border-[#CBD5E1] px-2.5 py-1.5 text-left font-bold text-[#475569]">
                        Route
                      </th>
                      <th className="border border-[#CBD5E1] px-2.5 py-1.5 text-left font-bold text-[#475569]">
                        Frequency
                      </th>
                      <th className="border border-[#CBD5E1] px-2.5 py-1.5 text-left font-bold text-[#475569]">
                        Special Instructions
                      </th>
                      <th className="border border-[#CBD5E1] px-2.5 py-1.5 text-center font-bold text-[#475569]">
                        AI Confidence
                      </th>
                      <th className="border border-[#CBD5E1] px-1.5 py-1.5 text-center font-bold text-[#475569]">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-[#CBD5E1] hover:bg-[#F8FAFC]"
                      >
                        <td className="border border-[#CBD5E1] p-1">
                          <input
                            type="text"
                            value={item.drug}
                            onChange={(e) =>
                              handleItemChange(idx, "drug", e.target.value)
                            }
                            className="w-full font-bold text-[#0F172A] border-0 outline-none px-1 bg-transparent"
                          />
                        </td>
                        <td className="border border-[#CBD5E1] p-1 font-mono">
                          <input
                            type="text"
                            value={item.dose}
                            onChange={(e) =>
                              handleItemChange(idx, "dose", e.target.value)
                            }
                            className="w-full border-0 outline-none px-1 bg-transparent"
                          />
                        </td>
                        <td className="border border-[#CBD5E1] p-1 font-mono">
                          <select
                            value={item.route}
                            onChange={(e) =>
                              handleItemChange(idx, "route", e.target.value)
                            }
                            className="w-full border-0 outline-none px-1 bg-transparent"
                          >
                            <option value="IV">IV</option>
                            <option value="PO">PO</option>
                            <option value="SC">SC</option>
                            <option value="IM">IM</option>
                            <option value="Neb">Neb</option>
                            <option value="NG/RT">NG/RT</option>
                          </select>
                        </td>
                        <td className="border border-[#CBD5E1] p-1 font-mono">
                          <select
                            value={item.freq}
                            onChange={(e) =>
                              handleItemChange(idx, "freq", e.target.value)
                            }
                            className="w-full border-0 outline-none px-1 bg-transparent"
                          >
                            <option value="Continuous">Continuous</option>
                            <option value="STAT">STAT</option>
                            <option value="OD">OD</option>
                            <option value="BD">BD</option>
                            <option value="Q8H">Q8H</option>
                            <option value="Q6H">Q6H</option>
                            <option value="Q12H">Q12H</option>
                          </select>
                        </td>
                        <td className="border border-[#CBD5E1] p-1 text-[#475569]">
                          <input
                            type="text"
                            value={item.instructions}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "instructions",
                                e.target.value,
                              )
                            }
                            className="w-full border-0 outline-none px-1 bg-transparent text-[11px]"
                          />
                        </td>
                        <td className="border border-[#CBD5E1] p-1 text-center">
                          <span className="bg-[#DCFCE7] text-[#15803D] font-mono text-[10.5px] font-bold px-1.5 py-0.5">
                            {item.confidence}% 🟢
                          </span>
                        </td>
                        <td className="border border-[#CBD5E1] p-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-[#B91C1C] hover:text-red-800 font-bold text-[12px] px-1"
                            title="Remove drug"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddBlankItem}
                  className="text-[11.5px] font-bold text-[#1B4FD8] hover:underline cursor-pointer"
                >
                  + Add another drug to this prescription sheet
                </button>

                <div className="flex items-center gap-2">
                  <Btn variant="outline" size="sm" onClick={onClose}>
                    Cancel
                  </Btn>
                  <Btn
                    variant="primary"
                    size="sm"
                    onClick={handleSubmitOcrBulk}
                  >
                    🚀 Approve & Dispatch All {extractedItems.length}{" "}
                    Medications to Pharmacy
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* Secondary Collapsible: Single Order Fallback */}
          <div className="pt-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setShowManualFallback(!showManualFallback)}
              className="text-[11px] font-bold text-[#64748B] hover:text-[#0F172A] cursor-pointer flex items-center gap-1"
            >
              <span>
                {showManualFallback
                  ? "▼ Hide"
                  : "▶ Need to order a single custom medication manually without paper upload?"}
              </span>
            </button>

            {showManualFallback && (
              <form
                onSubmit={handleManualSubmitSingle}
                className="mt-3 p-3 bg-[#F8FAFC] border border-[#CBD5E1] text-[12px] space-y-3"
              >
                <div className="text-[11px] font-bold text-[#475569] uppercase">
                  Single Custom Drug Order
                </div>

                {/* Doctor suggested pills */}
                <div>
                  <span className="text-[10.5px] text-[#64748B] block mb-1">
                    Click diagnosis suggested medication:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {suggestedMeds.map((m) => (
                      <button
                        key={m.drug}
                        type="button"
                        onClick={() => {
                          setManualDrug(m.drug)
                          setManualDose(m.dose)
                          setManualRoute(m.route)
                          setManualFreq(m.freq)
                        }}
                        className="px-2 py-0.5 bg-white border border-[#CBD5E1] hover:border-[#1B4FD8] text-[10.5px] font-medium"
                      >
                        {m.drug} ({m.dose})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="Drug Name"
                    value={manualDrug}
                    onChange={(e) => setManualDrug(e.target.value)}
                    className="border border-[#CBD5E1] px-2 py-1 bg-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Dose"
                    value={manualDose}
                    onChange={(e) => setManualDose(e.target.value)}
                    className="border border-[#CBD5E1] px-2 py-1 bg-white font-mono"
                    required
                  />
                  <select
                    value={manualRoute}
                    onChange={(e) => setManualRoute(e.target.value)}
                    className="border border-[#CBD5E1] px-2 py-1 bg-white"
                  >
                    <option value="IV">IV</option>
                    <option value="PO">PO</option>
                    <option value="SC">SC</option>
                    <option value="IM">IM</option>
                  </select>
                  <select
                    value={manualFreq}
                    onChange={(e) => setManualFreq(e.target.value)}
                    className="border border-[#CBD5E1] px-2 py-1 bg-white"
                  >
                    <option value="Continuous">Continuous</option>
                    <option value="STAT">STAT</option>
                    <option value="OD">OD</option>
                    <option value="BD">BD</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Btn variant="primary" size="sm" type="submit">
                    Submit Single Order
                  </Btn>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniTrend({
  data,
  color,
  unit,
}: {
  data: { t: string ;v: number }[]
  color: string
  unit?: string
}) {
  const id = `grad-${color.replace("#", "")}`
  const values = data.map((d) => d.v)
  // Pad the domain so a flat-ish trend still reads as a line rather than a
  // stripe glued to the top of the panel.
  const pad = Math.max(
    2,
    Math.round((Math.max(...values) - Math.min(...values)) * 0.4),
  )
  return (
    <ResponsiveContainer width="100%" height={128}>
      <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#EDF1F7" vertical={false} />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[Math.min(...values) - pad, Math.max(...values) + pad]}
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip
          contentStyle={{
            fontSize: 11,
            padding: "4px 8px",
            border: "1px solid #E2E8F0",
            borderRadius: 0,
          }}
          formatter={(v) => [`${v}${unit ? ` ${unit}` : ""}`, ""]}
          labelFormatter={(l) => `${l}:00`}
        />
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
          dot={{ r: 2.5, fill: color }}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Flat, square panel used across the redesigned ICU overview. */
function Panel({
  title,
  actions,
  children,
  className,
  accent,
}: {
  title: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  accent?: string
}) {
  return (
    <section
      className={`bg-white border border-[#E2E8F0] shadow-sm flex flex-col ${className ?? ""}`}
    >
      <header className="px-4 py-2.5 border-b border-[#EDF1F7] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {accent && (
            <span
              className="w-1 h-4 flex-shrink-0"
              style={{ backgroundColor: accent }}
            />
          )}
          <h3 className="text-[12.5px] font-bold text-[#1E293B] tracking-tight truncate">
            {title}
          </h3>
        </div>
        {actions}
      </header>
      <div className="p-4 flex-1">{children}</div>
    </section>
  )
}

/** Single vital reading, colour-coded against its normal range. */
function Vital({
  label,
  value,
  unit,
  state,
}: {
  label: string
  value: string
  unit?: string
  state: "ok" | "warn" | "crit"
}) {
  const tone =
    state === "crit"
      ? {
          text: "text-[#B91C1C]",
          bg: "bg-[#FEF2F2]",
          border: "border-[#FECACA]",
        }
      : state === "warn"
        ? {
            text: "text-[#B45309]",
            bg: "bg-[#FFFBEB]",
            border: "border-[#FDE68A]",
          }
        : { text: "text-[#0F172A]", bg: "bg-white", border: "border-[#E2E8F0]" }
  return (
    <div className={`border ${tone.border} ${tone.bg} px-3 py-2.5`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span
          className={`font-mono text-[19px] font-extrabold leading-none ${tone.text}`}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[10.5px] text-[#94A3B8] font-medium">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

const num = (s: string) => parseFloat(String(s).replace(/[^\d.-]/g, ""))

// Bed colour is clinical, not decorative: the census strip is read at a glance
// from across the unit, so acuity drives the colour and an empty bed reads as
// capacity rather than as another patient.
const ACUITY = {
  critical: {
    label: "Critical",
    color: "#DC2626",
    tint: "#FEF2F2",
    border: "#FECACA",
  },
  watch: {
    label: "Watch",
    color: "#D97706",
    tint: "#FFFBEB",
    border: "#FDE68A",
  },
  stable: {
    label: "Stable",
    color: "#16A34A",
    tint: "#F0FDF4",
    border: "#BBF7D0",
  },
  empty: {
    label: "Available",
    color: "#64748B",
    tint: "#F8FAFC",
    border: "#CBD5E1",
  },
} as const

function acuityOf(p: {
  name?: string | null
  vitals?: { spo2: string ;hr: string } | null
}) {
  if (!p.name || !p.vitals) return ACUITY.empty
  const spo2 = num(p.vitals.spo2)
  const hr = num(p.vitals.hr)
  if (spo2 < 93 || hr > 110) return ACUITY.critical
  if (spo2 < 96 || hr > 100) return ACUITY.watch
  return ACUITY.stable
}

function MultiDayFlowchartMatrix({
  patientId,
  patientName,
  totalDays = 10,
  onSelectDate,
}: {
  patientId: string
  patientName: string
  totalDays?: number
  onSelectDate: (dateStr: string) => void
}) {
  const stayDays = useMemo(() => getPatientStayDays(totalDays), [totalDays])

  const records = useMemo(() => {
    return stayDays.map((sd) => {
      let rec: FlowsheetRecord
      try {
        const raw = localStorage.getItem(
          `icu.flowsheet.${patientId}.${sd.dateStr}`,
        )
        if (raw) rec = JSON.parse(raw)
        else
          rec = generateSeedRecord(
            patientId,
            sd.dayNumber,
            sd.dateStr,
            totalDays,
          )
      } catch {
        rec = generateSeedRecord(patientId, sd.dayNumber, sd.dateStr, totalDays)
      }
      const summary = flowsheetSummary(patientId, sd.dateStr)
      return { sd, rec, summary }
    })
  }, [patientId, stayDays, totalDays])

  return (
    <Panel
      title={`Complete Day-by-Day Flow Chart History & Parameters (${totalDays}-Day ICU Stay)`}
      accent="#1B4FD8"
      className="col-span-full"
      actions={
        <span className="text-[11px] font-semibold text-[#1B4FD8] bg-[#EFF6FF] px-2 py-0.5 border border-[#BFDBFE]">
          {records.length} Days Recorded
        </span>
      }
    >
      <div className="text-[11.5px] text-[#64748B] mb-3">
        Detailed day-by-day clinical parameters, hemodynamics, ventilation
        settings, neurological scores, 24-hr fluid balances, and labs for{" "}
        {patientName}&apos;s complete stay. Click any day to open or update its
        full chart.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px] border-collapse min-w-[920px]">
          <thead>
            <tr className="bg-[#F8FAFC]">
              <th className="border border-[#E2E8F0] px-2.5 py-1.5 text-left font-bold text-[#334155] uppercase text-[10px] tracking-wide">
                Stay Day
              </th>
              <th className="border border-[#E2E8F0] px-2.5 py-1.5 text-left font-bold text-[#334155] uppercase text-[10px] tracking-wide">
                Hemodynamics
              </th>
              <th className="border border-[#E2E8F0] px-2.5 py-1.5 text-left font-bold text-[#334155] uppercase text-[10px] tracking-wide">
                Ventilator
              </th>
              <th className="border border-[#E2E8F0] px-2.5 py-1.5 text-left font-bold text-[#334155] uppercase text-[10px] tracking-wide">
                GCS / RASS
              </th>
              <th className="border border-[#E2E8F0] px-2.5 py-1.5 text-left font-bold text-[#334155] uppercase text-[10px] tracking-wide">
                24h Fluid Balance
              </th>
              <th className="border border-[#E2E8F0] px-2.5 py-1.5 text-left font-bold text-[#334155] uppercase text-[10px] tracking-wide">
                Cum. Balance
              </th>
              <th className="border border-[#E2E8F0] px-2.5 py-1.5 text-left font-bold text-[#334155] uppercase text-[10px] tracking-wide">
                Key Labs
              </th>
              <th className="border border-[#E2E8F0] px-2.5 py-1.5 text-left font-bold text-[#334155] uppercase text-[10px] tracking-wide">
                Entries
              </th>
              <th className="border border-[#E2E8F0] px-2.5 py-1.5 text-center font-bold text-[#334155] uppercase text-[10px] tracking-wide">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map(({ sd, rec, summary }) => {
              const hr = rec.hourly.observations?.[`12:00|hr`] || "104"
              const bp = rec.hourly.observations?.[`12:00|bp`] || "110/70"
              const temp = rec.hourly.observations?.[`12:00|temp`] || "37.5"
              const ventMode =
                rec.hourly.observations?.[`12:00|vent_mode`] || "A/C-VC"
              const fio2 = rec.hourly.observations?.[`12:00|fio2`] || "45"
              const peep = rec.hourly.observations?.[`12:00|peep`] || "6"
              const rass =
                rec.hourly.rass?.[`12:00|score`] || "0 Alert and calm"
              const gcsTotal = rec.scales.gcs?.[`12:00|eyes`] ? "14" : "12"
              const intake = rec.fields["balance_24h.intake"] || "2800"
              const output = rec.fields["balance_24h.output"] || "1850"
              const netBal = Number(
                rec.fields["balance_24h.balance"] ||
                  Number(intake) - Number(output),
              )
              const cumBal = Number(
                rec.fields["balance_24h.cumulative_balance"] || netBal,
              )
              const creat = rec.tables.labs?.[0]?.creatinine || "1.8"
              const hb = rec.tables.labs?.[0]?.hb || "9.6"

              return (
                <tr
                  key={sd.dateStr}
                  className={`border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors ${
                    sd.isToday ? "bg-[#EFF6FF]" : ""
                  }`}
                >
                  <td className="border border-[#E2E8F0] px-2.5 py-2 whitespace-nowrap">
                    <div className="font-mono font-bold text-[#0F172A] flex items-center gap-1.5">
                      <span>Day {sd.dayNumber}</span>
                      {sd.isToday && (
                        <span className="text-[9px] bg-[#1B4FD8] text-white px-1 font-sans font-bold">
                          TODAY
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#64748B] font-mono">
                      {sd.dateStr}
                    </div>
                  </td>
                  <td className="border border-[#E2E8F0] px-2.5 py-2 font-mono">
                    <div className="font-semibold text-[#0F172A]">
                      HR {hr} bpm · {bp}
                    </div>
                    <div className="text-[10.5px] text-[#64748B]">
                      Temp {temp}°C
                    </div>
                  </td>
                  <td className="border border-[#E2E8F0] px-2.5 py-2 font-mono">
                    <div className="font-semibold text-[#0369A1]">
                      {ventMode}
                    </div>
                    <div className="text-[10.5px] text-[#64748B]">
                      FiO₂ {fio2}% · PEEP {peep}
                    </div>
                  </td>
                  <td className="border border-[#E2E8F0] px-2.5 py-2 font-mono">
                    <div className="font-semibold text-[#7C3AED]">
                      GCS {gcsTotal}
                    </div>
                    <div className="text-[10.5px] text-[#64748B] truncate max-w-[130px]">
                      {rass}
                    </div>
                  </td>
                  <td className="border border-[#E2E8F0] px-2.5 py-2 font-mono">
                    <div className="text-[#64748B]">
                      In {intake}ml · Out {output}ml
                    </div>
                    <div
                      className={`font-bold ${
                        netBal >= 0 ? "text-[#059669]" : "text-[#DC2626]"
                      }`}
                    >
                      Net {netBal >= 0 ? `+${netBal}` : netBal} ml
                    </div>
                  </td>
                  <td className="border border-[#E2E8F0] px-2.5 py-2 font-mono font-bold text-[#0F172A]">
                    {cumBal >= 0 ? `+${cumBal}` : cumBal} ml
                  </td>
                  <td className="border border-[#E2E8F0] px-2.5 py-2 font-mono">
                    <div>Hb {hb} g/dL</div>
                    <div className="text-[#64748B]">Cr {creat} mg/dL</div>
                  </td>
                  <td className="border border-[#E2E8F0] px-2.5 py-2 whitespace-nowrap">
                    <div className="font-mono font-bold text-[#1B4FD8]">
                      {summary.total} entries
                    </div>
                    <div className="w-16 h-1.5 bg-[#EDF1F7] mt-1 overflow-hidden">
                      <div
                        className="h-full bg-[#1B4FD8]"
                        style={{
                          width: `${Math.min(100, Math.max(10, (summary.total / 120) * 100))}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="border border-[#E2E8F0] px-2.5 py-2 text-center whitespace-nowrap">
                    <Btn
                      variant="primary"
                      size="xs"
                      onClick={() => onSelectDate(sd.dateStr)}
                    >
                      Edit / View Chart
                    </Btn>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export default function ICU() {
  const [selectedBedIndex, setSelectedBedIndex] = useState(0)
  const [selectedUnit, setSelectedUnit] = useState<string>("All")
  const [selectedStatus, setSelectedStatus] = useState<string>("All")
  const [selectedFlowsheetDate, setSelectedFlowsheetDate] = useState<string>("")
  const [view, setView] = useState<"overview" | "flowsheet">("overview")
  const [showPharmacyModal, setShowPharmacyModal] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const filteredBeds = useMemo(() => {
    return ALL_BEDS_DATASET.filter((b) => {
      if (selectedUnit !== "All" && b.unitType !== selectedUnit) return false
      const a = acuityOf(b)
      if (selectedStatus === "Occupied" && !b.name) return false
      if (selectedStatus === "Available" && b.name) return false
      if (selectedStatus === "Critical" && a.label !== "Critical") return false
      if (selectedStatus === "Watch" && a.label !== "Watch") return false
      if (selectedStatus === "Stable" && a.label !== "Stable") return false
      return true
    })
  }, [selectedUnit, selectedStatus])

  const pt = ALL_BEDS_DATASET[selectedBedIndex] || ALL_BEDS_DATASET[0]
  const today = new Date().toISOString().slice(0, 10)

  // Seed multi-day data for active patient
  useEffect(() => {
    if (pt.mrn) {
      ensureMultiDaySeedData(pt.mrn, pt.totalDays || 10)
    }
  }, [pt.mrn, pt.totalDays])

  // Charting progress for today
  const [chartTick, setChartTick] = useState(0)
  const summary = useMemo(
    () => flowsheetSummary(pt.mrn || "100301", today),
    [pt.mrn, today, chartTick],
  )

  // Day-wise history comes from the clinical record
  const [history, setHistory] = useState<FlowsheetDay[]>([])
  const refreshHistory = useCallback(() => {
    if (!pt.mrn) return
    fetchDays(pt.mrn)
      .then((d) => setHistory(d.slice(0, 6)))
      .catch(() => setHistory([]))
  }, [pt.mrn])
  useEffect(refreshHistory, [refreshHistory, chartTick])
  useEffect(
    () =>
      onFlowsheetSync(() => {
        refreshHistory()
        setChartTick((n) => n + 1)
      }),
    [refreshHistory],
  )

  const spo2 = pt.vitals ? num(pt.vitals.spo2) : 98
  const hr = pt.vitals ? num(pt.vitals.hr) : 75
  const temp = pt.vitals ? num(pt.vitals.temp) : 37.0
  const sys = pt.vitals ? num(pt.vitals.bp.split("/")[0]) : 120

  const handlePharmacyOrderSubmitted = (order: {
    drug: string
    dose: string
    route: string
    freq: string
    urgency: string
    notes: string
  }) => {
    const { dateStr, timeStr } = getCurrentDateTimeFormatted()
    const key = `icu.flowsheet.${pt.mrn}.${dateStr}`
    let rec: FlowsheetRecord
    try {
      const raw = localStorage.getItem(key)
      if (raw) rec = JSON.parse(raw)
      else rec = generateSeedRecord(pt.mrn, 10, dateStr, pt.totalDays || 10)
    } catch {
      rec = generateSeedRecord(pt.mrn, 10, dateStr, pt.totalDays || 10)
    }

    const drugTable = rec.tables.drug_chart ?? []
    drugTable.unshift({
      drug: `${order.drug} (${order.urgency})`,
      dose: order.dose,
      route: order.route,
      freq: order.freq,
      times: timeStr,
      nurse_sign: "PharmD Sent",
    })
    rec.tables.drug_chart = drugTable
    rec.updatedAt = new Date().toISOString()

    localStorage.setItem(key, JSON.stringify(rec))
    broadcastSave(pt.mrn, dateStr)

    if (pt.infusions) {
      pt.infusions.unshift({
        drug: order.drug,
        rate: order.dose,
        concentration: `${order.route} ${order.freq}`,
      })
    }

    setNotification(
      `✓ Pharmacy Order #${Math.floor(1000 + Math.random() * 9000)} for ${order.drug} (${order.dose}) submitted to Pharmacy at ${timeStr}!`,
    )
    setChartTick((t) => t + 1)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F5F7FB]">
      {/* Pharmacy Medication Order Modal */}
      <PharmacyOrderModal
        patient={pt}
        isOpen={showPharmacyModal}
        onClose={() => setShowPharmacyModal(false)}
        onOrderSubmitted={handlePharmacyOrderSubmitted}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="bg-[#15803D] text-white px-6 py-2.5 text-[12px] font-bold flex items-center justify-between shadow-md">
          <span>{notification}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-white hover:text-green-200 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-[#E2E8F0] px-6 py-3 flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
            ICU & Bed Management Portal
          </h1>
          <div className="flex items-center gap-3 mt-1 text-[11.5px]">
            <span className="text-[#64748B]">General Hospital</span>
            <span className="flex items-center gap-1.5 text-[#334155]">
              <span className="w-1.5 h-1.5 bg-[#DC2626]" />{" "}
              {ALL_BEDS_DATASET.filter((b) => b.name).length} occupied
            </span>
            <span className="flex items-center gap-1.5 text-[#334155]">
              <span className="w-1.5 h-1.5 bg-[#16A34A]" />{" "}
              {ALL_BEDS_DATASET.filter((b) => !b.name).length} available
            </span>
            <span className="text-[#94A3B8]">
              {ALL_BEDS_DATASET.length} total beds
            </span>
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          <Btn
            variant={view === "flowsheet" ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              if (view === "flowsheet") setChartTick((t) => t + 1)
              setView(view === "flowsheet" ? "overview" : "flowsheet")
            }}
          >
            {view === "flowsheet" ? "Back to Overview" : "Daily Flowsheet"}
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            onClick={() => setShowPharmacyModal(true)}
          >
            + New Order
          </Btn>
        </div>
      </div>

      {/* ── Unit & Floor Filter Pills Bar ──────────────────────────────── */}
      <div className="flex-shrink-0 bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-2 flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mr-1">
            ICUs & Wards:
          </span>
          {[
            { id: "All", label: "All ICUs & Wards" },
            { id: "MICU", label: "Medical ICU (MICU)" },
            { id: "SICU", label: "Surgical ICU (SICU)" },
            { id: "CCU", label: "Cardiac ICU (CCU)" },
            { id: "NICU", label: "Neuro ICU (NICU)" },
            { id: "PICU", label: "Pediatric ICU (PICU)" },
            { id: "Floor 1", label: "Floor 1 Ward" },
            { id: "Floor 2", label: "Floor 2 Ward" },
            { id: "Floor 3", label: "Floor 3 Ward" },
            { id: "ER", label: "ER Beds" },
          ].map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelectedUnit(u.id)}
              className={`px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                selectedUnit === u.id
                  ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-sm"
                  : "bg-white text-[#475569] border-[#CBD5E1] hover:border-[#1B4FD8]"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-nowrap">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] mr-1">
            Status:
          </span>
          {["All", "Critical", "Watch", "Stable", "Available"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-2 py-0.5 text-[10.5px] font-semibold border transition-all cursor-pointer ${
                selectedStatus === st
                  ? "bg-[#334155] text-white border-[#334155]"
                  : "bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#334155]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Multi-unit & Multi-floor Bed census strip ──────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-[#E2E8F0] px-6 py-2.5 flex items-stretch gap-2 overflow-x-auto">
        {filteredBeds.map((p) => {
          const globalIdx = ALL_BEDS_DATASET.findIndex((b) => b.bed === p.bed)
          const selected = selectedBedIndex === globalIdx
          const a = acuityOf(p)
          const occupied = Boolean(p.name)
          const spo2 = p.vitals ? num(p.vitals.spo2) : null
          const hr = p.vitals ? num(p.vitals.hr) : null
          return (
            <button
              key={p.bed}
              type="button"
              disabled={!occupied}
              onClick={() => occupied && setSelectedBedIndex(globalIdx)}
              className={`relative flex-shrink-0 w-48 text-left border pl-3 pr-2.5 py-2 transition-all ${
                occupied
                  ? "hover:shadow-sm cursor-pointer"
                  : "border-dashed cursor-default opacity-60"
              } ${selected ? "ring-2 ring-offset-0" : ""}`}
              style={{
                backgroundColor: selected
                  ? a.tint
                  : occupied
                    ? "#FFFFFF"
                    : ACUITY.empty.tint,
                borderColor: selected
                  ? a.color
                  : occupied
                    ? a.border
                    : ACUITY.empty.border,
                ...(selected
                  ? { "--tw-ring-color": a.color } as React.CSSProperties
                  : {}),
              }}
            >
              {/* acuity spine */}
              <span
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: occupied ? a.color : "transparent" }}
              />
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B4FD8]">
                  {p.bed} · {p.unitType}
                </span>
                {occupied && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1 py-px"
                    style={{ backgroundColor: a.tint, color: a.color }}
                  >
                    {a.label}
                  </span>
                )}
              </div>
              {occupied ? (
                <>
                  <div className="text-[12px] font-bold text-[#0F172A] truncate mt-0.5">
                    {p.name}
                  </div>
                  <div className="text-[10.5px] text-[#64748B] truncate">
                    {p.dx}
                  </div>
                  {p.vitals && (
                    <div className="flex gap-2 mt-1 font-mono text-[10.5px]">
                      <span
                        className="font-semibold"
                        style={{
                          color:
                            spo2 !== null && spo2 < 93
                              ? ACUITY.critical.color
                              : spo2 !== null && spo2 < 96
                                ? ACUITY.watch.color
                                : "#15803D",
                        }}
                      >
                        SpO₂ {p.vitals.spo2}
                      </span>
                      <span
                        style={{
                          color:
                            hr !== null && hr > 110
                              ? ACUITY.critical.color
                              : hr !== null && hr > 100
                                ? ACUITY.watch.color
                                : "#64748B",
                        }}
                      >
                        HR {p.vitals.hr}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className="w-1.5 h-1.5"
                    style={{ backgroundColor: "#16A34A" }}
                  />
                  <span className="text-[11px] font-medium text-[#64748B]">
                    Available
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {view === "flowsheet" ? (
        <IcuFlowsheet
          patientId={pt.mrn}
          patientName={pt.name || "Patient"}
          bed={pt.bed}
          initialDate={selectedFlowsheetDate || today}
          totalDays={pt.totalDays || 10}
          onClose={() => {
            setChartTick((t) => t + 1)
            setView("overview")
          }}
        />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {/* ── Patient banner ──────────────────────────────────────────── */}
          <div className="bg-white border border-[#E2E8F0] shadow-sm">
            <div className="px-4 py-3 flex flex-wrap items-start gap-4 border-b border-[#EDF1F7]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
                    {pt.name}
                  </h2>
                  <span className="bg-[#FEE2E2] text-[#B91C1C] text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider">
                    ICU
                  </span>
                  <span className="bg-[#F1F5F9] text-[#475569] text-[10px] font-bold px-1.5 py-0.5">
                    {pt.bed}
                  </span>
                </div>
                <div className="text-[11.5px] text-[#64748B] mt-0.5">
                  {pt.age}y {pt.sex === "M" ? "Male" : "Female"} · MRN {pt.mrn}
                </div>
                <div className="text-[12.5px] font-semibold text-[#1E293B] mt-1">
                  {pt.dx}
                </div>
              </div>
              <div className="ml-auto grid grid-cols-3 sm:grid-cols-6 gap-x-5 gap-y-2">
                {[
                  { l: "LOS", v: pt.los },
                  { l: "Code", v: pt.code },
                  { l: "Provider", v: pt.provider },
                  { l: "Nurse", v: pt.nurse },
                  { l: "SOFA", v: `${pt.score.sofa}/24` },
                  { l: "APACHE II", v: String(pt.score.apache) },
                ].map((x) => (
                  <div key={x.l}>
                    <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      {x.l}
                    </div>
                    <div className="text-[12px] font-semibold text-[#1E293B] mt-0.5">
                      {x.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vitals strip */}
            {pt.vitals && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#EDF1F7]">
                <Vital
                  label="Temp"
                  value={pt.vitals.temp.replace("°C", "")}
                  unit="°C"
                  state={temp >= 38.5 ? "crit" : temp >= 37.8 ? "warn" : "ok"}
                />
                <Vital
                  label="Heart Rate"
                  value={pt.vitals.hr}
                  unit="bpm"
                  state={hr > 110 ? "crit" : hr > 100 ? "warn" : "ok"}
                />
                <Vital
                  label="Blood Pressure"
                  value={pt.vitals.bp}
                  unit="mmHg"
                  state={sys < 100 ? "crit" : sys < 110 ? "warn" : "ok"}
                />
                <Vital
                  label="Resp Rate"
                  value={pt.vitals.rr}
                  unit="/min"
                  state={num(pt.vitals.rr) > 22 ? "warn" : "ok"}
                />
                <Vital
                  label="SpO₂"
                  value={pt.vitals.spo2.replace("%", "")}
                  unit="%"
                  state={spo2 < 92 ? "crit" : spo2 < 95 ? "warn" : "ok"}
                />
                <Vital
                  label="CVP"
                  value={pt.vitals.cvp}
                  unit="mmHg"
                  state="ok"
                />
              </div>
            )}
          </div>

          {/* ── Alerts ──────────────────────────────────────────────────── */}
          {pt.alerts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pt.alerts.map((a, i) => {
                const good = a.startsWith("✓")
                return (
                  <div
                    key={i}
                    className={`border px-3.5 py-2.5 text-[12px] font-medium flex items-start gap-2 ${
                      good
                        ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]"
                        : "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
                    }`}
                  >
                    <span>{a}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Multi-Day Stay Flow Chart History & Parameters Matrix ──── */}
          <MultiDayFlowchartMatrix
            patientId={pt.mrn}
            patientName={pt.name || "Patient"}
            totalDays={pt.totalDays || 10}
            onSelectDate={(d) => {
              setSelectedFlowsheetDate(d)
              setView("flowsheet")
            }}
          />

          {/* ── Main grid ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Daily flow chart — charting status for today */}
            <Panel
              title="Daily Flow Chart"
              accent="#1B4FD8"
              className="lg:col-span-1"
              actions={
                <Btn
                  variant="primary"
                  size="xs"
                  onClick={() => setView("flowsheet")}
                >
                  Open Chart
                </Btn>
              }
            >
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="font-mono text-[24px] font-extrabold text-[#0F172A] leading-none">
                    {summary.total}
                  </div>
                  <div className="text-[10.5px] text-[#64748B] mt-1">
                    entries recorded today
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    Date
                  </div>
                  <div className="font-mono text-[11.5px] font-semibold text-[#334155]">
                    {today}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                {summary.tabs.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className="text-[11.5px] text-[#475569] w-32 truncate">
                      {t.label}
                    </span>
                    <div className="flex-1 h-1.5 bg-[#EDF1F7] overflow-hidden">
                      <div
                        className="h-full bg-[#1B4FD8] transition-all"
                        style={{
                          width: `${Math.min(100, t.count === 0 ? 0 : Math.max(8, (t.count / 40) * 100))}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`font-mono text-[11px] w-7 text-right ${
                        t.count ? "font-bold text-[#1B4FD8]" : "text-[#CBD5E1]"
                      }`}
                    >
                      {t.count}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#EDF1F7]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                  Recent days
                </div>
                {history.length === 0 ? (
                  <div className="text-[11.5px] text-[#94A3B8]">
                    No charts recorded yet.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {history.map((d) => (
                      <button
                        key={d.chart_date}
                        type="button"
                        onClick={() => {
                          setSelectedFlowsheetDate(d.chart_date)
                          setView("flowsheet")
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2 py-1 border text-left transition-colors cursor-pointer ${
                          d.chart_date === today
                            ? "border-[#1B4FD8] bg-[#EFF6FF]"
                            : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#94A3B8]"
                        }`}
                      >
                        <span
                          className={`font-mono text-[10.5px] ${
                            d.chart_date === today
                              ? "text-[#1B4FD8] font-bold"
                              : "text-[#475569]"
                          }`}
                        >
                          {d.chart_date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono text-[10.5px] font-bold text-[#0F172A]">
                            {d.entry_count ?? 0}
                          </span>
                          <span className="text-[9.5px] text-[#94A3B8]">
                            entries
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Panel>

            {/* Trends */}
            <Panel title="Heart Rate — Last 5h" accent="#DC2626">
              <MiniTrend
                data={
                  pt.hrTrend && pt.hrTrend.length > 0
                    ? pt.hrTrend
                    : [{ t: "12", v: 75 }]
                }
                color="#DC2626"
                unit="bpm"
              />
              <div className="flex justify-between mt-2 text-[11px] text-[#64748B] font-mono">
                <span>
                  Min{" "}
                  {Math.min(
                    ...(pt.hrTrend || [{ t: "12", v: 75 }]).map(
                      (d: { t: string ;v: number }) => d.v,
                    ),
                  )}
                </span>
                <span>
                  Max{" "}
                  {Math.max(
                    ...(pt.hrTrend || [{ t: "12", v: 75 }]).map(
                      (d: { t: string ;v: number }) => d.v,
                    ),
                  )}
                </span>
                <span className="font-bold text-[#0F172A]">
                  Now{" "}
                  {pt.hrTrend && pt.hrTrend.length > 0
                    ? pt.hrTrend[pt.hrTrend.length - 1].v
                    : 75}{" "}
                  bpm
                </span>
              </div>
            </Panel>

            <Panel title="Systolic BP — Last 5h" accent="#7C3AED">
              <MiniTrend
                data={
                  pt.bpTrend && pt.bpTrend.length > 0
                    ? pt.bpTrend
                    : [{ t: "12", v: 120 }]
                }
                color="#7C3AED"
                unit="mmHg"
              />
              <div className="flex justify-between mt-2 text-[11px] text-[#64748B] font-mono">
                <span>
                  Min{" "}
                  {Math.min(
                    ...(pt.bpTrend || [{ t: "12", v: 120 }]).map(
                      (d: { t: string ;v: number }) => d.v,
                    ),
                  )}
                </span>
                <span>
                  Max{" "}
                  {Math.max(
                    ...(pt.bpTrend || [{ t: "12", v: 120 }]).map(
                      (d: { t: string ;v: number }) => d.v,
                    ),
                  )}
                </span>
                <span className="font-bold text-[#0F172A]">
                  Now{" "}
                  {pt.bpTrend && pt.bpTrend.length > 0
                    ? pt.bpTrend[pt.bpTrend.length - 1].v
                    : 120}{" "}
                  mmHg
                </span>
              </div>
            </Panel>

            {/* Ventilation */}
            <Panel
              title="Mechanical Ventilation"
              accent="#0EA5E9"
              actions={
                <span className="text-[10.5px] font-semibold text-[#0369A1] bg-[#E0F2FE] px-1.5 py-0.5">
                  {pt.vent ? pt.vent.mode : "Room Air"}
                </span>
              }
            >
              <div className="grid grid-cols-3 gap-px bg-[#EDF1F7] border border-[#EDF1F7]">
                {[
                  { l: "FiO₂", v: pt.vent ? pt.vent.fio2 : "21%" },
                  {
                    l: "PEEP",
                    v: pt.vent ? `${pt.vent.peep} cmH₂O` : "0 cmH₂O",
                  },
                  { l: "Tidal Vol", v: pt.vent ? pt.vent.tv : "—" },
                  { l: "Set RR", v: pt.vent ? `${pt.vent.rr}/min` : "16/min" },
                  { l: "PIP", v: pt.vent ? `${pt.vent.pip} cmH₂O` : "—" },
                  { l: "Mode", v: pt.vent ? pt.vent.mode : "Room Air" },
                ].map((x) => (
                  <div key={x.l} className="bg-white px-2.5 py-2">
                    <div className="text-[9.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
                      {x.l}
                    </div>
                    <div className="font-mono text-[12.5px] font-bold text-[#0F172A] mt-0.5">
                      {x.v}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Sedation */}
            <Panel title="Sedation — RASS" accent="#7C3AED">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 flex items-center justify-center font-mono text-[22px] font-extrabold ${
                    pt.score.rass <= -3 || pt.score.rass >= 2
                      ? "bg-[#FEF3C7] text-[#B45309]"
                      : "bg-[#DCFCE7] text-[#15803D]"
                  }`}
                >
                  {pt.score.rass}
                </div>
                <div className="text-[11.5px] text-[#475569] leading-relaxed">
                  <div className="font-semibold text-[#1E293B]">
                    {pt.score.rass === -1
                      ? "Drowsy"
                      : pt.score.rass === -2
                        ? "Light sedation"
                        : "Sedation level"}
                  </div>
                  <div>
                    Target -1 to -2. Reassess two-hourly on the flow chart.
                  </div>
                </div>
              </div>
            </Panel>

            {/* Intake / Output */}
            <Panel title="Intake / Output — 24h" accent="#0891B2">
              <div className="grid grid-cols-2 gap-4 text-[11.5px]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                    Intake
                  </div>
                  {[
                    ["IV Fluids", "2,840 mL"],
                    ["Medications", "380 mL"],
                    ["Blood Products", "2 units"],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-0.5">
                      <span className="text-[#64748B]">{l}</span>
                      <span className="font-mono font-semibold text-[#1E293B]">
                        {v}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1.5 mt-1 border-t border-[#EDF1F7] font-bold">
                    <span className="text-[#334155]">Total In</span>
                    <span className="font-mono text-[#0F172A]">3,220 mL</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                    Output
                  </div>
                  {[
                    ["Urine", "880 mL"],
                    ["NG Tube", "120 mL"],
                    ["Drains", "—"],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-0.5">
                      <span className="text-[#64748B]">{l}</span>
                      <span className="font-mono font-semibold text-[#1E293B]">
                        {v}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1.5 mt-1 border-t border-[#EDF1F7] font-bold">
                    <span className="text-[#334155]">Total Out</span>
                    <span className="font-mono text-[#0F172A]">1,000 mL</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 px-3 py-2 bg-[#FFFBEB] border border-[#FDE68A] text-[12px] font-bold text-[#92400E] text-center">
                Net Balance +2,220 mL
              </div>
            </Panel>

            {/* Infusions */}
            <Panel
              title="Active Infusions"
              accent="#DB2777"
              actions={
                <Btn variant="outline" size="xs">
                  + Add Drip
                </Btn>
              }
            >
              <div className="space-y-2">
                {pt.infusions.map((inf, i) => (
                  <div
                    key={i}
                    className="border border-[#E2E8F0] px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-[#0F172A] truncate">
                        {inf.drug}
                      </div>
                      <div className="text-[10.5px] text-[#94A3B8] font-mono truncate">
                        {inf.concentration}
                      </div>
                    </div>
                    <div className="font-mono text-[11.5px] font-semibold text-[#1B4FD8] whitespace-nowrap">
                      {inf.rate}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Labs */}
            <Panel
              title="Critical Labs"
              accent="#D97706"
              actions={
                <Btn variant="outline" size="xs">
                  + Order
                </Btn>
              }
            >
              <div className="divide-y divide-[#EDF1F7]">
                {[
                  ["Troponin I", "18.4 ng/mL", "10:02", true],
                  ["Lactic Acid", "4.2 mmol/L", "09:45", true],
                  ["WBC", "18.4 K/μL", "09:10", true],
                  ["Creatinine", "2.1 mg/dL", "09:10", true],
                  ["Hemoglobin", "8.2 g/dL", "09:10", false],
                  ["pH (ABG)", "7.28", "08:55", true],
                ].map(([l, v, t, abn]) => (
                  <div
                    key={String(l)}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-[11.5px] text-[#475569]">{l}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[11.5px] font-bold ${
                          abn ? "text-[#DC2626]" : "text-[#1E293B]"
                        }`}
                      >
                        {v}
                      </span>
                      <span className="font-mono text-[10px] text-[#94A3B8] w-9 text-right">
                        {t}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Consults */}
            <Panel title="Consults & Teams" accent="#059669">
              <div className="space-y-2">
                {[
                  {
                    team: "Cardiology",
                    doc: "Dr. Patel",
                    note: "Cath lab post-PCI monitoring",
                    status: "Active",
                  },
                  {
                    team: "Pulm/Critical Care",
                    doc: "Dr. Shah",
                    note: "Primary ICU team",
                    status: "Active",
                  },
                  {
                    team: "Nephrology",
                    doc: "Dr. Wong",
                    note: "AKI — creatinine rising",
                    status: "Pending",
                  },
                  {
                    team: "Pharmacy ICU",
                    doc: "PharmD Lee",
                    note: "Vasoactive titration",
                    status: "Active",
                  },
                ].map((c) => (
                  <div
                    key={c.team}
                    className="flex items-start justify-between gap-3 border-b border-[#EDF1F7] pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#1E293B]">
                        {c.team}
                      </div>
                      <div className="text-[10.5px] text-[#64748B] truncate">
                        {c.doc} · {c.note}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap ${
                        c.status === "Active"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : "bg-[#FEF3C7] text-[#B45309]"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}
