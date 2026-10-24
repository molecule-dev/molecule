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
import type { AnalyticsUserProps } from './types.js'

// ============================================================================
// Minimal interfaces — web
// ============================================================================

/**
 * The default auth profile: an immutable `id` plus the traits analytics records.
 *
 * An app whose auth client carries its OWN profile (no `id`) still auto-tracks
 * auth events — it passes `identifyUser` to say which field identifies the user
 * (see {@link AutoTrackingOptions}).
 */
export interface AnalyticsAuthUser {
  /** Unique user identifier. */
  id: string
  /** User email address. */
  email?: string
  /** User display name. */
  name?: string
}

/**
 * Maps a signed-in profile to the identity analytics records for it.
 *
 * Return `null` when this session has no stable identity to record (an
 * anonymous or throwaway session): the sign-in is then tracked without an
 * `identify` call instead of sending an undefined `userId`.
 *
 * @template TUser - The app's own profile shape.
 */
export type IdentifyUser<TUser> = (user: TUser) => AnalyticsUserProps | null

/**
 * Minimal auth event shape (mirrors `@molecule/app-auth` AuthEvent), typed by
 * the app's profile.
 */
interface AuthEventLike<TUser> {
  type: 'login' | 'logout' | 'register' | 'refresh' | 'error'
  user?: TUser
  error?: string
}

/**
 * Minimal auth client interface for auto-tracking.
 */
interface AuthClientLike<TUser> {
  addEventListener(listener: (event: AuthEventLike<TUser>) => void): () => void
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
 * Auto-tracking sources and the identity adapter. Pass any combination of
 * sources — only provided sources are tracked. Works for both web and mobile
 * apps.
 *
 * `TUser` is the profile the auth client hands to its listeners. The default,
 * {@link AnalyticsAuthUser}, has an `id`, and it is identified by that field
 * with no extra wiring. An app whose profile has no `id` (e.g.
 * `{ username, email, bio }`) passes an `identifyUser` extractor; it is
 * REQUIRED for such a profile, so a client cannot be wired into tracking with
 * no identity at all and `userId: undefined` never reaches a provider.
 *
 * @template TUser - The auth client's profile shape.
 */
export type AutoTrackingOptions<TUser extends object = AnalyticsAuthUser> = {
  /** Auth client for login/logout/register/error events. */
  authClient?: AuthClientLike<TUser>
  /**
   * Which field of the profile identifies the user in analytics — required when
   * the profile has no `id: string`. The default reads `id`, `email` and `name`.
   */
  identifyUser?: IdentifyUser<TUser>
  /** Router for page view tracking. */
  router?: RouterLike
  /** HTTP client for error tracking. */
  httpClient?: HttpClientLike
  /** Lifecycle client for app foreground/background and deep link tracking. */
  lifecycleClient?: LifecycleClientLike
  /** Push client for notification received/tapped tracking. */
  pushClient?: PushClientLike
} & ([TUser] extends [{ id: string }]
  ? { identifyUser?: IdentifyUser<TUser> }
  : { identifyUser: IdentifyUser<TUser> })

/**
 * Sets up automatic analytics tracking for auth events, route changes,
 * HTTP errors, app lifecycle transitions, push notifications, and deep links.
 * Returns a cleanup function that removes all subscriptions.
 *
 * Pass any combination of sources — only provided sources are tracked.
 *
 * The analytics provider is resolved at EVENT time, not at setup time — so
 * `setupAutoTracking()` may safely run before the analytics bond is set
 * (events fired before bonding no-op; events fired after are tracked).
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
 * // An app whose profile has no `id` says which field identifies the user:
 * const cleanup = setupAutoTracking({
 *   authClient: authClient, // createJWTAuthClient<SessionUser>(…)
 *   identifyUser: (user) => ({ userId: user.username, email: user.email }),
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
export const setupAutoTracking = <TUser extends object = AnalyticsAuthUser>(
  options: AutoTrackingOptions<TUser>,
): (() => void) => {
  const cleanups: (() => void)[] = []
  // Resolve the provider per event — capturing getProvider() once at setup
  // permanently baked in the no-op provider whenever setupAutoTracking() ran
  // before the analytics bond was set, silently dropping every event forever.
  const analytics = (): ReturnType<typeof getProvider> => getProvider()

  /**
   * The identity to record for a profile: the app's own extractor when given,
   * otherwise the default `id`/`email`/`name` fields. `null` means this session
   * has no identity to record — no `identify`, and no `userId` on the event.
   *
   * @param user - The profile a sign-in event carried.
   * @returns The identity, or `null` when none can be read.
   */
  const identityOf = (user: TUser): AnalyticsUserProps | null => {
    if (options.identifyUser) return options.identifyUser(user)
    if (!('id' in user) || typeof user.id !== 'string' || user.id === '') return null
    const identity: AnalyticsUserProps = { userId: user.id }
    if ('email' in user && typeof user.email === 'string') identity.email = user.email
    if ('name' in user && typeof user.name === 'string') identity.name = user.name
    return identity
  }

  /**
   * Identifies the signed-in user and tracks the sign-in event.
   *
   * @param name - `auth.login` or `auth.register`.
   * @param user - The profile the event carried.
   */
  const trackSignIn = (name: 'auth.login' | 'auth.register', user: TUser | undefined): void => {
    if (!user) return
    const identity = identityOf(user)
    // No identity means the app said this session has none (or the profile has
    // no id and no extractor reached this client); never send `userId: undefined`.
    if (!identity) return
    analytics()
      .identify(identity)
      .catch(() => {})
    analytics()
      .track({ name, properties: { userId: identity.userId } })
      .catch(() => {})
  }

  // Auth events
  if (options.authClient) {
    const removeListener = options.authClient.addEventListener((event) => {
      switch (event.type) {
        case 'login':
          trackSignIn('auth.login', event.user)
          break
        case 'register':
          trackSignIn('auth.register', event.user)
          break
        case 'logout':
          analytics()
            .track({ name: 'auth.logout' })
            .catch(() => {})
          analytics()
            .reset?.()
            .catch(() => {})
          break
        case 'error':
          analytics()
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
      analytics()
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
      analytics()
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
        analytics()
          .track({
            name: 'app.foreground',
            properties: { previous: change.previous },
          })
          .catch(() => {})
      } else if (change.current === 'background' && change.previous !== 'background') {
        analytics()
          .track({
            name: 'app.background',
            properties: { previous: change.previous },
          })
          .catch(() => {})
      }
    })
    cleanups.push(removeStateListener)

    const removeUrlListener = options.lifecycleClient.onUrlOpen((url) => {
      analytics()
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
      analytics()
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
      analytics()
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
