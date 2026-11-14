/**
 * Svelte hooks for HTTP requests, porting React's `useHttp` family.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { get, type Readable, writable } from 'svelte/store'

import type { HttpResponse, RequestConfig } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'

import { useHttpClient } from '../context.js'
import { fieldStore } from './live-store.js'
import { type MaybeReadable, toReadable } from './maybe-readable.js'

/** State for async HTTP operations. */
export interface UseHttpState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

/** What {@link useHttp} returns: the state fields as stores plus `execute` and `reset`. */
export interface UseHttpResult<T> {
  /** The newest request's data, or null. */
  data: Readable<T | null>
  /** Whether a request is in flight. */
  loading: Readable<boolean>
  /** The newest request's failure. */
  error: Readable<Error | null>
  /**
   * Runs the request and resolves with its own data, or `null` on failure,
   * even when a newer request or `reset` has superseded its displayed state.
   *
   * This function keeps ONE identity for the component's life, so it is safe
   * wherever a stable function matters. Its request options are read when it
   * is CALLED.
   */
  execute: () => Promise<T | null>
  /** Clears the state and supersedes any in-flight request. */
  reset: () => void
}

/**
 * Options for the {@link useHttp} hooks.
 *
 * Every request option — headers, params, body `data`, `signal`, `onSuccess`,
 * `onError` — is read at the moment `execute` runs, not when the hook was
 * called. Only `immediate` is read on mount.
 */
export interface UseHttpOptions<T> extends RequestConfig {
  /** Whether to execute the request immediately on mount. */
  immediate?: boolean
  /**
   * Callback for each request that succeeds while mounted, including a request
   * superseded by another `execute` or `reset`. Read `data` from the hook when
   * only the newest request's result should drive the UI.
   */
  onSuccess?: (data: T) => void
  /** Callback for each request that fails while mounted, including a superseded one. */
  onError?: (error: Error) => void
}

/**
 * HTTP requests with state management, React's `useHttp` in Svelte's idiom:
 * call it during component init under `setMoleculeContext({ http })`.
 *
 * Every argument may be a plain value or a readable store of one (a store
 * holding `undefined` means the argument was omitted): `method`, `url` and the
 * request options are read at the moment `execute` runs, so setting the `url`
 * store retargets the next `execute` on the same component, the way React's
 * re-render does. `immediate` is read on mount only — its request runs once per
 * component even when the arguments change later.
 *
 * The newest request owns the displayed state: an older response answering
 * after a newer `execute` or `reset` cannot touch it (callbacks still report
 * every request's own outcome). A failure resolves `null` — it never rejects
 * to the caller. `reset` takes ownership too, so a request it superseded
 * cannot repopulate the state.
 *
 * @param method - HTTP method (or a store of it).
 * @param url - Request URL (or a store of it).
 * @param options - Request options, read at call time (or a store of them).
 * @returns Request state as stores and the controls.
 * @example
 * ```svelte
 * <script>
 *   import { useGet } from '@molecule/app-svelte'
 *   const { data, loading, error, execute } = useGet('/api/users')
 * </script>
 *
 * {#if $loading}<Spinner />
 * {:else if $error}<p>{$error.message}</p>
 * {:else}<UserList users={$data} />{/if}
 * ```
 */
