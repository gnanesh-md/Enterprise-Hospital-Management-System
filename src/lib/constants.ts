// Points at the ER/Bed Management backend started via `python backend/app.py`
// (see backend/README section of the integration report) -- same
// hardcoded-localhost:8000 convention already used by SmartOCR.tsx/
// SymptomAI.tsx/ClinicalSummaries.tsx elsewhere in this app.
//
// VITE_API_BASE overrides this at build time (see .env.production, used for
// the Cloudflare Pages deploy, where the backend isn't reachable at
// localhost -- it's a Cloudflare Tunnel URL instead). Local dev is
// unaffected: no .env.production is loaded in dev mode, so this still
// defaults to localhost.
const API_BASE_OVERRIDE = import.meta.env.VITE_API_BASE as string | undefined;
export const API_BASE = API_BASE_OVERRIDE || "http://localhost:8010";
export const SYMPTOM_API_BASE = API_BASE_OVERRIDE || "http://localhost:8010";

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "tif",
  "tiff",
  "bmp",
  "gif",
  "heic",
  "heif",
];

const SUPPORTED_DOCUMENT_EXTENSION_SET = new Set(SUPPORTED_DOCUMENT_EXTENSIONS);

export const SUPPORTED_DOCUMENT_ACCEPT = SUPPORTED_DOCUMENT_EXTENSIONS.map(
  (ext) => `.${ext}`,
).join(",");

export const isSupportedDocumentFile = (file: File) => {
  const parts = file.name.toLowerCase().split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1] : "";
  return SUPPORTED_DOCUMENT_EXTENSION_SET.has(ext);
};
