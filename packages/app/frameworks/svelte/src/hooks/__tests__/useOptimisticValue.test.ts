// @vitest-environment jsdom
/**
 * `useOptimisticValue`: React's `useOptimisticValue` cases in Svelte's idiom.
 * The hook runs once during component init and returns its state as readable
 * stores plus `set`/`update`; a plain options value or a store of them is the
 * way React's props reach a re-render, and the controller (with any save it is
 * running) survives the change.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import type { OptimisticValueOptions } from '@molecule/app-state'

import { setMoleculeContext } from '../../context.js'
import type { MaybeReadable } from '../maybe-readable.js'
import { useOptimisticValue, type UseOptimisticValueResult } from '../useOptimisticValue.js'
import FavoriteProbe from './FavoriteProbe.svelte'
import OptimisticValueParentProbe from './OptimisticValueParentProbe.svelte'

/** A save the test settles by hand. */
interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

/**
 * A promise the test settles by hand.
 *
 * @returns The promise and its settle functions.
 */
const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

interface Favorite {
  favorited: boolean
  count: number
}

/**
 * A server whose saves finish when the test says so.
 *
 * @returns The recorded saves and the commit function.
 */
const manualServer = (): {
  calls: Array<{ next: Favorite; reply: Deferred<Favorite> }>
  commit: ReturnType<typeof vi.fn<OptimisticValueOptions<Favorite>['commit']>>
} => {
  const calls: Array<{ next: Favorite; reply: Deferred<Favorite> }> = []
  const commit = vi.fn<OptimisticValueOptions<Favorite>['commit']>((next: Favorite) => {
    const reply = deferred<Favorite>()
    calls.push({ next, reply })
    return reply.promise
  })
  return { calls, commit }
}

/** Lets a settled save's promise chain and Svelte's pending updates run. */
const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  flushSync()
}

/** The mounted fixtures this file tears down after each case. */
const mounts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of mounts.splice(0)) await stop()
  document.body.innerHTML = ''
})

/**
 * Mounts a host that calls `useOptimisticValue` once during a child's init.
 *
 * @param options - The options (or a store of them) the hook is created with.
 * @returns The hook's result.
 */
function mountHook<T>(
  options: MaybeReadable<OptimisticValueOptions<T>>,
): UseOptimisticValueResult<T> {
  const captured: { result?: UseOptimisticValueResult<T> } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = useOptimisticValue(options)
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  mounts.push(async () => {
    await unmount(app)
    container.remove()
  })
  return result
}

/**
 * Mounts the application-owned favorite control.
 *
 * @param options - The options (or a store of them) the component passes to the hook.
 * @returns The container holding the control.
 */
function mountFavorite(options: MaybeReadable<OptimisticValueOptions<Favorite>>): {
  container: HTMLDivElement
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(FavoriteProbe, { target: container, props: { options } })
  flushSync()
  mounts.push(async () => {
    await unmount(app)
    container.remove()
  })
  return { container }
}

/**
 * Finds the control, failing the test when it is absent.
 *
 * @param container - The mounted component's container.
 * @returns The button.
 */
function requiredButton(container: ParentNode): HTMLButtonElement {
  const button = container.querySelector('button')
  if (!button) throw new Error('no button rendered')
  return button
}

/**
 * The state the hook currently shows, as React's result object reads.
 *
 * @param result - The hook's result.
 * @returns The value, pending flag and error.
 */
function shown<T>(result: UseOptimisticValueResult<T>): {
  value: T
  pending: boolean
  error: unknown
} {
  return {
    value: get(result.value),
    pending: get(result.pending),
    error: get(result.error),
  }
}

