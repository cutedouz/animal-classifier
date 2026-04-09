'use client'

import { useMemo, useState } from 'react'
import {
  PHYLUM_OPTIONS,
  stage1Cards,
  bridgeReflectQuestions,
  bridgeFeatureChoices,
  dichotomousKeyV1,
  evidenceQuestions,
  compareQuestions,
  transferQuestions,
  type PhylumOption,
} from '../lib/questions'

type AppStage =
  | 'stage1'
  | 'awareness'
  | 'build'
  | 'evidence'
  | 'compare'
  | 'transfer'
  | 'done'

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
  answer: PhylumOption
  selectedFeatures: string[]
  reasonText: string
  confidence: number
}

type CompareResponse = {
  questionId: string
  firstAnswer: PhylumOption
  firstSelectedFeatures: string[]
  firstReasonText: string
  firstConfidence: number
  finalAnswer: PhylumOption
  finalSelectedFeatures: string[]
  finalReasonText: string
  finalConfidence: number
}

type TransferResponse = {
  questionId: string
  answer: PhylumOption
  selectedFeatures: string[]
  reasonText: string
  confidence: number
}

const REASON_FEATURE_OPTIONS = [
  '放射對稱',
  '口周有觸手',
  '觸手有刺絲胞',
  '身體扁平',
  '身體柔軟不分節',
  '身體分節',
  '每節外形相似',
  '有沒有殼',
  '有吸盤',
  '生活在水中',
  '外形細長',
  '會吸血／寄生',
]

const INITIAL_GROUPS: StageGroup[] = [
  { id: 'G1', name: '群組 1', reason: '', cardIds: [] },
  { id: 'G2', name: '群組 2', reason: '', cardIds: [] },
]

const KEY_SLOT_TARGETS: { id: string; label: string; result: PhylumOption }[] = [
  { id: 'KS1', label: '第 1 個判斷節點', result: '刺絲胞動物門' },
  { id: 'KS2', label: '第 2 個判斷節點', result: '環節動物門' },
  { id: 'KS3', label: '第 3 個判斷節點', result: '扁形動物門' },
  { id: 'KS4', label: '第 4 個判斷節點', result: '軟體動物門' },
]

function getCardName(cardId: string) {
  return stage1Cards.find((card) => card.id === cardId)?.name ?? cardId
}

function getCardById(cardId: string) {
  return stage1Cards.find((card) => card.id === cardId)
}

function getFeatureById(featureId: string) {
  return bridgeFeatureChoices.find((feature) => feature.id === featureId)
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

function featureMatchesCard(featureText: string, cardId: string): boolean {
  const card = getCardById(cardId)
  if (!card) return false

  const joined = [...card.diagnosticFeatures, card.warning].join('｜')

  switch (featureText) {
    case '放射對稱':
      return joined.includes('放射對稱')
    case '口周有觸手':
      return joined.includes('觸手')
    case '觸手有刺絲胞':
      return joined.includes('刺絲胞')
    case '身體扁平':
      return joined.includes('扁平')
    case '身體柔軟不分節':
      return joined.includes('柔軟不分節')
    case '身體分節':
      return joined.includes('分節')
    case '有沒有殼':
      return joined.includes('殼')
    case '生活在水中':
      return ['P1', 'P2', 'P3', 'P4', 'P7', 'P8', 'P10'].includes(cardId)
    case '外形細長':
      return ['P3', 'P4', 'P9', 'P10'].includes(cardId)
    case '會不會吸血／寄生':
      return ['P4', 'P10'].includes(cardId)
    default:
      return false
  }
}

function StepHeader({
  stage,
  setStage,
}: {
  stage: AppStage
  setStage: (stage: AppStage) => void
}) {
  const items: { key: AppStage; label: string }[] = [
    { key: 'stage1', label: '自由預分類' },
    { key: 'awareness', label: '特徵覺察' },
    { key: 'build', label: '規則建構' },
    { key: 'evidence', label: '門別判定' },
    { key: 'compare', label: '對比修正' },
    { key: 'transfer', label: '遷移檢驗' },
  ]

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-2 text-sm font-semibold text-gray-700">流程</div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => {
          const active = stage === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setStage(item.key)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                active
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              {index + 1}. {item.label}
            </button>
          )
        })}
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
    <div className="grid gap-2 md:grid-cols-2">
      {REASON_FEATURE_OPTIONS.map((feature) => {
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-2 text-sm font-semibold text-gray-500">{title}</div>
      <div className="mb-3 text-xl font-bold text-gray-900">{prompt}</div>
      <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
        {stimulusText}
      </div>
      {imageUrl ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-3">
          <img src={imageUrl} alt={prompt} className="h-56 w-full object-contain" />
        </div>
      ) : null}
    </div>
  )
}

