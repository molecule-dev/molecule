/**
 * Security-critical tests for the password-reset token's single-use semantics
 * across BOTH handlers that consume it.
 *
 * Covers:
 * - `resetPassword` (the handler the emailed link posts to): the new password
 *   and the token clear are ONE WHERE-guarded updateMany matching the verified
 *   token hash, so two concurrent submissions of the same link cannot both
 *   succeed (mirroring the atomic consume in logIn.ts, commit 3fe080ba0).
 * - `logIn`: the one-time token is NOT consumed while the request can still be
 *   bounced by the 206 two-factor challenge — burning it there made the
 *   documented retry (same body plus `twoFactorToken`) always fail, spending a
 *   fresh reset link on every attempt for a 2FA account.
 */

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
  mockUpdateMany,
  mockT,
  mockCompare,
  mockHash,
  mockSign,
  mockGetConfig,
  mockTwoFactorVerify,
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
  mockUpdateMany: vi.fn(),
  mockT: vi.fn((key: string) => key),
  mockCompare: vi.fn(),
  mockHash: vi.fn(),
  mockSign: vi.fn(() => 'mock-jwt-token'),
  mockGetConfig: vi.fn((key: string) => (key === 'NODE_ENV' ? 'production' : undefined)),
  mockTwoFactorVerify: vi.fn(),
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
  updateMany: mockUpdateMany,
}))

vi.mock('@molecule/api-two-factor', () => ({
  verify: mockTwoFactorVerify,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: mockT,
}))

vi.mock('@molecule/api-password', () => ({
  compare: mockCompare,
  hash: mockHash,
}))

vi.mock('@molecule/api-jwt', () => ({
  sign: mockSign,
  decode: vi.fn(),
  verify: vi.fn(),
}))

vi.mock('@molecule/api-config', () => ({
  get: mockGetConfig,
}))

// ---------------------------------------------------------------------------
// Imports under test (after mocks).
// ---------------------------------------------------------------------------

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import * as authorization from '../authorization.js'
import { logIn } from '../handlers/logIn.js'
import { RESET_TOKEN_TTL_MS, resetPassword } from '../handlers/resetPassword.js'
import { propsSchema } from '../schema.js'
import { hashResetToken } from '../utilities/hashResetToken.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const testResource = { name: 'User', tableName: 'users', schema: propsSchema }

const makeReq = (body: Record<string, unknown>): MoleculeRequest =>
  ({
    body,
    params: {},
    query: {},
    headers: {},
    cookies: {},
  }) as MoleculeRequest

const makeRes = (): MoleculeResponse =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
    end: vi.fn(),
    set: vi.fn(),
    setHeader: vi.fn(),
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    write: vi.fn(),
    locals: {},
  }) as MoleculeResponse

const USER_ID = 'user-reset'
const RESET_TOKEN = 'secure-reset-token-value-abc123'
const STORED_TOKEN = hashResetToken(RESET_TOKEN)
const FIVE_MIN_AGO = new Date(Date.now() - 1000 * 60 * 5).toISOString()

// Every handler binds its analytics instance at module load (one `getAnalytics()`
// call per imported handler), so the `user.login` event lands on one of these
// track mocks. Collected per test (beforeEach clears all of them).
const analyticsTracks = mockGetAnalytics.mock.results
  .map((r) => r.value?.track)
  .filter((t): t is ReturnType<typeof vi.fn> => typeof t === 'function')

/** The recorded `user.login` analytics events across every handler's analytics instance. */
function loginEvents(): Array<Record<string, unknown>> {
  return analyticsTracks
    .flatMap((track) => track.mock.calls.map((call) => call[0] as Record<string, unknown>))
    .filter((event) => event?.name === 'user.login')
}

