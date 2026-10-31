import express from 'express';

const router = express.Router();

// GET /api/accounts/summary
router.get('/summary', (req, res) => {
  res.json({
    status: 'success',
    fiscal_year: '2026-2027',
    active_period: 'April 2026',
    ledger_status: 'Balanced',
    double_entry_enforced: true,
  });
});

// GET /api/accounts/coa
router.get('/coa', (req, res) => {
  res.json({
    status: 'success',
    categories: ['Asset', 'Liability', 'Equity', 'Income', 'Expense'],
    total_accounts: 35,
  });
});

export default router;
