import React, { useState, useEffect, useCallback } from "react";
import { Icon, type IconProps } from "./components/icons";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import PatientSearch from "./components/PatientSearch";
import PatientChart from "./components/PatientChart";
import ErPage from "./pages/ErPage";
import BedManagementPage from "./pages/BedManagementPage";
import NursingPortal from "./components/nursing/NursingPortal";
import type { Notice } from "./types";
import Laboratory from "./components/Laboratory";
import Pharmacy from "./components/Pharmacy";
import Billing from "./components/Billing";
import Inpatient from "./components/Inpatient";
import Surgery from "./components/Surgery";
import Appointments from "./components/Appointments";
import Radiology from "./components/Radiology";
import ICU from "./components/ICU";
import Analytics from "./components/Analytics";
import Discharge from "./components/Discharge";
import Triage from "./components/Triage";
import Insurance from "./components/Insurance";
import OrderDrawer from "./components/OrderDrawer";
import CommandPalette from "./components/CommandPalette";
import Registration from "./components/Registration";
import NurseStation from "./components/NurseStation";
import OPWorkflow from "./components/OPWorkflow";
import SmartOCR from "./components/SmartOCR";
import DpiOcrPortal from "./components/DpiOcrPortal";
import SymptomAI from "./components/SymptomAI";
import ClinicalRAG from "./components/ClinicalRAG";
import ClinicalSummaries from "./components/ClinicalSummaries";
import BulkAI from "./components/BulkAI";
import NLFiltering from "./components/NLFiltering";
import IntelligenceHub from "./components/IntelligenceHub";
import QueueManagement from "./components/QueueManagement";
import OPManagement from "./components/OPManagement";
import OPDProcedures from "./components/OPDProcedures";
import DoctorWorkflow from "./components/DoctorWorkflow";
import DoctorPortal from "./components/doctor/DoctorPortal";
import DoctorScheduling from "./components/DoctorScheduling";
import PatientExperience from "./components/PatientExperience";
import HRMS from "./components/HRMS";
import Employees from "./components/Employees";
import Admissions from "./components/Admissions";
import Readmission from "./components/Readmission";
import PaymentCollection from "./components/PaymentCollection";
import RevenueReports from "./components/RevenueReports";
import Administration from "./components/Administration";
import { AuditDatabase } from "./services/auditDb";
import { ALL_SYSTEM_MODULES, RoleDatabase } from "./services/roleDb";
import { DoctorAccount, DoctorPortalDatabase, resolveDoctorAccount } from "./services/doctorPortalDb";
import { LabOrderDatabase } from "./services/labOrdersDb";
import { PharmacyDatabase, isAwaitingVerification } from "./services/pharmacyDb";

type Module =
  | "dashboard" | "patients" | "appointments" | "emergency"
  | "clinical" | "inpatient" | "nursing" | "laboratory"
  | "radiology" | "pharmacy"
  | "pharmacy_dispensing" | "pharmacy_rx" | "pharmacy_ocr" | "pharmacy_returns" | "pharmacy_supplier_returns"
  | "pharmacy_medicine" | "pharmacy_category" | "pharmacy_suppliers"
  | "pharmacy_po" | "pharmacy_grn" | "pharmacy_ledger"
  | "pharmacy_transfers" | "pharmacy_expiry" | "pharmacy_analytics"
  | "pharmacy_notifications" | "pharmacy_users" | "pharmacy_audit" | "pharmacy_settings"
  | "surgery" | "billing"
  | "icu" | "discharge" | "triage" | "insurance" | "analytics"
  | "reports" | "admin"
  | "chart" | "register"
  | "outpatient" | "queue" | "op_management" | "op_registration" | "op_workflow"
  | "op_nurse" | "opd_procedures"
  | "doctor_workflow" | "doctor_portal" | "scheduling" | "lab_billing"
  | "admissions" | "readmission"
  | "payments" | "revenue_reports"
  | "hrms" | "employees" | "patient_exp"
  | "intelligence" | "ocr" | "dpi_ocr" | "symptom_ai" | "clinical_rag" | "clinical_summaries" | "bulk_ai" | "nl_filtering"
  | "beds";

interface NavItem {
  key: Module;
  label: string;
  Icon: React.FC<IconProps>;
  badge?: number;
  children?: { key: Module; label: string; group?: string }[];
}

