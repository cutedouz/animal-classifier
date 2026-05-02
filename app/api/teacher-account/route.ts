import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  TEACHER_SESSION_COOKIE,
  getTeacherAuthFromRequest,
  hashTeacherPassword,
  teacherExpiredCookieOptions,
  verifyTeacherPassword,
} from '../../../lib/teacherAuth'

export const dynamic = 'force-dynamic'

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase env missing')
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function GET(req: NextRequest) {
  try {
    const admin = adminClient()
    const auth = await getTeacherAuthFromRequest(req, admin)
    if (!auth) return NextResponse.json({ error: '請先登入教師帳號。' }, { status: 401 })

    return NextResponse.json({
      ok: true,
      teacher: auth.teacher,
      assignments: auth.assignments,
      isSuperAdmin: auth.isSuperAdmin,
    })
  } catch (error) {
    console.error('teacher-account GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '讀取教師帳號資料失敗。' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = adminClient()
    const auth = await getTeacherAuthFromRequest(req, admin)
    if (!auth) return NextResponse.json({ error: '請先登入教師帳號。' }, { status: 401 })

    const body = await req.json()
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : ''

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: '請完整輸入目前密碼、新密碼與確認密碼。' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: '新密碼至少需 8 個字元。' }, { status: 400 })
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: '兩次輸入的新密碼不一致。' }, { status: 400 })
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: '新密碼不可與目前密碼相同。' }, { status: 400 })
    }

    const { data: teacher, error: teacherError } = await admin
      .from('teacher_accounts')
      .select('id, password_hash')
      .eq('id', auth.teacher.id)
      .maybeSingle()

    if (teacherError) throw new Error(teacherError.message)
    if (!teacher?.password_hash) {
      return NextResponse.json({ error: '找不到教師帳號密碼資料。' }, { status: 404 })
    }

    const passwordOk = verifyTeacherPassword(currentPassword, String(teacher.password_hash))
    if (!passwordOk) {
      return NextResponse.json({ error: '目前密碼不正確。' }, { status: 401 })
    }

    const { error: updateError } = await admin
      .from('teacher_accounts')
      .update({
        password_hash: hashTeacherPassword(newPassword),
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.teacher.id)

    if (updateError) throw new Error(updateError.message)

    await admin.from('teacher_sessions').delete().eq('teacher_id', auth.teacher.id)

    const response = NextResponse.json({
      ok: true,
      message: '密碼已更新，請使用新密碼重新登入。',
    })
    response.cookies.set(TEACHER_SESSION_COOKIE, '', teacherExpiredCookieOptions())
    return response
  } catch (error) {
    console.error('teacher-account PATCH error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新教師密碼失敗。' },
      { status: 500 }
    )
  }
}
