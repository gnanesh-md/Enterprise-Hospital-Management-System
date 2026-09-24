import { ChevronRight } from "lucide-react"

interface Breadcrumb {
  label: string
  page?: string
}

interface PageHeaderProps {
  breadcrumbs: Breadcrumb[]
  title: string
  description?: string
  actions?: React.ReactNode
  onNavigate?: (page: string) => void
}

export default function PageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  onNavigate,
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-4 gap-4 flex-wrap">
      <div>
        <nav className="flex items-center gap-1.5 mb-2 text-[12px] text-[#64748b]">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={11} />}
              {bc.page && onNavigate ? (
                <button
                  onClick={() => onNavigate(bc.page!)}
                  className="hover:text-[#2563eb] transition-colors"
                >
                  {bc.label}
                </button>
              ) : (
                <span
                  className={
                    i === breadcrumbs.length - 1
                      ? "text-[#0f172a] font-medium"
                      : ""
                  }
                >
                  {bc.label}
                </span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-[22px] font-bold text-[#0f172a] leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] text-[#64748b] mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </div>
  )
}
