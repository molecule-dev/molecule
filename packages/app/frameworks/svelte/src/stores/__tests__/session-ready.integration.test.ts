// @vitest-environment jsdom

/**
 * `sessionReady` (the Svelte shape of React's `SessionReady` / `awaitSession`) against
 * the real restoring auth client.
 *
 * A returning visitor's session comes back from one cookie-restore request after a page
 * load. Pages that rendered before it answered read `user === null` from the auth
 * stores: five X1 runs lost their follow test to a Follow button whose handler checked
 * `!user` (a no-op or a redirect to `/login`) on the profile page the suite opened with
 * `page.goto`. The store is what the SvelteKit layout gates its slot on
 * (`{#if $sessionReady}`).
 *
 * Cases also cover a delayed first subscription and remount: a store must refresh its
 * snapshot when subscribers return after an auth change.
 *
 * @module
 */

import { get, type Readable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

import { getAuthClient } from '../../context.js'
import { createAuthStores, createAuthStoresFromClient } from '../auth.js'

vi.mock('../../context.js', () => ({ getAuthClient: vi.fn() }))

const reader: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []
const subscriptions: Array<() => void> = []

function memoryStorage(values: Record<string, string> = {}): StorageAdapter {
  const store = new Map(Object.entries(values))
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
  }
}

/**
 * Keep a live subscription for the test's duration, as a mounted component does.
 *
 * @param store - The store a mounted component would read.
 * @returns The values seen so far (`values`), the latest (`current`), and `stop`.
 */
function mount<T>(store: Readable<T>): { values: T[]; current: () => T; stop: () => void } {
  const values: T[] = []
  const stop = store.subscribe((value) => {
    values.push(value)
  })
  subscriptions.push(stop)
  return { values, current: () => values[values.length - 1], stop }
}

