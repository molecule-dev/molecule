import { firstValueFrom, take, toArray } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createCapacitorAppState } from '../capacitor-app.service.js'

type StateCallback = (state: {
  ready: boolean
  deviceReady: boolean
  pushReady: boolean
  error: Error | null
}) => void

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createMockApp = () => {
  const subscribers = new Set<StateCallback>()
  let state = {
    ready: false,
    deviceReady: false,
    pushReady: true,
    error: null as Error | null,
  }

  return {
    initialize: vi.fn(async () => {
      state = { ...state, deviceReady: true, ready: true }
      for (const cb of subscribers) {
        cb(state)
      }
    }),
    isReady: vi.fn(() => state.ready),
    getState: vi.fn(() => state),
    subscribe: vi.fn((callback: StateCallback) => {
      subscribers.add(callback)
      return () => subscribers.delete(callback)
    }),
    onReady: vi.fn(() => () => {}),
    destroy: vi.fn(),
    _emit(partial: Partial<typeof state>) {
      state = { ...state, ...partial }
      for (const cb of subscribers) {
        cb(state)
      }
    },
  }
}

let mockApp: ReturnType<typeof createMockApp>

vi.mock('@molecule/app-platform', () => ({
  createCapacitorApp: vi.fn(() => mockApp),
}))

describe('createCapacitorAppState', () => {
  beforeEach(() => {
    mockApp = createMockApp()
  })

  it('should emit initial state', async () => {
    const manager = createCapacitorAppState()

    const state = await firstValueFrom(manager.state$)

    expect(state).toEqual({
      ready: false,
      deviceReady: false,
      pushReady: true,
      error: null,
    })
  })

  it('should auto-initialize when initialize is called', async () => {
    const manager = createCapacitorAppState()

    await manager.initialize()

    expect(mockApp.initialize).toHaveBeenCalledOnce()
  })

  it('should update observable when state changes', async () => {
    const manager = createCapacitorAppState()

    const statesPromise = firstValueFrom(manager.state$.pipe(take(2), toArray()))

    mockApp._emit({ deviceReady: true, ready: true })

    const states = await statesPromise

    expect(states).toHaveLength(2)
    expect(states[0].ready).toBe(false)
    expect(states[1].ready).toBe(true)
    expect(states[1].deviceReady).toBe(true)
  })

  it('should emit ready$ as distinct boolean observable', async () => {
    const manager = createCapacitorAppState()

    const readyPromise = firstValueFrom(manager.ready$.pipe(take(2), toArray()))

    mockApp._emit({ deviceReady: true, ready: true })

    const values = await readyPromise

    expect(values).toEqual([false, true])
  })

  it('should clean up on destroy', () => {
    const manager = createCapacitorAppState()

    let completed = false
    manager.state$.subscribe({ complete: () => (completed = true) })

    manager.destroy()

    expect(mockApp.destroy).toHaveBeenCalledOnce()
    expect(completed).toBe(true)
  })
})
