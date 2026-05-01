/**
 * Tests for Google Calendar provider.
 *
 * @module
 */

vi.mock('@molecule/api-http', () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  del: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as http from '@molecule/api-http'
import type { CalendarUserCredentials } from '@molecule/api-calendar'

import { computeFreeSlots, createProvider } from '../provider.js'

const mockGet = http.get as unknown as ReturnType<typeof vi.fn>
const mockPost = http.post as unknown as ReturnType<typeof vi.fn>
const mockPatch = http.patch as unknown as ReturnType<typeof vi.fn>
const mockDel = http.del as unknown as ReturnType<typeof vi.fn>

const credentials: CalendarUserCredentials = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
}

const okResponse = <T>(data: T) => ({ status: 200, headers: {}, data, request: { url: '' } })

describe('Google Calendar provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.OAUTH_GOOGLE_CLIENT_ID = 'client-id'
    process.env.OAUTH_GOOGLE_CLIENT_SECRET = 'client-secret'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('listCalendars', () => {
    it('GETs calendarList with bearer token and returns normalized list', async () => {
      mockGet.mockResolvedValueOnce(
        okResponse({
          items: [
            {
              id: 'primary',
              summary: 'Me',
              timeZone: 'America/Los_Angeles',
              primary: true,
              accessRole: 'owner',
            },
            { id: 'work@example.com', summary: 'Work' },
          ],
        }),
      )

      const provider = createProvider()
      const result = await provider.listCalendars(credentials)

      expect(mockGet).toHaveBeenCalledTimes(1)
      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe('https://www.googleapis.com/calendar/v3/users/me/calendarList')
      expect(options.headers.authorization).toBe('Bearer access-1')
      expect(options.headers.accept).toBe('application/json')
      expect(options.timeout).toBe(15_000)

      expect(result.data).toEqual([
        {
          id: 'primary',
          summary: 'Me',
          description: undefined,
          timeZone: 'America/Los_Angeles',
          primary: true,
          accessRole: 'owner',
        },
        {
          id: 'work@example.com',
          summary: 'Work',
          description: undefined,
          timeZone: undefined,
          primary: undefined,
          accessRole: undefined,
        },
      ])
      expect(result.credentials).toBeUndefined()
    })

    it('returns empty list when items is missing', async () => {
      mockGet.mockResolvedValueOnce(okResponse({}))

      const provider = createProvider()
      const result = await provider.listCalendars(credentials)

      expect(result.data).toEqual([])
    })
  })

  describe('listEvents', () => {
    it('GETs events with timeMin/timeMax/singleEvents/orderBy params', async () => {
      mockGet.mockResolvedValueOnce(
        okResponse({
          items: [
            {
              id: 'evt-1',
              summary: 'Lunch',
              description: 'tasty',
              location: 'Diner',
              start: { dateTime: '2026-05-02T12:00:00Z', timeZone: 'UTC' },
              end: { dateTime: '2026-05-02T13:00:00Z', timeZone: 'UTC' },
              status: 'confirmed',
              hangoutLink: 'https://meet.google.com/abc',
              attendees: [
                { email: 'a@example.com', displayName: 'A', responseStatus: 'accepted' },
                { email: '', displayName: 'noemail' },
              ],
            },
            {
              id: 'evt-2',
              summary: 'Holiday',
              start: { date: '2026-05-04' },
              end: { date: '2026-05-05' },
            },
          ],
        }),
      )

      const provider = createProvider()
      const result = await provider.listEvents(credentials, 'work@example.com', {
        timeMin: '2026-05-01T00:00:00Z',
        timeMax: '2026-05-08T00:00:00Z',
        maxResults: 50,
      })

      expect(mockGet).toHaveBeenCalledTimes(1)
      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/work%40example.com/events')
      expect(options.params).toEqual({
        timeMin: '2026-05-01T00:00:00Z',
        timeMax: '2026-05-08T00:00:00Z',
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      })

      expect(result.data).toHaveLength(2)
      const [evt1, evt2] = result.data
      expect(evt1.id).toBe('evt-1')
      expect(evt1.allDay).toBe(false)
      expect(evt1.start).toBe('2026-05-02T12:00:00Z')
      expect(evt1.end).toBe('2026-05-02T13:00:00Z')
      expect(evt1.timeZone).toBe('UTC')
      expect(evt1.attendees).toEqual([
        {
          email: 'a@example.com',
          displayName: 'A',
          optional: undefined,
          responseStatus: 'accepted',
        },
      ])
      expect(evt1.hangoutLink).toBe('https://meet.google.com/abc')

      expect(evt2.allDay).toBe(true)
      expect(evt2.start).toBe('2026-05-04')
      expect(evt2.end).toBe('2026-05-05')
    })

    it('omits maxResults when not provided', async () => {
      mockGet.mockResolvedValueOnce(okResponse({ items: [] }))

      const provider = createProvider()
      await provider.listEvents(credentials, 'primary', {
        timeMin: 'a',
        timeMax: 'b',
      })

      expect(mockGet.mock.calls[0][1].params.maxResults).toBeUndefined()
    })
  })

  describe('createEvent', () => {
    it('POSTs the event with content-type and bearer headers', async () => {
      mockPost.mockResolvedValueOnce(
        okResponse({
          id: 'evt-new',
          summary: 'Meeting',
          start: { dateTime: '2026-05-02T10:00:00Z', timeZone: 'UTC' },
          end: { dateTime: '2026-05-02T11:00:00Z', timeZone: 'UTC' },
        }),
      )

      const provider = createProvider()
      const result = await provider.createEvent(credentials, 'primary', {
        summary: 'Meeting',
        start: '2026-05-02T10:00:00Z',
        end: '2026-05-02T11:00:00Z',
        timeZone: 'UTC',
        attendees: [{ email: 'a@example.com' }],
      })

      const [url, body, options] = mockPost.mock.calls[0]
      expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events')
      expect(body).toEqual({
        summary: 'Meeting',
        start: { dateTime: '2026-05-02T10:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2026-05-02T11:00:00Z', timeZone: 'UTC' },
        attendees: [
          {
            email: 'a@example.com',
            displayName: undefined,
            optional: undefined,
            responseStatus: undefined,
          },
        ],
      })
      expect(options.headers['content-type']).toBe('application/json')
      expect(options.headers.authorization).toBe('Bearer access-1')
      expect(result.data.id).toBe('evt-new')
    })

    it('serializes all-day events as { date }', async () => {
      mockPost.mockResolvedValueOnce(
        okResponse({
          id: 'evt-allday',
          summary: 'Holiday',
          start: { date: '2026-05-04' },
          end: { date: '2026-05-05' },
        }),
      )

      const provider = createProvider()
      await provider.createEvent(credentials, 'primary', {
        summary: 'Holiday',
        start: '2026-05-04',
        end: '2026-05-05',
        allDay: true,
      })

      const [, body] = mockPost.mock.calls[0]
      expect(body.start).toEqual({ date: '2026-05-04' })
      expect(body.end).toEqual({ date: '2026-05-05' })
    })
  })

  describe('updateEvent', () => {
    it('PATCHes the event with provided fields only', async () => {
      mockPatch.mockResolvedValueOnce(
        okResponse({
          id: 'evt-1',
          summary: 'New title',
          start: { dateTime: '2026-05-02T12:00:00Z' },
          end: { dateTime: '2026-05-02T13:00:00Z' },
        }),
      )

      const provider = createProvider()
      const result = await provider.updateEvent(credentials, 'primary', 'evt-1', {
        summary: 'New title',
      })

      const [url, body] = mockPatch.mock.calls[0]
      expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events/evt-1')
      expect(body).toEqual({ summary: 'New title' })
      expect(result.data.summary).toBe('New title')
    })
  })

  describe('deleteEvent', () => {
    it('DELETEs with bearer token and resolves to undefined', async () => {
      mockDel.mockResolvedValueOnce(okResponse(undefined))

      const provider = createProvider()
      const result = await provider.deleteEvent(credentials, 'primary', 'evt-1')

      const [url, options] = mockDel.mock.calls[0]
      expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events/evt-1')
      expect(options.headers.authorization).toBe('Bearer access-1')
      expect(result.data).toBeUndefined()
    })
  })

  describe('findFreeSlots', () => {
    it('POSTs freeBusy and returns busy blocks plus computed free slots', async () => {
      mockPost.mockResolvedValueOnce(
        okResponse({
          calendars: {
            primary: {
              busy: [{ start: '2026-05-02T10:00:00Z', end: '2026-05-02T11:00:00Z' }],
            },
            'work@example.com': {
              busy: [{ start: '2026-05-02T12:00:00Z', end: '2026-05-02T13:00:00Z' }],
            },
          },
        }),
      )

      const provider = createProvider()
      const result = await provider.findFreeSlots(credentials, ['primary', 'work@example.com'], {
        timeMin: '2026-05-02T09:00:00Z',
        timeMax: '2026-05-02T14:00:00Z',
        durationMinutes: 30,
      })

      const [url, body] = mockPost.mock.calls[0]
      expect(url).toBe('https://www.googleapis.com/calendar/v3/freeBusy')
      expect(body.items).toEqual([{ id: 'primary' }, { id: 'work@example.com' }])
      expect(body.timeMin).toBe('2026-05-02T09:00:00Z')

      expect(result.data.busy).toHaveLength(2)
      // Expected free slots: 9-10, 11-12, 13-14
      expect(result.data.freeSlots).toEqual([
        { start: '2026-05-02T09:00:00.000Z', end: '2026-05-02T10:00:00.000Z' },
        { start: '2026-05-02T11:00:00.000Z', end: '2026-05-02T12:00:00.000Z' },
        { start: '2026-05-02T13:00:00.000Z', end: '2026-05-02T14:00:00.000Z' },
      ])
    })

    it('passes timeZone when provided', async () => {
      mockPost.mockResolvedValueOnce(okResponse({ calendars: {} }))

      const provider = createProvider()
      await provider.findFreeSlots(credentials, ['primary'], {
        timeMin: 'a',
        timeMax: 'b',
        durationMinutes: 30,
        timeZone: 'America/New_York',
      })

      const [, body] = mockPost.mock.calls[0]
      expect(body.timeZone).toBe('America/New_York')
    })
  })

  describe('token refresh', () => {
    it('refreshes on 401 and retries the original call once', async () => {
      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: { error: 'invalid_grant' } },
        request: { url: '' },
      })

      mockGet
        .mockRejectedValueOnce(unauthorized)
        .mockResolvedValueOnce(okResponse({ items: [{ id: 'primary', summary: 'Me' }] }))

      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-2',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      )

      const provider = createProvider()
      const result = await provider.listCalendars(credentials)

      // First request used original token, second used refreshed token
      expect(mockGet).toHaveBeenCalledTimes(2)
      expect(mockGet.mock.calls[0][1].headers.authorization).toBe('Bearer access-1')
      expect(mockGet.mock.calls[1][1].headers.authorization).toBe('Bearer access-2')

      // Token refresh hit the token endpoint
      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost.mock.calls[0][0]).toBe('https://oauth2.googleapis.com/token')
      expect(mockPost.mock.calls[0][1]).toEqual({
        client_id: 'client-id',
        client_secret: 'client-secret',
        refresh_token: 'refresh-1',
        grant_type: 'refresh_token',
      })

      expect(result.credentials).toBeDefined()
      expect(result.credentials?.accessToken).toBe('access-2')
      expect(result.credentials?.refreshToken).toBe('refresh-1')
      expect(typeof result.credentials?.expiresAt).toBe('number')
    })

    it('proactively refreshes when expiresAt is in the past', async () => {
      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-fresh',
          expires_in: 3600,
        }),
      )
      mockGet.mockResolvedValueOnce(okResponse({ items: [] }))

      const provider = createProvider()
      const result = await provider.listCalendars({
        ...credentials,
        expiresAt: Date.now() - 1000,
      })

      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockGet).toHaveBeenCalledTimes(1)
      expect(mockGet.mock.calls[0][1].headers.authorization).toBe('Bearer access-fresh')
      expect(result.credentials?.accessToken).toBe('access-fresh')
    })

    it('does not refresh when expiresAt is in the future', async () => {
      mockGet.mockResolvedValueOnce(okResponse({ items: [] }))

      const provider = createProvider()
      const result = await provider.listCalendars({
        ...credentials,
        expiresAt: Date.now() + 60_000,
      })

      expect(mockPost).not.toHaveBeenCalled()
      expect(mockGet).toHaveBeenCalledTimes(1)
      expect(result.credentials).toBeUndefined()
    })

    it('throws sanitized error after refresh failure (no token in message)', async () => {
      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: { error: 'invalid_grant' } },
        request: { url: '' },
      })
      const badRefresh = Object.assign(new Error('access_token=secret-refreshed'), {
        response: { status: 400, headers: {}, data: { error: 'invalid_grant' } },
        request: { url: '' },
      })

      mockGet.mockRejectedValueOnce(unauthorized)
      mockPost.mockRejectedValueOnce(badRefresh)

      const provider = createProvider()
      await expect(provider.listCalendars(credentials)).rejects.toThrow(/listCalendars failed/)

      try {
        await provider.listCalendars(credentials)
      } catch (error) {
        const message = (error as Error).message
        expect(message).not.toContain('access-1')
        expect(message).not.toContain('refresh-1')
        expect(message).not.toContain('secret-refreshed')
        expect(message).not.toContain('Bearer')
      }
    })

    it('throws sanitized error on non-401 failure (no token in message)', async () => {
      const serverError = Object.assign(new Error('boom Bearer access-1'), {
        response: { status: 500, headers: {}, data: { foo: 'bar' } },
        request: { url: '' },
      })
      mockGet.mockRejectedValueOnce(serverError)

      const provider = createProvider()
      await expect(provider.listCalendars(credentials)).rejects.toThrow(
        /Google Calendar listCalendars failed status=500/,
      )

      mockGet.mockRejectedValueOnce(serverError)
      try {
        await provider.listCalendars(credentials)
      } catch (error) {
        const message = (error as Error).message
        expect(message).not.toContain('access-1')
        expect(message).not.toContain('Bearer')
      }
    })

    it('does not double-refresh on a second 401 after refresh', async () => {
      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: { error: 'invalid_grant' } },
        request: { url: '' },
      })
      mockGet.mockRejectedValueOnce(unauthorized).mockRejectedValueOnce(unauthorized)
      mockPost.mockResolvedValueOnce(okResponse({ access_token: 'access-2', expires_in: 3600 }))

      const provider = createProvider()
      await expect(provider.listCalendars(credentials)).rejects.toThrow(
        /Google Calendar listCalendars failed/,
      )

      // Refresh happened exactly once even though both calls 401'd.
      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })

  describe('configuration', () => {
    it('throws when client id is missing and not in env', async () => {
      delete process.env.OAUTH_GOOGLE_CLIENT_ID
      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: {} },
        request: { url: '' },
      })
      mockGet.mockRejectedValueOnce(unauthorized)

      const provider = createProvider()
      await expect(provider.listCalendars(credentials)).rejects.toThrow(/OAUTH_GOOGLE_CLIENT_ID/)
    })

    it('honors clientId/clientSecret options without env vars', async () => {
      delete process.env.OAUTH_GOOGLE_CLIENT_ID
      delete process.env.OAUTH_GOOGLE_CLIENT_SECRET

      mockPost.mockResolvedValueOnce(okResponse({ access_token: 'access-2', expires_in: 3600 }))
      mockGet.mockResolvedValueOnce(okResponse({ items: [] }))

      const provider = createProvider({
        clientId: 'opt-id',
        clientSecret: 'opt-secret',
      })

      await provider.listCalendars({ ...credentials, expiresAt: Date.now() - 1 })

      expect(mockPost.mock.calls[0][1].client_id).toBe('opt-id')
      expect(mockPost.mock.calls[0][1].client_secret).toBe('opt-secret')
    })

    it('honors apiBaseUrl/tokenUrl/timeoutMs overrides', async () => {
      mockGet.mockResolvedValueOnce(okResponse({ items: [] }))

      const provider = createProvider({
        apiBaseUrl: 'https://fake-google.test/calendar/v3',
        tokenUrl: 'https://fake-google.test/token',
        timeoutMs: 1234,
      })

      await provider.listCalendars(credentials)

      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe('https://fake-google.test/calendar/v3/users/me/calendarList')
      expect(options.timeout).toBe(1234)
    })
  })
})

