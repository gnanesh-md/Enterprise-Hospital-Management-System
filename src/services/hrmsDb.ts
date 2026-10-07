/**
 * Enterprise Hospital Management System - HRMS & Staff Database Service
 * PostgreSQL-Backed Architecture (Connected to /hms-api gateway)
 */

import { API_BASE } from "../lib/constants"

export type StaffCategory = "Doctor" | "Nursing" | "Allied Health" | "Administrative" | "Support Staff"
export type EmploymentType = "Full-Time" | "Part-Time" | "Consultant" | "Contract" | "Resident"
export type StaffStatus = "Active" | "Probation" | "On Leave" | "Suspended" | "Resigned" | "Terminated" | "Retired" | "Inactive" | "Notice Period"
export type DutyStatus = "On Duty" | "Off Duty" | "In Surgery" | "On Break"
export type ShiftType = "Morning (07:00 - 15:00)" | "Evening (15:00 - 23:00)" | "Night (23:00 - 07:00)" | "General (09:00 - 17:30)" | "On-Call"
export type AttendanceStatusType = "Present" | "Late" | "Absent" | "Half Day" | "Half-Day" | "On Leave" | "Weekly Off" | "Holiday" | "Missed Punch"

export interface StaffSalary {
  basic: number
  hra: number
  allowances: number
  pf: number
  tax: number
  netPay: number
}

export interface StaffBankDetails {
  accountNo: string
  ifsc: string
  bankName: string
  pan: string
}

export interface StaffLeaveBalance {
  casual: number
  casualUsed: number
  sick: number
  sickUsed: number
  earned: number
  earnedUsed: number
}

export interface StaffMember {
  id: string
  name: string
  gender: "Male" | "Female" | "Other"
  dob: string
  email: string
  phone: string
  avatarInitials: string
  department: string
  designation: string
  category: StaffCategory
  employmentType: EmploymentType
  status: StaffStatus
  dutyStatus: DutyStatus
  shift: ShiftType
  joiningDate: string
  qualification: string
  licenseNumber: string
  licenseExpiry: string
  address?: string
  bloodGroup?: string
  salary: StaffSalary
  bankDetails: StaffBankDetails
  leaveBalance: StaffLeaveBalance
  resignationDate?: string | null
  lastWorkingDate?: string | null
  noticePeriodDays?: number
  exitReason?: string | null
  exitClearanceStatus?: string
  finalSettlementStatus?: string
  employmentStatus?: StaffStatus | string
  isActive?: boolean
  emergencyContact: {
    name: string
    relation: string
    phone: string
  }
  version?: number
}

export interface AttendanceRecord {
  id: string
  staffId: string
  staffName: string
  department: string
  date: string
  shift: ShiftType | string
  shiftStartTime?: string
  shiftEndTime?: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatusType
  workHours: number
  lateMinutes?: number
  earlyExitMinutes?: number
  overtimeHours: number
  remarks?: string
  source?: string
  category?: string
  designation?: string
  currentDutyStatus?: DutyStatus
  isCorrected?: boolean
  isActive?: boolean
}

export interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  department: string
  leaveType: "Casual Leave" | "Sick Leave" | "Earned Leave" | "Maternity/Paternity" | "Emergency Leave" | string
  startDate: string
  endDate: string
  days: number
  reason: string
  handoverNote?: string
  replacementStaffId?: string
  status: "Pending" | "Approved" | "Rejected" | "Cancelled"
  appliedOn: string
  reviewedBy?: string
  reviewedAt?: string
  remarks?: string
}

