/**
 * Hashed API tokens with scopes, masking, rotation, revocation, and
 * last-used tracking. Mirrors the shape of `@molecule/api-resource-payment`
 * — apps depend on this package directly and read/write through the
 * abstract `DataStore` from `@molecule/api-database`.
 *
 * @example
 * ```typescript
 * import { createApiKey, verifyApiKey, recordApiKeyUse } from '@molecule/api-resource-api-key'
 *
 * // Issue a new key. The plaintext is returned exactly ONCE.
 * const { apiKey, plaintext } = await createApiKey({
 *   user_id: user.id,
 *   name: 'CI deploy key',
 *   scopes: ['deploy:write'],
 * })
 *
 * // Later — incoming request bearing the plaintext token:
 * const verified = await verifyApiKey(plaintext)
 * if (verified) await recordApiKeyUse(verified.id)
 * ```
 *
 * @remarks
 * - **Migration required.** The `setup/api_keys.sql` migration file ships with
 *   this package and must be applied to the target database before use.
 * - **No routes ship — you own the HTTP surface AND the ownership checks.** The
 *   service functions are deliberately auth-agnostic: `rotateApiKey(id)` and
 *   `revokeApiKey(id)` act on any id. Every endpoint you expose must
 *   authenticate AND verify the key's `user_id` matches the caller before
 *   acting — exposing them keyed by `:id` alone is an IDOR.
 * - **Never send `hashed_token` to a client** — return `masked` for display. The
 *   plaintext exists exactly once, in the `createApiKey`/`rotateApiKey` result;
 *   surface it immediately or it is unrecoverable.
 * - **Scopes are stored, not enforced.** `verifyApiKey()` only proves the token
 *   is valid, unexpired, and unrevoked — YOUR auth middleware must check
 *   `verified.scopes` against the scope each route requires.
 * - Call `recordApiKeyUse(verified.id)` after a successful authentication if you
 *   want `last_used_at` accuracy — it is not automatic.
 *
 * @module `@molecule/api-resource-api-key`
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './resource.js'
export * from './service.js'
export * from './types.js'
export * from './utilities.js'
