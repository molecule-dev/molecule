// @vitest-environment jsdom

/**
 * `MoleculeProvider config.awaitSession` / `SessionReady` against the real restoring auth
 * client.
 *
 * A returning visitor's session comes back from one cookie-restore request after a page
 * load. Pages that rendered before it answered read `user() === null`: public pages lose
 * signed-in actions whose handlers check `!user()` (a no-op or a redirect to `/login`).
 * These cases mirror the React package's `session-ready.integration.test.tsx`.
 *
 * Uses Solid's supported hyperscript JSX runtime and its real browser DOM renderer.
 * Only package resolution is changed from the Node server build to the browser build.
 *
 * @module
 */

vi.mock('solid-js', () => vi.importActual('solid-js/dist/solid.js'))

vi.mock('solid-js/web', () => vi.importActual('solid-js/web/dist/web.js'))

import { createComponent, createEffect, createSignal, type JSX, useContext } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { lightTheme, type ThemeProvider as ThemeProviderType } from '@molecule/app-theme'

import {
  AuthContext,
  HttpContext,
  I18nContext,
  LoggerContext,
  RouterContext,
  StateContext,
  StorageContext,
  ThemeContext,
} from '../context.js'
import { createAuth, createAuthFromClient } from '../primitives/auth.js'
import { useTranslation } from '../primitives/i18n.js'
import { createTheme } from '../primitives/theme.js'
import { AuthProvider, MoleculeProvider } from '../provider.jsx'
import { SessionReady } from '../session-ready.js'
import type { MoleculeConfig } from '../types.js'

const reader: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []
const disposers: Array<() => void> = []
/** A stored JWT the bundled client parses as unexpired without a request. */
const validToken = [btoa('{}'), btoa(JSON.stringify({ exp: 4_102_444_800 })), 'signature'].join('.')

