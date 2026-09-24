/**
 * Native fetch HTTP client provider for molecule.dev.
 *
 * Implements the `@molecule/api-http` `HttpClient` contract with the runtime's
 * global `fetch` — zero dependencies.
 *
 * @example
 * ```typescript
 * import { get, post, setClient } from '@molecule/api-http'
 * import { provider } from '@molecule/api-http-fetch'
 *
 * // Startup: bond once.
 * setClient(provider)
 *
 * // Anywhere: call through the core. `baseURL` and `params` are per request.
 * const repos = await get<Array<{ name: string }>>('/users/octocat/repos', {
 *   baseURL: 'https://api.github.com',
 *   params: { per_page: 5, sort: 'updated' },
 *   timeout: 5000,
 * })
 * console.log(repos.status, repos.data.map((r) => r.name))
 *
 * const echoed = await post<{ json: { title: string } }>('https://httpbin.org/anything', {
 *   title: 'Bug',
 * })
 * console.log(echoed.data.json) // { title: 'Bug' } — object bodies are sent as JSON
 * ```
 *
 * @remarks
 * - Bond with `setClient(provider)` from `@molecule/api-http` — NOT
 *   `setProvider` / `bond('http-fetch', ...)`. Then call the core's
 *   `get`/`post`/`put`/`patch`/`del` (the core export is `del`, not `delete`).
 * - No `createClient()` / interceptors / `create()` here — there is only the
 *   single `provider` (alias `fetchClient`). Pass `baseURL`, `headers` and
 *   `timeout` on each request, or use `@molecule/api-http-axios` for
 *   per-instance defaults and interceptors.
 * - Non-2xx responses REJECT with an `Error` (`HTTP 404: Not Found`) carrying
 *   `error.response` (status + parsed body) — they are not returned.
 * - Every request sends `Content-Type: application/json`; object bodies are
 *   `JSON.stringify`d, string bodies are sent as-is. `responseType` defaults to
 *   `'json'` — pass `'text'` for non-JSON responses or parsing throws.
 * - `timeout` is MILLISECONDS and is ignored when you pass your own `signal`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
