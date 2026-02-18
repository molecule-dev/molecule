/**
 * Vue composable for HTTP requests.
 *
 * @module
 */

import { inject, onMounted, onUnmounted, type Ref, ref } from 'vue'

import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'

import { HttpKey } from '../injection-keys.js'
import type { UseHttpOptions, UseHttpReturn } from '../types.js'

/**
 * Composable to access the HTTP client from injection.
 *
 * @returns The HTTP client
 * @throws {Error} Error if used without providing http
 */
export function useHttpClient(): HttpClient {
  const client = inject(HttpKey)
  if (!client) {
    throw new Error('useHttpClient requires HttpProvider to be provided')
  }
  return client
}

/**
 * Composable for making HTTP requests with state management.
 *
 * @param method - HTTP method
 * @param url - Request URL
 * @param config - Request configuration
 * @param options - Composable options
 * @returns Request state and execute function
 *
 * @example
 * ```vue
 * <script setup>
 * import { useHttp } from '`@molecule/app-vue`'
 *
 * const { data, loading, error, execute } = useHttp('GET', '/api/users')
 *
 * // Execute on mount
 * onMounted(() => execute())
 * </script>
 *
 * <template>
 *   <div v-if="loading">Loading...</div>
 *   <div v-else-if="error">Error: {{ error.message }}</div>
 *   <div v-else>
 *     <ul>
 *       <li v-for="user in data" :key="user.id">{{ user.name }}</li>
 *     </ul>
 *   </div>
 * </template>
 * ```
 */
export function useHttp<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  config?: RequestConfig,
  options?: UseHttpOptions,
): UseHttpReturn<T> {
  const client = useHttpClient()
  const { immediate = false, onSuccess, onError } = options ?? {}

  // Reactive state
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(immediate)
  const error = ref<Error | null>(null)

  // Track mounted state
  let mounted = true

  onMounted(() => {
    mounted = true
    if (immediate) {
      execute()
    }
  })

  onUnmounted(() => {
    mounted = false
  })

  const execute = async (): Promise<T | null> => {
    if (!mounted) return null

    loading.value = true
    error.value = null

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
        default:
          throw new Error(`Unsupported method: ${method}`)
      }

      if (mounted) {
        data.value = response.data
        loading.value = false
        onSuccess?.(response.data)
      }

      return response.data
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      if (mounted) {
        error.value = e
        loading.value = false
        onError?.(e)
      }
      return null
    }
  }

  const reset = (): void => {
    data.value = null
    loading.value = false
    error.value = null
  }

  return {
    data,
    loading,
    error,
    execute,
    reset,
  }
}

/**
 * Composable for GET requests.
 * @param url - The request URL to fetch from.
 * @param config - Optional HTTP request configuration (headers, params, etc.).
 * @param options - Optional composable behavior options (immediate execution, callbacks).
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function useGet<T>(
  url: string,
  config?: RequestConfig,
  options?: UseHttpOptions,
): UseHttpReturn<T> {
  return useHttp<T>('GET', url, config, options)
}

/**
 * Composable for POST requests.
 * @param url - The request URL to send data to.
 * @param config - Optional HTTP request configuration (headers, body data, etc.).
 * @param options - Optional composable behavior options (immediate execution, callbacks).
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function usePost<T>(
  url: string,
  config?: RequestConfig,
  options?: UseHttpOptions,
): UseHttpReturn<T> {
  return useHttp<T>('POST', url, config, options)
}

/**
 * Composable for PUT requests.
 * @param url - The request URL to send a full replacement to.
 * @param config - Optional HTTP request configuration (headers, body data, etc.).
 * @param options - Optional composable behavior options (immediate execution, callbacks).
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function usePut<T>(
  url: string,
  config?: RequestConfig,
  options?: UseHttpOptions,
): UseHttpReturn<T> {
  return useHttp<T>('PUT', url, config, options)
}

/**
 * Composable for PATCH requests.
 * @param url - The request URL to send a partial update to.
 * @param config - Optional HTTP request configuration (headers, body data, etc.).
 * @param options - Optional composable behavior options (immediate execution, callbacks).
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function usePatch<T>(
  url: string,
  config?: RequestConfig,
  options?: UseHttpOptions,
): UseHttpReturn<T> {
  return useHttp<T>('PATCH', url, config, options)
}

/**
 * Composable for DELETE requests.
 * @param url - The request URL of the resource to delete.
 * @param config - Optional HTTP request configuration (headers, params, etc.).
 * @param options - Optional composable behavior options (immediate execution, callbacks).
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function useDelete<T>(
  url: string,
  config?: RequestConfig,
  options?: UseHttpOptions,
): UseHttpReturn<T> {
  return useHttp<T>('DELETE', url, config, options)
}
