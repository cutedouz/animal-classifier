import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type IncomingItemLog = {
  stage: 'evidence' | 'transfer'
  questionId: string
  animalName: string
  enteredAt: string | null
  submittedAt: string | null
  durationMs: number | null
  finalAnswer: string

  selectedFeatures: string[]
  primaryFeature?: string | null
  secondaryFeatures?: string[]

  featureOptionsShown?: string[]
  featureOptionOrder?: string[]
  randomSeed?: string | null
  maxSelectableFeatures?: number | null
  featureOptionVersion?: string | null

  reasonText: string
  exclusionReasonText?: string | null

  confidence: number
  familiarity?: number | null
  learnedBefore?: 'yes' | 'no' | 'unsure' | string | null

  isCorrect: boolean | null
  criterionQuality?: string | null
  diagnosticHitCount?: number | null
  acceptableHitCount?: number | null
  auxiliaryCount?: number | null
  misleadingCount?: number | null
  highConfidenceError?: boolean | null
  scoringRubricVersion?: string | null
}

type IncomingEventLog = {
  stage: string
  questionId?: string | null
  eventType: string
  eventValue?: unknown
  clientTs?: string | null
}

type SupabaseErrorLike = {
  message?: string
  code?: string
  details?: string
  hint?: string
}

function logSupabaseError(context: string, error: SupabaseErrorLike) {
  console.error(context, {
    message: error.message ?? null,
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  })
}

function databaseWriteErrorResponse() {
  return NextResponse.json(
    { error: 'student-submit database write failed' },
    { status: 500 }
  )
}

