'use client'

import { useMemo, useState } from 'react'

type StageKey = 'inactive' | 'stage1' | 'awareness' | 'evidence' | 'done'
type RiskLevel = 'high' | 'medium' | 'low'

type StudentRow = {
  id: string
  participantCode: string
  schoolCode: string
  schoolYear: string
  semester: string
  grade: string
  className: string
  seatNo: string
  maskedName: string
  currentStageKey: StageKey
  currentStage: string
  statusLabel: string
  hasStarted: boolean
  completed: boolean
  stage1Complete: boolean
  answeredCount: number
  totalQuestionCount: number
  correctCount: number
  accuracy: number
  overallAccuracy: number
  awarenessSecondsSpent: number
  readinessRetryCount: number
  readinessFirstPassCount: number
  cardMoveCount: number
  groupCreateCount: number
  stage1CueOrientation: string
  stage2CueOrientation: string
  changeCategory: string
  changeNarrative: string
  riskLevel: RiskLevel
  riskFlags: string[]
  updatedAt: string
  resultRowsActual: {
    animalName: string
    correctPhylum: string
    userAnswer: string
    isCorrect: boolean
  }[]
  diagnosticFeatures: string[]
  possibleFeatures: string[]
  diagnosticStructuralCount: number
  diagnosticSurfaceCount: number
  possibleSurfaceCount: number
  stage1AlignmentScore: number
  mixedGroupCount: number
  prePostDelta: number
  prePostNarrative: string
}

type ReportResponse = {
  ok: boolean
  totalRecords: number
  studentRows: StudentRow[]
  filterOptions: {
    schools: string[]
    grades: string[]
    classes: string[]
    students: {
      participantCode: string
      label: string
    }[]
  }
}

type Summary = {
  totalStudents: number
  activeStudents: number
  completedStudents: number
  completionRate: number
  avgAccuracyCompleted: number
  avgAwarenessSecondsCompleted: number
  avgReadinessRetryCountCompleted: number
  avgAnsweredCoverage: number
  positiveShiftRate: number
  highRiskStudents: number
  avgStage1Alignment: number
  avgPostOverallAccuracy: number
  avgPrePostDelta: number
  comparableStudents: number
}

type StageFunnel = {
  inactive: number
  stage1: number
  awareness: number
  evidence: number
  done: number
}

type CapabilityIndicator = {
  dimension: string
  count: number
  total: number
  rate: number
  interpretation: string
}

type InsightCard = {
  title: string
  evidence: string
  interpretation: string
  teachingSuggestion: string
}

type ItemAccuracyRow = {
  animalName: string
  correctPhylum: string
  respondents: number
  correct: number
  accuracy: number
  topWrongAnswers: { answer: string; count: number }[]
  interpretation: string
}

type MisconceptionRow = {
  animalName: string
  correctPhylum: string
  wrongAnswer: string
  count: number
  interpretation: string
}

type FeatureUsageRow = {
  feature: string
  featureType: '結構線索' | '表面線索' | '其他'
  diagnostic: number
  possible: number
  total: number
  interpretation: string
}

type ClassSummaryRow = {
  key: string
  schoolCode: string
  grade: string
  className: string
  studentCount: number
  completedCount: number
  completionRate: number
  avgAccuracyCompleted: number
  avgAwarenessSeconds: number
  avgReadinessRetryCount: number
  avgStage1Alignment: number
  avgPrePostDelta: number
}

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

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function cleanStr(value: unknown) {
  return String(value ?? '').trim()
}

function badgeClass(status: string) {
  if (status.includes('完成')) return 'bg-green-100 text-green-800'
  if (status.includes('第3')) return 'bg-blue-100 text-blue-800'
  if (status.includes('第2')) return 'bg-amber-100 text-amber-800'
  if (status.includes('第1')) return 'bg-slate-100 text-slate-800'
  return 'bg-gray-100 text-gray-700'
}

function riskClass(level: RiskLevel) {
  if (level === 'high') return 'bg-red-100 text-red-800'
  if (level === 'medium') return 'bg-amber-100 text-amber-800'
  return 'bg-green-100 text-green-800'
}

function getMisconceptionInterpretation(
  animalName: string,
  correctPhylum: string,
  wrongAnswer: string
) {
  const wrong = cleanStr(wrongAnswer) || '未作答'

  const baseByPhylum: Record<string, string> = {
    刺絲胞動物門:
      '這類錯誤通常表示學生仍以柔軟、漂浮或像花的外觀判斷，尚未穩定抓到刺絲胞與觸手。',
    扁形動物門:
      '這類錯誤通常表示學生把細長外形或生活環境當成主線索，尚未穩定抓到扁平與無體節。',
    軟體動物門:
      '這類錯誤通常表示學生仍用有殼或柔軟外觀做表面判斷，尚未穩定抓到外套膜與肌肉足。',
    環節動物門:
      '這類錯誤通常表示學生只看長條或柔軟外觀，尚未穩定抓到身體分節與環狀體節。',
    節肢動物門:
      '這類錯誤通常表示學生以是否會飛、生活環境或腳的多寡做表面判斷，尚未穩定抓到外骨骼與成對附肢。',
    棘皮動物門:
      '這類錯誤通常表示學生仍以星形、海洋棲地或表面粗糙做直觀判斷，尚未穩定抓到棘皮與管足。',
  }

  return `${animalName} 常被誤判為 ${wrong}。${baseByPhylum[correctPhylum] ?? '這反映學生尚未穩定抓到該門別的診斷性特徵。'}`
}

