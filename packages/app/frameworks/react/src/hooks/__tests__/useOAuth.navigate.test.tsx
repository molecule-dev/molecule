// @vitest-environment jsdom

/**
 * `useOAuth`'s `navigate` option receives every page navigation the hook makes:
 * the full-page redirect and the fallback when the popup is blocked.
 *
 * @module
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock the auth client the hook seeds the session into.
vi.mock('../useAuth.js', () => ({
  useAuthClient: () => ({ setAccessToken: vi.fn(), setUser: vi.fn(), initialize: vi.fn() }),
}))

import { useOAuth } from '../useOAuth.js'

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('useOAuth navigate option', () => {
  it('receives the redirect to the provider, with the return path', () => {
    window.history.replaceState({}, '', '/login')
    const navigate = vi.fn()
    const { result } = renderHook(() =>
      useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'], navigate }),
    )

    act(() => result.current.redirect('github'))

    expect(navigate).toHaveBeenCalledWith(
      'https://api.example.com/oauth/github?redirect_to=%2Flogin',
    )
    expect(sessionStorage.getItem('oauth_provider')).toBe('github')
  })

  it('receives the fallback when the popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const navigate = vi.fn()
    const { result } = renderHook(() => useOAuth({ oauthProviders: ['google'], navigate }))

    act(() => result.current.loginViaPopup('google'))

    expect(navigate).toHaveBeenCalledWith('/oauth/google')
  })

  it('is not called when the popup opens', () => {
    vi.spyOn(window, 'open').mockReturnValue({ closed: false, close: vi.fn() } as unknown as Window)
    const navigate = vi.fn()
    const { result, unmount } = renderHook(() => useOAuth({ oauthProviders: ['google'], navigate }))

    act(() => result.current.loginViaPopup('google'))

    expect(navigate).not.toHaveBeenCalled()
    unmount()
  })
})
