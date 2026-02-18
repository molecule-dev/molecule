// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach,describe, expect, it, vi } from 'vitest'

import { useCapacitorApp } from '../useCapacitorApp.js'

// Mock the platform module
const mockInitialize = vi.fn().mockResolvedValue(undefined)
const mockIsReady = vi.fn().mockReturnValue(false)
const mockGetState = vi.fn()
const mockSubscribe = vi.fn()
const mockOnReady = vi.fn().mockReturnValue(() => {})
const mockDestroy = vi.fn()

vi.mock('@molecule/app-platform', () => ({
  createCapacitorApp: vi.fn(() => ({
    initialize: mockInitialize,
    isReady: mockIsReady,
    getState: mockGetState,
    subscribe: mockSubscribe,
    onReady: mockOnReady,
    destroy: mockDestroy,
  })),
}))

describe('useCapacitorApp', () => {
  let subscriberCallback: ((state: unknown) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    subscriberCallback = null

    mockGetState.mockReturnValue({
      ready: false,
      deviceReady: false,
      pushReady: true,
      error: null,
    })

    mockSubscribe.mockImplementation((cb: (state: unknown) => void) => {
      subscriberCallback = cb
      return () => {
        subscriberCallback = null
      }
    })

    mockInitialize.mockResolvedValue(undefined)
  })

  it('returns initial state with ready=false', () => {
    const { result } = renderHook(() => useCapacitorApp())

    expect(result.current.ready).toBe(false)
    expect(result.current.deviceReady).toBe(false)
    expect(result.current.pushReady).toBe(true)
    expect(result.current.error).toBe(null)
    expect(typeof result.current.initialize).toBe('function')
  })

  it('auto-initializes on mount', async () => {
    renderHook(() => useCapacitorApp())

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalledOnce()
    })
  })

  it('updates state when app becomes ready', async () => {
    const { result } = renderHook(() => useCapacitorApp())

    expect(result.current.ready).toBe(false)

    // Simulate the coordinator pushing a state update via subscribe callback
    act(() => {
      subscriberCallback?.({
        ready: true,
        deviceReady: true,
        pushReady: true,
        error: null,
      })
    })

    expect(result.current.ready).toBe(true)
    expect(result.current.deviceReady).toBe(true)
  })

  it('cleans up on unmount by calling destroy', () => {
    const { unmount } = renderHook(() => useCapacitorApp())

    expect(mockDestroy).not.toHaveBeenCalled()

    unmount()

    expect(mockDestroy).toHaveBeenCalledOnce()
  })
})
