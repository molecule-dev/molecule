/**
 * Observe one document from the shared cache — the Solid counterpart of
 * `useQuery` in `@molecule/app-query-react`.
 *
 * @module
 */
import { type Accessor, createEffect, createSignal, on, onCleanup, untrack } from 'solid-js'

import type { QueryOptions, QueryState } from '@molecule/app-query'
import { getQueryClient, hashQueryKey } from '@molecule/app-query'

import type { UseQueryResult } from './types.js'

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

/** The options a query may arrive in: plain values, or an accessor of them. */
type QueryOptionsSource<T> = QueryOptions<T> | null | Accessor<QueryOptions<T> | null>

/**
 * The document for the options' key, kept current: cached data is read on the
 * very first render (so a warmed page never flashes a loading state), a stale
 * or missing document is fetched, and every change re-renders what reads the
 * result. Pass `null` to observe nothing. A key change resets to that key's
 * state; the hook never hands a caller another key's document — unless the
 * caller opts into {@link QueryOptions.keepPreviousData}, and then only within
 * one {@link QueryOptions.principal}.
 *
 * The request is stable across re-renders — a parent state change neither
 * restarts it nor cancels it, so a response that arrives after one still
 * lands. It is aborted only when the key changes or the component unmounts
 * (the `signal` given to `options.fetch`). Use this instead of a hand-written
 * `createEffect` + `fetch`: an effect whose `onCleanup` sets a `cancelled`
 * flag, and whose tracked dependencies include a function rebuilt each run,
 * cancels its own request on every run and then skips the refetch.
 * An explicit `refetch()` is an awaited cache fetch; it can finish after the
 * observer unmounts, like an explicit `client.fetch(options)` caller.
 *
 * A component body runs once in Solid, so pass the options as an accessor when
 * any part of them can change (`() => packageQuery(props.name)`): a changed
 * key — or principal, or `keepPreviousData` flag — is then followed on the SAME
 * mounted hook, the way React re-renders `useQuery` with a new options object.
 *
 * For a LIST, put the route's page, filter and selected view in the key and
 * pass `keepPreviousData` with a `principal`: a Next/Previous or filter change
 * then keeps the rows already on screen until the new page answers, instead of
 * rendering a loading state over an empty list. The key names everything the
 * answer depends on, and the app's HTTP client sends the session, so a list the
 * server can filter or personalize per viewer puts the viewer in its key and
 * passes the same value as `principal` (`'anonymous'` when signed out): an
 * account switch then drops the previous account's document immediately. Only
 * an endpoint that answers every viewer the same takes a viewer-free key with
 * `principal: 'public'`.
 *
 * For custom mutation handlers, `setData(saved)` publishes the server's response to this
 * key and every observer. Use `setData(current => next)` for a local cache update. Render
 * `data` directly; a component-local copy stops observing later server responses. Prefer
 * `createQueryResource` when the API's reads and writes can share one resource definition.
 * Mount record-dependent actions inside `QueryContent` (or an explicit non-null data branch),
 * so a visible action cannot return early because its initial record is still missing.
 * Keep loaded actions mounted during refreshes. Server-backed toggles use `useOptimisticValue`
 * from `@molecule/app-solid` or `OptimisticToggleButton` from `@molecule/app-ui-solid` to keep
 * their displayed label and queued clicks on the same state while a save finishes.
 *
 * @param options - Key, fetch, freshness, and optionally `principal` with
 *   `keepPreviousData`; or `null`; or an accessor of either (the options a
 *   component recomputes from its props — every change is followed on the same
 *   instance).
 * @returns The document's state, `setData()` and `refetch()`. `isPreviousData` is `true` while
 *   `data` is the previous key's document for the same principal.
 * @throws {Error} When `keepPreviousData` is set without `principal` — the
 *   hook cannot tell a route change from a principal switch, so it refuses
 *   rather than risk showing one principal's document to another.
 */
