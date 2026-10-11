import {
  ChartOfAccount,
  JournalEntry,
  JournalLine,
  FiscalPeriod,
  ReceivableItem,
  PayableItem,
  ReceiptVoucher,
  PaymentVoucher,
  CashierHandover,
  CostCentreBudget,
  FixedAsset,
  FinancialTrialBalanceRow,
} from "../types/accounts"

export interface AccountingPostingRule {
  id: string
  transaction_type: string
  source_module: string
  debit_account_code: string
  credit_account_code: string
  description: string
  is_active: boolean
}

const STORAGE_KEYS = {
  COA: "hospai_accounts_coa_v1",
  JOURNALS: "hospai_accounts_journals_v1",
  FISCAL_PERIODS: "hospai_accounts_fiscal_periods_v1",
  RECEIVABLES: "hospai_accounts_receivables_v1",
  PAYABLES: "hospai_accounts_payables_v1",
  PAYMENT_ALLOCATIONS: "hospai_accounts_allocations_v1",
  CASHIER_HANDOVERS: "hospai_accounts_handovers_v1",
  BANK_ACCOUNTS: "hospai_accounts_bank_accounts_v1",
  BANK_STATEMENTS: "hospai_accounts_bank_statements_v1",
  GST_CONFIG: "hospai_accounts_gst_config_v1",
  BUDGETS: "hospai_accounts_budgets_v1",
  FIXED_ASSETS: "hospai_accounts_fixed_assets_v1",
  POSTING_RULES: "hospai_accounts_posting_rules_v1",
  FAILED_POSTINGS: "hospai_accounts_failed_postings_v1",
  RECEIPT_VOUCHERS: "hospai_accounts_receipt_vouchers_v1",
  PAYMENT_VOUCHERS: "hospai_accounts_payment_vouchers_v1",
}

const BROADCAST_CHANNEL_NAME = "hospai_accounts_channel"

let broadcastChannel: BroadcastChannel | null = null
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
}

function notifySubscribers(eventType: string, payload?: any) {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: eventType, payload })
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hospai_accounts_updated", { detail: { type: eventType, payload } }))
  }
}

