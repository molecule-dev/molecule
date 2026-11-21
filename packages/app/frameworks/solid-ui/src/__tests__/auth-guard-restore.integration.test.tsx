// @vitest-environment jsdom
/**
 * The real restoring auth client behind the guard — the Solid port of
 * `@molecule/app-ui-react`'s `auth-guard-restore.integration.test.tsx`.
 *
 * Nothing about auth is mocked: a real `createJWTAuthClient` feeds the real
 * `useAuth` binding, and a real in-memory router serves the guard's location and
 * redirect. The cases pin when a full-load client may paint a protected page and
 * when it may redirect:
 *
 * - a cached session (token AND profile) paints on the FIRST render, before any
 *   background verification;
 * - a signed-out client redirects after its session decision;
 * - a cookie-only or Bearer candidate the server could not confirm through a
 *   503 keeps its candidate, stays `'unavailable'`, and does NOT redirect.
 *
 * @module
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createMemoryRouter } from '@molecule/app-routing'
import { MoleculeProvider, useAuth, useRouter } from '@molecule/app-solid'

const { AuthGuard } = await import('../components/AuthGuard.jsx')

const clients: AuthClient<UserProfile>[] = []
const disposers: Array<() => void> = []

/** Let Solid's queued updates and the client's promises settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/** A real client whose only credential is the cookie-session presence hint. */
function cookieClient(): AuthClient<UserProfile> {
  document.cookie = 'mol_auth=1; path=/'
  const client = createJWTAuthClient<UserProfile>({ storage: 'memory', autoRefresh: false })
  clients.push(client)
  return client
}

/** A real client with a Bearer candidate but no cached profile. */
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
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
  const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  clients.push(client)
  return { client, token }
}

/** Expose the real binding's state beside the real route guard. */
function AuthStateReadout(): JSX.Element {
  const { status, isAuthenticated, user } = useAuth<UserProfile>()
  return (
    <output data-testid="auth-state">
      {JSON.stringify({ status: status(), isAuthenticated: isAuthenticated(), user: user() })}
    </output>
  )
}

/** The page under the guard: the login page at `/login`, the protected one elsewhere. */
function Routed(): JSX.Element {
  const { location } = useRouter()
  return <>{location().pathname === '/login' ? <p>Login page</p> : <p>Protected section</p>}</>
}

/**
 * Render the real providers, client and guard without auth mocks.
 *
 * @param client - The real auth client under test.
 */
function renderGuard(client: AuthClient<UserProfile>): void {
  const router = createMemoryRouter({ initialEntries: ['/private'] })
  // Startup initializes the client, as a Solid composition root does before the
  // first render (React's `AuthProvider` does the same on mount).
  void client.initialize()
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <MoleculeProvider auth={client} router={router} i18n={createSimpleI18nProvider()}>
          <AuthStateReadout />
          <AuthGuard>
            <Routed />
          </AuthGuard>
        </MoleculeProvider>
      ),
      container,
    ),
  )
}

/** The page text a user sees. */
const bodyText = (): string => document.body.textContent ?? ''

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('AuthGuard with a real restoring client', () => {
  it('renders a protected section on the first render of a full-load client with a cached session', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const { client } = bearerClient({ id: 'account', email: 'reader@example.test' })
    renderGuard(client)

    expect(client.getState().status).toBe('authenticated')
    expect(bodyText()).toContain('Protected section')
    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).toBeNull()
    expect(bodyText()).not.toContain('Login page')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('redirects a real signed-out full-load client after its session decision', async () => {
    const client = createJWTAuthClient<UserProfile>({ storage: 'memory', autoRefresh: false })
    clients.push(client)
    renderGuard(client)
    await client.whenRestored!()
    await settle()

    expect(client.getState().status).toBe('unauthenticated')
    expect(bodyText()).toContain('Login page')
    expect(bodyText()).not.toContain('Protected section')
  })

  it('does not redirect a cookie-only candidate through a 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const client = cookieClient()
    renderGuard(client)
    await client.whenRestored!()
    await settle()

    expect(client.getState()).toMatchObject({
      status: 'unavailable',
      authenticated: false,
      user: null,
    })
    expect(bodyText()).toContain('Protected section')
    expect(bodyText()).not.toContain('Login page')
    expect(document.cookie).toContain('mol_auth=1')
  })

  it('does not redirect a Bearer candidate through a 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"error":"down"}', { status: 503 })),
    )
    const { client, token } = bearerClient()
    renderGuard(client)
    await client.whenRestored!()
    await settle()

    expect(client.getState()).toMatchObject({
      status: 'unavailable',
      authenticated: false,
      user: null,
    })
    expect(client.getAccessToken()).toBe(token)
    expect(bodyText()).toContain('Protected section')
    expect(bodyText()).not.toContain('Login page')
    expect(
      JSON.parse(document.querySelector('[data-testid="auth-state"]')?.textContent ?? '{}'),
    ).toMatchObject({ status: 'unavailable', isAuthenticated: false, user: null })
  })
})
