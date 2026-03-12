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
import { updatePassword } from '../handlers/updatePassword.js'
import { updatePlan } from '../handlers/updatePlan.js'
import { propsSchema } from '../schema.js'

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

  it('should proceed without state validation when state param is absent', async () => {
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

    // Should not return 403 — state validation is skipped when no state param.
    expect(result?.statusCode).toBe(200)
    expect(res.clearCookie).not.toHaveBeenCalled()
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
})
