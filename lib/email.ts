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
  provider?: 'gmail_gas'
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
  const classText = input.classNames.join('、') || '尚未設定班級，請登入後確認。'
  const subject = `Sci-Flipper 教師帳號已建立：${input.username}`

  const html = `<!doctype html>
<html lang="zh-Hant">
  <body style="margin:0;padding:20px;background:#f6f8f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans TC','Microsoft JhengHei',Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:22px;">
      <h1 style="margin:0 0 14px;font-size:22px;line-height:1.35;color:#234a2c;">Sci-Flipper 教師帳號已建立</h1>

      <p style="margin:0 0 14px;font-size:15px;line-height:1.7;">
        ${escapeHtml(input.teacherName)} 老師您好，您的教師帳號已核准。
      </p>

      <div style="background:#f7faf7;border:1px solid #dfe8df;border-radius:14px;padding:14px;margin:14px 0;">
        <p style="margin:0 0 8px;font-size:15px;"><strong>教師帳號：</strong>${escapeHtml(input.username)}</p>
        <p style="margin:0 0 8px;font-size:15px;"><strong>初始密碼：</strong>${escapeHtml(input.initialPassword)}</p>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
          初始密碼預設與教師帳號相同。首次登入後，請至「教師帳號設定」修改密碼。
        </p>
      </div>

      <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:10px 12px;">
        若您在 Gmail 中只看到部分內容，請點選信件下方的「…」展開完整資訊。
      </p>

      <div style="margin:16px 0;">
        <a href="${teacherUrl}" style="display:block;background:#234a2c;color:white;text-decoration:none;border-radius:10px;padding:12px 14px;font-weight:700;margin-bottom:8px;">登入教師診斷頁</a>
        <a href="${rosterUrl}" style="display:block;background:#111827;color:white;text-decoration:none;border-radius:10px;padding:12px 14px;font-weight:700;margin-bottom:8px;">上傳學生名單</a>
        <a href="${enterUrl}" style="display:block;background:#374151;color:white;text-decoration:none;border-radius:10px;padding:12px 14px;font-weight:700;margin-bottom:8px;">學生入口頁</a>
        <a href="${accountUrl}" style="display:block;background:#4b5563;color:white;text-decoration:none;border-radius:10px;padding:12px 14px;font-weight:700;">修改教師密碼</a>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:14px;margin:14px 0;">
        <p style="margin:0 0 8px;font-size:14px;"><strong>授權學校：</strong>${escapeHtml(input.schoolName)}</p>
        <p style="margin:0;font-size:14px;line-height:1.7;"><strong>授權班級：</strong>${escapeHtml(classText)}</p>
      </div>

      <p style="margin:14px 0 0;font-size:13px;line-height:1.7;color:#4b5563;">
        建議流程：先登入教師診斷頁，再到學生名單管理頁上傳班級名單，之後提供學生入口頁給學生使用。
      </p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;">
      <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0;">此信由 Sci-Flipper 動物分類學習平台系統寄出。</p>
    </div>
  </body>
</html>`

  const text = [
    subject,
    '',
    `${input.teacherName} 老師您好，您的教師帳號已核准。`,
    '',
    `教師帳號：${input.username}`,
    `初始密碼：${input.initialPassword}`,
    '初始密碼預設與教師帳號相同。首次登入後，請至教師帳號設定修改密碼。',
    '',
    '若您在 Gmail 中只看到部分內容，請點選信件下方的「…」展開完整資訊。',
    '',
    `教師診斷頁：${teacherUrl}`,
    `學生名單上傳頁：${rosterUrl}`,
    `學生入口頁：${enterUrl}`,
    `教師帳號設定／修改密碼：${accountUrl}`,
    '',
    `授權學校：${input.schoolName}`,
    `授權班級：${classText}`,
  ].join('\n')

  return { subject, html, text }
}

export async function sendTeacherApprovedEmail(input: TeacherApprovedEmailInput): Promise<SendEmailResult> {
  const gasWebappUrl = process.env.GAS_WEBAPP_URL
  const gasSecret = process.env.GAS_WEBAPP_SECRET
  const replyTo = process.env.EMAIL_REPLY_TO

  if (!gasWebappUrl) return { sent: false, id: null, error: 'GAS_WEBAPP_URL missing', provider: 'gmail_gas' }
  if (!gasSecret) return { sent: false, id: null, error: 'GAS_WEBAPP_SECRET missing', provider: 'gmail_gas' }
  if (!input.to || !input.to.includes('@')) return { sent: false, id: null, error: 'invalid recipient email', provider: 'gmail_gas' }

  const email = buildTeacherApprovedEmail(input)

  try {
    const response = await fetch(gasWebappUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret: gasSecret,
        to: input.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: replyTo || '',
      }),
      redirect: 'follow',
    })

    const result = await response.json().catch(() => null)

    if (!response.ok || !result?.ok) {
      return {
        sent: false,
        id: null,
        error: typeof result?.error === 'string' ? result.error : `GAS email failed: HTTP ${response.status}`,
        provider: 'gmail_gas',
      }
    }

    return {
      sent: true,
      id: typeof result.messageId === 'string' ? result.messageId : `gas-${Date.now()}`,
      error: null,
      provider: 'gmail_gas',
    }
  } catch (error) {
    return {
      sent: false,
      id: null,
      error: error instanceof Error ? error.message : 'GAS email request failed',
      provider: 'gmail_gas',
    }
  }
}
