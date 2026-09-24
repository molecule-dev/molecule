/**
 * In-memory rate-limit provider for molecule.dev.
 *
 * Provides a fixed-window rate limiter backed by an in-memory `Map`.
 * Ideal for development, testing, and single-instance deployments.
 *
 * @example
 * ```typescript
 * import { configure, consume, setProvider } from '@molecule/api-rate-limit'
 * import { provider } from '@molecule/api-rate-limit-memory'
 *
 * // Startup: bond, then configure (windowMs is MILLISECONDS).
 * setProvider(provider)
 * configure({ windowMs: 60_000, max: 5, keyPrefix: 'myapp' })
 *
 * // e.g. inside a login handler — key by the ATTEMPTED identifier, not only the IP.
 * const attemptLogin = async (email: string) => {
 *   const limit = await consume(`login:${email.toLowerCase()}`)
 *   if (!limit.allowed) return { status: 429, retryAfter: limit.retryAfter } // SECONDS
 *   return { status: 200, remaining: limit.remaining }
 * }
 *
 * const results = []
 * for (let attempt = 0; attempt < 6; attempt++) results.push(await attemptLogin('Ada@example.com'))
 * // results[4] → { status: 200, remaining: 0 }; results[5] → { status: 429, retryAfter: 60 }
 * ```
 *
 * @remarks
 * - **Per-process only.** Counters live in this process's memory: lost on restart and NOT
 *   shared across instances — behind a load balancer each instance enforces its own budget.
 *   Use `@molecule/api-rate-limit-redis` when running more than one process.
 * - **There is no `createProvider()`** — `provider` is a module-level singleton, and
 *   `configure()` changes the window/max for EVERY key (defaults: 60 000 ms / 100).
 * - **Fixed window, not sliding:** a key's window starts at its first `consume()`/`check()`
 *   and resets fully when it ends, so up to `2 × max` can pass across a window boundary.
 * - A request whose `cost` would exceed `max` is rejected WITHOUT consuming anything.
 * - `keyPrefix` is joined with a colon (`myapp:login:ada@example.com`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
