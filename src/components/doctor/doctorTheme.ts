/**
 * Colours for the doctor screens -- the administrator's Doctors overview and
 * each doctor's own workspace share them, so a colour means the same thing on
 * both: a specialty's hue for the doctor, a stage's hue for where a patient is.
 *
 * Values are hex (applied with inline styles) because they are chosen at
 * runtime from the doctor's specialty; Tailwind only ships classes it can see.
 */

export interface Hue {
  /** Solid accent: borders, active tabs, dots. */
  solid: string
  /** Gradient stops for bands and avatars. */
  from: string
  to: string
  /** Tinted background and its border. */
  soft: string
  border: string
  /** Text on the tinted background. */
  text: string
}

const HUES: Record<string, Hue> = {
  rose: { solid: "#E11D48", from: "#F43F5E", to: "#9F1239", soft: "#FFF1F2", border: "#FECDD3", text: "#BE123C" },
  amber: { solid: "#D97706", from: "#F59E0B", to: "#B45309", soft: "#FFFBEB", border: "#FDE68A", text: "#B45309" },
  violet: { solid: "#7C3AED", from: "#8B5CF6", to: "#5B21B6", soft: "#F5F3FF", border: "#DDD6FE", text: "#6D28D9" },
  red: { solid: "#DC2626", from: "#EF4444", to: "#991B1B", soft: "#FEF2F2", border: "#FECACA", text: "#B91C1C" },
  blue: { solid: "#2563EB", from: "#3B82F6", to: "#1E40AF", soft: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8" },
  pink: { solid: "#DB2777", from: "#EC4899", to: "#9D174D", soft: "#FDF2F8", border: "#FBCFE8", text: "#BE185D" },
  teal: { solid: "#0D9488", from: "#14B8A6", to: "#115E59", soft: "#F0FDFA", border: "#99F6E4", text: "#0F766E" },
  sky: { solid: "#0284C7", from: "#0EA5E9", to: "#075985", soft: "#F0F9FF", border: "#BAE6FD", text: "#0369A1" },
  fuchsia: { solid: "#C026D3", from: "#D946EF", to: "#86198F", soft: "#FDF4FF", border: "#F5D0FE", text: "#A21CAF" },
  orange: { solid: "#EA580C", from: "#F97316", to: "#9A3412", soft: "#FFF7ED", border: "#FED7AA", text: "#C2410C" },
  cyan: { solid: "#0891B2", from: "#06B6D4", to: "#155E75", soft: "#ECFEFF", border: "#A5F3FC", text: "#0E7490" },
  indigo: { solid: "#4F46E5", from: "#6366F1", to: "#3730A3", soft: "#EEF2FF", border: "#C7D2FE", text: "#4338CA" },
  emerald: { solid: "#059669", from: "#10B981", to: "#065F46", soft: "#ECFDF5", border: "#A7F3D0", text: "#047857" },
  green: { solid: "#16A34A", from: "#22C55E", to: "#166534", soft: "#F0FDF4", border: "#BBF7D0", text: "#15803D" },
  purple: { solid: "#9333EA", from: "#A855F7", to: "#6B21A8", soft: "#FAF5FF", border: "#E9D5FF", text: "#7E22CE" },
  slate: { solid: "#475569", from: "#64748B", to: "#1E293B", soft: "#F8FAFC", border: "#E2E8F0", text: "#334155" },
}

const SPECIALTY_RULES: [RegExp, keyof typeof HUES][] = [
  [/cardio|heart/i, "rose"],
  [/ortho|trauma|spine|joint/i, "amber"],
  [/neuro/i, "violet"],
  [/emergency|critical|casualty|icu/i, "red"],
  [/pediatric|paediatric|child|neonat/i, "pink"],
  [/gastro|hepat|liver/i, "teal"],
  [/pulmo|chest|respir/i, "sky"],
  [/gyn|obst|women/i, "fuchsia"],
  [/derma|skin/i, "orange"],
  [/\bent\b|otolaryn|ear/i, "cyan"],
  [/urolog/i, "indigo"],
  [/nephro|kidney/i, "emerald"],
  [/onco|cancer/i, "purple"],
  [/surgery|surgical/i, "green"],
  [/endocrin|diabet/i, "orange"],
  [/radiolog|imaging/i, "slate"],
  [/medicine|internal|physician|general/i, "blue"],
]

const FALLBACK: (keyof typeof HUES)[] = ["blue", "teal", "violet", "amber", "sky", "rose", "emerald", "indigo"]

/** The colour a specialty is drawn in -- stable for a given name. */
export function specialtyHue(specialty?: string | null): Hue {
  const s = (specialty || "").trim()
  for (const [re, hue] of SPECIALTY_RULES) if (re.test(s)) return HUES[hue]
  if (!s) return HUES.slate
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return HUES[FALLBACK[h % FALLBACK.length]]
}

/** Where a patient is in the visit -- one colour per stage, on every doctor screen. */
export const STAGE_HUES = {
  Registered: HUES.slate,
  "With nurse": HUES.amber,
  Waiting: HUES.orange,
  "In consultation": HUES.blue,
  "After consultation": HUES.violet,
  Completed: HUES.green,
} as const

export const TONE = HUES

export const gradient = (h: Hue, angle = 135) => `linear-gradient(${angle}deg, ${h.from}, ${h.to})`

/**
 * A header band: dark stop first, so white text on the left (the name) keeps
 * its contrast even for light hues like amber and orange.
 */
export const band = (h: Hue, angle = 120) => `linear-gradient(${angle}deg, ${h.to} 0%, ${h.solid} 100%)`
