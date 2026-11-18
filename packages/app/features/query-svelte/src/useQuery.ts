/**
 * Observe one document from the app's shared query cache as a readable store:
 * the Svelte counterpart of `@molecule/app-query-react`'s `useQuery`, with the
 * same options, the same retained-previous-document contract and the same
 * cache behavior. The cache, keys and fetch logic all live in
 * `@molecule/app-query`; this module binds them to Svelte's stores exactly as
 * the React package binds them with `useState`/`useEffect`.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { get, type Readable, type Writable, writable } from 'svelte/store'

import type { QueryOptions, QueryState } from '@molecule/app-query'
import { getQueryClient, hashQueryKey } from '@molecule/app-query'

import type { QueryOptionsInput, UseQueryResult } from './types.js'

/** The refusal when `keepPreviousData` arrives without a principal (React's message). */
const PRINCIPAL_REQUIRED =
  'useQuery: keepPreviousData requires principal — the viewer the document is for (the signed-in id, "anonymous" while signed out, or "public" for an endpoint that answers every viewer the same) so a viewer switch never shows the previous document.'

/**
 * Whether a value is a readable store (the read half of the Svelte store
 * contract). A hook's options may arrive as one, so a changed options object
 * reaches the same mount the way a React re-render does.
 *
 * @param value - The options, or a store of them.
 * @returns True for a store.
 */
function isStore<T>(value: T | Readable<T>): value is Readable<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { subscribe?: unknown }).subscribe === 'function'
  )
}

/**
 * The state of a disabled (`null`) query: nothing observed, nothing fetched.
 *
 * @template T - The document type the result is shaped as.
 * @returns A fresh idle state.
 */
function idle<T>(): QueryState<T> {
  return {
    data: undefined,
    status: 'idle',
    error: undefined,
    isFetching: false,
    updatedAt: undefined,
  }
}

/** The last document the hook observed for one principal, and the key that produced it. */
interface LoadedDocument<T> {
  hash: string
  principal: string
  value: QueryState<T>
}

/** The key the hook observes, and the principal that was current when it started to. */
interface ObservedKey {
  hash: string
  principal: string | undefined
}

/**
 * The document for `options.key`, kept current: cached data is delivered on
 * the very first read (so a warmed page never flashes a loading state), a
 * stale or missing document is fetched, and every change updates the returned
 * store. Pass `null` to observe nothing. A key change resets to that key's
 * state; the hook never hands a caller another key's document — unless the
 * caller opts into {@link QueryOptions.keepPreviousData}, and then only within
 * one {@link QueryOptions.principal}.
 *
 * The request is stable across updates — an unrelated store or component
 * change neither restarts it nor cancels it, so a response that arrives after
 * one still lands. It is aborted only when the key changes or the component is
 * destroyed (the `signal` given to `options.fetch`). Pass the options as a
 * readable store and a changed key re-observes on the same component, the way
 * React re-renders `useQuery` with new options.
 *
 * For a LIST, put the route's page, filter and selected view in the key and
 * pass `keepPreviousData` with a `principal`: a page or filter change then
 * keeps the rows already on screen until the new page answers, instead of
 * rendering a loading state over an empty list. The key names everything the
 * answer depends on, so a list the server can filter or personalize per viewer
 * puts the viewer in its key and passes the same value as `principal`
 * (`'anonymous'` when signed out): an account switch then drops the previous
 * account's document immediately.
 *
 * For custom mutation handlers, `setData(saved)` publishes the server's
 * response to this key and every observer. Use `setData(current => next)` for
 * a local cache update. Render `data` directly; a component-local copy stops
 * observing later server responses.
 *
 * @template T - The document type.
 * @param options - Key, fetch, freshness, and optionally `principal` with
 *   `keepPreviousData`; or `null`; or a readable store of either, so changed
 *   options are followed without remounting.
 * @returns A readable store of the document's state with `setData()` and
 *   `refetch()`. `isPreviousData` is `true` while `data` is the previous key's
 *   document for the same principal.
 * @throws {Error} When `keepPreviousData` is set without `principal` — the
 *   hook cannot tell a route change from a principal switch, so it refuses
 *   rather than risk showing one principal's document to another.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useQuery } from '@molecule/app-query-svelte'
 *
 *   const query = useQuery({
 *     key: ['package', 'api-auth'],
 *     fetch: async (signal: AbortSignal) =>
 *       (await getClient().get(`/data/packages/api-auth.json`, { signal })).data,
 *   })
 * </script>
 *
 * {#if $query.status === 'success'}
 *   <h1>{$query.data?.name}</h1>
 * {/if}
 * ```
 */
