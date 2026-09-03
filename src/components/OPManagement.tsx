import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './icons';
import { db, DBOPEncounter, DBPatient } from '../services/db';

interface OPManagementProps {
  onNavigateToOPWorkflow?: (encId: string, step?: number) => void;
  onNavigateToDoctorWorkflow?: (encId: string) => void;
  onNavigateToQueue?: (dept?: string) => void;
  onNavigateToOPRegistration?: () => void;
  onNavigateToPharmacy?: () => void;
  onNavigateToBilling?: () => void;
}

interface DepartmentCapacity {
  name: string;
  code: string;
  headDoctor: string;
  activeDoctors: number;
  totalDoctors: number;
  rooms: string[];
  capacityThreshold: number;
}

const DEPARTMENTS_CONFIG: DepartmentCapacity[] = [
  {
    name: "Cardiology",
    code: "CARD",
    headDoctor: "Dr. Arjun Mehta",
    activeDoctors: 4,
    totalDoctors: 4,
    rooms: ["Room 107", "Room 104", "Room 105", "Room 102"],
    capacityThreshold: 15
  },
  {
    name: "Orthopedics",
    code: "ORTH",
    headDoctor: "Dr. David Anderson",
    activeDoctors: 2,
    totalDoctors: 3,
    rooms: ["Room 112", "Room 116"],
    capacityThreshold: 12
  },
  {
    name: "General Medicine",
    code: "GEN",
    headDoctor: "Dr. Vikram Malhotra",
    activeDoctors: 3,
    totalDoctors: 4,
    rooms: ["Room 111", "Room 101", "Room 103"],
    capacityThreshold: 20
  },
  {
    name: "Pediatrics",
    code: "PED",
    headDoctor: "Dr. Maya Lin",
    activeDoctors: 2,
    totalDoctors: 2,
    rooms: ["Room 120", "Room 121"],
    capacityThreshold: 10
  },
  {
    name: "Neurology",
    code: "NEUR",
    headDoctor: "Dr. Gregory House",
    activeDoctors: 2,
    totalDoctors: 2,
    rooms: ["Room 130", "Room 131"],
    capacityThreshold: 8
  },
  {
    name: "Dermatology",
    code: "DERM",
    headDoctor: "Dr. Elena Rostova",
    activeDoctors: 1,
    totalDoctors: 2,
    rooms: ["Room 140"],
    capacityThreshold: 8
  },
  {
    name: "ENT",
    code: "ENT",
    headDoctor: "Dr. Marcus Vance",
    activeDoctors: 1,
    totalDoctors: 2,
    rooms: ["Room 150"],
    capacityThreshold: 8
  },
  {
    name: "Emergency / Casualty",
    code: "ER",
    headDoctor: "Dr. John Carter",
    activeDoctors: 2,
    totalDoctors: 3,
    rooms: ["Trauma Bay 1", "Trauma Bay 2"],
    capacityThreshold: 10
  }
];

