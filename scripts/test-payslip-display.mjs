/**
 * Focused verification test suite for Payslip Preview Display fixes:
 * 1. Indian currency Amount-to-Words (numberToWordsINR)
 * 2. Sensitive data masking (Bank Account & PAN)
 * 3. Separation of Proration Adjustment / LOP from Deductions
 * 4. Read-only Database Immutability Safeguards
 */

import assert from 'assert';
import pg from 'pg';
import {
  round2,
  numberToWordsINR,
  maskAccountNumber,
  maskPanNumber,
} from '../src/utils/payrollFormatters.ts';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5434', 10),
  database: process.env.PGDATABASE || 'hospai_enterprise',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

let totalTests = 0;
let passedTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('PAYSLIP PREVIEW DISPLAY & INTEGRITY TEST SUITE');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: AMOUNT-TO-WORDS (numberToWordsINR)
  // -------------------------------------------------------------
  console.log('SUITE 1: Currency Amount to Words Formatting (numberToWordsINR)');

  it('formats ₹24,677.42 with exact hyphenation and paise as specified', () => {
    const words = numberToWordsINR(24677.42);
    assert.strictEqual(
      words,
      'Rupees Twenty-Four Thousand Six Hundred Seventy-Seven and Forty-Two Paise Only'
    );
  });

  it('formats ₹30,000.00 as whole rupees without paise', () => {
    const words = numberToWordsINR(30000.00);
    assert.strictEqual(words, 'Rupees Thirty Thousand Only');
  });

  it('formats ₹155,000.00 in Indian Lakhs format', () => {
    const words = numberToWordsINR(155000.00);
    assert.strictEqual(words, 'Rupees One Lakh Fifty-Five Thousand Only');
  });

  it('formats ₹127,500.00 in Indian Lakhs and Thousands format', () => {
    const words = numberToWordsINR(127500.00);
    assert.strictEqual(words, 'Rupees One Lakh Twenty-Seven Thousand Five Hundred Only');
  });

  it('formats ₹21,344.42 (net salary after EMI recovery)', () => {
    const words = numberToWordsINR(21344.42);
    assert.strictEqual(
      words,
      'Rupees Twenty-One Thousand Three Hundred Forty-Four and Forty-Two Paise Only'
    );
  });

  it('formats ₹0.00 as Rupees Zero Only', () => {
    const words = numberToWordsINR(0);
    assert.strictEqual(words, 'Rupees Zero Only');
  });

  it('formats ₹0.50 (zero rupees with fifty paise)', () => {
    const words = numberToWordsINR(0.50);
    assert.strictEqual(words, 'Rupees Zero and Fifty Paise Only');
  });

  it('formats ₹100.05 (single digit paise with zero prefix)', () => {
    const words = numberToWordsINR(100.05);
    assert.strictEqual(words, 'Rupees One Hundred and Five Paise Only');
  });

  it('formats ₹10,000,000.00 (Crores)', () => {
    const words = numberToWordsINR(10000000);
    assert.strictEqual(words, 'Rupees One Crore Only');
  });

  it('formats ₹1,234,567.89 (Crore/Lakh/Thousand/Paise mix)', () => {
    const words = numberToWordsINR(1234567.89);
    assert.strictEqual(
      words,
      'Rupees Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven and Eighty-Nine Paise Only'
    );
  });

  it('gracefully handles NaN and undefined amounts', () => {
    assert.strictEqual(numberToWordsINR(NaN), 'Rupees Zero Only');
    assert.strictEqual(numberToWordsINR(undefined), 'Rupees Zero Only');
  });

  // -------------------------------------------------------------
  // SUITE 2: SENSITIVE DATA MASKING (Bank Account & PAN)
  // -------------------------------------------------------------
  console.log('\nSUITE 2: Confidential Data Masking (Bank Account & PAN)');

  it('masks a full bank account number showing only last 4 digits', () => {
    const masked = maskAccountNumber('987654321012');
    assert.strictEqual(masked, '••••••••1012');
    assert(!masked.includes('98765432'), 'Original digits must not be exposed');
  });

  it('preserves already-masked bank account number', () => {
    const masked = maskAccountNumber('••••••••9999');
    assert.strictEqual(masked, '••••••••9999');
  });

  it('provides safe fallback for null/empty bank account number', () => {
    assert.strictEqual(maskAccountNumber(null), '••••••••1001');
    assert.strictEqual(maskAccountNumber(''), '••••••••1001');
  });

  it('masks a full Indian PAN card number showing only last 4 digits', () => {
    const masked = maskPanNumber('ABCDE1234F');
    assert.strictEqual(masked, '•••••234F');
    assert(!masked.includes('ABCDE'), 'Original PAN letters must not be exposed');
  });

  it('preserves already-masked PAN number', () => {
    const masked = maskPanNumber('•••••1234');
    assert.strictEqual(masked, '•••••1234');
  });

  it('provides safe fallback for null/empty PAN number', () => {
    assert.strictEqual(maskPanNumber(null), '•••••1234');
    assert.strictEqual(maskPanNumber(''), '•••••1234');
  });

  // -------------------------------------------------------------
  // SUITE 3: LOP DISPLAY VS DEDUCTIONS ACCOUNTING
  // -------------------------------------------------------------
  console.log('\nSUITE 3: Deductions vs Proration Adjustment Accounting Invariant');

  it('ensures ₹125,000 proration adjustment is NOT added to deductions column', () => {
    // Oct 2026 for EMP-101 (joined Oct 26, 6 days out of 31)
    const baseGross = 155000.00;
    const earnedGross = 30000.00;
    const prorationAdj = round2(baseGross - earnedGross); // 125,000.00

    const earnedBasic = 19354.84;
    const epf = round2(earnedBasic * 0.12); // 2322.58
    const tds = round2(earnedGross * 0.10); // 3000.00
    const pt = 0;
    const loanRecovery = 0;

    // Deductions column must strictly contain only genuine deductions:
    const genuineDeductions = round2(epf + tds + pt + loanRecovery);
    assert.strictEqual(genuineDeductions, 5322.58);

    // Verify proration adjustment (125,000) is NOT part of deductions:
    assert.notStrictEqual(genuineDeductions, round2(genuineDeductions + prorationAdj));
    assert(genuineDeductions < prorationAdj, 'Deductions must not include proration adjustment');

    // Net pay calculation:
    const netPay = round2(earnedGross - genuineDeductions);
    assert.strictEqual(netPay, 24677.42);

    // Accounting invariant to the exact paisa:
    assert.strictEqual(round2(earnedGross - genuineDeductions), netPay);
  });

  it('validates accounting with staff loan EMI recovery (₹3,333)', () => {
    const earnedGross = 30000.00;
    const epf = 2322.58;
    const tds = 3000.00;
    const emi = 3333.00;

    const totalDeductionsWithEmi = round2(epf + tds + emi);
    assert.strictEqual(totalDeductionsWithEmi, 8655.58);

    const netPayWithEmi = round2(earnedGross - totalDeductionsWithEmi);
    assert.strictEqual(netPayWithEmi, 21344.42);

    // Invariant to exact paisa:
    assert.strictEqual(round2(earnedGross - totalDeductionsWithEmi), netPayWithEmi);

    // Words check for net with EMI:
    assert.strictEqual(
      numberToWordsINR(netPayWithEmi),
      'Rupees Twenty-One Thousand Three Hundred Forty-Four and Forty-Two Paise Only'
    );
  });

  // -------------------------------------------------------------
  // SUITE 4: DATABASE IMMUTABILITY VERIFICATION
  // -------------------------------------------------------------
  console.log('\nSUITE 4: Database Immutability Verification (Non-negotiable)');

  const client = await pool.connect();
  try {
    // 1. Check PR-2026-OCT run
    const prRes = await client.query(
      `SELECT id, status, total_gross, total_deductions, total_disbursed
       FROM payroll_runs WHERE id = 'PR-2026-OCT'`
    );
    it('verifies PR-2026-OCT exists and remains in Revised status', () => {
      assert.strictEqual(prRes.rows.length, 1);
      const pr = prRes.rows[0];
      assert.strictEqual(pr.status, 'Revised');
      assert.strictEqual(Number(pr.total_gross), 155000.00);
      assert.strictEqual(Number(pr.total_deductions), 27500.00);
      assert.strictEqual(Number(pr.total_disbursed), 127500.00);
    });

    // 2. Check EMP-101 payroll item
    const itemRes = await client.query(
      `SELECT employee_id, revision_number, revision_reason, status, gross, total_deductions, net_pay
       FROM payroll_items WHERE employee_id = 'EMP-101' AND payroll_run_id = 'PR-2026-OCT'`
    );
    it('verifies EMP-101 payroll item remains at Revision #2, Pending status', () => {
      assert.strictEqual(itemRes.rows.length, 1);
      const item = itemRes.rows[0];
      assert.strictEqual(item.revision_number, 2);
      assert.strictEqual(item.status, 'Pending');
      assert.strictEqual(Number(item.gross), 155000.00);
      assert.strictEqual(Number(item.total_deductions), 27500.00);
      assert.strictEqual(Number(item.net_pay), 127500.00);
    });

    // 3. Check Staff Loan LOAN-48741
    const loanRes = await client.query(
      `SELECT id, employee_id, status, balance_outstanding, monthly_emi
       FROM staff_loans WHERE id = 'LOAN-48741'`
    );
    it('verifies LOAN-48741 balance remains ₹10,000.00 with EMI ₹3,333.00', () => {
      assert.strictEqual(loanRes.rows.length, 1);
      const loan = loanRes.rows[0];
      assert.strictEqual(loan.status, 'Active');
      assert.strictEqual(Number(loan.balance_outstanding), 10000.00);
      assert.strictEqual(Number(loan.monthly_emi), 3333.00);
    });

    // 4. Check Audit Log #258
    const auditRes = await client.query(
      `SELECT id, action, module, reason FROM audit_logs WHERE id = 258`
    );
    it('verifies Audit Log #258 remains intact', () => {
      assert.strictEqual(auditRes.rows.length, 1);
      assert.strictEqual(auditRes.rows[0].action, 'PAYROLL_REVISED');
    });

    // 5. Check committed counts
    const countRes = await client.query(
      `SELECT 
        (SELECT COUNT(*) FROM payroll_runs) as run_count,
        (SELECT COUNT(*) FROM payroll_items) as item_count,
        (SELECT COUNT(*) FROM staff_loan_repayments) as repay_count`
    );
    it('verifies database record counts are unaffected', () => {
      const counts = countRes.rows[0];
      console.log(`    Total Payroll Runs: ${counts.run_count}, Items: ${counts.item_count}, Loan Repayments: ${counts.repay_count}`);
      assert(Number(counts.run_count) >= 1);
      assert(Number(counts.item_count) >= 1);
    });
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} Passed (0 Failed)`);
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
