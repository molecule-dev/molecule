/**
 * Axios HTTP client provider for molecule.dev.
 *
 * Implements the `@molecule/api-http` `HttpClient` contract with axios,
 * adding the optional capabilities the core's built-in fetch client lacks:
 * request/response/error interceptors, `create(defaults)` for derived
 * clients, and pre-configured instances via
 * `createClient({ baseURL, timeout, headers })` (or a custom axios
 * `instance`). Errors are normalized to `HttpError` — axios internals never
 * leak to callers.
 *
 * @example
 * ```typescript
 * import { setClient } from '@molecule/api-http'
 * import { createClient } from '@molecule/api-http-axios'
 *
 * const client = createClient({ baseURL: 'https://api.example.com', timeout: 5000 })
 * client.addRequestInterceptor?.((req) => ({
 *   ...req,
 *   headers: { ...req.headers, 'X-Request-Id': crypto.randomUUID() },
 * }))
 * setClient(client)
 * ```
 *
 * @remarks
 * - This category wires via `setClient()` from `@molecule/api-http` — NOT
 *   `setProvider`. Without any bond the core already falls back to a built-in
 *   fetch client; bond this package only when you need interceptors,
 *   `create()`, or per-instance defaults.
 * - The exported `provider` (alias `client`) is a shared default instance
 *   created with no options — interceptors added to it apply process-wide.
 *   Prefer `createClient()` for scoped/per-service instances.
 *
 * @see https://www.npmjs.com/package/axios
 *
 * @module
 */

export * from './browser-guard.js'
export * from './client.js'
export * from './types.js'
export * from './utilities.js'
