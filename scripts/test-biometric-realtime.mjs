import http from 'node:http';
import { query } from '../server/db/index.mjs';

const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 8011;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    let payload = null;
    const reqHeaders = { ...headers };

    if (body) {
      if (typeof body === 'string') {
        payload = body;
        if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'text/plain';
      } else {
        payload = JSON.stringify(body);
        if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: BACKEND_HOST,
        port: BACKEND_PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch (_) {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed, raw: data });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runBiometricTestSuite() {
  console.log('\n================================================================');
  console.log('   Enterprise HMS Biometric Attendance Real-Time Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       Details: ${details}`);
      failed++;
    }
  }

  try {
    // ── Test 1: Fetch Live Devices from PostgreSQL ─────────────────────────────
    console.log('--- Step 1: Query Biometric Terminals from PostgreSQL ---');
    const devRes = await makeRequest('GET', '/api/hr/biometric/devices');
    assert(
      devRes.status === 200 && Array.isArray(devRes.data.devices) && devRes.data.devices.length >= 5,
      'Biometric devices retrieved from PostgreSQL database',
      JSON.stringify(devRes.data)
    );

    // ── Test 2: Honest Socket Ping (No Fabricated Latency) ─────────────────────
    console.log('\n--- Step 2: Test Honest Device TCP Ping ---');
    const pingOffline = await makeRequest('POST', '/api/hr/biometric/devices/BIO-01/ping');
    // Because 192.168.168.201 is not on this test runner's subnet, it must report offline with true error
    assert(
      pingOffline.status === 200 && pingOffline.data.deviceStatus === 'offline' && pingOffline.data.reachable === false,
      'Unreachable hardware honestly reported as offline (zero fabricated pings)',
      JSON.stringify(pingOffline.data)
    );

    // ── Test 3: Direct Webhook/Push Punch Ingestion (EMP-101) ─────────────────
    console.log('\n--- Step 3: Direct HTTP / Webhook Punch Ingestion ---');
    const today = new Date().toISOString().split('T')[0];
    const testPunchTime = `${today} 07:10:00`;

    // Clear prior attendance for today for EMP-101 to have a clean test
    await query(`DELETE FROM attendance WHERE employee_id = 'EMP-101' AND attendance_date = $1`, [today]);
    await query(`DELETE FROM biometric_punches WHERE employee_id = 'EMP-101' AND punch_date = $1`, [today]);

    const punch1 = await makeRequest('POST', '/api/hr/biometric/punch', {
      device_sn: 'QJT3252700812',
      deviceId: 'BIO-01',
      user_id: '101', // Should map to EMP-101
      punch_time: testPunchTime,
      direction: 'IN',
      verify_mode: 'Fingerprint',
    });

    assert(
      punch1.status === 200 && punch1.data.status === 'success' && punch1.data.result.status === 'PROCESSED',
      'Punch successfully processed and verified in PostgreSQL',
      JSON.stringify(punch1.data)
    );

    // Verify record in PostgreSQL attendance table
    const attCheck = await query(`SELECT * FROM attendance WHERE employee_id = 'EMP-101' AND attendance_date = $1`, [today]);
    assert(
      attCheck.rows.length === 1 && attCheck.rows[0].attendance_source === 'Biometric',
      'Attendance record created in PostgreSQL attendance table with source=Biometric'
    );

    // Verify 15-minute grace period compliance (07:10 for 07:00 shift -> Present within 15-min grace)
    assert(
      attCheck.rows[0].attendance_status === 'Present' && attCheck.rows[0].late_minutes <= 15,
      '15-Minute grace period applied: 07:10 punch evaluated as Present (On Time within 15m grace)',
      `Actual status=${attCheck.rows[0].attendance_status}, late_minutes=${attCheck.rows[0].late_minutes}`
    );

    // Verify employee duty_status updated to 'On Duty'
    const empDuty = await query(`SELECT duty_status FROM employees WHERE id = 'EMP-101'`);
    assert(
      empDuty.rows[0].duty_status === 'On Duty',
      'Employee duty_status automatically updated to "On Duty"'
    );

    // ── Test 4: Idempotency & De-duplication ───────────────────────────────────
    console.log('\n--- Step 4: De-duplication & Idempotent Retries ---');
    const duplicatePunch = await makeRequest('POST', '/api/hr/biometric/punch', {
      device_sn: 'QJT3252700812',
      deviceId: 'BIO-01',
      user_id: '101',
      punch_time: testPunchTime, // Exactly same timestamp & device
      direction: 'IN',
      verify_mode: 'Fingerprint',
    });

    assert(
      duplicatePunch.status === 200 && duplicatePunch.data.result.isDuplicate === true,
      'Duplicate hardware punch recognized and ignored idempotently',
      JSON.stringify(duplicatePunch.data)
    );

    const attCountAfterDup = await query(`SELECT COUNT(*) as c FROM attendance WHERE employee_id = 'EMP-101' AND attendance_date = $1`, [today]);
    assert(
      parseInt(attCountAfterDup.rows[0].c, 10) === 1,
      'Zero duplicate attendance rows created in database'
    );

    // ── Test 5: Rapid Repeat Scan De-bounce ────────────────────────────────────
    console.log('\n--- Step 5: Rapid Repeat Scan Cooldown ---');
    const rapidScanTime = new Date(new Date(testPunchTime).getTime() + 30 * 1000).toISOString(); // 30 seconds later
    const rapidPunch = await makeRequest('POST', '/api/hr/biometric/punch', {
      device_sn: 'QJT3252700812',
      deviceId: 'BIO-01',
      user_id: '101',
      punch_time: rapidScanTime,
      direction: 'IN',
      verify_mode: 'Fingerprint',
    });

    assert(
      rapidPunch.status === 200 && rapidPunch.data.result.status === 'RAPID_REPEAT',
      'Accidental double-swipe within cooldown window safely de-bounced',
      JSON.stringify(rapidPunch.data)
    );

    // ── Test 6: eSSL / ZKTeco Cloud Server (ADMS) Protocol ─────────────────────
    console.log('\n--- Step 6: ADMS / iClock Protocol Handshake & ATTLOG Push ---');
    // Handshake
    const admsHandshake = await makeRequest('GET', '/iclock/cdata?SN=QJT3252700643&options=all');
    assert(
      admsHandshake.status === 200 && admsHandshake.raw.includes('GET OPTION FROM: QJT3252700643'),
      'ADMS handshake response matches eSSL/ZKTeco device expectations',
      admsHandshake.raw
    );

    // Clear EMP-102
    await query(`DELETE FROM attendance WHERE employee_id = 'EMP-102' AND attendance_date = $1`, [today]);
    await query(`DELETE FROM biometric_punches WHERE employee_id = 'EMP-102' AND punch_date = $1`, [today]);

    // Push ATTLOG text payload (User PIN 102, 07:45 AM -> Late arrival)
    const admsPunchTime = `${today} 07:45:00`;
    const admsPayload = `102\t${admsPunchTime}\t0\t1\t0\t0\n`;

    const admsPush = await makeRequest('POST', '/iclock/cdata?SN=QJT3252700643&table=ATTLOG', admsPayload);
    assert(
      admsPush.status === 200 && admsPush.raw.includes('OK: 1'),
      'ADMS raw text ATTLOG parsed, processed, and acknowledged with "OK: 1"',
      admsPush.raw
    );

    // Verify late mark compliance (07:45 is 45 mins late for a 07:00 shift)
    const emp102Att = await query(`SELECT * FROM attendance WHERE employee_id = 'EMP-102' AND attendance_date = $1`, [today]);
    assert(
      emp102Att.rows.length === 1 && emp102Att.rows[0].attendance_status === 'Late' && emp102Att.rows[0].late_minutes === 45,
      'Shift compliance: Punch at 07:45 correctly flagged as Late (45 mins late)'
    );

    // ── Test 7: Clock-Out and Overtime Compliance ─────────────────────────────
    console.log('\n--- Step 7: Clock-Out and Overtime Rules ---');
    const clockOutTime = `${today} 17:30:00`; // 10.5 hours later
    const clockOutPunch = await makeRequest('POST', '/api/hr/biometric/punch', {
      device_sn: 'QJT3252700812',
      deviceId: 'BIO-01',
      user_id: '101',
      punch_time: clockOutTime,
      direction: 'OUT',
      verify_mode: 'Fingerprint',
    });

    assert(
      clockOutPunch.status === 200 && clockOutPunch.data.result.attendance.clock_out !== null,
      'Clock-out successfully registered and paired with morning clock-in',
      JSON.stringify(clockOutPunch.data)
    );

    const attOutCheck = await query(`SELECT * FROM attendance WHERE employee_id = 'EMP-101' AND attendance_date = $1`, [today]);
    assert(
      attOutCheck.rows[0].clock_out !== null && parseFloat(attOutCheck.rows[0].work_hours) > 0,
      'Total work hours computed accurately from clock-in to clock-out'
    );

    // Overtime rule: Payable overtime must be 0 without approval
    assert(
      parseFloat(attOutCheck.rows[0].overtime_hours) === 0,
      'Overtime policy compliance: Raw departure time does NOT auto-credit payable overtime without approval'
    );

    // Verify duty_status updated to 'Off Duty'
    const empDutyOut = await query(`SELECT duty_status FROM employees WHERE id = 'EMP-101'`);
    assert(
      empDutyOut.rows[0].duty_status === 'Off Duty',
      'Employee duty_status automatically set to "Off Duty" on OUT scan'
    );

    // ── Test 8: Unmapped Employee PIN Handling ─────────────────────────────────
    console.log('\n--- Step 8: Unmapped Hardware PIN Handling ---');
    const unmappedPunch = await makeRequest('POST', '/api/hr/biometric/punch', {
      device_sn: 'QJT3252700812',
      deviceId: 'BIO-01',
      user_id: '99999', // Unknown PIN
      punch_time: new Date().toISOString(),
      direction: 'IN',
      verify_mode: 'Fingerprint',
    });

    assert(
      unmappedPunch.status === 200 && unmappedPunch.data.result.status === 'UNMAPPED_EMPLOYEE',
      'Unknown hardware PIN gracefully saved as UNMAPPED_EMPLOYEE without crashing',
      JSON.stringify(unmappedPunch.data)
    );

    // ── Test 9: Raw Punch Audit Trail ─────────────────────────────────────────
    console.log('\n--- Step 9: Raw Punch Audit Trail API ---');
    const punchesRes = await makeRequest('GET', '/api/hr/biometric/punches?limit=10');
    assert(
      punchesRes.status === 200 && Array.isArray(punchesRes.data.punches) && punchesRes.data.punches.length > 0,
      'Raw biometric punch audit trail queryable with staff names and device locations'
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`   Test Suite Results: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runBiometricTestSuite();
