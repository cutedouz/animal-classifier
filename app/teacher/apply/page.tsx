'use client'

import { useMemo, useState, type FormEvent } from 'react'

type Purpose = '正式課堂教學' | '教師研習體驗' | '校內共備' | '研究或教學觀察' | '其他'

const PURPOSE_OPTIONS: Purpose[] = ['正式課堂教學', '教師研習體驗', '校內共備', '研究或教學觀察', '其他']

const INITIAL_FORM = {
  requestedUsername: '',
  teacherName: '',
  email: '',
  phone: '',
  county: '',
  schoolName: '',
  subject: '自然科',
  classNames: '',
  estimatedStudentCount: '',
  purpose: '正式課堂教學' as Purpose,
  note: '',
  consentConfirmed: false,
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

function isValidUsername(value: string) {
  return /^[a-zA-Z0-9_-]{4,32}$/.test(value)
}

export default function TeacherApplyPage() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ id: string; teacherName: string; requestedUsername: string } | null>(null)

  const classPreview = useMemo(() => {
    return form.classNames.split(/\n|,|、/).map((item) => item.trim()).filter(Boolean)
  }, [form.classNames])

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess(null)

    const requestedUsername = normalizeUsername(form.requestedUsername)

    if (!form.teacherName.trim()) return setError('請填寫教師姓名。')
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError('請填寫有效的 Email。')
    if (!form.schoolName.trim()) return setError('請填寫任教學校。')
    if (!requestedUsername || !isValidUsername(requestedUsername)) return setError('希望使用的帳號需為 4–32 個字元，只能包含英文、數字、底線或短橫線。')
    if (classPreview.length === 0) return setError('請至少填寫一個預計使用班級。')
    if (!form.consentConfirmed) return setError('請先勾選確認說明。')

    setSubmitting(true)

    try {
      const response = await fetch('/api/teacher-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          requestedUsername,
          estimatedStudentCount: form.estimatedStudentCount ? Number(form.estimatedStudentCount) : null,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || '送出申請失敗。')

      setSuccess({
        id: result.application.id,
        teacherName: result.application.teacherName,
        requestedUsername: result.application.requestedUsername,
      })
      setForm(INITIAL_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出申請失敗。')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#f3f6f2] px-4 py-8 md:px-6">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-[#d8ddd8] bg-white p-6 shadow-sm md:p-8">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <div className="text-sm font-bold text-green-700">申請已送出</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#234a2c]">{success.teacherName} 老師，您的申請已送出</h1>
            <p className="mt-3 text-sm leading-6 text-[#425142]">管理員審核後，會依您填寫的 Email 與您聯繫。申請通過後，您可使用教師診斷頁與學生名單管理功能。</p>
            <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#425142]">
              <div>申請帳號：<span className="font-bold">{success.requestedUsername}</span></div>
              <div>申請編號：<span className="font-mono text-xs">{success.id}</span></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/enter" className="rounded-xl border border-[#c8d2c8] bg-white px-4 py-3 text-sm font-bold text-[#234a2c]">返回入口頁</a>
              <a href="/teacher" className="rounded-xl bg-[#234a2c] px-4 py-3 text-sm font-bold text-white">前往教師診斷頁</a>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f3f6f2] px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-[#d8ddd8] bg-white p-6 shadow-sm md:p-8">
        <div className="mb-7">
          <a href="/enter" className="text-sm font-bold text-[#4a6b4d] hover:underline">← 返回入口頁</a>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-[#234a2c]">教師帳號申請</h1>
          <p className="mt-3 text-sm leading-6 text-[#667266]">若您想帶班級學生使用 Sci-Flipper 動物分類學習平台，請填寫下列表單。審核通過後，您將可登入教師診斷頁，並自行匯入班級學生名單。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-[#dfe8df] bg-[#fbfdfb] p-5">
            <h2 className="text-xl font-black text-[#234a2c]">基本資料</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="教師姓名 *" value={form.teacherName} onChange={(v) => update('teacherName', v)} placeholder="例如：王小明" />
              <Field label="Email *" type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="例如：teacher@example.com" />
              <Field label="聯絡電話" value={form.phone} onChange={(v) => update('phone', v)} placeholder="可選填" />
              <Field label="縣市" value={form.county} onChange={(v) => update('county', v)} placeholder="例如：臺中市" />
              <div className="md:col-span-2"><Field label="任教學校 *" value={form.schoolName} onChange={(v) => update('schoolName', v)} placeholder="例如：臺中市光榮國中" /></div>
              <Field label="任教科目" value={form.subject} onChange={(v) => update('subject', v)} placeholder="例如：自然科、生物科" />
              <Field label="希望使用的教師帳號 *" value={form.requestedUsername} onChange={(v) => update('requestedUsername', normalizeUsername(v))} placeholder="例如：teacher001" helper="4–32 個字元；限英文、數字、底線、短橫線。" />
            </div>
          </section>

          <section className="rounded-2xl border border-[#dfe8df] bg-[#fbfdfb] p-5">
            <h2 className="text-xl font-black text-[#234a2c]">班級與使用需求</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm font-bold text-[#425142]">預計使用班級 *</span>
                <textarea value={form.classNames} onChange={(e) => update('classNames', e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm" placeholder={'每行一個班級，例如：\n701\n702\n703'} />
                <span className="mt-1 block text-xs leading-5 text-[#708070]">目前偵測到 {classPreview.length} 個班級：{classPreview.join('、') || '尚未填寫'}</span>
              </label>

              <Field label="預計學生數" type="number" value={form.estimatedStudentCount} onChange={(v) => update('estimatedStudentCount', v)} placeholder="例如：90" />

              <label className="block">
                <span className="text-sm font-bold text-[#425142]">使用目的</span>
                <select value={form.purpose} onChange={(e) => update('purpose', e.target.value as Purpose)} className="mt-1 w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm">
                  {PURPOSE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-bold text-[#425142]">備註</span>
                <textarea value={form.note} onChange={(e) => update('note', e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm" placeholder="例如：預計於下週進行動物界單元教學、希望先測試一個班級。" />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e6d8a8] bg-[#fff8df] p-5">
            <label className="flex gap-3 text-sm leading-6 text-[#6d5319]">
              <input type="checkbox" checked={form.consentConfirmed} onChange={(e) => update('consentConfirmed', e.target.checked)} className="mt-1 h-4 w-4" />
              <span>我了解本平台將用於班級學習診斷與教師回饋；審核通過後，我會依需要管理班級學生名單，並提醒學生依班級參與方式登入。</span>
            </label>
          </section>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="flex flex-wrap justify-end gap-3">
            <a href="/enter" className="rounded-xl border border-[#c8d2c8] bg-white px-5 py-3 text-sm font-bold text-[#234a2c]">取消</a>
            <button type="submit" disabled={submitting} className="rounded-xl bg-[#234a2c] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{submitting ? '送出中…' : '送出申請'}</button>
          </div>
        </form>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  helper,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  helper?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#425142]">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-[#ccd5cc] px-3 py-2 text-sm" placeholder={placeholder} />
      {helper ? <span className="mt-1 block text-xs leading-5 text-[#708070]">{helper}</span> : null}
    </label>
  )
}
