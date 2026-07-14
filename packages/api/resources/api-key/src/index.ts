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
 * The `setup/api_keys.sql` migration file ships with this package and
 * must be applied to the target database before use.
 *
 * @module `@molecule/api-resource-api-key`
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './resource.js'
export * from './service.js'
export * from './types.js'
export * from './utilities.js'
