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
 * @example
 * ```ts
 * import { get, set, remove } from '@molecule/app-storage'
 *
 * await set('theme', 'dark') // non-sensitive preference — fine
 * const theme = await get<string>('theme')
 * await remove('theme')
 * // await set('authToken', token) // ❌ NEVER — tokens/secrets are not client-persisted
 * ```
 *
 * @module
 */

export * from './memory-provider.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
