/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only the network (`fetch` to the Slack
 * incoming webhook) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { notifyAll, setProvider } from '@molecule/api-notifications'

import { provider as slack } from '../index.js'

describe('README @example', () => {
  const webhookUrl = 'https://hooks.slack.com/services/TEST/HOOK/value'

  beforeEach(() => {
    process.env.NOTIFICATIONS_SLACK_WEBHOOK_URL = webhookUrl
  })

  afterEach(() => {
    delete process.env.NOTIFICATIONS_SLACK_WEBHOOK_URL
    vi.unstubAllGlobals()
  })

  it('posts the notification to the Slack webhook through notifyAll()', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response('ok', { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider('slack', slack)

    const results = await notifyAll({
      subject: 'New signup',
      body: 'ada@example.com just created an account.',
    })
    const failed = results.filter((result) => !result.success)

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ success: true, channel: 'slack' })
    expect(typeof results[0]?.sentAt).toBe('string')
    expect(failed).toEqual([])
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe(webhookUrl)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      text: '*New signup*\nada@example.com just created an account.',
    })
  })
})
