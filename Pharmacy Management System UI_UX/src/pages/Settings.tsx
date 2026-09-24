import { useState } from "react"
import {
  Building2,
  Receipt,
  Package,
  ClipboardList,
  Bell,
  Shield,
  ChevronRight,
  Save,
} from "lucide-react"
import PageHeader from "../components/PageHeader"

const sections = [
  {
    id: "pharmacy",
    icon: Building2,
    label: "Pharmacy",
    desc: "Basic information, logo, contact",
  },
  {
    id: "billing",
    icon: Receipt,
    label: "Billing",
    desc: "Invoice format, taxes, discounts",
  },
  {
    id: "inventory",
    icon: Package,
    label: "Inventory",
    desc: "Reorder rules, expiry alerts",
  },
  {
    id: "prescription",
    icon: ClipboardList,
    label: "Prescription",
    desc: "OCR, AI verification, workflow",
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    desc: "Email, SMS, in-app",
  },
  {
    id: "security",
    icon: Shield,
    label: "Users & Security",
    desc: "Password policy, 2FA, sessions",
  },
]

interface SettingsProps {
  onNavigate: (page: string) => void
}

export default function Settings({ onNavigate }: SettingsProps) {
  const [active, setActive] = useState("pharmacy")

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Settings" }]}
        title="Settings"
        description="Configure your pharmacy system"
        onNavigate={onNavigate}
      />

      <div className="flex gap-5">
        {/* Left nav */}
        <div className="w-56 flex-shrink-0 space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all"
              style={{
                background: active === s.id ? "#eff6ff" : "#fff",
                borderColor: active === s.id ? "#bfdbfe" : "#e2e8f0",
              }}
            >
              <s.icon
                size={15}
                style={{ color: active === s.id ? "#2563eb" : "#64748b" }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: active === s.id ? "#2563eb" : "#0f172a" }}
                >
                  {s.label}
                </p>
                <p className="text-[11px] text-[#94a3b8] truncate">{s.desc}</p>
              </div>
              <ChevronRight
                size={12}
                style={{ color: active === s.id ? "#2563eb" : "#94a3b8" }}
              />
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 space-y-5">
          {active === "pharmacy" && <PharmacySettings />}
          {active === "billing" && <BillingSettings />}
          {active === "inventory" && <InventorySettings />}
          {active === "prescription" && <PrescriptionSettings />}
          {active === "notifications" && <NotificationSettings />}
          {active === "security" && <SecuritySettings />}
        </div>
      </div>
    </div>
  )
}

function SettingsCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#f1f5f9]">
        <p className="font-semibold text-[15px] text-[#0f172a]">{title}</p>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  desc,
  children,
}: {
  label: string
  desc?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="flex-1">
        <p className="text-[13px] font-medium text-[#0f172a]">{label}</p>
        {desc && <p className="text-[12px] text-[#94a3b8] mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <button
      onClick={() => setOn(!on)}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? "#2563eb" : "#e2e8f0" }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
        style={{ left: on ? "22px" : "2px" }}
      />
    </button>
  )
}

function SaveButton() {
  return (
    <button
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[13px] font-medium"
      style={{ background: "#2563eb" }}
    >
      <Save size={13} /> Save Changes
    </button>
  )
}

function Input({
  placeholder,
  defaultValue,
}: {
  placeholder?: string
  defaultValue?: string
}) {
  return (
    <input
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none transition-colors w-64"
    />
  )
}

function PharmacySettings() {
  return (
    <SettingsCard title="Pharmacy Information">
      {[
        { label: "Pharmacy Name", value: "MedCare Pharmacy" },
        { label: "GSTIN", value: "29AABCM1234A1Z5" },
        { label: "Drug License No.", value: "DL/KA/2022/0987" },
        { label: "Phone", value: "+91 80 1234 5678" },
        { label: "Email", value: "info@medcare.in" },
        { label: "Address", value: "123, MG Road, Bangalore - 560001" },
      ].map((f) => (
        <Field key={f.label} label={f.label}>
          <Input defaultValue={f.value} />
        </Field>
      ))}
      <div className="flex justify-end pt-2">
        <SaveButton />
      </div>
    </SettingsCard>
  )
}

