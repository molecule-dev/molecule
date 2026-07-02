import http from 'node:http'
import type { AddressInfo } from 'node:net'

import type express from 'express'
import expressLib from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  classifyTaggedError,
  createServerFactory,
  errorMiddleware,
  securityHeadersMiddleware,
} from '../index.js'

/** Minimal Express `res` test double that records what the handler wrote. */
function makeRes() {
  const res = {
    headersSent: false,
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    sent: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
    send(payload: unknown) {
      this.sent = payload
      return this
    },
  }
  return res
}

describe('@molecule/api-server-default-express', () => {
  it('exports createServerFactory', () => {
    expect(typeof createServerFactory).toBe('function')
  })

  it('createServerFactory returns a function', () => {
    const create = createServerFactory({
      setupBonds: async () => {},
      runMigrations: async () => {},
      getRouter: async () => ({ router: {} as never }),
    })
    expect(typeof create).toBe('function')
  })
})

describe('securityHeadersMiddleware (L1-1 — browser-security baseline)', () => {
  /** `res` double that records every `setHeader` so we can assert the baseline. */
  function makeHeaderRes() {
    const headers: Record<string, string> = {}
    return {
      headers,
      setHeader(name: string, value: string) {
        headers[name] = value
      },
    }
  }

  it('sets the anti-clickjacking + nosniff + referrer baseline on every response', () => {
    const res = makeHeaderRes()
    const next = vi.fn()

    securityHeadersMiddleware(
      {} as express.Request,
      res as unknown as express.Response,
      next as unknown as express.NextFunction,
    )

    expect(res.headers['X-Content-Type-Options']).toBe('nosniff')
    expect(res.headers['X-Frame-Options']).toBe('DENY')
    expect(res.headers['Content-Security-Policy']).toBe("frame-ancestors 'none'")
    expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(res.headers['X-XSS-Protection']).toBe('0')
    expect(next).toHaveBeenCalledOnce()
  })

  it('gates HSTS to production so local plain-HTTP dev is not force-upgraded', () => {
    const prev = process.env.NODE_ENV

    process.env.NODE_ENV = 'development'
    const devRes = makeHeaderRes()
    securityHeadersMiddleware(
      {} as express.Request,
      devRes as unknown as express.Response,
      vi.fn() as unknown as express.NextFunction,
    )
    expect(devRes.headers['Strict-Transport-Security']).toBeUndefined()

    process.env.NODE_ENV = 'production'
    const prodRes = makeHeaderRes()
    securityHeadersMiddleware(
      {} as express.Request,
      prodRes as unknown as express.Response,
      vi.fn() as unknown as express.NextFunction,
    )
    expect(prodRes.headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains; preload',
    )

    process.env.NODE_ENV = prev
  })
})

describe('createServerFactory server (L1-1 — real /health response carries the headers)', () => {
  const servers: http.Server[] = []

  afterEach(() => {
    for (const s of servers.splice(0)) s.close()
    vi.restoreAllMocks()
  })

  it("a real /health response from the factory's server carries the security headers", async () => {
    // The factory builds an http.Server internally and starts listening on it,
    // but does NOT return it. Spy on http.createServer to capture that exact
    // server so we hit the real listener (not a re-wrapped copy) and can close
    // it afterward — no leaked listener.
    const realCreateServer = http.createServer.bind(http)
    const createSpy = vi
      .spyOn(http, 'createServer')
      .mockImplementation((...args: Parameters<typeof http.createServer>) => {
        const s = realCreateServer(...(args as Parameters<typeof realCreateServer>))
        servers.push(s)
        return s
      })

    const create = createServerFactory({
      setupBonds: async () => {},
      runMigrations: async () => {},
      // Empty router — /health is mounted by the factory itself.
      getRouter: async () => ({ router: expressLib.Router() }),
    })

    // Pass 0 for an ephemeral port; the factory listens on the captured server.
    await create(0)
    expect(createSpy).toHaveBeenCalled()
    const server = servers[0]
    // Wait until the captured server is actually listening, then read its port.
    if (!server.listening) {
      await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    }
    const { port } = server.address() as AddressInfo

    const headers = await new Promise<http.IncomingHttpHeaders>((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path: '/health' }, (res) => {
          res.resume()
          res.on('end', () => resolve(res.headers))
        })
        .on('error', reject)
    })

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['content-security-policy']).toBe("frame-ancestors 'none'")
  })
})

