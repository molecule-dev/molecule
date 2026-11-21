// @vitest-environment jsdom
import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, effectScope, h, nextTick } from 'vue'

import type { CapacitorApp, CapacitorAppState } from '@molecule/app-platform'

import type { UseCapacitorAppResult } from '../useCapacitorApp.js'

// Mock @molecule/app-platform
const mockSubscribe = vi.fn<(cb: (state: CapacitorAppState) => void) => () => void>()
const mockInitialize = vi.fn<() => Promise<void>>()
const mockDestroy = vi.fn()
const mockGetState = vi.fn<() => CapacitorAppState>()
const mockIsReady = vi.fn<() => boolean>()
const mockOnReady = vi.fn<(cb: () => void) => () => void>()

const mockApp: CapacitorApp = {
  initialize: mockInitialize,
  isReady: mockIsReady,
  getState: mockGetState,
  subscribe: mockSubscribe,
  onReady: mockOnReady,
  destroy: mockDestroy,
}

vi.mock('@molecule/app-platform', () => ({
  createCapacitorApp: vi.fn(() => mockApp),
}))

// Must import after mock setup
const { useCapacitorApp } = await import('../useCapacitorApp.js')
const { createCapacitorApp } = await import('@molecule/app-platform')

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Runs `useCapacitorApp` inside a mounted component.
 *
 * @returns The mounted wrapper and the composable result.
 */
function mountApp(): { wrapper: VueWrapper; result: UseCapacitorAppResult } {
  let captured: UseCapacitorAppResult | null = null
  const Probe = defineComponent({
    setup() {
      captured = useCapacitorApp()
      return () => h('div')
    },
  })
  const wrapper = mount(Probe)
  wrappers.push(wrapper)
  if (!captured) throw new Error('useCapacitorApp setup did not run')
  return { wrapper, result: captured }
}

describe('useCapacitorApp', () => {
  const initialState: CapacitorAppState = {
    ready: false,
    deviceReady: false,
    pushReady: true,
    error: null,
  }

  let subscriberCallback: ((state: CapacitorAppState) => void) | null

  beforeEach(() => {
    vi.clearAllMocks()
    subscriberCallback = null

    mockGetState.mockReturnValue({ ...initialState })
    mockIsReady.mockReturnValue(false)
    mockInitialize.mockResolvedValue(undefined)
    mockSubscribe.mockImplementation((cb) => {
      subscriberCallback = cb
      return vi.fn()
    })
    mockOnReady.mockReturnValue(vi.fn())
  })

  it('returns initial state', () => {
    const scope = effectScope()

    scope.run(() => {
      const { ready, deviceReady, pushReady, error } = useCapacitorApp()

      expect(ready.value).toBe(false)
      expect(deviceReady.value).toBe(false)
      expect(pushReady.value).toBe(true)
      expect(error.value).toBeNull()
    })

    scope.stop()
  })

  it('auto-initializes eagerly in effect scope', () => {
    const scope = effectScope()

    scope.run(() => {
      useCapacitorApp()
    })

    // In an effectScope (no component instance), initialize is called eagerly
    expect(mockInitialize).toHaveBeenCalledOnce()

    scope.stop()
  })

  it('passes options to createCapacitorApp', () => {
    const scope = effectScope()
    const options = {
      pushNotifications: true,
      deepLinks: true,
      onDeepLink: vi.fn(),
    }

    scope.run(() => {
      useCapacitorApp(options)
    })

    expect(createCapacitorApp).toHaveBeenCalledWith(options)

    scope.stop()
  })

  it('updates state reactively via subscribe', async () => {
    const scope = effectScope()
    let result: ReturnType<typeof useCapacitorApp> | undefined

    scope.run(() => {
      result = useCapacitorApp()
    })

    expect(result!.ready.value).toBe(false)
    expect(result!.deviceReady.value).toBe(false)

    // Simulate state change via subscriber
    const updatedState: CapacitorAppState = {
      ready: true,
      deviceReady: true,
      pushReady: true,
      error: null,
    }

    subscriberCallback!(updatedState)
    await nextTick()

    expect(result!.ready.value).toBe(true)
    expect(result!.deviceReady.value).toBe(true)
    expect(result!.pushReady.value).toBe(true)
    expect(result!.error.value).toBeNull()

    scope.stop()
  })

  it('updates error state reactively', async () => {
    const scope = effectScope()
    let result: ReturnType<typeof useCapacitorApp> | undefined

    scope.run(() => {
      result = useCapacitorApp()
    })

    const testError = new Error('init failed')
    const errorState: CapacitorAppState = {
      ready: false,
      deviceReady: false,
      pushReady: true,
      error: testError,
    }

    subscriberCallback!(errorState)
    await nextTick()

    expect(result!.error.value).toBe(testError)
    expect(result!.ready.value).toBe(false)

    scope.stop()
  })

  it('cleans up on scope dispose', () => {
    const mockUnsub = vi.fn()
    mockSubscribe.mockReturnValue(mockUnsub)

    const scope = effectScope()

    scope.run(() => {
      useCapacitorApp()
    })

    scope.stop()

    expect(mockUnsub).toHaveBeenCalledOnce()
    expect(mockDestroy).toHaveBeenCalledOnce()
  })

  it('exposes initialize method that delegates to app', async () => {
    const scope = effectScope()
    let result: ReturnType<typeof useCapacitorApp> | undefined

    scope.run(() => {
      result = useCapacitorApp()
    })

    await result!.initialize()

    // Once from auto-init and once from manual call
    expect(mockInitialize).toHaveBeenCalledTimes(2)

    scope.stop()
  })
})

/**
 * The React hook's own cases, carried over title for title. A composable runs
 * in `setup()`, so these mount a `Probe` component, the Vue counterpart of a
 * rendered hook.
 */
describe('useCapacitorApp (React cases)', () => {
  let subscriberCallback: ((state: CapacitorAppState) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    subscriberCallback = null

    mockGetState.mockReturnValue({
      ready: false,
      deviceReady: false,
      pushReady: true,
      error: null,
    })
    mockInitialize.mockResolvedValue(undefined)
    mockSubscribe.mockImplementation((callback: (state: CapacitorAppState) => void) => {
      subscriberCallback = callback
      return () => {
        subscriberCallback = null
      }
    })
    mockOnReady.mockReturnValue(() => {})
  })

  it('returns initial state with ready=false', () => {
    const { result } = mountApp()

    expect(result.ready.value).toBe(false)
    expect(result.deviceReady.value).toBe(false)
    expect(result.pushReady.value).toBe(true)
    expect(result.error.value).toBe(null)
    expect(typeof result.initialize).toBe('function')
  })

  it('auto-initializes on mount', async () => {
    mountApp()

    await vi.waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledOnce()
    })
  })

  it('updates state when app becomes ready', () => {
    const { result } = mountApp()

    expect(result.ready.value).toBe(false)

    // Simulate the coordinator pushing a state update via subscribe callback
    subscriberCallback?.({
      ready: true,
      deviceReady: true,
      pushReady: true,
      error: null,
    })

    expect(result.ready.value).toBe(true)
    expect(result.deviceReady.value).toBe(true)
  })

  it('cleans up on unmount by calling destroy', () => {
    const { wrapper } = mountApp()

    expect(mockDestroy).not.toHaveBeenCalled()

    wrapper.unmount()

    expect(mockDestroy).toHaveBeenCalledOnce()
  })
})
