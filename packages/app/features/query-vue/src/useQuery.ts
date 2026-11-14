/**
 * Observe one document from the shared cache.
 * @module
 */

import {
  computed,
  getCurrentScope,
  onScopeDispose,
  type Ref,
  shallowRef,
  toValue,
  watch,
} from 'vue'

import type { QueryOptions, QueryState } from '@molecule/app-query'
import { getQueryClient, hashQueryKey } from '@molecule/app-query'

import type { QueryOptionsInput, UseQueryResult } from './types.js'

const IDLE: QueryState<never> = {
  data: undefined,
  status: 'idle',
  error: undefined,
  isFetching: false,
  updatedAt: undefined,
}

/** The last document this hook observed for one principal, and the key that produced it. */
interface LoadedDocument<T> {
  hash: string
  principal: string
  value: QueryState<T>
}

/** The key this hook observes, and the principal that was current when it started to. */
interface ObservedKey {
  hash: string
  principal: string | undefined
}

/** `setData` and `refetch` bound to one observed key, rebuilt when the key changes. */
interface KeyActions<T> {
  hash: string
  setData: UseQueryResult<T>['setData']
  refetch: UseQueryResult<T>['refetch']
}

/**
 * The document for `options.key`, kept current: cached data is returned on the
 * very first read (so a warmed page never flashes a loading state), a stale or
 * missing document is fetched, and every change updates the returned ref.
 * Pass `null` to observe nothing. A key change resets to that key's state; the
 * hook never hands a caller another key's document — unless the caller opts
 * into {@link QueryOptions.keepPreviousData}, and then only within one
 * {@link QueryOptions.principal}.
 *
 * Pass the options as a `ref` or getter to follow a changed key on the SAME
 * instance — a computed of the route, the viewer or the page. That is the Vue
 * counterpart of React re-rendering `useQuery` with a new options object: the
 * request stays stable while the key holds, a parent state change neither
 * restarts it nor cancels it, so a response that arrives after one still
 * lands. It is aborted only when the key changes or the component unmounts
 * (the `signal` given to `options.fetch`). Use this instead of a hand-written
 * `watch` + `fetch`: a watcher whose cleanup sets a `cancelled` flag, and
 * whose source includes a function rebuilt each run, cancels its own request
 * on every re-run and then skips the refetch.
 * An explicit `refetch()` is an awaited cache fetch; it can finish after the
 * observer unmounts, like an explicit `client.fetch(options)` caller.
 *
 * For a LIST, put the route's page, filter and selected view in the key and
 * pass `keepPreviousData` with a `principal`: a Next/Previous or filter change
 * then keeps the rows already on screen until the new page answers, instead of
 * rendering a loading state over an empty list. The key names everything the
 * answer depends on, and the app's HTTP client sends the session, so a list
 * the server can filter or personalize per viewer puts the viewer in its key
 * and passes the same value as `principal` (`'anonymous'` when signed out): an
 * account switch then drops the previous account's document immediately. Only
 * an endpoint that answers every viewer the same takes a viewer-free key with
 * `principal: 'public'`.
 *
 * For custom mutation handlers, `setData(saved)` publishes the server's
 * response to this key and every observer. Use `setData(current => next)` for
 * a local cache update. Render `data` directly; a component-local copy stops
 * observing later server responses. Prefer `createQueryResource` when the
 * API's reads and writes can share one resource definition. Mount
 * record-dependent actions inside `QueryContent` (or an explicit non-null data
 * branch), so a visible action cannot return early because its initial record
 * is still missing. Keep loaded actions mounted during refreshes.
 * Server-backed toggles use `useOptimisticValue` from `@molecule/app-vue` to
 * keep their displayed label and queued clicks on the same state while a save
 * finishes.
 *
 * @param options - Key, fetch, freshness, and optionally `principal` with
 *   `keepPreviousData`; or `null`. A ref or getter of either, so one mounted
 *   composable can follow a changed key.
 * @returns A ref of the document's state with `setData()` and `refetch()`.
 *   `isPreviousData` is `true` while `data` is the previous key's document for
 *   the same principal.
 * @throws {Error} When `keepPreviousData` is set without `principal` — the
 *   hook cannot tell a route change from a principal switch, so it refuses
 *   rather than risk showing one principal's document to another.
 */
