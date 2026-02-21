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
 */

export * from './provider.js'
export * from './types.js'
