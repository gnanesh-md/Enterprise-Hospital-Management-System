import { getDoctorMaster, DOCTOR_LOCAL_PASSWORD } from "./doctorMaster"

export interface AppRole {
  id: string

  name: string

  allowedModules: string[]
}

export interface AppUser {
  id: string

  username: string

  password?: string // Stored just for mock login validation

  roleId: string

  name: string

  staffId: string

  status?: "Active" | "Inactive"
}

// v12: billing split into per-counter pages (billing_op/ip/er/unified/revenue).
// v14: insurance claims moved to the Insurance department (insurance_eligibility
//      sub-page); the short-lived billing_insurance desk is gone.
// v15: "billing" became the Billing Dashboard.
// v16: Insurance department split into dashboard, eligibility & pre-auth,
//      claims, queries, settlement and masters pages.
// v17: Insurance Desk became the landing page; old dashboard moved to insurance_overview.
// v18: Insurance split into dashboard, work desk, pre-auth, claims, queries,
//      settlements, reconciliation and five master pages.
// v19: insurance.* action permissions; Insurance Officer, Finance and Billing roles.
// v20: Added dedicated Email & TPA Decision Hub (insurance_emails) to Insurance suite.
const ROLES_STORAGE_KEY = "hospai_rbac_roles_v20"

const USERS_STORAGE_KEY = "hospai_rbac_users_v2"

export const ALL_SYSTEM_MODULES = [
  "dashboard",
  "patients",
  "appointments",
  "emergency",

  "clinical",
  "inpatient",
  "nursing",
  "laboratory",

  "radiology",
  "pharmacy",
  "pharmacy_dispensing",
  "pharmacy_rx",
  "pharmacy_ocr",
  "pharmacy_returns",
  "pharmacy_supplier_returns",

  "pharmacy_medicine",
  "pharmacy_category",
  "pharmacy_suppliers",
  "pharmacy_po",

  "pharmacy_grn",
  "pharmacy_ledger",
  "pharmacy_transfers",
  "pharmacy_expiry",
  "pharmacy_analytics",

  "pharmacy_notifications",
  "pharmacy_users",
  "pharmacy_audit",
  "pharmacy_settings",

  "surgery",
  "billing",
  "billing_op",
  "billing_ip",
  "billing_er",
  "billing_unified",
  "billing_revenue",

  "icu",
  "discharge",
  "triage",
  "insurance",
  "insurance_overview",
  "insurance_desk",
  "insurance_preauth",
  "insurance_reconciliation",
  "insurance_tpas",
  "insurance_packages",
  "insurance_pricing",
  "insurance_docrules",
  "insurance_eligibility",
  "insurance_claims",
  "insurance_queries",
  "insurance_emails",
  "insurance_settlement",
  "insurance_masters",
  "analytics",

  "reports",
  "reports_overview",
  "reports_patients",
  "reports_op",
  "reports_er",
  "reports_inpatient",

  "reports_appointments",
  "reports_doctors",
  "reports_pharmacy",
  "reports_laboratory",
  "reports_radiology",

  "reports_beds",
  "reports_admissions",
  "reports_discharges",
  "reports_staff",

  "admin",
  "chart",
  "register",

  "outpatient",
  "queue",
  "op_management",
  "op_registration",
  "op_workflow",
  "op_nurse",

  "doctor_workflow",
  "doctor_portal",
  "scheduling",
  "admissions",
  "readmission",
  "lab_billing",

  "payments",
  "revenue_reports",
  "reports_pharmacy_damaged",
  "reports_supplier_returns",
  "hrms",
  "employees",
  "patient_exp",

  "intelligence",
  "ocr",
  "dpi_ocr",
  "symptom_ai",
  "clinical_rag",
  "clinical_summaries",
  "bulk_ai",
  "nl_filtering",

  "beds",
]

