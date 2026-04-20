'use client'

import { useMemo, useState } from 'react'

type Summary = {
  totalStudents: number
  avgAccuracy: number
  avgAwarenessSeconds: number
  avgReadinessRetryCount: number
}

type ItemAccuracyRow = {
  animalName: string
  total: number
  correct: number
  accuracy: number
  topWrongAnswers: { answer: string; count: number }[]
}

type FeatureUsageRow = {
  feature: string
  diagnostic: number
  possible: number
  total: number
}

type StudentRow = {
  id: string
  participantCode: string
  maskedName: string
  grade: string
  className: string
  seatNo: string
  correctCount: number
  totalQuestionCount: number
  awarenessSecondsSpent: number
  readinessRetryCount: number
  readinessFirstPassCount: number
  cardMoveCount: number
  groupCreateCount: number
  updatedAt: string
}

type ReportResponse = {
  ok: boolean
  summary: Summary
  itemAccuracy: ItemAccuracyRow[]
  featureUsage: FeatureUsageRow[]
  studentRows: StudentRow[]
}

export default function TeacherPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<ReportResponse | null>(null)
  const [keyword, setKeyword] = useState('')

  async function loadReport() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/teacher-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || '讀取失敗')
      }

      setReport(result)
    } catch (error: any) {
      setError(error.message || '讀取失敗')
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = useMemo(() => {
    if (!report) return []
    const k = keyword.trim()
    if (!k) return report.studentRows

    return report.studentRows.filter((row) =>
      [
        row.maskedName,
        row.grade,
        row.className,
        row.seatNo,
        row.participantCode,
      ]
        .join(' ')
        .includes(k)
    )
  }, [report, keyword])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h1 className="text-3xl font-black text-gray-900">教師端分析頁</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            請輸入教師密碼後載入整體報表。此頁提供整體表現、各題正確率、常見錯誤與學生摘要。
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="教師密碼"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm md:max-w-sm"
            />
            <button
              type="button"
              onClick={loadReport}
              disabled={loading || !password}
              className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? '載入中…' : '載入報表'}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>

        {report ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">學生數</div>
                <div className="mt-2 text-3xl font-black">{report.summary.totalStudents}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">平均正確率</div>
                <div className="mt-2 text-3xl font-black">
                  {(report.summary.avgAccuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">第二階段平均秒數</div>
                <div className="mt-2 text-3xl font-black">
                  {report.summary.avgAwarenessSeconds.toFixed(1)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">就緒檢核平均重試次數</div>
                <div className="mt-2 text-3xl font-black">
                  {report.summary.avgReadinessRetryCount.toFixed(2)}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">各題正確率與常見錯誤</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2">生物</th>
                      <th className="px-3 py-2">答對 / 作答</th>
                      <th className="px-3 py-2">正確率</th>
                      <th className="px-3 py-2">最常見錯答</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.itemAccuracy.map((row) => (
                      <tr key={row.animalName} className="border-b border-gray-100 align-top">
                        <td className="px-3 py-2 font-semibold">{row.animalName}</td>
                        <td className="px-3 py-2">
                          {row.correct} / {row.total}
                        </td>
                        <td className="px-3 py-2">{(row.accuracy * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2">
                          {row.topWrongAnswers.length
                            ? row.topWrongAnswers
                                .map((item) => `${item.answer}（${item.count}）`)
                                .join('、')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">第二階段特徵使用分布</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2">特徵</th>
                      <th className="px-3 py-2">較適合幫助分門</th>
                      <th className="px-3 py-2">可能有幫助但不穩定</th>
                      <th className="px-3 py-2">總次數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.featureUsage.map((row) => (
                      <tr key={row.feature} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-semibold">{row.feature}</td>
                        <td className="px-3 py-2">{row.diagnostic}</td>
                        <td className="px-3 py-2">{row.possible}</td>
                        <td className="px-3 py-2">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-2xl font-black text-gray-900">學生摘要</h2>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="搜尋姓名 / 班級 / 座號 / participantCode"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm md:max-w-sm"
                />
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2">學生</th>
                      <th className="px-3 py-2">班級</th>
                      <th className="px-3 py-2">正確題數</th>
                      <th className="px-3 py-2">第二階段秒數</th>
                      <th className="px-3 py-2">重試次數</th>
                      <th className="px-3 py-2">拖曳次數</th>
                      <th className="px-3 py-2">新增群組</th>
                      <th className="px-3 py-2">更新時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-semibold">{row.maskedName}</td>
                        <td className="px-3 py-2">
                          {row.grade} 年級 {row.className} 班 {row.seatNo} 號
                        </td>
                        <td className="px-3 py-2">
                          {row.correctCount} / {row.totalQuestionCount}
                        </td>
                        <td className="px-3 py-2">{row.awarenessSecondsSpent}</td>
                        <td className="px-3 py-2">{row.readinessRetryCount}</td>
                        <td className="px-3 py-2">{row.cardMoveCount}</td>
                        <td className="px-3 py-2">{row.groupCreateCount}</td>
                        <td className="px-3 py-2">{new Date(row.updatedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}