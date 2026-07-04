import { firstValueFrom } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createOAuthState } from '../services/oauth.service.js'

describe('createOAuthState', () => {
  interface MockLocation {
    href: string
    pathname: string
    search: string
    origin: string
  }

  let mockLocation: MockLocation
  let replaceStateMock: ReturnType<typeof vi.fn>
  let sessionStore: Map<string, string>
  let fetchMock: ReturnType<typeof vi.fn>
  let mockAuthClient: Record<string, ReturnType<typeof vi.fn>>

  const setPath = (pathname: string, search = ''): void => {
    mockLocation.pathname = pathname
    mockLocation.search = search
    mockLocation.href = `https://app.example.com${pathname}${search}`
  }

  const okResponse = (
    body: unknown,
    headers: Record<string, string> = {},
  ): Record<string, unknown> => ({
    ok: true,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(body),
  })

  const errorResponse = (body: unknown): Record<string, unknown> => ({
    ok: false,
    headers: {
      get: () => null,
    },
    json: () => Promise.resolve(body),
  })

  beforeEach(() => {
    sessionStore = new Map()
    mockLocation = {
      href: 'https://app.example.com/',
      pathname: '/',
      search: '',
      origin: 'https://app.example.com',
    }
    replaceStateMock = vi.fn((_state: unknown, _title: string, url: string) => {
      const parsed = new URL(url)
      mockLocation.href = parsed.toString()
      mockLocation.pathname = parsed.pathname
      mockLocation.search = parsed.search
    })
    vi.stubGlobal('window', {
      location: mockLocation,
      history: { replaceState: replaceStateMock },
    })
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => sessionStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionStore.set(key, value)
      },
      removeItem: (key: string) => {
        sessionStore.delete(key)
      },
    })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mockAuthClient = {
      setAccessToken: vi.fn(),
      setUser: vi.fn(),
      initialize: vi.fn(() => Promise.resolve()),
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('providers', () => {
    it('should emit the configured providers on providers$', async () => {
      const manager = createOAuthState({ oauthProviders: ['github', 'google'] })

      const providers = await firstValueFrom(manager.providers$)
      expect(providers).toEqual(['github', 'google'])
    })

    it('should return the configured providers from getProviders', () => {
      const manager = createOAuthState({ oauthProviders: ['github', 'google'] })

      expect(manager.getProviders()).toEqual(['github', 'google'])
    })

    it('should encode the provider as a single path segment in getOAuthUrl', () => {
      const manager = createOAuthState({ baseURL: 'https://api.example.com' })

      expect(manager.getOAuthUrl('github')).toBe('https://api.example.com/oauth/github')
      expect(manager.getOAuthUrl('we/ird')).toBe('https://api.example.com/oauth/we%2Fird')
    })
  })

  describe('redirect', () => {
    it('should append redirect_to for a non-root path and stash the provider', () => {
      setPath('/login')
      const manager = createOAuthState({ baseURL: 'https://api.example.com' })

      manager.redirect('github')

      expect(sessionStore.get('oauth_provider')).toBe('github')
      expect(mockLocation.href).toBe('https://api.example.com/oauth/github?redirect_to=%2Flogin')
    })

    it('should omit redirect_to at the root path', () => {
      setPath('/')
      const manager = createOAuthState({ baseURL: 'https://api.example.com' })

      manager.redirect('github')

      expect(mockLocation.href).toBe('https://api.example.com/oauth/github')
    })
  })

  describe('handleCallback', () => {
    it('should exchange the code, establish the session, and clean the URL', async () => {
      setPath('/login')
      const onSuccess = vi.fn()
      const onError = vi.fn()
      fetchMock.mockResolvedValue(
        okResponse({ props: { id: '1', name: 'Alice' } }, { authorization: 'Bearer tok-1' }),
      )

      const manager = createOAuthState({
        baseURL: 'https://api.example.com',
        authClient: mockAuthClient,
        onSuccess,
        onError,
      })

      setPath('/login', '?code=abc123&state=xyz')
      sessionStore.set('oauth_provider', 'github')

      await manager.handleCallback()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.example.com/users/log-in/oauth')
      expect(init.method).toBe('POST')
      expect(init.credentials).toBe('include')
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(JSON.parse(init.body)).toEqual({
        server: 'github',
        code: 'abc123',
        state: 'xyz',
        redirect_uri: 'https://app.example.com',
      })

      expect(mockAuthClient.setAccessToken).toHaveBeenCalledWith('tok-1')
      expect(mockAuthClient.setUser).toHaveBeenCalledWith({ id: '1', name: 'Alice' })
      expect(mockAuthClient.initialize).toHaveBeenCalled()
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onError).not.toHaveBeenCalled()

      // URL cleaned (code/state removed) and stash cleared
      expect(replaceStateMock).toHaveBeenCalled()
      expect(mockLocation.pathname).toBe('/login')
      expect(mockLocation.search).toBe('')
      expect(sessionStore.has('oauth_provider')).toBe(false)
    })

    it('should POST to a custom loginEndpoint when configured', async () => {
      setPath('/login')
      fetchMock.mockResolvedValue(okResponse({ props: { id: '1' } }))

      const manager = createOAuthState({
        baseURL: 'https://api.example.com',
        loginEndpoint: '/custom/oauth-login',
        authClient: mockAuthClient,
      })

      setPath('/login', '?code=abc123')
      sessionStore.set('oauth_provider', 'github')

      await manager.handleCallback()

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/custom/oauth-login',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('should surface the server error via onError and error$ without setting the user', async () => {
      setPath('/login')
      const onError = vi.fn()
      fetchMock.mockResolvedValue(errorResponse({ error: 'Invalid state' }))

      const manager = createOAuthState({ authClient: mockAuthClient, onError })
      const errors: string[] = []
      manager.error$.subscribe((error) => errors.push(error))

      setPath('/login', '?code=abc123&state=xyz')
      sessionStore.set('oauth_provider', 'github')

      await manager.handleCallback()

      expect(onError).toHaveBeenCalledWith('Invalid state')
      expect(errors).toEqual(['Invalid state'])
      expect(mockAuthClient.setAccessToken).not.toHaveBeenCalled()
      expect(mockAuthClient.setUser).not.toHaveBeenCalled()
    })

    it('should do nothing without a code param', async () => {
      setPath('/login')
      sessionStore.set('oauth_provider', 'github')

      const manager = createOAuthState({ authClient: mockAuthClient })

      await manager.handleCallback()

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should do nothing when no provider was stashed', async () => {
      setPath('/login', '?code=abc123')

      const manager = createOAuthState({ authClient: mockAuthClient })

      await manager.handleCallback()

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should auto-run the callback at creation', async () => {
      setPath('/login', '?code=auto1&state=s1')
      sessionStore.set('oauth_provider', 'google')
      const onSuccess = vi.fn()
      fetchMock.mockResolvedValue(
        okResponse({ user: { id: '2' } }, { 'set-authorization': 'Bearer tok-2' }),
      )

      createOAuthState({ authClient: mockAuthClient, onSuccess })

      await vi.waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1)
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(mockAuthClient.setAccessToken).toHaveBeenCalledWith('tok-2')
      expect(mockAuthClient.setUser).toHaveBeenCalledWith({ id: '2' })
    })

    it('should fall back to the cookie session when no auth client is provided', async () => {
      setPath('/login')
      const onSuccess = vi.fn()
      const onError = vi.fn()
      fetchMock.mockResolvedValue(okResponse({ props: { id: '5' } }))

      const manager = createOAuthState({ onSuccess, onError })

      setPath('/login', '?code=cookie1')
      sessionStore.set('oauth_provider', 'github')

      await manager.handleCallback()

      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onError).not.toHaveBeenCalled()
    })

    it('should surface OAuth login failed when the response carries no user', async () => {
      setPath('/login')
      const onError = vi.fn()
      fetchMock.mockResolvedValue(okResponse({}))

      const manager = createOAuthState({ authClient: mockAuthClient, onError })
      const errors: string[] = []
      manager.error$.subscribe((error) => errors.push(error))

      setPath('/login', '?code=nouser')
      sessionStore.set('oauth_provider', 'github')

      await manager.handleCallback()

      expect(onError).toHaveBeenCalledWith('OAuth login failed')
      expect(errors).toEqual(['OAuth login failed'])
      expect(mockAuthClient.setUser).not.toHaveBeenCalled()
    })

    it('should surface network errors via onError and error$', async () => {
      setPath('/login')
      const onError = vi.fn()
      fetchMock.mockRejectedValue(new Error('network down'))

      const manager = createOAuthState({ authClient: mockAuthClient, onError })
      const errors: string[] = []
      manager.error$.subscribe((error) => errors.push(error))

      setPath('/login', '?code=neterr')
      sessionStore.set('oauth_provider', 'github')

      await manager.handleCallback()

      expect(onError).toHaveBeenCalledWith('network down')
      expect(errors).toEqual(['network down'])
    })
  })

  describe('destroy', () => {
    it('should complete providers$ and error$', () => {
      const manager = createOAuthState({ oauthProviders: ['github'] })

      const providersComplete = vi.fn()
      const errorsComplete = vi.fn()
      manager.providers$.subscribe({ complete: providersComplete })
      manager.error$.subscribe({ complete: errorsComplete })

      manager.destroy()

      expect(providersComplete).toHaveBeenCalledTimes(1)
      expect(errorsComplete).toHaveBeenCalledTimes(1)
    })
  })
})
