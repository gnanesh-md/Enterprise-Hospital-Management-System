import express from 'express';
import { query, withTransaction } from '../db/index.mjs';
import { requireHrAdmin } from '../middleware/auth.mjs';
import { logAudit } from '../services/audit.mjs';
import { createNotification } from '../services/notifications.mjs';

const router = express.Router();

// ── GET /api/hr/leaves ───────────────────────────────────────────────────────
router.get('/leaves', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId || 1;
    const employeeId = req.query.employeeId || (!req.user.isAdmin ? req.user.employeeId : null);

    let sql = `
      SELECT 
        lr.id,
        lr.employee_id as "staffId",
        lr.staff_name as "staffName",
        lr.department,
        lr.leave_type as "leaveType",
        lr.start_date as "startDate",
        lr.end_date as "endDate",
        lr.days,
        lr.reason,
        lr.handover_note as "handoverNote",
        lr.replacement_staff_id as "replacementStaffId",
        lr.status,
        lr.applied_on as "appliedOn",
        lr.reviewed_by as "reviewedBy",
        lr.reviewed_at as "reviewedAt",
        lr.remarks
      FROM leave_requests lr
      WHERE lr.hospital_id = $1
    `;
    const params = [hospitalId];

    if (employeeId) {
      sql += ' AND lr.employee_id = $2';
      params.push(employeeId);
    }

    sql += ' ORDER BY lr.created_at DESC;';

    const result = await query(sql, params);
    return res.json({ leaves: result.rows });
  } catch (err) {
    console.error('Error fetching leaves:', err);
    return res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// ── POST /api/hr/leaves (Apply Leave) ───────────────────────────────────────
router.post('/leaves', async (req, res) => {
  try {
    const hospitalId = req.user.hospitalId || 1;
    let { staffId, leaveType, startDate, endDate, days, reason, handoverNote, replacementStaffId } = req.body;
    staffId = staffId || req.body.employeeId;

    // Normal staff cannot apply for someone else; force own ID
    if (!req.user.isAdmin && req.user.employeeId) {
      staffId = req.user.employeeId;
    }

    if (!staffId || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'Missing required leave application fields' });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: 'Start date cannot be after end date' });
    }

    const calcDays = days ? parseFloat(days) : Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);

    const result = await withTransaction(async (client) => {
      // 1. Fetch employee & balance
      const empRes = await client.query('SELECT * FROM employees WHERE id = $1 AND hospital_id = $2', [staffId, hospitalId]);
      if (empRes.rows.length === 0) throw new Error('Employee not found');
      const emp = empRes.rows[0];

      const balRes = await client.query('SELECT * FROM leave_balances WHERE employee_id = $1 AND year = 2026', [staffId]);
      if (balRes.rows.length === 0) throw new Error('Leave quota balance not configured for employee');
      const bal = balRes.rows[0];

      // Check quota sufficiency
      if (leaveType.startsWith('Casual') && (parseFloat(bal.casual) - parseFloat(bal.casual_used)) < calcDays) {
        throw new Error(`Insufficient Casual Leave balance. Available: ${bal.casual - bal.casual_used} days, requested: ${calcDays} days`);
      }
      if (leaveType.startsWith('Sick') && (parseFloat(bal.sick) - parseFloat(bal.sick_used)) < calcDays) {
        throw new Error(`Insufficient Sick Leave balance. Available: ${bal.sick - bal.sick_used} days, requested: ${calcDays} days`);
      }
      if (leaveType.startsWith('Earned') && (parseFloat(bal.earned) - parseFloat(bal.earned_used)) < calcDays) {
        throw new Error(`Insufficient Earned Leave balance. Available: ${bal.earned - bal.earned_used} days, requested: ${calcDays} days`);
      }

      // Generate Leave Request ID
      const countRes = await client.query('SELECT COUNT(*) FROM leave_requests WHERE hospital_id = $1', [hospitalId]);
      const nextNum = String(parseInt(countRes.rows[0].count, 10) + 1).padStart(3, '0');
      const leaveId = `LR-2026-${nextNum}`;

      const insertSql = `
        INSERT INTO leave_requests (
          id, hospital_id, employee_id, staff_name, department, leave_type,
          start_date, end_date, days, reason, handover_note, replacement_staff_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending')
        RETURNING *;
      `;

      const insertRes = await client.query(insertSql, [
        leaveId, hospitalId, staffId, emp.name, emp.department, leaveType,
        startDate, endDate, calcDays, reason, handoverNote || null, replacementStaffId || null
      ]);

      // Notify HR Admin
      await createNotification({
        client,
        hospitalId,
        recipientRole: 'ROLE_ADMIN',
        title: 'New Leave Application',
        message: `${emp.name} (${emp.department}) applied for ${calcDays} days of ${leaveType}.`,
        type: 'INFO',
        actionUrl: '/hrms?tab=leaves',
      });

      await logAudit({
        client,
        hospitalId,
        userId: req.user.userId,
        actorUsername: req.user.username,
        employeeId: staffId,
        action: 'LEAVE_APPLIED',
        entityType: 'LEAVE_REQUEST',
        entityId: leaveId,
        newValue: insertRes.rows[0],
      });

      return insertRes.rows[0];
    });

    return res.status(201).json({
      message: 'Leave application submitted successfully for HR approval',
      leave: result,
    });
  } catch (err) {
    console.error('Error applying for leave:', err);
    return res.status(400).json({ error: err.message || 'Failed to submit leave application' });
  }
});

