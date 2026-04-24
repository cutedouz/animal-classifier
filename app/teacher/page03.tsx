'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

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

type ClassSummaryRow = {
  key: string
  schoolCode: string
  grade: string
  className: string
  studentCount: number
  completedCount: number
  completionRate: number
  evidenceAvg: number | null
  transferAvg: number | null
  sdiAvg: number | null
  avgAwarenessSec: number | null
  avgEvidenceSec: number | null
  avgTransferSec: number | null
  highRiskCount: number
}

type CapabilityCard = {
  title: string
  value: string
  note: string
  interpretation: string
}

type TeacherCard = {
  title: string
  evidence: string
  interpretation: string
  action: string
  severity: 'info' | 'warn' | 'strong'
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

function pct(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

function num(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}

function avg(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (valid.length === 0) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
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
  if (level === '中') return 'bg-amber-100 text-amber-800'
  if (level === '低') return 'bg-green-100 text-green-700'
  if (level === '未完成') return 'bg-slate-100 text-slate-700'
  return 'bg-gray-100 text-gray-700'
}

function severityColor(level: TeacherCard['severity'] | SampleWarning['level']) {
  if (level === 'strong') return 'border-red-200 bg-red-50'
  if (level === 'warn') return 'border-amber-200 bg-amber-50'
  return 'border-blue-200 bg-blue-50'
}

function cueOrientation(student: StudentRow) {
  if (student.structuralFeatureRate == null) return '資料不足'
  if (student.structuralFeatureRate >= 0.7) return '結構線索為主'
  if (student.structuralFeatureRate >= 0.4) return '混合線索'
  return '表面線索偏多'
}

function studentDiagnostic(student: StudentRow) {
  if (!student.isCompleted) {
    return '學生尚未完成完整流程，先優先排除任務進度或流程卡關。'
  }
  if ((student.transferAccuracy ?? 0) < 0.34 && (student.evidenceAccuracy ?? 0) >= 0.5) {
    return '有提示時能判定，移除提示後掉落明顯，屬於典型鷹架依賴。'
  }
  if ((student.structuralFeatureRate ?? 0) < 0.4) {
    return '目前仍偏向表面線索，需回到結構特徵的對照教學。'
  }
  if ((student.avgTransferDurationSec ?? 0) > 180) {
    return 'transfer 題停留時間偏長，可能存在概念混淆或無效停留。'
  }
  if ((student.transferAccuracy ?? 0) >= 0.67 && (student.sdi ?? 0) <= 0.15) {
    return '遷移表現穩定，可作為同儕示範或口頭說理分享對象。'
  }
  return '可持續追蹤其判準是否穩定，並以個別題目回饋強化線索品質。'
}

function studentAction(student: StudentRow) {
  if (!student.isCompleted) return '先協助完成後續階段，再解讀正確率。'
  if ((student.transferAccuracy ?? 0) < 0.34 && (student.evidenceAccuracy ?? 0) >= 0.5) {
    return '請帶學生比較 evidence 與 transfer 的同類型題，要求說明移除提示後為何改判。'
  }
  if ((student.structuralFeatureRate ?? 0) < 0.4) {
    return '請教師直接點名其勾選過的表面線索，帶回刺絲胞、外套膜、體節、外骨骼、管足等結構特徵。'
  }
  if ((student.avgTransferDurationSec ?? 0) > 180) {
    return '請確認是否存在長時間停留但無效操作，必要時縮小任務量或增加口語鷹架。'
  }
  return '可安排口頭說理、同儕互評或讓其示範如何從特徵推到門別。'
}

function questionInterpretation(item: QuestionMetric) {
  if (item.respondents === 0) return '目前尚無有效作答樣本。'
  if ((item.accuracy ?? 1) < 0.34 && (item.avgDurationSec ?? 0) >= 20) {
    return '學生投入了時間但仍常判錯，較像概念或判準沒有建立，而不是草率作答。'
  }
  if ((item.accuracy ?? 1) < 0.34 && (item.avgDurationSec ?? 999) < 10) {
    return '低正確率且平均耗時偏短，可能出現快速直覺判斷或低估題目難度。'
  }
  if ((item.highConfidenceWrongRate ?? 0) >= 0.34) {
    return '高信心錯答比例偏高，表示此題可能承載穩定但不正確的迷思概念。'
  }
  if ((item.zoomUserRate ?? 0) >= 0.4 && (item.accuracy ?? 1) < 0.5) {
    return '即使放大圖片，正確率仍偏低，代表問題不只是圖像大小，而是圖像線索未能轉成分類判準。'
  }
  return '此題目前表現相對穩定，可作為對照題，而非優先重教題。'
}

function questionAction(item: QuestionMetric) {
  if ((item.accuracy ?? 1) < 0.34) {
    return '建議全班重教此題，明確比較常見錯答與正確門別各自依據的特徵。'
  }
  if ((item.zoomUserRate ?? 0) >= 0.4) {
    return '可把本題拿來示範「看圖不是看熱鬧，而是要找可診斷的構造線索」。'
  }
  if ((item.highConfidenceWrongRate ?? 0) >= 0.2) {
    return '適合做概念衝突教學，請學生先說理，再對照特徵進行修正。'
  }
  return '可作為補充練習或與困難題對照，幫助學生區分穩定與不穩定線索。'
}

function featureInterpretation(item: FeatureMetric) {
  if (item.cueType === '表面線索' && (item.wrongSelectionRate ?? 0) >= 0.5) {
    return '這是高風險表面線索，學生常勾選它且伴隨錯答，值得教師直接點名處理。'
  }
  if (item.cueType === '結構線索' && (item.correctRateWhenSelected ?? 0) >= 0.67) {
    return '這是高價值結構線索，勾選後常伴隨正確判斷，可作為教學強化重點。'
  }
  if (item.cueType === '結構線索') {
    return '學生已開始使用此結構線索，但其診斷力還未穩定，需要搭配範例反覆比對。'
  }
  return '此特徵目前定位仍不穩，建議結合題目脈絡再判讀。'
}

function buildQuery(filters: FiltersState) {
  const params = new URLSearchParams()
  if (filters.schoolCode) params.set('schoolCode', filters.schoolCode)
  if (filters.grade) params.set('grade', filters.grade)
  if (filters.className) params.set('className', filters.className)
  if (filters.participantCode) params.set('participantCode', filters.participantCode)
  if (filters.currentStage) params.set('currentStage', filters.currentStage)
  if (filters.completedOnly) params.set('completedOnly', 'true')
  if (filters.riskOnly) params.set('riskOnly', 'true')
  return params.toString()
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

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
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

export default function TeacherDashboardIntegratedPage() {
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const query = buildQuery(filters)
        const response = await fetch(`/api/teacher-dashboard${query ? `?${query}` : ''}`, { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) throw new Error(result?.error || '讀取教師分析頁失敗')
        if (!ignore) setData(result)
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : '讀取教師分析頁失敗')
          setData(null)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void load()
    return () => {
      ignore = true
    }
  }, [filters])

  const classSummary = useMemo<ClassSummaryRow[]>(() => {
    if (!data) return []
    const map = new Map<string, ClassSummaryRow>()
    for (const student of data.studentRows) {
      const key = [student.schoolCode ?? '未填學校', student.grade ?? '未填年級', student.className ?? '未填班級'].join('|')
      if (!map.has(key)) {
        map.set(key, {
          key,
          schoolCode: student.schoolCode ?? '未填學校',
          grade: student.grade ?? '未填年級',
          className: student.className ?? '未填班級',
          studentCount: 0,
          completedCount: 0,
          completionRate: 0,
          evidenceAvg: null,
          transferAvg: null,
          sdiAvg: null,
          avgAwarenessSec: null,
          avgEvidenceSec: null,
          avgTransferSec: null,
          highRiskCount: 0,
        })
      }
      const target = map.get(key)!
      target.studentCount += 1
      if (student.isCompleted) target.completedCount += 1
      if (student.riskLevel === '高') target.highRiskCount += 1
    }

    return Array.from(map.values())
      .map((row) => {
        const members = data.studentRows.filter((student) => [student.schoolCode ?? '未填學校', student.grade ?? '未填年級', student.className ?? '未填班級'].join('|') === row.key)
        return {
          ...row,
          completionRate: row.studentCount > 0 ? row.completedCount / row.studentCount : 0,
          evidenceAvg: avg(members.map((student) => student.evidenceAccuracy)),
          transferAvg: avg(members.map((student) => student.transferAccuracy)),
          sdiAvg: avg(members.map((student) => student.sdi)),
          avgAwarenessSec: avg(members.map((student) => student.awarenessSecondsSpent)),
          avgEvidenceSec: avg(members.map((student) => student.avgEvidenceDurationSec)),
          avgTransferSec: avg(members.map((student) => student.avgTransferDurationSec)),
        }
      })
      .sort((a, b) => a.schoolCode.localeCompare(b.schoolCode, 'zh-Hant') || a.grade.localeCompare(b.grade, 'zh-Hant') || a.className.localeCompare(b.className, 'zh-Hant'))
  }, [data])

  const capabilityCards = useMemo<CapabilityCard[]>(() => {
    if (!data) return []
    const total = data.studentRows.length
    const stage1Ready = data.studentRows.filter((student) => (student.stage1GroupCount ?? 0) >= 2 && (student.stage1OverallReasonLength ?? 0) >= 8).length
    const cueBuilders = data.studentRows.filter((student) => (student.diagnosticFeatureCount ?? 0) > 0 && (student.possibleFeatureCount ?? 0) > 0).length
    const evidenceStable = data.studentRows.filter((student) => (student.evidenceCount ?? 0) > 0 && (student.evidenceAccuracy ?? 0) >= 0.67).length
    const transferStable = data.studentRows.filter((student) => (student.transferCount ?? 0) > 0 && (student.transferAccuracy ?? 0) >= 0.67).length
    const structureShift = data.studentRows.filter((student) => (student.structuralFeatureRate ?? 0) >= 0.6).length
    return [
      {
        title: '初步分類與理由化',
        value: `${stage1Ready} / ${total}`,
        note: `約 ${pct(total > 0 ? stage1Ready / total : null)}`,
        interpretation: '學生是否完成分組、群組理由與整體分類想法，代表其是否願意把直觀分類轉成可討論的判準。',
      },
      {
        title: '關鍵／輔助線索辨識',
        value: `${cueBuilders} / ${total}`,
        note: `約 ${pct(total > 0 ? cueBuilders / total : null)}`,
        interpretation: '學生是否至少開始區分較有判斷力的線索與較不穩定的線索。',
      },
      {
        title: '帶提示判定穩定',
        value: `${evidenceStable} / ${data.sampleBases.evidenceStudents}`,
        note: `evidence 有效樣本 ${data.sampleBases.evidenceStudents}`,
        interpretation: '學生在有鷹架支持時，是否已能相對穩定地做出門別判定。',
      },
      {
        title: '遷移判定穩定',
        value: `${transferStable} / ${data.sampleBases.transferStudents}`,
        note: `transfer 有效樣本 ${data.sampleBases.transferStudents}`,
        interpretation: '學生在移除提示卡後，是否仍能把規則套用到新生物。',
      },
      {
        title: '由表面走向結構',
        value: `${structureShift} / ${total}`,
        note: `結構線索率 ≥ 60%`,
        interpretation: '學生是否已逐漸把判斷重心從外觀、棲地等表面線索移向結構性特徵。',
      },
    ]
  }, [data])

  const teacherCards = useMemo<TeacherCard[]>(() => {
    if (!data) return []
    const hardestQuestion = [...data.questionMetrics]
      .filter((item) => item.respondents > 0)
      .sort((a, b) => {
        const accDiff = (a.accuracy ?? 1) - (b.accuracy ?? 1)
        if (accDiff !== 0) return accDiff
        return (b.avgDurationSec ?? 0) - (a.avgDurationSec ?? 0)
      })[0]

    const misleadingFeature = [...data.misconceptionMetrics].sort((a, b) => b.wrongCount - a.wrongCount)[0]
    const riskyStudents = data.studentRows.filter((student) => student.riskLevel === '高').length
    const zoomHeavyQuestion = [...data.questionMetrics]
      .filter((item) => item.respondents > 0)
      .sort((a, b) => (b.zoomUserRate ?? 0) - (a.zoomUserRate ?? 0))[0]

    return [
      {
        title: '完成率先決，不宜跳過',
        evidence: `目前篩選後共有 ${data.summary.totalStudents} 位學生，其中完成者 ${data.summary.completedStudents} 位，完成率 ${pct(data.summary.completionRate)}。`,
        interpretation:
          (data.summary.completionRate ?? 0) < 0.7
            ? '完成率尚不足時，教師不宜把低正確率直接視為概念不足，因為部分學生可能還停留在前階段。'
            : '完成率已達可解讀水準，後續 evidence、transfer 與迷思分析較能代表真實學習表現。',
        action: '先點開未完成學生名單，看他們主要卡在第 2 或第 3 階段，避免把流程卡關誤判成概念失敗。',
        severity: (data.summary.completionRate ?? 0) < 0.5 ? 'strong' : (data.summary.completionRate ?? 0) < 0.7 ? 'warn' : 'info',
      },
      {
        title: '鷹架依賴是這版教師頁最重要的診斷',
        evidence: `evidence 正確率 ${pct(data.summary.evidenceAccuracy, 1)}；transfer 正確率 ${pct(data.summary.transferAccuracy, 1)}；SDI ${num(data.summary.sdi, 2)}。`,
        interpretation:
          (data.summary.sdi ?? 0) >= 0.3
            ? '學生在提示卡支持下的判定顯著優於移除提示後，顯示多數人仍未把規則穩定內化。'
            : 'evidence 與 transfer 的落差較小，代表部分學生已開始把規則帶到新情境。',
        action: '請先查看 SDI 偏高的學生與題目，要求學生比較「有提示時為何會做、沒提示時為何改判」。',
        severity: (data.summary.sdi ?? 0) >= 0.3 ? 'strong' : (data.summary.sdi ?? 0) >= 0.15 ? 'warn' : 'info',
      },
      {
        title: '最值得重教的題目',
        evidence: hardestQuestion
          ? `${hardestQuestion.stage}/${hardestQuestion.questionId} ${hardestQuestion.animalName ?? '未命名'}：正確率 ${pct(hardestQuestion.accuracy)}，平均耗時 ${num(hardestQuestion.avgDurationSec, 1)} 秒。`
          : '目前尚無足夠題目樣本。',
        interpretation: hardestQuestion ? questionInterpretation(hardestQuestion) : '請先累積有效題目作答後再解讀。',
        action: hardestQuestion ? questionAction(hardestQuestion) : '先累積更多有效作答樣本。',
        severity: hardestQuestion && (hardestQuestion.accuracy ?? 1) < 0.34 ? 'strong' : 'info',
      },
      {
        title: '最常拖累判定的線索',
        evidence: misleadingFeature
          ? `${misleadingFeature.feature} 在錯答中出現 ${misleadingFeature.wrongCount} 次，高信心錯答 ${misleadingFeature.highConfidenceWrongCount} 次。`
          : '目前尚無足夠錯答線索資料。',
        interpretation: misleadingFeature
          ? misleadingFeature.cueType === '表面線索'
            ? '這通常表示學生把外觀、棲地或直觀印象當成關鍵判準，需直接回教。'
            : '這代表學生雖已接觸到結構線索，但還未穩定知道何時使用。'
          : '先累積更多錯答樣本再解讀。',
        action: misleadingFeature
          ? '請把這個線索與正確門別線索並列展示，明確討論「它可以參考，但不能單獨決定門別」。'
          : '先累積更多錯答資料。',
        severity: misleadingFeature && misleadingFeature.cueType === '表面線索' ? 'strong' : 'warn',
      },
      {
        title: '圖片放大不是裝飾，而是圖像證據使用',
        evidence: `至少使用一次 zoom 的學生比例 ${pct(data.summary.zoomUserRate)}；事件總數 ${data.sampleBases.zoomEvents}。${zoomHeavyQuestion ? `最多人放大的題目是 ${zoomHeavyQuestion.questionId}。` : ''}`,
        interpretation:
          (data.summary.zoomUserRate ?? 0) < 0.1
            ? '目前很少學生主動放大看圖，可能代表他們低估圖像細節的重要性，或尚未形成「看圖找線索」的習慣。'
            : '已有部分學生把圖像當成證據來源，但還需看放大後是否轉化為較高正確率。',
        action: '建議教師在示範時公開講解如何從放大圖中找可診斷的構造線索，而不是只說「看清楚一點」。',
        severity: (data.summary.zoomUserRate ?? 0) < 0.1 ? 'warn' : 'info',
      },
      {
        title: '高風險學生不是單純低分學生',
        evidence: `目前高風險學生 ${riskyStudents} 位，未完成或資料不足者 ${data.studentRows.filter((student) => student.riskLevel === '未完成' || student.riskLevel === '資料不足').length} 位。`,
        interpretation:
          riskyStudents >= Math.max(3, Math.ceil(data.studentRows.length * 0.2))
            ? '高風險比例偏高時，通常不只是個別差異，也可能意味教學指示、任務門檻或規則建構環節需要調整。'
            : '高風險學生數量有限時，適合進行個別補救與精準追蹤。',
        action: '請優先查看高風險學生的「判準傾向」與「個別教學建議」，而不要只用正確率排序。',
        severity: riskyStudents >= Math.max(3, Math.ceil(data.studentRows.length * 0.2)) ? 'warn' : 'info',
      },
    ]
  }, [data])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-lg font-semibold text-gray-700">載入教師分析頁中…</div>
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
          <div className="text-lg font-semibold text-red-700">{error || '讀取教師分析頁失敗'}</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Section
          title="Sci-Flipper 教師形成性診斷頁（整合版）"
          subtitle="這一版保留舊版 teacher 頁強項：教師詮釋、能力指標、班級比較與個別診斷；同時補進新版 item/event logs：題目耗時、zoom 使用、題目診斷與高風險線索。"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_360px]">
            <div className="rounded-2xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
              <div>這一頁不是單純成績單，而是協助教師回答四個問題：</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>學生目前走到哪一個階段？</li>
                <li>學生是概念未建立，還是有提示會做、沒提示就失準？</li>
                <li>學生用了哪些判準？偏結構線索還是表面線索？</li>
                <li>哪一題最值得重教、哪一類線索最容易導致錯誤？</li>
              </ol>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
              <div>目前篩選後學生數：<span className="font-bold text-gray-900">{data.summary.totalStudents}</span></div>
              <div>learning_records：{data.counts.records} ｜ item_logs：{data.counts.itemLogs} ｜ event_logs：{data.counts.eventLogs}</div>
              <div>evidence 有效樣本：{data.sampleBases.evidenceStudents} 人 / {data.sampleBases.evidenceItems} 題</div>
              <div>transfer 有效樣本：{data.sampleBases.transferStudents} 人 / {data.sampleBases.transferItems} 題</div>
            </div>
          </div>
        </Section>

        <Section
          title="篩選條件"
          subtitle="先縮小範圍，再看班級整體與個別學生。這是教學決策頁，不是排行榜。"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select
              value={filters.schoolCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, schoolCode: e.target.value, grade: '', className: '' }))}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            >
              <option value="">全部學校</option>
              {data.filters.schoolCodes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={filters.grade}
              onChange={(e) => setFilters((prev) => ({ ...prev, grade: e.target.value, className: '' }))}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            >
              <option value="">全部年級</option>
              {data.filters.grades.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={filters.className}
              onChange={(e) => setFilters((prev) => ({ ...prev, className: e.target.value }))}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            >
              <option value="">全部班級</option>
              {data.filters.classNames.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <select
              value={filters.currentStage}
              onChange={(e) => setFilters((prev) => ({ ...prev, currentStage: e.target.value }))}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            >
              <option value="">全部階段</option>
              {data.filters.stages.map((item) => (
                <option key={item} value={item}>{stageLabel(item)}</option>
              ))}
            </select>

            <input
              value={filters.participantCode}
              onChange={(e) => setFilters((prev) => ({ ...prev, participantCode: e.target.value }))}
              placeholder="搜尋 participant_code"
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm"
            />

            <div className="rounded-xl border border-gray-200 p-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.completedOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, completedOnly: e.target.checked }))}
                />
                <span>只看已完成</span>
              </label>
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.riskOnly}
                  onChange={(e) => setFilters((prev) => ({ ...prev, riskOnly: e.target.checked }))}
                />
                <span>只看高風險學生</span>
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              清除篩選
            </button>
          </div>
        </Section>

        {data.sampleWarnings.length > 0 ? (
          <Section title="解讀提醒" subtitle="這一區先告訴教師哪些指標可以解讀、哪些只適合作為早期訊號。">
            <div className="grid gap-3 md:grid-cols-2">
              {data.sampleWarnings.map((warning) => (
                <div key={warning.key} className={`rounded-2xl border p-4 ${severityColor(warning.level)}`}>
                  <div className="text-sm font-semibold text-gray-900">{warning.key}</div>
                  <div className="mt-2 text-sm leading-6 text-gray-700">{warning.message}</div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard
            title="完成率"
            value={pct(data.summary.completionRate)}
            helper={`${data.summary.completedStudents} / ${data.summary.totalStudents} 位學生`}
          />
          <SummaryCard
            title="evidence 正確率"
            value={pct(data.summary.evidenceAccuracy)}
            helper={`以 ${data.sampleBases.evidenceStudents} 位學生、${data.sampleBases.evidenceItems} 題 item logs 計`}
            note={data.sampleBases.evidenceStudents < 5 ? '樣本偏少，請視為早期訊號。' : undefined}
          />
          <SummaryCard
            title="transfer 正確率"
            value={pct(data.summary.transferAccuracy)}
            helper={`以 ${data.sampleBases.transferStudents} 位學生、${data.sampleBases.transferItems} 題 item logs 計`}
            note={data.sampleBases.transferStudents < 5 ? '樣本偏少，請勿直接視為全班定論。' : undefined}
          />
          <SummaryCard
            title="SDI"
            value={num(data.summary.sdi, 2)}
            helper="evidence - transfer；越高代表越依賴鷹架"
            note={data.sampleBases.transferStudents < 5 ? 'transfer 樣本不足時，SDI 僅供參考。' : undefined}
          />
          <SummaryCard
            title="平均 evidence 秒數"
            value={num(data.summary.avgEvidenceDurationSec, 1)}
            helper={`中位數 ${num(data.summary.medianEvidenceDurationSec, 1)} 秒`}
          />
          <SummaryCard
            title="zoom 使用率"
            value={pct(data.summary.zoomUserRate)}
            helper={`至少使用一次 zoom：${data.sampleBases.zoomStudents} 人；事件 ${data.sampleBases.zoomEvents} 筆`}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <Section
            title="鷹架依賴與學習進度"
            subtitle="這裡最適合看班級目前是概念未建立，還是有鷹架會做、離開提示就失準。"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <div className="text-xl font-black text-gray-900">學習階段分布</div>
                {data.stageFunnel.map((item) => (
                  <BarRow key={item.stage} label={stageLabel(item.stage)} value={item.count} total={data.summary.totalStudents} />
                ))}
              </div>
              <div className="space-y-3">
                <div className="text-xl font-black text-gray-900">風險分布</div>
                {data.riskDistribution.map((item) => (
                  <BarRow
                    key={item.level}
                    label={item.level}
                    value={item.count}
                    total={data.summary.totalStudents}
                    colorClass={item.level === '高' ? 'bg-red-500' : item.level === '中' ? 'bg-amber-500' : item.level === '低' ? 'bg-green-500' : 'bg-slate-500'}
                  />
                ))}
              </div>
            </div>
          </Section>

          <Section
            title="教師解讀提示"
            subtitle="這裡不是只有數據，而是把資料翻成較容易採取教學決策的語言。"
          >
            <div className="space-y-3">
              {[...data.insightCards, ...teacherCards].map((card, index) => {
  const cardKey =
    'body' in card
      ? `${card.title}-${card.body}-${index}`
      : `${card.title}-${'evidence' in card ? card.evidence : ''}-${index}`

  return (
    <div
      key={cardKey}
      className={`rounded-2xl border p-5 ${
        card.severity === 'strong'
          ? 'border-red-200 bg-red-50'
          : card.severity === 'warn'
            ? 'border-amber-200 bg-amber-50'
            : 'border-gray-200 bg-white'
      }`}
    >
      <div className="text-lg font-black text-gray-900">{card.title}</div>

      {'body' in card ? (
        <div className="mt-2 text-sm leading-7 text-gray-700">{card.body}</div>
      ) : (
        <div className="mt-3 space-y-2 text-sm leading-7 text-gray-700">
          {'evidence' in card ? (
            <div>
              <span className="font-semibold">證據：</span>
              {card.evidence}
            </div>
          ) : null}

          {'interpretation' in card ? (
            <div>
              <span className="font-semibold">詮釋：</span>
              {card.interpretation}
            </div>
          ) : null}

         {'action' in card ? (
            <div>
              <span className="font-semibold">教學建議：</span>
              {card.action}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
})}
            </div>
          </Section>
        </div>

        <Section
          title="平台欲培養的分類能力"
          subtitle="保留上一版 teacher 頁的教學優勢：用能力面向，而不是只用分數面向來解讀學生。"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {capabilityCards.map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-500">{item.title}</div>
                <div className="mt-2 text-2xl font-black text-gray-900">{item.value}</div>
                <div className="mt-1 text-xs font-semibold text-gray-700">{item.note}</div>
                <div className="mt-3 text-sm leading-6 text-gray-600">{item.interpretation}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="各題診斷與教學建議"
          subtitle="這一區優先回答：哪一題最值得重教？是耗時但不懂，還是快速亂答？是否存在高信心錯答？"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1500px] border-separate border-spacing-y-2 text-sm">
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
                  <th className="px-3 py-2">常見錯用特徵</th>
                  <th className="px-3 py-2">教師詮釋</th>
                  <th className="px-3 py-2">教學建議</th>
                </tr>
              </thead>
              <tbody>
                {data.questionMetrics.map((item) => (
                  <tr key={item.key} className="rounded-2xl bg-gray-50 align-top text-gray-700">
                    <td className="px-3 py-3 font-semibold text-gray-900">{item.stage}/{item.questionId} {item.animalName ?? '—'}</td>
                    <td className="px-3 py-3">{item.respondents}</td>
                    <td className="px-3 py-3">{pct(item.accuracy)}</td>
                    <td className="px-3 py-3">{num(item.avgDurationSec, 1)}</td>
                    <td className="px-3 py-3">{num(item.medianDurationSec, 1)}</td>
                    <td className="px-3 py-3">{num(item.avgConfidence, 1)}</td>
                    <td className="px-3 py-3">{pct(item.zoomUserRate)}</td>
                    <td className="px-3 py-3">{item.topWrongAnswers.length ? item.topWrongAnswers.join('、') : '—'}</td>
                    <td className="px-3 py-3">{item.topWrongFeatures.length ? item.topWrongFeatures.join('、') : '—'}</td>
                    <td className="px-3 py-3 leading-6">{questionInterpretation(item)}</td>
                    <td className="px-3 py-3 leading-6">{questionAction(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid gap-5 xl:grid-cols-2">
          <Section
            title="特徵使用面板"
            subtitle="保留上一版『線索使用分布』的精神，但加入新版 item logs：看哪些特徵常被勾選、勾選後較常正確，或較常導致錯答。"
          >
            <div className="space-y-3">
              {data.featureMetrics.slice(0, 12).map((item) => (
                <div key={item.feature} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-bold text-gray-900">{item.feature}</div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.cueType === '表面線索' ? 'bg-red-100 text-red-700' : item.cueType === '結構線索' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {item.cueType}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                    <div>勾選次數：{item.selectedCount}（涉及 {item.studentCount} 位學生）</div>
                    <div>勾選後正確率：{pct(item.correctRateWhenSelected)}</div>
                    <div>錯答比例：{pct(item.wrongSelectionRate)}</div>
                    <div>evidence：{item.evidenceCount} ｜ transfer：{item.transferCount}</div>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-gray-700">{featureInterpretation(item)}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="迷思線索排行榜"
            subtitle="這一區不是看哪個特徵常出現，而是看哪些特徵最常伴隨錯答，尤其是高信心錯答。"
          >
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

        <Section
          title="班級比較"
          subtitle="保留上一版 class summary 的優點，但補入新版 evidence / transfer / SDI / 題目耗時。這樣教師不只看分數，而能看規則建構負荷與遷移狀況。"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[1450px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-2">學校</th>
                  <th className="px-3 py-2">年級</th>
                  <th className="px-3 py-2">班級</th>
                  <th className="px-3 py-2">學生數</th>
                  <th className="px-3 py-2">完成人數</th>
                  <th className="px-3 py-2">完成率</th>
                  <th className="px-3 py-2">evidence</th>
                  <th className="px-3 py-2">transfer</th>
                  <th className="px-3 py-2">SDI</th>
                  <th className="px-3 py-2">第二階段秒數</th>
                  <th className="px-3 py-2">evidence 秒數</th>
                  <th className="px-3 py-2">transfer 秒數</th>
                  <th className="px-3 py-2">高風險</th>
                </tr>
              </thead>
              <tbody>
                {classSummary.map((row) => (
                  <tr key={row.key} className="rounded-2xl bg-gray-50 text-gray-700">
                    <td className="px-3 py-3 font-semibold text-gray-900">{row.schoolCode}</td>
                    <td className="px-3 py-3">{row.grade}</td>
                    <td className="px-3 py-3">{row.className}</td>
                    <td className="px-3 py-3">{row.studentCount}</td>
                    <td className="px-3 py-3">{row.completedCount}</td>
                    <td className="px-3 py-3">{pct(row.completionRate)}</td>
                    <td className="px-3 py-3">{pct(row.evidenceAvg)}</td>
                    <td className="px-3 py-3">{pct(row.transferAvg)}</td>
                    <td className="px-3 py-3">{num(row.sdiAvg, 2)}</td>
                    <td className="px-3 py-3">{num(row.avgAwarenessSec, 1)}</td>
                    <td className="px-3 py-3">{num(row.avgEvidenceSec, 1)}</td>
                    <td className="px-3 py-3">{num(row.avgTransferSec, 1)}</td>
                    <td className="px-3 py-3">{row.highRiskCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="學生摘要與個別診斷"
          subtitle="保留你上一版 teacher 頁最有價值的地方：不是只有名單，而是讓教師能快速判斷每位學生該如何介入。"
        >
          <div className="overflow-x-auto">
            <table className="min-w-[2400px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="px-3 py-2">學生</th>
                  <th className="px-3 py-2">學校 / 班級 / 座號</th>
                  <th className="px-3 py-2">階段</th>
                  <th className="px-3 py-2">完成</th>
                  <th className="px-3 py-2">風險</th>
                  <th className="px-3 py-2">evidence</th>
                  <th className="px-3 py-2">transfer</th>
                  <th className="px-3 py-2">SDI</th>
                  <th className="px-3 py-2">evidence 秒</th>
                  <th className="px-3 py-2">transfer 秒</th>
                  <th className="px-3 py-2">平均特徵數</th>
                  <th className="px-3 py-2">平均理由字數</th>
                  <th className="px-3 py-2">結構線索率</th>
                  <th className="px-3 py-2">判準傾向</th>
                  <th className="px-3 py-2">第二階段</th>
                  <th className="px-3 py-2">zoom</th>
                  <th className="px-3 py-2">教師診斷</th>
                  <th className="px-3 py-2">教學建議</th>
                </tr>
              </thead>
              <tbody>
                {data.studentRows.map((student) => (
                  <tr key={student.participantCode} className="rounded-2xl bg-gray-50 align-top text-gray-700">
                    <td className="px-3 py-3 font-semibold text-gray-900">{student.maskedName ?? student.participantCode}</td>
                    <td className="px-3 py-3">{student.schoolCode ?? '—'} / {student.className ?? '—'} / {student.seatNo ?? '—'}</td>
                    <td className="px-3 py-3">{stageLabel(student.currentStage)}</td>
                    <td className="px-3 py-3">{student.isCompleted ? '是' : '否'}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskColor(student.riskLevel)}`}>{student.riskLevel}</span></td>
                    <td className="px-3 py-3">{pct(student.evidenceAccuracy)}</td>
                    <td className="px-3 py-3">{pct(student.transferAccuracy)}</td>
                    <td className="px-3 py-3">{num(student.sdi, 2)}</td>
                    <td className="px-3 py-3">{num(student.avgEvidenceDurationSec, 1)}</td>
                    <td className="px-3 py-3">{num(student.avgTransferDurationSec, 1)}</td>
                    <td className="px-3 py-3">{num(student.selectedFeatureCountAvg, 1)}</td>
                    <td className="px-3 py-3">{num(student.reasonCharCountAvg, 1)}</td>
                    <td className="px-3 py-3">{pct(student.structuralFeatureRate)}</td>
                    <td className="px-3 py-3">{cueOrientation(student)}</td>
                    <td className="px-3 py-3 leading-6">
                      <div>awareness 秒數：{num(student.awarenessSecondsSpent, 0)}</div>
                      <div>readiness 重試：{num(student.readinessRetryCount, 0)}</div>
                      <div>一次答對率：{pct(student.readinessFirstPassRate)}</div>
                    </td>
                    <td className="px-3 py-3 leading-6">
                      <div>開圖次數：{student.zoomOpenCount}</div>
                      <div>涉及題數：{student.zoomQuestionCount}</div>
                    </td>
                    <td className="px-3 py-3 leading-6">{studentDiagnostic(student)}</td>
                    <td className="px-3 py-3 leading-6">{studentAction(student)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </main>
  )
}
