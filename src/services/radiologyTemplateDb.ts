import { BillingDatabase } from "./billingDb"
import { AuditDatabase } from "./auditDb"
import * as pdfjsLib from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import mammoth from "mammoth"

if (typeof window !== "undefined") {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  } catch {}
}

export async function extractTextFromPdfBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  // 1. Try PDF.js API parsing first with Y-coordinate line break detection
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    })
    const pdf = await loadingTask.promise
    let fullText = ""

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      let lastY: number | null = null
      const pageLines: string[] = []
      let currentLine = ""

      for (const item of textContent.items as any[]) {
        if (!item || typeof item.str !== "string") continue
        const y = item.transform ? item.transform[5] : null
        const hasEol = item.hasEOL

        if (hasEol || (lastY !== null && y !== null && Math.abs(lastY - y) > 3)) {
          if (currentLine.trim()) {
            pageLines.push(currentLine.trim())
          }
          currentLine = item.str
        } else {
          currentLine += (currentLine ? " " : "") + item.str
        }
        if (y !== null) lastY = y
      }

      if (currentLine.trim()) {
        pageLines.push(currentLine.trim())
      }

      if (pageLines.length > 0) {
        fullText += pageLines.join("\n") + "\n\n"
      }
    }

    if (fullText.trim().length > 10) {
      return fullText.trim()
    }
  } catch (err) {
    console.warn("PDF.js extraction failed or blocked by CORS, falling back to native stream parser:", err)
  }

  // 2. Native Fallback: Decode PDF binary operators (BT...ET, Tj, TJ, hex strings) directly
  try {
    const bytes = new Uint8Array(arrayBuffer)
    const decoder = new TextDecoder("latin1")
    const pdfString = decoder.decode(bytes)

    const textSegments: string[] = []

    // Extract text blocks enclosed in BT ... ET
    const btEtRegex = /BT[\s\S]*?ET/g
    let match: RegExpExecArray | null

    while ((match = btEtRegex.exec(pdfString)) !== null) {
      const block = match[0]

      // Extract string literals (text) Tj or [(text1) 10 (text2)] TJ
      const parenRegex = /\(([\s\S]*?)\)\s*(?:Tj|TJ|\')/g
      let pMatch: RegExpExecArray | null
      let blockText = ""

      while ((pMatch = parenRegex.exec(block)) !== null) {
        let str = pMatch[1]
          .replace(/\\([()])/g, "$1")
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))

        str = str.replace(/[^\x20-\x7E\n\r\t]/g, "")
        if (str.trim()) {
          blockText += (blockText ? " " : "") + str
        }
      }

      // Extract hex strings <48656c6c6f> Tj
      const hexRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|TJ|\')/g
      let hMatch: RegExpExecArray | null
      while ((hMatch = hexRegex.exec(block)) !== null) {
        const hex = hMatch[1]
        let hexStr = ""
        for (let i = 0; i < hex.length; i += 2) {
          const charCode = parseInt(hex.substring(i, i + 2), 16)
          if (charCode >= 32 && charCode <= 126) {
            hexStr += String.fromCharCode(charCode)
          }
        }
        if (hexStr.trim()) {
          blockText += (blockText ? " " : "") + hexStr
        }
      }

      if (blockText.trim()) {
        textSegments.push(blockText.trim())
      }
    }

    if (textSegments.length > 0) {
      return textSegments.join("\n")
    }

  } catch (err) {
    console.error("Native PDF stream parsing failed:", err)
  }

  return ""
}

export interface TemplateField {
  id: string
  label: string
  type: "text" | "textarea" | "select" | "number" | "checkbox"
  options?: string[]
  defaultValue?: string
  placeholder?: string
  required?: boolean
}

export interface TemplateSection {
  id: string
  title: string
  instructions?: string
  fields: TemplateField[]
}

export interface RadiologyTest {
  id: string
  name: string
  code?: string
  category: "X-Ray" | "CT Scan" | "MRI" | "Ultrasound (USG)" | "Doppler" | "Mammography" | "Fluoroscopy / Special Procedures" | "Other"
  modality: "XR" | "CT" | "MR" | "US" | "NM"
  status: "Active" | "Inactive"
  activeTemplateId?: string
  createdAt: string
  updatedAt: string
}