export function useQuery<T>(queryOptions: QueryOptionsInput<T>): Ref<UseQueryResult<T>> {
  // Options are validated on every read, the way React's hook refuses on every
  // render; this first read happens before anything subscribes or fetches.
  const optionsRef = computed<QueryOptions<T> | null>(() => {
    const options = toValue(queryOptions)
    if (options?.keepPreviousData === true && options.principal === undefined) {
      throw new Error(
        'useQuery: keepPreviousData requires principal — the viewer the document is for (the signed-in id, "anonymous" while signed out, or "public" for an endpoint that answers every viewer the same) so a viewer switch never shows the previous document.',
      )
    }
    return options
  })
  const initial = optionsRef.value
  const initialHash = initial ? hashQueryKey(initial.key) : ''

  // The subscription's last delivered state, and the hash it belongs to.
  const state = shallowRef<{ hash: string; value: QueryState<T> }>({
    hash: initialHash,
    value: initial ? getQueryClient().getState<T>(initial.key) : (IDLE as QueryState<T>),
  })
  // The previous document is remembered ACROSS reactive updates, so the update
  // that first observes a new key still has the rows a person is looking at.
  const loaded = shallowRef<LoadedDocument<T> | null>(null)
  // A key's document belongs to the principal that was current when the hook
  // started observing that key: a principal change the key does not reflect
  // never relabels the document on screen as the new principal's.
  const observed = shallowRef<ObservedKey | null>(null)

  const hash = computed(() => {
    const options = optionsRef.value
    return options ? hashQueryKey(options.key) : ''
  })
  const principal = computed(() => optionsRef.value?.principal)

  const value = computed<QueryState<T>>(() => {
    const currentHash = hash.value
    const options = optionsRef.value
    const current =
      state.value.hash === currentHash
        ? state.value.value
        : options
          ? getQueryClient().getState<T>(options.key)
          : (IDLE as QueryState<T>)
    const previous = options?.keepPreviousData === true ? loaded.value : null
    if (
      previous !== null &&
      previous.principal === options?.principal &&
      previous.hash !== currentHash &&
      current.data === undefined &&
      (current.status === 'idle' || current.status === 'loading')
    ) {
      return {
        ...current,
        data: previous.value.data,
        updatedAt: previous.value.updatedAt,
        isPreviousData: true,
      }
    }
    return current
  })

  /** Binds the actions to one observed key; the old actions keep that key when it changes. */
  const bindActions = (options: QueryOptions<T> | null, boundHash: string): KeyActions<T> => {
    const setData: UseQueryResult<T>['setData'] = (input) => {
      if (!options) return
      const client = getQueryClient()
      const next =
        typeof input === 'function'
          ? (input as (previous: T | undefined) => T | undefined)(client.get<T>(options.key))
          : input
      if (next !== undefined) client.set(options.key, next)
    }
    const refetch = async (): Promise<QueryState<T>> => {
      if (!options) return IDLE as QueryState<T>
      const client = getQueryClient()
      client.invalidate(options.key)
      try {
        await client.fetch(options)
      } catch (_error) {
        // The cache publishes the failure to every observer. Return that state just as the
        // initial subscription does, so an event handler can safely use `void query.refetch()`.
      }
      return client.getState<T>(options.key)
    }
    return { hash: boundHash, setData, refetch }
  }
  const actions = shallowRef<KeyActions<T>>(bindActions(initial, initialHash))

  /** The memory update React runs after every render (its first effect). */
  const remember = (): void => {
    const currentHash = hash.value
    const currentPrincipal = principal.value
    const current = value.value
    if (observed.value?.hash !== currentHash)
      observed.value = { hash: currentHash, principal: currentPrincipal }
    // A document is remembered only as its own principal's answer. While a
    // retained previous document is showing, the memory is what makes it
    // survive the fetch; keep it until this key answers. Anything else (no
    // principal, a switch, a failure, a key observed under another principal)
    // clears it, so a later key change can never fall back to another
    // principal's document.
    if (current.isPreviousData === true) return
    loaded.value =
      currentPrincipal !== undefined &&
      observed.value.principal === currentPrincipal &&
      current.data !== undefined &&
      current.status === 'success'
        ? { hash: currentHash, principal: currentPrincipal, value: current }
        : null
  }

  /** The subscription React runs after every render (its second effect). */
  let unsubscribe: (() => void) | null = null
  const observe = (): void => {
    unsubscribe?.()
    unsubscribe = null
    const options = optionsRef.value
    const currentHash = hash.value
    if (!options) {
      state.value = { hash: '', value: IDLE as QueryState<T> }
      return
    }
    const client = getQueryClient()
    unsubscribe = client.subscribe<T>(options, (next) => {
      state.value = { hash: currentHash, value: next }
    })
  }

  // A composable mounts once the way React's effects run after its first render:
  // remember, then subscribe.
  remember()
  observe()

  // The memory watcher is created first, so a flush that both re-derives the
  // value and swaps keys updates the memory before it resubscribes — React
  // runs its memory effect before its subscription effect.
  watch(value, () => remember())
  watch(hash, () => {
    const currentHash = hash.value
    if (actions.value.hash !== currentHash)
      actions.value = bindActions(optionsRef.value, currentHash)
    observe()
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      unsubscribe?.()
      unsubscribe = null
    })
  }

  return computed<UseQueryResult<T>>(() => ({
    ...value.value,
    setData: actions.value.setData,
    refetch: actions.value.refetch,
  }))
}
