# @molecule/api-analytics-posthog

PostHog analytics provider for molecule.dev.

PostHog is an open-source product analytics platform.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-analytics-posthog
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
    name: string;
    /**
     * Event properties.
     */
    properties?: Record<string, unknown>;
    /**
     * Timestamp of the event (defaults to now).
     */
    timestamp?: Date;
    /**
     * User ID associated with the event.
     */
    userId?: string;
    /**
     * Anonymous ID for non-authenticated users.
     */
    anonymousId?: string;
}
```

#### `AnalyticsPageView`

Page view event.

```typescript
interface AnalyticsPageView {
    /**
     * Page name or title.
     */
    name?: string;
    /**
     * Page category.
     */
    category?: string;
    /**
     * Page URL.
     */
    url?: string;
    /**
     * Page path.
     */
    path?: string;
    /**
     * Referrer URL.
     */
    referrer?: string;
    /**
     * Additional page properties.
     */
    properties?: Record<string, unknown>;
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
    identify(user: AnalyticsUserProps): Promise<void>;
    /**
     * Tracks an event.
     */
    track(event: AnalyticsEvent): Promise<void>;
    /**
     * Tracks a page view.
     */
    page(pageView: AnalyticsPageView): Promise<void>;
    /**
     * Associates the current user with a group/organization.
     */
    group?(groupId: string, traits?: Record<string, unknown>): Promise<void>;
    /**
     * Resets the analytics state (e.g., on logout).
     */
    reset?(): Promise<void>;
    /**
     * Flushes any queued events.
     */
    flush?(): Promise<void>;
}
```

#### `AnalyticsUserProps`

User properties for analytics identification.

```typescript
interface AnalyticsUserProps {
    /**
     * Unique user identifier.
     */
    userId: string;
    /**
     * User email address.
     */
    email?: string;
    /**
     * User display name.
     */
    name?: string;
    /**
     * Additional user traits.
     */
    traits?: Record<string, unknown>;
}
```

#### `PostHogOptions`

Options for creating a PostHog provider.

```typescript
interface PostHogOptions {
  apiKey?: string
  host?: string
  flushAt?: number
  flushInterval?: number
}
```

### Functions

#### `createClient(apiKey, host)` *(deprecated)*

Creates a raw PostHog client instance for direct SDK access.

```typescript
function createClient(apiKey?: string, host?: string): PostHog
```

- `apiKey` — The PostHog project API key (falls back to `POSTHOG_API_KEY` env var).
- `host` — The PostHog instance URL (falls back to `POSTHOG_HOST` env var).

**Returns:** A raw `PostHog` client instance.

#### `createProvider(options)`

Creates a PostHog analytics provider that implements the `AnalyticsProvider`
interface. Reads `POSTHOG_API_KEY` and `POSTHOG_HOST` from env if not
provided in options.

```typescript
function createProvider(options?: PostHogOptions): AnalyticsProvider
```

- `options` — PostHog-specific configuration (API key, host, flush settings).

**Returns:** An `AnalyticsProvider` backed by the PostHog Node SDK.

#### `shutdown()`

Shuts down the default PostHog client, flushing any pending events.

```typescript
function shutdown(): Promise<void>
```

### Constants

#### `provider`

The provider implementation.

```typescript
const provider: AnalyticsProvider
```

## Core Interface
Implements `@molecule/api-analytics` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-analytics` ^1.0.0

### Environment Variables

- `POSTHOG_API_KEY` *(required)*
- `POSTHOG_HOST` *(optional)* — default: `https://app.posthog.com`
