import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './icons';
import { db, DBOPEncounter, DBPatient } from '../services/db';

interface QueueManagementProps {
  onNavigateToOPWorkflow?: (encId: string, step?: number) => void;
  onNavigateToDoctorWorkflow?: (encId: string) => void;
  onNavigateToOPRegistration?: () => void;
}

const DEPARTMENTS = [
  "All Departments",
  "Cardiology",
  "Orthopedics",
  "General Medicine",
  "Pediatrics",
  "Neurology",
  "Dermatology",
  "ENT",
  "Emergency / Casualty"
];

const DOCTOR_MAP: Record<string, { name: string; room: string }[]> = {
  "Cardiology": [
    { name: "Dr. Arjun Mehta", room: "Room 107" },
    { name: "Dr. Rajesh Sharma", room: "Room 104" },
    { name: "Dr. Priya Patel", room: "Room 105" },
    { name: "Dr. Sarah Jenkins", room: "Room 102" }
  ],
  "Orthopedics": [
    { name: "Dr. David Anderson", room: "Room 112" },
    { name: "Dr. Sanjay Kapoor", room: "Room 116" }
  ],
  "General Medicine": [
    { name: "Dr. Vikram Malhotra", room: "Room 111" },
    { name: "Dr. Anita Desai", room: "Room 101" },
    { name: "Dr. Ramesh Kumar", room: "Room 103" }
  ],
  "Pediatrics": [
    { name: "Dr. Maya Lin", room: "Room 120" },
    { name: "Dr. Robert Chen", room: "Room 121" }
  ],
  "Neurology": [
    { name: "Dr. Gregory House", room: "Room 130" },
    { name: "Dr. Lisa Cuddy", room: "Room 131" }
  ],
  "Dermatology": [
    { name: "Dr. Elena Rostova", room: "Room 140" }
  ],
  "ENT": [
    { name: "Dr. Marcus Vance", room: "Room 150" }
  ],
  "Emergency / Casualty": [
    { name: "Dr. John Carter", room: "Trauma Bay 1" },
    { name: "Dr. Kerry Weaver", room: "Trauma Bay 2" }
  ]
};

// Play audio chime using Web Audio API
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Tone 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Tone 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.16);
    gain2.gain.setValueAtTime(0.15, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.8);
  } catch {
    // AudioContext fallback
  }
}

// Speak announcement using Web Speech API
function speakAnnouncement(text: string) {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  } catch {
    // speech synthesis fallback
  }
}

