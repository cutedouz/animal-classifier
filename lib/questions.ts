// lib/stage-data.ts
// 直接整份取代目前那個含有 evidenceQuestions / compareQuestions / transferQuestions 的檔案

export const PHYLUM_OPTIONS = [
  '刺絲胞動物門',
  '扁形動物門',
  '軟體動物門',
  '環節動物門',
] as const

export type PhylumOption = (typeof PHYLUM_OPTIONS)[number]

export type MisconceptionCode = 'A1' | 'R1' | 'T1' | 'H1' | 'U0' | null

export type RepresentationType = 'image' | 'text' | 'text_image'

export type StageQuestionBase = {
  id: string
  stage: 'bridge' | 'evidence' | 'compare' | 'transfer'
  representationType: RepresentationType
  prompt: string
  stimulusText: string
  imageUrl: string | null
  options?: readonly string[]
}

export type EvidenceQuestion = StageQuestionBase & {
  stage: 'evidence'
  options: readonly PhylumOption[]
  correctAnswer: PhylumOption
  targetFeature: string
  misconceptionMap: Record<PhylumOption, MisconceptionCode>
}

export type CompareQuestion = StageQuestionBase & {
  stage: 'compare'
  options: readonly PhylumOption[]
  correctAnswer: PhylumOption
  targetFeature: string
  compareFocus: string
  correctFeedback: string
  fallbackFeedback: string
  feedbackByCode: Record<Exclude<MisconceptionCode, null>, string>
  misconceptionMap: Record<PhylumOption, MisconceptionCode>
}

export type TransferQuestion = StageQuestionBase & {
  stage: 'transfer'
  options: readonly PhylumOption[]
  correctAnswer: PhylumOption
  targetFeature: string
  misconceptionMap: Record<PhylumOption, MisconceptionCode>
}

export type Stage1Card = {
  id: string
  name: string
  imageUrl: string
  shortLabel: string
  phylum: PhylumOption
  visibleHint: string
  diagnosticFeatures: string[]
  warning: string
}

export type BridgeReflectQuestion = {
  id: string
  prompt: string
  options: string[]
  allowOther?: boolean
}

export type BridgeFeatureChoice = {
  id: string
  text: string
  category: 'diagnostic' | 'possible_but_unstable'
}

export type BridgeSortBucket = {
  id: string
  label: string
  featureText: string
  cardIds: string[]
}

export type DichotomousKeyNode = {
  id: string
  question: string
  yesNext?: string
  noNext?: string
  result?: PhylumOption
  hint?: string
}

