import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'

import { createAsyncState } from '../async-state.js'

/** The state shape React's `useAsyncState` cases use. */
interface TestState {
  foo: string
  bar: string
}

describe('createAsyncState', () => {
  it('returns initial state', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state } = createAsyncState({ foo: 'bar' })

        expect(state()).toEqual({ foo: 'bar' })

        dispose()
        resolve()
      })
    })
  })

  it('sync setState replaces state', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, setState } = createAsyncState({ count: 0 })

        setState({ count: 42 })

        expect(state()).toEqual({ count: 42 })

        dispose()
        resolve()
      })
    })
  })

  it('function setState receives previous value', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, setState } = createAsyncState({ count: 5 })

        setState((prev) => ({ count: prev.count + 10 }))

        expect(state()).toEqual({ count: 15 })

        dispose()
        resolve()
      })
    })
  })

  it('promise setState resolves and updates', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const { state, setState } = createAsyncState({ name: 'initial' })

        const asyncValue = Promise.resolve({ name: 'resolved' })
        setState(asyncValue)

        // Let the microtask resolve
        await asyncValue

        expect(state()).toEqual({ name: 'resolved' })

        dispose()
        resolve()
      })
    })
  })

  it('promise setState with function updater', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const { state, setState } = createAsyncState({ count: 10 })

        const asyncUpdater = Promise.resolve((prev: { count: number }) => ({
          count: prev.count * 3,
        }))
        setState(asyncUpdater)

        await asyncUpdater

        expect(state()).toEqual({ count: 30 })

        dispose()
        resolve()
      })
    })
  })

  it('extendState merges partial state', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, extendState } = createAsyncState({
          foo: 'hello',
          bar: 'world',
        })

        extendState({ foo: 'updated' })

        expect(state()).toEqual({ foo: 'updated', bar: 'world' })

        dispose()
        resolve()
      })
    })
  })

  it('extendState with function receives previous value', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, extendState } = createAsyncState({
          count: 5,
          label: 'items',
        })

        extendState((prev) => ({ count: prev.count + 1 }))

        expect(state()).toEqual({ count: 6, label: 'items' })

        dispose()
        resolve()
      })
    })
  })

  it('promise extendState resolves and merges', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const { state, extendState } = createAsyncState({
          a: 1,
          b: 2,
        })

        const asyncPartial = Promise.resolve({ b: 99 })
        extendState(asyncPartial)

        await asyncPartial

        expect(state()).toEqual({ a: 1, b: 99 })

        dispose()
        resolve()
      })
    })
  })

  it('rejected promise is handled silently', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const { state, setState } = createAsyncState({ value: 'safe' })

        const rejectedPromise = Promise.reject(new Error('boom'))
        setState(rejectedPromise)

        // Wait for the rejection to be handled
        await new Promise((r) => setTimeout(r, 10))

        // State should remain unchanged — error was swallowed
        expect(state()).toEqual({ value: 'safe' })

        dispose()
        resolve()
      })
    })
  })

  it('rejected promise in extendState is handled silently', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const { state, extendState } = createAsyncState({
          a: 1,
          b: 2,
        })

        const rejectedPromise = Promise.reject(new Error('extend error'))
        extendState(rejectedPromise)

        await new Promise((r) => setTimeout(r, 10))

        expect(state()).toEqual({ a: 1, b: 2 })

        dispose()
        resolve()
      })
    })
  })

  it('synchronous setState works', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, setState } = createAsyncState<TestState>({ foo: 'hello', bar: 'world' })

        setState({ foo: 'updated', bar: 'state' })

        expect(state()).toEqual({ foo: 'updated', bar: 'state' })

        dispose()
        resolve()
      })
    })
  })

  it('function setState works (receives previous state)', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, setState } = createAsyncState<TestState>({ foo: 'hello', bar: 'world' })

        setState((prev) => ({ foo: prev.foo.toUpperCase(), bar: prev.bar.toUpperCase() }))

        expect(state()).toEqual({ foo: 'HELLO', bar: 'WORLD' })

        dispose()
        resolve()
      })
    })
  })

  it('Promise setState works (await then set)', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const { state, setState } = createAsyncState<TestState>({ foo: 'hello', bar: 'world' })

        await setState(
          new Promise<TestState>((resolveValue) =>
            setTimeout(() => resolveValue({ foo: 'async-foo', bar: 'async-bar' }), 10),
          ),
        )

        expect(state()).toEqual({ foo: 'async-foo', bar: 'async-bar' })

        dispose()
        resolve()
      })
    })
  })

  it('extendState merges partial updates', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, extendState } = createAsyncState<TestState>({ foo: 'hello', bar: 'world' })

        extendState({ foo: 'updated' })

        expect(state()).toEqual({ foo: 'updated', bar: 'world' })

        dispose()
        resolve()
      })
    })
  })

  it('function extendState works', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, extendState } = createAsyncState<TestState>({ foo: 'hello', bar: 'world' })

        extendState((prev) => ({ bar: prev.bar.toUpperCase() }))

        expect(state()).toEqual({ foo: 'hello', bar: 'WORLD' })

        dispose()
        resolve()
      })
    })
  })

  it('Promise extendState works', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const { state, extendState } = createAsyncState<TestState>({ foo: 'hello', bar: 'world' })

        await extendState(
          new Promise<Partial<TestState>>((resolveValue) =>
            setTimeout(() => resolveValue({ foo: 'async-updated' }), 10),
          ),
        )

        expect(state()).toEqual({ foo: 'async-updated', bar: 'world' })

        dispose()
        resolve()
      })
    })
  })

  it('rejected promise is silently handled', () => {
    return new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const { state, setState, extendState } = createAsyncState<TestState>({
          foo: 'hello',
          bar: 'world',
        })

        // Rejected promise setState must not throw or update state.
        await setState(Promise.reject(new Error('fail')))
        expect(state()).toEqual({ foo: 'hello', bar: 'world' })

        // Rejected promise extendState must not throw or update state.
        await extendState(Promise.reject(new Error('extend fail')))
        expect(state()).toEqual({ foo: 'hello', bar: 'world' })

        dispose()
        resolve()
      })
    })
  })
})
