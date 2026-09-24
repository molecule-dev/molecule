/**
 * JSON Web Token provider using jsonwebtoken for molecule.dev.
 *
 * Implements the `@molecule/api-jwt` `JwtProvider` contract (`sign`,
 * `verify`, `decode`) as a thin wrapper over the `jsonwebtoken` library.
 * Key sourcing, algorithms, and usage rules live in `@molecule/api-jwt` —
 * its convenience functions supply `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`
 * (env-provided or self-generated) automatically.
 *
 * @example
 * ```typescript
 * import { type JwtPayload, setProvider, sign, verify } from '@molecule/api-jwt'
 * import { provider } from '@molecule/api-jwt-jsonwebtoken'
 *
 * // Startup: bond once. Keys come from JWT_PRIVATE_KEY / JWT_PUBLIC_KEY (PEM, RS256 by
 * // default) or an auto-generated pair under JWT_KEYS_DIR — never pass them from app code.
 * setProvider(provider)
 *
 * // A CUSTOM signed link (the session JWT is already handled by verifyMiddleware).
 * const token = sign({ purpose: 'password-reset', userId: 'u_123' }, { expiresIn: '30m' })
 *
 * // verify() checks the signature AND expiry — and THROWS on failure.
 * function readResetToken(candidate: string): string | null {
 *   try {
 *     const claims = verify(candidate) as JwtPayload
 *     return claims.purpose === 'password-reset' && typeof claims.userId === 'string'
 *       ? claims.userId
 *       : null
 *   } catch (_error) {
 *     // Expired, forged or malformed link — the caller shows "link invalid".
 *     return null
 *   }
 * }
 *
 * readResetToken(token) // 'u_123'
 * readResetToken(`${token}x`) // null — signature no longer matches
 * ```
 *
 * @remarks
 * - **`verify()` force-enables expiry and not-before checks** — any
 *   `ignoreExpiration`/`ignoreNotBefore` passed in options is overridden
 *   (deliberate hardening: an expired token ALWAYS fails). Don't build
 *   accept-expired-token flows on this bond; issue short-lived tokens and
 *   refresh instead (see the core's refresh recipe).
 * - Call the CORE's `sign`/`verify`/`decode` from `@molecule/api-jwt` after
 *   `setProvider(provider)` — there is no `createProvider()` and no
 *   `bond('jwt-jsonwebtoken', ...)`. `decode()` does NOT verify the signature.
 * - `expiresIn` as a number is SECONDS; strings use `ms` units (`'30m'`, `'7d'`).
 *   Re-signing verified claims throws unless you strip `exp`/`iat` first.
 * - Provider-level `sign`/`verify` throw if called without a key argument;
 *   the core's convenience wrappers inject the keys — call those, not the
 *   provider methods, unless you are supplying custom keys.
 *
 * @see https://www.npmjs.com/package/jsonwebtoken
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
