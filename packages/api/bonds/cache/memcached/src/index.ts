/**
 * Memcached cache provider for molecule.dev.
 *
 * @remarks
 * - `ttl` always means "seconds from now": TTLs beyond memcached's 30-day relative limit
 *   are converted to the absolute unix timestamp the protocol expects (a raw value over
 *   2592000s would otherwise be read as a 1970s timestamp and expire immediately).
 * - **Reads are best-effort:** if the memcached server is unreachable, `get()`/`has()`
 *   log the error and return `undefined`/`false` — indistinguishable from a cache miss
 *   at the call site (check the logs). Writes (`set`/`clear`) throw instead.
 * - Memcached keys must be ≤250 characters with no spaces or control characters
 *   (including the `molecule:` prefix this provider prepends); violating keys error.
 *
 * @see https://www.npmjs.com/package/memcached
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
