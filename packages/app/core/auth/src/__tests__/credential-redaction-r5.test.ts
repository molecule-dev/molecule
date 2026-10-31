import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('round-five native auth failures', () => {
  it('rethrows a readable plain Error and always settles loading after a credential-bearing DOMException', async () => {
    const secret = 'native-dom-auth-secret'
    const baseURL = `https://login:${secret}@example.test`
    const native = new DOMException(
      `Failed to parse URL from ${baseURL}/auth/login`,
      'SecurityError',
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(native)),
    )
    const client = createJWTAuthClient({ baseURL, autoRefresh: false })
    await client.initialize()
    const events: unknown[] = []
    client.addEventListener((event) => events.push(event))

    const caught = await client
      .login({ email: 'alice@example.com', password: 'login-input-not-the-fixture' })
      .catch((error: unknown) => error)

    expect(caught).toBeInstanceOf(Error)
    expect(caught).not.toBeInstanceOf(DOMException)
    const error = caught as Error
    expect(error.name).toBe('SecurityError')
    expect(error.message).not.toContain(secret)
    expect(String(error.stack)).not.toContain(secret)
    expect(client.getState().loading).toBe(false)
    expect(client.getState().error).not.toContain(secret)
    expect(JSON.stringify(events)).not.toContain(secret)
    client.destroy()
  })

  it('keeps a credential-free native rejection instance and still settles loading', async () => {
    const native = new TypeError('Failed to fetch')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(native)),
    )
    const client = createJWTAuthClient({ autoRefresh: false })
    await client.initialize()

    const caught = await client
      .login({ email: 'alice@example.com', password: 'login-input-not-the-fixture' })
      .catch((error: unknown) => error)

    expect(caught).toBe(native)
    expect(client.getState().loading).toBe(false)
    expect(client.getState().error).toBe('Failed to fetch')
    client.destroy()
  })
})
