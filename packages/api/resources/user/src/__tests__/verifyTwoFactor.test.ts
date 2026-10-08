/**
 * Security-critical tests for the verifyTwoFactor handler.
 *
 * Covers the enable/disable 2FA replay guard: the consumed TOTP time step is
 * written with a WHERE-guarded updateMany (mirroring logIn.ts, commit
 * 3fe080ba0), so of two concurrent requests replaying the same code exactly
 * one wins the row — the loser's guarded write matches nothing and is refused
 * with 403 instead of enabling/disabling a second time.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available to hoisted vi.mock() factories.
// ---------------------------------------------------------------------------

const {
  mockGetAnalytics,
  mockGetLogger,
  mockTrack,
  mockFindById,
  mockUpdateById,
  mockUpdateMany,
  mockT,
  mockGetConfig,
  mockTwoFactorVerify,
} = vi.hoisted(() => {
  // The handler resolves `analytics` once at module load, so the track
  // function it captures must be a stable handle we can assert on.
  const track = vi.fn(() => ({ catch: vi.fn() }))
  return {
    mockGetAnalytics: vi.fn(() => ({
      track,
      identify: vi.fn(() => ({ catch: vi.fn() })),
    })),
    mockGetLogger: vi.fn(() => ({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    })),
    mockTrack: track,
    mockFindById: vi.fn(),
    mockUpdateById: vi.fn(),
    mockUpdateMany: vi.fn(),
    mockT: vi.fn((key: string) => key),
    mockGetConfig: vi.fn((_key: string, fallback?: string) => fallback),
    mockTwoFactorVerify: vi.fn(),
  }
})

vi.mock('@molecule/api-bond', () => ({
  getAnalytics: mockGetAnalytics,
  getLogger: mockGetLogger,
}))

vi.mock('@molecule/api-database', () => ({
  findById: mockFindById,
  updateById: mockUpdateById,
  updateMany: mockUpdateMany,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: mockT,
}))

vi.mock('@molecule/api-config', () => ({
  get: mockGetConfig,
}))

// The handler imports this dynamically and uses generateSecret/getUrls/verify.
vi.mock('@molecule/api-two-factor', () => ({
  generateSecret: vi.fn(() => 'PENDING-SECRET'),
  getUrls: vi.fn(async () => ({
    otpauth: 'otpauth://mock',
    qrDataUri: 'data:image/png;base64,QR',
  })),
  verify: mockTwoFactorVerify,
}))

// ---------------------------------------------------------------------------
// Imports under test (after mocks).
// ---------------------------------------------------------------------------

import type { MoleculeRequest } from '@molecule/api-resource'

import { verifyTwoFactor } from '../handlers/verifyTwoFactor.js'
import { propsSchema } from '../schema.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testResource = { name: 'User', tableName: 'users', schema: propsSchema }

const makeReq = (body: Record<string, unknown>, id: string): MoleculeRequest =>
  ({
    body,
    params: { id },
    query: {},
    headers: {},
    cookies: {},
  }) as MoleculeRequest

const USER_ID = 'user-2fa'
const CONSUMED_STEP = 4242

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ===== enable: the consumed time step write must be ATOMIC ===================

describe('verifyTwoFactor (enable) — replay guard is atomic', () => {
  const handler = verifyTwoFactor(testResource)

  /** Wire mocks for a user with a pending 2FA secret and a valid code. */
  function setUpEnable(secrets: Record<string, unknown>): void {
    mockFindById.mockResolvedValue({ id: USER_ID, ...secrets })
    mockTwoFactorVerify.mockResolvedValue({ valid: true, timeStep: CONSUMED_STEP })
    mockUpdateMany.mockResolvedValue({ data: null, affected: 1 })
    mockUpdateById.mockResolvedValue({ data: null, affected: 1 })
  }

  it('persists the consumed step with a WHERE-guarded update (stored step < consumed step)', async () => {
    setUpEnable({
      pendingTwoFactorSecret: 'PENDING-SECRET',
      lastTwoFactorTimeStep: CONSUMED_STEP - 1,
    })

    const result = await handler(makeReq({ action: 'enable', token: '123456' }, USER_ID))

    // The verify still reads the stored step as its replay floor…
    expect(mockTwoFactorVerify).toHaveBeenCalledWith(
      expect.objectContaining({ token: '123456', afterTimeStep: CONSUMED_STEP - 1 }),
    )
    // …and the consume is a guarded UPDATE, not a blind write.
    expect(mockUpdateMany).toHaveBeenCalledWith(
      'usersSecrets',
      [
        { field: 'id', operator: '=', value: USER_ID },
        { field: 'lastTwoFactorTimeStep', operator: '<', value: CONSUMED_STEP },
      ],
      {
        twoFactorSecret: 'PENDING-SECRET',
        pendingTwoFactorSecret: null,
        lastTwoFactorTimeStep: CONSUMED_STEP,
      },
    )
    expect(result?.statusCode).toBe(200)
    expect(mockUpdateById).toHaveBeenCalledWith('users', USER_ID, {
      twoFactorEnabled: true,
      updatedAt: expect.any(String),
    })
  })

  it('refuses the enable when the guarded write matches no row — the same code was replayed concurrently', async () => {
    setUpEnable({
      pendingTwoFactorSecret: 'PENDING-SECRET',
      lastTwoFactorTimeStep: CONSUMED_STEP - 1,
    })
    // Both concurrent requests read the stale step, both pass verify() for the
    // same code; the winner already wrote CONSUMED_STEP, so the loser's
    // `stored < CONSUMED_STEP` matches nothing (affected 0). Pre-fix the
    // unconditional write "succeeded" and BOTH requests enabled 2FA.
    mockUpdateMany.mockResolvedValue({ data: null, affected: 0 })

    const result = await handler(makeReq({ action: 'enable', token: '123456' }, USER_ID))

    expect(result?.statusCode).toBe(403)
    expect(result?.body?.errorKey).toBe('user.error.invalidToken')
    // The loser must NOT flip twoFactorEnabled on the users table…
    expect(mockUpdateById).not.toHaveBeenCalled()
    // …and the replay is surfaced as a 2FA failure, not an enable event.
    const tracked = mockTrack.mock.calls.map((call) => call[0]?.name)
    expect(tracked).toContain('user.two_factor_failed')
    expect(tracked).not.toContain('user.two_factor_enabled')
  })

  it('a first 2FA use (NULL stored step) consumes via is_null, not a < comparison', async () => {
    setUpEnable({ pendingTwoFactorSecret: 'PENDING-SECRET' }) // no lastTwoFactorTimeStep → NULL

    const result = await handler(makeReq({ action: 'enable', token: '123456' }, USER_ID))

    expect(mockTwoFactorVerify).toHaveBeenCalledWith(
      expect.objectContaining({ afterTimeStep: undefined }),
    )
    expect(mockUpdateMany).toHaveBeenCalledWith(
      'usersSecrets',
      [
        { field: 'id', operator: '=', value: USER_ID },
        { field: 'lastTwoFactorTimeStep', operator: 'is_null' },
      ],
      {
        twoFactorSecret: 'PENDING-SECRET',
        pendingTwoFactorSecret: null,
        lastTwoFactorTimeStep: CONSUMED_STEP,
      },
    )
    expect(result?.statusCode).toBe(200)
  })
})

