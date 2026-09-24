/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch`, used by the
 * `@molecule/api-http` default client) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UserConnection, WearableCredentialsStore } from '@molecule/api-wearable'
import { getProvider, setProvider } from '@molecule/api-wearable'

import { createProvider, PROVIDER_NAME } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('OAUTH_OURA_CLIENT_ID', 'test-client-id')
    vi.stubEnv('OAUTH_OURA_CLIENT_SECRET', 'test-client-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('connects a user and reads daily activity through the core', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      if (String(input) === 'https://api.ouraring.com/oauth/token') {
        return Response.json({
          access_token: 'oura-access',
          refresh_token: 'oura-refresh',
          expires_in: 86400,
        })
      }
      return Response.json({
        data: [
          {
            day: '2026-09-23',
            steps: 9120,
            equivalent_walking_distance: 7040,
            total_calories: 2450,
            high_activity_time: 1200,
            medium_activity_time: 1800,
            low_activity_time: 2700,
          },
        ],
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const connections = new Map<string, UserConnection>()
    const credentialsStore: WearableCredentialsStore = {
      read: async (userId, provider) => connections.get(`${provider}:${userId}`) ?? null,
      write: async (provider, conn) => void connections.set(`${provider}:${conn.userId}`, conn),
      remove: async (userId, provider) => void connections.delete(`${provider}:${userId}`),
    }

    const oura = createProvider({
      redirectUri: 'https://app.example.com/auth/oura/callback',
      credentialsStore,
    })
    setProvider(PROVIDER_NAME, oura)

    const { url, state } = oura.startAuthorize()
    const authorize = new URL(url)
    expect(authorize.origin + authorize.pathname).toBe('https://cloud.ouraring.com/oauth/authorize')
    expect(authorize.searchParams.get('state')).toBe(state)
    expect(authorize.searchParams.get('client_id')).toBe('test-client-id')

    const callback = { code: 'code-from-the-callback-query', state }
    if (callback.state === state) await oura.connect('user-123', callback.code)

    expect(connections.get('oura:user-123')).toMatchObject({
      userId: 'user-123',
      accessToken: 'oura-access',
      refreshToken: 'oura-refresh',
    })
    const [, tokenInit] = fetchMock.mock.calls[0] ?? []
    expect((tokenInit?.headers as Record<string, string>).authorization).toBe(
      `Basic ${Buffer.from('test-client-id:test-client-secret').toString('base64')}`,
    )
    expect(new URLSearchParams(String(tokenInit?.body)).get('code')).toBe(
      'code-from-the-callback-query',
    )

    const activity = await getProvider('oura').getDailyActivity('user-123', '2026-09-23')

    expect(activity).toEqual({
      date: '2026-09-23',
      steps: 9120,
      distanceMeters: 7040,
      caloriesOut: 2450,
      activeMinutes: 95,
    })
    const [activityUrl, activityInit] = fetchMock.mock.calls[1] ?? []
    expect(String(activityUrl)).toBe(
      'https://api.ouraring.com/v2/usercollection/daily_activity?start_date=2026-09-23&end_date=2026-09-23',
    )
    expect((activityInit?.headers as Record<string, string>).authorization).toBe(
      'Bearer oura-access',
    )
    expect(
      await getProvider('oura').getWeight('user-123', { start: '2026-09-01', end: '2026-09-23' }),
    ).toEqual([])
  })
})
