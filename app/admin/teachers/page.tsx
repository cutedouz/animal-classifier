'use client'

import { useEffect, useMemo, useState } from 'react'

type ClassOption = {
  schoolCode: string
  schoolName: string | null
  grade: string | null
  className: string
}

type AssignmentRow = {
  id: string
  teacher_id: string
  school_code: string
  school_name: string | null
  grade: string | null
  class_name: string
  is_active: boolean
}

type TeacherRow = {
  id: string
  username: string
  email: string | null
  displayName: string
  isActive: boolean
  note: string | null
  assignments: AssignmentRow[]
}

type ApiState = {
  teachers: TeacherRow[]
  availableClasses: ClassOption[]
}

type ClassFilterState = {
  search: string
  schoolCode: string
  hideExperienceClasses: boolean
}

function classKey(item: ClassOption) {
  return `${item.schoolCode}::${item.grade ?? ''}::${item.className}`
}

function labelClass(item: ClassOption) {
  return `${item.schoolName ?? item.schoolCode} ${item.grade ? `${item.grade}年級 ` : ''}${item.className}班`
}

function classSearchText(item: ClassOption) {
  return [
    item.schoolCode,
    item.schoolName ?? '',
    item.grade ?? '',
    item.className,
    labelClass(item),
  ]
    .join(' ')
    .toLowerCase()
}

function isExperienceOrTestClass(item: ClassOption) {
  const text = classSearchText(item)
  return (
    text.includes('manual:') ||
    text.includes('demo') ||
    text.includes('test') ||
    text.includes('測試') ||
    text.includes('體驗') ||
    text.includes('上線測試')
  )
}

const DEFAULT_CLASS_FILTER: ClassFilterState = {
  search: '',
  schoolCode: '',
  hideExperienceClasses: true,
}

