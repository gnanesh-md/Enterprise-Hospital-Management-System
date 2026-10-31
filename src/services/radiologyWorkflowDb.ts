/**
 * Radiology Department Workflow Service & High-Performance State Management
 *
 * Implements the complete Radiology workflow with aggressive in-memory caching
 * and batch index lookups for instant (sub-millisecond) UI responsiveness:
 * 1. Doctor Orders Investigation (prescribes radiology test for patient, with duplicate check)
 * 2. Nurse Verification (verifies investigation, forwards to Billing and Radiology simultaneously)
 * 3. Payment Status Visibility (reads PAID or PENDING from existing Billing system via fast lookups)
 * 4. Investigation Process (staff view details, perform test, transition ORDERED -> IN PROGRESS)
 * 5. Mark as Done (staff mark investigation as DONE -> moves to Reports page)
 * 6. Reports Department Workflow (completed investigations awaiting reports, technician enters
 *    actual findings and impression - no auto-generated findings, saves draft/finalizes)
 * 7. PDF Report Generation, Preview, Print, and Download
 */

import { BillingDatabase, RadiologyStudyRecord } from "./billingDb"
import { db } from "./db"
import { AuditDatabase } from "./auditDb"
import { LabOrderDatabase } from "./labOrdersDb"

export interface RadiologyActionLog {
  timestamp: string
  action: string
  actor: string
  role?: string
  details: string
  status?: string
}

export type RadiologyInvestigationStatus = "ORDERED" | "IN PROGRESS" | "DONE"
export type RadiologyPaymentStatus = "PAID" | "PENDING"
export type RadiologyReportStatus = "Awaiting Report" | "Draft" | "Finalized"

export interface ExtendedRadiologyRecord extends RadiologyStudyRecord {
  opNumber?: string
  ipNumber?: string
  orderDate?: string
  nurseVerified?: boolean
  nurseVerifiedBy?: string
  nurseVerifiedAt?: string
  completedAt?: string
  completedBy?: string
  completionNotes?: string
  finalizedBy?: string
  finalizedRole?: string
  finalizedAt?: string
  technicianStaffId?: string
  history?: RadiologyActionLog[]
  // Pre-computed properties for sub-millisecond table filtering & rendering:
  normalizedStatus: RadiologyInvestigationStatus
  normalizedReportStatus: RadiologyReportStatus
  isPaid: boolean
  paymentStatusDisplay: RadiologyPaymentStatus
}

const RAD_CHANNEL_NAME = "hospai_rad_channel"