describe('computeFreeSlots', () => {
  it('returns the entire window when there are no busy blocks', () => {
    expect(computeFreeSlots([], '2026-05-02T09:00:00Z', '2026-05-02T10:00:00Z', 30)).toEqual([
      { start: '2026-05-02T09:00:00.000Z', end: '2026-05-02T10:00:00.000Z' },
    ])
  })

  it('returns nothing when window is shorter than duration', () => {
    expect(computeFreeSlots([], '2026-05-02T09:00:00Z', '2026-05-02T09:15:00Z', 30)).toEqual([])
  })

  it('merges overlapping busy blocks before computing free slots', () => {
    const slots = computeFreeSlots(
      [
        { start: '2026-05-02T10:00:00Z', end: '2026-05-02T11:00:00Z' },
        { start: '2026-05-02T10:30:00Z', end: '2026-05-02T11:30:00Z' },
      ],
      '2026-05-02T09:00:00Z',
      '2026-05-02T13:00:00Z',
      30,
    )
    expect(slots).toEqual([
      { start: '2026-05-02T09:00:00.000Z', end: '2026-05-02T10:00:00.000Z' },
      { start: '2026-05-02T11:30:00.000Z', end: '2026-05-02T13:00:00.000Z' },
    ])
  })

  it('drops gaps shorter than the requested duration', () => {
    // Window 09:00-11:30 with busy 09:30-10:00 + 10:15-11:00.
    // The 10:00-10:15 gap (15 min) is dropped; 09:00-09:30 and 11:00-11:30 fit.
    const slots = computeFreeSlots(
      [
        { start: '2026-05-02T09:30:00Z', end: '2026-05-02T10:00:00Z' },
        { start: '2026-05-02T10:15:00Z', end: '2026-05-02T11:00:00Z' },
      ],
      '2026-05-02T09:00:00Z',
      '2026-05-02T11:30:00Z',
      30,
    )
    expect(slots).toEqual([
      { start: '2026-05-02T09:00:00.000Z', end: '2026-05-02T09:30:00.000Z' },
      { start: '2026-05-02T11:00:00.000Z', end: '2026-05-02T11:30:00.000Z' },
    ])
  })

  it('drops both end-gaps when they are shorter than the duration', () => {
    // Window 09:00-11:00 with busy 09:10-10:50: only 10-min gaps remain at each end.
    const slots = computeFreeSlots(
      [{ start: '2026-05-02T09:10:00Z', end: '2026-05-02T10:50:00Z' }],
      '2026-05-02T09:00:00Z',
      '2026-05-02T11:00:00Z',
      30,
    )
    expect(slots).toEqual([])
  })

  it('clamps busy blocks that extend beyond the window', () => {
    const slots = computeFreeSlots(
      [{ start: '2026-05-02T08:00:00Z', end: '2026-05-02T09:30:00Z' }],
      '2026-05-02T09:00:00Z',
      '2026-05-02T11:00:00Z',
      30,
    )
    expect(slots).toEqual([{ start: '2026-05-02T09:30:00.000Z', end: '2026-05-02T11:00:00.000Z' }])
  })
})