export default function QueueManagement({
  onNavigateToOPWorkflow,
  onNavigateToDoctorWorkflow,
  onNavigateToOPRegistration,
}: QueueManagementProps) {
  // State
  const [encounters, setEncounters] = useState<DBOPEncounter[]>([]);
  const [patients, setPatients] = useState<DBPatient[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("All Departments");
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // ALL, WAITING, CONSULTING, COMPLETED
  const [searchQuery, setSearchQuery] = useState("");
  const [isTvKioskMode, setIsTvKioskMode] = useState(false);
  
  // Active call state
  const [nowCalling, setNowCalling] = useState<{
    token: string;
    patientName: string;
    room: string;
    doctor: string;
    dept: string;
    timestamp: string;
  } | null>(null);

  // Call history for waiting room kiosk display
  const [callHistory, setCallHistory] = useState<Array<{
    token: string;
    room: string;
    patientName: string;
    dept: string;
  }>>([
    { token: "C-OP123", room: "Room 107", patientName: "Rana Dhaggubati", dept: "Cardiology" },
    { token: "O-OP001", room: "Room 112", patientName: "Alex Turner", dept: "Orthopedics" },
    { token: "G-OP055", room: "Room 111", patientName: "Suresh Nair", dept: "General Medicine" },
  ]);

  // Modals
  const [isIssueTokenOpen, setIsIssueTokenOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferTargetEncounter, setTransferTargetEncounter] = useState<DBOPEncounter | null>(null);
  const [transferDept, setTransferDept] = useState("Cardiology");
  const [transferDoctor, setTransferDoctor] = useState("");
  const [notificationToast, setNotificationToast] = useState<{ title: string; desc: string } | null>(null);
  const [selectedJourneyEncounter, setSelectedJourneyEncounter] = useState<DBOPEncounter | null>(null);

  // Issue Token Form State
  const [tokenPatientMode, setTokenPatientMode] = useState<"existing" | "new">("existing");
  const [tokenSelectedUmr, setTokenSelectedUmr] = useState("");
  const [tokenNewName, setTokenNewName] = useState("");
  const [tokenNewAge, setTokenNewAge] = useState(35);
  const [tokenNewSex, setTokenNewSex] = useState<"Male" | "Female" | "Other">("Male");
  const [tokenNewPhone, setTokenNewPhone] = useState("");
  const [tokenDept, setTokenDept] = useState("Cardiology");
  const [tokenDoctor, setTokenDoctor] = useState("");
  const [tokenPriority, setTokenPriority] = useState<"Routine" | "Urgent" | "Emergency">("Routine");
  const [tokenComplaint, setTokenComplaint] = useState("");

  // Load from database & subscribe to updates
  useEffect(() => {
    const loadData = () => {
      const allEncounters = db.getEncounters();
      const allPatients = db.getPatients();
      setEncounters(allEncounters);
      setPatients(allPatients);

      // Set initial nowCalling if empty
      const inConsult = allEncounters.find(e => e.status === "Under Consultation" || e.status === "Doctor Assigned");
      if (inConsult && !nowCalling) {
        setNowCalling({
          token: inConsult.queueToken || inConsult.opNumber,
          patientName: inConsult.patientName,
          room: inConsult.room || "Room 107",
          doctor: inConsult.assignedDoctor || "Dr. Arjun Mehta",
          dept: inConsult.dept,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    };

    loadData();
    const unsubscribe = db.subscribe(loadData);
    return () => {
      unsubscribe();
    };
  }, []);

  // Sync token doctor choices when dept changes
  useEffect(() => {
    const docs = DOCTOR_MAP[tokenDept] || [];
    if (docs.length > 0) {
      setTokenDoctor(docs[0].name);
    } else {
      setTokenDoctor("");
    }
  }, [tokenDept]);

  // Sync transfer doctor choices when transfer dept changes
  useEffect(() => {
    const docs = DOCTOR_MAP[transferDept] || [];
    if (docs.length > 0) {
      setTransferDoctor(docs[0].name);
    } else {
      setTransferDoctor("");
    }
  }, [transferDept]);

  // Department-wise patient counts
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { "All Departments": encounters.length };
    DEPARTMENTS.slice(1).forEach(d => { counts[d] = 0; });
    
    encounters.forEach(enc => {
      const dept = enc.dept || "General Medicine";
      if (counts[dept] !== undefined) {
        counts[dept] += 1;
      } else {
        counts["General Medicine"] = (counts["General Medicine"] || 0) + 1;
      }
    });
    return counts;
  }, [encounters]);

  // Filtered queue items based on selected department and search
  const filteredQueue = useMemo(() => {
    return encounters.filter(enc => {
      // 1. Department Filter
      if (selectedDept !== "All Departments") {
        const encDept = (enc.dept || "").toLowerCase();
        const selDept = selectedDept.toLowerCase();
        if (!encDept.includes(selDept) && !selDept.includes(encDept)) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === "WAITING") {
        if (enc.status === "Consultation Completed" || enc.status === "OP Completed" || enc.status === "Under Consultation") {
          return false;
        }
      } else if (statusFilter === "CONSULTING") {
        if (enc.status !== "Under Consultation" && enc.status !== "Doctor Assigned") {
          return false;
        }
      } else if (statusFilter === "COMPLETED") {
        if (enc.status !== "Consultation Completed" && enc.status !== "OP Completed" && enc.status !== "Billing Completed") {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const token = (enc.queueToken || enc.opNumber || "").toLowerCase();
        const name = (enc.patientName || "").toLowerCase();
        const umr = (enc.umr || "").toLowerCase();
        const doc = (enc.assignedDoctor || "").toLowerCase();
        const complaint = (enc.chiefComplaint || "").toLowerCase();
        const symptoms = (enc.symptoms || []).join(" ").toLowerCase();
        return (
          token.includes(q) ||
          name.includes(q) ||
          umr.includes(q) ||
          doc.includes(q) ||
          complaint.includes(q) ||
          symptoms.includes(q)
        );
      }

      return true;
    });
  }, [encounters, selectedDept, statusFilter, searchQuery]);

  // Metrics for selected department (or all)
  const metrics = useMemo(() => {
    const deptEncounters = selectedDept === "All Departments"
      ? encounters
      : encounters.filter(e => (e.dept || "").toLowerCase().includes(selectedDept.toLowerCase()));

    const waiting = deptEncounters.filter(e => 
      e.status === "In Queue" || e.status === "Registered" || e.status === "Awaiting Doctor" || e.status === "Doctor Assigned" || e.status === "Symptoms Captured" || e.status === "AI Recommended"
    ).length;

    const inConsult = deptEncounters.filter(e => 
      e.status === "Under Consultation"
    ).length;

    const completed = deptEncounters.filter(e => 
      e.status === "Consultation Completed" || e.status === "OP Completed" || e.status === "Billing Completed"
    ).length;

    const total = deptEncounters.length;

    return {
      waiting,
      inConsult,
      completed,
      total,
      avgWait: total > 0 ? `${Math.max(8, 14 + waiting * 3)}m` : "0m"
    };
  }, [encounters, selectedDept]);

  // Show Toast Alert
  const triggerToast = (title: string, desc: string) => {
    setNotificationToast({ title, desc });
    setTimeout(() => {
      setNotificationToast(null);
    }, 4000);
  };

  // Actions
  const handleCallPatient = (enc: DBOPEncounter) => {
    playChime();
    const token = enc.queueToken || enc.opNumber;
    const room = enc.room || "Room 107";
    const doctor = enc.assignedDoctor || "Attending Physician";

    db.updateEncounter(enc.id, {
      status: "Under Consultation",
      timestamps: {
        ...enc.timestamps,
        consultationStart: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });

    const callObj = {
      token,
      patientName: enc.patientName,
      room,
      doctor,
      dept: enc.dept,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setNowCalling(callObj);

    setCallHistory(prev => [
      { token, room, patientName: enc.patientName, dept: enc.dept },
      ...prev.filter(p => p.token !== token).slice(0, 3)
    ]);

    speakAnnouncement(`Token ${token}, patient ${enc.patientName}, please proceed to ${room}`);

    triggerToast(
      `Calling Token #${token}`,
      `${enc.patientName} called to ${room} with ${doctor}.`
    );
  };

  const handleCompleteConsultation = (enc: DBOPEncounter) => {
    db.updateEncounter(enc.id, {
      status: "Consultation Completed",
      timestamps: {
        ...enc.timestamps,
        consultationEnd: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });

    triggerToast(
      `Consultation Completed: #${enc.queueToken || enc.opNumber}`,
      `${enc.patientName}'s consultation marked completed.`
    );
  };

  const handleOpenTransfer = (enc: DBOPEncounter) => {
    setTransferTargetEncounter(enc);
    setTransferDept(enc.dept || "Cardiology");
    const docs = DOCTOR_MAP[enc.dept || "Cardiology"] || [];
    setTransferDoctor(docs[0]?.name || "");
    setIsTransferOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (!transferTargetEncounter) return;

    const docObj = (DOCTOR_MAP[transferDept] || []).find(d => d.name === transferDoctor);
    const room = docObj?.room || "Room 101";

    db.updateEncounter(transferTargetEncounter.id, {
      dept: transferDept,
      assignedDoctor: transferDoctor || `Dr. Specialist (${transferDept})`,
      room: room,
      status: "Doctor Assigned"
    });

    setIsTransferOpen(false);
    triggerToast(
      `Patient Transferred to ${transferDept}`,
      `${transferTargetEncounter.patientName} assigned to ${transferDoctor} in ${room}.`
    );
  };

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();

    let targetPatient: DBPatient | undefined;
    let targetEncounter: DBOPEncounter | undefined;

    if (tokenPatientMode === "existing") {
      targetPatient = patients.find(p => p.umr === tokenSelectedUmr) || patients[0];
      if (!targetPatient) {
        alert("Please select a patient or create a new patient.");
        return;
      }

      targetEncounter = db.createRevisitEncounter(targetPatient.umr, {
        dept: tokenDept,
        chiefComplaint: tokenComplaint || `Walk-in outpatient consultation for ${tokenDept}`
      });
    } else {
      if (!tokenNewName.trim()) {
        alert("Please enter patient name.");
        return;
      }
      const parts = tokenNewName.trim().split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || "Patient";

      const res = db.registerNewPatient({
        firstName,
        lastName,
        age: Number(tokenNewAge) || 30,
        sex: tokenNewSex,
        phone: tokenNewPhone || "(617) 555-0199",
        dept: tokenDept,
        chiefComplaint: tokenComplaint || `OP Consultation - ${tokenDept}`
      });
      targetPatient = res.patient;
      targetEncounter = res.encounter;
    }

    const docObj = (DOCTOR_MAP[tokenDept] || []).find(d => d.name === tokenDoctor);
    const room = docObj?.room || "Room 101";
    const deptPrefix = tokenDept.charAt(0).toUpperCase();
    const tokenStr = `${deptPrefix}-${targetEncounter.opNumber}`;

    db.updateEncounter(targetEncounter.id, {
      dept: tokenDept,
      assignedDoctor: tokenDoctor || docObj?.name || "Attending Physician",
      room: room,
      queueToken: tokenStr,
      status: tokenPriority === "Emergency" ? "Under Consultation" : "In Queue"
    });

    setIsIssueTokenOpen(false);
    triggerToast(
      `Queue Token Issued: ${tokenStr}`,
      `Token ${tokenStr} issued for ${targetPatient.name} in ${tokenDept}.`
    );

    if (tokenPriority === "Emergency") {
      playChime();
      speakAnnouncement(`Emergency priority token ${tokenStr}, please proceed directly to ${room}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Under Consultation':
      case 'IN_CONSULTATION':
        return (
          <span className="bg-[#DBEAFE] text-[#1E3A8A] border border-[#BFDBFE] text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1D4ED8] animate-pulse"></span>
            In Consult
          </span>
        );
      case 'Doctor Assigned':
      case 'CALLED':
        return (
          <span className="bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-ping"></span>
            Calling
          </span>
        );
      case 'Registered':
      case 'Symptoms Captured':
      case 'AI Recommended':
      case 'In Queue':
      case 'Awaiting Doctor':
      case 'WAITING':
        return (
          <span className="bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap">
            Waiting
          </span>
        );
      case 'Consultation Completed':
      case 'Billing Completed':
      case 'OP Completed':
      case 'COMPLETED':
        return (
          <span className="bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC] text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap inline-flex items-center gap-0.5">
            <span>✓</span> Done
          </span>
        );
      case 'No Show':
      case 'NO_SHOW':
        return (
          <span className="bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap">
            No Show
          </span>
        );
      default:
        return (
          <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] overflow-hidden">
      {/* ── NOTIFICATION TOAST ── */}
      {notificationToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1E293B] text-white border border-slate-700 rounded p-3.5 shadow-2xl flex items-start gap-3 max-w-sm animate-in slide-in-from-top-3">
          <span className="text-lg">📢</span>
          <div className="flex-1">
            <div className="text-[13px] font-bold text-sky-400">{notificationToast.title}</div>
            <div className="text-[11.5px] text-slate-300 mt-0.5">{notificationToast.desc}</div>
          </div>
          <button
            type="button"
            onClick={() => setNotificationToast(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── TOP HEADER ── */}
      <div className="bg-white border-b border-[#DDE2EC] px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-bold text-gray-900">Outpatient Queue Management</h1>
            <span className="text-[11px] font-mono font-bold bg-blue-50 text-[#1B4FD8] border border-blue-200 px-2 py-0.5 rounded">
              {filteredQueue.length} Active Records
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B] mt-0.5">
            Real-time outpatient patient flow, doctor queue allocations, room assignments, and live waiting room broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsTvKioskMode(true)}
            className="px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-[12px] font-bold rounded transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Open Waiting Room Kiosk TV Mode"
          >
            <span>📺</span> TV Display Mode
          </button>

          <button 
            type="button"
            onClick={() => setIsIssueTokenOpen(true)}
            className="px-3.5 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[12px] font-bold rounded transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Icon.Plus /> Issue Queue Token
          </button>
        </div>
      </div>

      {/* ── DEPARTMENT PILL TABS BAR ── */}
      <div className="bg-white border-b border-[#E2E8F0] px-5 py-2 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 no-scrollbar">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mr-1 flex items-center gap-1 flex-shrink-0">
          <span>🏥</span> Dept:
        </span>
        {DEPARTMENTS.map((dept) => {
          const isSelected = selectedDept === dept;
          const count = departmentCounts[dept] || 0;
          return (
            <button
              key={dept}
              type="button"
              onClick={() => setSelectedDept(dept)}
              className={`px-2.5 py-1 text-[11.5px] font-semibold rounded whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border flex-shrink-0 ${
                isSelected
                  ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-2xs"
                  : "bg-white text-gray-700 border-[#DDE2EC] hover:bg-[#F8FAFC]"
              }`}
            >
              <span>{dept}</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4 w-full">
        {/* Left Side: Active Queue & Department Metrics */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          
          {/* Department KPI Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-[#DDE2EC] p-3 rounded hover:border-[#1B4FD8] transition-colors shadow-2xs">
              <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5 flex items-center justify-between">
                <span>Waiting</span>
                <span className="text-amber-500">⏳</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{metrics.waiting}</div>
              <div className="text-[10px] text-[#64748B]">Patients in waiting room</div>
            </div>

            <div className="bg-white border border-[#DDE2EC] p-3 rounded hover:border-[#1B4FD8] transition-colors shadow-2xs">
              <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5 flex items-center justify-between">
                <span>In Consult</span>
                <span className="text-blue-500">🩺</span>
              </div>
              <div className="text-xl font-bold text-[#1B4FD8]">{metrics.inConsult}</div>
              <div className="text-[10px] text-[#64748B]">With doctor in chamber</div>
            </div>

            <div className="bg-white border border-[#DDE2EC] p-3 rounded hover:border-[#1B4FD8] transition-colors shadow-2xs">
              <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5 flex items-center justify-between">
                <span>Avg Wait Time</span>
                <span className="text-purple-500">⏱️</span>
              </div>
              <div className="text-xl font-bold text-gray-900">{metrics.avgWait}</div>
              <div className="text-[10px] text-[#64748B]">Reg to consultation</div>
            </div>

            <div className="bg-white border border-[#DDE2EC] p-3 rounded hover:border-[#1B4FD8] transition-colors shadow-2xs">
              <div className="text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5 flex items-center justify-between">
                <span>Completed</span>
                <span className="text-green-500">✓</span>
              </div>
              <div className="text-xl font-bold text-[#15803D]">{metrics.completed}</div>
              <div className="text-[10px] text-[#64748B]">Finished today</div>
            </div>
          </div>

          {/* Department Queue Table Container */}
          <div className="bg-white border border-[#DDE2EC] rounded shadow-xs overflow-hidden flex-1 flex flex-col min-h-[360px]">
            {/* Header & Filter Controls */}
            <div className="px-4 py-2.5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-[13px] font-bold text-gray-900 truncate">
                  Live Queue — {selectedDept}
                </h2>
                <span className="text-[10.5px] font-mono bg-blue-100 text-[#1B4FD8] px-2 py-0.5 rounded font-bold whitespace-nowrap">
                  {filteredQueue.length} Patients
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Status Filter Tabs */}
                <div className="flex items-center bg-white border border-[#CBD5E1] rounded p-0.5 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={`px-2 py-0.5 rounded transition-colors ${statusFilter === "ALL" ? "bg-[#1B4FD8] text-white" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("WAITING")}
                    className={`px-2 py-0.5 rounded transition-colors ${statusFilter === "WAITING" ? "bg-[#1B4FD8] text-white" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    Waiting
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("CONSULTING")}
                    className={`px-2 py-0.5 rounded transition-colors ${statusFilter === "CONSULTING" ? "bg-[#1B4FD8] text-white" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    In Consult
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("COMPLETED")}
                    className={`px-2 py-0.5 rounded transition-colors ${statusFilter === "COMPLETED" ? "bg-[#1B4FD8] text-white" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    Completed
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patient, token, doctor..." 
                    className="pl-7 pr-3 py-1 text-[11.5px] border border-[#CBD5E1] rounded bg-white focus:outline-none focus:border-[#1B4FD8] w-40 sm:w-52" 
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs"><Icon.Search /></span>
                </div>
              </div>
            </div>

            {/* Queue Table */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
              {filteredQueue.length === 0 ? (
                <div className="p-10 text-center text-gray-500 space-y-2.5">
                  <div className="text-3xl">🏥</div>
                  <div className="text-[13.5px] font-bold text-gray-800">No Patients in {selectedDept} Queue</div>
                  <p className="text-[11.5px] text-[#64748B] max-w-sm mx-auto">
                    {searchQuery ? "No queue entries matched your search query." : `There are currently no active patients in ${selectedDept}. Click "+ Issue Queue Token" or register a new patient.`}
                  </p>
                  <div className="flex justify-center gap-2 pt-1">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11.5px] font-semibold rounded cursor-pointer"
                      >
                        Clear Search
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsIssueTokenOpen(true)}
                      className="px-3.5 py-1 bg-[#1B4FD8] hover:bg-[#1740B4] text-white text-[11.5px] font-bold rounded cursor-pointer"
                    >
                      + Issue Token for {selectedDept === "All Departments" ? "Patient" : selectedDept}
                    </button>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#FAFAFA] border-b border-[#DDE2EC] sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Token / OP</th>
                      <th className="px-3 py-2 text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider">Patient Info</th>
                      <th className="px-3 py-2 text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Department &amp; Doctor</th>
                      <th className="px-3 py-2 text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Room</th>
                      <th className="px-3 py-2 text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Reg Time</th>
                      <th className="px-3 py-2 text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-3 py-2 text-[10.5px] font-bold text-[#64748B] uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] text-[12px]">
                    {filteredQueue.map((enc, idx) => {
                      const token = enc.queueToken || enc.opNumber;
                      const isCallingThis = nowCalling?.token === token;
                      const isCompleted = enc.status === "Consultation Completed" || enc.status === "OP Completed" || enc.status === "Billing Completed";
                      const isInConsult = enc.status === "Under Consultation";

                      return (
                        <tr 
                          key={enc.id} 
                          className={`hover:bg-[#F8FAFC] transition-colors ${isCallingThis ? "bg-amber-50/50" : ""}`}
                        >
                          {/* Token & Index */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-gray-400 font-bold">#{idx + 1}</span>
                              <span className="font-mono font-bold text-[12px] text-[#1B4FD8] bg-blue-50 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap">
                                {token}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-gray-500 mt-0.5">UMR: {enc.umr}</div>
                          </td>

                          {/* Patient Info */}
                          <td className="px-3 py-2.5 min-w-[170px]">
                            <div className="font-bold text-gray-900">{enc.patientName}</div>
                            <div className="text-[10.5px] text-[#64748B] flex items-center gap-1 mt-0.5">
                              <span>{enc.age} yrs, {enc.sex}</span>
                              <span>•</span>
                              <span>{enc.phone}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 truncate max-w-[200px] mt-0.5" title={enc.chiefComplaint || enc.symptoms.join(", ")}>
                              {enc.chiefComplaint || enc.symptoms.join(", ") || "OP Consultation"}
                            </div>
                          </td>

                          {/* Department & Doctor */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-[10.5px] inline-block mb-0.5">
                              {enc.dept}
                            </span>
                            <div className="text-[11px] text-gray-700 font-medium flex items-center gap-1">
                              <span>👨‍⚕️</span> {enc.assignedDoctor || "Awaiting Doctor Allocation"}
                            </div>
                          </td>

                          {/* Room */}
                          <td className="px-3 py-2.5 font-mono font-bold text-gray-800 whitespace-nowrap">
                            {enc.room || "Room 101"}
                          </td>

                          {/* Reg Time */}
                          <td className="px-3 py-2.5 text-[#64748B] font-mono text-[11.5px] whitespace-nowrap">
                            {enc.registrationTime || enc.timestamps.arrival || "10:00 AM"}
                          </td>

                          {/* Status Badge */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {getStatusBadge(enc.status)}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {!isCompleted && !isInConsult && (
                                <button
                                  type="button"
                                  onClick={() => handleCallPatient(enc)}
                                  className="px-2 py-0.8 text-[11px] font-bold text-white bg-[#1B4FD8] hover:bg-[#1740B4] rounded transition-colors flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
                                  title="Call Patient to Chamber"
                                >
                                  <span>📢</span> Call
                                </button>
                              )}

                              {isInConsult && (
                                <button
                                  type="button"
                                  onClick={() => handleCompleteConsultation(enc)}
                                  className="px-2 py-0.8 text-[11px] font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded transition-colors flex items-center gap-1 shadow-2xs cursor-pointer whitespace-nowrap"
                                  title="Complete Consultation"
                                >
                                  <span>✓</span> Done
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenTransfer(enc)}
                                className="px-1.5 py-0.8 text-[10.5px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-[#CBD5E1] rounded transition-colors cursor-pointer whitespace-nowrap"
                                title="Transfer department / doctor"
                              >
                                Transfer
                              </button>

                              {onNavigateToDoctorWorkflow && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToDoctorWorkflow(enc.id)}
                                  className="px-1.5 py-0.8 text-[10.5px] font-semibold text-[#1B4FD8] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                                  title="Open Doctor Consultation Workspace"
                                >
                                  Doctor
                                </button>
                              )}

                                <button
                                  type="button"
                                  onClick={() => setSelectedJourneyEncounter(enc)}
                                  className="px-2 py-0.8 text-[10.5px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                                  title="View Complete Outpatient Clinical Journey Timeline"
                                >
                                  Journey →
                                </button>
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

        {/* Right Side: Waiting Room Display / Kiosk & Quick Actions */}
        <div className="w-full lg:w-72 flex flex-col gap-4 flex-shrink-0">
          
          {/* Waiting Room TV / Kiosk Display Card */}
          <div className="bg-[#0F172A] rounded shadow-md overflow-hidden flex flex-col border border-slate-800">
            <div className="bg-[#1E293B] p-2.5 text-center border-b border-white/10 flex justify-between items-center px-3.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <h3 className="text-white text-[11px] font-bold tracking-widest uppercase">Waiting Room Kiosk</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTvKioskMode(true)}
                className="text-[10px] font-mono text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
              >
                TV Mode ↗
              </button>
            </div>

            <div className="p-4 text-center text-white space-y-3">
              {nowCalling ? (
                <div>
                  <div className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-widest mb-1 flex items-center justify-center gap-1">
                    <span className="text-amber-400 animate-bounce">📢</span> NOW CALLING
                  </div>
                  <div className="text-3xl font-mono font-extrabold text-[#38BDF8] tracking-tight bg-slate-900/80 py-1.5 rounded border border-sky-500/30">
                    {nowCalling.token}
                  </div>
                  <div className="text-[14px] font-bold text-white mt-1.5 truncate">
                    {nowCalling.patientName}
                  </div>
                  <div className="text-[12px] font-semibold text-[#86EFAC] mt-1 bg-green-900/30 py-0.5 px-2.5 rounded border border-green-500/30 inline-block">
                    Proceed to {nowCalling.room}
                  </div>
                  <div className="text-[10.5px] text-slate-400 mt-1 truncate">
                    {nowCalling.doctor} ({nowCalling.dept})
                  </div>
                </div>
              ) : (
                <div className="py-3 text-slate-400">
                  <div className="text-xl mb-0.5">☕</div>
                  <div className="text-[12px] font-semibold">Queue In Standby</div>
                  <div className="text-[10.5px]">Click "Call" on any patient row</div>
                </div>
              )}
              
              {/* Recent Call History */}
              <div className="border-t border-white/10 pt-3 text-left space-y-1.5">
                <div className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider">
                  Recently Called
                </div>
                {callHistory.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-800/60 px-2 py-1 rounded text-[11px]">
                    <div className="truncate mr-2">
                      <span className="font-mono font-bold text-sky-300">{item.token}</span>
                      <span className="text-slate-300 ml-1.5">{item.patientName}</span>
                    </div>
                    <span className="font-mono text-emerald-300 font-semibold whitespace-nowrap text-[10.5px]">{item.room}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white border border-[#DDE2EC] rounded p-3.5 shadow-xs space-y-2">
            <h3 className="text-[12px] font-bold text-gray-900 flex items-center gap-1">
              <span>⚡</span> Quick Queue Actions
            </h3>
            <div className="space-y-1.5">
              <button 
                type="button"
                onClick={() => setIsIssueTokenOpen(true)}
                className="w-full text-left px-2.5 py-1.5 text-[11.5px] font-semibold text-[#1B4FD8] hover:bg-blue-50 border border-blue-200 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Icon.Plus /> Issue Walk-In Queue Token
              </button>

              {onNavigateToOPRegistration && (
                <button 
                  type="button"
                  onClick={onNavigateToOPRegistration}
                  className="w-full text-left px-2.5 py-1.5 text-[11.5px] font-semibold text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Icon.Patients /> Open OP Registration Desk
                </button>
              )}

              <button 
                type="button"
                onClick={() => {
                  playChime();
                  speakAnnouncement("Attention all patients: please ensure you have completed vitals triage at nurse station 3 before entering consultation rooms.");
                  triggerToast("Announcement Broadcasted", "Voice broadcast played across waiting areas.");
                }}
                className="w-full text-left px-2.5 py-1.5 text-[11.5px] font-semibold text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Icon.Cmd /> Broadcast Announcement
              </button>

              <button 
                type="button"
                onClick={() => window.print()}
                className="w-full text-left px-2.5 py-1.5 text-[11.5px] font-semibold text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Icon.Download /> Print Queue Roster
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── MODAL 1: ISSUE QUEUE TOKEN ── */}
      {isIssueTokenOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border-2 border-[#CBD5E1] rounded shadow-2xl max-w-lg w-full p-5 space-y-3.5">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2.5">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                  <span>🎟️</span> Issue Outpatient Queue Token
                </h3>
                <p className="text-[11px] text-[#64748B]">Assign patient directly into department queue with token number.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsIssueTokenOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateToken} className="space-y-3 text-[12px]">
              {/* Patient Selection Mode */}
              <div className="flex items-center bg-[#F1F5F9] p-1 rounded font-semibold text-[11.5px]">
                <button
                  type="button"
                  onClick={() => setTokenPatientMode("existing")}
                  className={`flex-1 py-1 rounded transition-colors cursor-pointer ${
                    tokenPatientMode === "existing" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-gray-600"
                  }`}
                >
                  Select Existing Patient ({patients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTokenPatientMode("new")}
                  className={`flex-1 py-1 rounded transition-colors cursor-pointer ${
                    tokenPatientMode === "new" ? "bg-white text-[#1B4FD8] shadow-xs" : "text-gray-600"
                  }`}
                >
                  + New Walk-In Patient
                </button>
              </div>

              {tokenPatientMode === "existing" ? (
                <div>
                  <label className="text-[11px] font-bold text-gray-800 block mb-1">
                    Select Registered Patient <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tokenSelectedUmr || (patients[0]?.umr || "")}
                    onChange={e => setTokenSelectedUmr(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded p-2 text-[12px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                  >
                    {patients.map(p => (
                      <option key={p.umr} value={p.umr}>
                        {p.name} · {p.umr} ({p.age} yrs, {p.sex}) · {p.phone}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5 bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
                  <div>
                    <label className="text-[10.5px] font-bold text-gray-800 block mb-0.5">Patient Full Name *</label>
                    <input
                      value={tokenNewName}
                      onChange={e => setTokenNewName(e.target.value)}
                      placeholder="e.g. Robert Williams"
                      className="w-full border border-[#CBD5E1] rounded p-1.5 text-[12px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10.5px] font-bold text-gray-800 block mb-0.5">Age</label>
                      <input
                        type="number"
                        value={tokenNewAge}
                        onChange={e => setTokenNewAge(Number(e.target.value))}
                        className="w-full border border-[#CBD5E1] rounded p-1.5 text-[12px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-gray-800 block mb-0.5">Gender</label>
                      <select
                        value={tokenNewSex}
                        onChange={e => setTokenNewSex(e.target.value as any)}
                        className="w-full border border-[#CBD5E1] rounded p-1.5 text-[11.5px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold text-gray-800 block mb-0.5">Phone</label>
                      <input
                        value={tokenNewPhone}
                        onChange={e => setTokenNewPhone(e.target.value)}
                        placeholder="(617) 555-0199"
                        className="w-full border border-[#CBD5E1] rounded p-1.5 text-[12px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Department & Doctor Allocation */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-gray-800 block mb-1">Department</label>
                  <select
                    value={tokenDept}
                    onChange={e => setTokenDept(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded p-1.5 text-[12px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                  >
                    {DEPARTMENTS.slice(1).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-800 block mb-1">Attending Doctor</label>
                  <select
                    value={tokenDoctor}
                    onChange={e => setTokenDoctor(e.target.value)}
                    className="w-full border border-[#CBD5E1] rounded p-1.5 text-[12px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                  >
                    {(DOCTOR_MAP[tokenDept] || []).map(doc => (
                      <option key={doc.name} value={doc.name}>
                        {doc.name} ({doc.room})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority & Reason */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-gray-800 block mb-1">Queue Priority</label>
                  <select
                    value={tokenPriority}
                    onChange={e => setTokenPriority(e.target.value as any)}
                    className="w-full border border-[#CBD5E1] rounded p-1.5 text-[11.5px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent (Priority)</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-gray-800 block mb-1">Chief Complaint / Reason</label>
                  <input
                    value={tokenComplaint}
                    onChange={e => setTokenComplaint(e.target.value)}
                    placeholder="e.g. Chest pain, Follow-up"
                    className="w-full border border-[#CBD5E1] rounded p-1.5 text-[12px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2.5 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIssueTokenOpen(false)}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold text-[11.5px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white rounded font-bold text-[11.5px] shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <span>🎟️</span> Issue Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: TRANSFER PATIENT DEPARTMENT ── */}
      {isTransferOpen && transferTargetEncounter && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border-2 border-[#CBD5E1] rounded shadow-2xl max-w-md w-full p-5 space-y-3.5">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2.5">
              <div>
                <h3 className="text-[14.5px] font-bold text-gray-900 flex items-center gap-1.5">
                  <span>🔄</span> Transfer Patient Department
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Reassign <strong>{transferTargetEncounter.patientName}</strong> to another specialty.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsTransferOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-[12px]">
              <div>
                <label className="text-[11px] font-bold text-gray-800 block mb-1">Target Department</label>
                <select
                  value={transferDept}
                  onChange={e => setTransferDept(e.target.value)}
                  className="w-full border border-[#CBD5E1] rounded p-1.5 text-[12px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                >
                  {DEPARTMENTS.slice(1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-800 block mb-1">Attending Physician &amp; Room</label>
                <select
                  value={transferDoctor}
                  onChange={e => setTransferDoctor(e.target.value)}
                  className="w-full border border-[#CBD5E1] rounded p-1.5 text-[12px] bg-white focus:outline-none focus:border-[#1B4FD8]"
                >
                  {(DOCTOR_MAP[transferDept] || []).map(doc => (
                    <option key={doc.name} value={doc.name}>
                      {doc.name} ({doc.room})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2.5 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-semibold text-[11.5px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTransfer}
                  className="px-4 py-1.5 bg-[#1B4FD8] hover:bg-[#1740B4] text-white rounded font-bold text-[11.5px] shadow-2xs cursor-pointer"
                >
                  Confirm Transfer ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: TV FULLSCREEN KIOSK MODE ── */}
      {isTvKioskMode && (
        <div className="fixed inset-0 bg-[#0A0F1D] text-white z-50 flex flex-col p-5 overflow-hidden animate-in fade-in">
          {/* TV Top Header */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="HospAI" className="w-9 h-9 object-contain" />
              <div>
                <div className="text-lg font-black text-white tracking-wider">HOSPAI GENERAL HOSPITAL</div>
                <div className="text-[11.5px] text-sky-400 font-semibold tracking-widest uppercase">
                  Outpatient Live Queue Display — {selectedDept}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right font-mono">
                <div className="text-lg font-bold text-white">
                  {new Date().toLocaleTimeString()}
                </div>
                <div className="text-[10.5px] text-slate-400">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTvKioskMode(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-[12px] border border-slate-700 cursor-pointer"
              >
                ✕ Exit TV Mode
              </button>
            </div>
          </div>

          {/* TV Main Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 overflow-hidden">
            {/* Main Calling Card */}
            <div className="md:col-span-2 bg-[#131C31] border-2 border-sky-500/40 rounded p-6 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 animate-pulse"></div>

              {nowCalling ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3.5 py-1 rounded text-[13px] font-bold tracking-widest uppercase">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    NOW CALLING FOR CONSULTATION
                  </div>

                  <div className="text-7xl font-black font-mono text-[#38BDF8] tracking-wider py-1">
                    {nowCalling.token}
                  </div>

                  <div className="text-2xl font-bold text-white">
                    {nowCalling.patientName}
                  </div>

                  <div className="inline-block bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 px-6 py-2 rounded text-xl font-black font-mono tracking-wide">
                    PROCEED TO {nowCalling.room.toUpperCase()}
                  </div>

                  <div className="text-base text-slate-300 font-medium">
                    Attending: <strong className="text-white">{nowCalling.doctor}</strong> ({nowCalling.dept})
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 text-slate-400">
                  <div className="text-5xl">🏥</div>
                  <div className="text-xl font-bold text-white">Welcome to HospAI Outpatient Clinic</div>
                  <p className="text-slate-400 text-xs">Please watch this screen for your token call number.</p>
                </div>
              )}
            </div>

            {/* Right Side: Active Waiting & Called List */}
            <div className="bg-[#131C31] border border-slate-800 rounded p-4 flex flex-col overflow-hidden">
              <div className="text-[12px] font-bold text-sky-400 tracking-wider uppercase border-b border-slate-800 pb-2 mb-2.5">
                Upcoming Queue ({filteredQueue.filter(e => e.status !== "Consultation Completed" && e.status !== "OP Completed").length})
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredQueue
                  .filter(e => e.status !== "Consultation Completed" && e.status !== "OP Completed")
                  .slice(0, 10)
                  .map((enc, idx) => (
                    <div 
                      key={enc.id}
                      className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded flex items-center justify-between"
                    >
                      <div className="min-w-0 mr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10.5px] text-slate-400 font-bold">#{idx + 1}</span>
                          <span className="font-mono font-bold text-sky-400 text-[13px] whitespace-nowrap">
                            {enc.queueToken || enc.opNumber}
                          </span>
                        </div>
                        <div className="font-bold text-white text-[12px] mt-0.5 truncate">{enc.patientName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{enc.dept} · {enc.assignedDoctor || "Physician"}</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 text-[11px] bg-slate-900 px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                        {enc.room || "Room 101"}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL 4: COMPLETE PATIENT JOURNEY TIMELINE MODAL ── */}
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
    </div>
  );
}
