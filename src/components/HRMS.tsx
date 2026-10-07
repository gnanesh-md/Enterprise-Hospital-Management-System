import React, { useState, useEffect } from "react"
import {
  HrmsDatabase,
  StaffMember,
  AttendanceRecord,
  LeaveRequest,
  PayrollEntry,
  StaffCredential,
  DutyStatus,
  ShiftType,
  StaffCategory,
  AuditLogEntry,
  SystemAlert,
} from "../services/hrmsDb"
import AddEmployeeModal from "./hrms/AddEmployeeModal"
import EmployeeProfileModal from "./hrms/EmployeeProfileModal"
import PayslipModal from "./hrms/PayslipModal"
import RenewCredentialModal from "./hrms/RenewCredentialModal"
import EmployeeLifecycleModal from "./hrms/EmployeeLifecycleModal"
import AttendanceModal from "./hrms/AttendanceModal"
import PayrollRevisionModal from "./hrms/PayrollRevisionModal"
import PayrollPolicyModal from "./hrms/PayrollPolicyModal"
import DoctorScheduling from "./DoctorScheduling"
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  ShieldCheck,
  Search,
  Plus,
  Download,
  Filter,
  CheckCircle,
  AlertCircle,
  Stethoscope,
  Briefcase,
  TrendingUp,
  FileText,
  UserCheck,
  RefreshCw,
  Bell,
  ArrowRight,
  LayoutGrid,
  List,
  Edit2,
  Check,
  X,
  Sparkles,
  ArrowLeftRight,
  AlertTriangle,
  History,
  CheckSquare,
  ChevronRight,
  Settings2,
} from "lucide-react"

interface HRMSProps {
  onNavigate?: (module: string) => void
}

type TabType = "directory" | "shifts" | "timetables" | "leaves" | "payroll" | "compliance" | "audit"

