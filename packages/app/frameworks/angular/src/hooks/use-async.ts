/**
 * Angular functions for async state, mirroring `usePromise`, `useAsyncState`
 * and `useOptimisticValue` from `@molecule/app-react`.
 *
 * `usePromise` and `useAsyncState` return a plain mutable TUPLE whose state
 * member is updated in place: the tuple is the mounted result for this
 * component instance's whole lifetime, and every snapshot of it must show the
 * state at that moment (React re-renders a new state object into the same
 * tuple; this port mutates the same tuple's members).
 *
 * @module
 */

import { computed, DestroyRef, ElementRef, inject, type Signal } from '@angular/core'

import type { OptimisticValue, OptimisticValueOptions } from '@molecule/app-state'
import { createOptimisticValue, shallowEqual } from '@molecule/app-state'
import type { PromiseStatus } from '@molecule/app-utilities'

import { adoptLane, captureSite, parkLane } from '../site.js'
import { useExternalStore } from './external-store.js'

/**
 * The state of the latest {@link usePromise} call.
 *
 * @template T - The resolved value's shape.
 */
export interface UsePromiseState<T> {
  /** `'idle'`, `'pending'`, `'resolved'` or `'rejected'`. */
  status: PromiseStatus
  /** The resolved value, `null` before the first resolution and after a reset. */
  value: T | null
  /** The rejection of the latest call, or the cancel message as an Error. */
  error: Error | null
  /** Marks a pending call rejected; its late result is not shown. */
  cancel: (message?: string) => void
  /** Returns the state to idle and clears value and error. */
  reset: () => void
}

/**
 * Wraps an async function with the state of its latest call. Call it in an
 * injection context (a component field initializer or constructor).
 *
 * For one UI action, pass `state.status === 'pending'` to a button's loading
 * input. The control then refuses input while the request is pending and
 * re-enables when the tracked call settles. Handle the returned promise's
 * rejection; the hook also records the failure in `state.error`.
 *
 * This hook tracks the latest call: it does not serialize invocations or
 * cancel their network requests. An explicit reset/cancel changes the tracked
 * state, so it is not proof that an outstanding request has stopped. Use an
 * app-owned queue when every click must be accepted in order.
 *
 * @param asyncFn - The async function to wrap.
 * @returns A tuple of `[state, wrappedFunction]`; the state object is updated
 *   in place for this instance's lifetime.
 */
