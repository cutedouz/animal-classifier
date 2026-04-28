'use client'

import { useEffect, useMemo, useState } from 'react'
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

type EntryMode = 'roster' | 'manual'

type PlatformMode =
  | 'research_formal'
  | 'teaching_demo'
  | 'dev_test'

type DataUseScope =
  | 'main_research'
  | 'teaching_only'
  | 'excluded_test'

type UserRole =
  | '國中學生'
  | '國小學生'
  | '高中學生'
  | '生物科教師'
  | '其他科教師'
  | '家長'
  | '其他'

type UseContext =
  | '正式課堂學習'
  | '課後或自主學習'
  | '教師研習／備課體驗'
  | '家長或一般體驗'
  | '測試系統'

type AnimalClassificationExperience =
  | '尚未學過'
  | '正在學習中'
  | '已經學過'
  | '不確定'

type LearningExperienceCode =
  | 'before'
  | 'during'
  | 'after'
  | 'unsure'

const USER_ROLE_OPTIONS: UserRole[] = [
  '國中學生',
  '國小學生',
  '高中學生',
  '生物科教師',
  '其他科教師',
  '家長',
  '其他',
]

const USE_CONTEXT_OPTIONS: UseContext[] = [
  '正式課堂學習',
  '課後或自主學習',
  '教師研習／備課體驗',
  '家長或一般體驗',
  '測試系統',
]

const ANIMAL_CLASSIFICATION_EXPERIENCE_OPTIONS: AnimalClassificationExperience[] = [
  '尚未學過',
  '正在學習中',
  '已經學過',
  '不確定',
]

type SchoolOption = {
  value: string
  label: string
  county?: string
  sortOrder: number
}

const TARGET_PATH = '/'
const FIXED_SCHOOL_YEAR = '114'
const FIXED_SEMESTER = '1'
const ROSTER_ENTRY_PASSWORD = 'sci'
const APP_VERSION = 'enter-2026-04-28-formal-research-metadata-v1'
const ITEM_BANK_VERSION = 'itembank-2026-04-28-v1'
const RUBRIC_VERSION = 'rubric-2026-04-28-v1'
const CONSENT_VERSION = 'classroom-roster-2026-04-28-v1'

const LOGO_URL =
  'https://lh3.googleusercontent.com/d/1c0UMLE6cig4BG247E7ALdODJnNX_-Y6L'
const LOGO_LINK = 'https://sites.google.com/view/sci-flipper/home'

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

function mapLearningExperience(
  value: AnimalClassificationExperience | '' | null | undefined
): LearningExperienceCode {
  switch (value) {
    case '尚未學過':
      return 'before'
    case '正在學習中':
      return 'during'
    case '已經學過':
      return 'after'
    case '不確定':
    default:
      return 'unsure'
  }
}

function resolvePlatformMode(mode: EntryMode): {
  platformMode: PlatformMode
  dataUseScope: DataUseScope
  taskVariant: 'formal' | 'demo'
  formalRosterImported: boolean
  researchMode: 'full_six_stage_research' | 'practice'
} {
  if (mode === 'roster') {
    return {
      platformMode: 'research_formal',
      dataUseScope: 'main_research',
      taskVariant: 'formal',
      formalRosterImported: true,
      researchMode: 'full_six_stage_research',
    }
  }

  return {
    platformMode: 'teaching_demo',
    dataUseScope: 'teaching_only',
    taskVariant: 'demo',
    formalRosterImported: false,
    researchMode: 'practice',
  }
}

