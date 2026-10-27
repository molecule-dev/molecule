/**
 * Client storage interface for molecule.dev.
 *
 * Provides a unified storage API that works across web and native platforms.
 *
 * @remarks
 * Use this abstraction — {@link get}/{@link set}/{@link remove}/{@link clear}/{@link keys}
 * (all async) — for client persistence. Do NOT touch `localStorage` / `sessionStorage` /
 * `AsyncStorage` directly: raw web storage doesn't exist on native, and hardcoding it breaks
 * the platform swap. The default provider is IN-MEMORY (a safe default — no accidental
 * persistence); a web/native bond persists.
 *
 * **NEVER store a secret or an auth token in client storage.** `localStorage` /
 * `sessionStorage` are readable by any injected script, so a token there is
 * XSS-exfiltratable — the bearer token is deliberately held in memory only (see
 * `@molecule/api-resource-user`). Persist only NON-sensitive UI state / preferences here.
 *
 * **Read a preference DURING render through `getPreferenceStore()`, never by
 * touching web storage directly.** It returns the last known value
 * synchronously (seeded from the provider's `getSync`, hydrated asynchronously
 * otherwise), notifies subscribers on a write in this tab or another, and
 * persists through the SAME bonded provider — so swapping the provider swaps
 * every preference, including render-time reads. Values you only read inside an
 * async handler can just await {@link get}.
 *
 * @example
 * ```ts
 * import { get, getPreferenceStore, set, remove } from '@molecule/app-storage'
 *
 * // Async handlers: await the provider.
 * await set('theme', 'dark') // non-sensitive preference — fine
 * const theme = await get<string>('theme')
 * await remove('theme')
 * // await set('authToken', token) // ❌ NEVER — tokens/secrets are not client-persisted
 *
 * // Render-time preference reads: a synchronous snapshot + subscription.
 * const store = getPreferenceStore()
 * const width = store.get<number>('sidebar_width') // correct on the first paint
 * store.set('sidebar_width', 240) // persists through the bonded provider
 * const stop = store.subscribe('sidebar_width', () => setWidth(store.get('sidebar_width')))
 * ```
 *
 * @module
 */

export * from './memory-provider.js'
export * from './preferences.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
