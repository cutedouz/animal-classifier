import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  TEACHER_SESSION_COOKIE,
  hashSessionToken,
  teacherExpiredCookieOptions,
} from '../../../lib/teacherAuth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const token = req.cookies.get(TEACHER_SESSION_COOKIE)?.value

    if (supabaseUrl && serviceRoleKey && token) {
      const admin = createClient(supabaseUrl, serviceRoleKey)
      await admin
        .from('teacher_sessions')
        .delete()
        .eq('session_token_hash', hashSessionToken(token))
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(
      TEACHER_SESSION_COOKIE,
      '',
      teacherExpiredCookieOptions()
    )

    return response
  } catch (error) {
    console.error('teacher-logout error:', error)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(
      TEACHER_SESSION_COOKIE,
      '',
      teacherExpiredCookieOptions()
    )
    return response
  }
}
