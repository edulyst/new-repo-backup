/* ═══════════════════════════════════════════════════════════════════════════
 *  mailer — thin Nodemailer wrapper + transactional email templates
 * ═══════════════════════════════════════════════════════════════════════════ */

import nodemailer, { type Transporter } from 'nodemailer'
import { loadEnv } from '../config/env.js'
import { getLogger } from '../instrumentation/logger.js'

let _transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  const env = loadEnv()
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  }
  return _transporter
}

export async function sendMail(opts: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  const env = loadEnv()
  const log = getLogger()
  const smtp = getTransporter()

  if (!smtp) {
    log.warn('[mailer] SMTP not configured — skipping send')
    return
  }

  const from = env.SMTP_FROM || env.SMTP_USER || 'no-reply@i8now.local'
  await smtp.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text })
  log.info({ to: opts.to, subject: opts.subject }, '[mailer] sent')
}

// ─── OTP email template ───────────────────────────────────────────────────────

export function buildOtpEmailHtml(opts: {
  otp: string
  expiresInMinutes: number
  recipientEmail: string
  siteName?: string
}): string {
  const { otp, expiresInMinutes, siteName = 'i8now' } = opts
  const digits = otp.split('')
  const year = new Date().getFullYear()

  const digitBoxes = digits
    .map(
      (d) =>
        `<td style="padding:0 4px;">
          <div style="
            display:inline-block;
            width:44px;
            height:56px;
            line-height:56px;
            text-align:center;
            font-size:28px;
            font-weight:700;
            color:#18181b;
            background:#f4f4f5;
            border-radius:10px;
            letter-spacing:0;
            font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          ">${d}</div>
        </td>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>Your ${siteName} sign-in code</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo / Brand -->
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="
                  background:#18181b;
                  border-radius:12px;
                  padding:10px 20px;
                ">
                  <span style="
                    color:#ffffff;
                    font-size:18px;
                    font-weight:700;
                    letter-spacing:-0.3px;
                  ">${siteName}</span>
                  <span style="color:#71717a;font-size:18px;font-weight:400;"> Admin</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="
            background:#ffffff;
            border-radius:16px;
            border:1px solid #e4e4e7;
            overflow:hidden;
          ">

            <!-- Top accent bar -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#18181b 0%,#3f3f46 100%);"></td>
              </tr>
            </table>

            <!-- Body -->
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 40px 32px;">
              <tr>
                <td>
                  <!-- Icon -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td style="
                        background:#f4f4f5;
                        border-radius:12px;
                        width:48px;
                        height:48px;
                        text-align:center;
                        line-height:48px;
                        font-size:22px;
                      ">🔐</td>
                    </tr>
                  </table>

                  <!-- Heading -->
                  <h1 style="
                    margin:0 0 8px;
                    font-size:22px;
                    font-weight:700;
                    color:#18181b;
                    letter-spacing:-0.4px;
                    line-height:1.3;
                  ">Your sign-in code</h1>

                  <p style="
                    margin:0 0 28px;
                    font-size:14px;
                    color:#71717a;
                    line-height:1.6;
                  ">
                    Enter this code to sign in to your ${siteName} admin account.
                    This code expires in <strong style="color:#18181b;">${expiresInMinutes} minutes</strong>.
                  </p>

                  <!-- OTP digit boxes -->
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                    <tr>${digitBoxes}</tr>
                  </table>

                  <!-- Divider -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td style="height:1px;background:#f4f4f5;"></td>
                    </tr>
                  </table>

                  <!-- Security note -->
                  <table cellpadding="0" cellspacing="0" style="
                    background:#fafafa;
                    border:1px solid #e4e4e7;
                    border-radius:10px;
                    padding:16px 18px;
                    width:100%;
                  ">
                    <tr>
                      <td style="vertical-align:top;padding-right:10px;font-size:18px;line-height:1;">⚠️</td>
                      <td>
                        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#18181b;">Never share this code</p>
                        <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                          The ${siteName} team will never ask for this code. If you didn't request it, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- Footer inside card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="
              border-top:1px solid #f4f4f5;
              padding:20px 40px;
              background:#fafafa;
            ">
              <tr>
                <td style="font-size:11px;color:#a1a1aa;line-height:1.6;">
                  This email was sent to you because a sign-in was requested for your ${siteName} admin account.<br/>
                  If this wasn't you, please contact support immediately.
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Bottom stamp -->
        <tr>
          <td align="center" style="padding-top:20px;">
            <p style="margin:0;font-size:11px;color:#a1a1aa;">
              © ${year} ${siteName} · All rights reserved
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`
}
