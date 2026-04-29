import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getTeacherAuthFromRequest,
  recordMatchesTeacherAssignments,
} from '../../../lib/teacherAuth'

export const dynamic = 'force-dynamic'

type JsonRecord = Record<string, unknown>

type LearningRecordRow = {
  id: string
  participant_code: string
  school_code: string | null
  grade: string | null
  class_name: string | null
  seat_no: string | null
  masked_name: string | null
  current_stage: string | null
  is_completed: boolean | null
  payload: JsonRecord | null
  updated_at: string | null
}

type LearningItemLogRow = {
  record_id: string
  participant_code: string
  stage: 'evidence' | 'transfer'
  question_id: string
  animal_name: string | null
  entered_at: string | null
  submitted_at: string | null
  duration_ms: number | null
  final_answer: string | null

  selected_features: string[] | null
  selected_features_count: number | null
  feature_selection_order?: string[] | null

  primary_feature?: string | null
  secondary_features?: string[] | null
  feature_options_shown?: string[] | null
  feature_option_order?: string[] | null
  random_seed?: string | null
  max_selectable_features?: number | null
  feature_option_version?: string | null

  reason_text: string | null
  reason_char_count: number | null
  exclusion_reason_text?: string | null
  exclusion_reason_char_count?: number | null

  confidence: number | null
  familiarity?: number | null
  learned_before?: string | null

  is_correct: boolean | null
  criterion_quality?: string | null
  diagnostic_hit_count?: number | null
  acceptable_hit_count?: number | null
  auxiliary_count?: number | null
  misleading_count?: number | null
  high_confidence_error?: boolean | null
  scoring_rubric_version?: string | null

  primaryHitCount?: number
  acceptableHitCount?: number
  supportingHitCount?: number
  misleadingHitCount?: number
  selectedPrimaryFeatures?: string[]
  selectedAcceptableFeatures?: string[]
  selectedSupportingFeatures?: string[]
  selectedMisleadingFeatures?: string[]
  featureQuality?: 'high' | 'partial' | 'surface_or_misleading' | 'unclear'
}