export const stage1Cards: Stage1Card[] = [
  {
    id: 'P1',
    name: '水母',
    imageUrl: '/animals/p1.jpg',
    shortLabel: '水母',
    phylum: '刺絲胞動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['放射對稱', '口周有觸手', '觸手有刺絲胞'],
    warning: '生活在水中不是最主要的分類依據。',
  },
  {
    id: 'P2',
    name: '海葵',
    imageUrl: '/animals/p2.jpg',
    shortLabel: '海葵',
    phylum: '刺絲胞動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['放射對稱', '口部周圍有觸手', '觸手有刺絲胞'],
    warning: '固著生活不代表是植物。',
  },
  {
    id: 'P3',
    name: '渦蟲',
    imageUrl: '/animals/p3.jpg',
    shortLabel: '渦蟲',
    phylum: '扁形動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['身體扁平', '左右對稱', '消化系統只有一個開口'],
    warning: '細長柔軟不是最主要的判準；重點是扁平。',
  },
  {
    id: 'P4',
    name: '寄生性扁形動物',
    imageUrl: '/animals/p4.jpg',
    shortLabel: '寄生性扁形動物',
    phylum: '扁形動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['身體扁平', '左右對稱', '消化系統不完整'],
    warning: '寄生不是最主要的分類依據；重點仍是身體構造。',
  },
  {
    id: 'P5',
    name: '蝸牛',
    imageUrl: '/animals/p5.jpg',
    shortLabel: '蝸牛',
    phylum: '軟體動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['身體柔軟不分節', '以腹足爬行', '通常有殼'],
    warning: '有殼不是唯一判準；重點是身體柔軟不分節。',
  },
  {
    id: 'P6',
    name: '蛞蝓',
    imageUrl: '/animals/p6.jpg',
    shortLabel: '蛞蝓',
    phylum: '軟體動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['身體柔軟不分節', '沒有明顯外殼', '和蝸牛同屬軟體動物'],
    warning: '沒有殼不代表不是軟體動物。',
  },
  {
    id: 'P7',
    name: '章魚',
    imageUrl: '/animals/p7.jpg',
    shortLabel: '章魚',
    phylum: '軟體動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['身體柔軟不分節', '有腕足與吸盤', '沒有明顯外殼'],
    warning: '有腕足或觸手，不代表就是刺絲胞動物。',
  },
  {
    id: 'P8',
    name: '蛤蜊',
    imageUrl: '/animals/p8.jpg',
    shortLabel: '蛤蜊',
    phylum: '軟體動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['身體柔軟不分節', '有兩片殼', '有斧足'],
    warning: '有硬殼不代表和其他有殼生物同一類。',
  },
  {
    id: 'P9',
    name: '蚯蚓',
    imageUrl: '/animals/p9.jpg',
    shortLabel: '蚯蚓',
    phylum: '環節動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['身體明顯分節', '每節外形相似', '身體柔軟細長'],
    warning: '細長不是重點；分節才是重點。',
  },
  {
    id: 'P10',
    name: '水蛭',
    imageUrl: '/animals/p10.jpg',
    shortLabel: '水蛭',
    phylum: '環節動物門',
    visibleHint: '第一次自由分類先不要看特徵；橋接階段才會用到。',
    diagnosticFeatures: ['身體分節', '前後有吸盤', '身體柔軟細長'],
    warning: '會吸血不是最主要的分類依據；分節比較重要。',
  },
]

export const bridgeReflectQuestions: BridgeReflectQuestion[] = [
  {
    id: 'B1',
    prompt: '你剛剛自由分組時，最常用哪些依據？（可複選）',
    options: [
      '長得像不像',
      '有沒有殼',
      '有沒有觸手',
      '身體是不是扁平',
      '身體有沒有分節',
      '生活在水中或陸地',
      '會不會吸血／寄生',
      '我其實不太確定',
    ],
  },
  {
    id: 'B2',
    prompt: '你覺得哪些依據，比較適合拿來判斷「屬於哪一門」？（可複選）',
    options: [
      '放射對稱',
      '觸手有刺絲胞',
      '身體扁平',
      '身體柔軟不分節',
      '身體分節',
      '生活在水中',
      '有沒有殼',
      '會不會吸血／寄生',
    ],
  },
]

export const bridgeFeatureChoices: BridgeFeatureChoice[] = [
  { id: 'F1', text: '放射對稱', category: 'diagnostic' },
  { id: 'F2', text: '口周有觸手', category: 'possible_but_unstable' },
  { id: 'F3', text: '觸手有刺絲胞', category: 'diagnostic' },
  { id: 'F4', text: '身體扁平', category: 'diagnostic' },
  { id: 'F5', text: '身體柔軟不分節', category: 'diagnostic' },
  { id: 'F6', text: '身體分節', category: 'diagnostic' },
  { id: 'F7', text: '有沒有殼', category: 'possible_but_unstable' },
  { id: 'F8', text: '生活在水中', category: 'possible_but_unstable' },
  { id: 'F9', text: '外形細長', category: 'possible_but_unstable' },
  { id: 'F10', text: '會不會吸血／寄生', category: 'possible_but_unstable' },
]

