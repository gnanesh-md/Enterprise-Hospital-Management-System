import React from "react"
import { Icon } from "./icons"

export default function PatientExperience() {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5]">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Patient Experience
          </h1>
          <p className="text-[12.5px] text-[#64748B]">
            Monitor feedback, satisfaction scores, and patient relations.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="h-8 px-3 bg-white border border-[#DDE2EC] text-[#1B4FD8] text-[12px] font-medium rounded hover:bg-[#F8FAFC] transition-colors flex items-center gap-2">
            <Icon.Download /> Export Data
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* Top Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: "Net Promoter Score (NPS)",
              val: "72",
              desc: "Excellent",
              color: "text-green-600",
            },
            {
              label: "CSAT (Out of 5)",
              val: "4.6",
              desc: "Based on 450 surveys",
              color: "text-[#1B4FD8]",
            },
            {
              label: "Open Grievances",
              val: "12",
              desc: "4 High Priority",
              color: "text-red-600",
            },
            {
              label: "Response Rate",
              val: "38%",
              desc: "+5% this month",
              color: "text-gray-900",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white border border-[#DDE2EC] p-4 rounded-xl shadow-sm"
            >
              <div className="text-[11.5px] font-semibold text-[#64748B] mb-2">
                {stat.label}
              </div>
              <div className={`text-3xl font-bold ${stat.color} mb-1`}>
                {stat.val}
              </div>
              <div className="text-[11px] text-gray-500">{stat.desc}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Recent Feedback Feed */}
          <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col min-h-[400px]">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC] flex justify-between items-center">
              <h2 className="text-[14px] font-semibold text-gray-900">
                Recent Survey Responses
              </h2>
              <div className="flex gap-2 text-[12px]">
                <select className="border border-[#DDE2EC] rounded bg-white text-[11px] px-2 py-1 focus:outline-none">
                  <option>All Departments</option>
                  <option>Emergency</option>
                  <option>Outpatient</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {[
                {
                  rating: 5,
                  dept: "Cardiology (OPD)",
                  comment:
                    "Dr. Jenkins was extremely thorough and took the time to answer all my questions. Staff was friendly.",
                  patient: "M.G.",
                  date: "Today, 10:45 AM",
                },
                {
                  rating: 2,
                  dept: "Emergency",
                  comment:
                    "Wait times were incredibly long. We waited 4 hours just to be seen for a broken arm. Once we saw the doctor, care was fine.",
                  patient: "Anonymous",
                  date: "Yesterday",
                },
                {
                  rating: 5,
                  dept: "Orthopedics",
                  comment:
                    "Surgery went perfectly, nursing staff in 3N was so attentive and kind.",
                  patient: "E.W.",
                  date: "Aug 22",
                },
                {
                  rating: 4,
                  dept: "Pharmacy",
                  comment:
                    "Fast service but the waiting area was a bit crowded.",
                  patient: "R.L.",
                  date: "Aug 21",
                },
              ].map((fb, i) => (
                <div
                  key={i}
                  className="border border-[#DDE2EC] rounded-none p-4 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex text-yellow-400 text-[14px]">
                        {[...Array(5)].map((_, j) => (
                          <span key={j}>{j < fb.rating ? "★" : "☆"}</span>
                        ))}
                      </div>
                      <span className="text-[12px] font-semibold text-gray-900">
                        {fb.dept}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B]">
                      {fb.date}
                    </span>
                  </div>
                  <p className="text-[13px] text-gray-700 italic mb-3">
                    "{fb.comment}"
                  </p>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#64748B]">
                      Patient: {fb.patient}
                    </span>
                    {fb.rating <= 3 && (
                      <button className="text-[#1B4FD8] font-medium hover:underline">
                        Follow Up / Escalate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grievances / Action Items */}
          <div className="w-80 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col">
            <div className="px-5 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC]">
              <h2 className="text-[13px] font-semibold text-gray-900 flex items-center gap-2">
                <Icon.Alert /> Active Grievances
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {[
                {
                  id: "G-9102",
                  issue: "Billing Dispute",
                  status: "In Review",
                  priority: "High",
                },
                {
                  id: "G-9088",
                  issue: "Rude Staff Behavior",
                  status: "Pending Interview",
                  priority: "High",
                },
                {
                  id: "G-9045",
                  issue: "Lost Patient Belongings",
                  status: "Investigation",
                  priority: "Medium",
                },
              ].map((g, i) => (
                <div
                  key={i}
                  className="border-l-4 border-red-500 bg-[#FAFBFF] border-t border-r border-b border-[#DDE2EC] rounded-r p-3"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[11px] font-mono text-[#64748B]">
                      {g.id}
                    </span>
                    <span className="text-[10px] font-bold text-red-600 uppercase">
                      {g.priority}
                    </span>
                  </div>
                  <div className="text-[13px] font-semibold text-gray-900 mb-1">
                    {g.issue}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[11.5px] text-[#1B4FD8]">
                      {g.status}
                    </span>
                    <button className="text-[11px] font-medium text-gray-600 hover:text-gray-900">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-[#DDE2EC] bg-[#F8FAFC] mt-auto">
              <button className="w-full text-center text-[12px] font-medium text-[#1B4FD8] hover:underline">
                View all 12 open grievances
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