// ── POST /api/hr/leaves/:id/approve (Atomic HR Approval Transaction) ────────
router.post('/leaves/:id/approve', requireHrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.hospitalId || 1;
    const remarks = req.body.remarks || 'Approved by HR Administration';

    const result = await withTransaction(async (client) => {
      // 1. Fetch leave request with lock
      const leaveRes = await client.query('SELECT * FROM leave_requests WHERE id = $1 AND hospital_id = $2 FOR UPDATE', [id, hospitalId]);
      if (leaveRes.rows.length === 0) throw new Error('Leave request not found');
      const leave = leaveRes.rows[0];

      if (leave.status !== 'Pending') {
        throw new Error(`Cannot approve a leave request that is already ${leave.status}`);
      }

      // 2. Update leave status
      await client.query(`
        UPDATE leave_requests SET
          status = 'Approved',
          reviewed_by = $1,
          reviewed_at = CURRENT_TIMESTAMP,
          remarks = $2
        WHERE id = $3;
      `, [req.user.username, remarks, id]);

      // 3. Deduct leave quota balance
      if (leave.leave_type.startsWith('Casual')) {
        await client.query('UPDATE leave_balances SET casual_used = casual_used + $1 WHERE employee_id = $2 AND year = 2026', [leave.days, leave.employee_id]);
      } else if (leave.leave_type.startsWith('Sick')) {
        await client.query('UPDATE leave_balances SET sick_used = sick_used + $1 WHERE employee_id = $2 AND year = 2026', [leave.days, leave.employee_id]);
      } else if (leave.leave_type.startsWith('Earned')) {
        await client.query('UPDATE leave_balances SET earned_used = earned_used + $1 WHERE employee_id = $2 AND year = 2026', [leave.days, leave.employee_id]);
      }

      // 4. Update Shift Roster to "On Leave" for dates in range
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        await client.query(`
          INSERT INTO shift_assignments (
            hospital_id, employee_id, shift_date, shift_name, department, notes, assigned_by
          ) VALUES ($1, $2, $3, 'On Leave', $4, 'Approved Clinical Leave', 'HR System')
          ON CONFLICT (employee_id, shift_date) DO UPDATE SET
            shift_name = 'On Leave',
            notes = 'Approved Clinical Leave';
        `, [hospitalId, leave.employee_id, dateStr, leave.department]);
      }

      // 5. If today is within leave range, mark employee On Leave and update attendance
      const todayStr = new Date().toISOString().split('T')[0];
      const startStr = leave.start_date.toISOString().split('T')[0];
      const endStr = leave.end_date.toISOString().split('T')[0];

      if (startStr <= todayStr && endStr >= todayStr) {
        await client.query(`
          UPDATE employees SET
            status = 'On Leave',
            duty_status = 'Off Duty',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1;
        `, [leave.employee_id]);

        await client.query(`
          UPDATE attendance SET
            attendance_status = 'On Leave',
            clock_in = '---',
            clock_out = '---',
            work_hours = 0,
            updated_at = CURRENT_TIMESTAMP
          WHERE employee_id = $1 AND attendance_date = $2;
        `, [leave.employee_id, todayStr]);
      }

      // 6. Notify Employee
      await createNotification({
        client,
        hospitalId,
        recipientEmployeeId: leave.employee_id,
        title: 'Leave Approved',
        message: `Your ${leave.leave_type} request for ${leave.days} day(s) has been approved by HR.`,
        type: 'SUCCESS',
        actionUrl: '/employees',
      });

      // 7. Write Audit Log
      await logAudit({
        client,
        hospitalId,
        userId: req.user.userId,
        actorUsername: req.user.username,
        employeeId: leave.employee_id,
        action: 'LEAVE_APPROVED',
        entityType: 'LEAVE_REQUEST',
        entityId: id,
        oldValue: { status: leave.status },
        newValue: { status: 'Approved', days: leave.days, type: leave.leave_type },
        reason: remarks,
      });

      return { id, status: 'Approved' };
    });

    return res.json({ message: 'Leave request approved successfully and roster updated', leave: result });
  } catch (err) {
    console.error('Error approving leave:', err);
    return res.status(500).json({ error: err.message || 'Failed to approve leave request' });
  }
});

