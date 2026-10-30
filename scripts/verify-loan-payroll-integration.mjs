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

async function runVerification() {
  console.log('================================================================');
  console.log('   Read-Only Verification: Staff Loan & Payroll Integration     ');
  console.log('================================================================\n');

  // ------------------------------------------------------------------
  // 1. ACTUAL DATABASE OBSERVATIONS: Target Records & Schema Verification
  // ------------------------------------------------------------------
  console.log('--- 1. Actual Database Observations: Target Records ---');

  // 1.1 Check Loan LOAN-48741
  const loanRes = await pool.query(`SELECT * FROM staff_loans WHERE id = 'LOAN-48741'`);
  assert(loanRes.rows.length === 1, 'Loan LOAN-48741 exists in staff_loans');
  const loan = loanRes.rows[0];
  console.log('  [Actual DB] Loan Record:', {
    id: loan.id,
    employee_id: loan.employee_id,
    sanctioned_amount: loan.sanctioned_amount,
    balance_outstanding: loan.balance_outstanding,
    monthly_emi: loan.monthly_emi,
    remaining_tenure_months: loan.remaining_tenure_months,
    status: loan.status,
  });

  assert(loan.employee_id === 'EMP-101', 'Loan belongs to employee EMP-101');
  assert(parseFloat(loan.sanctioned_amount) === 10000.00, 'Sanctioned amount is exactly ₹10,000.00');
  assert(parseFloat(loan.balance_outstanding) === 10000.00, 'Outstanding balance is exactly ₹10,000.00');
  assert(parseFloat(loan.monthly_emi) === 3333.00, 'Monthly EMI is exactly ₹3,333.00');
  assert(parseInt(loan.remaining_tenure_months, 10) === 3, 'Remaining tenure is exactly 3 months');
  assert(loan.status === 'Active', 'Loan status is Active');

  // 1.2 Check staff_loan_repayments for LOAN-48741
  const repRes = await pool.query(`SELECT * FROM staff_loan_repayments WHERE loan_id = 'LOAN-48741'`);
  console.log(`  [Actual DB] Committed repayments for LOAN-48741: ${repRes.rows.length} rows`);
  assert(repRes.rows.length === 0, 'Recovery ledger contains zero committed repayments for LOAN-48741');

  // 1.3 Check Table Schema & Constraint for staff_loan_repayments
  const tableCheck = await pool.query(`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'staff_loan_repayments'
  `);
  assert(tableCheck.rows.length === 1, 'Table staff_loan_repayments exists in running PostgreSQL');

  const constraintCheck = await pool.query(`
    SELECT constraint_name FROM information_schema.table_constraints 
    WHERE table_name = 'staff_loan_repayments' AND constraint_name = 'uq_loan_recovery_period'
  `);
  assert(constraintCheck.rows.length === 1, 'Unique constraint uq_loan_recovery_period exists in PostgreSQL');

  // 1.4 Check Existing October 2026 Payroll Record (PR-2026-OCT)
  const runRes = await pool.query(`SELECT * FROM payroll_runs WHERE id = 'PR-2026-OCT'`);
  assert(runRes.rows.length === 1, 'Payroll run PR-2026-OCT exists in database');
  const octRun = runRes.rows[0];
  console.log('  [Actual DB] October Payroll Run:', {
    id: octRun.id,
    month: octRun.month,
    year: octRun.year,
    status: octRun.status,
    total_staff: octRun.total_staff,
    total_gross: octRun.total_gross,
    total_deductions: octRun.total_deductions,
    total_disbursed: octRun.total_disbursed,
  });

  const itemRes = await pool.query(`
    SELECT * FROM payroll_items WHERE payroll_run_id = 'PR-2026-OCT' AND employee_id = 'EMP-101'
  `);
  assert(itemRes.rows.length === 1, 'Payroll item for EMP-101 exists in October 2026 payroll');
  const octItem = itemRes.rows[0];
  console.log('  [Actual DB] EMP-101 October Payroll Item:', {
    employee_id: octItem.employee_id,
    staff_name: octItem.staff_name,
    gross: octItem.gross,
    pf: octItem.pf,
    tax: octItem.tax,
    professional_tax: octItem.professional_tax,
    other_deductions: octItem.other_deductions,
    total_deductions: octItem.total_deductions,
    net_pay: octItem.net_pay,
    status: octItem.status,
  });

  // ------------------------------------------------------------------
  // 2. TRANSACTIONAL VERIFICATION (STRICT ROLLBACK)
  // ------------------------------------------------------------------
  console.log('\n--- 2. Transactional Integration Invariants (Strict Rollback) ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // TEST 1: Payroll calculation query for October 2026 when loan has NO prior recovery for 2026-10
    // Query exactly matches server/routes/payroll.mjs lines 374-386
    const calcQueryNoPriorRecovery = await client.query(`
      SELECT sl.id, sl.monthly_emi, sl.balance_outstanding, sl.remaining_tenure_months
      FROM staff_loans sl
      WHERE sl.employee_id = $1 AND sl.status = 'Active' AND sl.balance_outstanding > 0
        AND NOT EXISTS (
          SELECT 1 FROM staff_loan_repayments slr 
          WHERE slr.loan_id = sl.id AND slr.recovery_period = $2
        )
    `, ['EMP-101', '2026-10']);

    assert(calcQueryNoPriorRecovery.rows.length === 1, 'Query finds 1 active loan eligible for deduction in October 2026');
    const eligibleLoan = calcQueryNoPriorRecovery.rows[0];
    const bal = parseFloat(eligibleLoan.balance_outstanding);
    const emi = parseFloat(eligibleLoan.monthly_emi);
    const tenure = parseInt(eligibleLoan.remaining_tenure_months, 10);
    const calculatedDeduct = (emi >= bal || tenure <= 1) ? bal : emi;

    assert(calculatedDeduct === 3333.00, `Calculated loan EMI deduction is exactly ₹3,333.00 (got: ${calculatedDeduct})`);

    // TEST 2: If manual recovery is recorded for October, payroll calculation excludes that installment
    // Simulate manual recovery recorded for 2026-10
    await client.query(`
      INSERT INTO staff_loan_repayments (
        loan_id, hospital_id, employee_id, amount,
        balance_before, balance_after, recovery_type,
        recovery_period, remarks, created_by
      ) VALUES ($1, 1, 'EMP-101', 3333.00, 10000.00, 6667.00, 'MANUAL_EMI', '2026-10', 'Simulated manual EMI', 'admin')
    `, ['LOAN-48741']);

    const calcQueryAfterManualRecovery = await client.query(`
      SELECT sl.id, sl.monthly_emi, sl.balance_outstanding, sl.remaining_tenure_months
      FROM staff_loans sl
      WHERE sl.employee_id = $1 AND sl.status = 'Active' AND sl.balance_outstanding > 0
        AND NOT EXISTS (
          SELECT 1 FROM staff_loan_repayments slr 
          WHERE slr.loan_id = sl.id AND slr.recovery_period = $2
        )
    `, ['EMP-101', '2026-10']);

    assert(calcQueryAfterManualRecovery.rows.length === 0, 'Payroll query for 2026-10 returns 0 eligible loans after manual recovery is recorded (EXCLUDED)');

    // Verify next month (2026-11) is NOT excluded
    const calcQueryNextMonth = await client.query(`
      SELECT sl.id, sl.monthly_emi, sl.balance_outstanding, sl.remaining_tenure_months
      FROM staff_loans sl
      WHERE sl.employee_id = $1 AND sl.status = 'Active' AND sl.balance_outstanding > 0
        AND NOT EXISTS (
          SELECT 1 FROM staff_loan_repayments slr 
          WHERE slr.loan_id = sl.id AND slr.recovery_period = $2
        )
    `, ['EMP-101', '2026-11']);
    assert(calcQueryNextMonth.rows.length === 1, 'Payroll query for 2026-11 includes the loan for the next month');

    // TEST 3: If payroll has already recovered the October installment, manual recovery is rejected
    // Check duplicate check query from biometric.mjs lines 846-857
    const dupCheck = await client.query(`
      SELECT id, recovery_type, recovery_period, payroll_run_id 
      FROM staff_loan_repayments 
      WHERE loan_id = $1 AND recovery_period = $2
    `, ['LOAN-48741', '2026-10']);
    assert(dupCheck.rows.length > 0, 'Duplicate check query detects existing 2026-10 recovery');

    // Also test database unique constraint rejection
    let constraintRejection = false;
    await client.query('SAVEPOINT sp_dup_test');
    try {
      await client.query(`
        INSERT INTO staff_loan_repayments (
          loan_id, hospital_id, employee_id, amount,
          balance_before, balance_after, recovery_type,
          recovery_period, remarks, created_by
        ) VALUES ($1, 1, 'EMP-101', 3333.00, 6667.00, 3334.00, 'MANUAL_EMI', '2026-10', 'Second recovery attempt', 'admin')
      `, ['LOAN-48741']);
    } catch (e) {
      await client.query('ROLLBACK TO SAVEPOINT sp_dup_test');
      if (e.message.includes('uq_loan_recovery_period') || e.code === '23505') {
        constraintRejection = true;
      }
    }
    assert(constraintRejection, 'Database constraint uq_loan_recovery_period rejects duplicate recovery for period 2026-10');

    // Always rollback!
    await client.query('ROLLBACK');
    console.log('  ℹ️ Verification transaction safely ROLLED BACK.');
  } catch (err) {
    await client.query('ROLLBACK');
    assert(false, `Transactional verification failed: ${err.message}`);
  } finally {
    client.release();
  }

  // ------------------------------------------------------------------
  // 3. POST-VERIFICATION AUDIT: Ensure Database Was Untouched
  // ------------------------------------------------------------------
  console.log('\n--- 3. Post-Verification Integrity Check ---');
  const postLoanRes = await pool.query(`SELECT * FROM staff_loans WHERE id = 'LOAN-48741'`);
  const postLoan = postLoanRes.rows[0];
  assert(parseFloat(postLoan.balance_outstanding) === 10000.00, 'Loan LOAN-48741 balance remains ₹10,000.00');
  assert(parseInt(postLoan.remaining_tenure_months, 10) === 3, 'Loan LOAN-48741 remaining tenure remains 3 months');
  assert(postLoan.status === 'Active', 'Loan LOAN-48741 status remains Active');

  const postRepRes = await pool.query(`SELECT * FROM staff_loan_repayments WHERE loan_id = 'LOAN-48741'`);
  assert(postRepRes.rows.length === 0, 'No rows committed to staff_loan_repayments for LOAN-48741');

  const postRunRes = await pool.query(`SELECT * FROM payroll_runs WHERE id = 'PR-2026-OCT'`);
  const postRun = postRunRes.rows[0];
  assert(postRun.status === octRun.status, `October payroll status unchanged (${postRun.status})`);
  assert(parseFloat(postRun.total_gross) === parseFloat(octRun.total_gross), `October payroll gross unchanged (₹${postRun.total_gross})`);
  assert(parseFloat(postRun.total_deductions) === parseFloat(octRun.total_deductions), `October payroll deductions unchanged (₹${postRun.total_deductions})`);
  assert(parseFloat(postRun.total_disbursed) === parseFloat(octRun.total_disbursed), `October payroll net unchanged (₹${postRun.total_disbursed})`);

  console.log('\n================================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  await pool.end();
}

runVerification().catch(async (err) => {
  console.error('Fatal error during verification:', err);
  await pool.end();
  process.exit(1);
});
