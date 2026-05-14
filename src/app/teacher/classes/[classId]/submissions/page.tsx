import Link from 'next/link'
import { cookies } from 'next/headers'
import type { SubmissionReviewStatus } from '@/src/lib/teacher/teacher-submission-review'

const STATUS_LABELS: Record<SubmissionReviewStatus, string> = {
  not_started: '尚未開始',
  draft: '草稿',
  submitted: '已提交',
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
}

export function TeacherSubmissionReviewOverview({ review }: { review: any }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8 text-gray-900">
      <nav className="mb-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link className="rounded-full border px-4 py-2" href={`/teacher/classes/${review.class.id}`}>返回班級名冊</Link>
        <Link className="rounded-full border px-4 py-2" href="/teacher/classes">返回我的班級</Link>
      </nav>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <p className="text-sm font-bold text-emerald-700">{review.class.name}{review.class.code ? `（${review.class.code}）` : ''}</p>
        <h1 className="mt-2 text-3xl font-black">學生作答檢視</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">此頁僅供教師檢視學生與小組作答狀態，不提供評分、退回或修改學生作答。</p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-black">個人任務作答狀態</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left font-bold text-gray-700"><tr><th className="p-3">座號</th><th className="p-3">姓名</th><th className="p-3">小組</th><th className="p-3">任務</th><th className="p-3">狀態</th><th className="p-3">終稿提交時間</th><th className="p-3">AI 回饋</th><th className="p-3">查看</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {review.individualRows.flatMap((row: any) => row.taskStatuses.map((status: any) => {
                const task = review.tasks.find((item: any) => item.taskCode === status.taskCode)
                return <tr key={`${row.studentProfileId}-${status.taskCode}`}><td className="p-3">{row.seatNo || '—'}</td><td className="p-3 font-semibold">{row.studentName}</td><td className="p-3">{row.groupNames.join('、') || '—'}</td><td className="p-3">{task?.title ?? status.taskCode}</td><td className="p-3">{STATUS_LABELS[status.status as SubmissionReviewStatus]}</td><td className="p-3">{formatDate(status.submittedAt)}</td><td className="p-3">{status.hasAiFeedback ? '已取得' : '尚未取得'}</td><td className="p-3"><Link className="font-bold text-emerald-700" href={status.detailHref}>查看</Link></td></tr>
              }))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-black">小組任務作答狀態</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left font-bold text-gray-700"><tr><th className="p-3">小組</th><th className="p-3">成員</th><th className="p-3">任務</th><th className="p-3">狀態</th><th className="p-3">小組終稿提交時間</th><th className="p-3">AI 回饋</th><th className="p-3">查看</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {review.groupRows.flatMap((row: any) => row.taskStatuses.map((status: any) => {
                const task = review.tasks.find((item: any) => item.taskCode === status.taskCode)
                return <tr key={`${row.groupName}-${status.taskCode}`}><td className="p-3 font-semibold">{row.groupName}</td><td className="p-3">{row.memberNames.join('、') || '—'}</td><td className="p-3">{task?.title ?? status.taskCode}</td><td className="p-3">{STATUS_LABELS[status.status as SubmissionReviewStatus]}</td><td className="p-3">{formatDate(status.submittedAt)}</td><td className="p-3">{status.hasAiFeedback ? '已取得' : '尚未取得'}</td><td className="p-3"><Link className="font-bold text-emerald-700" href={status.detailHref}>查看</Link></td></tr>
              }))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default async function Page() {
  const cookieStore = await cookies()
  if (!cookieStore.get('sf_teacher_session')) {
    return <main className="p-8">請先以教師帳號登入後再檢視學生作答。</main>
  }
  return <main className="p-8">請從班級名冊進入學生作答檢視。</main>
}
