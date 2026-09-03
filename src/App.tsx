import React, { useState, useEffect } from "react";
import { Icon } from "./components/icons";
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
import DoctorWorkflow from "./components/DoctorWorkflow";
import DoctorScheduling from "./components/DoctorScheduling";
import PatientExperience from "./components/PatientExperience";
import HRMS from "./components/HRMS";
import Employees from "./components/Employees";
import Admissions from "./components/Admissions";
import Readmission from "./components/Readmission";
import PaymentCollection from "./components/PaymentCollection";
import RevenueReports from "./components/RevenueReports";

type Module =
  | "dashboard" | "patients" | "appointments" | "emergency"
  | "clinical" | "inpatient" | "nursing" | "laboratory"
  | "radiology" | "pharmacy" | "surgery" | "billing"
  | "icu" | "discharge" | "triage" | "insurance" | "analytics"
  | "reports" | "admin"
  | "chart" | "register"
  | "outpatient" | "queue" | "op_management" | "op_registration" | "op_workflow"
  | "doctor_workflow" | "scheduling"
  | "admissions" | "readmission"
  | "payments" | "revenue_reports"
  | "hrms" | "employees" | "patient_exp"
  | "intelligence" | "ocr" | "dpi_ocr" | "symptom_ai" | "clinical_rag" | "clinical_summaries" | "bulk_ai" | "nl_filtering"
  | "beds";

interface NavItem {
  key: Module;
  label: string;
  Icon: React.FC;
  badge?: number;
  children?: { key: Module; label: string }[];
}

