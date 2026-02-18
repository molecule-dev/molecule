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

import { MoleculeStorageService } from '../services/storage.service.js'

describe('MoleculeStorageService', () => {
  let service: MoleculeStorageService
  let mockProvider: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    mockProvider = {
      get: vi.fn(() => Promise.resolve(null)),
      set: vi.fn(() => Promise.resolve()),
      remove: vi.fn(() => Promise.resolve()),
      clear: vi.fn(() => Promise.resolve()),
      keys: vi.fn(() => Promise.resolve([])),
    }

    service = new MoleculeStorageService(mockProvider)
  })

  describe('get', () => {
    it('should return an observable of the stored value', async () => {
      mockProvider.get.mockResolvedValue('stored-value')
      const result = await firstValueFrom(service.get<string>('key'))

      expect(mockProvider.get).toHaveBeenCalledWith('key')
      expect(result).toBe('stored-value')
    })

    it('should return null when key does not exist', async () => {
      mockProvider.get.mockResolvedValue(null)
      const result = await firstValueFrom(service.get('missing-key'))

      expect(result).toBeNull()
    })

    it('should handle complex objects', async () => {
      const obj = { name: 'Test', items: [1, 2, 3] }
      mockProvider.get.mockResolvedValue(obj)

      const result = await firstValueFrom(service.get<typeof obj>('complex'))
      expect(result).toEqual(obj)
    })
  })

  describe('set', () => {
    it('should store a value and return observable', async () => {
      await firstValueFrom(service.set('key', 'value'))

      expect(mockProvider.set).toHaveBeenCalledWith('key', 'value')
    })

    it('should handle complex objects', async () => {
      const obj = { name: 'Test', count: 42 }
      await firstValueFrom(service.set('obj', obj))

      expect(mockProvider.set).toHaveBeenCalledWith('obj', obj)
    })
  })

  describe('remove', () => {
    it('should remove a key from storage', async () => {
      await firstValueFrom(service.remove('key'))

      expect(mockProvider.remove).toHaveBeenCalledWith('key')
    })
  })

  describe('clear', () => {
    it('should clear all storage', async () => {
      await firstValueFrom(service.clear())

      expect(mockProvider.clear).toHaveBeenCalledTimes(1)
    })
  })

  describe('keys', () => {
    it('should return an observable of all keys', async () => {
      mockProvider.keys.mockResolvedValue(['key1', 'key2', 'key3'])
      const result = await firstValueFrom(service.keys())

      expect(result).toEqual(['key1', 'key2', 'key3'])
    })

    it('should return empty array when storage is empty', async () => {
      const result = await firstValueFrom(service.keys())
      expect(result).toEqual([])
    })
  })

  describe('createValue', () => {
    it('should create a BehaviorSubject with loading state', async () => {
      // Don't resolve the get promise yet
      let resolveGet: (value: unknown) => void
      mockProvider.get.mockReturnValue(
        new Promise((r) => {
          resolveGet = r
        }),
      )

      const state = service.createValue<string>('theme', 'light')
      const value = await firstValueFrom(state)

      expect(value).toEqual({ value: 'light', loading: true, error: null })

      resolveGet('dark')
    })

    it('should update with stored value when loaded', async () => {
      mockProvider.get.mockResolvedValue('dark')

      const state = service.createValue<string>('theme', 'light')

      await new Promise((resolve) => setTimeout(resolve, 50))

      const value = state.getValue()
      expect(value).toEqual({ value: 'dark', loading: false, error: null })
    })

    it('should use default value when stored value is null', async () => {
      mockProvider.get.mockResolvedValue(null)

      const state = service.createValue<string>('theme', 'light')

      await new Promise((resolve) => setTimeout(resolve, 50))

      const value = state.getValue()
      expect(value).toEqual({ value: 'light', loading: false, error: null })
    })

    it('should set error state on failure', async () => {
      const error = new Error('Storage error')
      mockProvider.get.mockRejectedValue(error)

      const state = service.createValue<string>('theme', 'light')

      await new Promise((resolve) => setTimeout(resolve, 50))

      const value = state.getValue()
      expect(value.value).toBe('light')
      expect(value.loading).toBe(false)
      expect(value.error).toBe(error)
    })
  })

  describe('updateValue', () => {
    it('should set loading state, save to storage, and update the subject', async () => {
      mockProvider.get.mockResolvedValue('light')
      const state = service.createValue<string>('theme', 'light')

      await new Promise((resolve) => setTimeout(resolve, 50))

      const states: unknown[] = []
      state.subscribe((s) => states.push(s))

      service.updateValue('theme', 'dark', state)

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should have: current state, loading state, success state
      expect(states.length).toBeGreaterThanOrEqual(2)
      const loadingState = states.find((s) => s.loading === true)
      expect(loadingState).toBeDefined()

      const finalState = states[states.length - 1]
      expect(finalState).toEqual({ value: 'dark', loading: false, error: null })
      expect(mockProvider.set).toHaveBeenCalledWith('theme', 'dark')
    })

    it('should set error state when save fails', async () => {
      const error = new Error('Save failed')
      mockProvider.get.mockResolvedValue('light')
      mockProvider.set.mockRejectedValue(error)

      const state = service.createValue<string>('theme', 'light')

      await new Promise((resolve) => setTimeout(resolve, 50))

      service.updateValue('theme', 'dark', state)

      await new Promise((resolve) => setTimeout(resolve, 50))

      const finalState = state.getValue()
      expect(finalState.loading).toBe(false)
      expect(finalState.error).toBe(error)
    })
  })
})
