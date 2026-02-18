import { describe, expect, it } from 'vitest'
import { effectScope } from 'vue'

import { useAsyncState, type UseAsyncStateReturn } from '../useAsyncState.js'

const flush = (): Promise<void> => new Promise<void>((r) => setTimeout(r, 0))

interface TestState {
  name: string
  count: number
}

describe('useAsyncState', () => {
  it('returns initial state', () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    expect(result.state.value).toEqual({ name: 'Alice', count: 0 })

    scope.stop()
  })

  it('sync setState replaces state', () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    result.setState({ name: 'Bob', count: 5 })

    expect(result.state.value).toEqual({ name: 'Bob', count: 5 })

    scope.stop()
  })

  it('function setState uses previous value', () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    result.setState((prev) => ({ ...prev, count: prev.count + 1 }))

    expect(result.state.value).toEqual({ name: 'Alice', count: 1 })

    scope.stop()
  })

  it('promise setState resolves and sets value', async () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    result.setState(Promise.resolve({ name: 'Charlie', count: 10 }))

    // Value should not have changed yet (async)
    expect(result.state.value).toEqual({ name: 'Alice', count: 0 })

    await flush()

    expect(result.state.value).toEqual({ name: 'Charlie', count: 10 })

    scope.stop()
  })

  it('promise setState with function updater', async () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    result.setState(Promise.resolve((prev: TestState) => ({ ...prev, count: prev.count + 100 })))

    await flush()

    expect(result.state.value).toEqual({ name: 'Alice', count: 100 })

    scope.stop()
  })

  it('extendState merges partial value', () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    result.extendState({ count: 42 })

    expect(result.state.value).toEqual({ name: 'Alice', count: 42 })

    scope.stop()
  })

  it('extendState with function updater', () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    result.extendState((prev) => ({ name: prev.name.toUpperCase() }))

    expect(result.state.value).toEqual({ name: 'ALICE', count: 0 })

    scope.stop()
  })

  it('promise extendState merges after resolution', async () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    result.extendState(Promise.resolve({ count: 99 }))

    // Not yet resolved
    expect(result.state.value).toEqual({ name: 'Alice', count: 0 })

    await flush()

    expect(result.state.value).toEqual({ name: 'Alice', count: 99 })

    scope.stop()
  })

  it('promise extendState with function updater', async () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 5 })
    })

    result.extendState(Promise.resolve((prev: TestState) => ({ count: prev.count * 2 })))

    await flush()

    expect(result.state.value).toEqual({ name: 'Alice', count: 10 })

    scope.stop()
  })

  it('rejected promise in setState is handled silently', async () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    // This should not throw
    result.setState(Promise.reject(new Error('fail')))

    await flush()

    // State should remain unchanged
    expect(result.state.value).toEqual({ name: 'Alice', count: 0 })

    scope.stop()
  })

  it('rejected promise in extendState is handled silently', async () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<TestState>

    scope.run(() => {
      result = useAsyncState<TestState>({ name: 'Alice', count: 0 })
    })

    // This should not throw
    result.extendState(Promise.reject(new Error('fail')))

    await flush()

    // State should remain unchanged
    expect(result.state.value).toEqual({ name: 'Alice', count: 0 })

    scope.stop()
  })

  it('works with primitive state values', () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<number>

    scope.run(() => {
      result = useAsyncState(0)
    })

    expect(result.state.value).toBe(0)

    result.setState(42)
    expect(result.state.value).toBe(42)

    result.setState((prev) => prev + 1)
    expect(result.state.value).toBe(43)

    scope.stop()
  })

  it('works with string state values', () => {
    const scope = effectScope()
    let result!: UseAsyncStateReturn<string>

    scope.run(() => {
      result = useAsyncState('hello')
    })

    expect(result.state.value).toBe('hello')

    result.setState('world')
    expect(result.state.value).toBe('world')

    scope.stop()
  })
})
