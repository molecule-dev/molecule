/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch`, used by the
 * default `@molecule/api-http` client) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CalendarUserCredentials } from '@molecule/api-calendar'
import { createEvent, findFreeSlots, setProvider } from '@molecule/api-calendar'

import { createProvider } from '../index.js'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('refreshes an expired token, finds a free slot and books a 30-minute event', async () => {
    process.env.OAUTH_GOOGLE_CLIENT_ID = 'client-id'
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'client-secret'
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    let freeBusyCalls = 0
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url === 'https://www.googleapis.com/calendar/v3/freeBusy') {
        freeBusyCalls += 1
        if (freeBusyCalls === 1) return json({ error: 'expired' }, 401)
        return json({
          calendars: {
            primary: { busy: [{ start: '2026-10-01T09:00:00Z', end: '2026-10-01T10:00:00Z' }] },
          },
        })
      }
      if (url === 'https://oauth2.googleapis.com/token') {
        return json({ access_token: 'fresh-access-token', expires_in: 3600 })
      }
      if (url === 'https://www.googleapis.com/calendar/v3/calendars/primary/events') {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        return json({ id: 'evt-1', ...body })
      }
      throw new Error(`unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
      }),
    )

    let credentials: CalendarUserCredentials = {
      accessToken: 'stored-access-token',
      refreshToken: 'stored-refresh-token',
    }

    const free = await findFreeSlots(credentials, ['primary'], {
      timeMin: '2026-10-01T09:00:00Z',
      timeMax: '2026-10-01T17:00:00Z',
      durationMinutes: 30,
    })
    if (free.credentials) credentials = free.credentials

    expect(free.data.freeSlots).toEqual([
      { start: '2026-10-01T10:00:00.000Z', end: '2026-10-01T17:00:00.000Z' },
    ])
    expect(credentials.accessToken).toBe('fresh-access-token')
    expect(credentials.refreshToken).toBe('stored-refresh-token')

    const slot = free.data.freeSlots[0]
    if (!slot) throw new Error('expected a free slot')
    const created = await createEvent(credentials, 'primary', {
      summary: 'Intro call',
      start: slot.start,
      end: new Date(Date.parse(slot.start) + 30 * 60_000).toISOString(),
      attendees: [{ email: 'grace@example.com' }],
    })
    if (created.credentials) credentials = created.credentials
    console.log('booked', created.data.id)

    expect(created.data).toMatchObject({
      id: 'evt-1',
      summary: 'Intro call',
      start: '2026-10-01T10:00:00.000Z',
      end: '2026-10-01T10:30:00.000Z',
    })
    const [, init] = fetchMock.mock.calls.at(-1) ?? []
    expect((init?.headers as Record<string, string>).authorization).toBe(
      'Bearer fresh-access-token',
    )
    expect(console.log).toHaveBeenCalledWith('booked', 'evt-1')
    expect(credentials.accessToken).toBe('fresh-access-token')
  })
})
