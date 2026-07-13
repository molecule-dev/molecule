/**
 * Redis cache provider for molecule.dev.
 *
 * @remarks
 * - **`clear()` runs `FLUSHDB` — it wipes the ENTIRE Redis database**, not just keys under
 *   this provider's `keyPrefix`. Never call it on a Redis db shared with sessions, queues,
 *   or another app; prefer `deleteMany()`/`invalidateTag()` for scoped invalidation.
 * - **When Redis is unreachable, commands do not fail fast** — ioredis queues them offline
 *   and retries (default `maxRetriesPerRequest: 20`, ~10s+ per command) before rejecting.
 *   A "cache miss" and "Redis down" therefore feel very different to callers: one is
 *   instant `undefined`, the other is a long stall then a thrown error. Pass ioredis
 *   options via `createClient`/`REDIS_URL` tuning if you need fail-fast cache semantics.
 * - Tag index sets (`_tag:<tag>`) are stored WITHOUT a TTL: they persist until
 *   `invalidateTag()` is called, even after all tagged entries expire.
 *
 * @see https://www.npmjs.com/package/ioredis
 *
 * @module
 */

export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