/**
 * Insurance action permissions. They live in a role's allowedModules next to
 * the module keys. A role that has the "insurance" module but none of these
 * keeps full insurance access (as before they existed); a role that lists any
 * of them gets exactly those. Enforced by the insurance engine itself.
 */
export const INSURANCE_PERMISSIONS = {
  "insurance.view": "View insurance cases",
  "insurance.create": "Capture insurance / open a case",
  "insurance.verify": "Verify eligibility",
  "insurance.preauth.create": "Prepare pre-authorisation",
  "insurance.preauth.submit": "Submit pre-auth & record insurer replies",
  "insurance.claim.create": "Prepare claim, documents and discharge",
  "insurance.claim.submit": "Submit claim & record decisions",
  "insurance.query.respond": "Respond to insurer queries",
  "insurance.settlement.view": "View settlements",
  "insurance.reconciliation.manage": "Record payments & reconcile",
  "insurance.master.manage": "Manage insurance masters",
} as const
export type InsurancePermission = keyof typeof INSURANCE_PERMISSIONS
const ALL_INSURANCE_PERMISSIONS = Object.keys(INSURANCE_PERMISSIONS) as InsurancePermission[]
const INSURANCE_PAGES = ["insurance", "insurance_desk", "insurance_preauth", "insurance_claims", "insurance_queries", "insurance_emails", "insurance_settlement", "insurance_reconciliation"]
const INSURANCE_MASTER_PAGES = ["insurance_masters", "insurance_tpas", "insurance_packages", "insurance_pricing", "insurance_docrules"]

// Super admin role gets everything

