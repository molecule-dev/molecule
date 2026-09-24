/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.doppler.com`) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { getRequired, resolveAll, setProvider } from '@molecule/api-secrets'

import { createDopplerProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('downloads the Doppler config into process.env and reads a required secret', async () => {
    vi.stubEnv('DOPPLER_TOKEN', 'dp.st.test-token')
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            DATABASE_URL: 'postgres://app@db.example.com/app',
            STRIPE_SECRET_KEY: 'test-key',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createDopplerProvider({
        token: process.env.DOPPLER_TOKEN,
        fallbackToEnv: false,
      }),
    )

    await resolveAll(['DATABASE_URL', 'STRIPE_SECRET_KEY'])

    const stripeKey = await getRequired('STRIPE_SECRET_KEY')

    expect(process.env.DATABASE_URL).toBe('postgres://app@db.example.com/app')
    expect(process.env.STRIPE_SECRET_KEY).toBe('test-key')
    expect(stripeKey).toBe('test-key')
    // The second read is served from the 60s cache — one API call total.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe(
      'https://api.doppler.com/v3/configs/config/secrets/download?format=json',
    )
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer dp.st.test-token')
  })
})
