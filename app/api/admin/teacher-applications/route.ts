import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const VALID_STATUS = ['pending', 'approved', 'rejected', 'need_more_info'] as const

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

export async function GET(req: NextRequest) {
  try {
    const authError = assertAdmin(req)
    if (authError) return authError

    const admin = adminClient()
    const status = clean(req.nextUrl.searchParams.get('status'))

    let query = admin.from('teacher_applications').select('*').order('created_at', { ascending: false }).limit(200)
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
    const id = clean(body.id)
    const status = clean(body.status)
    const reviewNote = clean(body.reviewNote)

    if (!id) return NextResponse.json({ error: '缺少申請 ID。' }, { status: 400 })
    if (!VALID_STATUS.includes(status as any)) {
      return NextResponse.json({ error: '申請狀態不正確。' }, { status: 400 })
    }

    const admin = adminClient()
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
