import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getTeacherAuthFromRequest,
  recordMatchesTeacherAssignments,
} from '../../../../lib/teacherAuth'

export const dynamic = 'force-dynamic'

type ParsedRosterRow = {
  rowNumber: number
  seatNo: number
  studentName: string
  note: string | null
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
    : ''
}

function maskName(name: string) {
  const chars = Array.from(name.trim())
  if (chars.length === 0) return ''
  if (chars.length === 1) return `${chars[0]}O`
  if (chars.length === 2) return `${chars[0]}O`
  return `${chars[0]}O${chars[chars.length - 1]}`
}

function splitLine(line: string) {
  if (line.includes('\t')) return line.split('\t').map((item) => item.trim())
  if (line.includes(',')) return line.split(',').map((item) => item.trim())
  return line.split(/\s+/).map((item) => item.trim())
}

function parseRosterText(text: string) {
  const errors: Array<{ row: number; message: string }> = []
  const rows: ParsedRosterRow[] = []
  const seenSeatNo = new Set<number>()

  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  lines.forEach((line, index) => {
    const rowNumber = index + 1
    const cells = splitLine(line)

    const firstCell = cells[0] ?? ''
    const looksLikeHeader =
      rowNumber === 1 &&
      !/^\d+$/.test(firstCell) &&
      /座號|seat|seat_no/i.test(line)

    if (looksLikeHeader) return

    const seatNo = Number(firstCell)
    const studentName = normalizeString(cells[1])
    const note = cells.slice(2).join(' ').trim() || null

    if (!Number.isInteger(seatNo) || seatNo <= 0) {
      errors.push({ row: rowNumber, message: '座號必須是正整數。' })
      return
    }

    if (!studentName) {
      errors.push({ row: rowNumber, message: '學生姓名不可空白。' })
      return
    }

    if (seenSeatNo.has(seatNo)) {
      errors.push({ row: rowNumber, message: `座號 ${seatNo} 在貼上名單中重複。` })
      return
    }

    seenSeatNo.add(seatNo)

    rows.push({
      rowNumber,
      seatNo,
      studentName,
      note,
    })
  })

  return { rows, errors }
}

export async function POST(req: NextRequest) {
  try {
    const admin = adminClient()
    const teacherAuth = await getTeacherAuthFromRequest(req, admin)

    if (!teacherAuth) {
      return NextResponse.json(
        { error: '教師尚未登入或登入已過期。' },
        { status: 401 }
      )
    }

    const body = await req.json()

    const schoolCode = normalizeString(body.schoolCode)
    const grade = normalizeString(body.grade)
    const className = normalizeString(body.className)
    const text = normalizeString(body.text)
    const mode = body.mode === 'replace' ? 'replace' : 'upsert'

    const gradeNumber = Number(grade)

    if (!schoolCode || !grade || !className) {
      return NextResponse.json(
        { error: '缺少學校、年級或班級。' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(gradeNumber)) {
      return NextResponse.json(
        { error: '年級必須是整數。' },
        { status: 400 }
      )
    }

    if (!text) {
      return NextResponse.json(
        { error: '請貼上學生名單。' },
        { status: 400 }
      )
    }

    const authorized = recordMatchesTeacherAssignments(
      {
        school_code: schoolCode,
        grade: String(gradeNumber),
        class_name: className,
      },
      teacherAuth.assignments
    )

    if (!authorized) {
      return NextResponse.json(
        { error: '此教師帳號沒有管理該班級的權限。' },
        { status: 403 }
      )
    }

    const parsed = parseRosterText(text)

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        {
          error: '名單格式有誤，請修正後再匯入。',
          errors: parsed.errors,
          summary: {
            totalRows: parsed.rows.length + parsed.errors.length,
            validRows: parsed.rows.length,
            errorRows: parsed.errors.length,
          },
        },
        { status: 400 }
      )
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: '沒有可匯入的學生資料。' },
        { status: 400 }
      )
    }

    const { data: existingRows, error: existingError } = await admin
      .from('student_roster')
      .select('seat_no')
      .eq('school_code', schoolCode)
      .eq('grade', gradeNumber)
      .eq('class_name', className)

    if (existingError) throw new Error(existingError.message)

    const existingSeatNos = new Set(
      (existingRows ?? []).map((row: any) => Number(row.seat_no))
    )

    if (mode === 'replace') {
      const { error: deactivateError } = await admin
        .from('student_roster')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('school_code', schoolCode)
        .eq('grade', gradeNumber)
        .eq('class_name', className)

      if (deactivateError) throw new Error(deactivateError.message)
    }

    const now = new Date().toISOString()

    const upsertRows = parsed.rows.map((row) => ({
      school_code: schoolCode,
      grade: gradeNumber,
      class_name: className,
      seat_no: row.seatNo,
      student_name: row.studentName,
      masked_name: maskName(row.studentName),
      is_active: true,
      note: row.note,
      updated_at: now,
    }))

    const { error: upsertError } = await admin
      .from('student_roster')
      .upsert(upsertRows, {
        onConflict: 'school_code,grade,class_name,seat_no',
      })

    if (upsertError) throw new Error(upsertError.message)

    const insertedRows = parsed.rows.filter(
      (row) => !existingSeatNos.has(row.seatNo)
    ).length

    const updatedRows = parsed.rows.length - insertedRows

    return NextResponse.json({
      ok: true,
      mode,
      summary: {
        totalRows: parsed.rows.length,
        validRows: parsed.rows.length,
        errorRows: 0,
        insertedRows,
        updatedRows,
        deactivatedBeforeImport: mode === 'replace' ? existingSeatNos.size : 0,
      },
    })
  } catch (error) {
    console.error('teacher-roster import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '匯入學生名單失敗' },
      { status: 500 }
    )
  }
}
