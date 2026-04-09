export type RepresentationType = 'text' | 'image' | 'text_image'

export type EvidenceQuestion = {
  id: string
  stage: 'evidence'
  representationType: RepresentationType
  prompt: string
  stimulusText?: string
  imageUrl?: string | null
  options: string[]
  correctAnswer: string
  targetFeature: string
  misconceptionMap: Record<string, string | null>
}

export type CompareQuestion = {
  id: string
  stage: 'compare'
  representationType: RepresentationType
  prompt: string
  stimulusText?: string
  imageUrl?: string | null
  options: string[]
  correctAnswer: string
  targetFeature: string
  compareFocus: string
  correctFeedback: string
  fallbackFeedback: string
  feedbackByCode: Record<string, string>
  misconceptionMap: Record<string, string | null>
}

export type TransferQuestion = {
  id: string
  stage: 'transfer'
  representationType: RepresentationType
  prompt: string
  stimulusText?: string
  imageUrl?: string | null
  options: string[]
  correctAnswer: string
  targetFeature: string
  misconceptionMap: Record<string, string | null>
}

export const evidenceQuestions: EvidenceQuestion[] = [
  {
    id: 'Q1',
    stage: 'evidence',
    representationType: 'text',
    prompt: '水母應該分類到哪一門？',
    stimulusText: '請根據主要構造與特徵判斷，不要只看生活環境。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '刺絲胞動物門',
    targetFeature: '口周有觸手、觸手有刺絲胞、生活在水中',
    misconceptionMap: {
      '刺絲胞動物門': null,
      '扁形動物門': 'A1',
      '軟體動物門': 'A1',
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q4',
    stage: 'evidence',
    representationType: 'text',
    prompt: '渦蟲應該分類到哪一門？',
    stimulusText: '這種動物身體扁平，請根據主要構造與特徵判斷。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
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
    id: 'Q7',
    stage: 'evidence',
    representationType: 'text',
    prompt: '章魚應該分類到哪一門？',
    stimulusText: '請注意：有些軟體動物沒有明顯外殼。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '軟體動物門',
    targetFeature: '身體柔軟；章魚的殼已退化',
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
    representationType: 'text',
    prompt: '蝸牛應該分類到哪一門？',
    stimulusText: '這種動物身體柔軟，而且通常有殼。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '軟體動物門',
    targetFeature: '身體柔軟；有些軟體動物有殼',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q11',
    stage: 'evidence',
    representationType: 'text',
    prompt: '蚯蚓應該分類到哪一門？',
    stimulusText: '請根據身體構造判斷，不要只看外形細長。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '環節動物門',
    targetFeature: '身體分節、細長柔軟、每節外形相似',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'R1',
      '軟體動物門': 'A1',
      '環節動物門': null,
    },
  },
  {
    id: 'Q12',
    stage: 'evidence',
    representationType: 'text_image',
    prompt: '蛞蝓應該分類到哪一門？',
    stimulusText: '這種動物沒有明顯外殼，但身體柔軟。之後可補圖片。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '軟體動物門',
    targetFeature: '身體柔軟；不是所有軟體動物都有明顯外殼',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q15',
    stage: 'evidence',
    representationType: 'text',
    prompt: '海葵應該分類到哪一門？',
    stimulusText: '這種動物生活在水中，口周有觸手。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '刺絲胞動物門',
    targetFeature: '口周有觸手、觸手有刺絲胞',
    misconceptionMap: {
      '刺絲胞動物門': null,
      '扁形動物門': 'A1',
      '軟體動物門': 'A1',
      '環節動物門': 'R1',
    },
  },
]

