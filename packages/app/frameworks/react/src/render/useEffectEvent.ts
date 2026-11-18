/**
 * React's `useEffectEvent` on every React version this package supports.
 *
 * @module
 */

import * as React from 'react'

import { useStableCallback } from './useStableCallback.js'

/**
 * An Effect Event: a function an effect calls to read the latest committed
 * props and state without listing them as dependencies, so the effect does not
 * re-run when they change. It is React's own `useEffectEvent` on React 19.2 and
 * later, and the same contract ({@link useStableCallback}) on React 18 to 19.1.
 *
 * Call it only from inside effects (and from what they schedule: timers,
 * subscriptions). Never call it while rendering, never pass it to another
 * component or hook, and never list it as a dependency. eslint-plugin-react-hooks
 * recognises the name and enforces exactly that.
 *
 * Reading the latest value through a ref written in the render body instead
 * (`latestRef.current = value`) lets a render React throws away leak its value
 * into a committed effect; this hook never does.
 *
 * @param handler - The event body; its latest committed version runs.
 * @returns The Effect Event to call from effects.
 *
 * @example
 * ```tsx
 * // Runs once on mount, with the props of the committed render.
 * const runOnMount = useEffectEvent(() => {
 *   if (immediate) void execute()
 * })
 * useEffect(() => {
 *   runOnMount()
 * }, [])
 * ```
 */
// The namespace import and the `in` test keep this module loadable on React 18,
// whose module has no `useEffectEvent` export to link a named import to.
export const useEffectEvent: typeof useStableCallback =
  'useEffectEvent' in React ? React.useEffectEvent : useStableCallback
