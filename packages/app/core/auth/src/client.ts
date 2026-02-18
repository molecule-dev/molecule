/**
 * Auth client creation and management.
 *
 * Provides the JWT-based auth client implementation.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

import { createTokenStorage, getTokenExpiration, isTokenExpired } from './token.js'
import type {
  AuthClient,
  AuthClientConfig,
  AuthEvent,
  AuthEventListener,
  AuthResult,
  AuthState,
  LoginCredentials,
  PasswordResetConfirm,
  PasswordResetRequest,
  RegisterData,
  UserProfile,
} from './types.js'

/**
 * Translation function signature compatible with `@molecule/app-i18n`.
 */
type TranslateFn = (
  key: string,
  values?: Record<string, unknown>,
  options?: { defaultValue?: string },
) => string

/**
 * Creates a simple JWT-based auth client.
 *
 * This is a basic implementation that can be extended or replaced
 * with more sophisticated auth providers.
 *
 * When `config.t` is provided, error messages will be passed through
 * it for i18n support.
 *
 * @param config - Auth client configuration including endpoints, storage, and refresh settings.
 * @returns A fully configured `AuthClient` instance.
 */
export const createJWTAuthClient = <T extends UserProfile = UserProfile>(
  config: AuthClientConfig & { t?: TranslateFn } = {},
): AuthClient<T> => {
  const {
    baseURL = '',
    loginEndpoint = '/auth/login',
    logoutEndpoint = '/auth/logout',
    registerEndpoint = '/auth/register',
    refreshEndpoint = '/auth/refresh',
    profileEndpoint = '/auth/profile',
    forgotPasswordEndpoint = '/auth/password/reset',
    resetPasswordEndpoint = '/auth/password/reset/confirm',
    changePasswordEndpoint = '/auth/password/change',
    storagePrefix = 'molecule:auth:',
    storage = 'memory',
    autoRefresh = true,
    refreshBuffer = 60,
    t,
  } = config

  const msg = (key: string, defaultValue: string): string =>
    t ? t(key, undefined, { defaultValue }) : defaultValue

  const logger = getLogger('auth')
  const tokenStorage = createTokenStorage(storage, storagePrefix)
  const stateListeners = new Set<(state: AuthState<T>) => void>()
  const eventListeners = new Set<AuthEventListener>()
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  let state: AuthState<T> = {
    initialized: false,
    authenticated: false,
    user: null,
    loading: false,
    error: null,
  }

  const notify = (): void => {
    stateListeners.forEach((callback) => callback(state))
  }

  const emitEvent = (event: AuthEvent): void => {
    eventListeners.forEach((listener) => listener(event))
  }

  const setState = (updates: Partial<AuthState<T>>): void => {
    state = { ...state, ...updates }
    notify()
  }

  const scheduleRefresh = (): void => {
    if (!autoRefresh) return

    const token = tokenStorage.getAccessToken()
    if (!token) return

    const expiresAt = getTokenExpiration(token)
    if (!expiresAt) return

    const refreshTime = expiresAt - refreshBuffer * 1000 - Date.now()
    if (refreshTime <= 0) return

    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }

    refreshTimer = setTimeout(() => {
      client.refresh().catch((err) => {
        logger.warn('Token refresh failed, logging out', err)
        client.logout()
      })
    }, refreshTime)
  }

  const fetchAPI = async <R>(endpoint: string, options: RequestInit = {}): Promise<R> => {
    const url = baseURL + endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    const token = tokenStorage.getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: msg('auth.error.requestFailed', 'Request failed'),
      }))
      throw new Error(
        error.error || error.message || msg('auth.error.requestFailed', 'Request failed'),
      )
    }

    return response.json()
  }

  const client: AuthClient<T> = {
    getState: () => state,

    isAuthenticated: () => state.authenticated,

    getUser: () => state.user,

    getAccessToken: () => tokenStorage.getAccessToken(),

    getRefreshToken: () => tokenStorage.getRefreshToken(),

    async login(credentials: LoginCredentials): Promise<AuthResult<T>> {
      setState({ loading: true, error: null })

      try {
        const result = await fetchAPI<AuthResult<T>>(loginEndpoint, {
          method: 'POST',
          body: JSON.stringify(credentials),
        })

        tokenStorage.setAccessToken(result.accessToken || null)
        tokenStorage.setRefreshToken(result.refreshToken || null)
        tokenStorage.setUser(result.user)

        setState({
          loading: false,
          authenticated: true,
          user: result.user,
        })

        logger.debug('User logged in')
        emitEvent({ type: 'login', user: result.user })
        scheduleRefresh()

        return result
      } catch (err) {
        const error =
          err instanceof Error ? err.message : msg('auth.error.loginFailed', 'Login failed')
        setState({ loading: false, error })
        emitEvent({ type: 'error', error })
        throw err
      }
    },

    async logout(): Promise<void> {
      setState({ loading: true })

      try {
        const token = tokenStorage.getAccessToken()
        if (token) {
          await fetchAPI(logoutEndpoint, { method: 'POST' }).catch((err) => {
            logger.debug('Logout endpoint call failed (non-critical)', err)
          })
        }
      } finally {
        if (refreshTimer) {
          clearTimeout(refreshTimer)
          refreshTimer = null
        }

        tokenStorage.clear()
        setState({
          loading: false,
          authenticated: false,
          user: null,
        })
        logger.debug('User logged out')
        emitEvent({ type: 'logout' })
      }
    },

    async register(data: RegisterData): Promise<AuthResult<T>> {
      setState({ loading: true, error: null })

      try {
        const result = await fetchAPI<AuthResult<T>>(registerEndpoint, {
          method: 'POST',
          body: JSON.stringify(data),
        })

        tokenStorage.setAccessToken(result.accessToken || null)
        tokenStorage.setRefreshToken(result.refreshToken || null)
        tokenStorage.setUser(result.user)

        setState({
          loading: false,
          authenticated: true,
          user: result.user,
        })

        emitEvent({ type: 'register', user: result.user })
        scheduleRefresh()

        return result
      } catch (err) {
        const error =
          err instanceof Error
            ? err.message
            : msg('auth.error.registrationFailed', 'Registration failed')
        setState({ loading: false, error })
        emitEvent({ type: 'error', error })
        throw err
      }
    },

    async refresh(): Promise<AuthResult<T>> {
      const refreshToken = tokenStorage.getRefreshToken()
      if (!refreshToken) {
        throw new Error(msg('auth.error.noRefreshToken', 'No refresh token available'))
      }

      const result = await fetchAPI<AuthResult<T>>(refreshEndpoint, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })

      tokenStorage.setAccessToken(result.accessToken || null)
      if (result.refreshToken) {
        tokenStorage.setRefreshToken(result.refreshToken)
      }
      tokenStorage.setUser(result.user)

      setState({
        authenticated: true,
        user: result.user,
      })

      emitEvent({ type: 'refresh' })
      scheduleRefresh()

      return result
    },

    async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
      await fetchAPI(forgotPasswordEndpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
      await fetchAPI(resetPasswordEndpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    async updateProfile(data: Partial<T>): Promise<T> {
      const result = await fetchAPI<T>(profileEndpoint, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })

      tokenStorage.setUser(result)
      setState({ user: result })

      return result
    },

    async changePassword(oldPassword: string, newPassword: string): Promise<void> {
      await fetchAPI(changePasswordEndpoint, {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      })
    },

    async initialize(): Promise<void> {
      const token = tokenStorage.getAccessToken()
      const user = tokenStorage.getUser<T>()

      if (token && user) {
        if (!isTokenExpired(token)) {
          setState({
            initialized: true,
            authenticated: true,
            user,
          })
          scheduleRefresh()
          return
        }

        // Token expired, try to refresh
        const refreshToken = tokenStorage.getRefreshToken()
        if (refreshToken) {
          try {
            await this.refresh()
            setState({ initialized: true })
            return
          } catch (err) {
            logger.warn('Initial token refresh failed', err)
            tokenStorage.clear()
          }
        }
      }

      setState({ initialized: true })
    },

    subscribe(callback: (state: AuthState<T>) => void): () => void {
      stateListeners.add(callback)
      return () => stateListeners.delete(callback)
    },

    onAuthChange(callback: (state: AuthState<T>) => void): () => void {
      stateListeners.add(callback)
      return () => stateListeners.delete(callback)
    },

    getToken(): string | null {
      return tokenStorage.getAccessToken()
    },

    addEventListener(listener: AuthEventListener): () => void {
      eventListeners.add(listener)
      return () => eventListeners.delete(listener)
    },

    destroy(): void {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }
      stateListeners.clear()
      eventListeners.clear()
    },
  }

  return client
}
