// @vitest-environment jsdom
/**
 * Test harness for the query-solid unit tests: mounts the primitives under a
 * real Solid root (plain `render`, the way the conformance adapters mount),
 * and flushes the reactive queue and the promise chains the cache notifies.
 *
 * @module
 */
import type { Accessor, JSX } from 'solid-js'
import { render } from 'solid-js/web'

import type { QueryOptions, QueryState } from '@molecule/app-query'

import type { UseQueryResult } from '../types.js'
import { useQuery } from '../use-query.js'

/** The roots this file mounted; `unmountAll` tears them down between tests. */
const disposers: Array<() => void> = []

/**
 * Unmounts every root a test mounted. Call it from `afterEach`, like the React
 * package's tests unmount their roots.
 */
export async function unmountAll(): Promise<void> {
  for (const dispose of disposers.splice(0)) dispose()
  await settle()
}

/**
 * Renders a hook inside a real root and returns a getter for its result plus a
 * re-render. A Solid component body runs once, so a "re-render" settles the
 * reactive queue without re-running the hook: only the hook's own tracked
 * options accessor re-keys it, the way React's re-render re-runs it.
 *
 * @param use - The hook call under test.
 * @returns The result getter, a re-render and the unmount.
 */
export function renderHook<R>(use: () => R): {
  value: () => R
  rerender: () => Promise<void>
  unmount: () => Promise<void>
} {
  let latest!: R
  function Probe(): JSX.Element {
    latest = use()
    return <></>
  }
  const container = document.createElement('div')
  const dispose = render(() => <Probe />, container)
  disposers.push(dispose)
  const unmount = async (): Promise<void> => {
    dispose()
    const index = disposers.indexOf(dispose)
    if (index >= 0) disposers.splice(index, 1)
    await settle()
  }
  return {
    value: () => latest,
    rerender: settle,
    unmount,
  }
}

/** A mounted `useQuery` observer whose rendered document is readable as text. */
export interface MountedPage<T> {
  /** The current observer result, read at call time (its fields are live). */
  value: () => UseQueryResult<T>
  /** The rendered text of the mounted document. */
  text: () => string
  /** Re-renders the host without changing anything the hook reads. */
  rerender: () => Promise<void>
  /** Unmounts the host (the cache subscription is disposed). */
  unmount: () => Promise<void>
}

/**
 * Mounts the actual observer with a rendered document and returns the visible
 * text after each event, the way the React package's mount does.
 *
 * @param options - The options as an accessor, so a test's signals re-key the
 *   observer on the same mount (a component body runs once in Solid).
 * @returns The mounted page's handle.
 */
export function mountPage<T>(options: Accessor<QueryOptions<T> | null>): MountedPage<T> {
  let latest!: UseQueryResult<T>
  function Page(): JSX.Element {
    latest = useQuery(options)
    return <output>{JSON.stringify(latest.data)}</output>
  }
  const container = document.createElement('div')
  const dispose = render(() => <Page />, container)
  disposers.push(dispose)
  const unmount = async (): Promise<void> => {
    dispose()
    const index = disposers.indexOf(dispose)
    if (index >= 0) disposers.splice(index, 1)
    await settle()
  }
  return {
    value: () => latest,
    text: () => container.textContent ?? '',
    rerender: settle,
    unmount,
  }
}

/** A mounted component with its host element, for the QueryContent tests. */
export interface MountedComponent {
  /** The element the component was mounted into. */
  host: HTMLElement
  /** Unmounts the component. */
  unmount: () => Promise<void>
}

/**
 * Mounts one component view into a fresh element appended to the body.
 *
 * @param view - The component view to render.
 * @returns The mounted component's handle.
 */
export function mountComponent(view: () => JSX.Element): MountedComponent {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const dispose = render(view, host)
  disposers.push(dispose)
  const unmount = async (): Promise<void> => {
    dispose()
    const index = disposers.indexOf(dispose)
    if (index >= 0) disposers.splice(index, 1)
    host.remove()
    await settle()
  }
  return { host, unmount }
}

/**
 * Lets promise callbacks and cache notifications land before the next read.
 * The counterpart of the React package's `flush`/`settle` act loops.
 */
export async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) {
    await Promise.resolve()
  }
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
}

/** A promise with its resolve and reject functions, the way the tests hold a request open. */
export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

/**
 * Builds a deferred promise.
 *
 * @returns The deferred.
 */
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** The idle state an observer of nothing reports. */
export const IDLE_STATE: QueryState<never> = {
  data: undefined,
  status: 'idle',
  error: undefined,
  isFetching: false,
  updatedAt: undefined,
}
