import { useState } from "react"
import { Eye, EyeOff, Activity, Lock, Mail, Shield } from "lucide-react"

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("kavitha@medcare.in")
  const [password, setPassword] = useState("••••••••••")
  const [remember, setRemember] = useState(false)

  return (
    <div className="min-h-screen flex" style={{ background: "#0f172a" }}>
      {/* Left: Visual */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-12 relative z-10">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8"
            style={{ background: "#0f766e" }}
          >
            <Activity size={36} className="text-white" />
          </div>
          <h1 className="text-[32px] font-bold text-white text-center leading-tight mb-4">
            MedCare Pharmacy
            <br />
            Management System
          </h1>
          <p className="text-[16px] text-[#94a3b8] text-center max-w-sm">
            Streamlining prescription workflows, inventory control, and billing
            for modern healthcare facilities.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-4 w-full max-w-md">
            {[
              {
                label: "Prescriptions",
                value: "50K+",
                sub: "processed monthly",
              },
              { label: "Accuracy", value: "99.8%", sub: "dispensing accuracy" },
              { label: "Time Saved", value: "40%", sub: "vs manual workflows" },
            ].map((s) => (
              <div
                key={s.label}
                className="text-center p-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <p className="text-[22px] font-bold text-white">{s.value}</p>
                <p className="text-[11px] font-medium text-[#94a3b8] mt-0.5">
                  {s.label}
                </p>
                <p className="text-[10px] text-[#64748b] mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="p-8 text-[12px] text-[#475569] flex items-center gap-2">
          <Shield size={13} />
          <span>
            HIPAA Compliant · ISO 27001 Certified · 256-bit SSL Encrypted
          </span>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="w-full lg:w-[440px] flex flex-col justify-center bg-white p-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "#0f766e" }}
            >
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-bold text-[16px] text-[#0f172a]">
              MedCare Pharmacy
            </span>
          </div>
          <h2 className="text-[26px] font-bold text-[#0f172a]">Welcome back</h2>
          <p className="text-[14px] text-[#64748b] mt-1">
            Sign in to your pharmacy account
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            onLogin()
          }}
        >
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] uppercase tracking-wide mb-1.5">
              Email / Username
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full pl-9 pr-3 py-3 rounded-xl border border-[#e2e8f0] text-[14px] text-[#0f172a] focus:border-[#2563eb] focus:outline-none transition-colors"
                placeholder="your@email.in"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-[#374151] uppercase tracking-wide">
                Password
              </label>
              <button
                type="button"
                className="text-[12px] font-medium"
                style={{ color: "#2563eb" }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                className="w-full pl-9 pr-10 py-3 rounded-xl border border-[#e2e8f0] text-[14px] text-[#0f172a] focus:border-[#2563eb] focus:outline-none transition-colors"
                placeholder="••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#374151]"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-[#e2e8f0] accent-[#2563eb]"
            />
            <label htmlFor="remember" className="text-[13px] text-[#374151]">
              Remember me on this device
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl text-white font-semibold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: "#2563eb" }}
          >
            Sign In
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#f1f5f9] flex items-center justify-center gap-2 text-[12px] text-[#94a3b8]">
          <Shield size={12} />
          <span>Secure Pharmacy Management System</span>
        </div>
        <p className="text-center text-[11px] text-[#94a3b8] mt-2">
          MedCare PMS v2.1.0 · For authorized users only
        </p>
      </div>
    </div>
  )
}
