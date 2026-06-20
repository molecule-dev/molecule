import type { AxiosError, AxiosHeaderValue, AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'

import { sanitizeRequestOptions, toHttpError, toHttpResponse } from '../utilities.js'

function makeAxiosResponse<T>(
  status: number,
  data: T,
  headers: Record<string, AxiosHeaderValue> = {},
): AxiosResponse<T> {
  return {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    data,
    headers,
    config: {} as AxiosResponse<T>['config'],
  } as AxiosResponse<T>
}

const REQUEST_OPTIONS = { url: '/api/x', method: 'GET' as const }

describe('toHttpResponse', () => {
  it('copies status, statusText, data into the HttpResponse', () => {
    const out = toHttpResponse(makeAxiosResponse(201, { id: 1 }), REQUEST_OPTIONS)
    expect(out.status).toBe(201)
    expect(out.statusText).toBe('Error') // matches make-helper logic
    expect(out.data).toEqual({ id: 1 })
  })

  it('preserves the request options on the response', () => {
    const out = toHttpResponse(makeAxiosResponse(200, {}), REQUEST_OPTIONS)
    expect(out.request).toEqual(REQUEST_OPTIONS)
  })

  it('copies string headers into the headers map', () => {
    const out = toHttpResponse(
      makeAxiosResponse(200, {}, { 'content-type': 'application/json' }),
      REQUEST_OPTIONS,
    )
    expect(out.headers['content-type']).toBe('application/json')
  })

  it('joins array headers with ", " (multi-valued Set-Cookie etc.)', () => {
    const out = toHttpResponse(
      makeAxiosResponse(200, {}, { 'set-cookie': ['a=1', 'b=2'] }),
      REQUEST_OPTIONS,
    )
    expect(out.headers['set-cookie']).toBe('a=1, b=2')
  })

  it('skips non-string, non-array header values (numbers, booleans, etc.)', () => {
    const out = toHttpResponse(
      makeAxiosResponse(
        200,
        {},
        {
          'content-length': 42 as unknown as AxiosHeaderValue,
          'x-foo': 'bar',
        },
      ),
      REQUEST_OPTIONS,
    )
    expect(out.headers['x-foo']).toBe('bar')
    expect('content-length' in out.headers).toBe(false)
  })

  it('handles empty headers object', () => {
    const out = toHttpResponse(makeAxiosResponse(200, {}), REQUEST_OPTIONS)
    expect(out.headers).toEqual({})
  })
})

describe('toHttpError', () => {
  function makeAxiosError(overrides: Partial<AxiosError> = {}): AxiosError {
    return Object.assign(new Error(overrides.message ?? 'boom'), {
      isAxiosError: true,
      ...overrides,
    }) as AxiosError
  }

  it('returns an Error with .message copied from axios error', () => {
    const out = toHttpError(makeAxiosError({ message: 'network down' }), REQUEST_OPTIONS)
    expect(out).toBeInstanceOf(Error)
    expect(out.message).toBe('network down')
  })

  it('attaches the request options to the error', () => {
    const out = toHttpError(makeAxiosError(), REQUEST_OPTIONS)
    expect(out.request).toEqual(REQUEST_OPTIONS)
  })

  it('copies the axios error code', () => {
    const out = toHttpError(makeAxiosError({ code: 'ENOTFOUND' }), REQUEST_OPTIONS)
    expect(out.code).toBe('ENOTFOUND')
  })

  it('sets isAborted=true when code is ERR_CANCELED', () => {
    const out = toHttpError(makeAxiosError({ code: 'ERR_CANCELED' }), REQUEST_OPTIONS)
    expect(out.isAborted).toBe(true)
    expect(out.isTimeout).toBe(false)
  })

  it('sets isTimeout=true when code is ECONNABORTED', () => {
    const out = toHttpError(makeAxiosError({ code: 'ECONNABORTED' }), REQUEST_OPTIONS)
    expect(out.isTimeout).toBe(true)
    expect(out.isAborted).toBe(false)
  })

  it('sets both flags false for unrelated codes', () => {
    const out = toHttpError(makeAxiosError({ code: 'ENOTFOUND' }), REQUEST_OPTIONS)
    expect(out.isAborted).toBe(false)
    expect(out.isTimeout).toBe(false)
  })

  it('attaches the converted response when present (e.g. 4xx/5xx)', () => {
    const axiosErr = makeAxiosError({
      code: 'ERR_BAD_RESPONSE',
      response: makeAxiosResponse(
        500,
        { error: 'server down' },
        {
          'content-type': 'application/json',
        },
      ),
    } as Partial<AxiosError>)
    const out = toHttpError(axiosErr, REQUEST_OPTIONS)
    expect(out.response?.status).toBe(500)
    expect(out.response?.data).toEqual({ error: 'server down' })
    expect(out.response?.headers['content-type']).toBe('application/json')
  })

  it('leaves response undefined when there is no error.response (network failure)', () => {
    const out = toHttpError(makeAxiosError({ code: 'ENOTFOUND' }), REQUEST_OPTIONS)
    expect(out.response).toBeUndefined()
  })

  it('redacts the request body and authorization header on the attached request (CWE-532)', () => {
    const secretRequest = {
      url: 'https://github.com/login/oauth/access_token',
      method: 'POST' as const,
      body: { client_secret: 'SUPER_SECRET_VALUE', code: 'auth-code-123' },
      headers: {
        accept: 'application/json',
        authorization: 'Basic dXNlcjpTVVBFUl9TRUNSRVQ=',
      },
    }
    const out = toHttpError(
      makeAxiosError({
        message: 'Request failed with status code 400',
        response: makeAxiosResponse(400, { error: 'invalid_grant' }),
      } as Partial<AxiosError>),
      secretRequest,
    )

    // Body is masked, authorization header is masked, non-secret fields kept.
    expect(out.request.body).toBe('[REDACTED]')
    expect(out.request.headers?.authorization).toBe('[REDACTED]')
    expect(out.request.headers?.accept).toBe('application/json')
    expect(out.request.url).toBe(secretRequest.url)
    expect(out.request.method).toBe('POST')

    // The nested response.request must be redacted too.
    expect(out.response?.request.body).toBe('[REDACTED]')
    expect(out.response?.request.headers?.authorization).toBe('[REDACTED]')

    // No secret may appear anywhere in the serialized error (util.inspect would
    // walk these own-enumerable props when the error is logged).
    const serialized = JSON.stringify({
      message: out.message,
      request: out.request,
      response: out.response,
    })
    expect(serialized).not.toContain('SUPER_SECRET_VALUE')
    expect(serialized).not.toContain('dXNlcjpTVVBFUl9TRUNSRVQ=')

    // The original caller object must NOT be mutated (defensive copy).
    expect(secretRequest.body).toEqual({
      client_secret: 'SUPER_SECRET_VALUE',
      code: 'auth-code-123',
    })
    expect(secretRequest.headers.authorization).toBe('Basic dXNlcjpTVVBFUl9TRUNSRVQ=')
  })

  it('masks an uppercase Authorization header too (Twitter Basic auth)', () => {
    const out = toHttpError(makeAxiosError(), {
      url: 'https://api.twitter.com/2/oauth2/token',
      method: 'POST',
      headers: { Authorization: 'Basic abc123', accept: 'application/json' },
    })
    expect(out.request.headers?.Authorization).toBe('[REDACTED]')
    expect(out.request.headers?.accept).toBe('application/json')
  })
})

describe('sanitizeRequestOptions', () => {
  it('returns an equivalent copy when there is nothing sensitive to redact', () => {
    const input = { url: '/api/x', method: 'GET' as const, params: { page: 1 } }
    const out = sanitizeRequestOptions(input)
    expect(out).toEqual(input)
    expect(out).not.toBe(input)
  })

  it('leaves a body-less request unchanged', () => {
    const input = { url: '/api/x', method: 'GET' as const, headers: { accept: 'application/json' } }
    const out = sanitizeRequestOptions(input)
    expect(out.headers?.accept).toBe('application/json')
    expect('body' in out).toBe(false)
  })
})