export const usePromise = <T extends (...args: never[]) => Promise<unknown>>(
  asyncFn: T,
): [
  UsePromiseState<Awaited<ReturnType<T>>>,
  (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>,
] => {
  type V = Awaited<ReturnType<T>>

  const destroyRef = inject(DestroyRef)
  let unmounted = false
  destroyRef.onDestroy(() => {
    unmounted = true
  })
  let callId = 0

  // The state object is MUTATED in place: the tuple is returned once per
  // instance and every later read of it must see the current call's state.
  const state: UsePromiseState<V> = {
    status: 'idle',
    value: null,
    error: null,
    cancel: (message?: string): void => {
      callId += 1
      if (!unmounted) {
        state.status = 'rejected'
        state.error = message ? new Error(message) : null
      }
    },
    reset: (): void => {
      if (!unmounted) {
        state.status = 'idle'
        state.value = null
        state.error = null
      }
    },
  }

  const callAsyncFn = (...args: Parameters<T>): Promise<V> => {
    callId += 1
    const thisCallId = callId

    if (!unmounted) {
      state.status = 'pending'
      state.error = null
    }

    const promise = asyncFn(...args) as Promise<V>

    return promise.then(
      (resolved: V) => {
        if (thisCallId === callId && !unmounted) {
          state.status = 'resolved'
          state.value = resolved
          state.error = null
        }
        return resolved
      },
      (err: unknown) => {
        const rejection = err instanceof Error ? err : new Error(String(err))

        if (thisCallId === callId && !unmounted) {
          state.status = 'rejected'
          state.error = rejection
        }

        throw rejection
      },
    )
  }

  return [state, callAsyncFn]
}

/**
 * An async-capable setState function: a value, an updater receiving the
 * previous state, or a promise resolving to either. Errors from a resolved
 * promise are swallowed so they never surface as unhandled rejections.
 *
 * @template T - The state's shape.
 */
export type AsyncSetState<T> = (
  value: T | ((prev: T) => T) | Promise<T | ((prev: T) => T)>,
) => Promise<void>

/**
 * An async-capable extendState function for partial updates.
 *
 * @template T - The state's shape.
 */
export type AsyncExtendState<T> = (
  partial: Partial<T> | ((prev: T) => Partial<T>) | Promise<Partial<T> | ((prev: T) => Partial<T>)>,
) => Promise<void>

/**
 * Like `useState` but accepts Promises and supports partial state extension.
 * Call it in an injection context.
 *
 * There is NO latest-wins guard (pinned like React's): whatever settles last
 * wins, even over a newer synchronous set.
 *
 * @param initialState - Initial state value.
 * @returns A tuple of `[state, setState, extendState]`; the state member is
 *   replaced in place for this instance's lifetime.
 */
export const useAsyncState = <T>(initialState: T): [T, AsyncSetState<T>, AsyncExtendState<T>] => {
  // The tuple's first member is replaced on every change; the tuple itself is
  // the mounted result for this instance's lifetime.
  const tuple: [T, AsyncSetState<T>, AsyncExtendState<T>] = [
    initialState,
    async (_nextState) => {
      try {
        const nextState = await _nextState
        const prev = tuple[0]
        const next =
          typeof nextState === 'function' ? (nextState as (prev: T) => T)(prev) : (nextState as T)
        tuple[0] = next
      } catch (_error) {
        // Silently swallow errors from resolved Promises to avoid unhandled
        // rejections, exactly like React's hook.
      }
    },
    async (_partial) => {
      try {
        const partial = await _partial
        const prev = tuple[0]
        const resolved =
          typeof partial === 'function' ? (partial as (prev: T) => Partial<T>)(prev) : partial
        tuple[0] = { ...prev, ...resolved }
      } catch (_error) {
        // Silently swallow errors from resolved Promises to avoid unhandled
        // rejections, exactly like React's hook.
      }
    },
  ]
  return tuple
}

/**
 * What {@link useOptimisticValue} returns: the state to render (as signals —
 * the same fields React's result carries as plain values) and the two ways to
 * change it.
 *
 * @template T - The value's shape.
 */
export interface UseOptimisticValueResult<T> {
  /** The newest chosen value, or the server's value when nothing is saving. */
  readonly value: Signal<T>

  /** Whether a save is running or waiting to run. */
  readonly pending: Signal<boolean>

  /** The failure of the newest change, after the value went back; `null` otherwise. */
  readonly error: Signal<unknown>
  /**
   * Shows `next` at once and saves it, after any save already running.
   *
   * @param next - The value the person chose.
   */
  set: OptimisticValue<T>['set']

  /**
   * Like `set`, computed from the value shown now (`update((on) => !on)`).
   *
   * @param change - Computes the next value from the value shown now.
   */
  update: OptimisticValue<T>['update']
}

/**
 * A server-backed value — a favorite, follow, like or bookmark button, a
 * rating, a quantity, a setting switch — that changes on the first read after
 * a tap and is saved one change at a time, in order. Call it in an injection
 * context.
 *
 * Only a failure of the newest change puts the server value back. A new server
 * `value` is taken only while nothing is being saved, so a parent re-render or
 * a refetch of older data never flips the control mid-save.
 *
 * Like React — whose component instance survives an argument change — the
 * controller survives this site's re-creation (an input change to the hook):
 * the destroyed instance parks it at the site and the next instance adopts it,
 * feeding the new server value through `sync()`. See `site.ts`.
 *
 * @param options - The server's current value and how to save a change.
 * @returns The value to render, whether a save is pending, the newest failure,
 *   and `set`/`update`.
 */
export const useOptimisticValue = <T>(
  options: OptimisticValueOptions<T>,
): UseOptimisticValueResult<T> => {
  const destroyRef = inject(DestroyRef)
  const host = inject(ElementRef).nativeElement as HTMLElement
  // The site's container, recorded once the host is attached (see captureSite);
  // the lane parks only while that container is still in the document.
  let site: Element | null = null
  captureSite(host, (captured) => {
    site = captured
  })

  // Adopt the previous instance's controller at this site (an argument change
  // re-created the host while a save may still run); otherwise start one.
  type Lane = { controller: OptimisticValue<T>; received: T }
  const adopted = adoptLane<Lane>('useOptimisticValue')
  const controller: OptimisticValue<T> =
    adopted?.controller ??
    createOptimisticValue<T>({
      value: options.value,
      commit: (next, previous, confirm) => options.commit(next, previous, confirm),
      equals: (a, b) => (options.equals ?? shallowEqual)(a, b),
      onError: (error, value) => options.onError?.(error, value),
    })
  // The last server value this site received. The equality check runs on every
  // mount exactly like React's effect: equal → nothing; different → the new
  // server value is synced in (immediately when idle, kept as fallback while
  // saving).
  let received: T = adopted ? adopted.received : options.value
  if (!(options.equals ?? shallowEqual)(received, options.value)) {
    received = options.value
    controller.sync(options.value)
  }

  const state = useExternalStore(
    () => controller.getState(),
    (notify) => controller.subscribe(notify),
  )

  destroyRef.onDestroy(() => {
    parkLane('useOptimisticValue', { controller, received }, site)
  })

  return {
    value: computed(() => state().value),
    pending: computed(() => state().pending),
    error: computed(() => state().error),
    set: (next: T) => controller.set(next),
    update: (change: (current: T) => T) => controller.update(change),
  }
}