// In-memory cache variables for instant access
let cachedStudies: ExtendedRadiologyRecord[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 2000 // Invalidate after 2 seconds or on write/event

export class RadiologyWorkflowDb {
  /**
   * Clears the in-memory cache to force a fresh compute
   */
  static invalidateCache(): void {
    cachedStudies = null
    cacheTimestamp = 0
  }

  /**
   * Normalizes study status to the workflow values: ORDERED | IN PROGRESS | DONE
   */
  static normalizeInvestigationStatus(
    status?: string,
  ): RadiologyInvestigationStatus {
    if (!status) return "ORDERED"
    const s = status.trim().toUpperCase()
    if (s === "IN PROGRESS" || s === "IN_PROGRESS" || s === "SCANNING") {
      return "IN PROGRESS"
    }
    if (
      s === "DONE" ||
      s === "COMPLETED" ||
      s === "FINAL" ||
      s === "IMAGES READY" ||
      s === "REPORTING"
    ) {
      return "DONE"
    }
    return "ORDERED"
  }

  /**
   * Normalizes report status: Awaiting Report | Draft | Finalized
   */
  static normalizeReportStatus(
    study: Partial<RadiologyStudyRecord>,
  ): RadiologyReportStatus {
    if (study.reportStatus === "Final" || (study as any).reportStatus === "Finalized") {
      return "Finalized"
    }
    if (study.reportStatus === "Draft") {
      return "Draft"
    }
    const invStatus = this.normalizeInvestigationStatus(study.status)
    if (invStatus === "DONE") {
      return "Awaiting Report"
    }
    return "Awaiting Report"
  }

  /**
   * Fast O(1) payment status resolver.
   */
  static getPaymentStatusFromBilling(
    study: Partial<ExtendedRadiologyRecord>,
  ): { status: RadiologyPaymentStatus; receiptNo?: string; invoiceNo?: string } {
    if (study.paymentStatusDisplay) {
      return {
        status: study.paymentStatusDisplay,
        receiptNo: study.paidReceiptNo,
        invoiceNo: study.invoiceNo,
      }
    }
    const isPaid = study.isPaid ?? (study.paymentStatus === "Paid" || (study.paymentStatus as string) === "PAID")
    return {
      status: isPaid ? "PAID" : "PENDING",
      receiptNo: study.paidReceiptNo,
      invoiceNo: study.invoiceNo,
    }
  }

  /**
   * Loads all radiology studies with live billing payment status synchronization.
   * Utilizes batch loading and in-memory caching to eliminate redundant JSON parses.
   */
  static getStudies(): ExtendedRadiologyRecord[] {
    const now = Date.now()
    if (cachedStudies && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedStudies
    }

    try {
      // 1. Single batch fetch of raw studies and billing data
      const raw = BillingDatabase.getRadiologyStudies()
      const claims = BillingDatabase.getClaims()
      const labOrders = LabOrderDatabase.getOrders()

      // 2. Pre-build high-speed indexed lookup sets
      const paidInvoices = new Map<string, string>() // invoiceNo (lowercase) -> receiptNo
      const paidEncounters = new Map<string, string>() // encounterId (lowercase) -> receiptNo
      const paidMrns = new Map<string, string>() // mrn/umr (lowercase) -> receiptNo
      const paidStudyIds = new Set<string>()

      for (let i = 0; i < claims.length; i++) {
        const c = claims[i]
        const isClaimPaid =
          c.status === "Paid" ||
          c.balanceDue <= 0 ||
          (c.amountPaid > 0 && c.balanceDue <= 0)

        if (isClaimPaid) {
          const rcpt =
            c.payments?.[0]?.receiptNo ||
            `RCPT-2026-${(c.invoiceNo || "").replace(/\D/g, "").slice(-4) || "5501"}`

          if (c.invoiceNo) paidInvoices.set(c.invoiceNo.toLowerCase().trim(), rcpt)
          if (c.encounterId) paidEncounters.set(c.encounterId.toLowerCase().trim(), rcpt)
          if (c.patientId) paidMrns.set(c.patientId.toLowerCase().trim(), rcpt)
          if (c.mrn) paidMrns.set(c.mrn.toLowerCase().trim(), rcpt)
          if (c.id) paidStudyIds.add(c.id.toLowerCase().replace("clm-", ""))
        }
      }

      for (let i = 0; i < labOrders.length; i++) {
        const lo = labOrders[i]
        if (lo.billing?.status === "Paid") {
          const rcpt = lo.billing.receiptNo || "RCPT-2026-LAB"
          if (lo.encounterId) paidEncounters.set(lo.encounterId.toLowerCase().trim(), rcpt)
          if (lo.umr) paidMrns.set(lo.umr.toLowerCase().trim(), rcpt)
        }
      }

      // 3. Transform and pre-calculate all study properties in a single pass
      const result: ExtendedRadiologyRecord[] = new Array(raw.length)

      for (let i = 0; i < raw.length; i++) {
        const study = raw[i]
        const ext = study as ExtendedRadiologyRecord

        // Check if study is paid
        const sInv = (study.invoiceNo || "").toLowerCase().trim()
        const sEnc = (study.encounterId || "").toLowerCase().trim()
        const sUmr = (study.umr || study.mrn || "").toLowerCase().trim()
        const sId = (study.id || "").toLowerCase().trim()

        let isPaid =
          study.paymentStatus === "Paid" ||
          (study.paymentStatus as string) === "PAID" ||
          paidStudyIds.has(sId) ||
          (sInv ? paidInvoices.has(sInv) : false) ||
          (sEnc ? paidEncounters.has(sEnc) : false) ||
          (sUmr ? paidMrns.has(sUmr) : false)

        const receiptNo =
          study.paidReceiptNo ||
          (sInv && paidInvoices.get(sInv)) ||
          (sEnc && paidEncounters.get(sEnc)) ||
          (sUmr && paidMrns.get(sUmr)) ||
          (isPaid ? "RCPT-2026-5501" : undefined)

        const normStatus = this.normalizeInvestigationStatus(study.status)
        const normRepStatus = this.normalizeReportStatus(study)

        // Resolve OP/IP
        let opNumber = ext.opNumber
        let ipNumber = ext.ipNumber
        if (!opNumber && !ipNumber) {
          opNumber = `OP-${study.mrn || (study.umr || "").replace(/\D/g, "") || "1002"}`
        }

        result[i] = {
          ...ext,
          opNumber,
          ipNumber,
          orderDate: ext.orderDate || ext.ordered || new Date().toISOString().split("T")[0],
          paymentStatus: isPaid ? "Paid" : "Payment Pending",
          paidReceiptNo: receiptNo,
          normalizedStatus: normStatus,
          normalizedReportStatus: normRepStatus,
          isPaid,
          paymentStatusDisplay: isPaid ? "PAID" : "PENDING",
          history: ext.history || [
            {
              timestamp: new Date().toISOString(),
              action: "Order Registered",
              actor: ext.provider || "Attending Doctor",
              role: "Doctor",
              details: `Radiology investigation ${ext.study} (${ext.modality}) recorded in system.`,
            },
          ],
        }
      }

      cachedStudies = result
      cacheTimestamp = now
      return result
    } catch {
      return (BillingDatabase.getRadiologyStudies() as any[]) || []
    }
  }

  /**
   * Fast duplicate investigation check
   */
  static checkDuplicateInvestigation(
    patientUmrOrMrn: string,
    studyName: string,
    currentStudyId?: string,
  ): { isDuplicate: boolean; existingStudy?: ExtendedRadiologyRecord; message?: string } {
    const studies = this.getStudies()
    const targetKey = (patientUmrOrMrn || "").toLowerCase().trim()
    const targetStudy = (studyName || "").toLowerCase().replace(/\s*\([^\)]*\)/g, "").trim()

    for (let i = 0; i < studies.length; i++) {
      const s = studies[i]
      if (currentStudyId && s.id === currentStudyId) continue
      const sKey = (s.umr || s.mrn || s.patient || "").toLowerCase().trim()
      const sStudy = (s.study || "").toLowerCase().replace(/\s*\([^\)]*\)/g, "").trim()

      const matchesPatient =
        sKey === targetKey ||
        (targetKey.length > 3 && (sKey.includes(targetKey) || targetKey.includes(sKey)))
      const matchesStudy = sStudy === targetStudy

      if (matchesPatient && matchesStudy && s.normalizedStatus !== "DONE") {
        return {
          isDuplicate: true,
          existingStudy: s,
          message: `Patient already has an active order for "${s.study}" (Status: ${s.normalizedStatus}, ID: ${s.id}). Duplicate entries are not allowed.`,
        }
      }
    }

    return { isDuplicate: false }
  }

  /**
   * Doctor Orders Investigation
   */
  static doctorOrdersInvestigation(data: {
    patientName: string
    umr: string
    mrn: string
    opNumber?: string
    ipNumber?: string
    encounterId?: string
    studyName: string
    modality: "XR" | "CT" | "MR" | "US" | "NM"
    priority: "STAT" | "Routine" | "Elective"
    doctorName: string
    department?: string
    indication: string
    price: number
    room: string
    technique?: string
    autoVerifyNurse?: boolean
    nurseName?: string
  }): ExtendedRadiologyRecord {
    const dup = this.checkDuplicateInvestigation(data.umr || data.mrn, data.studyName)
    if (dup.isDuplicate) {
      throw new Error(dup.message || "Duplicate investigation entry detected.")
    }

    const nowIso = new Date().toISOString()
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const nowDate = nowIso.split("T")[0]
    const id = `RAD-${Math.floor(200 + Math.random() * 800)}`
    const invoiceNo = `INV-RAD-${Math.floor(1000 + Math.random() * 9000)}`
    const accessionNo = `RAD-ACC-${Math.floor(1000 + Math.random() * 9000)}`

    const history: RadiologyActionLog[] = [
      {
        timestamp: nowIso,
        action: "Doctor Prescribed Investigation",
        actor: data.doctorName,
        role: "Doctor",
        details: `Prescribed ${data.studyName} (${data.modality}). Priority: ${data.priority}. Indication: ${data.indication}.`,
        status: "ORDERED",
      },
    ]

    const isNurseVerified = Boolean(data.autoVerifyNurse)
    if (isNurseVerified) {
      history.push({
        timestamp: nowIso,
        action: "Nurse Verification & Distribution",
        actor: data.nurseName || "OP/IP Nurse Desk",
        role: "Nurse",
        details: `Investigation verified and forwarded simultaneously to Central Billing and Radiology Department.`,
        status: "ORDERED",
      })
    }

    const newRecord: ExtendedRadiologyRecord = {
      id,
      invoiceNo,
      accessionNo,
      patient: data.patientName,
      mrn: data.mrn,
      umr: data.umr,
      opNumber: data.opNumber || `OP-${data.mrn}`,
      ipNumber: data.ipNumber,
      encounterId: data.encounterId,
      department: data.department || "Radiology & Imaging",
      study: data.studyName,
      modality: data.modality,
      priority: data.priority,
      ordered: nowTime,
      orderDate: nowDate,
      provider: data.doctorName,
      status: "Orders",
      room: data.room,
      price: data.price,
      paymentStatus: "Payment Pending",
      indication: data.indication,
      technique: data.technique || `Diagnostic ${data.modality} imaging protocol`,
      nurseVerified: isNurseVerified,
      nurseVerifiedBy: isNurseVerified ? data.nurseName || "OP/IP Nurse" : undefined,
      nurseVerifiedAt: isNurseVerified ? nowIso : undefined,
      reportStatus: "Draft",
      history,
      normalizedStatus: "ORDERED",
      normalizedReportStatus: "Awaiting Report",
      isPaid: false,
      paymentStatusDisplay: "PENDING",
    }

    BillingDatabase.createRadiologyStudy(newRecord)
    if (isNurseVerified) {
      BillingDatabase.ensureRadiologyClaim(newRecord)
    }

    AuditDatabase.logEvent(
      "Radiology Order Created",
      "Radiology",
      `Doctor ${data.doctorName} ordered ${data.studyName} for ${data.patientName} (${data.umr}).`,
      "Success",
    )

    this.invalidateCache()
    this.notifyUpdate()
    return newRecord
  }

  /**
   * Nurse Verification
   */
  static verifyInvestigationByNurse(
    studyId: string,
    nurseName: string = "Staff Nurse",
  ): ExtendedRadiologyRecord {
    const studies = this.getStudies()
    const study = studies.find((s) => s.id === studyId)
    if (!study) throw new Error("Radiology investigation not found")

    const nowIso = new Date().toISOString()
    const updatedHistory: RadiologyActionLog[] = [
      ...(study.history || []),
      {
        timestamp: nowIso,
        action: "Nurse Verified & Distributed",
        actor: nurseName,
        role: "Nurse",
        details: `Verified investigation order. Forwarded to Central Billing (Claim generated) and Radiology Dashboard (Status: ORDERED).`,
        status: "ORDERED",
      },
    ]

    const updated = BillingDatabase.updateRadiologyStudy(studyId, {
      nurseVerified: true,
      nurseVerifiedBy: nurseName,
      nurseVerifiedAt: nowIso,
      status: "Orders",
      history: updatedHistory,
    })

    BillingDatabase.ensureRadiologyClaim(updated)

    AuditDatabase.logEvent(
      "Nurse Verified Investigation",
      "Radiology",
      `Nurse ${nurseName} verified ${study.study} for ${study.patient} (${study.umr}). Shared with Billing and Radiology.`,
      "Success",
    )

    this.invalidateCache()
    this.notifyUpdate()
    return updated as ExtendedRadiologyRecord
  }

  /**
   * Investigation Process: START (ORDERED -> IN PROGRESS)
   */
  static startInvestigation(
    studyId: string,
    staffName: string = "Radiology Technician",
    room?: string,
  ): ExtendedRadiologyRecord {
    const studies = this.getStudies()
    const study = studies.find((s) => s.id === studyId)
    if (!study) throw new Error("Radiology investigation not found")

    const nowIso = new Date().toISOString()
    const updatedHistory: RadiologyActionLog[] = [
      ...(study.history || []),
      {
        timestamp: nowIso,
        action: "Investigation Scan Started",
        actor: staffName,
        role: "Radiology Staff",
        details: `Imaging examination started in Suite ${room || study.room}.`,
        status: "IN PROGRESS",
      },
    ]

    const updated = BillingDatabase.updateRadiologyStudy(studyId, {
      status: "In Progress",
      room: room || study.room,
      technician: staffName,
      history: updatedHistory,
    })

    AuditDatabase.logEvent(
      "Radiology Test In Progress",
      "Radiology",
      `${staffName} started ${study.study} for ${study.patient} in ${room || study.room}.`,
      "Success",
    )

    this.invalidateCache()
    this.notifyUpdate()
    return updated as ExtendedRadiologyRecord
  }

  /**
   * Mark as DONE
   */
  static markInvestigationDone(
    studyId: string,
    staffName: string = "Radiology Technician",
    completionNotes?: string,
  ): ExtendedRadiologyRecord {
    const studies = this.getStudies()
    const study = studies.find((s) => s.id === studyId)
    if (!study) throw new Error("Radiology investigation not found")

    const nowIso = new Date().toISOString()
    const updatedHistory: RadiologyActionLog[] = [
      ...(study.history || []),
      {
        timestamp: nowIso,
        action: "Investigation Marked as DONE",
        actor: staffName,
        role: "Radiology Staff",
        details: `Scan acquisition completed. Status marked DONE. Transferred to Reports Department for clinical reporting. Notes: ${completionNotes || "Standard protocol completed."}`,
        status: "DONE",
      },
    ]

    const updated = BillingDatabase.updateRadiologyStudy(studyId, {
      status: "Images Ready", // maps to DONE
      completedAt: nowIso,
      completedBy: staffName,
      completionNotes: completionNotes || "Scan completed per standard clinical protocol.",
      technician: staffName,
      reportStatus: "Draft",
      history: updatedHistory,
    })

    AuditDatabase.logEvent(
      "Investigation Marked Done",
      "Radiology",
      `${staffName} marked ${study.study} for ${study.patient} as DONE. Transferred to Reports Page.`,
      "Success",
    )

    this.invalidateCache()
    this.notifyUpdate()
    return updated as ExtendedRadiologyRecord
  }

  /**
   * Save Report (Draft or Final)
   */
  static saveReport(data: {
    studyId: string
    isFinal: boolean
    specialistName: string
    specialistRole: string
    staffId?: string
    findings: string[]
    impression: string[]
    indication?: string
    technique?: string
    comparison?: string
  }): ExtendedRadiologyRecord {
    const studies = this.getStudies()
    const study = studies.find((s) => s.id === data.studyId)
    if (!study) throw new Error("Radiology investigation not found")

    const authorizedRoles = ["Radiologist", "Radiology Technician", "Specialist", "Consultant", "Admin", "Doctor"]
    const isAuthorized = authorizedRoles.some((r) =>
      data.specialistRole.toLowerCase().includes(r.toLowerCase()),
    )
    if (!isAuthorized) {
      throw new Error(`Unauthorized: User role "${data.specialistRole}" is not authorized to finalize radiology reports.`)
    }

    const nowIso = new Date().toISOString()
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    const updatedHistory: RadiologyActionLog[] = [
      ...(study.history || []),
      {
        timestamp: nowIso,
        action: data.isFinal ? "Final Report Finalized & Signed" : "Draft Report Saved",
        actor: data.specialistName,
        role: data.specialistRole,
        details: data.isFinal
          ? `Official radiology report finalized, clinically verified, and signed by ${data.specialistName} (${data.specialistRole}).`
          : `Draft report progress saved by ${data.specialistName}.`,
        status: "DONE",
      },
    ]

    const updated = BillingDatabase.updateRadiologyStudy(data.studyId, {
      indication: data.indication,
      technique: data.technique,
      findings: data.findings,
      impression: data.impression,
      comparison: data.comparison,
      radiologist: data.specialistName,
      reportStatus: data.isFinal ? "Final" : "Draft",
      finalizedAt: data.isFinal ? nowIso : undefined,
      finalizedBy: data.isFinal ? data.specialistName : undefined,
      finalizedRole: data.isFinal ? data.specialistRole : undefined,
      signedAt: data.isFinal ? `${new Date().toLocaleDateString("en-IN")} ${nowTime}` : study.signedAt,
      status: data.isFinal ? "Final" : "Images Ready",
      history: updatedHistory,
    })

    AuditDatabase.logEvent(
      data.isFinal ? "Radiology Report Finalized" : "Radiology Report Draft Saved",
      "Radiology",
      `Report for ${study.patient} (${study.study}) ${data.isFinal ? "finalized" : "saved as draft"} by ${data.specialistName}.`,
      "Success",
    )

    this.invalidateCache()
    this.notifyUpdate()
    return updated as ExtendedRadiologyRecord
  }

  /**
   * Log Report Print or Download
   */
  static logPrintOrDownload(
    studyId: string,
    actionType: "PRINT" | "DOWNLOAD",
    userName: string = "Staff",
  ): void {
    try {
      const studies = this.getStudies()
      const study = studies.find((s) => s.id === studyId)
      if (!study) return

      const nowIso = new Date().toISOString()
      const updatedHistory: RadiologyActionLog[] = [
        ...(study.history || []),
        {
          timestamp: nowIso,
          action: actionType === "PRINT" ? "Report Printed" : "Report PDF Downloaded",
          actor: userName,
          role: "Technician / Staff",
          details: `Official radiology report ${actionType === "PRINT" ? "sent to printer" : "downloaded as formatted PDF"}.`,
        },
      ]

      BillingDatabase.updateRadiologyStudy(studyId, { history: updatedHistory })
      this.invalidateCache()
      this.notifyUpdate()
    } catch {}
  }

  /**
   * Broadcast updates
   */
  static notifyUpdate(): void {
    this.invalidateCache()
    try {
      new BroadcastChannel(RAD_CHANNEL_NAME).postMessage("updated")
    } catch {}
  }

  /**
   * Subscribes to changes with auto-cache invalidation
   */
  static subscribe(callback: () => void): () => void {
    const onSignal = () => {
      RadiologyWorkflowDb.invalidateCache()
      callback()
    }

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(RAD_CHANNEL_NAME)
      channel.onmessage = onSignal
    } catch {}
    const unsubBilling = BillingDatabase.onUpdate(onSignal)

    return () => {
      unsubBilling()
      try {
        channel?.close()
      } catch {}
    }
  }
}
