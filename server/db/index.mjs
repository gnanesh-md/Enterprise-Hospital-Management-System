import pkg from 'pg';
import { executeMemoryQuery } from './memoryStore.mjs';

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5434', 10),
  database: process.env.PGDATABASE || 'hospai_enterprise',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 1500,
});

let pgAvailable = false;
let hasCheckedPg = false;
let lastCheckTime = 0;

pool.on('error', (err) => {
  // Suppress uncaught pool error spam when running in offline/in-memory mode
  pgAvailable = false;
});

async function checkPgHealth() {
  const now = Date.now();
  if (hasCheckedPg && !pgAvailable && (now - lastCheckTime < 4000)) {
    return false;
  }
  lastCheckTime = now;
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    if (!pgAvailable) {
      console.log('[HospAI HRMS DB] Connected successfully to PostgreSQL on port 5434');
    }
    pgAvailable = true;
    hasCheckedPg = true;
  } catch (err) {
    if (!hasCheckedPg) {
      console.log('[HospAI HRMS DB] PostgreSQL port 5434 not reachable. Operating in resilient In-Memory Engine mode.');
    }
    pgAvailable = false;
    hasCheckedPg = true;
  }
  return pgAvailable;
}

// Initial probe
checkPgHealth().catch(() => {});

export async function query(text, params) {
  if (!pgAvailable) {
    if (Date.now() - lastCheckTime >= 4000) {
      await checkPgHealth().catch(() => {});
    }
  }

  if (!pgAvailable && hasCheckedPg) {
    return executeMemoryQuery(text, params);
  }

  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    pgAvailable = true;
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[Slow Query ${duration}ms]`, text);
    }
    return res;
  } catch (err) {
    pgAvailable = false;
    return executeMemoryQuery(text, params);
  }
}

export async function withTransaction(callback) {
  if (!pgAvailable && hasCheckedPg) {
    const mockClient = {
      query: (t, p) => executeMemoryQuery(t, p),
    };
    return callback(mockClient);
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    pgAvailable = false;
    const mockClient = {
      query: (t, p) => executeMemoryQuery(t, p),
    };
    return callback(mockClient);
  }
}

export async function testConnection() {
  const res = await query('SELECT current_database(), current_user, version()');
  return res.rows[0];
}

export default {
  query,
  withTransaction,
  testConnection,
  pool,
};

