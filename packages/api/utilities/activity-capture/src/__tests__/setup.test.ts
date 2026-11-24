/**
 * `setupActivityCapture()` against the real bond registry, the real HTTP sink and the real email
 * capture provider, with a fake email transport and a stubbed `fetch` as the ingest endpoint.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { get, reset } from '@molecule/api-bond'
import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'
import { sendMail, setTransport } from '@molecule/api-emails'

import { setupActivityCapture } from '../setup.js'

const URL = 'http://activity.test/v1/activity'
const message: EmailMessage = {
  from: 'no-reply@example.com',
  to: 'user@example.com',
  subject: 'Welcome',
  text: 'Hello',
}

/** A transport that counts what it delivers. */
function fakeTransport(): EmailTransport & { sent: EmailMessage[] } {
  const sent: EmailMessage[] = []
  return {
    sent,
    async sendMail(msg: EmailMessage): Promise<EmailSendResult> {
      sent.push(msg)
      return { accepted: ['user@example.com'], rejected: [], messageId: 'real-1' }
    },
  }
}

/** The events the HTTP sink posted. */
let posted: Array<{ category?: string }>

beforeEach(() => {
  reset()
  posted = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      posted.push(JSON.parse(init.body) as { category?: string })
      return new Response('{}', { status: 202 })
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

/** Wait for the sink's fire-and-forget POSTs. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 20))
}

describe('setupActivityCapture', () => {
  it('leaves the real provider bonded and sets no sink outside molecule.dev', async () => {
    vi.stubEnv('MOLECULE_ACTIVITY_URL', '')
    const real = fakeTransport()
    setTransport(real)
    await setupActivityCapture()
    expect(get('email')).toBe(real)
    expect(get('activity-sink')).toBeUndefined()
    await sendMail(message)
    await settle()
    expect(real.sent).toHaveLength(1)
    expect(posted).toEqual([])
  })

  it('records a send and does not deliver it in the dev sandbox', async () => {
    vi.stubEnv('MOLECULE_ACTIVITY_URL', URL)
    vi.stubEnv('MOLECULE_ACTIVITY_MODE', '')
    const real = fakeTransport()
    setTransport(real)
    await setupActivityCapture()
    await sendMail(message)
    await settle()
    expect(real.sent).toEqual([])
    expect(posted).toHaveLength(1)
  })

  it('delivers and records a send in tee mode', async () => {
    vi.stubEnv('MOLECULE_ACTIVITY_URL', URL)
    vi.stubEnv('MOLECULE_ACTIVITY_MODE', 'tee')
    const real = fakeTransport()
    setTransport(real)
    await setupActivityCapture()
    const result = await sendMail(message)
    await settle()
    expect(real.sent).toHaveLength(1)
    expect(result.messageId).toBe('real-1')
    expect(posted).toHaveLength(1)
  })

  it('bonds nothing for a category the app never bonded', async () => {
    vi.stubEnv('MOLECULE_ACTIVITY_URL', URL)
    vi.stubEnv('MOLECULE_ACTIVITY_MODE', 'tee')
    await setupActivityCapture()
    for (const category of ['email', 'sms', 'push-notifications', 'webhook', 'channel']) {
      expect(get(category)).toBeUndefined()
    }
  })
})
