/**
 * `updateProfile()` applies every save answer field by field — for a profile type WITHOUT an
 * `id` (a handle-keyed account) and for one with an `id` alike.
 *
 * A save answer may carry only the changed fields — `{ account: { bio } }` from an account API,
 * `@molecule/api-resource-user`'s `{ props }`, a mutation's `{ id, name }` — and neither its
 * shape nor an `id` says whether it is the whole profile. Stored as the profile, such an answer
 * lost `handle`, `email` and every other untouched field from every `useAuth()` reader, the
 * stored session and the next save's route. Each field the answer carries replaces the current
 * value (`null` clears it); each field it leaves out is kept.
 *
 * The account API here is identified by `handle` and has no `id`: it signs in at
 * `POST /session` (`{ session: { token }, account }`), reads at `GET /account` and saves at
 * `PATCH /accounts/:handle`, and the app's own `mapAuthResponse` reads every answer.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { AuthClientConfig, AuthResult, StorageAdapter, UserProfile } from '../types.js'

/** The API's account: identified by `handle`, with no `id`. */
interface Account {
  handle: string
  email: string
  displayName?: string
  bio?: string | null
  timezone?: string
  avatarUrl?: string
}

const account: Account = {
  handle: 'ann',
  email: 'ann@example.test',
  displayName: 'Ann Adams',
  bio: 'Old bio',
  timezone: 'Europe/Berlin',
  avatarUrl: 'https://example.test/ann.png',
}

/**
 * The app's mapper for this API: a sign-in answer carries a session, a read and a save carry
 * the account — a save only its changed fields.
 *
 * @param data - The parsed answer.
 * @returns The client's auth result.
 */
const mapAuthResponse = (data: unknown): AuthResult<Account> => {
  const answer = data as { session?: { token?: string }; account?: Account }
  if (!answer?.account) throw new Error('The answer carries no account')
  return { accessToken: answer.session?.token, user: answer.account }
}

/**
 * The same API read field by field, the way a mapper written for the sign-in answer's whole
 * account reads it: a field a save answer does not carry comes out `undefined`.
 *
 * @param data - The parsed answer.
 * @returns The client's auth result.
 */
const mapFieldByField = (data: unknown): AuthResult<Account> => {
  const { account: wire } = data as { account: Account }
  return {
    user: {
      handle: wire.handle,
      email: wire.email,
      displayName: wire.displayName,
      bio: wire.bio,
      timezone: wire.timezone,
      avatarUrl: wire.avatarUrl,
    },
  }
}

/**
 * A `StorageAdapter` over a Map.
 *
 * @returns The adapter plus its backing store.
 */
function createStorage(): StorageAdapter & { items: Map<string, string> } {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
    removeItem: (key) => {
      items.delete(key)
    },
  }
}

/** The stored user, as a reader of the same storage would see it. */
const stored = (items: Map<string, string>): unknown =>
  JSON.parse(items.get('molecule:auth:user') ?? 'null')

type Route = () => Response | Promise<Response>

/**
 * A signed-in client over a stubbed account API: the profile route resolves the account by its
 * `handle`, and every answer goes through the app's own `mapAuthResponse`.
 *
 * @param routes - Answers by request URL; sign-in, sign-out and the current-user read have
 *   defaults.
 * @param config - Client config overrides.
 * @param signedIn - The account the session starts with.
 * @returns The client, its storage and the requests it sent.
 */
function setup(
  routes: Record<string, Route>,
  config: Partial<AuthClientConfig<Account>> = {},
  signedIn: Account = account,
): {
  client: ReturnType<typeof createJWTAuthClient<Account>>
  items: Map<string, string>
  requests: { url: string; method: string; body?: string }[]
} {
  const storage = createStorage()
  const requests: { url: string; method: string; body?: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      requests.push({
        url,
        method: init.method ?? 'GET',
        body: typeof init.body === 'string' ? init.body : undefined,
      })
      const route = routes[url]
      if (route) return route()
      if (url === '/session/log-out') return Response.json({})
      if (url === '/session')
        return Response.json({
          session: { token: 'token-bo' },
          account: { handle: 'bo', email: 'bo@example.test', displayName: 'Bo' },
        })
      return new Response('{}', { status: 404 })
    }),
  )
  const client = createJWTAuthClient<Account>({
    storage,
    autoRefresh: false,
    loginEndpoint: '/session',
    logoutEndpoint: '/session/log-out',
    currentUserEndpoint: '/account',
    profileEndpoint: (user) => `/accounts/${encodeURIComponent(user.handle)}`,
    mapAuthResponse,
    ...config,
  })
  client.setSession({ accessToken: 'token-ann', user: { ...signedIn } })
  return { client, items: storage.items, requests }
}

