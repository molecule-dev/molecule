/**
 * Observe one document from the shared cache.
 *
 * @module
 */

import { useEffect, useMemo, useRef, useState } from 'react'

import type { QueryOptions, QueryState } from '@molecule/app-query'
import { getQueryClient, hashQueryKey } from '@molecule/app-query'

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

/**
 * The document for `options.key`, kept current: cached data is returned on
 * the very first render (so a warmed page never flashes a loading state),
 * a stale or missing document is fetched, and every change re-renders.
 * Pass `null` to observe nothing. A key change resets to that key's state;
 * the hook never hands a caller another key's document — unless the caller
 * opts into {@link QueryOptions.keepPreviousData}, and then only within one
 * {@link QueryOptions.principal}.
 *
 * The request is stable across re-renders — a parent state change neither
 * restarts it nor cancels it, so a response that arrives after one still
 * lands. It is aborted only when the key changes or the component unmounts
 * (the `signal` given to `options.fetch`). Use this instead of a hand-written
 * `useEffect` + `fetch`: an effect whose cleanup sets a `cancelled` flag, and
 * whose deps include a function rebuilt each render, cancels its own request
 * on every re-render and then skips the refetch.
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
 * @param options - Key, fetch, freshness, and optionally `principal` with
 *   `keepPreviousData`; or `null`.
 * @returns The document's state. `isPreviousData` is `true` while `data` is
 *   the previous key's document for the same principal.
 * @throws {Error} When `keepPreviousData` is set without `principal` — the
 *   hook cannot tell a route change from a principal switch, so it refuses
 *   rather than risk showing one principal's document to another.
 */
export function useQuery<T>(options: QueryOptions<T> | null): QueryState<T> {
  const hash = options ? hashQueryKey(options.key) : ''
  const principal = options?.principal
  const keepPreviousData = options?.keepPreviousData === true
  if (keepPreviousData && principal === undefined) {
    throw new Error(
      'useQuery: keepPreviousData requires principal — the viewer the document is for (the signed-in id, "anonymous" while signed out, or "public" for an endpoint that answers every viewer the same) so a viewer switch never shows the previous document.',
    )
  }
  // Options are read once per key: a fresh `fetch` closure every render must
  // not resubscribe.
  const stable = useMemo(() => options, [hash])
  const [state, setState] = useState<{ hash: string; value: QueryState<T> }>(() => ({
    hash,
    value: stable ? getQueryClient().getState<T>(stable.key) : (IDLE as QueryState<T>),
  }))
  // The previous document is remembered ACROSS renders, so the render that
  // first observes a new key still has the rows a person is looking at.
  const loaded = useRef<LoadedDocument<T> | null>(null)
  // A key's document belongs to the principal that was current when the hook
  // started observing that key: a principal change the key does not reflect
  // never relabels the document on screen as the new principal's.
  const observed = useRef<ObservedKey | null>(null)

  const current =
    state.hash === hash
      ? state.value
      : stable
        ? getQueryClient().getState<T>(stable.key)
        : (IDLE as QueryState<T>)

  const previous = keepPreviousData ? loaded.current : null
  const value: QueryState<T> =
    previous !== null &&
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

  useEffect(() => {
    if (observed.current?.hash !== hash) observed.current = { hash, principal }
    // A document is remembered only as its own principal's answer. While a
    // retained previous document is showing, the memory is what makes it
    // survive the fetch; keep it until this key answers. Anything else (no
    // principal, a switch, a failure, a key observed under another principal)
    // clears it, so a later key change can never fall back to another
    // principal's document.
    if (value.isPreviousData === true) return
    loaded.current =
      principal !== undefined &&
      observed.current.principal === principal &&
      value.data !== undefined &&
      value.status === 'success'
        ? { hash, principal, value }
        : null
  }, [hash, principal, value])

  useEffect(() => {
    if (!stable) {
      setState({ hash: '', value: IDLE as QueryState<T> })
      return
    }
    const client = getQueryClient()
    return client.subscribe<T>(stable, (value) => setState({ hash, value }))
  }, [stable, hash])

  return value
}
