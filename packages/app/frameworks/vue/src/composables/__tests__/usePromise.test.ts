import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { usePromise, type UsePromiseState } from '../usePromise.js'

const flush = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0))

describe('usePromise', () => {
  it('initial state is idle with null value and error', () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    scope.run(() => {
      ;[state] = usePromise(async () => 'hello')
    })

    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()

    scope.stop()
  })

  it('sets pending on call, then resolved on success', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>
    let resolve!: (value: string) => void
    const asyncFn = (): Promise<string> =>
      new Promise<string>((r) => {
        resolve = r
      })

    scope.run(() => {
      ;[state, call] = usePromise(asyncFn)
    })

    const promise = call()
    expect(state.status).toBe('pending')
    expect(state.value).toBeNull()

    resolve('hello')
    await promise

    expect(state.status).toBe('resolved')
    expect(state.value).toBe('hello')
    expect(state.error).toBeNull()

    scope.stop()
  })

  it('sets pending on call, then rejected on error', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>
    const error = new Error('test error')

    scope.run(() => {
      ;[state, call] = usePromise(async () => {
        throw error
      })
    })

    await expect(call()).rejects.toThrow('test error')

    expect(state.status).toBe('rejected')
    expect(state.value).toBeNull()
    expect(state.error).toBe(error)

    scope.stop()
  })

  it('cancel sets status to rejected with error message', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>
    let resolve!: (value: string) => void

    scope.run(() => {
      ;[state, call] = usePromise(
        () =>
          new Promise<string>((r) => {
            resolve = r
          }),
      )
    })

    void call()
    expect(state.status).toBe('pending')

    state.cancel('User cancelled')

    expect(state.status).toBe('rejected')
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error!.message).toBe('User cancelled')

    // A result from the cancelled call is ignored.
    resolve('should be ignored')
    await flush()

    expect(state.status).toBe('rejected')
    expect(state.value).toBeNull()

    scope.stop()
  })

  it('cancel without message sets rejected with null error', () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>

    scope.run(() => {
      ;[state, call] = usePromise(() => new Promise<string>(() => {}))
    })

    void call()
    state.cancel()

    expect(state.status).toBe('rejected')
    expect(state.error).toBeNull()

    scope.stop()
  })

  it('reset clears state back to idle', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>

    scope.run(() => {
      ;[state, call] = usePromise(async () => 'data')
    })

    await call()
    expect(state.status).toBe('resolved')
    expect(state.value).toBe('data')

    state.reset()

    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()

    scope.stop()
  })

  it('reset while a call is pending lets its result land (React parity)', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>
    let resolve!: (value: string) => void

    scope.run(() => {
      ;[state, call] = usePromise(
        () =>
          new Promise<string>((r) => {
            resolve = r
          }),
      )
    })

    const promise = call()
    expect(state.status).toBe('pending')

    state.reset()
    expect(state.status).toBe('idle')

    resolve('late')
    await promise

    expect(state.status).toBe('resolved')
    expect(state.value).toBe('late')

    scope.stop()
  })

  it('multiple calls - only latest result is used (stale calls ignored)', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: (id: string) => Promise<string>
    const resolvers: Array<(value: string) => void> = []

    scope.run(() => {
      ;[state, call] = usePromise(
        (_id: string) =>
          new Promise<string>((r) => {
            resolvers.push(r)
          }),
      )
    })

    // Start the first call, then the second — the first is now stale.
    void call('first')
    const promise2 = call('second')

    expect(state.status).toBe('pending')

    // A result from the stale first call is ignored.
    resolvers[0]('first-result')
    await flush()

    expect(state.value).toBeNull()
    expect(state.status).toBe('pending')

    // The latest call's result is applied.
    resolvers[1]('second-result')
    await promise2

    expect(state.status).toBe('resolved')
    expect(state.value).toBe('second-result')

    scope.stop()
  })

  it('unmount prevents state updates', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>
    let resolve!: (value: string) => void

    scope.run(() => {
      ;[state, call] = usePromise(
        () =>
          new Promise<string>((r) => {
            resolve = r
          }),
      )
    })

    const promise = call()
    expect(state.status).toBe('pending')

    // Stop the scope (simulates unmount)
    scope.stop()

    // Resolve after unmount
    resolve('after unmount')
    await promise
    await flush()

    // State should not have been updated after disposal
    expect(state.status).toBe('pending')
    expect(state.value).toBeNull()
  })

  it('returns the resolved value from the wrapped function', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<number>
    let call!: () => Promise<number>

    scope.run(() => {
      ;[state, call] = usePromise(async () => 42)
    })

    const returnedValue = await call()

    expect(returnedValue).toBe(42)
    expect(state.value).toBe(42)

    scope.stop()
  })

  it('passes arguments through to the async function', async () => {
    const scope = effectScope()
    const fn = vi.fn(async (a: number, b: number) => a + b)
    let state!: UsePromiseState<number>
    let call!: (a: number, b: number) => Promise<number>

    scope.run(() => {
      ;[state, call] = usePromise(fn)
    })

    const value = await call(3, 4)

    expect(fn).toHaveBeenCalledWith(3, 4)
    expect(value).toBe(7)
    expect(state.value).toBe(7)

    scope.stop()
  })

  it('preserves the previous value while a newer call is pending', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>
    const resolvers: Array<(value: string) => void> = []

    scope.run(() => {
      ;[state, call] = usePromise(
        () =>
          new Promise<string>((r) => {
            resolvers.push(r)
          }),
      )
    })

    const first = call()
    resolvers[0]('first')
    await first

    expect(state.value).toBe('first')

    // Start another call — previous value should be preserved during pending
    void call()
    expect(state.status).toBe('pending')
    expect(state.value).toBe('first')

    scope.stop()
  })

  it('converts non-Error thrown values to Error objects', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>

    scope.run(() => {
      ;[state, call] = usePromise(async () => {
        throw 'string error'
      })
    })

    await expect(call()).rejects.toThrow('string error')
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error!.message).toBe('string error')

    scope.stop()
  })
})
