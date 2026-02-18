/**
 * Axios HTTP client provider for `@molecule/app-http`.
 *
 * This package provides an Axios-based implementation of the molecule HttpClient interface,
 * allowing you to use molecule's HTTP abstractions with Axios.
 *
 * @module `@molecule/app-http-axios`
 *
 * @example
 * ```ts
 * import { createAxiosClient } from '@molecule/app-http-axios'
 * import { setClient } from '@molecule/app-http'
 *
 * const client = createAxiosClient({
 *   baseURL: 'https://api.example.com',
 *   timeout: 10000,
 * })
 *
 * setClient(client)
 *
 * // Now use via `@molecule/app-http`
 * import { get, post } from '@molecule/app-http'
 * const users = await get('/users')
 * const newUser = await post('/users', { name: 'John' })
 * ```
 */

export * from './provider.js'
export * from './types.js'
