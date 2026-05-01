/**
 * Device auth token service. Provides the public lifecycle operations
 * for hashed, scoped, optionally-expiring per-device bearer tokens.
 *
 * All persistence flows through the abstract {@link DataStore} from
 * `@molecule/api-database` — no raw SQL is issued from this module.
 *
 * @module
 */

import { create, findById, findMany, findOne, updateById } from '@molecule/api-database'

import { resource } from './resource.js'
import type { DeviceAuthToken, IssueTokenInput, IssueTokenResult } from './types.js'
import {
  constantTimeEqual,
  DEFAULT_PREFIX,
  generatePlaintextToken,
  hashPlaintextToken,
  maskPlaintextToken,
} from './utilities.js'

const { tableName } = resource

/** Current hash algorithm version written to new rows. */
const CURRENT_HASH_VERSION = 1

/** Shape of the row as it lives in the database. Timestamps may arrive as strings. */
interface DeviceAuthTokenRow {
  id: string
  device_id: string
  hashed_token: string
  masked: string
  scopes: string[] | string
  last_used_at: string | Date | null
  last_used_ip: string | null
  expires_at: string | Date | null
  created_at: string | Date
  revoked_at: string | Date | null
  version: number
}

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (value === null || value === undefined) return null
  return value instanceof Date ? value : new Date(value)
}

const toDateRequired = (value: string | Date | null | undefined): Date => {
  const result = toDate(value)
  return result ?? new Date(0)
}

const toScopes = (value: string[] | string | null | undefined): string[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

/** Normalize a database row into the public {@link DeviceAuthToken} shape. */
const normalize = (row: DeviceAuthTokenRow): DeviceAuthToken => ({
  id: row.id,
  device_id: row.device_id,
  hashed_token: row.hashed_token,
  masked: row.masked,
  scopes: toScopes(row.scopes),
  last_used_at: toDate(row.last_used_at),
  last_used_ip: row.last_used_ip ?? null,
  expires_at: toDate(row.expires_at),
  created_at: toDateRequired(row.created_at),
  revoked_at: toDate(row.revoked_at),
  version: (row.version === 1 ? 1 : 1) as 1,
})

/**
 * Issue a new device auth token. Generates a fresh plaintext, hashes it
 * with SHA-256, persists the row, and returns BOTH the persisted record
 * and the plaintext.
 *
 * The plaintext is returned exactly once — callers MUST surface it
 * immediately to the device (or store it in their own provisioning
 * vault). It cannot be recovered after this call returns.
 *
 * @param input - Issuance parameters.
 * @returns The persisted {@link DeviceAuthToken} plus its plaintext token.
 */
export const issueToken = async (input: IssueTokenInput): Promise<IssueTokenResult> => {
  const prefix = input.prefix ?? DEFAULT_PREFIX
  const plaintext = generatePlaintextToken(prefix)
  const hashed = hashPlaintextToken(plaintext)
  const masked = maskPlaintextToken(plaintext, prefix)

  const result = await create<DeviceAuthTokenRow>(tableName, {
    device_id: input.device_id,
    hashed_token: hashed,
    masked,
    scopes: input.scopes ?? [],
    last_used_at: null,
    last_used_ip: null,
    expires_at: input.expires_at ?? null,
    revoked_at: null,
    version: CURRENT_HASH_VERSION,
  })

  if (!result.data) {
    throw new Error('Failed to issue device auth token')
  }

  return {
    token: normalize(result.data),
    plaintext,
  }
}

/**
 * Verify a plaintext device auth token. Hashes the input, looks up the
 * row by hash, then constant-time-compares the stored hash against the
 * recomputed hash before performing any short-circuit return.
 *
 * Returns `null` if the token is not found, has been revoked, or is
 * past its expiration.
 *
 * @param plaintext - The plaintext token to verify.
 * @returns The matching {@link DeviceAuthToken}, or `null` if no valid match exists.
 */
export const verifyToken = async (plaintext: string): Promise<DeviceAuthToken | null> => {
  // No pre-hash early exit — even malformed input goes through the hash
  // step so attackers cannot distinguish "wrong shape" vs "wrong value"
  // by timing. The string-coerce keeps `hashPlaintextToken` happy on
  // unusual inputs (null/undefined etc.).
  const safe = typeof plaintext === 'string' ? plaintext : ''
  const hashed = hashPlaintextToken(safe)

  const row = await findOne<DeviceAuthTokenRow>(tableName, [
    { field: 'hashed_token', operator: '=', value: hashed },
  ])

  if (!row) return null

  // Constant-time comparison even though we already filtered by hashed
  // value — defense in depth in case of weird DataStore implementations.
  if (!constantTimeEqual(row.hashed_token, hashed)) return null

  const normalized = normalize(row)

  if (normalized.revoked_at !== null) return null
  if (normalized.expires_at !== null && normalized.expires_at.getTime() <= Date.now()) {
    return null
  }

  return normalized
}

/**
 * Revoke a device auth token. Sets `revoked_at` to the current time.
 * Subsequent calls to {@link verifyToken} with the matching plaintext
 * will return `null`.
 *
 * @param tokenId - ID of the token to revoke.
 */
export const revokeToken = async (tokenId: string): Promise<void> => {
  await updateById(tableName, tokenId, { revoked_at: new Date() })
}

/**
 * Record that a device auth token was just used to authenticate. Sets
 * `last_used_at` to the current time and (optionally) updates
 * `last_used_ip`.
 *
 * @param tokenId - ID of the token that was used.
 * @param ip - Optional IP address to record.
 */
export const recordTokenUse = async (tokenId: string, ip?: string): Promise<void> => {
  const data: Record<string, unknown> = { last_used_at: new Date() }
  if (typeof ip === 'string' && ip.length > 0) {
    data.last_used_ip = ip
  }
  await updateById(tableName, tokenId, data)
}

/**
 * List all auth tokens for a given device, newest first.
 *
 * @param deviceId - ID of the device to enumerate tokens for.
 * @returns Array of {@link DeviceAuthToken} rows. Empty if none exist.
 */
export const listTokens = async (deviceId: string): Promise<DeviceAuthToken[]> => {
  const rows = await findMany<DeviceAuthTokenRow>(tableName, {
    where: [{ field: 'device_id', operator: '=', value: deviceId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  return rows.map(normalize)
}

/**
 * Rotate an existing device auth token. Revokes the old row and issues
 * a fresh token (new plaintext, new hash, new masked) that inherits the
 * original token's `device_id`, `scopes`, and `expires_at`.
 *
 * The freshly generated plaintext is returned exactly once.
 *
 * @param tokenId - ID of the existing token to rotate.
 * @returns The new {@link DeviceAuthToken} plus its plaintext token.
 */
export const rotateToken = async (tokenId: string): Promise<IssueTokenResult> => {
  const existing = await findById<DeviceAuthTokenRow>(tableName, tokenId)
  if (!existing) {
    throw new Error('Device auth token not found')
  }

  await updateById(tableName, tokenId, { revoked_at: new Date() })

  const previous = normalize(existing)
  return issueToken({
    device_id: previous.device_id,
    scopes: previous.scopes,
    expires_at: previous.expires_at ?? undefined,
  })
}
