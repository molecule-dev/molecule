# @molecule/api-analytics-posthog

PostHog analytics provider for molecule.dev.

PostHog is an open-source product analytics platform.

## Quick Start

```typescript
import { setProvider, track } from '@molecule/api-analytics'
import { provider, shutdown } from '@molecule/api-analytics-posthog'

setProvider(provider) // reads POSTHOG_API_KEY / POSTHOG_HOST lazily
await track({ name: 'purchase.completed', userId: 'u_123' })

// PostHog BATCHES events — flush before the process exits:
await shutdown()
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-analytics-posthog @molecule/api-analytics @molecule/api-secrets posthog-node
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

#### `PostHogOptions`

Options for creating a PostHog provider.

```typescript
interface PostHogOptions {
  apiKey?: string
  host?: string
  flushAt?: number
  flushInterval?: number
  /**
   * Group TYPE that `group()` associates users under (PostHog's group
   * analytics dimension). Falls back to the `POSTHOG_GROUP_TYPE` env var, then
   * `'company'`. Set to `'workspace'`, `'team'`, etc. to group by a different
   * entity; the type must be enabled for group analytics in your PostHog
   * project.
   */
  groupType?: string
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
provided in options. When neither is set, the SDK's own default host
(PostHog Cloud US, `https://us.i.posthog.com`) applies — EU projects must
set `POSTHOG_HOST=https://eu.i.posthog.com`.

The returned provider owns its own PostHog client — the module-level
`shutdown()` does NOT flush it; call the provider's `flush()` before the
process exits. (The lazy default `provider` export shares the default
client, which `shutdown()` does flush.)

```typescript
function createProvider(options?: PostHogOptions): AnalyticsProvider
```

- `options` — PostHog-specific configuration (API key, host, flush settings).

**Returns:** An `AnalyticsProvider` backed by the PostHog Node SDK.

#### `shutdown()`

Shuts down the default PostHog client (the one behind the lazy `provider`
export), flushing any pending events. PostHog batches events (`flushAt`,
default 20 / `flushInterval`, default 10s) — call this before the process
exits or short-lived processes silently lose queued events.

Providers created via `createProvider()` own their own client — use their
`flush()` instead.

```typescript
function shutdown(): Promise<void>
```

### Constants

#### `analyticsPosthogSecretDefinitions`

Secret definitions required by the PostHog analytics bond.

```typescript
const analyticsPosthogSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation.

Wraps the SHARED default client (the same one `shutdown()` flushes). It
previously created a second, private client — events queued through this
provider were then silently dropped at process exit because `shutdown()`
flushed the other, empty client.

```typescript
const provider: AnalyticsProvider
```

## Core Interface
Implements `@molecule/api-analytics` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-analytics'
import { provider } from '@molecule/api-analytics-posthog'

export function setupAnalyticsPosthog(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-analytics` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `POSTHOG_API_KEY` *(required)* — PostHog project API key
  - Setup: Copy the Project API key from PostHog → Project settings.
  - Get it here: [https://app.posthog.com/settings/project](https://app.posthog.com/settings/project)
  - Example: `phc_...`
- `POSTHOG_HOST` *(optional)* — PostHog host — default: `https://app.posthog.com`
  - Setup: Origin of your PostHog instance (US cloud, EU cloud, or self-hosted).
  - Example: `https://us.i.posthog.com`

### Runtime Dependencies

- `@molecule/api-analytics`
- `@molecule/api-secrets`
- `posthog-node`

- Events are QUEUED, not sent per call: `track()` resolves immediately and
  the SDK delivers in batches (`flushAt`, default 20 events / `flushInterval`,
  default 10s). A short-lived process (CLI, cron job, serverless handler,
  test) that exits without `await shutdown()` (default `provider`) or the
  provider's `flush()` silently loses queued events.
- `shutdown()` flushes only the default `provider`'s client. A provider from
  `createProvider()` owns its own client — call its `flush()` instead.
- Missing POSTHOG_API_KEY does NOT throw: the bond logs ONE actionable
  warning naming the key and the SDK disables itself — every call resolves
  successfully while nothing is sent. (The SDK's own "client will be
  disabled" error is debug-gated and otherwise SILENT.) If events never
  appear in PostHog, check the boot log for that warning before debugging
  your tracking code.
- Server-side calls have no ambient session: pass `userId` (or
  `anonymousId`) on `track()` AND `page()` or events pile up under a single
  shared "anonymous" person.
- `group()` associates users under a configurable group TYPE (PostHog's
  group-analytics dimension), `'company'` by default. Set the `groupType`
  option on `createProvider()` or the `POSTHOG_GROUP_TYPE` env var to group
  by `'workspace'`/`'team'`/etc.; the type must be enabled for group
  analytics in your PostHog project.
- When `POSTHOG_HOST` is unset, the SDK's own default host applies (PostHog
  Cloud US, `https://us.i.posthog.com`). EU-region projects MUST set
  `POSTHOG_HOST=https://eu.i.posthog.com` — an EU project key sent to the
  US endpoint is accepted and dropped silently (events never appear, no
  error is returned).

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Each user action the app cares about (signup/login, a page or screen
  view, a purchase/conversion or other domain event) EMITS a `track()` /
  `page()` with the RIGHT event name + properties when performed in the UI —
  and the event is actually RECORDED, proven by reading it back, not by
  finding a `track(...)` call in source. Analytics is fire-and-forget to a
  third-party (Mixpanel/PostHog/Segment) that is NOT reachable in the sandbox
  and NOT captured by `read_activity` (that captures email/sms/push/webhook/
  channel, never analytics). So prove the wiring locally: read the event back
  from the app's own events store/dashboard/funnel if it has one, or bond a
  local recording/console provider for dev and confirm the call fired via
  `read_logs`.
- [ ] Events are ATTRIBUTED to the right identity: `identify({ userId, ... })`
  runs at signup/login so events carry that `userId`. Server-side has no
  ambient session — a `track()` / `page()` with neither `userId` nor
  `anonymousId` collapses every user into one shared "anonymous" identity.
  If the app tracks activity before login, confirm those `anonymousId` events
  associate/merge to the user on identify.
- [ ] Tracking is NON-BLOCKING. Unlike the app-side bond, these SERVER
  functions PROPAGATE provider failures (they reject when the provider does,
  and throw when none is bonded), so fire-and-forget is the CALLER's job:
  every call site wraps the call in `.catch()` / log-and-continue. Verify by
  forcing a failure (unbonded or erroring provider) — the user action
  (signup, checkout) still completes with no visible error and no added
  latency; the analytics await never blocks the response.
- [ ] PRIVACY — no secret or sensitive PII in event `properties` or identify
  `traits`: never a password, full card/PAN, CVV, auth token, or session
  cookie. Read the recorded event back and confirm only non-sensitive
  attributes (plan name, amount, item id) are present.
- [ ] If the app exposes analytics reports/dashboards/funnels, the numbers
  reflect REAL recorded events (perform an action, the matching count/funnel
  step increments) and are SCOPED — a user/org reads only its OWN analytics;
  no endpoint lets one org read another org's numbers (`group()` associates a
  user under the bond's group type, 'company' by default).
