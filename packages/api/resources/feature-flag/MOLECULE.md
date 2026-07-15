# @molecule/api-resource-feature-flag

`@molecule/api-resource-feature-flag` — feature-flag CRUD + targeting
rules + environment-scoped rollout state.

Extracted from the feature-flag-manager flagship. Flags carry a
`key` (e.g. `new-checkout-flow`), a `flag_type` (boolean / multivariate
/ string / number), an `is_enabled` master switch, a `rollout_percentage`
(0-100), and a `state` (on / off / killed / scheduled). Targeting rules
attach to a flag and are evaluated in `priority` order.

## Quick Start

```ts
import { createFeatureFlagRouter } from '@molecule/api-resource-feature-flag'
app.use('/flags', createFeatureFlagRouter())
```

```ts
import { listFlagsForUser, createFlagForUser } from '@molecule/api-resource-feature-flag'

const flag = await createFlagForUser(userId, {
  key: 'new-checkout-flow',
  name: 'New checkout flow',
  flag_type: 'boolean',
  rollout_percentage: 5,
})
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-feature-flag @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `FeatureFlagRow`

Database row shape for a feature flag definition.

```typescript
interface FeatureFlagRow {
  id: string
  user_id: string
  project_id: string | null
  key: string
  name: string
  description: string | null
  flag_type: FlagType
  default_value: unknown
  rollout_percentage: number
  is_enabled: boolean
  state: FlagState
  environment: string
  stale_days: number
  created_at: string | Date
  updated_at: string | Date
}
```

#### `FeatureFlagTargetingRuleRow`

Database row shape for a targeting rule that overrides a flag's value for matching users.

```typescript
interface FeatureFlagTargetingRuleRow {
  id: string
  flag_id: string
  attribute: string
  operator: string
  value: unknown
  serve_value: unknown
  priority: number
  description: string | null
  created_at: string | Date
}
```

### Types

#### `FlagState`

Lifecycle state of a feature flag (active, disabled, killed, or time-gated).

```typescript
type FlagState = 'on' | 'off' | 'killed' | 'scheduled'
```

#### `FlagType`

Discriminates the value type carried by a feature flag.

```typescript
type FlagType = 'boolean' | 'multivariate' | 'string' | 'number'
```

### Functions

#### `addRuleToFlag(flagId, userId, data)`

Appends a new targeting rule to a flag owned by the user and returns the persisted rule row.

```typescript
function addRuleToFlag(flagId: string, userId: string, data: { attribute: string; operator: string; value?: unknown; serve_value?: unknown; priority?: number; description?: string; }): Promise<FeatureFlagTargetingRuleRow | null>
```

#### `createFeatureFlagRouter()`

Creates and returns an Express Router with all feature-flag and targeting-rule endpoints.

```typescript
function createFeatureFlagRouter(): Router
```

#### `createFlagForUser(userId, data)`

Creates a new feature flag owned by the given user and returns the persisted row.

```typescript
function createFlagForUser(userId: string, data: { project_id?: string; key: string; name: string; description?: string; flag_type?: FlagType; default_value?: unknown; rollout_percentage?: number; is_enabled?: boolean; environment?: string; stale_days?: number; }): Promise<FeatureFlagRow>
```

#### `deleteFlagForUser(flagId, userId)`

Deletes a feature flag owned by the user, returning true on success or false if not found.

```typescript
function deleteFlagForUser(flagId: string, userId: string): Promise<boolean>
```

#### `deleteRule(ruleId, flagId, userId)`

Deletes a targeting rule from a flag owned by the user, returning true on success or false if not found.

```typescript
function deleteRule(ruleId: string, flagId: string, userId: string): Promise<boolean>
```

#### `getFlagForUser(flagId, userId)`

Fetches a single feature flag by ID, returning null if it does not exist or is not owned by the user.

```typescript
function getFlagForUser(flagId: string, userId: string): Promise<FeatureFlagRow | null>
```

#### `listFlagsForUser(userId, opts?)`

Returns a paginated list of feature flags owned by the given user, with optional project/environment/state filters.

```typescript
function listFlagsForUser(userId: string, opts?: { page?: number; limit?: number; project_id?: string; environment?: string; state?: FlagState; }): Promise<{ data: FeatureFlagRow[]; total: number; page: number; limit: number; }>
```

#### `listRulesForFlag(flagId, userId)`

Returns all targeting rules for a flag in priority order, or null if the flag is not found or not owned by the user.

```typescript
function listRulesForFlag(flagId: string, userId: string): Promise<FeatureFlagTargetingRuleRow[] | null>
```

#### `updateFlagForUser(flagId, userId, patch)`

Applies a partial patch to a feature flag owned by the user and returns the updated row, or null if not found.

```typescript
function updateFlagForUser(flagId: string, userId: string, patch: Partial<{ name: string; description: string; default_value: unknown; rollout_percentage: number; is_enabled: boolean; state: FlagState; environment: string; stale_days: number; }>): Promise<FeatureFlagRow | null>
```

### Constants

#### `FLAG_STATES`

Allowed lifecycle states for a feature flag.

```typescript
const FLAG_STATES: readonly ["on", "off", "killed", "scheduled"]
```

#### `FLAG_TYPES`

Allowed value types for a feature flag.

```typescript
const FLAG_TYPES: readonly ["boolean", "multivariate", "string", "number"]
```

#### `flagCreateSchema`

Zod schema for validating a feature flag creation payload.

```typescript
const flagCreateSchema: z.ZodObject<{ project_id: z.ZodOptional<z.ZodString>; key: z.ZodString; name: z.ZodString; description: z.ZodOptional<z.ZodString>; flag_type: z.ZodOptional<z.ZodEnum<{ string: "string"; number: "number"; boolean: "boolean"; multivariate: "multivariate"; }>>; default_value: z.ZodOptional<z.ZodUnknown>; rollout_percentage: z.ZodOptional<z.ZodNumber>; is_enabled: z.ZodOptional<z.ZodBoolean>; environment: z.ZodOptional<z.ZodString>; stale_days: z.ZodOptional<z.ZodNumber>; }, z.core.$strip>
```

#### `flagListQuerySchema`

Zod schema for validating feature flag list query parameters.

```typescript
const flagListQuerySchema: z.ZodObject<{ page: z.ZodDefault<z.ZodCoercedNumber<unknown>>; limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>; project_id: z.ZodOptional<z.ZodString>; environment: z.ZodOptional<z.ZodString>; state: z.ZodOptional<z.ZodEnum<{ on: "on"; off: "off"; killed: "killed"; scheduled: "scheduled"; }>>; }, z.core.$strip>
```

#### `flagUpdateSchema`

Zod schema for validating a feature flag update payload.

```typescript
const flagUpdateSchema: z.ZodObject<{ name: z.ZodOptional<z.ZodString>; description: z.ZodOptional<z.ZodString>; default_value: z.ZodOptional<z.ZodUnknown>; rollout_percentage: z.ZodOptional<z.ZodNumber>; is_enabled: z.ZodOptional<z.ZodBoolean>; state: z.ZodOptional<z.ZodEnum<{ on: "on"; off: "off"; killed: "killed"; scheduled: "scheduled"; }>>; environment: z.ZodOptional<z.ZodString>; stale_days: z.ZodOptional<z.ZodNumber>; }, z.core.$strip>
```

#### `ruleSchema`

Zod schema for validating a targeting rule on a feature flag.

```typescript
const ruleSchema: z.ZodObject<{ attribute: z.ZodString; operator: z.ZodString; value: z.ZodOptional<z.ZodUnknown>; serve_value: z.ZodOptional<z.ZodUnknown>; priority: z.ZodOptional<z.ZodNumber>; description: z.ZodOptional<z.ZodString>; }, z.core.$strip>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0

### Runtime Dependencies

- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

Run `src/__setup__/feature_flags.sql` once to create the
`feature_flags` + `feature_flag_targeting_rules` tables.