function getFeatureType(feature: string): '結構線索' | '表面線索' | '其他' {
  if (STRUCTURAL_FEATURES.has(feature)) return '結構線索'
  if (SURFACE_FEATURES.has(feature)) return '表面線索'
  return '其他'
}

function getFeatureInterpretation(feature: string, diagnostic: number, possible: number) {
  const featureType = getFeatureType(feature)

  if (featureType === '結構線索') {
    if (diagnostic >= possible) {
      return '多數學生已把此特徵視為較具診斷力的分類依據。'
    }
    return '學生已注意到此特徵，但仍有部分人尚未把它穩定升格為關鍵線索。'
  }

  if (featureType === '表面線索') {
    if (diagnostic > possible) {
      return '這是表面線索，但仍有不少學生把它當成關鍵依據，值得教師回教。'
    }
    return '多數學生已知道此特徵較適合作為輔助，而非決定性線索。'
  }

  return '此特徵的教學定位仍需再觀察。'
}

function buildSummary(rows: StudentRow[]): Summary {
  const totalStudents = rows.length
  const activeStudents = rows.filter((row) => row.hasStarted).length
  const completedRows = rows.filter((row) => row.completed)
  const completedStudents = completedRows.length
  const completionRate = totalStudents > 0 ? completedStudents / totalStudents : 0

  const avgAccuracyCompleted =
    completedStudents > 0
      ? completedRows.reduce((sum, row) => sum + row.accuracy, 0) / completedStudents
      : 0

  const avgAwarenessSecondsCompleted =
    completedStudents > 0
      ? completedRows.reduce((sum, row) => sum + row.awarenessSecondsSpent, 0) /
        completedStudents
      : 0

  const avgReadinessRetryCountCompleted =
    completedStudents > 0
      ? completedRows.reduce((sum, row) => sum + row.readinessRetryCount, 0) /
        completedStudents
      : 0

  const avgAnsweredCoverage =
    totalStudents > 0
      ? rows.reduce(
          (sum, row) =>
            sum +
            (row.totalQuestionCount > 0 ? row.answeredCount / row.totalQuestionCount : 0),
          0
        ) / totalStudents
      : 0

  const positiveShiftStudents = rows.filter((row) =>
    ['由表面轉向結構', '由混合走向規則化', '在第二階段建立結構線索'].includes(
      row.changeCategory
    )
  ).length

  const positiveShiftRate =
    totalStudents > 0 ? positiveShiftStudents / totalStudents : 0

  const highRiskStudents = rows.filter((row) => row.riskLevel === 'high').length

  const comparableRows = rows.filter(
    (row) => row.stage1AlignmentScore > 0 || row.answeredCount > 0
  )
  const comparableStudents = comparableRows.length

  const avgStage1Alignment =
    comparableStudents > 0
      ? comparableRows.reduce((sum, row) => sum + row.stage1AlignmentScore, 0) /
        comparableStudents
      : 0

  const avgPostOverallAccuracy =
    comparableStudents > 0
      ? comparableRows.reduce((sum, row) => sum + row.overallAccuracy, 0) /
        comparableStudents
      : 0

  const avgPrePostDelta =
    comparableStudents > 0
      ? comparableRows.reduce((sum, row) => sum + row.prePostDelta, 0) /
        comparableStudents
      : 0

  return {
    totalStudents,
    activeStudents,
    completedStudents,
    completionRate,
    avgAccuracyCompleted,
    avgAwarenessSecondsCompleted,
    avgReadinessRetryCountCompleted,
    avgAnsweredCoverage,
    positiveShiftRate,
    highRiskStudents,
    avgStage1Alignment,
    avgPostOverallAccuracy,
    avgPrePostDelta,
    comparableStudents,
  }
}

function buildStageFunnel(rows: StudentRow[]): StageFunnel {
  return {
    inactive: rows.filter((row) => row.currentStageKey === 'inactive').length,
    stage1: rows.filter((row) => row.currentStageKey === 'stage1').length,
    awareness: rows.filter((row) => row.currentStageKey === 'awareness').length,
    evidence: rows.filter((row) => row.currentStageKey === 'evidence').length,
    done: rows.filter((row) => row.currentStageKey === 'done').length,
  }
}

function buildItemAccuracy(rows: StudentRow[]): ItemAccuracyRow[] {
  const itemStats: Record<
    string,
    {
      animalName: string
      correctPhylum: string
      respondents: number
      correct: number
      wrongAnswers: Record<string, number>
    }
  > = {}

  for (const student of rows) {
    for (const item of student.resultRowsActual) {
      if (!itemStats[item.animalName]) {
        itemStats[item.animalName] = {
          animalName: item.animalName,
          correctPhylum: item.correctPhylum,
          respondents: 0,
          correct: 0,
          wrongAnswers: {},
        }
      }

      itemStats[item.animalName].respondents += 1

      if (item.isCorrect) {
        itemStats[item.animalName].correct += 1
      } else {
        itemStats[item.animalName].wrongAnswers[item.userAnswer] =
          (itemStats[item.animalName].wrongAnswers[item.userAnswer] ?? 0) + 1
      }
    }
  }

  return Object.values(itemStats)
    .map((item) => {
      const topWrongAnswers = Object.entries(item.wrongAnswers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([answer, count]) => ({ answer, count }))

      return {
        animalName: item.animalName,
        correctPhylum: item.correctPhylum,
        respondents: item.respondents,
        correct: item.correct,
        accuracy: item.respondents > 0 ? item.correct / item.respondents : 0,
        topWrongAnswers,
        interpretation:
          topWrongAnswers.length > 0
            ? getMisconceptionInterpretation(
                item.animalName,
                item.correctPhylum,
                topWrongAnswers[0].answer
              )
            : '此題目前沒有明顯的共同迷思，可視為相對穩定的判定項目。',
      }
    })
    .sort((a, b) => a.accuracy - b.accuracy)
}

