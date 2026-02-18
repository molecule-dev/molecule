import { get } from 'svelte/store'
import { describe, expect, it, vi } from 'vitest'

import { createPromiseStore } from '../promise.js'

describe('createPromiseStore', () => {
  it('should have idle initial state with null value and error', () => {
    const store = createPromiseStore(() => Promise.resolve('hello'))
    const state = get(store)

    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })

  it('should set pending on call, then resolved on success', async () => {
    const asyncFn = vi.fn(() => Promise.resolve('result'))
    const store = createPromiseStore(asyncFn)

    const states: string[] = []
    store.subscribe((s) => states.push(s.status))

    const result = await store.call()

    expect(result).toBe('result')
    expect(asyncFn).toHaveBeenCalledOnce()
    expect(states).toEqual(['idle', 'pending', 'resolved'])

    const state = get(store)
    expect(state.status).toBe('resolved')
    expect(state.value).toBe('result')
    expect(state.error).toBeNull()
  })

  it('should set pending on call, then rejected on error', async () => {
    const error = new Error('failed')
    const asyncFn = vi.fn(() => Promise.reject(error))
    const store = createPromiseStore(asyncFn)

    const states: string[] = []
    store.subscribe((s) => states.push(s.status))

    await expect(store.call()).rejects.toThrow('failed')

    expect(states).toEqual(['idle', 'pending', 'rejected'])

    const state = get(store)
    expect(state.status).toBe('rejected')
    expect(state.value).toBeNull()
    expect(state.error).toBe(error)
  })

  it('should set rejected on cancel', () => {
    const store = createPromiseStore(() => Promise.resolve('result'))

    store.cancel('cancelled by user')

    const state = get(store)
    expect(state.status).toBe('rejected')
    expect(state.value).toBeNull()
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error!.message).toBe('cancelled by user')
  })

  it('should set rejected with null error on cancel without message', () => {
    const store = createPromiseStore(() => Promise.resolve('result'))

    store.cancel()

    const state = get(store)
    expect(state.status).toBe('rejected')
    expect(state.error).toBeNull()
  })

  it('should clear to idle on reset', async () => {
    const store = createPromiseStore(() => Promise.resolve('result'))

    await store.call()
    expect(get(store).status).toBe('resolved')

    store.reset()

    const state = get(store)
    expect(state.status).toBe('idle')
    expect(state.value).toBeNull()
    expect(state.error).toBeNull()
  })

  it('should use latest result when multiple calls are made', async () => {
    let resolveFirst: (v: string) => void
    let resolveSecond: (v: string) => void

    const first = new Promise<string>((r) => {
      resolveFirst = r
    })
    const second = new Promise<string>((r) => {
      resolveSecond = r
    })

    let callCount = 0
    const asyncFn = vi.fn(() => {
      callCount += 1
      return callCount === 1 ? first : second
    })

    const store = createPromiseStore(asyncFn)

    const call1 = store.call()
    const call2 = store.call()

    // Resolve second first, then first
    resolveSecond!('second')
    await call2

    expect(get(store).status).toBe('resolved')
    expect(get(store).value).toBe('second')

    // Resolve first after second (stale call)
    resolveFirst!('first')
    await call1

    // Should still show second result (latest wins)
    expect(get(store).value).toBe('second')
  })

  it('should pass arguments to the async function', async () => {
    const asyncFn = vi.fn((a: string, b: number) => Promise.resolve(`${a}-${b}`))
    const store = createPromiseStore(asyncFn)

    const result = await store.call('hello', 42)

    expect(result).toBe('hello-42')
    expect(asyncFn).toHaveBeenCalledWith('hello', 42)
  })

  it('should convert non-Error rejections to Error objects', async () => {
    const store = createPromiseStore(() => Promise.reject('string error'))

    await expect(store.call()).rejects.toThrow('string error')

    const state = get(store)
    expect(state.error).toBeInstanceOf(Error)
    expect(state.error!.message).toBe('string error')
  })
})
