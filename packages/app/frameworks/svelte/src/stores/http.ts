/**
 * Svelte stores for HTTP requests.
 *
 * @module
 */

import { type Subscriber, type Unsubscriber, writable } from 'svelte/store'

import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'

import { getHttpClient } from '../context.js'
import type { HttpState } from '../types.js'

/**
 * An HTTP store with subscribe, execute, and reset.
 */
interface HttpStore<T> {
  subscribe: (run: Subscriber<HttpState<T>>, invalidate?: () => void) => Unsubscriber
  execute: (overrideConfig?: RequestConfig) => Promise<T | null>
  reset: () => void
}

/**
 * An HTTP store created from a specific client (execute takes no params).
 */
interface HttpStoreWithClient<T> {
  subscribe: (run: Subscriber<HttpState<T>>, invalidate?: () => void) => Unsubscriber
  execute: () => Promise<T | null>
  reset: () => void
}

/**
 * Factory methods for creating HTTP stores from a client.
 */
interface HttpStoreFactory {
  get: <T>(url: string, config?: RequestConfig) => HttpStoreWithClient<T>
  post: <T>(url: string, config?: RequestConfig) => HttpStoreWithClient<T>
  put: <T>(url: string, config?: RequestConfig) => HttpStoreWithClient<T>
  patch: <T>(url: string, config?: RequestConfig) => HttpStoreWithClient<T>
  delete: <T>(url: string, config?: RequestConfig) => HttpStoreWithClient<T>
}

/**
 * Create an HTTP request store.
 *
 * @param method - HTTP method
 * @param url - Request URL
 * @param config - Request configuration
 * @returns Store with state and actions
 *
 * @example
 * ```svelte
 * <script>
 *   import { createHttpStore } from '`@molecule/app-svelte`'
 *
 *   const users = createHttpStore('GET', '/api/users')
 *
 *   $: if ($users.loading) console.log('Loading...')
 *   $: if ($users.error) console.error($users.error)
 *   $: if ($users.data) console.log('Users:', $users.data)
 *
 *   users.execute()
 * </script>
 *
 * {#if $users.loading}
 *   <p>Loading...</p>
 * {:else if $users.error}
 *   <p>Error: {$users.error.message}</p>
 * {:else if $users.data}
 *   <ul>
 *     {#each $users.data as user}
 *       <li>{user.name}</li>
 *     {/each}
 *   </ul>
 * {/if}
 * ```
 */
export function createHttpStore<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  config?: RequestConfig,
): HttpStore<T> {
  const client = getHttpClient()
  const store = writable<HttpState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = async (overrideConfig?: RequestConfig): Promise<T | null> => {
    store.update((s: HttpState<T>) => ({ ...s, loading: true, error: null }))

    try {
      let response: HttpResponse<T>
      const requestConfig = { ...config, ...overrideConfig }

      switch (method) {
        case 'GET':
          response = await client.get<T>(url, requestConfig)
          break
        case 'POST':
          response = await client.post<T>(
            url,
            (requestConfig as RequestConfig & { data?: unknown })?.data,
            requestConfig,
          )
          break
        case 'PUT':
          response = await client.put<T>(
            url,
            (requestConfig as RequestConfig & { data?: unknown })?.data,
            requestConfig,
          )
          break
        case 'PATCH':
          response = await client.patch<T>(
            url,
            (requestConfig as RequestConfig & { data?: unknown })?.data,
            requestConfig,
          )
          break
        case 'DELETE':
          response = await client.delete<T>(url, requestConfig)
          break
      }

      store.set({ data: response.data, loading: false, error: null })
      return response.data
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      store.set({ data: null, loading: false, error: err })
      return null
    }
  }

  const reset = (): void => {
    store.set({ data: null, loading: false, error: null })
  }

  return {
    subscribe: store.subscribe,
    execute,
    reset,
  }
}

/**
 * Creates a GET request store.
 *
 * @param url - The request endpoint URL.
 * @param config - Optional request configuration such as headers or params.
 * @returns A subscribable HTTP store for the GET request with execute and reset methods.
 */
export function createGetStore<T>(url: string, config?: RequestConfig): HttpStore<T> {
  return createHttpStore<T>('GET', url, config)
}

