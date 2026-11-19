// @vitest-environment jsdom

/**
 * `useOAuth`'s `navigate` option receives every page navigation the composable
 * makes: the full-page redirect and the fallback when the popup is blocked.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'

import { useOAuth, type UseOAuthReturn } from '../useOAuth.js'

/** The popup relay's private message type. */
const TYPE = 'molecule:oauth-result'

const scopes: Array<() => void> = []

/**
 * Runs the composable in its own scope — Vue's counterpart of `renderHook`.
 *
 * @param factory - Creates the composable result.
 * @returns The result and a stop function standing in for unmount.
 */
function useInScope(factory: () => UseOAuthReturn): { result: UseOAuthReturn; stop: () => void } {
  const scope = effectScope()
  const result = scope.run(factory)
  if (!result) throw new Error('effectScope did not run the composable')
  const stop = (): void => scope.stop()
  scopes.push(stop)
  return { result, stop }
}

/**
 * A real (jsdom iframe) window to hand back as the opened popup, so the value
 * has the `Window` type the browser gives `window.open`.
 *
 * @returns The iframe's content window.
 */
function createPopup(): Window {
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  const popup = iframe.contentWindow
  if (!popup) throw new Error('jsdom did not give the iframe a content window')
  return popup
}

/**
 * Builds a message event with a forced origin and source (jsdom-reliable).
 *
 * @param opts - The claimed origin, source window and payload.
 * @returns The event.
 */
function makeMessage(opts: { origin?: string; source?: unknown; data?: unknown }): MessageEvent {
  const event = new MessageEvent('message', { data: opts.data })
  Object.defineProperty(event, 'origin', { value: opts.origin ?? window.location.origin })
  Object.defineProperty(event, 'source', { value: opts.source })
  return event
}

afterEach(() => {
  for (const stop of scopes.splice(0)) stop()
  vi.restoreAllMocks()
  for (const iframe of document.querySelectorAll('iframe')) iframe.remove()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('useOAuth navigate option', () => {
  it('receives the redirect to the provider, with the return path', () => {
    window.history.replaceState({}, '', '/login')
    const navigate = vi.fn<(url: string) => void>()
    const { result } = useInScope(() =>
      useOAuth({ baseURL: 'https://api.example.com', oauthProviders: ['github'], navigate }),
    )

    result.redirect('github')

    expect(navigate).toHaveBeenCalledWith(
      'https://api.example.com/oauth/github?redirect_to=%2Flogin',
    )
    expect(sessionStorage.getItem('oauth_provider')).toBe('github')
  })

  it('receives the fallback when the popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const navigate = vi.fn<(url: string) => void>()
    const { result } = useInScope(() => useOAuth({ oauthProviders: ['google'], navigate }))

    result.loginViaPopup('google')

    expect(navigate).toHaveBeenCalledWith('/oauth/google')
  })

  it('is not called when the popup opens', () => {
    const popup = createPopup()
    vi.spyOn(window, 'open').mockReturnValue(popup)
    const navigate = vi.fn<(url: string) => void>()
    const { result } = useInScope(() => useOAuth({ oauthProviders: ['google'], navigate }))

    result.loginViaPopup('google')

    expect(navigate).not.toHaveBeenCalled()

    // Settle the flow so its listener and timers do not outlive the test.
    window.dispatchEvent(
      makeMessage({
        origin: window.location.origin,
        source: popup,
        data: { type: TYPE, ok: false, error: 'cancel' },
      }),
    )
  })
})
