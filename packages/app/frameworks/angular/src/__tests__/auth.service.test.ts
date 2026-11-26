import { firstValueFrom } from 'rxjs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'

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

vi.mock('@molecule/app-auth', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-http', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-logger', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-routing', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-state', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-storage', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))
vi.mock('@molecule/app-theme', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
}))

import { MoleculeAuthService } from '../services/auth.service.js'
import { createTestAuthClient } from './helpers/test-providers.js'

/** The user profile this suite's auth client stands in for. */
type TestUser = { id: string; name: string }

/** Builds the full `AuthState<TestUser>` a mock `getState` returns. */
const stateOf = (
  user: TestUser | null,
  authenticated: boolean,
  loading = false,
): AuthState<TestUser> => ({
  status: authenticated ? 'authenticated' : 'unauthenticated',
  initialized: true,
  authenticated,
  user,
  loading,
  error: null,
})

describe('MoleculeAuthService', () => {
  let service: MoleculeAuthService<TestUser>
  let mockClient: AuthClient<TestUser>
  let authChangeCallback: ((state: AuthState<TestUser>) => void) | null

  beforeEach(() => {
    authChangeCallback = null

    mockClient = createTestAuthClient<TestUser>()
    vi.mocked(mockClient.getState).mockImplementation(() => stateOf(null, false))
    vi.mocked(mockClient.onAuthChange).mockImplementation((cb) => {
      authChangeCallback = cb
      return () => {
        authChangeCallback = null
      }
    })
    vi.mocked(mockClient.login).mockResolvedValue({
      user: { id: '1', name: 'Test' },
      accessToken: 'abc',
    })
    vi.mocked(mockClient.register).mockResolvedValue({
      user: { id: '2', name: 'New' },
      accessToken: 'def',
    })
    vi.mocked(mockClient.refresh).mockResolvedValue({
      user: { id: '1', name: 'Test' },
      accessToken: 'xyz',
    })

    service = new MoleculeAuthService(mockClient)
  })

  describe('constructor', () => {
    it('should initialize with the current auth state', async () => {
      const state = await firstValueFrom(service.state$)
      expect(state).toEqual(stateOf(null, false))
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
      const states: AuthState<TestUser>[] = []
      service.state$.subscribe((s) => states.push(s))

      // Simulate auth state change
      vi.mocked(mockClient.getState).mockReturnValue(stateOf({ id: '1', name: 'Test' }, true))
      authChangeCallback!(stateOf({ id: '1', name: 'Test' }, true))

      expect(states).toHaveLength(2)
      expect(states[1].user).toEqual({ id: '1', name: 'Test' })
      expect(states[1].authenticated).toBe(true)
    })

    it('should update user$ when auth changes', async () => {
      const users: Array<TestUser | null> = []
      service.user$.subscribe((u) => users.push(u))

      vi.mocked(mockClient.getState).mockReturnValue(stateOf({ id: '1', name: 'Test' }, true))
      authChangeCallback!(stateOf({ id: '1', name: 'Test' }, true))

      expect(users).toHaveLength(2)
      expect(users[1]).toEqual({ id: '1', name: 'Test' })
    })

    it('should update isAuthenticated$ when auth changes', async () => {
      const authStates: boolean[] = []
      service.isAuthenticated$.subscribe((a) => authStates.push(a))

      vi.mocked(mockClient.getState).mockReturnValue(stateOf({ id: '1', name: 'Test' }, true))
      authChangeCallback!(stateOf({ id: '1', name: 'Test' }, true))

      expect(authStates).toHaveLength(2)
      expect(authStates[1]).toBe(true)
    })

    it('should update isLoading$ when auth changes', async () => {
      const loadingStates: boolean[] = []
      service.isLoading$.subscribe((l) => loadingStates.push(l))

      vi.mocked(mockClient.getState).mockReturnValue(stateOf(null, false, true))
      authChangeCallback!(stateOf(null, false, true))

      expect(loadingStates).toHaveLength(2)
      expect(loadingStates[1]).toBe(true)
    })

    it('should deduplicate isAuthenticated$ emissions with distinctUntilChanged', () => {
      const authStates: boolean[] = []
      service.isAuthenticated$.subscribe((a) => authStates.push(a))

      // Emit same authenticated value again
      vi.mocked(mockClient.getState).mockReturnValue(stateOf(null, false, true))
      authChangeCallback!(stateOf(null, false, true))

      // authenticated is still false, so no new emission
      expect(authStates).toHaveLength(1)
    })
  })

  describe('synchronous getters', () => {
    it('should return current state snapshot', () => {
      const state = service.state
      expect(state).toEqual(stateOf(null, false))
      expect(mockClient.getState).toHaveBeenCalled()
    })

    it('should return current user snapshot', () => {
      expect(service.user).toBeNull()
    })

    it('should return current isAuthenticated snapshot', () => {
      expect(service.isAuthenticated).toBe(false)
    })

    it('should reflect updated state in snapshots', () => {
      vi.mocked(mockClient.getState).mockReturnValue(stateOf({ id: '1', name: 'Test' }, true))

      expect(service.user).toEqual({ id: '1', name: 'Test' })
      expect(service.isAuthenticated).toBe(true)
    })
  })

  describe('login', () => {
    it('should delegate login to the client', async () => {
      const credentials = { email: 'test@example.com', password: 'pass123' }
      const result = await service.login(credentials)

      expect(mockClient.login).toHaveBeenCalledWith(credentials)
      expect(result).toEqual({ user: { id: '1', name: 'Test' }, accessToken: 'abc' })
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
      expect(result).toEqual({ user: { id: '2', name: 'New' }, accessToken: 'def' })
    })
  })

  describe('refresh', () => {
    it('should delegate refresh to the client', async () => {
      const result = await service.refresh()

      expect(mockClient.refresh).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ user: { id: '1', name: 'Test' }, accessToken: 'xyz' })
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
