import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { AuthClient, StorageAdapter } from '../types.js'

type Reader = { id: string; name: string }
const first: Reader = { id: 'first', name: 'First' }
const second: Reader = { id: 'second', name: 'Second' }

function setup(): {
  client: AuthClient<Reader>
  release: (user: Reader) => void
  storage: StorageAdapter
} {
  const items = new Map<string, string>()
  const storage: StorageAdapter = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
  let release!: (user: Reader) => void
  const pending = new Promise<Response>((resolve) => {
    release = (user) => resolve(Response.json({ user }))
  })
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/profile') return pending
      if (url === '/me')
        return Promise.resolve(Response.json({ user: { ...first, name: 'Background read' } }))
      if (url === '/refresh')
        return Promise.resolve(Response.json({ user: first, accessToken: 'rotated-token' }))
      return Promise.resolve(Response.json({ user: second, accessToken: 'second-token' }))
    }),
  )
  const client = createJWTAuthClient<Reader>({
    storage,
    autoRefresh: false,
    profileEndpoint: '/profile',
    loginEndpoint: '/login',
    logoutEndpoint: '/logout',
    registerEndpoint: '/register',
    refreshEndpoint: '/refresh',
    currentUserEndpoint: '/me',
  })
  client.setSession({ accessToken: 'first-token', refreshToken: 'refresh-token', user: first })
  return { client, release, storage }
}

afterEach(() => vi.unstubAllGlobals())

describe('profile response session ownership', () => {
  it.each(['seed', 'login', 'register', 'logout', 'clear-user', 'replace-token'] as const)(
    'does not publish an old profile response after %s replaces/ends the session',
    async (action) => {
      const { client, release, storage } = setup()
      const pending = client.updateProfile({ name: 'Saved first' })
      switch (action) {
        case 'seed':
          client.setSession({ accessToken: 'first-token', user: second })
          break
        case 'login':
          await client.login({ email: 'second@example.test', password: 'secret' })
          break
        case 'register':
          await client.register({ email: 'second@example.test', password: 'secret' })
          break
        case 'logout':
          await client.logout()
          break
        case 'clear-user':
          client.setUser(null)
          break
        case 'replace-token':
          client.setAccessToken('other-token')
          break
      }
      const current = client.getState()
      const persisted = storage.getItem('molecule:auth:user')
      const listener = vi.fn()
      const unsubscribe = client.subscribe(listener)
      release({ ...first, name: 'Saved first' })
      expect(await pending).toEqual({ ...first, name: 'Saved first' })
      expect(client.getState()).toBe(current)
      expect(storage.getItem('molecule:auth:user')).toBe(persisted)
      expect(listener).not.toHaveBeenCalled()
      unsubscribe()
    },
  )

  it('A save → logout → B login → late A answer leaves B active and persisted', async () => {
    const { client, release, storage } = setup()
    const pending = client.updateProfile({ name: 'Saved first' })
    await client.logout()
    await client.login({ email: 'second@example.test', password: 'secret' })
    release({ ...first, name: 'Saved first' })
    await pending
    expect(client.getUser()).toEqual(second)
    expect(client.getAccessToken()).toBe('second-token')
    expect(JSON.parse(storage.getItem('molecule:auth:user')!)).toEqual(second)
  })

  it.each(['validate', 'refresh'] as const)(
    'same-user %s does not invalidate a pending profile update',
    async (action) => {
      const { client, release, storage } = setup()
      const pending = client.updateProfile({ name: 'Saved first' })
      if (action === 'validate') await client.validateSession?.()
      else await client.refresh()
      release({ ...first, name: 'Saved first' })
      const saved = await pending
      expect(client.getUser()).toEqual(saved)
      expect(JSON.parse(storage.getItem('molecule:auth:user')!)).toEqual(saved)
    },
  )
})
