import { firstValueFrom, toArray } from 'rxjs'
import { describe, expect, it, vi } from 'vitest'

import { createPromiseState } from '../promise.service.js'

const flush = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0))

describe('createPromiseState', () => {
  it('initial state is idle with null value and error', () => {
    const { getState, destroy } = createPromiseState(async () => 'hello')

    expect(getState()).toEqual({
      status: 'idle',
      value: null,
      error: null,
    })

    destroy()
  })

  it('sets pending on call, then resolved on success', async () => {
    const states: Array<{ status: string }> = []
    const asyncFn = vi.fn(async (x: number) => x * 2)
    const manager = createPromiseState(asyncFn)

    manager.state$.subscribe((s) => states.push({ ...s }))

    const result = await manager.call(5)

    expect(result).toBe(10)
    expect(asyncFn).toHaveBeenCalledWith(5)
    expect(manager.getState()).toEqual({
      status: 'resolved',
      value: 10,
      error: null,
    })

    // Should have gone idle -> pending -> resolved
    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'resolved'])

    manager.destroy()
  })

  it('sets pending on call, then rejected on error', async () => {
    const error = new Error('boom')
    const asyncFn = vi.fn(async () => {
      throw error
    })
    const manager = createPromiseState(asyncFn)

    const states: Array<{ status: string }> = []
    manager.state$.subscribe((s) => states.push({ ...s }))

    await expect(manager.call()).rejects.toThrow('boom')

    expect(manager.getState()).toEqual({
      status: 'rejected',
      value: null,
      error,
    })

    expect(states.map((s) => s.status)).toEqual(['idle', 'pending', 'rejected'])

    manager.destroy()
  })

  it('cancel sets rejected', () => {
    const manager = createPromiseState(async () => 'hello')

    manager.cancel('user cancelled')

    expect(manager.getState()).toEqual({
      status: 'rejected',
      value: null,
      error: new Error('user cancelled'),
    })

    manager.destroy()
  })

  it('cancel without message sets error to null', () => {
    const manager = createPromiseState(async () => 'hello')

    manager.cancel()

    expect(manager.getState()).toEqual({
      status: 'rejected',
      value: null,
      error: null,
    })

    manager.destroy()
  })

  it('reset clears to idle', async () => {
    const manager = createPromiseState(async () => 42)

    await manager.call()
    expect(manager.getState().status).toBe('resolved')

    manager.reset()

    expect(manager.getState()).toEqual({
      status: 'idle',
      value: null,
      error: null,
    })

    manager.destroy()
  })

  it('multiple calls - latest result wins', async () => {
    let resolveFirst!: (v: string) => void
    let resolveSecond!: (v: string) => void

    const firstPromise = new Promise<string>((r) => {
      resolveFirst = r
    })
    const secondPromise = new Promise<string>((r) => {
      resolveSecond = r
    })

    let callCount = 0
    const asyncFn = vi.fn(async () => {
      callCount++
      if (callCount === 1) return firstPromise
      return secondPromise
    })

    const manager = createPromiseState(asyncFn)

    // Start first call
    const firstCall = manager.call().catch(() => {})

    // Start second call (should supersede first)
    const secondCall = manager.call()

    // Resolve the second call first
    resolveSecond('second')
    await secondCall

    expect(manager.getState()).toEqual({
      status: 'resolved',
      value: 'second',
      error: null,
    })

    // Now resolve the first call - should be ignored
    resolveFirst('first')
    await firstCall
    await flush()

    // State should still show the second result
    expect(manager.getState()).toEqual({
      status: 'resolved',
      value: 'second',
      error: null,
    })

    manager.destroy()
  })

  it('destroy completes observable', async () => {
    const manager = createPromiseState(async () => 'hello')

    const allValues = firstValueFrom(manager.state$.pipe(toArray()))

    manager.destroy()

    const values = await allValues
    expect(values).toEqual([{ status: 'idle', value: null, error: null }])
  })
})
