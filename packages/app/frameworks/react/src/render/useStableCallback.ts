/**
 * A function whose identity never changes and that always calls the handler of
 * the latest committed render.
 *
 * @module
 */

import { useCallback, useInsertionEffect, useRef } from 'react'

/**
 * Returns a function whose identity never changes and that calls the `handler`
 * of the latest COMMITTED render. Use it for a callback handed to a consumer, a
 * registry or a subscription that must not be torn down when the caller's
 * closure changes (a returned `prefetch`, a keyboard-shortcut handler).
 *
 * The handler is stored at commit, in an insertion effect, never while
 * rendering: a render React throws away (an interrupted transition, a
 * suspended tree) leaves the previous handler in place. Writing
 * `ref.current = handler` in the render body instead lets that discarded
 * render's handler run later.
 *
 * Never call the returned function while rendering: before the first commit it
 * calls the first render's handler, and during a later render the previous
 * commit's. Inside an effect, prefer {@link useEffectEvent}.
 *
 * @param handler - The function to call; its latest committed version runs.
 * @returns A stable function with the handler's parameters and result.
 *
 * @example
 * ```tsx
 * const onOpen = useStableCallback((id: string) => navigate(`/items/${id}`))
 * useEffect(() => registry.add('open', onOpen), [onOpen]) // registers once
 * ```
 */
export function useStableCallback<A extends unknown[], R>(
  handler: (...args: A) => R,
): (...args: A) => R {
  const latest = useRef(handler)
  // Insertion effects run at commit, before every layout effect and before any
  // handler can fire, and never for a render React throws away.
  useInsertionEffect(() => {
    latest.current = handler
  })
  return useCallback((...args: A) => latest.current(...args), [])
}
