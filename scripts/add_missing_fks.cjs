const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5434,
  database: 'hospai_enterprise',
  user: 'postgres',
  password: 'postgres',
});

async function addMissingFks() {
  console.log('Verifying & strengthening database constraints and foreign keys...');

  // 1. Attendance -> Employees foreign key
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_attendance_employee' AND table_name = 'attendance'
      ) THEN
        ALTER TABLE attendance
          ADD CONSTRAINT fk_attendance_employee
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `);
  console.log('✅ fk_attendance_employee validated');

  // 2. Employee Credentials -> Employees foreign key
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_cred_employee' AND table_name = 'employee_credentials'
      ) THEN
        ALTER TABLE employee_credentials
          ADD CONSTRAINT fk_cred_employee
          FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);
  console.log('✅ fk_cred_employee validated');

  // 3. Make audit_logs strictly append-only via DB trigger
  await pool.query(`
    CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'audit_logs is an immutable append-only ledger; modifications and deletions are prohibited.';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_prevent_audit_log_modification ON audit_logs;

    CREATE TRIGGER trg_prevent_audit_log_modification
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();
  `);
  console.log('✅ trg_prevent_audit_log_modification applied (database-level audit immutability)');

  await pool.end();
}

addMissingFks().catch(console.error);
