'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { supabase } from '@/lib/supabase'
import { evidenceQuestions, compareQuestions, transferQuestions } from '@/lib/questions'
import { inferMisconception } from '@/lib/misconception'
import { preclassifyCards } from '@/lib/preclassify'

type AppPhase =
  | 'start'
  | 'preclassify'
  | 'evidence'
  | 'compare'
  | 'transfer'
  | 'complete'

type CompareStep = 'first_answer' | 'feedback' | 'final_answer'

type PreclassifyGroup = {
  id: string
  groupName: string
  reason: string
  cardIds: string[]
}

type DragContainerId = 'ungrouped' | string

const UNGROUPED_ID = 'ungrouped'

function makeGroupId() {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeEmptyGroup(index: number): PreclassifyGroup {
  return {
    id: makeGroupId(),
    groupName: `群組 ${index + 1}`,
    reason: '',
    cardIds: [],
  }
}

function DraggableAnimalCard({
  id,
  name,
  imageUrl,
}: {
  id: string
  name: string
  imageUrl: string
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        touchAction: 'none' as const,
      }
    : { touchAction: 'none' as const }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-lg border bg-white p-2 shadow-sm ${
        isDragging ? 'opacity-60' : ''
      }`}
    >
      <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded bg-gray-100">
        <Image src={imageUrl} alt={name} fill className="object-cover" />
      </div>
      <p className="text-sm font-semibold">{id}</p>
      <p className="text-sm">{name}</p>
    </div>
  )
}

function DropContainer({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-4 ${
        isOver ? 'border-black bg-gray-50' : 'border-gray-300 bg-white'
      }`}
    >
      <h3 className="mb-3 font-medium">{title}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  )
}

