-- ============================================================================
-- HOSP-AI ENTERPRISE HOSPITAL MANAGEMENT SYSTEM
-- HRMS & WORKFORCE MANAGEMENT - RELATIONAL POSTGRESQL SCHEMA (v1.0)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations & Branches (Multi-Hospital Tenancy)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospital_branches (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Departments
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    head_of_department_id VARCHAR(50),
    is_clinical BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (hospital_id, name)
);

-- 3. Employees (Master Record with Soft-Delete)
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY, -- e.g. EMP-101
    hospital_id INT NOT NULL DEFAULT 1,
    branch_id INT DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    dob DATE NOT NULL,
    blood_group VARCHAR(10) DEFAULT 'O+',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    avatar_initials VARCHAR(10) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Doctor', 'Nursing', 'Allied Health', 'Administrative', 'Support Staff')),
    employment_type VARCHAR(50) NOT NULL CHECK (employment_type IN ('Full-Time', 'Part-Time', 'Consultant', 'Contract', 'Resident')),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Probation', 'On Leave', 'Suspended', 'Resigned', 'Terminated', 'Retired', 'Inactive')),
    duty_status VARCHAR(50) NOT NULL DEFAULT 'Off Duty' CHECK (duty_status IN ('On Duty', 'Off Duty', 'In Surgery', 'On Break')),
    default_shift VARCHAR(100) NOT NULL DEFAULT 'Morning (07:00 - 15:00)',
    joining_date DATE NOT NULL,
    qualification TEXT NOT NULL,
    license_number VARCHAR(100) DEFAULT 'MCI-PENDING',
    license_expiry DATE,
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_relation VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    reporting_manager_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
    user_account_id VARCHAR(100), -- Linked login user
    is_active BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1, -- Optimistic locking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_hospital ON employees(hospital_id);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_category ON employees(category);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);

