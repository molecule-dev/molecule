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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating a key surfaces the full plaintext token EXACTLY ONCE at
 *   creation (the `plaintext` returned by `createApiKey`) and never again.
 *   Reload the list and open the key's detail view: both show only `masked`
 *   (e.g. `sk_…ABCD`) plus metadata (name, scopes, created/last-used/expiry),
 *   never the full token. Confirm the raw key is unrecoverable — the DB stores
 *   `hashed_token` (a SHA-256 hash), so no view, endpoint, or API response can
 *   hand the plaintext back.
 * - [ ] Authenticating a real request with the plaintext works (`verifyApiKey`
 *   accepts it) and, after a successful call, the key's `last_used_at` updates
 *   in the UI — the app must call `recordApiKeyUse` on success, it is not
 *   automatic. An unknown or garbage token is rejected.
 * - [ ] Scopes are ENFORCED, not merely stored: a key limited to one scope is
 *   refused on an out-of-scope action while an in-scope action succeeds.
 *   `verifyApiKey` only proves the token is valid — your route/middleware MUST
 *   check `scopes` against what the route requires; a route that skips that
 *   check is the integration bug.
 * - [ ] An EXPIRED key (`expires_at` in the past) and a REVOKED key are each
 *   rejected with 401 immediately. Revoke a key while it is in active use and
 *   confirm the very next request bearing it fails mid-session — no grace
 *   window, no cached pass.
 * - [ ] Authorization holds both ways. A user manages only THEIR OWN keys:
 *   guessing another user's key `id` in the view/rotate/revoke endpoints is
 *   refused (no IDOR — `rotateApiKey`/`revokeApiKey` act on ANY id, so the
 *   route MUST match the key's `user_id` to the caller). And a valid key
 *   authenticates only as its owner — it can never be used to act as another
 *   user.
 * - [ ] Creating a key requires the user's OWN authenticated session: an
 *   unauthenticated caller cannot mint a key, and every created key is owned
 *   by the session that created it.
 *
 * @module `@molecule/api-resource-api-key`
 */

export * from './browser-guard.js'
export * from './i18n.js'
export * from './resource.js'
export * from './service.js'
export * from './types.js'
export * from './utilities.js'
