/**
 * Database core interface for molecule.dev.
 *
 * Defines the standard interface for database providers, including both
 * raw connection pools and the database-agnostic DataStore abstraction.
 *
 * @example
 * ```typescript
 * import { setStore, findById, findMany, create, updateById, deleteById } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 *
 * // Wire the DataStore at app startup
 * setStore(store)
 *
 * // CRUD operations — database-agnostic
 * const user = await findById<User>('users', userId)
 *
 * const activeUsers = await findMany<User>('users', {
 *   where: [
 *     { field: 'status', operator: '=', value: 'active' },
 *   ],
 *   orderBy: [{ field: 'createdAt', direction: 'desc' }],
 *   limit: 50,
 * })
 *
 * await create('users', { id, username, email })
 * await updateById('users', id, { name: 'New Name' })
 * await deleteById('users', id)
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports (raw query access)
export * from './provider.js'

// DataStore exports (abstract CRUD)
export * from './store.js'
export * from './store-provider.js'
