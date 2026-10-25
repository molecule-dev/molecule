/**
 * `updateProfile()` publishes ONE complete profile when the API answers a save with the
 * changed fields only.
 *
 * `@molecule/api-resource` answers an update with the props it wrote (`{ props: { bio,
 * updatedAt } }`), not the whole user. Stored as the session user, that answer dropped every
 * field the save did not touch — from every `useAuth()` reader, from the stored session and
 * from the next save's route (`/users/undefined`). Every answer is applied onto the signed-in
 * user field by field: each field it carries replaces the current value, every field it does
 * not carry is kept. An `id` in the answer is a field like any other, and a whole-profile
 * answer — with or without an `id`, in any envelope — keeps a field it leaves out.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { AuthClientConfigOptions, StorageAdapter, UserProfile } from '../types.js'

interface Member extends UserProfile {
  username: string
  bio: string | null
  updatedAt?: string
}

const member: Member = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@example.test',
  avatar: 'ada.png',
  username: 'ada',
  bio: 'Old bio',
}

type Route = () => Response | Promise<Response>

/**
 * A signed-in client over a stubbed API. The profile route resolves the user's own id, as the
 * scaffolded config does.
 *
 * @param routes - Answers by request URL; `/users/logout` and `/users/me` have defaults.
 * @param config - Client config overrides.
 * @returns The client, its storage and the requests it sent.
 */
function setup(
  routes: Record<string, Route>,
  config: AuthClientConfigOptions<Member> = {},
): {
  client: ReturnType<typeof createJWTAuthClient<Member>>
  items: Map<string, string>
  requests: { url: string; method: string }[]
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
  const requests: { url: string; method: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      requests.push({ url, method: init.method ?? 'GET' })
      const route = routes[url]
      if (route) return route()
      if (url === '/users/logout') return Response.json({})
      if (url === '/users/log-in')
        return Response.json({ accessToken: 'token-b', user: { ...member, id: 'u2', name: 'Bo' } })
      return new Response('{}', { status: 404 })
    }),
  )
  const client = createJWTAuthClient<Member>({
    storage,
    autoRefresh: false,
    loginEndpoint: '/users/log-in',
    logoutEndpoint: '/users/logout',
    currentUserEndpoint: '/users/me',
    profileEndpoint: (user) => `/users/${encodeURIComponent(user.id)}`,
    ...config,
  })
  client.setSession({ accessToken: 'token-a', user: member })
  return { client, items, requests }
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

const stored = (items: Map<string, string>): unknown =>
  JSON.parse(items.get('molecule:auth:user') ?? 'null')

afterEach(() => vi.unstubAllGlobals())

describe('updateProfile applies a changed-fields answer onto the signed-in user', () => {
  it('keeps every untouched field, in state, storage and the next save’s route', async () => {
    const answers = [
      { props: { bio: 'New bio', updatedAt: 'T1' } },
      { props: { name: 'Ada L.', updatedAt: 'T2' } },
    ]
    const { client, items, requests } = setup({ '/users/u1': () => Response.json(answers.shift()) })

    const saved = await client.updateProfile({ bio: 'New bio' })

    expect(saved).toEqual({ ...member, bio: 'New bio', updatedAt: 'T1' })
    expect(client.getUser()).toEqual(saved)
    expect(stored(items)).toEqual(saved)
    await client.updateProfile({ name: 'Ada L.' })
    expect(requests.map((request) => `${request.method} ${request.url}`)).toEqual([
      'PATCH /users/u1',
      'PATCH /users/u1',
    ])
    expect(client.getUser()).toEqual({ ...member, bio: 'New bio', name: 'Ada L.', updatedAt: 'T2' })
  })

  it('never shows a subscriber a profile without the signed-in user’s fields', async () => {
    const { client } = setup({
      '/users/u1': () => Response.json({ props: { bio: 'New bio', updatedAt: 'T1' } }),
    })
    const seen: (Member | null)[] = []
    const unsubscribe = client.subscribe((state) => seen.push(state.user))

    await client.updateProfile({ bio: 'New bio' })
    unsubscribe()

    expect(seen).toEqual([{ ...member, bio: 'New bio', updatedAt: 'T1' }])
  })

  it('applies a field the answer clears', async () => {
    const { client } = setup({
      '/users/u1': () => Response.json({ props: { bio: null, updatedAt: 'T1' } }),
    })

    await client.updateProfile({ bio: null })

    expect(client.getUser()).toEqual({ ...member, bio: null, updatedAt: 'T1' })
  })

  it('keeps the fields a mapper reads as undefined from a changed-fields answer', async () => {
    // A field-by-field mapper, written for the sign-in answer's whole user: a changed-fields
    // answer leaves every field it does not carry `undefined`, the id included.
    const answers = [{ props: { bio: 'New bio' } }, { props: { name: 'Ada L.' } }]
    const { client, requests } = setup(
      { '/users/u1': () => Response.json(answers.shift()) },
      {
        mapAuthResponse: (data) => {
          const wire = (data as { user: Member }).user
          return {
            user: {
              id: wire.id,
              name: wire.name,
              email: wire.email,
              avatar: wire.avatar,
              username: wire.username,
              bio: wire.bio,
            },
          }
        },
      },
    )

    await client.updateProfile({ bio: 'New bio' })
    await client.updateProfile({ name: 'Ada L.' })

    expect(requests.map((request) => request.url)).toEqual(['/users/u1', '/users/u1'])
    expect(client.getUser()).toEqual({ ...member, bio: 'New bio', name: 'Ada L.' })
  })

  it('applies an answer that names the user and carries only the changed fields', async () => {
    // A REST or GraphQL mutation that echoes the id beside the changed fields: the id says
    // which user was saved, not that the answer is the whole profile.
    const { client, items } = setup({
      '/users/u1': () => Response.json({ id: 'u1', bio: 'New bio', updatedAt: 'T1' }),
    })

    const saved = await client.updateProfile({ bio: 'New bio' })

    expect(saved).toEqual({ ...member, bio: 'New bio', updatedAt: 'T1' })
    expect(client.getUser()).toEqual(saved)
    expect(stored(items)).toEqual(saved)
  })
})

