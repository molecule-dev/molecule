import { describe, expect, it } from 'vitest'

import {
  compileFixtureRoutes,
  compileRoutePath,
  fixtureResponse,
  matchFixtureRoute,
  type RoutableFixture,
  serializeFixtureSet,
  unmatchedFixtureResponse,
} from '../router/router.js'

const fx = (method: RoutableFixture['endpoint']['method'], path: string, body: unknown) => ({
  endpoint: { method, path },
  successResponse: body,
  emptyResponse: Array.isArray(body) ? [] : {},
  errorResponse: { error: 'Internal server error' },
})

describe('compileRoutePath', () => {
  it('matches one segment per :param, case-insensitively, trailing slash optional', () => {
    const { pattern, paramNames } = compileRoutePath('/api/posts/:id')
    expect(paramNames).toEqual(['id'])
    expect(pattern.test('/api/posts/42')).toBe(true)
    expect(pattern.test('/api/posts/42/')).toBe(true)
    expect(pattern.test('/API/Posts/42')).toBe(true)
    expect(pattern.test('/api/posts')).toBe(false)
    expect(pattern.test('/api/posts/42/comments')).toBe(false)
  })

  it('escapes regex metacharacters in literal segments', () => {
    const { pattern } = compileRoutePath('/api/v1.0/items')
    expect(pattern.test('/api/v1.0/items')).toBe(true)
    expect(pattern.test('/api/v1x0/items')).toBe(false)
  })

  it('supports *wildcards and {optional} groups', () => {
    expect(compileRoutePath('/api/files/*rest').pattern.test('/api/files/a/b/c')).toBe(true)
    const optional = compileRoutePath('/api/items{/:id}').pattern
    expect(optional.test('/api/items')).toBe(true)
    expect(optional.test('/api/items/7')).toBe(true)
  })
})

describe('matchFixtureRoute', () => {
  it('prefers a static path over a :param sibling regardless of insertion order', () => {
    const routes = compileFixtureRoutes(
      new Map([
        ['GET /api/profile/:id', fx('GET', '/api/profile/:id', { from: 'param' })],
        ['GET /profile/me', fx('GET', '/profile/me', { from: 'static' })],
      ]),
    )
    const match = matchFixtureRoute(routes, 'get', '/api/profile/me')
    expect(match?.route.key).toBe('GET /profile/me')
    expect(match?.route.path).toBe('/api/profile/me')
  })

  it('decodes params and respects the method', () => {
    const routes = compileFixtureRoutes([['GET /api/tags/:name', fx('GET', '/api/tags/:name', {})]])
    expect(matchFixtureRoute(routes, 'GET', '/api/tags/a%20b')?.params).toEqual({ name: 'a b' })
    expect(matchFixtureRoute(routes, 'POST', '/api/tags/x')).toBeUndefined()
  })
})

describe('fixtureResponse / unmatchedFixtureResponse', () => {
  const list = fx('GET', '/api/posts', [{ id: 1 }])
  it('serves success, empty, error and unauthorized bodies', () => {
    expect(fixtureResponse(list, 'GET', { state: 'success' })).toEqual({
      status: 200,
      body: [{ id: 1 }],
    })
    expect(fixtureResponse(list, 'GET', { state: 'empty' })).toEqual({ status: 200, body: [] })
    expect(fixtureResponse(list, 'GET', { state: 'error' }).status).toBe(500)
    expect(fixtureResponse(list, 'GET', { state: 'unauthorized' })).toEqual({
      status: 401,
      body: { error: 'Unauthorized' },
    })
  })

  it('answers DELETE with a bodiless 204 and POST with 201', () => {
    expect(
      fixtureResponse(fx('DELETE', '/api/x/:id', null), 'DELETE', { state: 'success' }),
    ).toEqual({ status: 204, body: null })
    expect(
      fixtureResponse(fx('POST', '/api/x', { id: 1 }), 'POST', { state: 'success' }).status,
    ).toBe(201)
  })

  it('serves an empty success for unmatched routes', () => {
    expect(unmatchedFixtureResponse('GET', undefined)).toEqual({ status: 200, body: [] })
    expect(unmatchedFixtureResponse('DELETE', undefined)).toEqual({ status: 204, body: null })
    expect(unmatchedFixtureResponse('PATCH', undefined)).toEqual({ status: 200, body: {} })
    expect(unmatchedFixtureResponse('GET', { state: 'error' }).status).toBe(500)
  })
})

describe('serializeFixtureSet', () => {
  it('keeps order and only the fields the router reads, and round-trips through JSON', () => {
    const full = {
      ...fx('GET', '/api/posts', [{ id: 1 }]),
      endpoint: {
        method: 'GET' as const,
        path: '/api/posts',
        requiresAuth: true,
        responseHints: { isList: true },
      },
    }
    const out = serializeFixtureSet({
      appType: 'blog',
      endpoints: new Map([['GET /api/posts', full]]),
    })
    expect(out.endpoints[0][1].endpoint).toEqual({ method: 'GET', path: '/api/posts' })
    const back = JSON.parse(JSON.stringify(out))
    const routes = compileFixtureRoutes(back.endpoints as Array<[string, RoutableFixture]>)
    expect(matchFixtureRoute(routes, 'GET', '/api/posts')?.route.fixture.successResponse).toEqual([
      { id: 1 },
    ])
  })
})
