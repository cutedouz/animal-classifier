'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type RosterRow = {
  student_id: string
  school_code: string
  class_name: string
  seat_no: string
  masked_name: string
  full_name?: string
  active?: boolean
}

type SchoolDirectoryRow = {
  school_code: string
  school_name: string
  county: string
  sort_order: number
  is_active?: boolean
}

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
const FIXED_SCHOOL_YEAR = '114'
const FIXED_SEMESTER = '1'
const SCHOOL_LOADING_TEXT = '載入學校中…'

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function numericAwareSort(values: string[]) {
  return [...values].sort((a, b) => {
    const aNum = Number(a)
    const bNum = Number(b)

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum
    }

    return a.localeCompare(b, 'zh-Hant')
  })
}

function inferGradeFromClassName(className: string) {
  const firstChar = className.trim().charAt(0)
  return /^\d$/.test(firstChar) ? firstChar : ''
}

export default function EnterPage() {
  const router = useRouter()

  const [rosterRows, setRosterRows] = useState<RosterRow[]>([])
  const [schoolDirectoryRows, setSchoolDirectoryRows] = useState<SchoolDirectoryRow[]>([])
  const [isLoadingRoster, setIsLoadingRoster] = useState(true)
  const [rosterLoadError, setRosterLoadError] = useState('')

  const [schoolCode, setSchoolCode] = useState('')
  const [className, setClassName] = useState('')
  const [seatNo, setSeatNo] = useState('')

  const [lookupError, setLookupError] = useState('')
  const [matchedStudent, setMatchedStudent] = useState<LookupResult | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isEntering, setIsEntering] = useState(false)

  // 自訂學校下拉
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false)
  const [schoolKeyword, setSchoolKeyword] = useState('')
  const schoolDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoadingRoster(true)
      setRosterLoadError('')

      try {
        const rosterPromise = supabase
          .from('student_roster_lookup_view')
          .select('student_id, school_code, class_name, seat_no, masked_name, full_name, active')
          .order('school_code', { ascending: true })
          .order('class_name', { ascending: true })
          .order('seat_no', { ascending: true })
          .limit(10000) // 🔴 修改點 1：解除預設 1000 筆限制，拉高上限以涵蓋所有學生

        const schoolDirectoryPromise = supabase
          .from('school_directory')
          .select('school_code, school_name, county, sort_order, is_active')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        const [rosterResult, schoolDirectoryResult] = await Promise.allSettled([
          rosterPromise,
          schoolDirectoryPromise,
        ])

        if (rosterResult.status === 'rejected') {
          setRosterLoadError('載入學生名單失敗，請稍後再試。')
          return
        }

        const rosterData = rosterResult.value.data ?? []
        const rosterError = rosterResult.value.error

        if (rosterError) {
          setRosterLoadError('載入學生名單失敗，請稍後再試。')
          return
        }

        const rows: RosterRow[] = rosterData.map((item) => ({
          student_id: String(item.student_id),
          school_code: String(item.school_code),
          class_name: String(item.class_name),
          seat_no: String(item.seat_no),
          masked_name: String(item.masked_name),
          full_name: item.full_name ? String(item.full_name) : undefined,
          active: item.active === undefined ? true : Boolean(item.active),
        }))

        setRosterRows(rows)

// 👇👇👇 請把 console.log 加在這裡 👇👇👇
        console.log('✅ 前端收到的學生總筆數：', rows.length)
        
        // 注意：請把下面的 '對應的學校代碼' 換成「臺南市南新國中」在資料庫裡的實際 school_code (例如 '114405')
        console.log(
          '🔍 南新國中的學生資料：', 
          rows.filter(r => r.school_code === '對應的學校代碼') 
        )
        // 👆👆👆 加完這兩行 👆👆👆

        if (schoolDirectoryResult.status === 'fulfilled' && !schoolDirectoryResult.value.error) {
          const schoolRows: SchoolDirectoryRow[] = (schoolDirectoryResult.value.data ?? []).map(
            (item) => ({
              school_code: String(item.school_code),
              school_name: String(item.school_name),
              county: String(item.county),
              sort_order: Number(item.sort_order),
              is_active: item.is_active === undefined ? true : Boolean(item.is_active),
            })
          )
          setSchoolDirectoryRows(schoolRows)
        } else {
          setSchoolDirectoryRows([])
        }
      } catch (error) {
        console.error('loadData error:', error)
        setRosterLoadError('載入學生名單失敗，請稍後再試。')
      } finally {
        setIsLoadingRoster(false)
      }
    }

    void loadData()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        schoolDropdownRef.current &&
        !schoolDropdownRef.current.contains(event.target as Node)
      ) {
        setSchoolDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 🔴 修改點 2：直接依賴 schoolDirectoryRows 生成所有啟用的學校選單
  const schoolOptions = useMemo(() => {
    return schoolDirectoryRows
      .map((row) => ({
        value: row.school_code,
        label: row.school_name,
        county: row.county,
        sortOrder: row.sort_order,
      }))
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder
        }
        return a.label.localeCompare(b.label, 'zh-Hant')
      })
  }, [schoolDirectoryRows])

  const filteredSchoolOptions = useMemo(() => {
    const keyword = schoolKeyword.trim()
    if (!keyword) return schoolOptions

    return schoolOptions.filter(
      (option) =>
        option.label.includes(keyword) ||
        option.value.includes(keyword) ||
        option.county.includes(keyword)
    )
  }, [schoolOptions, schoolKeyword])

  const selectedSchoolLabel = useMemo(() => {
    const found = schoolOptions.find((option) => option.value === schoolCode)
    return found?.label ?? ''
  }, [schoolOptions, schoolCode])

  const classOptions = useMemo(() => {
    if (!schoolCode) return []

    return numericAwareSort(
      unique(
        rosterRows
          .filter((row) => row.school_code === schoolCode)
          .map((row) => row.class_name)
      )
    )
  }, [rosterRows, schoolCode])

  const seatOptions = useMemo(() => {
    if (!schoolCode || !className) return []

    return numericAwareSort(
      unique(
        rosterRows
          .filter(
            (row) =>
              row.school_code === schoolCode && row.class_name === className
          )
          .map((row) => row.seat_no)
      )
    )
  }, [rosterRows, schoolCode, className])

  function resetLookupState() {
    setLookupError('')
    setMatchedStudent(null)
  }

  function handleSchoolChange(nextSchoolCode: string) {
    setSchoolCode(nextSchoolCode)
    setClassName('')
    setSeatNo('')
    setSchoolDropdownOpen(false)
    setSchoolKeyword('')
    resetLookupState()
  }

  function handleClassChange(nextClassName: string) {
    setClassName(nextClassName)
    setSeatNo('')
    resetLookupState()
  }

  function handleSeatChange(nextSeatNo: string) {
    setSeatNo(nextSeatNo)
    resetLookupState()
  }

  async function handleLookup() {
    resetLookupState()

    if (!schoolCode || !className || !seatNo) {
      setLookupError('請先完整選擇學校、班級與座號。')
      return
    }

    setIsLookingUp(true)

    try {
      const { data, error } = await supabase
        .from('student_roster_lookup_view')
        .select('student_id, school_code, class_name, seat_no, masked_name')
        .eq('school_code', schoolCode)
        .eq('class_name', className)
        .eq('seat_no', seatNo)
        .maybeSingle()

      if (error) {
        setLookupError('查詢失敗，請稍後再試。')
        return
      }

      if (!data) {
        setLookupError('查無對應學生資料，請重新確認學校、班級與座號。')
        return
      }

      const inferredGrade = inferGradeFromClassName(String(data.class_name))

      setMatchedStudent({
        studentId: String(data.student_id),
        schoolCode: String(data.school_code),
        schoolYear: FIXED_SCHOOL_YEAR,
        semester: FIXED_SEMESTER,
        grade: inferredGrade,
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
          請依序選擇學校、班級與座號。下一步會根據正式名單顯示遮罩姓名供確認。
        </p>

        {rosterLoadError ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {rosterLoadError}
          </div>
        ) : null}

        <div className="space-y-4">
          <div ref={schoolDropdownRef} className="relative">
            <label className="mb-1 block text-sm font-semibold text-gray-700">學校</label>

            <button
              type="button"
              onClick={() => {
                if (!isLoadingRoster && schoolOptions.length > 0) {
                  setSchoolDropdownOpen((prev) => !prev)
                }
              }}
              disabled={isLoadingRoster || schoolOptions.length === 0}
              className="flex w-full items-center justify-between rounded-xl border border-gray-300 px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              <span className={schoolCode ? 'text-gray-900' : 'text-gray-500'}>
                {isLoadingRoster
                  ? SCHOOL_LOADING_TEXT
                  : schoolCode
                    ? selectedSchoolLabel
                    : '請選擇學校'}
              </span>
              <span className="ml-3 text-gray-500">▾</span>
            </button>

            <div className="mt-1 text-xs text-gray-500">
              {isLoadingRoster ? '載入中…' : `共 ${schoolOptions.length} 所學校`}
            </div>

            {schoolDropdownOpen ? (
              <div className="absolute z-30 mt-2 w-full rounded-2xl border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-200 p-3">
                  <input
                    value={schoolKeyword}
                    onChange={(e) => setSchoolKeyword(e.target.value)}
                    placeholder="輸入校名搜尋"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                  {filteredSchoolOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      找不到符合的學校
                    </div>
                  ) : (
                    filteredSchoolOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSchoolChange(option.value)}
                        className={`block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                          schoolCode === option.value
                            ? 'bg-gray-100 font-semibold text-gray-900'
                            : 'text-gray-800'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
  <label className="mb-1 block text-sm font-semibold text-gray-700">班級</label>
  <select
    value={className}
    onChange={(e) => handleClassChange(e.target.value)}
    disabled={!schoolCode || classOptions.length === 0}
    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
  >
    {/* 根據狀況顯示不同的預設文字 */}
    <option value="">
      {!schoolCode 
        ? '請先選學校' 
        : classOptions.length === 0 
          ? '此學校尚無學生資料' 
          : '請選擇班級'}
    </option>
    
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
                onChange={(e) => handleSeatChange(e.target.value)}
                disabled={!className || seatOptions.length === 0}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">{className ? '請選擇座號' : '請先選班級'}</option>
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
            disabled={
              isLookingUp ||
              isEntering ||
              !schoolCode ||
              !className ||
              !seatNo
            }
            className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLookingUp ? '查詢中…' : '下一步：查詢姓名'}
          </button>
        </div>
      </div>
    </main>
  )
}