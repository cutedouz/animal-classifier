'use client'

import { useEffect, useMemo, useState } from 'react'

type Summary = {
  totalStudents: number
  completedStudents: number
  completionRate: number | null
  evidenceAccuracy: number | null
  transferAccuracy: number | null
  sdi: number | null
  avgEvidenceDurationSec: number | null
  avgTransferDurationSec: number | null
  zoomUserRate: number | null
}

type StageBucket = { stage: string; count: number }
type RiskBucket = { level: string; count: number }

type StudentRow = {
  participantCode: string
  schoolCode: string | null
  grade: string | null
  className: string | null
  seatNo: string | null
  maskedName: string | null
  currentStage: string | null
  isCompleted: boolean
  evidenceAccuracy: number | null
  transferAccuracy: number | null
  sdi: number | null
  avgEvidenceDurationSec: number | null
  avgTransferDurationSec: number | null
  zoomOpenCount: number
  zoomQuestionCount: number
  evidenceCount: number
  transferCount: number
  structuralFeatureRate: number | null
  riskLevel: '高' | '中' | '低' | '未完成' | '資料不足'
  updatedAt: string | null
}

type QuestionMetric = {
  key: string
  stage: string
  questionId: string
  animalName: string | null
  respondents: number
  accuracy: number | null
  avgDurationSec: number | null
  medianDurationSec: number | null
  avgConfidence: number | null
  avgSelectedFeatureCount: number | null
  zoomOpenCount: number
  zoomUserRate: number | null
  topWrongAnswers: string[]
}

type FeatureMetric = {
  feature: string
  cueType: '結構線索' | '表面線索' | '待分類'
  selectedCount: number
  studentCount: number
  correctRateWhenSelected: number | null
  evidenceCount: number
  transferCount: number
}

type InsightCard = { title: string; body: string }

type DashboardResponse = {
  ok: true
  filters: {
    schoolCodes: string[]
    grades: string[]
    classNames: string[]
    stages: string[]
  }
  summary: Summary
  stageFunnel: StageBucket[]
  riskDistribution: RiskBucket[]
  studentRows: StudentRow[]
  highRiskStudents: StudentRow[]
  strongestStudents: StudentRow[]
  questionMetrics: QuestionMetric[]
  featureMetrics: FeatureMetric[]
  insightCards: InsightCard[]
  counts: {
    records: number
    itemLogs: number
    eventLogs: number
  }
}

type FiltersState = {
  schoolCode: string
  grade: string
  className: string
  participantCode: string
  currentStage: string
  completedOnly: boolean
  riskOnly: boolean
}

const INITIAL_FILTERS: FiltersState = {
  schoolCode: '',
  grade: '',
  className: '',
  participantCode: '',
  currentStage: '',
  completedOnly: false,
  riskOnly: false,
}

function pct(value: number | null | undefined) {
  if (value == null) return '—'
  return `${Math.round(value * 100)}%`
}

function num(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}

function stageLabel(stage: string | null) {
  const map: Record<string, string> = {
    stage1: '第 1 階段',
    awareness: '第 2 階段',
    evidence: '第 3 階段',
    transfer: '第 4 階段',
    done: '完成',
  }
  return stage ? (map[stage] ?? stage) : '未記錄'
}

function riskColor(level: StudentRow['riskLevel'] | string) {
  if (level === '高') return 'bg-red-100 text-red-700'
  if (level === '中') return 'bg-yellow-100 text-yellow-800'
  if (level === '低') return 'bg-green-100 text-green-700'
  if (level === '未完成') return 'bg-gray-100 text-gray-700'
  return 'bg-slate-100 text-slate-700'
}

