import type { AxiosError, AxiosHeaderValue, AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'

import { toHttpError, toHttpResponse } from '../utilities.js'

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
})
