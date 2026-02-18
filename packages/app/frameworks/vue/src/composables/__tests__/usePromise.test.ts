import { describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { usePromise, type UsePromiseReturn } from '../usePromise.js'

const flush = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0))

describe('usePromise', () => {
  it('initial state is idle with null value and error', () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<string>
    scope.run(() => {
      result = usePromise(async () => 'hello')
    })

    expect(result.status.value).toBe('idle')
    expect(result.value.value).toBeNull()
    expect(result.error.value).toBeNull()

    scope.stop()
  })

  it('sets pending on call, then resolved on success', async () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<string>
    let resolve!: (value: string) => void
    const asyncFn = (): Promise<string> =>
      new Promise<string>((r) => {
        resolve = r
      })

    scope.run(() => {
      result = usePromise(asyncFn)
    })

    const promise = result.call()
    expect(result.status.value).toBe('pending')
    expect(result.value.value).toBeNull()

    resolve('hello')
    await promise

    expect(result.status.value).toBe('resolved')
    expect(result.value.value).toBe('hello')
    expect(result.error.value).toBeNull()

    scope.stop()
  })

  it('sets pending on call, then rejected on error', async () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<string>
    const error = new Error('test error')

    scope.run(() => {
      result = usePromise(async () => {
        throw error
      })
    })

    await expect(result.call()).rejects.toThrow('test error')

    expect(result.status.value).toBe('rejected')
    expect(result.value.value).toBeNull()
    expect(result.error.value).toBe(error)

    scope.stop()
  })

  it('cancel sets rejected with cancellation error', () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<string>

    scope.run(() => {
      result = usePromise(async () => 'hello')
    })

    result.cancel('User cancelled')

    expect(result.status.value).toBe('rejected')
    expect(result.value.value).toBeNull()
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('User cancelled')

    scope.stop()
  })

  it('cancel uses default message when none provided', () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<string>

    scope.run(() => {
      result = usePromise(async () => 'hello')
    })

    result.cancel()

    expect(result.error.value!.message).toBe('Cancelled')

    scope.stop()
  })

  it('reset clears state to idle', async () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<string>

    scope.run(() => {
      result = usePromise(async () => 'hello')
    })

    await result.call()
    expect(result.status.value).toBe('resolved')
    expect(result.value.value).toBe('hello')

    result.reset()

    expect(result.status.value).toBe('idle')
    expect(result.value.value).toBeNull()
    expect(result.error.value).toBeNull()

    scope.stop()
  })

  it('multiple calls — latest result wins', async () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<number>
    const resolvers: Array<(value: number) => void> = []

    scope.run(() => {
      result = usePromise(
        () =>
          new Promise<number>((r) => {
            resolvers.push(r)
          }),
      )
    })

    void result.call()
    const promise2 = result.call()

    // Resolve the first call (stale)
    resolvers[0](1)
    await flush()

    // Status should still be pending because call 2 is the current one
    expect(result.status.value).toBe('pending')
    expect(result.value.value).toBeNull()

    // Resolve the second call (current)
    resolvers[1](2)
    await promise2

    expect(result.status.value).toBe('resolved')
    expect(result.value.value).toBe(2)

    scope.stop()
  })

  it('scope stop (unmount) prevents state updates', async () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<string>
    let resolve!: (value: string) => void

    scope.run(() => {
      result = usePromise(
        () =>
          new Promise<string>((r) => {
            resolve = r
          }),
      )
    })

    const promise = result.call()
    expect(result.status.value).toBe('pending')

    // Stop the scope (simulates unmount)
    scope.stop()

    // Resolve after unmount
    resolve('hello')
    await promise

    // State should not have been updated after disposal
    expect(result.status.value).toBe('pending')
    expect(result.value.value).toBeNull()
  })

  it('passes arguments through to the async function', async () => {
    const scope = effectScope()
    const fn = vi.fn(async (a: number, b: number) => a + b)
    let result!: UsePromiseReturn<number>

    scope.run(() => {
      result = usePromise(fn)
    })

    const value = await result.call(3, 4)

    expect(fn).toHaveBeenCalledWith(3, 4)
    expect(value).toBe(7)
    expect(result.value.value).toBe(7)

    scope.stop()
  })

  it('preserves previous value during pending state', async () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<string>
    let resolve!: (value: string) => void

    scope.run(() => {
      result = usePromise(async () => 'first')
    })

    // First call resolves
    await result.call()
    expect(result.value.value).toBe('first')

    // Second call starts — value should be preserved during pending
    usePromise(
      () =>
        new Promise<string>((r) => {
          resolve = r
        }),
    )
    // Actually re-test with original
    scope.stop()

    const scope2 = effectScope()
    scope2.run(() => {
      result = usePromise(
        () =>
          new Promise<string>((r) => {
            resolve = r
          }),
      )
    })

    // Resolve first call
    const p1 = result.call()
    resolve('first')
    await p1

    expect(result.value.value).toBe('first')

    // Start second call — value preserved while pending
    // We need a new composable that allows separate resolvers
    scope2.stop()

    const scope3 = effectScope()
    const resolvers3: Array<(value: string) => void> = []
    scope3.run(() => {
      result = usePromise(
        () =>
          new Promise<string>((r) => {
            resolvers3.push(r)
          }),
      )
    })

    const p3a = result.call()
    resolvers3[0]('first')
    await p3a

    expect(result.value.value).toBe('first')

    // Start another call — previous value should be preserved during pending
    result.call()
    expect(result.status.value).toBe('pending')
    expect(result.value.value).toBe('first')

    scope3.stop()
  })

  it('converts non-Error thrown values to Error objects', async () => {
    const scope = effectScope()
    let result!: UsePromiseReturn<string>

    scope.run(() => {
      result = usePromise(async () => {
        throw 'string error'
      })
    })

    await expect(result.call()).rejects.toThrow('string error')
    expect(result.error.value).toBeInstanceOf(Error)
    expect(result.error.value!.message).toBe('string error')

    scope.stop()
  })
})
