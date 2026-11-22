// @vitest-environment jsdom
/**
 * AuthGuard decides from `useAuth().status`, not `state.initialized`.
 *
 * xr-molecule-flash-m177: a protected page waited for a session-restore round trip
 * before it rendered, so every navigation in a spec paid an API call — four tests
 * finished at 15.0–15.9 s of a 15 s budget and the grader timed two out. A stored
 * token AND user make the FIRST render `'authenticated'`, so the guard must render
 * the page then and wait only while the status is `'loading'`.
 *
 * Vue port of `@molecule/app-ui-react`'s `auth-guard-status` test: the auth status
 * is stubbed and the guard runs against a real in-memory molecule router.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthState } from '@molecule/app-auth'

const mockAuth = vi.hoisted(() => ({
  state: {
    status: 'authenticated',
    initialized: false,
    authenticated: true,
    user: { id: 'ann' },
    loading: false,
    error: null,
  } as AuthState,
}))

vi.mock('@molecule/app-vue', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const { computed } = await import('vue')
  return {
    ...actual,
    useAuth: () => ({
      status: computed(() => mockAuth.state.status),
      state: computed(() => mockAuth.state),
      isAuthenticated: computed(() => mockAuth.state.authenticated),
    }),
    useTranslation: () => ({
      t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
    }),
  }
})

import { createApp, defineComponent, h, nextTick } from 'vue'

import { I18nError } from '@molecule/app-i18n'
import { createMemoryRouter } from '@molecule/app-routing'

const { AuthGuard } = await import('../components/AuthGuard.js')
const { moleculePlugin, useLocation } = await import('@molecule/app-vue')

/** The mounts this test opened, unmounted after each case. */
const mounted: ReturnType<typeof createApp>[] = []

/**
 * The guarded route content: the protected page at `/`, the login page once
 * the real router lands on `/login`.
 */
const RouteContent = defineComponent({
  setup() {
    const location = useLocation()
    return () =>
      location.value.pathname === '/login'
        ? h('div', null, 'login page')
        : h('div', null, 'protected page')
  },
})

/** Renders the guard around the route content. */
const View = defineComponent({
  setup() {
    return () => h(AuthGuard, null, () => h(RouteContent))
  },
})

/**
 * Mounts the guard inside a fresh in-memory router and lets the redirect settle.
 */
async function renderGuard(): Promise<void> {
  const router = createMemoryRouter({ initialEntries: ['/'] })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(View)
  app.use(moleculePlugin, { router })
  app.mount(host)
  mounted.push(app)
  await nextTick()
  await nextTick()
}

/** Everything the rendered page currently shows. */
const bodyText = (): string => document.body.textContent ?? ''

beforeEach(() => {
  mockAuth.state = {
    status: 'authenticated',
    initialized: false,
    authenticated: true,
    user: { id: 'ann' },
    loading: false,
    error: null,
  }
})

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

describe('AuthGuard reads the session status (xr-molecule-flash-m177)', () => {
  it('renders the page when a restored session is authenticated before `initialized`', async () => {
    // The optimistic restore: a stored token AND user are the session, and the
    // first render must not wait for a background verification.
    await renderGuard()

    expect(bodyText()).toContain('protected page')
    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).toBeNull()
  })

  it('renders the page while the session is `unavailable` (stored, unconfirmed)', async () => {
    mockAuth.state = {
      ...mockAuth.state,
      status: 'unavailable',
      initialized: true,
      authenticated: false,
      user: null,
    }

    await renderGuard()

    expect(bodyText()).toContain('protected page')
  })

  it('shows the loading fallback only while the status is `loading`', async () => {
    mockAuth.state = {
      ...mockAuth.state,
      status: 'loading',
      initialized: false,
      authenticated: false,
      user: null,
    }

    await renderGuard()

    expect(document.querySelector('[data-mol-id="auth-guard-loading"]')).not.toBeNull()
    expect(bodyText()).not.toContain('protected page')
    expect(bodyText()).not.toContain('login page')
  })

  it('redirects an unauthenticated visitor to the login path', async () => {
    mockAuth.state = {
      ...mockAuth.state,
      status: 'unauthenticated',
      initialized: true,
      authenticated: false,
      user: null,
    }

    await renderGuard()

    expect(bodyText()).toContain('login page')
    expect(bodyText()).not.toContain('protected page')
  })

  it('AuthGuard without children throws when there is no routed view', () => {
    mockAuth.state = {
      ...mockAuth.state,
      status: 'authenticated',
      initialized: false,
      authenticated: true,
      user: { id: 'ann' },
    }
    // A router with no routed view: the guard falls back to `RoutedView`.
    const router = createMemoryRouter({ initialEntries: ['/'] })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({ render: () => h(AuthGuard) })
    app.use(moleculePlugin, { router })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let thrown: unknown
    app.config.errorHandler = (error) => {
      thrown = error
    }
    try {
      app.mount(host)
    } finally {
      consoleError.mockRestore()
    }
    mounted.push(app)
    expect(thrown).toBeInstanceOf(I18nError)
    expect(thrown).toMatchObject({ i18nKey: 'vue.error.noRoutedView' })
  })
})
