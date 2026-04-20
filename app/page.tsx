'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  stage1Cards,
  bridgeReflectQuestions,
  evidenceQuestions,
} from '../lib/questions'

type AppStage = 'stage1' | 'awareness' | 'evidence' | 'done'

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

const INITIAL_GROUPS: StageGroup[] = [
  { id: 'G1', name: '群組 1', reason: '', cardIds: [] },
  { id: 'G2', name: '群組 2', reason: '', cardIds: [] },
  { id: 'G3', name: '群組 3', reason: '', cardIds: [] },
]

const STAGE_ITEMS: { key: AppStage; label: string }[] = [
  { key: 'stage1', label: '自由預分類' },
  { key: 'awareness', label: '六門規則建立' },
  { key: 'evidence', label: '帶提示門別判定' },
  { key: 'done', label: '結果回饋' },
]

const PHYLUM_GUIDE: GuideCard[] = [
  {
    phylum: '刺絲胞動物門',
    examples: ['海葵', '水母'],
    keyFeatures: ['刺絲胞', '觸手', '輻射對稱', '袋狀身體'],
    unstableClues: ['顏色鮮豔', '外型像花'],
    teacherTip: '先看刺絲胞與觸手，不要只看外觀像不像花。',
  },
  {
    phylum: '扁形動物門',
    examples: ['渦蟲'],
    keyFeatures: ['身體扁平', '左右對稱', '無體節'],
    unstableClues: ['身體細長', '生活在水中'],
    teacherTip: '重點是扁平且無體節，不是只看細長。',
  },
  {
    phylum: '軟體動物門',
    examples: ['蛤蠣', '蝸牛'],
    keyFeatures: ['外套膜', '肌肉足', '多數有殼'],
    unstableClues: ['只要有殼就一定是', '看起來很軟'],
    teacherTip: '殼常見，但不是唯一依據；要注意外套膜與肌肉足。',
  },
  {
    phylum: '環節動物門',
    examples: ['蚯蚓', '水蛭'],
    keyFeatures: ['身體分節', '環狀體節'],
    unstableClues: ['身體長條', '生活在泥土或水裡'],
    teacherTip: '最關鍵的是體節，不是只看長條外形。',
  },
  {
    phylum: '節肢動物門',
    examples: ['蝴蝶', '蜘蛛', '螃蟹'],
    keyFeatures: ['外骨骼', '身體分節', '成對附肢'],
    unstableClues: ['會飛', '腳很多', '住在海邊'],
    teacherTip: '要看外骨骼、分節與附肢，而不是生活環境。',
  },
  {
    phylum: '棘皮動物門',
    examples: ['海膽', '海星'],
    keyFeatures: ['棘皮', '管足', '成體多為五輻對稱'],
    unstableClues: ['一定是星形', '表面粗糙就算'],
    teacherTip: '重點不是像星星，而是棘皮、管足與五輻對稱。',
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
}

const FEATURE_BANK = Array.from(
  new Set(PHYLUM_GUIDE.flatMap((guide) => [...guide.keyFeatures, ...guide.unstableClues]))
)

function shuffleArray<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
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

function upsertEvidenceResponses(
  prev: EvidenceResponse[],
  nextResponse: EvidenceResponse
): EvidenceResponse[] {
  const merged = [...prev.filter((item) => item.questionId !== nextResponse.questionId), nextResponse]

  return evidenceQuestions
    .map((question) => merged.find((item) => item.questionId === question.id))
    .filter(Boolean) as EvidenceResponse[]
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
        <div className="flex min-w-max gap-2">
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
                className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold md:text-sm ${
                  active
                    ? 'border-black bg-black text-white'
                    : locked
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                      : 'border-gray-300 bg-white text-gray-700'
                }`}
              >
                {index + 1}. {item.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FeatureCheckboxes({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {FEATURE_BANK.map((feature) => {
        const checked = selected.includes(feature)

        return (
          <label
            key={feature}
            className="flex items-start gap-2 rounded-lg border border-gray-200 p-2 text-sm"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, feature])
                } else {
                  onChange(selected.filter((item) => item !== feature))
                }
              }}
              className="mt-1"
            />
            <span>{feature}</span>
          </label>
        )
      })}
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
}: {
  title: string
  prompt: string
  stimulusText: string
  imageUrl: string | null
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-2 text-sm font-semibold text-gray-500">{title}</div>
      <div className="mb-3 text-xl font-bold text-gray-900 sm:text-2xl">{prompt}</div>
      <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
        {stimulusText}
      </div>
      {imageUrl ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-3">
          <img
            src={imageUrl}
            alt={prompt}
            className="h-48 w-full object-contain sm:h-56"
          />
        </div>
      ) : null}
    </div>
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

function GuideCardView({ guide }: { guide: GuideCard }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <div className="mb-2 text-lg font-black text-gray-900">{guide.phylum}</div>
      <div className="mb-1 text-sm text-gray-700">代表生物：{guide.examples.join('、')}</div>

      <div className="mb-2 mt-3 text-sm font-semibold text-gray-700">通常先看的關鍵特徵</div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
        {guide.keyFeatures.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <div className="mb-2 mt-4 text-sm font-semibold text-gray-700">容易誤用的線索</div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-gray-800">
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

  const [selectedMovePayload, setSelectedMovePayload] = useState<DragPayload | null>(null)

  const currentEvidence = evidenceQuestions[evidenceIndex]

  const [progressHydrated, setProgressHydrated] = useState(false)

  const awarenessStartedAtRef = useRef<number | null>(null)
  const awarenessBaseSecondsRef = useRef(0)
  const lastSubmittedHashRef = useRef('')
  const retryTimerRef = useRef<number | null>(null)

  const readinessOptionMap = useMemo(() => {
    const map: Record<string, string[]> = {}
    READINESS_CHECKS.forEach((item) => {
      map[item.id] = shuffleArray(item.options)
    })
    return map
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

      setStage(saved.stage ?? 'stage1')
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

      setEvidenceResponses(saved.evidenceResponses ?? [])
      setProgressHydrated(true)
    } catch {
      setProgressHydrated(true)
    }
  }, [participantCode, progressHydrated])

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

  const nonEmptyGroups = useMemo(
    () => groups.filter((group) => group.cardIds.length > 0),
    [groups]
  )

  const groupedCardCount = useMemo(
    () => nonEmptyGroups.reduce((sum, group) => sum + group.cardIds.length, 0),
    [nonEmptyGroups]
  )

  const stage1Complete =
    bankCardIds.length === 0 &&
    groupedCardCount === stage1Cards.length &&
    nonEmptyGroups.length >= 2 &&
    nonEmptyGroups.every((group) => group.reason.trim().length > 0) &&
    overallReason.trim().length >= 8

  const reflectionComplete = bridgeReflectQuestions.every(
    (question) => (bridgeReflectAnswers[question.id] ?? []).length > 0
  )

  const featureChoiceComplete = diagnosticFeatures.length + possibleFeatures.length > 0

  const readinessComplete = READINESS_CHECKS.every(
    (item) => readinessAnswers[item.id] === item.correct
  )

  const minStudyTimeMet = awarenessSecondsSpent >= 45

  const awarenessComplete =
    reflectionComplete &&
    featureChoiceComplete &&
    readinessComplete &&
    awarenessCommitment &&
    minStudyTimeMet

  const evidenceAllComplete = evidenceResponses.length === evidenceQuestions.length

  const maxUnlockedIndex = useMemo(() => {
    let next = 0
    if (stage1Complete) next = 1
    if (stage1Complete && awarenessComplete) next = 2
    if (stage1Complete && awarenessComplete && evidenceAllComplete) next = 3
    return next
  }, [stage1Complete, awarenessComplete, evidenceAllComplete])

  const evidenceFormComplete =
    Boolean(evidenceAnswer) &&
    evidenceSelectedFeatures.length > 0 &&
    evidenceReasonText.trim().length >= 8

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

  const resultRows = useMemo<ResultRow[]>(() => {
    return evidenceQuestions.map((question) => {
      const animalName = inferAnimalName(question)
      const rule = ANIMAL_RULES[animalName]
      const response = evidenceResponses.find((item) => item.questionId === question.id)

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
  }, [evidenceResponses])

  const correctCount = resultRows.filter((row) => row.isCorrect === true).length

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

  function resetEvidenceForm() {
    setEvidenceAnswer('')
    setEvidenceSelectedFeatures([])
    setEvidenceReasonText('')
    setEvidenceConfidence(2)
  }

  function openEvidenceQuestion(index: number, sourceResponses = evidenceResponses) {
    const question = evidenceQuestions[index]
    const saved = sourceResponses.find((item) => item.questionId === question.id)

    setEvidenceIndex(index)

    if (saved) {
      setEvidenceAnswer(saved.answer)
      setEvidenceSelectedFeatures(saved.selectedFeatures)
      setEvidenceReasonText(saved.reasonText)
      setEvidenceConfidence(saved.confidence)
    } else {
      resetEvidenceForm()
    }
  }

  function saveCurrentEvidence(): EvidenceResponse[] | null {
    if (!currentEvidence) return null

    if (!evidenceAnswer) {
      window.alert('請先選擇一個門別。')
      return null
    }

    if (evidenceSelectedFeatures.length === 0) {
      window.alert('請至少勾選一個判斷特徵。')
      return null
    }

    if (evidenceReasonText.trim().length < 8) {
      window.alert('請至少寫 8 個字，簡短說明判斷理由。')
      return null
    }

    const animalName = inferAnimalName(currentEvidence)

    const nextResponse: EvidenceResponse = {
      questionId: currentEvidence.id,
      animalName,
      answer: evidenceAnswer,
      selectedFeatures: evidenceSelectedFeatures,
      reasonText: evidenceReasonText,
      confidence: evidenceConfidence,
    }

    const nextResponses = upsertEvidenceResponses(evidenceResponses, nextResponse)
    setEvidenceResponses(nextResponses)

    return nextResponses
  }

  const exportPayload = useMemo(
    () => ({
      participantCode,
      participant: enterSession,
      version: 'v6-responsive-touch-friendly',
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
      resultSummary: {
        correctCount,
        totalQuestions: evidenceQuestions.length,
      },
      resultRows,
      autoSubmitState,
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
      correctCount,
      resultRows,
      autoSubmitState,
    ]
  )

  const exportHash = useMemo(() => JSON.stringify(exportPayload), [exportPayload])

  useEffect(() => {
    if (stage !== 'done' || !submissionKey || !enterSession) return
    if (exportHash === lastSubmittedHashRef.current) return

    const submit = async () => {
      setAutoSubmitState('saving')
      setAutoSubmitMessage('系統正在自動儲存並送出結果…')

      try {
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
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result?.error || '送出失敗')
        }

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
  }, [stage, submissionKey, participantCode, enterSession, exportPayload, exportHash])

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-3 sm:px-4 sm:py-4 md:px-6">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
        <div className="mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                Sci-Flipper 動物分類學習網站
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

        <div className="flex-1">
          {stage === 'stage1' && (
            <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 md:text-3xl">
                      第 1 階段：自由預分類
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

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
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
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-sm font-semibold text-gray-700">整體分類想法</div>
                  <textarea
                    value={overallReason}
                    onChange={(e) => setOverallReason(e.target.value)}
                    placeholder="請用一句話說明你這次分類的主要思路"
                    className="min-h-[88px] w-full rounded-xl border border-gray-300 px-3 py-3 text-sm leading-6 text-gray-900"
                  />
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
                    <li>{overallReason.trim().length >= 8 ? '已完成' : '尚未完成'}：已寫整體分類想法</li>
                  </ul>

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
                <h2 className="mb-3 text-2xl font-black sm:text-3xl">第 2 階段：六門規則建立</h2>
                <div className="rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                  這一階段先建立規則，再進到正式判斷。系統已加入防亂猜機制：
                  選項隨機排序、至少停留 45 秒、可重作但會記錄重試次數。
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
                <h3 className="mb-4 text-2xl font-black">任務 B：區分較穩定與較不穩定的線索</h3>

                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 text-lg font-bold text-gray-900">勾選：較適合幫助分門的線索</div>
                  <ToggleCheckboxGrid
                    options={FEATURE_BANK}
                    selected={diagnosticFeatures}
                    onToggle={toggleDiagnosticFeature}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 p-4">
                  <div className="mb-3 text-lg font-bold text-gray-900">
                    勾選：可能有幫助，但不能單獨決定的線索
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

              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <h3 className="mb-4 text-2xl font-black">任務 C：六門提示卡</h3>
                <div className="mb-4 text-sm leading-6 text-gray-700">
                  這裡明確整理六個門的關鍵特徵與代表生物。第三階段可以繼續參考，不要求死背。
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
                  {minStudyTimeMet ? '（已達最短學習時間）' : `（至少需 45 秒，尚差 ${45 - awarenessSecondsSpent} 秒）`}
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
                          {readinessOptionMap[item.id].map((option) => (
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
                <SummaryBlock title="前面兩階段摘要">
                  <div className="space-y-2">
                    <div>已形成 {nonEmptyGroups.length} 個非空群組。</div>
                    <div>較適合幫助分門：{diagnosticCount} 項。</div>
                    <div>可能有幫助但不穩定：{possibleCount} 項。</div>
                    {customFeatureText.trim() ? <div>自訂補充特徵：{customFeatureText}</div> : null}
                  </div>
                </SummaryBlock>

                <QuestionCard
                  title={`第 3 階段：門別判定（${evidenceIndex + 1} / ${evidenceQuestions.length}）`}
                  prompt={currentEvidence.prompt}
                  stimulusText={currentEvidence.stimulusText}
                  imageUrl={currentEvidence.imageUrl}
                />

                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                  <div className="mb-3 text-lg font-black">請選擇門別</div>
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

                  <div className="mb-3 mt-5 text-lg font-black">
                    你這一題最主要依據哪些特徵？（可複選）
                  </div>
                  <FeatureCheckboxes
                    selected={evidenceSelectedFeatures}
                    onChange={setEvidenceSelectedFeatures}
                  />

                  <div className="mb-2 mt-5 text-lg font-black">簡短說明理由</div>
                  <div className="mb-2 text-sm text-gray-600">
                    可用句型：「我判斷它屬於＿＿，因為我觀察到＿＿特徵，所以我排除／判定＿＿。」
                  </div>
                  <textarea
                    value={evidenceReasonText}
                    onChange={(e) => setEvidenceReasonText(e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-gray-300 px-3 py-2"
                    placeholder="請至少寫 8 個字，簡短說明你為什麼這樣判斷"
                  />

                  <div className="mb-2 mt-5 text-lg font-black">信心程度</div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={evidenceConfidence}
                    onChange={(e) => setEvidenceConfidence(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 text-sm text-gray-600">
                    目前信心：{evidenceConfidence} / 4
                  </div>

                  <div className="mt-5 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                    目前已完成 {evidenceResponses.length} / {evidenceQuestions.length} 題。右側提示卡可隨時參考。
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

                        if (evidenceIndex < evidenceQuestions.length - 1) {
                          openEvidenceQuestion(evidenceIndex + 1, nextResponses)
                        } else {
                          setStage('done')
                        }
                      }}
                      className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                    >
                      {evidenceIndex < evidenceQuestions.length - 1 ? '儲存並下一題' : '完成並查看結果'}
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
                  <GuideCardView key={guide.phylum} guide={guide} />
                ))}
              </aside>
            </section>
          )}

          {stage === 'done' && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <h2 className="mb-3 text-2xl font-black sm:text-3xl">第 4 階段：學習結果回饋</h2>

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
                  {autoSubmitMessage || '系統會在完成後自動儲存並送出，不需要額外操作。'}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryBlock title="階段 1">
                  <div>非空群組：{nonEmptyGroups.length}</div>
                  <div>全部卡片已分類：{bankCardIds.length === 0 ? '是' : '否'}</div>
                  <div className="mt-2">整體分類想法：{overallReason}</div>
                </SummaryBlock>

                <SummaryBlock title="階段 2">
                  <div>較適合幫助分門：{diagnosticCount} 項</div>
                  <div>可能有幫助但不穩定：{possibleCount} 項</div>
                  <div className="mt-2">就緒檢核：{readinessComplete ? '通過' : '未通過'}</div>
                </SummaryBlock>

                <SummaryBlock title="階段 3">
                  <div>
                    正確題數：{correctCount} / {evidenceQuestions.length}
                  </div>
                  <div className="mt-2">已完成門別判定：{evidenceResponses.length} / {evidenceQuestions.length}</div>
                </SummaryBlock>

                <SummaryBlock title="下一步建議">
                  <div>
                    {correctCount === evidenceQuestions.length
                      ? '你已能穩定用特徵判斷六個門。可回看第一階段，觀察自己概念如何改變。'
                      : '請優先檢查答錯題的正確門別與推薦特徵，找出自己最常誤用的線索。'}
                  </div>
                </SummaryBlock>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
                <div className="mb-4 text-2xl font-black">逐題結果與回饋</div>

                <div className="space-y-4">
                  {resultRows.map((row, index) => (
                    <div key={row.questionId} className="rounded-xl border border-gray-200 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="font-bold text-gray-900">
                          第 {index + 1} 題：{row.animalName}
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

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                          <div>你的答案：{row.userAnswer || '未作答'}</div>
                          <div>你的依據：{row.selectedFeatures.length ? row.selectedFeatures.join('、') : '未勾選'}</div>
                        </div>

                        <div className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-gray-700">
                          <div>正確門別：{row.correctAnswer ?? '未設定'}</div>
                          <div>
                            推薦先看的特徵：
                            {row.recommendedFeatures.length ? row.recommendedFeatures.join('、') : '未設定'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm leading-6 text-yellow-900">
                        系統回饋：{row.feedback}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
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