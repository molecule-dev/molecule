/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Google Calendar bond and
 * the default fetch HTTP client. Only the network is mocked: `fetch` answers
 * the Calendar API (first with a 401 for the expired token) and the OAuth
 * token endpoint.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-calendar-google'

import type { CalendarUserCredentials } from '../index.js'
import { listEvents, setProvider } from '../index.js'

/**
 * Serves the Google endpoints the example reaches.
 *
 * @param input - The requested URL.
 * @param init - The request options.
 * @returns The endpoint's response.
 */
async function google(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = String(input)
  const auth = new Headers(init?.headers).get('authorization')
  if (url.startsWith('https://oauth2.googleapis.com/token')) {
    return Response.json({ access_token: 'ya29.new', expires_in: 3600 })
  }
  if (url.includes('/calendars/primary/events')) {
    if (auth !== 'Bearer ya29.new') {
      return Response.json({ error: 'invalid_token' }, { status: 401 })
    }
    return Response.json({
      items: [
        {
          id: 'evt-1',
          summary: 'Design review',
          start: { dateTime: '2026-05-04T15:00:00Z' },
          end: { dateTime: '2026-05-04T16:00:00Z' },
        },
      ],
    })
  }
  return new Response('not found', { status: 404 })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('lists events, transparently refreshes an expired token and persists the new one', async () => {
    vi.stubEnv('OAUTH_GOOGLE_CLIENT_ID', 'client-id')
    vi.stubEnv('OAUTH_GOOGLE_CLIENT_SECRET', 'client-secret')
    const fetchMock = vi.fn(google)
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
      }),
    )

    const storedTokens = new Map<string, CalendarUserCredentials>([
      ['user-123', { accessToken: 'ya29.old', refreshToken: '1//refresh' }],
    ])
    const userId = 'user-123'
    const userCreds = storedTokens.get(userId)
    if (!userCreds) throw new Error('Calendar not connected')

    const { data: events, credentials } = await listEvents(userCreds, 'primary', {
      timeMin: '2026-05-01T00:00:00Z',
      timeMax: '2026-05-08T00:00:00Z',
    })
    expect(events.map((event) => `${event.start} ${event.summary}`)).toEqual([
      '2026-05-04T15:00:00Z Design review',
    ])

    if (credentials) storedTokens.set(userId, credentials)
    expect(storedTokens.get(userId)?.accessToken).toBe('ya29.new')
    expect(storedTokens.get(userId)?.refreshToken).toBe('1//refresh')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
