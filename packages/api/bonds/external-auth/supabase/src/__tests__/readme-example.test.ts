/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the vendor SDK
 * (`@supabase/supabase-js`) is mocked, as the package's own tests do.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider, verifyUserToken } from '@molecule/api-external-auth'

import { configureSupabase, provider, resetSupabase } from '../index.js'

const { createClientMock, getUserMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getUserMock: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://abcd1234.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
    }
    resetSupabase()
    createClientMock.mockImplementation(() => ({ auth: { getUser: getUserMock } }))
  })

  afterEach(() => {
    process.env = originalEnv
    resetSupabase()
    vi.resetAllMocks()
    vi.restoreAllMocks()
  })

  it('verifies the bearer token through the core and returns the user', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'b7c1e2d4-0000-4000-8000-000000000042', email: 'ada@example.com' } },
      error: null,
    })
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    configureSupabase({
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    })
    setProvider(provider)

    const authorization = 'Bearer supabase-access-token'
    const token = authorization.replace(/^Bearer /, '')
    const user = await verifyUserToken(token)
    if (!user) {
      console.warn('401: invalid or expired Supabase session')
    } else {
      console.log(`signed in as ${user.userId} <${user.email ?? 'no email'}>`)
    }

    expect(user).toEqual({
      userId: 'b7c1e2d4-0000-4000-8000-000000000042',
      email: 'ada@example.com',
    })
    expect(log).toHaveBeenCalledWith(
      'signed in as b7c1e2d4-0000-4000-8000-000000000042 <ada@example.com>',
    )
    expect(createClientMock).toHaveBeenCalledWith(
      'https://abcd1234.supabase.co',
      'test-anon-key',
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) }),
    )
    expect(getUserMock).toHaveBeenCalledWith('supabase-access-token')
  })

  it('returns null (not an error) for an expired token', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'JWT expired' } })

    configureSupabase({
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    })
    setProvider(provider)

    expect(await verifyUserToken('expired-token')).toBeNull()
  })
})