export function useQuery<T>(options: QueryOptionsInput<T>): Readable<UseQueryResult<T>> {
  // The store form is how an app (and the conformance kit) passes options that
  // change on a live component: a new key re-observes here, on the same mount.
  const source: Readable<QueryOptions<T> | null> | null = isStore(options) ? options : null

  /** The options' current value. */
  const readOptions = (): QueryOptions<T> | null =>
    // `source` below is exactly the store half of the union, so the other half is the plain form.
    source ? get(source) : (options as QueryOptions<T> | null)

  // Refuse before anything is observed: nothing is subscribed, nothing fetches.
  const first = readOptions()
  if (first?.keepPreviousData === true && first.principal === undefined) {
    throw new Error(PRINCIPAL_REQUIRED)
  }

  // The first options object seen for each key (React's useMemo(…, [hash])): a
  // fresh `fetch` closure for the same key never resubscribes.
  let stable: QueryOptions<T> | null = first
  let hash = stable ? hashQueryKey(stable.key) : ''
  // The viewer and the retention flag are read from the CURRENT options on
  // every change, the way React reads them on every render.
  let principal = first?.principal
  let keepPreviousData = first?.keepPreviousData === true

  // The last state a subscription delivered, and the hash it belongs to.
  let state: { hash: string; value: QueryState<T> } = {
    hash,
    value: stable ? getQueryClient().getState<T>(stable.key) : idle<T>(),
  }

  // The previous document is remembered across changes, so the update that
  // first observes a new key still has the rows a person is looking at.
  let loaded: LoadedDocument<T> | null = null
  // A key's document belongs to the principal that was current when the hook
  // started observing that key: a principal change the key does not reflect
  // never relabels the document on screen as the new principal's.
  let observed: ObservedKey | null = null

  /**
   * React's render-time value: the observed key's state, or — while the new key
   * has no answer of its own — the retained previous document for the same
   * principal, stamped `isPreviousData`.
   *
   * @returns The state to expose.
   */
  const compute = (): QueryState<T> => {
    const current =
      state.hash === hash
        ? state.value
        : stable
          ? getQueryClient().getState<T>(stable.key)
          : idle<T>()
    const previous = keepPreviousData ? loaded : null
    return previous !== null &&
      previous.principal === principal &&
      previous.hash !== hash &&
      current.data === undefined &&
      (current.status === 'idle' || current.status === 'loading')
      ? {
          ...current,
          data: previous.value.data,
          updatedAt: previous.value.updatedAt,
          isPreviousData: true,
        }
      : current
  }

  /**
   * React's memory effect: what the document on screen is remembered as, so a
   * retained previous document survives its fetch. A document is remembered
   * only as its own principal's answer; anything else (no principal, a switch,
   * a failure, a key observed under another principal) clears it.
   *
   * @param value - The state just computed.
   */
  const remember = (value: QueryState<T>): void => {
    if (observed?.hash !== hash) observed = { hash, principal }
    if (value.isPreviousData === true) return
    loaded =
      principal !== undefined &&
      observed.principal === principal &&
      value.data !== undefined &&
      value.status === 'success'
        ? { hash, principal, value }
        : null
  }

  /**
   * The cache and refresh actions, bound to the key they were created for
   * (React's `useCallback(…, [stable])`): a key change rebinds them, and a
   * fresh options object with the same key keeps the originals.
   */
  let setData: UseQueryResult<T>['setData'] = () => {}
  let refetch: UseQueryResult<T>['refetch'] = async () => idle<T>()

  /** Rebinds the actions to the current `stable` options. */
  const bind = (): void => {
    const bound = stable
    setData = (value) => {
      if (!bound) return
      const client = getQueryClient()
      const next =
        typeof value === 'function'
          ? (value as (previous: T | undefined) => T | undefined)(client.get<T>(bound.key))
          : value
      if (next !== undefined) client.set(bound.key, next)
    }
    refetch = async (): Promise<QueryState<T>> => {
      if (!bound) return idle<T>()
      const client = getQueryClient()
      client.invalidate(bound.key)
      try {
        await client.fetch(bound)
      } catch (_error) {
        // The cache publishes the failure to every observer. Return that state
        // just as the initial subscription does, so an event handler can safely
        // use `void query.refetch()`.
      }
      return client.getState<T>(bound.key)
    }
  }

  /** Ends the current client subscription (the observed key's). */
  let unsubscribe: (() => void) | null = null

  /**
   * React's subscription effect: one client observer per key, rebuilt on a key
   * change (which aborts the abandoned fetch) and closed when the component is
   * destroyed. The client is read at call time, so a provider replaced at
   * runtime answers the next key.
   */
  const observe = (): void => {
    unsubscribe?.()
    if (!stable) {
      unsubscribe = null
      state = { hash: '', value: idle<T>() }
      return
    }
    const bound = stable
    const boundHash = hash
    unsubscribe = getQueryClient().subscribe<T>(bound, (value) => {
      state = { hash: boundHash, value }
      push()
    })
  }

  /**
   * Applies changed options: the viewer and retention flag are read fresh, and
   * only a changed KEY resubscribes (React's `useMemo` keeps the first options
   * object per key).
   *
   * @param next - The options the store delivered.
   */
  const applyOptions = (next: QueryOptions<T> | null): void => {
    if (next?.keepPreviousData === true && next.principal === undefined) {
      // React throws while rendering the changed options: refuse rather than
      // risk showing one principal's document to another.
      throw new Error(PRINCIPAL_REQUIRED)
    }
    principal = next?.principal
    keepPreviousData = next?.keepPreviousData === true
    const nextHash = next ? hashQueryKey(next.key) : ''
    if (nextHash === hash) {
      push()
      return
    }
    hash = nextHash
    stable = next
    bind()
    observe()
    push()
  }

  /** The store, null until the initial value below creates it. */
  let store: Writable<UseQueryResult<T>> | null = null

  /**
   * Recomputes the exposed value and publishes it. Before the store exists the
   * recomputation only maintains the memory: the client's synchronous first
   * notification is part of computing the initial value.
   */
  const push = (): void => {
    const value = compute()
    remember(value)
    store?.set({ ...value, setData, refetch })
  }

  bind()
  // React's subscription effect runs after the first render; the client's
  // synchronous notification lands while the initial value is computed.
  observe()
  const initial = compute()
  remember(initial)
  store = writable<UseQueryResult<T>>({ ...initial, setData, refetch })

  if (source) {
    const stopOptions = source.subscribe((next) => applyOptions(next))
    onDestroy(() => {
      stopOptions()
      unsubscribe?.()
    })
  } else {
    onDestroy(() => {
      unsubscribe?.()
    })
  }

  return store
}