export default function Home() {
  const [participantCode, setParticipantCode] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [phase, setPhase] = useState<AppPhase>('start')
  const [status, setStatus] = useState('')

  const [preclassifyGroups, setPreclassifyGroups] = useState<PreclassifyGroup[]>([
    makeEmptyGroup(0),
    makeEmptyGroup(1),
  ])
  const [ungroupedCardIds, setUngroupedCardIds] = useState<string[]>(
    preclassifyCards.map((card) => card.id)
  )
  const [preclassifyOverallReason, setPreclassifyOverallReason] = useState('')
  const [preclassifyEditCount, setPreclassifyEditCount] = useState(0)
  const [groupCreateCount, setGroupCreateCount] = useState(2)
  const [cardMoveCount, setCardMoveCount] = useState(0)

  const [evidenceIndex, setEvidenceIndex] = useState(0)
  const [compareIndex, setCompareIndex] = useState(0)
  const [transferIndex, setTransferIndex] = useState(0)
  const [compareStep, setCompareStep] = useState<CompareStep>('first_answer')

  const [answer, setAnswer] = useState('')
  const [reason, setReason] = useState('')
  const [confidence, setConfidence] = useState('3')
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null)

  const [firstAnswer, setFirstAnswer] = useState('')
  const [firstReason, setFirstReason] = useState('')
  const [firstMisconceptionCode, setFirstMisconceptionCode] = useState<string | null>(null)
  const [feedbackVariant, setFeedbackVariant] = useState('')
  const [feedbackText, setFeedbackText] = useState('')

  const currentEvidenceQuestion = evidenceQuestions[evidenceIndex]
  const currentCompareQuestion = compareQuestions[compareIndex]
  const currentTransferQuestion = transferQuestions[transferIndex]

  const cardMap = useMemo(
    () => Object.fromEntries(preclassifyCards.map((card) => [card.id, card])),
    []
  )

  function addPreclassifyGroup() {
    setPreclassifyGroups((prev) => [...prev, makeEmptyGroup(prev.length)])
    setGroupCreateCount((prev) => prev + 1)
    setPreclassifyEditCount((prev) => prev + 1)
  }

  function updatePreclassifyGroupName(groupId: string, value: string) {
    setPreclassifyGroups((prev) =>
      prev.map((group) =>
        group.id === groupId ? { ...group, groupName: value } : group
      )
    )
    setPreclassifyEditCount((prev) => prev + 1)
  }

  function updatePreclassifyGroupReason(groupId: string, value: string) {
    setPreclassifyGroups((prev) =>
      prev.map((group) =>
        group.id === groupId ? { ...group, reason: value } : group
      )
    )
    setPreclassifyEditCount((prev) => prev + 1)
  }

  function deleteEmptyGroup(groupId: string) {
    setPreclassifyGroups((prev) => {
      const target = prev.find((g) => g.id === groupId)
      if (!target) return prev
      if (target.cardIds.length > 0) return prev
      return prev.filter((g) => g.id !== groupId)
    })
    setPreclassifyEditCount((prev) => prev + 1)
  }

  function findContainerOfCard(cardId: string): DragContainerId | null {
    if (ungroupedCardIds.includes(cardId)) return UNGROUPED_ID
    const group = preclassifyGroups.find((g) => g.cardIds.includes(cardId))
    return group ? group.id : null
  }

  function moveCard(cardId: string, toContainerId: DragContainerId) {
    const fromContainerId = findContainerOfCard(cardId)
    if (!fromContainerId || fromContainerId === toContainerId) return

    if (fromContainerId === UNGROUPED_ID) {
      setUngroupedCardIds((prev) => prev.filter((id) => id !== cardId))
    } else {
      setPreclassifyGroups((prev) =>
        prev.map((group) =>
          group.id === fromContainerId
            ? { ...group, cardIds: group.cardIds.filter((id) => id !== cardId) }
            : group
        )
      )
    }

    if (toContainerId === UNGROUPED_ID) {
      setUngroupedCardIds((prev) => [...prev, cardId])
    } else {
      setPreclassifyGroups((prev) =>
        prev.map((group) =>
          group.id === toContainerId
            ? { ...group, cardIds: [...group.cardIds, cardId] }
            : group
        )
      )
    }

    setCardMoveCount((prev) => prev + 1)
    setPreclassifyEditCount((prev) => prev + 1)
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId) return

    const isGroup = preclassifyGroups.some((g) => g.id === overId)
    const targetContainerId: DragContainerId =
      overId === UNGROUPED_ID
        ? UNGROUPED_ID
        : isGroup
          ? overId
          : findContainerOfCard(overId) ?? UNGROUPED_ID

    moveCard(activeId, targetContainerId)
  }

  async function handleStart() {
    if (!participantCode.trim()) {
      setStatus('請先輸入 participant code')
      return
    }

    setStatus('starting...')

    const { data: session, error } = await supabase
      .from('sessions')
      .insert([{ participant_code: participantCode.trim() }])
      .select()
      .single()

    if (error) {
      setStatus('session error: ' + error.message)
      return
    }

    setSessionId(session.id)
    setPhase('preclassify')
    setStatus('')
  }

  async function handlePreclassifySubmit() {
    if (!sessionId) {
      setStatus('session 尚未建立')
      return
    }

    if (ungroupedCardIds.length > 0) {
      setStatus('還有生物卡尚未分群')
      return
    }

    if (!preclassifyOverallReason.trim()) {
      setStatus('請先填寫整體分類理由')
      return
    }

    for (let i = 0; i < preclassifyGroups.length; i += 1) {
      const group = preclassifyGroups[i]
      if (!group.groupName.trim()) {
        setStatus(`第 ${i + 1} 組尚未填寫群組名稱`)
        return
      }
      if (group.cardIds.length === 0) {
        setStatus(`第 ${i + 1} 組目前沒有生物卡`)
        return
      }
      if (!group.reason.trim()) {
        setStatus(`第 ${i + 1} 組尚未填寫分類理由`)
        return
      }
    }

    setStatus('saving preclassify...')

    const { error: summaryError } = await supabase.from('preclassify_summary').insert([
      {
        session_id: sessionId,
        group_count: preclassifyGroups.length,
        edit_count: preclassifyEditCount,
        overall_reason: preclassifyOverallReason.trim(),
      },
    ])

    if (summaryError) {
      setStatus('preclassify summary error: ' + summaryError.message)
      return
    }

    const groupRows = preclassifyGroups.map((group, index) => ({
      session_id: sessionId,
      group_no: index + 1,
      group_name: group.groupName.trim(),
      items_text: group.cardIds.join(', '),
      reason: group.reason.trim(),
    }))

    const { error: groupsError } = await supabase
      .from('preclassify_groups')
      .insert(groupRows)

    if (groupsError) {
      setStatus('preclassify groups error: ' + groupsError.message)
      return
    }

    setPhase('evidence')
    setAnswer('')
    setReason('')
    setConfidence('3')
    setQuestionStartedAt(Date.now())
    setStatus('已完成第 1 階段，進入第 2 階段')
  }

  async function handleEvidenceSubmit() {
    if (!sessionId) {
      setStatus('session 尚未建立')
      return
    }
    if (!answer) {
      setStatus('請先選擇答案')
      return
    }
    if (!reason.trim()) {
      setStatus('請先填寫理由')
      return
    }
    if (!questionStartedAt) {
      setStatus('作答時間未初始化')
      return
    }

    setStatus('saving...')

    const durationMs = Date.now() - questionStartedAt
    const isCorrect = answer === currentEvidenceQuestion.correctAnswer
    const inference = inferMisconception(answer, reason, currentEvidenceQuestion)

    const { error } = await supabase.from('responses').insert([
      {
        session_id: sessionId,
        stage: currentEvidenceQuestion.stage,
        item_id: currentEvidenceQuestion.id,
        first_answer: answer,
        final_answer: answer,
        reason: reason.trim(),
        first_reason: reason.trim(),
        final_reason: reason.trim(),
        duration_ms: durationMs,
        confidence: Number(confidence),
        is_correct: isCorrect,
        misconception_code: inference.code,
        representation_type: currentEvidenceQuestion.representationType,
        target_feature: currentEvidenceQuestion.targetFeature,
        coding_source: inference.source,
        feedback_seen: false,
        revised_after_feedback: false,
        prompt_snapshot: currentEvidenceQuestion.prompt,
        stimulus_snapshot: currentEvidenceQuestion.stimulusText ?? null,
        compare_focus_snapshot: null,
        feedback_text_snapshot: null,
        first_misconception_code: inference.code,
        final_misconception_code: inference.code,
        feedback_variant: null,
      },
    ])

    if (error) {
      setStatus('response error: ' + error.message)
      return
    }

    const isLastEvidence = evidenceIndex === evidenceQuestions.length - 1

    if (isLastEvidence) {
      setPhase('compare')
      setAnswer('')
      setReason('')
      setConfidence('3')
      setQuestionStartedAt(Date.now())
      setStatus('已進入第 3 階段：對比式回饋')
      return
    }

    setEvidenceIndex((prev) => prev + 1)
    setAnswer('')
    setReason('')
    setConfidence('3')
    setQuestionStartedAt(Date.now())
    setStatus('saved，已進入下一題')
  }

  function handleCompareFirstAnswerNext() {
    if (!answer) {
      setStatus('請先選擇首答答案')
      return
    }
    if (!reason.trim()) {
      setStatus('請先填寫首答理由')
      return
    }

    const firstInference = inferMisconception(answer, reason, currentCompareQuestion)
    const variant = firstInference.code ?? 'correct'
    const routedFeedback =
      firstInference.code === null
        ? currentCompareQuestion.correctFeedback
        : currentCompareQuestion.feedbackByCode[firstInference.code] ??
          currentCompareQuestion.fallbackFeedback

    setFirstAnswer(answer)
    setFirstReason(reason.trim())
    setFirstMisconceptionCode(firstInference.code)
    setFeedbackVariant(variant)
    setFeedbackText(routedFeedback)
    setAnswer('')
    setReason('')
    setCompareStep('feedback')
    setStatus('')
  }

  function handleCompareFeedbackNext() {
    setCompareStep('final_answer')
    setStatus('')
  }

  async function handleCompareFinalSubmit() {
    if (!sessionId) {
      setStatus('session 尚未建立')
      return
    }
    if (!firstAnswer) {
      setStatus('缺少首答資料')
      return
    }
    if (!answer) {
      setStatus('請先選擇改答答案')
      return
    }
    if (!reason.trim()) {
      setStatus('請先填寫改答理由')
      return
    }
    if (!questionStartedAt) {
      setStatus('作答時間未初始化')
      return
    }

    setStatus('saving...')

    const durationMs = Date.now() - questionStartedAt
    const isCorrect = answer === currentCompareQuestion.correctAnswer
    const finalInference = inferMisconception(answer, reason, currentCompareQuestion)
    const revisedAfterFeedback = firstAnswer !== answer

    const { error } = await supabase.from('responses').insert([
      {
        session_id: sessionId,
        stage: currentCompareQuestion.stage,
        item_id: currentCompareQuestion.id,
        first_answer: firstAnswer,
        final_answer: answer,
        reason: reason.trim(),
        first_reason: firstReason,
        final_reason: reason.trim(),
        duration_ms: durationMs,
        confidence: Number(confidence),
        is_correct: isCorrect,
        misconception_code: finalInference.code,
        representation_type: currentCompareQuestion.representationType,
        target_feature: currentCompareQuestion.targetFeature,
        coding_source: finalInference.source,
        feedback_seen: true,
        revised_after_feedback: revisedAfterFeedback,
        prompt_snapshot: currentCompareQuestion.prompt,
        stimulus_snapshot: currentCompareQuestion.stimulusText ?? null,
        compare_focus_snapshot: currentCompareQuestion.compareFocus,
        feedback_text_snapshot: feedbackText,
        first_misconception_code: firstMisconceptionCode,
        final_misconception_code: finalInference.code,
        feedback_variant: feedbackVariant,
      },
    ])

    if (error) {
      setStatus('response error: ' + error.message)
      return
    }

    const isLastCompare = compareIndex === compareQuestions.length - 1

    if (isLastCompare) {
      setPhase('transfer')
      setCompareStep('first_answer')
      setFirstAnswer('')
      setFirstReason('')
      setFirstMisconceptionCode(null)
      setFeedbackVariant('')
      setFeedbackText('')
      setAnswer('')
      setReason('')
      setConfidence('3')
      setQuestionStartedAt(Date.now())
      setStatus('已進入第 4 階段：遷移測驗')
      return
    }

    setCompareIndex((prev) => prev + 1)
    setCompareStep('first_answer')
    setFirstAnswer('')
    setFirstReason('')
    setFirstMisconceptionCode(null)
    setFeedbackVariant('')
    setFeedbackText('')
    setAnswer('')
    setReason('')
    setConfidence('3')
    setQuestionStartedAt(Date.now())
    setStatus('saved，已進入下一題')
  }

  async function handleTransferSubmit() {
    if (!sessionId) {
      setStatus('session 尚未建立')
      return
    }
    if (!answer) {
      setStatus('請先選擇答案')
      return
    }
    if (!reason.trim()) {
      setStatus('請先填寫理由')
      return
    }
    if (!questionStartedAt) {
      setStatus('作答時間未初始化')
      return
    }

    setStatus('saving...')

    const durationMs = Date.now() - questionStartedAt
    const isCorrect = answer === currentTransferQuestion.correctAnswer
    const inference = inferMisconception(answer, reason, currentTransferQuestion)

    const { error } = await supabase.from('responses').insert([
      {
        session_id: sessionId,
        stage: currentTransferQuestion.stage,
        item_id: currentTransferQuestion.id,
        first_answer: answer,
        final_answer: answer,
        reason: reason.trim(),
        first_reason: reason.trim(),
        final_reason: reason.trim(),
        duration_ms: durationMs,
        confidence: Number(confidence),
        is_correct: isCorrect,
        misconception_code: inference.code,
        representation_type: currentTransferQuestion.representationType,
        target_feature: currentTransferQuestion.targetFeature,
        coding_source: inference.source,
        feedback_seen: false,
        revised_after_feedback: false,
        prompt_snapshot: currentTransferQuestion.prompt,
        stimulus_snapshot: currentTransferQuestion.stimulusText ?? null,
        compare_focus_snapshot: null,
        feedback_text_snapshot: null,
        first_misconception_code: inference.code,
        final_misconception_code: inference.code,
        feedback_variant: null,
      },
    ])

    if (error) {
      setStatus('response error: ' + error.message)
      return
    }

    const isLastTransfer = transferIndex === transferQuestions.length - 1

    if (isLastTransfer) {
      setPhase('complete')
      setStatus('saved')
      return
    }

    setTransferIndex((prev) => prev + 1)
    setAnswer('')
    setReason('')
    setConfidence('3')
    setQuestionStartedAt(Date.now())
    setStatus('saved，已進入下一題')
  }

  function renderOptions(options: string[]) {
    return (
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 rounded border p-3">
            <input
              type="radio"
              name="answer"
              value={option}
              checked={answer === option}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    )
  }

  function renderQuestionBlock(question: {
    id: string
    prompt: string
    stimulusText?: string
    imageUrl?: string | null
    options: string[]
    targetFeature: string
  }) {
    return (
      <div className="space-y-4 rounded-xl border bg-white p-5">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">題號：{question.id}</p>
          <h2 className="text-xl font-semibold">{question.prompt}</h2>
          {question.stimulusText ? <p className="text-gray-700">{question.stimulusText}</p> : null}
          {question.imageUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded bg-gray-100">
              <Image src={question.imageUrl} alt={question.prompt} fill className="object-contain" />
            </div>
          ) : null}
        </div>

        {renderOptions(question.options)}

        <div className="space-y-2">
          <label className="block text-sm font-medium">理由</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="請寫出你的判斷理由"
            className="min-h-28 w-full rounded border px-3 py-2"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">信心（1～5）</label>
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            className="rounded border px-3 py-2"
          >
            <option value="1">1 非常不確定</option>
            <option value="2">2</option>
            <option value="3">3 普通</option>
            <option value="4">4</option>
            <option value="5">5 非常確定</option>
          </select>
        </div>

        <div className="rounded bg-gray-50 p-3 text-sm text-gray-700">
          <span className="font-medium">研究者核心特徵：</span>
          {question.targetFeature}
        </div>
      </div>
    )
  }

  if (phase === 'start') {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">動物分類學習網站 MVP</h1>
          <p className="text-gray-700">
            目前版本：第 1 階段預分類（拖曳圖片版）＋ 第 2 階段證據分類 ＋ 第 3 階段對比式回饋 ＋ 第 4 階段遷移測驗
          </p>
        </header>

        <section className="space-y-3 rounded-xl border bg-white p-5">
          <label className="block text-sm font-medium">Participant Code</label>
          <input
            value={participantCode}
            onChange={(e) => setParticipantCode(e.target.value)}
            placeholder="例如：A001"
            className="w-full rounded border px-3 py-2"
          />
          <button
            onClick={handleStart}
            className="rounded bg-black px-4 py-2 text-white"
          >
            開始作答
          </button>
          <p>{status}</p>
        </section>
      </main>
    )
  }

  if (phase === 'preclassify') {
    return (
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">第 1 階段：預分類（拖曳圖片版）</h1>

        <div className="space-y-1 text-sm text-gray-600">
          <p>participant code：{participantCode}</p>
          <p>請先自由分群，不先看標準答案。</p>
          <p>目前修改次數近似值：{preclassifyEditCount}</p>
          <p>目前群組數：{preclassifyGroups.length}</p>
          <p>群組建立次數（含初始兩組）：{groupCreateCount}</p>
          <p>卡片移動次數：{cardMoveCount}</p>
        </div>

        <DndContext onDragEnd={handleDragEnd}>
          <section className="space-y-6">
            <DropContainer id={UNGROUPED_ID} title="待分類生物卡">
              {ungroupedCardIds.map((cardId) => {
                const card = cardMap[cardId]
                return (
                  <DraggableAnimalCard
                    key={card.id}
                    id={card.id}
                    name={card.name}
                    imageUrl={card.imageUrl}
                  />
                )
              })}
            </DropContainer>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">你的群組</h2>
                <button
                  onClick={addPreclassifyGroup}
                  className="rounded border px-3 py-2 text-sm"
                >
                  新增群組
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {preclassifyGroups.map((group, index) => (
                  <div key={group.id} className="space-y-3 rounded-xl border bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        value={group.groupName}
                        onChange={(e) =>
                          updatePreclassifyGroupName(group.id, e.target.value)
                        }
                        className="w-full rounded border px-3 py-2"
                      />
                      <button
                        onClick={() => deleteEmptyGroup(group.id)}
                        className="rounded border px-3 py-2 text-sm"
                      >
                        刪除空組
                      </button>
                    </div>

                    <p className="text-sm text-gray-500">第 {index + 1} 組</p>

                    <DropContainer id={group.id} title="拖曳卡片到這一組">
                      {group.cardIds.map((cardId) => {
                        const card = cardMap[cardId]
                        return (
                          <DraggableAnimalCard
                            key={card.id}
                            id={card.id}
                            name={card.name}
                            imageUrl={card.imageUrl}
                          />
                        )
                      })}
                    </DropContainer>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium">這組的分類理由</label>
                      <textarea
                        value={group.reason}
                        onChange={(e) =>
                          updatePreclassifyGroupReason(group.id, e.target.value)
                        }
                        placeholder="請說明你為什麼把這些生物分在一起"
                        className="min-h-24 w-full rounded border px-3 py-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded-xl border bg-white p-4">
              <label className="block text-sm font-medium">整體分類理由</label>
              <textarea
                value={preclassifyOverallReason}
                onChange={(e) => {
                  setPreclassifyOverallReason(e.target.value)
                  setPreclassifyEditCount((prev) => prev + 1)
                }}
                placeholder="請說明你整體上是依什麼規則分群"
                className="min-h-28 w-full rounded border px-3 py-2"
              />
            </div>

            <button
              onClick={handlePreclassifySubmit}
              className="rounded bg-black px-4 py-2 text-white"
            >
              送出第 1 階段，進入第 2 階段
            </button>

            <p>{status}</p>
          </section>
        </DndContext>
      </main>
    )
  }

  if (phase === 'evidence') {
    return (
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">第 2 階段：證據分類</h1>
          <p className="text-sm text-gray-600">
            第 {evidenceIndex + 1} / {evidenceQuestions.length} 題
          </p>
        </header>

        {renderQuestionBlock(currentEvidenceQuestion)}

        <button
          onClick={handleEvidenceSubmit}
          className="rounded bg-black px-4 py-2 text-white"
        >
          送出本題
        </button>

        <p>{status}</p>
      </main>
    )
  }

  if (phase === 'compare') {
    return (
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">第 3 階段：對比式回饋</h1>
          <p className="text-sm text-gray-600">
            第 {compareIndex + 1} / {compareQuestions.length} 題
          </p>
        </header>

        {compareStep === 'first_answer' ? (
          <section className="space-y-4">
            <div className="rounded bg-blue-50 p-3 text-sm text-blue-900">
              先作首答，再閱讀回饋，最後重新改答。
            </div>
            {renderQuestionBlock(currentCompareQuestion)}
            <button
              onClick={handleCompareFirstAnswerNext}
              className="rounded bg-black px-4 py-2 text-white"
            >
              送出首答，查看回饋
            </button>
          </section>
        ) : null}

        {compareStep === 'feedback' ? (
          <section className="space-y-4 rounded-xl border bg-white p-5">
            <h2 className="text-xl font-semibold">回饋</h2>
            <p className="text-sm text-gray-500">回饋分流代碼：{feedbackVariant}</p>
            <div className="space-y-2 rounded bg-yellow-50 p-4">
              <p className="font-medium">首答：{firstAnswer}</p>
              <p className="text-gray-700">首答理由：{firstReason}</p>
            </div>
            <div className="rounded bg-gray-50 p-4">
              <p className="whitespace-pre-wrap text-gray-800">{feedbackText}</p>
            </div>
            <button
              onClick={handleCompareFeedbackNext}
              className="rounded bg-black px-4 py-2 text-white"
            >
              進入改答
            </button>
          </section>
        ) : null}

        {compareStep === 'final_answer' ? (
          <section className="space-y-4">
            <div className="rounded bg-green-50 p-3 text-sm text-green-900">
              請根據回饋重新作答。
            </div>
            {renderQuestionBlock(currentCompareQuestion)}
            <button
              onClick={handleCompareFinalSubmit}
              className="rounded bg-black px-4 py-2 text-white"
            >
              送出改答
            </button>
          </section>
        ) : null}

        <p>{status}</p>
      </main>
    )
  }

  if (phase === 'transfer') {
    return (
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">第 4 階段：遷移測驗</h1>
          <p className="text-sm text-gray-600">
            第 {transferIndex + 1} / {transferQuestions.length} 題
          </p>
        </header>

        {renderQuestionBlock(currentTransferQuestion)}

        <button
          onClick={handleTransferSubmit}
          className="rounded bg-black px-4 py-2 text-white"
        >
          送出本題
        </button>

        <p>{status}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">作答完成</h1>
      <p>已完成所有階段，資料已送出。</p>
      <p>{status}</p>
    </main>
  )
}