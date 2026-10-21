import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))
vi.mock('@molecule/app-logger', () => ({
  getLogger: () => ({ warn, debug: vi.fn(), error: vi.fn() }),
}))

const credential = 'fixture-' + 'credential-value'
const user = { id: 'user-1', email: 'person@example.invalid' }

beforeEach(() => {
  warn.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async () => new Response('{}')),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('configured auth mapper credential diagnostics', () => {
  it('names the ignored field once without logging its value or adopting it', async () => {
    const client = createJWTAuthClient({
      storage: 'memory',
      autoRefresh: false,
      mapAuthResponse: () => ({ user, token: credential }),
    })
    await client.login({ email: user.email, password: 'fixture-password' })
    await client.login({ email: user.email, password: 'fixture-password' })
    expect(client.getAccessToken()).toBeNull()
    expect(client.getUser()).toEqual(user)
    expect(warn).toHaveBeenCalledTimes(1)
    const diagnostic = JSON.stringify(warn.mock.calls)
    expect(diagnostic).toContain('mapAuthResponse')
    expect(diagnostic).toContain('accessToken')
    expect(diagnostic).not.toContain(credential)
  })

  it.each([
    { user, accessToken: credential },
    { user },
    { user: { ...user, token: credential } },
    { user, token: '' },
  ])('keeps valid bearer/cookie or nested metadata mappings quiet: %j', async (mapped) => {
    const client = createJWTAuthClient({
      storage: 'memory',
      autoRefresh: false,
      mapAuthResponse: () => mapped,
    })
    await expect(
      client.login({ email: user.email, password: 'fixture-password' }),
    ).resolves.toMatchObject({
      user: mapped.user,
    })
    expect(warn).not.toHaveBeenCalled()
  })

  it('does not let a broken logger change the auth result', async () => {
    warn.mockImplementation(() => {
      throw new Error('fixture logger failure')
    })
    const client = createJWTAuthClient({
      storage: 'memory',
      autoRefresh: false,
      mapAuthResponse: () => ({ user, token: credential }),
    })
    await expect(
      client.login({ email: user.email, password: 'fixture-password' }),
    ).resolves.toMatchObject({ user })
  })

  it('does not let diagnostic inspection of unrelated metadata change the result', async () => {
    const mapped = Object.defineProperty({ user }, 'token', {
      get: () => {
        throw new Error('unused metadata getter')
      },
    })
    const client = createJWTAuthClient({
      storage: 'memory',
      autoRefresh: false,
      mapAuthResponse: () => mapped,
    })
    await expect(client.login({ email: user.email, password: 'fixture-password' })).resolves.toBe(
      mapped,
    )
    expect(warn).not.toHaveBeenCalled()
  })
})
