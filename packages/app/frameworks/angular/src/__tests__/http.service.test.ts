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

import { MoleculeHttpService } from '../services/http.service.js'

describe('MoleculeHttpService', () => {
  let service: MoleculeHttpService
  let mockClient: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    mockClient = {
      get: vi.fn(() => Promise.resolve({ data: { items: [1, 2, 3] }, status: 200 })),
      post: vi.fn(() => Promise.resolve({ data: { id: '1' }, status: 201 })),
      put: vi.fn(() => Promise.resolve({ data: { updated: true }, status: 200 })),
      patch: vi.fn(() => Promise.resolve({ data: { patched: true }, status: 200 })),
      delete: vi.fn(() => Promise.resolve({ data: { deleted: true }, status: 200 })),
    }

    service = new MoleculeHttpService(mockClient)
  })

  describe('get', () => {
    it('should make a GET request and return data', async () => {
      const result = await firstValueFrom(service.get('/api/items'))

      expect(mockClient.get).toHaveBeenCalledWith('/api/items', undefined)
      expect(result).toEqual({ items: [1, 2, 3] })
    })

    it('should pass request config to the client', async () => {
      const config = { headers: { Authorization: 'Bearer token' } }
      await firstValueFrom(service.get('/api/items', config as unknown))

      expect(mockClient.get).toHaveBeenCalledWith('/api/items', config)
    })
  })

  describe('post', () => {
    it('should make a POST request and return data', async () => {
      const body = { name: 'New Item' }
      const result = await firstValueFrom(service.post('/api/items', body))

      expect(mockClient.post).toHaveBeenCalledWith('/api/items', body, undefined)
      expect(result).toEqual({ id: '1' })
    })

    it('should pass config to the client', async () => {
      const body = { name: 'New Item' }
      const config = { headers: { 'Content-Type': 'application/json' } }
      await firstValueFrom(service.post('/api/items', body, config as unknown))

      expect(mockClient.post).toHaveBeenCalledWith('/api/items', body, config)
    })
  })

  describe('put', () => {
    it('should make a PUT request and return data', async () => {
      const body = { name: 'Updated Item' }
      const result = await firstValueFrom(service.put('/api/items/1', body))

      expect(mockClient.put).toHaveBeenCalledWith('/api/items/1', body, undefined)
      expect(result).toEqual({ updated: true })
    })
  })

  describe('patch', () => {
    it('should make a PATCH request and return data', async () => {
      const body = { name: 'Patched Item' }
      const result = await firstValueFrom(service.patch('/api/items/1', body))

      expect(mockClient.patch).toHaveBeenCalledWith('/api/items/1', body, undefined)
      expect(result).toEqual({ patched: true })
    })
  })

  describe('delete', () => {
    it('should make a DELETE request and return data', async () => {
      const result = await firstValueFrom(service.delete('/api/items/1'))

      expect(mockClient.delete).toHaveBeenCalledWith('/api/items/1', undefined)
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('request', () => {
    it('should handle GET method', async () => {
      const result = await firstValueFrom(service.request('GET', '/api/items'))

      expect(mockClient.get).toHaveBeenCalledWith('/api/items', undefined)
      expect(result).toEqual({ data: { items: [1, 2, 3] }, status: 200 })
    })

    it('should handle POST method', async () => {
      const config = { data: { name: 'Test' } } as Record<string, unknown>
      const result = await firstValueFrom(service.request('POST', '/api/items', config))

      expect(mockClient.post).toHaveBeenCalledWith('/api/items', config.data, config)
      expect(result).toEqual({ data: { id: '1' }, status: 201 })
    })

    it('should handle PUT method', async () => {
      const config = { data: { name: 'Updated' } } as Record<string, unknown>
      const result = await firstValueFrom(service.request('PUT', '/api/items/1', config))

      expect(mockClient.put).toHaveBeenCalledWith('/api/items/1', config.data, config)
      expect(result).toEqual({ data: { updated: true }, status: 200 })
    })

    it('should handle PATCH method', async () => {
      const config = { data: { name: 'Patched' } } as Record<string, unknown>
      const result = await firstValueFrom(service.request('PATCH', '/api/items/1', config))

      expect(mockClient.patch).toHaveBeenCalledWith('/api/items/1', config.data, config)
      expect(result).toEqual({ data: { patched: true }, status: 200 })
    })

    it('should handle DELETE method', async () => {
      const result = await firstValueFrom(service.request('DELETE', '/api/items/1'))

      expect(mockClient.delete).toHaveBeenCalledWith('/api/items/1', undefined)
      expect(result).toEqual({ data: { deleted: true }, status: 200 })
    })
  })

  describe('createState', () => {
    it('should create a BehaviorSubject with initial state', async () => {
      const state = service.createState<unknown>()
      const value = await firstValueFrom(state)

      expect(value).toEqual({ data: null, loading: false, error: null })
    })
  })

  describe('getWithState', () => {
    it('should set loading to true and then update with data', async () => {
      const state = service.createState<{ items: number[] }>()
      const states: unknown[] = []
      state.subscribe((s) => states.push(s))

      service.getWithState('/api/items', state)

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Initial state, loading state, success state
      expect(states.length).toBeGreaterThanOrEqual(3)
      expect(states[0]).toEqual({ data: null, loading: false, error: null })
      expect(states[1]).toEqual({ data: null, loading: true, error: null })
      expect(states[2]).toEqual({ data: { items: [1, 2, 3] }, loading: false, error: null })
    })

    it('should set error state on failure', async () => {
      const error = new Error('Network error')
      mockClient.get.mockRejectedValue(error)

      const state = service.createState<unknown>()
      const states: unknown[] = []
      state.subscribe((s) => states.push(s))

      // The source code re-throws in catchError after updating state,
      // so subscribe() produces an unhandled rejection. We temporarily
      // suppress the uncaught exception to verify the state update.
      const origListeners = process.rawListeners('uncaughtException') as ((
        ...args: unknown[]
      ) => void)[]
      process.removeAllListeners('uncaughtException')
      const caughtErrors: unknown[] = []
      const tempHandler = (e: unknown): void => {
        caughtErrors.push(e)
      }
      process.on('uncaughtException', tempHandler)

      service.getWithState('/api/items', state)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Restore original handlers
      process.removeListener('uncaughtException', tempHandler)
      for (const listener of origListeners) {
        process.on('uncaughtException', listener)
      }

      const lastState = states[states.length - 1]
      expect(lastState.data).toBeNull()
      expect(lastState.loading).toBe(false)
      expect(lastState.error).toBe(error)
    })

    it('should pass config to the underlying get call', async () => {
      const state = service.createState<unknown>()
      const config = { headers: { Authorization: 'Bearer token' } } as Record<string, unknown>

      service.getWithState('/api/items', state, config)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockClient.get).toHaveBeenCalledWith('/api/items', config)
    })
  })
})
