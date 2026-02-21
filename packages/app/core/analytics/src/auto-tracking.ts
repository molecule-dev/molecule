/**
 * Automatic analytics tracking for auth, routing, HTTP, and mobile events.
 *
 * Uses minimal interfaces so there's no hard dependency on
 * `@molecule/app-auth`, `@molecule/app-routing`, `@molecule/app-http`,
 * `@molecule/app-lifecycle`, or `@molecule/app-push`.
 *
 * @module
 */

import { getProvider } from './provider.js'

// ============================================================================
// Minimal interfaces — web
// ============================================================================

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

// ============================================================================
// Minimal interfaces — mobile
// ============================================================================

/**
 * Minimal app state change shape (mirrors `@molecule/app-lifecycle` AppStateChange).
 */
interface AppStateChangeLike {
  current: string
  previous: string
}

/**
 * Minimal lifecycle client interface for auto-tracking app foreground/background
 * transitions and deep link opens.
 */
interface LifecycleClientLike {
  onAppStateChange(listener: (change: AppStateChangeLike) => void): () => void
  onUrlOpen(listener: (url: string) => void): () => void
}

/**
 * Minimal push notification shape for auto-tracking.
 */
interface PushNotificationLike {
  id: string
  title: string
}

/**
 * Minimal notification received event shape (mirrors `@molecule/app-push` NotificationReceivedEvent).
 */
interface NotificationReceivedEventLike {
  notification: PushNotificationLike
  foreground: boolean
}

/**
 * Minimal notification action event shape (mirrors `@molecule/app-push` NotificationActionEvent).
 */
interface NotificationActionEventLike {
  notification: PushNotificationLike
  actionId?: string
}

/**
 * Minimal push client interface for auto-tracking notification events.
 */
interface PushClientLike {
  onNotificationReceived(listener: (event: NotificationReceivedEventLike) => void): () => void
  onNotificationAction(listener: (event: NotificationActionEventLike) => void): () => void
}

// ============================================================================
// Options
// ============================================================================

/**
 * Auto-tracking options. Pass any combination of sources — only provided
 * sources are tracked. Works for both web and mobile apps.
 */
export interface AutoTrackingOptions {
  /** Auth client for login/logout/register/error events. */
  authClient?: AuthClientLike
  /** Router for page view tracking. */
  router?: RouterLike
  /** HTTP client for error tracking. */
  httpClient?: HttpClientLike
  /** Lifecycle client for app foreground/background and deep link tracking. */
  lifecycleClient?: LifecycleClientLike
  /** Push client for notification received/tapped tracking. */
  pushClient?: PushClientLike
}

/**
 * Sets up automatic analytics tracking for auth events, route changes,
 * HTTP errors, app lifecycle transitions, push notifications, and deep links.
 * Returns a cleanup function that removes all subscriptions.
 *
 * Pass any combination of sources — only provided sources are tracked.
 *
 * @example
 * ```typescript
 * // Web app
 * const cleanup = setupAutoTracking({
 *   authClient: getClient(),
 *   router: getRouter(),
 *   httpClient: getHttp(),
 * })
 *
 * // Mobile app (React Native) — add lifecycle and push
 * const cleanup = setupAutoTracking({
 *   authClient: getClient(),
 *   router: getRouter(),
 *   httpClient: getHttp(),
 *   lifecycleClient: getLifecycleProvider(),
 *   pushClient: getPushProvider(),
 * })
 *
 * // Later, to remove all listeners:
 * cleanup()
 * ```
 *
 * @param options - Sources to auto-track.
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

  // App lifecycle (foreground/background transitions + deep links)
  if (options.lifecycleClient) {
    const removeStateListener = options.lifecycleClient.onAppStateChange((change) => {
      if (change.current === 'active' && change.previous !== 'active') {
        analytics
          .track({
            name: 'app.foreground',
            properties: { previous: change.previous },
          })
          .catch(() => {})
      } else if (change.current === 'background' && change.previous !== 'background') {
        analytics
          .track({
            name: 'app.background',
            properties: { previous: change.previous },
          })
          .catch(() => {})
      }
    })
    cleanups.push(removeStateListener)

    const removeUrlListener = options.lifecycleClient.onUrlOpen((url) => {
      analytics
        .track({
          name: 'deeplink.open',
          properties: { url },
        })
        .catch(() => {})
    })
    cleanups.push(removeUrlListener)
  }

  // Push notifications (received + tapped)
  if (options.pushClient) {
    const removeReceivedListener = options.pushClient.onNotificationReceived((event) => {
      analytics
        .track({
          name: 'push.received',
          properties: {
            id: event.notification.id,
            title: event.notification.title,
            foreground: event.foreground,
          },
        })
        .catch(() => {})
    })
    cleanups.push(removeReceivedListener)

    const removeActionListener = options.pushClient.onNotificationAction((event) => {
      analytics
        .track({
          name: 'push.tapped',
          properties: {
            id: event.notification.id,
            title: event.notification.title,
            actionId: event.actionId,
          },
        })
        .catch(() => {})
    })
    cleanups.push(removeActionListener)
  }

  return () => {
    cleanups.forEach((fn) => fn())
  }
}
