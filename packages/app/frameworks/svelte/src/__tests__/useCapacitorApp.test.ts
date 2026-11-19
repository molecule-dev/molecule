/**
 * `useCapacitorApp` in Svelte's idiom: the coordinator is created during
 * component init, its state fields are readable stores and `initialize` is a
 * plain function. The `svelte` lifecycle is stubbed, so "mount" is running the
 * hook and "unmount" is running its destroy callbacks.
 *
 * @module
 */

import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CapacitorAppState } from '@molecule/app-platform'

import { useCapacitorApp, type UseCapacitorAppResult } from '../hooks/useCapacitorApp.js'

// --- Mock svelte's component lifecycle ---
const lifecycle = vi.hoisted(() => ({ destroyCallbacks: [] as Array<() => void> }))

vi.mock('svelte', () => ({
  getContext: (): unknown => undefined,
  setContext: (): void => {},
  onMount: (): void => {},
  onDestroy: (callback: () => void): void => {
    lifecycle.destroyCallbacks.push(callback)
  },
  untrack: <T>(callback: () => T): T => callback(),
}))

// --- A programmable Capacitor coordinator ---
const platform = vi.hoisted(() => {
  let state: CapacitorAppState = { ready: false, deviceReady: false, pushReady: true, error: null }
  const listeners = new Set<(next: CapacitorAppState) => void>()
  const initialize = vi.fn(async (): Promise<void> => {})
  const isReady = vi.fn(() => state.ready)
  const getState = vi.fn(() => state)
  const subscribe = vi.fn((callback: (next: CapacitorAppState) => void): (() => void) => {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  })
  const onReady = vi.fn((): (() => void) => () => {})
  const destroy = vi.fn()
  return {
    initialize,
    isReady,
    getState,
    subscribe,
    onReady,
    destroy,
    /** Pushes a new coordinator state to the subscribers, like the real one. */
    setState: (next: CapacitorAppState): void => {
      state = next
      for (const listener of [...listeners]) listener(state)
    },
    /** Restores the initial state and drops the subscribers. */
    reset: (): void => {
      state = { ready: false, deviceReady: false, pushReady: true, error: null }
      listeners.clear()
    },
  }
})

vi.mock('@molecule/app-platform', () => ({
  createCapacitorApp: () => ({
    initialize: platform.initialize,
    isReady: platform.isReady,
    getState: platform.getState,
    subscribe: platform.subscribe,
    onReady: platform.onReady,
    destroy: platform.destroy,
  }),
}))

/**
 * Runs the hook once, the way a component's init does, then exposes the
 * component's destroy callbacks as `unmount`.
 *
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the unmount that runs its destroy callbacks.
 */
function renderHook<T>(run: () => T): { result: T; unmount: () => void } {
  lifecycle.destroyCallbacks.length = 0
  const result = run()
  return {
    result,
    unmount: () => {
      for (const callback of lifecycle.destroyCallbacks.splice(0)) callback()
    },
  }
}

describe('useCapacitorApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platform.reset()
  })

  it('returns initial state with ready=false', () => {
    const { result }: { result: UseCapacitorAppResult } = renderHook(() => useCapacitorApp())

    expect(get(result.ready)).toBe(false)
    expect(get(result.deviceReady)).toBe(false)
    expect(get(result.pushReady)).toBe(true)
    expect(get(result.error)).toBe(null)
    expect(typeof result.initialize).toBe('function')
  })

  it('auto-initializes on mount', async () => {
    renderHook(() => useCapacitorApp())

    await vi.waitFor(() => {
      expect(platform.initialize).toHaveBeenCalledOnce()
    })
  })

  it('updates state when app becomes ready', () => {
    const { result } = renderHook(() => useCapacitorApp())

    expect(get(result.ready)).toBe(false)

    // The coordinator reports that the app is ready through its own state.
    platform.setState({
      ready: true,
      deviceReady: true,
      pushReady: true,
      error: null,
    })

    expect(get(result.ready)).toBe(true)
    expect(get(result.deviceReady)).toBe(true)
  })

  it('cleans up on unmount by calling destroy', () => {
    const { unmount } = renderHook(() => useCapacitorApp())

    expect(platform.destroy).not.toHaveBeenCalled()

    unmount()

    expect(platform.destroy).toHaveBeenCalledOnce()
  })
})
