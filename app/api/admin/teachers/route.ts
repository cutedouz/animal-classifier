import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashTeacherPassword } from '../../../../lib/teacherAuth'

export const dynamic = 'force-dynamic'

type AssignmentInput = {
  schoolCode: string
  schoolName?: string | null
  grade?: string | null
  className: string
}

function getAdminPassword(req: NextRequest, body?: any) {
  return (
    req.headers.get('x-admin-password') ||
    (typeof body?.adminPassword === 'string' ? body.adminPassword : '')
  )
}

function assertAdmin(req: NextRequest, body?: any) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'ADMIN_PASSWORD 尚未設定。請先在 .env.local 設定管理密碼。' },
        { status: 500 }
      ),
    }
  }

  const provided = getAdminPassword(req, body)
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

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase env missing')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function normalizeAssignment(value: any): AssignmentInput | null {
  const schoolCode = normalizeString(value?.schoolCode)
  const className = normalizeString(value?.className)

  if (!schoolCode || !className) return null

  return {
    schoolCode,
    schoolName: normalizeString(value?.schoolName) ?? schoolCode,
    grade: normalizeString(value?.grade),
    className,
  }
}

async function loadTeachers(admin: any) {
  const { data: teachers, error: teacherError } = await admin
    .from('teacher_accounts')
    .select('id, username, email, display_name, is_active, note, created_at, updated_at')
    .order('display_name', { ascending: true })

  if (teacherError) throw new Error(teacherError.message)

  const { data: assignments, error: assignmentError } = await admin
    .from('teacher_class_assignments')
    .select('id, teacher_id, school_code, school_name, grade, class_name, is_active, created_at, updated_at')
    .order('school_code', { ascending: true })
    .order('class_name', { ascending: true })

  if (assignmentError) throw new Error(assignmentError.message)

  const assignmentMap = new Map<string, any[]>()
  for (const assignment of assignments ?? []) {
    const key = String(assignment.teacher_id)
    assignmentMap.set(key, [...(assignmentMap.get(key) ?? []), assignment])
  }

  return (teachers ?? []).map((teacher: any) => ({
    id: teacher.id,
    username: teacher.username,
    email: teacher.email,
    displayName: teacher.display_name,
    isActive: teacher.is_active,
    note: teacher.note,
    createdAt: teacher.created_at,
    updatedAt: teacher.updated_at,
    assignments: assignmentMap.get(String(teacher.id)) ?? [],
  }))
}

async function loadAvailableClasses(admin: any) {
  // 教師授權班級不應主要來自 learning_records。
  // learning_records 會混入課程體驗、demo、manual 測試資料，造成授權清單污染。
  // 正式授權清單改由：
  // 1. student_roster：已有正式學生名單的班級
  // 2. teacher_class_assignments：已由申請審核或管理員建立過的授權班級
  // 共同產生。

  const [rosterResult, assignmentResult] = await Promise.all([
    admin
      .from('student_roster')
      .select('school_code, grade, class_name')
      .eq('is_active', true)
      .order('school_code', { ascending: true })
      .order('class_name', { ascending: true }),
    admin
      .from('teacher_class_assignments')
      .select('school_code, school_name, grade, class_name')
      .eq('is_active', true)
      .order('school_code', { ascending: true })
      .order('class_name', { ascending: true }),
  ])

  if (rosterResult.error) throw new Error(rosterResult.error.message)
  if (assignmentResult.error) throw new Error(assignmentResult.error.message)

  const seen = new Set<string>()
  const classes: Array<{
    schoolCode: string
    schoolName: string | null
    grade: string | null
    className: string
  }> = []

  function addClass(row: any, fallbackSchoolName?: string | null) {
    const schoolCode = normalizeString(row.school_code)
    const className = normalizeString(row.class_name)
    if (!schoolCode || !className) return

    const grade = normalizeString(row.grade)
    const schoolName = normalizeString(row.school_name) ?? fallbackSchoolName ?? schoolCode
    const key = `${schoolCode}::${grade ?? ''}::${className}`
    if (seen.has(key)) return
    seen.add(key)

    classes.push({
      schoolCode,
      schoolName,
      grade,
      className,
    })
  }

  for (const row of rosterResult.data ?? []) {
    addClass(row, row.school_code)
  }

  for (const row of assignmentResult.data ?? []) {
    addClass(row, row.school_name ?? row.school_code)
  }

  return classes
}


