/**
 * Warm the cache ahead of a navigation — the Angular counterpart of
 * `usePrefetch` in `@molecule/app-query-react`. `prefetchQuery` itself is
 * framework-neutral and lives in `@molecule/app-query`; this module re-exports
 * it and adds the hook and the intent handlers.
 *
 * @module
 */
import type { QueryOptions } from '@molecule/app-query'
import { prefetchQuery } from '@molecule/app-query'

export { prefetchQuery } from '@molecule/app-query'

/**
 * A stable `prefetch(options)` function for event handlers. Call it in an
 * injection context (a component field initializer or constructor); the
 * returned function is one object for the component's lifetime.
 *
 * @returns The prefetch function.
 */
export function usePrefetch(): <T>(options: QueryOptions<T>) => void {
  return <T>(options: QueryOptions<T>): void => prefetchQuery(options)
}

/**
 * The handlers {@link intentPrefetchProps} returns, named after the DOM events
 * an Angular template binds (`(pointerenter)`, `(focus)`, `(touchstart)`).
 */
export interface IntentPrefetchProps {
  /** Warms the document when the pointer arrives. */
  pointerenter: () => void
  /** Warms the document on keyboard focus. */
  focus: () => void
  /** Warms the document when a touch starts. */
  touchstart: () => void
}

/**
 * Handlers that warm a document at the first sign of intent: the pointer
 * arriving, keyboard focus, or a touch starting. Put them on a link's host
 * bindings (each property is named after the DOM event it warms on):
 *
 * ```typescript
 * host: { '(pointerenter)': 'prefetch.pointerenter()', '(focus)': 'prefetch.focus()' }
 * ```
 *
 * It is a plain function (not a hook), so it works inside `@for` loops too.
 *
 * @param options - Key, fetch, freshness.
 * @returns The handlers.
 */
export function intentPrefetchProps<T>(options: QueryOptions<T>): IntentPrefetchProps {
  const go = (): void => prefetchQuery(options)
  return { pointerenter: go, focus: go, touchstart: go }
}
