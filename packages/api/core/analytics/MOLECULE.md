# @molecule/api-analytics

Provider-agnostic analytics interface for molecule.dev.

Defines the `AnalyticsProvider` interface for tracking events, identifying users,
and recording page views. Bond packages (Mixpanel, PostHog, Segment, etc.)
implement this interface. Application code uses the convenience functions
(`track`, `identify`, `page`) which delegate to the bonded provider.

## Type
`core`

## Installation
```bash
npm install @molecule/api-analytics
```

## Usage

```typescript
import { setProvider, track, identify } from '@molecule/api-analytics'
import { provider as mixpanel } from '@molecule/api-analytics-mixpanel'

setProvider(mixpanel)
await identify({ userId: 'u_123', email: 'user@example.com' })
await track({ name: 'purchase.completed', properties: { amount: 49.99 } })
```

## API

### Interfaces

#### `AnalyticsEvent`

Event properties for analytics tracking.

```typescript
interface AnalyticsEvent {
  /**
   * Event name (e.g., 'user.signup', 'purchase.completed').
   */
  name: string

  /**
   * Event properties.
   */
  properties?: Record<string, unknown>

  /**
   * Timestamp of the event (defaults to now).
   */
  timestamp?: Date

  /**
   * User ID associated with the event.
   */
  userId?: string

  /**
   * Anonymous ID for non-authenticated users.
   */
  anonymousId?: string
}
```

#### `AnalyticsPageView`

Page view event.

```typescript
interface AnalyticsPageView {
  /**
   * Page name or title.
   */
  name?: string

  /**
   * Page category.
   */
  category?: string

  /**
   * Page URL.
   */
  url?: string

  /**
   * Page path.
   */
  path?: string

  /**
   * Referrer URL.
   */
  referrer?: string

  /**
   * Additional page properties.
   */
  properties?: Record<string, unknown>
}
```

#### `AnalyticsProvider`

Analytics provider interface.

All analytics providers must implement this interface.

```typescript
interface AnalyticsProvider {
  /**
   * Identifies a user with traits.
   */
  identify(user: AnalyticsUserProps): Promise<void>

  /**
   * Tracks an event.
   */
  track(event: AnalyticsEvent): Promise<void>

  /**
   * Tracks a page view.
   */
  page(pageView: AnalyticsPageView): Promise<void>

  /**
   * Associates the current user with a group/organization.
   */
  group?(groupId: string, traits?: Record<string, unknown>): Promise<void>

  /**
   * Resets the analytics state (e.g., on logout).
   */
  reset?(): Promise<void>

  /**
   * Flushes any queued events.
   */
  flush?(): Promise<void>
}
```

#### `AnalyticsUserProps`

User properties for analytics identification.

```typescript
interface AnalyticsUserProps {
  /**
   * Unique user identifier.
   */
  userId: string

  /**
   * User email address.
   */
  email?: string

  /**
   * User display name.
   */
  name?: string

  /**
   * Additional user traits.
   */
  traits?: Record<string, unknown>
}
```

### Functions

#### `flush()`

Flushes any queued analytics events, sending them immediately to the provider's
backend. No-op if the provider doesn't implement `flush()` or sends events
immediately.

```typescript
function flush(): Promise<void>
```

**Returns:** A promise that resolves when all queued events have been flushed.

#### `getProvider()`

Retrieves the bonded analytics provider, throwing if none is configured.

```typescript
function getProvider(): AnalyticsProvider
```

**Returns:** The bonded analytics provider.

#### `group(groupId, traits)`

Associates the current user with a group or organization, with optional
traits describing the group. Not all providers support this.

```typescript
function group(groupId: string, traits?: Record<string, unknown>): Promise<void>
```

- `groupId` — The unique identifier of the group/organization.
- `traits` — Optional key-value traits describing the group (e.g. `{ plan: 'enterprise' }`).

**Returns:** A promise that resolves when the group association has been recorded.

#### `hasProvider()`

Checks whether an analytics provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an analytics provider is bonded.

#### `identify(user)`

Identifies a user by associating their ID with profile traits (email, name, etc.)
in the analytics platform. Delegates to the bonded provider's `identify()`.

```typescript
function identify(user: AnalyticsUserProps): Promise<void>
```

- `user` — The user properties including `userId` and optional traits.

**Returns:** A promise that resolves when the user has been identified.

#### `page(pageView)`

Records a page view with optional name, category, URL, and path.
Delegates to the bonded provider's `page()`.

```typescript
function page(pageView: AnalyticsPageView): Promise<void>
```

- `pageView` — The page view data including optional `name`, `url`, and `path`.

**Returns:** A promise that resolves when the page view has been recorded.

#### `reset()`

Resets the analytics state, clearing the identified user. Typically called
on logout. No-op if the provider doesn't implement `reset()`.

```typescript
function reset(): Promise<void>
```

**Returns:** A promise that resolves when the analytics state has been reset.

#### `setProvider(provider)`

Registers an analytics provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: AnalyticsProvider): void
```

- `provider` — The analytics provider implementation to bond.

#### `track(event)`

Tracks a named event with optional properties, user ID, and timestamp.
Delegates to the bonded provider's `track()`.

```typescript
function track(event: AnalyticsEvent): Promise<void>
```

- `event` — The event to track, including `name` and optional `properties`.

**Returns:** A promise that resolves when the event has been tracked.

## Available Providers

| Provider | Package |
|----------|---------|
| Mixpanel | `@molecule/api-analytics-mixpanel` |
| PostHog | `@molecule/api-analytics-posthog` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-analytics`.