const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", Icon: Icon.Dashboard },
  {
    key: "patients", label: "Patients", Icon: Icon.Patients,
    children: [
      { key: "patients", label: "Patient Search" },
      { key: "register", label: "Registration" },
    ]
  },
  {
    key: "outpatient", label: "Outpatient", Icon: Icon.Stethoscope,
    children: [
      { key: "op_management", label: "OP Management" },
      { key: "op_workflow", label: "OP Clinical Journey" },
      { key: "appointments", label: "Appointments" },
      { key: "queue", label: "Queue Management" },
    ]
  },
  {
    key: "clinical", label: "Clinical", Icon: Icon.Clinical,
    children: [
      { key: "chart", label: "Encounters" },
      { key: "chart", label: "Orders" },
      { key: "chart", label: "Results" },
      { key: "doctor_workflow", label: "Doctor Workflow" },
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
      { key: "icu", label: "ICU" },
      { key: "discharge", label: "Discharge" },
    ]
  },
  { key: "nursing", label: "Nursing", Icon: Icon.Nursing },
  { key: "laboratory", label: "Laboratory", Icon: Icon.Lab, badge: 3 },
  { key: "radiology", label: "Radiology", Icon: Icon.Radiology },
  { key: "pharmacy", label: "Pharmacy", Icon: Icon.Pharmacy, badge: 8 },
  { key: "surgery", label: "Surgery", Icon: Icon.Surgery },
  {
    key: "billing", label: "Billing", Icon: Icon.Billing,
    children: [
      { key: "billing", label: "Invoices" },
      { key: "payments", label: "Payment Collection" },
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

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string>("admin");
  const [activeStaff, setActiveStaff] = useState<StaffProfile>(DEFAULT_STAFF);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [module, setModule] = useState<Module>("dashboard");
  // Set alongside setModule("chart") when another page (e.g. a bed card's
  // patient name) wants Patient Chart to open directly on that patient
  // instead of its own directory.
  const [clinicalPatientId, setClinicalPatientId] = useState<string | null>(null);
  const openPatientClinical = (patientId: string) => {
    setClinicalPatientId(patientId);
    setModule("chart");
  };
  const [expanded, setExpanded] = useState<string[]>(["patients", "outpatient"]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [workflowInitialStep, setWorkflowInitialStep] = useState<number>(2);
  const [selectedWorkflowEncounterId, setSelectedWorkflowEncounterId] = useState<string | undefined>();

  const isNurse = userRole === "rn";

  const handleLogin = (userData: { user: string; role: string; staffId: string }) => {
    setUserRole(userData.role);
    setLoggedIn(true);
    setModule("dashboard");
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
            <button onClick={() => setSidebarCollapsed(c => !c)}
              className="w-7 h-7 flex items-center justify-center text-[#64748B] hover:text-white transition-colors rounded hover:bg-white/10">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
                <button onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.1))} className="w-6 h-6 flex items-center justify-center text-[#94A3B8] hover:text-white text-[10px] font-bold">A-</button>
                <button onClick={() => setZoomLevel(1)} className="w-6 h-6 flex items-center justify-center text-[#94A3B8] hover:text-white text-[12px] font-bold">A</button>
                <button onClick={() => setZoomLevel(z => Math.min(1.2, z + 0.1))} className="w-6 h-6 flex items-center justify-center text-[#94A3B8] hover:text-white text-[14px] font-bold">A+</button>
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

              {/* User */}
              <div className="flex items-center gap-2 ml-1 pl-3 border-l border-white/10">
                <div className="w-7 h-7 rounded-full bg-[#1B4FD8] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0">
                  {activeStaff.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="hidden md:block">
                  <div className="text-[11.5px] font-medium text-white leading-tight">{activeStaff.name}</div>
                  <div className="text-[10px] text-[#93C5FD]">{activeStaff.title} · {activeStaff.activeShift}</div>
                </div>
                <button onClick={() => setLoggedIn(false)} className="ml-1 text-[#64748B] hover:text-white text-[11px] font-medium transition-colors px-1.5 py-1 rounded hover:bg-white/10">
                  Sign out
                </button>
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
            <aside className={`bg-[#0C1524] border-r border-[#1E2D42] flex-shrink-0 flex flex-col transition-all duration-200 overflow-y-auto ${sidebarCollapsed ? "w-12" : "w-64"}`}>
              {/* Top Logo Section */}
              <div className="flex items-center justify-center py-2.5 px-3 border-b border-[#1E2D42]/60 flex-shrink-0">
                <img
                  src="/logo.png"
                  alt="HospAI Logo"
                  className={`${sidebarCollapsed ? "w-8 h-8" : "w-40 h-40"} object-contain pointer-events-none transition-all duration-200`}
                />
              </div>
              <div className="flex-1 py-2 px-2">
                {((isNurse
                  ? [
                      { key: "dashboard" as Module, label: "Nurse Dashboard", Icon: Icon.Dashboard },
                      { key: "nursing" as Module, label: "Nursing & My Patients", Icon: Icon.Nursing },
                      { key: "chart" as Module, label: "Patient Chart", Icon: Icon.Clinical },
                    ]
                  : NAV
                ) as NavItem[]).map((item) => {
                  const isActive = module === item.key || (item.children?.some(c => c.key === module));
                  const isExpanded = expanded.includes(item.key);

                  return (
                    <div key={item.key}>
                      <div
                        className={`nav-item ${isActive ? "active" : ""}`}
                        onClick={() => {
                          if (item.children) {
                            toggleExpand(item.key);
                            if (!expanded.includes(item.key)) {
                              if (item.key === "intelligence") {
                                setModule("intelligence");
                              } else {
                                setModule(item.children[0].key);
                              }
                            }
                          }
                          else setModule(item.key);
                        }}>
                        <item.Icon />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge && !isActive && (
                              <span className="badge bg-[#DC2626] text-white">{item.badge}</span>
                            )}
                            {item.children && (
                              <span className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                                <Icon.ChevronRight />
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {!sidebarCollapsed && item.children && isExpanded && (
                        <div>
                          {item.children.map((child, ci) => (
                            <div key={ci}
                              className={`nav-item sub ${module === child.key && isActive ? "active" : ""}`}
                              onClick={() => setModule(child.key)}>
                              {child.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!sidebarCollapsed && (
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
                <span className="text-gray-700 font-medium capitalize">{
                  module === "chart" ? "Patient Chart" : module === "register" ? "Registration" :
                    module === "icu" ? "ICU" : module === "discharge" ? "Discharge Workflow" :
                      module === "triage" ? "Triage" : module === "analytics" ? "Analytics" :
                        module === "radiology" ? "Radiology" :
                          module === "op_management" ? "OP Management" :
                            module === "op_workflow" ? "OP Clinical Journey" :
                                module === "patient_exp" ? "Patient Experience" :
                                  module === "doctor_workflow" ? "Doctor Workflow" :
                                    module === "scheduling" ? "Doctor Scheduling" :
                                      module === "revenue_reports" ? "Revenue Reports" :
                                        module === "symptom_ai" ? "Symptom AI" :
                                          module === "clinical_rag" ? "Clinical RAG" :
                                            module === "clinical_summaries" ? "Clinical Summaries" :
                                              module === "bulk_ai" ? "Bulk Patient AI" :
                                                module === "nl_filtering" ? "NL Patient Filtering" :
                                                  module
                }</span>
              </div>

              {/* Module Content */}
              {module === "dashboard" && <Dashboard navigate={navigate} />}
              {module === "patients" && (
                <PatientSearch
                  onSelect={() => setModule("chart")}
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
                  onProceedToQueue={(patient) => {
                    if (patient?.id) {
                      setSelectedWorkflowEncounterId(patient.id);
                    }
                    setWorkflowInitialStep(2);
                    setModule("op_workflow");
                  }}
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
              {module === "appointments" && <Appointments onSelect={() => setModule("chart")} />}
              {module === "emergency" && <ErPage setNotice={setNotice} onNavigate={(m) => setModule(m as any)} />}
              {module === "inpatient" && <Inpatient navigate={navigate} onOpenPatientClinical={openPatientClinical} />}
              {module === "beds" && <BedManagementPage setNotice={setNotice} onOpenPatientClinical={openPatientClinical} />}
              {module === "nursing" && <NursingPortal />}
              {module === "laboratory" && <Laboratory />}
              {module === "pharmacy" && <Pharmacy />}
              {module === "surgery" && <Surgery />}
              {module === "billing" && <Billing />}
              {module === "radiology" && <Radiology />}
              {module === "icu" && <ICU />}
              {module === "analytics" && <Analytics />}
              {module === "discharge" && <Discharge setNotice={setNotice} onComplete={() => setModule("inpatient")} />}
              {module === "triage" && <Triage setNotice={setNotice} onNavigate={(m) => setModule(m as any)} />}

              {module === "insurance" && <Insurance />}
              {module === "clinical" && <PlaceholderModule title="Clinical" sub="Encounters, orders, results, and care plans" />}
              {module === "reports" && <PlaceholderModule title="Reports" sub="Operational and clinical reporting" />}
              {module === "admin" && <PlaceholderModule title="Administration" sub="Users, roles, departments, and system configuration" />}

              {/* New modules */}
              {module === "queue" && (
                <QueueManagement
                  onNavigateToOPWorkflow={(encId, step) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    if (step !== undefined) setWorkflowInitialStep(step);
                    setModule("op_workflow");
                  }}
                  onNavigateToDoctorWorkflow={(encId) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    setModule("doctor_workflow");
                  }}
                  onNavigateToOPRegistration={() => {
                    setModule("op_registration");
                  }}
                />
              )}
              {module === "op_management" && (
                <OPManagement
                  onNavigateToOPWorkflow={(encId, step) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    if (step !== undefined) setWorkflowInitialStep(step);
                    setModule("op_workflow");
                  }}
                  onNavigateToDoctorWorkflow={(encId) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    setModule("doctor_workflow");
                  }}
                  onNavigateToQueue={() => {
                    setModule("queue");
                  }}
                  onNavigateToOPRegistration={() => {
                    setModule("op_registration");
                  }}
                  onNavigateToPharmacy={() => {
                    setModule("pharmacy");
                  }}
                  onNavigateToBilling={() => {
                    setModule("billing");
                  }}
                />
              )}
              {module === "op_workflow" && (
                <OPWorkflow
                  initialStep={workflowInitialStep}
                  initialEncounterId={selectedWorkflowEncounterId}
                  onComplete={() => setModule("op_management")}
                  onOpenDoctorPortal={(encId) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    setModule("doctor_workflow");
                  }}
                />
              )}
              {module === "patient_exp" && <PatientExperience />}
              {module === "doctor_workflow" && (
                <DoctorWorkflow
                  onNavigateToOPWorkflow={(encId) => {
                    if (encId) setSelectedWorkflowEncounterId(encId);
                    setWorkflowInitialStep(5);
                    setModule("op_workflow");
                  }}
                />
              )}
              {module === "scheduling" && <DoctorScheduling />}
              {module === "admissions" && <Admissions setNotice={setNotice} navigate={navigate} />}
              {module === "readmission" && <Readmission setNotice={setNotice} />}
              {module === "payments" && <PaymentCollection />}
              {module === "revenue_reports" && <RevenueReports />}
              {module === "hrms" && <HRMS />}
              {module === "employees" && <Employees />}
              {module === "ocr" && <SmartOCR setNotice={setNotice} />}
              {module === "dpi_ocr" && <DpiOcrPortal />}
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
          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)}
            onNavigate={(key) => {
              if (key === "order") { setModule("chart"); setOrderOpen(true); }
              else if (key === "register") { setModule("register"); }
              else { setModule(key as Module); }
            }} />
        </>
      )}
    </div>
  );
}
