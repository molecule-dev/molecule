import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nError } from '@molecule/app-i18n'

import { createJWTAuthClient } from '../../../auth/src/index.js'
import { createFetchClient, HttpError, isAuthFailure, isHttpError, isNoResponse } from '../index.js'

const errorsFrom = (caught: unknown): Record<string, string[]> | null => {
  if (isHttpError(caught)) {
    const body = caught.response?.data as { errors?: Record<string, string[]> } | undefined
    if (body?.errors) return body.errors
    return { unknown: [caught.message] }
  }
  return null
}

afterEach(() => {
  vi.unstubAllGlobals()
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

  it('recognises a brand across package copies, not an instanceof prototype', () => {
    const original = new HttpError('Unprocessable Entity', 422)
    const duplicate = new Error('Unprocessable Entity') as HttpError
    duplicate.status = 422
    Object.defineProperty(duplicate, Symbol.for('@molecule/app-http/HttpError'), { value: true })

    expect(Object.getOwnPropertySymbols(original)).toContain(
      Symbol.for('@molecule/app-http/HttpError'),
    )
    expect(duplicate).not.toBeInstanceOf(HttpError)
    expect(isHttpError(duplicate)).toBe(true)
  })

  it('does not classify an unbranded lookalike as an HTTP failure', () => {
    const lookalike = new I18nError('auth.error.requestFailed', undefined, 'Request failed')
    Object.assign(lookalike, { status: 422, response: { data: {} } })

    expect(isHttpError(lookalike)).toBe(false)
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
