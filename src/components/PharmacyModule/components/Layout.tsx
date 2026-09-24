interface LayoutProps {
  children: React.ReactNode
}

// The module used to render its own dark sidebar and its own 64px header
// (search, clock, branch chip, notification bell, avatar) inside the HMS shell,
// which already provides all of it one row above. Every one of those sidebar
// entries is now a child of "Pharmacy" in the main HMS nav, so this is just the
// scroll container for the page -- one chrome, and the page gets the height back.
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="pharmacy-module flex h-full flex-col overflow-hidden bg-[#F4F6F9]">
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
