type QuestionLike = {
  correctAnswer: string
  misconceptionMap: Record<string, string | null>
}

type InferenceResult = {
  code: string | null
  source: 'correct' | 'reason_keyword' | 'option_map'
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword))
}

export function inferMisconception(
  answer: string,
  reason: string,
  question: QuestionLike
): InferenceResult {
  if (answer === question.correctAnswer) {
    return {
      code: null,
      source: 'correct',
    }
  }

  const normalizedReason = reason.replace(/\s+/g, '').trim()

  if (
    includesAny(normalizedReason, [
      '不知道',
      '不確定',
      '不太確定',
      '猜',
      '亂猜',
      '隨便',
      '不會',
      '看不出來',
    ])
  ) {
    return { code: 'U0', source: 'reason_keyword' }
  }

  if (
    includesAny(normalizedReason, [
      '寄生',
      '寄生蟲',
      '靠別人活',
      '附著',
    ])
  ) {
    return { code: 'P1', source: 'reason_keyword' }
  }

  if (
    includesAny(normalizedReason, [
      '有殼',
      '殼',
      '硬殼',
      '外殼',
    ])
  ) {
    return { code: 'S1', source: 'reason_keyword' }
  }

  if (
    includesAny(normalizedReason, [
      '觸手',
      '很多手',
      '手很多',
    ])
  ) {
    return { code: 'T1', source: 'reason_keyword' }
  }

  if (
    includesAny(normalizedReason, [
      '生活在水中',
      '住在水裡',
      '在水裡',
      '水中',
      '海裡',
      '海中',
      '海洋',
      '河裡',
    ])
  ) {
    return { code: 'H1', source: 'reason_keyword' }
  }

  if (
    includesAny(normalizedReason, [
      '細長',
      '長長的',
      '長條',
      '一節一節',
      '長條狀',
      '細細長長',
    ])
  ) {
    return { code: 'R1', source: 'reason_keyword' }
  }

  if (
    includesAny(normalizedReason, [
      '像',
      '長得像',
      '看起來像',
      '外形像',
      '外觀像',
      '感覺像',
    ])
  ) {
    return { code: 'A1', source: 'reason_keyword' }
  }

  return {
    code: question.misconceptionMap[answer] ?? 'U0',
    source: 'option_map',
  }
}
