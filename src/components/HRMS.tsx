import React from "react"
import { Icon } from "./icons"

export default function HRMS() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Human Resources Management System (HRMS)
          </h1>
          <p className="text-[12.5px] text-[#64748B]">
            Manage staff profiles, payroll, attendance, and hospital
            departments.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2">
            <Icon.Plus /> Add Employee
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Employees", val: "1,248", sub: "+12 this month" },
            { label: "Present Today", val: "942", sub: "82% Attendance Rate" },
            { label: "On Leave", val: "45", sub: "Approved leaves" },
            { label: "Open Vacancies", val: "18", sub: "5 Nursing, 3 Doctors" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm"
            >
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-1">
                {stat.label}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.val}
              </div>
              <div className="text-[11px] text-gray-500">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Department Breakdown */}
          <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <h2 className="text-[14px] font-semibold text-gray-900">
                Staff by Department
              </h2>
              <button className="text-[12px] font-medium text-[#1B4FD8] hover:underline">
                View Org Chart
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-[#DDE2EC]">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Head
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Doctors
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Nurses
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Support
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {[
                  {
                    dept: "Internal Medicine",
                    head: "Dr. R. Lee",
                    drs: 45,
                    nurses: 120,
                    support: 30,
                  },
                  {
                    dept: "Surgery",
                    head: "Dr. K. Patel",
                    drs: 30,
                    nurses: 85,
                    support: 25,
                  },
                  {
                    curr: true,
                    dept: "Emergency",
                    head: "Dr. M. Chen",
                    drs: 25,
                    nurses: 90,
                    support: 40,
                  },
                  {
                    dept: "Pediatrics",
                    head: "Dr. E. Taylor",
                    drs: 20,
                    nurses: 60,
                    support: 15,
                  },
                  {
                    dept: "Cardiology",
                    head: "Dr. S. Jenkins",
                    drs: 15,
                    nurses: 45,
                    support: 10,
                  },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC]">
                    <td className="px-5 py-3 text-[13px] font-semibold text-gray-900">
                      {row.dept}
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-700">
                      {row.head}
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-700">
                      {row.drs}
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-700">
                      {row.nurses}
                    </td>
                    <td className="px-5 py-3 text-[12.5px] text-gray-700">
                      {row.support}
                    </td>
                    <td className="px-5 py-3 text-[12.5px] font-bold text-gray-900">
                      {row.drs + row.nurses + row.support}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* HR Actions & Alerts */}
          <div className="w-80 flex flex-col gap-6">
            <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm p-4">
              <h3 className="text-[13px] font-semibold text-gray-900 mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded">
                  Run Monthly Payroll
                </button>
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded">
                  Manage Shift Rosters
                </button>
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded">
                  Review Leave Requests (12)
                </button>
                <button className="w-full text-left px-3 py-2 text-[12.5px] text-gray-700 hover:bg-[#F8FAFC] border border-[#DDE2EC] rounded">
                  Staff Training & Compliance
                </button>
              </div>
            </div>

            <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl shadow-sm p-4">
              <h3 className="text-[13px] font-semibold text-[#991B1B] mb-2 flex items-center gap-2">
                <Icon.Alert /> HR Alerts
              </h3>
              <ul className="space-y-2 text-[11.5px] text-[#7F1D1D]">
                <li>• 4 Nurses in Emergency nearing overtime limits.</li>
                <li>• 2 Doctor credential renewals due next week.</li>
                <li>• Annual fire safety compliance below 80%.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
