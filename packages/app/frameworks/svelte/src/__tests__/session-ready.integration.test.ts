// @vitest-environment jsdom

/**
 * `SessionReady` and the auth stores' `sessionReady` hold against the real
 * restoring auth client — React's `MoleculeProvider awaitSession` /
 * `SessionReady` cases in the Svelte binding's shapes: a component gates its
 * children on `SessionReady` (the Svelte form of `awaitSession`), or gates its
 * own markup on the `sessionReady` store.
 *
 * A returning visitor's session comes back from one cookie-restore request after a page
 * load. Pages that rendered before it answered read `user === null`: returning visitors
 * lost a follow test to a Follow button whose handler checked `!user` (a no-op or a
 * redirect to `/login`) on the profile page the suite opened with `page.goto`.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { lightTheme, type ThemeProvider as ThemeProviderType } from '@molecule/app-theme'

import type { MoleculeConfig } from '../types.js'
import { mountInContext } from './context-host.js'
import FollowButton from './session-ready/FollowButton.svelte'
import GatedFollow from './session-ready/GatedFollow.svelte'
import GatedName from './session-ready/GatedName.svelte'
import GatedSession from './session-ready/GatedSession.svelte'
import GatedState from './session-ready/GatedState.svelte'
import InventoryAction from './session-ready/InventoryAction.svelte'
import PlainPage from './session-ready/PlainPage.svelte'
import ProfileDraft from './session-ready/ProfileDraft.svelte'
import ProviderRoot from './session-ready/ProviderRoot.svelte'
import ServerShellGate from './session-ready/ServerShellGate.svelte'
import SessionHeading from './session-ready/SessionHeading.svelte'
import ThemeFallbackGate from './session-ready/ThemeFallbackGate.svelte'

const reader: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []
const hosts: Array<() => Promise<void>> = []
const validToken = [btoa('{}'), btoa(JSON.stringify({ exp: 4_102_444_800 })), 'signature'].join('.')

function memoryStorage(values: Record<string, string> = {}): StorageAdapter {
  const map = new Map(Object.entries(values))
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

/** Open a fresh client using the session storage from the previous document. */
function cachedVisitor(accessToken: string): AuthClient<UserProfile> {
  const storage = memoryStorage()
  const previous = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  previous.setSession({ accessToken, user: reader })
  previous.destroy()
  const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  clients.push(client)
  return client
}

