import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Angular decorators as no-ops
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

import { MoleculeAuthService } from '../services/auth.service.js'

describe('MoleculeAuthService', () => {
  let service: MoleculeAuthService<{ id: string; name: string }>
  let mockClient: Record<string, ReturnType<typeof vi.fn>>
  let authChangeCallback: (() => void) | null

  beforeEach(() => {
    authChangeCallback = null

    mockClient = {
      getState: vi.fn(() => ({
        user: null,
        authenticated: false,
        loading: false,
      })),
      onAuthChange: vi.fn((cb: () => void) => {
        authChangeCallback = cb
        return () => {
          authChangeCallback = null
        }
      }),
      login: vi.fn(() => Promise.resolve({ user: { id: '1', name: 'Test' }, token: 'abc' })),
      logout: vi.fn(() => Promise.resolve()),
      register: vi.fn(() => Promise.resolve({ user: { id: '2', name: 'New' }, token: 'def' })),
      refresh: vi.fn(() => Promise.resolve({ user: { id: '1', name: 'Test' }, token: 'xyz' })),
    }

    service = new MoleculeAuthService(mockClient)
  })

  describe('constructor', () => {
    it('should initialize with the current auth state', async () => {
      const state = await firstValueFrom(service.state$)
      expect(state).toEqual({ user: null, authenticated: false, loading: false })
    })

    it('should subscribe to auth changes', () => {
      expect(mockClient.onAuthChange).toHaveBeenCalledTimes(1)
      expect(mockClient.onAuthChange).toHaveBeenCalledWith(expect.any(Function))
    })

    it('should emit user as null when not authenticated', async () => {
      const user = await firstValueFrom(service.user$)
      expect(user).toBeNull()
    })

    it('should emit isAuthenticated as false when not authenticated', async () => {
      const isAuth = await firstValueFrom(service.isAuthenticated$)
      expect(isAuth).toBe(false)
    })

    it('should emit isLoading as false initially', async () => {
      const isLoading = await firstValueFrom(service.isLoading$)
      expect(isLoading).toBe(false)
    })
  })

  describe('reactive state updates', () => {
    it('should update state$ when auth changes', async () => {
      const states: unknown[] = []
      service.state$.subscribe((s) => states.push(s))

      // Simulate auth state change
      mockClient.getState.mockReturnValue({
        user: { id: '1', name: 'Test' },
        authenticated: true,
        loading: false,
      })
      authChangeCallback!()

      expect(states).toHaveLength(2)
      expect(states[1].user).toEqual({ id: '1', name: 'Test' })
      expect(states[1].authenticated).toBe(true)
    })

    it('should update user$ when auth changes', async () => {
      const users: unknown[] = []
      service.user$.subscribe((u) => users.push(u))

      mockClient.getState.mockReturnValue({
        user: { id: '1', name: 'Test' },
        authenticated: true,
        loading: false,
      })
      authChangeCallback!()

      expect(users).toHaveLength(2)
      expect(users[1]).toEqual({ id: '1', name: 'Test' })
    })

    it('should update isAuthenticated$ when auth changes', async () => {
      const authStates: boolean[] = []
      service.isAuthenticated$.subscribe((a) => authStates.push(a))

      mockClient.getState.mockReturnValue({
        user: { id: '1', name: 'Test' },
        authenticated: true,
        loading: false,
      })
      authChangeCallback!()

      expect(authStates).toHaveLength(2)
      expect(authStates[1]).toBe(true)
    })

    it('should update isLoading$ when auth changes', async () => {
      const loadingStates: boolean[] = []
      service.isLoading$.subscribe((l) => loadingStates.push(l))

      mockClient.getState.mockReturnValue({
        user: null,
        authenticated: false,
        loading: true,
      })
      authChangeCallback!()

      expect(loadingStates).toHaveLength(2)
      expect(loadingStates[1]).toBe(true)
    })

    it('should deduplicate isAuthenticated$ emissions with distinctUntilChanged', () => {
      const authStates: boolean[] = []
      service.isAuthenticated$.subscribe((a) => authStates.push(a))

      // Emit same authenticated value again
      mockClient.getState.mockReturnValue({
        user: null,
        authenticated: false,
        loading: true,
      })
      authChangeCallback!()

      // authenticated is still false, so no new emission
      expect(authStates).toHaveLength(1)
    })
  })

  describe('synchronous getters', () => {
    it('should return current state snapshot', () => {
      const state = service.state
      expect(state).toEqual({ user: null, authenticated: false, loading: false })
      expect(mockClient.getState).toHaveBeenCalled()
    })

    it('should return current user snapshot', () => {
      expect(service.user).toBeNull()
    })

    it('should return current isAuthenticated snapshot', () => {
      expect(service.isAuthenticated).toBe(false)
    })

    it('should reflect updated state in snapshots', () => {
      mockClient.getState.mockReturnValue({
        user: { id: '1', name: 'Test' },
        authenticated: true,
        loading: false,
      })

      expect(service.user).toEqual({ id: '1', name: 'Test' })
      expect(service.isAuthenticated).toBe(true)
    })
  })

  describe('login', () => {
    it('should delegate login to the client', async () => {
      const credentials = { email: 'test@example.com', password: 'pass123' }
      const result = await service.login(credentials)

      expect(mockClient.login).toHaveBeenCalledWith(credentials)
      expect(result).toEqual({ user: { id: '1', name: 'Test' }, token: 'abc' })
    })
  })

  describe('logout', () => {
    it('should delegate logout to the client', async () => {
      await service.logout()
      expect(mockClient.logout).toHaveBeenCalledTimes(1)
    })
  })

  describe('register', () => {
    it('should delegate register to the client', async () => {
      const data = { email: 'new@example.com', password: 'newpass' }
      const result = await service.register(data)

      expect(mockClient.register).toHaveBeenCalledWith(data)
      expect(result).toEqual({ user: { id: '2', name: 'New' }, token: 'def' })
    })
  })

  describe('refresh', () => {
    it('should delegate refresh to the client', async () => {
      const result = await service.refresh()

      expect(mockClient.refresh).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ user: { id: '1', name: 'Test' }, token: 'xyz' })
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe from auth changes', () => {
      expect(authChangeCallback).not.toBeNull()
      service.ngOnDestroy()
      expect(authChangeCallback).toBeNull()
    })

    it('should complete the state subject', () => {
      const completeSpy = vi.fn()
      service.state$.subscribe({ complete: completeSpy })

      service.ngOnDestroy()
      expect(completeSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle being called when no unsubscribe is set', () => {
      service.ngOnDestroy()
      // Calling again should not throw
      expect(() => service.ngOnDestroy()).not.toThrow()
    })
  })
})
