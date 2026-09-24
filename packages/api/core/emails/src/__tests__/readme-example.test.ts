/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Mailgun bond. Only
 * Mailgun's HTTP client (`nodemailer-mailgun-transport`) is replaced, the same
 * way the bond's own tests do, so real nodemailer and the real bond run.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provider as mailgun } from '@molecule/api-emails-mailgun'

import { sendMail, setTransport } from '../index.js'

const { mailgunSend } = vi.hoisted(() => ({ mailgunSend: vi.fn() }))

vi.mock('nodemailer-mailgun-transport', () => ({
  default: vi.fn(() => ({
    name: 'mailgun-test',
    version: '1.0.0',
    send(
      mail: { data: Record<string, unknown> },
      callback: (error: Error | null, info: Record<string, unknown>) => void,
    ): void {
      mailgunSend(mail.data)
      callback(null, { messageId: '<reset-1@mg.example.com>', message: 'Queued. Thank you.' })
    },
  })),
}))

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MAILGUN_API_KEY: 'key-readme',
      MAILGUN_DOMAIN: 'mg.example.com',
      SITE_ORIGIN: 'https://app.example.com',
    }
    delete process.env.EMAIL_FROM
    delete process.env.MAILGUN_TEST_MODE
    delete process.env.MAILGUN_API_HOST
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('sends a reset link from the verified domain to the account owner', async () => {
    setTransport(mailgun)

    const from = process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN}`
    const origin = process.env.SITE_ORIGIN ?? 'http://localhost:3000'
    const user = { email: 'ada@example.com' }
    const resetLink = `${origin}/reset-password?token=${encodeURIComponent('one-time-token')}`

    const result = await sendMail({
      from,
      to: user.email,
      subject: 'Reset your password',
      text: `Reset your password: ${resetLink}`,
      html: `<p><a href="${resetLink}">Reset your password</a></p>`,
    })

    expect(result).toMatchObject({
      accepted: ['ada@example.com'],
      rejected: [],
      messageId: '<reset-1@mg.example.com>',
    })
    expect(mailgunSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@mg.example.com',
        to: 'ada@example.com',
        subject: 'Reset your password',
        html: '<p><a href="https://app.example.com/reset-password?token=one-time-token">Reset your password</a></p>',
      }),
    )
  })
})