export default function HRMS({ onNavigate }: HRMSProps) {
  const [activeTab, setActiveTab] = useState<TabType>("directory")
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<string>("")

  // Reactive DB State
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([])
  const [leavesList, setLeavesList] = useState<LeaveRequest[]>([])
  const [payrollList, setPayrollList] = useState<PayrollEntry[]>([])
  const [credentialsList, setCredentialsList] = useState<StaffCredential[]>([])
  const [kpiStats, setKpiStats] = useState(HrmsDatabase.getKpis())

  // Alerts & Audit
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [auditSearch, setAuditSearch] = useState("")
  const [auditModuleFilter, setAuditModuleFilter] = useState("All")
  const [loadingAudit, setLoadingAudit] = useState(false)

  // Modal Controls
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [viewingStaff, setViewingStaff] = useState<StaffMember | null>(null)
  const [payslipStaff, setPayslipStaff] = useState<StaffMember | null>(null)
  const [renewingCredential, setRenewingCredential] = useState<StaffCredential | null>(null)
  const [lifecycleStaff, setLifecycleStaff] = useState<StaffMember | null>(null)
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [attendanceRecordToEdit, setAttendanceRecordToEdit] = useState<AttendanceRecord | null>(null)
  const [payrollRevisionItem, setPayrollRevisionItem] = useState<PayrollEntry | null>(null)
  const [isPayrollPolicyOpen, setIsPayrollPolicyOpen] = useState(false)

  // Filter & Search Controls
  const [search, setSearch] = useState("")
  const [selectedDept, setSelectedDept] = useState("All")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [dutyFilter, setDutyFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [leaveFilter, setLeaveFilter] = useState<"All" | "Pending" | "Approved">("Pending")

  // Attendance Filters
  const [attendanceDateFilter, setAttendanceDateFilter] = useState<string>("")
  const [attendanceQuickFilter, setAttendanceQuickFilter] = useState<"All" | "Late" | "Absent" | "Overtime" | "Missed Punch" | "On Leave">("All")

  // Payroll Workflow state
  const [payrollMonth] = useState("September")
  const [payrollYear] = useState(2026)
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false)

  // Notification Toast
  const [notice, setNotice] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const showToast = (msg: string) => {
    setNotice(msg)
    setTimeout(() => setNotice(null), 3500)
  }

  const loadData = async () => {
    setStaffList(HrmsDatabase.getStaffList())
    setAttendanceList(HrmsDatabase.getAttendanceList())
    setLeavesList(HrmsDatabase.getLeaves())
    setPayrollList(HrmsDatabase.getPayroll(payrollMonth, payrollYear))
    setCredentialsList(HrmsDatabase.getCredentials())
    setKpiStats(HrmsDatabase.getKpis())

    try {
      const fetchedAlerts = await HrmsDatabase.getAlerts()
      setAlerts(fetchedAlerts)
    } catch (err) {
      console.error("Failed to load alerts:", err)
    }
  }

  const loadAuditLogs = async () => {
    setLoadingAudit(true)
    try {
      const logs = await HrmsDatabase.getAuditLogs({
        module: auditModuleFilter !== "All" ? auditModuleFilter : "",
        search: auditSearch,
      })
      setAuditLogs(logs)
    } catch (err) {
      console.error("Failed to load audit logs:", err)
    } finally {
      setLoadingAudit(false)
    }
  }

  useEffect(() => {
    // Automatically purge legacy demo cache once on mount for clean state
    const CLEAN_KEY = "imperial_hrms_clean_slate_executed_v6"
    if (typeof window !== "undefined" && !sessionStorage.getItem(CLEAN_KEY)) {
      sessionStorage.setItem(CLEAN_KEY, "true")
      HrmsDatabase.clearAllData()
    }
    loadData()
    const unsubscribe = HrmsDatabase.subscribe(() => {
      loadData()
    })
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => {
      unsubscribe()
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditLogs()
    }
  }, [activeTab, auditModuleFilter, auditSearch])

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase()) ||
      s.designation.toLowerCase().includes(search.toLowerCase()) ||
      s.licenseNumber.toLowerCase().includes(search.toLowerCase())
    const matchesDept = selectedDept === "All" || s.department === selectedDept
    const matchesCat = selectedCategory === "All" || s.category === selectedCategory
    const matchesDuty = dutyFilter === "All" || s.dutyStatus === dutyFilter
    const matchesStatus = statusFilter === "All" || (s.employmentStatus || (s.isActive ? "Active" : "Inactive")) === statusFilter
    return matchesSearch && matchesDept && matchesCat && matchesDuty && matchesStatus
  })

  // Filtered attendance list
  const filteredAttendance = attendanceList.filter((rec) => {
    const matchesDate = !attendanceDateFilter || rec.date === attendanceDateFilter
    let matchesQuick = true
    if (attendanceQuickFilter === "Late") {
      matchesQuick = rec.status === "Late" || (rec.lateMinutes || 0) > 0
    } else if (attendanceQuickFilter === "Absent") {
      matchesQuick = rec.status === "Absent"
    } else if (attendanceQuickFilter === "Overtime") {
      matchesQuick = (rec.overtimeHours || 0) > 0
    } else if (attendanceQuickFilter === "Missed Punch") {
      matchesQuick = rec.status === "Missed Punch" || Boolean(rec.checkIn && !rec.checkOut)
    } else if (attendanceQuickFilter === "On Leave") {
      matchesQuick = rec.status === "On Leave"
    }
    return matchesDate && matchesQuick
  })

  const departments = ["All", ...Array.from(new Set(staffList.map((s) => s.department)))]
  const categories: ("All" | StaffCategory)[] = ["All", "Doctor", "Nursing", "Allied Health", "Administrative", "Support Staff"]

  const pendingLeaves = leavesList.filter((l) => l.status === "Pending")
  const expiringCreds = credentialsList.filter((c) => c.status === "Expiring Soon" || c.status === "Expired")
  const currentShift = HrmsDatabase.getCurrentShiftInfo()
  const activeAlerts = alerts.filter((a) => !dismissedAlerts.includes(a.id))

  // Payroll run status
  const currentPayrollRun = HrmsDatabase.getPayrollRun()
  const payrollRunStatus = currentPayrollRun?.status || (payrollList[0]?.runStatus || (payrollList.length > 0 ? "Calculated" : "Draft"))

  const handleToggleDuty = (staffId: string, currentDuty: DutyStatus) => {
    const staff = staffList.find((s) => s.id === staffId)
    if (staff && (staff.employmentStatus === "Inactive" || staff.employmentStatus === "Resigned" || staff.employmentStatus === "Terminated")) {
      showToast(`Cannot clock in: Staff member is ${staff.employmentStatus}`)
      return
    }

    const nextStatus: DutyStatus = currentDuty === "On Duty" ? "Off Duty" : "On Duty"
    HrmsDatabase.updateStaff(staffId, { dutyStatus: nextStatus })
    if (nextStatus === "On Duty") {
      HrmsDatabase.punchClock(staffId, "checkIn")
      showToast("Staff marked On Duty")
    } else {
      HrmsDatabase.punchClock(staffId, "checkOut")
      showToast("Staff marked Off Duty")
    }
  }

  const handleReviewLeave = (id: string, status: "Approved" | "Rejected") => {
    HrmsDatabase.reviewLeave(id, status, "HR Administrator", `Decision: ${status}`)
    showToast(`Leave request ${status.toLowerCase()} successfully`)
  }

  // Payroll Workflow Actions
  const handleCalculatePayroll = async () => {
    setIsProcessingPayroll(true)
    try {
      await HrmsDatabase.runMonthlyPayroll(payrollMonth, payrollYear)
      showToast(`${payrollMonth} ${payrollYear} payroll calculated successfully`)
      await loadData()
    } catch (err: any) {
      showToast(err.message || "Failed to calculate payroll")
    } finally {
      setIsProcessingPayroll(false)
    }
  }

  const handleReviewPayroll = async () => {
    const runId = currentPayrollRun?.id || `PR-${payrollYear}-${payrollMonth.slice(0, 3).toUpperCase()}`
    setIsProcessingPayroll(true)
    try {
      await HrmsDatabase.reviewPayroll(runId)
      showToast("Payroll reviewed and verified by HR Administrator")
      await loadData()
    } catch (err: any) {
      showToast(err.message || "Failed to review payroll")
    } finally {
      setIsProcessingPayroll(false)
    }
  }

  const handleApprovePayroll = async () => {
    const runId = currentPayrollRun?.id || `PR-${payrollYear}-${payrollMonth.slice(0, 3).toUpperCase()}`
    setIsProcessingPayroll(true)
    try {
      await HrmsDatabase.approvePayroll(runId)
      showToast("Payroll officially approved for disbursement")
      await loadData()
    } catch (err: any) {
      showToast(err.message || "Failed to approve payroll")
    } finally {
      setIsProcessingPayroll(false)
    }
  }

  const handleDisbursePayroll = async () => {
    const runId = currentPayrollRun?.id || `PR-${payrollYear}-${payrollMonth.slice(0, 3).toUpperCase()}`
    if (!confirm(`Confirm salary disbursement for ${payrollList.length} employees? Direct bank transfers will be batched.`)) {
      return
    }
    setIsProcessingPayroll(true)
    try {
      await HrmsDatabase.disbursePayroll(runId)
      showToast("Payroll successfully disbursed to all employees")
      await loadData()
    } catch (err: any) {
      showToast(err.message || "Failed to disburse payroll")
    } finally {
      setIsProcessingPayroll(false)
    }
  }

  const handleExportStaffCsv = () => {
    const headers = ["Staff ID,Name,Department,Designation,Category,Employment Status,Shift,Duty Status,Phone,Email,License No\n"]
    const rows = staffList.map(
      (s) =>
        `"${s.id}","${s.name}","${s.department}","${s.designation}","${s.category}","${s.employmentStatus || 'Active'}","${s.shift}","${s.dutyStatus}","${s.phone}","${s.email}","${s.licenseNumber}"`
    )
    const blob = new Blob([headers.join("") + rows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `hospital_staff_directory_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast("Staff directory exported to CSV")
  }

  const handleExportAttendanceCsv = () => {
    const headers = ["Date,Staff ID,Staff Name,Department,Shift,Start Time,End Time,Check-In,Check-Out,Hours Worked,Late Mins,Early Exit Mins,Overtime Hrs,Status\n"]
    const rows = filteredAttendance.map(
      (a) =>
        `"${a.date}","${a.staffId}","${a.staffName}","${a.department}","${a.shift}","${a.shiftStartTime || ''}","${a.shiftEndTime || ''}","${a.checkIn || ''}","${a.checkOut || ''}","${a.workHours || 0}","${a.lateMinutes || 0}","${a.earlyExitMinutes || 0}","${a.overtimeHours || 0}","${a.status}"`
    )
    const blob = new Blob([headers.join("") + rows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `hospital_attendance_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast("Attendance roster exported to CSV")
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden text-[#0F172A] font-sans">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed top-4 right-4 z-50 bg-[#0F172A] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs border border-slate-700 animate-in slide-in-from-top-2 duration-150">
          <CheckCircle className="w-4 h-4 text-[#22C55E]" />
          <span className="font-medium">{notice}</span>
        </div>
      )}

      {/* ── Top Clinical Hospital Header ────────────────────────────────────── */}
      <header className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 flex items-center justify-between flex-shrink-0 shadow-2xs">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mb-1">
            <span>Hospital Administration</span>
            <span>/</span>
            <span>Workforce Management</span>
            <span>/</span>
            <span className="text-[#1B4FD8] font-semibold">HRMS Suite</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1B4FD8] border border-[#BFDBFE] flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#0F172A] leading-tight">
                  Hospital HR & Staff Management
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                  {staffList.filter((s) => s.dutyStatus === "On Duty").length} On Duty Now
                </span>
                {activeAlerts.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-[#DC2626]" />
                    {activeAlerts.length} Action Items
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Shift Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg text-xs">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
            <span className="font-mono font-bold text-[#0F172A]">{currentTime.toLocaleTimeString()}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[#475569] font-medium">{currentShift.name}</span>
          </div>

          <button
            onClick={handleExportStaffCsv}
            className="px-3 py-1.5 text-xs font-semibold text-[#475569] bg-white hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" /> Export CSV
          </button>

          <button
            onClick={() => {
              setEditingStaff(null)
              setIsAddOpen(true)
            }}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1B4FD8] hover:bg-[#1541B8] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Employee
          </button>
        </div>
      </header>

      {/* ── Active Real-Time Alerts Notification Banner ──────────────────────── */}
      {activeAlerts.length > 0 && (
        <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-6 py-2.5 flex items-center justify-between flex-shrink-0 text-xs">
          <div className="flex items-center gap-2.5 overflow-x-auto">
            <div className="flex items-center gap-1.5 font-bold text-[#B45309] flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              <span>Workforce Alerts ({activeAlerts.length}):</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {activeAlerts.slice(0, 3).map((alert) => (
                <span
                  key={alert.id}
                  className="bg-white/80 border border-[#FDE68A] px-2 py-0.5 rounded-md text-[#78350F] flex items-center gap-1 flex-shrink-0 font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                  {alert.title}: {alert.message}
                </span>
              ))}
              {activeAlerts.length > 3 && (
                <span className="text-[#B45309] font-medium text-[11px] flex-shrink-0">
                  +{activeAlerts.length - 3} more
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {pendingLeaves.length > 0 && (
              <button
                onClick={() => setActiveTab("leaves")}
                className="px-2 py-0.5 text-[11px] font-bold text-[#1B4FD8] bg-white border border-[#BFDBFE] rounded hover:bg-[#EFF6FF] cursor-pointer"
              >
                Review Leaves ({pendingLeaves.length})
              </button>
            )}
            {expiringCreds.length > 0 && (
              <button
                onClick={() => setActiveTab("compliance")}
                className="px-2 py-0.5 text-[11px] font-bold text-[#B45309] bg-white border border-[#FDE68A] rounded hover:bg-[#FEF3C7] cursor-pointer"
              >
                Licenses ({expiringCreds.length})
              </button>
            )}
            <button
              onClick={() => setDismissedAlerts(activeAlerts.map((a) => a.id))}
              className="text-[#92400E] hover:text-[#451A03] p-1 cursor-pointer"
              title="Dismiss alerts bar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modern Navigation Bar ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-2 flex items-center justify-between flex-shrink-0">
        <nav className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "directory", label: "Staff Directory", badge: `${staffList.length}`, icon: Users },
            {
              id: "shifts",
              label: "Duty Shifts & Roster",
              badge: `${staffList.filter((s) => s.dutyStatus === "On Duty").length} Active`,
              icon: Clock,
            },
            {
              id: "timetables",
              label: "Doctor Timetables",
              badge: `${staffList.filter((s) => s.category === "Doctor").length} Doctors`,
              icon: Calendar,
            },
            {
              id: "leaves",
              label: "Leave Approvals",
              badge: pendingLeaves.length > 0 ? `${pendingLeaves.length} Due` : null,
              alert: pendingLeaves.length > 0,
              icon: Calendar,
            },
            {
              id: "payroll",
              label: "Monthly Payroll",
              badge: `₹${(kpiStats.totalPayrollGross / 100000).toFixed(1)}L`,
              icon: DollarSign,
            },
            {
              id: "compliance",
              label: "Licenses & Compliance",
              badge: expiringCreds.length > 0 ? `${expiringCreds.length} Due` : null,
              alert: expiringCreds.length > 0,
              icon: ShieldCheck,
            },
            {
              id: "audit",
              label: "Audit Trail",
              badge: "Live",
              icon: History,
            },
          ].map((tab) => {
            const active = activeTab === tab.id
            const IconComp = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                  active
                    ? "bg-[#1B4FD8] text-white shadow-xs font-bold"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                }`}
              >
                <IconComp className={`w-3.5 h-3.5 ${active ? "text-white" : "text-[#94A3B8]"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10.5px] font-bold px-1.5 py-0.2 rounded-full ${
                      active
                        ? "bg-white/20 text-white"
                        : tab.alert
                          ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                          : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2 text-xs text-[#64748B]">
          <span>Shift Handover:</span>
          <span className="font-mono font-bold text-[#1B4FD8] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
            {currentShift.remainingMinutes}m left
          </span>
        </div>
      </div>

      {/* ── Main Tab Workspace Area ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        
        {/* ==================================================================== */}
        {/* TAB 1: STAFF DIRECTORY & LIFECYCLE */}
        {/* ==================================================================== */}
        {activeTab === "directory" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div
                onClick={() => {
                  setSelectedCategory("All")
                  setDutyFilter("All")
                  setStatusFilter("All")
                }}
                className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
                  selectedCategory === "All" && dutyFilter === "All" && statusFilter === "All"
                    ? "border-[#1B4FD8] ring-1 ring-[#1B4FD8]"
                    : "border-[#DDE2EC]"
                }`}
              >
                <div className="flex items-center justify-between text-[#64748B] text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Total Workforce</span>
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#1B4FD8] flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#0F172A] mt-1.5">{staffList.length}</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Across {departments.length - 1} departments</div>
              </div>

              <div
                onClick={() => {
                  setSelectedCategory("Doctor")
                  setDutyFilter("All")
                }}
                className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
                  selectedCategory === "Doctor" ? "border-[#1B4FD8] ring-1 ring-[#1B4FD8]" : "border-[#DDE2EC]"
                }`}
              >
                <div className="flex items-center justify-between text-[#64748B] text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Doctors & Specialists</span>
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#1B4FD8] flex items-center justify-center">
                    <Stethoscope className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#0F172A] mt-1.5">
                  {staffList.filter((s) => s.category === "Doctor").length}
                </div>
                <div className="text-[11px] text-[#1B4FD8] font-medium mt-0.5">Cardio, Ortho, Surgery & ER</div>
              </div>

              <div
                onClick={() => {
                  setSelectedCategory("Nursing")
                  setDutyFilter("All")
                }}
                className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
                  selectedCategory === "Nursing" ? "border-[#0F766E] ring-1 ring-[#0F766E]" : "border-[#DDE2EC]"
                }`}
              >
                <div className="flex items-center justify-between text-[#64748B] text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Nursing Staff</span>
                  <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] text-[#0F766E] flex items-center justify-center">
                    <Briefcase className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#0F172A] mt-1.5">
                  {staffList.filter((s) => s.category === "Nursing").length}
                </div>
                <div className="text-[11px] text-[#0F766E] font-medium mt-0.5">ICU, OT & Inpatient Wards</div>
              </div>

              <div
                onClick={() => {
                  setSelectedCategory("All")
                  setDutyFilter(dutyFilter === "On Duty" ? "All" : "On Duty")
                }}
                className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${
                  dutyFilter === "On Duty" ? "border-[#15803D] ring-1 ring-[#15803D]" : "border-[#DDE2EC]"
                }`}
              >
                <div className="flex items-center justify-between text-[#64748B] text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Active On Duty</span>
                  <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#15803D] mt-1.5">
                  {staffList.filter((s) => s.dutyStatus === "On Duty").length}
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  {staffList.filter((s) => s.dutyStatus === "Off Duty").length} Off Duty · Click to toggle
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
              <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg px-3 py-1.5 flex-1 min-w-[240px] max-w-md">
                <Search size={14} className="text-[#94A3B8] flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff by name, ID, license, or role..."
                  className="bg-transparent text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none w-full"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Filter Dropdowns */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-[#DDE2EC] rounded-lg bg-white text-[#334155] focus:outline-none focus:border-[#1B4FD8] font-medium"
                >
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === "All" ? "All Departments" : dept}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 border border-[#DDE2EC] rounded-lg bg-white text-[#334155] focus:outline-none focus:border-[#1B4FD8] font-medium"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "All" ? "All Categories" : cat}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-[#DDE2EC] rounded-lg bg-white text-[#334155] focus:outline-none focus:border-[#1B4FD8] font-medium"
                >
                  <option value="All">All Employment Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Notice Period">Notice Period</option>
                  <option value="Resigned">Resigned</option>
                  <option value="Terminated">Terminated</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <div className="flex border border-[#DDE2EC] rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setViewMode("table")}
                    className={`p-1.5 transition-colors cursor-pointer ${
                      viewMode === "table" ? "bg-[#EFF6FF] text-[#1B4FD8]" : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                    title="Table View"
                  >
                    <List size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 transition-colors cursor-pointer ${
                      viewMode === "grid" ? "bg-[#EFF6FF] text-[#1B4FD8]" : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Staff Directory Table */}
            {viewMode === "table" ? (
              <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-2xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#DDE2EC] text-[#475569] font-bold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Department & Role</th>
                      <th className="py-3 px-4">Shift</th>
                      <th className="py-3 px-4">Employment Status</th>
                      <th className="py-3 px-4">Duty Status</th>
                      <th className="py-3 px-4">Licensure</th>
                      <th className="py-3 px-4 text-right">Actions & Lifecycle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                          <Users className="w-8 h-8 mx-auto mb-2 text-[#CBD5E1]" />
                          <p className="font-bold text-sm text-[#334155]">No Hospital Staff Found</p>
                          <p className="text-xs text-[#64748B] mt-1">Try adjusting your filters or click "+ Add Employee".</p>
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((staff) => {
                        const empStatus = staff.employmentStatus || (staff.isActive ? "Active" : "Inactive")
                        const isInactive = empStatus === "Inactive" || empStatus === "Resigned" || empStatus === "Terminated"

                        return (
                          <tr
                            key={staff.id}
                            className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                              isInactive ? "opacity-75 bg-slate-50/50" : ""
                            }`}
                            onClick={() => setViewingStaff(staff)}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1B4FD8] font-bold text-xs flex items-center justify-center border border-[#BFDBFE]">
                                  {staff.avatarInitials}
                                </div>
                                <div>
                                  <div className="font-bold text-[#0F172A]">{staff.name}</div>
                                  <div className="text-[11px] font-mono text-[#64748B]">{staff.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-[#0F172A]">{staff.department}</div>
                              <div className="text-[11px] text-[#64748B]">{staff.designation}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-[#334155]">{staff.shift.split("(")[0]}</div>
                              <div className="text-[10.5px] font-mono text-[#94A3B8]">{staff.shift.split("(")[1]?.replace(")", "") || ""}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                                  empStatus === "Active"
                                    ? "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"
                                    : empStatus === "Notice Period"
                                      ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                                      : empStatus === "Resigned"
                                        ? "bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]"
                                        : empStatus === "Terminated"
                                          ? "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]"
                                          : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
                                }`}
                              >
                                {empStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                  staff.dutyStatus === "On Duty"
                                    ? "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"
                                    : staff.dutyStatus === "In Surgery"
                                      ? "bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]"
                                      : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    staff.dutyStatus === "On Duty"
                                      ? "bg-[#16A34A]"
                                      : staff.dutyStatus === "In Surgery"
                                        ? "bg-[#7C3AED]"
                                        : "bg-[#94A3B8]"
                                  }`}
                                ></span>
                                {staff.dutyStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-mono font-semibold text-[#0F172A]">{staff.licenseNumber}</div>
                              <div className="text-[10.5px] text-[#64748B]">Exp: {staff.licenseExpiry}</div>
                            </td>
                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Duty punch button - disabled if inactive */}
                                <button
                                  disabled={isInactive}
                                  onClick={() => handleToggleDuty(staff.id, staff.dutyStatus)}
                                  className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                                    isInactive
                                      ? "text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed"
                                      : staff.dutyStatus === "On Duty"
                                        ? "text-[#64748B] bg-white border-[#DDE2EC] hover:bg-slate-50"
                                        : "text-[#15803D] bg-[#DCFCE7] border-[#BBF7D0] hover:bg-[#BBF7D0]"
                                  }`}
                                  title={isInactive ? "Cannot punch duty for inactive/exited staff" : "Toggle duty status"}
                                >
                                  {staff.dutyStatus === "On Duty" ? "Check Out" : "Check In"}
                                </button>

                                {/* Lifecycle Button */}
                                <button
                                  onClick={() => setLifecycleStaff(staff)}
                                  className="px-2 py-1 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] rounded border border-[#DDD6FE] transition-colors cursor-pointer flex items-center gap-1"
                                  title="Manage Employee Lifecycle (Promotions, Transfers, Salary, Exit Clearance)"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                  Lifecycle
                                </button>

                                {staff.category === "Doctor" && (
                                  <button
                                    onClick={() => {
                                      setSelectedDoctorForSchedule(staff.id)
                                      setActiveTab("timetables")
                                    }}
                                    className="px-2 py-1 text-xs font-semibold text-[#1B4FD8] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded border border-[#BFDBFE] transition-colors cursor-pointer flex items-center gap-1"
                                    title="View Doctor Timetable & Schedule"
                                  >
                                    <Calendar className="w-3 h-3" />
                                    Timetable
                                  </button>
                                )}

                                <button
                                  onClick={() => setPayslipStaff(staff)}
                                  className="px-2 py-1 text-xs font-medium text-[#475569] hover:text-[#1B4FD8] hover:bg-[#EFF6FF] rounded transition-colors cursor-pointer"
                                >
                                  Payslip
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingStaff(staff)
                                    setIsAddOpen(true)
                                  }}
                                  className="p-1 text-xs text-[#64748B] hover:text-[#1B4FD8] hover:bg-[#EFF6FF] rounded transition-colors cursor-pointer"
                                  title="Edit staff member"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
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
            ) : (
              /* Grid View */
              <div className="grid grid-cols-4 gap-4">
                {filteredStaff.map((staff) => {
                  const empStatus = staff.employmentStatus || (staff.isActive ? "Active" : "Inactive")
                  const isInactive = empStatus === "Inactive" || empStatus === "Resigned" || empStatus === "Terminated"

                  return (
                    <div
                      key={staff.id}
                      onClick={() => setViewingStaff(staff)}
                      className={`bg-white border rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer ${
                        isInactive ? "border-slate-300 opacity-80" : "border-[#DDE2EC] hover:border-[#1B4FD8]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                            {staff.category}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              empStatus === "Active"
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : "bg-[#FEF3C7] text-[#B45309]"
                            }`}
                          >
                            {empStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] text-[#1B4FD8] font-bold text-xs flex items-center justify-center border border-[#BFDBFE]">
                            {staff.avatarInitials}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[#0F172A] leading-tight">{staff.name}</div>
                            <div className="text-[11px] text-[#64748B]">{staff.department}</div>
                          </div>
                        </div>

                        <div className="text-[11px] text-[#64748B] space-y-1 py-2 border-t border-[#F1F5F9]">
                          <div>Role: <span className="font-medium text-[#0F172A]">{staff.designation}</span></div>
                          <div>Shift: <span className="font-mono text-[#334155]">{staff.shift.split("(")[0]}</span></div>
                          <div>License: <span className="font-mono font-medium text-[#1B4FD8]">{staff.licenseNumber}</span></div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setLifecycleStaff(staff)}
                          className="text-[11px] font-semibold text-[#7C3AED] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          Lifecycle
                        </button>
                        <div className="flex items-center gap-1.5">
                          {staff.category === "Doctor" && (
                            <button
                              onClick={() => {
                                setSelectedDoctorForSchedule(staff.id)
                                setActiveTab("timetables")
                              }}
                              className="px-2 py-1 text-xs font-semibold text-[#1B4FD8] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded border border-[#BFDBFE] cursor-pointer flex items-center gap-1"
                              title="View Timetable"
                            >
                              <Calendar className="w-3 h-3" />
                              Schedule
                            </button>
                          )}
                          <button
                            onClick={() => setViewingStaff(staff)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#1B4FD8] bg-[#EFF6FF] rounded border border-[#BFDBFE] cursor-pointer"
                          >
                            Profile →
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: DUTY SHIFTS & ATTENDANCE ROSTER ENGINE */}
        {/* ==================================================================== */}
        {activeTab === "shifts" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Shift Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Present Today</span>
                  <div className="w-7 h-7 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#15803D] mt-1.5">
                  {attendanceList.filter((a) => a.status === "Present" || a.status === "Late").length}
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Checked in & on duty</div>
              </div>

              <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Late Arrivals</span>
                  <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#B45309] mt-1.5">
                  {attendanceList.filter((a) => a.status === "Late" || (a.lateMinutes || 0) > 0).length}
                </div>
                <div className="text-[11px] text-[#B45309] font-medium mt-0.5">Grace period exceeded</div>
              </div>

              <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Overtime Hours</span>
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#1B4FD8] flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#1B4FD8] mt-1.5">
                  {attendanceList.reduce((acc, a) => acc + (a.overtimeHours || 0), 0).toFixed(1)} hrs
                </div>
                <div className="text-[11px] text-[#1B4FD8] font-medium mt-0.5">Calculated for payroll</div>
              </div>

              <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold uppercase tracking-wider text-[10.5px]">Missed / Absent</span>
                  <div className="w-7 h-7 rounded-lg bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#DC2626] mt-1.5">
                  {attendanceList.filter((a) => a.status === "Missed Punch" || a.status === "Absent").length}
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Requires audit correction</div>
              </div>
            </div>

            {/* Attendance Filter & Action Bar */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-[#475569] font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Date:</span>
                  <input
                    type="date"
                    value={attendanceDateFilter}
                    onChange={(e) => setAttendanceDateFilter(e.target.value)}
                    className="border border-[#DDE2EC] rounded-lg px-2 py-1 text-xs bg-white text-[#0F172A] focus:outline-none focus:border-[#1B4FD8]"
                  />
                  {attendanceDateFilter && (
                    <button
                      onClick={() => setAttendanceDateFilter("")}
                      className="text-xs text-[#1B4FD8] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="h-4 w-px bg-slate-200 mx-1"></div>

                {/* Quick Filters */}
                <div className="flex items-center gap-1">
                  {(["All", "Late", "Absent", "Overtime", "Missed Punch", "On Leave"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAttendanceQuickFilter(filter)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        attendanceQuickFilter === filter
                          ? "bg-[#1B4FD8] text-white"
                          : "text-[#64748B] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportAttendanceCsv}
                  className="px-3 py-1.5 text-xs font-semibold text-[#475569] bg-white hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#64748B]" /> Export CSV
                </button>

                <button
                  onClick={() => {
                    setAttendanceRecordToEdit(null)
                    setIsAttendanceModalOpen(true)
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1B4FD8] hover:bg-[#1541B8] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Mark Attendance Manually
                </button>
              </div>
            </div>

            {/* Attendance Roster Table */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-2xs overflow-hidden">
              <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#DDE2EC] flex items-center justify-between text-xs font-semibold text-[#475569]">
                <span>Hospital Shift Attendance & Biometric Logs</span>
                <span>{filteredAttendance.length} Records</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#DDE2EC] text-[#475569] font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Shift & Timings</th>
                    <th className="py-3 px-4">Actual Punches</th>
                    <th className="py-3 px-4">Worked / Overtime</th>
                    <th className="py-3 px-4">Lateness / Early Exit</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">HR Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#94A3B8]">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-[#CBD5E1]" />
                        <p className="font-bold text-sm text-[#334155]">No Shift Attendance Records Found</p>
                        <p className="text-xs text-[#64748B] mt-1">
                          Select another date or click "+ Mark Attendance Manually" to create an entry.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0F172A]">{rec.staffName}</div>
                          <div className="text-[11px] font-mono text-[#64748B]">{rec.staffId} · {rec.date}</div>
                        </td>
                        <td className="py-3 px-4 text-[#64748B]">{rec.department}</td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-[#334155]">{rec.shift.split("(")[0]}</div>
                          <div className="text-[10.5px] font-mono text-[#94A3B8]">
                            {rec.shiftStartTime && rec.shiftEndTime ? `${rec.shiftStartTime} - ${rec.shiftEndTime}` : "Standard"}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-medium text-[#0F172A]">In: {rec.checkIn || "--"}</div>
                          <div className="font-mono text-[11px] text-[#64748B]">Out: {rec.checkOut || "--"}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#0F172A]">{rec.workHours ? `${rec.workHours.toFixed(1)} hrs` : "--"}</div>
                          {(rec.overtimeHours || 0) > 0 && (
                            <span className="text-[10px] font-bold text-[#1B4FD8] bg-[#EFF6FF] px-1.5 py-0.2 rounded border border-[#BFDBFE]">
                              +{rec.overtimeHours}h OT
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {(rec.lateMinutes || 0) > 0 && (
                            <div className="text-[10.5px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.2 rounded border border-[#FDE68A] inline-block">
                              Late: {rec.lateMinutes}m
                            </div>
                          )}
                          {(rec.earlyExitMinutes || 0) > 0 && (
                            <div className="text-[10.5px] font-medium text-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.2 rounded border border-[#FECACA] inline-block mt-0.5">
                              Early: {rec.earlyExitMinutes}m
                            </div>
                          )}
                          {(!rec.lateMinutes || rec.lateMinutes === 0) && (!rec.earlyExitMinutes || rec.earlyExitMinutes === 0) && (
                            <span className="text-[11px] text-[#64748B]">On Time</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                              rec.status === "Present"
                                ? "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"
                                : rec.status === "Late"
                                  ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                                  : rec.status === "On Leave"
                                    ? "bg-[#EFF6FF] text-[#1B4FD8] border border-[#BFDBFE]"
                                    : rec.status === "Missed Punch"
                                      ? "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                                      : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
                            }`}
                          >
                            {rec.status}
                          </span>
                          {rec.isCorrected && (
                            <span className="ml-1 text-[9.5px] text-[#7C3AED] bg-[#F5F3FF] px-1 py-0.2 rounded font-bold border border-[#DDD6FE]" title="Corrected via Audit Log">
                              Edited
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setAttendanceRecordToEdit(rec)
                                setIsAttendanceModalOpen(true)
                              }}
                              className="px-2 py-1 text-xs font-semibold text-[#1B4FD8] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded border border-[#BFDBFE] cursor-pointer flex items-center gap-1"
                              title="Audit Correct Missed Punch or Timing"
                            >
                              <Edit2 className="w-3 h-3" />
                              Correct
                            </button>
                            <button
                              onClick={() => {
                                const staff = staffList.find((s) => s.id === rec.staffId)
                                if (staff) handleToggleDuty(staff.id, staff.dutyStatus)
                              }}
                              className="px-2 py-1 text-xs font-semibold text-[#475569] bg-white hover:bg-slate-50 rounded border border-[#DDE2EC] cursor-pointer"
                            >
                              Toggle
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: DOCTOR TIMETABLES & SCHEDULING (CALENDAR ON SELECTION) */}
        {/* ==================================================================== */}
        {activeTab === "timetables" && (
          <div className="h-[calc(100vh-140px)] min-h-[640px] flex flex-col -m-6 animate-in fade-in duration-150">
            <DoctorScheduling
              initialDoctorId={selectedDoctorForSchedule}
              onSelectDoctor={(docId) => setSelectedDoctorForSchedule(docId)}
              embedded={true}
            />
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: LEAVE APPROVALS */}
        {/* ==================================================================== */}
        {activeTab === "leaves" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A]">Staff Leave Applications & Approval Workflow</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Review submitted requests, verify ward shift coverage, and record quota deduction.
                </p>
              </div>
              <div className="flex gap-1.5">
                {(["All", "Pending", "Approved"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLeaveFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      leaveFilter === filter
                        ? "bg-[#1B4FD8] text-white"
                        : "text-[#64748B] hover:bg-[#F1F5F9]"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {leavesList.filter((l) => leaveFilter === "All" || l.status === leaveFilter).length === 0 ? (
                <div className="bg-white border border-[#DDE2EC] rounded-xl p-12 text-center text-[#94A3B8]">
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-[#CBD5E1]" />
                  <p className="font-bold text-sm text-[#334155]">No Leave Requests Found</p>
                  <p className="text-xs text-[#64748B] mt-1">There are currently no leave applications in this queue.</p>
                </div>
              ) : (
                leavesList
                  .filter((l) => leaveFilter === "All" || l.status === leaveFilter)
                  .map((leave) => (
                  <div
                    key={leave.id}
                    className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0F172A]">{leave.staffName}</span>
                        <span className="text-xs text-[#64748B]">({leave.department})</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            leave.status === "Pending"
                              ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                              : leave.status === "Approved"
                                ? "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"
                                : "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]"
                          }`}
                        >
                          {leave.status}
                        </span>
                      </div>
                      <div className="text-xs text-[#475569] mt-1">
                        <strong>{leave.leaveType}</strong> · Duration:{" "}
                        <span className="font-mono font-semibold">{leave.startDate} to {leave.endDate}</span> ({leave.days} day{leave.days > 1 ? "s" : ""})
                      </div>
                      <div className="text-xs text-[#64748B] mt-1 bg-[#F8FAFC] p-2 rounded-lg border border-[#F1F5F9]">
                        Reason: {leave.reason}
                      </div>
                    </div>

                    {leave.status === "Pending" && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleReviewLeave(leave.id, "Rejected")}
                          className="px-3 py-1.5 text-xs font-semibold text-[#475569] bg-white border border-[#DDE2EC] hover:bg-[#F8FAFC] rounded-lg cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleReviewLeave(leave.id, "Approved")}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve & Deduct
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: ATTENDANCE & LEAVE-BASED PAYROLL WORKFLOW */}
        {/* ==================================================================== */}
        {activeTab === "payroll" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Workflow Progress Stepper */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F5F9]">
                <div>
                  <h3 className="font-bold text-xs text-[#0F172A] uppercase tracking-wider">
                    {payrollMonth} {payrollYear} Hospital Payroll Cycle
                  </h3>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Calculated strictly against actual attendance days, approved paid leaves, unpaid absences, and overtime hours.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B]">Current Stage:</span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      payrollRunStatus === "Paid"
                        ? "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"
                        : payrollRunStatus === "Approved"
                          ? "bg-[#EFF6FF] text-[#1B4FD8] border border-[#BFDBFE]"
                          : payrollRunStatus === "Reviewed"
                            ? "bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]"
                            : payrollRunStatus === "Calculated"
                              ? "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                              : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
                    }`}
                  >
                    {payrollRunStatus}
                  </span>
                </div>
              </div>

              {/* 4-Step Progress Indicator */}
              <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
                {[
                  { step: "1", title: "Calculated", desc: "Attendance & OT Synced" },
                  { step: "2", title: "HR Reviewed", desc: "Deductions Verified" },
                  { step: "3", title: "Approved", desc: "Finance Clearance" },
                  { step: "4", title: "Paid", desc: "Bank Transfers Executed" },
                ].map((s, idx) => {
                  const stageOrder = ["Draft", "Calculated", "Reviewed", "Approved", "Paid"]
                  const currentIdx = stageOrder.indexOf(payrollRunStatus)
                  const thisStepIdx = idx + 1
                  const isDone = currentIdx >= thisStepIdx
                  const isCurrent = currentIdx === thisStepIdx

                  return (
                    <div
                      key={s.step}
                      className={`p-2.5 rounded-lg border transition-all ${
                        isDone
                          ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]"
                          : isCurrent
                            ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF] ring-1 ring-[#1B4FD8]"
                            : "bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          isDone ? "bg-[#10B981] text-white" : isCurrent ? "bg-[#1B4FD8] text-white" : "bg-slate-200 text-slate-600"
                        }`}>
                          {isDone ? "✓" : s.step}
                        </span>
                        <span>{s.title}</span>
                      </div>
                      <div className="text-[10px] mt-0.5 text-slate-500">{s.desc}</div>
                    </div>
                  )
                })}
              </div>

              {/* Action Buttons based on workflow stage */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#F1F5F9]">
                <div className="text-xs text-[#64748B]">
                  {payrollList.length} employees included in this payroll run. Controlled revisions maintain audit versioning.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPayrollPolicyOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                    title="Configure PF, TDS, Overtime & Daily Pay rules"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                    Payroll Policy Rules
                  </button>

                  <button
                    disabled={isProcessingPayroll}
                    onClick={handleCalculatePayroll}
                    className="px-3 py-1.5 text-xs font-semibold text-[#1B4FD8] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessingPayroll ? "animate-spin" : ""}`} />
                    {payrollRunStatus === "Draft" ? "Calculate Payroll" : "Recalculate Run"}
                  </button>

                  {payrollRunStatus === "Calculated" && (
                    <button
                      disabled={isProcessingPayroll}
                      onClick={handleReviewPayroll}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#7E22CE] hover:bg-[#6B21A8] rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Review & Verify Payroll
                    </button>
                  )}

                  {payrollRunStatus === "Reviewed" && (
                    <button
                      disabled={isProcessingPayroll}
                      onClick={handleApprovePayroll}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#1B4FD8] hover:bg-[#1541B8] rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Final Approve Payroll
                    </button>
                  )}

                  {payrollRunStatus === "Approved" && (
                    <button
                      disabled={isProcessingPayroll}
                      onClick={handleDisbursePayroll}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#15803D] hover:bg-[#166534] rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Disburse & Payout All
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-[#DDE2EC] shadow-2xs">
                <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  Total Gross Pay
                </div>
                <div className="text-2xl font-bold text-[#0F172A] mt-1">
                  ₹{payrollList.reduce((acc, p) => acc + p.gross, 0).toLocaleString()}
                </div>
                <div className="text-xs text-[#94A3B8] mt-0.5">Base + HRA + Allowances</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#DDE2EC] shadow-2xs">
                <div className="text-[11px] font-bold text-[#1B4FD8] uppercase tracking-wider">
                  Overtime Pay Batched
                </div>
                <div className="text-2xl font-bold text-[#1B4FD8] mt-1">
                  ₹{payrollList.reduce((acc, p) => acc + (p.overtimeAmount || 0), 0).toLocaleString()}
                </div>
                <div className="text-xs text-[#94A3B8] mt-0.5">
                  {payrollList.reduce((acc, p) => acc + (p.overtimeHours || 0), 0).toFixed(1)} Total OT Hours
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#DDE2EC] shadow-2xs">
                <div className="text-[11px] font-bold text-[#B91C1C] uppercase tracking-wider">
                  Total Deductions
                </div>
                <div className="text-2xl font-bold text-[#DC2626] mt-1">
                  ₹{payrollList.reduce((acc, p) => acc + p.totalDeductions, 0).toLocaleString()}
                </div>
                <div className="text-xs text-[#94A3B8] mt-0.5">PF, TDS & Unpaid Leave Cuts</div>
              </div>

              <div className="bg-[#1B4FD8] text-white rounded-xl p-4 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider">
                    Net Payout
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">
                    ₹{payrollList.reduce((acc, p) => acc + p.netPay, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-200 mt-0.5">Direct Bank Transfer</div>
                </div>
                <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                  ₹
                </span>
              </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-2xs overflow-hidden">
              <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#DDE2EC] flex justify-between items-center text-xs">
                <h3 className="font-bold text-[#475569] uppercase tracking-wider">
                  Employee Salary Register & Attendance Deductions
                </h3>
                <span className="text-[#64748B]">{payrollList.length} Slips Generated</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#DDE2EC] text-[#475569] font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Department & Role</th>
                    <th className="py-3 px-4 text-center">Attendance Summary</th>
                    <th className="py-3 px-4 text-right">Overtime</th>
                    <th className="py-3 px-4 text-right">Gross (₹)</th>
                    <th className="py-3 px-4 text-right text-[#DC2626]">Deductions (₹)</th>
                    <th className="py-3 px-4 text-right font-bold text-[#0F172A]">Net Pay (₹)</th>
                    <th className="py-3 px-4 text-center">Status / Rev</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {payrollList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#94A3B8]">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-[#CBD5E1]" />
                        <p className="font-bold text-sm text-[#334155]">No Payroll Calculated Yet for {payrollMonth} {payrollYear}</p>
                        <p className="text-xs text-[#64748B] mt-1">Click "Calculate Payroll" to generate salary sheets based on current month attendance records.</p>
                      </td>
                    </tr>
                  ) : (
                    payrollList.map((pay) => (
                      <tr key={pay.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#0F172A]">{pay.staffName}</div>
                          <div className="text-[11px] font-mono text-[#64748B]">{pay.staffId}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-[#334155] font-medium">{pay.department}</div>
                          <div className="text-[11px] text-[#64748B]">{pay.designation}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-[11px]">
                            <span className="text-[#15803D] font-bold" title="Present days">
                              {pay.attendanceSummary?.presentDays || 0}P
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-[#B45309] font-medium" title="Unpaid leave days">
                              {pay.unpaidLeaveDays || 0}UL
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-[#DC2626] font-medium" title="Absent days">
                              {pay.absentDays || 0}A
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(pay.overtimeHours || 0) > 0 ? (
                            <div>
                              <div className="font-semibold text-[#1B4FD8]">₹{(pay.overtimeAmount || 0).toLocaleString()}</div>
                              <div className="text-[10px] text-[#64748B]">{pay.overtimeHours} hrs</div>
                            </div>
                          ) : (
                            <span className="text-[#94A3B8]">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium">₹{pay.gross.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono text-[#DC2626]">
                          ₹{pay.totalDeductions.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                          ₹{pay.netPay.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pay.status === "Paid"
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : pay.status === "Approved"
                                  ? "bg-[#EFF6FF] text-[#1B4FD8]"
                                  : "bg-[#FEF3C7] text-[#B45309]"
                            }`}
                          >
                            {pay.status}
                          </span>
                          {(pay.revisionNumber || 0) > 0 && (
                            <div className="text-[9.5px] font-bold text-[#7C3AED] mt-0.5">
                              Rev #{pay.revisionNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPayrollRevisionItem(pay)}
                              className="px-2 py-1 text-xs font-semibold text-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE] rounded border border-[#DDD6FE] cursor-pointer"
                              title="Controlled Revision with Audit Justification"
                            >
                              Revise
                            </button>
                            <button
                              onClick={() => {
                                const staff = staffList.find((s) => s.id === pay.staffId)
                                if (staff) setPayslipStaff(staff)
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-[#1B4FD8] bg-[#EFF6FF] hover:bg-[#DBEAFE] rounded border border-[#BFDBFE] cursor-pointer"
                            >
                              Slip
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 6: LICENSES & COMPLIANCE */}
        {/* ==================================================================== */}
        {activeTab === "compliance" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 gap-4">
              {/* Credentials List */}
              <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1B4FD8]" />
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Medical Licensure & Regulatory Badges
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-[#1B4FD8] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE]">
                    {credentialsList.length} Credentials
                  </span>
                </div>

                <div className="divide-y divide-[#F1F5F9]">
                  {credentialsList.length === 0 ? (
                    <div className="py-12 text-center text-[#94A3B8]">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-[#CBD5E1]" />
                      <p className="font-bold text-sm text-[#334155]">No Clinical Credentials Registered</p>
                      <p className="text-xs text-[#64748B] mt-1">State medical council, nursing council, and clinical practice licenses will appear here automatically when staff are onboarded.</p>
                    </div>
                  ) : (
                    credentialsList.map((cred) => (
                      <div key={cred.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                            <span>{cred.staffName}</span>
                            {cred.status === "Expiring Soon" && (
                              <span className="text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.2 rounded border border-[#FDE68A]">
                                Renewal Due
                              </span>
                            )}
                            {cred.status === "Expired" && (
                              <span className="text-[10px] font-bold text-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.2 rounded border border-[#FECACA]">
                                Expired - Barred
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            {cred.title} · <span className="font-mono text-[#334155]">{cred.licenseNo}</span> · {cred.authority}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[11px] font-mono text-[#64748B]">Expires: {cred.validUntil}</div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.2 rounded-full inline-block mt-0.5 ${
                                cred.status === "Valid"
                                  ? "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"
                                  : cred.status === "Expired"
                                    ? "bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]"
                                    : "bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]"
                              }`}
                            >
                              {cred.status}
                            </span>
                          </div>

                          {(cred.status === "Expiring Soon" || cred.status === "Expired") && (
                            <button
                              onClick={() => {
                                setRenewingCredential(cred)
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-[#15803D] bg-[#DCFCE7] hover:bg-[#BBF7D0] border border-[#BBF7D0] rounded-lg cursor-pointer"
                            >
                              Renew
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Department Headcount Breakdown */}
              <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#F1F5F9]">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#1B4FD8]" />
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                      Department Staff Distribution
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-[#64748B]">{departments.length - 1} Units</span>
                </div>

                <div className="space-y-3.5">
                  {departments
                    .filter((d) => d !== "All")
                    .map((dept) => {
                      const count = staffList.filter((s) => s.department === dept).length
                      const pct = staffList.length > 0 ? Math.round((count / staffList.length) * 100) : 0
                      return (
                        <div key={dept}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-[#334155]">{dept}</span>
                            <span className="font-bold text-[#0F172A]">
                              {count} staff ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#1B4FD8] h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 7: CENTRALIZED AUDIT TRAIL */}
        {/* ==================================================================== */}
        {activeTab === "audit" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white border border-[#DDE2EC] rounded-xl p-4 shadow-2xs flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1B4FD8]" />
                  Centralized Audit Trail & Governance Log
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Tamper-evident logs of all HR actions, salary revisions, attendance corrections, and lifecycle transfers.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg px-2.5 py-1">
                  <Search size={13} className="text-[#94A3B8]" />
                  <input
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search action, actor, reason..."
                    className="bg-transparent text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none w-44"
                  />
                </div>

                <select
                  value={auditModuleFilter}
                  onChange={(e) => setAuditModuleFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-[#DDE2EC] rounded-lg bg-white text-[#334155] focus:outline-none focus:border-[#1B4FD8] font-medium"
                >
                  <option value="All">All Modules</option>
                  <option value="Attendance">Attendance</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Employees">Employees</option>
                  <option value="Shifts">Shifts</option>
                  <option value="Leaves">Leaves</option>
                  <option value="Credentials">Credentials</option>
                </select>

                <button
                  onClick={loadAuditLogs}
                  className="px-2.5 py-1.5 text-xs font-semibold text-[#1B4FD8] bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingAudit ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Audit Table */}
            <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#DDE2EC] text-[#475569] font-bold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Employee / Target</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Changes (Old → New)</th>
                    <th className="py-3 px-4">Audit Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                        <History className="w-8 h-8 mx-auto mb-2 text-[#CBD5E1]" />
                        <p className="font-bold text-sm text-[#334155]">No Audit Logs Recorded</p>
                        <p className="text-xs text-[#64748B] mt-1">Actions such as attendance corrections and salary revisions will be logged here.</p>
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                          {new Date(log.timestamp || log.createdAt || Date.now()).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium text-[#0F172A] whitespace-nowrap">{log.actor}</td>
                        <td className="py-3 px-4 font-medium text-[#0F172A]">
                          {log.employeeName || log.staffId || "--"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                            {log.module || "HRMS"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-[#1B4FD8]">
                          {log.action}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-[11px] text-[#475569]" title={JSON.stringify(log.changes)}>
                          {typeof log.changes === "object" ? JSON.stringify(log.changes) : String(log.changes || "--")}
                        </td>
                        <td className="py-3 px-4 text-[#334155] italic text-[11px]">
                          {log.reason || "--"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── Dialog Modals ────────────────────────────────────────────────────── */}
      <AddEmployeeModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false)
          setEditingStaff(null)
        }}
        editStaff={editingStaff}
        onSuccess={() => {
          showToast(editingStaff ? "Staff record updated" : "New staff registered")
          loadData()
        }}
      />

      <EmployeeProfileModal
        isOpen={!!viewingStaff}
        staff={viewingStaff}
        isHrAdmin={true}
        onClose={() => setViewingStaff(null)}
        onEdit={(staff) => {
          setViewingStaff(null)
          setEditingStaff(staff)
          setIsAddOpen(true)
        }}
        onViewPayslip={(staff) => {
          setViewingStaff(null)
          setPayslipStaff(staff)
        }}
      />

      <PayslipModal
        isOpen={!!payslipStaff}
        staff={payslipStaff}
        onClose={() => setPayslipStaff(null)}
      />

      <RenewCredentialModal
        isOpen={!!renewingCredential}
        credential={renewingCredential}
        onClose={() => setRenewingCredential(null)}
        onSuccess={() => {
          showToast("Clinical credential renewed successfully")
          loadData()
        }}
      />

      {/* New Lifecycle Modal */}
      <EmployeeLifecycleModal
        isOpen={!!lifecycleStaff}
        staff={lifecycleStaff}
        onClose={() => setLifecycleStaff(null)}
        onSuccess={(msg) => {
          showToast(msg)
          loadData()
        }}
      />

      {/* New Attendance Modal */}
      <AttendanceModal
        isOpen={isAttendanceModalOpen}
        recordToEdit={attendanceRecordToEdit}
        staffList={staffList}
        onClose={() => {
          setIsAttendanceModalOpen(false)
          setAttendanceRecordToEdit(null)
        }}
        onSuccess={(msg) => {
          showToast(msg)
          loadData()
        }}
      />

      {/* New Payroll Revision Modal */}
      <PayrollRevisionModal
        isOpen={!!payrollRevisionItem}
        item={payrollRevisionItem}
        onClose={() => setPayrollRevisionItem(null)}
        onSuccess={(msg) => {
          showToast(msg)
          loadData()
        }}
      />

      {/* Configurable Payroll Policy Modal */}
      <PayrollPolicyModal
        isOpen={isPayrollPolicyOpen}
        onClose={() => setIsPayrollPolicyOpen(false)}
        onSuccess={(msg) => {
          showToast(msg)
          loadData()
        }}
      />
    </div>
  )
}