export interface RadiologyTemplate {
  id: string
  testId: string
  testName: string
  genderTarget?: "All" | "Male" | "Female"
  version: number
  status: "Active" | "Inactive" | "Archived"
  sections: TemplateSection[]
  rawContent?: string
  uploadedFileUrl?: string
  uploadedFileName?: string
  uploadedFileType?: "pdf" | "word" | "image" | "text" | "json"
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface RadiologyReportRecord {
  id: string
  studyId: string
  patientName: string
  mrn: string
  umr?: string
  encounterId?: string
  referringDoctor?: string
  orderedDate?: string
  testId: string
  testName: string
  templateId: string
  templateVersion: number
  templateStructure: TemplateSection[]
  fieldValues: Record<string, any>
  technicianNotes?: string
  technicianSignature?: string
  radiologistName?: string
  uploadedFileUrl?: string
  uploadedFileName?: string
  uploadedFileType?: string
  status: "Draft" | "Final"
  savedAt: string
  finalizedAt?: string
}

export function convertHtmlToFormattedText(html: string): string {
  if (!html || !html.trim()) return ""

  let text = html
    .replace(/<tr\b[^>]*>/gi, "\n")
    .replace(/<td\b[^>]*>(.*?)<\/td>/gi, " $1 |")
    .replace(/<th\b[^>]*>(.*?)<\/th>/gi, " $1 |")
    .replace(/<\/tr>/gi, "")
    .replace(/<\/table>/gi, "\n\n")
    .replace(/<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/gi, "\n\n$1\n")
    .replace(/<li\b[^>]*>(.*?)<\/li>/gi, "\n❖ $1")
    .replace(/<p\b[^>]*>(.*?)<\/p>/gi, "\n$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  const lines = text.split("\n").map((l) => l.trimEnd())
  const cleanedLines: string[] = []
  let consecutiveEmpty = 0

  for (const line of lines) {
    if (line.trim() === "") {
      consecutiveEmpty++
      if (consecutiveEmpty <= 2) {
        cleanedLines.push("")
      }
    } else {
      consecutiveEmpty = 0
      cleanedLines.push(line)
    }
  }

  return cleanedLines.join("\n").trim()
}

export async function extractTextFromWordBuffer(arrayBuffer: ArrayBuffer, fileName: string): Promise<string> {
  // 1. Primary Strategy: Mammoth HTML conversion (preserves headings, tables, bullet points, line breaks)
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
    if (htmlResult && htmlResult.value && htmlResult.value.trim()) {
      const formattedText = convertHtmlToFormattedText(htmlResult.value)
      if (formattedText && formattedText.length > 5) {
        return formattedText
      }
    }
  } catch (err) {
    console.warn(`Mammoth HTML conversion skipped for ${fileName}:`, err)
  }

  // 2. Secondary Strategy: Mammoth Raw Text Extraction
  try {
    const rawResult = await mammoth.extractRawText({ arrayBuffer })
    if (rawResult && rawResult.value && rawResult.value.trim()) {
      return rawResult.value.trim()
    }
  } catch (err) {
    console.warn(`Mammoth raw text extraction skipped for ${fileName}:`, err)
  }

  // 3. Fallback Strategy: Binary XML Stream Decoder for .docx / .doc files
  try {
    const decoder = new TextDecoder("latin1")
    const rawString = decoder.decode(new Uint8Array(arrayBuffer))
    const cleanedText = extractCleanTemplateText(fileName, rawString)
    if (cleanedText && cleanedText.trim()) {
      return cleanedText.trim()
    }
  } catch (err) {
    console.error(`Binary Word extraction error for ${fileName}:`, err)
  }

  return ""
}

export function extractCleanTemplateText(fileName: string, rawText: string): string {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith(".txt") || lowerName.endsWith(".json") || lowerName.endsWith(".csv") || lowerName.endsWith(".md")) {
    return rawText
  }

  // If it's a .docx or binary zip file containing PK! and XML tags
  if (rawText.includes("PK!") || rawText.includes("word/document.xml") || lowerName.endsWith(".docx") || lowerName.endsWith(".doc")) {
    const extractedLines: string[] = []

    // 1. Try matching <w:p> and <w:t> tags inside word/document.xml section
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g
    let pMatch: RegExpExecArray | null
    while ((pMatch = pRegex.exec(rawText)) !== null) {
      const pContent = pMatch[1]
      const tRegex = /<w:t\b[^>]*>(.*?)<\/w:t>/g
      let tMatch: RegExpExecArray | null
      let lineText = ""
      while ((tMatch = tRegex.exec(pContent)) !== null) {
        lineText += tMatch[1]
      }
      lineText = lineText
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .trim()

      if (lineText) {
        extractedLines.push(lineText)
      }
    }

    // 2. Fallback: If no XML tags matched, strip binary control chars and ZIP structures
    if (extractedLines.length === 0) {
      const cleanText = rawText
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/PK![\s\S]*?(\n|$)/g, "")
        .replace(/\[Content_Types\][\s\S]*?(\n|$)/g, "")
        .replace(/word\/[\s\S]*?(\n|$)/g, "")
        .replace(/docProps\/[\s\S]*?(\n|$)/g, "")
        .replace(/customXml\/[\s\S]*?(\n|$)/g, "")
        .replace(/xml[\s\S]*?(\n|$)/g, "")

      const lines = cleanText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 2 && !l.includes("xml") && !l.includes("_rels") && !l.includes("PK!"))
      return lines.join("\n\n")
    }

    return extractedLines.join("\n")
  }

  return rawText
}

