/**
 * Provider-agnostic analytics interface for molecule.dev.
 *
 * Defines the `AnalyticsProvider` interface for tracking events, identifying users,
 * and recording page views. Bond packages (Mixpanel, PostHog, Segment, etc.)
 * implement this interface. Application code uses the convenience functions
 * (`track`, `identify`, `page`) which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, track, identify } from '@molecule/api-analytics'
 * import { provider as mixpanel } from '@molecule/api-analytics-mixpanel'
 *
 * setProvider(mixpanel)
 * await identify({ userId: 'u_123', email: 'user@example.com' })
 * await track({ name: 'purchase.completed', properties: { amount: 49.99 } })
 * ```
 *
 * @remarks
 * Unlike the app-side `@molecule/app-analytics` (which swallows every error so
 * analytics can never break the UI), these server-side convenience functions
 * PROPAGATE provider failures: `track()`/`identify()`/`page()` reject when the
 * provider does, and all of them throw when no provider is bonded. Add
 * `.catch()` at fire-and-forget call sites (or log-and-continue) so an
 * analytics outage or missing configuration cannot fail your request handlers.
 *
 * `group(groupId)` associates the user under the bond's configured group type
 * (Mixpanel group key, PostHog group type), `'company'` by default in every
 * bond — overridable per bond via its `groupType` option or `*_GROUP_TYPE`
 * env var. Look under that group type (default "company") in the provider's UI.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Each user action the app cares about (signup/login, a page or screen
 *   view, a purchase/conversion or other domain event) EMITS a `track()` /
 *   `page()` with the RIGHT event name + properties when performed in the UI —
 *   and the event is actually RECORDED, proven by reading it back, not by
 *   finding a `track(...)` call in source. Analytics is fire-and-forget to a
 *   third-party (Mixpanel/PostHog/Segment) that is NOT reachable in the sandbox
 *   and NOT captured by `read_activity` (that captures email/sms/push/webhook/
 *   channel, never analytics). So prove the wiring locally: read the event back
 *   from the app's own events store/dashboard/funnel if it has one, or bond a
 *   local recording/console provider for dev and confirm the call fired via
 *   `read_logs`.
 * - [ ] Events are ATTRIBUTED to the right identity: `identify({ userId, ... })`
 *   runs at signup/login so events carry that `userId`. Server-side has no
 *   ambient session — a `track()` / `page()` with neither `userId` nor
 *   `anonymousId` collapses every user into one shared "anonymous" identity.
 *   If the app tracks activity before login, confirm those `anonymousId` events
 *   associate/merge to the user on identify.
 * - [ ] Tracking is NON-BLOCKING. Unlike the app-side bond, these SERVER
 *   functions PROPAGATE provider failures (they reject when the provider does,
 *   and throw when none is bonded), so fire-and-forget is the CALLER's job:
 *   every call site wraps the call in `.catch()` / log-and-continue. Verify by
 *   forcing a failure (unbonded or erroring provider) — the user action
 *   (signup, checkout) still completes with no visible error and no added
 *   latency; the analytics await never blocks the response.
 * - [ ] PRIVACY — no secret or sensitive PII in event `properties` or identify
 *   `traits`: never a password, full card/PAN, CVV, auth token, or session
 *   cookie. Read the recorded event back and confirm only non-sensitive
 *   attributes (plan name, amount, item id) are present.
 * - [ ] If the app exposes analytics reports/dashboards/funnels, the numbers
 *   reflect REAL recorded events (perform an action, the matching count/funnel
 *   step increments) and are SCOPED — a user/org reads only its OWN analytics;
 *   no endpoint lets one org read another org's numbers (`group()` associates a
 *   user under the bond's group type, 'company' by default).
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
