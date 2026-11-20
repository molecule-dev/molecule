// @vitest-environment jsdom
/**
 * The React bond's `sign-in-required.test.tsx`, carried to the SvelteKit bond: the same
 * titles and assertions, over kit's real client router with the test app's
 * `MoleculeRouterProvider` building the app's router. What the React-only parts mean here:
 *
 * - `BrowserRouter`, `HashRouter` and `MemoryRouter` are React Router's three histories.
 *   SvelteKit has one client router, over the browser's history; each row runs under it, and
 *   the suite's three projects run that client over the root, a base path and hash routing.
 * - React bonds its fake clients before rendering. `startKit` gives each app a fresh module
 *   graph, so the case hands its fakes to the test app (`setSignInProbe`), whose root layout
 *   bonds them before the provider builds the router, as an app's bonds are set up first.
 * - React unmounts its router; here the router's life ends with `destroy()`.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  NavigationAction,
  RouteLocation,
  Router,
  SignInRequiredRequest,
  SignInRequiredSessionState,
} from '@molecule/app-routing'

import { setSignInProbe, type SignInProbe } from './kit-app/src/lib/probe.js'
import { awaitNavigation, documentUrl, settle, type StartedKit, startKit } from './start-kit.js'

const privatePath = '/?feed=following#results'
const anonymousGet: SignInRequiredRequest & { url: string } = {
  method: 'GET',
  url: '/api/articles/feed',
  sentCredentials: false,
}

let kit: StartedKit | undefined
let container: HTMLElement | undefined

/** Waits until kit has committed every navigation the router started. */
const settleKit = async (): Promise<void> => {
  if (kit) await settle(kit.app)
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
      await settleKit()
    },
    async respondWithoutMetadata() {
      listeners.forEach((listener) => Reflect.apply(listener, undefined, []))
      await settleKit()
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
      await settleKit()
    },
  }
}

/** The app's router with what a page reads from it. */
interface View {
  router: Router
  current(): { location: RouteLocation; action: NavigationAction | undefined }
  unmount(): void
}

/** What the next started app's layout bonds, set by {@link wire}. */
let probe: SignInProbe | undefined

/**
 * Starts kit at `start`, then opens `entries` through the app's router.
 *
 * @param start - The in-app path kit starts at.
 * @param entries - Further paths to open, in order; the last is current.
 * @param signInPath - The provider's sign-in path.
 * @returns The view.
 */
async function open(
  start: string,
  entries: string[] = [],
  signInPath?: string | false,
): Promise<View> {
  if (!probe) throw new Error('wire() the fake clients first')
  setSignInProbe({ ...probe, signInPath })
  container = document.createElement('div')
  document.body.appendChild(container)
  kit = await startKit(documentUrl(start), container)
  const { router } = kit.app
  let action: NavigationAction | undefined
  router.subscribe((_location, next) => {
    action = next
  })
  for (const entry of entries) {
    await router.navigate(entry)
    await settleKit()
  }
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
  probe = { http: http.client, auth: auth.client }
  return { auth, http }
}

const mount = (entry = privatePath, signInPath?: string | false): Promise<View> =>
  open('/previous', [entry], signInPath)

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  kit?.stop()
  kit = undefined
  container?.remove()
  container = undefined
  probe = undefined
  setSignInProbe(undefined)
})

describe('redirect after an anonymous GET is rejected', () => {
  it.each(['BrowserRouter', 'HashRouter', 'MemoryRouter'] as const)(
    '%s replaces the route and passes the entire original location back',
    async (_kind) => {
      const { http } = wire()
      const view = await open(privatePath)
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
    if (!kit) throw new Error('kit did not start')
    await awaitNavigation(kit.app, () => window.history.back())
    await settleKit()
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
    await view.router.navigate('/public')
    await settleKit()
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
    probe =
      missing === 'auth-client'
        ? { http: http.client }
        : { http: http.client, auth: auth.client, withoutHttp: true }
    const view = await mount()
    await http.respond(401)
    expect(view.current().location.pathname).toBe('/')
    expect(http.listeners.size).toBe(0)
    expect(auth.client.getState).not.toHaveBeenCalled()
  })
})
