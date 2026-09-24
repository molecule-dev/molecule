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
 * import { setStore } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 * import { issueToken, recordTokenUse, verifyToken } from '@molecule/api-resource-device-auth-token'
 *
 * // Startup: bond the DataStore once (the postgresql bond reads DATABASE_URL).
 * setStore(store)
 *
 * // Provision a device the caller OWNS. The plaintext is returned exactly ONCE — hand it to the
 * // device now; store/display only `token.masked`.
 * const { token, plaintext } = await issueToken({
 *   device_id: 'device-42',
 *   scopes: ['telemetry:write'],
 *   expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // a Date, not a duration
 * })
 * console.log(token.masked) // e.g. 'dvt_…AbCd'
 *
 * // Later, in your device-auth middleware — the request's `Authorization: Bearer <token>`:
 * const verified = await verifyToken(plaintext) // null when unknown, revoked or expired
 * if (!verified || !verified.scopes.includes('telemetry:write')) {
 *   throw new Error('Forbidden') // scopes are NOT enforced for you
 * }
 * await recordTokenUse(verified.id, '203.0.113.7') // last_used_at / last_used_ip (not automatic)
 * ```
 *
 * @remarks
 * - **Bond the DataStore before any call.** Every service function goes through
 *   `@molecule/api-database`; without `setStore(...)` at startup they throw
 *   "DataStore not configured".
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
 * @e2e
 * Integration checklist — SECURITY-critical (session/token management). Drive
 * the real UI (live preview, no mocks), adapt each item to this app's actual
 * screens/flows, and check every box off one by one. A box you can't check is a
 * security bug to fix — not a skip:
 * - [ ] Logging in / provisioning a device issues a token and the raw plaintext
 *   is handed to the client EXACTLY ONCE (the `issueToken` result). Inspect the
 *   persisted row: it stores `hashed_token` (SHA-256 hex) + `masked` only —
 *   never the plaintext. Confirm the raw token is unrecoverable from anything
 *   the server stores or later returns.
 * - [ ] The user's "active sessions/devices" list shows each active token with
 *   its metadata — `masked`, `last_used_at` / `last_used_ip`, `created_at` — and
 *   a used token updates `last_used_at` (call `recordTokenUse` after auth). The
 *   `hashed_token` never appears in any response.
 * - [ ] Revoking a session invalidates it IMMEDIATELY: after `revokeToken`, the
 *   very next request bearing that token is rejected (401) — `verifyToken`
 *   returns null the instant `revoked_at` is set, with no grace window.
 * - [ ] Expiry is enforced: a token past `expires_at` is rejected (401) even
 *   though it was never revoked; a null-`expires_at` token keeps working.
 * - [ ] Rotation: `rotateToken` issues a fresh token (new plaintext/hash/masked,
 *   same device + scopes + expiry) AND revokes the old one. Replaying the
 *   rotated-out token afterward is rejected (401 — it is now revoked); only the
 *   new plaintext authenticates.
 * - [ ] AUTHORIZATION — a caller sees and revokes only THEIR OWN sessions:
 *   guessing another user's token id to view or revoke it is rejected. No routes
 *   ship, so your endpoint MUST authenticate the caller and check device/fleet
 *   ownership before `listTokens` / `revokeToken` / `rotateToken` (id-only
 *   exposure is an IDOR). A verified token authenticates ONLY as its owner.
 * - [ ] "Log out all other devices" revokes every session EXCEPT the current
 *   one: afterward every other token is rejected (401) while the current token
 *   still works.
 *
 * @module `@molecule/api-resource-device-auth-token`
 */

export * from './browser-guard.js'
export * from './resource.js'
export * from './service.js'
export * from './types.js'
export * from './utilities.js'
