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
 */

export * from './provider.js'
export * from './types.js'
