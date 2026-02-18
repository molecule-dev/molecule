/**
 * Base resource patterns for molecule.dev.
 *
 * Provides CRUD operation factories and request handler utilities for
 * building RESTful API resources.
 *
 * @example
 * ```typescript
 * import {
 *   createRequestHandler,
 *   create,
 *   read,
 *   update,
 *   del,
 *   query
 * } from '@molecule/api-resource'
 *
 * // Create a handler factory for your resource
 * const createUser = create<UserProps>({
 *   name: 'User',
 *   tableName: 'users',
 *   schema: userSchema,
 * })
 *
 * // Wrap with request handler for Express
 * export const requestHandlerMap = {
 *   create: createRequestHandler(createUser),
 *   read: createRequestHandler(readUser),
 *   // ...
 * }
 * ```
 *
 * @module
 */

export * from './create.js'
export * from './createRequestHandler.js'
export * from './del.js'
export * from './http-types.js'
export * from './i18n.js'
export * from './query.js'
export * from './read.js'
export * as schema from './schema.js'
export * as types from './types.js'
export * from './update.js'
export * as utilities from './utilities/index.js'
