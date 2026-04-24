import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ParsedRow = {
  school_code: string
  school_name: string
  county: string | null
  sort_order: number | null
  is_active: boolean
}

type RowError = {
  row: number
  message: string
}

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

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const teacherPassword = process.env.TEACHER_DASHBOARD_PASSWORD

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 })
    }

    if (!teacherPassword) {
      return NextResponse.json(
        { error: 'TEACHER_DASHBOARD_PASSWORD missing' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const password = cleanStr(body.password)
    const action = cleanStr(body.action) as 'validate' | 'import'
    const text = String(body.text ?? '')

    if (password !== teacherPassword) {
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

    const requiredHeaders = ['school_code', 'school_name']
    const missingHeaders = requiredHeaders.filter((header) => !headerMap.has(header))

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `缺少必要欄位：${missingHeaders.join(', ')}` },
        { status: 400 }
      )
    }

    const errors: RowError[] = []
    const parsedRows: ParsedRow[] = []
    const seenCodes = new Set<string>()

    rows.forEach((row, rowIndex) => {
      const rowNo = rowIndex + 2

      const school_code = cleanStr(row[headerMap.get('school_code')!])
      const school_name = cleanStr(row[headerMap.get('school_name')!])
      const county = cleanStr(row[headerMap.get('county') ?? -1]) || null
      const sort_order_raw = cleanStr(row[headerMap.get('sort_order') ?? -1])
      const is_active_raw = row[headerMap.get('is_active') ?? -1]

      if (!school_code) {
        errors.push({ row: rowNo, message: 'school_code 不可空白' })
        return
      }

      if (!school_name) {
        errors.push({ row: rowNo, message: 'school_name 不可空白' })
        return
      }

      if (seenCodes.has(school_code)) {
        errors.push({ row: rowNo, message: `同一批資料中 school_code 重複：${school_code}` })
        return
      }

      seenCodes.add(school_code)

      const sort_order =
        sort_order_raw === ''
          ? null
          : Number.isFinite(Number(sort_order_raw))
            ? Number(sort_order_raw)
            : NaN

      if (Number.isNaN(sort_order)) {
        errors.push({ row: rowNo, message: 'sort_order 必須是數字' })
        return
      }

      parsedRows.push({
        school_code,
        school_name,
        county,
        sort_order,
        is_active: parseBoolean(is_active_raw, true),
      })
    })

    const admin = createClient(supabaseUrl, serviceRoleKey)

    if (action === 'validate') {
      return NextResponse.json({
        ok: true,
        action,
        table: 'school_directory',
        summary: {
          totalRows: rows.length,
          validRows: parsedRows.length,
          errorRows: errors.length,
        },
        preview: parsedRows.slice(0, 20),
        errors,
      })
    }

    let insertedRows = 0
    let updatedRows = 0

    for (const item of parsedRows) {
      const { data: existing, error: existingError } = await admin
        .from('school_directory')
        .select('id')
        .eq('school_code', item.school_code)
        .maybeSingle()

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 })
      }

      if (existing?.id) {
        const { error: updateError } = await admin
          .from('school_directory')
          .update({
            school_name: item.school_name,
            county: item.county,
            sort_order: item.sort_order,
            is_active: item.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        updatedRows += 1
      } else {
        const { error: insertError } = await admin
          .from('school_directory')
          .insert({
            school_code: item.school_code,
            school_name: item.school_name,
            county: item.county,
            sort_order: item.sort_order,
            is_active: item.is_active,
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
      table: 'school_directory',
      summary: {
        totalRows: rows.length,
        validRows: parsedRows.length,
        errorRows: errors.length,
        insertedRows,
        updatedRows,
        skippedRows: 0,
      },
      preview: parsedRows.slice(0, 20),
      errors,
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