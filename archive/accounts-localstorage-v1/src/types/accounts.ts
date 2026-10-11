export type AccountCategory = "Asset" | "Liability" | "Equity" | "Income" | "Expense"
export type AccountType = "Cash" | "Bank" | "AR" | "AP" | "Inventory" | "Tax" | "Payroll" | "Operating Revenue" | "COGS" | "Operating Expense" | "Asset" | "Liability" | "Equity"
export type NormalBalance = "Debit" | "Credit"

export interface ChartOfAccount {
  account_code: string
  account_name: string
  category: AccountCategory
  account_type: AccountType
  normal_balance: NormalBalance
  parent_code?: string
  is_header: boolean
  is_active: boolean
  is_control_account: boolean
  current_balance: number
  description?: string
  created_at: string
}

export interface JournalLine {
  id: string
  journal_id: string
  account_code: string
  account_name: string
  debit: number
  credit: number
  cost_centre?: string
  department?: string
  narration?: string
  sub_ledger_id?: string
  sub_ledger_name?: string
}

export type JournalStatus = "Draft" | "Submitted" | "Approved" | "Posted" | "Reversed"

export interface JournalEntry {
  id: string
  journal_number: string
  posting_date: string
  effective_date: string
  fiscal_year: string
  fiscal_period: string
  transaction_type: string
  source_module: string
  source_reference_id: string
  description: string
  status: JournalStatus
  total_debit: number
  total_credit: number
  lines: JournalLine[]
  created_by: string
  approved_by?: string
  posted_at?: string
  is_reversal?: boolean
  reversal_of_journal_id?: string
  branch_id?: string
  created_at: string
}

export interface FiscalPeriod {
  id: string
  fiscal_year: string
  period_name: string
  period_number: number
  start_date: string
  end_date: string
  is_closed: boolean
  closed_at?: string
  closed_by?: string
}

export interface ReceivableItem {
  id: string
  invoice_no: string
  patient_id: string
  patient_name: string
  payer_type: "Patient" | "Corporate" | "Insurance"
  payer_name: string
  invoice_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  due_amount: number
  status: "Unpaid" | "Partial" | "Paid" | "Overdue" | "Written Off"
  ageing_days: number
  ageing_bucket: "0-30" | "31-60" | "61-90" | "90+"
  department: string
}

export interface PayableItem {
  id: string
  supplier_id: string
  supplier_name: string
  supplier_invoice_no: string
  grn_no?: string
  po_no?: string
  invoice_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  due_amount: number
  status: "Unpaid" | "Partial" | "Paid" | "Overdue"
  ageing_days: number
  ageing_bucket: "0-30" | "31-60" | "61-90" | "90+"
  department: string
}

export interface ReceiptVoucher {
  id: string
  voucher_no: string
  receipt_date: string
  patient_id: string
  patient_name: string
  payer_type: "Patient" | "Corporate" | "Insurance"
  payer_name: string
  payment_method: "Cash" | "Bank Transfer" | "UPI" | "Cheque" | "Credit Card"
  destination_account_code: string
  destination_account_name: string
  amount_received: number
  allocated_amount: number
  unallocated_amount: number
  reference_no: string
  allocated_invoices: {
    invoice_no: string
    amount: number
  }[]
  status: "Posted" | "Cancelled"
  created_by: string
  notes?: string
}

export type PaymentVoucherStatus = "Draft" | "Submitted" | "Approved font-bold" | "Approved" | "Disbursed" | "Rejected"

export interface PaymentVoucher {
  id: string
  voucher_no: string
  voucher_date: string
  payee_type: "Supplier" | "Employee" | "Utility" | "Doctor Specialist" | "Other"
  payee_name: string
  payee_id?: string
  expense_or_liability_account: string
  supplier_invoice_no?: string
  payment_method: "Bank Transfer" | "Cash" | "Cheque"
  source_bank_account_code: string
  amount: number
  tax_deducted: number
  net_disbursed: number
  due_date: string
  status: PaymentVoucherStatus
  requested_by: string
  approved_by?: string
  disbursed_at?: string
  narration: string
}

export interface CashierHandover {
  id: string
  handover_date: string
  cashier_name: string
  counter_name: string
  opening_cash: number
  system_collections: number
  actual_cash_counted: number
  variance: number
  status: "Balanced" | "Discrepancy" | "Approved"
  verified_by?: string
  notes?: string
}

export interface CostCentreBudget {
  id: string
  fiscal_year: string
  department: string
  cost_centre_code: string
  category: "Revenue" | "Expense"
  annual_budget: number
  monthly_budget: number
  actual_ytd: number
  variance: number
  utilization_pct: number
}

export interface FixedAsset {
  id: string
  asset_code: string
  asset_name: string
  category: "Medical Equipment" | "Furniture & Fixtures" | "IT Hardware" | "Vehicles" | "Buildings"
  purchase_date: string
  purchase_cost: number
  salvage_value: number
  useful_life_years: number
  depreciation_method: "Straight Line" | "Reducing Balance"
  accumulated_depreciation: number
  net_book_value: number
  department: string
  location: string
  status: "Active" | "Disposed" | "Written Off"
}

export interface FinancialTrialBalanceRow {
  account_code: string
  account_name: string
  category: AccountCategory
  opening_debit: number
  opening_credit: number
  period_debit: number
  period_credit: number
  closing_debit: number
  closing_credit: number
}

export type FinancialReportType =
  | "trial_balance"
  | "general_ledger"
  | "journal_register"
  | "balance_sheet"
  | "profit_loss"
  | "cash_flow"
  | "ar_ageing"
  | "ap_ageing"
  | "patient_outstanding"
  | "corporate_outstanding"
  | "insurance_outstanding"
  | "supplier_outstanding"
  | "daily_collection"
  | "cashier_closing"
  | "bank_reconciliation"
  | "revenue_by_dept"
  | "expense_by_dept"
  | "gst_summary"
  | "tax_liability"
  | "inventory_valuation"
  | "cogs_report"
  | "fixed_asset_register"
  | "depreciation_report"
  | "budget_vs_actual"
  | "audit_trail"
  | "month_end_closing"
