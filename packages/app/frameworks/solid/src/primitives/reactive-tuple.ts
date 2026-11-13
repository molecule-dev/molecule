/**
 * The tuple shape React's `usePromise`/`useAsyncState` return: the live state
 * at index 0, the action functions after it.
 *
 * @module
 */

/**
 * Builds the tuple with the state VALUE at index 0 and the actions after it.
 *
 * React's tuples carry the state value at index 0; a Solid port keeps that
 * shape by exposing the state through a getter, so a reader sees the live
 * state (reactive when read inside a tracking scope) while the action
 * functions keep their indices.
 *
 * @param state - Reads the current state.
 * @param actions - The action functions, in tuple order from index 1.
 * @returns The tuple.
 */
export function liveStateTuple(state: () => unknown, actions: unknown[]): unknown[] {
  const tuple: unknown[] = [undefined, ...actions]
  Object.defineProperty(tuple, 0, { get: state, enumerable: true, configurable: true })
  return tuple
}