export default function Page() {
  const [stage, setStage] = useState<AppStage>('stage1')

  // stage 1
  const [participantCode] = useState('A001')
  const [groups, setGroups] = useState<StageGroup[]>(INITIAL_GROUPS)
  const [bankCardIds, setBankCardIds] = useState<string[]>(stage1Cards.map((card) => card.id))
  const [overallReason, setOverallReason] = useState('')
  const [groupCreateCount, setGroupCreateCount] = useState(2)
  const [cardMoveCount, setCardMoveCount] = useState(0)

  // stage 2 awareness
  const [bridgeReflectAnswers, setBridgeReflectAnswers] = useState<Record<string, string[]>>({})
  const [featureClassification, setFeatureClassification] = useState<
    Record<string, 'diagnostic' | 'possible_but_unstable' | ''>
  >({})

  // stage 3 build
  const [expandedCardId, setExpandedCardId] = useState<string>(stage1Cards[0]?.id ?? '')
  const [studentKeySlots, setStudentKeySlots] = useState<(string | null)[]>([null, null, null, null])
  const [selectedTestCardId, setSelectedTestCardId] = useState<string>(stage1Cards[0]?.id ?? '')

  // stage 4 evidence
  const [evidenceIndex, setEvidenceIndex] = useState(0)
  const [evidenceAnswer, setEvidenceAnswer] = useState<PhylumOption | ''>('')
  const [evidenceSelectedFeatures, setEvidenceSelectedFeatures] = useState<string[]>([])
  const [evidenceReasonText, setEvidenceReasonText] = useState('')
  const [evidenceConfidence, setEvidenceConfidence] = useState(2)
  const [evidenceResponses, setEvidenceResponses] = useState<EvidenceResponse[]>([])

  // stage 5 compare
  const [compareIndex, setCompareIndex] = useState(0)
  const [compareMode, setCompareMode] = useState<'first' | 'feedback'>('first')
  const [compareFeedback, setCompareFeedback] = useState('')
  const [compareFirstAnswer, setCompareFirstAnswer] = useState<PhylumOption | ''>('')
  const [compareFirstSelectedFeatures, setCompareFirstSelectedFeatures] = useState<string[]>([])
  const [compareFirstReasonText, setCompareFirstReasonText] = useState('')
  const [compareFirstConfidence, setCompareFirstConfidence] = useState(2)
  const [compareFinalAnswer, setCompareFinalAnswer] = useState<PhylumOption | ''>('')
  const [compareFinalSelectedFeatures, setCompareFinalSelectedFeatures] = useState<string[]>([])
  const [compareFinalReasonText, setCompareFinalReasonText] = useState('')
  const [compareFinalConfidence, setCompareFinalConfidence] = useState(2)
  const [compareResponses, setCompareResponses] = useState<CompareResponse[]>([])

  // stage 6 transfer
  const [transferIndex, setTransferIndex] = useState(0)
  const [transferAnswer, setTransferAnswer] = useState<PhylumOption | ''>('')
  const [transferSelectedFeatures, setTransferSelectedFeatures] = useState<string[]>([])
  const [transferReasonText, setTransferReasonText] = useState('')
  const [transferConfidence, setTransferConfidence] = useState(2)
  const [transferResponses, setTransferResponses] = useState<TransferResponse[]>([])

  const currentEvidence = evidenceQuestions[evidenceIndex]
  const currentCompare = compareQuestions[compareIndex]
  const currentTransfer = transferQuestions[transferIndex]

  const usedStudentKeyFeatureIds = useMemo(
    () => studentKeySlots.filter(Boolean) as string[],
    [studentKeySlots]
  )

  const studentKeyTestResult = useMemo(() => {
    for (let i = 0; i < studentKeySlots.length; i += 1) {
      const featureId = studentKeySlots[i]
      if (!featureId) continue
      const feature = getFeatureById(featureId)
      if (!feature) continue
      if (featureMatchesCard(feature.text, selectedTestCardId)) {
        return KEY_SLOT_TARGETS[i].result
      }
    }
    return '未判定'
  }, [studentKeySlots, selectedTestCardId])

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

  function handleDropFeatureToSlot(slotIndex: number, featureId: string) {
    setStudentKeySlots((prev) => {
      const next = [...prev]
      const existingIndex = next.findIndex((item) => item === featureId)
      if (existingIndex !== -1) next[existingIndex] = null
      next[slotIndex] = featureId
      return next
    })
  }

  function resetEvidenceForm() {
    setEvidenceAnswer('')
    setEvidenceSelectedFeatures([])
    setEvidenceReasonText('')
    setEvidenceConfidence(2)
  }

  function resetCompareForm() {
    setCompareMode('first')
    setCompareFeedback('')
    setCompareFirstAnswer('')
    setCompareFirstSelectedFeatures([])
    setCompareFirstReasonText('')
    setCompareFirstConfidence(2)
    setCompareFinalAnswer('')
    setCompareFinalSelectedFeatures([])
    setCompareFinalReasonText('')
    setCompareFinalConfidence(2)
  }

  function resetTransferForm() {
    setTransferAnswer('')
    setTransferSelectedFeatures([])
    setTransferReasonText('')
    setTransferConfidence(2)
  }

  function getCompareFeedback(question: (typeof compareQuestions)[number], answer: PhylumOption) {
    if (answer === question.correctAnswer) return question.correctFeedback
    const code = question.misconceptionMap[answer]
    if (!code) return question.fallbackFeedback
    return question.feedbackByCode[code] ?? question.fallbackFeedback
  }

  const exportPayload = useMemo(
    () => ({
      participantCode,
      stage1: {
        groups,
        bankCardIds,
        overallReason,
        groupCreateCount,
        cardMoveCount,
      },
      awareness: {
        bridgeReflectAnswers,
        featureClassification,
      },
      build: {
        studentKeySlots,
        selectedTestCardId,
        studentKeyTestResult,
      },
      evidenceResponses,
      compareResponses,
      transferResponses,
    }),
    [
      participantCode,
      groups,
      bankCardIds,
      overallReason,
      groupCreateCount,
      cardMoveCount,
      bridgeReflectAnswers,
      featureClassification,
      studentKeySlots,
      selectedTestCardId,
      studentKeyTestResult,
      evidenceResponses,
      compareResponses,
      transferResponses,
    ]
  )

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-black tracking-tight text-gray-900">
          動物分類學習網站
        </h1>
        <p className="mb-6 text-sm text-gray-600">
          研究型 MVP｜主構念：依特徵進行動物門級分類
        </p>

        <StepHeader stage={stage} setStage={setStage} />

        {stage === 'stage1' && (
          <section className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-black">第 1 階段：自由預分類</h2>
                  <div className="mt-2 text-sm text-gray-600">participant code：{participantCode}</div>
                </div>
                <div className="grid gap-1 text-sm text-gray-600">
                  <div>目前群組數：{groups.length}</div>
                  <div>群組建立次數（含初始兩組）：{groupCreateCount}</div>
                  <div>卡片移動次數：{cardMoveCount}</div>
                </div>
              </div>

              <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                請先自由分群。現在先不看標準答案，也先不給完整特徵表；先依你目前覺得合理的方式分類。
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const payloadRaw = e.dataTransfer.getData('application/json')
                  if (!payloadRaw) return
                  handleDropOnBank(JSON.parse(payloadRaw) as DragPayload)
                }}
                className="rounded-2xl border border-gray-200 p-4"
              >
                <div className="mb-3 text-xl font-bold">待分類生物卡</div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {bankCardIds.map((cardId) => {
                    const card = getCardById(cardId)
                    if (!card) return null
                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => {
                          const payload: DragPayload = { cardId: card.id, source: 'bank' }
                          e.dataTransfer.setData('application/json', JSON.stringify(payload))
                        }}
                        className="cursor-move rounded-2xl border border-gray-300 bg-white p-3"
                      >
                        <div className="mb-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-2">
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="h-44 w-full object-contain"
                          />
                        </div>
                        <div className="text-sm font-semibold text-gray-500">{card.id}</div>
                        <div className="text-xl font-bold">{card.name}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black">你的群組</h2>
                <button
                  type="button"
                  onClick={() => {
                    const nextIndex = groups.length + 1
                    setGroups((prev) => [
                      ...prev,
                      {
                        id: `G${Date.now()}`,
                        name: `群組 ${nextIndex}`,
                        reason: '',
                        cardIds: [],
                      },
                    ])
                    setGroupCreateCount((count) => count + 1)
                  }}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"
                >
                  新增群組
                </button>
              </div>

              <div className="space-y-4">
                {groups.map((group, groupIndex) => (
                  <div key={group.id} className="rounded-2xl border border-gray-300 p-4">
                    <div className="mb-3 flex items-center gap-2">
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
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                      <button
                        type="button"
                        disabled={group.cardIds.length > 0}
                        onClick={() => {
                          setGroups((prev) => prev.filter((item) => item.id !== group.id))
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
                      >
                        刪除空組
                      </button>
                    </div>

                    <div className="mb-2 text-sm text-gray-500">第 {groupIndex + 1} 組</div>

                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const payloadRaw = e.dataTransfer.getData('application/json')
                        if (!payloadRaw) return
                        handleDropOnGroup(group.id, JSON.parse(payloadRaw) as DragPayload)
                      }}
                      className="mb-3 min-h-[120px] rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-3"
                    >
                      {group.cardIds.length === 0 ? (
                        <div className="text-lg font-bold text-gray-500">拖曳卡片到這一組</div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {group.cardIds.map((cardId) => {
                            const card = getCardById(cardId)
                            if (!card) return null
                            return (
                              <div
                                key={card.id}
                                draggable
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
                                className="cursor-move rounded-xl border border-gray-300 bg-white p-2"
                              >
                                <div className="mb-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2">
                                  <img
                                    src={card.imageUrl}
                                    alt={card.name}
                                    className="h-24 w-full object-contain"
                                  />
                                </div>
                                <div className="text-sm font-semibold text-gray-500">{card.id}</div>
                                <div className="font-bold">{card.name}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mb-2 text-sm font-semibold text-gray-700">這組的分類理由</div>
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
                      placeholder="請說明你為什麼把這些生物分在一起"
                      className="min-h-[96px] w-full rounded-xl border border-gray-300 px-3 py-2"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-gray-300 p-4">
                <div className="mb-2 text-lg font-black">整體分類理由</div>
                <textarea
                  value={overallReason}
                  onChange={(e) => setOverallReason(e.target.value)}
                  placeholder="請說明你整體分類時最常用的依據"
                  className="min-h-[120px] w-full rounded-xl border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStage('awareness')}
                  className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  進入階段 2
                </button>
              </div>
            </aside>
          </section>
        )}

        {stage === 'awareness' && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-3xl font-black">第 2 階段：特徵覺察</h2>
              <div className="rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                這一階段先不急著判門別，先回看你剛剛分類時最常用哪些線索，並分辨哪些線索比較適合拿來分門。
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-2xl font-black">任務 A：回看自己的分類依據</h3>
              <div className="space-y-5">
                {bridgeReflectQuestions.map((question) => {
                  const selected = bridgeReflectAnswers[question.id] ?? []
                  return (
                    <div key={question.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="mb-3 font-bold">{question.prompt}</div>
                      <div className="grid gap-2 md:grid-cols-2">
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

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-2xl font-black">任務 B：判斷線索品質</h3>
              <div className="mb-4 text-sm text-gray-600">
                請判斷下面哪些線索比較適合幫助分門，哪些只是可能有幫助，但不能單獨決定。
              </div>
              <div className="space-y-3">
                {bridgeFeatureChoices.map((choice) => (
                  <div
                    key={choice.id}
                    className="grid items-center gap-3 rounded-xl border border-gray-200 p-3 md:grid-cols-[1fr_auto]"
                  >
                    <div className="font-medium">{choice.text}</div>
                    <select
                      value={featureClassification[choice.id] ?? ''}
                      onChange={(e) =>
                        setFeatureClassification((prev) => ({
                          ...prev,
                          [choice.id]: e.target.value as 'diagnostic' | 'possible_but_unstable' | '',
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">請選擇</option>
                      <option value="diagnostic">比較適合幫助分門</option>
                      <option value="possible_but_unstable">可能有幫助，但不能單獨決定</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStage('stage1')}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold"
              >
                回到階段 1
              </button>
              <button
                type="button"
                onClick={() => setStage('build')}
                className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
              >
                進入階段 3
              </button>
            </div>
          </section>
        )}

        {stage === 'build' && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-3xl font-black">第 3 階段：規則建構</h2>
              <div className="rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                這一階段先建立自己的簡化檢索表，再用系統檢索表作對照。這裡是鷹架，不是正式測驗。
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="mb-4 text-2xl font-black">A. 拖曳建立你的簡化檢索表</h3>
                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  做法：把你覺得重要的特徵拖到下面四個判斷節點。每一個節點代表：
                  「如果答案是『是』，就先判成那一門；如果不是，再往下看。」
                </div>

                <div className="mb-5 grid gap-2 md:grid-cols-2">
                  {bridgeFeatureChoices.map((feature) => {
                    const used = usedStudentKeyFeatureIds.includes(feature.id)
                    return (
                      <div
                        key={feature.id}
                        draggable={!used}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', feature.id)
                        }}
                        className={`rounded-xl border p-3 text-sm ${
                          used
                            ? 'border-gray-200 bg-gray-100 text-gray-400'
                            : 'cursor-move border-gray-300 bg-white text-gray-800'
                        }`}
                      >
                        <div className="font-semibold">{feature.text}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {feature.category === 'diagnostic'
                            ? '偏診斷性特徵'
                            : '可能有幫助，但不一定能單獨決定'}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-3">
                  {KEY_SLOT_TARGETS.map((slot, index) => {
                    const featureId = studentKeySlots[index]
                    const feature = featureId ? getFeatureById(featureId) : null
                    return (
                      <div
                        key={slot.id}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault()
                          const featureDropId = e.dataTransfer.getData('text/plain')
                          if (!featureDropId) return
                          handleDropFeatureToSlot(index, featureDropId)
                        }}
                        className="rounded-2xl border border-gray-300 p-4"
                      >
                        <div className="mb-1 text-sm font-semibold text-gray-500">{slot.label}</div>
                        <div className="mb-3 text-lg font-black">如果答案是「是」→ {slot.result}</div>
                        <div className="min-h-[72px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-3">
                          {feature ? (
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white p-3">
                              <div>
                                <div className="font-semibold">{feature.text}</div>
                                <div className="mt-1 text-xs text-gray-500">
                                  {feature.category === 'diagnostic'
                                    ? '偏診斷性特徵'
                                    : '可能有幫助，但不一定能單獨決定'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setStudentKeySlots((prev) => {
                                    const next = [...prev]
                                    next[index] = null
                                    return next
                                  })
                                }
                                className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                              >
                                移除
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">
                              把一個特徵拖到這裡
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStudentKeySlots([null, null, null, null])}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold"
                  >
                    清空檢索表
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="mb-4 text-2xl font-black">B. 系統簡化檢索表（參考）</h3>
                  <div className="space-y-3">
                    {dichotomousKeyV1
                      .filter((node) => node.question)
                      .map((node, index) => (
                        <div key={node.id} className="rounded-xl border border-gray-200 p-3">
                          <div className="text-sm font-semibold text-gray-500">步驟 {index + 1}</div>
                          <div className="font-semibold">{node.question}</div>
                          {node.hint ? (
                            <div className="mt-2 text-sm text-gray-600">提示：{node.hint}</div>
                          ) : null}
                        </div>
                      ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="mb-4 text-2xl font-black">C. 測試你的檢索表</h3>

                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    選一張卡來測試
                  </label>
                  <select
                    value={selectedTestCardId}
                    onChange={(e) => setSelectedTestCardId(e.target.value)}
                    className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {stage1Cards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.id} {card.name}
                      </option>
                    ))}
                  </select>

                  <div className="mb-4 rounded-xl border border-gray-200 p-3">
                    <div className="mb-2 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-2">
                      <img
                        src={getCardById(selectedTestCardId)?.imageUrl}
                        alt={getCardById(selectedTestCardId)?.name}
                        className="h-36 w-full object-contain"
                      />
                    </div>
                    <div className="text-sm font-semibold text-gray-500">
                      {getCardById(selectedTestCardId)?.id}
                    </div>
                    <div className="font-bold">{getCardById(selectedTestCardId)?.name}</div>
                    <div className="mt-3 text-sm font-semibold text-gray-700">
                      這張卡的關鍵特徵
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                      {getCardById(selectedTestCardId)?.diagnosticFeatures.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <div className="mt-3 rounded-lg bg-yellow-50 p-2 text-sm text-yellow-800">
                      提醒：{getCardById(selectedTestCardId)?.warning}
                    </div>
                  </div>

                  <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="text-sm font-semibold text-green-700">你的檢索表判定結果</div>
                    <div className="mt-1 text-2xl font-black text-green-900">
                      {studentKeyTestResult}
                    </div>
                    <div className="mt-2 text-sm text-green-800">
                      正確門別：{getCardById(selectedTestCardId)?.phylum}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="mb-4 text-2xl font-black">D. 觀察卡參考</h3>
                  <div className="space-y-3">
                    {stage1Cards.map((card) => {
                      const expanded = expandedCardId === card.id
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setExpandedCardId(expanded ? '' : card.id)}
                          className="w-full rounded-xl border border-gray-200 p-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              className="h-16 w-16 rounded-lg border border-gray-200 object-contain"
                            />
                            <div>
                              <div className="text-sm font-semibold text-gray-500">{card.id}</div>
                              <div className="font-bold">{card.name}</div>
                            </div>
                          </div>
                          {expanded ? (
                            <div className="mt-3 space-y-2 text-sm text-gray-700">
                              <div className="font-semibold">關鍵特徵</div>
                              <ul className="list-disc pl-5">
                                {card.diagnosticFeatures.map((feature) => (
                                  <li key={feature}>{feature}</li>
                                ))}
                              </ul>
                              <div className="rounded-lg bg-yellow-50 p-2 text-yellow-800">
                                提醒：{card.warning}
                              </div>
                            </div>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStage('awareness')}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold"
              >
                回到階段 2
              </button>
              <button
                type="button"
                onClick={() => setStage('evidence')}
                className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
              >
                進入階段 4
              </button>
            </div>
          </section>
        )}

        {stage === 'evidence' && currentEvidence && (
          <section className="space-y-6">
            <QuestionCard
              title={`第 4 階段：門別判定（${evidenceIndex + 1} / ${evidenceQuestions.length}）`}
              prompt={currentEvidence.prompt}
              stimulusText={currentEvidence.stimulusText}
              imageUrl={currentEvidence.imageUrl}
            />

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 text-lg font-black">請選擇門別</div>
              <div className="grid gap-2 md:grid-cols-2">
                {currentEvidence.options.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 p-3"
                  >
                    <input
                      type="radio"
                      name={`evidence-${currentEvidence.id}`}
                      checked={evidenceAnswer === option}
                      onChange={() => setEvidenceAnswer(option as PhylumOption)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>

              <div className="mt-5 mb-3 text-lg font-black">你最主要依據哪些特徵？（可複選）</div>
              <FeatureCheckboxes
                selected={evidenceSelectedFeatures}
                onChange={setEvidenceSelectedFeatures}
              />

              <div className="mt-5 mb-2 text-lg font-black">簡短說明理由</div>
              <textarea
                value={evidenceReasonText}
                onChange={(e) => setEvidenceReasonText(e.target.value)}
                className="min-h-[110px] w-full rounded-xl border border-gray-300 px-3 py-2"
                placeholder="請簡短寫出你為什麼這樣判斷"
              />

              <div className="mt-5 mb-2 text-lg font-black">信心程度</div>
              <input
                type="range"
                min={1}
                max={4}
                value={evidenceConfidence}
                onChange={(e) => setEvidenceConfidence(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 text-sm text-gray-600">目前信心：{evidenceConfidence} / 4</div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStage('build')}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold"
                >
                  回到階段 3
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!evidenceAnswer) {
                      alert('請先選擇一個門別。')
                      return
                    }

                    setEvidenceResponses((prev) => [
                      ...prev,
                      {
                        questionId: currentEvidence.id,
                        answer: evidenceAnswer,
                        selectedFeatures: evidenceSelectedFeatures,
                        reasonText: evidenceReasonText,
                        confidence: evidenceConfidence,
                      },
                    ])

                    if (evidenceIndex < evidenceQuestions.length - 1) {
                      setEvidenceIndex((prev) => prev + 1)
                      resetEvidenceForm()
                    } else {
                      resetEvidenceForm()
                      setStage('compare')
                    }
                  }}
                  className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  {evidenceIndex < evidenceQuestions.length - 1 ? '下一題' : '進入階段 5'}
                </button>
              </div>
            </div>
          </section>
        )}

        {stage === 'compare' && currentCompare && (
          <section className="space-y-6">
            <QuestionCard
              title={`第 5 階段：對比修正（${compareIndex + 1} / ${compareQuestions.length}）`}
              prompt={currentCompare.prompt}
              stimulusText={currentCompare.stimulusText}
              imageUrl={currentCompare.imageUrl}
            />

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                比較焦點：{currentCompare.compareFocus}
              </div>

              {compareMode === 'first' && (
                <>
                  <div className="mb-3 text-lg font-black">第一次作答</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {currentCompare.options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 p-3"
                      >
                        <input
                          type="radio"
                          name={`compare-first-${currentCompare.id}`}
                          checked={compareFirstAnswer === option}
                          onChange={() => setCompareFirstAnswer(option as PhylumOption)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 mb-3 text-lg font-black">第一次作答時依據哪些特徵？</div>
                  <FeatureCheckboxes
                    selected={compareFirstSelectedFeatures}
                    onChange={setCompareFirstSelectedFeatures}
                  />

                  <div className="mt-5 mb-2 text-lg font-black">第一次理由</div>
                  <textarea
                    value={compareFirstReasonText}
                    onChange={(e) => setCompareFirstReasonText(e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-gray-300 px-3 py-2"
                    placeholder="請簡短寫出你第一次的理由"
                  />

                  <div className="mt-5 mb-2 text-lg font-black">第一次信心程度</div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={compareFirstConfidence}
                    onChange={(e) => setCompareFirstConfidence(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 text-sm text-gray-600">
                    目前信心：{compareFirstConfidence} / 4
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!compareFirstAnswer) {
                          alert('請先完成第一次作答。')
                          return
                        }
                        setCompareFeedback(
  getCompareFeedback(currentCompare, compareFirstAnswer as PhylumOption)
)
                        setCompareMode('feedback')
                        setCompareFinalAnswer(compareFirstAnswer)
                        setCompareFinalSelectedFeatures(compareFirstSelectedFeatures)
                        setCompareFinalReasonText(compareFirstReasonText)
                        setCompareFinalConfidence(compareFirstConfidence)
                      }}
                      className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                    >
                      看回饋
                    </button>
                  </div>
                </>
              )}

              {compareMode === 'feedback' && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <div className="mb-2 text-lg font-black text-blue-900">回饋</div>
                  <div className="text-sm leading-6 text-blue-900">{compareFeedback}</div>

                  <div className="mt-6 mb-3 text-lg font-black text-gray-900">改答</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {currentCompare.options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <input
                          type="radio"
                          name={`compare-final-${currentCompare.id}`}
                          checked={compareFinalAnswer === option}
                          onChange={() => setCompareFinalAnswer(option as PhylumOption)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-5 mb-3 text-lg font-black text-gray-900">改答後依據哪些特徵？</div>
                  <FeatureCheckboxes
                    selected={compareFinalSelectedFeatures}
                    onChange={setCompareFinalSelectedFeatures}
                  />

                  <div className="mt-5 mb-2 text-lg font-black text-gray-900">改答後理由</div>
                  <textarea
                    value={compareFinalReasonText}
                    onChange={(e) => setCompareFinalReasonText(e.target.value)}
                    className="min-h-[110px] w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="請寫出你改答後的理由"
                  />

                  <div className="mt-5 mb-2 text-lg font-black text-gray-900">改答後信心程度</div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={compareFinalConfidence}
                    onChange={(e) => setCompareFinalConfidence(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-1 text-sm text-gray-600">
                    目前信心：{compareFinalConfidence} / 4
                  </div>

                  <div className="mt-6 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setCompareMode('first')}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold"
                    >
                      回看第一次作答
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!compareFirstAnswer || !compareFinalAnswer) {
                          alert('請完成改答。')
                          return
                        }

                        setCompareResponses((prev) => [
                          ...prev,
                          {
                            questionId: currentCompare.id,
                            firstAnswer: compareFirstAnswer,
                            firstSelectedFeatures: compareFirstSelectedFeatures,
                            firstReasonText: compareFirstReasonText,
                            firstConfidence: compareFirstConfidence,
                            finalAnswer: compareFinalAnswer,
                            finalSelectedFeatures: compareFinalSelectedFeatures,
                            finalReasonText: compareFinalReasonText,
                            finalConfidence: compareFinalConfidence,
                          },
                        ])

                        if (compareIndex < compareQuestions.length - 1) {
                          setCompareIndex((prev) => prev + 1)
                          resetCompareForm()
                        } else {
                          resetCompareForm()
                          setStage('transfer')
                        }
                      }}
                      className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                    >
                      {compareIndex < compareQuestions.length - 1 ? '下一題' : '進入階段 6'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {stage === 'transfer' && currentTransfer && (
          <section className="space-y-6">
            <QuestionCard
              title={`第 6 階段：遷移檢驗（${transferIndex + 1} / ${transferQuestions.length}）`}
              prompt={currentTransfer.prompt}
              stimulusText={currentTransfer.stimulusText}
              imageUrl={currentTransfer.imageUrl}
            />

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 text-lg font-black">請選擇門別</div>
              <div className="grid gap-2 md:grid-cols-2">
                {currentTransfer.options.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 p-3"
                  >
                    <input
                      type="radio"
                      name={`transfer-${currentTransfer.id}`}
                      checked={transferAnswer === option}
                      onChange={() => setTransferAnswer(option as PhylumOption)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>

              <div className="mt-5 mb-3 text-lg font-black">你最主要依據哪些特徵？（可複選）</div>
              <FeatureCheckboxes
                selected={transferSelectedFeatures}
                onChange={setTransferSelectedFeatures}
              />

              <div className="mt-5 mb-2 text-lg font-black">簡短說明理由</div>
              <textarea
                value={transferReasonText}
                onChange={(e) => setTransferReasonText(e.target.value)}
                className="min-h-[110px] w-full rounded-xl border border-gray-300 px-3 py-2"
                placeholder="請簡短寫出你為什麼這樣判斷"
              />

              <div className="mt-5 mb-2 text-lg font-black">信心程度</div>
              <input
                type="range"
                min={1}
                max={4}
                value={transferConfidence}
                onChange={(e) => setTransferConfidence(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 text-sm text-gray-600">目前信心：{transferConfidence} / 4</div>

              <div className="mt-6 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStage('compare')}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold"
                >
                  回到階段 5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!transferAnswer) {
                      alert('請先選擇一個門別。')
                      return
                    }

                    setTransferResponses((prev) => [
                      ...prev,
                      {
                        questionId: currentTransfer.id,
                        answer: transferAnswer,
                        selectedFeatures: transferSelectedFeatures,
                        reasonText: transferReasonText,
                        confidence: transferConfidence,
                      },
                    ])

                    if (transferIndex < transferQuestions.length - 1) {
                      setTransferIndex((prev) => prev + 1)
                      resetTransferForm()
                    } else {
                      resetTransferForm()
                      setStage('done')
                    }
                  }}
                  className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
                >
                  {transferIndex < transferQuestions.length - 1 ? '下一題' : '完成'}
                </button>
              </div>
            </div>
          </section>
        )}

        {stage === 'done' && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-3xl font-black">完成</h2>
              <div className="rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-900">
                六階段流程已完成。下面直接輸出目前前端蒐集到的資料，方便你檢查結構。
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-2xl font-black">資料預覽</div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2))
                  }}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"
                >
                  複製 JSON
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-gray-50 p-4 text-xs leading-6 text-gray-800">
                {JSON.stringify(exportPayload, null, 2)}
              </pre>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStage('transfer')}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold"
              >
                回到階段 6
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white"
              >
                重新開始
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}