import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getTeacherAuthFromRequest,
  recordMatchesTeacherAssignments,
} from '../../../lib/teacherAuth'

export const dynamic = 'force-dynamic'

type JsonRecord = Record<string, unknown>

type LearningRecordRow = {
  id: string
  participant_code: string
  school_code: string | null
  grade: string | null
  class_name: string | null
  seat_no: string | null
  masked_name: string | null
  current_stage: string | null
  is_completed: boolean | null
  payload: JsonRecord | null
  updated_at: string | null
}

type LearningItemLogRow = {
  record_id: string
  participant_code: string
  stage: 'evidence' | 'transfer'
  question_id: string
  animal_name: string | null
  submitted_at: string | null
  final_answer: string | null
  primary_feature: string | null
  reason_text: string | null
  reason_char_count: number | null
  exclusion_reason_text: string | null
  exclusion_reason_char_count: number | null
  confidence: number | null
  is_correct: boolean | null
  criterion_quality: string | null
  high_confidence_error: boolean | null
}

type JoinedItemLog = LearningItemLogRow & {
  record: LearningRecordRow | null
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null
}

function compactText(value: string | null | undefined, max = 90) {
  const text = safeString(value)
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function stageLabelForInterpretation(stage: string) {
  if (stage === 'evidence') return '帶提示判定'
  if (stage === 'transfer') return '遷移應用'
  return stage
}

function parsePayloadInfo(payload: JsonRecord | null) {
  const p = payload && typeof payload === 'object' ? payload : {}
  return {
    userRole: safeString(p.userRole),
    useContext: safeString(p.useContext),
    animalClassificationExperience:
      safeString(p.animalClassificationExperience) ||
      safeString((p.researchBackground as JsonRecord | undefined)?.animalClassificationExperience),
  }
}

const SURFACE_WORDS = [
  '外表',
  '有殼',
  '硬殼',
  '殼',
  '水中',
  '海水',
  '海裡',
  '細長',
  '柔軟',
  '長得像',
  '看起來',
  '顏色',
  '形狀',
  '住在',
  '生活在',
]

const STRUCTURAL_WORDS = [
  '外骨骼',
  '附肢',
  '關節',
  '外套膜',
  '肌肉足',
  '管足',
  '棘皮',
  '刺絲胞',
  '觸手',
  '體節',
  '分節',
  '環狀',
  '輻射對稱',
  '左右對稱',
  '扁平',
]

const EXCLUSION_WORDS = [
  '不是',
  '沒有',
  '不屬於',
  '排除',
  '不像',
  '缺少',
  '因為沒有',
  '所以不是',
]

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word))
}

function studentLabel(record: LearningRecordRow | null, participantCode: string) {
  const seat = safeString(record?.seat_no)
  const masked = safeString(record?.masked_name)
  if (seat && masked) return `${seat} 號 ${masked}`
  if (seat) return `${seat} 號`
  if (masked) return masked
  return participantCode.slice(0, 8)
}

function interpretationFor(item: JoinedItemLog) {
  const reason = safeString(item.reason_text)
  const exclusion = safeString(item.exclusion_reason_text)
  const surface = containsAny(reason, SURFACE_WORDS)
  const structural = containsAny(reason, STRUCTURAL_WORDS)
  const highConfidenceWrong = item.high_confidence_error === true

  if (highConfidenceWrong) {
    return '這是高信心錯誤理由，較可能反映穩定但不正確的分類判準，適合作為反例討論。'
  }
  if (reason.length > 0 && reason.length < 8) {
    return '理由過短，教師宜追問學生實際依據，避免只把選項名稱當作理由。'
  }
  if (surface && !structural) {
    return '理由偏向外觀、棲地或形態等表面線索，建議追問此線索是否能排除其他門別。'
  }
  if (structural && exclusion.length >= 8) {
    return '理由同時包含結構判準與排除思考，可作為課堂示範。'
  }
  if (structural) {
    return '理由已出現結構性判準，可再追問此判準為何比表面線索更有診斷力。'
  }
  if (exclusion.length === 0) {
    return '缺少排除理由，教師可追問「為什麼不是另一個看起來相似的門？」'
  }
  return '可搭配學生作答與信心進一步追問其分類判準。'
}

function makeExample(item: JoinedItemLog, index: number) {
  return {
    key: `${item.record_id}-${item.stage}-${item.question_id}-${index}`,
    stage: item.stage,
    animalName: item.animal_name,
    questionId: item.question_id,
    studentLabel: studentLabel(item.record, item.participant_code),
    finalAnswer: item.final_answer,
    confidence: item.confidence,
    isCorrect: item.is_correct,
    criterionQuality: item.criterion_quality,
    primaryFeature: item.primary_feature,
    reasonText: compactText(item.reason_text, 120) || null,
    exclusionReasonText: compactText(item.exclusion_reason_text, 120) || null,
    interpretation: interpretationFor(item),
  }
}

