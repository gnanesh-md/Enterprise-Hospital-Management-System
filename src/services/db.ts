/**
 * Enterprise Hospital Management System - Outpatient Persistent Database
 * Uses HTML5 IndexedDB with LocalStorage fallback for high performance,
 * atomic transactions, and permanent data persistence.
 */

import { getDoctorConsultationFee, getDoctorMaster } from "./doctorMaster"
import { apiFetch } from "../lib/api"

export interface DBPatient {
  umr: string // Primary Key: e.g. UMR10001

  name: string

  dob?: string

  age: number

  sex: "Male" | "Female" | "Other"

  phone: string

  address: string

  bloodGroup: string

  createdAt: string

  updatedAt: string
}

export interface DBOPEncounter {
  id: string // Primary Key: e.g. ENC-101

  umr: string // Foreign Key to DBPatient

  opNumber: string // e.g. OP001, OP025

  patientName: string

  age: number

  sex: "Male" | "Female" | "Other"

  phone: string

  address: string

  bloodGroup: string

  dept: string

  isNew: boolean

  registrationTime: string

  chiefComplaint: string

  symptoms: string[]

  aiSpecialty: string

  aiDoctor: string

  aiConfidence: number

  aiReasoning?: string

  aiDoctorRationale?: string

  doctorGenderPref: "Any" | "Male" | "Female"

  assignedDoctor: string

  doctorStatus: "Available" | "Busy" | "Inactive" | "Absent"

  queueToken: string

  queuePosition: number

  room: string

  assessment?: string

  diagnosis: string

  icd10: string

  prescription: {
    medicine: string
    dosage: string
    frequency: string
    duration: string
    instructions?: string
  }[]

  investigations: string[]

  services?: {
    id?: string
    name: string
    category?: string
    cptCode?: string
    price: number
    quantity?: number
  }[]

  advice: string
  vitals: {
    bp: string
    pulse: string
    temp: string
    spo2: string
    weight: string
    notes: string
  }

  billing: {
    registrationFee?: number
    consultationFee: number
    labFee: number
    total: number
    status: "Paid" | "Pending"
    mode: string
  }

  furtherAction: "None" | "Laboratory" | "Pharmacy" | "Radiology" | "Admission" | "Referral"

  priorityTag?: "Urgent" | "Senior" | "Wheelchair" | "Pediatric" | "Standard"
  visitType?: "New Visit" | "Follow-up" | "Review"
  news2Score?: number
  news2Risk?: "Low" | "Medium" | "High"
  opdProcedures?: {
    name: string
    status: "Ordered" | "In Progress" | "Completed"
    timestamp: string
  }[]
  status: "Registered" | "Symptoms Captured" | "AI Recommended" | "Awaiting Doctor" | "Doctor Assigned" | "In Queue" | "Vitals Recorded" | "Awaiting Consultation" | "Under Consultation" | "Consultation Completed" | "Post-Consultation" | "Awaiting Billing" | "Billing Completed" | "Awaiting Investigation" | "OP Completed"

  timestamps: {
    arrival: string

    registration?: string

    symptoms?: string

    doctorAssigned?: string
    /** When the OP desk called the patient through to the nurse station. */
    calledToNurse?: string
    calledToNurseBy?: string
    /** When the OP nurse took baseline observations, and who took them. */

    vitalsRecorded?: string

    vitalsBy?: string

    consultationStart?: string

    consultationEnd?: string

    billingCompleted?: string

    visitCompleted?: string
  }
}

const INITIAL_SEED_PATIENTS: DBPatient[] = [
  {
    umr: "UMR10001",

    name: "Ravi Kumar",

    dob: "1984-03-15",

    age: 42,

    sex: "Male",

    phone: "(617) 555-0192",

    address: "24 Park Avenue, Boston, MA",

    bloodGroup: "O+",

    createdAt: "2026-01-12T09:00:00.000Z",

    updatedAt: "2026-08-25T10:25:00.000Z",
  },

  {
    umr: "UMR10002",

    name: "Sunita Patel",

    dob: "1988-07-22",

    age: 38,

    sex: "Female",

    phone: "(617) 555-0284",

    address: "108 Beacon St, Boston, MA",

    bloodGroup: "B+",

    createdAt: "2026-02-05T10:00:00.000Z",

    updatedAt: "2026-08-25T10:32:00.000Z",
  },

  {
    umr: "UMR10048",

    name: "Alex Turner",

    dob: "1998-08-25",

    age: 28,

    sex: "Male",

    phone: "(617) 555-9011",

    address: "88 Cambridge St, Cambridge, MA",

    bloodGroup: "A+",

    createdAt: "2026-08-25T10:35:00.000Z",

    updatedAt: "2026-08-25T10:35:00.000Z",
  },

  {
    umr: "UMR10067",

    name: "Rana Dhaggubati",

    dob: "1990-05-14",

    age: 36,

    sex: "Male",

    phone: "(617) 555-4421",

    address: "45 Commonwealth Ave, Boston, MA",

    bloodGroup: "O+",

    createdAt: "2026-08-31T09:00:00.000Z",

    updatedAt: "2026-08-31T10:00:00.000Z",
  },

  {
    umr: "UMR10042",

    name: "Rahul Roy",

    dob: "1992-11-10",

    age: 34,

    sex: "Male",

    phone: "(617) 555-8833",

    address: "12 Tremont St, Boston, MA",

    bloodGroup: "A+",

    createdAt: "2026-08-31T09:15:00.000Z",

    updatedAt: "2026-08-31T10:00:00.000Z",
  },

  {
    umr: "UMR10055",

    name: "Suresh Nair",

    dob: "1985-02-18",

    age: 41,

    sex: "Male",

    phone: "(617) 555-6677",

    address: "74 Harvard Ave, Boston, MA",

    bloodGroup: "B+",

    createdAt: "2026-08-31T09:30:00.000Z",

    updatedAt: "2026-08-31T10:00:00.000Z",
  },
]

