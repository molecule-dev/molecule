# @molecule/api-analytics

Provider-agnostic analytics interface for molecule.dev.

Defines the `AnalyticsProvider` interface for tracking events, identifying users,
and recording page views. Bond packages (Mixpanel, PostHog, Segment, etc.)
implement this interface. Application code uses the convenience functions
(`track`, `identify`, `page`) which delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, track, identify } from '@molecule/api-analytics'
import { provider as mixpanel } from '@molecule/api-analytics-mixpanel'

setProvider(mixpanel)
await identify({ userId: 'u_123', email: 'user@example.com' })
await track({ name: 'purchase.completed', properties: { amount: 49.99 } })
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-analytics @molecule/api-bond @molecule/api-i18n
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
   * User ID the page view belongs to. Server-side providers have no ambient
   * session — without this (or `anonymousId`) every page view from every user
   * is attributed to a single shared "anonymous" identity.
   */
  userId?: string

  /**
   * Anonymous ID for non-authenticated users.
   */
  anonymousId?: string

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
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

Unlike the app-side `@molecule/app-analytics` (which swallows every error so
analytics can never break the UI), these server-side convenience functions
PROPAGATE provider failures: `track()`/`identify()`/`page()` reject when the
provider does, and all of them throw when no provider is bonded. Add
`.catch()` at fire-and-forget call sites (or log-and-continue) so an
analytics outage or missing configuration cannot fail your request handlers.

`group(groupId)` associates the user under the bond's configured group type
(Mixpanel group key, PostHog group type), `'company'` by default in every
bond — overridable per bond via its `groupType` option or `*_GROUP_TYPE`
env var. Look under that group type (default "company") in the provider's UI.

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

## Translations

Translation strings are provided by `@molecule/api-locales-analytics`.
