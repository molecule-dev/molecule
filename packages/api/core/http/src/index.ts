/**
 * HTTP client core interface for molecule.dev — outbound server-to-server requests.
 *
 * Defines the `HttpClient` contract plus convenience functions (`request`, `get`,
 * `post`, `put`, `patch`, `del`) that delegate to the bonded client. Works with
 * ZERO wiring: when no bond is configured, a built-in fetch-based client is used.
 * Bond `@molecule/api-http-axios` (or another client) only when you need its
 * extras (interceptors, per-instance defaults via `create`).
 *
 * @example
 * ```typescript
 * import type { HttpError } from '@molecule/api-http'
 * import { get, post, setClient } from '@molecule/api-http'
 * import { provider as fetchClient } from '@molecule/api-http-fetch'
 *
 * // Startup (optional): with no bond the core already uses a built-in fetch client.
 * setClient(fetchClient)
 *
 * interface Item {
 *   id: string
 *   name: string
 * }
 * const apiToken = process.env.ITEMS_API_TOKEN
 *
 * const res = await get<Item>('https://api.example.com/items/1', {
 *   headers: { Authorization: `Bearer ${apiToken}` },
 *   params: { expand: 'owner' },
 *   timeout: 5000, // milliseconds
 * })
 * const item = res.data // body is on `.data`, already JSON-parsed
 *
 * // Non-2xx responses THROW an HttpError — read the status from the error.
 * try {
 *   await post<Item>('https://api.example.com/items', { name: '' }, { timeout: 5000 })
 * } catch (error) {
 *   const status = (error as HttpError).response?.status // 422, 500, …
 *   if (status !== 422) throw error
 * }
 * ```
 *
 * @remarks
 * - **Non-2xx responses THROW an `HttpError` — they are not returned.** Checking
 *   `res.status` for error codes after an await is dead code; catch and read
 *   `error.response?.status` / `error.response?.data`. Timeouts and aborts also
 *   throw (no `response`). The `isTimeout` / `isAborted` flags are set by the
 *   axios bond (the built-in client sets `isTimeout` only);
 *   `@molecule/api-http-fetch` rethrows the raw `AbortError` without flags.
 * - **This category wires via `setClient`/`getClient`/`hasClient`** (bond type
 *   `http-client`), not `setProvider`. The DELETE convenience function is `del`
 *   (`delete` is reserved); the `HttpClient` interface method is `delete`.
 * - Object request bodies are JSON-stringified with `Content-Type:
 *   application/json` automatically. Response bodies are JSON-parsed onto
 *   `res.data`; a non-JSON body falls back to `null` — pass
 *   `responseType: 'text'` to get raw text.
 * - **`create()` and the interceptor methods are OPTIONAL client capabilities**
 *   the built-in fetch client does NOT implement — bond a client that supports
 *   them (e.g. `@molecule/api-http-axios`) before calling
 *   `getClient().addRequestInterceptor(...)`.
 * - Outbound calls only: never fetch a raw user-supplied URL without validation
 *   (SSRF), and keep upstream API tokens in config/secrets — never in app code.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
