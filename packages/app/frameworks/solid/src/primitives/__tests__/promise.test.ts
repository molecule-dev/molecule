import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'

import { createPromise, usePromise, type UsePromiseState } from '../promise.js'

const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/** Mounts `usePromise` in a reactive root and keeps its disposal. */
function mountPromise<V, A extends unknown[]>(asyncFn: (...args: A) => Promise<V>) {
  let tuple!: [UsePromiseState<V>, (...args: A) => Promise<V>]
  const dispose = createRoot((disposeRoot) => {
    tuple = usePromise(asyncFn)
    return disposeRoot
  })
  return { tuple, dispose }
}

describe('createPromise', () => {
  it('has idle initial state with null value and error', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state } = createPromise(async () => 'hello')

        expect(state()).toEqual({
          status: 'idle',
          value: null,
          error: null,
        })

        dispose()
        resolve()
      })
    })
  })

  it('sets pending on call then resolved on success', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const asyncFn = vi.fn(async (x: number) => x * 2)
        const { state, call } = createPromise(asyncFn)

        const promise = call(5)

        expect(state().status).toBe('pending')
        expect(state().value).toBeNull()
        expect(state().error).toBeNull()

        const result = await promise

        expect(result).toBe(10)
        expect(state().status).toBe('resolved')
        expect(state().value).toBe(10)
        expect(state().error).toBeNull()
        expect(asyncFn).toHaveBeenCalledWith(5)

        dispose()
        resolve()
      })
    })
  })

  it('sets pending on call then rejected on error', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const error = new Error('boom')
        const asyncFn = vi.fn(async () => {
          throw error
        })
        const { state, call } = createPromise(asyncFn)

        const promise = call()

        expect(state().status).toBe('pending')

        try {
          await promise
        } catch (_error) {
          // expected — test asserts the rejected state below; swallowing is safe here
        }

        expect(state().status).toBe('rejected')
        expect(state().value).toBeNull()
        expect(state().error).toBe(error)

        dispose()
        resolve()
      })
    })
  })

  it('cancel sets rejected with optional message', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, cancel } = createPromise(async () => 'value')

        cancel('user cancelled')

        expect(state().status).toBe('rejected')
        expect(state().value).toBeNull()
        expect(state().error).toBeInstanceOf(Error)
        expect(state().error!.message).toBe('user cancelled')

        dispose()
        resolve()
      })
    })
  })

  it('cancel without message sets null error', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, cancel } = createPromise(async () => 'value')

        cancel()

        expect(state().status).toBe('rejected')
        expect(state().error).toBeNull()

        dispose()
        resolve()
      })
    })
  })

  it('reset clears to idle', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const { state, call, reset } = createPromise(async () => 42)

        await call()

        expect(state().status).toBe('resolved')
        expect(state().value).toBe(42)

        reset()

        expect(state().status).toBe('idle')
        expect(state().value).toBeNull()
        expect(state().error).toBeNull()

        dispose()
        resolve()
      })
    })
  })

  it('multiple calls — latest result wins', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        let resolveFirst!: (v: string) => void
        let resolveSecond!: (v: string) => void

        const firstPromise = new Promise<string>((r) => {
          resolveFirst = r
        })
        const secondPromise = new Promise<string>((r) => {
          resolveSecond = r
        })

        let callCount = 0
        const asyncFn = async (): Promise<string> => {
          callCount += 1
          if (callCount === 1) return firstPromise
          return secondPromise
        }

        const { state, call } = createPromise(asyncFn)

        const p1 = call()
        const p2 = call()

        // Resolve the second call first
        resolveSecond('second')
        await p2

        expect(state().status).toBe('resolved')
        expect(state().value).toBe('second')

        // Now resolve the first call — should be ignored since it's stale
        resolveFirst('first')
        await p1

        expect(state().status).toBe('resolved')
        expect(state().value).toBe('second')

        dispose()
        resolve()
      })
    })
  })

  it('wraps non-Error rejections in Error', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const asyncFn = async (): Promise<string> => {
          throw 'string error'
        }
        const { state, call } = createPromise(asyncFn)

        try {
          await call()
        } catch (_error) {
          // expected — test asserts the rejected state below; swallowing is safe here
        }

        expect(state().status).toBe('rejected')
        expect(state().error).toBeInstanceOf(Error)
        expect(state().error!.message).toBe('string error')

        dispose()
        resolve()
      })
    })
  })
})

