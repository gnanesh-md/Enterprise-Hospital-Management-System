import { query } from '../server/db/index.mjs';

async function inspect() {
  const constraints = await query(`
    SELECT conname, contype, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'shift_assignments'::regclass
  `);
  console.log('CONSTRAINTS:', constraints.rows);

  const cols = await query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'shift_assignments'
    ORDER BY ordinal_position
  `);
  console.log('COLUMNS:', cols.rows);

  const shifts = await query(`SELECT * FROM shifts`);
  console.log('SHIFTS:', shifts.rows);

  const employees = await query(`SELECT id, hospital_id, name, department, default_shift FROM employees`);
  console.log('EMPLOYEES:', employees.rows);

  const assignments = await query(`SELECT * FROM shift_assignments`);
  console.log('ASSIGNMENTS:', assignments.rows);

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});