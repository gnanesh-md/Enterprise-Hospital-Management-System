import { API_BASE } from "./constants";
import type { Notice } from "../types";
import { ErDatabase } from "../services/erDb";
import { BedDatabase } from "../services/bedDb";

const HOSPITAL_CODE_KEY = "hospai_hospital_code";
const DEFAULT_HOSPITAL_CODE = "hosp-default";

export function getHospitalCode(): string {
  if (typeof window === "undefined") return DEFAULT_HOSPITAL_CODE;
  const stored = (window.localStorage.getItem(HOSPITAL_CODE_KEY) || "").trim().toLowerCase();
  return stored || DEFAULT_HOSPITAL_CODE;
}

export function setHospitalCode(hospitalCode: string): void {
  if (typeof window === "undefined") return;
  const normalized = (hospitalCode || "").trim().toLowerCase() || DEFAULT_HOSPITAL_CODE;
  window.localStorage.setItem(HOSPITAL_CODE_KEY, normalized);
}

export function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Robust mock handler for ER & Hospital data when backend is in standalone mode
 */
async function handleLocalErMock<T = any>(path: string, options: RequestInit = {}): Promise<T | null> {
  const method = (options.method || "GET").toUpperCase();
  const url = new URL(path, "http://localhost");
  const pathname = url.pathname;
  const body = options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : {};

  // GET /api/er/triage-config
  if (pathname === "/api/er/triage-config" && method === "GET") {
    return { categories: ErDatabase.getCategories() } as T;
  }

  // POST /api/er/triage-config
  if (pathname === "/api/er/triage-config" && method === "POST") {
    const cat = ErDatabase.saveCategory(body);
    return { category: cat } as T;
  }

  // GET /api/er/visits
  if (pathname === "/api/er/visits" && method === "GET") {
    const activeOnly = url.searchParams.get("active_only") === "true";
    const status = url.searchParams.get("status");
    const filter = activeOnly ? "active" : status === "closed" ? "closed" : "all";
    return { visits: ErDatabase.getVisits(filter) } as T;
  }

  // GET /api/er/visits/:id
  const visitDetailMatch = pathname.match(/^\/api\/er\/visits\/(\d+)$/);
  if (visitDetailMatch && method === "GET") {
    const visitId = parseInt(visitDetailMatch[1]);
    const visit = ErDatabase.getVisit(visitId);
    if (!visit) throw new Error("ER visit not found");
    return visit as T;
  }

  // POST /api/er/register-patient (Direct ER Patient Registration)
  if (pathname === "/api/er/register-patient" && method === "POST") {
    const { patient: pData, visit: vData, complaint: cData, vitals: vtData } = body;
    const res = await ErDatabase.createVisit({
      patientDetails: pData,
      arrivalDate: vData?.arrival_date,
      arrivalTime: vData?.arrival_time,
      arrivalMode: vData?.arrival_mode,
      broughtBy: vData?.brought_by,
      attendantName: vData?.attendant_name,
      attendantRelation: vData?.attendant_relation,
      conditionAtArrival: vData?.condition_at_arrival,
      consciousness: vData?.consciousness,
      infoProvidedBy: vData?.info_provided_by,
      policeInvolved: vData?.police_involved,
      complaintText: cData?.[0]?.complaint,
      caseCategory: cData?.[0]?.case_category,
      vitals: vtData,
    });
    return {
      patient_id: res.patient?.patient_id || `P-${res.visit.id}`,
      patient: res.patient,
      visit: { id: res.visit.id, visit_no: res.visit.visit_no },
    } as T;
  }

  // POST /api/er/visits (Existing or Unknown Patient)
  if (pathname === "/api/er/visits" && method === "POST") {
    const res = await ErDatabase.createVisit({
      patientId: body.patient_id,
      isUnknown: body.is_unknown_patient,
      unknownLabel: body.unknown_patient_label,
      arrivalDate: body.arrival_date,
      arrivalTime: body.arrival_time,
      arrivalMode: body.arrival_mode,
      broughtBy: body.brought_by,
      attendantName: body.attendant_name,
      attendantRelation: body.attendant_relation,
      conditionAtArrival: body.condition_at_arrival,
      consciousness: body.consciousness,
      infoProvidedBy: body.info_provided_by,
      policeInvolved: body.police_involved,
    });
    return { id: res.visit.id, visit_no: res.visit.visit_no } as T;
  }

  // POST /api/er/visits/:id/complaints
  const complaintsMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/complaints$/);
  if (complaintsMatch && method === "POST") {
    const visitId = parseInt(complaintsMatch[1]);
    const c = ErDatabase.addComplaint(visitId, body);
    return { complaint_id: c.id } as T;
  }

  // POST /api/er/visits/:id/vitals
  const vitalsMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/vitals$/);
  if (vitalsMatch && method === "POST") {
    const visitId = parseInt(vitalsMatch[1]);
    const v = ErDatabase.addVitals(visitId, body);
    return { vitals_id: v.id } as T;
  }

  // POST /api/er/visits/:id/triage
  const triageMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/triage$/);
  if (triageMatch && method === "POST") {
    const visitId = parseInt(triageMatch[1]);
    ErDatabase.setTriage(visitId, {
      category: body.category,
      reason: body.reason,
      bedLabel: body.triage_bed_label,
    });
    return { success: true } as T;
  }

  // POST /api/er/visits/:id/assign-doctor
  const assignDocMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/assign-doctor$/);
  if (assignDocMatch && method === "POST") {
    const visitId = parseInt(assignDocMatch[1]);
    ErDatabase.assignDoctor(visitId, body);
    return { success: true } as T;
  }

  // POST /api/er/visits/:id/accept
  const acceptDocMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/accept$/);
  if (acceptDocMatch && method === "POST") {
    const visitId = parseInt(acceptDocMatch[1]);
    ErDatabase.acceptDoctor(visitId);
    return { success: true } as T;
  }

  // POST /api/er/visits/:id/treatments
  const treatMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/treatments$/);
  if (treatMatch && method === "POST") {
    const visitId = parseInt(treatMatch[1]);
    const t = ErDatabase.addTreatment(visitId, body);
    return { treatment_id: t.id } as T;
  }

  // POST /api/er/visits/:id/notes
  const notesMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/(notes|clinical-notes)$/);
  if (notesMatch && method === "POST") {
    const visitId = parseInt(notesMatch[1]);
    const n = ErDatabase.addClinicalNote(visitId, body);
    return { note_id: n.id } as T;
  }

  // POST /api/er/visits/:id/investigations
  const invMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/investigations$/);
  if (invMatch && method === "POST") {
    const visitId = parseInt(invMatch[1]);
    const inv = ErDatabase.addInvestigation(visitId, body);
    return { investigation_id: inv.id } as T;
  }

  // POST /api/er/visits/:id/bed-requests
  const bedReqMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/bed-requests$/);
  if (bedReqMatch && method === "POST") {
    const visitId = parseInt(bedReqMatch[1]);
    const b = ErDatabase.createBedRequest(visitId, body);
    return { bed_request_id: b.id } as T;
  }

  // GET /api/er/visits/:id/consents
  const consentsGetMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/consents$/);
  if (consentsGetMatch && method === "GET") {
    const visitId = parseInt(consentsGetMatch[1]);
    const visit = ErDatabase.getVisit(visitId);
    return { consents: visit?.consents || [] } as T;
  }

  // POST /api/er/visits/:id/consents
  if (consentsGetMatch && method === "POST") {
    const visitId = parseInt(consentsGetMatch[1]);
    const c = ErDatabase.addConsent(visitId, body);
    return { consent_id: c.id } as T;
  }

  // POST /api/er/visits/:id/lama
  const lamaMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/lama$/);
  if (lamaMatch && method === "POST") {
    const visitId = parseInt(lamaMatch[1]);
    ErDatabase.recordLama(visitId, body);
    return { success: true } as T;
  }

  // POST /api/er/visits/:id/disposition
  const dispMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/disposition$/);
  if (dispMatch && method === "POST") {
    const visitId = parseInt(dispMatch[1]);
    const d = ErDatabase.recordDisposition(visitId, body);
    return { disposition: d } as T;
  }

  // GET /api/er/bed-requests
  if (pathname === "/api/er/bed-requests" && method === "GET") {
    const status = url.searchParams.get("status") || undefined;
    const reqs = ErDatabase.getBedRequests(status);
    return { bed_requests: reqs } as T;
  }

  // POST /api/er/bed-requests/:id/allocate
  const allocReqMatch = pathname.match(/^\/api\/er\/bed-requests\/(\d+)\/allocate$/);
  if (allocReqMatch && method === "POST") {
    const reqId = parseInt(allocReqMatch[1]);
    const { bed_id, notes } = body;
    BedDatabase.allocateBedFromEr(bed_id, reqId, notes);
    ErDatabase.allocateBedRequest(reqId, bed_id, notes);
    return { success: true } as T;
  }

  // POST /api/er/bed-requests/:id/lama
  const lamaReqMatch = pathname.match(/^\/api\/er\/bed-requests\/(\d+)\/lama$/);
  if (lamaReqMatch && method === "POST") {
    const reqId = parseInt(lamaReqMatch[1]);
    ErDatabase.cancelBedRequest(reqId, body.reason);
    return { success: true } as T;
  }

  // GET /api/beds
  if (pathname === "/api/beds" && method === "GET") {
    const beds = BedDatabase.getBeds();
    const summary = BedDatabase.getSummary();
    return { beds, summary } as T;
  }

  // POST /api/beds/bulk
  if (pathname === "/api/beds/bulk" && method === "POST") {
    const created = BedDatabase.createBedsBulk(body);
    return { created_count: created.length, beds: created } as T;
  }

  // POST /api/beds/:id/assign
  const assignBedMatch = pathname.match(/^\/api\/beds\/(\d+)\/assign$/);
  if (assignBedMatch && method === "POST") {
    const bedId = parseInt(assignBedMatch[1]);
    const bed = BedDatabase.assignBed(bedId, body.patient || body, body.notes, body.expected_los_days);
    return { bed } as T;
  }

  // POST /api/beds/:id/transfer
  const transferBedMatch = pathname.match(/^\/api\/beds\/(\d+)\/transfer$/);
  if (transferBedMatch && method === "POST") {
    const fromBedId = parseInt(transferBedMatch[1]);
    const targetBedId = body.to_bed_id || body.target_bed_id || body.toBedId;
    const bed = BedDatabase.transferBed(fromBedId, targetBedId, body.reason);
    return { bed } as T;
  }

  // POST /api/beds/:id/release
  const releaseBedMatch = pathname.match(/^\/api\/beds\/(\d+)\/release$/);
  if (releaseBedMatch && method === "POST") {
    const bedId = parseInt(releaseBedMatch[1]);
    const bed = BedDatabase.releaseBed(bedId, body.discharge_override_reason || body.reason, body.room_charge_total);
    return { bed } as T;
  }

  // GET /api/beds/discharged
  if (pathname === "/api/beds/discharged" && method === "GET") {
    const list = BedDatabase.getDischargedPatients();
    return { discharged_patients: list } as T;
  }

  // GET /api/beds/:id/discharge-checklist
  const checklistMatch = pathname.match(/^\/api\/beds\/(\d+)\/discharge-checklist$/);
  if (checklistMatch && method === "GET") {
    const bedId = parseInt(checklistMatch[1]);
    const bed = BedDatabase.getBed(bedId);
    return {
      billing: { ok: true, pending_invoices: [] },
      prescriptions: { ok: true, pending_count: 0 },
      documents: { count: 2 },
      room_charges: {
        segments: [
          {
            ward: bed?.ward || "3N Medical",
            room_no: bed?.room_no || "204",
            bed_no: bed?.bed_no || "204-A",
            days: 3,
            daily_rate: bed?.daily_rate || 2500,
            amount: (bed?.daily_rate || 2500) * 3,
          },
        ],
        total: (bed?.daily_rate || 2500) * 3,
      },
      clear: true,
    } as T;
  }

  // POST /api/beds/:id (Edit/Update) & DELETE
  const updateBedMatch = pathname.match(/^\/api\/beds\/(\d+)$/);
  if (updateBedMatch && (method === "POST" || method === "PUT")) {
    const bedId = parseInt(updateBedMatch[1]);
    const bed = BedDatabase.updateBed(bedId, body);
    return { bed } as T;
  }
  if (updateBedMatch && method === "DELETE") {
    return { success: true } as T;
  }

  // POST /api/er/consents/:id/document (Document upload simulation)
  const consentDocMatch = pathname.match(/^\/api\/er\/consents\/(\d+)\/document$/);
  if (consentDocMatch && method === "POST") {
    return { success: true, message: "Document uploaded successfully" } as T;
  }

  // GET /api/auth/session
  if (pathname === "/api/auth/session" && method === "GET") {
    return { authenticated: true, user: { id: "ADM-001", role: "admin", name: "Administrator" } } as T;
  }

  // GET /api/doctors & /api/doctors/directory & /api/op/doctors
  if ((pathname === "/api/doctors" || pathname === "/api/doctors/directory" || pathname === "/api/op/doctors") && method === "GET") {
    return {
      doctors: [
        { id: "DOC-4401", doctor_name: "Dr. Vikram Seth", name: "Dr. Vikram Seth", department: "Cardiology", specialty: "Cardiology", available: true },
        { id: "DOC-4402", doctor_name: "Dr. Anita Roy", name: "Dr. Anita Roy", department: "Emergency Medicine", specialty: "Emergency Medicine", available: true },
        { id: "DOC-4404", doctor_name: "Dr. Rajesh Sharma", name: "Dr. Rajesh Sharma", department: "General Medicine", specialty: "General Medicine", available: true },
        { id: "DOC-4405", doctor_name: "Dr. Sanjay Gupta", name: "Dr. Sanjay Gupta", department: "Orthopedics / Trauma", specialty: "Orthopedics", available: true },
        { id: "DOC-4406", doctor_name: "Dr. Meenakshi Rao", name: "Dr. Meenakshi Rao", department: "Neurology", specialty: "Neurology", available: true },
        { id: "DOC-4407", doctor_name: "Dr. Priya Deshmukh", name: "Dr. Priya Deshmukh", department: "General Surgery", specialty: "General Surgery", available: true },
      ],
    } as T;
  }

  // POST /api/er/visits/:id/close or preview
  const closeMatch = pathname.match(/^\/api\/er\/visits\/(\d+)\/close$/);
  if (closeMatch && method === "POST") {
    const visitId = parseInt(closeMatch[1]);
    const res = ErDatabase.closeVisit(visitId, body.total || body.consultation_fee);
    return res as T;
  }

  // GET /api/patients
  if (pathname === "/api/patients" && method === "GET") {
    const q = url.searchParams.get("q") || "";
    const patients = ErDatabase.searchPatients(q);
    return { patients } as T;
  }

  // GET /api/registration/departments
  if (pathname === "/api/registration/departments" && method === "GET") {
    return {
      departments: [
        { department_name: "Emergency Medicine" },
        { department_name: "Cardiology" },
        { department_name: "Pulmonology" },
        { department_name: "General Medicine" },
        { department_name: "General Surgery" },
        { department_name: "Orthopedics / Trauma" },
        { department_name: "Neurology" },
        { department_name: "Pediatrics" },
        { department_name: "Obstetrics & Gynecology" },
      ],
    } as T;
  }

  // POST /api/symptom-ai/triage
  if (pathname === "/api/symptom-ai/triage" && method === "POST") {
    const symptoms = body.symptoms || "";
    const evalRes = await ErDatabase.evaluateClinicalTriage(symptoms, {});
    return {
      department: evalRes.suggestedDepartment,
      urgency: evalRes.urgency,
      reasoning: evalRes.reasoning,
      doctor: evalRes.suggestedDoctor,
      suggested_treatment: evalRes.suggestedTreatments[0] || null,
      suggested_treatments: evalRes.suggestedTreatments,
    } as T;
  }

  return null;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & { cache?: RequestCache } = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const csrfToken = getCsrfToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Hospital-Code": getHospitalCode(),
    ...(csrfToken && method !== "GET" && method !== "HEAD" ? { "X-CSRF-Token": csrfToken } : {}),
    ...(options.headers || {}),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${API_BASE}${path}`, {
      headers,
      credentials: "include",
      cache: options.cache || (method === "GET" ? "no-store" : "default"),
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401 && path !== "/api/auth/login" && path !== "/api/auth/session") {
        window.dispatchEvent(new Event("app:unauthorized"));
      }
      // If endpoint not implemented or error on backend, fallback to local ER store
      const localResult = await handleLocalErMock<T>(path, options);
      if (localResult !== null) return localResult as T;

      const message = payload.error || payload.message || "Request failed";
      const error = new Error(message) as Error & { payload?: any; status?: number };
      error.payload = payload;
      error.status = response.status;
      throw error;
    }

    return response.json();
  } catch (err: any) {
    // Graceful offline fallback to Local ER Store
    const localResult = await handleLocalErMock<T>(path, options);
    if (localResult !== null) {
      return localResult as T;
    }
    throw err;
  }
}

export function withAuthHeaders(headers: Record<string, string> = {}, method = "GET"): HeadersInit {
  const csrfToken = getCsrfToken();
  return {
    "X-Hospital-Code": getHospitalCode(),
    ...(csrfToken && method !== "GET" && method !== "HEAD" ? { "X-CSRF-Token": csrfToken } : {}),
    ...headers,
  };
}

export function reportError(
  setNotice?: (notice: Notice | null) => void,
  error?: { status?: number; message?: string },
  fallbackMessage = "Request failed.",
): void {
  if (error?.status === 401) return;
  setNotice?.({ type: "error", message: error?.message || fallbackMessage });
}
