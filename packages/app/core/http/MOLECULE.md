# @molecule/app-http

Client HTTP interface for molecule.dev.

Provides a unified HTTP client API that works across different
HTTP libraries (fetch, axios, ky, etc.).

## Quick Start

```tsx
// In a React component, get the configured client from context and call it.
// The hook is exported by the framework binding (@molecule/app-react), not
// this core package — never construct your own fetch/axios client.
import { useHttpClient } from '@molecule/app-react'

function Plants() {
  const http = useHttpClient()
  const load = async () => {
    const res = await http.get<Plant[]>('/plants')   // baseURL ('/api') is prepended
    setPlants(res.data)
  }
  // http.post(url, body), http.put, http.delete are also available.
}
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-http @molecule/app-bond @molecule/app-i18n @molecule/app-logger
```

## API

### Interfaces

#### `FullRequestConfig`

Full request configuration including method and URL.

```typescript
interface FullRequestConfig extends RequestConfig {
  /**
   * HTTP method.
   */
  method: HttpMethod

  /**
   * Request URL (can be relative or absolute).
   */
  url: string

  /**
   * Request body data.
   */
  data?: unknown
}
```

#### `HttpClient`

HTTP client interface.

All HTTP providers must implement this interface.

```typescript
interface HttpClient {
  /**
   * Base URL for all requests.
   */
  baseURL: string

  /**
   * Default headers for all requests.
   */
  defaultHeaders: Record<string, string>

  /**
   * Makes a generic HTTP request.
   */
  request<T = unknown>(config: FullRequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a GET request.
   */
  get<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a POST request.
   */
  post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a PUT request.
   */
  put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a PATCH request.
   */
  patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Makes a DELETE request.
   */
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>

  /**
   * Adds a request interceptor.
   * Returns a function to remove the interceptor.
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void

  /**
   * Adds a response interceptor.
   * Returns a function to remove the interceptor.
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void

  /**
   * Adds an error interceptor.
   * Returns a function to remove the interceptor.
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void

  /**
   * Sets the authorization token.
   */
  setAuthToken(token: string | null): void

  /**
   * Returns the current authorization token, or `null` if not set.
   */
  getAuthToken(): string | null

  /**
   * Registers a handler for authentication errors (401).
   *
   * @returns An unsubscribe function.
   */
  onAuthError(handler: () => void): () => void
}
```

#### `HttpClientConfig`

HTTP client configuration.

```typescript
interface HttpClientConfig {
  /**
   * Base URL for all requests.
   */
  baseURL?: string

  /**
   * Default headers for all requests.
   */
  defaultHeaders?: Record<string, string>

  /**
   * Default timeout in milliseconds.
   */
  timeout?: number

  /**
   * Whether to include credentials by default.
   */
  withCredentials?: boolean
}
```

#### `HttpResponse`

Parsed HTTP response with status code, headers, and typed body data.

```typescript
interface HttpResponse<T = unknown> {
  /**
   * Response data.
   */
  data: T

  /**
   * HTTP status code.
   */
  status: number

  /**
   * HTTP status text.
   */
  statusText: string

  /**
   * Response headers.
   */
  headers: Record<string, string>

  /**
   * Original request config.
   */
  config: FullRequestConfig
}
```

#### `RequestConfig`

HTTP request options (headers, query params, timeout, credentials, response type, abort signal).

```typescript
interface RequestConfig {
  /**
   * Request headers.
   */
  headers?: Record<string, string>

  /**
   * Query parameters.
   */
  params?: Record<string, string | number | boolean | undefined>

  /**
   * Request timeout in milliseconds.
   */
  timeout?: number

  /**
   * Whether to include credentials (cookies).
   */
  withCredentials?: boolean

  /**
   * Response type.
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'

  /**
   * Abort signal for cancellation.
   */
  signal?: AbortSignal

  /**
   * Request body data.
   */
  data?: unknown

  /**
   * Custom request options (implementation-specific).
   */
  options?: Record<string, unknown>
}
```

### Types

#### `ErrorInterceptor`

Intercepts HTTP errors to transform, retry, or rethrow them.
Throwing from this interceptor propagates the error to the caller.

```typescript
type ErrorInterceptor = (error: HttpError) => HttpError | Promise<HttpError> | never
```

#### `HttpMethod`

HTTP request method.

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
```

#### `RequestInterceptor`

Intercepts outgoing requests to modify headers, URL, or body
before the request is sent.

```typescript
type RequestInterceptor = (
  config: FullRequestConfig,
) => FullRequestConfig | Promise<FullRequestConfig>
```

#### `ResponseInterceptor`

Intercepts incoming responses to transform data, check status,
or perform side effects before the response reaches the caller.

```typescript
type ResponseInterceptor<T = unknown> = (
  response: HttpResponse<T>,
) => HttpResponse<T> | Promise<HttpResponse<T>>
```

### Classes

#### `HttpError`

HTTP error with response details.

### Functions

#### `createFetchClient(config)`

Creates a fetch-based HTTP client using the native Fetch API.

Supports request/response/error interceptors, automatic JSON
serialization, auth token injection, timeout via AbortController,
and 401 error handler hooks.

```typescript
function createFetchClient(config?: HttpClientConfig): HttpClient
```

- `config` — Client configuration including baseURL, default headers, timeout, and credentials.

**Returns:** A fully configured `HttpClient` instance.

#### `del(url, config)`

Makes a DELETE request using the bonded HTTP client.

```typescript
function del(url: string, config?: RequestConfig): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `config` — Optional request configuration.