const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", Icon: Icon.Dashboard },
  { key: "doctor_portal", label: "Doctor Workspace", Icon: Icon.Stethoscope },
  // The front desk, in the order the desk actually works: find or register the
  // patient, book their doctor, take payment -- with OP Management alongside so
  // reception can see where a patient has got to without leaving their own area.
  {
    key: "patients", label: "Reception", Icon: Icon.Patients,
    children: [
      { key: "patients", label: "Patient Search" },
      { key: "register", label: "Registration" },
      { key: "appointments", label: "Appointments" },
    ]
  },
  // The OP department floor: who has arrived, whose vitals are outstanding, and
  // what each doctor's clinic looks like today.
  {
    key: "outpatient", label: "OP Department", Icon: Icon.Stethoscope,
    children: [
      { key: "op_management", label: "OP Management" },
      { key: "queue", label: "Live Queue Board" },
      { key: "op_nurse", label: "Nurse Station" },
      { key: "opd_procedures", label: "OPD Minor Procedures" },
    ]
  },
  {
    key: "clinical", label: "Clinical", Icon: Icon.Clinical,
    children: [
      { key: "chart", label: "Encounters" },
    ]
  },
  {
    key: "emergency", label: "Emergency", Icon: Icon.Emergency, badge: 8,
    children: [
      { key: "emergency", label: "ED Track Board" },
      { key: "triage", label: "Triage" },
    ]
  },
  {
    key: "inpatient", label: "Inpatient", Icon: Icon.Bed,
    children: [
      { key: "inpatient", label: "Bed Board" },
      { key: "beds", label: "Bed Management" },
      { key: "admissions", label: "Admissions" },
      { key: "readmission", label: "Readmission" },
      { key: "discharge", label: "Discharge" },
    ]
  },
  { key: "icu", label: "ICU", Icon: Icon.Heart },
  { key: "nursing", label: "Nursing", Icon: Icon.Nursing },
  { key: "laboratory", label: "Laboratory", Icon: Icon.Lab },
  { key: "radiology", label: "Radiology", Icon: Icon.Radiology },
  {
    key: "pharmacy", label: "Pharmacy", Icon: Icon.Pharmacy,
    children: [
      { key: "pharmacy", label: "Dashboard" },
      { key: "pharmacy_dispensing", label: "Dispensing & Billing", group: "Sales & Dispensing" },
      { key: "pharmacy_rx", label: "Prescription Queue", group: "Sales & Dispensing" },
      { key: "pharmacy_returns", label: "Sales Returns", group: "Sales & Dispensing" },
      { key: "pharmacy_medicine", label: "Medicine Master", group: "Catalog" },
      { key: "pharmacy_category", label: "Categories", group: "Inventory Management" },
      { key: "pharmacy_suppliers", label: "Suppliers", group: "Inventory Management" },
      { key: "pharmacy_supplier_returns", label: "Supplier Returns", group: "Inventory Management" },
      { key: "pharmacy_po", label: "Purchase Orders", group: "Procurement & Receiving" },
      { key: "pharmacy_grn", label: "Scan Invoice (GRN)", group: "Procurement" },
      { key: "pharmacy_ledger", label: "Inventory Ledger", group: "Inventory" },
      { key: "pharmacy_expiry", label: "Expiry Management", group: "Inventory" },
      { key: "pharmacy_analytics", label: "Analytics & Reports", group: "Reporting" },
      { key: "pharmacy_notifications", label: "Notifications", group: "Administration" },
      { key: "pharmacy_audit", label: "Audit Log", group: "Administration" },
    ]
  },
  { key: "surgery", label: "Surgery", Icon: Icon.Surgery },
  {
    key: "billing", label: "Billing", Icon: Icon.Billing,
    children: [
      { key: "billing", label: "Invoices" },
      { key: "payments", label: "Payment History" },
    ]
  },
  { key: "insurance", label: "Insurance", Icon: Icon.Insurance },
  {
    key: "hrms", label: "HR & Staff", Icon: Icon.User,
    children: [
      { key: "hrms", label: "HRMS" },
      { key: "employees", label: "Employees" },
    ]
  },
  { key: "scheduling", label: "Doctor Scheduling", Icon: Icon.Calendar },
  {
    key: "intelligence", label: "Hosp AI", Icon: Icon.FlaskConical,
    children: [
      { key: "dpi_ocr", label: "Keppler OCR" },
      { key: "symptom_ai", label: "Symptom AI" },
      { key: "clinical_summaries", label: "Clinical Summaries" },
      { key: "bulk_ai", label: "Bulk Patient AI" },
      { key: "nl_filtering", label: "NL Patient Filtering" },
    ]
  },
  {
    key: "reports", label: "Reports", Icon: Icon.Reports,
    children: [
      { key: "reports", label: "General Reports" },
      { key: "revenue_reports", label: "Revenue Reports" },
    ]
  },
  { key: "analytics", label: "Analytics", Icon: Icon.Analytics },
  { key: "admin", label: "Administration", Icon: Icon.Admin },
];

// Breadcrumb label for a module. NAV already carries a proper label for every
// entry -- including all 18 pharmacy screens -- so the trail is read from there
// instead of a ternary chain that had to be extended by hand and fell through to
// the raw module key ("Pharmacy_rx") for anything nobody had added yet.
const BREADCRUMB_OVERRIDES: Record<string, string> = {
  chart: "Patient Chart",
  register: "Registration",
  discharge: "Discharge Workflow",
  op_management: "OP Management",
  op_workflow: "OP Clinical Journey",
  doctor_workflow: "Doctor Workspace",
  doctor_portal: "Doctor Workspace",
  patient_exp: "Patient Experience",
  clinical_rag: "Clinical RAG",
};

