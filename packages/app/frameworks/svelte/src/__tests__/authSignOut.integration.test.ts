// @vitest-environment jsdom

/**
 * Local sign-out, React's case in Svelte's idiom: the
 * `setAccessToken(null)` + `setUser(null)` sequence clears the shell, the
 * client's session and the auth cookie, and a fresh client over the same
 * storage stays signed out without a request.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient, type StorageAdapter, type UserProfile } from '@molecule/app-auth'
import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'

import { setMoleculeContext } from '../context.js'
import type { MoleculeConfig } from '../types.js'
import Header from './auth/Header.svelte'

const user: UserProfile = { id: 'reader', name: 'Reader' }

function createStorage(): StorageAdapter {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

const hosts: Array<() => Promise<void>> = []

/**
 * Mounts the header under a real auth context.
 *
 * @param config - The services to provide through `setMoleculeContext`.
 * @param component - The component to render under that context.
 * @returns The container and the tree's unmount.
 */
function mountTree(
  config: MoleculeConfig,
  component: Component<Record<string, unknown>>,
): { container: HTMLDivElement; stop: () => Promise<void> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: { config, setMoleculeContext, component, props: {} },
  })
  flushSync()
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { container, stop }
}

/**
 * Finds a required element, failing the test when it is absent.
 *
 * @param container - The tree's container.
 * @param selector - The CSS selector.
 * @returns The element.
 */
function required<T extends Element>(container: ParentNode, selector: string): T {
  const element = container.querySelector<T>(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  return element
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('useAuth local sign-out', () => {
  it('renders signed out after the setAccessToken(null) + setUser(null) sequence and stays signed out on reload', async () => {
    const fetchBoundary = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBoundary)
    document.cookie = 'mol_auth=1; path=/'
    const storage = createStorage()
    const client = createJWTAuthClient({ storage, autoRefresh: false })
    client.setSession({ accessToken: 'access', refreshToken: 'refresh', user })
    const view = mountTree({ auth: client }, Header)
    expect(required(view.container, 'span').textContent).toBe('Signed in as Reader')
    expect(required(view.container, '[aria-label="Auth status"]').textContent).toBe('authenticated')

    required<HTMLButtonElement>(view.container, 'button').click()
    flushSync()

    expect(required<HTMLAnchorElement>(view.container, 'a').getAttribute('href')).toBe('/login')
    expect(view.container.querySelector('button')).toBeNull()
    expect(required(view.container, '[aria-label="Auth status"]').textContent).toBe(
      'unauthenticated',
    )
    expect(client.isAuthenticated()).toBe(false)
    expect(client.getUser()).toBeNull()
    expect(client.getAccessToken()).toBeNull()
    expect(client.getRefreshToken()).toBeNull()
    expect(document.cookie).not.toContain('mol_auth=')

    const reloaded = createJWTAuthClient({ storage, autoRefresh: false })
    await reloaded.initialize()
    expect(reloaded.getState()).toMatchObject({
      authenticated: false,
      status: 'unauthenticated',
      user: null,
    })
    expect(reloaded.getAccessToken()).toBeNull()
    expect(reloaded.getRefreshToken()).toBeNull()
    expect(fetchBoundary).not.toHaveBeenCalled()
  })
})
