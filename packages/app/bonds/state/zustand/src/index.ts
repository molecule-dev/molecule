/**
 * Zustand state provider for molecule.dev.
 *
 * Implements the `StateProvider` interface from `@molecule/app-state` on
 * `zustand/vanilla` (with `subscribeWithSelector`), with optional per-store
 * persistence and slice helpers for direct-Zustand usage.
 *
 * @see https://zustand-demo.pmnd.rs/
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-state'
 * import { createStore, provider } from '@molecule/app-state-zustand'
 *
 * setProvider(provider)
 *
 * // persist is a zustand-bond EXTENSION: the core createStore() accepts only the
 * // portable StoreConfig — create persisted stores via the bond's own createStore.
 * const store = createStore({
 *   initialState: { theme: 'light', draft: '' },
 *   persist: { name: 'app-settings', partialize: (s) => ({ theme: s.theme }) },
 * })
 * ```
 *
 * @remarks
 * - **Persistence is best-effort and silent.** `persist` defaults to raw
 *   `localStorage` (no-ops server-side); read/write failures (quota, private
 *   browsing, serialization) are swallowed by design — the in-memory store keeps
 *   working, but nothing sticks. Pass `persist.storage` to use another backend and
 *   `partialize` to bound what is written.
 * - Persisted state is shallow-merged over `initialState` on creation — old keys
 *   survive shape changes; version/namespace the `persist.name` when the shape
 *   breaks.
 * - **`destroy()` is a no-op** (Zustand v5 has no store destroy) — drop references
 *   and call the unsubscribe functions returned by `subscribe()`.
 * - `setState` shallow-merges partials/updater results (molecule `Store` semantics).
 * - `createStoreWithActions`/`createSlice`/`combineSlices` are direct-Zustand
 *   helpers — stores built with them bypass the molecule `Store` contract.
 *
 * @module
 */

export * from './provider.js'
export * from './slices.js'
export * from './store.js'
export * from './types.js'
export * from './utilities.js'
