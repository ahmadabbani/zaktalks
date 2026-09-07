const BRAND_TEAL = '#258C9B'
const BRAND_BLACK = '#212C2D'
const BRAND_YELLOW = '#F4C400'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function normalizedUrl(value) {
  const url = String(value || '').trim()
  return /^https?:\/\//i.test(url) ? url : ''
}

function recipientFirstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || 'there'
}

function brandMark(logoUrl) {
  const safeLogoUrl = normalizedUrl(logoUrl)

  if (safeLogoUrl) {
    return `<img src="${escapeHtml(safeLogoUrl)}" width="148" alt="Okayness" style="display:block;width:148px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">`
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td width="10" style="width:10px;padding:0;vertical-align:middle;"><span style="display:block;width:10px;height:10px;border-radius:50%;background:${BRAND_YELLOW};font-size:0;line-height:10px;">&nbsp;</span></td>
      <td style="padding-left:10px;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;letter-spacing:2.4px;line-height:1;text-transform:uppercase;">Okayness</td>
    </tr>
  </table>`
}

export function buildCourseInactivityEmail({
  firstName,
  courseName,
  lastLessonName,
  nextLessonName,
  progressPercentage,
  resumeUrl,
  preferencesUrl,
  appUrl,
  supportEmail = 'hello@okayness.com',
  logoUrl = '',
}) {
  const displayName = recipientFirstName(firstName)
  const progress = Math.min(100, Math.max(0, Math.round(Number(progressPercentage) || 0)))
  const safeName = escapeHtml(displayName)
  const safeCourseName = escapeHtml(courseName || 'your course')
  const safeLastLesson = escapeHtml(lastLessonName || nextLessonName || 'Your course introduction')
  const safeNextLesson = escapeHtml(nextLessonName || lastLessonName || 'Your next lesson')
  const safeResumeUrl = normalizedUrl(resumeUrl)
  const safePreferencesUrl = normalizedUrl(preferencesUrl)
  const safeAppUrl = normalizedUrl(appUrl)
  const safeSupportEmail = escapeHtml(supportEmail)
  const subject = `We saved your place in ${courseName || 'your course'}`
  const previewText = 'No pressure. Your next lesson is still there when you are ready.'

  const resumeAction = safeResumeUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
        <tr>
          <td bgcolor="${BRAND_TEAL}" style="border-radius:999px;text-align:center;">
            <a href="${escapeHtml(safeResumeUrl)}" style="display:inline-block;padding:14px 25px;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;text-decoration:none;">Resume where you left off&nbsp;&nbsp;&#8594;</a>
          </td>
        </tr>
      </table>`
    : ''

  const preferencesCopy = safePreferencesUrl
    ? `You can <a href="${escapeHtml(safePreferencesUrl)}" style="color:${BRAND_TEAL};font-weight:700;text-decoration:none;">manage non-essential course reminders</a> through your account preferences.`
    : `For help with course reminders, contact <a href="mailto:${safeSupportEmail}" style="color:${BRAND_TEAL};font-weight:700;text-decoration:none;">${safeSupportEmail}</a>.`

  const websiteLink = safeAppUrl
    ? `<a href="${escapeHtml(safeAppUrl)}" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">Website</a><span style="padding:0 8px;color:#A5ADAD;">&middot;</span>`
    : ''

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F3F6F5;color:${BRAND_BLACK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${previewText}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F3F6F5;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#FFFFFF;border:1px solid #E5EBEA;border-radius:24px;overflow:hidden;box-shadow:0 14px 36px rgba(33,44,45,0.08);">
            <tr>
              <td style="padding:24px 38px;background:#EDF6F5;border-bottom:1px solid #DDEAE8;">
                ${brandMark(logoUrl)}
              </td>
            </tr>
            <tr>
              <td style="padding:34px 38px 38px;">
                <h1 style="margin:0 0 16px;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:800;letter-spacing:-0.8px;line-height:1.15;">Your place is still here</h1>
                <p style="margin:0 0 18px;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.7;">Hi ${safeName},</p>
                <p style="margin:0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">It has been a little while since you last continued <strong>${safeCourseName}</strong>.</p>
                <p style="margin:18px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">No guilt. Life gets full. Priorities move around. Sometimes the work itself asks us to slow down because it touches something real.</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:26px 0 0;background:#F3F7F6;border:1px solid #E1E9E7;border-radius:16px;">
                  <tr>
                    <td style="padding:20px 20px 9px;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:1.2px;line-height:1.4;text-transform:uppercase;">Your last learning point</td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:800;line-height:1.45;">${safeLastLesson}</td>
                  </tr>
                  <tr>
                    <td style="padding:18px 20px 7px;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;">Up next: <strong style="color:${BRAND_BLACK};">${safeNextLesson}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px 9px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#DDEAE8;border-radius:999px;overflow:hidden;">
                        <tr>
                          <td width="${progress}%" bgcolor="${BRAND_TEAL}" style="width:${progress}%;height:9px;font-size:0;line-height:9px;">&nbsp;</td>
                          <td style="height:9px;font-size:0;line-height:9px;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px 20px;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:800;line-height:1.4;">${progress}% complete</td>
                  </tr>
                </table>

                <p style="margin:25px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">You do not need to catch up on everything today.</p>
                <p style="margin:7px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:800;line-height:1.72;">You only need one next step.</p>
                ${resumeAction}
                <p style="margin:26px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">If you have been avoiding the course because something feels unclear, difficult, or uncomfortable, that may be worth noticing. You do not have to force yourself through it. But you can return with curiosity.</p>
                <p style="margin:18px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">If you are dealing with a technical issue, cannot access a lesson, or need support, email us at <a href="mailto:${safeSupportEmail}" style="color:${BRAND_TEAL};font-weight:700;text-decoration:none;">${safeSupportEmail}</a>.</p>
                <p style="margin:18px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">Your access is still here when you are ready.</p>
                <p style="margin:22px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:800;line-height:1.55;">Zak Dakkash<br><span style="color:#687273;font-size:14px;font-weight:600;">Founder, Okayness</span></p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 38px 28px;border-top:1px solid #E5EBEA;background:#F8FAF9;">
                <p style="margin:0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;">You are receiving this message because you are enrolled in ${safeCourseName}. ${preferencesCopy}</p>
                <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
                  ${websiteLink}<a href="https://www.instagram.com/zak_talks/" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">Instagram</a><span style="padding:0 8px;color:#A5ADAD;">&middot;</span><a href="https://www.youtube.com/@zak_talks" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">YouTube</a>
                </p>
                <p style="margin:14px 0 0;color:#98A1A1;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;">&copy; ${new Date().getFullYear()} Okayness. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const preferencesText = safePreferencesUrl
    ? `Manage non-essential course reminders: ${safePreferencesUrl}`
    : `For help with course reminders, contact ${supportEmail}.`

  const text = `Hi ${displayName},

It has been a little while since you last continued ${courseName || 'your course'}.

No guilt. Life gets full. Priorities move around. Sometimes the work itself asks us to slow down because it touches something real.

Your last learning point was:
${lastLessonName || nextLessonName || 'Your course introduction'}

Up next: ${nextLessonName || lastLessonName || 'Your next lesson'}
Your current progress is ${progress}%.

You do not need to catch up on everything today.

You only need one next step.

Resume where you left off: ${safeResumeUrl}

If you have been avoiding the course because something feels unclear, difficult, or uncomfortable, that may be worth noticing. You do not have to force yourself through it. But you can return with curiosity.

If you are dealing with a technical issue, cannot access a lesson, or need support, email us at ${supportEmail}.

Your access is still here when you are ready.

Zak Dakkash
Founder, Okayness

You are receiving this message because you are enrolled in ${courseName || 'your course'}.
${preferencesText}`

  return { subject, previewText, html, text }
}
