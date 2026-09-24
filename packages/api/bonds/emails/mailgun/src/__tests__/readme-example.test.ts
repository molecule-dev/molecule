/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only Mailgun's HTTP client
 * (`nodemailer-mailgun-transport`) is replaced — by a nodemailer custom
 * transport that records the composed message — so real nodemailer and the
 * real provider logic run.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendMail, setTransport } from '@molecule/api-emails'

import { provider as mailgun } from '../index.js'

const { mailgunSend, mailgunConfig } = vi.hoisted(() => ({
  mailgunSend: vi.fn(),
  mailgunConfig: vi.fn(),
}))

vi.mock('nodemailer-mailgun-transport', () => ({
  default: vi.fn((config: unknown) => {
    mailgunConfig(config)
    return {
      name: 'mailgun-test',
      version: '1.0.0',
      send(
        mail: { data: Record<string, unknown> },
        callback: (error: Error | null, info: Record<string, unknown>) => void,
      ): void {
        mailgunSend(mail.data)
        callback(null, {
          id: '<20260924.1@mg.example.com>',
          messageId: '<20260924.1@mg.example.com>',
          message: 'Queued. Thank you.',
        })
      },
    }
  }),
}))

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      MAILGUN_API_KEY: 'key-readme',
      MAILGUN_DOMAIN: 'mg.example.com',
    }
    delete process.env.EMAIL_FROM
    delete process.env.MAILGUN_TEST_MODE
    delete process.env.MAILGUN_API_HOST
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('sends through Mailgun from the sending domain and normalizes the result', async () => {
    setTransport(mailgun)

    const result = await sendMail({
      from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN}`,
      to: 'ada@example.com',
      subject: 'Welcome to Acme',
      text: 'Thanks for signing up!',
      html: '<p>Thanks for signing up!</p>',
    })

    expect(result).toEqual({
      accepted: ['ada@example.com'],
      rejected: [],
      messageId: '<20260924.1@mg.example.com>',
      response: 'Queued. Thank you.',
    })
    expect(mailgunConfig).toHaveBeenCalledWith({
      auth: { api_key: 'key-readme', domain: 'mg.example.com' },
    })
    expect(mailgunSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@mg.example.com',
        to: 'ada@example.com',
        subject: 'Welcome to Acme',
      }),
    )
    expect(mailgunSend.mock.calls[0]?.[0]).not.toHaveProperty('o:testmode')
  })
})
