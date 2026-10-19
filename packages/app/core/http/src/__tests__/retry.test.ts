import { describe, expect, it } from 'vitest'

import {
  DEFAULT_RETRY_OPTIONS,
  isIdempotentRequest,
  isTransientConnectionError,
  parseRetryAfter,
  retryDelayMs,
  shouldRetryRequest,
} from '../retry.js'

describe('isIdempotentRequest', () => {
  it('allows the idempotent verbs', () => {
    for (const method of ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'] as const) {
      expect(isIdempotentRequest(method, {})).toBe(true)
    }
  })

  it('never repeats a POST/PATCH without an Idempotency-Key', () => {
    expect(isIdempotentRequest('POST', {})).toBe(false)
    expect(isIdempotentRequest('PATCH', {})).toBe(false)
  })

  it('accepts a POST/PATCH that carries an Idempotency-Key in any case', () => {
    expect(isIdempotentRequest('POST', { 'Idempotency-Key': 'abc' })).toBe(true)
    expect(isIdempotentRequest('POST', { 'idempotency-key': 'abc' })).toBe(true)
  })
})

describe('isTransientConnectionError', () => {
  it('recognizes reset/refused/timeout shapes', () => {
    expect(isTransientConnectionError('read ECONNRESET')).toBe(true)
    expect(isTransientConnectionError('connect ECONNREFUSED 127.0.0.1:5432')).toBe(true)
    expect(isTransientConnectionError('socket hang up')).toBe(true)
    expect(isTransientConnectionError('fetch failed')).toBe(true)
  })

  it('does not treat an auth/config error as transient', () => {
    expect(isTransientConnectionError('self-signed certificate in certificate chain')).toBe(false)
    expect(isTransientConnectionError(undefined)).toBe(false)
  })
})

describe('shouldRetryRequest', () => {
  const base = { method: 'GET' as const, headers: {}, attempt: 0 }

  it('retries a transient status on an idempotent request', () => {
    for (const status of DEFAULT_RETRY_OPTIONS.retryStatuses) {
      expect(shouldRetryRequest({ ...base, status })).toBe(true)
    }
  })

  it('does not retry a 500 or a 404', () => {
    expect(shouldRetryRequest({ ...base, status: 500 })).toBe(false)
    expect(shouldRetryRequest({ ...base, status: 404 })).toBe(false)
  })

  it('retries a reset connection', () => {
    expect(shouldRetryRequest({ ...base, status: 0, errorMessage: 'read ECONNRESET' })).toBe(true)
  })

  it('never retries an aborted request', () => {
    expect(
      shouldRetryRequest({ ...base, status: 0, aborted: true, errorMessage: 'ECONNRESET' }),
    ).toBe(false)
  })

  it('stops at maxRetries', () => {
    expect(shouldRetryRequest({ ...base, status: 503, attempt: 2 })).toBe(false)
    expect(
      shouldRetryRequest({ ...base, status: 503, attempt: 1, options: { maxRetries: 2 } }),
    ).toBe(true)
  })

  it('honors a per-request disable and a custom status list', () => {
    expect(shouldRetryRequest({ ...base, status: 503, options: false })).toBe(false)
    expect(shouldRetryRequest({ ...base, status: 429, options: { retryStatuses: [429] } })).toBe(
      true,
    )
  })

  it('never retries a POST without an idempotency key', () => {
    expect(shouldRetryRequest({ ...base, method: 'POST', status: 503 })).toBe(false)
    expect(
      shouldRetryRequest({
        ...base,
        method: 'POST',
        headers: { 'idempotency-key': 'k' },
        status: 503,
      }),
    ).toBe(true)
  })
})

describe('Retry-After', () => {
  it('parses seconds', () => {
    expect(parseRetryAfter('2')).toBe(2_000)
    expect(parseRetryAfter(' 0 ')).toBe(0)
  })

  it('parses an HTTP date relative to now', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:03 GMT', now)).toBe(3_000)
    expect(parseRetryAfter('Wed, 31 Dec 2025 23:59:59 GMT', now)).toBe(0)
  })

  it('ignores absent or unparseable values', () => {
    expect(parseRetryAfter(undefined)).toBeUndefined()
    expect(parseRetryAfter('soon')).toBeUndefined()
  })

  it('lets Retry-After override exponential backoff', () => {
    expect(retryDelayMs('1', 0, undefined, () => 0)).toBe(1_000)
  })

  it('applies jittered exponential backoff, clamped to the max', () => {
    // Attempt 0: base 300 * 2^0 = 300, jitter in [0,300); max(150, …)
    expect(retryDelayMs(undefined, 0, undefined, () => 1)).toBe(300)
    expect(retryDelayMs(undefined, 2, undefined, () => 0)).toBe(150)
    expect(retryDelayMs(undefined, 10, undefined, () => 1)).toBe(DEFAULT_RETRY_OPTIONS.maxDelayMs)
  })
})
