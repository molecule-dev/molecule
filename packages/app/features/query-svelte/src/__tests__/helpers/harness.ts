/**
 * The unit-test harness: mounts `useQuery` in a real Svelte component (the way
 * an app does, with the options as a writable store) and settles the cache's
 * async notifications where React's tests used `act` rounds.
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import { type Writable, writable } from 'svelte/store'

import type { QueryOptions } from '@molecule/app-query'

import type { UseQueryResult } from '../../types.js'
import Bare from './Bare.svelte'
import Probe from './Probe.svelte'

/** One mounted hook, with the accessors React's `renderHook` tests used. */
export interface MountedQuery<T> {
  /** The latest result. */
  value: () => UseQueryResult<T>
  /** The rendered document text (React's `<output>`). */
  text: () => string
  /** Applies new options on the same mount (React's rerender with new options). */
  setOptions: (next: QueryOptions<T> | null) => void
  /** Destroys the component. */
  unmount: () => Promise<void>
}

/**
 * Mounts `useQuery(options)` in a real component and captures every result.
 *
 * @template T - The document type.
 * @param initial - The options the hook starts with.
 * @returns The mounted hook's accessors.
 */
export function renderHook<T>(initial: QueryOptions<T> | null): MountedQuery<T> {
  const options: Writable<QueryOptions<T> | null> = writable(initial)
  let latest!: UseQueryResult<T>
  const container = document.createElement('div')
  document.body.append(container)
  const instance = mount<
    {
      options: Writable<QueryOptions<T> | null>
      capture: (result: UseQueryResult<T>) => void
    },
    Record<string, never>
  >(Probe, {
    target: container,
    props: {
      options,
      capture: (result: UseQueryResult<T>) => {
        latest = result
      },
    },
  })
  flushSync()
  return {
    value: () => latest,
    text: () => container.querySelector('output')?.textContent ?? '',
    setOptions: (next) => {
      options.set(next)
      flushSync()
    },
    unmount: async () => {
      await unmount(instance)
      container.remove()
    },
  }
}

/** One mounted no-options hook (React's `renderHook` for `usePrefetch`). */
export interface MountedValue<R> {
  /** The value the hook returned at init. */
  value: () => R
  /** Destroys the component. */
  unmount: () => Promise<void>
}

/**
 * Mounts a hook that takes no options, in a real component.
 *
 * @param use - The hook call.
 * @returns The mounted value's accessors.
 */
export function renderBare<R>(use: () => R): MountedValue<R> {
  let latest!: R
  const container = document.createElement('div')
  document.body.append(container)
  const instance = mount(Bare, {
    target: container,
    props: {
      call: use,
      capture: (value: unknown) => {
        latest = value as R
      },
    },
  })
  flushSync()
  return {
    value: () => latest,
    unmount: async () => {
      await unmount(instance)
      container.remove()
    },
  }
}

/** Lets promise callbacks and cache notifications land, then flushes Svelte's updates. */
export async function settle(rounds = 6): Promise<void> {
  for (let i = 0; i < rounds; i += 1) await new Promise((resolve) => setTimeout(resolve, 0))
  flushSync()
}

/** A promise a test settles by hand. */
export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
}

/**
 * Creates a deferred promise.
 *
 * @template T - The resolved type.
 * @returns The promise with its resolvers.
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