export default function EnterPage() {
  const router = useRouter()

  const [rosterRows, setRosterRows] = useState<RosterRow[]>([])
  const [schoolDirectoryRows, setSchoolDirectoryRows] = useState<SchoolDirectoryRow[]>([])

  const [isLoadingRoster, setIsLoadingRoster] = useState(true)
  const [rosterLoadError, setRosterLoadError] = useState('')
  const [schoolLoadError, setSchoolLoadError] = useState('')

  const [entryMode, setEntryMode] = useState<EntryMode>('roster')

  const [schoolKeyword, setSchoolKeyword] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [className, setClassName] = useState('')
  const [seatNo, setSeatNo] = useState('')
  const [enterPassword, setEnterPassword] = useState('')

  const [manualSchoolName, setManualSchoolName] = useState('')
  const [manualClassName, setManualClassName] = useState('')
  const [manualSeatNo, setManualSeatNo] = useState('')
  const [manualName, setManualName] = useState('')

  const [userRole, setUserRole] = useState<UserRole | ''>('國中學生')
  const [useContext, setUseContext] = useState<UseContext | ''>('正式課堂學習')
  const [animalClassificationExperience, setAnimalClassificationExperience] =
  useState<AnimalClassificationExperience | ''>('')

  const [lookupError, setLookupError] = useState('')
  const [matchedStudent, setMatchedStudent] = useState<LookupResult | null>(null)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isEntering, setIsEntering] = useState(false)

  useEffect(() => {
    async function loadData() {
      setIsLoadingRoster(true)
      setRosterLoadError('')
      setSchoolLoadError('')

      try {
        const rosterPromise = supabase
          .from('student_roster_lookup_view')
          .select(
            'student_id, school_code, class_name, seat_no, masked_name, full_name, active'
          )
          .order('school_code', { ascending: true })
          .order('class_name', { ascending: true })
          .order('seat_no', { ascending: true })
          .limit(10000)

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
          setRosterRows([])
          setRosterLoadError('載入學生名單失敗，請稍後再試。')
        } else {
          const rosterData = rosterResult.value.data ?? []
          const rosterError = rosterResult.value.error

          if (rosterError) {
            setRosterRows([])
            setRosterLoadError('載入學生名單失敗，請稍後再試。')
          } else {
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
          }
        }

        if (
          schoolDirectoryResult.status === 'fulfilled' &&
          !schoolDirectoryResult.value.error
        ) {
          const schoolRows: SchoolDirectoryRow[] = (
            schoolDirectoryResult.value.data ?? []
          ).map((item) => ({
            school_code: String(item.school_code),
            school_name: String(item.school_name),
            county: String(item.county),
            sort_order: Number(item.sort_order),
            is_active:
              item.is_active === undefined ? true : Boolean(item.is_active),
          }))

          setSchoolDirectoryRows(schoolRows)
          setSchoolLoadError('')
        } else {
          setSchoolDirectoryRows([])
          setSchoolLoadError('載入學校資料失敗，已改用學生名單中的學校代碼作為備援。')
        }
      } catch (error) {
        console.error('loadData error:', error)
        setRosterRows([])
        setSchoolDirectoryRows([])
        setRosterLoadError('載入學生名單失敗，請稍後再試。')
        setSchoolLoadError('載入學校資料失敗，請稍後再試。')
      } finally {
        setIsLoadingRoster(false)
      }
    }

    void loadData()
  }, [])

  const schoolOptions = useMemo<SchoolOption[]>(() => {
    if (schoolDirectoryRows.length > 0) {
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
    }

    const fallbackCodes = numericAwareSort(
      unique(
        rosterRows
          .map((row) => row.school_code)
          .filter((value) => value.trim() !== '')
      )
    )

    return fallbackCodes.map((code, index) => ({
      value: code,
      label: code,
      county: '',
      sortOrder: index,
    }))
  }, [schoolDirectoryRows, rosterRows])

  const filteredSchoolOptions = useMemo(() => {
    const keyword = schoolKeyword.trim()
    if (!keyword) return schoolOptions

    return schoolOptions.filter(
      (option) =>
        option.label.includes(keyword) ||
        option.value.includes(keyword) ||
        (option.county ?? '').includes(keyword)
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
    setEnterPassword('')
  }

  function handleModeChange(nextMode: EntryMode) {
  setEntryMode(nextMode)
  setLookupError('')
  setMatchedStudent(null)
  setEnterPassword('')

  if (nextMode === 'roster') {
    setUserRole('國中學生')
    setUseContext('正式課堂學習')
  } else {
    setUserRole('')
    setUseContext('')
  }

  setAnimalClassificationExperience('')
}

  function handleSchoolChange(nextSchoolCode: string) {
    setSchoolCode(nextSchoolCode)
    setClassName('')
    setSeatNo('')
    resetLookupState()
  }

  function handleClassChange(nextClassName: string) {
    setClassName(nextClassName)
    setSeatNo('')
    resetLookupState()
  }

  function handleSeatChange(value: string) {
  setSeatNo(value)
  setMatchedStudent(null)
  setEnterPassword('')
}

function getResearchBackground(mode: EntryMode) {
  return {
    userRole: mode === 'roster' ? '國中學生' : userRole,
    useContext: mode === 'roster' ? '正式課堂學習' : useContext,
    animalClassificationExperience,
  }
}

function validateResearchBackground(mode: EntryMode) {
  const background = getResearchBackground(mode)

  if (!background.userRole) {
    setLookupError('請選擇使用者身分。')
    return null
  }

  if (!background.useContext) {
    setLookupError('請選擇本次使用情境。')
    return null
  }

  if (!background.animalClassificationExperience) {
    setLookupError('請選擇是否已學過動物界分類單元。')
    return null
  }

  return background
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

  async function createEntrySession(
    base: LookupResult,
    mode: EntryMode,
    schoolDisplayName?: string
  ) {
  setLookupError('')

  const researchBackground = validateResearchBackground(mode)
  if (!researchBackground) return

  const platformMeta = resolvePlatformMode(mode)
  const enteredAt = new Date().toISOString()

  setIsEntering(true)

  try {
      const entrySession = {
      studentId: base.studentId,
      schoolCode: base.schoolCode,
      schoolDisplayName: schoolDisplayName ?? '',
      schoolYear: base.schoolYear,
      semester: base.semester,
      grade: base.grade,
      className: base.className,
      seatNo: base.seatNo,
      maskedName: base.maskedName,
      entryMode: mode,
      platformMode: platformMeta.platformMode,
      dataUseScope: platformMeta.dataUseScope,
      taskVariant: platformMeta.taskVariant,
      formalRosterImported: platformMeta.formalRosterImported,
      appVersion: APP_VERSION,
      itemBankVersion: ITEM_BANK_VERSION,
      rubricVersion: RUBRIC_VERSION,
      consentVersion: mode === 'roster' ? CONSENT_VERSION : undefined,
      assentAccepted: mode === 'roster',

      userRole: researchBackground.userRole,
      useContext: researchBackground.useContext,
      animalClassificationExperience:
        researchBackground.animalClassificationExperience || '不確定',
      learningExperience: mapLearningExperience(
        researchBackground.animalClassificationExperience
      ),
      learningExperienceLabel:
        researchBackground.animalClassificationExperience || '不確定',
      researchMode: platformMeta.researchMode,
      researchEntryVersion: APP_VERSION,

      enteredAt,
    }

      localStorage.setItem(
        'animal-classifier-enter-session',
        JSON.stringify(entrySession)
      )

      const params = new URLSearchParams({
  studentId: base.studentId,
  schoolCode: base.schoolCode,
  schoolYear: base.schoolYear,
  semester: base.semester,
  grade: base.grade,
  className: base.className,
  seatNo: base.seatNo,
  entryMode: mode,
  platformMode: platformMeta.platformMode,
  dataUseScope: platformMeta.dataUseScope,
  taskVariant: platformMeta.taskVariant,
  formalRosterImported: String(platformMeta.formalRosterImported),
  appVersion: APP_VERSION,
  itemBankVersion: ITEM_BANK_VERSION,
  rubricVersion: RUBRIC_VERSION,
  consentVersion: mode === 'roster' ? CONSENT_VERSION : '',
  assentAccepted: String(mode === 'roster'),
  enteredAt,
  userRole: researchBackground.userRole,
  useContext: researchBackground.useContext,
  animalClassificationExperience:
    researchBackground.animalClassificationExperience || '不確定',
  learningExperience: mapLearningExperience(
    researchBackground.animalClassificationExperience
  ),
  learningExperienceLabel:
    researchBackground.animalClassificationExperience || '不確定',
  researchMode: platformMeta.researchMode,
  researchEntryVersion: APP_VERSION,
})

      router.push(`${TARGET_PATH}?${params.toString()}`)
    } catch (error) {
      console.error('createEntrySession error:', error)
      setLookupError('進入活動失敗，請稍後再試。')
      setIsEntering(false)
    }
  }

  async function handleOfficialEnter() {
    if (!matchedStudent) {
      setLookupError('尚未確認學生資料，請先查詢姓名。')
      return
    }

    if (enterPassword.trim() !== ROSTER_ENTRY_PASSWORD) {
      setLookupError('進入密碼錯誤。')
      return
    }

    await createEntrySession(matchedStudent, 'roster', selectedSchoolLabel)
  }

  async function handleTrialEnter() {
    const school = manualSchoolName.trim()
    const cls = manualClassName.trim()
    const name = manualName.trim()
    const seat = manualSeatNo.trim()

    if (!school || !cls || !name) {
      setLookupError('請至少填寫學校、班級與姓名。')
      return
    }

    const manualEntry: LookupResult = {
      studentId: `manual-${Date.now()}`,
      schoolCode: `manual:${school}`,
      schoolYear: FIXED_SCHOOL_YEAR,
      semester: FIXED_SEMESTER,
      grade: inferGradeFromClassName(cls),
      className: cls,
      seatNo: seat,
      maskedName: name,
    }

    await createEntrySession(manualEntry, 'manual', school)
  }

  return (
    <main className="min-h-screen bg-[#f3f6f2] px-4 py-8 md:px-6">
      <div className="mx-auto max-w-2xl rounded-[28px] border border-[#d8ddd8] bg-white p-6 shadow-sm md:p-8">
        <div className="mb-8 text-center">
          <a
            href={LOGO_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-[#d7ddd7] bg-[#f7faf7] shadow-sm transition hover:scale-[1.02]"
          >
            <img
              src={LOGO_URL}
              alt="Sci-Flipper Logo"
              className="h-14 w-14 object-contain"
            />
          </a>

          <h1 className="text-4xl font-black tracking-tight text-[#234a2c]">
            Sci-Flipper 動物分類學習網站
          </h1>

          <p className="mt-3 text-base font-semibold text-[#4a5d4b]">
            動物分類自主學習網站入口
          </p>

          <p className="mt-2 text-sm leading-6 text-[#667266]">
            班級參與請使用班級名單登入；課程體驗可自行填寫學校、班級與姓名後進入。
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleModeChange('roster')}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              entryMode === 'roster'
                ? 'bg-[#234a2c] text-white hover:bg-[#1b3a22]'
                : 'border border-[#c8d2c8] bg-white text-[#234a2c]'
            }`}
          >
            班級參與
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('manual')}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              entryMode === 'manual'
                ? 'bg-[#234a2c] text-white hover:bg-[#1b3a22]'
                : 'border border-[#c8d2c8] bg-white text-[#234a2c]'
            }`}
          >
            課程體驗
          </button>
        </div>

        {entryMode === 'roster' ? (
          <>
            <div className="mb-4 rounded-xl border border-[#e6d8a8] bg-[#fff8df] px-4 py-3 text-sm leading-6 text-[#8b6a1a]">
              班級參與：供已匯入名單的教師及學生使用。此模式供班級教學診斷與後續去識別化分析使用。請先選擇學校、班級、座號並確認姓名；進入第一階段前需再輸入密碼。
            </div>

            {rosterLoadError ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {rosterLoadError}
              </div>
            ) : null}

            {schoolLoadError ? (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {schoolLoadError}
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#425142]">
                  搜尋學校
                </label>
                <input
                  value={schoolKeyword}
                  onChange={(e) => setSchoolKeyword(e.target.value)}
                  placeholder="可輸入校名、縣市或學校代碼"
                  className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#425142]">
                  學校
                </label>
                <select
                  value={schoolCode}
                  onChange={(e) => handleSchoolChange(e.target.value)}
                  disabled={isLoadingRoster || filteredSchoolOptions.length === 0}
                  className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">
                    {isLoadingRoster
                      ? '載入學校中…'
                      : filteredSchoolOptions.length === 0
                        ? '目前無可用學校資料'
                        : '請選擇學校'}
                  </option>

                  {filteredSchoolOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.county
                        ? `${option.label}（${option.county}）`
                        : option.label}
                    </option>
                  ))}
                </select>

                <div className="mt-1 text-xs text-[#708070]">
                  {isLoadingRoster
                    ? '載入中…'
                    : `目前可選 ${filteredSchoolOptions.length} 所學校`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#425142]">
                    班級
                  </label>
                  <select
                    value={className}
                    onChange={(e) => handleClassChange(e.target.value)}
                    disabled={!schoolCode || classOptions.length === 0}
                    className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
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
                  <label className="mb-1 block text-sm font-semibold text-[#425142]">
                    座號
                  </label>
                  <select
                    value={seatNo}
                    onChange={(e) => handleSeatChange(e.target.value)}
                    disabled={!className || seatOptions.length === 0}
                    className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    <option value="">
                      {className ? '請選擇座號' : '請先選班級'}
                    </option>

                    {seatOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={
                    isLookingUp || isEntering || !schoolCode || !className || !seatNo
                  }
                  className="rounded-xl bg-[#234a2c] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLookingUp ? '查詢中…' : '下一步：查詢姓名'}
                </button>
              </div>
            </div>

            {matchedStudent ? (
              <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="text-base font-bold text-[#1f3d23]">
                  你是「{matchedStudent.maskedName}」嗎？
                </div>

                <div className="mt-2 text-sm leading-6 text-[#425142]">
                  若正確，請輸入密碼後再進入第一階段。
                </div>

                <div className="mb-4 rounded-xl border border-[#dfe8df] bg-white px-4 py-3">
  <div className="mb-2 text-sm font-bold text-[#234a2c]">
    研究背景資料
  </div>

  <div className="mb-3 rounded-lg bg-[#f3f6f2] px-3 py-2 text-xs leading-5 text-[#667266]">
    班級參與將記錄為「國中學生」與「正式課堂學習」。請再選擇你目前對動物界分類單元的學習經驗。
  </div>

  <label className="mb-1 block text-sm font-semibold text-[#425142]">
    動物界分類單元學習經驗
  </label>
  <select
    value={animalClassificationExperience}
    onChange={(e) => {
      setAnimalClassificationExperience(
        e.target.value as AnimalClassificationExperience | ''
      )
      setLookupError('')
    }}
    className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
  >
    <option value="">請選擇</option>
    {ANIMAL_CLASSIFICATION_EXPERIENCE_OPTIONS.map((option) => (
      <option key={option} value={option}>
        {option}
      </option>
    ))}
  </select>
</div>

                <div className="mt-4">
                  <label className="mb-1 block text-sm font-semibold text-[#425142]">
                    密碼
                  </label>
                  <input
                    type="password"
                    value={enterPassword}
                    onChange={(e) => {
                      setEnterPassword(e.target.value)
                      setLookupError('')
                    }}
                    placeholder="請輸入密碼"
                    className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
                  />
                </div>

                <div className="mt-4 flex gap-3">
                  <button
  type="button"
  onClick={handleOfficialEnter}
  disabled={isEntering || !animalClassificationExperience}
  className="rounded-xl bg-[#234a2c] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
>
  {isEntering ? '進入中…' : '是，進入第一階段'}
</button>

                  <button
                    type="button"
                    onClick={resetLookupState}
                    disabled={isEntering}
                    className="rounded-xl border border-[#ccd5cc] px-4 py-3 text-sm font-bold text-[#425142] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    否，重新選擇
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {entryMode === 'manual' ? (
          <>
            <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
              課程體驗：若不在班級名單中，可自行填寫學校、班級、姓名後進入。
            </div>

            <div className="mb-4 rounded-xl border border-[#dfe8df] bg-white px-4 py-3">
  <div className="mb-3 text-sm font-bold text-[#234a2c]">
    體驗者背景資料
  </div>

  <div className="space-y-3">
    <div>
      <label className="mb-1 block text-sm font-semibold text-[#425142]">
        使用者身分
      </label>
      <select
        value={userRole}
        onChange={(e) => {
          setUserRole(e.target.value as UserRole | '')
          setLookupError('')
        }}
        className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
      >
        <option value="">請選擇</option>
        {USER_ROLE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-semibold text-[#425142]">
        本次使用情境
      </label>
      <select
        value={useContext}
        onChange={(e) => {
          setUseContext(e.target.value as UseContext | '')
          setLookupError('')
        }}
        className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
      >
        <option value="">請選擇</option>
        {USE_CONTEXT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-semibold text-[#425142]">
        動物界分類單元學習經驗
      </label>
      <select
        value={animalClassificationExperience}
        onChange={(e) => {
          setAnimalClassificationExperience(
            e.target.value as AnimalClassificationExperience | ''
          )
          setLookupError('')
        }}
        className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
      >
        <option value="">請選擇</option>
        {ANIMAL_CLASSIFICATION_EXPERIENCE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  </div>
</div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[#425142]">
                  學校
                </label>
                <input
                  value={manualSchoolName}
                  onChange={(e) => {
                    setManualSchoolName(e.target.value)
                    setLookupError('')
                  }}
                  placeholder="例如：臺中市光榮國中"
                  className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#425142]">
                    班級
                  </label>
                  <input
                    value={manualClassName}
                    onChange={(e) => {
                      setManualClassName(e.target.value)
                      setLookupError('')
                    }}
                    placeholder="例如：101"
                    className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#425142]">
                    座號（可選）
                  </label>
                  <input
                    value={manualSeatNo}
                    onChange={(e) => {
                      setManualSeatNo(e.target.value)
                      setLookupError('')
                    }}
                    placeholder="例如：12"
                    className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[#425142]">
                  姓名
                </label>
                <input
                  value={manualName}
                  onChange={(e) => {
                    setManualName(e.target.value)
                    setLookupError('')
                  }}
                  placeholder="請輸入姓名"
                  className="w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTrialEnter}
                  disabled={
  isEntering ||
  !manualSchoolName.trim() ||
  !manualClassName.trim() ||
  !manualName.trim() ||
  !userRole ||
  !useContext ||
  !animalClassificationExperience
}
                  className="rounded-xl bg-[#234a2c] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEntering ? '進入中…' : '直接進入第一階段'}
                </button>
              </div>
            </div>
          </>
        ) : null}

        {lookupError ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {lookupError}
          </div>
        ) : null}
      </div>
    </main>
  )
}