// ── POST /api/hr/leaves/:id/reject ──────────────────────────────────────────
router.post('/leaves/:id/reject', requireHrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.hospitalId || 1;
    const remarks = req.body.remarks || 'Rejected by HR Administration';

    const result = await withTransaction(async (client) => {
      const leaveRes = await client.query('SELECT * FROM leave_requests WHERE id = $1 AND hospital_id = $2 FOR UPDATE', [id, hospitalId]);
      if (leaveRes.rows.length === 0) throw new Error('Leave request not found');
      const leave = leaveRes.rows[0];

      if (leave.status !== 'Pending') {
        throw new Error(`Cannot reject a leave request that is already ${leave.status}`);
      }

      await client.query(`
        UPDATE leave_requests SET
          status = 'Rejected',
          reviewed_by = $1,
          reviewed_at = CURRENT_TIMESTAMP,
          remarks = $2
        WHERE id = $3;
      `, [req.user.username, remarks, id]);

      await createNotification({
        client,
        hospitalId,
        recipientEmployeeId: leave.employee_id,
        title: 'Leave Rejected',
        message: `Your ${leave.leave_type} request was not approved: ${remarks}`,
        type: 'ALERT',
        actionUrl: '/employees',
      });

      await logAudit({
        client,
        hospitalId,
        userId: req.user.userId,
        actorUsername: req.user.username,
        employeeId: leave.employee_id,
        action: 'LEAVE_REJECTED',
        entityType: 'LEAVE_REQUEST',
        entityId: id,
        oldValue: { status: leave.status },
        newValue: { status: 'Rejected', remarks },
        reason: remarks,
      });

      return { id, status: 'Rejected' };
    });

    return res.json({ message: 'Leave request rejected', leave: result });
  } catch (err) {
    console.error('Error rejecting leave:', err);
    return res.status(500).json({ error: err.message || 'Failed to reject leave request' });
  }
});

export default router;