/**
 * A profile answer the test releases.
 *
 * @returns The route and its release.
 */
function deferred(): { route: Route; release: (body: unknown) => void } {
  let release!: (body: unknown) => void
  const answer = new Promise<Response>((resolve) => {
    release = (body) => resolve(Response.json(body))
  })
  return { route: () => answer, release }
}

/** The stored account with the fields a save changed. */
const savedAccount = (changed: Partial<Account>): Account => ({ ...account, ...changed })

afterEach(() => vi.unstubAllGlobals())

describe('a handle-keyed account (no id) keeps every field its save answer does not carry', () => {
  it('keeps every untouched field in the user, storage and subscribers', async () => {
    const { client, items, requests } = setup({
      '/accounts/ann': () => Response.json({ account: { bio: 'New bio' } }),
    })
    const seen: (Account | null)[] = []
    const unsubscribe = client.subscribe((state) => seen.push(state.user))

    const saved = await client.updateProfile({ bio: 'New bio' })
    unsubscribe()

    expect(requests.map((request) => request.body)).toEqual(['{"bio":"New bio"}'])
    expect(saved).toEqual(savedAccount({ bio: 'New bio' }))
    expect(saved).not.toHaveProperty('id')
    expect(client.getUser()).toEqual(saved)
    expect(stored(items)).toEqual(saved)
    expect(seen).toEqual([saved])
  })

  it('resolves the next save’s route from a field the answer did not carry', async () => {
    const answers = [{ account: { bio: 'New bio' } }, { account: { displayName: 'Ann B' } }]
    const { client, items, requests } = setup({
      '/accounts/ann': () => Response.json(answers.shift()),
    })

    await client.updateProfile({ bio: 'New bio' })
    await client.updateProfile({ displayName: 'Ann B' })

    expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
      'PATCH /accounts/ann',
      'PATCH /accounts/ann',
    ])
    expect(client.getUser()).toEqual(savedAccount({ bio: 'New bio', displayName: 'Ann B' }))
    expect(stored(items)).toEqual(client.getUser())
  })

  it('applies the default resource `{ props }` answer without a mapper', async () => {
    // `@molecule/api-resource-user` answers a PATCH with `{ props: <changed fields> }`; the
    // client reads `props` as the user.
    const { client, items } = setup(
      { '/accounts/ann': () => Response.json({ props: { bio: 'New bio', updatedAt: 'T1' } }) },
      { mapAuthResponse: undefined },
    )

    const saved = await client.updateProfile({ bio: 'New bio' })

    expect(saved).toEqual({ ...account, bio: 'New bio', updatedAt: 'T1' })
    expect(client.getUser()).toEqual(saved)
    expect(stored(items)).toEqual(saved)
  })

  it('keeps the fields a field-by-field mapper reads as undefined', async () => {
    const { client, items } = setup(
      { '/accounts/ann': () => Response.json({ account: { displayName: 'Ann B' } }) },
      { mapAuthResponse: mapFieldByField },
    )

    const saved = await client.updateProfile({ displayName: 'Ann B' })

    expect(saved).toEqual(savedAccount({ displayName: 'Ann B' }))
    expect(stored(items)).toEqual(saved)
  })

  it('leaves an optional field the account never had absent', async () => {
    const withoutOptional: Account = {
      handle: account.handle,
      email: account.email,
      displayName: account.displayName,
      bio: account.bio,
    }
    const { client, items } = setup(
      { '/accounts/ann': () => Response.json({ account: { bio: 'New bio' } }) },
      { mapAuthResponse: mapFieldByField },
      withoutOptional,
    )

    const saved = await client.updateProfile({ bio: 'New bio' })

    expect(saved).toEqual({ ...withoutOptional, bio: 'New bio' })
    expect(Object.keys(saved).sort()).toEqual(['bio', 'displayName', 'email', 'handle'])
    expect(Object.keys(stored(items) as Account).sort()).toEqual(Object.keys(saved).sort())
  })
})

describe('a field the answer sets to null is cleared, one it leaves out is kept', () => {
  it('clears a field the answer sets to null and keeps it cleared through the next save', async () => {
    const answers = [{ account: { bio: null } }, { account: { displayName: 'Ann B' } }]
    const { client, items } = setup({ '/accounts/ann': () => Response.json(answers.shift()) })

    await client.updateProfile({ bio: null })
    expect(client.getUser()).toEqual(savedAccount({ bio: null }))

    await client.updateProfile({ displayName: 'Ann B' })
    expect(client.getUser()).toEqual(savedAccount({ bio: null, displayName: 'Ann B' }))
    expect(stored(items)).toEqual(client.getUser())
  })
})

