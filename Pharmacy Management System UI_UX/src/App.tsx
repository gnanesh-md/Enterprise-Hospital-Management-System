import { useState, useEffect } from "react"
import Layout from "./components/Layout"
import GlobalSearch from "./components/GlobalSearch"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Dispensing from "./pages/Dispensing"
import PrescriptionQueue from "./pages/PrescriptionQueue"
import OCRVerification from "./pages/OCRVerification"
import MedicineMaster from "./pages/MedicineMaster"
import CategoryMaster from "./pages/CategoryMaster"
import Suppliers from "./pages/Suppliers"
import PurchaseOrders from "./pages/PurchaseOrders"
import GRN from "./pages/GRN"
import InventoryLedger from "./pages/InventoryLedger"
import StockTransfers from "./pages/StockTransfers"
import ExpiryLowStock from "./pages/ExpiryLowStock"
import SalesReturns from "./pages/SalesReturns"
import Reports from "./pages/Reports"
import Notifications from "./pages/Notifications"
import UserManagement from "./pages/UserManagement"
import AuditLog from "./pages/AuditLog"
import Settings from "./pages/Settings"

const pages: Record<string, React.ComponentType<{
  onNavigate: (page: string) => void
}>> = {
  dashboard: Dashboard,
  dispensing: Dispensing,
  prescriptions: PrescriptionQueue,
  ocr: OCRVerification,
  medicines: MedicineMaster,
  categories: CategoryMaster,
  suppliers: Suppliers,
  "purchase-orders": PurchaseOrders,
  grn: GRN,
  "inventory-ledger": InventoryLedger,
  "stock-transfers": StockTransfers,
  "expiry-low-stock": ExpiryLowStock,
  "sales-returns": SalesReturns,
  reports: Reports,
  notifications: Notifications,
  users: UserManagement,
  "audit-log": AuditLog,
  settings: Settings,
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [activePage, setActivePage] = useState("dashboard")
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setShowSearch((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  const PageComponent = pages[activePage] ?? Dashboard

  return (
    <>
      <Layout
        activePage={activePage}
        onNavigate={setActivePage}
        onGlobalSearch={() => setShowSearch(true)}
      >
        <PageComponent onNavigate={setActivePage} />
      </Layout>
      {showSearch && (
        <GlobalSearch
          onClose={() => setShowSearch(false)}
          onNavigate={(page) => {
            setActivePage(page)
            setShowSearch(false)
          }}
        />
      )}
    </>
  )
}
