/**
 * A non-ok answer keeps the API's WHOLE error body.
 *
 * The observed failure (xr-molecule-flash-m380, +23m): a RealWorld API answered
 * HTTP 401 `{"errors":{"credentials":["is invalid"]}}` and `client.login()`
 * rejected with `I18nError: Request failed`, keeping only the HTTP status. The
 * page therefore had no way to render the server's own field error without
 * re-implementing the login request.
 *
 * These tests drive the public `login()` transport (a real `Response`, so
 * `ok`/`status`/`json()` behave as in the browser) and assert the parsed body
 * survives exactly — nested maps, arrays, and the ordinary `errorKey`/`error`/
 * `message` shapes — while the existing key, message, status and rejection
 * contract is unchanged.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nError } from '@molecule/app-i18n'

import { createJWTAuthClient } from '../index.js'
import type { AuthError } from '../types.js'

/** A real `Response` — the same `ok`/`status`/`json()` path the browser takes. */
const response = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

/** Run a real `login()` against one stubbed answer, returning the rejection. */
const rejectedLogin = async (
  answer: Response | (() => Promise<never>),
): Promise<{ error: unknown; client: ReturnType<typeof createJWTAuthClient> }> => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (answer instanceof Response ? Promise.resolve(answer) : answer())),
  )
  const client = createJWTAuthClient()
  const error = await client
    .login({ email: 'alice@example.com', password: 'wrong' })
    .catch((e) => e)
  return { error, client }
}

/** The parsed body the client preserved on the rejection. */
const bodyOf = (error: unknown): unknown => (error as AuthError).body

/** Narrow a caught rejection to its `I18nError` for message assertions. */
const asI18n = (caught: unknown): I18nError => caught as I18nError

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('@molecule/app-auth keeps the API error body on a rejected call (xr-molecule-flash-m380)', () => {
  it('keeps a nested `errors` map exactly as the API sent it', async () => {
    const sent = { errors: { credentials: ['is invalid'] } }
    const { error } = await rejectedLogin(response(sent, 401))

    expect(error).toBeInstanceOf(I18nError)
    // The existing contract is unchanged: default key, default message, status.
    expect((error as I18nError).i18nKey).toBe('auth.error.requestFailed')
    expect((error as I18nError).message).toBe('Request failed')
    expect((error as AuthError).status).toBe(401)
    // …and the data the client received is now preserved whole.
    expect(bodyOf(error)).toStrictEqual(sent)
  })

  it('keeps nested maps and arrays the client does not map into the message', async () => {
    const sent = {
      errors: {
        email: ['is invalid', 'is too short'],
        profile: { name: ['is required'], links: [{ url: 'not a url' }] },
      },
      meta: { requestId: 'req-123', retryable: false },
    }
    const { error } = await rejectedLogin(response(sent, 422))

    expect((error as AuthError).status).toBe(422)
    expect(bodyOf(error)).toStrictEqual(sent)
  })

  it('keeps every field of an ordinary errorKey/error/message shape', async () => {
    const sent = {
      errorKey: 'auth.error.invalidCredentials',
      error: 'Bad password',
      message: 'Credentials were rejected',
      details: ['password', 'email'],
    }
    const { error } = await rejectedLogin(response(sent, 401))

    expect((error as I18nError).i18nKey).toBe('auth.error.invalidCredentials')
    expect((error as I18nError).message).toBe('Bad password')
    expect((error as AuthError).status).toBe(401)
    expect(bodyOf(error)).toStrictEqual(sent)
  })

  it('keeps a message-only body and a top-level array body', async () => {
    const messageOnly = { message: 'Account locked' }
    const first = await rejectedLogin(response(messageOnly, 403))
    expect(asI18n(first.error).message).toBe('Account locked')
    expect(bodyOf(first.error)).toStrictEqual(messageOnly)

    const arrayBody = [{ message: 'email is invalid' }, { message: 'password is too short' }]
    const second = await rejectedLogin(response(arrayBody, 400))
    expect(asI18n(second.error).i18nKey).toBe('auth.error.requestFailed')
    expect(bodyOf(second.error)).toStrictEqual(arrayBody)
  })

  it('keeps the status and body of a 5xx answer', async () => {
    const sent = { error: 'upstream exploded', attempt: 2 }
    const { error } = await rejectedLogin(response(sent, 500))

    expect((error as AuthError).status).toBe(500)
    expect((error as I18nError).message).toBe('upstream exploded')
    expect(bodyOf(error)).toStrictEqual(sent)
  })

  it.each([null, 42, true, 'failure'])(
    'preserves a scalar body (%j) with a safe default message',
    async (sent) => {
      const { error } = await rejectedLogin(response(sent, 400))

      expect(error).toBeInstanceOf(I18nError)
      expect(asI18n(error).i18nKey).toBe('auth.error.requestFailed')
      expect(asI18n(error).message).toBe('Request failed')
      expect((error as AuthError).status).toBe(400)
      expect(bodyOf(error)).toStrictEqual(sent)
    },
  )

  it('only maps string fields into a translation key or message', async () => {
    const sent = { errorKey: { key: 'invalid' }, error: ['invalid'], message: 'Validation failed' }
    const { error } = await rejectedLogin(response(sent, 422))

    expect(asI18n(error).i18nKey).toBe('auth.error.requestFailed')
    expect(asI18n(error).message).toBe('Validation failed')
    expect(bodyOf(error)).toStrictEqual(sent)

    const numericFields = { errorKey: 42, error: 0, message: false }
    const second = await rejectedLogin(response(numericFields, 400))
    expect(asI18n(second.error).i18nKey).toBe('auth.error.requestFailed')
    expect(asI18n(second.error).message).toBe('Request failed')
    expect(bodyOf(second.error)).toStrictEqual(numericFields)
  })

  it('rejects a non-JSON body exactly as before: `{}`, default message, same status', async () => {
    const { error } = await rejectedLogin(
      new Response('<html>502 Bad Gateway</html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      }),
    )

    expect(error).toBeInstanceOf(I18nError)
    expect((error as I18nError).i18nKey).toBe('auth.error.requestFailed')
    expect((error as I18nError).message).toBe('Request failed')
    expect((error as AuthError).status).toBe(502)
    expect(bodyOf(error)).toStrictEqual({})
  })

  it('leaves a network failure as the original error — no I18nError, no fabricated body', async () => {
    const network = new TypeError('fetch failed')
    const { error } = await rejectedLogin(() => Promise.reject(network))

    expect(error).toBe(network)
    expect(error).not.toBeInstanceOf(I18nError)
    expect((error as AuthError).body).toBeUndefined()
  })
})

describe('the error-body contract is on the surface an app author reads', () => {
  it('documents the preserved body in the module JSDoc and the generated README', () => {
    const packageDir = join(__dirname, '../..')
    const source = readFileSync(join(packageDir, 'src/index.ts'), 'utf8')
    const readme = readFileSync(join(packageDir, 'README.md'), 'utf8')

    for (const doc of [source, readme]) {
      expect(doc).toContain("A rejected call keeps the API's error body")
      expect(doc).toContain('nested maps and arrays included')
    }
    expect(readme).toContain('The response body parsed from JSON, exactly as the API sent it')
  })
})
