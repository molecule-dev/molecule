import { createRoot } from 'solid-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCapacitorApp } from '../capacitor-app.js'

let subscribeCallback: ((state: unknown) => void) | null = null

const mockApp = {
  initialize: vi.fn(),
  isReady: vi.fn(),
  getState: vi.fn(),
  subscribe: vi.fn((cb: (state: unknown) => void) => {
    subscribeCallback = cb
    return vi.fn()
  }),
  onReady: vi.fn(),
  destroy: vi.fn(),
}

vi.mock('@molecule/app-platform', () => ({
  createCapacitorApp: () => mockApp,
}))

describe('createCapacitorApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    subscribeCallback = null
    mockApp.getState.mockReturnValue({
      ready: false,
      deviceReady: false,
      pushReady: false,
      error: null,
    })
    mockApp.initialize.mockResolvedValue(undefined)
    mockApp.subscribe.mockImplementation((cb: (state: unknown) => void) => {
      subscribeCallback = cb
      return vi.fn()
    })
  })

  it('returns initial state', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, ready } = createCapacitorApp()

        expect(state()).toEqual({
          ready: false,
          deviceReady: false,
          pushReady: false,
          error: null,
        })
        expect(ready()).toBe(false)

        dispose()
        resolve()
      })
    })
  })

  it('auto-initializes on creation', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        createCapacitorApp()

        expect(mockApp.initialize).toHaveBeenCalledTimes(1)

        dispose()
        resolve()
      })
    })
  })

  it('updates signals when state changes', () => {
    return new Promise<void>((resolve) => {
      createRoot((dispose) => {
        const { state, ready } = createCapacitorApp()

        expect(ready()).toBe(false)

        // Simulate state change via subscribe callback
        subscribeCallback!({
          ready: true,
          deviceReady: true,
          pushReady: true,
          error: null,
        })

        expect(state()).toEqual({
          ready: true,
          deviceReady: true,
          pushReady: true,
          error: null,
        })
        expect(ready()).toBe(true)

        dispose()
        resolve()
      })
    })
  })

  it('cleans up on dispose', () => {
    return new Promise<void>((resolve) => {
      const unsubscribe = vi.fn()
      mockApp.subscribe.mockImplementation((cb: (state: unknown) => void) => {
        subscribeCallback = cb
        return unsubscribe
      })

      createRoot((dispose) => {
        createCapacitorApp()

        dispose()

        expect(unsubscribe).toHaveBeenCalled()
        expect(mockApp.destroy).toHaveBeenCalled()

        resolve()
      })
    })
  })
})
