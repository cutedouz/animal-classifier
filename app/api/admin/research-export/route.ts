import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type ExportKind = 'item_level_latest' | 'student_summary' | 'class_summary'

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase env missing')
  return createClient(supabaseUrl, serviceRoleKey)
}

function assertAdmin(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'ADMIN_PASSWORD 尚未設定。' }, { status: 500 }),
    }
  }
  const provided = req.headers.get('x-admin-password') || ''
  if (!provided || provided !== expected) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: '管理密碼不正確。' }, { status: 401 }),
    }
  }
  return { ok: true as const }
}

function clean(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function bool01(value: unknown) {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value === 1 || value === 0) return value
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
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(',')),
  ].join('\n')
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

function payloadInfo(payload: any) {
  const p = payload && typeof payload === 'object' ? payload : {}
  const background = p.researchBackground && typeof p.researchBackground === 'object'
    ? p.researchBackground
    : {}
  const flags = p.dataQualityFlags && typeof p.dataQualityFlags === 'object'
    ? p.dataQualityFlags
    : {}

  return {
    platform_mode: clean(p.platformMode) ?? clean(p.researchMode) ?? null,
    data_use_scope: clean(p.dataUseScope) ?? clean(p.researchDataUseScope) ?? null,
    learning_experience:
      clean(p.learningExperience) ??
      clean(p.learningExperienceCode) ??
      clean(p.animalClassificationExperience) ??
      clean(background.animalClassificationExperience) ??
      null,
    learning_experience_label:
      clean(p.learningExperienceLabel) ??
      clean(p.animalClassificationExperienceLabel) ??
      clean(background.animalClassificationExperience) ??
      null,
    included_in_main_research:
      typeof flags.includedInMainResearch === 'boolean'
        ? flags.includedInMainResearch
        : null,
    exclusion_reasons: Array.isArray(flags.exclusionReasons)
      ? flags.exclusionReasons.join('|')
      : null,
    app_version: clean(p.version),
    item_bank_version: clean(p.itemBankVersion) ?? clean(p.item_bank_version),
    rubric_version: clean(p.rubricVersion) ?? clean(p.scoringRubricVersion),
  }
}

