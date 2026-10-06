import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { createFixtureFetch, defaultPersona } from '../browser/fixture-fetch.js'
import { serializeFixtureSet } from '../router/router.js'
import { buildMockFixtureSet } from '../server/server.js'

const ORIGIN = 'https://preview.example'
// __dirname = …/molecule/packages/api/testing/mock-server/src/__tests__ — 7 up is the workspace.
const BLOG = join(__dirname, ...Array(7).fill('..'), 'mlcl', 'templates', 'apps', 'blog', 'api')
const blogFixtures = (): ReturnType<typeof serializeFixtureSet> =>
  JSON.parse(
    JSON.stringify(
      serializeFixtureSet(
        buildMockFixtureSet({
          appType: 'blog',
          fixturesPath: join(BLOG, 'fixtures'),
          handlersPath: join(BLOG, 'src', 'handlers'),
          logging: false,
        }),
      ),
    ),
  )

const posts = [
  { id: 'p1', title: 'First', tags: ['a'], author: { name: 'Ann' } },
  { id: 'p2', title: 'Second', tags: [], author: { name: 'Bo' } },
]
const fixtures = {
  appType: 'blog',
  endpoints: [
    [
      'GET /api/posts',
      {
        endpoint: { method: 'GET', path: '/api/posts' },
        successResponse: { data: posts, total: 2, page: 1 },
        emptyResponse: { data: [], total: 0 },
        errorResponse: { error: 'x' },
      },
    ],
    [
      'GET /api/posts/:id',
      {
        endpoint: { method: 'GET', path: '/api/posts/:id' },
        successResponse: posts[0],
        emptyResponse: null,
        errorResponse: { error: 'x' },
      },
    ],
    [
      'GET /api/reports/summary',
      {
        endpoint: { method: 'GET', path: '/api/reports/summary' },
        successResponse: { views: 10 },
        emptyResponse: {},
        errorResponse: { error: 'x' },
      },
    ],
    [
      'GET /api/users',
      {
        endpoint: { method: 'GET', path: '/api/users' },
        successResponse: [{ id: 'u1', name: 'Dana', email: 'dana@example.com' }],
        emptyResponse: [],
        errorResponse: { error: 'x' },
      },
    ],
  ],
} as Parameters<typeof createFixtureFetch>[0]['fixtures']

const make = (extra: Partial<Parameters<typeof createFixtureFetch>[0]> = {}) => {
  const realFetch = vi.fn(async () => new Response('real'))
  const f = createFixtureFetch(
    { fixtures, origin: ORIGIN, now: () => new Date('2026-10-06T00:00:00Z'), ...extra },
    realFetch as unknown as typeof fetch,
  )
  return { f, realFetch }
}

