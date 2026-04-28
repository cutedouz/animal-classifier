import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ParsedRow = {
  school_code: string
  grade: number
  class_name: string
  seat_no: number
  student_name: string
  masked_name: string
  is_active: boolean
  note: string | null
}

type RowError = {
  row: number
  message: string
}

const STUDENT_TABLE = 'student_roster'
// 如果你的學生名單實體表不是 student_roster，請改成實際表名。

function cleanStr(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeHeader(value: string) {
  return cleanStr(value).replace(/^\uFEFF/, '').toLowerCase()
}

function parseBoolean(value: unknown, defaultValue = true) {
  const v = cleanStr(value).toLowerCase()
  if (!v) return defaultValue
  if (['true', '1', 'yes', 'y'].includes(v)) return true
  if (['false', '0', 'no', 'n'].includes(v)) return false
  return defaultValue
}

function splitLine(line: string, delimiter: string) {
  return line.split(delimiter).map((item) => item.trim())
}

function parseDelimitedText(text: string) {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!cleaned) return { headers: [] as string[], rows: [] as string[][] }

  const lines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] }

  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const headers = splitLine(lines[0], delimiter).map(normalizeHeader)
  const rows = lines.slice(1).map((line) => splitLine(line, delimiter))

  return { headers, rows }
}

function buildStudentKey(item: {
  school_code: string
  grade: number
  class_name: string
  seat_no: number
}) {
  return `${item.school_code}|||${item.grade}|||${item.class_name}|||${item.seat_no}`
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 })
    }

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'ADMIN_PASSWORD missing' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const password = cleanStr(body.password)
    const action = cleanStr(body.action) as 'validate' | 'import'
    const text = String(body.text ?? '')

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!['validate', 'import'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    }

    const { headers, rows } = parseDelimitedText(text)

    if (headers.length === 0) {
      return NextResponse.json({ error: '沒有可解析的資料' }, { status: 400 })
    }

    const headerMap = new Map(headers.map((header, index) => [header, index]))

    const requiredHeaders = [
      'school_code',
      'grade',
      'class_name',
      'seat_no',
      'student_name',
      'masked_name',
    ]
    const missingHeaders = requiredHeaders.filter((header) => !headerMap.has(header))

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `缺少必要欄位：${missingHeaders.join(', ')}` },
        { status: 400 }
      )
    }

    const errors: RowError[] = []
    const parsedRows: ParsedRow[] = []
    const seenKeys = new Set<string>()

    rows.forEach((row, rowIndex) => {
      const rowNo = rowIndex + 2

      const school_code = cleanStr(row[headerMap.get('school_code')!])
      const grade_raw = cleanStr(row[headerMap.get('grade')!])
      const class_name = cleanStr(row[headerMap.get('class_name')!])
      const seat_no_raw = cleanStr(row[headerMap.get('seat_no')!])
      const student_name = cleanStr(row[headerMap.get('student_name')!])
      const masked_name = cleanStr(row[headerMap.get('masked_name')!])
      const is_active_raw = row[headerMap.get('is_active') ?? -1]
      const note = cleanStr(row[headerMap.get('note') ?? -1]) || null

      if (!school_code) {
        errors.push({ row: rowNo, message: 'school_code 不可空白' })
        return
      }

      if (!grade_raw || !Number.isFinite(Number(grade_raw))) {
        errors.push({ row: rowNo, message: 'grade 必須是數字' })
        return
      }

      if (!class_name) {
        errors.push({ row: rowNo, message: 'class_name 不可空白' })
        return
      }

      if (!seat_no_raw || !Number.isFinite(Number(seat_no_raw))) {
        errors.push({ row: rowNo, message: 'seat_no 必須是數字' })
        return
      }

      if (!student_name) {
        errors.push({ row: rowNo, message: 'student_name 不可空白' })
        return
      }

      if (!masked_name) {
        errors.push({ row: rowNo, message: 'masked_name 不可空白' })
        return
      }

      const item: ParsedRow = {
        school_code,
        grade: Number(grade_raw),
        class_name,
        seat_no: Number(seat_no_raw),
        student_name,
        masked_name,
        is_active: parseBoolean(is_active_raw, true),
        note,
      }

      const key = buildStudentKey(item)

      if (seenKeys.has(key)) {
        errors.push({
          row: rowNo,
          message: `同一批資料中學生重複：${school_code} / ${grade_raw} / ${class_name} / ${seat_no_raw}`,
        })
        return
      }

      seenKeys.add(key)
      parsedRows.push(item)
    })

    const admin = createClient(supabaseUrl, serviceRoleKey)

    if (parsedRows.length > 0) {
      const schoolCodes = Array.from(new Set(parsedRows.map((item) => item.school_code)))
      const { data: schools, error: schoolError } = await admin
        .from('school_directory')
        .select('school_code')
        .in('school_code', schoolCodes)

      if (schoolError) {
        return NextResponse.json({ error: schoolError.message }, { status: 500 })
      }

      const schoolSet = new Set((schools ?? []).map((item) => cleanStr(item.school_code)))

      parsedRows.forEach((item, index) => {
        if (!schoolSet.has(item.school_code)) {
          errors.push({
            row: index + 2,
            message: `school_code 不存在於 school_directory：${item.school_code}`,
          })
        }
      })
    }

    const validRowKeys = new Set(
      errors.map((error) => error.row)
    )

    const validRows = parsedRows.filter((_, index) => !validRowKeys.has(index + 2))

    if (action === 'validate') {
      return NextResponse.json({
        ok: true,
        action,
        table: STUDENT_TABLE,
        summary: {
          totalRows: rows.length,
          validRows: validRows.length,
          errorRows: errors.length,
        },
        preview: validRows.slice(0, 20),
        errors: errors.sort((a, b) => a.row - b.row),
      })
    }

    let insertedRows = 0
    let updatedRows = 0

    for (const item of validRows) {
      const { data: existing, error: existingError } = await admin
        .from(STUDENT_TABLE)
        .select('id')
        .eq('school_code', item.school_code)
        .eq('grade', item.grade)
        .eq('class_name', item.class_name)
        .eq('seat_no', item.seat_no)
        .maybeSingle()

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 })
      }

      if (existing?.id) {
        const { error: updateError } = await admin
          .from(STUDENT_TABLE)
          .update({
            student_name: item.student_name,
            masked_name: item.masked_name,
            is_active: item.is_active,
            note: item.note,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        updatedRows += 1
      } else {
        const { error: insertError } = await admin
          .from(STUDENT_TABLE)
          .insert({
            school_code: item.school_code,
            grade: item.grade,
            class_name: item.class_name,
            seat_no: item.seat_no,
            student_name: item.student_name,
            masked_name: item.masked_name,
            is_active: item.is_active,
            note: item.note,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        insertedRows += 1
      }
    }

    return NextResponse.json({
      ok: true,
      action,
      table: STUDENT_TABLE,
      summary: {
        totalRows: rows.length,
        validRows: validRows.length,
        errorRows: errors.length,
        insertedRows,
        updatedRows,
        skippedRows: 0,
      },
      preview: validRows.slice(0, 20),
      errors: errors.sort((a, b) => a.row - b.row),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'unexpected server error',
      },
      { status: 500 }
    )
  }
}