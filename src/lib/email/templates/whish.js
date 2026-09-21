import { emailBrandMark } from '@/lib/email/branding'
import { emailFooterRow } from '@/lib/email/footer'
import { secureActionLink } from '@/lib/email/action-link'
import { WHISH_APP_URL, WHISH_GUIDE_URL, whishReference } from '@/lib/payments/whish-config'

const escape = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
const money = (cents) => `$${(Number(cents || 0)/100).toFixed(2)} USD`
const p = (text) => `<p style="margin:0 0 18px;font-size:16px;line-height:1.75;color:#596465;">${text}</p>`
const button = (url,label) => secureActionLink(url,label,'display:inline-block;background:#258C9B;color:#fff;padding:14px 24px;border-radius:999px;text-decoration:none;font-size:16px;font-weight:700;')

export function buildWhishEmail({ kind, order, setupUrl='', appUrl='', supportEmail='hello@okayness.com' }) {
  const name=escape(order.first_name || 'there')
  const title=escape(order.course_title)
  const reference=whishReference(order.id)
  let subject, heading, content, text
  if(kind==='password') {
    const confirmed = order.status === 'confirmed'
    const paymentMessage = confirmed
      ? `Your Whish payment for <strong>${title}</strong> has been verified. Finish setting up your account to access your course.`
      : `Your Whish request for <strong>${title}</strong> is awaiting payment verification. Creating your account does not confirm payment or unlock the course.`
    subject='Set your password to finish creating your account'
    heading='Make yourself at home.'
    content=p(`Hi ${name},`)+p('Set a password to finish creating your Okayness learner account.')
      +p(paymentMessage)
      +button(setupUrl,'Set Your Password')+p(confirmed ? 'Once your password is set, you can find your course in your dashboard.' : 'Your payment instructions arrive in a separate email. Once your transfer is verified, we will activate your course access.')
    text=`Hi ${order.first_name || 'there'},\n\nSet your password to finish creating your account: ${setupUrl}\n\n${confirmed ? `Your Whish payment for ${order.course_title} is verified. Finish setup to access your course.` : `Your Whish request for ${order.course_title} is awaiting payment verification. Payment instructions arrive separately. Course access follows verification.`}`
  } else if(kind==='approved') {
    subject=`Your payment is confirmed — ${order.course_title}`
    heading='Your course is ready.'
    content=p(`Hi ${name},`)+p(`We have verified your Whish payment of <strong>${money(order.amount_received_cents)}</strong> for <strong>${title}</strong>. Your course access is now active.`)
      +p(`Okayness Request ID: <strong>${reference}</strong><br>Whish Transfer Reference: ${escape(order.transfer_reference)}<br>You have earned <strong>1,000 points</strong> from this purchase.`)
      +button(`${appUrl}/dashboard`,'Go To My Courses')+p('If you have not set your password yet, use the account-setup email we sent earlier. You can also use Forgot Password on the sign-in page.')
    text=`Hi ${order.first_name || 'there'},\n\nWe verified your Whish payment of ${money(order.amount_received_cents)} for ${order.course_title}. Your course access is active.\nOkayness Request ID: ${reference}\nWhish Transfer Reference: ${order.transfer_reference}\nYou earned 1,000 points.\nMy courses: ${appUrl}/dashboard\nIf needed, finish setup using your account email or use Forgot Password.`
  } else {
    subject=`Your Whish payment instructions — ${order.course_title}`
    heading='Your next step, at your pace.'
    const d=order.discounts || {}
    const rows=[['Course price',money(order.original_price_cents)],
      ...(d.promotion?.applied?[[d.promotion.name || 'Course promotion',`−${money(d.promotion.discountCents)}`]]:[]),
      ...(d.firstPurchase?.eligible?[['First-purchase offer',`−${money(d.firstPurchase.discountCents)}`]]:[]),
      ...(order.points_to_spend>0?[[`${order.points_to_spend} points selected`,`−${money(d.points?.discountCents)}`]]:[]),
      ...(d.coupon?.valid?[[`Coupon ${d.coupon.couponCode}`,`−${money(d.coupon.discountCents)}`]]:[]),
      ['Amount to transfer',money(order.quoted_amount_cents)]]
    content=p(`Hi ${name},`)+p(`Your request for <strong>${title}</strong> has been saved. Complete your transfer using Whish to Whish, then allow up to <strong>48 hours after we receive and verify your payment</strong> for course access.`)
      +`<table role="presentation" width="100%" style="background:#EDF6F5;border-radius:14px;margin:20px 0;padding:16px;">${rows.map(([label,value])=>`<tr><td style="padding:7px 4px;color:#212C2D;">${escape(label)}</td><td align="right" style="padding:7px 4px;font-weight:700;color:#212C2D;">${escape(value)}</td></tr>`).join('')}</table>`
      +p(`<strong>Recipient number: ${escape(order.recipient_number)}</strong><br>Your Okayness Request ID: <strong>${reference}</strong><br>Your sender number: ${escape(order.phone)}`)
      +p('Open your Whish app, choose Whish to Whish, enter the recipient number above, and transfer the stated amount in USD. Check the recipient details carefully before confirming. Keep your transfer receipt.')
      +button(WHISH_APP_URL,'Get The Whish App')+p(`<a href="${WHISH_GUIDE_URL}" style="color:#258C9B;font-weight:700;">Whish to Whish guidance</a>`)
      +p(`If the transfer uses another phone number, contact us with your Okayness Request ID and Whish transfer reference so we can match it. You can reach us at <a href="mailto:${escape(supportEmail)}" style="color:#258C9B;">${escape(supportEmail)}</a>.`)
      +p('Your request is awaiting payment verification. We will email you when your course access is ready. Any selected points and offers are recorded when your payment is approved.')
    text=`Hi ${order.first_name || 'there'},\n\nYour request for ${order.course_title} is saved.\n${rows.map(r=>r.join(': ')).join('\n')}\n\nRecipient number: ${order.recipient_number}\nSender number: ${order.phone}\nOkayness Request ID: ${reference}\n\nOpen Whish, choose Whish to Whish, and enter the recipient number and amount in USD. Check the recipient and keep your receipt.\nApp: ${WHISH_APP_URL}\nGuidance: ${WHISH_GUIDE_URL}\n\nAllow up to 48 hours after we receive and verify payment for course access. You will receive a confirmation email. For a different sender number, contact ${supportEmail} with the Okayness Request ID and Whish transfer reference.`
  }
  const previewText=kind==='instructions'?'Your transfer details and next steps are inside.':kind==='approved'?'Your payment has been verified and your course access is active.':'Finish setting up your Okayness account.'
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(subject)}</title></head><body style="margin:0;background:#F3F6F5;font-family:Arial,Helvetica,sans-serif;color:#212C2D;"><div style="display:none;max-height:0;overflow:hidden;">${escape(previewText)}</div><table role="presentation" width="100%"><tr><td align="center" style="padding:36px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid #E5EBEA;border-radius:24px;overflow:hidden;"><tr><td style="padding:24px 38px;background:#EDF6F5;border-bottom:1px solid #DDEAE8;">${emailBrandMark({appUrl})}</td></tr><tr><td style="padding:34px 38px;"><h1 style="font-size:32px;line-height:1.2;color:#258C9B;margin:0 0 24px;">${heading}</h1>${content}${p('The Okayness Team')}</td></tr>${emailFooterRow({appUrl,supportEmail,notice:'You are receiving this email about your Whish course payment request.'})}</table></td></tr></table></body></html>`
  return {subject,previewText,html,text}
}
