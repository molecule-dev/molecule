/**
 * `@molecule/app-query-react` cases: the shared-cache hooks (`useQuery`,
 * `usePrefetch`), the `QueryContent` loaded-data region, and the
 * prefetch-intent link props.
 *
 * Every hook case seeds the query area (`context.areas.query`) so the fakes
 * bond the in-memory query provider and pin the clock at the epoch: seeded and
 * written documents carry `updatedAt: 0` and stay fresh until an `advance`
 * step (a `fakeTimers` case) moves the clock past `staleMs`. The document
 * loader is the case's recorded function argument (`fetch: { $fn: 'fetch', …
 * }`), so every load is a recorded call, and `query.peek` records the cache
 * state as a `query.state` call.
 *
 * Both hook families set `reactiveArgs: true`: an app passes a new options
 * object on a key change, and each framework must follow it on the SAME mount
 * — `useQuery` keeps one observer per key with `keepPreviousData` memory that
 * only exists across re-renders, and `usePrefetch` must keep one function
 * identity across a re-render.
 *
 * @module
 */

import type { BindingContext, HookCases } from '../../bindings/spec.js'
import type { NodeSpec } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The deferred document loader: recorded as `fetch`, settled by a `settle` step. */
const fetchDoc = { $fn: 'fetch', defer: true }

/**
 * A `useQuery` options object whose loader is the case's recorded `fetch`.
 *
 * @param key - What identifies the document.
 * @param extra - `principal`, `keepPreviousData` and a differently named loader.
 * @returns The options.
 */
const observing = (
  key: readonly unknown[],
  extra: { principal?: string; keepPreviousData?: boolean; fetch?: unknown } = {},
): Record<string, unknown> => ({
  key,
  fetch: extra.fetch ?? fetchDoc,
  ...(extra.principal === undefined ? {} : { principal: extra.principal }),
  ...(extra.keepPreviousData === undefined ? {} : { keepPreviousData: extra.keepPreviousData }),
})

/** The cache seed: nothing cached, the client default freshness shortened to one second. */
const empty: BindingContext = { areas: { query: {} } }

/** The cache seed with one fresh document for `['pkg', 'a']`. */
const pkgACached: BindingContext = {
  areas: { query: { cached: [{ key: ['pkg', 'a'], data: { name: 'pkg-a' } }] } },
}

/** A two-row list document. */
const rowsA = [{ id: 'a1' }, { id: 'a2' }]

