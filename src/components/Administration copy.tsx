import React, { useState, useEffect } from "react"
import {
  RoleDatabase,
  AppRole,
  AppUser,
  ALL_SYSTEM_MODULES,
} from "../services/roleDb"
import { AuditDatabase, AuditLog } from "../services/auditDb"

// Reusable Icons for this exact UI
const Icons = {
  AdminBg: () => (
    <div className="w-12 h-12 rounded-none-none bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </div>
  ),
  UsersBlue: () => (
    <div className="w-10 h-10 rounded-none-none bg-blue-100 flex items-center justify-center text-blue-600">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path>
      </svg>
    </div>
  ),
  ModuleGreen: () => (
    <div className="w-10 h-10 rounded-none-none bg-green-100 flex items-center justify-center text-green-600">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    </div>
  ),
  UserPurple: () => (
    <div className="w-10 h-10 rounded-none-none bg-purple-100 flex items-center justify-center text-purple-600">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
      </svg>
    </div>
  ),
  ShieldOrange: () => (
    <div className="w-10 h-10 rounded-none-none bg-orange-100 flex items-center justify-center text-orange-500">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"></path>
      </svg>
    </div>
  ),
  Search: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  EmptyRoles: () => (
    <div className="w-20 h-20 rounded-none-none bg-blue-50 flex items-center justify-center text-blue-300 mb-4 mx-auto">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path>
      </svg>
    </div>
  ),
  EmptyModule: () => (
    <div className="w-20 h-20 rounded-none-none bg-blue-50 flex items-center justify-center text-blue-300 mb-4 mx-auto">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    </div>
  ),
  EmptyUser: () => (
    <div className="w-20 h-20 rounded-none-none bg-blue-50 flex items-center justify-center text-blue-300 mb-4 mx-auto">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </div>
  ),
  Plus: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
}

