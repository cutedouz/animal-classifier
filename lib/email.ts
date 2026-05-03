type TeacherApprovedEmailInput = {
  to: string
  teacherName: string
  username: string
  initialPassword: string
  schoolName: string
  classNames: string[]
}

type SendEmailResult = {
  sent: boolean
  id: string | null
  error: string | null
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_BASE_URL ||
    'https://animal-classifier-mu.vercel.app'
  ).replace(/\/$/, '')
}

function buildTeacherApprovedEmail(input: TeacherApprovedEmailInput) {
  const baseUrl = appBaseUrl()
  const teacherUrl = `${baseUrl}/teacher`
  const rosterUrl = `${baseUrl}/teacher/roster`
  const enterUrl = `${baseUrl}/enter`
  const accountUrl = `${baseUrl}/teacher/account`
  const classList = input.classNames.length > 0
    ? input.classNames.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>尚未設定班級，請登入後確認。</li>'

  const subject = `Sci-Flipper 教師帳號已建立：${input.username}`
  const html = `<!doctype html><html lang="zh-Hant"><body style="margin:0;padding:0;background:#f3f6f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC','Microsoft JhengHei',Arial,sans-serif;color:#1f2937;"><div style="max-width:680px;margin:0 auto;padding:24px;"><div style="background:#fff;border:1px solid #d8ddd8;border-radius:20px;padding:24px;"><h1 style="margin:0 0 12px;font-size:24px;color:#234a2c;">Sci-Flipper 教師帳號申請已通過</h1>
        <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:10px 12px;">
          若您在 Gmail 中只看到部分內容，請點選信件下方的「…」展開完整資訊。
        </p>
<p style="font-size:15px;line-height:1.8;">${escapeHtml(input.teacherName)} 老師您好，您的 Sci-Flipper 動物分類學習平台教師帳號已建立。</p><div style="background:#f7faf7;border:1px solid #dfe8df;border-radius:16px;padding:16px;margin:16px 0;"><p><strong>教師帳號：</strong>${escapeHtml(input.username)}</p><p><strong>初始密碼：</strong>${escapeHtml(input.initialPassword)}</p><p style="font-size:13px;line-height:1.7;color:#6b7280;">目前初始密碼預設與教師帳號相同。首次登入後，建議立即前往「教師帳號設定」修改密碼。</p></div><div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:12px 16px;margin:12px 0 18px;"><p><strong>學校：</strong>${escapeHtml(input.schoolName)}</p><ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;">${classList}</ul></div><div style="margin:18px 0;"><a href="${teacherUrl}" style="display:inline-block;background:#234a2c;color:white;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700;margin:0 8px 8px 0;">登入教師診斷頁</a><a href="${rosterUrl}" style="display:inline-block;background:#111827;color:white;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700;margin:0 8px 8px 0;">上傳學生名單</a></div><div style="background:#fff8df;border:1px solid #e6d8a8;border-radius:16px;padding:16px;margin:18px 0;"><p style="margin:0 0 8px;font-size:14px;color:#6d5319;"><strong>建議操作順序</strong></p><ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:#6d5319;"><li>先登入教師診斷頁。</li><li>進入學生名單管理頁，匯入班級學生名單。</li><li>提醒學生從學生入口頁選擇學校、班級與座號進入。</li><li>完成課堂活動後，回教師診斷頁查看班級分析。</li></ol></div><p style="font-size:14px;line-height:1.8;">教師診斷頁：<br><a href="${teacherUrl}">${teacherUrl}</a></p><p style="font-size:14px;line-height:1.8;">學生名單上傳頁：<br><a href="${rosterUrl}">${rosterUrl}</a></p><p style="font-size:14px;line-height:1.8;">學生入口頁：<br><a href="${enterUrl}">${enterUrl}</a></p><p style="font-size:14px;line-height:1.8;">教師帳號設定／修改密碼：<br><a href="${accountUrl}">${accountUrl}</a></p><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"><p style="font-size:12px;line-height:1.7;color:#6b7280;margin:0;">此信由 Sci-Flipper 動物分類學習平台系統寄出。</p></div></div></body></html>`
  const text = [
    subject,
    '',
    `${input.teacherName} 老師您好，您的 Sci-Flipper 動物分類學習平台教師帳號已建立。`,
    '',
    `教師帳號：${input.username}`,
    `初始密碼：${input.initialPassword}`,
    '目前初始密碼預設與教師帳號相同。首次登入後，建議立即前往教師帳號設定修改密碼。',
    '',
    `學校：${input.schoolName}`,
    `授權班級：${input.classNames.join('、') || '尚未設定班級，請登入後確認。'}`,
    '',
    `教師診斷頁：${teacherUrl}`,
    `學生名單上傳頁：${rosterUrl}`,
    `學生入口頁：${enterUrl}`,
    `教師帳號設定／修改密碼：${accountUrl}`,
  ].join('\n')

  return { subject, html, text }
}

export async function sendTeacherApprovedEmail(input: TeacherApprovedEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  const replyTo = process.env.EMAIL_REPLY_TO

  if (!apiKey) return { sent: false, id: null, error: 'RESEND_API_KEY missing' }
  if (!from) return { sent: false, id: null, error: 'EMAIL_FROM missing' }
  if (!input.to || !input.to.includes('@')) return { sent: false, id: null, error: 'invalid recipient email' }

  const email = buildTeacherApprovedEmail(input)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })

  const result = await response.json().catch(() => null)
  if (!response.ok) {
    return {
      sent: false,
      id: null,
      error: typeof result?.message === 'string' ? result.message : JSON.stringify(result ?? { status: response.status }),
    }
  }

  return { sent: true, id: typeof result?.id === 'string' ? result.id : null, error: null }
}
