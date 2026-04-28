export const RUBRIC_VERSION = 'rubric-2026-04-28-v1'

export const SIX_PHYLA = [
  '刺絲胞動物門',
  '扁形動物門',
  '軟體動物門',
  '環節動物門',
  '節肢動物門',
  '棘皮動物門',
] as const

export type SixPhylum = (typeof SIX_PHYLA)[number]

export type FeatureRole =
  | 'majorDiagnostic'
  | 'acceptableCore'
  | 'auxiliary'
  | 'misleading'

export type CriterionQuality =
  | 'high_quality'
  | 'partial_mastery'
  | 'surface_or_misleading'
  | 'unclear'

export type ItemType =
  | 'representative'
  | 'near_transfer'
  | 'far_transfer'
  | 'contrast'

export type ItemRubric = {
  questionId?: string
  animalName: string
  correctPhylum: SixPhylum
  itemType: ItemType
  majorDiagnosticFeatures: string[]
  acceptableCoreFeatures: string[]
  auxiliaryClues: string[]
  misleadingClues: string[]
  targetMisconceptions: string[]
  parallelSet: 'A' | 'B' | 'delayed'
  rubricVersion: string
}

/**
 * 目前先以 animalName 對應，因為 evidenceQuestions 的 Q1/Q3/Q4/Q6/Q9/Q10
 * 可能來自 lib/questions.ts，題目 id 未必與 T1-T6 對齊。
 *
 * 後續 P1 再把每一題都改成 questionId-level rubric。
 */
