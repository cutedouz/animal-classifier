'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  stage1Cards,
  bridgeReflectQuestions,
  bridgeFeatureChoices,
  evidenceQuestions,
  type PhylumOption,
} from '../lib/questions'

type AppStage = 'stage1' | 'awareness' | 'evidence' | 'done'

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

type FeatureClassificationValue = 'diagnostic' | 'possible_but_unstable' | ''

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

const INITIAL_GROUPS: StageGroup[] = [
  { id: 'G1', name: '群組 1', reason: '', cardIds: [] },
  { id: 'G2', name: '群組 2', reason: '', cardIds: [] },
  { id: 'G3', name: '群組 3', reason: '', cardIds: [] },
]

const STAGE_ITEMS: { key: AppStage; label: string }[] = [
  { key: 'stage1', label: '自由預分類' },
  { key: 'awareness', label: '特徵覺察' },
  { key: 'evidence', label: '門別判定' },
  { key: 'done', label: '完成與資料預覽' },
]

function getCardName(cardId: string) {
  return stage1Cards.find((card) => card.id === cardId)?.name ?? cardId
}

function getCardById(cardId: string) {
  return stage1Cards.find((card) => card.id === cardId)
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
    <div className="mb-2 rounded-2xl border border-gray-200 bg-white px-2 py-2">
      <div className="flex flex-wrap gap-1.5">
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
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold md:text-sm ${
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
  )
}

