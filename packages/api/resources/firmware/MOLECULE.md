# @molecule/api-resource-firmware

`@molecule/api-resource-firmware` — owner-scoped firmware versions
and OTA rollouts.

- Versions follow a draft → published → deprecated lifecycle.
- Rollouts target an explicit `device_ids[]` list, a `fleet_id`, or
  both. The intersection with owner-scoped devices is what actually
  gets enrolled.
- Per-device `firmware_update_tasks` rows are materialized and a
  matching `device_commands` row with `firmware_update` payload is
  created. Best-effort realtime broadcasts go out on
  `firmware:{deviceId}` and `commands:{deviceId}`.
- The device reports back via a token-authenticated status endpoint;
  the resource updates the rollout's completed/failed counters and
  bumps the device's `firmware_version` on success.

Extracted from the iot-device-manager flagship.

## Quick Start

```ts
import express from 'express'
import {
  createFirmwareRouter,
  type DeviceTokenMiddleware,
} from '@molecule/api-resource-firmware'

// Device-auth implementations vary per deployment (token, mTLS, JWT, …),
// so the status-report endpoint takes a caller-supplied authorizer. On
// success it MUST set `res.locals.deviceAuth = { deviceId, ownerId }`;
// on failure it responds 401.
const requireDeviceToken: DeviceTokenMiddleware = async (req, res, next) => {
  const device = await verifyDeviceToken(req.header('authorization'))
  if (!device) {
    res.sendStatus(401)
    return
  }
  res.locals.deviceAuth = { deviceId: device.id, ownerId: device.ownerId }
  next()
}

const app = express()
app.use('/api/firmware', createFirmwareRouter({ requireDeviceToken }))
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-firmware @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-middleware-validation @molecule/api-realtime express zod
npm install -D @types/express
```

## API

### Interfaces

#### `FirmwareRolloutRow`

Database row representing a firmware rollout targeting a fleet or set of devices.

```typescript
interface FirmwareRolloutRow {
  id: string
  owner_id: string
  firmware_id: string
  fleet_id: string | null
  device_ids: unknown
  strategy: RolloutStrategy
  status: RolloutStatus
  target_count: number
  completed_count: number
  failed_count: number
  progress_percent: number
  created_at: string | Date
  updated_at: string | Date
}
```

#### `FirmwareUpdateTaskRow`

Database row representing a single device's update task within a rollout.

```typescript
interface FirmwareUpdateTaskRow {
  id: string
  rollout_id: string
  firmware_id: string
  device_id: string
  status: RolloutTaskStatus
  error_message: string | null
  completed_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}
```

#### `FirmwareVersionRow`

Database row representing a firmware version artifact and its metadata.

```typescript
interface FirmwareVersionRow {
  id: string
  owner_id: string
  version: string
  device_type: string
  release_notes: string
  download_url: string | null
  checksum: string | null
  file_size: number
  status: FirmwareStatus
  released_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}
```

### Types

#### `DeviceTokenMiddleware`

Caller-supplied device-token authorization. Should set
`res.locals.deviceAuth = { deviceId, ownerId }` on success or 401 on
failure.

```typescript
type DeviceTokenMiddleware = RequestHandler
```

#### `FirmwareStatus`

Lifecycle state of a firmware version.

```typescript
type FirmwareStatus = 'draft' | 'published' | 'deprecated'
```

#### `RolloutStatus`

Current state of a firmware rollout operation.

```typescript
type RolloutStatus = 'pending' | 'active' | 'completed' | 'failed' | 'canceled'
```

#### `RolloutStrategy`

Deployment strategy used when rolling out a firmware version to devices.

```typescript
type RolloutStrategy = 'immediate' | 'canary' | 'gradual'
```

#### `RolloutTaskStatus`

Current state of an individual device update task within a rollout.

```typescript
type RolloutTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed'
```

### Functions

#### `createFirmwareForOwner(userId, input)`

Create a draft firmware version.

```typescript
function createFirmwareForOwner(userId: string, input: { version: string; device_type: string; release_notes?: string; download_url?: string | null; checksum?: string | null; file_size?: number; }): Promise<FirmwareVersionRow | null>
```

#### `createFirmwareRouter(opts)`

Build the firmware router.

```typescript
function createFirmwareRouter(opts: { requireDeviceToken: DeviceTokenMiddleware; }): Router
```

#### `createRolloutForOwner(userId, input)`

Create a rollout, materialize per-device tasks + `firmware_update`
device commands, and best-effort broadcast realtime notifications.

```typescript
function createRolloutForOwner(userId: string, input: { firmware_id: string; device_ids?: string[]; fleet_id?: string | null; strategy?: RolloutStrategy; }): Promise<{ ok: true; rollout: FirmwareRolloutRow; targets: string[]; } | { ok: false; reason: "not_found" | "not_published" | "no_targets"; }>
```

#### `getFirmwareForOwner(userId, id)`

Owner-scoped firmware read — null when missing or not owned.

```typescript
function getFirmwareForOwner(userId: string, id: string): Promise<FirmwareVersionRow | null>
```

#### `isUuid(value)`

Whether a string is a syntactically valid UUID.

```typescript
function isUuid(value: string): boolean
```

#### `listFirmwareForOwner(userId, filters?)`

Owner-scoped firmware list.

```typescript
function listFirmwareForOwner(userId: string, filters?: { device_type?: string; status?: string; page?: number; limit?: number; }): Promise<FirmwareVersionRow[]>
```

