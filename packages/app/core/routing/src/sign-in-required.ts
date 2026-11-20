/**
 * Sends a signed-out visitor to sign in when one of the current page's credential-free GET
 * requests is answered 401. Every routing bond's app-level router calls
 * {@link redirectSignedOutRejections} (or, for a router that tracks its own location,
 * {@link watchSignedOutRejection}), so the rule is the same under every framework:
 *
 * - only a `GET` that states `sentCredentials: false` counts; a POST (a wrong password on
 *   the sign-in form) or a request that carried credentials (an expired token) never does;
 * - the session decides: `unauthenticated` redirects, `loading` waits for the status to
 *   settle, and `authenticated` or `unavailable` never redirect;
 * - nothing happens on the sign-in page itself;
 * - each location redirects at most once, with `replace` and `state: { from: location }`,
 *   and a rejection still waiting on the session is dropped when the location changes.
 *
 * The functions take their HTTP and session sources as parameters; the routing bond reads
 * them from its app's bonds. `HttpClient` from `@molecule/app-http` and `AuthClient` from
 * `@molecule/app-auth` satisfy the source types as they are.
 *
 * @module
 */

import { matchRoutePattern } from './route-pattern.js'
import type { RouteLocation, Router } from './types.js'

/** The request facts an HTTP client reports with a 401, as `HttpAuthErrorEvent` carries them. */
export interface SignInRequiredRequest {
  /** The request's HTTP method, upper case. */
  readonly method: string
  /** Whether the request carried credentials (a token, a cookie header, transport auth). */
  readonly sentCredentials: boolean
}

/** The HTTP side of the rule: anything that reports 401 responses, as `HttpClient` does. */
export interface SignInRequiredHttpSource {
  /**
   * Subscribes to 401 responses.
   *
   * @param handler - Called with each rejected request's facts; an older transport may call
   *   it with none, and such a call never redirects.
   * @returns Unsubscribes the handler.
   */
  onAuthError(handler: (request: SignInRequiredRequest | undefined) => void): () => void
}

/** The session's state as {@link SignInRequiredSessionSource} reports it. */
export interface SignInRequiredSessionState {
  /** `loading`, `authenticated`, `unauthenticated` or `unavailable`, as `AuthStatus` has it. */
  readonly status: string
}

/** The session side of the rule: anything with an auth status, as `AuthClient` does. */
export interface SignInRequiredSessionSource {
  /**
   * Reads the current session state.
   *
   * @returns The state, with its status.
   */
  getState(): SignInRequiredSessionState
  /**
   * Subscribes to session state changes.
   *
   * @param listener - Called with each new state.
   * @returns Unsubscribes the listener.
   */
  subscribe(listener: (state: SignInRequiredSessionState) => void): () => void
}

/** The two sources the rule reads. */
export interface SignInRequiredSources {
  /** The app's HTTP client. */
  http: SignInRequiredHttpSource
  /** The app's auth client. */
  session: SignInRequiredSessionSource
}

/** The sign-in path the routers use when none is configured. */
export const DEFAULT_SIGN_IN_PATH = '/login'

/**
 * Waits for one credential-free GET to be answered 401 while the session is signed out, and
 * then calls `onSignedOut` once. A rejection that arrives while the session is still
 * `loading` waits for the status to settle; `authenticated` and `unavailable` never call it.
 *
 * @param sources - The HTTP client and the auth client.
 * @param onSignedOut - Called at most once, when a rejection meets a signed-out session.
 * @returns Stops watching, dropping a rejection that still waits on the session.
 *
 * @example
 * ```ts
 * const stop = watchSignedOutRejection({ http, session: auth }, () =>
 *   navigate('/login', { replace: true, state: { from: location } }),
 * )
 * ```
 */
