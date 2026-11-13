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

  it('cancel sets rejected with the given message', () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>

    scope.run(() => {
      ;[state] = usePromise(async () => 'hello')
    })

    state.cancel('User cancelled')

    expect(state.status).toBe('rejected')
    expect(state.value).toBeNull()
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error!.message).toBe('User cancelled')

    scope.stop()
  })

  it('cancel without a message leaves the error null (React parity)', () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>

    scope.run(() => {
      ;[state] = usePromise(async () => 'hello')
    })

    state.cancel()

    expect(state.status).toBe('rejected')
    expect(state.error).toBeNull()

    scope.stop()
  })

  it('reset clears state to idle', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<string>
    let call!: () => Promise<string>

    scope.run(() => {
      ;[state, call] = usePromise(async () => 'hello')
    })

    await call()
    expect(state.status).toBe('resolved')
    expect(state.value).toBe('hello')

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

  it('multiple calls — latest result wins', async () => {
    const scope = effectScope()
    let state!: UsePromiseState<number>
    let call!: () => Promise<number>
    const resolvers: Array<(value: number) => void> = []

    scope.run(() => {
      ;[state, call] = usePromise(
        () =>
          new Promise<number>((r) => {
            resolvers.push(r)
          }),
      )
    })

    void call()
    const promise2 = call()

    // Resolve the first call (stale)
    resolvers[0](1)
    await flush()

    // Status should still be pending because call 2 is the current one
    expect(state.status).toBe('pending')
    expect(state.value).toBeNull()

    // Resolve the second call (current)
    resolvers[1](2)
    await promise2

    expect(state.status).toBe('resolved')
    expect(state.value).toBe(2)

    scope.stop()
  })

  it('scope stop (unmount) prevents state updates', async () => {
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
    resolve('hello')
    await promise

    // State should not have been updated after disposal
    expect(state.status).toBe('pending')
    expect(state.value).toBeNull()
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
