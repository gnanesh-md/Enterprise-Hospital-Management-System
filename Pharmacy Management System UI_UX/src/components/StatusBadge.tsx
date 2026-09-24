const configs: Record<string, {
  bg: string
  color: string
  dot: string
  label?: string
}> = {
  active: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  inactive: { bg: "#f8fafc", color: "#64748b", dot: "#94a3b8" },
  pending: { bg: "#fffbeb", color: "#b45309", dot: "#f59e0b" },
  processing: { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  ready: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  dispensed: { bg: "#f0fdf4", color: "#166534", dot: "#16a34a" },
  rejected: { bg: "#fef2f2", color: "#b91c1c", dot: "#ef4444" },
  draft: { bg: "#f8fafc", color: "#64748b", dot: "#94a3b8" },
  ordered: { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  partially_received: {
    bg: "#fff7ed",
    color: "#c2410c",
    dot: "#f97316",
    label: "Partial",
  },
  completed: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  pending_approval: {
    bg: "#fffbeb",
    color: "#b45309",
    dot: "#f59e0b",
    label: "Needs Approval",
  },
  in_transit: {
    bg: "#f0f9ff",
    color: "#0369a1",
    dot: "#0ea5e9",
    label: "In Transit",
  },
  received: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  requested: { bg: "#faf5ff", color: "#7c3aed", dot: "#a855f7" },
  normal: { bg: "#f8fafc", color: "#64748b", dot: "#94a3b8" },
  urgent: { bg: "#fef2f2", color: "#b91c1c", dot: "#ef4444" },
}

interface StatusBadgeProps {
  status: string
  size?: "sm" | "md"
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const cfg = configs[status] ?? {
    bg: "#f8fafc",
    color: "#64748b",
    dot: "#94a3b8",
  }
  const label =
    cfg.label ??
    status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap"
      style={{
        background: cfg.bg,
        color: cfg.color,
        padding: size === "sm" ? "2px 7px" : "3px 9px",
        fontSize: size === "sm" ? 11 : 12,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: cfg.dot }}
      />
      {label}
    </span>
  )
}
