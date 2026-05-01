import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase env missing')
  return createClient(supabaseUrl, serviceRoleKey)
}

function assertAdmin(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return NextResponse.json({ error: 'ADMIN_PASSWORD 尚未設定。' }, { status: 500 })
  const provided = req.headers.get('x-admin-password') || ''
  if (!provided || provided !== expected) return NextResponse.json({ error: '管理密碼不正確。' }, { status: 401 })
  return null
}

async function safeCount(admin: any, table: string, filter?: (query: any) => any) {
  let query = admin.from(table).select('*', { count: 'exact', head: true })
  if (filter) query = filter(query)
  const { count, error } = await query
  if (error) return { count: null, error: error.message }
  return { count: count ?? 0, error: null }
}

export async function GET(req: NextRequest) {
  try {
    const authError = assertAdmin(req)
    if (authError) return authError

    const admin = adminClient()
    const [
      schools,
      teachers,
      superTeachers,
      pendingApplications,
      totalApplications,
      rosterStudents,
      records,
      rosterRows,
    ] = await Promise.all([
      safeCount(admin, 'school_directory'),
      safeCount(admin, 'teacher_accounts'),
      safeCount(admin, 'teacher_accounts', (q) => q.eq('is_super_admin', true)),
      safeCount(admin, 'teacher_applications', (q) => q.eq('status', 'pending')),
      safeCount(admin, 'teacher_applications'),
      safeCount(admin, 'student_roster', (q) => q.eq('is_active', true)),
      safeCount(admin, 'learning_records'),
      admin.from('student_roster').select('school_code, grade, class_name').eq('is_active', true).range(0, 9999),
    ])

    const classKeys = new Set<string>()
    for (const row of rosterRows.data ?? []) {
      classKeys.add(`${row.school_code ?? ''}::${row.grade ?? ''}::${row.class_name ?? ''}`)
    }

    return NextResponse.json({
      ok: true,
      summary: {
        schoolCount: schools.count,
        teacherCount: teachers.count,
        superTeacherCount: superTeachers.count,
        pendingApplicationCount: pendingApplications.count,
        totalApplicationCount: totalApplications.count,
        activeRosterStudentCount: rosterStudents.count,
        rosterClassCount: classKeys.size,
        learningRecordCount: records.count,
      },
      errors: [
        schools.error,
        teachers.error,
        superTeachers.error,
        pendingApplications.error,
        totalApplications.error,
        rosterStudents.error,
        records.error,
        rosterRows.error?.message,
      ].filter(Boolean),
    })
  } catch (error) {
    console.error('admin overview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '讀取管理中心失敗。' },
      { status: 500 }
    )
  }
}
