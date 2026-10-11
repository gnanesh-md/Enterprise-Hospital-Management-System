import { accountsApi } from "../../services/accounts/client"
import type { AccountsSubTab } from "../AccountsModule"
import { Card, Empty, Grid, Loaded, Money, PageHeader, Pill, Stat, Table, Td, Th, formatDate, formatINRShort, useApi } from "./ui"

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}

export default function FinanceDashboard({ onNavigate, feedRevision }: { onNavigate: (tab: AccountsSubTab) => void; feedRevision: number }) {
  const state = useApi(() => accountsApi.overview(), [feedRevision])

  return (
    <div>
      <PageHeader
        title="Finance overview"
        subtitle="Live from the general ledger. Every figure is derived from posted journals; nothing here is stored separately."
      />
      <Loaded state={state}>
        {(o) => {
          const revenueTotal = o.revenue_by_section.reduce((s, r) => s + r.amount, 0)
          return (
            <div className="space-y-4">
              {(o.pending_approvals > 0 || o.posting_exceptions > 0) && (
                <div className="flex flex-wrap gap-2">
                  {o.pending_approvals > 0 && (
                    <button onClick={() => onNavigate("manager")} className="text-left">
                      <Pill tone="amber">{o.pending_approvals} voucher(s) awaiting approval</Pill>
                    </button>
                  )}
                  {o.posting_exceptions > 0 && (
                    <button onClick={() => onNavigate("audit")} className="text-left">
                      <Pill tone="red">{o.posting_exceptions} operational entr{o.posting_exceptions === 1 ? "y" : "ies"} could not post</Pill>
                    </button>
                  )}
                </div>
              )}

              <Grid cols={5}>
                <Stat label="Cash in hand" value={formatINRShort(o.cash)} onClick={() => onNavigate("cash_bank")} />
                <Stat label="Bank balances" value={formatINRShort(o.bank)} onClick={() => onNavigate("cash_bank")} />
                <Stat
                  label="Receivables"
                  value={formatINRShort(o.receivables)}
                  hint={o.receivables_overdue_90 > 0 ? `${formatINRShort(o.receivables_overdue_90)} over 90 days` : "Nothing over 90 days"}
                  tone={o.receivables_overdue_90 > 0 ? "warn" : "default"}
                  onClick={() => onNavigate("ar")}
                />
                <Stat label="Payables" value={formatINRShort(o.payables)} onClick={() => onNavigate("ap")} />
                <Stat
                  label="Surplus, year to date"
                  value={formatINRShort(o.year.surplus)}
                  hint={`Since ${formatDate(o.year.from)}`}
                  tone={o.year.surplus < 0 ? "bad" : "good"}
                  onClick={() => onNavigate("statements")}
                />
              </Grid>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="This month" padded={false}>
                  <Table>
                    <tbody>
                      <tr>
                        <Td>Income</Td>
                        <Td right><Money value={o.month.income} /></Td>
                      </tr>
                      <tr>
                        <Td>Expenses</Td>
                        <Td right><Money value={o.month.expense} /></Td>
                      </tr>
                      <tr>
                        <Td className="font-semibold">Surplus</Td>
                        <Td right><Money value={o.month.surplus} strong /></Td>
                      </tr>
                    </tbody>
                  </Table>
                </Card>

                <Card title="Income by service line, year to date" padded={false}>
                  {o.revenue_by_section.length === 0 ? (
                    <Empty>No income posted this financial year yet.</Empty>
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Service line</Th>
                          <Th right>Amount</Th>
                          <Th right>Share</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.revenue_by_section.map((r) => (
                          <tr key={r.name}>
                            <Td>{r.name}</Td>
                            <Td right><Money value={r.amount} /></Td>
                            <Td right className="tabular-nums text-[#64748B]">
                              {revenueTotal ? `${((r.amount / revenueTotal) * 100).toFixed(1)}%` : "—"}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card>
              </div>

              <Card title="Month by month, this financial year" padded={false}>
                {o.trend.length === 0 ? (
                  <Empty>No income or expense posted this financial year yet.</Empty>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Month</Th>
                        <Th right>Income</Th>
                        <Th right>Expenses</Th>
                        <Th right>Surplus</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.trend.map((t) => (
                        <tr key={t.month}>
                          <Td>{monthLabel(t.month)}</Td>
                          <Td right><Money value={t.income} /></Td>
                          <Td right><Money value={t.expense} /></Td>
                          <Td right><Money value={t.income - t.expense} strong /></Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            </div>
          )
        }}
      </Loaded>
    </div>
  )
}