function SummaryCard({ title, value, helper }: { title: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-gray-900">{value}</div>
      {helper ? <div className="mt-2 text-xs leading-5 text-gray-500">{helper}</div> : null}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-2xl font-black tracking-tight text-gray-900">{title}</h2>
        {subtitle ? <p className="text-sm leading-6 text-gray-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

function BarRow({ label, value, total, colorClass = 'bg-black' }: { label: string; value: number; total: number; colorClass?: string }) {
  const width = total > 0 ? Math.max((value / total) * 100, value > 0 ? 4 : 0) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{value}</span>
      </div>
      <div className="h-3 rounded-full bg-gray-100">
        <div className={`h-3 rounded-full ${colorClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

export default function TeacherDashboardPage() {
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.schoolCode) params.set('schoolCode', filters.schoolCode)
    if (filters.grade) params.set('grade', filters.grade)
    if (filters.className) params.set('className', filters.className)
    if (filters.participantCode) params.set('participantCode', filters.participantCode)
    if (filters.currentStage) params.set('currentStage', filters.currentStage)
    if (filters.completedOnly) params.set('completedOnly', 'true')
    if (filters.riskOnly) params.set('riskOnly', 'true')
    return params.toString()
  }, [filters])

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`/api/teacher-dashboard?${queryString}`, {
          cache: 'no-store',
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result?.error || '讀取教師分析頁資料失敗')
        }
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '未知錯誤')
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [queryString])

  const totalStudents = data?.summary.totalStudents ?? 0

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">Sci-Flipper 教師形成性診斷頁</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                這一頁不是單純成績單，而是協助教師判斷：學生目前走到哪一階段、是否依賴鷹架、用了哪些判準、哪些題目最值得重教，以及哪些學生需要立即介入。
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <div>目前篩選後學生數：<span className="font-bold text-gray-900">{totalStudents}</span></div>
              <div>learning_records：{data?.counts.records ?? '—'}｜item_logs：{data?.counts.itemLogs ?? '—'}｜event_logs：{data?.counts.eventLogs ?? '—'}</div>
            </div>
          </div>
        </div>

        <Section title="篩選條件" subtitle="先縮小範圍，再看班級整體與個別學生。這是教學決策頁，不是排行榜。">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select
              value={filters.schoolCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, schoolCode: e.target.value, className: '' }))}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">全部學校</option>
              {data?.filters.schoolCodes.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>

            <select
              value={filters.grade}
              onChange={(e) => setFilters((prev) => ({ ...prev, grade: e.target.value }))}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">全部年級</option>
              {data?.filters.grades.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>

            <select
              value={filters.className}
              onChange={(e) => setFilters((prev) => ({ ...prev, className: e.target.value }))}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">全部班級</option>
              {data?.filters.classNames.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>

            <select
              value={filters.currentStage}
              onChange={(e) => setFilters((prev) => ({ ...prev, currentStage: e.target.value }))}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">全部階段</option>
              {data?.filters.stages.map((value) => (
                <option key={value} value={value}>{stageLabel(value)}</option>
              ))}
            </select>

            <input
              value={filters.participantCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, participantCode: e.target.value }))}
              placeholder="搜尋 participant_code"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.completedOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, completedOnly: e.target.checked }))}
                />
                只看已完成
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.riskOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, riskOnly: e.target.checked }))}
                />
                只看風險學生
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              清除篩選
            </button>
          </div>
        </Section>

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-600 shadow-sm">資料讀取中…</div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center text-red-700 shadow-sm">{error}</div>
        ) : data ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <SummaryCard title="完成率" value={pct(data.summary.completionRate)} helper={`${data.summary.completedStudents} / ${data.summary.totalStudents} 名學生`} />
              <SummaryCard title="evidence 正確率" value={pct(data.summary.evidenceAccuracy)} helper="第 3 階段：帶提示判定" />
              <SummaryCard title="transfer 正確率" value={pct(data.summary.transferAccuracy)} helper="第 4 階段：遷移應用" />
              <SummaryCard title="SDI" value={num(data.summary.sdi, 2)} helper="evidence - transfer；越高表示越依賴鷹架" />
              <SummaryCard title="平均 evidence 秒數" value={num(data.summary.avgEvidenceDurationSec, 1)} helper="作答時間過長且正確率低，代表高負荷題" />
              <SummaryCard title="zoom 使用率" value={pct(data.summary.zoomUserRate)} helper="至少使用一次圖片放大之學生比例" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <Section title="鷹架依賴與學習進度" subtitle="這裡最適合看班級目前是概念未建立，還是有鷹架會做、離開提示就失準。">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-lg font-bold text-gray-900">學習階段分布</div>
                    {data.stageFunnel.map((bucket) => (
                      <BarRow
                        key={bucket.stage}
                        label={stageLabel(bucket.stage)}
                        value={bucket.count}
                        total={data.summary.totalStudents}
                        colorClass="bg-black"
                      />
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="text-lg font-bold text-gray-900">風險分布</div>
                    {data.riskDistribution.map((bucket) => (
                      <BarRow
                        key={bucket.level}
                        label={bucket.level}
                        value={bucket.count}
                        total={data.summary.totalStudents}
                        colorClass={bucket.level === '高' ? 'bg-red-500' : bucket.level === '中' ? 'bg-yellow-500' : bucket.level === '低' ? 'bg-green-500' : 'bg-gray-500'}
                      />
                    ))}
                  </div>
                </div>
              </Section>

              <Section title="教師解讀提示" subtitle="這裡不是評分，而是幫你快速形成教學決策。">
                <div className="space-y-3">
                  {data.insightCards.map((card, index) => (
                    <div key={`${card.title}-${index}`} className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <div className="text-base font-bold text-gray-900">{card.title}</div>
                      <div className="mt-2 text-sm leading-6 text-gray-700">{card.body}</div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <Section title="題目診斷面板" subtitle="找出最值得全班重教的題目，而不是只看哪題最難。優先關注：高耗時低正確、高信心低正確、高 zoom 仍低正確。">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2">題目</th>
                      <th className="px-3 py-2">作答人數</th>
                      <th className="px-3 py-2">正確率</th>
                      <th className="px-3 py-2">平均秒數</th>
                      <th className="px-3 py-2">中位數秒數</th>
                      <th className="px-3 py-2">平均信心</th>
                      <th className="px-3 py-2">平均特徵數</th>
                      <th className="px-3 py-2">zoom 使用率</th>
                      <th className="px-3 py-2">常見錯答</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.questionMetrics.map((item) => (
                      <tr key={item.key} className="rounded-2xl bg-gray-50 text-gray-700">
                        <td className="px-3 py-3 font-semibold text-gray-900">{item.stage}/{item.questionId} {item.animalName ?? ''}</td>
                        <td className="px-3 py-3">{item.respondents}</td>
                        <td className="px-3 py-3">{pct(item.accuracy)}</td>
                        <td className="px-3 py-3">{num(item.avgDurationSec, 1)}</td>
                        <td className="px-3 py-3">{num(item.medianDurationSec, 1)}</td>
                        <td className="px-3 py-3">{num(item.avgConfidence, 1)}</td>
                        <td className="px-3 py-3">{num(item.avgSelectedFeatureCount, 1)}</td>
                        <td className="px-3 py-3">{pct(item.zoomUserRate)}</td>
                        <td className="px-3 py-3">{item.topWrongAnswers.length ? item.topWrongAnswers.join('、') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <Section title="判準與特徵使用" subtitle="這一區最能看出學生到底在用結構性特徵，還是在用表面線索。">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-2">特徵</th>
                        <th className="px-3 py-2">類型</th>
                        <th className="px-3 py-2">勾選次數</th>
                        <th className="px-3 py-2">涉及學生數</th>
                        <th className="px-3 py-2">勾選後正確率</th>
                        <th className="px-3 py-2">evidence</th>
                        <th className="px-3 py-2">transfer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.featureMetrics.slice(0, 20).map((item) => (
                        <tr key={item.feature} className="rounded-2xl bg-gray-50 text-gray-700">
                          <td className="px-3 py-3 font-semibold text-gray-900">{item.feature}</td>
                          <td className="px-3 py-3">{item.cueType}</td>
                          <td className="px-3 py-3">{item.selectedCount}</td>
                          <td className="px-3 py-3">{item.studentCount}</td>
                          <td className="px-3 py-3">{pct(item.correctRateWhenSelected)}</td>
                          <td className="px-3 py-3">{item.evidenceCount}</td>
                          <td className="px-3 py-3">{item.transferCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="高風險學生與高表現學生" subtitle="教師可先介入高風險群，再請穩定遷移者做同儕分享。">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-3 text-lg font-bold text-gray-900">優先介入</div>
                    <div className="space-y-2">
                      {data.highRiskStudents.map((student) => (
                        <div key={`risk-${student.participantCode}`} className="rounded-2xl border border-red-200 bg-red-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-gray-900">{student.maskedName ?? student.participantCode}</div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskColor(student.riskLevel)}`}>{student.riskLevel}</span>
                          </div>
                          <div className="mt-2 text-xs leading-6 text-gray-700">
                            evidence：{pct(student.evidenceAccuracy)}｜transfer：{pct(student.transferAccuracy)}｜SDI：{num(student.sdi, 2)}｜zoom：{student.zoomOpenCount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 text-lg font-bold text-gray-900">可作為示範</div>
                    <div className="space-y-2">
                      {data.strongestStudents.map((student) => (
                        <div key={`strong-${student.participantCode}`} className="rounded-2xl border border-green-200 bg-green-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-gray-900">{student.maskedName ?? student.participantCode}</div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskColor(student.riskLevel)}`}>{student.riskLevel}</span>
                          </div>
                          <div className="mt-2 text-xs leading-6 text-gray-700">
                            evidence：{pct(student.evidenceAccuracy)}｜transfer：{pct(student.transferAccuracy)}｜結構線索比率：{pct(student.structuralFeatureRate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>
            </div>

            <Section title="個別學生診斷表" subtitle="這是補救教學主表。不要只看分數，請一起看 SDI、作答時間與圖像使用。">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2">學生</th>
                      <th className="px-3 py-2">班級</th>
                      <th className="px-3 py-2">目前階段</th>
                      <th className="px-3 py-2">evidence</th>
                      <th className="px-3 py-2">transfer</th>
                      <th className="px-3 py-2">SDI</th>
                      <th className="px-3 py-2">evidence 秒數</th>
                      <th className="px-3 py-2">transfer 秒數</th>
                      <th className="px-3 py-2">zoom</th>
                      <th className="px-3 py-2">風險</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.studentRows.map((student) => (
                      <tr key={student.participantCode} className="rounded-2xl bg-gray-50 text-gray-700">
                        <td className="px-3 py-3 font-semibold text-gray-900">{student.maskedName ?? student.participantCode}</td>
                        <td className="px-3 py-3">{student.grade ?? '—'} / {student.className ?? '—'} / {student.seatNo ?? '—'}</td>
                        <td className="px-3 py-3">{stageLabel(student.currentStage)}</td>
                        <td className="px-3 py-3">{pct(student.evidenceAccuracy)}</td>
                        <td className="px-3 py-3">{pct(student.transferAccuracy)}</td>
                        <td className="px-3 py-3">{num(student.sdi, 2)}</td>
                        <td className="px-3 py-3">{num(student.avgEvidenceDurationSec, 1)}</td>
                        <td className="px-3 py-3">{num(student.avgTransferDurationSec, 1)}</td>
                        <td className="px-3 py-3">{student.zoomOpenCount}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${riskColor(student.riskLevel)}`}>{student.riskLevel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </>
        ) : null}
      </div>
    </main>
  )
}
