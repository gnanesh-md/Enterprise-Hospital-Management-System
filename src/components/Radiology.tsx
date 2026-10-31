import React, { useState, useEffect, useMemo } from "react"
import mammoth from "mammoth"
import * as pdfjsLib from "pdfjs-dist"
import { 
  FileText, 
  Printer, 
  Save, 
  CheckCircle2, 
  X, 
  Upload, 
  User, 
  Calendar, 
  Stethoscope, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Sun, 
  Moon, 
  Activity,
  Layers,
  FileCheck2,
  Undo2,
  FileSpreadsheet
} from "lucide-react"
import { BillingDatabase, RadiologyStudyRecord } from "../services/billingDb"
import { db } from "../services/db"
import { AuditDatabase } from "../services/auditDb"
import { RadiologyTemplateDatabase, extractCleanTemplateText, extractTextFromPdfBuffer, extractTextFromWordBuffer } from "../services/radiologyTemplateDb"

import { DiagnosticTariffDatabase } from "../services/diagnosticTariffDb"

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
  {
    study: "Ultrasound Obstetric Anomaly Scan",
    code: "RAD-US-004",
    category: "Ultrasound (USG)",
    modality: "US",
    price: 1800,
    room: "US-1",
    indication: "Routine 18-22 week routine second trimester fetal anomaly screening.",
    technique: "High-resolution real-time obstetric ultrasound with anatomical detail survey.",
    defaultFindings: [
      "Fetus: Single live intrauterine fetus in cephalic presentation. BPD, HC, AC, and FL correspond to 20w2d.",
      "Anatomy: Fetal calvarium, 4-chamber cardiac view, spine, stomach, kidneys, and limbs are morphologically intact.",
      "Placenta & Liquor: Anterior placenta well clear of internal os. Adequate AFI (14cm).",
    ],
    defaultImpression: [
      "1. Single live intrauterine pregnancy at ~20 weeks 2 days.",
      "2. No gross structural fetal anomaly identified.",
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
  {
    study: "Arterial & Venous Color Doppler Lower Limb",
    code: "RAD-DOP-002",
    category: "Doppler",
    modality: "US",
    price: 3200,
    room: "US-1",
    indication: "Unilateral leg swelling, pain, suspected Deep Vein Thrombosis (DVT).",
    technique: "High-frequency duplex sonography with triphasic spectral Doppler analysis of lower extremity vessels.",
    defaultFindings: [
      "Veins: Common femoral, femoral, and popliteal veins are fully compressible with normal phasic flow.",
      "Arteries: Triphasic spectral flow waveforms across CIA, EIA, CFA, SFA, and popliteal arteries.",
      "Perforators: No incompetent perforators identified.",
    ],
    defaultImpression: [
      "1. Negative for deep or superficial vein thrombosis of lower extremity.",
      "2. Normal arterial triphasic flow waveforms.",
    ],
  },
  {
    study: "Carotid & Vertebral Color Doppler",
    code: "RAD-DOP-003",
    category: "Doppler",
    modality: "US",
    price: 2800,
    room: "US-1",
    indication: "Transient ischemic attack (TIA), syncope, carotid bruit.",
    technique: "B-mode sonography and Color Doppler flow imaging of CCA, ICA, ECA, and vertebral arteries.",
    defaultFindings: [
      "Intima-Media: Bilateral CCA intima-media thickness (IMT) is 0.7mm (normal).",
      "Plaque: No hemodynamically significant atheromatous plaque at carotid bifurcations.",
      "Peak Velocities: Bilateral ICA PSV < 125 cm/s without luminal stenosis.",
    ],
    defaultImpression: [
      "1. No hemodynamically significant carotid artery stenosis (<50%).",
      "2. Normal antegrade vertebral arterial flow.",
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
  {
    study: "Unilateral Digital Mammography Right/Left",
    code: "RAD-MAM-002",
    category: "Mammography",
    modality: "XR",
    price: 2200,
    room: "XR-2",
    indication: "Targeted follow-up diagnostic mammogram for focal pain or focal asymmetric density.",
    technique: "Targeted CC, MLO, and spot compression digital mammographic views.",
    defaultFindings: [
      "Target Area: Focused spot compression confirms tissue overlap without persistent mass or microcalcification.",
      "Skin & Nipple: Skin thickness and nipple-areolar complex are unremarkable.",
    ],
    defaultImpression: [
      "1. BI-RADS Category 2: Benign tissue overlap.",
      "2. No evidence of malignancy.",
    ],
  },

  // 7. FLUOROSCOPY / SPECIAL PROCEDURES
  {
    study: "Barium Swallow & Upper GI Series",
    code: "RAD-FLU-001",
    category: "Fluoroscopy / Special Procedures",
    modality: "XR",
    price: 2500,
    room: "XR-2",
    indication: "Dysphagia, epigastric heartburn, rule out esophageal stricture or hiatal hernia.",
    technique: "Real-time digital fluoroscopy following oral administration of high-density Barium sulfate suspension.",
    defaultFindings: [
      "Esophagus: Smooth mucosal contour and prompt esophageal peristalsis without stricture, mass, or reflux.",
      "Stomach & Duodenum: Normal rugal folds. C-loop of duodenum fills smoothly without ulcer crater.",
    ],
    defaultImpression: [
      "1. Normal fluoroscopic Barium swallow and upper GI examination.",
      "2. No esophageal stricture, mass, or hiatal hernia.",
    ],
  },
  {
    study: "Hysterosalpingography (HSG)",
    code: "RAD-FLU-002",
    category: "Fluoroscopy / Special Procedures",
    modality: "XR",
    price: 3000,
    room: "XR-2",
    indication: "Primary/Secondary infertility workup, evaluate tubal patency and uterine cavity.",
    technique: "Fluoroscopic spot spot imaging following gentle cervical cannulation and contrast instillation.",
    defaultFindings: [
      "Uterine Cavity: Triangular and well-filled without filling defect or synechiae.",
      "Fallopian Tubes: Both fallopian tubes fill promptly with smooth lumen and bilateral free peritoneal spill.",
    ],
    defaultImpression: [
      "1. Normal uterine cavity.",
      "2. Bilateral patent fallopian tubes with free peritoneal contrast spill.",
    ],
  },
  {
    study: "Intravenous Pyelogram (IVP) / Urogram",
    code: "RAD-FLU-003",
    category: "Fluoroscopy / Special Procedures",
    modality: "XR",
    price: 3200,
    room: "XR-2",
    indication: "Recurrent flank pain, gross hematuria, suspected ureteric stricture or obstruction.",
    technique: "Serial fluoroscopic radiography at 5, 15, and 30 minutes following 50mL non-ionic IV contrast.",
    defaultFindings: [
      "Excretion: Prompt symmetrical renal contrast excretion bilaterally at 5 minutes.",
      "Collecting System: Normal pelvicalyceal systems and ureters without filling defect, stricture, or stone.",
      "Bladder: Smooth bladder filling with complete post-void emptying.",
    ],
    defaultImpression: [
      "1. Normal bilateral renal contrast excretion and patent ureters.",
      "2. No evidence of urinary tract obstruction.",
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
  status: "Orders" | "Scheduled" | "In Progress" | "Done" | "Images Ready" | "Reporting" | "Final"
}

const QUEUE_TABS = [
  { label: "All Active Orders", key: "all" },
  { label: "🕒 Awaiting Scan (Ready)", key: "awaiting_scan" },
  { label: "⚡ Scanning Ongoing", key: "in_progress" },
  { label: "⚠️ Payment Pending", key: "pending" },
  { label: "🚨 STAT Emergency", key: "stat" },
  { label: "✓ Completed & Signed", key: "completed" },
]

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function printRadiologyDocument(study: RadiologyStudyRecord, defaultCatalog?: ImagingCatalogItem[]): void {
  const catalogMatch = defaultCatalog?.find((c) => c.study === study.study) || IMAGING_CATALOG[0]
  
  const findingsRaw = study.findings && study.findings.length > 0
    ? (Array.isArray(study.findings) ? study.findings.join("\n") : String(study.findings))
    : catalogMatch.defaultFindings.join("\n")

  const impressionRaw = study.impression && study.impression.length > 0
    ? (Array.isArray(study.impression) ? study.impression.join("\n") : String(study.impression))
    : catalogMatch.defaultImpression.join("\n")

  const patientName = escapeHtml(study.patient || "Patient")
  const accessionNo = escapeHtml(study.accessionNo || "RAD-ACC-8801")
  const umr = escapeHtml(study.umr || `PAT-${study.mrn}`)
  const mrn = escapeHtml(study.mrn || "")
  const encounterId = escapeHtml(study.encounterId || `ENC-${study.mrn}`)
  const referringDoc = escapeHtml(study.provider || "Attending Physician")
  const department = escapeHtml(study.department || "Outpatient")
  const billingStatus = escapeHtml(`${study.paymentStatus || "Paid"} (₹${study.price || 0})`)
  const receiptRef = escapeHtml(study.paidReceiptNo || study.digitalReceiptRef || "RCPT-2026-8331")
  const studyTitle = escapeHtml(study.study || "Diagnostic Imaging Study")
  const modality = escapeHtml(study.modality || "XR")
  const suite = escapeHtml(study.room || "Suite 1")
  const digitalLink = escapeHtml(study.digitalStudyUrl ? "Attached" : `PACS://${study.accessionNo || "RAD-8801"}`)
  const indication = escapeHtml(study.indication || catalogMatch.indication || "Clinical indication not specified.")
  const technique = escapeHtml(study.technique || catalogMatch.technique || "Standard diagnostic protocol.")
  const dateStr = escapeHtml(study.signedAt || study.ordered || new Date().toLocaleDateString("en-IN"))
  const statusStr = escapeHtml((study.status || "REPORTING").toUpperCase())
  const techNotes = escapeHtml(study.technicianNotes || "Diagnostic imaging scan performed per protocol. DICOM images ingested into PACS.")
  const techName = escapeHtml(study.technician || "Radiology Technologist")
  const techSig = escapeHtml(study.technicianSignature || "TECH-SIG-88012")
  const radName = escapeHtml(study.radiologist || "Dr. Laura Kim, MD")

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Radiology Report - ${accessionNo} - ${patientName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 16mm 14mm 16mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-block {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .brand-left {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .brand-logo {
      width: 32px;
      height: 32px;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      border-radius: 4px;
      flex-shrink: 0;
    }
    .brand-title {
      font-size: 15pt;
      font-weight: 900;
      letter-spacing: -0.3px;
      text-transform: uppercase;
      color: #020617;
      margin: 0;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #334155;
      margin-top: 2px;
    }
    .brand-addr {
      font-size: 7pt;
      color: #64748b;
      margin-top: 2px;
    }
    .brand-meta {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 8pt;
      line-height: 1.4;
      white-space: nowrap;
    }
    .meta-acc {
      font-weight: 800;
      color: #020617;
      font-size: 8.5pt;
    }
    .meta-status {
      font-weight: 800;
      color: #15803d;
      font-size: 8pt;
      text-transform: uppercase;
    }
    .demographics-table {
      width: 100%;
      border-collapse: collapse;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      margin-bottom: 12px;
      font-size: 8.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .demographics-table td {
      padding: 5px 8px;
      vertical-align: top;
      border: 1px solid #e2e8f0;
      line-height: 1.4;
    }
    .study-banner {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .study-heading {
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #020617;
      margin: 0 0 4px 0;
    }
    .study-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 8pt;
      color: #334155;
      margin-bottom: 3px;
    }
    .study-detail {
      font-size: 8pt;
      color: #334155;
      margin-top: 2px;
    }
    .section-header {
      font-size: 9pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #020617;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
      margin-top: 10px;
      margin-bottom: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }
    .findings-container {
      white-space: pre-wrap;
      font-size: 9.5pt;
      line-height: 1.6;
      color: #1e293b;
      margin-bottom: 12px;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .impression-container {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 3.5px solid #0284c7;
      padding: 8px 10px;
      margin: 10px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .impression-title {
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #0369a1;
      margin-bottom: 3px;
    }
    .impression-body {
      white-space: pre-wrap;
      font-size: 9pt;
      font-weight: 600;
      line-height: 1.5;
      color: #0f172a;
      word-wrap: break-word;
    }
    .tech-box {
      background: #faf5ff;
      border: 1px solid #e9d5ff;
      padding: 6px 8px;
      font-size: 8pt;
      color: #581c87;
      margin: 8px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signatures-block {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1.5px solid #0f172a;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-left, .sig-right {
      font-size: 8pt;
      line-height: 1.35;
    }
    .sig-right {
      text-align: right;
    }
    .sig-name {
      font-weight: 800;
      font-size: 9pt;
      color: #020617;
    }
    .sig-role {
      font-weight: 600;
      color: #475569;
    }
    .sig-reg {
      font-size: 7.5pt;
      color: #94a3b8;
    }
    .disclaimer-text {
      text-align: center;
      font-size: 7pt;
      color: #94a3b8;
      margin-top: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="header-block">
    <div class="brand-left">
      <div class="brand-logo">+</div>
      <div>
        <h1 class="brand-title">IMPERIAL HOSPITALS</h1>
        <div class="brand-sub">A Unit of Mukunda Healthcare Pvt Ltd • Department of Radiology &amp; Imaging</div>
        <div class="brand-addr"># 27-14-13/A, Opp. Ganesh Canteen Street, Beside Bhasyam School, Bhimavaram • Ph: 08816-279999 • GSTIN: 37AALCM2238A1ZQ</div>
      </div>
    </div>
    <div class="brand-meta">
      <div class="meta-acc">ACCESSION: ${accessionNo}</div>
      <div style="color: #475569; font-weight: 600;">Date: ${dateStr}</div>
      <div class="meta-status">STATUS: ${statusStr}</div>
    </div>
  </div>

  <table class="demographics-table">
    <tr>
      <td style="width: 50%;">
        Patient Name: <strong style="color: #020617; font-size: 9pt;">${patientName}</strong><br />
        UMR Number: <strong style="font-family: monospace;">${umr}</strong><br />
        MRN Number: <strong style="font-family: monospace;">${mrn}</strong><br />
        OP / IP / ER No: <strong style="font-family: monospace;">${encounterId}</strong>
      </td>
      <td style="width: 50%; text-align: right;">
        Referring Physician: <strong style="color: #020617;">${referringDoc}</strong><br />
        Department: <strong>${department}</strong><br />
        Billing Status: <strong style="color: #15803d;">${billingStatus}</strong><br />
        Digital Receipt Ref: <strong style="font-family: monospace;">${receiptRef}</strong>
      </td>
    </tr>
  </table>

  <div class="study-banner">
    <div class="study-heading">INVESTIGATION: ${studyTitle}</div>
    <div class="study-grid">
      <div>Category: <strong>${modality}</strong></div>
      <div>Scanner Suite: <strong>${suite}</strong></div>
      <div>Digital Study Link: <strong style="font-family: monospace;">${digitalLink}</strong></div>
    </div>
    <div class="study-detail"><strong>Clinical Indication:</strong> ${indication}</div>
    <div class="study-detail"><strong>Imaging Technique &amp; Protocol:</strong> ${technique}</div>
  </div>

  <div class="section-header">DIAGNOSTIC FINDINGS:</div>
  <div class="findings-container">${escapeHtml(findingsRaw)}</div>

  <div class="impression-container">
    <div class="impression-title">DIAGNOSTIC IMPRESSION:</div>
    <div class="impression-body">${escapeHtml(impressionRaw)}</div>
  </div>

  ${techNotes ? `
  <div class="tech-box">
    <strong>Technician Operational Report:</strong> ${techNotes}
  </div>` : ""}

  <div class="signatures-block">
    <div class="sig-left">
      <div class="sig-role">Radiology Technologist</div>
      <div class="sig-name">${techName}</div>
      <div class="sig-reg">Signature Ref: ${techSig}</div>
    </div>
    <div class="sig-right">
      <div class="sig-name">${radName}</div>
      <div class="sig-role">Senior Consultant Radiologist</div>
      <div class="sig-reg">Reg No: MCI-RAD-77109</div>
    </div>
  </div>

  <div class="disclaimer-text">
    * This is an official digital diagnostic report issued by the Department of Radiology. Suggested clinical correlation and further evaluation.
  </div>
</body>
</html>`

  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(html)
  doc.close()

  setTimeout(() => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      try {
        document.body.removeChild(iframe)
      } catch {}
    }, 2000)
  }, 300)
}

export default function Radiology({
  technician = "Radiology Specialist",
  initialTab = "worklist",
}: {
  technician?: string
  initialTab?: "worklist" | "reports" | "templates"
}) {
  const [tick, setTick] = useState(0)
  const [mainTab, setMainTab] = useState<"worklist" | "reports" | "templates">(initialTab)

  useEffect(() => {
    if (initialTab) {
      setMainTab(initialTab)
    }
  }, [initialTab])

  const [activeQueue, setActiveQueue] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [reportsSearchQuery, setReportsSearchQuery] = useState("")
  const [modalityFilter, setModalityFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    type: "success" | "error" | "info"
  } | null>(null)

  // Action: Mark scanning test as DONE
  const handleMarkStudyDone = (studyId: string, studyName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      BillingDatabase.updateRadiologyStudy(studyId, { status: "Done" })
      showToast(`✓ Marked "${studyName}" as DONE! Moved to Radiology Reports.`, "success")
      setTick((t) => t + 1)
    } catch (err: any) {
      showToast(err.message || "Failed to update study status", "error")
    }
  }

  // Modality Room Status State (Persisted in LocalStorage)
  const [modalitySuites, setModalitySuites] = useState(() => {
    try {
      const saved = localStorage.getItem("hospai_rad_modality_suites_v1")
      if (saved) return JSON.parse(saved)
    } catch {}
    return [
      { label: "CT Scanner 1 (64-Slice)", room: "CT-1", status: "Available" },
      { label: "CT Scanner 2 (128-Slice)", room: "CT-2", status: "Available" },
      { label: "MRI Suite 1 (3.0T)", room: "MR-1", status: "Available" },
      { label: "Digital X-Ray 1", room: "XR-1", status: "Available" },
      { label: "Digital X-Ray 2", room: "XR-2", status: "Available" },
      { label: "Ultrasound Suite 1", room: "US-1", status: "Available" },
      { label: "Echo / Doppler Suite", room: "Echo-1", status: "Available" },
    ]
  })

  // Toggle Room Suite Status & Persist
  const toggleSuiteStatus = (index: number) => {
    setModalitySuites((prev: any[]) => {
      const next = prev.map((suite, idx) =>
        idx === index
          ? { ...suite, status: suite.status === "Available" ? "In Use" : "Available" }
          : suite
      )
      try {
        localStorage.setItem("hospai_rad_modality_suites_v1", JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // Modals state
  const [showMasterModal, setShowMasterModal] = useState(false)
  const [masterActiveTab, setMasterActiveTab] = useState<string>("all")
  const [showSubmitArtifactsModal, setShowSubmitArtifactsModal] = useState<RadiologyStudyRecord | null>(null)
  const [showNewOrderModal, setShowNewOrderModal] = useState(false)
  const [showAddStudyModal, setShowAddStudyModal] = useState<PatientStudyGroup | null>(null)
  const [activeReportStudy, setActiveReportStudy] = useState<RadiologyStudyRecord | null>(null)
  const [activePdfStudy, setActivePdfStudy] = useState<RadiologyStudyRecord | null>(null)
  const [showUploadTemplateModal, setShowUploadTemplateModal] = useState(false)
  const [templateUploadForm, setTemplateUploadForm] = useState({
    testName: "Ultrasound Whole Abdomen",
    customName: "",
    templateName: "",
    genderTarget: "All" as "All" | "Male" | "Female",
    category: "Ultrasound" as "X-Ray" | "CT Scan" | "MRI" | "Ultrasound (USG)" | "Ultrasound" | "Echocardiography" | "Doppler" | "Mammography" | "Fluoroscopy / Special Procedures" | "Other",
    rawContent: "",
    fileName: "",
  })

  // Save Uploaded / Pasted Radiology Report Template
  const handleSaveUploadedTemplate = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const targetTestName = templateUploadForm.testName === "custom" ? templateUploadForm.customName.trim() : templateUploadForm.testName.trim()

    if (!targetTestName) {
      showToast("Please select or enter a Test Name", "error")
      return
    }
    if (!templateUploadForm.rawContent.trim()) {
      showToast("Please enter or paste template content", "error")
      return
    }

    try {
      const existingTest = RadiologyTemplateDatabase.getTestByName(targetTestName)
      const catItem = IMAGING_CATALOG.find((c) => c.study.toLowerCase() === targetTestName.toLowerCase())
      const testCategory = templateUploadForm.category && templateUploadForm.category !== "Ultrasound (USG)"
        ? templateUploadForm.category
        : (catItem ? catItem.category : (targetTestName.toLowerCase().includes("x-ray") || targetTestName.toLowerCase().includes("xr") ? "X-Ray" : templateUploadForm.category || "X-Ray"))
      const test = RadiologyTemplateDatabase.saveTest({
        id: existingTest?.id,
        name: targetTestName,
        category: (testCategory as any) || "X-Ray",
      })

      RadiologyTemplateDatabase.saveTemplate(test.id, [], {
        rawContent: templateUploadForm.rawContent.trim(),
        uploadedFileName: templateUploadForm.fileName || templateUploadForm.templateName || `${targetTestName.replace(/\s+/g, "_")}_Template.txt`,
        genderTarget: templateUploadForm.genderTarget || "All",
        status: "Active",
      })

      if (activeReportStudy) {
        setReportingForm((prev) => ({
          ...prev,
          findings: templateUploadForm.rawContent.trim().split("\n"),
        }))
      }

      showToast(`✓ Template for "${targetTestName}" (${templateUploadForm.genderTarget}) saved and activated successfully!`, "success")
      setTick((t) => t + 1)
      setShowUploadTemplateModal(false)
      setTemplateUploadForm({
        testName: "Chest X-Ray PA/Lateral",
        customName: "",
        templateName: "",
        genderTarget: "All",
        category: "X-Ray",
        rawContent: "",
        fileName: "",
      })
    } catch (err: any) {
      showToast(err.message || "Failed to save template", "error")
    }
  }

  // Direct PDF / Document template import from within the Report Editor
  const handleEditorDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeReportStudy) return

    showToast(`Reading and parsing "${file.name}"...`, "info")
    const lowerName = file.name.toLowerCase()

    try {
      if (lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
        const reader = new FileReader()
        reader.onload = async (ev) => {
          const buf = ev.target?.result as ArrayBuffer
          if (buf) {
            try {
              const extracted = await extractTextFromWordBuffer(buf, file.name)
              if (extracted && extracted.trim()) {
                setReportingForm((prev) => ({
                  ...prev,
                  findings: extracted.trim().split("\n"),
                }))
                try {
                  const test = RadiologyTemplateDatabase.saveTest({
                    name: activeReportStudy.study,
                    category: (activeReportStudy as any).category || "X-Ray",
                  })
                  RadiologyTemplateDatabase.saveTemplate(test.id, [], {
                    rawContent: extracted.trim(),
                    uploadedFileName: file.name,
                    uploadedFileType: "word",
                    status: "Active",
                    genderTarget: "All",
                  })
                  setTick((t) => t + 1)
                } catch {}
                showToast(`✓ Extracted and loaded template from Word "${file.name}"!`, "success")
              } else {
                showToast(`No readable text found in "${file.name}"`, "error")
              }
            } catch (err: any) {
              showToast(`Failed to parse Word document: ${err?.message || err}`, "error")
            }
          }
        }
        reader.readAsArrayBuffer(file)
      } else if (lowerName.endsWith(".pdf")) {
        const reader = new FileReader()
        reader.onload = async (ev) => {
          const buf = ev.target?.result as ArrayBuffer
          if (buf) {
            try {
              const extracted = await extractTextFromPdfBuffer(buf)
              if (extracted && extracted.trim()) {
                setReportingForm((prev) => ({
                  ...prev,
                  findings: extracted.trim().split("\n"),
                }))
                try {
                  const test = RadiologyTemplateDatabase.saveTest({
                    name: activeReportStudy.study,
                    category: (activeReportStudy as any).category || "X-Ray",
                  })
                  RadiologyTemplateDatabase.saveTemplate(test.id, [], {
                    rawContent: extracted.trim(),
                    uploadedFileName: file.name,
                    uploadedFileType: "pdf",
                    status: "Active",
                    genderTarget: "All",
                  })
                  setTick((t) => t + 1)
                } catch {}
                showToast(`✓ Extracted and loaded template from PDF "${file.name}"!`, "success")
              } else {
                showToast(`No readable text layer found in PDF "${file.name}". You can paste or type template text.`, "error")
              }
            } catch (err: any) {
              showToast(`Failed to extract text from PDF: ${err?.message || err}`, "error")
            }
          }
        }
        reader.readAsArrayBuffer(file)
      } else {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const content = ev.target?.result as string
          if (content && content.trim()) {
            const cleaned = extractCleanTemplateText(file.name, content)
            setReportingForm((prev) => ({
              ...prev,
              findings: cleaned.trim().split("\n"),
            }))
            try {
              const test = RadiologyTemplateDatabase.saveTest({
                name: activeReportStudy.study,
                category: (activeReportStudy as any).category || "X-Ray",
              })
              RadiologyTemplateDatabase.saveTemplate(test.id, [], {
                rawContent: cleaned.trim(),
                uploadedFileName: file.name,
                uploadedFileType: "text",
                status: "Active",
                genderTarget: "All",
              })
              setTick((t) => t + 1)
            } catch {}
            showToast(`✓ Loaded template from "${file.name}"!`, "success")
          }
        }
        reader.readAsText(file)
      }
    } catch (err: any) {
      showToast(`Error reading file: ${err?.message || err}`, "error")
    } finally {
      e.target.value = ""
    }
  }

  // Submit Artifacts Form State
  const [artifactForm, setArtifactForm] = useState({
    digitalStudyUrl: "",
    digitalReceiptRef: "",
    technicianName: technician,
    technicianNotes: "Diagnostic imaging scan performed per protocol. High-resolution diagnostic images attached.",
    technicianSignature: `TECH-SIG-${Math.floor(10000 + Math.random() * 90000)}`,
  })

  // Open Submit Artifacts Modal
  const openSubmitArtifactsModal = (study: RadiologyStudyRecord) => {
    setArtifactForm({
      digitalStudyUrl: study.digitalStudyUrl || customUploadUrl || "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
      digitalReceiptRef: study.paidReceiptNo || study.digitalReceiptRef || `RCPT-2026-${Math.floor(5500 + Math.random() * 4000)}`,
      technicianName: study.technician || technician,
      technicianNotes: study.technicianNotes || "Diagnostic imaging scan completed cleanly per protocol. High-resolution diagnostic images attached.",
      technicianSignature: study.technicianSignature || `TECH-SIG-${Math.floor(10000 + Math.random() * 90000)}`,
    })
    setShowSubmitArtifactsModal(study)
  }

  // Save Radiology Completed Artifacts
  const handleSaveArtifacts = (e: React.FormEvent) => {
    e.preventDefault()
    if (!showSubmitArtifactsModal) return
    try {
      const receiptNo =
        artifactForm.digitalReceiptRef.trim() ||
        showSubmitArtifactsModal.paidReceiptNo ||
        `RCPT-2026-${Math.floor(5500 + Math.random() * 4000)}`

      BillingDatabase.updateRadiologyStudy(showSubmitArtifactsModal.id, {
        digitalStudyUrl: artifactForm.digitalStudyUrl || customUploadUrl || "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
        paidReceiptNo: receiptNo,
        digitalReceiptRef: receiptNo,
        technician: artifactForm.technicianName || technician,
        technicianNotes: artifactForm.technicianNotes,
        technicianSignature: artifactForm.technicianSignature,
        status: "Images Ready",
        paymentStatus: "Paid",
      })

      // Free room back to Available
      setModalitySuites((prev: any[]) => {
        const next = prev.map((m: any) => (m.room === showSubmitArtifactsModal.room ? { ...m, status: "Available" as const } : m))
        try {
          localStorage.setItem("hospai_rad_modality_suites_v1", JSON.stringify(next))
        } catch {}
        return next
      })

      setShowSubmitArtifactsModal(null)
      showToast("✓ Digital Imaging Study, Digital Receipt, & Technician Signed Report attached successfully!", "success")
      AuditDatabase.logEvent(
        "Radiology Artifacts Submitted",
        "Radiology",
        `Technician ${artifactForm.technicianName} submitted digital study, receipt ${receiptNo}, and signed report for ${showSubmitArtifactsModal.patient} (${showSubmitArtifactsModal.study}).`,
        "Success"
      )
    } catch {
      showToast("Failed to submit radiology artifacts", "error")
    }
  }

  // PACS Viewer Simulator State
  const [pacsSlice, setPacsSlice] = useState(1)
  const [pacsPreset, setPacsPreset] = useState<"soft" | "bone" | "lung" | "brain" | "angio">("soft")
  const [pacsZoom, setPacsZoom] = useState(1)
  const [pacsInvert, setPacsInvert] = useState(false)
  const [pacsBrightness, setPacsBrightness] = useState(100)
  const [pacsContrast, setPacsContrast] = useState(100)
  const [pacsRotation, setPacsRotation] = useState(0)
  const [pacsMeasureMode, setPacsMeasureMode] = useState(false)
  const [customUploadUrl, setCustomUploadUrl] = useState<string | null>(null)

  // Form states for modals
  const [newOrderForm, setNewOrderForm] = useState({
    patient: "",
    mrn: "",
    umr: "",
    studyName: IMAGING_CATALOG[0].study,
    priority: "Routine" as "STAT" | "Routine" | "Elective",
    provider: "Dr. Vikram Seth (Emergency)",
    department: "Emergency Medicine",
    paymentStatus: "Paid" as "Paid" | "Payment Pending",
  })

  const [reportingForm, setReportingForm] = useState({
    indication: "",
    technique: "",
    findings: [] as string[],
    impression: [] as string[],
    comparison: "",
    radiologist: "Dr. Laura Kim, MD · Senior Consultant Radiologist",
    reportStatus: "Final" as "Draft" | "Final",
  })
  const [reportEditorTheme, setReportEditorTheme] = useState<"light" | "dark">("light")

  // Subscribe to changes in BillingDatabase and RadiologyTemplateDatabase
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1)
    const unsubBilling = BillingDatabase.onUpdate(refresh)
    const unsubTemplate = RadiologyTemplateDatabase.onUpdate(refresh)
    let channel: BroadcastChannel | null = null
    let tplChannel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel("hospai_rad_channel")
      channel.onmessage = refresh
    } catch {}
    try {
      tplChannel = new BroadcastChannel("hospai_rad_template_channel")
      tplChannel.onmessage = refresh
    } catch {}
    return () => {
      unsubBilling()
      unsubTemplate()
      try {
        channel?.close()
      } catch {}
      try {
        tplChannel?.close()
      } catch {}
    }
  }, [])

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const registeredPatients = useMemo(() => {
    return db.getPatients()
  }, [])

  // Load all raw radiology study records
  const rawStudies = useMemo(() => {
    return BillingDatabase.getRadiologyStudies()
  }, [tick])

  // Group raw studies by Patient (1 Patient = 1 Order Group)
  const patientGroups = useMemo<PatientStudyGroup[]>(() => {
    const map = new Map<string, PatientStudyGroup>()

    rawStudies.forEach((s) => {
      const key = (s.umr || s.mrn || s.patient).toLowerCase().trim()

      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          patient: s.patient,
          mrn: s.mrn,
          umr: s.umr || `PAT-${s.mrn}`,
          encounterId: s.encounterId || `ENC-${s.mrn}`,
          department: s.department || "Radiology & Imaging",
          diagnosis: s.indication || "Diagnostic Imaging Workup",
          provider: s.provider,
          ordered: s.ordered,
          priority: s.priority,
          paymentStatus: s.paymentStatus,
          paidReceiptNo: s.paidReceiptNo,
          totalPrice: s.price,
          studies: [s],
          modalities: [s.modality],
          status: s.status,
        })
      } else {
        const grp = map.get(key)!
        const sBase = s.study.trim().toLowerCase().replace(/\s*\([^\)]*\)/g, "").trim()
        const isDuplicate = grp.studies.some(
          (existing) =>
            existing.study.trim().toLowerCase().replace(/\s*\([^\)]*\)/g, "").trim() === sBase
        )
        if (!isDuplicate) {
          grp.studies.push(s)
          grp.totalPrice += s.price
        }
        if (!grp.modalities.includes(s.modality)) {
          grp.modalities.push(s.modality)
        }
        if (s.priority === "STAT") grp.priority = "STAT"
        if (s.paymentStatus === "Payment Pending") grp.paymentStatus = "Payment Pending"
        if (!grp.paidReceiptNo && s.paidReceiptNo) grp.paidReceiptNo = s.paidReceiptNo

        const statusRank: Record<string, number> = {
          "In Progress": 5,
          "Orders": 4,
          "Scheduled": 4,
          "Done": 3,
          "Images Ready": 3,
          "Reporting": 2,
          "Final": 1,
        }
        if ((statusRank[s.status] || 0) > (statusRank[grp.status] || 0)) {
          grp.status = s.status
        }
      }
    })

    return Array.from(map.values())
  }, [rawStudies])

  // Helper to test if an order group is completed
  const isGroupCompleted = (grp: PatientStudyGroup): boolean => {
    return (
      grp.status === "Done" ||
      grp.status === "Images Ready" ||
      grp.status === "Reporting" ||
      grp.status === "Final" ||
      (grp.studies.length > 0 &&
        grp.studies.every(
          (s) =>
            s.status === "Done" ||
            s.status === "Images Ready" ||
            s.status === "Reporting" ||
            s.status === "Final"
        ))
    )
  }

  // Filter patient groups by active tab, search, modality, priority
  const filteredGroups = useMemo(() => {
    return patientGroups.filter((grp) => {
      const isCompleted = isGroupCompleted(grp)

      // 1. Queue Tab Filter
      if (activeQueue === "all" && isCompleted) return false
      if (
        (activeQueue === "awaiting_scan" || activeQueue === "paid") &&
        (grp.paymentStatus !== "Paid" || (grp.status !== "Orders" && grp.status !== "Scheduled") || isCompleted)
      )
        return false
      if (activeQueue === "pending" && (grp.paymentStatus !== "Payment Pending" || isCompleted)) return false
      if (activeQueue === "stat" && (grp.priority !== "STAT" || isCompleted)) return false
      if (activeQueue === "in_progress" && (grp.status !== "In Progress" || isCompleted)) return false
      if (activeQueue === "completed" && !isCompleted) return false

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchPatient = grp.patient.toLowerCase().includes(q)
        const matchMrn = grp.mrn.toLowerCase().includes(q)
        const matchUmr = (grp.umr || "").toLowerCase().includes(q)
        const matchDoctor = grp.provider.toLowerCase().includes(q)
        const matchStudy = grp.studies.some(
          (st) =>
            st.study.toLowerCase().includes(q) ||
            st.id.toLowerCase().includes(q) ||
            (st.accessionNo && st.accessionNo.toLowerCase().includes(q))
        )
        if (!matchPatient && !matchMrn && !matchUmr && !matchDoctor && !matchStudy) return false
      }

      // 3. Modality Filter
      if (modalityFilter !== "all") {
        const matchMod = grp.modalities.some(
          (m) => m.toLowerCase() === modalityFilter.toLowerCase()
        )
        if (!matchMod) return false
      }

      // 4. Priority Filter
      if (priorityFilter !== "all") {
        if (grp.priority !== priorityFilter) return false
      }

      return true
    })
  }, [patientGroups, activeQueue, searchQuery, modalityFilter, priorityFilter])

  // Selected Order Group for Detail View
  const selectedGroup = useMemo(() => {
    if (!selectedGroupKey) return null
    return patientGroups.find((g) => g.groupKey === selectedGroupKey) || null
  }, [patientGroups, selectedGroupKey])

  // Quick statistics
  const stats = useMemo(() => {
    const activeGroups = patientGroups.filter((g) => !isGroupCompleted(g))
    const total = activeGroups.length
    const awaitingScan = activeGroups.filter(
      (g) => g.paymentStatus === "Paid" && (g.status === "Orders" || g.status === "Scheduled")
    ).length
    const pending = activeGroups.filter((g) => g.paymentStatus === "Payment Pending").length
    const stat = activeGroups.filter((g) => g.priority === "STAT").length
    const inProgress = activeGroups.filter((g) => g.status === "In Progress").length
    const completed = patientGroups.filter(isGroupCompleted).length
    return { total, awaitingScan, paid: awaitingScan, pending, stat, inProgress, completed }
  }, [patientGroups])

  // Start Scan Protocol
  const handleStartScan = (study: RadiologyStudyRecord) => {
    if (study.paymentStatus !== "Paid") {
      showToast(
        `⚠️ Cannot start scan for ${study.patient}! Payment of ₹${study.price} is pending at Billing Desk.`,
        "error"
      )
      return
    }
    try {
      BillingDatabase.updateRadiologyStudy(study.id, { status: "In Progress" })
      setModalitySuites((prev: any[]) => {
        const next = prev.map((m: any) => (m.room === study.room ? { ...m, status: "In Use" } : m))
        try {
          localStorage.setItem("hospai_rad_modality_suites_v1", JSON.stringify(next))
        } catch {}
        return next
      })
      showToast(`⚡ Imaging scan initiated for ${study.patient} in Suite ${study.room}`, "info")
      AuditDatabase.logEvent(
        "Radiology Scan Started",
        "Radiology",
        `${technician} initiated ${study.study} scan for ${study.patient} in ${study.room}.`,
        "Success"
      )
    } catch {
      showToast("Failed to update scan status", "error")
    }
  }

  // Complete Scan & Mark Images Ready
  const handleCompleteScan = (study: RadiologyStudyRecord) => {
    try {
      BillingDatabase.updateRadiologyStudy(study.id, { status: "Images Ready" })
      setModalitySuites((prev: any[]) => {
        const next = prev.map((m: any) => (m.room === study.room ? { ...m, status: "Available" } : m))
        try {
          localStorage.setItem("hospai_rad_modality_suites_v1", JSON.stringify(next))
        } catch {}
        return next
      })
      showToast(`✓ Diagnostic DICOM images acquired & ingested into PACS for ${study.patient}`, "success")
      AuditDatabase.logEvent(
        "DICOM Ingested to PACS",
        "Radiology",
        `DICOM scan images for ${study.patient} (${study.study}) ingested into PACS.`,
        "Success"
      )
    } catch {
      showToast("Failed to update study status", "error")
    }
  }

  // Open Reporting Editor with Smart Gender & Test Template Matching
  // Open Reporting Editor with Smart Gender & Test Template Matching
  const openReportingEditor = (study: RadiologyStudyRecord) => {
    const patientObj = db.getPatients().find((p) => p.name.trim().toLowerCase() === study.patient.trim().toLowerCase() || p.umr === study.umr)
    const patientGender = patientObj?.sex || (study.patient.toLowerCase().includes("female") || study.patient.toLowerCase().includes("mrs") || study.patient.toLowerCase().includes("ms") ? "Female" : "Male")

    const matchedTemplate = RadiologyTemplateDatabase.getActiveTemplateForTest(study.study, patientGender)
    const catItem = IMAGING_CATALOG.find((c) => c.study === study.study || c.study.toLowerCase() === study.study.toLowerCase() || study.study.toLowerCase().includes(c.study.toLowerCase()) || c.study.toLowerCase().includes(study.study.toLowerCase())) || IMAGING_CATALOG[0]

    // Check if the report was explicitly edited and saved by the user (Draft or Final)
    const hasBeenSaved = (study.reportStatus === "Draft" || study.reportStatus === "Final") && study.findings && study.findings.length > 0

    let defaultFindings: string[] = []
    let defaultImpression: string[] = study.impression && study.impression.length > 0 ? study.impression : catItem.defaultImpression

    if (hasBeenSaved && study.findings && study.findings.length > 0) {
      // Preserve the exact findings that were saved by the user when editing!
      defaultFindings = study.findings
    } else if (matchedTemplate && matchedTemplate.rawContent && matchedTemplate.rawContent.trim()) {
      // Use active template for this test and gender
      defaultFindings = matchedTemplate.rawContent.trim().split("\n")
    } else if (matchedTemplate && matchedTemplate.sections && matchedTemplate.sections.length > 0) {
      defaultFindings = matchedTemplate.sections.map(
        (sec) => `${sec.title}: ${sec.fields.map((f) => f.defaultValue || "").filter(Boolean).join(", ")}`
      )
    } else if (study.findings && study.findings.length > 0) {
      defaultFindings = study.findings
    } else {
      defaultFindings = catItem.defaultFindings
    }

    setReportingForm({
      indication: study.indication || catItem.indication,
      technique: study.technique || catItem.technique,
      findings: defaultFindings,
      impression: defaultImpression,
      comparison: study.comparison || "No prior imaging studies available for interval comparison.",
      radiologist: study.radiologist || "Dr. Laura Kim, MD · Senior Consultant Radiologist",
      reportStatus: (study.reportStatus as any) || "Final",
    })
    setActiveReportStudy(study)
  }

  // Save / Finalize Report
  const handleSaveReport = (status: "Draft" | "Final") => {
    if (!activeReportStudy) return
    try {
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const updatedFindings = [...reportingForm.findings]

      BillingDatabase.updateRadiologyStudy(activeReportStudy.id, {
        indication: reportingForm.indication,
        technique: reportingForm.technique,
        findings: updatedFindings,
        impression: reportingForm.impression,
        comparison: reportingForm.comparison,
        radiologist: reportingForm.radiologist,
        reportStatus: status,
        signedAt: status === "Final" ? now : activeReportStudy.signedAt,
        status: status === "Final" ? "Final" : "Reporting",
      })

      // Also persist to RadiologyTemplateDatabase report records
      const patientObj = db.getPatients().find((p) => p.name.trim().toLowerCase() === activeReportStudy.patient.trim().toLowerCase() || p.umr === activeReportStudy.umr)
      const matchedTemplate = RadiologyTemplateDatabase.getActiveTemplateForTest(activeReportStudy.study, patientObj?.sex)

      if (status === "Final") {
        RadiologyTemplateDatabase.finalizeReport({
          studyId: activeReportStudy.id,
          patientName: activeReportStudy.patient,
          mrn: activeReportStudy.mrn,
          umr: activeReportStudy.umr,
          encounterId: activeReportStudy.encounterId,
          referringDoctor: activeReportStudy.provider,
          orderedDate: activeReportStudy.ordered,
          testId: matchedTemplate?.testId || "test_custom",
          testName: activeReportStudy.study,
          templateId: matchedTemplate?.id || "tpl_custom",
          templateVersion: matchedTemplate?.version || 1,
          templateStructure: matchedTemplate?.sections || [],
          fieldValues: { findings: updatedFindings.join("\n") },
          radiologistName: reportingForm.radiologist,
        })
      } else {
        RadiologyTemplateDatabase.saveReportDraft({
          studyId: activeReportStudy.id,
          patientName: activeReportStudy.patient,
          mrn: activeReportStudy.mrn,
          umr: activeReportStudy.umr,
          encounterId: activeReportStudy.encounterId,
          referringDoctor: activeReportStudy.provider,
          orderedDate: activeReportStudy.ordered,
          testId: matchedTemplate?.testId || "test_custom",
          testName: activeReportStudy.study,
          templateId: matchedTemplate?.id || "tpl_custom",
          templateVersion: matchedTemplate?.version || 1,
          templateStructure: matchedTemplate?.sections || [],
          fieldValues: { findings: updatedFindings.join("\n") },
          radiologistName: reportingForm.radiologist,
        })
      }

      setActiveReportStudy(null)
      setTick((t) => t + 1)
      showToast(
        status === "Final"
          ? `✓ Official radiology report signed out & finalized by ${reportingForm.radiologist}`
          : "✓ Draft radiology report saved successfully",
        "success"
      )
      AuditDatabase.logEvent(
        "Radiology Report Signed",
        "Radiology",
        `Report for ${activeReportStudy.patient} (${activeReportStudy.study}) finalized by ${reportingForm.radiologist}.`,
        "Success"
      )
    } catch {
      showToast("Failed to save report", "error")
    }
  }

  // Create New Imaging Order
  const handleCreateNewOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrderForm.patient.trim()) {
      showToast("Please enter patient name", "error")
      return
    }

    const catItem = IMAGING_CATALOG.find((c) => c.study === newOrderForm.studyName) || IMAGING_CATALOG[0]
    const isPaid = newOrderForm.paymentStatus === "Paid"
    const receiptNo = isPaid ? `RCPT-2026-${Math.floor(5500 + Math.random() * 4000)}` : undefined

    const created = BillingDatabase.createRadiologyStudy({
      patient: newOrderForm.patient,
      mrn: newOrderForm.mrn || `${Math.floor(10000 + Math.random() * 90000)}`,
      umr: newOrderForm.umr || `PAT-${Math.floor(10000 + Math.random() * 90000)}`,
      study: newOrderForm.studyName,
      modality: catItem.modality,
      priority: newOrderForm.priority,
      ordered: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      provider: newOrderForm.provider,
      department: newOrderForm.department,
      status: "Orders",
      room: catItem.room,
      price: catItem.price ?? 0,
      paymentStatus: newOrderForm.paymentStatus,
      paidReceiptNo: receiptNo,
      paidAt: isPaid ? new Date().toISOString() : undefined,
      indication: catItem.indication,
      technique: catItem.technique,
      findings: catItem.defaultFindings,
      impression: catItem.defaultImpression,
    })

    setShowNewOrderModal(false)
    showToast(`✓ New radiology order ${created.id} created for ${created.patient}. Sent to billing!`, "success")
    AuditDatabase.logEvent(
      "Radiology Order Created",
      "Radiology",
      `New study ${created.study} ordered for ${created.patient} (${created.mrn}).`,
      "Success"
    )
  }

  // Add Study Manually to Existing Patient Order
  const handleAddStudyToPatient = (studyName: string) => {
    if (!showAddStudyModal) return
    const first = showAddStudyModal.studies[0]
    const catItem = IMAGING_CATALOG.find((c) => c.study === studyName) || IMAGING_CATALOG[0]

    BillingDatabase.createRadiologyStudy({
      patient: first.patient,
      mrn: first.mrn,
      umr: first.umr,
      encounterId: first.encounterId,
      study: catItem.study,
      modality: catItem.modality,
      priority: showAddStudyModal.priority,
      ordered: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      provider: first.provider,
      department: first.department,
      status: "Orders",
      room: catItem.room,
      price: catItem.price ?? 0,
      paymentStatus: showAddStudyModal.paymentStatus,
      paidReceiptNo: showAddStudyModal.paidReceiptNo,
      indication: catItem.indication,
      technique: catItem.technique,
      findings: catItem.defaultFindings,
      impression: catItem.defaultImpression,
    })

    setShowAddStudyModal(null)
    showToast(`✓ "${catItem.study}" added to patient order for ${first.patient}!`, "success")
  }

  // Export CSV Worklist
  const handleExportCSV = () => {
    if (patientGroups.length === 0) {
      showToast("No study records to export", "info")
      return
    }
    const headers = [
      "Study ID",
      "Accession No",
      "Patient Name",
      "MRN",
      "UMR",
      "Modality",
      "Study Name",
      "Priority",
      "Room / Suite",
      "Payment Status",
      "Radiology Status",
      "Ordering Doctor",
      "Price (INR)",
    ]
    const rows = rawStudies.map((s) => [
      s.id,
      s.accessionNo || "—",
      `"${s.patient}"`,
      s.mrn,
      s.umr || "—",
      s.modality,
      `"${s.study}"`,
      s.priority,
      s.room,
      s.paymentStatus,
      s.status,
      `"${s.provider}"`,
      s.price,
    ])
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `Hospital_Radiology_Worklist_${new Date().toISOString().split("T")[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast("✓ Radiology worklist exported to CSV", "success")
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F4F6F9] overflow-y-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-none shadow-lg text-xs font-bold text-white flex items-center gap-2 animate-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === "success"
              ? "bg-emerald-700"
              : toastMessage.type === "error"
              ? "bg-red-700"
              : "bg-blue-700"
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner / Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
              Diagnostic Radiology
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-600 font-medium">Diagnostic & Imaging Suite</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mt-0.5">
            Radiology Portal
          </h1>
        </div>

        <div className="flex items-center gap-3">

          <div className="text-right border-r pr-3 border-gray-200 hidden sm:block">
            <span className="text-[10.5px] text-gray-400 block font-medium">Logged in Specialist</span>
            <span className="text-xs font-bold text-gray-800">{technician}</span>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-none transition-colors flex items-center gap-1 border border-slate-300"
          >
            <span>📥</span> Export CSV
          </button>
          <button
            onClick={() => setShowMasterModal(true)}
            className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-none transition-colors flex items-center gap-1 border border-slate-300"
          >
            <span>📖</span> Investigation Master
          </button>
        </div>
      </div>

      {/* Quick Statistics Strip */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
        <div className="p-2 rounded-none bg-gray-50 border border-gray-200">
          <span className="text-gray-500 block text-[10.5px] font-medium">Active Orders</span>
          <strong className="text-base font-bold text-gray-900">{stats.total}</strong>
        </div>
        <div className="p-2 rounded-none bg-emerald-50/60 border border-emerald-200">
          <span className="text-emerald-800 block text-[10.5px] font-medium">Pre-Paid (Ready)</span>
          <strong className="text-base font-bold text-emerald-900">{stats.paid}</strong>
        </div>
        <div className="p-2 rounded-none bg-amber-50/60 border border-amber-200">
          <span className="text-amber-800 block text-[10.5px] font-medium">Awaiting Billing</span>
          <strong className="text-base font-bold text-amber-900">{stats.pending}</strong>
        </div>
        <div className="p-2 rounded-none bg-rose-50/60 border border-rose-200">
          <span className="text-rose-800 block text-[10.5px] font-medium">STAT Emergency</span>
          <strong className="text-base font-bold text-rose-900">{stats.stat}</strong>
        </div>
        <div className="p-2 rounded-none bg-indigo-50/60 border border-indigo-200">
          <span className="text-indigo-800 block text-[10.5px] font-medium">Completed & Signed</span>
          <strong className="text-base font-bold text-indigo-900">{stats.completed}</strong>
        </div>
      </div>

      {/* Primary Work Area */}
      <div className="flex-1 flex flex-col p-6 space-y-4">
        {mainTab === "worklist" && (
          <>

        {selectedGroup ? (
          /* ========================================================================= */
          /* PATIENT DETAILS & ORDERED STUDIES VIEW                                    */
          /* ========================================================================= */
          <div className="flex-1 bg-white rounded-none shadow-xs border border-gray-200 flex flex-col overflow-hidden">
            {/* Header / Actions Bar (Clean Eye-Friendly Soft Light Theme) */}
            <div className="bg-white text-gray-900 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedGroupKey(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-none border border-slate-300 transition-colors flex items-center gap-1.5"
                >
                  <span>←</span> Back to Patient List
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">{selectedGroup.patient}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 font-mono border border-slate-200">
                      {selectedGroup.umr || `PAT-${selectedGroup.mrn}`}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-none font-semibold ${
                        selectedGroup.paymentStatus === "Paid"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      Billing: {selectedGroup.paymentStatus}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 mt-0.5 block">
                    Visit: {selectedGroup.encounterId} · Order Group: {selectedGroup.groupKey}
                  </span>
                </div>
              </div>

              {/* Action Buttons (Clean executive layout) */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    selectedGroup.studies.forEach((st) => {
                      if (st.status !== "Done" && st.status !== "Images Ready" && st.status !== "Reporting" && st.status !== "Final") {
                        BillingDatabase.updateRadiologyStudy(st.id, { status: "Done" })
                      }
                    })
                    showToast(`✓ Marked tests as DONE for ${selectedGroup.patient}! Returned to Radiology Department.`, "success")
                    setTick((t) => t + 1)
                    setSelectedGroupKey(null)
                    setMainTab("worklist")
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-none shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <span>✓</span> Mark Done
                </button>
                <button
                  onClick={() => setShowAddStudyModal(selectedGroup)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-none transition-colors flex items-center gap-1.5"
                >
                  <span>➕</span> Add Study
                </button>
              </div>
            </div>

            {/* Patient Clinical Info Card */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block text-[11px] font-medium">Ordering Physician</span>
                <strong className="text-gray-900">{selectedGroup.provider}</strong>
                <span className="text-gray-600 block text-[11px]">{selectedGroup.department}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] font-medium">Clinical Diagnosis / Indication</span>
                <strong className="text-gray-900">{selectedGroup.diagnosis || "Diagnostic Imaging Evaluation"}</strong>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] font-medium">Priority & Room</span>
                <span className="text-gray-800 font-semibold">
                  {selectedGroup.priority === "STAT" ? (
                    <span className="text-red-700 font-bold">⚡ STAT Emergency</span>
                  ) : (
                    "Routine"
                  )}
                  {" · Suite: "}
                  {selectedGroup.studies.map((s) => s.room).join(", ")}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] font-medium">Payment Reference</span>
                {selectedGroup.paymentStatus === "Paid" ? (
                  <span className="text-emerald-800 font-semibold">
                    ✓ Paid ({selectedGroup.paidReceiptNo || "RCPT-2026-5501"}) · ₹{selectedGroup.totalPrice}
                  </span>
                ) : (
                  <span className="text-amber-800 font-semibold">
                    ⚠️ Unpaid (₹{selectedGroup.totalPrice}) · Pending at Billing Desk
                  </span>
                )}
              </div>
            </div>

            {/* Warning Banner if Billing is Pending */}
            {selectedGroup.paymentStatus === "Payment Pending" && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    <strong>Payment Pending in Billing Desk:</strong> Imaging studies are listed as ordered by the doctor. Scanner suite acquisition and report dictation are restricted until billing is settled.
                  </span>
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-none border border-amber-300">
                  Awaiting Billing Settlement
                </span>
              </div>
            )}

             {/* Ordered Studies Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                    Ordered Diagnostic Scans ({selectedGroup.studies.length})
                  </h3>
                  <span className="text-xs text-gray-500">
                    Physician prescribed & imaging suite add-on studies
                  </span>
                </div>
                <button
                  onClick={() => setShowAddStudyModal(selectedGroup)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-none shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>➕</span> Add Study
                </button>
              </div>

              <div className="border border-gray-200 rounded-none overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-4">Study Name & Code</th>
                      <th className="py-2.5 px-4">Modality & Suite</th>
                      <th className="py-2.5 px-4">Urgency</th>
                      <th className="py-2.5 px-4">Price</th>
                      <th className="py-2.5 px-4">Billing Status</th>
                      <th className="py-2.5 px-4">Scan Status</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {selectedGroup.studies.map((study) => {
                      const isPaid = study.paymentStatus === "Paid"
                      const catItem = IMAGING_CATALOG.find((c) => c.study === study.study)

                      return (
                        <tr key={study.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <strong className="text-gray-900 block text-xs">{study.study}</strong>
                            <span className="text-[11px] text-gray-500 font-medium font-mono">
                              {catItem?.code || study.id} • Accession: {study.accessionNo || "RAD-ACC-8801"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-none bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold uppercase mr-1.5">
                              {study.modality}
                            </span>
                            <span className="text-gray-600 font-mono text-[11px]">{study.room}</span>
                          </td>
                          <td className="py-3 px-4">
                            {study.priority === "STAT" ? (
                              <span className="px-2 py-0.5 rounded-none bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[10.5px]">
                                ⚡ STAT
                              </span>
                            ) : (
                              <span className="text-gray-500 text-[11px]">Routine</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-gray-800">
                            ₹{study.price}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-none font-bold text-[11px] inline-flex items-center gap-1 ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              <span>●</span> {isPaid ? "Paid" : "Pending"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-none text-[11px] font-bold border ${
                                study.status === "Final" || study.status === "Images Ready" || study.status === "Reporting" || study.status === "Done"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : study.status === "In Progress"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {study.status === "Final"
                                ? "✓ Signed Report"
                                : study.status === "Done" || study.status === "Images Ready" || study.status === "Reporting"
                                ? "✓ Done"
                                : study.status === "In Progress"
                                ? "⚡ Processing"
                                : "🕒 Waiting for Scan"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!isPaid ? (
                              <span className="px-3 py-1 text-xs font-semibold text-gray-400 bg-gray-100 rounded-none border border-gray-200 cursor-not-allowed">
                                Restricted
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {(study.status === "Orders" || study.status === "Scheduled") && (
                                  <button
                                    onClick={() => {
                                      BillingDatabase.updateRadiologyStudy(study.id, { status: "In Progress" })
                                      showToast(`⚡ Started scanning for "${study.study}"`, "info")
                                      setTick((t) => t + 1)
                                    }}
                                    className="px-3 py-1 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-none transition-colors shadow-2xs"
                                  >
                                    Start Scanning
                                  </button>
                                )}
                                {study.status === "In Progress" && (
                                  <button
                                    onClick={() => {
                                      BillingDatabase.updateRadiologyStudy(study.id, { status: "Done" })
                                      showToast(`✓ Process completed for "${study.study}"`, "success")
                                      setTick((t) => t + 1)
                                    }}
                                    className="px-3 py-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-none transition-colors shadow-2xs"
                                  >
                                    Complete Process
                                  </button>
                                )}
                                {(study.status === "Done" || study.status === "Images Ready" || study.status === "Reporting" || study.status === "Final") && (
                                  <span className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-none inline-flex items-center gap-1">
                                    ✓ Done
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Banner when all tests for patient are completed */}
              {selectedGroup.studies.every((st) => st.status === "Done" || st.status === "Images Ready" || st.status === "Reporting" || st.status === "Final") && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-none flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-none bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        All Tests Completed
                      </h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        All prescribed scans for {selectedGroup.patient} are complete. Click "MARK DONE" to finalize and return to the patient worklist for the next patient.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      selectedGroup.studies.forEach((st) => {
                        if (st.status !== "Done" && st.status !== "Images Ready" && st.status !== "Reporting" && st.status !== "Final") {
                          BillingDatabase.updateRadiologyStudy(st.id, { status: "Done" })
                        }
                      })
                      showToast(`✓ Marked tests as DONE for ${selectedGroup.patient}! Returned to Radiology Department.`, "success")
                      setTick((t) => t + 1)
                      setSelectedGroupKey(null)
                      setMainTab("worklist")
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-none shadow-xs transition-colors flex items-center gap-2"
                  >
                    <span>✓</span> MARK DONE (Return to Patient List) →
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* RADIOLOGY PATIENT LIST VIEW                                               */
          /* ========================================================================= */
          <div className="flex-1 bg-white rounded-none shadow-xs border border-gray-200 flex flex-col overflow-hidden">
            {/* Filter Tabs */}
            <div className="border-b border-gray-200 px-6 pt-3 flex items-center justify-between overflow-x-auto bg-gray-50/50">
              <div className="flex items-center gap-1">
                {QUEUE_TABS.map((tab) => {
                  const isActive = activeQueue === tab.key
                  let count = 0
                  if (tab.key === "all") count = stats.total
                  if (tab.key === "awaiting_scan" || tab.key === "paid") count = stats.awaitingScan
                  if (tab.key === "pending") count = stats.pending
                  if (tab.key === "stat") count = stats.stat
                  if (tab.key === "in_progress") count = stats.inProgress
                  if (tab.key === "completed") count = stats.completed

                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveQueue(tab.key)}
                      className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                        isActive
                          ? "border-blue-700 text-blue-700 bg-white shadow-2xs rounded-none"
                          : "border-transparent text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10.5px] px-1.5 py-0.2 rounded-none ${
                          isActive ? "bg-blue-100 text-blue-800" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Search and Secondary Filter Bar */}
            <div className="p-4 border-b border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[280px] max-w-md relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Patient Name, UMR ID, Doctor..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-none border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span>Modality:</span>
                  <select
                    value={modalityFilter}
                    onChange={(e) => setModalityFilter(e.target.value)}
                    className="text-xs font-semibold px-2.5 py-1.5 border rounded-none bg-white"
                  >
                    <option value="all">All Modalities</option>
                    <option value="xr">Digital X-Ray (XR)</option>
                    <option value="ct">Multi-Slice CT (CT)</option>
                    <option value="mr">3.0T MRI (MR)</option>
                    <option value="us">Ultrasound & Echo (US)</option>
                    <option value="nm">Nuclear Medicine (NM)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span>Priority:</span>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="text-xs font-semibold px-2.5 py-1.5 border rounded-none bg-white"
                  >
                    <option value="all">All Priorities</option>
                    <option value="STAT">⚡ STAT Emergency</option>
                    <option value="Routine">Routine</option>
                    <option value="Elective">Elective</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Patients Table */}
            <div className="flex-1 overflow-y-auto">
              {filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                  <div className="w-12 h-12 rounded-none bg-gray-100 flex items-center justify-center text-2xl mb-2">
                    🩻
                  </div>
                  <h3 className="text-sm font-bold text-gray-700">No Radiology Orders Found</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                    Imaging studies ordered by doctors or walk-ins created here will appear on this worklist.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4">Patient Name</th>
                      <th className="py-2.5 px-4">UMR ID</th>
                      <th className="py-2.5 px-4">Ordering Doctor</th>
                      <th className="py-2.5 px-4">Billing Status</th>
                      <th className="py-2.5 px-4">Date &amp; Time</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredGroups.map((grp) => {
                      const isPaid = grp.paymentStatus === "Paid"
                      const isStat = grp.priority === "STAT"
                      const firstStudy = grp.studies[0]

                      return (
                        <tr
                          key={grp.groupKey}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedGroupKey(grp.groupKey)}
                        >
                          {/* Patient Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <strong className="text-gray-900 block text-xs font-bold">
                                {grp.patient}
                              </strong>
                              {isStat && (
                                <span className="px-1.5 py-0.2 rounded-none text-[10px] font-extrabold bg-red-700 text-white">
                                  ⚡ STAT
                                </span>
                              )}
                            </div>
                          </td>

                          {/* UMR ID */}
                          <td className="py-3 px-4 font-mono font-semibold text-blue-700 text-xs">
                            {grp.umr || `PAT-${grp.mrn}`}
                          </td>

                          {/* Doctor */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-gray-900 block text-xs">
                              {grp.provider}
                            </span>
                            <span className="text-[11px] text-gray-500">{grp.department}</span>
                          </td>

                          {/* Billing Status */}
                          <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                            <span
                              className={`px-2.5 py-0.5 rounded-none font-bold text-[11px] inline-flex items-center gap-1 ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              <span>●</span> {grp.paymentStatus}
                            </span>
                          </td>

                          {/* Date & Time */}
                          <td className="py-3 px-4 text-gray-500 text-[11px] whitespace-nowrap">
                            {grp.ordered}
                          </td>

                          {/* Action Button */}
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedGroupKey(grp.groupKey)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-none transition-colors shadow-2xs"
                              >
                                Open Details →
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
        </>
        )}

        {/* TAB 2: RADIOLOGY REPORTS MODULE (INSIDE RADIOLOGY DEPARTMENT) */}
        {mainTab === "reports" && (
          <div className="flex-1 flex flex-col space-y-6 overflow-y-auto">
            {/* Search & Template Upload Bar for Radiology Reports */}
            <div className="bg-white border border-gray-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex-1 min-w-[280px] max-w-lg relative">
                <input
                  type="text"
                  value={reportsSearchQuery}
                  onChange={(e) => setReportsSearchQuery(e.target.value)}
                  placeholder="Search Radiology Reports by Patient Name, UMR, MRN, Test Name, Doctor..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-none border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                />
                <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
              </div>
              <div className="flex items-center gap-2">
                {reportsSearchQuery && (
                  <button
                    onClick={() => setReportsSearchQuery("")}
                    className="text-xs text-gray-500 hover:text-gray-900 font-semibold underline cursor-pointer mr-2"
                  >
                    Clear Search
                  </button>
                )}
                <button
                  onClick={() => setShowUploadTemplateModal(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-none shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <span>📤</span> Upload / Manage Report Templates
                </button>
              </div>
            </div>

            {/* SECTION A: COMPLETED INVESTIGATIONS READY FOR REPORT PREPARATION */}
            <div className="bg-white shadow-xs border border-gray-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-blue-900 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Completed Radiology Investigations (Ready for Reporting)
                  </h2>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Scanning completed. Click "Open Patient Report" to enter findings, finalize & print reports.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-blue-800 text-blue-100 border border-blue-700 font-mono">
                  {rawStudies.filter((s) => s.status === "Images Ready" || (s.status as string) === "Done" || s.status === "Reporting").length} Pending Reports
                </span>
              </div>

              <div className="overflow-x-auto">
                {rawStudies.filter((s) => {
                  const isDone = s.status === "Images Ready" || (s.status as string) === "Done" || s.status === "Reporting"
                  if (!isDone) return false
                  if (reportsSearchQuery.trim()) {
                    const q = reportsSearchQuery.toLowerCase().trim()
                    const matchPatient = s.patient.toLowerCase().includes(q)
                    const matchMrn = s.mrn.toLowerCase().includes(q)
                    const matchUmr = (s.umr || "").toLowerCase().includes(q)
                    const matchDoctor = (s.provider || "").toLowerCase().includes(q)
                    const matchStudy = s.study.toLowerCase().includes(q)
                    if (!matchPatient && !matchMrn && !matchUmr && !matchDoctor && !matchStudy) return false
                  }
                  return true
                }).length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-xs font-bold text-gray-600">No completed tests awaiting report entry.</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      When staff marks a scanning test as DONE, it will automatically appear here for technician reporting.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-700 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-4">Patient Name / UMR</th>
                        <th className="py-2.5 px-4">Visit ID</th>
                        <th className="py-2.5 px-4">Prescribed Test Name</th>
                        <th className="py-2.5 px-4">Referring Doctor</th>
                        <th className="py-2.5 px-4">Scanning Status</th>
                        <th className="py-2.5 px-4 text-right">Technician Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {rawStudies
                        .filter((s) => {
                          const isDone = s.status === "Images Ready" || (s.status as string) === "Done" || s.status === "Reporting"
                          if (!isDone) return false
                          if (reportsSearchQuery.trim()) {
                            const q = reportsSearchQuery.toLowerCase().trim()
                            const matchPatient = s.patient.toLowerCase().includes(q)
                            const matchMrn = s.mrn.toLowerCase().includes(q)
                            const matchUmr = (s.umr || "").toLowerCase().includes(q)
                            const matchDoctor = (s.provider || "").toLowerCase().includes(q)
                            const matchStudy = s.study.toLowerCase().includes(q)
                            if (!matchPatient && !matchMrn && !matchUmr && !matchDoctor && !matchStudy) return false
                          }
                          return true
                        })
                        .map((study) => {
                          return (
                            <tr key={study.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4">
                                <strong className="text-gray-900 block text-xs font-bold">{study.patient}</strong>
                                <span className="font-mono text-[11px] text-blue-700 font-semibold">
                                  {study.umr || `PAT-${study.mrn}`}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-gray-700">{study.encounterId || `ENC-${study.mrn}`}</td>
                              <td className="py-3 px-4">
                                <strong className="text-gray-900 block">{study.study}</strong>
                                <span className="text-[11px] text-gray-500">Modality: {study.modality}</span>
                              </td>
                              <td className="py-3 px-4 text-gray-800">{study.provider}</td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  ✓ DONE
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => openReportingEditor(study)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                                >
                                  <span>📋</span> Open Patient Report
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* SECTION B: FINALIZED DIAGNOSTIC RADIOLOGY REPORTS ARCHIVE */}
            <div className="bg-white shadow-xs border border-gray-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Finalized Diagnostic Radiology Reports Archive
                </h2>
                <span className="text-xs text-gray-500 font-semibold font-mono">
                  Total Signed Reports: {rawStudies.filter((s) => s.status === "Final").length}
                </span>
              </div>

              <div className="overflow-x-auto">
                {rawStudies.filter((s) => {
                  if (s.status !== "Final") return false
                  if (reportsSearchQuery.trim()) {
                    const q = reportsSearchQuery.toLowerCase().trim()
                    const matchPatient = s.patient.toLowerCase().includes(q)
                    const matchMrn = s.mrn.toLowerCase().includes(q)
                    const matchUmr = (s.umr || "").toLowerCase().includes(q)
                    const matchDoctor = (s.provider || "").toLowerCase().includes(q)
                    const matchStudy = s.study.toLowerCase().includes(q)
                    if (!matchPatient && !matchMrn && !matchUmr && !matchDoctor && !matchStudy) return false
                  }
                  return true
                }).length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-xs font-bold text-gray-600">No Finalized Reports Archived Yet</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Signed radiology reports will be archived here for viewing and printing.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100 text-gray-700 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-4">Study ID</th>
                        <th className="py-2.5 px-4">Patient Name / UMR</th>
                        <th className="py-2.5 px-4">Prescribed Test</th>
                        <th className="py-2.5 px-4">Modality</th>
                        <th className="py-2.5 px-4">Signed Radiologist</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {rawStudies
                        .filter((s) => {
                          if (s.status !== "Final") return false
                          if (reportsSearchQuery.trim()) {
                            const q = reportsSearchQuery.toLowerCase().trim()
                            const matchPatient = s.patient.toLowerCase().includes(q)
                            const matchMrn = s.mrn.toLowerCase().includes(q)
                            const matchUmr = (s.umr || "").toLowerCase().includes(q)
                            const matchDoctor = (s.provider || "").toLowerCase().includes(q)
                            const matchStudy = s.study.toLowerCase().includes(q)
                            if (!matchPatient && !matchMrn && !matchUmr && !matchDoctor && !matchStudy) return false
                          }
                          return true
                        })
                        .map((study) => (
                          <tr key={study.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-blue-900">{study.id}</td>
                            <td className="py-3 px-4">
                              <strong className="text-gray-900 block text-xs">{study.patient}</strong>
                              <span className="font-mono text-[11px] text-gray-500">
                                {study.umr || `MRN: ${study.mrn}`}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-gray-800">{study.study}</td>
                            <td className="py-3 px-4 uppercase font-bold text-slate-700">{study.modality}</td>
                            <td className="py-3 px-4 font-medium text-gray-900">
                              {study.radiologist || "Consultant Radiologist"}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openReportingEditor(study)}
                                  className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300"
                                >
                                  👁️ View Report
                                </button>
                                <button
                                  onClick={() => setActivePdfStudy(study)}
                                  className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                                >
                                  🖨️ Print Report
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>



      {/* ========================================================================= */}
      {/* MODAL 2: RADIOLOGY REPORT EDITOR (CLEAN, LIGHT & MODERN DESIGN)           */}
      {/* ========================================================================= */}
      {activeReportStudy && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
            {/* Top Toolbar / Header */}
            <div className="px-6 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900 leading-tight">Radiology Report Editor</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {activeReportStudy.study} · <span className="font-semibold text-gray-700">{activeReportStudy.patient}</span>
                  </p>
                </div>
              </div>

              {/* Template Select & Quick Actions */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                  <span className="text-[11px] font-medium text-gray-500">Template:</span>
                  <select
                    className="bg-transparent text-gray-800 text-xs font-medium focus:outline-none cursor-pointer pr-1"
                    onChange={(e) => {
                      const tplIdOrName = e.target.value
                      if (!tplIdOrName) return
                      const savedTpl =
                        RadiologyTemplateDatabase.getTemplateById(tplIdOrName) ||
                        RadiologyTemplateDatabase.getActiveTemplateForTest(tplIdOrName, (activeReportStudy as any)?.sex) ||
                        RadiologyTemplateDatabase.getTemplates().find((t) => t.testName.toLowerCase() === tplIdOrName.toLowerCase())
                      if (savedTpl && savedTpl.rawContent && savedTpl.rawContent.trim()) {
                        setReportingForm((prev) => ({
                          ...prev,
                          findings: savedTpl.rawContent!.trim().split("\n"),
                        }))
                        showToast(`✓ Loaded "${savedTpl.testName}" template into report`, "info")
                      } else if (savedTpl && savedTpl.sections && savedTpl.sections.length > 0) {
                        const secFindings = savedTpl.sections.map(
                          (sec) => `${sec.title}: ${sec.fields.map((f) => f.defaultValue || "").filter(Boolean).join(", ")}`
                        )
                        setReportingForm((prev) => ({
                          ...prev,
                          findings: secFindings,
                        }))
                        showToast(`✓ Loaded "${savedTpl.testName}" template into report`, "info")
                      } else {
                        const match = IMAGING_CATALOG.find((c) => c.study.toLowerCase() === tplIdOrName.toLowerCase())
                        if (match) {
                          setReportingForm((prev) => ({
                            ...prev,
                            indication: match.indication,
                            technique: match.technique,
                            findings: match.defaultFindings,
                            impression: match.defaultImpression,
                          }))
                          showToast(`✓ Loaded ${match.study} template`, "info")
                        }
                      }
                    }}
                  >
                    <option value="">-- Choose Template --</option>
                    <optgroup label="Custom Templates">
                      {RadiologyTemplateDatabase.getTemplates().map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.testName} {t.genderTarget && t.genderTarget !== "All" ? `(${t.genderTarget})` : ""} {t.uploadedFileName ? `[${t.uploadedFileName}]` : ""}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Standard Catalog">
                      {IMAGING_CATALOG.map((c) => (
                        <option key={c.study} value={c.study}>
                          {c.study} ({c.modality})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Direct Document / PDF Import */}
                <input
                  type="file"
                  id="editor-direct-file-input"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleEditorDirectFileUpload}
                />

                <button
                  type="button"
                  onClick={() => document.getElementById("editor-direct-file-input")?.click()}
                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Upload PDF or Word document directly into this report"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload PDF / Doc</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const catItem = IMAGING_CATALOG.find((c) => c.study === activeReportStudy.study)
                    setTemplateUploadForm({
                      testName: activeReportStudy.study,
                      customName: "",
                      templateName: `${activeReportStudy.study} Standard Template`,
                      genderTarget: "All",
                      category: (catItem ? catItem.category : "X-Ray") as any,
                      rawContent: reportingForm.findings.join("\n"),
                      fileName: "",
                    })
                    setShowUploadTemplateModal(true)
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center gap-1"
                  title="Open Template Library"
                >
                  <span>Template Library</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveReportStudy(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clean Patient Information Strip */}
            <div className="bg-slate-50/70 border-b border-gray-100 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Patient:</span>
                <span className="font-semibold text-gray-900 uppercase">{activeReportStudy.patient}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Age &amp; Sex:</span>
                <span className="font-medium text-gray-800">
                  {(activeReportStudy as any).age || "45"} Yrs / {((activeReportStudy as any).sex || (activeReportStudy.patient.toLowerCase().includes("female") || activeReportStudy.patient.toLowerCase().includes("mrs") || activeReportStudy.patient.toLowerCase().includes("ms") ? "Female" : "Male"))}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Ref. Doctor:</span>
                <span className="font-medium text-gray-800 uppercase">{activeReportStudy.provider || "DR. SARAH JENKINS"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Date:</span>
                <span className="font-medium text-gray-800">
                  {activeReportStudy.signedAt || activeReportStudy.ordered || new Date().toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>

            {/* Document Body / Editor */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white space-y-3">
              {/* Centered Clean Examination Title */}
              <div className="text-center pb-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-wide uppercase">
                  {activeReportStudy.study}
                </h2>
              </div>

              {/* Textarea Editor */}
              <div className="relative">
                <textarea
                  rows={14}
                  value={reportingForm.findings.join("\n")}
                  onChange={(e) =>
                    setReportingForm({
                      ...reportingForm,
                      findings: e.target.value.split("\n"),
                    })
                  }
                  placeholder="Enter clinical examination findings, technique, and impression..."
                  className="w-full text-sm p-4 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 rounded-xl text-gray-800 leading-relaxed font-sans placeholder-gray-400 transition-all shadow-2xs resize-y"
                />
              </div>

              {/* Footnote */}
              <div className="text-xs italic text-gray-400 pt-1">
                * Suggested Clinical correlation and further evaluation.
              </div>

              {/* Simple Clean Radiologist Signature Block */}
              <div className="pt-4 flex justify-end text-right">
                <div>
                  <div className="font-semibold text-gray-800 text-xs sm:text-sm tracking-wide">
                    {reportingForm.radiologist || "DR. T. MEGHANA, MBBS, MDRD"}
                  </div>
                  <div className="text-[11px] text-gray-400">Consultant Radiologist</div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-xs font-medium">
                  {reportingForm.findings.join("\n").split(/\s+/).filter(Boolean).length} words • {reportingForm.findings.length} lines
                </span>
                {reportingForm.findings.join("").trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Clear report text?")) {
                        setReportingForm({ ...reportingForm, findings: [""] })
                      }
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReportStudy(null)}
                  className="px-3.5 py-1.5 text-gray-500 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReport("Draft")}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg font-medium shadow-2xs transition-colors"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!activeReportStudy) return
                    const currentStudy: RadiologyStudyRecord = {
                      ...activeReportStudy,
                      findings: reportingForm.findings,
                      impression: reportingForm.impression,
                      radiologist: reportingForm.radiologist || activeReportStudy.radiologist,
                      technicianNotes: (reportingForm as any).technicianNotes || activeReportStudy.technicianNotes,
                      technique: reportingForm.technique || activeReportStudy.technique,
                      indication: reportingForm.indication || activeReportStudy.indication,
                    }
                    setActivePdfStudy(currentStudy)
                  }}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-emerald-700 border border-emerald-200 rounded-lg font-medium shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReport("Final")}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sign &amp; Finalize</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RADIOLOGY INVESTIGATION MASTER                                     */}
      {/* ========================================================================= */}
      {showMasterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-none max-w-4xl w-full shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📖</span>
                <div>
                  <h3 className="font-bold text-sm">Radiology Investigation Master</h3>
                  <p className="text-[11px] text-slate-300">Standardized diagnostic imaging scan catalog organized by category</p>
                </div>
              </div>
              <button onClick={() => setShowMasterModal(false)} className="text-white hover:text-gray-200 font-bold text-lg">
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-gray-200">
                {
                [
                  "all",
                  "X-Ray",
                  "CT Scan",
                  "MRI",
                  "Ultrasound (USG)",
                  "Doppler",
                  "Mammography",
                  "Fluoroscopy / Special Procedures",
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMasterActiveTab(cat)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-none whitespace-nowrap transition-colors border ${
                      masterActiveTab === cat
                        ? "bg-blue-700 text-white border-blue-700 shadow-2xs"
                        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {cat === "all" ? "All Scan Categories" : cat}
                  </button>
                ))}
              </div>

              {/* Master Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {IMAGING_CATALOG.filter((item) => {
                  if (masterActiveTab === "all") return true
                  return item.category === masterActiveTab
                }).map((item) => (
                  <div
                    key={item.code}
                    className="p-3.5 bg-gray-50 border border-gray-200 rounded-none flex flex-col justify-between hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{item.study}</h4>
                          <span className="text-[11px] text-slate-500 font-mono font-semibold">{item.code}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-none bg-blue-100 text-blue-900 font-bold text-[10.5px] border border-blue-200 uppercase">
                          {item.modality}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11.5px] text-gray-700 mt-2">
                        <div>
                          <strong className="text-gray-900">Category / Modality:</strong> {item.category}
                        </div>
                        <div>
                          <strong className="text-gray-900">Suite / Room:</strong> {item.room}
                        </div>
                        
                        <div className="line-clamp-2">
                          <strong className="text-gray-900">Indication:</strong> {item.indication}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-gray-200 flex items-center justify-between">
                      <span className="font-mono font-extrabold text-sm text-slate-900">₹{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
              <button
                onClick={() => setShowMasterModal(false)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-none font-bold text-xs"
              >
                Close Master Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPLOAD / MANAGE RADIOLOGY REPORT TEMPLATES                          */}
      {/* ========================================================================= */}
      {showUploadTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-none max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📤</span>
                <div>
                  <h3 className="font-bold text-sm">Upload &amp; Manage Radiology Report Templates</h3>
                  <p className="text-[11px] text-slate-300">Upload or paste formatted templates for specific diagnostic tests</p>
                </div>
              </div>
              <button onClick={() => setShowUploadTemplateModal(false)} className="text-white hover:text-gray-200 font-bold text-lg">
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveUploadedTemplate}
              className="p-6 space-y-4 text-xs overflow-y-auto flex-1"
            >
              {/* Active Saved Templates Quick View & Edit Bar */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-none">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Active Saved Templates ({RadiologyTemplateDatabase.getTemplates().filter((t) => t.status === "Active").length})
                </span>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                  {RadiologyTemplateDatabase.getTemplates()
                    .filter((t) => t.status === "Active")
                    .map((tpl) => (
                      <div
                        key={tpl.id}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-none shadow-2xs flex items-center gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const catItem = IMAGING_CATALOG.find((c) => c.study.toLowerCase() === tpl.testName.toLowerCase())
                            const testItem = RadiologyTemplateDatabase.getTestById(tpl.testId)
                            const cat = (testItem?.category || catItem?.category || (tpl.testName.toLowerCase().includes("x-ray") || tpl.testName.toLowerCase().includes("xr") ? "X-Ray" : "Ultrasound (USG)")) as any
                            setTemplateUploadForm({
                              testName: tpl.testName,
                              customName: "",
                              templateName: tpl.uploadedFileName || tpl.testName,
                              genderTarget: tpl.genderTarget || "All",
                              category: cat,
                              rawContent: tpl.rawContent || "",
                              fileName: tpl.uploadedFileName || "",
                            })
                            showToast(`Loaded "${tpl.testName}" (${tpl.genderTarget || "All"}) template into editor!`, "info")
                          }}
                          className="font-bold text-blue-700 hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                        >
                          <span>✏️ {tpl.testName}</span>
                          {tpl.genderTarget && tpl.genderTarget !== "All" && (
                            <span className="px-1 py-0.2 bg-blue-100 text-blue-800 text-[10px] font-bold">
                              {tpl.genderTarget}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          title="Delete this template"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (window.confirm(`Are you sure you want to delete the template for "${tpl.testName}" (${tpl.genderTarget || "All"})?`)) {
                              RadiologyTemplateDatabase.deleteTemplate(tpl.id)
                              setTick((t) => t + 1)
                              showToast(`✓ Deleted template for "${tpl.testName}"`, "success")
                            }
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 p-0.5 font-bold rounded-none cursor-pointer transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Test Name Selection / Custom Input */}
              <div>
                <label className="block text-gray-800 font-bold mb-1">Radiology Test Name *</label>
                <div className="space-y-2">
                  <select
                    value={templateUploadForm.testName}
                    onChange={(e) => {
                      const val = e.target.value
                      const catItem = IMAGING_CATALOG.find((c) => c.study.toLowerCase() === val.toLowerCase())
                      const targetCat = catItem ? catItem.category : (val.toLowerCase().includes("x-ray") || val.toLowerCase().includes("xr") ? "X-Ray" : templateUploadForm.category)
                      const existingTpl =
                        RadiologyTemplateDatabase.getActiveTemplateForTest(val, templateUploadForm.genderTarget) ||
                        RadiologyTemplateDatabase.getTemplates().find(
                          (t) => t.testName.toLowerCase() === val.toLowerCase() && (t.genderTarget || "All") === templateUploadForm.genderTarget && t.status === "Active"
                        )
                      const defaultContent = catItem
                        ? `${catItem.study}\n\n${catItem.defaultFindings.join("\n")}\n\nIMPRESSION:\n${catItem.defaultImpression.join("\n")}`
                        : ""
                      setTemplateUploadForm({
                        ...templateUploadForm,
                        testName: val,
                        category: targetCat as any,
                        rawContent: existingTpl?.rawContent || defaultContent,
                        templateName: existingTpl?.uploadedFileName || (existingTpl ? existingTpl.testName : (catItem ? `${catItem.study} Standard Template` : "")),
                      })
                    }}
                    className="w-full bg-white border border-gray-300 rounded-none p-2 font-medium"
                  >
                    {IMAGING_CATALOG.map((c) => (
                      <option key={c.study} value={c.study}>
                        {c.study} ({c.category})
                      </option>
                    ))}
                    <option value="custom">-- Custom / Other Test Name --</option>
                  </select>

                  {templateUploadForm.testName === "custom" && (
                    <input
                      type="text"
                      placeholder="Enter custom test name (e.g. ULTRASONOGRAPHY OF ABDOMEN)"
                      value={templateUploadForm.customName}
                      onChange={(e) => setTemplateUploadForm({ ...templateUploadForm, customName: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-none p-2 font-medium"
                    />
                  )}
                </div>
              </div>

              {/* Gender Target Selection */}
              <div>
                <label className="block text-gray-800 font-bold mb-1">Target Patient Gender / Category *</label>
                <select
                  value={templateUploadForm.genderTarget}
                  onChange={(e) => {
                    const newGender = e.target.value as "All" | "Male" | "Female"
                    const tName = templateUploadForm.testName === "custom" ? templateUploadForm.customName : templateUploadForm.testName
                    const existingTpl = RadiologyTemplateDatabase.getTemplates().find(
                      (t) => (t.testName === tName || t.testName.toLowerCase().includes(tName.toLowerCase())) && (t.genderTarget || "All") === newGender && t.status === "Active"
                    )
                    setTemplateUploadForm({
                      ...templateUploadForm,
                      genderTarget: newGender,
                      rawContent: existingTpl?.rawContent || templateUploadForm.rawContent,
                    })
                  }}
                  className="w-full bg-white border border-gray-300 rounded-none p-2 font-medium"
                >
                  <option value="All">All Patients (General Format)</option>
                  <option value="Male">Male Patients Only (e.g. includes Prostate)</option>
                  <option value="Female">Female Patients Only (e.g. includes Uterus &amp; Ovaries)</option>
                </select>
              </div>

              {/* Template Title / File Name */}
              <div>
                <label className="block text-gray-800 font-bold mb-1">Template Format Title / File Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Abdomen Sonography Standard Format 2026"
                  value={templateUploadForm.templateName}
                  onChange={(e) => setTemplateUploadForm({ ...templateUploadForm, templateName: e.target.value, fileName: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded-none p-2 font-medium"
                />
              </div>

              {/* File Attachment / File Import */}
              <div>
                <label className="block text-gray-800 font-bold mb-1">Upload Template File (.txt, .pdf, .docx)</label>
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setTemplateUploadForm((prev) => ({ ...prev, fileName: file.name }))
                      const lowerName = file.name.toLowerCase()
                      const isDocx = lowerName.endsWith(".docx") || lowerName.endsWith(".doc")
                      const isPdf = lowerName.endsWith(".pdf")
                      
                      if (isDocx) {
                        const reader = new FileReader()
                        reader.onload = async (event) => {
                          const arrayBuffer = event.target?.result as ArrayBuffer
                          if (arrayBuffer) {
                            try {
                              const extractedWordText = await extractTextFromWordBuffer(arrayBuffer, file.name)
                              if (extractedWordText && extractedWordText.trim()) {
                                setTemplateUploadForm((prev) => ({ ...prev, rawContent: extractedWordText.trim() }))
                                showToast(`✓ Extracted template text from Word document "${file.name}"!`, "success")
                              } else {
                                showToast(`No readable text found in Word document "${file.name}"`, "error")
                              }
                            } catch (err: any) {
                              showToast(`Failed to parse Word document: ${err?.message || err}`, "error")
                            }
                          }
                        }
                        reader.readAsArrayBuffer(file)
                      } else if (isPdf) {
                        const reader = new FileReader()
                        reader.onload = async (event) => {
                          const arrayBuffer = event.target?.result as ArrayBuffer
                          if (arrayBuffer) {
                            try {
                              const cleanedPdfText = await extractTextFromPdfBuffer(arrayBuffer)
                              if (cleanedPdfText && cleanedPdfText.trim()) {
                                setTemplateUploadForm((prev) => ({ ...prev, rawContent: cleanedPdfText.trim() }))
                                showToast(`✓ Extracted template text from PDF document "${file.name}"!`, "success")
                              } else {
                                showToast(`No readable text layer found in PDF "${file.name}". You can paste or type the text.`, "error")
                              }
                            } catch (err: any) {
                              showToast(`Failed to extract text from PDF: ${err?.message || err}`, "error")
                            }
                          }
                        }
                        reader.readAsArrayBuffer(file)
                      } else {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const content = event.target?.result as string
                          if (content) {
                            let cleanedText = extractCleanTemplateText(file.name, content)
                            if (lowerName.endsWith(".json")) {
                              try {
                                const parsed = JSON.parse(content)
                                if (parsed.rawContent) {
                                  cleanedText = parsed.rawContent
                                } else if (Array.isArray(parsed.sections)) {
                                  cleanedText = parsed.sections
                                    .map((s: any) => `${s.title}:\n` + (s.fields || []).map((f: any) => `  ${f.label}: ${f.defaultValue || ""}`).join("\n"))
                                    .join("\n\n")
                                }
                              } catch {}
                            }
                            setTemplateUploadForm((prev) => ({ ...prev, rawContent: cleanedText.trim() }))
                            showToast(`✓ Loaded text file "${file.name}"`, "info")
                          }
                        }
                        reader.readAsText(file)
                      }
                    }
                  }}
                  className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-300 rounded-none p-2"
                />
              </div>

              {/* Formatted Template Content Textarea */}
              <div>
                <label className="block text-gray-800 font-bold mb-1">
                  Template Content Format (Structured Sections &amp; Default Text) *
                </label>
                <p className="text-[11px] text-gray-500 mb-1.5">
                  Type or edit the report layout (e.g., LIVER:, GALL BLADDER:, SPLEEN:, KIDNEYS:, IMPRESSION:). Whenever this test comes in, this template will be pre-filled automatically!
                </p>
                <textarea
                  rows={12}
                  required
                  value={templateUploadForm.rawContent}
                  onChange={(e) => setTemplateUploadForm({ ...templateUploadForm, rawContent: e.target.value })}
                  placeholder={`ULTRASONOGRAPHY OF ABDOMEN\n\nLIVER: Normal in size with normal contour...\nGALL BLADDER: Partially distended...\nSPLEEN: Normal in size...\nKIDNEYS: Both kidneys are normal...\n\nIMPRESSION:\n   ❖ NO SIGNIFICANT ABNORMALITY DETECTED.`}
                  className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-3 rounded-none border border-slate-800 leading-relaxed shadow-inner"
                />
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowUploadTemplateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-none font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveUploadedTemplate(e)}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-none font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  ✓ Save &amp; Activate Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUBMIT RADIOLOGY RECORD ARTIFACTS                                  */}
      {/* ========================================================================= */}
      {showSubmitArtifactsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-none max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-purple-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📤</span>
                <div>
                  <h3 className="font-bold text-sm">Submit Radiology Record Artifacts</h3>
                  <p className="text-[11px] text-purple-200">Attach Digital Imaging Study, Digital Receipt, & Technician Signed Report</p>
                </div>
              </div>
              <button onClick={() => setShowSubmitArtifactsModal(null)} className="text-white hover:text-purple-200 font-bold text-lg">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveArtifacts} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-none font-medium">
                <div className="font-bold text-purple-950">{showSubmitArtifactsModal.patient}</div>
                <div className="text-purple-800 text-[11px]">
                  MRN: {showSubmitArtifactsModal.mrn} • Study: {showSubmitArtifactsModal.study} ({showSubmitArtifactsModal.modality})
                </div>
              </div>

              {/* 1. Digital Imaging Study Attachment */}
              <div>
                <label className="block text-gray-800 font-bold mb-1">1. Digital Imaging Study (PACS / Image Attachment) *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={artifactForm.digitalStudyUrl}
                    onChange={(e) => setArtifactForm({ ...artifactForm, digitalStudyUrl: e.target.value })}
                    placeholder="Enter PACS DICOM URL or image URL"
                    className="flex-1 bg-white border border-gray-300 p-2 font-mono text-[11px] rounded-none"
                  />
                  <label className="px-3 py-2 bg-slate-800 text-white font-bold text-xs rounded-none cursor-pointer hover:bg-slate-900">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = URL.createObjectURL(file)
                          setArtifactForm({ ...artifactForm, digitalStudyUrl: url })
                          showToast("✓ Image uploaded for Digital Imaging Study", "success")
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 2. Digital Receipt Reference */}
              <div>
                <label className="block text-gray-800 font-bold mb-1">2. Digital Receipt / Payment Reference Number *</label>
                <input
                  type="text"
                  required
                  value={artifactForm.digitalReceiptRef}
                  onChange={(e) => setArtifactForm({ ...artifactForm, digitalReceiptRef: e.target.value })}
                  placeholder="e.g. RCPT-2026-8841"
                  className="w-full bg-white border border-gray-300 p-2 font-mono text-xs rounded-none font-semibold text-gray-900"
                />
              </div>

              {/* 3. Technician Name & Signature */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-800 font-bold mb-1">3. Technician Name *</label>
                  <input
                    type="text"
                    required
                    value={artifactForm.technicianName}
                    onChange={(e) => setArtifactForm({ ...artifactForm, technicianName: e.target.value })}
                    className="w-full bg-white border border-gray-300 p-2 rounded-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-gray-800 font-bold mb-1">Digital Signature Ref *</label>
                  <input
                    type="text"
                    required
                    value={artifactForm.technicianSignature}
                    onChange={(e) => setArtifactForm({ ...artifactForm, technicianSignature: e.target.value })}
                    className="w-full bg-white border border-gray-300 p-2 font-mono text-xs rounded-none text-slate-800"
                  />
                </div>
              </div>

              {/* 4. Technician Signed Report / Observations */}
              <div>
                <label className="block text-gray-800 font-bold mb-1">4. Technician Signed Report Notes & Operational Details *</label>
                <textarea
                  rows={3}
                  required
                  value={artifactForm.technicianNotes}
                  onChange={(e) => setArtifactForm({ ...artifactForm, technicianNotes: e.target.value })}
                  className="w-full bg-white border border-gray-300 p-2 font-sans text-xs rounded-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitArtifactsModal(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-none font-bold text-xs hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-800 hover:bg-purple-900 text-white rounded-none font-bold text-xs shadow-2xs"
                >
                  ✓ Submit & Save Artifacts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: OFFICIAL DIAGNOSTIC RADIOLOGY REPORT (PREVIEW / PRINTABLE)       */}
      {/* ========================================================================= */}
      {activePdfStudy && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print-modal-backdrop">
          <style>{`
            @media print {
              body {
                visibility: hidden !important;
                background: #ffffff !important;
              }
              #printable-radiology-report {
                visibility: visible !important;
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                box-shadow: none !important;
                overflow: visible !important;
              }
              #printable-radiology-report * {
                visibility: visible !important;
              }
              .print-modal-backdrop {
                position: static !important;
                display: block !important;
                background: transparent !important;
                padding: 0 !important;
              }
              .print-modal-window {
                position: static !important;
                display: block !important;
                border: none !important;
                box-shadow: none !important;
                max-height: none !important;
                overflow: visible !important;
              }
              @page {
                size: A4 portrait;
                margin: 12mm 15mm;
              }
            }
          `}</style>
          <div className="bg-white rounded-none max-w-4xl w-full shadow-2xl border border-gray-300 overflow-hidden max-h-[95vh] flex flex-col print:max-w-none print:w-full print:max-h-none print:border-none print:shadow-none print-modal-window">
            {/* Top Toolbar (Preview / Verification Mode) */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <div>
                  <h3 className="font-bold text-sm">Preview & Verify Radiology Document Before Printing</h3>
                  <p className="text-[11px] text-slate-300">Verified patient clinical record & technician signed report</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printRadiologyDocument(activePdfStudy)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer border border-emerald-500"
                >
                  <span>🖨️</span> Print Record
                </button>
                <button onClick={() => setActivePdfStudy(null)} className="text-white hover:text-gray-200 text-lg font-bold ml-3 cursor-pointer">
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Container */}
            <div id="printable-radiology-report" className="printable-area p-8 space-y-6 overflow-y-auto flex-1 bg-white text-gray-900 font-sans print:p-0 print:overflow-visible">
              {/* Official Hospital Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-2xl">
                      +
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-950 tracking-tight leading-none uppercase">
                        IMPERIAL HOSPITALS
                      </h2>
                      <p className="text-[11px] text-slate-700 font-extrabold uppercase tracking-wider mt-1">
                        A UNIT OF MUKUNDA HEALTHCARE PRIVATE LIMITED • Department of Radiology & Imaging
                      </p>
                    </div>
                  </div>
                  <div className="text-[10.5px] text-slate-600 font-medium mt-1.5">
                    # 27-14-13/A, Opp. Ganesh Canteen Street, Beside Bhasyam School, Bhimavaram • Ph: 08816-279999 • GSTIN: 37AALCM2238A1ZQ
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <div className="font-extrabold text-slate-950">
                    ACCESSION: {activePdfStudy.accessionNo || "RAD-ACC-8801"}
                  </div>
                  <div className="text-slate-700 font-bold">Date: {activePdfStudy.signedAt || activePdfStudy.ordered || new Date().toLocaleDateString("en-IN")}</div>
                  <div className="text-emerald-800 font-extrabold text-[11px] mt-0.5 uppercase">STATUS: {activePdfStudy.status.toUpperCase()}</div>
                </div>
              </div>

              {/* Patient Demographics & Financial Summary Table */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-300 text-xs">
                <div className="space-y-1">
                  <div>Patient Name: <strong className="text-slate-950 text-sm">{activePdfStudy.patient}</strong></div>
                  <div>UMR Number: <strong className="font-mono text-slate-900">{activePdfStudy.umr || `PAT-${activePdfStudy.mrn}`}</strong></div>
                  <div>MRN Number: <strong className="font-mono text-slate-900">{activePdfStudy.mrn}</strong></div>
                  <div>OP / IP / ER No: <strong className="font-mono text-slate-900">{activePdfStudy.encounterId || `ENC-${activePdfStudy.mrn}`}</strong></div>
                </div>
                <div className="space-y-1 text-right">
                  <div>Referring Physician: <strong className="text-slate-900">{activePdfStudy.provider}</strong></div>
                  <div>Department: <strong>{activePdfStudy.department || "Emergency Medicine"}</strong></div>
                  <div>Billing Status: <strong className="text-emerald-800">{activePdfStudy.paymentStatus} (₹{activePdfStudy.price})</strong></div>
                  <div>Digital Receipt Ref: <strong className="font-mono text-slate-900">{activePdfStudy.paidReceiptNo || activePdfStudy.digitalReceiptRef || "RCPT-2026-5501"}</strong></div>
                </div>
              </div>

              {/* Investigation / Test Details */}
              <div className="space-y-4 text-xs">
                <div className="bg-slate-100 p-3 border border-slate-300">
                  <h3 className="font-bold text-slate-950 text-sm uppercase">
                    Investigation: {activePdfStudy.study}
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-[11.5px] mt-2 font-medium text-slate-800">
                    <div>Category: <strong>{activePdfStudy.modality}</strong></div>
                    <div>Scanner Suite: <strong>{activePdfStudy.room}</strong></div>
                    <div>Digital Study Link: <strong className="font-mono text-slate-900">{activePdfStudy.digitalStudyUrl ? "Attached" : `PACS://${activePdfStudy.accessionNo || "RAD-8801"}`}</strong></div>
                  </div>
                  <div className="mt-2 text-[11.5px]">
                    <strong className="text-slate-900">Clinical Indication: </strong>
                    <span className="text-slate-800">{activePdfStudy.indication || "Shortness of breath, diagnostic workup."}</span>
                  </div>
                  <div className="mt-1 text-[11.5px]">
                    <strong className="text-slate-900">Imaging Technique & Protocol: </strong>
                    <span className="text-slate-800">{activePdfStudy.technique || "Standard multiplanar digital diagnostic protocol."}</span>
                  </div>
                </div>

                {/* Report Findings */}
                <div className="pt-2">
                  <h4 className="font-extrabold text-slate-950 mb-2 uppercase tracking-wide border-b pb-1 text-xs">
                    Diagnostic Findings:
                  </h4>
                  <div className="text-slate-800 text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
                    {(activePdfStudy.findings && activePdfStudy.findings.length > 0
                      ? (Array.isArray(activePdfStudy.findings) ? activePdfStudy.findings.join("\n") : String(activePdfStudy.findings))
                      : IMAGING_CATALOG[0].defaultFindings.join("\n")
                    )}
                  </div>
                </div>

                {/* Diagnostic Impression */}
                <div className="p-4 bg-slate-50 border border-slate-300 space-y-1.5">
                  <h4 className="font-extrabold text-slate-950 uppercase tracking-wide text-xs">Diagnostic Impression:</h4>
                  <div className="text-slate-900 font-bold text-[13px] leading-relaxed whitespace-pre-wrap">
                    {(activePdfStudy.impression && activePdfStudy.impression.length > 0
                      ? (Array.isArray(activePdfStudy.impression) ? activePdfStudy.impression.join("\n") : String(activePdfStudy.impression))
                      : IMAGING_CATALOG[0].defaultImpression.join("\n")
                    )}
                  </div>
                </div>

                {/* Technician Signed Report Details */}
                <div className="p-3 bg-purple-50/60 border border-purple-200 text-xs space-y-1">
                  <div className="font-bold text-purple-950 uppercase">Technician Operational Report:</div>
                  <div className="text-slate-800 italic">{activePdfStudy.technicianNotes || "Diagnostic imaging scan performed per protocol. DICOM images ingested into PACS."}</div>
                </div>
              </div>

              {/* Technician & Radiologist Signatures */}
              <div className="pt-6 flex items-end justify-between text-xs border-t-2 border-slate-900">
                <div>
                  <div className="font-extrabold text-slate-950">Radiology Technologist</div>
                  <div className="text-slate-800 font-bold">{activePdfStudy.technician || technician}</div>
                  <div className="text-slate-500 font-mono text-[10.5px]">Signature Ref: {activePdfStudy.technicianSignature || "TECH-SIG-88012"}</div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-slate-950">{activePdfStudy.radiologist || "Dr. Laura Kim, MD"}</div>
                  <div className="text-slate-800 font-semibold">Senior Consultant Radiologist</div>
                  <div className="text-slate-500 text-[10.5px]">Reg No: MCI-RAD-77109</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL 5: ADD STUDY TO ORDER                                               */}
      {/* ========================================================================= */}
      {showAddStudyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-none shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Add Diagnostic Scan</h3>
                <p className="text-xs text-slate-300">Patient: {showAddStudyModal.patient}</p>
              </div>
              <button onClick={() => setShowAddStudyModal(null)} className="text-white hover:text-gray-200 font-bold">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Select Additional Imaging Study</label>
                <div className="max-h-60 overflow-y-auto border rounded-none p-2 space-y-1.5 bg-gray-50">
                  {IMAGING_CATALOG.map((item) => (
                    <div
                      key={item.study}
                      onClick={() => handleAddStudyToPatient(item.study)}
                      className="p-2 bg-white rounded-none border border-gray-200 hover:bg-slate-100 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <strong className="block text-gray-900 text-xs">
                          [{item.modality}] {item.study}
                        </strong>
                        <span className="text-[11px] text-gray-500">Suite: {item.room}</span>
                      </div>
                      <span className="font-mono font-bold text-gray-800">₹{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudyModal(null)}
                  className="px-4 py-2 border rounded-none text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
