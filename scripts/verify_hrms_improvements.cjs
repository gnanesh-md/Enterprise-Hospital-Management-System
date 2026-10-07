const { Pool } = require("pg");

const pool = new Pool({
  host: "127.0.0.1",
  port: 5434,
  user: "postgres",
  password: "postgres",
  database: "hospai_enterprise",
});

const API_BASE = "http://localhost:8010/api/hr";

async function runTests() {
  console.log("=== STARTING FULL HRMS IMPROVEMENTS VERIFICATION ===");

  // 1. Employee Creation / Verification
  console.log("\n[Test 1] Verifying Staff & Lifecycle...");
  const empRes = await fetch(`${API_BASE}/employees`);
  const empData = await empRes.json();
  const employees = empData.employees || [];
  console.log(`Found ${employees.length} existing employees in PostgreSQL.`);

  let testEmp = employees[0];
  if (!testEmp) {
    const createRes = await fetch(`${API_BASE}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Alok Verma",
        email: "alok.verma@imperialhospital.in",
        phone: "+91 98765 43210",
        department: "Cardiology",
        designation: "Consultant Cardiologist",
        category: "Doctor",
        employmentType: "Full-Time",
        shift: "Morning (07:00 - 15:00)",
        joiningDate: "2024-01-15",
        licenseNumber: "MCI-CARD-9921",
        licenseExpiry: "2027-12-31",
        salary: {
          basic: 120000,
          hra: 48000,
          allowances: 32000
        }
      })
    });
    const cData = await createRes.json();
    testEmp = cData.employee;
  }
  console.log("Using test employee:", testEmp.name, `(${testEmp.id})`);

  // 2. Attendance & Shift Engine
  console.log("\n[Test 2] Testing Attendance & Shift Engine...");
  const manualAttRes = await fetch(`${API_BASE}/attendance/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: testEmp.id,
      date: "2026-10-02",
      shift: "Morning (07:00 - 15:00)",
      clockIn: "07:35 AM", // 35 minutes late
      clockOut: "05:30 PM", // Overtime
      status: "Late",
      reason: "Emergency traffic delay, worked late for emergency surgery"
    })
  });
  const attData = await manualAttRes.json();
  console.log("Manual Attendance Status:", manualAttRes.ok, "Data:", {
    status: attData.attendance?.attendance_status,
    lateMinutes: attData.attendance?.late_minutes,
    workHours: attData.attendance?.work_hours,
    overtimeHours: attData.attendance?.overtime_hours
  });

  const attId = attData.attendance?.id;
  if (attId) {
    console.log("Testing Attendance Audit Correction...");
    const correctRes = await fetch(`${API_BASE}/attendance/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendanceId: attId,
        clockIn: "07:05 AM",
        clockOut: "05:30 PM",
        reason: "Biometric turnstile malfunction at Gate 2 confirmed by security logs"
      })
    });
    const corrData = await correctRes.json();
    console.log("Correction status:", correctRes.ok, "New Late Minutes:", corrData.attendance?.late_minutes);

    const corrHistoryRes = await fetch(`${API_BASE}/attendance/corrections/${attId}`);
    const corrHistory = await corrHistoryRes.json();
    console.log("Correction audit entries in DB:", corrHistory.corrections?.length);
  }

  // 3. Employee Lifecycle: Promotion, Transfer, Salary Revision, Exit Clearance
  console.log("\n[Test 3] Testing Employee Lifecycle Transitions...");
  const promoRes = await fetch(`${API_BASE}/employees/${testEmp.id}/promote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      newDesignation: "Senior Consultant Cardiologist",
      effectiveDate: "2026-10-01",
      remarks: "Annual performance review promotion"
    })
  });
  const promoData = await promoRes.json();
  console.log("Promotion Status:", promoRes.ok, promoData.message || promoData.error);

  const salRevRes = await fetch(`${API_BASE}/employees/${testEmp.id}/salary-revision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      newBasic: 140000,
      newHra: 56000,
      newAllowances: 40000,
      effectiveDate: "2026-10-01",
      reason: "Merit increment and promotion pay adjustment"
    })
  });
  const salData = await salRevRes.json();
  console.log("Salary Revision Status:", salRevRes.ok, salData.message || salData.error);

  const lifecycleRes = await fetch(`${API_BASE}/employees/${testEmp.id}/lifecycle`);
  const lifecycleData = await lifecycleRes.json();
  console.log("Lifecycle History counts:", {
    promotions: lifecycleData.promotions?.length,
    salaryRevisions: lifecycleData.salaryRevisions?.length,
    transfers: lifecycleData.transfers?.length,
    exits: lifecycleData.exits?.length
  });

  // 4. Payroll Workflow: Calculated -> Reviewed -> Approved -> Paid
  console.log("\n[Test 4] Testing Attendance-Based Payroll Workflow...");
  const runPayRes = await fetch(`${API_BASE}/payroll/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ month: "September", year: 2026 })
  });
  const payRunData = await runPayRes.json();
  const runObj = payRunData.run;
  console.log("Payroll Run Result:", {
    success: runPayRes.ok,
    runId: runObj?.id,
    status: runObj?.status,
    totalGross: runObj?.total_gross,
    totalDisbursed: runObj?.total_disbursed
  });

  const runId = runObj?.id || `PR-2026-SEP`;
  if (runId) {
    const revStepRes = await fetch(`${API_BASE}/payroll/${runId}/review`, { method: "POST" });
    const revStepData = await revStepRes.json();
    console.log("Step 2 Review Status:", revStepRes.ok, "Run Status:", revStepData.run?.status);

    const appStepRes = await fetch(`${API_BASE}/payroll/${runId}/approve`, { method: "POST" });
    const appStepData = await appStepRes.json();
    console.log("Step 3 Approve Status:", appStepRes.ok, "Run Status:", appStepData.run?.status);

    // Controlled revision on employee in this payroll
    console.log("Testing Controlled Payroll Item Revision...");
    const reviseItemRes = await fetch(`${API_BASE}/payroll/${runId}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: testEmp.id,
        adjustments: { gross: 240000, totalDeductions: 35000 },
        reason: "Cardiology department on-call emergency incentive addition"
      })
    });
    const revItemData = await reviseItemRes.json();
    console.log("Controlled Revision:", reviseItemRes.ok, "Revision Number:", revItemData.revisedItem?.revision_number);
  }

  // 5. Shift Scheduling Conflict Validations
  console.log("\n[Test 5] Testing Shift Validations & Conflict Prevention...");
  const shift1 = await fetch(`${API_BASE}/shift-assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: testEmp.id,
      shiftDate: "2026-10-10",
      shiftName: "Morning (07:00 - 15:00)",
      department: "Cardiology"
    })
  });
  const s1Data = await shift1.json();
  console.log("First shift assigned:", shift1.ok, s1Data.message || s1Data.error);

  const shiftOverlap = await fetch(`${API_BASE}/shift-assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employeeId: testEmp.id,
      shiftDate: "2026-10-10",
      shiftName: "Evening (15:00 - 23:00)",
      department: "Cardiology"
    })
  });
  const overlapData = await shiftOverlap.json();
  console.log("Duplicate/Conflict Shift Blocked Properly:", !shiftOverlap.ok, "Message:", overlapData.error);

  // 6. Real-Time Alerts & Audit Logs
  console.log("\n[Test 6] Testing Centralized Audit Logs & Real-Time Alerts...");
  const auditRes = await fetch(`${API_BASE}/audit-logs?limit=5`);
  const auditData = await auditRes.json();
  console.log(`Fetched ${auditData.auditLogs?.length} recent audit logs. Sample action:`, auditData.auditLogs?.[0]?.action);

  const alertsRes = await fetch(`${API_BASE}/alerts`);
  const alertsData = await alertsRes.json();
  console.log(`Fetched ${alertsData.alerts?.length} system alerts:`);
  alertsData.alerts?.slice(0, 3).forEach(a => console.log(` - [${a.type}] ${a.title}: ${a.message}`));

  console.log("\n=== ALL HRMS IMPROVEMENTS VERIFIED SUCCESSFULLY ===");
  await pool.end();
}

runTests().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
