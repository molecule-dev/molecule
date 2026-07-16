# @molecule/api-resource-property

Property resource for molecule.dev.

Provides CRUD handlers for properties (apartments, houses, hotels) with soft-delete,
pagination, status / type / city filtering, and units, photos, and amenities sub-resources.
All user-facing text is i18n-ready via the companion `@molecule/api-locales-property` bond.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-property'
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-property @molecule/api-database @molecule/api-i18n @molecule/api-locales-property @molecule/api-logger @molecule/api-resource
```

## API

### Interfaces

#### `CreateAmenityInput`

Input for creating a property amenity.

```typescript
interface CreateAmenityInput {
  /** Machine-readable amenity code. */
  code: string
  /** Human-readable amenity label. */
  label: string
}
```

#### `CreatePhotoInput`

Input for creating a property photo.

```typescript
interface CreatePhotoInput {
  /** URL of the photo. */
  url: string
  /** Optional caption. */
  caption?: string | null
  /** Optional ordering position. Defaults to 0. */
  position?: number
}
```

#### `CreatePropertyInput`

Input for creating a new property.

```typescript
interface CreatePropertyInput {
  /** Display name. */
  name: string
  /** Optional description. */
  description?: string | null
  /** Property type. Defaults to 'apartment'. */
  type?: PropertyType
  /** Property status. Defaults to 'draft'. */
  status?: PropertyStatus
  /** Street address line 1. */
  addressLine1: string
  /** Optional street address line 2. */
  addressLine2?: string | null
  /** City. */
  city: string
  /** Optional region / state / province. */
  region?: string | null
  /** Optional postal / ZIP code. */
  postalCode?: string | null
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string
  /** Optional latitude. */
  latitude?: number | null
  /** Optional longitude. */
  longitude?: number | null
  /** Optional cover image URL. */
  coverImageUrl?: string | null
}
```

#### `CreateUnitInput`

Input for creating a property unit.

```typescript
interface CreateUnitInput {
  /** Unit name or number. */
  name: string
  /** Optional description. */
  description?: string | null
  /** Optional floor number. */
  floor?: number | null
  /** Optional bedroom count. */
  bedrooms?: number | null
  /** Optional bathroom count. */
  bathrooms?: number | null
  /** Optional maximum occupancy. */
  maxOccupancy?: number | null
  /** Optional floor area in square metres. */
  areaSquareMetres?: number | null
  /** Optional availability flag. Defaults to true. */
  isAvailable?: boolean
}
```

#### `Property`

A property record (apartment building, house, hotel, etc.).

```typescript
interface Property {
  /** Unique identifier. */
  id: string
  /** ID of the user who owns this property. Null for legacy rows created before ownership tracking. */
  ownerId: string | null
  /** Display name. */
  name: string
  /** URL-friendly slug derived from name. */
  slug: string
  /** Optional long-form description. */
  description: string | null
  /** Property type. */
  type: PropertyType
  /** Property status controlling visibility. */
  status: PropertyStatus
  /** Street address line 1. */
  addressLine1: string
  /** Optional street address line 2. */
  addressLine2: string | null
  /** City. */
  city: string
  /** Region / state / province. */
  region: string | null
  /** Postal / ZIP code. */
  postalCode: string | null
  /** ISO 3166-1 alpha-2 country code. */
  countryCode: string
  /** Optional latitude in decimal degrees. */
  latitude: number | null
  /** Optional longitude in decimal degrees. */
  longitude: number | null
  /** Total number of units in this property. */
  unitCount: number
  /** Optional URL to the primary cover photo. */
  coverImageUrl: string | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
  /** ISO 8601 soft-delete timestamp, or null if active. */
  deletedAt: string | null
}
```

#### `PropertyAmenity`

An amenity offered by a property (pool, gym, parking, etc.).

```typescript
interface PropertyAmenity {
  /** Unique identifier. */
  id: string
  /** Foreign key to the parent property. */
  propertyId: string
  /** Machine-readable amenity code (e.g. 'pool', 'gym', 'parking'). */
  code: string
  /** Human-readable amenity label (locale-overridable in clients). */
  label: string
  /** ISO 8601 creation timestamp. */
  createdAt: string
}
```

#### `PropertyPhoto`

A photo attached to a property.

```typescript
interface PropertyPhoto {
  /** Unique identifier. */
  id: string
  /** Foreign key to the parent property. */
  propertyId: string
  /** URL of the photo. */
  url: string
  /** Optional caption. */
  caption: string | null
  /** Display ordering index (lower numbers appear first). */
  position: number
  /** ISO 8601 creation timestamp. */
  createdAt: string
}
```

#### `PropertyUnit`

A unit (room, apartment, suite) within a property.

```typescript
interface PropertyUnit {
  /** Unique identifier. */
  id: string
  /** Foreign key to the parent property. */
  propertyId: string
  /** Unit name or number (e.g. '101', 'Suite 4B'). */
  name: string
  /** Optional description. */
  description: string | null
  /** Floor number, or null if not applicable. */
  floor: number | null
  /** Number of bedrooms, or null if not applicable. */
  bedrooms: number | null
  /** Number of bathrooms, or null if not applicable. */
  bathrooms: number | null
  /** Maximum occupancy, or null if untracked. */
  maxOccupancy: number | null
  /** Floor area in square metres, or null if untracked. */
  areaSquareMetres: number | null
  /** Whether this unit is currently available. */
  isAvailable: boolean
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
}
```

### Types

#### `PropertyStatus`

Property status indicating availability and visibility.

```typescript
type PropertyStatus = 'draft' | 'active' | 'inactive' | 'archived'
```

#### `PropertyType`

Property type categorising the kind of real estate.

```typescript
type PropertyType =
  | 'apartment'
  | 'house'
  | 'condo'
  | 'townhouse'
  | 'hotel'
  | 'commercial'
  | 'land'
  | 'other'
