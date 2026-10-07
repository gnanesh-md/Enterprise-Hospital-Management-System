/**
 * Utility to classify clinical tests as Radiology vs Laboratory,
 * determine imaging modalities, default rooms, and prices.
 */
import { priceForTest } from "../services/labOrdersDb"

export function isRadiologyTest(testName: string, category?: string): boolean {
  if (category) {
    const c = category.trim().toUpperCase()
    if (
      c.includes("RADIOLOGY") ||
      c.includes("IMAGING") ||
      c === "XR" ||
      c === "CT" ||
      c === "MR" ||
      c === "US" ||
      c === "NM"
    ) {
      return true
    }
  }

  const name = (testName || "").toLowerCase().trim()
  if (!name) return false

  const keywords = [
    "x-ray", "xray", "x ray", "radiograph", "radiography",
    "ct scan", "ct head", "ct chest", "ct abdomen", "ct spine", "ct pelvis", "ct angiogram", "ct-",
    "mri", "magnetic resonance",
    "ultrasound", "usg", "sonogram", "sonography",
    "echocardiogram", "2d echo", "echo ",
    "doppler",
    "mammogram", "mammography",
    "pet scan", "pet-ct", "scintigraphy", "nuclear medicine",
    "dexa", "fluoroscopy"
  ]

  if (name.startsWith("ct ") || name.startsWith("ct-") || name.endsWith(" ct") || name.includes(" ct ") || name.includes("ct scan")) {
    return true
  }

  return keywords.some((kw) => name.includes(kw))
}

export function getModalityForTest(testName: string): "XR" | "CT" | "MR" | "US" | "NM" {
  const name = (testName || "").toLowerCase().trim()
  if (name.includes("mri") || name.includes("magnetic")) return "MR"
  if (name.includes("ct") || name.includes("computed tomography")) return "CT"
  if (name.includes("ultrasound") || name.includes("usg") || name.includes("echo") || name.includes("doppler") || name.includes("sonogram")) return "US"
  if (name.includes("pet") || name.includes("nuclear") || name.includes("mammogram")) return "NM"
  return "XR"
}

export function getRoomForModality(modality: "XR" | "CT" | "MR" | "US" | "NM"): string {
  switch (modality) {
    case "CT": return "CT-1"
    case "MR": return "MR-1"
    case "US": return "US-1"
    case "NM": return "NM-1"
    case "XR": default: return "XR-1"
  }
}
