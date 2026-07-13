# @molecule/app-analytics-mixpanel

Mixpanel analytics provider for molecule.dev frontend.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-analytics'
import { createProvider } from '@molecule/app-analytics-mixpanel'

// Canonical wiring: read the browser-side token from Vite env and pass it
// through options. Without a token, skip bonding — analytics calls no-op.
// VITE_MIXPANEL_TOKEN below stands for `import.meta.env.VITE_MIXPANEL_TOKEN`
// (write the `import.meta.env` read in your app's bond-setup file).
const token = VITE_MIXPANEL_TOKEN as string | undefined
if (token) {
  setProvider(createProvider({ token }))
}
```

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
    /**
     * Event timestamp (defaults to now). Only honored where the underlying
     * browser SDK supports client-set timestamps (PostHog does); the Mixpanel
     * browser SDK always stamps the time of capture. For reliable historical
     * timestamps use the API-side `@molecule/api-analytics` bonds.
     */
    timestamp?: Date;
    /**
     * Identified user who triggered the event. Browser analytics SDKs attribute
     * events to the AMBIENT identified session — call `identify()` first;
     * current browser bonds do not honor a per-event userId override. (Exists
     * for interface parity with `@molecule/api-analytics`, where there is no
     * ambient session and per-event IDs are required.)
     */
    userId?: string;
    /**
     * Anonymous identifier for unauthenticated users. Like `userId`, browser
     * bonds use the SDK's own ambient anonymous identity instead of this field.
     */
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

When no token is provided, this does NOT initialize the SDK (mixpanel-browser
accepts `init('')` in TOTAL silence and then sends every event to
api.mixpanel.com with an empty token, where it is dropped server-side with no
client-side breadcrumb): it logs one actionable warning naming
VITE_MIXPANEL_TOKEN and returns a no-op provider, so bonding the lazy
`provider` export without configuration degrades gracefully instead of
becoming a silent event black hole.

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

## Bond Wiring

This provider cannot self-configure: app-side bonds never read env internally (Vite only embeds `import.meta.env`, not `process.env`), so the bare `provider` export can never receive the required VITE_MIXPANEL_TOKEN secret. Bonding it directly (`setProvider(provider)`) silently ships a no-op even when the secret IS set correctly in your app's env — call `createProvider(options)` with the secret read from your app's env, then pass the result to `setProvider()`.

See Quick Start above for the exact wiring:

```typescript
import { setProvider } from '@molecule/app-analytics'
import { createProvider } from '@molecule/app-analytics-mixpanel'

// Canonical wiring: read the browser-side token from Vite env and pass it
// through options. Without a token, skip bonding — analytics calls no-op.
// VITE_MIXPANEL_TOKEN below stands for `import.meta.env.VITE_MIXPANEL_TOKEN`
// (write the `import.meta.env` read in your app's bond-setup file).
const token = VITE_MIXPANEL_TOKEN as string | undefined
if (token) {
  setProvider(createProvider({ token }))
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-analytics` ^1.0.0

### Environment Variables

- `VITE_MIXPANEL_TOKEN` *(required)* — Mixpanel project token
  - Setup: Copy the Project Token from Mixpanel → Project Settings → Access Keys. This is a public browser-side token — Vite embeds it into the client bundle (VITE_ prefix required).
  - Get it here: [https://mixpanel.com/settings/project](https://mixpanel.com/settings/project)

The provider does NOT read env itself — configuration flows in through
`createProvider(options)`. The canonical env name is `VITE_MIXPANEL_TOKEN`
(the `VITE_` prefix is required: Vite only embeds `VITE_`-prefixed vars
into the client bundle, and molecule's scaffolded app `.env` only includes
`VITE_*` secrets). Do NOT use the API-side twin name (`MIXPANEL_TOKEN`) in
frontend code — that belongs to `@molecule/api-analytics-mixpanel` and
never reaches the browser. The Mixpanel project token is a public
browser-side credential, safe to embed client-side.

Bonding without a token is failure-safe: `createProvider()` (and the lazy
`provider` export, which cannot receive options) logs ONE console warning
naming VITE_MIXPANEL_TOKEN and returns a no-op provider — the raw SDK would
otherwise accept an empty token in total silence and every event would
vanish with no breadcrumb. If events never appear in Mixpanel, check the
browser console for that warning FIRST.

`AnalyticsEvent.timestamp` is NOT honored: the Mixpanel browser SDK has no
supported client-set timestamp and always stamps the time of capture. For
historical timestamps use `@molecule/api-analytics-mixpanel` server-side.
