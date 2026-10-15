import React, { useState, useEffect, useMemo } from "react"
import { BillingDatabase, RadiologyStudyRecord } from "../services/billingDb"
import { db } from "../services/db"
import { AuditDatabase } from "../services/auditDb"
import { RadiologyWorkflowDb, ExtendedRadiologyRecord } from "../services/radiologyWorkflowDb"
import RadiologyDashboard from "./radiology/RadiologyDashboard"
import ReportsDepartment from "./radiology/ReportsDepartment"
import NurseVerificationTab from "./radiology/NurseVerificationTab"
import NewInvestigationOrderModal from "./radiology/NewInvestigationOrderModal"
import {
  Layers,
  FileText,
  ShieldCheck,
  PlusCircle,
  Building,
  UserCheck,
  CheckCircle2,
} from "lucide-react"

export interface ImagingCatalogItem {
  study: string
  code: string
  category: "X-Ray" | "CT Scan" | "MRI" | "Ultrasound (USG)" | "Doppler" | "Mammography" | "Fluoroscopy / Special Procedures"
  modality: "XR" | "CT" | "MR" | "US" | "NM"
  price: number
  room: string
  indication: string
  technique: string
  defaultFindings: string[]
  defaultImpression: string[]
}

export const IMAGING_CATALOG: ImagingCatalogItem[] = [
  // 1. X-RAY
  {
    study: "Chest X-Ray PA/Lateral",
    code: "RAD-XR-001",
    category: "X-Ray",
    modality: "XR",
    price: 450,
    room: "XR-1",
    indication: "Shortness of breath, cough, rule out consolidation or cardiomegaly.",
    technique: "Digital PA and lateral upright chest radiographs.",
    defaultFindings: [
      "Lungs: Clear bilaterally without focal consolidation, pleural effusion, or pneumothorax.",
      "Cardiovascular: Cardiac silhouette is normal in size (CTR < 0.50). Normal mediastinal contours.",
      "Bones & Soft Tissues: Intact bony thorax without acute fracture.",
    ],
    defaultImpression: [
      "1. No acute cardiopulmonary disease.",
      "2. Lungs are clear.",
    ],
  },
  {
    study: "X-Ray Right Hip AP & Frog-Leg Lateral",
    code: "RAD-XR-002",
    category: "X-Ray",
    modality: "XR",
    price: 550,
    room: "XR-1",
    indication: "Fall from standing height, right groin pain, inability to bear weight.",
    technique: "Digital AP and frog-leg lateral radiographs of the right hip and pelvis.",
    defaultFindings: [
      "Femoral Neck: Non-displaced subcapital fracture of the right femoral neck with cortical disruption.",
      "Acetabulum: Intact without dislocation.",
      "Joint Space: Well-preserved articular cartilage space.",
    ],
    defaultImpression: [
      "1. Acute subcapital right femoral neck fracture.",
      "2. Urgent orthopedic surgery consultation recommended for internal fixation / arthroplasty.",
    ],
  },
  {
    study: "X-Ray Cervical Spine AP & Lateral",
    code: "RAD-XR-003",
    category: "X-Ray",
    modality: "XR",
    price: 600,
    room: "XR-2",
    indication: "Neck stiffness, radicular pain, trauma evaluation.",
    technique: "Digital AP, lateral, and open-mouth odontoid radiographs of the cervical spine.",
    defaultFindings: [
      "Alignment: Normal lordotic curvature preserved without anterolisthesis.",
      "Vertebrae: Vertebral body heights and disc spaces are well-maintained.",
      "Odontoid & Prevertebral: Odontoid process intact; soft tissues unremarkable.",
    ],
    defaultImpression: [
      "1. No acute cervical osseous fracture or dislocation.",
      "2. Intact cervical alignment.",
    ],
  },
  {
    study: "X-Ray KUB (Kidneys, Ureters, Bladder)",
    code: "RAD-XR-004",
    category: "X-Ray",
    modality: "XR",
    price: 500,
    room: "XR-2",
    indication: "Flank pain, hematuria, rule out radiopaque urinary tract calculus.",
    technique: "Supine digital abdominal radiograph centering over the KUB region.",
    defaultFindings: [
      "Renal & Ureteric Shadows: Faint calcific density projected over the right renal pelvis measuring ~5mm.",
      "Bowel Gas: Normal non-obstructive bowel gas pattern.",
      "Psoas Shadows: Psoas margins are symmetrical and intact.",
    ],
    defaultImpression: [
      "1. Radiopaque calcific density right renal pelvis, suspicious for nephrolithiasis.",
      "2. Recommend non-contrast CT KUB for definitive localization.",
    ],
  },

  // 2. CT SCAN
  {
    study: "CT Head w/o IV Contrast",
    code: "RAD-CT-001",
    category: "CT Scan",
    modality: "CT",
    price: 3500,
    room: "CT-1",
    indication: "Acute onset neurological deficit / severe acute headache. Rule out intracranial hemorrhage.",
    technique: "Non-contrast axial helical CT scan of the brain with 1.25mm thin reconstructions.",
    defaultFindings: [
      "Brain Parenchyma: No acute intra-axial or extra-axial hemorrhage. No territorial acute ischemic infarct.",
      "Ventricles & Cisterns: Symmetrical and normal in size for age. No midline shift or mass effect.",
      "Calvarium: Calvarium and skull base are intact without fracture.",
    ],
    defaultImpression: [
      "1. No acute intracranial hemorrhage or territorial vascular stroke.",
      "2. Correlate clinically. MRI with DWI recommended if symptoms persist.",
    ],
  },
  {
    study: "CT Abdomen & Pelvis with IV Contrast",
    code: "RAD-CT-002",
    category: "CT Scan",
    modality: "CT",
    price: 5500,
    room: "CT-2",
    indication: "Right lower quadrant abdominal pain, fever, suspected appendicitis.",
    technique: "Axial multidetector CT of abdomen and pelvis following 85mL IV Omnipaque 350 contrast.",
    defaultFindings: [
      "Appendix: Blind-ending tubular structure in the right lower quadrant measuring 8.5mm in diameter with mural hyperemia and periappendiceal fat stranding.",
      "Solid Organs: Liver, spleen, pancreas, adrenals, and kidneys are unremarkable without focal lesion.",
      "Peritoneum: Small volume reactive fluid in the right iliac fossa. No free intraperitoneal air.",
    ],
    defaultImpression: [
      "1. Findings highly consistent with acute uncomplicated appendicitis.",
      "2. No evidence of perforation, phlegmon, or abscess.",
    ],
  },
  {
    study: "HRCT Chest (High Resolution CT)",
    code: "RAD-CT-003",
    category: "CT Scan",
    modality: "CT",
    price: 4800,
    room: "CT-1",
    indication: "Persistent dyspnea, interstitial lung disease workup, COVID/viral sequelae.",
    technique: "High-resolution 1.0mm axial thoracic CT scan with lung and mediastinal window reconstructions.",
    defaultFindings: [
      "Lungs: Scattered subpleural ground-glass opacities and fine reticular septal thickening in lower lobes.",
      "Airways: Tracheobronchial tree is patent without bronchiectasis.",
      "Mediastinum: No hilar or mediastinal lymphadenopathy.",
    ],
    defaultImpression: [
      "1. Mild bilateral lower lobe subpleural reticulation, consistent with early interstitial changes.",
      "2. No active consolidation or pleural effusion.",
    ],
  },
  {
    study: "CT Angiography Coronary / Pulmonary",
    code: "RAD-CT-004",
    category: "CT Scan",
    modality: "CT",
    price: 7200,
    room: "CT-2",
    indication: "Acute chest pain, pleuritic dyspnea, elevated D-Dimer, rule out Pulmonary Embolism.",
    technique: "ECG-gated volumetric multidetector CT angiography following bolus tracking IV contrast injection.",
    defaultFindings: [
      "Pulmonary Arteries: Bifurcation, main, lobar, and segmental pulmonary arteries are opacified cleanly without filling defect.",
      "Aorta: Normal caliber of ascending and descending thoracic aorta without dissection flap.",
      "Heart: Normal cardiac chamber sizes; no right ventricular strain.",
    ],
    defaultImpression: [
      "1. Negative for acute pulmonary thromboembolism.",
      "2. No aortic dissection or aneurysm.",
    ],
  },

  // 3. MRI
  {
    study: "MRI Brain with & without Contrast",
    code: "RAD-MR-001",
    category: "MRI",
    modality: "MR",
    price: 8500,
    room: "MR-1",
    indication: "Tension headache, vertigo, rule out space-occupying lesion.",
    technique: "Multiplanar 3.0T MRI including T1W, T2W, FLAIR, DWI/ADC, and Post-Contrast 3D T1 sequences.",
    defaultFindings: [
      "Parenchyma: Scattered punctate T2/FLAIR hyperintensities in subcortical white matter, typical for mild microvascular changes.",
      "Diffusion: No restricted diffusion to suggest acute infarction.",
      "Enhancement: No abnormal parenchymal or leptomeningeal enhancement.",
    ],
    defaultImpression: [
      "1. Mild chronic microvascular ischemic changes, normal for age. No acute stroke.",
      "2. No mass effect, midline shift, or abnormal contrast enhancement.",
    ],
  },
  {
    study: "MRI Lumbar Spine (L-Spine)",
    code: "RAD-MR-002",
    category: "MRI",
    modality: "MR",
    price: 7500,
    room: "MR-1",
    indication: "Lower back pain radiating down right lower extremity (Sciatica).",
    technique: "Sagittal and axial T1, T2, and STIR MR sequences of the lumbar spine.",
    defaultFindings: [
      "L4-L5: Right paracentral disc herniation/protrusion causing moderate right lateral recess stenosis and impingement on the descending right L5 nerve root.",
      "L5-S1: Mild diffuse disc bulge without significant neural foraminal narrowing.",
      "Conus Medullaris: Terminates normally at L1 level without abnormal signal.",
    ],
    defaultImpression: [
      "1. L4-L5 right paracentral disc protrusion compromising right L5 nerve root.",
      "2. Mild lower lumbar spondylosis.",
    ],
  },
  {
    study: "MRI Knee Joint Right/Left",
    code: "RAD-MR-003",
    category: "MRI",
    modality: "MR",
    price: 7000,
    room: "MR-1",
    indication: "Sports injury, joint locking, knee instability, suspected ACL/meniscal tear.",
    technique: "Multiplanar 3.0T MR imaging of the knee including proton density fat-sat and T2 T1 sequences.",
    defaultFindings: [
      "Menisci: Oblique linear T2 hyperintensity involving posterior horn of medial meniscus extending to articular surface.",
      "Ligaments: Intact ACL, PCL, MCL, and LCL without high-grade tear.",
      "Effusion: Mild joint effusion in suprapatellar bursa.",
    ],
    defaultImpression: [
      "1. Grade III oblique tear of medial meniscus posterior horn.",
      "2. Intact cruciate and collateral ligaments.",
    ],
  },
  {
    study: "MR Cholangiopancreatography (MRCP)",
    code: "RAD-MR-004",
    category: "MRI",
    modality: "MR",
    price: 9000,
    room: "MR-1",
    indication: "Obstructive jaundice, dilated CBD, rule out choledocholithiasis or biliary stricture.",
    technique: "Heavy T2-weighted 3D thin-slice MRCP with coronal maximum intensity projections (MIP).",
    defaultFindings: [
      "Biliary Tree: Smooth non-dilated intrahepatic biliary radicles. CBD caliber is 5.2mm without intraductal calculus.",
      "Gallbladder: Well-distended without gallstone or wall thickening.",
      "Pancreatic Duct: Main pancreatic duct is smooth and normal in caliber.",
    ],
    defaultImpression: [
      "1. Unremarkable MRCP study. No choledocholithiasis or biliary obstruction.",
      "2. Normal main pancreatic duct.",
    ],
  },

  // 4. ULTRASOUND (USG)
  {
    study: "Ultrasound Whole Abdomen & Pelvis",
    code: "RAD-US-001",
    category: "Ultrasound (USG)",
    modality: "US",
    price: 1400,
    room: "US-1",
    indication: "Epigastric and right upper quadrant colic pain. Rule out cholelithiasis.",
    technique: "Real-time grayscale and color Doppler sonography of the abdomen and pelvis.",
    defaultFindings: [
      "Gallbladder: Well-distended with multiple mobile acoustic shadowing calculi, largest 11mm. Wall thickness is normal (2.1mm). Murphy sign is negative.",
      "Liver: Normal size and echotexture without focal parenchymal lesions.",
      "Biliary Tree: Common bile duct is normal in caliber (3.8mm) without stone.",
    ],
    defaultImpression: [
      "1. Cholelithiasis (multiple mobile gallstones) without acute cholecystitis.",
      "2. Otherwise unremarkable whole abdomen sonogram.",
    ],
  },
  {
    study: "Ultrasound KUB & Prostate",
    code: "RAD-US-003",
    category: "Ultrasound (USG)",
    modality: "US",
    price: 1200,
    room: "US-1",
    indication: "Dysuria, urinary frequency, post-void dribbling, suspected BPH.",
    technique: "Transabdominal grayscale sonography of kidneys, bladder, and prostate.",
    defaultFindings: [
      "Kidneys: Bilateral kidneys are normal in size, position, and parenchymal echogenicity. No hydronephrosis.",
      "Bladder: Well-filled with normal mucosal wall. Post-void residual volume is 35mL.",
      "Prostate: Symmetrically enlarged measuring 42cc in volume.",
    ],
    defaultImpression: [
      "1. Moderate benign prostatic hyperplasia (BPH ~42cc).",
      "2. No renal hydronephrosis or bladder calculus.",
    ],
  },

  // 5. DOPPLER
  {
    study: "Transthoracic 2D Echocardiogram / Color Doppler",
    code: "RAD-DOP-001",
    category: "Doppler",
    modality: "US",
    price: 2200,
    room: "Echo-1",
    indication: "Hypertension, evaluate left ventricular ejection fraction and wall motion.",
    technique: "Complete 2D, M-Mode, and Color / Continuous-Wave Doppler echocardiography.",
    defaultFindings: [
      "Left Ventricle: Normal cavity dimensions. Preserved systolic function. LVEF estimated at 60-65%.",
      "Valves: Structurally normal. Trace mitral regurgitation. No aortic stenosis.",
      "Pericardium: No pericardial effusion.",
    ],
    defaultImpression: [
      "1. Normal left ventricular systolic function (LVEF 60-65%).",
      "2. No regional wall motion abnormality. No significant valvulopathy.",
    ],
  },

  // 6. MAMMOGRAPHY
  {
    study: "Bilateral Digital Mammography with 3D Tomosynthesis",
    code: "RAD-MAM-001",
    category: "Mammography",
    modality: "XR",
    price: 3800,
    room: "XR-2",
    indication: "Routine screening mammogram / evaluation of palpable breast nodule.",
    technique: "Low-dose bilateral full-field digital mammography in CC and MLO views with 3D tomosynthesis.",
    defaultFindings: [
      "Parenchyma: Heterogeneously dense breast tissue (BI-RADS Density C).",
      "Masses & Microcalcifications: No suspicious spiculated mass, architectural distortion, or microcalcifications.",
      "Axilla: Bilateral axillary lymph nodes are benign in appearance with fatty hilum.",
    ],
    defaultImpression: [
      "1. BI-RADS Category 1: Negative bilateral digital mammogram.",
      "2. Routine annual screening recommended.",
    ],
  },
]

