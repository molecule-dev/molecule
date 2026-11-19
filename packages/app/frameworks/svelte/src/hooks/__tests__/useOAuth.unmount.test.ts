// @vitest-environment jsdom
/**
 * A sign-in flow that settles after the component unmounts still establishes
 * the session, but calls none of the unmounted view's callbacks. React's
 * `useOAuth.unmount.test.tsx` in Svelte's idiom: the hook is called once during
 * a component's init, and StrictMode's effect re-run has no counterpart, so its
 * case asserts the observable the re-run produced — one exchange, one report.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../../context.js'
import { useOAuth, type UseOAuthConfig, type UseOAuthReturn } from '../useOAuth.js'

// The auth client the hook seeds the session into (React's `useAuthClient` mock).
const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    setAccessToken: vi.fn(),
    setUser: vi.fn(),
    initialize: vi.fn(async () => {}),
  },
}))

vi.mock('../../context.js', () => ({
  setMoleculeContext: vi.fn(),
  useAuthClient: () => mockClient,
}))

const ORIGIN = window.location.origin
const TYPE = 'molecule:oauth-result'

/** A popup window as the hook uses it: its closed flag and the two actions. */
interface FakePopup {
  closed: boolean
  close: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
}

/** The browser's own `window.open`, restored after each case. */
const originalOpen = window.open

/**
 * Replaces `window.open` with a stub returning the given popup. The stub is a
 * value of `window.open`'s own shape, so no cast is needed.
 *
 * @param popup - What the stub returns.
 */
function stubOpen(popup: FakePopup | null): void {
  Object.defineProperty(window, 'open', {
    configurable: true,
    writable: true,
    value: (_url?: string | URL, _target?: string, _features?: string) => popup,
  })
}

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
const settle = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
  flushSync()
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

/** One mounted hook: its result and the host's teardown. */
interface OAuthHandle {
  /** The hook's result. */
  result: UseOAuthReturn
  /** Unmounts the host once. */
  stop: () => Promise<void>
}

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  Object.defineProperty(window, 'open', {
    configurable: true,
    writable: true,
    value: originalOpen,
  })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

/**
 * Mounts a host that calls `useOAuth` once during a child's init.
 *
 * @param config - The configuration the hook is created with.
 * @returns The hook's result and the host's unmount.
 */
function mountOAuth(config: UseOAuthConfig): OAuthHandle {
  const captured: { result?: UseOAuthReturn } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = useOAuth(config)
      },
    },
  })
  flushSync()
  const result = captured.result
  if (result === undefined) throw new Error('the host never ran the hook')
  let stopped = false
  const stop = async (): Promise<void> => {
    if (stopped) return
    stopped = true
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { result, stop }
}

describe('useOAuth.loginViaPopup after unmount', () => {
  it('establishes the session from a later result and calls no callback', async () => {
    const popup: FakePopup = { closed: false, close: vi.fn(), focus: vi.fn() }
    stubOpen(popup)
    const onSuccess = vi.fn()
    const oauth = mountOAuth({ oauthProviders: ['github'], onSuccess })
    oauth.result.loginViaPopup('github')
    await oauth.stop()

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
    const popup: FakePopup = { closed: false, close: vi.fn(), focus: vi.fn() }
    stubOpen(popup)
    const onError = vi.fn()
    const oauth = mountOAuth({ oauthProviders: ['github'], onError })
    oauth.result.loginViaPopup('github')
    await oauth.stop()

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

    mountOAuth({ onSuccess })

    await settle()
    expect(onSuccess).toHaveBeenCalledTimes(1)
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
    const oauth = mountOAuth({ onSuccess })
    await oauth.stop()

    answer(exchangeOk())
    await settle()

    expect(mockClient.setAccessToken).toHaveBeenCalledWith('tok')
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
