// @vitest-environment jsdom
/**
 * Security tests for the OAuth-popup relay in {@link useOAuth}: React's
 * `useOAuth.popup.test.tsx` in Svelte's idiom (the hook is called once during a
 * component's init, so the harness mounts a host that runs it).
 *
 * The opener establishes a session from a `postMessage` the popup sends back.
 * The WHOLE security of the popup flow rests on the opener accepting that
 * message ONLY when it is same-origin, from the exact popup window it opened,
 * and carries our private message type. These tests prove a forged message of
 * each kind is rejected and only the genuine one establishes a session.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

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
 * Replaces `window.open` with a stub returning the given popup (or `null` for a
 * blocked popup). The stub is a value of `window.open`'s own shape, so no cast
 * is needed.
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
 * Builds a message event with forced origin + source (jsdom-reliable).
 *
 * @param opts - The claimed origin, window source and payload.
 * @returns The event.
 */
function makeMessage(opts: { origin?: string; source?: unknown; data?: unknown }): MessageEvent {
  const ev = new MessageEvent('message', { data: opts.data })
  Object.defineProperty(ev, 'origin', { value: opts.origin ?? ORIGIN })
  Object.defineProperty(ev, 'source', { value: opts.source })
  return ev
}

/** Lets every pending promise chain run. */
const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0))
  flushSync()
}

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  Object.defineProperty(window, 'open', {
    configurable: true,
    writable: true,
    value: originalOpen,
  })
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

/**
 * Mounts a host that calls `useOAuth` once during a child's init.
 *
 * @param config - The configuration the hook is created with.
 * @returns The hook's result.
 */
function mountOAuth(config: UseOAuthConfig): UseOAuthReturn {
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
  hosts.push(async () => {
    await unmount(app)
    container.remove()
  })
  return result
}

describe('useOAuth.loginViaPopup — postMessage relay security', () => {
  let fakePopup: FakePopup

  beforeEach(() => {
    vi.clearAllMocks()
    fakePopup = { closed: false, close: vi.fn(), focus: vi.fn() }
    stubOpen(fakePopup)
  })

  /**
   * Mounts `useOAuth` and kicks off a popup login, so each test can drive the
   * `message` handling that follows.
   *
   * @param onSuccess - Success callback passed to the hook.
   * @param onError - Error callback passed to the hook.
   */
  function startPopup(onSuccess?: () => void, onError?: (m: string) => void): void {
    const oauth = mountOAuth({ oauthProviders: ['github'], onSuccess, onError })
    oauth.loginViaPopup('github')
  }

  const VALID = { type: TYPE, ok: true, token: 'real-token', user: { id: 'u1' } }

  it('accepts a same-origin result from OUR popup and establishes the session', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: fakePopup, data: VALID }))
    await flush()
    expect(mockClient.setAccessToken).toHaveBeenCalledWith('real-token')
    expect(mockClient.setUser).toHaveBeenCalledWith({ id: 'u1' })
    expect(mockClient.initialize).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(fakePopup.close).toHaveBeenCalled()
  })

  it('REJECTS a cross-origin message (session fixation attempt) — no session', async () => {
    const onSuccess = vi.fn()
    startPopup(onSuccess)
    window.dispatchEvent(
      makeMessage({
        origin: 'https://evil.example',
        source: fakePopup,
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
        source: fakePopup,
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
        source: fakePopup,
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
        source: fakePopup,
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
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: fakePopup, data: VALID }))
    await flush()
    window.dispatchEvent(makeMessage({ origin: ORIGIN, source: fakePopup, data: VALID }))
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
          translations: { 'svelte.error.oauthFailed': 'Échec de la connexion OAuth' },
        },
      ]),
    )
    const onError = vi.fn()
    startPopup(undefined, onError)
    window.dispatchEvent(
      makeMessage({ origin: ORIGIN, source: fakePopup, data: { type: TYPE, ok: false } }),
    )
    await flush()
    expect(onError).toHaveBeenCalledWith('Échec de la connexion OAuth')
  })
})