function mean(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function rate(values: Array<boolean | null>) {
  const valid = values.filter((value): value is boolean => typeof value === 'boolean')
  if (valid.length === 0) return null
  return valid.filter(Boolean).length / valid.length
}

function passFilters(row: Record<string, unknown>, params: URLSearchParams) {
  const schoolCode = clean(params.get('schoolCode'))
  const grade = clean(params.get('grade'))
  const className = clean(params.get('className'))
  const stage = clean(params.get('stage'))
  if (schoolCode && row.school_code !== schoolCode) return false
  if (grade && String(row.grade ?? '') !== grade) return false
  if (className && row.class_name !== className) return false
  if (stage && row.stage !== stage) return false
  return true
}

async function loadLatestItems(admin: any) {
  const { data, error } = await admin
    .from('latest_learning_item_logs')
    .select('*')
    .order('participant_code', { ascending: true })
    .order('stage', { ascending: true })
    .order('question_id', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

async function loadRecordMap(admin: any, recordIds: string[]) {
  const map = new Map<string, any>()
  if (recordIds.length === 0) return map

  const chunkSize = 500
  for (let start = 0; start < recordIds.length; start += chunkSize) {
    const chunk = recordIds.slice(start, start + chunkSize)
    const { data, error } = await admin
      .from('learning_records')
      .select('id, participant_code, student_id, school_code, school_year, semester, grade, class_name, seat_no, masked_name, current_stage, is_completed, version, updated_at, payload')
      .in('id', chunk)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) map.set(String(row.id), row)
  }
  return map
}

async function buildItemRows(admin: any, params: URLSearchParams) {
  const items = await loadLatestItems(admin)
  const recordIds = Array.from(new Set(items.map((item: any) => clean(item.record_id)).filter(Boolean))) as string[]
  const recordMap = await loadRecordMap(admin, recordIds)

  return items.map((item: any) => {
    const record = item.record_id ? recordMap.get(String(item.record_id)) : null
    const info = payloadInfo(record?.payload)
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
      platform_mode: info.platform_mode,
      data_use_scope: info.data_use_scope,
      learning_experience: info.learning_experience,
      learning_experience_label: info.learning_experience_label,
      included_in_main_research: bool01(info.included_in_main_research),
      exclusion_reasons: info.exclusion_reasons,
      app_version: info.app_version ?? record?.version ?? null,
      item_bank_version: info.item_bank_version,
      rubric_version: info.rubric_version,
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
      duration_sec: toNumber(item.duration_ms) == null ? null : Number(item.duration_ms) / 1000,
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
  }).filter((row: Record<string, unknown>) => passFilters(row, params))
}

function buildStudentRows(itemRows: Array<Record<string, any>>) {
  const groups = new Map<string, Array<Record<string, any>>>()
  for (const row of itemRows) {
    const key = String(row.participant_code ?? '')
    if (!key) continue
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return Array.from(groups.entries()).map(([participantCode, rows]) => {
    const first = rows[0]
    const evidence = rows.filter((row) => row.stage === 'evidence')
    const transfer = rows.filter((row) => row.stage === 'transfer')
    const correct = rows.map((row) => row.is_correct === 1 ? true : row.is_correct === 0 ? false : null)
    const evidenceAcc = rate(evidence.map((row) => row.is_correct === 1 ? true : row.is_correct === 0 ? false : null))
    const transferAcc = rate(transfer.map((row) => row.is_correct === 1 ? true : row.is_correct === 0 ? false : null))

    return {
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
      evidence_item_count: evidence.length,
      transfer_item_count: transfer.length,
      overall_accuracy: rate(correct),
      evidence_accuracy: evidenceAcc,
      transfer_accuracy: transferAcc,
      transfer_decline: evidenceAcc == null || transferAcc == null ? null : evidenceAcc - transferAcc,
      high_quality_rate: rows.length ? rows.filter((row) => row.criterion_quality === 'high_quality').length / rows.length : null,
      partial_mastery_rate: rows.length ? rows.filter((row) => row.criterion_quality === 'partial_mastery').length / rows.length : null,
      surface_or_misleading_rate: rows.length ? rows.filter((row) => row.criterion_quality === 'surface_or_misleading').length / rows.length : null,
      unclear_rate: rows.length ? rows.filter((row) => !row.criterion_quality || row.criterion_quality === 'unclear').length / rows.length : null,
      diagnostic_hit_mean: mean(rows.map((row) => Number(row.diagnostic_hit_count ?? 0))),
      misleading_hit_mean: mean(rows.map((row) => Number(row.misleading_count ?? 0))),
      high_confidence_error_rate: rows.length ? rows.filter((row) => row.high_confidence_error === 1).length / rows.length : null,
      confidence_mean: mean(rows.map((row) => toNumber(row.confidence)).filter((value): value is number => value != null)),
      duration_sec_mean: mean(rows.map((row) => toNumber(row.duration_sec)).filter((value): value is number => value != null)),
      reason_char_count_mean: mean(rows.map((row) => toNumber(row.reason_char_count)).filter((value): value is number => value != null)),
      exclusion_reason_char_count_mean: mean(rows.map((row) => toNumber(row.exclusion_reason_char_count)).filter((value): value is number => value != null)),
    }
  })
}

function buildClassRows(studentRows: Array<Record<string, any>>) {
  const groups = new Map<string, Array<Record<string, any>>>()
  for (const row of studentRows) {
    const key = [row.school_code ?? '', row.grade ?? '', row.class_name ?? ''].join('::')
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  return Array.from(groups.values()).map((rows) => {
    const first = rows[0]
    const values = (field: string) => rows.map((row) => toNumber(row[field])).filter((value): value is number => value != null)
    return {
      school_code: first.school_code,
      grade: first.grade,
      class_name: first.class_name,
      student_count: rows.length,
      main_research_student_count: rows.filter((row) => row.included_in_main_research === 1 || row.data_use_scope === 'main_research').length,
      overall_accuracy_mean: mean(values('overall_accuracy')),
      evidence_accuracy_mean: mean(values('evidence_accuracy')),
      transfer_accuracy_mean: mean(values('transfer_accuracy')),
      transfer_decline_mean: mean(values('transfer_decline')),
      high_quality_rate_mean: mean(values('high_quality_rate')),
      surface_or_misleading_rate_mean: mean(values('surface_or_misleading_rate')),
      high_confidence_error_rate_mean: mean(values('high_confidence_error_rate')),
      diagnostic_hit_mean: mean(values('diagnostic_hit_mean')),
      misleading_hit_mean: mean(values('misleading_hit_mean')),
    }
  })
}

const ITEM_HEADERS = [
  'participant_code','record_id','student_id','school_code','school_year','semester','grade','class_name','seat_no','masked_name','current_stage','is_completed','platform_mode','data_use_scope','learning_experience','learning_experience_label','included_in_main_research','exclusion_reasons','app_version','item_bank_version','rubric_version','stage','question_id','animal_name','final_answer','is_correct','criterion_quality','diagnostic_hit_count','acceptable_hit_count','auxiliary_count','misleading_count','high_confidence_error','primary_feature','secondary_features','selected_features','selected_features_count','confidence','familiarity','learned_before','reason_text','reason_char_count','exclusion_reason_text','exclusion_reason_char_count','duration_ms','duration_sec','entered_at','submitted_at','random_seed','feature_option_version','feature_option_order','feature_options_shown','max_selectable_features','scoring_rubric_version','item_updated_at','record_updated_at'
]

const STUDENT_HEADERS = [
  'participant_code','student_id','school_code','school_year','semester','grade','class_name','seat_no','masked_name','platform_mode','data_use_scope','learning_experience','learning_experience_label','included_in_main_research','exclusion_reasons','item_count','evidence_item_count','transfer_item_count','overall_accuracy','evidence_accuracy','transfer_accuracy','transfer_decline','high_quality_rate','partial_mastery_rate','surface_or_misleading_rate','unclear_rate','diagnostic_hit_mean','misleading_hit_mean','high_confidence_error_rate','confidence_mean','duration_sec_mean','reason_char_count_mean','exclusion_reason_char_count_mean'
]

const CLASS_HEADERS = [
  'school_code','grade','class_name','student_count','main_research_student_count','overall_accuracy_mean','evidence_accuracy_mean','transfer_accuracy_mean','transfer_decline_mean','high_quality_rate_mean','surface_or_misleading_rate_mean','high_confidence_error_rate_mean','diagnostic_hit_mean','misleading_hit_mean'
]

export async function GET(req: NextRequest) {
  try {
    const auth = assertAdmin(req)
    if (!auth.ok) return auth.response

    const url = new URL(req.url)
    const kind = (url.searchParams.get('kind') ?? 'item_level_latest') as ExportKind
    if (!['item_level_latest', 'student_summary', 'class_summary'].includes(kind)) {
      return NextResponse.json({ error: '未知的匯出類型。' }, { status: 400 })
    }

    const admin = adminClient()
    const itemRows = await buildItemRows(admin, url.searchParams)
    const today = new Date().toISOString().slice(0, 10)

    if (kind === 'item_level_latest') {
      return csvResponse(toCsv(itemRows, ITEM_HEADERS), `item_level_latest_${today}.csv`)
    }

    const studentRows = buildStudentRows(itemRows)
    if (kind === 'student_summary') {
      return csvResponse(toCsv(studentRows, STUDENT_HEADERS), `student_summary_${today}.csv`)
    }

    const classRows = buildClassRows(studentRows)
    return csvResponse(toCsv(classRows, CLASS_HEADERS), `class_summary_${today}.csv`)
  } catch (error) {
    console.error('admin research export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '研究資料匯出失敗' },
      { status: 500 }
    )
  }
}
