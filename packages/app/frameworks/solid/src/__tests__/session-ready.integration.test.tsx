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

import { createComponent, createEffect, type JSX, useContext } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'

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
import { MoleculeProvider } from '../provider.jsx'
import { SessionReady } from '../session-ready.js'
import type { MoleculeConfig } from '../types.js'

const reader: UserProfile = { id: 'reader', name: 'Reader' }
const clients: AuthClient<UserProfile>[] = []
const disposers: Array<() => void> = []

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
 */
function returningVisitor(): { client: AuthClient<UserProfile>; answer: () => Promise<void> } {
  document.cookie = 'mol_auth=1; path=/'
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
  const client = createJWTAuthClient<UserProfile>({ storage: memoryStorage(), autoRefresh: false })
  clients.push(client)
  // As the scaffold's App.tsx does before the first render.
  void client.initialize()
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

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('MoleculeProvider config.awaitSession', () => {
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
        config: { auth: client },
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

  it('renders a visitor with no session to restore without waiting on a request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const client = createJWTAuthClient<UserProfile>({
      storage: memoryStorage(),
      autoRefresh: false,
    })
    clients.push(client)
    // As the scaffold's App.tsx does before the first render.
    void client.initialize()
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
    expect(client.getState().status).toBe('unauthenticated')
    expect(container.textContent).toContain('Public page')
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
        config: { auth: client },
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