function BillingSettings() {
  return (
    <div className="space-y-5">
      <SettingsCard title="Invoice Settings">
        <Field label="Invoice Prefix" desc="Prefix for all generated invoices">
          <Input defaultValue="INV-2026-" />
        </Field>
        <Field
          label="Default GST Slab"
          desc="Applied when medicine GST is not specified"
        >
          <select className="px-3 py-2 rounded-lg border border-[#e2e8f0] text-[13px] focus:border-[#2563eb] focus:outline-none w-40">
            <option>5%</option>
            <option>12%</option>
            <option>18%</option>
          </select>
        </Field>
        <Field
          label="Allow Bill Hold"
          desc="Enable pharmacists to hold bills for later"
        >
          <Toggle defaultChecked={true} />
        </Field>
        <Field label="Round Off" desc="Round invoice total to nearest rupee">
          <Toggle defaultChecked={true} />
        </Field>
        <div className="flex justify-end pt-2">
          <SaveButton />
        </div>
      </SettingsCard>
      <SettingsCard title="Payment Methods">
        {["Cash", "Card", "UPI", "Insurance", "Credit"].map((m) => (
          <Field key={m} label={m}>
            <Toggle defaultChecked />
          </Field>
        ))}
      </SettingsCard>
    </div>
  )
}

function InventorySettings() {
  return (
    <div className="space-y-5">
      <SettingsCard title="Reorder Alerts">
        <Field
          label="Enable Low Stock Alerts"
          desc="Notify when stock falls below reorder level"
        >
          <Toggle defaultChecked />
        </Field>
        <Field
          label="Low Stock Threshold"
          desc="Percentage below reorder level to trigger alert"
        >
          <Input defaultValue="80%" />
        </Field>
        <div className="flex justify-end pt-2">
          <SaveButton />
        </div>
      </SettingsCard>
      <SettingsCard title="Expiry Alerts">
        {[
          { label: "90-day expiry alert", checked: true },
          { label: "60-day expiry alert", checked: true },
          { label: "30-day expiry alert", checked: true },
          { label: "15-day critical alert", checked: true },
        ].map((a) => (
          <Field key={a.label} label={a.label}>
            <Toggle defaultChecked={a.checked} />
          </Field>
        ))}
      </SettingsCard>
    </div>
  )
}

function PrescriptionSettings() {
  return (
    <SettingsCard title="Prescription Verification">
      <Field
        label="Require pharmacist verification"
        desc="Every prescription must be verified before dispensing"
      >
        <Toggle defaultChecked />
      </Field>
      <Field
        label="Enable OCR scanning"
        desc="AI-powered prescription image scanning"
      >
        <Toggle defaultChecked />
      </Field>
      <Field
        label="AI confidence threshold"
        desc="Minimum confidence for auto-verification"
      >
        <Input defaultValue="90%" />
      </Field>
      <Field
        label="Flag medium confidence"
        desc="Highlight fields with 75–90% confidence"
      >
        <Toggle defaultChecked />
      </Field>
      <div className="flex justify-end pt-2">
        <SaveButton />
      </div>
    </SettingsCard>
  )
}

function NotificationSettings() {
  return (
    <div className="space-y-5">
      {["Email Notifications", "SMS Notifications", "In-App Notifications"].map(
        (channel) => (
          <SettingsCard key={channel} title={channel}>
            {[
              "Low stock alerts",
              "Expiry alerts",
              "New prescriptions",
              "Purchase order updates",
              "System alerts",
            ].map((n) => (
              <Field key={n} label={n}>
                <Toggle defaultChecked={n !== "System alerts"} />
              </Field>
            ))}
          </SettingsCard>
        ),
      )}
    </div>
  )
}

function SecuritySettings() {
  return (
    <div className="space-y-5">
      <SettingsCard title="Password Policy">
        <Field label="Minimum password length">
          <Input defaultValue="8" />
        </Field>
        <Field label="Require uppercase letters">
          <Toggle defaultChecked />
        </Field>
        <Field label="Require numbers">
          <Toggle defaultChecked />
        </Field>
        <Field label="Require special characters">
          <Toggle />
        </Field>
        <Field label="Password expiry (days)">
          <Input defaultValue="90" />
        </Field>
        <div className="flex justify-end pt-2">
          <SaveButton />
        </div>
      </SettingsCard>
      <SettingsCard title="Session & Access">
        <Field label="Session timeout (minutes)">
          <Input defaultValue="30" />
        </Field>
        <Field label="Two-factor authentication">
          <Toggle />
        </Field>
        <Field
          label="Enable audit logging"
          desc="Log all user actions for compliance"
        >
          <Toggle defaultChecked />
        </Field>
      </SettingsCard>
    </div>
  )
}
