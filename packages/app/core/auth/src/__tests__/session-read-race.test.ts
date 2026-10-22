import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { AuthClient, StorageAdapter, UserProfile } from '../types.js'

const first: UserProfile = { id: 'first', email: 'first@example.test' }
const second: UserProfile = { id: 'second', email: 'second@example.test' }
const clients: AuthClient[] = []

/** A current-user response whose completion is controlled by the consumer. */
function setup(operation: 'validate' | 'initialize') {
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
  let resolve!: (response: Response) => void
  let reject!: (error: Error) => void
  const response = new Promise<Response>((done, fail) => {
    resolve = done
    reject = fail
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(() => response),
  )
  vi.stubGlobal('document', { cookie: 'mol_auth=1' })
  const client = createJWTAuthClient({
    storage,
    autoRefresh: false,
    currentUserEndpoint: '/user',
    logoutEndpoint: '',
  })
  clients.push(client)
  if (operation === 'validate') client.setSession({ accessToken: 'first-token', user: first })
  const pending = operation === 'validate' ? client.validateSession!() : client.initialize()
  return { client, storage, pending, resolve, reject }
}

afterEach(() => {
  clients.splice(0).forEach((client) => client.destroy())
  vi.unstubAllGlobals()
})

describe('current-user reads belong to the session that requested them', () => {
  for (const operation of ['validate', 'initialize'] as const) {
    for (const action of ['logout', 'switch', 'same-token-switch', 'replace-token'] as const) {
      it.each([200, 401, 403, 503, 'network'] as const)(
        `${operation}: an old %s answer cannot override ${action}`,
        async (status) => {
          const { client, storage, pending, resolve, reject } = setup(operation)
          if (action === 'logout') await client.logout()
          else if (action === 'replace-token') client.setAccessToken('other-token')
          else
            client.setSession({
              accessToken: action === 'same-token-switch' ? 'first-token' : 'second-token',
              user: second,
            })
          const before = client.getState()
          const persisted = storage.getItem('molecule:auth:user')
          const token = client.getAccessToken()
          const listener = vi.fn()
          const unsubscribe = client.subscribe(listener)
          if (status === 'network') reject(new Error('Network unavailable'))
          else
            resolve(
              Response.json(status === 200 ? { user: first } : { error: 'old answer' }, { status }),
            )
          await pending
          expect(client.getState()).toBe(before)
          expect(storage.getItem('molecule:auth:user')).toBe(persisted)
          expect(client.getAccessToken()).toBe(token)
          expect(listener).not.toHaveBeenCalled()
          unsubscribe()
        },
      )
    }
  }

  it.each([200, 401, 403, 503])('a current validation still classifies %s', async (status) => {
    const { client, storage, pending, resolve } = setup('validate')
    resolve(
      Response.json(status === 200 ? { user: first } : { error: 'current answer' }, { status }),
    )
    await pending
    if (status === 401 || status === 403) {
      expect(client.getState().status).toBe('unauthenticated')
      expect(client.getAccessToken()).toBeNull()
      expect(storage.getItem('molecule:auth:user')).toBeNull()
    } else {
      expect(client.getState().status).toBe(status === 200 ? 'authenticated' : 'unavailable')
      expect(client.getAccessToken()).toBe('first-token')
      expect(client.getUser()).toEqual(first)
    }
  })
})
