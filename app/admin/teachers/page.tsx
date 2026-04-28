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

function classKey(item: ClassOption) {
  return `${item.schoolCode}::${item.grade ?? ''}::${item.className}`
}

function labelClass(item: ClassOption) {
  return `${item.schoolName ?? item.schoolCode} ${item.grade ? `${item.grade}年級 ` : ''}${item.className}班`
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

  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({})
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string[]>>({})

  const classMap = useMemo(() => {
    const map = new Map<string, ClassOption>()
    for (const item of data?.availableClasses ?? []) {
      map.set(classKey(item), item)
    }
    return map
  }, [data?.availableClasses])

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
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新班級授權失敗')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            教師帳號管理
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            此頁用於建立教師帳號、重設密碼與設定可查看班級。資料權限仍由後端 API 檢查，不只靠前端篩選。
          </p>

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
            <div className="grid max-h-64 gap-2 overflow-auto rounded-xl border border-gray-200 p-3 md:grid-cols-2 lg:grid-cols-3">
              {(data?.availableClasses ?? []).map((item) => {
                const key = classKey(item)
                return (
                  <label key={key} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedClassKeys.includes(key)}
                      onChange={() => toggleClass(key)}
                      className="mt-1"
                    />
                    <span>{labelClass(item)}</span>
                  </label>
                )
              })}

              {data && data.availableClasses.length === 0 ? (
                <div className="text-sm text-gray-500">目前沒有可授權的班級資料。</div>
              ) : null}
            </div>
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
          <h2 className="text-2xl font-black text-gray-900">現有教師</h2>

          <div className="mt-4 space-y-4">
            {(data?.teachers ?? []).map((teacher) => {
              const draft = assignmentDrafts[teacher.id] ?? []
              return (
                <div key={teacher.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-lg font-black text-gray-900">
                        {teacher.displayName}
                      </div>
                      <div className="text-sm text-gray-600">
                        帳號：{teacher.username}｜狀態：{teacher.isActive ? '啟用' : '停用'}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        已授權班級：
                        {teacher.assignments.filter((item) => item.is_active).length > 0
                          ? teacher.assignments
                              .filter((item) => item.is_active)
                              .map((item) =>
                                labelClass({
                                  schoolCode: item.school_code,
                                  schoolName: item.school_name,
                                  grade: item.grade,
                                  className: item.class_name,
                                })
                              )
                              .join('、')
                          : '尚未授權'}
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
                    </div>
                  </div>

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

                  <div className="mt-5">
                    <div className="mb-2 text-sm font-bold text-gray-700">調整授權班級</div>
                    <div className="grid max-h-56 gap-2 overflow-auto rounded-xl border border-gray-200 p-3 md:grid-cols-2 lg:grid-cols-3">
                      {(data?.availableClasses ?? []).map((item) => {
                        const key = classKey(item)
                        return (
                          <label key={`${teacher.id}-${key}`} className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={draft.includes(key)}
                              onChange={() => {
                                const next = draft.includes(key)
                                  ? draft.filter((value) => value !== key)
                                  : [...draft, key]

                                setAssignmentDrafts((prev) => ({
                                  ...prev,
                                  [teacher.id]: next,
                                }))
                              }}
                              className="mt-1"
                            />
                            <span>{labelClass(item)}</span>
                          </label>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => saveAssignments(teacher.id)}
                      className="mt-3 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                    >
                      儲存班級授權
                    </button>
                  </div>
                </div>
              )
            })}

            {data && data.teachers.length === 0 ? (
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                目前尚無教師帳號。
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
