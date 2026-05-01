/**
 * Tests for the Oura wearable provider.
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
import type { UserConnection, WearableCredentialsStore } from '@molecule/api-wearable'

import {
  base64UrlEncode,
  createProvider,
  decodeOuraHypnogram,
  fromOuraActivity,
  fromOuraHeartRate,
  fromOuraSleep,
  mapSleepPhaseDigit,
  PROVIDER_NAME,
} from '../provider.js'

const mockGet = http.get as unknown as ReturnType<typeof vi.fn>
const mockPost = http.post as unknown as ReturnType<typeof vi.fn>

const okResponse = <T>(data: T) => ({
  status: 200,
  statusText: 'OK',
  headers: {},
  data,
  request: { url: '' },
})

/**
 * Lightweight in-memory implementation of {@link WearableCredentialsStore}
 * exposed so individual tests can pre-seed connections without spinning
 * up a database.
 *
 * @param initial - Optional initial map of `${providerName}:${userId}` → connection.
 * @returns The credentials store plus its backing `data` Map.
 */
const createInMemoryCredentialsStore = (
  initial: Record<string, UserConnection> = {},
): WearableCredentialsStore & {
  data: Map<string, UserConnection>
} => {
  const data = new Map<string, UserConnection>(Object.entries(initial).map(([k, v]) => [k, v]))
  const key = (userId: string, providerName: string) => `${providerName}:${userId}`
  return {
    data,
    async read(userId, providerName) {
      return data.get(key(userId, providerName)) ?? null
    },
    async write(providerName, connection) {
      data.set(key(connection.userId, providerName), connection)
    },
    async remove(userId, providerName) {
      data.delete(key(userId, providerName))
    },
  }
}

const seedConnection = (overrides: Partial<UserConnection> = {}): UserConnection => ({
  userId: 'user-1',
  providerAccountId: '',
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  connectedAt: 1_700_000_000_000,
  ...overrides,
})

const credentialsKey = (userId: string) => `${PROVIDER_NAME}:${userId}`

