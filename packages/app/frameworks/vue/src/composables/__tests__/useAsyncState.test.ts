import { describe, expect, it } from 'vitest'
import { effectScope } from 'vue'

import { type AsyncExtendState, type AsyncSetState, useAsyncState } from '../useAsyncState.js'

const flush = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0))

interface TestState {
  name: string
  count: number
}

/** A started hook: element 0 reads live, so every assertion re-reads it. */
interface Started<T> {
  read: () => T
  setState: AsyncSetState<T>
  extendState: AsyncExtendState<T>
}

const start = <T>(initial: T): Started<T> => {
  const hook = useAsyncState<T>(initial)
  return { read: () => hook[0], setState: hook[1], extendState: hook[2] }
}

describe('useAsyncState', () => {
  it('returns initial state', () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    expect(state.read()).toEqual({ name: 'Alice', count: 0 })

    scope.stop()
  })

  it('sync setState replaces state', () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    void state.setState({ name: 'Bob', count: 5 })

    expect(state.read()).toEqual({ name: 'Bob', count: 5 })

    scope.stop()
  })

  it('function setState uses previous value', () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    void state.setState((prev) => ({ ...prev, count: prev.count + 1 }))

    expect(state.read()).toEqual({ name: 'Alice', count: 1 })

    scope.stop()
  })

  it('promise setState resolves and sets value', async () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    void state.setState(Promise.resolve({ name: 'Charlie', count: 10 }))

    // Value should not have changed yet (async)
    expect(state.read()).toEqual({ name: 'Alice', count: 0 })

    await flush()

    expect(state.read()).toEqual({ name: 'Charlie', count: 10 })

    scope.stop()
  })

  it('promise setState with function updater', async () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    void state.setState(
      Promise.resolve((prev: TestState) => ({ ...prev, count: prev.count + 100 })),
    )

    await flush()

    expect(state.read()).toEqual({ name: 'Alice', count: 100 })

    scope.stop()
  })

  it('extendState merges partial value', () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    void state.extendState({ count: 42 })

    expect(state.read()).toEqual({ name: 'Alice', count: 42 })

    scope.stop()
  })

  it('extendState with function updater', () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    void state.extendState((prev) => ({ name: prev.name.toUpperCase() }))

    expect(state.read()).toEqual({ name: 'ALICE', count: 0 })

    scope.stop()
  })

  it('promise extendState merges after resolution', async () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    void state.extendState(Promise.resolve({ count: 99 }))

    // Not yet resolved
    expect(state.read()).toEqual({ name: 'Alice', count: 0 })

    await flush()

    expect(state.read()).toEqual({ name: 'Alice', count: 99 })

    scope.stop()
  })

  it('promise extendState with function updater', async () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 5 })
    })

    void state.extendState(Promise.resolve((prev: TestState) => ({ count: prev.count * 2 })))

    await flush()

    expect(state.read()).toEqual({ name: 'Alice', count: 10 })

    scope.stop()
  })

  it('rejected promise in setState is handled silently', async () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    // This should not throw
    await state.setState(Promise.reject(new Error('fail'))).catch((_error) => {
      // React's hook swallows the rejection; the async wrapper must too.
    })

    await flush()

    // State should remain unchanged
    expect(state.read()).toEqual({ name: 'Alice', count: 0 })

    scope.stop()
  })

  it('rejected promise in extendState is handled silently', async () => {
    const scope = effectScope()
    let state!: Started<TestState>

    scope.run(() => {
      state = start<TestState>({ name: 'Alice', count: 0 })
    })

    // This should not throw
    await state.extendState(Promise.reject(new Error('fail'))).catch((_error) => {
      // React's hook swallows the rejection; the async wrapper must too.
    })

    await flush()

    // State should remain unchanged
    expect(state.read()).toEqual({ name: 'Alice', count: 0 })

    scope.stop()
  })

  it('works with primitive state values', () => {
    const scope = effectScope()
    let state!: Started<number>

    scope.run(() => {
      state = start(0)
    })

    expect(state.read()).toBe(0)

    void state.setState(42)
    expect(state.read()).toBe(42)

    void state.setState((prev) => prev + 1)
    expect(state.read()).toBe(43)

    scope.stop()
  })

  it('works with string state values', () => {
    const scope = effectScope()
    let state!: Started<string>

    scope.run(() => {
      state = start('hello')
    })

    expect(state.read()).toBe('hello')

    void state.setState('world')
    expect(state.read()).toBe('world')

    scope.stop()
  })
})