export const compareQuestions: CompareQuestion[] = [
  {
    id: 'Q3',
    stage: 'compare',
    representationType: 'text',
    prompt: '章魚與水母都有觸手，章魚應該分類到哪一門？',
    stimulusText: '先依你的判斷作答，再閱讀回饋。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '軟體動物門',
    targetFeature: '不能只因為有觸手就判成刺絲胞動物門',
    compareFocus: '章魚 vs 水母：都有觸手，但分類依據不同',
    correctFeedback:
      '你第一次的判斷已經抓到重點。章魚雖然有觸手，但不屬於刺絲胞動物門；關鍵仍然是它屬於身體柔軟的軟體動物。請再確認你的理由是否真的使用了核心特徵。',
    fallbackFeedback:
      '這題不能只看單一外觀特徵。請重新比較章魚與水母的核心構造，再進行改答。',
    feedbackByCode: {
      T1: '你目前最可能是把「有觸手」直接當成刺絲胞動物門的判準。這是單一特徵過度延伸。水母的關鍵不只是有觸手，而是口周有觸手且觸手具有刺絲胞；章魚則屬於身體柔軟的軟體動物。',
      A1: '你目前可能是根據整體外觀相似來判斷。章魚與水母外表都可能有延伸構造，但分類時不能只看「長得像不像」，而要看主要構造與特徵。',
      U0: '你目前可能尚未抓到核心構造，或還不確定判準。請先問自己：這題真正要看的是棲地嗎？外形嗎？還是某個關鍵構造？再重新比較章魚與水母。',
      H1: '這題不應只依生活環境判斷。即使都可能生活在水中，分類仍應回到主要構造與特徵。',
      R1: '這題不應只依外形延伸或細長感判斷。請重新比較真正有診斷性的構造特徵。',
    },
    misconceptionMap: {
      '刺絲胞動物門': 'T1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q5',
    stage: 'compare',
    representationType: 'text',
    prompt: '蚯蚓和渦蟲都細長柔軟，蚯蚓應該分類到哪一門？',
    stimulusText: '先依你的判斷作答，再閱讀回饋。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '環節動物門',
    targetFeature: '不能只看細長外形，要看身體是否分節',
    compareFocus: '蚯蚓 vs 渦蟲：外形都細長，但身體構造不同',
    correctFeedback:
      '你第一次的判斷已經抓到核心：蚯蚓屬於環節動物，重點在身體分節、每節外形相似。請再確認你的理由是否明確指出這個判準。',
    fallbackFeedback:
      '這題不能只用外觀直覺判斷。請重新比較蚯蚓與渦蟲的核心構造，特別注意身體是否分節。',
    feedbackByCode: {
      R1: '你目前最可能是被「長長的、細長的」外形帶著走。這是細長外形迷思。蚯蚓分類的關鍵不是長，而是身體分節、每節外形相似；渦蟲則強調身體扁平。',
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
]

export const transferQuestions: TransferQuestion[] = [
  {
    id: 'Q14',
    stage: 'transfer',
    representationType: 'text',
    prompt: '有一種動物生活在潮濕地面，身體柔軟，沒有明顯外殼。它最可能分類到哪一門？',
    stimulusText: '請注意：不要因為沒有殼，就排除軟體動物門。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '軟體動物門',
    targetFeature: '不是所有軟體動物都有明顯外殼；核心仍是身體柔軟',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'A1',
      '軟體動物門': null,
      '環節動物門': 'R1',
    },
  },
  {
    id: 'Q16',
    stage: 'transfer',
    representationType: 'text',
    prompt: '有一種動物身體扁平，常貼附在潮濕表面移動。它最可能分類到哪一門？',
    stimulusText: '請根據身體主要構造判斷，不要只看棲地。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
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
    id: 'T1',
    stage: 'transfer',
    representationType: 'text_image',
    prompt: '某動物的口周圍有觸手，觸手具有刺絲胞。它最可能分類到哪一門？',
    stimulusText: '此題是新表徵題，請根據描述中的核心特徵判斷。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
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
    representationType: 'text_image',
    prompt: '某動物身體由許多相似體節組成，外形細長柔軟。它最可能分類到哪一門？',
    stimulusText: '此題是新表徵題，請留意真正有診斷性的特徵。',
    imageUrl: null,
    options: ['刺絲胞動物門', '扁形動物門', '軟體動物門', '環節動物門'],
    correctAnswer: '環節動物門',
    targetFeature: '身體分節、每節外形相似',
    misconceptionMap: {
      '刺絲胞動物門': 'A1',
      '扁形動物門': 'R1',
      '軟體動物門': 'A1',
      '環節動物門': null,
    },
  },
]