describe('a whole-account answer', () => {
  it('takes every field of a returned whole account', async () => {
    const moved = { ...account, displayName: 'Ann B', timezone: 'Asia/Tokyo' }
    const { client, items } = setup({ '/accounts/ann': () => Response.json({ account: moved }) })

    const saved = await client.updateProfile({ displayName: 'Ann B' })

    expect(saved).toEqual(moved)
    expect(client.getUser()).toEqual(moved)
    expect(stored(items)).toEqual(moved)
  })

  it('keeps a field a whole answer leaves out, and clears it when the mapper answers it as null', async () => {
    // The whole account, with `bio` left out.
    const answer = {
      account: {
        handle: account.handle,
        email: account.email,
        displayName: 'Ann B',
        timezone: account.timezone,
        avatarUrl: account.avatarUrl,
      },
    }

    const kept = setup({ '/accounts/ann': () => Response.json(answer) })
    expect(await kept.client.updateProfile({ displayName: 'Ann B' })).toEqual(
      savedAccount({ displayName: 'Ann B' }),
    )

    // An API that clears a field by leaving it out of its whole answer maps the gap to `null`.
    const cleared = setup(
      { '/accounts/ann': () => Response.json(answer) },
      {
        mapAuthResponse: (data) => {
          const { account: wire } = data as { account: Account }
          return { user: { ...wire, bio: wire.bio ?? null } }
        },
      },
    )
    expect(await cleared.client.updateProfile({ bio: null, displayName: 'Ann B' })).toEqual(
      savedAccount({ bio: null, displayName: 'Ann B' }),
    )
    expect(stored(cleared.items)).toEqual(savedAccount({ bio: null, displayName: 'Ann B' }))
  })
})

describe('an id in the answer is a field like any other', () => {
  interface Member extends UserProfile {
    username: string
    bio?: string
  }

  const member: Member = {
    id: 'ada',
    name: 'Ada',
    email: 'ada@example.test',
    username: 'ada',
    bio: 'Old bio',
  }

  /**
   * A signed-in member client whose profile route is the member's id.
   *
   * @param answer - The save route's answers, in order.
   * @param mapAuthResponseOverride - The app's mapper.
   * @returns The client, its storage and the requested URLs.
   */
  function memberSetup(
    answer: () => unknown,
    mapAuthResponseOverride: AuthClientConfig<Member>['mapAuthResponse'],
  ): {
    client: ReturnType<typeof createJWTAuthClient<Member>>
    items: Map<string, string>
    urls: string[]
  } {
    const storage = createStorage()
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url)
        return Response.json(answer())
      }),
    )
    const client = createJWTAuthClient<Member>({
      storage,
      autoRefresh: false,
      profileEndpoint: (user) => `/users/${encodeURIComponent(user.id)}`,
      mapAuthResponse: mapAuthResponseOverride,
    })
    client.setSession({ accessToken: 'token-ada', user: { ...member } })
    return { client, items: storage.items, urls }
  }

  it('keeps every other field when a mutation answers the id beside the changed fields', async () => {
    // GraphQL-shaped: `updateProfile` selects `{ id name }`, the id a cache keys the object by.
    const { client, items } = memberSetup(
      () => ({ data: { updateProfile: { id: 'ada', name: 'Ada L.' } } }),
      (data) => ({ user: (data as { data: { updateProfile: Member } }).data.updateProfile }),
    )

    const saved = await client.updateProfile({ name: 'Ada L.' })

    expect(saved).toEqual({ ...member, name: 'Ada L.' })
    expect(stored(items)).toEqual(saved)
  })

  it('moves an id a mapper derives from a changed field, and the next save follows it', async () => {
    // The scaffold-style mapper reads the wire user field by field and derives `id` from
    // `username`, so renaming the user changes the id with it.
    const answers = [
      { props: { username: 'ada2', updatedAt: 'T1' } },
      { props: { bio: 'New bio', updatedAt: 'T2' } },
    ]
    const { client, items, urls } = memberSetup(
      () => answers.shift(),
      (data) => {
        const wire = (data as { props: Member }).props
        return {
          user: {
            id: wire.username,
            name: wire.name,
            email: wire.email,
            username: wire.username,
            bio: wire.bio,
          },
        }
      },
    )

    await client.updateProfile({ username: 'ada2' })
    await client.updateProfile({ bio: 'New bio' })

    expect(urls).toEqual(['/users/ada', '/users/ada2'])
    expect(client.getUser()).toEqual({ ...member, id: 'ada2', username: 'ada2', bio: 'New bio' })
    expect(stored(items)).toEqual(client.getUser())
  })
})