// ===== disable: the same atomic consume ======================================

describe('verifyTwoFactor (disable) — replay guard is atomic', () => {
  const handler = verifyTwoFactor(testResource)

  /** Wire mocks for a 2FA-enabled user with a valid code. */
  function setUpDisable(secrets: Record<string, unknown>): void {
    mockFindById.mockResolvedValue({ id: USER_ID, ...secrets })
    mockTwoFactorVerify.mockResolvedValue({ valid: true, timeStep: CONSUMED_STEP })
    mockUpdateMany.mockResolvedValue({ data: null, affected: 1 })
    mockUpdateById.mockResolvedValue({ data: null, affected: 1 })
  }

  it('persists the consumed step with a WHERE-guarded update (stored step < consumed step)', async () => {
    setUpDisable({ twoFactorSecret: 'ACTIVE-SECRET', lastTwoFactorTimeStep: CONSUMED_STEP - 1 })

    const result = await handler(makeReq({ action: 'disable', token: '123456' }, USER_ID))

    expect(mockTwoFactorVerify).toHaveBeenCalledWith(
      expect.objectContaining({
        secret: 'ACTIVE-SECRET',
        token: '123456',
        afterTimeStep: CONSUMED_STEP - 1,
      }),
    )
    expect(mockUpdateMany).toHaveBeenCalledWith(
      'usersSecrets',
      [
        { field: 'id', operator: '=', value: USER_ID },
        { field: 'lastTwoFactorTimeStep', operator: '<', value: CONSUMED_STEP },
      ],
      {
        twoFactorSecret: null,
        pendingTwoFactorSecret: null,
        lastTwoFactorTimeStep: CONSUMED_STEP,
      },
    )
    expect(result?.statusCode).toBe(200)
    expect(mockUpdateById).toHaveBeenCalledWith('users', USER_ID, {
      twoFactorEnabled: false,
      updatedAt: expect.any(String),
    })
  })

  it('refuses the disable when the guarded write matches no row — the same code was replayed concurrently', async () => {
    setUpDisable({ twoFactorSecret: 'ACTIVE-SECRET', lastTwoFactorTimeStep: CONSUMED_STEP - 1 })
    mockUpdateMany.mockResolvedValue({ data: null, affected: 0 })

    const result = await handler(makeReq({ action: 'disable', token: '123456' }, USER_ID))

    expect(result?.statusCode).toBe(403)
    expect(result?.body?.errorKey).toBe('user.error.invalidToken')
    // The loser must NOT flip twoFactorEnabled on the users table…
    expect(mockUpdateById).not.toHaveBeenCalled()
    // …and the replay is surfaced as a 2FA failure, not a disable event.
    const tracked = mockTrack.mock.calls.map((call) => call[0]?.name)
    expect(tracked).toContain('user.two_factor_failed')
    expect(tracked).not.toContain('user.two_factor_disabled')
  })

  it('a first 2FA use (NULL stored step) consumes via is_null, not a < comparison', async () => {
    setUpDisable({ twoFactorSecret: 'ACTIVE-SECRET' }) // no lastTwoFactorTimeStep → NULL

    const result = await handler(makeReq({ action: 'disable', token: '123456' }, USER_ID))

    expect(mockUpdateMany).toHaveBeenCalledWith(
      'usersSecrets',
      [
        { field: 'id', operator: '=', value: USER_ID },
        { field: 'lastTwoFactorTimeStep', operator: 'is_null' },
      ],
      {
        twoFactorSecret: null,
        pendingTwoFactorSecret: null,
        lastTwoFactorTimeStep: CONSUMED_STEP,
      },
    )
    expect(result?.statusCode).toBe(200)
  })
})

