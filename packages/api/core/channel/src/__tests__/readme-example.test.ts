/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Slack and Discord bonds.
 * Only the outside world is mocked: the Slack Web API SDK client, and `fetch`
 * for Discord's REST API.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const { postMessage } = vi.hoisted(() => ({
  postMessage: vi.fn(async () => ({ ok: true, ts: '1714000000.000100', channel: 'C0123ABCD' })),
}))

vi.mock('@slack/web-api', () => ({
  WebClient: class {
    chat = { postMessage }
  },
}))

import { createProvider as createDiscord } from '@molecule/api-channel-discord'
import { createProvider as createSlack } from '@molecule/api-channel-slack'

import { requireProviderByName, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds two named channels and sends through each by name', async () => {
    vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test')
    vi.stubEnv('CHANNEL_DISCORD_BOT_TOKEN', 'discord-test')
    const fetchMock = vi.fn(async () =>
      Response.json({ id: '998877', timestamp: '2026-05-04T15:00:00.000Z' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider('slack', createSlack({ botToken: process.env.SLACK_BOT_TOKEN }))
    setProvider('discord', createDiscord({ botToken: process.env.CHANNEL_DISCORD_BOT_TOKEN }))

    const slack = requireProviderByName('slack')
    const sent = await slack.sendMessage('C0123ABCD', { kind: 'text', text: 'Deploy finished ✅' })
    expect(sent.messageId).toBe('1714000000.000100')
    expect(sent.deliveredAt instanceof Date).toBe(true)
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'C0123ABCD', text: 'Deploy finished ✅' }),
    )

    const discord = requireProviderByName('discord')
    const alert = 'New signup: ada@example.com'
    const result = await discord.sendMessage(
      '112233445566778899',
      discord.listSupportedFeatures().buttons
        ? { kind: 'rich', text: alert, buttons: [{ label: 'Open', value: 'open-admin' }] }
        : { kind: 'text', text: alert },
    )
    expect(result.messageId).toBe('998877')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://discord.com/api/v10/channels/112233445566778899/messages')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bot discord-test')
    expect(JSON.parse(init.body as string)).toMatchObject({
      content: alert,
      components: [{ type: 1, components: [{ label: 'Open', custom_id: 'open-admin' }] }],
    })
  })
})
