import { afterEach, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { StorageAdapter } from '../types.js'

afterEach(() => vi.unstubAllGlobals())

it('does not let a profile read started before a save replace the accepted profile', async () => {
  const loaded = { id: 'reader', bio: 'Server bio', image: 'server.png' }
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
  let releaseRead!: (response: Response) => void
  const readGate = new Promise<Response>((resolve) => {
    releaseRead = resolve
  })
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      if (url === '/me') return readGate
      const patch = JSON.parse(String(options?.body)) as Partial<typeof loaded>
      return Promise.resolve(Response.json({ user: { ...loaded, ...patch } }))
    }),
  )
  const client = createJWTAuthClient<typeof loaded>({
    autoRefresh: false,
    storage,
    currentUserEndpoint: '/me',
    profileEndpoint: '/profile',
  })
  client.setSession({ accessToken: 'opaque-token', user: loaded })

  const read = client.validateSession()
  const saved = await client.updateProfile({ bio: 'Typed bio', image: 'typed.png' })
  expect(client.getUser()).toEqual(saved)

  releaseRead(Response.json({ user: loaded }))
  await read

  expect(client.getUser()).toEqual(saved)
  expect(JSON.parse(items.get('molecule:auth:user')!)).toEqual(saved)
})