describe('createFixtureFetch', () => {
  it('passes non-API and cross-origin requests to the real fetch', async () => {
    const { f, realFetch } = make()
    await f('/assets/app.js')
    await f('https://other.example/api/posts')
    expect(realFetch).toHaveBeenCalledTimes(2)
  })

  it('answers fixture routes through the shared router', async () => {
    const { f } = make()
    const res = await f(`${ORIGIN}/api/reports/summary`)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-static-preview')).toBe('true')
    expect(await res.json()).toEqual({ views: 10 })
  })

  it('serves an empty success for unmatched API routes', async () => {
    const { f } = make()
    expect(await (await f('/api/nope')).json()).toEqual([])
    expect((await f('/api/nope/1', { method: 'DELETE' })).status).toBe(204)
  })

  it('returns the record with the requested id on a detail GET', async () => {
    const { f } = make()
    expect(await (await f('/api/posts/p2')).json()).toMatchObject({ title: 'Second' })
  })

  it('keeps writes in memory: create, update and delete show up in later reads', async () => {
    const { f } = make()
    const created = await f('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title: 'Third' }),
      headers: { 'content-type': 'application/json' },
    })
    expect(created.status).toBe(201)
    const record = (await created.json()) as { id: string; tags: unknown[]; author: unknown }
    expect(record).toMatchObject({ title: 'Third', tags: [], author: { name: 'Ann' } })

    let list = (await (await f('/api/posts')).json()) as {
      data: { title: string }[]
      total: number
    }
    expect(list.data.map((p) => p.title)).toEqual(['Third', 'First', 'Second'])
    expect(list.total).toBe(3)

    const updated = await f(`/api/posts/${record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Third (edited)' }),
    })
    expect(await updated.json()).toMatchObject({ id: record.id, title: 'Third (edited)' })

    expect((await f('/api/posts/p1', { method: 'DELETE' })).status).toBe(204)
    list = (await (await f('/api/posts')).json()) as typeof list
    expect(list.data.map((p) => p.title)).toEqual(['Third (edited)', 'Second'])
  })

  it('reads form-data bodies, turning files into object URLs', async () => {
    const { f } = make()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview/1')
    const form = new FormData()
    form.set('title', 'With image')
    form.set('image', new Blob(['x'], { type: 'image/png' }), 'cat.png')
    const res = await f('/api/posts', { method: 'POST', body: form })
    expect(await res.json()).toMatchObject({
      title: 'With image',
      image: { name: 'cat.png', type: 'image/png', url: 'blob:preview/1' },
    })
    createObjectURL.mockRestore()
  })

  it('runs a demo session: signed in by default, logout then any login works', async () => {
    const sessions: boolean[] = []
    const { f } = make({ onSessionChange: (s) => sessions.push(s) })
    const me = (await (await f('/api/users/me')).json()) as { user: { name: string }; name: string }
    expect(me.user.name).toBe('Dana')
    expect(me.name).toBe('Dana')

    await f('/api/users/logout', { method: 'POST' })
    expect(f.isSignedIn()).toBe(false)
    expect((await f('/api/users/me')).status).toBe(401)

    const login = await f('/api/users/log-in', {
      method: 'POST',
      body: JSON.stringify({ email: 'x@y.z', password: 'anything' }),
    })
    expect(await login.json()).toMatchObject({
      user: { name: 'Dana' },
      accessToken: expect.any(String),
    })
    expect(f.isSignedIn()).toBe(true)
    expect(sessions).toEqual([false, true])
  })

  it('can start signed out', async () => {
    const { f } = make({ signedIn: false })
    expect((await f('/api/users/me')).status).toBe(401)
  })

  it('answers Request objects and keeps their method and body', async () => {
    const { f } = make()
    const req = new Request(`${ORIGIN}/api/posts`, {
      method: 'POST',
      body: JSON.stringify({ title: 'From Request' }),
    })
    expect(await (await f(req)).json()).toMatchObject({ title: 'From Request' })
  })
})

describe('defaultPersona', () => {
  it('uses the first users record, else a neutral sample user', () => {
    expect(defaultPersona(fixtures)).toMatchObject({ name: 'Dana' })
    expect(defaultPersona({ appType: 'x', endpoints: [] })).toMatchObject({
      email: expect.any(String),
    })
  })

  it('serves a real template fixture set after a JSON round trip (what a static build bundles)', async () => {
    const f = createFixtureFetch(
      { fixtures: blogFixtures(), origin: ORIGIN },
      vi.fn() as unknown as typeof fetch,
    )
    const list = (await (await f('/api/posts')).json()) as unknown
    const items = (Array.isArray(list) ? list : (list as { data: unknown[] }).data) as {
      id: string
      title: string
    }[]
    expect(items.length).toBeGreaterThan(1)
    const second = (await (await f(`/api/posts/${items[1].id}`)).json()) as { title: string }
    expect(second.title).toBe(items[1].title)
  })
})

describe('a hand-written fixture beats the scanner sample for the same endpoint', () => {
  const dashboardFixtures = {
    appType: 'app',
    endpoints: [
      [
        'GET /api/dashboard/',
        {
          endpoint: { method: 'GET', path: '/api/dashboard/' },
          successResponse: { total: 7, recent: [{ id: 'real-1' }, { id: 'real-2' }] },
          emptyResponse: {},
          errorResponse: { error: 'x' },
        },
      ],
      [
        'GET /api/dashboard',
        {
          endpoint: { method: 'GET', path: '/api/dashboard' },
          // The scanner's own sample (listed after the hand-written fixture, as in a real set): an
          // object with exactly one array field.
          successResponse: { recent: [{ id: 'sample-1' }] },
          emptyResponse: {},
          errorResponse: { error: 'x' },
        },
      ],
    ],
  } as Parameters<typeof createFixtureFetch>[0]['fixtures']

  it('serves the fixture, not a list rebuilt from the scanner sample', async () => {
    const f = createFixtureFetch({ fixtures: dashboardFixtures, origin: ORIGIN })
    const body = (await (await f('/api/dashboard')).json()) as {
      total?: number
      recent: { id: string }[]
    }
    expect(body.total).toBe(7)
    expect(body.recent.map((r) => r.id)).toEqual(['real-1', 'real-2'])
  })
})

describe('list-shaped writes (a cart)', () => {
  const cart = { items: [{ id: 'c1', qty: 1 }], subtotal: 10, total: 10 }
  const cartFixtures = {
    appType: 'shop',
    endpoints: [
      [
        'GET /api/cart',
        {
          endpoint: { method: 'GET', path: '/api/cart' },
          successResponse: cart,
          emptyResponse: {},
          errorResponse: { error: 'x' },
        },
      ],
      [
        'POST /api/cart',
        {
          endpoint: { method: 'POST', path: '/api/cart' },
          successResponse: cart,
          emptyResponse: cart,
          errorResponse: { error: 'x' },
        },
      ],
      [
        'DELETE /api/cart/:id',
        {
          endpoint: { method: 'DELETE', path: '/api/cart/:id' },
          successResponse: { items: [], subtotal: 0, total: 0 },
          emptyResponse: {},
          errorResponse: { error: 'x' },
        },
      ],
    ],
  } as Parameters<typeof createFixtureFetch>[0]['fixtures']

  it('answers POST and DELETE with the updated cart, not a lone record', async () => {
    const f = createFixtureFetch(
      { fixtures: cartFixtures, origin: ORIGIN },
      vi.fn() as unknown as typeof fetch,
    )
    const added = (await (
      await f('/api/cart', { method: 'POST', body: JSON.stringify({ qty: 2 }) })
    ).json()) as typeof cart
    expect(added.items).toHaveLength(2)
    expect(added.subtotal).toBe(10)
    const removed = await f('/api/cart/c1', { method: 'DELETE' })
    expect(removed.status).toBe(200)
    expect(((await removed.json()) as typeof cart).items).toHaveLength(1)
  })
})