#### `listRolloutsForOwner(userId, filters?)`

Owner-scoped rollout list.

```typescript
function listRolloutsForOwner(userId: string, filters?: { firmware_id?: string; status?: string; page?: number; limit?: number; }): Promise<FirmwareRolloutRow[]>
```

#### `publishFirmwareForOwner(userId, id)`

Flip a firmware version to published + stamp `released_at`.

```typescript
function publishFirmwareForOwner(userId: string, id: string): Promise<FirmwareVersionRow | null>
```

#### `recordRolloutDeviceStatus(opts)`

Record a per-device task status report. Updates the rollout's
completed/failed counters + progress percent; on success bumps the
device's `firmware_version` to the new release.

```typescript
function recordRolloutDeviceStatus(opts: { rolloutId: string; deviceId: string; ownerId: string; status: RolloutTaskStatus; errorMessage?: string | null; }): Promise<{ ok: true; } | { ok: false; reason: "task_not_found"; }>
```

#### `updateFirmwareForOwner(userId, id, patch)`

Patch a firmware version owned by the user.

```typescript
function updateFirmwareForOwner(userId: string, id: string, patch: Record<string, unknown>): Promise<FirmwareVersionRow | null>
```

### Constants

#### `createFirmwareSchema`

Validator for creating a draft firmware version.

```typescript
const createFirmwareSchema: z.ZodObject<{ version: z.ZodString; device_type: z.ZodString; release_notes: z.ZodOptional<z.ZodString>; download_url: z.ZodOptional<z.ZodNullable<z.ZodString>>; checksum: z.ZodOptional<z.ZodNullable<z.ZodString>>; file_size: z.ZodOptional<z.ZodCoercedNumber<unknown>>; }, z.core.$strip>
```

#### `createRolloutSchema`

Validator for creating a rollout.

```typescript
const createRolloutSchema: z.ZodObject<{ firmware_id: z.ZodString; device_ids: z.ZodOptional<z.ZodArray<z.ZodString>>; fleet_id: z.ZodOptional<z.ZodNullable<z.ZodString>>; strategy: z.ZodOptional<z.ZodEnum<{ immediate: "immediate"; canary: "canary"; gradual: "gradual"; }>>; }, z.core.$strip>
```

#### `firmwareStatusSchema`

Allowed lifecycle states for a firmware version.

```typescript
const firmwareStatusSchema: z.ZodEnum<{ draft: "draft"; published: "published"; deprecated: "deprecated"; }>
```

#### `listFirmwareQuerySchema`

Validator for the firmware-version list query params.

```typescript
const listFirmwareQuerySchema: z.ZodObject<{ device_type: z.ZodOptional<z.ZodString>; status: z.ZodOptional<z.ZodEnum<{ draft: "draft"; published: "published"; deprecated: "deprecated"; }>>; page: z.ZodDefault<z.ZodCoercedNumber<unknown>>; limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>; }, z.core.$strip>
```

#### `listRolloutsQuerySchema`

Validator for the rollout-list query params.

```typescript
const listRolloutsQuerySchema: z.ZodObject<{ firmware_id: z.ZodOptional<z.ZodString>; status: z.ZodOptional<z.ZodEnum<{ pending: "pending"; completed: "completed"; failed: "failed"; active: "active"; canceled: "canceled"; }>>; page: z.ZodDefault<z.ZodCoercedNumber<unknown>>; limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>; }, z.core.$strip>
```

#### `rolloutDeviceStatusSchema`

Validator for a per-device rollout status report.

```typescript
const rolloutDeviceStatusSchema: z.ZodObject<{ status: z.ZodEnum<{ pending: "pending"; in_progress: "in_progress"; completed: "completed"; failed: "failed"; }>; error_message: z.ZodOptional<z.ZodNullable<z.ZodString>>; }, z.core.$strip>
```

#### `rolloutStatusSchema`

Allowed progress states for a firmware rollout.

```typescript
const rolloutStatusSchema: z.ZodEnum<{ pending: "pending"; completed: "completed"; failed: "failed"; active: "active"; canceled: "canceled"; }>
```

#### `rolloutStrategySchema`

Allowed rollout delivery strategies.

```typescript
const rolloutStrategySchema: z.ZodEnum<{ immediate: "immediate"; canary: "canary"; gradual: "gradual"; }>
```

#### `updateFirmwareSchema`

Validator for patching a firmware version (release notes, status, etc).

```typescript
const updateFirmwareSchema: z.ZodObject<{ release_notes: z.ZodOptional<z.ZodString>; download_url: z.ZodOptional<z.ZodNullable<z.ZodString>>; checksum: z.ZodOptional<z.ZodNullable<z.ZodString>>; file_size: z.ZodOptional<z.ZodCoercedNumber<unknown>>; status: z.ZodOptional<z.ZodEnum<{ draft: "draft"; published: "published"; deprecated: "deprecated"; }>>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `@molecule/api-realtime` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-middleware-validation`
- `@molecule/api-realtime`
- `express`
- `zod`

The schema in `__setup__/firmware.sql` creates `firmware_versions`,
`firmware_rollouts`, and `firmware_update_tasks`. The resource also
reads/writes `iot_devices`, `fleets`, `fleet_memberships`,
`device_commands`, and `device_alerts` — those tables are owned by
the iot-device-manager template.
