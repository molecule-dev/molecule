/**
 * Automatic analytics tracking for auth, routing, and HTTP events.
 *
 * Uses minimal interfaces so there's no hard dependency on
 * `@molecule/app-auth`, `@molecule/app-routing`, or `@molecule/app-http`.
 *
 * @module
 */

import { getProvider } from './provider.js'

/**
 * Minimal auth event shape (mirrors `@molecule/app-auth` AuthEvent).
 */
interface AuthEvent {
  type: 'login' | 'logout' | 'register' | 'refresh' | 'error'
  user?: { id: string; email?: string; name?: string }
  error?: string
}

/**
 * Minimal auth client interface for auto-tracking.
 */
interface AuthClientLike {
  addEventListener(listener: (event: AuthEvent) => void): () => void
}

/**
 * Minimal route location shape (mirrors `@molecule/app-routing` RouteLocation).
 */
interface RouteLocationLike {
  pathname: string
  search: string
  hash: string
}

/**
 * Minimal router interface for auto-tracking.
 */
interface RouterLike {
  subscribe(listener: (location: RouteLocationLike, action: string) => void): () => void
}

/**
 * Minimal HTTP error shape.
 */
interface HttpErrorLike {
  message: string
  status: number
  config?: { method?: string; url?: string }
}

/**
 * Minimal HTTP client interface for auto-tracking.
 */
interface HttpClientLike {
  addErrorInterceptor(interceptor: (error: HttpErrorLike) => HttpErrorLike): () => void
}

/**
 * Auto-tracking options.
 */
export interface AutoTrackingOptions {
  authClient?: AuthClientLike
  router?: RouterLike
  httpClient?: HttpClientLike
}

/**
 * Sets up automatic analytics tracking for auth events, route changes, and HTTP errors.
 * Returns a cleanup function that removes all subscriptions.
 *
 * @example
 * ```typescript
 * import { setupAutoTracking } from '`@molecule/app-analytics`'
 * import { getClient } from '`@molecule/app-auth`'
 * import { getRouter } from '`@molecule/app-routing`'
 * import { getClient as getHttp } from '`@molecule/app-http`'
 *
 * const cleanup = setupAutoTracking({
 *   authClient: getClient(),
 *   router: getRouter(),
 *   httpClient: getHttp(),
 * })
 *
 * // Later, to remove all listeners:
 * cleanup()
 * ```
 *
 * @param options - Sources to auto-track (auth client, router, HTTP client).
 * @returns A cleanup function that removes all event subscriptions.
 */
export const setupAutoTracking = (options: AutoTrackingOptions): (() => void) => {
  const cleanups: (() => void)[] = []
  const analytics = getProvider()

  // Auth events
  if (options.authClient) {
    const removeListener = options.authClient.addEventListener((event) => {
      switch (event.type) {
        case 'login':
          if (event.user) {
            analytics
              .identify({
                userId: event.user.id,
                email: event.user.email,
                name: event.user.name,
              })
              .catch(() => {})
            analytics
              .track({ name: 'auth.login', properties: { userId: event.user.id } })
              .catch(() => {})
          }
          break
        case 'register':
          if (event.user) {
            analytics
              .identify({
                userId: event.user.id,
                email: event.user.email,
                name: event.user.name,
              })
              .catch(() => {})
            analytics
              .track({ name: 'auth.register', properties: { userId: event.user.id } })
              .catch(() => {})
          }
          break
        case 'logout':
          analytics.track({ name: 'auth.logout' }).catch(() => {})
          analytics.reset?.().catch(() => {})
          break
        case 'error':
          analytics
            .track({ name: 'auth.error', properties: { error: event.error } })
            .catch(() => {})
          break
      }
    })
    cleanups.push(removeListener)
  }

  // Route changes
  if (options.router) {
    const removeListener = options.router.subscribe((location) => {
      analytics
        .page({
          path: location.pathname,
          url: `${location.pathname}${location.search}${location.hash}`,
        })
        .catch(() => {})
    })
    cleanups.push(removeListener)
  }

  // HTTP errors
  if (options.httpClient) {
    const removeInterceptor = options.httpClient.addErrorInterceptor((error) => {
      analytics
        .track({
          name: 'http.error',
          properties: {
            status: error.status,
            method: error.config?.method,
            url: error.config?.url,
            message: error.message,
          },
        })
        .catch(() => {})
      return error
    })
    cleanups.push(removeInterceptor)
  }

  return () => {
    cleanups.forEach((fn) => fn())
  }
}
