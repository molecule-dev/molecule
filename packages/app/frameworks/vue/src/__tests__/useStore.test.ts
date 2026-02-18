/**
 * Tests for useStore composable
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockInjectReturnValue: unknown = undefined
const onUnmountedCallbacks: Array<() => void> = []

// Mock Vue
vi.mock('vue', () => ({
  inject: vi.fn(() => mockInjectReturnValue),
  ref: vi.fn((v: unknown) => ({ value: v })),
  computed: vi.fn((fn: () => unknown) => ({ value: fn(), effect: fn })),
  onUnmounted: vi.fn((cb: () => void) => {
    onUnmountedCallbacks.push(cb)
  }),
  onMounted: vi.fn(),
}))

// Mock molecule packages
vi.mock('@molecule/app-state', () => ({}))
vi.mock('@molecule/app-auth', () => ({}))
vi.mock('@molecule/app-theme', () => ({}))
vi.mock('@molecule/app-routing', () => ({}))
vi.mock('@molecule/app-i18n', () => ({}))
vi.mock('@molecule/app-http', () => ({}))
vi.mock('@molecule/app-storage', () => ({}))
vi.mock('@molecule/app-logger', () => ({}))
vi.mock('@molecule/app-forms', () => ({}))
vi.mock('@molecule/app-ui', () => ({}))

import {
  useSetStore,
  useStateProvider,
  useStore,
  useStoreComputed,
} from '../composables/useStore.js'

describe('useStateProvider', () => {
  beforeEach(() => {
    mockInjectReturnValue = undefined
    onUnmountedCallbacks.length = 0
  })

  it('returns the injected state provider', () => {
    const mockProvider = { createStore: vi.fn() }
    mockInjectReturnValue = mockProvider
    const result = useStateProvider()
    expect(result).toBe(mockProvider)
  })

  it('throws when state provider is not injected', () => {
    mockInjectReturnValue = undefined
    expect(() => useStateProvider()).toThrow(
      'useStateProvider requires StateProvider to be provided',
    )
  })
})

describe('useStore', () => {
  let subscribeCallback: (() => void) | null
  let mockStore: {
    getState: ReturnType<typeof vi.fn>
    setState: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
  }
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    mockInjectReturnValue = undefined
    onUnmountedCallbacks.length = 0
    subscribeCallback = null
    mockUnsubscribe.mockClear()

    mockStore = {
      getState: vi.fn(() => ({ count: 0, name: 'test' })),
      setState: vi.fn(),
      subscribe: vi.fn((cb: () => void) => {
        subscribeCallback = cb
        return mockUnsubscribe
      }),
    }
  })

  it('returns a reactive ref with initial state', () => {
    const result = useStore(mockStore)
    expect(result.value).toEqual({ count: 0, name: 'test' })
  })

  it('subscribes to store changes', () => {
    useStore(mockStore)
    expect(mockStore.subscribe).toHaveBeenCalledTimes(1)
  })

  it('updates state when store emits changes', () => {
    const result = useStore(mockStore)
    mockStore.getState.mockReturnValue({ count: 5, name: 'updated' })
    subscribeCallback!()
    expect(result.value).toEqual({ count: 5, name: 'updated' })
  })

  it('applies selector to initial state', () => {
    const result = useStore(mockStore as never, { selector: (s: { count: number }) => s.count })
    expect(result.value).toBe(0)
  })

  it('applies selector on state updates', () => {
    const result = useStore(mockStore as never, { selector: (s: { count: number }) => s.count })
    mockStore.getState.mockReturnValue({ count: 10, name: 'updated' })
    subscribeCallback!()
    expect(result.value).toBe(10)
  })

  it('unsubscribes on unmount', () => {
    useStore(mockStore)
    expect(onUnmountedCallbacks.length).toBe(1)
    onUnmountedCallbacks[0]()
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })

  it('works without options argument', () => {
    const result = useStore(mockStore)
    expect(result.value).toEqual({ count: 0, name: 'test' })
  })
})

describe('useSetStore', () => {
  it('returns the setState function from the store', () => {
    const setStateFn = vi.fn()
    const mockStore = {
      getState: vi.fn(),
      setState: setStateFn,
      subscribe: vi.fn(),
    }
    const result = useSetStore(mockStore as never)
    expect(result).toBe(setStateFn)
  })
})

describe('useStoreComputed', () => {
  beforeEach(() => {
    mockInjectReturnValue = undefined
    onUnmountedCallbacks.length = 0
  })

  it('returns a computed ref derived from a selector', () => {
    const mockStore = {
      getState: vi.fn(() => ({ count: 42, label: 'items' })),
      setState: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    }

    const result = useStoreComputed(mockStore as never, (s: { count: number }) => s.count)
    // computed mock returns fn() result
    expect(result.value).toBeDefined()
  })
})
