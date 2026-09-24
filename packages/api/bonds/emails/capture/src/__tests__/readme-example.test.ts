/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, in both branches: intercept-only when
 * no ESP key is set, and tee through the real `@molecule/api-emails-mailgun`
 * bond when it is. Only Mailgun's HTTP client (`nodemailer-mailgun-transport`)
 * is replaced.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setSink } from '@molecule/api-activity'
import { provider as consoleSink } from '@molecule/api-activity-console'
import { sendMail, setTransport } from '@molecule/api-emails'
import { provider as mailgun } from '@molecule/api-emails-mailgun'

import { createEmailCaptureProvider, provider as captureOnly } from '../index.js'

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
      callback(null, { messageId: '<mg-1@mg.example.com>', message: 'Queued. Thank you.' })
    },
  })),
}))

const welcome = {
  from: 'no-reply@mg.example.com',
  to: 'ada@example.com',
  subject: 'Welcome to Acme',
  text: 'Thanks for signing up!',
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.MAILGUN_API_KEY
    delete process.env.MAILGUN_TEST_MODE
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('intercepts and records (not delivered) when no ESP key is set', async () => {
    const recorded = vi.spyOn(consoleSink, 'record')

    setSink(consoleSink)
    setTransport(process.env.MAILGUN_API_KEY ? createEmailCaptureProvider(mailgun) : captureOnly)

    const result = await sendMail(welcome)

    expect(result.accepted).toEqual(['ada@example.com'])
    expect(result.rejected).toEqual([])
    expect(result.messageId).toMatch(/^captured-/)
    expect(mailgunSend).not.toHaveBeenCalled()
    expect(recorded).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'email',
        status: 'captured',
        recipient: 'ada@example.com',
        summary: 'Welcome to Acme',
      }),
    )
  })

  it('delivers through Mailgun AND records the real outcome when the key is set', async () => {
    process.env.MAILGUN_API_KEY = 'key-readme'
    process.env.MAILGUN_DOMAIN = 'mg.example.com'
    const recorded = vi.spyOn(consoleSink, 'record')

    setSink(consoleSink)
    setTransport(process.env.MAILGUN_API_KEY ? createEmailCaptureProvider(mailgun) : captureOnly)

    const result = await sendMail(welcome)

    expect(result.messageId).toBe('<mg-1@mg.example.com>')
    expect(mailgunSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'ada@example.com' }))
    expect(recorded).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', recipient: 'ada@example.com' }),
    )
  })
})
