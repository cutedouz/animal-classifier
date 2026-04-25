'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  stage1Cards,
  bridgeReflectQuestions,
  evidenceQuestions,
} from '../lib/questions'

type AppStage = 'stage1' | 'awareness' | 'evidence' | 'transfer' | 'done'

const SIX_PHYLA = [
  '刺絲胞動物門',
  '扁形動物門',
  '軟體動物門',
  '環節動物門',
  '節肢動物門',
  '棘皮動物門',
] as const

type SixPhylum = (typeof SIX_PHYLA)[number]

type StageGroup = {
  id: string
  name: string
  reason: string
  cardIds: string[]
}

type DragPayload = {
  cardId: string
  source: 'bank' | 'group'
  sourceGroupId?: string
}

type EvidenceResponse = {
  questionId: string
  animalName: string
  answer: SixPhylum
  selectedFeatures: string[]

  // v10 後新增：記錄當題實際呈現給學生的特徵選項
  featureOptionsShown?: string[]
  maxSelectableFeatures?: number
  featureOptionVersion?: string

  reasonText: string
  confidence: number
}

type EnterSession = {
  studentId?: string
  schoolCode: string
  schoolYear: string
  semester: string
  grade: string
  className: string
  seatNo: string
  maskedName?: string
  enteredAt?: string
}

type GuideCard = {
  phylum: SixPhylum
  examples: string[]
  observePrompts: string[]
  keyFeatures: string[]
  unstableClues: string[]
  teacherTip: string
}

type ReadinessCheck = {
  id: string
  phylum: SixPhylum
  question: string
  options: string[]
  correct: string
}

type ResultRow = {
  questionId: string
  animalName: string
  userAnswer: string
  correctAnswer: SixPhylum | null
  isCorrect: boolean | null
  selectedFeatures: string[]
  recommendedFeatures: string[]
  feedback: string
}

type QuestionLike = {
  id: string
  prompt: string
  stimulusText: string
  imageUrl: string | null
  animalName?: string
}

type LearningItemLog = {
  stage: 'evidence' | 'transfer'
  questionId: string
  animalName: string
  enteredAt: string | null
  submittedAt: string
  durationMs: number | null
  finalAnswer: SixPhylum
  selectedFeatures: string[]

  // v10 後新增：記錄當題實際呈現給學生的特徵選項
  featureOptionsShown?: string[]
  maxSelectableFeatures?: number
  featureOptionVersion?: string

  reasonText: string
  confidence: number
  isCorrect: boolean | null
}

type LearningEventLog = {
  stage: AppStage
  questionId: string | null
  eventType: string
  eventValue?: Record<string, unknown> | null
  clientTs: string
}

const INITIAL_GROUPS: StageGroup[] = [
  { id: 'G1', name: '群組 1', reason: '', cardIds: [] },
  { id: 'G2', name: '群組 2', reason: '', cardIds: [] },
  { id: 'G3', name: '群組 3', reason: '', cardIds: [] },
]

const STAGE1_OVERALL_REASON_MIN_LENGTH = 8

const STAGE3_EVIDENCE_IDS = ['Q1', 'Q3', 'Q4', 'Q6', 'Q9', 'Q10'] as const

function getTrimmedLength(value: string) {
  return String(value ?? '').trim().length
}

const STAGE_ITEMS: {
  key: AppStage
  studentLabel: string
  teacherLabel: string
  fiveELabel: string
}[] = [
  {
    key: 'stage1',
    studentLabel: '自由分類',
    teacherLabel: '先備概念外顯',
    fiveELabel: '5E: Engage',
  },
  {
    key: 'awareness',
    studentLabel: '判準建立',
    teacherLabel: '分類規則建立',
    fiveELabel: '5E: Explore → Explain',
  },
  {
    key: 'evidence',
    studentLabel: '帶提示判定',
    teacherLabel: '鷹架化判定',
    fiveELabel: '5E: Elaborate (Scaffolded)',
  },
  {
    key: 'transfer',
    studentLabel: '遷移應用',
    teacherLabel: '學習遷移評量',
    fiveELabel: '5E: Elaborate (Transfer)',
  },
  {
    key: 'done',
    studentLabel: '結果回饋',
    teacherLabel: '形成性回饋與歷程分析',
    fiveELabel: '5E: Evaluate',
  },
]

const PHYLUM_GUIDE: GuideCard[] = [
  {
    phylum: '刺絲胞動物門',
    examples: ['海葵', '水母'],
    observePrompts: [
      '先看口周圍或身體邊緣是否有觸手。',
      '觀察身體構造是否由中央向外放射排列。',
      '想一想：牠生活在水中，是否足以判斷門別？',
    ],
    keyFeatures: ['刺絲胞', '觸手', '輻射對稱'],
    unstableClues: ['顏色鮮豔', '外型像花', '生活在水中'],
    teacherTip: '先看刺絲胞、觸手與輻射對稱，不要只看外觀像不像花或是否生活在水中。',
  },
  {
    phylum: '扁形動物門',
    examples: ['渦蟲'],
    observePrompts: [
      '先看身體是否明顯扁平。',
      '觀察身體左右兩側是否大致對稱。',
      '檢查身體是否沒有一節一節的體節。',
    ],
    keyFeatures: ['身體扁平', '左右對稱', '無體節'],
    unstableClues: ['皆為寄生蟲', '生活在水中', '身體細長'],
    teacherTip: '重點是身體扁平、左右對稱且無體節，不是只看牠小小的、細長或是否寄生。',
  },
  {
    phylum: '軟體動物門',
    examples: ['蛤蠣', '蝸牛'],
    observePrompts: [
      '先看是否有柔軟身體。',
      '觀察是否有外套膜或由外套膜形成的殼。',
      '觀察是否有肌肉足或類似足部的運動構造。',
    ],
    keyFeatures: ['外套膜', '肌肉足', '多數有殼'],
    unstableClues: ['外表有殼', '看起來很軟'],
    teacherTip: '殼常見，但不能只看有沒有殼；要回到外套膜、肌肉足與柔軟身體等構造。',
  },
  {
    phylum: '環節動物門',
    examples: ['蚯蚓', '水蛭'],
    observePrompts: [
      '先看身體是否由許多相似的環狀體節組成。',
      '觀察身體分節是否沿著前後方向重複出現。',
      '想一想：身體細長是否一定代表環節動物？',
    ],
    keyFeatures: ['身體分節', '環狀體節'],
    unstableClues: ['身體細長', '生活在泥土或水裡'],
    teacherTip: '最關鍵的是體節與重複分節，不是只看長條外形或生活環境。',
  },
  {
    phylum: '節肢動物門',
    examples: ['蝴蝶', '蜘蛛', '螃蟹'],
    observePrompts: [
      '先看身體外面是否有較硬的外骨骼。',
      '觀察身體是否分成不同區段。',
      '觀察腳或附肢是否成對出現並有關節。',
    ],
    keyFeatures: ['外骨骼', '身體分節', '成對附肢'],
    unstableClues: ['會飛', '腳很多', '住在海邊'],
    teacherTip: '要看外骨骼、身體分節與成對附肢，而不是只看會不會飛、腳多不多或住在哪裡。',
  },
  {
    phylum: '棘皮動物門',
    examples: ['海膽', '海星'],
    observePrompts: [
      '先看體表是否有棘狀或粗糙構造。',
      '觀察成體是否常呈五輻對稱。',
      '注意是否具有棘皮動物特有的管足構造。',
    ],
    keyFeatures: ['棘皮', '管足', '成體多為五輻對稱'],
    unstableClues: ['固著不動', '有外骨骼', '外型像星星'],
    teacherTip: '重點不是像不像星星，而是棘皮、管足與成體五輻對稱等構造。',
  },
]

const READINESS_CHECKS: ReadinessCheck[] = [
  {
    id: 'r1',
    phylum: '刺絲胞動物門',
    question: '哪一組最能代表刺絲胞動物門？',
    options: [
      '刺絲胞、觸手、輻射對稱',
      '外套膜、肌肉足、多數有殼',
      '身體分節、成對附肢',
    ],
    correct: '刺絲胞、觸手、輻射對稱',
  },
  {
    id: 'r2',
    phylum: '扁形動物門',
    question: '哪一組最能代表扁形動物門？',
    options: [
      '身體扁平、左右對稱、無體節',
      '外骨骼、身體分節、成對附肢',
      '棘皮、管足、五輻對稱',
    ],
    correct: '身體扁平、左右對稱、無體節',
  },
  {
    id: 'r3',
    phylum: '軟體動物門',
    question: '哪一組最能代表軟體動物門？',
    options: [
      '外套膜、肌肉足、多數有殼',
      '刺絲胞、袋狀身體',
      '環狀體節、身體分節',
    ],
    correct: '外套膜、肌肉足、多數有殼',
  },
  {
    id: 'r4',
    phylum: '環節動物門',
    question: '哪一組最能代表環節動物門？',
    options: [
      '環狀體節、身體分節',
      '外骨骼、成對附肢',
      '棘皮、五輻對稱',
    ],
    correct: '環狀體節、身體分節',
  },
  {
    id: 'r5',
    phylum: '節肢動物門',
    question: '哪一組最能代表節肢動物門？',
    options: [
      '外骨骼、身體分節、成對附肢',
      '身體扁平、無體節',
      '外套膜、肌肉足',
    ],
    correct: '外骨骼、身體分節、成對附肢',
  },
  {
    id: 'r6',
    phylum: '棘皮動物門',
    question: '哪一組最能代表棘皮動物門？',
    options: [
      '棘皮、管足、成體多為五輻對稱',
      '刺絲胞、觸手',
      '外骨骼、成對附肢',
    ],
    correct: '棘皮、管足、成體多為五輻對稱',
  },
]

const transferQuestions: QuestionLike[] = [
  {
    id: 'T1',
    animalName: '珊瑚',
    prompt: '珊瑚應該分類到哪一門？',
    stimulusText:
      '任務說明：請依圖片中的主要特徵判斷。',
    imageUrl: '/animals/transfer/Goniopora%20lobata.jpg',
  },
  {
    id: 'T2',
    animalName: '中華肝吸蟲',
    prompt: '中華肝吸蟲應該分類到哪一門？',
    stimulusText:
      '任務說明：請依圖片中的主要特徵判斷。',
    imageUrl: '/animals/transfer/Clonorchis%20sinensis.jpg',
  },
  {
    id: 'T3',
    animalName: '中華槍烏賊',
    prompt: '中華槍烏賊應該分類到哪一門？',
    stimulusText:
      '任務說明：請依圖片中的主要特徵判斷。',
    imageUrl: '/animals/transfer/Uroteuthis%20chinensis.jpg',
  },
  {
    id: 'T4',
    animalName: '海邊分節小動物',
    prompt: '一種海邊常見、身體由許多相似體節組成的小動物，應該分類到哪一門？',
    stimulusText:
      '任務說明：請依圖片中的主要特徵判斷。',
    imageUrl: '/animals/transfer/Perinereis%20aibuhitensis.jpg',
  },
  {
    id: 'T5',
    animalName: '蝦子',
    prompt: '蝦子應該分類到哪一門？',
    stimulusText:
      '任務說明：請依圖片中的主要特徵判斷。',
    imageUrl: '/animals/transfer/Penaeus%20monodon.jpg',
  },
  {
    id: 'T6',
    animalName: '海參',
    prompt: '海參應該分類到哪一門？',
    stimulusText:
      '任務說明：請依圖片中的主要特徵判斷。',
    imageUrl: '/animals/transfer/Holothuria%20atra.jpg',
  },
]

const ANIMAL_RULES: Record<
  string,
  {
    phylum: SixPhylum
    keyFeatures: string[]
    feedback: string
  }
> = {
  蚯蚓: {
    phylum: '環節動物門',
    keyFeatures: ['身體分節', '環狀體節'],
    feedback: '蚯蚓的重點是體節，不是只看身體長長的。',
  },
  水蛭: {
    phylum: '環節動物門',
    keyFeatures: ['身體分節', '環狀體節'],
    feedback: '水蛭與蚯蚓外型不同，但同樣要從體節判斷。',
  },
  海膽: {
    phylum: '棘皮動物門',
    keyFeatures: ['棘皮', '管足', '五輻對稱'],
    feedback: '海膽的重點不是球形，而是棘皮動物的身體結構。',
  },
  海星: {
    phylum: '棘皮動物門',
    keyFeatures: ['棘皮', '管足', '五輻對稱'],
    feedback: '海星常見五輻對稱，是棘皮動物門的重要線索。',
  },
  蝴蝶: {
    phylum: '節肢動物門',
    keyFeatures: ['外骨骼', '身體分節', '成對附肢'],
    feedback: '會飛不是門別重點，外骨骼與附肢才是關鍵。',
  },
  蜘蛛: {
    phylum: '節肢動物門',
    keyFeatures: ['外骨骼', '身體分節', '成對附肢'],
    feedback: '蜘蛛雖然不像昆蟲，但同屬節肢動物門。',
  },
  螃蟹: {
    phylum: '節肢動物門',
    keyFeatures: ['外骨骼', '身體分節', '成對附肢'],
    feedback: '生活在海邊不是門別重點，仍要看外骨骼與附肢。',
  },
  蛤蠣: {
    phylum: '軟體動物門',
    keyFeatures: ['外套膜', '肌肉足', '多數有殼'],
    feedback: '蛤蠣屬軟體動物門，殼常見，但要回到身體構造判斷。',
  },
  蝸牛: {
    phylum: '軟體動物門',
    keyFeatures: ['外套膜', '肌肉足', '多數有殼'],
    feedback: '蝸牛的重點不是只有殼，而是外套膜與肌肉足。',
  },
  渦蟲: {
    phylum: '扁形動物門',
    keyFeatures: ['身體扁平', '左右對稱', '無體節'],
    feedback: '渦蟲的核心是扁平、無體節，不是只看小小一條。',
  },
  海葵: {
    phylum: '刺絲胞動物門',
    keyFeatures: ['刺絲胞', '觸手', '輻射對稱'],
    feedback: '海葵看起來像花，但真正重要的是刺絲胞與觸手。',
  },
  水母: {
    phylum: '刺絲胞動物門',
    keyFeatures: ['刺絲胞', '觸手', '輻射對稱'],
    feedback: '水母的關鍵是刺絲胞與輻射對稱，不是透明漂浮。',
  },
  珊瑚: {
    phylum: '刺絲胞動物門',
    keyFeatures: ['刺絲胞', '觸手', '輻射對稱'],
    feedback: '珊瑚雖然常固定附著，但分類重點仍是刺絲胞與身體構造。',
  },
  中華肝吸蟲: {
    phylum: '扁形動物門',
    keyFeatures: ['身體扁平', '左右對稱', '無體節'],
    feedback: '中華肝吸蟲屬扁形動物門，重點是身體扁平且無體節，不是只看它是否寄生。',
  },
  中華槍烏賊: {
    phylum: '軟體動物門',
    keyFeatures: ['外套膜', '柔軟身體', '頭足類腕足'],
    feedback:
      '中華槍烏賊屬軟體動物門，雖然外形和蝦、魚差很多，但判斷重點仍是外套膜與頭足類構造。',
  },
  海邊分節小動物: {
    phylum: '環節動物門',
    keyFeatures: ['身體分節', '環狀體節'],
    feedback: '這類動物的判斷重點仍是體節，不是只看生活在海邊或身體細長。',
  },
  蝦子: {
    phylum: '節肢動物門',
    keyFeatures: ['外骨骼', '身體分節', '成對附肢'],
    feedback: '蝦子屬節肢動物門，重點在外骨骼與分節附肢，不是只看生活在水中。',
  },
  海參: {
    phylum: '棘皮動物門',
    keyFeatures: ['棘皮', '管足', '棘皮動物特徵'],
    feedback: '海參雖不像海星，但仍屬棘皮動物門，不能只憑外型判斷。',
  },
}