export default function AdminTeachersPage() {
  const [adminPassword, setAdminPassword] = useState('')
  const [data, setData] = useState<ApiState | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedClassKeys, setSelectedClassKeys] = useState<string[]>([])
  const [createClassFilter, setCreateClassFilter] = useState<ClassFilterState>(DEFAULT_CLASS_FILTER)

  const [teacherSearch, setTeacherSearch] = useState('')
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [editingTeacherIds, setEditingTeacherIds] = useState<Record<string, boolean>>({})
  const [teacherClassFilters, setTeacherClassFilters] = useState<Record<string, ClassFilterState>>({})

  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string[]>>({})
  const [assignmentSavingId, setAssignmentSavingId] = useState('')
  const [assignmentMessages, setAssignmentMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({})

  const classMap = useMemo(() => {
    const map = new Map<string, ClassOption>()
    for (const item of data?.availableClasses ?? []) {
      map.set(classKey(item), item)
    }
    return map
  }, [data?.availableClasses])

  const availableSchoolOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of data?.availableClasses ?? []) {
      map.set(item.schoolCode, item.schoolName ?? item.schoolCode)
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'zh-Hant'))
  }, [data?.availableClasses])

  const visibleCreateClasses = useMemo(() => {
    return filterClassOptions(data?.availableClasses ?? [], createClassFilter)
  }, [data?.availableClasses, createClassFilter])

  const visibleTeachers = useMemo(() => {
    const keyword = teacherSearch.trim().toLowerCase()

    return (data?.teachers ?? []).filter((teacher) => {
      if (teacherStatusFilter === 'active' && !teacher.isActive) return false
      if (teacherStatusFilter === 'inactive' && teacher.isActive) return false

      if (!keyword) return true

      const activeAssignments = teacher.assignments
        .filter((item) => item.is_active)
        .map((item) =>
          labelClass({
            schoolCode: item.school_code,
            schoolName: item.school_name,
            grade: item.grade,
            className: item.class_name,
          })
        )
        .join(' ')

      const text = [
        teacher.username,
        teacher.displayName,
        teacher.email ?? '',
        teacher.note ?? '',
        activeAssignments,
      ]
        .join(' ')
        .toLowerCase()

      return text.includes(keyword)
    })
  }, [data?.teachers, teacherSearch, teacherStatusFilter])

  async function loadData() {
    if (!adminPassword) {
      setError('請先輸入管理密碼。')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/teachers', {
        headers: {
          'x-admin-password': adminPassword,
        },
        cache: 'no-store',
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || '讀取教師資料失敗')

      setData({
        teachers: result.teachers ?? [],
        availableClasses: result.availableClasses ?? [],
      })

      const drafts: Record<string, string[]> = {}
      for (const teacher of result.teachers ?? []) {
        drafts[teacher.id] = (teacher.assignments ?? [])
          .filter((assignment: AssignmentRow) => assignment.is_active)
          .map((assignment: AssignmentRow) =>
            classKey({
              schoolCode: assignment.school_code,
              schoolName: assignment.school_name,
              grade: assignment.grade,
              className: assignment.class_name,
            })
          )
      }
      setAssignmentDrafts(drafts)
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取教師資料失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem('sf-admin-password')
    if (saved) setAdminPassword(saved)
  }, [])

  function rememberAdminPassword(value: string) {
    setAdminPassword(value)
    window.localStorage.setItem('sf-admin-password', value)
  }

  function toggleClass(key: string, source: string[] = selectedClassKeys, setter = setSelectedClassKeys) {
    setter(source.includes(key) ? source.filter((item) => item !== key) : [...source, key])
  }

  function selectedAssignments(keys: string[]) {
    return keys
      .map((key) => classMap.get(key))
      .filter(Boolean)
      .map((item) => ({
        schoolCode: item!.schoolCode,
        schoolName: item!.schoolName,
        grade: item!.grade,
        className: item!.className,
      }))
  }

  function getTeacherClassFilter(teacherId: string): ClassFilterState {
    return teacherClassFilters[teacherId] ?? DEFAULT_CLASS_FILTER
  }

  function setTeacherClassFilter(teacherId: string, next: ClassFilterState) {
    setTeacherClassFilters((prev) => ({
      ...prev,
      [teacherId]: next,
    }))
  }

  function openTeacherEdit(teacher: TeacherRow) {
    setEditingTeacherIds((prev) => ({ ...prev, [teacher.id]: true }))
    setAssignmentMessages((prev) => {
      const next = { ...prev }
      delete next[teacher.id]
      return next
    })

    if (!teacherClassFilters[teacher.id]) {
      const active = teacher.assignments.find((item) => item.is_active)
      setTeacherClassFilters((prev) => ({
        ...prev,
        [teacher.id]: {
          ...DEFAULT_CLASS_FILTER,
          schoolCode: active?.school_code ?? '',
        },
      }))
    }
  }

  function closeTeacherEdit(teacher: TeacherRow) {
    const restored = teacher.assignments
      .filter((assignment) => assignment.is_active)
      .map((assignment) =>
        classKey({
          schoolCode: assignment.school_code,
          schoolName: assignment.school_name,
          grade: assignment.grade,
          className: assignment.class_name,
        })
      )

    setAssignmentDrafts((prev) => ({ ...prev, [teacher.id]: restored }))
    setEditingTeacherIds((prev) => ({ ...prev, [teacher.id]: false }))
    setAssignmentMessages((prev) => {
      const next = { ...prev }
      delete next[teacher.id]
      return next
    })
  }

  async function createTeacher() {
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword,
          username,
          displayName,
          email: email || null,
          password,
          assignments: selectedAssignments(selectedClassKeys),
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || '新增教師失敗')

      setUsername('')
      setDisplayName('')
      setEmail('')
      setPassword('')
      setSelectedClassKeys([])
      setMessage('已新增教師。')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '新增教師失敗')
    }
  }

  async function resetPassword(teacherId: string) {
    const nextPassword = resetPasswords[teacherId] ?? ''
    if (!nextPassword) {
      setError('請輸入新密碼。')
      return
    }

    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword,
          action: 'reset_password',
          teacherId,
          password: nextPassword,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || '重設密碼失敗')

      setResetPasswords((prev) => ({ ...prev, [teacherId]: '' }))
      setMessage('已重設教師密碼。')
    } catch (err) {
      setError(err instanceof Error ? err.message : '重設密碼失敗')
    }
  }

  async function setActive(teacherId: string, isActive: boolean) {
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword,
          action: 'set_active',
          teacherId,
          isActive,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || '更新教師狀態失敗')

      setMessage(isActive ? '已啟用教師帳號。' : '已停用教師帳號。')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新教師狀態失敗')
    }
  }

  async function saveAssignments(teacherId: string) {
    setError('')
    setMessage('')
    setAssignmentSavingId(teacherId)
    setAssignmentMessages((prev) => {
      const next = { ...prev }
      delete next[teacherId]
      return next
    })

    try {
      const response = await fetch('/api/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminPassword,
          action: 'replace_assignments',
          teacherId,
          assignments: selectedAssignments(assignmentDrafts[teacherId] ?? []),
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || '更新班級授權失敗')

      setMessage('已更新班級授權。')
      setAssignmentMessages((prev) => ({
        ...prev,
        [teacherId]: {
          type: 'success',
          text: '已更新班級授權。教師重新整理教師頁或重新登入後即可套用最新權限。',
        },
      }))
      setEditingTeacherIds((prev) => ({ ...prev, [teacherId]: false }))
      await loadData()
    } catch (err) {
      const text = err instanceof Error ? err.message : '更新班級授權失敗'
      setError(text)
      setAssignmentMessages((prev) => ({
        ...prev,
        [teacherId]: {
          type: 'error',
          text,
        },
      }))
    } finally {
      setAssignmentSavingId('')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">
                教師帳號管理
              </h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                此頁用於建立教師帳號、重設密碼與設定可查看班級。資料權限仍由後端 API 檢查，不只靠前端篩選。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href="/admin" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                管理中心
              </a>
              <a href="/teacher/account" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                教師帳號設定頁
              </a>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => rememberAdminPassword(event.target.value)}
              placeholder="管理密碼 ADMIN_PASSWORD"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:max-w-sm"
            />
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
            >
              {loading ? '讀取中…' : '讀取教師資料'}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {message}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black text-gray-900">新增教師</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="教師帳號，例如 teacher001"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="教師姓名"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email（可選）"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="初始密碼，至少 6 字元"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-bold text-gray-700">授權班級</div>
            <ClassFilterPanel
              filter={createClassFilter}
              setFilter={setCreateClassFilter}
              availableSchoolOptions={availableSchoolOptions}
              visibleCount={visibleCreateClasses.length}
              totalCount={data?.availableClasses.length ?? 0}
            />

            <SelectedClassChips
              title="新增教師已勾選的授權班級"
              selectedKeys={selectedClassKeys}
              classMap={classMap}
              onRemove={(key) => setSelectedClassKeys((prev) => prev.filter((value) => value !== key))}
            />

            <ScrollableClassPicker
              classes={visibleCreateClasses}
              selectedKeys={selectedClassKeys}
              onToggle={(key) => toggleClass(key)}
              emptyText="目前沒有符合篩選條件的可授權班級。"
            />
          </div>

          <button
            type="button"
            onClick={createTeacher}
            className="mt-5 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            新增教師
          </button>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900">現有教師</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                預設只顯示各教師目前已授權班級。需要調整時，按「修改授權」再展開班級選擇器。
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto] lg:min-w-[520px]">
              <input
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="搜尋教師、帳號、Email 或已授權班級"
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={teacherStatusFilter}
                onChange={(event) => setTeacherStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="all">全部狀態</option>
                <option value="active">只看啟用</option>
                <option value="inactive">只看停用</option>
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
            顯示 {visibleTeachers.length} / {data?.teachers.length ?? 0} 位教師
          </div>

          <div className="mt-4 space-y-4">
            {visibleTeachers.map((teacher) => {
              const draft = assignmentDrafts[teacher.id] ?? []
              const activeAssignments = teacher.assignments.filter((item) => item.is_active)
              const isEditing = editingTeacherIds[teacher.id] === true
              const teacherFilter = getTeacherClassFilter(teacher.id)
              const visibleTeacherClasses = filterClassOptions(data?.availableClasses ?? [], teacherFilter)
              const inlineMessage = assignmentMessages[teacher.id]

              return (
                <div key={teacher.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-gray-900">
                          {teacher.displayName}
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${teacher.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {teacher.isActive ? '啟用' : '停用'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        帳號：{teacher.username}｜Email：{teacher.email ?? '—'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActive(teacher.id, !teacher.isActive)}
                        className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"
                      >
                        {teacher.isActive ? '停用' : '啟用'}
                      </button>

                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => closeTeacherEdit(teacher)}
                          className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"
                        >
                          取消修改
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openTeacherEdit(teacher)}
                          className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white"
                        >
                          修改授權
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-bold text-gray-700">
                        目前授權班級
                      </div>
                      <div className="text-xs text-gray-500">
                        {activeAssignments.length} 個班級
                      </div>
                    </div>

                    {activeAssignments.length > 0 ? (
                      <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
                        {activeAssignments.map((item) => (
                          <span
                            key={`${teacher.id}-${item.school_code}-${item.grade ?? ''}-${item.class_name}`}
                            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700"
                          >
                            {labelClass({
                              schoolCode: item.school_code,
                              schoolName: item.school_name,
                              grade: item.grade,
                              className: item.class_name,
                            })}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">尚未授權任何班級。</div>
                    )}
                  </div>

                  {inlineMessage ? (
                    <div
                      className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                        inlineMessage.type === 'success'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {inlineMessage.text}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <input
                      type="password"
                      value={resetPasswords[teacher.id] ?? ''}
                      onChange={(event) =>
                        setResetPasswords((prev) => ({
                          ...prev,
                          [teacher.id]: event.target.value,
                        }))
                      }
                      placeholder="輸入新密碼"
                      className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => resetPassword(teacher.id)}
                      className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      重設密碼
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="mb-2 text-sm font-bold text-gray-700">
                        調整授權班級
                      </div>

                      <ClassFilterPanel
                        filter={teacherFilter}
                        setFilter={(next) => setTeacherClassFilter(teacher.id, next)}
                        availableSchoolOptions={availableSchoolOptions}
                        visibleCount={visibleTeacherClasses.length}
                        totalCount={data?.availableClasses.length ?? 0}
                      />

                      <SelectedClassChips
                        title="目前已勾選的授權班級"
                        selectedKeys={draft}
                        classMap={classMap}
                        onRemove={(key) => {
                          setAssignmentDrafts((prev) => ({
                            ...prev,
                            [teacher.id]: (prev[teacher.id] ?? []).filter((value) => value !== key),
                          }))
                        }}
                      />

                      <ScrollableClassPicker
                        classes={visibleTeacherClasses}
                        selectedKeys={draft}
                        onToggle={(key) => {
                          const next = draft.includes(key)
                            ? draft.filter((value) => value !== key)
                            : [...draft, key]

                          setAssignmentDrafts((prev) => ({
                            ...prev,
                            [teacher.id]: next,
                          }))
                        }}
                        emptyText="目前沒有符合篩選條件的可授權班級。"
                      />

                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => closeTeacherEdit(teacher)}
                          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => saveAssignments(teacher.id)}
                          disabled={assignmentSavingId === teacher.id}
                          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          {assignmentSavingId === teacher.id ? '儲存中…' : '儲存班級授權'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}

            {data && visibleTeachers.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                目前沒有符合篩選條件的教師帳號。
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}

function filterClassOptions(classes: ClassOption[], filter: ClassFilterState) {
  const keyword = filter.search.trim().toLowerCase()

  return classes.filter((item) => {
    if (filter.schoolCode && item.schoolCode !== filter.schoolCode) return false
    if (filter.hideExperienceClasses && isExperienceOrTestClass(item)) return false
    if (keyword && !classSearchText(item).includes(keyword)) return false
    return true
  })
}

function ClassFilterPanel({
  filter,
  setFilter,
  availableSchoolOptions,
  visibleCount,
  totalCount,
}: {
  filter: ClassFilterState
  setFilter: (value: ClassFilterState) => void
  availableSchoolOptions: Array<[string, string]>
  visibleCount: number
  totalCount: number
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
        <input
          value={filter.search}
          onChange={(event) => setFilter({ ...filter, search: event.target.value })}
          placeholder="搜尋學校、年級、班級，例如：南新、708、701"
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
        />

        <select
          value={filter.schoolCode}
          onChange={(event) => setFilter({ ...filter, schoolCode: event.target.value })}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">全部學校</option>
          {availableSchoolOptions.map(([schoolCode, schoolName]) => (
            <option key={schoolCode} value={schoolCode}>
              {schoolName}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setFilter(DEFAULT_CLASS_FILTER)}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
        >
          清除篩選
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-gray-600">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={filter.hideExperienceClasses}
            onChange={(event) =>
              setFilter({
                ...filter,
                hideExperienceClasses: event.target.checked,
              })
            }
          />
          隱藏 demo／manual／測試／體驗班級
        </label>

        <span>
          顯示 {visibleCount} / {totalCount} 個可授權班級
        </span>
      </div>
    </div>
  )
}


function classOptionFromKey(key: string, classMap: Map<string, ClassOption>): ClassOption {
  const existing = classMap.get(key)
  if (existing) return existing

  const [schoolCode, grade, className] = key.split('::')
  return {
    schoolCode: schoolCode || 'unknown',
    schoolName: schoolCode || 'unknown',
    grade: grade || null,
    className: className || 'unknown',
  }
}

function SelectedClassChips({
  title,
  selectedKeys,
  classMap,
  onRemove,
}: {
  title: string
  selectedKeys: string[]
  classMap: Map<string, ClassOption>
  onRemove: (key: string) => void
}) {
  return (
    <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-blue-900">{title}</div>
        <div className="text-xs text-blue-700">{selectedKeys.length} 個班級</div>
      </div>

      {selectedKeys.length > 0 ? (
        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1">
          {selectedKeys.map((key) => {
            const item = classOptionFromKey(key, classMap)
            return (
              <span
                key={key}
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-900"
              >
                <span>{labelClass(item)}</span>
                <button
                  type="button"
                  onClick={() => onRemove(key)}
                  className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-800 hover:bg-blue-200"
                  aria-label={`移除 ${labelClass(item)}`}
                  title="移除此授權班級"
                >
                  x
                </button>
              </span>
            )
          })}
        </div>
      ) : (
        <div className="text-sm text-blue-700">尚未勾選任何班級。</div>
      )}

      <p className="mt-2 text-xs leading-5 text-blue-700">
        這裡會列出所有已勾選班級，不受下方搜尋或學校篩選影響。若要取消某班授權，請直接按該班級旁的 x。
      </p>
    </div>
  )
}

function ScrollableClassPicker({
  classes,
  selectedKeys,
  onToggle,
  emptyText,
}: {
  classes: ClassOption[]
  selectedKeys: string[]
  onToggle: (key: string) => void
  emptyText: string
}) {
  return (
    <div className="mt-3 h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((item) => {
          const key = classKey(item)
          return (
            <label key={key} className="flex items-start gap-2 rounded-lg px-2 py-1 text-sm hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selectedKeys.includes(key)}
                onChange={() => onToggle(key)}
                className="mt-1"
              />
              <span>{labelClass(item)}</span>
            </label>
          )
        })}

        {classes.length === 0 ? (
          <div className="col-span-full text-sm text-gray-500">{emptyText}</div>
        ) : null}
      </div>
    </div>
  )
}
