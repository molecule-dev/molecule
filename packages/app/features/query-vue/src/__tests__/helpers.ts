/**
 * Test harness for the query-vue unit tests: mounts the composables under a
 * real Vue app (plain `createApp`, the way the conformance adapters mount),
 * and flushes the reactivity scheduler and promise chains the cache notifies.
 *
 * @module
 */
import {
  type App,
  createApp,
  defineComponent,
  type h,
  nextTick,
  ref,
  shallowRef,
  type VNodeChild,
} from 'vue'

import type { QueryOptions } from '@molecule/app-query'

import type { UseQueryResult } from '../types.js'
import { usePrefetch } from '../usePrefetch.js'
import { useQuery } from '../useQuery.js'

/** The apps this file mounted; `unmountAll` tears them down between tests. */
const apps: App[] = []

/**
 * Unmounts every app a test mounted. Call it from `afterEach`, like the React
 * package's tests unmount their roots.
 */
export async function unmountAll(): Promise<void> {
  for (const app of apps.splice(0)) app.unmount()
  await nextTick()
}

/** A mounted `useQuery` observer. */
export interface MountedQuery<T> {
  /** The options source the composable reads (React's "re-render with new arguments"). */
  source: { value: QueryOptions<T> | null }
  /** The current result, read at call time. */
  value: () => UseQueryResult<T>
  /** Swaps the options on the SAME mount (visible on the next read). */
  setOptions(next: QueryOptions<T> | null): void
  /** Re-renders the host without changing anything the composable reads. */
  rerender(): Promise<void>
  /** Unmounts the host (watchers and cache subscription are disposed). */
  unmount(): Promise<void>
}

/**
 * Mounts `useQuery` under a real Vue app.
 *
 * @param options - The first options.
 * @returns The mounted observer's handle.
 */
export function mountQuery<T>(options: QueryOptions<T> | null): MountedQuery<T> {
  const source = shallowRef<QueryOptions<T> | null>(options)
  let result: ReturnType<typeof useQuery<T>> | undefined
  let setupError: unknown = undefined
  const tick = ref(0)
  const container = document.createElement('div')
  const Host = defineComponent({
    setup() {
      result = useQuery<T>(source)
      // Reading the tick in render makes a parent re-render observable.
      return () => {
        void tick.value
        return null
      }
    },
  })
  const app = createApp(Host)
  apps.push(app)
  try {
    app.mount(container)
  } catch (error) {
    // A composable that refuses its options (keepPreviousData without a
    // principal) throws out of setup, the way React's throws out of render;
    // `value()` rethrows it at the read, as the hook would have.
    setupError = error
  }
  const unmount = async (): Promise<void> => {
    app.unmount()
    const index = apps.indexOf(app)
    if (index >= 0) apps.splice(index, 1)
    await nextTick()
  }
  return {
    source,
    value: () => {
      if (setupError !== undefined) throw setupError
      return result!.value
    },
    // React's rerender applies new arguments without draining microtasks: the
    // swap is visible on the next read, the new fetch lands later. The source
    // write is synchronous for the same reason.
    setOptions: (next) => {
      source.value = next
    },
    rerender: async () => {
      tick.value += 1
      await nextTick()
    },
    unmount,
  }
}

/** A mounted `usePrefetch` composable. */
export interface MountedPrefetch {
  /** The current warm-the-cache function, read at call time. */
  value: () => <T>(options: QueryOptions<T>) => void
  /** Re-renders the host (the function must survive it). */
  rerender(): Promise<void>
  /** Unmounts the host. */
  unmount(): Promise<void>
}

/**
 * Mounts `usePrefetch` under a real Vue app.
 *
 * @returns The mounted composable's handle.
 */
export function mountPrefetch(): MountedPrefetch {
  let result: ReturnType<typeof usePrefetch> | undefined
  const tick = ref(0)
  const container = document.createElement('div')
  const Host = defineComponent({
    setup() {
      result = usePrefetch()
      return () => {
        void tick.value
        return null
      }
    },
  })
  const app = createApp(Host)
  apps.push(app)
  app.mount(container)
  const unmount = async (): Promise<void> => {
    app.unmount()
    const index = apps.indexOf(app)
    if (index >= 0) apps.splice(index, 1)
    await nextTick()
  }
  return {
    value: () => result!,
    rerender: async () => {
      tick.value += 1
      await nextTick()
    },
    unmount,
  }
}

/** A mounted component with its host element. */
export interface MountedComponent {
  /** The element the app was mounted into. */
  host: HTMLElement
  /** Re-renders with props merged over the current ones. */
  setProps(props: Record<string, unknown>): Promise<void>
  /** Unmounts the app. */
  unmount(): Promise<void>
}

/**
 * Mounts one component render into a fresh element.
 *
 * @param render - A render call (`h(Component, props)`), re-evaluated for every
 *   `setProps`.
 * @param props - The first props.
 * @returns The mounted component's handle.
 */
export function mountComponent(
  render: (props: Record<string, unknown>) => ReturnType<typeof h>,
  props: Record<string, unknown> = {},
): MountedComponent {
  const current = ref<Record<string, unknown>>(props)
  const container = document.createElement('div')
  const Host = defineComponent({
    setup() {
      return () => render({ ...current.value })
    },
  })
  const app = createApp(Host)
  apps.push(app)
  app.mount(container)
  const unmount = async (): Promise<void> => {
    app.unmount()
    const index = apps.indexOf(app)
    if (index >= 0) apps.splice(index, 1)
    await nextTick()
  }
  return {
    host: container,
    setProps: async (next) => {
      current.value = { ...current.value, ...next }
      await nextTick()
    },
    unmount,
  }
}

/**
 * Lets promise callbacks and cache notifications land before the next read.
 * The counterpart of the React package's `flush`/`settle` act loops.
 */
export async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) {
    await nextTick()
    await Promise.resolve()
  }
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
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

/** A mounted component tree with its host element. */
export interface MountedApp {
  /** The element the app was mounted into. */
  host: HTMLElement
  /** Unmounts the app. */
  unmount(): Promise<void>
}

/**
 * Mounts one component tree built in `setup` — the counterpart of the React
 * package's tests mounting a component whose body calls the hooks.
 *
 * @param setup - The component's setup, returning its render function.
 * @returns The mounted tree's handle.
 */
export function mountApp(setup: () => () => VNodeChild): MountedApp {
  const container = document.createElement('div')
  const Host = defineComponent({ setup })
  const app = createApp(Host)
  apps.push(app)
  app.mount(container)
  const unmount = async (): Promise<void> => {
    app.unmount()
    const index = apps.indexOf(app)
    if (index >= 0) apps.splice(index, 1)
    await nextTick()
  }
  return { host: container, unmount }
}
