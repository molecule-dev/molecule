# @molecule/api-notifications-preferences

Notification preferences resource for molecule.dev.

Per-user channel toggles keyed by canonical event-type slug — used as the
delivery gate for email / push / sms / in-app notifications. Pairs with
`@molecule/api-resource-notification` (which stores the resulting
notifications) and the various dispatch bonds under
`@molecule/api-notifications-*`.

## Quick Start

```typescript
import {
  routes,
  requestHandlerMap,
  isEnabled,
} from '@molecule/api-notifications-preferences'

// Wire HTTP routes (mlcl inject does this automatically):
//   GET /me/notification-preferences
//   PUT /me/notification-preferences

// Gate delivery in a notification dispatcher:
if (await isEnabled(userId, 'order.shipped', 'email')) {
  await sendEmail(...)
}
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-notifications-preferences @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource
```

## API

### Interfaces

#### `NotificationChannelToggles`

Per-channel enablement booleans for a single notification type.

```typescript
interface NotificationChannelToggles {
  /** Whether email delivery is enabled for this type. */
  email: boolean
  /** Whether push delivery is enabled for this type. */
  push: boolean
  /** Whether SMS delivery is enabled for this type. */
  sms: boolean
  /** Whether in-app inbox delivery is enabled for this type. */
  inApp: boolean
}
```

#### `NotificationPreferencesRow`

Persisted row shape in `notifications_preferences`.

Single row per user; `preferences` is a JSONB column holding the full
type→channel-toggles map.

```typescript
interface NotificationPreferencesRow {
  /** Owning user identifier. */
  userId: string
  /** The full preferences map. */
  preferences: NotificationPreferences
  /** When the row was created (ISO 8601). */
  createdAt: string
  /** When the row was last updated (ISO 8601). */
  updatedAt: string
}
```

### Types

#### `NotificationChannel`

Delivery channel name. Channels map 1:1 to dispatch bonds
(email / push / sms / in-app inbox).

```typescript
type NotificationChannel = 'email' | 'push' | 'sms' | 'inApp'
```

#### `NotificationPreferences`

Full preferences map: notification-type → per-channel toggles.

```typescript
type NotificationPreferences = Record<NotificationType, NotificationChannelToggles>
```

#### `NotificationPreferencesPatch`

Partial update payload — any subset of types, any subset of channels.

`updatePreferences()` deep-merges this into the stored map; missing keys
preserve their existing values rather than reverting to defaults.

```typescript
type NotificationPreferencesPatch = Record<
  NotificationType,
  Partial<NotificationChannelToggles>
>
```

#### `NotificationType`

Canonical notification-type slug (e.g. `order.shipped`, `streak.at_risk`).

Aliased to `string` so applications can declare their own union of slugs
without coupling this package to any particular taxonomy.

```typescript
type NotificationType = string
```

### Functions

#### `getPreferences(userId)`

Retrieves the stored preferences map for a user.

If no row exists yet, returns an empty map (`{}`). Callers should treat
missing entries as "all channels enabled" — use `isEnabled()` rather than
inspecting this map directly when gating delivery.

```typescript
function getPreferences(userId: string): Promise<NotificationPreferences>
```

- `userId` — The user to look up.

**Returns:** The user's stored preferences map, or `{}` if no row exists.

#### `getPreferencesHandler(req, res)`

Returns the current user's notification preferences map.

