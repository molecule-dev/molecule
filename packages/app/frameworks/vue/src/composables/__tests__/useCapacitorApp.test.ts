import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'

import type { CapacitorApp, CapacitorAppState } from '@molecule/app-platform'

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
