import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { VideoRoomsProvider } from '@molecule/api-video-rooms'

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

describe('@molecule/api-video-rooms-daily-co', () => {
  const calls: RecordedCall[] = []
  const responses: Response[] = []
  let mockFetch: ReturnType<typeof vi.fn>

  /**
   * Queue the next response that the mocked fetch should return. Calls
   * are still recorded into `calls`, regardless of how many responses
   * have been queued.
   */
  function queueResponse(body: unknown, init: { status?: number; ok?: boolean } = {}): void {
    responses.push(makeResponse(body, init))
  }

  function queueRawResponse(response: Response): void {
    responses.push(response)
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
    process.env.DAILY_CO_API_KEY = 'dco_test_key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.DAILY_CO_API_KEY
  })

  describe('createProvider', () => {
    it('throws when no api key is configured', () => {
      delete process.env.DAILY_CO_API_KEY
      expect(() => createProvider({ fetch: mockFetch })).toThrow(/apiKey is required/)
    })

    it('does not include the api key in the missing-key error message', () => {
      delete process.env.DAILY_CO_API_KEY
      try {
        createProvider({ fetch: mockFetch })
      } catch (error) {
        expect(String(error)).not.toContain('dco_test_key')
        return
      }
      throw new Error('expected createProvider to throw')
    })

    it('reads DAILY_CO_API_KEY from the environment when no apiKey is given', async () => {
      queueResponse({ name: 'class-101', url: 'https://example.daily.co/class-101' })

      const provider = createProvider({ fetch: mockFetch })
      await provider.createRoom({ name: 'class-101' })

      expect(calls[0]!.init?.headers).toBeDefined()
      const headers = new Headers(calls[0]!.init!.headers)
      expect(headers.get('Authorization')).toBe('Bearer dco_test_key')
    })

    it('honours an explicit baseUrl', async () => {
      queueResponse({ name: 'class-101', url: 'https://example.daily.co/class-101' })

      const provider = createProvider({
        apiKey: 'explicit-key',
        baseUrl: 'https://api.example.test/v1',
        fetch: mockFetch,
      })
      await provider.createRoom({ name: 'class-101' })

      expect(calls[0]!.url).toBe('https://api.example.test/v1/rooms')
    })
  })

  describe('createRoom', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = createProvider({ apiKey: 'k', fetch: mockFetch })
    })

    it('POSTs to /rooms with mapped properties', async () => {
      queueResponse({
        name: 'class-101',
        url: 'https://example.daily.co/class-101',
        privacy: 'private',
        config: {
          exp: 1_800_000_000,
          max_participants: 30,
          enable_recording: 'cloud',
        },
      })

      const result = await provider.createRoom({
        name: 'class-101',
        privacy: 'private',
        maxParticipants: 30,
        recording: true,
        expiresAt: new Date('2027-01-15T08:00:00Z'),
      })

      expect(calls[0]!.url).toBe('https://api.daily.co/v1/rooms')
      expect(calls[0]!.init?.method).toBe('POST')
      const headers = new Headers(calls[0]!.init!.headers)
      expect(headers.get('Content-Type')).toBe('application/json')
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body).toEqual({
        name: 'class-101',
        privacy: 'private',
        properties: {
          exp: Math.floor(new Date('2027-01-15T08:00:00Z').getTime() / 1000),
          max_participants: 30,
          enable_recording: 'cloud',
        },
      })

      expect(result).toEqual({
        name: 'class-101',
        url: 'https://example.daily.co/class-101',
        privacy: 'private',
        expiresAt: new Date(1_800_000_000 * 1000),
        maxParticipants: 30,
        recording: true,
      })
    })

    it('omits properties when none are provided', async () => {
      queueResponse({ name: 'auto', url: 'https://example.daily.co/auto' })

      const result = await provider.createRoom({})
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body).toEqual({})
      expect(result).toEqual({ name: 'auto', url: 'https://example.daily.co/auto' })
    })

    it('maps recording=false to enable_recording=off and reflects it as recording=false', async () => {
      queueResponse({
        name: 'no-rec',
        url: 'https://example.daily.co/no-rec',
        config: { enable_recording: 'off' },
      })

      const result = await provider.createRoom({ name: 'no-rec', recording: false })
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body.properties).toEqual({ enable_recording: 'off' })
      expect(result.recording).toBe(false)
    })

    it('throws and does not leak the api key when the API returns an error', async () => {
      queueResponse({ error: 'invalid-room-name' }, { status: 400 })

      const p = createProvider({ apiKey: 'super-secret-key-12345', fetch: mockFetch })
      try {
        await p.createRoom({ name: 'BAD NAME' })
      } catch (error) {
        const msg = String(error)
        expect(msg).toContain('400')
        expect(msg).toContain('invalid-room-name')
        expect(msg).not.toContain('super-secret-key-12345')
        return
      }
      throw new Error('expected createRoom to throw')
    })
  })

  describe('deleteRoom', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = createProvider({ apiKey: 'k', fetch: mockFetch })
    })

    it('DELETEs /rooms/:name and resolves on 204', async () => {
      queueResponse(null, { status: 204 })
      await provider.deleteRoom('class-101')
      expect(calls[0]!.url).toBe('https://api.daily.co/v1/rooms/class-101')
      expect(calls[0]!.init?.method).toBe('DELETE')
    })

    it('url-encodes the room name', async () => {
      queueResponse(null, { status: 204 })
      await provider.deleteRoom('weird name/with/slashes')
      expect(calls[0]!.url).toBe(
        `https://api.daily.co/v1/rooms/${encodeURIComponent('weird name/with/slashes')}`,
      )
    })

    it('treats 404 as a no-op (idempotent)', async () => {
      queueResponse({ error: 'not-found' }, { status: 404 })
      await expect(provider.deleteRoom('missing')).resolves.toBeUndefined()
    })

    it('rethrows non-404 errors', async () => {
      queueResponse({ error: 'server-down' }, { status: 500 })
      await expect(provider.deleteRoom('bad')).rejects.toThrow(/500/)
    })
  })

  describe('getRoom', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = createProvider({ apiKey: 'k', fetch: mockFetch })
    })

    it('returns the mapped room when it exists', async () => {
      queueResponse({
        name: 'class-101',
        url: 'https://example.daily.co/class-101',
        privacy: 'public',
        config: { max_participants: 20 },
      })

      const room = await provider.getRoom('class-101')
      expect(calls[0]!.url).toBe('https://api.daily.co/v1/rooms/class-101')
      expect(calls[0]!.init?.method).toBeUndefined()
      expect(room).toEqual({
        name: 'class-101',
        url: 'https://example.daily.co/class-101',
        privacy: 'public',
        maxParticipants: 20,
      })
    })

    it('returns null when the room does not exist (404)', async () => {
      queueResponse({ error: 'not-found' }, { status: 404 })
      const room = await provider.getRoom('missing')
      expect(room).toBeNull()
    })

    it('rethrows non-404 errors', async () => {
      queueResponse({ error: 'kaboom' }, { status: 500 })
      await expect(provider.getRoom('boom')).rejects.toThrow(/500/)
    })
  })

  describe('createMeetingToken', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = createProvider({ apiKey: 'k', fetch: mockFetch })
    })

    it('POSTs to /meeting-tokens with mapped properties and returns the token string', async () => {
      queueResponse({ token: 'eyJhb...' })

      const expiresAt = new Date('2027-01-15T08:00:00Z')
      const token = await provider.createMeetingToken('class-101', {
        isOwner: true,
        userName: 'Ada',
        expiresAt,
      })

      expect(calls[0]!.url).toBe('https://api.daily.co/v1/meeting-tokens')
      expect(calls[0]!.init?.method).toBe('POST')
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body).toEqual({
        properties: {
          room_name: 'class-101',
          is_owner: true,
          user_name: 'Ada',
          exp: Math.floor(expiresAt.getTime() / 1000),
        },
      })
      expect(token).toBe('eyJhb...')
    })

    it('omits optional fields when not provided', async () => {
      queueResponse({ token: 't' })
      await provider.createMeetingToken('class-101')
      const body = JSON.parse(calls[0]!.init!.body as string)
      expect(body).toEqual({ properties: { room_name: 'class-101' } })
    })
  })

  describe('listRecordings', () => {
    let provider: VideoRoomsProvider

    beforeEach(() => {
      provider = createProvider({ apiKey: 'k', fetch: mockFetch })
    })

    it('GETs /recordings filtered by room and maps the result rows', async () => {
      queueResponse({
        total_count: 2,
        data: [
          {
            id: 'rec-1',
            room_name: 'class-101',
            start_ts: 1_700_000_000,
            duration: 1800,
            status: 'finished',
            download_link: 'https://recordings.example/rec-1.mp4',
          },
          {
            id: 'rec-2',
            room_name: 'class-101',
            start_ts: 1_700_010_000,
            duration: 600,
            status: 'in-progress',
          },
        ],
      })

      const recordings = await provider.listRecordings('class-101')
      expect(calls[0]!.url).toBe('https://api.daily.co/v1/recordings?room_name=class-101')
      expect(recordings).toEqual([
        {
          id: 'rec-1',
          roomName: 'class-101',
          startedAt: new Date(1_700_000_000 * 1000),
          duration: 1800,
          status: 'ready',
          downloadUrl: 'https://recordings.example/rec-1.mp4',
        },
        {
          id: 'rec-2',
          roomName: 'class-101',
          startedAt: new Date(1_700_010_000 * 1000),
          duration: 600,
          status: 'processing',
        },
      ])
    })

    it('returns an empty array when no recordings are returned', async () => {
      queueResponse({ total_count: 0 })
      const recordings = await provider.listRecordings('class-101')
      expect(recordings).toEqual([])
    })

    it('maps "deleted" and unknown recording statuses correctly', async () => {
      queueResponse({
        data: [
          { id: 'r1', room_name: 'r', status: 'deleted' },
          { id: 'r2', room_name: 'r', status: 'who-knows' },
          { id: 'r3', room_name: 'r', status: 'failed' },
        ],
      })

      const recordings = await provider.listRecordings('r')
      expect(recordings.map((r) => r.status)).toEqual(['deleted', 'processing', 'failed'])
    })
  })

  describe('error handling', () => {
    it('falls back to statusText when the body has no error or info field', async () => {
      queueResponse({}, { status: 502 })
      const provider = createProvider({ apiKey: 'k', fetch: mockFetch })
      await expect(provider.getRoom('x')).rejects.toThrow(/502/)
    })

    it('handles empty bodies on non-2xx responses without crashing JSON.parse', async () => {
      queueRawResponse({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: () => Promise.resolve(''),
        headers: new Headers(),
      } as unknown as Response)

      const provider = createProvider({ apiKey: 'k', fetch: mockFetch })
      await expect(provider.getRoom('x')).rejects.toThrow(/500/)
    })
  })
})
