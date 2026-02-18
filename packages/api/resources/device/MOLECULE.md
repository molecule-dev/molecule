# @molecule/api-resource-device

The `device` resource types, schema, and definition.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-device
```

## API

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
function createRequestHandlerMap(createRequestHandler: (handler: Handler) => (req: MoleculeRequest, res: MoleculeResponse, next: MoleculeNextFunction) => Promise<void>): Record<string, MoleculeRequestHandler>
```

- `createRequestHandler` — Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.

**Returns:** A record mapping handler names to Express middleware functions.

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-device` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `@molecule/api-database` ^1.0.0
