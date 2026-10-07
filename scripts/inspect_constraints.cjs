const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 5434,
  database: 'hospai_enterprise',
  user: 'postgres',
  password: 'postgres',
});

async function inspect() {
  const fks = await pool.query(`
    SELECT
      tc.table_name, kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name;
  `);

  console.log('--- Foreign Keys ---');
  console.table(fks.rows);

  const uqs = await pool.query(`
    SELECT
      tc.table_name, kcu.column_name, tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'UNIQUE'
    ORDER BY tc.table_name;
  `);

  console.log('\n--- Unique Constraints ---');
  console.table(uqs.rows);

  const idxs = await pool.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname LIKE '%unique%'
  `);

  console.log('\n--- Unique Indexes ---');
  console.table(idxs.rows);

  await pool.end();
}

inspect().catch(console.error);
