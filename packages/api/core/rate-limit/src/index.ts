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
 * - `skipFailedRequests`/`skipSuccessfulRequests` on {@link RateLimitOptions} are honored by
 *   `createRateLimitMiddleware`: after the response completes, a request whose final status
 *   matches the flag (`>= 400` for failed, `< 400` for successful) has its consumed token
 *   refunded via the provider's `refund()`, so it isn't counted. They apply ONLY through the
 *   middleware — calling `consume()` directly cannot know the outcome and rolls nothing back.
 * - On rejection respond 429 with `Retry-After` (the middleware does this and sets the
 *   standard `RateLimit-*` headers from {@link RateLimitResult}).
 *
 * @e2e
 * Integration checklist — exercise the REAL behavior end-to-end (drive the
 * protected app action in the live preview, no mocks), adapt each item to this
 * app's actual screens/flows, and check every box off one by one. A box you
 * can't check is an integration bug to fix — not a skip:
 * - [ ] The limit is actually ENFORCED on the route: driving the protected
 *   action up to `RateLimitOptions.max` times succeeds, and the NEXT request
 *   within `windowMs` is REJECTED with the provider's limited response (HTTP
 *   429 + `Retry-After` from `createRateLimitMiddleware`) — not silently
 *   allowed. THE #1 TRAP: the middleware is defined but never actually mounted
 *   on the route (or `consume(key)` is never called in the handler), so nothing
 *   is limited.
 * - [ ] The limit is bucketed by the RIGHT identity — the `consume(key)` /
 *   middleware `req.ip` key is per-user (or per-IP for anon), NOT one GLOBAL
 *   bucket: two different users/IPs have INDEPENDENT budgets (user B is not
 *   throttled by user A's traffic), and a per-user limit is not trivially
 *   bypassed by rotating an unauthenticated path. A global bucket for a
 *   per-user limit is both a DoS vector and a correctness bug.
 * - [ ] `RateLimitResult.remaining` (and `getRemaining(key)`) decrements
 *   accurately with each `consume` and reads what's left, and
 *   `RateLimitResult.resetAt` reports when the current window resets.
 * - [ ] The window RESETS: after `RateLimitOptions.windowMs` elapses (or
 *   `reset(key)` is called) the budget is restored and the action succeeds
 *   again — a limit is never permanent.
 * - [ ] The rejection is graceful and observable: the UI surfaces a "too many
 *   requests / try again" state (ideally using `RateLimitResult.resetAt` /
 *   `retryAfter`), not a blank error or a stuck spinner.
 * - [ ] `consume` is atomic under concurrency: N simultaneous requests cannot
 *   all slip through above `RateLimitOptions.max` (no `check`-then-`consume`
 *   race that lets the budget be exceeded).
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
