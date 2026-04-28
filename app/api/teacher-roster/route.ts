import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTeacherAuthFromRequest } from '../../../lib/teacherAuth'

export const dynamic = 'force-dynamic'

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase env missing')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

function toGradeNumber(value: string | null) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(req: NextRequest) {
  try {
    const admin = adminClient()
    const teacherAuth = await getTeacherAuthFromRequest(req, admin)

    if (!teacherAuth) {
      return NextResponse.json(
        { error: '教師尚未登入或登入已過期。' },
        { status: 401 }
      )
    }

    const classes = []

    for (const assignment of teacherAuth.assignments) {
      let query = admin
        .from('student_roster')
        .select('id, school_code, grade, class_name, seat_no, student_name, masked_name, is_active, note, created_at, updated_at')
        .eq('school_code', assignment.school_code)
        .eq('class_name', assignment.class_name)
        .order('seat_no', { ascending: true })

      const gradeNumber = toGradeNumber(assignment.grade)
      if (gradeNumber !== null) {
        query = query.eq('grade', gradeNumber)
      }

      const { data, error } = await query

      if (error) throw new Error(error.message)

      classes.push({
        schoolCode: assignment.school_code,
        schoolName: assignment.school_name ?? assignment.school_code,
        grade: assignment.grade,
        className: assignment.class_name,
        students: (data ?? []).map((row: any) => ({
          id: row.id,
          schoolCode: row.school_code,
          grade: String(row.grade),
          className: row.class_name,
          seatNo: String(row.seat_no),
          studentName: row.student_name,
          maskedName: row.masked_name,
          isActive: row.is_active,
          note: row.note,
          updatedAt: row.updated_at,
        })),
      })
    }

    return NextResponse.json({
      ok: true,
      teacher: teacherAuth.teacher,
      classes,
    })
  } catch (error) {
    console.error('teacher-roster GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '讀取教師學生名單失敗' },
      { status: 500 }
    )
  }
}
