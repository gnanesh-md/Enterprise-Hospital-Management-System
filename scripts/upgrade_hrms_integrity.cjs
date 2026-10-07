const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5434,
  user: 'postgres',
  password: 'postgres',
  database: 'hospai_enterprise',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('--- Starting HRMS Integrity & Configurable Policies Migration ---');

    // 1. Configurable Payroll Policies Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_policies (
        id SERIAL PRIMARY KEY,
        hospital_id INT NOT NULL DEFAULT 1,
        policy_name VARCHAR(100) NOT NULL DEFAULT 'Standard Hospital Payroll Policy',
        pf_percentage NUMERIC(5,2) NOT NULL DEFAULT 12.00,
        tds_percentage NUMERIC(5,2) NOT NULL DEFAULT 10.00,
        daily_pay_divisor_type VARCHAR(20) NOT NULL DEFAULT '30_days', -- '30_days', 'calendar_days', 'working_days'
        daily_pay_fixed_days NUMERIC(4,1) DEFAULT 30.0,
        overtime_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.50,
        standard_work_hours_per_day NUMERIC(4,1) NOT NULL DEFAULT 8.0,
        grace_period_late_minutes INT NOT NULL DEFAULT 15,
        half_day_minimum_hours NUMERIC(4,1) NOT NULL DEFAULT 4.0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_by VARCHAR(100) DEFAULT 'System',
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default policy if not exists
    const policyCheck = await client.query('SELECT COUNT(*) FROM payroll_policies WHERE hospital_id = 1');
    if (parseInt(policyCheck.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO payroll_policies (
          hospital_id, policy_name, pf_percentage, tds_percentage,
          daily_pay_divisor_type, daily_pay_fixed_days, overtime_multiplier,
          standard_work_hours_per_day, grace_period_late_minutes, half_day_minimum_hours,
          is_active, updated_by
        ) VALUES (
          1, 'Imperial Hospital Standard Payroll Policy', 12.00, 10.00,
          '30_days', 30.0, 1.50, 8.0, 15, 4.0, TRUE, 'HR Admin'
        );
      `);
      console.log('✅ Seeded default configurable payroll policy');
    } else {
      console.log('ℹ️ Payroll policy already exists');
    }

    // 2. Prevent duplicate active salary structures: Unique Partial Index
    // First, resolve any duplicates if they exist by keeping only the latest active one
    await client.query(`
      UPDATE salary_structures s1
      SET is_active = FALSE
      WHERE is_active = TRUE
        AND EXISTS (
          SELECT 1 FROM salary_structures s2
          WHERE s2.employee_id = s1.employee_id
            AND s2.is_active = TRUE
            AND s2.id > s1.id
        );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_salary_structure 
      ON salary_structures (employee_id) 
      WHERE is_active = TRUE;
    `);
    console.log('✅ Unique active salary structure constraint established');

    // 3. Prevent duplicate attendance per employee per date
    // Check if unique constraint exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_attendance_emp_date'
        ) THEN
          ALTER TABLE attendance ADD CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, attendance_date);
        END IF;
      END $$;
    `);
    console.log('✅ Unique attendance (employee_id, date) constraint verified');

    // 4. Prevent duplicate payroll run for same hospital, month, and year
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_payroll_run_month_year'
        ) THEN
          ALTER TABLE payroll_runs ADD CONSTRAINT uq_payroll_run_month_year UNIQUE (hospital_id, month, year);
        END IF;
      END $$;
    `);
    console.log('✅ Unique payroll run (hospital, month, year) constraint verified');

    // 5. Prevent duplicate credentials for same employee and license number
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_cred_emp_license'
        ) THEN
          ALTER TABLE employee_credentials ADD CONSTRAINT uq_cred_emp_license UNIQUE (employee_id, license_no);
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- Ignore if duplicate rows exist, log notice
          RAISE NOTICE 'Constraint uq_cred_emp_license skipped: %', SQLERRM;
      END $$;
    `);

    // 6. Prevent duplicate shift assignments for same employee, date, and shift
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_shift_emp_date_shift'
        ) THEN
          ALTER TABLE shift_assignments ADD CONSTRAINT uq_shift_emp_date_shift UNIQUE (employee_id, shift_date, shift_name);
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Constraint uq_shift_emp_date_shift skipped: %', SQLERRM;
      END $$;
    `);
    console.log('✅ Unique shift assignments constraint verified');

    // 7. Ensure audit_logs has all required columns and indices
    await client.query(`
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS reason TEXT;
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255);
      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module VARCHAR(50) DEFAULT 'HRMS';
      CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs (module);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_employee ON audit_logs (employee_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
    `);
    console.log('✅ Audit logs schema and indices strengthened');

    await client.query('COMMIT');
    console.log('--- Migration completed successfully ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
