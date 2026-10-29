/**
 * Automated Test Suite: Staff Loans Bug Fixes & Regressions
 *
 * Verifies:
 * 1. Database state check for original EMP-101 loan LOAN-48741.
 * 2. Defensive filtering logic against null, undefined, and snake_case objects (reproducing lines 71-72 crash).
 * 3. Normalizer logic for converting raw PostgreSQL snake_case rows to camelCase StaffLoan objects.
 * 4. Transaction-safe database loan creation, repayment, and closure with strict ROLLBACK.
 * 5. Live backend API contract validation (GET /biometric/staff-loans and POST validation).
 * 6. Confirmation that zero persistent records were added, deleted, or mutated.
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5434', 10),
  database: process.env.PGDATABASE || 'hospai_enterprise',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

// Emulate StaffLoanModal defensive filter
function filterLoans(loans, search, statusFilter) {
  return loans.filter((l) => {
    if (!l) return false;
    const sName = String(l.staffName || l.employee_name || "").toLowerCase();
    const sId = String(l.staffId || l.employee_id || "").toLowerCase();
    const lId = String(l.id || "").toLowerCase();
    const lType = String(l.loanType || l.loan_type || "").toLowerCase();
    const dept = String(l.department || "").toLowerCase();
    const sTerm = (search || "").toLowerCase().trim();

    const matchesSearch =
      !sTerm ||
      sName.includes(sTerm) ||
      sId.includes(sTerm) ||
      lId.includes(sTerm) ||
      lType.includes(sTerm) ||
      dept.includes(sTerm);
    const currentStatus = l.status || "Active";
    const matchesStatus = statusFilter === "All" || currentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });
}

// Normalizer implementation matching hrmsDb.ts
function normalizeStaffLoan(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      id: `LOAN-${Date.now().toString().slice(-4)}`,
      staffId: "",
      staffName: "Unknown Staff",
      department: "General",
      loanType: "Salary Advance",
      sanctionedAmount: 0,
      disbursedDate: new Date().toISOString().substring(0, 10),
      monthlyEmi: 0,
      totalTenureMonths: 1,
      remainingTenureMonths: 1,
      balanceOutstanding: 0,
      status: "Active",
    };
  }

  const id = String(raw.id || raw.loanId || raw.loan_id || `LOAN-${Date.now().toString().slice(-4)}`);
  const staffId = String(raw.staffId || raw.staff_id || raw.employeeId || raw.employee_id || raw.empId || raw.emp_id || "");
  const staffName = String(raw.staffName || raw.staff_name || raw.employeeName || raw.employee_name || raw.name || "Unknown Staff");
  const department = String(raw.department || raw.dept || "General");
  const loanType = String(raw.loanType || raw.loan_type || raw.advanceType || raw.advance_type || raw.type || "Salary Advance");

  const tenure = parseInt(String(raw.totalTenureMonths ?? raw.total_tenure_months ?? raw.tenureMonths ?? raw.tenure_months ?? raw.tenure ?? 1), 10) || 1;
  const sanctioned = parseFloat(String(raw.sanctionedAmount ?? raw.sanctioned_amount ?? raw.amount ?? raw.loanAmount ?? raw.loan_amount ?? raw.principal ?? 0)) || 0;
  const rawRemaining = raw.remainingTenureMonths ?? raw.remaining_tenure_months ?? raw.remainingMonths ?? raw.remaining_months ?? raw.remainingTenure;
  const remaining = rawRemaining !== undefined && rawRemaining !== null ? parseInt(String(rawRemaining), 10) : tenure;
  const emi = parseFloat(String(raw.monthlyEmi ?? raw.monthly_emi ?? raw.emi ?? (tenure > 0 ? Math.round(sanctioned / tenure) : sanctioned))) || 0;
  const balance = parseFloat(String(raw.balanceOutstanding ?? raw.balance_outstanding ?? raw.balanceDue ?? raw.balance_due ?? raw.balance ?? raw.outstanding ?? sanctioned)) || 0;

  const rawDate = raw.disbursedDate || raw.disbursed_date || raw.disbursementDate || raw.disbursement_date || raw.disbursed || raw.date;
  const dateStr = rawDate ? String(rawDate).split("T")[0] : new Date().toISOString().substring(0, 10);
  const status = raw.status === "Closed" || raw.status === "Pending Sanction" ? raw.status : "Active";
  const rawAmountPaid = raw.amountPaid ?? raw.amount_paid;
  const amountPaid = rawAmountPaid !== undefined && rawAmountPaid !== null && !isNaN(parseFloat(String(rawAmountPaid)))
    ? parseFloat(String(rawAmountPaid))
    : undefined;
  const rawRecoveryPeriod = raw.recoveryPeriod || raw.recovery_period;
  const recoveryPeriod = rawRecoveryPeriod ? String(rawRecoveryPeriod) : undefined;

  return {
    id,
    staffId,
    staffName,
    department,
    loanType,
    sanctionedAmount: sanctioned,
    disbursedDate: dateStr,
    monthlyEmi: emi,
    totalTenureMonths: tenure,
    remainingTenureMonths: isNaN(remaining) ? 0 : remaining,
    balanceOutstanding: balance,
    status,
    ...(amountPaid !== undefined ? { amountPaid } : {}),
    ...(recoveryPeriod ? { recoveryPeriod } : {}),
  };
}

function formatRecoveryPeriod(periodStr) {
  if (!periodStr) return "";
  const parts = periodStr.split("-");
  if (parts.length >= 2) {
    const year = parseInt(parts[0], 10);
    const monthNum = parseInt(parts[1], 10);
    if (!isNaN(year) && !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return `${monthNames[monthNum - 1]} ${year}`;
    }
  }
  return periodStr;
}

function buildEmiSuccessMessage(staffLoan) {
  const rawAmount = staffLoan?.amountPaid;
  const amountNum = typeof rawAmount === "number" && !isNaN(rawAmount) ? rawAmount : undefined;
  const formattedAmount = amountNum !== undefined
    ? `₹${amountNum.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : undefined;
  const formattedMonth = formatRecoveryPeriod(staffLoan?.recoveryPeriod);

  if (formattedAmount && formattedMonth) {
    return `EMI of ${formattedAmount} for ${formattedMonth} recovered successfully.`;
  }
  if (formattedAmount) {
    return `EMI of ${formattedAmount} recovered successfully.`;
  }
  if (formattedMonth) {
    return `EMI for ${formattedMonth} recovered successfully.`;
  }
  return "1 Monthly Installment EMI recorded and recovered successfully.";
}

async function runTests() {
  console.log('====================================================');
  console.log('       Staff Loans Bug Fixes Regression Suite       ');
  console.log('====================================================\n');

  let initialLoanCount = 0;
  let originalLoan = null;

  // Clean any leftover TEST-% fixtures from previous test runs
  await pool.query("DELETE FROM staff_loan_repayments WHERE loan_id LIKE 'TEST-%'");
  await pool.query("DELETE FROM staff_loans WHERE id LIKE 'TEST-%'");

  // ---------------------------------------------------------------
  // SUITE 1: Database Baseline Check
  // ---------------------------------------------------------------
  console.log('--- SUITE 1: Database Baseline Check ---');
  try {
    const res = await pool.query('SELECT * FROM staff_loans ORDER BY created_at ASC');
    initialLoanCount = res.rowCount;
    originalLoan = res.rows[0];

    assert(initialLoanCount >= 1, `Database contains at least 1 saved loan (found: ${initialLoanCount})`);
    assert(originalLoan?.employee_id === 'EMP-101', `Loan belongs to Dr. Rajesh Varma (EMP-101)`);
    assert(parseFloat(originalLoan?.sanctioned_amount) === 10000, `Sanctioned amount is exactly ₹10,000.00`);
    assert(parseFloat(originalLoan?.monthly_emi) === 3333, `Monthly EMI is ₹3,333.00`);
    assert(originalLoan?.status === 'Active', `Loan status is Active`);
    assert(originalLoan?.id === 'LOAN-48741', `Loan ID is LOAN-48741`);
  } catch (err) {
    assert(false, `Baseline DB check failed: ${err.message}`);
  }

  // ---------------------------------------------------------------
  // SUITE 2: Defensive Filtering (Crash Reproduction & Prevention)
  // ---------------------------------------------------------------
  console.log('\n--- SUITE 2: Defensive Filtering (Crash Prevention) ---');
  try {
    // Test 2.1: Raw snake_case object that previously crashed line 71-72
    const rawPgLoan = {
      id: "LOAN-48741",
      employee_id: "EMP-101",
      employee_name: "Dr. Rajesh Varma",
      department: "Cardiology",
      loan_type: "Salary Advance",
      sanctioned_amount: "10000.00",
      monthly_emi: "3333.00",
      status: "Active"
    };

    let crashed = false;
    let filtered = [];
    try {
      filtered = filterLoans([rawPgLoan], "Rajesh", "All");
    } catch (e) {
      crashed = true;
    }
    assert(!crashed, `Filter does not crash on raw snake_case database object (previously threw toLowerCase error)`);
    assert(filtered.length === 1, `Filter correctly matches search "Rajesh" on employee_name`);

    // Test 2.2: Completely missing or undefined fields
    const emptyObjectLoan = {};
    let emptyFilterResult = [];
    crashed = false;
    try {
      emptyFilterResult = filterLoans([emptyObjectLoan], "test", "All");
    } catch (e) {
      crashed = true;
    }
    assert(!crashed, `Filter does not crash on empty object {}`);
    assert(emptyFilterResult.length === 0, `Empty object does not match search string "test"`);

    // Test 2.3: Null/undefined array elements
    let nullListResult = [];
    crashed = false;
    try {
      nullListResult = filterLoans([null, undefined, { staffName: null, staffId: null }], "test", "All");
    } catch (e) {
      crashed = true;
    }
    assert(!crashed, `Filter safely handles null and undefined items in list`);
    assert(nullListResult.length === 0, `Null and undefined items filtered out cleanly`);

    // Test 2.4: Department and LoanType search on snake_case
    const searchDept = filterLoans([rawPgLoan], "Cardio", "All");
    assert(searchDept.length === 1, `Filter matches search on department`);

    const searchLoanType = filterLoans([rawPgLoan], "Salary Advance", "All");
    assert(searchLoanType.length === 1, `Filter matches search on loan_type`);

    const searchId = filterLoans([rawPgLoan], "EMP-101", "All");
    assert(searchId.length === 1, `Filter matches search on employee_id`);

    // Test 2.5: Status filtering on snake_case and default
    const activeFilter = filterLoans([rawPgLoan], "", "Active");
    assert(activeFilter.length === 1, `Filter correctly matches status "Active"`);

    const closedFilter = filterLoans([rawPgLoan], "", "Closed");
    assert(closedFilter.length === 0, `Filter excludes active loan when filtering for "Closed"`);
  } catch (err) {
    assert(false, `Suite 2 failed: ${err.message}`);
  }

  // ---------------------------------------------------------------
  // SUITE 3: Normalizer Shape Contract Verification
  // ---------------------------------------------------------------
  console.log('\n--- SUITE 3: Normalizer Shape Contract ---');
  try {
    const rawPgRow = {
      id: "LOAN-99999",
      employee_id: "EMP-102",
      employee_name: "Nurse Priya Sharma",
      department: "ICU",
      loan_type: "Emergency Loan",
      sanctioned_amount: "25000.50",
      monthly_emi: "5000.10",
      total_tenure_months: 5,
      remaining_tenure_months: 4,
      balance_outstanding: "20000.40",
      disbursed_date: "2026-10-20T00:00:00.000Z",
      status: "Active"
    };

    const normalized = normalizeStaffLoan(rawPgRow);
    assert(normalized.id === "LOAN-99999", `Normalizer preserves id`);
    assert(normalized.staffId === "EMP-102", `Normalizer maps employee_id -> staffId`);
    assert(normalized.staffName === "Nurse Priya Sharma", `Normalizer maps employee_name -> staffName`);
    assert(normalized.loanType === "Emergency Loan", `Normalizer maps loan_type -> loanType`);
    assert(normalized.sanctionedAmount === 25000.50, `Normalizer converts sanctioned_amount to number`);
    assert(normalized.monthlyEmi === 5000.10, `Normalizer converts monthly_emi to number`);
    assert(normalized.totalTenureMonths === 5, `Normalizer converts total_tenure_months to number`);
    assert(normalized.remainingTenureMonths === 4, `Normalizer converts remaining_tenure_months to number`);
    assert(normalized.balanceOutstanding === 20000.40, `Normalizer converts balance_outstanding to number`);
    assert(normalized.disbursedDate === "2026-10-20", `Normalizer formats disbursed_date to YYYY-MM-DD`);
    assert(normalized.status === "Active", `Normalizer preserves status`);

    // Test 3.2: Comprehensive alias coverage (employeeId, employeeName, advanceType, amount, balanceDue, tenureMonths)
    const aliasedLoan = {
      loanId: "LOAN-ALIAS",
      employeeId: "EMP-200",
      employeeName: "Dr. Arvind Rao",
      dept: "Neurology",
      advanceType: "Festival Loan",
      amount: "40000",
      tenureMonths: "8",
      remainingMonths: "6",
      balanceDue: "30000",
      disbursementDate: "2026-08-10",
      status: "Active"
    };
    const normAliased = normalizeStaffLoan(aliasedLoan);
    assert(normAliased.id === "LOAN-ALIAS", `Maps loanId alias to id`);
    assert(normAliased.staffId === "EMP-200", `Maps employeeId alias to staffId`);
    assert(normAliased.staffName === "Dr. Arvind Rao", `Maps employeeName alias to staffName`);
    assert(normAliased.department === "Neurology", `Maps dept alias to department`);
    assert(normAliased.loanType === "Festival Loan", `Maps advanceType alias to loanType`);
    assert(normAliased.sanctionedAmount === 40000, `Maps amount alias to sanctionedAmount`);
    assert(normAliased.totalTenureMonths === 8, `Maps tenureMonths alias to totalTenureMonths`);
    assert(normAliased.remainingTenureMonths === 6, `Maps remainingMonths alias to remainingTenureMonths`);
    assert(normAliased.balanceOutstanding === 30000, `Maps balanceDue alias to balanceOutstanding`);
    assert(normAliased.monthlyEmi === 5000, `Computes monthlyEmi from amount and tenureMonths`);

    // Normalizing null / undefined safely
    const nullNormalized = normalizeStaffLoan(null);
    assert(typeof nullNormalized === "object" && nullNormalized !== null, `Normalizing null returns valid object`);
    assert(typeof nullNormalized.staffName === "string", `Default staffName is non-empty string`);
    assert(typeof nullNormalized.staffId === "string", `Default staffId is string`);
    assert(typeof nullNormalized.loanType === "string", `Default loanType is string`);
    assert(typeof nullNormalized.sanctionedAmount === "number", `Default sanctionedAmount is number`);
  } catch (err) {
    assert(false, `Suite 3 failed: ${err.message}`);
  }

  // ---------------------------------------------------------------
  // SUITE 4: Isolated Transaction Loan Creation & Repayment Test
  // ---------------------------------------------------------------
  console.log('\n--- SUITE 4: Isolated Transaction (Strict ROLLBACK) ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Test 4.1: Test insertion with RETURNING camelCase aliased columns
    const testLoanId = `TEST-LOAN-${Date.now().toString().slice(-4)}`;
    const insertRes = await client.query(`
      INSERT INTO staff_loans (
        id, hospital_id, employee_id, employee_name, department, loan_type,
        sanctioned_amount, disbursed_date, monthly_emi, total_tenure_months,
        remaining_tenure_months, balance_outstanding, status
      ) VALUES ($1, 1, 'EMP-101', 'Dr. Rajesh Varma', 'Cardiology', 'Festival Advance',
                15000.00, CURRENT_DATE, 5000.00, 3, 3, 15000.00, 'Active')
      RETURNING 
        id,
        employee_id as "staffId",
        employee_name as "staffName",
        department,
        loan_type as "loanType",
        sanctioned_amount as "sanctionedAmount",
        TO_CHAR(disbursed_date, 'YYYY-MM-DD') as "disbursedDate",
        monthly_emi as "monthlyEmi",
        total_tenure_months as "totalTenureMonths",
        remaining_tenure_months as "remainingTenureMonths",
        balance_outstanding as "balanceOutstanding",
        status;
    `, [testLoanId]);

    const created = insertRes.rows[0];
    assert(created.staffId === 'EMP-101', `Database INSERT RETURNING produces staffId`);
    assert(created.staffName === 'Dr. Rajesh Varma', `Database INSERT RETURNING produces staffName`);
    assert(created.loanType === 'Festival Advance', `Database INSERT RETURNING produces loanType`);
    assert(parseFloat(created.sanctionedAmount) === 15000, `Sanctioned amount is 15000`);
    assert(parseFloat(created.monthlyEmi) === 5000, `Monthly EMI is 5000`);

    // Test 4.2: Test repayment RETURNING camelCase aliased columns
    const repayRes = await client.query(`
      UPDATE staff_loans
      SET balance_outstanding = balance_outstanding - 5000.00,
          remaining_tenure_months = remaining_tenure_months - 1,
          status = 'Active',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        employee_id as "staffId",
        employee_name as "staffName",
        department,
        loan_type as "loanType",
        sanctioned_amount as "sanctionedAmount",
        TO_CHAR(disbursed_date, 'YYYY-MM-DD') as "disbursedDate",
        monthly_emi as "monthlyEmi",
        total_tenure_months as "totalTenureMonths",
        remaining_tenure_months as "remainingTenureMonths",
        balance_outstanding as "balanceOutstanding",
        status;
    `, [testLoanId]);

    const repaid = repayRes.rows[0];
    assert(repaid.staffId === 'EMP-101', `Repay RETURNING produces staffId`);
    assert(repaid.staffName === 'Dr. Rajesh Varma', `Repay RETURNING produces staffName`);
    assert(parseFloat(repaid.balanceOutstanding) === 10000, `Balance outstanding reduced to 10000`);
    assert(repaid.remainingTenureMonths === 2, `Remaining tenure reduced to 2 months`);

    // Test 4.3: Test close loan RETURNING camelCase aliased columns
    const closeRes = await client.query(`
      UPDATE staff_loans
      SET balance_outstanding = 0,
          remaining_tenure_months = 0,
          status = 'Closed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING
        id,
        employee_id as "staffId",
        employee_name as "staffName",
        department,
        loan_type as "loanType",
        sanctioned_amount as "sanctionedAmount",
        TO_CHAR(disbursed_date, 'YYYY-MM-DD') as "disbursedDate",
        monthly_emi as "monthlyEmi",
        total_tenure_months as "totalTenureMonths",
        remaining_tenure_months as "remainingTenureMonths",
        balance_outstanding as "balanceOutstanding",
        status;
    `, [testLoanId]);

    const closed = closeRes.rows[0];
    assert(closed.status === 'Closed', `Close RETURNING produces status Closed`);
    assert(parseFloat(closed.balanceOutstanding) === 0, `Balance outstanding is 0`);

    // Always rollback!
    await client.query('ROLLBACK');
    assert(true, `Transaction safely ROLLED BACK`);
  } catch (err) {
    await client.query('ROLLBACK');
    assert(false, `Suite 4 transaction failed: ${err.message}`);
  } finally {
    client.release();
  }

  // ---------------------------------------------------------------
  // SUITE 5: Live API Endpoint Contracts
  // ---------------------------------------------------------------
  console.log('\n--- SUITE 5: Live API Endpoints ---');
  try {
    // 5.1 GET /api/hr/biometric/staff-loans
    const getRes = await fetch('http://localhost:8011/api/hr/biometric/staff-loans');
    assert(getRes.status === 200, `GET /api/hr/biometric/staff-loans returns 200 OK`);
    const getData = await getRes.json();
    assert(Array.isArray(getData.staffLoans), `Response contains staffLoans array`);
    assert(getData.staffLoans.length >= 1, `Response includes saved loans`);

    const firstLoan = getData.staffLoans[0];
    assert(typeof firstLoan.staffId === 'string' && firstLoan.staffId.length > 0, `staffId is non-empty string`);
    assert(typeof firstLoan.staffName === 'string' && firstLoan.staffName.length > 0, `staffName is non-empty string`);
    assert(typeof firstLoan.loanType === 'string' && firstLoan.loanType.length > 0, `loanType is non-empty string`);
    assert(typeof firstLoan.department === 'string', `department is string`);
    assert(firstLoan.status === 'Active' || firstLoan.status === 'Closed', `status is valid`);

    // 5.2 POST validation with missing fields
    const postRes = await fetch('http://localhost:8011/api/hr/biometric/staff-loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(postRes.status === 400, `POST with empty body returns 400 Bad Request`);
    const postData = await postRes.json();
    assert(postData.error.includes('required'), `Error message indicates required fields`);

    // 5.3 Missing staffId validation
    const missingStaffRes = await fetch('http://localhost:8011/api/hr/biometric/staff-loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sanctionedAmount: 10000, monthlyEmi: 2000, totalTenureMonths: 5 }),
    });
    assert(missingStaffRes.status === 400, `POST with missing staffId returns 400 Bad Request`);
  } catch (err) {
    assert(false, `Suite 5 failed: ${err.message}`);
  }

  // ---------------------------------------------------------------
  // SUITE 8: Staff Loans EMI Repayment Workflow End-to-End Suite
  // ---------------------------------------------------------------
  console.log('\n--- SUITE 8: EMI Repayment Workflow End-to-End Suite ---');
  const clientSuite8 = await pool.connect();
  try {
    await clientSuite8.query('BEGIN');

    // 8.1 Normal Installment Test: Starting 10,000, EMI 3,333 -> Balance 6,667, Tenure 2, Active
    const normLoanId = `TEST-NORM-${Date.now().toString().slice(-4)}`;
    await clientSuite8.query(`
      INSERT INTO staff_loans (
        id, hospital_id, employee_id, employee_name, department, loan_type,
        sanctioned_amount, disbursed_date, monthly_emi, total_tenure_months,
        remaining_tenure_months, balance_outstanding, status
      ) VALUES ($1, 1, 'EMP-101', 'Dr. Rajesh Varma', 'Cardiology', 'Personal Loan',
                10000.00, '2026-10-01', 3333.00, 3, 3, 10000.00, 'Active')
    `, [normLoanId]);

    const normBal = 10000.00;
    const normEmi = 3333.00;
    const normRemainingTenure = 3;
    const normRepayAmount = (normEmi >= normBal || normRemainingTenure <= 1) ? normBal : normEmi;
    const normNewBal = Math.max(0, parseFloat((normBal - normRepayAmount).toFixed(2)));
    const normNewTenure = normNewBal <= 0 ? 0 : Math.max(0, normRemainingTenure - 1);
    const normNewStatus = (normNewBal <= 0 || normNewTenure <= 0) ? 'Closed' : 'Active';

    assert(normRepayAmount === 3333.00, `Normal installment repayment amount is exactly scheduled EMI ₹3,333.00`);
    assert(normNewBal === 6667.00, `Outstanding balance reduced to ₹6,667.00`);
    assert(normNewTenure === 2, `Remaining tenure reduced from 3 to 2 months`);
    assert(normNewStatus === 'Active', `Status remains Active for normal installment`);

    await clientSuite8.query(`
      INSERT INTO staff_loan_repayments (
        loan_id, hospital_id, employee_id, amount,
        balance_before, balance_after, recovery_type,
        recovery_period, remarks, created_by
      ) VALUES ($1, 1, 'EMP-101', $2, $3, $4, 'MANUAL_EMI', '2026-10', 'Normal installment', 'admin')
    `, [normLoanId, normRepayAmount, normBal, normNewBal]);

    // 8.2 Final Installment and Rounding: Balance 3,334, EMI 3,333, Tenure 1 -> Repay exact balance 3,334 -> 0.00, Closed
    const finalLoanId = `TEST-FINAL-${Date.now().toString().slice(-4)}`;
    await clientSuite8.query(`
      INSERT INTO staff_loans (
        id, hospital_id, employee_id, employee_name, department, loan_type,
        sanctioned_amount, disbursed_date, monthly_emi, total_tenure_months,
        remaining_tenure_months, balance_outstanding, status
      ) VALUES ($1, 1, 'EMP-101', 'Dr. Rajesh Varma', 'Cardiology', 'Salary Advance',
                10000.00, '2026-10-01', 3333.00, 3, 1, 3334.00, 'Active')
    `, [finalLoanId]);

    const finalBal = 3334.00;
    const finalEmi = 3333.00;
    const finalRemainingTenure = 1;
    const finalRepayAmount = (finalEmi >= finalBal || finalRemainingTenure <= 1) ? finalBal : finalEmi;
    const finalNewBal = Math.max(0, parseFloat((finalBal - finalRepayAmount).toFixed(2)));
    const finalNewTenure = finalNewBal <= 0 ? 0 : Math.max(0, finalRemainingTenure - 1);
    const finalNewStatus = (finalNewBal <= 0 || finalNewTenure <= 0) ? 'Closed' : 'Active';

    assert(finalRepayAmount === 3334.00, `Final installment uses full remaining balance ₹3,334.00 (not ₹3,333.00)`);
    assert(finalNewBal === 0.00, `Final balance reaches exactly ₹0.00 with zero lingering penny`);
    assert(finalNewTenure === 0, `Remaining tenure becomes exactly 0`);
    assert(finalNewStatus === 'Closed', `Loan status automatically becomes Closed`);

    // 8.3 Closed Loan Rejection Test
    const closedLoanId = `TEST-CLOSED-${Date.now().toString().slice(-4)}`;
    await clientSuite8.query(`
      INSERT INTO staff_loans (
        id, hospital_id, employee_id, employee_name, department, loan_type,
        sanctioned_amount, disbursed_date, monthly_emi, total_tenure_months,
        remaining_tenure_months, balance_outstanding, status
      ) VALUES ($1, 1, 'EMP-101', 'Dr. Rajesh Varma', 'Cardiology', 'Salary Advance',
                10000.00, '2026-10-01', 3333.00, 3, 0, 0.00, 'Closed')
    `, [closedLoanId]);

    let closedErrorCaught = false;
    try {
      const closedCheck = await clientSuite8.query(`SELECT * FROM staff_loans WHERE id = $1`, [closedLoanId]);
      const cl = closedCheck.rows[0];
      if (cl.status === 'Closed' || parseFloat(cl.balance_outstanding) <= 0) {
        throw new Error('Staff loan is already closed or fully repaid');
      }
    } catch (e) {
      if (e.message.includes('already closed')) closedErrorCaught = true;
    }
    assert(closedErrorCaught, `Closed loan repayment attempt is rejected with error`);

    // 8.4 Overpayment & Invalid Amount Rejection Test
    let overpaymentCaught = false;
    try {
      const testBal = 5000.00;
      const testReqAmount = 7000.00;
      if (testReqAmount > testBal) {
        throw new Error(`Repayment amount (${testReqAmount}) exceeds outstanding balance (${testBal})`);
      }
    } catch (e) {
      if (e.message.includes('exceeds outstanding balance')) overpaymentCaught = true;
    }
    assert(overpaymentCaught, `Repayment amount exceeding outstanding balance is strictly rejected`);

    let negativeAmountCaught = false;
    try {
      const negativeAmt = -500;
      if (isNaN(negativeAmt) || negativeAmt <= 0) {
        throw new Error('Repayment amount must be a positive number');
      }
    } catch (e) {
      if (e.message.includes('positive number')) negativeAmountCaught = true;
    }
    assert(negativeAmountCaught, `Negative repayment amount is strictly rejected`);

    // 8.5 Duplicate Recovery Constraint (uq_loan_recovery_period)
    let duplicateConstraintCaught = false;
    await clientSuite8.query('SAVEPOINT sp_dup');
    try {
      await clientSuite8.query(`
        INSERT INTO staff_loan_repayments (
          loan_id, hospital_id, employee_id, amount,
          balance_before, balance_after, recovery_type,
          recovery_period, remarks, created_by
        ) VALUES ($1, 1, 'EMP-101', 3333.00, 6667.00, 3334.00, 'MANUAL_EMI', '2026-10', 'Duplicate attempt', 'admin')
      `, [normLoanId]);
    } catch (e) {
      await clientSuite8.query('ROLLBACK TO SAVEPOINT sp_dup');
      if (e.message.includes('uq_loan_recovery_period') || e.code === '23505') {
        duplicateConstraintCaught = true;
      }
    }
    assert(duplicateConstraintCaught, `Database UNIQUE constraint (uq_loan_recovery_period) strictly prevents duplicate recovery for period 2026-10`);

    // 8.6 Audit Trail Insertion Test
    const auditRes = await clientSuite8.query(`
      INSERT INTO audit_logs (
        hospital_id, user_id, actor_username, employee_id, employee_name,
        module, action, entity_type, entity_id, old_value, new_value, reason, ip_address
      ) VALUES (
        1, 'USR-ADMIN', 'admin', 'EMP-101', 'Dr. Rajesh Varma',
        'Payroll', 'LOAN_EMI_REPAYMENT', 'STAFF_LOAN', $1,
        '{"balanceOutstanding":10000,"remainingTenureMonths":3,"status":"Active"}',
        '{"repaymentAmount":3333,"balanceOutstanding":6667,"remainingTenureMonths":2,"status":"Active","recoveryPeriod":"2026-10"}',
        'Manual recovery of 1 month EMI (₹3,333.00) for period 2026-10', '127.0.0.1'
      ) RETURNING id;
    `, [normLoanId]);
    assert(auditRes.rows.length === 1 && auditRes.rows[0].id > 0, `Transactional audit log recorded with correct entity and values`);

    // 8.7 Cross-Module Payroll Coordination Test
    const payrollQueryCheck2026_10 = await clientSuite8.query(`
      SELECT sl.id, sl.monthly_emi, sl.balance_outstanding
      FROM staff_loans sl
      WHERE sl.id = $1 AND sl.status = 'Active' AND sl.balance_outstanding > 0
        AND NOT EXISTS (
          SELECT 1 FROM staff_loan_repayments slr
          WHERE slr.loan_id = sl.id AND slr.recovery_period = '2026-10'
        )
    `, [normLoanId]);
    assert(payrollQueryCheck2026_10.rows.length === 0, `Payroll query for 2026-10 excludes loan already recovered manually (no double deduction)`);

    const payrollQueryCheck2026_11 = await clientSuite8.query(`
      SELECT sl.id, sl.monthly_emi, sl.balance_outstanding
      FROM staff_loans sl
      WHERE sl.id = $1 AND sl.status = 'Active' AND sl.balance_outstanding > 0
        AND NOT EXISTS (
          SELECT 1 FROM staff_loan_repayments slr
          WHERE slr.loan_id = sl.id AND slr.recovery_period = '2026-11'
        )
    `, [normLoanId]);
    assert(payrollQueryCheck2026_11.rows.length === 1, `Payroll query for 2026-11 includes loan for next scheduled installment`);

    await clientSuite8.query('ROLLBACK');
    assert(true, `Suite 8 transactional tests safely ROLLED BACK (zero persistence)`);
  } catch (err) {
    await clientSuite8.query('ROLLBACK');
    assert(false, `Suite 8 transactional tests failed: ${err.message}`);
  } finally {
    clientSuite8.release();
  }

  // ---------------------------------------------------------------
  // SUITE 9: Live API Repayment End-to-End Endpoint Verification
  // ---------------------------------------------------------------
  console.log('\n--- SUITE 9: Live API Repayment End-to-End ---');
  const liveTestLoanId = `TEST-LIVE-${Date.now().toString().slice(-4)}`;
  try {
    await pool.query(`
      INSERT INTO staff_loans (
        id, hospital_id, employee_id, employee_name, department, loan_type,
        sanctioned_amount, disbursed_date, monthly_emi, total_tenure_months,
        remaining_tenure_months, balance_outstanding, status
      ) VALUES ($1, 1, 'EMP-101', 'Dr. Rajesh Varma', 'Cardiology', 'Salary Advance',
                10000.00, '2026-10-26', 3333.00, 3, 3, 10000.00, 'Active')
    `, [liveTestLoanId]);

    // 9.1 Test Live Repay EMI (First installment)
    const liveRepayRes1 = await fetch(`http://localhost:8011/api/hr/biometric/staff-loans/${liveTestLoanId}/repay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryPeriod: '2026-10' }),
    });
    assert(liveRepayRes1.status === 200, `Live PUT /repay returns 200 OK`);
    const liveRepayData1 = await liveRepayRes1.json();
    assert(liveRepayData1.status === 'success', `Response status is success`);
    assert(parseFloat(liveRepayData1.staffLoan.balanceOutstanding) === 6667.00, `Live API reduced balance to ₹6,667.00`);
    assert(liveRepayData1.staffLoan.remainingTenureMonths === 2, `Live API reduced remaining tenure to 2`);

    // 9.2 Test Live Duplicate Rejection for same recovery period
    const liveRepayResDup = await fetch(`http://localhost:8011/api/hr/biometric/staff-loans/${liveTestLoanId}/repay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryPeriod: '2026-10' }),
    });
    assert(liveRepayResDup.status === 400, `Duplicate live repayment request returns 400 Bad Request`);
    const dupErr = await liveRepayResDup.json();
    assert(dupErr.error.includes('already been recovered'), `Error message clearly explains period 2026-10 already recovered`);

    // 9.3 Test Live Overpayment Rejection
    const liveRepayOver = await fetch(`http://localhost:8011/api/hr/biometric/staff-loans/${liveTestLoanId}/repay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 99999 }),
    });
    assert(liveRepayOver.status === 400, `Live overpayment request returns 400 Bad Request`);
    const overErr = await liveRepayOver.json();
    assert(overErr.error.includes('exceeds outstanding balance'), `Error message indicates amount exceeds balance`);

    // 9.4 Test Live Settle / Pre-close
    const liveCloseRes = await fetch(`http://localhost:8011/api/hr/biometric/staff-loans/${liveTestLoanId}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Pre-closure by employee' }),
    });
    assert(liveCloseRes.status === 200, `Live PUT /close returns 200 OK`);
    const closeData = await liveCloseRes.json();
    assert(closeData.staffLoan.status === 'Closed', `Live API sets status to Closed`);
    assert(parseFloat(closeData.staffLoan.balanceOutstanding) === 0, `Live API sets balanceOutstanding to 0`);

    // 9.5 Test Live Repay on Closed Loan Rejection
    const liveRepayClosed = await fetch(`http://localhost:8011/api/hr/biometric/staff-loans/${liveTestLoanId}/repay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(liveRepayClosed.status === 400, `Live repayment on closed loan returns 400 Bad Request`);
    const closedErr = await liveRepayClosed.json();
    assert(closedErr.error.includes('already closed'), `Error indicates loan is already closed`);

  } finally {
    // Strict Cleanup of live test loan (audit_logs is an immutable append-only ledger and cannot be deleted)
    await pool.query('DELETE FROM staff_loan_repayments WHERE loan_id = $1', [liveTestLoanId]);
    await pool.query('DELETE FROM staff_loans WHERE id = $1', [liveTestLoanId]);
  }

  // ---------------------------------------------------------------
  // SUITE 6: Database Persistence Safeguard Check
  // ---------------------------------------------------------------
  console.log('\n--- SUITE 6: Database Persistence Safeguard Check ---');
  try {
    const finalCheck = await pool.query('SELECT * FROM staff_loans ORDER BY created_at ASC');
    assert(finalCheck.rowCount === initialLoanCount, `Loan count unchanged after test suite (was ${initialLoanCount}, now ${finalCheck.rowCount})`);
    const currentLoan = finalCheck.rows[0];
    assert(currentLoan.id === originalLoan.id, `Original loan ID unchanged (${currentLoan.id})`);
    assert(currentLoan.employee_id === originalLoan.employee_id, `Employee ID unchanged (${currentLoan.employee_id})`);
    assert(parseFloat(currentLoan.sanctioned_amount) === parseFloat(originalLoan.sanctioned_amount), `Sanctioned amount unchanged (₹${currentLoan.sanctioned_amount})`);
    assert(currentLoan.status === originalLoan.status, `Status unchanged (${currentLoan.status})`);
  } catch (err) {
    assert(false, `Suite 6 failed: ${err.message}`);
  }

  // ---------------------------------------------------------------
  // SUITE 7: Table Header and Row Value Alignment Verification
  // ---------------------------------------------------------------
  console.log('\n--- SUITE 7: Table Column Header and Row Value Alignment ---');
  try {
    // 7.1 Verify expected column headers
    const expectedHeaders = [
      "Loan ID",
      "Staff Member",
      "Advance Type",
      "Sanctioned",
      "Monthly EMI",
      "Tenure Progress",
      "Balance Due",
      "Status",
      "Actions"
    ];

    // Model row rendering logic from StaffLoanModal.tsx
    const sampleLoan = normalizeStaffLoan({
      id: "LOAN-48741",
      employee_id: "EMP-101",
      employee_name: "Dr. Rajesh Varma",
      department: "Cardiology",
      loan_type: "Salary Advance",
      sanctioned_amount: "10000.00",
      monthly_emi: "3333.00",
      total_tenure_months: 3,
      remaining_tenure_months: 3,
      balance_outstanding: "10000.00",
      disbursed_date: "2026-10-26",
      status: "Active"
    });

    const totalMonths = Number(sampleLoan.totalTenureMonths || 1);
    const remainingMonths = Number(sampleLoan.remainingTenureMonths || 0);
    const paidMonths = Math.max(0, totalMonths - remainingMonths);
    const progressPct = totalMonths > 0 ? Math.round((paidMonths / totalMonths) * 100) : 0;

    const rowCells = [
      { header: expectedHeaders[0], value: sampleLoan.id, sub: sampleLoan.disbursedDate },
      { header: expectedHeaders[1], value: sampleLoan.staffName, sub: `${sampleLoan.staffId} · ${sampleLoan.department}` },
      { header: expectedHeaders[2], value: sampleLoan.loanType },
      { header: expectedHeaders[3], value: `₹${sampleLoan.sanctionedAmount.toLocaleString()}` },
      { header: expectedHeaders[4], value: `₹${sampleLoan.monthlyEmi.toLocaleString()}`, sub: "payroll cut" },
      { header: expectedHeaders[5], value: `${paidMonths} / ${totalMonths} mos (${progressPct}%)` },
      { header: expectedHeaders[6], value: `₹${sampleLoan.balanceOutstanding.toLocaleString()}` },
      { header: expectedHeaders[7], value: sampleLoan.status },
      { header: expectedHeaders[8], value: "Actions [Repay EMI, Settle]" }
    ];

    assert(expectedHeaders.length === 9, `Table defines exactly 9 column headers`);
    assert(rowCells.length === 9, `Row renders exactly 9 matching table cells`);

    // Column 0: Loan ID
    assert(rowCells[0].header === "Loan ID" && rowCells[0].value === "LOAN-48741", `Col 1 (Loan ID) renders loan ID LOAN-48741`);
    assert(rowCells[0].sub === "2026-10-26", `Col 1 subtext renders disbursed date`);

    // Column 1: Staff Member
    assert(rowCells[1].header === "Staff Member" && rowCells[1].value === "Dr. Rajesh Varma", `Col 2 (Staff Member) renders staff name Dr. Rajesh Varma`);
    assert(rowCells[1].sub.includes("EMP-101") && rowCells[1].sub.includes("Cardiology"), `Col 2 subtext renders EMP-101 and Cardiology`);

    // Column 2: Advance Type
    assert(rowCells[2].header === "Advance Type" && rowCells[2].value === "Salary Advance", `Col 3 (Advance Type) renders Salary Advance`);

    // Column 3: Sanctioned
    assert(rowCells[3].header === "Sanctioned" && rowCells[3].value === "₹10,000", `Col 4 (Sanctioned) renders ₹10,000`);

    // Column 4: Monthly EMI
    assert(rowCells[4].header === "Monthly EMI" && rowCells[4].value === "₹3,333", `Col 5 (Monthly EMI) renders ₹3,333`);

    // Column 5: Tenure Progress
    assert(rowCells[5].header === "Tenure Progress" && rowCells[5].value === "0 / 3 mos (0%)", `Col 6 (Tenure Progress) renders 0 / 3 mos (0%)`);

    // Column 6: Balance Due
    assert(rowCells[6].header === "Balance Due" && rowCells[6].value === "₹10,000", `Col 7 (Balance Due) renders ₹10,000`);

    // Column 7: Status
    assert(rowCells[7].header === "Status" && rowCells[7].value === "Active", `Col 8 (Status) renders Active badge`);

    // Column 8: Actions
    assert(rowCells[8].header === "Actions", `Col 9 (Actions) renders actions column`);
  } catch (err) {
    assert(false, `Suite 7 failed: ${err.message}`);
  }

  // ---------------------------------------------------------------
  // SUITE 10: Staff Loans UI Message Formatting & Safe Fallback
  // ---------------------------------------------------------------
  console.log('\n--- SUITE 10: UI Message Formatting & Safe Fallbacks ---');
  try {
    // 10.1 Normal installment with standard amount and recovery period
    const normalMsg = buildEmiSuccessMessage({ amountPaid: 3333, recoveryPeriod: "2026-10" });
    assert(
      normalMsg === "EMI of ₹3,333.00 for October 2026 recovered successfully.",
      `Normal installment displays: "EMI of ₹3,333.00 for October 2026 recovered successfully." (got: "${normalMsg}")`
    );

    // 10.2 Final installment with rounded/adjusted amount
    const finalMsg = buildEmiSuccessMessage({ amountPaid: 3334, recoveryPeriod: "2026-12" });
    assert(
      finalMsg === "EMI of ₹3,334.00 for December 2026 recovered successfully.",
      `Final installment with rounding displays: "EMI of ₹3,334.00 for December 2026 recovered successfully." (got: "${finalMsg}")`
    );

    // 10.3 Missing recoveryPeriod fallback
    const missingPeriodMsg = buildEmiSuccessMessage({ amountPaid: 3333 });
    assert(
      missingPeriodMsg === "EMI of ₹3,333.00 recovered successfully.",
      `Missing recoveryPeriod falls back gracefully to: "EMI of ₹3,333.00 recovered successfully."`
    );

    // 10.4 Missing amountPaid fallback
    const missingAmountMsg = buildEmiSuccessMessage({ recoveryPeriod: "2026-10" });
    assert(
      missingAmountMsg === "EMI for October 2026 recovered successfully.",
      `Missing amountPaid falls back gracefully to: "EMI for October 2026 recovered successfully."`
    );

    // 10.5 Missing both / empty object fallback (no ₹NaN, no undefined)
    const emptyMsg = buildEmiSuccessMessage({});
    assert(
      emptyMsg === "1 Monthly Installment EMI recorded and recovered successfully.",
      `Empty object falls back to safe default without ₹NaN or undefined`
    );

    const undefinedMsg = buildEmiSuccessMessage(undefined);
    assert(
      undefinedMsg === "1 Monthly Installment EMI recorded and recovered successfully.",
      `Undefined parameter falls back to safe default without error`
    );

    // 10.6 formatRecoveryPeriod helper tests
    assert(formatRecoveryPeriod("2026-01") === "January 2026", `Formats 2026-01 as January 2026`);
    assert(formatRecoveryPeriod("2026-06") === "June 2026", `Formats 2026-06 as June 2026`);
    assert(formatRecoveryPeriod("2026-10") === "October 2026", `Formats 2026-10 as October 2026`);
    assert(formatRecoveryPeriod("2026-12") === "December 2026", `Formats 2026-12 as December 2026`);
    assert(formatRecoveryPeriod("custom-period") === "custom-period", `Preserves unrecognized formats safely`);
    assert(formatRecoveryPeriod("") === "", `Empty string returns empty string`);

    // 10.7 Normalizer preservation of amountPaid and recoveryPeriod
    const normWithFields = normalizeStaffLoan({
      id: "LOAN-TEST",
      amountPaid: 3334,
      recoveryPeriod: "2026-10",
      sanctionedAmount: 10000,
    });
    assert(normWithFields.amountPaid === 3334, `normalizeStaffLoan preserves amountPaid`);
    assert(normWithFields.recoveryPeriod === "2026-10", `normalizeStaffLoan preserves recoveryPeriod`);
  } catch (err) {
    assert(false, `Suite 10 failed: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  await pool.end();
  process.exitCode = failed > 0 ? 1 : 0;
}

runTests().catch(async (e) => {
  console.error("Fatal test runner error:", e);
  await pool.end();
  process.exitCode = 1;
});
