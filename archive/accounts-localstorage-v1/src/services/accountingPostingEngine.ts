import { AccountsDatabase } from "./accountsDb"
import { BillingDatabase } from "./billingDb"
import { PharmacyDatabase } from "./pharmacyDb"
import { InsuranceEngineService } from "./insuranceDb"

export interface OperationalPostingEvent {
  eventId: string
  sourceModule: "billing" | "pharmacy" | "insurance" | "laboratory" | "hrms"
  transactionType: string
  sourceReferenceId: string
  amount: number
  patientId?: string
  patientName?: string
  supplierName?: string
  department?: string
  description: string
  taxAmount?: number
  paymentMethod?: string
}

const PROCESSED_EVENTS_KEY = "hospai_accounts_processed_events_v1"

function getProcessedEventIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = window.localStorage.getItem(PROCESSED_EVENTS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function markEventProcessed(eventId: string) {
  if (typeof window === "undefined") return
  const set = getProcessedEventIds()
  set.add(eventId)
  window.localStorage.setItem(PROCESSED_EVENTS_KEY, JSON.stringify(Array.from(set)))
}

export class AccountingPostingEngine {
  /**
   * Idempotently process operational event into balanced double-entry accounting journals
   */
  static processEvent(event: OperationalPostingEvent): boolean {
    const processedSet = getProcessedEventIds()
    if (processedSet.has(event.eventId)) {
      console.log(`[AccountingPostingEngine] Duplicate event ${event.eventId} skipped (idempotent).`)
      return true
    }

    try {
      switch (event.transactionType) {
        case "OPD_INVOICE":
        case "IPD_INVOICE": {
          // Debit: Patient AR (1310), Credit: Revenue (4110 / 4120)
          const revAccount = event.transactionType === "OPD_INVOICE" ? "4110" : "4120"
          AccountsDatabase.postJournal({
            transaction_type: event.transactionType,
            source_module: event.sourceModule,
            source_reference_id: event.sourceReferenceId,
            description: event.description,
            lines: [
              { account_code: "1310", debit: event.amount, credit: 0, narration: `Receivable for Invoice ${event.sourceReferenceId}`, department: event.department, sub_ledger_id: event.patientId, sub_ledger_name: event.patientName },
              { account_code: revAccount, debit: 0, credit: event.amount, narration: `Revenue from Invoice ${event.sourceReferenceId}`, department: event.department },
            ],
          })

          // Also upsert AR Sub-ledger
          AccountsDatabase.upsertReceivable({
            invoice_no: event.sourceReferenceId,
            patient_id: event.patientId || "P-DEFAULT",
            patient_name: event.patientName || "Patient",
            total_amount: event.amount,
            department: event.department || "OPD",
          })
          break
        }

        case "PATIENT_PAYMENT": {
          // Debit: Cash (1120/1130) or Bank (1210), Credit: Patient AR (1310)
          const cashAcc = event.paymentMethod === "Cash" ? (event.department === "IPD" ? "1130" : "1120") : "1210"
          AccountsDatabase.postJournal({
            transaction_type: "PATIENT_PAYMENT",
            source_module: event.sourceModule,
            source_reference_id: event.sourceReferenceId,
            description: event.description,
            lines: [
              { account_code: cashAcc, debit: event.amount, credit: 0, narration: `Collection via ${event.paymentMethod || "Cash"} for ${event.sourceReferenceId}` },
              { account_code: "1310", debit: 0, credit: event.amount, narration: `AR Payment against ${event.sourceReferenceId}`, sub_ledger_id: event.patientId, sub_ledger_name: event.patientName },
            ],
          })

          // Update AR Sub-ledger
          const arList = AccountsDatabase.getReceivables()
          const item = arList.find(r => r.invoice_no === event.sourceReferenceId)
          if (item) {
            AccountsDatabase.upsertReceivable({
              ...item,
              paid_amount: item.paid_amount + event.amount,
            })
          }
          break
        }

        case "PHARMACY_SALE": {
          // Debit: Patient AR / Cash (1310/1120), Credit: Pharmacy Revenue (4310)
          AccountsDatabase.postJournal({
            transaction_type: "PHARMACY_SALE",
            source_module: "pharmacy",
            source_reference_id: event.sourceReferenceId,
            description: event.description,
            lines: [
              { account_code: "1310", debit: event.amount, credit: 0, narration: `Pharmacy Sale Rx ${event.sourceReferenceId}`, department: "Pharmacy" },
              { account_code: "4310", debit: 0, credit: event.amount, narration: `Pharmacy Medicine Sales Revenue`, department: "Pharmacy" },
            ],
          })
          break
        }

        case "PHARMACY_GRN": {
          // Debit: Stock (1410), Credit: AP (2110)
          AccountsDatabase.postJournal({
            transaction_type: "PHARMACY_GRN",
            source_module: "pharmacy",
            source_reference_id: event.sourceReferenceId,
            description: event.description,
            lines: [
              { account_code: "1410", debit: event.amount, credit: 0, narration: `Inventory Capitalization GRN ${event.sourceReferenceId}`, department: "Pharmacy" },
              { account_code: "2110", debit: 0, credit: event.amount, narration: `Supplier Payable to ${event.supplierName || "Vendor"}`, department: "Pharmacy", sub_ledger_name: event.supplierName },
            ],
          })

          // Upsert AP Sub-ledger
          AccountsDatabase.upsertPayable({
            supplier_invoice_no: event.sourceReferenceId,
            supplier_name: event.supplierName || "Pharmacy Vendor",
            total_amount: event.amount,
            department: "Pharmacy",
          })
          break
        }

        case "INSURANCE_SETTLED": {
          // Debit: Bank (1210), Credit: Insurance Receivables (1330)
          AccountsDatabase.postJournal({
            transaction_type: "INSURANCE_SETTLED",
            source_module: "insurance",
            source_reference_id: event.sourceReferenceId,
            description: event.description,
            lines: [
              { account_code: "1210", debit: event.amount, credit: 0, narration: `Bank Receipt for Claim Settlement ${event.sourceReferenceId}` },
              { account_code: "1330", debit: 0, credit: event.amount, narration: `Insurance Settlement for ${event.patientName || "Claim"}` },
            ],
          })
          break
        }

        default:
          console.warn(`[AccountingPostingEngine] Unhandled transaction type ${event.transactionType}`)
          return false
      }

      markEventProcessed(event.eventId)
      return true
    } catch (err: any) {
      console.error(`[AccountingPostingEngine] Error processing event ${event.eventId}:`, err)
      return false
    }
  }

  /**
   * Sync operational records from billingDb, pharmacyDb, and insuranceDb into Accounts
   */
  static syncAllOperationalEvents(): { processedCount: number } {
    let count = 0

    // 1. Sync Invoices from BillingDatabase
    try {
      const claims = BillingDatabase.getClaims()
      for (const c of claims) {
        const eventId = `EVT-BILL-${c.id || c.invoiceNo}`
        const ok = this.processEvent({
          eventId,
          sourceModule: "billing",
          transactionType: c.department === "Emergency" ? "IPD_INVOICE" : "OPD_INVOICE",
          sourceReferenceId: c.invoiceNo,
          amount: c.totalAmount || 1000,
          patientId: c.mrn,
          patientName: c.patientName,
          department: c.department || "OPD",
          description: `Billing Invoice ${c.invoiceNo} for ${c.patientName}`,
        })
        if (ok) count++
      }
    } catch (e) {
      console.error("Failed to sync billing claims", e)
    }

    // 2. Sync Payments from BillingDatabase
    try {
      const claims = BillingDatabase.getClaims()
      for (const c of claims) {
        if (c.payments && c.payments.length > 0) {
          for (const p of c.payments) {
            const eventId = `EVT-PAY-${c.invoiceNo}-${p.id || p.paymentDate}`
            const ok = this.processEvent({
              eventId,
              sourceModule: "billing",
              transactionType: "PATIENT_PAYMENT",
              sourceReferenceId: c.invoiceNo,
              amount: p.amount,
              patientId: c.mrn,
              patientName: c.patientName,
              paymentMethod: p.paymentMethod,
              department: c.department || "OPD",
              description: `Payment Receipt for Invoice ${c.invoiceNo}`,
            })
            if (ok) count++
          }
        }
      }
    } catch (e) {
      console.error("Failed to sync billing payments", e)
    }

    return { processedCount: count }
  }
}
