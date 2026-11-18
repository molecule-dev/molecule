/**
 * The value of the render in which a set of keys last changed.
 *
 * @module
 */

import { useState } from 'react'

/**
 * Returns `value` as it was in the render in which `keys` last changed, and
 * keeps returning that same value (the same object) while `keys` stay equal
 * (`Object.is`, element by element). Use it where options are read once per key
 * and a fresh options object on every render must not resubscribe, refetch or
 * rebuild: `useValueAtKeyChange(options, [hash])`.
 *
 * The held value lives in state, which belongs to the render: a render React
 * throws away (an interrupted transition, a suspended tree) leaves no trace, so
 * the committed key keeps its value. A ref written while rendering keeps the
 * discarded render's value instead, and `useMemo` is only a cache React may drop.
 * On a key change the hook updates its state during render (React's documented
 * pattern for information from previous renders), which re-renders this
 * component before anything commits: one extra run of the calling component's
 * body on each key change (no extra commit). Use it when a key change starts
 * real work anyway. For a value built only from the keys, use `useMemo`; for a
 * value read from an external store, cache it in the store's snapshot.
 *
 * @param value - The value for the current render.
 * @param keys - The keys whose change takes a new value.
 * @returns The value of the render in which `keys` last changed.
 *
 * @example
 * ```tsx
 * const stable = useValueAtKeyChange(options, [hashQueryKey(options.key)])
 * useEffect(() => subscribe(stable), [stable]) // a new options object alone does not resubscribe
 * ```
 */
export function useValueAtKeyChange<V>(value: V, keys: readonly unknown[]): V {
  const [held, setHeld] = useState({ keys, value })
  if (
    held.keys.length !== keys.length ||
    held.keys.some((key, index) => !Object.is(key, keys[index]))
  ) {
    setHeld({ keys, value })
    return value
  }
  return held.value
}
