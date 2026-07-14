/**
 * Tests for `@molecule/api-external-auth-supabase`.
 *
 * `@supabase/supabase-js` is fully mocked — no test ever touches the network.
 *
 * Covers:
 * - `provider` conformance to the `@molecule/api-external-auth` contract:
 *   `provider.verifyUserToken` success, invalid/expired token → null, thrown
 *   transport error → null, empty token → null, missing-config error
 * - `configureSupabase` explicit settings (win over env, merge, invalidate cache)
 * - Env fallback resolution (SUPABASE_* primary, VITE_* fallbacks, precedence)
 * - Lazy singleton behavior for both clients (created on first use, cached)
 * - `getAnonClient` missing-config error naming the missing env keys
 * - `hasServiceRole` with/without a key, from config and from env
 * - `getServiceClient` helpful error without a key + admin client creation
 * - `resetSupabase` clearing cached clients AND configured settings
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ExternalAuthProvider } from '@molecule/api-external-auth'

import {
  configureSupabase,
  getAnonClient,
  getServiceClient,
  hasServiceRole,
  provider,
  resetSupabase,
} from '../index.js'

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))

/**
 * Shape of the fake client `createClientMock` returns.
 */
interface FakeClient {
  auth: { getUser: ReturnType<typeof vi.fn> }
}

const makeFakeClient = (): FakeClient => ({ auth: { getUser: vi.fn() } })

const ENV_KEYS = [
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

const originalEnv: Record<string, string | undefined> = {}
for (const key of ENV_KEYS) originalEnv[key] = process.env[key]

beforeEach(() => {
  vi.resetAllMocks()
  resetSupabase()
  for (const key of ENV_KEYS) delete process.env[key]
  createClientMock.mockImplementation(() => makeFakeClient())
})

afterAll(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
})

describe('configureSupabase', () => {
  it('uses explicitly configured url + anonKey, winning over env vars', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'env-anon'
    configureSupabase({ url: 'https://cfg.supabase.co', anonKey: 'cfg-anon' })

    getAnonClient()

    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(createClientMock).toHaveBeenCalledWith(
      'https://cfg.supabase.co',
      'cfg-anon',
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }),
    )
  })

  it('does NOT create a client eagerly — only at first getAnonClient()', () => {
    configureSupabase({ url: 'https://cfg.supabase.co', anonKey: 'cfg-anon' })

    expect(createClientMock).not.toHaveBeenCalled()

    getAnonClient()

    expect(createClientMock).toHaveBeenCalledTimes(1)
  })

  it('merges partial settings across calls', () => {
    configureSupabase({ url: 'https://cfg.supabase.co' })
    configureSupabase({ anonKey: 'cfg-anon' })

    getAnonClient()

    expect(createClientMock).toHaveBeenCalledWith(
      'https://cfg.supabase.co',
      'cfg-anon',
      expect.any(Object),
    )
  })

  it('invalidates a cached client so new settings take effect', () => {
    configureSupabase({ url: 'https://one.supabase.co', anonKey: 'anon-1' })
    const first = getAnonClient()

    configureSupabase({ url: 'https://two.supabase.co' })
    const second = getAnonClient()

    expect(createClientMock).toHaveBeenCalledTimes(2)
    expect(createClientMock).toHaveBeenLastCalledWith(
      'https://two.supabase.co',
      'anon-1',
      expect.any(Object),
    )
    expect(second).not.toBe(first)
  })
})

describe('env fallback resolution', () => {
  it('reads SUPABASE_URL + SUPABASE_ANON_KEY (lazily, after import)', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'env-anon'

    getAnonClient()

    expect(createClientMock).toHaveBeenCalledWith(
      'https://env.supabase.co',
      'env-anon',
      expect.any(Object),
    )
  })

  it('falls back to VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY', () => {
    process.env.VITE_SUPABASE_URL = 'https://vite.supabase.co'
    process.env.VITE_SUPABASE_ANON_KEY = 'vite-anon'

    getAnonClient()

    expect(createClientMock).toHaveBeenCalledWith(
      'https://vite.supabase.co',
      'vite-anon',
      expect.any(Object),
    )
  })

  it('falls back to VITE_SUPABASE_PUBLISHABLE_KEY when no other anon key is set', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'publishable'

    getAnonClient()

    expect(createClientMock).toHaveBeenCalledWith(
      'https://env.supabase.co',
      'publishable',
      expect.any(Object),
    )
  })

  it('prefers SUPABASE_ANON_KEY over the VITE_* variants', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'primary'
    process.env.VITE_SUPABASE_ANON_KEY = 'vite-anon'
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'publishable'

    getAnonClient()

    expect(createClientMock).toHaveBeenCalledWith(
      'https://env.supabase.co',
      'primary',
      expect.any(Object),
    )
  })
})

