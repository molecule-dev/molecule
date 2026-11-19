/**
 * A ref that holds the value of the latest committed render.
 *
 * @module
 */

import { useInsertionEffect } from 'react'

/**
 * Keeps `ref.current` at the `value` of the latest COMMITTED render. Read the
 * ref in effects, timers, subscriptions and event handlers, where a value from
 * the render body would otherwise be stale.
 *
 * The value is stored at commit, in an insertion effect, never while
 * rendering: a render React throws away (an interrupted transition, a
 * suspended tree) leaves the previous value in place. Writing
 * `ref.current = value` in the render body instead lets that discarded
 * render's value reach the next effect or handler.
 *
 * The ref stays `null` until the first commit. Insertion effects run before
 * every layout and passive effect, so no effect sees it empty; only code that
 * reads it while rendering does, and that is a bug to fix rather than a case
 * to handle. To call the latest function from a consumer, prefer
 * {@link useStableCallback}; inside an effect, {@link useEffectEvent}.
 *
 * @param ref - The ref to keep current (`useRef<T | null>(null)`).
 * @param value - This render's value; it is stored when the render commits.
 *
 * @example
 * ```tsx
 * const sendRef = useRef<((text: string) => void) | null>(null)
 * useCommittedRef(sendRef, send)
 * useEffect(() => socket.on('retry', (text) => sendRef.current?.(text)), [socket])
 * ```
 */
export function useCommittedRef<T>(ref: { current: T | null }, value: T): void {
  // Insertion effects run at commit, before every layout effect and before any
  // handler can fire, and never for a render React throws away.
  useInsertionEffect(() => {
    ref.current = value
  })
}