// ===== bonds without time-step reporting must keep working ===================

describe('verifyTwoFactor — bond reports no time step', () => {
  const handler = verifyTwoFactor(testResource)

  it('enable falls back to the unguarded promotion write (no step reported)', async () => {
    mockFindById.mockResolvedValue({ id: USER_ID, pendingTwoFactorSecret: 'PENDING-SECRET' })
    mockTwoFactorVerify.mockResolvedValue({ valid: true }) // no timeStep
    mockUpdateById.mockResolvedValue({ data: null, affected: 1 })

    const result = await handler(makeReq({ action: 'enable', token: '123456' }, USER_ID))

    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockUpdateById).toHaveBeenCalledWith('usersSecrets', USER_ID, {
      twoFactorSecret: 'PENDING-SECRET',
      pendingTwoFactorSecret: null,
    })
    expect(result?.statusCode).toBe(200)
  })

  it('disable falls back to the unguarded clear write (no step reported)', async () => {
    mockFindById.mockResolvedValue({ id: USER_ID, twoFactorSecret: 'ACTIVE-SECRET' })
    mockTwoFactorVerify.mockResolvedValue({ valid: true }) // no timeStep
    mockUpdateById.mockResolvedValue({ data: null, affected: 1 })

    const result = await handler(makeReq({ action: 'disable', token: '123456' }, USER_ID))

    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockUpdateById).toHaveBeenCalledWith('usersSecrets', USER_ID, {
      twoFactorSecret: null,
      pendingTwoFactorSecret: null,
    })
    expect(result?.statusCode).toBe(200)
  })
})
