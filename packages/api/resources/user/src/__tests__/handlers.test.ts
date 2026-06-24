/**
 * Security-critical tests for user resource handlers.
 *
 * Covers: password validation, timing attack prevention, constant-time token comparison,
 * OAuth CSRF state validation, session invalidation on password change, and cookie security.
 */

import crypto from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available to hoisted vi.mock() factories.
// ---------------------------------------------------------------------------

const {
  mockGet,
  mockGetAnalytics,
  mockGetLogger,
  mockFindById,
  mockFindOne,
  mockUpdateById,
  mockStoreCreate,
  mockT,
  mockCompare,
  mockHash,
  mockResourceCreate,
  mockResourceUpdate,
  mockSign,
  mockGetConfig,
} = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetAnalytics: vi.fn(() => ({
    track: vi.fn(() => ({ catch: vi.fn() })),
    identify: vi.fn(() => ({ catch: vi.fn() })),
  })),
  mockGetLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  })),
  mockFindById: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
  mockStoreCreate: vi.fn(),
  mockT: vi.fn((key: string) => key),
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
  mockResourceCreate: vi.fn(),
  mockResourceUpdate: vi.fn(),
  mockSign: vi.fn(() => 'mock-jwt-token'),
  mockGetConfig: vi.fn((key: string) => {
    if (key === 'NODE_ENV') return 'production'
    return undefined
  }),
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  getAnalytics: mockGetAnalytics,
  getLogger: mockGetLogger,
}))

vi.mock('@molecule/api-database', () => ({
  findById: mockFindById,
  findOne: mockFindOne,
  updateById: mockUpdateById,
  create: mockStoreCreate,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: mockT,
}))

vi.mock('@molecule/api-password', () => ({
  compare: mockCompare,
  hash: mockHash,
}))

vi.mock('@molecule/api-resource', () => ({
  create: vi.fn(() => mockResourceCreate),
  update: vi.fn(() => mockResourceUpdate),
}))

vi.mock('@molecule/api-jwt', () => ({
  sign: mockSign,
  decode: vi.fn(),
  verify: vi.fn(),
}))

vi.mock('@molecule/api-config', () => ({
  get: mockGetConfig,
}))

vi.mock('uuid', () => ({
  v4: () => '00000000-0000-0000-0000-000000000001',
}))

// ---------------------------------------------------------------------------
// Imports under test (after mocks).
// ---------------------------------------------------------------------------

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import * as authorization from '../authorization.js'
import { create } from '../handlers/create.js'
import { logIn } from '../handlers/logIn.js'
import { logInOAuth } from '../handlers/logInOAuth.js'
import { readSelf } from '../handlers/readSelf.js'
import { update } from '../handlers/update.js'
import { updatePassword } from '../handlers/updatePassword.js'
import { updatePlan } from '../handlers/updatePlan.js'
import { MAX_AVATAR_LENGTH, MAX_BIO_LENGTH, propsSchema } from '../schema.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testResource = { name: 'User', tableName: 'users', schema: propsSchema }

const makeReq = (overrides: Record<string, unknown> = {}): MoleculeRequest => ({
  body: {},
  params: {} as Record<string, string>,
  query: {},
  headers: {},
  cookies: {} as Record<string, string>,
  ...overrides,
})

const makeRes = (): MoleculeResponse & { clearCookie: ReturnType<typeof vi.fn> } => ({
  status: vi.fn().mockReturnThis() as unknown as MoleculeResponse['status'],
  json: vi.fn(),
  send: vi.fn(),
  end: vi.fn(),
  set: vi.fn(),
  setHeader: vi.fn(),
  cookie: vi.fn(),
  clearCookie: vi.fn(),
  write: vi.fn(),
  locals: {} as Record<string, unknown>,
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ===== 1. Password length validation (create.ts) ===========================

describe('create handler — password validation', () => {
  const handler = create(testResource)

  it('should return 400 when password is shorter than 8 characters', async () => {
    mockFindOne.mockResolvedValue(null)
    const req = makeReq({ body: { username: 'testuser', password: 'short' } })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ errorKey: 'user.error.passwordTooShort' }),
      }),
    )
  })

  it('should return 400 when password exceeds 1024 characters', async () => {
    mockFindOne.mockResolvedValue(null)
    const longPassword = 'a'.repeat(1025)
    const req = makeReq({ body: { username: 'testuser', password: longPassword } })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ errorKey: 'user.error.passwordTooLong' }),
      }),
    )
  })

  it('should pass validation for password of exactly 8 characters', async () => {
    mockFindOne.mockResolvedValue(null)
    mockHash.mockResolvedValue('hashed-password')
    mockStoreCreate.mockResolvedValue({ affected: 1 })
    mockResourceCreate.mockResolvedValue({
      statusCode: 201,
      body: { props: { id: '00000000-0000-0000-0000-000000000001', username: 'testuser' } },
    })
    mockGet.mockReturnValue({
      createOrUpdate: vi.fn().mockResolvedValue('device-id'),
    })

    const req = makeReq({ body: { username: 'testuser', password: 'exactly8' } })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    // Should not have returned a 400 — password validation passed.
    expect(result?.statusCode).not.toBe(400)
  })

  it('should pass validation for password of exactly 1024 characters', async () => {
    mockFindOne.mockResolvedValue(null)
    mockHash.mockResolvedValue('hashed-password')
    mockStoreCreate.mockResolvedValue({ affected: 1 })
    mockResourceCreate.mockResolvedValue({
      statusCode: 201,
      body: { props: { id: '00000000-0000-0000-0000-000000000001', username: 'testuser' } },
    })
    mockGet.mockReturnValue({
      createOrUpdate: vi.fn().mockResolvedValue('device-id'),
    })

    const req = makeReq({ body: { username: 'testuser', password: 'a'.repeat(1024) } })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).not.toBe(400)
  })

  it('should return 400 when password is missing', async () => {
    const req = makeReq({ body: { username: 'testuser' } })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ errorKey: 'user.error.passwordRequired' }),
      }),
    )
  })
})

// ===== 1b. Privileged-field mass-assignment prevention (create.ts) =========