describe('getAnonClient', () => {
  it('is a lazy singleton — one createClient call, same instance returned', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'env-anon'

    const first = getAnonClient()
    const second = getAnonClient()

    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('throws naming BOTH missing env keys when nothing is configured', () => {
    let message = ''
    try {
      getAnonClient()
    } catch (error) {
      message = (error as Error).message
    }

    expect(message).toContain('SUPABASE_URL')
    expect(message).toContain('VITE_SUPABASE_URL')
    expect(message).toContain('SUPABASE_ANON_KEY')
    expect(message).toContain('VITE_SUPABASE_ANON_KEY')
    expect(message).toContain('VITE_SUPABASE_PUBLISHABLE_KEY')
    expect(message).toContain('configureSupabase')
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('names only the anon key when the url IS configured', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'

    let message = ''
    try {
      getAnonClient()
    } catch (error) {
      message = (error as Error).message
    }

    expect(message).toContain('SUPABASE_ANON_KEY')
    expect(message).not.toContain('missing SUPABASE_URL')
  })
})

describe('hasServiceRole', () => {
  it('is false when no service-role key is available', () => {
    expect(hasServiceRole()).toBe(false)
  })

  it('is true with SUPABASE_SERVICE_ROLE_KEY in the env', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'

    expect(hasServiceRole()).toBe(true)
  })

  it('is true when configured explicitly, and never creates a client', () => {
    configureSupabase({ serviceRoleKey: 'service-role' })

    expect(hasServiceRole()).toBe(true)
    expect(createClientMock).not.toHaveBeenCalled()
  })
})

describe('getServiceClient', () => {
  it('throws the helpful Environment-panel message when no key is connected', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'env-anon'

    expect(() => getServiceClient()).toThrow(
      'SUPABASE_SERVICE_ROLE_KEY is not connected. Ask the user to add it in the Environment panel — never assume it exists.',
    )
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('throws a missing-url error when only the service key is set', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'

    expect(() => getServiceClient()).toThrow(/SUPABASE_URL/)
  })

  it('creates the admin client with the service-role key (lazy singleton)', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'

    const first = getServiceClient()
    const second = getServiceClient()

    expect(createClientMock).toHaveBeenCalledTimes(1)
    expect(createClientMock).toHaveBeenCalledWith(
      'https://env.supabase.co',
      'service-role',
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }),
    )
    expect(second).toBe(first)
  })

  it('caches the anon and service clients independently', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'env-anon'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role'

    const anon = getAnonClient()
    const service = getServiceClient()

    expect(createClientMock).toHaveBeenCalledTimes(2)
    expect(createClientMock).toHaveBeenNthCalledWith(
      1,
      'https://env.supabase.co',
      'env-anon',
      expect.any(Object),
    )
    expect(createClientMock).toHaveBeenNthCalledWith(
      2,
      'https://env.supabase.co',
      'service-role',
      expect.any(Object),
    )
    expect(service).not.toBe(anon)
  })
})

describe('provider (ExternalAuthProvider conformance)', () => {
  const configureAnon = (): FakeClient => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'env-anon'
    return getAnonClient() as unknown as FakeClient
  }

  it('satisfies the @molecule/api-external-auth contract', () => {
    // Type-level conformance (compile error here = broken contract) + shape.
    const conforming: ExternalAuthProvider = provider
    expect(typeof conforming.verifyUserToken).toBe('function')
  })

  it('verifyUserToken returns the mapped user via the (mocked) anon client', async () => {
    const client = configureAnon()
    client.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    })

    const user = await provider.verifyUserToken('valid-jwt')

    expect(user).toEqual({ userId: 'user-123', email: 'user@example.com' })
    expect(client.auth.getUser).toHaveBeenCalledWith('valid-jwt')
  })

  it('omits email when the user record has none', async () => {
    const client = configureAnon()
    client.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    const user = await provider.verifyUserToken('valid-jwt')

    expect(user).toEqual({ userId: 'user-123', email: undefined })
  })

  it('returns null (never throws) for an invalid/expired token', async () => {
    const client = configureAnon()
    client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT', status: 401 },
    })

    await expect(provider.verifyUserToken('expired-jwt')).resolves.toBeNull()
  })

  it('returns null when getUser rejects unexpectedly', async () => {
    const client = configureAnon()
    client.auth.getUser.mockRejectedValue(new Error('network down'))

    await expect(provider.verifyUserToken('any-jwt')).resolves.toBeNull()
  })

  it('returns null for an empty token without creating a client', async () => {
    await expect(provider.verifyUserToken('')).resolves.toBeNull()
    expect(createClientMock).not.toHaveBeenCalled()
  })

  it('propagates the missing-config error when unconfigured', async () => {
    await expect(provider.verifyUserToken('some-jwt')).rejects.toThrow(/not configured/)
  })
})

describe('resetSupabase', () => {
  it('clears the cached clients — the next call creates a fresh one', () => {
    process.env.SUPABASE_URL = 'https://env.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'env-anon'
    const first = getAnonClient()

    resetSupabase()
    const second = getAnonClient()

    expect(createClientMock).toHaveBeenCalledTimes(2)
    expect(second).not.toBe(first)
  })

  it('clears configured settings — unconfigured state throws again', () => {
    configureSupabase({ url: 'https://cfg.supabase.co', anonKey: 'cfg-anon' })
    getAnonClient()

    resetSupabase()

    expect(() => getAnonClient()).toThrow(/not configured/)
    expect(hasServiceRole()).toBe(false)
  })

  it('re-reads the environment from scratch after reset', () => {
    process.env.SUPABASE_URL = 'https://one.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon-1'
    getAnonClient()

    resetSupabase()
    process.env.SUPABASE_URL = 'https://two.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'anon-2'
    getAnonClient()

    expect(createClientMock).toHaveBeenLastCalledWith(
      'https://two.supabase.co',
      'anon-2',
      expect.any(Object),
    )
  })
})
