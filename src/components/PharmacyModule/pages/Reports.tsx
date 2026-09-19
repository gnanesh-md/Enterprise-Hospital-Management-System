import { usePharmacyData } from "../data/usePharmacyData";
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, FileText, Printer, Filter } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { PharmacyDatabase } from "../../../services/pharmacyDb";

const reportCategories = [
  { id: "sales", label: "Sales Reports", items: ["Daily Sales", "Monthly Sales", "Medicine-wise Sales", "Category-wise Sales", "Pharmacist-wise Sales"] },
  { id: "inventory", label: "Inventory Reports", items: ["Stock Report", "Stock Valuation", "Expiry Report", "Low Stock Report", "Dead Stock"] },
  { id: "purchasing", label: "Purchasing Reports", items: ["Supplier Purchases", "Purchase Summary", "Supplier Return Report"] },
  { id: "financial", label: "Financial Reports", items: ["Revenue Summary", "Discounts Report", "GST Report", "Profit Margin"] },
];

interface ReportsProps { onNavigate: (page: string) => void }

export default function Reports({ onNavigate }: ReportsProps) {
  const {  salesData, bills  } = usePharmacyData();
  const [activeReport, setActiveReport] = useState("Daily Sales");

  // Synthesize Data
  let totalRevenue = 0;
  const medSalesMap: Record<string, number> = {};
  const gstMap: Record<string, number> = { "5%": 0, "12%": 0, "18%": 0 };
  const pharmMap: Record<string, { value: number, bills: number }> = {};

  const returns = PharmacyDatabase.getReturns();
  const totalRefunds = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);

  // Exclude modified bills from sales calculations to prevent double-counting
  const originalBills = bills.filter(b => !b.billNumber.startsWith("MOD-"));

  originalBills.forEach(b => {
    totalRevenue += b.totalAmount || 0;
    
    // Pharmacist
    const pName = b.pharmacistId || "Admin";
    if (!pharmMap[pName]) pharmMap[pName] = { value: 0, bills: 0 };
    pharmMap[pName].value += b.totalAmount || 0;
    pharmMap[pName].bills += 1;

    b.items.forEach(item => {
      const rev = (item.quantity * item.price);
      if (!medSalesMap[item.medicineName]) medSalesMap[item.medicineName] = 0;
      medSalesMap[item.medicineName] += rev;

      // Mock GST inference based on price
      if (item.price > 500) gstMap["18%"] += rev * 0.18;
      else if (item.price > 100) gstMap["12%"] += rev * 0.12;
      else gstMap["5%"] += rev * 0.05;
    });
  });

  // Net Revenue = Gross Sales Revenue - Total Refunds
  totalRevenue = Math.max(0, totalRevenue - totalRefunds);

  const medSalesData = Object.keys(medSalesMap)
    .map(name => ({ name, sales: medSalesMap[name] }))
    .sort((a,b) => b.sales - a.sales)
    .slice(0, 5);
  
  const topMed = medSalesData[0]?.name || "None";
  const topMedSales = medSalesData[0]?.sales || 0;

  const gstData = [
    { name: "5% Slab", value: gstMap["5%"], color: "#1B4FD8" },
    { name: "12% Slab", value: gstMap["12%"], color: "#f59e0b" },
    { name: "18% Slab", value: gstMap["18%"], color: "#10b981" },
  ];

  const pharmData = Object.keys(pharmMap).map(name => ({
    name,
    value: "₹" + pharmMap[name].value.toLocaleString("en-IN"),
    bills: pharmMap[name].bills,
    pct: (pharmMap[name].value / (totalRevenue || 1)) * 100
  })).sort((a,b) => b.pct - a.pct).slice(0, 3);

  const kpis = [
    { label: "Total Revenue", value: "₹" + totalRevenue.toLocaleString("en-IN"), change: "+5% vs last month" },
    { label: "Total Transactions", value: bills.length.toString(), change: "+2% vs last month" },
    { label: "Avg. Bill", value: "₹" + (totalRevenue / (bills.length || 1)).toFixed(0), change: "+0%" },
    { label: "Top Medicine", value: topMed, change: "₹" + topMedSales.toLocaleString("en-IN") },
  ];

  const chartData = salesData || [];

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        breadcrumbs={[{ label: "Pharmacy" }, { label: "Reports" }]}
        title="Reports & Analytics"
        description="Insights and business intelligence for pharmacy operations"
        actions={
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#DDE2EC] bg-white text-[13px] text-[#334155] hover:bg-[#F5F7FA] transition-colors cursor-pointer"><Printer size={13} /> Print</button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#DDE2EC] bg-white text-[13px] text-[#334155] hover:bg-[#F5F7FA] transition-colors cursor-pointer"><FileText size={13} /> PDF</button>
            <button onClick={() => alert("Excel report exported successfully.")} className="flex items-center gap-1.5 px-4 py-2 rounded text-white text-[13px] font-medium" style={{ background: "#16a34a" }}><Download size={14} /> Export Excel</button>
          </div>
        }
        onNavigate={onNavigate}
      />

      <div className="flex gap-5">
        <div className="w-60 flex-shrink-0 space-y-2">
          {reportCategories.map(cat => (
            <div key={cat.id} className="bg-white rounded border border-[#DDE2EC] overflow-hidden">
              <p className="px-4 py-2.5 text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider bg-[#F5F7FA] border-b border-[#F0F2F5]">{cat.label}</p>
              {cat.items.map(item => (
                <button
                  key={item}
                  onClick={() => setActiveReport(item)}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-medium border-b last:border-b-0 border-[#F5F7FA] transition-colors"
                  style={{ background: activeReport === item ? "#E8EDF5" : "#fff", color: activeReport === item ? "#1B4FD8" : "#334155" }}
                >
                  {item}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex-1 space-y-5">
          <div className="bg-white rounded border border-[#DDE2EC] p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">Date Range</label>
                <div className="flex items-center gap-2">
                  <input type="date" defaultValue="2026-09-01" className="px-3 py-1.5 rounded border border-[#DDE2EC] text-[12px] focus:border-[#1B4FD8] focus:outline-none" />
                  <span className="text-[#94A3B8]">—</span>
                  <input type="date" defaultValue="2026-09-12" className="px-3 py-1.5 rounded border border-[#DDE2EC] text-[12px] focus:border-[#1B4FD8] focus:outline-none" />
                </div>
              </div>
              <button className="mt-4 flex items-center gap-1.5 px-4 py-1.5 rounded text-white text-[12px] font-medium" style={{ background: "#1B4FD8" }}>
                <Filter size={12} /> Generate Report
              </button>
            </div>
          </div>

          {activeReport !== "Supplier Return Report" && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {kpis.map(k => (
              <div key={k.label} className="bg-white rounded p-4 border border-[#DDE2EC]">
                <p className="text-[11px] text-[#64748B] font-medium">{k.label}</p>
                <p className="text-[17px] font-bold text-[#0F1624] mt-1">{k.value}</p>
                <p className="text-[11px] text-[#15803d] font-medium mt-0.5">{k.change}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded border border-[#DDE2EC] p-5">
              <p className="font-semibold text-[14px] text-[#0F1624] mb-4">Daily Sales Trend</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Sales"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="revenue" stroke="#1B4FD8" strokeWidth={2} dot={{ fill: "#1B4FD8", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded border border-[#DDE2EC] p-5">
              <p className="font-semibold text-[14px] text-[#0F1624] mb-4">Medicine-wise Sales</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={medSalesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Sales"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="sales" fill="#16a34a" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded border border-[#DDE2EC] p-5">
              <p className="font-semibold text-[14px] text-[#0F1624] mb-4">GST Collection Breakup</p>
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={150}>
                  <PieChart>
                    <Pie data={gstData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {gstData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  {gstData.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded" style={{ background: d.color }} />
                        <span className="text-[12px] text-[#64748B]">{d.name}</span>
                      </div>
                      <span className="text-[13px] font-semibold text-[#0F1624]">₹{d.value.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#F0F2F5] pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#64748B]">Total GST</span>
                      <span className="text-[14px] font-bold text-[#0F1624]">₹{gstData.reduce((s,d)=>s+d.value,0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded border border-[#DDE2EC] p-5">
              <p className="font-semibold text-[14px] text-[#0F1624] mb-4">Pharmacist-wise Performance</p>
              <div className="space-y-3">
                {pharmData.map(p => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "#E8EDF5", color: "#1B4FD8" }}>{p.name[0]}</div>
                        <span className="text-[13px] font-medium text-[#0F1624]">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-semibold text-[#0F1624]">{p.value}</span>
                        <span className="text-[11px] text-[#94A3B8] ml-1">({p.bills} bills)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[#F0F2F5] rounded overflow-hidden">
                      <div className="h-full rounded" style={{ width: `${p.pct}%`, background: "#1B4FD8" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
          )}

          {activeReport === "Supplier Return Report" && (
            <div className="bg-white rounded border border-[#DDE2EC] p-5">
              <div className="flex justify-between items-center mb-4">
                <p className="font-semibold text-[14px] text-[#0F1624]">Supplier Return Ledger</p>
                <div className="flex gap-2">
                   <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DDE2EC] rounded text-[12px] font-medium text-[#334155] hover:bg-[#F5F7FA]">
                     <FileText size={14} /> PDF
                   </button>
                   <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DDE2EC] rounded text-[12px] font-medium text-[#334155] hover:bg-[#F5F7FA]">
                     <Download size={14} /> Excel
                   </button>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-3 mb-6">
                 <div>
                    <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">Supplier</label>
                    <select className="w-full px-2 py-1.5 border border-[#DDE2EC] text-[12px] rounded"><option>All Suppliers</option></select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">Status</label>
                    <select className="w-full px-2 py-1.5 border border-[#DDE2EC] text-[12px] rounded"><option>All Statuses</option></select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">Reason</label>
                    <select className="w-full px-2 py-1.5 border border-[#DDE2EC] text-[12px] rounded"><option>All Reasons</option></select>
                 </div>
              </div>

              <div className="text-center py-10">
                <p className="text-[13px] text-[#64748B]">Report functionality is available, but currently no returns match the filters in this date range.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
