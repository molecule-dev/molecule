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

  it('should call compare() with a dummy hash when user is not found (password provided)', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCompare.mockResolvedValue(false)

    const req = makeReq({
      body: { username: 'nonexistent', password: 'somepassword' },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(403)
    // The dummy bcrypt compare must have been called to burn time.
    expect(mockCompare).toHaveBeenCalledTimes(1)
    expect(mockCompare).toHaveBeenCalledWith('somepassword', expect.stringContaining('$2b$12$'))
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
      cookies: { oauth_state: stateValue },
    })
    const res = makeRes()

    const result = await handler(req as MoleculeRequest, res as MoleculeResponse)

    expect(result?.statusCode).toBe(200)
    // Verify that clearCookie was called for the state cookie.
    expect(res.clearCookie).toHaveBeenCalledWith('oauth_state', { path: '/' })
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

    expect(res.cookie).toHaveBeenCalledWith(
      'sessionId',
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
      'sessionId',
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
      'sessionId',
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
      'sessionId',
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