export function useQuery<T>(options: QueryOptionsSource<T>): UseQueryResult<T> {
  const readOptions = (): QueryOptions<T> | null =>
    typeof options === 'function' ? (options as Accessor<QueryOptions<T> | null>)() : options
  const validate = (value: QueryOptions<T> | null): void => {
    if (value?.keepPreviousData === true && value.principal === undefined) {
      throw new Error(
        'useQuery: keepPreviousData requires principal — the viewer the document is for (the signed-in id, "anonymous" while signed out, or "public" for an endpoint that answers every viewer the same) so a viewer switch never shows the previous document.',
      )
    }
  }

  const initial = untrack(readOptions)
  validate(initial)

  // `current` is the latest options (the render's principal/keep flags come from it);
  // `bound` is what the subscription and the actions are bound to, updated only when the
  // key changes, exactly like React's `useMemo(() => options, [hash])`: a fresh `fetch`
  // closure with the same key must not resubscribe, and a saved action stays bound to
  // its original key.
  let current: QueryOptions<T> | null = initial
  let bound: QueryOptions<T> | null = initial
  let hash = initial ? hashQueryKey(initial.key) : ''
  let stateValue: QueryState<T> = initial
    ? getQueryClient().getState<T>(initial.key)
    : (IDLE as QueryState<T>)
  let stateHash = hash
  // The previous document is remembered ACROSS updates, so the update that first
  // observes a new key still has the rows a person is looking at.
  let loaded: LoadedDocument<T> | null = null
  // A key's document belongs to the principal that was current when the hook
  // started observing that key: a principal change the key does not reflect
  // never relabels the document on screen as the new principal's.
  let observed: ObservedKey | null = null
  let unsubscribe: (() => void) | null = null

  /** The state the observer shows right now (the retained previous document folded in). */
  const renderValue = (): QueryState<T> => {
    const state =
      stateHash === hash
        ? stateValue
        : bound
          ? getQueryClient().getState<T>(bound.key)
          : (IDLE as QueryState<T>)
    const principal = current?.principal
    const previous = current?.keepPreviousData === true ? loaded : null
    if (
      previous !== null &&
      previous.principal === principal &&
      previous.hash !== hash &&
      state.data === undefined &&
      (state.status === 'idle' || state.status === 'loading')
    ) {
      return {
        ...state,
        data: previous.value.data,
        updatedAt: previous.value.updatedAt,
        isPreviousData: true,
      }
    }
    return state
  }

  /**
   * Remembers the document just shown, under the principal it was observed for.
   * A retained previous document survives (it is what makes it survive the
   * fetch); anything else (no principal, a switch, a failure, a key observed
   * under another principal) clears the memory, so a later key change can never
   * fall back to another principal's document.
   */
  const remember = (value: QueryState<T>): void => {
    const principal = current?.principal
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

  /** The state the component reads; every field getter tracks this signal. */
  const [display, setDisplay] = createSignal<QueryState<T>>(renderValue())

  /** The observer's fields, read as plain values through the state signal. */
  const result: UseQueryResult<T> = {
    get data(): T | undefined {
      return display().data
    },
    get status(): QueryState<T>['status'] {
      return display().status
    },
    get error(): unknown {
      return display().error
    },
    get isFetching(): boolean {
      return display().isFetching
    },
    get updatedAt(): number | undefined {
      return display().updatedAt
    },
    get isPreviousData(): boolean | undefined {
      return display().isPreviousData
    },
    setData: () => {},
    refetch: async (): Promise<QueryState<T>> => IDLE as QueryState<T>,
  }

  /** Applies one state: publishes it and re-derives the previous-document memory. */
  const apply = (value: QueryState<T>): void => {
    setDisplay(value)
    remember(value)
  }

  /** The subscription's listener: the cache announces the observed key's new state. */
  const onState = (value: QueryState<T>): void => {
    stateValue = value
    stateHash = hash
    apply(renderValue())
  }

  /** Rebuilds `setData`/`refetch` bound to one options object (one per key). */
  const buildActions = (actionsBound: QueryOptions<T> | null): void => {
    const setData: UseQueryResult<T>['setData'] = (value) => {
      if (!actionsBound) return
      const client = getQueryClient()
      const next =
        typeof value === 'function'
          ? (value as (previous: T | undefined) => T | undefined)(client.get<T>(actionsBound.key))
          : value
      if (next !== undefined) client.set(actionsBound.key, next)
    }
    const refetch = async (): Promise<QueryState<T>> => {
      if (!actionsBound) return IDLE as QueryState<T>
      const client = getQueryClient()
      client.invalidate(actionsBound.key)
      try {
        await client.fetch(actionsBound)
      } catch (_error) {
        // The cache publishes the failure to every observer. Return that state just as the
        // initial subscription does, so an event handler can safely use `void query.refetch()`.
      }
      return client.getState<T>(actionsBound.key)
    }
    result.setData = setData
    result.refetch = refetch
  }

  /**
   * Follows one options value — the initial one (from the call itself) or a
   * later one (the options accessor changed): renders with the new key, updates
   * the previous-document memory, and resubscribes only when the key changed.
   */
  const applyOptions = (next: QueryOptions<T> | null): void => {
    validate(next)
    const hashAtEntry = hash
    const nextHash = next ? hashQueryKey(next.key) : ''
    if (nextHash !== hashAtEntry) {
      bound = next
      buildActions(next)
    }
    current = next
    hash = nextHash
    apply(renderValue())
    if (nextHash !== hashAtEntry) {
      unsubscribe?.()
      unsubscribe = null
      if (next) {
        unsubscribe = getQueryClient().subscribe<T>(next, onState)
      } else {
        stateValue = IDLE as QueryState<T>
        stateHash = ''
      }
    }
    apply(renderValue())
  }

  // First observation, in React's order: render, remember, subscribe (whose
  // synchronous emit applies the fetched-or-loading state), and the actions
  // bound to this first key.
  apply(renderValue())
  buildActions(bound)
  if (initial) {
    unsubscribe = getQueryClient().subscribe<T>(initial, onState)
  }

  // New options reach the observer as React's re-render does; a changed key is
  // a subscription change, and a principal/flag-only change re-renders only.
  if (typeof options === 'function') {
    createEffect(
      on(options as Accessor<QueryOptions<T> | null>, (next) => untrack(() => applyOptions(next)), {
        defer: true,
      }),
    )
  }
  onCleanup(() => {
    unsubscribe?.()
    unsubscribe = null
  })

  return result
}
