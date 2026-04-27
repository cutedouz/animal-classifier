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

  userRole: string | null
  useContext: string | null
  animalClassificationExperience: string | null
  payloadVersion: string | null
  featureOptionVersion: string | null

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
  userRoles: string[]
  useContexts: string[]
  animalClassificationExperiences: string[]
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
  userRole: string
  useContext: string
  animalClassificationExperience: string
  participantCode: string
  currentStage: string
  completedOnly: boolean
  riskOnly: boolean
}

const INITIAL_FILTERS: FiltersState = {
  schoolCode: '',
  grade: '',
  className: '',
  userRole: '',
  useContext: '',
  animalClassificationExperience: '',
  participantCode: '',
  currentStage: '',
  completedOnly: false,
  riskOnly: false,
}

function pct(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
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

function severityTone(level: 'strong' | 'warn' | 'info') {
  if (level === 'strong') return 'border-red-200 bg-red-50'
  if (level === 'warn') return 'border-yellow-200 bg-yellow-50'
  return 'border-blue-200 bg-blue-50'
}

function riskTone(level: StudentRow['riskLevel'] | string) {
  if (level === '高') return 'bg-red-100 text-red-700'
  if (level === '中') return 'bg-yellow-100 text-yellow-800'
  if (level === '低') return 'bg-green-100 text-green-700'
  if (level === '未完成') return 'bg-gray-100 text-gray-700'
  return 'bg-slate-100 text-slate-700'
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-black tracking-tight text-gray-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-gray-600">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

function SummaryCard({ title, value, helper, note }: { title: string; value: string; helper?: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-500">{title}</div>
      <div className="mt-2 text-4xl font-black tracking-tight text-gray-900">{value}</div>
      {helper ? <div className="mt-2 text-xs leading-5 text-gray-500">{helper}</div> : null}
      {note ? <div className="mt-1 text-xs leading-5 text-amber-700">{note}</div> : null}
    </div>
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

function capabilityCards(students: StudentRow[], sampleBases: SampleBases) {
  const total = students.length
  const stage1Ready = students.filter((s) => (s.stage1GroupCount ?? 0) > 0 && (s.stage1OverallReasonLength ?? 0) >= 8).length
  const cueAwareness = students.filter((s) => (s.diagnosticFeatureCount ?? 0) > 0 && (s.possibleFeatureCount ?? 0) > 0).length
  const evidenceStable = students.filter((s) => (s.evidenceCount ?? 0) > 0 && (s.evidenceAccuracy ?? 0) >= 0.5).length
  const transferStable = students.filter((s) => (s.transferCount ?? 0) > 0 && (s.transferAccuracy ?? 0) >= 0.5).length
  const structureShift = students.filter((s) => (s.structuralFeatureRate ?? 0) >= 0.6).length

  return [
    {
      title: '初步分類與理由化',
      count: stage1Ready,
      total,
      note: '學生是否完成分組、群組理由與整體分類想法，代表是否願意把直覺分類說成可討論的判準。',
    },
    {
      title: '關鍵／輔助線索辨識',
      count: cueAwareness,
      total,
      note: '學生是否至少開始區分「較具診斷力的線索」與「不穩定的線索」。',
    },
    {
      title: '帶提示判定穩定',
      count: evidenceStable,
      total: sampleBases.evidenceStudents,
      note: `evidence 有效樣本 ${sampleBases.evidenceStudents}；學生在有鷹架支持時，是否能相對穩定地做出門別判定。`,
    },
    {
      title: '遷移判定穩定',
      count: transferStable,
      total: sampleBases.transferStudents,
      note: `transfer 有效樣本 ${sampleBases.transferStudents}；學生在移除提示卡後，是否仍能把規則套用到新生物。`,
    },
    {
      title: '由表面走向結構',
      count: structureShift,
      total,
      note: '結構線索比例 ≥ 60% 視為較明顯轉向結構判準。',
    },
  ]
}

function getQuestionAction(q: QuestionMetric) {
  const accuracy = q.accuracy ?? 0
  const duration = q.avgDurationSec ?? 0
  const zoomRate = q.zoomUserRate ?? 0
  const hcWrong = q.highConfidenceWrongRate ?? 0

  if (accuracy <= 0.25 && hcWrong >= 0.3) {
    return '高信心錯答偏高，適合用於概念衝突教學。'
  }
  if (accuracy <= 0.25 && duration >= 20) {
    return '低正確率且平均耗時偏高，代表規則未建立，不只是粗心。'
  }
  if (accuracy <= 0.25 && duration < 8) {
    return '低正確率但平均耗時很短，可能出現快速直覺判斷或低估題目難度。'
  }
  if (accuracy <= 0.5 && zoomRate >= 0.5) {
    return '即使看圖，仍未判對，問題多半不在圖片大小，而在判準建立。'
  }
  if (accuracy >= 0.75) {
    return '此題目前表現相對穩定，可作為對照題或示範題。'
  }
  return '此題適合搭配常見錯答與誤用特徵一起回教。'
}

function getFeatureTeachingNote(feature: FeatureMetric) {
  if (feature.cueType === '表面線索' && (feature.wrongSelectionRate ?? 0) >= 0.6) {
    return '這是高風險表面線索，學生常勾選它卻難以做對，值得教師直接點名處理。'
  }
  if (feature.cueType === '結構線索' && (feature.correctRateWhenSelected ?? 0) >= 0.6) {
    return '學生開始使用此結構線索，但其診斷力是否穩定，仍要對照正確率觀察。'
  }
  return '可再結合學生理由文字，判斷此特徵是被正確使用，還是被誤當成關鍵判準。'
}

function diagnoseStudent(student: StudentRow) {
  const reasons: string[] = []
  if (!student.isCompleted) reasons.push('尚未完成全流程')
  if ((student.transferCount ?? 0) > 0 && (student.transferAccuracy ?? 1) < 0.34) reasons.push('遷移判定偏弱')
  if ((student.sdi ?? 0) >= 0.25) reasons.push('移除提示後落差大')
  if ((student.structuralFeatureRate ?? 1) < 0.4) reasons.push('仍偏表面線索')
  if ((student.avgTransferDurationSec ?? 0) > 180) reasons.push('作答耗時異常偏長')
  if ((student.zoomOpenCount ?? 0) > 0 && (student.transferAccuracy ?? 0) < 0.5) reasons.push('有看圖但未形成穩定判準')
  if (reasons.length === 0) reasons.push('目前未見明顯高風險訊號')

  const question = !student.isCompleted
    ? '先確認學生卡在哪一階段，優先排除流程或理解門檻。'
    : (student.sdi ?? 0) >= 0.25
      ? '請比較他在 evidence 與 transfer 哪一題開始失準，追問「有提示時你怎麼做，沒提示時又怎麼做？」'
      : '可請學生口頭說明其判準，檢查是否真的能用結構線索說理。'

  return { reasons, question }
}

function buildClassDiagnosis(data: DashboardResponse) {
  const { summary, sampleBases } = data
  if (summary.totalStudents === 0) {
    return {
      title: '目前沒有可解讀資料',
      severity: 'info' as const,
      body: '目前篩選條件下沒有學生資料，請先放寬篩選或確認資料是否已送入平台。',
    }
  }
  if ((summary.completionRate ?? 0) < 0.2) {
    return {
      title: '目前最優先不是看正確率，而是先讓更多學生走完整個流程',
      severity: 'strong' as const,
      body: `目前共 ${summary.totalStudents} 位學生，但完成率僅 ${pct(summary.completionRate)}。在流程尚未走完前，低正確率不宜直接解讀為概念不足。建議先處理卡在第 2 或第 3 階段的學生。`,
    }
  }
  if (sampleBases.transferStudents < 5) {
    return {
      title: '目前可先看早期訊號，但尚不足以下全班定論',
      severity: 'warn' as const,
      body: `目前 transfer 有效樣本僅 ${sampleBases.transferStudents} 人。可以先看哪些題目與特徵開始出現共同錯誤，但暫時不宜把 transfer 正確率當成全班結論。`,
    }
  }
  if ((summary.sdi ?? 0) >= 0.2) {
    return {
      title: '本班目前最像是「有鷹架會做，移除提示後失準」',
      severity: 'warn' as const,
      body: `evidence 正確率 ${pct(summary.evidenceAccuracy)}，transfer 正確率 ${pct(summary.transferAccuracy)}，SDI ${num(summary.sdi, 2)}。這代表學生已開始抓到規則，但還沒有穩定遷移。`,
    }
  }
  return {
    title: '本班目前已開始形成穩定判準，可進一步看共同迷思與個別差異',
    severity: 'info' as const,
    body: `完成率 ${pct(summary.completionRate)}，evidence 正確率 ${pct(summary.evidenceAccuracy)}，transfer 正確率 ${pct(summary.transferAccuracy)}。目前更值得往下看的是哪幾題與哪些特徵造成剩餘錯誤。`,
  }
}

function useDecisionPanels(data: DashboardResponse | null) {
  return useMemo(() => {
    if (!data) return null

    const classDiagnosis = buildClassDiagnosis(data)

    const interventionStudents = data.highRiskStudents.slice(0, 5).map((student) => ({
      student,
      ...diagnoseStudent(student),
    }))

    const reteachQuestions = data.questionMetrics.slice(0, 5).map((q) => ({
      ...q,
      teachingAction: getQuestionAction(q),
    }))

    const clarifyFeatures = data.featureMetrics
      .filter((f) => f.selectedCount >= 2)
      .sort((a, b) => {
        const aScore = ((a.wrongSelectionRate ?? 0) * 100) + (a.cueType === '表面線索' ? 20 : 0)
        const bScore = ((b.wrongSelectionRate ?? 0) * 100) + (b.cueType === '表面線索' ? 20 : 0)
        return bScore - aScore
      })
      .slice(0, 5)
      .map((feature) => ({
        ...feature,
        teachingNote: getFeatureTeachingNote(feature),
      }))

    return { classDiagnosis, interventionStudents, reteachQuestions, clarifyFeatures }
  }, [data])
}

export default function TeacherDecisionPage() {
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const queryString = useMemo(() => {
  const params = new URLSearchParams()
  if (filters.schoolCode) params.set('schoolCode', filters.schoolCode)
  if (filters.grade) params.set('grade', filters.grade)
  if (filters.className) params.set('className', filters.className)

  if (filters.userRole) params.set('userRole', filters.userRole)
  if (filters.useContext) params.set('useContext', filters.useContext)
  if (filters.animalClassificationExperience) {
    params.set(
      'animalClassificationExperience',
      filters.animalClassificationExperience
    )
  }

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
        if (!response.ok) throw new Error(result?.error || '讀取教師分析頁資料失敗')
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

  const decisions = useDecisionPanels(data)
  const capability = useMemo(() => (data ? capabilityCards(data.studentRows, data.sampleBases) : []), [data])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-3xl font-black tracking-tight text-gray-900">Sci-Flipper 教師形成性診斷頁（決策版）</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                這一版先保留舊版 teacher 的教學解釋骨架，再把 item/event logs 接回來。重點不是看數字漂不漂亮，而是先回答四個教師最在意的問題：
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-700">
                <li>學生目前卡在哪一階段？</li>
                <li>學生是概念未建立，還是有鷹架會做、沒提示就失準？</li>
                <li>學生用了哪些判準？偏結構線索還是表面線索？</li>
                <li>哪一題最值得重教、哪一類學生要先介入？</li>
              </ol>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <div>目前篩選後學生數：<span className="font-bold text-gray-900">{data?.summary.totalStudents ?? '—'}</span></div>
              <div>learning_records：{data?.counts.records ?? '—'}｜item_logs：{data?.counts.itemLogs ?? '—'}｜event_logs：{data?.counts.eventLogs ?? '—'}</div>
              <div className="mt-2">evidence 有效樣本：{data?.sampleBases.evidenceStudents ?? '—'} 人／{data?.sampleBases.evidenceItems ?? '—'} 題</div>
              <div>transfer 有效樣本：{data?.sampleBases.transferStudents ?? '—'} 人／{data?.sampleBases.transferItems ?? '—'} 題</div>
              <div className="mt-2 text-xs leading-5 text-amber-700">
              研究分析建議先篩選：國中學生 × 正式課堂學習，再依動物界分類經驗分組。
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
  value={filters.userRole}
  onChange={(e) =>
    setFilters((prev) => ({
      ...prev,
      userRole: e.target.value,
    }))
  }
  className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
>
  <option value="">全部身分</option>
  {data?.filters.userRoles.map((value) => (
    <option key={value} value={value}>
      {value}
    </option>
  ))}
</select>

<select
  value={filters.useContext}
  onChange={(e) =>
    setFilters((prev) => ({
      ...prev,
      useContext: e.target.value,
    }))
  }
  className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
>
  <option value="">全部使用情境</option>
  {data?.filters.useContexts.map((value) => (
    <option key={value} value={value}>
      {value}
    </option>
  ))}
</select>

<select
  value={filters.animalClassificationExperience}
  onChange={(e) =>
    setFilters((prev) => ({
      ...prev,
      animalClassificationExperience: e.target.value,
    }))
  }
  className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
>
  <option value="">全部學習經驗</option>
  {data?.filters.animalClassificationExperiences.map((value) => (
    <option key={value} value={value}>
      {value}
    </option>
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
                <input type="checkbox" checked={filters.completedOnly} onChange={(e) => setFilters((prev) => ({ ...prev, completedOnly: e.target.checked }))} />
                只看已完成
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={filters.riskOnly} onChange={(e) => setFilters((prev) => ({ ...prev, riskOnly: e.target.checked }))} />
                只看高風險學生
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
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
        ) : data && decisions ? (
          <>
            <Section title="先看這四件事" subtitle="教師進來第一眼應先看到的是教學行動，而不是一排數字。">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${severityTone(decisions.classDiagnosis.severity)}`}>
                  <div className="text-lg font-black text-gray-900">班級一句話診斷</div>
                  <div className="mt-3 text-sm font-semibold text-gray-900">{decisions.classDiagnosis.title}</div>
                  <div className="mt-2 text-sm leading-6 text-gray-700">{decisions.classDiagnosis.body}</div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-lg font-black text-gray-900">立即介入學生（前 5 位）</div>
                  <div className="mt-2 text-sm leading-6 text-gray-600">不是最低分排名，而是最值得教師先點名支持的學生。</div>
                  <div className="mt-3 space-y-3">
                    {decisions.interventionStudents.length === 0 ? (
                      <div className="text-sm text-gray-500">目前沒有高風險學生。</div>
                    ) : (
                      decisions.interventionStudents.map(({ student, reasons, question }) => (
                        <div key={student.participantCode} className="rounded-2xl border border-gray-200 bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-bold text-gray-900">
                              {student.maskedName || '未具名'}
                              <span className="ml-2 text-sm font-normal text-gray-500">{student.participantCode}</span>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskTone(student.riskLevel)}`}>{student.riskLevel}</span>
                          </div>
                          <div className="mt-2 text-sm leading-6 text-gray-700">風險原因：{reasons.join('、')}</div>
                          <div className="mt-1 text-sm leading-6 text-gray-700">教師第一句可先問：{question}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-lg font-black text-gray-900">全班最值得重教的題目</div>
                  <div className="mt-2 text-sm leading-6 text-gray-600">優先不是最低分題，而是兼看正確率、耗時、信心與 zoom 後仍失準的題目。</div>
                  <div className="mt-3 space-y-3">
                    {decisions.reteachQuestions.map((q) => (
                      <div key={q.key} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="font-bold text-gray-900">{q.stage}/{q.questionId} {q.animalName ?? ''}</div>
                        <div className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                          <div>作答人次：{q.respondents}</div>
                          <div>正確率：{pct(q.accuracy)}</div>
                          <div>平均秒數：{num(q.avgDurationSec, 1)}</div>
                          <div>平均信心：{num(q.avgConfidence, 1)}</div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-gray-700">常見錯答：{q.topWrongAnswers.length ? q.topWrongAnswers.join('、') : '—'}</div>
                        <div className="mt-1 text-sm leading-6 text-gray-700">常見誤用特徵：{q.topWrongFeatures.length ? q.topWrongFeatures.join('、') : '—'}</div>
                        <div className="mt-2 text-sm leading-6 font-medium text-gray-900">教學建議：{q.teachingAction}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="text-lg font-black text-gray-900">最值得澄清的特徵</div>
                  <div className="mt-2 text-sm leading-6 text-gray-600">教師最需要直接點名的，通常不是最常出現的特徵，而是最常把學生帶向錯誤的特徵。</div>
                  <div className="mt-3 space-y-3">
                    {decisions.clarifyFeatures.map((feature) => (
                      <div key={feature.feature} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-gray-900">{feature.feature}</div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${feature.cueType === '表面線索' ? 'bg-red-100 text-red-700' : feature.cueType === '結構線索' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{feature.cueType}</span>
                        </div>
                        <div className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                          <div>勾選次數：{feature.selectedCount}</div>
                          <div>涉及學生：{feature.studentCount}</div>
                          <div>勾選後正確率：{pct(feature.correctRateWhenSelected)}</div>
                          <div>錯答比例：{pct(feature.wrongSelectionRate)}</div>
                        </div>
                        <div className="mt-2 text-sm leading-6 font-medium text-gray-900">教學建議：{feature.teachingNote}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {data.sampleWarnings.length > 0 ? (
              <Section title="解讀提醒" subtitle="先告訴教師哪些指標可以解讀、哪些只適合當早期訊號。">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.sampleWarnings.map((warning) => (
                    <div key={warning.key} className={`rounded-2xl border p-4 ${severityTone(warning.level === 'warn' ? 'warn' : 'info')}`}>
                      <div className="text-sm font-bold text-gray-900">{warning.key}</div>
                      <div className="mt-2 text-sm leading-6 text-gray-700">{warning.message}</div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <SummaryCard title="完成率" value={pct(data.summary.completionRate)} helper={`${data.summary.completedStudents} / ${data.summary.totalStudents} 位學生`} />
              <SummaryCard title="evidence 正確率" value={pct(data.summary.evidenceAccuracy)} helper={`以 ${data.sampleBases.evidenceStudents} 位學生、${data.sampleBases.evidenceItems} 題 item logs 計`} note={data.sampleBases.evidenceStudents < 5 ? '樣本偏少，請視為早期訊號。' : undefined} />
              <SummaryCard title="transfer 正確率" value={pct(data.summary.transferAccuracy)} helper={`以 ${data.sampleBases.transferStudents} 位學生、${data.sampleBases.transferItems} 題 item logs 計`} note={data.sampleBases.transferStudents < 5 ? '樣本偏少，請勿直接視為全班定論。' : undefined} />
              <SummaryCard title="SDI" value={num(data.summary.sdi, 2)} helper="evidence - transfer；越高越代表移除提示後表現下降" />
              <SummaryCard title="平均 evidence 秒數" value={num(data.summary.avgEvidenceDurationSec, 1)} helper={`中位數 ${num(data.summary.medianEvidenceDurationSec, 1)} 秒`} />
              <SummaryCard title="zoom 使用率" value={pct(data.summary.zoomUserRate)} helper={`至少使用一次 zoom：${data.sampleBases.zoomStudents}/${data.sampleBases.totalStudents} 人；事件 ${data.sampleBases.zoomEvents} 筆`} />
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <Section title="鷹架依賴與學習進度" subtitle="先看這班是概念未建立，還是有鷹架會做、離開提示就失準。">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-lg font-bold text-gray-900">學習階段分布</div>
                    {data.stageFunnel.map((bucket) => (
                      <BarRow key={bucket.stage} label={stageLabel(bucket.stage)} value={bucket.count} total={data.summary.totalStudents} />
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

              <Section title="教師解讀提示" subtitle="這裡不是只有數據，而是幫你把觀察翻成教學決策語言。">
                <div className="space-y-3">
                  {data.insightCards.map((card, index) => (
                    <div key={`${card.title}-${index}`} className={`rounded-2xl border p-4 ${severityTone(card.severity)}`}>
                      <div className="text-base font-bold text-gray-900">{card.title}</div>
                      <div className="mt-2 text-sm leading-6 text-gray-700">{card.body}</div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <Section title="平台欲培養的分類能力" subtitle="保留上一版 teacher 的教學優勢：用能力面向，而不是只用分數面向來解讀學生。">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {capability.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-gray-500">{item.title}</div>
                    <div className="mt-2 text-2xl font-black text-gray-900">{item.count} / {item.total}</div>
                    <div className="mt-1 text-sm font-semibold text-gray-700">{item.total > 0 ? pct(item.count / item.total) : '—'}</div>
                    <div className="mt-3 text-sm leading-6 text-gray-600">{item.note}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="各題診斷與教學建議" subtitle="這一區優先回答：哪一題最值得重教？是耗時但不懂，還是快速亂答？是否存在高信心錯答？">
              <div className="overflow-x-auto">
                <table className="min-w-[1200px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2">題目</th>
                      <th className="px-3 py-2">作答人次</th>
                      <th className="px-3 py-2">正確率</th>
                      <th className="px-3 py-2">平均秒數</th>
                      <th className="px-3 py-2">中位數秒數</th>
                      <th className="px-3 py-2">平均信心</th>
                      <th className="px-3 py-2">zoom 使用率</th>
                      <th className="px-3 py-2">常見錯答</th>
                      <th className="px-3 py-2">常見誤用特徵</th>
                      <th className="px-3 py-2">教師建議</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.questionMetrics.map((q) => (
                      <tr key={q.key} className="rounded-2xl bg-gray-50 align-top">
                        <td className="px-3 py-3 font-semibold text-gray-900">{q.stage}/{q.questionId} {q.animalName ?? ''}</td>
                        <td className="px-3 py-3">{q.respondents}</td>
                        <td className="px-3 py-3">{pct(q.accuracy)}</td>
                        <td className="px-3 py-3">{num(q.avgDurationSec, 1)}</td>
                        <td className="px-3 py-3">{num(q.medianDurationSec, 1)}</td>
                        <td className="px-3 py-3">{num(q.avgConfidence, 1)}</td>
                        <td className="px-3 py-3">{pct(q.zoomUserRate)}</td>
                        <td className="px-3 py-3">{q.topWrongAnswers.length ? q.topWrongAnswers.join('、') : '—'}</td>
                        <td className="px-3 py-3">{q.topWrongFeatures.length ? q.topWrongFeatures.join('、') : '—'}</td>
                        <td className="px-3 py-3 text-gray-700">{getQuestionAction(q)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <div className="grid gap-5 xl:grid-cols-2">
              <Section title="特徵使用面板" subtitle="看哪些特徵常被勾選、勾選後常答錯，幫助教師判斷哪些線索需要直接回教。">
                <div className="space-y-3">
                  {data.featureMetrics.slice(0, 8).map((feature) => (
                    <div key={feature.feature} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-gray-900">{feature.feature}</div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${feature.cueType === '表面線索' ? 'bg-red-100 text-red-700' : feature.cueType === '結構線索' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{feature.cueType}</span>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                        <div>勾選次數：{feature.selectedCount}（涉及 {feature.studentCount} 位學生）</div>
                        <div>勾選後正確率：{pct(feature.correctRateWhenSelected)}</div>
                        <div>evidence：{feature.evidenceCount}</div>
                        <div>transfer：{feature.transferCount}</div>
                      </div>
                      <div className="mt-2 text-sm leading-6 text-gray-700">{getFeatureTeachingNote(feature)}</div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="迷思線索排行榜" subtitle="這一區不是看哪個特徵出現，而是看哪些特徵最常伴隨錯答，尤其是高信心錯答。">
                <div className="space-y-3">
                  {data.misconceptionMetrics.slice(0, 8).map((item) => (
                    <div key={item.feature} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-gray-900">{item.feature}</div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.cueType === '表面線索' ? 'bg-red-100 text-red-700' : item.cueType === '結構線索' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{item.cueType}</span>
                      </div>
                      <div className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                        <div>錯答中出現：{item.wrongCount} 次</div>
                        <div>涉及學生：{item.wrongStudentCount} 位</div>
                        <div>涉及題目：{item.wrongQuestionCount} 題</div>
                        <div>高信心錯答：{item.highConfidenceWrongCount} 次</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <Section title="學生個別診斷" subtitle="這裡適合補救教學：先看誰需要優先介入，再看其 evidence / transfer 落差、特徵使用與作答時間。">
              <div className="overflow-x-auto">
                <table className="min-w-[1400px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-3 py-2">學生</th>
                      <th className="px-3 py-2">目前階段</th>
                      <th className="px-3 py-2">風險</th>
                      <th className="px-3 py-2">evidence</th>
                      <th className="px-3 py-2">transfer</th>
                      <th className="px-3 py-2">SDI</th>
                      <th className="px-3 py-2">平均耗時</th>
                      <th className="px-3 py-2">zoom</th>
                      <th className="px-3 py-2">特徵取向</th>
                      <th className="px-3 py-2">教師先看</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.studentRows.map((student) => {
                      const diag = diagnoseStudent(student)
                      return (
                        <tr key={student.participantCode} className="rounded-2xl bg-gray-50 align-top">
                          <td className="px-3 py-3">
                            <div className="font-semibold text-gray-900">
  {student.maskedName || '未具名'}
</div>
<div className="text-xs text-gray-500">
  {student.schoolCode || '—'}｜{student.grade || '—'} 年級{' '}
  {student.className || '—'} 班 {student.seatNo || '—'} 號
</div>
<div className="mt-1 text-xs leading-5 text-gray-500">
  身分：{student.userRole || '未填'}｜情境：{student.useContext || '未填'}
</div>
<div className="text-xs leading-5 text-gray-500">
  動物界分類經驗：{student.animalClassificationExperience || '未填'}
</div>
<div className="text-xs leading-5 text-gray-400">
  版本：{student.payloadVersion || '—'}｜特徵版本：{student.featureOptionVersion || '—'}
</div>
<div className="text-xs text-gray-400">{student.participantCode}</div>
                          </td>
                          <td className="px-3 py-3">{stageLabel(student.currentStage)}</td>
                          <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskTone(student.riskLevel)}`}>{student.riskLevel}</span></td>
                          <td className="px-3 py-3">{student.evidenceCount > 0 ? `${pct(student.evidenceAccuracy)}（${student.evidenceCount} 題）` : '—'}</td>
                          <td className="px-3 py-3">{student.transferCount > 0 ? `${pct(student.transferAccuracy)}（${student.transferCount} 題）` : '—'}</td>
                          <td className="px-3 py-3">{num(student.sdi, 2)}</td>
                          <td className="px-3 py-3">evidence {num(student.avgEvidenceDurationSec, 1)} 秒／transfer {num(student.avgTransferDurationSec, 1)} 秒</td>
                          <td className="px-3 py-3">{student.zoomOpenCount} 次／{student.zoomQuestionCount} 題</td>
                          <td className="px-3 py-3">結構線索比例 {pct(student.structuralFeatureRate)}</td>
                          <td className="px-3 py-3 text-gray-700">{diag.reasons.join('、')}</td>
                        </tr>
                      )
                    })}
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