```typescript
function getPreferencesHandler(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The authenticated request.
- `res` — The response object.

#### `isEnabled(userId, type, channel)`

Resolves whether a specific channel is enabled for a specific notification
type for a user.

Default-on policy: returns `true` when no row exists, when the type has no
stored entry, or when the channel field is missing from the entry. Callers
should use this as the authoritative delivery gate.

```typescript
function isEnabled(userId: string, type: string, channel: NotificationChannel): Promise<boolean>
```

- `userId` — The user to check.
- `type` — The notification-type slug.
- `channel` — The delivery channel.

**Returns:** `true` if delivery is allowed, `false` if explicitly disabled.

#### `updatePreferences(userId, patch)`

Applies a partial update to the user's preferences map.

Performs a per-type, per-channel deep merge: keys present in `patch`
overwrite their counterparts in storage; keys absent from `patch` are
preserved. Creates the row on first call if none exists.

```typescript
function updatePreferences(userId: string, patch: NotificationPreferencesPatch): Promise<NotificationPreferences>
```

- `userId` — The user whose preferences should be updated.
- `patch` — Partial type→channel-toggle overrides to merge in.

**Returns:** The fully-merged preferences map after the update.

#### `updatePreferencesHandler(req, res)`

Merges a partial preferences patch into the current user's stored map.

```typescript
function updatePreferencesHandler(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The authenticated request with a partial preferences body.
- `res` — The response object.

### Constants

#### `requestHandlerMap`

Handler map for notification-preferences routes.

```typescript
const requestHandlerMap: { readonly getPreferences: typeof getPreferencesHandler; readonly updatePreferences: typeof updatePreferencesHandler; }
```

#### `routes`

Routes for reading and updating the current user's notification
preferences.

```typescript
const routes: readonly [{ readonly method: "get"; readonly path: "/me/notification-preferences"; readonly handler: "getPreferences"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "put"; readonly path: "/me/notification-preferences"; readonly handler: "updatePreferences"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-resource`

- **Migration required.** `src/__setup__/notifications_preferences.sql` ships
  with this package and must exist in the target database before use
  (scaffolded apps apply it automatically; when adding to an existing app,
  apply it — adapted to your database bond — first).
- **Default-ON semantics: absence means ENABLED.** A user with no row, no entry
  for a type, or no field for a channel is opted IN. Always gate delivery with
  `isEnabled(userId, type, channel)`; never inspect the `getPreferences()` map
  directly — naive missing-key checks either drop wanted notifications or spam
  users who opted out.
- **The gate only works where it is called.** Every server-side dispatch path
  (email/push/sms/in-app senders, cron jobs, event hooks) must call
  `isEnabled()` before sending. The shipped routes only manage stored
  preferences; nothing enforces them automatically.
- **Routes are session-scoped** (`/me/notification-preferences`, `authenticate`):
  the handlers take the user from the session — never accept a target userId
  from the client for reads or writes.
- Type slugs are free-form strings: keep ONE canonical slug per event (e.g.
  `order.shipped`) shared by the preferences UI and every dispatch call — a
  mismatched slug silently bypasses the user's choice (default-on).

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one by
one. A preference is only meaningful if it is HONORED at send time, so every
saved toggle must also be proven to change what actually gets delivered. A
box you can't check is an integration bug to fix — not a skip:
- [ ] A brand-new user with no saved row opens the preferences screen and it
  renders with SANE DEFAULTS: `GET /me/notification-preferences` returns an
  empty map (`{}`), never a 500 or crash, and every channel
  (email/push/sms/inApp) shows as ON — matching the default-on policy
  (`isEnabled()` is true before any row exists).
- [ ] Toggling a channel OFF for a category PERSISTS: disable one channel for
  one notification type (e.g. email for `order.shipped`) in the UI →
  `PUT /me/notification-preferences` saves it → a reload / re-read shows that
  channel `false` for that type while every other type and channel stays ON
  (the partial merge does not clobber the rest).
- [ ] The opt-out is ACTUALLY HONORED end-to-end: after disabling email for a
  category, trigger that notification through its real flow — the email is
  SUPPRESSED on the disabled channel while an enabled channel (e.g.
  in-app/push) still delivers. Verify against the captured outbound with the
  `read_activity` tool: the suppressed channel's message for that type is
  ABSENT and the enabled channel's message is present. A dispatch path that
  saves the toggle but never calls `isEnabled()` before sending is exactly
  the bug this catches.
- [ ] Transactional/critical notifications that must always send (security
  alerts, receipts, password resets) STILL deliver on their channel even
  after the user has disabled that category/channel — their dispatch path is
  intentionally NOT gated by `isEnabled()`. Confirm via `read_activity` that
  the critical message is still captured.
- [ ] AUTHORIZATION — a user reads and edits only THEIR OWN preferences. The
  routes are session-scoped (`/me/...`, the owner taken from the session); no
  request body, query, or path param lets a caller read or write another
  user's preferences (no id-guessing into someone else's row).
