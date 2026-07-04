/**
 * Route-mounter authorization regression ([M3-1]).
 *
 * The generated-app fleet wires its user routes through these mounters, so an
 * authorization gap here ships to every flagship template. This pins that the
 * payment-verification mounter gates BOTH verbs with `authSelf` — the fix that
 * had landed on the declarative route table + the live platform but not here,
 * leaving GET /users/:id/verify-payment anonymously reachable cross-user.
 *
 * @module
 */

import type { Router } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { mountDefaultUserOAuthLoginRoute, mountDefaultUserVerifyPaymentRoutes } from '../routes.js'

type UserArg = Parameters<typeof mountDefaultUserVerifyPaymentRoutes>[1]

/** A router that records every (method, path, handlers) registration. */
function fakeRouter(): {
  router: Router
  calls: { method: string; path: string; handlers: unknown[] }[]
} {
  const calls: { method: string; path: string; handlers: unknown[] }[] = []
  const record =
    (method: string) =>
    (path: string, ...handlers: unknown[]) => {
      calls.push({ method, path, handlers })
    }
  return { router: { get: record('get'), post: record('post') } as unknown as Router, calls }
}

describe('mountDefaultUserVerifyPaymentRoutes (M3-1)', () => {
  it('gates BOTH GET and POST verify-payment with authSelf before verifyPayment', () => {
    const authSelf = vi.fn()
    const verifyPayment = vi.fn()
    const { router, calls } = fakeRouter()

    mountDefaultUserVerifyPaymentRoutes(router, { authSelf, verifyPayment } as unknown as UserArg)

    const get = calls.find((c) => c.method === 'get' && c.path.includes('verify-payment'))
    const post = calls.find((c) => c.method === 'post' && c.path.includes('verify-payment'))
    // The GET route used to be `(verifyPayment)` with no authSelf — the M3-1 gap.
    expect(get?.handlers).toEqual([authSelf, verifyPayment])
    expect(post?.handlers).toEqual([authSelf, verifyPayment])
  })

  it('mounts nothing when verifyPayment is not provided', () => {
    const { router, calls } = fakeRouter()
    mountDefaultUserVerifyPaymentRoutes(router, { authSelf: vi.fn() } as unknown as UserArg)
    expect(calls).toHaveLength(0)
  })
})

describe('mountDefaultUserOAuthLoginRoute — both halves of the flow', () => {
  it('mounts GET /users/oauth/:provider (initiation) AND rate-limited POST /users/log-in/oauth', () => {
    const oauthAuthorize = vi.fn()
    const logInOAuth = vi.fn()
    const rateLimitAuth = vi.fn()
    const { router, calls } = fakeRouter()

    mountDefaultUserOAuthLoginRoute(router, {
      oauthAuthorize,
      logInOAuth,
      rateLimitAuth,
    } as unknown as UserArg)

    // The initiation half — without it the oauth_state cookie logInOAuth
    // validates is never set, so every callback fails 403.
    const initiation = calls.find((c) => c.method === 'get' && c.path === '/users/oauth/:provider')
    expect(initiation?.handlers).toEqual([oauthAuthorize])

    const exchange = calls.find((c) => c.method === 'post' && c.path === '/users/log-in/oauth')
    expect(exchange?.handlers).toEqual([rateLimitAuth, logInOAuth])
  })

  it('still mounts the POST exchange for a legacy map without oauthAuthorize', () => {
    const logInOAuth = vi.fn()
    const rateLimitAuth = vi.fn()
    const { router, calls } = fakeRouter()

    mountDefaultUserOAuthLoginRoute(router, {
      logInOAuth,
      rateLimitAuth,
    } as unknown as UserArg)

    expect(calls.find((c) => c.method === 'get')).toBeUndefined()
    expect(calls.find((c) => c.method === 'post')?.handlers).toEqual([rateLimitAuth, logInOAuth])
  })

  it('mounts nothing when the map has no oauth handlers at all', () => {
    const { router, calls } = fakeRouter()
    mountDefaultUserOAuthLoginRoute(router, { rateLimitAuth: vi.fn() } as unknown as UserArg)
    expect(calls).toHaveLength(0)
  })
})
