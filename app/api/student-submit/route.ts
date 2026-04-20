import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const payload = body.payload

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

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}