const ANIMAL_FEATURE_OPTIONS: Record<string, string[]> = {
  海葵: [
    '刺絲胞',
    '觸手',
    '輻射對稱',
    '袋狀身體',
    '固著生活',
    '水中生活',
    '外表有殼或硬殼',
    '左右對稱',
  ],
  水母: [
    '刺絲胞',
    '觸手',
    '輻射對稱',
    '袋狀身體',
    '水中生活',
    '柔軟身體',
    '左右對稱',
    '外骨骼',
  ],
  珊瑚: [
    '刺絲胞',
    '觸手',
    '輻射對稱',
    '袋狀身體',
    '固著生活',
    '水中生活',
    '外表有殼或硬殼',
    '左右對稱',
  ],

  渦蟲: [
    '身體扁平',
    '左右對稱',
    '無體節',
    '柔軟身體',
    '身體細長',
    '身體分節',
    '環狀體節',
    '寄生生活',
  ],
  中華肝吸蟲: [
    '身體扁平',
    '左右對稱',
    '無體節',
    '寄生生活',
    '身體細長',
    '身體分節',
    '環狀體節',
    '外骨骼',
  ],

  蛤蠣: [
    '外套膜',
    '肌肉足',
    '柔軟身體',
    '多數有殼',
    '外表有殼或硬殼',
    '外骨骼',
    '身體分節',
    '成對附肢',
  ],
  蝸牛: [
    '外套膜',
    '肌肉足',
    '柔軟身體',
    '多數有殼',
    '外表有殼或硬殼',
    '身體分節',
    '外骨骼',
    '成對附肢',
  ],
  中華槍烏賊: [
    '外套膜',
    '肌肉足',
    '柔軟身體',
    '觸手',
    '多數有殼',
    '外骨骼',
    '成對附肢',
    '水中生活',
  ],

  蚯蚓: [
    '身體分節',
    '環狀體節',
    '身體細長',
    '柔軟身體',
    '無體節',
    '外骨骼',
    '成對附肢',
    '身體扁平',
  ],
  水蛭: [
    '身體分節',
    '環狀體節',
    '身體細長',
    '柔軟身體',
    '無體節',
    '外骨骼',
    '成對附肢',
    '身體扁平',
  ],
  海邊分節小動物: [
    '身體分節',
    '環狀體節',
    '身體細長',
    '海水中生活',
    '無體節',
    '外骨骼',
    '成對附肢',
    '棘皮',
  ],

  蝴蝶: [
    '外骨骼',
    '身體分節',
    '成對附肢',
    '附肢有關節',
    '多數有殼',
    '外表有殼或硬殼',
    '柔軟身體',
    '觸手',
  ],
  蜘蛛: [
    '外骨骼',
    '身體分節',
    '成對附肢',
    '附肢有關節',
    '多數有殼',
    '外表有殼或硬殼',
    '柔軟身體',
    '觸手',
  ],
  螃蟹: [
    '外骨骼',
    '身體分節',
    '成對附肢',
    '附肢有關節',
    '外表有殼或硬殼',
    '海水中生活',
    '多數有殼',
    '肌肉足',
  ],
  蝦子: [
    '外骨骼',
    '身體分節',
    '成對附肢',
    '附肢有關節',
    '外表有殼或硬殼',
    '水中生活',
    '海水中生活',
    '肌肉足',
  ],

  海星: [
    '棘皮',
    '管足',
    '成體輻射對稱',
    '五輻對稱特徵',
    '海水中生活',
    '外骨骼',
    '身體分節',
    '成對附肢',
  ],
  海膽: [
    '棘皮',
    '管足',
    '成體輻射對稱',
    '五輻對稱特徵',
    '海水中生活',
    '外表有殼或硬殼',
    '外骨骼',
    '成對附肢',
  ],
  海參: [
    '棘皮',
    '管足',
    '成體輻射對稱',
    '海水中生活',
    '身體細長',
    '身體分節',
    '環狀體節',
    '柔軟身體',
  ],
}

const CORE_FEATURES = [
  '刺絲胞',
  '觸手',
  '輻射對稱',
  '袋狀身體',
  '身體扁平',
  '左右對稱',
  '無體節',
  '外套膜',
  '肌肉足',
  '柔軟身體',
  '身體分節',
  '環狀體節',
  '外骨骼',
  '成對附肢',
  '附肢有關節',
  '棘皮',
  '管足',
  '成體輻射對稱',
  '五輻對稱特徵',
] as const

const SUPPORTING_OR_MISLEADING_FEATURES = [
  '多數有殼',
  '外表有殼或硬殼',
  '身體細長',
  '固著生活',
  '水中生活',
  '海水中生活',
  '寄生生活',
] as const

const FEATURE_BANK = [
  ...CORE_FEATURES,
  ...SUPPORTING_OR_MISLEADING_FEATURES,
]

const FEATURE_OPTION_VERSION = '2026-04-26-v1'

const ALLOW_POST_FEEDBACK_RETRY = false

const STRUCTURAL_FEATURE_SET = new Set<string>(CORE_FEATURES)
const SURFACE_FEATURE_SET = new Set<string>(SUPPORTING_OR_MISLEADING_FEATURES)

function getCueProfile(features: string[]) {
  if (!features.length) {
    return {
      label: '未勾選特徵',
      structuralCount: 0,
      surfaceCount: 0,
    }
  }

  const structuralCount = features.filter((feature) => STRUCTURAL_FEATURE_SET.has(feature)).length
  const surfaceCount = features.filter((feature) => SURFACE_FEATURE_SET.has(feature)).length

  if (structuralCount > 0 && surfaceCount === 0) {
    return {
      label: '以結構線索為主',
      structuralCount,
      surfaceCount,
    }
  }

  if (surfaceCount > 0 && structuralCount === 0) {
    return {
      label: '以表面線索為主',
      structuralCount,
      surfaceCount,
    }
  }

  if (structuralCount === 0 && surfaceCount === 0) {
    return {
      label: '線索類型尚未辨識',
      structuralCount,
      surfaceCount,
    }
  }

  return {
    label:
      structuralCount >= surfaceCount
        ? '結構與表面線索混合（偏結構）'
        : '結構與表面線索混合（偏表面）',
    structuralCount,
    surfaceCount,
  }
}

function getConfidenceText(confidence: number | null | undefined) {
  if (confidence == null) return '未記錄信心'
  if (confidence >= 4) return '高信心'
  if (confidence === 3) return '中高信心'
  if (confidence === 2) return '中低信心'
  return '低信心'
}

function getQuestionAction(params: {
  isCorrect: boolean | null
  cueLabel: string
  confidence: number | null | undefined
  correctAnswer: SixPhylum | null
}) {
  const { isCorrect, cueLabel, confidence, correctAnswer } = params

  if (isCorrect === true && cueLabel === '以結構線索為主') {
    return '這題的判準較穩定，下一步請檢查自己能不能把同樣的判準套用到新的生物。'
  }

  if (isCorrect === true && cueLabel !== '以結構線索為主') {
    return '這題雖然答對，但你仍可能混用了表面線索。下一步請試著只用結構特徵重新說一次理由。'
  }

  if ((confidence ?? 0) >= 3 && isCorrect === false) {
    return `你這題屬於「有把握地答錯」，表示可能存在穩定迷思。請優先重看 ${correctAnswer ?? '正確門別'} 的關鍵特徵。`
  }

  if (cueLabel.includes('表面')) {
    return `你這題主要受表面線索干擾。請改用能直接支持 ${correctAnswer ?? '正確門別'} 的身體構造或關鍵特徵重新判斷。`
  }

  return `建議先回看 ${correctAnswer ?? '正確門別'} 的提示卡，再用至少兩個結構特徵重寫一次理由。`
}

function getStudentDiagnosis(params: {
  stage5Rows: Array<{
    stageLabel: string
    questionId: string
    animalName: string
    isCorrect: boolean | null
    selectedFeatures: string[]
    correctAnswer: SixPhylum | null
    confidence: number | null
  }>
  correctCount: number
  totalCount: number
  transferCorrectCount: number
  transferTotalCount: number
}) {
  const { stage5Rows, correctCount, totalCount, transferCorrectCount, transferTotalCount } = params

  const answeredRows = stage5Rows.filter((row) => row.isCorrect !== null)
  const wrongRows = answeredRows.filter((row) => row.isCorrect === false)
  const structuralDominant = answeredRows.filter(
    (row) => getCueProfile(row.selectedFeatures).label === '以結構線索為主'
  ).length
  const surfaceDominant = answeredRows.filter((row) =>
    getCueProfile(row.selectedFeatures).label.includes('表面')
  ).length
  const highConfidenceWrong = wrongRows.filter((row) => (row.confidence ?? 0) >= 3).length

  let headline = '你已完成本次任務，接下來請根據回饋調整判準。'
  if (transferTotalCount > 0 && transferCorrectCount === transferTotalCount) {
    headline = '你已能把前面學到的判準穩定用到新案例。'
  } else if (transferTotalCount > 0 && transferCorrectCount < transferTotalCount) {
    headline = '你在遷移到新案例時仍會失去部分判準，這是目前最需要加強的地方。'
  }

  let keyIssue = '你目前已開始建立分類規則。'
  if (surfaceDominant > structuralDominant) {
    keyIssue = '你目前最主要的問題是：仍常把表面線索當成關鍵判準。'
  } else if (highConfidenceWrong > 0) {
    keyIssue = '你目前最主要的問題是：有些錯誤判斷帶著較高信心，表示可能存在穩定迷思。'
  } else if (wrongRows.length > 0) {
    keyIssue = '你已開始使用部分結構線索，但在新題目中還不夠穩定。'
  }

  let nextStep = '下一步請先重看答錯題目的正確門別提示卡，再用兩個結構特徵重寫理由。'
  if (surfaceDominant > structuralDominant) {
    nextStep = '下一步請先把「外觀、顏色、棲地、是否固定不動」降到輔助位置，改用身體構造當主判準。'
  } else if (highConfidenceWrong > 0) {
    nextStep = '下一步請優先處理「高信心但答錯」的題目，因為那通常代表迷思比不確定更需要修正。'
  } else if (wrongRows.length === 0) {
    nextStep = '下一步請挑一題你原本最沒把握的題目，試著不用提示卡再說一次判斷理由。'
  }

  return {
    headline,
    keyIssue,
    nextStep,
    correctSummary: `${correctCount} / ${totalCount} 題正確`,
  }
}

function shuffleArray<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor((i + 1) * Math.random())
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function getCardName(cardId: string) {
  return stage1Cards.find((card) => card.id === cardId)?.name ?? cardId
}

function getCardById(cardId: string) {
  return stage1Cards.find((card) => card.id === cardId)
}

function inferAnimalName(question: {
  prompt?: string
  stimulusText?: string
  id?: string
  animalName?: string
}) {
  if (question.animalName) return question.animalName
  const text = `${question.prompt ?? ''} ${question.stimulusText ?? ''} ${question.id ?? ''}`
  const animals = Object.keys(ANIMAL_RULES)
  return animals.find((animal) => text.includes(animal)) ?? `題目-${question.id ?? 'unknown'}`
}

function getQuestionFeatureOptions(question: QuestionLike | null | undefined) {
  if (!question) return FEATURE_BANK

  const animalName = inferAnimalName(question)
  return ANIMAL_FEATURE_OPTIONS[animalName] ?? FEATURE_BANK
}

function sanitizeSelectedFeatures(
  features: string[],
  question: QuestionLike | null | undefined,
  maxSelected: number
) {
  const options = getQuestionFeatureOptions(question)
  return features.filter((feature) => options.includes(feature)).slice(0, maxSelected)
}

function moveCardBetweenContainers(params: {
  cardId: string
  source: 'bank' | 'group'
  sourceGroupId?: string
  target: 'bank' | 'group'
  targetGroupId?: string
  bankIds: string[]
  groups: StageGroup[]
}) {
  const { cardId, source, sourceGroupId, target, targetGroupId, bankIds, groups } = params

  let nextBankIds = [...bankIds]
  let nextGroups = groups.map((group) => ({ ...group, cardIds: [...group.cardIds] }))

  if (source === 'bank') {
    nextBankIds = nextBankIds.filter((id) => id !== cardId)
  } else if (sourceGroupId) {
    nextGroups = nextGroups.map((group) =>
      group.id === sourceGroupId
        ? { ...group, cardIds: group.cardIds.filter((id) => id !== cardId) }
        : group
    )
  }

  if (target === 'bank') {
    if (!nextBankIds.includes(cardId)) nextBankIds.push(cardId)
  } else if (targetGroupId) {
    nextGroups = nextGroups.map((group) =>
      group.id === targetGroupId && !group.cardIds.includes(cardId)
        ? { ...group, cardIds: [...group.cardIds, cardId] }
        : group
    )
  }

  return { nextBankIds, nextGroups }
}

