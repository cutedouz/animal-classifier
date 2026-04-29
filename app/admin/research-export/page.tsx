'use client'

import { useState } from 'react'

type ExportKind = 'item_level_latest' | 'student_summary' | 'class_summary'

const EXPORTS: Array<{ kind: ExportKind; title: string; description: string }> = [
  {
    kind: 'item_level_latest',
    title: '題目層級最新有效資料',
    description: '一列為一位學生在一個階段的一題作答。使用 latest_learning_item_logs，適合 GLMM 與題目層級診斷。',
  },
  {
    kind: 'student_summary',
    title: '學生層級摘要',
    description: '一列為一位學生。包含 evidence / transfer 正確率、判準品質比例、誤導線索與高信心錯誤率，適合 LPA。',
  },
  {
    kind: 'class_summary',
    title: '班級層級摘要',
    description: '一列為一個班級。包含班級平均正確率、遷移落差、判準品質與高信心錯誤摘要。',
  },
]

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminResearchExportPage() {
  const [adminPassword, setAdminPassword] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [grade, setGrade] = useState('')
  const [className, setClassName] = useState('')
  const [stage, setStage] = useState('')
  const [loadingKind, setLoadingKind] = useState<ExportKind | null>(null)
  const [error, setError] = useState('')

  async function downloadExport(kind: ExportKind) {
    setError('')
    setLoadingKind(kind)

    try {
      const params = new URLSearchParams()
      params.set('kind', kind)
      if (schoolCode.trim()) params.set('schoolCode', schoolCode.trim())
      if (grade.trim()) params.set('grade', grade.trim())
      if (className.trim()) params.set('className', className.trim())
      if (stage.trim()) params.set('stage', stage.trim())

      const response = await fetch(`/api/admin/research-export?${params.toString()}`, {
        method: 'GET',
        headers: { 'x-admin-password': adminPassword },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || '匯出失敗')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${kind}_${todayString()}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯出失敗')
    } finally {
      setLoadingKind(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">研究資料匯出</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                此頁供管理者下載正式分析前的 CSV。匯出資料使用 latest_learning_item_logs，避免同一學生同一階段同一題重複作答被重複計算。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/admin/teachers" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">教師管理</a>
              <a href="/admin/import" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">名單匯入</a>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-gray-900">管理密碼與篩選條件</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="管理密碼" className="rounded-xl border border-gray-300 px-4 py-3 text-sm lg:col-span-2" />
            <input value={schoolCode} onChange={(event) => setSchoolCode(event.target.value)} placeholder="school_code，可留空" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="grade，可留空" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
            <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="class_name，可留空" className="rounded-xl border border-gray-300 px-4 py-3 text-sm" />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <select value={stage} onChange={(event) => setStage(event.target.value)} className="rounded-xl border border-gray-300 px-4 py-3 text-sm">
              <option value="">全部階段</option>
              <option value="evidence">第 4 階段：帶提示判定</option>
              <option value="transfer">第 5 階段：遷移應用</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setAdminPassword('')
                setSchoolCode('')
                setGrade('')
                setClassName('')
                setStage('')
                setError('')
              }}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700"
            >
              清除
            </button>
          </div>

          {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {EXPORTS.map((item) => (
            <div key={item.kind} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-gray-900">{item.title}</h2>
              <p className="mt-2 min-h-[96px] text-sm leading-6 text-gray-600">{item.description}</p>
              <button
                type="button"
                disabled={!adminPassword || loadingKind !== null}
                onClick={() => downloadExport(item.kind)}
                className="mt-5 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {loadingKind === item.kind ? '匯出中…' : '下載 CSV'}
              </button>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <div className="font-bold">使用提醒</div>
          <p className="mt-1">這些 CSV 是分析資料，不是對外公開報表。匯出後請妥善保存，不要將含有座號或可識別班級資訊的資料公開分享。</p>
        </section>
      </div>
    </main>
  )
}
