// @vitest-environment jsdom

/**
 * The Solid counterpart of React's `useOAuth.popup.test.tsx`: security tests
 * for the OAuth-popup relay in {@link useOAuth}.
 *
 * The opener establishes a session from a `postMessage` the popup sends back. The
 * WHOLE security of the popup flow rests on the opener accepting that message ONLY
 * when it is same-origin, from the exact popup window it opened, and carries our
 * private message type. These tests prove a forged message of each kind is rejected
 * and only the genuine one establishes a session.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    setAccessToken: vi.fn(),
    setUser: vi.fn(),
    initialize: vi.fn(async () => {}),
  },
}))
// Mock the auth client the primitive seeds the session into.
vi.mock('../primitives/auth.js', () => ({ useAuthClient: () => mockClient }))

import { useOAuth, type UseOAuthReturn } from '../primitives/oauth-react.js'

const ORIGIN = window.location.origin
const TYPE = 'molecule:oauth-result'

const disposers: Array<() => void> = []

/**
 * Build a message event with forced origin + source (jsdom-reliable).
 *
 * @param opts - The claimed origin, source window and payload.
 * @returns The event.
 */
function makeMessage(opts: { origin?: string; source?: unknown; data?: unknown }): MessageEvent {
  const ev = new MessageEvent('message', { data: opts.data })
  Object.defineProperty(ev, 'origin', { value: opts.origin ?? ORIGIN })
  Object.defineProperty(ev, 'source', { value: opts.source })
  return ev
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
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function flush(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

describe('useOAuth.loginViaPopup — postMessage relay security', () => {
  let popup: { window: Window; close: Mock<() => void> }
  let openSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    popup = fakePopup()
    openSpy = vi.spyOn(window, 'open').mockReturnValue(popup.window)
  })
  afterEach(() => {
    openSpy.mockRestore()
    for (const dispose of disposers.splice(0)) dispose()
    sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  /**
   * Mounts `useOAuth` and kicks off a popup login, so each test can drive the
   * `message` handling that follows.
   *
   * @param onSuccess - Success callback passed to the primitive.
   * @param onError - Error callback passed to the primitive.
   */
  function startPopup(onSuccess?: () => void, onError?: (m: string) => void): UseOAuthReturn {
    const result = renderPrimitive(() =>
      useOAuth({ oauthProviders: ['github'], onSuccess, onError }),
    )
    result.current.loginViaPopup('github')
    return result.current
  }

  const VALID = { type: TYPE, ok: true, token: 'real-token', user: { id: 'u1' } }

  it('accepts a same-origin result from OUR popup and establishes the session', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: popup.window, data: VALID }))
    await flush()
    expect(mockClient.setAccessToken).toHaveBeenCalledWith('real-token')
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(mockClient.initialize).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(popup.close).toHaveBeenCalled()
  })

  it('REJECTS a cross-origin message (session fixation attempt) — no session', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: 'https://evil.example',
        source: popup.window,
        data: { ...VALID, token: 'attacker' },
      }),
    )
    await flush()
    expect(mockClient.setAccessToken).not.toHaveBeenCalled()
    expect(mockClient.initialize).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('REJECTS a same-origin message from a DIFFERENT window (source mismatch)', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: { closed: false },
        data: { ...VALID, token: 'attacker' },
      }),
    )
    await flush()
    expect(mockClient.setAccessToken).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('IGNORES a same-origin message from our popup with the WRONG type', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: popup.window,
        data: { type: 'other', ok: true, token: 'x', user: { id: 'z' } },
      }),
    )
    await flush()
    expect(mockClient.setAccessToken).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('relays an error result to onError without establishing a session', async () => {
    const onError = vi.fn()
    startPopup(undefined, onError)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: popup.window,
        data: { type: TYPE, ok: false, error: 'denied' },
      }),
    )
    await flush()
    expect(onError).toHaveBeenCalledWith('denied')
    expect(mockClient.setAccessToken).not.toHaveBeenCalled()
  })

  it('treats a success result with no user as a failure (no half-auth)', async () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()
    startPopup(onSuccess, onError)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: popup.window,
        data: { type: TYPE, ok: true, token: 'tok', user: null },
      }),
    )
    await flush()
    expect(mockClient.initialize).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
  })

  it('processes only the FIRST valid result (no double-handling)', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    const msg = makeMessage({ origin: ORIGIN, source: popup.window, data: VALID })
    window.dispatchEvent(msg)
    await flush()
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: popup.window, data: VALID }))
    await flush()
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(mockClient.initialize).toHaveBeenCalledTimes(1)
  })

  it('reports a failure without a reason in the active language', async () => {
    setProvider(
      createSimpleI18nProvider('fr', [
        {
          code: 'fr',
          name: 'French',
          translations: { 'solid.error.oauthFailed': 'Échec de la connexion OAuth' },
        },
      ]),
    )
    const onError = vi.fn()
    startPopup(undefined, onError)
    window.dispatchEvent(
      makeMessage({ origin: ORIGIN, source: popup.window, data: { type: TYPE, ok: false } }),
    )
    await flush()
    expect(onError).toHaveBeenCalledWith('Échec de la connexion OAuth')
  })
})
