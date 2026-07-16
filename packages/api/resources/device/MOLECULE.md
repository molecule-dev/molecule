# @molecule/api-resource-device

The `device` resource for molecule.dev — one row per signed-in browser or
app install, owned by a user. Devices anchor session context and push
delivery: the row stores `pushPlatform`/`pushSubscription`, the routes cover
device list/read/update/delete plus `GET /devices/push/public-key` (the
VAPID key browsers need to subscribe), and API-side push fan-outs read the
stored subscriptions.

## Quick Start

```typescript
import { createRequestHandler } from '@molecule/api-resource'
import {
  createRequestHandlerMap,
  resource,
  routes,
} from '@molecule/api-resource-device'

// Unlike newer resources, the handler map is a FACTORY — build it with the
// createRequestHandler from @molecule/api-resource (mlcl inject does this):
const requestHandlerMap = createRequestHandlerMap(createRequestHandler)
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-device @molecule/api-bond @molecule/api-database @molecule/api-i18n @molecule/api-locales-device @molecule/api-resource zod
```

## API

### Interfaces

#### `DeviceRequestHandlerMap`

Shape of the device request-handler map produced by `createRequestHandlerMap`.
Names match the route definitions in `routes.ts`. Exported so helpers that
accept the map (e.g. `mountDefaultDeviceRoutes`) can type their parameter
precisely instead of widening to `Record<string, MoleculeRequestHandler>`.

```typescript
interface DeviceRequestHandlerMap {
  auth: MoleculeRequestHandler
  authUser: MoleculeRequestHandler
  del: MoleculeRequestHandler
  pushPublicKey: MoleculeRequestHandler
  query: MoleculeRequestHandler
  read: MoleculeRequestHandler
  update: MoleculeRequestHandler
}
```

### Types

#### `APNPushSubscription`

APN push subscription type.

```typescript
type APNPushSubscription = z.infer<typeof apnPushSubscriptionSchema>
```

#### `CreateProps`

Fields required when registering a new device (userId, name, push subscription).

```typescript
type CreateProps = z.infer<typeof createPropsSchema>
```

#### `FCMPushSubscription`

FCM push subscription type.

```typescript
type FCMPushSubscription = z.infer<typeof fcmPushSubscriptionSchema>
```

#### `Props`

Full device record properties (userId, name, push platform/subscription, timestamps).

```typescript
type Props = z.infer<typeof propsSchema>
```

#### `PushProps`

Push notification properties for a device (device ID, platform, subscription data).

```typescript
type PushProps = z.infer<typeof pushPropsSchema>
```

#### `PushSubscription`

Web Push subscription type.

```typescript
type PushSubscription = z.infer<typeof webPushSubscriptionSchema>
```

#### `UpdateProps`

Updatable device fields (name, push platform, push subscription).

```typescript
type UpdateProps = z.infer<typeof updatePropsSchema>
```

### Functions

#### `createRequestHandlerMap(createRequestHandler)`

Creates the full request handler map for the Device resource. Maps handler names (matching
route definitions) to Express middleware: `auth`, `authUser` (authorizers), and `del`, `query`,
`read`, `update` (CRUD handlers).

```typescript
function createRequestHandlerMap(createRequestHandler: (handler: Handler) => (req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction) => Promise<void>): DeviceRequestHandlerMap
```

- `createRequestHandler` — Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.

**Returns:** A `DeviceRequestHandlerMap` of handler names to Express middleware.

### Constants

#### `apnPushSubscriptionSchema`

APN push subscription schema.

```typescript
const apnPushSubscriptionSchema: z.ZodObject<{ registrationId: z.ZodString; }, z.core.$strip>
```

#### `createPropsSchema`

Schema for creating a device.

