/**
 * Warm the cache ahead of a navigation, in Svelte: `prefetchQuery` itself is
 * framework-neutral and lives in `@molecule/app-query`; this module re-exports
 * it and adds the Svelte hook and the link handlers.
 *
 * @module
 */

import type { QueryOptions } from '@molecule/app-query'
import { prefetchQuery } from '@molecule/app-query'

export { prefetchQuery } from '@molecule/app-query'

import type { IntentPrefetchProps } from './types.js'

/**
 * A stable `prefetch(options)` function for event handlers. One identity for
 * the component's life (React's `useCallback` with no dependencies).
 *
 * @returns The prefetch function.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { usePrefetch } from '@molecule/app-query-svelte'
 *
 *   const prefetch = usePrefetch()
 * </script>
 *
 * <button onclick={() => prefetch(packageQuery('api-auth'))}>Show packages</button>
 * ```
 */
export function usePrefetch(): <T>(options: QueryOptions<T>) => void {
  const prefetch = <T>(options: QueryOptions<T>): void => prefetchQuery(options)
  return prefetch
}

/**
 * Event handlers that warm a document at the first sign of intent: the
 * pointer arriving, keyboard focus, or a touch starting. Spread them onto a
 * link — the names are Svelte 5's lowercase DOM event attributes:
 * `<a href={to} {...intentPrefetchProps(packageQuery(name))}>{name}</a>`. It
 * is a plain function (not a hook), so it works inside `{#each}` too.
 *
 * @template T - The document type.
 * @param options - Key, fetch, freshness.
 * @returns The handlers.
 */
export function intentPrefetchProps<T>(options: QueryOptions<T>): IntentPrefetchProps {
  const go = (): void => prefetchQuery(options)
  return { onpointerenter: go, onfocus: go, ontouchstart: go }
}
