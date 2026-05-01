/**
 * Tests for the API key service (full lifecycle against a mocked DataStore).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreate, mockFindById, mockFindOne, mockUpdateById } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindById: vi.fn(),
  mockFindOne: vi.fn(),
  mockUpdateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findOne: mockFindOne,
  updateById: mockUpdateById,
}))

import {
  createApiKey,
  recordApiKeyUse,
  resource,
  revokeApiKey,
  rotateApiKey,
  verifyApiKey,
} from '../index.js'
import { hashPlaintextToken } from '../utilities.js'

const makeRow = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'key_id_1',
  user_id: 'user-123',
  name: 'CI deploy key',
  hashed_token: 'placeholder',
  masked: 'sk_…ABCD',
  scopes: ['deploy:write'],
  last_used_at: null,
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
    expect(resource.tableName).toBe('api_keys')
    expect(resource.name).toBe('ApiKey')
  })
})

describe('createApiKey', () => {
  it('persists a hashed token and returns the plaintext exactly once', async () => {
    let storedHash = ''
    mockCreate.mockImplementationOnce(async (_table, data) => {
      storedHash = data.hashed_token as string
      return { data: makeRow({ hashed_token: storedHash, masked: data.masked }), affected: 1 }
    })

    const result = await createApiKey({
      user_id: 'user-123',
      name: 'CI deploy key',
      scopes: ['deploy:write'],
    })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const [tableName, data] = mockCreate.mock.calls[0]
    expect(tableName).toBe('api_keys')
    expect(data.user_id).toBe('user-123')
    expect(data.name).toBe('CI deploy key')
    expect(data.scopes).toEqual(['deploy:write'])
    expect(data.last_used_at).toBeNull()
    expect(data.expires_at).toBeNull()
    expect(data.revoked_at).toBeNull()
    expect(data.version).toBe(1)

    // The stored hash matches SHA-256 of the returned plaintext.
    expect(data.hashed_token).toBe(hashPlaintextToken(result.plaintext))

    // Plaintext is never persisted directly.
    expect(JSON.stringify(data)).not.toContain(result.plaintext)
    expect(result.apiKey.hashed_token).not.toBe(result.plaintext)

    // Masked string is non-empty and contains the configured prefix.
    expect(result.apiKey.masked.length).toBeGreaterThan(0)
    expect(result.apiKey.masked).toContain('…')
  })

  it('honours an explicit prefix', async () => {
    mockCreate.mockResolvedValueOnce({ data: makeRow({ masked: 'sk_live_…ABCD' }), affected: 1 })

    const result = await createApiKey({
      user_id: 'user-123',
      name: 'live deploy',
      prefix: 'sk_live_',
    })

    expect(result.plaintext.startsWith('sk_live_')).toBe(true)
    const [, data] = mockCreate.mock.calls[0]
    expect((data.masked as string).startsWith('sk_live_')).toBe(true)
  })

  it('throws when create returns no row', async () => {
    mockCreate.mockResolvedValueOnce({ data: null, affected: 0 })
    await expect(createApiKey({ user_id: 'user-123', name: 'x' })).rejects.toThrow(
      /Failed to create API key/,
    )
  })

  it('returns a fresh plaintext on every call (plaintext-returned-only-once contract)', async () => {
    mockCreate.mockResolvedValue({ data: makeRow(), affected: 1 })
    const a = await createApiKey({ user_id: 'u', name: 'a' })
    const b = await createApiKey({ user_id: 'u', name: 'b' })
    expect(a.plaintext).not.toBe(b.plaintext)
  })
})

describe('verifyApiKey', () => {
  it('returns the row when the hash matches and key is active', async () => {
    const plaintext = 'sk_test_PLAINTEXTBLABLABLA1234'
    const hashed = hashPlaintextToken(plaintext)
    mockFindOne.mockResolvedValueOnce(makeRow({ hashed_token: hashed }))

    const result = await verifyApiKey(plaintext)

    expect(result).not.toBeNull()
    expect(result?.user_id).toBe('user-123')
    expect(mockFindOne).toHaveBeenCalledWith('api_keys', [
      { field: 'hashed_token', operator: '=', value: hashed },
    ])
  })

  it('returns null when no row matches', async () => {
    mockFindOne.mockResolvedValueOnce(null)
    expect(await verifyApiKey('sk_nope')).toBeNull()
  })

  it('returns null for empty/missing input (no pre-hash early exit)', async () => {
    // Verify still hits the data store — this is the "no pre-hash early
    // exit" contract from the design note. An attacker cannot distinguish
    // "malformed input" from "valid-but-unknown" by timing.
    mockFindOne.mockResolvedValue(null)
    expect(await verifyApiKey('')).toBeNull()
    // @ts-expect-error invalid input
    expect(await verifyApiKey(null)).toBeNull()
    expect(mockFindOne).toHaveBeenCalledTimes(2)
  })

  it('returns null when the key has been revoked', async () => {
    const plaintext = 'sk_revoked_TOKEN_ABCD'
    const hashed = hashPlaintextToken(plaintext)
    mockFindOne.mockResolvedValueOnce(
      makeRow({ hashed_token: hashed, revoked_at: new Date('2026-04-01T00:00:00Z') }),
    )
    expect(await verifyApiKey(plaintext)).toBeNull()
  })

  it('returns null when the key has expired', async () => {
    const plaintext = 'sk_expired_TOKEN_ABCD'
    const hashed = hashPlaintextToken(plaintext)
    mockFindOne.mockResolvedValueOnce(
      makeRow({ hashed_token: hashed, expires_at: new Date('2020-01-01T00:00:00Z') }),
    )
    expect(await verifyApiKey(plaintext)).toBeNull()
  })

  it('parses a JSON-string scopes column produced by some DataStore drivers', async () => {
    const plaintext = 'sk_json_scopes_TOKEN_ABCD'
    const hashed = hashPlaintextToken(plaintext)
    mockFindOne.mockResolvedValueOnce(
      makeRow({ hashed_token: hashed, scopes: JSON.stringify(['a', 'b']) }),
    )

    const result = await verifyApiKey(plaintext)
    expect(result?.scopes).toEqual(['a', 'b'])
  })
})

describe('recordApiKeyUse', () => {
  it('updates last_used_at on the targeted row', async () => {
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await recordApiKeyUse('key_id_1')

    expect(mockUpdateById).toHaveBeenCalledTimes(1)
    const [tableName, id, data] = mockUpdateById.mock.calls[0]
    expect(tableName).toBe('api_keys')
    expect(id).toBe('key_id_1')
    expect(data.last_used_at).toBeInstanceOf(Date)
  })
})

describe('revokeApiKey', () => {
  it('sets revoked_at on the targeted row', async () => {
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await revokeApiKey('key_id_1')

    expect(mockUpdateById).toHaveBeenCalledTimes(1)
    const [tableName, id, data] = mockUpdateById.mock.calls[0]
    expect(tableName).toBe('api_keys')
    expect(id).toBe('key_id_1')
    expect(data.revoked_at).toBeInstanceOf(Date)
  })
})

describe('rotateApiKey', () => {
  it('revokes the old key, issues a fresh plaintext, inherits scopes/expiration', async () => {
    const oldRow = makeRow({
      id: 'old_id',
      scopes: ['scope:a', 'scope:b'],
      expires_at: new Date('2030-01-01T00:00:00Z'),
    })
    mockFindById.mockResolvedValueOnce(oldRow)
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    mockCreate.mockResolvedValueOnce({ data: makeRow({ id: 'new_id' }), affected: 1 })

    const result = await rotateApiKey('old_id')

    // Old row revoked.
    expect(mockUpdateById).toHaveBeenCalledTimes(1)
    expect(mockUpdateById.mock.calls[0][1]).toBe('old_id')
    expect(mockUpdateById.mock.calls[0][2]).toHaveProperty('revoked_at')

    // New row created with inherited fields.
    expect(mockCreate).toHaveBeenCalledTimes(1)
    const [, data] = mockCreate.mock.calls[0]
    expect(data.user_id).toBe('user-123')
    expect(data.name).toBe('CI deploy key')
    expect(data.scopes).toEqual(['scope:a', 'scope:b'])
    expect(data.expires_at).toEqual(new Date('2030-01-01T00:00:00Z'))

    // Fresh plaintext returned.
    expect(typeof result.plaintext).toBe('string')
    expect(result.plaintext.length).toBeGreaterThan(0)
    expect(result.apiKey.id).toBe('new_id')
  })

  it('throws when the original key cannot be found', async () => {
    mockFindById.mockResolvedValueOnce(null)
    await expect(rotateApiKey('missing')).rejects.toThrow(/not found/)
  })
})

describe('full lifecycle: create → verify → use → rotate → revoke → reject', () => {
  it('walks the happy path end-to-end', async () => {
    // 1. CREATE
    let storedHash = ''
    let createdRow: Record<string, unknown> = {}
    mockCreate.mockImplementationOnce(async (_table, data) => {
      storedHash = data.hashed_token as string
      createdRow = makeRow({
        id: 'key_id_1',
        hashed_token: storedHash,
        masked: data.masked,
        scopes: data.scopes,
      })
      return { data: createdRow, affected: 1 }
    })
    const created = await createApiKey({
      user_id: 'user-123',
      name: 'CI deploy key',
      scopes: ['deploy:write'],
    })

    // 2. VERIFY (active)
    mockFindOne.mockResolvedValueOnce(createdRow)
    const verified = await verifyApiKey(created.plaintext)
    expect(verified).not.toBeNull()
    expect(verified?.id).toBe('key_id_1')

    // 3. USE
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await recordApiKeyUse(verified!.id)
    expect(mockUpdateById.mock.calls.at(-1)?.[2]).toHaveProperty('last_used_at')

    // 4. ROTATE — old revoked, new key issued.
    mockFindById.mockResolvedValueOnce(createdRow)
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 }) // revoke old
    let rotatedHash = ''
    let rotatedRow: Record<string, unknown> = {}
    mockCreate.mockImplementationOnce(async (_table, data) => {
      rotatedHash = data.hashed_token as string
      rotatedRow = makeRow({
        id: 'key_id_2',
        hashed_token: rotatedHash,
        masked: data.masked,
        scopes: data.scopes,
      })
      return { data: rotatedRow, affected: 1 }
    })
    const rotated = await rotateApiKey(created.apiKey.id)
    expect(rotated.plaintext).not.toBe(created.plaintext)
    expect(rotated.apiKey.id).toBe('key_id_2')

    // 5. VERIFY old plaintext — should now be REJECTED because old row is revoked.
    const revokedOldRow = { ...createdRow, revoked_at: new Date() }
    mockFindOne.mockResolvedValueOnce(revokedOldRow)
    expect(await verifyApiKey(created.plaintext)).toBeNull()

    // 6. REVOKE the new key, then verify — REJECTED.
    mockUpdateById.mockResolvedValueOnce({ data: null, affected: 1 })
    await revokeApiKey(rotated.apiKey.id)

    const revokedRotatedRow = { ...rotatedRow, revoked_at: new Date() }
    mockFindOne.mockResolvedValueOnce(revokedRotatedRow)
    expect(await verifyApiKey(rotated.plaintext)).toBeNull()
  })
})