function upsertItemLogs(
  prev: LearningItemLog[],
  nextItemLog: LearningItemLog,
  orderedQuestions: { id: string }[]
): LearningItemLog[] {
  const merged = [
    ...prev.filter((item) => item.questionId !== nextItemLog.questionId),
    nextItemLog,
  ]

  return orderedQuestions
    .map((question) => merged.find((item) => item.questionId === question.id))
    .filter(Boolean) as LearningItemLog[]
}

function upsertResponses(
  prev: EvidenceResponse[],
  nextResponse: EvidenceResponse,
  orderedQuestions: { id: string }[]
): EvidenceResponse[] {
  const merged = [...prev.filter((item) => item.questionId !== nextResponse.questionId), nextResponse]

  return orderedQuestions
    .map((question) => merged.find((item) => item.questionId === question.id))
    .filter(Boolean) as EvidenceResponse[]
}

function buildResultRows(
  questions: QuestionLike[],
  responses: EvidenceResponse[]
): ResultRow[] {
  return questions.map((question) => {
    const animalName = inferAnimalName(question)
    const rule = ANIMAL_RULES[animalName]
    const response = responses.find((item) => item.questionId === question.id)

    if (!response) {
      return {
        questionId: question.id,
        animalName,
        userAnswer: '未作答',
        correctAnswer: rule?.phylum ?? null,
        isCorrect: null,
        selectedFeatures: [],
        recommendedFeatures: rule?.keyFeatures ?? [],
        feedback: '此題尚未作答。',
      }
    }

    const isCorrect = rule ? response.answer === rule.phylum : null

    return {
      questionId: question.id,
      animalName,
      userAnswer: response.answer,
      correctAnswer: rule?.phylum ?? null,
      isCorrect,
      selectedFeatures: response.selectedFeatures,
      recommendedFeatures: rule?.keyFeatures ?? [],
      feedback: rule
        ? isCorrect
          ? `正確。${rule.feedback}`
          : `此題正確門別為 ${rule.phylum}。${rule.feedback}`
        : '此題尚未設定標準答案鍵。',
    }
  })
}

function StepHeader({
  stage,
  setStage,
  maxUnlockedIndex,
}: {
  stage: AppStage
  setStage: (stage: AppStage) => void
  maxUnlockedIndex: number
}) {
  return (
    <div className="mb-3 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1.5">
          {STAGE_ITEMS.map((item, index) => {
            const active = stage === item.key
            const locked = index > maxUnlockedIndex

            return (
              <button
                key={item.key}
                type="button"
                disabled={locked}
                onClick={() => {
                  if (!locked) setStage(item.key)
                }}
                className={`rounded-xl border px-2.5 py-2 text-left whitespace-nowrap transition ${
                  active
                    ? 'border-black bg-black text-white'
                    : locked
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                      : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      active
                        ? 'bg-white/15 text-white'
                        : locked
                          ? 'bg-gray-200 text-gray-400'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    第 {index + 1} 階段
                  </span>

                  <span className="text-sm font-bold leading-5">
                    {item.studentLabel}
                  </span>
                </div>

                <div
                  className={`mt-1 hidden text-[11px] leading-4 md:block ${
                    active
                      ? 'text-white/75'
                      : locked
                        ? 'text-gray-400'
                        : 'text-gray-500'
                  }`}
                >
                  {item.teacherLabel} ｜ {item.fiveELabel}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FeatureCheckboxes({
  options,
  selected,
  onChange,
  maxSelected,
}: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  maxSelected?: number
}) {
  const visibleSelected = selected.filter((feature) => options.includes(feature))

  const coreOptions = options.filter((feature) => STRUCTURAL_FEATURE_SET.has(feature))
  const supportingOptions = options.filter((feature) => SURFACE_FEATURE_SET.has(feature))
  const otherOptions = options.filter(
    (feature) => !STRUCTURAL_FEATURE_SET.has(feature) && !SURFACE_FEATURE_SET.has(feature)
  )

  function renderOption(feature: string) {
    const checked = visibleSelected.includes(feature)
    const reachedLimit = maxSelected != null && visibleSelected.length >= maxSelected
    const disabled = !checked && reachedLimit

    return (
      <label
        key={feature}
        className={`flex items-start gap-2 rounded-lg border p-2 text-sm ${
          checked
            ? 'border-black bg-gray-50'
            : disabled
              ? 'border-gray-200 bg-gray-100 text-gray-400'
              : 'border-gray-200 bg-white text-gray-800'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.checked) {
              if (maxSelected != null && visibleSelected.length >= maxSelected) return
              onChange([...visibleSelected, feature])
            } else {
              onChange(visibleSelected.filter((item) => item !== feature))
            }
          }}
          className="mt-1"
        />
        <span>{feature}</span>
      </label>
    )
  }

  return (
    <div className="space-y-4">
      {maxSelected != null ? (
        <div className="rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
          請選出最主要的判斷依據，最多選 {maxSelected} 項。
          目前已選 {visibleSelected.length} / {maxSelected} 項。
        </div>
      ) : null}

      {coreOptions.length > 0 ? (
        <div>
          <div className="mb-2 text-sm font-bold text-gray-800">核心結構特徵</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {coreOptions.map(renderOption)}
          </div>
        </div>
      ) : null}

      {supportingOptions.length > 0 ? (
        <div>
          <div className="mb-2 text-sm font-bold text-gray-800">
            輔助或容易誤用的線索
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {supportingOptions.map(renderOption)}
          </div>
        </div>
      ) : null}

      {otherOptions.length > 0 ? (
        <div>
          <div className="mb-2 text-sm font-bold text-gray-800">其他線索</div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {otherOptions.map(renderOption)}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ToggleCheckboxGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const checked = selected.includes(option)

        return (
          <label
            key={option}
            className="flex items-start gap-2 rounded-lg border border-gray-200 p-2 text-sm"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(option)}
              className="mt-1"
            />
            <span>{option}</span>
          </label>
        )
      })}
    </div>
  )
}

function QuestionCard({
  title,
  prompt,
  stimulusText,
  imageUrl,
  imageVariant = 'normal',
  onZoomOpen,
  onZoomClose,
}: {
  title: string
  prompt: string
  stimulusText: string
  imageUrl: string | null
  imageVariant?: 'normal' | 'large'
  onZoomOpen?: () => void
  onZoomClose?: () => void
}) {
  const [isZoomOpen, setIsZoomOpen] = useState(false)

  const imageHeightClass =
    imageVariant === 'large'
      ? 'h-[360px] sm:h-[480px] lg:h-[620px]'
      : 'h-48 sm:h-56'

  const modalImageHeightClass =
    imageVariant === 'large'
      ? 'max-h-[88vh] w-auto max-w-full object-contain'
      : 'max-h-[80vh] w-auto max-w-full object-contain'

  const closeZoom = () => {
    setIsZoomOpen(false)
    onZoomClose?.()
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
        <div className="mb-2 text-sm font-semibold text-gray-500">{title}</div>
        <div className="mb-3 text-xl font-bold text-gray-900 sm:text-2xl">{prompt}</div>
        <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
          {stimulusText}
        </div>

        {imageUrl ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-3">
            <button
              type="button"
              onClick={() => {
                setIsZoomOpen(true)
                onZoomOpen?.()
              }}
              className="block w-full text-left"
            >
              <img
                src={imageUrl}
                alt={prompt}
                className={`${imageHeightClass} w-full object-contain transition hover:scale-[1.01]`}
              />
            </button>

            <div className="mt-2 text-xs text-gray-500">點擊圖片可放大檢視</div>
          </div>
        ) : null}
      </div>

      {isZoomOpen && imageUrl ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-4"
          onClick={closeZoom}
        >
          <div
            className="relative max-h-full max-w-7xl rounded-2xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeZoom}
              className="absolute right-3 top-3 rounded-full bg-black px-3 py-1 text-sm font-semibold text-white"
            >
              關閉
            </button>

            <img
              src={imageUrl}
              alt={prompt}
              className={modalImageHeightClass}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}

function SummaryBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <h3 className="mb-3 text-xl font-black text-gray-900">{title}</h3>
      <div className="text-sm leading-6 text-gray-700">{children}</div>
    </div>
  )
}

function getGuideExampleCards(guide: GuideCard) {
  return guide.examples.flatMap((name) => {
    const card = stage1Cards.find((item) => item.name === name)
    return card ? [card] : []
  })
}

