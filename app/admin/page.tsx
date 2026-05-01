'use client'

import { useEffect, useState } from 'react'

type Application = {
  id: string
  status: string
  requested_username: string | null
  teacher_name: string
  email: string
  phone: string | null
  county: string | null
  school_name: string
  subject: string | null
  class_names: string | null
  estimated_student_count: number | null
  purpose: string | null
  note: string | null
  review_note: string | null
  created_at: string
}

type Overview = {
  ok: true
  summary: {
    schoolCount: number | null
    teacherCount: number | null
    superTeacherCount: number | null
    pendingApplicationCount: number | null
    totalApplicationCount: number | null
    activeRosterStudentCount: number | null
    rosterClassCount: number
    learningRecordCount: number | null
  }
  errors: string[]
}

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待審核' },
  { value: 'need_more_info', label: '退回補件' },
  { value: 'approved', label: '已核准' },
  { value: 'rejected', label: '已拒絕' },
]

const STATUS_LABEL: Record<string, string> = {
  pending: '待審核',
  need_more_info: '退回補件',
  approved: '已核准',
  rejected: '已拒絕',
}

function statusTone(status: string) {
  if (status === 'pending') return 'bg-amber-100 text-amber-800'
  if (status === 'approved') return 'bg-green-100 text-green-700'
  if (status === 'rejected') return 'bg-red-100 text-red-700'
  if (status === 'need_more_info') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-700'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function countText(value: number | null | undefined) {
  if (value == null) return '—'
  return String(value)
}

