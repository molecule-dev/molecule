/**
 * Device auth token resource type definitions.
 *
 * @module
 */

/**
 * The hash algorithm version stored on each row. Allows future
 * migration from SHA-256 to a stronger algorithm without breaking
 * verification of existing tokens.
 */
export type DeviceAuthTokenHashVersion = 1

/**
 * A persisted device auth token record. The plaintext token is never
 * stored — only its SHA-256 hash. The plaintext is returned exactly
 * once at issue/rotation time.
 */
export interface DeviceAuthToken {
  /** Primary key (UUID). */
  id: string
  /** ID of the device that owns this token. */
  device_id: string
  /** SHA-256 hash of the plaintext token (hex). */
  hashed_token: string
  /** Display string safe to surface in UIs (e.g. `dvt_…ABCD`). */
  masked: string
  /** Permission scopes granted to this token. */
  scopes: string[]
  /** Last time the token was successfully used to authenticate, or null. */
  last_used_at: Date | null
  /** Last IP address that used this token, or null. */
  last_used_ip: string | null
  /** Optional expiration timestamp. Null means never expires. */
  expires_at: Date | null
  /** Creation timestamp. */
  created_at: Date
  /** When the token was revoked, or null if still active. */
  revoked_at: Date | null
  /** Hash algorithm version — used for future migration paths. */
  version: DeviceAuthTokenHashVersion
}

/**
 * Result of {@link issueToken} / {@link rotateToken}. The plaintext
 * token is returned exactly ONCE in this object — callers must persist
 * or display it immediately, because it cannot be recovered later.
 */
export interface IssueTokenResult {
  /** The freshly persisted device auth token record. */
  token: DeviceAuthToken
  /** The plaintext token. Returned exactly once. */
  plaintext: string
}

/**
 * Input shape for {@link issueToken}.
 */
export interface IssueTokenInput {
  /** ID of the device to own the new token. */
  device_id: string
  /** Permission scopes for the token. Defaults to an empty array. */
  scopes?: string[]
  /** Optional expiration time. Null/undefined means never expires. */
  expires_at?: Date
  /**
   * Optional token prefix for masked display (e.g. `'dvt_live_'`).
   * Defaults to `'dvt_'`.
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
