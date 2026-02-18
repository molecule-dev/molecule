import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDebug = vi.hoisted(() => vi.fn())
vi.mock('@molecule/app-logger', () => ({
  getLogger: () => ({
    debug: mockDebug,
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
  }),
}))

import { loggerMiddleware, persistMiddleware, type PersistStorage } from '../middleware.js'
import { createSimpleStateProvider } from '../simple-provider.js'

describe('State Middleware', () => {
  interface TestState {
    count: number
    name: string
  }

  describe('loggerMiddleware', () => {
    beforeEach(() => {
      mockDebug.mockClear()
    })

    it('should log state changes', () => {
      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [loggerMiddleware()],
      })

      store.setState({ count: 5 })

      expect(mockDebug).toHaveBeenCalledWith(
        '[store]',
        'prev:',
        { count: 0, name: 'test' },
        'next:',
        { count: 5, name: 'test' },
      )
    })

    it('should use custom name in log output', () => {
      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [loggerMiddleware('myStore')],
      })

      store.setState({ count: 10 })

      expect(mockDebug).toHaveBeenCalledWith(
        '[myStore]',
        'prev:',
        { count: 0, name: 'test' },
        'next:',
        { count: 10, name: 'test' },
      )
    })

    it('should still update state while logging', () => {
      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [loggerMiddleware()],
      })

      store.setState({ count: 25 })

      expect(store.getState()).toEqual({ count: 25, name: 'test' })
    })
  })

  describe('persistMiddleware', () => {
    let mockStorage: PersistStorage

    beforeEach(() => {
      mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
      }
    })

    it('should persist state to storage on setState', () => {
      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [persistMiddleware('test-key', mockStorage)],
      })

      store.setState({ count: 5 })

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ count: 5, name: 'test' }),
      )
    })

    it('should load initial state from storage', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
        JSON.stringify({ count: 100, name: 'loaded' }),
      )

      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [persistMiddleware('test-key', mockStorage)],
      })

      // The middleware loads from storage during initialization
      expect(mockStorage.getItem).toHaveBeenCalledWith('test-key')
      expect(store.getState()).toEqual({ count: 100, name: 'loaded' })
    })

    it('should handle missing storage data gracefully', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null)

      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [persistMiddleware('test-key', mockStorage)],
      })

      expect(store.getState()).toEqual({ count: 0, name: 'test' })
    })

    it('should handle invalid JSON in storage gracefully', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('invalid json{')

      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [persistMiddleware('test-key', mockStorage)],
      })

      // Should use initial state when parsing fails
      expect(store.getState()).toEqual({ count: 0, name: 'test' })
    })

    it('should handle storage setItem errors gracefully', () => {
      ;(mockStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [persistMiddleware('test-key', mockStorage)],
      })

      // Should not throw, state should still update
      expect(() => store.setState({ count: 5 })).not.toThrow()
      expect(store.getState().count).toBe(5)
    })

    it('should handle storage getItem errors gracefully', () => {
      ;(mockStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage access denied')
      })

      const provider = createSimpleStateProvider()

      // Should not throw during initialization
      expect(() => {
        provider.createStore<TestState>({
          initialState: { count: 0, name: 'test' },
          middleware: [persistMiddleware('test-key', mockStorage)],
        })
      }).not.toThrow()
    })

    it('should work with partial state updates', () => {
      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [persistMiddleware('test-key', mockStorage)],
      })

      store.setState({ name: 'updated' })

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ count: 0, name: 'updated' }),
      )
    })

    it('should use in-memory storage by default', () => {
      const provider = createSimpleStateProvider()
      const store = provider.createStore<TestState>({
        initialState: { count: 0, name: 'test' },
        middleware: [persistMiddleware('default-key')],
      })

      // State should persist within the same store
      store.setState({ count: 42 })
      expect(store.getState().count).toBe(42)
    })
  })
})
