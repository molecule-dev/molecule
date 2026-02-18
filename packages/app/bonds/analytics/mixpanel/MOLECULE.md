# @molecule/app-analytics-mixpanel

Mixpanel analytics provider for molecule.dev frontend.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-analytics-mixpanel
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

#### `MixpanelOptions`

Options for creating a Mixpanel provider.

```typescript
interface MixpanelOptions {
  token?: string
  debug?: boolean
}
```

### Functions

#### `createProvider(options)`

Creates a Mixpanel analytics provider using `mixpanel-browser`. Initializes the SDK
with the provided token and returns an `AnalyticsProvider` that maps molecule events to
Mixpanel's `track`, `identify`, `people.set`, and `set_group` APIs.

```typescript
function createProvider(options?: MixpanelOptions): AnalyticsProvider
```

- `options` — Mixpanel configuration including `token` and optional `debug` flag.

**Returns:** An `AnalyticsProvider` backed by the Mixpanel browser SDK.

### Constants

#### `provider`

Lazy-initialized Mixpanel analytics provider singleton.

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

- `MIXPANEL_TOKEN` *(required)*