/** `useQuery(options)`: one observed document, `setData` and `refetch`. */
const useQueryCases: HookCases = {
  hook: 'useQuery',
  reactiveArgs: true,
  cases: [
    {
      name: 'null options stays idle and fetches nothing',
      args: [null],
      context: empty,
      steps: [
        { type: 'control', name: 'query.set', args: [['pkg', 'a'], { name: 'pkg-a' }] },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'a missing document loads, then succeeds',
      args: [observing(['pkg', 'a'])],
      context: empty,
      steps: [{ type: 'settle', fn: 'fetch', value: { name: 'pkg-a' } }],
    },
    {
      name: 'a failed load shows the error and keeps it',
      args: [observing(['pkg', 'a'], { fetch: { $fn: 'fetch', reject: 'load failed' } })],
      context: empty,
    },
    {
      name: 'a cached document renders at once without a fetch',
      args: [observing(['pkg', 'a'], { fetch: { $fn: 'fetch', resolve: 'unused' } })],
      context: pkgACached,
    },
    {
      // Default freshness (five minutes) outlasts the advance, so the second
      // mount finds the document fresh and never starts the recorded fetch.
      name: 'a fresh cached document is not refetched on remount',
      args: [observing(['pkg', 'a'], { fetch: { $fn: 'fetch', resolve: 'unused' } })],
      context: pkgACached,
      fakeTimers: true,
      steps: [{ type: 'advance', ms: 1000 }, { type: 'remount' }],
    },
    {
      // One second of freshness, then a remount: the stale document stays on
      // screen with `isFetching` until the refetch answers.
      name: 'a stale cached document is refetched on the next mount',
      args: [observing(['pkg', 'a'])],
      context: {
        areas: { query: { config: { staleMs: 1000 }, cached: pkgACached.areas?.query?.cached } },
      },
      fakeTimers: true,
      steps: [
        { type: 'advance', ms: 1001 },
        { type: 'remount' },
        { type: 'settle', fn: 'fetch', value: { name: 'pkg-a-new' } },
      ],
    },
    {
      name: 'a key change fetches the new key and never shows the old document',
      args: [observing(['list', 'a'])],
      context: empty,
      steps: [
        { type: 'settle', fn: 'fetch', value: rowsA },
        { type: 'args', args: [observing(['list', 'b'])] },
        { type: 'settle', fn: 'fetch', value: [{ id: 'b1' }] },
      ],
    },
    {
      // The abandoned fetch is aborted with the old observer's unsubscribe;
      // its late answer owns nothing and must not be cached or shown.
      name: 'a late answer for the previous key is dropped',
      args: [observing(['list', 'a'])],
      context: empty,
      steps: [
        { type: 'args', args: [observing(['list', 'b'])] },
        { type: 'settle', fn: 'fetch', value: rowsA },
        { type: 'settle', fn: 'fetch', value: [{ id: 'b1' }] },
      ],
    },
    {
      name: 'keepPreviousData keeps the previous document until the new key answers',
      args: [observing(['list', 'u1', 1], { principal: 'u1', keepPreviousData: true })],
      context: empty,
      steps: [
        { type: 'settle', fn: 'fetch', value: rowsA },
        {
          type: 'args',
          args: [observing(['list', 'u1', 2], { principal: 'u1', keepPreviousData: true })],
        },
        { type: 'settle', fn: 'fetch', value: [{ id: 'b1' }] },
      ],
    },
    {
      name: 'keepPreviousData clears the previous document when the new key fails',
      args: [observing(['list', 'u1', 1], { principal: 'u1', keepPreviousData: true })],
      context: empty,
      steps: [
        { type: 'settle', fn: 'fetch', value: rowsA },
        {
          type: 'args',
          args: [observing(['list', 'u1', 2], { principal: 'u1', keepPreviousData: true })],
        },
        { type: 'settle', fn: 'fetch', error: 'next page failed' },
      ],
    },
    {
      name: 'a principal change drops the previous document at once',
      args: [observing(['list', 'u1', 1], { principal: 'u1', keepPreviousData: true })],
      context: empty,
      steps: [
        { type: 'settle', fn: 'fetch', value: rowsA },
        {
          type: 'args',
          args: [observing(['list', 'u2', 1], { principal: 'u2', keepPreviousData: true })],
        },
        { type: 'settle', fn: 'fetch', value: [{ id: 'u2-1' }] },
      ],
    },
    {
      // The hook refuses before its first hook call, so nothing is subscribed
      // and nothing fetches; the corrected options mount a working observer
      // (after a throw, an `args` step mounts afresh, as an app does).
      name: 'keepPreviousData without a principal throws, and corrected options observe',
      args: [{ key: ['list', 'a'], fetch: fetchDoc, keepPreviousData: true }],
      context: empty,
      steps: [
        {
          type: 'args',
          args: [observing(['list', 'a'], { principal: 'u1', keepPreviousData: true })],
        },
        { type: 'settle', fn: 'fetch', value: rowsA },
      ],
    },
    {
      // The second options object carries a second loader that must never run.
      name: 'a new options object with the same key refetches nothing',
      args: [observing(['pkg', 'a'])],
      context: empty,
      steps: [
        { type: 'settle', fn: 'fetch', value: { name: 'pkg-a' } },
        { type: 'stable', methods: ['setData', 'refetch'] },
        {
          type: 'args',
          args: [{ key: ['pkg', 'a'], fetch: { $fn: 'fetch2', resolve: 'unused' } }],
        },
        { type: 'stable', methods: ['setData', 'refetch'] },
      ],
    },
    {
      name: 'setData publishes a document and the cache holds it',
      args: [observing(['pkg', 'a'])],
      context: empty,
      steps: [
        { type: 'settle', fn: 'fetch', value: { name: 'pkg-a' } },
        { type: 'call', method: 'setData', args: [{ name: 'saved' }] },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'setData takes an updater that receives the cached document',
      args: [observing(['pkg', 'a'], { fetch: { $fn: 'fetch', resolve: 'unused' } })],
      context: { areas: { query: { cached: [{ key: ['pkg', 'a'], data: { count: 1 } }] } } },
      steps: [{ type: 'call', method: 'setData', args: [{ $fn: 'bump', returns: { count: 2 } }] }],
    },
    {
      name: 'an updater returning undefined leaves the document unchanged',
      args: [observing(['pkg', 'a'], { fetch: { $fn: 'fetch', resolve: 'unused' } })],
      context: { areas: { query: { cached: [{ key: ['pkg', 'a'], data: { count: 1 } }] } } },
      steps: [
        { type: 'call', method: 'setData', args: [{ $fn: 'noop', returns: undefined }] },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'setData on a null query does nothing and calls no updater',
      args: [null],
      context: empty,
      steps: [{ type: 'call', method: 'setData', args: [{ $fn: 'noop', returns: { count: 9 } }] }],
    },
    {
      name: 'refetch fetches a fresh document and resolves with the state',
      args: [observing(['pkg', 'a'], { fetch: { $fn: 'fetch', resolve: { name: 'pkg-a-new' } } })],
      context: pkgACached,
      steps: [{ type: 'call', method: 'refetch' }],
    },
    {
      name: 'a failed refetch resolves with the error state and keeps the cached data',
      args: [observing(['pkg', 'a'], { fetch: { $fn: 'fetch', reject: 'reload failed' } })],
      context: pkgACached,
      steps: [{ type: 'call', method: 'refetch' }],
    },
    {
      name: 'refetch on a null query stays idle without fetching',
      args: [null],
      context: empty,
      steps: [{ type: 'call', method: 'refetch' }],
    },
    {
      name: 'a cache write from outside reaches the observer',
      args: [observing(['pkg', 'a'])],
      context: empty,
      steps: [
        { type: 'settle', fn: 'fetch', value: { name: 'pkg-a' } },
        { type: 'control', name: 'query.set', args: [['pkg', 'a'], { name: 'from-outside' }] },
      ],
    },
    {
      // The core contract: invalidate only marks stale for the NEXT subscribe.
      name: 'an invalidation from outside does not refetch a subscribed observer',
      args: [observing(['pkg', 'a'])],
      context: pkgACached,
      steps: [
        { type: 'control', name: 'query.invalidate', args: [['pkg']] },
        { type: 'remount' },
        { type: 'settle', fn: 'fetch', value: { name: 'pkg-a-new' } },
      ],
    },
    {
      // The last observer leaving aborts the fetch (`fetch aborted`), and the cache
      // shows the late answer left nothing behind.
      name: 'unmount while a fetch is pending leaves nothing cached',
      args: [observing(['pkg', 'a'])],
      context: empty,
      steps: [
        { type: 'unmount' },
        { type: 'settle', fn: 'fetch', value: { name: 'late' } },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'setData and refetch keep their functions across a re-render',
      args: [observing(['pkg', 'a'], { fetch: { $fn: 'fetch', resolve: 'unused' } })],
      context: pkgACached,
      steps: [
        { type: 'stable', methods: ['setData', 'refetch'] },
        { type: 'control', name: 'query.set', args: [['pkg', 'a'], { name: 're-rendered' }] },
        { type: 'stable', methods: ['setData', 'refetch'] },
      ],
    },
  ],
}

/** `usePrefetch()`: one stable warm-the-cache function for event handlers. */
const usePrefetchCases: HookCases = {
  hook: 'usePrefetch',
  // `reactiveArgs` keeps the same host across the identity case's `args` step
  // (the hook itself takes no arguments; only a re-render can observe identity).
  reactiveArgs: true,
  cases: [
    {
      name: 'prefetching warms the cache',
      context: empty,
      steps: [
        {
          type: 'call',
          args: [{ key: ['pkg', 'a'], fetch: { $fn: 'fetch', resolve: { name: 'pkg-a' } } }],
        },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'a fresh cached document is not fetched again',
      context: pkgACached,
      steps: [
        { type: 'call', args: [{ key: ['pkg', 'a'], fetch: { $fn: 'fetch', resolve: 'unused' } }] },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'an in-flight prefetch is not restarted',
      context: empty,
      steps: [
        { type: 'call', args: [{ key: ['pkg', 'a'], fetch: fetchDoc }] },
        { type: 'call', args: [{ key: ['pkg', 'a'], fetch: fetchDoc }] },
        { type: 'settle', fn: 'fetch', value: { name: 'pkg-a' } },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'a failed prefetch is swallowed and the cache shows the error',
      context: empty,
      steps: [
        {
          type: 'call',
          args: [{ key: ['pkg', 'a'], fetch: { $fn: 'fetch', reject: 'warm failed' } }],
        },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'the data-saver setting prefetches nothing',
      context: { areas: { query: { connection: { saveData: true } } } },
      steps: [
        { type: 'call', args: [{ key: ['pkg', 'a'], fetch: { $fn: 'fetch', resolve: 'unused' } }] },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'a 2G connection prefetches nothing',
      context: { areas: { query: { connection: { effectiveType: 'slow-2g' } } } },
      steps: [
        { type: 'call', args: [{ key: ['pkg', 'a'], fetch: { $fn: 'fetch', resolve: 'unused' } }] },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'a 4G connection prefetches',
      context: { areas: { query: { connection: { effectiveType: '4g' } } } },
      steps: [
        {
          type: 'call',
          args: [{ key: ['pkg', 'a'], fetch: { $fn: 'fetch', resolve: { name: 'pkg-a' } } }],
        },
        { type: 'control', name: 'query.peek', args: [['pkg', 'a']] },
      ],
    },
    {
      name: 'the prefetch function is stable across a re-render',
      context: empty,
      steps: [{ type: 'stable' }, { type: 'args', args: [] }, { type: 'stable' }],
    },
  ],
}

/** The pending node a QueryContent case shows while nothing has loaded. */
const pendingNode: NodeSpec = {
  tag: 'p',
  attrs: { 'data-state': 'pending' },
  children: ['loading'],
}

/** The missing node a QueryContent case shows for a loaded null record. */
const missingNode: NodeSpec = {
  tag: 'p',
  attrs: { 'data-state': 'missing' },
  children: ['missing'],
}

/** The error function's node, built from the error value it receives. */
const errorNode: NodeSpec[] = [
  { tag: 'p', attrs: { 'data-state': 'error' }, children: ['failed: {0.message}'] },
]

/** The children function's node, built from the document it receives. */
const docNode: NodeSpec[] = [
  { tag: 'article', attrs: { 'data-doc': '{0.name}' }, children: ['doc {0.name}'] },
]

/** The children function's node for the falsy documents, showing the raw value. */
const rawNode: NodeSpec[] = [{ tag: 'span', attrs: { 'data-doc': '{0}' }, children: ['{0}'] }]

/** `QueryContent`: renders children only for a loaded, non-null document. */
const queryContentCases: FeatureCases['families'][number] = {
  component: 'QueryContent',
  cases: [
    {
      name: 'loading shows the pending node',
      props: {
        query: { status: 'loading' },
        pending: { $nodes: [pendingNode] },
        children: { $fn: 'doc', nodes: docNode },
      },
    },
    {
      name: 'idle shows the pending node',
      props: {
        query: { status: 'idle' },
        pending: { $nodes: [pendingNode] },
        children: { $fn: 'doc', nodes: docNode },
      },
    },
    {
      name: 'a loaded document renders the children with it',
      props: {
        query: { data: { name: 'pkg-a' }, status: 'success' },
        pending: { $nodes: [pendingNode] },
        children: { $fn: 'doc', nodes: docNode },
      },
    },
    {
      name: 'false is a document',
      props: {
        query: { data: false, status: 'success' },
        children: { $fn: 'doc', nodes: rawNode },
      },
    },
    {
      name: 'zero is a document',
      props: {
        query: { data: 0, status: 'success' },
        children: { $fn: 'doc', nodes: rawNode },
      },
    },
    {
      name: 'an empty string is a document',
      props: {
        query: { data: '', status: 'success' },
        children: { $fn: 'doc', nodes: rawNode },
      },
    },
    {
      name: 'an empty list is a document',
      props: {
        query: { data: [], status: 'success' },
        children: { $fn: 'doc', nodes: rawNode },
      },
    },
    {
      name: 'a null document shows the missing node',
      props: {
        query: { data: null, status: 'success' },
        missing: { $nodes: [missingNode] },
        children: { $fn: 'doc', nodes: docNode },
      },
    },
    {
      name: 'a null document without the missing prop renders nothing',
      props: {
        query: { data: null, status: 'success' },
        children: { $fn: 'doc', nodes: docNode },
      },
    },
    {
      name: 'an error renders the error function with the error value',
      props: {
        query: { status: 'error', error: { message: 'boom' } },
        pending: { $nodes: [pendingNode] },
        error: { $fn: 'failed', nodes: errorNode },
        children: { $fn: 'doc', nodes: docNode },
      },
    },
    {
      // The component's own fallback: without an `error` renderer a failed
      // read is still not loaded content, so `pending` shows.
      name: 'an error without the error prop falls back to the pending node',
      props: {
        query: { status: 'error', error: { message: 'boom' } },
        pending: { $nodes: [pendingNode] },
        children: { $fn: 'doc', nodes: docNode },
      },
    },
    {
      name: 'an error with cached data keeps the children mounted',
      props: {
        query: { data: { name: 'pkg-a' }, status: 'error', error: { message: 'refresh failed' } },
        error: { $fn: 'failed', nodes: errorNode },
        children: { $fn: 'doc', nodes: docNode },
      },
    },
    {
      // React re-renders the same children with the new document, so the mounted
      // node (and any state inside it) is kept: a re-created node loses its mark.
      name: 'a changed document reaches the same mounted children',
      props: {
        query: { data: { name: 'pkg-a' }, status: 'success' },
        pending: { $nodes: [pendingNode] },
        children: { $fn: 'doc', nodes: docNode },
      },
      interactions: [
        { type: 'mark', selector: 'article' },
        { type: 'props', props: { query: { data: { name: 'pkg-b' }, status: 'success' } } },
      ],
    },
    {
      name: 'states move from pending through loaded to error',
      props: {
        query: { status: 'idle' },
        pending: { $nodes: [pendingNode] },
        error: { $fn: 'failed', nodes: errorNode },
        children: { $fn: 'doc', nodes: docNode },
      },
      interactions: [
        { type: 'props', props: { query: { data: { name: 'pkg-a' }, status: 'success' } } },
        { type: 'props', props: { query: { status: 'error', error: { message: 'boom' } } } },
      ],
    },
  ],
}

/** `@molecule/app-query-react`. */
export const queryFeature: FeatureCases = {
  package: '@molecule/app-query-react',
  families: [queryContentCases],
  hooks: [usePrefetchCases, useQueryCases],
  shared: {
    createQueryResource: '@molecule/app-query',
    prefetchQuery: '@molecule/app-query',
  },
  frameworkShaped: {
    intentPrefetchProps:
      'its handler prop names follow each framework listener naming (React onPointerEnter/onFocus/onTouchStart, Vue onPointerenter, …); every framework must prefetch on pointer enter, focus and touch start (its own unit tests pin it)',
  },
}
