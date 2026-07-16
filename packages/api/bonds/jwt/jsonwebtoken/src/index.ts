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
 * import { setProvider } from '@molecule/api-jwt'
 * import { provider } from '@molecule/api-jwt-jsonwebtoken'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **`verify()` force-enables expiry and not-before checks** — any
 *   `ignoreExpiration`/`ignoreNotBefore` passed in options is overridden
 *   (deliberate hardening: an expired token ALWAYS fails). Don't build
 *   accept-expired-token flows on this bond; issue short-lived tokens and
 *   refresh instead (see the core's refresh recipe).
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
