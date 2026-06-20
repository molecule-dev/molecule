/**
 * Tests for JWT session authorization (set + verifyMiddleware).
 *
 * Covers cookie security attributes, auth bypass prevention (no decode fallback),
 * and auto-refresh behaviour.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSign, mockVerify, mockDecode, mockGetConfig, mockGet, mockLogger } = vi.hoisted(() => ({
  mockSign: vi.fn(),
  mockVerify: vi.fn(),
  mockDecode: vi.fn(),
  mockGetConfig: vi.fn(),
  mockGet: vi.fn(),
  mockLogger: { error: vi.fn(), warn: vi.fn() },
}))

vi.mock('@molecule/api-jwt', () => ({
  sign: mockSign,
  verify: mockVerify,
  decode: mockDecode,
}))

vi.mock('@molecule/api-config', () => ({
  get: mockGetConfig,
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  getLogger: () => mockLogger,
}))

vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}))

// Import after mocks are set up.
const { set, verifyMiddleware, getAuthCookieName } = await import('../authorization.js')

/** Helper to build a mock request. */
function makeReq(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    headers: {},
    ...overrides,
  }
}

/** Helper to build a mock response. */
function makeRes(): Record<string, unknown> & {
  setHeader: ReturnType<typeof vi.fn>
  cookie: ReturnType<typeof vi.fn>
  locals: Record<string, unknown>
} {
  return {
    setHeader: vi.fn(),
    cookie: vi.fn(),
    locals: {},
  }
}

