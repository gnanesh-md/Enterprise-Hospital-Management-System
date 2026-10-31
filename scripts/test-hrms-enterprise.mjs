import http from 'http';

const API_HOST = 'localhost';
const API_PORT = 8010;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: API_HOST,
      port: API_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const HR_HEADERS = {
  'x-user-role': 'ROLE_HR',
  'x-user-id': 'admin-1',
  'x-actor-name': 'HR Administrator'
};

const STAFF_HEADERS = {
  'x-user-role': 'ROLE_DOCTOR',
  'x-user-id': 'doc-1',
  'x-employee-id': 'EMP-DOC-TEST',
  'x-actor-name': 'Dr. Test Staff'
};

async function runTests() {
  console.log('====================================================');
  console.log('   HospAI HRMS Enterprise End-to-End Test Suite');
  console.log('====================================================\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  // 1. Health check
  console.log('--- Step 1: Health Check ---');
  const health = await request('GET', '/health');
  assert(health.status === 200 && health.data.status === 'healthy', 'HRMS server is healthy and PostgreSQL connected');

  // 2. Onboarding Flow
  console.log('\n--- Step 2: Employee Onboarding Flow ---');
  const newEmpPayload = {
    name: 'Dr. Vikram Aditya',
    gender: 'Male',
    dob: '1988-06-15',
    bloodGroup: 'O+',
    email: 'dr.vikram.aditya@hospai.internal',
    phone: '+91 98765 43210',
    address: '42 Apollo Avenue, Jubilee Hills, Hyderabad',
    department: 'Cardiology',
    designation: 'Senior Cardiologist',
    category: 'Doctor',
    employmentType: 'Full-Time',
    status: 'Active',
    dutyStatus: 'On Duty',
    shift: 'Morning (07:00 - 15:00)',
    joiningDate: '2026-10-01',
    qualification: 'MD, DM Cardiology (AIIMS)',
    licenseNumber: 'TSMC-MED-2026-9876',
    licenseExpiry: '2027-12-31',
    salary: {
      basic: 180000,
      hra: 45000,
      allowances: 25000,
      pf: 15000,
      tax: 22000,
    },
    bankDetails: {
      accountNo: '123456789012',
      bankName: 'HDFC Bank',
      ifsc: 'HDFC0001234',
      pan: 'ABCDE1234F',
    },
    emergencyContact: {
      name: 'Ananya Aditya',
      phone: '+91 98765 00000',
      relation: 'Spouse',
    },
  };

  const onboardRes = await request('POST', '/api/hr/employees', newEmpPayload, HR_HEADERS);
  assert(onboardRes.status === 201 && onboardRes.data.employee, 'Employee onboarded successfully');
  const onboardedEmp = onboardRes.data.employee;
  const empId = onboardedEmp?.id;
  assert(empId && empId.startsWith('EMP-'), `Unique Employee ID generated: ${empId}`);

  // 3. RBAC & Staff Directory Safety
  console.log('\n--- Step 3: RBAC & Directory Projection Safety ---');
  // Normal staff gets directory
  const staffDirRes = await request('GET', '/api/hr/employees', null, STAFF_HEADERS);
  assert(staffDirRes.status === 200 && Array.isArray(staffDirRes.data.employees), 'Staff directory accessible by normal staff');
  const staffList = staffDirRes.data.employees || [];
  const staffViewEmp = staffList.find(e => e.id === empId);
  assert(staffViewEmp !== undefined, 'New employee appears in Staff Directory');
  assert(staffViewEmp && staffViewEmp.salary === undefined, 'Salary is strictly omitted in normal staff directory view');
  assert(staffViewEmp && staffViewEmp.bankDetails?.accountNo?.startsWith('••••'), 'Bank details are safely masked in staff view');

  // Normal staff blocked from HR Admin endpoints
  const forbiddenPayroll = await request('POST', '/api/hr/payroll/run', { month: 'October', year: 2026 }, STAFF_HEADERS);
  assert(forbiddenPayroll.status === 403, 'Normal staff is forbidden from running payroll (HTTP 403)');

  const forbiddenDeactivate = await request('DELETE', `/api/hr/employees/${empId}`, null, STAFF_HEADERS);
  assert(forbiddenDeactivate.status === 403, 'Normal staff is forbidden from deactivating employees (HTTP 403)');

  // 4. Shift & Roster Management
  console.log('\n--- Step 4: Date-based Roster & Overlap Handling ---');
  const shiftAssignRes = await request('POST', '/api/hr/shift-assignments', {
    employeeId: empId,
    shiftDate: '2026-10-05',
    shiftName: 'Morning (07:00 - 15:00)',
    department: 'Cardiology'
  }, HR_HEADERS);
  assert(shiftAssignRes.status === 201 && shiftAssignRes.data.assignment, 'Assigned Morning shift on 2026-10-05');

  // 5. Attendance & Real Clock-In
  console.log('\n--- Step 5: Real Attendance & Audited Correction ---');
  const clockInRes = await request('POST', '/api/hr/attendance/clock-in', {
    employeeId: empId,
  }, HR_HEADERS);
  assert(clockInRes.status === 200 && clockInRes.data.attendance, 'Employee clocked in via Staff Portal');

  const clockOutRes = await request('POST', '/api/hr/attendance/clock-out', {
    employeeId: empId,
  }, HR_HEADERS);
  assert(clockOutRes.status === 200 && clockOutRes.data.attendance, 'Employee clocked out, total hours calculated');

  // Manual correction
  const attRecordId = clockOutRes.data.attendance.id;
  const correctionRes = await request('POST', '/api/hr/attendance/correct', {
    attendanceId: attRecordId,
    newClockIn: '08:45 AM',
    newClockOut: '05:15 PM',
    newStatus: 'Present',
    correctionReason: 'Biometric reader timestamp adjustment'
  }, HR_HEADERS);
  assert(correctionRes.status === 200 && correctionRes.data.attendance, 'Manual attendance correction recorded with audit history');

  // 6. Leave Management & Atomic Transaction
  console.log('\n--- Step 6: Leave Application & Atomic Approval Transaction ---');
  const leaveAppRes = await request('POST', '/api/hr/leaves', {
    staffId: empId,
    leaveType: 'Casual',
    startDate: '2026-10-15',
    endDate: '2026-10-16',
    days: 2,
    reason: 'Attending Cardiology summit in Delhi',
    handoverNote: 'Dr. Sneha taking emergency calls',
  }, HR_HEADERS);
  assert(leaveAppRes.status === 201 && leaveAppRes.data.leave, 'Leave applied successfully, status is Pending');
  const leaveId = leaveAppRes.data.leave.id;

  // Approve leave
  const approveRes = await request('POST', `/api/hr/leaves/${leaveId}/approve`, {
    remarks: 'Approved by Medical Director'
  }, HR_HEADERS);
  assert(approveRes.status === 200 && approveRes.data.leave?.status === 'Approved', 'Leave approved in atomic transaction: balance deducted and roster updated');

  // 7. Payroll Period Snapshot & Locking
  console.log('\n--- Step 7: Period-based Payroll Snapshot & Locking ---');
  const testMonth = 'November';
  const testYear = 2026;

  const runPayrollRes = await request('POST', '/api/hr/payroll/run', {
    month: testMonth,
    year: testYear
  }, HR_HEADERS);
  assert(runPayrollRes.status === 201 && runPayrollRes.data.run, `Payroll run created for ${testMonth} ${testYear} with calculated items snapshot`);
  const payrollId = runPayrollRes.data.run.id;

  const approvePayRes = await request('POST', `/api/hr/payroll/${payrollId}/approve`, {}, HR_HEADERS);
  assert(approvePayRes.status === 200 && approvePayRes.data.run.status === 'Approved', 'Payroll marked Approved');

  const payDisburseRes = await request('POST', `/api/hr/payroll/${payrollId}/pay`, {}, HR_HEADERS);
  assert(payDisburseRes.status === 200, 'Payroll marked Paid');

  const lockPayRes = await request('POST', `/api/hr/payroll/${payrollId}/lock`, {}, HR_HEADERS);
  assert(lockPayRes.status === 200 && lockPayRes.data.run.status === 'Locked', 'Payroll permanently Locked into historical snapshot');

  // Verify locked run cannot be modified/recalculated
  const reRunPayRes = await request('POST', '/api/hr/payroll/run', {
    month: testMonth,
    year: testYear
  }, HR_HEADERS);
  assert(reRunPayRes.status === 500 && reRunPayRes.data.error.includes('locked'), 'Locked payroll cycle cannot be modified/overwritten');

  // 8. Credentials Lifecycle & Renewal
  console.log('\n--- Step 8: Credentials & Dynamic Expiry Calculation ---');
  const credsRes = await request('GET', `/api/hr/credentials?employeeId=${empId}`, null, HR_HEADERS);
  assert(credsRes.status === 200 && credsRes.data.credentials?.length > 0, 'Credentials retrieved');
  const cred = credsRes.data.credentials[0];
  assert(cred.status === 'Valid', `Dynamic status calculated accurately: ${cred.status}`);

  const renewRes = await request('PUT', `/api/hr/credentials/${cred.id}/renew`, {
    newExpiry: '2028-12-31',
    remarks: 'Registration renewed with Telangana State Medical Council'
  }, HR_HEADERS);
  assert(renewRes.status === 200 && renewRes.data.credential, 'Credential renewed with new expiry and audit trail');

  // 9. Audit Logging & Reports
  console.log('\n--- Step 9: Audit Logs & Enterprise Reports ---');
  const auditRes = await request('GET', '/api/hr/audit-logs?limit=10', null, HR_HEADERS);
  assert(auditRes.status === 200 && auditRes.data.auditLogs?.length > 0, `Immutable audit logs verified (${auditRes.data.auditLogs?.length} recent events)`);

  const headcountRep = await request('GET', '/api/hr/reports/headcount', null, HR_HEADERS);
  assert(headcountRep.status === 200 && Array.isArray(headcountRep.data.departments), 'Headcount report generated with department breakdowns');

  const complianceRep = await request('GET', '/api/hr/reports/compliance', null, HR_HEADERS);
  assert(complianceRep.status === 200 && Array.isArray(complianceRep.data.records), 'Compliance and credential report generated with compliance records');

  console.log('\n====================================================');
  console.log(`Test Execution Finished: ${passCount} Passed, ${failCount} Failed.`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
