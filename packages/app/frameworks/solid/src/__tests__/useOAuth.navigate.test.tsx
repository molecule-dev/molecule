// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useOAuth.navigate.test.tsx`:
 * `useOAuth`'s `navigate` option receives every page navigation the primitive
 * makes — the full-page redirect and the fallback when the popup is blocked.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'

// Mock the auth client the primitive seeds the session into.
vi.mock('../primitives/auth.js', () => ({
  useAuthClient: () => ({ setAccessToken: vi.fn(), setUser: vi.fn(), initialize: vi.fn() }),
}))

import { useOAuth } from '../primitives/oauth-react.js'

const disposers: Array<() => void> = []

/**
 * Mounts a probe that creates `useOAuth` and captures its result.
 *
 * @param use - Creates the primitive inside the probe's setup.
 * @returns The primitive the probe created.
 */
function renderPrimitive<R>(use: () => R): { readonly current: R } {
  let captured: R | undefined
  function Probe(): JSX.Element {
    captured = use()
    return <></>
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(() => <Probe />, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return {
    get current(): R {
      if (captured === undefined) throw new Error('the probe did not create the primitive')
      return captured
    },
  }
}

/**
 * A popup stand-in that satisfies the browser's `Window` members the primitive
 * uses, without a cast.
 *
 * @returns The popup and the mocks it records through.
 */
function fakePopup(): { window: Window; close: Mock<() => void> } {
  const close = vi.fn<() => void>()
  const focus = vi.fn<() => void>()
  const popup: Pick<Window, 'closed' | 'close' | 'focus'> = { closed: false, close, focus }
  return { window: popup as Window, close }
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('useOAuth navigate option', () => {
  it('receives the redirect to the provider, with the return path', () => {
    window.history.replaceState({}, '', '/login')
    const navigate = vi.fn()
    const result = renderPrimitive(() =>
      useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'], navigate }),
    )

    result.current.redirect('github')

    expect(navigate).toHaveBeenCalledWith(
      'https://api.example.com/oauth/github?redirect_to=%2Flogin',
    )
    expect(sessionStorage.getItem('oauth_provider')).toBe('github')
  })

  it('receives the fallback when the popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const navigate = vi.fn()
    const result = renderPrimitive(() => useOAuth({ oauthProviders: ['google'], navigate }))

    result.current.loginViaPopup('google')

    expect(navigate).toHaveBeenCalledWith('/oauth/google')
  })

  it('is not called when the popup opens', () => {
    vi.spyOn(window, 'open').mockReturnValue(fakePopup().window)
    const navigate = vi.fn()
    const result = renderPrimitive(() => useOAuth({ oauthProviders: ['google'], navigate }))

    result.current.loginViaPopup('google')

    expect(navigate).not.toHaveBeenCalled()
  })
})
