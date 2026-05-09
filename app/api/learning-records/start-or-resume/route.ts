import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CURRENT_VERSION = 'app-2026-04-28-formal-readiness-neutral-v1'

function getAnsweredTotal(payload: any) {
  return Number(
    payload?.dataQualityFlags?.completeness?.answeredTotalCount ?? 0
  )
}

export async function POST(request: Request) {
  const body = await request.json()

  const {
    studentId,
    schoolCode,
    schoolYear,
    semester,
    grade,
    className,
    seatNo,
    maskedName,
    entrySession,
  } = body

  if (!studentId || !schoolYear || !semester || !className || !seatNo) {
    return NextResponse.json(
      { ok: false, error: 'missing required fields' },
      { status: 400 }
    )
  }

  const { data: records, error } = await supabase
    .from('learning_records')
    .select('*')
    .eq('student_id', studentId)
    .eq('school_year', schoolYear)
    .eq('semester', semester)
    .eq('version', CURRENT_VERSION)
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }

  const existingRecords = records ?? []

  const completed = existingRecords
    .filter((record) => record.is_completed === true)
    .sort((a, b) => {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })[0]

  if (completed) {
    return NextResponse.json({
      ok: true,
      mode: 'completed_found',
      submissionKey: completed.submission_key,
      record: completed,
    })
  }

  const active = existingRecords
    .filter((record) => record.attempt_status === 'active')
    .filter((record) => getAnsweredTotal(record.payload) > 0)
    .sort((a, b) => {
      const answeredDiff =
        getAnsweredTotal(b.payload) - getAnsweredTotal(a.payload)

      if (answeredDiff !== 0) return answeredDiff

      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })[0]

  if (active) {
    const now = new Date().toISOString()

    await supabase
      .from('learning_records')
      .update({
        last_resumed_at: now,
      })
      .eq('id', active.id)

    return NextResponse.json({
      ok: true,
      mode: 'resume',
      submissionKey: active.submission_key,
      record: active,
    })
  }

  const enteredAt = new Date().toISOString()
  const submissionKey = `${studentId}:${enteredAt}`

  const initialPayload = {
    participant: {
      ...entrySession,
      studentId,
      schoolCode,
      schoolYear,
      semester,
      grade,
      className,
      seatNo,
      maskedName,
      enteredAt,
    },
    evidenceResponses: [],
    transferResponses: [],
    evidenceItemLogs: [],
    transferItemLogs: [],
    dataQualityFlags: {
      completeness: {
        evidenceAnsweredCount: 0,
        transferAnsweredCount: 0,
        answeredTotalCount: 0,
        expectedTotalCount: 12,
        allFormalItemsCompleted: false,
      },
    },
  }

  const { data: created, error: createError } = await supabase
    .from('learning_records')
    .insert({
      participant_code: studentId,
      student_id: studentId,
      school_code: schoolCode,
      school_year: schoolYear,
      semester,
      grade,
      class_name: className,
      seat_no: seatNo,
      masked_name: maskedName,
      payload: initialPayload,
      submission_key: submissionKey,
      current_stage: 'stage1',
      is_completed: false,
      version: CURRENT_VERSION,
      attempt_status: 'abandoned',
    })
    .select('*')
    .single()

  if (createError) {
    return NextResponse.json(
      { ok: false, error: createError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    mode: 'new',
    submissionKey,
    record: created,
  })
}
