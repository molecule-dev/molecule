/**
 * Type definitions for Redis cache provider.
 *
 * @module
 */

export type { CacheOptions, CacheProvider } from '@molecule/api-cache'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * Redis connection URL.
       */
      REDIS_URL?: string
      /**
       * Redis host.
       */
      REDIS_HOST?: string
      /**
       * Redis port.
       */
      REDIS_PORT?: string
      /**
       * Redis password.
       */
      REDIS_PASSWORD?: string
    }
  }
}

/**
 * Options for creating a Redis cache provider.
 */
export interface RedisOptions {
  url?: string
  host?: string
  port?: number
  password?: string
  db?: number
  keyPrefix?: string
  /**
   * Maximum retry attempts for a command before ioredis rejects it instead of
   * continuing to retry. Forwarded to ioredis unchanged; omitted/`undefined`
   * keeps ioredis' own default (`20`, each attempt backing off up to 2s — a
   * down Redis can therefore take 10s+ to surface as an error). Pass a small
   * value (e.g. `1`) for fail-fast cache semantics.
   */
  maxRetriesPerRequest?: number
  /**
   * Whether ioredis queues commands issued while disconnected instead of
   * rejecting them immediately. Forwarded to ioredis unchanged; omitted keeps
   * ioredis' own default (`true`). Set to `false` for fail-fast cache
   * semantics — commands reject immediately instead of buffering.
   */
  enableOfflineQueue?: boolean
  /**
   * Milliseconds to wait for a command's reply before ioredis times it out.
   * Forwarded to ioredis unchanged; omitted keeps ioredis' own default (no
   * timeout). Set a bounded value (e.g. `2000`) to cap the worst-case stall
   * from an unreachable-but-connected Redis.
   */
  commandTimeout?: number
}