export interface PatientStudyGroup {
  groupKey: string
  patient: string
  mrn: string
  umr?: string
  encounterId?: string
  department?: string
  diagnosis?: string
  provider: string
  ordered: string
  priority: "STAT" | "Routine" | "Elective"
  paymentStatus: "Paid" | "Payment Pending"
  paidReceiptNo?: string
  totalPrice: number
  studies: RadiologyStudyRecord[]
  modalities: Array<"XR" | "CT" | "MR" | "US" | "NM">
  status: "Orders" | "Scheduled" | "In Progress" | "Images Ready" | "Reporting" | "Final"
}

const SPECIALIST_PERSONAS = [
  {
    name: "Alex Rivera, RT(R)",
    role: "Senior Radiology Technician",
    badge: "Technician Lead",
  },
  {
    name: "Dr. Laura Kim, MD",
    role: "Consultant Radiologist",
    badge: "Authorizing Radiologist",
  },
  {
    name: "Jessica Carter, RN",
    role: "Registered Nurse (OPD)",
    badge: "Verification Nurse",
  },
]

export default function Radiology({
  technician = "Alex Rivera, RT(R)",
}: {
  technician?: string
}) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "reports" | "nurse_verification">("dashboard")
  const [selectedPersonaIndex, setSelectedPersonaIndex] = useState(0)
  const [targetStudyForReport, setTargetStudyForReport] = useState<string | null>(null)
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const activePersona = SPECIALIST_PERSONAS[selectedPersonaIndex] || SPECIALIST_PERSONAS[0]

  const showNotification = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4500)
  }

  // Navigate directly from dashboard to report preparation
  const handleOpenReportInReportsDept = (studyId: string) => {
    setTargetStudyForReport(studyId)
    setActiveTab("reports")
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F6F9] overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border bg-emerald-950 text-emerald-100 border-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Department Header */}
      <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
            <Building size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                Radiology & Imaging Department
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase tracking-wider">
                Full Workflow Active
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Doctor Investigation Orders • Nurse Verification • Live Billing Sync • Clinical Reports
            </p>
          </div>
        </div>

        {/* Right Persona Switcher & New Order Trigger */}
        <div className="flex items-center gap-3">
          {/* Active User / Specialist Persona Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <UserCheck size={14} className="text-indigo-400" />
            <span className="text-slate-400 text-[11px] hidden md:inline">Logged in as:</span>
            <select
              value={selectedPersonaIndex}
              onChange={(e) => setSelectedPersonaIndex(Number(e.target.value))}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              {SPECIALIST_PERSONAS.map((p, idx) => (
                <option key={p.name} value={idx} className="bg-slate-900 text-white">
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowNewOrderModal(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={14} />
            <span className="hidden sm:inline">Prescribe Order</span>
          </button>
        </div>
      </div>

      {/* Top Workflow Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-4 sm:gap-6 flex-shrink-0 shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab("dashboard")
            setTargetStudyForReport(null)
          }}
          className={`py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "dashboard"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers size={15} />
          <span>Radiology Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "reports"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText size={15} />
          <span>Reports Department</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("nurse_verification")
            setTargetStudyForReport(null)
          }}
          className={`py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "nurse_verification"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck size={15} />
          <span>Nurse Verification Desk</span>
        </button>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "dashboard" && (
          <RadiologyDashboard
            currentTechnician={activePersona.name}
            currentRole={activePersona.role}
            onOpenReportInReportsDept={handleOpenReportInReportsDept}
            onNavigateToNurseVerification={() => setActiveTab("nurse_verification")}
          />
        )}

        {activeTab === "reports" && (
          <ReportsDepartment
            currentTechnician={activePersona.name}
            currentRole={activePersona.role}
            onNavigateToDashboard={() => setActiveTab("dashboard")}
            initialSelectedStudyId={targetStudyForReport}
          />
        )}

        {activeTab === "nurse_verification" && (
          <NurseVerificationTab
            currentNurseName={activePersona.name}
            onOrderVerified={(msg) => showNotification(msg)}
            onNavigateToDashboard={() => setActiveTab("dashboard")}
          />
        )}
      </div>

      {/* Prescribe Order Modal */}
      {showNewOrderModal && (
        <NewInvestigationOrderModal
          onClose={() => setShowNewOrderModal(false)}
          onOrderCreated={(msg) => showNotification(msg)}
        />
      )}
    </div>
  )
}
