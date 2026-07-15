# @molecule/app-analytics-posthog

PostHog analytics provider for molecule.dev frontend.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-analytics'
import { createProvider } from '@molecule/app-analytics-posthog'

// Canonical wiring: read the browser-side key from Vite client env and pass
// it through options. `importMetaEnv` stands for Vite's `import.meta.env` —
// in your app write `import.meta.env?.VITE_POSTHOG_KEY` directly. Without a
// key, skip bonding — analytics calls no-op.
const apiKey = importMetaEnv?.VITE_POSTHOG_KEY as string | undefined
const host = importMetaEnv?.VITE_POSTHOG_HOST as string | undefined
if (apiKey) {
  setProvider(createProvider({ apiKey, ...(host ? { host } : {}) }))
}
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-analytics-posthog @molecule/app-analytics posthog-js
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

When no API key is provided, this does NOT initialize the SDK (`posthog.init('')`
leaves the singleton uninitialized — the SDK logs its own generic error, but
every subsequent call is silently dropped): it logs one actionable warning
naming VITE_POSTHOG_KEY and returns a no-op provider, so bonding the lazy
`provider` export without configuration degrades gracefully.

When no `host` is provided, the SDK's own default (PostHog Cloud US,
`https://us.i.posthog.com`) applies — EU projects must pass their region host
(`https://eu.i.posthog.com`).

Calling this a second time with a DIFFERENT config (e.g. Vite HMR re-running
a bonds.ts setup function) does NOT re-configure the SDK: `posthog-js`'s
`posthog` export is a module-level singleton, so the second `.init()` call
is a no-op that keeps the FIRST configuration. This logs one actionable
warning naming the ignored call before the SDK's own generic warning fires.

```typescript
function createProvider(options?: PostHogOptions): AnalyticsProvider
```

- `options` — PostHog configuration including `apiKey`, optional `host`, and `autocapture`.

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

This provider cannot self-configure: app-side bonds never read env internally (Vite only embeds `import.meta.env`, not `process.env`), so the bare `provider` export can never receive the required VITE_POSTHOG_KEY secret. Bonding it directly (`setProvider(provider)`) silently ships a no-op even when the secret IS set correctly in your app's env — call `createProvider(options)` with the secret read from your app's env, then pass the result to `setProvider()`.

See Quick Start above for the exact wiring:

```typescript
import { setProvider } from '@molecule/app-analytics'
import { createProvider } from '@molecule/app-analytics-posthog'

// Canonical wiring: read the browser-side key from Vite client env and pass
// it through options. `importMetaEnv` stands for Vite's `import.meta.env` —
// in your app write `import.meta.env?.VITE_POSTHOG_KEY` directly. Without a
// key, skip bonding — analytics calls no-op.
const apiKey = importMetaEnv?.VITE_POSTHOG_KEY as string | undefined
const host = importMetaEnv?.VITE_POSTHOG_HOST as string | undefined
if (apiKey) {
  setProvider(createProvider({ apiKey, ...(host ? { host } : {}) }))
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

### Runtime Dependencies

- `@molecule/app-analytics`
- `posthog-js`

The provider does NOT read env itself — configuration flows in through
`createProvider(options)`. The canonical env names are `VITE_POSTHOG_KEY`
and `VITE_POSTHOG_HOST` (the `VITE_` prefix is required: Vite only embeds
`VITE_`-prefixed vars into the client bundle, and molecule's scaffolded app
`.env` only includes `VITE_*` secrets). Do NOT use the API-side twin names
(`POSTHOG_API_KEY`/`POSTHOG_HOST`) in frontend code — those belong to
`@molecule/api-analytics-posthog` and never reach the browser. The PostHog
project API key (`phc_...`) is a public browser-side credential, safe to
embed client-side.

Bonding without a key is failure-safe: `createProvider()` (and the lazy
`provider` export, which cannot receive options) logs ONE console warning
naming VITE_POSTHOG_KEY and returns a no-op provider instead of initializing
the SDK with an empty key. If events never appear in PostHog, check the
browser console for that warning FIRST. When no `host` is passed, the SDK's
own default (PostHog Cloud US, `https://us.i.posthog.com`) applies — EU
projects MUST set `VITE_POSTHOG_HOST=https://eu.i.posthog.com` or events are
sent to the US region and silently never appear in the EU project.

`createProvider()` called a second time (e.g. Vite HMR re-running a
bonds.ts setup function) does NOT re-configure PostHog: `posthog-js`'s
underlying client is a module-level singleton, so the second call's
`host`/`autocapture`/etc. are silently ignored by the SDK — the FIRST
configuration always wins. This logs one actionable console warning naming
the ignored call before the SDK's own generic "already initialized"
warning fires.
