import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function clean(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase environment variables missing' },
        { status: 500 }
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const body = await req.json()

    const studentId = clean(body.studentId)
    const schoolCode = clean(body.schoolCode)
    const schoolYear = clean(body.schoolYear)
    const semester = clean(body.semester)
    const grade = clean(body.grade)
    const className = clean(body.className)
    const seatNo = clean(body.seatNo)

    let query = admin
      .from('learning_records')
      .select(
        'id, submission_key, participant_code, student_id, school_code, school_year, semester, grade, class_name, seat_no, payload, current_stage, is_completed, updated_at'
      )
      .order('updated_at', { ascending: false })
      .limit(1)

    if (studentId) {
      query = query.eq('student_id', studentId)
    } else {
      if (!schoolCode || !grade || !className || !seatNo) {
        return NextResponse.json({
          found: false,
          reason: 'insufficient_identity',
        })
      }

      query = query
        .eq('school_code', schoolCode)
        .eq('grade', grade)
        .eq('class_name', className)
        .eq('seat_no', seatNo)

      if (schoolYear) query = query.eq('school_year', schoolYear)
      if (semester) query = query.eq('semester', semester)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const record = data?.[0]

    if (!record) {
      return NextResponse.json({ found: false })
    }

    const payload =
      record.payload && typeof record.payload === 'object'
        ? record.payload
        : null

    const progressSnapshot =
      payload &&
      typeof payload === 'object' &&
      'progressSnapshot' in payload
        ? (payload as any).progressSnapshot
        : payload

    return NextResponse.json({
      found: true,
      isCompleted: Boolean(record.is_completed),
      currentStage: record.current_stage,
      submissionKey: record.submission_key,
      participantCode: record.participant_code,
      updatedAt: record.updated_at,
      payload,
      progressSnapshot,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'student resume failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
