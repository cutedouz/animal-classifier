export const PHYLUM_OPTIONS = [
  '刺絲胞動物門',
  '扁形動物門',
  '軟體動物門',
  '環節動物門',
  '棘皮動物門',
  '節肢動物門',
] as const

export type PhylumOption = (typeof PHYLUM_OPTIONS)[number]

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

export type EvidenceQuestion = {
  id: string
  prompt: string
  stimulusText: string
  imageUrl: string | null
  options: readonly PhylumOption[]
}

export const stage1Cards: Stage1Card[] = [
  {
    id: 'P1',
    name: '水母',
    imageUrl: '/animals/p1.jpg',
    shortLabel: '水母',
    phylum: '刺絲胞動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['身體呈輻射對稱', '口周有觸手', '觸手具有刺絲胞'],
    warning: '生活在水中不是最主要的分類依據，關鍵是刺絲胞與輻射對稱。',
  },
  {
    id: 'P2',
    name: '海葵',
    imageUrl: '/animals/p2.jpg',
    shortLabel: '海葵',
    phylum: '刺絲胞動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['身體呈輻射對稱', '口部周圍有觸手', '觸手具有刺絲胞'],
    warning: '固著生活不代表是植物，仍要看口周觸手與刺絲胞。',
  },
  {
    id: 'P3',
    name: '渦蟲',
    imageUrl: '/animals/p3.jpg',
    shortLabel: '渦蟲',
    phylum: '扁形動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['身體扁平', '左右對稱', '消化系統只有一個開口'],
    warning: '細長柔軟不是最主要判準，重點是身體扁平。',
  },
  {
    id: 'P4',
    name: '蝸牛',
    imageUrl: '/animals/p4.jpg',
    shortLabel: '蝸牛',
    phylum: '軟體動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['身體柔軟不分節', '以腹足爬行', '通常具有殼'],
    warning: '有殼不是唯一判準，重點仍是身體柔軟不分節。',
  },
  {
    id: 'P5',
    name: '蛤蠣',
    imageUrl: '/animals/p5.jpg',
    shortLabel: '蛤蠣',
    phylum: '軟體動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['身體柔軟不分節', '具有兩片殼', '屬於軟體動物'],
    warning: '看到殼不要直接跟其他有硬外表的動物分在一起，要回到柔軟身體這個核心。',
  },
  {
    id: 'P6',
    name: '蚯蚓',
    imageUrl: '/animals/p6.jpg',
    shortLabel: '蚯蚓',
    phylum: '環節動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['身體明顯分節', '每節外形相似', '身體柔軟細長'],
    warning: '細長不是重點，真正關鍵是身體分節。',
  },
  {
    id: 'P7',
    name: '水蛭',
    imageUrl: '/animals/p7.jpg',
    shortLabel: '水蛭',
    phylum: '環節動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['身體分節', '前後具有吸盤', '身體柔軟細長'],
    warning: '會吸血不是主要分類依據，仍要看身體分節。',
  },
  {
    id: 'P8',
    name: '海膽',
    imageUrl: '/animals/p8.jpg',
    shortLabel: '海膽',
    phylum: '棘皮動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['體表具有棘刺', '具有管足', '成體常呈輻射對稱'],
    warning: '生活在海中不是主要分類依據，棘皮與管足更重要。',
  },
  {
    id: 'P9',
    name: '海星',
    imageUrl: '/animals/p9.jpg',
    shortLabel: '海星',
    phylum: '棘皮動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['具有管足', '體表具有棘皮特徵', '身體常呈輻射對稱'],
    warning: '不要只看像星星的外形，關鍵仍是棘皮與管足。',
  },
  {
    id: 'P10',
    name: '蝴蝶',
    imageUrl: '/animals/p10.jpg',
    shortLabel: '蝴蝶',
    phylum: '節肢動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['具有外骨骼', '足分節且有關節', '成蟲有三對足'],
    warning: '會飛不是主要分類依據，重點是外骨骼與分節附肢。',
  },
  {
    id: 'P11',
    name: '蜘蛛',
    imageUrl: '/animals/p11.jpg',
    shortLabel: '蜘蛛',
    phylum: '節肢動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['具有外骨骼', '足分節且有關節', '具有四對步足'],
    warning: '腳多不是唯一判準，仍要看外骨骼與分節附肢。',
  },
  {
    id: 'P12',
    name: '螃蟹',
    imageUrl: '/animals/p12.jpg',
    shortLabel: '螃蟹',
    phylum: '節肢動物門',
    visibleHint: '第一次自由分類先不要看特徵；第二階段才會回頭整理。',
    diagnosticFeatures: ['具有外骨骼', '足分節且有關節', '具有多對步足與螯足'],
    warning: '住在水邊或有硬殼都不是單獨判準，重點仍是節肢動物的外骨骼與關節附肢。',
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
      '有沒有外骨骼',
      '腳的數量多不多',
      '生活在水中或陸地',
      '是不是呈輻射對稱',
      '我其實不太確定',
    ],
  },
  {
    id: 'B2',
    prompt: '你覺得哪些依據，比較適合拿來判斷「屬於哪一門」？（可複選）',
    options: [
      '觸手具有刺絲胞',
      '身體扁平',
      '身體柔軟不分節',
      '身體明顯分節',
      '成體多呈輻射對稱',
      '具有管足',
      '具有外骨骼',
      '足分節且有關節',
      '有沒有殼',
      '生活在水中',
    ],
  },
]

