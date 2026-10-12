import React, { useState } from "react"
import {
  HelpCircle,
  X,
  Keyboard,
  PhoneCall,
  BookOpen,
  Command,
  Search,
  ExternalLink,
  ShieldAlert,
} from "lucide-react"

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenCommandPalette: () => void
}

export default function HelpModal({
  isOpen,
  onClose,
  onOpenCommandPalette,
}: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<"shortcuts" | "emergency" | "workflows">("shortcuts")

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B132B] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <HelpCircle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Hospital System Help & Clinical Guide
              </h2>
              <p className="text-xs text-slate-400">
                Quick Shortcuts, Emergency Extensions & Department Protocols
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "shortcuts"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Keyboard size={15} />
            <span>Keyboard Shortcuts</span>
          </button>
          <button
            onClick={() => setActiveTab("emergency")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "emergency"
                ? "border-rose-600 text-rose-600 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldAlert size={15} />
            <span>Hospital Emergency Codes</span>
          </button>
          <button
            onClick={() => setActiveTab("workflows")}
            className={`py-3 px-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === "workflows"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen size={15} />
            <span>Department Guides</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "shortcuts" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Command size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-950">Universal Command Palette</h4>
                    <p className="text-[11px] text-blue-700">Quickly jump to any patient, module, or order</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose()
                    onOpenCommandPalette()
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Search size={13} />
                  <span>Open Palette (Ctrl + K)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Global Command Search</span>
                  <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-slate-800 text-[11px]">
                    Ctrl + K / ⌘K
                  </kbd>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Text Size Zoom In / Out</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-slate-800 text-[11px]">
                      A+
                    </kbd>
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-slate-800 text-[11px]">
                      A-
                    </kbd>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Toggle Fullscreen Display</span>
                  <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-slate-800 text-[11px]">
                    F11
                  </kbd>
                </div>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Close Active Modal / Drawer</span>
                  <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono font-bold text-slate-800 text-[11px]">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>
          )}

          {activeTab === "emergency" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border-l-4 border-rose-500 bg-rose-50 p-3.5 rounded-r-xl border-y border-r border-rose-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-rose-900">CODE BLUE (Cardiac Arrest)</span>
                    <span className="font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-300 text-xs">
                      Ext: 2222
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700">Immediate resuscitation team dispatch to bed/room</p>
                </div>

                <div className="border-l-4 border-red-600 bg-red-50 p-3.5 rounded-r-xl border-y border-r border-red-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-red-900">CODE RED (Fire / Smoke)</span>
                    <span className="font-mono font-bold text-red-700 bg-white px-2 py-0.5 rounded border border-red-300 text-xs">
                      Ext: 1111
                    </span>
                  </div>
                  <p className="text-[11px] text-red-700">RACE protocol: Rescue, Alarm, Confine, Extinguish</p>
                </div>

                <div className="border-l-4 border-amber-500 bg-amber-50 p-3.5 rounded-r-xl border-y border-r border-amber-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-amber-900">CODE YELLOW (Disaster / Mass Casualty)</span>
                    <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-300 text-xs">
                      Ext: 3333
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700">Emergency department triage expansion protocol</p>
                </div>

                <div className="border-l-4 border-purple-500 bg-purple-50 p-3.5 rounded-r-xl border-y border-r border-purple-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-purple-900">STAT PHARMACY / CRITICAL LAB</span>
                    <span className="font-mono font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-300 text-xs">
                      Ext: 4444
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-700">Immediate antidote, inotropes, or critical value verification</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "workflows" && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <h4 className="font-bold text-slate-900">Radiology Investigation Workflow</h4>
                <p className="text-slate-600 text-[11.5px] leading-relaxed">
                  Doctor Order prescripted &rarr; Nurse Verification dispatches simultaneously to Billing &amp; Radiology &rarr; Payment status shows PAID/PENDING &rarr; Technician completes test &rarr; Reports Department prepares findings &amp; impressions &rarr; Print/Download PDF.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <h4 className="font-bold text-slate-900">Doctor Workspace &amp; Digital Prescription</h4>
                <p className="text-slate-600 text-[11.5px] leading-relaxed">
                  Select appointed patient from Live Board &rarr; Voice consultation note (SOAP) &rarr; Upload or sketch Rx sheet &rarr; Split medicines and lab tests &rarr; Dispatch independently to Pharmacy and Reception/Lab.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <h4 className="font-bold text-slate-900">Role-Based Access Control</h4>
                <p className="text-slate-600 text-[11.5px] leading-relaxed">
                  Click the avatar / role switcher in the top right header to instantly change active viewpoints (Doctor, Nurse, Pharmacist, Lab Tech, Billing Cashier, Admin).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Enterprise Hospital Management System • HospAI v1.0.4</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
