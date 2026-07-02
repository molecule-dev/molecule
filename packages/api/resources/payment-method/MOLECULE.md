# @molecule/api-resource-payment-method

Saved payment-method resource for molecule.dev.

Wraps the Stripe SetupIntent flow (and any future card-style provider) into
a database-backed list of saved payment methods with a per-user default.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-payment-method'

// Mount via mlcl-generated router; service-level usage:
import {
  createSetupIntent,
  attachPaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
} from '@molecule/api-resource-payment-method'
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-payment-method
```

## API

### Interfaces

#### `AttachPaymentMethodInput`

Input body for `POST /me/payment-methods` after the SetupIntent confirms.

```typescript
interface AttachPaymentMethodInput {
  /** Provider payment-method ID returned by the frontend SDK after confirmation. */
  providerPaymentMethodId: string
  /** Optional flag — when `true`, mark this method as default after attaching. */
  setDefault?: boolean
}
```

#### `PaymentMethod`

A saved payment method as returned to API consumers.

```typescript
interface PaymentMethod {
  /** Unique identifier for the saved payment method (UUID). */
  id: string
  /** Owner of this payment method. */
  userId: string
  /** Provider that issued the payment method (`stripe`, etc.). */
  provider: PaymentMethodProvider
  /** Provider customer ID (e.g. Stripe `cus_...`). */
  providerCustomerId: string
  /** Provider payment-method ID (e.g. Stripe `pm_...`). */
  providerPaymentMethodId: string
  /** Last four digits of the card. */
  last4: string
  /** Card brand (e.g. `visa`, `mastercard`). */
  brand: string
  /** Two-digit expiry month (1–12). */
  expMonth: number
  /** Four-digit expiry year. */
  expYear: number
  /** Whether this is the user's default saved payment method. */
  isDefault: boolean
  /** ISO 8601 creation timestamp. */
  createdAt: string
}
```

#### `PaymentMethodRow`

Internal database row for a saved payment method.

```typescript
interface PaymentMethodRow {
  id: string
  userId: string
  provider: string
  providerCustomerId: string
  providerPaymentMethodId: string
  last4: string
  brand: string
  expMonth: number
  expYear: number
  isDefault: boolean
  createdAt: string
}
```

#### `SetupIntentResponse`

Result returned to the client after creating a SetupIntent.

```typescript
interface SetupIntentResponse {
  /** Provider SetupIntent ID. */
  id: string
  /** Client secret consumed by the frontend SDK to confirm the SetupIntent. */
  clientSecret: string
  /** Provider customer ID this SetupIntent is attached to. */
  customerId: string
  /** Provider that issued the SetupIntent. */
  provider: PaymentMethodProvider
}
```

### Types

#### `PaymentMethodProvider`

Supported saved-payment-method providers.

Open string type so additional rails can be added without editing this
package. Well-known values include `stripe`.

```typescript
type PaymentMethodProvider = string
```

### Functions

#### `attachPaymentMethod(userId, providerPaymentMethodId)`

Records a saved payment method after the SetupIntent confirms client-side.

Looks the payment method up via the bonded payments provider to capture
brand/last4/exp, then persists it. If the user has no other saved methods,
the new method is marked as default.

```typescript
function attachPaymentMethod(userId: string, providerPaymentMethodId: string): Promise<PaymentMethod>
```

- `userId` — The owning user.
- `providerPaymentMethodId` — The payment-method ID returned by the frontend SDK.

**Returns:** The persisted payment method.

#### `createSetupIntent(userId)`

Creates a SetupIntent for the saved-card flow.

Reuses the user's provider customer ID if one already exists; otherwise the
provider creates a new customer and the resulting ID is returned to the
client (and persisted on the next `attachPaymentMethod` call).

```typescript
function createSetupIntent(userId: string): Promise<SetupIntentResponse>
```

- `userId` — The user the SetupIntent is being created for.

**Returns:** The SetupIntent payload to forward to the frontend SDK.

#### `deletePaymentMethod(id, userId)`

Deletes a saved payment method, detaching it from the provider first.

The local row is removed even if the provider detach call fails — the
provider error is logged but does not abort the delete (orphaned records at
the provider are preferable to a method we can't remove from our own UI).

```typescript
function deletePaymentMethod(id: string, userId: string): Promise<boolean>
```

- `id` — The payment-method row to delete.
- `userId` — The user expected to own the row.

**Returns:** `true` on success, `false` if the row was not found or not owned by `userId`.

#### `getPaymentMethod(id, userId)`

Looks up a single saved payment method, enforcing ownership.

```typescript
function getPaymentMethod(id: string, userId: string): Promise<PaymentMethod | null>
```

- `id` — The payment-method row ID.
- `userId` — The user expected to own the row.

**Returns:** The payment method, or `null` if not found / not owned by `userId`.

#### `listPaymentMethods(userId)`

Lists every saved payment method for a user, newest first.

```typescript
function listPaymentMethods(userId: string): Promise<PaymentMethod[]>
```

- `userId` — The owning user.

**Returns:** The user's saved payment methods.

#### `setDefaultPaymentMethod(userId, id)`

Marks a payment method as the user's default, clearing the flag from any
other saved methods belonging to the same user.

```typescript
function setDefaultPaymentMethod(userId: string, id: string): Promise<PaymentMethod | null>
```

- `userId` — The owning user.
- `id` — The payment-method row to promote.

**Returns:** The updated default payment method, or `null` if not found / not owned.

#### `toPaymentMethod(row)`

Converts a raw database row into a typed {@link PaymentMethod}.

```typescript
function toPaymentMethod(row: PaymentMethodRow): PaymentMethod
```

- `row` — The database row.

**Returns:** The deserialized payment method.

### Constants

#### `i18nRegistered`

Whether i18n registration has been attempted. Always `true`; this module is
a placeholder for symmetry with locale-bonded resources.

```typescript
const i18nRegistered: true
```

#### `PROVIDER_NAME`

The provider name used by this resource. Currently fixed to `stripe` —
a future cross-rail rollout would dispatch on the user's selection.

```typescript
const PROVIDER_NAME: "stripe"
```

#### `requestHandlerMap`

Handler map for the payment-method resource routes.

```typescript
const requestHandlerMap: { readonly createSetupIntent: typeof createSetupIntent; readonly listPaymentMethods: typeof listPaymentMethods; readonly setDefaultPaymentMethod: typeof setDefaultPaymentMethod; readonly deletePaymentMethod: typeof deletePaymentMethod; }
```

#### `routes`

Saved payment-method routes.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/me/payment-methods/setup-intent"; readonly handler: "createSetupIntent"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/me/payment-methods"; readonly handler: "listPaymentMethods"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "put"; readonly path: "/me/payment-methods/:id/default"; readonly handler: "setDefaultPaymentMethod"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/me/payment-methods/:id"; readonly handler: "deletePaymentMethod"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `TABLE_NAME`

The database table name for saved payment methods.

```typescript
const TABLE_NAME: "payment_methods"
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Environment Variables

- `STRIPE_SECRET_KEY` *(required)* — Stripe secret key
  - Setup: Stripe Dashboard → Developers → API keys; use the sk_test_ key in test mode, sk_live_ in production.
  - Get it here: [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
  - Example: `sk_test_...`
