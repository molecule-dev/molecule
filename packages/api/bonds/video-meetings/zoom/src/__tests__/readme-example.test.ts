/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to Zoom) is
 * stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMeeting, setProvider } from '@molecule/api-video-meetings'

import { createProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('ZOOM_ACCOUNT_ID', 'test-account')
    vi.stubEnv('ZOOM_CLIENT_ID', 'test-client')
    vi.stubEnv('ZOOM_CLIENT_SECRET', 'test-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('fetches a Server-to-Server token and schedules the meeting', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('https://zoom.us/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'zoom-token', expires_in: 3600 }))
      }
      return new Response(
        JSON.stringify({
          id: 85746065432,
          topic: 'Design review',
          type: 2,
          start_time: '2026-10-01T16:00:00Z',
          duration: 45,
          timezone: 'America/New_York',
          join_url: 'https://zoom.us/j/85746065432',
          start_url: 'https://zoom.us/s/85746065432?zak=host',
          settings: { waiting_room: true, mute_upon_entry: true },
        }),
        { status: 201 },
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        accountId: process.env.ZOOM_ACCOUNT_ID,
        clientId: process.env.ZOOM_CLIENT_ID,
        clientSecret: process.env.ZOOM_CLIENT_SECRET,
      }),
    )

    const meeting = await createMeeting({
      topic: 'Design review',
      startTime: new Date('2026-10-01T16:00:00Z'),
      durationMinutes: 45,
      timezone: 'America/New_York',
      settings: { waitingRoom: true, muteUponEntry: true },
    })

    expect(meeting).toMatchObject({
      id: '85746065432',
      topic: 'Design review',
      type: 'scheduled',
      durationMinutes: 45,
      joinUrl: 'https://zoom.us/j/85746065432',
      startUrl: 'https://zoom.us/s/85746065432?zak=host',
      settings: { waitingRoom: true, muteUponEntry: true },
    })

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] ?? []
    expect(String(tokenUrl)).toBe(
      'https://zoom.us/oauth/token?grant_type=account_credentials&account_id=test-account',
    )
    expect((tokenInit?.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('test-client:test-secret').toString('base64')}`,
    )

    const [createUrl, createInit] = fetchMock.mock.calls[1] ?? []
    expect(String(createUrl)).toBe('https://api.zoom.us/v2/users/me/meetings')
    expect(new Headers(createInit?.headers).get('Authorization')).toBe('Bearer zoom-token')
    expect(JSON.parse(String(createInit?.body))).toEqual({
      topic: 'Design review',
      type: 2,
      start_time: '2026-10-01T16:00:00.000Z',
      duration: 45,
      timezone: 'America/New_York',
      settings: { waiting_room: true, mute_upon_entry: true },
    })
  })

  it('throws at bond time when the Zoom credentials are missing', () => {
    vi.stubEnv('ZOOM_ACCOUNT_ID', '')
    expect(() => createProvider({ accountId: process.env.ZOOM_ACCOUNT_ID })).toThrow(
      /Zoom credentials are required/,
    )
  })
})