/** A page that renders the session the provider decided. */
function SessionPage(): JSX.Element {
  const { state, user } = createAuth<UserProfile>()
  return (
    <h1>{state().status === 'authenticated' ? `Signed in as ${user()?.name}` : 'Signed out'}</h1>
  )
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

function memoryStorage(initial: Record<string, string> = {}): StorageAdapter {
  const values = new Map(Object.entries(initial))
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

/** Let Solid's async effect queue flush between client state writes and assertions. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/** Render with Solid's browser renderer and dispose every owner after each test. */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * A real client for a returning visitor whose restore request answers when `answer` is
 * called. Every auth consumer must join that request without refreshing again.
 *
 * @param initialize - Whether to start the restore before the first render, as
 *   the scaffold's App.tsx does. `false` lets the first read start it.
 * @returns The client and the responder.
 */
function returningVisitor(initialize = true): {
  client: AuthClient<UserProfile>
  answer: () => Promise<void>
} {
  document.cookie = 'mol_auth=1; path=/'
  const responders: Array<(response: Response) => void> = []
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>((url) =>
      String(url).endsWith('/users/me')
        ? new Promise<Response>((resolve) => {
            responders.push(resolve)
          })
        : Promise.resolve(
            Response.json({ accessToken: 'new-token', user: { ...reader, id: 'new-reader' } }),
          ),
    ),
  )
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  // As the scaffold's App.tsx does before the first render.
  if (initialize) void client.initialize()
  return {
    client,
    answer: async () => {
      for (const respond of responders.splice(0)) {
        respond(
          new Response(JSON.stringify({ user: reader }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      await client.whenRestored!()
      await settle()
    },
  }
}

/** The handler shape the benchmark runs wrote: a signed-in action that bails when `user()` is null. */
function FollowButton(props: { onFollow: (by: string) => void }): JSX.Element {
  const { user } = createAuth<UserProfile>()
  return (
    <button
      type="button"
      onClick={() => {
        const current = user()
        if (!current) return
        props.onFollow(current.id)
      }}
    >
      Follow
    </button>
  )
}

/** A page that renders the user the session decided (function children, resolved on mount). */
function Name(): JSX.Element {
  const { user } = createAuth<UserProfile>()
  return <p>{user()?.name ? `Signed in as ${user()?.name}` : 'Signed out'}</p>
}

/**
 * Renders children under React's two auth entry points: the auth-only provider
 * and the combined provider, each with its default session hold.
 *
 * @param provider - Which entry point to use.
 * @param client - The auth client the tree reads.
 * @param children - The page to render.
 * @param sessionFallback - Content shown while the session is undecided.
 * @returns The container the page rendered into.
 */
function renderProvider(
  provider: 'auth' | 'molecule',
  client: AuthClient<UserProfile>,
  children: () => JSX.Element,
  sessionFallback?: JSX.Element,
): HTMLElement {
  return mount(() =>
    provider === 'auth'
      ? createComponent(AuthProvider, {
          client,
          sessionFallback,
          get children() {
            return children()
          },
        })
      : createComponent(MoleculeProvider, {
          // React's combined provider holds by default; Solid's combined provider
          // takes the hold explicitly, so the case asks for it here.
          config: { auth: client, awaitSession: true, sessionFallback },
          get children() {
            return children()
          },
        }),
  )
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('MoleculeProvider config.awaitSession', () => {
  it.each(['auth', 'molecule'] as const)(
    '%s provider waits by default so a returning inventory operator can use the first action',
    async (provider) => {
      const { client, answer } = returningVisitor(false)
      const changed = vi.fn()
      function InventoryAction(): JSX.Element {
        const { user, state } = createAuth<UserProfile>()
        return (
          <button
            onClick={() => {
              const current = user()
              if (state().status !== 'authenticated' || !current) return
              changed(current.id)
            }}
          >
            Reserve stock
          </button>
        )
      }
      const container = renderProvider(provider, client, () => createComponent(InventoryAction, {}))
      expect(container.querySelector('button')).toBeNull()
      await answer()
      container.querySelector('button')?.click()
      expect(changed).toHaveBeenCalledExactlyOnceWith(reader.id)
    },
  )

  it.each(['auth', 'molecule'] as const)(
    '%s provider seeds a mounted profile form from the restored user by default',
    async (provider) => {
      const { client, answer } = returningVisitor(false)
      function ProfileDraft(): JSX.Element {
        const { user } = createAuth<UserProfile>()
        return <input aria-label="Display name" value={user()?.name ?? ''} />
      }
      const container = renderProvider(
        provider,
        client,
        () => createComponent(ProfileDraft, {}),
        <p>Restoring profile</p>,
      )
      expect(container.querySelector('input')).toBeNull()
      expect(container.textContent).toContain('Restoring profile')
      await answer()
      const input = container.querySelector('input')
      expect(input?.value).toBe(reader.name)
    },
  )

  it.each(['auth', 'molecule'] as const)(
    '%s provider renders a cached visitor on the first render without entry initialization',
    (provider) => {
      // Solid has no StrictMode double invocation; the caller-observable fact is
      // that a cached session renders signed in on the first render with no request.
      const fetchSpy = vi.fn<typeof fetch>()
      vi.stubGlobal('fetch', fetchSpy)
      const client = cachedVisitor(validToken)
      const container = renderProvider(provider, client, () => createComponent(SessionPage, {}))
      expect(container.querySelector('h1')?.textContent).toBe('Signed in as Reader')
      expect(fetchSpy).not.toHaveBeenCalled()
    },
  )

  it.each(['login', 'register'] as const)(
    'keeps the page mounted after %s wins a pending restore',
    async (method) => {
      const { client, answer } = returningVisitor()
      function Name(): JSX.Element {
        const { user } = createAuth<UserProfile>()
        // An uncontrolled draft, like React's `defaultValue`: a later background
        // user update must not rewrite what the visitor typed.
        const [draft, setDraft] = createSignal(user()?.name ?? '')
        return (
          <input
            aria-label="Profile name"
            value={draft()}
            onInput={(event) => setDraft(event.currentTarget.value)}
          />
        )
      }
      const container = renderProvider('molecule', client, () => createComponent(Name, {}))
      await client[method]({ email: 'new@example.test', password: 'password' })
      await settle()
      const input = container.querySelector('input')
      if (!input) throw new Error('the profile name input did not render')
      input.value = 'Unsaved draft'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await answer()
      client.setUser({ ...reader, id: 'new-reader', name: 'Updated' })
      await settle()
      expect(container.querySelector('input')).toBe(input)
      expect(input.value).toBe('Unsaved draft')
      expect(client.getState()).toMatchObject({ status: 'authenticated', initialized: true })
    },
  )

  it('shows no page until a returning visitor is restored, so a first click is signed in', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    // Hand-written `createComponent` (what vite-plugin-solid emits): the children getter
    // is what keeps the page unrendered until the providers — and SessionReady — allow it.
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true },
        get children() {
          return createComponent(FollowButton, { onFollow })
        },
      }),
    )
    await settle()
    expect(container.querySelector('button')).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)

    await answer()
    const button = container.querySelector('button')
    expect(button).not.toBeNull()
    button?.click()
    expect(onFollow).toHaveBeenCalledWith('reader')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('without it, the same click lands before the restore and is lost', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: false },
        get children() {
          return createComponent(FollowButton, { onFollow })
        },
      }),
    )
    await settle()
    container.querySelector('button')?.click()
    await answer()
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('renders an anonymous visitor on mount without entry initialization', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true },
        get children() {
          return <p>Public page</p>
        },
      }),
    )
    expect(container.textContent).toContain('Public page')
    expect(client.getState().status).toBe('unauthenticated')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders when the restore cannot reach the server', async () => {
    document.cookie = 'mol_auth=1; path=/'
    // Hold the 503 answers the same way the success cases hold theirs, so the
    // fallback window is observed before the failure settles.
    const responders: Array<(response: Response) => void> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            responders.push(resolve)
          }),
      ),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's App.tsx does before the first render.
    void client.initialize()
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: {
          auth: client,
          awaitSession: true,
          sessionFallback: <p>Restoring</p>,
        },
        get children() {
          return <p>Public page</p>
        },
      }),
    )
    await settle()
    expect(container.textContent).toContain('Restoring')
    for (const respond of responders.splice(0)) {
      respond(new Response('{"error":"down"}', { status: 503 }))
    }
    await client.whenRestored!()
    await settle()
    expect(client.getState().status).toBe('unavailable')
    expect(container.textContent).toContain('Public page')
  })

  it('renders at once when no auth client is given', async () => {
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { awaitSession: true },
        get children() {
          return <p>Public page</p>
        },
      }),
    )
    expect(container.textContent).toContain('Public page')
  })

  it('provides every service to the session fallback', async () => {
    const { client, answer } = returningVisitor()
    let seen: unknown[] = []
    const state = {} as NonNullable<MoleculeConfig['state']>
    const theme = {} as NonNullable<MoleculeConfig['theme']>
    const router = {} as NonNullable<MoleculeConfig['router']>
    const i18n = {} as NonNullable<MoleculeConfig['i18n']>
    const http = {} as NonNullable<MoleculeConfig['http']>
    const storage = {} as NonNullable<MoleculeConfig['storage']>
    const logger = {} as NonNullable<MoleculeConfig['logger']>
    function Fallback(): JSX.Element {
      seen = [
        useContext(AuthContext),
        useContext(StateContext),
        useContext(ThemeContext),
        useContext(RouterContext),
        useContext(I18nContext),
        useContext(HttpContext),
        useContext(StorageContext),
        useContext(LoggerContext),
      ]
      return <p>Restoring</p>
    }
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: {
          auth: client,
          awaitSession: true,
          state,
          theme,
          router,
          i18n,
          http,
          storage,
          logger,
          get sessionFallback() {
            return createComponent(Fallback, {})
          },
        },
        get children() {
          return <p>Public page</p>
        },
      }),
    )
    expect(container.textContent).toContain('Restoring')
    expect(seen).toEqual([client, state, theme, router, i18n, http, storage, logger])
    await answer()
    expect(container.textContent).toContain('Public page')
  })

  it('does not refresh a cached session when the hold and page mount', async () => {
    document.cookie = 'mol_auth=1; path=/'
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 401 }))
    vi.stubGlobal('fetch', fetchSpy)
    const token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage({
        'molecule:auth:accessToken': token,
        'molecule:auth:user': JSON.stringify(reader),
      }),
      autoRefresh: false,
    })
    clients.push(client)
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true },
        get children() {
          return <Name />
        },
      }),
    )
    await settle()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(client.getState().status).toBe('authenticated')
    expect(container.textContent).toContain('Signed in as Reader')
  })

  it('starts an omitted initialize call and renders after a restore timeout', async () => {
    document.cookie = 'mol_auth=1; path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    )
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
      requestTimeout: 20,
    })
    clients.push(client)
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true },
        get children() {
          return <p>Public page</p>
        },
      }),
    )
    await client.whenRestored!()
    await settle()
    expect(client.getState().status).toBe('unavailable')
    expect(container.textContent).toContain('Public page')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('rechecks a state change before the auth subscription effect runs', async () => {
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    const container = mount(() => {
      const { user } = createAuthFromClient(client)
      client.setSession({ accessToken: 'replacement-token', user: reader })
      const element = document.createElement('p')
      createEffect(() => {
        element.textContent = user()?.name ?? 'Signed out'
      })
      return element
    })
    await settle()
    expect(container.textContent).toBe('Reader')
  })
})

