/**
 * The shared snapshot engine of the hooks that mirror React's
 * `useSyncExternalStore`: a readable store fed by a service subscription, whose
 * snapshot getter runs with React's exact read cadence.
 *
 * React re-reads its snapshot around every render — once for the value, once
 * more for its dev "cached getSnapshot" check (skipped after the read has
 * proved uncached), and once after committing to catch a store that changed
 * mid-render. Notifications run a change check first, and the re-render they
 * cause happens on the scheduler, so two notifications inside one task coalesce
 * into a single render. A recording snapshot getter (one the conformance kit
 * counts, or one that logs) therefore observes the same calls it would from
 * React's binding.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

/**
 * A readable store of `getSnapshot()`'s value, subscribed for the component's
 * lifetime, with React's `useSyncExternalStore` read cadence.
 *
 * @param subscribe - Subscribes the service; called with the change callback,
 *   returns the unsubscribe.
 * @param getSnapshot - Reads the service's current snapshot.
 * @returns A readable store of the snapshot.
 */
export function useSyncExternalStore<T>(
  subscribe: (onChange: () => void) => () => void,
  getSnapshot: () => T,
): Readable<T> {
  // React's didWarnUncachedGetSnapshot: after the dev check has proved the
  // getter uncached, React stops repeating that second read.
  let warnedUncached = false
  // The value the app renders (React's memoizedState) and the value the
  // subscription's change checks compare against (React's inst.value). They
  // differ only while a scheduled render is pending.
  let renderedSnapshot: T
  let committedSnapshot: T
  let scheduled = false
  let destroyed = false

  /** React's dev uncached-getSnapshot check: a second read, compared. */
  const checkUncached = (rendered: T): void => {
    if (warnedUncached) return
    if (!Object.is(rendered, getSnapshot())) {
      console.error('The result of getSnapshot should be cached to avoid an infinite loop')
      warnedUncached = true
    }
  }

  const result = writable<T>(undefined as T)

  /**
   * One render pass: read the snapshot (and its cached check), publish it, set
   * it as committed, and re-check after "committing" it the way React's
   * updateStoreInstance effect does.
   */
  const render = (): void => {
    scheduled = false
    if (destroyed) return
    const rendered = getSnapshot()
    checkUncached(rendered)
    if (!Object.is(renderedSnapshot, rendered)) {
      renderedSnapshot = rendered
      result.set(rendered)
    }
    committedSnapshot = rendered
    if (!Object.is(committedSnapshot, getSnapshot())) scheduleRender()
  }

  /** React renders on the scheduler, so notifications inside one task coalesce. */
  const scheduleRender = (): void => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(render)
  }

  const first = getSnapshot()
  checkUncached(first)
  renderedSnapshot = first
  committedSnapshot = first
  result.set(first)

  const unsubscribe = subscribe(() => {
    if (destroyed) return
    if (!Object.is(committedSnapshot, getSnapshot())) scheduleRender()
  })
  // React's mount consistency check (updateStoreInstance): the store may have
  // changed between the read above and the subscription settling.
  if (!Object.is(committedSnapshot, getSnapshot())) scheduleRender()
  onDestroy(() => {
    destroyed = true
    unsubscribe()
  })

  return { subscribe: result.subscribe }
}
