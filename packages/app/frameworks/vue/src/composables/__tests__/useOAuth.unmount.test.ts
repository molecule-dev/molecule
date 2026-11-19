// @vitest-environment jsdom

/**
 * A sign-in flow that settles after the component unmounts still establishes
 * the session, but calls none of the unmounted view's callbacks.
 *
 * @module
 */

import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { defineComponent, effectScope, h, nextTick, type PropType } from 'vue'

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

const popups: Window[] = []
const scopes: Array<() => void> = []

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

/** Lets every pending promise chain and queued render run. */
const settle = async (): Promise<void> => {
  await flushPromises()
  await nextTick()
}

/**
 * A successful exchange response carrying a bearer token and a user.
 *
 * @returns A minimal `Response`-shaped object.
 */
function exchangeOk(): {
  ok: boolean
  json: () => Promise<unknown>
  headers: { get: (name: string) => string | null }
} {
  return {
    ok: true,
    json: async () => ({ props: { id: 'u1' } }),
    headers: { get: (name: string) => (name === 'authorization' ? 'Bearer tok' : null) },
  }
}

/**
 * Mounts a component that runs `useOAuth` in setup, so its mount hook runs the
 * callback exchange.
 *
 * @param client - The auth client the session is seeded into.
 * @param onSuccess - Success callback passed to the composable.
 * @returns The mounted wrapper.
 */
function mountCallback(
  client: OAuthSessionClient,
  onSuccess?: () => void,
): ReturnType<typeof mount> {
  return mount(
    defineComponent({
      props: {
        onSuccess: {
          type: Function as PropType<(() => void) | undefined>,
          default: undefined,
        },
      },
      setup(props) {
        useOAuth({ authClient: client, onSuccess: props.onSuccess })
        return () => h('div')
      },
    }),
    { props: { onSuccess } },
  )
}

/**
 * Runs `useOAuth` outside a component, in its own scope.
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

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  for (const pending of popups.splice(0)) {
    // Settle any flow left waiting so its listener and timers stop.
    window.dispatchEvent(makeMessage(pending, { type: TYPE, ok: false, error: 'cleanup' }))
  }
  for (const stop of scopes.splice(0)) stop()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  for (const iframe of document.querySelectorAll('iframe')) iframe.remove()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('useOAuth.loginViaPopup after unmount', () => {
  it('establishes the session from a later result and calls no callback', async () => {
    const client = createMockClient()
    const { popup } = createPopup()
    vi.spyOn(window, 'open').mockReturnValue(popup)
    const onSuccess = vi.fn<() => void>()
    const { result, stop } = useInScope(() =>
      useOAuth({ oauthProviders: ['github'], authClient: client, onSuccess }),
    )
    result.loginViaPopup('github')
    stop()

    window.dispatchEvent(
      makeMessage(popup, { type: TYPE, ok: true, token: 'tok', user: { id: 'u1' } }),
    )
    await settle()

    expect(client.setAccessToken).toHaveBeenCalledWith('tok')
    expect(client.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(client.initialize).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('calls no onError for a failure that arrives later', async () => {
    const client = createMockClient()
    const { popup, close } = createPopup()
    vi.spyOn(window, 'open').mockReturnValue(popup)
    const onError = vi.fn<(message: string) => void>()
    const { result, stop } = useInScope(() =>
      useOAuth({ oauthProviders: ['github'], authClient: client, onError }),
    )
    result.loginViaPopup('github')
    stop()

    window.dispatchEvent(makeMessage(popup, { type: TYPE, ok: false, error: 'denied' }))
    await settle()

    expect(onError).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalled()
  })
})

describe('useOAuth callback exchange', () => {
  it('reports success once under StrictMode', async () => {
    window.history.replaceState({}, '', '/login?code=abc&state=s1')
    sessionStorage.setItem('oauth_provider', 'github')
    const fetchMock = vi.fn(async () => exchangeOk())
    vi.stubGlobal('fetch', fetchMock)
    const client = createMockClient()
    const onSuccess = vi.fn<() => void>()

    mountCallback(client, onSuccess)

    await settle()
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(client.setUser).toHaveBeenCalledWith({ id: 'u1' })
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
    const client = createMockClient()
    const onSuccess = vi.fn<() => void>()
    const wrapper = mountCallback(client, onSuccess)
    wrapper.unmount()

    answer(exchangeOk())
    await settle()

    expect(client.setAccessToken).toHaveBeenCalledWith('tok')
    expect(client.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
