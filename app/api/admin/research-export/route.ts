import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type ExportKind =
  | 'item_level_latest'
  | 'student_summary'
  | 'class_summary'
  | 'record_status'
  | 'roster_class_summary'
  | 'roster_school_summary'

type LearningRecord = {
  id: string
  participant_code: string | null
  student_id: string | null
  school_code: string | null
  school_year: string | null
  semester: string | null
  grade: string | null
  class_name: string | null
  seat_no: string | null
  masked_name: string | null
  current_stage: string | null
  is_completed: boolean | null
  version: string | null
  updated_at: string | null
  payload: any
}

type ItemLog = {
  record_id: string | null
  participant_code: string | null
  stage: string | null
  question_id: string | null
  animal_name: string | null
  entered_at: string | null
  submitted_at: string | null
  duration_ms: number | null
  final_answer: string | null
  selected_features: string[] | null
  selected_features_count: number | null
  primary_feature: string | null
  secondary_features: string[] | null
  feature_options_shown: string[] | null
  feature_option_order: string[] | null
  random_seed: string | null
  max_selectable_features: number | null
  feature_option_version: string | null
  reason_text: string | null
  reason_char_count: number | null
  exclusion_reason_text: string | null
  exclusion_reason_char_count: number | null
  confidence: number | null
  familiarity: number | null
  learned_before: string | null
  is_correct: boolean | null
  criterion_quality: string | null
  diagnostic_hit_count: number | null
  acceptable_hit_count: number | null
  auxiliary_count: number | null
  misleading_count: number | null
  high_confidence_error: boolean | null
  scoring_rubric_version: string | null
  updated_at: string | null
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase env missing')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

function assertAdmin(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'ADMIN_PASSWORD 尚未設定。' },
        { status: 500 }
      ),
    }
  }

  const provided = req.headers.get('x-admin-password') || ''

  if (!provided || provided !== expected) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: '管理密碼不正確。' },
        { status: 401 }
      ),
    }
  }

  return { ok: true as const }
}

