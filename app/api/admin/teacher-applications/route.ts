import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashTeacherPassword } from '../../../../lib/teacherAuth'
import { sendTeacherApprovedEmail } from '../../../../lib/email'

export const dynamic = 'force-dynamic'

const VALID_STATUS = ['pending', 'approved', 'rejected', 'need_more_info'] as const
const USERNAME_RE = /^[a-zA-Z0-9_-]{4,32}$/

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

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeUsername(value: unknown) {
  return clean(value).toLowerCase()
}

function inferGradeFromClassName(className: string) {
  const first = className.trim().charAt(0)
  return /^\d$/.test(first) ? first : null
}

function parseClassNames(text: string) {
  return Array.from(
    new Set(
      text
        .split(/\n|,|、|;/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

async function ensureSchoolDirectory(admin: any, input: {
  schoolCode: string
  schoolName: string
  county: string | null
}) {
  const { data: existing, error: existingError } = await admin
    .from('school_directory')
    .select('id, school_code, school_name')
    .eq('school_code', input.schoolCode)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing) return existing

  const { data: sortRows, error: sortError } = await admin
    .from('school_directory')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  if (sortError) throw new Error(sortError.message)

  const nextSortOrder = Number(sortRows?.[0]?.sort_order ?? 0) + 1

  const { data, error } = await admin
    .from('school_directory')
    .insert({
      school_code: input.schoolCode,
      school_name: input.schoolName,
      county: input.county ?? '',
      sort_order: nextSortOrder,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select('id, school_code, school_name')
    .single()

  if (error) throw new Error(error.message)
  return data
}

async function createTeacherFromApplication(admin: any, body: any) {
  const applicationId = clean(body.id)
  const reviewNote = clean(body.reviewNote)
  const submittedPassword = typeof body.password === 'string' ? body.password.trim() : ''
  const usernameOverride = normalizeUsername(body.username)
  const displayNameOverride = clean(body.displayName)
  const schoolCodeOverride = clean(body.schoolCode)
  const schoolNameOverride = clean(body.schoolName)
  const countyOverride = clean(body.county)
  const classNamesOverride = clean(body.classNames)
  // Security: teacher application approval must only create ordinary teacher accounts.
  const isSuperAdmin = false

  if (!applicationId) {
    return NextResponse.json({ error: '缺少申請 ID。' }, { status: 400 })
  }

  const { data: application, error: appError } = await admin
    .from('teacher_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (appError) throw new Error(appError.message)
  if (!application) {
    return NextResponse.json({ error: '找不到教師申請資料。' }, { status: 404 })
  }

  if (application.status === 'approved' && application.created_teacher_id) {
    return NextResponse.json(
      { error: '此申請已核准並建立過教師帳號。' },
      { status: 409 }
    )
  }

  const username = usernameOverride || normalizeUsername(application.requested_username)
  const initialPassword = submittedPassword || username
  const displayName = displayNameOverride || clean(application.teacher_name)
  const email = clean(application.email).toLowerCase()
  const schoolName = schoolNameOverride || clean(application.school_name)
  const schoolCode = schoolCodeOverride || clean(application.school_code) || schoolName
  const county = countyOverride || clean(application.county)
  const classNames = classNamesOverride || clean(application.class_names)
  const parsedClasses = parseClassNames(classNames)

  if (!username || !USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: '教師帳號需為 4–32 個字元，只能包含英文、數字、底線或短橫線。' },
      { status: 400 }
    )
  }

  if (!displayName) {
    return NextResponse.json({ error: '缺少教師姓名。' }, { status: 400 })
  }

  if (!schoolName || !schoolCode) {
    return NextResponse.json({ error: '缺少學校名稱或 school_code。' }, { status: 400 })
  }

  if (parsedClasses.length === 0 && !isSuperAdmin) {
    return NextResponse.json({ error: '至少需要一個授權班級。' }, { status: 400 })
  }

  const { data: existingTeacher, error: existingTeacherError } = await admin
    .from('teacher_accounts')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (existingTeacherError) throw new Error(existingTeacherError.message)
  if (existingTeacher) {
    return NextResponse.json({ error: '此教師帳號已存在，請更換帳號。' }, { status: 409 })
  }

  await ensureSchoolDirectory(admin, {
    schoolCode,
    schoolName,
    county: county || null,
  })

  const { data: teacher, error: teacherError } = await admin
    .from('teacher_accounts')
    .insert({
      username,
      email: email || null,
      display_name: displayName,
      password_hash: hashTeacherPassword(initialPassword),
      is_active: true,
      is_super_admin: false,
      note: `由教師申請核准建立。application_id=${applicationId}`,
      updated_at: new Date().toISOString(),
    })
    .select('id, username, email, display_name, is_active, is_super_admin')
    .single()

  if (teacherError) {
    if (teacherError.code === '23505') {
      return NextResponse.json({ error: '此教師帳號或 Email 已存在。' }, { status: 409 })
    }
    throw new Error(teacherError.message)
  }

  if (!isSuperAdmin) {
    const assignmentRows = parsedClasses.map((className) => ({
      teacher_id: teacher.id,
      school_code: schoolCode,
      school_name: schoolName,
      grade: inferGradeFromClassName(className),
      class_name: className,
      is_active: true,
      updated_at: new Date().toISOString(),
    }))

    const { error: assignmentError } = await admin
      .from('teacher_class_assignments')
      .upsert(assignmentRows, { onConflict: 'teacher_id,school_code,class_name' })

    if (assignmentError) throw new Error(assignmentError.message)
  }

  const combinedReviewNote = [
    reviewNote,
    `已建立教師帳號：${username}`,
    `初始密碼：同教師帳號`,
    `授權班級：${parsedClasses.join('、')}`,
  ]
    .filter(Boolean)
    .join('\n')

  const { data: updatedApplication, error: updateError } = await admin
    .from('teacher_applications')
    .update({
      status: 'approved',
      reviewed_by: 'admin',
      reviewed_at: new Date().toISOString(),
      review_note: combinedReviewNote,
      created_teacher_id: teacher.id,
      school_code: schoolCode,
      school_name: schoolName,
      county: county || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select('*')
    .single()

  if (updateError) throw new Error(updateError.message)

  const emailResult = await sendTeacherApprovedEmail({
    to: email,
    teacherName: displayName,
    username,
    initialPassword,
    schoolName,
    classNames: parsedClasses,
  })

  const emailUpdate = emailResult.sent
    ? {
        approved_email_sent_at: new Date().toISOString(),
        approved_email_message_id: emailResult.id,
        approved_email_error: null,
      }
    : {
        approved_email_error: emailResult.error ?? 'email not sent',
      }

  const { data: finalApplication, error: emailUpdateError } = await admin
    .from('teacher_applications')
    .update({
      ...emailUpdate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select('*')
    .single()

  if (emailUpdateError) {
    console.error('teacher application email status update error:', emailUpdateError.message)
  }

  return NextResponse.json({
    ok: true,
    teacher,
    application: finalApplication ?? updatedApplication,
    createdAssignments: parsedClasses,
    email: emailResult,
    initialPasswordPolicy: 'same_as_username',
  })
}

export async function GET(req: NextRequest) {
  try {
    const authError = assertAdmin(req)
    if (authError) return authError

    const admin = adminClient()
    const status = clean(req.nextUrl.searchParams.get('status'))

    let query = admin
      .from('teacher_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (status && VALID_STATUS.includes(status as any)) query = query.eq('status', status)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, applications: data ?? [] })
  } catch (error) {
    console.error('admin teacher applications GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '讀取教師申請失敗。' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authError = assertAdmin(req)
    if (authError) return authError

    const body = await req.json()
    const action = clean(body.action)

    const admin = adminClient()

    if (action === 'approve_create_account') {
      return await createTeacherFromApplication(admin, body)
    }

    const id = clean(body.id)
    const status = clean(body.status)
    const reviewNote = clean(body.reviewNote)

    if (!id) return NextResponse.json({ error: '缺少申請 ID。' }, { status: 400 })
    if (!VALID_STATUS.includes(status as any)) {
      return NextResponse.json({ error: '申請狀態不正確。' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('teacher_applications')
      .update({
        status,
        review_note: reviewNote || null,
        reviewed_by: 'admin',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, application: data })
  } catch (error) {
    console.error('admin teacher applications PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新教師申請失敗。' },
      { status: 500 }
    )
  }
}
