import { useState } from "react"
import {
  Plus,
  Eye,
  Edit2,
  Phone,
  Mail,
  X,
  Building2,
  CreditCard,
  History,
} from "lucide-react"
import { suppliers } from "../data/mockData"
import PageHeader from "../components/PageHeader"
import StatusBadge from "../components/StatusBadge"

interface SuppliersProps {
  onNavigate: (page: string) => void
}

export default function Suppliers({ onNavigate }: SuppliersProps) {
  const [selected, setSelected] = useState<typeof suppliers[0] | null>(null)

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "Pharmacy" },
          { label: "Inventory" },
          { label: "Suppliers" },
        ]}
        title="Supplier Management"
        description={`${suppliers.length} suppliers · ₹${(suppliers.reduce((s, x) => s + x.outstanding, 0) / 1000).toFixed(0)}K outstanding`}
        actions={
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-medium"
            style={{ background: "#2563eb" }}
          >
            <Plus size={14} /> Add Supplier
          </button>
        }
        onNavigate={onNavigate}
      />

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Contact Person</th>
              <th>Phone / Email</th>
              <th>GSTIN</th>
              <th>Outstanding</th>
              <th>Last Purchase</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td>
                  <p className="font-semibold text-[13px] text-[#0f172a]">
                    {s.name}
                  </p>
                  <p className="text-[11px] text-[#94a3b8]">{s.address}</p>
                </td>
                <td className="text-[13px] text-[#374151]">{s.contact}</td>
                <td>
                  <p className="text-[12px] flex items-center gap-1 text-[#374151]">
                    <Phone size={11} /> {s.phone}
                  </p>
                  <p className="text-[12px] flex items-center gap-1 text-[#64748b] mt-0.5">
                    <Mail size={11} /> {s.email}
                  </p>
                </td>
                <td className="font-mono text-[12px] text-[#64748b]">
                  {s.gstin}
                </td>
                <td>
                  <span
                    className="font-semibold text-[13px]"
                    style={{ color: s.outstanding > 0 ? "#d97706" : "#15803d" }}
                  >
                    ₹{s.outstanding.toLocaleString("en-IN")}
                  </span>
                  <p className="text-[11px] text-[#94a3b8]">
                    Limit: ₹{(s.creditLimit / 1000).toFixed(0)}K
                  </p>
                </td>
                <td className="text-[12px] text-[#64748b]">{s.lastPurchase}</td>
                <td>
                  <StatusBadge status={s.status} size="sm" />
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelected(s)}
                      className="p-1.5 rounded hover:bg-[#f1f5f9] text-[#64748b] transition-colors"
                    >
                      <Eye size={13} />
                    </button>
                    <button className="p-1.5 rounded hover:bg-[#eff6ff] text-[#2563eb] transition-colors">
                      <Edit2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Supplier Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1" onClick={() => setSelected(null)} />
          <div className="w-[480px] bg-white shadow-2xl border-l border-[#e2e8f0] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
              <p className="font-bold text-[16px] text-[#0f172a]">
                {selected.name}
              </p>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-[#f1f5f9] text-[#94a3b8]"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <Section
                icon={<Building2 size={14} />}
                title="Company Information"
              >
                <Row label="Supplier Name" value={selected.name} />
                <Row label="Address" value={selected.address} />
                <Row label="GSTIN" value={selected.gstin} mono />
                <Row label="Drug License" value={selected.drugLicense} mono />
              </Section>
              <Section icon={<Phone size={14} />} title="Contact">
                <Row label="Contact Person" value={selected.contact} />
                <Row label="Phone" value={selected.phone} />
                <Row label="Email" value={selected.email} />
              </Section>
              <Section icon={<CreditCard size={14} />} title="Financial">
                <Row
                  label="Credit Limit"
                  value={`₹${selected.creditLimit.toLocaleString("en-IN")}`}
                />
                <Row label="Payment Terms" value={selected.paymentTerms} />
                <Row
                  label="Outstanding Balance"
                  value={`₹${selected.outstanding.toLocaleString("en-IN")}`}
                  highlight={selected.outstanding > 0}
                />
              </Section>
              <Section icon={<History size={14} />} title="Purchase Summary">
                <Row
                  label="Total Purchase Value"
                  value={`₹${selected.totalPurchase.toLocaleString("en-IN")}`}
                />
                <Row label="Last Purchase" value={selected.lastPurchase} />
                <Row label="Status">
                  <StatusBadge status={selected.status} size="sm" />
                </Row>
              </Section>
            </div>
            <div className="p-5 border-t border-[#e2e8f0] flex gap-3">
              <button
                className="flex-1 py-2.5 rounded-xl text-white font-semibold text-[13px]"
                style={{ background: "#2563eb" }}
              >
                Create Purchase Order
              </button>
              <button className="flex-1 py-2.5 rounded-xl border border-[#e2e8f0] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition-colors">
                Edit Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-[#64748b]">{icon}</span>
        <p className="text-[12px] font-semibold text-[#64748b] uppercase tracking-wide">
          {title}
        </p>
      </div>
      <div className="space-y-2.5 pl-5">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  children,
  mono,
  highlight,
}: {
  label: string
  value?: string
  children?: React.ReactNode
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-[#94a3b8] flex-shrink-0">{label}</span>
      {children ?? (
        <span
          className={`text-right font-medium ${
            mono ? "font-mono text-[12px]" : "text-[13px]"
          }`}
          style={{ color: highlight ? "#d97706" : "#0f172a" }}
        >
          {value}
        </span>
      )}
    </div>
  )
}
