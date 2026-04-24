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
  medianEvidenceDurationSec: number | null
  medianTransferDurationSec: number | null
  zoomUserRate: number | null
  avgStructuralFeatureRate: number | null
  avgReasonCharCount: number | null
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
  selectedFeatureCountAvg: number | null
  reasonCharCountAvg: number | null
  awarenessSecondsSpent: number | null
  diagnosticFeatureCount: number | null
  possibleFeatureCount: number | null
  readinessRetryCount: number | null
  readinessFirstPassRate: number | null
  stage1GroupCount: number | null
  stage1OverallReasonLength: number | null
  riskLevel: '高' | '中' | '低' | '未完成' | '資料不足'
  updatedAt: string | null
}

type QuestionMetric = {
  key: string
  stage: string
  questionId: string
  animalName: string | null
  respondents: number
  studentCount: number
  accuracy: number | null
  avgDurationSec: number | null
  medianDurationSec: number | null
  avgConfidence: number | null
  avgSelectedFeatureCount: number | null
  avgReasonCharCount: number | null
  zoomOpenCount: number
  zoomUserRate: number | null
  topWrongAnswers: string[]
  topWrongFeatures: string[]
  highConfidenceWrongRate: number | null
}

type FeatureMetric = {
  feature: string
  cueType: '結構線索' | '表面線索' | '待分類'
  selectedCount: number
  studentCount: number
  correctRateWhenSelected: number | null
  evidenceCount: number
  transferCount: number
  wrongSelectionRate: number | null
}

type MisconceptionMetric = {
  feature: string
  cueType: '結構線索' | '表面線索' | '待分類'
  wrongCount: number
  wrongStudentCount: number
  wrongQuestionCount: number
  highConfidenceWrongCount: number
}

type InsightCard = {
  title: string
  body: string
  severity: 'info' | 'warn' | 'strong'
}

type SampleBases = {
  totalStudents: number
  completedStudents: number
  evidenceStudents: number
  evidenceItems: number
  transferStudents: number
  transferItems: number
  zoomStudents: number
  zoomEvents: number
  awarenessStudents: number
}

type SampleWarning = {
  key: string
  level: 'warn' | 'info'
  message: string
}

