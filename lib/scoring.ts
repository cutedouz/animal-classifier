import {
  getItemRubric,
  type CriterionQuality,
  type ItemRubric,
} from './itemRubrics'

export type CriterionScore = {
  rubricFound: boolean
  rubricVersion: string | null
  correctPhylum: string | null
  isCorrect: boolean | null
  criterionQuality: CriterionQuality
  majorHitCount: number
  acceptableHitCount: number
  auxiliaryCount: number
  misleadingCount: number
  primaryFeature: string | null
  secondaryFeatures: string[]
  primaryIsMajor: boolean
  primaryIsAcceptable: boolean
  primaryIsAuxiliary: boolean
  primaryIsMisleading: boolean
  highConfidenceError: boolean
  targetMisconceptions: string[]
  itemType: ItemRubric['itemType'] | null
}

export function scoreCriterionQuality(params: {
  questionId: string
  animalName: string
  selectedFeatures: string[]
  answer: string
  confidence: number
  primaryFeature?: string | null
}): CriterionScore {
  const rubric = getItemRubric({
    questionId: params.questionId,
    animalName: params.animalName,
  })

  const primaryFeature =
    params.primaryFeature ??
    params.selectedFeatures.find((feature) => feature.trim().length > 0) ??
    null

  const secondaryFeatures = params.selectedFeatures.filter(
    (feature) => feature !== primaryFeature
  )

  if (!rubric) {
    return {
      rubricFound: false,
      rubricVersion: null,
      correctPhylum: null,
      isCorrect: null,
      criterionQuality: 'unclear',
      majorHitCount: 0,
      acceptableHitCount: 0,
      auxiliaryCount: 0,
      misleadingCount: 0,
      primaryFeature,
      secondaryFeatures,
      primaryIsMajor: false,
      primaryIsAcceptable: false,
      primaryIsAuxiliary: false,
      primaryIsMisleading: false,
      highConfidenceError: false,
      targetMisconceptions: [],
      itemType: null,
    }
  }

  const majorHit = params.selectedFeatures.filter((feature) =>
    rubric.majorDiagnosticFeatures.includes(feature)
  )

  const acceptableHit = params.selectedFeatures.filter((feature) =>
    rubric.acceptableCoreFeatures.includes(feature)
  )

  const auxiliaryHit = params.selectedFeatures.filter((feature) =>
    rubric.auxiliaryClues.includes(feature)
  )

  const misleadingHit = params.selectedFeatures.filter((feature) =>
    rubric.misleadingClues.includes(feature)
  )

  const primaryIsMajor =
    primaryFeature != null && rubric.majorDiagnosticFeatures.includes(primaryFeature)

  const primaryIsAcceptable =
    primaryFeature != null && rubric.acceptableCoreFeatures.includes(primaryFeature)

  const primaryIsAuxiliary =
    primaryFeature != null && rubric.auxiliaryClues.includes(primaryFeature)

  const primaryIsMisleading =
    primaryFeature != null && rubric.misleadingClues.includes(primaryFeature)

  let criterionQuality: CriterionQuality = 'unclear'

  if (primaryIsMajor && misleadingHit.length === 0) {
    criterionQuality = 'high_quality'
  } else if ((majorHit.length > 0 || acceptableHit.length > 0) && !primaryIsMisleading) {
    criterionQuality = 'partial_mastery'
  } else if (primaryIsMisleading || misleadingHit.length > 0) {
    criterionQuality = 'surface_or_misleading'
  }

  const isCorrect = params.answer === rubric.correctPhylum

  return {
    rubricFound: true,
    rubricVersion: rubric.rubricVersion,
    correctPhylum: rubric.correctPhylum,
    isCorrect,
    criterionQuality,
    majorHitCount: majorHit.length,
    acceptableHitCount: acceptableHit.length,
    auxiliaryCount: auxiliaryHit.length,
    misleadingCount: misleadingHit.length,
    primaryFeature,
    secondaryFeatures,
    primaryIsMajor,
    primaryIsAcceptable,
    primaryIsAuxiliary,
    primaryIsMisleading,
    highConfidenceError: params.confidence >= 4 && !isCorrect,
    targetMisconceptions: rubric.targetMisconceptions,
    itemType: rubric.itemType,
  }
}

export function getCriterionQualityLabel(value: CriterionQuality) {
  switch (value) {
    case 'high_quality':
      return '高品質結構判準'
    case 'partial_mastery':
      return '部分掌握'
    case 'surface_or_misleading':
      return '表面或誤導線索依賴'
    case 'unclear':
    default:
      return '判準不明確'
  }
}