const INITIAL_ROLES: AppRole[] = [
  {
    id: "ROLE_SUPERADMIN",
    name: "Super Administrator",
    allowedModules: ALL_SYSTEM_MODULES,
  },

  {
    id: "ROLE_ADMIN",
    name: "Hospital Administrator",
    allowedModules: ALL_SYSTEM_MODULES,
  },

  {
    id: "ROLE_DOCTOR",

    name: "Attending Physician / Doctor",
    allowedModules: [
      "dashboard",
      "doctor_portal",
      "patients",
      "appointments",
      "clinical",
      "chart",
      "emergency",
      "triage",

      "icu",
      "inpatient",
      "op_nurse",
      "op_management",
      "pharmacy",
      "pharmacy_dispensing",
      "pharmacy_rx",
      "pharmacy_ocr",

      "pharmacy_medicine",
      "pharmacy_ledger",
      "pharmacy_expiry",

      "laboratory",
      "radiology",
      "intelligence",
      "dpi_ocr",
      "discharge",
      "surgery",

      // Clinical side of insurance: the pre-auth's diagnosis, notes and procedures.
      "insurance_preauth",
      "insurance.view",
      "insurance.preauth.create",
      "insurance.claim.create",
    ],
  },

  {
    id: "ROLE_RECEPTION",

    name: "Receptionist / Front Desk",

    allowedModules: [
      "dashboard",
      "patients",
      "register",
      "appointments",
      "outpatient",
      "queue",
      "op_management",

      // No op_nurse: vitals are the OP department's job, not the front desk's.

      "op_registration",
      "billing",
      "billing_op",
      "billing_ip",
      "billing_er",
      "billing_unified",
      "payments",
      "lab_billing",
      "laboratory",

      // Insurance: view and basic capture at registration / admission.
      "insurance",
      "insurance_desk",
      "insurance.view",
      "insurance.create",
    ],
  },

  {
    id: "ROLE_INSURANCE",
    name: "Insurance Officer / TPA Desk",
    allowedModules: ["dashboard", "patients", "chart", "inpatient", "discharge", "billing_ip", "billing_unified", ...INSURANCE_PAGES, ...ALL_INSURANCE_PERMISSIONS.filter((p) => p !== "insurance.master.manage")],
  },

  {
    id: "ROLE_FINANCE",
    name: "Finance / Accounts",
    allowedModules: ["dashboard", "billing", "billing_revenue", "payments", "insurance", "insurance_claims", "insurance_settlement", "insurance_reconciliation", "insurance.view", "insurance.settlement.view", "insurance.reconciliation.manage"],
  },

  {
    id: "ROLE_BILLING",
    name: "Billing Specialist",
    allowedModules: ["dashboard", "patients", "billing", "billing_op", "billing_ip", "billing_er", "billing_unified", "billing_revenue", "payments", "lab_billing", "insurance", "insurance_claims", "insurance_packages", "insurance.view", "insurance.claim.create"],
  },

  {
    id: "ROLE_PHARMACY",

    name: "Pharmacist / Pharmacy Staff",

    allowedModules: [
      "dashboard",
      "pharmacy",
      "pharmacy_dispensing",
      "pharmacy_rx",
      "pharmacy_ocr",
      "pharmacy_returns",
      "pharmacy_supplier_returns",

      "pharmacy_medicine",
      "pharmacy_category",
      "pharmacy_suppliers",
      "pharmacy_po",

      "pharmacy_grn",
      "pharmacy_ledger",
      "pharmacy_transfers",
      "pharmacy_expiry",
      "pharmacy_analytics",

      "pharmacy_notifications",
      "pharmacy_settings",

      "dpi_ocr",
      "patients",
      "chart",
      "billing",
      "reports",
      "revenue_reports",
      "reports_pharmacy_damaged",
      "reports_supplier_returns",
    ],
  },

  {
    id: "ROLE_LAB",

    name: "Laboratory & Radiology Tech",

    allowedModules: [
      "dashboard",
      "laboratory",
      "radiology",
      "patients",
      "chart",
      "reports",
    ],
  },

  {
    id: "ROLE_NURSE",

    name: "Registered Nurse",

    allowedModules: [
      "dashboard",
      "inpatient",
      "nursing",
      "icu",
      "beds",
      "chart",
      "emergency",
      "triage",
      "op_nurse",
      "op_management",
      "queue",
      "outpatient",
      "surgery",
    ],
  },

  {
    id: "ROLE_PHARMACY_MANAGER",

    name: "Pharmacy Manager",

    allowedModules: [
      "dashboard",
      "reports",
      "inventory",

      "pharmacy",
      "pharmacy_dispensing",
      "pharmacy_rx",
      "pharmacy_ocr",
      "pharmacy_returns",
      "pharmacy_supplier_returns",

      "pharmacy_medicine",
      "pharmacy_category",
      "pharmacy_suppliers",
      "pharmacy_po",

      "pharmacy_grn",
      "pharmacy_ledger",
      "pharmacy_transfers",
      "pharmacy_expiry",
      "pharmacy_analytics",

      "pharmacy_notifications",
      "pharmacy_users",
      "pharmacy_audit",
      "pharmacy_settings",

      "revenue_reports",
      "reports_pharmacy_damaged",
      "reports_supplier_returns",
    ],
  },

  {
    id: "ROLE_PHARMACIST",

    name: "Pharmacist",

    allowedModules: [
      "dashboard",

      "pharmacy",
      "pharmacy_dispensing",
      "pharmacy_rx",
      "pharmacy_ocr",
      "pharmacy_returns",
      "pharmacy_supplier_returns",

      "pharmacy_medicine",
      "pharmacy_category",
      "pharmacy_suppliers",
      "pharmacy_po",

      "pharmacy_grn",
      "pharmacy_ledger",
      "pharmacy_transfers",
      "pharmacy_expiry",
      "pharmacy_analytics",
    ],
  },

  {
    id: "ROLE_PHARMACY_ASSISTANT",

    name: "Pharmacy Assistant",

    allowedModules: [
      "dashboard",
      "pharmacy",
      "pharmacy_dispensing",
      "pharmacy_rx",
      "pharmacy_ocr",
      "pharmacy_returns",
      "pharmacy_supplier_returns",

      "pharmacy_medicine",
      "pharmacy_ledger",
      "pharmacy_expiry",
    ],
  },
]

