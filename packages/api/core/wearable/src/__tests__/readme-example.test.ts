/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real Fitbit bond with only
 * `fetch` (the Fitbit Web API) mocked. The stored connection stands in for a
 * completed OAuth link.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, PROVIDER_NAME } from '@molecule/api-wearable-fitbit'

import type { UserConnection, WearableCredentialsStore } from '../index.js'
import { getProvider, listProviders, setProvider } from '../index.js'

describe('README @example', () => {
  const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/activities/date/2026-09-23.json')) {
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
    }
    if (url.endsWith('/sleep/date/2026-09-23.json')) {
      return Response.json({
        sleep: [
          {
            logId: 1,
            dateOfSleep: '2026-09-23',
            startTime: '2026-09-22T23:10:00.000',
            endTime: '2026-09-23T06:40:00.000',
            duration: 27_000_000,
            minutesAsleep: 412,
            timeInBed: 450,
            isMainSleep: true,
          },
        ],
      })
    }
    throw new Error(`Unexpected fetch: ${url}`)
  })

  beforeEach(() => {
    vi.stubEnv('OAUTH_FITBIT_CLIENT_ID', 'test-client-id')
    vi.stubEnv('OAUTH_FITBIT_CLIENT_SECRET', 'test-client-secret')
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reads the connected user’s activity and sleep through the named provider', async () => {
    const connections = new Map<string, UserConnection>()
    const credentialsStore: WearableCredentialsStore = {
      read: async (userId, provider) => connections.get(`${provider}:${userId}`) ?? null,
      write: async (provider, conn) => void connections.set(`${provider}:${conn.userId}`, conn),
      remove: async (userId, provider) => void connections.delete(`${provider}:${userId}`),
    }

    setProvider(
      PROVIDER_NAME,
      createProvider({
        redirectUri: 'https://app.example.com/auth/fitbit/callback',
        credentialsStore,
      }),
    )

    // What the bond's OAuth callback writes once the user linked their device.
    await credentialsStore.write('fitbit', {
      userId: 'user-123',
      providerAccountId: 'FB123',
      accessToken: 'fitbit-access',
      refreshToken: 'fitbit-refresh',
      expiresAt: Date.now() + 3_600_000,
      connectedAt: Date.now(),
    })

    const userId = 'user-123'
    const date = '2026-09-23'
    const rows: Array<[string, number, number, number | undefined]> = []
    for (const name of listProviders()) {
      if (!(await credentialsStore.read(userId, name))) continue
      const wearable = getProvider(name)
      const activity = await wearable.getDailyActivity(userId, date)
      const sleep = await wearable.getDailySleep(userId, date)
      const mainSleep = sleep.find((session) => session.isMainSleep)
      rows.push([name, activity.steps, activity.distanceMeters, mainSleep?.timeAsleepMinutes])
    }

    expect(rows).toEqual([['fitbit', 8432, 6120, 412]])
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer fitbit-access')
  })
})