function normalizeItemLog(item: IncomingItemLog) {
  const selectedFeatures = Array.isArray(item.selectedFeatures)
    ? item.selectedFeatures.filter(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    : []

  const secondaryFeatures = Array.isArray(item.secondaryFeatures)
    ? item.secondaryFeatures.filter(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    : selectedFeatures.slice(1)

  const featureOptionsShown = Array.isArray(item.featureOptionsShown)
    ? item.featureOptionsShown.filter(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    : []

  const featureOptionOrder = Array.isArray(item.featureOptionOrder)
    ? item.featureOptionOrder.filter(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    : featureOptionsShown

  const reasonText =
    typeof item.reasonText === 'string' && item.reasonText.trim().length > 0
      ? item.reasonText.trim()
      : null

  const exclusionReasonText =
    typeof item.exclusionReasonText === 'string' &&
    item.exclusionReasonText.trim().length > 0
      ? item.exclusionReasonText.trim()
      : null

  const finalAnswer =
    typeof item.finalAnswer === 'string' && item.finalAnswer.trim().length > 0
      ? item.finalAnswer.trim()
      : null

  const durationMs =
    typeof item.durationMs === 'number' &&
    Number.isFinite(item.durationMs) &&
    item.durationMs >= 0
      ? Math.round(item.durationMs)
      : null

  const confidence =
    typeof item.confidence === 'number' && Number.isFinite(item.confidence)
      ? Math.round(item.confidence)
      : null

  const familiarity =
    typeof item.familiarity === 'number' &&
    Number.isFinite(item.familiarity)
      ? Math.round(item.familiarity)
      : null

  const maxSelectableFeatures =
    typeof item.maxSelectableFeatures === 'number' &&
    Number.isFinite(item.maxSelectableFeatures)
      ? Math.round(item.maxSelectableFeatures)
      : null

  const primaryFeature =
    typeof item.primaryFeature === 'string' && item.primaryFeature.trim().length > 0
      ? item.primaryFeature.trim()
      : selectedFeatures[0] ?? null

  const learnedBefore =
    typeof item.learnedBefore === 'string' && item.learnedBefore.trim().length > 0
      ? item.learnedBefore.trim()
      : null

  const criterionQuality =
    typeof item.criterionQuality === 'string' && item.criterionQuality.trim().length > 0
      ? item.criterionQuality.trim()
      : null

  const diagnosticHitCount =
    typeof item.diagnosticHitCount === 'number' && Number.isFinite(item.diagnosticHitCount)
      ? Math.round(item.diagnosticHitCount)
      : 0

  const acceptableHitCount =
    typeof item.acceptableHitCount === 'number' && Number.isFinite(item.acceptableHitCount)
      ? Math.round(item.acceptableHitCount)
      : 0

  const auxiliaryCount =
    typeof item.auxiliaryCount === 'number' && Number.isFinite(item.auxiliaryCount)
      ? Math.round(item.auxiliaryCount)
      : 0

  const misleadingCount =
    typeof item.misleadingCount === 'number' && Number.isFinite(item.misleadingCount)
      ? Math.round(item.misleadingCount)
      : 0

  return {
    stage: item.stage,
    question_id: item.questionId,
    animal_name: item.animalName ?? null,
    entered_at: item.enteredAt ?? null,
    submitted_at: item.submittedAt ?? null,
    duration_ms: durationMs,
    final_answer: finalAnswer,
    selected_features: selectedFeatures,
    selected_features_count: selectedFeatures.length,
    feature_selection_order: featureOptionOrder,
    primary_feature: primaryFeature,
    secondary_features: secondaryFeatures,
    feature_options_shown: featureOptionsShown,
    feature_option_order: featureOptionOrder,
    random_seed:
      typeof item.randomSeed === 'string' && item.randomSeed.trim().length > 0
        ? item.randomSeed.trim()
        : null,
    max_selectable_features: maxSelectableFeatures,
    feature_option_version:
      typeof item.featureOptionVersion === 'string' &&
      item.featureOptionVersion.trim().length > 0
        ? item.featureOptionVersion.trim()
        : null,
    reason_text: reasonText,
    reason_char_count: reasonText ? reasonText.length : 0,
    exclusion_reason_text: exclusionReasonText,
    exclusion_reason_char_count: exclusionReasonText ? exclusionReasonText.length : 0,
    confidence,
    familiarity,
    learned_before: learnedBefore,
    is_correct: typeof item.isCorrect === 'boolean' ? item.isCorrect : null,
    criterion_quality: criterionQuality,
    diagnostic_hit_count: diagnosticHitCount,
    acceptable_hit_count: acceptableHitCount,
    auxiliary_count: auxiliaryCount,
    misleading_count: misleadingCount,
    high_confidence_error:
      typeof item.highConfidenceError === 'boolean' ? item.highConfidenceError : false,
    scoring_rubric_version:
      typeof item.scoringRubricVersion === 'string' &&
      item.scoringRubricVersion.trim().length > 0
        ? item.scoringRubricVersion.trim()
        : null,
    updated_at: new Date().toISOString(),
  }
}


function dedupeItemLogs(items: IncomingItemLog[]) {
  const map = new Map<string, IncomingItemLog>()

  for (const item of items) {
    if (!item?.stage || !item?.questionId) continue
    const key = `${item.stage}__${item.questionId}`
    map.set(key, item)
  }

  return [...map.values()]
}

function getAnsweredTotal(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 0

  const dataQualityFlags = (payload as { dataQualityFlags?: unknown }).dataQualityFlags
  if (!dataQualityFlags || typeof dataQualityFlags !== 'object') return 0

  const completeness = (dataQualityFlags as { completeness?: unknown }).completeness
  if (!completeness || typeof completeness !== 'object') return 0

  const answeredTotalCount = (completeness as { answeredTotalCount?: unknown }).answeredTotalCount
  return typeof answeredTotalCount === 'number' && Number.isFinite(answeredTotalCount)
    ? answeredTotalCount
    : 0
}

function normalizeEventLog(event: IncomingEventLog) {
  return {
    stage:
      typeof event.stage === 'string' && event.stage.trim().length > 0
        ? event.stage.trim()
        : 'unknown',
    question_id:
      typeof event.questionId === 'string' && event.questionId.trim().length > 0
        ? event.questionId.trim()
        : null,
    event_type:
      typeof event.eventType === 'string' && event.eventType.trim().length > 0
        ? event.eventType.trim()
        : 'unknown_event',
    event_value:
      event.eventValue !== undefined ? event.eventValue : null,
    client_ts:
      typeof event.clientTs === 'string' && event.clientTs.trim().length > 0
        ? event.clientTs
        : null,
  }
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL missing' },
        { status: 500 }
      )
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 500 }
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json()

    const submissionKey = String(body.submissionKey ?? '')
    const participantCode = String(body.participantCode ?? '')
    const participant = body.participant ?? {}
    const payload = body.payload ?? {}
    const saveMode = String(body.saveMode ?? 'progress')

    // 研究模式欄位目前先保留在 payload JSON 中，避免因資料庫尚未新增欄位而造成正式送出失敗。
    // 若之後要做 SQL 索引，可再把 payload.platformMode / payload.dataUseScope 等欄位獨立展開到 learning_records。
    const currentStage =
      typeof body.currentStage === 'string' ? body.currentStage : null
    const isCompleted = Boolean(body.isCompleted)

    if (!submissionKey || !participantCode || !payload) {
      return NextResponse.json(
        { error: 'missing submissionKey / participantCode / payload' },
        { status: 400 }
      )
    }

    const answeredTotalCount = getAnsweredTotal(payload)

    const record = {
      submission_key: submissionKey,
      participant_code: participantCode,
      student_id: participant.studentId ?? null,
      school_code: participant.schoolCode ?? null,
      school_year: participant.schoolYear ?? null,
      semester: participant.semester ?? null,
      grade: participant.grade ?? null,
      class_name: participant.className ?? null,
      seat_no: participant.seatNo ?? null,
      masked_name: participant.maskedName ?? null,
      payload,
      current_stage: currentStage,
      is_completed: isCompleted,
      version:
        typeof payload.version === 'string' ? payload.version : null,
      attempt_status: isCompleted
        ? 'completed'
        : answeredTotalCount > 0
          ? 'active'
          : 'abandoned',
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await admin
      .from('learning_records')
      .upsert(record, { onConflict: 'submission_key' })
      .select('id, submission_key')
      .single()

    if (error) {
      logSupabaseError('learning_records upsert failed', error)
      return databaseWriteErrorResponse()
    }

    if (!data?.id) {
      return NextResponse.json(
        { error: 'learning_records upsert succeeded but no record id returned' },
        { status: 500 }
      )
    }

    const shouldWriteNormalizedLogs =
      isCompleted || saveMode === 'submit' || saveMode === 'final'

    if (!shouldWriteNormalizedLogs) {
      return NextResponse.json({
        ok: true,
        data,
        saveMode,
        itemLogCount: 0,
        eventLogCount: 0,
        skippedLogs: true,
      })
    }

    const evidenceItemLogs = Array.isArray(payload?.evidenceItemLogs)
      ? (payload.evidenceItemLogs as IncomingItemLog[])
      : []

    const transferItemLogs = Array.isArray(payload?.transferItemLogs)
      ? (payload.transferItemLogs as IncomingItemLog[])
      : []

    const dedupedLogs = dedupeItemLogs([
      ...evidenceItemLogs,
      ...transferItemLogs,
    ])

    const itemRows = dedupedLogs
      .filter(
        (item) =>
          item &&
          (item.stage === 'evidence' || item.stage === 'transfer') &&
          typeof item.questionId === 'string' &&
          item.questionId.trim().length > 0
      )
      .map((item) => ({
        participant_code: participantCode,
        record_id: data.id,
        ...normalizeItemLog(item),
      }))

    const eventLogs = Array.isArray(payload?.eventLogs)
      ? (payload.eventLogs as IncomingEventLog[])
      : []

    const eventRows = eventLogs
      .filter(
        (event) =>
          event &&
          typeof event.eventType === 'string' &&
          event.eventType.trim().length > 0
      )
      .map((event) => ({
        participant_code: participantCode,
        record_id: data.id,
        ...normalizeEventLog(event),
      }))

    const { error: deleteItemError } = await admin
      .from('learning_item_logs')
      .delete()
      .eq('record_id', data.id)

    if (deleteItemError) {
      logSupabaseError('learning_item_logs delete failed', deleteItemError)
      return databaseWriteErrorResponse()
    }

    if (itemRows.length > 0) {
      const { error: insertItemError } = await admin
        .from('learning_item_logs')
        .insert(itemRows)

      if (insertItemError) {
        logSupabaseError('learning_item_logs insert failed', insertItemError)
        return databaseWriteErrorResponse()
      }
    }

    const { error: deleteEventError } = await admin
      .from('learning_event_logs')
      .delete()
      .eq('record_id', data.id)

    if (deleteEventError) {
      logSupabaseError('learning_event_logs delete failed', deleteEventError)
      return databaseWriteErrorResponse()
    }

    if (eventRows.length > 0) {
      const { error: insertEventError } = await admin
        .from('learning_event_logs')
        .insert(eventRows)

      if (insertEventError) {
        logSupabaseError('learning_event_logs insert failed', insertEventError)
        return databaseWriteErrorResponse()
      }
    }

    return NextResponse.json({
      ok: true,
      data,
      saveMode,
      itemLogCount: itemRows.length,
      eventLogCount: eventRows.length,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}