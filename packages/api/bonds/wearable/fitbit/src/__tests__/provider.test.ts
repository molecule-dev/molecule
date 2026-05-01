/**
 * Tests for the Fitbit wearable provider.
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
  fromFitbitActivity,
  fromFitbitHeartRate,
  fromFitbitSleep,
  fromFitbitWeight,
  mapSleepStage,
  PROVIDER_NAME,
} from '../provider.js'
import type { FitbitCodeVerifierStore } from '../types.js'

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
 * Lightweight in-memory implementations of the bond's two store
 * dependencies — exposed so individual tests can pre-seed connections /
 * verifiers without spinning up a database.
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

const createInMemoryCodeVerifierStore = (): FitbitCodeVerifierStore & {
  data: Map<string, string>
} => {
  const data = new Map<string, string>()
  return {
    data,
    async put(state, verifier) {
      data.set(state, verifier)
    },
    async take(state) {
      const v = data.get(state) ?? null
      if (v !== null) data.delete(state)
      return v
    },
  }
}

const seedConnection = (overrides: Partial<UserConnection> = {}): UserConnection => ({
  userId: 'user-1',
  providerAccountId: 'fitbit-acct',
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  connectedAt: 1_700_000_000_000,
  ...overrides,
})

const credentialsKey = (userId: string) => `${PROVIDER_NAME}:${userId}`

describe('Fitbit provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.OAUTH_FITBIT_CLIENT_ID = 'client-id'
    process.env.OAUTH_FITBIT_CLIENT_SECRET = 'client-secret'
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
      expect(provider.providerName).toBe('fitbit')
      expect(PROVIDER_NAME).toBe('fitbit')
    })
  })

  describe('startAuthorize', () => {
    it('builds a Fitbit authorize URL with PKCE S256 challenge', async () => {
      const verifierStore = createInMemoryCodeVerifierStore()
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore: createInMemoryCredentialsStore(),
        codeVerifierStore: verifierStore,
        // Deterministic random so the test asserts a stable verifier shape.
        randomBytes: (size) => new Uint8Array(size).fill(7),
      })

      const { url, state } = await provider.startAuthorize()

      expect(url).toMatch(/^https:\/\/www\.fitbit\.com\/oauth2\/authorize\?/)
      const parsed = new URL(url)
      expect(parsed.searchParams.get('response_type')).toBe('code')
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256')
      expect(parsed.searchParams.get('client_id')).toBe('client-id')
      expect(parsed.searchParams.get('redirect_uri')).toBe('https://app/callback')
      expect(parsed.searchParams.get('scope')).toContain('activity')
      expect(parsed.searchParams.get('scope')).toContain('sleep')
      expect(parsed.searchParams.get('state')).toBe(state)
      expect(parsed.searchParams.get('code_challenge')).toBeTruthy()

      // Verifier persisted under the round-trip state.
      expect(verifierStore.data.size).toBe(1)
      expect(verifierStore.data.has(state)).toBe(true)
    })

    it('throws if no codeVerifierStore was provided', async () => {
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore: createInMemoryCredentialsStore(),
      })
      await expect(provider.startAuthorize()).rejects.toThrow(/codeVerifierStore/)
    })
  })

  describe('connect', () => {
    it('exchanges code+verifier for tokens, persists the connection, and returns it', async () => {
      const verifierStore = createInMemoryCodeVerifierStore()
      await verifierStore.put('auth-code-abc', 'verifier-abc')
      const credentialsStore = createInMemoryCredentialsStore()

      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-new',
          refresh_token: 'refresh-new',
          expires_in: 28800,
          scope: 'activity heartrate sleep',
          user_id: 'fitbit-user-9',
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        codeVerifierStore: verifierStore,
        now: () => 2_000_000_000_000,
      })

      const connection = await provider.connect('user-1', 'auth-code-abc')

      expect(mockPost).toHaveBeenCalledTimes(1)
      const [url, body, options] = mockPost.mock.calls[0]
      expect(url).toBe('https://api.fitbit.com/oauth2/token')
      expect(typeof body).toBe('string')
      expect(body).toContain('grant_type=authorization_code')
      expect(body).toContain('code=auth-code-abc')
      expect(body).toContain('code_verifier=verifier-abc')
      expect(body).toContain(`redirect_uri=${encodeURIComponent('https://app/callback')}`)
      expect(options.headers['content-type']).toBe('application/x-www-form-urlencoded')
      expect(options.headers.authorization).toMatch(/^Basic /)

      expect(connection).toMatchObject({
        userId: 'user-1',
        providerAccountId: 'fitbit-user-9',
        accessToken: 'access-new',
        refreshToken: 'refresh-new',
        scopes: ['activity', 'heartrate', 'sleep'],
        connectedAt: 2_000_000_000_000,
      })
      expect(connection.expiresAt).toBe(2_000_000_000_000 + 28800 * 1000)

      // Verifier was consumed (take-on-read).
      expect(verifierStore.data.size).toBe(0)
      // Connection persisted.
      expect(credentialsStore.data.get(credentialsKey('user-1'))).toBe(connection)
    })

    it('connectWithVerifier bypasses the verifier store', async () => {
      const credentialsStore = createInMemoryCredentialsStore()

      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'access-new',
          refresh_token: 'refresh-new',
          expires_in: 28800,
          user_id: 'fitbit-user-9',
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        now: () => 2_000_000_000_000,
      })

      const connection = await provider.connectWithVerifier(
        'user-2',
        'auth-code',
        'verifier-explicit',
      )

      const [, body] = mockPost.mock.calls[0]
      expect(body).toContain('code_verifier=verifier-explicit')
      expect(connection.userId).toBe('user-2')
      expect(credentialsStore.data.get(credentialsKey('user-2'))).toBe(connection)
    })

    it('throws if verifier store has no entry for the supplied code', async () => {
      const verifierStore = createInMemoryCodeVerifierStore()
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore: createInMemoryCredentialsStore(),
        codeVerifierStore: verifierStore,
      })
      await expect(provider.connect('user-1', 'unknown-code')).rejects.toThrow(/no PKCE verifier/)
      expect(mockPost).not.toHaveBeenCalled()
    })

    it('uses client_id-in-body fallback when no client secret is configured', async () => {
      delete process.env.OAUTH_FITBIT_CLIENT_SECRET

      const verifierStore = createInMemoryCodeVerifierStore()
      await verifierStore.put('c1', 'v1')

      mockPost.mockResolvedValueOnce(
        okResponse({
          access_token: 'a',
          refresh_token: 'r',
          expires_in: 100,
          user_id: 'u',
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore: createInMemoryCredentialsStore(),
        codeVerifierStore: verifierStore,
      })

      await provider.connect('user-1', 'c1')

      const [, body, options] = mockPost.mock.calls[0]
      expect(options.headers.authorization).toBeUndefined()
      expect(body).toContain('client_id=client-id')
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
          scope: 'activity heartrate',
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        now: () => 2_000_000_000_000,
      })

      const connection = await provider.refreshConnection('user-1')

      expect(mockPost).toHaveBeenCalledTimes(1)
      const [, body] = mockPost.mock.calls[0]
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
      expect(mockPost.mock.calls[0][0]).toBe('https://api.fitbit.com/oauth2/revoke')
      expect(mockPost.mock.calls[0][1]).toBe('token=access-1')
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

    it('removes the local record even when no connection exists', async () => {
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
    it('GETs the activities/date endpoint with bearer + metric headers', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(
        okResponse({
          summary: {
            steps: 10000,
            distances: [
              { activity: 'total', distance: 5 },
              { activity: 'tracker', distance: 5 },
            ],
            caloriesOut: 2200,
            fairlyActiveMinutes: 30,
            veryActiveMinutes: 45,
            lightlyActiveMinutes: 200,
            floors: 12,
            elevation: 36,
            restingHeartRate: 58,
          },
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      const result = await provider.getDailyActivity('user-1', '2026-05-01')

      expect(mockGet).toHaveBeenCalledTimes(1)
      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe('https://api.fitbit.com/1/user/-/activities/date/2026-05-01.json')
      expect(options.headers.authorization).toBe('Bearer access-1')
      expect(options.headers.accept).toBe('application/json')
      expect(options.headers['accept-language']).toBe('metric')

      expect(result).toEqual({
        date: '2026-05-01',
        steps: 10000,
        distanceMeters: 5000,
        caloriesOut: 2200,
        activeMinutes: 275,
        floors: 12,
        elevationMeters: 36,
        restingHeartRate: 58,
      })
    })
  })

  describe('getDailySleep', () => {
    it('returns ordered sleep sessions with stage segments and summary', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(
        okResponse({
          sleep: [
            {
              logId: 1,
              dateOfSleep: '2026-05-01',
              startTime: '2026-05-01T23:00:00.000',
              endTime: '2026-05-02T07:00:00.000',
              duration: 28_800_000,
              efficiency: 92,
              isMainSleep: true,
              minutesAsleep: 440,
              timeInBed: 480,
              type: 'stages',
              levels: {
                summary: {
                  wake: { count: 5, minutes: 40 },
                  light: { count: 10, minutes: 220 },
                  deep: { count: 3, minutes: 90 },
                  rem: { count: 4, minutes: 130 },
                },
                data: [
                  { dateTime: '2026-05-01T23:00:00.000', level: 'light', seconds: 1800 },
                  { dateTime: '2026-05-01T23:30:00.000', level: 'deep', seconds: 600 },
                  { dateTime: '2026-05-01T23:40:00.000', level: 'wake', seconds: 120 },
                ],
              },
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
        'https://api.fitbit.com/1/user/-/sleep/date/2026-05-01.json',
      )
      expect(result).toHaveLength(1)
      const session = result[0]
      expect(session.id).toBe('1')
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
      expect(session.segments).toHaveLength(3)
      expect(session.segments?.[2].stage).toBe('awake')
      expect(session.segments?.[2].durationSeconds).toBe(120)
    })

    it('returns an empty list when sleep is missing', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(okResponse({}))
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })
      const result = await provider.getDailySleep('user-1', '2026-05-01')
      expect(result).toEqual([])
    })
  })

  describe('getDailyHeartRate', () => {
    it('returns normalized resting HR + zones', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(
        okResponse({
          'activities-heart': [
            {
              dateTime: '2026-05-01',
              value: {
                restingHeartRate: 58,
                heartRateZones: [
                  { name: 'Out of Range', min: 30, max: 100, minutes: 1100, caloriesOut: 1300 },
                  { name: 'Fat Burn', min: 100, max: 140, minutes: 200, caloriesOut: 700 },
                  { name: 'Cardio', min: 140, max: 170, minutes: 60, caloriesOut: 400 },
                  { name: 'Peak', min: 170, max: 220, minutes: 5, caloriesOut: 50 },
                ],
              },
            },
          ],
        }),
      )

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      const result = await provider.getDailyHeartRate('user-1', '2026-05-01')
      expect(mockGet.mock.calls[0][0]).toBe(
        'https://api.fitbit.com/1/user/-/activities/heart/date/2026-05-01/1d.json',
      )
      expect(result.date).toBe('2026-05-01')
      expect(result.restingHeartRate).toBe(58)
      expect(result.zones).toHaveLength(4)
      expect(result.zones?.[1]).toMatchObject({
        name: 'Fat Burn',
        minBpm: 100,
        maxBpm: 140,
        minutes: 200,
        caloriesOut: 700,
      })
    })
  })

  describe('getWeight', () => {
    it('returns sorted weight entries via the date-range endpoint', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })
      mockGet.mockResolvedValueOnce(
        okResponse({
          weight: [
            { logId: 2, date: '2026-04-15', time: '09:30:00', weight: 79.4, fat: 17.5, bmi: 24.0 },
            { logId: 1, date: '2026-04-14', time: '08:00:00', weight: 80.1, bmi: 24.2 },
          ],
        }),
      )
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })

      const result = await provider.getWeight('user-1', { start: '2026-04-01', end: '2026-04-30' })
      expect(mockGet.mock.calls[0][0]).toBe(
        'https://api.fitbit.com/1/user/-/body/log/weight/date/2026-04-01/2026-04-30.json',
      )
      expect(result).toHaveLength(2)
      // Sorted ascending by recordedAt.
      expect(result[0].date).toBe('2026-04-14')
      expect(result[0].weightKg).toBe(80.1)
      expect(result[1].weightKg).toBe(79.4)
      expect(result[1].bodyFatPercent).toBe(17.5)
    })
  })

  describe('token refresh', () => {
    it('refreshes on 401, retries the call once, and persists the rotated record', async () => {
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection(),
      })

      const unauthorized = Object.assign(new Error('Unauthorized'), {
        response: { status: 401, headers: {}, data: { errors: [{ errorType: 'expired_token' }] } },
        request: { url: '' },
      })

      mockGet
        .mockRejectedValueOnce(unauthorized)
        .mockResolvedValueOnce(okResponse({ summary: { steps: 1 } }))
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
      expect(mockPost.mock.calls[0][0]).toBe('https://api.fitbit.com/oauth2/token')
      expect(mockPost.mock.calls[0][1]).toContain('grant_type=refresh_token')
      expect(mockPost.mock.calls[0][1]).toContain('refresh_token=refresh-1')

      // Persisted updated tokens.
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
      mockGet.mockResolvedValueOnce(okResponse({ summary: {} }))

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
          // Fitbit sometimes echoes back the access_token in error_description
          // — this is the exact case the sanitizer must strip.
          data: { errors: [{ errorType: 'system', message: 'access_token=access-1 leaked' }] },
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
        expect(msg).toMatch(/Fitbit getDailyActivity failed status=500/)
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
      delete process.env.OAUTH_FITBIT_CLIENT_ID
      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection({ expiresAt: 1 }),
      })

      // First call refreshes (because expiresAt is past); refresh hits getClientId.
      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
      })
      await expect(provider.getDailyActivity('user-1', '2026-05-01')).rejects.toThrow(
        /OAUTH_FITBIT_CLIENT_ID/,
      )
    })

    it('honors clientId/clientSecret options without env vars', async () => {
      delete process.env.OAUTH_FITBIT_CLIENT_ID
      delete process.env.OAUTH_FITBIT_CLIENT_SECRET

      const credentialsStore = createInMemoryCredentialsStore({
        [credentialsKey('user-1')]: seedConnection({ expiresAt: 1 }),
      })

      mockPost.mockResolvedValueOnce(
        okResponse({ access_token: 'a', refresh_token: 'r', expires_in: 3600 }),
      )
      mockGet.mockResolvedValueOnce(okResponse({ summary: {} }))

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
      mockGet.mockResolvedValueOnce(okResponse({ summary: {} }))

      const provider = createProvider({
        redirectUri: 'https://app/callback',
        credentialsStore,
        apiBaseUrl: 'https://fake-fitbit.test/1',
        timeoutMs: 1234,
      })

      await provider.getDailyActivity('user-1', '2026-05-01')

      const [url, options] = mockGet.mock.calls[0]
      expect(url).toBe('https://fake-fitbit.test/1/user/-/activities/date/2026-05-01.json')
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

describe('mapSleepStage', () => {
  it.each([
    ['wake', 'awake'],
    ['awake', 'awake'],
    ['light', 'light'],
    ['deep', 'deep'],
    ['rem', 'rem'],
    ['restless', 'restless'],
    ['asleep', 'asleep'],
    ['totally-bogus', 'unknown'],
  ])('maps %s -> %s', (input, expected) => {
    expect(mapSleepStage(input)).toBe(expected)
  })
})

describe('fromFitbitActivity', () => {
  it('zero-defaults missing fields', () => {
    expect(fromFitbitActivity('2026-05-01', {})).toEqual({
      date: '2026-05-01',
      steps: 0,
      distanceMeters: 0,
      caloriesOut: 0,
      activeMinutes: 0,
      floors: undefined,
      elevationMeters: undefined,
      restingHeartRate: undefined,
    })
  })

  it('falls back to summed distances when no `total` entry exists', () => {
    const result = fromFitbitActivity('2026-05-01', {
      summary: {
        distances: [
          { activity: 'tracker', distance: 1 },
          { activity: 'sedentary', distance: 0.5 },
        ],
      },
    })
    expect(result.distanceMeters).toBe(1500)
  })
})

describe('fromFitbitSleep', () => {
  it('orders sessions ascending by start', () => {
    const result = fromFitbitSleep('2026-05-01', {
      sleep: [
        {
          logId: 2,
          dateOfSleep: '2026-05-01',
          startTime: '2026-05-01T13:00:00.000',
          endTime: '2026-05-01T14:00:00.000',
          duration: 3_600_000,
          isMainSleep: false,
        },
        {
          logId: 1,
          dateOfSleep: '2026-05-01',
          startTime: '2026-05-01T02:00:00.000',
          endTime: '2026-05-01T08:00:00.000',
          duration: 21_600_000,
          isMainSleep: true,
        },
      ],
    })
    expect(result.map((s) => s.id)).toEqual(['1', '2'])
  })
})

describe('fromFitbitHeartRate', () => {
  it('drops zones missing min or max', () => {
    const result = fromFitbitHeartRate('2026-05-01', {
      'activities-heart': [
        {
          dateTime: '2026-05-01',
          value: {
            heartRateZones: [
              { name: 'A', min: 30, max: 100, minutes: 100 },
              { name: 'Bogus', minutes: 5 },
            ],
          },
        },
      ],
    })
    expect(result.zones).toHaveLength(1)
    expect(result.zones?.[0].name).toBe('A')
  })

  it('returns the requested date when payload is empty', () => {
    expect(fromFitbitHeartRate('2026-05-01', {})).toEqual({
      date: '2026-05-01',
      restingHeartRate: undefined,
      zones: undefined,
    })
  })
})

describe('fromFitbitWeight', () => {
  it('returns an empty list for empty payload', () => {
    expect(fromFitbitWeight({})).toEqual([])
  })

  it('builds an ISO recordedAt from date + time', () => {
    const result = fromFitbitWeight({
      weight: [{ logId: 1, date: '2026-04-14', time: '08:00:00', weight: 80.1 }],
    })
    expect(result[0].recordedAt).toBe('2026-04-14T08:00:00Z')
    expect(result[0].id).toBe('1')
  })

  it('defaults missing time to 00:00:00 and omits id when logId is missing', () => {
    const result = fromFitbitWeight({
      weight: [{ date: '2026-04-14', weight: 80.1 }],
    })
    expect(result[0].recordedAt).toBe('2026-04-14T00:00:00Z')
    expect(result[0].id).toBeUndefined()
  })
})