// Initial Seed Data for Chart of Accounts
const INITIAL_COA: ChartOfAccount[] = [
  // ASSETS (1000)
  { account_code: "1000", account_name: "ASSETS", category: "Asset", account_type: "Asset", normal_balance: "Debit", is_header: true, is_active: true, is_control_account: false, current_balance: 0, created_at: new Date().toISOString() },
  { account_code: "1110", account_name: "Main Cash Vault", category: "Asset", account_type: "Cash", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 150000, created_at: new Date().toISOString() },
  { account_code: "1120", account_name: "OPD Billing Counter Cash", category: "Asset", account_type: "Cash", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 34500, created_at: new Date().toISOString() },
  { account_code: "1130", account_name: "IPD Billing Counter Cash", category: "Asset", account_type: "Cash", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 52000, created_at: new Date().toISOString() },
  { account_code: "1210", account_name: "HDFC Bank Primary Operating A/c", category: "Asset", account_type: "Bank", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 1450000, created_at: new Date().toISOString() },
  { account_code: "1220", account_name: "ICICI Bank Collection A/c", category: "Asset", account_type: "Bank", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 820000, created_at: new Date().toISOString() },
  { account_code: "1310", account_name: "Patient Accounts Receivable", category: "Asset", account_type: "AR", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 420000, created_at: new Date().toISOString() },
  { account_code: "1320", account_name: "Corporate Accounts Receivable", category: "Asset", account_type: "AR", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 650000, created_at: new Date().toISOString() },
  { account_code: "1330", account_name: "Insurance & TPA Receivables", category: "Asset", account_type: "AR", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 1280000, created_at: new Date().toISOString() },
  { account_code: "1410", account_name: "Pharmacy Stock Inventory", category: "Asset", account_type: "Inventory", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 950000, created_at: new Date().toISOString() },
  { account_code: "1420", account_name: "Lab Consumables & Reagents Stock", category: "Asset", account_type: "Inventory", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: true, current_balance: 310000, created_at: new Date().toISOString() },
  { account_code: "1510", account_name: "Input CGST (Eligible ITC)", category: "Asset", account_type: "Tax", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: false, current_balance: 45000, created_at: new Date().toISOString() },
  { account_code: "1520", account_name: "Input SGST (Eligible ITC)", category: "Asset", account_type: "Tax", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: false, current_balance: 45000, created_at: new Date().toISOString() },
  { account_code: "1530", account_name: "Input IGST (Eligible ITC)", category: "Asset", account_type: "Tax", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: false, current_balance: 12000, created_at: new Date().toISOString() },
  { account_code: "1710", account_name: "Medical Equipment & Machinery", category: "Asset", account_type: "Asset", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: false, current_balance: 4800000, created_at: new Date().toISOString() },
  { account_code: "1720", account_name: "Hospital Furniture & Fixtures", category: "Asset", account_type: "Asset", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: false, current_balance: 1200000, created_at: new Date().toISOString() },
  { account_code: "1730", account_name: "IT & Computer Infrastructure", category: "Asset", account_type: "Asset", normal_balance: "Debit", parent_code: "1000", is_header: false, is_active: true, is_control_account: false, current_balance: 850000, created_at: new Date().toISOString() },
  { account_code: "1790", account_name: "Accumulated Depreciation - Medical Equipment", category: "Asset", account_type: "Asset", normal_balance: "Credit", parent_code: "1000", is_header: false, is_active: true, is_control_account: false, current_balance: 960000, created_at: new Date().toISOString() },

  // LIABILITIES (2000)
  { account_code: "2000", account_name: "LIABILITIES", category: "Liability", account_type: "Liability", normal_balance: "Credit", is_header: true, is_active: true, is_control_account: false, current_balance: 0, created_at: new Date().toISOString() },
  { account_code: "2110", account_name: "Accounts Payable - Trade Suppliers", category: "Liability", account_type: "AP", normal_balance: "Credit", parent_code: "2000", is_header: false, is_active: true, is_control_account: true, current_balance: 620000, created_at: new Date().toISOString() },
  { account_code: "2120", account_name: "Patient Advance Deposits", category: "Liability", account_type: "Liability", normal_balance: "Credit", parent_code: "2000", is_header: false, is_active: true, is_control_account: true, current_balance: 180000, created_at: new Date().toISOString() },
  { account_code: "2210", account_name: "Output CGST Payable", category: "Liability", account_type: "Tax", normal_balance: "Credit", parent_code: "2000", is_header: false, is_active: true, is_control_account: false, current_balance: 38000, created_at: new Date().toISOString() },
  { account_code: "2220", account_name: "Output SGST Payable", category: "Liability", account_type: "Tax", normal_balance: "Credit", parent_code: "2000", is_header: false, is_active: true, is_control_account: false, current_balance: 38000, created_at: new Date().toISOString() },
  { account_code: "2230", account_name: "Output IGST Payable", category: "Liability", account_type: "Tax", normal_balance: "Credit", parent_code: "2000", is_header: false, is_active: true, is_control_account: false, current_balance: 15000, created_at: new Date().toISOString() },
  { account_code: "2310", account_name: "Salary & Wages Payable", category: "Liability", account_type: "Payroll", normal_balance: "Credit", parent_code: "2000", is_header: false, is_active: true, is_control_account: true, current_balance: 1420000, created_at: new Date().toISOString() },
  { account_code: "2320", account_name: "PF & ESI Statutory Liabilities", category: "Liability", account_type: "Payroll", normal_balance: "Credit", parent_code: "2000", is_header: false, is_active: true, is_control_account: false, current_balance: 185000, created_at: new Date().toISOString() },

  // EQUITY (3000)
  { account_code: "3000", account_name: "EQUITY", category: "Equity", account_type: "Equity", normal_balance: "Credit", is_header: true, is_active: true, is_control_account: false, current_balance: 0, created_at: new Date().toISOString() },
  { account_code: "3100", account_name: "Hospital Capital Reserve", category: "Equity", account_type: "Equity", normal_balance: "Credit", parent_code: "3000", is_header: false, is_active: true, is_control_account: false, current_balance: 8000000, created_at: new Date().toISOString() },
  { account_code: "3200", account_name: "Retained Earnings", category: "Equity", account_type: "Equity", normal_balance: "Credit", parent_code: "3000", is_header: false, is_active: true, is_control_account: false, current_balance: 2450000, created_at: new Date().toISOString() },

  // REVENUE (4000)
  { account_code: "4000", account_name: "REVENUE", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", is_header: true, is_active: true, is_control_account: false, current_balance: 0, created_at: new Date().toISOString() },
  { account_code: "4110", account_name: "OPD Consultation Revenue", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", parent_code: "4000", is_header: false, is_active: true, is_control_account: false, current_balance: 1250000, created_at: new Date().toISOString() },
  { account_code: "4120", account_name: "IPD Room & Nursing Charges Revenue", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", parent_code: "4000", is_header: false, is_active: true, is_control_account: false, current_balance: 3800000, created_at: new Date().toISOString() },
  { account_code: "4130", account_name: "Emergency Services Revenue", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", parent_code: "4000", is_header: false, is_active: true, is_control_account: false, current_balance: 920000, created_at: new Date().toISOString() },
  { account_code: "4140", account_name: "ICU Critical Care Revenue", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", parent_code: "4000", is_header: false, is_active: true, is_control_account: false, current_balance: 2100000, created_at: new Date().toISOString() },
  { account_code: "4150", account_name: "OT & Surgery Revenue", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", parent_code: "4000", is_header: false, is_active: true, is_control_account: false, current_balance: 2450000, created_at: new Date().toISOString() },
  { account_code: "4210", account_name: "Laboratory Diagnostic Revenue", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", parent_code: "4000", is_header: false, is_active: true, is_control_account: false, current_balance: 1480000, created_at: new Date().toISOString() },
  { account_code: "4220", account_name: "Radiology & PACS Diagnostic Revenue", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", parent_code: "4000", is_header: false, is_active: true, is_control_account: false, current_balance: 1150000, created_at: new Date().toISOString() },
  { account_code: "4310", account_name: "Pharmacy Sales Revenue", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", parent_code: "4000", is_header: false, is_active: true, is_control_account: false, current_balance: 1850000, created_at: new Date().toISOString() },
  { account_code: "4910", account_name: "Other Operating Income", category: "Income", account_type: "Operating Revenue", normal_balance: "Credit", parent_code: "4000", is_header: false, is_active: true, is_control_account: false, current_balance: 240000, created_at: new Date().toISOString() },

  // EXPENSES (5000)
  { account_code: "5000", account_name: "EXPENSES", category: "Expense", account_type: "Operating Expense", normal_balance: "Debit", is_header: true, is_active: true, is_control_account: false, current_balance: 0, created_at: new Date().toISOString() },
  { account_code: "5110", account_name: "Cost of Goods Sold - Pharmacy Medicines", category: "Expense", account_type: "COGS", normal_balance: "Debit", parent_code: "5000", is_header: false, is_active: true, is_control_account: false, current_balance: 1120000, created_at: new Date().toISOString() },
  { account_code: "5120", account_name: "Cost of Goods Sold - Lab Reagents", category: "Expense", account_type: "COGS", normal_balance: "Debit", parent_code: "5000", is_header: false, is_active: true, is_control_account: false, current_balance: 240000, created_at: new Date().toISOString() },
  { account_code: "5210", account_name: "Clinical Doctor & Specialist Fees", category: "Expense", account_type: "Operating Expense", normal_balance: "Debit", parent_code: "5000", is_header: false, is_active: true, is_control_account: false, current_balance: 2850000, created_at: new Date().toISOString() },
  { account_code: "5220", account_name: "Staff Salary & Wages Expense", category: "Expense", account_type: "Operating Expense", normal_balance: "Debit", parent_code: "5000", is_header: false, is_active: true, is_control_account: false, current_balance: 3420000, created_at: new Date().toISOString() },
  { account_code: "5310", account_name: "Hospital Utilities (Power, Water, Gas)", category: "Expense", account_type: "Operating Expense", normal_balance: "Debit", parent_code: "5000", is_header: false, is_active: true, is_control_account: false, current_balance: 480000, created_at: new Date().toISOString() },
  { account_code: "5320", account_name: "Facility Rent & Lease Charges", category: "Expense", account_type: "Operating Expense", normal_balance: "Debit", parent_code: "5000", is_header: false, is_active: true, is_control_account: false, current_balance: 750000, created_at: new Date().toISOString() },
  { account_code: "5330", account_name: "Equipment Repairs & Maintenance", category: "Expense", account_type: "Operating Expense", normal_balance: "Debit", parent_code: "5000", is_header: false, is_active: true, is_control_account: false, current_balance: 210000, created_at: new Date().toISOString() },
  { account_code: "5410", account_name: "Fixed Asset Depreciation Expense", category: "Expense", account_type: "Operating Expense", normal_balance: "Debit", parent_code: "5000", is_header: false, is_active: true, is_control_account: false, current_balance: 320000, created_at: new Date().toISOString() },
  { account_code: "5510", account_name: "Bad Debt Write-Off Expense", category: "Expense", account_type: "Operating Expense", normal_balance: "Debit", parent_code: "5000", is_header: false, is_active: true, is_control_account: false, current_balance: 45000, created_at: new Date().toISOString() },
]

const INITIAL_POSTING_RULES: AccountingPostingRule[] = [
  { id: "RULE-OPD-01", transaction_type: "OPD_INVOICE", source_module: "billing", debit_account_code: "1310", credit_account_code: "4110", description: "OPD Patient Consultation Invoice", is_active: true },
  { id: "RULE-OPD-02", transaction_type: "OPD_PAYMENT", source_module: "billing", debit_account_code: "1120", credit_account_code: "1310", description: "OPD Cash Collection", is_active: true },
  { id: "RULE-IPD-01", transaction_type: "IPD_DEPOSIT", source_module: "billing", debit_account_code: "1130", credit_account_code: "2120", description: "Inpatient Advance Deposit", is_active: true },
  { id: "RULE-IPD-02", transaction_type: "IPD_FINAL_BILL", source_module: "billing", debit_account_code: "2120", credit_account_code: "4120", description: "Inpatient Discharge Bill Posting", is_active: true },
  { id: "RULE-PHARM-01", transaction_type: "PHARMACY_SALE", source_module: "pharmacy", debit_account_code: "1310", credit_account_code: "4310", description: "Pharmacy Medicine Sale", is_active: true },
  { id: "RULE-PHARM-02", transaction_type: "PHARMACY_COGS", source_module: "pharmacy", debit_account_code: "5110", credit_account_code: "1410", description: "Pharmacy Inventory Cost Recognition", is_active: true },
  { id: "RULE-PHARM-03", transaction_type: "PHARMACY_GRN", source_module: "pharmacy", debit_account_code: "1410", credit_account_code: "2110", description: "Pharmacy Goods Received Note", is_active: true },
  { id: "RULE-LAB-01", transaction_type: "LAB_BILL_PAID", source_module: "laboratory", debit_account_code: "1120", credit_account_code: "4210", description: "Laboratory Diagnostic Collection", is_active: true },
  { id: "RULE-INS-01", transaction_type: "INSURANCE_APPROVED", source_module: "insurance", debit_account_code: "1330", credit_account_code: "1310", description: "TPA Insurance Claim Transfer", is_active: true },
  { id: "RULE-INS-02", transaction_type: "INSURANCE_SETTLED", source_module: "insurance", debit_account_code: "1210", credit_account_code: "1330", description: "TPA Bank Settlement Received", is_active: true },
  { id: "RULE-PAY-01", transaction_type: "PAYROLL_POSTED", source_module: "hrms", debit_account_code: "5220", credit_account_code: "2310", description: "Monthly Employee Payroll Accrual", is_active: true },
]

export class AccountsDatabase {
  // --- Chart of Accounts ---
  static getChartOfAccounts(): ChartOfAccount[] {
    if (typeof window === "undefined") return INITIAL_COA
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.COA)
      if (!stored) {
        window.localStorage.setItem(STORAGE_KEYS.COA, JSON.stringify(INITIAL_COA))
        return INITIAL_COA
      }
      return JSON.parse(stored)
    } catch {
      return INITIAL_COA
    }
  }

  static saveChartOfAccounts(coa: ChartOfAccount[]): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.COA, JSON.stringify(coa))
    notifySubscribers("COA_UPDATED")
  }

  static upsertAccount(account: Partial<ChartOfAccount> & { account_code: string; account_name: string }): ChartOfAccount {
    const list = this.getChartOfAccounts()
    const idx = list.findIndex(a => a.account_code === account.account_code)
    const newAccount: ChartOfAccount = {
      account_code: account.account_code,
      account_name: account.account_name,
      category: account.category || "Asset",
      account_type: account.account_type || "Asset",
      normal_balance: account.normal_balance || (["Asset", "Expense"].includes(account.category || "") ? "Debit" : "Credit"),
      parent_code: account.parent_code,
      is_header: account.is_header ?? false,
      is_active: account.is_active ?? true,
      is_control_account: account.is_control_account ?? false,
      current_balance: account.current_balance ?? 0,
      description: account.description,
      created_at: account.created_at || new Date().toISOString(),
    }
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...newAccount }
    } else {
      list.push(newAccount)
    }
    this.saveChartOfAccounts(list)
    return newAccount
  }

  // --- Journals & Ledger ---
  static getJournals(): JournalEntry[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.JOURNALS)
      if (!stored) return []
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  static saveJournals(journals: JournalEntry[]): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.JOURNALS, JSON.stringify(journals))
    notifySubscribers("JOURNALS_UPDATED")
  }

  /**
   * Core Double-Entry Enforcement: Every posted journal must have equal debits and credits.
   */
  static postJournal(entry: {
    transaction_type: string
    source_module: string
    source_reference_id: string
    description: string
    lines: { account_code: string; debit: number; credit: number; narration?: string; cost_centre?: string; department?: string; sub_ledger_id?: string; sub_ledger_name?: string }[]
    created_by?: string
    effective_date?: string
    fiscal_year?: string
    fiscal_period?: string
  }): JournalEntry {
    // 1. Check period lock
    const effectiveDate = entry.effective_date || new Date().toISOString().split("T")[0]
    if (this.isPeriodClosed(effectiveDate)) {
      throw new Error(`Accounting period for date ${effectiveDate} is closed. Postings are rejected.`)
    }

    // 2. Compute debit and credit totals
    let totalDebit = 0
    let totalCredit = 0
    const coaList = this.getChartOfAccounts()
    const journalId = `JRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const journalNo = `JV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`

    const lines: JournalLine[] = entry.lines.map((l, idx) => {
      const d = Math.round((Number(l.debit) || 0) * 100) / 100
      const c = Math.round((Number(l.credit) || 0) * 100) / 100
      totalDebit += d
      totalCredit += c
      const account = coaList.find(a => a.account_code === l.account_code)
      return {
        id: `JLN-${journalId}-${idx + 1}`,
        journal_id: journalId,
        account_code: l.account_code,
        account_name: account ? account.account_name : `Account ${l.account_code}`,
        debit: d,
        credit: c,
        narration: l.narration || entry.description,
        cost_centre: l.cost_centre || "General",
        department: l.department || "General",
        sub_ledger_id: l.sub_ledger_id,
        sub_ledger_name: l.sub_ledger_name,
      }
    })

    totalDebit = Math.round(totalDebit * 100) / 100
    totalCredit = Math.round(totalCredit * 100) / 100

    // Enforce Double-Entry Balancing Invariant
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Double-entry balance check failed! Total Debits (₹${totalDebit}) must equal Total Credits (₹${totalCredit}).`)
    }
    if (totalDebit === 0) {
      throw new Error("Journal entry total cannot be zero.")
    }

    const journal: JournalEntry = {
      id: journalId,
      journal_number: journalNo,
      posting_date: new Date().toISOString(),
      effective_date: effectiveDate,
      fiscal_year: entry.fiscal_year || "2026-2027",
      fiscal_period: entry.fiscal_period || "Apr 2026",
      transaction_type: entry.transaction_type,
      source_module: entry.source_module,
      source_reference_id: entry.source_reference_id,
      description: entry.description,
      status: "Posted",
      total_debit: totalDebit,
      total_credit: totalCredit,
      lines,
      created_by: entry.created_by || "Finance System",
      posted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    // 3. Update Chart of Accounts balances
    for (const l of lines) {
      const accIdx = coaList.findIndex(a => a.account_code === l.account_code)
      if (accIdx >= 0) {
        const acc = coaList[accIdx]
        const delta = acc.normal_balance === "Debit" ? (l.debit - l.credit) : (l.credit - l.debit)
        acc.current_balance = Math.round((acc.current_balance + delta) * 100) / 100
      }
    }
    this.saveChartOfAccounts(coaList)

    // 4. Save journal
    const journals = this.getJournals()
    journals.unshift(journal)
    this.saveJournals(journals)

    return journal
  }

  /**
   * Reverses a posted journal safely with linked reference.
   */
  static reverseJournal(journalId: string, reason: string, user: string): JournalEntry {
    const journals = this.getJournals()
    const targetIdx = journals.findIndex(j => j.id === journalId)
    if (targetIdx < 0) throw new Error("Journal not found.")
    const target = journals[targetIdx]
    if (target.status === "Reversed") throw new Error("Journal is already reversed.")

    // Build swapped lines
    const reversedLines = target.lines.map(l => ({
      account_code: l.account_code,
      debit: l.credit,
      credit: l.debit,
      narration: `Reversal of ${target.journal_number}: ${reason}`,
      cost_centre: l.cost_centre,
      department: l.department,
      sub_ledger_id: l.sub_ledger_id,
      sub_ledger_name: l.sub_ledger_name,
    }))

    const reversalJournal = this.postJournal({
      transaction_type: `${target.transaction_type}_REVERSAL`,
      source_module: target.source_module,
      source_reference_id: target.source_reference_id,
      description: `REVERSAL: ${target.description} (${reason})`,
      lines: reversedLines,
      created_by: user,
      effective_date: new Date().toISOString().split("T")[0],
    })

    reversalJournal.is_reversal = true
    reversalJournal.reversal_of_journal_id = target.id

    target.status = "Reversed"
    journals[targetIdx] = target
    this.saveJournals(journals)

    return reversalJournal
  }

  // --- Fiscal Period Management ---
  static getFiscalPeriods(): FiscalPeriod[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.FISCAL_PERIODS)
      if (!stored) return []
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  static saveFiscalPeriods(periods: FiscalPeriod[]): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.FISCAL_PERIODS, JSON.stringify(periods))
    notifySubscribers("PERIODS_UPDATED")
  }

  static isPeriodClosed(dateStr: string): boolean {
    const periods = this.getFiscalPeriods()
    const target = periods.find(p => dateStr >= p.start_date && dateStr <= p.end_date)
    return target ? target.is_closed : false
  }

  static togglePeriodLock(periodId: string, isClosed: boolean, user: string): FiscalPeriod {
    const periods = this.getFiscalPeriods()
    const idx = periods.findIndex(p => p.id === periodId)
    if (idx < 0) throw new Error("Fiscal period not found.")
    periods[idx].is_closed = isClosed
    periods[idx].closed_at = isClosed ? new Date().toISOString() : undefined
    periods[idx].closed_by = isClosed ? user : undefined
    this.saveFiscalPeriods(periods)
    return periods[idx]
  }

  // --- Accounts Receivable (AR) ---
  static getReceivables(): ReceivableItem[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.RECEIVABLES)
      if (!stored) return []
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  static saveReceivables(items: ReceivableItem[]): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.RECEIVABLES, JSON.stringify(items))
    notifySubscribers("AR_UPDATED")
  }

  static upsertReceivable(item: Partial<ReceivableItem> & { invoice_no: string; patient_id: string; total_amount: number }): ReceivableItem {
    const list = this.getReceivables()
    const idx = list.findIndex(r => r.invoice_no === item.invoice_no)
    const invoiceDate = item.invoice_date || new Date().toISOString().split("T")[0]
    const dueDate = item.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
    const total = Number(item.total_amount) || 0
    const paid = Number(item.paid_amount) || 0
    const due = Math.max(0, total - paid)
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(invoiceDate).getTime()) / (1000 * 3600 * 24)))
    const bucket: ReceivableItem["ageing_bucket"] = ageDays <= 30 ? "0-30" : ageDays <= 60 ? "31-60" : ageDays <= 90 ? "61-90" : "90+"
    const status: ReceivableItem["status"] = due === 0 ? "Paid" : paid > 0 ? "Partial" : ageDays > 30 ? "Overdue" : "Unpaid"

    const newItem: ReceivableItem = {
      id: item.id || `AR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      invoice_no: item.invoice_no,
      patient_id: item.patient_id,
      patient_name: item.patient_name || "Patient",
      payer_type: item.payer_type || "Patient",
      payer_name: item.payer_name || item.patient_name || "Self",
      invoice_date: invoiceDate,
      due_date: dueDate,
      total_amount: total,
      paid_amount: paid,
      due_amount: due,
      status,
      ageing_days: ageDays,
      ageing_bucket: bucket,
      department: item.department || "General",
    }

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...newItem }
    } else {
      list.unshift(newItem)
    }
    this.saveReceivables(list)
    return newItem
  }

  // --- Accounts Payable (AP) ---
  static getPayables(): PayableItem[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.PAYABLES)
      if (!stored) return []
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  static savePayables(items: PayableItem[]): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.PAYABLES, JSON.stringify(items))
    notifySubscribers("AP_UPDATED")
  }

  static upsertPayable(item: Partial<PayableItem> & { supplier_invoice_no: string; supplier_name: string; total_amount: number }): PayableItem {
    const list = this.getPayables()
    const idx = list.findIndex(p => p.supplier_invoice_no === item.supplier_invoice_no)
    const invoiceDate = item.invoice_date || new Date().toISOString().split("T")[0]
    const dueDate = item.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
    const total = Number(item.total_amount) || 0
    const paid = Number(item.paid_amount) || 0
    const due = Math.max(0, total - paid)
    const ageDays = Math.max(0, Math.floor((Date.now() - new Date(invoiceDate).getTime()) / (1000 * 3600 * 24)))
    const bucket: PayableItem["ageing_bucket"] = ageDays <= 30 ? "0-30" : ageDays <= 60 ? "31-60" : ageDays <= 90 ? "61-90" : "90+"
    const status: PayableItem["status"] = due === 0 ? "Paid" : paid > 0 ? "Partial" : ageDays > 30 ? "Overdue" : "Unpaid"

    const newItem: PayableItem = {
      id: item.id || `AP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      supplier_id: item.supplier_id || "SUP-DEFAULT",
      supplier_name: item.supplier_name,
      supplier_invoice_no: item.supplier_invoice_no,
      grn_no: item.grn_no,
      po_no: item.po_no,
      invoice_date: invoiceDate,
      due_date: dueDate,
      total_amount: total,
      paid_amount: paid,
      due_amount: due,
      status,
      ageing_days: ageDays,
      ageing_bucket: bucket,
      department: item.department || "Pharmacy",
    }

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...newItem }
    } else {
      list.unshift(newItem)
    }
    this.savePayables(list)
    return newItem
  }

  // --- Cashier Handover ---
  static getCashierHandovers(): CashierHandover[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.CASHIER_HANDOVERS)
      if (!stored) return []
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  static recordCashierHandover(handover: Omit<CashierHandover, "id" | "variance" | "status">): CashierHandover {
    const list = this.getCashierHandovers()
    const variance = Math.round((handover.actual_cash_counted - handover.system_collections) * 100) / 100
    const status: CashierHandover["status"] = Math.abs(variance) === 0 ? "Balanced" : "Discrepancy"
    const record: CashierHandover = {
      id: `HND-${Date.now()}`,
      ...handover,
      variance,
      status,
    }
    list.unshift(record)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.CASHIER_HANDOVERS, JSON.stringify(list))
      notifySubscribers("HANDOVER_UPDATED")
    }
    return record
  }

  // --- Financial Reporting & Statements ---
  static getTrialBalance(): FinancialTrialBalanceRow[] {
    const coa = this.getChartOfAccounts()
    return coa.map(acc => {
      const isDebitNormal = acc.normal_balance === "Debit"
      const closingDebit = isDebitNormal ? Math.max(0, acc.current_balance) : 0
      const closingCredit = !isDebitNormal ? Math.max(0, acc.current_balance) : 0
      return {
        account_code: acc.account_code,
        account_name: acc.account_name,
        category: acc.category,
        opening_debit: 0,
        opening_credit: 0,
        period_debit: closingDebit,
        period_credit: closingCredit,
        closing_debit: closingDebit,
        closing_credit: closingCredit,
      }
    })
  }

  static getProfitAndLoss(): {
    revenue: { code: string; name: string; amount: number }[]
    total_revenue: number
    expenses: { code: string; name: string; amount: number }[]
    total_expenses: number
    net_profit: number
  } {
    const coa = this.getChartOfAccounts()
    const revenue = coa.filter(a => a.category === "Income" && !a.is_header).map(a => ({ code: a.account_code, name: a.account_name, amount: a.current_balance }))
    const expenses = coa.filter(a => a.category === "Expense" && !a.is_header).map(a => ({ code: a.account_code, name: a.account_name, amount: a.current_balance }))

    const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0)
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const netProfit = totalRevenue - totalExpenses

    return {
      revenue,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      expenses,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      net_profit: Math.round(netProfit * 100) / 100,
    }
  }

  static getBalanceSheet(): {
    assets: { code: string; name: string; amount: number }[]
    total_assets: number
    liabilities: { code: string; name: string; amount: number }[]
    total_liabilities: number
    equity: { code: string; name: string; amount: number }[]
    total_equity: number
    is_balanced: boolean
  } {
    const coa = this.getChartOfAccounts()
    const assets = coa.filter(a => a.category === "Asset" && !a.is_header).map(a => ({ code: a.account_code, name: a.account_name, amount: a.current_balance }))
    const liabilities = coa.filter(a => a.category === "Liability" && !a.is_header).map(a => ({ code: a.account_code, name: a.account_name, amount: a.current_balance }))
    const equity = coa.filter(a => a.category === "Equity" && !a.is_header).map(a => ({ code: a.account_code, name: a.account_name, amount: a.current_balance }))

    const pnl = this.getProfitAndLoss()
    equity.push({ code: "3999", name: "Current Period Net Profit / Loss", amount: pnl.net_profit })

    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0)
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0)
    const totalEquity = equity.reduce((sum, e) => sum + e.amount, 0)
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1.0

    return {
      assets,
      total_assets: Math.round(totalAssets * 100) / 100,
      liabilities,
      total_liabilities: Math.round(totalLiabilities * 100) / 100,
      equity,
      total_equity: Math.round(totalEquity * 100) / 100,
      is_balanced: isBalanced,
    }
  }

  // --- Receipt Vouchers ---
  static getReceiptVouchers(): ReceiptVoucher[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.RECEIPT_VOUCHERS)
      if (!stored) return []
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  static saveReceiptVouchers(vouchers: ReceiptVoucher[]): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.RECEIPT_VOUCHERS, JSON.stringify(vouchers))
    notifySubscribers("RECEIPT_VOUCHERS_UPDATED")
  }

  static createReceiptVoucher(rv: Omit<ReceiptVoucher, "id" | "voucher_no">): ReceiptVoucher {
    const list = this.getReceiptVouchers()
    const voucherNo = `RV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    const newRv: ReceiptVoucher = {
      id: `RV-${Date.now()}`,
      voucher_no: voucherNo,
      ...rv,
    }
    list.unshift(newRv)
    this.saveReceiptVouchers(list)

    // Post Double-Entry Journal: Debit Cash/Bank, Credit AR (1310)
    this.postJournal({
      transaction_type: "RECEIPT_VOUCHER",
      source_module: "receipt_vouchers",
      source_reference_id: voucherNo,
      description: `Receipt Voucher ${voucherNo} from ${rv.payer_name} (${rv.patient_name})`,
      lines: [
        { account_code: rv.destination_account_code, debit: rv.amount_received, credit: 0, narration: `Collection via ${rv.payment_method}` },
        { account_code: "1310", debit: 0, credit: rv.amount_received, narration: `Receivable settlement for ${rv.patient_name}`, sub_ledger_id: rv.patient_id, sub_ledger_name: rv.patient_name },
      ],
      created_by: rv.created_by,
    })

    return newRv
  }

  // --- Payment Vouchers & Approval Workflow ---
  static getPaymentVouchers(): PaymentVoucher[] {
    if (typeof window === "undefined") return []
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.PAYMENT_VOUCHERS)
      if (!stored) return []
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  static savePaymentVouchers(vouchers: PaymentVoucher[]): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.PAYMENT_VOUCHERS, JSON.stringify(vouchers))
    notifySubscribers("PAYMENT_VOUCHERS_UPDATED")
  }

  static createPaymentVoucher(pv: Omit<PaymentVoucher, "id" | "voucher_no" | "status">): PaymentVoucher {
    const list = this.getPaymentVouchers()
    const voucherNo = `PV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    const newPv: PaymentVoucher = {
      id: `PV-${Date.now()}`,
      voucher_no: voucherNo,
      status: "Submitted",
      ...pv,
    }
    list.unshift(newPv)
    this.savePaymentVouchers(list)
    return newPv
  }

  static approvePaymentVoucher(voucherId: string, approver: string): PaymentVoucher {
    const list = this.getPaymentVouchers()
    const idx = list.findIndex(v => v.id === voucherId)
    if (idx < 0) throw new Error("Payment voucher not found.")
    list[idx].status = "Approved"
    list[idx].approved_by = approver
    this.savePaymentVouchers(list)
    return list[idx]
  }

  static disbursePaymentVoucher(voucherId: string, user: string): PaymentVoucher {
    const list = this.getPaymentVouchers()
    const idx = list.findIndex(v => v.id === voucherId)
    if (idx < 0) throw new Error("Payment voucher not found.")
    const pv = list[idx]
    if (pv.status !== "Approved") throw new Error("Voucher must be Approved before disbursement.")

    pv.status = "Disbursed"
    pv.disbursed_at = new Date().toISOString()
    this.savePaymentVouchers(list)

    // Post Double-Entry Journal: Debit Liability/Expense, Credit Bank (1210)
    this.postJournal({
      transaction_type: "PAYMENT_VOUCHER_DISBURSED",
      source_module: "payment_vouchers",
      source_reference_id: pv.voucher_no,
      description: `Payment Voucher ${pv.voucher_no} to ${pv.payee_name}`,
      lines: [
        { account_code: pv.expense_or_liability_account, debit: pv.amount, credit: 0, narration: `Disbursement to ${pv.payee_name}`, sub_ledger_name: pv.payee_name },
        { account_code: pv.source_bank_account_code || "1210", debit: 0, credit: pv.amount, narration: `Bank Payment via ${pv.payment_method}` },
      ],
      created_by: user,
    })

    return pv
  }
}