**Returns:** The HTTP response with typed data.

#### `get(url, config)`

Makes a GET request using the bonded HTTP client.

```typescript
function get(url: string, config?: RequestConfig): Promise<HttpResponse<T>>
```

- `url` — The request URL (relative to baseURL if configured).
- `config` — Optional request configuration (headers, params, timeout).

**Returns:** The HTTP response with typed data.

#### `getClient()`

Retrieves the bonded HTTP client. If none is bonded, automatically
creates a default fetch-based client.

```typescript
function getClient(): HttpClient
```

**Returns:** The active HTTP client instance.

#### `patch(url, data, config)`

Makes a PATCH request using the bonded HTTP client.

```typescript
function patch(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `data` — The request body (partial update).
- `config` — Optional request configuration.

**Returns:** The HTTP response with typed data.

#### `post(url, data, config)`

Makes a POST request using the bonded HTTP client.

```typescript
function post(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `data` — The request body.
- `config` — Optional request configuration.

**Returns:** The HTTP response with typed data.

#### `put(url, data, config)`

Makes a PUT request using the bonded HTTP client.

```typescript
function put(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `data` — The request body.
- `config` — Optional request configuration.

**Returns:** The HTTP response with typed data.

#### `setClient(client)`

Registers an HTTP client as the active singleton.

```typescript
function setClient(client: HttpClient): void
```

- `client` — The HTTP client implementation to bond.

#### `unwrapList(res)`

Normalize an unknown response body into a typed array.

Accepts:
  - a bare array → returned as-is (cast)
  - `{ data: T[] }` envelope → the inner array
  - `HttpResponse<T[]>` (i.e. `{ data: T[], status, ... }`) → the inner array
  - `HttpResponse<{ data: T[] }>` (the response of an envelope-returning
    endpoint as it arrives from `@molecule/app-http`'s `HttpClient`) → the
    doubly-nested inner array
  - `HttpResponse<{ data: T[], total, limit, offset }>` (a RICH pagination
    envelope from a pre-built `@molecule/api-resource-*` list endpoint) → the
    inner `data` array (the numeric `total`/`limit`/`offset` make the shape
    unambiguous, so callers can pass the whole HttpResponse and still get the rows)
  - anything else → `[]`

Callers commonly pass either the raw JSON body (e.g. from `fetch().then(r =>
r.json())`) or the `HttpResponse` returned by `useHttpClient().get(...)`.
Both shapes are handled here so pages don't have to remember to call
`unwrapList(res.data)` vs `unwrapList(res)`.

```typescript
function unwrapList(res: unknown): T[]
```

- `res` — Raw response body OR an `HttpResponse` envelope from `@molecule/app-http`.

**Returns:** A typed array `T[]`; never `null`/`undefined`.

#### `unwrapSingle(res)`

Normalize an unknown response body into a single typed resource.

Accepts:
  - a non-empty plain object → returned as-is (cast)
  - `{ data: T }` envelope → the inner value
  - `{ data: null }`, `{ data: undefined }`, `{ data: [] }`, or
    `{ data: {} }` (mock-server's no-match shape) → `null`
  - an empty object `{}` → `null`
  - arrays, primitives, `null`, `undefined` → `null`

The "envelope contains an array → null" branch handles the case
where the mock server returns `[]` for unmatched endpoints but the
caller expects a single resource.

```typescript
function unwrapSingle(res: unknown): T | null
```

- `res` — Raw response body (e.g. `HttpResponse.data` from `@molecule/app-http`).

**Returns:** The typed resource `T`, or `null` when the response shape
 *   indicates "no resource" (including the various empty envelopes
 *   above).

### Constants

#### `fetchClient`

Pre-created fetch client for environments where `fetch` is available.
`null` in environments without a global `fetch`.

```typescript
const fetchClient: HttpClient | null
```

## Available Providers

| Provider | Package |
|----------|---------|
| Axios | `@molecule/app-http-axios` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`
- `@molecule/app-i18n`
- `@molecule/app-logger`

Make ALL API calls through this client (via the framework hook `useHttpClient()` in
React / the Vue composable) — it carries the configured `baseURL`, auth headers, and
interceptors. Do NOT call `fetch()` / `axios` directly in components — that bypasses auth
+ base-URL config and breaks when the transport is swapped.

Two mistakes that break in preview/production (seen in real imported apps):
- **Pass RELATIVE paths; never a hardcoded host.** Use `'/plants'` (the `baseURL` `'/api'`
  is prepended), NOT `'/api/plants'`, and NEVER an absolute dev URL like
  `'http://localhost:4000/api/…'`. A hardcoded `localhost`/host works on the author's
  machine, then fails cross-origin (CORS) in the preview and points at the wrong server in
  production. The base URL is configured ONCE (via `setClient`), not per call.
- **The client is PUBLIC — never put a secret in it.** Anything the browser sends (an API
  key, a service-role / `sk_…` key, a signing secret) is visible to every user. Secrets
  stay in YOUR API; the browser calls your API and the API uses the secret server-side.
  Only a publishable/public key may ever be client-side.

Auth (the bearer token / session cookie) is attached by the client's interceptors — do not
read a token from `localStorage` or hand-attach it (the token is memory-only; see the user
resource).

## Translations

Translation strings are provided by `@molecule/app-locales-http`.
