import React, { useState, useEffect } from "react"
import {
  getDoctorMaster,
  addDoctorMaster,
  updateDoctorMaster,
  deleteDoctorMaster,
  MasterDoctor,
  DoctorSection,
  availabilityOf,
  DOCTOR_LOCAL_PASSWORD,
} from "../services/doctorMaster"
import {
  RoleDatabase,
  AppRole,
  AppUser,
  ALL_SYSTEM_MODULES,
  PermissionAction,
  getGrantedActionsForModule,
} from "../services/roleDb"
import { AuditDatabase, AuditLog, detectDevice } from "../services/auditDb"
import { apiFetch } from "../lib/api"

// System Module Categories for clean RBAC governance
const MODULE_CATEGORIES = [
  {
    id: "clinical",
    title: "Clinical Care & EMR",
    description:
      "Inpatient, Doctor, Nursing, ICU, ER, Triage & Surgery Workflows",
    modules: [
      "clinical",
      "doctor_workflow",
      "patients",
      "chart",
      "inpatient",
      "nursing",
      "icu",
      "emergency",
      "triage",
      "surgery",
      "discharge",
      "readmission",
      "admissions",
    ],
  },
  {
    id: "diagnostics",
    title: "Diagnostics & Pharmacy",
    description:
      "Pharmacy dispensing, Laboratory tests, Radiology imaging & Reports",
    modules: ["pharmacy", "laboratory", "radiology", "reports"],
  },
  {
    id: "frontoffice",
    title: "Front Desk & Revenue Cycle",
    description:
      "Patient Registration, Outpatient Queue, Scheduling, Billing, Payments & Insurance",
    modules: [
      "register",
      "appointments",
      "outpatient",
      "queue",
      "op_management",
      "op_registration",
      "op_workflow",
      "scheduling",
      "billing",
      "payments",
      "insurance",
      "revenue_reports",
    ],
  },
  {
    id: "ai_intelligence",
    title: "AI & Document Intelligence",
    description:
      "Keppler OCR, Medical Document Summaries, Clinical RAG & Symptom AI",
    modules: [
      "intelligence",
      "ocr",
      "dpi_ocr",
      "symptom_ai",
      "clinical_rag",
      "clinical_summaries",
      "bulk_ai",
      "nl_filtering",
    ],
  },
  {
    id: "workforce",
    title: "Staff & Workforce",
    description: "Human Resource Management, Employee Directory & Experience",
    modules: ["hrms", "employees", "patient_exp"],
  },
  {
    id: "platform",
    title: "Platform & Infrastructure",
    description: "Dashboard analytics, Bed management, System Administration",
    modules: ["dashboard", "admin", "beds", "analytics"],
  },
]

const ACTIONS_LIST: { key: PermissionAction ;label: string ;icon: string }[] = [
  { key: "read", label: "Read", icon: "👁️" },
  { key: "write", label: "Write", icon: "✍️" },
  { key: "delete", label: "Delete", icon: "🗑️" },
  { key: "export", label: "Export", icon: "📥" },
]

