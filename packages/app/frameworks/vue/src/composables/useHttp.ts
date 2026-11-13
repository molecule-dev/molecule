/**
 * Vue composable for HTTP requests.
 *
 * @module
 */

import {
  getCurrentInstance,
  getCurrentScope,
  inject,
  onMounted,
  onScopeDispose,
  type Ref,
  ref,
} from 'vue'

import type { HttpClient, HttpResponse, RequestConfig } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'

import { HttpKey } from '../injection-keys.js'
import type { UseHttpOptions, UseHttpReturn } from '../types.js'
import { adoptContinuity, offerContinuity } from './host-continuity.js'

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
 * The request-lane state one host slot owns across the mounts a host makes of
 * this composable (a host that swaps the arguments re-mounts the composable;
 * the lane is what React's single re-rendered instance kept).
 */
interface HttpLane {
  /** The request that currently owns the hook's state. */
  latest: number
  /** Whether this slot's mount-time `immediate` request already ran. */
  immediateFired: boolean
  /** False once the slot's host is gone with no replacement. */
  dead: boolean
  /**
   * The state the live mount last published. React's single instance keeps its
   * state across the argument re-render; the replacing mount starts its refs
   * from here so a pending request still shows `loading` and an answered one
   * still shows its `data`.
   */
  state: { data: unknown; loading: boolean; error: Error | null }
  /** The live mount's state writers; the latest mount's refs win. */
  sink: {
    patch: (next: Partial<{ data: unknown; loading: boolean; error: Error | null }>) => void
  } | null
}

/**
 * Composable for making HTTP requests with state management.
 *
 * `execute` keeps one identity for the composable's life. The newest request
 * owns the state: an older response answering after a newer `execute` or
 * `reset` cannot touch it, while the callbacks (`onSuccess`/`onError`) still
 * report every request's own outcome. `reset` takes ownership too. A failure
 * resolves `null`; it never rethrows. `immediate` runs its request once per
 * host slot, on mount only.
 *
 * @param method - HTTP method
 * @param url - Request URL
 * @param options - Request options (body `data`, headers, params, `signal`,
 *   callbacks, `immediate`)
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
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options?: UseHttpOptions<T>,
): UseHttpReturn<T> {
  const client = useHttpClient()
  const immediate = options?.immediate ?? false

  // The app identity keys continuity: only a mount under a DIFFERENT app in
  // the same synchronous block (a host re-mounting the composable with new
  // arguments) adopts the previous lane.
  const app = getCurrentInstance()?.appContext.app
  const adopted = adoptContinuity<HttpLane>(app)
  const lane: HttpLane = adopted ?? {
    latest: 0,
    immediateFired: false,
    dead: false,
    state: { data: null, loading: false, error: null },
    sink: null,
  }

  // Reactive state — the replacing mount starts from the lane's last published
  // state, exactly what React's re-rendered instance kept.
  const data = ref((adopted ? lane.state.data : null) as T | null) as Ref<T | null>
  const loading = ref(adopted ? lane.state.loading : immediate)
  const error = ref<Error | null>(adopted ? lane.state.error : null)

  lane.sink = {
    patch: (next) => {
      if (next.data !== undefined) {
        lane.state.data = next.data
        data.value = next.data as T | null
      }
      if (next.loading !== undefined) {
        lane.state.loading = next.loading
        loading.value = next.loading
      }
      if (next.error !== undefined) {
        lane.state.error = next.error
        error.value = next.error
      }
    },
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      lane.sink = null
      offerContinuity(lane, app)
    })
  }

  const execute = async (): Promise<T | null> => {
    if (lane.dead) return null

    const requestConfig: RequestConfig = { ...(options ?? {}) }
    delete (requestConfig as { immediate?: unknown }).immediate
    delete (requestConfig as Record<string, unknown>).onSuccess
    delete (requestConfig as Record<string, unknown>).onError
    const { onSuccess, onError } = (options ?? {}) as {
      onSuccess?: (data: T) => void
      onError?: (error: Error) => void
    }

    const request = ++lane.latest
    // Only the newest request may change what the hook shows; the callbacks
    // report THIS request's outcome even when it was superseded.
    const ownsState = (): boolean => !lane.dead && request === lane.latest

    lane.sink?.patch({ loading: true, error: null })

    try {
      let response: HttpResponse<T>

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
        default:
          throw new Error(
            t(
              'vue.error.unsupportedMethod',
              { method },
              { defaultValue: 'Unsupported method: {{method}}' },
            ),
          )
      }

      if (!lane.dead) {
        if (ownsState()) lane.sink?.patch({ data: response.data, loading: false, error: null })
        onSuccess?.(response.data)
      }

      return response.data
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      if (!lane.dead) {
        if (ownsState()) lane.sink?.patch({ data: null, loading: false, error: e })
        onError?.(e)
      }
      return null
    }
  }

  const reset = (): void => {
    // reset takes ownership: a request it superseded cannot repopulate.
    lane.latest++
    lane.sink?.patch({ data: null, loading: false, error: null })
  }

  // Execute immediately if requested — once per host slot, on mount only, the
  // option's historical contract.
  const runImmediate = (): void => {
    if (immediate && !lane.immediateFired) {
      lane.immediateFired = true
      void execute()
    }
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
export function useGet<T>(url: string, options?: UseHttpOptions<T>): UseHttpReturn<T> {
  return useHttp<T>('GET', url, options)
}

/**
 * Composable for POST requests.
 *
 * @param url - The request URL to send data to.
 * @param options - HTTP request options including body data, headers and callbacks.
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function usePost<T>(url: string, options?: UseHttpOptions<T>): UseHttpReturn<T> {
  return useHttp<T>('POST', url, options)
}

/**
 * Composable for PUT requests.
 *
 * @param url - The request URL to send a full replacement to.
 * @param options - HTTP request options including body data, headers and callbacks.
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function usePut<T>(url: string, options?: UseHttpOptions<T>): UseHttpReturn<T> {
  return useHttp<T>('PUT', url, options)
}

/**
 * Composable for PATCH requests.
 *
 * @param url - The request URL to send a partial update to.
 * @param options - HTTP request options including body data, headers and callbacks.
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function usePatch<T>(url: string, options?: UseHttpOptions<T>): UseHttpReturn<T> {
  return useHttp<T>('PATCH', url, options)
}

/**
 * Composable for DELETE requests.
 *
 * @param url - The request URL of the resource to delete.
 * @param options - HTTP request options including callbacks.
 * @returns Reactive request state (data, loading, error) and execute/reset methods.
 */
export function useDelete<T>(url: string, options?: UseHttpOptions<T>): UseHttpReturn<T> {
  return useHttp<T>('DELETE', url, options)
}
