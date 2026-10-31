import { afterEach, describe, expect, it, vi } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import {
  createConsoleLoggerProvider,
  createRemoteTransport,
  defaultFormat,
  type LogEntry,
  setProvider,
} from '@molecule/app-logger'

import { isHttpError } from '../../../http/src/index.js'
import { createJWTAuthClient } from '../index.js'
import type { AuthError, UserProfile } from '../types.js'

const errorsFrom = (caught: unknown): Record<string, string[]> | null => {
  if (isHttpError(caught)) {
    const body = caught.response?.data as { errors?: Record<string, string[]> } | undefined
    if (body?.errors) return body.errors
    return { unknown: [caught.message] }
  }
  return null
}

const rejectedLogin = async (answer: Response | Error): Promise<unknown> => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer))),
  )
  return createJWTAuthClient()
    .login({ email: 'alice@example.com', password: 'wrong' })
    .catch((error: unknown) => error)
}

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => {
  setProvider(createConsoleLoggerProvider('silent'))
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('app-auth and app-http failed-request compatibility', () => {
  it('reads an auth 422 through errorsFrom without losing the I18nError contract', async () => {
    const sent = { errors: { credentials: ['is invalid'] } }
    const error = await rejectedLogin(jsonResponse(sent, 422))

    expect(error).toBeInstanceOf(I18nError)
    expect((error as I18nError).i18nKey).toBe('auth.error.requestFailed')
    expect((error as AuthError).status).toBe(422)
    expect((error as AuthError).body).toStrictEqual(sent)
    expect(isHttpError(error)).toBe(true)
    if (isHttpError(error)) expect(error.response?.status).toBe(422)
    expect(errorsFrom(error)).toStrictEqual(sent.errors)
  })

  it('exposes a non-JSON body through the same response.data fallback', async () => {
    const error = await rejectedLogin(
      new Response('<html>Bad Gateway</html>', {
        status: 502,
        headers: { 'content-type': 'text/html' },
      }),
    )

    expect(error).toBeInstanceOf(I18nError)
    expect((error as AuthError).body).toStrictEqual({})
    expect(isHttpError(error)).toBe(true)
    expect(errorsFrom(error)).toStrictEqual({ unknown: ['Request failed'] })
    if (isHttpError(error)) expect(error.response?.data).toStrictEqual({})
  })

  it('never sends refresh credentials through the warning or remote logging transport', async () => {
    const refreshToken = 'refresh-token-secret-r2'
    const accessToken = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })),
      btoa('access-token-secret-r2'),
    ].join('.')
    const values = new Map<string, string>([
      ['molecule:auth:accessToken', accessToken],
      ['molecule:auth:refreshToken', refreshToken],
      ['molecule:auth:user', JSON.stringify({ id: 'u1', email: 'alice@example.com' })],
    ])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    }
    const remotePayloads: string[] = []
    const mockFetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === 'https://logs.example.test/entries') {
        remotePayloads.push(String(init?.body))
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      expect(String(input)).toBe('/auth/refresh')
      expect(init?.body).toBe(JSON.stringify({ refreshToken }))
      return Promise.resolve(jsonResponse({ error: 'Refresh unavailable' }, 503))
    })
    vi.stubGlobal('fetch', mockFetch)
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const entries: LogEntry[] = []
    const provider = createConsoleLoggerProvider('warn')
    provider.addTransport((entry) => entries.push(entry))
    provider.addTransport(
      createRemoteTransport({ url: 'https://logs.example.test/entries', batchSize: 1 }),
    )
    setProvider(provider)

    const client = createJWTAuthClient({ storage, autoRefresh: false })
    await client.initialize()

    const warning = entries.find((entry) =>
      entry.message.startsWith('Initial token refresh failed'),
    )
    expect(warning).toBeDefined()
    const error = warning?.args[0] as AuthError
    expect(error.status).toBe(503)
    expect(error.body).toStrictEqual({ error: 'Refresh unavailable' })
    expect(remotePayloads).toHaveLength(1)

    const serialized = [
      JSON.stringify(error),
      JSON.stringify(warning),
      defaultFormat(warning!),
      ...remotePayloads,
    ]
    for (const output of serialized) {
      expect(output).not.toContain(refreshToken)
      expect(output).not.toContain(accessToken)
      expect(output).not.toContain('access-token-secret-r2')
    }
    client.destroy()
  })

  const credentialRequests: Array<{
    name: string
    secret: string
    run: (client: ReturnType<typeof createJWTAuthClient>) => Promise<unknown>
  }> = [
    {
      name: 'login and two-factor',
      secret: 'login-password-secret',
      run: (client) =>
        client.login({
          email: 'alice@example.com',
          password: 'login-password-secret',
          twoFactorToken: 'two-factor-secret',
        }),
    },
    {
      name: 'registration',
      secret: 'registration-password-secret',
      run: (client) =>
        client.register({ email: 'alice@example.com', password: 'registration-password-secret' }),
    },
    {
      name: 'refresh',
      secret: 'refresh-token-secret',
      run: (client) => client.refresh(),
    },
    {
      name: 'password-reset request',
      secret: 'reset-request-secret',
      run: (client) => client.requestPasswordReset({ email: 'reset-request-secret' }),
    },
    {
      name: 'password-reset confirmation',
      secret: 'reset-token-secret',
      run: (client) =>
        client.confirmPasswordReset({
          token: 'reset-token-secret',
          password: 'new-password-secret',
        }),
    },
    {
      name: 'password change',
      secret: 'old-password-secret',
      run: (client) => client.changePassword('old-password-secret', 'new-password-secret'),
    },
    {
      name: 'profile update',
      secret: 'profile-request-secret',
      run: (client) => client.updateProfile({ name: 'profile-request-secret' }),
    },
  ]

  it.each(credentialRequests)(
    'omits request credentials from a $name rejection',
    async (request) => {
      const accessToken = 'access-token-secret'
      const refreshToken = 'refresh-token-secret'
      const cookieSecret = 'response-cookie-secret'
      vi.stubGlobal(
        'fetch',
        vi.fn(() =>
          Promise.resolve(
            new Response(JSON.stringify({ error: 'Request unavailable' }), {
              status: 503,
              headers: {
                'content-type': 'application/json',
                'set-cookie': `session=${cookieSecret}; HttpOnly`,
              },
            }),
          ),
        ),
      )
      const client = createJWTAuthClient({ autoRefresh: false })
      client.setSession({
        accessToken,
        refreshToken,
        user: { id: 'u1', email: 'alice@example.com' },
      })

      const error = await request.run(client).catch((caught: unknown) => caught)

      if (!isHttpError(error)) throw new Error('Expected the non-OK response to be an HTTP error')
      const authError = error as AuthError
      expect(error.response?.status).toBe(503)
      expect(error.response?.data).toStrictEqual({ error: 'Request unavailable' })
      expect(authError.body).toStrictEqual({ error: 'Request unavailable' })
      expect(error.response?.config).not.toHaveProperty('data')
      expect(error.response?.config).not.toHaveProperty('headers')
      expect(error.response?.headers).not.toHaveProperty('set-cookie')
      const serialized = JSON.stringify(error)
      for (const secret of [
        request.secret,
        accessToken,
        refreshToken,
        cookieSecret,
        'two-factor-secret',
        'new-password-secret',
      ]) {
        expect(serialized).not.toContain(secret)
      }
      client.destroy()
    },
  )

  it('leaves a network rejection unbranded instead of inventing an HTTP response', async () => {
    const network = new TypeError('fetch failed')
    const error = await rejectedLogin(network)

    expect(error).toBe(network)
    expect(isHttpError(error)).toBe(false)
    expect((error as AuthError).body).toBeUndefined()
  })

  it('still clears a stored session when validation answers 401', async () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    }
    const token = [
      btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
      btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
      btoa('signature'),
    ].join('.')
    const user: UserProfile = { id: 'u1', email: 'alice@example.com' }
    const client = createJWTAuthClient({ storage })
    client.setAccessToken(token)
    client.setUser(user)
    await client.initialize()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse({}, 401))),
    )

    await client.validateSession()

    expect(client.getState().status).toBe('unauthenticated')
    expect(client.getAccessToken()).toBeNull()
    expect(client.getUser()).toBeNull()
  })
})
