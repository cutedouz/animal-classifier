import Link from 'next/link'
import { cookies } from 'next/headers'

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
}

function statusLabel(status: string) {
  return status === 'submitted' ? '已提交' : status === 'draft' ? '草稿' : '尚未開始'
}

export function TeacherGroupSubmissionDetail({ detail }: { detail: any }) {
  const hasFinal = Boolean(detail.latestFinalVersion)
  const hasDraft = Boolean(detail.latestDraftVersion)
  return (
    <main className="mx-auto max-w-4xl px-6 py-8 text-gray-900">
      <Link className="text-sm font-bold text-emerald-700" href={`/teacher/classes/${detail.class.id}/submissions`}>返回學生作答檢視</Link>
      <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-3xl font-black">小組作答內容</h1>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-bold text-gray-500">小組</dt><dd>{detail.group.groupName}</dd></div><div><dt className="font-bold text-gray-500">成員</dt><dd>{detail.group.members.map((member: any) => `${member.seatNo ? `${member.seatNo} ` : ''}${member.studentName}`).join('、') || '—'}</dd></div><div><dt className="font-bold text-gray-500">任務名稱</dt><dd>{detail.task.title}</dd></div><div><dt className="font-bold text-gray-500">作答狀態</dt><dd>{statusLabel(detail.submissionStatus)}</dd></div>{detail.latestFinalVersion ? <div><dt className="font-bold text-gray-500">終稿提交時間</dt><dd>{formatDate(detail.latestFinalVersion.submittedAt)}</dd></div> : null}</dl>
        {detail.hasPostSubmitDraft ? <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">此小組在終稿後仍有較新的草稿，以下優先顯示已提交終稿。</p> : null}
      </section>
      <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><h2 className="text-xl font-black">作答內容{hasFinal ? '（終稿）' : hasDraft ? '（草稿）' : ''}</h2>{!hasFinal && hasDraft ? <p className="mt-3 text-sm font-semibold text-amber-700">此小組目前只有草稿，尚未提交終稿。</p> : null}{!hasFinal && !hasDraft ? <p className="mt-3 text-sm text-gray-600">此小組尚未開始此任務。</p> : null}<div className="mt-4 space-y-4">{detail.safeContentFields.map((field: any) => <article className="rounded-2xl border border-gray-200 p-4" key={field.key}><h3 className="font-bold text-gray-700">{field.label}</h3><p className="mt-2 whitespace-pre-wrap text-gray-900">{field.value}</p></article>)}</div></section>
      <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200"><h2 className="text-xl font-black">AI 回饋狀態</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="font-bold text-gray-500">是否曾取得 AI 回饋</dt><dd>{detail.aiFeedbackSummary.hasAiFeedback ? '已取得' : '尚未取得'}</dd></div><div><dt className="font-bold text-gray-500">最近回饋時間</dt><dd>{formatDate(detail.aiFeedbackSummary.lastFeedbackAt)}</dd></div><div><dt className="font-bold text-gray-500">回饋狀態</dt><dd>{detail.aiFeedbackSummary.status}</dd></div></dl></section>
    </main>
  )
}

export default async function Page() {
  const cookieStore = await cookies()
  if (!cookieStore.get('sf_teacher_session')) return <main className="p-8">無法檢視此小組作答，請確認教師登入狀態與班級權限。</main>
  return <main className="p-8">請從學生作答檢視列表選擇一筆小組作答。</main>
}
