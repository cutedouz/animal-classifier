import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

export const TEACHER_SESSION_COOKIE = 'sf_teacher_session'
export const TEACHER_SESSION_HOURS = 8

export type TeacherAssignment = {
  school_code: string
  school_name: string | null
  grade: string | null
  class_name: string
}

export type TeacherAuth = {
  teacher: {
    id: string
    username: string | null
    email: string | null
    displayName: string
  }
  assignments: TeacherAssignment[]
}

function safeString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url')
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createTeacherSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashTeacherPassword(password: string) {
  const salt = randomBytes(16)
  const cost = 16384
  const blockSize = 8
  const parallelization = 1
  const keyLength = 64

  const key = scryptSync(password, salt, keyLength, {
    N: cost,
    r: blockSize,
    p: parallelization,
  })

  return [
    'scrypt',
    String(cost),
    String(blockSize),
    String(parallelization),
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$')
}

export function verifyTeacherPassword(password: string, storedHash: string) {
  try {
    const parts = storedHash.split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false

    const cost = Number(parts[1])
    const blockSize = Number(parts[2])
    const parallelization = Number(parts[3])
    const salt = decodeBase64Url(parts[4])
    const expected = decodeBase64Url(parts[5])

    if (
      !Number.isFinite(cost) ||
      !Number.isFinite(blockSize) ||
      !Number.isFinite(parallelization) ||
      expected.length === 0
    ) {
      return false
    }

    const actual = scryptSync(password, salt, expected.length, {
      N: cost,
      r: blockSize,
      p: parallelization,
    })

    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

export function teacherCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TEACHER_SESSION_HOURS * 60 * 60,
  }
}

export function teacherExpiredCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }
}

export async function getTeacherAuthFromRequest(
  req: NextRequest,
  admin: any
): Promise<TeacherAuth | null> {
  const token = req.cookies.get(TEACHER_SESSION_COOKIE)?.value
  if (!token) return null

  const sessionTokenHash = hashSessionToken(token)

  const { data: session, error: sessionError } = await admin
    .from('teacher_sessions')
    .select('id, teacher_id, expires_at')
    .eq('session_token_hash', sessionTokenHash)
    .maybeSingle()

  if (sessionError || !session?.teacher_id || !session?.expires_at) {
    return null
  }

  if (new Date(String(session.expires_at)).getTime() <= Date.now()) {
    await admin
      .from('teacher_sessions')
      .delete()
      .eq('session_token_hash', sessionTokenHash)

    return null
  }

  const { data: teacher, error: teacherError } = await admin
    .from('teacher_accounts')
    .select('id, username, email, display_name, is_active')
    .eq('id', session.teacher_id)
    .maybeSingle()

  if (teacherError || !teacher || teacher.is_active !== true) {
    return null
  }

  const { data: assignments, error: assignmentError } = await admin
    .from('teacher_class_assignments')
    .select('school_code, school_name, grade, class_name')
    .eq('teacher_id', teacher.id)
    .eq('is_active', true)

  if (assignmentError) return null

  await admin
    .from('teacher_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('session_token_hash', sessionTokenHash)

  return {
    teacher: {
      id: String(teacher.id),
      username: safeString(teacher.username),
      email: safeString(teacher.email),
      displayName: safeString(teacher.display_name) ?? '未命名教師',
    },
    assignments: (assignments ?? [])
      .map((row: any) => ({
        school_code: String(row.school_code ?? ''),
        school_name: safeString(row.school_name),
        grade: safeString(row.grade),
        class_name: String(row.class_name ?? ''),
      }))
      .filter((row: TeacherAssignment) => row.school_code && row.class_name),
  }
}

export function recordMatchesTeacherAssignments(
  record: {
    school_code?: string | null
    grade?: string | null
    class_name?: string | null
  },
  assignments: TeacherAssignment[]
) {
  return assignments.some((assignment) => {
    const schoolMatches = record.school_code === assignment.school_code
    const classMatches = record.class_name === assignment.class_name
    const gradeMatches = !assignment.grade || record.grade === assignment.grade

    return schoolMatches && classMatches && gradeMatches
  })
}
