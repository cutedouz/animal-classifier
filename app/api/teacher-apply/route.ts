import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const USERNAME_RE = /^[a-zA-Z0-9_-]{4,32}$/

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase env missing')
  return createClient(supabaseUrl, serviceRoleKey)
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeUsername(value: unknown) {
  return clean(value).toLowerCase()
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(req: NextRequest) {
  try {
    const admin = adminClient()
    const body = await req.json()

    const requestedUsername = normalizeUsername(body.requestedUsername)
    const teacherName = clean(body.teacherName)
    const email = clean(body.email).toLowerCase()
    const phone = clean(body.phone)
    const county = clean(body.county)
    const schoolName = clean(body.schoolName)
    const subject = clean(body.subject)
    const classNames = clean(body.classNames)
    const purpose = clean(body.purpose)
    const note = clean(body.note)
    const consentConfirmed = body.consentConfirmed === true
    const estimatedStudentCount =
      typeof body.estimatedStudentCount === 'number' && Number.isFinite(body.estimatedStudentCount)
        ? Math.max(0, Math.round(body.estimatedStudentCount))
        : null

    if (!teacherName) return NextResponse.json({ error: '請填寫教師姓名。' }, { status: 400 })
    if (!email || !validEmail(email)) return NextResponse.json({ error: '請填寫有效的 Email。' }, { status: 400 })
    if (!schoolName) return NextResponse.json({ error: '請填寫任教學校。' }, { status: 400 })
    if (!requestedUsername || !USERNAME_RE.test(requestedUsername)) {
      return NextResponse.json({ error: '帳號需為 4–32 個字元，只能包含英文、數字、底線或短橫線。' }, { status: 400 })
    }
    if (!classNames) return NextResponse.json({ error: '請填寫預計使用班級。' }, { status: 400 })
    if (!consentConfirmed) return NextResponse.json({ error: '請先確認平台使用說明。' }, { status: 400 })

    const { data: existingTeacher, error: teacherError } = await admin
      .from('teacher_accounts')
      .select('id')
      .eq('username', requestedUsername)
      .maybeSingle()

    if (teacherError) throw new Error(teacherError.message)
    if (existingTeacher) {
      return NextResponse.json({ error: '此教師帳號已存在，請改填其他帳號。' }, { status: 409 })
    }

    const { data: existingApplications, error: appCheckError } = await admin
      .from('teacher_applications')
      .select('id, status')
      .eq('requested_username', requestedUsername)
      .in('status', ['pending', 'need_more_info', 'approved'])
      .limit(1)

    if (appCheckError) throw new Error(appCheckError.message)
    if ((existingApplications ?? []).length > 0) {
      return NextResponse.json({ error: '此帳號已有申請紀錄，請改填其他帳號或聯絡管理員。' }, { status: 409 })
    }

    const { data, error } = await admin
      .from('teacher_applications')
      .insert({
        requested_username: requestedUsername,
        teacher_name: teacherName,
        email,
        phone: phone || null,
        county: county || null,
        school_name: schoolName,
        subject: subject || null,
        class_names: classNames,
        estimated_student_count: estimatedStudentCount,
        purpose: purpose || null,
        note: note || null,
        consent_confirmed: consentConfirmed,
        status: 'pending',
      })
      .select('id, requested_username, teacher_name, email, school_name, status, created_at')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({
      ok: true,
      application: {
        id: data.id,
        requestedUsername: data.requested_username,
        teacherName: data.teacher_name,
        email: data.email,
        schoolName: data.school_name,
        status: data.status,
        createdAt: data.created_at,
      },
    })
  } catch (error) {
    console.error('teacher apply error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '教師申請送出失敗。' },
      { status: 500 }
    )
  }
}