```typescript
const createPropsSchema: z.ZodObject<{ userId: z.ZodString; name: z.ZodOptional<z.ZodString>; pushPlatform: z.ZodOptional<z.ZodEnum<{ fcm: "fcm"; apn: "apn"; }>>; pushSubscription: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{ endpoint: z.ZodOptional<z.ZodString>; keys: z.ZodOptional<z.ZodObject<{ p256dh: z.ZodString; auth: z.ZodString; }, z.core.$strip>>; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; registrationType: z.ZodLiteral<"FCM">; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; }, z.core.$strip>]>>>; hasPushSubscription: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

#### `deviceService`

DeviceService implementation for the bond system.

Provides device CRUD operations that other resources
can use through `get('device')` / `require('device')`.

```typescript
const deviceService: DeviceService
```

#### `fcmPushSubscriptionSchema`

FCM push subscription schema.

```typescript
const fcmPushSubscriptionSchema: z.ZodObject<{ registrationId: z.ZodString; registrationType: z.ZodLiteral<"FCM">; }, z.core.$strip>
```

#### `i18nRegistered`

The i18n registered.

```typescript
const i18nRegistered: true
```

#### `propsSchema`

The full schema for device props.

```typescript
const propsSchema: z.ZodObject<{ id: z.ZodString; createdAt: z.ZodString; updatedAt: z.ZodString; userId: z.ZodString; name: z.ZodOptional<z.ZodString>; pushPlatform: z.ZodOptional<z.ZodEnum<{ fcm: "fcm"; apn: "apn"; }>>; pushSubscription: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{ endpoint: z.ZodOptional<z.ZodString>; keys: z.ZodOptional<z.ZodObject<{ p256dh: z.ZodString; auth: z.ZodString; }, z.core.$strip>>; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; registrationType: z.ZodLiteral<"FCM">; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; }, z.core.$strip>]>>>; hasPushSubscription: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

#### `pushPropsSchema`

Zod schema for push notification properties (device ID, platform, subscription).

```typescript
const pushPropsSchema: z.ZodObject<{ id: z.ZodString; pushPlatform: z.ZodOptional<z.ZodEnum<{ fcm: "fcm"; apn: "apn"; }>>; pushSubscription: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{ endpoint: z.ZodOptional<z.ZodString>; keys: z.ZodOptional<z.ZodObject<{ p256dh: z.ZodString; auth: z.ZodString; }, z.core.$strip>>; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; registrationType: z.ZodLiteral<"FCM">; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; }, z.core.$strip>]>>>; }, z.core.$strip>
```

#### `pushSubscriptionKeysSchema`

Web Push subscription keys schema.

```typescript
const pushSubscriptionKeysSchema: z.ZodObject<{ p256dh: z.ZodString; auth: z.ZodString; }, z.core.$strip>
```

#### `pushSubscriptionSchema`

Combined push subscription schema (union of all types).

```typescript
const pushSubscriptionSchema: z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{ endpoint: z.ZodOptional<z.ZodString>; keys: z.ZodOptional<z.ZodObject<{ p256dh: z.ZodString; auth: z.ZodString; }, z.core.$strip>>; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; registrationType: z.ZodLiteral<"FCM">; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; }, z.core.$strip>]>>>
```

#### `resource`

The device resource definition.

```typescript
const resource: types.Resource<unknown>
```

#### `routes`

Declarative route definitions for the Device resource, used to generate the Express router.

```typescript
const routes: ({ method: "get"; path: string; middlewares: string[]; handler: string; } | { method: "patch"; path: string; middlewares: string[]; handler: string; } | { method: "delete"; path: string; middlewares: string[]; handler: string; })[]
```

#### `updatePropsSchema`

Zod schema for updating a device (partial pick of name, push platform, push subscription).

```typescript
const updatePropsSchema: z.ZodObject<{ name: z.ZodOptional<z.ZodOptional<z.ZodString>>; pushPlatform: z.ZodOptional<z.ZodOptional<z.ZodEnum<{ fcm: "fcm"; apn: "apn"; }>>>; pushSubscription: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodUnion<readonly [z.ZodObject<{ endpoint: z.ZodOptional<z.ZodString>; keys: z.ZodOptional<z.ZodObject<{ p256dh: z.ZodString; auth: z.ZodString; }, z.core.$strip>>; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; registrationType: z.ZodLiteral<"FCM">; }, z.core.$strip>, z.ZodObject<{ registrationId: z.ZodString; }, z.core.$strip>]>>>>; hasPushSubscription: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>; }, z.core.$strip>
```

