import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stage1Cards } from '../../../lib/questions'

type DbRow = {
  id: string
  participant_code: string | null
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

type StageKey = 'inactive' | 'stage1' | 'awareness' | 'evidence' | 'done'
type Orientation = '資料不足' | '表面線索為主' | '混合線索' | '結構線索為主'
type ChangeCategory =
  | '由表面轉向結構'
  | '由混合走向規則化'
  | '在第二階段建立結構線索'
  | '穩定採用結構線索'
  | '仍偏表面線索'
  | '仍在轉換中'
  | '資料不足'
type RiskLevel = 'low' | 'medium' | 'high'

type InternalResultRow = {
  animalName: string
  correctPhylum: string
  userAnswer: string
  isCorrect: boolean
}

const QUESTION_TOTAL_DEFAULT = 12

const ANIMAL_TO_PHYLUM: Record<string, string> = {
  海葵: '刺絲胞動物門',
  水母: '刺絲胞動物門',
  渦蟲: '扁形動物門',
  蛤蠣: '軟體動物門',
  蝸牛: '軟體動物門',
  蚯蚓: '環節動物門',
  水蛭: '環節動物門',
  蝴蝶: '節肢動物門',
  蜘蛛: '節肢動物門',
  螃蟹: '節肢動物門',
  海星: '棘皮動物門',
  海膽: '棘皮動物門',
}

const CARD_ID_TO_NAME = Object.fromEntries(
  stage1Cards.map((card: any) => [String(card.id), String(card.name)])
)

const STRUCTURAL_FEATURES = new Set([
  '刺絲胞',
  '觸手',
  '輻射對稱',
  '袋狀身體',
  '身體扁平',
  '左右對稱',
  '無體節',
  '外套膜',
  '肌肉足',
  '身體分節',
  '環狀體節',
  '外骨骼',
  '成對附肢',
  '棘皮',
  '管足',
  '五輻對稱',
])

const SURFACE_FEATURES = new Set([
  '顏色鮮豔',
  '外型像花',
  '身體細長',
  '生活在水中',
  '只要有殼就一定是',
  '看起來很軟',
  '身體長條',
  '生活在泥土或水裡',
  '會飛',
  '腳很多',
  '住在海邊',
  '一定是星形',
  '表面粗糙就算',
])

const STRUCTURAL_TEXT_HINTS = [
  '刺絲胞',
  '觸手',
  '輻射對稱',
  '袋狀',
  '扁平',
  '左右對稱',
  '無體節',
  '外套膜',
  '肌肉足',
  '體節',
  '分節',
  '外骨骼',
  '附肢',
  '棘皮',
  '管足',
  '五輻對稱',
]

const SURFACE_TEXT_HINTS = [
  '有殼',
  '像花',
  '顏色',
  '鮮豔',
  '細長',
  '長條',
  '柔軟',
  '很軟',
  '會飛',
  '腳很多',
  '海邊',
  '星形',
  '粗糙',
  '水裡',
  '泥土',
]

function cleanStr(value: unknown) {
  return String(value ?? '').trim()
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'zh-Hant')
  )
}

function countTextMatches(text: string, keywords: string[]) {
  const normalized = cleanStr(text)
  if (!normalized) return 0
  return keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0)
}

function classifyCueOrientation(
  structuralCount: number,
  surfaceCount: number
): Orientation {
  if (structuralCount === 0 && surfaceCount === 0) return '資料不足'
  if (structuralCount > 0 && surfaceCount === 0) return '結構線索為主'
  if (surfaceCount > 0 && structuralCount === 0) return '表面線索為主'
  if (structuralCount >= 2 && structuralCount > surfaceCount) return '結構線索為主'
  if (surfaceCount > structuralCount) return '表面線索為主'
  return '混合線索'
}

function getStageLabel(stageKey: StageKey) {
  switch (stageKey) {
    case 'inactive':
      return '尚未開始'
    case 'stage1':
      return '停留第1階段'
    case 'awareness':
      return '停留第2階段'
    case 'evidence':
      return '停留第3階段'
    case 'done':
      return '已完成'
    default:
      return '未知'
  }
}

