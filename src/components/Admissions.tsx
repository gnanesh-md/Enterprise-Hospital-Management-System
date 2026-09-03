import { useEffect, useMemo, useState } from "react";
import { Icon } from "./icons";
import { BedCard, type BedCardData } from "./bed/BedCard";
import { apiFetch, reportError } from "../lib/api";
import { formatDateTimeIST } from "../lib/format";
import type { Notice } from "../types";

type Bed = BedCardData & {
  ward: string;
  bed_type: string;
  admission_date: string | null;
};

type Summary = { total: number; available: number; occupied: number; maintenance: number };

type ErBedRequest = {
  id: number;
  visit_no: string;
  patient_name: string | null;
  patient_last_name: string | null;
  is_unknown_patient: boolean;
  unknown_patient_label: string | null;
  requested_level_of_care: string;
  requested_specialty: string | null;
  requested_at: string;
};

function requestPatientLabel(req: ErBedRequest): string {
  if (req.is_unknown_patient) return req.unknown_patient_label || "Unidentified patient";
  const name = `${req.patient_name || ""} ${req.patient_last_name || ""}`.trim();
  return name || "Patient";
}

type Props = { setNotice?: (n: Notice | null) => void; navigate?: (page: string) => void };

export default function Admissions({ setNotice, navigate }: Props) {
  const [activeTab, setActiveTab] = useState<"requests" | "admitted">("requests");
  const [beds, setBeds] = useState<Bed[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, available: 0, occupied: 0, maintenance: 0 });
  const [requests, setRequests] = useState<ErBedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [bedsRes, requestsRes] = await Promise.all([
        apiFetch<{ beds: Bed[]; summary: Summary }>("/api/beds"),
        apiFetch<{ bed_requests: ErBedRequest[] }>("/api/er/bed-requests?status=pending").catch(() => ({
          bed_requests: [] as ErBedRequest[],
        })),
      ]);
      setBeds(bedsRes.beds || []);
      setSummary(bedsRes.summary || { total: 0, available: 0, occupied: 0, maintenance: 0 });
      setRequests(requestsRes.bed_requests || []);
    } catch (error: any) {
      reportError(setNotice, error, "Failed to load admissions data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const availableGeneral = beds.filter((b) => b.status === "Available" && b.bed_type !== "ICU").length;
  const availableIcu = beds.filter((b) => b.status === "Available" && b.bed_type === "ICU").length;

  const admittedToday = useMemo(() => {
    const today = new Date().toDateString();
    return beds
      .filter((b) => b.status === "Occupied" && b.admission_date && new Date(b.admission_date).toDateString() === today)
      .sort((a, b) => new Date(b.admission_date!).getTime() - new Date(a.admission_date!).getTime());
  }, [beds]);

  const goToBedManagement = () => navigate?.("beds");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Inpatient Admissions</h1>
          <p className="text-[12.5px] text-[#64748B]">Live admission requests and today's admissions -- assign beds from Bed Management.</p>
        </div>
        <button
          onClick={goToBedManagement}
          className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2"
        >
          <Icon.Plus /> Direct Admission
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 flex max-w-7xl mx-auto w-full flex-col gap-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
            <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Pending Requests</div>
            <div className="text-2xl font-bold text-[#D97706]">{loading ? "—" : requests.length}</div>
          </div>
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
            <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Admitted Today</div>
            <div className="text-2xl font-bold text-[#16A34A]">{loading ? "—" : admittedToday.length}</div>
          </div>
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
            <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Available Beds (Gen)</div>
            <div className="text-2xl font-bold text-gray-900">{loading ? "—" : availableGeneral}</div>
          </div>
          <div className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm">
            <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">Available Beds (ICU)</div>
            <div className="text-2xl font-bold text-[#DC2626]">{loading ? "—" : availableIcu}</div>
          </div>
        </div>

        <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-[#DDE2EC] flex px-4">
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${activeTab === "requests" ? "border-[#1B4FD8] text-[#1B4FD8]" : "border-transparent text-[#64748B] hover:text-gray-900"}`}
            >
              Pending Admission Requests ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab("admitted")}
              className={`px-4 py-3 text-[13px] font-semibold border-b-2 transition-colors ${activeTab === "admitted" ? "border-[#1B4FD8] text-[#1B4FD8]" : "border-transparent text-[#64748B] hover:text-gray-900"}`}
            >
              Admitted Today ({admittedToday.length})
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-[#F8FAFC]">
            {activeTab === "requests" && (
              <div className="p-4 space-y-3">
                {loading ? (
                  <p className="text-[12.5px] text-[#64748B] p-4">Loading...</p>
                ) : requests.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center text-[#94A3B8]">
                    <div className="text-5xl mb-4">📋</div>
                    <div className="text-[14px] font-medium text-gray-700 mb-1">No Pending Requests</div>
                    <div className="text-[12.5px]">ER admission requests awaiting a bed will appear here.</div>
                  </div>
                ) : (
                  requests.map((req) => (
                    <div key={req.id} className="bg-white border border-[#DDE2EC] rounded-lg p-4 shadow-sm flex items-center justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px] bg-[#1B4FD8]">
                          {requestPatientLabel(req).charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[14px] font-bold text-gray-900">{requestPatientLabel(req)}</h3>
                            <span className="text-[11px] font-mono text-[#64748B]">{req.visit_no}</span>
                          </div>
                          <div className="text-[12.5px] text-gray-700 mb-1">
                            <strong>Requested:</strong> {req.requested_level_of_care.toUpperCase()}
                            {req.requested_specialty ? ` · ${req.requested_specialty}` : ""}
                          </div>
                          <div className="text-[11.5px] text-[#64748B]">
                            Requested from ER · {formatDateTimeIST(req.requested_at)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={goToBedManagement}
                        className="px-4 py-1.5 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] shadow-sm"
                      >
                        Assign Bed
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "admitted" && (
              <div className="p-4">
                {loading ? (
                  <p className="text-[12.5px] text-[#64748B] p-4">Loading...</p>
                ) : admittedToday.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center text-[#94A3B8]">
                    <div className="text-5xl mb-4">🛏️</div>
                    <div className="text-[14px] font-medium text-gray-700 mb-1">No Admissions Today</div>
                    <div className="text-[12.5px]">Patients admitted today will appear here.</div>
                  </div>
                ) : (
                  <div className="bed-info-card-grid">
                    {admittedToday.map((bed) => (
                      <BedCard key={bed.id} bed={bed} readOnly />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