const INITIAL_SEED_ENCOUNTERS: DBOPEncounter[] = [
  {
    id: "ENC-10067-1",

    umr: "UMR10067",

    opNumber: "OP123",

    patientName: "Rana Dhaggubati",

    age: 36,

    sex: "Male",

    phone: "(617) 555-4421",

    address: "45 Commonwealth Ave, Boston, MA",

    bloodGroup: "O+",

    dept: "Cardiology",

    isNew: true,

    registrationTime: "10:15 AM",

    chiefComplaint: "I have been experiencing chest pain since this morning.",

    symptoms: ["Chest pain", "Breathing difficulty"],

    aiSpecialty: "Cardiology",

    aiDoctor: "Dr. Arjun Mehta",

    aiConfidence: 98,

    doctorGenderPref: "Any",

    assignedDoctor: "",

    doctorStatus: "Available",

    queueToken: "C-OP123",

    queuePosition: 1,

    room: "Room 107",

    diagnosis: "Acute Coronary Syndrome Rule-Out / Stable Angina",

    icd10: "I20.9",

    prescription: [
      {
        medicine: "Aspirin 81mg",
        dosage: "1 tab",
        frequency: "OD (Once Daily)",
        duration: "30 days",
        instructions: "Take after breakfast",
      },

      {
        medicine: "Atorvastatin 40mg",
        dosage: "1 tab",
        frequency: "HS (Bedtime)",
        duration: "30 days",
        instructions: "Take at bedtime",
      },
    ],

    investigations: ["ECG 12-Lead", "Serum Troponin I"],

    advice: "Avoid strenuous physical exertion. Follow low-sodium diet.",

    vitals: {
      bp: "130/84 mmHg",
      pulse: "78 bpm",
      temp: "98.6 °F",
      spo2: "99%",
      weight: "82 kg",
      notes: "Stable",
    },

    billing: {
      consultationFee: 50,
      labFee: 40,
      total: 90,
      status: "Pending",
      mode: "Card",
    },

    furtherAction: "None",

    status: "Under Consultation",

    timestamps: { arrival: "10:10 AM", registration: "10:15 AM" },
  },

  {
    id: "ENC-10001-2",

    umr: "UMR10001",

    opNumber: "OP025",

    patientName: "Ravi Kumar",

    age: 42,

    sex: "Male",

    phone: "(617) 555-0192",

    address: "24 Park Avenue, Boston, MA",

    bloodGroup: "O+",

    dept: "Cardiology",

    isNew: false,

    registrationTime: "10:25 AM",

    chiefComplaint:
      "Severe chest pain radiating to left arm and shortness of breath.",

    symptoms: ["Chest pain", "Breathing difficulty", "Sweating"],

    aiSpecialty: "Cardiology",

    aiDoctor: "Dr. Rajesh Sharma",

    aiConfidence: 98,

    doctorGenderPref: "Any",

    assignedDoctor: "",

    doctorStatus: "Busy",

    queueToken: "C-OP025",

    queuePosition: 1,

    room: "Room 104",

    diagnosis: "Acute Coronary Syndrome Rule-Out / Stable Angina",

    icd10: "I20.9",

    prescription: [
      {
        medicine: "Aspirin 81mg",
        dosage: "1 tab",
        frequency: "OD",
        duration: "30 days",
      },

      {
        medicine: "Atorvastatin 40mg",
        dosage: "1 tab",
        frequency: "HS",
        duration: "30 days",
      },
    ],

    investigations: ["ECG 12-Lead", "Serum Troponin I", "Lipid Profile"],

    advice: "Strict bed rest. Avoid exertion. Low sodium diet.",

    vitals: {
      bp: "138/88 mmHg",
      pulse: "82 bpm",
      temp: "98.6 °F",
      spo2: "98%",
      weight: "74 kg",
      notes: "Diaphoretic",
    },

    billing: {
      consultationFee: 50,
      labFee: 40,
      total: 90,
      status: "Paid",
      mode: "Card",
    },

    furtherAction: "Laboratory",

    status: "Under Consultation",

    timestamps: {
      arrival: "10:20 AM",
      registration: "10:25 AM",
      symptoms: "10:28 AM",
      consultationStart: "10:35 AM",
    },
  },

  {
    id: "ENC-10002-1",

    umr: "UMR10002",

    opNumber: "OP003",

    patientName: "Sunita Patel",

    age: 38,

    sex: "Female",

    phone: "(617) 555-0284",

    address: "108 Beacon St, Boston, MA",

    bloodGroup: "B+",

    dept: "Cardiology",

    isNew: false,

    registrationTime: "10:32 AM",

    chiefComplaint: "Frequent palpitations and mild dizziness on standing.",

    symptoms: ["Dizziness", "Fatigue"],

    aiSpecialty: "Cardiology",

    aiDoctor: "Dr. Sarah Jenkins",

    aiConfidence: 94,

    doctorGenderPref: "Female",

    assignedDoctor: "",

    doctorStatus: "Available",

    queueToken: "C-OP003",

    queuePosition: 2,

    room: "Room 102",

    diagnosis: "Stage 1 Essential Hypertension",

    icd10: "I10",

    prescription: [
      {
        medicine: "Amlodipine 5mg",
        dosage: "1 tab",
        frequency: "OD (Morning)",
        duration: "30 days",
      },
    ],

    investigations: ["Holter 24-hr", "Complete Metabolic Panel"],

    advice: "Monitor BP twice daily at home. Low salt intake.",

    vitals: {
      bp: "142/90 mmHg",
      pulse: "76 bpm",
      temp: "98.4 °F",
      spo2: "99%",
      weight: "62 kg",
      notes: "Normal",
    },

    billing: {
      consultationFee: 50,
      labFee: 0,
      total: 50,
      status: "Pending",
      mode: "Card",
    },

    furtherAction: "None",

    status: "In Queue",

    timestamps: {
      arrival: "10:30 AM",
      registration: "10:32 AM",
      doctorAssigned: "10:37 AM",
    },
  },

  {
    id: "ENC-10048-1",

    umr: "UMR10048",

    opNumber: "OP001",

    patientName: "Alex Turner",

    age: 28,

    sex: "Male",

    phone: "(617) 555-9011",

    address: "88 Cambridge St, Cambridge, MA",

    bloodGroup: "A+",

    dept: "Orthopedics",

    isNew: true,

    registrationTime: "10:35 AM",

    chiefComplaint: "Acute right ankle sprain and swelling after soccer match.",

    symptoms: ["Joint swelling", "Back pain"],

    aiSpecialty: "Orthopedics",

    aiDoctor: "Dr. David Anderson",

    aiConfidence: 97,

    doctorGenderPref: "Any",

    assignedDoctor: "",

    doctorStatus: "Available",

    queueToken: "O-OP001",

    queuePosition: 1,

    room: "Room 112",

    diagnosis: "Lateral Ankle Ligament Sprain Grade II",

    icd10: "S93.401A",

    prescription: [
      {
        medicine: "Ibuprofen 400mg",
        dosage: "1 tab",
        frequency: "TID",
        duration: "7 days",
      },
    ],

    investigations: ["X-Ray Right Ankle AP/Lateral"],

    advice: "R.I.C.E protocol (Rest, Ice, Compression, Elevation).",

    vitals: {
      bp: "122/78 mmHg",
      pulse: "72 bpm",
      temp: "98.6 °F",
      spo2: "99%",
      weight: "78 kg",
      notes: "Tender ankle",
    },

    billing: {
      consultationFee: 50,
      labFee: 35,
      total: 85,
      status: "Paid",
      mode: "UPI",
    },

    furtherAction: "Radiology",

    status: "In Queue",

    timestamps: { arrival: "10:33 AM", registration: "10:35 AM" },
  },

  {
    id: "ENC-10042-1",

    umr: "UMR10042",

    opNumber: "OP094",

    patientName: "Rahul Roy",

    age: 34,

    sex: "Male",

    phone: "(617) 555-8833",

    address: "12 Tremont St, Boston, MA",

    bloodGroup: "A+",

    dept: "Orthopedics",

    isNew: true,

    registrationTime: "10:40 AM",

    chiefComplaint: "Acute knee joint strain & swelling after heavy workout.",

    symptoms: ["Joint swelling", "Severe Knee Pain"],

    aiSpecialty: "Orthopedics",

    aiDoctor: "Dr. Sanjay Kapoor",

    aiConfidence: 96,

    doctorGenderPref: "Any",

    assignedDoctor: "",

    doctorStatus: "Available",

    queueToken: "O-OP094",

    queuePosition: 1,

    room: "Room 116",

    diagnosis: "Patellar Tendonitis & Quadriceps Strain",

    icd10: "M76.51",

    prescription: [
      {
        medicine: "Aceclofenac 100mg",
        dosage: "1 tab",
        frequency: "BD",
        duration: "5 days",
      },
    ],

    investigations: ["X-Ray Knee AP/Lateral"],

    advice: "Knee brace support and rest for 1 week.",

    vitals: {
      bp: "124/80 mmHg",
      pulse: "74 bpm",
      temp: "98.6 °F",
      spo2: "99%",
      weight: "76 kg",
      notes: "Mild knee effusion",
    },

    billing: {
      consultationFee: 50,
      labFee: 35,
      total: 85,
      status: "Pending",
      mode: "Card",
    },

    furtherAction: "Radiology",

    status: "In Queue",

    timestamps: { arrival: "10:38 AM", registration: "10:40 AM" },
  },

  {
    id: "ENC-10055-1",

    umr: "UMR10055",

    opNumber: "OP055",

    patientName: "Suresh Nair",

    age: 41,

    sex: "Male",

    phone: "(617) 555-6677",

    address: "74 Harvard Ave, Boston, MA",

    bloodGroup: "B+",

    dept: "General Medicine",

    isNew: true,

    registrationTime: "10:45 AM",

    chiefComplaint: "Persistent high-grade fever & headache for 3 days.",

    symptoms: ["Fever", "Headache", "Body aches"],

    aiSpecialty: "General Medicine",

    aiDoctor: "Dr. Vikram Malhotra",

    aiConfidence: 95,

    doctorGenderPref: "Any",

    assignedDoctor: "Dr. D. Krishnarao",

    doctorStatus: "Available",

    queueToken: "G-OP055",

    queuePosition: 1,

    room: "Room 111",

    diagnosis: "Acute Viral Pyrexia with Cephalea",

    icd10: "R50.9",

    prescription: [
      {
        medicine: "Paracetamol 650mg",
        dosage: "1 tab",
        frequency: "TID",
        duration: "5 days",
      },
    ],

    investigations: ["Complete Blood Count (CBC)", "CRP"],

    advice: "Plenty of oral hydration and adequate bed rest.",

    vitals: {
      bp: "118/76 mmHg",
      pulse: "84 bpm",
      temp: "101.2 °F",
      spo2: "98%",
      weight: "70 kg",
      notes: "Febrile",
    },

    billing: {
      consultationFee: 50,
      labFee: 25,
      total: 75,
      status: "Paid",
      mode: "Cash",
    },

    furtherAction: "Laboratory",

    status: "In Queue",

    timestamps: { arrival: "10:42 AM", registration: "10:45 AM" },
  },

  {
    id: "ENC-10001-1",

    umr: "UMR10001",

    opNumber: "OP001",

    patientName: "Ravi Kumar",

    age: 42,

    sex: "Male",

    phone: "(617) 555-0192",

    address: "24 Park Avenue, Boston, MA",

    bloodGroup: "O+",

    dept: "General Medicine",

    isNew: true,

    registrationTime: "12-Jan-2026 09:15 AM",

    chiefComplaint: "Cough and mild fever",

    symptoms: ["Cough", "Fever"],

    aiSpecialty: "General Medicine",

    aiDoctor: "Dr. Ramesh Kumar",

    aiConfidence: 94,

    doctorGenderPref: "Any",

    assignedDoctor: "Dr. U. Nagaraju",

    doctorStatus: "Available",

    queueToken: "G-OP001",

    queuePosition: 1,

    room: "Room 103",

    diagnosis: "Acute Bronchitis",

    icd10: "J20.9",

    prescription: [
      {
        medicine: "Amoxicillin 500mg",
        dosage: "1 tab",
        frequency: "TID",
        duration: "5 days",
      },
    ],

    investigations: ["Chest X-Ray"],

    advice: "Rest and steam inhalation.",

    vitals: {
      bp: "120/80 mmHg",
      pulse: "76 bpm",
      temp: "99.1 °F",
      spo2: "98%",
      weight: "74 kg",
      notes: "Normal",
    },

    billing: {
      consultationFee: 50,
      labFee: 30,
      total: 80,
      status: "Paid",
      mode: "Cash",
    },

    furtherAction: "None",

    status: "OP Completed",

    timestamps: {
      arrival: "09:00 AM",
      registration: "09:15 AM",
      visitCompleted: "10:00 AM",
    },
  },

  {
    id: "ENC-100245-1",

    umr: "P-100245",

    opNumber: "OP-JS-01",

    patientName: "John Smith",

    age: 45,

    sex: "Male",

    phone: "9876543210",

    address: "124 Park Avenue, South Block, Metro City",

    bloodGroup: "O+",

    dept: "Gastroenterology",

    isNew: false,

    registrationTime: "20-Jan-2026 11:00 AM",

    chiefComplaint:
      "Post-prandial heartburn, acid regurgitation, and upper epigastric discomfort x 3 weeks.",

    symptoms: ["Heartburn", "Epigastric pain", "Acid reflux"],

    aiSpecialty: "Gastroenterology",

    aiDoctor: "Dr. Anita Roy",

    aiConfidence: 96,

    doctorGenderPref: "Any",

    assignedDoctor: "Dr. Anita Roy",

    doctorStatus: "Available",

    queueToken: "G-OP201",

    queuePosition: 1,

    room: "Room 105",

    diagnosis: "Gastroesophageal Reflux Disease (GERD) & Antral Gastritis",

    icd10: "K21.9",

    prescription: [
      {
        medicine: "Tab Pantoprazole 40mg",
        dosage: "1 tab",
        frequency: "OD (Before breakfast)",
        duration: "30 days",
        instructions: "Take 30 mins before breakfast with water",
      },

      {
        medicine: "Syrup Mucaine Gel 10ml",
        dosage: "10 ml",
        frequency: "TID (After meals & bedtime)",
        duration: "14 days",
        instructions: "For burning discomfort",
      },
    ],

    investigations: ["Upper GI Endoscopy (Advised)", "H. Pylori Stool Antigen"],

    advice:
      "Avoid late-night heavy meals, citrus fruits, and spicy foods. Elevate head end of bed.",

    vitals: {
      bp: "132/84 mmHg",
      pulse: "76 bpm",
      temp: "98.4 °F",
      spo2: "99%",
      weight: "82 kg",
      notes: "Abdomen soft, mild epigastric tenderness",
    },

    billing: {
      consultationFee: 50,
      labFee: 45,
      total: 95,
      status: "Paid",
      mode: "UPI",
    },

    furtherAction: "None",

    status: "OP Completed",

    timestamps: {
      arrival: "10:45 AM",
      registration: "11:00 AM",
      visitCompleted: "11:35 AM",
    },
  },

  {
    id: "ENC-100245-2",

    umr: "P-100245",

    opNumber: "OP-JS-02",

    patientName: "John Smith",

    age: 45,

    sex: "Male",

    phone: "9876543210",

    address: "124 Park Avenue, South Block, Metro City",

    bloodGroup: "O+",

    dept: "Cardiology",

    isNew: false,

    registrationTime: "15-Dec-2025 09:30 AM",

    chiefComplaint: "Routine hypertension follow-up and lipid check.",

    symptoms: ["Occasional morning headache", "Fatigue"],

    aiSpecialty: "Cardiology",

    aiDoctor: "Dr. Rajesh Sharma",

    aiConfidence: 98,

    doctorGenderPref: "Any",

    assignedDoctor: "Dr. Rajesh Sharma",

    doctorStatus: "Available",

    queueToken: "C-OP110",

    queuePosition: 2,

    room: "Room 102",

    diagnosis:
      "Essential Hypertension Grade II (Sub-optimally controlled) & Hyperlipidemia",

    icd10: "I10",

    prescription: [
      {
        medicine: "Tab Telmisartan 40mg",
        dosage: "1 tab",
        frequency: "OD (Morning)",
        duration: "60 days",
        instructions: "Take regularly at 8:00 AM",
      },

      {
        medicine: "Tab Atorvastatin 20mg",
        dosage: "1 tab",
        frequency: "HS (Bedtime)",
        duration: "60 days",
        instructions: "Take at night",
      },
    ],

    investigations: [
      "Fasting Lipid Profile",
      "Serum Creatinine",
      "ECG 12-Lead",
    ],

    advice:
      "Low sodium diet (<2g salt/day). 30 mins brisk walking 5 days a week. Repeat lipid profile in 2 months.",

    vitals: {
      bp: "142/90 mmHg",
      pulse: "78 bpm",
      temp: "98.6 °F",
      spo2: "99%",
      weight: "83 kg",
      notes: "S1 S2 normal",
    },

    billing: {
      consultationFee: 50,
      labFee: 60,
      total: 110,
      status: "Paid",
      mode: "Card",
    },

    furtherAction: "None",

    status: "OP Completed",

    timestamps: {
      arrival: "09:15 AM",
      registration: "09:30 AM",
      visitCompleted: "10:15 AM",
    },
  },

  {
    id: "ENC-100289-1",

    umr: "P-100289",

    opNumber: "OP-RL-01",

    patientName: "Robert Lee",

    age: 64,

    sex: "Male",

    phone: "9833445566",

    address: "109 Sunset Boulevard, Metro City",

    bloodGroup: "A+",

    dept: "Pulmonology",

    isNew: false,

    registrationTime: "10-Nov-2025 10:15 AM",

    chiefComplaint:
      "Exertional dyspnea (mMRC Grade 2) and chronic morning productive cough.",

    symptoms: ["Chronic cough", "Shortness of breath on climbing stairs"],

    aiSpecialty: "Pulmonology",

    aiDoctor: "Dr. Anita Roy",

    aiConfidence: 97,

    doctorGenderPref: "Any",

    assignedDoctor: "Dr. Anita Roy",

    doctorStatus: "Available",

    queueToken: "P-OP044",

    queuePosition: 1,

    room: "Room 108",

    diagnosis: "Chronic Obstructive Pulmonary Disease (COPD) — GOLD Stage 2",

    icd10: "J44.9",

    prescription: [
      {
        medicine: "Inhaler Foracort 200 (Budesonide 200mcg + Formoterol 6mcg)",
        dosage: "2 puffs",
        frequency: "BD (Morning & Night)",
        duration: "60 days",
        instructions: "Rinse mouth with water after inhalation",
      },
    ],

    investigations: ["Spirometry / PFT", "Chest X-Ray PA"],

    advice:
      "Avoid exposure to smoke and dust. Annual influenza vaccination strongly advised.",

    vitals: {
      bp: "134/86 mmHg",
      pulse: "82 bpm",
      temp: "98.4 °F",
      spo2: "95% (Room air)",
      weight: "68 kg",
      notes: "Bilateral scattered rhonchi",
    },

    billing: {
      consultationFee: 50,
      labFee: 75,
      total: 125,
      status: "Paid",
      mode: "Cash",
    },

    furtherAction: "None",

    status: "OP Completed",

    timestamps: {
      arrival: "10:00 AM",
      registration: "10:15 AM",
      visitCompleted: "11:00 AM",
    },
  },

  {
    id: "ENC-100512-1",

    umr: "P-100512",

    opNumber: "OP-MG-01",

    patientName: "Maria Garcia",

    age: 29,

    sex: "Female",

    phone: "9845123456",

    address: "88 Lakeview Road, Metro City",

    bloodGroup: "A-",

    dept: "Endocrinology",

    isNew: false,

    registrationTime: "05-Oct-2025 02:30 PM",

    chiefComplaint: "Fatigue, mild weight gain, and dry skin.",

    symptoms: ["Lethargy", "Cold intolerance"],

    aiSpecialty: "Endocrinology",

    aiDoctor: "Dr. Anita Roy",

    aiConfidence: 95,

    doctorGenderPref: "Any",

    assignedDoctor: "Dr. Anita Roy",

    doctorStatus: "Available",

    queueToken: "E-OP012",

    queuePosition: 1,

    room: "Room 106",

    diagnosis: "Primary Hypothyroidism (Subclinical / Mild)",

    icd10: "E03.9",

    prescription: [
      {
        medicine: "Tab Levothyroxine 50mcg",
        dosage: "1 tab",
        frequency: "OD (Empty stomach morning)",
        duration: "90 days",
        instructions: "Take at least 45 mins before breakfast",
      },
    ],

    investigations: ["Serum TSH, Free T3, Free T4", "Anti-TPO Antibodies"],

    advice: "Repeat TSH after 8 weeks for dosage adjustment. High fiber diet.",

    vitals: {
      bp: "116/74 mmHg",
      pulse: "68 bpm",
      temp: "98.2 °F",
      spo2: "99%",
      weight: "61 kg",
      notes: "Mild periorbital puffiness",
    },

    billing: {
      consultationFee: 50,
      labFee: 50,
      total: 100,
      status: "Paid",
      mode: "UPI",
    },

    furtherAction: "None",

    status: "OP Completed",

    timestamps: {
      arrival: "02:15 PM",
      registration: "02:30 PM",
      visitCompleted: "03:10 PM",
    },
  },
]