function getChangeProfile(params: {
  stage1CueOrientation: Orientation
  stage2CueOrientation: Orientation
  possibleSurfaceCount: number
  completed: boolean
  accuracy: number
}) {
  const {
    stage1CueOrientation,
    stage2CueOrientation,
    possibleSurfaceCount,
    completed,
    accuracy,
  } = params

  let changeCategory: ChangeCategory = '資料不足'
  let narrative = '目前資料不足，尚難判斷學生是否已從直觀分類轉向規則化分類。'

  if (stage2CueOrientation === '結構線索為主') {
    if (stage1CueOrientation === '表面線索為主') {
      changeCategory = '由表面轉向結構'
      narrative =
        '學生已從原本較依賴表面外觀的分類方式，轉向以較具診斷力的結構線索判斷。'
    } else if (stage1CueOrientation === '混合線索') {
      changeCategory = '由混合走向規則化'
      narrative =
        '學生已把原本混合使用的線索，逐步整理成較有規則性的結構判準。'
    } else if (stage1CueOrientation === '資料不足') {
      changeCategory = '在第二階段建立結構線索'
      narrative =
        '雖然第一階段的線索使用不夠明確，但第二階段已能建立較具診斷力的結構判準。'
    } else {
      changeCategory = '穩定採用結構線索'
      narrative =
        '學生從一開始到後續判斷，都傾向採用較具診斷力的結構線索。'
    }
  } else if (stage2CueOrientation === '表面線索為主') {
    changeCategory = '仍偏表面線索'
    narrative =
      '學生在第二階段仍主要依賴表面線索，從直觀分類轉向規則分類的改變有限。'
  } else if (stage2CueOrientation === '混合線索') {
    changeCategory = '仍在轉換中'
    narrative =
      '學生已開始注意到結構線索，但仍與表面線索混用，分類判準尚未完全穩定。'
  }

  if (possibleSurfaceCount > 0) {
    narrative += ' 另外，學生已能把部分表面線索移到「輔助」位置，顯示對線索層級已有初步辨識。'
  }

  if (completed) {
    if (accuracy >= 0.75) {
      narrative += ' 且其後續門別判定表現穩定，顯示規則化判斷已有實際遷移。'
    } else if (accuracy < 0.5) {
      narrative += ' 但後續門別判定仍不穩定，表示規則建立與實際套用之間還有落差。'
    }
  } else {
    narrative += ' 目前尚未完成完整後測，建議持續觀察其後續判定是否能真正套用這些規則。'
  }

  return { changeCategory, changeNarrative: narrative }
}

function getRiskInfo(params: {
  completed: boolean
  stageKey: StageKey
  stage2CueOrientation: Orientation
  readinessRetryCount: number
  awarenessSecondsSpent: number
  accuracy: number
}) {
  const {
    completed,
    stageKey,
    stage2CueOrientation,
    readinessRetryCount,
    awarenessSecondsSpent,
    accuracy,
  } = params

  const flags: string[] = []

  if (!completed && stageKey !== 'inactive') {
    flags.push('尚未完成完整判定')
  }

  if (stage2CueOrientation === '表面線索為主') {
    flags.push('關鍵線索仍偏表面')
  }

  if (readinessRetryCount >= 3) {
    flags.push('第二階段重試偏多')
  }

  if (awarenessSecondsSpent > 0 && awarenessSecondsSpent < 45) {
    flags.push('第二階段停留時間偏短')
  }

  if (completed && accuracy < 0.6) {
    flags.push('後測正確率偏低')
  }

  let riskLevel: RiskLevel = 'low'

  if (
    flags.length >= 3 ||
    (completed && accuracy < 0.5) ||
    (!completed && stageKey === 'awareness' && readinessRetryCount >= 3)
  ) {
    riskLevel = 'high'
  } else if (flags.length >= 1) {
    riskLevel = 'medium'
  }

  return { riskLevel, riskFlags: flags }
}