describe('useOptimisticValue', () => {
  it('saves a second tap made while the first save is still running', async () => {
    const server = manualServer()
    const { container } = mountFavorite({
      value: { favorited: false, count: 2 },
      equals: (a, b) => a.favorited === b.favorited && a.count === b.count,
      commit: server.commit,
    })

    requiredButton(container).click()
    flushSync()
    expect(requiredButton(container).getAttribute('aria-pressed')).toBe('true')
    expect(requiredButton(container).textContent).toBe('3')
    requiredButton(container).click()
    flushSync()
    expect(requiredButton(container).getAttribute('aria-pressed')).toBe('false')
    expect(requiredButton(container).textContent).toBe('2')
    expect(server.calls).toHaveLength(1)

    server.calls[0].reply.resolve({ favorited: true, count: 3 })
    await settle()
    expect(server.calls.map((call) => call.next.favorited)).toEqual([true, false])
    expect(requiredButton(container).getAttribute('aria-pressed')).toBe('false')

    server.calls[1].reply.resolve({ favorited: false, count: 2 })
    await settle()
    expect(requiredButton(container).getAttribute('data-pending')).toBe('false')
    expect(requiredButton(container).textContent).toBe('2')
  })

  it('keeps the saved value when the parent re-renders with the props it loaded first', async () => {
    const server = manualServer()
    const loaded = { favorited: false, count: 2 }
    const equals = (a: Favorite, b: Favorite): boolean =>
      a.favorited === b.favorited && a.count === b.count
    const options = writable<OptimisticValueOptions<Favorite>>({
      value: loaded,
      equals,
      commit: server.commit,
    })
    const { container } = mountFavorite(options)

    requiredButton(container).click()
    server.calls[0].reply.resolve({ favorited: true, count: 3 })
    await settle()
    options.set({ value: { favorited: false, count: 2 }, equals, commit: server.commit })
    flushSync()
    expect(requiredButton(container).getAttribute('aria-pressed')).toBe('true')
    expect(requiredButton(container).textContent).toBe('3')
  })

  it('shows a refetched value when nothing is being saved', () => {
    const server = manualServer()
    const options = writable<OptimisticValueOptions<Favorite>>({
      value: { favorited: false, count: 2 },
      commit: server.commit,
    })
    const { container } = mountFavorite(options)

    options.set({ value: { favorited: true, count: 9 }, commit: server.commit })
    flushSync()
    expect(requiredButton(container).getAttribute('aria-pressed')).toBe('true')
    expect(requiredButton(container).textContent).toBe('9')
    expect(server.commit).not.toHaveBeenCalled()
  })

  it('keeps the tap during a save when a refetch arrives, and falls back to it on failure', async () => {
    const server = manualServer()
    const options = writable<OptimisticValueOptions<Favorite>>({
      value: { favorited: false, count: 2 },
      commit: server.commit,
    })
    const { container } = mountFavorite(options)

    requiredButton(container).click()
    flushSync()
    options.set({ value: { favorited: false, count: 5 }, commit: server.commit })
    flushSync()
    expect(requiredButton(container).getAttribute('aria-pressed')).toBe('true')

    server.calls[0].reply.reject(new Error('offline'))
    await settle()
    expect(requiredButton(container).getAttribute('aria-pressed')).toBe('false')
    expect(requiredButton(container).textContent).toBe('5')
    expect(requiredButton(container).getAttribute('data-error')).toBe('Error: offline')
  })

  it('saves with the newest commit the component rendered', async () => {
    const first = vi.fn<OptimisticValueOptions<Favorite>['commit']>(async (next) => next)
    const second = vi.fn<OptimisticValueOptions<Favorite>['commit']>(async (next) => next)
    const value = { favorited: false, count: 0 }
    const options = writable<OptimisticValueOptions<Favorite>>({ value, commit: first })
    const result = mountHook(options)

    options.set({ value, commit: second })
    flushSync()
    result.update((current) => ({
      favorited: !current.favorited,
      count: current.count + (current.favorited ? -1 : 1),
    }))
    await settle()
    expect(first).not.toHaveBeenCalled()
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([{ favorited: true, count: 1 }, value])
  })

  it('counts every press of a quantity stepper and saves the newest total', async () => {
    const saves: Array<Deferred<void>> = []
    const commit = vi.fn<(next: number) => Promise<void>>((_next: number) => {
      const reply = deferred<void>()
      saves.push(reply)
      return reply.promise
    })
    const result = mountHook<number>({ value: 1, commit })

    result.update((n) => n + 1)
    result.update((n) => n + 1)
    result.update((n) => n + 1)
    expect(get(result.value)).toBe(4)
    saves[0].resolve()
    await settle()
    expect(commit.mock.calls.map((call) => call[0])).toEqual([2, 4])
    saves[1].resolve()
    await settle()
    expect(shown(result)).toMatchObject({ value: 4, pending: false, error: null })
  })

  it('uses the committed callback when a layout effect makes a change', async () => {
    const first = vi.fn<(next: number) => Promise<number>>(async (next) => next)
    const second = vi.fn<(next: number) => Promise<number>>(async (next) => next)
    const options = writable<OptimisticValueOptions<number>>({ value: 1, commit: first })
    const result = mountHook(options)

    // The options change and the change made with them land in the same step,
    // as React's commit does before its effects run.
    options.set({ value: 1, commit: second })
    result.set(2)
    await settle()
    expect(first).not.toHaveBeenCalled()
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([2, 1])
    expect(shown(result)).toMatchObject({ value: 2, pending: false, error: null })
  })

  it('uses the committed callback in a descendant layout effect', async () => {
    const first = vi.fn<(next: number) => Promise<number>>(async (next) => next)
    const second = vi.fn<(next: number) => Promise<number>>(async (next) => next)
    const options = writable<OptimisticValueOptions<number>>({ value: 1, commit: first })
    const active = writable(false)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const app = mount(OptimisticValueParentProbe, {
      target: container,
      props: { options, active },
    })
    flushSync()
    mounts.push(async () => {
      await unmount(app)
      container.remove()
    })

    options.set({ value: 1, commit: second })
    active.set(true)
    flushSync()
    await settle()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([2, 1])
  })

  it('does not duplicate saves or replace saved props in StrictMode with an inline comparator', async () => {
    const commit = vi.fn<OptimisticValueOptions<Favorite>['commit']>(async (next) => next)
    const options = writable<OptimisticValueOptions<Favorite>>({
      value: { favorited: false, count: 2 },
      equals: (a, b) => a.favorited === b.favorited && a.count === b.count,
      commit,
    })
    const result = mountHook(options)

    expect(commit).not.toHaveBeenCalled()
    result.update((current) => ({
      favorited: !current.favorited,
      count: current.count + 1,
    }))
    await settle()
    // Another update with the same server value and a fresh inline comparator:
    // a component update must not save again or drop the saved value.
    options.set({
      value: { favorited: false, count: 2 },
      equals: (a, b) => a.favorited === b.favorited && a.count === b.count,
      commit,
    })
    flushSync()
    expect(commit).toHaveBeenCalledTimes(1)
    expect(shown(result)).toMatchObject({
      value: { favorited: true, count: 3 },
      pending: false,
      error: null,
    })
  })

  it('does not show a superseded save error when the next tap matches the server', async () => {
    const reply = deferred<boolean>()
    const onError = vi.fn<(error: unknown, value: boolean) => void>()
    const commit = vi.fn<(next: boolean) => Promise<boolean>>(() => reply.promise)
    const result = mountHook<boolean>({ value: false, commit, onError })

    result.update((on) => !on)
    result.update((on) => !on)
    reply.reject(new Error('old request failed'))
    await settle()
    expect(shown(result)).toMatchObject({ value: false, pending: false, error: null })
    expect(onError).not.toHaveBeenCalled()
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('keeps confirmed progress when a later request in the same commit fails', async () => {
    const reply = deferred<void>()
    const failure = new Error('second request failed')
    type Flags = { first: boolean; second: boolean }
    const commit: OptimisticValueOptions<Flags>['commit'] = async (
      _next,
      _previous,
      confirm,
    ): Promise<void> => {
      confirm((current) => ({ ...current, first: true }))
      await reply.promise
    }
    const result = mountHook<Flags>({
      value: { first: false, second: false },
      commit,
    })

    result.set({ first: true, second: true })
    await settle()
    reply.reject(failure)
    await settle()
    expect(shown(result)).toMatchObject({
      value: { first: true, second: false },
      pending: false,
      error: failure,
    })
  })
})
