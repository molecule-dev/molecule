# @molecule/app-analytics

Frontend analytics interface for molecule.dev.

Provides a unified analytics API that can be backed by different
implementations (PostHog, Mixpanel, etc.).

## Type
`core`

## Installation
```bash
npm install @molecule/app-analytics
```

## API

### Interfaces

#### `AnalyticsEvent`

Event properties for analytics tracking.

```typescript
interface AnalyticsEvent {
  /** Event name (e.g. `"button_clicked"`, `"purchase_completed"`). */
  name: string
  /** Arbitrary key-value properties for this event. */
  properties?: Record<string, unknown>
  /** Event timestamp (defaults to now). */
  timestamp?: Date
  /** Identified user who triggered the event. */
  userId?: string
  /** Anonymous identifier for unauthenticated users. */
  anonymousId?: string
}
```

#### `AnalyticsPageView`

Page view event.

```typescript
interface AnalyticsPageView {
  /** Page name (e.g. `"Home"`, `"Settings"`). */
  name?: string
  /** Page category (e.g. `"Dashboard"`, `"Marketing"`). */
  category?: string
  /** Full page URL. */
  url?: string
  /** Page path (e.g. `"/settings/profile"`). */
  path?: string
  /** Referrer URL. */
  referrer?: string
  /** Arbitrary key-value properties for this page view. */
  properties?: Record<string, unknown>
}
```

#### `AnalyticsProvider`

Analytics provider interface that all analytics bond packages must implement.

```typescript
interface AnalyticsProvider {
  /**
   * Identifies a user and associates traits with them.
   *
   * @param user - User properties including userId and optional traits.
   */
  identify(user: AnalyticsUserProps): Promise<void>

  /**
   * Tracks a named event with optional properties.
   *
   * @param event - The event name and properties to track.
   */
  track(event: AnalyticsEvent): Promise<void>

  /**
   * Records a page view.
   *
   * @param pageView - Page view details (name, path, properties).
   */
  page(pageView: AnalyticsPageView): Promise<void>

  /**
   * Associates a user with a group (e.g. company, team).
   *
   * @param groupId - The group identifier.
   * @param traits - Arbitrary traits to associate with the group.
   */
  group?(groupId: string, traits?: Record<string, unknown>): Promise<void>

  /**
   * Resets the current user identity and generates a new anonymous ID.
   */
  reset?(): Promise<void>

  /**
   * Flushes any queued events to the analytics service immediately.
   */
  flush?(): Promise<void>
}
```

#### `AnalyticsUserProps`

User properties for analytics identification.

```typescript
interface AnalyticsUserProps {
  /** Unique user identifier. */
  userId: string
  /** User email address. */
  email?: string
  /** User display name. */
  name?: string
  /** Arbitrary key-value traits to associate with the user. */
  traits?: Record<string, unknown>
}
```

#### `AutoTrackingOptions`

Auto-tracking options. Pass any combination of sources — only provided
sources are tracked. Works for both web and mobile apps.

```typescript
interface AutoTrackingOptions {
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
```

### Functions

#### `flush()`

Flushes any queued analytics events to the backend. Errors are silently ignored.

```typescript
function flush(): Promise<void>
```

**Returns:** A promise that resolves when flush completes or fails silently.

#### `getProvider()`

Retrieves the bonded analytics provider. Returns a no-op provider if
none is bonded, so analytics calls never throw.

```typescript
function getProvider(): AnalyticsProvider
```

**Returns:** The bonded analytics provider, or a silent no-op fallback.

#### `group(groupId, traits)`

Associates the current user with a group/organization. Errors are silently ignored.

```typescript
function group(groupId: string, traits?: Record<string, unknown>): Promise<void>
```

- `groupId` — The group identifier.
- `traits` — Optional traits describing the group.

**Returns:** A promise that resolves when group association completes or fails silently.

#### `hasProvider()`

Checks whether an analytics provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an analytics provider is bonded.

#### `identify(user)`

Identifies the current user for analytics tracking. Errors are silently ignored.

```typescript
function identify(user: AnalyticsUserProps): Promise<void>
```

- `user` — The user properties (ID, email, name, traits).

**Returns:** A promise that resolves when identification completes or fails silently.

#### `page(pageView)`

Tracks a page view event. Errors are silently ignored.

```typescript
function page(pageView: AnalyticsPageView): Promise<void>
```

- `pageView` — The page view data (name, path, referrer, etc.).

**Returns:** A promise that resolves when page tracking completes or fails silently.

#### `reset()`

Resets the analytics state (e.g. on logout). Errors are silently ignored.

```typescript
function reset(): Promise<void>
```

**Returns:** A promise that resolves when reset completes or fails silently.

#### `setProvider(provider)`

Registers an analytics provider as the active singleton.

```typescript
function setProvider(provider: AnalyticsProvider): void
```

- `provider` — The analytics provider implementation to bond.

#### `setupAutoTracking(options)`

Sets up automatic analytics tracking for auth events, route changes,
HTTP errors, app lifecycle transitions, push notifications, and deep links.
Returns a cleanup function that removes all subscriptions.

Pass any combination of sources — only provided sources are tracked.

```typescript
function setupAutoTracking(options: AutoTrackingOptions): () => void
```

- `options` — Sources to auto-track.

**Returns:** A cleanup function that removes all event subscriptions.

#### `track(event)`

Tracks a named event with optional properties. Errors are silently ignored.

```typescript
function track(event: AnalyticsEvent): Promise<void>
```

- `event` — The event to track (name and optional properties).

**Returns:** A promise that resolves when tracking completes or fails silently.

## Available Providers

| Provider | Package |
|----------|---------|
| Mixpanel | `@molecule/app-analytics-mixpanel` |
| PostHog | `@molecule/app-analytics-posthog` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
