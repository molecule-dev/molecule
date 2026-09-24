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
 * import { get, post, setClient } from '@molecule/api-http'
 * import { createClient } from '@molecule/api-http-axios'
 *
 * // Startup: bond once. Env: GITHUB_API_TOKEN (sent on every request by the interceptor).
 * const client = createClient({ baseURL: 'https://api.github.com', timeout: 5000 })
 * client.addRequestInterceptor?.((req) => ({
 *   ...req,
 *   headers: { ...req.headers, Authorization: `Bearer ${process.env.GITHUB_API_TOKEN ?? ''}` },
 * }))
 * setClient(client)
 *
 * // Anywhere: call through the core — relative URLs resolve against baseURL.
 * const repo = await get<{ full_name: string; stargazers_count: number }>('/repos/nodejs/node')
 * console.log(repo.status, repo.data.full_name) // 200 'nodejs/node'
 *
 * const created = await post<{ number: number }>('/repos/acme/app/issues', { title: 'Bug' })
 * console.log(created.data.number)
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
 * - Non-2xx responses REJECT with an `HttpError` (`error.response.status`,
 *   `error.response.data`) — they are not returned as a response. Wrap calls
 *   in `try/catch` when a 404 is an expected outcome.
 * - `timeout` is MILLISECONDS. Object bodies are sent as JSON; `data` is the
 *   parsed JSON body (axios parses by default).
 * - `addRequestInterceptor` is optional on the `HttpClient` interface, so call
 *   it as `client.addRequestInterceptor?.(...)`; it returns an unsubscribe
 *   function.
 *
 * @see https://www.npmjs.com/package/axios
 *
 * @module
 */

export * from './browser-guard.js'
export * from './client.js'
export * from './types.js'
export * from './utilities.js'