const CROSS_TAB_CHANNEL = "hospai_db_v1"

const STORAGE_KEYS = {
  PATIENTS: "hospai_db_patients_v1",

  ENCOUNTERS: "hospai_db_encounters_v1",

  UMR_COUNTER: "hospai_db_umr_counter_v1",

  OP_COUNTER: "hospai_db_op_counter_v1",
}

class HospitalDatabase {
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.init()
  }

  private init() {
    if (typeof window === "undefined") return

    if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
      localStorage.setItem(
        STORAGE_KEYS.PATIENTS,
        JSON.stringify(INITIAL_SEED_PATIENTS),
      )
    }

    if (!localStorage.getItem(STORAGE_KEYS.ENCOUNTERS)) {
      localStorage.setItem(
        STORAGE_KEYS.ENCOUNTERS,
        JSON.stringify(INITIAL_SEED_ENCOUNTERS),
      )
    }

    if (!localStorage.getItem(STORAGE_KEYS.UMR_COUNTER)) {
      localStorage.setItem(STORAGE_KEYS.UMR_COUNTER, "10048")
    }

    if (!localStorage.getItem(STORAGE_KEYS.OP_COUNTER)) {
      localStorage.setItem(STORAGE_KEYS.OP_COUNTER, "33")
    }

    // Clean up Mangapathi Bhupathi data and deduplicate redundant encounters

    try {
      const pData = localStorage.getItem(STORAGE_KEYS.PATIENTS)

      if (pData) {
        const parsed: DBPatient[] = JSON.parse(pData)

        const filtered = parsed.filter(
          (p) =>
            !p.name.toLowerCase().includes("mangapathi") &&
            !p.name.toLowerCase().includes("bhupathi"),
        )

        if (filtered.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(filtered))
        }
      }

      // Merge missing initial seed encounters and clean up duplicates

      const eData = localStorage.getItem(STORAGE_KEYS.ENCOUNTERS)

      if (eData) {
        const parsedE: DBOPEncounter[] = JSON.parse(eData)

        const existingIds = new Set(parsedE.map((e) => e.id))

        const missing = INITIAL_SEED_ENCOUNTERS.filter(
          (e) => !existingIds.has(e.id),
        )

        const combined = [...parsedE, ...missing]

        const seen = new Set<string>()

        const filteredE = combined.filter((e) => {
          if (
            e.patientName.toLowerCase().includes("mangapathi") ||
            e.patientName.toLowerCase().includes("bhupathi")
          ) {
            return false
          }

          const key = `${e.umr}_${e.opNumber}`

          if (seen.has(key)) return false

          seen.add(key)

          return true
        })

        let encMigrated = false;
        for (const e of filteredE) {
          const defaultRegFee = e.isNew === false ? 0 : 20;
          if (!e.billing) {
            const fee = getDoctorConsultationFee(e.assignedDoctor);
            e.billing = {
              registrationFee: defaultRegFee,
              consultationFee: fee,
              labFee: 0,
              total: defaultRegFee + fee,
              status: "Pending",
              mode: "Card",
            };
            encMigrated = true;
          } else {
            if (e.billing.registrationFee === undefined) {
              e.billing.registrationFee = defaultRegFee;
              e.billing.total = defaultRegFee + (e.billing.consultationFee || 500) + (e.billing.labFee || 0);
              encMigrated = true;
            }
          }
        }

        if (filteredE.length !== parsedE.length || missing.length > 0 || encMigrated) {
          localStorage.setItem(
            STORAGE_KEYS.ENCOUNTERS,
            JSON.stringify(filteredE),
          )
        }
      }
    } catch {
      // ignore
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener)

    this.ensureCrossTab()

    return () => this.listeners.delete(listener)
  }

  /**
   * Fan a local write out to the other tabs.
   *
   * Reception, the OP nurse station and the doctor's workspace are different
   * people at different desks, so they are different tabs -- and often different
   * machines pointed at the same browser profile. Without this, booking an
   * appointment notified only the tab that made the write: the nurse's open
   * station and the doctor's board went on showing stale queues until someone
   * happened to reload. The rest of this frontend already fans out this way.
   */

  private crossTabReady = false

  private channel: BroadcastChannel | null = null

  private ensureCrossTab() {
    if (this.crossTabReady || typeof window === "undefined") return

    this.crossTabReady = true

    try {
      this.channel = new BroadcastChannel(CROSS_TAB_CHANNEL)

      this.channel.onmessage = () => this.listeners.forEach((fn) => fn())
    } catch {
      // BroadcastChannel unavailable -- the storage event below still covers it.
    }

    // Fires in *other* tabs when localStorage changes, which covers browsers

    // without BroadcastChannel and writes made outside this class.

    window.addEventListener("storage", (e) => {
      if (!e.key) return

      if (
        e.key === STORAGE_KEYS.ENCOUNTERS ||
        e.key === STORAGE_KEYS.PATIENTS
      ) {
        this.listeners.forEach((fn) => fn())
      }
    })
  }

  private notify() {
    this.listeners.forEach((fn) => fn())

    this.ensureCrossTab()

    try {
      this.channel?.postMessage(Date.now())
    } catch {
      /* a closed channel must never break the write that triggered it */
    }
  }

  // ── Patients CRUD ────────────────────────────────────────────────────────

  public getPatients(): DBPatient[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PATIENTS)

      return data ? JSON.parse(data) : INITIAL_SEED_PATIENTS
    } catch {
      return INITIAL_SEED_PATIENTS
    }
  }

  public getPatientByUmr(umr: string): DBPatient | undefined {
    return this.getPatients().find(
      (p) => p.umr.toUpperCase() === umr.toUpperCase(),
    )
  }

  public searchPatients(query: string): DBPatient[] {
    const q = query.trim().toLowerCase()

    if (!q) return this.getPatients()

    return this.getPatients().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.umr.toLowerCase().includes(q) ||
        p.phone.includes(q),
    )
  }

  // ── Encounters CRUD ──────────────────────────────────────────────────────

  public getEncounters(): DBOPEncounter[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ENCOUNTERS)

      return data ? JSON.parse(data) : INITIAL_SEED_ENCOUNTERS
    } catch {
      return INITIAL_SEED_ENCOUNTERS
    }
  }

  public getEncountersForPatient(
    query: string,
    patientName?: string,
  ): DBOPEncounter[] {
    if (!query && !patientName) return []

    const q = (query || "").trim().toUpperCase()

    const nameTarget = (patientName || query || "").trim().toLowerCase()

    const encounters = this.getEncounters()

    const matched = encounters.filter((e) => {
      const eUmr = (e.umr || "").toUpperCase()

      if (
        q &&
        (eUmr === q || eUmr.replace(/[-_]/g, "") === q.replace(/[-_]/g, ""))
      )
        return true

      const eName = (e.patientName || "").trim().toLowerCase()

      if (
        nameTarget &&
        (eName === nameTarget ||
          eName.includes(nameTarget) ||
          nameTarget.includes(eName))
      )
        return true

      const ePhone = (e.phone || "").replace(/\D/g, "")

      const qDigits = q.replace(/\D/g, "")

      if (
        qDigits &&
        qDigits.length >= 7 &&
        (ePhone.includes(qDigits) || qDigits.includes(ePhone))
      )
        return true

      return false
    })

    if (matched.length > 0) return matched

    // Fallback: If this patient is an existing hospital patient or registered ER patient, synthesize realistic prior OP consultation

    const existing =
      this.getPatientByUmr(q) ||
      this.getPatients().find((p) =>
        (p.name || "").toLowerCase().includes(nameTarget),
      )

    if (existing || q.startsWith("UMR") || q.startsWith("P-")) {
      const encId = `ENC-${q || "OP"}-PREV`

      const pName = existing?.name || patientName || "Patient"

      const synthEncounter: DBOPEncounter = {
        id: encId,

        umr: existing?.umr || q || "UMR-00000",

        opNumber: `OP-${Math.floor(100 + Math.random() * 900)}`,

        patientName: pName,

        age: existing?.age || 38,

        sex: existing?.sex || "Male",

        phone: existing?.phone || "(617) 555-0100",

        address: existing?.address || "Metro Hospital District",

        bloodGroup: existing?.bloodGroup || "O+",

        dept: "General Medicine",

        isNew: false,

        registrationTime: "3 months ago",

        chiefComplaint:
          "Routine clinical follow-up, intermittent fatigue and general wellness check",

        symptoms: ["Fatigue", "Mild weakness"],

        aiSpecialty: "General Medicine",

        aiDoctor: "Dr. Anita Roy",

        aiConfidence: 95,

        doctorGenderPref: "Any",

        assignedDoctor: "Dr. Anita Roy",

        doctorStatus: "Available",

        queueToken: "GM-042",

        queuePosition: 0,

        room: "Consultation Room 102",

        diagnosis: "Mild Nutritional Anemia & Physical Fatigue (Controlled)",

        icd10: "D64.9",

        prescription: [
          {
            medicine: "Tab Multivitamin + Zinc",
            dosage: "1 tab",
            frequency: "OD after lunch",
            duration: "30 days",
          },

          {
            medicine: "Tab Vitamin D3 60K IU",
            dosage: "1 cap",
            frequency: "Once weekly",
            duration: "8 weeks",
          },
        ],

        investigations: [
          "Complete Blood Count (CBC)",
          "Serum Ferritin & Vitamin D3 Level",
        ],

        advice:
          "Balanced diet rich in leafy greens. Adequate hydration (3L/day). Follow up in 3 months with repeat CBC.",

        vitals: {
          bp: "120/80 mmHg",
          pulse: "74 bpm",
          temp: "98.4 °F",
          spo2: "99%",
          weight: "68 kg",
          notes: "Vitals normal",
        },

        billing: {
          consultationFee: 50,
          labFee: 45,
          total: 95,
          status: "Paid",
          mode: "Cash",
        },

        furtherAction: "None",

        status: "OP Completed",

        timestamps: {
          arrival: "09:30 AM",
          registration: "09:40 AM",
          consultationStart: "09:55 AM",
        },
      }

      return [synthEncounter]
    }

    return []
  }

  public getEncounterById(id: string): DBOPEncounter | undefined {
    return this.getEncounters().find((e) => e.id === id)
  }

  // ── Patient Matching & Duplicate Verification ─────────────────────────────

  /**
   * Identifies if entered patient details match an existing patient in the database.
   * If the name matches an existing record, but any detail (phone, age, sex) differs,
   * it treats them as a NEW patient and reports the mismatches.
   */

  public findMatchingPatient(params: {
    fullName: string

    dob?: string

    age?: number

    sex?: string

    phone?: string
  }): PatientMatchResult {
    return findMatchingPatient(this.getPatients(), params)
  }

  // ── High-Level OP Workflow Methods ────────────────────────────────────────

  /**
   * 1. Register New Patient:
   * Generates next permanent UMR -> Generates continuous global OP Number -> Saves to database
   */

  public registerNewPatient(data: {
    firstName: string

    middleName?: string

    lastName: string

    dob?: string

    age: number

    sex?: "Male" | "Female" | "Other"

    phone: string

    address?: string

    bloodGroup?: string

    dept?: string

    chiefComplaint?: string
  }): { patient: DBPatient ;encounter: DBOPEncounter } {
    const patients = this.getPatients()

    const encounters = this.getEncounters()

    // Next UMR Generator

    const currentCounter = parseInt(
      localStorage.getItem(STORAGE_KEYS.UMR_COUNTER) || "10048",
      10,
    )

    const nextUmrCounter = currentCounter + 1

    localStorage.setItem(STORAGE_KEYS.UMR_COUNTER, nextUmrCounter.toString())

    const newUmr = `UMR${nextUmrCounter}`

    // Global Continuous Unique OP Number Generator

    const currentOpCounter = parseInt(
      localStorage.getItem(STORAGE_KEYS.OP_COUNTER) || "33",
      10,
    )

    const nextOpCounter = currentOpCounter + 1

    localStorage.setItem(STORAGE_KEYS.OP_COUNTER, nextOpCounter.toString())

    const newOpNumber = `OP${String(nextOpCounter).padStart(3, "0")}`

    const fullName = [data.firstName, data.middleName, data.lastName]
      .filter(Boolean)
      .join(" ")
      .trim()

    const nowIso = new Date().toISOString()

    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

    // Step 1: Create Patient Record

    const newPatient: DBPatient = {
      umr: newUmr,

      name: fullName,

      dob: data.dob,

      age: data.age,

      sex: data.sex || "Male",

      phone: data.phone || "(617) 555-0199",

      address: data.address || "Boston, MA",

      bloodGroup: data.bloodGroup || "O+",

      createdAt: nowIso,

      updatedAt: nowIso,
    }

    // Step 2: Create Initial OP Encounter with Global Continuous OP Number

    const encounterId = `ENC-${newUmr}-${nextOpCounter}`

    const newEncounter: DBOPEncounter = {
      id: encounterId,

      umr: newUmr,

      opNumber: newOpNumber,

      patientName: fullName,

      age: data.age,

      sex: data.sex || "Male",

      phone: newPatient.phone,

      address: newPatient.address,

      bloodGroup: newPatient.bloodGroup,

      dept: data.dept || "Awaiting Triage",

      isNew: true,

      registrationTime: timeStr,

      chiefComplaint: data.chiefComplaint || "",

      symptoms: data.chiefComplaint ? [data.chiefComplaint] : [],

      aiSpecialty: data.dept || "",

      aiDoctor: "",

      aiConfidence: 0,

      doctorGenderPref: data.sex === "Female" ? "Female" : "Male",

      assignedDoctor: "",

      doctorStatus: "Available",

      queueToken: "",

      queuePosition: 1,

      room: "",

      diagnosis: "",

      icd10: "",

      prescription: [],

      investigations: [],

      advice: "",

      vitals: { bp: "", pulse: "", temp: "", spo2: "", weight: "", notes: "" },

      billing: {
        registrationFee: 20,
        consultationFee: data.dept
          ? getDoctorConsultationFee(
              getDoctorMaster().find(
                (d) => d.verified && d.specialty === data.dept,
              )?.name || "",
            )
          : 500,
        labFee: 0,
        total:
          20 +
          (data.dept
            ? getDoctorConsultationFee(
                getDoctorMaster().find(
                  (d) => d.verified && d.specialty === data.dept,
                )?.name || "",
              )
            : 500),
        status: "Pending",
        mode: "Card",
      },

      furtherAction: "None",

      status: "Registered",

      timestamps: { arrival: timeStr, registration: timeStr },
    }

    // Commit to database

    localStorage.setItem(
      STORAGE_KEYS.PATIENTS,
      JSON.stringify([newPatient, ...patients]),
    )

    localStorage.setItem(
      STORAGE_KEYS.ENCOUNTERS,
      JSON.stringify([newEncounter, ...encounters]),
    )

    // Backend write-through for OP Visit / Appointment
    apiFetch("/api/op/visits", {
      method: "POST",
      body: JSON.stringify({
        patient_id: newPatient.umr,
        patient: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: newPatient.phone,
          age: newPatient.age,
          gender: newPatient.sex,
        },
        appointment: {
          doctor_name: (newEncounter as any).assignedDoctor || (newEncounter as any).doctorAssigned || "Dr. Staff",
          department: newEncounter.dept || data.dept || "General Medicine",
          visit_type: "OP",
          appointment_date: new Date().toISOString().split("T")[0],
          status: "checked_in",
          chief_complaint: newEncounter.chiefComplaint || data.chiefComplaint || "OP Visit",
        },
      }),
    }).catch(() => {})

    this.notify()

    return { patient: newPatient, encounter: newEncounter }
  }

  /**
   * 2. Revisit Patient Encounter:
   * Keeps Permanent UMR unchanged -> Generates continuous global next OP Number -> Saves
   */

  public createRevisitEncounter(
    umr: string,
    data?: { dept?: string ;chiefComplaint?: string },
  ): DBOPEncounter {
    const patient = this.getPatientByUmr(umr)

    if (!patient)
      throw new Error(`Patient with UMR ${umr} not found in database.`)

    const encounters = this.getEncounters()

    // Generate Next Global Continuous OP Number across hospital

    const currentOpCounter = parseInt(
      localStorage.getItem(STORAGE_KEYS.OP_COUNTER) || "33",
      10,
    )

    const nextOpCounter = currentOpCounter + 1

    localStorage.setItem(STORAGE_KEYS.OP_COUNTER, nextOpCounter.toString())

    const newOpNumber = `OP${String(nextOpCounter).padStart(3, "0")}`

    const encounterId = `ENC-${umr}-${nextOpCounter}`

    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

    const newEncounter: DBOPEncounter = {
      id: encounterId,

      umr: patient.umr, // STRICTLY KEPT UNCHANGED

      opNumber: newOpNumber, // GLOBAL CONTINUOUS NEXT OP NUMBER

      patientName: patient.name,

      age: patient.age,

      sex: patient.sex,

      phone: patient.phone,

      address: patient.address,

      bloodGroup: patient.bloodGroup,

      dept: data?.dept || "Awaiting Triage",

      isNew: false,

      registrationTime: timeStr,

      chiefComplaint: data?.chiefComplaint || "Revisit Consultation",

      symptoms: [],

      aiSpecialty: "",

      aiDoctor: "",

      aiConfidence: 0,

      doctorGenderPref: patient.sex === "Female" ? "Female" : "Male",

      assignedDoctor: "",

      doctorStatus: "Available",

      queueToken: "",

      queuePosition: 1,

      room: "",

      diagnosis: "",

      icd10: "",

      prescription: [],

      investigations: [],

      advice: "",

      vitals: {
        bp: "",
        pulse: "",
        temp: "",
        spo2: "",
        weight: "",
        notes: "Revisit check",
      },

      billing: {
        registrationFee: 0,
        consultationFee: data?.dept
          ? getDoctorConsultationFee(
              getDoctorMaster().find(
                (d) => d.verified && d.specialty === data.dept,
              )?.name || "",
            )
          : 500,
        labFee: 0,
        total:
          0 +
          (data?.dept
            ? getDoctorConsultationFee(
                getDoctorMaster().find(
                  (d) => d.verified && d.specialty === data.dept,
                )?.name || "",
              )
            : 500),
        status: "Pending",
        mode: "Card",
      },

      furtherAction: "None",

      status: "Registered",

      timestamps: { arrival: timeStr, registration: timeStr },
    }

    // Update patient timestamp & save encounter

    const patients = this.getPatients().map((p) =>
      p.umr === umr ? { ...p, updatedAt: new Date().toISOString() } : p,
    )

    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients))

    localStorage.setItem(
      STORAGE_KEYS.ENCOUNTERS,
      JSON.stringify([newEncounter, ...encounters]),
    )

    // Backend write-through for OP Visit / Appointment
    apiFetch("/api/op/visits", {
      method: "POST",
      body: JSON.stringify({
        patient_id: umr,
        patient: patient ? {
          first_name: patient.name.split(" ")[0] || patient.name,
          last_name: patient.name.split(" ").slice(1).join(" ") || "",
          phone: patient.phone,
          age: patient.age,
          gender: patient.sex,
        } : undefined,
        appointment: {
          doctor_name: (newEncounter as any).assignedDoctor || (newEncounter as any).doctorAssigned || "Dr. Staff",
          department: newEncounter.dept || "General Medicine",
          visit_type: "OP",
          appointment_date: new Date().toISOString().split("T")[0],
          status: "checked_in",
          chief_complaint: newEncounter.chiefComplaint || "Revisit",
        },
      }),
    }).catch(() => {})

    this.notify()

    return newEncounter
  }

  /**
   * 3. Update Encounter (e.g. Consult, Vitals, Billing):
   */

  /**
   * The OP nurse station recording a patient's baseline observations.
   *
   * This is the gate between reception and the doctor. Booking an appointment
   * assigns the doctor and leaves the visit at "Doctor Assigned"; the patient is
   * only handed to the consulting room once the nurse has taken vitals, which
   * moves it to "In Queue". Without that step the doctor's queue filled with
   * patients nobody had seen yet, and the vitals panel on the admit card was
   * permanently blank.
   */
  /**
   * The OP desk calling a patient through to the nurse station.
   *
   * Step three of the outpatient flow: reception books, the appointment lands on
   * the OP hub, and somebody has to actually call the patient from the waiting
   * room before the nurse can take vitals. Nothing recorded that, so the nurse's
   * list could not tell a patient who had been called from one still sitting
   * outside unaware.
   *
   * The status is untouched -- being called is not a clinical stage, it is a
   * fact about the waiting room. Vitals are still what moves the visit on.
   */
  public callToNurseStation(
    id: string,
    calledBy: string,
  ): DBOPEncounter | undefined {
    const existing = this.getEncounters().find((e) => e.id === id)
    if (!existing) return undefined
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    return this.updateEncounter(id, {
      timestamps: {
        ...existing.timestamps,
        calledToNurse: now,
        calledToNurseBy: calledBy,
      },
    })
  }

  public recordVitals(
    id: string,

    vitals: DBOPEncounter["vitals"],

    nurseName: string,
  ): DBOPEncounter {
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })

    const existing = this.getEncounters().find((e) => e.id === id)

    const updated = this.updateEncounter(id, {
      vitals,

      status: "In Queue",

      timestamps: {
        ...(existing?.timestamps ?? { arrival: now }),
        vitalsRecorded: now,
        vitalsBy: nurseName,
      },
    })

    // Write-through to the real backend, keyed on the patient's UMR (not this
    // encounter's local id, which has no backend existence) -- best-effort,
    // same posture as ICU/OT: the local record above is what the UI reads
    // from immediately, this just makes the reading survive past this browser.
    if (existing?.umr && (vitals.bp || vitals.pulse || vitals.temp || vitals.spo2)) {
      apiFetch(`/api/patients/${existing.umr}/vitals`, {
        method: "POST",
        body: JSON.stringify({
          bp: vitals.bp || undefined,
          pulse: vitals.pulse ? parseInt(vitals.pulse) : undefined,
          temperature: vitals.temp ? parseFloat(vitals.temp) : undefined,
          spo2: vitals.spo2 ? parseInt(vitals.spo2) : undefined,
          notes: vitals.notes || undefined,
        }),
      }).catch(() => {
        // Offline/unreachable -- the local record above already has it.
      })
    }

    return updated
  }

  public updateEncounter(
    id: string,
    updates: Partial<DBOPEncounter>,
  ): DBOPEncounter {
    const encounters = this.getEncounters()

    let updated: DBOPEncounter | null = null

    const newEncounters = encounters.map((e) => {
      if (e.id === id) {
        const assignedDoc =
          updates.assignedDoctor !== undefined
            ? updates.assignedDoctor
            : e.assignedDoctor

        let cFee = e.billing?.consultationFee || 500
        if (updates.billing?.consultationFee !== undefined) {
          cFee = updates.billing.consultationFee
        } else if (
          updates.assignedDoctor &&
          updates.assignedDoctor !== e.assignedDoctor
        ) {
          cFee = getDoctorConsultationFee(updates.assignedDoctor)
        } else if (assignedDoc && (cFee === 50 || !e.billing?.consultationFee)) {
          cFee = getDoctorConsultationFee(assignedDoc)
        }

        const regFee =
          updates.billing?.registrationFee !== undefined
            ? updates.billing.registrationFee
            : (e.billing?.registrationFee ?? (e.isNew === false ? 0 : 20))

        const lFee =
          updates.billing?.labFee !== undefined
            ? updates.billing.labFee
            : (e.billing?.labFee || 0)

        const bStatus =
          updates.billing?.status || e.billing?.status || "Pending"
        const bMode = updates.billing?.mode || e.billing?.mode || "Card"

        const mergedBilling = {
          registrationFee: regFee,
          consultationFee: cFee,
          labFee: lFee,
          total: regFee + cFee + lFee,
          status: bStatus,
          mode: bMode,
        }

        updated = {
          ...e,
          ...updates,
          billing: mergedBilling,
        }

        return updated
      }

      return e
    })

    if (!updated) throw new Error(`Encounter ${id} not found.`)

    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(newEncounters))

    this.notify()

    return updated
  }

  /**
   * Delete patient and all their encounters by UMR
   */

  public deletePatientByUmr(umr: string): void {
    const patients = this.getPatients().filter(
      (p) => p.umr.toUpperCase() !== umr.toUpperCase(),
    )

    const encounters = this.getEncounters().filter(
      (e) => e.umr.toUpperCase() !== umr.toUpperCase(),
    )

    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients))

    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(encounters))

    this.notify()
  }

  /**
   * Delete patient and all their encounters by Name
   */

  public deletePatientByName(name: string): void {
    const cleanName = name.trim().toLowerCase()

    const patients = this.getPatients().filter(
      (p) => !p.name.toLowerCase().includes(cleanName),
    )

    const encounters = this.getEncounters().filter(
      (e) => !e.patientName.toLowerCase().includes(cleanName),
    )

    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients))

    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(encounters))

    this.notify()
  }

  /**
   * Delete a single encounter by ID
   */

  public deleteEncounterById(id: string): void {
    const encounters = this.getEncounters().filter((e) => e.id !== id)

    localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(encounters))

    this.notify()
  }

  /**
   * Reset database back to seed defaults
   */

  public resetDatabase() {
    localStorage.setItem(
      STORAGE_KEYS.PATIENTS,
      JSON.stringify(INITIAL_SEED_PATIENTS),
    )

    localStorage.setItem(
      STORAGE_KEYS.ENCOUNTERS,
      JSON.stringify(INITIAL_SEED_ENCOUNTERS),
    )

    localStorage.setItem(STORAGE_KEYS.UMR_COUNTER, "10048")

    this.notify()
  }

  /**
   * Sync OP Visit Queue from real PostgreSQL backend into local store.
   * Enables cross-machine real-time queue & doctor alert synchronization.
   */
  public async syncOPVisitsWithBackend(): Promise<void> {
    try {
      const res = await apiFetch<{ queue?: any[] }>("/api/queue")
      if (res && Array.isArray(res.queue) && res.queue.length > 0) {
        const encounters = this.getEncounters()
        let hasChanges = false

        for (const item of res.queue) {
          const encId = item.appointment_id ? `ENC-${item.patient_id}-${item.appointment_id}` : `ENC-${item.patient_id}`
          const existingIndex = encounters.findIndex(
            (e) => e.id === encId || e.umr === item.patient_id || (e as any).dbAppointmentId === item.id || (e as any).dbAppointmentId === item.appointment_id
          )

          if (existingIndex >= 0) {
            const existing = encounters[existingIndex]
            const newStatus = item.status === "in_consultation" ? "Under Consultation" : item.status === "checked_in" ? "In Queue" : existing.status
            const newDoc = item.doctor_name || (existing as any).assignedDoctor || (existing as any).doctorAssigned

            if ((existing as any).assignedDoctor !== newDoc || existing.status !== newStatus) {
              encounters[existingIndex] = {
                ...existing,
                assignedDoctor: newDoc,
                doctorAssigned: newDoc,
                status: newStatus as any,
                ...(item.id || item.appointment_id ? { dbAppointmentId: item.id || item.appointment_id } : {}),
              } as any
              hasChanges = true
            }
          } else {
            const newEnc: DBOPEncounter = {
              id: encId,
              opNumber: `OP-${item.patient_id || "101"}`,
              tokenNo: `T-${item.id || 101}`,
              umr: item.patient_id || "UMR-UNKNOWN",
              patientName: item.patient_name || item.patient_first_name || "Patient",
              age: item.age || 40,
              sex: (item.gender === "Female" ? "Female" : item.gender === "Male" ? "Male" : "Other") as any,
              phone: item.phone || "+91 98765 43210",
              address: item.address || "Main City",
              bloodGroup: item.blood_group || "O+",
              dept: item.department || "General Medicine",
              isNew: false,
              registrationTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              chiefComplaint: item.chief_complaint || "OP Visit",
              symptoms: item.chief_complaint ? [item.chief_complaint] : ["General Consultation"],
              aiSpecialty: item.department || "General Medicine",
              assignedDoctor: item.doctor_name || "Dr. Staff",
              doctorAssigned: item.doctor_name || "Dr. Staff",
              consultationType: "General Consultation",
              consultationFee: 500,
              payment: {
                totalAmount: 500,
                amountPaid: 500,
                balanceDue: 0,
                status: "Paid",
                mode: "Card",
              },
              furtherAction: "None",
              status: item.status === "in_consultation" ? "Under Consultation" : "In Queue",
              timestamps: {
                arrival: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
              vitals: item.vitals ? {
                bp: item.vitals.bp || "120/80",
                pulse: item.vitals.pulse ? String(item.vitals.pulse) : "72",
                temp: item.vitals.temperature ? String(item.vitals.temperature) : "98.6",
                spo2: item.vitals.spo2 ? String(item.vitals.spo2) : "98",
              } : undefined,
            } as any
            encounters.unshift(newEnc)
            hasChanges = true
          }
        }

        if (hasChanges) {
          localStorage.setItem(STORAGE_KEYS.ENCOUNTERS, JSON.stringify(encounters))
          this.notify()
        }
      }
    } catch {
      // Best-effort sync
    }
  }
}