/** An in-memory row + a conditional updateMany that mirrors a real WHERE-guarded write. */
function inMemorySecretsRow(initial: Record<string, unknown>): {
  row: Record<string, unknown>
  wire: () => void
} {
  const row: Record<string, unknown> = { id: USER_ID, ...initial }
  return {
    row,
    wire: () => {
      mockFindOne.mockImplementation(
        async (_table: string, conditions: Array<{ field: string; value: unknown }>) =>
          conditions.every((c) => row[c.field] === c.value) ? row : null,
      )
      mockFindById.mockImplementation(async (_table: string, _id: string) => row)
      mockUpdateMany.mockImplementation(
        async (
          _table: string,
          where: Array<{ field: string; operator: string; value?: unknown }>,
          patch: Record<string, unknown>,
        ) => {
          const matched = where.every((c) =>
            c.operator === 'is_null' ? row[c.field] == null : row[c.field] === c.value,
          )
          if (matched) Object.assign(row, patch)
          return { data: null, affected: matched ? 1 : 0 }
        },
      )
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ===== resetPassword: the emailed link is consumed ATOMICALLY =================

describe('resetPassword — the reset link is consumed atomically', () => {
  const handler = resetPassword(testResource)

  it('writes the new password and clears the token in ONE WHERE-guarded update', async () => {
    mockFindOne.mockResolvedValue({
      id: USER_ID,
      passwordResetToken: STORED_TOKEN,
      passwordResetTokenAt: FIVE_MIN_AGO,
    })
    mockHash.mockResolvedValue('new-hash')
    mockUpdateMany.mockResolvedValue({ data: null, affected: 1 })
    mockGet.mockReturnValue({ deleteByUserId: vi.fn().mockResolvedValue(undefined) })

    const result = await handler(
      makeReq({ token: RESET_TOKEN, password: 'new-password-1' }) as MoleculeRequest & {
        body: { token: string; password: string }
      },
    )

    expect(result).toEqual({ statusCode: 200, body: { success: true } })
    expect(mockHash).toHaveBeenCalledWith('new-password-1')
    // The single write is guarded on the token hash that was just verified —
    // only a request that flips the stored token to NULL can match a row.
    expect(mockUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockUpdateMany).toHaveBeenCalledWith(
      'usersSecrets',
      [
        { field: 'id', operator: '=', value: USER_ID },
        { field: 'passwordResetToken', operator: '=', value: STORED_TOKEN },
      ],
      { passwordHash: 'new-hash', passwordResetToken: null, passwordResetTokenAt: null },
    )
    // The old unconditional updateById write path is gone.
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('refuses with 401 when the guarded consume matches no row — another request spent the link', async () => {
    mockFindOne.mockResolvedValue({
      id: USER_ID,
      passwordResetToken: STORED_TOKEN,
      passwordResetTokenAt: FIVE_MIN_AGO,
    })
    mockHash.mockResolvedValue('new-hash')
    // The WHERE-guarded update matched nothing: a concurrent submission of the
    // same link already flipped the token to NULL between our read and write.
    // Pre-fix the unconditional updateById "succeeded" and BOTH requests got
    // a 200 — with different passwords, last write winning.
    mockUpdateMany.mockResolvedValue({ data: null, affected: 0 })
    const deleteByUserId = vi.fn().mockResolvedValue(undefined)
    mockGet.mockReturnValue({ deleteByUserId })

    const result = await handler(
      makeReq({ token: RESET_TOKEN, password: 'attacker-password' }) as MoleculeRequest & {
        body: { token: string; password: string }
      },
    )

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 401,
        body: expect.objectContaining({ errorKey: 'user.error.invalidToken' }),
      }),
    )
    // The race loser must not wipe the account's sessions either — only the
    // request whose write actually landed owns the password change.
    expect(deleteByUserId).not.toHaveBeenCalled()
  })

  it('still confirms a token aged EXACTLY the TTL — the boundary the login gate must match', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'))
      mockFindOne.mockResolvedValue({
        id: USER_ID,
        passwordResetToken: STORED_TOKEN,
        // Issued exactly RESET_TOKEN_TTL_MS ago: the gate refuses only
        // `tokenAge > TTL`, so the boundary age itself is still valid. This
        // pins the reference behavior the logIn gate is claimed to equal.
        passwordResetTokenAt: new Date(Date.now() - RESET_TOKEN_TTL_MS).toISOString(),
      })
      mockHash.mockResolvedValue('boundary-hash')
      mockUpdateMany.mockResolvedValue({ data: null, affected: 1 })
      mockGet.mockReturnValue({ deleteByUserId: vi.fn().mockResolvedValue(undefined) })

      const result = await handler(
        makeReq({ token: RESET_TOKEN, password: 'boundary-password' }) as MoleculeRequest & {
          body: { token: string; password: string }
        },
      )

      expect(result).toEqual({ statusCode: 200, body: { success: true } })
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets only ONE of two concurrent submissions of the same link succeed', async () => {
    const { row, wire } = inMemorySecretsRow({
      passwordResetToken: STORED_TOKEN,
      passwordResetTokenAt: FIVE_MIN_AGO,
      passwordHash: 'old-hash',
    })
    wire()
    mockGet.mockReturnValue({ deleteByUserId: vi.fn().mockResolvedValue(undefined) })
    let seq = 0
    mockHash.mockImplementation(async () => `hash-${String.fromCharCode(65 + seq++)}`)

    const [first, second] = await Promise.all([
      handler(
        makeReq({ token: RESET_TOKEN, password: 'password-aaa' }) as MoleculeRequest & {
          body: { token: string; password: string }
        },
      ),
      handler(
        makeReq({ token: RESET_TOKEN, password: 'password-bbb' }) as MoleculeRequest & {
          body: { token: string; password: string }
        },
      ),
    ])

    const statuses = [first?.statusCode, second?.statusCode].sort()
    expect(statuses).toEqual([200, 401])
    // The link is spent and exactly one password — the winner's — is stored;
    // the loser's 401 did not overwrite it.
    expect(row.passwordResetToken).toBeNull()
    expect(row.passwordResetTokenAt).toBeNull()
    expect(['hash-A', 'hash-B']).toContain(row.passwordHash)
  })
})

// ===== logIn: the 2FA challenge must not burn the one-time reset link ========

describe('logIn — the reset token survives the 2FA challenge', () => {
  const handler = logIn(testResource)

  it('returns 206 WITHOUT consuming the reset token when 2FA is required', async () => {
    const { wire } = inMemorySecretsRow({
      passwordResetToken: STORED_TOKEN,
      passwordResetTokenAt: FIVE_MIN_AGO,
      twoFactorSecret: 'SECRET',
    })
    wire()
    mockFindOne.mockResolvedValue({ id: USER_ID, username: 'twofa', twoFactorEnabled: true })

    const result = await handler(
      makeReq({ username: 'twofa', passwordResetToken: RESET_TOKEN }),
      makeRes(),
    )

    expect(result).toEqual({ statusCode: 206, body: { twoFactorRequired: true } })
    // Nothing was consumed: no step write (no code submitted), no token clear.
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('completes the reset-token login on the retried request with the 2FA code', async () => {
    const { row, wire } = inMemorySecretsRow({
      passwordResetToken: STORED_TOKEN,
      passwordResetTokenAt: FIVE_MIN_AGO,
      twoFactorSecret: 'SECRET',
      lastTwoFactorTimeStep: null,
    })
    wire()
    mockFindOne.mockResolvedValue({ id: USER_ID, username: 'twofa', twoFactorEnabled: true })
    mockTwoFactorVerify.mockResolvedValue({ valid: true, timeStep: 4242 })
    mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-id') })
    vi.spyOn(authorization, 'set').mockImplementation(() => 'mock-jwt-token')

    // 1) The challenge: 206, token still stored (verified above).
    const challenge = await handler(
      makeReq({ username: 'twofa', passwordResetToken: RESET_TOKEN }),
      makeRes(),
    )
    expect(challenge?.statusCode).toBe(206)

    // 2) The documented retry: same body plus the 2FA code. The token is
    //    still there, so this must complete — pre-fix the first request had
    //    already burned it and this was always a 403 that spent a fresh link.
    const completed = await handler(
      makeReq({ username: 'twofa', passwordResetToken: RESET_TOKEN, twoFactorToken: '123456' }),
      makeRes(),
    )

    expect(completed?.statusCode).toBe(200)
    expect(mockTwoFactorVerify).toHaveBeenCalledWith(
      expect.objectContaining({ secret: 'SECRET', token: '123456' }),
    )
    // Both one-time credentials are consumed by the completed login: the 2FA
    // time step first, then the reset token (each WHERE-guarded).
    expect(mockUpdateMany).toHaveBeenNthCalledWith(
      1,
      'usersSecrets',
      [
        { field: 'id', operator: '=', value: USER_ID },
        { field: 'lastTwoFactorTimeStep', operator: 'is_null' },
      ],
      { lastTwoFactorTimeStep: 4242 },
    )
    expect(mockUpdateMany).toHaveBeenNthCalledWith(
      2,
      'usersSecrets',
      [
        { field: 'id', operator: '=', value: USER_ID },
        { field: 'passwordResetToken', operator: '=', value: STORED_TOKEN },
      ],
      { passwordResetToken: null, passwordResetTokenAt: null },
    )
    expect(row.passwordResetToken).toBeNull()
    expect(row.lastTwoFactorTimeStep).toBe(4242)
  })

  it('still refuses the login when the guarded token consume loses the race', async () => {
    const { wire } = inMemorySecretsRow({
      passwordResetToken: STORED_TOKEN,
      passwordResetTokenAt: FIVE_MIN_AGO,
    })
    wire()
    mockFindOne.mockResolvedValue({ id: USER_ID, username: 'plain' })
    // Someone else's request flips the token to NULL between this request's
    // read and write; the WHERE-guarded clear then matches nothing → refused,
    // no session minted. (Override the in-memory row matcher: the READ still
    // sees the token — only the guarded write loses.)
    mockUpdateMany.mockResolvedValue({ data: null, affected: 0 })

    const result = await handler(
      makeReq({ username: 'plain', passwordResetToken: RESET_TOKEN }),
      makeRes(),
    )

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 403,
        body: expect.objectContaining({ errorKey: 'user.error.invalidCredentials' }),
      }),
    )
    expect(mockGet).not.toHaveBeenCalled()
  })
})

