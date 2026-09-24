import { ChevronRight } from "lucide-react"

interface Breadcrumb {
  label: string
  page?: string
}

interface PageHeaderProps {
  breadcrumbs: Breadcrumb[]
  title: React.ReactNode
  description?: string
  actions?: React.ReactNode
  onNavigate?: (page: string) => void
}

export default function PageHeader({
  title,
  description,
  actions,
}: PageHeaderProps) {
  // We ignore breadcrumbs since the App.tsx shell now provides a global breadcrumb strip.
  return (
    <div className="bg-gradient-to-r from-[#F0FDFA] to-white rounded-xl shadow-sm border border-[#E2E8F0] border-t-2 border-t-[#0F766E] p-5 mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          {typeof title === "string" && !title.includes("Dashboard") ? null : (
            <span className="text-xl">{title === "Pharmacy Dashboard" ? "💊" : ""}</span>
          )}
          <h1 className="text-[20px] font-bold text-[#064E3B] tracking-tight">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-[12.5px] text-[#64748B] mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </div>
  )
}
