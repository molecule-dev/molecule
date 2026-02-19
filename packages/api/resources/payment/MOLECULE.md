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

### Functions

#### `getPeriodTime(period)`

Get the duration in milliseconds for a billing period.

```typescript
function getPeriodTime(period: PlanPeriod): number
```

- `period` — The billing period ('month' or 'year').

**Returns:** The period duration in milliseconds.

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
