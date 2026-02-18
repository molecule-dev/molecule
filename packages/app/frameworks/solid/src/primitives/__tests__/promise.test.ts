import { createRoot } from 'solid-js'
import { describe, expect, it, vi } from 'vitest'

import { createPromise } from '../promise.js'

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
        } catch {
          // expected
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
        } catch {
          // expected
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
