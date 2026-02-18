# @molecule/app-http-axios

Axios HTTP client provider for `@molecule/app-http`.

This package provides an Axios-based implementation of the molecule HttpClient interface,
allowing you to use molecule's HTTP abstractions with Axios.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-http-axios
```

## Usage

```ts
import { createAxiosClient } from '@molecule/app-http-axios'
import { setClient } from '@molecule/app-http'

const client = createAxiosClient({
  baseURL: 'https://api.example.com',
  timeout: 10000,
})

setClient(client)

// Now use via `@molecule/app-http`
import { get, post } from '@molecule/app-http'
const users = await get('/users')
const newUser = await post('/users', { name: 'John' })
```

## API

### Interfaces

#### `AxiosHttpClientConfig`

Axios-specific configuration.

```typescript
interface AxiosHttpClientConfig {
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

  /**
   * Existing Axios instance to wrap (optional).
   */
  instance?: AxiosInstance

  /**
   * Additional Axios-specific config.
   */
  axiosConfig?: AxiosRequestConfig
}
```

#### `FullRequestConfig`

Full request configuration including method and URL.

```typescript
interface FullRequestConfig extends RequestConfig {
    /**
     * HTTP method.
     */
    method: HttpMethod;
    /**
     * Request URL (can be relative or absolute).
     */
    url: string;
    /**
     * Request body data.
     */
    data?: unknown;
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
    baseURL: string;
    /**
     * Default headers for all requests.
     */
    defaultHeaders: Record<string, string>;
    /**
     * Makes a generic HTTP request.
     */
    request<T = unknown>(config: FullRequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a GET request.
     */
    get<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a POST request.
     */
    post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a PUT request.
     */
    put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a PATCH request.
     */
    patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Makes a DELETE request.
     */
    delete<T = unknown>(url: string, config?: RequestConfig): Promise<HttpResponse<T>>;
    /**
     * Adds a request interceptor.
     * Returns a function to remove the interceptor.
     */
    addRequestInterceptor(interceptor: RequestInterceptor): () => void;
    /**
     * Adds a response interceptor.
     * Returns a function to remove the interceptor.
     */
    addResponseInterceptor(interceptor: ResponseInterceptor): () => void;
    /**
     * Adds an error interceptor.
     * Returns a function to remove the interceptor.
     */
    addErrorInterceptor(interceptor: ErrorInterceptor): () => void;
    /**
     * Sets the authorization token.
     */
    setAuthToken(token: string | null): void;
    /**
     * Returns the current authorization token, or `null` if not set.
     */
    getAuthToken(): string | null;
    /**
     * Registers a handler for authentication errors (401).
     *
     * @returns An unsubscribe function.
     */
    onAuthError(handler: () => void): () => void;
}
```

#### `HttpClientConfig`

HTTP client configuration.

```typescript
interface HttpClientConfig {
    /**
     * Base URL for all requests.
     */
    baseURL?: string;
    /**
     * Default headers for all requests.
     */
    defaultHeaders?: Record<string, string>;
    /**
     * Default timeout in milliseconds.
     */
    timeout?: number;
    /**
     * Whether to include credentials by default.
     */
    withCredentials?: boolean;
}
```

#### `HttpResponse`

Parsed HTTP response with status code, headers, and typed body data.

```typescript
interface HttpResponse<T = unknown> {
    /**
     * Response data.
     */
    data: T;
    /**
     * HTTP status code.
     */
    status: number;
    /**
     * HTTP status text.
     */
    statusText: string;
    /**
     * Response headers.
     */
    headers: Record<string, string>;
    /**
     * Original request config.
     */
    config: FullRequestConfig;
}
```

#### `RequestConfig`

HTTP request options (headers, query params, timeout, credentials, response type, abort signal).

```typescript
interface RequestConfig {
    /**
     * Request headers.
     */
    headers?: Record<string, string>;
    /**
     * Query parameters.
     */
    params?: Record<string, string | number | boolean | undefined>;
    /**
     * Request timeout in milliseconds.
     */
    timeout?: number;
    /**
     * Whether to include credentials (cookies).
     */
    withCredentials?: boolean;
    /**
     * Response type.
     */
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
    /**
     * Abort signal for cancellation.
     */
    signal?: AbortSignal;
    /**
     * Request body data.
     */
    data?: unknown;
    /**
     * Custom request options (implementation-specific).
     */
    options?: Record<string, unknown>;
}
```

### Types

#### `ErrorInterceptor`

Intercepts HTTP errors to transform, retry, or rethrow them.
Throwing from this interceptor propagates the error to the caller.

```typescript
type ErrorInterceptor = (error: HttpError) => HttpError | Promise<HttpError> | never;
```

#### `HttpMethod`

HTTP request method.

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
```

#### `RequestInterceptor`

Intercepts outgoing requests to modify headers, URL, or body
before the request is sent.

```typescript
type RequestInterceptor = (config: FullRequestConfig) => FullRequestConfig | Promise<FullRequestConfig>;
```

#### `ResponseInterceptor`

Intercepts incoming responses to transform data, check status,
or perform side effects before the response reaches the caller.

```typescript
type ResponseInterceptor<T = unknown> = (response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>;
```

### Classes

#### `HttpError`

HTTP error with response details.

### Functions

#### `createAxiosClient(config)`

Creates an Axios-based HTTP client implementing the molecule `HttpClient` interface.
Supports request/response/error interceptors, auth token management, and 401 error handlers.

```typescript
function createAxiosClient(config?: AxiosHttpClientConfig): HttpClient
```

- `config` — Axios client configuration (base URL, headers, timeout, credentials, or an existing Axios instance).

**Returns:** An `HttpClient` backed by Axios with interceptor and auth token support.

### Constants

#### `provider`

Default Axios-based HTTP client created with default options (no base URL, 30s timeout).

```typescript
const provider: HttpClient
```

## Core Interface
Implements `@molecule/app-http` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-http` ^1.0.0
- `axios` ^1.6.0