describe('authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------
  // set
  // ---------------------------------------------------------------
  describe('set', () => {
    it('sets Authorization header with Bearer token', () => {
      mockSign.mockReturnValue('jwt-token-xyz')
      mockGetConfig.mockReturnValue('test')
      const res = makeRes()

      set(makeReq() as never, res as never, { userId: 'u1', deviceId: 'd1' } as never)

      expect(res.setHeader).toHaveBeenCalledWith('Authorization', 'Bearer jwt-token-xyz')
    })

    it('sets cookie with httpOnly: true', () => {
      mockSign.mockReturnValue('jwt-token-xyz')
      mockGetConfig.mockReturnValue('test')
      const res = makeRes()

      set(makeReq() as never, res as never, { userId: 'u1', deviceId: 'd1', id: 'sid' } as never)

      expect(res.cookie).toHaveBeenCalledWith(
        'sessionId',
        'sid',
        expect.objectContaining({ httpOnly: true }),
      )
    })

    it('sets cookie sameSite to lax (not none)', () => {
      mockSign.mockReturnValue('jwt-token-xyz')
      mockGetConfig.mockReturnValue('test')
      const res = makeRes()

      set(makeReq() as never, res as never, { userId: 'u1', deviceId: 'd1', id: 'sid' } as never)

      const cookieOptions = res.cookie.mock.calls[0]?.[2] as Record<string, unknown>
      expect(cookieOptions.sameSite).toBe('lax')
    })

    it('sets cookie maxAge to 7 days (604800000ms)', () => {
      mockSign.mockReturnValue('jwt-token-xyz')
      mockGetConfig.mockReturnValue('test')
      const res = makeRes()

      set(makeReq() as never, res as never, { userId: 'u1', deviceId: 'd1', id: 'sid' } as never)

      const cookieOptions = res.cookie.mock.calls[0]?.[2] as Record<string, unknown>
      expect(cookieOptions.maxAge).toBe(1000 * 60 * 60 * 24 * 7) // 604800000
    })

    it('sets cookie secure to true when NODE_ENV=production', () => {
      mockSign.mockReturnValue('jwt-token-xyz')
      mockGetConfig.mockImplementation((key: string) => (key === 'NODE_ENV' ? 'production' : ''))
      const res = makeRes()

      set(makeReq() as never, res as never, { userId: 'u1', deviceId: 'd1', id: 'sid' } as never)

      const cookieOptions = res.cookie.mock.calls[0]?.[2] as Record<string, unknown>
      expect(cookieOptions.secure).toBe(true)
    })

    it('sets cookie secure to false when NODE_ENV is not production', () => {
      mockSign.mockReturnValue('jwt-token-xyz')
      mockGetConfig.mockImplementation((key: string) => (key === 'NODE_ENV' ? 'development' : ''))
      const res = makeRes()

      set(makeReq() as never, res as never, { userId: 'u1', deviceId: 'd1', id: 'sid' } as never)

      const cookieOptions = res.cookie.mock.calls[0]?.[2] as Record<string, unknown>
      expect(cookieOptions.secure).toBe(false)
    })

    it('generates session.id if missing', () => {
      mockSign.mockReturnValue('jwt-token-xyz')
      mockGetConfig.mockReturnValue('test')
      const res = makeRes()
      const session = { userId: 'u1', deviceId: 'd1' } as Record<string, unknown>

      set(makeReq() as never, res as never, session as never)

      expect(session.id).toBe('test-uuid-1234')
      expect(res.cookie).toHaveBeenCalledWith('sessionId', 'test-uuid-1234', expect.any(Object))
    })

    it('does not set header or cookie when sign returns falsy', () => {
      mockSign.mockReturnValue(null)
      const res = makeRes()

      set(makeReq() as never, res as never, { userId: 'u1', deviceId: 'd1' } as never)

      expect(res.setHeader).not.toHaveBeenCalled()
      expect(res.cookie).not.toHaveBeenCalled()
    })

    // C2-1: in production the auth cookies must be `__Host-` prefixed so a
    // sibling subdomain (tenant preview) cannot create a colliding
    // `.molecule.dev`-scoped duplicate that shadows the real session cookie.
    it('uses __Host- prefixed cookie names in production (unshadowable)', () => {
      mockSign.mockReturnValue('jwt-token-xyz')
      mockGetConfig.mockImplementation((key: string) => (key === 'NODE_ENV' ? 'production' : ''))
      const res = makeRes()

      set(makeReq() as never, res as never, { userId: 'u1', deviceId: 'd1', id: 'sid' } as never)

      const names = res.cookie.mock.calls.map((c) => c[0])
      expect(names).toContain('__Host-token')
      expect(names).toContain('__Host-sessionId')
      // `__Host-` REQUIRES Secure + Path=/ + no Domain on every such cookie.
      for (const call of res.cookie.mock.calls) {
        const options = call[2] as Record<string, unknown>
        expect(options.secure).toBe(true)
        expect(options.path).toBe('/')
        expect(options.domain).toBeUndefined()
      }
    })

    it('uses plain (un-prefixed) cookie names outside production', () => {
      mockSign.mockReturnValue('jwt-token-xyz')
      mockGetConfig.mockImplementation((key: string) => (key === 'NODE_ENV' ? 'development' : ''))
      const res = makeRes()

      set(makeReq() as never, res as never, { userId: 'u1', deviceId: 'd1', id: 'sid' } as never)

      const names = res.cookie.mock.calls.map((c) => c[0])
      expect(names).toContain('token')
      expect(names).toContain('sessionId')
      expect(names).not.toContain('__Host-token')
      expect(names).not.toContain('__Host-sessionId')
    })
  })

  // ---------------------------------------------------------------
  // getAuthCookieName (exported resolver, C2-1)
  // ---------------------------------------------------------------
  describe('getAuthCookieName', () => {
    it('prefixes with __Host- in production', () => {
      mockGetConfig.mockImplementation((key: string) => (key === 'NODE_ENV' ? 'production' : ''))
      expect(getAuthCookieName('token')).toBe('__Host-token')
      expect(getAuthCookieName('sessionId')).toBe('__Host-sessionId')
      expect(getAuthCookieName('oauth_state')).toBe('__Host-oauth_state')
    })

    it('returns the plain name outside production', () => {
      mockGetConfig.mockImplementation((key: string) => (key === 'NODE_ENV' ? 'development' : ''))
      expect(getAuthCookieName('token')).toBe('token')
    })
  })

  // ---------------------------------------------------------------
  // verifyMiddleware
  // ---------------------------------------------------------------
  describe('verifyMiddleware', () => {
    const middleware = verifyMiddleware()

    it('calls next() when no Authorization header', async () => {
      const next = vi.fn()

      await middleware(makeReq() as never, makeRes() as never, next)

      expect(next).toHaveBeenCalled()
    })

    it('calls next() when Authorization header is not Bearer', async () => {
      const next = vi.fn()
      const req = makeReq({ headers: { authorization: 'Basic abc123' } })

      await middleware(req as never, makeRes() as never, next)

      expect(next).toHaveBeenCalled()
    })

    it('does NOT fall back to decode() when verify fails (auth bypass prevention)', async () => {
      const next = vi.fn()
      mockVerify.mockImplementation(() => {
        throw new Error('token expired')
      })
      const req = makeReq({ headers: { authorization: 'Bearer expired-token' } })
      const res = makeRes()

      await middleware(req as never, res as never, next)

      // decode should NOT be called as a fallback to accept unverified tokens
      expect(mockDecode).not.toHaveBeenCalled()
      expect(res.locals.session).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })

    it('sets res.locals.session on valid token', async () => {
      const session = { userId: 'u1', deviceId: 'd1' }
      mockVerify.mockReturnValue(session)
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) }) // fresh token
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer valid-token' } }) as never,
        res as never,
        next,
      )

      expect(res.locals.session).toBe(session)
      expect(next).toHaveBeenCalled()
    })

    it('requires both userId and deviceId in session', async () => {
      mockVerify.mockReturnValue({ userId: 'u1' }) // missing deviceId
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer partial-token' } }) as never,
        res as never,
        next,
      )

      expect(res.locals.session).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })

    it('calls next() even on expired/invalid token (does not crash)', async () => {
      mockVerify.mockImplementation(() => {
        throw new Error('invalid signature')
      })
      const next = vi.fn()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer bad-token' } }) as never,
        makeRes() as never,
        next,
      )

      expect(next).toHaveBeenCalled()
    })

    it('auto-refreshes token when old enough', async () => {
      const session = { userId: 'u1', deviceId: 'd1', id: 'sid' }
      mockVerify.mockReturnValue(session)
      // iat 2 hours ago — well past the 30-minute default refresh threshold
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) - 7200 })
      mockGetConfig.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'JWT_REFRESH_TIME') return defaultValue ?? '30d'
        return 'test'
      })
      mockSign.mockReturnValue('refreshed-token')
      const mockUpdateLastSeen = vi.fn().mockResolvedValue(undefined)
      mockGet.mockReturnValue({ updateLastSeen: mockUpdateLastSeen })
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer old-token' } }) as never,
        res as never,
        next,
      )

      expect(res.locals.session).toBe(session)
      expect(mockSign).toHaveBeenCalledWith(session)
      expect(res.setHeader).toHaveBeenCalledWith('Authorization', 'Bearer refreshed-token')
    })

    it('does not refresh when token is fresh', async () => {
      const session = { userId: 'u1', deviceId: 'd1' }
      mockVerify.mockReturnValue(session)
      // iat just now — token is fresh
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) })
      mockGetConfig.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'JWT_REFRESH_TIME') return defaultValue ?? '30d'
        return 'test'
      })
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer fresh-token' } }) as never,
        res as never,
        next,
      )

      expect(res.locals.session).toBe(session)
      // sign should NOT have been called (no refresh)
      expect(mockSign).not.toHaveBeenCalled()
    })

    it('handles array Authorization header (takes first)', async () => {
      const session = { userId: 'u1', deviceId: 'd1' }
      mockVerify.mockReturnValue(session)
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) })
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({
          headers: { authorization: ['Bearer first-token', 'Bearer second-token'] },
        }) as never,
        res as never,
        next,
      )

      expect(mockVerify).toHaveBeenCalledWith('first-token')
      expect(res.locals.session).toBe(session)
    })

    it('calls next() on internal error (does not crash middleware chain)', async () => {
      mockVerify.mockImplementation(() => {
        throw new TypeError('Cannot read properties of undefined')
      })
      const next = vi.fn()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer crash-token' } }) as never,
        makeRes() as never,
        next,
      )

      expect(next).toHaveBeenCalled()
    })

    it('does not set session when verify returns null', async () => {
      mockVerify.mockReturnValue(null)
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer null-token' } }) as never,
        res as never,
        next,
      )

      expect(res.locals.session).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })

    // ---------------------------------------------------------------
    // C2-1: cookie read sites must match the (env-resolved) cookie name
    // ---------------------------------------------------------------
    it('reads the __Host- prefixed token cookie in production', async () => {
      mockGetConfig.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'NODE_ENV') return 'production'
        if (key === 'JWT_REFRESH_TIME') return defaultValue ?? '30d'
        return ''
      })
      const session = { userId: 'u1', deviceId: 'd-cookie-prod' }
      mockVerify.mockReturnValue(session)
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) })
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: {}, cookies: { '__Host-token': 'prod-cookie-tok' } }) as never,
        res as never,
        next,
      )

      expect(mockVerify).toHaveBeenCalledWith('prod-cookie-tok')
      expect(res.locals.session).toBe(session)
    })

    it('reads the plain token cookie in dev/test', async () => {
      mockGetConfig.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'NODE_ENV') return 'development'
        if (key === 'JWT_REFRESH_TIME') return defaultValue ?? '30d'
        return ''
      })
      const session = { userId: 'u1', deviceId: 'd-cookie-dev' }
      mockVerify.mockReturnValue(session)
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) })
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: {}, cookies: { token: 'plain-cookie-tok' } }) as never,
        res as never,
        next,
      )

      expect(mockVerify).toHaveBeenCalledWith('plain-cookie-tok')
      expect(res.locals.session).toBe(session)
    })

    // ---------------------------------------------------------------
    // C4-1: server-side session revocation (device must still exist)
    // ---------------------------------------------------------------
    it('rejects a valid JWT whose device has been revoked (logout/remote/reset)', async () => {
      const session = { userId: 'u1', deviceId: 'd-revoked' }
      mockVerify.mockReturnValue(session)
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) })
      const mockExists = vi.fn().mockResolvedValue(false) // device row deleted
      mockGet.mockReturnValue({ exists: mockExists })
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer valid-but-revoked' } }) as never,
        res as never,
        next,
      )

      expect(mockExists).toHaveBeenCalledWith('d-revoked')
      // The signature verified, but the session is NOT exposed — logout works.
      expect(res.locals.session).toBeUndefined()
      expect(next).toHaveBeenCalled()
    })

    it('accepts a valid JWT whose device still exists (legitimate session)', async () => {
      const session = { userId: 'u1', deviceId: 'd-active' }
      mockVerify.mockReturnValue(session)
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) })
      const mockExists = vi.fn().mockResolvedValue(true)
      mockGet.mockReturnValue({ exists: mockExists })
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer valid-active' } }) as never,
        res as never,
        next,
      )

      expect(mockExists).toHaveBeenCalledWith('d-active')
      expect(res.locals.session).toBe(session)
      expect(next).toHaveBeenCalled()
    })

    it('fails open (keeps session) when the device lookup throws (infra error)', async () => {
      const session = { userId: 'u1', deviceId: 'd-error' }
      mockVerify.mockReturnValue(session)
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) })
      const mockExists = vi.fn().mockRejectedValue(new Error('db down'))
      mockGet.mockReturnValue({ exists: mockExists })
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer valid-infra-err' } }) as never,
        res as never,
        next,
      )

      // A transient DB blip must not log out the whole platform.
      expect(res.locals.session).toBe(session)
      expect(mockLogger.warn).toHaveBeenCalled()
      expect(next).toHaveBeenCalled()
    })

    it('allows the session when no device bond exposes exists (backward compat)', async () => {
      const session = { userId: 'u1', deviceId: 'd-no-bond' }
      mockVerify.mockReturnValue(session)
      mockDecode.mockReturnValue({ iat: Math.floor(Date.now() / 1000) })
      mockGet.mockReturnValue(undefined) // device tracking not wired
      const next = vi.fn()
      const res = makeRes()

      await middleware(
        makeReq({ headers: { authorization: 'Bearer valid-no-bond' } }) as never,
        res as never,
        next,
      )

      expect(res.locals.session).toBe(session)
      expect(next).toHaveBeenCalled()
    })
  })
})