export function useHttp<T>(
  method: MaybeReadable<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>,
  url: MaybeReadable<string>,
  options?: MaybeReadable<UseHttpOptions<T> | undefined>,
): UseHttpResult<T> {
  const client = useHttpClient()
  const methodStore = toReadable(method)
  const urlStore = toReadable(url)
  const optionsStore = toReadable(options)
  const immediate = get(optionsStore)?.immediate ?? false

  const state = writable<UseHttpState<unknown>>({
    data: null,
    loading: immediate,
    error: null,
  })
  /** Applies one state patch; `undefined` fields are left alone. */
  const patch = (next: Partial<UseHttpState<unknown>>): void => {
    state.update((current) => ({ ...current, ...next }))
  }

  // React's mounted flag: false once the component is gone, so a late answer
  // settles quietly (no state write, no callback) as it does there.
  let mounted = true
  onDestroy(() => {
    mounted = false
  })

  // The newest request owns the state. Without this, an older request that
  // answers after a newer one (a slow first load, then a refetch) overwrote the
  // newer data and cleared `loading` while the newer request was still in flight.
  // `reset` takes ownership too, so a request it superseded cannot repopulate.
  let latestRequest = 0

  const execute = async (): Promise<T | null> => {
    if (!mounted) return null

    // Options describe the request being sent, read at call time; method/url/
    // client decide WHICH request execute performs.
    const currentMethod = get(methodStore)
    const currentUrl = get(urlStore)
    const { immediate: _immediate, onSuccess, onError, ...requestConfig } = get(optionsStore) ?? {}
    const request = ++latestRequest
    // Callbacks report THIS request's outcome (a submit's onSuccess still
    // runs); only the newest request may change what the hook shows.
    const ownsState = (): boolean => mounted && request === latestRequest

    patch({ loading: true, error: null })

    try {
      let response: HttpResponse<T>

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
              'svelte.error.unsupportedMethod',
              { method: currentMethod },
              {
                defaultValue: 'Unsupported method: {{method}}',
              },
            ),
          )
      }

      if (mounted) {
        if (ownsState()) patch({ data: response.data, loading: false, error: null })
        onSuccess?.(response.data)
      }

      return response.data
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (mounted) {
        if (ownsState()) patch({ data: null, loading: false, error: err })
        onError?.(err)
      }
      return null
    }
  }

  const reset = (): void => {
    // reset takes ownership: a request it superseded cannot repopulate.
    latestRequest++
    patch({ data: null, loading: false, error: null })
  }

  // Execute immediately if requested — mount only, once per component, the
  // option's historical contract: an argument change never repeats it.
  if (immediate) {
    void execute()
  }

  return {
    data: fieldStore(state, 'data') as Readable<T | null>,
    loading: fieldStore(state, 'loading'),
    error: fieldStore(state, 'error'),
    execute,
    reset,
  }
}

/**
 * GET requests, React's `useGet` in Svelte's idiom.
 *
 * @param url - Request URL to fetch from (or a store of it).
 * @param options - HTTP request options including callbacks and request config (or a store of them).
 * @returns Request state as stores and the controls.
 */
export function useGet<T>(
  url: MaybeReadable<string>,
  options?: MaybeReadable<UseHttpOptions<T> | undefined>,
): UseHttpResult<T> {
  return useHttp<T>('GET', url, options)
}

/**
 * POST requests, React's `usePost` in Svelte's idiom.
 *
 * @param url - Request URL to post to (or a store of it).
 * @param options - HTTP request options including body data and callbacks (or a store of them).
 * @returns Request state as stores and the controls.
 */
export function usePost<T>(
  url: MaybeReadable<string>,
  options?: MaybeReadable<UseHttpOptions<T> | undefined>,
): UseHttpResult<T> {
  return useHttp<T>('POST', url, options)
}

/**
 * PUT requests, React's `usePut` in Svelte's idiom.
 *
 * @param url - Request URL to send the PUT request to (or a store of it).
 * @param options - HTTP request options including the replacement body (or a store of them).
 * @returns Request state as stores and the controls.
 */
export function usePut<T>(
  url: MaybeReadable<string>,
  options?: MaybeReadable<UseHttpOptions<T> | undefined>,
): UseHttpResult<T> {
  return useHttp<T>('PUT', url, options)
}

/**
 * PATCH requests, React's `usePatch` in Svelte's idiom.
 *
 * @param url - Request URL to send the partial body to (or a store of it).
 * @param options - HTTP request options including the partial body (or a store of them).
 * @returns Request state as stores and the controls.
 */
export function usePatch<T>(
  url: MaybeReadable<string>,
  options?: MaybeReadable<UseHttpOptions<T> | undefined>,
): UseHttpResult<T> {
  return useHttp<T>('PATCH', url, options)
}

/**
 * DELETE requests, React's `useDelete` in Svelte's idiom.
 *
 * @param url - Request URL of the resource to delete (or a store of it).
 * @param options - HTTP request options including callbacks (or a store of them).
 * @returns Request state as stores and the controls.
 */
export function useDelete<T>(
  url: MaybeReadable<string>,
  options?: MaybeReadable<UseHttpOptions<T> | undefined>,
): UseHttpResult<T> {
  return useHttp<T>('DELETE', url, options)
}
