/**
 * Client storage interface for molecule.dev.
 *
 * Provides a unified storage API that works across web and native platforms.
 *
 * @remarks
 * Use this abstraction — {@link get}/{@link set}/{@link remove}/{@link clear}/{@link keys}
 * (all async) — for client persistence. Do NOT touch `localStorage` / `sessionStorage` /
 * `AsyncStorage` directly: raw web storage doesn't exist on native, and hardcoding it breaks
 * the platform swap.
 *
 * - **Nothing is bonded by default — every call THROWS** (`No provider set`) until
 *   `setProvider(...)` runs. Bond `createMemoryStorageProvider()` (this package; nothing
 *   persists), `@molecule/app-storage-localstorage` (web) or
 *   `@molecule/app-storage-async-storage` (React Native).
 * - Every function is ASYNC — `get()` returns a Promise; forgetting `await` gives you a
 *   Promise, not the value. Missing keys resolve to `null`, not `undefined`.
 *
 * **NEVER store a secret or an auth token in client storage.** `localStorage` /
 * `sessionStorage` are readable by any injected script, so a token there is
 * XSS-exfiltratable — the bearer token is deliberately held in memory only (see
 * `@molecule/api-resource-user`). Persist only NON-sensitive UI state / preferences here.
 *
 * @example
 * ```typescript
 * import { get, keys, remove, set, setProvider } from '@molecule/app-storage'
 * import { createLocalStorageProvider } from '@molecule/app-storage-localstorage'
 *
 * // Startup (bonds.ts) — get/set/remove THROW until a provider is bonded.
 * setProvider(createLocalStorageProvider({ prefix: 'myapp_' })) // prefix scopes keys()/clear()
 *
 * interface Preferences {
 *   theme: 'light' | 'dark'
 *   sidebarCollapsed: boolean
 * }
 *
 * await set<Preferences>('preferences', { theme: 'dark', sidebarCollapsed: true }) // JSON-serialized
 * const prefs = await get<Preferences>('preferences') // `null` when the key is missing
 * console.log(prefs?.theme, await keys()) // 'dark' ['preferences'] (stored as 'myapp_preferences')
 * await remove('preferences')
 * // await set('authToken', token) // ❌ NEVER — tokens/secrets are not client-persisted
 * ```
 *
 * @module
 */

export * from './memory-provider.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
