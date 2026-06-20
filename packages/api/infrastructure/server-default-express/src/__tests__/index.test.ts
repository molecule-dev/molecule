import type express from 'express'
import { describe, expect, it, vi } from 'vitest'

import { classifyTaggedError, createServerFactory, errorMiddleware } from '../index.js'

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
