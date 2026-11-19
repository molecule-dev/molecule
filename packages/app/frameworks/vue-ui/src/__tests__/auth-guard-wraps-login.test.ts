// @vitest-environment jsdom
/**
 * An AuthGuard that wraps the whole route tree, login page included, must
 * redirect once and then render the login page.
 *
 * Before the fix the guard stayed mounted on `/login` and kept redirecting: a
 * redirect computed on every render re-ran the navigation on every render, so
 * the tab hung (and a test worker ran out of memory).
 *
 * Vue port of `@molecule/app-ui-react`'s `auth-guard-wraps-login` test: the auth
 * status is stubbed and the guard runs against a real in-memory molecule router.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-vue', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const { computed } = await import('vue')
  return {
    ...actual,
    useAuth: () => ({
      status: computed(() => 'unauthenticated'),
      isAuthenticated: computed(() => false),
    }),
    useTranslation: () => ({
      t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
    }),
  }
})

import { createApp, defineComponent, h, nextTick } from 'vue'

import { createMemoryRouter } from '@molecule/app-routing'

const { AuthGuard } = await import('../components/AuthGuard.js')
const { moleculePlugin, useLocation } = await import('@molecule/app-vue')

/** The mounts this test opened, unmounted after each case. */
const mounted: ReturnType<typeof createApp>[] = []

let renders = 0

/** Counts its renders and shows the current path. */
const Where = defineComponent({
  setup() {
    const location = useLocation()
    return () => {
      renders++
      return h('p', { 'data-testid': 'where' }, location.value.pathname)
    }
  },
})

/** The routed content for the paths this test exercises. */
const RoutesView = defineComponent({
  setup() {
    const location = useLocation()
    return () => {
      const pathname = location.value.pathname
      if (pathname === '/') return h('div', null, 'protected page')
      if (pathname === '/login') return h('div', null, 'login page')
      if (pathname === '/signin') return h('div', null, 'signin page')
      return null
    }
  },
})

/**
 * Mounts the guard around the whole route tree at `initial`.
 * @param initial - The starting path.
 * @param loginPath - The guard's `loginPath`, when the case sets one.
 */
async function renderWrapped(initial: string, loginPath?: string): Promise<void> {
  const router = createMemoryRouter({ initialEntries: [initial] })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    render: () => h(AuthGuard, { loginPath }, () => [h(RoutesView), h(Where)]),
  })
  app.use(moleculePlugin, { router })
  app.mount(host)
  mounted.push(app)
  await nextTick()
  await nextTick()
}

/** Everything the rendered page currently shows. */
const bodyText = (): string => document.body.textContent ?? ''

/** The path the routed content last rendered. */
const where = (): string => document.querySelector('[data-testid="where"]')!.textContent ?? ''

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
  renders = 0
})

describe('AuthGuard around the login route', () => {
  it('redirects once to the login path and renders the login page', async () => {
    await renderWrapped('/')

    expect(bodyText()).toContain('login page')
    expect(bodyText()).not.toContain('protected page')
    expect(where()).toBe('/login')
    expect(renders).toBeLessThan(5)
  })

  it('compares only the pathname of a login path with a query', async () => {
    await renderWrapped('/', '/signin?next=%2F')

    expect(bodyText()).toContain('signin page')
    expect(where()).toBe('/signin')
    expect(renders).toBeLessThan(5)
  })
})
