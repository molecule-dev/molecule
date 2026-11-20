// @vitest-environment jsdom
/**
 * The React bond's `sign-in-required.test.tsx`, ported to `createVueRouter` over a real Vue
 * Router: the same titles and assertions, with Vue Router's web, hash and memory histories
 * standing in for React Router's `BrowserRouter`, `HashRouter` and `MemoryRouter`. The
 * React test unmounts its router; here the app-level router's lifetime ends with
 * `destroy()`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
  type RouterHistory as VueHistory,
} from 'vue-router'

import { bond } from '@molecule/app-bond'
import type {
  NavigationAction,
  RouteLocation,
  Router,
  SignInRequiredRequest,
  SignInRequiredSessionState,
} from '@molecule/app-routing'

import { createVueRouter } from '../provider.js'

const privatePath = '/?feed=following#results'
const anonymousGet: SignInRequiredRequest & { url: string } = {
  method: 'GET',
  url: '/api/articles/feed',
  sentCredentials: false,
}

/** Waits a macrotask, so Vue Router's navigation promises have settled. */
const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

function fakeHttp() {
  const listeners = new Set<(event: SignInRequiredRequest | undefined) => void>()
  const client = {
    onAuthError(listener: (event: SignInRequiredRequest | undefined) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    client,
    listeners,
    async respond(status: number, event: SignInRequiredRequest & { url?: string } = anonymousGet) {
      if (status === 401) listeners.forEach((listener) => listener(event))
      await flush()
    },
    async respondWithoutMetadata() {
      listeners.forEach((listener) => Reflect.apply(listener, undefined, []))
      await flush()
    },
  }
}

function fakeAuth(status = 'unauthenticated') {
  const listeners = new Set<(state: SignInRequiredSessionState) => void>()
  let state: SignInRequiredSessionState = { status }
  const client = {
    getState: vi.fn(() => state),
    subscribe(listener: (state: SignInRequiredSessionState) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    client,
    listeners,
    async settle(status: string) {
      state = { ...state, status }
      listeners.forEach((listener) => listener(state))
      await flush()
    },
  }
}

/** The routers a test made, destroyed after it. */
const routers: Router[] = []

/** The app-level router with what a page reads from it. */
interface View {
  router: Router
  current(): { location: RouteLocation; action: NavigationAction | undefined }
  unmount(): void
}

/**
 * Builds the app-level molecule router over a real Vue Router, then opens `entries`.
 *
 * @param history - The Vue Router history.
 * @param entries - The paths to open, in order; the last is current.
 * @param signInPath - The configured sign-in path.
 * @returns The view.
 */
async function open(
  history: VueHistory,
  entries: string[],
  signInPath?: string | false,
): Promise<View> {
  const vueRouter = createRouter({
    history,
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
  })
  const router = createVueRouter({ router: vueRouter, signInPath })
  routers.push(router)
  let action: NavigationAction | undefined
  router.subscribe((_location, next) => {
    action = next
  })
  // With no entries, the first navigation opens the address the history starts on, as
  // `app.use(router)` does.
  for (const entry of entries.length ? entries : [history.location]) await vueRouter.push(entry)
  await vueRouter.isReady()
  await flush()
  action = undefined
  return {
    router,
    current: () => ({ location: router.getLocation(), action }),
    unmount: () => router.destroy(),
  }
}

function wire(status?: string) {
  const auth = fakeAuth(status)
  const http = fakeHttp()
  bond('auth-client', auth.client)
  bond('http-client', http.client)
  return { auth, http }
}

const mount = (entry = privatePath, signInPath?: string | false): Promise<View> =>
  open(createMemoryHistory(), ['/previous', entry], signInPath)

afterEach(() => {
  routers.splice(0).forEach((router) => router.destroy())
  bond('auth-client', null)
  bond('http-client', null)
  window.history.replaceState(null, '', '/')
})

describe('redirect after an anonymous GET is rejected', () => {
  it.each(['BrowserRouter', 'HashRouter', 'MemoryRouter'] as const)(
    '%s replaces the route and passes the entire original location back',
    async (kind) => {
      const { http } = wire()
      window.history.replaceState(
        null,
        '',
        kind === 'HashRouter' ? `/#${privatePath}` : privatePath,
      )
      const history = {
        BrowserRouter: () => createWebHistory(),
        HashRouter: () => createWebHashHistory(),
        MemoryRouter: () => createMemoryHistory(),
      }[kind]()
      const view = await open(history, kind === 'MemoryRouter' ? [privatePath] : [])
      const from = view.current().location

      await http.respond(401)

      expect(view.current()).toMatchObject({
        action: 'replace',
        location: { pathname: '/login', state: { from } },
      })
      expect(from).toMatchObject({ pathname: '/', search: '?feed=following', hash: '#results' })
    },
  )

  it('replaces the rejected history entry once even if several requests fail', async () => {
    const { http } = wire()
    const view = await mount()
    await http.respond(401)
    const atLogin = view.current()
    await http.respond(401)
    expect(view.current()).toEqual(atLogin)
    view.router.back()
    await flush()
    expect(view.current().location.pathname).toBe('/previous')
  })

  it('uses a custom sign-in path including its query', async () => {
    const { http } = wire()
    const view = await mount(privatePath, '/sign-in?source=page')
    await http.respond(401)
    expect(view.current().location).toMatchObject({ pathname: '/sign-in', search: '?source=page' })
  })

  it.each(['/?tag=x', '/?page=2', '/tag/x'])(
    'leaves a public 200 at %s in place',
    async (entry) => {
      const { auth, http } = wire()
      const view = await mount(entry)
      const before = view.current()
      await http.respond(200, { ...anonymousGet, url: '/api/articles' })
      expect(view.current()).toEqual(before)
      expect(auth.client.getState).not.toHaveBeenCalled()
    },
  )

  it.each([401, 422])('ignores a login POST that returns %s', async (status) => {
    const { auth, http } = wire()
    const view = await mount('/login')
    const before = view.current()
    await http.respond(status, { ...anonymousGet, method: 'POST', url: '/api/users/login' })
    expect(view.current()).toEqual(before)
    expect(auth.client.getState).not.toHaveBeenCalled()
  })

  it('ignores a POST even when it fails outside the sign-in path', async () => {
    const { http } = wire()
    const view = await mount()
    await http.respond(401, { ...anonymousGet, method: 'POST' })
    expect(view.current().location.pathname).toBe('/')
  })

  it('ignores an expired credential even if the session subsequently signs out', async () => {
    const { auth, http } = wire('authenticated')
    const view = await mount()
    await http.respond(401, { ...anonymousGet, sentCredentials: true })
    await auth.settle('unauthenticated')
    await http.respond(401, { ...anonymousGet, sentCredentials: true })
    expect(view.current().location.pathname).toBe('/')
    expect(auth.client.getState).not.toHaveBeenCalled()
  })

  it.each(['/login', '/sign-in/?source=other'])('does not replace sign-in at %s', async (path) => {
    const { http } = wire()
    const view = await mount(path, path === '/login' ? undefined : '/sign-in?source=page')
    const before = view.current()
    await http.respond(401)
    expect(view.current()).toEqual(before)
  })

  it.each(['unauthenticated', 'authenticated', 'unavailable'] as const)(
    'waits for a pending session to settle %s',
    async (status) => {
      const { auth, http } = wire('loading')
      const view = await mount()
      await http.respond(401)
      await http.respond(401)
      expect(view.current().location.pathname).toBe('/')
      expect(auth.listeners.size).toBe(1)

      await auth.settle(status)
      expect(view.current().location.pathname).toBe(status === 'unauthenticated' ? '/login' : '/')
      expect(auth.listeners.size).toBe(0)

      if (status !== 'unauthenticated') {
        await auth.settle('unauthenticated')
        expect(view.current().location.pathname).toBe('/')
      }
    },
  )

  it('never redirects when a session is already unavailable', async () => {
    const { http } = wire('unavailable')
    const view = await mount()
    await http.respond(401)
    expect(view.current().location.pathname).toBe('/')
  })

  it('discards a pending rejection when the visitor leaves the page', async () => {
    const { auth, http } = wire('loading')
    const view = await mount()
    await http.respond(401)
    view.router.navigate('/public')
    await flush()
    await auth.settle('unauthenticated')
    expect(view.current().location.pathname).toBe('/public')
    expect(auth.listeners.size).toBe(0)

    view.unmount()
    expect(http.listeners.size).toBe(0)
  })

  it('ignores a notification from an older client without request metadata', async () => {
    const { auth, http } = wire()
    const view = await mount()
    await http.respondWithoutMetadata()
    expect(view.current().location.pathname).toBe('/')
    expect(auth.client.getState).not.toHaveBeenCalled()
  })

  it('does not subscribe when signInPath is false', async () => {
    const { http } = wire()
    const view = await mount(privatePath, false)
    await http.respond(401)
    expect(view.current().location.pathname).toBe('/')
    expect(http.listeners.size).toBe(0)
  })

  it.each(['auth-client', 'http-client'])('is inert without the %s bond', async (missing) => {
    const { auth, http } = wire()
    bond(missing, null)
    const view = await mount()
    await http.respond(401)
    expect(view.current().location.pathname).toBe('/')
    expect(http.listeners.size).toBe(0)
    expect(auth.client.getState).not.toHaveBeenCalled()
  })
})
