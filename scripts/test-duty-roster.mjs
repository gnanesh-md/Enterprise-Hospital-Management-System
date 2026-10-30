/**
 * Targeted Test Suite for Duty Roster API Endpoints
 * Tests: GET /api/hr/biometric/roster, PUT /api/hr/biometric/roster,
 * Validations, Role Authorization, Hospital Scoping & Database Persistence.
 */

import { query } from '../server/db/index.mjs';

const BASE_URL = 'http://localhost:8011';

const ADMIN_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': 'USR-ADMIN',
  'x-user-username': 'admin',
  'x-user-role': 'ROLE_ADMIN',
  'x-hospital-id': '1',
};

const STAFF_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': 'USR-STAFF-1',
  'x-user-username': 'nurse_staff',
  'x-user-role': 'ROLE_NURSE',
  'x-hospital-id': '1',
};

const OTHER_HOSPITAL_HEADERS = {
  'Content-Type': 'application/json',
  'x-user-id': 'USR-ADMIN-2',
  'x-user-username': 'admin_hosp2',
  'x-user-role': 'ROLE_ADMIN',
  'x-hospital-id': '2',
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? '(' + detail + ')' : ''}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('   HospAI HRMS Duty Roster API Targeted Verification Suite     ');
  console.log('===============================================================\n');

  // Test 1: GET /roster returns 200 with rosters array
  {
    const res = await fetch(`${BASE_URL}/api/hr/biometric/roster?month=2026-10`, {
      headers: ADMIN_HEADERS,
    });
    const data = await res.json();
    assert(res.status === 200, 'Test 1.1: GET /api/hr/biometric/roster returns HTTP 200');
    assert(Array.isArray(data.rosters), 'Test 1.2: Response contains rosters array');
    assert(data.rosters.length >= 1, 'Test 1.3: Active employee Dr. Rajesh Varma is present in roster');
    const emp = data.rosters.find(r => r.staffId === 'EMP-101');
    assert(emp && emp.staffName === 'Dr. Rajesh Varma', 'Test 1.4: Employee data mapped correctly');
  }

  // Test 2: GET /roster with department filter
  {
    const resMatching = await fetch(`${BASE_URL}/api/hr/biometric/roster?month=2026-10&department=Cardiology`, {
      headers: ADMIN_HEADERS,
    });
    const dataMatching = await resMatching.json();
    assert(dataMatching.rosters.some(r => r.staffId === 'EMP-101'), 'Test 2.1: Matches department Cardiology');

    const resNonMatching = await fetch(`${BASE_URL}/api/hr/biometric/roster?month=2026-10&department=Orthopedics`, {
      headers: ADMIN_HEADERS,
    });
    const dataNonMatching = await resNonMatching.json();
    assert(dataNonMatching.rosters.length === 0, 'Test 2.2: Returns empty roster for unmatched department Orthopedics');
  }

  // Test 3: GET /roster rejects invalid month format
  {
    const res = await fetch(`${BASE_URL}/api/hr/biometric/roster?month=invalid-date`, {
      headers: ADMIN_HEADERS,
    });
    assert(res.status === 400, 'Test 3.1: Rejects invalid month format with HTTP 400');
  }

  // Test 4: PUT /roster updates day slot successfully
  {
    const res = await fetch(`${BASE_URL}/api/hr/biometric/roster`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        staffId: 'EMP-101',
        month: '2026-10',
        day: 15,
        shiftCode: 'N',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Test 4.1: PUT /roster saves Night shift (N) on day 15');
    assert(data.status === 'success', 'Test 4.2: PUT /roster returns success status');
    assert(data.roster.shiftCode === 'N', 'Test 4.3: Returned roster payload has code N');
  }

  // Test 5: Verify GET reflects the newly updated day slot
  {
    const res = await fetch(`${BASE_URL}/api/hr/biometric/roster?month=2026-10`, {
      headers: ADMIN_HEADERS,
    });
    const data = await res.json();
    const emp = data.rosters.find(r => r.staffId === 'EMP-101');
    assert(emp && emp.days['15'] === 'N', 'Test 5.1: GET reflects updated slot day 15 as N');
  }

  // Test 6: Upsert idempotency (change day 15 to 'E')
  {
    const res = await fetch(`${BASE_URL}/api/hr/biometric/roster`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        staffId: 'EMP-101',
        month: '2026-10',
        day: 15,
        shiftCode: 'E',
      }),
    });
    const data = await res.json();
    assert(res.status === 200, 'Test 6.1: Upsert on same day 15 succeeds without conflict error');
    assert(data.roster.shiftCode === 'E', 'Test 6.2: Updated shift code is now Evening (E)');
  }

  // Test 7: Verify all 9 supported shift codes are valid
  {
    const supportedCodes = ['M', 'E', 'N', 'G', 'WO', 'OD', 'CL', 'SL', 'LOP'];
    let allCodesValid = true;
    for (let i = 0; i < supportedCodes.length; i++) {
      const day = i + 1;
      const code = supportedCodes[i];
      const res = await fetch(`${BASE_URL}/api/hr/biometric/roster`, {
        method: 'PUT',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          staffId: 'EMP-101',
          month: '2026-10',
          day,
          shiftCode: code,
        }),
      });
      if (res.status !== 200) allCodesValid = false;
    }
    assert(allCodesValid, 'Test 7.1: All 9 supported codes (M, E, N, G, WO, OD, CL, SL, LOP) accepted');
  }

  // Test 8: Rejects unsupported shift code
  {
    const res = await fetch(`${BASE_URL}/api/hr/biometric/roster`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        staffId: 'EMP-101',
        month: '2026-10',
        day: 12,
        shiftCode: 'INVALID_CODE',
      }),
    });
    const data = await res.json();
    assert(res.status === 400, 'Test 8.1: Rejects unsupported shiftCode with HTTP 400');
    assert(data.error.includes('Supported codes are'), 'Test 8.2: Returns informative error about supported codes');
  }

  // Test 9: Rejects invalid day numbers (day=0 or day=32 for October)
  {
    const resZero = await fetch(`${BASE_URL}/api/hr/biometric/roster`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        staffId: 'EMP-101',
        month: '2026-10',
        day: 0,
        shiftCode: 'M',
      }),
    });
    assert(resZero.status === 400, 'Test 9.1: Rejects day 0 with HTTP 400');

    const res32 = await fetch(`${BASE_URL}/api/hr/biometric/roster`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        staffId: 'EMP-101',
        month: '2026-10',
        day: 32,
        shiftCode: 'M',
      }),
    });
    assert(res32.status === 400, 'Test 9.2: Rejects day 32 for October with HTTP 400');
  }

  // Test 10: Rejects non-existent employee
  {
    const res = await fetch(`${BASE_URL}/api/hr/biometric/roster`, {
      method: 'PUT',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        staffId: 'EMP-999-DOES-NOT-EXIST',
        month: '2026-10',
        day: 10,
        shiftCode: 'M',
      }),
    });
    assert(res.status === 404, 'Test 10.1: Rejects non-existent employee with HTTP 404');
  }

  // Test 11: Authorization check - Staff without HR Admin role cannot update roster
  {
    const res = await fetch(`${BASE_URL}/api/hr/biometric/roster`, {
      method: 'PUT',
      headers: STAFF_HEADERS,
      body: JSON.stringify({
        staffId: 'EMP-101',
        month: '2026-10',
        day: 10,
        shiftCode: 'M',
      }),
    });
    assert(res.status === 403, 'Test 11.1: Rejects non-HR-admin role with HTTP 403 Forbidden');
  }

  // Test 12: Cross-hospital security - Admin of Hospital 2 cannot update Hospital 1 employee
  {
    const res = await fetch(`${BASE_URL}/api/hr/biometric/roster`, {
      method: 'PUT',
      headers: OTHER_HOSPITAL_HEADERS,
      body: JSON.stringify({
        staffId: 'EMP-101',
        month: '2026-10',
        day: 10,
        shiftCode: 'M',
      }),
    });
    assert(res.status === 404, 'Test 12.1: Rejects cross-hospital employee update with HTTP 404');
  }

  // Test 13: Direct database check - verify records stored in shift_assignments table
  {
    const dbRes = await query(
      `SELECT COUNT(*) as count FROM shift_assignments WHERE employee_id = $1 AND hospital_id = 1`,
      ['EMP-101']
    );
    const count = parseInt(dbRes.rows[0].count, 10);
    assert(count >= 9, 'Test 13.1: Database shift_assignments contains verified rows for EMP-101', `count=${count}`);
  }

  console.log('\n===============================================================');
  console.log(`   Verification Results: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