describe('SessionReady', () => {
  it('renders its fallback, then the children with the restored user', async () => {
    const { client, answer } = returningVisitor()
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: false },
        get children() {
          return (
            <SessionReady fallback={<p>Restoring</p>}>
              <Name />
            </SessionReady>
          )
        },
      }),
    )
    await settle()
    expect(container.textContent).toContain('Restoring')
    expect(container.textContent).not.toContain('Signed out')
    await answer()
    expect(container.textContent).toContain('Signed in as Reader')
  })
})

describe('returning visitors, cached sessions and the hold', () => {
  it('waits for one current-user read when the previous document stored only the token', async () => {
    let respond!: (response: Response) => void
    const fetchSpy = vi.fn<typeof fetch>(
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
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true, sessionFallback: <p>Restoring</p> },
        get children() {
          return <SessionPage />
        },
      }),
    )
    expect(container.querySelector('h1')).toBeNull()
    expect(container.textContent).toContain('Restoring')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toBe('/users/me')
    expect(init).toMatchObject({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: `Bearer ${validToken}` }),
    })
    respond(Response.json({ user: reader }))
    await client.whenRestored!()
    await settle()
    expect(container.textContent).toContain('Signed in as Reader')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('renders a cached opaque-token session before a current-user read and verifies it once', async () => {
    document.cookie = 'mol_auth=1; path=/'
    const fetchSpy = vi.fn<typeof fetch>(async () => Response.json({ user: reader }))
    vi.stubGlobal('fetch', fetchSpy)
    const client = cachedVisitor('opaque-token')
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true, sessionFallback: <p>Restoring</p> },
        get children() {
          return <SessionPage />
        },
      }),
    )
    expect(container.textContent).toContain('Signed in as Reader')
    expect(fetchSpy).not.toHaveBeenCalled()

    await Promise.all([client.initialize(), client.initialize()])
    await client.initialize()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toBe('/users/me')
    expect(init).toMatchObject({ method: 'GET', credentials: 'include' })
  })

  it('provides theme and translations to its session fallback', async () => {
    const { client, answer } = returningVisitor()
    const i18n = createSimpleI18nProvider()
    i18n.addTranslations('en', { restoring: 'Translated restore' })
    const theme: ThemeProviderType = {
      getTheme: () => lightTheme,
      setTheme: () => undefined,
      toggleMode: () => undefined,
      subscribe: () => () => undefined,
      getThemes: () => [lightTheme],
    }
    function Fallback(): JSX.Element {
      const { theme } = createTheme()
      const { t } = useTranslation()
      return (
        <p>
          {theme().name}: {t('restoring')}
        </p>
      )
    }
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: {
          auth: client,
          theme,
          i18n,
          awaitSession: true,
          get sessionFallback() {
            return createComponent(Fallback, {})
          },
        },
        get children() {
          return <p>Public page</p>
        },
      }),
    )
    expect(container.textContent).toContain(`${lightTheme.name}: Translated restore`)
    await answer()
    expect(container.textContent).toContain('Public page')
  })

  it('lazily restores exactly once under StrictMode without initialize()', async () => {
    // Solid has no StrictMode double-invocation; what a caller observes is that
    // a mount with no `initialize()` starts exactly one restore and renders the
    // page once it answers.
    const { client, answer } = returningVisitor(false)
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true },
        get children() {
          return <p>Public page</p>
        },
      }),
    )
    await settle()
    expect(container.textContent).not.toContain('Public page')
    expect(fetch).toHaveBeenCalledTimes(1)
    await answer()
    expect(container.textContent).toContain('Public page')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('releases a sign-out during the hold and ignores the late restored user', async () => {
    const { client, answer } = returningVisitor()
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true },
        get children() {
          return <p>Public page</p>
        },
      }),
    )
    expect(container.textContent).not.toContain('Public page')
    await client.logout()
    await settle()
    expect(container.textContent).toContain('Public page')
    await answer()
    expect(client.getState()).toMatchObject({ status: 'unauthenticated', user: null })
  })

  it('releases a hung restore instead of leaving a blank page forever', async () => {
    document.cookie = 'mol_auth=1; path=/'
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => new Promise<Response>(() => undefined)),
    )
    // The harness bounds the request instead of advancing a faked 10-second
    // clock; the behaviour asserted is the same: the hold ends, the page
    // renders, and the session settles as unconfirmed.
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
      requestTimeout: 20,
    })
    clients.push(client)
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true },
        get children() {
          return <p>Public page</p>
        },
      }),
    )
    expect(container.textContent).not.toContain('Public page')
    await client.whenRestored!()
    await settle()
    expect(container.textContent).toContain('Public page')
    expect(client.getState().status).toBe('unavailable')
  })

  it('an explicit opt-out permits an early click, so the shell owns its action readiness', async () => {
    const { client, answer } = returningVisitor()
    const onFollow = vi.fn()
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: false },
        get children() {
          return createComponent(FollowButton, { onFollow })
        },
      }),
    )
    container.querySelector('button')?.click()
    await answer()
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('renders an anonymous visitor as signed out immediately without a hold', () => {
    const fetchSpy = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    const container = mount(() =>
      createComponent(MoleculeProvider, {
        config: { auth: client, awaitSession: true, sessionFallback: <p>Restoring</p> },
        get children() {
          return <SessionPage />
        },
      }),
    )
    expect(container.textContent).not.toContain('Restoring')
    expect(container.textContent).toContain('Signed out')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
