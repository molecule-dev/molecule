// @vitest-environment jsdom
/**
 * AuthGuard against a REAL restoring client: the first render of a full-load
 * client with a cached session paints the protected page, a signed-out client
 * redirects only after its session decision, and a cookie/Bearer candidate the
 * server could not confirm through a 503 keeps the page (never a redirect).
 *
 * Vue port of `@molecule/app-ui-react`'s `auth-guard-restore.integration` test,
 * rendered with the real `@molecule/app-vue` providers, client and guard — no
 * auth mocks.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import {
  type AuthClient,
  createJWTAuthClient,
  type StorageAdapter,
  type UserProfile,
} from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createMemoryRouter } from '@molecule/app-routing'
import { useAuth, useLocation } from '@molecule/app-vue'

const { AuthGuard } = await import('../components/AuthGuard.js')
const { moleculePlugin } = await import('@molecule/app-vue')

const clients: AuthClient<UserProfile>[] = []
const mounted: ReturnType<typeof createApp>[] = []

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
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  const client = createJWTAuthClient<UserProfile>({ storage, autoRefresh: false })
  clients.push(client)
  return { client, token }
}

/** Exposes the real composable state beside the real route guard. */
const AuthStateReadout = defineComponent({
  setup() {
    const { status, isAuthenticated, user } = useAuth<UserProfile>()
    return () =>
      h(
        'output',
        { 'data-testid': 'auth-state' },
        JSON.stringify({
          status: status.value,
          isAuthenticated: isAuthenticated.value,
          user: user.value,
        }),
      )
  },
})

/** The guarded route content: the protected page, or the login page at `/login`. */
const RouteContent = defineComponent({
  setup() {
    const location = useLocation()
    return () =>
      location.value.pathname === '/login'
        ? h('p', null, 'Login page')
        : h('p', null, 'Protected section')
  },
})

/**
 * Lets Vue flush scheduled updates, including the guard's redirect.
 */
async function flush(): Promise<void> {
  await nextTick()
  await nextTick()
  await nextTick()
}

/**
 * Renders the real provider, client and guard without auth mocks.
 * @param client - The real auth client the app wired.
 */
async function renderGuard(client: AuthClient<UserProfile>): Promise<void> {
  const router = createMemoryRouter({ initialEntries: ['/private'] })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    render: () => h('div', null, [h(AuthStateReadout), h(AuthGuard, null, () => h(RouteContent))]),
  })
  app.use(moleculePlugin, {
    auth: client,
    i18n: createSimpleI18nProvider(),
    router,
  })
  app.mount(host)
  mounted.push(app)
  await flush()
}

/** Everything the rendered page currently shows. */
const bodyText = (): string => document.body.textContent ?? ''

/** The auth state the real composable published. */
const readout = (): unknown =>
  JSON.parse(document.querySelector('[data-testid="auth-state"]')!.textContent ?? '{}')

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
  document.cookie = 'mol_auth=; Max-Age=0; path=/'
})

describe('AuthGuard with a real restoring client', () => {
  it('renders a protected section on the first render of a full-load client with a cached session', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { client } = bearerClient({ id: 'account', email: 'reader@example.test' })
    await renderGuard(client)

    expect(client.getState().status).toBe('authenticated')
    expect(bodyText()).toContain('Protected section')
    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).toBeNull()
    expect(bodyText()).not.toContain('Login page')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('redirects a real signed-out full-load client after its session decision', async () => {
    const client = createJWTAuthClient<UserProfile>({ storage: 'memory', autoRefresh: false })
    clients.push(client)
    await renderGuard(client)
    await client.whenRestored!()
    await flush()

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
    await renderGuard(client)
    await client.whenRestored!()
    await flush()

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
    await renderGuard(client)
    await client.whenRestored!()
    await flush()

    expect(client.getState()).toMatchObject({
      status: 'unavailable',
      authenticated: false,
      user: null,
    })
    expect(client.getAccessToken()).toBe(token)
    expect(bodyText()).toContain('Protected section')
    expect(bodyText()).not.toContain('Login page')
    expect(readout()).toMatchObject({
      status: 'unavailable',
      isAuthenticated: false,
      user: null,
    })
  })
})
