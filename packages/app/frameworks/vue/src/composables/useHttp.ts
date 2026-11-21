/**
 * Vue composable for HTTP requests.
 *
 * @module
 */

import {
  getCurrentInstance,
  getCurrentScope,
  inject,
  type MaybeRefOrGetter,
  onMounted,
  onScopeDispose,
  type Ref,
  ref,
  toValue,
} from 'vue'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'

import { HttpKey } from '../injection-keys.js'
import type { UseHttpOptions, UseHttpResult } from '../types.js'

/**
 * Composable to access the HTTP client from injection.
 *
 * @returns The HTTP client
 * @throws {Error} Error if used without providing http
 */
export function useHttpClient(): HttpClient {
  const client = inject(HttpKey)
  if (!client) {
    throw new Error(
      t('vue.error.useHttpOutsideProvider', undefined, {
        defaultValue: 'useHttpClient must be used within an HttpProvider',
      }),
    )
  }
  return client
}

/**
 * Composable for making HTTP requests with state management.
 *
 * `execute` keeps one identity for the composable's life. The newest request
 * owns the state: an older response answering after a newer `execute` or
 * `reset` cannot touch it, while the callbacks (`onSuccess`/`onError`) still
 * report every request's own outcome. `reset` takes ownership too. A failure
 * resolves `null`; it never rethrows. `immediate` runs its request once, on
 * mount only.
 *
 * Every argument may be reactive (a ref or a getter): `method`, `url` and the
 * request options are read when `execute` runs, the way React's re-rendered
 * hook sends what its latest render passed. `immediate` is read once, from the
 * options at mount, and a later argument change never repeats it — React runs
 * that request once per mount.
 *
 * @param method - HTTP method; may be reactive and is read when a request runs.
 * @param url - Request URL; may be reactive and is read when a request runs.
 * @param options - Request options (body `data`, headers, params, `signal`,
 *   callbacks, `immediate`); may be reactive and is read when a request runs,
 *   except `immediate`, which is read on mount only.
 * @returns Request state and execute function
 *
 * @example
 * ```vue
 * <script setup>
 * import { useHttp } from '@molecule/app-vue'
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
  method: MaybeRefOrGetter<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>,
  url: MaybeRefOrGetter<string>,
  options?: MaybeRefOrGetter<UseHttpOptions<T> | undefined>,
): UseHttpResult<T> {
  const client = useHttpClient()
  const immediate = toValue(options)?.immediate ?? false

  // Reactive state. React keeps it in useState across a re-render with new
  // arguments; the composable keeps it here across reactive-argument changes.
  const data = ref(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // False once the component (or effect scope) that owns this instance is gone:
  // a late response settles quietly, exactly like React past unmount.
  let alive = true
  if (getCurrentScope()) {
    onScopeDispose(() => {
      alive = false
    })
  }

  // The newest request owns the state. `reset` bumps it too, so a request it
  // superseded cannot repopulate.
  let latest = 0

  const execute = async (): Promise<T | null> => {
    if (!alive) return null

    // Options describe the request being sent; they are read NOW, the way
    // React's execute reads its latest committed options ref.
    const currentOptions = toValue(options) ?? {}
    const { immediate: _immediate, onSuccess, onError, ...requestConfig } = currentOptions
    const request = ++latest
    // Callbacks report THIS request's outcome even when a newer request or a
    // reset has superseded what the hook shows.
    const ownsState = (): boolean => alive && request === latest

    loading.value = true
    error.value = null

    try {
      let response: HttpResponse<T>
      const currentMethod = toValue(method)
      const currentUrl = toValue(url)

      switch (currentMethod) {
        case 'GET':
          response = await client.get<T>(currentUrl, requestConfig)
          break
        case 'POST':
          response = await client.post<T>(currentUrl, requestConfig.data, requestConfig)
          break
        case 'PUT':
          response = await client.put<T>(currentUrl, requestConfig.data, requestConfig)
          break
        case 'PATCH':
          response = await client.patch<T>(currentUrl, requestConfig.data, requestConfig)
          break
        case 'DELETE':
          response = await client.delete<T>(currentUrl, requestConfig)
          break
        default:
          throw new Error(
            t(
              'vue.error.unsupportedMethod',
              { method: currentMethod },
              { defaultValue: 'Unsupported method: {{method}}' },
            ),
          )
      }

      if (alive) {
        if (ownsState()) {
          data.value = response.data
          loading.value = false
          error.value = null
        }
        onSuccess?.(response.data)
      }

      return response.data
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      if (alive) {
        if (ownsState()) {
          data.value = null
          loading.value = false
          error.value = e
        }
        onError?.(e)
      }
      return null
    }
  }

  const reset = (): void => {
    // reset takes ownership: a request it superseded cannot repopulate.
    latest++
    data.value = null
    loading.value = false
    error.value = null
  }

  // Execute immediately if requested — once, on mount only, from the options
  // the composable was created with. A later reactive change never repeats it.
  const runImmediate = (): void => {
    if (immediate) void execute()
  }
  if (getCurrentInstance()) {
    onMounted(runImmediate)
  } else {
    runImmediate()
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
 *
 * @param url - The request URL to fetch from.
 * @param options - HTTP request options including callbacks and request config.
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function useGet<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('GET', url, options)
}

/**
 * Composable for POST requests.
 *
 * @param url - The request URL to send data to.
 * @param options - HTTP request options including body data, headers and callbacks.
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function usePost<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('POST', url, options)
}

/**
 * Composable for PUT requests.
 *
 * @param url - The request URL to send a full replacement to.
 * @param options - HTTP request options including body data, headers and callbacks.
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function usePut<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PUT', url, options)
}

/**
 * Composable for PATCH requests.
 *
 * @param url - The request URL to send a partial update to.
 * @param options - HTTP request options including body data, headers and callbacks.
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function usePatch<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PATCH', url, options)
}

/**
 * Composable for DELETE requests.
 *
 * @param url - The request URL of the resource to delete.
 * @param options - HTTP request options including callbacks.
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function useDelete<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('DELETE', url, options)
}
