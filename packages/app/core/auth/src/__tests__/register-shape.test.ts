/**
 * The RealWorld registration body this package's own docs teach.
 *
 * xr-molecule-flash-m146 (+21:04 → +23:49) followed the documented
 * `requestBody: (_kind, payload) => ({ user: payload })` and called
 * `register({ email, password, name: username, metadata: { username } })`,
 * because `RegisterData` had no `username` field. The body went out as
 * `{ user: { email, password, name, metadata: { username } } }`, the API answered
 * 422, and the app shipped `as unknown as` casts around both auth calls to get
 * past the type error its own workaround created.
 *
 * The fix is the factory's second generic: `RegisterData<TExtra>` carries the
 * app's own fields at the top level, so the typed call passes exactly what the
 * form holds and `requestBody` receives it unchanged.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { UserProfile } from '../types.js'

/** What a RealWorld-shaped API takes on registration. */
type RealWorldRegistration = { username: string }

const mockUser: UserProfile = { id: 'u1', email: 'alice@example.com', name: 'alice' }

/** A JSON response carrying a successful auth payload. */
const createMockResponse = <T>(
  data: T,
  status = 200,
): Promise<{
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  json: () => Promise<T>
}> =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
  })

describe('RealWorld registration payload (xr-molecule-flash-m146)', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockReset()
    mockFetch.mockImplementation(() =>
      createMockResponse({ user: { ...mockUser, token: 'jwt-token' } }),
    )
  })

  it('sends { user: { username, email, password } } for the documented config', async () => {
    // Exactly the example in src/index.ts: the second generic types the app's
    // own field, and the payload is enveloped as-is. No cast is needed on the
    // `register` argument — a missing `username` in `RegisterData<TExtra>` would
    // make this object literal a type error (the doc example is compiled by
    // `npm run verify:doc-examples`, which runs in the pre-commit hook).
    const client = createJWTAuthClient<UserProfile, RealWorldRegistration>({
      baseURL: '/api',
      authScheme: 'Token',
      requestBody: (_kind, payload) => ({ user: payload }),
      mapAuthResponse: (data) => {
        const { user } = data as {
          user: { token: string; username: string; email: string }
        }
        return {
          accessToken: user.token,
          user: { id: user.username, email: user.email },
        }
      },
    })

    await client.register({
      username: 'alice',
      email: 'alice@example.com',
      password: 's3cret',
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          user: { username: 'alice', email: 'alice@example.com', password: 's3cret' },
        }),
      }),
    )
    expect(client.isAuthenticated()).toBe(true)
  })

  it('keeps name/metadata callers and their requestBody working unchanged', async () => {
    // Backward compatibility: with no second generic, `RegisterData` is exactly
    // the old email/password/name/metadata shape, and a requestBody that reads
    // `name`/`metadata` from the payload still receives them.
    const client = createJWTAuthClient({
      requestBody: (_kind, payload) => ({
        user: { username: payload.name, email: payload.email, password: payload.password },
      }),
    })

    await client.register({
      email: 'bob@example.com',
      password: 'pw',
      name: 'bob',
      metadata: { referral: 'friend' },
    })

    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      user: { username: 'bob', email: 'bob@example.com', password: 'pw' },
    })
  })
})

/**
 * The fix has to live on the surface an executor reads: README.md is generated
 * from the module JSDoc, and `read_molecule_doc @molecule/app-auth` serves it.
 * The `RegisterData` JSDoc is where the type reference points.
 */
describe('the RealWorld registration guidance in the generated docs', () => {
  const read = (file: string): string => readFileSync(join(__dirname, '../..', file), 'utf8')

  it('shows the typed factory and the exact body that registers', () => {
    const readme = read('README.md')
    expect(readme).toContain('createJWTAuthClient<UserProfile, { username: string }>')
    expect(readme).toContain("await realWorldAuth.register({ username: 'alice'")
    expect(readme).toContain('{ user: { username, email, password } }')
  })

  it('says on RegisterData that the extras are typed by a second generic, with no cast', () => {
    const source = read('src/types.ts')
    const at = source.indexOf('export type RegisterData')
    const doc = source.slice(source.lastIndexOf('/**', at), at)
    expect(doc).toContain('TExtra')
    expect(doc).toContain('no cast')
  })
})
