# @molecule/api-resource-address

Address resource for molecule.dev.

Per-user saved shipping/billing addresses with default flag, country-aware
fields, and validation. Drop-in replacement for the per-app `addresses`
tables currently duplicated across e-commerce flagships (food-delivery,
grocery-delivery, multi-vendor-marketplace, online-store, subscription-box).

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-address'

// Wire routes into your Express app via mlcl inject:
// POST   /addresses
// GET    /addresses
// GET    /addresses/:id
// PATCH  /addresses/:id
// POST   /addresses/:id/default     { kind: 'shipping' | 'billing' }
// DELETE /addresses/:id
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-address @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource zod
```

## API

### Interfaces

#### `Address`

A user-owned mailing address (shipping or billing).

```typescript
interface Address {
  /** Unique address identifier. */
  id: string
  /** The ID of the user who owns the address. */
  userId: string
  /** Optional human-readable label (e.g. "Home", "Work"). */
  label: string | null
  /** Recipient name printed on the package/invoice. */
  recipientName: string
  /** Street address line 1. */
  line1: string
  /** Street address line 2 (apartment, suite, unit). */
  line2: string | null
  /** City / locality. */
  city: string
  /** Region / state / province. Optional — not all countries have one. */
  region: string | null
  /** Postal / ZIP code. */
  postalCode: string
  /** ISO 3166-1 alpha-2 country code (e.g. "US", "GB"). */
  countryIso: string
  /** Optional contact phone number for delivery. */
  phone: string | null
  /** Whether this is the user's default shipping address. */
  isDefaultShipping: boolean
  /** Whether this is the user's default billing address. */
  isDefaultBilling: boolean
  /** When the address was created (ISO 8601). */
  createdAt: string
  /** When the address was last updated (ISO 8601). */
  updatedAt: string
}
```

### Types

#### `CreateAddressInput`

Input for creating an address. Server fills in `id`, `createdAt`, `updatedAt`.

```typescript
type CreateAddressInput = Omit<Address, 'id' | 'createdAt' | 'updatedAt'>
```

#### `DefaultAddressKind`

Which kind of default flag to set on an address.

```typescript
type DefaultAddressKind = 'shipping' | 'billing'
```

#### `UpdateAddressInput`

Partial update for an existing address. `id`, `userId`, and timestamps are
never updatable here.

```typescript
type UpdateAddressInput = Partial<Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
```

### Functions

#### `countAddresses(userId)`

Counts a user's addresses.

```typescript
function countAddresses(userId: string): Promise<number>
```

- `userId` — The user ID.

**Returns:** The number of saved addresses.

#### `create(req, res)`

Creates a new address for the current user.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with the address body.
- `res` — The response object.

#### `createAddress(input)`

Creates an address for a user.

If the input flags `isDefaultShipping` or `isDefaultBilling`, this also
unsets that flag on every other address belonging to the same user, so the
default invariant ("at most one default per kind per user") holds.

```typescript
function createAddress(input: CreateAddressInput): Promise<Address>
```

- `input` — The address creation input. `userId` must be set.

**Returns:** The created address.

#### `del(req, res)`

Deletes an address owned by the current user.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `id` param.
- `res` — The response object.

#### `deleteAddress(userId, addressId)`

Deletes an address, scoped to a user.

```typescript
function deleteAddress(userId: string, addressId: string): Promise<boolean>
```

- `userId` — The user that must own the address.
- `addressId` — The address ID.

**Returns:** `true` if the address was deleted, `false` if not found / not owned.

#### `getAddress(userId, addressId)`

Loads a single address by ID, scoped to a user.

```typescript
function getAddress(userId: string, addressId: string): Promise<Address | null>
```

- `userId` — The user that must own the address.
- `addressId` — The address ID.

**Returns:** The address, or `null` if not found / not owned by the user.

#### `getDefaultAddress(userId, kind)`

Gets the user's current default address for a given kind, if any.

```typescript
function getDefaultAddress(userId: string, kind: DefaultAddressKind): Promise<Address | null>
```

- `userId` — The user ID.
- `kind` — Which default to look up.

**Returns:** The default address, or `null` if none is set.

#### `list(_req, res)`

Lists all addresses owned by the current user.

```typescript
function list(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request (unused).
- `res` — The response object.

#### `listAddresses(userId)`

Lists all addresses owned by a user, defaults first, then most recent.

```typescript
function listAddresses(userId: string): Promise<Address[]>
```

- `userId` — The user ID.

**Returns:** The user's addresses.

#### `read(req, res)`

Reads a single address owned by the current user.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `id` param.
- `res` — The response object.

#### `setAsDefault(req, res)`

Sets an address as the user's default for either shipping or billing.

```typescript
function setAsDefault(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `id` param and `kind` body field.
- `res` — The response object.

#### `setDefault(userId, addressId, kind)`

Sets the given address as the user's default for the given kind, clearing
the same flag on every other address owned by the user.

```typescript
function setDefault(userId: string, addressId: string, kind: DefaultAddressKind): Promise<boolean>
```

- `userId` — The user that must own the address.
- `addressId` — The address ID to flag as default.
- `kind` — Which default to set (`'shipping'` or `'billing'`).

**Returns:** `true` if the flag was set, `false` if the address was not found.

#### `update(req, res)`

Updates an address owned by the current user.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `id` param and patch body.
- `res` — The response object.

#### `updateAddress(userId, addressId, patch)`

Updates an address, scoped to a user.

Toggling `isDefaultShipping` or `isDefaultBilling` to `true` will also clear
the matching flag on the user's other addresses.

```typescript
function updateAddress(userId: string, addressId: string, patch: Partial<Omit<Address, "id" | "createdAt" | "updatedAt" | "userId">>): Promise<Address | null>
```

- `userId` — The user that must own the address.
- `addressId` — The address ID.
- `patch` — Fields to change.

**Returns:** The updated address, or `null` if not found / not owned by the user.

### Constants

#### `createAddressSchema`

Schema for validating address creation input.

```typescript
const createAddressSchema: z.ZodObject<{ label: z.ZodOptional<z.ZodString>; recipientName: z.ZodString; line1: z.ZodString; line2: z.ZodOptional<z.ZodString>; city: z.ZodString; region: z.ZodOptional<z.ZodString>; postalCode: z.ZodString; countryIso: z.ZodString; phone: z.ZodOptional<z.ZodString>; isDefaultShipping: z.ZodOptional<z.ZodBoolean>; isDefaultBilling: z.ZodOptional<z.ZodBoolean>; }, z.core.$strip>
```

#### `requestHandlerMap`

Handler map for address routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly update: typeof update; readonly setAsDefault: typeof setAsDefault; readonly del: typeof del; }
```

#### `routes`

Routes for address CRUD plus a dedicated `setDefault` endpoint that toggles
the per-user default-shipping or default-billing flag atomically.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/addresses"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/addresses"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/addresses/:id"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "patch"; readonly path: "/addresses/:id"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/addresses/:id/default"; readonly handler: "setAsDefault"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/addresses/:id"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `setDefaultAddressSchema`

Schema for validating the `setDefault` request body.

```typescript
const setDefaultAddressSchema: z.ZodObject<{ kind: z.ZodEnum<{ shipping: "shipping"; billing: "billing"; }>; }, z.core.$strip>
```

#### `updateAddressSchema`

Schema for validating address update input. All fields are optional.

```typescript
const updateAddressSchema: z.ZodObject<{ label: z.ZodOptional<z.ZodOptional<z.ZodString>>; recipientName: z.ZodOptional<z.ZodString>; line1: z.ZodOptional<z.ZodString>; line2: z.ZodOptional<z.ZodOptional<z.ZodString>>; city: z.ZodOptional<z.ZodString>; region: z.ZodOptional<z.ZodOptional<z.ZodString>>; postalCode: z.ZodOptional<z.ZodString>; countryIso: z.ZodOptional<z.ZodString>; phone: z.ZodOptional<z.ZodOptional<z.ZodString>>; isDefaultShipping: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>; isDefaultBilling: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-resource`
- `zod`

- **Migration required.** `src/__setup__/addresses.sql` ships with this package
  and must exist in the target database before use (scaffolded apps apply it
  automatically; existing apps must apply it first).
- **Owner-scoped via the session.** All routes require `authenticate` and the
  service filters every read/write by the session `userId` — never accept a
  `userId` from the client and never look an address up by `:id` alone (IDOR).
- **Default flags are per-kind and exclusive.** Creating/updating with
  `isDefaultShipping`/`isDefaultBilling`, or `POST /addresses/:id/default`
  with `{ kind: 'shipping' | 'billing' }`, atomically clears the previous
  default of that kind for the user — don't hand-roll default toggling.
- Validation is shape-level and country-aware, not postal verification — treat
  address correctness as user-owned data; deliverability checks (if needed)
  are your app's concern at checkout time.
