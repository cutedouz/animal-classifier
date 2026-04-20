import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const teacherPassword = process.env.TEACHER_DASHBOARD_PASSWORD!

const admin = createClient(supabaseUrl, serviceRoleKey)

type DbRow = {
  id: string
  participant_code: string
  student_id: string | null
  school_code: string | null
  school_year: string | null
  semester: string | null
  grade: string | null
  class_name: string | null
  seat_no: string | null
  masked_name: string | null
  payload: any
  created_at: string
  updated_at: string
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const password = String(body.password ?? '')

    if (!teacherPassword || password !== teacherPassword) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const { data, error } = await admin
      .from('learning_records')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as DbRow[]

    const totalStudents = rows.length
    const totalCorrect = rows.reduce(
      (sum, row) => sum + Number(row.payload?.resultSummary?.correctCount ?? 0),
      0
    )
    const totalQuestions = rows.reduce(
      (sum, row) => sum + Number(row.payload?.resultSummary?.totalQuestions ?? 0),
      0
    )
    const avgAccuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0

    const avgAwarenessSeconds =
      totalStudents > 0
        ? rows.reduce(
            (sum, row) => sum + Number(row.payload?.awareness?.awarenessSecondsSpent ?? 0),
            0
          ) / totalStudents
        : 0

    const avgReadinessRetryCount =
      totalStudents > 0
        ? rows.reduce(
            (sum, row) => sum + Number(row.payload?.awareness?.readinessRetryCount ?? 0),
            0
          ) / totalStudents
        : 0

    const featureStats: Record<string, { diagnostic: number; possible: number }> = {}
    const itemStats: Record<
      string,
      {
        animalName: string
        total: number
        correct: number
        wrongAnswers: Record<string, number>
      }
    > = {}

    const studentRows = rows.map((row) => {
      const payload = row.payload ?? {}
      const resultRows = Array.isArray(payload.resultRows) ? payload.resultRows : []

      const correctCount = Number(payload?.resultSummary?.correctCount ?? 0)
      const totalQuestionCount = Number(payload?.resultSummary?.totalQuestions ?? resultRows.length ?? 0)

      ;(payload?.awareness?.diagnosticFeatures ?? []).forEach((feature: string) => {
        if (!featureStats[feature]) featureStats[feature] = { diagnostic: 0, possible: 0 }
        featureStats[feature].diagnostic += 1
      })

      ;(payload?.awareness?.possibleFeatures ?? []).forEach((feature: string) => {
        if (!featureStats[feature]) featureStats[feature] = { diagnostic: 0, possible: 0 }
        featureStats[feature].possible += 1
      })

      resultRows.forEach((item: any) => {
        const animalName = String(item.animalName ?? item.questionId ?? '未知')
        if (!itemStats[animalName]) {
          itemStats[animalName] = {
            animalName,
            total: 0,
            correct: 0,
            wrongAnswers: {},
          }
        }

        itemStats[animalName].total += 1
        if (item.isCorrect === true) {
          itemStats[animalName].correct += 1
        } else if (item.isCorrect === false) {
          const wrong = String(item.userAnswer ?? '未作答')
          itemStats[animalName].wrongAnswers[wrong] =
            (itemStats[animalName].wrongAnswers[wrong] ?? 0) + 1
        }
      })

      return {
        id: row.id,
        participantCode: row.participant_code,
        maskedName: row.masked_name ?? '未命名',
        grade: row.grade ?? '',
        className: row.class_name ?? '',
        seatNo: row.seat_no ?? '',
        correctCount,
        totalQuestionCount,
        awarenessSecondsSpent: Number(payload?.awareness?.awarenessSecondsSpent ?? 0),
        readinessRetryCount: Number(payload?.awareness?.readinessRetryCount ?? 0),
        readinessFirstPassCount: Number(payload?.awareness?.readinessFirstPassCount ?? 0),
        cardMoveCount: Number(payload?.stage1?.cardMoveCount ?? 0),
        groupCreateCount: Number(payload?.stage1?.groupCreateCount ?? 0),
        updatedAt: row.updated_at,
      }
    })

    const itemAccuracy = Object.values(itemStats)
      .map((item) => ({
        animalName: item.animalName,
        total: item.total,
        correct: item.correct,
        accuracy: item.total > 0 ? item.correct / item.total : 0,
        topWrongAnswers: Object.entries(item.wrongAnswers)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([answer, count]) => ({ answer, count })),
      }))
      .sort((a, b) => a.accuracy - b.accuracy)

    const featureUsage = Object.entries(featureStats)
      .map(([feature, counts]) => ({
        feature,
        diagnostic: counts.diagnostic,
        possible: counts.possible,
        total: counts.diagnostic + counts.possible,
      }))
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({
      ok: true,
      summary: {
        totalStudents,
        avgAccuracy,
        avgAwarenessSeconds,
        avgReadinessRetryCount,
      },
      itemAccuracy,
      featureUsage,
      studentRows,
    })
  } catch {
    return NextResponse.json({ error: 'unexpected server error' }, { status: 500 })
  }
}