export function getInitialUsers(): AppUser[] {
  const baseUsers: AppUser[] = [
    {
      id: "U_SUPERADMIN",
      username: "superadmin",
      password: "password123",
      roleId: "ROLE_SUPERADMIN",
      name: "Dr. Alexander Vance",
      staffId: "SUP-001",
      status: "Active",
    },

    {
      id: "U_ADMIN",
      username: "admin",
      password: "password123",
      roleId: "ROLE_ADMIN",
      name: "System Administrator",
      staffId: "ADM-001",
      status: "Active",
    },

    {
      id: "U_DOCTOR",
      username: "doctor",
      password: "password123",
      roleId: "ROLE_DOCTOR",
      name: "Dr. Sarah Jenkins",
      staffId: "DOC-402",
      status: "Active",
    },

    {
      id: "U_RECEPTION",
      username: "reception",
      password: "password123",
      roleId: "ROLE_RECEPTION",
      name: "Elena Torres",
      staffId: "REC-102",
      status: "Active",
    },

    {
      id: "U_PHARMACY",
      username: "pharmacy",
      password: "password123",
      roleId: "ROLE_PHARMACY",
      name: "Robert Williams, RPh",
      staffId: "PHM-844",
      status: "Active",
    },

    {
      id: "U_LAB",
      username: "lab",
      password: "password123",
      roleId: "ROLE_LAB",
      name: "Michael Chang, CLS",
      staffId: "LAB-512",
      status: "Active",
    },

    {
      id: "U_INSURANCE",
      username: "insurance",
      password: "password123",
      roleId: "ROLE_INSURANCE",
      name: "Priya Nair",
      staffId: "INS-210",
      status: "Active",
    },

    {
      id: "U_FINANCE",
      username: "finance",
      password: "password123",
      roleId: "ROLE_FINANCE",
      name: "Rahul Mehta",
      staffId: "FIN-118",
      status: "Active",
    },

    {
      id: "U_BILLING",
      username: "billing",
      password: "password123",
      roleId: "ROLE_BILLING",
      name: "Anita Rao",
      staffId: "BIL-305",
      status: "Active",
    },

    {
      id: "U_NURSE",
      username: "nurse",
      password: "password123",
      roleId: "ROLE_NURSE",
      name: "Jessica Carter, RN",
      staffId: "RN-8821",
      status: "Active",
    },
  ]

  const doctorUsers: AppUser[] = getDoctorMaster()

    .filter((d) => d.verified && d.username)

    .map((d) => ({
      id: `U_${d.id}`,

      username: d.username as string,

      password: DOCTOR_LOCAL_PASSWORD,

      roleId: "ROLE_DOCTOR",

      name: d.name,

      staffId: d.staffId,

      status: "Active",
    }))

  return [...baseUsers, ...doctorUsers]
}

export class RoleDatabase {
  static getRoles(): AppRole[] {
    if (typeof window === "undefined") return INITIAL_ROLES

    try {
      const stored = window.localStorage.getItem(ROLES_STORAGE_KEY)

      if (!stored) {
        window.localStorage.setItem(
          ROLES_STORAGE_KEY,
          JSON.stringify(INITIAL_ROLES),
        )

        return INITIAL_ROLES
      }

      return JSON.parse(stored)
    } catch {
      return INITIAL_ROLES
    }
  }

