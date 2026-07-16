/**
 * Jotai state provider for molecule.dev.
 *
 * Implements the `StateProvider` interface from `@molecule/app-state` on Jotai
 * atoms, plus atom helpers (`createAtom`, `createDerivedAtom`,
 * `createWritableDerivedAtom`) and a shared `defaultStore` for advanced use.
 *
 * @see https://jotai.org/
 *
 * @example
 * ```typescript
 * import { setProvider, createStore } from '@molecule/app-state'
 * import { provider } from '@molecule/app-state-jotai'
 *
 * setProvider(provider)
 *
 * const store = createStore({ initialState: { count: 0 } })
 * store.subscribe((state) => console.log(state.count))
 * store.setState((s) => ({ count: s.count + 1 })) // shallow-merged
 * ```
 *
 * @remarks
 * - **`subscribe` listeners receive the SAME object for `state` and `prevState`**
 *   (Jotai does not track previous values) — do not diff `state` against `prevState`
 *   with this bond; if change-detection by comparison matters, keep your own snapshot
 *   or use the zustand/redux bonds, which deliver a real previous state.
 * - `setState` shallow-merges partial objects (or updater results) into the current
 *   state — molecule `Store` semantics, not a replace.
 * - Each `createStore()` gets its own private Jotai store unless you pass
 *   `jotaiStore` in the config; use the exported `defaultStore` (or
 *   `createJotaiStore()`) to share one store with app-level atoms/`useAtom`.
 *
 * @module
 */

export * from './atoms.js'
export * from './provider.js'
export * from './store.js'
export * from './types.js'

// Re-export Jotai core for advanced use cases
/**
 * Creates a Jotai atom — the base reactive primitive for state management.
 * Use for derived state, async data, or writable state with custom logic.
 *
 * @param read - Initial value, or a read function that derives the atom's value from other atoms.
 * @param write - Optional write function for custom setter logic.
 * @returns A Jotai atom that can be used with useAtom or store.get/set.
 */
export { atom } from 'jotai/vanilla'

/**
 * Creates a standalone Jotai store for use outside React components
 * (e.g. in middleware, server-side, or tests).
 *
 * @returns A Jotai store instance with get, set, and sub methods.
 */
export { createStore as createJotaiStore } from 'jotai/vanilla'
