/**
 * Angular functions for HTTP requests, mirroring `useHttpClient`, `useHttp`,
 * `useGet`, `usePost`, `usePut`, `usePatch` and `useDelete` from
 * `@molecule/app-react`.
 *
 * Like React — whose component instance survives an argument change — the
 * request state survives this site's re-creation (an argument change to the
 * hook): the destroyed instance parks it at the site and the next instance
 * adopts it. See `site.ts`.
 *
 * @module
 */

import {
  DestroyRef,
  ElementRef,
  inject,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core'

import type { HttpClient, RequestConfig } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'

import { injectProvider } from '../inject.js'
import { adoptLane, captureSite, parkLane } from '../site.js'
import { HTTP_CLIENT } from '../tokens.js'

/**
 * The HTTP client registered by `provideMolecule({ http })` or `provideHttp`.
 * Call it in an injection context.
 *
 * @returns The HTTP client.
 * @throws {Error} When no HTTP client is registered.
 */
export function useHttpClient(): HttpClient {
  return injectProvider(
    HTTP_CLIENT,
    'useHttpOutsideProvider',
    'useHttpClient must be used within an HttpProvider',
  )
}

/**
 * State for async HTTP operations.
 *
 * @template T - The response data's shape.
 */
export interface UseHttpState<T> {
  /** The latest successful response's data, `null` before one and after a reset. */
  data: T | null
  /** Whether a request is in flight. */
  loading: boolean
  /** The failure of the newest owned request. */
  error: Error | null
}

/**
 * Result of {@link useHttp}: every state field as a signal (the same fields
 * React's result carries as plain values) and the two controls as plain
 * functions.
 *
 * @template T - The response data's shape.
 */
export interface UseHttpResult<T> {
  /** The latest successful response's data, `null` before one and after a reset. */
  readonly data: Signal<T | null>
  /** Whether a request is in flight. */
  readonly loading: Signal<boolean>
  /** The failure of the newest owned request. */
  readonly error: Signal<Error | null>
  /**
   * Runs the request and resolves with its own data, or `null` on failure,
   * even when a newer request or `reset` has superseded its displayed state.
   *
   * This function is IDENTITY-STABLE for as long as `method`, `url` and the
   * HTTP client do not change, so it is safe as an effect dependency. Its
   * request options are read when it is CALLED.
   *
   * @returns The response data, or `null` on failure.
   */
  execute: () => Promise<T | null>
  /** Supersedes every pending request and clears the state. */
  reset: () => void
}

/**
 * Options for {@link useHttp} and the verb hooks.
 *
 * Every request option — headers, params, body `data`, `signal`, `onSuccess`,
 * `onError` — is read at the moment `execute` runs, not when the hook mounted,
 * so an inline object or callback needs no memoizing. Only `immediate` is read
 * on mount.
 *
 * @template T - The response data's shape.
 */
export interface UseHttpOptions<T> extends RequestConfig {
  /**
   * Whether to execute the request immediately on mount.
   */
  immediate?: boolean
  /**
   * Callback for each request that succeeds while mounted, including a request
   * superseded by another `execute` or `reset`. Read `data` from the hook when
   * only the newest request's result should drive the UI.
   *
   * @param data - The response data.
   */
  onSuccess?: (data: T) => void
  /**
   * Callback for each request that fails while mounted, including a request
   * superseded by another `execute` or `reset`.
   *
   * @param error - The failure.
   */
  onError?: (error: Error) => void
}

/**
 * What one site's lane carries across a re-mount of the same hook kind: the
 * state signals, the newest request's id, whether the host is mounted, and
 * whether `immediate` already ran (it is a mount-only option).
 *
 * @template T - The response data's shape.
 */
interface HttpLane<T> {
  /** The reactive state. */
  readonly data: WritableSignal<T | null>
  readonly loading: WritableSignal<boolean>
  readonly error: WritableSignal<Error | null>
  /** The id of the newest request; it owns the state. */
  latestRequest: number
  /** Whether the current host is mounted. */
  mounted: boolean
  /** Whether `immediate` already ran at this site (it runs once per mount). */
  immediateRan: boolean
}

/**
 * Builds a fresh lane.
 *
 * @param immediate - Whether the first mount starts loading at once.
 * @returns The lane.
 */
function buildLane<T>(immediate: boolean): HttpLane<T> {
  return {
    data: signal<T | null>(null),
    loading: signal<boolean>(immediate),
    error: signal<Error | null>(null),
    latestRequest: 0,
    mounted: true,
    immediateRan: false,
  }
}

/**
 * HTTP requests with state management. Call it in an injection context (a
 * component field initializer or constructor).
 *
 * `execute` keeps one identity while `method`, `url` and the HTTP client stay
 * the same — across the hook's own loading/data updates and inline options or
 * callbacks. The current headers, body, `signal` and callbacks are read when
 * `execute` is called. Changing `method`, `url` or the client selects a
 * different request.
 *
 * The newest request owns the state: an older request that answers after a
 * newer one (or after `reset`) cannot repopulate the displayed state, though
 * its own callbacks still report its outcome.
 *
 * @param method - HTTP method.
 * @param url - Request URL.
 * @param options - Request options, read at call time.
 * @returns The request state as signals and the execute/reset functions.
 */
export function useHttp<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options?: UseHttpOptions<T>,
): UseHttpResult<T> {
  const client = useHttpClient()
  const immediate = options?.immediate ?? false
  const destroyRef = inject(DestroyRef)
  const host = inject(ElementRef).nativeElement as HTMLElement

  // This site's lane: adopted from the destroyed instance on an argument
  // change (its pending requests, state and request counter continue), fresh
  // on a new mount. One lane kind for the whole family — the verb hooks are
  // spellings of useHttp over the same implementation, like React's.
  const adopted = adoptLane<HttpLane<T>>('useHttp')
  const lane: HttpLane<T> = adopted ?? buildLane<T>(options?.immediate ?? false)
  lane.mounted = true

  // The site's container, recorded once the host is attached (see captureSite);
  // the lane parks only while that container is still in the document.
  let site: Element | null = null
  captureSite(host, (captured) => {
    site = captured
  })

  destroyRef.onDestroy(() => {
    lane.mounted = false
    parkLane('useHttp', lane, site)
  })

  const execute = async (): Promise<T | null> => {
    if (!lane.mounted) return null

    // Options describe the request being sent; method/url/client decide WHICH
    // request execute performs. Reading them here keeps the action stable.
    const { immediate: _immediate, onSuccess, onError, ...requestConfig } = options ?? {}
    const request = ++lane.latestRequest
    // Callbacks report THIS request's outcome (a submit's onSuccess still runs);
    // only the newest request may change what the hook shows.
    const ownsState = (): boolean => lane.mounted && request === lane.latestRequest

    lane.loading.set(true)
    lane.error.set(null)

    try {
      let response: { data: T }

      switch (method) {
        case 'GET':
          response = await client.get<T>(url, requestConfig)
          break
        case 'POST':
          response = await client.post<T>(url, requestConfig.data, requestConfig)
          break
        case 'PUT':
          response = await client.put<T>(url, requestConfig.data, requestConfig)
          break
        case 'PATCH':
          response = await client.patch<T>(url, requestConfig.data, requestConfig)
          break
        case 'DELETE':
          response = await client.delete<T>(url, requestConfig)
          break
        default:
          throw new Error(
            t(
              'angular.error.unsupportedMethod',
              { method },
              { defaultValue: 'Unsupported method: {{method}}' },
            ),
          )
      }

      if (lane.mounted) {
        if (ownsState()) {
          lane.data.set(response.data)
          lane.loading.set(false)
          lane.error.set(null)
        }
        onSuccess?.(response.data)
      }

      return response.data
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (lane.mounted) {
        if (ownsState()) {
          lane.data.set(null)
          lane.loading.set(false)
          lane.error.set(err)
        }
        onError?.(err)
      }
      return null
    }
  }

  const reset = (): void => {
    lane.latestRequest++
    lane.data.set(null)
    lane.loading.set(false)
    lane.error.set(null)
  }

  // Execute immediately if requested — mount only, as it has always been. An
  // adopted site (an argument change re-created the host) has already run it;
  // React runs this once per mount, so a later url change does not repeat it.
  if (!adopted && immediate) {
    lane.immediateRan = true
    void execute()
  }

  return {
    data: lane.data.asReadonly(),
    loading: lane.loading.asReadonly(),
    error: lane.error.asReadonly(),
    execute,
    reset,
  }
}

/**
 * GET requests.
 *
 * @param url - Request URL to fetch from.
 * @param options - HTTP request options including callbacks and request config.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function useGet<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('GET', url, options)
}

/**
 * POST requests, with the body in `options.data`.
 *
 * @param url - Request URL to post to.
 * @param options - HTTP request options including body data and callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePost<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('POST', url, options)
}

/**
 * PUT requests, with the replacement body.
 *
 * @param url - Request URL to send the PUT request to.
 * @param options - HTTP request options including body data and callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePut<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PUT', url, options)
}

/**
 * PATCH requests, with the partial body.
 *
 * @param url - Request URL to send the PATCH request to.
 * @param options - HTTP request options including partial body data and callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePatch<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PATCH', url, options)
}

/**
 * DELETE requests; a body travels in `options.data`.
 *
 * @param url - Request URL of the resource to delete.
 * @param options - HTTP request options including callbacks.
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function useDelete<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('DELETE', url, options)
}
