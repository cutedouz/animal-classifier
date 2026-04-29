'use client'

import { useEffect, useMemo, useState, type FormEvent } from "react"

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
  riskLevel: "高" | "中" | "低" | "未完成" | "資料不足"
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
  highFeatureQualityCount: number
  partialFeatureQualityCount: number
  surfaceOrMisleadingCount: number
  unclearFeatureQualityCount: number
  highFeatureQualityRate: number | null
  surfaceOrMisleadingRate: number | null
  avgPrimaryHitCount: number | null
  avgMisleadingHitCount: number | null
  topPrimaryFeatures: string[]
  topMisleadingFeatures: string[]
}

type FeatureMetric = {
  feature: string
  cueType: "結構線索" | "表面線索" | "待分類"
  selectedCount: number
  studentCount: number
  correctRateWhenSelected: number | null
  evidenceCount: number
  transferCount: number
  wrongSelectionRate: number | null
}

type MisconceptionMetric = {
  feature: string
  cueType: "結構線索" | "表面線索" | "待分類"
  wrongCount: number
  wrongStudentCount: number
  wrongQuestionCount: number
  highConfidenceWrongCount: number
}

type FeatureQualitySummary = {
  high: number
  partial: number
  surfaceOrMisleading: number
  unclear: number
}

type InsightCard = {
  title: string
  body: string
  severity: "info" | "warn" | "strong"
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
  level: "warn" | "info"
  message: string
}

type DashboardResponse = {
  ok: true
  teacher?: {
    id: string
    username: string | null
    email: string | null
    displayName: string
    isSuperAdmin?: boolean
    authorizedClasses: Array<{
      schoolCode: string
      schoolName: string | null
      grade: string | null
      className: string
    }>
  }
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
  featureQualitySummary: FeatureQualitySummary
  averagePrimaryHitCount: number
  averageMisleadingHitCount: number
  insightCards: InsightCard[]
  counts: {
    records: number
    itemLogs: number
    eventLogs: number
  }
}

type QualitativePattern = {
  key: string
  label: string
  count: number
  rate: number | null
  description: string
  examples: string[]
}

type QualitativeExample = {
  key: string
  stage: string
  animalName: string | null
  questionId: string
  studentLabel: string
  finalAnswer: string | null
  confidence: number | null
  isCorrect: boolean | null
  criterionQuality: string | null
  primaryFeature: string | null
  reasonText: string | null
  exclusionReasonText: string | null
  interpretation: string
}

type QualitativeQuestionFocus = {
  key: string
  stage: string
  questionId: string
  animalName: string | null
  reasonCount: number
  shortReasonRate: number | null
  missingExclusionRate: number | null
  surfaceReasonRate: number | null
  highConfidenceWrongCount: number
  examples: QualitativeExample[]
}

