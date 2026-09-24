/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch`, used by the
 * default `@molecule/api-http` client) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CalendarUserCredentials } from '@molecule/api-calendar'
import { createEvent, findFreeSlots, listCalendars, setProvider } from '@molecule/api-calendar'

import { createProvider } from '../index.js'

const GRAPH = 'https://graph.microsoft.com/v1.0'

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('finds the default calendar, a free slot, and books a 30-minute event', async () => {
    process.env.OAUTH_MICROSOFT_CLIENT_ID = 'client-id'
    process.env.OAUTH_MICROSOFT_CLIENT_SECRET = 'client-secret'
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url === `${GRAPH}/me/calendars`) {
        return json({
          value: [
            { id: 'AAMkShared', name: 'Team', isDefaultCalendar: false, canEdit: false },
            { id: 'AAMkDefault', name: 'Calendar', isDefaultCalendar: true, canEdit: true },
          ],
        })
      }
      if (url === `${GRAPH}/me/calendar/getSchedule`) {
        return json({
          value: [
            {
              scheduleId: 'ada@example.com',
              scheduleItems: [
                {
                  status: 'busy',
                  start: { dateTime: '2026-10-01T09:00:00', timeZone: 'UTC' },
                  end: { dateTime: '2026-10-01T10:00:00', timeZone: 'UTC' },
                },
              ],
            },
          ],
        })
      }
      if (url === `${GRAPH}/me/calendars/AAMkDefault/events`) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        return json({ id: 'evt-1', ...body })
      }
      throw new Error(`unexpected fetch ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        clientId: process.env.OAUTH_MICROSOFT_CLIENT_ID,
        clientSecret: process.env.OAUTH_MICROSOFT_CLIENT_SECRET,
      }),
    )

    let credentials: CalendarUserCredentials = {
      accessToken: 'stored-access-token',
      refreshToken: 'stored-refresh-token',
    }

    const calendars = await listCalendars(credentials)
    if (calendars.credentials) credentials = calendars.credentials
    const calendar = calendars.data.find((c) => c.primary)
    expect(calendar?.id).toBe('AAMkDefault')

    const free = await findFreeSlots(credentials, ['ada@example.com'], {
      timeMin: '2026-10-01T09:00:00Z',
      timeMax: '2026-10-01T17:00:00Z',
      durationMinutes: 30,
    })
    if (free.credentials) credentials = free.credentials
    expect(free.data.freeSlots).toEqual([
      { start: '2026-10-01T10:00:00.000Z', end: '2026-10-01T17:00:00.000Z' },
    ])

    const slot = free.data.freeSlots[0]
    if (!calendar || !slot) throw new Error('expected a calendar and a free slot')
    const created = await createEvent(credentials, calendar.id, {
      summary: 'Intro call',
      start: slot.start,
      end: new Date(Date.parse(slot.start) + 30 * 60_000).toISOString(),
      attendees: [{ email: 'grace@example.com' }],
    })
    console.log('booked', created.data.id)

    expect(created.data).toMatchObject({ id: 'evt-1', summary: 'Intro call' })
    const [, init] = fetchMock.mock.calls.at(-1) ?? []
    expect((init?.headers as Record<string, string>).authorization).toBe(
      'Bearer stored-access-token',
    )
    expect(JSON.parse(String(init?.body))).toMatchObject({
      subject: 'Intro call',
      start: { dateTime: '2026-10-01T10:00:00.000Z', timeZone: 'UTC' },
      end: { dateTime: '2026-10-01T10:30:00.000Z', timeZone: 'UTC' },
      attendees: [{ type: 'required', emailAddress: { address: 'grace@example.com' } }],
    })
    expect(console.log).toHaveBeenCalledWith('booked', 'evt-1')
  })
})