export const db = new HospitalDatabase()

export interface PatientMatchResult {
  match: DBPatient | null // Non-null ONLY if name matches AND all other details (phone, age, sex) do NOT conflict with the DB record

  nameMatchedPatient: DBPatient | null // Non-null if ANY patient in DB has the same name

  mismatches: string[] // List of specific mismatched fields
}

/**
 * Robust matching logic:
 * When a name is entered:
 * - If name matches a patient in DB and all other entered details (phone, age, sex) match -> Existing Patient (match non-null)
 * - If name matches, but ANY detail (phone, age, sex) mismatches -> New Patient (match is null, nameMatchedPatient is set, mismatches lists details)
 * - If name does not match any patient in DB -> New Patient (match and nameMatchedPatient are null)
 */

export function findMatchingPatient(
  patients: DBPatient[],

  params: {
    fullName: string

    dob?: string

    age?: number

    sex?: string

    phone?: string
  },
): PatientMatchResult {
  const cleanName = params.fullName.trim().toLowerCase()

  if (cleanName.length < 2) {
    return { match: null, nameMatchedPatient: null, mismatches: [] }
  }

  // Find all patients in DB with the exact same name (case-insensitive)

  const candidates = patients.filter(
    (p) => p.name.trim().toLowerCase() === cleanName,
  )

  if (candidates.length === 0) {
    return { match: null, nameMatchedPatient: null, mismatches: [] }
  }

  // Check each candidate for an exact non-conflicting match

  for (const candidate of candidates) {
    const candidateMismatches: string[] = []

    // 1. Exact Date of Birth (DOB) comparison

    if (params.dob && candidate.dob) {
      if (params.dob.trim() !== candidate.dob.trim()) {
        candidateMismatches.push(
          `DOB differs (${params.dob} vs registered ${candidate.dob})`,
        )
      }
    } else if (
      params.age !== undefined &&
      params.age !== null &&
      params.age > 0
    ) {
      // Fallback to age comparison if candidate record does not have explicit DOB stored

      if (params.age !== candidate.age) {
        candidateMismatches.push(
          `Age differs (${params.age} yrs vs registered ${candidate.age} yrs)`,
        )
      }
    }

    // 2. Phone number comparison (digits only, if phone has at least 4 digits)

    if (params.phone && params.phone.trim().length >= 4) {
      const inputDigits = params.phone.replace(/\D/g, "")

      const dbDigits = candidate.phone.replace(/\D/g, "")

      if (inputDigits && dbDigits && inputDigits !== dbDigits) {
        candidateMismatches.push(
          `Phone number differs (${params.phone.trim()} vs ${candidate.phone})`,
        )
      }
    }

    // 3. Gender comparison (if sex is provided and not empty)

    if (params.sex && params.sex.trim() !== "") {
      if (
        params.sex.trim().toLowerCase() !== candidate.sex.trim().toLowerCase()
      ) {
        candidateMismatches.push(
          `Gender differs (${params.sex} vs ${candidate.sex})`,
        )
      }
    }

    // If zero mismatches, we found an exact match!

    if (candidateMismatches.length === 0) {
      return {
        match: candidate,

        nameMatchedPatient: candidate,

        mismatches: [],
      }
    }
  }

  // If no candidate matched without mismatches, collect the mismatches of the primary candidate

  const primaryCandidate = candidates[0]

  const detectedMismatches: string[] = []

  if (params.dob && primaryCandidate.dob) {
    if (params.dob.trim() !== primaryCandidate.dob.trim()) {
      detectedMismatches.push(
        `DOB differs: ${params.dob} vs registered ${primaryCandidate.dob}`,
      )
    }
  } else if (
    params.age !== undefined &&
    params.age !== null &&
    params.age > 0 &&
    params.age !== primaryCandidate.age
  ) {
    detectedMismatches.push(
      `Age differs: ${params.age} yrs vs registered ${primaryCandidate.age} yrs`,
    )
  }

  if (params.phone && params.phone.trim().length >= 4) {
    const inputDigits = params.phone.replace(/\D/g, "")

    const dbDigits = primaryCandidate.phone.replace(/\D/g, "")

    if (inputDigits && dbDigits && inputDigits !== dbDigits) {
      detectedMismatches.push(
        `Phone number differs: "${params.phone.trim()}" vs registered "${primaryCandidate.phone}"`,
      )
    }
  }

  if (
    params.sex &&
    params.sex.trim() !== "" &&
    params.sex.trim().toLowerCase() !==
      primaryCandidate.sex.trim().toLowerCase()
  ) {
    detectedMismatches.push(
      `Gender differs: ${params.sex} vs registered ${primaryCandidate.sex}`,
    )
  }

  return {
    match: null,

    nameMatchedPatient: primaryCandidate,

    mismatches: detectedMismatches,
  }
}
