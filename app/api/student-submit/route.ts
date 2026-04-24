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
  reasonText: string
  confidence: number
  isCorrect: boolean | null
}

type IncomingEventLog = {
  stage: string
  questionId?: string | null
  eventType: string
  eventValue?: unknown
  clientTs?: string | null
}

function normalizeItemLog(item: IncomingItemLog) {
  const selectedFeatures = Array.isArray(item.selectedFeatures)
    ? item.selectedFeatures.filter(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    : []

  const reasonText =
    typeof item.reasonText === 'string' && item.reasonText.trim().length > 0
      ? item.reasonText.trim()
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
      ? item.confidence
      : null

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
    reason_text: reasonText,
    reason_char_count: reasonText ? reasonText.length : 0,
    confidence,
    is_correct: typeof item.isCorrect === 'boolean' ? item.isCorrect : null,
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
    const currentStage =
      typeof body.currentStage === 'string' ? body.currentStage : null
    const isCompleted = Boolean(body.isCompleted)

    if (!submissionKey || !participantCode || !payload) {
      return NextResponse.json(
        { error: 'missing submissionKey / participantCode / payload' },
        { status: 400 }
      )
    }

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
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await admin
      .from('learning_records')
      .upsert(record, { onConflict: 'submission_key' })
      .select('id, submission_key')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data?.id) {
      return NextResponse.json(
        { error: 'learning_records upsert succeeded but no record id returned' },
        { status: 500 }
      )
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
      return NextResponse.json({ error: deleteItemError.message }, { status: 500 })
    }

    if (itemRows.length > 0) {
      const { error: insertItemError } = await admin
        .from('learning_item_logs')
        .insert(itemRows)

      if (insertItemError) {
        return NextResponse.json({ error: insertItemError.message }, { status: 500 })
      }
    }

    const { error: deleteEventError } = await admin
      .from('learning_event_logs')
      .delete()
      .eq('record_id', data.id)

    if (deleteEventError) {
      return NextResponse.json({ error: deleteEventError.message }, { status: 500 })
    }

    if (eventRows.length > 0) {
      const { error: insertEventError } = await admin
        .from('learning_event_logs')
        .insert(eventRows)

      if (insertEventError) {
        return NextResponse.json({ error: insertEventError.message }, { status: 500 })
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