/**
 * API key service. Provides the public lifecycle operations for hashed,
 * scoped, optionally-expiring API tokens.
 *
 * All persistence flows through the abstract {@link DataStore} from
 * `@molecule/api-database` — no raw SQL is issued from this module.
 *
 * @module
 */

import { create, findById, findOne, updateById } from '@molecule/api-database'

import { resource } from './resource.js'
import type { ApiKey, CreateApiKeyInput, CreateApiKeyResult } from './types.js'
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
interface ApiKeyRow {
  id: string
  user_id: string
  name: string
  hashed_token: string
  masked: string
  scopes: string[] | string
  last_used_at: string | Date | null
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

/** Normalize a database row into the public {@link ApiKey} shape. */
const normalize = (row: ApiKeyRow): ApiKey => ({
  id: row.id,
  user_id: row.user_id,
  name: row.name,
  hashed_token: row.hashed_token,
  masked: row.masked,
  scopes: toScopes(row.scopes),
  last_used_at: toDate(row.last_used_at),
  expires_at: toDate(row.expires_at),
  created_at: toDateRequired(row.created_at),
  revoked_at: toDate(row.revoked_at),
  version: (row.version === 1 ? 1 : 1) as 1,
})

/**
 * Create a new API key. Generates a fresh plaintext token, hashes it
 * with SHA-256, persists the row, and returns BOTH the persisted record
 * and the plaintext.
 *
 * The plaintext is returned exactly once — callers MUST surface it
 * immediately to the user (or store it in their own vault). It cannot
 * be recovered after this call returns.
 *
 * @param input - Creation parameters.
 * @returns The persisted {@link ApiKey} plus its plaintext token.
 */
export const createApiKey = async (input: CreateApiKeyInput): Promise<CreateApiKeyResult> => {
  const prefix = input.prefix ?? DEFAULT_PREFIX
  const plaintext = generatePlaintextToken(prefix)
  const hashed = hashPlaintextToken(plaintext)
  const masked = maskPlaintextToken(plaintext, prefix)

  const result = await create<ApiKeyRow>(tableName, {
    user_id: input.user_id,
    name: input.name,
    hashed_token: hashed,
    masked,
    scopes: input.scopes ?? [],
    last_used_at: null,
    expires_at: input.expires_at ?? null,
    revoked_at: null,
    version: CURRENT_HASH_VERSION,
  })

  if (!result.data) {
    throw new Error('Failed to create API key')
  }

  return {
    apiKey: normalize(result.data),
    plaintext,
  }
}

/**
 * Rotate an existing API key. Revokes the old row and creates a fresh
 * key (new plaintext, new hash, new masked) that inherits the original
 * key's `user_id`, `name`, `scopes`, and `expires_at`.
 *
 * The freshly generated plaintext is returned exactly once.
 *
 * @param id - ID of the existing key to rotate.
 * @returns The new {@link ApiKey} plus its plaintext token.
 */
export const rotateApiKey = async (id: string): Promise<CreateApiKeyResult> => {
  const existing = await findById<ApiKeyRow>(tableName, id)
  if (!existing) {
    throw new Error('API key not found')
  }

  await updateById(tableName, id, { revoked_at: new Date() })

  const previous = normalize(existing)
  return createApiKey({
    user_id: previous.user_id,
    name: previous.name,
    scopes: previous.scopes,
    expires_at: previous.expires_at ?? undefined,
  })
}

/**
 * Revoke an API key. Sets `revoked_at` to the current time. Subsequent
 * calls to {@link verifyApiKey} with the matching plaintext will return
 * `null`.
 *
 * @param id - ID of the key to revoke.
 */
export const revokeApiKey = async (id: string): Promise<void> => {
  await updateById(tableName, id, { revoked_at: new Date() })
}

/**
 * Verify a plaintext API key. Hashes the input, looks up the row by
 * hash, then constant-time-compares the stored hash against the
 * recomputed hash before performing any short-circuit return.
 *
 * Returns `null` if the key is not found, has been revoked, or is
 * past its expiration.
 *
 * @param plaintext - The plaintext token to verify.
 * @returns The matching {@link ApiKey}, or `null` if no valid match exists.
 */
export const verifyApiKey = async (plaintext: string): Promise<ApiKey | null> => {
  // No pre-hash early exit — even malformed input goes through the hash
  // step so attackers cannot distinguish "wrong shape" vs "wrong value"
  // by timing. The string-coerce keeps `hashPlaintextToken` happy on
  // unusual inputs (null/undefined etc.).
  const safe = typeof plaintext === 'string' ? plaintext : ''
  const hashed = hashPlaintextToken(safe)

  const row = await findOne<ApiKeyRow>(tableName, [
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
 * Record that an API key was just used to authenticate. Sets
 * `last_used_at` to the current time.
 *
 * @param id - ID of the key that was used.
 */
export const recordApiKeyUse = async (id: string): Promise<void> => {
  await updateById(tableName, id, { last_used_at: new Date() })
}