export default function Administration() {
  const [activeTab, setActiveTab] =
    useState<"roles" | "users" | "doctors" | "audit" | "settings">("doctors")

  // Database States
  const [roles, setRoles] = useState<AppRole[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [doctors, setDoctors] = useState<MasterDoctor[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditLoadingMore, setAuditLoadingMore] = useState(false)

  // Roles Tab State
  const [selectedRoleId, setSelectedRoleId] = useState<string>("ROLE_DOCTOR")
  const [roleSearch, setRoleSearch] = useState("")
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false)
  const [showCloneRoleModal, setShowCloneRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRoleDescription, setNewRoleDescription] = useState("")
  const [cloneSourceRoleId, setCloneSourceRoleId] = useState("ROLE_DOCTOR")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  )
  const [roleNotice, setRoleNotice] = useState("")
  const [expandedGranularModule, setExpandedGranularModule] =
    useState<string | null>(null)

  // Users Tab State
  const [userSearch, setUserSearch] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState("all")
  const [userStatusFilter, setUserStatusFilter] = useState("all")
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)
  const [resetPassUser, setResetPassUser] = useState<AppUser | null>(null)
  const [newPassInput, setNewPassInput] = useState("password123")

  // Doctor Master Tab State
  const [doctorSearch, setDoctorSearch] = useState("")
  const [doctorSectionFilter, setDoctorSectionFilter] = useState<string>("all")
  const [doctorStatusFilter, setDoctorStatusFilter] = useState<string>("all")
  const [showDoctorModal, setShowDoctorModal] = useState(false)
  const [editingDoctor, setEditingDoctor] = useState<MasterDoctor | null>(null)
  const [doctorNotice, setDoctorNotice] = useState("")

  // Credentials Editing Modal State
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [credentialsForm, setCredentialsForm] = useState<{
    id: string
    name: string
    username: string
    password?: string
    roleId: string
    staffId: string
    status: "Active" | "Inactive"
    doctorId?: string
  } | null>(null)

  // Audit Tab State
  const [auditSearch, setAuditSearch] = useState("")
  const [auditActionFilter, setAuditActionFilter] = useState("all")
  const [auditUserFilter, setAuditUserFilter] = useState("all")
  const [auditDateFilter, setAuditDateFilter] = useState("all")
  const [auditStatusFilter, setAuditStatusFilter] = useState("all")
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(
    null,
  )

  // Settings State
  const [mfaEnforced, setMfaEnforced] = useState(true)
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30)
  const [minPasswordLength, setMinPasswordLength] = useState(10)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [settingsNotice, setSettingsNotice] = useState("")

  const refreshData = () => {
    setRoles(RoleDatabase.getRoles())
    setUsers(RoleDatabase.getUsers())
    setDoctors(getDoctorMaster())
    setAuditLogs(AuditDatabase.getLogs())
  }

  useEffect(() => {
    refreshData()

    const handleDoctorUpdate = () => refreshData()
    const handleUserUpdate = () => refreshData()

    window.addEventListener("doctor_master_updated", handleDoctorUpdate)
    window.addEventListener("rbac_users_updated", handleUserUpdate)
    return () => {
      window.removeEventListener("doctor_master_updated", handleDoctorUpdate)
      window.removeEventListener("rbac_users_updated", handleUserUpdate)
    }
  }, [])

  const AUDIT_PAGE_SIZE = 50

  function mapAuditRow(row: any): AuditLog {
    let description = row.action
    if (row.entity_key) description += ` ${row.module_name} #${row.entity_key}`
    else description += ` ${row.module_name}`
    if (row.payload) {
      try {
        const parsed = JSON.parse(row.payload)
        description += ` -- ${JSON.stringify(parsed)}`
      } catch {
        // payload wasn't JSON -- leave description as-is
      }
    }
    return {
      id: String(row.id),
      userId: row.actor_username || "",
      username: row.actor_username || "system",
      action: row.action,
      module: row.module_name,
      description,
      timestamp: row.created_at,
      status: "Success",
    }
  }

  useEffect(() => {
    setAuditLogs(AuditDatabase.getLogs())
  }, [activeTab])

  const loadMoreAuditLogs = async () => {
    setAuditLoadingMore(true)
    try {
      const res = await apiFetch<{ logs: any[] ;total: number }>(
        `/api/audit/logs?limit=${AUDIT_PAGE_SIZE}&offset=${auditLogs.length}`,
      )
      setAuditLogs((prev) => [...prev, ...(res.logs || []).map(mapAuditRow)])
      setAuditTotal(res.total || 0)
    } catch {
      // Leave the already-loaded page in place on failure.
    } finally {
      setAuditLoadingMore(false)
    }
  }

  const selectedRole =
    roles.find((r) => r.id === selectedRoleId) || roles[0] || null

  // Role Operations
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) return

    const roleId =
      "ROLE_" +
      newRoleName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
    const existing = roles.find((r) => r.id === roleId)
    if (existing) {
      alert("A role with a similar identifier already exists.")
      return
    }

    const newRole: AppRole = {
      id: roleId,
      name: newRoleName.trim(),
      allowedModules: ["dashboard", "patients:read"],
    }

    const updated = [...roles, newRole]
    RoleDatabase.saveRoles(updated)

    AuditDatabase.logEvent(
      "Role Created",
      "Role Management",
      `Created custom role '${newRoleName}' (${roleId})`,
      "Success",
    )

    setRoles(updated)
    setSelectedRoleId(newRole.id)
    setShowCreateRoleModal(false)
    setNewRoleName("")
    setNewRoleDescription("")
    setRoleNotice(`Role "${newRole.name}" created successfully.`)
    setTimeout(() => setRoleNotice(""), 3000)
  }

  const handleCloneRole = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) return

    const sourceRole = roles.find((r) => r.id === cloneSourceRoleId)
    const sourceModules = sourceRole
      ? [...sourceRole.allowedModules]
      : ["dashboard"]

    const roleId =
      "ROLE_" +
      newRoleName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
    const newRole: AppRole = {
      id: roleId,
      name: newRoleName.trim(),
      allowedModules: sourceModules,
    }

    const updated = [...roles, newRole]
    RoleDatabase.saveRoles(updated)

    AuditDatabase.logEvent(
      "Role Cloned",
      "Role Management",
      `Cloned role '${newRoleName}' from '${sourceRole?.name || cloneSourceRoleId}'`,
      "Success",
    )

    setRoles(updated)
    setSelectedRoleId(newRole.id)
    setShowCloneRoleModal(false)
    setNewRoleName("")
    setRoleNotice(
      `Cloned role "${newRole.name}" created with ${sourceModules.length} permission rules.`,
    )
    setTimeout(() => setRoleNotice(""), 3000)
  }

  const handleSaveRoleModules = () => {
    if (!selectedRole) return
    const updated = roles.map((r) =>
      r.id === selectedRole.id ? selectedRole : r,
    )
    RoleDatabase.saveRoles(updated)
    setSaveStatus("saving")

    AuditDatabase.logEvent(
      "Role Permissions Updated",
      "Role Management",
      `Updated module permission matrix for role '${selectedRole.name}' (${selectedRole.allowedModules.length} active rules)`,
      "Success",
    )

    setTimeout(() => {
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2500)
    }, 400)
  }

  const toggleModuleForSelectedRole = (moduleKey: string) => {
    if (!selectedRole) return
    const currentModules = selectedRole.allowedModules
    let newModules: string[]

    if (currentModules.includes(moduleKey)) {
      newModules = currentModules.filter(
        (m) => m !== moduleKey && !m.startsWith(`${moduleKey}:`),
      )
    } else {
      newModules = [...currentModules, moduleKey]
    }

    const updatedRole = { ...selectedRole, allowedModules: newModules }
    setRoles(roles.map((r) => (r.id === selectedRole.id ? updatedRole : r)))
  }

  const toggleActionForSelectedRole = (
    moduleKey: string,
    action: PermissionAction,
  ) => {
    if (!selectedRole) return
    const targetKey = `${moduleKey}:${action}`
    const currentModules = selectedRole.allowedModules
    let newModules: string[]

    if (currentModules.includes(targetKey)) {
      newModules = currentModules.filter((m) => m !== targetKey)
    } else {
      newModules = [...currentModules, targetKey]
    }

    const updatedRole = { ...selectedRole, allowedModules: newModules }
    setRoles(roles.map((r) => (r.id === selectedRole.id ? updatedRole : r)))
  }

  const selectAllCategoryModules = (categoryModules: string[]) => {
    if (!selectedRole) return
    const combined = Array.from(
      new Set([...selectedRole.allowedModules, ...categoryModules]),
    )
    setRoles(
      roles.map((r) =>
        r.id === selectedRole.id
          ? { ...selectedRole, allowedModules: combined }
          : r,
      ),
    )
  }

  const clearCategoryModules = (categoryModules: string[]) => {
    if (!selectedRole) return
    const updated = selectedRole.allowedModules.filter((m) => {
      const baseMod = m.includes(":") ? m.split(":")[0] : m
      return !categoryModules.includes(baseMod)
    })
    setRoles(
      roles.map((r) =>
        r.id === selectedRole.id
          ? { ...selectedRole, allowedModules: updated }
          : r,
      ),
    )
  }

  // User Accounts Operations
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    const isNew = !users.some((u) => u.id === editingUser.id)
    const updatedUsers = RoleDatabase.upsertUser(editingUser)
    setUsers(updatedUsers)

    AuditDatabase.logEvent(
      isNew ? "User Created" : "User Updated",
      "User Management",
      `${
        isNew ? "Created new" : "Updated"
      } user account for '${editingUser.name}' (@${editingUser.username}) assigned to role ${editingUser.roleId}`,
      "Success",
    )

    setShowUserModal(false)
    setEditingUser(null)
  }

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPassUser || !newPassInput) return

    const updatedUser: AppUser = {
      ...resetPassUser,
      password: newPassInput,
    }

    const updatedUsers = RoleDatabase.upsertUser(updatedUser)
    setUsers(updatedUsers)

    AuditDatabase.logEvent(
      "Password Reset",
      "User Management",
      `Reset password for user account '${resetPassUser.name}' (@${resetPassUser.username})`,
      "Success",
    )

    setResetPassUser(null)
    setNewPassInput("password123")
  }

  const handleDeleteUser = (user: AppUser) => {
    if (
      !confirm(
        `Are you sure you want to delete account @${user.username} (${user.name})?`,
      )
    )
      return
    const updated = RoleDatabase.deleteUser(user.id)
    setUsers(updated)
    AuditDatabase.logEvent(
      "User Deleted",
      "User Management",
      `Deleted user account @${user.username} (${user.name})`,
      "Success",
    )
  }

  // ── Doctor Master Operations ─────────────────────────────────────────────

  const handleOpenAddDoctorModal = () => {
    const nextNum = doctors.length + 1
    const nextId = `IMP-${String(nextNum).padStart(3, "0")}`
    setEditingDoctor({
      id: nextId,
      name: "",
      qualification: "M.B.B.S.",
      specialty: "General Medicine",
      section: "Main",
      verified: true,
      username: "",
      room: `Room ${200 + nextNum}`,
      staffId: nextId,
      consultationFee: 500,
    })
    setShowDoctorModal(true)
  }

  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDoctor || !editingDoctor.name.trim()) return

    const isNew = !doctors.some((d) => d.id === editingDoctor.id)
    let updatedDocs: MasterDoctor[]

    // Generate clean username if verified and missing
    let finalDoc = {
      ...editingDoctor,
      consultationFee:
        editingDoctor.consultationFee !== undefined &&
        editingDoctor.consultationFee !== null &&
        (editingDoctor.consultationFee as any) !== "" &&
        !isNaN(Number(editingDoctor.consultationFee))
          ? Math.max(0, Number(editingDoctor.consultationFee))
          : 500,
    }

    if (finalDoc.verified && !finalDoc.username) {
      const cleanName = finalDoc.name
        .toLowerCase()
        .replace(/dr\.?\s*/, "")
        .replace(/[^a-z0-9]/g, "")
      finalDoc.username = cleanName || `doc_${finalDoc.id.toLowerCase()}`
    }

    if (isNew) {
      updatedDocs = addDoctorMaster(finalDoc)
    } else {
      updatedDocs = updateDoctorMaster(finalDoc)
    }
    setDoctors(updatedDocs)

    // Sync credentials to RoleDatabase if verified
    if (finalDoc.verified && finalDoc.username) {
      RoleDatabase.upsertUser({
        id: `U_${finalDoc.id}`,
        username: finalDoc.username,
        password: DOCTOR_LOCAL_PASSWORD,
        roleId: "ROLE_DOCTOR",
        name: finalDoc.name,
        staffId: finalDoc.staffId,
        status: "Active",
      })
    }

    AuditDatabase.logEvent(
      isNew ? "Doctor Added" : "Doctor Fee/Profile Updated",
      "Doctor Management",
      `${isNew ? "Added new doctor" : "Updated doctor profile"} '${finalDoc.name}' (${finalDoc.specialty}) — Consultation Fee: ₹${finalDoc.consultationFee}`,
      "Success",
    )

    setShowDoctorModal(false)
    setEditingDoctor(null)
    setDoctorNotice(
      `Doctor "${finalDoc.name}" ${isNew ? "added" : "updated"} successfully with fee ₹${finalDoc.consultationFee}.`,
    )
    setTimeout(() => setDoctorNotice(""), 3500)
  }

  const handleDeleteDoctor = (doc: MasterDoctor) => {
    if (
      !confirm(
        `Are you sure you want to remove ${doc.name} (${doc.id}) from the Doctor Master roster?`,
      )
    )
      return
    const updated = deleteDoctorMaster(doc.id)
    setDoctors(updated)
    RoleDatabase.deleteUser(`U_${doc.id}`)

    AuditDatabase.logEvent(
      "Doctor Deleted",
      "Doctor Management",
      `Removed doctor '${doc.name}' (${doc.id}) from Doctor Master`,
      "Success",
    )
    setDoctorNotice(`Doctor "${doc.name}" removed from roster.`)
    setTimeout(() => setDoctorNotice(""), 3500)
  }

  const handleOpenCredentialsModal = (doc: MasterDoctor) => {
    const existingUser = users.find(
      (u) =>
        u.id === `U_${doc.id}` ||
        u.username.toLowerCase() === (doc.username || "").toLowerCase(),
    )
    setCredentialsForm({
      id: existingUser?.id || `U_${doc.id}`,
      name: doc.name,
      username:
        doc.username ||
        doc.name
          .toLowerCase()
          .replace(/dr\.?\s*/, "")
          .replace(/[^a-z0-9]/g, ""),
      password: existingUser?.password || DOCTOR_LOCAL_PASSWORD,
      roleId: existingUser?.roleId || "ROLE_DOCTOR",
      staffId: doc.staffId || doc.id,
      status: existingUser?.status as any || "Active",
      doctorId: doc.id,
    })
    setShowCredentialsModal(true)
  }

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    if (!credentialsForm) return

    // Save to RoleDatabase
    RoleDatabase.upsertUser({
      id: credentialsForm.id,
      username: credentialsForm.username.trim().toLowerCase(),
      password: credentialsForm.password || DOCTOR_LOCAL_PASSWORD,
      roleId: credentialsForm.roleId,
      name: credentialsForm.name,
      staffId: credentialsForm.staffId,
      status: credentialsForm.status,
    })

    // Also update DoctorMaster username & staffId if this was linked to a doctor
    if (credentialsForm.doctorId) {
      const doc = doctors.find((d) => d.id === credentialsForm.doctorId)
      if (doc) {
        updateDoctorMaster({
          ...doc,
          username: credentialsForm.username.trim().toLowerCase(),
          staffId: credentialsForm.staffId,
        })
        setDoctors(getDoctorMaster())
      }
    }

    AuditDatabase.logEvent(
      "Credentials Updated",
      "User & Credential Governance",
      `Updated login credentials and role assignment for '${credentialsForm.name}' (@${credentialsForm.username})`,
      "Success",
    )

    setShowCredentialsModal(false)
    setCredentialsForm(null)
    setDoctorNotice(
      `Credentials for "${credentialsForm.name}" updated successfully.`,
    )
    setTimeout(() => setDoctorNotice(""), 3500)
  }

  // Filters
  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
      r.id.toLowerCase().includes(roleSearch.toLowerCase()),
  )

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.staffId.toLowerCase().includes(userSearch.toLowerCase())
    const matchesRole = userRoleFilter === "all" || u.roleId === userRoleFilter
    const matchesStatus =
      userStatusFilter === "all" || (u.status || "Active") === userStatusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  const filteredDoctors = doctors.filter((d) => {
    const q = doctorSearch.toLowerCase()
    const matchesSearch =
      d.name.toLowerCase().includes(q) ||
      (d.specialty || "").toLowerCase().includes(q) ||
      d.qualification.toLowerCase().includes(q) ||
      d.staffId.toLowerCase().includes(q) ||
      d.room.toLowerCase().includes(q) ||
      (d.username || "").toLowerCase().includes(q)
    const matchesSection =
      doctorSectionFilter === "all" || d.section === doctorSectionFilter
    const matchesStatus =
      doctorStatusFilter === "all" ||
      (doctorStatusFilter === "active" && d.verified) ||
      (doctorStatusFilter === "unverified" && !d.verified)
    return matchesSearch && matchesSection && matchesStatus
  })

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase())
    const matchesAction =
      auditActionFilter === "all" || log.action === auditActionFilter
    const matchesUser =
      auditUserFilter === "all" || log.username === auditUserFilter

    let matchesDate = true
    if (auditDateFilter === "today") {
      const today = new Date().toISOString().split("T")[0]
      matchesDate = log.timestamp.startsWith(today)
    } else if (auditDateFilter === "7days") {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      matchesDate = new Date(log.timestamp).getTime() >= sevenDaysAgo
    }

    return matchesSearch && matchesAction && matchesUser && matchesDate
  })

  const uniqueAuditActions = Array.from(
    new Set(auditLogs.map((l) => l.action)),
  ).sort()
  const uniqueAuditUsers = Array.from(
    new Set(auditLogs.map((l) => l.username)),
  ).sort()

  return (
    <div className="flex flex-col h-full bg-[#F4F7FB] text-[#0F172A] font-sans overflow-y-auto">
      {/* Executive Module Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-8 py-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl">⚙️</span>
              <h1 className="text-xl font-extrabold tracking-tight text-[#0F172A]">
                System Administration & Governance
              </h1>
              <span className="bg-[#DCFCE7] text-[#15803D] text-[11px] font-bold px-2.5 py-0.5 border border-[#BBF7D0]">
                ENTERPRISE ACTIVE
              </span>
            </div>
            <p className="text-[13px] text-[#64748B] mt-1">
              Manage doctor roster, staff credentials, RBAC module permissions,
              audit logging & hospital security policies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleOpenAddDoctorModal()
                setActiveTab("doctors")
              }}
              className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white font-semibold text-[12.5px] px-3.5 py-1.5 transition-colors border border-blue-600 shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span> Add Doctor
            </button>
            <button
              onClick={() => {
                setEditingUser({
                  id: "U_" + Date.now(),
                  username: "",
                  password: "password123",
                  roleId: "ROLE_DOCTOR",
                  name: "",
                  staffId: "EMP-" + Math.floor(100 + Math.random() * 900),
                  status: "Active",
                })
                setShowUserModal(true)
                setActiveTab("users")
              }}
              className="bg-white hover:bg-gray-50 text-[#0F172A] font-semibold text-[12.5px] px-3.5 py-1.5 transition-colors border border-[#CBD5E1] cursor-pointer shadow-2xs"
            >
              + Add User
            </button>
          </div>
        </div>

        {/* Clean Underline Tabs */}
        <div className="flex items-center gap-8 text-[13px] font-semibold border-t border-[#F1F5F9] pt-1">
          {[
            {
              id: "doctors",
              label: "Doctor Master & Roster",
              count: doctors.length,
            },
            {
              id: "users",
              label: "User Accounts & Credentials",
              count: users.length,
            },
            {
              id: "roles",
              label: "Roles & Permissions Matrix",
              count: roles.length,
            },
            { id: "audit", label: "Audit Logs", count: auditLogs.length },
            { id: "settings", label: "System Settings" },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "border-[#1B4FD8] text-[#1B4FD8] font-bold"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 font-mono ${
                      isActive
                        ? "bg-blue-50 text-[#1B4FD8]"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main Tab Content Container ─────────────────────────────────── */}
      <div className="px-8 py-6 flex-1 flex flex-col min-h-0 bg-[#F4F7FB]">
        {/* ── TAB 1: DOCTOR MASTER & ROSTER ─────────────────────────────── */}
        {activeTab === "doctors" && (
          <div className="space-y-4">
            {doctorNotice && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px] p-3 rounded font-semibold flex items-center justify-between">
                <span>✓ {doctorNotice}</span>
                <button
                  onClick={() => setDoctorNotice("")}
                  className="text-emerald-600 hover:text-emerald-900"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="bg-white border border-[#DDE2EC] shadow-2xs">
              {/* Doctor Toolbar */}
              <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC] flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-[14px] font-bold text-gray-900">
                    Hospital Doctor Master Directory
                  </h3>
                  <p className="text-[11.5px] text-[#64748B]">
                    Active roster of physicians, consultants, rooms & login
                    credentials. Total {doctors.length} doctors onboarded.
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                  <input
                    value={doctorSearch}
                    onChange={(e) => setDoctorSearch(e.target.value)}
                    placeholder="Search doctor name, specialty, room, staff ID..."
                    className="w-full md:w-72 bg-white border border-[#DDE2EC] px-3 py-1.5 text-[12.5px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B4FD8]"
                  />

                  <select
                    value={doctorSectionFilter}
                    onChange={(e) => setDoctorSectionFilter(e.target.value)}
                    className="bg-white border border-[#DDE2EC] px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                  >
                    <option value="all">All Panels</option>
                    <option value="Main">Main Resident Panel</option>
                    <option value="Visiting">Visiting Consultants</option>
                  </select>

                  <select
                    value={doctorStatusFilter}
                    onChange={(e) => setDoctorStatusFilter(e.target.value)}
                    className="bg-white border border-[#DDE2EC] px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                  >
                    <option value="all">All Verification Status</option>
                    <option value="active">Active & Verified</option>
                    <option value="unverified">Needs Verification</option>
                  </select>

                  <button
                    onClick={handleOpenAddDoctorModal}
                    className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold px-3.5 py-1.5 border border-blue-600 transition-colors cursor-pointer"
                  >
                    + Add New Doctor
                  </button>
                </div>
              </div>

              {/* Doctor Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#DDE2EC] text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                      <th className="text-left px-4 py-3">Doctor & Staff ID</th>
                      <th className="text-left px-4 py-3">Qualification</th>
                      <th className="text-left px-4 py-3">
                        Specialty / Department
                      </th>
                      <th className="text-left px-4 py-3">Panel</th>
                      <th className="text-left px-4 py-3">Consultation Fee</th>
                      <th className="text-left px-4 py-3">Availability</th>
                      <th className="text-left px-4 py-3">Login Username</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                    {filteredDoctors.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-[#64748B]">
                          No doctors found matching the search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredDoctors.map((d) => {
                        const av = availabilityOf(d)
                        return (
                          <tr
                            key={d.id}
                            className="hover:bg-[#F8FAFC] transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p
                                className={`text-[13px] ${
                                  d.verified
                                    ? "font-bold text-gray-900"
                                    : "italic text-[#92400E]"
                                }`}
                              >
                                {d.name}
                              </p>
                              <p className="text-[11px] font-mono text-[#64748B]">
                                {d.id} • {d.staffId} • {d.room}
                              </p>
                            </td>

                            <td className="px-4 py-3 text-[#475569] font-medium">
                              {d.qualification}
                            </td>

                            <td className="px-4 py-3 text-[#0F172A] font-semibold">
                              {d.specialty || (
                                <span className="italic text-[#94A3B8]">
                                  {d.specialtyNote || "Unspecified"}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-[#475569]">
                              <span
                                className={`px-2 py-0.5 text-[11px] font-semibold ${
                                  d.section === "Main"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-purple-50 text-purple-700"
                                }`}
                              >
                                {d.section}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-mono font-bold text-[#15803D]">
                              ₹{d.consultationFee ?? 500}
                            </td>

                            <td className="px-4 py-3 text-[12px]">
                              <span
                                className={
                                  av.bookable
                                    ? av.onRequest
                                      ? "text-[#B45309] font-medium"
                                      : "text-[#15803D] font-medium"
                                    : "text-[#94A3B8]"
                                }
                              >
                                {av.label}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-mono text-[#1B4FD8]">
                              {d.username ? (
                                `@${d.username}`
                              ) : (
                                <span className="text-[#94A3B8]">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`text-[10.5px] font-bold uppercase px-2 py-0.5 ${
                                  d.verified
                                    ? "bg-[#DCFCE7] text-[#15803D] border border-emerald-200"
                                    : "bg-[#FEF3C7] text-[#92400E] border border-amber-200"
                                }`}
                              >
                                {d.verified ? "Active" : "Unverified"}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingDoctor(d)
                                    setShowDoctorModal(true)
                                  }}
                                  title="Edit Doctor Profile"
                                  className="bg-white hover:bg-gray-100 text-[#334155] border border-[#CBD5E1] px-2.5 py-1 text-[11.5px] font-semibold cursor-pointer"
                                >
                                  ✏️ Edit
                                </button>

                                <button
                                  onClick={() => handleOpenCredentialsModal(d)}
                                  title="Edit Login Credentials"
                                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white border border-blue-600 px-2.5 py-1 text-[11.5px] font-semibold cursor-pointer"
                                >
                                  🔑 Credentials
                                </button>

                                <button
                                  onClick={() => handleDeleteDoctor(d)}
                                  title="Delete Doctor"
                                  className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-2 py-1 text-[11.5px] cursor-pointer"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: USER ACCOUNTS & CREDENTIALS ─────────────────────────── */}
        {activeTab === "users" && (
          <div className="bg-white border border-[#DDE2EC] flex flex-col flex-1 overflow-hidden shadow-sm">
            {/* User Search & Filter Toolbar */}
            <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user name, username, or staff ID..."
                  className="w-full md:w-80 bg-white border border-[#DDE2EC] px-3.5 py-1.5 text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B4FD8]"
                />

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Active">Active Users</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingUser({
                      id: "U_" + Date.now(),
                      username: "",
                      password: "password123",
                      roleId: "ROLE_DOCTOR",
                      name: "",
                      staffId: "EMP-" + Math.floor(100 + Math.random() * 900),
                      status: "Active",
                    })
                    setShowUserModal(true)
                  }}
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-semibold px-3.5 py-1.5 border border-blue-600 transition-colors shadow-2xs cursor-pointer"
                >
                  + Add User Account
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] border-b border-[#DDE2EC] text-[11.5px] text-[#475569] uppercase font-mono tracking-wider">
                    <th className="px-6 py-3">Staff Member Name</th>
                    <th className="px-6 py-3">Username</th>
                    <th className="px-6 py-3">Staff ID</th>
                    <th className="px-6 py-3">Assigned Role</th>
                    <th className="px-6 py-3">Password</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[13px] text-[#334155]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-[#64748B]"
                      >
                        No user accounts match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const userRole = roles.find((r) => r.id === u.roleId)
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td className="px-6 py-3 font-bold text-[#0F172A]">
                            {u.name}
                          </td>

                          <td className="px-6 py-3 font-mono text-[#1B4FD8]">
                            @{u.username}
                          </td>

                          <td className="px-6 py-3 font-mono text-[12px] text-[#64748B]">
                            {u.staffId}
                          </td>

                          <td className="px-6 py-3">
                            <span className="text-[11.5px] bg-blue-50 text-[#1B4FD8] px-2.5 py-0.5 border border-blue-200 font-semibold">
                              {userRole?.name || u.roleId}
                            </span>
                          </td>

                          <td className="px-6 py-3 font-mono text-[#475569]">
                            {u.password || "••••••••"}
                          </td>

                          <td className="px-6 py-3">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 border ${
                                (u.status || "Active") === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {u.status || "Active"}
                            </span>
                          </td>

                          <td className="px-6 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingUser({ ...u })
                                  setShowUserModal(true)
                                }}
                                className="text-[12px] bg-white hover:bg-gray-100 text-[#334155] border border-[#CBD5E1] px-2.5 py-1 font-semibold cursor-pointer"
                              >
                                Edit User
                              </button>

                              <button
                                onClick={() => {
                                  setResetPassUser(u)
                                  setNewPassInput("password123")
                                }}
                                className="text-[12px] bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 px-2.5 py-1 font-semibold cursor-pointer"
                              >
                                Reset Pass
                              </button>

                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="text-[12px] bg-white hover:bg-red-50 text-red-600 border border-red-200 px-2 py-1 cursor-pointer"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: ROLES & GRANULAR PERMISSION MATRIX ──────────────────── */}
        {activeTab === "roles" && (
          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[600px]">
            {/* Left Column: Roles Sidebar */}
            <div className="w-full lg:w-80 bg-white border border-[#DDE2EC] flex flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-bold text-[#0F172A] tracking-wider uppercase">
                    System Roles
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowCloneRoleModal(true)}
                      title="Clone selected role"
                      className="text-[11px] bg-white hover:bg-gray-50 text-[#334155] px-2 py-1 border border-[#CBD5E1] font-semibold cursor-pointer"
                    >
                      Clone
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateRoleModal(true)
                        setNewRoleName("")
                      }}
                      title="Create new role"
                      className="text-[11px] bg-[#1B4FD8] hover:bg-[#1740B4] text-white px-2 py-1 font-semibold cursor-pointer"
                    >
                      + New
                    </button>
                  </div>
                </div>

                <input
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  placeholder="Search roles..."
                  className="w-full bg-white border border-[#DDE2EC] px-3 py-2 text-[12.5px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#F1F5F9]">
                {filteredRoles.map((role) => {
                  const isSelected = selectedRoleId === role.id
                  const assignedCount = users.filter(
                    (u) => u.roleId === role.id,
                  ).length
                  const isProtected =
                    role.id === "ROLE_SUPERADMIN" || role.id === "ROLE_ADMIN"

                  return (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`p-3 cursor-pointer transition-all flex items-start justify-between ${
                        isSelected
                          ? "bg-[#EFF6FF] border-l-4 border-[#1B4FD8] text-[#1B4FD8]"
                          : "hover:bg-gray-50 text-[#334155]"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[13px] font-bold truncate ${
                              isSelected ? "text-[#1B4FD8]" : "text-[#0F172A]"
                            }`}
                          >
                            {role.name}
                          </span>
                          {isProtected && (
                            <span className="text-[9.5px] bg-gray-100 text-gray-600 px-1.5 py-0.2 border border-gray-200 font-mono">
                              SYSTEM
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-[#64748B] flex items-center gap-3 font-mono">
                          <span>{role.id}</span>
                          <span>• {assignedCount} users</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Permission Matrix for Selected Role */}
            <div className="flex-1 bg-white border border-[#DDE2EC] flex flex-col overflow-hidden shadow-sm">
              {selectedRole ? (
                <>
                  <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-base font-bold text-[#0F172A]">
                          {selectedRole.name}
                        </h2>
                        <span className="text-[11px] font-mono text-[#64748B] bg-white px-2 py-0.5 border border-[#DDE2EC]">
                          {selectedRole.id}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#64748B] mt-0.5">
                        Configure module access rules and granular CRUD
                        permissions for this role.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {roleNotice && (
                        <span className="text-[12px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 border border-emerald-200">
                          ✓ {roleNotice}
                        </span>
                      )}

                      <button
                        onClick={handleSaveRoleModules}
                        disabled={saveStatus === "saving"}
                        className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white font-semibold text-[13px] px-4 py-1.5 transition-colors border border-blue-600 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {saveStatus === "saving"
                          ? "Saving..."
                          : saveStatus === "saved"
                            ? "✓ Saved!"
                            : "Save Permission Matrix"}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {MODULE_CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        className="border border-[#E2E8F0] p-4 bg-[#FAFCFF]"
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                          <div>
                            <h4 className="text-[14px] font-bold text-[#0F172A]">
                              {cat.title}
                            </h4>
                            <p className="text-[11.5px] text-[#64748B]">
                              {cat.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                selectAllCategoryModules(cat.modules)
                              }
                              className="text-[11px] text-[#1B4FD8] hover:underline font-semibold"
                            >
                              Select All
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => clearCategoryModules(cat.modules)}
                              className="text-[11px] text-[#64748B] hover:underline"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {cat.modules.map((modKey) => {
                            const isModuleEnabled =
                              selectedRole.allowedModules.includes(modKey) ||
                              selectedRole.allowedModules.includes("*")
                            const grantedActions = getGrantedActionsForModule(
                              selectedRole.allowedModules,
                              modKey,
                            )
                            const isExpanded = expandedGranularModule === modKey

                            return (
                              <div
                                key={modKey}
                                className={`p-3 border transition-colors ${
                                  isModuleEnabled
                                    ? "bg-white border-[#1B4FD8]/40 shadow-2xs"
                                    : "bg-gray-50/50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-[13px] text-[#0F172A]">
                                    <input
                                      type="checkbox"
                                      checked={isModuleEnabled}
                                      onChange={() =>
                                        toggleModuleForSelectedRole(modKey)
                                      }
                                      className="w-4 h-4 text-[#1B4FD8] rounded border-gray-300 focus:ring-[#1B4FD8]"
                                    />
                                    <span className="capitalize">
                                      {modKey.replace(/_/g, " ")}
                                    </span>
                                  </label>

                                  <button
                                    onClick={() =>
                                      setExpandedGranularModule(
                                        isExpanded ? null : modKey,
                                      )
                                    }
                                    className="text-[11px] text-[#64748B] hover:text-[#1B4FD8] px-1.5 py-0.5 border border-gray-200 bg-white"
                                  >
                                    {isExpanded ? "▲ Hide CRUD" : "▼ Granular"}
                                  </button>
                                </div>

                                {isExpanded && (
                                  <div className="mt-3 pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5 bg-gray-50 p-2 text-[11px]">
                                    {ACTIONS_LIST.map((act) => {
                                      const hasAction = grantedActions.includes(
                                        act.key,
                                      )
                                      return (
                                        <button
                                          key={act.key}
                                          onClick={() =>
                                            toggleActionForSelectedRole(
                                              modKey,
                                              act.key,
                                            )
                                          }
                                          className={`px-2 py-1 flex items-center gap-1 border font-semibold cursor-pointer ${
                                            hasAction
                                              ? "bg-blue-600 text-white border-blue-600"
                                              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                          }`}
                                        >
                                          <span>{act.icon}</span>
                                          <span>{act.label}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  Select a role from the sidebar to view permissions.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: AUDIT LOGS ─────────────────────────────────────────── */}
        {activeTab === "audit" && (
          <div className="bg-white border border-[#DDE2EC] flex flex-col flex-1 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[#DDE2EC] bg-[#F8FAFC] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                <input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search log description, user, or action..."
                  className="w-full md:w-80 bg-white border border-[#DDE2EC] px-3.5 py-1.5 text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#1B4FD8]"
                />

                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Event Actions</option>
                  {uniqueAuditActions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>

                <select
                  value={auditUserFilter}
                  onChange={(e) => setAuditUserFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Users</option>
                  {uniqueAuditUsers.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>

                <select
                  value={auditDateFilter}
                  onChange={(e) => setAuditDateFilter(e.target.value)}
                  className="bg-white border border-[#DDE2EC] px-3 py-1.5 text-[12.5px] text-[#334155] font-semibold focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert("Audit log report exported to CSV.")}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[12.5px] font-semibold px-3 py-1.5 border border-[#CBD5E1] transition-colors shadow-sm cursor-pointer"
                >
                  Export Audit CSV
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F1F5F9] border-b border-[#DDE2EC] text-[11.5px] text-[#475569] uppercase font-mono tracking-wider whitespace-nowrap">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Action Event</th>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">Login Time</th>
                    <th className="px-4 py-3">Logout Time</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[13px] text-[#334155]">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-[#64748B]">
                        No audit log records match the selected search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const isLoginSession =
                        log.action.toLowerCase().includes("login") || log.module === "Authentication"

                      return (
                        <tr 
                          key={log.id} 
                          onClick={() => setSelectedAuditLog(log)}
                          className="hover:bg-[#F8FAFC] cursor-pointer transition-colors text-[12.5px]"
                        >
                          <td className="px-4 py-3 font-mono text-[11.5px] text-[#64748B] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>

                          <td className="px-4 py-3 font-bold text-[#0F172A] whitespace-nowrap">
                            {log.username}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[11.5px] bg-blue-50 text-[#1B4FD8] px-2 py-0.5 border border-blue-200 font-semibold">
                              {log.action}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-[#64748B] font-medium whitespace-nowrap">
                            {log.module}
                          </td>

                          <td className="px-4 py-3 text-[#334155] max-w-xs truncate">
                            {log.description}
                          </td>

                          <td className="px-4 py-3 font-medium text-[#0F172A] whitespace-nowrap">
                            {isLoginSession ? (log.device || detectDevice()) : "—"}
                          </td>

                          <td className="px-4 py-3 font-mono text-[12px] text-[#334155] whitespace-nowrap">
                            {isLoginSession ? (log.loginTime || "—") : "—"}
                          </td>

                          <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap">
                            {isLoginSession ? (
                              log.logoutTime === "Active" ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200 font-bold rounded">
                                  Active
                                </span>
                              ) : log.logoutTime === "Session Expired" ? (
                                <span className="text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-200 font-semibold rounded">
                                  Session Expired
                                </span>
                              ) : (
                                log.logoutTime || "—"
                              )
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8] whitespace-nowrap">
                            {isLoginSession ? (log.duration || "—") : "—"}
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 border ${
                                log.status === "Success"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {auditLogs.length < auditTotal && (
              <div className="p-3 border-t border-[#DDE2EC] flex items-center justify-center">
                <button
                  onClick={loadMoreAuditLogs}
                  disabled={auditLoadingMore}
                  className="text-[12.5px] font-semibold text-[#1B4FD8] hover:text-[#1E40AF] disabled:opacity-50 cursor-pointer"
                >
                  {auditLoadingMore
                    ? "Loading..."
                    : `Load more (${auditLogs.length} of ${auditTotal})`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: SYSTEM & GOVERNANCE SETTINGS ────────────────────────── */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white border border-[#DDE2EC] p-6 space-y-6 shadow-sm">
              <div className="border-b border-[#E2E8F0] pb-4">
                <h3 className="text-base font-bold text-[#0F172A]">
                  Hospital System Security Policies
                </h3>
                <p className="text-[12.5px] text-[#64748B]">
                  Configure global authentication requirements, session expiry,
                  and access limits.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <div className="font-bold text-[#0F172A] text-[13.5px]">
                      Enforce Multi-Factor Auth (MFA)
                    </div>
                    <div className="text-[11.5px] text-[#64748B]">
                      Require OTP code on unknown device logins
                    </div>
                  </div>
                  <button
                    onClick={() => setMfaEnforced(!mfaEnforced)}
                    className={`w-12 h-6 flex items-center p-1 border transition-colors cursor-pointer ${
                      mfaEnforced
                        ? "bg-[#1B4FD8] border-blue-600 justify-end"
                        : "bg-gray-200 border-gray-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 bg-white shadow"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E2E8F0]">
                  <div>
                    <div className="font-bold text-[#0F172A] text-[13.5px]">
                      Maintenance Mode
                    </div>
                    <div className="text-[11.5px] text-[#64748B]">
                      Restrict logins to Super Admins only
                    </div>
                  </div>
                  <button
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`w-12 h-6 flex items-center p-1 border transition-colors cursor-pointer ${
                      maintenanceMode
                        ? "bg-amber-600 border-amber-500 justify-end"
                        : "bg-gray-200 border-gray-300 justify-start"
                    }`}
                  >
                    <div className="w-4 h-4 bg-white shadow"></div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Session Idle Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    value={sessionTimeoutMinutes}
                    onChange={(e) =>
                      setSessionTimeoutMinutes(Number(e.target.value))
                    }
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    value={minPasswordLength}
                    onChange={(e) =>
                      setMinPasswordLength(Number(e.target.value))
                    }
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[#E2E8F0]">
                <button
                  onClick={() => {
                    setSettingsNotice(
                      "System governance security policy saved successfully.",
                    )
                    setTimeout(() => setSettingsNotice(""), 3000)
                  }}
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white font-semibold text-[13px] px-5 py-2 transition-colors border border-blue-600 shadow-sm cursor-pointer"
                >
                  Save Governance Policies
                </button>
              </div>

              {settingsNotice && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px] p-3 font-semibold">
                  ✓ {settingsNotice}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────── */}

      {/* 1. Add / Edit Doctor Modal */}
      {showDoctorModal && editingDoctor && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">
                {doctors.some((d) => d.id === editingDoctor.id)
                  ? "Edit Doctor Profile"
                  : "Add New Doctor to Roster"}
              </h3>
              <button
                onClick={() => setShowDoctorModal(false)}
                className="text-[#64748B] hover:text-black"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveDoctor} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  Doctor Full Name
                </label>
                <input
                  required
                  autoFocus
                  value={editingDoctor.name}
                  onChange={(e) =>
                    setEditingDoctor({ ...editingDoctor, name: e.target.value })
                  }
                  placeholder="e.g. Dr. P. R. K. Varma"
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Qualifications & Degrees
                  </label>
                  <input
                    required
                    value={editingDoctor.qualification}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        qualification: e.target.value,
                      })
                    }
                    placeholder="e.g. M.D., D.M. (Cardiology)"
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Specialty / Department
                  </label>
                  <input
                    required
                    value={editingDoctor.specialty || ""}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        specialty: e.target.value,
                      })
                    }
                    placeholder="e.g. Cardiology"
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Panel Category
                  </label>
                  <select
                    value={editingDoctor.section}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        section: e.target.value as DoctorSection,
                      })
                    }
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-semibold cursor-pointer"
                  >
                    <option value="Main">Main Resident Panel</option>
                    <option value="Visiting">Visiting Consultant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Consultation Room
                  </label>
                  <input
                    required
                    value={editingDoctor.room}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        room: e.target.value,
                      })
                    }
                    placeholder="e.g. Room 201"
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={
                      editingDoctor.consultationFee === undefined ||
                      editingDoctor.consultationFee === null ||
                      (editingDoctor.consultationFee as any) === "" ||
                      isNaN(editingDoctor.consultationFee as any)
                        ? ""
                        : editingDoctor.consultationFee
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingDoctor({
                        ...editingDoctor,
                        consultationFee: val === "" ? ("" as any) : Number(val),
                      });
                    }}
                    placeholder="e.g. 500"
                    className="w-full bg-white border border-[#DDE2EC] px-3 py-2 text-[13px] text-[#0F172A] font-semibold focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Staff Employee ID
                  </label>
                  <input
                    required
                    value={editingDoctor.staffId}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        staffId: e.target.value,
                      })
                    }
                    placeholder="e.g. IMP-201"
                    className="w-full bg-white border border-[#DDE2EC] px-3 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Login Username ID
                  </label>
                  <input
                    value={editingDoctor.username || ""}
                    onChange={(e) =>
                      setEditingDoctor({
                        ...editingDoctor,
                        username: e.target.value.toLowerCase().trim(),
                      })
                    }
                    placeholder="e.g. prkvarma"
                    className="w-full bg-white border border-[#DDE2EC] px-3 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="doctorVerifiedCheck"
                  checked={editingDoctor.verified}
                  onChange={(e) =>
                    setEditingDoctor({
                      ...editingDoctor,
                      verified: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#1B4FD8] rounded cursor-pointer"
                />
                <label
                  htmlFor="doctorVerifiedCheck"
                  className="text-[12.5px] font-semibold text-[#0F172A] cursor-pointer"
                >
                  Verified Doctor (Enable for appointment booking & portal
                  login)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 border border-[#CBD5E1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-semibold px-5 py-2 border border-blue-600 shadow-sm cursor-pointer"
                >
                  Save Doctor Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Credentials Modal */}
      {showCredentialsModal && credentialsForm && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">
                Edit Login Credentials
              </h3>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="text-[#64748B] hover:text-black"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCredentials} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 text-[12.5px] text-[#1B4FD8] font-semibold">
                Editing credentials for <strong>{credentialsForm.name}</strong>{" "}
                ({credentialsForm.staffId})
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  Username (Login ID)
                </label>
                <input
                  required
                  value={credentialsForm.username}
                  onChange={(e) =>
                    setCredentialsForm({
                      ...credentialsForm,
                      username: e.target.value.toLowerCase().trim(),
                    })
                  }
                  placeholder="e.g. prkvarma"
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  Account Password
                </label>
                <input
                  required
                  type="text"
                  value={credentialsForm.password || "password123"}
                  onChange={(e) =>
                    setCredentialsForm({
                      ...credentialsForm,
                      password: e.target.value,
                    })
                  }
                  placeholder="password123"
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Assigned System Role
                  </label>
                  <select
                    value={credentialsForm.roleId}
                    onChange={(e) =>
                      setCredentialsForm({
                        ...credentialsForm,
                        roleId: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-semibold cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={credentialsForm.status}
                    onChange={(e) =>
                      setCredentialsForm({
                        ...credentialsForm,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-semibold cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  Staff ID
                </label>
                <input
                  required
                  value={credentialsForm.staffId}
                  onChange={(e) =>
                    setCredentialsForm({
                      ...credentialsForm,
                      staffId: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCredentialsModal(false)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 border border-[#CBD5E1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-semibold px-5 py-2 border border-blue-600 shadow-sm cursor-pointer"
                >
                  Update Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create Role Modal */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">
                Create New Custom Role
              </h3>
              <button
                onClick={() => setShowCreateRoleModal(false)}
                className="text-[#64748B] hover:text-black"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  Role Name
                </label>
                <input
                  required
                  autoFocus
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Senior Critical Care Registrar"
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Responsibilities and access scope..."
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[12.5px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 border border-[#CBD5E1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-semibold px-5 py-2 border border-blue-600 shadow-sm cursor-pointer"
                >
                  Create & Configure Modules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Clone Role Modal */}
      {showCloneRoleModal && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">
                Clone Existing Role
              </h3>
              <button
                onClick={() => setShowCloneRoleModal(false)}
                className="text-[#64748B] hover:text-black"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCloneRole} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  Source Role to Copy Permissions From
                </label>
                <select
                  value={cloneSourceRoleId}
                  onChange={(e) => setCloneSourceRoleId(e.target.value)}
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.allowedModules.length} Rules)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  New Role Name
                </label>
                <input
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. ICU Charge Nurse"
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowCloneRoleModal(false)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 border border-[#CBD5E1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-semibold px-5 py-2 border border-blue-600 shadow-sm cursor-pointer"
                >
                  Clone Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Create / Edit User Account Modal */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">
                {users.some((u) => u.id === editingUser.id)
                  ? "Edit Staff User Account"
                  : "Create New Staff Account"}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-[#64748B] hover:text-black"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  Full Name
                </label>
                <input
                  required
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  placeholder="e.g. Dr. Robert Miller"
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Username ID
                  </label>
                  <input
                    required
                    value={editingUser.username}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        username: e.target.value.toLowerCase().trim(),
                      })
                    }
                    placeholder="e.g. rmiller"
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Staff Employee ID
                  </label>
                  <input
                    required
                    value={editingUser.staffId}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        staffId: e.target.value,
                      })
                    }
                    placeholder="e.g. DOC-901"
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Assigned System Role
                  </label>
                  <select
                    value={editingUser.roleId}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, roleId: e.target.value })
                    }
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-semibold cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={editingUser.status || "Active"}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-semibold cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  Initial Account Password
                </label>
                <input
                  required
                  type="text"
                  value={editingUser.password || "password123"}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, password: e.target.value })
                  }
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 border border-[#CBD5E1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[13px] font-semibold px-5 py-2 border border-blue-600 shadow-sm cursor-pointer"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Reset Password Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">
                Reset Account Password
              </h3>
              <button
                onClick={() => setResetPassUser(null)}
                className="text-[#64748B] hover:text-black"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="text-[12.5px] text-[#334155]">
                Resetting password for staff member{" "}
                <strong className="text-[#0F172A]">{resetPassUser.name}</strong>{" "}
                (@{resetPassUser.username}).
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#334155] mb-1.5">
                  New Password
                </label>
                <input
                  required
                  type="text"
                  value={newPassInput}
                  onChange={(e) => setNewPassInput(e.target.value)}
                  className="w-full bg-white border border-[#DDE2EC] px-3.5 py-2 text-[13px] text-[#0F172A] focus:outline-none focus:border-[#1B4FD8] font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 border border-[#CBD5E1] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-semibold px-4 py-2 border border-amber-600 shadow-sm cursor-pointer"
                >
                  Confirm Password Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Audit Detail Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2EC] shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">
                Security Event Log Inspector
              </h3>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="text-[#64748B] hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 border border-[#E2E8F0]">
                <div>
                  <div className="text-[11px] text-[#64748B] uppercase font-mono">
                    Event ID
                  </div>
                  <div className="font-mono text-[#0F172A] text-[12px]">
                    {selectedAuditLog.id}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] uppercase font-mono">
                    Timestamp
                  </div>
                  <div className="font-mono text-[#0F172A] text-[12px]">
                    {new Date(selectedAuditLog.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-[#64748B] uppercase font-mono">
                    Executing User
                  </div>
                  <div className="font-bold text-[#0F172A]">
                    {selectedAuditLog.username}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[#64748B] uppercase font-mono">
                    Event Action
                  </div>
                  <div className="font-semibold text-[#1B4FD8]">
                    {selectedAuditLog.action}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#64748B] uppercase font-mono mb-1">
                  Target Module
                </div>
                <div className="text-[#0F172A] font-mono">
                  {selectedAuditLog.module}
                </div>
              </div>

              {(selectedAuditLog.device || selectedAuditLog.action.toLowerCase().includes("login") || selectedAuditLog.module === "Authentication") && (
                <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-3.5 border border-[#E2E8F0]">
                  <div>
                    <div className="text-[11px] text-[#64748B] uppercase font-mono mb-0.5">Device</div>
                    <div className="font-bold text-[#0F172A]">{selectedAuditLog.device || detectDevice()}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748B] uppercase font-mono mb-0.5">Session Duration</div>
                    <div className="font-mono text-[#1B4FD8] font-bold text-[12px]">{selectedAuditLog.duration || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748B] uppercase font-mono mb-0.5">Login Time</div>
                    <div className="font-mono text-[#0F172A] text-[12px]">{selectedAuditLog.loginTime || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748B] uppercase font-mono mb-0.5">Logout Time</div>
                    <div className="font-mono text-[#0F172A] text-[12px]">
                      {selectedAuditLog.logoutTime === "Active" ? (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 font-bold rounded">
                          Active
                        </span>
                      ) : selectedAuditLog.logoutTime === "Session Expired" ? (
                        <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 border border-amber-200 font-semibold rounded">
                          Session Expired
                        </span>
                      ) : (
                        selectedAuditLog.logoutTime || "—"
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-[11px] text-[#64748B] uppercase font-mono mb-1">
                  Event Description
                </div>
                <div className="bg-[#F8FAFC] p-3 border border-[#E2E8F0] text-[#334155] font-mono text-[12px]">
                  {selectedAuditLog.description}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
                <button
                  onClick={() => setSelectedAuditLog(null)}
                  className="bg-white hover:bg-gray-50 text-[#334155] text-[13px] font-semibold px-4 py-2 border border-[#CBD5E1] cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
