# @molecule/api-resource-payment

Payment resource with subscription plan management.

## Quick Start

```ts
import { registerPlans, stripeMonthly, stripeYearly } from '@molecule/api-resource-payment'

// Register your plan catalogue at startup. The keys are YOUR plan ids; the ready-made
// Plan objects carry the env-configured Stripe price/product ids (also register the
// apple and google plan exports when you support those providers):
registerPlans({ monthly: stripeMonthly, yearly: stripeYearly })

// Then grant a plan ONLY after a SERVER-VERIFIED payment — never from a client field.
// The full verify → record (replay-guarded) → resolve → grant flow lives in the scaffolded
// user `verifyPayment` handler; verify receipts against @molecule/api-payments and store
// them with `paymentRecordService.store` (it THROWS on a replayed transactionId — reject).
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-payment @molecule/api-bond @molecule/api-database @molecule/api-i18n @molecule/api-locales-payment @molecule/api-logger @molecule/api-payments @molecule/api-resource zod
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

Members:

- `types.PlatformKey` — type: Every available platform.
- `types.PlanAlias` — type: Every available plan alias.
- `types.PlanPeriod` — type: Every available plan period.
- `types.Props` — interface: The payment's properties.
- `types.CreateProps` — type: Properties when creating a payment.
- `types.UpdateProps` — type: Properties when updating a payment.
- `types.Plan` — interface: A plan's properties.
- `types.Resource` — interface: Resource type.

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

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-payment`
- `@molecule/api-logger`
- `@molecule/api-payments`
- `@molecule/api-resource`
- `zod`

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

The `payments` table ships in `setup/payments.sql` — an mlcl-scaffolded API
copies and replays it automatically on migrate; anywhere else run it once.
Missing it surfaces as `relation "payments" does not exist` on the first
billing call — nothing at runtime creates the table.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual billing screens/flows, and check every box
off one by one. A box you can't check is an integration bug to fix — not a
skip. This resource RECORDS a server-verified provider result (a receipt or
subscription id verified via `@molecule/api-payments`) and resolves the plan
— it does NOT charge cards and has no amount/status column, so drive the
provider's real verify path; never fabricate a record or a status:
- [ ] A completed purchase/subscribe flow reflects in the account: the paid
  tier's capabilities unlock and a payment record binds to THIS user with the
  right platformKey (stripe/apple/google), productId/priceId, and
  transactionId — and it appears in the user's own billing/subscription view.
- [ ] The plan and price shown match what was actually purchased: the tier is
  resolved from the VERIFIED product/price id against the registered plans,
  and any amount/currency shown comes from that plan (its `price`) or the
  provider's verified `data` — never a client-sent field. An amount renders
  formatted with its currency, not as a raw smallest-unit integer.
- [ ] Status follows the provider, not the client: a verified payment grants
  the plan (pending is granted only once it succeeds), and a provider
  cancellation/refund/expiry webhook (`handlePaymentNotification`) REVOKES it
  so the user loses premium. No request field (`planKey`, `isPro`, a bare
  `subscriptionId`) lets the client set or keep an active/paid status.
- [ ] Replay and re-complete guard: one receipt/subscription transaction
  binds to exactly ONE account (UNIQUE(platformKey, transactionId),
  first-claim-wins) — replaying the same receipt into a second account is
  REJECTED, re-verifying your own is idempotent (no double grant), and a
  refunded/canceled entitlement can't be reclaimed without a NEW verified
  payment.
- [ ] Authorization — a user sees only THEIR OWN payments: guessing another
  user's payment/transaction id returns nothing (records scope by userId), and
  NO endpoint lets a user mark their own payment succeeded/refunded or set
  their own plan/isPro to spoof having paid — only the verified provider
  result grants the tier.
- [ ] The provider secret (e.g. STRIPE_SECRET_KEY / APPLE_SHARED_SECRET /
  GOOGLE_API_SERVICE_KEY_OBJECT) is used only server-side for verification and
  never reaches the browser bundle or a client request — this resource is
  SERVER-ONLY.