function GuideCardView({
  guide,
  compact = false,
}: {
  guide: GuideCard
  compact?: boolean
}) {
  const exampleCards = getGuideExampleCards(guide)
  const imageHeightClass = compact ? 'h-24 sm:h-28' : 'h-32 sm:h-40'
  const titleClass = compact ? 'text-base' : 'text-lg'
  const cardPaddingClass = compact ? 'p-3' : 'p-4'

  return (
    <div className={`rounded-2xl border border-blue-200 bg-blue-50 ${cardPaddingClass}`}>
      <div className={`mb-2 font-black text-gray-900 ${titleClass}`}>
        {guide.phylum}
      </div>

      <div className="mb-3 text-sm text-gray-700">
        代表生物：{guide.examples.join('、')}
      </div>

      {exampleCards.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {exampleCards.map((card) => (
            <div
              key={card.id}
              className="overflow-hidden rounded-xl border border-blue-100 bg-white p-2"
            >
              <div className={`${imageHeightClass} w-full`}>
                <img
                  src={card.imageUrl}
                  alt={`${guide.phylum}代表生物：${card.name}`}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </div>

              <div className="mt-2 text-center text-xs font-bold leading-5 text-gray-800">
                {card.name}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          目前沒有找到代表生物圖片。請確認 PHYLUM_GUIDE 的 examples 名稱是否和 stage1Cards 的生物名稱完全一致。
        </div>
      )}

      <div className="mb-2 mt-3 text-sm font-semibold text-gray-700">
        先觀察圖片中的哪些地方？
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-gray-800">
        {guide.observePrompts.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>

      <div className="mb-2 mt-4 text-sm font-semibold text-gray-700">
        通常先看的關鍵特徵
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-gray-800">
        {guide.keyFeatures.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <div className="mb-2 mt-4 text-sm font-semibold text-gray-700">
        容易誤用的線索
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-gray-800">
        {guide.unstableClues.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <div className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-gray-700">
        教師提示：{guide.teacherTip}
      </div>
    </div>
  )
}

export default function Page() {
  const [stage, setStage] = useState<AppStage>('stage1')
  const [enterSession, setEnterSession] = useState<EnterSession | null>(null)

  const [autoSubmitState, setAutoSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle'
  )
  const [autoSubmitMessage, setAutoSubmitMessage] = useState('')

  const [groups, setGroups] = useState<StageGroup[]>(INITIAL_GROUPS)
  const [bankCardIds, setBankCardIds] = useState<string[]>(stage1Cards.map((card) => card.id))
  const [overallReason, setOverallReason] = useState('')
  const [groupCreateCount, setGroupCreateCount] = useState(3)
  const [cardMoveCount, setCardMoveCount] = useState(0)

  const [bridgeReflectAnswers, setBridgeReflectAnswers] = useState<Record<string, string[]>>({})
  const [diagnosticFeatures, setDiagnosticFeatures] = useState<string[]>([])
  const [possibleFeatures, setPossibleFeatures] = useState<string[]>([])
  const [customFeatureText, setCustomFeatureText] = useState('')
  const [readinessAnswers, setReadinessAnswers] = useState<Record<string, string>>({})
  const [readinessAttemptCounts, setReadinessAttemptCounts] = useState<Record<string, number>>({})
  const [awarenessCommitment, setAwarenessCommitment] = useState(false)
  const [awarenessSecondsSpent, setAwarenessSecondsSpent] = useState(0)

  const [evidenceIndex, setEvidenceIndex] = useState(0)
  const [evidenceAnswer, setEvidenceAnswer] = useState<SixPhylum | ''>('')
  const [evidenceSelectedFeatures, setEvidenceSelectedFeatures] = useState<string[]>([])
  const [evidenceReasonText, setEvidenceReasonText] = useState('')
  const [evidenceConfidence, setEvidenceConfidence] = useState(2)
  const [evidenceResponses, setEvidenceResponses] = useState<EvidenceResponse[]>([])
  const [evidenceItemLogs, setEvidenceItemLogs] = useState<LearningItemLog[]>([])
  const [eventLogs, setEventLogs] = useState<LearningEventLog[]>([])

  const [transferIndex, setTransferIndex] = useState(0)
  const [transferAnswer, setTransferAnswer] = useState<SixPhylum | ''>('')
  const [transferSelectedFeatures, setTransferSelectedFeatures] = useState<string[]>([])
  const [transferReasonText, setTransferReasonText] = useState('')
  const [transferConfidence, setTransferConfidence] = useState(2)
  const [transferResponses, setTransferResponses] = useState<EvidenceResponse[]>([])
  const [transferItemLogs, setTransferItemLogs] = useState<LearningItemLog[]>([])

  const [selectedMovePayload, setSelectedMovePayload] = useState<DragPayload | null>(null)
  const [progressHydrated, setProgressHydrated] = useState(false)
  const [readinessOptionMap, setReadinessOptionMap] = useState<Record<string, string[]>>({})

  const stage3EvidenceQuestions = useMemo(
    () =>
      evidenceQuestions.filter((question) =>
        STAGE3_EVIDENCE_IDS.includes(
          question.id as (typeof STAGE3_EVIDENCE_IDS)[number]
        )
      ),
    []
  )

  const currentEvidence = stage3EvidenceQuestions[evidenceIndex]
  const currentTransfer = transferQuestions[transferIndex]

  const currentEvidenceFeatureOptions = useMemo(
  () => getQuestionFeatureOptions(currentEvidence as QuestionLike),
  [currentEvidence?.id]
)

const currentTransferFeatureOptions = useMemo(
  () => getQuestionFeatureOptions(currentTransfer),
  [currentTransfer?.id]
)

  const isDev = process.env.NODE_ENV === 'development'

  const awarenessStartedAtRef = useRef<number | null>(null)
  const awarenessBaseSecondsRef = useRef(0)
  const lastSubmittedHashRef = useRef('')
  const lastProgressSubmittedHashRef = useRef('')
  const retryTimerRef = useRef<number | null>(null)
  const progressSaveTimerRef = useRef<number | null>(null)
  const evidenceTopRef = useRef<HTMLDivElement | null>(null)
  const transferTopRef = useRef<HTMLDivElement | null>(null)
  const evidenceQuestionEnteredAtRef = useRef<string | null>(null)
  const evidenceQuestionStartedAtRef = useRef<number | null>(null)
  const transferQuestionEnteredAtRef = useRef<string | null>(null)
  const transferQuestionStartedAtRef = useRef<number | null>(null)
  const evidenceTimingQuestionIdRef = useRef<string | null>(null)
  const transferTimingQuestionIdRef = useRef<string | null>(null)

  useEffect(() => {
  if (stage !== 'evidence' || !currentEvidence) return
  if (evidenceTimingQuestionIdRef.current === currentEvidence.id) return

  evidenceTimingQuestionIdRef.current = currentEvidence.id
  evidenceQuestionEnteredAtRef.current = new Date().toISOString()
  evidenceQuestionStartedAtRef.current = Date.now()
}, [stage, currentEvidence?.id])

  useEffect(() => {
  if (stage !== 'transfer' || !currentTransfer) return
  if (transferTimingQuestionIdRef.current === currentTransfer.id) return

  transferTimingQuestionIdRef.current = currentTransfer.id
  transferQuestionEnteredAtRef.current = new Date().toISOString()
  transferQuestionStartedAtRef.current = Date.now()
}, [stage, currentTransfer?.id])

  useEffect(() => {
    const map: Record<string, string[]> = {}
    READINESS_CHECKS.forEach((item) => {
      map[item.id] = shuffleArray(item.options)
    })
    setReadinessOptionMap(map)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('animal-classifier-enter-session')
      if (!raw) return
      const parsed = JSON.parse(raw) as EnterSession
      setEnterSession(parsed)
    } catch (error) {
      console.error('讀取進入活動 session 失敗:', error)
    }
  }, [])

  const participantCode =
    enterSession?.studentId ||
    [
      enterSession?.schoolCode,
      enterSession?.schoolYear,
      enterSession?.semester,
      enterSession?.grade,
      enterSession?.className,
      enterSession?.seatNo,
    ]
      .filter(Boolean)
      .join('-') ||
    'anonymous'

  const submissionKey =
    participantCode && enterSession?.enteredAt
      ? `${participantCode}:${enterSession.enteredAt}`
      : participantCode

  useEffect(() => {
    if (!participantCode || participantCode === 'anonymous' || progressHydrated) return

    try {
      const raw = localStorage.getItem(`animal-classifier-progress:${participantCode}`)
      if (!raw) {
        setProgressHydrated(true)
        return
      }

      const saved = JSON.parse(raw)

      if (saved?.participantCode !== participantCode) {
        setProgressHydrated(true)
        return
      }

      const savedStage: AppStage = saved.stage ?? 'stage1'
      const savedEvidenceResponses: EvidenceResponse[] = saved.evidenceResponses ?? []
      const savedTransferResponses: EvidenceResponse[] = saved.transferResponses ?? []

      const savedEvidenceDraft = saved.evidenceDraft ?? null
      const savedTransferDraft = saved.transferDraft ?? null

      setStage(savedStage)
      setGroups(saved.groups ?? INITIAL_GROUPS)
      setBankCardIds(saved.bankCardIds ?? stage1Cards.map((card) => card.id))
      setOverallReason(saved.overallReason ?? '')
      setGroupCreateCount(saved.groupCreateCount ?? 3)
      setCardMoveCount(saved.cardMoveCount ?? 0)

      setBridgeReflectAnswers(saved.bridgeReflectAnswers ?? {})
      setDiagnosticFeatures(saved.diagnosticFeatures ?? [])
      setPossibleFeatures(saved.possibleFeatures ?? [])
      setCustomFeatureText(saved.customFeatureText ?? '')
      setReadinessAnswers(saved.readinessAnswers ?? {})
      setReadinessAttemptCounts(saved.readinessAttemptCounts ?? {})
      setAwarenessCommitment(saved.awarenessCommitment ?? false)
      setAwarenessSecondsSpent(saved.awarenessSecondsSpent ?? 0)

      setEvidenceResponses(savedEvidenceResponses)
      setTransferResponses(savedTransferResponses)
      setEvidenceItemLogs(saved.evidenceItemLogs ?? [])
      setTransferItemLogs(saved.transferItemLogs ?? [])
      setEventLogs(saved.eventLogs ?? [])

      if (savedStage === 'evidence') {
        setEvidenceIndex(
          savedEvidenceDraft?.index ??
            Math.min(savedEvidenceResponses.length, stage3EvidenceQuestions.length - 1)
        )
        setEvidenceAnswer(savedEvidenceDraft?.answer ?? '')
        setEvidenceSelectedFeatures(savedEvidenceDraft?.selectedFeatures ?? [])
        setEvidenceReasonText(savedEvidenceDraft?.reasonText ?? '')
        setEvidenceConfidence(savedEvidenceDraft?.confidence ?? 2)
      }

      if (savedStage === 'transfer') {
        setTransferIndex(
          savedTransferDraft?.index ??
            Math.min(savedTransferResponses.length, transferQuestions.length - 1)
        )
        setTransferAnswer(savedTransferDraft?.answer ?? '')
        setTransferSelectedFeatures(savedTransferDraft?.selectedFeatures ?? [])
        setTransferReasonText(savedTransferDraft?.reasonText ?? '')
        setTransferConfidence(savedTransferDraft?.confidence ?? 2)
      }

      setProgressHydrated(true)
    } catch {
      setProgressHydrated(true)
    }
  }, [participantCode, progressHydrated, stage3EvidenceQuestions.length])

  useEffect(() => {
    if (!participantCode || !progressHydrated) return

    const progress = {
  participantCode,
  stage,
  groups,
  bankCardIds,
  overallReason,
  groupCreateCount,
  cardMoveCount,
  bridgeReflectAnswers,
  diagnosticFeatures,
  possibleFeatures,
  customFeatureText,
  readinessAnswers,
  readinessAttemptCounts,
  awarenessCommitment,
  awarenessSecondsSpent,
  evidenceResponses,
  transferResponses,
  evidenceItemLogs,
  transferItemLogs,
  eventLogs,
  evidenceDraft: {
    index: evidenceIndex,
    answer: evidenceAnswer,
    selectedFeatures: evidenceSelectedFeatures,
    reasonText: evidenceReasonText,
    confidence: evidenceConfidence,
  },
  transferDraft: {
    index: transferIndex,
    answer: transferAnswer,
    selectedFeatures: transferSelectedFeatures,
    reasonText: transferReasonText,
    confidence: transferConfidence,
  },
  savedAt: new Date().toISOString(),
}

    localStorage.setItem(`animal-classifier-progress:${participantCode}`, JSON.stringify(progress))
  }, [
    participantCode,
    progressHydrated,
    stage,
    groups,
    bankCardIds,
    overallReason,
    groupCreateCount,
    cardMoveCount,
    bridgeReflectAnswers,
    diagnosticFeatures,
    possibleFeatures,
    customFeatureText,
    readinessAnswers,
    readinessAttemptCounts,
    awarenessCommitment,
    awarenessSecondsSpent,
    evidenceResponses,
    transferResponses,
    evidenceItemLogs,
    transferItemLogs,
    evidenceIndex,
    evidenceAnswer,
    evidenceSelectedFeatures,
    evidenceReasonText,
    evidenceConfidence,
    transferIndex,
    transferAnswer,
    transferSelectedFeatures,
    transferReasonText,
    transferConfidence,
  ])

  useEffect(() => {
    if (stage !== 'awareness') {
      awarenessStartedAtRef.current = null
      return
    }

    awarenessBaseSecondsRef.current = awarenessSecondsSpent
    awarenessStartedAtRef.current = Date.now()

    const timer = window.setInterval(() => {
      if (awarenessStartedAtRef.current === null) return
      const delta = Math.floor((Date.now() - awarenessStartedAtRef.current) / 1000)
      setAwarenessSecondsSpent(awarenessBaseSecondsRef.current + delta)
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [stage])

  useEffect(() => {
    if (stage !== 'evidence') return

    const timer = window.setTimeout(() => {
      evidenceTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [stage, evidenceIndex])

  useEffect(() => {
    if (stage !== 'transfer') return

    const timer = window.setTimeout(() => {
      transferTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [stage, transferIndex])

  const nonEmptyGroups = useMemo(() => groups.filter((group) => group.cardIds.length > 0), [groups])

  const groupedCardCount = useMemo(
    () => nonEmptyGroups.reduce((sum, group) => sum + group.cardIds.length, 0),
    [nonEmptyGroups]
  )

  const overallReasonLength = getTrimmedLength(overallReason)
  const overallReasonRemaining = Math.max(
    0,
    STAGE1_OVERALL_REASON_MIN_LENGTH - overallReasonLength
  )

  const stage1IncompleteMessages = useMemo(() => {
    const messages: string[] = []

    if (bankCardIds.length > 0) {
      messages.push('還有卡片尚未分組。')
    }

    if (nonEmptyGroups.length < 2) {
      messages.push('至少需要 2 個非空群組。')
    }

    if (nonEmptyGroups.some((group) => group.reason.trim().length === 0)) {
      messages.push('每個非空群組都要填寫分類理由。')
    }

    if (overallReasonLength < STAGE1_OVERALL_REASON_MIN_LENGTH) {
      messages.push(
        `整體分類想法至少需要 ${STAGE1_OVERALL_REASON_MIN_LENGTH} 字，目前為 ${overallReasonLength} 字。`
      )
    }

    return messages
  }, [bankCardIds.length, nonEmptyGroups, overallReasonLength])

  const stage1Complete =
    bankCardIds.length === 0 &&
    groupedCardCount === stage1Cards.length &&
    nonEmptyGroups.length >= 2 &&
    nonEmptyGroups.every((group) => group.reason.trim().length > 0) &&
    overallReasonLength >= STAGE1_OVERALL_REASON_MIN_LENGTH

  const reflectionComplete = bridgeReflectQuestions.every(
    (question) => (bridgeReflectAnswers[question.id] ?? []).length > 0
  )

  const featureChoiceComplete = diagnosticFeatures.length + possibleFeatures.length > 0
  const awarenessABComplete = reflectionComplete && featureChoiceComplete

  const readinessComplete = READINESS_CHECKS.every(
    (item) => readinessAnswers[item.id] === item.correct
  )

  const awarenessComplete =
  reflectionComplete &&
  featureChoiceComplete &&
  readinessComplete &&
  awarenessCommitment

  const evidenceAllComplete = evidenceResponses.length === stage3EvidenceQuestions.length
  const transferAllComplete = transferResponses.length === transferQuestions.length

  const maxUnlockedIndex = useMemo(() => {
    let next = 0
    if (stage1Complete) next = 1
    if (stage1Complete && awarenessComplete) next = 2
    if (stage1Complete && awarenessComplete && evidenceAllComplete) next = 3
    if (stage1Complete && awarenessComplete && evidenceAllComplete && transferAllComplete) next = 4
    return next
  }, [stage1Complete, awarenessComplete, evidenceAllComplete, transferAllComplete])

  const visibleEvidenceSelectedFeatures = currentEvidence
  ? evidenceSelectedFeatures.filter((feature) =>
      currentEvidenceFeatureOptions.includes(feature)
    )
  : []

const visibleTransferSelectedFeatures = currentTransfer
  ? transferSelectedFeatures.filter((feature) =>
      currentTransferFeatureOptions.includes(feature)
    )
  : []

const evidenceFormComplete =
  Boolean(evidenceAnswer) &&
  visibleEvidenceSelectedFeatures.length > 0 &&
  visibleEvidenceSelectedFeatures.length <= 3 &&
  evidenceReasonText.trim().length >= 8

const transferFormComplete =
  Boolean(transferAnswer) &&
  visibleTransferSelectedFeatures.length > 0 &&
  visibleTransferSelectedFeatures.length <= 2 &&
  transferReasonText.trim().length >= 8

  const diagnosticCount = diagnosticFeatures.length
  const possibleCount = possibleFeatures.length

  const readinessRetryCount = useMemo(
    () =>
      Object.values(readinessAttemptCounts).reduce(
        (sum, count) => sum + Math.max(0, Number(count || 0) - 1),
        0
      ),
    [readinessAttemptCounts]
  )

  const readinessFirstPassCount = useMemo(
    () =>
      READINESS_CHECKS.filter((item) => (readinessAttemptCounts[item.id] ?? 0) === 1).length,
    [readinessAttemptCounts]
  )

  const stage1SummaryLines = useMemo(
    () =>
      nonEmptyGroups.map((group) => {
        const names = group.cardIds.map((cardId) => getCardName(cardId)).join('、')
        return `${group.name}：${names}`
      }),
    [nonEmptyGroups]
  )

  const evidenceResultRows = useMemo<ResultRow[]>(
    () => buildResultRows(stage3EvidenceQuestions as QuestionLike[], evidenceResponses),
    [evidenceResponses, stage3EvidenceQuestions]
  )

  const transferResultRows = useMemo<ResultRow[]>(
    () => buildResultRows(transferQuestions, transferResponses),
    [transferResponses]
  )

  const correctCount = evidenceResultRows.filter((row) => row.isCorrect === true).length
  const transferCorrectCount = transferResultRows.filter((row) => row.isCorrect === true).length

  const evidenceConfidenceMap = useMemo(
  () =>
    Object.fromEntries(
      evidenceResponses.map((item) => [item.questionId, item.confidence])
    ) as Record<string, number>,
  [evidenceResponses]
)

const transferConfidenceMap = useMemo(
  () =>
    Object.fromEntries(
      transferResponses.map((item) => [item.questionId, item.confidence])
    ) as Record<string, number>,
  [transferResponses]
)

const stage5Rows = useMemo(
  () => [
    ...evidenceResultRows.map((row) => ({
      ...row,
      stageLabel: '第 3 階段',
      confidence: evidenceConfidenceMap[row.questionId] ?? null,
    })),
    ...transferResultRows.map((row) => ({
      ...row,
      stageLabel: '第 4 階段',
      confidence: transferConfidenceMap[row.questionId] ?? null,
    })),
  ],
  [evidenceResultRows, transferResultRows, evidenceConfidenceMap, transferConfidenceMap]
)

const stage5Diagnosis = useMemo(
  () =>
    getStudentDiagnosis({
      stage5Rows: stage5Rows.map((row) => ({
        stageLabel: row.stageLabel,
        questionId: row.questionId,
        animalName: row.animalName,
        isCorrect: row.isCorrect,
        selectedFeatures: row.selectedFeatures,
        correctAnswer: row.correctAnswer,
        confidence: row.confidence,
      })),
      correctCount: correctCount + transferCorrectCount,
      totalCount: stage3EvidenceQuestions.length + transferQuestions.length,
      transferCorrectCount,
      transferTotalCount: transferQuestions.length,
    }),
  [
    stage5Rows,
    correctCount,
    transferCorrectCount,
    stage3EvidenceQuestions.length,
    transferQuestions.length,
  ]
)

const stage5PriorityRows = useMemo(() => {
  return [...stage5Rows]
    .filter(
      (row) =>
        row.isCorrect === false ||
        row.confidence == null ||
        row.confidence <= 2 ||
        getCueProfile(row.selectedFeatures).label.includes('表面')
    )
    .sort((a, b) => {
      const aPriority =
        a.stageLabel === '第 4 階段' && a.isCorrect === false
          ? 0
          : a.isCorrect === false
            ? 1
            : 2
      const bPriority =
        b.stageLabel === '第 4 階段' && b.isCorrect === false
          ? 0
          : b.isCorrect === false
            ? 1
            : 2
      return aPriority - bPriority
    })
    .slice(0, 4)
}, [stage5Rows])

const stage5ReviewPhyla = useMemo(() => {
  const wrongAnswers = stage5Rows
    .filter((row) => row.isCorrect === false && row.correctAnswer)
    .map((row) => row.correctAnswer as SixPhylum)

  return Array.from(new Set(wrongAnswers)).slice(0, 2)
}, [stage5Rows])

  function toggleDiagnosticFeature(feature: string) {
    if (diagnosticFeatures.includes(feature)) {
      setDiagnosticFeatures((prev) => prev.filter((item) => item !== feature))
      return
    }

    setDiagnosticFeatures((prev) => [...prev, feature])
    setPossibleFeatures((prev) => prev.filter((item) => item !== feature))
  }

  function togglePossibleFeature(feature: string) {
    if (possibleFeatures.includes(feature)) {
      setPossibleFeatures((prev) => prev.filter((item) => item !== feature))
      return
    }

    setPossibleFeatures((prev) => [...prev, feature])
    setDiagnosticFeatures((prev) => prev.filter((item) => item !== feature))
  }

  function handleReadinessAnswer(questionId: string, option: string) {
    setReadinessAttemptCounts((prev) => ({
      ...prev,
      [questionId]: (prev[questionId] ?? 0) + 1,
    }))
    setReadinessAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }))
  }

  function handleDropOnGroup(targetGroupId: string, payload: DragPayload) {
    const { nextBankIds, nextGroups } = moveCardBetweenContainers({
      cardId: payload.cardId,
      source: payload.source,
      sourceGroupId: payload.sourceGroupId,
      target: 'group',
      targetGroupId,
      bankIds: bankCardIds,
      groups,
    })
    setBankCardIds(nextBankIds)
    setGroups(nextGroups)
    setCardMoveCount((count) => count + 1)
  }

  function handleDropOnBank(payload: DragPayload) {
    const { nextBankIds, nextGroups } = moveCardBetweenContainers({
      cardId: payload.cardId,
      source: payload.source,
      sourceGroupId: payload.sourceGroupId,
      target: 'bank',
      bankIds: bankCardIds,
      groups,
    })
    setBankCardIds(nextBankIds)
    setGroups(nextGroups)
    setCardMoveCount((count) => count + 1)
  }

  function handleTapMoveToGroup(targetGroupId: string) {
    if (!selectedMovePayload) return
    handleDropOnGroup(targetGroupId, selectedMovePayload)
    setSelectedMovePayload(null)
  }

  function handleTapMoveToBank() {
    if (!selectedMovePayload) return
    handleDropOnBank(selectedMovePayload)
    setSelectedMovePayload(null)
  }

  function isSelectedCard(cardId: string, source: 'bank' | 'group', sourceGroupId?: string) {
    return (
      selectedMovePayload?.cardId === cardId &&
      selectedMovePayload?.source === source &&
      selectedMovePayload?.sourceGroupId === sourceGroupId
    )
  }

  function pushEventLog(log: LearningEventLog) {
  setEventLogs((prev) => [...prev, log])
  }

  function resetEvidenceForm() {
    setEvidenceAnswer('')
    setEvidenceSelectedFeatures([])
    setEvidenceReasonText('')
    setEvidenceConfidence(2)
  }

  function resetTransferForm() {
    setTransferAnswer('')
    setTransferSelectedFeatures([])
    setTransferReasonText('')
    setTransferConfidence(2)
  }

  function openEvidenceQuestion(index: number, sourceResponses = evidenceResponses) {
    const question = stage3EvidenceQuestions[index]
    const saved = sourceResponses.find((item) => item.questionId === question.id)

    evidenceQuestionEnteredAtRef.current = new Date().toISOString()
    evidenceQuestionStartedAtRef.current = Date.now()

    setEvidenceIndex(index)

    if (saved) {
  setEvidenceAnswer(saved.answer)
  setEvidenceSelectedFeatures(sanitizeSelectedFeatures(saved.selectedFeatures, question as QuestionLike, 3))
  setEvidenceReasonText(saved.reasonText)
  setEvidenceConfidence(saved.confidence)
} else {
  resetEvidenceForm()
}
  }

  function saveCurrentEvidence(): EvidenceResponse[] | null {
  if (!currentEvidence) return null

  const visibleSelectedFeatures = evidenceSelectedFeatures.filter((feature) =>
    getQuestionFeatureOptions(currentEvidence as QuestionLike).includes(feature)
  )

  if (visibleSelectedFeatures.length === 0) {
    window.alert('請先至少勾選一個判斷特徵。')
    return null
  }

  if (visibleSelectedFeatures.length > 3) {
    window.alert('第 3 階段最多只能選 3 個主要判斷特徵。')
    return null
  }

    if (evidenceReasonText.trim().length < 8) {
      window.alert('請至少寫 8 個字，簡短說明判斷理由。')
      return null
    }

    if (!evidenceAnswer) {
      window.alert('請再選擇一個門別。')
      return null
    }

    const animalName = inferAnimalName(currentEvidence)
    const rule = ANIMAL_RULES[animalName]

    const nextResponse: EvidenceResponse = {
  questionId: currentEvidence.id,
  animalName,
  answer: evidenceAnswer,
  selectedFeatures: visibleSelectedFeatures,
  featureOptionsShown: currentEvidenceFeatureOptions,
  maxSelectableFeatures: 3,
  featureOptionVersion: FEATURE_OPTION_VERSION,
  reasonText: evidenceReasonText,
  confidence: evidenceConfidence,
}

    const nextResponses = upsertResponses(
      evidenceResponses,
      nextResponse,
      stage3EvidenceQuestions as { id: string }[]
    )
    setEvidenceResponses(nextResponses)

    const submittedAt = new Date().toISOString()
    const durationMs =
      evidenceQuestionStartedAtRef.current !== null
        ? Math.max(0, Date.now() - evidenceQuestionStartedAtRef.current)
        : null

    const nextItemLog: LearningItemLog = {
  stage: 'evidence',
  questionId: currentEvidence.id,
  animalName,
  enteredAt: evidenceQuestionEnteredAtRef.current,
  submittedAt,
  durationMs,
  finalAnswer: evidenceAnswer,
  selectedFeatures: visibleSelectedFeatures,
  featureOptionsShown: currentEvidenceFeatureOptions,
  maxSelectableFeatures: 3,
  featureOptionVersion: FEATURE_OPTION_VERSION,
  reasonText: evidenceReasonText,
  confidence: evidenceConfidence,
  isCorrect: rule ? evidenceAnswer === rule.phylum : null,
}

    const nextItemLogs = upsertItemLogs(
      evidenceItemLogs,
      nextItemLog,
      stage3EvidenceQuestions as { id: string }[]
    )
    setEvidenceItemLogs(nextItemLogs)

    return nextResponses
  }

  function openTransferQuestion(index: number, sourceResponses = transferResponses) {
  const question = transferQuestions[index]
  const saved = sourceResponses.find((item) => item.questionId === question.id)

  transferQuestionEnteredAtRef.current = new Date().toISOString()
  transferQuestionStartedAtRef.current = Date.now()

  setTransferIndex(index)

  if (saved) {
    setTransferAnswer(saved.answer)
    setTransferSelectedFeatures(
      sanitizeSelectedFeatures(saved.selectedFeatures, question, 2)
    )
    setTransferReasonText(saved.reasonText)
    setTransferConfidence(saved.confidence)
  } else {
    resetTransferForm()
  }
}

function saveCurrentTransfer(): EvidenceResponse[] | null {
  if (!currentTransfer) return null

  const visibleSelectedFeatures = transferSelectedFeatures.filter((feature) =>
    getQuestionFeatureOptions(currentTransfer).includes(feature)
  )

  if (visibleSelectedFeatures.length === 0) {
    window.alert('請先至少勾選一個判斷特徵。')
    return null
  }

  if (visibleSelectedFeatures.length > 2) {
    window.alert('第 4 階段最多只能選 2 個主要判斷特徵。')
    return null
  }

  if (transferReasonText.trim().length < 8) {
    window.alert('請至少寫 8 個字，簡短說明判斷理由。')
    return null
  }

  if (!transferAnswer) {
    window.alert('請再選擇一個門別。')
    return null
  }

  const animalName = inferAnimalName(currentTransfer)
  const rule = ANIMAL_RULES[animalName]

  const nextResponse: EvidenceResponse = {
  questionId: currentTransfer.id,
  animalName,
  answer: transferAnswer,
  selectedFeatures: visibleSelectedFeatures,
  featureOptionsShown: currentTransferFeatureOptions,
  maxSelectableFeatures: 2,
  featureOptionVersion: FEATURE_OPTION_VERSION,
  reasonText: transferReasonText,
  confidence: transferConfidence,
}

  const nextResponses = upsertResponses(transferResponses, nextResponse, transferQuestions)
  setTransferResponses(nextResponses)
  setTransferSelectedFeatures(visibleSelectedFeatures)

  const submittedAt = new Date().toISOString()
  const durationMs =
    transferQuestionStartedAtRef.current !== null
      ? Math.max(0, Date.now() - transferQuestionStartedAtRef.current)
      : null

  const nextItemLog: LearningItemLog = {
  stage: 'transfer',
  questionId: currentTransfer.id,
  animalName,
  enteredAt: transferQuestionEnteredAtRef.current,
  submittedAt,
  durationMs,
  finalAnswer: transferAnswer,
  selectedFeatures: visibleSelectedFeatures,
  featureOptionsShown: currentTransferFeatureOptions,
  maxSelectableFeatures: 2,
  featureOptionVersion: FEATURE_OPTION_VERSION,
  reasonText: transferReasonText,
  confidence: transferConfidence,
  isCorrect: rule ? transferAnswer === rule.phylum : null,
}

  const nextItemLogs = upsertItemLogs(
    transferItemLogs,
    nextItemLog,
    transferQuestions
  )
  setTransferItemLogs(nextItemLogs)

  return nextResponses
}

  function buildDemoStage1Groups(): StageGroup[] {
    const ids = stage1Cards.map((card) => card.id)
    const group1 = ids.filter((_, index) => index % 2 === 0)
    const group2 = ids.filter((_, index) => index % 2 === 1)

    return [
      {
        id: 'G1',
        name: '群組 1',
        reason: '我先依外觀與身體構造做初步分類。',
        cardIds: group1,
      },
      {
        id: 'G2',
        name: '群組 2',
        reason: '我把另外一批特徵較不同的生物分成另一組。',
        cardIds: group2,
      },
      {
        id: 'G3',
        name: '群組 3',
        reason: '',
        cardIds: [],
      },
    ]
  }

  function buildDemoEvidenceResponses(): EvidenceResponse[] {
    return stage3EvidenceQuestions.map((question) => {
      const animalName = inferAnimalName(question as QuestionLike)
      const rule = ANIMAL_RULES[animalName]

      return {
        questionId: question.id,
        animalName,
        answer: rule?.phylum ?? '刺絲胞動物門',
        selectedFeatures: rule?.keyFeatures?.slice(0, 2) ?? ['刺絲胞', '觸手'],
        reasonText: `我根據 ${rule?.keyFeatures?.slice(0, 2).join('、') ?? '特徵'} 進行判斷。`,
        confidence: 3,
      }
    })
  }

  function buildDemoTransferResponses(): EvidenceResponse[] {
    return transferQuestions.map((question) => {
      const animalName = inferAnimalName(question)
      const rule = ANIMAL_RULES[animalName]

      return {
  questionId: question.id,
  animalName,
  answer: rule?.phylum ?? '刺絲胞動物門',
  selectedFeatures: rule?.keyFeatures?.slice(0, 2) ?? ['刺絲胞', '觸手'],
  featureOptionsShown: getQuestionFeatureOptions(question),
  maxSelectableFeatures: 2,
  featureOptionVersion: FEATURE_OPTION_VERSION,
  reasonText: `我根據 ${rule?.keyFeatures?.slice(0, 2).join('、') ?? '特徵'} 進行判斷。`,
  confidence: 3,
}
    })
  }

  function seedStage2Dev() {
    const demoGroups = buildDemoStage1Groups()

    setGroups(demoGroups)
    setBankCardIds([])
    setOverallReason('我先根據外觀與身體構造做初步分類，再觀察有哪些共同特徵。')
    setGroupCreateCount(3)
    setCardMoveCount(stage1Cards.length)

    setBridgeReflectAnswers({})
    setDiagnosticFeatures([])
    setPossibleFeatures([])
    setCustomFeatureText('')
    setReadinessAnswers({})
    setReadinessAttemptCounts({})
    setAwarenessCommitment(false)
    setAwarenessSecondsSpent(0)

    setEvidenceResponses([])
    setTransferResponses([])
    setEvidenceItemLogs([])
    setTransferItemLogs([])

    resetEvidenceForm()
    resetTransferForm()
    setEvidenceIndex(0)
    setTransferIndex(0)

    setStage('awareness')
  }

  function seedStage3Dev() {
    const demoGroups = buildDemoStage1Groups()
    const allCorrectReadinessAnswers = Object.fromEntries(
      READINESS_CHECKS.map((item) => [item.id, item.correct])
    )
    const allReadinessCounts = Object.fromEntries(
      READINESS_CHECKS.map((item) => [item.id, 1])
    )

    setGroups(demoGroups)
    setBankCardIds([])
    setOverallReason('我先根據外觀與身體構造做初步分類，再觀察有哪些共同特徵。')
    setGroupCreateCount(3)
    setCardMoveCount(stage1Cards.length)

    setBridgeReflectAnswers(
      Object.fromEntries(
        bridgeReflectQuestions.map((question) => [question.id, question.options.slice(0, 1)])
      )
    )
    setDiagnosticFeatures(['刺絲胞', '身體分節', '外骨骼'])
    setPossibleFeatures(['會飛', '星形'])
    setCustomFeatureText('')
    setReadinessAnswers(allCorrectReadinessAnswers)
    setReadinessAttemptCounts(allReadinessCounts)
    setAwarenessCommitment(true)
    setAwarenessSecondsSpent(60)

    setEvidenceResponses([])
    setTransferResponses([])
    setEvidenceItemLogs([])
    setTransferItemLogs([])

    setEvidenceIndex(0)
    resetEvidenceForm()
    setTransferIndex(0)
    resetTransferForm()

    setStage('evidence')
  }

  function seedStage4Dev() {
    const demoGroups = buildDemoStage1Groups()
    const allCorrectReadinessAnswers = Object.fromEntries(
      READINESS_CHECKS.map((item) => [item.id, item.correct])
    )
    const allReadinessCounts = Object.fromEntries(
      READINESS_CHECKS.map((item) => [item.id, 1])
    )
    const demoEvidenceResponses = buildDemoEvidenceResponses()

    setGroups(demoGroups)
    setBankCardIds([])
    setOverallReason('我先根據外觀與身體構造做初步分類，再觀察有哪些共同特徵。')
    setGroupCreateCount(3)
    setCardMoveCount(stage1Cards.length)

    setBridgeReflectAnswers(
      Object.fromEntries(
        bridgeReflectQuestions.map((question) => [question.id, question.options.slice(0, 1)])
      )
    )
    setDiagnosticFeatures(['刺絲胞', '身體分節', '外骨骼'])
    setPossibleFeatures(['會飛', '星形'])
    setCustomFeatureText('')
    setReadinessAnswers(allCorrectReadinessAnswers)
    setReadinessAttemptCounts(allReadinessCounts)
    setAwarenessCommitment(true)
    setAwarenessSecondsSpent(60)

    setEvidenceResponses(demoEvidenceResponses)
    setTransferResponses([])
    setEvidenceItemLogs([])
    setTransferItemLogs([])

    setEvidenceIndex(0)
    resetEvidenceForm()
    setTransferIndex(0)
    resetTransferForm()

    setStage('transfer')
  }

  function seedStage5Dev() {
    const demoGroups = buildDemoStage1Groups()
    const allCorrectReadinessAnswers = Object.fromEntries(
      READINESS_CHECKS.map((item) => [item.id, item.correct])
    )
    const allReadinessCounts = Object.fromEntries(
      READINESS_CHECKS.map((item) => [item.id, 1])
    )
    const demoEvidenceResponses = buildDemoEvidenceResponses()
    const demoTransferResponses = buildDemoTransferResponses()

    setGroups(demoGroups)
    setBankCardIds([])
    setOverallReason('我先根據外觀與身體構造做初步分類，再觀察有哪些共同特徵。')
    setGroupCreateCount(3)
    setCardMoveCount(stage1Cards.length)

    setBridgeReflectAnswers(
      Object.fromEntries(
        bridgeReflectQuestions.map((question) => [question.id, question.options.slice(0, 1)])
      )
    )
    setDiagnosticFeatures(['刺絲胞', '身體分節', '外骨骼'])
    setPossibleFeatures(['會飛', '星形'])
    setCustomFeatureText('')
    setReadinessAnswers(allCorrectReadinessAnswers)
    setReadinessAttemptCounts(allReadinessCounts)
    setAwarenessCommitment(true)
    setAwarenessSecondsSpent(60)

    setEvidenceResponses(demoEvidenceResponses)
    setTransferResponses(demoTransferResponses)
    setEvidenceItemLogs([])
    setTransferItemLogs([])

    setEvidenceIndex(0)
    resetEvidenceForm()
    setTransferIndex(0)
    resetTransferForm()

    setStage('done')
  }

  function clearDevProgress() {
    if (participantCode) {
      localStorage.removeItem(`animal-classifier-progress:${participantCode}`)
    }

    setStage('stage1')
    setGroups(INITIAL_GROUPS)
    setBankCardIds(stage1Cards.map((card) => card.id))
    setOverallReason('')
    setGroupCreateCount(3)
    setCardMoveCount(0)

    setBridgeReflectAnswers({})
    setDiagnosticFeatures([])
    setPossibleFeatures([])
    setCustomFeatureText('')
    setReadinessAnswers({})
    setReadinessAttemptCounts({})
    setAwarenessCommitment(false)
    setAwarenessSecondsSpent(0)

    setEvidenceResponses([])
    setTransferResponses([])
    setEvidenceItemLogs([])
    setTransferItemLogs([])

    setEvidenceIndex(0)
    resetEvidenceForm()
    setTransferIndex(0)
    resetTransferForm()
  }

  const exportPayload = useMemo(
    () => ({
      participantCode,
      participant: enterSession,
      version: 'v10-feature-options-3max-2max',
featureOptionVersion: FEATURE_OPTION_VERSION,
featureOptionPolicy: {
  evidenceMaxSelectableFeatures: 3,
  transferMaxSelectableFeatures: 2,
  questionFeatureOptions: ANIMAL_FEATURE_OPTIONS,
},
      stage1: {
        groups,
        bankCardIds,
        overallReason,
        groupCreateCount,
        cardMoveCount,
      },
      awareness: {
        bridgeReflectAnswers,
        diagnosticFeatures,
        possibleFeatures,
        customFeatureText,
        readinessAnswers,
        readinessAttemptCounts,
        readinessRetryCount,
        readinessFirstPassCount,
        awarenessCommitment,
        awarenessSecondsSpent,
      },
      evidenceResponses,
      transferResponses,
      evidenceItemLogs,
      transferItemLogs,
      eventLogs,
      correctCount,
      resultSummary: {
        correctCount,
        totalQuestions: stage3EvidenceQuestions.length,
        transferCorrectCount,
        transferTotalQuestions: transferQuestions.length,
      },
      evidenceResultRows,
      transferResultRows,
    }),
    [
  participantCode,
  enterSession,
  groups,
  bankCardIds,
  overallReason,
  groupCreateCount,
  cardMoveCount,
  bridgeReflectAnswers,
  diagnosticFeatures,
  possibleFeatures,
  customFeatureText,
  readinessAnswers,
  readinessAttemptCounts,
  readinessRetryCount,
  readinessFirstPassCount,
  awarenessCommitment,
  awarenessSecondsSpent,
  evidenceResponses,
  transferResponses,
  evidenceItemLogs,
  transferItemLogs,
  eventLogs,
  correctCount,
  transferCorrectCount,
  stage3EvidenceQuestions.length,
  evidenceResultRows,
  transferResultRows,
]
  )

  const exportHash = useMemo(() => JSON.stringify(exportPayload), [exportPayload])

  const submitStudentData = useCallback(
    async (mode: 'progress' | 'final') => {
      if (!submissionKey || !enterSession) return false

      console.log('submit payload =', exportPayload)
      console.log('evidenceItemLogs =', exportPayload.evidenceItemLogs)
      console.log('transferItemLogs =', exportPayload.transferItemLogs)
      console.log('eventLogs =', exportPayload.eventLogs)

      const response = await fetch('/api/student-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionKey,
          participantCode,
          participant: enterSession,
          payload: exportPayload,
          saveMode: mode,
          currentStage: stage,
          isCompleted: mode === 'final',
          savedAt: new Date().toISOString(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || '送出失敗')
      }

      return true
    },
    [submissionKey, participantCode, enterSession, exportPayload, stage]
  )

  useEffect(() => {
    if (!submissionKey || !enterSession || !progressHydrated) return
    if (participantCode === 'anonymous') return
    if (stage === 'done') return
    if (exportHash === lastProgressSubmittedHashRef.current) return

    if (progressSaveTimerRef.current) {
      window.clearTimeout(progressSaveTimerRef.current)
    }

    progressSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await submitStudentData('progress')
        lastProgressSubmittedHashRef.current = exportHash
      } catch (error) {
        console.error('progress snapshot 儲存失敗:', error)
      }
    }, 2000)

    return () => {
      if (progressSaveTimerRef.current) {
        window.clearTimeout(progressSaveTimerRef.current)
      }
    }
  }, [
    submissionKey,
    enterSession,
    participantCode,
    progressHydrated,
    stage,
    exportHash,
    submitStudentData,
  ])

  useEffect(() => {
    if (stage !== 'done' || !submissionKey || !enterSession) return
    if (exportHash === lastSubmittedHashRef.current) return

    if (progressSaveTimerRef.current) {
      window.clearTimeout(progressSaveTimerRef.current)
    }

    const submit = async () => {
      setAutoSubmitState('saving')
      setAutoSubmitMessage('系統正在自動儲存並送出結果…')

      try {
        await submitStudentData('final')
        lastSubmittedHashRef.current = exportHash
        setAutoSubmitState('saved')
        setAutoSubmitMessage('已完成，資料已自動儲存並送出。')
      } catch (error) {
        setAutoSubmitState('error')
        setAutoSubmitMessage('網路或系統異常，系統會稍後自動重試。')

        if (retryTimerRef.current) {
          window.clearTimeout(retryTimerRef.current)
        }

        retryTimerRef.current = window.setTimeout(() => {
          lastSubmittedHashRef.current = ''
          setAutoSubmitState('idle')
        }, 5000)
      }
    }

    void submit()

    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current)
      }
    }
  }, [stage, submissionKey, enterSession, exportHash, submitStudentData])

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
        <div className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                Sci-Flipper 動物分類自主學習網站
              </h1>
              <div className="mt-1 text-sm leading-6 text-gray-600">
                目前學生：
                {enterSession
                  ? `${enterSession.maskedName ?? '未顯示姓名'}｜${enterSession.grade} 年級 ${enterSession.className} 班 ${enterSession.seatNo} 號`
                  : '尚未讀到進入資訊'}
              </div>
            </div>
          </div>
        </div>

        <StepHeader stage={stage} setStage={setStage} maxUnlockedIndex={maxUnlockedIndex} />

        {isDev ? (
          <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm">
            <div className="mb-2 text-sm font-bold text-amber-900">
              開發者測試面板（development only）
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={seedStage2Dev}
                className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900"
              >
                跳到第 2 階段
              </button>

              <button
                type="button"
                onClick={seedStage3Dev}
                className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900"
              >
                跳到第 3 階段
              </button>

              <button
                type="button"
                onClick={seedStage4Dev}
                className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900"
              >
                跳到第 4 階段
              </button>

              <button
                type="button"
                onClick={seedStage5Dev}
                className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900"
              >
                跳到第 5 階段
              </button>

              <button
                type="button"
                onClick={clearDevProgress}
                className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700"
              >
                清除測試資料
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex-1">
          {stage === 'stage1' && (
            <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 md:text-3xl">
                      第 1 階段：自由分類
                    </h2>
                    <div className="mt-2 text-sm leading-6 text-gray-600">
                      先依照你目前的直覺分類。這一階段不是要你立刻答對，而是把原本的想法說出來。
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center text-xs text-gray-700 sm:text-sm lg:min-w-[220px]">
                    <div>
                      <div className="text-gray-500">群組數</div>
                      <div className="font-bold text-gray-900">{groups.length}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">未分類</div>
                      <div className="font-bold text-gray-900">{bankCardIds.length}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">已分組</div>
                      <div className="font-bold text-gray-900">{groupedCardCount}</div>
                    </div>
                  </div>
                </div>

                {selectedMovePayload ? (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    已選取「{getCardName(selectedMovePayload.cardId)}」。請點一下目標群組；
                    若要放回待分類，點下方待分類區。
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMovePayload(null)}
                        className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900"
                      >
                        取消選取
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                    桌機可直接拖曳卡片；平板／手機可先點一下卡片，再點要放入的群組。
                  </div>
                )}

                <div className="mb-3 text-xl font-black text-gray-900">待分類生物卡</div>

                <div
                  onClick={handleTapMoveToBank}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const payloadRaw = e.dataTransfer.getData('application/json')
                    if (!payloadRaw) return
                    handleDropOnBank(JSON.parse(payloadRaw) as DragPayload)
                    setSelectedMovePayload(null)
                  }}
                  className={`rounded-2xl border p-3 transition ${
                    selectedMovePayload
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {bankCardIds.map((cardId) => {
                      const card = getCardById(cardId)
                      if (!card) return null

                      const active = isSelectedCard(card.id, 'bank')

                      return (
                        <button
                          key={card.id}
                          type="button"
                          draggable
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedMovePayload({
                              cardId: card.id,
                              source: 'bank',
                            })
                          }}
                          onDragStart={(e) => {
                            const payload: DragPayload = { cardId: card.id, source: 'bank' }
                            e.dataTransfer.setData('application/json', JSON.stringify(payload))
                          }}
                          className={`cursor-move rounded-xl border bg-white p-2.5 text-left transition hover:shadow-sm ${
                            active
                              ? 'border-amber-400 ring-2 ring-amber-300'
                              : 'border-gray-300'
                          }`}
                        >
                          <div className="mb-2 aspect-square w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-1.5 sm:p-2">
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              className="h-full w-full object-contain"
                              draggable={false}
                            />
                          </div>
                          <div className="text-center text-[11px] font-bold leading-tight text-gray-900 sm:text-xs md:text-sm">
                            {card.name}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="min-h-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-1">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-2xl font-black text-gray-900">你的群組</h2>
                  <button
                    type="button"
                    disabled={groups.length >= 8}
                    onClick={() => {
                      if (groups.length >= 8) return
                      const nextIndex = groups.length + 1
                      const newGroupId = `G${Date.now()}`
                      setGroups((prev) => [
                        ...prev,
                        {
                          id: newGroupId,
                          name: `群組 ${nextIndex}`,
                          reason: '',
                          cardIds: [],
                        },
                      ])
                      setGroupCreateCount((count) => count + 1)
                    }}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {groups.length >= 8 ? '已達上限' : '新增群組'}
                  </button>
                </div>

                <div className="space-y-3">
                  {groups.map((group, groupIndex) => (
                    <div key={group.id} className="rounded-2xl border border-gray-300 p-3">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          value={group.name}
                          onChange={(e) => {
                            const nextName = e.target.value
                            setGroups((prev) =>
                              prev.map((item) =>
                                item.id === group.id ? { ...item, name: nextName } : item
                              )
                            )
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                        />
                        <button
                          type="button"
                          disabled={group.cardIds.length > 0 || groups.length <= 3}
                          onClick={() => {
                            setGroups((prev) => prev.filter((item) => item.id !== group.id))
                          }}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 disabled:opacity-40"
                        >
                          刪除
                        </button>
                      </div>

                      <div className="mb-2 text-xs text-gray-700">第 {groupIndex + 1} 組</div>

                      <div
                        onClick={() => handleTapMoveToGroup(group.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const payloadRaw = e.dataTransfer.getData('application/json')
                          if (!payloadRaw) return
                          handleDropOnGroup(group.id, JSON.parse(payloadRaw) as DragPayload)
                          setSelectedMovePayload(null)
                        }}
                        className={`mb-2 min-h-[88px] rounded-2xl border-2 border-dashed p-2 transition ${
                          selectedMovePayload
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-gray-300 bg-gray-50'
                        }`}
                      >
                        {group.cardIds.length === 0 ? (
                          <div className="flex min-h-[62px] items-center justify-center text-xs font-bold text-gray-700">
                            點一下可把已選卡片放到這一組
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {group.cardIds.map((cardId) => {
                              const card = getCardById(cardId)
                              if (!card) return null

                              const active = isSelectedCard(card.id, 'group', group.id)

                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  draggable
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedMovePayload({
                                      cardId: card.id,
                                      source: 'group',
                                      sourceGroupId: group.id,
                                    })
                                  }}
                                  onDragStart={(e) => {
                                    const payload: DragPayload = {
                                      cardId: card.id,
                                      source: 'group',
                                      sourceGroupId: group.id,
                                    }
                                    e.dataTransfer.setData(
                                      'application/json',
                                      JSON.stringify(payload)
                                    )
                                  }}
                                  className={`cursor-move rounded-lg border bg-white p-1.5 ${
                                    active
                                      ? 'border-amber-400 ring-2 ring-amber-300'
                                      : 'border-gray-300'
                                  }`}
                                >
                                  <div className="mb-1 aspect-square w-full overflow-hidden rounded-md border border-gray-200 bg-white p-1">
                                    <img
                                      src={card.imageUrl}
                                      alt={card.name}
                                      className="h-full w-full object-contain"
                                      draggable={false}
                                    />
                                  </div>
                                  <div className="break-words text-center text-[10px] font-bold leading-tight text-gray-900 sm:text-xs">
                                    {card.name}
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="mb-1 text-xs font-semibold text-gray-700">分類理由</div>
                      <textarea
                        value={group.reason}
                        onChange={(e) => {
                          const nextReason = e.target.value
                          setGroups((prev) =>
                            prev.map((item) =>
                              item.id === group.id ? { ...item, reason: nextReason } : item
                            )
                          )
                        }}
                        placeholder="請說明為什麼分在一起"
                        className="min-h-[56px] w-full rounded-xl border border-gray-300 px-3 py-2 text-sm leading-6 text-gray-900 placeholder:text-gray-400"
                      />

                      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                        <span className="text-gray-500">這一組只要有放入生物卡，就必須填寫理由。</span>
                        <span className={group.reason.trim().length > 0 ? 'text-green-700' : 'text-amber-700'}>
                          目前 {group.reason.trim().length} 字
                        </span>
                      </div>

                      {group.cardIds.length > 0 && group.reason.trim().length === 0 ? (
                        <div className="mt-1 text-xs font-semibold text-amber-700">
                          這一組已有生物卡，請補上分類理由。
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-700">整體分類想法</div>
                    <div
                      className={`text-xs font-semibold ${
                        overallReasonLength >= STAGE1_OVERALL_REASON_MIN_LENGTH
                          ? 'text-green-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {overallReasonLength} / {STAGE1_OVERALL_REASON_MIN_LENGTH} 字
                    </div>
                  </div>

                  <textarea
                    value={overallReason}
                    onChange={(e) => setOverallReason(e.target.value)}
                    placeholder="請用一句話說明你這次分類的主要思路"
                    className="min-h-[88px] w-full rounded-xl border border-gray-300 px-3 py-3 text-sm leading-6 text-gray-900"
                  />

                  <div className="mt-2 text-xs leading-6">
                    <div className="text-gray-500">
                      至少需要 {STAGE1_OVERALL_REASON_MIN_LENGTH} 字，請說明你主要是根據哪些特徵來分類。
                    </div>

                    {overallReasonLength >= STAGE1_OVERALL_REASON_MIN_LENGTH ? (
                      <div className="font-semibold text-green-700">已達進入下一階段的字數門檻。</div>
                    ) : (
                      <div className="font-semibold text-amber-700">
                        尚未達門檻，還差 {overallReasonRemaining} 字。
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                  <div>進入下一階段前，請確認：</div>
                  <ul className="mt-2 list-disc pl-5">
                    <li>{bankCardIds.length === 0 ? '已完成' : '尚有卡片未分組'}：所有卡片都已分類</li>
                    <li>{nonEmptyGroups.length >= 2 ? '已完成' : '尚未完成'}：至少形成 2 個非空群組</li>
                    <li>
                      {nonEmptyGroups.every((group) => group.reason.trim().length > 0)
                        ? '已完成'
                        : '尚未完成'}
                      ：每個非空群組都有理由
                    </li>
                    <li>
                      {overallReasonLength >= STAGE1_OVERALL_REASON_MIN_LENGTH ? '已完成' : '尚未完成'}
                      ：已寫整體分類想法（至少 {STAGE1_OVERALL_REASON_MIN_LENGTH} 字）
                    </li>
                  </ul>

                  {!stage1Complete ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                      <div className="font-semibold">目前尚不能進入階段 2，原因如下：</div>
                      <ul className="mt-1 list-disc pl-5">
                        {stage1IncompleteMessages.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm leading-6 text-green-800">
                      已符合進入階段 2 的條件。
                    </div>
                  )}

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={!stage1Complete}
                      onClick={() => setStage('awareness')}
                      className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                    >
                      進入階段 2
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {stage === 'awareness' && (
            <section className="space-y-4">
              <SummaryBlock title="上一階段摘要">
                <div className="space-y-2">
                  {stage1SummaryLines.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                  <div className="rounded-lg bg-gray-50 p-3">
                    整體分類想法：{overallReason || '尚未填寫'}
                  </div>
                </div>
              </SummaryBlock>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <h2 className="mb-3 text-2xl font-black sm:text-3xl">第 2 階段：判準建立</h2>
                <div className="rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                  這一階段先建立規則，再進到正式判斷。系統會記錄學習時間，
                  選項順序隨機化，且可重作並記錄重試次數。
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-4 text-2xl font-black">任務 A：回看自己上一階段用過哪些線索</h3>
                <div className="space-y-5">
                  {bridgeReflectQuestions.map((question) => {
                    const selected = bridgeReflectAnswers[question.id] ?? []

                    return (
                      <div key={question.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="mb-3 font-bold">{question.prompt}</div>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {question.options.map((option) => {
                            const checked = selected.includes(option)

                            return (
                              <label
                                key={option}
                                className="flex items-start gap-2 rounded-lg border border-gray-200 p-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const next = e.target.checked
                                      ? [...selected, option]
                                      : selected.filter((item) => item !== option)

                                    setBridgeReflectAnswers((prev) => ({
                                      ...prev,
                                      [question.id]: next,
                                    }))
                                  }}
                                  className="mt-1"
                                />
                                <span>{option}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-4 text-2xl font-black">任務 B：區分關鍵與輔助類型的線索</h3>

                <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                  請把你認為較有分門判斷力的線索放到第一區；若只是可能有幫助、但不足以單獨判定門別，放到第二區。
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 text-lg font-bold text-gray-900">
                    勾選：較能幫助分門的關鍵線索（較有決定性）
                  </div>
                  <ToggleCheckboxGrid
                    options={FEATURE_BANK}
                    selected={diagnosticFeatures}
                    onToggle={toggleDiagnosticFeature}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 text-lg font-bold text-gray-900">
                    勾選：可能有幫助，但不能成為分門關鍵的輔助線索
                  </div>
                  <ToggleCheckboxGrid
                    options={FEATURE_BANK}
                    selected={possibleFeatures}
                    onToggle={togglePossibleFeature}
                  />
                </div>

                <div className="mt-5">
                  <div className="mb-2 text-sm font-semibold text-gray-700">其他想補充的特徵（可選）</div>
                  <input
                    value={customFeatureText}
                    onChange={(e) => setCustomFeatureText(e.target.value)}
                    placeholder="例如：有沒有眼睛、是否有明顯頭部等"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </div>
              </div>

              {awarenessABComplete ? (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                    <h3 className="mb-4 text-2xl font-black">任務 C：六門提示卡</h3>
                    <div className="mb-4 text-sm leading-6 text-gray-700">
                      你已完成前面的回顧與線索分類，現在可以參考六個門的關鍵特徵與代表生物。第三階段可繼續參考，不要求死背。
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {PHYLUM_GUIDE.map((guide) => (
                        <GuideCardView key={guide.phylum} guide={guide} />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                    <h3 className="mb-4 text-2xl font-black">任務 D：就緒檢核</h3>
                    <div className="mb-4 text-sm text-gray-600">
                      選項順序已隨機化。若答錯，請回看提示卡再重作。系統會記錄重試次數，但不直接顯示正確答案位置。
                    </div>

                    <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                       目前學習時間：{awarenessSecondsSpent} 秒
                    </div>

                    <div className="space-y-4">
                      {READINESS_CHECKS.map((item) => {
                        const currentValue = readinessAnswers[item.id] ?? ''
                        const isCorrect = currentValue && currentValue === item.correct
                        const isWrong = currentValue && currentValue !== item.correct

                        return (
                          <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                            <div className="mb-3 font-bold">{item.question}</div>

                            <div className="grid gap-2 md:grid-cols-3">
                              {(readinessOptionMap[item.id] ?? item.options).map((option) => (
                                <label
                                  key={option}
                                  className="flex items-start gap-2 rounded-lg border border-gray-200 p-2 text-sm"
                                >
                                  <input
                                    type="radio"
                                    name={item.id}
                                    checked={currentValue === option}
                                    onChange={() => handleReadinessAnswer(item.id, option)}
                                    className="mt-1"
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>

                            {isCorrect ? (
                              <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                                正確。
                              </div>
                            ) : null}

                            {isWrong ? (
                              <div className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                                這題還需要修正。先回看上面的提示卡，再重選一次。
                              </div>
                            ) : null}

                            <div className="mt-2 text-xs text-gray-500">
                              本題已作答 {readinessAttemptCounts[item.id] ?? 0} 次
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <label className="mt-5 flex items-start gap-2 rounded-xl border border-gray-200 p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={awarenessCommitment}
                        onChange={(e) => setAwarenessCommitment(e.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        我知道第三階段可以參考提示卡，不需要硬背六個門；重點是學會用特徵判斷。
                      </span>
                    </label>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                  <h3 className="mb-2 text-xl font-black text-amber-900">任務 C、D 將在完成任務 A、B 後開啟</h3>
                  <div className="text-sm leading-6 text-amber-900">
                    請先完成前兩項任務，以免後面的提示與檢核干擾你的作答。
                  </div>
                  <ul className="mt-3 list-disc pl-5 text-sm leading-6 text-amber-900">
                    <li>{reflectionComplete ? '任務 A 已完成' : '任務 A 尚未完成'}</li>
                    <li>{featureChoiceComplete ? '任務 B 已完成' : '任務 B 尚未完成'}</li>
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setStage('stage1')}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold sm:w-auto"
                >
                  回到階段 1
                </button>
                <button
                  type="button"
                  disabled={!awarenessComplete}
                  onClick={() => {
                    setStage('evidence')
                    openEvidenceQuestion(0)
                  }}
                  className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                >
                  進入階段 3
                </button>
              </div>
            </section>
          )}

          {stage === 'evidence' && currentEvidence && (
            <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                <div ref={evidenceTopRef} />

                <SummaryBlock title="前面兩階段摘要">
                  <div className="space-y-2">
                    <div>已形成 {nonEmptyGroups.length} 個非空群組。</div>
                    <div>較適合幫助分門：{diagnosticCount} 項。</div>
                    <div>可能有幫助但不穩定：{possibleCount} 項。</div>
                    {customFeatureText.trim() ? <div>自訂補充特徵：{customFeatureText}</div> : null}
                  </div>
                </SummaryBlock>

                <QuestionCard
  title={`第 3 階段：帶提示判定（${evidenceIndex + 1} / ${stage3EvidenceQuestions.length}）`}
  prompt={currentEvidence.prompt}
  stimulusText={currentEvidence.stimulusText}
  imageUrl={currentEvidence.imageUrl}
  onZoomOpen={() =>
    pushEventLog({
      stage: 'evidence',
      questionId: currentEvidence.id,
      eventType: 'image_zoom_open',
      eventValue: { imageUrl: currentEvidence.imageUrl },
      clientTs: new Date().toISOString(),
    })
  }
  onZoomClose={() =>
    pushEventLog({
      stage: 'evidence',
      questionId: currentEvidence.id,
      eventType: 'image_zoom_close',
      eventValue: { imageUrl: currentEvidence.imageUrl },
      clientTs: new Date().toISOString(),
    })
  }
/>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                  <div className="mb-3 text-lg font-black">
  先勾選你判斷時最主要依據的特徵
</div>
<div className="mb-2 text-sm text-gray-600">
  請從本題提供的少量線索中，選出最能支持分類判斷的 1–3 項。
</div>
                  <FeatureCheckboxes
  options={currentEvidenceFeatureOptions}
  selected={evidenceSelectedFeatures}
  onChange={setEvidenceSelectedFeatures}
  maxSelected={3}
/>

                  <div className="mb-2 mt-5 text-lg font-black">再簡短說明理由</div>
                  <div className="mb-2 text-sm text-gray-600">
                    可用句型：「我觀察到＿＿特徵，所以我推測它可能屬於＿＿。」
                  </div>
                  <textarea
                    value={evidenceReasonText}
                    onChange={(e) => setEvidenceReasonText(e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-gray-300 px-3 py-2"
                    placeholder="請至少寫 8 個字，簡短說明你是根據哪些特徵做判斷"
                  />

                  <div className="mb-3 mt-5 text-lg font-black">接著選擇你判定的門別</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {SIX_PHYLA.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 p-3"
                      >
                        <input
                          type="radio"
                          name={`evidence-${currentEvidence.id}`}
                          checked={evidenceAnswer === option}
                          onChange={() => setEvidenceAnswer(option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mb-2 mt-5 text-lg font-black">最後評估你的信心程度</div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={evidenceConfidence}
                    onChange={(e) => setEvidenceConfidence(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 text-sm text-gray-600">目前信心：{evidenceConfidence} / 4</div>

                  <div className="mt-5 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                    目前已完成 {evidenceResponses.length} / {stage3EvidenceQuestions.length} 題。右側提示卡可隨時參考。
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setStage('awareness')}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold sm:w-auto"
                      >
                        回到階段 2
                      </button>
                      <button
                        type="button"
                        disabled={evidenceIndex === 0}
                        onClick={() => openEvidenceQuestion(evidenceIndex - 1)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        上一題
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!evidenceFormComplete}
                      onClick={() => {
                        const nextResponses = saveCurrentEvidence()
                        if (!nextResponses) return

                        if (evidenceIndex < stage3EvidenceQuestions.length - 1) {
                          openEvidenceQuestion(evidenceIndex + 1, nextResponses)
                        } else {
                          setStage('transfer')
                          openTransferQuestion(0)
                        }
                      }}
                      className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                    >
                      {evidenceIndex < stage3EvidenceQuestions.length - 1 ? '儲存並下一題' : '進入階段 4'}
                    </button>
                  </div>
                </div>
              </div>

              <aside className="space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 text-lg font-black text-gray-900">六門提示卡</div>
                  <div className="text-sm leading-6 text-gray-600">
                    這一階段允許你邊看邊判斷，重點是學會如何用特徵推到門別。
                  </div>
                </div>

                {PHYLUM_GUIDE.map((guide) => (
  <GuideCardView key={guide.phylum} guide={guide} compact />
))}
              </aside>
            </section>
          )}

          {stage === 'transfer' && currentTransfer && (
            <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <div ref={transferTopRef} />

                <SummaryBlock title="前面三階段摘要">
                  <div className="space-y-2">
                    <div>已形成 {nonEmptyGroups.length} 個非空群組。</div>
                    <div>較適合幫助分門：{diagnosticCount} 項。</div>
                    <div>可能有幫助但不穩定：{possibleCount} 項。</div>
                    <div>
                      第 3 階段目前正確 {correctCount} / {stage3EvidenceQuestions.length} 題。
                    </div>
                  </div>
                </SummaryBlock>

                <QuestionCard
  title={`第 4 階段：遷移應用（${transferIndex + 1} / ${transferQuestions.length}）`}
  prompt={currentTransfer.prompt}
  stimulusText={currentTransfer.stimulusText}
  imageUrl={currentTransfer.imageUrl}
  imageVariant="large"
  onZoomOpen={() =>
    pushEventLog({
      stage: 'transfer',
      questionId: currentTransfer.id,
      eventType: 'image_zoom_open',
      eventValue: { imageUrl: currentTransfer.imageUrl },
      clientTs: new Date().toISOString(),
    })
  }
  onZoomClose={() =>
    pushEventLog({
      stage: 'transfer',
      questionId: currentTransfer.id,
      eventType: 'image_zoom_close',
      eventValue: { imageUrl: currentTransfer.imageUrl },
      clientTs: new Date().toISOString(),
    })
  }
/>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                  <div className="mb-3 text-lg font-black">
  先勾選你判斷時最主要依據的特徵
</div>
<div className="mb-2 text-sm text-gray-600">
  這一階段請回想前面學到的分類判準，從本題線索中選出最關鍵的 1–2 項。
</div>
                  <FeatureCheckboxes
  options={currentTransferFeatureOptions}
  selected={transferSelectedFeatures}
  onChange={setTransferSelectedFeatures}
  maxSelected={2}
/>

                  <div className="mb-2 mt-5 text-lg font-black">再簡短說明理由</div>
                  <div className="mb-2 text-sm text-gray-600">
                    可用句型：「我觀察到＿＿特徵，所以我推測它可能屬於＿＿。」
                  </div>
                  <textarea
                    value={transferReasonText}
                    onChange={(e) => setTransferReasonText(e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-gray-300 px-3 py-2"
                    placeholder="請至少寫 8 個字，簡短說明你是根據哪些特徵做判斷"
                  />

                  <div className="mb-3 mt-5 text-lg font-black">接著選擇你判定的門別</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {SIX_PHYLA.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 p-3"
                      >
                        <input
                          type="radio"
                          name={`transfer-${currentTransfer.id}`}
                          checked={transferAnswer === option}
                          onChange={() => setTransferAnswer(option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mb-2 mt-5 text-lg font-black">最後評估你的信心程度</div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={transferConfidence}
                    onChange={(e) => setTransferConfidence(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 text-sm text-gray-600">目前信心：{transferConfidence} / 4</div>

                  <div className="mt-5 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                    目前已完成 {transferResponses.length} / {transferQuestions.length} 題。這一階段的重點是把前面學到的規則用到新案例上。
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          const targetIndex =
                            evidenceResponses.length > 0 ? evidenceResponses.length - 1 : 0
                          openEvidenceQuestion(targetIndex)
                          setStage('evidence')
                        }}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold sm:w-auto"
                      >
                        回到階段 3
                      </button>
                      <button
                        type="button"
                        disabled={transferIndex === 0}
                        onClick={() => openTransferQuestion(transferIndex - 1)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        上一題
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!transferFormComplete}
                      onClick={() => {
                        const nextResponses = saveCurrentTransfer()
                        if (!nextResponses) return

                        if (transferIndex < transferQuestions.length - 1) {
                          openTransferQuestion(transferIndex + 1, nextResponses)
                        } else {
                          setStage('done')
                        }
                      }}
                      className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                    >
                      {transferIndex < transferQuestions.length - 1 ? '儲存並下一題' : '完成並查看結果'}
                    </button>
                  </div>
                </div>
              </div>

              <aside className="space-y-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 text-lg font-black text-gray-900">遷移提醒</div>
                  <div className="text-sm leading-6 text-gray-600">
                    這一階段不再提供完整六門提示卡。請回想前面學到的關鍵特徵，盡量不要只依外觀、棲地、是否有殼等線索判斷。
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-2 text-lg font-black text-gray-900">你前面整理出的線索</div>
                  <div className="text-sm leading-6 text-gray-700">
                    <div>
                      較有判斷力：{diagnosticFeatures.length ? diagnosticFeatures.join('、') : '尚未記錄'}
                    </div>
                    <div className="mt-2">
                      較不穩定：{possibleFeatures.length ? possibleFeatures.join('、') : '尚未記錄'}
                    </div>
                  </div>
                </div>
              </aside>
            </section>
          )}

          {stage === 'done' && (
  <section className="space-y-4">
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-2xl font-black sm:text-3xl">第 5 階段：診斷式回饋</h2>

      <div
        className={`rounded-xl p-4 text-sm leading-6 ${
          autoSubmitState === 'saved'
            ? 'bg-green-50 text-green-900'
            : autoSubmitState === 'saving'
              ? 'bg-blue-50 text-blue-900'
              : autoSubmitState === 'error'
                ? 'bg-yellow-50 text-yellow-900'
                : 'bg-gray-50 text-gray-800'
        }`}
      >
        {autoSubmitMessage || '系統會在完成後自動儲存並送出結果，不需要額外操作。'}
      </div>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      <SummaryBlock title="你的整體診斷">
        <div className="space-y-2">
          <div>{stage5Diagnosis.headline}</div>
          <div>{stage5Diagnosis.keyIssue}</div>
          <div className="font-semibold text-gray-900">{stage5Diagnosis.correctSummary}</div>
        </div>
      </SummaryBlock>

      <SummaryBlock title="你目前的優勢">
        <div className="space-y-2">
          <div>
            第 3 階段正確 {correctCount} / {stage3EvidenceQuestions.length} 題，
            第 4 階段正確 {transferCorrectCount} / {transferQuestions.length} 題。
          </div>
          <div>
            較有判斷力的線索：
            {diagnosticFeatures.length ? diagnosticFeatures.join('、') : '尚未記錄'}
          </div>
          <div>
            這表示你已開始建立自己的分類規則，不只是憑直覺作答。
          </div>
        </div>
      </SummaryBlock>

      <SummaryBlock title="你下一步最該做的事">
        <div className="space-y-2">
          <div>{stage5Diagnosis.nextStep}</div>
          <div>
            建議優先重看：
            {stage5ReviewPhyla.length ? stage5ReviewPhyla.join('、') : '先從答錯題目對應的門別開始'}
          </div>
          <div>
            作法：先看提示卡，再用「至少兩個結構特徵」重寫一次判斷理由。
          </div>
        </div>
      </SummaryBlock>
    </div>

    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-4 text-2xl font-black">優先重看清單</div>
      <div className="grid gap-4 md:grid-cols-2">
        {stage5PriorityRows.map((row) => {
          const cueProfile = getCueProfile(row.selectedFeatures)
          const actionText = getQuestionAction({
            isCorrect: row.isCorrect,
            cueLabel: cueProfile.label,
            confidence: row.confidence,
            correctAnswer: row.correctAnswer,
          })

          return (
            <div key={`${row.stageLabel}-${row.questionId}`} className="rounded-xl border border-gray-200 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="font-bold text-gray-900">
                  {row.stageLabel}｜{row.animalName}
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    row.isCorrect === true
                      ? 'bg-green-100 text-green-700'
                      : row.isCorrect === false
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {row.isCorrect === true ? '正確' : row.isCorrect === false ? '需優先修正' : '未作答'}
                </div>
              </div>

              <div className="space-y-2 text-sm leading-6 text-gray-700">
                <div>你的答案：{row.userAnswer || '未作答'}</div>
                <div>正確門別：{row.correctAnswer ?? '未設定'}</div>
                <div>線索判讀：{cueProfile.label}</div>
                <div>信心狀態：{getConfidenceText(row.confidence)}</div>
                <div>
                  你勾選的特徵：
                  {row.selectedFeatures.length ? row.selectedFeatures.join('、') : '未勾選'}
                </div>
                <div className="rounded-lg bg-yellow-50 p-3 text-yellow-900">
                  建議行動：{actionText}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>

    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-4 text-2xl font-black">逐題診斷回饋</div>

      <div className="space-y-4">
        {stage5Rows.map((row, index) => {
          const cueProfile = getCueProfile(row.selectedFeatures)
          const actionText = getQuestionAction({
            isCorrect: row.isCorrect,
            cueLabel: cueProfile.label,
            confidence: row.confidence,
            correctAnswer: row.correctAnswer,
          })

          return (
            <div key={`${row.stageLabel}-${row.questionId}`} className="rounded-xl border border-gray-200 p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="font-bold text-gray-900">
                  {row.stageLabel} 第 {index + 1} 題：{row.animalName}
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    row.isCorrect === true
                      ? 'bg-green-100 text-green-700'
                      : row.isCorrect === false
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {row.isCorrect === true ? '正確' : row.isCorrect === false ? '需修正' : '未作答'}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                  <div>你的答案：{row.userAnswer || '未作答'}</div>
                  <div>正確門別：{row.correctAnswer ?? '未設定'}</div>
                  <div>信心：{getConfidenceText(row.confidence)}</div>
                </div>

                <div className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-gray-700">
                  <div>你勾選的特徵：{row.selectedFeatures.length ? row.selectedFeatures.join('、') : '未勾選'}</div>
                  <div>線索判讀：{cueProfile.label}</div>
                  <div>
                    推薦先看：
                    {row.recommendedFeatures.length ? row.recommendedFeatures.join('、') : '未設定'}
                  </div>
                </div>

                <div className="rounded-lg bg-yellow-50 p-3 text-sm leading-6 text-yellow-900">
                  <div>系統回饋：{row.feedback}</div>
                  <div className="mt-2">下一步：{actionText}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
      {ALLOW_POST_FEEDBACK_RETRY ? (
        <button
          type="button"
          onClick={() => {
            const targetIndex =
              transferResponses.length > 0 ? transferResponses.length - 1 : 0
            openTransferQuestion(targetIndex)
            setStage('transfer')
          }}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold sm:w-auto"
        >
          回到階段 4
        </button>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          研究版設定：查看回饋後不再回改正式答案。若要重做，請重新開始一次新的作答。
        </div>
      )}

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white sm:w-auto"
      >
        重新開始
      </button>
    </div>
  </section>
)}
        </div>
      </div>
    </main>
  )
}