// ===== logIn: TTL parity + analytics that reports the method actually used ====

describe('logIn — the reset-token TTL gate matches resetPassword, and analytics reports the method used', () => {
  const handler = logIn(testResource)

  it('refuses a token whose timestamp is in the future, like resetPassword does', async () => {
    const { wire } = inMemorySecretsRow({
      passwordResetToken: STORED_TOKEN,
      // An hour from NOW (a clock-skewed or tampered row): resetPassword's TTL
      // gate refuses `tokenAge < 0`. logIn mints an authenticated SESSION for
      // this same credential, so it must not be the looser of the two gates.
      passwordResetTokenAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    })
    wire()
    mockFindOne.mockResolvedValue({ id: USER_ID, username: 'skewed' })

    const result = await handler(
      makeReq({ username: 'skewed', passwordResetToken: RESET_TOKEN }),
      makeRes(),
    )

    expect(result).toEqual(
      expect.objectContaining({
        statusCode: 403,
        body: expect.objectContaining({ errorKey: 'user.error.invalidCredentials' }),
      }),
    )
    // Refused before anything was consumed or minted.
    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('reports "password" — not "reset_token" — when both were sent and the password authenticated', async () => {
    const { row, wire } = inMemorySecretsRow({
      passwordResetToken: STORED_TOKEN,
      passwordResetTokenAt: FIVE_MIN_AGO,
      passwordHash: 'current-hash',
    })
    wire()
    mockFindOne.mockResolvedValue({ id: USER_ID, username: 'both' })
    mockCompare.mockResolvedValue(true)
    mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-id') })
    vi.spyOn(authorization, 'set').mockImplementation(() => 'mock-jwt-token')

    const result = await handler(
      makeReq({ username: 'both', password: 'right-password', passwordResetToken: RESET_TOKEN }),
      makeRes(),
    )

    expect(result?.statusCode).toBe(200)
    // The password is what authenticated and the link was NOT spent, so the
    // login event must not claim a reset_token login — that made the
    // telemetry lie about which credential is still live.
    expect(loginEvents()).toEqual([expect.objectContaining({ properties: { method: 'password' } })])
    expect(row.passwordResetToken).toBe(STORED_TOKEN)
  })

  it('reports "reset_token" when the token is what authenticated', async () => {
    const { wire } = inMemorySecretsRow({
      passwordResetToken: STORED_TOKEN,
      passwordResetTokenAt: FIVE_MIN_AGO,
    })
    wire()
    mockFindOne.mockResolvedValue({ id: USER_ID, username: 'tokenonly' })
    mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-id') })
    vi.spyOn(authorization, 'set').mockImplementation(() => 'mock-jwt-token')

    const result = await handler(
      makeReq({ username: 'tokenonly', passwordResetToken: RESET_TOKEN }),
      makeRes(),
    )

    expect(result?.statusCode).toBe(200)
    expect(loginEvents()).toEqual([
      expect.objectContaining({ properties: { method: 'reset_token' } }),
    ])
  })

  it('accepts a token aged EXACTLY the TTL — the same boundary resetPassword applies', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-09T12:00:00.000Z'))
      const { row, wire } = inMemorySecretsRow({
        passwordResetToken: STORED_TOKEN,
        // Issued exactly RESET_TOKEN_TTL_MS ago. resetPassword's gate (the one
        // this gate is documented to match) still accepts `tokenAge === TTL`
        // — it refuses only `> TTL` — so the login path must accept it too.
        // The old inline `< 1000 * 60 * 60` here refused the boundary age,
        // making logIn STRICTER than the reset confirmation for the very same
        // credential: a link that still confirmed a reset could not log in.
        passwordResetTokenAt: new Date(Date.now() - RESET_TOKEN_TTL_MS).toISOString(),
      })
      wire()
      mockFindOne.mockResolvedValue({ id: USER_ID, username: 'boundary' })
      mockGet.mockReturnValue({ createOrUpdate: vi.fn().mockResolvedValue('device-id') })
      vi.spyOn(authorization, 'set').mockImplementation(() => 'mock-jwt-token')

      const result = await handler(
        makeReq({ username: 'boundary', passwordResetToken: RESET_TOKEN }),
        makeRes(),
      )

      expect(result?.statusCode).toBe(200)
      expect(loginEvents()).toEqual([
        expect.objectContaining({ properties: { method: 'reset_token' } }),
      ])
      expect(row.passwordResetToken).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
