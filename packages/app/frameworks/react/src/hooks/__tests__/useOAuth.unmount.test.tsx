// @vitest-environment jsdom

/**
 * A sign-in flow that settles after the component unmounts still establishes
 * the session, but calls none of the unmounted view's callbacks. StrictMode's
 * effect re-run on mount is not an unmount: the callback exchange it started
 * still reports its result.
 *
 * @module
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockClient = {
  setAccessToken: vi.fn(),
  setUser: vi.fn(),
  initialize: vi.fn(async () => {}),
}
// Mock the auth client the hook seeds the session into.
vi.mock('../useAuth.js', () => ({ useAuthClient: () => mockClient }))

import { useOAuth } from '../useOAuth.js'

const ORIGIN = window.location.origin
const TYPE = 'molecule:oauth-result'

/**
 * Builds a message event with a forced origin and source (jsdom-reliable).
 *
 * @param source - The window the message claims to come from.
 * @param data - The message payload.
 * @returns The event.
 */
function makeMessage(source: unknown, data: unknown): MessageEvent {
  const event = new MessageEvent('message', { data })
  Object.defineProperty(event, 'origin', { value: ORIGIN })
  Object.defineProperty(event, 'source', { value: source })
  return event
}

/** Lets every pending promise chain run. */
const settle = (): Promise<void> =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })

/**
 * A successful exchange response carrying a bearer token and a user.
 *
 * @returns A minimal `Response`-shaped object.
 */
function exchangeOk(): unknown {
  return {
    ok: true,
    json: async () => ({ props: { id: 'u1' } }),
    headers: { get: (name: string) => (name === 'authorization' ? 'Bearer tok' : null) },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('useOAuth.loginViaPopup after unmount', () => {
  it('establishes the session from a later result and calls no callback', async () => {
    const popup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    const onSuccess = vi.fn()
    const { result, unmount } = renderHook(() =>
      useOAuth({ oauthProviders: ['github'], onSuccess }),
    )
    act(() => result.current.loginViaPopup('github'))
    unmount()

    window.dispatchEvent(
      makeMessage(popup, { type: TYPE, ok: true, token: 'tok', user: { id: 'u1' } }),
    )
    await settle()

    expect(mockClient.setAccessToken).toHaveBeenCalledWith('tok')
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(mockClient.initialize).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('calls no onError for a failure that arrives later', async () => {
    const popup = { closed: false, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    const onError = vi.fn()
    const { result, unmount } = renderHook(() => useOAuth({ oauthProviders: ['github'], onError }))
    act(() => result.current.loginViaPopup('github'))
    unmount()

    window.dispatchEvent(makeMessage(popup, { type: TYPE, ok: false, error: 'denied' }))
    await settle()

    expect(onError).not.toHaveBeenCalled()
    expect(popup.close).toHaveBeenCalled()
  })
})

describe('useOAuth callback exchange', () => {
  it('reports success once under StrictMode', async () => {
    window.history.replaceState({}, '', '/login?code=abc&state=s1')
    sessionStorage.setItem('oauth_provider', 'github')
    const fetchMock = vi.fn(async () => exchangeOk())
    vi.stubGlobal('fetch', fetchMock)
    const onSuccess = vi.fn()

    renderHook(() => useOAuth({ onSuccess }), { wrapper: StrictMode })

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: 'u1' })
  })

  it('establishes the session when it settles after unmount, and calls no callback', async () => {
    window.history.replaceState({}, '', '/login?code=abc&state=s1')
    sessionStorage.setItem('oauth_provider', 'github')
    let answer: (response: unknown) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            answer = resolve
          }),
      ),
    )
    const onSuccess = vi.fn()
    const { unmount } = renderHook(() => useOAuth({ onSuccess }))
    unmount()

    answer(exchangeOk())
    await settle()

    expect(mockClient.setAccessToken).toHaveBeenCalledWith('tok')
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
