# @molecule/api-http-axios

Axios HTTP client provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-http-axios
```

## API

### Interfaces

#### `AxiosClientOptions`

Options for creating an Axios client.

```typescript
interface AxiosClientOptions extends HttpRequestOptions {
  /**
   * Axios instance to use (if not provided, a new one is created).
   */
  instance?: AxiosInstance
}
```

#### `HttpClient`

HTTP client interface that all HTTP bond packages must implement.

Provides methods for each HTTP verb plus optional interceptors and
client factory support.

```typescript
interface HttpClient {
    /**
     * Makes an HTTP request.
     */
    request<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    /**
     * Makes a GET request.
     */
    get<T = unknown>(url: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>>;
    /**
     * Makes a POST request.
     */
    post<T = unknown>(url: string, body?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>>;
    /**
     * Makes a PUT request.
     */
    put<T = unknown>(url: string, body?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>>;
    /**
     * Makes a PATCH request.
     */
    patch<T = unknown>(url: string, body?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>>;
    /**
     * Makes a DELETE request.
     */
    delete<T = unknown>(url: string, options?: Omit<HttpRequestOptions, 'method'>): Promise<HttpResponse<T>>;
    /**
     * Creates a new client with the given defaults.
     */
    create?(defaults: HttpRequestOptions): HttpClient;
    /**
     * Adds a request interceptor.
     */
    addRequestInterceptor?(interceptor: RequestInterceptor): () => void;
    /**
     * Adds a response interceptor.
     */
    addResponseInterceptor?(interceptor: ResponseInterceptor): () => void;
    /**
     * Adds an error interceptor.
     */
    addErrorInterceptor?(interceptor: ErrorInterceptor): () => void;
}
```

#### `HttpError`

HTTP error.

```typescript
interface HttpError extends Error {
    /**
     * Response (if available).
     */
    response?: HttpResponse;
    /**
     * Request options.
     */
    request: HttpRequestOptions & {
        url: string;
    };
    /**
     * Error code (e.g., 'ECONNREFUSED', 'ETIMEDOUT').
     */
    code?: string;
    /**
     * Whether the request was aborted.
     */
    isAborted?: boolean;
    /**
     * Whether the request timed out.
     */
    isTimeout?: boolean;
}
```

#### `HttpRequestOptions`

HTTP request options.

```typescript
interface HttpRequestOptions {
    /**
     * HTTP method.
     */
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
    /**
     * Request headers.
     */
    headers?: Record<string, string>;
    /**
     * Request body (will be JSON-stringified if object).
     */
    body?: unknown;
    /**
     * Query parameters.
     */
    params?: Record<string, string | number | boolean | undefined>;
    /**
     * Request timeout in milliseconds.
     */
    timeout?: number;
    /**
     * Base URL to prepend to the request URL.
     */
    baseURL?: string;
    /**
     * Whether to include credentials (cookies) in the request.
     */
    credentials?: 'omit' | 'same-origin' | 'include';
    /**
     * Response type.
     */
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
    /**
     * Signal for aborting the request.
     */
    signal?: AbortSignal;
    /**
     * Custom options passed to the underlying client.
     */
    [key: string]: unknown;
}
```

#### `HttpResponse`

HTTP response.

```typescript
interface HttpResponse<T = unknown> {
    /**
     * Response status code.
     */
    status: number;
    /**
     * Response status text.
     */
    statusText: string;
    /**
     * Response headers.
     */
    headers: Record<string, string>;
    /**
     * Response body.
     */
    data: T;
    /**
     * Original request options.
     */
    request: HttpRequestOptions & {
        url: string;
    };
}
```

### Types

#### `ErrorInterceptor`

Callback invoked when an HTTP request fails, allowing error
transformation or logging before re-throwing.

```typescript
type ErrorInterceptor = (error: HttpError) => HttpError | Promise<HttpError>;
```

#### `RequestInterceptor`

Function that transforms an outgoing HTTP request before it is sent (e.g. add auth headers).

```typescript
type RequestInterceptor = (options: HttpRequestOptions & {
    url: string;
}) => (HttpRequestOptions & {
    url: string;
}) | Promise<HttpRequestOptions & {
    url: string;
}>;
```

#### `ResponseInterceptor`

Function that transforms an incoming HTTP response before it is returned (e.g. unwrap data).

```typescript
type ResponseInterceptor<T = unknown> = (response: HttpResponse<T>) => HttpResponse<T> | Promise<HttpResponse<T>>;
```

### Functions

#### `createClient(options)`

Creates an Axios-backed HTTP client that implements the `HttpClient` interface.
Supports request/response/error interceptors and per-request configuration.

```typescript
function createClient(options?: AxiosClientOptions): HttpClient
```

- `options` — Axios client options (baseURL, timeout, headers, or a pre-configured instance).

**Returns:** An `HttpClient` backed by Axios.

#### `toHttpError(error, requestOptions)`

Converts axios error to HttpError.

```typescript
function toHttpError(error: AxiosError, requestOptions: HttpRequestOptions & { url: string; }): HttpError
```

- `error` — The error.
- `requestOptions` — The request options.

**Returns:** The transformed result.

#### `toHttpResponse(response, requestOptions)`

Converts axios response to HttpResponse.

```typescript
function toHttpResponse(response: AxiosResponse<T, any, {}>, requestOptions: HttpRequestOptions & { url: string; }): HttpResponse<T>
```

- `response` — The response object.
- `requestOptions` — The request options.

**Returns:** The transformed result.

### Constants

#### `client`

The default Axios HTTP client instance with default configuration.

```typescript
const client: HttpClient
```

#### `provider`

Alias for the client (for consistency with other providers).

```typescript
const provider: HttpClient
```

### Namespaces

#### `axios`

## Core Interface
Implements `@molecule/api-http` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-http` ^1.0.0