/**
 * Creates a POST request store.
 *
 * @param url - The request endpoint URL.
 * @param config - Optional request configuration such as headers or body data.
 * @returns A subscribable HTTP store for the POST request with execute and reset methods.
 */
export function createPostStore<T>(url: string, config?: RequestConfig): HttpStore<T> {
  return createHttpStore<T>('POST', url, config)
}

/**
 * Creates a PUT request store.
 *
 * @param url - The request endpoint URL.
 * @param config - Optional request configuration such as headers or body data.
 * @returns A subscribable HTTP store for the PUT request with execute and reset methods.
 */
export function createPutStore<T>(url: string, config?: RequestConfig): HttpStore<T> {
  return createHttpStore<T>('PUT', url, config)
}

/**
 * Creates a PATCH request store.
 *
 * @param url - The request endpoint URL.
 * @param config - Optional request configuration such as headers or body data.
 * @returns A subscribable HTTP store for the PATCH request with execute and reset methods.
 */
export function createPatchStore<T>(url: string, config?: RequestConfig): HttpStore<T> {
  return createHttpStore<T>('PATCH', url, config)
}

/**
 * Creates a DELETE request store.
 *
 * @param url - The request endpoint URL.
 * @param config - Optional request configuration such as headers or params.
 * @returns A subscribable HTTP store for the DELETE request with execute and reset methods.
 */
export function createDeleteStore<T>(url: string, config?: RequestConfig): HttpStore<T> {
  return createHttpStore<T>('DELETE', url, config)
}

/**
 * Creates HTTP store factory methods bound to a specific client instance.
 *
 * @param client - The HTTP client to use for all created stores.
 * @returns An object with get, post, put, patch, and delete factory methods.
 */
export function createHttpStoresFromClient(client: HttpClient): HttpStoreFactory {
  return {
    get: <T>(url: string, config?: RequestConfig) =>
      createHttpStoreWithClient<T>(client, 'GET', url, config),
    post: <T>(url: string, config?: RequestConfig) =>
      createHttpStoreWithClient<T>(client, 'POST', url, config),
    put: <T>(url: string, config?: RequestConfig) =>
      createHttpStoreWithClient<T>(client, 'PUT', url, config),
    patch: <T>(url: string, config?: RequestConfig) =>
      createHttpStoreWithClient<T>(client, 'PATCH', url, config),
    delete: <T>(url: string, config?: RequestConfig) =>
      createHttpStoreWithClient<T>(client, 'DELETE', url, config),
  }
}

/**
 * Creates an HTTP store bound to a specific client, method, and URL.
 *
 * @param client - The HTTP client to execute requests with.
 * @param method - The HTTP method (GET, POST, PUT, PATCH, or DELETE).
 * @param url - The request endpoint URL.
 * @param config - Optional request configuration such as headers or body data.
 * @returns A subscribable HTTP store with execute and reset methods.
 */
function createHttpStoreWithClient<T>(
  client: HttpClient,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  config?: RequestConfig,
): HttpStoreWithClient<T> {
  const store = writable<HttpState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = async (): Promise<T | null> => {
    store.update((s: HttpState<T>) => ({ ...s, loading: true, error: null }))
    try {
      let response: HttpResponse<T>
      switch (method) {
        case 'GET':
          response = await client.get<T>(url, config)
          break
        case 'POST':
          response = await client.post<T>(
            url,
            (config as RequestConfig & { data?: unknown })?.data,
            config,
          )
          break
        case 'PUT':
          response = await client.put<T>(
            url,
            (config as RequestConfig & { data?: unknown })?.data,
            config,
          )
          break
        case 'PATCH':
          response = await client.patch<T>(
            url,
            (config as RequestConfig & { data?: unknown })?.data,
            config,
          )
          break
        case 'DELETE':
          response = await client.delete<T>(url, config)
          break
      }
      store.set({ data: response.data, loading: false, error: null })
      return response.data
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      store.set({ data: null, loading: false, error: err })
      return null
    }
  }

  return {
    subscribe: store.subscribe,
    execute,
    reset: () => store.set({ data: null, loading: false, error: null }),
  }
}