type QualitativeResponse = {
  ok: true
  summary: {
    recordCount: number
    itemLogCount: number
    reasonCount: number
    exclusionReasonCount: number
    shortReasonRate: number | null
    missingExclusionRate: number | null
    surfaceReasonRate: number | null
    structuralReasonRate: number | null
    highConfidenceWrongReasonCount: number
  }
  patterns: QualitativePattern[]
  questionFocus: QualitativeQuestionFocus[]
  examples: QualitativeExample[]
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

type SupportType = {
  label: string
  tone: "green" | "yellow" | "red" | "blue" | "gray"
  evidence: string
  action: string
  priority: number
}

const INITIAL_FILTERS: FiltersState = {
  schoolCode: "",
  grade: "",
  className: "",
  userRole: "",
  useContext: "",
  animalClassificationExperience: "",
  participantCode: "",
  currentStage: "",
  completedOnly: false,
  riskOnly: false,
}

function pct(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return "—"
  return `${(value * 100).toFixed(digits)}%`
}

function num(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—"
  return value.toFixed(digits)
}

function countLabel(value: number | null | undefined, unit = "人") {
  if (value == null || Number.isNaN(value)) return "—"
  return `${value}${unit}`
}

function stageLabel(stage: string | null) {
  const map: Record<string, string> = {
    stage1: "第 1 階段：自由分類",
    reflection: "第 2 階段：線索反思",
    guide: "第 3 階段：六門提示卡",
    awareness: "第 2–3 階段：舊版判準建立",
    evidence: "第 4 階段：帶提示判定",
    transfer: "第 5 階段：遷移應用",
    done: "第 6 階段：診斷回饋",
  }
  return stage ? map[stage] ?? stage : "未記錄"
}

function severityTone(level: "strong" | "warn" | "info") {
  if (level === "strong") return "border-red-200 bg-red-50 text-red-900"
  if (level === "warn") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-blue-200 bg-blue-50 text-blue-900"
}

function supportTone(tone: SupportType["tone"]) {
  const map: Record<SupportType["tone"], string> = {
    green: "bg-green-100 text-green-700",
    yellow: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-700",
  }
  return map[tone]
}

function riskTone(level: StudentRow["riskLevel"] | string) {
  if (level === "高") return "bg-red-100 text-red-700"
  if (level === "中") return "bg-amber-100 text-amber-800"
  if (level === "低") return "bg-green-100 text-green-700"
  if (level === "未完成") return "bg-gray-100 text-gray-700"
  return "bg-slate-100 text-slate-700"
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

function MetricCard({ title, value, helper, warning }: { title: string; value: string; helper?: string; warning?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-500">{title}</div>
      <div className="mt-2 text-4xl font-black tracking-tight text-gray-900">{value}</div>
      {helper ? <div className="mt-2 text-xs leading-5 text-gray-500">{helper}</div> : null}
      {warning ? <div className="mt-2 text-xs leading-5 text-amber-700">{warning}</div> : null}
    </div>
  )
}

function BarRow({ label, value, total, colorClass = "bg-black" }: { label: string; value: number; total: number; colorClass?: string }) {
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

function featureQualityTotal(summary: FeatureQualitySummary) {
  return summary.high + summary.partial + summary.surfaceOrMisleading + summary.unclear
}

function dataReadiness(data: DashboardResponse) {
  const evidence = data.sampleBases.evidenceStudents
  const transfer = data.sampleBases.transferStudents

  if (evidence >= 10 && transfer >= 10) {
    return {
      label: "可作為班級教學調整依據",
      severity: "info" as const,
      body: "第 4 與第 5 階段已有足夠學生完成。以下結果可作為本班下一節課調整的初步依據。",
    }
  }

  if (evidence >= 5 && transfer >= 5) {
    return {
      label: "初步觀察，請謹慎解讀",
      severity: "warn" as const,
      body: "有效樣本已可觀察趨勢，但人數仍偏少。建議搭配教師課堂觀察，不宜直接視為全班定論。",
    }
  }

  return {
    label: "資料不足，先看完成度與進度",
    severity: "strong" as const,
    body: "目前第 4 或第 5 階段有效樣本不足 5 人。請先確認學生是否已完成核心任務，再解讀正確率或判準品質。",
  }
}

function classifySupport(student: StudentRow): SupportType {
  if (student.transferCount < 2 || student.evidenceCount < 2 || !student.isCompleted) {
    return {
      label: "資料不足型",
      tone: "gray",
      priority: 100,
      evidence: "學生尚未完成足夠的第 4／5 階段作答。",
      action: "先確認學生是否卡在流程、登入、閱讀題意或尚未完成任務。",
    }
  }

  if ((student.transferAccuracy ?? 1) < 0.34 || (student.sdi ?? 0) >= 0.34) {
    return {
      label: "優先支持型",
      tone: "red",
      priority: 90,
      evidence: "遷移應用表現偏弱，或離開提示後落差明顯。",
      action: "先安排 1–2 題無提示分類，要求學生先說判準，再選答案。",
    }
  }

  if ((student.structuralFeatureRate ?? 1) < 0.4) {
    return {
      label: "表面線索依賴型",
      tone: "yellow",
      priority: 80,
      evidence: "作答中較少使用結構性判準，可能仍依賴外觀、棲地或有殼等線索。",
      action: "安排外觀相似但門別不同的對比案例，例如蛤蠣 vs 螃蟹、蚯蚓 vs 海參。",
    }
  }

  if ((student.sdi ?? 0) >= 0.17) {
    return {
      label: "鷹架依賴型",
      tone: "blue",
      priority: 70,
      evidence: "第 4 階段與第 5 階段之間有落差，表示提示移除後穩定性不足。",
      action: "減少提示卡，改用學生自建判準表或同儕口頭說明。",
    }
  }

  if ((student.transferAccuracy ?? 0) >= 0.67 && (student.structuralFeatureRate ?? 0) >= 0.5) {
    return {
      label: "穩定掌握型",
      tone: "green",
      priority: 10,
      evidence: "遷移應用表現穩定，且較常使用結構性判準。",
      action: "可請學生擔任同儕說明者，重點是說明判準，而不是只提供答案。",
    }
  }

  return {
    label: "部分掌握型",
    tone: "blue",
    priority: 50,
    evidence: "目前未見明顯高風險訊號，但判準穩定性仍需觀察。",
    action: "請學生用一句話說明主要判準，再請同儕檢查是否能排除其他門別。",
  }
}

function teachingPriorityScore(q: QuestionMetric) {
  const wrongRate = q.accuracy == null ? 0 : 1 - q.accuracy
  const misleadingRate = q.surfaceOrMisleadingRate ?? 0
  const highConfidenceWrong = q.highConfidenceWrongRate ?? 0
  const respondentBoost = Math.min(q.respondents, 10) / 10
  return wrongRate * 45 + misleadingRate * 30 + highConfidenceWrong * 25 + respondentBoost * 5
}

function questionTeachingAction(q: QuestionMetric) {
  const animal = q.animalName ?? q.questionId
  const misleading = q.topMisleadingFeatures.length ? q.topMisleadingFeatures.join("、") : q.topWrongFeatures.join("、") || "尚無明顯共同線索"

  if ((q.highConfidenceWrongRate ?? 0) >= 0.2) {
    return `${animal} 適合做概念衝突題：學生不是單純不會，而是可能很確定地使用錯誤判準。可先呈現常見錯誤線索「${misleading}」，再請學生說明為什麼它不足以分類。`
  }

  if ((q.surfaceOrMisleadingRate ?? 0) >= 0.35) {
    return `${animal} 適合做對比教學：學生可能受到「${misleading}」影響。建議比較外觀相似但分類判準不同的物種。`
  }

  if ((q.accuracy ?? 1) <= 0.4) {
    return `${animal} 的正確率偏低。建議回到該門的核心判準，先讓學生列出可用判準與不可用線索。`
  }

  return `${animal} 可作為檢核題。建議請學生說明主要判準，確認不是猜對或只記得答案。`
}

function buildTopFindings(data: DashboardResponse): InsightCard[] {
  const totalFeature = featureQualityTotal(data.featureQualitySummary)
  const surfaceRate = totalFeature > 0 ? data.featureQualitySummary.surfaceOrMisleading / totalFeature : null
  const highRate = totalFeature > 0 ? data.featureQualitySummary.high / totalFeature : null
  const transferDrop = data.summary.sdi
  const topQuestion = [...data.questionMetrics].sort((a, b) => teachingPriorityScore(b) - teachingPriorityScore(a))[0]
  const topMisconception = data.misconceptionMetrics[0]

  const cards: InsightCard[] = []

  if (surfaceRate != null && surfaceRate >= 0.3) {
    cards.push({
      title: "主要問題：學生仍容易依賴表面線索",
      severity: "strong",
      body: `目前約 ${pct(surfaceRate)} 的特徵選擇屬於表面或誤導線索。這表示部分學生可能還在用外觀、棲地、身體形狀或有殼等線索分類，而不是使用結構性判準。`,
    })
  } else if (highRate != null && highRate >= 0.45) {
    cards.push({
      title: "目前優勢：已有學生開始使用高品質判準",
      severity: "info",
      body: `目前約 ${pct(highRate)} 的特徵選擇屬於高品質判準。下一步可讓學生練習用這些判準排除相似但不同門別的動物。`,
    })
  } else {
    cards.push({
      title: "主要觀察：分類判準仍在建立中",
      severity: "warn",
      body: "目前高品質判準與表面線索都尚未形成穩定趨勢。建議先看第 4／5 階段落差與最需要重教的題目。",
    })
  }

  if (transferDrop != null && transferDrop >= 0.2) {
    cards.push({
      title: "遷移落差：有提示會做，離開提示後失準",
      severity: "warn",
      body: `第 4 階段正確率為 ${pct(data.summary.evidenceAccuracy)}，第 5 階段為 ${pct(data.summary.transferAccuracy)}。這表示學生可能能在提示卡輔助下判斷，但尚未穩定內化成可遷移的分類判準。`,
    })
  } else {
    cards.push({
      title: "遷移表現：目前未見明顯整班落差",
      severity: "info",
      body: `第 4 階段與第 5 階段差距目前為 ${num(transferDrop, 2)}。若樣本數足夠，可進一步看個別學生是否仍有鷹架依賴。`,
    })
  }

  if (topQuestion) {
    cards.push({
      title: "優先重教題目：先處理最有教學價值的錯誤",
      severity: "warn",
      body: `${stageLabel(topQuestion.stage)}｜${topQuestion.animalName ?? topQuestion.questionId}：正確率 ${pct(topQuestion.accuracy)}，表面／誤導線索比例 ${pct(topQuestion.surfaceOrMisleadingRate)}，高信心錯誤比例 ${pct(topQuestion.highConfidenceWrongRate)}。建議先用這題做全班討論。`,
    })
  } else if (topMisconception) {
    cards.push({
      title: "優先釐清線索：先處理最常造成誤判的特徵",
      severity: topMisconception.cueType === "表面線索" ? "strong" : "warn",
      body: `${topMisconception.feature} 在錯誤作答中出現 ${topMisconception.wrongCount} 次，涉及 ${topMisconception.wrongStudentCount} 位學生。建議直接討論這個線索何時可用、何時不可用。`,
    })
  }

  return cards.slice(0, 3)
}

function nextLessonSuggestions(data: DashboardResponse) {
  const topQuestion = [...data.questionMetrics].sort((a, b) => teachingPriorityScore(b) - teachingPriorityScore(a))[0]
  const topFeature = data.misconceptionMetrics[0]
  const transferDrop = data.summary.sdi ?? 0
  const featureText = topFeature?.feature ?? "有殼、身體細長、水中生活等表面線索"
  const animal = topQuestion?.animalName ?? "本班錯誤率較高的題目"

  return [
    {
      title: "5 分鐘快速回饋",
      body: `投影或口頭呈現「${animal}」，請學生先說出一個可用判準與一個不可用線索。特別追問「${featureText}」為什麼可能誤導。`,
    },
    {
      title: "15 分鐘小組活動",
      body: "每組比較兩個外觀相似但門別不同的動物，列出：可用判準、不可用線索、排除其他門別的理由。重點不是答對，而是說明判準。",
    },
    {
      title: "下一堂課補強重點",
      body:
        transferDrop >= 0.2
          ? "先做無提示遷移練習。請學生不看提示卡，先寫分類判準，再選答案。"
          : "先補強分類判準的診斷性：外骨骼 vs 外套膜、體節 vs 身體細長、管足／棘皮 vs 水中生活。",
    },
  ]
}

function useTeacherDecisionData(data: DashboardResponse | null) {
  return useMemo(() => {
    if (!data) return null

    const readiness = dataReadiness(data)
    const topFindings = buildTopFindings(data)
    const priorityQuestions = [...data.questionMetrics]
      .filter((q) => q.respondents >= 2)
      .sort((a, b) => teachingPriorityScore(b) - teachingPriorityScore(a))
      .slice(0, 5)
      .map((q) => ({ ...q, teachingAction: questionTeachingAction(q), priorityScore: teachingPriorityScore(q) }))

    const supportStudents = data.studentRows
      .map((student) => ({ student, support: classifySupport(student) }))
      .sort((a, b) => b.support.priority - a.support.priority)
      .slice(0, 12)

    const supportCounts = data.studentRows.reduce<Record<string, number>>((acc, student) => {
      const support = classifySupport(student).label
      acc[support] = (acc[support] ?? 0) + 1
      return acc
    }, {})

    return {
      readiness,
      topFindings,
      priorityQuestions,
      supportStudents,
      supportCounts,
      suggestions: nextLessonSuggestions(data),
    }
  }, [data])
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
      <div className="mt-2 text-3xl font-black tracking-tight text-gray-900">
        {value}
      </div>
      {helper ? (
        <div className="mt-2 text-xs leading-5 text-gray-500">{helper}</div>
      ) : null}
      {note ? (
        <div className="mt-1 text-xs leading-5 text-amber-700">{note}</div>
      ) : null}
    </div>
  )
}

export default function TeacherDecisionPage() {
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS)
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [authRequired, setAuthRequired] = useState(false)
  const [teacherIdentifier, setTeacherIdentifier] = useState("")
  const [teacherPassword, setTeacherPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [teacherInfo, setTeacherInfo] = useState<DashboardResponse["teacher"] | null>(null)
  const [qualitative, setQualitative] = useState<QualitativeResponse | null>(null)
  const [qualitativeLoading, setQualitativeLoading] = useState(false)
  const [qualitativeError, setQualitativeError] = useState("")

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.schoolCode) params.set("schoolCode", filters.schoolCode)
    if (filters.grade) params.set("grade", filters.grade)
    if (filters.className) params.set("className", filters.className)
    if (filters.userRole) params.set("userRole", filters.userRole)
    if (filters.useContext) params.set("useContext", filters.useContext)
    if (filters.animalClassificationExperience) params.set("animalClassificationExperience", filters.animalClassificationExperience)
    if (filters.participantCode) params.set("participantCode", filters.participantCode)
    if (filters.currentStage) params.set("currentStage", filters.currentStage)
    if (filters.completedOnly) params.set("completedOnly", "true")
    if (filters.riskOnly) params.set("riskOnly", "true")
    return params.toString()
  }, [filters])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError("")
      try {
        const response = await fetch(`/api/teacher-dashboard?${queryString}`, { cache: "no-store" })
        const result = await response.json()

        if (response.status === 401) {
          if (!cancelled) {
            setAuthRequired(true)
            setTeacherInfo(null)
            setData(null)
            setError("")
          }
          return
        }

        if (!response.ok) throw new Error(result?.error || "讀取教師分析頁資料失敗")

        if (!cancelled) {
          setAuthRequired(false)
          setTeacherInfo(result?.teacher ?? null)
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "未知錯誤")
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


  useEffect(() => {
    let cancelled = false

    async function run() {
      setQualitativeLoading(true)
      setQualitativeError("")
      try {
        const response = await fetch(`/api/teacher-qualitative?${queryString}`, { cache: "no-store" })

        if (response.status === 401) {
          if (!cancelled) setQualitative(null)
          return
        }

        const result = await response.json()
        if (!response.ok) throw new Error(result?.error || "讀取質性資料失敗")

        if (!cancelled) setQualitative(result)
      } catch (err) {
        if (!cancelled) {
          setQualitativeError(err instanceof Error ? err.message : "質性資料讀取失敗")
          setQualitative(null)
        }
      } finally {
        if (!cancelled) setQualitativeLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [queryString])

  async function handleTeacherLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginLoading(true)
    setError("")

    try {
      const response = await fetch("/api/teacher-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: teacherIdentifier, password: teacherPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || "教師登入失敗")
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "教師登入失敗")
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleTeacherLogout() {
    await fetch("/api/teacher-logout", { method: "POST" })
    window.location.reload()
  }

  const decision = useTeacherDecisionData(data)
  const featureTotal = data ? featureQualityTotal(data.featureQualitySummary) : 0

  if (authRequired) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black tracking-tight text-gray-900">教師診斷頁登入</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">請使用教師帳號登入。一般教師只能查看已授權班級；super teacher 可查看所有班級。</p>

          <form onSubmit={handleTeacherLogin} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">教師帳號</label>
              <input
                value={teacherIdentifier}
                onChange={(event) => setTeacherIdentifier(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                placeholder="例如 teacher001"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">密碼</label>
              <input
                type="password"
                value={teacherPassword}
                onChange={(event) => setTeacherPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                placeholder="請輸入密碼"
                autoComplete="current-password"
              />
            </div>
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
            <button type="submit" disabled={loginLoading} className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300">
              {loginLoading ? "登入中…" : "登入教師診斷頁"}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Sci-Flipper</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-gray-900">教師形成性診斷頁</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                本頁的重點不是排名學生，而是協助教師判斷下一節課該補哪一個分類判準、哪幾題最值得重新教、哪些學生需要不同型態的支持。
              </p>
            </div>

            <div className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600 lg:max-w-md">
              {teacherInfo ? (
                <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="font-bold text-gray-900">{teacherInfo.displayName}</div>
                  <div className="text-xs leading-5 text-gray-500">
                    {teacherInfo.isSuperAdmin ? "權限：可查看全部學校與班級" : `可查看班級：${teacherInfo.authorizedClasses.map((item) => `${item.schoolCode} ${item.className}`).join("、") || "尚未設定"}`}
                  </div>
                </div>
              ) : null}
              <div>目前篩選後學生數：<span className="font-bold text-gray-900">{data?.summary.totalStudents ?? "—"}</span></div>
              <div>learning_records：{data?.counts.records ?? "—"}｜item_logs：{data?.counts.itemLogs ?? "—"}｜event_logs：{data?.counts.eventLogs ?? "—"}</div>
              <div className="mt-2 text-xs leading-5 text-amber-700">若樣本偏少，請先看完成度與進度，不宜直接下全班結論。</div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-gray-900">教師工具</div>
              <div className="mt-1 text-xs leading-5 text-gray-500">管理名單、重新整理資料，或在共用電腦上登出。</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/teacher/roster" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">學生名單管理</a>
              <button type="button" onClick={() => window.location.reload()} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">重新整理</button>
              <button type="button" onClick={handleTeacherLogout} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">登出</button>
            </div>
          </div>
        </section>

        <Section title="篩選條件" subtitle="建議先選定單一班級，再解讀班級診斷。super teacher 若看全部學校，請先縮小範圍。">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select value={filters.schoolCode} onChange={(event) => setFilters((prev) => ({ ...prev, schoolCode: event.target.value, className: "" }))} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
              <option value="">全部學校</option>
              {data?.filters.schoolCodes.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={filters.grade} onChange={(event) => setFilters((prev) => ({ ...prev, grade: event.target.value }))} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
              <option value="">全部年級</option>
              {data?.filters.grades.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={filters.className} onChange={(event) => setFilters((prev) => ({ ...prev, className: event.target.value }))} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
              <option value="">全部班級</option>
              {data?.filters.classNames.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={filters.userRole} onChange={(event) => setFilters((prev) => ({ ...prev, userRole: event.target.value }))} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
              <option value="">全部身分</option>
              {data?.filters.userRoles.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={filters.useContext} onChange={(event) => setFilters((prev) => ({ ...prev, useContext: event.target.value }))} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
              <option value="">全部使用情境</option>
              {data?.filters.useContexts.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={filters.animalClassificationExperience} onChange={(event) => setFilters((prev) => ({ ...prev, animalClassificationExperience: event.target.value }))} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
              <option value="">全部學習經驗</option>
              {data?.filters.animalClassificationExperiences.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={filters.currentStage} onChange={(event) => setFilters((prev) => ({ ...prev, currentStage: event.target.value }))} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
              <option value="">全部階段</option>
              {data?.filters.stages.map((value) => <option key={value} value={value}>{stageLabel(value)}</option>)}
            </select>
            <input value={filters.participantCode} onChange={(event) => setFilters((prev) => ({ ...prev, participantCode: event.target.value }))} placeholder="搜尋 participant_code" className="rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 xl:col-span-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.completedOnly} onChange={(event) => setFilters((prev) => ({ ...prev, completedOnly: event.target.checked }))} />只看已完成</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filters.riskOnly} onChange={(event) => setFilters((prev) => ({ ...prev, riskOnly: event.target.checked }))} />只看需優先支持</label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setFilters(INITIAL_FILTERS)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">清除篩選</button>
          </div>
        </Section>

        {loading ? <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-600 shadow-sm">讀取教師診斷資料中…</div> : null}
        {error ? <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700 shadow-sm">{error}</div> : null}

        {!loading && !error && data && decision ? (
          <>
            <Section title="資料可解讀程度" subtitle="先判斷目前樣本能不能支持教學決策，再看正確率與題目診斷。">
              <div className={`rounded-2xl border p-4 ${severityTone(decision.readiness.severity)}`}>
                <div className="text-lg font-black">{decision.readiness.label}</div>
                <p className="mt-2 text-sm leading-6">{decision.readiness.body}</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard title="進入任務學生" value={countLabel(data.summary.totalStudents)} helper="目前篩選條件下的學生數" />
                <MetricCard title="完成全流程" value={pct(data.summary.completionRate)} helper={`${data.summary.completedStudents}/${data.summary.totalStudents} 人`} />
                <MetricCard title="第 4 階段有效樣本" value={countLabel(data.sampleBases.evidenceStudents)} helper={`${data.sampleBases.evidenceItems} 題作答紀錄`} />
                <MetricCard title="第 5 階段有效樣本" value={countLabel(data.sampleBases.transferStudents)} helper={`${data.sampleBases.transferItems} 題作答紀錄`} />
                <MetricCard title="平均理由長度" value={num(data.summary.avgReasonCharCount, 0)} helper="理由越長不必然越好，但可作為投入與說理觀察" />
              </div>
              {data.sampleWarnings.length ? (
                <div className="mt-4 space-y-2">
                  {data.sampleWarnings.map((warning) => (
                    <div key={warning.key} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning.message}</div>
                  ))}
                </div>
              ) : null}
            </Section>

            <Section title="本班三個重要發現" subtitle="將資料轉成下一節課可使用的診斷語言。">
              <div className="grid gap-3 lg:grid-cols-3">
                {decision.topFindings.map((card) => (
                  <div key={card.title} className={`rounded-2xl border p-4 ${severityTone(card.severity)}`}>
                    <div className="text-base font-black">{card.title}</div>
                    <p className="mt-2 text-sm leading-6">{card.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="第 4 階段 vs 第 5 階段" subtitle="判斷學生是在提示下會做，還是真的能把分類判準遷移到新題目。">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">指標</th>
                      <th className="px-3 py-2">第 4 階段：帶提示判定</th>
                      <th className="px-3 py-2">第 5 階段：遷移應用</th>
                      <th className="px-3 py-2">教師解讀</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-gray-50 align-top">
                      <td className="rounded-l-2xl px-3 py-3 font-semibold">正確率</td>
                      <td className="px-3 py-3">{pct(data.summary.evidenceAccuracy)}</td>
                      <td className="px-3 py-3">{pct(data.summary.transferAccuracy)}</td>
                      <td className="rounded-r-2xl px-3 py-3 text-gray-600">{(data.summary.sdi ?? 0) >= 0.2 ? "離開提示後下降，建議做無提示判準練習。" : "目前未見明顯整班遷移落差，可看個別學生。"}</td>
                    </tr>
                    <tr className="bg-gray-50 align-top">
                      <td className="rounded-l-2xl px-3 py-3 font-semibold">平均耗時</td>
                      <td className="px-3 py-3">{num(data.summary.avgEvidenceDurationSec)} 秒</td>
                      <td className="px-3 py-3">{num(data.summary.avgTransferDurationSec)} 秒</td>
                      <td className="rounded-r-2xl px-3 py-3 text-gray-600">耗時偏長不一定是壞事，需搭配正確率與理由品質判斷。</td>
                    </tr>
                    <tr className="bg-gray-50 align-top">
                      <td className="rounded-l-2xl px-3 py-3 font-semibold">判準品質</td>
                      <td className="px-3 py-3" colSpan={2}>高品質 {data.featureQualitySummary.high}｜部分掌握 {data.featureQualitySummary.partial}｜表面／誤導 {data.featureQualitySummary.surfaceOrMisleading}｜不明確 {data.featureQualitySummary.unclear}</td>
                      <td className="rounded-r-2xl px-3 py-3 text-gray-600">共 {featureTotal} 筆特徵判準紀錄，請優先處理表面／誤導線索。</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="題目診斷：最需要重新教的題目" subtitle="不是只看錯誤率，而是綜合表面線索、高信心錯誤與作答人數來排序。">
              {decision.priorityQuestions.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">目前沒有足夠的題目層級資料。</div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {decision.priorityQuestions.map((q) => (
                    <div key={q.key} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-lg font-black text-gray-900">{q.animalName ?? q.questionId}</div>
                          <div className="text-xs text-gray-500">{stageLabel(q.stage)}｜作答人數 {q.respondents}</div>
                        </div>
                        <span className="rounded-full bg-black px-2 py-1 text-xs font-bold text-white">教學優先度 {num(q.priorityScore, 0)}</span>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                        <div className="rounded-xl bg-gray-50 p-3">正確率<br /><span className="font-black">{pct(q.accuracy)}</span></div>
                        <div className="rounded-xl bg-gray-50 p-3">表面／誤導<br /><span className="font-black">{pct(q.surfaceOrMisleadingRate)}</span></div>
                        <div className="rounded-xl bg-gray-50 p-3">高信心錯誤<br /><span className="font-black">{pct(q.highConfidenceWrongRate)}</span></div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-700">{q.teachingAction}</p>
                      <div className="mt-2 text-xs leading-5 text-gray-500">常見錯答：{q.topWrongAnswers.join("、") || "尚無"}｜常見誤用特徵：{q.topMisleadingFeatures.join("、") || q.topWrongFeatures.join("、") || "尚無"}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="質性資料分析：學生如何說明分類判準" subtitle="從學生理由與排除理由中，辨識是否真的能用判準說明，而不只是選到答案。">
              {qualitativeLoading ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">質性資料讀取中…</div>
              ) : qualitativeError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{qualitativeError}</div>
              ) : !qualitative ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">目前沒有可分析的理由文字資料。</div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <SummaryCard title="有理由文字" value={`${qualitative.summary.reasonCount}`} helper={`共 ${qualitative.summary.itemLogCount} 筆題目作答`} />
                    <SummaryCard title="有排除理由" value={`${qualitative.summary.exclusionReasonCount}`} helper="可看學生是否能排除相似門別" />
                    <SummaryCard title="理由過短比例" value={pct(qualitative.summary.shortReasonRate)} helper="理由太短時，不宜過度解讀為判準掌握" />
                    <SummaryCard title="表面語彙比例" value={pct(qualitative.summary.surfaceReasonRate)} helper="如外觀、有殼、水中、細長等詞彙" />
                    <SummaryCard title="高信心錯誤理由" value={`${qualitative.summary.highConfidenceWrongReasonCount}`} helper="很有把握但錯誤，最適合做概念衝突討論" />
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {qualitative.patterns.map((pattern) => (
                      <div key={pattern.key} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-black text-gray-900">{pattern.label}</div>
                            <p className="mt-1 text-sm leading-6 text-gray-600">{pattern.description}</p>
                          </div>
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">
                            {pattern.count} 筆｜{pct(pattern.rate)}
                          </span>
                        </div>
                        {pattern.examples.length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {pattern.examples.slice(0, 2).map((example, index) => (
                              <blockquote key={`${pattern.key}-${index}`} className="rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                                「{example}」
                              </blockquote>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-lg font-black text-gray-900">最值得追問的學生理由</div>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      下列例子已去除完整姓名，只提供座號或遮罩姓名。建議教師將其作為課堂討論素材，而不是作為個別評價。
                    </p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {qualitative.examples.slice(0, 6).map((example) => (
                        <div key={example.key} className="rounded-2xl border border-gray-200 bg-white p-4 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="font-bold text-gray-900">{example.animalName ?? example.questionId}｜{stageLabel(example.stage)}</div>
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{example.studentLabel}</span>
                          </div>
                          <div className="mt-2 text-xs leading-5 text-gray-500">
                            作答：{example.finalAnswer ?? "未記錄"}｜信心：{example.confidence ?? "—"}｜判準：{example.primaryFeature ?? "未記錄"}
                          </div>
                          {example.reasonText ? <blockquote className="mt-2 rounded-xl bg-gray-50 p-3 leading-6 text-gray-700">理由：「{example.reasonText}」</blockquote> : null}
                          {example.exclusionReasonText ? <blockquote className="mt-2 rounded-xl bg-gray-50 p-3 leading-6 text-gray-700">排除理由：「{example.exclusionReasonText}」</blockquote> : null}
                          <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{example.interpretation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Section>

            <Section title="學生支持類型" subtitle="用中性支持語言取代高風險標籤，協助教師分組與追問。">
              <div className="mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-5">
                {Object.entries(decision.supportCounts).map(([label, count]) => (
                  <div key={label} className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-sm">
                    <div className="font-bold text-gray-900">{label}</div>
                    <div className="mt-1 text-2xl font-black">{count}</div>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">學生</th>
                      <th className="px-3 py-2">支持類型</th>
                      <th className="px-3 py-2">主要依據</th>
                      <th className="px-3 py-2">建議教師行動</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decision.supportStudents.map(({ student, support }, index) => (
                      <tr key={`${student.participantCode}-${student.seatNo ?? 'x'}-${support.label}-${index}`} className="bg-gray-50 align-top">
                        <td className="rounded-l-2xl px-3 py-3">
                          <div className="font-semibold text-gray-900">{student.seatNo ? `${student.seatNo} 號` : "未記座號"} {student.maskedName || "未具名"}</div>
                          <div className="text-xs text-gray-500">{student.participantCode}</div>
                        </td>
                        <td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${supportTone(support.tone)}`}>{support.label}</span></td>
                        <td className="px-3 py-3 text-gray-700">{support.evidence}</td>
                        <td className="rounded-r-2xl px-3 py-3 text-gray-700">{support.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="下一節課可以怎麼做" subtitle="把診斷結果轉成可在教室中執行的行動。">
              <div className="grid gap-3 lg:grid-cols-3">
                {decision.suggestions.map((suggestion) => (
                  <div key={suggestion.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-lg font-black text-gray-900">{suggestion.title}</div>
                    <p className="mt-2 text-sm leading-6 text-gray-700">{suggestion.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="補充檢查：階段分布與線索概況" subtitle="供教師判斷資料是否集中在某一階段，或某些線索是否被過度使用。">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="mb-3 font-bold text-gray-900">學生目前所在階段</div>
                  <div className="space-y-3">
                    {data.stageFunnel.map((bucket) => <BarRow key={bucket.stage} label={stageLabel(bucket.stage)} value={bucket.count} total={data.summary.totalStudents} />)}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="mb-3 font-bold text-gray-900">最需要釐清的線索</div>
                  <div className="space-y-3">
                    {data.featureMetrics.slice(0, 6).map((feature) => (
                      <div key={feature.feature} className="rounded-xl bg-gray-50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-gray-900">{feature.feature}</div>
                          <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-600">{feature.cueType}</span>
                        </div>
                        <div className="mt-1 text-xs leading-5 text-gray-500">被選 {feature.selectedCount} 次，選到時正確率 {pct(feature.correctRateWhenSelected)}，錯用率 {pct(feature.wrongSelectionRate)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </>
        ) : null}
      </div>
    </main>
  )
}