export const bridgeFeatureChoices: BridgeFeatureChoice[] = [
  { id: 'F1', text: '觸手具有刺絲胞', category: 'diagnostic' },
  { id: 'F2', text: '身體扁平', category: 'diagnostic' },
  { id: 'F3', text: '身體柔軟不分節', category: 'diagnostic' },
  { id: 'F4', text: '身體明顯分節', category: 'diagnostic' },
  { id: 'F5', text: '成體多呈輻射對稱', category: 'diagnostic' },
  { id: 'F6', text: '具有管足', category: 'diagnostic' },
  { id: 'F7', text: '具有外骨骼', category: 'diagnostic' },
  { id: 'F8', text: '足分節且有關節', category: 'diagnostic' },
  { id: 'F9', text: '有沒有殼', category: 'possible_but_unstable' },
  { id: 'F10', text: '生活在水中', category: 'possible_but_unstable' },
  { id: 'F11', text: '有沒有觸手', category: 'possible_but_unstable' },
  { id: 'F12', text: '腳的數量', category: 'possible_but_unstable' },
]

export const evidenceQuestions: EvidenceQuestion[] = [
  {
    id: 'Q1',
    prompt: '水母應該分類到哪一門？',
    stimulusText:
      '已知：身體呈輻射對稱，口周有多條觸手，而且觸手具有刺絲胞。請依主要構造判斷，不要只看生活在水中。',
    imageUrl: '/animals/p1.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q2',
    prompt: '海葵應該分類到哪一門？',
    stimulusText:
      '已知：身體柔軟，口部周圍有觸手，觸手具有刺絲胞，而且成體呈輻射對稱。請依主要構造判斷。',
    imageUrl: '/animals/p2.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q3',
    prompt: '渦蟲應該分類到哪一門？',
    stimulusText:
      '已知：身體扁平，左右對稱，消化系統只有一個開口。請根據身體構造判斷，不要只看細長外形。',
    imageUrl: '/animals/p3.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q4',
    prompt: '蝸牛應該分類到哪一門？',
    stimulusText:
      '已知：身體柔軟不分節，以腹足爬行，而且通常具有殼。請依主要構造判斷，不要把殼當成唯一依據。',
    imageUrl: '/animals/p4.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q5',
    prompt: '蛤蠣應該分類到哪一門？',
    stimulusText:
      '已知：身體柔軟不分節，具有兩片殼。請依主要構造判斷，不要只因為有殼就和其他硬外表動物混為一類。',
    imageUrl: '/animals/p5.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q6',
    prompt: '蚯蚓應該分類到哪一門？',
    stimulusText:
      '已知：身體明顯分節，每節外形相似，身體柔軟細長。請根據身體是否分節來判斷。',
    imageUrl: '/animals/p6.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q7',
    prompt: '水蛭應該分類到哪一門？',
    stimulusText:
      '已知：身體分節，前後有吸盤，身體柔軟細長。請注意：會吸血不是主要分類依據。',
    imageUrl: '/animals/p7.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q8',
    prompt: '海膽應該分類到哪一門？',
    stimulusText:
      '已知：成體多呈輻射對稱，身體表面有棘刺，而且具有管足。請依主要構造判斷，不要只看生活在海中。',
    imageUrl: '/animals/p8.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q9',
    prompt: '海星應該分類到哪一門？',
    stimulusText:
      '已知：成體多呈輻射對稱，具有管足，身體呈輻射對稱。請依棘皮動物的核心特徵判斷。',
    imageUrl: '/animals/p9.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q10',
    prompt: '蝴蝶應該分類到哪一門？',
    stimulusText:
      '已知：身體具有外骨骼，足分節且有關節，成蟲有三對足。請依主要構造判斷，不要只看會不會飛。',
    imageUrl: '/animals/p10.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q11',
    prompt: '蜘蛛應該分類到哪一門？',
    stimulusText:
      '已知：身體具有外骨骼，足分節且有關節，而且具有四對步足。請依主要構造判斷。',
    imageUrl: '/animals/p11.jpg',
    options: PHYLUM_OPTIONS,
  },
  {
    id: 'Q12',
    prompt: '螃蟹應該分類到哪一門？',
    stimulusText:
      '已知：身體具有外骨骼，足分節且有關節，並具有多對步足與螯足。請依節肢動物的核心特徵判斷。',
    imageUrl: '/animals/p12.jpg',
    options: PHYLUM_OPTIONS,
  },
]