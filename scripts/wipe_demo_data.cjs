const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5434, database: 'hospai_enterprise', user: 'postgres', password: 'postgres' });

async function wipe() {
  const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  const allTables = tablesRes.rows.map(r => r.table_name);

  const tablesToWipe = [
    'leave_requests',
    'attendance_corrections',
    'attendance',
    'shift_assignments',
    'payroll_items',
    'payroll_runs',
    'employee_credentials',
    'employee_bank_details',
    'salary_structures',
    'employee_documents',
    'employee_privileges',
    'leave_balances',
    'audit_logs',
    'employees'
  ].filter(t => allTables.includes(t));

  console.log('Tables to wipe:', tablesToWipe);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of tablesToWipe) {
      await client.query(`TRUNCATE TABLE ${t} CASCADE`);
      console.log(`Truncated ${t}`);
    }
    await client.query('COMMIT');
    console.log('✅ ALL DEMO DATA WIPED CLEAN FROM POSTGRESQL');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Wipe error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}
wipe();