function FeatureCheckboxes({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const featureOptions = bridgeFeatureChoices.map((feature) => feature.text)

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {featureOptions.map((feature) => {
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

function SummaryBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-xl font-black text-gray-900">{title}</h3>
      <div className="text-sm leading-6 text-gray-700">{children}</div>
    </div>
  )
}

export default function Page() {
  const [stage, setStage] = useState<AppStage>('stage1')
  const [enterSession, setEnterSession] = useState<EnterSession | null>(null)

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

  // stage 1
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

  const [groups, setGroups] = useState<StageGroup[]>(INITIAL_GROUPS)
  const [bankCardIds, setBankCardIds] = useState<string[]>(stage1Cards.map((card) => card.id))
  const [overallReason, setOverallReason] = useState('')
  const [groupCreateCount, setGroupCreateCount] = useState(3)
  const [cardMoveCount, setCardMoveCount] = useState(0)

  // stage 2
  const [bridgeReflectAnswers, setBridgeReflectAnswers] = useState<Record<string, string[]>>({})
  const [featureClassification, setFeatureClassification] = useState<
    Record<string, FeatureClassificationValue>
  >({})
  const [customFeatureText, setCustomFeatureText] = useState('')

  // stage 3
  const [evidenceIndex, setEvidenceIndex] = useState(0)
  const [evidenceAnswer, setEvidenceAnswer] = useState<PhylumOption | ''>('')
  const [evidenceSelectedFeatures, setEvidenceSelectedFeatures] = useState<string[]>([])
  const [evidenceReasonText, setEvidenceReasonText] = useState('')
  const [evidenceConfidence, setEvidenceConfidence] = useState(2)
  const [evidenceResponses, setEvidenceResponses] = useState<EvidenceResponse[]>([])

  const currentEvidence = evidenceQuestions[evidenceIndex]

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

  const awarenessComplete =
    bridgeReflectQuestions.every((question) => (bridgeReflectAnswers[question.id] ?? []).length > 0) &&
    bridgeFeatureChoices.every((choice) => (featureClassification[choice.id] ?? '') !== '')

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

  const diagnosticCount = useMemo(
    () =>
      Object.values(featureClassification).filter((value) => value === 'diagnostic').length,
    [featureClassification]
  )

  const possibleCount = useMemo(
    () =>
      Object.values(featureClassification).filter(
        (value) => value === 'possible_but_unstable'
      ).length,
    [featureClassification]
  )

  const stage1SummaryLines = useMemo(
    () =>
      nonEmptyGroups.map((group) => {
        const names = group.cardIds.map((cardId) => getCardName(cardId)).join('、')
        return `${group.name}：${names}`
      }),
    [nonEmptyGroups]
  )

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

    const nextResponse: EvidenceResponse = {
      questionId: currentEvidence.id,
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
      version: 'v2-four-stage-12-animals-two-column',
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
        customFeatureText,
      },
      evidenceResponses,
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
      featureClassification,
      customFeatureText,
      evidenceResponses,
    ]
  )

  return (
    <main className="h-screen overflow-hidden bg-gray-50 px-4 py-3 md:px-6">
      <div className="mx-auto flex h-full max-w-7xl flex-col">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
              Sci-Flipper 動物分類學習網站
            </h1>
            <div className="mt-1 text-sm text-gray-600">
              目前學生：
              {enterSession
                ? `${enterSession.maskedName ?? '未顯示姓名'}｜${enterSession.grade} 年級 ${enterSession.className} 班 ${enterSession.seatNo} 號`
                : '尚未讀到進入資訊'}
            </div>
          </div>
        </div>

        <StepHeader stage={stage} setStage={setStage} maxUnlockedIndex={maxUnlockedIndex} />

        <div className="min-h-0 flex-1">
          {stage === 'stage1' && (
            <section className="grid h-full min-h-0 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 md:text-3xl">
                      第 1 階段：自由預分類
                    </h2>
                    <div className="mt-1 text-xs leading-5 text-gray-600 md:text-sm">
                      請先自由分群，依你目前覺得合理的方式分類，不先看標準答案。
                    </div>
                  </div>

                  <div className="grid gap-0.5 text-right text-sm text-gray-700">
                    <div>群組數：{groups.length}</div>
                    <div>未分類：{bankCardIds.length}</div>
                    <div>已分組：{groupedCardCount}</div>
                  </div>
                </div>

                <div className="mb-2 text-xl font-black text-gray-900">待分類生物卡</div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const payloadRaw = e.dataTransfer.getData('application/json')
                    if (!payloadRaw) return
                    handleDropOnBank(JSON.parse(payloadRaw) as DragPayload)
                  }}
                  className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-gray-200 p-3"
                >
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-6">
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
                          className="cursor-move rounded-xl border border-gray-300 bg-white p-2 transition hover:shadow-sm"
                        >
                          <div className="mb-2 aspect-square w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
                            <img
                              src={card.imageUrl}
                              alt={card.name}
                              className="h-full w-full object-contain"
                              draggable={false}
                            />
                          </div>
                          <div className="text-center text-xs font-bold leading-tight text-gray-900 md:text-sm">
                            {card.name}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black text-gray-900">你的群組</h2>
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
                    className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {groups.length >= 8 ? '已達上限' : '新增群組'}
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-2">
                    {groups.map((group, groupIndex) => (
                      <div
                        id={group.id}
                        key={group.id}
                        className="rounded-2xl border border-gray-300 p-2"
                      >
                        <div className="mb-2 flex items-center gap-2">
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
                            className="rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-700 disabled:opacity-40"
                          >
                            刪除
                          </button>
                        </div>

                        <div className="mb-1 text-xs text-gray-700">第 {groupIndex + 1} 組</div>

                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            const payloadRaw = e.dataTransfer.getData('application/json')
                            if (!payloadRaw) return
                            handleDropOnGroup(group.id, JSON.parse(payloadRaw) as DragPayload)
                          }}
                          className="mb-2 min-h-[70px] rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-2"
                        >
                          {group.cardIds.length === 0 ? (
                            <div className="flex min-h-[46px] items-center justify-center text-xs font-bold text-gray-700">
                              拖曳卡片到這一組
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
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
                                    className="cursor-move rounded-lg border border-gray-300 bg-white p-1.5"
                                  >
                                    <div className="mb-1 aspect-square w-full overflow-hidden rounded-md border border-gray-200 bg-white p-1">
                                      <img
                                        src={card.imageUrl}
                                        alt={card.name}
                                        className="h-full w-full object-contain"
                                        draggable={false}
                                      />
                                    </div>
                                    <div className="break-words text-center text-[10px] font-bold leading-tight text-gray-900">
                                      {card.name}
                                    </div>
                                  </div>
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
                          className="min-h-[48px] w-full rounded-xl border border-gray-300 px-2 py-2 text-xs leading-5 text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 text-sm font-semibold text-gray-700">整體分類想法</div>
                  <textarea
                    value={overallReason}
                    onChange={(e) => setOverallReason(e.target.value)}
                    placeholder="請用一句話說明你這次分類的主要思路"
                    className="min-h-[56px] w-full rounded-xl border border-gray-300 px-3 py-2 text-sm leading-5 text-gray-900"
                  />
                </div>

                <div className="mt-3 rounded-xl bg-gray-50 p-2 text-xs leading-5 text-gray-700">
                  <div>進入下一階段前，請確認：</div>
                  <ul className="mt-1 list-disc pl-5">
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

                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!stage1Complete}
                      onClick={() => setStage('awareness')}
                      className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      進入階段 2
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {stage === 'awareness' && (
            <section className="h-full overflow-y-auto space-y-4 pr-1">
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
                            [choice.id]: e.target.value as FeatureClassificationValue,
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

                <div className="mt-5">
                  <div className="mb-2 text-sm font-semibold text-gray-700">
                    其他想補充的特徵（可選）
                  </div>
                  <input
                    value={customFeatureText}
                    onChange={(e) => setCustomFeatureText(e.target.value)}
                    placeholder="例如：有沒有眼睛、是否有明顯頭部等"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
                  />
                </div>

                <div className="mt-5 rounded-xl bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                  目前已標記：
                  <span className="ml-2 font-semibold">診斷性特徵 {diagnosticCount}</span>
                  <span className="ml-4 font-semibold">可能有幫助但不穩定 {possibleCount}</span>
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
                  disabled={!awarenessComplete}
                  onClick={() => {
                    setStage('evidence')
                    openEvidenceQuestion(0)
                  }}
                  className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  進入階段 3
                </button>
              </div>
            </section>
          )}

          {stage === 'evidence' && currentEvidence && (
            <section className="h-full overflow-y-auto space-y-4 pr-1">
              <SummaryBlock title="前面兩階段摘要">
                <div className="space-y-2">
                  <div>已形成 {nonEmptyGroups.length} 個非空群組。</div>
                  <div>診斷性特徵：{diagnosticCount} 項。</div>
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

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="mb-3 text-lg font-black">請選擇門別</div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
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

                <div className="mb-3 mt-5 text-lg font-black">
                  你最主要依據哪些特徵？（可複選）
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
                  目前已完成 {evidenceResponses.length} / {evidenceQuestions.length} 題。
                </div>

                <div className="mt-6 flex justify-between gap-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStage('awareness')}
                      className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold"
                    >
                      回到階段 2
                    </button>
                    <button
                      type="button"
                      disabled={evidenceIndex === 0}
                      onClick={() => openEvidenceQuestion(evidenceIndex - 1)}
                      className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {evidenceIndex < evidenceQuestions.length - 1 ? '儲存並下一題' : '完成並查看資料'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {stage === 'done' && (
            <section className="h-full overflow-y-auto space-y-4 pr-1">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h2 className="mb-3 text-3xl font-black">第 4 階段：完成與資料預覽</h2>
                <div className="rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-900">
                  四階段流程已完成。下面直接輸出目前前端蒐集到的資料，方便檢查結構與後續串接。
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <SummaryBlock title="階段 1 結果">
                  <div>非空群組：{nonEmptyGroups.length}</div>
                  <div>全部卡片都已分類：{bankCardIds.length === 0 ? '是' : '否'}</div>
                  <div className="mt-2">整體分類想法：{overallReason}</div>
                </SummaryBlock>

                <SummaryBlock title="階段 2 結果">
                  <div>診斷性特徵：{diagnosticCount} 項</div>
                  <div>可能有幫助但不穩定：{possibleCount} 項</div>
                  <div className="mt-2">
                    自訂補充特徵：{customFeatureText.trim() ? customFeatureText : '未填'}
                  </div>
                </SummaryBlock>

                <SummaryBlock title="階段 3 結果">
                  <div>
                    已完成門別判定：{evidenceResponses.length} / {evidenceQuestions.length}
                  </div>
                </SummaryBlock>
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
                  onClick={() => {
                    const targetIndex =
                      evidenceResponses.length > 0 ? evidenceResponses.length - 1 : 0
                    openEvidenceQuestion(targetIndex)
                    setStage('evidence')
                  }}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold"
                >
                  回到階段 3
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
      </div>
    </main>
  )
}