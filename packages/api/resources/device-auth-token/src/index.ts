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
 * The `src/__setup__/device_auth_tokens.sql` migration file ships with
 * this package and must be applied to the target database before use.
 *
 * @module `@molecule/api-resource-device-auth-token`
 */

export * from './browser-guard.js'
export * from './resource.js'
export * from './service.js'
export * from './types.js'
export * from './utilities.js'