#### `webPushSubscriptionSchema`

Web Push subscription schema.

```typescript
const webPushSubscriptionSchema: z.ZodObject<{ endpoint: z.ZodOptional<z.ZodString>; keys: z.ZodOptional<z.ZodObject<{ p256dh: z.ZodString; auth: z.ZodString; }, z.core.$strip>>; }, z.core.$strip>
```

### Namespaces

#### `authorizers`

#### `handlers`

#### `types`

#### `z`

## Services

This package exports services that should be registered with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { deviceService } from '@molecule/api-resource-device'

bond('device', deviceService)
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-device` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `@molecule/api-database` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-device`
- `@molecule/api-resource`
- `zod`

- **Table setup:** `setup/devices.sql` ships with this package (the standard
  scaffold applies it as a base migration; `resource.tableName` is `devices`).
  When adding to an existing app, apply it before use.
- **The handler map is a factory, not a constant.** Call
  `createRequestHandlerMap(createRequestHandler)`; do not import a
  `requestHandlerMap` constant like other resources export. Its `auth` /
  `authUser` entries are the authorizer middlewares the routes reference —
  `authUser` enforces that the session user OWNS the device row; removing
  either from the map ships the routes ungated (IDOR on other users' devices).
- **Device rows are created by the auth flow, not by these routes** — there is
  no `POST /devices`; signup/login registers the caller's device. Clients then
  save their push subscription via
  `PATCH /devices/:id { pushSubscription, hasPushSubscription }` — the
  contract the push fan-outs read.
- **`GET /devices/push/public-key` is unauthenticated by design** (VAPID public
  keys are public) and bond-gated: 404 when no `push-notifications` bond is
  wired, 503 when it is wired but unconfigured (`VAPID_PUBLIC_KEY` unset) —
  never a crash. Surface those states in the client instead of retrying.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Registering a device persists a real row that appears in the signed-in
  user's device list: sign in on a fresh browser/install, open GET /devices,
  and the device shows with its `name` and timestamps — the current session's
  device sorted first and flagged `isCurrent: true`. Rows are created by the
  AUTH flow (signup/login → `createOrUpdate`), NOT a POST route; there is no
  `POST /devices`.
- [ ] Re-registering the SAME device does not duplicate it: sign in again from
  the same device (same user + device `name`) and the existing row is reused
  with a bumped `updatedAt` — the list count is unchanged, no second row
  appears. (The dedup key here is user + `name`, not a push token.)
- [ ] Saving a push subscription targets THIS device and only opted-in ones:
  PATCH /devices/:id { pushSubscription, pushPlatform, hasPushSubscription:
  true } stores the subscription (`pushSubscription` is what push actually
  targets), and a real push fan-out reaches exactly the user's devices where
  `hasPushSubscription` is true (`getWithPushSubscription`) — a device that
  never subscribed receives nothing.
- [ ] Refreshing the subscription replaces the stale one: PATCH the same
  device with a new `pushSubscription` and the next push goes to the NEW value,
  never the old — one current subscription per device, not a growing list.
  Clearing it (`hasPushSubscription: false`) drops the device from the fan-out
  set immediately, so it stops receiving.
- [ ] Last-seen tracks use: an active device's `updatedAt` advances on
  re-registration / `updateLastSeen`, so the list reflects recency.
- [ ] Removing a device deletes it and it can no longer be targeted OR used:
  DELETE /devices/:id removes the row, so it disappears from GET /devices, is
  excluded from every push fan-out, AND its session is revoked — the JWT bound
  to that `deviceId` is rejected on its very next request (`exists()` → false),
  for every copy of the token.
- [ ] AUTHORIZATION — devices are strictly per-user. GET /devices returns ONLY
  the session user's own rows; reading, updating, or deleting via /devices/:id
  is gated by `authUser`, which requires the device `id` AND its `userId` to
  match the session — so guessing another user's device id is rejected (401,
  no IDOR into their row or push subscription). The owner is always the session
  user: a device is registered under the caller's own `userId`, and one user
  can never PATCH a push subscription onto another user's device.