describe('classifyTaggedError', () => {
  it('maps a deliberately-tagged config error to its status + errorKey (the missing-key → 503 fix)', () => {
    const err = Object.assign(new Error('STRIPE_SECRET_KEY is not set.'), {
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    expect(classifyTaggedError(err)).toEqual({
      statusCode: 503,
      errorKey: 'config.notConfigured',
      message: 'STRIPE_SECRET_KEY is not set.',
    })
  })

  it('returns null for a plain Error (→ default 500 path, behavior unchanged)', () => {
    expect(classifyTaggedError(new Error('boom'))).toBeNull()
  })

  it('returns null when statusCode is present but errorKey is absent (so arbitrary library errors are NOT surfaced)', () => {
    // e.g. an AWS SDK error carrying `.statusCode` but no molecule `errorKey`.
    expect(classifyTaggedError(Object.assign(new Error('S3 403'), { statusCode: 403 }))).toBeNull()
  })

  it('returns null for non-object throws (bare strings, etc.)', () => {
    expect(classifyTaggedError('Unauthorized')).toBeNull()
    expect(classifyTaggedError(undefined)).toBeNull()
  })

  it('falls back to "Error" when the tagged error has no string message', () => {
    expect(classifyTaggedError({ statusCode: 503, errorKey: 'config.notConfigured' })).toEqual({
      statusCode: 503,
      errorKey: 'config.notConfigured',
      message: 'Error',
    })
  })
})

describe('errorMiddleware (terminal sanitizing handler — L1-1 stack-leak fix)', () => {
  const req = {} as express.Request

  it('EXPLOIT BLOCKED: an untagged error returns a generic 500 and never calls next() (no finalhandler fallthrough)', () => {
    // Build an error whose stack contains the kind of sensitive recon data that
    // Express's finalhandler would otherwise leak into the response body when
    // NODE_ENV !== 'production'.
    const leaky = new Error('connection to /home/app/db failed')
    leaky.stack =
      'Error: connection to /home/app/db failed\n    at Object.<anonymous> (/home/app/api/src/secret-handler.ts:42:13)'
    const res = makeRes()
    const next = vi.fn()

    errorMiddleware(leaky, req, res as unknown as express.Response, next)

    // Generic, opaque 500 — no stack, no paths, no error message echoed back.
    expect(res.statusCode).toBe(500)
    expect(res.body).toEqual({ error: 'Internal Server Error' })
    // The crux of the fix: control must NOT fall through to Express's
    // finalhandler, which is what leaks `err.stack` into the response.
    expect(next).not.toHaveBeenCalled()
    // The response body carries none of the sensitive stack/path detail.
    expect(JSON.stringify(res.body)).not.toContain('/home/app')
    expect(JSON.stringify(res.body)).not.toContain('secret-handler')
  })

  it('LEGIT PRESERVED: a bare "Unauthorized" string still maps to 401', () => {
    const res = makeRes()
    const next = vi.fn()

    errorMiddleware('Unauthorized', req, res as unknown as express.Response, next)

    expect(res.statusCode).toBe(401)
    expect(res.sent).toBe('Unauthorized')
    expect(next).not.toHaveBeenCalled()
  })

  it('LEGIT PRESERVED: the i18n-resolved "Unauthorized." (trailing period) still maps to 401', () => {
    const res = makeRes()
    const next = vi.fn()

    errorMiddleware('Unauthorized.', req, res as unknown as express.Response, next)

    expect(res.statusCode).toBe(401)
    expect(res.sent).toBe('Unauthorized.')
    expect(next).not.toHaveBeenCalled()
  })

  it('LEGIT PRESERVED: a deliberately-tagged molecule error surfaces its real status + errorKey', () => {
    const tagged = Object.assign(new Error('STRIPE_SECRET_KEY is not set.'), {
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    const res = makeRes()
    const next = vi.fn()

    errorMiddleware(tagged, req, res as unknown as express.Response, next)

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({
      error: 'STRIPE_SECRET_KEY is not set.',
      errorKey: 'config.notConfigured',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('does not write twice when headers are already sent', () => {
    const res = makeRes()
    res.headersSent = true
    const next = vi.fn()

    errorMiddleware(new Error('boom'), req, res as unknown as express.Response, next)

    expect(res.statusCode).toBeUndefined()
    expect(res.body).toBeUndefined()
    expect(next).not.toHaveBeenCalled()
  })
})

describe('errorMiddleware error tracking capture (untagged-only skip rules)', () => {
  const trackedReq = { method: 'POST', originalUrl: '/api/orders?draft=true' } as express.Request

  const mockTracker = {
    captureException: vi.fn().mockReturnValue('event-1'),
    captureMessage: vi.fn(),
  }

  beforeEach(async () => {
    mockTracker.captureException.mockClear()
    const { setProvider } = await import('@molecule/api-error-tracking')
    setProvider(mockTracker)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('error-tracking')
  })

  it('CAPTURED: an untagged error reaches the bonded tracker with request context', () => {
    const error = new Error('boom')
    errorMiddleware(error, trackedReq, makeRes() as unknown as express.Response, vi.fn())

    expect(mockTracker.captureException).toHaveBeenCalledWith(error, {
      tags: { source: 'express' },
      request: { method: 'POST', url: '/api/orders?draft=true' },
    })
  })

  it('SKIPPED: a tagged config-missing 503 is NOT captured (expected, user-actionable)', () => {
    const tagged = Object.assign(new Error('STRIPE_SECRET_KEY is not set.'), {
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    errorMiddleware(tagged, trackedReq, makeRes() as unknown as express.Response, vi.fn())

    expect(mockTracker.captureException).not.toHaveBeenCalled()
  })

  it('SKIPPED: a tagged 4xx is NOT captured', () => {
    const tagged = Object.assign(new Error('Plan limit reached.'), {
      statusCode: 402,
      errorKey: 'billing.limitReached',
    })
    errorMiddleware(tagged, trackedReq, makeRes() as unknown as express.Response, vi.fn())

    expect(mockTracker.captureException).not.toHaveBeenCalled()
  })

  it('SKIPPED: a bare "Unauthorized" string is NOT captured', () => {
    errorMiddleware('Unauthorized', trackedReq, makeRes() as unknown as express.Response, vi.fn())

    expect(mockTracker.captureException).not.toHaveBeenCalled()
  })

  it('never throws out of the terminal handler when no tracker is bonded (no-op contract)', async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('error-tracking')
    const res = makeRes()

    expect(() =>
      errorMiddleware(new Error('boom'), trackedReq, res as unknown as express.Response, vi.fn()),
    ).not.toThrow()
    expect(res.statusCode).toBe(500)
  })
})
