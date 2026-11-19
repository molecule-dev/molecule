// @vitest-environment jsdom
/**
 * `useOAuth`'s `navigate` option receives every page navigation the hook makes:
 * the full-page redirect and the fallback when the popup is blocked. React's
 * `useOAuth.navigate.test.tsx` in Svelte's idiom: the hook is called once during
 * a component's init, so the harness mounts a host that runs it.
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

/** One mounted hook: its result and the host's teardown. */
interface OAuthHandle {
  /** The hook's result. */
  result: UseOAuthReturn
  /** Unmounts the host once. */
  stop: () => Promise<void>
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

beforeEach(() => {
  vi.clearAllMocks()
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

describe('useOAuth navigate option', () => {
  it('receives the redirect to the provider, with the return path', () => {
    window.history.replaceState({}, '', '/login')
    const navigate = vi.fn<(url: string) => void>()
    const oauth = mountOAuth({
      baseURL: 'https://api.example.com',
      oauthProviders: ['github'],
      navigate,
    })

    oauth.result.redirect('github')

    expect(navigate).toHaveBeenCalledWith(
      'https://api.example.com/oauth/github?redirect_to=%2Flogin',
    )
    expect(sessionStorage.getItem('oauth_provider')).toBe('github')
  })

  it('receives the fallback when the popup is blocked', () => {
    stubOpen(null)
    const navigate = vi.fn<(url: string) => void>()
    const oauth = mountOAuth({ oauthProviders: ['google'], navigate })

    oauth.result.loginViaPopup('google')

    expect(navigate).toHaveBeenCalledWith('/oauth/google')
  })

  it('is not called when the popup opens', async () => {
    stubOpen({ closed: false, close: vi.fn(), focus: vi.fn() })
    const navigate = vi.fn<(url: string) => void>()
    const oauth = mountOAuth({ oauthProviders: ['google'], navigate })

    oauth.result.loginViaPopup('google')

    expect(navigate).not.toHaveBeenCalled()
    await oauth.stop()
  })
})
