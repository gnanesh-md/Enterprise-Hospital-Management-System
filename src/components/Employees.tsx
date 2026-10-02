import React, { useState } from "react"
import { Icon } from "./icons"
import UserProfileModal, { StaffProfileDetails } from "./UserProfileModal"

export default function Employees() {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [selectedStaff, setSelectedStaff] = useState<StaffProfileDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const employees: StaffProfileDetails[] = [
    {
      id: "EMP-492",
      name: "Dr. Sarah Jenkins",
      role: "ROLE_DOCTOR",
      title: "Senior Consultant",
      department: "Cardiology",
      status: "On Duty",
      img: "SJ",
      activeShift: "Day Shift (08:00 AM - 05:00 PM)",
      email: "sarah.jenkins@kepplerhospital.org",
      phone: "+1 (555) 234-5678",
      joiningDate: "Mar 10, 2020",
      location: "Cardiology Wing, Room 402",
      permissions: ["Dashboard", "Patients", "Appointments", "EMR & Consultations", "ICU Flowsheet"],
    },
    {
      id: "EMP-510",
      name: "Dr. Marcus Chen",
      role: "ROLE_DOCTOR",
      title: "Attending Physician",
      department: "Emergency",
      status: "Off Duty",
      img: "MC",
      activeShift: "Night Shift (08:00 PM - 06:00 AM)",
      email: "marcus.chen@kepplerhospital.org",
      phone: "+1 (555) 345-6789",
      joiningDate: "Nov 01, 2021",
      location: "ER Trauma Center, Bay 3",
      permissions: ["Dashboard", "Emergency Queue", "Patients", "EMR & Consultations"],
    },
    {
      id: "EMP-312",
      name: "Jessica Carter",
      role: "ROLE_NURSE",
      title: "Registered Nurse",
      department: "3N Medical",
      status: "On Duty",
      img: "JC",
      activeShift: "Morning Shift (07:00 AM - 03:30 PM)",
      email: "jessica.carter@kepplerhospital.org",
      phone: "+1 (555) 456-7890",
      joiningDate: "Aug 14, 2019",
      location: "Inpatient Ward 3N, Desk A",
      permissions: ["Dashboard", "Inpatient & Nursing", "Vitals Recording", "ICU Flowsheet"],
    },
    {
      id: "EMP-844",
      name: "Robert Williams",
      role: "ROLE_PHARMACY",
      title: "Pharmacist",
      department: "Pharmacy",
      status: "On Leave",
      img: "RW",
      activeShift: "Day Shift (09:00 AM - 05:30 PM)",
      email: "robert.williams@kepplerhospital.org",
      phone: "+1 (555) 567-8901",
      joiningDate: "Jan 22, 2018",
      location: "Central Pharmacy, Counter 2",
      permissions: ["Dashboard", "Pharmacy Dispensing", "Medicine Inventory", "Prescriptions"],
    },
    {
      id: "EMP-129",
      name: "Elena Torres",
      role: "ROLE_RECEPTION",
      title: "Billing Specialist",
      department: "Administration",
      status: "On Duty",
      img: "ET",
      activeShift: "Day Shift (08:30 AM - 05:00 PM)",
      email: "elena.torres@kepplerhospital.org",
      phone: "+1 (555) 678-9012",
      joiningDate: "Jul 05, 2022",
      location: "Main Reception & Billing Desk",
      permissions: ["Dashboard", "OP Registration", "Billing & Invoicing", "Insurance Claims"],
    },
    {
      id: "EMP-902",
      name: "Dr. Kavita Patel",
      role: "ROLE_DOCTOR",
      title: "Chief of Surgery",
      department: "Surgery",
      status: "On Duty",
      img: "KP",
      activeShift: "On-Call / OR Schedule",
      email: "kavita.patel@kepplerhospital.org",
      phone: "+1 (555) 789-0123",
      joiningDate: "Feb 18, 2017",
      location: "Surgical Suite 1 & Executive Office",
      permissions: ["Dashboard", "OT Management", "Surgical Schedules", "Patients", "EMR"],
    },
    {
      id: "EMP-443",
      name: "Michael Chang",
      role: "ROLE_LAB",
      title: "Radiology Tech",
      department: "Radiology",
      status: "On Duty",
      img: "MC",
      activeShift: "Rotational (08:00 AM - 04:00 PM)",
      email: "michael.chang@kepplerhospital.org",
      phone: "+1 (555) 890-1234",
      joiningDate: "May 30, 2021",
      location: "Radiology Wing, MRI Lab B",
      permissions: ["Dashboard", "Laboratory Worklist", "Radiology Scans", "PACS Systems"],
    },
    {
      id: "EMP-621",
      name: "Sarah O'Connor",
      role: "ROLE_NURSE",
      title: "Head Nurse",
      department: "ICU",
      status: "Off Duty",
      img: "SO",
      activeShift: "Evening Shift (03:00 PM - 11:30 PM)",
      email: "sarah.oconnor@kepplerhospital.org",
      phone: "+1 (555) 901-2345",
      joiningDate: "Oct 12, 2016",
      location: "Intensive Care Unit (ICU), Station 1",
      permissions: ["Dashboard", "ICU Flowsheet", "Inpatient & Nursing", "Critical Care Alerts"],
    },
  ]

  const handleOpenProfile = (emp: StaffProfileDetails) => {
    setSelectedStaff(emp)
    setIsModalOpen(true)
  }

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      {/* Header */}
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>👥</span> Employee Directory
          </h1>
          <p className="text-[12.5px] text-[#64748B]">
            Search and manage staff profiles across the hospital network. Click any employee to view their detailed profile card.
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, ID, or dept..."
              className="pl-8 pr-3 py-1.5 text-[12px] border border-[#DDE2EC] rounded-lg w-64 focus:outline-none focus:border-[#1B4FD8] bg-[#F8FAFC]"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
              <Icon.Search />
            </span>
          </div>
          <div className="flex bg-[#F1F5F9] p-0.5 rounded-lg border border-[#DDE2EC]">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                view === "grid"
                  ? "bg-white shadow-sm text-[#1B4FD8]"
                  : "text-[#64748B] hover:text-gray-900"
              }`}
              title="Grid View"
            >
              <Icon.Patients />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                view === "list"
                  ? "bg-white shadow-sm text-[#1B4FD8]"
                  : "text-[#64748B] hover:text-gray-900"
              }`}
              title="Table View"
            >
              <Icon.Cmd />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-auto p-6 flex w-full">
        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
            {filteredEmployees.map((emp, i) => (
              <div
                key={i}
                onClick={() => handleOpenProfile(emp)}
                className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden flex flex-col hover:border-[#1B4FD8] hover:shadow-md cursor-pointer transition-all group"
              >
                <div className="p-5 flex flex-col items-center text-center border-b border-[#DDE2EC]">
                  <div className="w-16 h-16 rounded-2xl bg-[#1B4FD8]/10 text-[#1B4FD8] flex items-center justify-center text-xl font-extrabold mb-3 group-hover:scale-105 transition-transform border border-[#BFDBFE]">
                    {emp.img}
                  </div>
                  <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-[#1B4FD8] transition-colors">
                    {emp.name}
                  </h3>
                  <div className="text-[12px] font-medium text-[#475569] mb-1">
                    {emp.title}
                  </div>
                  <div className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-md border border-[#E2E8F0]">
                    {emp.department}
                  </div>
                </div>
                <div className="px-5 py-3 bg-[#F8FAFC] flex justify-between items-center text-[11.5px]">
                  <span className="font-mono font-semibold text-[#64748B]">{emp.id}</span>
                  <span
                    className={`font-semibold flex items-center gap-1.5 ${
                      emp.status === "On Duty"
                        ? "text-[#16A34A]"
                        : emp.status === "Off Duty"
                          ? "text-[#64748B]"
                          : "text-[#D97706]"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        emp.status === "On Duty"
                          ? "bg-[#16A34A]"
                          : emp.status === "Off Duty"
                            ? "bg-[#94A3B8]"
                            : "bg-[#D97706]"
                      }`}
                    ></span>
                    {emp.status}
                  </span>
                </div>
                <div className="px-5 py-2 bg-blue-50/50 border-t border-blue-100/50 text-[11px] font-bold text-[#1B4FD8] text-center group-hover:bg-[#1B4FD8] group-hover:text-white transition-colors">
                  Click to View Profile Card →
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm w-full overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-[#DDE2EC]">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Title & Role
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
                {filteredEmployees.map((emp, i) => (
                  <tr
                    key={i}
                    onClick={() => handleOpenProfile(emp)}
                    className="hover:bg-[#EFF6FF]/60 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 text-[12.5px] font-mono font-bold text-[#1B4FD8]">
                      {emp.id}
                    </td>
                    <td className="px-5 py-4 text-[13px] font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1B4FD8]/10 text-[#1B4FD8] flex items-center justify-center text-[11px] font-bold border border-[#BFDBFE]">
                        {emp.img}
                      </div>
                      {emp.name}
                    </td>
                    <td className="px-5 py-4 text-[12.5px] text-gray-700 font-medium">
                      {emp.title}
                    </td>
                    <td className="px-5 py-4 text-[12.5px] text-gray-700">
                      {emp.department}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2 py-1 text-[10.5px] font-bold rounded-md uppercase tracking-wider ${
                          emp.status === "On Duty"
                            ? "bg-[#DCFCE7] text-[#15803D] border border-green-200"
                            : emp.status === "Off Duty"
                              ? "bg-[#F1F5F9] text-[#475569] border border-gray-200"
                              : "bg-[#FEF3C7] text-[#92400E] border border-amber-200"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenProfile(emp)
                        }}
                        className="px-3 py-1 text-[12px] font-bold text-[#1B4FD8] bg-blue-50 hover:bg-[#1B4FD8] hover:text-white rounded-md border border-blue-200 transition-colors cursor-pointer"
                      >
                        View Profile Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Profile Pop-Up Modal */}
      <UserProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={selectedStaff}
        isCurrentUser={false}
      />
    </div>
  )
}
