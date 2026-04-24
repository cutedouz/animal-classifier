'use client'

import { useMemo, useState } from 'react'

type TabKey = 'schools' | 'students'

type ImportResult = {
  ok?: boolean
  error?: string
  action?: 'validate' | 'import'
  table?: string
  summary?: {
    totalRows: number
    validRows: number
    errorRows: number
    insertedRows?: number
    updatedRows?: number
    skippedRows?: number
  }
  preview?: Record<string, any>[]
  errors?: { row: number; message: string }[]
}

const SCHOOL_TEMPLATE = `school_code\tschool_name\tcounty\tsort_order\tis_active
臺中市光榮國中\t臺中市光榮國中\t臺中市\t85\ttrue
臺中市大道國中\t臺中市大道國中\t臺中市\t80\ttrue`

const STUDENT_TEMPLATE = `school_code\tgrade\tclass_name\tseat_no\tstudent_name\tmasked_name\tis_active\tnote
臺南市南新國中\t7\t708\t13\t黃芷歆\t黃O歆\ttrue\t女`

function SummaryCard({
  title,
  value,
}: {
  title: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
    </div>
  )
}

export default function ImportPage() {
  const [tab, setTab] = useState<TabKey>('schools')
  const [password, setPassword] = useState('')
  const [inputText, setInputText] = useState({
    schools: SCHOOL_TEMPLATE,
    students: STUDENT_TEMPLATE,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const currentEndpoint =
    tab === 'schools' ? '/api/import-schools' : '/api/import-students'

  const currentTemplate = tab === 'schools' ? SCHOOL_TEMPLATE : STUDENT_TEMPLATE

  const currentInput = inputText[tab]

  const previewRows = useMemo(() => result?.preview ?? [], [result])

  async function runAction(action: 'validate' | 'import') {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(currentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          action,
          text: currentInput,
        }),
      })

      const data = (await response.json()) as ImportResult

      if (!response.ok) {
        setResult(data)
      } else {
        setResult(data)
      }
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : 'unexpected error',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleFileUpload(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      setInputText((prev) => ({
        ...prev,
        [tab]: text,
      }))
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h1 className="text-3xl font-black text-gray-900">
            名單匯入中心
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            先驗證，再匯入。這一頁同時支援學校名單與學生名單匯入，避免直接寫入造成資料污染。
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="教師 / 管理密碼"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm md:max-w-sm"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('schools')}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  tab === 'schools'
                    ? 'bg-black text-white'
                    : 'border border-gray-300 bg-white text-gray-800'
                }`}
              >
                學校名單匯入
              </button>
              <button
                type="button"
                onClick={() => setTab('students')}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  tab === 'students'
                    ? 'bg-black text-white'
                    : 'border border-gray-300 bg-white text-gray-800'
                }`}
              >
                學生名單匯入
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">
                {tab === 'schools' ? '學校名單格式' : '學生名單格式'}
              </h2>

              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-gray-800">
                  {currentTemplate}
                </pre>
              </div>

              <div className="mt-4 text-sm leading-6 text-gray-600">
                {tab === 'schools' ? (
                  <>
                    欄位需求：<code>school_code</code>、<code>school_name</code> 必填；
                    <code>county</code>、<code>sort_order</code>、<code>is_active</code> 可選。
                  </>
                ) : (
                  <>
                    欄位需求：<code>school_code</code>、<code>grade</code>、
                    <code>class_name</code>、<code>seat_no</code>、
                    <code>student_name</code>、<code>masked_name</code> 必填；
                    <code>is_active</code>、<code>note</code> 可選。
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">
                貼上或上傳資料
              </h2>

              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800">
                  上傳 .csv / .tsv
                  <input
                    type="file"
                    accept=".csv,.tsv,text/csv,text/tab-separated-values"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setInputText((prev) => ({
                      ...prev,
                      [tab]: currentTemplate,
                    }))
                  }
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800"
                >
                  載入範例
                </button>
              </div>

              <textarea
                value={currentInput}
                onChange={(e) =>
                  setInputText((prev) => ({
                    ...prev,
                    [tab]: e.target.value,
                  }))
                }
                className="mt-4 min-h-[360px] w-full rounded-xl border border-gray-300 px-4 py-3 font-mono text-sm leading-6 text-gray-900"
                placeholder="請貼上 TSV / CSV 內容"
              />

              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <button
                  type="button"
                  disabled={loading || !password || !currentInput.trim()}
                  onClick={() => runAction('validate')}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? '處理中…' : '先驗證'}
                </button>

                <button
                  type="button"
                  disabled={loading || !password || !currentInput.trim()}
                  onClick={() => runAction('import')}
                  className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {loading ? '處理中…' : '正式匯入'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">驗證 / 匯入結果</h2>

              {result?.error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {result.error}
                </div>
              ) : null}

              {result?.summary ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SummaryCard title="總列數" value={result.summary.totalRows} />
                  <SummaryCard title="有效列數" value={result.summary.validRows} />
                  <SummaryCard title="錯誤列數" value={result.summary.errorRows} />
                  <SummaryCard
                    title="本次動作"
                    value={result.action === 'import' ? '正式匯入' : '驗證'}
                  />
                  {result.action === 'import' ? (
                    <>
                      <SummaryCard
                        title="新增筆數"
                        value={result.summary.insertedRows ?? 0}
                      />
                      <SummaryCard
                        title="更新筆數"
                        value={result.summary.updatedRows ?? 0}
                      />
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  尚未執行驗證或匯入。
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">預覽資料</h2>

              {previewRows.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left">
                        {Object.keys(previewRows[0]).map((key) => (
                          <th key={key} className="px-3 py-2 font-semibold text-gray-700">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          {Object.keys(previewRows[0]).map((key) => (
                            <td key={key} className="px-3 py-2 text-gray-800">
                              {String(row[key] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  尚無預覽資料。
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">錯誤清單</h2>

              {result?.errors?.length ? (
                <div className="mt-4 space-y-2">
                  {result.errors.map((item, index) => (
                    <div
                      key={`${item.row}-${index}`}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                    >
                      第 {item.row} 列：{item.message}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  目前沒有錯誤。
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}