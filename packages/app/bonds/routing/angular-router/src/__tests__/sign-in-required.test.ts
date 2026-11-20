// @vitest-environment jsdom
/**
 * The React bond's `sign-in-required.test.tsx`, ported to `provideMoleculeRouter` in a real
 * Angular application: the same titles and assertions, with Angular's path location, hash
 * location (`withHashLocation()`) and memory history (`provideLocationMocks()`) standing in
 * for React Router's `BrowserRouter`, `HashRouter` and `MemoryRouter`. The React test
 * unmounts its router; here the application is destroyed.
 *
 * @module
 */
import '@angular/compiler'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ROUTER } from '@molecule/app-angular'
import { bond } from '@molecule/app-bond'
import type {
  NavigationAction,
  RouteLocation,
  Router,
  SignInRequiredRequest,
  SignInRequiredSessionState,
} from '@molecule/app-routing'

import { provideMoleculeRouter } from '../providers.js'
import { bootApp, type BootAppOptions, type BootedApp, historyMove } from './angular-app.js'

const privatePath = '/?feed=following#results'
const anonymousGet: SignInRequiredRequest & { url: string } = {
  method: 'GET',
  url: '/api/articles/feed',
  sentCredentials: false,
}

/** The applications a test booted, destroyed after it. */
const booted: BootedApp[] = []

/** Settles every booted application's navigations. */
const settleAll = async (): Promise<void> => {
  for (const app of booted) await app.settle()
}

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
      await settleAll()
    },
    async respondWithoutMetadata() {
      listeners.forEach((listener) => Reflect.apply(listener, undefined, []))
      await settleAll()
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
      await settleAll()
    },
  }
}

/** The app-level router with what a page reads from it. */
interface View {
  app: BootedApp
  router: Router
  current(): { location: RouteLocation; action: NavigationAction | undefined }
  unmount(): void
}

/**
 * Boots an application with `provideMoleculeRouter`, then opens `entries` after the first.
 *
 * @param options - The history flavour and the first path.
 * @param entries - Further paths to open, in order; the last is current.
 * @param signInPath - The configured sign-in path.
 * @returns The view.
 */
async function open(
  options: BootAppOptions,
  entries: string[] = [],
  signInPath?: string | false,
): Promise<View> {
  const app = await bootApp({ ...options, providers: [provideMoleculeRouter({ signInPath })] })
  booted.push(app)
  const router = app.injector.get(ROUTER)
  let action: NavigationAction | undefined
  router.subscribe((_location, next) => {
    action = next
  })
  for (const entry of entries) {
    await app.router.navigateByUrl(entry)
    await app.settle()
  }
  action = undefined
  return {
    app,
    router,
    current: () => ({ location: router.getLocation(), action }),
    unmount: () => app.teardown(),
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
  open({ memory: true, initialPath: '/previous' }, [entry], signInPath)

afterEach(() => {
  booted.splice(0).forEach((app) => app.teardown())
  bond('auth-client', null)
  bond('http-client', null)
  window.history.replaceState(null, '', '/')
})

describe('redirect after an anonymous GET is rejected', () => {
  it.each(['BrowserRouter', 'HashRouter', 'MemoryRouter'] as const)(
    '%s replaces the route and passes the entire original location back',
    async (kind) => {
      const { http } = wire()
      const view = await open({
        initialPath: privatePath,
        hash: kind === 'HashRouter',
        memory: kind === 'MemoryRouter',
      })
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
    await historyMove(view.app, -1)
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
    await view.app.settle()
    await auth.settle('unauthenticated')
    expect(view.current().location.pathname).toBe('/public')
    expect(auth.listeners.size).toBe(0)

    booted.splice(booted.indexOf(view.app), 1)
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
