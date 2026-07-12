# @molecule/api-resource-payment

Payment resource with subscription plan management.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-payment
```

## API

### Types

#### `CreateProps`

Fields required when creating a new payment record.

```typescript
type CreateProps = z.infer<typeof createPropsSchema>
```

#### `Props`

Full payment record properties (userId, platform, transactionId, productId, data, receipt).

```typescript
type Props = z.infer<typeof propsSchema>
```

#### `UpdateProps`

Updatable payment record fields (data and receipt).

```typescript
type UpdateProps = z.infer<typeof updatePropsSchema>
```

### Classes

#### `PaymentRecordConflictError`

Error thrown by {@link paymentRecordService.store} when inserting a payment
record violates the `UNIQUE(platformKey, transactionId)` constraint — i.e. the
transaction is already bound to an account.

This is surfaced (not swallowed) so callers such as the user resource's
`verifyPayment` handler can enforce first-claim-wins ownership and reject a
replayed receipt instead of silently granting the plan to a second account.

### Functions

#### `getPeriodTime(period)`

Get the duration in milliseconds for a billing period.

```typescript
function getPeriodTime(period: PlanPeriod): number
```

- `period` — The billing period ('month' or 'year').

**Returns:** The period duration in milliseconds.

#### `registerPlans(customPlans)`

Registers (or replaces) plans in the shared registry consumed by
`planService` — keyed by `planKey`, merged into the defaults above.

The built-in entries carry PLACEHOLDER platform product ids
(`price_test_id` / `price_prod_id`), so `findPlanByProductId` can never
match a real platform identifier until the app registers its own catalogue
— typically derived from its pricing tiers with the real Stripe price ids
from env (`@molecule/api-bonds-default-express`'s `createBillingRouter`
does this automatically). Without registration, payment verification and
webhook plan grants fail with "unknown plan" even though the charge
succeeded.

Idempotent: re-registering the same `planKey` overwrites that entry.

```typescript
function registerPlans(customPlans: Record<string, Plan>): void
```

- `customPlans` — Plans to merge into the registry, keyed by `planKey`.

### Constants

#### `appleMonthly`

Apple App Store monthly subscription plan ($5.99/month, auto-renews).

```typescript
const appleMonthly: Plan
```

#### `appleYearly`

Apple App Store yearly subscription plan ($64.99/year, auto-renews).

```typescript
const appleYearly: Plan
```

#### `createPropsSchema`

Zod schema for creating a payment record (picks fields required at creation time).

```typescript
const createPropsSchema: z.ZodObject<{ createdAt: z.ZodString; updatedAt: z.ZodString; userId: z.ZodString; platformKey: z.ZodDefault<z.ZodEnum<{ "": ""; stripe: "stripe"; apple: "apple"; google: "google"; }>>; transactionId: z.ZodOptional<z.ZodString>; productId: z.ZodString; data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; receipt: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `googleMonthly`

Google Play monthly subscription plan ($5.99/month, auto-renews).

```typescript
const googleMonthly: Plan
```

#### `googleYearly`

Google Play yearly subscription plan ($64.99/year, auto-renews).

```typescript
const googleYearly: Plan
```

#### `i18nRegistered`

The i18n registered.

```typescript
const i18nRegistered: true
```

#### `paymentRecordService`

PaymentRecordService implementation for the bond system.

Provides payment record CRUD operations that other resources
can use through `get<PaymentRecordService>('paymentRecords')`.

```typescript
const paymentRecordService: PaymentRecordService
```

#### `plans`

All available plans indexed by planKey. The empty string key `''` maps to the default free plan.

```typescript
const plans: Record<string, Plan>
```

#### `planService`

PlanService implementation for the bond system.

Provides plan lookup operations that other resources
can use through `get('plans')` / `require('plans')`.

```typescript
const planService: PlanService
```

#### `propsSchema`

Validation schema for props.

```typescript
const propsSchema: z.ZodObject<{ id: z.ZodString; createdAt: z.ZodString; updatedAt: z.ZodString; userId: z.ZodString; platformKey: z.ZodDefault<z.ZodEnum<{ "": ""; stripe: "stripe"; apple: "apple"; google: "google"; }>>; transactionId: z.ZodOptional<z.ZodString>; productId: z.ZodString; data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>; receipt: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

#### `resource`

Payment resource definition with JSON schema for validation.

```typescript
const resource: types.Resource
```

#### `stripeMonthly`

Stripe monthly subscription plan ($5/month, auto-renews).

```typescript
const stripeMonthly: Plan
```

#### `stripeYearly`

Stripe yearly subscription plan ($55/year, auto-renews).

```typescript
const stripeYearly: Plan
```

#### `updatePropsSchema`

Zod schema for updating a payment record (data and receipt only).

```typescript
const updatePropsSchema: z.ZodObject<{ data: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>; receipt: z.ZodOptional<z.ZodOptional<z.ZodString>>; }, z.core.$strip>
```

### Namespaces

#### `types`

## Services

This package exports services that should be registered with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { planService, paymentRecordService } from '@molecule/api-resource-payment'

bond('plans', planService)
bond('paymentRecords', paymentRecordService)
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-payment` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-payments` ^1.0.0
- `@molecule/api-resource` ^1.0.0

A plan/entitlement is granted ONLY after a SERVER-VERIFIED payment — never from anything
the client reports. The flow (implemented by the user resource's `verifyPayment` handler):

1. **Verify** the provider token/receipt server-side via the bonded payments provider
   (`@molecule/api-payments` — read its docs). Trust only its normalized result.
2. **Record** it with {@link paymentRecordService}`.store`, which enforces
   `UNIQUE(platformKey, transactionId)` so one receipt binds to exactly ONE account.
3. **Resolve** the plan from the verified product/price id against the registered
   {@link plans} (match BOTH `productId` and `priceId`), then grant it.

Weak-integration mistakes to avoid:
- **Never trust a client-sent plan / subscription / "isPro".** The plan is derived from
  the verified provider result, not a request field.
- **Never swallow the duplicate-record error.** {@link paymentRecordService}`.store`
  THROWS when a `transactionId` is already claimed — that is the replay guard
  (first-claim-wins). Catch it and REJECT; do not grant the plan to a second account.
- **Register your catalogue** with {@link registerPlans} using YOUR price/product ids
  (the env-configured `price_…`), and resolve by BOTH product and price id — providers
  report the product on a subscription while checkout uses the price.
- Re-verify entitlement server-side wherever it gates access; never cache "is subscribed"
  somewhere the client can set.
