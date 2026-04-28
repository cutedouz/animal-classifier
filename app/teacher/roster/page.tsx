'use client'

import { useEffect, useMemo, useState } from 'react'

type StudentRow = {
  id: string
  schoolCode: string
  grade: string
  className: string
  seatNo: string
  studentName: string
  maskedName: string
  isActive: boolean
  note: string | null
  updatedAt: string | null
}

type TeacherClass = {
  schoolCode: string
  schoolName: string | null
  grade: string | null
  className: string
  students: StudentRow[]
}

type ApiData = {
  ok: boolean
  teacher?: {
    id: string
    username: string | null
    email: string | null
    displayName: string
  }
  classes: TeacherClass[]
}

type ImportResult = {
  ok?: boolean
  error?: string
  errors?: Array<{ row: number; message: string }>
  summary?: {
    totalRows: number
    validRows: number
    errorRows: number
    insertedRows?: number
    updatedRows?: number
    deactivatedBeforeImport?: number
  }
}

const TEMPLATE = `座號\t姓名\t性別／備註
1\t王小明\t
2\t陳小華\t
3\t林小美\t`

function classKey(item: TeacherClass) {
  return `${item.schoolCode}::${item.grade ?? ''}::${item.className}`
}

function labelClass(item: TeacherClass) {
  return `${item.schoolName ?? item.schoolCode} ${item.grade ? `${item.grade}年級 ` : ''}${item.className}班`
}

export default function TeacherRosterPage() {
  const [data, setData] = useState<ApiData | null>(null)
  const [selectedClassKey, setSelectedClassKey] = useState('')
  const [pasteText, setPasteText] = useState(TEMPLATE)
  const [mode, setMode] = useState<'upsert' | 'replace'>('upsert')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [authRequired, setAuthRequired] = useState(false)

  const selectedClass = useMemo(() => {
    return data?.classes.find((item) => classKey(item) === selectedClassKey) ?? null
  }, [data?.classes, selectedClassKey])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/teacher-roster', { cache: 'no-store' })
      const json = await response.json()

      if (response.status === 401) {
        setAuthRequired(true)
        setData(null)
        return
      }

      if (!response.ok) throw new Error(json?.error || '讀取學生名單失敗')

      setAuthRequired(false)
      setData(json)

      if (!selectedClassKey && json.classes?.length > 0) {
        setSelectedClassKey(classKey(json.classes[0]))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取學生名單失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function submitImport() {
    if (!selectedClass) {
      setError('請先選擇班級。')
      return
    }

    setImporting(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/teacher-roster/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: selectedClass.schoolCode,
          grade: selectedClass.grade,
          className: selectedClass.className,
          mode,
          text: pasteText,
        }),
      })

      const json = await response.json()
      setResult(json)

      if (!response.ok) {
        throw new Error(json?.error || '匯入學生名單失敗')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯入學生名單失敗')
    } finally {
      setImporting(false)
    }
  }

  if (authRequired) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-gray-900">學生名單管理</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            請先登入教師診斷頁，再回到學生名單管理。
          </p>
          <a
            href="/teacher"
            className="mt-5 inline-flex rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
          >
            前往教師登入
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">
                學生名單管理
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                教師可匯入自己已授權班級的學生名單。學生端不自行新增名單，仍從「班級參與」選擇教師匯入的名單。
              </p>
            </div>
            <div className="flex gap-2">
              <a
                href="/teacher"
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                回教師診斷頁
              </a>
              <button
                type="button"
                onClick={loadData}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
              >
                重新讀取
              </button>
            </div>
          </div>

          {data?.teacher ? (
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              目前登入：<span className="font-semibold text-gray-900">{data.teacher.displayName}</span>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black text-gray-900">選擇班級</h2>

              {loading ? (
                <div className="mt-4 text-sm text-gray-500">讀取中…</div>
              ) : null}

              <select
                value={selectedClassKey}
                onChange={(event) => setSelectedClassKey(event.target.value)}
                className="mt-4 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm"
              >
                {(data?.classes ?? []).map((item) => (
                  <option key={classKey(item)} value={classKey(item)}>
                    {labelClass(item)}
                  </option>
                ))}
              </select>

              {data && data.classes.length === 0 ? (
                <div className="mt-4 rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  此教師帳號尚未被授權任何班級。請先到 /admin/teachers 指派班級。
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black text-gray-900">目前名單</h2>
              <p className="mt-1 text-sm text-gray-500">
                僅顯示所選班級的學生。停用學生不會出現在學生入口名單中。
              </p>

              <div className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-3 py-2">座號</th>
                      <th className="px-3 py-2">姓名</th>
                      <th className="px-3 py-2">顯示名</th>
                      <th className="px-3 py-2">狀態</th>
                      <th className="px-3 py-2">性別／備註</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedClass?.students ?? []).map((student) => (
                      <tr key={student.id} className="border-t border-gray-100">
                        <td className="px-3 py-2">{student.seatNo}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900">{student.studentName}</td>
                        <td className="px-3 py-2">{student.maskedName}</td>
                        <td className="px-3 py-2">{student.isActive ? '啟用' : '停用'}</td>
                        <td className="px-3 py-2">{student.note ?? ''}</td>
                      </tr>
                    ))}

                    {selectedClass && selectedClass.students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                          此班目前尚無學生名單。
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black text-gray-900">匯入學生名單</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                支援 tab、逗號或空白分隔。建議格式：座號、姓名、性別／備註。第一列可有標題。
              </p>

              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-gray-800">
                  {TEMPLATE}
                </pre>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm">
                  <input
                    type="radio"
                    checked={mode === 'upsert'}
                    onChange={() => setMode('upsert')}
                  />
                  新增／更新名單
                </label>
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm">
                  <input
                    type="radio"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                  />
                  覆蓋整班名單
                </label>
              </div>

              <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-6 text-yellow-900">
                「覆蓋整班名單」會先停用該班原有學生，再啟用本次貼上的學生。若只是補學生或改姓名，請用「新增／更新名單」。
              </div>

              <textarea
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                className="mt-4 min-h-[300px] w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm leading-6 text-gray-900"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPasteText(TEMPLATE)}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700"
                >
                  載入範例
                </button>
                <button
                  type="button"
                  onClick={submitImport}
                  disabled={importing || !selectedClass || !pasteText.trim()}
                  className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {importing ? '匯入中…' : '匯入名單'}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-2xl font-black text-gray-900">匯入結果</h2>

              {result?.summary ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-sm text-gray-500">有效列數</div>
                    <div className="mt-1 text-2xl font-black">{result.summary.validRows}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-sm text-gray-500">錯誤列數</div>
                    <div className="mt-1 text-2xl font-black">{result.summary.errorRows}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-sm text-gray-500">新增筆數</div>
                    <div className="mt-1 text-2xl font-black">{result.summary.insertedRows ?? 0}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-sm text-gray-500">更新筆數</div>
                    <div className="mt-1 text-2xl font-black">{result.summary.updatedRows ?? 0}</div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  尚未匯入。
                </div>
              )}

              {result?.errors?.length ? (
                <div className="mt-4 space-y-2">
                  {result.errors.map((item, index) => (
                    <div
                      key={`${item.row}-${index}`}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      第 {item.row} 列：{item.message}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
