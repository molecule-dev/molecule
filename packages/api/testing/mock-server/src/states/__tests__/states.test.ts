import { describe, expect, it } from 'vitest'

import { DEFAULT_STATES, getResponseBody, getStatusCode, parseState } from '../states.js'

const FIXTURE = {
  successResponse: { data: 'ok' },
  emptyResponse: { data: [] },
  errorResponse: { error: 'Server error' },
}

describe('DEFAULT_STATES', () => {
  it('exposes the four canonical states', () => {
    expect(DEFAULT_STATES.success.state).toBe('success')
    expect(DEFAULT_STATES.empty.state).toBe('empty')
    expect(DEFAULT_STATES.error.state).toBe('error')
    expect(DEFAULT_STATES.unauthorized.state).toBe('unauthorized')
  })

  it('error state defaults to 500; unauthorized to 401', () => {
    expect(DEFAULT_STATES.error.statusCode).toBe(500)
    expect(DEFAULT_STATES.unauthorized.statusCode).toBe(401)
  })
})

describe('getStatusCode', () => {
  it('returns explicit statusCode when set on state', () => {
    expect(getStatusCode({ state: 'success', statusCode: 418 }, 'GET')).toBe(418)
  })

  it('success: POST → 201, DELETE → 204, others → 200', () => {
    expect(getStatusCode({ state: 'success' }, 'POST')).toBe(201)
    expect(getStatusCode({ state: 'success' }, 'DELETE')).toBe(204)
    expect(getStatusCode({ state: 'success' }, 'GET')).toBe(200)
    expect(getStatusCode({ state: 'success' }, 'PUT')).toBe(200)
  })

  it('empty → 200 regardless of method', () => {
    expect(getStatusCode({ state: 'empty' }, 'GET')).toBe(200)
    expect(getStatusCode({ state: 'empty' }, 'POST')).toBe(200)
    expect(getStatusCode({ state: 'empty' }, 'DELETE')).toBe(200)
  })

  it('error → 500 regardless of method (no explicit override)', () => {
    expect(getStatusCode({ state: 'error' }, 'GET')).toBe(500)
    expect(getStatusCode({ state: 'error' }, 'POST')).toBe(500)
  })

  it('unauthorized → 401', () => {
    expect(getStatusCode({ state: 'unauthorized' }, 'GET')).toBe(401)
  })

  it('explicit statusCode wins over state defaults (e.g. error with custom 503)', () => {
    expect(getStatusCode({ state: 'error', statusCode: 503 }, 'GET')).toBe(503)
  })
})

describe('getResponseBody', () => {
  it('success GET returns successResponse', () => {
    expect(getResponseBody({ state: 'success' }, 'GET', FIXTURE)).toEqual({ data: 'ok' })
  })

  it('success POST/PUT returns successResponse', () => {
    expect(getResponseBody({ state: 'success' }, 'POST', FIXTURE)).toEqual({ data: 'ok' })
    expect(getResponseBody({ state: 'success' }, 'PUT', FIXTURE)).toEqual({ data: 'ok' })
  })

  it('success DELETE returns null (matches 204 No Content)', () => {
    expect(getResponseBody({ state: 'success' }, 'DELETE', FIXTURE)).toBeNull()
  })

  it('empty returns emptyResponse', () => {
    expect(getResponseBody({ state: 'empty' }, 'GET', FIXTURE)).toEqual({ data: [] })
  })

  it('error returns errorResponse with the fixture error message', () => {
    expect(getResponseBody({ state: 'error' }, 'GET', FIXTURE)).toEqual({ error: 'Server error' })
  })

  it('unauthorized returns hardcoded { error: "Unauthorized" }', () => {
    expect(getResponseBody({ state: 'unauthorized' }, 'GET', FIXTURE)).toEqual({
      error: 'Unauthorized',
    })
  })
})

describe('parseState', () => {
  it('parses each canonical state string', () => {
    expect(parseState('success')).toBe(DEFAULT_STATES.success)
    expect(parseState('empty')).toBe(DEFAULT_STATES.empty)
    expect(parseState('error')).toBe(DEFAULT_STATES.error)
    expect(parseState('unauthorized')).toBe(DEFAULT_STATES.unauthorized)
  })

  it('is case-insensitive', () => {
    expect(parseState('SUCCESS')).toBe(DEFAULT_STATES.success)
    expect(parseState('Error')).toBe(DEFAULT_STATES.error)
    expect(parseState('UNAUTHORIZED')).toBe(DEFAULT_STATES.unauthorized)
  })

  it('trims whitespace before matching', () => {
    expect(parseState('  empty  ')).toBe(DEFAULT_STATES.empty)
  })

  it('defaults to success for unrecognized values', () => {
    expect(parseState('garbage')).toBe(DEFAULT_STATES.success)
    expect(parseState('')).toBe(DEFAULT_STATES.success)
  })
})
