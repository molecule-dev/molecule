// @vitest-environment jsdom
/**
 * The React bond's `sign-in-required.test.tsx`, ported to the app-level router a Solid app
 * builds with `createSolidRouter()` in its router's `root`: the same titles and assertions,
 * under Solid Router's `Router` and `HashRouter` and the bond's `MemoryRouter`.
 *
 * @module
 */
import { HashRouter, Route, Router, type RouteSectionProps } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { bond } from '@molecule/app-bond'
import type {
  NavigationAction,
  RouteLocation,
  Router as MoleculeRouter,
  SignInRequiredRequest,
  SignInRequiredSessionState,
} from '@molecule/app-routing'

import { MemoryRouter } from '../memory-router.jsx'
import { createSolidRouter } from '../provider.js'

const privatePath = '/?feed=following#results'
const anonymousGet: SignInRequiredRequest & { url: string } = {
  method: 'GET',
  url: '/api/articles/feed',
  sentCredentials: false,
}

/** Lets Solid Router's navigation transitions and effects settle. */
const settle = async (): Promise<void> => {
  for (let round = 0; round < 4; round++) await new Promise((resolve) => setTimeout(resolve, 0))
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
      await settle()
    },
    async respondWithoutMetadata() {
      listeners.forEach((listener) => Reflect.apply(listener, undefined, []))
      await settle()
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
      await settle()
    },
  }
}

/** The app-level router with what a page reads from it. */
interface View {
  router: MoleculeRouter
  current(): { location: RouteLocation; action: NavigationAction | undefined }
  unmount(): void
}

const disposers: Array<() => void> = []

/**
 * Mounts a Solid app whose router `root` builds the app-level router, as the scaffold does.
 *
 * @param shell - The native router element, given the root and the page route.
 * @param signInPath - The configured sign-in path.
 * @returns The view.
 */
async function open(
  shell: (root: (props: RouteSectionProps) => JSX.Element, page: () => JSX.Element) => JSX.Element,
  signInPath?: string | false,
): Promise<View> {
  let built: MoleculeRouter | undefined
  let action: NavigationAction | undefined
  const Root = (props: RouteSectionProps): JSX.Element => {
    built = createSolidRouter({ signInPath })
    built.subscribe((_location, next) => {
      action = next
    })
    return <>{props.children}</>
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(() => shell(Root, () => <div />), container)
  disposers.push(dispose)
  await settle()
  if (!built) throw new Error('the router root did not render')
  const router = built
  action = undefined
  return {
    router,
    current: () => ({ location: router.getLocation(), action }),
    unmount: dispose,
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
  open(
    (root, page) => (
      <MemoryRouter initialEntries={['/previous', entry]} root={root}>
        <Route path="*" component={page} />
      </MemoryRouter>
    ),
    signInPath,
  )

afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose())
  document.body.innerHTML = ''
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
      const view = await open((root, page) => {
        const routes = <Route path="*" component={page} />
        if (kind === 'BrowserRouter') return <Router root={root}>{routes}</Router>
        if (kind === 'HashRouter') return <HashRouter root={root}>{routes}</HashRouter>
        return (
          <MemoryRouter initialEntries={[privatePath]} root={root}>
            {routes}
          </MemoryRouter>
        )
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
    view.router.back()
    await settle()
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
    await settle()
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
