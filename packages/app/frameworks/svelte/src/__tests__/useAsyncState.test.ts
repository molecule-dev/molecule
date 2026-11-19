/**
 * `useAsyncState` in Svelte's idiom: the same `[state, setState, extendState]`
 * tuple as React, read from a store. A Svelte hook runs once, so there is no
 * rerender; every case reads the tuple's current state after the action.
 *
 * @module
 */

import { get } from 'svelte/store'
import { describe, expect, it } from 'vitest'

import { useAsyncState } from '../hooks/useAsyncState.js'

interface TestState {
  foo: string
  bar: string
}

describe('useAsyncState', () => {
  it('returns initial state', () => {
    const store = useAsyncState<TestState>({ foo: 'hello', bar: 'world' })

    expect(get(store)[0]).toEqual({ foo: 'hello', bar: 'world' })
  })

  it('synchronous setState works', async () => {
    const store = useAsyncState<TestState>({ foo: 'hello', bar: 'world' })

    await get(store)[1]({ foo: 'updated', bar: 'state' })

    expect(get(store)[0]).toEqual({ foo: 'updated', bar: 'state' })
  })

  it('function setState works (receives previous state)', async () => {
    const store = useAsyncState<TestState>({ foo: 'hello', bar: 'world' })

    await get(store)[1]((prev) => ({
      foo: prev.foo.toUpperCase(),
      bar: prev.bar.toUpperCase(),
    }))

    expect(get(store)[0]).toEqual({ foo: 'HELLO', bar: 'WORLD' })
  })

  it('Promise setState works (await then set)', async () => {
    const store = useAsyncState<TestState>({ foo: 'hello', bar: 'world' })

    await get(store)[1](
      new Promise((resolve) =>
        setTimeout(() => resolve({ foo: 'async-foo', bar: 'async-bar' }), 10),
      ),
    )

    expect(get(store)[0]).toEqual({ foo: 'async-foo', bar: 'async-bar' })
  })

  it('extendState merges partial updates', async () => {
    const store = useAsyncState<TestState>({ foo: 'hello', bar: 'world' })

    await get(store)[2]({ foo: 'updated' })

    expect(get(store)[0]).toEqual({ foo: 'updated', bar: 'world' })
  })

  it('function extendState works', async () => {
    const store = useAsyncState<TestState>({ foo: 'hello', bar: 'world' })

    await get(store)[2]((prev) => ({ bar: prev.bar.toUpperCase() }))

    expect(get(store)[0]).toEqual({ foo: 'hello', bar: 'WORLD' })
  })

  it('Promise extendState works', async () => {
    const store = useAsyncState<TestState>({ foo: 'hello', bar: 'world' })

    await get(store)[2](
      new Promise((resolve) => setTimeout(() => resolve({ foo: 'async-updated' }), 10)),
    )

    expect(get(store)[0]).toEqual({
      foo: 'async-updated',
      bar: 'world',
    })
  })

  it('rejected promise is silently handled', async () => {
    const store = useAsyncState<TestState>({ foo: 'hello', bar: 'world' })

    // A rejected promise setState must not throw or update state.
    await get(store)[1](Promise.reject(new Error('fail')))

    expect(get(store)[0]).toEqual({ foo: 'hello', bar: 'world' })

    // A rejected promise extendState must not throw or update state.
    await get(store)[2](Promise.reject(new Error('extend fail')))

    expect(get(store)[0]).toEqual({ foo: 'hello', bar: 'world' })
  })
})