export function watchSignedOutRejection(
  sources: SignInRequiredSources,
  onSignedOut: () => void,
): () => void {
  const { http, session } = sources
  let stopWaiting: (() => void) | undefined
  let signedOut = false
  const settle = (status: string): void => {
    if (status === 'loading') return
    stopWaiting?.()
    stopWaiting = undefined
    if (status !== 'unauthenticated' || signedOut) return
    signedOut = true
    onSignedOut()
  }

  const unsubscribe = http.onAuthError((request) => {
    if (request?.method !== 'GET' || request.sentCredentials !== false || signedOut) return
    const { status } = session.getState()
    if (status !== 'loading') {
      settle(status)
    } else if (!stopWaiting) {
      stopWaiting = session.subscribe((state) => settle(state.status))
      settle(session.getState().status)
    }
  })
  return () => {
    unsubscribe()
    stopWaiting?.()
    stopWaiting = undefined
  }
}

/**
 * Whether a pathname is the sign-in page, by React Router's matching rules (a trailing slash
 * allowed, letter case ignored). The sign-in path's own query and hash are not part of it.
 *
 * @param signInPath - The configured sign-in path, such as `/sign-in?source=page`.
 * @param pathname - The current pathname.
 * @returns `true` on the sign-in page.
 */
export function isSignInPathname(signInPath: string, pathname: string): boolean {
  const signInPathname = signInPath.split(/[?#]/, 1)[0] || '/'
  return matchRoutePattern(signInPathname, pathname) !== null
}

/** Options for {@link redirectSignedOutRejections}. */
export interface RedirectSignedOutRejectionsOptions {
  /** The path to replace the location with. Defaults to {@link DEFAULT_SIGN_IN_PATH}. */
  signInPath?: string
  /**
   * Reads the sources for the current location, or `undefined` when the app bonds no HTTP
   * client or no auth client (the rule is then inert for that location).
   *
   * @returns The sources, if both are bonded.
   */
  sources: () => SignInRequiredSources | undefined
}

/**
 * Applies the sign-in rule (see the module docs) to a molecule `Router` for as long as the
 * returned function is not called: at its current location and at every location it moves
 * to, a credential-free GET answered 401 while signed out replaces the location with the
 * sign-in path, `state: { from: location }`.
 *
 * @param router - The app's router.
 * @param options - The sign-in path and the sources.
 * @returns Stops applying the rule.
 *
 * @example
 * ```ts
 * const stop = redirectSignedOutRejections(router, {
 *   sources: () => (http && auth ? { http, session: auth } : undefined),
 * })
 * ```
 */
export function redirectSignedOutRejections(
  router: Pick<Router, 'getLocation' | 'navigate' | 'subscribe'>,
  options: RedirectSignedOutRejectionsOptions,
): () => void {
  const signInPath = options.signInPath ?? DEFAULT_SIGN_IN_PATH
  let stop: (() => void) | undefined
  let current: RouteLocation | undefined
  const watch = (location: RouteLocation): void => {
    if (current && sameLocation(current, location)) return
    current = location
    stop?.()
    stop = undefined
    if (isSignInPathname(signInPath, location.pathname)) return
    const sources = options.sources()
    if (!sources) return
    stop = watchSignedOutRejection(sources, () => {
      router.navigate(signInPath, { replace: true, state: { from: location } })
    })
  }
  const unsubscribe = router.subscribe((location) => watch(location))
  watch(router.getLocation())
  return () => {
    unsubscribe()
    stop?.()
    stop = undefined
  }
}

/**
 * Whether two reports name the same history entry at the same address, so a repeated
 * notification keeps its watcher (and its pending rejection) rather than starting over. The
 * address counts as well as the key: a router can keep one entry's key while its first
 * navigation moves the address it reports (Angular's `router.url` is `/` until then).
 *
 * @param a - One location.
 * @param b - The other.
 * @returns `true` for the same entry at the same address.
 */
function sameLocation(a: RouteLocation, b: RouteLocation): boolean {
  return a.key === b.key && a.pathname === b.pathname && a.search === b.search && a.hash === b.hash
}
