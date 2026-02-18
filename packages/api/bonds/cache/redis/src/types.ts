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
}