export const bridgeSortBuckets: BridgeSortBucket[] = [
  {
    id: 'G1',
    label: '特徵配對 1',
    featureText: '口周有觸手，且觸手有刺絲胞',
    cardIds: ['P1', 'P2'],
  },
  {
    id: 'G2',
    label: '特徵配對 2',
    featureText: '身體扁平',
    cardIds: ['P3', 'P4'],
  },
  {
    id: 'G3',
    label: '特徵配對 3',
    featureText: '身體柔軟不分節',
    cardIds: ['P5', 'P6', 'P7', 'P8'],
  },
  {
    id: 'G4',
    label: '特徵配對 4',
    featureText: '身體分節',
    cardIds: ['P9', 'P10'],
  },
]

export const dichotomousKeyV1: DichotomousKeyNode[] = [
  {
    id: 'K1',
    question: '這個動物的口部周圍是否有觸手，而且觸手具有刺絲胞？',
    yesNext: 'R1',
    noNext: 'K2',
    hint: '不要只看生活在水中；重點是觸手是否具有刺絲胞。',
  },
  {
    id: 'K2',
    question: '這個動物的身體是否明顯分節，而且每節外形相似？',
    yesNext: 'R2',
    noNext: 'K3',
    hint: '不要只看細長；重點是身體是否分節。',
  },
  {
    id: 'K3',
    question: '這個動物的身體是否明顯扁平？',
    yesNext: 'R3',
    noNext: 'K4',
    hint: '不要只看寄生或棲地；重點是身體是否扁平。',
  },
  {
    id: 'K4',
    question: '這個動物是否身體柔軟，而且不分節？',
    yesNext: 'R4',
    noNext: 'R5',
    hint: '不要只看有沒有殼；重點是身體是否柔軟不分節。',
  },
  { id: 'R1', question: '', result: '刺絲胞動物門' },
  { id: 'R2', question: '', result: '環節動物門' },
  { id: 'R3', question: '', result: '扁形動物門' },
  { id: 'R4', question: '', result: '軟體動物門' },
  {
    id: 'R5',
    question: '',
    result: '軟體動物門',
    hint: '若無法判定，表示這張卡需要更多特徵提示。v1 先回到 feature card 再判斷。',
  },
]

