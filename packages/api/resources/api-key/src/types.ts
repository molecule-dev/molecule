/**
 * API key resource type definitions.
 *
 * @module
 */

/**
 * The hash algorithm version stored on each row. Allows future
 * migration from SHA-256 to a stronger algorithm without breaking
 * verification of existing keys.
 */
export type ApiKeyHashVersion = 1

/**
 * A persisted API key record. The plaintext token is never stored —
 * only its SHA-256 hash. The plaintext is returned exactly once at
 * creation/rotation time.
 */
export interface ApiKey {
  /** Primary key (UUID). */
  id: string
  /** ID of the user that owns this key. */
  user_id: string
  /** Human-readable label for the key (e.g. "CI deploy key"). */
  name: string
  /** SHA-256 hash of the plaintext token (hex). */
  hashed_token: string
  /** Display string safe to surface in UIs (e.g. `sk_live_…ABCD`). */
  masked: string
  /** Permission scopes granted to this key. */
  scopes: string[]
  /** Last time the key was successfully used to authenticate, or null. */
  last_used_at: Date | null
  /** Optional expiration timestamp. Null means never expires. */
  expires_at: Date | null
  /** Creation timestamp. */
  created_at: Date
  /** When the key was revoked, or null if still active. */
  revoked_at: Date | null
  /** Hash algorithm version — used for future migration paths. */
  version: ApiKeyHashVersion
}

/**
 * Result of {@link createApiKey} / {@link rotateApiKey}. The plaintext
 * token is returned exactly ONCE in this object — callers must persist
 * or display it immediately, because it cannot be recovered later.
 */
export interface CreateApiKeyResult {
  /** The freshly persisted API key record. */
  apiKey: ApiKey
  /** The plaintext token. Returned exactly once. */
  plaintext: string
}

/**
 * Input shape for {@link createApiKey}.
 */
export interface CreateApiKeyInput {
  /** ID of the user to own the new key. */
  user_id: string
  /** Human-readable label for the key. */
  name: string
  /** Permission scopes for the key. Defaults to an empty array. */
  scopes?: string[]
  /** Optional expiration time. Null/undefined means never expires. */
  expires_at?: Date
  /**
   * Optional token prefix for masked display (e.g. `'sk_live_'`).
   * Defaults to `'sk_'`.
   */
  prefix?: string
}

/**
 * Resource definition for use with the standard molecule resource registry.
 */
export interface Resource {
  name: string
  tableName: string
  schema: unknown
}
