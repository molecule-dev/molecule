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

import type { FitbitCodeVerifierStore } from '../index.js'
import { createProvider, PROVIDER_NAME } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('OAUTH_FITBIT_CLIENT_ID', 'test-client-id')
    vi.stubEnv('OAUTH_FITBIT_CLIENT_SECRET', 'test-client-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('runs the PKCE connect flow and reads daily activity through the core', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
      const url = String(input)
      if (url === 'https://api.fitbit.com/oauth2/token') {
        return Response.json({
          access_token: 'fitbit-access',
          refresh_token: 'fitbit-refresh',
          expires_in: 28800,
          scope: 'activity sleep',
          user_id: 'FB123',
        })
      }
      return Response.json({
        summary: {
          steps: 8432,
          caloriesOut: 2310,
          fairlyActiveMinutes: 20,
          veryActiveMinutes: 14,
          lightlyActiveMinutes: 20,
          distances: [{ activity: 'total', distance: 6.12 }],
        },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const connections = new Map<string, UserConnection>()
    const credentialsStore: WearableCredentialsStore = {
      read: async (userId, provider) => connections.get(`${provider}:${userId}`) ?? null,
      write: async (provider, conn) => void connections.set(`${provider}:${conn.userId}`, conn),
      remove: async (userId, provider) => void connections.delete(`${provider}:${userId}`),
    }
    const verifiers = new Map<string, string>()
    const codeVerifierStore: FitbitCodeVerifierStore = {
      put: async (state, verifier) => void verifiers.set(state, verifier),
      take: async (state) => {
        const verifier = verifiers.get(state) ?? null
        verifiers.delete(state)
        return verifier
      },
    }

    const fitbit = createProvider({
      redirectUri: 'https://app.example.com/auth/fitbit/callback',
      credentialsStore,
      codeVerifierStore,
    })
    setProvider(PROVIDER_NAME, fitbit)

    const { url, state } = await fitbit.startAuthorize()
    const authorize = new URL(url)
    expect(authorize.origin + authorize.pathname).toBe('https://www.fitbit.com/oauth2/authorize')
    expect(authorize.searchParams.get('state')).toBe(state)
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256')

    const code = 'code-from-the-callback-query'
    const verifier = await codeVerifierStore.take(state)
    expect(verifier).toBeTruthy()
    if (verifier) await fitbit.connectWithVerifier('user-123', code, verifier)

    expect(connections.get('fitbit:user-123')).toMatchObject({
      userId: 'user-123',
      providerAccountId: 'FB123',
      accessToken: 'fitbit-access',
      refreshToken: 'fitbit-refresh',
    })
    const tokenBody = new URLSearchParams(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(tokenBody.get('grant_type')).toBe('authorization_code')
    expect(tokenBody.get('code')).toBe(code)
    expect(tokenBody.get('code_verifier')).toBe(verifier)

    const activity = await getProvider('fitbit').getDailyActivity('user-123', '2026-09-23')

    expect(activity).toMatchObject({
      date: '2026-09-23',
      steps: 8432,
      distanceMeters: 6120,
      caloriesOut: 2310,
      activeMinutes: 54,
    })
    const [activityUrl, activityInit] = fetchMock.mock.calls[1] ?? []
    expect(String(activityUrl)).toBe(
      'https://api.fitbit.com/1/user/-/activities/date/2026-09-23.json',
    )
    expect((activityInit?.headers as Record<string, string>).authorization).toBe(
      'Bearer fitbit-access',
    )
  })
})
