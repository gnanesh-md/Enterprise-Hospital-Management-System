import { query } from '../server/db/index.mjs';

async function cleanHrmsData() {
  console.log('[HospAI Clean Slate] Starting cleanup of demo/seed HRMS data...');

  try {
    // Truncate all HRMS transactional and employee tables in correct foreign-key dependency order
    await query(`
      TRUNCATE TABLE 
        attendance_corrections,
        attendance,
        biometric_punches,
        overtime_records,
        staff_loans,
        payroll_items,
        payroll_runs,
        leave_requests,
        employee_credentials,
        salary_structures,
        employee_bank_details,
        shift_assignments,
        employees
      CASCADE;
    `);

    // Reset biometric devices to fresh ready state (zero logs, zero registered users, offline)
    await query(`
      UPDATE biometric_devices 
      SET total_logs_count = 0,
          registered_users_count = 0,
          status = 'offline',
          last_heartbeat = NULL,
          updated_at = CURRENT_TIMESTAMP;
    `);

    console.log('[HospAI Clean Slate] Successfully wiped all demo employees, punches, attendance, rosters, leaves, loans, and payroll!');
    process.exit(0);
  } catch (err) {
    console.error('[HospAI Clean Slate Error]', err);
    process.exit(1);
  }
}

cleanHrmsData();
