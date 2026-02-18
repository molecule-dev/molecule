# @molecule/api-analytics-mixpanel

Mixpanel analytics provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-analytics-mixpanel
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

Create a Mixpanel analytics provider. Uses the token from options or the
MIXPANEL_TOKEN environment variable.

```typescript
function createProvider(options?: MixpanelOptions): AnalyticsProvider
```

- `options` — Mixpanel configuration (token, API host, debug mode).

**Returns:** An AnalyticsProvider that tracks events via Mixpanel.

### Constants

#### `mixpanel` *(deprecated)*

Legacy export - the raw Mixpanel instance.

```typescript
const mixpanel: Mixpanel.Mixpanel
```

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

- `MIXPANEL_TOKEN` *(required)*