export interface PayrollEntry {
  id: string
  payrollRunId?: string
  staffId: string
  staffName: string
  department: string
  designation: string
  month: string
  year: number
  basic: number
  hra: number
  allowances: number
  gross: number
  pf: number
  tax: number
  otherDeductions: number
  totalDeductions: number
  netPay: number
  paidLeaveDays?: number
  unpaidLeaveDays?: number
  absentDays?: number
  overtimeHours?: number
  overtimeAmount?: number
  leaveDeductions?: number
  attendanceSummary?: {
    presentDays?: number
    absentDays?: number
    halfDays?: number
    paidLeaveDays?: number
    unpaidLeaveDays?: number
    overtimeHours?: number
    totalWorkHours?: number
    totalLateMinutes?: number
  }
  revisionNumber?: number
  revisionReason?: string
  reviewedBy?: string
  approvedBy?: string
  status: "Paid" | "Pending" | "On Hold" | "Calculated" | "Reviewed" | "Approved" | "Revised"
  runStatus?: "Draft" | "Calculated" | "Reviewed" | "Approved" | "Paid" | "Locked" | "Revised"
  bankAccountMasked?: string
  panMasked?: string
  bankName?: string
  ifscCode?: string
  paymentDate?: string
  transactionRef?: string
}

export interface StaffCredential {
  id: string
  staffId: string
  staffName: string
  department: string
  title: string
  credentialType?: string
  authority: string
  licenseNo: string
  validFrom: string
  validUntil: string
  status: "Valid" | "Expiring Soon" | "Expired"
  remarks?: string
}

export interface PromotionRecord {
  id: number
  employee_id: string
  employee_name: string
  old_designation: string
  new_designation: string
  effective_date: string
  approved_by: string
  remarks?: string
  created_at: string
}

export interface TransferRecord {
  id: number
  employee_id: string
  employee_name: string
  old_department: string
  new_department: string
  effective_date: string
  approved_by: string
  remarks?: string
  created_at: string
}

export interface SalaryRevisionRecord {
  id: number
  employee_id: string
  employee_name: string
  old_salary: number
  new_salary: number
  effective_date: string
  reason?: string
  approved_by: string
  created_at: string
}

export interface ExitRecord {
  id: number
  employee_id: string
  employee_name: string
  exit_type: string
  resignation_date: string
  notice_period_days: number
  last_working_date: string
  exit_reason?: string
  exit_clearance_status: string
  final_settlement_status: string
  approved_by: string
  created_at: string
}

export interface EmployeeLifecycleHistory {
  promotions: PromotionRecord[]
  transfers: TransferRecord[]
  salaryRevisions: SalaryRevisionRecord[]
  exits: ExitRecord[]
}

export interface AuditLogEntry {
  id: number
  userId: string
  actorUsername: string
  actor?: string
  employeeId?: string
  staffId?: string
  employeeName?: string
  module: string
  action: string
  entityType: string
  entityId?: string
  oldValue?: any
  newValue?: any
  changes?: any
  reason?: string
  ipAddress?: string
  createdAt: string
  timestamp?: string
}

export interface SystemAlert {
  id: string
  type: "CRITICAL" | "WARNING" | "INFO" | "ACTION_REQUIRED"
  category: string
  title: string
  message: string
  employeeId?: string
  employeeName?: string
  date: string
}

// In-Memory Authoritative Cache Synchronized with PostgreSQL Backend
let cacheStaff: StaffMember[] = []
let cacheAttendance: AttendanceRecord[] = []
let cacheLeaves: LeaveRequest[] = []
let cachePayroll: PayrollEntry[] = []
let cacheCredentials: StaffCredential[] = []
let cachePayrollRun: any = null
let cacheKpiStats = {
  totalWorkforce: 0,
  onDutyNow: 0,
  doctorsOnDuty: 0,
  nursesOnDuty: 0,
  pendingLeaves: 0,
  expiringLicenses: 0,
  monthlyPayrollEstimate: 0,
  totalPayrollGross: 0,
}

export class HrmsDatabase {
  private static listeners: Array<() => void> = []
  private static eventSource: EventSource | null = null
  private static initialized = false
  private static isSyncing = false

