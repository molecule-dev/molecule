/**
 * Observe one document from the shared cache.
 *
 * @module
 */

import { useEffect, useMemo, useState } from 'react'

import type { QueryOptions, QueryState } from '@molecule/app-query'
import { getQueryClient, hashQueryKey } from '@molecule/app-query'

const IDLE: QueryState<never> = {
  data: undefined,
  status: 'idle',
  error: undefined,
  isFetching: false,
  updatedAt: undefined,
}

/**
 * The document for `options.key`, kept current: cached data is returned on
 * the very first render (so a warmed page never flashes a loading state),
 * a stale or missing document is fetched, and every change re-renders.
 * Pass `null` to observe nothing. A key change resets to that key's state;
 * the hook never hands a caller another key's document.
 *
 * The request is stable across re-renders — a parent state change neither
 * restarts it nor cancels it, so a response that arrives after one still
 * lands. It is aborted only when the key changes or the component unmounts
 * (the `signal` given to `options.fetch`). Use this instead of a hand-written
 * `useEffect` + `fetch`: an effect whose cleanup sets a `cancelled` flag, and
 * whose deps include a function rebuilt each render, cancels its own request
 * on every re-render and then skips the refetch.
 *
 * @param options - Key, fetch, freshness; or `null`.
 * @returns The document's state.
 */
export function useQuery<T>(options: QueryOptions<T> | null): QueryState<T> {
  const hash = options ? hashQueryKey(options.key) : ''
  // Options are read once per key: a fresh `fetch` closure every render must
  // not resubscribe.
  const stable = useMemo(() => options, [hash])
  const [state, setState] = useState<{ hash: string; value: QueryState<T> }>(() => ({
    hash,
    value: stable ? getQueryClient().getState<T>(stable.key) : (IDLE as QueryState<T>),
  }))

  useEffect(() => {
    if (!stable) {
      setState({ hash: '', value: IDLE as QueryState<T> })
      return
    }
    const client = getQueryClient()
    return client.subscribe<T>(stable, (value) => setState({ hash, value }))
  }, [stable, hash])

  if (state.hash === hash) return state.value
  return stable ? getQueryClient().getState<T>(stable.key) : (IDLE as QueryState<T>)
}