type DashboardResponse = {
  ok: true
  filters: {
    schoolCodes: string[]
    grades: string[]
    classNames: string[]
    stages: string[]
  }
  summary: Summary
  sampleBases: SampleBases
  sampleWarnings: SampleWarning[]
  stageFunnel: StageBucket[]
  riskDistribution: RiskBucket[]
  studentRows: StudentRow[]
  highRiskStudents: StudentRow[]
  strongestStudents: StudentRow[]
  questionMetrics: QuestionMetric[]
  featureMetrics: FeatureMetric[]
  misconceptionMetrics: MisconceptionMetric[]
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

function severityColor(level: InsightCard['severity'] | SampleWarning['level']) {
  if (level === 'strong') return 'border-red-200 bg-red-50'
  if (level === 'warn') return 'border-yellow-200 bg-yellow-50'
  return 'border-blue-200 bg-blue-50'
}

function SummaryCard({
  title,
  value,
  helper,
  note,
}: {
  title: string
  value: string
  helper?: string
  note?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-gray-900">{value}</div>
      {helper ? <div className="mt-2 text-xs leading-5 text-gray-500">{helper}</div> : null}
      {note ? <div className="mt-1 text-xs leading-5 text-amber-700">{note}</div> : null}
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

function SamplePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="mt-1 font-bold text-gray-900">{value}</div>
    </div>
  )
}

export default function TeacherDashboardPage() {
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        const response = await fetch(`/api/teacher-dashboard?${queryString}`, { cache: 'no-store' })
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

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">Sci-Flipper 教師形成性診斷頁</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
                這一版不是只看分數，而是結合 learning_records 的學習快照、learning_item_logs 的題目歷程、learning_event_logs 的圖像操作，協助教師判斷：學生走到哪一階段、是否依賴鷹架、常用哪些特徵、哪些題目最值得重教，以及哪些學生需要立即介入。
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <div>
                目前篩選後學生數：<span className="font-bold text-gray-900">{data?.summary.totalStudents ?? '—'}</span>
              </div>
              <div>
                learning_records：{data?.counts.records ?? '—'}｜item_logs：{data?.counts.itemLogs ?? '—'}｜event_logs：{data?.counts.eventLogs ?? '—'}
              </div>
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
            {data.sampleWarnings.length > 0 ? (
              <Section title="樣本解讀提醒" subtitle="以下提示不是錯誤，而是提醒教師：部分指標有效樣本不足，請先當作形成性訊號，而非全班定論。">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.sampleWarnings.map((warning) => (
                    <div key={warning.key} className={`rounded-2xl border p-4 ${severityColor(warning.level)}`}>
                      <div className="text-sm font-bold text-gray-900">{warning.key}</div>
                      <div className="mt-2 text-sm leading-6 text-gray-700">{warning.message}</div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            <Section title="有效樣本基礎" subtitle="先看分母，再解讀百分比。這一步比看大數字更重要。">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <SamplePill label="篩選後學生" value={`${data.sampleBases.totalStudents} 人`} />
                <SamplePill label="evidence 有效學生" value={`${data.sampleBases.evidenceStudents} 人／${data.sampleBases.evidenceItems} 題`} />
                <SamplePill label="transfer 有效學生" value={`${data.sampleBases.transferStudents} 人／${data.sampleBases.transferItems} 題`} />
                <SamplePill label="zoom 使用學生" value={`${data.sampleBases.zoomStudents} 人／${data.sampleBases.zoomEvents} 筆事件`} />
                <SamplePill label="awareness 有效學生" value={`${data.sampleBases.awarenessStudents} 人`} />
              </div>
            </Section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <SummaryCard
                title="完成率"
                value={pct(data.summary.completionRate)}
                helper={`${data.summary.completedStudents} / ${data.summary.totalStudents} 位學生`}
              />
              <SummaryCard
                title="evidence 正確率"
                value={pct(data.summary.evidenceAccuracy)}
                helper={`有效樣本：${data.sampleBases.evidenceStudents} 人／${data.sampleBases.evidenceItems} 題`}
                note={data.sampleBases.evidenceStudents < 5 ? '有效樣本偏少，請勿直接視為全班定論。' : undefined}
              />
              <SummaryCard
                title="transfer 正確率"
                value={pct(data.summary.transferAccuracy)}
                helper={`有效樣本：${data.sampleBases.transferStudents} 人／${data.sampleBases.transferItems} 題`}
                note={data.sampleBases.transferStudents < 5 ? '有效樣本偏少，這個數字目前僅供形成性參考。' : undefined}
              />
              <SummaryCard
                title="SDI"
                value={num(data.summary.sdi, 2)}
                helper="evidence - transfer；越高表示越依賴鷹架"
                note={data.sampleBases.transferStudents < 5 ? 'transfer 樣本偏少時，SDI 僅作早期訊號使用。' : undefined}
              />
              <SummaryCard
                title="平均 evidence 秒數"
                value={num(data.summary.avgEvidenceDurationSec, 1)}
                helper={`中位數 ${num(data.summary.medianEvidenceDurationSec, 1)} 秒`}
              />
              <SummaryCard
                title="zoom 使用率"
                value={pct(data.summary.zoomUserRate)}
                helper={`至少使用一次 zoom：${data.sampleBases.zoomStudents}/${data.sampleBases.totalStudents} 人`}
                note={data.sampleBases.zoomStudents < 5 ? '目前 zoom 使用樣本偏少，請勿過度解讀。' : undefined}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <Section title="鷹架依賴與學習進度" subtitle="這裡最適合看班級目前是概念未建立，還是有鷹架會做、離開提示就失準。">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-lg font-bold text-gray-900">學習階段分布</div>
                    {data.stageFunnel.map((bucket) => (
                      <BarRow key={bucket.stage} label={stageLabel(bucket.stage)} value={bucket.count} total={data.summary.totalStudents} colorClass="bg-black" />
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
                    <div key={`${card.title}-${index}`} className={`rounded-2xl border p-4 ${severityColor(card.severity)}`}>
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
                      <th className="px-3 py-2">學生數</th>
                      <th className="px-3 py-2">作答筆數</th>
                      <th className="px-3 py-2">正確率</th>
                      <th className="px-3 py-2">平均秒數</th>
                      <th className="px-3 py-2">中位數秒數</th>
                      <th className="px-3 py-2">平均信心</th>
                      <th className="px-3 py-2">平均特徵數</th>
                      <th className="px-3 py-2">平均理由字數</th>
                      <th className="px-3 py-2">zoom 使用率</th>
                      <th className="px-3 py-2">高信心錯答率</th>
                      <th className="px-3 py-2">常見錯答</th>
                      <th className="px-3 py-2">常見錯用特徵</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.questionMetrics.map((item) => (
                      <tr key={item.key} className="rounded-2xl bg-gray-50 text-gray-700">
                        <td className="px-3 py-3 font-semibold text-gray-900">{item.stage}/{item.questionId} {item.animalName ?? ''}</td>
                        <td className="px-3 py-3">{item.studentCount}</td>
                        <td className="px-3 py-3">{item.respondents}</td>
                        <td className="px-3 py-3">{pct(item.accuracy)}</td>
                        <td className="px-3 py-3">{num(item.avgDurationSec, 1)}</td>
                        <td className="px-3 py-3">{num(item.medianDurationSec, 1)}</td>
                        <td className="px-3 py-3">{num(item.avgConfidence, 1)}</td>
                        <td className="px-3 py-3">{num(item.avgSelectedFeatureCount, 1)}</td>
                        <td className="px-3 py-3">{num(item.avgReasonCharCount, 1)}</td>
                        <td className="px-3 py-3">{pct(item.zoomUserRate)}</td>
                        <td className="px-3 py-3">{pct(item.highConfidenceWrongRate)}</td>
                        <td className="px-3 py-3">{item.topWrongAnswers.length ? item.topWrongAnswers.join('、') : '—'}</td>
                        <td className="px-3 py-3">{item.topWrongFeatures.length ? item.topWrongFeatures.join('、') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <div className="grid gap-5 xl:grid-cols-2">
              <Section title="特徵使用面板" subtitle="先看學生最常用哪些特徵，再判斷哪些是真正有診斷力的結構線索、哪些只是高風險表面線索。">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-2">特徵</th>
                        <th className="px-3 py-2">類型</th>
                        <th className="px-3 py-2">勾選次數</th>
                        <th className="px-3 py-2">涉及學生</th>
                        <th className="px-3 py-2">勾選後正確率</th>
                        <th className="px-3 py-2">錯答比例</th>
                        <th className="px-3 py-2">evidence</th>
                        <th className="px-3 py-2">transfer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.featureMetrics.slice(0, 15).map((item) => (
                        <tr key={item.feature} className="rounded-2xl bg-gray-50 text-gray-700">
                          <td className="px-3 py-3 font-semibold text-gray-900">{item.feature}</td>
                          <td className="px-3 py-3">{item.cueType}</td>
                          <td className="px-3 py-3">{item.selectedCount}</td>
                          <td className="px-3 py-3">{item.studentCount}</td>
                          <td className="px-3 py-3">{pct(item.correctRateWhenSelected)}</td>
                          <td className="px-3 py-3">{pct(item.wrongSelectionRate)}</td>
                          <td className="px-3 py-3">{item.evidenceCount}</td>
                          <td className="px-3 py-3">{item.transferCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="迷思線索排行榜" subtitle="這一區不是看哪個特徵最常出現，而是看哪些特徵最常伴隨錯誤作答，尤其是高信心錯答。">
                <div className="space-y-3">
                  {data.misconceptionMetrics.slice(0, 10).map((item) => (
                    <div key={item.feature} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-bold text-gray-900">{item.feature}</div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.cueType === '表面線索' ? 'bg-red-100 text-red-700' : item.cueType === '結構線索' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                          {item.cueType}
                        </span>
                      </div>
                      <div className="mt-2 text-sm leading-6 text-gray-700">
                        錯答中出現 {item.wrongCount} 次，涉及 {item.wrongStudentCount} 位學生、{item.wrongQuestionCount} 題，高信心錯答 {item.highConfidenceWrongCount} 次。
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <Section title="高風險學生" subtitle="優先介入：未完成、transfer 低、或 evidence 與 transfer 落差大的學生。">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-2">學生</th>
                        <th className="px-3 py-2">階段</th>
                        <th className="px-3 py-2">風險</th>
                        <th className="px-3 py-2">evidence</th>
                        <th className="px-3 py-2">transfer</th>
                        <th className="px-3 py-2">SDI</th>
                        <th className="px-3 py-2">zoom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.highRiskStudents.map((student) => (
                        <tr key={student.participantCode} className="rounded-2xl bg-gray-50 text-gray-700">
                          <td className="px-3 py-3 font-semibold text-gray-900">{student.maskedName ?? student.participantCode}</td>
                          <td className="px-3 py-3">{stageLabel(student.currentStage)}</td>
                          <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskColor(student.riskLevel)}`}>{student.riskLevel}</span></td>
                          <td className="px-3 py-3">{pct(student.evidenceAccuracy)}</td>
                          <td className="px-3 py-3">{pct(student.transferAccuracy)}</td>
                          <td className="px-3 py-3">{num(student.sdi, 2)}</td>
                          <td className="px-3 py-3">{student.zoomOpenCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="高表現學生" subtitle="可作為示範、分享或同儕支持的候選名單。">
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-2">學生</th>
                        <th className="px-3 py-2">階段</th>
                        <th className="px-3 py-2">evidence</th>
                        <th className="px-3 py-2">transfer</th>
                        <th className="px-3 py-2">SDI</th>
                        <th className="px-3 py-2">結構線索率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.strongestStudents.map((student) => (
                        <tr key={student.participantCode} className="rounded-2xl bg-gray-50 text-gray-700">
                          <td className="px-3 py-3 font-semibold text-gray-900">{student.maskedName ?? student.participantCode}</td>
                          <td className="px-3 py-3">{stageLabel(student.currentStage)}</td>
                          <td className="px-3 py-3">{pct(student.evidenceAccuracy)}</td>
                          <td className="px-3 py-3">{pct(student.transferAccuracy)}</td>
                          <td className="px-3 py-3">{num(student.sdi, 2)}</td>
                          <td className="px-3 py-3">{pct(student.structuralFeatureRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>

            <Section title="學生個別診斷表" subtitle="這不是行政名單，而是方便教師快速點名、補救與追蹤的工作表。">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2">學生</th>
                      <th className="px-3 py-2">學校 / 班級</th>
                      <th className="px-3 py-2">階段</th>
                      <th className="px-3 py-2">完成</th>
                      <th className="px-3 py-2">evidence</th>
                      <th className="px-3 py-2">transfer</th>
                      <th className="px-3 py-2">SDI</th>
                      <th className="px-3 py-2">evidence 秒</th>
                      <th className="px-3 py-2">transfer 秒</th>
                      <th className="px-3 py-2">平均特徵數</th>
                      <th className="px-3 py-2">平均理由字數</th>
                      <th className="px-3 py-2">結構線索率</th>
                      <th className="px-3 py-2">awareness 秒數</th>
                      <th className="px-3 py-2">readiness 重試</th>
                      <th className="px-3 py-2">zoom 次數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.studentRows.map((student) => (
                      <tr key={student.participantCode} className="rounded-2xl bg-gray-50 text-gray-700">
                        <td className="px-3 py-3 font-semibold text-gray-900">{student.maskedName ?? student.participantCode}</td>
                        <td className="px-3 py-3">{student.schoolCode ?? '—'} / {student.className ?? '—'}</td>
                        <td className="px-3 py-3">{stageLabel(student.currentStage)}</td>
                        <td className="px-3 py-3">{student.isCompleted ? '是' : '否'}</td>
                        <td className="px-3 py-3">{pct(student.evidenceAccuracy)}</td>
                        <td className="px-3 py-3">{pct(student.transferAccuracy)}</td>
                        <td className="px-3 py-3">{num(student.sdi, 2)}</td>
                        <td className="px-3 py-3">{num(student.avgEvidenceDurationSec, 1)}</td>
                        <td className="px-3 py-3">{num(student.avgTransferDurationSec, 1)}</td>
                        <td className="px-3 py-3">{num(student.selectedFeatureCountAvg, 1)}</td>
                        <td className="px-3 py-3">{num(student.reasonCharCountAvg, 1)}</td>
                        <td className="px-3 py-3">{pct(student.structuralFeatureRate)}</td>
                        <td className="px-3 py-3">{num(student.awarenessSecondsSpent, 0)}</td>
                        <td className="px-3 py-3">{num(student.readinessRetryCount, 0)}</td>
                        <td className="px-3 py-3">{student.zoomOpenCount}</td>
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
