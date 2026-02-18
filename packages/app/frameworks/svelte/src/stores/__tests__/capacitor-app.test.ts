import { get } from 'svelte/store'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCapacitorAppStore } from '../capacitor-app.js'

vi.mock('@molecule/app-platform', () => ({
  createCapacitorApp: vi.fn(),
}))

import { createCapacitorApp } from '@molecule/app-platform'

const mockCreateCapacitorApp = createCapacitorApp as ReturnType<typeof vi.fn>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockApp() {
  const listeners = new Set<(state: Record<string, unknown>) => void>()
  let state = {
    ready: false,
    deviceReady: false,
    pushReady: true,
    error: null as Error | null,
  }

  return {
    initialize: vi.fn(async () => {
      await Promise.resolve()
      state = { ...state, deviceReady: true, ready: true }
      for (const listener of listeners) {
        listener(state)
      }
    }),
    isReady: vi.fn(() => state.ready),
    getState: vi.fn(() => state),
    subscribe: vi.fn((callback: (s: typeof state) => void) => {
      listeners.add(callback)
      return () => listeners.delete(callback)
    }),
    onReady: vi.fn(() => vi.fn()),
    destroy: vi.fn(),
    _setState(partial: Partial<typeof state>) {
      state = { ...state, ...partial }
      for (const listener of listeners) {
        listener(state)
      }
    },
  }
}

describe('createCapacitorAppStore', () => {
  let mockApp: ReturnType<typeof createMockApp>

  beforeEach(() => {
    mockApp = createMockApp()
    mockCreateCapacitorApp.mockReturnValue(mockApp)
  })

  it('should return initial state via subscribe', () => {
    const store = createCapacitorAppStore()
    const state = get(store)

    expect(state).toEqual({
      ready: false,
      deviceReady: false,
      pushReady: true,
      error: null,
    })
  })

  it('should auto-initialize', () => {
    createCapacitorAppStore()

    // Subscribe to activate the readable store (svelte lazy-starts readables)
    const store = createCapacitorAppStore()
    const values: unknown[] = []
    store.subscribe((v) => values.push(v))

    expect(mockApp.initialize).toHaveBeenCalled()
  })

  it('should update store when state changes', async () => {
    const store = createCapacitorAppStore()
    const values: unknown[] = []
    store.subscribe((v) => values.push(v))

    // Wait for auto-initialize to complete
    await vi.waitFor(() => {
      expect(mockApp.initialize).toHaveBeenCalled()
    })

    // Simulate a state change via the captured subscriber
    mockApp._setState({ ready: true, deviceReady: true })

    const current = get(store)
    expect(current.ready).toBe(true)
    expect(current.deviceReady).toBe(true)
  })

  it('should provide initialize method', async () => {
    const store = createCapacitorAppStore()
    // Subscribe to activate the store
    store.subscribe(() => {})

    await store.initialize()

    expect(mockApp.initialize).toHaveBeenCalled()
  })

  it('should pass options to createCapacitorApp', () => {
    const options = {
      pushNotifications: true,
      deepLinks: true,
      onDeepLink: vi.fn(),
    }

    const store = createCapacitorAppStore(options)
    store.subscribe(() => {})

    expect(mockCreateCapacitorApp).toHaveBeenCalledWith(options)
  })

  it('should clean up on unsubscribe', () => {
    const store = createCapacitorAppStore()
    const unsubscribe = store.subscribe(() => {})

    unsubscribe()

    expect(mockApp.destroy).toHaveBeenCalled()
  })
})