describe('Oura provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.OAUTH_OURA_CLIENT_ID = 'client-id'
    process.env.OAUTH_OURA_CLIENT_SECRET = 'client-secret'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('factory validation', () => {
    it('throws when redirectUri is missing', () => {
      expect(() =>
        createProvider({
          redirectUri: '',
          credentialsStore: createInMemoryCredentialsStore(),
        }),
      ).toThrow(/redirectUri/)
    })

    it('throws when credentialsStore is missing', () => {
      expect(() =>
        createProvider({
          redirectUri: 'https://app/callback',
          credentialsStore: undefined as unknown as WearableCredentialsStore,
        }),
      ).toThrow(/credentialsStore/)
    })

    it('exposes the expected providerName', () => {
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore: createInMemoryCredentialsStore(),
      })
      expect(provider.providerName).toBe('oura')
      expect(PROVIDER_NAME).toBe('oura')
    })
  })

  describe('startAuthorize', () => {
    it('builds an Oura authorize URL with state and scopes', () => {
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore: createInMemoryCredentialsStore(),
        // Deterministic random so the test asserts a stable state shape.
        randomBytes: (size) => new Uint8Array(size).fill(7),
      })

      const { url, state } = provider.startAuthorize()

      expect(url).toMatch(/^https:\/\/cloud\.ouraring\.com\/oauth\/authorize\?/)
      const parsed = new URL(url)
      expect(parsed.searchParams.get('response_type')).toBe('code')
      expect(parsed.searchParams.get('client_id')).toBe('client-id')
      expect(parsed.searchParams.get('redirect_uri')).toBe('https://app/callback')
      expect(parsed.searchParams.get('scope')).toContain('daily')
      expect(parsed.searchParams.get('scope')).toContain('heartrate')
      expect(parsed.searchParams.get('state')).toBe(state)
      expect(state.length).toBeGreaterThan(0)
    })
  })

  describe('connect', () => {
    it('exchanges code for tokens, persists the connection, and returns it', async () => {
      const credentialsStore = createInMemoryCredentialsStore()

      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-new',
          refresh_token: 'refresh-new',
          expires_in: 86400,
          scope: 'daily heartrate personal',
          token_type: 'Bearer',
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        now: () => 2_000_000_000_000,
      })

      const connection = await provider.connect('user-1', 'auth-code-abc')

      expect(mockPost).toHaveBeenCalledTimes(1)
      const [url, body, options] = mockPost.mock.calls[0]
      expect(url).toBe('https://api.ouraring.com/oauth/token')
      expect(typeof body).toBe('string')
      expect(body).toContain('grant_type=authorization_code')
      expect(body).toContain('code=auth-code-abc')
      expect(body).toContain(`redirect_uri=${encodeURIComponent('https://app/callback')}`)
      expect(options.headers['content-type']).toBe('application/x-www-form-urlencoded')
      expect(options.headers.authorization).toMatch(/^Basic /)

      expect(connection).toMatchObject({
        userId: 'user-1',
        providerAccountId: '',
        accessToken: 'access-new',
        refreshToken: 'refresh-new',
        scopes: ['daily', 'heartrate', 'personal'],
        connectedAt: 2_000_000_000_000,
      })
      expect(connection.expiresAt).toBe(2_000_000_000_000 + 86400 * 1000)
      expect(credentialsStore.data.get(credentialsKey('user-1'))).toBe(connection)
    })

    it('throws sanitized error when the token response is malformed', async () => {
      mockPost.mockResolvedValueOnce(
        okResponse({ error: 'invalid_grant', error_description: 'access_token=leak' }),
      )
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore: createInMemoryCredentialsStore(),
      })
      await expect(provider.connect('user-1', 'auth-code')).rejects.toThrow(
        /Oura connect failed: malformed token response/,
      )
    })
  })

  describe('refreshConnection', () => {
    it('rotates the access + refresh tokens and persists', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })

      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          expires_in: 3600,
          scope: 'daily heartrate',
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        now: () => 2_000_000_000_000,
      })

      const connection = await provider.refreshConnection('user-1')

      expect(mockPost).toHaveBeenCalledTimes(1)
      const [url, body] = mockPost.mock.calls[0]
      expect(url).toBe('https://api.ouraring.com/oauth/token')
      expect(body).toContain('grant_type=refresh_token')
      expect(body).toContain('refresh_token=refresh-1')

      expect(connection.accessToken).toBe('access-2')
      expect(connection.refreshToken).toBe('refresh-2')
      expect(connection.expiresAt).toBe(2_000_000_000_000 + 3600 * 1000)
      expect(credentialsStore.data.get(credentialsKey('user-1'))).toBe(connection)
    })

    it('throws if the user has no stored connection', async () => {
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore: createInMemoryCredentialsStore(),
      })
      await expect(provider.refreshConnection('ghost')).rejects.toThrow(/not found/)
    })
  })

  describe('disconnect', () => {
    it('best-effort revokes upstream and removes the local record', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockPost.mockResolvedValueOnce(okResponse({ ok: true }))

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      await provider.disconnect('user-1')

      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost.mock.calls[0][0]).toBe('https://api.ouraring.com/oauth/revoke')
      expect(mockPost.mock.calls[0][1]).toBe('access_token=access-1')
      expect(credentialsStore.data.has(credentialsKey('user-1'))).toBe(false)
    })

    it('still removes the local record when revoke fails', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockPost.mockRejectedValueOnce(
        Object.assign(new Error('revoke failed Bearer access-1'), {
          response: { status: 500, headers: {}, data: {} },
          request: { url: '' },
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      await provider.disconnect('user-1')
      expect(credentialsStore.data.has(credentialsKey('user-1'))).toBe(false)
    })

    it('removes nothing and skips revoke when no connection exists', async () => {
      const credentialsStore = createInMemoryCredentialsStore()
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      await provider.disconnect('ghost')
      expect(mockPost).not.toHaveBeenCalled()
      expect(credentialsStore.data.size).toBe(0)
    })
  })

  describe('getDailyActivity', () => {
    it('GETs the daily_activity endpoint and normalizes the matching day', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(
        okResponse({
          data: [
            {
              day: '2026-05-01',
              steps: 9821,
              equivalent_walking_distance: 7100,
              total_calories: 2300,
              active_calories: 540,
              high_activity_time: 600, // 10 min
              medium_activity_time: 1800, // 30 min
              low_activity_time: 7200, // 120 min
            },
          ],
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      const result = await provider.getDailyActivity('user-1', '2026-05-01')

      expect(mockGet).toHaveBeenCalledTimes(1)
      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe(
        'https://api.ouraring.com/v2/usercollection/daily_activity?start_date=2026-05-01&end_date=2026-05-01',
      )
      expect(options.headers.authorization).toBe('Bearer access-1')
      expect(options.headers.accept).toBe('application/json')

      expect(result).toEqual({
        date: '2026-05-01',
        steps: 9821,
        distanceMeters: 7100,
        caloriesOut: 2300,
        activeMinutes: 160,
      })
    })

    it('zero-defaults when the response has no matching entry', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(okResponse({ data: [] }))
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })
      const result = await provider.getDailyActivity('user-1', '2026-05-01')
      expect(result).toEqual({
        date: '2026-05-01',
        steps: 0,
        distanceMeters: 0,
        caloriesOut: 0,
        activeMinutes: 0,
      })
    })
  })

  describe('getDailySleep', () => {
    it('returns ordered sleep sessions with stage summary and decoded segments', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(
        okResponse({
          data: [
            {
              id: 'sleep-1',
              day: '2026-05-01',
              bedtime_start: '2026-05-01T23:00:00+00:00',
              bedtime_end: '2026-05-02T07:00:00+00:00',
              type: 'long_sleep',
              total_sleep_duration: 26400, // 440 min
              time_in_bed: 28800, // 480 min
              awake_time: 2400, // 40 min
              light_sleep_duration: 13200, // 220 min
              deep_sleep_duration: 5400, // 90 min
              rem_sleep_duration: 7800, // 130 min
              efficiency: 92,
              // 6 segments × 5min = 30 min of stages encoded.
              // 1=deep, 2=light, 3=rem, 4=awake
              sleep_phase_5_min: '222114',
            },
          ],
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      const result = await provider.getDailySleep('user-1', '2026-05-01')
      expect(mockGet.mock.calls[0][0]).toBe(
        'https://api.ouraring.com/v2/usercollection/sleep?start_date=2026-05-01&end_date=2026-05-01',
      )
      expect(result).toHaveLength(1)
      const session = result[0]
      expect(session.id).toBe('sleep-1')
      expect(session.isMainSleep).toBe(true)
      expect(session.timeAsleepMinutes).toBe(440)
      expect(session.timeInBedMinutes).toBe(480)
      expect(session.efficiency).toBe(92)
      expect(session.stageSummary).toEqual({
        awakeMinutes: 40,
        lightMinutes: 220,
        deepMinutes: 90,
        remMinutes: 130,
      })
      expect(session.segments).toBeDefined()
      // Coalesced runs: light (3×5min=900s) → deep (2×5min=600s) → awake (1×5min=300s)
      expect(session.segments).toHaveLength(3)
      expect(session.segments?.[0]).toMatchObject({ stage: 'light', durationSeconds: 900 })
      expect(session.segments?.[1]).toMatchObject({ stage: 'deep', durationSeconds: 600 })
      expect(session.segments?.[2]).toMatchObject({ stage: 'awake', durationSeconds: 300 })
    })

    it('marks non long_sleep sessions as isMainSleep=false', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(
        okResponse({
          data: [
            {
              id: 'nap-1',
              day: '2026-05-01',
              bedtime_start: '2026-05-01T13:00:00+00:00',
              bedtime_end: '2026-05-01T13:30:00+00:00',
              type: 'rest',
              total_sleep_duration: 1500,
              time_in_bed: 1800,
            },
          ],
        }),
      )
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })
      const result = await provider.getDailySleep('user-1', '2026-05-01')
      expect(result[0].isMainSleep).toBe(false)
    })

    it('returns an empty list when no sleep data', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(okResponse({}))
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })
      expect(await provider.getDailySleep('user-1', '2026-05-01')).toEqual([])
    })
  })

  describe('getDailyHeartRate', () => {
    it('GETs the heartrate endpoint with UTC datetime bounds and aggregates min BPM as resting', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(
        okResponse({
          data: [
            { bpm: 72, source: 'sleep', timestamp: '2026-05-01T01:00:00+00:00' },
            { bpm: 58, source: 'sleep', timestamp: '2026-05-01T03:00:00+00:00' },
            { bpm: 110, source: 'workout', timestamp: '2026-05-01T18:00:00+00:00' },
            { bpm: 0, source: 'bogus', timestamp: '2026-05-01T19:00:00+00:00' },
          ],
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      const result = await provider.getDailyHeartRate('user-1', '2026-05-01')
      expect(mockGet.mock.calls[0][0]).toBe(
        'https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=' +
          encodeURIComponent('2026-05-01T00:00:00+00:00') +
          '&end_datetime=' +
          encodeURIComponent('2026-05-01T23:59:59+00:00'),
      )
      expect(result.date).toBe('2026-05-01')
      expect(result.restingHeartRate).toBe(58)
      // Oura's heartrate endpoint does not provide zone breakdowns.
      expect(result.zones).toBeUndefined()
    })

    it('returns undefined restingHeartRate when no samples', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(okResponse({ data: [] }))
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })
      const result = await provider.getDailyHeartRate('user-1', '2026-05-01')
      expect(result.restingHeartRate).toBeUndefined()
    })
  })

  describe('getWeight', () => {
    it('returns an empty array without making any HTTP calls (Oura does not track weight)', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })
      const result = await provider.getWeight('user-1', { start: '2026-04-01', end: '2026-04-30' })
      expect(result).toEqual([])
      expect(mockGet).not.toHaveBeenCalled()
      expect(mockPost).not.toHaveBeenCalled()
    })
  })

  describe('token refresh', () => {
    it('refreshes on 401, retries the call once, and persists the rotated record', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })

      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: { detail: 'Token expired' } },
        request: { url: '' },
      })

      mockGet
        .mockRejectedValueOnce(unauthorized)
        .mockResolvedValueOnce(okResponse({ data: [{ day: '2026-05-01', steps: 1 }] }))
      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-2',
          refresh_token: 'refresh-2',
          expires_in: 3600,
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        now: () => 2_000_000_000_000,
      })

      const result = await provider.getDailyActivity('user-1', '2026-05-01')

      expect(mockGet).toHaveBeenCalledTimes(2)
      expect(mockGet.mock.calls[0][1].headers.authorization).toBe('Bearer access-1')
      expect(mockGet.mock.calls[1][1].headers.authorization).toBe('Bearer access-2')
      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockPost.mock.calls[0][0]).toBe('https://api.ouraring.com/oauth/token')
      expect(mockPost.mock.calls[0][1]).toContain('grant_type=refresh_token')
      expect(mockPost.mock.calls[0][1]).toContain('refresh_token=refresh-1')

      const stored = credentialsStore.data.get(credentialsKey('user-1'))
      expect(stored?.accessToken).toBe('access-2')
      expect(stored?.refreshToken).toBe('refresh-2')

      expect(result.steps).toBe(1)
    })

    it('proactively refreshes when expiresAt is in the past', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection({ expiresAt: 1 }),
      })

      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-fresh',
          refresh_token: 'refresh-fresh',
          expires_in: 3600,
        }),
      )
      mockGet.mockResolvedValueOnce(okResponse({ data: [] }))

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        now: () => 2_000_000_000_000,
      })

      await provider.getDailyActivity('user-1', '2026-05-01')

      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockGet).toHaveBeenCalledTimes(1)
      expect(mockGet.mock.calls[0][1].headers.authorization).toBe('Bearer access-fresh')
      expect(credentialsStore.data.get(credentialsKey('user-1'))?.accessToken).toBe('access-fresh')
    })

    it('does not double-refresh when a second 401 follows the refresh', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: {} },
        request: { url: '' },
      })

      mockGet.mockRejectedValueOnce(unauthorized).mockRejectedValueOnce(unauthorized)
      mockPost.mockResolvedValueOnce(
        okResponse({ access_token: 'access-2', refresh_token: 'refresh-2', expires_in: 3600 }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      await expect(provider.getDailyActivity('user-1', '2026-05-01')).rejects.toThrow(
        /getDailyActivity failed/,
      )
      expect(mockPost).toHaveBeenCalledTimes(1)
      expect(mockGet).toHaveBeenCalledTimes(2)
    })
  })

  describe('error sanitization', () => {
    it('never leaks tokens in the thrown message on 5xx errors', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      const serverError = Object.assign(new Error('boom Bearer access-1 refresh-1'), {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          data: { detail: 'access_token=access-1 leaked' },
          request: { url: '' },
        },
        request: { url: '' },
      })
      mockGet.mockRejectedValueOnce(serverError)

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      try {
        await provider.getDailyActivity('user-1', '2026-05-01')
        throw new Error('should have thrown')
      } catch (error) {
        const msg = (error as Error).message
        expect(msg).toMatch(/Oura getDailyActivity failed status=500/)
        expect(msg).not.toContain('access-1')
        expect(msg).not.toContain('refresh-1')
        expect(msg).not.toContain('Bearer')
        expect(msg).not.toContain('access_token=')
      }
    })

    it('never leaks tokens after a failed refresh', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: {} },
        request: { url: '' },
      })
      const badRefresh = Object.assign(
        new Error('refresh_token=refresh-1 access_token=access-leaked'),
        {
          response: { status: 400, headers: {}, data: { error: 'invalid_grant' } },
          request: { url: '' },
        },
      )
      mockGet.mockRejectedValueOnce(unauthorized)
      mockPost.mockRejectedValueOnce(badRefresh)

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      try {
        await provider.getDailyActivity('user-1', '2026-05-01')
        throw new Error('should have thrown')
      } catch (error) {
        const msg = (error as Error).message
        expect(msg).not.toContain('refresh-1')
        expect(msg).not.toContain('access-leaked')
        expect(msg).not.toContain('Bearer')
      }
    })
  })

  describe('configuration', () => {
    it('throws when client id is missing and not in env', async () => {
      delete process.env.OAUTH_OURA_CLIENT_ID
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection({ expiresAt: 1 }),
      })

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })
      await expect(provider.getDailyActivity('user-1', '2026-05-01')).rejects.toThrow(
        /OAUTH_OURA_CLIENT_ID/,
      )
    })

    it('throws when client secret is missing and not in env', async () => {
      delete process.env.OAUTH_OURA_CLIENT_SECRET
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection({ expiresAt: 1 }),
      })

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })
      await expect(provider.getDailyActivity('user-1', '2026-05-01')).rejects.toThrow(
        /OAUTH_OURA_CLIENT_SECRET/,
      )
    })

    it('honors clientId/clientSecret options without env vars', async () => {
      delete process.env.OAUTH_OURA_CLIENT_ID
      delete process.env.OAUTH_OURA_CLIENT_SECRET

      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection({ expiresAt: 1 }),
      })

      mockPost.mockResolvedValueOnce(
        okResponse({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
      )
      mockGet.mockResolvedValueOnce(okResponse({ data: [] }))

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        clientId: 'opt-id',
        clientSecret: 'opt-secret',
      })

      await provider.getDailyActivity('user-1', '2026-05-01')

      const [, , options] = mockPost.mock.calls[0]
      const expectedBasic = Buffer.from('opt-id:opt-secret').toString('base64')
      expect(options.headers.authorization).toBe(`Basic ${expectedBasic}`)
    })

    it('honors apiBaseUrl/tokenUrl/timeoutMs overrides', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(okResponse({ data: [] }))

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        apiBaseUrl: 'https://fake-oura.test/v2',
        timeoutMs: 1234,
      })

      await provider.getDailyActivity('user-1', '2026-05-01')

      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe(
        'https://fake-oura.test/v2/usercollection/daily_activity?start_date=2026-05-01&end_date=2026-05-01',
      )
      expect(options.timeout).toBe(1234)
    })
  })
})

