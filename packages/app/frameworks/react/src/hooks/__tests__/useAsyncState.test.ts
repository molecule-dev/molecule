// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAsyncState } from '../useAsyncState.js'

const flush = (): Promise<unknown> => new Promise((r) => setTimeout(r, 0))

interface TestState {
  foo: string
  bar: string
}

describe('useAsyncState', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useAsyncState<TestState>({ foo: 'hello', bar: 'world' }))

    expect(result.current[0]).toEqual({ foo: 'hello', bar: 'world' })
  })

  it('synchronous setState works', () => {
    const { result } = renderHook(() => useAsyncState<TestState>({ foo: 'hello', bar: 'world' }))

    act(() => {
      result.current[1]({ foo: 'updated', bar: 'state' })
    })

    expect(result.current[0]).toEqual({ foo: 'updated', bar: 'state' })
  })

  it('function setState works (receives previous state)', () => {
    const { result } = renderHook(() => useAsyncState<TestState>({ foo: 'hello', bar: 'world' }))

    act(() => {
      result.current[1]((prev) => ({
        foo: prev.foo.toUpperCase(),
        bar: prev.bar.toUpperCase(),
      }))
    })

    expect(result.current[0]).toEqual({ foo: 'HELLO', bar: 'WORLD' })
  })

  it('Promise setState works (await then set)', async () => {
    const { result } = renderHook(() => useAsyncState<TestState>({ foo: 'hello', bar: 'world' }))

    await act(async () => {
      result.current[1](
        new Promise((resolve) =>
          setTimeout(() => resolve({ foo: 'async-foo', bar: 'async-bar' }), 10),
        ),
      )
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(result.current[0]).toEqual({ foo: 'async-foo', bar: 'async-bar' })
  })

  it('extendState merges partial updates', () => {
    const { result } = renderHook(() => useAsyncState<TestState>({ foo: 'hello', bar: 'world' }))

    act(() => {
      result.current[2]({ foo: 'updated' })
    })

    expect(result.current[0]).toEqual({ foo: 'updated', bar: 'world' })
  })

  it('function extendState works', () => {
    const { result } = renderHook(() => useAsyncState<TestState>({ foo: 'hello', bar: 'world' }))

    act(() => {
      result.current[2]((prev) => ({ bar: prev.bar.toUpperCase() }))
    })

    expect(result.current[0]).toEqual({ foo: 'hello', bar: 'WORLD' })
  })

  it('Promise extendState works', async () => {
    const { result } = renderHook(() => useAsyncState<TestState>({ foo: 'hello', bar: 'world' }))

    await act(async () => {
      result.current[2](
        new Promise((resolve) => setTimeout(() => resolve({ foo: 'async-updated' }), 10)),
      )
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(result.current[0]).toEqual({
      foo: 'async-updated',
      bar: 'world',
    })
  })

  it('rejected promise is silently handled', async () => {
    const { result } = renderHook(() => useAsyncState<TestState>({ foo: 'hello', bar: 'world' }))

    // Rejected promise setState should not throw or update state
    await act(async () => {
      result.current[1](Promise.reject(new Error('fail')))
      await flush()
    })

    expect(result.current[0]).toEqual({ foo: 'hello', bar: 'world' })

    // Rejected promise extendState should not throw or update state
    await act(async () => {
      result.current[2](Promise.reject(new Error('extend fail')))
      await flush()
    })

    expect(result.current[0]).toEqual({ foo: 'hello', bar: 'world' })
  })
})
