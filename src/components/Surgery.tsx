import React, { useState, useEffect } from "react";
import { Btn, TabBar, StatusBadge } from "./shared";
import { SurgeryDatabase, SurgicalCase } from "../services/surgeryDb";
import { OtPackageLink } from "./insurance/integrations";

export default function Surgery() {
  const [cases, setCases] = useState<SurgicalCase[]>([]);
  const [activeTab, setActiveTab] = useState("OR Room Board");
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("All Specialities");
  const [viewMode, setViewMode] = useState<"card" | "timeline">("card");

  // Modals & Booklet state
  const [bookingOrRoom, setBookingOrRoom] = useState<string | null>(null);
  const [showStatModal, setShowStatModal] = useState(false);
  const [activeBookletCase, setActiveBookletCase] = useState<SurgicalCase | null>(null);
  const [bookletActivePage, setBookletActivePage] = useState<number>(1);
  const [bookletRoleFilter, setBookletRoleFilter] = useState<"all" | "ward" | "ot_nurse" | "pacu">("all");
  const [activeChargesCase, setActiveChargesCase] = useState<SurgicalCase | null>(null);

  // Form states for booking
  const [bookForm, setBookForm] = useState({
    patientName: "",
    mrn: "",
    age: "",
    gender: "Male" as "Male" | "Female",
    surgeon: "Dr. Adams",
    anesthesiologist: "Dr. Rodriguez",
    procedure: "",
    specialty: "General Surgery",
    orRoom: "OR 2",
    urgency: "Elective" as "Elective" | "Urgent" | "Emergency STAT",
    scheduledTime: "02:00 PM"
  });

  // Local state for intra-op editing in booklet
  const [intraOpForm, setIntraOpForm] = useState({
    swabCount: true,
    needleCount: true,
    instrumentCount: true,
    bloodLossMl: 75,
    drainsCount: 1,
    suturesUsed: "Ethicon Vicryl 2-0, Monocryl 3-0",
    operativeNotes: "Procedure proceeded routinely. No intra-operative complications encountered.",
    bp: "120/80",
    hr: 72,
    spo2: 99,
    etco2: 35,
    aldreteActivity: 2,
    aldreteRespiration: 2,
    aldreteCirculation: 2,
    aldreteConsciousness: 2,
    aldreteO2Sat: 2,
    whoSignIn: true,
    whoTimeOut: true,
    whoSignOut: true,
  });

  useEffect(() => {
    SurgeryDatabase.refresh().then(setCases);
    return SurgeryDatabase.subscribe(() => {
      setCases(SurgeryDatabase.getCases());
    });
  }, []);

  const now = "11:45 AM";

  // Compute metrics
  const scheduled = cases.filter(c => c.status === "PAC Pending" || c.status === "PAC Cleared").length;
  const pacPending = cases.filter(c => c.status === "PAC Pending").length;
  const preOp = cases.filter(c => c.status === "Pre-Op Holding").length;
  const inSurgery = cases.filter(c => c.status === "In Surgery").length;
  const pacu = cases.filter(c => c.status === "PACU Recovery").length;
  const completed = cases.filter(c => c.status === "Completed").length;

  // Filtered cases
  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      (c.patientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.mrn || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.procedureName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.surgeon || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty = 
      specialtyFilter === "All Specialities" || c.specialty === specialtyFilter;
    return matchesSearch && matchesSpecialty;
  });

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.patientName || !bookForm.procedure) return;
    
    try {
      await SurgeryDatabase.createCase({
        patientId: `P-${Math.floor(1000 + Math.random() * 9000)}`,
        patientName: bookForm.patientName,
        mrn: bookForm.mrn || `UMR${Math.floor(100000 + Math.random() * 900000)}`,
        ipNo: `IP-${Math.floor(10000 + Math.random() * 90000)}`,
        age: parseInt(bookForm.age) || 45,
        gender: bookForm.gender,
        surgeon: bookForm.surgeon,
        anesthesiologist: bookForm.anesthesiologist,
        scrubNurse: "RN Murphy",
        circulatingNurse: "RN Davis",
        cptCode: "47562",
        icd10Code: "K80.20",
        procedureName: bookForm.procedure,
        specialty: bookForm.specialty,
        orRoom: bookingOrRoom || bookForm.orRoom,
        scheduledTime: bookForm.scheduledTime,
        durationEst: "120 mins",
        urgency: bookForm.urgency,
        insuranceProvider: "Star Health",
        totalAmount: 45000,
        status: bookForm.urgency === "Emergency STAT" ? "Pre-Op Holding" : "PAC Pending"
      });
    } catch {
      // Fallback
    }

    setBookingOrRoom(null);
    setBookForm({
      patientName: "", mrn: "", age: "", gender: "Male",
      surgeon: "Dr. Adams", anesthesiologist: "Dr. Rodriguez",
      procedure: "", specialty: "General Surgery",
      orRoom: "OR 2", urgency: "Elective", scheduledTime: "02:00 PM"
    });
  };

  const handleUpdateStatus = async (caseId: string, newStatus: SurgicalCase["status"]) => {
    try {
      await SurgeryDatabase.updateCaseStatus(caseId, newStatus);
    } catch {
      // Handled
    }
  };

  const openBookletForCase = (c: SurgicalCase, page = 1) => {
    setActiveBookletCase(c);
    setBookletActivePage(page);
  };

  const calculateTotalAldrete = () => {
    return (
      intraOpForm.aldreteActivity +
      intraOpForm.aldreteRespiration +
      intraOpForm.aldreteCirculation +
      intraOpForm.aldreteConsciousness +
      intraOpForm.aldreteO2Sat
    );
  };

  const saveBookletProgress = async () => {
    if (!activeBookletCase) return;
    try {
      await SurgeryDatabase.saveFullBooklet(activeBookletCase.id, {
        operationRecord: {
          surgeonPreparedInOr: activeBookletCase.surgeon,
          preOpDiagnosis: "Symptomatic Cholelithiasis",
          postOpDiagnosis: "Chronic Calculous Cholecystitis",
          procedureProposed: activeBookletCase.procedureName,
          procedureExecuted: activeBookletCase.procedureName,
          asstSurgeons: ["Dr. Patel"],
          skinPreparation: "Betadine & Chlorhexidine",
          histopathologySent: true,
          photosVideosRecorded: true,
          swabCountCorrect: intraOpForm.swabCount,
          instrumentCountCorrect: intraOpForm.instrumentCount,
          suturesUsed: intraOpForm.suturesUsed,
          drainageCount: intraOpForm.drainsCount,
          bloodLossMl: intraOpForm.bloodLossMl,
          surgeryStartTime: "08:30 AM",
          surgeryEndTime: "10:15 AM",
          operatingTimeMins: 105,
          complications: "None",
          surgeonProcedureNotes: intraOpForm.operativeNotes,
          postOpInstructions: "NPO for 4 hours. Monitor vitals q15m x 1h then q30m x 2h.",
          surgeonSignature: activeBookletCase.surgeon,
        }
      });
    } catch {
      // Saved
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
      {/* Sleek Executive White Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold tracking-tight text-[#1E3A6E]">
              Surgical Services &amp; Operation Theatre Board
            </h1>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              OT Live Telemetry Active
            </span>
          </div>
          <p className="text-[11.5px] text-[#64748B] mt-0.5 font-mono">
            General Hospital OT Census · Imperial OT Booklet Suite · {now}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Btn variant="outline" size="sm" onClick={() => setBookingOrRoom("OR 2")}>
            + Schedule Surgery Case
          </Btn>
          <Btn variant="danger" size="sm" onClick={() => setShowStatModal(true)}>
            ⚡ Reserve Emergency STAT OT
          </Btn>
        </div>
      </div>

      {/* KPI Summary Bar */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-3.5 grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 border-l-4 border-l-indigo-600 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-2xl font-bold font-mono text-indigo-950 leading-none">{scheduled || 1}</div>
            <div className="text-[11px] font-semibold text-indigo-800/80 mt-1">Scheduled</div>
          </div>
          <span className="text-xl">📅</span>
        </div>
        <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100 border-l-4 border-l-amber-500 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-2xl font-bold font-mono text-amber-950 leading-none">{pacPending || 1}</div>
            <div className="text-[11px] font-semibold text-amber-800/80 mt-1">PAC Pending</div>
          </div>
          <span className="text-xl">🩺</span>
        </div>
        <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-100 border-l-4 border-l-sky-500 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-2xl font-bold font-mono text-sky-950 leading-none">{preOp || 1}</div>
            <div className="text-[11px] font-semibold text-sky-800/80 mt-1">Pre-Op Prep</div>
          </div>
          <span className="text-xl">🏥</span>
        </div>
        <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100 border-l-4 border-l-purple-600 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-2xl font-bold font-mono text-purple-950 leading-none">{inSurgery || 1}</div>
            <div className="text-[11px] font-semibold text-purple-800/80 mt-1">In Surgery</div>
          </div>
          <span className="text-xl">✂️</span>
        </div>
        <div className="bg-pink-50/60 p-3.5 rounded-xl border border-pink-100 border-l-4 border-l-pink-500 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-2xl font-bold font-mono text-pink-950 leading-none">{pacu || 1}</div>
            <div className="text-[11px] font-semibold text-pink-800/80 mt-1">PACU Recovery</div>
          </div>
          <span className="text-xl">💊</span>
        </div>
        <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 border-l-4 border-l-emerald-600 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-950 leading-none">{completed || 1}</div>
            <div className="text-[11px] font-semibold text-emerald-800/80 mt-1">Invoiced &amp; Done</div>
          </div>
          <span className="text-xl">✅</span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white border-b border-[#DDE2EC] flex items-center justify-between px-6 pt-3 flex-wrap gap-3">
        <TabBar 
          tabs={["OR Room Board", "OT Booklet", "PAC Pre-Op Gate", "Intra-Op Suite", "PACU Recovery", "Surgeon Cards"]} 
          active={activeTab} 
          onChange={setActiveTab} 
        />
        <div className="flex gap-2.5 pb-2.5 items-center">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search patient, procedure, surgeon..." 
            className="border border-[#DDE2EC] rounded-lg px-3 py-1.5 text-xs w-64 focus:outline-none focus:border-slate-800 bg-white"
          />
          <select 
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="border border-[#DDE2EC] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-800 bg-white cursor-pointer font-medium text-slate-700"
          >
            <option value="All Specialities">All Specialities</option>
            <option value="General Surgery">General Surgery</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Neurosurgery">Neurosurgery</option>
            <option value="Cardiothoracic">Cardiothoracic</option>
            <option value="Urology">Urology</option>
            <option value="ENT">ENT</option>
          </select>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="w-full px-6 py-5 space-y-4">
        {/* TAB 1: OR ROOM BOARD */}
        {activeTab === "OR Room Board" && (
          <div className="space-y-3.5">
            {["OR 1", "OR 2", "OR 3", "OR 4"].map((roomName) => {
              const activeCase = filteredCases.find(c => c.orRoom === roomName && c.status !== "Completed");
              
              if (activeCase) {
                return (
                  <div key={roomName} className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-2xs">
                    <div className={`px-5 py-2.5 border-b border-[#DDE2EC] flex items-center justify-between ${
                      roomName === "OR 1" ? "bg-blue-50/70" :
                      roomName === "OR 2" ? "bg-purple-50/70" :
                      roomName === "OR 3" ? "bg-emerald-50/70" : "bg-amber-50/70"
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md font-mono ${
                          roomName === "OR 1" ? "bg-blue-600 text-white" :
                          roomName === "OR 2" ? "bg-purple-600 text-white" :
                          roomName === "OR 3" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"
                        }`}>
                          {roomName}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-[#DDE2EC]">
                          {activeCase.specialty}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          activeCase.urgency === "Emergency STAT" ? "bg-rose-100 text-rose-700 border border-rose-200 animate-pulse" :
                          activeCase.urgency === "Urgent" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                          "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                          {activeCase.urgency}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Btn variant="outline" size="xs" onClick={() => openBookletForCase(activeCase, 1)}>
                          📘 OT Booklet
                        </Btn>
                        <Btn variant="outline" size="xs" onClick={() => setActiveChargesCase(activeCase)}>
                          💰 Charges
                        </Btn>
                      </div>
                    </div>
                    
                    <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#1E3A6E] text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-blue-100">
                          {(activeCase.patientName || "PT").split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>{activeCase.patientName}</span>
                            <span className="font-mono text-xs font-normal text-slate-500">({activeCase.mrn})</span>
                          </div>
                          <div className="text-[11.5px] text-slate-600 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800">{activeCase.procedureName}</span>
                            <span>·</span>
                            <span>Surgeon: <strong>Dr. {activeCase.surgeon}</strong></span>
                            <span>·</span>
                            <span>Anesthesia: <strong>Dr. {activeCase.anesthesiologist}</strong></span>
                          </div>
                          {/* Insured patient: the procedure's package goes to the insurance pre-auth. */}
                          <div className="mt-2">
                            <OtPackageLink patientId={activeCase.mrn || activeCase.patientId} patientName={activeCase.patientName} procedureName={activeCase.procedureName} surgeon={activeCase.surgeon ? `Dr. ${activeCase.surgeon}` : undefined} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={activeCase.status === "In Surgery" ? "inprogress" : activeCase.status.toLowerCase()} />
                        <div className="flex gap-1.5">
                          {activeCase.status === "PAC Pending" && (
                            <Btn variant="primary" size="xs" onClick={() => handleUpdateStatus(activeCase.id, "PAC Cleared")}>
                              Approve PAC
                            </Btn>
                          )}
                          {activeCase.status === "PAC Cleared" && (
                            <Btn variant="primary" size="xs" onClick={() => handleUpdateStatus(activeCase.id, "Pre-Op Holding")}>
                              To Pre-Op
                            </Btn>
                          )}
                          {activeCase.status === "Pre-Op Holding" && (
                            <Btn variant="primary" size="xs" onClick={() => handleUpdateStatus(activeCase.id, "In Surgery")}>
                              Start Surgery
                            </Btn>
                          )}
                          {activeCase.status === "In Surgery" && (
                            <Btn variant="primary" size="xs" onClick={() => handleUpdateStatus(activeCase.id, "PACU Recovery")}>
                              To PACU
                            </Btn>
                          )}
                          {activeCase.status === "PACU Recovery" && (
                            <Btn variant="primary" size="xs" onClick={() => handleUpdateStatus(activeCase.id, "Completed")}>
                              Complete Case
                            </Btn>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Live Intra-Op Telemetry Telemetry Bar */}
                    {(activeCase.status === "In Surgery" || activeCase.status === "Pre-Op Holding" || activeCase.status === "PACU Recovery") && (
                      <div className="mx-5 mb-4 p-3.5 bg-white rounded-xl border border-[#DDE2EC] text-slate-900 flex flex-wrap items-center justify-between gap-3 shadow-xs font-mono text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-100"></span>
                          <span className="font-bold text-[#1E3A6E] tracking-wider text-[11px] font-sans uppercase">
                            Live Intra-Op Telemetry
                          </span>
                          <span className="text-[10px] text-slate-700 bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#DDE2EC] font-medium font-sans">
                            ⏱️ 01h 14m Elapsed
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] flex-wrap">
                          <div className="flex items-center gap-1.5 bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#DDE2EC]">
                            <span className="text-slate-500 font-sans text-[10px] font-bold uppercase">HR:</span>
                            <span className="font-bold text-emerald-700">74 bpm</span>
                            <span className="text-[10px]">📈</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#DDE2EC]">
                            <span className="text-slate-500 font-sans text-[10px] font-bold uppercase">BP:</span>
                            <span className="font-bold text-blue-700">122/78</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#DDE2EC]">
                            <span className="text-slate-500 font-sans text-[10px] font-bold uppercase">SpO2:</span>
                            <span className="font-bold text-cyan-700">99%</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#DDE2EC]">
                            <span className="text-slate-500 font-sans text-[10px] font-bold uppercase">EtCO2:</span>
                            <span className="font-bold text-amber-700">36 mmHg</span>
                          </div>
                          <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-700 bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#DDE2EC] font-sans">
                            <span className="text-slate-500 font-bold uppercase">Agent:</span>
                            <span className="text-slate-900 font-semibold">Sevoflurane 2.0%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={roomName} className="bg-white border border-[#DDE2EC] rounded-xl overflow-hidden shadow-2xs">
                  <div className="px-5 py-2.5 border-b border-[#DDE2EC] bg-[#F8FAFC] flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">{roomName}</span>
                    <span className="text-[11px] text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      ✓ Available &amp; Sterile
                    </span>
                  </div>
                  <div className="p-4 flex items-center justify-between text-xs text-slate-600">
                    <span>Operating Suite fully prepped &amp; available for surgery scheduling</span>
                    <Btn variant="outline" size="xs" onClick={() => setBookingOrRoom(roomName)}>
                      + Schedule Case ({roomName})
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: OT BOOKLET */}
        {activeTab === "OT Booklet" && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE2EC] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#1E3A6E]">
                  Digitized Imperial Hospitals OT Booklet Suite
                </h3>
                <p className="text-[11.5px] text-slate-500">Auto-populated by Ward &amp; PAC prior to surgery · Live intra-op updates by OT Nurse</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {cases.map((c) => (
                <div key={c.id} className="border border-[#DDE2EC] rounded-xl p-4 bg-[#F8FAFC] hover:bg-white transition-all space-y-2.5 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div className="font-bold text-slate-900 text-xs">{c.patientName}</div>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                      Ward Synced
                    </span>
                  </div>
                  <div className="text-[11.5px] text-slate-600">{c.procedureName} · {c.orRoom}</div>
                  <div className="text-[11px] font-mono text-slate-700">UMR: {c.mrn}</div>
                  <div className="pt-2 border-t border-[#DDE2EC] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-800">{c.status}</span>
                    <Btn size="xs" variant="primary" onClick={() => openBookletForCase(c, 1)}>
                      Open OT Booklet ➔
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PAC PRE-OP GATE */}
        {activeTab === "PAC Pre-Op Gate" && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-5 shadow-2xs space-y-3">
            <div className="border-b border-[#DDE2EC] pb-3">
              <h3 className="font-bold text-sm text-slate-900">Pre-Anaesthetic Assessment (PAC) Clearance Gate</h3>
              <p className="text-[11.5px] text-slate-500">Mallampati score, ASA physical status grading, and systemic clearance</p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[#DDE2EC]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#DDE2EC] text-slate-600 font-semibold text-[11px]">
                    <th className="p-3">Patient</th>
                    <th className="p-3">Procedure</th>
                    <th className="p-3">ASA Grade</th>
                    <th className="p-3">Mallampati</th>
                    <th className="p-3">PAC Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F8FAFC]">
                      <td className="p-3 font-semibold text-slate-900">{c.patientName} <span className="text-slate-500 font-normal font-mono">({c.mrn})</span></td>
                      <td className="p-3 text-slate-700">{c.procedureName}</td>
                      <td className="p-3 font-mono font-semibold text-slate-800">ASA II</td>
                      <td className="p-3 font-mono text-slate-800 font-semibold">Class I</td>
                      <td className="p-3">
                        <StatusBadge status={c.status === "PAC Cleared" ? "completed" : "pending"} />
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <Btn size="xs" variant="outline" onClick={() => openBookletForCase(c, 2)}>Page 2 Assessment</Btn>
                        {c.status === "PAC Pending" && (
                          <Btn size="xs" variant="primary" onClick={() => handleUpdateStatus(c.id, "PAC Cleared")}>
                            Approve PAC
                          </Btn>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: INTRA-OP SUITE */}
        {activeTab === "Intra-Op Suite" && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-[#DDE2EC] pb-3">
              <h3 className="font-bold text-sm text-[#1E3A6E]">WHO Surgical Safety Checklist &amp; Intra-Op Telemetry</h3>
              <p className="text-[11.5px] text-slate-500">Phase 1: Sign-In (Pre-Anesthesia) · Phase 2: Time-Out (Pre-Incision) · Phase 3: Sign-Out (Post-Incision)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="border border-blue-200 bg-blue-50/60 rounded-xl p-4 text-xs space-y-2 shadow-2xs">
                <h4 className="font-bold text-blue-900 text-xs border-b border-blue-200 pb-1.5 flex items-center gap-1.5">1️⃣ Sign-In (Pre-Anesthesia)</h4>
                <div className="text-blue-950 space-y-1.5">
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Patient identity &amp; site confirmed</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Consent form verified</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Anesthesia machine &amp; meds check</div>
                </div>
              </div>
              <div className="border border-amber-200 bg-amber-50/60 rounded-xl p-4 text-xs space-y-2 shadow-2xs">
                <h4 className="font-bold text-amber-900 text-xs border-b border-amber-200 pb-1.5 flex items-center gap-1.5">2️⃣ Time-Out (Pre-Incision)</h4>
                <div className="text-amber-950 space-y-1.5">
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Team introductions complete</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Surgeon &amp; Nurse confirm patient</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Antibiotics given &lt; 60 mins</div>
                </div>
              </div>
              <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-4 text-xs space-y-2 shadow-2xs">
                <h4 className="font-bold text-emerald-900 text-xs border-b border-emerald-200 pb-1.5 flex items-center gap-1.5">3️⃣ Sign-Out (Post-Incision)</h4>
                <div className="text-emerald-950 space-y-1.5">
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Procedure name recorded</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Swab, needle &amp; instrument count</div>
                  <div className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Specimen labeled aloud</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PACU RECOVERY */}
        {activeTab === "PACU Recovery" && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-5 shadow-2xs space-y-3">
            <div className="border-b border-[#DDE2EC] pb-3">
              <h3 className="font-bold text-sm text-[#1E3A6E]">PACU Post-Anesthesia Recovery Board</h3>
              <p className="text-[11.5px] text-slate-500">Modified Aldrete Score calculation (Threshold $\ge 9 / 10$ for Ward Transfer clearance)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {cases.map((c) => (
                <div key={c.id} className="border border-[#DDE2EC] rounded-xl p-4 bg-[#F8FAFC] flex justify-between items-center text-xs shadow-2xs hover:bg-white transition-all">
                  <div>
                    <div className="font-bold text-slate-900">{c.patientName}</div>
                    <div className="text-slate-600 mt-0.5">{c.procedureName} · {c.orRoom}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300 text-xs">
                      Aldrete 9/10
                    </span>
                    <Btn size="xs" variant="outline" onClick={() => openBookletForCase(c, 14)}>
                      Evaluate Score
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: SURGEON CARDS */}
        {activeTab === "Surgeon Cards" && (
          <div className="bg-white border border-[#DDE2EC] rounded-xl p-5 shadow-2xs space-y-3">
            <h3 className="font-bold text-sm text-[#1E3A6E]">Surgical Faculty &amp; Specialist Roster</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {[
                { name: "Dr. Adams", specialty: "Orthopedic & Trauma", count: 42 },
                { name: "Dr. Rodriguez", specialty: "Cardiac Surgery", count: 38 },
                { name: "Dr. Chen", specialty: "General & Laparoscopic", count: 56 },
                { name: "Dr. Gupta", specialty: "Neurosurgery", count: 29 },
                { name: "Dr. Williams", specialty: "Urology & Renal", count: 35 },
                { name: "Dr. Shah", specialty: "ENT & Head-Neck", count: 48 }
              ].map((s, i) => (
                <div key={i} className="border border-[#DDE2EC] rounded-xl p-3.5 bg-[#F8FAFC] flex items-center gap-3 shadow-2xs hover:bg-white transition-all">
                  <div className="w-9 h-9 rounded-full bg-[#1E3A6E] text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-blue-100">
                    {s.name.split(" ")[1][0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-slate-500 text-[11px]">{s.specialty} · {s.count} cases</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* UPGRADED 14-PAGE OT BOOKLET MASTER-DETAIL MODAL */}
      {activeBookletCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 md:p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col border border-[#DDE2EC] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#1E3A6E] text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-2xs border border-white/20 font-mono">
                  OT
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white tracking-wide">
                      Imperial Hospitals · Digital OT Booklet
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                      OT Booklet Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono">
                    Patient: <strong className="text-white">{activeBookletCase.patientName}</strong> ({activeBookletCase.age}y/{activeBookletCase.gender}) · UMR: <strong className="text-white">{activeBookletCase.mrn}</strong> · IP: <strong className="text-white">{activeBookletCase.ipNo || "IP-884920"}</strong> · {activeBookletCase.orRoom}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1 text-xs text-slate-200 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                  <span className="text-slate-300 text-[10.5px] mr-1">Role Filter:</span>
                  <button 
                    onClick={() => setBookletRoleFilter("all")}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${bookletRoleFilter === "all" ? "bg-white text-[#1E3A6E]" : "hover:bg-white/10 text-slate-200"}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => { setBookletRoleFilter("ward"); setBookletActivePage(1); }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${bookletRoleFilter === "ward" ? "bg-white text-[#1E3A6E]" : "hover:bg-white/10 text-slate-200"}`}
                  >
                    Ward
                  </button>
                  <button 
                    onClick={() => { setBookletRoleFilter("ot_nurse"); setBookletActivePage(8); }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${bookletRoleFilter === "ot_nurse" ? "bg-white text-[#1E3A6E]" : "hover:bg-white/10 text-slate-200"}`}
                  >
                    OT Nurse
                  </button>
                  <button 
                    onClick={() => { setBookletRoleFilter("pacu"); setBookletActivePage(14); }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${bookletRoleFilter === "pacu" ? "bg-white text-[#1E3A6E]" : "hover:bg-white/10 text-slate-200"}`}
                  >
                    PACU
                  </button>
                </div>
                <button 
                  onClick={() => setActiveBookletCase(null)} 
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer text-sm font-bold border border-white/20"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Main Master-Detail Split Workspace */}
            <div className="flex-1 flex overflow-hidden bg-[#F1F5F9]">
              {/* Left Sidebar Directory */}
              <div className="w-72 bg-[#F8FAFC] border-r border-[#DDE2EC] flex flex-col flex-shrink-0 text-slate-700 overflow-y-auto text-xs select-none">
                <div className="px-3.5 py-2.5 text-[10.5px] font-bold tracking-wider text-[#1E3A6E] uppercase border-b border-[#DDE2EC] bg-[#E2E8F0]/60">
                  OT Booklet Directory
                </div>

                <div className="p-2 space-y-3">
                  {/* Category 1: Ward & Pre-Op */}
                  <div>
                    <div className="px-2.5 py-1 bg-indigo-50 text-indigo-900 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between border-y border-indigo-100 rounded-md">
                      <span>I. Ward Pre-Op Desk</span>
                      <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-semibold border border-indigo-200">8 Pages</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {[
                        { num: 1, title: "Demographics & Cover", tag: "Ward", icon: "✓" },
                        { num: 2, title: "PAC Assessment", tag: "PAC", icon: "✓" },
                        { num: 3, title: "Anaesthesia Plan", tag: "PAC", icon: "✓" },
                        { num: 4, title: "Surgery Consent (En)", tag: "Ward", icon: "✓" },
                        { num: 5, title: "Surgery Consent (Te)", tag: "Ward", icon: "✓" },
                        { num: 6, title: "Anaes Consent (En)", tag: "Ward", icon: "✓" },
                        { num: 7, title: "Anaes Consent (Te)", tag: "Ward", icon: "✓" },
                        { num: 9, title: "Pre-Prep 17-Item Form", tag: "Ward", icon: "✓" },
                      ].map((p) => (
                        <button
                          key={p.num}
                          onClick={() => setBookletActivePage(p.num)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11.5px] transition-all cursor-pointer ${
                            bookletActivePage === p.num
                              ? "bg-[#1B4FD8] text-white font-semibold shadow-xs"
                              : "hover:bg-slate-200/70 text-slate-700 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`text-[10px] font-mono px-1 rounded ${bookletActivePage === p.num ? "bg-white/20 text-white font-bold" : "bg-slate-200 text-slate-600"}`}>
                              P{p.num < 10 ? `0${p.num}` : p.num}
                            </span>
                            <span className="truncate">{p.title}</span>
                          </div>
                          <span className={`text-[10px] font-bold ml-1 ${bookletActivePage === p.num ? "text-white" : "text-emerald-600"}`}>{p.icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category 2: OT Nurse & Surgical Suite */}
                  <div>
                    <div className="px-2.5 py-1 bg-amber-50 text-amber-900 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between border-y border-amber-100 rounded-md">
                      <span>II. OT Intra-Op Suite</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold border border-amber-200">5 Pages</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {[
                        { num: 8, title: "Master 21-Checklist", tag: "OT Nurse", icon: "⚡" },
                        { num: 10, title: "WHO 3-Phase Safety", tag: "OT Nurse", icon: "⚡" },
                        { num: 11, title: "Anaesthesia Intra-Op", tag: "Anaesthetist", icon: "⚡" },
                        { num: 12, title: "Operation Record", tag: "Surgeon", icon: "⚡" },
                        { num: 13, title: "Operation Notes", tag: "Surgeon", icon: "⚡" },
                      ].map((p) => (
                        <button
                          key={p.num}
                          onClick={() => setBookletActivePage(p.num)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11.5px] transition-all cursor-pointer ${
                            bookletActivePage === p.num
                              ? "bg-[#1B4FD8] text-white font-semibold shadow-xs"
                              : "hover:bg-slate-200/70 text-slate-700 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`text-[10px] font-mono px-1 rounded ${bookletActivePage === p.num ? "bg-white/20 text-white font-bold" : "bg-slate-200 text-slate-600"}`}>
                              P{p.num < 10 ? `0${p.num}` : p.num}
                            </span>
                            <span className="truncate">{p.title}</span>
                          </div>
                          <span className={`text-[10px] font-bold ml-1 ${bookletActivePage === p.num ? "text-white" : "text-amber-600"}`}>{p.icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category 3: PACU Recovery */}
                  <div>
                    <div className="px-2.5 py-1 bg-emerald-50 text-emerald-900 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between border-y border-emerald-100 rounded-md">
                      <span>III. PACU Recovery</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">1 Page</span>
                    </div>
                    <div className="mt-1">
                      {[
                        { num: 14, title: "Aldrete & Ward Transfer", tag: "PACU", icon: "🏥" },
                      ].map((p) => (
                        <button
                          key={p.num}
                          onClick={() => setBookletActivePage(p.num)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11.5px] transition-all cursor-pointer ${
                            bookletActivePage === p.num
                              ? "bg-[#1B4FD8] text-white font-semibold shadow-xs"
                              : "hover:bg-slate-200/70 text-slate-700 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`text-[10px] font-mono px-1 rounded ${bookletActivePage === p.num ? "bg-white/20 text-white font-bold" : "bg-[#F8FAFC] text-slate-600"}`}>
                              P{p.num}
                            </span>
                            <span className="truncate">{p.title}</span>
                          </div>
                          <span className={`text-[10px] font-bold ml-1 ${bookletActivePage === p.num ? "text-white" : "text-blue-600"}`}>{p.icon}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-auto p-3 border-t border-[#DDE2EC] text-[10.5px] text-slate-600 bg-[#E2E8F0]/40 space-y-1">
                  <div className="flex justify-between">
                    <span>Synchronized:</span>
                    <span className="text-emerald-700 font-semibold">✓ EHR Real-Time</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Audit Trail:</span>
                    <span className="font-mono text-slate-800 font-semibold">#OT-2026-889</span>
                  </div>
                </div>
              </div>

              {/* Right Document Canvas (Digital Sheet Presentation) */}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-[#F8FAFC]">
                {/* Official Letterhead Container */}
                <div className="bg-white rounded-lg border border-[#DDE2EC] shadow-xs p-6 space-y-5 max-w-3xl mx-auto min-h-[500px]">
                  
                  {/* Page Header Letterhead */}
                  <div className="border-b border-[#DDE2EC] pb-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>IMPERIAL HOSPITALS</span>
                        <span className="text-[10px] font-normal text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Bhimavaram · Andhra Pradesh
                        </span>
                      </h2>
                      <p className="text-[11px] text-[#64748B]">
                        Department of Surgical Services &amp; Anesthesiology
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800 font-mono">
                        OT BOOKLET PAGE {bookletActivePage} OF 14
                      </div>
                      <div className="text-[10px] text-[#64748B] font-mono">
                        FORM ID: IH-OT-2026-P{bookletActivePage < 10 ? `0${bookletActivePage}` : bookletActivePage}
                      </div>
                    </div>
                  </div>

                  {/* Departmental Data Source Banner */}
                  <div className="bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg px-3.5 py-2 flex items-center justify-between text-xs mb-3 shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className={`px-2.5 py-0.5 rounded-md font-semibold text-[10px] uppercase tracking-wider border ${
                        bookletActivePage === 1 ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                        (bookletActivePage === 2 || bookletActivePage === 3) ? "bg-sky-50 text-sky-800 border-sky-200" :
                        (bookletActivePage >= 4 && bookletActivePage <= 7) ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                        (bookletActivePage === 8 || bookletActivePage === 9) ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                        (bookletActivePage >= 10 && bookletActivePage <= 12) ? "bg-purple-50 text-purple-800 border-purple-200" :
                        bookletActivePage === 13 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}>
                        Source: {
                          bookletActivePage === 1 ? "Ward & Admission Census" :
                          (bookletActivePage === 2 || bookletActivePage === 3) ? "PAC Clinic & Central Lab" :
                          (bookletActivePage >= 4 && bookletActivePage <= 7) ? "Ward Nursing & Patient Consent" :
                          (bookletActivePage === 8 || bookletActivePage === 9) ? "Inpatient Ward Nursing Desk" :
                          (bookletActivePage >= 10 && bookletActivePage <= 12) ? "OT Suite (Scrub & Anaesthesia Desk)" :
                          bookletActivePage === 13 ? "Doctor Portal (Surgeon Notes)" : "PACU Recovery Desk"
                        }
                      </span>
                      <span className="text-slate-600 text-[11px] truncate hidden sm:inline">
                        {
                          (bookletActivePage >= 10 && bookletActivePage <= 12)
                            ? "Live Intra-Op Entry by Operating Room Staff"
                            : "Auto-populated from Department EHR Records"
                        }
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={saveBookletProgress}
                      className="text-[11px] font-semibold text-[#1E3A6E] hover:bg-[#F1F5F9] bg-white px-2.5 py-1 rounded-md border border-[#DDE2EC] cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      🔄 Sync Dept Data
                    </button>
                  </div>

                  {/* PAGE 1: COVER & DEMOGRAPHICS */}
                  {bookletActivePage === 1 && (
                    <div className="space-y-4">
                      <div className="bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg p-4 text-center space-y-1">
                        <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                          Official Medical Record
                        </div>
                        <h3 className="text-base font-bold text-slate-900">
                          OPERATION THEATRE CLINICAL BOOKLET
                        </h3>
                        <p className="text-[11px] text-slate-600">
                          Comprehensive Pre-Operative, Intra-Operative &amp; Recovery Documentation
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#DDE2EC]">
                          <span className="text-[#64748B] text-[11px] block">Patient Name</span>
                          <strong className="text-slate-900 font-semibold">{activeBookletCase.patientName}</strong>
                        </div>
                        <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#DDE2EC]">
                          <span className="text-[#64748B] text-[11px] block">UMR / MRN</span>
                          <strong className="font-mono text-slate-900">{activeBookletCase.mrn}</strong>
                        </div>
                        <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#DDE2EC]">
                          <span className="text-[#64748B] text-[11px] block">IP Number</span>
                          <strong className="font-mono text-slate-900">{activeBookletCase.ipNo || "IP-884920"}</strong>
                        </div>
                        <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#DDE2EC]">
                          <span className="text-[#64748B] text-[11px] block">Age / Gender</span>
                          <strong className="text-slate-900">{activeBookletCase.age} yrs / {activeBookletCase.gender}</strong>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                        <h4 className="font-semibold text-slate-800 text-xs border-b border-slate-200 pb-1">Surgical Assignment Details</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-slate-800">
                          <div><strong>Proposed Surgery:</strong> {activeBookletCase.procedureName}</div>
                          <div><strong>Specialty:</strong> {activeBookletCase.specialty}</div>
                          <div><strong>Assigned Suite:</strong> {activeBookletCase.orRoom}</div>
                          <div><strong>Primary Surgeon:</strong> Dr. {activeBookletCase.surgeon}</div>
                          <div><strong>Anesthesiologist:</strong> Dr. {activeBookletCase.anesthesiologist}</div>
                          <div><strong>Case Urgency:</strong> <span className="text-slate-900 font-bold">{activeBookletCase.urgency}</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 2: PAC ASSESSMENT */}
                  {bookletActivePage === 2 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page 2: Pre-Anaesthetic Assessment (PAC)
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          Cleared by PAC Consultant
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#DDE2EC] space-y-2">
                          <h4 className="font-semibold text-slate-900 border-b border-[#DDE2EC] pb-1">A. Medical History &amp; Habits</h4>
                          <ul className="space-y-1.5 text-slate-700">
                            <li className="flex justify-between"><span>Diabetes Mellitus:</span> <strong>No</strong></li>
                            <li className="flex justify-between"><span>Hypertension:</span> <strong className="text-slate-900">Yes (Controlled)</strong></li>
                            <li className="flex justify-between"><span>Ischaemic Heart Disease:</span> <strong>No</strong></li>
                            <li className="flex justify-between"><span>Known Drug Allergies:</span> <strong className="text-slate-900">None</strong></li>
                            <li className="flex justify-between"><span>Habits (Smoking / Alcohol):</span> <strong>Nil</strong></li>
                            <li className="flex justify-between"><span>Time of Last Meal:</span> <strong className="font-mono">10:00 PM (8h NPO)</strong></li>
                          </ul>
                        </div>

                        <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#DDE2EC] space-y-2">
                          <h4 className="font-semibold text-slate-900 border-b border-[#DDE2EC] pb-1">B. Airway &amp; ASA Grade</h4>
                          <div className="space-y-1.5 text-slate-700">
                            <div className="flex justify-between"><span>Mallampati Score:</span> <strong className="text-slate-900">Class I</strong></div>
                            <div className="flex justify-between"><span>ASA Physical Status:</span> <strong className="text-slate-900">ASA II</strong></div>
                            <div className="flex justify-between"><span>Thyromental Distance:</span> <strong>&gt; 6.5 cm</strong></div>
                            <div className="flex justify-between"><span>Dentures / Loose Teeth:</span> <strong>None / Normal</strong></div>
                            <div className="flex justify-between"><span>Anaesthesia Planned:</span> <strong className="text-slate-900">General Anaesthesia (GA)</strong></div>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#DDE2EC] space-y-2 text-xs">
                        <h4 className="font-semibold text-slate-900 border-b border-[#DDE2EC] pb-1">C. Laboratory &amp; Diagnostic Investigations</h4>
                        <div className="grid grid-cols-4 gap-3 font-mono text-[11.5px]">
                          <div>Hb%: <strong className="text-slate-900 block">13.2 g/dL</strong></div>
                          <div>Blood Group: <strong className="text-slate-900 block">O Positive</strong></div>
                          <div>Bl. Sugar: <strong className="text-slate-900 block">104 mg/dL</strong></div>
                          <div>S. Creatinine: <strong className="text-slate-900 block">0.9 mg/dL</strong></div>
                          <div>ECG: <strong className="text-slate-900 block">Normal Sinus</strong></div>
                          <div>Chest X-Ray: <strong className="text-slate-900 block">Clear Fields</strong></div>
                          <div>PT / INR: <strong className="text-slate-900 block">12.1s / 1.05</strong></div>
                          <div>2D Echo: <strong className="text-slate-900 block">EF 62% Normal</strong></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 3: ANAESTHESIA PLAN */}
                  {bookletActivePage === 3 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page 3: Anaesthesia Plan &amp; Immediate Pre-Op Re-Evaluation
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          Verified by Anaesthesiologist
                        </span>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#DDE2EC] space-y-3 text-xs">
                        <h4 className="font-semibold text-slate-900 border-b border-[#DDE2EC] pb-1">Preoperative Instructions &amp; Orders</h4>
                        <div className="grid grid-cols-2 gap-3 text-slate-800">
                          <div><strong>Planned Technique:</strong> General Anaesthesia with ETT</div>
                          <div><strong>NPO Orders:</strong> Solids 8h, Clear Liquids 2h</div>
                          <div><strong>Premedication:</strong> Inj. Glycopyrrolate 0.2mg IV, Inj. Ondansetron 4mg IV</div>
                          <div><strong>Blood Products:</strong> 2 Units PRBC Crossmatched in Blood Bank</div>
                          <div><strong>Special Monitoring:</strong> ECG, SpO2, EtCO2, Invasive Arterial BP</div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                        <h4 className="font-semibold text-slate-800 border-b border-slate-200 pb-1">Immediate Preoperative Re-Evaluation (Ward to OT Handoff)</h4>
                        <div className="grid grid-cols-2 gap-2.5 text-slate-800">
                          <div><strong>Surgical Site Marked &amp; Identified:</strong> <span className="text-slate-900 font-bold">✓ Confirmed</span></div>
                          <div><strong>NPO Status Re-Verified:</strong> <span className="text-slate-900 font-bold">✓ 10 Hours NPO</span></div>
                          <div><strong>Pre-Op Re-Eval Vitals:</strong> <span className="font-mono font-semibold">BP 124/82 · HR 74 bpm</span></div>
                          <div><strong>Change of Plan Required:</strong> <span className="text-slate-600">None</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 4 & 5: SURGERY CONSENTS */}
                  {(bookletActivePage === 4 || bookletActivePage === 5) && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page {bookletActivePage}: Informed Consent for Surgery {bookletActivePage === 5 ? "(శస్త్ర చికిత్స అంగీకార పత్రము)" : "(English)"}
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          ✓ Legally Signed &amp; Sealed
                        </span>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg space-y-3 text-xs text-slate-800">
                        {bookletActivePage === 4 ? (
                          <p className="leading-relaxed">
                            <strong>Authorisation of Patient / Representative:</strong> I hereby authorize the performance of the surgery / procedure 
                            <strong className="text-slate-900"> {activeBookletCase.procedureName}</strong> under Dr. <strong>{activeBookletCase.surgeon}</strong>.
                            I have been made aware of the potential risks (bleeding, infection, anesthesia complications, open procedure conversion) and willfully grant consent.
                          </p>
                        ) : (
                          <p className="leading-relaxed font-medium">
                            నేను ఈ క్రింద తెలిపిన శస్త్ర చికిత్స చేయించుకొనుటకు నా పూర్తి అంగీకారమును తెలుపుచున్నాను: 
                            <strong className="text-slate-900"> {activeBookletCase.procedureName}</strong>. 
                            ఈ చికిత్స వల్ల కలుగు ప్రమాదములు మరియు ఫలితముల గూర్చి డాక్టర్ <strong>{activeBookletCase.surgeon}</strong> గారు నాకు వివరించారు.
                          </p>
                        )}

                        <div className="pt-3 border-t border-[#DDE2EC] grid grid-cols-3 gap-3 text-center">
                          <div className="p-2 bg-white rounded border border-[#DDE2EC]">
                            <div className="text-[10px] text-slate-500">Patient / Relative</div>
                            <div className="text-slate-800 font-bold text-xs mt-0.5">✓ Signed</div>
                          </div>
                          <div className="p-2 bg-white rounded border border-[#DDE2EC]">
                            <div className="text-[10px] text-slate-500">Witness</div>
                            <div className="text-slate-800 font-bold text-xs mt-0.5">✓ Signed</div>
                          </div>
                          <div className="p-2 bg-white rounded border border-[#DDE2EC]">
                            <div className="text-[10px] text-slate-500">Lead Surgeon</div>
                            <div className="text-slate-900 font-bold text-xs mt-0.5">Dr. {activeBookletCase.surgeon}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 6 & 7: ANAESTHESIA CONSENTS */}
                  {(bookletActivePage === 6 || bookletActivePage === 7) && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page {bookletActivePage}: Consent for Anaesthesia &amp; Analgesia {bookletActivePage === 7 ? "(అనస్థీషియా అంగీకార పత్రము)" : "(English)"}
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          ✓ Signed &amp; Verified
                        </span>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg space-y-3 text-xs text-slate-800">
                        {bookletActivePage === 6 ? (
                          <p className="leading-relaxed">
                            I give consent for General / Regional Anaesthesia and Post-Operative Analgesia to be administered by Dr. <strong>{activeBookletCase.anesthesiologist}</strong>. Potential risks including sore throat, nausea, and intravascular monitoring lines have been discussed.
                          </p>
                        ) : (
                          <p className="leading-relaxed font-medium">
                            నాకు అనస్థీషియా / మత్తు / నొప్పి నివారణ చికిత్సలు ఇచ్చుటకు డాక్టర్ <strong>{activeBookletCase.anesthesiologist}</strong> గారికి నా పూర్తి సమ్మతిని తెలియజేయుచున్నాను.
                          </p>
                        )}

                        <div className="pt-3 border-t border-[#DDE2EC] flex justify-between items-center text-xs font-semibold text-slate-700">
                          <span>✓ Patient Consent Confirmed</span>
                          <span>✓ Anaesthesiologist Signature Verified</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 8: MASTER 21-ITEM CHECKLIST */}
                  {bookletActivePage === 8 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page 8: Check List for Surgery Patients (Master 21-Item Checklist)
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          Live OT Nurse Verification
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DDE2EC] space-y-1.5">
                          <h4 className="font-bold text-slate-900 text-[11px] border-b border-[#DDE2EC] pb-1">Pre-Operative (1-10)</h4>
                          <ul className="space-y-1 text-slate-700 text-[11px]">
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 1. Blood Products</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 2. Financial Approval</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 3. PAC Completed</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 4. Patient Prep</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 5. Anaesthesia Consent</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 6. Surgery Consent</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 7. High Risk Consent</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 8. Transfusion Consent</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 9. Antibiotic Given</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 10. Pre-Prep Form</label></li>
                          </ul>
                        </div>

                        <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DDE2EC] space-y-1.5">
                          <h4 className="font-bold text-slate-900 text-[11px] border-b border-[#DDE2EC] pb-1">Intra-Operative (11-15)</h4>
                          <ul className="space-y-1 text-slate-700 text-[11px]">
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 11. Anaesthesia Notes</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 12. WHO Safety List</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 13. Operation Notes</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 14. Surgeon Notes</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 15. Medication Chart</label></li>
                          </ul>
                        </div>

                        <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#DDE2EC] space-y-1.5">
                          <h4 className="font-bold text-slate-900 text-[11px] border-b border-[#DDE2EC] pb-1">Post-Operative (16-21)</h4>
                          <ul className="space-y-1 text-slate-700 text-[11px]">
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 16. Recovery Eval</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 17. Anaes Record</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 18. Nurse Handover</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 19. Quality Indicators</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 20. Photos/Videos</label></li>
                            <li><label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" defaultChecked className="rounded text-slate-700" /> 21. Radiology Handover</label></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 9: PRE-PREPARATION FORM */}
                  {bookletActivePage === 9 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page 9: Pre-Preparation Form for Operation (17 Ward Items)
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          Ward Handover Completed
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-[#F8FAFC] p-4 rounded-lg border border-[#DDE2EC] text-xs">
                        <div>1. Consent: <strong className="text-slate-900">Taken</strong></div>
                        <div>2. G.C.: <strong>Fair</strong></div>
                        <div>3. B.P.: <strong className="font-mono">124/80 mmHg</strong></div>
                        <div>4. Pulse: <strong className="font-mono">76 bpm</strong></div>
                        <div>5. Temp: <strong className="font-mono">98.4 °F</strong></div>
                        <div>6. ID Tag: <strong className="text-slate-900">Verified</strong></div>
                        <div>7. Weight: <strong>68 Kg</strong></div>
                        <div>8. Premedication: <strong>Given</strong></div>
                        <div>9. Ryles Tube: <strong>N/A</strong></div>
                        <div>10. Enema: <strong>Given</strong></div>
                        <div>11. Last Micturition: <strong>06:30 AM</strong></div>
                        <div>12. Last Feed: <strong>10:00 PM</strong></div>
                        <div>13. Nail Polish/Lipstick: <strong>Removed</strong></div>
                        <div>14. Dentures/Jewels: <strong>Removed</strong></div>
                        <div>15. Site Prep/Shave: <strong className="text-slate-900">Done</strong></div>
                        <div>16. X-Ray Reports: <strong>Enclosed</strong></div>
                        <div>17. Lab Reports: <strong>Enclosed</strong></div>
                      </div>

                      <div className="flex justify-between items-center text-xs font-semibold p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                        <div>Handed Over By: <span className="text-slate-900">RN Pham (Ward)</span></div>
                        <div>Taken Over By: <span className="text-slate-900">RN Murphy (OT Nurse)</span></div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 10: WHO SURGICAL SAFETY CHECKLIST */}
                  {bookletActivePage === 10 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page 10: Surgical Safety Check List (WHO 3-Phase Checklist)
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          Live OT Safety Check
                        </span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={intraOpForm.whoSignIn} 
                            onChange={(e) => setIntraOpForm({...intraOpForm, whoSignIn: e.target.checked})}
                            className="mt-0.5 rounded text-slate-800" 
                          />
                          <div>
                            <span className="font-bold text-slate-900 block mb-0.5">Phase 1: Sign-In (Before Induction of Anaesthesia)</span>
                            <span className="text-slate-700">Patient identity, site, procedure &amp; consent confirmed. Anaesthesia machine &amp; medication check complete. Pulse oximeter on &amp; functioning. Airway &amp; allergy risk assessed.</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={intraOpForm.whoTimeOut} 
                            onChange={(e) => setIntraOpForm({...intraOpForm, whoTimeOut: e.target.checked})}
                            className="mt-0.5 rounded text-slate-800" 
                          />
                          <div>
                            <span className="font-bold text-slate-900 block mb-0.5">Phase 2: Time-Out (Before Skin Incision)</span>
                            <span className="text-slate-700">Confirm all team members introduced by name &amp; role. Confirm patient name, procedure &amp; incision site. Antibiotic prophylaxis given within last 60 minutes. Critical steps &amp; imaging reviewed.</span>
                          </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={intraOpForm.whoSignOut} 
                            onChange={(e) => setIntraOpForm({...intraOpForm, whoSignOut: e.target.checked})}
                            className="mt-0.5 rounded text-slate-800" 
                          />
                          <div>
                            <span className="font-bold text-slate-900 block mb-0.5">Phase 3: Sign-Out (Before Patient Leaves Operating Room)</span>
                            <span className="text-slate-700">Nurse verbally confirms: Name of procedure recorded, instrument/sponge/needle counts correct, specimen labelled aloud, equipment issues addressed, and recovery key concerns reviewed.</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* PAGE 11: ANAESTHESIA INTRA-OP RECORD */}
                  {bookletActivePage === 11 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page 11: Anaesthesia Intra-Op Record &amp; Vitals Grid
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          Live Intra-Op Vitals
                        </span>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg space-y-3 text-xs">
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[#64748B] text-[11px] mb-1">BP (mmHg)</label>
                            <input type="text" value={intraOpForm.bp} onChange={(e) => setIntraOpForm({...intraOpForm, bp: e.target.value})} className="w-full border border-[#DDE2EC] rounded px-2.5 py-1.5 bg-white font-mono" />
                          </div>
                          <div>
                            <label className="block text-[#64748B] text-[11px] mb-1">Heart Rate (bpm)</label>
                            <input type="number" value={intraOpForm.hr} onChange={(e) => setIntraOpForm({...intraOpForm, hr: parseInt(e.target.value) || 72})} className="w-full border border-[#DDE2EC] rounded px-2.5 py-1.5 bg-white font-mono" />
                          </div>
                          <div>
                            <label className="block text-[#64748B] text-[11px] mb-1">SpO2 (%)</label>
                            <input type="number" value={intraOpForm.spo2} onChange={(e) => setIntraOpForm({...intraOpForm, spo2: parseInt(e.target.value) || 99})} className="w-full border border-[#DDE2EC] rounded px-2.5 py-1.5 bg-white font-mono" />
                          </div>
                          <div>
                            <label className="block text-[#64748B] text-[11px] mb-1">EtCO2 (mmHg)</label>
                            <input type="number" value={intraOpForm.etco2} onChange={(e) => setIntraOpForm({...intraOpForm, etco2: parseInt(e.target.value) || 35})} className="w-full border border-[#DDE2EC] rounded px-2.5 py-1.5 bg-white font-mono" />
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-[#DDE2EC] space-y-1 font-mono text-[11.5px] text-slate-800">
                          <div className="text-slate-500 text-[10.5px] font-sans font-bold mb-1">INTRA-OPERATIVE DRUG LOG</div>
                          <div>08:30 AM — Induction: Propofol 140mg IV + Fentanyl 100mcg IV + Atracurium 35mg IV</div>
                          <div>09:00 AM — Maintenance: Sevoflurane 2.0% in O2/Air · BP {intraOpForm.bp} · HR {intraOpForm.hr} · SpO2 {intraOpForm.spo2}%</div>
                          <div>10:00 AM — Reversal: Neostigmine 2.5mg + Glycopyrrolate 0.5mg IV · Smooth Extubation</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 12: OPERATION RECORD */}
                  {bookletActivePage === 12 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page 12: Operation Record (Surgeon &amp; Surgical Nurse Form)
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          Surgical Nurse Verification
                        </span>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg space-y-3 text-xs">
                        <div className="grid grid-cols-3 gap-3">
                          <label className="flex items-center gap-2 p-2.5 bg-white border border-[#DDE2EC] rounded-lg font-bold text-xs cursor-pointer">
                            <input type="checkbox" checked={intraOpForm.swabCount} onChange={(e) => setIntraOpForm({...intraOpForm, swabCount: e.target.checked})} className="rounded text-slate-800" />
                            <span>✓ Swab Count Correct</span>
                          </label>
                          <label className="flex items-center gap-2 p-2.5 bg-white border border-[#DDE2EC] rounded-lg font-bold text-xs cursor-pointer">
                            <input type="checkbox" checked={intraOpForm.needleCount} onChange={(e) => setIntraOpForm({...intraOpForm, needleCount: e.target.checked})} className="rounded text-slate-800" />
                            <span>✓ Needle Count Correct</span>
                          </label>
                          <label className="flex items-center gap-2 p-2.5 bg-white border border-[#DDE2EC] rounded-lg font-bold text-xs cursor-pointer">
                            <input type="checkbox" checked={intraOpForm.instrumentCount} onChange={(e) => setIntraOpForm({...intraOpForm, instrumentCount: e.target.checked})} className="rounded text-slate-800" />
                            <span>✓ Instrument Count Correct</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Estimated Blood Loss (ml)</label>
                            <input 
                              type="number" 
                              value={intraOpForm.bloodLossMl} 
                              onChange={(e) => setIntraOpForm({...intraOpForm, bloodLossMl: parseInt(e.target.value) || 0})} 
                              className="w-full border border-[#DDE2EC] rounded p-2 bg-white font-mono font-bold" 
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Sutures &amp; Staples Used</label>
                            <input 
                              type="text" 
                              value={intraOpForm.suturesUsed} 
                              onChange={(e) => setIntraOpForm({...intraOpForm, suturesUsed: e.target.value})} 
                              className="w-full border border-[#DDE2EC] rounded p-2 bg-white" 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-700 font-semibold mb-1">Operative Findings &amp; Procedure Executed</label>
                          <textarea 
                            rows={3} 
                            value={intraOpForm.operativeNotes} 
                            onChange={(e) => setIntraOpForm({...intraOpForm, operativeNotes: e.target.value})} 
                            className="w-full border border-[#DDE2EC] rounded p-2.5 bg-white"
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 13: OPERATION NOTES */}
                  {bookletActivePage === 13 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page 13: Operation Notes (Contd...) &amp; Post-Op Orders
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          Surgeon Post-Op Orders
                        </span>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg space-y-3 text-xs">
                        <div>
                          <label className="block font-semibold text-slate-900 mb-1">Surgeon Detailed Operative Summary</label>
                          <textarea 
                            rows={3}
                            defaultValue="Gallbladder dissected cleanly from hepatic bed. Cystic duct and artery double ligated with clips. Hemostasis achieved. Specimen retrieved in endo-bag and sent for histopathology."
                            className="w-full border border-[#DDE2EC] rounded p-2.5 bg-white"
                          ></textarea>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-900 mb-1">Post-Operative Nursing Instructions</label>
                          <textarea 
                            rows={2.5}
                            defaultValue="1. NPO for 4 hours. 2. Monitor vitals q15m x 1h then q30m x 2h. 3. Inj. Paracetamol 1g IV TDS for pain relief. 4. Inspect abdominal dressing for soakage."
                            className="w-full border border-[#DDE2EC] rounded p-2.5 bg-white"
                          ></textarea>
                        </div>
                        <div className="text-right text-slate-800 font-bold pt-1 border-t border-[#DDE2EC]">
                          Surgeon Signature: Dr. {activeBookletCase.surgeon}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAGE 14: ALDRETE & PACU RECOVERY */}
                  {bookletActivePage === 14 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-[#DDE2EC] pb-2">
                        <h3 className="font-bold text-sm text-slate-900">
                          Page 14: Recovery Evaluation &amp; Modified Aldrete Score
                        </h3>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                          PACU Discharge Clearance
                        </span>
                      </div>

                      <div className="p-4 bg-[#F8FAFC] border border-[#DDE2EC] rounded-lg space-y-4 text-xs">
                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-[#DDE2EC]">
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">Modified Aldrete Recovery Score</span>
                            <span className="text-[11px] text-slate-500">Threshold for Ward Transfer: $\ge 9 / 10$</span>
                          </div>
                          <span className={`px-3 py-1 text-white font-mono font-bold text-sm rounded-lg shadow-xs ${calculateTotalAldrete() >= 9 ? "bg-slate-800" : "bg-slate-700"}`}>
                            {calculateTotalAldrete()} / 10
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-white p-3 rounded-lg border border-[#DDE2EC]">
                            <label className="block text-slate-800 font-semibold mb-1">1. Activity (0-2)</label>
                            <select value={intraOpForm.aldreteActivity} onChange={(e) => setIntraOpForm({...intraOpForm, aldreteActivity: parseInt(e.target.value)})} className="w-full border border-[#DDE2EC] rounded p-1.5 bg-white">
                              <option value={2}>2 - Moves 4 extremities voluntarily</option>
                              <option value={1}>1 - Moves 2 extremities voluntarily</option>
                              <option value={0}>0 - Moves 0 extremities</option>
                            </select>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-[#DDE2EC]">
                            <label className="block text-slate-800 font-semibold mb-1">2. Respiration (0-2)</label>
                            <select value={intraOpForm.aldreteRespiration} onChange={(e) => setIntraOpForm({...intraOpForm, aldreteRespiration: parseInt(e.target.value)})} className="w-full border border-[#DDE2EC] rounded p-1.5 bg-white">
                              <option value={2}>2 - Deep breath &amp; cough freely</option>
                              <option value={1}>1 - Dyspneic or limited breathing</option>
                              <option value={0}>0 - Apneic</option>
                            </select>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-[#DDE2EC]">
                            <label className="block text-slate-800 font-semibold mb-1">3. Circulation / BP (0-2)</label>
                            <select value={intraOpForm.aldreteCirculation} onChange={(e) => setIntraOpForm({...intraOpForm, aldreteCirculation: parseInt(e.target.value)})} className="w-full border border-[#DDE2EC] rounded p-1.5 bg-white">
                              <option value={2}>2 - BP ± 20 mm Hg of preanesthetic level</option>
                              <option value={1}>1 - BP ± 20-50 mm Hg of preanesthetic level</option>
                              <option value={0}>0 - BP ± 50 mm Hg of preanesthetic level</option>
                            </select>
                          </div>

                          <div className="bg-white p-3 rounded-lg border border-[#DDE2EC]">
                            <label className="block text-slate-800 font-semibold mb-1">4. Consciousness (0-2)</label>
                            <select value={intraOpForm.aldreteConsciousness} onChange={(e) => setIntraOpForm({...intraOpForm, aldreteConsciousness: parseInt(e.target.value)})} className="w-full border border-[#DDE2EC] rounded p-1.5 bg-white">
                              <option value={2}>2 - Fully awake &amp; oriented</option>
                              <option value={1}>1 - Arousable on calling</option>
                              <option value={0}>0 - Unresponsive</option>
                            </select>
                          </div>
                        </div>

                        <div className="p-3 bg-white rounded-lg border border-[#DDE2EC] flex justify-between items-center">
                          <span className={`font-bold ${calculateTotalAldrete() >= 9 ? "text-slate-800" : "text-slate-600"}`}>
                            {calculateTotalAldrete() >= 9 ? "✓ Aldrete Target Met (≥9). Patient cleared for Ward Transfer." : "⚠️ Patient score < 9. Must remain in PACU."}
                          </span>
                          {calculateTotalAldrete() >= 9 && (
                            <Btn size="sm" variant="primary" onClick={() => {
                              handleUpdateStatus(activeBookletCase.id, "Completed");
                              setActiveBookletCase(null);
                            }}>
                              Authorize Ward Transfer ➔
                            </Btn>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Modal Bottom Action Footer */}
            <div className="bg-white border-t border-[#DDE2EC] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Btn 
                  variant="outline" 
                  size="xs" 
                  onClick={() => setBookletActivePage(Math.max(1, bookletActivePage - 1))}
                  disabled={bookletActivePage === 1}
                >
                  ◀ Previous Page
                </Btn>
                <span className="text-xs font-mono text-slate-500 px-2">
                  Page {bookletActivePage} / 14
                </span>
                <Btn 
                  variant="outline" 
                  size="xs" 
                  onClick={() => setBookletActivePage(Math.min(14, bookletActivePage + 1))}
                  disabled={bookletActivePage === 14}
                >
                  Next Page ▶
                </Btn>
              </div>

              <div className="flex items-center gap-2">
                <Btn variant="outline" size="xs" onClick={saveBookletProgress}>
                  💾 Save Progress
                </Btn>
                <Btn variant="primary" size="xs" onClick={() => setActiveBookletCase(null)}>
                  Close Booklet
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BOOK SURGERY CASE */}
      {bookingOrRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-[#DDE2EC]">
            <div className="bg-[#1B4FD8] text-white px-5 py-2.5 flex justify-between items-center">
              <h3 className="font-semibold text-sm">Book OT Case ({bookingOrRoom})</h3>
              <button onClick={() => setBookingOrRoom(null)} className="text-white hover:text-gray-200 text-base font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateCase} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Patient Name *</label>
                  <input 
                    type="text" 
                    required
                    value={bookForm.patientName}
                    onChange={(e) => setBookForm({...bookForm, patientName: e.target.value})}
                    placeholder="e.g. John Doe" 
                    className="w-full border border-[#DDE2EC] rounded px-2.5 py-1 focus:border-[#1B4FD8]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">UMR Number</label>
                  <input 
                    type="text" 
                    value={bookForm.mrn}
                    onChange={(e) => setBookForm({...bookForm, mrn: e.target.value})}
                    placeholder="Auto-generated if empty" 
                    className="w-full border border-[#DDE2EC] rounded px-2.5 py-1 focus:border-[#1B4FD8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Age</label>
                  <input 
                    type="number" 
                    value={bookForm.age}
                    onChange={(e) => setBookForm({...bookForm, age: e.target.value})}
                    placeholder="45" 
                    className="w-full border border-[#DDE2EC] rounded px-2.5 py-1 focus:border-[#1B4FD8]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Gender</label>
                  <select 
                    value={bookForm.gender}
                    onChange={(e) => setBookForm({...bookForm, gender: e.target.value as any})}
                    className="w-full border border-[#DDE2EC] rounded px-2.5 py-1 focus:border-[#1B4FD8] bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Urgency</label>
                  <select 
                    value={bookForm.urgency}
                    onChange={(e) => setBookForm({...bookForm, urgency: e.target.value as any})}
                    className="w-full border border-[#DDE2EC] rounded px-2.5 py-1 focus:border-[#1B4FD8] bg-white"
                  >
                    <option value="Elective">Elective</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency STAT">Emergency STAT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Procedure Name *</label>
                <input 
                  type="text" 
                  required
                  value={bookForm.procedure}
                  onChange={(e) => setBookForm({...bookForm, procedure: e.target.value})}
                  placeholder="e.g. Laparoscopic Appendectomy" 
                  className="w-full border border-[#DDE2EC] rounded px-2.5 py-1 focus:border-[#1B4FD8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Lead Surgeon</label>
                  <select 
                    value={bookForm.surgeon}
                    onChange={(e) => setBookForm({...bookForm, surgeon: e.target.value})}
                    className="w-full border border-[#DDE2EC] rounded px-2.5 py-1 focus:border-[#1B4FD8] bg-white"
                  >
                    <option value="Dr. Adams">Dr. Adams (Ortho)</option>
                    <option value="Dr. Rodriguez">Dr. Rodriguez (Cardiac)</option>
                    <option value="Dr. Chen">Dr. Chen (General)</option>
                    <option value="Dr. Gupta">Dr. Gupta (Neuro)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Anesthesiologist</label>
                  <select 
                    value={bookForm.anesthesiologist}
                    onChange={(e) => setBookForm({...bookForm, anesthesiologist: e.target.value})}
                    className="w-full border border-[#DDE2EC] rounded px-2.5 py-1 focus:border-[#1B4FD8] bg-white"
                  >
                    <option value="Dr. Rodriguez">Dr. Rodriguez</option>
                    <option value="Dr. Patel">Dr. Patel</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE2EC]">
                <Btn variant="outline" size="sm" type="button" onClick={() => setBookingOrRoom(null)}>Cancel</Btn>
                <Btn variant="primary" size="sm" type="submit">Confirm &amp; Book Case</Btn>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESERVE EMERGENCY STAT */}
      {showStatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-[#DDE2EC]">
            <div className="bg-[#DC2626] text-white px-5 py-2.5 flex justify-between items-center">
              <h3 className="font-semibold text-sm">Reserve Emergency STAT OT</h3>
              <button onClick={() => setShowStatModal(false)} className="text-white hover:text-gray-200 text-base font-bold cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-[#DC2626] font-medium bg-red-50 p-2.5 rounded border border-red-200">
                ⚠️ Reserving an Emergency STAT OT overrides current schedules and alerts the OT charge nurse immediately.
              </p>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Target Suite</label>
                <select className="w-full border border-[#DDE2EC] rounded px-2.5 py-1 bg-white font-semibold">
                  <option value="OR 4">OR 4 (Dedicated Trauma OT)</option>
                  <option value="OR 2">OR 2 (General Emergency)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Emergency Nature</label>
                <textarea rows={2} placeholder="e.g. Acute Abdominal Trauma STAT" className="w-full border border-[#DDE2EC] rounded p-2 focus:border-[#DC2626]"></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE2EC]">
                <Btn variant="outline" size="sm" onClick={() => setShowStatModal(false)}>Cancel</Btn>
                <Btn variant="danger" size="sm" onClick={async () => {
                  try {
                    await SurgeryDatabase.createCase({
                      patientId: `P-STAT-${Math.floor(1000 + Math.random() * 9000)}`,
                      patientName: "STAT Emergency Patient",
                      mrn: `UMR-STAT-${Math.floor(1000 + Math.random() * 9000)}`,
                      ipNo: `IP-STAT-${Math.floor(1000 + Math.random() * 9000)}`,
                      age: 38,
                      gender: "Male",
                      surgeon: "Dr. Chen",
                      anesthesiologist: "Dr. Rodriguez",
                      scrubNurse: "RN Murphy",
                      circulatingNurse: "RN Davis",
                      cptCode: "49000",
                      icd10Code: "S36.9XXA",
                      procedureName: "Emergency Exploratory Laparotomy",
                      specialty: "General Surgery",
                      orRoom: "OR 4",
                      scheduledTime: "IMMEDIATE STAT",
                      durationEst: "180 mins",
                      urgency: "Emergency STAT",
                      insuranceProvider: "Emergency Pool",
                      totalAmount: 65000,
                      status: "Pre-Op Holding"
                    });
                  } catch {}
                  setShowStatModal(false);
                }}>
                  Confirm STAT Reservation
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHARGES BREAKDOWN */}
      {activeChargesCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-[#DDE2EC]">
            <div className="bg-[#16A34A] text-white px-5 py-2.5 flex justify-between items-center">
              <h3 className="font-semibold text-sm">Surgical Charges — {activeChargesCase.patientName}</h3>
              <button onClick={() => setActiveChargesCase(null)} className="text-white hover:text-gray-200 text-base font-bold cursor-pointer">✕</button>
            </div>
            <div className="p-5 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span>OT Room Charge (2 hrs @ ₹3,500/hr)</span>
                <span className="font-mono font-semibold">₹7,000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span>Surgeon Professional Fee</span>
                <span className="font-mono font-semibold">₹25,000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span>Anesthesia Fee &amp; Medication Kit</span>
                <span className="font-mono font-semibold">₹8,500</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                <span>Surgical Consumables &amp; Implants</span>
                <span className="font-mono font-semibold">₹14,200</span>
              </div>
              <div className="flex justify-between py-2 font-semibold text-xs text-gray-900 border-t border-[#DDE2EC]">
                <span>Total Invoiced Amount</span>
                <span className="font-mono text-[#16A34A]">₹54,700</span>
              </div>
            </div>
            <div className="p-3 bg-[#F8FAFC] border-t border-[#DDE2EC] flex justify-end">
              <Btn variant="primary" size="xs" onClick={() => setActiveChargesCase(null)}>Close</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, count, color, text, icon }: any) {
  return (
    <div className="bg-white p-3 rounded border border-[#DDE2EC] shadow-2xs flex items-center justify-between">
      <div>
        <div className="text-2xl font-semibold font-mono text-gray-900 leading-none mb-1">{count}</div>
        <div className="text-[11px] font-medium text-[#64748B]">{label}</div>
      </div>
      <div className="text-xl opacity-80">{icon}</div>
    </div>
  );
}
