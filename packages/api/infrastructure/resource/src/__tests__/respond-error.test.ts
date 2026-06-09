import { describe, expect, it, vi } from 'vitest'

// respond-error.ts calls getLogger() at module load — stub it to a noop logger.
vi.mock('@molecule/api-bond', () => ({
  getLogger: () => ({
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
  }),
}))

import { respondError } from '../respond-error.js'

/** Minimal MoleculeResponse double capturing the last status + JSON body. */
function fakeRes() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
    },
  }
}

describe('respondError', () => {
  const fallback = { status: 500, message: 'Failed', errorKey: 'x.failed' }

  it('surfaces a tagged config error with its real status + errorKey (the missing-key → 503 path)', () => {
    const res = fakeRes()
    const err = Object.assign(new Error('STRIPE_SECRET_KEY is not set.'), {
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    respondError(res as never, err, fallback)
    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({
      error: 'STRIPE_SECRET_KEY is not set.',
      errorKey: 'config.notConfigured',
    })
  })

  it('falls back to the generic status/message/errorKey for a plain error', () => {
    const res = fakeRes()
    respondError(res as never, new Error('boom'), fallback)
    expect(res.statusCode).toBe(500)
    expect(res.body).toEqual({ error: 'Failed', errorKey: 'x.failed' })
  })

  it('does NOT surface a statusCode without an errorKey (arbitrary library errors stay on fallback)', () => {
    const res = fakeRes()
    // e.g. an AWS SDK error carrying `.statusCode` but no molecule errorKey.
    respondError(res as never, Object.assign(new Error('S3 403'), { statusCode: 403 }), fallback)
    expect(res.statusCode).toBe(500)
    expect(res.body).toEqual({ error: 'Failed', errorKey: 'x.failed' })
  })

  it('uses the fallback message when a tagged error has no string message', () => {
    const res = fakeRes()
    respondError(res as never, { statusCode: 503, errorKey: 'config.notConfigured' }, fallback)
    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: 'Failed', errorKey: 'config.notConfigured' })
  })
})