function buildStage1Alignment(groups: any[]) {
  let totalMapped = 0
  let dominantCorrectTotal = 0
  let mixedGroupCount = 0

  for (const group of groups) {
    const ids = toArray<string>(group?.cardIds)
    const names = ids
      .map((id) => CARD_ID_TO_NAME[String(id)] ?? cleanStr(id))
      .filter(Boolean)

    const phylumCounts: Record<string, number> = {}

    for (const name of names) {
      const phylum = ANIMAL_TO_PHYLUM[name]
      if (!phylum) continue
      phylumCounts[phylum] = (phylumCounts[phylum] ?? 0) + 1
    }

    const counts = Object.values(phylumCounts)
    const groupTotal = counts.reduce((sum, n) => sum + n, 0)
    if (groupTotal === 0) continue

    totalMapped += groupTotal
    dominantCorrectTotal += Math.max(...counts)

    if (Object.keys(phylumCounts).length > 1) {
      mixedGroupCount += 1
    }
  }

  return {
    stage1AlignmentScore: totalMapped > 0 ? dominantCorrectTotal / totalMapped : 0,
    mixedGroupCount,
  }
}

function buildPrePostNarrative(params: {
  stage1AlignmentScore: number
  overallAccuracy: number
  answeredCount: number
  completed: boolean
}) {
  const { stage1AlignmentScore, overallAccuracy, answeredCount, completed } = params
  const prePostDelta = overallAccuracy - stage1AlignmentScore

  let narrative = '目前前後資料不足，尚難比較初始分類與後續判定的差異。'

  if (stage1AlignmentScore === 0 && answeredCount === 0) {
    narrative = '學生尚未形成可供比較的初始分類與後續判定資料。'
  } else if (answeredCount === 0) {
    narrative = '學生已有初始分類資料，但尚未進入可比較的後續門別判定。'
  } else if (prePostDelta >= 0.25) {
    narrative =
      '後續門別判定表現明顯高於初始分組對齊度，表示學生不只是把圖片分組，還逐步建立了較穩定的分類規則。'
  } else if (prePostDelta >= 0.1) {
    narrative =
      '後續門別判定表現高於初始分組，顯示學生已有從直觀分組走向規則化判定的進展。'
  } else if (prePostDelta > -0.1) {
    narrative =
      '初始分組與後續判定表現接近，可能代表學生原本已有部分概念，也可能表示規則遷移幅度仍有限。'
  } else {
    narrative =
      '後續門別判定未優於初始分組，顯示學生雖能做直觀分組，但尚未穩定把分類規則用於門別判定。'
  }

  if (!completed && answeredCount > 0) {
    narrative += ' 但因尚未完成全部判定，這個前後比較仍屬暫時結果。'
  }

  return { prePostDelta, prePostNarrative: narrative }
}