function clean(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function num(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function bool01(value: unknown) {
  if (typeof value === 'boolean') return value ? 1 : 0
  return ''
}

function csvValue(value: unknown) {
  if (value == null) return ''
  if (Array.isArray(value)) return csvValue(value.join('|'))
  if (typeof value === 'object') return csvValue(JSON.stringify(value))
  const raw = String(value)
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

function toCsv(rows: Array<Record<string, unknown>>, headers: string[]) {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => csvValue(row[header])).join(','))
  }
  return lines.join('\n')
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse('\uFEFF' + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function normalizePayloadInfo(payload: any) {
  const p = payload && typeof payload === 'object' ? payload : {}

  return {
    platform_mode:
      clean(p.platformMode) ??
      clean(p.platform_mode) ??
      clean(p.researchMode) ??
      null,
    data_use_scope:
      clean(p.dataUseScope) ??
      clean(p.data_use_scope) ??
      clean(p.researchDataUseScope) ??
      null,
    learning_experience:
      clean(p.learningExperience) ??
      clean(p.learningExperienceCode) ??
      clean(p.animalClassificationExperience) ??
      clean(p.researchBackground?.animalClassificationExperience) ??
      null,
    learning_experience_label:
      clean(p.learningExperienceLabel) ??
      clean(p.animalClassificationExperienceLabel) ??
      clean(p.researchBackground?.animalClassificationExperience) ??
      null,
    app_version: clean(p.version) ?? null,
    item_bank_version:
      clean(p.itemBankVersion) ?? clean(p.item_bank_version) ?? null,
    rubric_version:
      clean(p.rubricVersion) ?? clean(p.scoringRubricVersion) ?? null,
    included_in_main_research:
      typeof p.dataQualityFlags?.includedInMainResearch === 'boolean'
        ? p.dataQualityFlags.includedInMainResearch
        : null,
    exclusion_reasons: Array.isArray(p.dataQualityFlags?.exclusionReasons)
      ? p.dataQualityFlags.exclusionReasons.join('|')
      : null,
  }
}

function mean(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function rate(values: Array<boolean | null | undefined>) {
  const valid = values.filter((value): value is boolean => typeof value === 'boolean')
  if (valid.length === 0) return null
  return valid.filter(Boolean).length / valid.length
}

function countWhere<T>(values: T[], predicate: (value: T) => boolean) {
  return values.filter(predicate).length
}

function passesFilters(row: Record<string, unknown>, searchParams: URLSearchParams) {
  const schoolCode = clean(searchParams.get('schoolCode'))
  const grade = clean(searchParams.get('grade'))
  const className = clean(searchParams.get('className'))
  const stage = clean(searchParams.get('stage'))

  if (schoolCode && row.school_code !== schoolCode) return false
  if (grade && String(row.grade ?? '') !== grade) return false
  if (className && row.class_name !== className) return false
  if (stage && row.stage !== stage) return false

  return true
}

async function loadItemLogs(admin: any) {
  const { data, error } = await admin
    .from('latest_learning_item_logs')
    .select(
      [
        'record_id',
        'participant_code',
        'stage',
        'question_id',
        'animal_name',
        'entered_at',
        'submitted_at',
        'duration_ms',
        'final_answer',
        'selected_features',
        'selected_features_count',
        'primary_feature',
        'secondary_features',
        'feature_options_shown',
        'feature_option_order',
        'random_seed',
        'max_selectable_features',
        'feature_option_version',
        'reason_text',
        'reason_char_count',
        'exclusion_reason_text',
        'exclusion_reason_char_count',
        'confidence',
        'familiarity',
        'learned_before',
        'is_correct',
        'criterion_quality',
        'diagnostic_hit_count',
        'acceptable_hit_count',
        'auxiliary_count',
        'misleading_count',
        'high_confidence_error',
        'scoring_rubric_version',
        'updated_at',
      ].join(', ')
    )
    .order('participant_code', { ascending: true })
    .order('stage', { ascending: true })
    .order('question_id', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ItemLog[]
}

async function loadRecords(admin: any, recordIds: string[]) {
  if (recordIds.length === 0) return new Map<string, LearningRecord>()

  const { data, error } = await admin
    .from('learning_records')
    .select(
      [
        'id',
        'participant_code',
        'student_id',
        'school_code',
        'school_year',
        'semester',
        'grade',
        'class_name',
        'seat_no',
        'masked_name',
        'current_stage',
        'is_completed',
        'version',
        'updated_at',
        'payload',
      ].join(', ')
    )
    .in('id', recordIds)

  if (error) throw new Error(error.message)

  return new Map(
    ((data ?? []) as LearningRecord[]).map((record) => [String(record.id), record])
  )
}

async function buildItemLevelRows(admin: any, searchParams: URLSearchParams) {
  const items = await loadItemLogs(admin)
  const recordIds = Array.from(
    new Set(
      items
        .map((item) => clean(item.record_id))
        .filter((value): value is string => Boolean(value))
    )
  )
  const recordMap = await loadRecords(admin, recordIds)

  return items
    .map((item) => {
      const record = item.record_id ? recordMap.get(String(item.record_id)) : null
      const payloadInfo = normalizePayloadInfo(record?.payload)

      return {
        participant_code: item.participant_code,
        record_id: item.record_id,
        student_id: record?.student_id ?? null,
        school_code: record?.school_code ?? null,
        school_year: record?.school_year ?? null,
        semester: record?.semester ?? null,
        grade: record?.grade ?? null,
        class_name: record?.class_name ?? null,
        seat_no: record?.seat_no ?? null,
        masked_name: record?.masked_name ?? null,
        current_stage: record?.current_stage ?? null,
        is_completed: bool01(record?.is_completed),
        platform_mode: payloadInfo.platform_mode,
        data_use_scope: payloadInfo.data_use_scope,
        learning_experience: payloadInfo.learning_experience,
        learning_experience_label: payloadInfo.learning_experience_label,
        included_in_main_research: bool01(payloadInfo.included_in_main_research),
        exclusion_reasons: payloadInfo.exclusion_reasons,
        app_version: payloadInfo.app_version ?? record?.version ?? null,
        item_bank_version: payloadInfo.item_bank_version,
        rubric_version: payloadInfo.rubric_version,
        stage: item.stage,
        question_id: item.question_id,
        animal_name: item.animal_name,
        final_answer: item.final_answer,
        is_correct: bool01(item.is_correct),
        criterion_quality: item.criterion_quality,
        diagnostic_hit_count: item.diagnostic_hit_count,
        acceptable_hit_count: item.acceptable_hit_count,
        auxiliary_count: item.auxiliary_count,
        misleading_count: item.misleading_count,
        high_confidence_error: bool01(item.high_confidence_error),
        primary_feature: item.primary_feature,
        secondary_features: item.secondary_features ?? [],
        selected_features: item.selected_features ?? [],
        selected_features_count: item.selected_features_count,
        confidence: item.confidence,
        familiarity: item.familiarity,
        learned_before: item.learned_before,
        reason_text: item.reason_text,
        reason_char_count: item.reason_char_count,
        exclusion_reason_text: item.exclusion_reason_text,
        exclusion_reason_char_count: item.exclusion_reason_char_count,
        duration_ms: item.duration_ms,
        duration_sec: num(item.duration_ms) == null ? null : Number(item.duration_ms) / 1000,
        entered_at: item.entered_at,
        submitted_at: item.submitted_at,
        random_seed: item.random_seed,
        feature_option_version: item.feature_option_version,
        feature_option_order: item.feature_option_order ?? [],
        feature_options_shown: item.feature_options_shown ?? [],
        max_selectable_features: item.max_selectable_features,
        scoring_rubric_version: item.scoring_rubric_version,
        item_updated_at: item.updated_at,
        record_updated_at: record?.updated_at ?? null,
      }
    })
    .filter((row) => passesFilters(row, searchParams))
}

async function buildRecordStatusRows(admin: any, searchParams: URLSearchParams) {
  const { data, error } = await admin
    .from('learning_records')
    .select('id, participant_code, student_id, school_code, school_year, semester, grade, class_name, seat_no, masked_name, current_stage, is_completed, version, updated_at, payload')
    .order('updated_at', { ascending: false })
    .range(0, 9999)

  if (error) throw new Error(error.message)

  return ((data ?? []) as LearningRecord[])
    .map((record) => {
      const payloadInfo = normalizePayloadInfo(record.payload)
      return {
        record_id: record.id,
        participant_code: record.participant_code,
        student_id: record.student_id,
        school_code: record.school_code,
        school_year: record.school_year,
        semester: record.semester,
        grade: record.grade,
        class_name: record.class_name,
        seat_no: record.seat_no,
        masked_name: record.masked_name,
        current_stage: record.current_stage,
        is_completed: bool01(record.is_completed),
        platform_mode: payloadInfo.platform_mode,
        data_use_scope: payloadInfo.data_use_scope,
        learning_experience: payloadInfo.learning_experience,
        learning_experience_label: payloadInfo.learning_experience_label,
        included_in_main_research: bool01(payloadInfo.included_in_main_research),
        exclusion_reasons: payloadInfo.exclusion_reasons,
        app_version: payloadInfo.app_version ?? record.version,
        item_bank_version: payloadInfo.item_bank_version,
        rubric_version: payloadInfo.rubric_version,
        updated_at: record.updated_at,
      }
    })
    .filter((row) => passesFilters(row, searchParams))
}

async function loadRosterRows(admin: any) {
  const { data, error } = await admin
    .from('student_roster')
    .select('id, school_code, grade, class_name, seat_no, student_name, masked_name, is_active, note, created_at, updated_at')
    .order('school_code', { ascending: true })
    .order('grade', { ascending: true })
    .order('class_name', { ascending: true })
    .order('seat_no', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

async function buildRosterClassSummaryRows(admin: any, searchParams: URLSearchParams) {
  const rows = await loadRosterRows(admin)
  const groups = new Map<string, any[]>()

  for (const row of rows) {
    const item = {
      school_code: row.school_code,
      grade: String(row.grade ?? ''),
      class_name: row.class_name,
    }
    if (!passesFilters(item, searchParams)) continue

    const key = `${row.school_code ?? ''}::${row.grade ?? ''}::${row.class_name ?? ''}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return Array.from(groups.values()).map((items) => {
    const first = items[0]
    return {
      school_code: first.school_code,
      grade: first.grade,
      class_name: first.class_name,
      student_count: items.length,
      active_student_count: items.filter((item) => item.is_active === true).length,
      inactive_student_count: items.filter((item) => item.is_active !== true).length,
      first_created_at: items.map((item) => item.created_at).filter(Boolean).sort()[0] ?? null,
      latest_updated_at:
        items.map((item) => item.updated_at).filter(Boolean).sort().reverse()[0] ??
        null,
    }
  })
}

async function buildRosterSchoolSummaryRows(admin: any, searchParams: URLSearchParams) {
  const classRows = await buildRosterClassSummaryRows(admin, searchParams)
  const groups = new Map<string, any[]>()

  for (const row of classRows) {
    const key = String(row.school_code ?? '')
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return Array.from(groups.values()).map((items) => {
    const first = items[0]
    return {
      school_code: first.school_code,
      class_count: items.length,
      student_count: items.reduce((sum, item) => sum + Number(item.student_count ?? 0), 0),
      active_student_count: items.reduce(
        (sum, item) => sum + Number(item.active_student_count ?? 0),
        0
      ),
      inactive_student_count: items.reduce(
        (sum, item) => sum + Number(item.inactive_student_count ?? 0),
        0
      ),
      latest_updated_at:
        items.map((item) => item.latest_updated_at).filter(Boolean).sort().reverse()[0] ??
        null,
    }
  })
}

function buildStudentSummaryRows(itemRows: Array<Record<string, any>>) {
  const groups = new Map<string, Array<Record<string, any>>>()

  for (const row of itemRows) {
    const key = String(row.record_id ?? row.participant_code ?? '')
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return Array.from(groups.entries()).map(([recordId, rows]) => {
    const first = rows[0]
    const participantCode = String(first.participant_code ?? '')
    const evidenceRows = rows.filter((row) => row.stage === 'evidence')
    const transferRows = rows.filter((row) => row.stage === 'transfer')
    const correctBooleans = rows.map((row) =>
      row.is_correct === 1 ? true : row.is_correct === 0 ? false : null
    )
    const evidenceCorrect = evidenceRows.map((row) =>
      row.is_correct === 1 ? true : row.is_correct === 0 ? false : null
    )
    const transferCorrect = transferRows.map((row) =>
      row.is_correct === 1 ? true : row.is_correct === 0 ? false : null
    )

    const evidenceAccuracy = rate(evidenceCorrect)
    const transferAccuracy = rate(transferCorrect)

    return {
      record_id: recordId,
      participant_code: participantCode,
      student_id: first.student_id,
      school_code: first.school_code,
      school_year: first.school_year,
      semester: first.semester,
      grade: first.grade,
      class_name: first.class_name,
      seat_no: first.seat_no,
      masked_name: first.masked_name,
      platform_mode: first.platform_mode,
      data_use_scope: first.data_use_scope,
      learning_experience: first.learning_experience,
      learning_experience_label: first.learning_experience_label,
      included_in_main_research: first.included_in_main_research,
      exclusion_reasons: first.exclusion_reasons,
      item_count: rows.length,
      evidence_item_count: evidenceRows.length,
      transfer_item_count: transferRows.length,
      overall_accuracy: rate(correctBooleans),
      evidence_accuracy: evidenceAccuracy,
      transfer_accuracy: transferAccuracy,
      transfer_decline:
        evidenceAccuracy == null || transferAccuracy == null
          ? null
          : evidenceAccuracy - transferAccuracy,
      high_quality_rate:
        rows.length === 0
          ? null
          : countWhere(rows, (row) => row.criterion_quality === 'high_quality') / rows.length,
      partial_mastery_rate:
        rows.length === 0
          ? null
          : countWhere(rows, (row) => row.criterion_quality === 'partial_mastery') / rows.length,
      surface_or_misleading_rate:
        rows.length === 0
          ? null
          : countWhere(rows, (row) => row.criterion_quality === 'surface_or_misleading') /
            rows.length,
      unclear_rate:
        rows.length === 0
          ? null
          : countWhere(
              rows,
              (row) => !row.criterion_quality || row.criterion_quality === 'unclear'
            ) / rows.length,
      diagnostic_hit_mean: mean(rows.map((row) => Number(row.diagnostic_hit_count ?? 0))),
      misleading_hit_mean: mean(rows.map((row) => Number(row.misleading_count ?? 0))),
      high_confidence_error_rate:
        rows.length === 0
          ? null
          : countWhere(rows, (row) => row.high_confidence_error === 1) / rows.length,
      confidence_mean: mean(
        rows
          .map((row) => num(row.confidence))
          .filter((value): value is number => value != null)
      ),
      duration_sec_mean: mean(
        rows
          .map((row) => num(row.duration_sec))
          .filter((value): value is number => value != null)
      ),
      reason_char_count_mean: mean(
        rows
          .map((row) => num(row.reason_char_count))
          .filter((value): value is number => value != null)
      ),
      exclusion_reason_char_count_mean: mean(
        rows
          .map((row) => num(row.exclusion_reason_char_count))
          .filter((value): value is number => value != null)
      ),
    }
  })
}

function buildClassSummaryRows(studentRows: Array<Record<string, any>>) {
  const groups = new Map<string, Array<Record<string, any>>>()

  for (const row of studentRows) {
    const key = [row.school_code ?? '', row.grade ?? '', row.class_name ?? ''].join('::')
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return Array.from(groups.entries()).map(([, rows]) => {
    const first = rows[0]

    return {
      school_code: first.school_code,
      grade: first.grade,
      class_name: first.class_name,
      student_count: rows.length,
      main_research_student_count: countWhere(
        rows,
        (row) => row.included_in_main_research === 1 || row.data_use_scope === 'main_research'
      ),
      overall_accuracy_mean: mean(
        rows
          .map((row) => num(row.overall_accuracy))
          .filter((value): value is number => value != null)
      ),
      evidence_accuracy_mean: mean(
        rows
          .map((row) => num(row.evidence_accuracy))
          .filter((value): value is number => value != null)
      ),
      transfer_accuracy_mean: mean(
        rows
          .map((row) => num(row.transfer_accuracy))
          .filter((value): value is number => value != null)
      ),
      transfer_decline_mean: mean(
        rows
          .map((row) => num(row.transfer_decline))
          .filter((value): value is number => value != null)
      ),
      high_quality_rate_mean: mean(
        rows
          .map((row) => num(row.high_quality_rate))
          .filter((value): value is number => value != null)
      ),
      surface_or_misleading_rate_mean: mean(
        rows
          .map((row) => num(row.surface_or_misleading_rate))
          .filter((value): value is number => value != null)
      ),
      high_confidence_error_rate_mean: mean(
        rows
          .map((row) => num(row.high_confidence_error_rate))
          .filter((value): value is number => value != null)
      ),
      diagnostic_hit_mean: mean(
        rows
          .map((row) => num(row.diagnostic_hit_mean))
          .filter((value): value is number => value != null)
      ),
      misleading_hit_mean: mean(
        rows
          .map((row) => num(row.misleading_hit_mean))
          .filter((value): value is number => value != null)
      ),
    }
  })
}

const ITEM_HEADERS = [
  'participant_code',
  'record_id',
  'student_id',
  'school_code',
  'school_year',
  'semester',
  'grade',
  'class_name',
  'seat_no',
  'masked_name',
  'current_stage',
  'is_completed',
  'platform_mode',
  'data_use_scope',
  'learning_experience',
  'learning_experience_label',
  'included_in_main_research',
  'exclusion_reasons',
  'app_version',
  'item_bank_version',
  'rubric_version',
  'stage',
  'question_id',
  'animal_name',
  'final_answer',
  'is_correct',
  'criterion_quality',
  'diagnostic_hit_count',
  'acceptable_hit_count',
  'auxiliary_count',
  'misleading_count',
  'high_confidence_error',
  'primary_feature',
  'secondary_features',
  'selected_features',
  'selected_features_count',
  'confidence',
  'familiarity',
  'learned_before',
  'reason_text',
  'reason_char_count',
  'exclusion_reason_text',
  'exclusion_reason_char_count',
  'duration_ms',
  'duration_sec',
  'entered_at',
  'submitted_at',
  'random_seed',
  'feature_option_version',
  'feature_option_order',
  'feature_options_shown',
  'max_selectable_features',
  'scoring_rubric_version',
  'item_updated_at',
  'record_updated_at',
]

const STUDENT_HEADERS = [
  'record_id',
  'participant_code',
  'student_id',
  'school_code',
  'school_year',
  'semester',
  'grade',
  'class_name',
  'seat_no',
  'masked_name',
  'platform_mode',
  'data_use_scope',
  'learning_experience',
  'learning_experience_label',
  'included_in_main_research',
  'exclusion_reasons',
  'item_count',
  'evidence_item_count',
  'transfer_item_count',
  'overall_accuracy',
  'evidence_accuracy',
  'transfer_accuracy',
  'transfer_decline',
  'high_quality_rate',
  'partial_mastery_rate',
  'surface_or_misleading_rate',
  'unclear_rate',
  'diagnostic_hit_mean',
  'misleading_hit_mean',
  'high_confidence_error_rate',
  'confidence_mean',
  'duration_sec_mean',
  'reason_char_count_mean',
  'exclusion_reason_char_count_mean',
]

const CLASS_HEADERS = [
  'school_code',
  'grade',
  'class_name',
  'student_count',
  'main_research_student_count',
  'overall_accuracy_mean',
  'evidence_accuracy_mean',
  'transfer_accuracy_mean',
  'transfer_decline_mean',
  'high_quality_rate_mean',
  'surface_or_misleading_rate_mean',
  'high_confidence_error_rate_mean',
  'diagnostic_hit_mean',
  'misleading_hit_mean',
]

const RECORD_STATUS_HEADERS = [
  'record_id',
  'participant_code',
  'student_id',
  'school_code',
  'school_year',
  'semester',
  'grade',
  'class_name',
  'seat_no',
  'masked_name',
  'current_stage',
  'is_completed',
  'platform_mode',
  'data_use_scope',
  'learning_experience',
  'learning_experience_label',
  'included_in_main_research',
  'exclusion_reasons',
  'app_version',
  'item_bank_version',
  'rubric_version',
  'updated_at',
]

const ROSTER_CLASS_HEADERS = [
  'school_code',
  'grade',
  'class_name',
  'student_count',
  'active_student_count',
  'inactive_student_count',
  'first_created_at',
  'latest_updated_at',
]

const ROSTER_SCHOOL_HEADERS = [
  'school_code',
  'class_count',
  'student_count',
  'active_student_count',
  'inactive_student_count',
  'latest_updated_at',
]

const VALID_KINDS: ExportKind[] = [
  'item_level_latest',
  'student_summary',
  'class_summary',
  'record_status',
  'roster_class_summary',
  'roster_school_summary',
]

export async function GET(req: NextRequest) {
  try {
    const auth = assertAdmin(req)
    if (!auth.ok) return auth.response

    const url = new URL(req.url)
    const kind = (url.searchParams.get('kind') ?? 'item_level_latest') as ExportKind

    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: '未知的匯出類型。' }, { status: 400 })
    }

    const admin = adminClient()

    if (kind === 'record_status') {
      return csvResponse(
        toCsv(await buildRecordStatusRows(admin, url.searchParams), RECORD_STATUS_HEADERS),
        `record_status_${new Date().toISOString().slice(0, 10)}.csv`
      )
    }

    if (kind === 'roster_class_summary') {
      return csvResponse(
        toCsv(await buildRosterClassSummaryRows(admin, url.searchParams), ROSTER_CLASS_HEADERS),
        `roster_class_summary_${new Date().toISOString().slice(0, 10)}.csv`
      )
    }

    if (kind === 'roster_school_summary') {
      return csvResponse(
        toCsv(await buildRosterSchoolSummaryRows(admin, url.searchParams), ROSTER_SCHOOL_HEADERS),
        `roster_school_summary_${new Date().toISOString().slice(0, 10)}.csv`
      )
    }

    const itemRows = await buildItemLevelRows(admin, url.searchParams)

    if (kind === 'item_level_latest') {
      return csvResponse(
        toCsv(itemRows, ITEM_HEADERS),
        `item_level_latest_${new Date().toISOString().slice(0, 10)}.csv`
      )
    }

    const studentRows = buildStudentSummaryRows(itemRows)

    if (kind === 'student_summary') {
      return csvResponse(
        toCsv(studentRows, STUDENT_HEADERS),
        `student_summary_${new Date().toISOString().slice(0, 10)}.csv`
      )
    }

    return csvResponse(
      toCsv(buildClassSummaryRows(studentRows), CLASS_HEADERS),
      `class_summary_${new Date().toISOString().slice(0, 10)}.csv`
    )
  } catch (error) {
    console.error('admin research export error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '研究資料匯出失敗',
      },
      { status: 500 }
    )
  }
}
