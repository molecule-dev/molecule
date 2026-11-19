// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useOAuth.unmount.test.tsx`: a sign-in flow
 * that settles after the component unmounts still establishes the session, but
 * calls none of the unmounted view's callbacks.
 *
 * Solid has no StrictMode; the React case's observable contract — one exchange
 * and one callback under the mount's single effect setup — is what this port
 * asserts.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    setAccessToken: vi.fn(),
    setUser: vi.fn(),
    initialize: vi.fn(async () => {}),
  },
}))
// Mock the auth client the primitive seeds the session into.
vi.mock('../primitives/auth.js', () => ({ useAuthClient: () => mockClient }))

import { useOAuth } from '../primitives/oauth-react.js'

const ORIGIN = window.location.origin
const TYPE = 'molecule:oauth-result'

const disposers = new Set<() => void>()

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

/**
 * Mounts a probe that creates `useOAuth` and captures its result.
 *
 * @param use - Creates the primitive inside the probe's setup.
 * @returns The primitive the probe created and its unmount.
 */
function renderPrimitive<R>(use: () => R): { readonly current: R; dispose: () => void } {
  let captured: R | undefined
  function Probe(): JSX.Element {
    captured = use()
    return <></>
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const renderDispose = render(() => <Probe />, container)
  const cleanup = (): void => {
    renderDispose()
    container.remove()
  }
  const dispose = (): void => {
    if (!disposers.delete(dispose)) return
    cleanup()
  }
  disposers.add(dispose)
  return {
    get current(): R {
      if (captured === undefined) throw new Error('the probe did not create the primitive')
      return captured
    },
    dispose,
  }
}

/** Lets every pending promise chain run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Retries an assertion until it passes or the deadline expires.
 *
 * @param assertion - The assertion to retry.
 * @param timeoutMs - How long to keep retrying.
 * @returns A promise resolved once the assertion passes.
 */
async function waitFor(assertion: () => void, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      assertion()
      return
    } catch (error) {
      if (Date.now() > deadline) throw error
      await settle()
    }
  }
}

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
  for (const dispose of [...disposers]) dispose()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('useOAuth.loginViaPopup after unmount', () => {
  it('establishes the session from a later result and calls no callback', async () => {
    const popup = fakePopup()
    vi.spyOn(window, 'open').mockReturnValue(popup.window)
    const onSuccess = vi.fn()
    const result = renderPrimitive(() => useOAuth({ oauthProviders: ['github'], onSuccess }))
    result.current.loginViaPopup('github')
    result.dispose()

    window.dispatchEvent(
      makeMessage(popup.window, { type: TYPE, ok: true, token: 'tok', user: { id: 'u1' } }),
    )
    await settle()

    expect(mockClient.setAccessToken).toHaveBeenCalledWith('tok')
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(mockClient.initialize).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('calls no onError for a failure that arrives later', async () => {
    const popup = fakePopup()
    vi.spyOn(window, 'open').mockReturnValue(popup.window)
    const onError = vi.fn()
    const result = renderPrimitive(() => useOAuth({ oauthProviders: ['github'], onError }))
    result.current.loginViaPopup('github')
    result.dispose()

    window.dispatchEvent(makeMessage(popup.window, { type: TYPE, ok: false, error: 'denied' }))
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

    renderPrimitive(() => useOAuth({ onSuccess }))

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
    const result = renderPrimitive(() => useOAuth({ onSuccess }))
    result.dispose()

    answer(exchangeOk())
    await settle()

    expect(mockClient.setAccessToken).toHaveBeenCalledWith('tok')
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