export default function Administration() {
  const [activeTab, setActiveTab] = useState<"roles" | "users" | "audit">(
    "roles",
  )

  const [roles, setRoles] = useState<AppRole[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditSearch, setAuditSearch] = useState("")

  // User Filters
  const [userSearch, setUserSearch] = useState("")
  const [userRoleFilter, setUserRoleFilter] = useState("all")
  const [userStatusFilter, setUserStatusFilter] = useState("all")

  // Audit Filters
  const [auditActionFilter, setAuditActionFilter] = useState("all")
  const [auditUserFilter, setAuditUserFilter] = useState("all")
  const [auditDateFilter, setAuditDateFilter] = useState("all")
  const [auditStatusFilter, setAuditStatusFilter] = useState("all")

  const uniqueAuditActions = Array.from(new Set(auditLogs.map((l) => l.action)))
  const uniqueAuditUsers = Array.from(new Set(auditLogs.map((l) => l.username)))

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(userSearch.toLowerCase())
    const matchesRole = userRoleFilter === "all" || u.roleId === userRoleFilter
    const matchesStatus =
      userStatusFilter === "all" || userStatusFilter === "Active"
    return matchesSearch && matchesRole && matchesStatus
  })

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.description.toLowerCase().includes(auditSearch.toLowerCase())
    const matchesAction =
      auditActionFilter === "all" || log.action === auditActionFilter
    const matchesUser =
      auditUserFilter === "all" || log.username === auditUserFilter
    const matchesStatus =
      auditStatusFilter === "all" || log.status === auditStatusFilter

    let matchesDate = true
    if (auditDateFilter === "today") {
      matchesDate =
        new Date(log.timestamp).toDateString() === new Date().toDateString()
    } else if (auditDateFilter === "7days") {
      matchesDate =
        new Date(log.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    } else if (auditDateFilter === "30days") {
      matchesDate =
        new Date(log.timestamp) >
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }

    return (
      matchesSearch &&
      matchesAction &&
      matchesUser &&
      matchesStatus &&
      matchesDate
    )
  })

  // Split View State
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null)
  const [roleSearch, setRoleSearch] = useState("")

  // Modals & Feedback
  const [showRoleNameModal, setShowRoleNameModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  )

  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null)

  useEffect(() => {
    const loadedRoles = RoleDatabase.getRoles()
    setRoles(loadedRoles)
    setUsers(RoleDatabase.getUsers())
  }, [])

  useEffect(() => {
    if (activeTab === "audit") {
      setAuditLogs(AuditDatabase.getLogs())
    }
  }, [activeTab])

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) return
    const newRole: AppRole = {
      id: "ROLE_" + Date.now(),
      name: newRoleName,
      allowedModules: [],
    }
    const updated = [...roles, newRole]
    RoleDatabase.saveRoles(updated)

    AuditDatabase.logEvent(
      "Role Created",
      "Role Management",
      `Created role '${newRoleName}'`,
      "Success",
    )

    setRoles(updated)
    setSelectedRole(newRole)
    setShowRoleNameModal(false)
    setNewRoleName("")
  }

  const handleSaveRoleModules = () => {
    if (!selectedRole || selectedRole.id === "ROLE_ADMIN") return
    const updated = roles.map((r) =>
      r.id === selectedRole.id ? selectedRole : r,
    )
    RoleDatabase.saveRoles(updated)

    AuditDatabase.logEvent(
      "Permission Changed",
      "RBAC",
      `Updated module permissions for role '${selectedRole.name}'`,
      "Success",
    )

    setRoles(updated)

    setSaveStatus("saved")
    setTimeout(() => setSaveStatus("idle"), 2000)
  }

  const handleDeleteRole = () => {
    if (!selectedRole || selectedRole.id === "ROLE_ADMIN") return
    if (
      window.confirm(
        `Are you sure you want to delete the role "${selectedRole.name}"?`,
      )
    ) {
      const updated = roles.filter((r) => r.id !== selectedRole.id)
      RoleDatabase.saveRoles(updated)

      AuditDatabase.logEvent(
        "Role Deleted",
        "Role Management",
        `Deleted role '${selectedRole.name}'`,
        "Success",
      )

      setRoles(updated)
      setSelectedRole(null)
    }
  }

  const toggleModule = (mod: string) => {
    if (!selectedRole || selectedRole.id === "ROLE_ADMIN") return
    const allowed = selectedRole.allowedModules.includes(mod)
      ? selectedRole.allowedModules.filter((m) => m !== mod)
      : [...selectedRole.allowedModules, mod]
    setSelectedRole({ ...selectedRole, allowedModules: allowed })
  }

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    let updatedUsers = [...users]
    const isNew = !users.find((u) => u.id === editingUser.id)

    if (!isNew) {
      updatedUsers = updatedUsers.map((u) =>
        u.id === editingUser.id ? editingUser : u,
      )
      AuditDatabase.logEvent(
        "User Updated",
        "User Management",
        `Updated user account for ${editingUser.username}`,
        "Success",
      )
    } else {
      updatedUsers.push(editingUser)
      AuditDatabase.logEvent(
        "User Created",
        "User Management",
        `Created new user account for ${editingUser.username}`,
        "Success",
      )
    }
    RoleDatabase.saveUsers(updatedUsers)
    setUsers(updatedUsers)
    setShowUserModal(false)
  }

  const handleDeleteUser = (userId: string, username: string) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      const updatedUsers = users.filter((u) => u.id !== userId)
      RoleDatabase.saveUsers(updatedUsers)
      setUsers(updatedUsers)
      AuditDatabase.logEvent(
        "User Deleted",
        "User Management",
        `Deleted user account for ${username}`,
        "Success",
      )
    }
  }

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(roleSearch.toLowerCase()),
  )

  // Stats
  const totalRoles = roles.length
  const totalModules = ALL_SYSTEM_MODULES.length
  const totalUsersCount = users.length
  const totalPermissions = roles.reduce(
    (acc, r) => acc + r.allowedModules.length,
    0,
  )

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#F4F7FB] font-sans">
      {/* Header Area */}
      <div className="px-8 pt-8 pb-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Icons.AdminBg />
          <div>
            <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-1">
              Administration
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-none mb-1.5">
              Role Based Access Management
            </h1>
            <p className="text-[13px] text-gray-500 font-medium">
              Manage roles, assign module access and control user accounts{" "}
              <span className="text-blue-500">for your hospital system.</span>
            </p>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="px-8 grid grid-cols-4 gap-6 mb-8 mt-2">
        <div className="bg-white rounded-none-none p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <Icons.UsersBlue />
          <div>
            <div className="text-[12px] font-bold text-gray-900">
              Total Roles
            </div>
            <div className="text-lg font-black text-gray-900 leading-none mt-1">
              {totalRoles || "--"}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-none-none p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <Icons.ModuleGreen />
          <div>
            <div className="text-[12px] font-bold text-gray-900">
              Hospital Modules
            </div>
            <div className="text-lg font-black text-gray-900 leading-none mt-1">
              {totalModules || "--"}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-none-none p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <Icons.UserPurple />
          <div>
            <div className="text-[12px] font-bold text-gray-900">
              Total Users
            </div>
            <div className="text-lg font-black text-gray-900 leading-none mt-1">
              {totalUsersCount || "--"}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-none-none p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <Icons.ShieldOrange />
          <div>
            <div className="text-[12px] font-bold text-gray-900">
              Permission Rules
            </div>
            <div className="text-lg font-black text-gray-900 leading-none mt-1">
              {totalPermissions || "--"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 border-b border-gray-200 flex gap-8 mb-6 mt-4">
        <button
          onClick={() => setActiveTab("roles")}
          className={`pb-3 text-[14px] font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "roles"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-[14px] font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "users"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          User Accounts
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 text-[14px] font-bold flex items-center gap-2 transition-all border-b-2 ${
            activeTab === "audit"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          Audit Logs
        </button>
      </div>

      {/* Content */}
      <div className="px-8 pb-10 flex-1 flex flex-col">
        {/* === ROLES TAB === */}
        {activeTab === "roles" && (
          <div className="flex gap-6 flex-1 min-h-[500px]">
            {/* Left Panel: Roles List */}
            <div className="w-[380px] bg-white rounded-none-none shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-[16px] font-extrabold text-gray-900 leading-tight">
                      Roles
                    </h2>
                    <p className="text-[12px] text-gray-400 font-medium">
                      Create and manage roles for your hospital staff.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRoleNameModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-none-none text-[12px] font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Icons.Plus /> Create Role
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Icons.Search />
                  </div>
                  <input
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Search roles..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-none-none pl-9 pr-4 py-2 text-[13px] focus:outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium text-gray-700"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {filteredRoles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 mt-4">
                    <Icons.EmptyRoles />
                    <h3 className="text-[16px] font-extrabold text-gray-900 mb-1">
                      No roles created yet
                    </h3>
                    <p className="text-[13px] text-gray-500 mb-6 font-medium">
                      Create a role to define module access permissions.
                    </p>
                    <button
                      onClick={() => setShowRoleNameModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-none-none text-[13px] font-bold flex items-center gap-2 shadow-md transition-colors"
                    >
                      <Icons.Plus /> Create Role
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredRoles.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRole({ ...r })}
                        className={`w-full text-left px-4 py-3 rounded-none-none border flex items-center justify-between transition-colors ${
                          selectedRole?.id === r.id
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-200"
                        }`}
                      >
                        <div>
                          <div
                            className={`text-[14px] font-bold ${
                              selectedRole?.id === r.id
                                ? "text-blue-700"
                                : "text-gray-900"
                            }`}
                          >
                            {r.name}
                          </div>
                          <div className="text-[12px] text-gray-400 font-medium">
                            {r.allowedModules.length} Modules
                          </div>
                        </div>
                        {selectedRole?.id === r.id && (
                          <div className="w-2 h-2 rounded-none-none bg-blue-600"></div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Module Permissions */}
            <div className="flex-1 bg-white rounded-none-none shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              {selectedRole ? (
                <>
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-none-none bg-orange-50 flex items-center justify-center text-orange-500">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"></path>
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-[16px] font-extrabold text-gray-900 leading-tight flex items-center gap-2">
                          Module Permissions: {selectedRole.name}
                          {selectedRole.id === "ROLE_ADMIN" && (
                            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-none text-[10px] uppercase tracking-wider font-bold border border-gray-200">
                              System Managed
                            </span>
                          )}
                        </h2>
                        <p className="text-[13px] text-gray-500 font-medium">
                          Select the modules this role is allowed to access.
                        </p>
                      </div>
                    </div>
                    {selectedRole.id !== "ROLE_ADMIN" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDeleteRole}
                          className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-none-none text-[13px] font-bold transition-colors shadow-sm"
                        >
                          Delete Role
                        </button>
                        <button
                          onClick={handleSaveRoleModules}
                          className={`${
                            saveStatus === "saved"
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-blue-600 hover:bg-blue-700"
                          } text-white px-5 py-2 rounded-none-none text-[13px] font-bold transition-colors shadow-sm flex items-center gap-1.5`}
                        >
                          {saveStatus === "saved" ? (
                            <>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>{" "}
                              Saved!
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      {ALL_SYSTEM_MODULES.map((mod) => {
                        const isSelected =
                          selectedRole.allowedModules.includes(mod)
                        return (
                          <label
                            key={mod}
                            className={`flex items-center p-3 rounded-none-none border-2 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/50"
                                : "border-gray-100 bg-white hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={selectedRole.id === "ROLE_ADMIN"}
                              onChange={() => toggleModule(mod)}
                              className="w-4 h-4 rounded-none border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span
                              className={`ml-3 text-[13.5px] font-bold capitalize ${
                                isSelected ? "text-blue-900" : "text-gray-700"
                              }`}
                            >
                              {mod.replace(/_/g, " ")}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 mt-10">
                  <Icons.EmptyModule />
                  <h3 className="text-[18px] font-extrabold text-gray-900 mb-1">
                    No role selected
                  </h3>
                  <p className="text-[14px] text-gray-500 font-medium">
                    Please select a role from the left panel to view and manage
                    module permissions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === USERS TAB === */}
        {activeTab === "users" && (
          <div className="bg-white rounded-none-none shadow-sm border border-gray-100 flex flex-col flex-1">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-none-none bg-blue-50 flex items-center justify-center text-blue-600">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"></path>
                  </svg>
                </div>
                <div>
                  <h2 className="text-[16px] font-extrabold text-gray-900 leading-tight">
                    User Accounts
                  </h2>
                  <p className="text-[13px] text-gray-500 font-medium">
                    Manage user accounts and assign them to roles.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingUser({
                    id: "U_" + Date.now(),
                    username: "",
                    password: "password123",
                    name: "",
                    staffId: "EMP-" + Date.now().toString().slice(-4),
                    roleId: roles[0]?.id,
                  })
                  setShowUserModal(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-none-none text-[13px] font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Icons.Plus /> Create User
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="relative w-72">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icons.Search />
                </div>
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-white border border-gray-200 rounded-none-none pl-9 pr-4 py-2 text-[13px] focus:outline-none focus:border-blue-500 transition-colors font-medium text-gray-700 shadow-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-none-none px-4 py-2 text-[13px] font-bold text-gray-700 focus:outline-none focus:border-blue-500 shadow-sm outline-none"
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
                  className="bg-white border border-gray-200 rounded-none-none px-4 py-2 text-[13px] font-bold text-gray-700 focus:outline-none focus:border-blue-500 shadow-sm outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Username</th>
                    <th className="px-6 py-4">Staff ID</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <Icons.EmptyUser />
                        <h3 className="text-[16px] font-extrabold text-gray-900 mb-1">
                          No users found
                        </h3>
                        <p className="text-[13px] text-gray-500 mb-6 font-medium">
                          Create a user account to get started.
                        </p>
                        <button
                          onClick={() => {
                            setEditingUser({
                              id: "U_" + Date.now(),
                              username: "",
                              password: "password123",
                              name: "",
                              staffId: "EMP-" + Date.now().toString().slice(-4),
                              roleId: roles[0]?.id,
                              status: "Active",
                            })
                            setShowUserModal(true)
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-none-none text-[13px] font-bold inline-flex items-center gap-2 shadow-md transition-colors"
                        >
                          <Icons.Plus /> Create User
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, i) => (
                      <tr
                        key={u.id}
                        className="hover:bg-blue-50/40 transition-colors group"
                      >
                        <td className="px-6 py-4 font-bold text-gray-500">
                          {i + 1}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                          {u.name}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-600">
                          {u.username}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-[12.5px]">
                          {u.staffId}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-none-none text-[12px] font-bold border border-blue-100">
                            {roles.find((r) => r.id === u.roleId)?.name ||
                              "Unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`flex items-center gap-1.5 text-[12px] font-bold ${
                              !u.status || u.status === "Active"
                                ? "text-green-700 bg-green-50 border-green-100"
                                : "text-gray-700 bg-gray-50 border-gray-200"
                            } px-2.5 py-1 rounded-none-none border w-fit`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-none-none ${
                                !u.status || u.status === "Active"
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            ></span>
                            {u.status || "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setEditingUser({ ...u })
                              setShowUserModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-800 text-[13px] font-bold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="text-red-600 hover:text-red-800 text-[13px] font-bold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === AUDIT TAB === */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-none-none shadow-sm border border-gray-100 flex flex-col flex-1">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-none-none bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </div>
                <div>
                  <h2 className="text-[16px] font-extrabold text-gray-900 leading-tight">
                    Audit Logs
                  </h2>
                  <p className="text-[13px] text-gray-500 font-medium">
                    Track system activities, security events, and permission
                    changes.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="relative w-72">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Icons.Search />
                </div>
                <input
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search audit logs..."
                  className="w-full bg-white border border-gray-200 rounded-none-none pl-9 pr-4 py-2 text-[13px] focus:outline-none focus:border-indigo-500 transition-colors font-medium text-gray-700 shadow-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-none-none px-4 py-2 text-[13px] font-bold text-gray-700 focus:outline-none focus:border-indigo-500 shadow-sm outline-none"
                >
                  <option value="all">All Actions</option>
                  {uniqueAuditActions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <select
                  value={auditUserFilter}
                  onChange={(e) => setAuditUserFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-none-none px-4 py-2 text-[13px] font-bold text-gray-700 focus:outline-none focus:border-indigo-500 shadow-sm outline-none"
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
                  className="bg-white border border-gray-200 rounded-none-none px-4 py-2 text-[13px] font-bold text-gray-700 focus:outline-none focus:border-indigo-500 shadow-sm outline-none"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
                <select
                  value={auditStatusFilter}
                  onChange={(e) => setAuditStatusFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-none-none px-4 py-2 text-[13px] font-bold text-gray-700 focus:outline-none focus:border-indigo-500 shadow-sm outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[12px] text-gray-900 font-extrabold bg-gray-50">
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] text-gray-800 divide-y divide-gray-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <Icons.EmptyModule />
                        <h3 className="text-[16px] font-extrabold text-gray-900 mb-1">
                          No audit logs found
                        </h3>
                        <p className="text-[13px] text-gray-500 mb-6 font-medium">
                          System activities will appear here.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log, i) => (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-gray-500">
                          {i + 1}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-[11.5px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {log.username}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-none text-[11.5px] font-bold border border-indigo-100">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-600">
                          {log.module}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {log.description}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`flex items-center justify-end gap-1.5 text-[12px] font-bold ${
                              log.status === "Success"
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-none-none ${
                                log.status === "Success"
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            ></span>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {showRoleNameModal && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-none-none shadow-xl w-[400px] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[16px] font-extrabold text-gray-900">
                Create New Role
              </h2>
              <button
                onClick={() => setShowRoleNameModal(false)}
                className="text-gray-400 hover:text-gray-900"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="p-6">
              <label className="block text-[13px] font-bold text-gray-900 mb-2">
                Role Name
              </label>
              <input
                autoFocus
                required
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-none-none px-4 py-2.5 text-[14px] font-medium focus:outline-none focus:border-blue-500 transition-all"
                placeholder="e.g. Ward Manager"
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRoleNameModal(false)}
                  className="px-4 py-2 text-[13px] font-bold text-gray-500 hover:bg-gray-100 rounded-none-none transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-none-none shadow-sm transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUserModal && editingUser && (
        <div className="fixed inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-none-none shadow-xl w-[500px] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-[16px] font-extrabold text-gray-900">
                {editingUser.id.startsWith("U_") && editingUser.id.length > 10
                  ? "Create User Account"
                  : "Edit User Account"}
              </h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-900 font-bold"
              >
                ✕
              </button>
            </div>
            <form
              id="userForm"
              onSubmit={handleSaveUser}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
                  Full Name
                </label>
                <input
                  required
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  className="w-full border-2 border-gray-200 rounded-none-none px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
                    Username
                  </label>
                  <input
                    required
                    value={editingUser.username}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        username: e.target.value,
                      })
                    }
                    className="w-full border-2 border-gray-200 rounded-none-none px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
                    Staff ID
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
                    className="w-full border-2 border-gray-200 rounded-none-none px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-blue-500 transition-all text-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
                  Password
                </label>
                <input
                  required
                  value={editingUser.password}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, password: e.target.value })
                  }
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-none-none px-3 py-2 text-[13.5px] font-medium focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
                    Assign Role
                  </label>
                  <select
                    value={editingUser.roleId}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, roleId: e.target.value })
                    }
                    className="w-full border-2 border-gray-200 rounded-none-none px-3 py-2.5 text-[14px] font-bold text-gray-900 focus:outline-none focus:border-blue-500 transition-all bg-white shadow-sm outline-none cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-gray-900 mb-1.5">
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
                    className="w-full border-2 border-gray-200 rounded-none-none px-3 py-2.5 text-[14px] font-bold text-gray-900 focus:outline-none focus:border-blue-500 transition-all bg-white shadow-sm outline-none cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setShowUserModal(false)}
                type="button"
                className="px-5 py-2.5 text-[13px] font-bold text-gray-600 hover:bg-gray-200 rounded-none-none transition-colors"
              >
                Cancel
              </button>
              <button
                form="userForm"
                type="submit"
                className="px-5 py-2.5 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-none-none shadow-sm transition-colors"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
