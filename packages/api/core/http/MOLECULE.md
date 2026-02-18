# @molecule/api-http

HTTP client core interface for molecule.dev.

Defines the standard interface for HTTP client providers.

## Type
`core`

## Installation
```bash
npm install @molecule/api-http
```

## API

### Interfaces

#### `HttpClient`

HTTP client interface that all HTTP bond packages must implement.

Provides methods for each HTTP verb plus optional interceptors and
client factory support.

```typescript
interface HttpClient {
  /**
   * Makes an HTTP request.
   */
  request<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>

  /**
   * Makes a GET request.
   */
  get<T = unknown>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>>

  /**
   * Makes a POST request.
   */
  post<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>>

  /**
   * Makes a PUT request.
   */
  put<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>>

  /**
   * Makes a PATCH request.
   */
  patch<T = unknown>(
    url: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>>

  /**
   * Makes a DELETE request.
   */
  delete<T = unknown>(
    url: string,
    options?: Omit<HttpRequestOptions, 'method'>,
  ): Promise<HttpResponse<T>>

  /**
   * Creates a new client with the given defaults.
   */
  create?(defaults: HttpRequestOptions): HttpClient

  /**
   * Adds a request interceptor.
   */
  addRequestInterceptor?(interceptor: RequestInterceptor): () => void

  /**
   * Adds a response interceptor.
   */
  addResponseInterceptor?(interceptor: ResponseInterceptor): () => void

  /**
   * Adds an error interceptor.
   */
  addErrorInterceptor?(interceptor: ErrorInterceptor): () => void
}
```

#### `HttpError`

HTTP error.

```typescript
interface HttpError extends Error {
  /**
   * Response (if available).
   */
  response?: HttpResponse

  /**
   * Request options.
   */
  request: HttpRequestOptions & { url: string }

  /**
   * Error code (e.g., 'ECONNREFUSED', 'ETIMEDOUT').
   */
  code?: string

  /**
   * Whether the request was aborted.
   */
  isAborted?: boolean

  /**
   * Whether the request timed out.
   */
  isTimeout?: boolean
}
```

#### `HttpRequestOptions`

HTTP request options.

```typescript
interface HttpRequestOptions {
  /**
   * HTTP method.
   */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

  /**
   * Request headers.
   */
  headers?: Record<string, string>

  /**
   * Request body (will be JSON-stringified if object).
   */
  body?: unknown

  /**
   * Query parameters.
   */
  params?: Record<string, string | number | boolean | undefined>

  /**
   * Request timeout in milliseconds.
   */
  timeout?: number

  /**
   * Base URL to prepend to the request URL.
   */
  baseURL?: string

  /**
   * Whether to include credentials (cookies) in the request.
   */
  credentials?: 'omit' | 'same-origin' | 'include'

  /**
   * Response type.
   */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'

  /**
   * Signal for aborting the request.
   */
  signal?: AbortSignal

  /**
   * Custom options passed to the underlying client.
   */
  [key: string]: unknown
}
```

#### `HttpResponse`

HTTP response.

```typescript
interface HttpResponse<T = unknown> {
  /**
   * Response status code.
   */
  status: number

  /**
   * Response status text.
   */
  statusText: string

  /**
   * Response headers.
   */
  headers: Record<string, string>

  /**
   * Response body.
   */
  data: T

  /**
   * Original request options.
   */
  request: HttpRequestOptions & { url: string }
}
```

### Types

#### `ErrorInterceptor`

Callback invoked when an HTTP request fails, allowing error
transformation or logging before re-throwing.

```typescript
type ErrorInterceptor = (error: HttpError) => HttpError | Promise<HttpError>
```

#### `RequestInterceptor`

Function that transforms an outgoing HTTP request before it is sent (e.g. add auth headers).

```typescript
type RequestInterceptor = (
  options: HttpRequestOptions & { url: string },
) => (HttpRequestOptions & { url: string }) | Promise<HttpRequestOptions & { url: string }>
```

#### `ResponseInterceptor`

Function that transforms an incoming HTTP response before it is returned (e.g. unwrap data).

```typescript
type ResponseInterceptor<T = unknown> = (
  response: HttpResponse<T>,
) => HttpResponse<T> | Promise<HttpResponse<T>>
```

### Functions

#### `del(url, options)`

Sends an HTTP DELETE request using the bonded (or default) client.

```typescript
function del(url: string, options?: Omit<HttpRequestOptions, "method">): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `options` — Request options (method is excluded).

**Returns:** The HTTP response containing status, headers, and parsed body data.

#### `get(url, options)`

Sends an HTTP GET request using the bonded (or default) client.

```typescript
function get(url: string, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `options` — Request options (method and body are excluded).

**Returns:** The HTTP response containing status, headers, and parsed body data.

#### `getClient()`

Retrieves the bonded HTTP client. Falls back to the built-in
fetch-based client if no bond has been configured.

```typescript
function getClient(): HttpClient
```

**Returns:** The bonded HTTP client, or the default fetch-based client.

#### `hasClient()`

Checks whether a custom HTTP client is currently bonded.

```typescript
function hasClient(): boolean
```

**Returns:** `true` if a custom HTTP client is bonded.

#### `patch(url, body, options)`

Sends an HTTP PATCH request using the bonded (or default) client.

```typescript
function patch(url: string, body?: unknown, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `body` — The request body (objects are JSON-stringified automatically).
- `options` — Request options (method and body are excluded).

**Returns:** The HTTP response containing status, headers, and parsed body data.

#### `post(url, body, options)`

Sends an HTTP POST request using the bonded (or default) client.

```typescript
function post(url: string, body?: unknown, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `body` — The request body (objects are JSON-stringified automatically).
- `options` — Request options (method and body are excluded).

**Returns:** The HTTP response containing status, headers, and parsed body data.

#### `put(url, body, options)`

Sends an HTTP PUT request using the bonded (or default) client.

```typescript
function put(url: string, body?: unknown, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `body` — The request body (objects are JSON-stringified automatically).
- `options` — Request options (method and body are excluded).

**Returns:** The HTTP response containing status, headers, and parsed body data.

#### `request(url, options)`

Sends an HTTP request using the bonded (or default) client.

```typescript
function request(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>
```

- `url` — The request URL.
- `options` — Request options including method, headers, body, and query params.

**Returns:** The HTTP response containing status, headers, and parsed body data.

#### `setClient(client)`

Registers an HTTP client as the active singleton. Called by bond
packages during application startup.

```typescript
function setClient(client: HttpClient): void
```

- `client` — The HTTP client implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Axios | `@molecule/api-http-axios` |
| Fetch | `@molecule/api-http-fetch` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
