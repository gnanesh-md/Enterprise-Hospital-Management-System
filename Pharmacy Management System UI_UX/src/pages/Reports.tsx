import { useState } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Download, FileText, Printer, Filter } from "lucide-react"
import { salesData } from "../data/mockData"
import PageHeader from "../components/PageHeader"

const reportCategories = [
  {
    id: "sales",
    label: "Sales Reports",
    items: [
      "Daily Sales",
      "Monthly Sales",
      "Medicine-wise Sales",
      "Category-wise Sales",
      "Pharmacist-wise Sales",
    ],
  },
  {
    id: "inventory",
    label: "Inventory Reports",
    items: [
      "Stock Report",
      "Stock Valuation",
      "Expiry Report",
      "Low Stock Report",
      "Dead Stock",
    ],
  },
  {
    id: "purchasing",
    label: "Purchasing Reports",
    items: ["Supplier Purchases", "Purchase Summary", "Purchase Returns"],
  },
  {
    id: "financial",
    label: "Financial Reports",
    items: [
      "Revenue Summary",
      "Discounts Report",
      "GST Report",
      "Profit Margin",
    ],
  },
]

const gstData = [
  { name: "5% GST", value: 31200, color: "#2563eb" },
  { name: "12% GST", value: 18400, color: "#0f766e" },
  { name: "18% GST", value: 8600, color: "#7c3aed" },
]

const medSalesData = [
  { name: "Paracetamol", sales: 12400 },
  { name: "Metformin", sales: 9800 },
  { name: "Azithromycin", sales: 18200 },
  { name: "Amlodipine", sales: 7600 },
  { name: "Cetirizine", sales: 5400 },
  { name: "Pantoprazole", sales: 8900 },
]

interface ReportsProps {
  onNavigate: (page: string) => void
}

export default function Reports({ onNavigate }: ReportsProps) {
  const [activeReport, setActiveReport] = useState("Daily Sales")

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Reports" }]}
        title="Reports & Analytics"
        description="Insights and business intelligence for pharmacy operations"
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-[#374151] hover:bg-[#f8fafc] transition-colors">
              <Printer size={13} /> Print
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e2e8f0] bg-white text-[13px] text-[#374151] hover:bg-[#f8fafc] transition-colors">
              <FileText size={13} /> PDF
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[13px] font-medium"
              style={{ background: "#0f766e" }}
            >
              <Download size={14} /> Export Excel
            </button>
          </div>
        }
        onNavigate={onNavigate}
      />

      <div className="flex gap-5">
        {/* Sidebar: Report categories */}
        <div className="w-60 flex-shrink-0 space-y-2">
          {reportCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden"
            >
              <p className="px-4 py-2.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider bg-[#f8fafc] border-b border-[#f1f5f9]">
                {cat.label}
              </p>
              {cat.items.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveReport(item)}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium border-b last:border-b-0 border-[#f8fafc] transition-colors"
                  style={{
                    background: activeReport === item ? "#eff6ff" : "#fff",
                    color: activeReport === item ? "#2563eb" : "#374151",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-5">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    defaultValue="2026-09-01"
                    className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[12px] focus:border-[#2563eb] focus:outline-none"
                  />
                  <span className="text-[#94a3b8]">—</span>
                  <input
                    type="date"
                    defaultValue="2026-09-12"
                    className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[12px] focus:border-[#2563eb] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
                  Branch
                </label>
                <select className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[12px] focus:border-[#2563eb] focus:outline-none">
                  <option>All Branches</option>
                  <option>Main Branch</option>
                  <option>Branch 2</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">
                  Category
                </label>
                <select className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] text-[12px] focus:border-[#2563eb] focus:outline-none">
                  <option>All Categories</option>
                  <option>Antibiotic</option>
                  <option>Analgesic</option>
                </select>
              </div>
              <button
                className="mt-4 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-[12px] font-medium"
                style={{ background: "#2563eb" }}
              >
                <Filter size={12} /> Generate Report
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Revenue", value: "₹10,24,380", change: "+8.2%" },
              { label: "Total Transactions", value: "1,548", change: "+5.1%" },
              { label: "Avg. Bill", value: "₹661.7", change: "+2.9%" },
              {
                label: "Top Medicine",
                value: "Azithromycin",
                change: "₹18,200 sold",
              },
            ].map((k) => (
              <div
                key={k.label}
                className="bg-white rounded-xl p-4 border border-[#e2e8f0]"
              >
                <p className="text-[11px] text-[#64748b] font-medium">
                  {k.label}
                </p>
                <p className="text-[17px] font-bold text-[#0f172a] mt-1">
                  {k.value}
                </p>
                <p className="text-[11px] text-[#15803d] font-medium mt-0.5">
                  {k.change}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <p className="font-semibold text-[14px] text-[#0f172a] mb-4">
                Daily Sales Trend
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={salesData.weekly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [
                      `₹${v.toLocaleString("en-IN")}`,
                      "Sales",
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ fill: "#2563eb", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <p className="font-semibold text-[14px] text-[#0f172a] mb-4">
                Medicine-wise Sales
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={medSalesData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    formatter={(v: number) => [
                      `₹${v.toLocaleString("en-IN")}`,
                      "Sales",
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="sales" fill="#0f766e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <p className="font-semibold text-[14px] text-[#0f172a] mb-4">
                GST Collection Breakup
              </p>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={150}>
                  <PieChart>
                    <Pie
                      data={gstData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {gstData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  {gstData.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="text-[12px] text-[#64748b]">
                          {d.name}
                        </span>
                      </div>
                      <span className="text-[13px] font-semibold text-[#0f172a]">
                        ₹{d.value.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-[#f1f5f9] pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#64748b]">
                        Total GST
                      </span>
                      <span className="text-[14px] font-bold text-[#0f172a]">
                        ₹
                        {gstData
                          .reduce((s, d) => s + d.value, 0)
                          .toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5">
              <p className="font-semibold text-[14px] text-[#0f172a] mb-4">
                Pharmacist-wise Performance
              </p>
              <div className="space-y-3">
                {[
                  {
                    name: "Kavitha Ramesh",
                    bills: 52,
                    value: "₹38,420",
                    pct: 82,
                  },
                  {
                    name: "Deepak Subramaniam",
                    bills: 43,
                    value: "₹31,850",
                    pct: 68,
                  },
                  { name: "Priya Nair", bills: 33, value: "₹13,980", pct: 52 },
                ].map((p) => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: "#eff6ff", color: "#2563eb" }}
                        >
                          {p.name[0]}
                        </div>
                        <span className="text-[13px] font-medium text-[#0f172a]">
                          {p.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-semibold text-[#0f172a]">
                          {p.value}
                        </span>
                        <span className="text-[11px] text-[#94a3b8] ml-1">
                          ({p.bills} bills)
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p.pct}%`, background: "#2563eb" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