  public static async initSync(): Promise<void> {
    if (this.initialized) return
    this.initialized = true

    // Fetch authoritative state from PostgreSQL backend
    await this.refreshFromBackend()

    // Setup Server-Sent Events (SSE) for real-time live synchronization
    if (typeof window !== "undefined" && typeof EventSource !== "undefined") {
      try {
        this.eventSource = new EventSource(`${API_BASE}/api/hr/events`)
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type !== "CONNECTED") {
              this.refreshFromBackend()
            }
          } catch (_) {}
        }
        this.eventSource.onerror = () => {}
      } catch (_) {}
    }
  }

  public static async refreshFromBackend(): Promise<void> {
    if (this.isSyncing) return
    this.isSyncing = true
    try {
      const headers = { "Content-Type": "application/json" }
      const [empRes, attRes, leavesRes, credsRes, kpiRes, payrollRes] = await Promise.all([
        fetch(`${API_BASE}/api/hr/employees`, { headers, credentials: "include" }).then((r) => r.ok ? r.json() : { employees: [] }).catch(() => ({ employees: [] })),
        fetch(`${API_BASE}/api/hr/attendance`, { headers, credentials: "include" }).then((r) => r.ok ? r.json() : { attendance: [] }).catch(() => ({ attendance: [] })),
        fetch(`${API_BASE}/api/hr/leaves`, { headers, credentials: "include" }).then((r) => r.ok ? r.json() : { leaves: [] }).catch(() => ({ leaves: [] })),
        fetch(`${API_BASE}/api/hr/credentials`, { headers, credentials: "include" }).then((r) => r.ok ? r.json() : { credentials: [] }).catch(() => ({ credentials: [] })),
        fetch(`${API_BASE}/api/hr/overview/kpis`, { headers, credentials: "include" }).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_BASE}/api/hr/payroll?month=September&year=2026`, { headers, credentials: "include" }).then((r) => r.ok ? r.json() : { payroll: [] }).catch(() => ({ payroll: [] })),
      ])

      if (empRes && Array.isArray(empRes.employees)) {
        const defaultSalary: StaffSalary = { basic: 60000, hra: 24000, allowances: 16000, pf: 7200, tax: 4500, netPay: 88300 }
        const defaultBank: StaffBankDetails = { accountNo: "••••••••1234", ifsc: "HDFC0001824", bankName: "HDFC Bank", pan: "ABCDE1234F" }
        const defaultLeave: StaffLeaveBalance = { casual: 12, casualUsed: 0, sick: 10, sickUsed: 0, earned: 15, earnedUsed: 0 }
        cacheStaff = empRes.employees.map((s: any) => ({
          ...s,
          salary: s.salary || defaultSalary,
          bankDetails: s.bankDetails || defaultBank,
          leaveBalance: s.leaveBalance || defaultLeave,
        }))
      }
      if (attRes && Array.isArray(attRes.attendance)) {
        cacheAttendance = attRes.attendance
      }
      if (leavesRes && Array.isArray(leavesRes.leaves)) {
        cacheLeaves = leavesRes.leaves
      }
      if (credsRes && Array.isArray(credsRes.credentials)) {
        cacheCredentials = credsRes.credentials
      }
      if (payrollRes) {
        cachePayroll = payrollRes.payroll || []
        cachePayrollRun = payrollRes.run || null
      }
      if (kpiRes) {
        cacheKpiStats = {
          ...kpiRes,
          totalPayrollGross: kpiRes.totalPayrollGross || kpiRes.monthlyPayrollEstimate || 0,
        }
      }

      this.notify()
    } catch (err) {
      console.error("[HRMS Live Sync Error]", err)
    } finally {
      this.isSyncing = false
    }
  }

  public static subscribe(fn: () => void): () => void {
    if (!this.initialized) {
      this.initSync()
    }
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn)
    }
  }

  public static notify() {
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch (err) {
        console.error("HRMS listener error:", err)
      }
    })
  }

  public static clearAllData(): void {
    cacheStaff = []
    cacheAttendance = []
    cacheLeaves = []
    cachePayroll = []
    cacheCredentials = []
    cachePayrollRun = null
    cacheKpiStats = {
      totalWorkforce: 0,
      onDutyNow: 0,
      doctorsOnDuty: 0,
      nursesOnDuty: 0,
      pendingLeaves: 0,
      expiringLicenses: 0,
      monthlyPayrollEstimate: 0,
      totalPayrollGross: 0,
    }
    if (typeof localStorage !== "undefined") {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("hosp_hrms") || k.startsWith("hrms_")) {
          try { localStorage.removeItem(k) } catch (_) {}
        }
      })
    }
    this.refreshFromBackend()
  }

  // ── Employees ─────────────────────────────────────────────────────────────

  public static getStaffList(): StaffMember[] {
    if (!this.initialized) this.initSync()
    return cacheStaff
  }

  public static getStaffById(id: string): StaffMember | undefined {
    return cacheStaff.find((s) => s.id === id)
  }

  public static addStaff(member: Omit<StaffMember, "id">): StaffMember {
    const tempId = `EMP-${cacheStaff.length + 101}`
    const newStaff: StaffMember = { ...member, id: tempId }
    cacheStaff.unshift(newStaff)
    this.notify()

    fetch(`${API_BASE}/api/hr/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(member),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.employee) {
          const idx = cacheStaff.findIndex((s) => s.id === tempId)
          if (idx !== -1) cacheStaff[idx] = res.employee
          this.refreshFromBackend()
        }
      })
      .catch((err) => console.error("Failed to persist employee to backend:", err))

    return newStaff
  }

  public static updateStaff(id: string, updates: Partial<StaffMember>): StaffMember | null {
    const idx = cacheStaff.findIndex((s) => s.id === id)
    if (idx === -1) return null

    cacheStaff[idx] = { ...cacheStaff[idx], ...updates }
    this.notify()

    fetch(`${API_BASE}/api/hr/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    })
      .then((r) => r.json())
      .then(() => this.refreshFromBackend())
      .catch((err) => console.error("Failed to update employee on backend:", err))

    return cacheStaff[idx]
  }

  public static deleteStaff(id: string): boolean {
    const idx = cacheStaff.findIndex((s) => s.id === id)
    if (idx === -1) return false

    cacheStaff = cacheStaff.filter((s) => s.id !== id)
    this.notify()

    fetch(`${API_BASE}/api/hr/employees/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
      .then(() => this.refreshFromBackend())
      .catch((err) => console.error("Failed to deactivate employee on backend:", err))

    return true
  }

  // ── Employee Lifecycle Actions ────────────────────────────────────────────

  public static async promoteEmployee(id: string, newDesignation: string, effectiveDate: string, remarks: string) {
    const res = await fetch(`${API_BASE}/api/hr/employees/${id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newDesignation, effectiveDate, remarks }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to record promotion")
    await this.refreshFromBackend()
    return data
  }

  public static async transferEmployee(id: string, newDepartment: string, effectiveDate: string, remarks: string) {
    const res = await fetch(`${API_BASE}/api/hr/employees/${id}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newDepartment, effectiveDate, remarks }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to record transfer")
    await this.refreshFromBackend()
    return data
  }

  public static async reviseSalary(id: string, newBaseSalary: number, effectiveDate: string, reason: string) {
    const res = await fetch(`${API_BASE}/api/hr/employees/${id}/salary-revision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newBaseSalary, effectiveDate, reason }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to record salary revision")
    await this.refreshFromBackend()
    return data
  }

  public static async recordEmployeeExit(id: string, payload: {
    exitType: string
    resignationDate: string
    noticePeriodDays: number
    lastWorkingDate: string
    exitReason: string
    exitClearanceStatus?: string
    finalSettlementStatus?: string
  }) {
    const res = await fetch(`${API_BASE}/api/hr/employees/${id}/exit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to record employee exit")
    await this.refreshFromBackend()
    return data
  }

  public static async getEmployeeLifecycle(id: string): Promise<EmployeeLifecycleHistory> {
    const res = await fetch(`${API_BASE}/api/hr/employees/${id}/lifecycle`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    if (!res.ok) return { promotions: [], transfers: [], salaryRevisions: [], exits: [] }
    return res.json()
  }

  // ── Attendance ────────────────────────────────────────────────────────────

  public static getAttendanceList(params?: {
    date?: string
    startDate?: string
    endDate?: string
    employeeId?: string
    department?: string
    status?: string
    filter?: string
  }): AttendanceRecord[] {
    if (!this.initialized) this.initSync()
    if (!params) return cacheAttendance

    return cacheAttendance.filter((r) => {
      if (params.date && r.date !== params.date) return false
      if (params.employeeId && r.staffId !== params.employeeId) return false
      if (params.department && params.department !== "All" && r.department !== params.department) return false
      if (params.status && params.status !== "All" && r.status !== params.status) return false
      if (params.filter === "late" && !(r.status === "Late" || (r.lateMinutes && r.lateMinutes > 0))) return false
      if (params.filter === "absent" && r.status !== "Absent") return false
      if (params.filter === "overtime" && !(r.overtimeHours && r.overtimeHours > 0)) return false
      return true
    })
  }

  public static async fetchAttendanceFiltered(params: Record<string, string>): Promise<AttendanceRecord[]> {
    const queryStr = new URLSearchParams(params).toString()
    const res = await fetch(`${API_BASE}/api/hr/attendance?${queryStr}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.attendance || []
  }

  public static async punchClock(staffId: string, action: "checkIn" | "checkOut"): Promise<void> {
    const endpoint = action === "checkIn" ? "/api/hr/attendance/clock-in" : "/api/hr/attendance/clock-out"
    const nextStatus: DutyStatus = action === "checkIn" ? "On Duty" : "Off Duty"

    const staffIdx = cacheStaff.findIndex((s) => s.id === staffId)
    if (staffIdx !== -1) {
      cacheStaff[staffIdx].dutyStatus = nextStatus
      this.notify()
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ employeeId: staffId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Clock punch failed")
    await this.refreshFromBackend()
  }

  public static async markAttendanceManual(payload: {
    employeeId: string
    date: string
    status: string
    shift?: string
    clockIn?: string
    clockOut?: string
    reason: string
  }) {
    const res = await fetch(`${API_BASE}/api/hr/attendance/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Manual attendance recording failed")
    await this.refreshFromBackend()
    return data
  }

  public static async correctAttendance(attendanceId: string, updates: {
    newClockIn?: string
    newClockOut?: string
    newStatus?: string
    correctionReason: string
  }) {
    const res = await fetch(`${API_BASE}/api/hr/attendance/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ attendanceId, ...updates }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Attendance correction failed")
    await this.refreshFromBackend()
    return data
  }

  public static async getAttendanceCorrections(attendanceId: string) {
    const res = await fetch(`${API_BASE}/api/hr/attendance/corrections/${attendanceId}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.corrections || []
  }

  // ── Leave Management ──────────────────────────────────────────────────────

  public static getLeaves(): LeaveRequest[] {
    if (!this.initialized) this.initSync()
    return cacheLeaves
  }

  public static applyLeave(leave: Omit<LeaveRequest, "id" | "status" | "appliedOn">): LeaveRequest {
    const tempId = `LR-2026-${String(cacheLeaves.length + 10).padStart(3, "0")}`
    const newLeave: LeaveRequest = {
      ...leave,
      id: tempId,
      appliedOn: new Date().toISOString().split("T")[0],
      status: "Pending",
    }
    cacheLeaves.unshift(newLeave)
    this.notify()

    fetch(`${API_BASE}/api/hr/leaves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(leave),
    })
      .then((r) => r.json())
      .then(() => this.refreshFromBackend())
      .catch((err) => console.error("Apply leave error:", err))

    return newLeave
  }

  public static reviewLeave(id: string, status: "Approved" | "Rejected", reviewerName: string, remarks?: string): void {
    const idx = cacheLeaves.findIndex((l) => l.id === id)
    if (idx !== -1) {
      cacheLeaves[idx].status = status
      cacheLeaves[idx].reviewedBy = reviewerName
      cacheLeaves[idx].reviewedAt = new Date().toLocaleString()
      cacheLeaves[idx].remarks = remarks || cacheLeaves[idx].remarks
      this.notify()
    }

    const endpoint = status === "Approved" ? `/api/hr/leaves/${id}/approve` : `/api/hr/leaves/${id}/reject`
    fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ remarks }),
    })
      .then((r) => r.json())
      .then(() => this.refreshFromBackend())
      .catch((err) => console.error("Review leave error:", err))
  }

  // ── Payroll ───────────────────────────────────────────────────────────────

  public static getPayroll(month: string = "September", year: number = 2026): PayrollEntry[] {
    if (!this.initialized) this.initSync()
    return cachePayroll.filter((p) => p.month === month && p.year === year)
  }

  public static getPayrollRun() {
    return cachePayrollRun
  }

  public static async runMonthlyPayroll(month: string, year: number): Promise<any> {
    const res = await fetch(`${API_BASE}/api/hr/payroll/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ month, year }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to calculate payroll")
    await this.refreshFromBackend()
    return data
  }

  public static async reviewPayroll(runId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/hr/payroll/${runId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to review payroll")
    await this.refreshFromBackend()
    return data
  }

  public static async approvePayroll(runId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/hr/payroll/${runId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to approve payroll")
    await this.refreshFromBackend()
    return data
  }

  public static async revisePayroll(runId: string, employeeId: string, adjustments: any, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/hr/payroll/${runId}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ employeeId, adjustments, reason }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to revise payroll")
    await this.refreshFromBackend()
    return data
  }

  public static async disbursePayroll(runId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/hr/payroll/${runId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to disburse payroll")
    await this.refreshFromBackend()
    return data
  }

  public static async getPayrollPolicy(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/hr/payroll/policies`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to fetch payroll policy")
    return data.policy
  }

  public static async updatePayrollPolicy(policy: {
    policyName?: string
    pfPercentage: number
    tdsPercentage: number
    dailyPayDivisorType: '30_days' | 'month_days'
    dailyPayFixedDays?: number
    overtimeMultiplier: number
    standardWorkHoursPerDay: number
    reason?: string
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/api/hr/payroll/policies`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(policy),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to update payroll policy")
    return data.policy
  }

  // ── Credentials ───────────────────────────────────────────────────────────

  public static getCredentials(): StaffCredential[] {
    if (!this.initialized) this.initSync()
    return cacheCredentials
  }

  public static renewCredential(id: string, newExpiry: string): boolean {
    const idx = cacheCredentials.findIndex((c) => c.id === id)
    if (idx !== -1) {
      cacheCredentials[idx].validUntil = newExpiry
      cacheCredentials[idx].status = "Valid"
      this.notify()
    }

    fetch(`${API_BASE}/api/hr/credentials/${id}/renew`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newExpiry }),
    })
      .then((r) => r.json())
      .then(() => this.refreshFromBackend())
      .catch((err) => console.error("Renew credential error:", err))

    return true
  }

  // ── Audit Logs & System Alerts ────────────────────────────────────────────

  public static async getAuditLogs(params?: Record<string, string>): Promise<AuditLogEntry[]> {
    const queryStr = params ? new URLSearchParams(params).toString() : ""
    const res = await fetch(`${API_BASE}/api/hr/audit-logs?${queryStr}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.auditLogs || []
  }

  public static async getAlerts(): Promise<SystemAlert[]> {
    const res = await fetch(`${API_BASE}/api/hr/alerts`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.alerts || []
  }

  // ── Current Shift Info ────────────────────────────────────────────────────

  public static getCurrentShiftInfo() {
    const now = new Date()
    const hour = now.getHours()
    if (hour >= 7 && hour < 15) {
      const end = new Date(now).setHours(15, 0, 0, 0)
      const remaining = Math.max(0, Math.floor((end - now.getTime()) / 60000))
      return { name: "Morning Clinical Shift", type: "Morning (07:00 - 15:00)" as ShiftType, remainingMinutes: remaining }
    } else if (hour >= 15 && hour < 23) {
      const end = new Date(now).setHours(23, 0, 0, 0)
      const remaining = Math.max(0, Math.floor((end - now.getTime()) / 60000))
      return { name: "Evening Clinical Shift", type: "Evening (15:00 - 23:00)" as ShiftType, remainingMinutes: remaining }
    } else {
      const end = hour >= 23 ? new Date(now).setHours(31, 0, 0, 0) : new Date(now).setHours(7, 0, 0, 0)
      const remaining = Math.max(0, Math.floor((end - now.getTime()) / 60000))
      return { name: "Night Clinical Shift", type: "Night (23:00 - 07:00)" as ShiftType, remainingMinutes: remaining }
    }
  }

  public static getKpis() {
    return cacheKpiStats
  }
}
