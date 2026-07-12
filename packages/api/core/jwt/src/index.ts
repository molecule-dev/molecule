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
