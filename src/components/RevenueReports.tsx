import React, { useState, useMemo, useEffect, useRef } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Icon } from "./icons"
import {
  exportGenericReportPdf,
  printGenericReport,
} from "../utils/generalReportsExporter"
import { GeneralReportsService, DateRangePreset } from "../services/generalReportsDb"

const REVENUE_MONTHLY_TREND = [
  { month: "Jan", revenue: 1.85, insurance: 0.65, cash: 0.25 },
  { month: "Feb", revenue: 1.98, insurance: 0.72, cash: 0.28 },
  { month: "Mar", revenue: 2.12, insurance: 0.78, cash: 0.29 },
  { month: "Apr", revenue: 2.05, insurance: 0.75, cash: 0.30 },
  { month: "May", revenue: 2.24, insurance: 0.81, cash: 0.31 },
  { month: "Jun", revenue: 2.31, insurance: 0.83, cash: 0.32 },
  { month: "Jul", revenue: 2.40, insurance: 0.845, cash: 0.32 },
]

const DEPT_REVENUE_DATA = [
  { dept: "Surgery & OR", revenue: 95, color: "#1B4FD8" },
  { dept: "Inpatient Wards", revenue: 62, color: "#0284C7" },
  { dept: "Pharmacy", revenue: 38, color: "#0EA5E9" },
  { dept: "Radiology", revenue: 25, color: "#38BDF8" },
  { dept: "Outpatient", revenue: 20, color: "#7DD3FC" },
]

const AGING_CLAIMS_DATA = [
  { name: "0-30 Days", value: 52, color: "#10B981" },
  { name: "31-60 Days", value: 21, color: "#F59E0B" },
  { name: "61-90 Days", value: 8.5, color: "#EF4444" },
  { name: "> 90 Days", value: 3, color: "#881337" },
]

