'use client'

import { useEffect, useState, type FormEvent } from 'react'

type TeacherInfo = {
  id: string
  username: string | null
  email: string | null
  displayName: string
  isSuperAdmin?: boolean
}

type AccountResponse = {
  ok: true
  teacher: TeacherInfo
  assignments: Array<{
    school_code: string
    school_name: string | null
    grade: string | null
    class_name: string
  }>
  isSuperAdmin: boolean
}

export default function TeacherAccountPage() {
  const [data, setData] = useState<AccountResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  async function loadAccount() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/teacher-account', { cache: 'no-store' })
      const json = await response.json()
      if (response.status === 401) {
        setAuthRequired(true)
        setData(null)
        return
      }
      if (!response.ok) throw new Error(json?.error || '讀取教師帳號資料失敗。')
      setAuthRequired(false)
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取教師帳號資料失敗。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAccount()
  }, [])

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
    setSuccess('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('請完整輸入目前密碼、新密碼與確認密碼。')
      return
    }
    if (form.newPassword.length < 8) {
      setError('新密碼至少需 8 個字元。')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('兩次輸入的新密碼不一致。')
      return
    }
    if (form.currentPassword === form.newPassword) {
      setError('新密碼不可與目前密碼相同。')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/teacher-account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error || '更新密碼失敗。')

      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSuccess('密碼已更新。系統將帶您回教師登入頁，請使用新密碼重新登入。')
      setTimeout(() => {
        window.location.href = '/teacher'
      }, 1600)
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新密碼失敗。')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTeacherLogout() {
    await fetch('/api/teacher-logout', { method: 'POST' })
    window.location.href = '/teacher'
  }

  if (authRequired) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-gray-900">教師帳號設定</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            請先登入教師診斷頁，再進入帳號設定。
          </p>
          <a href="/teacher" className="mt-5 inline-flex rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white">
            前往教師登入
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">教師帳號設定</h1>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                您可以在此變更教師登入密碼。密碼更新後，系統會清除目前登入狀態，請使用新密碼重新登入。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="/teacher" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                回教師診斷頁
              </a>
              <a href="/teacher/roster" className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                學生名單管理
              </a>
              <button type="button" onClick={handleTeacherLogout} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                登出
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">讀取中…</div>
          ) : null}

          {data?.teacher ? (
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
              <div>目前登入：<span className="font-bold text-gray-900">{data.teacher.displayName}</span></div>
              <div>帳號：<span className="font-mono text-gray-900">{data.teacher.username ?? '—'}</span></div>
              <div>Email：{data.teacher.email ?? '—'}</div>
              <div>權限：{data.isSuperAdmin ? 'super teacher，可查看所有班級' : `一般教師，授權班級 ${data.assignments.length} 個`}</div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {success ? (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-gray-900">修改密碼</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            新密碼至少 8 個字元。請避免使用與初始密碼相同或容易猜測的密碼。
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <PasswordField label="目前密碼" value={form.currentPassword} onChange={(value) => updateField('currentPassword', value)} />
            <PasswordField label="新密碼" value={form.newPassword} onChange={(value) => updateField('newPassword', value)} />
            <PasswordField label="再次輸入新密碼" value={form.confirmPassword} onChange={(value) => updateField('confirmPassword', value)} />

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm leading-6 text-yellow-900">
              修改成功後，所有已登入的教師工作階段都會失效。請重新登入。
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={submitting || loading} className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300">
                {submitting ? '更新中…' : '更新密碼'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-gray-700">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
        autoComplete="new-password"
      />
    </label>
  )
}
