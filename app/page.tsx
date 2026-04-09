'use client'

import { useState } from 'react'
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

type PreclassifyGroupForm = {
  groupName: string
  itemsText: string
  reason: string
}

function makeEmptyGroup(): PreclassifyGroupForm {
  return {
    groupName: '',
    itemsText: '',
    reason: '',
  }
}

export default function Home() {
  const [participantCode, setParticipantCode] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [phase, setPhase] = useState<AppPhase>('start')
  const [status, setStatus] = useState('')

  const [preclassifyGroupCount, setPreclassifyGroupCount] = useState(3)
  const [preclassifyGroups, setPreclassifyGroups] = useState<PreclassifyGroupForm[]>([
    makeEmptyGroup(),
    makeEmptyGroup(),
    makeEmptyGroup(),
  ])
  const [preclassifyOverallReason, setPreclassifyOverallReason] = useState('')
  const [preclassifyEditCount, setPreclassifyEditCount] = useState(0)

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

  function resizePreclassifyGroups(nextCount: number) {
    setPreclassifyGroupCount(nextCount)
    setPreclassifyGroups((prev) => {
      const next = [...prev]
      if (nextCount > next.length) {
        while (next.length < nextCount) {
          next.push(makeEmptyGroup())
        }
      } else {
        next.length = nextCount
      }
      return next
    })
    setPreclassifyEditCount((prev) => prev + 1)
  }

  function updatePreclassifyGroupField(
    index: number,
    field: keyof PreclassifyGroupForm,
    value: string
  ) {
    setPreclassifyGroups((prev) =>
      prev.map((group, i) =>
        i === index
          ? {
              ...group,
              [field]: value,
            }
          : group
      )
    )
    setPreclassifyEditCount((prev) => prev + 1)
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
      if (!group.itemsText.trim()) {
        setStatus(`第 ${i + 1} 組尚未填寫包含哪些生物`)
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
        group_count: preclassifyGroupCount,
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
      items_text: group.itemsText.trim(),
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

  if (phase === 'start') {
    return (
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">動物分類學習網站 MVP</h1>
        <p className="text-sm text-gray-600">
          目前版本：第 1 階段預分類（簡化版）＋ 第 2 階段證據分類 ＋ 第 3 階段分流回饋 ＋ 第 4 階段遷移測驗骨架
        </p>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Participant Code</label>
          <input
            value={participantCode}
            onChange={(e) => setParticipantCode(e.target.value)}
            placeholder="例如：A001"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <button
          onClick={handleStart}
          className="rounded bg-black px-4 py-2 text-white"
        >
          開始作答
        </button>

        <p>{status}</p>
      </main>
    )
  }

  if (phase === 'preclassify') {
    return (
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">第 1 階段：預分類（簡化版）</h1>

        <div className="space-y-1 text-sm text-gray-600">
          <p>participant code：{participantCode}</p>
          <p>請先自由分群，不先看標準答案。</p>
          <p>目前修改次數近似值：{preclassifyEditCount}</p>
        </div>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded border p-4">
            <h2 className="text-lg font-semibold">本階段生物卡（P1–P10）</h2>
            <div className="grid grid-cols-2 gap-2">
              {preclassifyCards.map((card) => (
                <div key={card.id} className="rounded border p-2 text-sm">
                  <p className="font-medium">{card.id}</p>
                  <p>{card.name}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              簡化版作法：請直接輸入每組包含哪些生物編號或名稱，例如：
              P1, P2, 水母, 海葵
            </p>
          </div>

          <div className="space-y-4 rounded border p-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">你想分成幾組？</label>
              <select
                value={preclassifyGroupCount}
                onChange={(e) => resizePreclassifyGroups(Number(e.target.value))}
                className="rounded border px-3 py-2"
              >
                <option value="2">2 組</option>
                <option value="3">3 組</option>
                <option value="4">4 組</option>
                <option value="5">5 組</option>
              </select>
            </div>

            <div className="space-y-4">
              {preclassifyGroups.map((group, index) => (
                <div key={index} className="space-y-3 rounded border p-3">
                  <h3 className="font-medium">第 {index + 1} 組</h3>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">群組名稱</label>
                    <input
                      value={group.groupName}
                      onChange={(e) =>
                        updatePreclassifyGroupField(index, 'groupName', e.target.value)
                      }
                      placeholder="例如：有觸手的、身體柔軟的"
                      className="w-full rounded border px-3 py-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      這組包含哪些生物？
                    </label>
                    <textarea
                      value={group.itemsText}
                      onChange={(e) =>
                        updatePreclassifyGroupField(index, 'itemsText', e.target.value)
                      }
                      placeholder="請輸入生物編號或名稱，用逗號分隔"
                      className="min-h-20 w-full rounded border px-3 py-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">你為什麼這樣分？</label>
                    <textarea
                      value={group.reason}
                      onChange={(e) =>
                        updatePreclassifyGroupField(index, 'reason', e.target.value)
                      }
                      placeholder="請寫這組的分類理由"
                      className="min-h-20 w-full rounded border px-3 py-2"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">整體分類理由</label>
              <textarea
                value={preclassifyOverallReason}
                onChange={(e) => {
                  setPreclassifyOverallReason(e.target.value)
                  setPreclassifyEditCount((prev) => prev + 1)
                }}
                placeholder="請說明你整體上是依什麼規則分群"
                className="min-h-24 w-full rounded border px-3 py-2"
              />
            </div>

            <button
              onClick={handlePreclassifySubmit}
              className="rounded bg-black px-4 py-2 text-white"
            >
              送出第 1 階段，進入第 2 階段
            </button>

            <p>{status}</p>
          </div>
        </section>
      </main>
    )
  }

  if (phase === 'evidence') {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">第 2 階段：證據分類</h1>

        <div className="space-y-1 text-sm text-gray-600">
          <p>participant code：{participantCode}</p>
          <p>第 {evidenceIndex + 1} 題 / 共 {evidenceQuestions.length} 題</p>
          <p>題號：{currentEvidenceQuestion.id}</p>
          <p>表徵型式：{currentEvidenceQuestion.representationType}</p>
          <p>核心診斷特徵：{currentEvidenceQuestion.targetFeature}</p>
        </div>

        <section className="space-y-4 rounded border p-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{currentEvidenceQuestion.prompt}</h2>
            {currentEvidenceQuestion.stimulusText ? (
              <p className="text-sm text-gray-700">{currentEvidenceQuestion.stimulusText}</p>
            ) : null}
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">請選擇你的答案</legend>
            {currentEvidenceQuestion.options.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="evidence-answer"
                  value={option}
                  checked={answer === option}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>

          <div className="space-y-2">
            <label className="block text-sm font-medium">請寫下你的理由</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="請根據主要構造與特徵說明你的判斷"
              className="min-h-28 w-full rounded border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">你的信心程度</label>
            <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="rounded border px-3 py-2"
            >
              <option value="1">1 分：完全不確定</option>
              <option value="2">2 分：不太確定</option>
              <option value="3">3 分：普通</option>
              <option value="4">4 分：大致確定</option>
              <option value="5">5 分：非常確定</option>
            </select>
          </div>

          <button onClick={handleEvidenceSubmit} className="rounded bg-black px-4 py-2 text-white">
            {evidenceIndex === evidenceQuestions.length - 1 ? '送出並進入第 3 階段' : '送出本題'}
          </button>

          <p>{status}</p>
        </section>
      </main>
    )
  }

  if (phase === 'compare') {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">第 3 階段：對比式回饋</h1>

        <div className="space-y-1 text-sm text-gray-600">
          <p>participant code：{participantCode}</p>
          <p>第 {compareIndex + 1} 題 / 共 {compareQuestions.length} 題</p>
          <p>題號：{currentCompareQuestion.id}</p>
          <p>目前步驟：{compareStep}</p>
          <p>對比焦點：{currentCompareQuestion.compareFocus}</p>
        </div>

        <section className="space-y-4 rounded border p-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{currentCompareQuestion.prompt}</h2>
            {currentCompareQuestion.stimulusText ? (
              <p className="text-sm text-gray-700">{currentCompareQuestion.stimulusText}</p>
            ) : null}
          </div>

          {compareStep === 'first_answer' ? (
            <>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">請先作第一次判斷</legend>
                {currentCompareQuestion.options.map((option) => (
                  <label key={option} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="compare-first-answer"
                      value={option}
                      checked={answer === option}
                      onChange={(e) => setAnswer(e.target.value)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>

              <div className="space-y-2">
                <label className="block text-sm font-medium">第一次作答理由</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="請寫下你第一次的判斷理由"
                  className="min-h-28 w-full rounded border px-3 py-2"
                />
              </div>

              <button
                onClick={handleCompareFirstAnswerNext}
                className="rounded bg-black px-4 py-2 text-white"
              >
                查看對比式回饋
              </button>
            </>
          ) : null}

          {compareStep === 'feedback' ? (
            <>
              <div className="space-y-2 rounded border bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-500">
                  對比式回饋（分流版本：{feedbackVariant}）
                </p>
                <p>{feedbackText}</p>
              </div>

              <button
                onClick={handleCompareFeedbackNext}
                className="rounded bg-black px-4 py-2 text-white"
              >
                進行改答
              </button>
            </>
          ) : null}

          {compareStep === 'final_answer' ? (
            <>
              <div className="space-y-2 rounded border bg-gray-50 p-3 text-sm">
                <p>第一次答案：{firstAnswer}</p>
                <p>第一次理由：{firstReason}</p>
                <p>第一次迷思代碼：{firstMisconceptionCode ?? 'correct'}</p>
                <p>回饋版本：{feedbackVariant}</p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">請根據回饋重新作答</legend>
                {currentCompareQuestion.options.map((option) => (
                  <label key={option} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="compare-final-answer"
                      value={option}
                      checked={answer === option}
                      onChange={(e) => setAnswer(e.target.value)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>

              <div className="space-y-2">
                <label className="block text-sm font-medium">改答理由</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="請寫下你修改或維持原判斷的理由"
                  className="min-h-28 w-full rounded border px-3 py-2"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">你的信心程度</label>
                <select
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  className="rounded border px-3 py-2"
                >
                  <option value="1">1 分：完全不確定</option>
                  <option value="2">2 分：不太確定</option>
                  <option value="3">3 分：普通</option>
                  <option value="4">4 分：大致確定</option>
                  <option value="5">5 分：非常確定</option>
                </select>
              </div>

              <button
                onClick={handleCompareFinalSubmit}
                className="rounded bg-black px-4 py-2 text-white"
              >
                {compareIndex === compareQuestions.length - 1 ? '送出並進入第 4 階段' : '送出改答'}
              </button>
            </>
          ) : null}

          <p>{status}</p>
        </section>
      </main>
    )
  }

  if (phase === 'transfer') {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-2xl font-bold">第 4 階段：遷移測驗</h1>

        <div className="space-y-1 text-sm text-gray-600">
          <p>participant code：{participantCode}</p>
          <p>第 {transferIndex + 1} 題 / 共 {transferQuestions.length} 題</p>
          <p>題號：{currentTransferQuestion.id}</p>
          <p>表徵型式：{currentTransferQuestion.representationType}</p>
          <p>核心診斷特徵：{currentTransferQuestion.targetFeature}</p>
        </div>

        <section className="space-y-4 rounded border p-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{currentTransferQuestion.prompt}</h2>
            {currentTransferQuestion.stimulusText ? (
              <p className="text-sm text-gray-700">{currentTransferQuestion.stimulusText}</p>
            ) : null}

            {currentTransferQuestion.representationType !== 'text' ? (
              <div className="rounded border border-dashed p-3 text-sm text-gray-500">
                此題預留圖片／新表徵區塊，之後可補圖片資源。
              </div>
            ) : null}
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">請選擇你的答案</legend>
            {currentTransferQuestion.options.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="transfer-answer"
                  value={option}
                  checked={answer === option}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>

          <div className="space-y-2">
            <label className="block text-sm font-medium">請寫下你的理由</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="請說明你如何把已學到的規則用在這題"
              className="min-h-28 w-full rounded border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">你的信心程度</label>
            <select
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="rounded border px-3 py-2"
            >
              <option value="1">1 分：完全不確定</option>
              <option value="2">2 分：不太確定</option>
              <option value="3">3 分：普通</option>
              <option value="4">4 分：大致確定</option>
              <option value="5">5 分：非常確定</option>
            </select>
          </div>

          <button onClick={handleTransferSubmit} className="rounded bg-black px-4 py-2 text-white">
            {transferIndex === transferQuestions.length - 1 ? '送出並完成' : '送出本題'}
          </button>

          <p>{status}</p>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">作答完成</h1>
      <p>participant code：{participantCode}</p>
      <p>已完成第 1 階段預分類。</p>
      <p>已完成第 2 階段 {evidenceQuestions.length} 題。</p>
      <p>已完成第 3 階段 {compareQuestions.length} 題。</p>
      <p>已完成第 4 階段 {transferQuestions.length} 題。</p>
      <p>{status}</p>
    </main>
  )
}
