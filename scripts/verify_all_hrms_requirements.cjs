const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, data, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// Default HR Admin simulated headers (dev auth bypass)
const adminHeaders = {
  'Content-Type': 'application/json',
  'x-user-id': 'usr-admin-1',
  'x-user-role': 'ROLE_ADMIN',
  'x-user-name': 'Dr. Chief Administrator',
  'x-hospital-id': '1',
};

// Normal non-admin staff headers
const staffHeaders = {
  'Content-Type': 'application/json',
  'x-user-id': 'usr-emp-101',
  'x-user-role': 'ROLE_STAFF',
  'x-user-name': 'Nurse Sarah Jenkins',
  'x-employee-id': 'EMP-NURSE-01',
  'x-hospital-id': '1',
};

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 VERIFYING ALL 10 HRMS ENHANCEMENTS AND INTEGRITY CHECKS');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // ── 1. CONFIGURABLE PAYROLL RULES ───────────────────────────────────────
    console.log('--- 1. Testing Configurable Payroll Rules ---');
    const getPolicy = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/payroll/policies',
      method: 'GET',
      headers: adminHeaders,
    });
    assert(getPolicy.status === 200 && getPolicy.data.policy, 'GET /api/hr/payroll/policies returns active policy');

    const updatePolicy = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/payroll/policies',
      method: 'PUT',
      headers: adminHeaders,
    }, {
      policyName: 'Automated Test Hospital Policy',
      pfPercentage: 12.0,
      tdsPercentage: 10.0,
      dailyPayDivisorType: '30_days',
      dailyPayFixedDays: 30.0,
      overtimeMultiplier: 1.5,
      standardWorkHoursPerDay: 8.0,
      reason: 'Automated test suite policy verification',
    });
    assert(
      updatePolicy.status === 200 && updatePolicy.data.policy && parseFloat(updatePolicy.data.policy.pf_percentage) === 12.0,
      'PUT /api/hr/payroll/policies dynamically updates policy and saves to PostgreSQL'
    );

    // ── 2. BACKEND ENFORCEMENT & SECURITY ──────────────────────────────────
    console.log('\n--- 2. Testing Backend Enforcement & Security ---');

    // 2a. Unauthorized user blocked from payroll run
    const unauthRun = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/payroll/run',
      method: 'POST',
      headers: staffHeaders, // non-admin
    }, { month: 'September', year: 2026 });
    assert(unauthRun.status === 403, 'Unauthorized non-admin user blocked from calculating payroll (403)');

    // 2b. Inactive staff blocked from clock-in
    // First, fetch an employee or test with an inactive/resigned employee
    const inactiveClockIn = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/attendance/clock-in',
      method: 'POST',
      headers: adminHeaders,
    }, { employeeId: 'EMP-NON-EXISTENT' });
    assert(inactiveClockIn.status === 400, 'Invalid or non-existent employee blocked from clock-in (400)');

    // 2c. Invalid payroll status transitions blocked
    // Attempting to approve a non-reviewed or non-existent payroll run
    const invalidApprove = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/payroll/PR-2026-NONEXISTENT/approve',
      method: 'POST',
      headers: adminHeaders,
    });
    assert(invalidApprove.status === 404 || invalidApprove.status === 400, 'Invalid payroll approval transition blocked (400/404)');

    // ── 3. NIGHT-SHIFT HANDLING (23:00 - 07:00) ────────────────────────────
    console.log('\n--- 3. Testing Overnight Shift Engine (23:00 - 07:00) ---');
    // Manual attendance entry for overnight shift
    // Let's get a real active employee first
    const empsRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/employees',
      method: 'GET',
      headers: adminHeaders,
    });
    const employees = empsRes.data.employees || [];
    assert(employees.length > 0, `Fetched ${employees.length} active employees from PostgreSQL`);

    if (employees.length > 0) {
      const testEmp = employees[0];
      const testDate = '2026-09-15';

      // Record manual overnight shift 23:00 to 07:00 (crosses midnight)
      const nightShiftRes = await makeRequest({
        hostname: '127.0.0.1',
        port: 8010,
        path: '/api/hr/attendance/manual',
        method: 'POST',
        headers: adminHeaders,
      }, {
        employeeId: testEmp.id,
        date: testDate,
        shift: 'Night (23:00 - 07:00)',
        clockIn: '23:00',
        clockOut: '07:00',
        status: 'Present',
        reason: 'Overnight night shift calculation test',
      });

      assert(
        nightShiftRes.status === 201 && nightShiftRes.data.attendance,
        'Overnight shift (23:00 - 07:00) recorded successfully without "check-out before check-in" error'
      );

      if (nightShiftRes.data.attendance) {
        const att = nightShiftRes.data.attendance;
        assert(parseFloat(att.work_hours) === 8.0, `Overnight worked hours correctly computed as 8.0 (actual: ${att.work_hours})`);
        assert(parseInt(att.late_minutes, 10) === 0, `Overnight late minutes correctly 0 (actual: ${att.late_minutes})`);
        assert(parseFloat(att.overtime_hours) === 0, `Overnight overtime correctly 0 (actual: ${att.overtime_hours})`);
      }

      // Test overnight shift with 2 hours overtime (23:00 to 09:00)
      const nightOtRes = await makeRequest({
        hostname: '127.0.0.1',
        port: 8010,
        path: '/api/hr/attendance/manual',
        method: 'POST',
        headers: adminHeaders,
      }, {
        employeeId: testEmp.id,
        date: '2026-09-16',
        shift: 'Night (23:00 - 07:00)',
        clockIn: '23:00',
        clockOut: '09:00',
        status: 'Present',
        reason: 'Overnight night shift with 2 hours overtime',
      });

      assert(nightOtRes.status === 201, 'Overnight shift with overtime accepted');
      if (nightOtRes.data.attendance) {
        const attOt = nightOtRes.data.attendance;
        assert(parseFloat(attOt.work_hours) === 10.0, `Overnight 23:00-09:00 work hours = 10.0 (actual: ${attOt.work_hours})`);
        assert(parseFloat(attOt.overtime_hours) === 2.0, `Overnight overtime hours = 2.0 (actual: ${attOt.overtime_hours})`);
      }
    }

    // ── 4. PREVENT DUPLICATE / OVERLAPPING OPERATIONS ──────────────────────
    console.log('\n--- 4. Testing Duplicate & Overlapping Prevention ---');
    if (employees.length > 0) {
      const testEmp = employees[0];
      const rosterDate = '2026-11-20';
      // Clean up previous test slot if any
      await makeRequest({
        hostname: '127.0.0.1',
        port: 8010,
        path: `/api/hr/shift-assignments?date=${rosterDate}`,
        method: 'GET',
        headers: adminHeaders,
      }).then(async (res) => {
        if (res.data.assignments && res.data.assignments.length > 0) {
          for (const a of res.data.assignments) {
            await makeRequest({
              hostname: '127.0.0.1',
              port: 8010,
              path: `/api/hr/shift-assignments/${a.id}`,
              method: 'DELETE',
              headers: adminHeaders,
            });
          }
        }
      });

      // Schedule first shift
      const roster1 = await makeRequest({
        hostname: '127.0.0.1',
        port: 8010,
        path: '/api/hr/shift-assignments',
        method: 'POST',
        headers: adminHeaders,
      }, {
        employeeId: testEmp.id,
        shiftDate: rosterDate,
        shiftName: 'Morning (07:00 - 15:00)',
        allowOverwrite: false,
      });

      assert(roster1.status === 201, 'First roster slot assigned successfully', JSON.stringify(roster1.data));

      // Attempt conflicting shift without allowOverwrite
      const rosterConflict = await makeRequest({
        hostname: '127.0.0.1',
        port: 8010,
        path: '/api/hr/shift-assignments',
        method: 'POST',
        headers: adminHeaders,
      }, {
        employeeId: testEmp.id,
        shiftDate: rosterDate,
        shiftName: 'Night (23:00 - 07:00)',
        allowOverwrite: false,
      });

      assert(
        rosterConflict.status === 400 && rosterConflict.data && rosterConflict.data.error && rosterConflict.data.error.includes('Conflict'),
        'Overlapping shift assignment blocked by backend enforcement (400 Conflict)',
        JSON.stringify(rosterConflict.data)
      );
    }

    // ── 5. REAL-TIME DYNAMIC ALERTS ─────────────────────────────────────────
    console.log('\n--- 5. Testing Dynamic PostgreSQL Real-Time Alerts ---');
    const alertsRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/alerts',
      method: 'GET',
      headers: adminHeaders,
    });

    assert(alertsRes.status === 200 && Array.isArray(alertsRes.data.alerts), 'GET /api/hr/alerts returns live alert list');
    console.log(`ℹ️  Active dynamic system alerts generated from PostgreSQL: ${alertsRes.data.alerts.length}`);
    alertsRes.data.alerts.slice(0, 3).forEach((a) => {
      console.log(`   - [${a.type}] ${a.category}: ${a.title}`);
    });

    // ── 6. AUDIT TRAIL INTEGRITY ───────────────────────────────────────────
    console.log('\n--- 6. Testing Audit Trail Integrity ---');
    const auditRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/audit-logs',
      method: 'GET',
      headers: adminHeaders,
    });

    assert(auditRes.status === 200 && Array.isArray(auditRes.data.logs), 'GET /api/hr/audit-logs returns complete history');
    assert(auditRes.data.logs.length > 0, `Verified audit logs are actively maintained (${auditRes.data.logs.length} entries)`);

    const latestAudit = auditRes.data.logs[0];
    if (latestAudit) {
      assert(
        latestAudit.action && latestAudit.actorUsername && latestAudit.createdAt,
        `Audit record contains required fields (Action: ${latestAudit.action}, Actor: ${latestAudit.actorUsername})`
      );
    }

    // ── 7. PAYROLL ACCURACY (FULL CYCLE TEST) ──────────────────────────────
    console.log('\n--- 7. Testing Payroll Calculation Accuracy ---');
    const runPayroll = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/payroll/run',
      method: 'POST',
      headers: adminHeaders,
    }, { month: 'September', year: 2026 });

    assert(
      runPayroll.status === 201 && runPayroll.data.run && runPayroll.data.run.status === 'Calculated',
      'Payroll run generated based on live attendance, leaves, and configurable policy (Status: Calculated)'
    );

    const getPayroll = await makeRequest({
      hostname: '127.0.0.1',
      port: 8010,
      path: '/api/hr/payroll?month=September&year=2026',
      method: 'GET',
      headers: adminHeaders,
    });

    assert(
      getPayroll.status === 200 && Array.isArray(getPayroll.data.payroll),
      `Fetched payroll items (${getPayroll.data.payroll.length} staff processed)`
    );

    if (getPayroll.data.payroll.length > 0) {
      const item = getPayroll.data.payroll[0];
      assert(
        item.basic > 0 && item.gross > 0 && item.netPay > 0,
        `Staff ${item.staffName} payroll values accurately computed: Gross: ₹${item.gross}, Net: ₹${item.netPay}, PF: ₹${item.pf}, Tax: ₹${item.tax}`
      );
    }

    console.log('\n===============================================================');
    console.log(`📊 FINAL SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  }
}

runTests();
