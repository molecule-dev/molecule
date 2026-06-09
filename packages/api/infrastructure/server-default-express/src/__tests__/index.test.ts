import { describe, expect, it } from 'vitest'

import { classifyTaggedError, createServerFactory } from '../index.js'

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
