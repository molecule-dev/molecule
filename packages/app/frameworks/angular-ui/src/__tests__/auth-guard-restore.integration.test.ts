// @vitest-environment jsdom
/**
 * AuthGuard with a REAL restoring client, providers and router — no auth mock.
 * A port of `@molecule/app-ui-react/src/__tests__/auth-guard-restore.integration.test.tsx`:
 * the Angular guard renders the protected section from the client's status as
 * soon as the client holds a session, redirects a signed-out visitor once the
 * session is decided, and never treats an unconfirmed candidate (`503`) as a
 * sign-out.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import { Component, provideZonelessChangeDetection } from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  provideAuth,
  provideDomPlacement,
  provideI18n,
  provideRouter,
  type RouteLocation,
  type Router,
  useAuth,
  useRouter,
} from '@molecule/app-angular'
import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'

const { AuthGuard } = await import('../components/auth-guard.component.js')

/** An empty params record for a generic getter. */
/** A memory router whose navigation the guard drives. */
interface MemoryRouter {
  /** The router instance the binding follows. */
  router: Router
  /** Every `navigate` call, in order. */
  navigations: string[]
}

/**
 * Builds a router that starts at a path and follows navigations, like React's
 * `MemoryRouter`.
 *
 * @param initial - The starting path.
 * @returns The router and the paths it was asked to open.
 */
function memoryRouter(initial: string): MemoryRouter {
  /** Splits a path into its location parts. */
  const parse = (path: string): RouteLocation => {
    const [rest, hash = ''] = path.split('#')
    const [pathname = '/', search = ''] = (rest ?? '').split('?')
    return {
      pathname: pathname || '/',
      search: search ? `?${search}` : '',
      hash: hash ? `#${hash}` : '',
    }
  }
  let location = parse(initial)
  const listeners = new Set<Parameters<Router['subscribe']>[0]>()
  const navigations: string[] = []
  const notify = (): void => {
    for (const listener of [...listeners]) listener(location, 'push')
  }
  const router: Router = {
    getLocation: () => location,
    getParams: <T extends Record<string, string> = Record<string, string>>(): T => ({}) as T,
    getQuery: () => ({}),
    getQueryParam: () => undefined,
    getHash: () => location.hash,
    navigate: (path) => {
      navigations.push(path)
      location = parse(path)
      notify()
    },
    navigateTo: () => {},
    back: () => {},
    forward: () => {},
    go: () => {},
    setQuery: () => {},
    setQueryParam: () => {},
    setHash: () => {},
    isActive: (path) => location.pathname === path,
    matchPath: () => null,
    generatePath: () => '',
    createHref: (path: string) => path,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    addGuard: () => () => {},
    registerRoutes: () => {},
    getRoutes: () => [],
    destroy: () => listeners.clear(),
  }
  return { router, navigations }
}

const clients: AuthClient<UserProfile>[] = []

/** A real client whose only credential is the cookie-session presence hint. */
function cookieClient(): AuthClient<UserProfile> {
  document.cookie = 'mol_auth=1; path=/'
  const client = createJWTAuthClient<UserProfile>({ storage: 'memory', autoRefresh: false })
  clients.push(client)
  return client
}

/**
 * A real client with a Bearer candidate but no cached profile.
 *
 * @param profile - The cached profile, when the candidate carries one.
 * @returns The client and its token.
 */
function bearerClient(profile?: UserProfile): { client: AuthClient<UserProfile>; token: string } {
  const token = [
    btoa('{}'),
    btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    'signature',
  ].join('.')
  const values = new Map([['molecule:auth:accessToken', token]])
  if (profile) values.set('molecule:auth:user', JSON.stringify(profile))
  const storage: StorageAdapter = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  clients.push(client)
  return { client, token }
}

/**
 * Exposes the real hook state beside the real guard, and the page the current
 * route shows (`/private` protected, `/login` the login page).
 */