function moduleTrail(module: string): string[] {
  const override = BREADCRUMB_OVERRIDES[module];
  if (override) return [override];

  for (const item of NAV) {
    if (item.key === module && !item.children) return [item.label];
    const child = item.children?.find(c => c.key === module);
    if (child) {
      // A module's own landing page repeats the section name otherwise.
      return child.key === item.key ? [item.label] : [item.label, child.label];
    }
    if (item.key === module) return [item.label];
  }
  return [module];
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-[#DDE2EC] rounded shadow-xl z-50">
      <div className="px-3.5 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-gray-900">Notifications</span>
        <button onClick={onClose} className="text-[11px] text-[#1B4FD8] font-medium">Mark all read</button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {[
          { type: "critical", icon: "⚠", title: "Critical lab result", body: "Potassium 6.2 — John Smith", time: "2m ago", read: false },
          { type: "warning", icon: "⚠", title: "ED capacity alert", body: "8 patients waiting > 30 min", time: "8m ago", read: false },
          { type: "info", icon: "🧪", title: "Lab results ready", body: "CBC results for Mary Jones", time: "15m ago", read: false },
          { type: "info", icon: "📅", title: "Appointment reminder", body: "Elena Torres arriving at 10:00", time: "30m ago", read: true },
          { type: "info", icon: "💊", title: "Pharmacy ready", body: "Metformin ready for pickup — Rm 204", time: "42m ago", read: true },
        ].map((n, i) => (
          <div key={i} className={`flex gap-3 px-3.5 py-2.5 border-b border-[#F1F5F9] last:border-0 cursor-pointer hover:bg-[#F8FAFC] ${!n.read ? "bg-[#FAFBFF]" : ""}`}>
            <span className="text-base mt-0.5">{n.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-[12px] ${!n.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>{n.title}</div>
              <div className="text-[11.5px] text-[#64748B] truncate">{n.body}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10.5px] text-[#94A3B8] whitespace-nowrap">{n.time}</span>
              {!n.read && <div className="w-2 h-2 rounded-full bg-[#1B4FD8]" />}
            </div>
          </div>
        ))}
      </div>
      <div className="px-3.5 py-2 border-t border-[#DDE2EC] text-center">
        <button className="text-[11.5px] text-[#1B4FD8] font-medium hover:underline">View all notifications</button>
      </div>
    </div>
  );
}

function NursingDashboard() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3">
        <h1 className="text-base font-semibold text-gray-900">Nursing Dashboard — 3N Medical</h1>
        <p className="text-[11.5px] text-[#64748B]">RN Jessica Carter · Shift: 07:00–19:00 · Aug 23, 2026</p>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { room: "204", patient: "John Smith", age: 41, vitals: "Due 11:00", meds: "Insulin 11:00 ▲", status: "Active", acuity: 2 },
            { room: "208", patient: "Mary Jones", age: 53, vitals: "Done ✓", meds: "None due", status: "Stable", acuity: 3 },
            { room: "212", patient: "Frank Torres", age: 55, vitals: "Due 12:00", meds: "Labetalol PRN", status: "Active", acuity: 2 },
            { room: "215", patient: "Helen Park", age: 72, vitals: "Done ✓", meds: "Done ✓", status: "Isolation", acuity: 3 },
            { room: "221", patient: "Robert Lee", age: 66, vitals: "Overdue ⚠", meds: "Overdue ⚠", status: "Concern", acuity: 2 },
            { room: "225", patient: "Sandra Hill", age: 48, vitals: "Done ✓", meds: "None due", status: "Stable", acuity: 4 },
          ].map((p, i) => (
            <div key={i} className={`bg-white border rounded p-4 ${p.status === "Concern" ? "border-[#FECACA]" : p.status === "Isolation" ? "border-[#FED7AA]" : "border-[#DDE2EC]"}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#94A3B8]">Rm {p.room}</span>
                    <span className={`text-[10.5px] font-semibold px-1.5 py-px rounded ${p.acuity === 2 ? "bg-[#FEE2E2] text-[#B91C1C]" : p.acuity === 3 ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#DCFCE7] text-[#15803D]"}`}>
                      Acuity {p.acuity}
                    </span>
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900 mt-0.5">{p.patient}</div>
                  <div className="text-[11.5px] text-[#64748B]">{p.age} yrs</div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${p.status === "Concern" ? "bg-[#FEE2E2] text-[#B91C1C]" :
                  p.status === "Isolation" ? "bg-[#FEF3C7] text-[#B45309]" :
                    p.status === "Active" ? "bg-[#EFF6FF] text-[#1D4ED8]" :
                      "bg-[#F0FDF4] text-[#15803D]"}`}>{p.status}</span>
              </div>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Vitals</span>
                  <span className={`font-medium ${p.vitals.includes("Overdue") ? "text-[#DC2626]" : p.vitals.includes("Due") ? "text-[#D97706]" : "text-[#16A34A]"}`}>{p.vitals}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Medications</span>
                  <span className={`font-medium ${p.meds.includes("Overdue") ? "text-[#DC2626]" : p.meds.includes("▲") ? "text-[#D97706]" : "text-[#16A34A]"}`}>{p.meds}</span>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button className="flex-1 text-[11px] font-medium py-1 rounded border border-[#DDE2EC] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-gray-700">Vitals</button>
                <button className="flex-1 text-[11px] font-medium py-1 rounded border border-[#DDE2EC] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-gray-700">Meds</button>
                <button className="flex-1 text-[11px] font-medium py-1 rounded border border-[#DDE2EC] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-gray-700">Notes</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaceholderModule({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3">
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        {sub && <p className="text-[11.5px] text-[#64748B]">{sub}</p>}
      </div>
      <div className="flex-1 flex items-center justify-center bg-[#F0F2F5]">
        <div className="text-center">
          <div className="text-5xl mb-4">📋</div>
          <div className="text-sm font-semibold text-gray-700 mb-1">{title}</div>
          <div className="text-[12px] text-[#64748B]">This module is available in the full implementation.</div>
        </div>
      </div>
    </div>
  );
}

interface StaffProfile {
  id: string;
  name: string;
  role: string;
  title: string;
  department: string;
  activeShift?: string;
}

const DEFAULT_STAFF: StaffProfile = {
  id: "ADM-001",
  name: "Hospital Administrator",
  role: "Admin",
  title: "Hospital Administrator",
  department: "Administration",
};

function getRoleProfile(roleId: string, username?: string): StaffProfile {
  const r = (roleId || "").toLowerCase();
  const u = (username || "").toLowerCase();

  if (r.includes("superadmin") || u === "superadmin") {
    return { id: "SUP-001", name: "Dr. Alexander Vance", role: "ROLE_SUPERADMIN", title: "Super Administrator", department: "Executive Control" };
  }
  if (r.includes("doctor") || u === "doctor") {
    return { id: "DOC-402", name: "Dr. Sarah Jenkins", role: "ROLE_DOCTOR", title: "Attending Physician / EMR", department: "Cardiology & ICU" };
  }
  if (r.includes("reception") || u === "reception") {
    return { id: "REC-102", name: "Elena Torres", role: "ROLE_RECEPTION", title: "Front Desk Receptionist", department: "Patient Services" };
  }
  if (r.includes("pharmacy") || u === "pharmacy") {
    return { id: "PHM-844", name: "Robert Williams, RPh", role: "ROLE_PHARMACY", title: "Chief Pharmacist", department: "Pharmacy Dept" };
  }
  if (r.includes("lab") || u === "lab") {
    return { id: "LAB-512", name: "Michael Chang, CLS", role: "ROLE_LAB", title: "Lead Lab Technician", department: "Pathology & Radiology" };
  }
  if (r.includes("nurse") || r.includes("rn") || u === "nurse") {
    return { id: "RN-8821", name: "Jessica Carter, RN", role: "ROLE_NURSE", title: "Registered Nurse", department: "Inpatient & ICU" };
  }
  return { id: "ADM-001", name: "Hospital Administrator", role: "ROLE_ADMIN", title: "System Administrator", department: "Administration" };
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string>("ROLE_ADMIN");
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [activeStaff, setActiveStaff] = useState<StaffProfile>(DEFAULT_STAFF);
  // Set when a physician signs in: their portal is scoped to this one doctor.
  const [activeDoctor, setActiveDoctor] = useState<DoctorAccount | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const stableSetNotice = useCallback((n: Notice | null) => setNotice(n), []);
  const [module, setModule] = useState<Module>("dashboard");
  // Set alongside setModule("chart") when another page (e.g. a bed card's
  // patient name) wants Patient Chart to open directly on that patient
  // instead of its own directory.
  const [clinicalPatientId, setClinicalPatientId] = useState<string | null>(null);
  const openPatientClinical = (patientId: string) => {
    setClinicalPatientId(patientId);
    setModule("chart");
  };
  const [expanded, setExpanded] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [subBadges, setSubBadges] = useState<Record<string, number>>({});
  // Bumped whenever the doctor inbox or the lab-order queue changes, so the
  // sidebar counts move without waiting for the next navigation.
  const [badgeTick, setBadgeTick] = useState(0);
  useEffect(() => DoctorPortalDatabase.subscribe(() => setBadgeTick(t => t + 1)), []);
  useEffect(() => LabOrderDatabase.subscribe(() => setBadgeTick(t => t + 1)), []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Keppler OCR is a whole separate React app in an iframe: unmounting it on
  // every nav away means re-downloading its module graph and re-running its
  // silent sign-in on every return (~3s cold). Mount it once, then just hide
  // it, so going back is instant.
  const [ocrMounted, setOcrMounted] = useState(false);
  useEffect(() => {
    if (module === "dpi_ocr") setOcrMounted(true);
  }, [module]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(() => {
    // Persisted so a chosen text size survives a reload; storage can throw in
    // private windows, and a bad/stale value must not scale the whole app.
    try {
      const saved = parseFloat(localStorage.getItem("hms.zoomLevel") ?? "");
      if (Number.isFinite(saved)) return Math.min(1.2, Math.max(0.7, saved));
    } catch {}
    return 1;
  });

  useEffect(() => {
    try {
      localStorage.setItem("hms.zoomLevel", String(zoomLevel));
    } catch {}
  }, [zoomLevel]);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [workflowInitialStep, setWorkflowInitialStep] = useState<number>(2);
  const [selectedWorkflowEncounterId, setSelectedWorkflowEncounterId] = useState<string | undefined>();
  const [selectedTriageVisitId, setSelectedTriageVisitId] = useState<number | null>(null);

  const isNurse = userRole === "rn";

  /**
   * Whether this user may open a clinical consultation screen at all.
   *
   * The sidebar is already filtered by permission, but the OP screens also carry
   * their own "View in Doctor Portal" / "Doctor Portal ➔" buttons, and those
   * bypassed the nav entirely: a receptionist clicking one was bounced to the
   * dashboard by the route guard below with no explanation. Reception books the
   * appointment and takes payment -- the consultation is not theirs to open --
   * so the entry points are withheld rather than left to fail.
   */
  const canOpenConsultation =
    userPermissions.includes("doctor_workflow") || userPermissions.includes("doctor_portal");

  // Check route access
  useEffect(() => {
    if (loggedIn && module !== "dashboard" && !userPermissions.includes(module)) {
      // Check if it matches a child module
      const parentMatch = NAV.find(n => n.children?.some(c => c.key === module));
      if (!parentMatch || !userPermissions.includes(parentMatch.key)) {
        setModule("dashboard");
      }
    }
  }, [module, loggedIn, userPermissions]);

  const handleLogout = () => {
    AuditDatabase.logEvent(
      "Logout",
      "Authentication",
      `User ${activeStaff.name} logged out.`,
      "Success",
      activeStaff.id,
      activeStaff.name
    );
    setLoggedIn(false);
  };

  const switchRole = (targetRole: string, targetUsername: string, permissions: string[]) => {
    setUserRole(targetRole);
    setUserPermissions(permissions);
    setActiveStaff(getRoleProfile(targetRole, targetUsername));
    const doctor = targetRole === "ROLE_DOCTOR" ? resolveDoctorAccount({ username: targetUsername }) : null;
    setActiveDoctor(doctor);
    setModule(doctor ? "doctor_portal" : "dashboard");
    setRoleMenuOpen(false);
  };

  const handleLogin = (userData: {
    user: string;
    role: string;
    staffId: string;
    permissions: string[];
    doctorId?: string;
  }) => {
    setUserRole(userData.role);
    setUserPermissions(userData.permissions);

    const isDoctor = userData.role === "ROLE_DOCTOR" || userData.user.toLowerCase().startsWith("doctor");
    const doctor = isDoctor
      ? resolveDoctorAccount({ doctorId: userData.doctorId, username: userData.user, name: userData.user })
      : null;
    setActiveDoctor(doctor);

    setActiveStaff(
      doctor
        ? {
            id: doctor.staffId,
            name: doctor.name,
            role: "ROLE_DOCTOR",
            title: doctor.qualification,
            department: `${doctor.specialty} · ${doctor.room}`,
          }
        : getRoleProfile(userData.role, userData.user)
    );
    setLoggedIn(true);
    // A physician's home is their own portal -- the inbox of patients appointed
    // to them -- not the hospital-wide dashboard.
    setModule(doctor ? "doctor_portal" : "dashboard");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
      }
    }
  };

  // Ctrl+K
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const navigate = (m: string, sub?: string) => {
    setModule(m as Module);
    if (sub === "register") setModule("register");
    setCmdOpen(false);
  };

  // Counts on the nav itself, so a pharmacist sees what needs attention without opening each page.
  // Recomputed whenever the module changes, which is also when pharmacy data has just been written.
  useEffect(() => {
    if (!loggedIn) return;
    try {
      const prescriptions = PharmacyDatabase.getPrescriptions();
      const batches = PharmacyDatabase.getBatches();
      const medicines = PharmacyDatabase.getMedicines();
      const active = batches.filter(b => b.availableQuantity > 0);
      const expiringSoon = active.filter(b => {
        const days = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
        return days <= 90;
      }).length;
      const lowStock = medicines.filter(m =>
        batches.filter(b => b.medicineId === m.id).reduce((a, b) => a + b.availableQuantity, 0) <= m.reorderLevel
      ).length;

      setSubBadges({
        doctor_portal: activeDoctor ? DoctorPortalDatabase.getUnreadCount(activeDoctor.id) : 0,
        laboratory: LabOrderDatabase.getLabWorklist().filter(o => o.status !== "Completed").length,
        // Shared helper, not a list kept here: this badge omitted "Sent To Pharmacy"
        // -- the status the doctor portal dispatches with -- so a prescription sat
        // in the queue while the sidebar reported nothing waiting.
        pharmacy_rx: prescriptions.filter(p => p.status === "Sent To Pharmacy").length,
        pharmacy_dispensing: prescriptions.filter(
          p => p.status === "Verified" || p.status === "Approved"
            || p.status === "Preparing" || p.status === "Ready For Dispensing"
        ).length,
        pharmacy_expiry: expiringSoon,
        pharmacy_medicine: lowStock,
      });
    } catch {
      setSubBadges({});
    }
  }, [module, loggedIn, badgeTick, activeDoctor]);

  // Landing on a sub-module from anywhere but the sidebar (command palette, a shortcut button)
  // should still reveal where you are in the tree.
  useEffect(() => {
    const parent = NAV.find(n => n.children?.some(c => c.key === module && c.key !== n.key));
    if (!parent) return;
    setExpanded(prev => (prev.includes(parent.key) ? prev : [...prev, parent.key]));
  }, [module]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-[#F0F2F5]"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        zoom: zoomLevel,
      }}
    >
      {!loggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          {/* ── Top Header ───────────────────────────────────────────────── */}
          <header className="bg-[#0C1524] border-b border-[#1E2D42] h-12 flex items-center gap-3 px-3 flex-shrink-0 z-40">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors rounded-lg hover:bg-white/10"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>

            {/* Global Search */}
            <div className="w-[400px] ml-auto mr-4 group">
              <button
                onClick={() => setCmdOpen(true)}
                className="w-full relative flex items-center h-9 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-left text-[13px] text-[#94A3B8] transition-all shadow-sm hover:shadow-[0_0_15px_rgba(27,79,216,0.15)] overflow-hidden"
              >
                <span className="absolute left-3 text-[#64748B] group-hover:text-blue-400 transition-colors">
                  <Icon.Search />
                </span>
                <span className="pl-10 pr-16 flex-1 truncate">Search patients, MRN, appointments...</span>
                <div className="absolute right-2 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <kbd className="bg-black/30 border border-white/10 text-white text-[10px] px-2 py-0.5 rounded shadow-sm font-mono tracking-wider">Ctrl</kbd>
                  <kbd className="bg-black/30 border border-white/10 text-white text-[10px] px-2 py-0.5 rounded shadow-sm font-mono tracking-wider">K</kbd>
                </div>
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-400/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            </div>

            {/* Quick Create */}
            <div className="relative ml-2">
              <button
                onClick={() => setNewMenuOpen(o => !o)}
                className="flex items-center gap-1.5 h-7 px-2.5 bg-[#1B4FD8] hover:bg-[#1740B4] rounded text-white text-[12px] font-medium transition-colors">
                <Icon.Plus /> New
              </button>
              {newMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#DDE2EC] rounded shadow-lg z-50 py-1">
                  <button onClick={() => { setModule("register"); setNewMenuOpen(false); }} className="w-full text-left px-4 py-1.5 text-[12px] hover:bg-[#F8FAFC] text-gray-700">New Patient</button>
                  <button onClick={() => { setModule("appointments"); setNewMenuOpen(false); }} className="w-full text-left px-4 py-1.5 text-[12px] hover:bg-[#F8FAFC] text-gray-700">New Appointment</button>
                  <button onClick={() => { setModule("chart"); setOrderOpen(true); setNewMenuOpen(false); }} className="w-full text-left px-4 py-1.5 text-[12px] hover:bg-[#F8FAFC] text-gray-700">New Order</button>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1">
              {/* Font Controls */}
              <div className="flex items-center bg-white/5 rounded px-1 mr-1">
                <button title="Smaller text" onClick={() => setZoomLevel(z => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))} className="w-6 h-6 flex items-center justify-center text-[#94A3B8] hover:text-white text-[10px] font-bold">A-</button>
                <button
                  title="Reset text size to 100%"
                  onClick={() => setZoomLevel(1)}
                  className={`h-6 min-w-6 px-1 flex items-center justify-center font-bold hover:text-white ${
                    zoomLevel === 1 ? "text-[#94A3B8] text-[12px]" : "text-[#F59E0B] text-[10px]"
                  }`}>
                  {zoomLevel === 1 ? "A" : `${Math.round(zoomLevel * 100)}%`}
                </button>
                <button title="Larger text" onClick={() => setZoomLevel(z => Math.min(1.2, Math.round((z + 0.1) * 10) / 10))} className="w-6 h-6 flex items-center justify-center text-[#94A3B8] hover:text-white text-[14px] font-bold">A+</button>
              </div>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white rounded hover:bg-white/10 transition-colors mr-1">
                {isFullscreen ? <Icon.Minimize /> : <Icon.Maximize />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button onClick={() => setNotifOpen(n => !n)}
                  className="relative w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white rounded hover:bg-white/10 transition-colors">
                  <Icon.Bell />
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#DC2626] rounded-full text-[9px] text-white font-bold flex items-center justify-center">7</span>
                </button>
                {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
              </div>

              {/* Messages */}
              <button className="relative w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white rounded hover:bg-white/10 transition-colors">
                <Icon.Message />
                <span className="absolute top-1 right-1 w-3 h-3 bg-[#16A34A] rounded-full text-[8px] text-white font-bold flex items-center justify-center">3</span>
              </button>

              {/* Help */}
              <button className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-white rounded hover:bg-white/10 transition-colors text-[13px] font-bold">?</button>

              {/* Role Switcher Menu */}
              <div className="relative ml-1 pl-3 border-l border-white/10">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-2 text-left hover:bg-white/10 p-1.5 rounded transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1B4FD8] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
                    {activeStaff.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="hidden md:block">
                    <div className="text-[11.5px] font-medium text-white leading-tight flex items-center gap-1">
                      <span>{activeStaff.name}</span>
                      <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1 rounded font-mono">▼ Role</span>
                    </div>
                    <div className="text-[10px] text-[#93C5FD]">{activeStaff.title}</div>
                  </div>
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#CBD5E1] shadow-2xl rounded-none z-50 p-2 text-[12px] space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
                      Switch Active Portal / Role
                    </div>
                    {[
                      { roleId: "ROLE_SUPERADMIN", username: "superadmin", label: "Super Administrator", icon: "👑" },
                      { roleId: "ROLE_ADMIN", username: "admin", label: "Hospital Administrator", icon: "🏢" },
                      { roleId: "ROLE_DOCTOR", username: "doctor", label: "Doctor / Physician", icon: "👨‍⚕️" },
                      { roleId: "ROLE_RECEPTION", username: "reception", label: "Receptionist / Front Desk", icon: "📋" },
                      { roleId: "ROLE_PHARMACY", username: "pharmacy", label: "Pharmacy Staff", icon: "💊" },
                      { roleId: "ROLE_LAB", username: "lab", label: "Laboratory Staff", icon: "🔬" },
                      { roleId: "ROLE_NURSE", username: "nurse", label: "Registered Nurse", icon: "👩‍⚕️" },
                    ].map((r) => {
                      const permissions =
                        r.roleId === "ROLE_SUPERADMIN" || r.roleId === "ROLE_ADMIN"
                          ? ALL_SYSTEM_MODULES
                          : RoleDatabase.getRoles().find(role => role.id === r.roleId)?.allowedModules || ["dashboard"];

                      return (
                        <button
                          key={r.roleId}
                          type="button"
                          onClick={() => switchRole(r.roleId, r.username, permissions)}
                          className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer ${
                            userRole === r.roleId ? "bg-[#EFF6FF] text-[#1B4FD8] font-bold" : "hover:bg-[#F8FAFC] text-[#334155]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{r.icon}</span>
                            <span>{r.label}</span>
                          </span>
                          {userRole === r.roleId && <span className="text-[10px] text-[#15803D]">● Active</span>}
                        </button>
                      );
                    })}
                    <div className="border-t border-[#E2E8F0] pt-1 mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-2.5 py-1 text-[11px] text-[#B91C1C] hover:bg-red-50 font-semibold"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {notice && (
            <div className={`px-4 py-2 text-[12.5px] font-medium flex items-center justify-between flex-shrink-0 ${notice.type === "error" ? "bg-red-50 text-red-800 border-b border-red-200" : notice.type === "success" ? "bg-green-50 text-green-800 border-b border-green-200" : "bg-blue-50 text-blue-800 border-b border-blue-200"}`}>
              <span>{notice.message}</span>
              <button className="underline" onClick={() => setNotice(null)}>Dismiss</button>
            </div>
          )}

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">
            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside className={`bg-[#0C1524] border-r border-[#1E2D42] flex-shrink-0 flex flex-col transition-all duration-200 overflow-y-auto ${sidebarCollapsed ? "w-14" : "w-64"}`}>
              {/* Top Logo Section */}
              <div className="flex items-center justify-center py-2.5 px-2 border-b border-[#1E2D42]/60 flex-shrink-0">
                <img
                  src="/logo.png"
                  alt="HospAI Logo"
                  className={`${sidebarCollapsed ? "w-8 h-8" : "w-40 h-40"} object-contain pointer-events-none transition-all duration-200`}
                />
              </div>
              <div className={`flex-1 py-2 ${sidebarCollapsed ? "px-1" : "px-2"}`}>
                {NAV.map((item) => {
                  // Module-based Access Control Filtering
                  const hasAccess = userPermissions.includes(item.key);
                  if (!hasAccess) return null;

                  // Sub-items inherit the parent's access unless the role actually enumerates
                  // sub-module keys -- otherwise a role granted only "pharmacy" would collapse
                  // the whole Pharmacy tree down to its Dashboard entry.
                  const subModulesGranted = item.children?.some(c => c.key !== item.key && userPermissions.includes(c.key));
                  const filteredChildren = item.children?.filter(
                    c => c.key === item.key || !subModulesGranted || userPermissions.includes(c.key)
                  );

                  const isActive = module === item.key || (filteredChildren?.some(c => c.key === module));
                  const isExpanded = expanded.includes(item.key);
                  const childBadgeTotal = filteredChildren?.reduce((a, c) => a + (subBadges[c.key] || 0), 0) || 0;
                  const navBadge = childBadgeTotal > 0 ? childBadgeTotal : subBadges[item.key] || item.badge;

                  return (
                    <div key={item.key} className="relative group">
                      <div
                        className={
                          sidebarCollapsed
                            ? `w-8 h-8 mx-auto my-1 flex items-center justify-center rounded-lg cursor-pointer transition-all duration-150 relative ${
                                isActive
                                  ? "bg-[#1B4FD8] text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400/40"
                                  : "text-[#94A3B8] hover:text-white hover:bg-white/10"
                              }`
                            : `nav-item ${isActive ? "active" : ""}`
                        }
                        onClick={() => {
                          if (filteredChildren && filteredChildren.length > 0) {
                            if (sidebarCollapsed) {
                              if (item.key === "intelligence") {
                                setModule("intelligence");
                              } else {
                                setModule(filteredChildren[0].key);
                              }
                            } else {
                              toggleExpand(item.key);
                              if (!expanded.includes(item.key)) {
                                if (item.key === "intelligence") {
                                  setModule("intelligence");
                                } else {
                                  setModule(filteredChildren[0].key);
                                }
                              }
                            }
                          } else {
                            setModule(item.key);
                          }
                        }}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <item.Icon
                          size={sidebarCollapsed ? 18 : 16}
                          className={sidebarCollapsed ? "w-8 h-8 p-1.5" : "w-4 h-4"}
                        />

                        {/* Collapsed Badge Dot */}
                        {sidebarCollapsed && item.badge && !isActive && (
                          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#DC2626] border border-[#0C1524] rounded-full"></span>
                        )}

                        {/* Collapsed Hover Tooltip */}
                        {sidebarCollapsed && (
                          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-[12px] font-semibold rounded-lg shadow-2xl border border-white/10 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="bg-[#DC2626] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}

                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {navBadge && !isActive && (
                              <span className="badge bg-[#DC2626] text-white">{navBadge}</span>
                            )}
                            {filteredChildren && filteredChildren.length > 0 && (
                              <span className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                                <Icon.ChevronRight />
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {!sidebarCollapsed && filteredChildren && filteredChildren.length > 0 && isExpanded && (
                        <div className="space-y-0.5 my-1">
                          {/* Ungrouped children (a module's own Dashboard) sit directly under the parent. */}
                          {filteredChildren.filter(c => !c.group).map(child => (
                            <div
                              key={`${child.key}_${child.label}`}
                              className={`nav-item sub ${module === child.key && isActive ? "active" : ""}`}
                              onClick={() => setModule(child.key)}
                            >
                              {child.label}
                            </div>
                          ))}

                          {/* Grouped children are laid out under a plain section
                              caption rather than a second accordion: the group was
                              a third click before you could reach a page that the
                              module itself listed in one flat sidebar. The caption
                              keeps the grouping legible without hiding anything. */}
                          {[...new Set(filteredChildren.filter(c => c.group).map(c => c.group as string))].map(group => {
                            const groupChildren = filteredChildren.filter(c => c.group === group);

                            return (
                              <div key={`${item.key}:${group}`} className="mt-2 first:mt-1">
                                <div 
                                  className="px-3 pt-1 pb-1 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors mx-1 rounded"
                                  onClick={() => setCollapsedGroups(prev => prev.includes(`${item.key}:${group}`) ? prev.filter(g => g !== `${item.key}:${group}`) : [...prev, `${item.key}:${group}`])}
                                >
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] select-none">
                                    {group}
                                  </span>
                                  <span className={`text-[#64748B] transition-transform ${collapsedGroups.includes(`${item.key}:${group}`) ? "-rotate-90" : ""}`}>
                                    <Icon.ChevronDown size={14} />
                                  </span>
                                </div>
                                {!collapsedGroups.includes(`${item.key}:${group}`) && groupChildren.map(child => (
                                  <div
                                    key={`${child.key}_${child.label}`}
                                    className={`nav-item sub justify-between ${module === child.key && isActive ? "active" : ""}`}
                                    onClick={() => setModule(child.key)}
                                  >
                                    <span className="flex-1 truncate">{child.label}</span>
                                    {(subBadges[child.key] || 0) > 0 && module !== child.key && (
                                      <span className="badge bg-[#334155] text-[#CBD5E1]">{subBadges[child.key]}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {sidebarCollapsed ? (
                <div className="p-2 border-t border-[#1E2D42]/60 flex justify-center">
                  <button
                    onClick={() => setCmdOpen(true)}
                    title="Command Palette (Ctrl+K)"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Icon.Cmd size={18} className="w-8 h-8 p-1.5" />
                  </button>
                </div>
              ) : (
                <div className="p-3 border-t border-[#1E2D42]">
                  <button onClick={() => setCmdOpen(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded border border-white/10 text-[#64748B] hover:text-white hover:border-white/20 transition-colors text-[11.5px]">
                    <Icon.Cmd />
                    <span>Command Palette</span>
                    <kbd className="ml-auto font-mono text-[10px]">Ctrl+K</kbd>
                  </button>
                </div>
              )}
            </aside>

            {/* ── Main Workspace ───────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
              {/* Breadcrumb strip */}
              <div className="bg-white border-b border-[#DDE2EC] px-5 py-1.5 flex items-center gap-1.5 text-[11.5px] text-[#94A3B8] flex-shrink-0">
                <span>HospAI</span>
                <Icon.ChevronRight />
                {moduleTrail(module).map((crumb, i, all) => (
                  <span key={crumb} className="flex items-center gap-1.5">
                    {i > 0 && <Icon.ChevronRight />}
                    <span className={i === all.length - 1 ? "text-gray-700 font-medium" : ""}>{crumb}</span>
                  </span>
                ))}
              </div>

              {/* Module Content */}
              {module === "dashboard" && <Dashboard navigate={navigate} userRole={userRole} activeStaff={activeStaff} switchRole={switchRole} />}
              {module === "patients" && (
                <PatientSearch
                  onSelect={(p) => {
                    setClinicalPatientId(p.umr || (p as any).patient_id || (p as any).id);
                    setModule("chart");
                  }}
                  onRegister={() => setModule("register")}
                  onNavigateToWorkflow={(encounterId) => {
                    setSelectedWorkflowEncounterId(encounterId);
                    setWorkflowInitialStep(2);
                    setModule("op_workflow");
                  }}
                />
              )}
              {module === "register" && (
                <Registration
                  onBookAppointment={(patient) => {
                    if (patient?.id) setSelectedWorkflowEncounterId(patient.id);
                    setModule("appointments");
                  }}
                  onGoToBilling={() => setModule("billing")}
                  onComplete={() => setModule("patients")}
                  onBack={() => setModule("patients")}
                />
              )}
              {module === "chart" && (
                <PatientChart
                  onBack={() => setModule("patients")}
                  setNotice={setNotice}
                  initialPatientId={clinicalPatientId}
                  onConsumeInitialPatient={() => setClinicalPatientId(null)}
                />
              )}
              {module === "appointments" && (
                <Appointments
                  initialEncounterId={selectedWorkflowEncounterId}
                  onSelect={(patientId?: string) => {
                    if (patientId) setClinicalPatientId(patientId);
                    setModule("chart");
                  }}
                  onGoToBilling={() => setModule("billing")}
                />
              )}
              {module === "emergency" && (
                <ErPage
                  setNotice={stableSetNotice}
                  onNavigate={(m) => setModule(m as any)}
                  onOpenTriage={(visitId) => {
                    setSelectedTriageVisitId(visitId);
                    setModule("triage");
                  }}
                />
              )}
              {module === "inpatient" && (
                <Inpatient navigate={navigate} onOpenPatientClinical={openPatientClinical} permissions={userPermissions} />
              )}
              {module === "beds" && (
                <BedManagementPage
                  setNotice={stableSetNotice}
                  onOpenPatientClinical={openPatientClinical}
                  permissions={userPermissions}
                />
              )}
              {module === "nursing" && <NursingPortal />}
              {module === "laboratory" && <Laboratory technician={activeStaff.name} />}
              {(module === "pharmacy" || module.startsWith("pharmacy_")) && <Pharmacy activeModule={module} onNavigate={(m) => setModule(m as Module)} />}
              {module === "surgery" && <Surgery />}
              {module === "billing" && <Billing />}
              {module === "radiology" && <Radiology />}
              {module === "icu" && <ICU />}
              {module === "analytics" && <Analytics />}
              {module === "discharge" && <Discharge setNotice={stableSetNotice} onComplete={() => setModule("inpatient")} />}
              {module === "triage" && (
                <Triage
                  initialVisitId={selectedTriageVisitId}
                  setNotice={stableSetNotice}
                  onNavigate={(m) => setModule(m as any)}
                />
              )}

              {module === "insurance" && <Insurance />}
              {module === "clinical" && <PlaceholderModule title="Clinical" sub="Encounters, orders, results, and care plans" />}
              {module === "reports" && <PlaceholderModule title="Reports" sub="Operational and clinical reporting" />}
              {module === "op_nurse" && (
                <NurseStation
                  nurseName={activeStaff?.name || "OP Nurse"}
                  onOpenQueue={userPermissions.includes("queue") ? () => setModule("queue") : undefined}
                />
              )}
              {module === "admin" && <Administration />}

              {/* Outpatient Department Modular Suite */}
              {module === "op_management" && (
                <OPManagement
                  staffName={activeStaff?.name || "OP desk"}
                  onNavigateToNurseStation={
                    userPermissions.includes("op_nurse") ? () => setModule("op_nurse") : undefined
                  }
                  onNavigateToQueue={() => setModule("queue")}
                  onNavigateToOPDProcedures={() => setModule("opd_procedures")}
                  onNavigateToOPWorkflow={(encId, step) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    if (step !== undefined) setWorkflowInitialStep(step);
                    setModule("op_workflow");
                  }}
                  onNavigateToDoctorWorkflow={!canOpenConsultation ? undefined : (encId) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    setModule("doctor_portal");
                  }}
                  onNavigateToOPRegistration={() => {
                    setModule("op_registration");
                  }}
                />
              )}
              {module === "queue" && (
                <QueueManagement
                  onNavigateToNurseStation={
                    userPermissions.includes("op_nurse") ? () => setModule("op_nurse") : undefined
                  }
                  onNavigateToOPWorkflow={(encId, step) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    if (step !== undefined) setWorkflowInitialStep(step);
                    setModule("op_workflow");
                  }}
                  onNavigateToDoctorWorkflow={!canOpenConsultation ? undefined : (encId) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    setModule("doctor_portal");
                  }}
                  onNavigateToOPRegistration={() => {
                    setModule("op_registration");
                  }}
                />
              )}
              {module === "opd_procedures" && (
                <OPDProcedures
                  onNavigateToOPManagement={() => setModule("op_management")}
                />
              )}
              {module === "op_workflow" && (
                <OPWorkflow
                  initialStep={workflowInitialStep}
                  initialEncounterId={selectedWorkflowEncounterId}
                  onComplete={() => setModule("op_management")}
                  onOpenDoctorPortal={!canOpenConsultation ? undefined : (encId) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    setModule("doctor_portal");
                  }}
                />
              )}
              {module === "patient_exp" && <PatientExperience />}
              {(module === "doctor_workflow" || module === "doctor_portal") && (
                <DoctorPortal doctor={activeDoctor || resolveDoctorAccount({ name: activeStaff.name })} />
              )}
              {module === "scheduling" && <DoctorScheduling />}
              {module === "admissions" && <Admissions setNotice={setNotice} navigate={navigate} />}
              {module === "readmission" && <Readmission setNotice={setNotice} />}
              {module === "payments" && <PaymentCollection />}
              {module === "revenue_reports" && <RevenueReports />}
              {module === "hrms" && <HRMS />}
              {module === "employees" && <Employees />}
              {module === "ocr" && <SmartOCR setNotice={setNotice} />}
              {ocrMounted && (
                <div className={module === "dpi_ocr" ? "h-full w-full" : "hidden"}>
                  <DpiOcrPortal />
                </div>
              )}
              {module === "symptom_ai" && <SymptomAI setNotice={setNotice} />}
              {module === "clinical_rag" && <ClinicalRAG />}
              {module === "clinical_summaries" && <ClinicalSummaries />}
              {module === "bulk_ai" && <BulkAI setNotice={setNotice} />}
              {module === "nl_filtering" && <NLFiltering setNotice={setNotice} />}
              {module === "intelligence" && <IntelligenceHub navigate={navigate} />}
            </main>
          </div>

          {/* ── Overlays ─────────────────────────────────────────────────── */}
          <OrderDrawer open={orderOpen} onClose={() => setOrderOpen(false)} />
          <CommandPalette
            open={cmdOpen}
            onClose={() => setCmdOpen(false)}
            onNavigate={(key) => {
              if (key === "order") { setModule("chart"); setOrderOpen(true); }
              else if (key === "register") { setModule("register"); }
              else { setModule(key as Module); }
            }}
            onSelectPatient={(patientId, encounterId) => {
              setClinicalPatientId(patientId);
              if (encounterId) {
                setSelectedWorkflowEncounterId(encounterId);
              }
              setModule("chart");
            }}
          />
        </>
      )}
    </div>
  );
}
