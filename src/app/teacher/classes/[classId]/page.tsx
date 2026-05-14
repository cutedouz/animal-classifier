import Link from 'next/link'

export function TeacherClassRosterSubmissionLink({ classId }: { classId: string }) {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
      <p className="text-sm font-bold text-emerald-700">本班已開放任務</p>
      <h2 className="mt-2 text-2xl font-black text-gray-900">查看學生作答</h2>
      <p className="mt-2 text-sm leading-6 text-gray-700">檢視學生個人任務與小組任務的提交狀態與作答內容。</p>
      <Link className="mt-4 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-bold text-white" href={`/teacher/classes/${classId}/submissions`}>
        查看學生作答
      </Link>
    </section>
  )
}

export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-3xl font-black">學生名冊</h1>
      <div className="mt-6">
        <TeacherClassRosterSubmissionLink classId={classId} />
      </div>
    </main>
  )
}
