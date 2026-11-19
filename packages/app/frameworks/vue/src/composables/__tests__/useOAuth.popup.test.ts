// @vitest-environment jsdom

/**
 * Security tests for the OAuth-popup relay in {@link useOAuth}.
 *
 * The opener establishes a session from a `postMessage` the popup sends back. The
 * WHOLE security of the popup flow rests on the opener accepting that message ONLY
 * when it is same-origin, from the exact popup window it opened, and carries our
 * private message type. These tests prove a forged message of each kind is rejected
 * and only the genuine one establishes a session.
 *
 * @module
 */

import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'

import { createSimpleI18nProvider, setProvider, simpleProvider } from '@molecule/app-i18n'

import { type OAuthSessionClient, useOAuth, type UseOAuthReturn } from '../useOAuth.js'

const ORIGIN = window.location.origin
const TYPE = 'molecule:oauth-result'

/**
 * Creates the auth-client surface the composable seeds the session into.
 *
 * @returns The recording client.
 */
function createMockClient(): OAuthSessionClient & {
  setAccessToken: Mock<(token: string) => void>
  setUser: Mock<(user: unknown) => void>
  initialize: Mock<() => Promise<void>>
} {
  return {
    setAccessToken: vi.fn<(token: string) => void>(),
    setUser: vi.fn<(user: unknown) => void>(),
    initialize: vi.fn<() => Promise<void>>(async () => {}),
  }
}

/**
 * A real (jsdom iframe) window to hand back as the opened popup, with its close
 * recorded — so the value has the `Window` type the browser gives `window.open`.
 *
 * @returns The popup window and its close spy.
 */
function createPopup(): { popup: Window; close: Mock<() => void> } {
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  const popup = iframe.contentWindow
  if (!popup) throw new Error('jsdom did not give the iframe a content window')
  const close = vi.fn<() => void>()
  popup.close = close
  popups.push(popup)
  return { popup, close }
}

/**
 * Builds a message event with forced origin + source (jsdom-reliable).
 *
 * @param opts - The claimed origin, source window and payload.
 * @returns The event.
 */
function makeMessage(opts: { origin?: string; source?: unknown; data?: unknown }): MessageEvent {
  const event = new MessageEvent('message', { data: opts.data })
  Object.defineProperty(event, 'origin', { value: opts.origin ?? ORIGIN })
  Object.defineProperty(event, 'source', { value: opts.source })
  return event
}

const popups: Window[] = []
const scopes: Array<() => void> = []

const flush = async (): Promise<void> => {
  await flushPromises()
  await nextTick()
}

describe('useOAuth.loginViaPopup — postMessage relay security', () => {
  let client: ReturnType<typeof createMockClient>
  let popup: Window
  let close: Mock<() => void>

  beforeEach(() => {
    vi.clearAllMocks()
    client = createMockClient()
    const opened = createPopup()
    popup = opened.popup
    close = opened.close
    vi.spyOn(window, 'open').mockReturnValue(popup)
  })
  afterEach(() => {
    for (const pending of popups.splice(0)) {
      // Settle any flow left waiting so its listener and timers stop.
      window.dispatchEvent(
        makeMessage({
          origin: ORIGIN,
          source: pending,
          data: { type: TYPE, ok: false, error: 'cleanup' },
        }),
      )
    }
    for (const stop of scopes.splice(0)) stop()
    vi.restoreAllMocks()
    for (const iframe of document.querySelectorAll('iframe')) iframe.remove()
    window.history.replaceState({}, '', '/')
    sessionStorage.clear()
    setProvider(simpleProvider)
  })

  /**
   * Runs `useOAuth` and kicks off a popup login, so each test can drive the
   * `message` handling that follows.
   *
   * @param onSuccess - Success callback passed to the composable.
   * @param onError - Error callback passed to the composable.
   */
  function startPopup(onSuccess?: () => void, onError?: (message: string) => void): void {
    const scope = effectScope()
    const result = scope.run((): UseOAuthReturn =>
      useOAuth({ oauthProviders: ['github'], authClient: client, onSuccess, onError }),
    )
    if (!result) throw new Error('effectScope did not run the composable')
    scopes.push(() => scope.stop())
    result.loginViaPopup('github')
  }

  const VALID = { type: TYPE, ok: true, token: 'real-token', user: { id: 'u1' } }

  it('accepts a same-origin result from OUR popup and establishes the session', async () => {
    const onSuccess = vi.fn<() => void>()
    startPopup(onSuccess)
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: popup, data: VALID }))
    await flush()
    expect(client.setAccessToken).toHaveBeenCalledWith('real-token')
    expect(client.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(client.initialize).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalled()
  })

  it('REJECTS a cross-origin message (session fixation attempt) — no session', async () => {
    const onSuccess = vi.fn<() => void>()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: 'https://evil.example',
        source: popup,
        data: { ...VALID, token: 'attacker' },
      }),
    )
    await flush()
    expect(client.setAccessToken).not.toHaveBeenCalled()
    expect(client.initialize).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('REJECTS a same-origin message from a DIFFERENT window (source mismatch)', async () => {
    const onSuccess = vi.fn<() => void>()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: createPopup().popup,
        data: { ...VALID, token: 'attacker' },
      }),
    )
    await flush()
    expect(client.setAccessToken).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('IGNORES a same-origin message from our popup with the WRONG type', async () => {
    const onSuccess = vi.fn<() => void>()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: popup,
        data: { type: 'other', ok: true, token: 'x', user: { id: 'z' } },
      }),
    )
    await flush()
    expect(client.setAccessToken).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('relays an error result to onError without establishing a session', async () => {
    const onError = vi.fn<(message: string) => void>()
    startPopup(undefined, onError)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: popup,
        data: { type: TYPE, ok: false, error: 'denied' },
      }),
    )
    await flush()
    expect(onError).toHaveBeenCalledWith('denied')
    expect(client.setAccessToken).not.toHaveBeenCalled()
  })

  it('treats a success result with no user as a failure (no half-auth)', async () => {
    const onSuccess = vi.fn<() => void>()
    const onError = vi.fn<(message: string) => void>()
    startPopup(onSuccess, onError)
    window.dispatchEvent(
      makeMessage({
        origin: ORIGIN,
        source: popup,
        data: { type: TYPE, ok: true, token: 'tok', user: null },
      }),
    )
    await flush()
    expect(client.initialize).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalled()
  })

  it('processes only the FIRST valid result (no double-handling)', async () => {
    const onSuccess = vi.fn<() => void>()
    startPopup(onSuccess)
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: popup, data: VALID }))
    await flush()
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: popup, data: VALID }))
    await flush()
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(client.initialize).toHaveBeenCalledTimes(1)
  })

  it('reports a failure without a reason in the active language', async () => {
    setProvider(
      createSimpleI18nProvider('fr', [
        {
          code: 'fr',
          name: 'French',
          translations: { 'vue.error.oauthFailed': 'Échec de la connexion OAuth' },
        },
      ]),
    )
    const onError = vi.fn<(message: string) => void>()
    startPopup(undefined, onError)
    window.dispatchEvent(
      makeMessage({ origin: ORIGIN, source: popup, data: { type: TYPE, ok: false } }),
    )
    await flush()
    expect(onError).toHaveBeenCalledWith('Échec de la connexion OAuth')
  })
})
