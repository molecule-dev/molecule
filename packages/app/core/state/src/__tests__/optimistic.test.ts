import { describe, expect, it, vi } from 'vitest'

import { createOptimisticValue } from '../optimistic.js'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** A server whose saves finish only when the test says so, recording what it was sent. */
const manualServer = <T>() => {
  const calls: Array<{ next: T; previous: T; reply: Deferred<T | void> }> = []
  let running = 0
  let mostAtOnce = 0
  const commit = vi.fn(async (next: T, previous: T) => {
    const reply = deferred<T | void>()
    calls.push({ next, previous, reply })
    running += 1
    mostAtOnce = Math.max(mostAtOnce, running)
    try {
      return await reply.promise
    } finally {
      running -= 1
    }
  })
  return { calls, commit, mostAtOnce: () => mostAtOnce }
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i += 1) await Promise.resolve()
}

describe('createOptimisticValue', () => {
  it('shows a change at once and saves it', async () => {
    const server = manualServer<boolean>()
    const value = createOptimisticValue({ value: false, commit: server.commit })

    value.set(true)
    expect(value.getState()).toEqual({ value: true, pending: true, error: null })
    expect(server.calls.map((call) => [call.next, call.previous])).toEqual([[true, false]])

    server.calls[0].reply.resolve(undefined)
    expect(await value.settled()).toEqual({ value: true, pending: false, error: null })
  })

  it('saves a second tap made during the first save, after it, in order', async () => {
    const server = manualServer<boolean>()
    const value = createOptimisticValue({ value: false, commit: server.commit })

    value.update((on) => !on)
    value.update((on) => !on)
    expect(value.getState().value).toBe(false)
    expect(value.getState().pending).toBe(true)
    expect(server.calls).toHaveLength(1)

    server.calls[0].reply.resolve(true)
    await flush()
    expect(server.calls.map((call) => [call.next, call.previous])).toEqual([
      [true, false],
      [false, true],
    ])
    expect(value.getState()).toEqual({ value: false, pending: true, error: null })

    server.calls[1].reply.resolve(false)
    expect(await value.settled()).toEqual({ value: false, pending: false, error: null })
    expect(server.mostAtOnce()).toBe(1)
  })

  it('saves only the newest of several changes made during one save', async () => {
    const server = manualServer<number>()
    const quantity = createOptimisticValue({ value: 1, commit: server.commit })

    quantity.update((n) => n + 1)
    quantity.update((n) => n + 1)
    quantity.update((n) => n + 1)
    expect(quantity.getState().value).toBe(4)

    server.calls[0].reply.resolve(2)
    await flush()
    expect(server.calls.map((call) => call.next)).toEqual([2, 4])
    server.calls[1].reply.resolve(4)
    expect((await quantity.settled()).value).toBe(4)
  })

  it('sends nothing more when the newest change matches what the server saved', async () => {
    const server = manualServer<boolean>()
    const value = createOptimisticValue({ value: false, commit: server.commit })

    value.set(true)
    value.set(false)
    value.set(true)
    server.calls[0].reply.resolve(undefined)
    expect(await value.settled()).toEqual({ value: true, pending: false, error: null })
    expect(server.commit).toHaveBeenCalledTimes(1)
  })

  it('shows the server value a save returns', async () => {
    interface Favorite {
      favorited: boolean
      count: number
    }
    const server = manualServer<Favorite>()
    const favorite = createOptimisticValue<Favorite>({
      value: { favorited: false, count: 4 },
      equals: (a, b) => a.favorited === b.favorited,
      commit: server.commit,
    })

    favorite.update((current) => ({
      favorited: !current.favorited,
      count: current.count + (current.favorited ? -1 : 1),
    }))
    expect(favorite.getState().value).toEqual({ favorited: true, count: 5 })
    server.calls[0].reply.resolve({ favorited: true, count: 7 })
    expect((await favorite.settled()).value).toEqual({ favorited: true, count: 7 })
  })

  it('goes back to the server value and reports the error when the newest change fails', async () => {
    const server = manualServer<boolean>()
    const onError = vi.fn()
    const value = createOptimisticValue({ value: false, commit: server.commit, onError })

    value.set(true)
    const failure = new Error('401')
    server.calls[0].reply.reject(failure)
    expect(await value.settled()).toEqual({ value: false, pending: false, error: failure })
    expect(onError).toHaveBeenCalledWith(failure, false)

    value.set(true)
    expect(value.getState().error).toBeNull()
  })

  it('saves a newer change after an older one fails, without showing the old failure', async () => {
    const server = manualServer<number>()
    const onError = vi.fn()
    const rating = createOptimisticValue({ value: 0, commit: server.commit, onError })

    rating.set(3)
    rating.set(5)
    server.calls[0].reply.reject(new Error('timeout'))
    await flush()
    expect(rating.getState()).toEqual({ value: 5, pending: true, error: null })
    expect(server.calls.map((call) => [call.next, call.previous])).toEqual([
      [3, 0],
      [5, 0],
    ])

    server.calls[1].reply.resolve(undefined)
    expect(await rating.settled()).toEqual({ value: 5, pending: false, error: null })
    expect(onError).not.toHaveBeenCalled()
  })

  it('keeps the shown value while a save runs when a refetch brings older data', async () => {
    const server = manualServer<boolean>()
    const value = createOptimisticValue({ value: false, commit: server.commit })

    value.set(true)
    value.sync(false)
    expect(value.getState()).toEqual({ value: true, pending: true, error: null })

    server.calls[0].reply.resolve(true)
    expect((await value.settled()).value).toBe(true)
  })

  it('takes a new server value when nothing is being saved', () => {
    const value = createOptimisticValue({ value: false, commit: vi.fn() })
    const seen: boolean[] = []
    value.subscribe((state) => seen.push(state.value))

    value.sync(true)
    expect(value.getState()).toEqual({ value: true, pending: false, error: null })
    expect(seen).toEqual([true])
  })

  it('does not save a change to the value the server already holds', () => {
    const commit = vi.fn(async () => undefined)
    const value = createOptimisticValue({ value: true, commit })

    value.set(true)
    expect(commit).not.toHaveBeenCalled()
    expect(value.getState().pending).toBe(false)
  })

  it('returns the same state object until something changes', () => {
    const value = createOptimisticValue({ value: 'daily', commit: vi.fn(async () => undefined) })
    const first = value.getState()
    value.sync('daily')
    expect(value.getState()).toBe(first)
    value.set('weekly')
    expect(value.getState()).not.toBe(first)
  })
})