type LearningEventLogRow = {
  record_id: string
  participant_code: string
  stage: string
  question_id: string | null
  event_type: string
  event_value: Record<string, unknown> | null
  client_ts: string | null
  server_ts: string | null
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

type MisconceptionAccumulator = MisconceptionMetric & {
  _students: Set<string>
  _questions: Set<string>
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

type SampleWarning = {
  key: string
  level: 'warn' | 'info'
  message: string
}

type FiltersResponse = {
  schoolCodes: string[]
  grades: string[]
  classNames: string[]
  userRoles: string[]
  useContexts: string[]
  animalClassificationExperiences: string[]
  stages: string[]
}

type DashboardResponse = {
  ok: true
  filters: FiltersResponse
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
  featureQualitySummary: {
    high: number
    partial: number
    surfaceOrMisleading: number
    unclear: number
  }
  averagePrimaryHitCount: number
  averageMisleadingHitCount: number
  insightCards: InsightCard[]
  counts: {
    records: number
    itemLogs: number
    eventLogs: number
  }
}

const STRUCTURAL_FEATURES = new Set([
  '刺絲胞',
  '觸手',
  '輻射對稱',
  '袋狀身體',
  '身體扁平',
  '左右對稱',
  '無體節',
  '外套膜',
  '肌肉足',
  '身體柔軟',
  '身體分節',
  '環狀體節',
  '外骨骼',
  '成對附肢',
  '附肢有關節',
  '棘皮',
  '管足',
  '成體輻射對稱',
])

const SURFACE_FEATURES = new Set([
  '多數有殼',
  '外表有殼或硬殼',
  '身體細長',
  '固著生活',
  '水中生活',
  '海水中生活',
  '寄生生活',
])

type FeatureRubric = {
  primary: string[]
  acceptable: string[]
  supporting: string[]
  misleading: string[]
}

const QUESTION_FEATURE_RUBRICS: Record<string, FeatureRubric> = {
  海葵: {
    primary: ['刺絲胞', '觸手'],
    acceptable: ['輻射對稱', '袋狀身體'],
    supporting: ['固著生活', '水中生活'],
    misleading: ['外表有殼或硬殼', '左右對稱'],
  },
  水母: {
    primary: ['刺絲胞', '觸手'],
    acceptable: ['輻射對稱', '袋狀身體'],
    supporting: ['水中生活', '身體柔軟'],
    misleading: ['外骨骼', '左右對稱'],
  },
  珊瑚: {
    primary: ['刺絲胞', '觸手'],
    acceptable: ['輻射對稱', '袋狀身體'],
    supporting: ['固著生活', '水中生活'],
    misleading: ['外表有殼或硬殼', '左右對稱'],
  },

  渦蟲: {
    primary: ['身體扁平', '無體節'],
    acceptable: ['左右對稱'],
    supporting: ['身體細長', '身體柔軟'],
    misleading: ['身體分節', '環狀體節', '寄生生活'],
  },
  中華肝吸蟲: {
    primary: ['身體扁平', '無體節'],
    acceptable: ['左右對稱'],
    supporting: ['寄生生活', '身體細長'],
    misleading: ['身體分節', '環狀體節', '外骨骼'],
  },

  蛤蠣: {
    primary: ['外套膜', '肌肉足'],
    acceptable: ['身體柔軟'],
    supporting: ['多數有殼', '外表有殼或硬殼'],
    misleading: ['外骨骼', '身體分節', '成對附肢'],
  },
  蝸牛: {
    primary: ['外套膜', '肌肉足'],
    acceptable: ['身體柔軟'],
    supporting: ['多數有殼', '外表有殼或硬殼'],
    misleading: ['外骨骼', '身體分節', '成對附肢'],
  },
  中華槍烏賊: {
    primary: ['外套膜', '身體柔軟'],
    acceptable: ['肌肉足'],
    supporting: ['水中生活'],
    misleading: ['觸手', '外骨骼', '成對附肢', '多數有殼'],
  },

  蚯蚓: {
    primary: ['身體分節', '環狀體節'],
    acceptable: ['身體細長'],
    supporting: ['身體柔軟'],
    misleading: ['無體節', '外骨骼', '成對附肢', '身體扁平'],
  },
  水蛭: {
    primary: ['身體分節', '環狀體節'],
    acceptable: ['身體細長'],
    supporting: ['身體柔軟'],
    misleading: ['無體節', '外骨骼', '成對附肢', '身體扁平'],
  },
  海邊分節小動物: {
    primary: ['身體分節', '環狀體節'],
    acceptable: ['身體細長'],
    supporting: ['海水中生活'],
    misleading: ['無體節', '外骨骼', '成對附肢', '棘皮'],
  },

  蝴蝶: {
    primary: ['外骨骼', '附肢有關節'],
    acceptable: ['身體分節', '成對附肢'],
    supporting: [],
    misleading: ['多數有殼', '外表有殼或硬殼', '身體柔軟', '觸手'],
  },
  蜘蛛: {
    primary: ['外骨骼', '附肢有關節'],
    acceptable: ['身體分節', '成對附肢'],
    supporting: [],
    misleading: ['多數有殼', '外表有殼或硬殼', '身體柔軟', '觸手'],
  },
  螃蟹: {
    primary: ['外骨骼', '附肢有關節'],
    acceptable: ['身體分節', '成對附肢'],
    supporting: ['海水中生活', '外表有殼或硬殼'],
    misleading: ['多數有殼', '肌肉足'],
  },
  蝦子: {
    primary: ['外骨骼', '附肢有關節'],
    acceptable: ['身體分節', '成對附肢'],
    supporting: ['水中生活', '海水中生活', '外表有殼或硬殼'],
    misleading: ['多數有殼', '肌肉足'],
  },

  海星: {
    primary: ['棘皮', '管足'],
    acceptable: ['成體輻射對稱'],
    supporting: ['海水中生活'],
    misleading: ['外骨骼', '身體分節', '成對附肢'],
  },
  海膽: {
    primary: ['棘皮', '管足'],
    acceptable: ['成體輻射對稱'],
    supporting: ['海水中生活', '外表有殼或硬殼'],
    misleading: ['外骨骼', '成對附肢'],
  },
  海參: {
    primary: ['棘皮', '管足'],
    acceptable: [],
    supporting: ['海水中生活'],
    misleading: ['身體細長', '身體分節', '環狀體節', '身體柔軟'],
  },
}

const STAGE_KEYS = ['stage1', 'reflection', 'guide', 'evidence', 'transfer', 'done', 'awareness']

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (filtered.length === 0) return null
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length
}

function median(values: Array<number | null | undefined>) {
  const filtered = values
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .sort((a, b) => a - b)
  if (filtered.length === 0) return null
  const mid = Math.floor(filtered.length / 2)
  return filtered.length % 2 === 0 ? (filtered[mid - 1] + filtered[mid]) / 2 : filtered[mid]
}

function ratio(numerator: number, denominator: number) {
  if (!denominator) return null
  return numerator / denominator
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function normalizeFeatureName(feature: unknown) {
  if (typeof feature !== 'string') return ''

  const raw = feature.trim()

  const map: Record<string, string> = {
    柔軟身體: '身體柔軟',
    身體柔軟不分節: '身體柔軟',

    成體多呈五輻對稱: '成體輻射對稱',
    成體多為五輻對稱: '成體輻射對稱',
    五輻對稱: '成體輻射對稱',
    五輻對稱特徵: '成體輻射對稱',

    有外骨骼: '外骨骼',
    具有外骨骼: '外骨骼',

    外表有殼: '外表有殼或硬殼',
    有沒有殼: '外表有殼或硬殼',

    生活在水中: '水中生活',
    住在海邊: '海水中生活',
    固著不動: '固著生活',
    皆為寄生蟲: '寄生生活',

    腳很多: '成對附肢',
    足分節且有關節: '附肢有關節',

    頭足類腕足: '肌肉足',
    棘皮動物特徵: '棘皮',
  }

  return map[raw] ?? raw
}

function normalizeFeatures(features: unknown[]) {
  return features.map(normalizeFeatureName).filter(Boolean)
}

function getFeatureRubric(animalName: string): FeatureRubric {
  return (
    QUESTION_FEATURE_RUBRICS[animalName] ?? {
      primary: [],
      acceptable: [],
      supporting: [],
      misleading: [],
    }
  )
}

function analyzeSelectedFeatureQuality(animalName: string, selectedFeatures: unknown[]) {
  const rubric = getFeatureRubric(animalName)
  const selected = normalizeFeatures(selectedFeatures)

  const primaryHitCount = selected.filter((feature) =>
    rubric.primary.includes(feature)
  ).length

  const acceptableHitCount = selected.filter((feature) =>
    rubric.acceptable.includes(feature)
  ).length

  const supportingHitCount = selected.filter((feature) =>
    rubric.supporting.includes(feature)
  ).length

  const misleadingHitCount = selected.filter((feature) =>
    rubric.misleading.includes(feature)
  ).length

  const selectedPrimaryFeatures = selected.filter((feature) =>
    rubric.primary.includes(feature)
  )

  const selectedAcceptableFeatures = selected.filter((feature) =>
    rubric.acceptable.includes(feature)
  )

  const selectedSupportingFeatures = selected.filter((feature) =>
    rubric.supporting.includes(feature)
  )

  const selectedMisleadingFeatures = selected.filter((feature) =>
    rubric.misleading.includes(feature)
  )

  let featureQuality:
    | 'high'
    | 'partial'
    | 'surface_or_misleading'
    | 'unclear' = 'unclear'

  if (primaryHitCount >= 1 && misleadingHitCount === 0) {
    featureQuality = 'high'
  } else if (primaryHitCount + acceptableHitCount >= 1 && misleadingHitCount <= 1) {
    featureQuality = 'partial'
  } else if (misleadingHitCount >= 1 && primaryHitCount === 0) {
    featureQuality = 'surface_or_misleading'
  }

  return {
    selectedFeatures: selected,
    primaryHitCount,
    acceptableHitCount,
    supportingHitCount,
    misleadingHitCount,
    selectedPrimaryFeatures,
    selectedAcceptableFeatures,
    selectedSupportingFeatures,
    selectedMisleadingFeatures,
    featureQuality,
  }
}

function mapCriterionQuality(value: unknown): LearningItemLogRow['featureQuality'] | null {
  if (value === 'high_quality' || value === 'high') return 'high'
  if (value === 'partial_mastery' || value === 'partial') return 'partial'
  if (value === 'surface_or_misleading') return 'surface_or_misleading'
  if (value === 'unclear') return 'unclear'
  return null
}

function normalizeItemLogFeatures(item: LearningItemLogRow) {
  const fromSelected = Array.isArray(item.selected_features)
    ? item.selected_features
    : []

  const fromPrimary =
    typeof item.primary_feature === 'string' && item.primary_feature.trim().length > 0
      ? [item.primary_feature]
      : []

  const fromSecondary = Array.isArray(item.secondary_features)
    ? item.secondary_features
    : []

  return normalizeFeatures([...fromPrimary, ...fromSecondary, ...fromSelected])
}

function cueType(feature: string): FeatureMetric['cueType'] {
  const normalized = normalizeFeatureName(feature)

  if (STRUCTURAL_FEATURES.has(normalized)) return '結構線索'
  if (SURFACE_FEATURES.has(normalized)) return '表面線索'
  return '待分類'
}

function toArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function toObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parsePayloadInfo(payload: JsonRecord | null) {
  const stage1 = toObject(payload?.stage1)
  const legacyAwareness = toObject(payload?.awareness)
  const reflection = toObject(payload?.reflection)
  const guide = toObject(payload?.guide)
  const awareness = {
    ...(reflection ?? {}),
    ...(guide ?? {}),
    ...(legacyAwareness ?? {}),
  } as JsonRecord
  const stage1Groups = toArray(stage1?.groups)
    .map((group) => toObject(group))
    .filter(Boolean) as JsonRecord[]
  const nonEmptyGroups = stage1Groups.filter((group) => toArray(group.cardIds).length > 0)
  const overallReason = safeString(stage1?.overallReason) ?? ''

  const diagnosticFeatures = normalizeFeatures(toArray(awareness?.diagnosticFeatures))
  const possibleFeatures = normalizeFeatures(toArray(awareness?.possibleFeatures))
  const readinessAttemptCounts = toObject(awareness?.readinessAttemptCounts) ?? {}
  const readinessCounts = Object.values(readinessAttemptCounts).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  const answeredReadiness = readinessCounts.length
  const firstPass = readinessCounts.filter((count) => count === 1).length

  return {
    awarenessSecondsSpent: safeNumber(awareness?.awarenessSecondsSpent),
    diagnosticFeatureCount: diagnosticFeatures.length || null,
    possibleFeatureCount: possibleFeatures.length || null,
    readinessRetryCount: safeNumber(awareness?.readinessRetryCount) ?? (readinessCounts.length > 0 ? readinessCounts.reduce((sum, count) => sum + Math.max(0, count - 1), 0) : null),
    readinessFirstPassRate: answeredReadiness > 0 ? firstPass / answeredReadiness : null,
    stage1GroupCount: nonEmptyGroups.length || null,
    stage1OverallReasonLength: overallReason.trim().length || null,
  }
}

function buildRiskLevel(student: Omit<StudentRow, 'riskLevel'>): StudentRow['riskLevel'] {
  if (!student.isCompleted) return '未完成'
  if (student.transferCount === 0 && student.evidenceCount === 0) return '資料不足'
  if (student.transferCount === 0) return '資料不足'
  if ((student.transferAccuracy ?? 0) < 0.34) return '高'
  if ((student.sdi ?? 0) >= 0.34) return '高'
  if ((student.transferAccuracy ?? 0) < 0.67) return '中'
  if ((student.sdi ?? 0) >= 0.17) return '中'
  return '低'
}

function pickTopCounts(map: Record<string, number>, limit = 3) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key)
}