```

#### `UpdatePropertyInput`

Input for updating an existing property.

```typescript
type UpdatePropertyInput = Partial<CreatePropertyInput>
```

### Functions

#### `create(req, res)`

Creates a new property with a unique slug derived from the name.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The incoming request with {@link CreatePropertyInput} body.
- `res` — The response object.

#### `createAmenity(req, res)`

Creates an amenity for a given property. Amenity codes are unique per property.

```typescript
function createAmenity(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param (property ID) and {@link CreateAmenityInput} body.
- `res` — The response object.

#### `createPhoto(req, res)`

Creates a photo for a given property.

```typescript
function createPhoto(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param (property ID) and {@link CreatePhotoInput} body.
- `res` — The response object.

#### `createUnit(req, res)`

Creates a unit for a given property and updates the property's unitCount.

```typescript
function createUnit(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param (property ID) and {@link CreateUnitInput} body.
- `res` — The response object.

#### `del(req, res)`

Soft-deletes a property by setting its `deletedAt` timestamp.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

#### `list(req, res)`

Lists properties with pagination and optional status / type / city filters.
Excludes soft-deleted properties.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with optional `page`, `perPage`, `status`, `type`, `city` query params.
- `res` — The response object.

#### `listAmenities(req, res)`

Lists all amenities for a given property.

```typescript
function listAmenities(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param (property ID).
- `res` — The response object.

#### `listPhotos(req, res)`

Lists all photos for a given property, ordered by position then creation time.

```typescript
function listPhotos(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param (property ID).
- `res` — The response object.

#### `listUnits(req, res)`

Lists all units for a given property.

```typescript
function listUnits(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param (property ID).
- `res` — The response object.

#### `read(req, res)`

Reads a single property by ID. Returns 404 if not found or soft-deleted.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

#### `update(req, res)`

Updates a property by ID. Only provided fields are modified.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param and {@link UpdatePropertyInput} body.
- `res` — The response object.

### Constants

#### `i18nRegistered`

Whether i18n registration has completed.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Handler map keyed by route handler name.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly createAmenity: typeof createAmenity; readonly createPhoto: typeof createPhoto; readonly createUnit: typeof createUnit; readonly del: typeof del; readonly list: typeof list; readonly listAmenities: typeof listAmenities; readonly listPhotos: typeof listPhotos; readonly listUnits: typeof listUnits; readonly read: typeof read; readonly update: typeof update; }
```

#### `routes`

Route array for property CRUD plus units, photos, and amenities sub-resources.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/properties"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/properties"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/properties/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/properties/:id"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/properties/:id"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/properties/:id/units"; readonly handler: "listUnits"; }, { readonly method: "post"; readonly path: "/properties/:id/units"; readonly handler: "createUnit"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/properties/:id/photos"; readonly handler: "listPhotos"; }, { readonly method: "post"; readonly path: "/properties/:id/photos"; readonly handler: "createPhoto"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/properties/:id/amenities"; readonly handler: "listAmenities"; }, { readonly method: "post"; readonly path: "/properties/:id/amenities"; readonly handler: "createAmenity"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-property` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-property`
- `@molecule/api-logger`
- `@molecule/api-resource`

Tables: `src/__setup__/properties.sql` creates `properties`,
`property_units`, `property_photos`, and `property_amenities`. An
mlcl-scaffolded API replays `__setup__/*.sql` automatically on migrate;
anywhere else run it once.

Listing-site visibility semantics: `list`/`read` (and the units/photos/
amenities reads) are PUBLIC for `active` properties; a non-active
(draft/inactive/archived) or soft-deleted property 404s for everyone but
its owner — 404, not 403, so its existence isn't leaked. If your app's
inventory is private, gate the read routes yourself.

Writes are OWNER-scoped and fail closed: `create` reads the caller from
`res.locals.session` (401 without one; mount behind your global auth
middleware) and stamps `ownerId` from it — never accept an ownerId from the
request body. `update`/`del` and sub-resource writes reject any caller
whose session userId ≠ `ownerId`; legacy rows with `ownerId: null` are
immutable through the API.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Creating a listing persists its real fields — `name`, `type`
  (apartment/house/condo/townhouse/hotel/commercial/land), and full address
  (`addressLine1`, `city`, `region`, `postalCode`, `countryCode`) — and the
  saved listing shows them back on its detail page; a property's units carry
  their specs (`bedrooms`, `bathrooms`, `areaSquareMetres`, `maxOccupancy`)
  and those render as real numbers, not placeholders. (There is no price
  field on this resource — don't invent one; if the app charges rent, model
  it explicitly and render its own currency/amount, never a stub.)
- [ ] A new listing defaults to `draft` and does NOT show in the public
  listings until its `status` is set to `active`; publish it and it appears,
  then flip it back to draft/inactive/archived and it disappears from the
  public list AND 404s by id for a signed-out visitor (existence not leaked).
- [ ] Search/filter narrows to the query, not everything: a `type`, `city`,
  or `status` filter (the real `list` params) returns ONLY matching `active`
  listings — confirm a non-matching listing is absent and a matching one is
  present, so results reflect the filter rather than the whole catalog.
- [ ] Photos render from the app's own uploads (`coverImageUrl` plus a
  property's `property_photos`), served by this app's storage — not a
  hotlinked external URL that can break; a listing with no photo shows a real
  placeholder, not a broken-image icon.
- [ ] Authorization: a signed-out visitor can browse and read `active`
  listings, but create/edit/delete require a session (401 without one) and
  only the LISTING OWNER may mutate their own row — a non-owner's edit or
  delete is refused (403), and `ownerId` is stamped from the session, never
  accepted from the request body. No draft/inactive/archived listing leaks to
  a non-owner by id.