  static saveRoles(roles: AppRole[]): void {
    if (typeof window === "undefined") return

    try {
      window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles))
    } catch (e) {
      console.error("Failed to save roles", e)
    }
  }

  static getUsers(): AppUser[] {
    const initial = getInitialUsers()

    if (typeof window === "undefined") return initial

    try {
      const stored = window.localStorage.getItem(USERS_STORAGE_KEY)

      if (!stored) {
        window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial))

        return initial
      }

      // Seeded accounts added in a later release (e.g. insurance, finance)
      // join an existing store; accounts already there are left as edited.
      const users: AppUser[] = JSON.parse(stored)
      const missing = initial.filter((u) => !users.some((x) => x.id === u.id || x.username === u.username))
      if (missing.length) {
        const merged = [...users, ...missing]
        window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged))
        return merged
      }
      return users
    } catch {
      return initial
    }
  }

  static saveUsers(users: AppUser[]): void {
    if (typeof window === "undefined") return

    try {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))

      window.dispatchEvent(new Event("rbac_users_updated"))
    } catch (e) {
      console.error("Failed to save users", e)
    }
  }

  static upsertUser(user: AppUser): AppUser[] {
    const current = this.getUsers()

    const idx = current.findIndex(
      (u) =>
        u.id === user.id ||
        u.username.toLowerCase() === user.username.toLowerCase(),
    )

    let updated: AppUser[]

    if (idx >= 0) {
      updated = [...current]

      updated[idx] = { ...updated[idx], ...user }
    } else {
      updated = [...current, user]
    }

    this.saveUsers(updated)

    return updated
  }

  static deleteUser(id: string): AppUser[] {
    const current = this.getUsers()

    const updated = current.filter((u) => u.id !== id)

    this.saveUsers(updated)

    return updated
  }

  static authenticate(username: string, password?: string): {
    user: AppUser
    role: AppRole
  } | null {
    const users = this.getUsers()

    const user = users.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password &&
        u.status !== "Inactive",
    )

    if (!user) return null

    const roles = this.getRoles()

    const role = roles.find((r) => r.id === user.roleId) || roles[0] // fallback to first role if missing

    return { user, role }
  }
}

export type PermissionAction = "read" | "write" | "delete" | "export"

export function hasGranularPermission(
  allowedModules: string[],

  moduleName: string,

  action?: PermissionAction,
): boolean {
  if (!allowedModules) return false

  if (allowedModules.includes(moduleName) || allowedModules.includes("*"))
    return true

  if (!action) {
    return allowedModules.some(
      (m) => m === moduleName || m.startsWith(`${moduleName}:`),
    )
  }

  return allowedModules.includes(`${moduleName}:${action}`)
}

export function getGrantedActionsForModule(
  allowedModules: string[],

  moduleName: string,
): PermissionAction[] {
  if (!allowedModules) return []

  if (allowedModules.includes(moduleName) || allowedModules.includes("*")) {
    return ["read", "write", "delete", "export"]
  }

  const actions: PermissionAction[] = []

  if (allowedModules.includes(`${moduleName}:read`)) actions.push("read")

  if (allowedModules.includes(`${moduleName}:write`)) actions.push("write")

  if (allowedModules.includes(`${moduleName}:delete`)) actions.push("delete")

  if (allowedModules.includes(`${moduleName}:export`)) actions.push("export")

  return actions
}

/** Can the signed-in user perform this insurance action? */
export function insuranceCan(perm: InsurancePermission): boolean {
  if (typeof window === "undefined") return true
  let username = ""
  try {
    username = String(JSON.parse(localStorage.getItem("hospai_current_user") || "null")?.user || "")
  } catch {}
  if (!username) return true // no session (tests, background sync) -- nothing to check against
  const user = RoleDatabase.getUsers().find((u) => u.username.toLowerCase() === username.toLowerCase())
  const role = user && RoleDatabase.getRoles().find((r) => r.id === user.roleId)
  if (!role) return true
  const mods = role.allowedModules
  if (role.id === "ROLE_SUPERADMIN" || role.id === "ROLE_ADMIN" || mods.includes("*")) return true
  const explicit = mods.filter((m) => m.startsWith("insurance."))
  if (!explicit.length) return mods.includes("insurance") || INSURANCE_PAGES.some((p) => mods.includes(p))
  return mods.includes(perm)
}

export { INSURANCE_MASTER_PAGES }