/** A real client for a returning visitor whose restore request answers when `answer` is called. */
function returningVisitor(): {
  stores: ReturnType<typeof createAuthStoresFromClient<UserProfile>>
  answer: () => Promise<void>
} {
  document.cookie = 'mol_auth=1; path=/'
  let respond: ((response: Response) => void) | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve
        }),
    ),
  )
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  // As the scaffold's hooks.client.ts does before the first render.
  void client.initialize()
  const stores = createAuthStoresFromClient<UserProfile>(client)
  return {
    stores,
    answer: async () => {
      respond?.(
        new Response(JSON.stringify({ user: reader }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      await client.whenRestored!()
    },
  }
}

/** The handler shape the runs wrote: a signed-in action that bails out when `user` is null. */
function followHandler(userStore: Readable<UserProfile | null>): {
  follow: () => void
  onFollow: ReturnType<typeof vi.fn>
} {
  const onFollow = vi.fn()
  return {
    onFollow,
    follow: () => {
      const user = get(userStore)
      if (!user) return
      onFollow(user.id)
    },
  }
}

afterEach(() => {
  for (const stop of subscriptions.splice(0)) stop()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('sessionReady', () => {
  it('holds the page until a returning visitor is restored, so a first click is signed in', async () => {
    const { stores, answer } = returningVisitor()
    const { follow, onFollow } = followHandler(stores.user)

    // The page's render log: each `sessionReady` value with the user a handler reading
    // the user store at that moment would see.
    const seen: { ready: boolean; userId: string | null }[] = []
    const stop = stores.sessionReady.subscribe((ready) => {
      seen.push({ ready, userId: get(stores.user)?.id ?? null })
    })
    subscriptions.push(stop)

    expect(seen).toEqual([{ ready: false, userId: null }])

    await answer()
    expect(seen).toEqual([
      { ready: false, userId: null },
      { ready: true, userId: 'reader' },
    ])
    follow()
    expect(onFollow).toHaveBeenCalledWith('reader')
    expect(fetch).toHaveBeenCalledTimes(1)
    stop()
  })

  it('renders ungated by default, and the same click lands before the restore and is lost', async () => {
    const { stores, answer } = returningVisitor()
    const { follow, onFollow } = followHandler(stores.user)
    const ready = mount(stores.sessionReady)

    // No `{#if $sessionReady}` gate: the page reads the user store at once, while the
    // restore request is still pending.
    follow()

    expect(onFollow).not.toHaveBeenCalled()
    await answer()
    expect(ready.current()).toBe(true)
    // The click is gone — the defect the gate exists to close.
    expect(onFollow).not.toHaveBeenCalled()
    ready.stop()
  })

  it('is ready for a visitor with no session to restore, without a request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's hooks.client.ts does before the first render.
    void client.initialize()
    const { sessionReady } = createAuthStoresFromClient<UserProfile>(client)
    const ready = mount(sessionReady)
    await client.whenRestored!()
    expect(client.getState().status).toBe('unauthenticated')
    expect(ready.current()).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    ready.stop()
  })

  it('is ready when the restore cannot reach the server', async () => {
    document.cookie = 'mol_auth=1; path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's hooks.client.ts does before the first render.
    void client.initialize()
    const { sessionReady } = createAuthStoresFromClient<UserProfile>(client)
    const ready = mount(sessionReady)
    // The loading branch is what renders while the restore is pending.
    expect(ready.current()).toBe(false)
    await client.whenRestored!()
    expect(client.getState().status).toBe('unavailable')
    expect(ready.current()).toBe(true)
    ready.stop()
  })

  it('is true at once for a session already in storage — nothing to wait for', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage({
        'molecule:auth:accessToken': 'token-with-no-readable-exp',
        'molecule:auth:user': JSON.stringify(reader),
      }),
      autoRefresh: false,
    })
    clients.push(client)
    void client.initialize()
    const { sessionReady } = createAuthStoresFromClient<UserProfile>(client)
    const ready = mount(sessionReady)
    // A stored token AND user are the session: initialize() restores them synchronously,
    // so the store's first value is ready and a protected page's first render is signed in.
    expect(ready.values).toEqual([true])
    await client.whenRestored!()
    expect(client.getState().status).toBe('authenticated')
    expect(fetchSpy).not.toHaveBeenCalled()
    ready.stop()
  })

  describe.each(['context', 'from-client'] as const)('%s factory', (factory) => {
    function storesFor(client: AuthClient<UserProfile>) {
      vi.mocked(getAuthClient).mockReturnValue(client)
      return factory === 'context'
        ? createAuthStores<UserProfile>()
        : createAuthStoresFromClient<UserProfile>(client)
    }

    it('reads a restore that finished between store creation and first subscription', async () => {
      const client = createJWTAuthClient<UserProfile>({
        storage: memoryStorage(),
        autoRefresh: false,
      })
      clients.push(client)
      const stores = storesFor(client)
      await client.whenRestored!()
      expect(client.getState().status).toBe('unauthenticated')
      expect(get(stores.sessionReady)).toBe(true)
      expect(get(stores.state).status).toBe('unauthenticated')
    })

    it('refreshes the user and readiness when a component subscribes again', async () => {
      const client = createJWTAuthClient<UserProfile>({
        storage: memoryStorage(),
        autoRefresh: false,
      })
      clients.push(client)
      const stores = storesFor(client)
      const first = mount(stores.sessionReady)
      first.stop()
      client.setSession({ accessToken: 'replacement-token', user: reader })
      expect(get(stores.sessionReady)).toBe(true)
      expect(get(stores.user)).toEqual(reader)
      await client.whenRestored!()
    })

    it('starts an omitted initialize call and becomes ready after a restore timeout', async () => {
      document.cookie = 'mol_auth=1; path=/'
      vi.stubGlobal(
        'fetch',
        vi.fn(() => new Promise<Response>(() => undefined)),
      )
      const client = createJWTAuthClient<UserProfile>({
        storage: memoryStorage(),
        autoRefresh: false,
        requestTimeout: 20,
      })
      clients.push(client)
      const stores = storesFor(client)
      const ready = mount(stores.sessionReady)
      expect(ready.current()).toBe(false)
      await client.whenRestored!()
      expect(client.getState().status).toBe('unavailable')
      expect(ready.current()).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(1)
    })
  })
})
