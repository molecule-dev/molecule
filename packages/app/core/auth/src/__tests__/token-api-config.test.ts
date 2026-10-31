import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { StorageAdapter, UserProfile } from '../types.js'

function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('session restore callers', () => {
  it('exposes a stored token while the current-user request is pending', async () => {
    const storage = createStorage()
    storage.setItem('session.jwt', 'stored-token')
    let answer!: (response: Response) => void
    const request = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          answer = resolve
        }),
    )
    vi.stubGlobal('fetch', request)
    const client = createJWTAuthClient({
      storage,
      tokenKey: 'session.jwt',
      authScheme: 'Token',
      currentUserEndpoint: '/viewer',
      autoRefresh: false,
    })
    try {
      const restoring = client.initialize()

      expect(client.getAccessToken()).toBe('stored-token')
      expect(client.getState().status).toBe('loading')
      expect(request).toHaveBeenCalledOnce()
      expect(new Headers(request.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(
        'Token stored-token',
      )

      answer(json({ user: { id: 'reader' } }))
      await restoring
      expect(client.getState().status).toBe('authenticated')
    } finally {
      client.destroy()
    }
  })

  it.each([
    ['a network failure', () => Promise.reject(new Error('offline'))],
    ['a 503', () => Promise.resolve(json({ error: 'unavailable' }, 503))],
  ] as const)('keeps the stored token when boot restore has %s', async (_label, respond) => {
    const storage = createStorage()
    storage.setItem('session.jwt', 'stored-token')
    vi.stubGlobal('fetch', vi.fn(respond))
    const client = createJWTAuthClient({
      storage,
      tokenKey: 'session.jwt',
      currentUserEndpoint: '/viewer',
      autoRefresh: false,
    })
    try {
      await client.initialize()

      expect(client.getAccessToken()).toBe('stored-token')
      expect(storage.getItem('session.jwt')).toBe('stored-token')
      expect(client.getState().status).toBe('unavailable')
    } finally {
      client.destroy()
    }
  })
})

describe('token API configuration', () => {
  it('adapts a nested token, Token header, storage key, current-user route and PUT update', async () => {
    const requests: Array<{
      url: string
      method: string
      authorization: string | null
      body?: unknown
    }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const url = String(input)
        const method = init.method ?? 'GET'
        requests.push({
          url,
          method,
          authorization: new Headers(init.headers).get('Authorization'),
          body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
        })
        if (url === 'https://api.test/session') {
          return json({ user: { id: 'reader', name: 'Reader', token: 'nested-token' } })
        }
        if (url === 'https://api.test/viewer' && method === 'GET') {
          return json({ user: { id: 'reader', name: 'Restored', token: 'nested-token' } })
        }
        if (url === 'https://api.test/viewer' && method === 'PUT') {
          return json({ user: { id: 'reader', name: 'Updated', token: 'nested-token' } })
        }
        return json({ error: 'unexpected request' }, 500)
      }),
    )
    const storage = createStorage()
    const client = createJWTAuthClient({
      storage,
      baseURL: 'https://api.test',
      loginEndpoint: '/session',
      currentUserEndpoint: '/viewer',
      profileEndpoint: '/viewer',
      profileUpdateMethod: 'PUT',
      profileRequestBody: (data) => ({ user: data }),
      tokenKey: 'session.jwt',
      authScheme: 'Token',
      autoRefresh: false,
      mapAuthResponse: (data) => {
        const { token, ...user } = (data as { user: UserProfile & { token: string } }).user
        return { accessToken: token, user }
      },
    })
    try {
      await client.login({ email: 'reader@example.test', password: 'secret' })
      expect(storage.getItem('session.jwt')).toBe('nested-token')
      expect(client.getUser()).toEqual({ id: 'reader', name: 'Reader' })

      await client.validateSession()
      await client.updateProfile({ name: 'Updated' })

      expect(requests.slice(1)).toEqual([
        {
          url: 'https://api.test/viewer',
          method: 'GET',
          authorization: 'Token nested-token',
          body: undefined,
        },
        {
          url: 'https://api.test/viewer',
          method: 'PUT',
          authorization: 'Token nested-token',
          body: { user: { name: 'Updated' } },
        },
      ])
      expect(client.getUser()).toEqual({ id: 'reader', name: 'Updated' })
      expect(client.getAccessToken()).toBe('nested-token')
    } finally {
      client.destroy()
    }
  })

  it('keeps Bearer and a top-level accessToken working with the defaults', async () => {
    const requests: Array<{ url: string; method: string; authorization: string | null }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const url = String(input)
        const method = init.method ?? 'GET'
        requests.push({
          url,
          method,
          authorization: new Headers(init.headers).get('Authorization'),
        })
        if (url === '/api/auth/login') {
          return json({ accessToken: 'top-level-token', user: { id: 'reader' } })
        }
        if (url === '/api/users/me') return json({ user: { id: 'reader' } })
        return json({ error: 'unexpected request' }, 500)
      }),
    )
    const client = createJWTAuthClient({
      storage: createStorage(),
      baseURL: '/api',
      autoRefresh: false,
    })
    try {
      await client.login({ email: 'reader@example.test', password: 'secret' })
      await client.validateSession()

      expect(requests[1]).toEqual({
        url: '/api/users/me',
        method: 'GET',
        authorization: 'Bearer top-level-token',
      })
      expect(client.getAccessToken()).toBe('top-level-token')
      expect(client.getState().status).toBe('authenticated')
    } finally {
      client.destroy()
    }
  })
})
