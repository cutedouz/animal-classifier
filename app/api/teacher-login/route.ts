import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  TEACHER_SESSION_COOKIE,
  TEACHER_SESSION_HOURS,
  createTeacherSessionToken,
  hashSessionToken,
  teacherCookieOptions,
  verifyTeacherPassword,
} from '../../../lib/teacherAuth'

export const dynamic = 'force-dynamic'

function normalizeIdentifier(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase env missing' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const identifier = normalizeIdentifier(body.identifier)
    const password = typeof body.password === 'string' ? body.password : ''

    if (!identifier || !password) {
      return NextResponse.json(
        { error: '請輸入教師帳號與密碼。' },
        { status: 400 }
      )
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: byUsername, error: usernameError } = await admin
      .from('teacher_accounts')
      .select('id, username, email, display_name, password_hash, is_active')
      .eq('username', identifier)
      .maybeSingle()

    if (usernameError) {
      return NextResponse.json({ error: usernameError.message }, { status: 500 })
    }

    let teacher = byUsername

    if (!teacher && identifier.includes('@')) {
      const { data: byEmail, error: emailError } = await admin
        .from('teacher_accounts')
        .select('id, username, email, display_name, password_hash, is_active')
        .eq('email', identifier)
        .maybeSingle()

      if (emailError) {
        return NextResponse.json({ error: emailError.message }, { status: 500 })
      }

      teacher = byEmail
    }

    if (!teacher || teacher.is_active !== true) {
      return NextResponse.json(
        { error: '教師帳號或密碼不正確。' },
        { status: 401 }
      )
    }

    const passwordOk = verifyTeacherPassword(
      password,
      String(teacher.password_hash ?? '')
    )

    if (!passwordOk) {
      return NextResponse.json(
        { error: '教師帳號或密碼不正確。' },
        { status: 401 }
      )
    }

    const token = createTeacherSessionToken()
    const sessionTokenHash = hashSessionToken(token)
    const expiresAt = new Date(
      Date.now() + TEACHER_SESSION_HOURS * 60 * 60 * 1000
    ).toISOString()

    const { error: sessionError } = await admin
      .from('teacher_sessions')
      .insert({
        teacher_id: teacher.id,
        session_token_hash: sessionTokenHash,
        expires_at: expiresAt,
      })

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    const response = NextResponse.json({
      ok: true,
      teacher: {
        id: teacher.id,
        username: teacher.username ?? null,
        email: teacher.email ?? null,
        displayName: teacher.display_name ?? '未命名教師',
      },
      expiresAt,
    })

    response.cookies.set(
      TEACHER_SESSION_COOKIE,
      token,
      teacherCookieOptions()
    )

    return response
  } catch (error) {
    console.error('teacher-login error:', error)
    return NextResponse.json(
      { error: '教師登入失敗，請稍後再試。' },
      { status: 500 }
    )
  }
}
