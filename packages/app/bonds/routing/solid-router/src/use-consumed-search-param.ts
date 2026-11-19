/**
 * `useConsumedSearchParam` over Solid Router: a thin wrapper over `@molecule/app-routing`'s
 * `createConsumedSearchParam` and the bond's molecule router, under React's hook name.
 *
 * @module
 */

import { createSignal, onCleanup, onMount } from 'solid-js'

import { createConsumedSearchParam } from '@molecule/app-routing'

import { useMoleculeRouter } from './hooks.jsx'

/**
 * Builds a tuple with the live state at index 0 and the actions after it, the shape every
 * hook under a React name returns here: index 0 is read through a getter, so a reader sees
 * the current value (React re-renders its tuple) while the action functions keep their
 * indices.
 *
 * @param read - Reads the current state.
 * @param actions - The action functions, in tuple order from index 1.
 * @returns The tuple.
 */
function liveStateTuple<State, Actions extends unknown[]>(
  read: () => State,
  actions: [...Actions],
): [State, ...Actions] {
  const tuple: [State, ...Actions] = [read(), ...actions]
  Object.defineProperty(tuple, 0, { get: read, enumerable: true, configurable: true })
  return tuple
}

/**
 * Consume a credential query parameter into component state and remove only that parameter
 * from the address through the native router. The value survives local updates, failed-submit
 * retries and later query-only navigation; a newly arriving value on the same mounted route is
 * consumed too. Path, hash, unrelated query values and router location state are retained.
 *
 * The bond's router owns the URL replacement, so the native location and `window.location`
 * agree. Its replace keeps the entry's app-owned state fields, including ones the native
 * router does not model.
 *
 * @param name - The credential query key to consume, for example `token` or `code`.
 * @returns The consumed value and its setter, in the binding's tuple shape: index 0 is the
 *   live value (`''` before first consumption), index 1 sets it.
 * @example
 * ```tsx
 * import { useConsumedSearchParam } from '@molecule/app-routing-solid-router'
 *
 * function ResetForm() {
 *   const token = useConsumedSearchParam('token')
 *   // Read token[0] where it is used (it is live there; a destructured copy is not).
 *   return <form onSubmit={() => token[1]('')}>…</form>
 * }
 * ```
 */
export function useConsumedSearchParam(name: string): [string, (value: string) => void] {
  const router = useMoleculeRouter()
  const param = createConsumedSearchParam(router, name)
  const [value, setValue] = createSignal(param.get())
  const unsubscribe = param.subscribe((next) => setValue(next))
  onCleanup(unsubscribe)

  // `connect` follows the router from mount; its return stops it on unmount.
  let disconnect: (() => void) | null = null
  onMount(() => {
    disconnect = param.connect()
  })
  onCleanup(() => {
    disconnect?.()
    disconnect = null
  })

  return liveStateTuple(value, [param.set])
}
