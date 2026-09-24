import React, { useState } from "react"
import { Icon } from "./icons"

type ShiftCategory = "Outpatient" | "Inpatient" | "Off Duty"

interface Shift {
  id: string
  dayIndex: number
  startHour: number
  durationHours: number
  category: ShiftCategory
  type: string
  details: string
}

const DEFAULT_SHIFTS: Shift[] = [
  {
    id: "1",
    dayIndex: 0,
    startHour: 9,
    durationHours: 1,
    category: "Outpatient",
    type: "OPD Consults",
    details: "4/4 Slots Booked",
  },
  {
    id: "2",
    dayIndex: 0,
    startHour: 13,
    durationHours: 2,
    category: "Inpatient",
    type: "Surgery (OR 2)",
    details: "CABG - Blocked",
  },
  {
    id: "3",
    dayIndex: 1,
    startHour: 8,
    durationHours: 3,
    category: "Outpatient",
    type: "OPD Consults",
    details: "8/12 Slots Booked",
  },
  {
    id: "4",
    dayIndex: 2,
    startHour: 8,
    durationHours: 11,
    category: "Off Duty",
    type: "OFF DUTY",
    details: "",
  },
  {
    id: "5",
    dayIndex: 3,
    startHour: 10,
    durationHours: 4,
    category: "Inpatient",
    type: "Ward Rounds (3N)",
    details: "",
  },
  {
    id: "6",
    dayIndex: 4,
    startHour: 9,
    durationHours: 3,
    category: "Outpatient",
    type: "Teleconsults",
    details: "12/12 Slots Booked",
  },
]