export default function OPManagement({
  onNavigateToOPWorkflow,
  onNavigateToDoctorWorkflow,
  onNavigateToQueue,
  onNavigateToOPRegistration,
  onNavigateToPharmacy,
  onNavigateToBilling,
}: OPManagementProps) {
  // State
  const [encounters, setEncounters] = useState<DBOPEncounter[]>([]);
  const [patients, setPatients] = useState<DBPatient[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [selectedDeptRoster, setSelectedDeptRoster] = useState<DepartmentCapacity | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedJourneyEncounter, setSelectedJourneyEncounter] = useState<DBOPEncounter | null>(null);

  // Load from database & subscribe to updates
  useEffect(() => {
    const loadData = () => {
      setEncounters(db.getEncounters());
      setPatients(db.getPatients());
    };
    loadData();
    const unsubscribe = db.subscribe(loadData);
    return () => {
      unsubscribe();
    };
  }, []);

  // Top Statistics Calculations
  const stats = useMemo(() => {
    const totalVisits = encounters.length;
    const waiting = encounters.filter(e => 
      e.status === "In Queue" || e.status === "Registered" || e.status === "Awaiting Doctor" || e.status === "Doctor Assigned" || e.status === "Symptoms Captured" || e.status === "AI Recommended"
    ).length;
    const inConsult = encounters.filter(e => e.status === "Under Consultation").length;
    const completed = encounters.filter(e => e.status === "Consultation Completed" || e.status === "OP Completed" || e.status === "Billing Completed").length;
    const pendingBilling = encounters.filter(e => e.billing?.status === "Pending").length;
    const pharmacyOrders = encounters.reduce((sum, e) => sum + (e.prescription?.length || 0), 0);
    const activeDoctors = DEPARTMENTS_CONFIG.reduce((sum, d) => sum + d.activeDoctors, 0);

    return {
      totalVisits,
      waiting,
      inConsult,
      completed,
      pendingBilling,
      pharmacyOrders,
      activeDoctors,
      avgWait: totalVisits > 0 ? `${Math.max(12, 16 + waiting * 3)}m` : "0m"
    };
  }, [encounters]);

  // Department Load Calculation
  const departmentRows = useMemo(() => {
    return DEPARTMENTS_CONFIG.map(dept => {
      const deptEncounters = encounters.filter(e => 
        (e.dept || "").toLowerCase().includes(dept.name.toLowerCase()) ||
        (e.aiSpecialty || "").toLowerCase().includes(dept.name.toLowerCase())
      );

      const waitingCount = deptEncounters.filter(e => 
        e.status === "In Queue" || e.status === "Registered" || e.status === "Awaiting Doctor" || e.status === "Doctor Assigned"
      ).length;

      const inConsultCount = deptEncounters.filter(e => e.status === "Under Consultation").length;
      const completedCount = deptEncounters.filter(e => e.status === "Consultation Completed" || e.status === "OP Completed" || e.status === "Billing Completed").length;
      
      const loadPercentage = Math.min(100, Math.round((waitingCount / dept.capacityThreshold) * 100));

      let status = "Optimal";
      if (loadPercentage > 85) status = "Overloaded";
      else if (loadPercentage > 60) status = "High";
      else if (loadPercentage > 30) status = "Normal";

      return {
        ...dept,
        totalEncounters: deptEncounters.length,
        waitingCount,
        inConsultCount,
        completedCount,
        loadPercentage,
        status,
        encounters: deptEncounters
      };
    });
  }, [encounters]);

  // Filtered Encounters for Bottom Activity Roster
  const filteredEncounters = useMemo(() => {
    return encounters.filter(enc => {
      if (selectedDeptFilter !== "All") {
        const encDept = (enc.dept || "").toLowerCase();
        if (!encDept.includes(selectedDeptFilter.toLowerCase())) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const token = (enc.queueToken || enc.opNumber || "").toLowerCase();
        const name = (enc.patientName || "").toLowerCase();
        const umr = (enc.umr || "").toLowerCase();
        const doc = (enc.assignedDoctor || "").toLowerCase();
        const complaint = (enc.chiefComplaint || "").toLowerCase();
        return token.includes(q) || name.includes(q) || umr.includes(q) || doc.includes(q) || complaint.includes(q);
      }

      return true;
    });
  }, [encounters, selectedDeptFilter, searchQuery]);

  // Export CSV Report
  const handleExportCSV = () => {
    const headers = ["Encounter_ID", "UMR", "OP_Number", "Patient_Name", "Age", "Sex", "Department", "Doctor", "Room", "Status", "Diagnosis", "Registration_Time"];
    const rows = encounters.map(e => [
      e.id,
      e.umr,
      e.opNumber,
      `"${e.patientName}"`,
      e.age,
      e.sex,
      `"${e.dept}"`,
      `"${e.assignedDoctor || 'Unassigned'}"`,
      e.room || "Room 101",
      e.status,
      `"${e.diagnosis || 'Pending'}"`,
      e.registrationTime || "10:00 AM"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HospAI_OP_Daily_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      {/* ── TOP HEADER ── */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-gray-900">Outpatient (OP) Management Hub</h1>
            <span className="text-[11px] font-mono font-bold bg-green-50 text-[#15803D] border border-green-200 px-2 py-0.5 rounded">
              ● Live Hospital Sync
            </span>
          </div>
          <p className="text-[12.5px] text-[#64748B] mt-0.5">
            High-level coordination of outpatient departments, doctors, patient queues, and clinical workflow throughput.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateToOPRegistration && (
            <button
              type="button"
              onClick={onNavigateToOPRegistration}
              className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12.5px] font-bold rounded transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Icon.Plus /> Register New OP
            </button>
          )}

          {onNavigateToQueue && (
            <button
              type="button"
              onClick={() => onNavigateToQueue()}
              className="px-3.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#1B4FD8] text-[12.5px] font-bold rounded transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span>🎟️</span> Live Queue
            </button>
          )}

          <button 
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-gray-700 text-[12.5px] font-bold rounded transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Icon.Download /> Export Daily Report
          </button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 max-w-7xl mx-auto w-full">
        
        {/* ── 1. TOP STATS CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-white border border-[#DDE2EC] p-4 rounded hover:border-[#1B4FD8] transition-colors shadow-2xs">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              Total OP Visits Today
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-gray-900">{stats.totalVisits}</div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                +100% Live
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] p-4 rounded hover:border-[#1B4FD8] transition-colors shadow-2xs">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              Currently Waiting
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-amber-600">{stats.waiting}</div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                In Queue
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] p-4 rounded hover:border-[#1B4FD8] transition-colors shadow-2xs">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              In Consultation
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-[#1B4FD8]">{stats.inConsult}</div>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                Active Drs
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] p-4 rounded hover:border-[#1B4FD8] transition-colors shadow-2xs">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              Avg Wait Time
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-gray-900">{stats.avgWait}</div>
              <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                Estimated
              </span>
            </div>
          </div>

          <div className="bg-white border border-[#DDE2EC] p-4 rounded hover:border-[#1B4FD8] transition-colors shadow-2xs col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
              Active Doctors
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-bold text-[#15803D]">{stats.activeDoctors}</div>
              <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                8 Depts
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. TWO COLUMN: DEPARTMENT LOAD & INTERACTIVE OP WORKFLOW PIPELINE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Department Load & Capacity Table */}
          <div className="lg:col-span-2 bg-white border border-[#DDE2EC] rounded shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <div>
                <h2 className="text-[14px] font-bold text-gray-900">Department Load &amp; Capacity Roster</h2>
                <p className="text-[11.5px] text-[#64748B]">Real-time patient waiting queues and capacity utilization across clinics.</p>
              </div>
              {onNavigateToQueue && (
                <button
                  type="button"
                  onClick={() => onNavigateToQueue()}
                  className="text-[12px] font-bold text-[#1B4FD8] hover:underline cursor-pointer"
                >
                  Manage Live Queue →
                </button>
              )}
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="border-b border-[#DDE2EC] bg-[#FAFAFA] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Department</th>
                    <th className="px-4 py-2.5">Active Staff</th>
                    <th className="px-4 py-2.5">Waiting</th>
                    <th className="px-4 py-2.5">In Consult</th>
                    <th className="px-4 py-2.5">Load &amp; Capacity</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                  {departmentRows.map((row) => (
                    <tr key={row.name} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{row.name}</div>
                        <div className="text-[11px] text-[#64748B]">{row.headDoctor}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-gray-800 font-semibold">{row.activeDoctors} / {row.totalDoctors} Drs</span>
                        <div className="text-[10.5px] text-gray-500">{row.rooms.length} Rooms</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-900">
                        {row.waitingCount}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#1B4FD8]">
                        {row.inConsultCount}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-20 px-1.5 py-0.5 text-[10px] font-bold text-center rounded uppercase tracking-wider ${
                            row.status === 'Overloaded' ? 'bg-[#FEE2E2] text-[#991B1B]' :
                            row.status === 'High' ? 'bg-[#FEF3C7] text-[#92400E]' :
                            'bg-[#DCFCE7] text-[#15803D]'
                          }`}>
                            {row.status}
                          </span>
                          <div className="w-20 h-1.5 bg-[#E2E8F0] rounded overflow-hidden">
                            <div 
                              className={`h-full ${row.loadPercentage > 85 ? 'bg-[#DC2626]' : row.loadPercentage > 60 ? 'bg-[#D97706]' : 'bg-[#16A34A]'}`} 
                              style={{ width: `${Math.max(5, row.loadPercentage)}%` }}
                            ></div>
                          </div>
                          <span className="text-[11px] font-mono text-gray-500">{row.loadPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDeptRoster(row)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                            title="Inspect Doctor Roster"
                          >
                            Staffing
                          </button>
                          {onNavigateToQueue && (
                            <button
                              type="button"
                              onClick={() => onNavigateToQueue(row.name)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#1B4FD8] border border-blue-200 text-[11px] font-bold rounded transition-colors cursor-pointer"
                            >
                              Queue →
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive OP Workflow Pipeline Card */}
          <div className="bg-white border border-[#DDE2EC] rounded shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <div>
                <h2 className="text-[14px] font-bold text-gray-900">OP Workflow Pipeline</h2>
                <p className="text-[11.5px] text-[#64748B]">Live throughput across clinical care stages.</p>
              </div>
            </div>

            <div className="p-5 space-y-4 flex-1">
              {[
                { 
                  stage: "1. Registration Desk", 
                  count: `${stats.totalVisits} Patients`, 
                  desc: "New & revisit outpatient intakes", 
                  color: "border-blue-500 text-blue-600 bg-blue-50",
                  actionText: "Open Desk ➔",
                  onClick: onNavigateToOPRegistration 
                },
                { 
                  stage: "2. Nurse Triage & Vitals", 
                  count: `${stats.waiting} in triage`, 
                  desc: "Physiological vitals & assessment", 
                  color: "border-emerald-500 text-emerald-600 bg-emerald-50",
                  actionText: "Vitals Triage ➔",
                  onClick: () => onNavigateToOPWorkflow?.(encounters[0]?.id || "", 3) 
                },
                { 
                  stage: "3. Doctor Consultations", 
                  count: `${stats.inConsult} Active / ${stats.completed} Done`, 
                  desc: "Live chamber clinical examinations", 
                  color: "border-purple-500 text-purple-600 bg-purple-50",
                  actionText: "Doctor Portal ➔",
                  onClick: () => onNavigateToDoctorWorkflow?.(encounters[0]?.id || "") 
                },
                { 
                  stage: "4. Billing & Cashier", 
                  count: `${stats.pendingBilling} Pending Invoices`, 
                  desc: "Consultation & diagnostic settlement", 
                  color: "border-amber-500 text-amber-600 bg-amber-50",
                  actionText: "Billing Desk ➔",
                  onClick: onNavigateToBilling 
                },
                { 
                  stage: "5. Pharmacy Dispensing", 
                  count: `${stats.pharmacyOrders} Prescriptions`, 
                  desc: "Medication fulfillment & live Rx", 
                  color: "border-cyan-500 text-cyan-600 bg-cyan-50",
                  actionText: "Pharmacy ➔",
                  onClick: onNavigateToPharmacy 
                },
              ].map((step, idx) => (
                <div 
                  key={idx} 
                  className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded border-2 flex items-center justify-center font-bold text-xs font-mono ${step.color}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-gray-900">{step.stage}</div>
                      <div className="text-[11px] text-[#64748B]">{step.desc}</div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <span className="font-mono font-bold text-[12px] text-gray-800 bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                      {step.count}
                    </span>
                    {step.onClick && (
                      <button
                        type="button"
                        onClick={step.onClick}
                        className="text-[11px] font-bold text-[#1B4FD8] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        {step.actionText}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ── 3. LIVE OUTPATIENT ENCOUNTERS & ACTIVITY ROSTER ── */}
        <div className="bg-white border border-[#DDE2EC] rounded shadow-xs overflow-hidden space-y-0">
          <div className="px-5 py-3.5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-gray-900">Today's Live Outpatient Encounters</h2>
                <span className="text-[11px] font-mono font-bold bg-blue-100 text-[#1B4FD8] px-2 py-0.5 rounded">
                  {filteredEncounters.length} Records
                </span>
              </div>
              <p className="text-[11.5px] text-[#64748B]">All active and historical outpatient registrations linked to permanent UMRs.</p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Department Filter Selector */}
              <div className="flex items-center gap-1.5 bg-white border border-[#CBD5E1] rounded px-2.5 py-1 text-[12px]">
                <span className="text-[#64748B] font-semibold text-[11px]">Dept:</span>
                <select
                  value={selectedDeptFilter}
                  onChange={e => setSelectedDeptFilter(e.target.value)}
                  className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Departments ({encounters.length})</option>
                  {DEPARTMENTS_CONFIG.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search patient, UMR, OP No, Doctor..."
                  className="pl-7 pr-3 py-1 text-[12px] border border-[#CBD5E1] rounded bg-white focus:outline-none focus:border-[#1B4FD8] w-52 sm:w-64"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs"><Icon.Search /></span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredEncounters.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-[13px]">
                No encounters found matching the selected criteria.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#FAFAFA] border-b border-[#DDE2EC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Permanent UMR &amp; OP</th>
                    <th className="px-4 py-2.5">Patient Details</th>
                    <th className="px-4 py-2.5">Department &amp; Doctor</th>
                    <th className="px-4 py-2.5">Vitals / Notes</th>
                    <th className="px-4 py-2.5">Encounter Status</th>
                    <th className="px-4 py-2.5">Billing</th>
                    <th className="px-4 py-2.5 text-right">Complete Journey</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-[12.5px]">
                  {filteredEncounters.map((enc) => {
                    const isCompleted = enc.status === "Consultation Completed" || enc.status === "OP Completed" || enc.status === "Billing Completed";
                    return (
                      <tr key={enc.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-[12px] text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                            {enc.opNumber}
                          </div>
                          <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                            UMR: {enc.umr}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-bold text-gray-900">{enc.patientName}</div>
                          <div className="text-[11px] text-[#64748B]">
                            {enc.age} yrs · {enc.sex} · {enc.phone}
                          </div>
                          <div className="text-[10.5px] text-gray-500 truncate max-w-xs mt-0.5">
                            {enc.chiefComplaint || enc.symptoms.join(", ") || "General Consultation"}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-[11px] inline-block mb-0.5">
                            {enc.dept}
                          </span>
                          <div className="text-[11.5px] text-gray-700 font-medium flex items-center gap-1">
                            <span>👨‍⚕️</span> {enc.assignedDoctor || "Physician"}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-[11.5px] text-gray-700">
                          {enc.vitals?.bp ? (
                            <div>
                              <span className="font-mono font-semibold">{enc.vitals.bp}</span> · {enc.vitals.pulse}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Pending Triage</span>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded uppercase ${
                            isCompleted ? 'bg-green-100 text-[#15803D]' :
                            enc.status === 'Under Consultation' ? 'bg-blue-100 text-[#1D4ED8]' :
                            'bg-amber-100 text-[#B45309]'
                          }`}>
                            {enc.status}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded ${
                            enc.billing?.status === 'Paid' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            ${enc.billing?.total || 50}.00 ({enc.billing?.status || 'Pending'})
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Complete Patient Journey Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedJourneyEncounter(enc)}
                              className="px-3 py-1.5 bg-gradient-to-r from-[#1B4FD8] to-[#2563EB] hover:from-[#1740B4] hover:to-[#1D4ED8] text-white text-[11.5px] font-bold rounded shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                              title="View Complete End-to-End Patient Journey Timeline"
                            >
                              <span>✨</span> Journey Timeline →
                            </button>

                            {onNavigateToDoctorWorkflow && (
                              <button
                                type="button"
                                onClick={() => onNavigateToDoctorWorkflow(enc.id)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1B4FD8] border border-blue-200 text-[11px] font-bold rounded transition-colors cursor-pointer"
                                title="Open Doctor Examination Form"
                              >
                                Doctor →
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* ── MODAL 1: COMPLETE PATIENT JOURNEY TIMELINE MODAL (ARRIVAL TO BILLING) ── */}
      {selectedJourneyEncounter && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-white border-2 border-[#CBD5E1] rounded shadow-2xl max-w-3xl w-full my-auto flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-[#0F172A] text-white flex justify-between items-center flex-shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#1B4FD8] flex items-center justify-center text-lg font-bold">
                  🧭
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-bold text-white">Complete Outpatient Clinical Journey</h3>
                    <span className="font-mono text-[11px] font-bold bg-blue-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded">
                      {selectedJourneyEncounter.opNumber}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-300">
                    Comprehensive chronological care timeline from hospital arrival to final billing settlement.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedJourneyEncounter(null)}
                className="text-slate-400 hover:text-white text-xl p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Patient Credentials Card */}
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] flex-shrink-0">
              <div>
                <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">Patient Name</span>
                <span className="font-bold text-gray-900 text-[13.5px]">{selectedJourneyEncounter.patientName}</span>
                <span className="text-[11px] text-[#64748B] block">{selectedJourneyEncounter.age} yrs · {selectedJourneyEncounter.sex}</span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">Permanent UMR (Lifetime)</span>
                <span className="font-mono font-bold text-[#1B4FD8] text-[13px] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                  {selectedJourneyEncounter.umr}
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">{selectedJourneyEncounter.phone}</span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">Department &amp; Doctor</span>
                <span className="font-semibold text-gray-900 block">{selectedJourneyEncounter.dept}</span>
                <span className="text-[11px] text-gray-600 block">{selectedJourneyEncounter.assignedDoctor || "Attending Physician"} · {selectedJourneyEncounter.room || "Room 101"}</span>
              </div>

              <div>
                <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">Current Status &amp; Total</span>
                <span className="font-bold text-[#15803D] bg-green-50 px-2 py-0.5 rounded border border-green-200 inline-block text-[11px]">
                  {selectedJourneyEncounter.status}
                </span>
                <span className="text-[11px] font-mono font-bold text-gray-700 block mt-0.5">
                  Fee: ${selectedJourneyEncounter.billing?.total || 50}.00 ({selectedJourneyEncounter.billing?.status || 'Pending'})
                </span>
              </div>
            </div>

            {/* Scrollable Journey Milestones Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Timeline Container */}
              <div className="relative pl-6 space-y-6 border-l-2 border-[#CBD5E1] ml-4">
                
                {/* 1. ARRIVAL & CHECK-IN */}
                <div className="relative group">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded bg-[#1B4FD8] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                    1
                  </div>
                  <div className="bg-white border border-[#CBD5E1] rounded p-4 shadow-2xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                        <span>🏥</span> Arrival &amp; OPD Check-In
                      </div>
                      <span className="font-mono text-[11.5px] font-bold text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {selectedJourneyEncounter.timestamps?.arrival || selectedJourneyEncounter.registrationTime || "10:00 AM"}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-700">
                      Patient arrived at Hospital Outpatient Lobby. Walk-in token entry initialized and ticket printed.
                    </p>
                    <div className="text-[11px] text-[#64748B] bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                      Token ID: <strong>{selectedJourneyEncounter.queueToken || selectedJourneyEncounter.opNumber}</strong> · Type: <strong>{selectedJourneyEncounter.isNew ? "New Outpatient" : "Returning Patient Revisit"}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. REGISTRATION & UMR CONFIRMATION */}
                <div className="relative group">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded bg-[#1B4FD8] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                    2
                  </div>
                  <div className="bg-white border border-[#CBD5E1] rounded p-4 shadow-2xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                        <span>📝</span> OP Registration &amp; Lifetime UMR Verification
                      </div>
                      <span className="font-mono text-[11.5px] font-bold text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {selectedJourneyEncounter.timestamps?.registration || selectedJourneyEncounter.registrationTime || "10:05 AM"}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-700">
                      Demographic credentials verified against permanent master database. Lifetime <strong>{selectedJourneyEncounter.umr}</strong> linked with today's visit OP number <strong>{selectedJourneyEncounter.opNumber}</strong>.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-600">
                      <span>✓ Official OP Pass Issued</span>
                      <span>•</span>
                      <span>Contact: {selectedJourneyEncounter.phone}</span>
                      <span>•</span>
                      <span>Address: {selectedJourneyEncounter.address || "Boston, MA"}</span>
                    </div>
                  </div>
                </div>

                {/* 3. SYMPTOMS & AI CLINICAL TRIAGE */}
                <div className="relative group">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded bg-[#8B5CF6] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                    3
                  </div>
                  <div className="bg-white border border-[#CBD5E1] rounded p-4 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                        <span>🤖</span> Symptom Intake &amp; AI Specialty Recommendation
                      </div>
                      <span className="font-mono text-[11.5px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {selectedJourneyEncounter.timestamps?.symptoms || "10:10 AM"}
                      </span>
                    </div>
                    <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0] text-[12px]">
                      <span className="font-bold text-[#64748B] block text-[10.5px] uppercase">Presenting Chief Complaints:</span>
                      <span className="text-gray-900 font-medium">
                        "{selectedJourneyEncounter.chiefComplaint || selectedJourneyEncounter.symptoms?.join(", ") || "General outpatient evaluation requested."}"
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11.5px]">
                      <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200">
                        AI Specialty: {selectedJourneyEncounter.dept} (96% Confidence)
                      </span>
                      <span className="text-[#64748B]">Assigned to: <strong>{selectedJourneyEncounter.assignedDoctor || "Physician"}</strong></span>
                    </div>
                  </div>
                </div>

                {/* 4. NURSE STATION & VITAL SIGNS */}
                <div className="relative group">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded bg-[#10B981] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                    4
                  </div>
                  <div className="bg-white border border-[#CBD5E1] rounded p-4 shadow-2xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                        <span>🩺</span> Nurse Station Triage &amp; Baseline Vitals
                      </div>
                      <span className="font-mono text-[11.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedJourneyEncounter.timestamps?.vitalsRecorded || "10:18 AM"}
                      </span>
                    </div>

                    {/* Vitals Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11.5px]">
                      <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0] text-center">
                        <span className="text-[#64748B] block text-[10px] uppercase font-bold">Blood Pressure</span>
                        <span className="font-mono font-bold text-gray-900 text-[13px]">{selectedJourneyEncounter.vitals?.bp || "120/80 mmHg"}</span>
                      </div>
                      <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0] text-center">
                        <span className="text-[#64748B] block text-[10px] uppercase font-bold">Heart Rate</span>
                        <span className="font-mono font-bold text-gray-900 text-[13px]">{selectedJourneyEncounter.vitals?.pulse || "76 bpm"}</span>
                      </div>
                      <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0] text-center">
                        <span className="text-[#64748B] block text-[10px] uppercase font-bold">Temperature</span>
                        <span className="font-mono font-bold text-gray-900 text-[13px]">{selectedJourneyEncounter.vitals?.temp || "98.6 °F"}</span>
                      </div>
                      <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0] text-center">
                        <span className="text-[#64748B] block text-[10px] uppercase font-bold">SpO2 Oxygen</span>
                        <span className="font-mono font-bold text-gray-900 text-[13px]">{selectedJourneyEncounter.vitals?.spo2 || "99%"}</span>
                      </div>
                      <div className="bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0] text-center">
                        <span className="text-[#64748B] block text-[10px] uppercase font-bold">Body Weight</span>
                        <span className="font-mono font-bold text-gray-900 text-[13px]">{selectedJourneyEncounter.vitals?.weight || "74 kg"}</span>
                      </div>
                    </div>

                    <div className="text-[11.5px] text-[#166534] bg-[#F0FDF4] p-2 rounded border border-green-200">
                      👩‍⚕️ <strong>Nurse Assessment:</strong> {selectedJourneyEncounter.vitals?.notes || "Alert, oriented, stable physiological baseline recorded."}
                    </div>
                  </div>
                </div>

                {/* 5. DOCTOR QUEUE ALLOCATION */}
                <div className="relative group">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded bg-[#F59E0B] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                    5
                  </div>
                  <div className="bg-white border border-[#CBD5E1] rounded p-4 shadow-2xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                        <span>⏳</span> Doctor Queue Allocation &amp; Chamber Calling
                      </div>
                      <span className="font-mono text-[11.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {selectedJourneyEncounter.timestamps?.doctorAssigned || "10:25 AM"}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-700">
                      Allocated to <strong>{selectedJourneyEncounter.assignedDoctor || "Attending Physician"}</strong> in <strong>{selectedJourneyEncounter.room || "Room 101"}</strong> with live token <strong>#{selectedJourneyEncounter.queueToken || selectedJourneyEncounter.opNumber}</strong>. Broadcasted on waiting room kiosk.
                    </p>
                  </div>
                </div>

                {/* 6. PHYSICIAN CONSULTATION & LIVE RX PAD */}
                <div className="relative group">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded bg-[#1B4FD8] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                    6
                  </div>
                  <div className="bg-white border-2 border-blue-200 rounded p-4 shadow-xs space-y-3">
                    <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                      <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                        <span>🩺</span> Physician Examination &amp; Live Prescription (Rx)
                      </div>
                      <span className="font-mono text-[11.5px] font-bold text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {selectedJourneyEncounter.timestamps?.consultationStart || "10:32 AM"} — {selectedJourneyEncounter.timestamps?.consultationEnd || "10:45 AM"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                      <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                        <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">Clinical Diagnosis</span>
                        <span className="font-bold text-gray-900 block mt-0.5">
                          {selectedJourneyEncounter.diagnosis || "Acute Coronary Syndrome Rule-Out / Stable Angina"}
                        </span>
                        <span className="text-[11px] font-mono text-[#1B4FD8]">ICD-10: {selectedJourneyEncounter.icd10 || "I20.9"}</span>
                      </div>

                      <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                        <span className="text-[10.5px] uppercase font-bold text-[#64748B] block">Diagnostic Investigations</span>
                        <span className="font-medium text-gray-800 block mt-0.5">
                          {selectedJourneyEncounter.investigations && selectedJourneyEncounter.investigations.length > 0 
                            ? selectedJourneyEncounter.investigations.join(", ") 
                            : "ECG 12-Lead, Serum Troponin I, Lipid Profile"}
                        </span>
                      </div>
                    </div>

                    {/* Prescribed Medications Pad */}
                    <div className="space-y-1 text-[12px]">
                      <span className="text-[11px] uppercase font-bold text-[#64748B] block">Prescribed Medications (Rx):</span>
                      <div className="bg-white border border-[#CBD5E1] rounded overflow-hidden">
                        <table className="w-full text-left text-[11.5px]">
                          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-bold text-[#64748B]">
                            <tr>
                              <th className="px-3 py-1.5">Medicine</th>
                              <th className="px-3 py-1.5">Dosage</th>
                              <th className="px-3 py-1.5">Frequency</th>
                              <th className="px-3 py-1.5">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F1F5F9]">
                            {selectedJourneyEncounter.prescription && selectedJourneyEncounter.prescription.length > 0 ? (
                              selectedJourneyEncounter.prescription.map((rx, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-1.5 font-semibold text-gray-900">{rx.medicine}</td>
                                  <td className="px-3 py-1.5 text-gray-700">{rx.dosage}</td>
                                  <td className="px-3 py-1.5 text-gray-700">{rx.frequency}</td>
                                  <td className="px-3 py-1.5 text-gray-700">{rx.duration}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="px-3 py-1.5 font-semibold text-gray-900">Aspirin 81mg</td>
                                <td className="px-3 py-1.5 text-gray-700">1 tab</td>
                                <td className="px-3 py-1.5 text-gray-700">OD (Once Daily)</td>
                                <td className="px-3 py-1.5 text-gray-700">30 days</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Advice */}
                    <div className="text-[11.5px] text-gray-700 bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                      <strong>Doctor Advice:</strong> {selectedJourneyEncounter.advice || "Avoid strenuous exertion, follow heart-healthy diet, and follow up in 2 weeks."}
                    </div>
                  </div>
                </div>

                {/* 7. BILLING SETTLEMENT & INVOICE */}
                <div className="relative group">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded bg-[#10B981] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                    7
                  </div>
                  <div className="bg-white border border-[#CBD5E1] rounded p-4 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                        <span>💳</span> Billing Settlement &amp; Official Receipt
                      </div>
                      <span className="font-mono text-[11.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {selectedJourneyEncounter.timestamps?.billingCompleted || "10:55 AM"}
                      </span>
                    </div>

                    <div className="bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0] space-y-1.5 text-[12px]">
                      <div className="flex justify-between text-gray-700">
                        <span>1. Physician Outpatient Consultation Fee</span>
                        <span className="font-mono font-bold text-gray-900">${selectedJourneyEncounter.billing?.consultationFee || 50}.00</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>2. Diagnostic Investigations / Triage</span>
                        <span className="font-mono font-bold text-gray-900">${selectedJourneyEncounter.billing?.labFee || 40}.00</span>
                      </div>
                      <div className="pt-1.5 border-t border-[#E2E8F0] flex justify-between font-bold text-[13px] text-gray-900">
                        <span>Total Official Settlement:</span>
                        <span className="font-mono text-emerald-700">${selectedJourneyEncounter.billing?.total || 90}.00 (Status: {selectedJourneyEncounter.billing?.status || 'Paid'})</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 8. PHARMACY & DISPENSING */}
                <div className="relative group">
                  <div className="absolute -left-[31px] top-0 w-6 h-6 rounded bg-[#06B6D4] text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shadow-xs">
                    8
                  </div>
                  <div className="bg-white border border-[#CBD5E1] rounded p-4 shadow-2xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-[13.5px] text-gray-900 flex items-center gap-1.5">
                        <span>💊</span> Pharmacy Dispensing &amp; Visit Completed
                      </div>
                      <span className="font-mono text-[11.5px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        {selectedJourneyEncounter.timestamps?.visitCompleted || "11:02 AM"}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-700">
                      Prescriptions routed to outpatient pharmacy queue. Patient departure counselled with lifestyle instructions.
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="px-6 py-3.5 bg-gray-50 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="text-[11.5px] text-[#64748B]">
                Permanent UMR: <strong>{selectedJourneyEncounter.umr}</strong> · Visit: <strong>{selectedJourneyEncounter.opNumber}</strong>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-white hover:bg-gray-100 border border-[#CBD5E1] text-gray-800 text-[12px] font-bold rounded shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Icon.Download /> Print Journey Report
                </button>

                {onNavigateToDoctorWorkflow && (
                  <button
                    type="button"
                    onClick={() => {
                      const encId = selectedJourneyEncounter.id;
                      setSelectedJourneyEncounter(null);
                      onNavigateToDoctorWorkflow(encId);
                    }}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#1B4FD8] border border-blue-200 text-[12px] font-bold rounded transition-colors cursor-pointer"
                  >
                    Open Doctor Portal →
                  </button>
                )}

                {onNavigateToOPWorkflow && (
                  <button
                    type="button"
                    onClick={() => {
                      const encId = selectedJourneyEncounter.id;
                      setSelectedJourneyEncounter(null);
                      onNavigateToOPWorkflow(encId, 1);
                    }}
                    className="px-4 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12px] font-bold rounded shadow-xs transition-colors cursor-pointer"
                  >
                    Open Full 6-Step Clinical Journey ➔
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 2: DEPARTMENT STAFFING & ROOMS ── */}
      {selectedDeptRoster && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border-2 border-[#CBD5E1] rounded shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                  <span>🏥</span> {selectedDeptRoster.name} — Staffing &amp; Capacity
                </h3>
                <p className="text-[11.5px] text-[#64748B]">Active physicians and chamber room assignments.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDeptRoster(null)}
                className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[12.5px]">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded flex justify-between items-center">
                <div>
                  <div className="font-bold text-[#1E3A8A]">{selectedDeptRoster.headDoctor}</div>
                  <div className="text-[11px] text-[#3B82F6]">Head of Department</div>
                </div>
                <span className="text-[11px] font-bold bg-white text-[#1B4FD8] px-2.5 py-1 rounded border border-blue-200">
                  {selectedDeptRoster.code}
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  Allocated Examination Rooms ({selectedDeptRoster.rooms.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedDeptRoster.rooms.map((rm) => (
                    <div key={rm} className="p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded flex items-center justify-between">
                      <span className="font-bold text-gray-800">{rm}</span>
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                        Operational
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-between items-center">
                <span className="text-[11.5px] text-[#64748B]">
                  Capacity Threshold: <strong>{selectedDeptRoster.capacityThreshold} patients/hr</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDeptRoster(null)}
                  className="px-4 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white rounded font-bold text-[12px] shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EXPORT OP REPORT ── */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border-2 border-[#CBD5E1] rounded shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                  <span>📊</span> Export Daily Outpatient Report
                </h3>
                <p className="text-[11.5px] text-[#64748B]">Generate comprehensive CSV summary for hospital audits.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[12.5px]">
              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Total OP Encounters:</span>
                  <strong className="font-mono text-gray-900">{stats.totalVisits}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Consultations Completed:</span>
                  <strong className="font-mono text-green-700">{stats.completed}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Pending Waiting Queue:</span>
                  <strong className="font-mono text-amber-700">{stats.waiting}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Export Format:</span>
                  <strong className="font-mono text-[#1B4FD8]">CSV (Spreadsheet Compatible)</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold text-[12px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-4 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white rounded font-bold text-[12px] shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Icon.Download /> Download CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
