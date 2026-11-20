// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useLocation, useNavigate, useNavigationType } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthState, AuthStatus } from '@molecule/app-auth'
import { bond } from '@molecule/app-bond'
import type { HttpAuthErrorEvent, HttpClient } from '@molecule/app-http'

import { BrowserRouter, HashRouter, MemoryRouter } from '../routers.js'

const privatePath = '/?feed=following#results'
const anonymousGet: HttpAuthErrorEvent = {
  method: 'GET',
  url: '/api/articles/feed',
  sentCredentials: false,
}

function fakeHttp() {
  const listeners = new Set<(event: HttpAuthErrorEvent) => void>()
  const client: Pick<HttpClient, 'onAuthError'> = {
    onAuthError(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    client,
    listeners,
    respond(status: number, event = anonymousGet) {
      if (status === 401) act(() => listeners.forEach((listener) => listener(event)))
    },
    respondWithoutMetadata() {
      act(() => listeners.forEach((listener) => Reflect.apply(listener, undefined, [])))
    },
  }
}

function fakeAuth(status: AuthStatus = 'unauthenticated') {
  const listeners = new Set<(state: AuthState) => void>()
  let state: AuthState = {
    status,
    initialized: status !== 'loading',
    authenticated: status === 'authenticated',
    loading: status === 'loading',
    user: null,
    error: null,
  }
  const client: Pick<AuthClient, 'getState' | 'subscribe'> = {
    getState: vi.fn(() => state),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return {
    client,
    listeners,
    settle(status: AuthStatus) {
      state = { ...state, status, initialized: true, loading: false }
      act(() => listeners.forEach((listener) => listener(state)))
    },
  }
}

function LocationProbe() {
  const location = useLocation()
  const navigate = useNavigate()
  const action = useNavigationType()
  return (
    <>
      <output data-testid="location">{JSON.stringify({ location, action })}</output>
      <button onClick={() => void navigate(-1)}>Back</button>
      <button onClick={() => void navigate('/public')}>Open public page</button>
    </>
  )
}

const current = () =>
  JSON.parse(screen.getByTestId('location').textContent ?? '') as {
    location: ReturnType<typeof useLocation>
    action: ReturnType<typeof useNavigationType>
  }

function wire(status?: AuthStatus) {
  const auth = fakeAuth(status)
  const http = fakeHttp()
  bond('auth-client', auth.client)
  bond('http-client', http.client)
  return { auth, http }
}

function mount(entry = privatePath, signInPath?: string | false) {
  return render(
    <MemoryRouter initialEntries={['/previous', entry]} signInPath={signInPath}>
      <LocationProbe />
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  bond('auth-client', null)
  bond('http-client', null)
  window.history.replaceState(null, '', '/')
})

describe('redirect after an anonymous GET is rejected', () => {
  it.each(['BrowserRouter', 'HashRouter', 'MemoryRouter'] as const)(
    '%s replaces the route and passes the entire original location back',
    (kind) => {
      const { http } = wire()
      const router = {
        BrowserRouter: (
          <BrowserRouter>
            <LocationProbe />
          </BrowserRouter>
        ),
        HashRouter: (
          <HashRouter>
            <LocationProbe />
          </HashRouter>
        ),
        MemoryRouter: (
          <MemoryRouter initialEntries={[privatePath]}>
            <LocationProbe />
          </MemoryRouter>
        ),
      }[kind]
      window.history.replaceState(
        null,
        '',
        kind === 'HashRouter' ? `/#${privatePath}` : privatePath,
      )
      render(router)
      const from = current().location

      http.respond(401)

      expect(current()).toMatchObject({
        action: 'REPLACE',
        location: { pathname: '/login', state: { from } },
      })
      expect(from).toMatchObject({ pathname: '/', search: '?feed=following', hash: '#results' })
    },
  )

  it('replaces the rejected history entry once even if several requests fail', () => {
    const { http } = wire()
    mount()
    http.respond(401)
    const atLogin = current()
    http.respond(401)
    expect(current()).toEqual(atLogin)
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(current().location.pathname).toBe('/previous')
  })

  it('uses a custom sign-in path including its query', () => {
    const { http } = wire()
    mount(privatePath, '/sign-in?source=page')
    http.respond(401)
    expect(current().location).toMatchObject({ pathname: '/sign-in', search: '?source=page' })
  })

  it.each(['/?tag=x', '/?page=2', '/tag/x'])('leaves a public 200 at %s in place', (entry) => {
    const { auth, http } = wire()
    mount(entry)
    const before = current()
    http.respond(200, { ...anonymousGet, url: '/api/articles' })
    expect(current()).toEqual(before)
    expect(auth.client.getState).not.toHaveBeenCalled()
  })

  it.each([401, 422])('ignores a login POST that returns %s', (status) => {
    const { auth, http } = wire()
    mount('/login')
    const before = current()
    http.respond(status, { ...anonymousGet, method: 'POST', url: '/api/users/login' })
    expect(current()).toEqual(before)
    expect(auth.client.getState).not.toHaveBeenCalled()
  })

  it('ignores a POST even when it fails outside the sign-in path', () => {
    const { http } = wire()
    mount()
    http.respond(401, { ...anonymousGet, method: 'POST' })
    expect(current().location.pathname).toBe('/')
  })

  it('ignores an expired credential even if the session subsequently signs out', () => {
    const { auth, http } = wire('authenticated')
    mount()
    http.respond(401, { ...anonymousGet, sentCredentials: true })
    auth.settle('unauthenticated')
    http.respond(401, { ...anonymousGet, sentCredentials: true })
    expect(current().location.pathname).toBe('/')
    expect(auth.client.getState).not.toHaveBeenCalled()
  })

  it.each(['/login', '/sign-in/?source=other'])('does not replace sign-in at %s', (path) => {
    const { http } = wire()
    mount(path, path === '/login' ? undefined : '/sign-in?source=page')
    const before = current()
    http.respond(401)
    expect(current()).toEqual(before)
  })

  it.each(['unauthenticated', 'authenticated', 'unavailable'] as const)(
    'waits for a pending session to settle %s',
    (status) => {
      const { auth, http } = wire('loading')
      mount()
      http.respond(401)
      http.respond(401)
      expect(current().location.pathname).toBe('/')
      expect(auth.listeners.size).toBe(1)

      auth.settle(status)
      expect(current().location.pathname).toBe(status === 'unauthenticated' ? '/login' : '/')
      expect(auth.listeners.size).toBe(0)

      if (status !== 'unauthenticated') {
        auth.settle('unauthenticated')
        expect(current().location.pathname).toBe('/')
      }
    },
  )

  it('never redirects when a session is already unavailable', () => {
    const { http } = wire('unavailable')
    mount()
    http.respond(401)
    expect(current().location.pathname).toBe('/')
  })

  it('discards a pending rejection when the visitor leaves the page', () => {
    const { auth, http } = wire('loading')
    const view = mount()
    http.respond(401)
    fireEvent.click(screen.getByRole('button', { name: 'Open public page' }))
    auth.settle('unauthenticated')
    expect(current().location.pathname).toBe('/public')
    expect(auth.listeners.size).toBe(0)

    view.unmount()
    expect(http.listeners.size).toBe(0)
  })

  it('ignores a notification from an older client without request metadata', () => {
    const { auth, http } = wire()
    mount()
    http.respondWithoutMetadata()
    expect(current().location.pathname).toBe('/')
    expect(auth.client.getState).not.toHaveBeenCalled()
  })

  it('does not subscribe when signInPath is false', () => {
    const { http } = wire()
    mount(privatePath, false)
    http.respond(401)
    expect(current().location.pathname).toBe('/')
    expect(http.listeners.size).toBe(0)
  })

  it.each(['auth-client', 'http-client'])('is inert without the %s bond', (missing) => {
    const { auth, http } = wire()
    bond(missing, null)
    mount()
    http.respond(401)
    expect(current().location.pathname).toBe('/')
    expect(http.listeners.size).toBe(0)
    expect(auth.client.getState).not.toHaveBeenCalled()
  })
})