const AuthHost = Component({
  selector: 'div[data-auth-host]',
  standalone: true,
  imports: [AuthGuard],
  template: `<output data-testid="auth-state">{{ readout() }}</output>
    <mol-auth-guard>
      <p>{{ pageText() }}</p>
    </mol-auth-guard>`,
})(
  class AuthHostComponent {
    readonly auth = useAuth<UserProfile>()
    private readonly router = useRouter()

    /** The routed page the current location shows. */
    pageText(): string {
      return this.router.location().pathname === '/login' ? 'Login page' : 'Protected section'
    }

    /** The hook state, serialized the way React's readout shows it. */
    readout(): string {
      return JSON.stringify({
        status: this.auth.status(),
        isAuthenticated: this.auth.isAuthenticated(),
        user: this.auth.user(),
      })
    }
  },
)

/**
 * Renders the real providers, client and guard without auth mocks.
 *
 * @param client - The restoring client to provide.
 * @param router - The router the guard follows.
 * @returns The TestBed fixture.
 */
function renderGuard(client: AuthClient<UserProfile>, router: Router): ComponentFixture<unknown> {
  TestBed.configureTestingModule({
    imports: [AuthHost],
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideAuth(client),
      provideI18n(createSimpleI18nProvider()),
      provideRouter(router),
    ],
  })
  const fixture = TestBed.createComponent(AuthHost)
  fixture.detectChanges()
  return fixture
}

/** The element the tree renders with this text, or `null`. */
const findText = (text: string): Element | null =>
  [...document.querySelectorAll('p')].find((el) => el.textContent === text) ?? null

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
  document.body.innerHTML = ''
})

describe('AuthGuard with a real restoring client', () => {
  it('renders a protected section on the first render of a full-load client with a cached session', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { client } = bearerClient({ id: 'account', email: 'reader@example.test' })
    renderGuard(client, memoryRouter('/private').router)

    expect(client.getState().status).toBe('authenticated')
    expect(findText('Protected section')).not.toBeNull()
    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).toBeNull()
    expect(findText('Login page')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('redirects a real signed-out full-load client after its session decision', async () => {
    const client = createJWTAuthClient<UserProfile>({ storage: 'memory', autoRefresh: false })
    clients.push(client)
    const { router, navigations } = memoryRouter('/private')
    const fixture = renderGuard(client, router)
    await client.whenRestored!()
    fixture.detectChanges()

    expect(client.getState().status).toBe('unauthenticated')
    expect(findText('Login page')).not.toBeNull()
    expect(findText('Protected section')).toBeNull()
    expect(navigations).toEqual(['/login'])
  })

  it('does not redirect a cookie-only candidate through a 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = cookieClient()
    const { router, navigations } = memoryRouter('/private')
    const fixture = renderGuard(client, router)
    await client.whenRestored!()
    fixture.detectChanges()

    expect(client.getState()).toMatchObject({
      status: 'unavailable',
      authenticated: false,
      user: null,
    })
    expect(findText('Protected section')).not.toBeNull()
    expect(findText('Login page')).toBeNull()
    expect(document.cookie).toContain('mol_auth=1')
    expect(navigations).toEqual([])
  })

  it('does not redirect a Bearer candidate through a 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const { client, token } = bearerClient()
    const { router, navigations } = memoryRouter('/private')
    const fixture = renderGuard(client, router)
    await client.whenRestored!()
    fixture.detectChanges()

    expect(client.getState()).toMatchObject({
      status: 'unavailable',
      authenticated: false,
      user: null,
    })
    expect(client.getAccessToken()).toBe(token)
    expect(findText('Protected section')).not.toBeNull()
    expect(findText('Login page')).toBeNull()
    expect(
      JSON.parse(document.querySelector('[data-testid="auth-state"]')?.textContent ?? '{}'),
    ).toMatchObject({
      status: 'unavailable',
      isAuthenticated: false,
      user: null,
    })
    expect(navigations).toEqual([])
  })
})
