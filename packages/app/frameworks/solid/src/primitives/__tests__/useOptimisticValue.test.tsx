import { createRenderEffect, createRoot, createSignal } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'

import type { OptimisticValueOptions } from '@molecule/app-state'

import { useOptimisticValue, type UseOptimisticValueResult } from '../optimistic-value.js'

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

const deferred = <T,>(): Deferred<T> => {
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

const favoriteEquals = (a: Favorite, b: Favorite): boolean =>
  a.favorited === b.favorited && a.count === b.count

/**
 * Saves a change on a server whose replies finish when the test says so.
 *
 * @returns The deferred replies, in call order, and the commit function.
 */
const manualServer = () => {
  const calls: Array<{ next: Favorite; reply: Deferred<Favorite> }> = []
  const commit = vi.fn((next: Favorite) => {
    const reply = deferred<Favorite>()
    calls.push({ next, reply })
    return reply.promise
  })
  return { calls, commit }
}

/** Mounts the primitive in a reactive root and keeps its disposal. */
function mountOptimistic<T>(options: () => OptimisticValueOptions<T>) {
  let favorite!: UseOptimisticValueResult<T>
  const dispose = createRoot((disposeRoot) => {
    favorite = useOptimisticValue(options)
    return disposeRoot
  })
  return { favorite, dispose }
}

const toggleFavorite = (current: Favorite): Favorite => ({
  favorited: !current.favorited,
  count: current.count + (current.favorited ? -1 : 1),
})

describe('useOptimisticValue', () => {
  it('saves a second tap made while the first save is still running', async () => {
    const server = manualServer()
    const { favorite, dispose } = mountOptimistic<Favorite>(() => ({
      value: { favorited: false, count: 2 },
      equals: favoriteEquals,
      commit: server.commit,
    }))

    favorite.update(toggleFavorite)
    expect(favorite.value().favorited).toBe(true)
    expect(favorite.value().count).toBe(3)
    favorite.update(toggleFavorite)
    expect(favorite.value().favorited).toBe(false)
    expect(favorite.value().count).toBe(2)
    expect(server.calls).toHaveLength(1)

    server.calls[0].reply.resolve({ favorited: true, count: 3 })
    await flush()
    expect(server.calls.map((call) => call.next.favorited)).toEqual([true, false])
    expect(favorite.value().favorited).toBe(false)

    server.calls[1].reply.resolve({ favorited: false, count: 2 })
    await flush()
    expect(favorite.pending()).toBe(false)
    expect(favorite.value()).toEqual({ favorited: false, count: 2 })

    dispose()
  })

  it('keeps the saved value when the parent re-renders with the props it loaded first', async () => {
    const server = manualServer()
    const loaded = { favorited: false, count: 2 }
    const [serverValue, setServerValue] = createSignal<Favorite>(loaded)
    const { favorite, dispose } = mountOptimistic<Favorite>(() => ({
      value: serverValue(),
      equals: favoriteEquals,
      commit: server.commit,
    }))

    favorite.update(toggleFavorite)
    server.calls[0].reply.resolve({ favorited: true, count: 3 })
    await flush()

    // The parent re-renders with the props it loaded first.
    setServerValue({ favorited: false, count: 2 })
    expect(favorite.value().favorited).toBe(true)
    expect(favorite.value().count).toBe(3)

    dispose()
  })

  it('shows a refetched value when nothing is being saved', () => {
    const server = manualServer()
    const [serverValue, setServerValue] = createSignal<Favorite>({ favorited: false, count: 2 })
    const { favorite, dispose } = mountOptimistic<Favorite>(() => ({
      value: serverValue(),
      equals: favoriteEquals,
      commit: server.commit,
    }))

    setServerValue({ favorited: true, count: 9 })
    expect(favorite.value().favorited).toBe(true)
    expect(favorite.value().count).toBe(9)
    expect(server.commit).not.toHaveBeenCalled()

    dispose()
  })

  it('keeps the tap during a save when a refetch arrives, and falls back to it on failure', async () => {
    const server = manualServer()
    const [serverValue, setServerValue] = createSignal<Favorite>({ favorited: false, count: 2 })
    const { favorite, dispose } = mountOptimistic<Favorite>(() => ({
      value: serverValue(),
      equals: favoriteEquals,
      commit: server.commit,
    }))

    favorite.update(toggleFavorite)
    setServerValue({ favorited: false, count: 5 })
    expect(favorite.value().favorited).toBe(true)

    server.calls[0].reply.reject(new Error('offline'))
    await flush()
    expect(favorite.value().favorited).toBe(false)
    expect(favorite.value().count).toBe(5)
    expect(String(favorite.error())).toBe('Error: offline')

    dispose()
  })

  it('saves with the newest commit the component rendered', async () => {
    const first = vi.fn(async (next: Favorite) => next)
    const second = vi.fn(async (next: Favorite) => next)
    const value = { favorited: false, count: 0 }
    const [serverCommit, setServerCommit] = createSignal(first)
    const { favorite, dispose } = mountOptimistic<Favorite>(() => ({
      value,
      equals: favoriteEquals,
      commit: serverCommit(),
    }))

    // The component re-renders with a new commit function (wrapped, because a
    // function passed to a Solid setter is read as an updater).
    setServerCommit(() => second)

    favorite.update(toggleFavorite)
    await flush()
    expect(first).not.toHaveBeenCalled()
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([{ favorited: true, count: 1 }, value])

    dispose()
  })

  it('counts every press of a quantity stepper and saves the newest total', async () => {
    const saves: Array<Deferred<void>> = []
    const commit = vi.fn((_next: number) => {
      const reply = deferred<void>()
      saves.push(reply)
      return reply.promise
    })
    const { favorite, dispose } = mountOptimistic<number>(() => ({ value: 1, commit }))

    favorite.update((n) => n + 1)
    favorite.update((n) => n + 1)
    favorite.update((n) => n + 1)
    expect(favorite.value()).toBe(4)
    saves[0].resolve()
    await flush()
    expect(commit.mock.calls.map((call) => call[0])).toEqual([2, 4])
    saves[1].resolve()
    await flush()
    expect(favorite.value()).toBe(4)
    expect(favorite.pending()).toBe(false)
    expect(favorite.error()).toBeNull()

    dispose()
  })

  it('uses the committed callback when a layout effect makes a change', async () => {
    const first = vi.fn(async (next: number) => next)
    const second = vi.fn(async (next: number) => next)
    const [serverCommit, setServerCommit] = createSignal(first)

    let favorite!: UseOptimisticValueResult<number>
    const dispose = createRoot((disposeRoot) => {
      favorite = useOptimisticValue(() => ({ value: 1, commit: serverCommit() }))
      // A render (layout) effect, which runs before the hook's own effect.
      createRenderEffect(() => {
        if (serverCommit() === second) favorite.set(2)
      })
      return disposeRoot
    })

    setServerCommit(() => second)
    await flush()
    expect(first).not.toHaveBeenCalled()
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([2, 1])
    expect(favorite.value()).toBe(2)
    expect(favorite.pending()).toBe(false)
    expect(favorite.error()).toBeNull()

    dispose()
  })

  it('uses the committed callback in a descendant layout effect', async () => {
    const first = vi.fn(async (next: number) => next)
    const second = vi.fn(async (next: number) => next)
    const [serverCommit, setServerCommit] = createSignal(first)
    const [active, setActive] = createSignal(false)

    const Child = (props: { set: (next: number) => void; active: () => boolean }): void => {
      createRenderEffect(() => {
        if (props.active()) props.set(2)
      })
    }
    const Parent = (): void => {
      const favorite = useOptimisticValue(() => ({ value: 1, commit: serverCommit() }))
      Child({ set: favorite.set, active })
    }

    const dispose = createRoot((disposeRoot) => {
      Parent()
      return disposeRoot
    })

    setServerCommit(() => second)
    setActive(true)
    await flush()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(second.mock.calls[0]?.slice(0, 2)).toEqual([2, 1])

    dispose()
  })

  it('does not duplicate saves or replace saved props in StrictMode with an inline comparator', async () => {
    const commit = vi.fn(async (next: Favorite) => next)
    const [serverValue, setServerValue] = createSignal<Favorite>({ favorited: false, count: 2 })
    const { favorite, dispose } = mountOptimistic<Favorite>(() => ({
      value: serverValue(),
      equals: (a, b) => a.favorited === b.favorited && a.count === b.count,
      commit,
    }))

    expect(commit).not.toHaveBeenCalled()
    favorite.update((current) => ({
      favorited: !current.favorited,
      count: current.count + 1,
    }))
    await flush()

    // The parent re-renders with the same props it first loaded.
    setServerValue({ favorited: false, count: 2 })

    expect(commit).toHaveBeenCalledTimes(1)
    expect(favorite.value()).toEqual({ favorited: true, count: 3 })
    expect(favorite.pending()).toBe(false)
    expect(favorite.error()).toBeNull()

    dispose()
  })

  it('does not show a superseded save error when the next tap matches the server', async () => {
    const reply = deferred<boolean>()
    const onError = vi.fn()
    const commit = vi.fn(() => reply.promise)
    const { favorite, dispose } = mountOptimistic<boolean>(() => ({
      value: false,
      commit,
      onError,
    }))

    favorite.update((on) => !on)
    favorite.update((on) => !on)
    reply.reject(new Error('old request failed'))
    await flush()
    expect(favorite.value()).toBe(false)
    expect(favorite.pending()).toBe(false)
    expect(favorite.error()).toBeNull()
    expect(onError).not.toHaveBeenCalled()
    expect(commit).toHaveBeenCalledTimes(1)

    dispose()
  })

  it('keeps confirmed progress when a later request in the same commit fails', async () => {
    const reply = deferred<void>()
    const failure = new Error('second request failed')
    type Flags = { first: boolean; second: boolean }
    const { favorite, dispose } = mountOptimistic<Flags>(() => ({
      value: { first: false, second: false },
      commit: async (_next, _previous, confirm?: (change: (current: Flags) => Flags) => void) => {
        confirm?.((current) => ({ ...current, first: true }))
        await reply.promise
      },
    }))

    favorite.set({ first: true, second: true })
    reply.reject(failure)
    await flush()
    expect(favorite.value()).toEqual({ first: true, second: false })
    expect(favorite.pending()).toBe(false)
    expect(favorite.error()).toBe(failure)

    dispose()
  })
})
