import { query } from '../server/db/index.mjs';

async function main() {
  const run = await query('SELECT * FROM payroll_runs WHERE month ILIKE $1 AND year = $2', ['October', 2026]);
  const item = await query('SELECT * FROM payroll_items WHERE employee_id = $1', ['EMP-101']);
  const loan = await query('SELECT * FROM staff_loans WHERE employee_id = $1', ['EMP-101']);
  const audit = await query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 5');
  console.log('BASELINE RUN:', JSON.stringify(run.rows, null, 2));
  console.log('BASELINE ITEM:', JSON.stringify(item.rows, null, 2));
  console.log('BASELINE LOAN:', JSON.stringify(loan.rows, null, 2));
  console.log('BASELINE AUDIT:', JSON.stringify(audit.rows, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