describe('create handler — privileged field mass-assignment prevention (P2E-1)', () => {
  const handler = create(testResource)

  it('ignores planKey/planExpiresAt/planAutoRenews/emailVerified/oauth*/twoFactorEnabled from the signup body', async () => {
    mockFindOne.mockResolvedValue(null)
    mockHash.mockResolvedValue('hashed-password')
    mockStoreCreate.mockResolvedValue({ affected: 1 })
    mockResourceCreate.mockResolvedValue({
      statusCode: 201,
      body: { props: { id: '00000000-0000-0000-0000-000000000001', username: 'attacker' } },
    })
    mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-id') })

    const req = makeReq({
      body: {
        username: 'attacker',
        password: 'password123',
        email: 'attacker@example.com',
        // Privileged columns an attacker would attempt to inject:
        planKey: 'pro',
        planExpiresAt: '2099-01-01T00:00:00.000Z',
        planAutoRenews: true,
        emailVerified: true,
        oauthServer: 'google',
        oauthId: 'victim-google-sub',
        oauthData: { sub: 'victim-google-sub' },
        twoFactorEnabled: true,
      },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(201)
    expect(mockResourceCreate).toHaveBeenCalledTimes(1)
    const passedProps = (
      mockResourceCreate.mock.calls[0]?.[0] as { props: Record<string, unknown> }
    ).props
    // Allow-listed signup fields survive.
    expect(passedProps).toMatchObject({ username: 'attacker', email: 'attacker@example.com' })
    // Privileged fields must NOT be writable from a signup body.
    for (const key of [
      'planKey',
      'planExpiresAt',
      'planAutoRenews',
      'emailVerified',
      'oauthServer',
      'oauthId',
      'oauthData',
      'twoFactorEnabled',
    ]) {
      expect(passedProps).not.toHaveProperty(key)
    }
  })
})

// ===== 2. Password length validation (updatePassword.ts) ===================

describe('updatePassword handler — password validation', () => {
  const handler = updatePassword(testResource)

  it('should return 400 when new password is shorter than 8 characters', async () => {
    const req = makeReq({
      params: { id: 'user-id' },
      body: { currentPassword: 'oldPassword123', newPassword: 'short' },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ errorKey: 'user.error.passwordTooShort' }),
      }),
    )
  })

  it('should return 400 when new password exceeds 1024 characters', async () => {
    const req = makeReq({
      params: { id: 'user-id' },
      body: { currentPassword: 'oldPassword123', newPassword: 'a'.repeat(1025) },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ errorKey: 'user.error.passwordTooLong' }),
      }),
    )
  })

  it('should pass validation for new password of exactly 8 characters', async () => {
    mockFindById.mockResolvedValue({ id: 'user-id', passwordHash: 'old-hash' })
    mockCompare.mockResolvedValue(true)
    mockHash.mockResolvedValue('new-hash')
    mockUpdateById.mockResolvedValue({ affected: 1 })
    mockGet.mockReturnValue({ deleteByUserId: vi.fn().mockResolvedValue(undefined) })

    const req = makeReq({
      params: { id: 'user-id' },
      body: { currentPassword: 'oldPassword123', newPassword: 'exactly8' },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).not.toBe(400)
  })

  it('should pass validation for new password of exactly 1024 characters', async () => {
    mockFindById.mockResolvedValue({ id: 'user-id', passwordHash: 'old-hash' })
    mockCompare.mockResolvedValue(true)
    mockHash.mockResolvedValue('new-hash')
    mockUpdateById.mockResolvedValue({ affected: 1 })
    mockGet.mockReturnValue({ deleteByUserId: vi.fn().mockResolvedValue(undefined) })

    const req = makeReq({
      params: { id: 'user-id' },
      body: { currentPassword: 'oldPassword123', newPassword: 'a'.repeat(1024) },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).not.toBe(400)
  })

  it('should return 400 when new password is missing', async () => {
    const req = makeReq({
      params: { id: 'user-id' },
      body: { currentPassword: 'oldPassword123' },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ errorKey: 'user.error.newPasswordRequired' }),
      }),
    )
  })
})

// ===== 3. Dummy bcrypt compare on user-not-found (logIn.ts) ================

