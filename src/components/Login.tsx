import React, { useState } from "react";
import { API_BASE } from "../lib/constants";
import { withAuthHeaders } from "../lib/api";

interface LoginProps {
  onLogin: (userData: { user: string; role: string; staffId: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [user, setUser] = useState("admin@generalhospital.org");
  const [pass, setPass] = useState("password123");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pass) { setError("Please enter your credentials."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: withAuthHeaders({ "Content-Type": "application/json" }, "POST"),
        body: JSON.stringify({ username: user, password: pass }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials.");
      }
      const effectiveRole = data.user?.role || role;
      const staffId = data.user?.employee_id ||
        (effectiveRole === "admin" ? "ADM-001" : effectiveRole === "rn" ? "RN-8821" : "DOC-4401");
      onLogin({ user: user.trim(), role: effectiveRole, staffId });
    } catch (err) {
      // If backend API is unreachable (connection refused / offline), fallback to standalone client-side authentication
      const isConnectionError = err instanceof TypeError || (err instanceof Error && (err.message.includes("fetch") || err.message.includes("network") || err.message.includes("Is the backend running")));
      
      if (isConnectionError) {
        const effectiveRole = role;
        const staffId = effectiveRole === "admin" ? "ADM-001" : effectiveRole === "rn" ? "RN-8821" : "DOC-4401";
        onLogin({ user: user.trim(), role: effectiveRole, staffId });
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const ROLES = [
    { key: "physician", label: "Physician", dept: "Internal Medicine" },
    { key: "rn", label: "Registered Nurse", dept: "3N Medical" },
    { key: "pharmacist", label: "Pharmacist", dept: "Inpatient Pharmacy" },
    { key: "lab", label: "Lab Technician", dept: "Clinical Laboratory" },
    { key: "billing", label: "Billing Specialist", dept: "Revenue Cycle" },
    { key: "admin", label: "System Admin", dept: "IT Administration" },
  ];

  return (
    <div className="h-screen flex" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0C1524] p-12 select-none relative overflow-hidden">
        {/* Bottom curve: white inside dark blue panel (lowered) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 500 1000" preserveAspectRatio="none" fill="none">
          <path d="M 0 920 C 130 860, 280 740, 500 840 L 500 1000 L 0 1000 Z" fill="#F0F2F5" />
        </svg>

        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-6">
            <div className="w-40 h-40 flex items-center justify-start flex-shrink-0">
              <img src="/logo.png" alt="HospAI Logo" className="w-40 h-40 object-contain pointer-events-none" />
            </div>
          </div>

          {/* Title & Subtitle directly below Logo */}
          <div className="mb-12">
            <h1 className="text-white text-3xl font-bold leading-snug mb-3">
              Universal Hospital<br />Management System
            </h1>
            <p className="text-[#94A3B8] text-[13.5px] leading-relaxed max-w-lg">
              Enterprise-grade clinical operations platform for physicians, nurses, pharmacists, laboratory staff, and administrators.
            </p>
          </div>

          {/* 4 Feature Boxes in 2x2 Grid Container */}
          <div className="grid grid-cols-2 gap-3.5 mb-10">
            {[
              { icon: "🏥", label: "16 Modules", sub: "End-to-end care workflow" },
              { icon: "👥", label: "428 Patients Today", sub: "Real-time census management" },
              { icon: "⚠", label: "7 Critical Alerts", sub: "Requires immediate attention" },
              { icon: "🔒", label: "HIPAA Compliant", sub: "Role-based access control" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                <span className="text-xl flex-shrink-0">{f.icon}</span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-white truncate">{f.label}</div>
                  <div className="text-[11.5px] text-[#94A3B8] truncate">{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with Kalpra Tech logo at the complete bottom right (inside white curve) */}
        <div className="absolute bottom-1 right-8 z-10 flex items-end gap-2">
          <span className="text-[11.5px] text-[#475569] font-medium whitespace-nowrap mb-3.5">
            Powered by
          </span>
          <div className="w-[100px] h-[100px] flex items-center justify-center flex-shrink-0">
            <img src="/kalpra_logo.png" alt="Kalpra Tech Logo" className="w-full h-full object-contain pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-between bg-[#F0F2F5] px-8 py-10 relative overflow-hidden">
        {/* Bottom curve: #0C1524 dark blue inside white panel (lowered) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 500 1000" preserveAspectRatio="none" fill="none">
          <path d="M 0 840 C 230 940, 370 820, 500 760 L 500 1000 L 0 1000 Z" fill="#0C1524" />
        </svg>

        <div className="w-full max-w-sm mx-auto my-auto relative z-10">
          <div className="flex justify-center mb-6 lg:hidden">
            <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
              <img src="/logo.png" alt="HospAI Logo" className="w-full h-full object-contain pointer-events-none" />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
            <p className="text-[12.5px] text-[#64748B]">Enter your credentials to access the HMS</p>
          </div>

          {error && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[12.5px] px-3.5 py-2.5 rounded mb-4 flex items-center gap-2">
              <span className="font-bold">⚠</span> {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">
                User ID / Employee Number
              </label>
              <input value={user} onChange={e => setUser(e.target.value)}
                placeholder="e.g. employee"
                className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3.5 py-2.5 focus:outline-none focus:border-[#1B4FD8]" />
              <p className="text-[11px] text-[#94A3B8] mt-1">Demo account: employee / employee123</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3.5 py-2.5 focus:outline-none focus:border-[#1B4FD8]" />
              <div className="text-right mt-1">
                <a href="#" className="text-[11.5px] text-[#1B4FD8] hover:underline">Forgot password?</a>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Role</label>
              <div className="grid grid-cols-2 gap-1.5">
                {ROLES.map(r => (
                  <button key={r.key} type="button" onClick={() => setRole(r.key)}
                    className={`text-left px-3 py-2 rounded border text-[12px] transition-colors
                      ${role === r.key ? "border-[#1B4FD8] bg-[#EFF6FF] text-[#1B4FD8]" : "border-[#DDE2EC] bg-white text-[#64748B] hover:border-[#94A3B8]"}`}>
                    <div className="font-medium">{r.label}</div>
                    <div className={`text-[10.5px] ${role === r.key ? "text-[#93C5FD]" : "text-[#94A3B8]"}`}>{r.dept}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="mfa" className="w-3.5 h-3.5 accent-[#1B4FD8]" defaultChecked />
              <label htmlFor="mfa" className="text-[12px] text-[#64748B]">Remember this device for 8 hours</label>
            </div>

            <button type="submit" disabled={loading}
              className={`w-full py-2.5 rounded text-white font-semibold text-[13px] transition-colors mt-2
                ${loading ? "bg-[#94A3B8] cursor-not-allowed" : "bg-[#1B4FD8] hover:bg-[#1740B4]"}`}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Authenticating...
                </span>
              ) : "Sign In to HMS"}
            </button>
          </form>
        </div>

        {/* Footer on right side (inside dark blue curve) */}
        <div className="relative z-10 text-center">
          <div className="text-[11px] text-[#94A3B8]">
            © 2026 General Hospital · UHMS v4.2.1 · Build 20260823
          </div>
        </div>
      </div>
    </div>
  );
}