/* -------------------------------------------------------------------------- *
 * Pure-function unit tests (no HTTP, no store).
 * -------------------------------------------------------------------------- */

describe('base64UrlEncode', () => {
  it('strips padding and uses url-safe alphabet', () => {
    expect(base64UrlEncode(new Uint8Array([0]))).toBe('AA')
    expect(base64UrlEncode(new Uint8Array([255, 255, 255]))).toBe('____')
    expect(base64UrlEncode(new Uint8Array([62, 63]))).toBe('Pj8')
  })
})

describe('mapSleepPhaseDigit', () => {
  it.each([
    ['1', 'deep'],
    ['2', 'light'],
    ['3', 'rem'],
    ['4', 'awake'],
    ['9', 'unknown'],
    ['', 'unknown'],
  ])('maps %s -> %s', (input, expected) => {
    expect(mapSleepPhaseDigit(input)).toBe(expected)
  })
})

describe('decodeOuraHypnogram', () => {
  it('returns undefined when hypnogram is empty or missing', () => {
    expect(decodeOuraHypnogram(undefined, '2026-05-01T23:00:00+00:00')).toBeUndefined()
    expect(decodeOuraHypnogram('', '2026-05-01T23:00:00+00:00')).toBeUndefined()
  })

  it('returns undefined when bedtime_start is unparseable', () => {
    expect(decodeOuraHypnogram('1234', 'not-a-date')).toBeUndefined()
  })

  it('coalesces adjacent same-stage segments', () => {
    const segments = decodeOuraHypnogram('111223', '2026-05-01T00:00:00+00:00')
    expect(segments).toBeDefined()
    expect(segments).toHaveLength(3)
    expect(segments?.[0]).toMatchObject({ stage: 'deep', durationSeconds: 900 })
    expect(segments?.[1]).toMatchObject({ stage: 'light', durationSeconds: 600 })
    expect(segments?.[2]).toMatchObject({ stage: 'rem', durationSeconds: 300 })
  })

  it('anchors segment 0 at bedtime_start', () => {
    const segments = decodeOuraHypnogram('1', '2026-05-01T00:00:00+00:00')
    expect(segments?.[0].start).toBe('2026-05-01T00:00:00.000Z')
    expect(segments?.[0].end).toBe('2026-05-01T00:05:00.000Z')
  })
})

