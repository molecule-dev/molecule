// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePromise } from '../usePromise.js'

const flush = (): Promise<unknown> => new Promise((r) => setTimeout(r, 0))

describe('usePromise', () => {
  it('initial state is idle with null value and error', () => {
    const asyncFn = vi.fn(() => Promise.resolve('data'))
    const { result } = renderHook(() => usePromise(asyncFn))

    const [state] = result.current
    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })

  it('sets pending on call, then resolved on success', async () => {
    let resolve!: (value: string) => void
    const asyncFn = vi.fn(() => new Promise<string>((r) => (resolve = r)))

    const { result } = renderHook(() => usePromise(asyncFn))

    let callPromise!: Promise<string>
    act(() => {
      callPromise = result.current[1]()
    })

    expect(result.current[0].status).toBe('pending')
    expect(result.current[0].value).toBeNull()
    expect(result.current[0].error).toBeNull()

    await act(async () => {
      resolve('hello')
      await callPromise
    })

    expect(result.current[0].status).toBe('resolved')
    expect(result.current[0].value).toBe('hello')
    expect(result.current[0].error).toBeNull()
  })

  it('sets pending on call, then rejected on error', async () => {
    let reject!: (error: Error) => void
    const asyncFn = vi.fn(() => new Promise<string>((_r, rej) => (reject = rej)))

    const { result } = renderHook(() => usePromise(asyncFn))

    let callPromise!: Promise<string>
    act(() => {
      callPromise = result.current[1]()
    })

    expect(result.current[0].status).toBe('pending')

    await act(async () => {
      reject(new Error('something went wrong'))
      try {
        await callPromise
      } catch {
        // expected
      }
    })

    expect(result.current[0].status).toBe('rejected')
    expect(result.current[0].value).toBeNull()
    expect(result.current[0].error).toBeInstanceOf(Error)
    expect(result.current[0].error!.message).toBe('something went wrong')
  })

  it('cancel sets status to rejected with error message', async () => {
    let resolve!: (value: string) => void
    const asyncFn = vi.fn(() => new Promise<string>((r) => (resolve = r)))

    const { result } = renderHook(() => usePromise(asyncFn))

    act(() => {
      result.current[1]()
    })

    expect(result.current[0].status).toBe('pending')

    act(() => {
      result.current[0].cancel('User cancelled')
    })

    expect(result.current[0].status).toBe('rejected')
    expect(result.current[0].error).toBeInstanceOf(Error)
    expect(result.current[0].error!.message).toBe('User cancelled')

    // Resolve should be ignored after cancel
    await act(async () => {
      resolve('should be ignored')
      await flush()
    })

    expect(result.current[0].status).toBe('rejected')
    expect(result.current[0].value).toBeNull()
  })

  it('cancel without message sets rejected with null error', async () => {
    const asyncFn = vi.fn(() => new Promise<string>(() => {}))

    const { result } = renderHook(() => usePromise(asyncFn))

    act(() => {
      result.current[1]()
    })

    act(() => {
      result.current[0].cancel()
    })

    expect(result.current[0].status).toBe('rejected')
    expect(result.current[0].error).toBeNull()
  })

  it('reset clears state back to idle', async () => {
    const asyncFn = vi.fn(() => Promise.resolve('data'))

    const { result } = renderHook(() => usePromise(asyncFn))

    await act(async () => {
      await result.current[1]()
    })

    expect(result.current[0].status).toBe('resolved')
    expect(result.current[0].value).toBe('data')

    act(() => {
      result.current[0].reset()
    })

    expect(result.current[0].status).toBe('idle')
    expect(result.current[0].value).toBeNull()
    expect(result.current[0].error).toBeNull()
  })

  it('multiple calls - only latest result is used (stale calls ignored)', async () => {
    const resolvers: Array<(value: string) => void> = []
    const asyncFn = vi.fn(
      (_id: string) =>
        new Promise<string>((r) => {
          resolvers.push((val: string) => r(val))
        }),
    )

    const { result } = renderHook(() => usePromise(asyncFn))

    // Start first call
    act(() => {
      result.current[1]('first')
    })

    // Start second call (should make first stale)
    let promise2!: Promise<string>
    act(() => {
      promise2 = result.current[1]('second')
    })

    expect(result.current[0].status).toBe('pending')

    // Resolve the first call - should be ignored since it's stale
    await act(async () => {
      resolvers[0]('first-result')
      await flush()
    })

    // Value should still be null because first call is stale
    expect(result.current[0].value).toBeNull()
    expect(result.current[0].status).toBe('pending')

    // Resolve the second call - should be applied
    await act(async () => {
      resolvers[1]('second-result')
      await promise2
    })

    expect(result.current[0].status).toBe('resolved')
    expect(result.current[0].value).toBe('second-result')
  })

  it('unmount prevents state updates', async () => {
    let resolve!: (value: string) => void
    const asyncFn = vi.fn(() => new Promise<string>((r) => (resolve = r)))

    const { result, unmount } = renderHook(() => usePromise(asyncFn))

    act(() => {
      result.current[1]()
    })

    expect(result.current[0].status).toBe('pending')

    // Unmount the component
    unmount()

    // Resolve after unmount - should not throw or update state
    resolve('after unmount')
    await flush()

    // State should still be pending (no update after unmount)
    expect(result.current[0].status).toBe('pending')
  })

  it('returns the resolved value from the wrapped function', async () => {
    const asyncFn = vi.fn(() => Promise.resolve(42))

    const { result } = renderHook(() => usePromise(asyncFn))

    let returnedValue!: number
    await act(async () => {
      returnedValue = await result.current[1]()
    })

    expect(returnedValue).toBe(42)
  })
})
