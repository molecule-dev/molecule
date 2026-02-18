/**
 * Type definitions for Memcached cache provider.
 *
 * @module
 */

import type Memcached from 'memcached'

// Re-export core interface types
export type { CacheOptions, CacheProvider } from '@molecule/api-cache'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * Memcached server(s) - comma-separated for multiple servers.
       */
      MEMCACHED_SERVERS?: string
      /**
       * Memcached host.
       */
      MEMCACHED_HOST?: string
      /**
       * Memcached port.
       */
      MEMCACHED_PORT?: string
    }
  }
}

/**
 * Options for creating a Memcached cache provider.
 */
export interface MemcachedOptions {
  servers?: string | string[]
  host?: string
  port?: number
  keyPrefix?: string
  options?: Memcached.options
}
