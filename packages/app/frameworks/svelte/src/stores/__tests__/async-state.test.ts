import { get } from 'svelte/store'
import { describe, expect, it } from 'vitest'

import { createAsyncState } from '../async-state.js'

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

describe('createAsyncState', () => {
  it('should return the initial state', () => {
    const store = createAsyncState({ count: 0, name: 'hello' })
    const state = get(store)

    expect(state).toEqual({ count: 0, name: 'hello' })
  })

  it('should handle sync setState', () => {
    const store = createAsyncState({ count: 0, name: 'hello' })

    store.setState({ count: 5, name: 'world' })

    expect(get(store)).toEqual({ count: 5, name: 'world' })
  })

  it('should handle function setState', () => {
    const store = createAsyncState({ count: 0, name: 'hello' })

    store.setState((prev) => ({ ...prev, count: prev.count + 10 }))

    expect(get(store)).toEqual({ count: 10, name: 'hello' })
  })

  it('should handle promise setState', async () => {
    const store = createAsyncState({ count: 0, name: 'hello' })

    store.setState(Promise.resolve({ count: 99, name: 'async' }))
    await flush()

    expect(get(store)).toEqual({ count: 99, name: 'async' })
  })

  it('should handle promise setState with function resolver', async () => {
    const store = createAsyncState({ count: 5, name: 'hello' })

    store.setState(
      Promise.resolve((prev: { count: number; name: string }) => ({
        ...prev,
        count: prev.count * 2,
      })),
    )
    await flush()

    expect(get(store)).toEqual({ count: 10, name: 'hello' })
  })

  it('should merge with extendState', () => {
    const store = createAsyncState({ count: 0, name: 'hello', active: false })

    store.extendState({ count: 42 })

    expect(get(store)).toEqual({ count: 42, name: 'hello', active: false })
  })

  it('should handle function extendState', () => {
    const store = createAsyncState({ count: 0, name: 'hello' })

    store.extendState((prev) => ({ count: prev.count + 1 }))

    expect(get(store)).toEqual({ count: 1, name: 'hello' })
  })

  it('should handle promise extendState', async () => {
    const store = createAsyncState({ count: 0, name: 'hello', active: false })

    store.extendState(Promise.resolve({ name: 'async', active: true }))
    await flush()

    expect(get(store)).toEqual({ count: 0, name: 'async', active: true })
  })

  it('should handle promise extendState with function resolver', async () => {
    const store = createAsyncState({ count: 5, name: 'hello' })

    store.extendState(
      Promise.resolve((prev: { count: number; name: string }) => ({
        count: prev.count + 100,
      })),
    )
    await flush()

    expect(get(store)).toEqual({ count: 105, name: 'hello' })
  })

  it('should silently handle rejected promise in setState', async () => {
    const store = createAsyncState({ count: 0, name: 'hello' })

    store.setState(Promise.reject(new Error('boom')))
    await flush()

    // State should remain unchanged
    expect(get(store)).toEqual({ count: 0, name: 'hello' })
  })

  it('should silently handle rejected promise in extendState', async () => {
    const store = createAsyncState({ count: 0, name: 'hello' })

    store.extendState(Promise.reject(new Error('boom')))
    await flush()

    // State should remain unchanged
    expect(get(store)).toEqual({ count: 0, name: 'hello' })
  })

  it('should support standard writable set and update', () => {
    const store = createAsyncState({ count: 0 })

    store.set({ count: 10 })
    expect(get(store)).toEqual({ count: 10 })

    store.update((prev) => ({ count: prev.count + 5 }))
    expect(get(store)).toEqual({ count: 15 })
  })
})