export const evidenceQuestions: EvidenceQuestion[] = [
  {
    id: 'Q1',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '水母應該分類到哪一門？',
    stimulusText:
      '已知：身體呈放射對稱，口周有多條觸手，觸手具有刺絲胞。請根據主要構造與特徵判斷，不要只看生活環境。',
    imageUrl: '/animals/p1.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '刺絲胞動物門',
    targetFeature: '放射對稱、口周有觸手、觸手有刺絲胞',
    misconceptionMap: {
      '刺絲胞動物門': null,
      '扁形動物門': 'A1',
      '軟體動物門': 'A1',
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q2',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '海葵應該分類到哪一門？',
    stimulusText:
      '已知：身體柔軟，外形呈放射對稱，口部周圍有觸手，觸手具有刺絲胞。請根據主要構造與特徵判斷。',
    imageUrl: '/animals/p2.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '刺絲胞動物門',
    targetFeature: '放射對稱、口部周圍有觸手、觸手有刺絲胞',
    misconceptionMap: {
      '刺絲胞動物門': null,
      '扁形動物門': 'A1',
      '軟體動物門': 'A1',
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q3',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '渦蟲應該分類到哪一門？',
    stimulusText:
      '已知：身體扁平，左右對稱，消化系統只有一個開口。請根據主要構造與特徵判斷。',
    imageUrl: '/animals/p3.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '扁形動物門',
    targetFeature: '身體扁平',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': null,
      '軟體動物門': 'A1',
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q4',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '寄生性扁形動物應該分類到哪一門？',
    stimulusText:
      '已知：身體扁平，左右對稱，消化系統不完整。請根據主要構造與特徵判斷，不要只看「寄生」這件事。',
    imageUrl: '/animals/p4.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '扁形動物門',
    targetFeature: '身體扁平、消化系統不完整',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': null,
      '軟體動物門': 'A1',
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q5',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '蝸牛應該分類到哪一門？',
    stimulusText:
      '已知：身體柔軟不分節，以腹足爬行，而且通常有殼。請根據主要構造與特徵判斷。',
    imageUrl: '/animals/p5.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '軟體動物門',
    targetFeature: '身體柔軟不分節；腹足；通常有殼',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q6',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '蛞蝓應該分類到哪一門？',
    stimulusText:
      '已知：這種動物身體柔軟不分節，沒有明顯外殼。請注意：沒有殼，不代表不是軟體動物。',
    imageUrl: '/animals/p6.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '軟體動物門',
    targetFeature: '身體柔軟不分節；不是所有軟體動物都有明顯外殼',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q7',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '章魚應該分類到哪一門？',
    stimulusText:
      '已知：身體柔軟不分節，具有腕足與吸盤，沒有明顯外殼。請注意：有些軟體動物沒有明顯外殼。',
    imageUrl: '/animals/p7.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '軟體動物門',
    targetFeature: '身體柔軟不分節；有腕足與吸盤；沒有明顯外殼',
    misconceptionMap: {
      '刺絲胞動物門': 'T1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q8',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '蛤蜊應該分類到哪一門？',
    stimulusText:
      '已知：身體柔軟不分節，具有兩片殼，而且有斧足。請根據主要構造與特徵判斷。',
    imageUrl: '/animals/p8.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '軟體動物門',
    targetFeature: '身體柔軟不分節；兩片殼；斧足',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q9',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '蚯蚓應該分類到哪一門？',
    stimulusText:
      '已知：身體明顯分節，每節外形相似，身體柔軟細長。請根據身體構造判斷，不要只看外形細長。',
    imageUrl: '/animals/p9.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '環節動物門',
    targetFeature: '身體分節、每節外形相似',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'R1',
      '軟體動物門': 'A1',
      '環節動物門': null,
    },
  },
  {
    id: 'Q10',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '水蛭應該分類到哪一門？',
    stimulusText:
      '已知：身體分節，前後都有吸盤，身體柔軟細長。請根據主要構造與特徵判斷，不要只看「會吸血」。',
    imageUrl: '/animals/p10.jpg',
    options: PHYLUM_OPTIONS,
    correctAnswer: '環節動物門',
    targetFeature: '身體分節；前後有吸盤',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'R1',
      '軟體動物門': 'A1',
      '環節動物門': null,
    },
  },
]

export const compareQuestions: CompareQuestion[] = [
  {
    id: 'C1',
    stage: 'compare',
    representationType: 'text',
    prompt: '章魚與水母都有觸手，章魚應該分類到哪一門？',
    stimulusText:
      '先依你的判斷作答，再閱讀回饋。請注意：分類不能只看「有觸手」。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '軟體動物門',
    targetFeature: '不能只因為有觸手就判成刺絲胞動物門',
    compareFocus: '章魚 vs 水母：都有觸手，但分類依據不同',
    correctFeedback:
      '你第一次的判斷已經抓到重點。章魚雖然有腕足，但不屬於刺絲胞動物門；關鍵仍然是它身體柔軟不分節，屬於軟體動物。',
    fallbackFeedback:
      '這題不能只看單一外觀特徵。請重新比較章魚與水母的核心構造，再進行改答。',
    feedbackByCode: {
      T1: '你目前最可能是把「有觸手」直接當成刺絲胞動物門的判準。水母的關鍵不只是有觸手，而是口周有觸手且觸手具有刺絲胞；章魚則是身體柔軟不分節的軟體動物。',
      A1: '你目前可能是根據整體外觀相似來判斷。章魚與水母都可能有延伸構造，但分類不能只看像不像，而要看核心構造。',
      U0: '你目前可能尚未抓到核心構造。請重新問自己：這題真正要看的是棲地嗎？外形嗎？還是某個關鍵構造？',
      H1: '這題不應只依生活環境判斷。即使都可能生活在水中，分類仍應回到主要構造與特徵。',
      R1: '這題不應只依細長或延伸外形判斷。請重新比較真正有診斷性的構造特徵。',
    },
    misconceptionMap: {
      '刺絲胞動物門': 'T1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'C2',
    stage: 'compare',
    representationType: 'text',
    prompt: '蚯蚓和渦蟲都細長柔軟，蚯蚓應該分類到哪一門？',
    stimulusText:
      '先依你的判斷作答，再閱讀回饋。請注意：分類不能只看細長外形。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '環節動物門',
    targetFeature: '不能只看細長外形，要看身體是否分節',
    compareFocus: '蚯蚓 vs 渦蟲：外形都細長，但身體構造不同',
    correctFeedback:
      '你第一次的判斷已經抓到核心：蚯蚓屬於環節動物，重點在身體分節、每節外形相似。',
    fallbackFeedback:
      '這題不能只用外觀直覺判斷。請重新比較蚯蚓與渦蟲的核心構造，特別注意身體是否分節。',
    feedbackByCode: {
      R1: '你目前最可能是被「長長的、細長的」外形帶著走。蚯蚓分類的關鍵不是長，而是身體分節、每節外形相似；渦蟲則強調身體扁平。',
      A1: '你目前可能是根據整體外觀相似做判斷。蚯蚓與渦蟲都可能看起來細長柔軟，但分類不能只看像不像，而要看核心構造。',
      U0: '你目前可能還沒有抓到這題的核心判準。請重新問自己：這題最重要的是外形，還是身體是否分節？',
      H1: '這題不應依生活環境判斷。請回到身體構造本身比較。',
      T1: '這題與觸手無關。請不要把不相關特徵帶進判斷，重新回到身體是否分節這個核心特徵。',
    },
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'R1',
      '軟體動物門': 'A1',
      '環節動物門': null,
    },
  },
  {
    id: 'C3',
    stage: 'compare',
    representationType: 'text',
    prompt: '蝸牛和蛞蝓的外觀不同，蛞蝓應該分類到哪一門？',
    stimulusText:
      '先依你的判斷作答，再閱讀回饋。請注意：有沒有明顯外殼，不是唯一的分類依據。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '軟體動物門',
    targetFeature: '不能把有殼當成唯一判準；重點是身體柔軟不分節',
    compareFocus: '蝸牛 vs 蛞蝓：一個有明顯殼，一個沒有，但都屬軟體動物',
    correctFeedback:
      '你第一次的判斷已經抓到重點。蛞蝓雖然沒有明顯外殼，但仍屬於身體柔軟不分節的軟體動物。',
    fallbackFeedback:
      '這題不能只把有沒有殼當成唯一依據。請重新比較蝸牛與蛞蝓的共同構造。',
    feedbackByCode: {
      R1: '你可能過度依賴表面外觀差異。蝸牛與蛞蝓外觀不同，但共同重點是身體柔軟不分節。',
      A1: '你可能是根據整體外觀來判斷。分類時不能只看像不像，而要看核心構造。',
      U0: '你可能還沒有抓到這題的核心。請問自己：這題真正要看的是有沒有殼，還是身體是不是柔軟不分節？',
      H1: '這題不應依棲地判斷。請回到身體構造比較。',
      T1: '這題與觸手無關。請不要把不相關特徵帶進判斷。',
    },
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'C4',
    stage: 'compare',
    representationType: 'text',
    prompt: '水蛭和蚯蚓都屬於細長柔軟的動物，水蛭應該分類到哪一門？',
    stimulusText:
      '先依你的判斷作答，再閱讀回饋。請注意：會吸血不是主要分類依據。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '環節動物門',
    targetFeature: '不能只看功能；重點是身體分節',
    compareFocus: '水蛭 vs 蚯蚓：功能不同，但都具有環節動物的核心特徵',
    correctFeedback:
      '你第一次的判斷已經抓到重點。水蛭雖然常被注意到會吸血，但真正的分類依據仍是身體分節。',
    fallbackFeedback:
      '這題不能只看生活方式或功能。請重新比較水蛭與蚯蚓的共同身體構造。',
    feedbackByCode: {
      R1: '你可能受到細長外形影響。分類時要再往前一步，看身體是否分節。',
      A1: '你可能根據整體外觀來判斷。請回到核心構造比較。',
      U0: '你可能還沒有抓到這題的核心。請問自己：這題最重要的是吸血，還是身體是否分節？',
      H1: '這題不應依棲地判斷。請回到身體構造。',
      T1: '這題與觸手無關。請不要把不相關特徵帶進判斷。',
    },
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'R1',
      '軟體動物門': 'A1',
      '環節動物門': null,
    },
  },
]