function buildMisconceptionPatterns(itemAccuracy: ItemAccuracyRow[]): MisconceptionRow[] {
  return itemAccuracy
    .flatMap((item) =>
      item.topWrongAnswers.map((wrong) => ({
        animalName: item.animalName,
        correctPhylum: item.correctPhylum,
        wrongAnswer: wrong.answer,
        count: wrong.count,
        interpretation: getMisconceptionInterpretation(
          item.animalName,
          item.correctPhylum,
          wrong.answer
        ),
      }))
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

function buildFeatureUsage(rows: StudentRow[]): FeatureUsageRow[] {
  const featureStats: Record<string, { diagnostic: number; possible: number }> = {}

  for (const student of rows) {
    for (const feature of student.diagnosticFeatures) {
      if (!featureStats[feature]) featureStats[feature] = { diagnostic: 0, possible: 0 }
      featureStats[feature].diagnostic += 1
    }

    for (const feature of student.possibleFeatures) {
      if (!featureStats[feature]) featureStats[feature] = { diagnostic: 0, possible: 0 }
      featureStats[feature].possible += 1
    }
  }

  return Object.entries(featureStats)
    .map(([feature, counts]) => ({
      feature,
      featureType: getFeatureType(feature),
      diagnostic: counts.diagnostic,
      possible: counts.possible,
      total: counts.diagnostic + counts.possible,
      interpretation: getFeatureInterpretation(feature, counts.diagnostic, counts.possible),
    }))
    .sort((a, b) => b.total - a.total)
}

function buildClassSummary(rows: StudentRow[]): ClassSummaryRow[] {
  const classMap = new Map<
    string,
    {
      key: string
      schoolCode: string
      grade: string
      className: string
      studentCount: number
      completedCount: number
      accuracySumCompleted: number
      awarenessSum: number
      retrySum: number
      alignmentSum: number
      prePostDeltaSum: number
      comparableCount: number
    }
  >()

  for (const row of rows) {
    const key = [row.schoolCode, row.grade || '未填年級', row.className || '未填班級'].join('|')

    if (!classMap.has(key)) {
      classMap.set(key, {
        key,
        schoolCode: row.schoolCode,
        grade: row.grade || '未填年級',
        className: row.className || '未填班級',
        studentCount: 0,
        completedCount: 0,
        accuracySumCompleted: 0,
        awarenessSum: 0,
        retrySum: 0,
        alignmentSum: 0,
        prePostDeltaSum: 0,
        comparableCount: 0,
      })
    }

    const target = classMap.get(key)!
    target.studentCount += 1
    target.awarenessSum += row.awarenessSecondsSpent
    target.retrySum += row.readinessRetryCount

    if (row.completed) {
      target.completedCount += 1
      target.accuracySumCompleted += row.accuracy
    }

    if (row.stage1AlignmentScore > 0 || row.answeredCount > 0) {
      target.alignmentSum += row.stage1AlignmentScore
      target.prePostDeltaSum += row.prePostDelta
      target.comparableCount += 1
    }
  }

  return Array.from(classMap.values())
    .map((item) => ({
      key: item.key,
      schoolCode: item.schoolCode,
      grade: item.grade,
      className: item.className,
      studentCount: item.studentCount,
      completedCount: item.completedCount,
      completionRate: item.studentCount > 0 ? item.completedCount / item.studentCount : 0,
      avgAccuracyCompleted:
        item.completedCount > 0 ? item.accuracySumCompleted / item.completedCount : 0,
      avgAwarenessSeconds:
        item.studentCount > 0 ? item.awarenessSum / item.studentCount : 0,
      avgReadinessRetryCount:
        item.studentCount > 0 ? item.retrySum / item.studentCount : 0,
      avgStage1Alignment:
        item.comparableCount > 0 ? item.alignmentSum / item.comparableCount : 0,
      avgPrePostDelta:
        item.comparableCount > 0 ? item.prePostDeltaSum / item.comparableCount : 0,
    }))
    .sort((a, b) => {
      const school = a.schoolCode.localeCompare(b.schoolCode, 'zh-Hant')
      if (school !== 0) return school
      const grade = a.grade.localeCompare(b.grade, 'zh-Hant')
      if (grade !== 0) return grade
      return a.className.localeCompare(b.className, 'zh-Hant')
    })
}

function buildCapabilityIndicators(rows: StudentRow[]): CapabilityIndicator[] {
  const totalStudents = rows.length
  const stage1QualifiedCount = rows.filter((row) => row.stage1Complete).length
  const ruleConstructionCount = rows.filter(
    (row) =>
      row.diagnosticFeatures.length > 0 &&
      row.possibleFeatures.length > 0 &&
      row.stage2CueOrientation === '結構線索為主'
  ).length
  const evidenceJudgementCount = rows.filter((row) => row.completed).length
  const highQualityJudgementCount = rows.filter(
    (row) => row.completed && row.accuracy >= 0.75
  ).length
  const positiveShiftCount = rows.filter((row) =>
    ['由表面轉向結構', '由混合走向規則化', '在第二階段建立結構線索'].includes(
      row.changeCategory
    )
  ).length

  return [
    {
      dimension: '初步分類與理由化',
      count: stage1QualifiedCount,
      total: totalStudents,
      rate: totalStudents > 0 ? stage1QualifiedCount / totalStudents : 0,
      interpretation:
        '此指標看的是學生能否完成分組、填寫群組理由與整體分類想法，反映其是否願意把直觀分類說成可討論的判準。',
    },
    {
      dimension: '關鍵／輔助線索辨識',
      count: ruleConstructionCount,
      total: totalStudents,
      rate: totalStudents > 0 ? ruleConstructionCount / totalStudents : 0,
      interpretation:
        '此指標反映學生是否開始把結構線索提升為關鍵依據，並把表面線索降到輔助位置，這是分類能力從直覺走向規則化的核心。',
    },
    {
      dimension: '證據式門別判定',
      count: evidenceJudgementCount,
      total: totalStudents,
      rate: totalStudents > 0 ? evidenceJudgementCount / totalStudents : 0,
      interpretation:
        '此指標反映學生是否完成第三階段的帶提示門別判定，代表其是否能把前面建立的規則真正套用到具體生物判斷。',
    },
    {
      dimension: '高品質判定表現',
      count: highQualityJudgementCount,
      total: evidenceJudgementCount,
      rate:
        evidenceJudgementCount > 0
          ? highQualityJudgementCount / evidenceJudgementCount
          : 0,
      interpretation:
        '此指標看的是完成後測的學生中，有多少人已達到較穩定的正確率，代表規則化判斷是否真正內化。',
    },
    {
      dimension: '由表面走向結構',
      count: positiveShiftCount,
      total: totalStudents,
      rate: totalStudents > 0 ? positiveShiftCount / totalStudents : 0,
      interpretation:
        '此指標聚焦學生是否從原本較依賴外觀、生活環境等表面線索，轉向採用刺絲胞、外套膜、體節、外骨骼、管足等結構線索。',
    },
  ]
}

function buildInsightCards(params: {
  totalRecords: number
  rows: StudentRow[]
  summary: Summary
  classSummary: ClassSummaryRow[]
  misconceptionPatterns: MisconceptionRow[]
}): InsightCard[] {
  const { totalRecords, rows, summary, classSummary, misconceptionPatterns } = params

  const topMisconception = misconceptionPatterns[0]
  const comparableRows = rows.filter(
    (row) => row.stage1AlignmentScore > 0 || row.answeredCount > 0
  )

  const positiveGrowthCount = comparableRows.filter((row) => row.prePostDelta > 0.1).length
  const positiveGrowthRate =
    comparableRows.length > 0 ? positiveGrowthCount / comparableRows.length : 0

  const highestClass = [...classSummary]
    .filter((row) => row.completedCount > 0)
    .sort((a, b) => b.avgAccuracyCompleted - a.avgAccuracyCompleted)[0]

  const lowestClass = [...classSummary]
    .filter((row) => row.completedCount > 0)
    .sort((a, b) => a.avgAccuracyCompleted - b.avgAccuracyCompleted)[0]

  return [
    {
      title: '完成率是解讀成效的第一道門檻',
      evidence: `目前篩選範圍共有 ${summary.totalStudents} 位有效學生（原始紀錄 ${totalRecords} 筆），其中 ${summary.completedStudents} 位完成完整判定，完成率 ${pct(summary.completionRate)}。`,
      interpretation:
        summary.completionRate < 0.7
          ? '若完成率偏低，教師不能直接把低正確率解讀為概念不足，因為不少學生可能只是尚未走完整個歷程。'
          : '完成率已達一定水準，後續的正確率與迷思分析會比較接近真實的概念表現。',
      teachingSuggestion:
        '建議先看停留第2或第3階段的學生名單，優先支援流程卡關者，再解讀題目表現。',
    },
    {
      title: '平台是否促成「前後改變」',
      evidence: `可比較前後表現的學生共有 ${summary.comparableStudents} 位；第一階段平均初始分類對齊度為 ${pct(summary.avgStage1Alignment)}，後續整體判定表現為 ${pct(summary.avgPostOverallAccuracy)}，平均差值 ${summary.avgPrePostDelta >= 0 ? '+' : ''}${pct(summary.avgPrePostDelta)}。`,
      interpretation:
        summary.avgPrePostDelta > 0.1
          ? '整體來看，學生後續門別判定表現高於初始直觀分組，顯示平台不只是讓學生拖圖片，而是逐步把分類活動轉化為較有規則的判定。'
          : '若平均差值不明顯，代表部分學生雖能做初始分組，但還未穩定把規則套用到門別判定；教師需要回到第二階段的線索層級教學。',
      teachingSuggestion:
        '請特別關注第一階段對齊度不低、但第三階段表現沒有跟上來的學生，這類學生常見的問題是「能大致分，但說不出規則」。',
    },
    {
      title: '分類能力的關鍵，不是背名稱，而是線索層級的改變',
      evidence: `${positiveGrowthCount} 位學生在前後比較中呈現明顯正向成長，占可比較學生的 ${pct(positiveGrowthRate)}；整體有 ${pct(summary.positiveShiftRate)} 的學生在第二階段呈現由表面走向結構的線索改變。`,
      interpretation:
        summary.positiveShiftRate < 0.5
          ? '若這個比例偏低，表示不少學生仍停留在「像什麼、住哪裡、有沒有殼」的直觀分類。'
          : '若這個比例偏高，表示平台已幫助不少學生把線索從直觀外觀轉向結構性判準。',
      teachingSuggestion:
        '回教時可把學生常用的表面線索直接拿出來討論：哪些可以參考，哪些不能單獨決定門別。',
    },
    {
      title: '迷思概念最值得追的是「穩定的錯誤，不是零星失誤」',
      evidence: topMisconception
        ? `${topMisconception.animalName} 最常被誤判為 ${topMisconception.wrongAnswer}，共 ${topMisconception.count} 次。`
        : '目前尚未形成明顯的共同迷思。',
      interpretation: topMisconception
        ? topMisconception.interpretation
        : '目前班級的錯誤較分散，適合回到學生個別作答紀錄做診斷。',
      teachingSuggestion:
        '請優先針對高頻錯誤生物做全班回教，因為那通常代表共同的判斷規則尚未建立穩定。',
    },
    {
      title: '高風險學生值得教師優先關注',
      evidence: `目前共有 ${summary.highRiskStudents} 位高風險學生。`,
      interpretation:
        summary.highRiskStudents >= Math.max(3, Math.ceil(summary.totalStudents * 0.2))
          ? '高風險學生比例偏高時，通常代表不只是個別差異，而可能是關卡語意、操作流暢度或規則說明需要調整。'
          : '高風險學生數量有限時，較可能屬於個別支持需求，可用學生摘要表做精準追蹤。',
      teachingSuggestion:
        '建議優先查看同時具備「尚未完成」「第二階段重試偏多」「仍偏表面線索」標記的學生。',
    },
    {
      title: '班級差異可作為教學調整的依據',
      evidence:
        highestClass && lowestClass
          ? `完成後測平均正確率最高的班級為 ${highestClass.schoolCode} ${highestClass.grade} ${highestClass.className}（${pct(highestClass.avgAccuracyCompleted)}）；最低的班級為 ${lowestClass.schoolCode} ${lowestClass.grade} ${lowestClass.className}（${pct(lowestClass.avgAccuracyCompleted)}）。`
          : '目前班級比較資料不足。',
      interpretation:
        highestClass && lowestClass
          ? '同一平台在不同班級的表現差異，常反映前導教學、教師口語提醒、或學生對線索層級的掌握差異。'
          : '請累積更多班級資料後再進行班級層級比較。',
      teachingSuggestion:
        '建議比較高表現班與低表現班在「第二階段特徵使用分布」與「迷思概念」上的差異，而不是只看平均分數。',
    },
  ]
}

export default function TeacherPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<ReportResponse | null>(null)

  const [keyword, setKeyword] = useState('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')

  async function loadReport() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/teacher-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || '讀取失敗')
      }

      setReport(result)
    } catch (error: any) {
      setError(error.message || '讀取失敗')
    } finally {
      setLoading(false)
    }
  }

  const filteredGradeOptions = useMemo(() => {
    if (!report) return []
    const rows = report.studentRows.filter((row) => {
      return !schoolFilter || row.schoolCode === schoolFilter
    })
    return Array.from(new Set(rows.map((row) => row.grade || '未填年級'))).sort((a, b) =>
      a.localeCompare(b, 'zh-Hant')
    )
  }, [report, schoolFilter])

  const filteredClassOptions = useMemo(() => {
    if (!report) return []
    const rows = report.studentRows.filter((row) => {
      const schoolOk = !schoolFilter || row.schoolCode === schoolFilter
      const gradeOk = !gradeFilter || (row.grade || '未填年級') === gradeFilter
      return schoolOk && gradeOk
    })
    return Array.from(new Set(rows.map((row) => row.className || '未填班級'))).sort((a, b) =>
      a.localeCompare(b, 'zh-Hant')
    )
  }, [report, schoolFilter, gradeFilter])

  const filteredStudentOptions = useMemo(() => {
    if (!report) return []
    const rows = report.studentRows.filter((row) => {
      const schoolOk = !schoolFilter || row.schoolCode === schoolFilter
      const gradeOk = !gradeFilter || (row.grade || '未填年級') === gradeFilter
      const classOk = !classFilter || (row.className || '未填班級') === classFilter
      return schoolOk && gradeOk && classOk
    })

    return rows.map((row) => ({
      participantCode: row.participantCode,
      label: `${row.schoolCode}｜${row.grade || '未填年級'}年級 ${row.className || '未填班級'}班 ${row.seatNo || '—'}號｜${row.maskedName}`,
    }))
  }, [report, schoolFilter, gradeFilter, classFilter])

  const filteredStudents = useMemo(() => {
    if (!report) return []

    const keywordNormalized = keyword.trim().toLowerCase()

    return report.studentRows.filter((row) => {
      const keywordOk =
        !keywordNormalized ||
        [
          row.schoolCode,
          row.grade,
          row.className,
          row.seatNo,
          row.maskedName,
          row.participantCode,
          row.statusLabel,
          row.changeCategory,
          row.changeNarrative,
          row.riskFlags.join(' '),
        ]
          .join(' ')
          .toLowerCase()
          .includes(keywordNormalized)

      const schoolOk = !schoolFilter || row.schoolCode === schoolFilter
      const gradeOk = !gradeFilter || (row.grade || '未填年級') === gradeFilter
      const classOk = !classFilter || (row.className || '未填班級') === classFilter
      const studentOk = !studentFilter || row.participantCode === studentFilter
      const statusOk = !statusFilter || row.statusLabel === statusFilter
      const riskOk = !riskFilter || row.riskLevel === riskFilter

      return keywordOk && schoolOk && gradeOk && classOk && studentOk && statusOk && riskOk
    })
  }, [
    report,
    keyword,
    schoolFilter,
    gradeFilter,
    classFilter,
    studentFilter,
    statusFilter,
    riskFilter,
  ])

  const summary = useMemo(() => buildSummary(filteredStudents), [filteredStudents])
  const stageFunnel = useMemo(() => buildStageFunnel(filteredStudents), [filteredStudents])
  const itemAccuracy = useMemo(() => buildItemAccuracy(filteredStudents), [filteredStudents])
  const misconceptionPatterns = useMemo(
    () => buildMisconceptionPatterns(itemAccuracy),
    [itemAccuracy]
  )
  const featureUsage = useMemo(() => buildFeatureUsage(filteredStudents), [filteredStudents])
  const classSummary = useMemo(() => buildClassSummary(filteredStudents), [filteredStudents])
  const capabilityIndicators = useMemo(
    () => buildCapabilityIndicators(filteredStudents),
    [filteredStudents]
  )
  const insightCards = useMemo(
    () =>
      buildInsightCards({
        totalRecords: report?.totalRecords ?? 0,
        rows: filteredStudents,
        summary,
        classSummary,
        misconceptionPatterns,
      }),
    [report?.totalRecords, filteredStudents, summary, classSummary, misconceptionPatterns]
  )

  const filteredRiskSummary = useMemo(() => {
    const high = filteredStudents.filter((row) => row.riskLevel === 'high').length
    const medium = filteredStudents.filter((row) => row.riskLevel === 'medium').length
    const low = filteredStudents.filter((row) => row.riskLevel === 'low').length
    return { high, medium, low }
  }, [filteredStudents])

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <h1 className="text-3xl font-black text-gray-900">教師端分析頁</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            這一版不只呈現成績，而是把學生的學習歷程拆成「是否完成」「迷思概念」「線索層級改變」「前後變化」與「平台欲培養的分類能力」來看。
            建議先選學校與班級，再看分析結果，會比全平台混算更有教學意義。
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="教師密碼"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm md:max-w-sm"
            />
            <button
              type="button"
              onClick={loadReport}
              disabled={loading || !password}
              className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? '載入中…' : '載入報表'}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>

        {report ? (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">分析範圍篩選</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    教師端建議先界定分析範圍，再看結果。篩選後，下方所有統計、迷思概念、前後改變與學生摘要都會重新計算。
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜尋學校 / 姓名 / 座號 / participantCode"
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm xl:col-span-2"
                  />

                  <select
                    value={schoolFilter}
                    onChange={(e) => setSchoolFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
                  >
                    <option value="">全部學校</option>
                    {report.filterOptions.schools.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
                  >
                    <option value="">全部年級</option>
                    {filteredGradeOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
                  >
                    <option value="">全部班級</option>
                    {filteredClassOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <select
                    value={studentFilter}
                    onChange={(e) => setStudentFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
                  >
                    <option value="">全部學生</option>
                    {filteredStudentOptions.map((item) => (
                      <option key={item.participantCode} value={item.participantCode}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
                  >
                    <option value="">全部狀態</option>
                    {Array.from(new Set(report.studentRows.map((row) => row.statusLabel))).map(
                      (item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
                  >
                    <option value="">全部風險等級</option>
                    <option value="high">高風險</option>
                    <option value="medium">中風險</option>
                    <option value="low">低風險</option>
                  </select>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
                    篩選後學生數：<span className="font-bold text-gray-900">{filteredStudents.length}</span>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
                    風險分布：
                    <span className="ml-2 text-red-700">高 {filteredRiskSummary.high}</span>
                    <span className="ml-2 text-amber-700">中 {filteredRiskSummary.medium}</span>
                    <span className="ml-2 text-green-700">低 {filteredRiskSummary.low}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">原始紀錄數</div>
                <div className="mt-2 text-3xl font-black">{report.totalRecords}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">有效學生數</div>
                <div className="mt-2 text-3xl font-black">{summary.totalStudents}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">已開始歷程</div>
                <div className="mt-2 text-3xl font-black">{summary.activeStudents}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">完整完成</div>
                <div className="mt-2 text-3xl font-black">{summary.completedStudents}</div>
                <div className="mt-1 text-xs text-gray-500">完成率 {pct(summary.completionRate)}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">完成者平均正確率</div>
                <div className="mt-2 text-3xl font-black">{pct(summary.avgAccuracyCompleted)}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">高風險學生</div>
                <div className="mt-2 text-3xl font-black">{summary.highRiskStudents}</div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">完成者第二階段平均秒數</div>
                <div className="mt-2 text-3xl font-black">
                  {summary.avgAwarenessSecondsCompleted.toFixed(1)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">完成者平均重試次數</div>
                <div className="mt-2 text-3xl font-black">
                  {summary.avgReadinessRetryCountCompleted.toFixed(2)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">平均作答覆蓋率</div>
                <div className="mt-2 text-3xl font-black">{pct(summary.avgAnsweredCoverage)}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">由表面走向結構</div>
                <div className="mt-2 text-3xl font-black">{pct(summary.positiveShiftRate)}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">可比較前後變化學生</div>
                <div className="mt-2 text-3xl font-black">{summary.comparableStudents}</div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">教師詮釋重點</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                這一區不是原始數字堆疊，而是把資料轉成教師較容易採取行動的解讀：先看完成率，再看前後改變與線索層級改變，再看共同迷思，最後定位高風險學生。
              </p>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {insightCards.map((card) => (
                  <div key={card.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="text-lg font-black text-gray-900">{card.title}</div>
                    <div className="mt-3 text-sm leading-6 text-gray-700">
                      <div>
                        <span className="font-semibold">證據：</span>
                        {card.evidence}
                      </div>
                      <div className="mt-2">
                        <span className="font-semibold">詮釋：</span>
                        {card.interpretation}
                      </div>
                      <div className="mt-2">
                        <span className="font-semibold">教學建議：</span>
                        {card.teachingSuggestion}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">平台欲培養的分類能力指標</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                這些指標不是傳統分數，而是對應平台設計目標：從直觀分組、到區分關鍵與輔助線索、再到以證據支持門別判定。
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {capabilityIndicators.map((item) => (
                  <div key={item.dimension} className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-gray-500">{item.dimension}</div>
                    <div className="mt-2 text-2xl font-black text-gray-900">
                      {item.count} / {item.total}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-gray-700">{pct(item.rate)}</div>
                    <div className="mt-3 text-sm leading-6 text-gray-600">{item.interpretation}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">第一階段平均初始分類對齊度</div>
                <div className="mt-2 text-3xl font-black">{pct(summary.avgStage1Alignment)}</div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">後續整體判定表現</div>
                <div className="mt-2 text-3xl font-black">
                  {pct(summary.avgPostOverallAccuracy)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">平均前後差值</div>
                <div className="mt-2 text-3xl font-black">
                  {summary.avgPrePostDelta >= 0 ? '+' : ''}
                  {pct(summary.avgPrePostDelta)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="text-sm text-gray-500">可比較前後變化學生</div>
                <div className="mt-2 text-3xl font-black">{summary.comparableStudents}</div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">學習流程漏斗</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                這一區用來看學生主要卡在哪一階段。若大量學生停在第二或第三階段，表示問題未必只是知識，而可能是規則理解、操作負荷或任務門檻。
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="text-sm text-gray-500">尚未開始</div>
                  <div className="mt-2 text-3xl font-black">{stageFunnel.inactive}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="text-sm text-gray-500">停留第 1 階段</div>
                  <div className="mt-2 text-3xl font-black">{stageFunnel.stage1}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="text-sm text-gray-500">停留第 2 階段</div>
                  <div className="mt-2 text-3xl font-black">{stageFunnel.awareness}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="text-sm text-gray-500">停留第 3 階段</div>
                  <div className="mt-2 text-3xl font-black">{stageFunnel.evidence}</div>
                </div>
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="text-sm text-gray-500">已完成</div>
                  <div className="mt-2 text-3xl font-black">{stageFunnel.done}</div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">可能的迷思概念</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                這裡只看實際作答且答錯的資料，不把未作答納入分母，因此較能反映真正的共同迷思，而不是未完成造成的假性低分。
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2">生物</th>
                      <th className="px-3 py-2">正確門別</th>
                      <th className="px-3 py-2">常見誤判</th>
                      <th className="px-3 py-2">次數</th>
                      <th className="px-3 py-2">教師詮釋</th>
                    </tr>
                  </thead>
                  <tbody>
                    {misconceptionPatterns.map((row) => (
                      <tr key={`${row.animalName}-${row.wrongAnswer}`} className="border-b border-gray-100 align-top">
                        <td className="px-3 py-2 font-semibold">{row.animalName}</td>
                        <td className="px-3 py-2">{row.correctPhylum}</td>
                        <td className="px-3 py-2">{row.wrongAnswer}</td>
                        <td className="px-3 py-2">{row.count}</td>
                        <td className="px-3 py-2 leading-6 text-gray-700">{row.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">各題判定診斷</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                這一區可協助教師辨識哪個生物最難判定、最常被誤判成哪一門，以及該錯誤較可能代表哪一種線索使用偏誤。
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2">生物</th>
                      <th className="px-3 py-2">正確門別</th>
                      <th className="px-3 py-2">答對 / 作答</th>
                      <th className="px-3 py-2">正確率</th>
                      <th className="px-3 py-2">最常見錯答</th>
                      <th className="px-3 py-2">教師詮釋</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemAccuracy.map((row) => (
                      <tr key={row.animalName} className="border-b border-gray-100 align-top">
                        <td className="px-3 py-2 font-semibold">{row.animalName}</td>
                        <td className="px-3 py-2">{row.correctPhylum}</td>
                        <td className="px-3 py-2">
                          {row.correct} / {row.respondents}
                        </td>
                        <td className="px-3 py-2">{pct(row.accuracy)}</td>
                        <td className="px-3 py-2">
                          {row.topWrongAnswers.length
                            ? row.topWrongAnswers
                                .map((item) => `${item.answer}（${item.count}）`)
                                .join('、')
                            : '—'}
                        </td>
                        <td className="px-3 py-2 leading-6 text-gray-700">{row.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">第二階段線索使用分布</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                這一區可用來判斷學生是否真的學會區分關鍵線索與輔助線索。若表面線索經常被放到關鍵區，通常表示規則建構仍不穩。
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2">特徵</th>
                      <th className="px-3 py-2">類型</th>
                      <th className="px-3 py-2">列為關鍵</th>
                      <th className="px-3 py-2">列為輔助</th>
                      <th className="px-3 py-2">總次數</th>
                      <th className="px-3 py-2">教師詮釋</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureUsage.map((row) => (
                      <tr key={row.feature} className="border-b border-gray-100 align-top">
                        <td className="px-3 py-2 font-semibold">{row.feature}</td>
                        <td className="px-3 py-2">{row.featureType}</td>
                        <td className="px-3 py-2">{row.diagnostic}</td>
                        <td className="px-3 py-2">{row.possible}</td>
                        <td className="px-3 py-2">{row.total}</td>
                        <td className="px-3 py-2 leading-6 text-gray-700">{row.interpretation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="text-2xl font-black text-gray-900">班級比較</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                建議不要只看平均分數，而要同時看完成率、第二階段平均秒數、重試次數，以及前後變化差值，才能分辨是概念問題、流程問題，還是規則理解負荷過高。
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[1400px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2">學校</th>
                      <th className="px-3 py-2">年級</th>
                      <th className="px-3 py-2">班級</th>
                      <th className="px-3 py-2">學生數</th>
                      <th className="px-3 py-2">完成人數</th>
                      <th className="px-3 py-2">完成率</th>
                      <th className="px-3 py-2">完成者平均正確率</th>
                      <th className="px-3 py-2">第二階段平均秒數</th>
                      <th className="px-3 py-2">平均重試次數</th>
                      <th className="px-3 py-2">初始分類對齊度</th>
                      <th className="px-3 py-2">前後差值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classSummary.map((row) => (
                      <tr key={row.key} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-semibold">{row.schoolCode}</td>
                        <td className="px-3 py-2">{row.grade}</td>
                        <td className="px-3 py-2">{row.className}</td>
                        <td className="px-3 py-2">{row.studentCount}</td>
                        <td className="px-3 py-2">{row.completedCount}</td>
                        <td className="px-3 py-2">{pct(row.completionRate)}</td>
                        <td className="px-3 py-2">{pct(row.avgAccuracyCompleted)}</td>
                        <td className="px-3 py-2">{row.avgAwarenessSeconds.toFixed(1)}</td>
                        <td className="px-3 py-2">{row.avgReadinessRetryCount.toFixed(2)}</td>
                        <td className="px-3 py-2">{pct(row.avgStage1Alignment)}</td>
                        <td className="px-3 py-2">
                          {row.avgPrePostDelta >= 0 ? '+' : ''}
                          {pct(row.avgPrePostDelta)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">學生摘要與個別診斷</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    這裡適合教師做個別追蹤：看某位學生原本的初始分類是否接近真實門別、後來是否轉向結構線索、後測是否真的把規則套用出來。
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[2200px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2">學校</th>
                      <th className="px-3 py-2">班級 / 座號</th>
                      <th className="px-3 py-2">學生（遮罩）</th>
                      <th className="px-3 py-2">狀態</th>
                      <th className="px-3 py-2">風險</th>
                      <th className="px-3 py-2">第一階段初始分類對齊度</th>
                      <th className="px-3 py-2">後續整體判定</th>
                      <th className="px-3 py-2">前後差值</th>
                      <th className="px-3 py-2">作答進度</th>
                      <th className="px-3 py-2">第二階段</th>
                      <th className="px-3 py-2">第一階段操作</th>
                      <th className="px-3 py-2">原本線索</th>
                      <th className="px-3 py-2">後來線索</th>
                      <th className="px-3 py-2">改變類型</th>
                      <th className="px-3 py-2">改變敘事</th>
                      <th className="px-3 py-2">前後比較詮釋</th>
                      <th className="px-3 py-2">風險標記</th>
                      <th className="px-3 py-2">更新時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 align-top">
                        <td className="px-3 py-2 font-semibold">{row.schoolCode}</td>
                        <td className="px-3 py-2">
                          {row.grade || '—'} 年級 {row.className || '—'} 班 {row.seatNo || '—'} 號
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{row.maskedName}</div>
                          <div className="mt-1 text-xs text-gray-500">{row.participantCode}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(row.statusLabel)}`}>
                            {row.statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskClass(row.riskLevel)}`}>
                            {row.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2">{pct(row.stage1AlignmentScore)}</td>
                        <td className="px-3 py-2">
                          <div>{row.correctCount} / {row.totalQuestionCount}</div>
                          <div className="text-xs text-gray-500">{pct(row.overallAccuracy)}</div>
                        </td>
                        <td className="px-3 py-2">
                          {row.prePostDelta >= 0 ? '+' : ''}
                          {pct(row.prePostDelta)}
                        </td>
                        <td className="px-3 py-2">
                          {row.answeredCount} / {row.totalQuestionCount}
                        </td>
                        <td className="px-3 py-2 leading-6">
                          <div>秒數：{row.awarenessSecondsSpent}</div>
                          <div>重試：{row.readinessRetryCount}</div>
                          <div>一次答對：{row.readinessFirstPassCount}</div>
                        </td>
                        <td className="px-3 py-2 leading-6">
                          <div>拖曳：{row.cardMoveCount}</div>
                          <div>新增群組：{row.groupCreateCount}</div>
                          <div>混合群組：{row.mixedGroupCount}</div>
                        </td>
                        <td className="px-3 py-2">{row.stage1CueOrientation}</td>
                        <td className="px-3 py-2">{row.stage2CueOrientation}</td>
                        <td className="px-3 py-2 font-semibold">{row.changeCategory}</td>
                        <td className="px-3 py-2 leading-6 text-gray-700">{row.changeNarrative}</td>
                        <td className="px-3 py-2 leading-6 text-gray-700">{row.prePostNarrative}</td>
                        <td className="px-3 py-2 leading-6">
                          {row.riskFlags.length ? row.riskFlags.join('、') : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {new Date(row.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}