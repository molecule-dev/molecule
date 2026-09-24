/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.daily.co`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMeetingToken, createRoom, setProvider } from '@molecule/api-video-rooms'

import { createProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-01T09:00:00Z') })
    vi.stubEnv('DAILY_CO_API_KEY', 'test-daily-key')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('creates a private room and issues a meeting token for it', async () => {
    const expUnix = Math.floor(new Date('2026-10-01T10:00:00Z').getTime() / 1000)
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      if (String(input).endsWith('/rooms')) {
        return new Response(
          JSON.stringify({
            name: 'standup-2026-10-01',
            url: 'https://acme.daily.co/standup-2026-10-01',
            privacy: 'private',
            config: { exp: expUnix, max_participants: 10 },
          }),
        )
      }
      return new Response(JSON.stringify({ token: 'daily-meeting-token' }))
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.DAILY_CO_API_KEY }))

    const room = await createRoom({
      name: 'standup-2026-10-01',
      privacy: 'private',
      maxParticipants: 10,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    const token = await createMeetingToken(room.name, {
      userName: 'Ada Lovelace',
      isOwner: true,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })

    expect(room).toEqual({
      name: 'standup-2026-10-01',
      url: 'https://acme.daily.co/standup-2026-10-01',
      privacy: 'private',
      maxParticipants: 10,
      expiresAt: new Date('2026-10-01T10:00:00Z'),
    })
    expect(token).toBe('daily-meeting-token')

    const [roomUrl, roomInit] = fetchMock.mock.calls[0] ?? []
    expect(String(roomUrl)).toBe('https://api.daily.co/v1/rooms')
    expect(new Headers(roomInit?.headers).get('Authorization')).toBe('Bearer test-daily-key')
    expect(JSON.parse(String(roomInit?.body))).toEqual({
      name: 'standup-2026-10-01',
      privacy: 'private',
      properties: { exp: expUnix, max_participants: 10 },
    })

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[1] ?? []
    expect(String(tokenUrl)).toBe('https://api.daily.co/v1/meeting-tokens')
    expect(JSON.parse(String(tokenInit?.body))).toEqual({
      properties: {
        room_name: 'standup-2026-10-01',
        is_owner: true,
        user_name: 'Ada Lovelace',
        exp: expUnix,
      },
    })
  })
})
