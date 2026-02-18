# @molecule/app-analytics-posthog

PostHog analytics provider for molecule.dev frontend.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-analytics-posthog
```

## API

### Interfaces

#### `AnalyticsEvent`

Event properties for analytics tracking.

```typescript
interface AnalyticsEvent {
    /** Event name (e.g. `"button_clicked"`, `"purchase_completed"`). */
    name: string;
    /** Arbitrary key-value properties for this event. */
    properties?: Record<string, unknown>;
    /** Event timestamp (defaults to now). */
    timestamp?: Date;
    /** Identified user who triggered the event. */
    userId?: string;
    /** Anonymous identifier for unauthenticated users. */
    anonymousId?: string;
}
```

#### `AnalyticsPageView`

Page view event.

```typescript
interface AnalyticsPageView {
    /** Page name (e.g. `"Home"`, `"Settings"`). */
    name?: string;
    /** Page category (e.g. `"Dashboard"`, `"Marketing"`). */
    category?: string;
    /** Full page URL. */
    url?: string;
    /** Page path (e.g. `"/settings/profile"`). */
    path?: string;
    /** Referrer URL. */
    referrer?: string;
    /** Arbitrary key-value properties for this page view. */
    properties?: Record<string, unknown>;
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
    identify(user: AnalyticsUserProps): Promise<void>;
    /**
     * Tracks a named event with optional properties.
     *
     * @param event - The event name and properties to track.
     */
    track(event: AnalyticsEvent): Promise<void>;
    /**
     * Records a page view.
     *
     * @param pageView - Page view details (name, path, properties).
     */
    page(pageView: AnalyticsPageView): Promise<void>;
    /**
     * Associates a user with a group (e.g. company, team).
     *
     * @param groupId - The group identifier.
     * @param traits - Arbitrary traits to associate with the group.
     */
    group?(groupId: string, traits?: Record<string, unknown>): Promise<void>;
    /**
     * Resets the current user identity and generates a new anonymous ID.
     */
    reset?(): Promise<void>;
    /**
     * Flushes any queued events to the analytics service immediately.
     */
    flush?(): Promise<void>;
}
```

#### `AnalyticsUserProps`

User properties for analytics identification.

```typescript
interface AnalyticsUserProps {
    /** Unique user identifier. */
    userId: string;
    /** User email address. */
    email?: string;
    /** User display name. */
    name?: string;
    /** Arbitrary key-value traits to associate with the user. */
    traits?: Record<string, unknown>;
}
```

#### `PostHogOptions`

Options for creating a PostHog provider.

```typescript
interface PostHogOptions {
  apiKey?: string
  host?: string
  autocapture?: boolean
}
```

### Functions

#### `createProvider(options)`

Creates a PostHog analytics provider using `posthog-js`. Initializes the SDK with the
provided API key and host, and returns an `AnalyticsProvider` that maps molecule events to
PostHog's `capture`, `identify`, and `group` APIs.

```typescript
function createProvider(options?: PostHogOptions): AnalyticsProvider
```

- `options` — PostHog configuration including `apiKey`, optional `host`, `autocapture`, and `debug` flags.

**Returns:** An `AnalyticsProvider` backed by the PostHog browser SDK.

### Constants

#### `provider`

Lazy-initialized PostHog analytics provider singleton.

```typescript
const provider: AnalyticsProvider
```

## Core Interface
Implements `@molecule/app-analytics` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-analytics` ^1.0.0

### Environment Variables

- `POSTHOG_API_KEY` *(required)*
- `POSTHOG_HOST` *(optional)* — default: `https://app.posthog.com`
