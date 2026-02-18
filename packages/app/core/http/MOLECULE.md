# @molecule/app-http

Client HTTP interface for molecule.dev.

Provides a unified HTTP client API that works across different
HTTP libraries (fetch, axios, ky, etc.).

## Type
`core`

## Installation
```bash
npm install @molecule/app-http
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

## Translations

Translation strings are provided by `@molecule/app-locales-http`.
