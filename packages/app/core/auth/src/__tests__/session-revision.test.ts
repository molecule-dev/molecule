import { afterEach, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { StorageAdapter } from '../types.js'

afterEach(() => vi.unstubAllGlobals())

it('keeps the session revision for profile reads/writes and changes it for explicit replacement', async () => {
  const values = new Map<string, string>()
  const storage: StorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
  const user = { id: 'reader', name: 'Reader' }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ user })),
  )
  const client = createJWTAuthClient({
    storage,
    autoRefresh: false,
    currentUserEndpoint: '/me',
    profileEndpoint: '/profile',
  })
  client.setSession({ accessToken: 'same-token', user })
  await client.initialize()
  const revision = client.getSessionRevision!()
  await client.updateProfile({ name: 'Updated' })
  await client.validateSession()
  client.setUser({ ...user, name: 'Background profile' })
  client.setAccessToken('same-token')
  expect(client.getSessionRevision!()).toBe(revision)

  const current = client.getUser()!
  client.setSession({ accessToken: 'same-token', user: current })
  const replaced = client.getSessionRevision!()
  expect(replaced).not.toBe(revision)
  client.setUser(null)
  expect(client.getSessionRevision!()).not.toBe(replaced)
})