describe('logIn handler — timing attack prevention', () => {
  const handler = logIn(testResource)

  // A real, structurally valid cost-12 bcrypt hash: exactly 53 chars after the
  // `$2b$12$` cost prefix (22-char salt + 31-char digest). The bond's hash() is
  // mocked to return this; the not-found path must forward THIS to compare(), not
  // a hardcoded/off-by-one literal that would make compare() short-circuit.
  const VALID_DUMMY_HASH = '$2b$12$abcdefghijklmnopqrstuuMxsML64WyMyU3hT9b1lYBVi8r4sZ5Hi'
  // The exact malformed literal the broken implementation used (54 zeros after the
  // cost prefix) — compare() returns false in ~0ms against it, no KDF run.
  const MALFORMED_LITERAL = '$2b$12$000000000000000000000000000000000000000000000000000000'

  it('should run the real KDF via the bond (hash + compare) when user is not found, NOT a malformed literal', async () => {
    mockFindOne.mockResolvedValue(null)
    mockHash.mockResolvedValue(VALID_DUMMY_HASH)
    mockCompare.mockResolvedValue(false)

    const req = makeReq({
      body: { username: 'nonexistent', password: 'somepassword' },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
    // The dummy hash must be derived from the bond's hash() (honoring SALT_ROUNDS),
    // so it is a real, correctly-costed hash — not a hardcoded off-by-one literal.
    expect(mockHash).toHaveBeenCalled()
    // The KDF must actually run: compare() is invoked with the bond-produced hash.
    expect(mockCompare).toHaveBeenCalledTimes(1)
    expect(mockCompare).toHaveBeenCalledWith('somepassword', VALID_DUMMY_HASH)
    // Regression guard: never the malformed 54-char literal that short-circuits.
    expect(mockCompare).not.toHaveBeenCalledWith('somepassword', MALFORMED_LITERAL)
    // The forwarded hash is structurally valid: exactly 53 chars after `$2b$12$`.
    const [, forwardedHash] = mockCompare.mock.calls[0] as [string, string]
    expect(forwardedHash.slice('$2b$12$'.length)).toHaveLength(53)
  })

  it('should NOT call compare() when user is not found and no password provided', async () => {
    mockFindOne.mockResolvedValue(null)

    const req = makeReq({
      body: { username: 'nonexistent' },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
    expect(mockCompare).not.toHaveBeenCalled()
  })

  it('should still return 403 even if dummy compare throws', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCompare.mockRejectedValue(new Error('bcrypt internal error'))

    const req = makeReq({
      body: { username: 'nonexistent', password: 'somepassword' },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
    expect(result?.body?.errorKey).toBe('user.error.invalidCredentials')
  })
})

// ===== 4. Constant-time token comparison (logIn.ts) ========================

describe('logIn handler — password reset token', () => {
  const handler = logIn(testResource)
  const userId = 'user-123'
  const resetToken = 'secure-reset-token-value-abc123'

  beforeEach(() => {
    // Spy on crypto.timingSafeEqual to verify it is called.
    vi.spyOn(crypto, 'timingSafeEqual')
  })

  it('should use crypto.timingSafeEqual for reset token comparison', async () => {
    const now = Date.now()
    mockFindOne.mockResolvedValue({ id: userId, username: 'testuser' })
    mockFindById.mockResolvedValue({
      id: userId,
      passwordResetToken: resetToken,
      passwordResetTokenAt: new Date(now - 1000 * 60 * 5).toISOString(), // 5 min ago
    })
    mockUpdateById.mockResolvedValue({ affected: 1 })
    mockGet.mockReturnValue({
      createOrUpdate: vi.fn().mockResolvedValue('device-id'),
    })

    const req = makeReq({
      body: { username: 'testuser', passwordResetToken: resetToken },
    })
    const res = makeRes()

    await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(crypto.timingSafeEqual).toHaveBeenCalledTimes(1)
  })

  it('should clear the reset token BEFORE granting authentication', async () => {
    const now = Date.now()
    const callOrder: string[] = []

    mockFindOne.mockResolvedValue({ id: userId, username: 'testuser' })
    mockFindById.mockResolvedValue({
      id: userId,
      passwordResetToken: resetToken,
      passwordResetTokenAt: new Date(now - 1000 * 60 * 5).toISOString(),
    })
    mockUpdateById.mockImplementation(async () => {
      callOrder.push('updateById')
      return { affected: 1 }
    })
    mockGet.mockReturnValue({
      createOrUpdate: vi.fn().mockImplementation(async () => {
        callOrder.push('createOrUpdate')
        return 'device-id'
      }),
    })

    vi.spyOn(authorization, 'set').mockImplementation((_req, _res, _session) => {
      callOrder.push('authorization.set')
    })

    const req = makeReq({
      body: { username: 'testuser', passwordResetToken: resetToken },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(200)
    // updateById (clear token) must happen BEFORE authorization.set (grant auth).
    const clearIndex = callOrder.indexOf('updateById')
    const authIndex = callOrder.indexOf('authorization.set')
    expect(clearIndex).toBeGreaterThanOrEqual(0)
    expect(authIndex).toBeGreaterThanOrEqual(0)
    expect(clearIndex).toBeLessThan(authIndex)

    // The updateById call should set the token fields to null.
    expect(mockUpdateById).toHaveBeenCalledWith(
      'usersSecrets',
      userId,
      expect.objectContaining({
        passwordResetToken: null,
        passwordResetTokenAt: null,
      }),
    )
  })

  it('should reject expired reset tokens (older than 1 hour)', async () => {
    const now = Date.now()
    mockFindOne.mockResolvedValue({ id: userId, username: 'testuser' })
    mockFindById.mockResolvedValue({
      id: userId,
      passwordResetToken: resetToken,
      passwordResetTokenAt: new Date(now - 1000 * 60 * 61).toISOString(), // 61 min ago
    })

    const req = makeReq({
      body: { username: 'testuser', passwordResetToken: resetToken },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
    expect(result?.body?.errorKey).toBe('user.error.invalidCredentials')
  })

  it('should reject mismatched reset tokens', async () => {
    const now = Date.now()
    mockFindOne.mockResolvedValue({ id: userId, username: 'testuser' })
    mockFindById.mockResolvedValue({
      id: userId,
      passwordResetToken: resetToken,
      passwordResetTokenAt: new Date(now - 1000 * 60 * 5).toISOString(),
    })

    const req = makeReq({
      body: { username: 'testuser', passwordResetToken: 'wrong-token-different-length!' },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
  })
})

// ===== 5. OAuth CSRF state validation (logInOAuth.ts) ======================

describe('logInOAuth handler — CSRF state validation', () => {
  const handler = logInOAuth(testResource)

  it('should return 403 when state param is present but cookie state is missing', async () => {
    const req = makeReq({
      body: { server: 'google', code: 'auth-code', state: 'random-state-abc' },
      cookies: {},
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
    expect(result?.body?.errorKey).toBe('user.error.oauthStateMismatch')
  })

  it('should return 403 when state param does not match cookie state', async () => {
    const req = makeReq({
      body: { server: 'google', code: 'auth-code', state: 'request-state' },
      cookies: { oauth_state: 'different-cookie-state' },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
    expect(result?.body?.errorKey).toBe('user.error.oauthStateMismatch')
  })

  it('should clear the state cookie after successful validation', async () => {
    const stateValue = 'matching-state-value'

    // Mock the OAuth provider verify call.
    const mockOAuthProvider = {
      verify: vi.fn().mockResolvedValue({
        oauthServer: 'google',
        oauthId: 'google-user-123',
        username: 'googleuser',
        name: 'Google User',
        email: 'google@example.com',
        oauthData: {},
      }),
    }
    mockGet.mockImplementation((category: string) => {
      if (category === 'oauth') return mockOAuthProvider
      if (category === 'device') return { createOrUpdate: vi.fn().mockResolvedValue('device-id') }
      return null
    })
    mockFindOne.mockResolvedValue({
      id: 'existing-user-id',
      username: 'googleuser',
      oauthServer: 'google',
      oauthId: 'google-user-123',
    })
    mockUpdateById.mockResolvedValue({ affected: 1 })

    vi.spyOn(authorization, 'set').mockImplementation((_req, _res, _session) => {})

    const req = makeReq({
      body: { server: 'google', code: 'auth-code', state: stateValue },
      // In production (mocked NODE_ENV) the state cookie is `__Host-`-prefixed and the
      // plain name is NOT accepted (C4-1 — no toss fallback), so the legit cookie must
      // be under the prefixed name.
      cookies: { '__Host-oauth_state': stateValue },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(200)
    // Verify that clearCookie was called for the state cookie (both names are cleared).
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_state', { path: '/' })
  })

  it('uses the PKCE verifier from the httpOnly cookie, NEVER the request body, and clears it [M1-1]', async () => {
    // Authorization-code-injection guard: the per-session code_verifier lives in an
    // httpOnly cookie set at OAuth initiation. logInOAuth must redeem the code with the
    // COOKIE verifier (bound to the session that started the flow), never an attacker-
    // supplied body.codeVerifier. With a real per-session S256 challenge, an injected
    // victim code can't be redeemed because the attacker can't produce the matching verifier.
    const stateValue = 'matching-state-value'
    const sessionVerifier = 'session-secret-verifier-from-cookie'
    const mockOAuthProvider = {
      verify: vi.fn().mockResolvedValue({
        oauthServer: 'google',
        oauthId: 'google-user-123',
        username: 'googleuser',
        email: 'google@example.com',
        oauthData: {},
      }),
    }
    mockGet.mockImplementation((category: string) => {
      if (category === 'oauth') return mockOAuthProvider
      if (category === 'device') return { createOrUpdate: vi.fn().mockResolvedValue('device-id') }
      return null
    })
    mockFindOne.mockResolvedValue({
      id: 'existing-user-id',
      username: 'googleuser',
      oauthServer: 'google',
      oauthId: 'google-user-123',
    })
    mockUpdateById.mockResolvedValue({ affected: 1 })
    vi.spyOn(authorization, 'set').mockImplementation((_req, _res, _session) => {})

    const req = makeReq({
      body: {
        server: 'google',
        code: 'auth-code',
        state: stateValue,
        codeVerifier: 'attacker-body-value', // must be IGNORED in favor of the cookie
      },
      cookies: { '__Host-oauth_state': stateValue, '__Host-oauth_verifier': sessionVerifier },
    })
    const res = makeRes()

    await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(mockOAuthProvider.verify).toHaveBeenCalledTimes(1)
    const callArgs = mockOAuthProvider.verify.mock.calls[0]
    expect(callArgs[0]).toBe('auth-code')
    expect(callArgs[1]).toBe(sessionVerifier) // cookie verifier, NOT 'attacker-body-value'
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_verifier', { path: '/' }) // one-time use
  })

  it('rejects a TOSSED plain oauth_state cookie in production — no plain fallback [C4-1]', async () => {
    // A sibling *.molecule.dev preview can toss a `.molecule.dev`-scoped PLAIN
    // oauth_state cookie; the attacker controls both it and body.state. In prod the
    // verifier must read ONLY `__Host-oauth_state` (untossable), so this must 403.
    const tossed = 'attacker-tossed-state'
    const req = makeReq({
      body: { server: 'google', code: 'auth-code', state: tossed },
      cookies: { oauth_state: tossed },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
  })

  it('should return 403 when state param is ABSENT — state validation is mandatory (login-CSRF)', async () => {
    // A forged cross-site callback that simply omits `state` must NOT bypass the
    // check. This is the login-CSRF / session-fixation regression: previously
    // `if (body.state)` made validation opt-in for the attacker.
    const mockOAuthProvider = {
      verify: vi.fn().mockResolvedValue({
        oauthServer: 'github',
        oauthId: 'github-user-456',
        username: 'githubuser',
        oauthData: {},
      }),
    }
    mockGet.mockImplementation((category: string) => {
      if (category === 'oauth') return mockOAuthProvider
      if (category === 'device') return { createOrUpdate: vi.fn().mockResolvedValue('device-id') }
      return null
    })

    const req = makeReq({
      body: { server: 'github', code: 'auth-code' },
      cookies: {},
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
    expect(result?.body?.errorKey).toBe('user.error.oauthStateMismatch')
    // The attacker's code must never be exchanged when state is missing.
    expect(mockOAuthProvider.verify).not.toHaveBeenCalled()
  })

  it('allows opt-out via OAUTH_REQUIRE_STATE=false (state not required)', async () => {
    mockGetConfig.mockImplementation((key: string) => {
      if (key === 'OAUTH_REQUIRE_STATE') return 'false'
      if (key === 'NODE_ENV') return 'production'
      return undefined
    })

    const mockOAuthProvider = {
      verify: vi.fn().mockResolvedValue({
        oauthServer: 'github',
        oauthId: 'github-user-456',
        username: 'githubuser',
        oauthData: {},
      }),
    }
    mockGet.mockImplementation((category: string) => {
      if (category === 'oauth') return mockOAuthProvider
      if (category === 'device') return { createOrUpdate: vi.fn().mockResolvedValue('device-id') }
      return null
    })
    mockFindOne.mockResolvedValue({
      id: 'existing-user-id',
      username: 'githubuser',
      oauthServer: 'github',
      oauthId: 'github-user-456',
    })
    mockUpdateById.mockResolvedValue({ affected: 1 })

    vi.spyOn(authorization, 'set').mockImplementation((_req, _res, _session) => {})

    const req = makeReq({
      body: { server: 'github', code: 'auth-code' },
      cookies: {},
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(200)

    // Restore the default config implementation so the opt-out does not leak
    // into other tests (clearAllMocks does not reset implementations).
    mockGetConfig.mockImplementation((key: string) =>
      key === 'NODE_ENV' ? 'production' : undefined,
    )
  })
})

// ===== 5b. OAuth email-collision account-takeover guard (logInOAuth.ts) =====

describe('logInOAuth handler — email-collision account-takeover guard', () => {
  const handler = logInOAuth(testResource)
  const oauthProviderFor = (email?: string) => ({
    verify: vi.fn().mockResolvedValue({
      oauthServer: 'google',
      oauthId: 'new-google-id',
      username: 'newuser',
      name: 'New User',
      email,
      oauthData: {},
    }),
  })
  const wireGet = (provider: unknown) =>
    mockGet.mockImplementation((category: string) => {
      if (category === 'oauth') return provider
      if (category === 'device') return { createOrUpdate: vi.fn().mockResolvedValue('device-id') }
      return null
    })

  beforeEach(() => {
    // These tests exercise post-auth collision logic, not CSRF — opt out of the
    // mandatory state gate so the requests don't need a state+cookie pair.
    mockGetConfig.mockImplementation((key: string) =>
      key === 'OAUTH_REQUIRE_STATE' ? 'false' : key === 'NODE_ENV' ? 'production' : undefined,
    )
  })

  it('rejects with 409 when the OAuth email already belongs to another account', async () => {
    wireGet(oauthProviderFor('taken@example.com'))
    // 1st findOne (oauthServer+oauthId) → no match; 2nd (email) → an existing account.
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'other-user-id', email: 'taken@example.com' })

    const result = await handler(
      makeReq({ body: { server: 'google', code: 'auth-code' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    expect(result?.statusCode).toBe(409)
    expect(result?.body?.errorKey).toBe('user.error.emailAlreadyRegistered')
    // Must NOT create a second account or auto-link the unverified email.
    expect(mockResourceCreate).not.toHaveBeenCalled()
  })

  it('creates the account when the OAuth email is not already registered', async () => {
    wireGet(oauthProviderFor('fresh@example.com'))
    // No oauth match, no email collision, username free → all findOne → null.
    mockFindOne.mockResolvedValue(null)
    mockResourceCreate.mockResolvedValue({
      statusCode: 201,
      body: { props: { id: 'created-id', username: 'newuser', email: 'fresh@example.com' } },
    })
    mockStoreCreate.mockResolvedValue({ affected: 1 })
    vi.spyOn(authorization, 'set').mockImplementation(() => {})

    const result = await handler(
      makeReq({ body: { server: 'google', code: 'auth-code' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    expect(result?.statusCode).toBe(200)
    expect(mockResourceCreate).toHaveBeenCalled()
  })
})

// ===== 5c. OAuth email verification + verified-trust linking (logInOAuth.ts) =

describe('logInOAuth handler — email verification + verified-trust linking', () => {
  const handler = logInOAuth(testResource)

  const oauthProviderFor = (props: {
    email?: string
    emailVerified?: boolean
    oauthId?: string
  }) => ({
    verify: vi.fn().mockResolvedValue({
      oauthServer: 'google',
      oauthId: props.oauthId ?? 'new-google-id',
      username: 'newuser',
      name: 'New User',
      email: props.email,
      emailVerified: props.emailVerified,
      oauthData: { sub: props.oauthId ?? 'new-google-id' },
    }),
  })

  const wireGet = (provider: unknown) =>
    mockGet.mockImplementation((category: string) => {
      if (category === 'oauth') return provider
      if (category === 'device') return { createOrUpdate: vi.fn().mockResolvedValue('device-id') }
      return null
    })

  beforeEach(() => {
    vi.spyOn(authorization, 'set').mockImplementation(() => 'mock-jwt-token')
    // These tests exercise post-auth collision/linking logic, not CSRF — opt out
    // of the mandatory state gate so the requests don't need a state+cookie pair.
    mockGetConfig.mockImplementation((key: string) =>
      key === 'OAUTH_REQUIRE_STATE' ? 'false' : key === 'NODE_ENV' ? 'production' : undefined,
    )
  })

  it('links a provider-VERIFIED email into an existing UNVERIFIED account (anti-squatting)', async () => {
    wireGet(oauthProviderFor({ email: 'owner@example.com', emailVerified: true }))
    // 1st findOne (oauthServer+oauthId) → no match.
    // 2nd findOne (email) → an existing, *unverified* local account (the squatter).
    mockFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'squatter-id',
      email: 'owner@example.com',
      emailVerified: false,
    })
    mockUpdateById.mockResolvedValue({ affected: 1 })
    // The merged row after linking.
    mockFindById.mockResolvedValue({
      id: 'squatter-id',
      email: 'owner@example.com',
      emailVerified: true,
      oauthServer: 'google',
      oauthId: 'new-google-id',
    })

    const result = await handler(
      makeReq({ body: { server: 'google', code: 'auth-code' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    expect(result?.statusCode).toBe(200)
    // No second account created — the OAuth identity is linked into the existing row.
    expect(mockResourceCreate).not.toHaveBeenCalled()
    // The existing account is claimed: OAuth identity attached + marked verified.
    expect(mockUpdateById).toHaveBeenCalledWith(
      'users',
      'squatter-id',
      expect.objectContaining({
        oauthServer: 'google',
        oauthId: 'new-google-id',
        emailVerified: true,
      }),
    )
  })

  it('does NOT take over an already-VERIFIED account even with a verified OAuth email', async () => {
    wireGet(oauthProviderFor({ email: 'owner@example.com', emailVerified: true }))
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'rightful-id', email: 'owner@example.com', emailVerified: true })

    const result = await handler(
      makeReq({ body: { server: 'google', code: 'auth-code' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    expect(result?.statusCode).toBe(409)
    expect(result?.body?.errorKey).toBe('user.error.emailAlreadyRegistered')
    expect(mockUpdateById).not.toHaveBeenCalled()
    expect(mockResourceCreate).not.toHaveBeenCalled()
  })

  it('does NOT link when the OAuth email is UNVERIFIED, even against an unverified account', async () => {
    wireGet(oauthProviderFor({ email: 'owner@example.com', emailVerified: false }))
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'other-id', email: 'owner@example.com', emailVerified: false })

    const result = await handler(
      makeReq({ body: { server: 'google', code: 'auth-code' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    expect(result?.statusCode).toBe(409)
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('normalizes the OAuth email (case/whitespace) before the collision lookup', async () => {
    wireGet(oauthProviderFor({ email: '  Owner@Example.COM ', emailVerified: false }))
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'other-id', email: 'owner@example.com', emailVerified: false })

    const result = await handler(
      makeReq({ body: { server: 'google', code: 'auth-code' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    expect(result?.statusCode).toBe(409)
    // The email lookup must use the normalized (trimmed + lowercased) form so a
    // case variant cannot slip past the UNIQUE column.
    expect(mockFindOne).toHaveBeenCalledWith('users', [
      { field: 'email', operator: '=', value: 'owner@example.com' },
    ])
  })

  it('persists emailVerified when creating a brand-new OAuth user', async () => {
    wireGet(oauthProviderFor({ email: 'fresh@example.com', emailVerified: true }))
    // No oauth match, no email collision, username free → all findOne → null.
    mockFindOne.mockResolvedValue(null)
    mockResourceCreate.mockResolvedValue({
      statusCode: 201,
      body: { props: { id: 'created-id', username: 'newuser', email: 'fresh@example.com' } },
    })
    mockStoreCreate.mockResolvedValue({ affected: 1 })

    const result = await handler(
      makeReq({ body: { server: 'google', code: 'auth-code' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    expect(result?.statusCode).toBe(200)
    expect(mockResourceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          email: 'fresh@example.com',
          emailVerified: true,
        }),
      }),
    )
  })

  it('converts a TOCTOU UNIQUE-collision (create fails, email now exists) into 409, not 500', async () => {
    wireGet(oauthProviderFor({ email: 'race@example.com', emailVerified: false }))
    // Pre-checks: no oauth match, no email collision, username free.
    // Post-create re-check (4th findOne): the email now exists (a concurrent
    // request inserted it between our check and our insert).
    mockFindOne
      .mockResolvedValueOnce(null) // oauthServer+oauthId
      .mockResolvedValueOnce(null) // email pre-check
      .mockResolvedValueOnce(null) // username uniqueness
      .mockResolvedValueOnce({ id: 'raced-id', email: 'race@example.com' }) // post-create race re-check
    // The insert is rejected by the UNIQUE constraint → resource returns non-201.
    mockResourceCreate.mockResolvedValue({
      statusCode: 400,
      body: { error: 'duplicate key', errorKey: 'resource.error.unableToCreate' },
    })

    const result = await handler(
      makeReq({ body: { server: 'google', code: 'auth-code' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    expect(result?.statusCode).toBe(409)
    expect(result?.body?.errorKey).toBe('user.error.emailAlreadyRegistered')
  })
})

// ===== 5d. Pre-account-hijacking defense on verified-OAuth claim (M1-1) =====

describe('logInOAuth handler — pre-account-hijacking defense (M1-1)', () => {
  const oauthHandler = logInOAuth(testResource)
  const loginHandler = logIn(testResource)

  // Generic in-memory row matcher for findOne's condition array.
  const matches = (
    row: Record<string, unknown> | undefined,
    conditions: Array<{ field: string; value: unknown }>,
  ) => conditions.every((c) => row?.[c.field] === c.value)

  beforeEach(() => {
    vi.spyOn(authorization, 'set').mockImplementation(() => 'mock-jwt-token')
    // Exercise the post-auth claim logic, not CSRF — opt out of the state gate.
    mockGetConfig.mockImplementation((key: string) =>
      key === 'OAUTH_REQUIRE_STATE' ? 'false' : key === 'NODE_ENV' ? 'production' : undefined,
    )
  })

  it('wipes the squatter password + revokes sessions so the old password is rejected after a verified OAuth claim, while OAuth login succeeds', async () => {
    // The attacker pre-registered the victim's email with a password THEY control,
    // creating an unverified local account (emailVerified defaults to false).
    const usersTable = new Map<string, Record<string, unknown>>([
      [
        'squatter-id',
        {
          id: 'squatter-id',
          username: 'victim',
          email: 'victim@example.com',
          emailVerified: false,
          twoFactorEnabled: true,
        },
      ],
    ])
    const secretsTable = new Map<string, Record<string, unknown>>([
      [
        'squatter-id',
        {
          id: 'squatter-id',
          passwordHash: 'attacker-known-hash',
          twoFactorSecret: 'attacker-2fa-secret',
        },
      ],
    ])
    const tableFor = (table: string) => (table === 'users' ? usersTable : secretsTable)

    mockFindOne.mockImplementation(
      async (table: string, conditions: Array<{ field: string; value: unknown }>) => {
        for (const row of tableFor(table).values()) {
          if (matches(row, conditions)) return row
        }
        return null
      },
    )
    mockFindById.mockImplementation(
      async (table: string, id: string) => tableFor(table).get(id) ?? null,
    )
    mockUpdateById.mockImplementation(
      async (table: string, id: string, patch: Record<string, unknown>) => {
        const row = tableFor(table).get(id)
        if (row) Object.assign(row, patch)
        return { affected: 1 }
      },
    )

    const deleteByUserId = vi.fn().mockResolvedValue(undefined)
    mockGet.mockImplementation((category: string) => {
      if (category === 'oauth') {
        return {
          verify: vi.fn().mockResolvedValue({
            oauthServer: 'google',
            oauthId: 'victim-google-sub',
            username: 'victimg',
            name: 'Victim',
            email: 'victim@example.com',
            emailVerified: true,
            oauthData: { sub: 'victim-google-sub' },
          }),
        }
      }
      if (category === 'device') {
        return { createOrUpdate: vi.fn().mockResolvedValue('fresh-device-id'), deleteByUserId }
      }
      return null
    })

    // 1) The victim signs in via Google (provider-VERIFIED email) — claims the row.
    const oauthResult = await oauthHandler(
      makeReq({ body: { server: 'google', code: 'auth-code' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    // Legitimate behavior preserved: the verified owner is logged in.
    expect(oauthResult?.statusCode).toBe(200)
    // The account is claimed by the OAuth identity and marked verified.
    expect(usersTable.get('squatter-id')?.emailVerified).toBe(true)
    expect(usersTable.get('squatter-id')?.oauthId).toBe('victim-google-sub')
    // The squatter's credentials are now untrusted: password + 2FA secrets wiped...
    expect(secretsTable.get('squatter-id')?.passwordHash).toBeNull()
    expect(secretsTable.get('squatter-id')?.twoFactorSecret).toBeNull()
    expect(usersTable.get('squatter-id')?.twoFactorEnabled).toBe(false)
    // ...and every prior device/session revoked.
    expect(deleteByUserId).toHaveBeenCalledWith('squatter-id')

    // 2) The attacker tries to keep using the original password → MUST be rejected,
    //    because the password secret no longer exists on the now-verified account.
    mockCompare.mockResolvedValue(true) // even if compare were reached, it'd "match".
    const loginResult = await loginHandler(
      makeReq({ body: { username: 'victim', password: 'attacker-password' } }) as MoleculeRequest,
      makeRes() as MoleculeResponse,
    )

    expect(loginResult?.statusCode).toBe(403)
    expect(loginResult?.body?.errorKey).toBe('user.error.invalidCredentials')
    // The wiped hash means compare is never even consulted for a password match.
    expect(mockCompare).not.toHaveBeenCalled()
  })
})

// ===== 6. Session invalidation on password change (updatePassword.ts) ======

describe('updatePassword handler — session invalidation', () => {
  const handler = updatePassword(testResource)

  it('should call device.deleteByUserId after password change', async () => {
    const deleteByUserId = vi.fn().mockResolvedValue(undefined)
    mockFindById.mockResolvedValue({ id: 'user-id', passwordHash: 'old-hash' })
    mockCompare.mockResolvedValue(true)
    mockHash.mockResolvedValue('new-hash')
    mockUpdateById.mockResolvedValue({ affected: 1 })
    mockGet.mockReturnValue({ deleteByUserId })

    const req = makeReq({
      params: { id: 'user-id' },
      body: { currentPassword: 'oldPassword123', newPassword: 'newPassword456' },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(200)
    expect(deleteByUserId).toHaveBeenCalledWith('user-id')
  })

  it('should still return 200 if session invalidation fails', async () => {
    const deleteByUserId = vi.fn().mockRejectedValue(new Error('Redis unavailable'))
    mockFindById.mockResolvedValue({ id: 'user-id', passwordHash: 'old-hash' })
    mockCompare.mockResolvedValue(true)
    mockHash.mockResolvedValue('new-hash')
    mockUpdateById.mockResolvedValue({ affected: 1 })
    mockGet.mockReturnValue({ deleteByUserId })

    const req = makeReq({
      params: { id: 'user-id' },
      body: { currentPassword: 'oldPassword123', newPassword: 'newPassword456' },
    })

    const result = await handler(req as MoleculeRequest)

    // Password change succeeded, session invalidation failure is non-critical.
    expect(result?.statusCode).toBe(200)
    expect(deleteByUserId).toHaveBeenCalledWith('user-id')
  })

  it('should clear password reset tokens when changing password', async () => {
    mockFindById.mockResolvedValue({ id: 'user-id', passwordHash: 'old-hash' })
    mockCompare.mockResolvedValue(true)
    mockHash.mockResolvedValue('new-hash')
    mockUpdateById.mockResolvedValue({ affected: 1 })
    mockGet.mockReturnValue({ deleteByUserId: vi.fn().mockResolvedValue(undefined) })

    const req = makeReq({
      params: { id: 'user-id' },
      body: { currentPassword: 'oldPassword123', newPassword: 'newPassword456' },
    })

    await handler(req as MoleculeRequest)

    expect(mockUpdateById).toHaveBeenCalledWith(
      'usersSecrets',
      'user-id',
      expect.objectContaining({
        passwordResetToken: null,
        passwordResetTokenAt: null,
      }),
    )
  })
})

// ===== 7. Authorization cookie settings (authorization.ts) =================

describe('authorization.set — cookie security', () => {
  beforeEach(() => {
    mockSign.mockReturnValue('mock-jwt-token')
  })

  it('should set cookie with sameSite lax', () => {
    mockGetConfig.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production'
      return undefined
    })

    const req = makeReq()
    const res = makeRes()
    const session = { userId: 'user-1', deviceId: 'device-1' }

    authorization.set(req as MoleculeRequest, res as MoleculeResponse, session)

    // In production the auth cookies are `__Host-` prefixed (C2-1) so a sibling
    // subdomain cannot shadow them.
    expect(res.cookie).toHaveBeenCalledWith(
      '__Host-sessionId',
      expect.any(String),
      expect.objectContaining({
        sameSite: 'lax',
      }),
    )
  })

  it('should NOT use sameSite none', () => {
    mockGetConfig.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production'
      return undefined
    })

    const req = makeReq()
    const res = makeRes()
    const session = { userId: 'user-1', deviceId: 'device-1' }

    authorization.set(req as MoleculeRequest, res as MoleculeResponse, session)

    const cookieCall = res.cookie.mock.calls[0]
    const cookieOptions = cookieCall?.[2] as Record<string, unknown>
    expect(cookieOptions.sameSite).not.toBe('none')
  })

  it('should set maxAge to 7 days (604800000 ms)', () => {
    const req = makeReq()
    const res = makeRes()
    const session = { userId: 'user-1', deviceId: 'device-1' }

    authorization.set(req as MoleculeRequest, res as MoleculeResponse, session)

    const sevenDaysMs = 1000 * 60 * 60 * 24 * 7

    expect(res.cookie).toHaveBeenCalledWith(
      '__Host-sessionId',
      expect.any(String),
      expect.objectContaining({
        maxAge: sevenDaysMs,
      }),
    )
  })

  it('should NOT set maxAge to 1 year', () => {
    const req = makeReq()
    const res = makeRes()
    const session = { userId: 'user-1', deviceId: 'device-1' }

    authorization.set(req as MoleculeRequest, res as MoleculeResponse, session)

    const oneYearMs = 1000 * 60 * 60 * 24 * 365
    const cookieCall = res.cookie.mock.calls[0]
    const cookieOptions = cookieCall?.[2] as Record<string, unknown>
    expect(cookieOptions.maxAge).not.toBe(oneYearMs)
  })

  it('should set httpOnly to true', () => {
    const req = makeReq()
    const res = makeRes()
    const session = { userId: 'user-1', deviceId: 'device-1' }

    authorization.set(req as MoleculeRequest, res as MoleculeResponse, session)

    expect(res.cookie).toHaveBeenCalledWith(
      '__Host-sessionId',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
      }),
    )
  })

  it('should set secure to true in production', () => {
    mockGetConfig.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production'
      return undefined
    })

    const req = makeReq()
    const res = makeRes()
    const session = { userId: 'user-1', deviceId: 'device-1' }

    authorization.set(req as MoleculeRequest, res as MoleculeResponse, session)

    expect(res.cookie).toHaveBeenCalledWith(
      '__Host-sessionId',
      expect.any(String),
      expect.objectContaining({
        secure: true,
      }),
    )
  })

  it('should set secure to false in non-production', () => {
    mockGetConfig.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'development'
      return undefined
    })

    const req = makeReq()
    const res = makeRes()
    const session = { userId: 'user-1', deviceId: 'device-1' }

    authorization.set(req as MoleculeRequest, res as MoleculeResponse, session)

    expect(res.cookie).toHaveBeenCalledWith(
      'sessionId',
      expect.any(String),
      expect.objectContaining({
        secure: false,
      }),
    )
  })

  it('should set the Authorization header with a Bearer token', () => {
    const req = makeReq()
    const res = makeRes()
    const session = { userId: 'user-1', deviceId: 'device-1' }

    authorization.set(req as MoleculeRequest, res as MoleculeResponse, session)

    expect(res.setHeader).toHaveBeenCalledWith('Authorization', expect.stringMatching(/^Bearer .+/))
  })
})

// ===== 8. Privilege escalation prevention (updatePlan.ts) ==================

describe('updatePlan handler — privilege escalation prevention', () => {
  const handler = updatePlan(testResource)

  it('should allow downgrade to free plan when no PlanService is bonded', async () => {
    mockFindById.mockResolvedValue({
      id: 'user-123',
      planKey: 'pro',
      planExpiresAt: null,
    })
    // No PlanService bonded — get('plans') returns falsy.
    mockGet.mockReturnValue(undefined)
    mockResourceUpdate.mockResolvedValue({
      statusCode: 200,
      body: { props: { planKey: '', planAutoRenews: false } },
    })

    const req = makeReq({
      params: { id: 'user-123' },
      body: { planKey: '' },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(200)
    // Verify the resource update was called with free planKey and planAutoRenews: false.
    expect(mockResourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-123',
        props: expect.objectContaining({
          planKey: '',
          planAutoRenews: false,
        }),
      }),
    )
  })

  it('should reject upgrade to paid plan when no PlanService is bonded', async () => {
    mockFindById.mockResolvedValue({
      id: 'user-123',
      planKey: '',
    })
    // No PlanService bonded.
    mockGet.mockReturnValue(undefined)

    const req = makeReq({
      params: { id: 'user-123' },
      body: { planKey: 'pro' },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(400)
    expect(result?.body?.errorKey).toBe('user.error.failedToUpdatePlan')
    // The resource update must NOT have been called — upgrade was blocked.
    expect(mockResourceUpdate).not.toHaveBeenCalled()
  })

  it('should set planAutoRenews to false when downgrading without PlanService', async () => {
    mockFindById.mockResolvedValue({
      id: 'user-456',
      planKey: 'enterprise',
      planExpiresAt: null,
    })
    mockGet.mockReturnValue(undefined)
    mockResourceUpdate.mockResolvedValue({
      statusCode: 200,
      body: { props: { planKey: '', planAutoRenews: false } },
    })

    const req = makeReq({
      params: { id: 'user-456' },
      body: { planKey: '' },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(200)
    expect(mockResourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          planAutoRenews: false,
        }),
      }),
    )
  })

  it('should return 400 when planKey is missing from request body', async () => {
    const req = makeReq({
      params: { id: 'user-123' },
      body: {},
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(400)
    expect(result?.body?.errorKey).toBe('user.error.planKeyRequired')
  })

  it('should return 404 when user is not found', async () => {
    mockFindById.mockResolvedValue(null)
    mockGet.mockReturnValue(undefined)

    const req = makeReq({
      params: { id: 'nonexistent-user' },
      body: { planKey: '' },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(404)
    expect(result?.body?.errorKey).toBe('user.error.notFound')
  })

  it('should reject any non-empty planKey as upgrade attempt without PlanService', async () => {
    mockFindById.mockResolvedValue({
      id: 'user-123',
      planKey: '',
    })
    mockGet.mockReturnValue(undefined)

    // Try several paid plan keys — all should be rejected.
    for (const planKey of ['basic', 'pro', 'enterprise', 'premium']) {
      mockResourceUpdate.mockClear()

      const req = makeReq({
        params: { id: 'user-123' },
        body: { planKey },
      })

      const result = await handler(req as MoleculeRequest)

      expect(result?.statusCode).toBe(400)
      expect(result?.body?.errorKey).toBe('user.error.failedToUpdatePlan')
      expect(mockResourceUpdate).not.toHaveBeenCalled()
    }
  })

  it('rejects self-grant of a paid apple plan when the provider cannot confirm (no direct-set)', async () => {
    // Regression for C6-1: a free user PATCHing {planKey:'appleMonthly'} must NOT
    // get the paid plan written to their record. The apple plan has a platformKey
    // but the bonded provider has no updateSubscription (receipt-only), so the
    // handler must return an error instead of falling through to a direct set.
    mockFindById.mockResolvedValue({ id: 'user-free', planKey: '', planExpiresAt: null })

    const plansService = {
      findPlan: vi.fn((key: string) => {
        if (key === 'appleMonthly') {
          return { planKey: 'appleMonthly', platformKey: 'apple', platformProductId: 'com.app.pro' }
        }
        if (key === '') return { planKey: '', platformKey: undefined }
        return null
      }),
      findPlanByProductId: vi.fn(),
      getDefaultPlan: vi.fn(),
      getAllPlans: vi.fn(),
    }

    mockGet.mockImplementation((category: string) => {
      if (category === 'plans') return plansService
      // Apple provider: receipt-only, NO updateSubscription.
      if (category === 'payments') return { providerName: 'apple' }
      return undefined
    })

    const req = makeReq({ params: { id: 'user-free' }, body: { planKey: 'appleMonthly' } })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(400)
    expect(result?.body?.errorKey).toBe('user.error.subscriptionActivationRequiresVerification')
    // CRITICAL: the user record must NOT be upgraded to the paid plan.
    expect(mockResourceUpdate).not.toHaveBeenCalled()
  })

  it('rejects a paid planKey that has no platform handler at all (no direct-set)', async () => {
    // A paid plan with no platformKey cannot be confirmed by any provider.
    mockFindById.mockResolvedValue({ id: 'user-free', planKey: '', planExpiresAt: null })

    const plansService = {
      findPlan: vi.fn((key: string) => {
        if (key === 'pro') return { planKey: 'pro', platformKey: undefined }
        if (key === '') return { planKey: '', platformKey: undefined }
        return null
      }),
      findPlanByProductId: vi.fn(),
      getDefaultPlan: vi.fn(),
      getAllPlans: vi.fn(),
    }

    mockGet.mockImplementation((category: string) => {
      if (category === 'plans') return plansService
      return undefined
    })

    const req = makeReq({ params: { id: 'user-free' }, body: { planKey: 'pro' } })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(400)
    expect(result?.body?.errorKey).toBe('user.error.subscriptionActivationRequiresVerification')
    expect(mockResourceUpdate).not.toHaveBeenCalled()
  })
})

// ===== 9. Profile avatar + bio updates (update.ts) =========================

describe('update handler — avatar + bio profile fields', () => {
  const handler = update(testResource)

  beforeEach(() => {
    mockResourceUpdate.mockResolvedValue({
      statusCode: 200,
      body: { props: { id: 'user-1' } },
    })
  })

  it('should accept and persist avatar + bio together', async () => {
    const avatar = 'data:image/png;base64,iVBORw0KGgoAAAANS'
    const bio = 'Full-stack developer who loves composable systems.'
    const req = makeReq({ params: { id: 'user-1' }, body: { avatar, bio } })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(200)
    expect(mockResourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        props: expect.objectContaining({ avatar, bio }),
      }),
    )
  })

  it('does NOT let twoFactorEnabled ride the generic update — 2FA step-up bypass [M6-1]', async () => {
    const req = makeReq({
      params: { id: 'user-1' },
      body: { name: 'Renamed', twoFactorEnabled: false },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(200)
    expect(mockResourceUpdate).toHaveBeenCalled()
    // The disable of 2FA must go through verifyTwoFactor (TOTP step-up), never the generic
    // authSelf-only update — so the persisted props must NOT carry twoFactorEnabled.
    const passedProps = mockResourceUpdate.mock.calls[0]?.[0]?.props ?? {}
    expect(passedProps).not.toHaveProperty('twoFactorEnabled')
  })

  it('should reject an avatar larger than the cap (and not persist)', async () => {
    const req = makeReq({
      params: { id: 'user-1' },
      body: { avatar: 'a'.repeat(MAX_AVATAR_LENGTH + 1) },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ errorKey: 'user.error.avatarTooLarge' }),
      }),
    )
    expect(mockResourceUpdate).not.toHaveBeenCalled()
  })

  it('should accept an avatar exactly at the cap', async () => {
    const req = makeReq({
      params: { id: 'user-1' },
      body: { avatar: 'a'.repeat(MAX_AVATAR_LENGTH) },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).not.toBe(400)
    expect(mockResourceUpdate).toHaveBeenCalled()
  })

  it('should reject a bio longer than the cap (and not persist)', async () => {
    const req = makeReq({
      params: { id: 'user-1' },
      body: { bio: 'a'.repeat(MAX_BIO_LENGTH + 1) },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 400,
        body: expect.objectContaining({ errorKey: 'user.error.bioTooLong' }),
      }),
    )
    expect(mockResourceUpdate).not.toHaveBeenCalled()
  })

  it('should accept a bio exactly at the cap', async () => {
    const req = makeReq({
      params: { id: 'user-1' },
      body: { bio: 'a'.repeat(MAX_BIO_LENGTH) },
    })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).not.toBe(400)
    expect(mockResourceUpdate).toHaveBeenCalled()
  })

  it('should clear the avatar when null is provided', async () => {
    const req = makeReq({ params: { id: 'user-1' }, body: { avatar: null } })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(200)
    expect(mockResourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ avatar: null }) }),
    )
  })

  it('should clear the avatar when an empty string is provided', async () => {
    const req = makeReq({ params: { id: 'user-1' }, body: { avatar: '' } })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(200)
    expect(mockResourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ avatar: null }) }),
    )
  })

  it('should clear the bio when null is provided', async () => {
    const req = makeReq({ params: { id: 'user-1' }, body: { bio: null } })

    const result = await handler(req as MoleculeRequest)

    expect(result?.statusCode).toBe(200)
    expect(mockResourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ props: expect.objectContaining({ bio: null }) }),
    )
  })
})

describe('readSelf (GET /users/me — cookie session restore)', () => {
  const resource = { name: 'user', tableName: 'users', schema: propsSchema }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the authenticated user from res.locals.session (no :id param)', async () => {
    mockFindById.mockImplementation((table: string) =>
      table === 'users'
        ? { id: 'u1', email: 'me@example.com', twoFactorEnabled: false }
        : table === 'usersSecrets'
          ? { id: 'u1', pendingTwoFactorSecret: null }
          : null,
    )
    const req = { params: {} } as unknown as MoleculeRequest
    const res = { locals: { session: { userId: 'u1' } } } as unknown as MoleculeResponse

    const result = await readSelf(resource)(req, res)

    expect(result.statusCode).toBe(200)
    expect((result.body as { props: { id: string } }).props.id).toBe('u1')
    // Keyed off the session, never a client-supplied :id.
    expect(mockFindById).toHaveBeenCalledWith('users', 'u1')
  })

  it('401 when there is no session (unauthenticated cookie probe)', async () => {
    const req = { params: {} } as unknown as MoleculeRequest
    const res = { locals: {} } as unknown as MoleculeResponse

    const result = await readSelf(resource)(req, res)

    expect(result.statusCode).toBe(401)
  })

  it('401 when the session references a deleted user', async () => {
    mockFindById.mockResolvedValue(null)
    const req = { params: {} } as unknown as MoleculeRequest
    const res = { locals: { session: { userId: 'gone' } } } as unknown as MoleculeResponse

    const result = await readSelf(resource)(req, res)

    expect(result.statusCode).toBe(401)
  })
})
