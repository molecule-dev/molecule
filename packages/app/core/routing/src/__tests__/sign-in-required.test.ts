import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHistoryRouter, parseLocation } from '../history-router.js'
import {
  isSignInPathname,
  redirectSignedOutRejections,
  type SignInRequiredRequest,
  type SignInRequiredSessionState,
  watchSignedOutRejection,
} from '../sign-in-required.js'
import type { NavigationAction, RouteLocation, RouterHistory } from '../types.js'

const anonymousGet: SignInRequiredRequest = { method: 'GET', sentCredentials: false }

/**
 * An in-memory history, as a routing bond's native router would supply it.
 *
 * @param entries - The starting entries; the last one is current.
 * @returns The history and its entries.
 */
function memoryHistory(entries: string[]) {
  const stack: RouteLocation[] = entries.map((path, index) => ({
    ...parseLocation(path),
    key: `k${index}`,
  }))
  let index = stack.length - 1
  let keys = stack.length
  const listeners = new Set<(action?: NavigationAction) => void>()
  const notify = (action: NavigationAction): void => listeners.forEach((l) => l(action))
  const history: RouterHistory = {
    location: () => stack[index],
    push(path, state) {
      stack.splice(index + 1, Infinity, { ...parseLocation(path, state), key: `k${keys++}` })
      index += 1
      notify('push')
    },
    replace(path, state) {
      stack[index] = { ...parseLocation(path, state), key: `k${keys++}` }
      notify('replace')
    },
    go(delta) {
      index = Math.max(0, Math.min(stack.length - 1, index + delta))
      notify('pop')
    },
    listen(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return { history, stack }
}

/** @returns A fake HTTP client that reports 401s on demand. */
function fakeHttp() {
  const handlers = new Set<(request: SignInRequiredRequest | undefined) => void>()
  return {
    handlers,
    source: {
      onAuthError(handler: (request: SignInRequiredRequest | undefined) => void) {
        handlers.add(handler)
        return () => handlers.delete(handler)
      },
    },
    reject: (request: SignInRequiredRequest | undefined) =>
      handlers.forEach((handler) => handler(request)),
  }
}

/**
 * @param initial - The session's starting status.
 * @returns A fake auth client whose status the test settles.
 */
function fakeSession(initial: string) {
  let state: SignInRequiredSessionState = { status: initial }
  const listeners = new Set<(state: SignInRequiredSessionState) => void>()
  return {
    listeners,
    source: {
      getState: vi.fn(() => state),
      subscribe(listener: (state: SignInRequiredSessionState) => void) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    },
    settle(status: string) {
      state = { status }
      listeners.forEach((listener) => listener(state))
    },
  }
}

const stops: Array<() => void> = []
afterEach(() => {
  stops.splice(0).forEach((stop) => stop())
})

/**
 * Applies the rule to a router over an in-memory history.
 *
 * @param entries - The history entries; the last one is current.
 * @param status - The session's starting status.
 * @param signInPath - The configured sign-in path.
 * @returns The router, its history, and the fakes.
 */
function wire(entries: string[], status = 'unauthenticated', signInPath?: string) {
  const { history, stack } = memoryHistory(entries)
  const router = createHistoryRouter(history)
  const http = fakeHttp()
  const session = fakeSession(status)
  stops.push(
    redirectSignedOutRejections(router, {
      signInPath,
      sources: () => ({ http: http.source, session: session.source }),
    }),
  )
  return { router, stack, http, session }
}

describe('watchSignedOutRejection', () => {
  it('calls back once for a credential-free GET while signed out', () => {
    const http = fakeHttp()
    const session = fakeSession('unauthenticated')
    const onSignedOut = vi.fn()
    stops.push(watchSignedOutRejection({ http: http.source, session: session.source }, onSignedOut))
    http.reject(anonymousGet)
    http.reject(anonymousGet)
    expect(onSignedOut).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['a POST', { method: 'POST', sentCredentials: false }],
    ['a request that carried credentials', { method: 'GET', sentCredentials: true }],
    ['a report without request facts', undefined],
  ])('ignores %s without reading the session', (_label, request) => {
    const http = fakeHttp()
    const session = fakeSession('unauthenticated')
    const onSignedOut = vi.fn()
    stops.push(watchSignedOutRejection({ http: http.source, session: session.source }, onSignedOut))
    http.reject(request)
    expect(onSignedOut).not.toHaveBeenCalled()
    expect(session.source.getState).not.toHaveBeenCalled()
  })

  it.each(['authenticated', 'unavailable'])('never calls back for a %s session', (status) => {
    const http = fakeHttp()
    const onSignedOut = vi.fn()
    stops.push(
      watchSignedOutRejection(
        { http: http.source, session: fakeSession(status).source },
        onSignedOut,
      ),
    )
    http.reject(anonymousGet)
    expect(onSignedOut).not.toHaveBeenCalled()
  })

  it('waits for a loading session, then stops listening to it', () => {
    const http = fakeHttp()
    const session = fakeSession('loading')
    const onSignedOut = vi.fn()
    stops.push(watchSignedOutRejection({ http: http.source, session: session.source }, onSignedOut))
    http.reject(anonymousGet)
    http.reject(anonymousGet)
    expect(session.listeners.size).toBe(1)
    session.settle('unauthenticated')
    expect(onSignedOut).toHaveBeenCalledTimes(1)
    expect(session.listeners.size).toBe(0)
  })

  it('drops a pending rejection and its listeners when stopped', () => {
    const http = fakeHttp()
    const session = fakeSession('loading')
    const onSignedOut = vi.fn()
    const stop = watchSignedOutRejection(
      { http: http.source, session: session.source },
      onSignedOut,
    )
    http.reject(anonymousGet)
    stop()
    session.settle('unauthenticated')
    expect(onSignedOut).not.toHaveBeenCalled()
    expect(http.handlers.size).toBe(0)
    expect(session.listeners.size).toBe(0)
  })
})

describe('isSignInPathname', () => {
  it.each([
    ['/login', '/login', true],
    ['/login', '/Login/', true],
    ['/sign-in?source=page', '/sign-in/', true],
    ['/login', '/login/reset', false],
    ['/login', '/', false],
  ])('%s at %s is %s', (signInPath, pathname, expected) => {
    expect(isSignInPathname(signInPath, pathname)).toBe(expected)
  })
})

describe('redirectSignedOutRejections', () => {
  it('replaces the location and passes the original back as state.from', () => {
    const { router, stack, http } = wire(['/previous', '/?feed=following#results'])
    const from = router.getLocation()
    http.reject(anonymousGet)
    expect(stack).toHaveLength(2)
    expect(router.getLocation()).toMatchObject({ pathname: '/login', state: { from } })
    expect(from).toMatchObject({ pathname: '/', search: '?feed=following', hash: '#results' })
  })

  it('keeps the sign-in path query and stays put on the sign-in page', () => {
    const { router, http } = wire(['/'], 'unauthenticated', '/sign-in?source=page')
    http.reject(anonymousGet)
    expect(router.getLocation()).toMatchObject({ pathname: '/sign-in', search: '?source=page' })
    expect(http.handlers.size).toBe(0)
  })

  it('drops a pending rejection when the location changes', () => {
    const { router, http, session } = wire(['/'], 'loading')
    http.reject(anonymousGet)
    router.navigate('/public')
    session.settle('unauthenticated')
    expect(router.getLocation().pathname).toBe('/public')
    expect(session.listeners.size).toBe(0)
  })

  it('passes back the address an entry reaches without a new key', () => {
    // Angular's router keeps the start entry's key while its first navigation moves the
    // address from `/` to the one being opened.
    const { history, stack } = memoryHistory(['/'])
    const router = createHistoryRouter(history)
    const http = fakeHttp()
    stops.push(
      redirectSignedOutRejections(router, {
        sources: () => ({ http: http.source, session: fakeSession('unauthenticated').source }),
      }),
    )
    stack[0] = { ...parseLocation('/?feed=following'), key: stack[0].key }
    history.go(0)
    http.reject(anonymousGet)
    expect(router.getLocation()).toMatchObject({
      pathname: '/login',
      state: { from: { pathname: '/', search: '?feed=following' } },
    })
  })

  it('is inert while the sources are missing', () => {
    const { history } = memoryHistory(['/'])
    const router = createHistoryRouter(history)
    const sources = vi.fn(() => undefined)
    stops.push(redirectSignedOutRejections(router, { sources }))
    expect(sources).toHaveBeenCalledTimes(1)
    router.navigate('/next')
    expect(sources).toHaveBeenCalledTimes(2)
  })

  it('stops listening to the router and the client when stopped', () => {
    const { history } = memoryHistory(['/'])
    const router = createHistoryRouter(history)
    const http = fakeHttp()
    const stop = redirectSignedOutRejections(router, {
      sources: () => ({ http: http.source, session: fakeSession('unauthenticated').source }),
    })
    stop()
    http.reject(anonymousGet)
    expect(router.getLocation().pathname).toBe('/')
    expect(http.handlers.size).toBe(0)
  })
})
