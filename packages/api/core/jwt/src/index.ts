/**
 * JWT interface for molecule.dev.
 *
 * Provides an abstract JWT interface that can be backed by any JWT library.
 * Use `setProvider` to provide a concrete implementation
 * such as `@molecule/api-jwt-jsonwebtoken`.
 *
 * @remarks
 * **{@link verify} is the ONLY way to trust a token — {@link decode} does NOT check the
 * signature.** Never make an auth decision from `decode()`: an attacker can forge any
 * payload that `decode()` will happily return. Use `verify()` (it throws — catch it) for
 * anything security-relevant; `decode()` is only for reading a token you do NOT trust.
 *
 * - The signing key (private key / secret) is SERVER-SIDE only — never ship it to the
 *   browser. Only an asymmetric PUBLIC key may be published.
 * - A JWT payload is READABLE by anyone (base64, not encrypted) — never put a password,
 *   secret, or sensitive PII in it.
 * - Always set + honor expiry ({@link JWT_EXPIRES_TIME}); a non-expiring token can't be
 *   revoked.
 * - In a molecule app auth is ALREADY wired: the global `verifyMiddleware` verifies the JWT
 *   and populates `res.locals.session`, so a handler calls `getUserId(res)` — do NOT call
 *   `verify()`/`sign()` by hand for the session (see the `auth` skill). Use these directly
 *   only for a CUSTOM token, e.g. a signed email/reset link.
 * - **Re-signing decoded claims (refresh flows): strip `exp`/`iat` first.** `sign()`
 *   always sets `expiresIn` (default {@link JWT_EXPIRES_TIME}), and the underlying library
 *   throws (`Bad "options.expiresIn" option the payload already has an "exp" property`)
 *   when the payload still carries the old `exp` — so `const { exp, iat, ...claims } =
 *   verify(oldToken) as JwtPayload; sign(claims)` is the correct refresh shape.
 * - Set `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` together (or neither). If only the private
 *   key is set, the matching public key is DERIVED from it automatically; setting only the
 *   public key is for verify-only deployments.
 * - When neither key env var is set, a key pair is auto-generated on disk at
 *   `{JWT_KEYS_DIR}/{NODE_ENV}/` — default `JWT_KEYS_DIR`: `process.cwd() + '/.keys'`, a
 *   stable app-level directory (NOT inside `node_modules`, so `npm ci`/reinstall never
 *   wipes it). Set `JWT_KEYS_DIR` to relocate it (e.g. a persistent volume in production).
 *   A pre-existing pair at the legacy `node_modules`-relative location is migrated forward
 *   automatically (with a logged warning) instead of being silently regenerated.
 * - `JWT_ALGORITHM` (default `RS256`) is validated at module load against the
 *   {@link JwtAlgorithm} union; an unrecognized value (e.g. a typo like `rs256`) logs an
 *   actionable warning and falls back to `RS256` instead of failing every `sign()`/`verify()`
 *   call later with an opaque "invalid algorithm" error.
 *
 * @example
 * ```ts
 * import { sign, verify, decode } from '@molecule/api-jwt'
 *
 * const token = sign({ userId }, { expiresIn: '15m' }) // server-side; expiry set
 *
 * try {
 *   const claims = verify(token) as JwtPayload // signature CHECKED — safe to trust
 *   grantAccess(claims.userId)
 * } catch {
 *   res.status(401).json({ error: 'Invalid or expired token.' })
 * }
 *
 * decode(token) // NOT verified — never use its output for an auth decision
 * ```
 *
 * @module
 */

export * from './keys.js'
export * from './provider.js'
export * from './types.js'
