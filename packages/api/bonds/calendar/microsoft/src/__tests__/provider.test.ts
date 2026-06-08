/**
 * Tests for Microsoft Calendar provider.
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

import type { CalendarUserCredentials } from '@molecule/api-calendar'
import * as http from '@molecule/api-http'

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

describe('Microsoft Calendar provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.OAUTH_MICROSOFT_CLIENT_ID = 'client-id'
    process.env.OAUTH_MICROSOFT_CLIENT_SECRET = 'client-secret'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('listCalendars', () => {
    it('GETs /me/calendars with bearer token and returns normalized list', async () => {
      mockGet.mockResolvedValueOnce(
        okResponse({
          value: [
            {
              id: 'cal-1',
              name: 'Calendar',
              isDefaultCalendar: true,
              canEdit: true,
            },
            {
              id: 'cal-2',
              name: 'Shared',
              description: 'Team',
              canEdit: false,
            },
          ],
        }),
      )

      const provider = createProvider()
      const result = await provider.listCalendars(credentials)

      expect(mockGet).toHaveBeenCalledTimes(1)
      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe('https://graph.microsoft.com/v1.0/me/calendars')
      expect(options.headers.authorization).toBe('Bearer access-1')
      expect(options.headers.accept).toBe('application/json')
      expect(options.timeout).toBe(15_000)

      expect(result.data).toEqual([
        {
          id: 'cal-1',
          summary: 'Calendar',
          description: undefined,
          primary: true,
          accessRole: 'writer',
        },
        {
          id: 'cal-2',
          summary: 'Shared',
          description: 'Team',
          primary: undefined,
          accessRole: 'reader',
        },
      ])
      expect(result.credentials).toBeUndefined()
    })

    it('returns empty list when value is missing', async () => {
      mockGet.mockResolvedValueOnce(okResponse({}))
      const provider = createProvider()
      const result = await provider.listCalendars(credentials)
      expect(result.data).toEqual([])
    })
  })

  describe('listEvents', () => {
    it('GETs calendarView with startDateTime/endDateTime/$top/$orderby params', async () => {
      mockGet.mockResolvedValueOnce(
        okResponse({
          value: [
            {
              id: 'evt-1',
              subject: 'Lunch',
              bodyPreview: 'tasty',
              location: { displayName: 'Diner' },
              start: { dateTime: '2026-05-02T12:00:00.0000000', timeZone: 'UTC' },
              end: { dateTime: '2026-05-02T13:00:00.0000000', timeZone: 'UTC' },
              showAs: 'busy',
              isAllDay: false,
              onlineMeeting: { joinUrl: 'https://teams.microsoft.com/abc' },
              attendees: [
                {
                  type: 'required',
                  emailAddress: { address: 'a@example.com', name: 'A' },
                  status: { response: 'accepted' },
                },
                {
                  type: 'optional',
                  emailAddress: { address: 'b@example.com', name: 'B' },
                  status: { response: 'tentative' },
                },
                {
                  type: 'required',
                  emailAddress: { name: 'no-email' },
                },
              ],
            },
            {
              id: 'evt-2',
              subject: 'Holiday',
              isAllDay: true,
              start: { dateTime: '2026-05-04T00:00:00.0000000', timeZone: 'UTC' },
              end: { dateTime: '2026-05-05T00:00:00.0000000', timeZone: 'UTC' },
            },
          ],
        }),
      )

      const provider = createProvider()
      const result = await provider.listEvents(credentials, 'cal-1', {
        timeMin: '2026-05-01T00:00:00Z',
        timeMax: '2026-05-08T00:00:00Z',
        maxResults: 50,
      })

      expect(mockGet).toHaveBeenCalledTimes(1)
      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe('https://graph.microsoft.com/v1.0/me/calendars/cal-1/calendarView')
      expect(options.params).toEqual({
        startDateTime: '2026-05-01T00:00:00Z',
        endDateTime: '2026-05-08T00:00:00Z',
        $top: 50,
        $orderby: 'start/dateTime',
      })

      expect(result.data).toHaveLength(2)
      const [evt1, evt2] = result.data
      expect(evt1.id).toBe('evt-1')
      expect(evt1.summary).toBe('Lunch')
      expect(evt1.allDay).toBe(false)
      expect(evt1.start).toBe('2026-05-02T12:00:00.0000000Z')
      expect(evt1.end).toBe('2026-05-02T13:00:00.0000000Z')
      expect(evt1.timeZone).toBe('UTC')
      expect(evt1.location).toBe('Diner')
      expect(evt1.status).toBe('confirmed')
      expect(evt1.hangoutLink).toBe('https://teams.microsoft.com/abc')
      expect(evt1.attendees).toEqual([
        {
          email: 'a@example.com',
          displayName: 'A',
          optional: undefined,
          responseStatus: 'accepted',
        },
        {
          email: 'b@example.com',
          displayName: 'B',
          optional: true,
          responseStatus: 'tentative',
        },
      ])

      expect(evt2.allDay).toBe(true)
      expect(evt2.start).toBe('2026-05-04')
      expect(evt2.end).toBe('2026-05-05')
    })

    it('omits $top when maxResults not provided', async () => {
      mockGet.mockResolvedValueOnce(okResponse({ value: [] }))
      const provider = createProvider()
      await provider.listEvents(credentials, 'cal-1', { timeMin: 'a', timeMax: 'b' })
      expect(mockGet.mock.calls[0][1].params.$top).toBeUndefined()
    })
  })

  describe('createEvent', () => {
    it('POSTs the event with content-type and bearer headers', async () => {
      mockPost.mockResolvedValueOnce(
        okResponse({
          id: 'evt-new',
          subject: 'Meeting',
          start: { dateTime: '2026-05-02T10:00:00.0000000', timeZone: 'UTC' },
          end: { dateTime: '2026-05-02T11:00:00.0000000', timeZone: 'UTC' },
        }),
      )

      const provider = createProvider()
      const result = await provider.createEvent(credentials, 'cal-1', {
        summary: 'Meeting',
        start: '2026-05-02T10:00:00Z',
        end: '2026-05-02T11:00:00Z',
        timeZone: 'UTC',
        attendees: [{ email: 'a@example.com', displayName: 'A' }],
      })

      const [url, body, options] = mockPost.mock.calls[0]
      expect(url).toBe('https://graph.microsoft.com/v1.0/me/calendars/cal-1/events')
      expect(body).toEqual({
        subject: 'Meeting',
        start: { dateTime: '2026-05-02T10:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2026-05-02T11:00:00Z', timeZone: 'UTC' },
        attendees: [
          {
            type: 'required',
            emailAddress: { address: 'a@example.com', name: 'A' },
          },
        ],
      })
      expect(options.headers['content-type']).toBe('application/json')
      expect(options.headers.authorization).toBe('Bearer access-1')
      expect(result.data.id).toBe('evt-new')
    })

    it('serializes all-day events with UTC timeZone and isAllDay flag', async () => {
      mockPost.mockResolvedValueOnce(
        okResponse({
          id: 'evt-allday',
          subject: 'Holiday',
          isAllDay: true,
          start: { dateTime: '2026-05-04T00:00:00.0000000', timeZone: 'UTC' },
          end: { dateTime: '2026-05-05T00:00:00.0000000', timeZone: 'UTC' },
        }),
      )

      const provider = createProvider()
      await provider.createEvent(credentials, 'cal-1', {
        summary: 'Holiday',
        start: '2026-05-04',
        end: '2026-05-05',
        allDay: true,
      })

      const [, body] = mockPost.mock.calls[0]
      expect(body.isAllDay).toBe(true)
      expect(body.start).toEqual({ dateTime: '2026-05-04', timeZone: 'UTC' })
      expect(body.end).toEqual({ dateTime: '2026-05-05', timeZone: 'UTC' })
    })

    it('marks optional attendees with type=optional', async () => {
      mockPost.mockResolvedValueOnce(okResponse({ id: 'x', subject: 'X' }))

      const provider = createProvider()
      await provider.createEvent(credentials, 'cal-1', {
        summary: 'X',
        start: '2026-05-02T10:00:00Z',
        end: '2026-05-02T11:00:00Z',
        attendees: [{ email: 'r@example.com' }, { email: 'o@example.com', optional: true }],
      })

      const [, body] = mockPost.mock.calls[0]
      expect(body.attendees).toEqual([
        { type: 'required', emailAddress: { address: 'r@example.com' } },
        { type: 'optional', emailAddress: { address: 'o@example.com' } },
      ])
    })
  })

  describe('updateEvent', () => {
    it('PATCHes the event with provided fields only', async () => {
      mockPatch.mockResolvedValueOnce(
        okResponse({
          id: 'evt-1',
          subject: 'New title',
          start: { dateTime: '2026-05-02T12:00:00.0000000', timeZone: 'UTC' },
          end: { dateTime: '2026-05-02T13:00:00.0000000', timeZone: 'UTC' },
        }),
      )

      const provider = createProvider()
      const result = await provider.updateEvent(credentials, 'cal-1', 'evt-1', {
        summary: 'New title',
      })

      const [url, body] = mockPatch.mock.calls[0]
      expect(url).toBe('https://graph.microsoft.com/v1.0/me/calendars/cal-1/events/evt-1')
      expect(body).toEqual({ subject: 'New title' })
      expect(result.data.summary).toBe('New title')
    })
  })

  describe('deleteEvent', () => {
    it('DELETEs with bearer token and resolves to undefined', async () => {
      mockDel.mockResolvedValueOnce(okResponse(undefined))

      const provider = createProvider()
      const result = await provider.deleteEvent(credentials, 'cal-1', 'evt-1')

      const [url, options] = mockDel.mock.calls[0]
      expect(url).toBe('https://graph.microsoft.com/v1.0/me/calendars/cal-1/events/evt-1')
      expect(options.headers.authorization).toBe('Bearer access-1')
      expect(result.data).toBeUndefined()
    })
  })

  describe('findFreeSlots', () => {
    it('POSTs getSchedule and returns busy blocks plus computed free slots', async () => {
      mockPost.mockResolvedValueOnce(
        okResponse({
          value: [
            {
              scheduleId: 'a@example.com',
              scheduleItems: [
                {
                  status: 'busy',
                  start: { dateTime: '2026-05-02T10:00:00.0000000', timeZone: 'UTC' },
                  end: { dateTime: '2026-05-02T11:00:00.0000000', timeZone: 'UTC' },
                },
                {
                  status: 'free',
                  start: { dateTime: '2026-05-02T11:00:00.0000000', timeZone: 'UTC' },
                  end: { dateTime: '2026-05-02T11:30:00.0000000', timeZone: 'UTC' },
                },
              ],
            },
            {
              scheduleId: 'b@example.com',
              scheduleItems: [
                {
                  status: 'tentative',
                  start: { dateTime: '2026-05-02T12:00:00.0000000', timeZone: 'UTC' },
                  end: { dateTime: '2026-05-02T13:00:00.0000000', timeZone: 'UTC' },
                },
              ],
            },
          ],
        }),
      )

      const provider = createProvider()
      const result = await provider.findFreeSlots(credentials, ['a@example.com', 'b@example.com'], {
        timeMin: '2026-05-02T09:00:00Z',
        timeMax: '2026-05-02T14:00:00Z',
        durationMinutes: 30,
      })

      const [url, body] = mockPost.mock.calls[0]
      expect(url).toBe('https://graph.microsoft.com/v1.0/me/calendar/getSchedule')
      expect(body.schedules).toEqual(['a@example.com', 'b@example.com'])
      expect(body.startTime).toEqual({ dateTime: '2026-05-02T09:00:00Z', timeZone: 'UTC' })
      expect(body.endTime).toEqual({ dateTime: '2026-05-02T14:00:00Z', timeZone: 'UTC' })
      expect(body.availabilityViewInterval).toBe(30)

      // 'free'-status item is excluded; 'tentative' is treated as busy.
      expect(result.data.busy).toHaveLength(2)
      expect(result.data.busy[0]).toEqual({
        start: '2026-05-02T10:00:00.0000000Z',
        end: '2026-05-02T11:00:00.0000000Z',
        calendarId: 'a@example.com',
      })
      expect(result.data.busy[1]).toEqual({
        start: '2026-05-02T12:00:00.0000000Z',
        end: '2026-05-02T13:00:00.0000000Z',
        calendarId: 'b@example.com',
      })
      expect(result.data.freeSlots).toEqual([
        { start: '2026-05-02T09:00:00.000Z', end: '2026-05-02T10:00:00.000Z' },
        { start: '2026-05-02T11:00:00.000Z', end: '2026-05-02T12:00:00.000Z' },
        { start: '2026-05-02T13:00:00.000Z', end: '2026-05-02T14:00:00.000Z' },
      ])
    })

    it('passes user-provided timeZone to getSchedule', async () => {
      mockPost.mockResolvedValueOnce(okResponse({ value: [] }))

      const provider = createProvider()
      await provider.findFreeSlots(credentials, ['a@example.com'], {
        timeMin: 'a',
        timeMax: 'b',
        durationMinutes: 30,
        timeZone: 'America/New_York',
      })

      const [, body] = mockPost.mock.calls[0]
      expect(body.startTime.timeZone).toBe('America/New_York')
      expect(body.endTime.timeZone).toBe('America/New_York')
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
        .mockResolvedValueOnce(okResponse({ value: [{ id: 'cal-1', name: 'Default' }] }))

      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      )

      const provider = createProvider()
      const result = await provider.listCalendars(credentials)

      expect(mockGet).toHaveBeenCalledTimes(2)
      expect(mockGet.mock.calls[0][1].headers.authorization).toBe('Bearer access-1')
      expect(mockGet.mock.calls[1][1].headers.authorization).toBe('Bearer access-2')

      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost.mock.calls[0][0]).toBe(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      )
      expect(mockPost.mock.calls[0][1]).toEqual({
        client_id: 'client-id',
        client_secret: 'client-secret',
        refresh_token: 'refresh-1',
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/.default offline_access',
      })

      expect(result.credentials).toBeDefined()
      expect(result.credentials?.accessToken).toBe('access-2')
      // Microsoft can rotate the refresh token — we surface the new value.
      expect(result.credentials?.refreshToken).toBe('refresh-2')
      expect(typeof result.credentials?.expiresAt).toBe('number')
    })

    it('keeps existing refresh token when Microsoft does not rotate it', async () => {
      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: {} },
        request: { url: '' },
      })

      mockGet.mockRejectedValueOnce(unauthorized).mockResolvedValueOnce(okResponse({ value: [] }))

      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-2',
          expires_in: 3600,
        }),
      )

      const provider = createProvider()
      const result = await provider.listCalendars(credentials)

      expect(result.credentials?.accessToken).toBe('access-2')
      expect(result.credentials?.refreshToken).toBe('refresh-1')
    })

    it('proactively refreshes when expiresAt is in the past', async () => {
      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-fresh',
          expires_in: 3600,
        }),
      )
      mockGet.mockResolvedValueOnce(okResponse({ value: [] }))

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
      mockGet.mockResolvedValueOnce(okResponse({ value: [] }))

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

      mockGet.mockRejectedValueOnce(unauthorized)
      mockPost.mockRejectedValueOnce(badRefresh)
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
        /Microsoft Calendar listCalendars failed status=500/,
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
        /Microsoft Calendar listCalendars failed/,
      )

      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })

  describe('configuration', () => {
    it('throws when client id is missing and not in env', async () => {
      delete process.env.OAUTH_MICROSOFT_CLIENT_ID
      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: {} },
        request: { url: '' },
      })
      mockGet.mockRejectedValueOnce(unauthorized)

      const provider = createProvider()
      await expect(provider.listCalendars(credentials)).rejects.toThrow(/OAUTH_MICROSOFT_CLIENT_ID/)
    })

    it('honors clientId/clientSecret options without env vars', async () => {
      delete process.env.OAUTH_MICROSOFT_CLIENT_ID
      delete process.env.OAUTH_MICROSOFT_CLIENT_SECRET

      mockPost.mockResolvedValueOnce(okResponse({ access_token: 'access-2', expires_in: 3600 }))
      mockGet.mockResolvedValueOnce(okResponse({ value: [] }))

      const provider = createProvider({
        clientId: 'opt-id',
        clientSecret: 'opt-secret',
      })

      await provider.listCalendars({ ...credentials, expiresAt: Date.now() - 1 })

      expect(mockPost.mock.calls[0][1].client_id).toBe('opt-id')
      expect(mockPost.mock.calls[0][1].client_secret).toBe('opt-secret')
    })

    it('honors apiBaseUrl/tokenUrl/scope/timeoutMs overrides', async () => {
      mockGet.mockResolvedValueOnce(okResponse({ value: [] }))

      const provider = createProvider({
        apiBaseUrl: 'https://fake-graph.test/v1',
        tokenUrl: 'https://fake-graph.test/token',
        scope: 'custom-scope',
        timeoutMs: 1234,
      })

      await provider.listCalendars(credentials)

      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe('https://fake-graph.test/v1/me/calendars')
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