export const transferQuestions: TransferQuestion[] = [
  {
    id: 'T1',
    stage: 'transfer',
    representationType: 'text',
    prompt: '某動物的口部周圍有觸手，觸手具有刺絲胞。它最可能分類到哪一門？',
    stimulusText:
      '此題是新表徵題，請根據描述中的核心特徵判斷。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '刺絲胞動物門',
    targetFeature: '口周有觸手、觸手有刺絲胞',
    misconceptionMap: {
      '刺絲胞動物門': null,
      '扁形動物門': 'A1',
      '軟體動物門': 'A1',
      '環節動物門': 'R1',
    },
  },
  {
    id: 'T2',
    stage: 'transfer',
    representationType: 'text',
    prompt: '某動物身體明顯扁平，左右對稱，消化系統只有一個開口。它最可能分類到哪一門？',
    stimulusText:
      '此題是新表徵題，請留意真正有診斷性的特徵。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '扁形動物門',
    targetFeature: '身體扁平',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': null,
      '軟體動物門': 'A1',
      '環節動物門': 'R1',
    },
  },
  {
    id: 'T3',
    stage: 'transfer',
    representationType: 'text',
    prompt: '某動物身體柔軟不分節，沒有明顯外殼。它最可能分類到哪一門？',
    stimulusText:
      '請注意：不要因為沒有殼，就排除軟體動物門。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '軟體動物門',
    targetFeature: '身體柔軟不分節；不是所有軟體動物都有明顯外殼',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'T4',
    stage: 'transfer',
    representationType: 'text',
    prompt: '某動物身體由許多相似體節組成，外形細長柔軟。它最可能分類到哪一門？',
    stimulusText:
      '請留意真正有診斷性的特徵，不要只看外形細長。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '環節動物門',
    targetFeature: '身體分節、每節外形相似',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'R1',
      '軟體動物門': 'A1',
      '環節動物門': null,
    },
  },
  {
    id: 'T5',
    stage: 'transfer',
    representationType: 'text',
    prompt: '某動物生活在海中，但身體柔軟不分節，沒有刺絲胞，也不是放射對稱。它最可能分類到哪一門？',
    stimulusText:
      '這題要檢查你能不能排除「生活在海中」這個干擾線索。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '軟體動物門',
    targetFeature: '不要用棲地當主判準；回到身體柔軟不分節',
    misconceptionMap: {
      '刺絲胞動物門': 'H1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'T6',
    stage: 'transfer',
    representationType: 'text',
    prompt: '某動物外形細長，但身體不分節，而且明顯扁平。它最可能分類到哪一門？',
    stimulusText:
      '這題要檢查你能不能排除「細長」這個干擾線索。',
    imageUrl: null,
    options: PHYLUM_OPTIONS,
    correctAnswer: '扁形動物門',
    targetFeature: '不要只看細長；回到身體扁平',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': null,
      '軟體動物門': 'A1',
      '環節動物門': 'R1',
    },
  },
]