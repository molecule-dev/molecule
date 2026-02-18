import { firstValueFrom, toArray } from 'rxjs'
import { describe, expect, it } from 'vitest'

import { createAsyncState } from '../async-state.service.js'

const flush = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0))

interface TestState {
  count: number
  name: string
}

describe('createAsyncState', () => {
  it('returns initial state', () => {
    const initial: TestState = { count: 0, name: 'hello' }
    const { getState, destroy } = createAsyncState(initial)

    expect(getState()).toEqual({ count: 0, name: 'hello' })

    destroy()
  })

  it('sync setState replaces state', () => {
    const { getState, setState, destroy } = createAsyncState<TestState>({
      count: 0,
      name: 'hello',
    })

    setState({ count: 5, name: 'world' })

    expect(getState()).toEqual({ count: 5, name: 'world' })

    destroy()
  })

  it('function setState derives from previous state', () => {
    const { getState, setState, destroy } = createAsyncState<TestState>({
      count: 0,
      name: 'hello',
    })

    setState((prev) => ({ ...prev, count: prev.count + 10 }))

    expect(getState()).toEqual({ count: 10, name: 'hello' })

    destroy()
  })

  it('promise setState resolves and updates', async () => {
    const { getState, setState, destroy } = createAsyncState<TestState>({
      count: 0,
      name: 'hello',
    })

    setState(Promise.resolve({ count: 42, name: 'async' }))

    await flush()

    expect(getState()).toEqual({ count: 42, name: 'async' })

    destroy()
  })

  it('promise setState with function resolves and derives', async () => {
    const { getState, setState, destroy } = createAsyncState<TestState>({
      count: 5,
      name: 'hello',
    })

    setState(Promise.resolve((prev: TestState) => ({ ...prev, count: prev.count + 100 })))

    await flush()

    expect(getState()).toEqual({ count: 105, name: 'hello' })

    destroy()
  })

  it('extendState merges partial state', () => {
    const { getState, extendState, destroy } = createAsyncState<TestState>({
      count: 0,
      name: 'hello',
    })

    extendState({ count: 99 })

    expect(getState()).toEqual({ count: 99, name: 'hello' })

    destroy()
  })

  it('extendState with function derives partial from previous', () => {
    const { getState, extendState, destroy } = createAsyncState<TestState>({
      count: 10,
      name: 'hello',
    })

    extendState((prev) => ({ name: prev.name + '!' }))

    expect(getState()).toEqual({ count: 10, name: 'hello!' })

    destroy()
  })

  it('promise extendState resolves and merges', async () => {
    const { getState, extendState, destroy } = createAsyncState<TestState>({
      count: 0,
      name: 'hello',
    })

    extendState(Promise.resolve({ name: 'async-merged' }))

    await flush()

    expect(getState()).toEqual({ count: 0, name: 'async-merged' })

    destroy()
  })

  it('promise extendState with function resolves and derives', async () => {
    const { getState, extendState, destroy } = createAsyncState<TestState>({
      count: 7,
      name: 'hello',
    })

    extendState(Promise.resolve((prev: TestState) => ({ count: prev.count * 3 })))

    await flush()

    expect(getState()).toEqual({ count: 21, name: 'hello' })

    destroy()
  })

  it('rejected promise is handled silently', async () => {
    const { getState, setState, extendState, destroy } = createAsyncState<TestState>({
      count: 0,
      name: 'safe',
    })

    setState(Promise.reject(new Error('setState error')))
    extendState(Promise.reject(new Error('extendState error')))

    await flush()

    // State should remain unchanged
    expect(getState()).toEqual({ count: 0, name: 'safe' })

    destroy()
  })

  it('destroy completes observable', async () => {
    const initial: TestState = { count: 0, name: 'hello' }
    const manager = createAsyncState(initial)

    const allValues = firstValueFrom(manager.state$.pipe(toArray()))

    manager.destroy()

    const values = await allValues
    expect(values).toEqual([{ count: 0, name: 'hello' }])
  })

  it('state$ emits on changes', () => {
    const { state$, setState, destroy } = createAsyncState<number>(0)

    const emitted: number[] = []
    state$.subscribe((v) => emitted.push(v))

    setState(1)
    setState(2)
    setState(3)

    expect(emitted).toEqual([0, 1, 2, 3])

    destroy()
  })
})
