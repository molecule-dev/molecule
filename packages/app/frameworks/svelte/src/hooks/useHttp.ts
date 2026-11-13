/**
 * Svelte hooks for HTTP requests, porting React's `useHttp` family.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import type { HttpResponse, RequestConfig } from '@molecule/app-http'
import { t } from '@molecule/app-i18n'

import { useHttpClient } from '../context.js'
import { fieldStore } from './live-store.js'

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
 * The request lane one host owns across the mounts an `args` step makes of the
 * hook: React re-renders ONE instance when its arguments change, while a
 * Svelte host re-mounts, so the replacing mount adopts this lane — the request
 * counter continues, the mount-time `immediate` fetch does not repeat, a
 * pending request stays armed and its published state carries over.
 *
 * A mount after the lane's disarm timer has cleared it (an unmount with no
 * replacement in the same turn — a `remount` step, or the case's final
 * unmount) is a genuinely new component and starts fresh.
 */
interface HttpLane {
  /** The request that currently owns the lane's displayed state. */
  latest: number
  /** Whether this host's mount-time `immediate` request already ran. */
  ranImmediate: boolean
  /** React's mounted flag: false once the host is gone with no replacement. */
  dead: boolean
  /** The state the live mount last published; the replacing mount starts here. */
  state: UseHttpState<unknown>
  /** The live mount's state writer; the latest mount's store wins. */
  sink: {
    patch: (next: Partial<UseHttpState<unknown>>) => void
  } | null
}

/** The previous host's lane, alive until its disarm timer runs. */
let handoff: HttpLane | null = null

/**
 * HTTP requests with state management, React's `useHttp` in Svelte's idiom:
 * call it during component init under `setMoleculeContext({ http })`.
 *
 * The newest request owns the displayed state: an older response answering
 * after a newer `execute` or `reset` cannot touch it (callbacks still report
 * every request's own outcome). A failure resolves `null` — it never rejects
 * to the caller. `reset` takes ownership too, so a request it superseded
 * cannot repopulate the state. `execute` keeps one identity per mount, and its
 * options are read at call time. `immediate` runs its request once per host,
 * on mount only, even when the host re-mounts the hook with new arguments.
 *
 * @param method - HTTP method.
 * @param url - Request URL.
 * @param options - Request options, read at call time.
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
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  options?: UseHttpOptions<T>,
): UseHttpResult<T> {
  const client = useHttpClient()
  const immediate = options?.immediate ?? false

  // A mount in the same turn as the previous host's destroy is React's
  // re-render (an args step), not a new component: adopt its lane so the
  // pending request stays armed and `immediate` does not repeat.
  const adopted = handoff
  handoff = null
  const lane: HttpLane = adopted ?? {
    latest: 0,
    ranImmediate: false,
    dead: false,
    state: { data: null, loading: false, error: null },
    sink: null,
  }
  if (adopted) adopted.dead = false

  // The displayed state starts from the lane's last published state (what
  // React's single instance kept), or from the initial one; the lane mirrors
  // exactly what the store shows, so a replacing mount reads the same values.
  const initialState: UseHttpState<unknown> = {
    data: adopted ? lane.state.data : null,
    loading: adopted ? lane.state.loading : immediate,
    error: adopted ? lane.state.error : null,
  }
  const state = writable<UseHttpState<unknown>>(initialState)
  lane.state = { ...initialState }
  lane.sink = {
    patch: (next) => {
      if (next.data !== undefined) {
        lane.state.data = next.data
        state.update((current) => ({ ...current, data: next.data }))
      }
      // Read once into locals: the narrowed type is lost inside the updater
      // closure (`state.update` runs later).
      const loading = next.loading
      if (loading !== undefined) {
        lane.state.loading = loading
        state.update((current) => ({ ...current, loading }))
      }
      const error = next.error
      if (error !== undefined) {
        lane.state.error = error
        state.update((current) => ({ ...current, error }))
      }
    },
  }

  onDestroy(() => {
    lane.sink = null
    lane.dead = true
    // Offer the lane to a mount in the same turn (React's re-render); the
    // timer clears it when no replacement adopted, so a mount after a settled
    // teardown starts fresh.
    handoff = lane
    const offered = lane
    setTimeout(() => {
      if (handoff === offered) handoff = null
    }, 0)
  })

  const execute = async (): Promise<T | null> => {
    if (lane.dead) return null

    // Options describe the request being sent, read at call time; method/url/
    // client decide WHICH request execute performs.
    const { immediate: _immediate, onSuccess, onError, ...requestConfig } = options ?? {}
    const request = ++lane.latest
    // Callbacks report THIS request's outcome (a submit's onSuccess still
    // runs); only the newest request may change what the hook shows.
    const ownsState = (): boolean => !lane.dead && request === lane.latest

    lane.sink?.patch({ loading: true, error: null })

    try {
      let response: HttpResponse<T>

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
              'svelte.error.unsupportedMethod',
              { method },
              {
                defaultValue: 'Unsupported method: {{method}}',
              },
            ),
          )
      }

      if (!lane.dead) {
        if (ownsState()) lane.sink?.patch({ data: response.data, loading: false, error: null })
        onSuccess?.(response.data)
      }

      return response.data
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      if (!lane.dead) {
        if (ownsState()) lane.sink?.patch({ data: null, loading: false, error: err })
        onError?.(err)
      }
      return null
    }
  }

  const reset = (): void => {
    // reset takes ownership: a request it superseded cannot repopulate.
    lane.latest++
    lane.sink?.patch({ data: null, loading: false, error: null })
  }

  // Execute immediately if requested — mount only, once per host, the option's
  // historical contract.
  if (immediate && !lane.ranImmediate) {
    lane.ranImmediate = true
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
 * @param url - Request URL to fetch from.
 * @param options - HTTP request options including callbacks and request config.
 * @returns Request state as stores and the controls.
 */
export function useGet<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('GET', url, options)
}

/**
 * POST requests, React's `usePost` in Svelte's idiom.
 *
 * @param url - Request URL to post to.
 * @param options - HTTP request options including body data and callbacks.
 * @returns Request state as stores and the controls.
 */
export function usePost<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('POST', url, options)
}

/**
 * PUT requests, React's `usePut` in Svelte's idiom.
 *
 * @param url - Request URL to send the PUT request to.
 * @param options - HTTP request options including body data and callbacks.
 * @returns Request state as stores and the controls.
 */
export function usePut<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PUT', url, options)
}

/**
 * PATCH requests, React's `usePatch` in Svelte's idiom.
 *
 * @param url - Request URL to send the PATCH request to.
 * @param options - HTTP request options including partial body data and callbacks.
 * @returns Request state as stores and the controls.
 */
export function usePatch<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('PATCH', url, options)
}

/**
 * DELETE requests, React's `useDelete` in Svelte's idiom.
 *
 * @param url - Request URL of the resource to delete.
 * @param options - HTTP request options including callbacks.
 * @returns Request state as stores and the controls.
 */
export function useDelete<T>(url: string, options?: UseHttpOptions<T>): UseHttpResult<T> {
  return useHttp<T>('DELETE', url, options)
}
