import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { VideoMeetingsProvider } from '@molecule/api-video-meetings'

import { createProvider } from '../provider.js'

interface RecordedCall {
  url: string
  init: RequestInit | undefined
}

function makeResponse(body: unknown, init: { status?: number; ok?: boolean } = {}): Response {
  const status = init.status ?? 200
  const ok = init.ok ?? (status >= 200 && status < 300)
  const text = body === null || body === undefined ? '' : JSON.stringify(body)

  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response
}

describe('@molecule/api-video-meetings-zoom', () => {
  const calls: RecordedCall[] = []
  const responses: Response[] = []
  let mockFetch: ReturnType<typeof vi.fn>

  function queueResponse(body: unknown, init: { status?: number; ok?: boolean } = {}): void {
    responses.push(makeResponse(body, init))
  }

  function queueRawResponse(response: Response): void {
    responses.push(response)
  }

  /**
   * Queue an account-level OAuth token response, then any request
   * responses provided. The first call from the provider will always be
   * the OAuth token fetch when using Server-to-Server credentials.
   */
  function queueTokenAndResponses(...bodies: unknown[]): void {
    queueResponse({ access_token: 'srv-token', expires_in: 3300, token_type: 'bearer' })
    for (const b of bodies) {
      queueResponse(b)
    }
  }

  beforeEach(() => {
    calls.length = 0
    responses.length = 0
    mockFetch = vi.fn((input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls.push({ url: typeof input === 'string' ? input : input.toString(), init })
      const next = responses.shift()
      if (!next) {
        return Promise.resolve(makeResponse({}))
      }
      return Promise.resolve(next)
    })
    process.env.ZOOM_ACCOUNT_ID = 'acct_test'
    process.env.ZOOM_CLIENT_ID = 'cid_test'
    process.env.ZOOM_CLIENT_SECRET = 'csec_test'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.ZOOM_ACCOUNT_ID
    delete process.env.ZOOM_CLIENT_ID
    delete process.env.ZOOM_CLIENT_SECRET
  })

  describe('createProvider', () => {
    it('throws when no credentials are configured', () => {
      delete process.env.ZOOM_ACCOUNT_ID
      delete process.env.ZOOM_CLIENT_ID
      delete process.env.ZOOM_CLIENT_SECRET
      expect(() => createProvider({ fetch: mockFetch })).toThrow(/credentials are required/)
    })

    it('does not include client secret in missing-credentials error', () => {
      delete process.env.ZOOM_ACCOUNT_ID
      // leave clientSecret partially present
      process.env.ZOOM_CLIENT_SECRET = 'super-secret-zoom-key-12345'
      try {
        createProvider({ fetch: mockFetch })
      } catch (error) {
        expect(String(error)).not.toContain('super-secret-zoom-key-12345')
        return
      }
      throw new Error('expected createProvider to throw')
    })

    it('does not throw when an accessToken resolver is supplied', () => {
      delete process.env.ZOOM_ACCOUNT_ID
      delete process.env.ZOOM_CLIENT_ID
      delete process.env.ZOOM_CLIENT_SECRET
      expect(() =>
        createProvider({ fetch: mockFetch, accessToken: () => 'user-tok' }),
      ).not.toThrow()
    })

    it('honours an explicit baseUrl', async () => {
      queueTokenAndResponses({
        id: 1,
        topic: 'Sync',
        join_url: 'https://example.zoom.us/j/1',
      })
      const provider = createProvider({
        fetch: mockFetch,
        baseUrl: 'https://api.example.test/v2',
      })
      await provider.createMeeting({ topic: 'Sync' })
      // calls[0] is the OAuth token request, calls[1] is the meeting POST.
      expect(calls[1]!.url).toBe('https://api.example.test/v2/users/me/meetings')
    })
  })

  describe('Server-to-Server OAuth token caching', () => {
    it('reuses the cached token across multiple requests', async () => {
      // 1 token + 2 meeting GETs
      queueResponse({ access_token: 'srv-token', expires_in: 3300 })
      queueResponse({ id: 1, topic: 'a', join_url: 'https://zoom.us/j/1' })
      queueResponse({ id: 2, topic: 'b', join_url: 'https://zoom.us/j/2' })

      const provider = createProvider({ fetch: mockFetch })
      await provider.getMeeting('1')
      await provider.getMeeting('2')

      // Only one OAuth call.
      const oauthCalls = calls.filter((c) => c.url.startsWith('https://zoom.us/oauth/token'))
      expect(oauthCalls.length).toBe(1)

      // Both requests carry the same Bearer token.
      const apiCalls = calls.filter((c) => c.url.startsWith('https://api.zoom.us/v2'))
      const auth0 = new Headers(apiCalls[0]!.init!.headers).get('Authorization')
      const auth1 = new Headers(apiCalls[1]!.init!.headers).get('Authorization')
      expect(auth0).toBe('Bearer srv-token')
      expect(auth1).toBe('Bearer srv-token')
    })

    it('refetches the token after expiry', async () => {
      let nowMs = 1_000_000_000_000
      const now = (): number => nowMs

      // 1st token (60s TTL after the 60s safety margin → effectively 0s usable),
      // then meeting GET, then 2nd token, then another meeting GET.
      queueResponse({ access_token: 'first-token', expires_in: 70 })
      queueResponse({ id: 1, topic: 'a', join_url: 'https://zoom.us/j/1' })
      queueResponse({ access_token: 'second-token', expires_in: 70 })
      queueResponse({ id: 2, topic: 'b', join_url: 'https://zoom.us/j/2' })

      const provider = createProvider({ fetch: mockFetch, now })
      await provider.getMeeting('1')

      // Advance past the cached expiry (70 - 60 = 10s usable).
      nowMs += 11_000

      await provider.getMeeting('2')

      const oauthCalls = calls.filter((c) => c.url.startsWith('https://zoom.us/oauth/token'))
      expect(oauthCalls.length).toBe(2)
    })

    it('sends a Basic auth header to the OAuth endpoint and never logs the secret', async () => {
      queueResponse({ access_token: 'srv-token', expires_in: 3300 })
      queueResponse({ id: 1, topic: 'a', join_url: 'https://zoom.us/j/1' })

      const provider = createProvider({
        fetch: mockFetch,
        clientId: 'public-client-id',
        clientSecret: 'super-secret-zoom-key-12345',
      })
      await provider.getMeeting('1')

      const tokenCall = calls[0]!
      expect(tokenCall.url).toContain(
        'https://zoom.us/oauth/token?grant_type=account_credentials&account_id=',
      )
      const basic = new Headers(tokenCall.init!.headers).get('Authorization')
      expect(basic).toBe(
        `Basic ${Buffer.from('public-client-id:super-secret-zoom-key-12345').toString('base64')}`,
      )
    })

    it('throws and does not leak the client secret on token endpoint failure', async () => {
      queueResponse({ reason: 'invalid_client' }, { status: 401 })

      const provider = createProvider({
        fetch: mockFetch,
        clientSecret: 'super-secret-zoom-key-12345',
      })
      try {
        await provider.getMeeting('1')
      } catch (error) {
        const msg = String(error)
        expect(msg).toContain('401')
        expect(msg).not.toContain('super-secret-zoom-key-12345')
        return
      }
      throw new Error('expected getMeeting to throw')
    })

    it('throws when the token response is malformed', async () => {
      queueRawResponse(
        makeResponse({ token_type: 'bearer' /* no access_token */ }, { status: 200 }),
      )
      const provider = createProvider({ fetch: mockFetch })
      await expect(provider.getMeeting('1')).rejects.toThrow(/access_token/)
    })
  })

  describe('user-OAuth accessToken resolver', () => {
    it('uses the resolver instead of fetching account tokens', async () => {
      queueResponse({ id: 1, topic: 'a', join_url: 'https://zoom.us/j/1' })
      const accessToken = vi.fn().mockResolvedValue('user-bearer-token')
      const provider = createProvider({ fetch: mockFetch, accessToken })

      await provider.getMeeting('1')

      expect(accessToken).toHaveBeenCalledTimes(1)
      const oauth = calls.filter((c) => c.url.startsWith('https://zoom.us/oauth/token'))
      expect(oauth.length).toBe(0)
      const headers = new Headers(calls[0]!.init!.headers)
      expect(headers.get('Authorization')).toBe('Bearer user-bearer-token')
    })

    it('calls the resolver for every request (no provider-side caching)', async () => {
      queueResponse({ id: 1, topic: 'a', join_url: 'https://zoom.us/j/1' })
      queueResponse({ id: 2, topic: 'b', join_url: 'https://zoom.us/j/2' })
      const accessToken = vi.fn().mockResolvedValueOnce('tok-1').mockResolvedValueOnce('tok-2')
      const provider = createProvider({ fetch: mockFetch, accessToken })

      await provider.getMeeting('1')
      await provider.getMeeting('2')

      expect(accessToken).toHaveBeenCalledTimes(2)
    })
  })

  describe('createMeeting', () => {
    let provider: VideoMeetingsProvider

    beforeEach(() => {
      provider = createProvider({ fetch: mockFetch, accessToken: () => 'tok' })
    })

    it('POSTs to /users/me/meetings by default with mapped properties', async () => {
      queueResponse({
        id: 81234567890,
        topic: 'Quarterly review',
        join_url: 'https://example.zoom.us/j/81234567890',
        start_url: 'https://example.zoom.us/s/81234567890?zak=...',
        password: 'pw',
        agenda: 'Q1',
        type: 2,
        start_time: '2027-01-15T17:00:00Z',
        duration: 60,
        timezone: 'UTC',
        settings: {
          host_video: true,
          participant_video: false,
          waiting_room: true,
          auto_recording: 'cloud',
          approval_type: 2,
        },
      })

      const result = await provider.createMeeting({
        topic: 'Quarterly review',
        startTime: new Date('2027-01-15T17:00:00Z'),
        durationMinutes: 60,
        agenda: 'Q1',
        password: 'pw',
        timezone: 'UTC',
        settings: {
          hostVideo: true,
          participantVideo: false,
          waitingRoom: true,
          autoRecording: 'cloud',
          extra: { approval_type: 2 },
        },
      })

      expect(calls[0]!.url).toBe('https://api.zoom.us/v2/users/me/meetings')
      expect(calls[0]!.init?.method).toBe('POST')
      const headers = new Headers(calls[0]!.init!.headers)
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('Authorization')).toBe('Bearer tok')

      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body).toEqual({
        topic: 'Quarterly review',
        agenda: 'Q1',
        password: 'pw',
        duration: 60,
        start_time: '2027-01-15T17:00:00.000Z',
        timezone: 'UTC',
        type: 2,
        settings: {
          host_video: true,
          participant_video: false,
          waiting_room: true,
          auto_recording: 'cloud',
          approval_type: 2,
        },
      })

      expect(result).toEqual({
        id: '81234567890',
        topic: 'Quarterly review',
        joinUrl: 'https://example.zoom.us/j/81234567890',
        startUrl: 'https://example.zoom.us/s/81234567890?zak=...',
        meetingCode: '81234567890',
        password: 'pw',
        startTime: new Date('2027-01-15T17:00:00Z'),
        durationMinutes: 60,
        agenda: 'Q1',
        timezone: 'UTC',
        type: 'scheduled',
        settings: {
          hostVideo: true,
          participantVideo: false,
          waitingRoom: true,
          autoRecording: 'cloud',
          extra: { approval_type: 2 },
        },
      })
    })

    it('targets the supplied userId and url-encodes it', async () => {
      queueResponse({ id: 1, topic: 't', join_url: 'https://zoom.us/j/1' })
      await provider.createMeeting({ topic: 't' }, 'user@example.com')
      expect(calls[0]!.url).toBe(
        `https://api.zoom.us/v2/users/${encodeURIComponent('user@example.com')}/meetings`,
      )
    })

    it('defaults type to instant (1) when no startTime is given', async () => {
      queueResponse({ id: 1, topic: 't', join_url: 'https://zoom.us/j/1' })
      await provider.createMeeting({ topic: 't' })
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body.type).toBe(1)
      expect(body.start_time).toBeUndefined()
    })

    it('defaults type to scheduled (2) when startTime is given', async () => {
      queueResponse({ id: 1, topic: 't', join_url: 'https://zoom.us/j/1' })
      await provider.createMeeting({ topic: 't', startTime: new Date('2027-01-15T17:00:00Z') })
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body.type).toBe(2)
      expect(body.start_time).toBe('2027-01-15T17:00:00.000Z')
    })

    it('honours an explicit recurring type', async () => {
      queueResponse({ id: 1, topic: 't', join_url: 'https://zoom.us/j/1' })
      await provider.createMeeting({ topic: 't', type: 'recurring' })
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body.type).toBe(8)
    })

    it('throws and does not leak the access token on API error', async () => {
      queueResponse({ message: 'invalid topic', code: 300 }, { status: 400 })
      const p = createProvider({
        fetch: mockFetch,
        accessToken: () => 'super-secret-bearer-1234',
      })
      try {
        await p.createMeeting({ topic: '' })
      } catch (error) {
        const msg = String(error)
        expect(msg).toContain('400')
        expect(msg).toContain('invalid topic')
        expect(msg).not.toContain('super-secret-bearer-1234')
        return
      }
      throw new Error('expected createMeeting to throw')
    })
  })

  describe('getMeeting', () => {
    let provider: VideoMeetingsProvider

    beforeEach(() => {
      provider = createProvider({ fetch: mockFetch, accessToken: () => 'tok' })
    })

    it('returns the mapped meeting when it exists', async () => {
      queueResponse({
        id: 12345,
        topic: 'Sync',
        join_url: 'https://zoom.us/j/12345',
        type: 2,
        duration: 30,
      })
      const meeting = await provider.getMeeting('12345')
      expect(calls[0]!.url).toBe('https://api.zoom.us/v2/meetings/12345')
      expect(meeting).toEqual({
        id: '12345',
        topic: 'Sync',
        joinUrl: 'https://zoom.us/j/12345',
        meetingCode: '12345',
        type: 'scheduled',
        durationMinutes: 30,
      })
    })

    it('returns null when the meeting is missing (404)', async () => {
      queueResponse({ message: 'meeting not found' }, { status: 404 })
      const meeting = await provider.getMeeting('missing')
      expect(meeting).toBeNull()
    })

    it('rethrows non-404 errors', async () => {
      queueResponse({ message: 'kaboom' }, { status: 500 })
      await expect(provider.getMeeting('boom')).rejects.toThrow(/500/)
    })
  })

  describe('updateMeeting', () => {
    let provider: VideoMeetingsProvider

    beforeEach(() => {
      provider = createProvider({ fetch: mockFetch, accessToken: () => 'tok' })
    })

    it('PATCHes /meetings/:id then re-fetches and maps the result', async () => {
      // PATCH returns 204; subsequent GET returns the updated meeting.
      queueResponse(null, { status: 204 })
      queueResponse({
        id: 12345,
        topic: 'New topic',
        join_url: 'https://zoom.us/j/12345',
        duration: 45,
      })

      const meeting = await provider.updateMeeting('12345', {
        topic: 'New topic',
        durationMinutes: 45,
      })

      expect(calls[0]!.url).toBe('https://api.zoom.us/v2/meetings/12345')
      expect(calls[0]!.init?.method).toBe('PATCH')
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body).toEqual({ topic: 'New topic', duration: 45 })
      // PATCH must NOT include `type` (only set on create).
      expect(body.type).toBeUndefined()

      expect(calls[1]!.url).toBe('https://api.zoom.us/v2/meetings/12345')
      expect(calls[1]!.init?.method).toBeUndefined()

      expect(meeting.topic).toBe('New topic')
      expect(meeting.durationMinutes).toBe(45)
    })

    it('omits unspecified fields from the patch body', async () => {
      queueResponse(null, { status: 204 })
      queueResponse({ id: 1, topic: 't', join_url: 'https://zoom.us/j/1' })

      await provider.updateMeeting('1', {})
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body).toEqual({})
    })
  })

  describe('deleteMeeting', () => {
    let provider: VideoMeetingsProvider

    beforeEach(() => {
      provider = createProvider({ fetch: mockFetch, accessToken: () => 'tok' })
    })

    it('DELETEs /meetings/:id and resolves on 204', async () => {
      queueResponse(null, { status: 204 })
      await provider.deleteMeeting('12345')
      expect(calls[0]!.url).toBe('https://api.zoom.us/v2/meetings/12345')
      expect(calls[0]!.init?.method).toBe('DELETE')
    })

    it('treats 404 as a no-op (idempotent)', async () => {
      queueResponse({ message: 'not found' }, { status: 404 })
      await expect(provider.deleteMeeting('missing')).resolves.toBeUndefined()
    })

    it('rethrows non-404 errors', async () => {
      queueResponse({ message: 'server-down' }, { status: 500 })
      await expect(provider.deleteMeeting('bad')).rejects.toThrow(/500/)
    })

    it('url-encodes the meeting id', async () => {
      queueResponse(null, { status: 204 })
      await provider.deleteMeeting('weird/id')
      expect(calls[0]!.url).toBe(
        `https://api.zoom.us/v2/meetings/${encodeURIComponent('weird/id')}`,
      )
    })
  })

  describe('listMeetings', () => {
    let provider: VideoMeetingsProvider

    beforeEach(() => {
      provider = createProvider({ fetch: mockFetch, accessToken: () => 'tok' })
    })

    it('GETs /users/:userId/meetings with the default scheduled type', async () => {
      queueResponse({
        meetings: [
          { id: 1, topic: 'a', join_url: 'https://zoom.us/j/1', type: 2 },
          { id: 2, topic: 'b', join_url: 'https://zoom.us/j/2', type: 8 },
        ],
        next_page_token: 'cursor-2',
      })

      const page = await provider.listMeetings('me')
      expect(calls[0]!.url).toBe('https://api.zoom.us/v2/users/me/meetings?type=scheduled')
      expect(page.nextPageToken).toBe('cursor-2')
      expect(page.meetings).toEqual([
        {
          id: '1',
          topic: 'a',
          joinUrl: 'https://zoom.us/j/1',
          meetingCode: '1',
          type: 'scheduled',
        },
        {
          id: '2',
          topic: 'b',
          joinUrl: 'https://zoom.us/j/2',
          meetingCode: '2',
          type: 'recurring',
        },
      ])
    })

    it('forwards page_size and next_page_token', async () => {
      queueResponse({ meetings: [] })
      await provider.listMeetings('user-1', {
        type: 'upcoming',
        pageSize: 50,
        pageToken: 'tok-1',
      })
      expect(calls[0]!.url).toBe(
        'https://api.zoom.us/v2/users/user-1/meetings?type=upcoming&page_size=50&next_page_token=tok-1',
      )
    })

    it('omits nextPageToken when none is returned', async () => {
      queueResponse({ meetings: [] })
      const page = await provider.listMeetings('me')
      expect(page.nextPageToken).toBeUndefined()
    })

    it('returns an empty page when the server returns no meetings array', async () => {
      queueResponse({})
      const page = await provider.listMeetings('me')
      expect(page).toEqual({ meetings: [] })
    })

    it('maps molecule "live" filter directly and "instant" to "live"', async () => {
      queueResponse({ meetings: [] })
      await provider.listMeetings('me', { type: 'live' })
      expect(calls[0]!.url).toContain('type=live')

      queueResponse({ meetings: [] })
      await provider.listMeetings('me', { type: 'instant' })
      expect(calls.at(-1)!.url).toContain('type=live')
    })
  })

  describe('error handling', () => {
    it('falls back to statusText when the body has no message or error field', async () => {
      queueResponse({}, { status: 502 })
      const provider = createProvider({ fetch: mockFetch, accessToken: () => 'tok' })
      await expect(provider.getMeeting('x')).rejects.toThrow(/502/)
    })

    it('handles empty bodies on non-2xx responses without crashing JSON.parse', async () => {
      queueRawResponse({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: () => Promise.resolve(''),
        headers: new Headers(),
      } as unknown as Response)

      const provider = createProvider({ fetch: mockFetch, accessToken: () => 'tok' })
      await expect(provider.getMeeting('x')).rejects.toThrow(/500/)
    })
  })
})
