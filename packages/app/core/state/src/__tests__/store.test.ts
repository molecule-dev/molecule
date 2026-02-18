import { describe, expect, it, vi } from 'vitest'

import { createSimpleStateProvider } from '../simple-provider.js'
import { combineStores } from '../store.js'
import type { Store } from '../types.js'

describe('Store Utilities', () => {
  describe('combineStores', () => {
    interface UserState {
      name: string
      email: string
    }

    interface CounterState {
      count: number
    }

    const createStores = (): { user: Store<UserState>; counter: Store<CounterState> } => {
      const provider = createSimpleStateProvider()
      return {
        user: provider.createStore<UserState>({
          initialState: { name: 'John', email: 'john@example.com' },
        }),
        counter: provider.createStore<CounterState>({
          initialState: { count: 0 },
        }),
      }
    }

    it('should combine multiple stores into one', () => {
      const stores = createStores()
      const combined = combineStores<{ user: UserState; counter: CounterState }>(stores)

      expect(combined.getState()).toEqual({
        user: { name: 'John', email: 'john@example.com' },
        counter: { count: 0 },
      })
    })

    it('should reflect updates from child stores', () => {
      const stores = createStores()
      const combined = combineStores<{ user: UserState; counter: CounterState }>(stores)

      stores.user.setState({ name: 'Jane' })

      expect(combined.getState().user.name).toBe('Jane')
    })

    it('should update child stores via combined setState', () => {
      const stores = createStores()
      const combined = combineStores<{ user: UserState; counter: CounterState }>(stores)

      combined.setState({ counter: { count: 5 } })

      expect(stores.counter.getState().count).toBe(5)
    })

    it('should notify combined listeners when child store changes', () => {
      const stores = createStores()
      const combined = combineStores<{ user: UserState; counter: CounterState }>(stores)
      const listener = vi.fn()

      combined.subscribe(listener)
      stores.counter.setState({ count: 10 })

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should allow subscribing to combined store', () => {
      const stores = createStores()
      const combined = combineStores<{ user: UserState; counter: CounterState }>(stores)
      const listener = vi.fn()

      const unsubscribe = combined.subscribe(listener)
      stores.user.setState({ email: 'jane@example.com' })

      expect(listener).toHaveBeenCalled()
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { name: 'John', email: 'jane@example.com' },
          counter: { count: 0 },
        }),
        expect.any(Object),
      )

      unsubscribe()
    })

    it('should handle unsubscribe correctly', () => {
      const stores = createStores()
      const combined = combineStores<{ user: UserState; counter: CounterState }>(stores)
      const listener = vi.fn()

      const unsubscribe = combined.subscribe(listener)
      stores.counter.setState({ count: 1 })
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      stores.counter.setState({ count: 2 })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should destroy child subscriptions on destroy', () => {
      const stores = createStores()
      const combined = combineStores<{ user: UserState; counter: CounterState }>(stores)
      const combinedListener = vi.fn()

      combined.subscribe(combinedListener)
      combined.destroy()

      // Updates to child stores should no longer notify the combined store
      stores.counter.setState({ count: 100 })
      expect(combinedListener).not.toHaveBeenCalled()
    })

    it('should support setState with updater function', () => {
      const stores = createStores()
      const combined = combineStores<{ user: UserState; counter: CounterState }>(stores)

      combined.setState((_state) => ({
        counter: { count: 99 },
      }))

      expect(combined.getState().counter.count).toBe(99)
    })

    it('should work with empty stores', () => {
      const combined = combineStores<Record<string, never>>({})

      expect(combined.getState()).toEqual({})
    })

    it('should handle multiple rapid updates', () => {
      const stores = createStores()
      const combined = combineStores<{ user: UserState; counter: CounterState }>(stores)
      const listener = vi.fn()

      combined.subscribe(listener)

      stores.counter.setState({ count: 1 })
      stores.counter.setState({ count: 2 })
      stores.counter.setState({ count: 3 })

      expect(listener).toHaveBeenCalledTimes(3)
      expect(combined.getState().counter.count).toBe(3)
    })
  })
})
