import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import {
  createConsoleLoggerProvider,
  defaultFormat,
  type LogEntry,
  setProvider,
} from '@molecule/app-logger'

import { createJWTAuthClient } from '../../../auth/src/index.js'
import { createFetchClient, HttpError, isAuthFailure, isHttpError, isNoResponse } from '../index.js'

const errorsFrom = (caught: unknown): Record<string, string[]> | null => {
  if (caught instanceof HttpError) {
    const body = caught.response?.data as { errors?: Record<string, string[]> } | undefined
    if (body?.errors) return body.errors
    return { unknown: [caught.message] }
  }
  return null
}

afterEach(() => {
  setProvider(createConsoleLoggerProvider('silent'))
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('app-http reads app-auth failures', () => {
  it('returns the server errors map from an auth-client 422', async () => {
    const sent = { errors: { credentials: ['is invalid'] } }
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify(sent), {
            status: 422,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    )

    const error = await createJWTAuthClient()
      .login({ email: 'alice@example.com', password: 'wrong' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(I18nError)
    expect((error as I18nError).i18nKey).toBe('auth.error.requestFailed')
    expect(isAuthFailure(error)).toBe(false)
    expect(errorsFrom(error)).toStrictEqual(sent.errors)
  })

  it('recognises a compatible branded failure without the local prototype', () => {
    const original = new HttpError('Unprocessable Entity', 422)
    const duplicate = Object.assign(new Error('Unprocessable Entity'), {
      status: 422,
      aborted: false,
    })
    Object.defineProperty(duplicate, Symbol.for('@molecule/app-http/HttpError'), { value: true })

    expect(Object.getOwnPropertySymbols(original)).toContain(
      Symbol.for('@molecule/app-http/HttpError'),
    )
    expect(duplicate).toBeInstanceOf(HttpError)
    expect(isHttpError(duplicate)).toBe(true)
  })

  it('does not classify an unbranded lookalike as an HTTP failure', () => {
    const lookalike = new I18nError('auth.error.requestFailed', undefined, 'Request failed')
    Object.assign(lookalike, { status: 422, response: { data: {} } })

    expect(isHttpError(lookalike)).toBe(false)
  })

  it('keeps request bodies and credentials out of its own serialized HttpError', async () => {
    const password = 'http-password-secret'
    const accessToken = 'http-access-token-secret'
    const cookieSecret = 'http-cookie-secret'
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Unavailable' }), {
            status: 503,
            headers: {
              'content-type': 'application/json',
              'set-cookie': `session=${cookieSecret}; HttpOnly`,
            },
          }),
        ),
      ),
    )

    const error = await createFetchClient({ retry: false })
      .post(
        '/auth/login',
        { email: 'alice@example.com', password },
        { headers: { Authorization: `Bearer ${accessToken}`, Cookie: `session=${cookieSecret}` } },
      )
      .catch((caught: unknown) => caught)

    if (!(error instanceof HttpError)) throw new Error('Expected an HttpError')
    expect(error.status).toBe(503)
    expect(error.response?.status).toBe(503)
    expect(error.response?.data).toStrictEqual({ error: 'Unavailable' })
    expect(error.config).not.toHaveProperty('data')
    expect(error.config).not.toHaveProperty('headers')
    expect(error.response?.config).not.toHaveProperty('data')
    expect(error.response?.config).not.toHaveProperty('headers')
    expect(error.response?.headers).not.toHaveProperty('set-cookie')

    const entry: LogEntry = {
      level: 'warn',
      message: 'HTTP error',
      args: [error],
      timestamp: new Date(),
    }
    for (const output of [JSON.stringify(error), JSON.stringify(entry), defaultFormat(entry)]) {
      expect(output).not.toContain(password)
      expect(output).not.toContain(accessToken)
      expect(output).not.toContain(cookieSecret)
    }
  })

  it('sanitizes request config on a network failure without inventing a response', async () => {
    const password = 'network-password-secret'
    const accessToken = 'network-access-token-secret'
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const error = await createFetchClient({ retry: false })
      .post('/auth/login', { password }, { headers: { Authorization: `Bearer ${accessToken}` } })
      .catch((caught: unknown) => caught)

    if (!(error instanceof HttpError)) throw new Error('Expected an HttpError')
    expect(error.status).toBe(0)
    expect(isNoResponse(error)).toBe(true)
    expect(error.response).toBeUndefined()
    expect(error.config).not.toHaveProperty('data')
    expect(error.config).not.toHaveProperty('headers')
    expect(JSON.stringify(error)).not.toContain(password)
    expect(JSON.stringify(error)).not.toContain(accessToken)
  })

  it('keeps a network status 0 distinct from credential rejection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    )

    const error = await createFetchClient()
      .get('/test')
      .catch((caught: unknown) => caught)

    if (!isHttpError(error)) throw new Error('Expected the network failure to be an HttpError')
    expect(error.status).toBe(0)
    expect(isNoResponse(error)).toBe(true)
    expect(isAuthFailure(error)).toBe(false)
  })
})