describe('updateProfile applies a whole-profile answer field by field', () => {
  it.each([
    ['a bare user', (user: Member) => user],
    ['{ user }', (user: Member) => ({ user })],
    ['{ props }', (user: Member) => ({ props: user })],
  ])(
    'a whole-profile answer (%s) sets every field it carries and keeps one it leaves out',
    async (_, wrap) => {
      // The answer leaves `avatar` out: leaving a field out never clears it.
      const whole: Member = {
        id: 'u1',
        name: 'Ada',
        email: member.email,
        username: 'ada',
        bio: 'New',
      }
      const { client, items } = setup({ '/users/u1': () => Response.json(wrap(whole)) })
      const saved = { ...whole, avatar: member.avatar }

      expect(await client.updateProfile({ bio: 'New' })).toEqual(saved)
      expect(client.getUser()).toEqual(saved)
      expect(stored(items)).toEqual(saved)
    },
  )

  it('an answer for a profile type without an id is applied onto the stored user', async () => {
    // RealWorld-shaped: the profile has no id. Its answer is applied like any other — `image`,
    // which the answer leaves out, is kept.
    type SessionUser = { username: string; email: string; bio: string | null; image?: string }
    const items = new Map<string, string>()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ user: { username: 'ada', email: 'a@x.test', bio: 'New' } }),
      ),
    )
    const client = createJWTAuthClient<SessionUser>({
      storage: {
        getItem: (key) => items.get(key) ?? null,
        setItem: (key, value) => {
          items.set(key, value)
        },
        removeItem: (key) => {
          items.delete(key)
        },
      },
      autoRefresh: false,
      profileEndpoint: '/user',
      profileUpdateMethod: 'PUT',
    })
    client.setSession({
      accessToken: 'token',
      user: { username: 'ada', email: 'a@x.test', bio: 'Old', image: 'old.png' },
    })

    await client.updateProfile({ bio: 'New' })

    expect(client.getUser()).toEqual({
      username: 'ada',
      email: 'a@x.test',
      bio: 'New',
      image: 'old.png',
    })
  })
})

describe('updateProfile keeps a changed-fields answer with the session that sent it', () => {
  it('a sign-out during the save leaves the client signed out; the save resolves to the saved profile', async () => {
    const save = deferred()
    const { client, items } = setup({ '/users/u1': save.route })
    const pending = client.updateProfile({ bio: 'New bio' })

    await client.logout()
    save.release({ props: { bio: 'New bio', updatedAt: 'T1' } })

    expect(await pending).toEqual({ ...member, bio: 'New bio', updatedAt: 'T1' })
    expect(client.getUser()).toBeNull()
    expect(items.has('molecule:auth:user')).toBe(false)
  })

  it('an account switch during the save leaves the new account untouched', async () => {
    const save = deferred()
    const { client, items } = setup({ '/users/u1': save.route })
    const pending = client.updateProfile({ bio: 'New bio' })

    await client.logout()
    await client.login({ email: 'bo@example.test', password: 'secret' })
    const signedIn = client.getUser()
    save.release({ props: { bio: 'New bio', updatedAt: 'T1' } })

    expect(await pending).toEqual({ ...member, bio: 'New bio', updatedAt: 'T1' })
    expect(client.getUser()).toBe(signedIn)
    expect(stored(items)).toEqual({ ...member, id: 'u2', name: 'Bo' })
  })

  it('a same-session refresh during the save is kept, and the save is applied on top of it', async () => {
    const save = deferred()
    const { client, items } = setup({
      '/users/u1': save.route,
      '/users/me': () => Response.json({ user: { ...member, username: 'ada2' } }),
    })
    const pending = client.updateProfile({ bio: 'New bio' })

    await client.validateSession?.()
    save.release({ props: { bio: 'New bio', updatedAt: 'T1' } })
    await pending

    expect(client.getUser()).toEqual({
      ...member,
      username: 'ada2',
      bio: 'New bio',
      updatedAt: 'T1',
    })
    expect(stored(items)).toEqual(client.getUser())
  })

  it('a same-session setUser during the save is kept, and the save is applied on top of it', async () => {
    const save = deferred()
    const { client } = setup({ '/users/u1': save.route })
    const pending = client.updateProfile({ bio: 'New bio' })

    client.setUser({ ...member, name: 'Local edit' })
    save.release({ props: { bio: 'New bio', updatedAt: 'T1' } })
    await pending

    expect(client.getUser()).toEqual({
      ...member,
      name: 'Local edit',
      bio: 'New bio',
      updatedAt: 'T1',
    })
  })
})
