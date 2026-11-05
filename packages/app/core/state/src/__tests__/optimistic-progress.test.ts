import { describe, expect, it, vi } from 'vitest'

import { createOptimisticValue } from '../optimistic.js'

type Flags = { a: boolean; b: boolean }
type Confirm = (change: (current: Flags) => Flags) => void

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

describe('optimistic commits with independently saved records', () => {
  it('keeps an acknowledged record when the rest of the newest commit fails', async () => {
    const gate = deferred()
    const failure = new Error('b failed')
    const onError = vi.fn()
    const flags = createOptimisticValue<Flags>({
      value: { a: false, b: false },
      commit: async (_next, _previous, confirm?: Confirm) => {
        confirm?.((current) => ({ ...current, a: true }))
        await gate.promise
        throw failure
      },
      onError,
    })
    flags.set({ a: true, b: true })
    expect(flags.getState().value).toEqual({ a: true, b: true })
    gate.resolve()
    const result = await flags.settled()
    expect(result).toEqual({ value: { a: true, b: false }, pending: false, error: failure })
    expect(onError).toHaveBeenCalledWith(failure, { a: true, b: false })
  })

  it('retries newer intent against partial server success instead of skipping its undo', async () => {
    const gate = deferred()
    let server = { a: false, b: false }
    let calls = 0
    const onError = vi.fn()
    const flags = createOptimisticValue<Flags>({
      value: server,
      commit: async (next, previous, confirm?: Confirm) => {
        calls += 1
        if (next.a !== previous.a) {
          server = { ...server, a: next.a }
          confirm?.((current) => ({ ...current, a: next.a }))
        }
        if (calls === 1) {
          await gate.promise
          throw new Error('b failed')
        }
      },
      onError,
    })
    flags.set({ a: true, b: true })
    flags.set({ a: false, b: false })
    gate.resolve()
    await flags.settled()
    expect(server).toEqual({ a: false, b: false })
    expect(flags.getState()).toEqual({ value: server, pending: false, error: null })
    expect(calls).toBe(2)
    expect(onError).not.toHaveBeenCalled()
  })

  it('preserves newly refetched fields when progress acknowledges only one record', async () => {
    const gate = deferred()
    let acknowledge: Confirm | undefined
    const flags = createOptimisticValue<Flags>({
      value: { a: false, b: false },
      commit: async (_next, _previous, confirm?: Confirm) => {
        acknowledge = confirm
        await gate.promise
        confirm?.((current) => ({ ...current, a: true }))
      },
    })
    flags.set({ a: true, b: false })
    flags.sync({ a: false, b: true })
    expect(flags.getState().value).toEqual({ a: true, b: false })
    gate.resolve()
    await flags.settled()
    expect(flags.getState().value).toEqual({ a: true, b: true })
    // A callback kept by a finished request cannot change the next rollback point.
    acknowledge?.(() => ({ a: false, b: false }))
    expect(flags.getState().value).toEqual({ a: true, b: true })
  })

  it('an atomic failure with no acknowledged progress still rolls back the whole value', async () => {
    const failure = new Error('atomic failure')
    const flags = createOptimisticValue<Flags>({
      value: { a: false, b: false },
      commit: async () => {
        throw failure
      },
    })
    flags.set({ a: true, b: true })
    expect(await flags.settled()).toEqual({
      value: { a: false, b: false },
      pending: false,
      error: failure,
    })
  })
})
