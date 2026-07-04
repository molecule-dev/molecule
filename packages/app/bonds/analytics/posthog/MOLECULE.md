# @molecule/app-analytics-posthog

PostHog analytics provider for molecule.dev frontend.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-analytics'
import { createProvider } from '@molecule/app-analytics-posthog'

// Canonical wiring: read the browser-side key from Vite env and pass it
// through options. Without a key, skip bonding — analytics calls no-op.
const apiKey = import.meta.env?.VITE_POSTHOG_KEY as string | undefined
const host = import.meta.env?.VITE_POSTHOG_HOST as string | undefined
if (apiKey) {
  setProvider(createProvider({ apiKey, ...(host ? { host } : {}) }))
}
```

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

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-analytics'
import { provider } from '@molecule/app-analytics-posthog'

export function setupAnalyticsPosthog(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-analytics` ^1.0.0

### Environment Variables

- `VITE_POSTHOG_KEY` *(required)* — PostHog project API key
  - Setup: Copy the Project API key from PostHog → Project settings. This is a public browser-side key — Vite embeds it into the client bundle (VITE_ prefix required).
  - Get it here: [https://app.posthog.com/settings/project](https://app.posthog.com/settings/project)
  - Example: `phc_...`
- `VITE_POSTHOG_HOST` *(optional)* — PostHog host — default: `https://app.posthog.com`
  - Setup: Origin of your PostHog instance (US cloud, EU cloud, or self-hosted). Browser-side (VITE_ prefix required).
  - Example: `https://us.i.posthog.com`

The provider does NOT read env itself — configuration flows in through
`createProvider(options)`. The canonical env names are `VITE_POSTHOG_KEY`
and `VITE_POSTHOG_HOST` (the `VITE_` prefix is required: Vite only embeds
`VITE_`-prefixed vars into the client bundle, and molecule's scaffolded app
`.env` only includes `VITE_*` secrets). Do NOT use the API-side twin names
(`POSTHOG_API_KEY`/`POSTHOG_HOST`) in frontend code — those belong to
`@molecule/api-analytics-posthog` and never reach the browser. The PostHog
project API key (`phc_...`) is a public browser-side credential, safe to
embed client-side.
