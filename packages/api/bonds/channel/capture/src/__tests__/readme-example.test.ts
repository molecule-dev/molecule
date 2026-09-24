/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, in both branches: intercept-only when
 * no Slack token is set, and tee through the real `@molecule/api-channel-slack`
 * bond when it is. Only the Slack Web API SDK client is mocked.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setSink } from '@molecule/api-activity'
import { provider as consoleSink } from '@molecule/api-activity-console'
import { requireProviderByName, setProvider } from '@molecule/api-channel'
import { createProvider as createSlack } from '@molecule/api-channel-slack'

import { createChannelCaptureProvider, provider as captureOnly } from '../index.js'

const { postMessage } = vi.hoisted(() => ({
  postMessage: vi.fn(async () => ({ ok: true, ts: '1714000000.000100', channel: 'C0123ABCD' })),
}))

vi.mock('@slack/web-api', () => ({
  WebClient: class {
    chat = { postMessage }
  },
}))

const bondSlack = (): void => {
  setProvider(
    'slack',
    process.env.SLACK_BOT_TOKEN
      ? createChannelCaptureProvider(createSlack({ botToken: process.env.SLACK_BOT_TOKEN }))
      : captureOnly,
  )
}

describe('README @example', () => {
  const originalToken = process.env.SLACK_BOT_TOKEN

  beforeEach(() => {
    delete process.env.SLACK_BOT_TOKEN
    postMessage.mockClear()
  })

  afterEach(() => {
    if (originalToken === undefined) delete process.env.SLACK_BOT_TOKEN
    else process.env.SLACK_BOT_TOKEN = originalToken
    vi.restoreAllMocks()
  })

  it('intercepts and records (not posted) when no Slack token is set', async () => {
    const recorded = vi.spyOn(consoleSink, 'record')

    setSink(consoleSink)
    bondSlack()

    const sent = await requireProviderByName('slack').sendMessage('C0123ABCD', {
      kind: 'text',
      text: 'New order #1042 — $49.00',
    })

    expect(sent.messageId).toMatch(/^captured-/)
    expect(sent.deliveredAt).toBeInstanceOf(Date)
    expect(postMessage).not.toHaveBeenCalled()
    expect(recorded).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'channel',
        status: 'captured',
        recipient: 'C0123ABCD',
        summary: 'New order #1042 — $49.00',
      }),
    )
  })

  it('posts through Slack AND records the real outcome when the token is set', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test'
    const recorded = vi.spyOn(consoleSink, 'record')

    setSink(consoleSink)
    bondSlack()

    const sent = await requireProviderByName('slack').sendMessage('C0123ABCD', {
      kind: 'text',
      text: 'New order #1042 — $49.00',
    })

    expect(sent.messageId).toBe('1714000000.000100')
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'C0123ABCD', text: 'New order #1042 — $49.00' }),
    )
    expect(recorded).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'sent', recipient: 'C0123ABCD' }),
    )
  })
})