// DEFAULT INITIAL RADIOLOGY TEST TEMPLATES (INCLUDES USER-PROVIDED X-RAY CHEST FORMAT)
const DEFAULT_TESTS: RadiologyTest[] = [
  {
    id: "rad_test_xr_chest",
    name: "Chest X-Ray PA/Lateral",
    code: "RAD-XR-001",
    category: "X-Ray",
    modality: "XR",
    status: "Active",
    activeTemplateId: "rad_tpl_xr_chest_v1",
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
  },
  {
    id: "rad_test_usg_abdomen",
    name: "Ultrasound Whole Abdomen",
    code: "RAD-US-001",
    category: "Ultrasound (USG)",
    modality: "US",
    status: "Active",
    activeTemplateId: "rad_tpl_usg_abdomen_v1",
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
  },
  {
    id: "rad_test_ct_head",
    name: "CT Head Non-Contrast",
    code: "RAD-CT-001",
    category: "CT Scan",
    modality: "CT",
    status: "Active",
    activeTemplateId: "rad_tpl_ct_head_v1",
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
  },
]

const DEFAULT_TEMPLATES: RadiologyTemplate[] = [
  {
    id: "rad_tpl_xr_chest_v1",
    testId: "rad_test_xr_chest",
    testName: "Chest X-Ray PA/Lateral",
    genderTarget: "All",
    version: 1,
    status: "Active",
    uploadedFileName: "XRay_Chest_Standard_Template.pdf",
    uploadedFileType: "pdf",
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
    createdBy: "Hospital Radiologist",
    rawContent: `CHEST X-RAY (PA & LATERAL VIEWS)

TRACHEA & MEDIASTINUM: Trachea is midline. Mediastinal contours, aortic knob, and hilar shadows are normal in position and configuration.

HEART & PERICARDIUM: Cardiac silhouette is normal in size and contour (Cardiothoracic ratio < 0.50). Normal mediastinal vascularity.

LUNG FIELDS: Both lung fields are clear and normally aerated. No focal parenchymal consolidation, infiltrates, mass lesions, or atelectasis. Vascular markings are within normal limits.

PLEURA & CP ANGLES: Bilateral costophrenic and cardiophrenic angles are sharp and clear. No evidence of pleural effusion or pneumothorax.

DIAPHRAGMS: Both diaphragmatic domes are smooth, regular, and normal in position and contour. Subdiaphragmatic spaces are clear without free air.

BONY THORAX: Rib cage, clavicles, scapulae, and visualized spine appear intact. No acute fractures or destructive osseous lesions. Soft tissues of the chest wall are unremarkable.

IMPRESSION:
   ❖ NO ACUTE CARDIOPULMONARY ABNORMALITY DETECTED.
   ❖ CLEAR LUNG FIELDS AND NORMAL CARDIAC SILHOUETTE.

* Suggested Clinical correlation and further evaluation.`,
    sections: [
      {
        id: "sec_lungs",
        title: "Lungs",
        instructions: "Enter findings / observations here:",
        fields: [
          {
            id: "f_lungs",
            label: "Lungs Observations",
            type: "textarea",
            placeholder: "Enter findings / observations here...",
            required: false,
          },
        ],
      },
      {
        id: "sec_pleura",
        title: "Pleura",
        instructions: "Enter findings / observations here:",
        fields: [
          {
            id: "f_pleura",
            label: "Pleura Observations",
            type: "textarea",
            placeholder: "Enter findings / observations here...",
            required: false,
          },
        ],
      },
      {
        id: "sec_heart",
        title: "Heart / Cardiomediastinal Silhouette",
        instructions: "Enter findings / observations here:",
        fields: [
          {
            id: "f_heart",
            label: "Heart & Silhouette Observations",
            type: "textarea",
            placeholder: "Enter findings / observations here...",
            required: false,
          },
        ],
      },
      {
        id: "sec_mediastinum",
        title: "Mediastinum",
        instructions: "Enter findings / observations here:",
        fields: [
          {
            id: "f_mediastinum",
            label: "Mediastinum Observations",
            type: "textarea",
            placeholder: "Enter findings / observations here...",
            required: false,
          },
        ],
      },
      {
        id: "sec_diaphragm",
        title: "Diaphragm",
        instructions: "Enter findings / observations here:",
        fields: [
          {
            id: "f_diaphragm",
            label: "Diaphragm Observations",
            type: "textarea",
            placeholder: "Enter findings / observations here...",
            required: false,
          },
        ],
      },
      {
        id: "sec_bony_thorax",
        title: "Bony Thorax",
        instructions: "Enter findings / observations here:",
        fields: [
          {
            id: "f_bony_thorax",
            label: "Bony Thorax Observations",
            type: "textarea",
            placeholder: "Enter findings / observations here...",
            required: false,
          },
        ],
      },
      {
        id: "sec_additional",
        title: "Additional Findings",
        instructions: "Enter findings / observations here:",
        fields: [
          {
            id: "f_additional",
            label: "Additional Observations",
            type: "textarea",
            placeholder: "Enter findings / observations here...",
            required: false,
          },
        ],
      },
      {
        id: "sec_impression",
        title: "Impression",
        instructions: "Enter final impression / conclusion:",
        fields: [
          {
            id: "f_impression",
            label: "Radiological Impression",
            type: "textarea",
            placeholder: "Enter radiological impression...",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "rad_tpl_usg_abdomen_v1",
    testId: "rad_test_usg_abdomen",
    testName: "Ultrasound Whole Abdomen",
    genderTarget: "Male",
    version: 1,
    status: "Active",
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
    createdBy: "Hospital Radiologist",
    rawContent: `ULTRASONOGRAPHY OF ABDOMEN (MALE)

LIVER:         Normal in size with normal contour and showing normal parenchymal echogenicity. Main portal vein and its branches are normal. Hepatic veins are normal in caliber. CBD is normal in caliber. No evidence of intra or extra hepatic biliary radicular dilatation. No calculi.

GALL BLADDER:  Partially distended. Wall is smooth and regular with normal thickness. No calculus. No mass lesions.

SPLEEN :       Normal in size and echo pattern, no evidence of focal or diffuse abnormality.

PANCREAS :     Head and body visualized and are normal in size, shape and echo texture. No evidence of inflammatory or neoplastic mass lesions. No abnormal calcifications. Pancreatic duct is normal in calibre, no calculi.

AORTA AND IVC: Normal in caliber.

KIDNEYS:       Both kidneys are normal in size, contour and showing normal parenchymal echogenicity. Cortico medullary differentiation well maintained on both sides. No calculi/hydronephrosis. No mass lesions.

URINARY BLADDER: Partially distended, normal contour, wall is smooth and regular. No calculi / mass lesion.

PROSTATE:      Normal in size and echo pattern with intact capsule.

No free fluid, no lymphadenopathy, no abdominal masses.
RIF: Appendix is not visualized. No E/o any collection. No E/o any inflamed bowel loops. No probe tenderness.

IMPRESSION:
   ❖ NO SIGNIFICANT ABNORMALITY DETECTED.

* Suggested Clinical correlation and further evaluation.`,
    sections: [],
  },
  {
    id: "rad_tpl_usg_abdomen_female_v1",
    testId: "rad_test_usg_abdomen",
    testName: "Ultrasound Whole Abdomen",
    genderTarget: "Female",
    version: 1,
    status: "Active",
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
    createdBy: "Hospital Radiologist",
    rawContent: `ULTRASONOGRAPHY OF ABDOMEN (FEMALE)

LIVER:         Normal in size with normal contour and showing normal parenchymal echogenicity. Main portal vein and its branches are normal. Hepatic veins are normal in caliber. CBD is normal in caliber. No evidence of intra or extra hepatic biliary radicular dilatation. No calculi.

GALL BLADDER:  Partially distended. Wall is smooth and regular with normal thickness. No calculus. No mass lesions.

SPLEEN :       Normal in size and echo pattern, no evidence of focal or diffuse abnormality.

PANCREAS :     Head and body visualized and are normal in size, shape and echo texture. No evidence of inflammatory or neoplastic mass lesions. Pancreatic duct is normal in calibre.

AORTA AND IVC: Normal in caliber.

KIDNEYS:       Both kidneys are normal in size, contour and parenchymal echogenicity. Corticomedullary differentiation maintained. No calculi/hydronephrosis.

URINARY BLADDER: Well-filled with normal mucosal wall. No calculus or focal lesion.

UTERUS & OVARIES: Uterus is normal in size, shape, and parenchymal echotexture (7.6 x 3.8 x 4.2 cm). Endometrial thickness is normal (6mm). Both ovaries are normal in size with normal follicular development. No adnexal mass or free pelvic fluid.

No free fluid, no lymphadenopathy, no abdominal masses.
RIF: Appendix is not visualized. No probe tenderness.

IMPRESSION:
   ❖ NO SIGNIFICANT ABNORMALITY DETECTED IN ABDOMEN & PELVIS.

* Suggested Clinical correlation and further evaluation.`,
    sections: [],
  },
  {
    id: "rad_tpl_ct_head_v1",
    testId: "rad_test_ct_head",
    testName: "CT Head Non-Contrast",
    genderTarget: "All",
    version: 1,
    status: "Active",
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
    createdBy: "Hospital Radiologist",
    rawContent: `NCCT BRAIN / HEAD

BRAIN PARENCHYMA: Cerebral hemispheres show normal grey and white matter differentiation. No acute focal intra-axial or extra-axial hemorrhage. No evidence of acute territorial ischemic infarction. Basal ganglia, thalami and brainstem are unremarkable.

VENTRICLES & CISTERNS: Ventricular system is symmetrical and normal in size for age. Third and fourth ventricles are central. Basal cisterns and cerebral sulci are normal without midline shift.

CALVARIUM & SOFT TISSUES: Bony calvarium, skull base, and scalp soft tissues are intact without acute fracture or hematoma. Paranasal sinuses and mastoid air cells show normal aeration.

IMPRESSION:
   ❖ NO ACUTE INTRACRANIAL HEMORRHAGE OR TERRITORIAL VASCULAR ISCHEMIC STROKE IDENTIFIED.
   ❖ NORMAL NON-CONTRAST CT SCAN OF THE BRAIN.

* Clinical correlation recommended.`,
    sections: [],
  },
  {
    id: "rad_tpl_ct_chest_v1",
    testId: "rad_test_ct_chest",
    testName: "CT Chest / Thorax",
    genderTarget: "All",
    version: 1,
    status: "Active",
    createdAt: "2026-10-06T00:00:00.000Z",
    updatedAt: "2026-10-06T00:00:00.000Z",
    createdBy: "Hospital Radiologist",
    rawContent: `HIGH RESOLUTION CT (HRCT) CHEST

LUNGS & PLEURA: Both lung fields are well-expanded. No focal parenchymal consolidation, mass lesion, interstitial septal thickening, or ground-glass opacity. Tracheobronchial tree is patent down to segmental branches. No pleural effusion or pneumothorax bilaterally.

MEDIASTINUM & HILAR NODES: Mediastinal contours are normal. No significant hilar or mediastinal lymphadenopathy. Thymic bed is unremarkable.

HEART & GREAT VESSELS: Cardiac chamber dimensions are within normal limits. Ascending aorta, aortic arch, and pulmonary trunk are normal in caliber.

BONY THORAX: Thoracic skeleton and chest wall soft tissues show no destructive osseous lesion or fracture.

IMPRESSION:
   ❖ NO ACUTE CARDIOPULMONARY LESION DETECTED.
   ❖ CLEAR LUNG FIELDS BILATERALLY.

* Suggested Clinical correlation.`,
    sections: [],
  },
]

const STORAGE_KEY_TESTS = "hospai_rad_tests_v1"
const STORAGE_KEY_TEMPLATES = "hospai_rad_templates_v1"
const STORAGE_KEY_REPORTS = "hospai_rad_reports_v1"
const CHANNEL_NAME = "hospai_rad_template_channel"

type Listener = () => void

export class RadiologyTemplateDatabase {
  private static listeners: Set<Listener> = new Set()
  private static channel: BroadcastChannel | null = null

  private static initChannel() {
    if (typeof window === "undefined" || this.channel) return
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = () => {
        this.notifyListeners()
      }
    } catch {
      // Fallback
    }
  }

  public static onUpdate(fn: Listener): () => void {
    this.initChannel()
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private static notifyListeners() {
    this.listeners.forEach((fn) => fn())
    try {
      this.channel?.postMessage("update")
    } catch {}
  }

  private static load<T>(key: string, defaultValue: T): T {
    try {
      const saved = localStorage.getItem(key)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn(`Error reading ${key} from localStorage`, e)
    }
    return defaultValue
  }

  private static save<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      this.notifyListeners()
    } catch (e) {
      console.error(`Error writing ${key} to localStorage`, e)
    }
  }

  // --- TESTS MANAGEMENT ---

  public static getTests(): RadiologyTest[] {
    const loaded = this.load<RadiologyTest[]>(STORAGE_KEY_TESTS, [])
    let changed = false
    const tests = [...loaded]
    for (const def of DEFAULT_TESTS) {
      const exists = tests.some(
        (t) => t.id === def.id || t.name.trim().toLowerCase() === def.name.trim().toLowerCase()
      )
      if (!exists) {
        tests.push(def)
        changed = true
      }
    }
    if (changed || loaded.length === 0) {
      this.save(STORAGE_KEY_TESTS, tests)
    }
    return tests
  }

  public static getTestById(id: string): RadiologyTest | undefined {
    return this.getTests().find((t) => t.id === id)
  }

  public static getTestByName(name: string): RadiologyTest | undefined {
    if (!name) return undefined
    const normalized = name.trim().toLowerCase()
    return this.getTests().find((t) => t.name.trim().toLowerCase() === normalized)
  }

  public static saveTest(testData: Partial<RadiologyTest> & { name: string }): RadiologyTest {
    const tests = this.getTests()
    const now = new Date().toISOString()
    const existingIndex = testData.id
      ? tests.findIndex((t) => t.id === testData.id)
      : tests.findIndex((t) => t.name.trim().toLowerCase() === testData.name.trim().toLowerCase())

    if (existingIndex >= 0) {
      const updated: RadiologyTest = {
        ...tests[existingIndex],
        ...testData,
        updatedAt: now,
      }
      tests[existingIndex] = updated
      this.save(STORAGE_KEY_TESTS, tests)
      return updated
    } else {
      const newTest: RadiologyTest = {
        id: testData.id || `rad_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: testData.name.trim(),
        code: testData.code || `RAD-${Math.floor(1000 + Math.random() * 9000)}`,
        category: testData.category || "X-Ray",
        modality: testData.modality || "XR",
        status: testData.status || "Active",
        activeTemplateId: testData.activeTemplateId,
        createdAt: now,
        updatedAt: now,
      }
      tests.push(newTest)
      this.save(STORAGE_KEY_TESTS, tests)
      return newTest
    }
  }

  public static deleteTest(id: string): void {
    const tests = this.getTests().filter((t) => t.id !== id)
    this.save(STORAGE_KEY_TESTS, tests)
  }

  // --- TEMPLATES MANAGEMENT ---

  public static getTemplates(): RadiologyTemplate[] {
    const loaded = this.load<RadiologyTemplate[]>(STORAGE_KEY_TEMPLATES, [])
    let changed = false
    const templates = [...loaded]
    for (const def of DEFAULT_TEMPLATES) {
      const exists = templates.some(
        (t) =>
          t.id === def.id ||
          (t.testName.trim().toLowerCase() === def.testName.trim().toLowerCase() &&
            (t.genderTarget || "All") === (def.genderTarget || "All"))
      )
      if (!exists) {
        templates.push(def)
        changed = true
      }
    }
    if (changed || loaded.length === 0) {
      this.save(STORAGE_KEY_TEMPLATES, templates)
    }
    return templates
  }

  public static getTemplateById(id: string): RadiologyTemplate | undefined {
    return this.getTemplates().find((tpl) => tpl.id === id)
  }

  public static getTemplatesByTestId(testId: string): RadiologyTemplate[] {
    return this.getTemplates()
      .filter((tpl) => tpl.testId === testId)
      .sort((a, b) => b.version - a.version)
  }

  public static getActiveTemplateForTest(testIdOrName: string, gender?: string): RadiologyTemplate | undefined {
    if (!testIdOrName) return undefined
    const templates = this.getTemplates().filter((t) => t.status === "Active")
    if (templates.length === 0) return undefined

    // 0. Direct ID match first
    const byId = templates.find((t) => t.id === testIdOrName || t.testId === testIdOrName)
    if (byId) return byId

    const normName = testIdOrName.trim().toLowerCase()
    const normGender = gender ? gender.trim().toLowerCase() : ""

    // Identify modality context to prevent cross-modality template collision
    const isXRay =
      normName.includes("x-ray") ||
      normName.includes("xray") ||
      normName.includes("xr") ||
      normName.includes("radiograph") ||
      normName.includes("pa/lateral") ||
      normName.includes("pa view") ||
      normName.includes("ap view")
    const isCT =
      normName.includes("ct") ||
      normName.includes("computed tomography") ||
      normName.includes("ncct") ||
      normName.includes("cect") ||
      normName.includes("hrct")
    const isUSG =
      normName.includes("ultrasound") ||
      normName.includes("usg") ||
      normName.includes("sonography") ||
      normName.includes("echo") ||
      normName.includes("doppler")
    const isMRI =
      normName.includes("mri") ||
      normName.includes("magnetic resonance")

    // 1. Exact Test Name Match
    const exactMatches = templates.filter((t) => t.testName.toLowerCase() === normName)
    if (exactMatches.length > 0) {
      if (normGender) {
        const genderExact = exactMatches.find((t) => t.genderTarget && t.genderTarget.toLowerCase() === normGender)
        if (genderExact) return genderExact
      }
      const generalExact = exactMatches.find((t) => !t.genderTarget || t.genderTarget === "All")
      if (generalExact) return generalExact
      return exactMatches[0]
    }

    // 2. Modality-Specific Match
    if (isXRay) {
      const xrayTemplates = templates.filter(
        (t) =>
          (t.testName.toLowerCase().includes("x-ray") ||
            t.testName.toLowerCase().includes("xray") ||
            t.testName.toLowerCase().includes("xr")) &&
          !t.testName.toLowerCase().includes("ct ") &&
          !t.testName.toLowerCase().includes("hrct")
      )

      if (normName.includes("chest") || normName.includes("lungs") || normName.includes("thorax") || normName.includes("cxr")) {
        const cxr = xrayTemplates.find((t) => t.testName.toLowerCase().includes("chest"))
        if (cxr) return cxr
      }

      const anyXr = xrayTemplates.find((t) => t.testName.toLowerCase().includes(normName) || normName.includes(t.testName.toLowerCase()))
      if (anyXr) return anyXr
    }

    if (isCT) {
      const ctTemplates = templates.filter(
        (t) =>
          t.testName.toLowerCase().includes("ct") ||
          t.testName.toLowerCase().includes("computed tomography")
      )

      if (normName.includes("head") || normName.includes("brain")) {
        const ctHead = ctTemplates.find((t) => t.testName.toLowerCase().includes("head") || t.testName.toLowerCase().includes("brain"))
        if (ctHead) return ctHead
      }

      if (normName.includes("chest") || normName.includes("thorax") || normName.includes("hrct")) {
        const ctChest = ctTemplates.find((t) => t.testName.toLowerCase().includes("chest"))
        if (ctChest) return ctChest
      }

      const anyCt = ctTemplates.find((t) => t.testName.toLowerCase().includes(normName) || normName.includes(t.testName.toLowerCase()))
      if (anyCt) return anyCt
    }

    if (isUSG) {
      const usgTemplates = templates.filter(
        (t) =>
          t.testName.toLowerCase().includes("ultrasound") ||
          t.testName.toLowerCase().includes("usg") ||
          t.testName.toLowerCase().includes("abdomen")
      )

      if (normGender) {
        const genderMatch = usgTemplates.find((t) => t.genderTarget && t.genderTarget.toLowerCase() === normGender)
        if (genderMatch) return genderMatch
      }

      const genMatch = usgTemplates.find((t) => !t.genderTarget || t.genderTarget === "All")
      if (genMatch) return genMatch
      if (usgTemplates.length > 0) return usgTemplates[0]
    }

    // 3. Fallback: Gender-specific matching
    if (normGender) {
      const genderTemplates = templates.filter(
        (t) => t.genderTarget && t.genderTarget.toLowerCase() === normGender
      )

      const directGenderMatch = genderTemplates.find(
        (t) =>
          t.testName.toLowerCase().includes(normName) ||
          normName.includes(t.testName.toLowerCase()) ||
          (normName.includes("abdomen") && t.testName.toLowerCase().includes("abdomen"))
      )
      if (directGenderMatch) return directGenderMatch
    }

    // 4. Substring or Keyword Fallback
    const matchingTemplates = templates.filter((t) => {
      const tLower = t.testName.toLowerCase()
      if (tLower.includes(normName) || normName.includes(tLower)) return true
      if (
        (normName.includes("chest") || normName.includes("cxr")) &&
        (tLower.includes("chest") || tLower.includes("cxr")) &&
        // Ensure X-ray doesn't accidentally grab CT or vice-versa
        (!isXRay || (!tLower.includes("ct") && !tLower.includes("hrct"))) &&
        (!isCT || (tLower.includes("ct") || tLower.includes("hrct")))
      ) {
        return true
      }
      if (normName.includes("abdomen") && tLower.includes("abdomen")) return true
      if ((normName.includes("head") || normName.includes("brain")) && (tLower.includes("head") || tLower.includes("brain"))) return true
      return false
    })

    if (matchingTemplates.length > 0) {
      const withContent = matchingTemplates.find((t) => t.rawContent && t.rawContent.trim().length > 10)
      if (withContent) return withContent
      return matchingTemplates[0]
    }

    return undefined
  }

  public static saveTemplate(
    testId: string,
    sections: TemplateSection[],
    options?: {
      rawContent?: string
      uploadedFileUrl?: string
      uploadedFileName?: string
      uploadedFileType?: "pdf" | "word" | "image" | "text" | "json"
      genderTarget?: "All" | "Male" | "Female"
      status?: "Active" | "Inactive"
      createdBy?: string
    }
  ): RadiologyTemplate {
    const test = this.getTestById(testId)
    if (!test) {
      throw new Error(`Radiology Test with ID "${testId}" not found.`)
    }

    const templates = this.getTemplates()
    const reports = this.getReports()
    const existingTemplates = templates.filter((t) => t.testId === testId)

    const now = new Date().toISOString()
    let newVersion = 1

    if (existingTemplates.length > 0) {
      const maxVer = Math.max(...existingTemplates.map((t) => t.version))
      newVersion = maxVer + 1
    }

    const currentActive = existingTemplates.find((t) => t.status === "Active")
    const isCurrentInUse = currentActive ? reports.some((r) => r.templateId === currentActive.id) : false

    const templateStatus = options?.status || "Active"
    const targetGender = options?.genderTarget || "All"
    if (templateStatus === "Active") {
      templates.forEach((t) => {
        if (t.testId === testId && (t.genderTarget || "All") === targetGender) {
          t.status = isCurrentInUse ? "Archived" : "Inactive"
        }
      })
    }

    const newTemplate: RadiologyTemplate = {
      id: `rad_tpl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      testId: test.id,
      testName: test.name,
      genderTarget: options?.genderTarget || "All",
      version: newVersion,
      status: templateStatus,
      sections,
      rawContent: options?.rawContent,
      uploadedFileUrl: options?.uploadedFileUrl,
      uploadedFileName: options?.uploadedFileName,
      uploadedFileType: options?.uploadedFileType,
      createdAt: now,
      updatedAt: now,
      createdBy: options?.createdBy || "Authorized User",
    }

    templates.push(newTemplate)
    this.save(STORAGE_KEY_TEMPLATES, templates)

    if (templateStatus === "Active") {
      this.saveTest({
        id: test.id,
        name: test.name,
        activeTemplateId: newTemplate.id,
        status: test.status,
      })
    }

    AuditDatabase.logEvent(
      "Radiology Template Created/Updated",
      "Radiology",
      `Created template version ${newVersion} for test "${test.name}".`,
      "Success"
    )

    return newTemplate
  }

  public static toggleTemplateStatus(templateId: string): RadiologyTemplate {
    const templates = this.getTemplates()
    const tplIndex = templates.findIndex((t) => t.id === templateId)
    if (tplIndex < 0) {
      throw new Error("Template not found.")
    }

    const target = templates[tplIndex]
    const nextStatus = target.status === "Active" ? "Inactive" : "Active"
    target.status = nextStatus
    target.updatedAt = new Date().toISOString()

    if (nextStatus === "Active") {
      templates.forEach((t) => {
        if (t.testId === target.testId && t.id !== target.id) {
          t.status = "Inactive"
        }
      })
      const test = this.getTestById(target.testId)
      if (test) {
        this.saveTest({
          id: test.id,
          name: test.name,
          activeTemplateId: target.id,
          status: "Active",
        })
      }
    }

    this.save(STORAGE_KEY_TEMPLATES, templates)

    AuditDatabase.logEvent(
      "Radiology Template Status Changed",
      "Radiology",
      `Changed template status for "${target.testName}" (v${target.version}) to ${nextStatus}.`,
      "Success"
    )

    return target
  }

  public static deleteTemplate(templateId: string): void {
    const templates = this.getTemplates().filter((t) => t.id !== templateId)
    this.save(STORAGE_KEY_TEMPLATES, templates)
    AuditDatabase.logEvent(
      "Radiology Template Deleted",
      "Radiology",
      `Deleted radiology report template ID ${templateId}.`,
      "Success"
    )
  }

  // --- REPORTS PERSISTENCE ---

  public static getReports(): RadiologyReportRecord[] {
    return this.load<RadiologyReportRecord[]>(STORAGE_KEY_REPORTS, [])
  }

  public static getReportByStudyId(studyId: string): RadiologyReportRecord | undefined {
    return this.getReports().find((r) => r.studyId === studyId)
  }

  public static saveReportDraft(reportData: {
    studyId: string
    patientName: string
    mrn: string
    umr?: string
    encounterId?: string
    referringDoctor?: string
    orderedDate?: string
    testId: string
    testName: string
    templateId: string
    templateVersion: number
    templateStructure: TemplateSection[]
    fieldValues: Record<string, any>
    technicianNotes?: string
    technicianSignature?: string
    radiologistName?: string
    uploadedFileUrl?: string
    uploadedFileName?: string
    uploadedFileType?: string
  }): RadiologyReportRecord {
    const reports = this.getReports()
    const now = new Date().toISOString()
    const existingIndex = reports.findIndex((r) => r.studyId === reportData.studyId)

    const record: RadiologyReportRecord = {
      id: existingIndex >= 0 ? reports[existingIndex].id : `RAD-RPT-${Math.floor(10000 + Math.random() * 90000)}`,
      ...reportData,
      status: "Draft",
      savedAt: now,
    }

    if (existingIndex >= 0) {
      reports[existingIndex] = record
    } else {
      reports.push(record)
    }

    this.save(STORAGE_KEY_REPORTS, reports)

    try {
      BillingDatabase.updateRadiologyStudy(reportData.studyId, {
        status: "Reporting",
        reportStatus: "Draft",
      })
    } catch {}

    AuditDatabase.logEvent(
      "Radiology Report Draft Saved",
      "Radiology",
      `Saved report draft for patient ${reportData.patientName} (${reportData.testName}).`,
      "Success"
    )

    return record
  }

  public static finalizeReport(reportData: {
    studyId: string
    patientName: string
    mrn: string
    umr?: string
    encounterId?: string
    referringDoctor?: string
    orderedDate?: string
    testId: string
    testName: string
    templateId: string
    templateVersion: number
    templateStructure: TemplateSection[]
    fieldValues: Record<string, any>
    technicianNotes?: string
    technicianSignature?: string
    radiologistName?: string
    uploadedFileUrl?: string
    uploadedFileName?: string
    uploadedFileType?: string
  }): RadiologyReportRecord {
    reportData.templateStructure.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required) {
          const val = reportData.fieldValues[field.id]
          if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
            throw new Error(`Field "${field.label}" in section "${section.title}" is required.`)
          }
        }
      })
    })

    const reports = this.getReports()
    const now = new Date().toISOString()
    const existingIndex = reports.findIndex((r) => r.studyId === reportData.studyId)

    const record: RadiologyReportRecord = {
      id: existingIndex >= 0 ? reports[existingIndex].id : `RAD-RPT-${Math.floor(10000 + Math.random() * 90000)}`,
      ...reportData,
      status: "Final",
      savedAt: now,
      finalizedAt: now,
    }

    if (existingIndex >= 0) {
      reports[existingIndex] = record
    } else {
      reports.push(record)
    }

    this.save(STORAGE_KEY_REPORTS, reports)

    const findingsList: string[] = []
    const impressionList: string[] = []

    reportData.templateStructure.forEach((sec) => {
      sec.fields.forEach((f) => {
        const val = reportData.fieldValues[f.id]
        if (val !== undefined && val !== null && val !== "") {
          const textVal = `${f.label}: ${val}`
          if (sec.title.toLowerCase().includes("impression") || sec.title.toLowerCase().includes("conclusion")) {
            impressionList.push(textVal)
          } else {
            findingsList.push(textVal)
          }
        }
      })
    })

    try {
      BillingDatabase.updateRadiologyStudy(reportData.studyId, {
        status: "Final",
        reportStatus: "Final",
        findings: findingsList.length > 0 ? findingsList : undefined,
        impression: impressionList.length > 0 ? impressionList : undefined,
        radiologist: reportData.radiologistName || "Radiology Specialist",
        signedAt: now,
      })
    } catch (e) {
      console.warn("Error syncing study with BillingDatabase", e)
    }

    AuditDatabase.logEvent(
      "Radiology Report Finalized",
      "Radiology",
      `Finalized radiology report for ${reportData.patientName} (${reportData.testName}) using template v${reportData.templateVersion}.`,
      "Success"
    )

    return record
  }
}
