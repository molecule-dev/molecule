import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@angular/core', () => ({
  Injectable: () => (target: unknown) => target,
  Inject: () => () => undefined,
  InjectionToken: class InjectionToken {
    _desc: string
    constructor(desc: string) {
      this._desc = desc
    }
  },
}))

vi.mock('@molecule/app-auth', () => ({}))
vi.mock('@molecule/app-http', () => ({}))
vi.mock('@molecule/app-i18n', () => ({}))
vi.mock('@molecule/app-logger', () => ({}))
vi.mock('@molecule/app-routing', () => ({}))
vi.mock('@molecule/app-state', () => ({}))
vi.mock('@molecule/app-storage', () => ({}))
vi.mock('@molecule/app-theme', () => ({}))

import { MoleculeStateService } from '../services/state.service.js'

describe('MoleculeStateService', () => {
  let service: MoleculeStateService
  let mockProvider: Record<string, ReturnType<typeof vi.fn>>

  function createMockStore<T>(initialState: T): {
    getState: ReturnType<typeof vi.fn>
    setState: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
    _getListenerCount: () => number
  } {
    let state = initialState
    const listeners: Array<() => void> = []

    return {
      getState: vi.fn(() => state),
      setState: vi.fn((partial: Partial<T> | ((s: T) => Partial<T>)) => {
        const updates = typeof partial === 'function' ? partial(state) : partial
        state = { ...state, ...updates }
        listeners.forEach((l) => l())
      }),
      subscribe: vi.fn((listener: () => void) => {
        listeners.push(listener)
        return () => {
          const idx = listeners.indexOf(listener)
          if (idx >= 0) listeners.splice(idx, 1)
        }
      }),
      destroy: vi.fn(),
      _getListenerCount: () => listeners.length,
    }
  }

  beforeEach(() => {
    mockProvider = {
      createStore: vi.fn(),
    }

    service = new MoleculeStateService(mockProvider)
  })

  describe('observe', () => {
    it('should return an observable of the store state', async () => {
      const store = createMockStore({ count: 0 })
      const state = await firstValueFrom(service.observe(store as unknown))

      expect(state).toEqual({ count: 0 })
    })

    it('should emit when the store state changes', () => {
      const store = createMockStore({ count: 0 })
      const states: unknown[] = []

      service.observe(store as unknown).subscribe((s) => states.push(s))

      store.setState({ count: 1 })
      store.setState({ count: 2 })

      expect(states).toHaveLength(3)
      expect(states[0]).toEqual({ count: 0 })
      expect(states[1]).toEqual({ count: 1 })
      expect(states[2]).toEqual({ count: 2 })
    })

    it('should reuse the same subject for the same store', () => {
      const store = createMockStore({ count: 0 })

      service.observe(store as unknown)
      service.observe(store as unknown)

      // Only one subscription should be created on the store
      expect(store.subscribe).toHaveBeenCalledTimes(1)
    })

    it('should create separate subjects for different stores', () => {
      const store1 = createMockStore({ count: 0 })
      const store2 = createMockStore({ name: 'test' })

      service.observe(store1 as unknown)
      service.observe(store2 as unknown)

      expect(store1.subscribe).toHaveBeenCalledTimes(1)
      expect(store2.subscribe).toHaveBeenCalledTimes(1)
    })
  })

  describe('select', () => {
    it('should select a piece of state', async () => {
      const store = createMockStore({ count: 5, name: 'test' })
      const count = await firstValueFrom(
        service.select(store as unknown, (s: Record<string, unknown>) => s.count),
      )

      expect(count).toBe(5)
    })

    it('should emit only when selected value changes', () => {
      const store = createMockStore({ count: 0, name: 'test' })
      const counts: number[] = []

      service
        .select(store as unknown, (s: Record<string, unknown>) => s.count)
        .subscribe((c) => counts.push(c))

      // Change name but not count
      store.setState({ name: 'updated' })

      // Count didn't change, so no new emission
      expect(counts).toHaveLength(1)
      expect(counts[0]).toBe(0)
    })

    it('should emit when selected value actually changes', () => {
      const store = createMockStore({ count: 0, name: 'test' })
      const counts: number[] = []

      service
        .select(store as unknown, (s: Record<string, unknown>) => s.count)
        .subscribe((c) => counts.push(c))

      store.setState({ count: 1 })
      store.setState({ count: 2 })

      expect(counts).toHaveLength(3)
      expect(counts).toEqual([0, 1, 2])
    })
  })

  describe('snapshot', () => {
    it('should return the current state of a store', () => {
      const store = createMockStore({ count: 42 })
      const state = service.snapshot(store as unknown)

      expect(state).toEqual({ count: 42 })
    })
  })

  describe('update', () => {
    it('should update a store with a partial object', () => {
      const store = createMockStore({ count: 0, name: 'test' })

      service.update(store as unknown, { count: 5 })

      expect(store.setState).toHaveBeenCalledWith({ count: 5 })
    })

    it('should update a store with an updater function', () => {
      const store = createMockStore({ count: 0 })
      const updater = (state: Record<string, number>): Record<string, number> => ({
        count: state.count + 10,
      })

      service.update(store as unknown, updater)

      expect(store.setState).toHaveBeenCalledWith(updater)
    })
  })

  describe('ngOnDestroy', () => {
    it('should clean up all subscriptions', () => {
      const store1 = createMockStore({ count: 0 })
      const store2 = createMockStore({ name: 'test' })

      service.observe(store1 as unknown)
      service.observe(store2 as unknown)

      expect(store1._getListenerCount()).toBe(1)
      expect(store2._getListenerCount()).toBe(1)

      service.ngOnDestroy()

      expect(store1._getListenerCount()).toBe(0)
      expect(store2._getListenerCount()).toBe(0)
    })

    it('should complete all subjects', () => {
      const store = createMockStore({ count: 0 })
      const completeSpy = vi.fn()

      service.observe(store as unknown).subscribe({ complete: completeSpy })

      service.ngOnDestroy()

      expect(completeSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle being called with no stores observed', () => {
      expect(() => service.ngOnDestroy()).not.toThrow()
    })

    it('should handle being called multiple times', () => {
      const store = createMockStore({ count: 0 })
      service.observe(store as unknown)

      service.ngOnDestroy()
      expect(() => service.ngOnDestroy()).not.toThrow()
    })
  })
})
