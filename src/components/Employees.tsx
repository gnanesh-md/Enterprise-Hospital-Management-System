import React, { useState } from "react"
import { Icon } from "./icons"

export default function Employees() {
  const [view, setView] = useState<"grid" | "list">("grid")

  const employees = [
    {
      id: "EMP-492",
      name: "Dr. Sarah Jenkins",
      role: "Senior Consultant",
      dept: "Cardiology",
      status: "On Duty",
      img: "SJ",
    },
    {
      id: "EMP-510",
      name: "Dr. Marcus Chen",
      role: "Attending Physician",
      dept: "Emergency",
      status: "Off Duty",
      img: "MC",
    },
    {
      id: "EMP-312",
      name: "Jessica Carter",
      role: "Registered Nurse",
      dept: "3N Medical",
      status: "On Duty",
      img: "JC",
    },
    {
      id: "EMP-844",
      name: "Robert Williams",
      role: "Pharmacist",
      dept: "Pharmacy",
      status: "On Leave",
      img: "RW",
    },
    {
      id: "EMP-129",
      name: "Elena Torres",
      role: "Billing Specialist",
      dept: "Administration",
      status: "On Duty",
      img: "ET",
    },
    {
      id: "EMP-902",
      name: "Dr. Kavita Patel",
      role: "Chief of Surgery",
      dept: "Surgery",
      status: "On Duty",
      img: "KP",
    },
    {
      id: "EMP-443",
      name: "Michael Chang",
      role: "Radiology Tech",
      dept: "Radiology",
      status: "On Duty",
      img: "MC",
    },
    {
      id: "EMP-621",
      name: "Sarah O'Connor",
      role: "Head Nurse",
      dept: "ICU",
      status: "Off Duty",
      img: "SO",
    },
  ]

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Employee Directory
          </h1>
          <p className="text-[12.5px] text-[#64748B]">
            Search and manage staff profiles across the hospital network.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Icon.Search />
            <input
              placeholder="Search name or ID..."
              className="pl-8 pr-3 py-1.5 text-[12px] border border-[#DDE2EC] rounded w-64 focus:outline-none focus:border-[#1B4FD8]"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
              <Icon.Search />
            </span>
          </div>
          <div className="flex bg-[#F1F5F9] p-0.5 rounded border border-[#DDE2EC]">
            <button
              onClick={() => setView("grid")}
              className={`p-1 rounded ${
                view === "grid"
                  ? "bg-white shadow-sm"
                  : "text-[#64748B] hover:text-gray-900"
              }`}
            >
              <Icon.Patients />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1 rounded ${
                view === "list"
                  ? "bg-white shadow-sm"
                  : "text-[#64748B] hover:text-gray-900"
              }`}
            >
              <Icon.Cmd />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex max-w-7xl mx-auto w-full">
        {view === "grid" ? (
          <div className="grid grid-cols-4 gap-6 w-full">
            {employees.map((emp, i) => (
              <div
                key={i}
                className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden flex flex-col hover:border-[#1B4FD8] cursor-pointer transition-colors"
              >
                <div className="p-5 flex flex-col items-center text-center border-b border-[#DDE2EC]">
                  <div className="w-16 h-16 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center text-xl font-bold mb-3">
                    {emp.img}
                  </div>
                  <h3 className="text-[14px] font-bold text-gray-900">
                    {emp.name}
                  </h3>
                  <div className="text-[12px] text-[#64748B] mb-1">
                    {emp.role}
                  </div>
                  <div className="text-[11px] font-medium text-gray-500">
                    {emp.dept}
                  </div>
                </div>
                <div className="px-5 py-3 bg-[#F8FAFC] flex justify-between items-center text-[11.5px]">
                  <span className="font-mono text-[#64748B]">{emp.id}</span>
                  <span
                    className={`font-semibold flex items-center gap-1.5 ${
                      emp.status === "On Duty"
                        ? "text-[#16A34A]"
                        : emp.status === "Off Duty"
                          ? "text-[#64748B]"
                          : "text-[#D97706]"
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        emp.status === "On Duty"
                          ? "bg-[#16A34A]"
                          : emp.status === "Off Duty"
                            ? "bg-[#94A3B8]"
                            : "bg-[#D97706]"
                      }`}
                    ></div>
                    {emp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm w-full overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC] border-b border-[#DDE2EC]">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {employees.map((emp, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] cursor-pointer">
                    <td className="px-5 py-4 text-[12.5px] font-mono text-[#64748B]">
                      {emp.id}
                    </td>
                    <td className="px-5 py-4 text-[13px] font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center text-[11px] font-bold">
                        {emp.img}
                      </div>
                      {emp.name}
                    </td>
                    <td className="px-5 py-4 text-[12.5px] text-gray-700">
                      {emp.role}
                    </td>
                    <td className="px-5 py-4 text-[12.5px] text-gray-700">
                      {emp.dept}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-1 text-[10.5px] font-bold rounded uppercase tracking-wider ${
                          emp.status === "On Duty"
                            ? "bg-[#DCFCE7] text-[#15803D]"
                            : emp.status === "Off Duty"
                              ? "bg-[#F1F5F9] text-[#475569]"
                              : "bg-[#FEF3C7] text-[#92400E]"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-[12px] font-medium text-[#1B4FD8] hover:underline">
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
