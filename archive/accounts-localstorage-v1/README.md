# Accounts module — localStorage prototype (retired)

The first Accounts & Finance module: a double-entry engine that kept the ledger in
each browser's localStorage (`hospai_accounts_*_v1` keys). Retired in favour of the
server-side general ledger in `keppler-backend/backend/modules/accounts/`; see
`ACCOUNTS_MODULE_DOCUMENTATION.md` at the repo root for the current architecture.

Kept for reference only -- nothing imports it. Why it was replaced:

- every browser kept its own, different set of books;
- account balances were stored and edited directly instead of derived from
  journals, and the seeded chart did not balance (trial balance off by ₹66.4 lakh,
  accumulated depreciation added to assets);
- journal numbers were random (collisions and gaps possible);
- the operational sync invented a ₹1,000 amount for bills without one, and booked
  ER bills as IPD revenue;
- voucher and journal writes were separate steps, so a failure in between left
  the two inconsistent.