describe('usePromise', () => {
  it('initial state is idle with null value and error', () => {
    const asyncFn = vi.fn(() => Promise.resolve('data'))
    const { tuple, dispose } = mountPromise(asyncFn)

    const state = tuple[0]
    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()

    dispose()
  })

  it('sets pending on call, then resolved on success', async () => {
    let resolve!: (value: string) => void
    const asyncFn = vi.fn(() => new Promise<string>((r) => (resolve = r)))
    const { tuple, dispose } = mountPromise(asyncFn)

    const callPromise = tuple[1]()

    expect(tuple[0].status).toBe('pending')
    expect(tuple[0].value).toBeNull()
    expect(tuple[0].error).toBeNull()

    resolve('hello')
    await callPromise

    expect(tuple[0].status).toBe('resolved')
    expect(tuple[0].value).toBe('hello')
    expect(tuple[0].error).toBeNull()

    dispose()
  })

  it('sets pending on call, then rejected on error', async () => {
    let reject!: (error: Error) => void
    const asyncFn = vi.fn(() => new Promise<string>((_r, rej) => (reject = rej)))
    const { tuple, dispose } = mountPromise(asyncFn)

    const callPromise = tuple[1]()

    expect(tuple[0].status).toBe('pending')

    reject(new Error('something went wrong'))
    try {
      await callPromise
    } catch (_error) {
      // expected rejection — the promise rejects by design; ignoring here is safe
    }

    expect(tuple[0].status).toBe('rejected')
    expect(tuple[0].value).toBeNull()
    expect(tuple[0].error).toBeInstanceOf(Error)
    expect(tuple[0].error?.message).toBe('something went wrong')

    dispose()
  })

  it('cancel sets status to rejected with error message', async () => {
    let resolve!: (value: string) => void
    const asyncFn = vi.fn(() => new Promise<string>((r) => (resolve = r)))
    const { tuple, dispose } = mountPromise(asyncFn)

    tuple[1]()

    expect(tuple[0].status).toBe('pending')

    tuple[0].cancel('User cancelled')

    expect(tuple[0].status).toBe('rejected')
    expect(tuple[0].error).toBeInstanceOf(Error)
    expect(tuple[0].error?.message).toBe('User cancelled')

    // Resolve should be ignored after cancel
    resolve('should be ignored')
    await flush()

    expect(tuple[0].status).toBe('rejected')
    expect(tuple[0].value).toBeNull()

    dispose()
  })

  it('cancel without message sets rejected with null error', () => {
    const asyncFn = vi.fn(() => new Promise<string>(() => {}))
    const { tuple, dispose } = mountPromise(asyncFn)

    tuple[1]()

    tuple[0].cancel()

    expect(tuple[0].status).toBe('rejected')
    expect(tuple[0].error).toBeNull()

    dispose()
  })

  it('multiple calls - only latest result is used (stale calls ignored)', async () => {
    const resolvers: Array<(value: string) => void> = []
    const asyncFn = vi.fn(
      (_id: string) =>
        new Promise<string>((r) => {
          resolvers.push((val: string) => r(val))
        }),
    )
    const { tuple, dispose } = mountPromise(asyncFn)

    // Start first call
    tuple[1]('first')

    // Start second call (should make first stale)
    const promise2 = tuple[1]('second')

    expect(tuple[0].status).toBe('pending')

    // Resolve the first call - should be ignored since it's stale
    resolvers[0]('first-result')
    await flush()

    // Value should still be null because first call is stale
    expect(tuple[0].value).toBeNull()
    expect(tuple[0].status).toBe('pending')

    // Resolve the second call - should be applied
    resolvers[1]('second-result')
    await promise2

    expect(tuple[0].status).toBe('resolved')
    expect(tuple[0].value).toBe('second-result')

    dispose()
  })

  it('unmount prevents state updates', async () => {
    let resolve!: (value: string) => void
    const asyncFn = vi.fn(() => new Promise<string>((r) => (resolve = r)))
    const { tuple, dispose } = mountPromise(asyncFn)

    tuple[1]()

    expect(tuple[0].status).toBe('pending')

    // Unmount the component
    dispose()

    // Resolve after unmount - should not throw or update state
    resolve('after unmount')
    await flush()

    // State should still be pending (no update after unmount)
    expect(tuple[0].status).toBe('pending')
  })

  it('returns the resolved value from the wrapped function', async () => {
    const asyncFn = vi.fn(() => Promise.resolve(42))
    const { tuple, dispose } = mountPromise(asyncFn)

    const returnedValue = await tuple[1]()

    expect(returnedValue).toBe(42)

    dispose()
  })
})