function denominatorWarning(label: string, count: number, total: number): SampleWarning | null {
  if (count === 0) {
    return { key: label, level: 'warn', message: `${label}目前沒有有效樣本，請先看完成度與進度，不宜下教學定論。` }
  }
  if (count < 5 || (total > 0 && count / total < 0.2)) {
    return { key: label, level: 'info', message: `${label}目前有效樣本僅 ${count}，請視為早期訊號，不宜直接視為全班結論。` }
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const teacherAuth = await getTeacherAuthFromRequest(req, admin)

    if (!teacherAuth) {
      return NextResponse.json(
        { error: '教師尚未登入或登入已過期。' },
        { status: 401 }
      )
    }

    if (!teacherAuth.isSuperAdmin && teacherAuth.assignments.length === 0) {
      return NextResponse.json(
        { error: '此教師帳號尚未設定可查看班級。' },
        { status: 403 }
      )
    }

    const searchParams = req.nextUrl.searchParams

    const schoolCode = searchParams.get('schoolCode')?.trim() ?? ''
    const grade = searchParams.get('grade')?.trim() ?? ''
    const className = searchParams.get('className')?.trim() ?? ''
    const participantCode = searchParams.get('participantCode')?.trim() ?? ''
    const stageFilter = searchParams.get('currentStage')?.trim() ?? ''
    const userRoleFilter = searchParams.get('userRole')?.trim() ?? ''
    const useContextFilter = searchParams.get('useContext')?.trim() ?? ''
    const animalClassificationExperienceFilter =
      searchParams.get('animalClassificationExperience')?.trim() ?? ''
    const completedOnly = searchParams.get('completedOnly') === 'true'
    const riskOnly = searchParams.get('riskOnly') === 'true'

    let recordQuery = admin
      .from('learning_records')
      .select('id, participant_code, school_code, grade, class_name, seat_no, masked_name, current_stage, is_completed, payload, updated_at')
      .order('updated_at', { ascending: false })
      .range(0, 2999)

    if (schoolCode) recordQuery = recordQuery.eq('school_code', schoolCode)
    if (grade) recordQuery = recordQuery.eq('grade', grade)
    if (className) recordQuery = recordQuery.eq('class_name', className)
    if (participantCode) recordQuery = recordQuery.ilike('participant_code', `%${participantCode}%`)
    if (stageFilter) recordQuery = recordQuery.eq('current_stage', stageFilter)
    if (completedOnly) recordQuery = recordQuery.eq('is_completed', true)

    const { data: records, error: recordError } = await recordQuery
    if (recordError) {
      return NextResponse.json({ error: recordError.message }, { status: 500 })
    }

    const recordRows = ((records ?? []) as LearningRecordRow[]).filter((record) =>
      recordMatchesTeacherAssignments(record, teacherAuth.assignments, teacherAuth.isSuperAdmin)
    )
    const allRecordIds = recordRows.map((record) => record.id)

    const [filterValuesResponse, itemLogsResponse, eventLogsResponse] = await Promise.all([
      admin.from('learning_records').select('school_code, grade, class_name').range(0, 2999),
      allRecordIds.length > 0
        ? admin
// Use latest_learning_item_logs for teacher-facing diagnostics to avoid
    // double-counting repeated submissions from the same participant/stage/item.
    // Raw learning_item_logs remains the append-only history table.
                .from('latest_learning_item_logs')
            .select('record_id, participant_code, stage, question_id, animal_name, entered_at, submitted_at, duration_ms, final_answer, selected_features, selected_features_count, feature_selection_order, primary_feature, secondary_features, feature_options_shown, feature_option_order, random_seed, max_selectable_features, feature_option_version, reason_text, reason_char_count, exclusion_reason_text, exclusion_reason_char_count, confidence, familiarity, learned_before, is_correct, criterion_quality, diagnostic_hit_count, acceptable_hit_count, auxiliary_count, misleading_count, high_confidence_error, scoring_rubric_version')
            .in('record_id', allRecordIds)
        : Promise.resolve({ data: [], error: null }),
      allRecordIds.length > 0
        ? admin
            .from('learning_event_logs')
            .select('record_id, participant_code, stage, question_id, event_type, event_value, client_ts, server_ts')
            .in('record_id', allRecordIds)
            .in('event_type', ['image_zoom_open', 'image_zoom_close'])
        : Promise.resolve({ data: [], error: null }),
    ])

    if (filterValuesResponse.error) {
      return NextResponse.json({ error: filterValuesResponse.error.message }, { status: 500 })
    }
    if (itemLogsResponse.error) {
      return NextResponse.json({ error: itemLogsResponse.error.message }, { status: 500 })
    }
    if (eventLogsResponse.error) {
      return NextResponse.json({ error: eventLogsResponse.error.message }, { status: 500 })
    }

    const itemLogs = (itemLogsResponse.data ?? []) as LearningItemLogRow[]
    const eventLogs = (eventLogsResponse.data ?? []) as LearningEventLogRow[]

    const itemsByRecord = new Map<string, LearningItemLogRow[]>()
    for (const item of itemLogs) {
      const current = itemsByRecord.get(item.record_id) ?? []
      current.push(item)
      itemsByRecord.set(item.record_id, current)
    }

    const eventsByRecord = new Map<string, LearningEventLogRow[]>()
    for (const event of eventLogs) {
      const current = eventsByRecord.get(event.record_id) ?? []
      current.push(event)
      eventsByRecord.set(event.record_id, current)
    }

    const studentRows: StudentRow[] = recordRows.map((record) => {
      const recordItems = itemsByRecord.get(record.id) ?? []
      const recordEvents = eventsByRecord.get(record.id) ?? []
      const evidenceItems = recordItems.filter((item) => item.stage === 'evidence')
      const transferItems = recordItems.filter((item) => item.stage === 'transfer')
      const evidenceCorrect = evidenceItems.filter((item) => item.is_correct === true).length
      const transferCorrect = transferItems.filter((item) => item.is_correct === true).length
      const zoomOpenEvents = recordEvents.filter((event) => event.event_type === 'image_zoom_open')
      const selectedFeatures = normalizeFeatures(
  recordItems.flatMap((item) => item.selected_features ?? [])
)
      const structuralCount = selectedFeatures.filter((feature) =>
  STRUCTURAL_FEATURES.has(feature)
).length

      const payload = record.payload ?? {}
      const participant = toObject(payload.participant)

      const userRole = safeString(participant?.userRole)
      const useContext = safeString(participant?.useContext)
      const animalClassificationExperience = safeString(
  participant?.animalClassificationExperience
)
      const payloadVersion = safeString(payload.version)
      const featureOptionVersion = safeString(payload.featureOptionVersion)

      const payloadInfo = parsePayloadInfo(record.payload)

      const baseStudent = {
        participantCode: record.participant_code,
        schoolCode: record.school_code,
        grade: record.grade,
        className: record.class_name,
        seatNo: record.seat_no,
        maskedName: record.masked_name,
        userRole,
        useContext,
        animalClassificationExperience,
        payloadVersion,
        featureOptionVersion,
        currentStage: record.current_stage,
        isCompleted: Boolean(record.is_completed),
        evidenceAccuracy: ratio(evidenceCorrect, evidenceItems.length),
        transferAccuracy: ratio(transferCorrect, transferItems.length),
        sdi:
          evidenceItems.length > 0 && transferItems.length > 0
            ? ratio(evidenceCorrect, evidenceItems.length)! - ratio(transferCorrect, transferItems.length)!
            : null,
        avgEvidenceDurationSec: average(evidenceItems.map((item) => (item.duration_ms == null ? null : item.duration_ms / 1000))),
        avgTransferDurationSec: average(transferItems.map((item) => (item.duration_ms == null ? null : item.duration_ms / 1000))),
        zoomOpenCount: zoomOpenEvents.length,
        zoomQuestionCount: unique(zoomOpenEvents.map((event) => event.question_id).filter(Boolean)).length,
        evidenceCount: evidenceItems.length,
        transferCount: transferItems.length,
        structuralFeatureRate: ratio(structuralCount, selectedFeatures.length),
        selectedFeatureCountAvg: average(recordItems.map((item) => item.selected_features_count)),
        reasonCharCountAvg: average(recordItems.map((item) => item.reason_char_count)),
        awarenessSecondsSpent: payloadInfo.awarenessSecondsSpent,
        diagnosticFeatureCount: payloadInfo.diagnosticFeatureCount,
        possibleFeatureCount: payloadInfo.possibleFeatureCount,
        readinessRetryCount: payloadInfo.readinessRetryCount,
        readinessFirstPassRate: payloadInfo.readinessFirstPassRate,
        stage1GroupCount: payloadInfo.stage1GroupCount,
        stage1OverallReasonLength: payloadInfo.stage1OverallReasonLength,
        updatedAt: record.updated_at,
      }

      return {
        ...baseStudent,
        riskLevel: buildRiskLevel(baseStudent),
      }
    })

    const backgroundFilteredStudents = studentRows.filter((student) => {
  if (userRoleFilter && student.userRole !== userRoleFilter) return false
  if (useContextFilter && student.useContext !== useContextFilter) return false
  if (
    animalClassificationExperienceFilter &&
    student.animalClassificationExperience !== animalClassificationExperienceFilter
  ) {
    return false
  }

  return true
})

const filteredStudents = riskOnly
  ? backgroundFilteredStudents.filter((student) =>
      ['高', '中', '未完成'].includes(student.riskLevel)
    )
  : backgroundFilteredStudents

    const filteredRecordIds = new Set(
      filteredStudents
        .map((student) => recordRows.find((record) => record.participant_code === student.participantCode)?.id)
        .filter(Boolean) as string[]
    )

    const filteredItems = itemLogs.filter((item) => filteredRecordIds.has(item.record_id))

const enrichedItems = filteredItems.map((item) => {
  const selectedFeatures = normalizeItemLogFeatures(item)
  const quality = analyzeSelectedFeatureQuality(
    item.animal_name ?? '',
    selectedFeatures
  )
  const dbFeatureQuality = mapCriterionQuality(item.criterion_quality)

  return {
    ...item,
    selected_features: selectedFeatures,
    selected_features_count: item.selected_features_count ?? selectedFeatures.length,
    primaryHitCount:
      typeof item.diagnostic_hit_count === 'number'
        ? item.diagnostic_hit_count
        : quality.primaryHitCount,
    acceptableHitCount:
      typeof item.acceptable_hit_count === 'number'
        ? item.acceptable_hit_count
        : quality.acceptableHitCount,
    supportingHitCount:
      typeof item.auxiliary_count === 'number'
        ? item.auxiliary_count
        : quality.supportingHitCount,
    misleadingHitCount:
      typeof item.misleading_count === 'number'
        ? item.misleading_count
        : quality.misleadingHitCount,
    selectedPrimaryFeatures: quality.selectedPrimaryFeatures,
    selectedAcceptableFeatures: quality.selectedAcceptableFeatures,
    selectedSupportingFeatures: quality.selectedSupportingFeatures,
    selectedMisleadingFeatures: quality.selectedMisleadingFeatures,
    featureQuality: dbFeatureQuality ?? quality.featureQuality,
  }
})

const filteredEvents = eventLogs.filter((event) => filteredRecordIds.has(event.record_id))

const evidenceItems = enrichedItems.filter((item) => item.stage === 'evidence')
const transferItems = enrichedItems.filter((item) => item.stage === 'transfer')
    const evidenceStudents = unique(evidenceItems.map((item) => item.participant_code)).length
    const transferStudents = unique(transferItems.map((item) => item.participant_code)).length
    const zoomStudents = unique(filteredEvents.filter((event) => event.event_type === 'image_zoom_open').map((event) => event.participant_code)).length
    const awarenessStudents = filteredStudents.filter((student) => student.awarenessSecondsSpent != null).length

    const summaryBase: Summary = {
      totalStudents: filteredStudents.length,
      completedStudents: filteredStudents.filter((student) => student.isCompleted).length,
      completionRate: ratio(filteredStudents.filter((student) => student.isCompleted).length, filteredStudents.length),
      evidenceAccuracy: ratio(evidenceItems.filter((item) => item.is_correct === true).length, evidenceItems.length),
      transferAccuracy: ratio(transferItems.filter((item) => item.is_correct === true).length, transferItems.length),
      sdi: null,
      avgEvidenceDurationSec: average(evidenceItems.map((item) => (item.duration_ms == null ? null : item.duration_ms / 1000))),
      avgTransferDurationSec: average(transferItems.map((item) => (item.duration_ms == null ? null : item.duration_ms / 1000))),
      medianEvidenceDurationSec: median(evidenceItems.map((item) => (item.duration_ms == null ? null : item.duration_ms / 1000))),
      medianTransferDurationSec: median(transferItems.map((item) => (item.duration_ms == null ? null : item.duration_ms / 1000))),
      zoomUserRate: ratio(zoomStudents, filteredStudents.length),
      avgStructuralFeatureRate: average(filteredStudents.map((student) => student.structuralFeatureRate)),
      avgReasonCharCount: average(enrichedItems.map((item) => item.reason_char_count)),
    }

    const summary: Summary = {
      ...summaryBase,
      sdi:
        summaryBase.evidenceAccuracy !== null && summaryBase.transferAccuracy !== null
          ? summaryBase.evidenceAccuracy - summaryBase.transferAccuracy
          : null,
    }

    const sampleBases: SampleBases = {
      totalStudents: filteredStudents.length,
      completedStudents: filteredStudents.filter((student) => student.isCompleted).length,
      evidenceStudents,
      evidenceItems: evidenceItems.length,
      transferStudents,
      transferItems: transferItems.length,
      zoomStudents,
      zoomEvents: filteredEvents.length,
      awarenessStudents,
    }

    const sampleWarnings = [
      denominatorWarning('第 4 階段 evidence', evidenceStudents, filteredStudents.length),
      denominatorWarning('第 5 階段 transfer', transferStudents, filteredStudents.length),
      denominatorWarning('圖片放大事件', zoomStudents, filteredStudents.length),
    ].filter(Boolean) as SampleWarning[]

    const stageFunnel: StageBucket[] = STAGE_KEYS.map((key) => ({
      stage: key,
      count: filteredStudents.filter((student) => student.currentStage === key).length,
    }))

    const riskDistribution: RiskBucket[] = ['高', '中', '低', '未完成', '資料不足'].map((level) => ({
      level,
      count: filteredStudents.filter((student) => student.riskLevel === level).length,
    }))

    const questionMap = new Map<string, LearningItemLogRow[]>()
for (const item of enrichedItems) {
  const key = `${item.stage}__${item.question_id}`
  const current = questionMap.get(key) ?? []
  current.push(item)
  questionMap.set(key, current)
}

    const questionMetrics: QuestionMetric[] = [...questionMap.entries()]
      .map(([key, items]) => {
        const [stage, questionId] = key.split('__')
        const respondents = items.length
        const studentCount = unique(items.map((item) => item.participant_code)).length
        const correctCount = items.filter((item) => item.is_correct === true).length
        const questionEvents = filteredEvents.filter((event) => event.stage === stage && event.question_id === questionId)
        const zoomOpenEvents = questionEvents.filter((event) => event.event_type === 'image_zoom_open')
        const uniqueZoomUsers = unique(zoomOpenEvents.map((event) => event.participant_code)).length
        const wrongAnswersMap = items
          .filter((item) => item.is_correct === false && item.final_answer)
          .reduce<Record<string, number>>((acc, item) => {
            const answer = item.final_answer as string
            acc[answer] = (acc[answer] ?? 0) + 1
            return acc
          }, {})
        const wrongFeaturesMap = items
        .filter((item) => item.is_correct === false)
        .flatMap((item) => item.selected_features ?? [])
        .reduce<Record<string, number>>((acc, feature) => {
          acc[feature] = (acc[feature] ?? 0) + 1
          return acc
        }, {})
        const highConfidenceWrong = items.filter((item) => item.is_correct === false && (item.high_confidence_error === true || (item.confidence ?? 0) >= 4)).length

        const highFeatureQualityCount = items.filter(
  (item) => item.featureQuality === 'high'
).length

const partialFeatureQualityCount = items.filter(
  (item) => item.featureQuality === 'partial'
).length

const surfaceOrMisleadingCount = items.filter(
  (item) => item.featureQuality === 'surface_or_misleading'
).length

const unclearFeatureQualityCount = items.filter(
  (item) => item.featureQuality === 'unclear'
).length

const primaryFeatureMap = items
  .flatMap((item) => item.selectedPrimaryFeatures ?? [])
  .reduce<Record<string, number>>((acc, feature) => {
    acc[feature] = (acc[feature] ?? 0) + 1
    return acc
  }, {})

const misleadingFeatureMap = items
  .flatMap((item) => item.selectedMisleadingFeatures ?? [])
  .reduce<Record<string, number>>((acc, feature) => {
    acc[feature] = (acc[feature] ?? 0) + 1
    return acc
  }, {})

        return {
  key,
  stage,
  questionId,
  animalName: items[0]?.animal_name ?? null,
  respondents,
  studentCount,
  accuracy: ratio(correctCount, respondents),
  avgDurationSec: average(items.map((item) => (item.duration_ms == null ? null : item.duration_ms / 1000))),
  medianDurationSec: median(items.map((item) => (item.duration_ms == null ? null : item.duration_ms / 1000))),
  avgConfidence: average(items.map((item) => item.confidence)),
  avgSelectedFeatureCount: average(items.map((item) => item.selected_features_count)),
  avgReasonCharCount: average(items.map((item) => item.reason_char_count)),
  zoomOpenCount: zoomOpenEvents.length,
  zoomUserRate: ratio(uniqueZoomUsers, studentCount),
  topWrongAnswers: pickTopCounts(wrongAnswersMap, 3),
  topWrongFeatures: pickTopCounts(wrongFeaturesMap, 3),
  highConfidenceWrongRate: ratio(highConfidenceWrong, respondents),

  highFeatureQualityCount,
  partialFeatureQualityCount,
  surfaceOrMisleadingCount,
  unclearFeatureQualityCount,
  highFeatureQualityRate: ratio(highFeatureQualityCount, respondents),
  surfaceOrMisleadingRate: ratio(surfaceOrMisleadingCount, respondents),
  avgPrimaryHitCount: average(items.map((item) => item.primaryHitCount ?? null)),
  avgMisleadingHitCount: average(items.map((item) => item.misleadingHitCount ?? null)),
  topPrimaryFeatures: pickTopCounts(primaryFeatureMap, 3),
  topMisleadingFeatures: pickTopCounts(misleadingFeatureMap, 3),
}
      })
      .sort((a, b) => {
        const aPenalty = ((a.accuracy ?? 1) * 100) + (a.avgDurationSec ?? 0) * 0.25
        const bPenalty = ((b.accuracy ?? 1) * 100) + (b.avgDurationSec ?? 0) * 0.25
        return aPenalty - bPenalty
      })

    const featureMap = new Map<string, { items: LearningItemLogRow[]; students: Set<string> }>()
for (const item of enrichedItems) {
  const features = item.selected_features ?? []
  for (const feature of features) {
    const current = featureMap.get(feature) ?? { items: [], students: new Set<string>() }
    current.items.push(item)
    current.students.add(item.participant_code)
    featureMap.set(feature, current)
  }
}

    const featureMetrics: FeatureMetric[] = [...featureMap.entries()]
      .map(([feature, payload]) => ({
        feature,
        cueType: cueType(feature),
        selectedCount: payload.items.length,
        studentCount: payload.students.size,
        correctRateWhenSelected: ratio(payload.items.filter((item) => item.is_correct === true).length, payload.items.length),
        evidenceCount: payload.items.filter((item) => item.stage === 'evidence').length,
        transferCount: payload.items.filter((item) => item.stage === 'transfer').length,
        wrongSelectionRate: ratio(payload.items.filter((item) => item.is_correct === false).length, payload.items.length),
      }))
      .sort((a, b) => b.selectedCount - a.selectedCount)

    const featureQualitySummary = {
  high: enrichedItems.filter((item) => item.featureQuality === 'high').length,
  partial: enrichedItems.filter((item) => item.featureQuality === 'partial').length,
  surfaceOrMisleading: enrichedItems.filter(
    (item) => item.featureQuality === 'surface_or_misleading'
  ).length,
  unclear: enrichedItems.filter((item) => item.featureQuality === 'unclear').length,
}

const averagePrimaryHitCount =
  enrichedItems.length > 0
    ? enrichedItems.reduce((sum, item) => sum + (item.primaryHitCount ?? 0), 0) /
      enrichedItems.length
    : 0

const averageMisleadingHitCount =
  enrichedItems.length > 0
    ? enrichedItems.reduce((sum, item) => sum + (item.misleadingHitCount ?? 0), 0) /
      enrichedItems.length
    : 0
    
    const wrongFeatureMap = new Map<string, MisconceptionAccumulator>()
for (const item of enrichedItems.filter((row) => row.is_correct === false)) {
  for (const feature of item.selected_features ?? []) {
        const current =
          wrongFeatureMap.get(feature) ?? {
            feature,
            cueType: cueType(feature),
            wrongCount: 0,
            wrongStudentCount: 0,
            wrongQuestionCount: 0,
            highConfidenceWrongCount: 0,
            _students: new Set<string>(),
            _questions: new Set<string>(),
          }

        current.wrongCount += 1
        current._students.add(item.participant_code)
        current._questions.add(`${item.stage}-${item.question_id}`)

        if (item.high_confidence_error === true || (item.confidence ?? 0) >= 4) {
          current.highConfidenceWrongCount += 1
        }

        wrongFeatureMap.set(feature, current)
      }
    }

    const misconceptionMetrics: MisconceptionMetric[] = [...wrongFeatureMap.values()]
      .map((row) => ({
        feature: row.feature,
        cueType: row.cueType,
        wrongCount: row.wrongCount,
        wrongStudentCount: row._students.size,
        wrongQuestionCount: row._questions.size,
        highConfidenceWrongCount: row.highConfidenceWrongCount,
      }))
      .sort((a, b) => b.wrongCount - a.wrongCount)

    const highRiskStudents = filteredStudents
      .filter((student) => ['高', '中', '未完成'].includes(student.riskLevel))
      .sort((a, b) => {
        const aScore = (a.transferAccuracy ?? -1) - (a.sdi ?? 0)
        const bScore = (b.transferAccuracy ?? -1) - (b.sdi ?? 0)
        return aScore - bScore
      })
      .slice(0, 15)

    const strongestStudents = filteredStudents
      .filter((student) => student.riskLevel === '低')
      .sort((a, b) => (b.transferAccuracy ?? 0) - (a.transferAccuracy ?? 0))
      .slice(0, 10)

    const filterRows = (filterValuesResponse.data ?? []).filter((row: any) => recordMatchesTeacherAssignments(row, teacherAuth.assignments)) as Array<{ school_code: string | null; grade: string | null; class_name: string | null }>
    const filters: FiltersResponse = {
  schoolCodes: unique(filterRows.map((row) => row.school_code).filter(Boolean) as string[]).sort(),
  grades: unique(filterRows.map((row) => row.grade).filter(Boolean) as string[]).sort(),
  classNames: unique(filterRows.map((row) => row.class_name).filter(Boolean) as string[]).sort(),
  userRoles: unique(studentRows.map((row) => row.userRole).filter(Boolean) as string[]).sort(),
  useContexts: unique(studentRows.map((row) => row.useContext).filter(Boolean) as string[]).sort(),
  animalClassificationExperiences: unique(
    studentRows
      .map((row) => row.animalClassificationExperience)
      .filter(Boolean) as string[]
  ).sort(),
  stages: STAGE_KEYS,
}

    const insightCards: InsightCard[] = []

    if (summary.evidenceAccuracy !== null && summary.transferAccuracy !== null) {
      const gap = summary.evidenceAccuracy - summary.transferAccuracy
      insightCards.push({
        title: '鷹架依賴度',
        severity: gap >= 0.25 ? 'strong' : gap >= 0.1 ? 'warn' : 'info',
        body:
          transferStudents < 5
            ? `目前 evidence 正確率 ${round(summary.evidenceAccuracy * 100)}%，transfer 正確率 ${round(summary.transferAccuracy * 100)}%，但 transfer 有效樣本僅 ${transferStudents} 人，建議先視為早期訊號。`
            : `目前 evidence 正確率 ${round(summary.evidenceAccuracy * 100)}%，transfer 正確率 ${round(summary.transferAccuracy * 100)}%，兩者差值 ${round(gap * 100)} 個百分點。若差距持續偏大，代表學生可能在移除提示後失去判準。`,
      })
    }

    if (questionMetrics[0]) {
      const q = questionMetrics[0]
      insightCards.push({
        title: '最值得全班重教的題目',
        severity: 'warn',
        body: `${q.stage}/${q.questionId}${q.animalName ? ` ${q.animalName}` : ''}：正確率 ${q.accuracy == null ? '—' : `${round(q.accuracy * 100)}%`}，平均耗時 ${q.avgDurationSec == null ? '—' : `${round(q.avgDurationSec)} 秒`}，常見錯用特徵 ${q.topWrongFeatures.length ? q.topWrongFeatures.join('、') : '尚無' }。`,
      })
    }

    if (misconceptionMetrics[0]) {
      const m = misconceptionMetrics[0]
      insightCards.push({
        title: '最常造成誤判的特徵',
        severity: m.cueType === '表面線索' ? 'strong' : 'info',
        body: `${m.feature} 在錯誤作答中出現 ${m.wrongCount} 次，涉及 ${m.wrongStudentCount} 位學生，屬於「${m.cueType}」。可優先檢查學生是否把表面線索誤當成分類判準。`,
      })
    }

    if (summary.zoomUserRate !== null) {
      insightCards.push({
        title: '圖像證據使用',
        severity: zoomStudents < 5 ? 'info' : 'warn',
        body: `目前至少使用一次圖片放大的學生比例為 ${round(summary.zoomUserRate * 100)}%（${zoomStudents}/${filteredStudents.length}）。若 zoom 使用率高但正確率仍低，問題多半不在圖片大小，而在判準建立。`,
      })
    }

    return NextResponse.json({
  ok: true,
  filters,
  summary,
  sampleBases,
  sampleWarnings,
  stageFunnel,
  riskDistribution,
  studentRows: filteredStudents,
  highRiskStudents,
  strongestStudents,
  questionMetrics,
  featureMetrics,
  misconceptionMetrics,
  featureQualitySummary,
  averagePrimaryHitCount,
  averageMisleadingHitCount,
  insightCards,
  counts: {
    records: recordRows.length,
    itemLogs: filteredItems.length,
    eventLogs: filteredEvents.length,
  },
} satisfies DashboardResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
