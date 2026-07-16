/**
 * localStorage provider for `@molecule/app-storage`.
 *
 * This package provides a localStorage-based implementation of the molecule StorageProvider interface,
 * with support for both localStorage and sessionStorage, key prefixing, and custom serialization.
 *
 * @module `@molecule/app-storage-localstorage`
 *
 * @example
 * ```ts
 * import { createLocalStorageProvider } from '@molecule/app-storage-localstorage'
 * import { setProvider } from '@molecule/app-storage'
 *
 * const storage = createLocalStorageProvider({
 *   prefix: 'myapp_',
 * })
 *
 * setProvider(storage)
 *
 * // Use via `@molecule/app-storage`
 * import { get, set, remove } from '@molecule/app-storage'
 *
 * await set('user', { name: 'John' })
 * const user = await get<User>('user')
 * await remove('user')
 * ```
 *
 * @remarks
 * - **Unavailable localStorage falls back to in-memory SILENTLY** (SSR, private
 *   browsing, disabled storage): all operations succeed against a process-local Map,
 *   so nothing persists and no error reaches the caller. If persistence is critical,
 *   feature-check before relying on it.
 * - **Set a `prefix` in real apps.** With no prefix, `clear()` wipes the ENTIRE
 *   origin's localStorage — including keys owned by other libraries. A prefix scopes
 *   `clear()` and `keys()` to this app's entries.
 * - `set()` throws a quota-exceeded error when the origin's storage is full — the one
 *   storage failure worth catching and surfacing to the user.
 * - `get()` returns `null` when a stored value fails to deserialize (logged warning) —
 *   corrupted entries look like missing keys.
 * - Tab-scoped variant: `createSessionStorageProvider()` / the `sessionProvider`
 *   const use `sessionStorage` with identical semantics.
 */

export * from './provider.js'
export * from './types.js'