function pattern(
  key: string,
  label: string,
  count: number,
  denominator: number,
  description: string,
  examples: string[]
) {
  return {
    key,
    label,
    count,
    rate: ratio(count, denominator),
    description,
    examples: examples.map((item) => compactText(item, 80)).filter(Boolean).slice(0, 3),
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase env missing' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const teacherAuth = await getTeacherAuthFromRequest(req, admin)

    if (!teacherAuth) {
      return NextResponse.json(
        { error: '教師尚未登入或登入已過期。' },
        { status: 401 }
      )
    }

    if (!teacherAuth.isSuperAdmin && teacherAuth.assignments.length === 0) {
      return NextResponse.json(
        { error: '此教師帳號尚未設定可查看班級。' },
        { status: 403 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const schoolCode = searchParams.get('schoolCode')?.trim() ?? ''
    const grade = searchParams.get('grade')?.trim() ?? ''
    const className = searchParams.get('className')?.trim() ?? ''
    const participantCode = searchParams.get('participantCode')?.trim() ?? ''
    const stageFilter = searchParams.get('currentStage')?.trim() ?? ''
    const completedOnly = searchParams.get('completedOnly') === 'true'
    const userRoleFilter = searchParams.get('userRole')?.trim() ?? ''
    const useContextFilter = searchParams.get('useContext')?.trim() ?? ''
    const animalExperienceFilter =
      searchParams.get('animalClassificationExperience')?.trim() ?? ''

    let recordQuery = admin
      .from('learning_records')
      .select('id, participant_code, school_code, grade, class_name, seat_no, masked_name, current_stage, is_completed, payload, updated_at')
      .order('updated_at', { ascending: false })
      .range(0, 2999)

    if (schoolCode) recordQuery = recordQuery.eq('school_code', schoolCode)
    if (grade) recordQuery = recordQuery.eq('grade', grade)
    if (className) recordQuery = recordQuery.eq('class_name', className)
    if (participantCode) recordQuery = recordQuery.ilike('participant_code', `%${participantCode}%`)
    if (stageFilter) recordQuery = recordQuery.eq('current_stage', stageFilter)
    if (completedOnly) recordQuery = recordQuery.eq('is_completed', true)

    const { data: records, error: recordError } = await recordQuery
    if (recordError) {
      return NextResponse.json({ error: recordError.message }, { status: 500 })
    }

    const filteredRecords = ((records ?? []) as LearningRecordRow[])
      .filter((record) => recordMatchesTeacherAssignments(record, teacherAuth.assignments, teacherAuth.isSuperAdmin))
      .filter((record) => {
        const info = parsePayloadInfo(record.payload)
        if (userRoleFilter && info.userRole !== userRoleFilter) return false
        if (useContextFilter && info.useContext !== useContextFilter) return false
        if (animalExperienceFilter && info.animalClassificationExperience !== animalExperienceFilter) return false
        return true
      })

    const recordIds = filteredRecords.map((record) => record.id)
    const recordMap = new Map(filteredRecords.map((record) => [record.id, record]))

    if (recordIds.length === 0) {
      return NextResponse.json({
        ok: true,
        summary: {
          recordCount: 0,
          itemLogCount: 0,
          reasonCount: 0,
          exclusionReasonCount: 0,
          shortReasonRate: null,
          missingExclusionRate: null,
          surfaceReasonRate: null,
          structuralReasonRate: null,
          highConfidenceWrongReasonCount: 0,
        },
        patterns: [],
        questionFocus: [],
        examples: [],
      })
    }

    const { data: itemLogs, error: itemError } = await admin
      .from('latest_learning_item_logs')
      .select('record_id, participant_code, stage, question_id, animal_name, submitted_at, final_answer, primary_feature, reason_text, reason_char_count, exclusion_reason_text, exclusion_reason_char_count, confidence, is_correct, criterion_quality, high_confidence_error')
      .in('record_id', recordIds)
      .order('submitted_at', { ascending: false })

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 })
    }

    const joined: JoinedItemLog[] = ((itemLogs ?? []) as LearningItemLogRow[])
      .map((item) => ({ ...item, record: recordMap.get(item.record_id) ?? null }))
      .filter((item) => item.stage === 'evidence' || item.stage === 'transfer')

    const withReason = joined.filter((item) => safeString(item.reason_text).length > 0)
    const withExclusion = joined.filter((item) => safeString(item.exclusion_reason_text).length > 0)

    const shortReason = withReason.filter((item) => safeString(item.reason_text).length < 8)
    const missingExclusion = joined.filter((item) => safeString(item.exclusion_reason_text).length < 8)
    const surfaceReason = withReason.filter((item) => containsAny(safeString(item.reason_text), SURFACE_WORDS))
    const structuralReason = withReason.filter((item) => containsAny(safeString(item.reason_text), STRUCTURAL_WORDS))
    const exclusionReasoning = withExclusion.filter((item) => containsAny(safeString(item.exclusion_reason_text), EXCLUSION_WORDS))
    const highConfidenceWrong = joined.filter((item) => item.high_confidence_error === true)

    const patterns = [
      pattern(
        'short_reason',
        '理由過短或僅重述答案',
        shortReason.length,
        withReason.length,
        '理由過短時，學生可能只是選到答案，尚未真正說明分類判準。教師宜追問「你依據哪一個特徵排除其他門？」',
        shortReason.map((item) => safeString(item.reason_text))
      ),
      pattern(
        'surface_reason',
        '理由偏向表面線索',
        surfaceReason.length,
        withReason.length,
        '理由中出現外觀、棲地、身體形狀或有殼等語彙，代表學生可能仍依賴低診斷性的線索。',
        surfaceReason.map((item) => safeString(item.reason_text))
      ),
      pattern(
        'structural_reason',
        '理由出現結構性判準',
        structuralReason.length,
        withReason.length,
        '理由中出現外骨骼、附肢、外套膜、管足、刺絲胞、體節等語彙，代表學生開始用可診斷的分類判準說明。',
        structuralReason.map((item) => safeString(item.reason_text))
      ),
      pattern(
        'exclusion_reasoning',
        '能說明為什麼不是其他門',
        exclusionReasoning.length,
        joined.length,
        '能提出排除理由，通常比只說明自己選什麼更能反映分類判準品質。',
        exclusionReasoning.map((item) => safeString(item.exclusion_reason_text))
      ),
      pattern(
        'high_confidence_wrong',
        '高信心錯誤理由',
        highConfidenceWrong.length,
        joined.length,
        '錯誤但信心高的理由，最適合用於概念衝突與反例討論。',
        highConfidenceWrong.map((item) => safeString(item.reason_text) || safeString(item.final_answer))
      ),
    ]

    const questionGroups = new Map<string, JoinedItemLog[]>()
    for (const item of joined) {
      const key = `${item.stage}::${item.question_id}`
      questionGroups.set(key, [...(questionGroups.get(key) ?? []), item])
    }

    const questionFocus = Array.from(questionGroups.entries())
      .map(([key, items]) => {
        const reasonItems = items.filter((item) => safeString(item.reason_text).length > 0)
        const surfaceItems = reasonItems.filter((item) => containsAny(safeString(item.reason_text), SURFACE_WORDS))
        const shortItems = reasonItems.filter((item) => safeString(item.reason_text).length < 8)
        const missingExclusionItems = items.filter((item) => safeString(item.exclusion_reason_text).length < 8)
        const highConfidenceWrongItems = items.filter((item) => item.high_confidence_error === true)
        const first = items[0]

        return {
          key,
          stage: first.stage,
          questionId: first.question_id,
          animalName: first.animal_name,
          reasonCount: reasonItems.length,
          shortReasonRate: ratio(shortItems.length, reasonItems.length),
          missingExclusionRate: ratio(missingExclusionItems.length, items.length),
          surfaceReasonRate: ratio(surfaceItems.length, reasonItems.length),
          highConfidenceWrongCount: highConfidenceWrongItems.length,
          examples: items
            .filter((item) => safeString(item.reason_text).length > 0 || safeString(item.exclusion_reason_text).length > 0)
            .slice(0, 3)
            .map(makeExample),
        }
      })
      .sort((a, b) => {
        const aScore = (a.surfaceReasonRate ?? 0) * 100 + a.highConfidenceWrongCount * 10 + (a.missingExclusionRate ?? 0) * 20
        const bScore = (b.surfaceReasonRate ?? 0) * 100 + b.highConfidenceWrongCount * 10 + (b.missingExclusionRate ?? 0) * 20
        return bScore - aScore
      })
      .slice(0, 6)

    const examples = [
      ...highConfidenceWrong,
      ...surfaceReason,
      ...structuralReason.filter((item) => safeString(item.exclusion_reason_text).length >= 8),
      ...shortReason,
    ]
      .filter((item, index, array) => array.findIndex((candidate) => candidate.record_id === item.record_id && candidate.stage === item.stage && candidate.question_id === item.question_id) === index)
      .slice(0, 12)
      .map(makeExample)

    return NextResponse.json({
      ok: true,
      summary: {
        recordCount: filteredRecords.length,
        itemLogCount: joined.length,
        reasonCount: withReason.length,
        exclusionReasonCount: withExclusion.length,
        shortReasonRate: ratio(shortReason.length, withReason.length),
        missingExclusionRate: ratio(missingExclusion.length, joined.length),
        surfaceReasonRate: ratio(surfaceReason.length, withReason.length),
        structuralReasonRate: ratio(structuralReason.length, withReason.length),
        highConfidenceWrongReasonCount: highConfidenceWrong.length,
      },
      patterns,
      questionFocus,
      examples,
    })
  } catch (error) {
    console.error('teacher qualitative analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '質性資料分析失敗' },
      { status: 500 }
    )
  }
}