-- 4. Employee Employment History (Transfers, Promotions & Status Changes)
CREATE TABLE IF NOT EXISTS employee_employment_history (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    old_department VARCHAR(100),
    new_department VARCHAR(100) NOT NULL,
    old_designation VARCHAR(150),
    new_designation VARCHAR(150) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    effective_from DATE NOT NULL,
    effective_to DATE,
    reason TEXT,
    changed_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Employee Confidential Bank Details
CREATE TABLE IF NOT EXISTS employee_bank_details (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    account_number VARCHAR(100) NOT NULL,
    ifsc_code VARCHAR(50) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    pan_number VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Salary Structures & Historical Structures
CREATE TABLE IF NOT EXISTS salary_structures (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    basic NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hra NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    allowances NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    pf NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    esi NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    professional_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gross NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_by VARCHAR(100) NOT NULL DEFAULT 'HR Administrator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_salary_emp ON salary_structures(employee_id);

-- 7. Shifts Master
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_minutes INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Date-Based Shift Rostering
CREATE TABLE IF NOT EXISTS shift_assignments (
    id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL DEFAULT 1,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    shift_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    is_on_call BOOLEAN DEFAULT FALSE,
    assigned_by VARCHAR(100) NOT NULL DEFAULT 'System',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, shift_date) -- Prevents overlapping roster slots on the same date
);

CREATE INDEX IF NOT EXISTS idx_roster_date ON shift_assignments(shift_date);
CREATE INDEX IF NOT EXISTS idx_roster_emp ON shift_assignments(employee_id);

-- 9. Attendance Logs (Real Clock-in / Clock-out)
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(100) PRIMARY KEY, -- ATT-{empId}-{YYYY-MM-DD}
    hospital_id INT NOT NULL DEFAULT 1,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    attendance_date DATE NOT NULL,
    assigned_shift VARCHAR(100) NOT NULL,
    clock_in VARCHAR(50), -- e.g. '08:05 AM'
    clock_out VARCHAR(50),
    attendance_status VARCHAR(50) NOT NULL DEFAULT 'Present' CHECK (attendance_status IN ('Present', 'Late', 'Absent', 'Half-Day', 'On Leave', 'Weekly Off', 'Holiday')),
    work_hours NUMERIC(5, 2) DEFAULT 0.00,
    overtime_hours NUMERIC(5, 2) DEFAULT 0.00,
    late_minutes INT DEFAULT 0,
    attendance_source VARCHAR(50) DEFAULT 'Staff Portal' CHECK (attendance_source IN ('Biometric', 'Manual', 'System', 'Staff Portal', 'Imported')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp ON attendance(employee_id);

-- 10. Attendance Corrections & Audit
CREATE TABLE IF NOT EXISTS attendance_corrections (
    id SERIAL PRIMARY KEY,
    attendance_id VARCHAR(100) REFERENCES attendance(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    old_clock_in VARCHAR(50),
    new_clock_in VARCHAR(50),
    old_clock_out VARCHAR(50),
    new_clock_out VARCHAR(50),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    correction_reason TEXT NOT NULL,
    corrected_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Configurable Leave Types & Policies
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL DEFAULT 1,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    default_quota_days INT NOT NULL,
    carry_forward_max INT DEFAULT 0,
    requires_attachment BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    year INT NOT NULL DEFAULT 2026,
    casual NUMERIC(5, 1) NOT NULL DEFAULT 12.0,
    casual_used NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    sick NUMERIC(5, 1) NOT NULL DEFAULT 10.0,
    sick_used NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    earned NUMERIC(5, 1) NOT NULL DEFAULT 15.0,
    earned_used NUMERIC(5, 1) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, year)
);

-- 12. Leave Requests & Clinical Handover
CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(50) PRIMARY KEY, -- e.g. LR-2026-001
    hospital_id INT NOT NULL DEFAULT 1,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    staff_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('Casual', 'Sick', 'Earned', 'Maternity', 'Emergency', 'Casual Leave', 'Sick Leave', 'Earned Leave', 'Maternity Leave', 'Emergency Leave')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC(4, 1) NOT NULL,
    reason TEXT NOT NULL,
    handover_note TEXT,
    replacement_staff_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    applied_on DATE NOT NULL DEFAULT CURRENT_DATE,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leave_emp ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- 13. Payroll Cycles & Frozen Payroll Items (Period Snapshots)
CREATE TABLE IF NOT EXISTS payroll_runs (
    id VARCHAR(50) PRIMARY KEY, -- e.g. PR-2026-SEP
    hospital_id INT NOT NULL DEFAULT 1,
    month VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    total_staff INT NOT NULL DEFAULT 0,
    total_gross NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_disbursed NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Calculated', 'Reviewed', 'Approved', 'Paid', 'Locked')),
    executed_by VARCHAR(100) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    locked_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (hospital_id, month, year)
);

CREATE TABLE IF NOT EXISTS payroll_items (
    id SERIAL PRIMARY KEY,
    payroll_run_id VARCHAR(50) REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    staff_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(150) NOT NULL,
    basic NUMERIC(12, 2) NOT NULL,
    hra NUMERIC(12, 2) NOT NULL,
    allowances NUMERIC(12, 2) NOT NULL,
    gross NUMERIC(12, 2) NOT NULL,
    pf NUMERIC(12, 2) NOT NULL,
    esi NUMERIC(12, 2) DEFAULT 0.00,
    professional_tax NUMERIC(12, 2) DEFAULT 0.00,
    tax NUMERIC(12, 2) NOT NULL,
    other_deductions NUMERIC(12, 2) DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL,
    net_pay NUMERIC(12, 2) NOT NULL,
    bank_account_masked VARCHAR(50),
    pan_masked VARCHAR(50),
    bank_name VARCHAR(150),
    ifsc_code VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'On Hold')),
    payment_date DATE,
    transaction_ref VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_emp ON payroll_items(employee_id);

-- 14. Regulatory Credentialing & Licensure (NABH / MCI / NMC / AERB)
CREATE TABLE IF NOT EXISTS employee_credentials (
    id VARCHAR(50) PRIMARY KEY, -- e.g. CRD-101
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    staff_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    credential_type VARCHAR(100) NOT NULL DEFAULT 'Medical Council License',
    authority VARCHAR(200) NOT NULL,
    license_no VARCHAR(100) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    verified_status VARCHAR(50) DEFAULT 'Verified' CHECK (verified_status IN ('Verified', 'Pending Verification', 'Rejected')),
    verified_by VARCHAR(100) DEFAULT 'Chief Medical Officer',
    verified_on DATE DEFAULT CURRENT_DATE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cred_emp ON employee_credentials(employee_id);
CREATE INDEX IF NOT EXISTS idx_cred_expiry ON employee_credentials(valid_until);

-- 15. Clinical Privileging (Hospital Specific Surgical/Clinical Scopes)
CREATE TABLE IF NOT EXISTS employee_privileges (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    privilege_name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    granted_by VARCHAR(100) NOT NULL,
    granted_on DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Revoked')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Employee Documents Vault
CREATE TABLE IF NOT EXISTS employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    verification_status VARCHAR(50) DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
    expiry_date DATE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Immutable Enterprise Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL DEFAULT 1,
    user_id VARCHAR(100) NOT NULL,
    actor_username VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- 18. Notifications System
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL DEFAULT 1,
    recipient_employee_id VARCHAR(50),
    recipient_role VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'WARNING', 'SUCCESS', 'ALERT')),
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INITIAL SEED: Clinical Departments & Standard Leave Policies
-- ============================================================================
INSERT INTO organizations (code, name) VALUES ('HOSP-IMPERIAL', 'Imperial Hospital & Medical Centre') ON CONFLICT DO NOTHING;
INSERT INTO hospital_branches (organization_id, code, name, address) VALUES (1, 'MAIN-CAMPUS', 'Imperial Main Clinical Campus', 'Plot 14, Healthcare Avenue, Hyderabad') ON CONFLICT DO NOTHING;

INSERT INTO departments (hospital_id, name, code, is_clinical) VALUES
(1, 'Cardiology', 'CARD', TRUE),
(1, 'Orthopedics', 'ORTHO', TRUE),
(1, 'Emergency', 'ER', TRUE),
(1, 'Nursing', 'NURS', TRUE),
(1, 'ICU', 'ICU', TRUE),
(1, 'Surgery', 'SURG', TRUE),
(1, 'Pediatrics', 'PED', TRUE),
(1, 'Radiology', 'RAD', TRUE),
(1, 'Laboratory', 'LAB', TRUE),
(1, 'Pharmacy', 'PHARM', FALSE),
(1, 'Gastroenterology', 'GASTRO', TRUE),
(1, 'Administration', 'ADMIN', FALSE),
(1, 'Support Staff', 'SUPP', FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO shifts (hospital_id, name, code, start_time, end_time) VALUES
(1, 'Morning Shift', 'SHIFT_MORN', '07:00:00', '15:00:00'),
(1, 'Evening Shift', 'SHIFT_EVE', '15:00:00', '23:00:00'),
(1, 'Night Shift', 'SHIFT_NIGHT', '23:00:00', '07:00:00'),
(1, 'General Shift', 'SHIFT_GEN', '09:00:00', '17:30:00'),
(1, 'On-Call Shift', 'SHIFT_ONCALL', '00:00:00', '23:59:59')
ON CONFLICT DO NOTHING;

INSERT INTO leave_types (hospital_id, code, name, default_quota_days) VALUES
(1, 'CL', 'Casual Leave', 12),
(1, 'SL', 'Sick Leave', 10),
(1, 'EL', 'Earned Leave', 15),
(1, 'ML', 'Maternity Leave', 90)
ON CONFLICT DO NOTHING;