export default function AdminCenterPage() {
  const [adminPassword, setAdminPassword] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({})

  useEffect(() => {
    const saved = localStorage.getItem('animal-classifier-admin-password') ?? ''
    if (saved) setAdminPassword(saved)
  }, [])

  async function loadAll(password = adminPassword) {
    setLoading(true)
    setError('')

    try {
      localStorage.setItem('animal-classifier-admin-password', password)

      const [overviewResponse, applicationsResponse] = await Promise.all([
        fetch('/api/admin/overview', { headers: { 'x-admin-password': password }, cache: 'no-store' }),
        fetch(`/api/admin/teacher-applications?status=${encodeURIComponent(statusFilter)}`, {
          headers: { 'x-admin-password': password },
          cache: 'no-store',
        }),
      ])

      const overviewResult = await overviewResponse.json()
      const applicationsResult = await applicationsResponse.json()

      if (!overviewResponse.ok) throw new Error(overviewResult?.error || '讀取管理中心失敗。')
      if (!applicationsResponse.ok) throw new Error(applicationsResult?.error || '讀取教師申請失敗。')

      setOverview(overviewResult)
      setApplications(applicationsResult.applications ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取資料失敗。')
      setOverview(null)
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    setError('')
    try {
      const response = await fetch('/api/admin/teacher-applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
        body: JSON.stringify({ id, status, reviewNote: reviewNote[id] ?? '' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || '更新失敗。')
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失敗。')
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f6f2] px-4 py-8 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[28px] border border-[#d8ddd8] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-[#234a2c]">Sci-Flipper 管理中心</h1>
              <p className="mt-3 text-sm leading-6 text-[#667266]">整合教師申請、教師帳號、學校名單、學生名單與研究資料匯出。此頁使用 ADMIN_PASSWORD。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminLink href="/admin/teachers" label="教師帳號管理" />
              <AdminLink href="/admin/import" label="學校／學生匯入" />
              <AdminLink href="/admin/research-export" label="研究資料匯出" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="輸入管理密碼 ADMIN_PASSWORD" className="rounded-xl border border-[#ccd5cc] px-3 py-3 text-sm" />
            <button type="button" onClick={() => loadAll()} disabled={!adminPassword || loading} className="rounded-xl bg-[#234a2c] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{loading ? '讀取中…' : '讀取管理資料'}</button>
          </div>

          {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        </section>

        {overview ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="待審核申請" value={countText(overview.summary.pendingApplicationCount)} helper={`總申請：${countText(overview.summary.totalApplicationCount)}`} />
            <SummaryCard title="教師帳號" value={countText(overview.summary.teacherCount)} helper={`super teacher：${countText(overview.summary.superTeacherCount)}`} />
            <SummaryCard title="正式學生名單" value={countText(overview.summary.activeRosterStudentCount)} helper={`班級數：${countText(overview.summary.rosterClassCount)}`} />
            <SummaryCard title="學校數" value={countText(overview.summary.schoolCount)} helper={`作答紀錄：${countText(overview.summary.learningRecordCount)}`} />
          </section>
        ) : null}

        <section className="rounded-[28px] border border-[#d8ddd8] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#234a2c]">教師申請審核</h2>
              <p className="mt-1 text-sm leading-6 text-[#667266]">v1-a 僅處理申請狀態。核准後仍需到「教師帳號管理」建立帳號與班級授權；下一版可改為自動建立。</p>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm">
              {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => loadAll()} disabled={!adminPassword || loading} className="rounded-xl border border-[#c8d2c8] bg-white px-4 py-2 text-sm font-bold text-[#234a2c] disabled:opacity-60">重新整理申請</button>
          </div>

          <div className="mt-5 space-y-4">
            {applications.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">目前沒有符合條件的教師申請。</div>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black text-gray-900">{app.teacher_name}</h3>
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTone(app.status)}`}>{STATUS_LABEL[app.status] ?? app.status}</span>
                      </div>
                      <div className="mt-2 text-sm leading-6 text-gray-600">{app.school_name}{app.county ? `（${app.county}）` : ''}｜{app.email}</div>
                      <div className="text-sm leading-6 text-gray-600">希望帳號：<span className="font-mono">{app.requested_username ?? '—'}</span>｜任教科目：{app.subject ?? '—'}｜預計學生：{app.estimated_student_count ?? '—'}</div>
                      <div className="text-sm leading-6 text-gray-600">申請時間：{formatDate(app.created_at)}</div>
                    </div>
                    <div className="text-right text-xs text-gray-500"><div>申請 ID</div><div className="font-mono">{app.id}</div></div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <InfoBox title="預計使用班級" text={app.class_names || '—'} />
                    <InfoBox title="使用目的與備註" text={`目的：${app.purpose ?? '—'}\n備註：${app.note ?? '—'}`} />
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-bold text-gray-700">審核備註</label>
                    <textarea value={reviewNote[app.id] ?? app.review_note ?? ''} onChange={(e) => setReviewNote((prev) => ({ ...prev, [app.id]: e.target.value }))} rows={2} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="例如：請補充班級資訊；已通知教師；核准後待建立帳號。" />
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => updateStatus(app.id, 'need_more_info')} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">退回補件</button>
                    <button type="button" onClick={() => updateStatus(app.id, 'rejected')} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">拒絕</button>
                    <button type="button" onClick={() => updateStatus(app.id, 'approved')} className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-green-700">標記核准</button>
                    <a href="/admin/teachers" className="rounded-xl bg-[#234a2c] px-3 py-2 text-sm font-bold text-white">前往建立教師帳號</a>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return <a href={href} className="rounded-xl border border-[#c8d2c8] bg-white px-4 py-2 text-sm font-bold text-[#234a2c]">{label}</a>
}

function SummaryCard({ title, value, helper }: { title: string; value: string; helper?: string }) {
  return <div className="rounded-2xl border border-[#d8ddd8] bg-white p-5 shadow-sm"><div className="text-sm font-bold text-[#667266]">{title}</div><div className="mt-2 text-4xl font-black text-[#234a2c]">{value}</div>{helper ? <div className="mt-2 text-xs leading-5 text-[#667266]">{helper}</div> : null}</div>
}

function InfoBox({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl bg-gray-50 p-3"><div className="text-xs font-bold text-gray-500">{title}</div><pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">{text}</pre></div>
}
