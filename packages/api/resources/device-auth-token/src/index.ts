/**
 * Per-device long-lived bearer tokens — hashed at rest, scoped,
 * revocable, with last-used tracking. Distinct from human user session
 * tokens.
 *
 * Apps depend on this package directly and read/write through the
 * abstract `DataStore` from `@molecule/api-database`. Mirrors
 * `@molecule/api-resource-api-key` but oriented at device entities for
 * headless device authentication (IoT fleets, smart home hubs,
 * monitoring agents).
 *
 * @example
 * ```typescript
 * import { issueToken, verifyToken, recordTokenUse } from '@molecule/api-resource-device-auth-token'
 *
 * // Issue a new token. The plaintext is returned exactly ONCE.
 * const { token, plaintext } = await issueToken({
 *   device_id: device.id,
 *   scopes: ['telemetry:write'],
 * })
 *
 * // Later — incoming request bearing the plaintext token:
 * const verified = await verifyToken(plaintext)
 * if (verified) await recordTokenUse(verified.id, request.ip)
 * ```
 *
 * @remarks
 * - **Migration required.** The `src/__setup__/device_auth_tokens.sql` migration
 *   file ships with this package and must be applied to the target database
 *   before use.
 * - **No routes ship — you own the HTTP surface AND the ownership checks.**
 *   `rotateToken(id)`, `revokeToken(id)`, and `listTokens(deviceId)` are
 *   auth-agnostic: any endpoint exposing them must authenticate the caller and
 *   verify the target device belongs to them (via your device/fleet ownership
 *   model) before acting — id-only exposure is an IDOR.
 * - **Never send `hashed_token` to a client** — return `masked`. The plaintext
 *   exists exactly once, in the `issueToken`/`rotateToken` result.
 * - **Scopes are stored, not enforced.** `verifyToken()` only proves the token is
 *   valid, unexpired, and unrevoked; your middleware must check
 *   `verified.scopes` per route. Call `recordTokenUse(verified.id, ip)` after
 *   successful auth if you want `last_used_at`/`last_used_ip` accuracy.
 *
 * @module `@molecule/api-resource-device-auth-token`
 */

export * from './browser-guard.js'
export * from './resource.js'
export * from './service.js'
export * from './types.js'
export * from './utilities.js'
