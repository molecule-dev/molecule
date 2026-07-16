/**
 * AsyncStorage provider for `@molecule/app-storage`.
 *
 * This package provides a React Native AsyncStorage-based implementation of the molecule StorageProvider
 * interface, with support for key prefixing and custom serialization.
 *
 * @module `@molecule/app-storage-async-storage`
 *
 * @example
 * ```ts
 * import { createAsyncStorageProvider } from '@molecule/app-storage-async-storage'
 * import { setProvider } from '@molecule/app-storage'
 *
 * const storage = createAsyncStorageProvider({
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
 * - **Set a `prefix` in real apps.** With no prefix, `clear()` calls AsyncStorage's
 *   global clear — wiping keys owned by OTHER libraries (navigation state, auth
 *   SDKs). A prefix scopes `clear()` and `keys()` to this app's entries.
 * - `get()` returns `null` (with a logged warning) on any failure, including a value
 *   that fails to deserialize — a corrupted entry is indistinguishable from a missing
 *   one at the call site.
 * - `@react-native-async-storage/async-storage` is a peer dependency loaded on first
 *   use — install it with `npm install @react-native-async-storage/async-storage`.
 * - Values round-trip through `JSON.stringify`/`JSON.parse` by default (Dates become
 *   strings; `undefined`/functions are dropped) — pass custom
 *   `serialize`/`deserialize` for anything richer.
 * ```
 */

export * from './provider.js'
export * from './types.js'