export async function GET(req: NextRequest) {
  try {
    const auth = assertAdmin(req)
    if (!auth.ok) return auth.response

    const admin = adminClient()
    const [teachers, availableClasses] = await Promise.all([
      loadTeachers(admin),
      loadAvailableClasses(admin),
    ])

    return NextResponse.json({
      ok: true,
      teachers,
      availableClasses,
    })
  } catch (error) {
    console.error('admin teachers GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '讀取教師資料失敗' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const auth = assertAdmin(req, body)
    if (!auth.ok) return auth.response

    const username = normalizeString(body.username)
    const email = normalizeString(body.email)
    const displayName = normalizeString(body.displayName)
    const password = typeof body.password === 'string' ? body.password : ''
    const note = normalizeString(body.note)
    const isActive = body.isActive !== false

    if (!username) {
      return NextResponse.json({ error: '請輸入教師帳號。' }, { status: 400 })
    }
    if (!displayName) {
      return NextResponse.json({ error: '請輸入教師姓名。' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '教師密碼至少需 6 個字元。' }, { status: 400 })
    }

    const admin = adminClient()
    const passwordHash = hashTeacherPassword(password)

    const { data: teacher, error: insertError } = await admin
      .from('teacher_accounts')
      .insert({
        username,
        email,
        display_name: displayName,
        password_hash: passwordHash,
        is_active: isActive,
        note,
        updated_at: new Date().toISOString(),
      })
      .select('id, username, email, display_name, is_active')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: '此教師帳號或 Email 已存在。' },
          { status: 409 }
        )
      }

      throw new Error(insertError.message)
    }

    const assignments = Array.isArray(body.assignments)
      ? body.assignments.map(normalizeAssignment).filter(Boolean)
      : []

    if (assignments.length > 0) {
      const { error: assignmentError } = await admin
        .from('teacher_class_assignments')
        .insert(
          assignments.map((assignment: any) => ({
            teacher_id: teacher.id,
            school_code: assignment.schoolCode,
            school_name: assignment.schoolName,
            grade: assignment.grade,
            class_name: assignment.className,
            is_active: true,
            updated_at: new Date().toISOString(),
          }))
        )

      if (assignmentError) throw new Error(assignmentError.message)
    }

    return NextResponse.json({
      ok: true,
      teacher,
    })
  } catch (error) {
    console.error('admin teachers POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '新增教師失敗' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const auth = assertAdmin(req, body)
    if (!auth.ok) return auth.response

    const action = normalizeString(body.action)
    const teacherId = normalizeString(body.teacherId)

    if (!teacherId) {
      return NextResponse.json({ error: '缺少 teacherId。' }, { status: 400 })
    }

    const admin = adminClient()

    if (action === 'reset_password') {
      const password = typeof body.password === 'string' ? body.password : ''
      if (password.length < 6) {
        return NextResponse.json({ error: '新密碼至少需 6 個字元。' }, { status: 400 })
      }

      const { error } = await admin
        .from('teacher_accounts')
        .update({
          password_hash: hashTeacherPassword(password),
          updated_at: new Date().toISOString(),
        })
        .eq('id', teacherId)

      if (error) throw new Error(error.message)

      await admin.from('teacher_sessions').delete().eq('teacher_id', teacherId)

      return NextResponse.json({ ok: true })
    }

    if (action === 'set_active') {
      const isActive = body.isActive === true

      const { error } = await admin
        .from('teacher_accounts')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', teacherId)

      if (error) throw new Error(error.message)

      if (!isActive) {
        await admin.from('teacher_sessions').delete().eq('teacher_id', teacherId)
      }

      return NextResponse.json({ ok: true })
    }

    if (action === 'replace_assignments') {
      const assignments = Array.isArray(body.assignments)
        ? body.assignments.map(normalizeAssignment).filter(Boolean)
        : []

      const { error: deactivateError } = await admin
        .from('teacher_class_assignments')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('teacher_id', teacherId)

      if (deactivateError) throw new Error(deactivateError.message)

      for (const assignment of assignments as AssignmentInput[]) {
        const { error: upsertError } = await admin
          .from('teacher_class_assignments')
          .upsert(
            {
              teacher_id: teacherId,
              school_code: assignment.schoolCode,
              school_name: assignment.schoolName ?? assignment.schoolCode,
              grade: assignment.grade ?? null,
              class_name: assignment.className,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'teacher_id,school_code,class_name' }
          )

        if (upsertError) throw new Error(upsertError.message)
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: '未知的 action。' }, { status: 400 })
  } catch (error) {
    console.error('admin teachers PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新教師資料失敗' },
      { status: 500 }
    )
  }
}
