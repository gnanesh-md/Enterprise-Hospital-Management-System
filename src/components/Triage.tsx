import React, { useState, useEffect } from "react"
import { FiArrowLeft } from "react-icons/fi"
import { apiFetch } from "../lib/api"
import type { Notice } from "../types"
import {
  VisitDetailPanel,
  ErErrorBoundary,
  type ErVisitDetail,
  type TriageCategory,
  type ErVisit,
} from "../pages/ErPage"
import PrescriptionUploadModal from "./PrescriptionUploadModal"

// The patient queue/list lives in one place -- the ED Track Board
// (ErPage.tsx). Triage is reached by clicking "Open" there (App.tsx's
// onOpenTriage sets selectedTriageVisitId + module="triage") and shows only
// that one patient's triage content: vitals, the AI Triage Assistant, and
// doctor assignment, via the same VisitDetailPanel the Track Board itself
// uses. It does not re-list patients.
export default function Triage({
  initialVisitId,
  setNotice,
  onNavigate,
}: {
  initialVisitId?: number | null
  setNotice?: (notice: Notice | null) => void
  onNavigate?: (module: string) => void
}) {
  const [visits, setVisits] = useState<ErVisit[]>([])
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(
    initialVisitId || null,
  )
  const [detail, setDetail] = useState<ErVisitDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [categories, setCategories] = useState<TriageCategory[]>([])
  const [prescriptionTarget, setPrescriptionTarget] = useState<{
    id: string
    name: string
    doctorName?: string
  } | null>(null)

  const loadVisitsAndConfig = async () => {
    try {
      const [visitsRes, catsRes] = await Promise.all([
        apiFetch<{ visits: ErVisit[] }>("/api/er/visits?active_only=true"),
        apiFetch<{ categories: TriageCategory[] }>("/api/er/triage-config"),
      ])
      const list = visitsRes?.visits || []
      setVisits(list)
      setCategories(catsRes?.categories || [])

      if (initialVisitId && list.some((v) => v.id === initialVisitId)) {
        setSelectedVisitId(initialVisitId)
      }
    } catch {
      // Standalone mode / offline fallback already handled
    }
  }

  const loadDetail = async (visitId: number) => {
    setDetailLoading(true)
    try {
      const data = await apiFetch<ErVisitDetail>(`/api/er/visits/${visitId}`)
      setDetail(data || null)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    loadVisitsAndConfig()
  }, [initialVisitId])

  useEffect(() => {
    if (selectedVisitId) {
      loadDetail(selectedVisitId)
    }
  }, [selectedVisitId])

  const refreshAfterAction = async () => {
    await loadVisitsAndConfig()
    if (selectedVisitId) {
      await loadDetail(selectedVisitId)
    }
  }

  if (!selectedVisitId) {
    return (
      <div className="flex-1 bg-[#F0F2F5] p-5 sm:p-6 min-h-full">
        <div className="bg-white border border-[#DDE2EC] rounded p-12 text-center text-[#64748B] shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded bg-blue-50 text-[#1B4FD8] flex items-center justify-center text-2xl mx-auto">
            🛡️
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">No Patient Selected</h2>
            <p className="text-[12.5px] text-[#64748B] mt-1">
              Open a patient from the ED Track Board to triage them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.("emergency")}
            className="px-4 py-2 bg-[#1B4FD8] hover:bg-[#1E40AF] text-white font-semibold rounded text-[12px] transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <FiArrowLeft /> Go to ED Track Board
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[#F0F2F5] p-5 sm:p-6 min-h-full space-y-3">
      {detail ? (
        <ErErrorBoundary onReset={refreshAfterAction}>
          <VisitDetailPanel
            key={detail.id}
            detail={detail}
            loading={detailLoading}
            categories={categories}
            setNotice={setNotice || (() => {})}
            onNavigate={onNavigate}
            onBack={() => onNavigate?.("emergency")}
            onRefresh={refreshAfterAction}
            onOrderMedication={() =>
              setPrescriptionTarget({
                id: detail.patient_id || "",
                name: detail.patient_id
                  ? detail.patient_id
                  : detail.unknown_patient_label || detail.visit_no,
                doctorName: detail.assigned_doctor_name || undefined,
              })
            }
            visits={visits}
            onSelectVisit={(id) => setSelectedVisitId(id)}
          />
        </ErErrorBoundary>
      ) : (
        <div className="bg-white border border-[#DDE2EC] rounded p-12 text-center text-[#64748B]">
          <p className="text-[13px]">Loading patient chart...</p>
        </div>
      )}

      {prescriptionTarget && (
        <PrescriptionUploadModal
          patientId={prescriptionTarget.id}
          patientName={prescriptionTarget.name}
          doctorName={prescriptionTarget.doctorName}
          mode="manual"
          setNotice={setNotice || (() => {})}
          onClose={() => setPrescriptionTarget(null)}
        />
      )}
    </div>
  )
}
