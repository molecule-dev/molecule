// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VersionEvent, VersionProvider, VersionState } from '@molecule/app-version'

vi.mock('@molecule/app-version', () => ({
  getProvider: vi.fn(),
}))

import { getProvider } from '@molecule/app-version'

import { useVersion } from '../useVersion.js'

const createMockProvider = (initialState?: Partial<VersionState>): VersionProvider => {
  let state: VersionState = {
    buildId: 'abc123',
    version: '1.0.0',
    isUpdateAvailable: false,
    isServiceWorkerWaiting: false,
    isChecking: false,
    ...initialState,
  }

  const listeners = new Map<string, Set<() => void>>()

  return {
    getState: () => ({ ...state }),
    setCurrentVersion: vi.fn(),
    checkForUpdates: vi.fn(async () => {
      state = { ...state, isChecking: true }
      listeners.get('check-start')?.forEach((fn) => fn())
      state = { ...state, isChecking: false }
      listeners.get('check-complete')?.forEach((fn) => fn())
      return false
    }),
    startPeriodicChecks: vi.fn(),
    stopPeriodicChecks: vi.fn(),
    getServiceWorker: vi.fn(),
    applyUpdate: vi.fn(),
    dismissUpdate: vi.fn(() => {
      state = { ...state, isUpdateAvailable: false }
    }),
    on: vi.fn((event: VersionEvent, handler: () => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(handler)
      return () => listeners.get(event)?.delete(handler)
    }),
    off: vi.fn(),
    destroy: vi.fn(),
    _setState: (partial: Partial<VersionState>) => {
      state = { ...state, ...partial }
    },
    _emit: (event: string) => {
      listeners.get(event)?.forEach((fn) => fn())
    },
  } as VersionProvider & {
    _setState: (partial: Partial<VersionState>) => void
    _emit: (event: string) => void
  }
}

describe('useVersion', () => {
  let mockProvider: ReturnType<typeof createMockProvider>

  beforeEach(() => {
    mockProvider = createMockProvider()
    vi.mocked(getProvider).mockReturnValue(mockProvider)
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useVersion())

    expect(result.current.state.version).toBe('1.0.0')
    expect(result.current.state.buildId).toBe('abc123')
    expect(result.current.isUpdateAvailable).toBe(false)
    expect(result.current.isChecking).toBe(false)
    expect(result.current.isServiceWorkerWaiting).toBe(false)
    expect(result.current.newVersion).toBeUndefined()
  })

  it('subscribes to all 6 version events', () => {
    renderHook(() => useVersion())

    const onCalls = vi.mocked(mockProvider.on).mock.calls
    const subscribedEvents = onCalls.map(([event]) => event)

    expect(subscribedEvents).toContain('update-available')
    expect(subscribedEvents).toContain('service-worker-waiting')
    expect(subscribedEvents).toContain('service-worker-activated')
    expect(subscribedEvents).toContain('check-start')
    expect(subscribedEvents).toContain('check-complete')
    expect(subscribedEvents).toContain('check-error')
    expect(onCalls).toHaveLength(6)
  })

  it('updates state when events fire', () => {
    const { result } = renderHook(() => useVersion())

    expect(result.current.isUpdateAvailable).toBe(false)

    act(() => {
      ;(mockProvider as unknown as { _setState: (p: Partial<VersionState>) => void })._setState({
        isUpdateAvailable: true,
        newVersion: '2.0.0',
      })
      ;(mockProvider as unknown as { _emit: (e: string) => void })._emit('update-available')
    })

    expect(result.current.isUpdateAvailable).toBe(true)
    expect(result.current.newVersion).toBe('2.0.0')
  })

  it('caches snapshot for referential stability', () => {
    const { result, rerender } = renderHook(() => useVersion())

    const firstState = result.current.state
    rerender()
    const secondState = result.current.state

    // Same reference since nothing changed
    expect(firstState).toBe(secondState)
  })

  it('delegates checkForUpdates to provider', async () => {
    const { result } = renderHook(() => useVersion())

    await act(async () => {
      await result.current.checkForUpdates()
    })

    expect(mockProvider.checkForUpdates).toHaveBeenCalledOnce()
  })

  it('delegates applyUpdate to provider', () => {
    const { result } = renderHook(() => useVersion())

    act(() => {
      result.current.applyUpdate({ force: true })
    })

    expect(mockProvider.applyUpdate).toHaveBeenCalledWith({ force: true })
  })

  it('delegates dismissUpdate to provider', () => {
    const { result } = renderHook(() => useVersion())

    act(() => {
      result.current.dismissUpdate()
    })

    expect(mockProvider.dismissUpdate).toHaveBeenCalledOnce()
  })

  it('delegates startPeriodicChecks to provider', () => {
    const { result } = renderHook(() => useVersion())

    act(() => {
      result.current.startPeriodicChecks({ interval: 30000, immediate: true })
    })

    expect(mockProvider.startPeriodicChecks).toHaveBeenCalledWith({
      interval: 30000,
      immediate: true,
    })
  })

  it('delegates stopPeriodicChecks to provider', () => {
    const { result } = renderHook(() => useVersion())

    act(() => {
      result.current.stopPeriodicChecks()
    })

    expect(mockProvider.stopPeriodicChecks).toHaveBeenCalledOnce()
  })

  it('unsubscribes from all events on unmount', () => {
    const unsubFns = Array.from({ length: 6 }, () => vi.fn())
    let callIndex = 0
    vi.mocked(mockProvider.on).mockImplementation(() => {
      const unsub = unsubFns[callIndex]
      callIndex++
      return unsub
    })

    const { unmount } = renderHook(() => useVersion())

    unsubFns.forEach((fn) => expect(fn).not.toHaveBeenCalled())

    unmount()

    unsubFns.forEach((fn) => expect(fn).toHaveBeenCalledOnce())
  })
})
