# @molecule/api-analytics-mixpanel

Mixpanel analytics provider for molecule.dev.

## Quick Start

```typescript
import { setProvider, track } from '@molecule/api-analytics'
import { provider } from '@molecule/api-analytics-mixpanel'

setProvider(provider) // reads MIXPANEL_TOKEN lazily — safe when unset
await track({ name: 'purchase.completed', userId: 'u_123' })
```

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
     * User ID the page view belongs to. Server-side providers have no ambient
     * session — without this (or `anonymousId`) every page view from every user
     * is attributed to a single shared "anonymous" identity.
     */
    userId?: string;
    /**
     * Anonymous ID for non-authenticated users.
     */
    anonymousId?: string;
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
  /** Mixpanel project token (falls back to the MIXPANEL_TOKEN env var). */
  token?: string
  /** Enable the SDK's debug logging. */
  debug?: boolean
  /**
   * Mixpanel ingestion host, optionally with a `:port` suffix. Required for
   * EU/India data residency (e.g. `'api-eu.mixpanel.com'`,
   * `'api-in.mixpanel.com'`) — the default is the US cluster
   * (`api.mixpanel.com`).
   */
  host?: string
  /** Wire protocol for the ingestion host (self-hosted proxies). Defaults to `'https'`. */
  protocol?: 'http' | 'https'
}
```

### Functions

#### `createProvider(options)`

Create a Mixpanel analytics provider. Uses the token from options or the
MIXPANEL_TOKEN environment variable.

When no token is configured, this does NOT throw (bonding at boot stays
safe — the raw `Mixpanel.init('')` throws an opaque "needs a Mixpanel
token" error): it logs one actionable warning naming MIXPANEL_TOKEN and
returns a no-op provider. Analytics is fire-and-forget telemetry — callers
(`void track(...)` sites don't catch) must never crash or see 503s because
an optional analytics key is unset.

```typescript
function createProvider(options?: MixpanelOptions): AnalyticsProvider
```

- `options` — Mixpanel configuration (token, debug mode, ingestion host/protocol).

**Returns:** An AnalyticsProvider that tracks events via Mixpanel.

### Constants

#### `analyticsMixpanelSecretDefinitions`

Secret definitions required by the Mixpanel analytics bond.

```typescript
const analyticsMixpanelSecretDefinitions: SecretDefinition[]
```

#### `mixpanel` *(deprecated)*

Legacy export - the raw Mixpanel instance (lazy-initialized via Proxy on
first property access; throws an actionable `config.notConfigured` error if
MIXPANEL_TOKEN is unset at that point).

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

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-analytics'
import { provider } from '@molecule/api-analytics-mixpanel'

export function setupAnalyticsMixpanel(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-analytics` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `MIXPANEL_TOKEN` *(required)* — Mixpanel project token
  - Setup: Copy the Project Token from Mixpanel → Project Settings → Access Keys.
  - Get it here: [https://mixpanel.com/settings/project](https://mixpanel.com/settings/project)

- Configuration is lazy and failure-safe: importing this package or bonding
  `provider` never throws. When MIXPANEL_TOKEN is unset, the bond logs ONE
  actionable warning naming the key and analytics calls no-op (resolve) —
  telemetry must never crash or 503 real request handlers. If events never
  appear in Mixpanel, check the boot log for that warning FIRST.
- When configured, events are sent immediately, one HTTP request per call
  (no queue), so `flush()` is a no-op — but each call can REJECT on
  network/server errors ("Mixpanel Server Error: …") and
  `@molecule/api-analytics` propagates those. `.catch()` fire-and-forget
  call sites (a bare `void track(...)` turns an outage into an unhandled
  rejection).
- Server-side calls have no ambient session: pass `userId` (or
  `anonymousId`) on `track()` AND `page()` or events are unattributed.
- `timestamp` older than 5 days is rejected by Mixpanel's `/track` ingestion
  endpoint — historical backfill needs Mixpanel's import API, not this bond.
- The deprecated raw `mixpanel` export throws a tagged `config.notConfigured`
  error on first property access when MIXPANEL_TOKEN is unset (a raw client
  cannot no-op). Prefer `provider`/`createProvider()`.