function buildStudentRow(row: DbRow) {
  const payload = row.payload ?? {}

  const stage1 = payload.stage1 ?? {}
  const awareness = payload.awareness ?? {}

  const groups = toArray<any>(stage1.groups)
  const nonEmptyGroups = groups.filter((group) => toArray(group?.cardIds).length > 0)
  const bankCardIds = toArray(stage1.bankCardIds)

  const overallReason = cleanStr(stage1.overallReason)
  const stage1Text = [
    overallReason,
    ...groups.map((group) => cleanStr(group?.name)),
    ...groups.map((group) => cleanStr(group?.reason)),
  ]
    .filter(Boolean)
    .join(' ')

  const stage1StructuralCount = countTextMatches(stage1Text, STRUCTURAL_TEXT_HINTS)
  const stage1SurfaceCount = countTextMatches(stage1Text, SURFACE_TEXT_HINTS)
  const stage1CueOrientation = classifyCueOrientation(stage1StructuralCount, stage1SurfaceCount)

  const diagnosticFeatures = toArray<string>(awareness.diagnosticFeatures)
  const possibleFeatures = toArray<string>(awareness.possibleFeatures)

  const diagnosticStructuralCount = diagnosticFeatures.filter((feature) =>
    STRUCTURAL_FEATURES.has(feature)
  ).length
  const diagnosticSurfaceCount = diagnosticFeatures.filter((feature) =>
    SURFACE_FEATURES.has(feature)
  ).length
  const possibleSurfaceCount = possibleFeatures.filter((feature) =>
    SURFACE_FEATURES.has(feature)
  ).length

  const stage2CueOrientation = classifyCueOrientation(
    diagnosticStructuralCount,
    diagnosticSurfaceCount
  )

  const bridgeReflectAnswers = awareness.bridgeReflectAnswers ?? {}
  const reflectionAnsweredCount = Object.values(bridgeReflectAnswers).filter(
    (value) => Array.isArray(value) && value.length > 0
  ).length

  const readinessAnswers = awareness.readinessAnswers ?? {}
  const readinessAnswerCount = Object.keys(readinessAnswers).length

  const awarenessSecondsSpent = toNumber(awareness.awarenessSecondsSpent)
  const readinessRetryCount = toNumber(awareness.readinessRetryCount)
  const readinessFirstPassCount = toNumber(awareness.readinessFirstPassCount)

  const resultRows = toArray<any>(payload.resultRows)
  const resultRowsActual: InternalResultRow[] = resultRows
    .filter((item) => item?.isCorrect === true || item?.isCorrect === false)
    .map((item) => ({
      animalName: cleanStr(item.animalName || item.questionId || '未知'),
      correctPhylum: cleanStr(
        item.correctAnswer || ANIMAL_TO_PHYLUM[cleanStr(item.animalName)] || '未設定'
      ),
      userAnswer: cleanStr(item.userAnswer || '未作答'),
      isCorrect: Boolean(item.isCorrect),
    }))

  const evidenceResponses = toArray<any>(payload.evidenceResponses)
  const answeredCount =
    evidenceResponses.length > 0 ? evidenceResponses.length : resultRowsActual.length

  const totalQuestionCount = Math.max(
    toNumber(payload?.resultSummary?.totalQuestions, 0),
    resultRows.length,
    answeredCount,
    QUESTION_TOTAL_DEFAULT
  )

  const correctCount = toNumber(
    payload?.resultSummary?.correctCount,
    resultRowsActual.filter((item) => item.isCorrect).length
  )

  const accuracy = answeredCount > 0 ? correctCount / answeredCount : 0
  const overallAccuracy = totalQuestionCount > 0 ? correctCount / totalQuestionCount : 0

  const cardMoveCount = toNumber(stage1.cardMoveCount)
  const groupCreateCount = toNumber(stage1.groupCreateCount)

  const stage1Complete =
    bankCardIds.length === 0 &&
    nonEmptyGroups.length >= 2 &&
    nonEmptyGroups.every((group) => cleanStr(group?.reason).length > 0) &&
    overallReason.length >= 8

  let currentStageKey: StageKey = 'inactive'

  if (answeredCount >= totalQuestionCount && totalQuestionCount > 0) {
    currentStageKey = 'done'
  } else if (answeredCount > 0) {
    currentStageKey = 'evidence'
  } else if (
    awarenessSecondsSpent > 0 ||
    reflectionAnsweredCount > 0 ||
    diagnosticFeatures.length > 0 ||
    possibleFeatures.length > 0 ||
    readinessAnswerCount > 0
  ) {
    currentStageKey = 'awareness'
  } else if (
    cardMoveCount > 0 ||
    nonEmptyGroups.length > 0 ||
    overallReason.length > 0 ||
    groupCreateCount > 3
  ) {
    currentStageKey = 'stage1'
  }

  const completed = currentStageKey === 'done'
  const hasStarted = currentStageKey !== 'inactive'
  const currentStage = getStageLabel(currentStageKey)

  const { changeCategory, changeNarrative } = getChangeProfile({
    stage1CueOrientation,
    stage2CueOrientation,
    possibleSurfaceCount,
    completed,
    accuracy,
  })

  const { riskLevel, riskFlags } = getRiskInfo({
    completed,
    stageKey: currentStageKey,
    stage2CueOrientation,
    readinessRetryCount,
    awarenessSecondsSpent,
    accuracy,
  })

  const { stage1AlignmentScore, mixedGroupCount } = buildStage1Alignment(nonEmptyGroups)
  const { prePostDelta, prePostNarrative } = buildPrePostNarrative({
    stage1AlignmentScore,
    overallAccuracy,
    answeredCount,
    completed,
  })

  return {
    id: row.id,
    participantCode: cleanStr(row.participant_code) || row.id,
    schoolCode: cleanStr(row.school_code) || '未填學校',
    schoolYear: cleanStr(row.school_year),
    semester: cleanStr(row.semester),
    grade: cleanStr(row.grade),
    className: cleanStr(row.class_name),
    seatNo: cleanStr(row.seat_no),
    maskedName: cleanStr(row.masked_name) || '未命名',
    currentStageKey,
    currentStage,
    statusLabel: currentStage,
    hasStarted,
    completed,
    stage1Complete,
    answeredCount,
    totalQuestionCount,
    correctCount,
    accuracy,
    overallAccuracy,
    awarenessSecondsSpent,
    readinessRetryCount,
    readinessFirstPassCount,
    cardMoveCount,
    groupCreateCount,
    stage1CueOrientation,
    stage2CueOrientation,
    changeCategory,
    changeNarrative,
    riskLevel,
    riskFlags,
    updatedAt: row.updated_at,
    resultRowsActual,
    diagnosticFeatures,
    possibleFeatures,
    diagnosticStructuralCount,
    diagnosticSurfaceCount,
    possibleSurfaceCount,
    stage1AlignmentScore,
    mixedGroupCount,
    prePostDelta,
    prePostNarrative,
  }
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const teacherPassword = process.env.TEACHER_DASHBOARD_PASSWORD

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase env missing' },
        { status: 500 }
      )
    }

    if (!teacherPassword) {
      return NextResponse.json(
        { error: 'TEACHER_DASHBOARD_PASSWORD missing' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const password = String(body.password ?? '')

    if (password !== teacherPassword) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data, error } = await admin
      .from('learning_records')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rawRows = (data ?? []) as DbRow[]

    const latestByParticipant = new Map<string, DbRow>()

    for (const row of rawRows) {
      const key = cleanStr(row.participant_code) || row.id
      if (!latestByParticipant.has(key)) {
        latestByParticipant.set(key, row)
      }
    }

    const latestRows = Array.from(latestByParticipant.values())

    const studentRows = latestRows
      .map(buildStudentRow)
      .filter((row) => row.participantCode !== 'anonymous')
      .sort((a, b) => {
        const school = a.schoolCode.localeCompare(b.schoolCode, 'zh-Hant')
        if (school !== 0) return school

        const grade = (a.grade || '').localeCompare(b.grade || '', 'zh-Hant')
        if (grade !== 0) return grade

        const className = (a.className || '').localeCompare(b.className || '', 'zh-Hant')
        if (className !== 0) return className

        const seat = toNumber(a.seatNo, 9999) - toNumber(b.seatNo, 9999)
        if (seat !== 0) return seat

        return a.maskedName.localeCompare(b.maskedName, 'zh-Hant')
      })

    const filterOptions = {
      schools: uniqueSorted(studentRows.map((row) => row.schoolCode)),
      grades: uniqueSorted(studentRows.map((row) => row.grade || '未填年級')),
      classes: uniqueSorted(studentRows.map((row) => row.className || '未填班級')),
      students: studentRows.map((row) => ({
        participantCode: row.participantCode,
        label: `${row.schoolCode}｜${row.grade || '未填年級'}年級 ${row.className || '未填班級'}班 ${row.seatNo || '—'}號｜${row.maskedName}`,
      })),
    }

    return NextResponse.json({
      ok: true,
      totalRecords: rawRows.length,
      studentRows,
      filterOptions,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'unexpected server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}