export default function RevenueReports() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [preset, setPreset] = useState<DateRangePreset>("thisMonth")

  const reportData = useMemo(() => {
    return GeneralReportsService.getReportPayload("revenue_reports", {
      preset,
    })
  }, [preset])

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0
    const mainEl = document.querySelector("main")
    if (mainEl) mainEl.scrollTop = 0
    window.scrollTo(0, 0)
  }, [])

  const prepareExportData = () => ({
    reportTitle: "Revenue & Financial Reports",
    dateRangeLabel: preset === "today" ? "Today" : preset === "yesterday" ? "Yesterday" : preset === "last7" ? "Last 7 Days" : preset === "thisMonth" ? "This Month MTD" : preset === "lastMonth" ? "Last Month" : (preset as string) === "thisQuarter" ? "This Quarter" : "This Financial Year",
    departmentFilter: "All Departments",
    kpis: reportData.kpis ? reportData.kpis.map((k: any) => ({ label: k.label, value: k.value, change: k.change })) : [
      { label: "Total Revenue (MTD)", value: "₹2.40 Cr", change: "+8.2%" },
      { label: "Pending Insurance Claims", value: "₹84.50 L", change: "-2.1%" },
      { label: "Out of Pocket (Cash/UPI)", value: "₹32.00 L", change: "+5.4%" },
      { label: "Average Revenue / Patient", value: "₹18,500", change: "+1.2%" },
    ],
    columns: [
      { header: "Department / Specialty", key: "dept" },
      { header: "Gross Revenue (Lakhs)", key: "revenue" },
      { header: "Insurance Share", key: "insuranceShare" },
      { header: "Settlement Method", key: "settlement" },
      { header: "Financial Status", key: "status" },
    ],
    records: [
      { dept: "Surgery & OR", revenue: "₹95.00 L", insuranceShare: "₹72.00 L", settlement: "Insurance / TPA", status: "Active Billing" },
      { dept: "Inpatient Wards", revenue: "₹62.00 L", insuranceShare: "₹48.00 L", settlement: "Mixed", status: "Active Billing" },
      { dept: "Pharmacy", revenue: "₹38.00 L", insuranceShare: "₹12.00 L", settlement: "Cash / UPI / Card", status: "Settled" },
      { dept: "Radiology & Imaging", revenue: "₹25.00 L", insuranceShare: "₹18.00 L", settlement: "Insurance", status: "Settled" },
      { dept: "Outpatient (OPD)", revenue: "₹20.00 L", insuranceShare: "₹2.50 L", settlement: "Direct Cash / UPI", status: "Settled" },
    ],
  })

  const handleExportPdf = () => {
    exportGenericReportPdf(prepareExportData())
  }

  const handlePrint = () => {
    printGenericReport(prepareExportData())
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto">
      {/* Top Bar */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-5 flex items-center justify-between flex-shrink-0 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Revenue &amp; Financial Reports
          </h1>
          <p className="text-[12.5px] text-[#64748B] mt-0.5">
            Real-time multi-department revenue, insurance claims, and billing analytics (INR ₹).
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as DateRangePreset)}
            className="border border-[#DDE2EC] rounded-lg bg-white text-[12px] font-semibold px-3 py-1.5 focus:outline-none focus:border-[#1B4FD8] cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="thisMonth">This Month MTD</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisQuarter">This Quarter</option>
            <option value="thisYear">This Financial Year</option>
          </select>
          <button
            onClick={handlePrint}
            className="h-8 px-3.5 bg-white border border-[#CBD5E1] text-slate-700 text-[12px] font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Icon.Printer /> Print Report
          </button>
          <button
            onClick={handleExportPdf}
            className="h-8 px-3.5 bg-[#1B4FD8] text-white text-[12px] font-semibold rounded-lg hover:bg-[#1740B4] transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Icon.Download /> Export Financial PDF
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6 w-full">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(reportData.kpis || []).map((stat: any, i: number) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300"
            >
              <div className="text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wide">
                {stat.label}
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className={`text-2xl font-black tracking-tight text-slate-900`}>
                    {stat.value}
                  </div>
                </div>
                {stat.change && (
                  <div
                    className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${
                      stat.change.startsWith("+")
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {stat.change}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Section 1: Full-Width Monthly Revenue Trend Area Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Monthly Hospital Revenue &amp; Insurance Growth Trend
              </h2>
              <p className="text-[12px] text-slate-500">
                7-month financial progression showing total Collections vs Insurance vs Out-of-Pocket
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#1B4FD8] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-bold">
              INR (Crores ₹)
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_MONTHLY_TREND}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B4FD8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1B4FD8" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorIns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B", fontWeight: 600 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={false}
                  unit=" Cr"
                  domain={[0, 3]}
                />
                <RechartsTooltip
                  formatter={(val: any) => [`₹${val} Cr`, ""]}
                  contentStyle={{
                    borderRadius: 12,
                    fontSize: 12,
                    border: "1px solid #CBD5E1",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Total Gross Revenue"
                  stroke="#1B4FD8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="insurance"
                  name="Insurance Claims Received"
                  stroke="#0284C7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorIns)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section 2: Department Revenue & Insurance Claims Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue by Department Bar Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col">
            <div className="pb-4 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Department Revenue Contribution (₹ Lakhs)
              </h2>
              <p className="text-[12px] text-slate-500">
                Comparative financial intake across major hospital specialties
              </p>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEPT_REVENUE_DATA} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" unit=" L" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} />
                  <YAxis
                    dataKey="dept"
                    type="category"
                    tick={{ fontSize: 12, fill: "#1E293B", fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    width={130}
                  />
                  <RechartsTooltip
                    formatter={(val: any) => [`₹${val},00,000`, "Revenue"]}
                    contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid #CBD5E1" }}
                  />
                  <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                    {DEPT_REVENUE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Aging Insurance Claims Donut Pie Chart */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col">
            <div className="pb-4 border-b border-slate-100 mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Aging Insurance Claims
                </h2>
                <p className="text-[12px] text-slate-500">
                  Distribution of ₹84.5L pending claims
                </p>
              </div>
              <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon.Insurance />
              </span>
            </div>

            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={AGING_CLAIMS_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {AGING_CLAIMS_DATA.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: any) => [`₹${val} Lakhs`, "Claim Value"]}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 bg-gradient-to-br from-rose-50 to-red-50/50 border border-rose-200/60 rounded-xl p-4 shadow-2xs">
              <h3 className="text-[12.5px] font-bold text-rose-800 mb-1 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                Claim Denial Risk Notice
              </h3>
              <p className="text-[11.5px] text-rose-700/80 leading-relaxed">
                ₹3.00L in claims have exceeded 90 days. Urgent follow-up required with Star Health &amp; TPA desk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