/** A real client for a returning visitor whose restore request answers when `answer` is called. */
function returningVisitor(initialize = true): {
  client: AuthClient<UserProfile>
  answer: () => Promise<void>
} {
  document.cookie = 'mol_auth=1; path=/'
  let respond: ((response: Response) => void) | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      String(url).endsWith('/users/me')
        ? new Promise<Response>((resolve) => {
            respond = resolve
          })
        : Promise.resolve(
            Response.json({ accessToken: 'new-token', user: { ...reader, id: 'new-reader' } }),
          ),
    ),
  )
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  if (initialize) void client.initialize()
  return {
    client,
    answer: async () => {
      respond?.(
        new Response(JSON.stringify({ user: reader }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      await client.whenRestored!()
      flushSync()
    },
  }
}

/**
 * The Svelte form of React's two providers: `AuthProvider` supplies only the
 * auth client, `MoleculeProvider` supplies every service. Both mount the SAME
 * gated page, so the rows differ only in how much context is wired.
 *
 * @param provider - Which provider row this is.
 * @param client - The auth client the page reads.
 * @returns The context config for that provider row.
 */
function providerServices(
  provider: 'auth' | 'molecule',
  client: AuthClient<UserProfile>,
): MoleculeConfig {
  if (provider === 'auth') return { auth: client }
  const theme: ThemeProviderType = {
    getTheme: () => lightTheme,
    setTheme: () => {},
    toggleMode: () => {},
    subscribe: () => () => {},
    getThemes: () => [lightTheme],
  }
  return { auth: client, theme, i18n: createSimpleI18nProvider() }
}

/**
 * Mounts a component under a real Svelte context carrying the case's services.
 *
 * @param config - The services to provide through `setMoleculeContext`.
 * @param component - The component to render under that context.
 * @param props - The component's props.
 * @returns The container and the tree's unmount.
 */
function mountTree<Props extends Record<string, unknown>>(
  config: MoleculeConfig,
  component: Component<Props>,
  props: Props,
): { container: HTMLDivElement; stop: () => Promise<void> } {
  const tree = mountInContext(config, component, props)
  hosts.push(tree.stop)
  return tree
}

/**
 * Mounts `component` inside the real `AuthProvider` or `MoleculeProvider` component with no
 * `awaitSession`, as an app root renders it, so the provider's default decides the hold.
 *
 * @param provider - Which provider component the root renders.
 * @param client - The auth client.
 * @param component - The page.
 * @param props - The page's props.
 * @param fallback - The `sessionFallback` text, if any.
 * @returns The container and the tree's unmount.
 */
function mountRoot<Props extends Record<string, unknown>>(
  provider: 'auth' | 'molecule',
  client: AuthClient<UserProfile>,
  component: Component<Props>,
  props: Props,
  fallback?: string,
): { container: HTMLDivElement; stop: () => Promise<void> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const { auth: _auth, ...services } = providerServices(provider, client)
  // Explicit type arguments, as in mountInContext: the root's props vary with `Props`.
  const app = mount<
    {
      kind: 'auth' | 'molecule'
      client: AuthClient<UserProfile>
      services?: MoleculeConfig
      component: Component<Props>
      props: Props
      fallback?: string
    },
    Record<never, never>
  >(ProviderRoot, {
    target: container,
    props: { kind: provider, client, services, component, props, fallback },
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
 * Mounts a component with no molecule context at all (an ungated shell).
 *
 * @param component - The component to render.
 * @param props - The component's props.
 * @returns The container and the tree's unmount.
 */
function mountPlain<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): { container: HTMLDivElement; stop: () => Promise<void> } {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(component, { target: container, props })
  flushSync()
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  return { container, stop }
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
  document.body.innerHTML = ''
})

describe('the session hold', () => {
  it('waits for one current-user read when the previous document stored only the token', async () => {
    let respond!: (response: Response) => void
    const fetchSpy = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchSpy)
    const storage = memoryStorage()
    storage.setItem('molecule:auth:accessToken', validToken)
    const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
    clients.push(client)
    const view = mountTree({ auth: client }, GatedSession, {})
    expect(view.container.querySelector('h1')).toBeNull()
    expect(view.container.textContent).toContain('Restoring')
    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(
      '/users/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: `Bearer ${validToken}` }),
      }),
    )
    respond(Response.json({ user: reader }))
    await client.whenRestored!()
    flushSync()
    expect(view.container.querySelector('h1')?.textContent).toBe('Signed in as Reader')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it.each(['auth', 'molecule'] as const)(
    '%s provider waits by default so a returning inventory operator can use the first action',
    async (provider) => {
      const { client, answer } = returningVisitor(false)
      const changed = vi.fn<(by: string) => void>()
      const view = mountRoot(provider, client, InventoryAction, { changed })
      expect(view.container.querySelector('button')).toBeNull()
      await answer()
      view.container.querySelector('button')?.dispatchEvent(new Event('click', { bubbles: true }))
      expect(changed).toHaveBeenCalledExactlyOnceWith(reader.id)
    },
  )

  it.each(['auth', 'molecule'] as const)(
    '%s provider seeds a mounted profile form from the restored user by default',
    async (provider) => {
      const { client, answer } = returningVisitor(false)
      const view = mountRoot(provider, client, ProfileDraft, {}, 'Restoring profile')
      expect(view.container.querySelector('input')).toBeNull()
      expect(view.container.textContent).toContain('Restoring profile')
      await answer()
      expect(view.container.querySelector<HTMLInputElement>('input')?.value).toBe(reader.name)
    },
  )

  it.each(['auth', 'molecule'] as const)(
    '%s provider renders a cached visitor on the first render without entry initialization',
    (provider) => {
      const fetchSpy = vi.fn<typeof fetch>()
      vi.stubGlobal('fetch', fetchSpy)
      const client = cachedVisitor(validToken)
      // Svelte has no StrictMode: the observable fact is that the FIRST render
      // already shows the stored session and starts no request.
      const view = mountRoot(provider, client, SessionHeading, {})
      expect(view.container.querySelector('h1')?.textContent).toBe('Signed in as Reader')
      expect(fetchSpy).not.toHaveBeenCalled()
    },
  )

  it.each(['login', 'register'] as const)(
    'keeps the page mounted after %s wins a pending restore',
    async (method) => {
      const { client, answer } = returningVisitor()
      const view = mountTree({ auth: client }, GatedName, {})
      await client[method]({ email: 'new@example.test', password: 'password' })
      flushSync()
      const input = view.container.querySelector<HTMLInputElement>(
        'input[aria-label="Profile name"]',
      )
      if (!input) throw new Error('the page never mounted its profile draft')
      input.value = 'Unsaved draft'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      flushSync()
      await answer()
      client.setUser({ ...reader, id: 'new-reader', name: 'Updated' })
      flushSync()
      expect(view.container.querySelector('input[aria-label="Profile name"]')).toBe(input)
      expect(input.value).toBe('Unsaved draft')
      expect(client.getState()).toMatchObject({ status: 'authenticated', initialized: true })
    },
  )

  it('renders a cached opaque-token session before a current-user read and verifies it once', async () => {
    document.cookie = 'mol_auth=1; path=/'
    const fetchSpy = vi.fn(async () => Response.json({ user: reader }))
    vi.stubGlobal('fetch', fetchSpy)
    const client = cachedVisitor('opaque-token')
    const view = mountTree({ auth: client }, GatedSession, {})
    expect(view.container.querySelector('h1')?.textContent).toBe('Signed in as Reader')
    expect(view.container.textContent).not.toContain('Restoring')
    expect(fetchSpy).not.toHaveBeenCalled()

    await Promise.all([client.initialize(), client.initialize()])
    await client.initialize()
    expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(
      '/users/me',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('provides theme and translations to its session fallback', async () => {
    const { client, answer } = returningVisitor()
    const i18n = createSimpleI18nProvider()
    i18n.addTranslations('en', { restoring: 'Translated restore' })
    const theme: ThemeProviderType = {
      getTheme: () => lightTheme,
      setTheme: () => {},
      toggleMode: () => {},
      subscribe: () => () => {},
      getThemes: () => [lightTheme],
    }
    const view = mountTree({ auth: client, theme, i18n }, ThemeFallbackGate, {})
    expect(view.container.textContent).toContain(`${lightTheme.name}: Translated restore`)
    await answer()
    expect(view.container.textContent).toContain('Public page')
  })

  it('allows an explicit ungated synchronous server shell without starting restoration', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const view = mountPlain(PlainPage, {})
    expect(view.container.textContent).toContain('Server page')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('server-renders the fallback while a cookie restore is pending', async () => {
    const { client, answer } = returningVisitor(false)
    const view = mountTree({ auth: client }, ServerShellGate, {})
    // The pending branch is the fallback: the children are not rendered yet.
    expect(view.container.textContent).toContain('Restoring')
    expect(view.container.textContent).not.toContain('Server page')
    await answer()
    expect(view.container.textContent).toContain('Server page')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('lazily restores exactly once under StrictMode without initialize()', async () => {
    const { client, answer } = returningVisitor(false)
    const view = mountTree({ auth: client }, ServerShellGate, {})
    expect(view.container.textContent).not.toContain('Server page')
    expect(fetch).toHaveBeenCalledTimes(1)
    await answer()
    expect(view.container.textContent).toContain('Server page')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('releases a sign-out during the hold and ignores the late restored user', async () => {
    const { client, answer } = returningVisitor()
    const view = mountTree({ auth: client }, GatedState, {})
    expect(view.container.textContent).toContain('Restoring')
    await client.logout()
    flushSync()
    expect(view.container.textContent).not.toContain('Restoring')
    await answer()
    expect(view.container.querySelector('[data-testid="state"]')?.textContent).toBe(
      'unauthenticated:null',
    )
    expect(client.getState()).toMatchObject({ status: 'unauthenticated', user: null })
  })

  it('releases a hung restore instead of leaving a blank page forever', async () => {
    vi.useFakeTimers()
    const { client } = returningVisitor()
    const view = mountTree({ auth: client }, ServerShellGate, {})
    expect(view.container.textContent).not.toContain('Server page')
    await vi.advanceTimersByTimeAsync(10_000)
    flushSync()
    expect(view.container.textContent).toContain('Server page')
    expect(client.getState().status).toBe('unavailable')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows no page until a returning visitor is restored, so a first click is signed in', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn<(by: string) => void>()
    const view = mountTree({ auth: client }, GatedFollow, { onFollow })
    expect(view.container.querySelector('button')).toBeNull()

    await answer()
    view.container.querySelector('button')?.dispatchEvent(new Event('click', { bubbles: true }))
    expect(onFollow).toHaveBeenCalledWith('reader')
  })

  it('an explicit opt-out permits an early click, so the shell owns its action readiness', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn<(by: string) => void>()
    const view = mountTree({ auth: client }, FollowButton, { onFollow })
    // No gate: the button renders before the restore answered.
    view.container.querySelector('button')?.dispatchEvent(new Event('click', { bubbles: true }))
    await answer()
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('renders an anonymous visitor as signed out immediately without a hold', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    const view = mountTree({ auth: client }, GatedSession, {})
    expect(view.container.textContent).not.toContain('Restoring')
    expect(view.container.querySelector('h1')?.textContent).toBe('Signed out')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders when the restore cannot reach the server', async () => {
    document.cookie = 'mol_auth=1; path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's hooks.client.ts does before the first render.
    void client.initialize()
    const view = mountTree({ auth: client }, ServerShellGate, {})
    expect(view.container.textContent).toContain('Restoring')
    await client.whenRestored!()
    flushSync()
    expect(client.getState().status).toBe('unavailable')
    expect(view.container.textContent).toContain('Server page')
  })

  it('renders at once when no auth client is given', () => {
    const view = mountPlain(PlainPage, {})
    expect(view.container.textContent).toContain('Server page')
  })
})

describe('SessionReady', () => {
  it('renders its fallback, then the children with the restored user', async () => {
    const { client, answer } = returningVisitor()
    const view = mountTree({ auth: client }, GatedSession, {})
    expect(view.container.textContent).toContain('Restoring')
    expect(view.container.querySelector('h1')).toBeNull()
    await answer()
    expect(view.container.querySelector('h1')?.textContent).toBe('Signed in as Reader')
    expect(client.getState().status).toBe('authenticated')
  })
})
