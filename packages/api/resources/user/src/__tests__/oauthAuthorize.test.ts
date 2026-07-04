/**
 * Tests for the OAuth initiation handler (`GET /users/oauth/:provider`).
 *
 * Covers: bond gating (clean 404 when the provider isn't bonded / can't build
 * an authorize URL), CSRF state + PKCE verifier cookies (names + attributes
 * matching what `logInOAuth` reads and clears), the S256 challenge actually
 * deriving from the verifier cookie, `redirect_to` open-redirect
 * sanitization, and the 302 Location pointing at the bond-built URL.
 */

import crypto from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet, mockGetConfig, mockT } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetConfig: vi.fn(),
  mockT: vi.fn((key: string) => key),
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  getAnalytics: vi.fn(() => ({
    track: vi.fn(() => ({ catch: vi.fn() })),
    identify: vi.fn(() => ({ catch: vi.fn() })),
  })),
  getLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('@molecule/api-config', () => ({
  get: mockGetConfig,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: mockT,
}))

// authorization.ts (imported transitively) pulls in api-jwt at module scope;
// mock it the same way handlers.test.ts does so the import stays inert.
vi.mock('@molecule/api-jwt', () => ({
  sign: vi.fn(() => 'mock-jwt-token'),
  decode: vi.fn(),
  verify: vi.fn(),
}))

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { oauthAuthorize } from '../handlers/oauthAuthorize.js'

const makeReq = (overrides: Record<string, unknown> = {}): MoleculeRequest => ({
  body: {},
  params: {} as Record<string, string>,
  query: {},
  headers: {},
  cookies: {} as Record<string, string>,
  ...overrides,
})

const makeRes = (): MoleculeResponse => ({
  status: vi.fn().mockReturnThis() as unknown as MoleculeResponse['status'],
  json: vi.fn(),
  send: vi.fn(),
  end: vi.fn(),
  set: vi.fn(),
  setHeader: vi.fn(),
  cookie: vi.fn(),
  write: vi.fn(),
  locals: {} as Record<string, unknown>,
})

/** Configure getConfig for a scenario (dev names keep the tests readable). */
const configureEnv = (values: Record<string, string | undefined>): void => {
  mockGetConfig.mockImplementation((key: string, defaultValue?: unknown) =>
    key in values ? values[key] : defaultValue,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  configureEnv({ NODE_ENV: 'test', APP_ORIGIN: 'http://localhost:5173' })
})

describe('oauthAuthorize — bond gating', () => {
  it('responds 404 when no provider is bonded for :provider', async () => {
    mockGet.mockReturnValue(undefined)
    const handler = oauthAuthorize()

    const result = await handler(makeReq({ params: { provider: 'github' } }), makeRes())

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 404,
        body: expect.objectContaining({ errorKey: 'user.error.oauthServerNotConfigured' }),
      }),
    )
    expect(mockGet).toHaveBeenCalledWith('oauth', 'github')
  })

  it('responds 404 when the bond lacks getAuthorizeUrl (verify-only bond)', async () => {
    mockGet.mockReturnValue({ serverName: 'github', verify: vi.fn() })
    const handler = oauthAuthorize()

    const result = await handler(makeReq({ params: { provider: 'github' } }), makeRes())

    expect(result?.statusCode).toBe(404)
  })

  it('responds 503 when the bond is wired but unconfigured (builder returns null)', async () => {
    mockGet.mockReturnValue({ getAuthorizeUrl: vi.fn(() => null) })
    const handler = oauthAuthorize()

    const result = await handler(makeReq({ params: { provider: 'github' } }), makeRes())

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 503,
        body: expect.objectContaining({ errorKey: 'user.error.oauthServerNotConfigured' }),
      }),
    )
  })

  it('responds 400 when :provider is missing', async () => {
    const handler = oauthAuthorize()

    const result = await handler(makeReq(), makeRes())

    expect(result?.statusCode).toBe(400)
    expect(mockGet).not.toHaveBeenCalled()
  })
})

