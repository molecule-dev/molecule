/**
 * Angular functions for HTTP requests, mirroring `useHttpClient`, `useHttp`,
 * `useGet`, `usePost`, `usePut`, `usePatch` and `useDelete` from
 * `@molecule/app-react`.
 *
 * @module
 */

import { DestroyRef, inject, type Signal, signal, type WritableSignal } from '@angular/core'

import type { HttpClient, RequestConfig } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'

import { injectProvider } from '../inject.js'
import { type MaybeSignal, readMaybeSignal } from '../maybe-signal.js'
import { HTTP_CLIENT } from '../tokens.js'

/**
 * The HTTP client registered by `provideMolecule({ http })` or `provideHttp`.
 * Call it in an injection context.
 *
 * @returns The HTTP client.
 * @throws {Error} When no HTTP client is registered.
 */
export function useHttpClient(): HttpClient {
  return injectProvider(HTTP_CLIENT, 'useHttpOutsideProvider')
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
   * This function is IDENTITY-STABLE for the component's lifetime — the
   * request it performs is the one the `method`, `url` and `options` sources
   * hold when it is CALLED, as React reads the latest committed render's
   * arguments when its `execute` runs. Its request options are read when it
   * is CALLED.
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
 * This hook instance's request state: the reactive state, the newest request's
 * id and whether the host is mounted. It lives for the component instance's
 * lifetime and survives an argument change, exactly like React's
 * `useState`/`useRef` state survives a re-render.
 *
 * @template T - The response data's shape.
 */
interface HttpState<T> {
  /** The reactive state. */
  readonly data: WritableSignal<T | null>
  readonly loading: WritableSignal<boolean>
  readonly error: WritableSignal<Error | null>
  /** The id of the newest request; it owns the state. */
  latestRequest: number
  /** Whether the host is mounted. */
  mounted: boolean
}

/**
 * HTTP requests with state management. Call it in an injection context (a
 * component field initializer or constructor).
 *
 * `execute` keeps one identity for the component's lifetime; the request it
 * performs is the one the `method`, `url` and `options` sources hold when it
 * is called. The current headers, body, `signal` and callbacks are read when
 * `execute` is called, so an inline options object or callback needs no
 * memoizing.
 *
 * The arguments may be signals: `execute` then sends to the url the signal
 * holds at the moment it is called, the way React's re-rendered `useHttp`
 * sends to the latest url. The hook's state (an in-flight request, loaded
 * data) survives an argument change, as React's survives a re-render.
 *
 * The newest request owns the state: an older request that answers after a
 * newer one (or after `reset`) cannot repopulate the displayed state, though
 * its own callbacks still report its outcome.
 *
 * @param method - HTTP method (or a signal of it).
 * @param url - Request URL (or a signal of it).
 * @param options - Request options, read at call time (or a signal of them).
 * @returns The request state as signals and the execute/reset functions.
 */
export function useHttp<T>(
  method: MaybeSignal<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>,
  url: MaybeSignal<string>,
  options?: MaybeSignal<UseHttpOptions<T>>,
): UseHttpResult<T> {
  const client = useHttpClient()
  const destroyRef = inject(DestroyRef)
  const immediate = readMaybeSignal(options)?.immediate ?? false

  // React keeps this state in useState/useRef, so a re-render with new
  // arguments leaves an in-flight request and its loaded data alone; the
  // signals below live for this component instance's lifetime the same way.
  const state: HttpState<T> = {
    data: signal<T | null>(null),
    loading: signal<boolean>(immediate),
    error: signal<Error | null>(null),
    latestRequest: 0,
    mounted: true,
  }

  destroyRef.onDestroy(() => {
    state.mounted = false
  })

  const execute = async (): Promise<T | null> => {
    if (!state.mounted) return null

    // Options describe the request being sent; method/url decide WHICH request
    // execute performs. Reading them here, at call time, is what React's
    // optionsRef-equivalent gives its re-rendered hook.
    const {
      immediate: _immediate,
      onSuccess,
      onError,
      ...requestConfig
    } = readMaybeSignal(options) ?? {}
    const requestMethod = readMaybeSignal(method)
    const requestUrl = readMaybeSignal(url)
    const request = ++state.latestRequest
    // Callbacks report THIS request's outcome (a submit's onSuccess still runs);
    // only the newest request may change what the hook shows.
    const ownsState = (): boolean => state.mounted && request === state.latestRequest

    state.loading.set(true)
    state.error.set(null)

    try {
      let response: { data: T }

      switch (requestMethod) {
        case 'GET':
          response = await client.get<T>(requestUrl, requestConfig)
          break
        case 'POST':
          response = await client.post<T>(requestUrl, requestConfig.data, requestConfig)
          break
        case 'PUT':
          response = await client.put<T>(requestUrl, requestConfig.data, requestConfig)
          break
        case 'PATCH':
          response = await client.patch<T>(requestUrl, requestConfig.data, requestConfig)
          break
        case 'DELETE':
          response = await client.delete<T>(requestUrl, requestConfig)
          break
        default:
          throw new Error(
            t(
              'angular.error.unsupportedMethod',
              { method: requestMethod },
              { defaultValue: 'Unsupported method: {{method}}' },
            ),
          )
      }

      if (state.mounted) {
        if (ownsState()) {
          state.data.set(response.data)
          state.loading.set(false)
          state.error.set(null)
        }
        onSuccess?.(response.data)
      }

      return response.data
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (state.mounted) {
        if (ownsState()) {
          state.data.set(null)
          state.loading.set(false)
          state.error.set(err)
        }
        onError?.(err)
      }
      return null
    }
  }

  const reset = (): void => {
    state.latestRequest++
    state.data.set(null)
    state.loading.set(false)
    state.error.set(null)
  }

  // Execute immediately if requested — mount only, as it has always been and
  // as React's empty dependency array pins it: a later argument change (a new
  // url through a signal) does not repeat it.
  if (immediate) {
    void execute()
  }

  return {
    data: state.data.asReadonly(),
    loading: state.loading.asReadonly(),
    error: state.error.asReadonly(),
    execute,
    reset,
  }
}

/**
 * GET requests.
 *
 * @param url - Request URL to fetch from (or a signal of it).
 * @param options - HTTP request options including callbacks and request config
 *   (or a signal of them).
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function useGet<T>(
  url: MaybeSignal<string>,
  options?: MaybeSignal<UseHttpOptions<T>>,
): UseHttpResult<T> {
  return useHttp<T>('GET', url, options)
}

/**
 * POST requests, with the body in `options.data`.
 *
 * @param url - Request URL to post to (or a signal of it).
 * @param options - HTTP request options including body data and callbacks (or
 *   a signal of them).
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePost<T>(
  url: MaybeSignal<string>,
  options?: MaybeSignal<UseHttpOptions<T>>,
): UseHttpResult<T> {
  return useHttp<T>('POST', url, options)
}

/**
 * PUT requests, with the replacement body.
 *
 * @param url - Request URL to send the PUT request to (or a signal of it).
 * @param options - HTTP request options including body data and callbacks (or
 *   a signal of them).
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePut<T>(
  url: MaybeSignal<string>,
  options?: MaybeSignal<UseHttpOptions<T>>,
): UseHttpResult<T> {
  return useHttp<T>('PUT', url, options)
}

/**
 * PATCH requests, with the partial body.
 *
 * @param url - Request URL to send the PATCH request to (or a signal of it).
 * @param options - HTTP request options including partial body data and
 *   callbacks (or a signal of them).
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function usePatch<T>(
  url: MaybeSignal<string>,
  options?: MaybeSignal<UseHttpOptions<T>>,
): UseHttpResult<T> {
  return useHttp<T>('PATCH', url, options)
}

/**
 * DELETE requests; a body travels in `options.data`.
 *
 * @param url - Request URL of the resource to delete (or a signal of it).
 * @param options - HTTP request options including callbacks (or a signal of
 *   them).
 * @returns Request state (data, loading, error) and controls (execute, reset).
 */
export function useDelete<T>(
  url: MaybeSignal<string>,
  options?: MaybeSignal<UseHttpOptions<T>>,
): UseHttpResult<T> {
  return useHttp<T>('DELETE', url, options)
}