describe('a pending save stays with the session that sent it', () => {
  it('keeps a same-session edit made while the save is pending', async () => {
    const save = deferred()
    const { client, items } = setup({ '/accounts/ann': save.route })
    const pending = client.updateProfile({ bio: 'New bio' })

    client.setUser({ ...account, displayName: 'Local edit' })
    save.release({ account: { bio: 'New bio' } })

    const saved = await pending
    expect(saved).toEqual(savedAccount({ displayName: 'Local edit', bio: 'New bio' }))
    expect(client.getUser()).toEqual(saved)
    expect(stored(items)).toEqual(saved)
  })

  it('keeps a same-session refresh that lands while the save is pending', async () => {
    const save = deferred()
    const { client, items } = setup({
      '/accounts/ann': save.route,
      '/account': () => Response.json({ account: { ...account, timezone: 'Asia/Tokyo' } }),
    })
    const pending = client.updateProfile({ bio: 'New bio' })

    await client.validateSession?.()
    save.release({ account: { bio: 'New bio' } })
    await pending

    expect(client.getUser()).toEqual(savedAccount({ timezone: 'Asia/Tokyo', bio: 'New bio' }))
    expect(stored(items)).toEqual(client.getUser())
  })

  it('a sign-out during the save leaves the client signed out; the save resolves to the saved account', async () => {
    const save = deferred()
    const { client, items } = setup({ '/accounts/ann': save.route })
    const pending = client.updateProfile({ bio: 'New bio' })

    await client.logout()
    save.release({ account: { bio: 'New bio' } })

    expect(await pending).toEqual(savedAccount({ bio: 'New bio' }))
    expect(client.getUser()).toBeNull()
    expect(items.has('molecule:auth:user')).toBe(false)
  })

  it('an account switch during the save leaves the new account untouched', async () => {
    const save = deferred()
    const { client, items } = setup({ '/accounts/ann': save.route })
    const pending = client.updateProfile({ bio: 'New bio' })

    await client.logout()
    await client.login({ email: 'bo@example.test', password: 'secret' })
    const signedIn = client.getUser()
    save.release({ account: { bio: 'New bio' } })

    expect(await pending).toEqual(savedAccount({ bio: 'New bio' }))
    expect(client.getUser()).toBe(signedIn)
    expect(stored(items)).toEqual({ handle: 'bo', email: 'bo@example.test', displayName: 'Bo' })
  })
})

describe('malformed and rejected answers behave as published', () => {
  it('an empty object answer carries no field and changes nothing', async () => {
    const { client, items } = setup({ '/accounts/ann': () => Response.json({}) })

    expect(await client.updateProfile({ bio: 'New bio' })).toEqual(account)
    expect(client.getUser()).toEqual(account)
    expect(stored(items)).toEqual(account)
  })

  it('returns an answer that is not a JSON object as it came', async () => {
    const { client } = setup({
      '/accounts/ann': () => new Response(JSON.stringify('ok'), { status: 200 }),
    })

    expect(await client.updateProfile({ bio: 'New bio' })).toBe('ok')
    expect(client.getUser()).toBe('ok')
  })

  it.each([
    ['a body that is not JSON', 'not json'],
    ['a JSON null', 'null'],
  ])('rejects %s and changes nothing', async (_, body) => {
    const { client, items } = setup({
      '/accounts/ann': () => new Response(body, { status: 200 }),
    })
    const seen = vi.fn()
    client.subscribe(seen)

    await expect(client.updateProfile({ bio: 'New bio' })).rejects.toThrow()
    expect(client.getUser()).toEqual(account)
    expect(stored(items)).toEqual(account)
    expect(seen).not.toHaveBeenCalled()
  })

  it('a rejected save changes nothing and keeps the server reason', async () => {
    const body = { errorKey: 'user.error.usernameInvalid', error: 'Username is invalid' }
    const { client, items } = setup({
      '/accounts/ann': () => Response.json(body, { status: 422 }),
    })
    const seen = vi.fn()
    client.subscribe(seen)

    await expect(client.updateProfile({ bio: 'New bio' })).rejects.toMatchObject({
      i18nKey: 'user.error.usernameInvalid',
      status: 422,
      body,
    })
    expect(client.getUser()).toEqual(account)
    expect(stored(items)).toEqual(account)
    expect(seen).not.toHaveBeenCalled()
  })
})
