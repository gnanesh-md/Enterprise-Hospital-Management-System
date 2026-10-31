import { useState } from "react"
import { accountsApi } from "../../services/accounts/client"
import { JournalDetailModal } from "./JournalsView"
import {
  Button, Card, Empty, ErrorNote, Field, Input, Loaded, Money, Notice, PageHeader, Select, Table, Td, Th, formatDate,
  fyStart, today, useAction, useApi,
} from "./ui"

const METHODS = ["Cash", "UPI / Digital", "Credit Card", "Debit Card", "Bank Transfer", "Cheque"]
const DEPARTMENTS = ["Outpatient", "Inpatient", "Emergency", "ICU", "Surgery", "Laboratory", "Radiology", "Pharmacy"]

const blank = { patient_id: "", patient_name: "", bill_no: "", amount: "", method: "Cash", reference: "", department: "Outpatient", date: today() }

export default function ReceiptsView() {
  const [form, setForm] = useState(blank)
  const [notice, setNotice] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const action = useAction()
  const recent = useApi(() => accountsApi.journals({ from: fyStart(), to: today(), voucher_type: "RV", limit: 100 }), [])
  const set = (patch: Partial<typeof blank>) => setForm((f) => ({ ...f, ...patch }))
  const amount = Number(form.amount)
  const valid = form.patient_id.trim() && form.patient_name.trim() && amount > 0

  const submit = () =>
    action.run(
      () =>
        accountsApi.receipt({
          patient: { id: form.patient_id.trim(), name: form.patient_name.trim() },
          amount,
          method: form.method,
          date: form.date,
          bill_no: form.bill_no.trim() || undefined,
          department: form.department,
          reference: form.reference.trim() || undefined,
        }),
      (result) => {
        setNotice(`Receipt posted as ${result.journal_no}.`)
        setForm({ ...blank, method: form.method, department: form.department })
        recent.reload()
      },
    )

  return (
    <div>
      <PageHeader
        title="Receipts"
        subtitle="Money received at the finance desk posts immediately. Against a bill it settles the patient's receivable; any excess — or a receipt with no bill — is held as a patient advance, never lost."
      />
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 items-start">
        <Card title="New receipt">
          <div className="space-y-3">
            <ErrorNote message={action.error} />
            <Notice message={notice} onClose={() => setNotice(null)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Patient UMR / ID"><Input value={form.patient_id} onChange={(e) => set({ patient_id: e.target.value })} /></Field>
              <Field label="Patient name"><Input value={form.patient_name} onChange={(e) => set({ patient_name: e.target.value })} /></Field>
            </div>
            <Field label="Against bill (optional)" hint="Leave empty to take a deposit / advance.">
              <Input value={form.bill_no} onChange={(e) => set({ bill_no: e.target.value })} placeholder="INV-2026-0811" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)"><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set({ amount: e.target.value })} /></Field>
              <Field label="Date"><Input type="date" value={form.date} max={today()} onChange={(e) => set({ date: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Method">
                <Select value={form.method} onChange={(e) => set({ method: e.target.value })}>
                  {METHODS.map((m) => <option key={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Counter / department">
                <Select value={form.department} onChange={(e) => set({ department: e.target.value })}>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
            </div>
            {form.method !== "Cash" && (
              <Field label="Reference (UTR / card slip / cheque no.)">
                <Input value={form.reference} onChange={(e) => set({ reference: e.target.value })} />
              </Field>
            )}
            <Button variant="primary" className="w-full" busy={action.busy} disabled={!valid} onClick={submit}>
              Post receipt
            </Button>
          </div>
        </Card>
        <Card title="Receipts this financial year" padded={false}>
          <Loaded state={recent}>
            {({ journals }) =>
              journals.length === 0 ? (
                <Empty>No receipts posted yet.</Empty>
              ) : (
                <Table dense>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Journal</Th>
                      <Th>Narration</Th>
                      <Th>Source</Th>
                      <Th right>Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {journals.map((j) => (
                      <tr key={j.id} className="hover:bg-[#F8FAFC] cursor-pointer" onClick={() => setOpenId(j.id)}>
                        <Td className="whitespace-nowrap">{formatDate(j.journal_date)}</Td>
                        <Td className="font-mono text-[11.5px] whitespace-nowrap">{j.journal_no}</Td>
                        <Td>{j.narration}{j.status === "reversed" && <span className="text-[#B42318]"> · reversed</span>}</Td>
                        <Td className="text-[#64748B]">{j.source_module}</Td>
                        <Td right><Money value={j.total} /></Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )
            }
          </Loaded>
        </Card>
      </div>
      {openId !== null && <JournalDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={recent.reload} />}
    </div>
  )
}
