/**
 * Tests for the device auth token service (full lifecycle against a mocked DataStore).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreate, mockFindById, mockFindMany, mockFindOne, mockUpdateById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  updateById: mockUpdateById,
}))

import {
  issueToken,
  listTokens,
  recordTokenUse,
  resource,
  revokeToken,
  rotateToken,
  verifyToken,
} from '../index.js'
import { hashPlaintextToken } from '../utilities.js'

const makeRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'tok_id_1',
  device_id: 'device-123',
  hashed_token: 'placeholder',
  masked: 'dvt_…ABCD',
  scopes: ['telemetry:write'],
  last_used_at: null,
  last_used_ip: null,
  expires_at: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  revoked_at: null,
  version: 1,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resource', () => {
  it('exposes the canonical table name and resource shape', () => {
    expect(resource.tableName).toBe('device_auth_tokens')
    expect(resource.name).toBe('DeviceAuthToken')
  })
})

describe('issueToken', () => {
  it('persists a hashed token and returns the plaintext exactly once', async () => {
    let storedHash = ''
    mockCreate.mockImplementationOnce(async (_table, data) => {
      storedHash = data.hashed_token as string
      return { data: makeRow({ hashed_token: storedHash, masked: data.masked }), affected: 1 }
    })

    const result = await issueToken({
      device_id: 'device-123',
      scopes: ['telemetry:write'],
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const [tableName, data] = mockCreate.mock.calls[0]
    expect(tableName).toBe('device_auth_tokens')
    expect(data.device_id).toBe('device-123')
    expect(data.scopes).toEqual(['telemetry:write'])
    expect(data.last_used_at).toBeNull()
    expect(data.last_used_ip).toBeNull()
    expect(data.expires_at).toBeNull()
    expect(data.revoked_at).toBeNull()
    expect(data.version).toBe(1)

    // The stored hash matches SHA-256 of the returned plaintext.
    expect(data.hashed_token).toBe(hashPlaintextToken(result.plaintext))

    // Plaintext is never persisted directly.
    expect(JSON.stringify(data)).not.toContain(result.plaintext)
    expect(result.token.hashed_token).not.toBe(result.plaintext)

    // Masked string is non-empty and contains the configured prefix.
    expect(result.token.masked.length).toBeGreaterThan(0)
    expect(result.token.masked).toContain('…')
  })

  it('honours an explicit prefix', async () => {
    mockCreate.mockResolvedValueOnce({ data: makeRow({ masked: 'dvt_live_…ABCD' }), affected: 1 })

    const result = await issueToken({
      device_id: 'device-123',
      prefix: 'dvt_live_',
    })

    expect(result.plaintext.startsWith('dvt_live_')).toBe(true)
    const [, data] = mockCreate.mock.calls[0]
    expect((data.masked as string).startsWith('dvt_live_')).toBe(true)
  })

  it('persists an explicit expires_at', async () => {
    mockCreate.mockResolvedValueOnce({ data: makeRow(), affected: 1 })
    const expires = new Date('2030-06-01T00:00:00Z')
    await issueToken({ device_id: 'd', expires_at: expires })
    const [, data] = mockCreate.mock.calls[0]
    expect(data.expires_at).toEqual(expires)
  })

  it('throws when create returns no row', async () => {
    mockCreate.mockResolvedValueOnce({ data: null, affected: 0 })
    await expect(issueToken({ device_id: 'device-123' })).rejects.toThrow(
      /Failed to issue device auth token/,
    )
  })

  it('returns a fresh plaintext on every call (plaintext-returned-only-once contract)', async () => {
    mockCreate.mockResolvedValue({ data: makeRow(), affected: 1 })
    const a = await issueToken({ device_id: 'd' })
    const b = await issueToken({ device_id: 'd' })
    expect(a.plaintext).not.toBe(b.plaintext)
  })
})

describe('verifyToken', () => {
  it('returns the row when the hash matches and token is active', async () => {
    const plaintext = 'dvt_test_PLAINTEXTBLABLABLA1234'
    const hashed = hashPlaintextToken(plaintext)
    mockFindOne.mockResolvedValueOnce(makeRow({ hashed_token: hashed }))

    const result = await verifyToken(plaintext)

    expect(result).not.toBeNull()
    expect(result?.device_id).toBe('device-123')
    expect(mockFindOne).toHaveBeenCalledWith('device_auth_tokens', [
      { field: 'hashed_token', operator: '=', value: hashed },
    ])
  })

  it('returns null when no row matches (wrong-token-rejection)', async () => {
    mockFindOne.mockResolvedValueOnce(null)
    expect(await verifyToken('dvt_nope')).toBeNull()
  })

  it('returns null for empty/missing input (no pre-hash early exit)', async () => {
    // Verify still hits the data store — this is the "no pre-hash early
    // exit" contract. An attacker cannot distinguish "malformed input"
    // from "valid-but-unknown" by timing.
    mockFindOne.mockResolvedValue(null)
    expect(await verifyToken('')).toBeNull()
    // @ts-expect-error invalid input
    expect(await verifyToken(null)).toBeNull()
    expect(mockFindOne).toHaveBeenCalledTimes(2)
  })

  it('returns null when the token has been revoked (revoke-rejection)', async () => {
    const plaintext = 'dvt_revoked_TOKEN_ABCD'
    const hashed = hashPlaintextToken(plaintext)
    mockFindOne.mockResolvedValueOnce(
      makeRow({ hashed_token: hashed, revoked_at: new Date('2026-04-01T00:00:00Z') }),
    )
    expect(await verifyToken(plaintext)).toBeNull()
  })

  it('returns null when the token has expired (expired-rejection)', async () => {
    const plaintext = 'dvt_expired_TOKEN_ABCD'
    const hashed = hashPlaintextToken(plaintext)
    mockFindOne.mockResolvedValueOnce(
      makeRow({ hashed_token: hashed, expires_at: new Date('2020-01-01T00:00:00Z') }),
    )
    expect(await verifyToken(plaintext)).toBeNull()
  })

  it('parses a JSON-string scopes column produced by some DataStore drivers', async () => {
    const plaintext = 'dvt_json_scopes_TOKEN_ABCD'
    const hashed = hashPlaintextToken(plaintext)
    mockFindOne.mockResolvedValueOnce(
      makeRow({ hashed_token: hashed, scopes: JSON.stringify(['a', 'b']) }),
    )

    const result = await verifyToken(plaintext)
    expect(result?.scopes).toEqual(['a', 'b'])
  })

  it('rejects when stored hash does not constant-time-equal the recomputed hash', async () => {
    // Defense-in-depth: even if the data store returns a row whose hash
    // differs from the lookup value (misbehaving driver), verifyToken
    // refuses to authenticate it.
    const plaintext = 'dvt_real_TOKEN_ABCD'
    mockFindOne.mockResolvedValueOnce(makeRow({ hashed_token: 'completely-different-hash' }))
    expect(await verifyToken(plaintext)).toBeNull()
  })
})

describe('recordTokenUse', () => {
  it('updates last_used_at on the targeted row', async () => {
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await recordTokenUse('tok_id_1')

    expect(mockUpdateById).toHaveBeenCalledTimes(1)
    const [tableName, id, data] = mockUpdateById.mock.calls[0]
    expect(tableName).toBe('device_auth_tokens')
    expect(id).toBe('tok_id_1')
    expect(data.last_used_at).toBeInstanceOf(Date)
    expect(data).not.toHaveProperty('last_used_ip')
  })

  it('records last_used_ip when provided', async () => {
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await recordTokenUse('tok_id_1', '203.0.113.7')

    const [, , data] = mockUpdateById.mock.calls[0]
    expect(data.last_used_at).toBeInstanceOf(Date)
    expect(data.last_used_ip).toBe('203.0.113.7')
  })

  it('does not record an empty IP string', async () => {
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await recordTokenUse('tok_id_1', '')

    const [, , data] = mockUpdateById.mock.calls[0]
    expect(data).not.toHaveProperty('last_used_ip')
  })
})

describe('revokeToken', () => {
  it('sets revoked_at on the targeted row', async () => {
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await revokeToken('tok_id_1')

    expect(mockUpdateById).toHaveBeenCalledTimes(1)
    const [tableName, id, data] = mockUpdateById.mock.calls[0]
    expect(tableName).toBe('device_auth_tokens')
    expect(id).toBe('tok_id_1')
    expect(data.revoked_at).toBeInstanceOf(Date)
  })
})

describe('listTokens', () => {
  it('returns tokens for the device, newest first', async () => {
    mockFindMany.mockResolvedValueOnce([
      makeRow({ id: 'b', created_at: new Date('2026-04-01T00:00:00Z') }),
      makeRow({ id: 'a', created_at: new Date('2026-01-01T00:00:00Z') }),
    ])

    const result = await listTokens('device-123')

    expect(mockFindMany).toHaveBeenCalledWith('device_auth_tokens', {
      where: [{ field: 'device_id', operator: '=', value: 'device-123' }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    expect(result.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('returns [] when the device has no tokens', async () => {
    mockFindMany.mockResolvedValueOnce([])
    expect(await listTokens('device-empty')).toEqual([])
  })
})

describe('rotateToken', () => {
  it('revokes the old token, issues a fresh plaintext, inherits scopes/expiration', async () => {
    const oldRow = makeRow({
      id: 'old_id',
      scopes: ['scope:a', 'scope:b'],
      expires_at: new Date('2030-01-01T00:00:00Z'),
    })
    mockFindById.mockResolvedValueOnce(oldRow)
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    mockCreate.mockResolvedValueOnce({ data: makeRow({ id: 'new_id' }), affected: 1 })

    const result = await rotateToken('old_id')

    // Old row revoked.
    expect(mockUpdateById).toHaveBeenCalledTimes(1)
    expect(mockUpdateById.mock.calls[0][1]).toBe('old_id')
    expect(mockUpdateById.mock.calls[0][2]).toHaveProperty('revoked_at')

    // New row created with inherited fields.
    expect(mockCreate).toHaveBeenCalledTimes(1)
    const [, data] = mockCreate.mock.calls[0]
    expect(data.device_id).toBe('device-123')
    expect(data.scopes).toEqual(['scope:a', 'scope:b'])
    expect(data.expires_at).toEqual(new Date('2030-01-01T00:00:00Z'))

    // Fresh plaintext returned.
    expect(typeof result.plaintext).toBe('string')
    expect(result.plaintext.length).toBeGreaterThan(0)
    expect(result.token.id).toBe('new_id')
  })

  it('throws when the original token cannot be found', async () => {
    mockFindById.mockResolvedValueOnce(null)
    await expect(rotateToken('missing')).rejects.toThrow(/not found/)
  })
})

describe('full lifecycle: issue → verify → use → rotate → revoke → reject', () => {
  it('walks the happy path end-to-end', async () => {
    // 1. ISSUE
    let storedHash = ''
    let createdRow: Record<string, unknown> = {}
    mockCreate.mockImplementationOnce(async (_table, data) => {
      storedHash = data.hashed_token as string
      createdRow = makeRow({
        id: 'tok_id_1',
        hashed_token: storedHash,
        masked: data.masked,
        scopes: data.scopes,
      })
      return { data: createdRow, affected: 1 }
    })
    const issued = await issueToken({
      device_id: 'device-123',
      scopes: ['telemetry:write'],
    })

    // 2. VERIFY (active)
    mockFindOne.mockResolvedValueOnce(createdRow)
    const verified = await verifyToken(issued.plaintext)
    expect(verified).not.toBeNull()
    expect(verified?.id).toBe('tok_id_1')

    // 3. USE
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await recordTokenUse(verified!.id, '203.0.113.7')
    expect(mockUpdateById.mock.calls.at(-1)?.[2]).toHaveProperty('last_used_at')
    expect(mockUpdateById.mock.calls.at(-1)?.[2]).toHaveProperty('last_used_ip', '203.0.113.7')

    // 4. ROTATE — old revoked, new token issued.
    mockFindById.mockResolvedValueOnce(createdRow)
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 }) // revoke old
    let rotatedHash = ''
    let rotatedRow: Record<string, unknown> = {}
    mockCreate.mockImplementationOnce(async (_table, data) => {
      rotatedHash = data.hashed_token as string
      rotatedRow = makeRow({
        id: 'tok_id_2',
        hashed_token: rotatedHash,
        masked: data.masked,
        scopes: data.scopes,
      })
      return { data: rotatedRow, affected: 1 }
    })
    const rotated = await rotateToken(issued.token.id)
    expect(rotated.plaintext).not.toBe(issued.plaintext)
    expect(rotated.token.id).toBe('tok_id_2')

    // 5. VERIFY old plaintext — should now be REJECTED because old row is revoked.
    const revokedOldRow = { ...createdRow, revoked_at: new Date() }
    mockFindOne.mockResolvedValueOnce(revokedOldRow)
    expect(await verifyToken(issued.plaintext)).toBeNull()

    // 6. REVOKE the new token, then verify — REJECTED.
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await revokeToken(rotated.token.id)

    const revokedRotatedRow = { ...rotatedRow, revoked_at: new Date() }
    mockFindOne.mockResolvedValueOnce(revokedRotatedRow)
    expect(await verifyToken(rotated.plaintext)).toBeNull()
  })
})
