/**
 * `useQuery` mounts for this package's tests: the hook is called once in an
 * injection context over a signal of options, so an options change follows the
 * SAME instance — the way React re-renders a component that passes a new
 * options object. Every mount made through here is torn down after the test.
 *
 * @module
 */
import { signal } from '@angular/core'

import type { QueryOptions } from '@molecule/app-query'

import { useQuery, type UseQueryResult } from '../index.js'
import { type HookMount, mountHook } from './harness.js'

/** A mounted `useQuery` with its options retained for later changes. */
export interface QueryMount<T> {
  /** The hook's result (one object for the mount's lifetime). */
  value: () => UseQueryResult<T>
  /** Passes the options getter's next value and settles, like a re-render. */
  rerender: () => Promise<void>
  /** Passes the options getter's next value and renders once, without settling. */
  rerenderOnce: () => void
  /** Runs change detection and settles the work it scheduled. */
  settle: () => Promise<void>
  /** Tears the host down (the subscription's cleanup runs, like an unmount). */
  destroy: () => Promise<void>
}

/** Every mount made by {@link mountQuery}, torn down by {@link destroyQueryMounts}. */
const active: HookMount<unknown>[] = []

/**
 * Mounts `useQuery` over an options getter in a real zoneless Angular
 * application.
 *
 * @param options - Reads the options the hook should observe now.
 * @returns The mount; a changed options object is followed on the same instance.
 */
export async function mountQuery<T>(options: () => QueryOptions<T> | null): Promise<QueryMount<T>> {
  const source = signal<QueryOptions<T> | null>(options())
  const mounted = await mountHook(() => useQuery(source))
  active.push(mounted as HookMount<unknown>)
  return {
    value: () => mounted.result(),
    rerender: async () => {
      source.set(options())
      await mounted.settle()
    },
    rerenderOnce: () => {
      source.set(options())
      mounted.tick()
    },
    settle: mounted.settle,
    destroy: mounted.destroy,
  }
}

/**
 * Mounts an arbitrary hook in a real zoneless Angular application and tracks
 * it for teardown with the query mounts.
 *
 * @param call - The hook call (a field-initializer expression).
 * @returns The mount.
 */
export async function mountTracked<R>(call: () => R): Promise<HookMount<R>> {
  const mounted = await mountHook(call)
  active.push(mounted as HookMount<unknown>)
  return mounted
}

/** Tears down every mount made through this module (an unmount of each host). */
export async function destroyQueryMounts(): Promise<void> {
  for (const mounted of active.splice(0)) await mounted.destroy()
}
