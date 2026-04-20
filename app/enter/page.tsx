'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type LookupResult = {
  studentId: string
  schoolCode: string
  schoolYear: string
  semester: string
  grade: string
  className: string
  seatNo: string
  maskedName: string
}

const TARGET_PATH = '/'

export default function EnterPage() {
  const router = useRouter()

  const [schoolCode, setSchoolCode] = useState('demo-school')
  const [schoolYear, setSchoolYear] = useState('114')
  const [semester, setSemester] = useState('1')
  const [grade, setGrade] = useState('7')
  const [className, setClassName] = useState('01')
  const [seatNo, setSeatNo] = useState('1')

  const [lookupError, setLookupError] = useState('')
  const [matchedStudent, setMatchedStudent] = useState<LookupResult | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isEntering, setIsEntering] = useState(false)

  const schoolOptions = useMemo(
    () => [{ value: 'demo-school', label: '測試學校' }],
    []
  )

  const schoolYearOptions = useMemo(() => ['114'], [])
  const semesterOptions = useMemo(() => ['1', '2'], [])
  const gradeOptions = useMemo(() => ['7'], [])
  const classOptions = useMemo(() => ['01'], [])
  const seatOptions = useMemo(() => ['1', '2', '3'], [])

  function resetLookupState() {
    setLookupError('')
    setMatchedStudent(null)
  }

  async function handleLookup() {
    resetLookupState()
    setIsLookingUp(true)

    try {
      const { data, error } = await supabase
        .from('student_lookup_view')
        .select(
          'student_id, school_code, school_year, semester, grade, class_name, seat_no, masked_name'
        )
        .eq('school_code', schoolCode)
        .eq('school_year', Number(schoolYear))
        .eq('semester', Number(semester))
        .eq('grade', Number(grade))
        .eq('class_name', className)
        .eq('seat_no', Number(seatNo))
        .maybeSingle()

      if (error) {
        setLookupError('查詢失敗，請稍後再試。')
        return
      }

      if (!data) {
        setLookupError('查無對應學生資料，請重新確認學校、班級與座號。')
        return
      }

      setMatchedStudent({
        studentId: String(data.student_id),
        schoolCode: String(data.school_code),
        schoolYear: String(data.school_year),
        semester: String(data.semester),
        grade: String(data.grade),
        className: String(data.class_name),
        seatNo: String(data.seat_no),
        maskedName: String(data.masked_name),
      })
    } catch (error) {
      console.error('handleLookup error:', error)
      setLookupError('查詢失敗，請稍後再試。')
    } finally {
      setIsLookingUp(false)
    }
  }

  async function handleEnterActivity() {
    if (!matchedStudent) {
      setLookupError('尚未確認學生資料，請先查詢姓名。')
      return
    }

    setLookupError('')
    setIsEntering(true)

    try {
      const entrySession = {
        studentId: matchedStudent.studentId,
        schoolCode: matchedStudent.schoolCode,
        schoolYear: matchedStudent.schoolYear,
        semester: matchedStudent.semester,
        grade: matchedStudent.grade,
        className: matchedStudent.className,
        seatNo: matchedStudent.seatNo,
        maskedName: matchedStudent.maskedName,
        enteredAt: new Date().toISOString(),
      }

      localStorage.setItem(
        'animal-classifier-enter-session',
        JSON.stringify(entrySession)
      )

      const params = new URLSearchParams({
        studentId: matchedStudent.studentId,
        schoolCode: matchedStudent.schoolCode,
        schoolYear: matchedStudent.schoolYear,
        semester: matchedStudent.semester,
        grade: matchedStudent.grade,
        className: matchedStudent.className,
        seatNo: matchedStudent.seatNo,
      })

      router.push(`${TARGET_PATH}?${params.toString()}`)
    } catch (error) {
      console.error('handleEnterActivity error:', error)
      setLookupError('進入活動失敗，請稍後再試。')
      setIsEntering(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6">
        <h1 className="mb-2 text-3xl font-black text-gray-900">進入活動</h1>
        <p className="mb-6 text-sm leading-6 text-gray-600">
          請選擇學校、班級與座號。下一步會根據名單顯示遮罩姓名供確認。
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">學校</label>
            <select
              value={schoolCode}
              onChange={(e) => {
                setSchoolCode(e.target.value)
                resetLookupState()
              }}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              {schoolOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">學年度</label>
              <select
                value={schoolYear}
                onChange={(e) => {
                  setSchoolYear(e.target.value)
                  resetLookupState()
                }}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                {schoolYearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">學期</label>
              <select
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value)
                  resetLookupState()
                }}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                {semesterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">年級</label>
              <select
                value={grade}
                onChange={(e) => {
                  setGrade(e.target.value)
                  resetLookupState()
                }}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                {gradeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">班級</label>
              <select
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value)
                  resetLookupState()
                }}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                {classOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">座號</label>
              <select
                value={seatNo}
                onChange={(e) => {
                  setSeatNo(e.target.value)
                  resetLookupState()
                }}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                {seatOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {lookupError ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {lookupError}
          </div>
        ) : null}

        {matchedStudent ? (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="text-base font-bold text-gray-900">
              你是「{matchedStudent.maskedName}」嗎？
            </div>
            <div className="mt-2 text-sm leading-6 text-gray-700">
              若正確，下一步可進入學習頁面。
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={handleEnterActivity}
                disabled={isEntering}
                className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEntering ? '進入中…' : '是，進入活動'}
              </button>

              <button
                type="button"
                onClick={resetLookupState}
                disabled={isEntering}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                否，重新選擇
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleLookup}
            disabled={isLookingUp || isEntering}
            className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLookingUp ? '查詢中…' : '下一步：查詢姓名'}
          </button>
        </div>
      </div>
    </main>
  )
}