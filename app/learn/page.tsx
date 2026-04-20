'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type EnterSession = {
  studentId: string
  schoolCode: string
  schoolYear: string
  semester: string
  grade: string
  className: string
  seatNo: string
  maskedName?: string
  enteredAt?: string
}

export default function LearnPage() {
  const searchParams = useSearchParams()
  const [session, setSession] = useState<EnterSession | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('animal-classifier-enter-session')
      if (!raw) return
      const parsed = JSON.parse(raw) as EnterSession
      setSession(parsed)
    } catch (error) {
      console.error('讀取 enter session 失敗:', error)
    }
  }, [])

  const queryData = useMemo(
    () => ({
      studentId: searchParams.get('studentId') ?? '',
      schoolCode: searchParams.get('schoolCode') ?? '',
      schoolYear: searchParams.get('schoolYear') ?? '',
      semester: searchParams.get('semester') ?? '',
      grade: searchParams.get('grade') ?? '',
      className: searchParams.get('className') ?? '',
      seatNo: searchParams.get('seatNo') ?? '',
    }),
    [searchParams]
  )

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black text-gray-900">已進入學習頁面</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            這一頁先用來確認：從「進入活動」頁面導頁是否成功。
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">網址參數</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-semibold text-gray-700">studentId</td>
                  <td className="px-3 py-2 text-gray-900">{queryData.studentId || '—'}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-semibold text-gray-700">schoolCode</td>
                  <td className="px-3 py-2 text-gray-900">{queryData.schoolCode || '—'}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-semibold text-gray-700">schoolYear</td>
                  <td className="px-3 py-2 text-gray-900">{queryData.schoolYear || '—'}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-semibold text-gray-700">semester</td>
                  <td className="px-3 py-2 text-gray-900">{queryData.semester || '—'}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-semibold text-gray-700">grade</td>
                  <td className="px-3 py-2 text-gray-900">{queryData.grade || '—'}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-3 py-2 font-semibold text-gray-700">className</td>
                  <td className="px-3 py-2 text-gray-900">{queryData.className || '—'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-semibold text-gray-700">seatNo</td>
                  <td className="px-3 py-2 text-gray-900">{queryData.seatNo || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">localStorage 進入紀錄</h2>
          {session ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-semibold text-gray-700">studentId</td>
                    <td className="px-3 py-2 text-gray-900">{session.studentId || '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-semibold text-gray-700">schoolCode</td>
                    <td className="px-3 py-2 text-gray-900">{session.schoolCode || '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-semibold text-gray-700">schoolYear</td>
                    <td className="px-3 py-2 text-gray-900">{session.schoolYear || '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-semibold text-gray-700">semester</td>
                    <td className="px-3 py-2 text-gray-900">{session.semester || '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-semibold text-gray-700">grade</td>
                    <td className="px-3 py-2 text-gray-900">{session.grade || '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-semibold text-gray-700">className</td>
                    <td className="px-3 py-2 text-gray-900">{session.className || '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-semibold text-gray-700">seatNo</td>
                    <td className="px-3 py-2 text-gray-900">{session.seatNo || '—'}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 font-semibold text-gray-700">maskedName</td>
                    <td className="px-3 py-2 text-gray-900">{session.maskedName || '—'}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-gray-700">enteredAt</td>
                    <td className="px-3 py-2 text-gray-900">{session.enteredAt || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">
              尚未讀到 localStorage 的進入紀錄。
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">下一步</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            如果你現在能成功看到這頁，代表「查姓名 → 確認學生 → 導頁」流程已經接通。
            下一步就可以把這一頁改成真正的任務頁面內容。
          </p>
        </section>
      </div>
    </main>
  )
}