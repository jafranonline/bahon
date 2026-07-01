// Transactional email via the native Cloudflare Email Service (env.EMAIL).
//
// All senders are best-effort: a delivery failure must never fail the calling
// request (register still succeeds; forgot-password stays generic). Callers
// wrap these in ctx.waitUntil / try-catch accordingly.

import type { Env } from './types'

const BRAND = 'Bahon · বাহন'

function shell(heading: string, body: string, cta: { href: string; label: string }): string {
  // Inline styles only — email clients ignore <style>/external CSS.
  return `<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <p style="font-size:18px;font-weight:700;margin:0 0 24px">${BRAND}</p>
    <div style="background:#ffffff;border-radius:14px;padding:28px 24px">
      <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
      <p style="font-size:15px;line-height:1.55;color:#3f3f46;margin:0 0 24px">${body}</p>
      <a href="${cta.href}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">${cta.label}</a>
      <p style="font-size:13px;line-height:1.5;color:#71717a;margin:24px 0 0">Or paste this link into your browser:<br><span style="color:#6366f1;word-break:break-all">${cta.href}</span></p>
    </div>
    <p style="font-size:12px;color:#a1a1aa;margin:24px 0 0">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body></html>`
}

async function send(
  env: Env,
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<void> {
  await env.EMAIL.send({ to, from: env.FROM_EMAIL, subject, html, text })
}

export async function sendVerificationEmail(env: Env, to: string, token: string): Promise<void> {
  const link = `${env.APP_ORIGIN}/verify?token=${token}`
  await send(
    env,
    to,
    'Verify your Bahon email',
    shell(
      'Confirm your email',
      'Tap the button below to verify your email address and finish setting up your Bahon account. This link expires in 24 hours.',
      { href: link, label: 'Verify email' },
    ),
    `Verify your Bahon email address:\n${link}\n\nThis link expires in 24 hours.`,
  )
}

export async function sendPasswordResetEmail(env: Env, to: string, token: string): Promise<void> {
  const link = `${env.APP_ORIGIN}/reset?token=${token}`
  await send(
    env,
    to,
    'Reset your Bahon password',
    shell(
      'Reset your password',
      'We received a request to reset your Bahon password. Tap the button below to choose a new one. This link expires in 1 hour. If you didn’t ask for this, ignore this email and your password stays unchanged.',
      { href: link, label: 'Reset password' },
    ),
    `Reset your Bahon password:\n${link}\n\nThis link expires in 1 hour. If you didn't request it, ignore this email.`,
  )
}

export async function sendEmailChangeEmail(env: Env, to: string, token: string): Promise<void> {
  const link = `${env.APP_ORIGIN}/verify?token=${token}`
  await send(
    env,
    to,
    'Confirm your new Bahon email',
    shell(
      'Confirm your new email',
      'Tap below to confirm this address as the new email for your Bahon account. This link expires in 24 hours.',
      { href: link, label: 'Confirm email' },
    ),
    `Confirm your new Bahon email address:\n${link}\n\nThis link expires in 24 hours.`,
  )
}
