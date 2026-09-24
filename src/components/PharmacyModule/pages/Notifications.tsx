import { usePharmacyData } from "../data/usePharmacyData"
import { useState } from "react"
import { Bell, CheckCheck, AlertTriangle, Clock, Info, X } from "lucide-react"

import PageHeader from "../components/PageHeader"

interface NotificationsProps {
  onNavigate: (page: string) => void
}

const typeConfig = {
  critical: {
    icon: AlertTriangle,
    color: "#dc2626",
    bg: "#FEE2E2",
    border: "#fca5a5",
    dot: "#ef4444",
  },
  warning: {
    icon: Clock,
    color: "#d97706",
    bg: "#FEF3C7",
    border: "#fcd34d",
    dot: "#f59e0b",
  },
  info: {
    icon: Info,
    color: "#0F766E",
    bg: "#E8EDF5",
    border: "#93c5fd",
    dot: "#60a5fa",
  },
}
import { PharmacyDatabase } from "../../../services/pharmacyDb"

export default function Notifications({ onNavigate }: NotificationsProps) {
  const { notifications: notifs } = usePharmacyData()
  const [activeFilter, setActiveFilter] = useState("All")

  const markAll = () => {
    notifs.forEach((n) =>
      PharmacyDatabase.updateNotification(n.id, { read: true }),
    )
  }
  const markOne = (id: string) => {
    PharmacyDatabase.updateNotification(id, { read: true })
  }
  const remove = (id: string) => {
    PharmacyDatabase.deleteNotification(id)
  }

  const filtered = notifs.filter((n) => {
    if (activeFilter === "Unread") return !n.read
    if (activeFilter === "Critical") return n.type === "critical"
    if (activeFilter === "Warning") return n.type === "warning"
    if (activeFilter === "Info") return n.type === "info"
    return true
  })

  const unread = notifs.filter((n) => !n.read).length

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Notifications" }]}
        title={
          <div className="flex items-center gap-2">
            Notification Center
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Live
            </span>
          </div>
        }
        description={`${unread} unread · ${notifs.length} total notifications`}
        actions={
          <button
            onClick={markAll}
            className="flex items-center gap-1.5 px-4 py-2 rounded border border-[#E2E8F0] bg-white text-[13px] text-[#334155] hover:bg-[#F5F7FA] transition-colors"
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        }
        onNavigate={onNavigate}
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["All", "Unread", "Critical", "Warning", "Info"].map((f) => {
          const counts: Record<string, number> = {
            All: notifs.length,
            Unread: unread,
            Critical: notifs.filter((n) => n.type === "critical").length,
            Warning: notifs.filter((n) => n.type === "warning").length,
            Info: notifs.filter((n) => n.type === "info").length,
          }
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="flex items-center gap-2 px-4 py-2 rounded border text-[13px] font-medium transition-all"
              style={{
                background: activeFilter === f ? "#0F1624" : "#fff",
                color: activeFilter === f ? "#fff" : "#334155",
                borderColor: activeFilter === f ? "#0F1624" : "#DDE2EC",
              }}
            >
              {f}{" "}
              <span
                className="text-[11px] px-1.5 py-0.5 rounded"
                style={{
                  background:
                    activeFilter === f ? "rgba(255,255,255,0.2)" : "#F0F2F5",
                  color: activeFilter === f ? "#fff" : "#64748B",
                }}
              >
                {counts[f]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] py-16 text-center">
            <div
              className="w-12 h-12 rounded flex items-center justify-center mx-auto mb-3"
              style={{ background: "#F0F2F5" }}
            >
              <Bell size={22} className="text-[#94A3B8]" />
            </div>
            <p className="font-medium text-[#334155]">No notifications</p>
            <p className="text-[12px] text-[#94A3B8] mt-1">
              You're all caught up!
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const cfg = typeConfig[(n.type as keyof typeof typeConfig)]
            return (
              <div
                key={n.id}
                className="bg-white rounded border overflow-hidden transition-all hover:shadow-sm"
                style={{
                  borderColor: !n.read ? cfg.border : "#DDE2EC",
                  borderLeftWidth: !n.read ? 4 : 1,
                }}
              >
                <div className="flex items-start p-4 gap-4">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: cfg.bg }}
                  >
                    <cfg.icon size={16} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-[14px] font-semibold ${
                          !n.read ? "text-[#0F1624]" : "text-[#334155]"
                        }`}
                      >
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[11px] text-[#94A3B8] whitespace-nowrap">
                          {n.time}
                        </span>
                        {!n.read && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: cfg.dot }}
                          />
                        )}
                      </div>
                    </div>
                    <p className="text-[13px] text-[#64748B] mt-1">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {!n.read && (
                        <button
                          onClick={() => markOne(n.id)}
                          className="text-[12px] font-medium"
                          style={{ color: "#0F766E" }}
                        >
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => remove(n.id)}
                        className="ml-auto p-1 rounded hover:bg-[#FEE2E2] text-[#94A3B8] hover:text-[#dc2626] transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
