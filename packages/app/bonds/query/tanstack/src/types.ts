/**
 * Configuration for the TanStack Query provider.
 *
 * @module
 */

import type { QueryClient as TanstackQueryClient } from '@tanstack/query-core'

/**
 * Provider-specific configuration options.
 */
export interface TanstackQueryConfig {
  /**
   * An existing TanStack `QueryClient` to wrap, so an app that already uses
   * TanStack Query (its devtools, its hooks) shares one cache with molecule
   * packages. When omitted, each `createClient()` makes its own.
   */
  client?: TanstackQueryClient
}