describe('fromOuraActivity', () => {
  it('zero-defaults when entry is undefined', () => {
    expect(fromOuraActivity('2026-05-01', undefined)).toEqual({
      date: '2026-05-01',
      steps: 0,
      distanceMeters: 0,
      caloriesOut: 0,
      activeMinutes: 0,
    })
  })

  it('rounds active minutes from second-resolution activity-time fields', () => {
    expect(
      fromOuraActivity('2026-05-01', {
        day: '2026-05-01',
        high_activity_time: 90,
        medium_activity_time: 90,
        low_activity_time: 60,
      }).activeMinutes,
    ).toBe(4)
  })
})

describe('fromOuraSleep', () => {
  it('orders sessions ascending by start', () => {
    const result = fromOuraSleep('2026-05-01', {
      data: [
        {
          id: 'b',
          day: '2026-05-01',
          bedtime_start: '2026-05-01T13:00:00+00:00',
          bedtime_end: '2026-05-01T14:00:00+00:00',
          type: 'rest',
        },
        {
          id: 'a',
          day: '2026-05-01',
          bedtime_start: '2026-05-01T02:00:00+00:00',
          bedtime_end: '2026-05-01T08:00:00+00:00',
          type: 'long_sleep',
        },
      ],
    })
    expect(result.map((s) => s.id)).toEqual(['a', 'b'])
  })
})

describe('fromOuraHeartRate', () => {
  it('returns the requested date and undefined fields when payload is empty', () => {
    expect(fromOuraHeartRate('2026-05-01', {})).toEqual({
      date: '2026-05-01',
      restingHeartRate: undefined,
      zones: undefined,
    })
  })

  it('ignores zero / negative bpm samples', () => {
    const result = fromOuraHeartRate('2026-05-01', {
      data: [
        { bpm: 0, source: 'noise', timestamp: '2026-05-01T00:00:00+00:00' },
        { bpm: 60, source: 'sleep', timestamp: '2026-05-01T01:00:00+00:00' },
      ],
    })
    expect(result.restingHeartRate).toBe(60)
  })
})