export const ITEM_RUBRICS_BY_ANIMAL: Record<string, ItemRubric> = {
  海葵: {
    animalName: '海葵',
    correctPhylum: '刺絲胞動物門',
    itemType: 'representative',
    majorDiagnosticFeatures: ['刺絲胞', '觸手'],
    acceptableCoreFeatures: ['輻射對稱', '袋狀身體'],
    auxiliaryClues: ['固著生活', '水中生活'],
    misleadingClues: ['外表有殼或硬殼', '左右對稱'],
    targetMisconceptions: ['外型像花就不是動物', '水中生活被誤當成分類主判準'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  水母: {
    animalName: '水母',
    correctPhylum: '刺絲胞動物門',
    itemType: 'representative',
    majorDiagnosticFeatures: ['刺絲胞', '觸手'],
    acceptableCoreFeatures: ['輻射對稱', '袋狀身體'],
    auxiliaryClues: ['水中生活', '身體柔軟'],
    misleadingClues: ['左右對稱', '外骨骼'],
    targetMisconceptions: ['透明漂浮被誤當成主要分類依據', '水中生活被誤當成分類主判準'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  珊瑚: {
    animalName: '珊瑚',
    correctPhylum: '刺絲胞動物門',
    itemType: 'far_transfer',
    majorDiagnosticFeatures: ['刺絲胞', '觸手'],
    acceptableCoreFeatures: ['輻射對稱', '袋狀身體'],
    auxiliaryClues: ['固著生活', '水中生活'],
    misleadingClues: ['外表有殼或硬殼', '左右對稱'],
    targetMisconceptions: ['珊瑚固定不動所以像植物', '固著生活被誤當成主要分類依據'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  渦蟲: {
    animalName: '渦蟲',
    correctPhylum: '扁形動物門',
    itemType: 'representative',
    majorDiagnosticFeatures: ['身體扁平', '無體節'],
    acceptableCoreFeatures: ['左右對稱'],
    auxiliaryClues: ['身體柔軟', '身體細長'],
    misleadingClues: ['身體分節', '環狀體節', '寄生生活'],
    targetMisconceptions: ['細長就判斷為環節動物', '寄生生活被誤當成扁形動物主判準'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  中華肝吸蟲: {
    animalName: '中華肝吸蟲',
    correctPhylum: '扁形動物門',
    itemType: 'far_transfer',
    majorDiagnosticFeatures: ['身體扁平', '無體節'],
    acceptableCoreFeatures: ['左右對稱'],
    auxiliaryClues: ['寄生生活', '身體細長'],
    misleadingClues: ['身體分節', '環狀體節', '外骨骼'],
    targetMisconceptions: ['寄生生活被誤當成主要分類依據', '身體細長被誤連到環節動物'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  蛤蠣: {
    animalName: '蛤蠣',
    correctPhylum: '軟體動物門',
    itemType: 'representative',
    majorDiagnosticFeatures: ['外套膜', '肌肉足'],
    acceptableCoreFeatures: ['身體柔軟', '多數有殼'],
    auxiliaryClues: ['外表有殼或硬殼'],
    misleadingClues: ['外骨骼', '身體分節', '成對附肢'],
    targetMisconceptions: ['有殼就判斷為同一類', '混淆軟體動物的殼與節肢動物外骨骼'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  蝸牛: {
    animalName: '蝸牛',
    correctPhylum: '軟體動物門',
    itemType: 'representative',
    majorDiagnosticFeatures: ['外套膜', '肌肉足'],
    acceptableCoreFeatures: ['身體柔軟', '多數有殼'],
    auxiliaryClues: ['外表有殼或硬殼'],
    misleadingClues: ['身體分節', '外骨骼', '成對附肢'],
    targetMisconceptions: ['只看殼而忽略外套膜與肌肉足', '把硬殼誤當成外骨骼'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  中華槍烏賊: {
    animalName: '中華槍烏賊',
    correctPhylum: '軟體動物門',
    itemType: 'far_transfer',
    majorDiagnosticFeatures: ['外套膜'],
    acceptableCoreFeatures: ['身體柔軟', '肌肉足'],
    auxiliaryClues: ['觸手', '水中生活'],
    misleadingClues: ['多數有殼', '外骨骼', '成對附肢'],
    targetMisconceptions: ['看到觸手就聯想到刺絲胞動物', '水中生活被誤當成分類依據', '忽略烏賊也是軟體動物'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  蚯蚓: {
    animalName: '蚯蚓',
    correctPhylum: '環節動物門',
    itemType: 'representative',
    majorDiagnosticFeatures: ['身體分節', '環狀體節'],
    acceptableCoreFeatures: [],
    auxiliaryClues: ['身體細長', '身體柔軟'],
    misleadingClues: ['無體節', '外骨骼', '成對附肢', '身體扁平'],
    targetMisconceptions: ['身體細長被誤當成主要分類依據', '忽略環狀體節'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  水蛭: {
    animalName: '水蛭',
    correctPhylum: '環節動物門',
    itemType: 'near_transfer',
    majorDiagnosticFeatures: ['身體分節', '環狀體節'],
    acceptableCoreFeatures: [],
    auxiliaryClues: ['身體細長', '身體柔軟'],
    misleadingClues: ['無體節', '外骨骼', '成對附肢', '身體扁平'],
    targetMisconceptions: ['外型不像蚯蚓就排除環節動物', '只看身體細長而非體節'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  海邊分節小動物: {
    animalName: '海邊分節小動物',
    correctPhylum: '環節動物門',
    itemType: 'near_transfer',
    majorDiagnosticFeatures: ['身體分節', '環狀體節'],
    acceptableCoreFeatures: [],
    auxiliaryClues: ['身體細長', '海水中生活'],
    misleadingClues: ['無體節', '外骨骼', '成對附肢', '棘皮'],
    targetMisconceptions: ['海水中生活被誤當成主要分類依據', '細長外型被誤當成充分判準'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  蝴蝶: {
    animalName: '蝴蝶',
    correctPhylum: '節肢動物門',
    itemType: 'representative',
    majorDiagnosticFeatures: ['外骨骼', '成對附肢', '附肢有關節'],
    acceptableCoreFeatures: ['身體分節'],
    auxiliaryClues: [],
    misleadingClues: ['多數有殼', '外表有殼或硬殼', '身體柔軟', '觸手'],
    targetMisconceptions: ['會飛被誤當成分類依據', '忽略外骨骼與關節附肢'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  蜘蛛: {
    animalName: '蜘蛛',
    correctPhylum: '節肢動物門',
    itemType: 'near_transfer',
    majorDiagnosticFeatures: ['外骨骼', '成對附肢', '附肢有關節'],
    acceptableCoreFeatures: ['身體分節'],
    auxiliaryClues: [],
    misleadingClues: ['多數有殼', '外表有殼或硬殼', '身體柔軟', '觸手'],
    targetMisconceptions: ['蜘蛛不像昆蟲所以不是節肢動物', '腳很多被誤當成主要分類依據'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  螃蟹: {
    animalName: '螃蟹',
    correctPhylum: '節肢動物門',
    itemType: 'representative',
    majorDiagnosticFeatures: ['外骨骼', '成對附肢', '附肢有關節'],
    acceptableCoreFeatures: ['身體分節'],
    auxiliaryClues: ['海水中生活', '外表有殼或硬殼'],
    misleadingClues: ['多數有殼', '肌肉足'],
    targetMisconceptions: ['有殼就判斷為軟體動物', '住在海邊被誤當成分類依據'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  蝦子: {
    animalName: '蝦子',
    correctPhylum: '節肢動物門',
    itemType: 'near_transfer',
    majorDiagnosticFeatures: ['外骨骼', '成對附肢', '附肢有關節'],
    acceptableCoreFeatures: ['身體分節'],
    auxiliaryClues: ['水中生活', '海水中生活', '外表有殼或硬殼'],
    misleadingClues: ['肌肉足'],
    targetMisconceptions: ['水中生活被誤當成分類依據', '外表有殼而混淆軟體動物'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  海星: {
    animalName: '海星',
    correctPhylum: '棘皮動物門',
    itemType: 'representative',
    majorDiagnosticFeatures: ['棘皮', '管足'],
    acceptableCoreFeatures: ['成體輻射對稱'],
    auxiliaryClues: ['海水中生活'],
    misleadingClues: ['外骨骼', '身體分節', '成對附肢'],
    targetMisconceptions: ['星形外觀被誤當成主要分類依據', '海水中生活被誤當成分類依據'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  海膽: {
    animalName: '海膽',
    correctPhylum: '棘皮動物門',
    itemType: 'near_transfer',
    majorDiagnosticFeatures: ['棘皮', '管足'],
    acceptableCoreFeatures: ['成體輻射對稱'],
    auxiliaryClues: ['海水中生活', '外表有殼或硬殼'],
    misleadingClues: ['外骨骼', '成對附肢'],
    targetMisconceptions: ['硬殼外觀混淆節肢動物', '海水中生活被誤當成分類依據'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },

  海參: {
    animalName: '海參',
    correctPhylum: '棘皮動物門',
    itemType: 'far_transfer',
    majorDiagnosticFeatures: ['棘皮', '管足'],
    acceptableCoreFeatures: ['成體輻射對稱'],
    auxiliaryClues: ['海水中生活'],
    misleadingClues: ['身體細長', '身體分節', '環狀體節', '身體柔軟'],
    targetMisconceptions: ['身體細長就判斷為環節動物', '海參不像海星，因此不是棘皮動物'],
    parallelSet: 'A',
    rubricVersion: RUBRIC_VERSION,
  },
}

export const ITEM_RUBRICS_BY_QUESTION: Record<string, ItemRubric> = {
  // Evidence questions from lib/questions.ts
  Q1: ITEM_RUBRICS_BY_ANIMAL['水母'],
  Q2: ITEM_RUBRICS_BY_ANIMAL['海葵'],
  Q3: ITEM_RUBRICS_BY_ANIMAL['渦蟲'],
  Q4: ITEM_RUBRICS_BY_ANIMAL['蝸牛'],
  Q5: ITEM_RUBRICS_BY_ANIMAL['蛤蠣'],
  Q6: ITEM_RUBRICS_BY_ANIMAL['蚯蚓'],
  Q7: ITEM_RUBRICS_BY_ANIMAL['水蛭'],
  Q8: ITEM_RUBRICS_BY_ANIMAL['海膽'],
  Q9: ITEM_RUBRICS_BY_ANIMAL['海星'],
  Q10: ITEM_RUBRICS_BY_ANIMAL['蝴蝶'],
  Q11: ITEM_RUBRICS_BY_ANIMAL['蜘蛛'],
  Q12: ITEM_RUBRICS_BY_ANIMAL['螃蟹'],

  // Transfer questions from app/page.tsx
  T1: ITEM_RUBRICS_BY_ANIMAL['珊瑚'],
  T2: ITEM_RUBRICS_BY_ANIMAL['中華肝吸蟲'],
  T3: ITEM_RUBRICS_BY_ANIMAL['中華槍烏賊'],
  T4: ITEM_RUBRICS_BY_ANIMAL['海邊分節小動物'],
  T5: ITEM_RUBRICS_BY_ANIMAL['蝦子'],
  T6: ITEM_RUBRICS_BY_ANIMAL['海參'],
}

export function getItemRubric(params: {
  questionId?: string
  animalName?: string
}) {
  const byQuestion =
    params.questionId != null ? ITEM_RUBRICS_BY_QUESTION[params.questionId] : undefined

  if (byQuestion) return byQuestion

  const byAnimal =
    params.animalName != null ? ITEM_RUBRICS_BY_ANIMAL[params.animalName] : undefined

  return byAnimal ?? null
}