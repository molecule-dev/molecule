# @molecule/api-resource-room-type

Room-type resource for molecule.dev.

Models a category of bookable unit within a property — capacity, rate
baselines, amenities, photos. Used by hotel-booking and
rental-marketplace flagship apps.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-room-type'
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-room-type
```

## API

### Interfaces

#### `CreateRoomTypeInput`

Input payload for creating a room type.

```typescript
interface CreateRoomTypeInput {
  /** Property the room type belongs to. */
  propertyId: string
  /** Display name. */
  name: string
  /** Optional long-form description. */
  description?: string
  /** Maximum guests. */
  capacity: number
  /** Base nightly rate in minor units. */
  baseRateCents: number
  /** ISO 4217 currency code. */
  currency: string
  /** Amenity codes. */
  amenities?: string[]
  /** Image URLs. */
  photos?: string[]
  /** Total physical inventory. */
  totalUnits: number
  /** Whether this room type is bookable on creation. Defaults to `true`. */
  active?: boolean
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>
}
```

#### `PaginatedRoomTypes`

A page of room-type results.

```typescript
interface PaginatedRoomTypes {
  /** The page of results. */
  data: RoomType[]
  /** Total matching records (across all pages). */
  total: number
  /** Current page number. */
  page: number
  /** Page size. */
  limit: number
}
```

#### `RoomType`

A bookable category of unit within a property.

Capacity and pricing are baselines; the booking flow may apply per-night
variations through a separate rate-plan layer (not modelled here).

```typescript
interface RoomType {
  /** Unique room-type identifier. */
  id: string
  /** The property this room type belongs to. */
  propertyId: string
  /** Display name (e.g., "Deluxe King"). */
  name: string
  /** Optional long-form description. */
  description?: string
  /** Maximum number of guests this unit type accommodates. */
  capacity: number
  /** Base nightly rate in the property's billing currency, in minor units (cents). */
  baseRateCents: number
  /** ISO 4217 currency code (e.g., "USD"). */
  currency: string
  /** Amenity codes (e.g., "wifi", "kitchen", "parking"). */
  amenities: string[]
  /** Image URLs displayed in listings. */
  photos: string[]
  /** Total physical inventory of this type at the property (e.g., 12 deluxe-king rooms). */
  totalUnits: number
  /** Whether this room type is currently bookable. */
  active: boolean
  /** Arbitrary metadata attached to the room type. */
  metadata?: Record<string, unknown>
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

#### `RoomTypeQuery`

Query options for listing room types.

```typescript
interface RoomTypeQuery {
  /** Filter by property. */
  propertyId?: string
  /** Restrict to currently bookable room types. */
  activeOnly?: boolean
  /** Minimum guest capacity. */
  minCapacity?: number
  /** Page number (1-based). */
  page?: number
  /** Items per page. */
  limit?: number
}
```

#### `RoomTypeRow`

Internal database row representation. JSON columns are strings on the wire.

```typescript
interface RoomTypeRow {
  /** Unique identifier. */
  id: string
  /** Owning property. */
  propertyId: string
  /** Display name. */
  name: string
  /** Optional description. */
  description: string | null
  /** Maximum guests. */
  capacity: number
  /** Base nightly rate in minor units. */
  baseRateCents: number
  /** Currency code. */
  currency: string
  /** JSON-serialized amenity codes. */
  amenities: string | null
  /** JSON-serialized image URLs. */
  photos: string | null
  /** Total physical inventory. */
  totalUnits: number
  /** Bookable flag. */
  active: boolean
  /** JSON-serialized metadata. */
  metadata: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

#### `UpdateRoomTypeInput`

Input payload for updating a room type. All fields are optional.

```typescript
interface UpdateRoomTypeInput {
  /** Display name. */
  name?: string
  /** Long-form description. */
  description?: string
  /** Maximum guests. */
  capacity?: number
  /** Base nightly rate in minor units. */
  baseRateCents?: number
  /** ISO 4217 currency code. */
  currency?: string
  /** Amenity codes. */
  amenities?: string[]
  /** Image URLs. */
  photos?: string[]
  /** Total physical inventory. */
  totalUnits?: number
  /** Bookable flag. */
  active?: boolean
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>
}
```

### Functions

#### `create(req, res)`

Creates a new room type for a property.

Validates the request body and inserts a row in the `room_types` table.

Admin-only and enforced here (not merely via route middleware): a room type has
no per-user owner column, so a non-admin caller is rejected (401 when
unauthenticated, 403 otherwise) before any inventory/pricing row is inserted —
defense-in-depth that does not depend on the `requireAdmin` route middleware
being wired. An app that models per-property ownership can grant the
`manage roomType` permission (see `authorizers/index.ts`).

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with a {@link CreateRoomTypeInput} body.
- `res` — The response object.

#### `del(req, res)`

Deletes a room type by ID.

Hard-deletes the row. Callers that need soft-delete semantics (preserving
historical bookings that reference the type) should set `active = false`
via {@link update} instead.

Admin-only and enforced here (not merely via route middleware): a room type has
no per-user owner column, so a non-admin caller is rejected (401 when
unauthenticated, 403 otherwise) before anything is deleted — defense-in-depth
that does not depend on the `requireAdmin` route middleware being wired.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id`.
- `res` — The response object.

#### `isRoomTypeAdmin(res)`

Resolves whether the current request's session belongs to an actor authorized
to administer room types (create/update/delete inventory + pricing). Fail-closed:
returns `false` when there is no authenticated session, and otherwise only
`true` when the session carries an admin claim or a bonded permissions provider
grants the `manage roomType` permission.

Use this for in-handler defense-in-depth (it does not depend on the route
middleware being preserved by the injector).

```typescript
function isRoomTypeAdmin(res: MoleculeResponse): Promise<boolean>
```

- `res` — The response whose `locals.session` is inspected.

**Returns:** `true` when the session is an authorized room-type admin.

#### `list(req, res)`

Lists room types with optional filtering and pagination.

Supports filtering by `propertyId`, an `activeOnly` flag, and a
`minCapacity` floor. Results are sorted by capacity descending so the
largest rooms appear first.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional query params from {@link RoomTypeQuery}.
- `res` — The response object.

#### `parseMetadata(raw)`

Safely parse a JSON-serialized record. Returns `undefined` for null/empty
or malformed input so the caller can omit the field cleanly.

```typescript
function parseMetadata(raw: string | null | undefined): Record<string, unknown> | undefined
```

- `raw` — JSON string or null.

**Returns:** A record or `undefined`.

#### `parseStringArray(raw)`

Safely parse a JSON-serialized string array. Returns an empty array when
the input is null/undefined or unparseable.

```typescript
function parseStringArray(raw: string | null | undefined): string[]
```

- `raw` — JSON string or null.

**Returns:** A `string[]` (possibly empty).

#### `read(req, res)`

Retrieves a single room type by ID.

Read access is intentionally permissive — room-type metadata is
customer-facing inventory information. If a downstream caller needs to
gate access (for example, hiding inactive types from non-owners), wrap
this handler with an authorizer.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id`.
- `res` — The response object.

#### `requireAdmin()`

Route middleware that gates the admin-only room-type mutation routes
(`create`, `update`, `del`). Calls `next()` only for an authenticated admin; otherwise
forwards an error to the framework error handler — `Unauthorized` when no
session is present, `Forbidden` when the session is authenticated but not an
admin.

Exposed as a `requestHandlerMap` key so the injector's route scanner keeps it
(unlike the inert global `'authenticate'` string, which is dropped).

```typescript
function requireAdmin(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

#### `toRoomType(row)`

Convert a database row into a typed {@link RoomType}.

```typescript
function toRoomType(row: RoomTypeRow): RoomType
```

- `row` — The raw database row.

**Returns:** The deserialized room type.

#### `update(req, res)`

Updates an existing room type.

The handler accepts a partial {@link UpdateRoomTypeInput} body and only
persists fields that are explicitly provided, leaving the rest untouched.
`propertyId` cannot be changed once a room type is created — moving
inventory between properties should be handled with a dedicated migration
flow.

Admin-only and enforced here (not merely via route middleware): a room type has
no per-user owner column, so a non-admin caller is rejected (401 when
unauthenticated, 403 otherwise) before any price/inventory change — defense-in-
depth that does not depend on the `requireAdmin` route middleware being wired.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id` and an {@link UpdateRoomTypeInput} body.
- `res` — The response object.

#### `validateCreateInput(input)`

Validate a {@link RoomType}-creation payload. Returns an error key on the
first failed check, or `null` when valid. The key can be passed directly
to `t()` so callers don't need to map keys to messages themselves.

```typescript
function validateCreateInput(input: Record<string, unknown>): string | null
```

- `input` — Candidate creation payload (loose shape — request bodies are untyped).

**Returns:** A locale key for the first failed rule, or `null` if all checks pass.

### Constants

#### `i18nRegistered`

Whether i18n registration has been attempted.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Maps route handler names to their request handler implementations for the room-type resource.

`requireAdmin` is the admin authorizer middleware referenced by the
`update`/`del` routes. It must live here (as a real handler-map key) so the
mlcl injector's route scanner preserves it — a bare middleware string that
isn't a handler-map key is silently dropped.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly requireAdmin: MoleculeRequestHandler; }
```

#### `ROOM_TYPE_ADMIN_PERMISSION`

Session-claim permission string (`'roomType:manage'`) that, when present in a
session's `permissions` array, grants room-type administration without a bonded
permissions provider.

```typescript
const ROOM_TYPE_ADMIN_PERMISSION: "roomType:manage"
```

#### `ROOM_TYPE_PERMISSION_ACTION`

Permission action checked against `@molecule/api-permissions` for room-type
administration.

```typescript
const ROOM_TYPE_PERMISSION_ACTION: "manage"
```

#### `ROOM_TYPE_PERMISSION_RESOURCE`

Permission resource checked against `@molecule/api-permissions` for room-type
administration.

```typescript
const ROOM_TYPE_PERMISSION_RESOURCE: "roomType"
```

#### `routes`

Room-type resource routes.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/room-types"; readonly handler: "create"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "get"; readonly path: "/room-types"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/room-types/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/room-types/:id"; readonly handler: "update"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "delete"; readonly path: "/room-types/:id"; readonly handler: "del"; readonly middlewares: readonly ["requireAdmin"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-permissions` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `@molecule/api-resource-property` ^1.0.0
