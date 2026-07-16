/**
 * Provider-agnostic rate-limiting interface for molecule.dev.
 *
 * Defines the `RateLimitProvider` interface for request throttling with
 * configurable windows, token consumption, and reset. Bond packages
 * (in-memory, Redis, etc.) implement this interface. Application code
 * uses the convenience functions (`check`, `consume`, `reset`, `getRemaining`)
 * which delegate to the bonded provider, or the Express middleware factory.
 *
 * @example
 * ```typescript
 * import { setProvider, consume, createRateLimitMiddleware } from '@molecule/api-rate-limit'
 * import { provider as memory } from '@molecule/api-rate-limit-memory'
 *
 * setProvider(memory)
 *
 * // Use convenience functions directly
 * const result = await consume('user:123')
 * if (!result.allowed) console.log('Rate limited, retry after', result.retryAfter)
 *
 * // Or as Express middleware
 * app.use(createRateLimitMiddleware({ windowMs: 60_000, max: 100 }))
 * ```
 *
 * @remarks
 * - **The memory bond is per-process.** Counters reset on restart and are NOT shared across
 *   instances — behind a load balancer each instance enforces its own budget. Use a
 *   shared-store bond (e.g. `@molecule/api-rate-limit-redis`) when running more than one
 *   process.
 * - **The middleware keys by `req.ip`.** Behind a reverse proxy every request can carry the
 *   proxy's address — enable your framework's proxy trust (e.g. Express
 *   `app.set('trust proxy', 1)`) so `req.ip` is the real client, or ALL users share one
 *   bucket.
 * - **One provider = one active config.** `createRateLimitMiddleware(options)` re-applies its
 *   options on every request, so stacking middlewares with different options makes them
 *   clobber each other's window/max — and both count against the same `req.ip` key. Mount ONE
 *   app-wide middleware; for a stricter limit on a sensitive endpoint (login, OTP, password
 *   reset) call `consume('login:' + identifier)` directly in that handler with its own
 *   namespaced key.
 * - Rate-limit auth endpoints by the attempted identifier (email/username), not only IP — a
 *   credential-stuffing attacker rotates IPs but reuses identifiers.
 * - `skipFailedRequests`/`skipSuccessfulRequests` on {@link RateLimitOptions} are not honored
 *   by the bundled middleware or bonds — do not rely on them.
 * - On rejection respond 429 with `Retry-After` (the middleware does this and sets the
 *   standard `RateLimit-*` headers from {@link RateLimitResult}).
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'

// Middleware exports
export * from './middleware.js'