export default function DoctorScheduling() {
  const [selectedDoctor, setSelectedDoctor] = useState(
    "Dr. Sarah Jenkins (Cardiology)",
  )
  const [shifts, setShifts] = useState<Shift[]>(DEFAULT_SHIFTS)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form state
  const [formCategory, setFormCategory] = useState<ShiftCategory>("Outpatient")
  const [formType, setFormType] = useState("OPD Consults")
  const [formDay, setFormDay] = useState(0)
  const [formStart, setFormStart] = useState(9)
  const [formDuration, setFormDuration] = useState(2)
  const [formDetails, setFormDetails] = useState("")

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault()
    const newShift: Shift = {
      id: Math.random().toString(36).substr(2, 9),
      dayIndex: formDay,
      startHour: formStart,
      durationHours: formDuration,
      category: formCategory,
      type: formType,
      details: formDetails,
    }
    setShifts([...shifts, newShift])
    setShowAddModal(false)
  }

  const getShiftStyles = (category: ShiftCategory, type: string) => {
    if (category === "Off Duty")
      return {
        bg: "bg-[#F1F5F9]",
        border: "border-[#E2E8F0]",
        text: "text-[#64748B]",
      }
    if (category === "Outpatient") {
      if (type.includes("Tele"))
        return {
          bg: "bg-[#F3E8FF]",
          border: "border-[#E9D5FF]",
          text: "text-[#7E22CE]",
        }
      return {
        bg: "bg-[#DBEAFE]",
        border: "border-[#BFDBFE]",
        text: "text-[#1E3A8A]",
      }
    }
    // Inpatient
    if (type.includes("Surge") || type.includes("OR"))
      return {
        bg: "bg-[#FEF3C7]",
        border: "border-[#FDE68A]",
        text: "text-[#92400E]",
      }
    return {
      bg: "bg-[#DCFCE7]",
      border: "border-[#BBF7D0]",
      text: "text-[#15803D]",
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F0F2F5] relative">
      <div className="bg-white border-b border-[#DDE2EC] px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Doctor Scheduling
          </h1>
          <p className="text-[12.5px] text-[#64748B]">
            Manage physician availability, consultation slots, and leaves.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="h-8 px-3 bg-white border border-[#DDE2EC] text-[#1B4FD8] text-[12px] font-medium rounded hover:bg-[#F8FAFC] transition-colors">
            Generate Roster
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="h-8 px-3 bg-[#1B4FD8] text-white text-[12px] font-medium rounded hover:bg-[#1740B4] transition-colors flex items-center gap-2"
          >
            <Icon.Plus /> Add Shift
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 flex gap-6 max-w-7xl mx-auto w-full relative">
        {/* Left Side: Filter and Settings */}
        <div className="w-80 flex flex-col gap-6">
          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm p-4">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-4">
              Select Physician
            </h2>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 mb-4 focus:outline-none focus:border-[#1B4FD8]"
            >
              <option>Dr. Sarah Jenkins (Cardiology)</option>
              <option>Dr. Marcus Chen (Orthopedics)</option>
              <option>Dr. Emily Taylor (Pediatrics)</option>
              <option>Dr. Robert Lee (Internal Medicine)</option>
            </select>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-[12.5px]">
                <span className="text-[#64748B]">Standard Slot Duration</span>
                <span className="font-semibold text-gray-900">15 mins</span>
              </div>
              <div className="flex justify-between items-center text-[12.5px]">
                <span className="text-[#64748B]">Max Daily Patients</span>
                <span className="font-semibold text-gray-900">32</span>
              </div>
              <div className="flex justify-between items-center text-[12.5px]">
                <span className="text-[#64748B]">Teleconsult Allowed</span>
                <span className="font-semibold text-green-600">Yes</span>
              </div>
            </div>

            <button className="w-full mt-4 h-8 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-gray-700 text-[12px] font-medium rounded transition-colors">
              Edit Settings
            </button>
          </div>

          <div className="bg-white border border-[#DDE2EC] rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#DDE2EC] bg-[#F8FAFC]">
              <h2 className="text-[13px] font-semibold text-gray-900">
                Pending Leave Requests
              </h2>
            </div>
            <div className="p-4 space-y-4 text-[12.5px]">
              <div className="border border-[#DDE2EC] rounded p-3 bg-[#FAFBFF]">
                <div className="font-semibold text-gray-900 mb-1">
                  Annual Leave
                </div>
                <div className="text-[#64748B] mb-2">
                  12 Sep 2026 - 15 Sep 2026
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-1 bg-[#15803D] text-white rounded text-[11px] font-medium">
                    Approve
                  </button>
                  <button className="flex-1 py-1 bg-white border border-[#DDE2EC] text-gray-700 rounded text-[11px] font-medium">
                    Deny
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Weekly Calendar View */}
        <div className="flex-1 bg-white border border-[#DDE2EC] rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DDE2EC] flex justify-between items-center bg-[#F8FAFC]">
            <div className="flex items-center gap-4">
              <button className="text-[#64748B] hover:text-gray-900">
                <span className="inline-block rotate-180">
                  <Icon.ChevronRight />
                </span>
              </button>
              <h2 className="text-[15px] font-bold text-gray-900">
                August 24 - August 30, 2026
              </h2>
              <button className="text-[#64748B] hover:text-gray-900">
                <Icon.ChevronRight />
              </button>
            </div>
            <div className="flex gap-2 text-[12px] font-medium">
              <button className="px-3 py-1.5 bg-white border border-[#DDE2EC] rounded shadow-sm">
                Day
              </button>
              <button className="px-3 py-1.5 bg-[#1B4FD8] text-white border border-[#1B4FD8] rounded shadow-sm">
                Week
              </button>
              <button className="px-3 py-1.5 bg-white border border-[#DDE2EC] rounded shadow-sm">
                Month
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-gray-50 flex">
            {/* Time column */}
            <div className="w-16 border-r border-[#DDE2EC] bg-white flex flex-col text-[11px] text-[#94A3B8] font-mono items-center pt-10">
              {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                <div key={h} className="h-16 relative w-full text-center">
                  <span className="absolute -top-2 left-0 right-0">{h}:00</span>
                </div>
              ))}
            </div>

            {/* Days columns */}
            <div className="flex-1 grid grid-cols-5 divide-x divide-[#DDE2EC]">
              {["Mon 24", "Tue 25", "Wed 26", "Thu 27", "Fri 28"].map(
                (day, i) => (
                  <div key={i} className="flex flex-col relative">
                    <div className="h-10 border-b border-[#DDE2EC] bg-white flex items-center justify-center text-[12.5px] font-semibold text-gray-900 sticky top-0 z-10">
                      {day}
                    </div>
                    <div className="relative h-[704px] bg-white bg-[linear-gradient(#F1F5F9_1px,transparent_1px)] bg-[size:100%_64px]">
                      {shifts
                        .filter((s) => s.dayIndex === i)
                        .map((shift) => {
                          const top = (shift.startHour - 8) * 64
                          const height = shift.durationHours * 64
                          const styles = getShiftStyles(
                            shift.category,
                            shift.type,
                          )

                          if (shift.category === "Off Duty") {
                            return (
                              <div
                                key={shift.id}
                                className={`absolute left-1 right-1 border rounded-md flex items-center justify-center shadow-sm ${styles.bg} ${styles.border}`}
                                style={{ top, height }}
                              >
                                <div
                                  className={`text-[12px] font-bold ${styles.text} rotate-[-90deg] whitespace-nowrap`}
                                >
                                  {shift.type}
                                </div>
                              </div>
                            )
                          }

                          return (
                            <div
                              key={shift.id}
                              className={`absolute left-1 right-1 border rounded-md p-2 shadow-sm flex flex-col overflow-hidden ${styles.bg} ${styles.border}`}
                              style={{ top, height }}
                            >
                              <div
                                className={`text-[11px] font-bold ${styles.text}`}
                              >
                                {shift.type}
                              </div>
                              {shift.details && (
                                <div
                                  className={`text-[10px] ${styles.text} opacity-80 mt-0.5`}
                                >
                                  {shift.details}
                                </div>
                              )}
                              <button
                                className="absolute top-1 right-1 text-[#94A3B8] hover:text-[#EF4444]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShifts(
                                    shifts.filter((s) => s.id !== shift.id),
                                  )
                                }}
                              >
                                <Icon.X />
                              </button>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="absolute inset-0 bg-gray-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-[480px] max-w-full overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#DDE2EC] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-semibold text-gray-900">Add Doctor Shift</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#94A3B8] hover:text-gray-900"
              >
                <Icon.X />
              </button>
            </div>
            <form onSubmit={handleAddShift} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Shift Category
                </label>
                <div className="flex gap-2">
                  {([
                    "Outpatient",
                    "Inpatient",
                    "Off Duty",
                  ] as ShiftCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setFormCategory(cat)
                        setFormType(
                          cat === "Outpatient"
                            ? "OPD Consults"
                            : cat === "Inpatient"
                              ? "Ward Rounds"
                              : "OFF DUTY",
                        )
                      }}
                      className={`flex-1 py-1.5 border rounded text-[12.5px] font-medium transition-colors ${
                        formCategory === cat
                          ? "bg-[#1B4FD8] border-[#1B4FD8] text-white"
                          : "bg-white border-[#DDE2EC] text-gray-700 hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {formCategory !== "Off Duty" && (
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Shift Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]"
                  >
                    {formCategory === "Outpatient" ? (
                      <>
                        <option>OPD Consults</option>
                        <option>Teleconsults</option>
                        <option>Specialty Clinic</option>
                      </>
                    ) : (
                      <>
                        <option>Ward Rounds</option>
                        <option>Surgery (OR)</option>
                        <option>ICU Cover</option>
                        <option>On-Call</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Day of Week
                  </label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(Number(e.target.value))}
                    className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]"
                  >
                    <option value={0}>Monday</option>
                    <option value={1}>Tuesday</option>
                    <option value={2}>Wednesday</option>
                    <option value={3}>Thursday</option>
                    <option value={4}>Friday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <select
                    value={formStart}
                    onChange={(e) => setFormStart(Number(e.target.value))}
                    className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]"
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">
                  Duration (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                  className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]"
                />
              </div>

              {formCategory !== "Off Duty" && (
                <div>
                  <label className="block text-[12px] font-medium text-gray-700 mb-1">
                    Additional Details (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ward 3N, OR 2, etc."
                    value={formDetails}
                    onChange={(e) => setFormDetails(e.target.value)}
                    className="w-full border border-[#DDE2EC] rounded bg-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#1B4FD8]"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2 mt-2 border-t border-[#DDE2EC]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-9 bg-white border border-[#DDE2EC] text-gray-700 rounded text-[13px] font-medium hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 bg-[#1B4FD8] text-white rounded text-[13px] font-medium hover:bg-[#1740B4]"
                >
                  Add Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
