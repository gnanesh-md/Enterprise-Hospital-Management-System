const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 5434, database: 'hospai_enterprise', user: 'postgres', password: 'postgres' });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Update attendance table
    await client.query(`
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_start_time VARCHAR(20) DEFAULT '07:00';
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS shift_end_time VARCHAR(20) DEFAULT '15:00';
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS early_exit_minutes INTEGER DEFAULT 0;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS remarks TEXT;
      ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_attendance_status_check;
      ALTER TABLE attendance ADD CONSTRAINT attendance_attendance_status_check 
        CHECK (attendance_status::text = ANY (ARRAY['Present', 'Late', 'Absent', 'Half Day', 'Half-Day', 'Weekly Off', 'Holiday', 'On Leave', 'Missed Punch']));
    `);
    console.log('✅ Attendance table updated');

    // 2. Update payroll_items & payroll_runs
    await client.query(`
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS paid_leave_days NUMERIC(4,1) DEFAULT 0;
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS unpaid_leave_days NUMERIC(4,1) DEFAULT 0;
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS absent_days NUMERIC(4,1) DEFAULT 0;
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(5,2) DEFAULT 0;
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS overtime_amount NUMERIC(12,2) DEFAULT 0;
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS leave_deductions NUMERIC(12,2) DEFAULT 0;
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS attendance_summary JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1;
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS revision_reason TEXT;
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(100);
      ALTER TABLE payroll_items ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);

      ALTER TABLE payroll_runs DROP CONSTRAINT IF EXISTS payroll_runs_status_check;
      ALTER TABLE payroll_runs ADD CONSTRAINT payroll_runs_status_check
        CHECK (status::text = ANY (ARRAY['Draft', 'Calculated', 'Reviewed', 'Approved', 'Paid', 'Locked', 'Revised']));
    `);
    console.log('✅ Payroll tables updated');

    // 3. Update employees & create lifecycle tables
    await client.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS resignation_date DATE;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_working_date DATE;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS exit_reason TEXT;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS exit_clearance_status VARCHAR(50) DEFAULT 'Not Applicable';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS final_settlement_status VARCHAR(50) DEFAULT 'Not Applicable';

      ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_status_check;
      ALTER TABLE employees ADD CONSTRAINT employees_status_check
        CHECK (status::text = ANY (ARRAY['Active', 'Probation', 'On Leave', 'Suspended', 'Resigned', 'Terminated', 'Retired', 'Inactive', 'Notice Period']));

      CREATE TABLE IF NOT EXISTS employee_promotions (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
        employee_name VARCHAR(255) NOT NULL,
        old_designation VARCHAR(150),
        new_designation VARCHAR(150) NOT NULL,
        effective_date DATE NOT NULL,
        approved_by VARCHAR(100) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employee_transfers (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
        employee_name VARCHAR(255) NOT NULL,
        old_department VARCHAR(100),
        new_department VARCHAR(100) NOT NULL,
        effective_date DATE NOT NULL,
        approved_by VARCHAR(100) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS salary_revisions (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
        employee_name VARCHAR(255) NOT NULL,
        old_salary NUMERIC(12,2) NOT NULL,
        new_salary NUMERIC(12,2) NOT NULL,
        effective_date DATE NOT NULL,
        reason TEXT,
        approved_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employee_exits (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
        employee_name VARCHAR(255) NOT NULL,
        exit_type VARCHAR(50) NOT NULL,
        resignation_date DATE NOT NULL,
        notice_period_days INT DEFAULT 30,
        last_working_date DATE NOT NULL,
        exit_reason TEXT,
        exit_clearance_status VARCHAR(50) DEFAULT 'Pending',
        final_settlement_status VARCHAR(50) DEFAULT 'Pending',
        approved_by VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Employee lifecycle tables updated');

    // 4. Update audit_logs
    await client.query(`
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module VARCHAR(100) DEFAULT 'HRMS';
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
    `);
    console.log('✅ Audit logs updated');

    // 5. Update notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        hospital_id INT DEFAULT 1,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(50) DEFAULT 'normal',
        is_read BOOLEAN DEFAULT false,
        target_user VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Notifications table verified');

    await client.query('COMMIT');
    console.log('🎉 ALL DATABASE MIGRATIONS COMPLETED SUCCESSFULLY');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