describe('oauthAuthorize — happy path', () => {
  it('sets state + PKCE verifier cookies and 302-redirects to the bond-built URL', async () => {
    const getAuthorizeUrl = vi.fn(
      (params: { state: string }) => `https://provider.example/authorize?state=${params.state}`,
    )
    mockGet.mockReturnValue({ getAuthorizeUrl })
    const handler = oauthAuthorize()
    const res = makeRes()

    const result = await handler(makeReq({ params: { provider: 'github' } }), res)

    // Both one-time cookies set: httpOnly, 5-minute TTL, the SAME base names
    // logInOAuth reads (plain names outside production).
    const cookieCalls = (res.cookie as ReturnType<typeof vi.fn>).mock.calls
    const stateCall = cookieCalls.find((c) => c[0] === 'oauth_state')
    const verifierCall = cookieCalls.find((c) => c[0] === 'oauth_verifier')
    expect(stateCall).toBeDefined()
    expect(verifierCall).toBeDefined()
    expect(stateCall![2]).toEqual(
      expect.objectContaining({ httpOnly: true, maxAge: 5 * 60 * 1000, path: '/' }),
    )
    expect(verifierCall![2]).toEqual(
      expect.objectContaining({ httpOnly: true, maxAge: 5 * 60 * 1000, path: '/' }),
    )

    // The state handed to the bond is EXACTLY the state cookie value, and the
    // S256 challenge really derives from the verifier cookie value — the
    // whole point of the cookies is that logInOAuth can later verify both.
    const builderParams = getAuthorizeUrl.mock.calls[0][0] as {
      state: string
      codeChallenge?: string
      codeChallengeMethod?: string
      redirectUri?: string
    }
    expect(builderParams.state).toBe(stateCall![1])
    expect(builderParams.codeChallenge).toBe(
      crypto.createHash('sha256').update(String(verifierCall![1])).digest('base64url'),
    )
    expect(builderParams.codeChallengeMethod).toBe('S256')
    expect(builderParams.redirectUri).toBe('http://localhost:5173')

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 302,
        headers: { Location: `https://provider.example/authorize?state=${stateCall![1]}` },
      }),
    )
  })

  it('appends a valid same-origin redirect_to path to the redirect URI', async () => {
    const getAuthorizeUrl = vi.fn(() => 'https://provider.example/authorize')
    mockGet.mockReturnValue({ getAuthorizeUrl })
    const handler = oauthAuthorize()

    await handler(
      makeReq({ params: { provider: 'github' }, query: { redirect_to: '/login' } }),
      makeRes(),
    )

    expect(getAuthorizeUrl.mock.calls[0][0]).toEqual(
      expect.objectContaining({ redirectUri: 'http://localhost:5173/login' }),
    )
  })

  it.each([
    ['protocol-relative', '//evil.example'],
    ['absolute URL', 'https://evil.example/phish'],
    ['backslash trick', '/\\evil.example'],
    ['relative path', 'login'],
  ])('ignores a malicious redirect_to (%s) — open-redirect guard', async (_label, value) => {
    const getAuthorizeUrl = vi.fn(() => 'https://provider.example/authorize')
    mockGet.mockReturnValue({ getAuthorizeUrl })
    const handler = oauthAuthorize()

    await handler(
      makeReq({ params: { provider: 'github' }, query: { redirect_to: value } }),
      makeRes(),
    )

    expect(getAuthorizeUrl.mock.calls[0][0]).toEqual(
      expect.objectContaining({ redirectUri: 'http://localhost:5173' }),
    )
  })

  it('omits redirectUri entirely when APP_ORIGIN is unset (provider uses its registered callback)', async () => {
    configureEnv({ NODE_ENV: 'test' })
    const getAuthorizeUrl = vi.fn(() => 'https://provider.example/authorize')
    mockGet.mockReturnValue({ getAuthorizeUrl })
    const handler = oauthAuthorize()

    await handler(makeReq({ params: { provider: 'github' } }), makeRes())

    expect(
      (getAuthorizeUrl.mock.calls[0][0] as { redirectUri?: string }).redirectUri,
    ).toBeUndefined()
  })

  it('generates a fresh state per request (no fixation)', async () => {
    const states: string[] = []
    const getAuthorizeUrl = vi.fn((params: { state: string }) => {
      states.push(params.state)
      return 'https://provider.example/authorize'
    })
    mockGet.mockReturnValue({ getAuthorizeUrl })
    const handler = oauthAuthorize()

    await handler(makeReq({ params: { provider: 'github' } }), makeRes())
    await handler(makeReq({ params: { provider: 'github' } }), makeRes())

    expect(states[0]).toMatch(/^[0-9a-f]{64}$/)
    expect(states[1]).toMatch(/^[0-9a-f]{64}$/)
    expect(states[0]).not.toBe(states[1])
  })
})
