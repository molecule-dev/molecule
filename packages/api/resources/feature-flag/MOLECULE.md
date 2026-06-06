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
npm install @molecule/api-resource-feature-flag
```

## API

### Interfaces

#### `FeatureFlagRow`

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

```typescript
type FlagState = 'on' | 'off' | 'killed' | 'scheduled'
```

#### `FlagType`

Feature-flag domain types.

```typescript
type FlagType = 'boolean' | 'multivariate' | 'string' | 'number'
```

### Functions

#### `addRuleToFlag(flagId, userId, data)`

```typescript
function addRuleToFlag(flagId: string, userId: string, data: { attribute: string; operator: string; value?: unknown; serve_value?: unknown; priority?: number; description?: string; }): Promise<FeatureFlagTargetingRuleRow | null>
```

#### `createFeatureFlagRouter()`

```typescript
function createFeatureFlagRouter(): Router
```

#### `createFlagForUser(userId, data)`

```typescript
function createFlagForUser(userId: string, data: { project_id?: string; key: string; name: string; description?: string; flag_type?: FlagType; default_value?: unknown; rollout_percentage?: number; is_enabled?: boolean; environment?: string; stale_days?: number; }): Promise<FeatureFlagRow>
```

#### `deleteFlagForUser(flagId, userId)`

```typescript
function deleteFlagForUser(flagId: string, userId: string): Promise<boolean>
```

#### `deleteRule(ruleId, flagId, userId)`

```typescript
function deleteRule(ruleId: string, flagId: string, userId: string): Promise<boolean>
```

#### `getFlagForUser(flagId, userId)`

```typescript
function getFlagForUser(flagId: string, userId: string): Promise<FeatureFlagRow | null>
```

#### `listFlagsForUser(userId, opts?)`

```typescript
function listFlagsForUser(userId: string, opts?: { page?: number; limit?: number; project_id?: string; environment?: string; state?: FlagState; }): Promise<{ data: FeatureFlagRow[]; total: number; page: number; limit: number; }>
```

#### `listRulesForFlag(flagId, userId)`

```typescript
function listRulesForFlag(flagId: string, userId: string): Promise<FeatureFlagTargetingRuleRow[] | null>
```

#### `updateFlagForUser(flagId, userId, patch)`

```typescript
function updateFlagForUser(flagId: string, userId: string, patch: Partial<{ name: string; description: string; default_value: unknown; rollout_percentage: number; is_enabled: boolean; state: FlagState; environment: string; stale_days: number; }>): Promise<FeatureFlagRow | null>
```

### Constants

#### `FLAG_STATES`

```typescript
const FLAG_STATES: readonly ["on", "off", "killed", "scheduled"]
```

#### `FLAG_TYPES`

```typescript
const FLAG_TYPES: readonly ["boolean", "multivariate", "string", "number"]
```

#### `flagCreateSchema`

```typescript
const flagCreateSchema: z.ZodObject<{ project_id: z.ZodOptional<z.ZodString>; key: z.ZodString; name: z.ZodString; description: z.ZodOptional<z.ZodString>; flag_type: z.ZodOptional<z.ZodEnum<{ string: "string"; number: "number"; boolean: "boolean"; multivariate: "multivariate"; }>>; default_value: z.ZodOptional<z.ZodUnknown>; rollout_percentage: z.ZodOptional<z.ZodNumber>; is_enabled: z.ZodOptional<z.ZodBoolean>; environment: z.ZodOptional<z.ZodString>; stale_days: z.ZodOptional<z.ZodNumber>; }, z.core.$strip>
```

#### `flagListQuerySchema`

```typescript
const flagListQuerySchema: z.ZodObject<{ page: z.ZodDefault<z.ZodCoercedNumber<unknown>>; limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>; project_id: z.ZodOptional<z.ZodString>; environment: z.ZodOptional<z.ZodString>; state: z.ZodOptional<z.ZodEnum<{ on: "on"; off: "off"; killed: "killed"; scheduled: "scheduled"; }>>; }, z.core.$strip>
```

#### `flagUpdateSchema`

```typescript
const flagUpdateSchema: z.ZodObject<{ name: z.ZodOptional<z.ZodString>; description: z.ZodOptional<z.ZodString>; default_value: z.ZodOptional<z.ZodUnknown>; rollout_percentage: z.ZodOptional<z.ZodNumber>; is_enabled: z.ZodOptional<z.ZodBoolean>; state: z.ZodOptional<z.ZodEnum<{ on: "on"; off: "off"; killed: "killed"; scheduled: "scheduled"; }>>; environment: z.ZodOptional<z.ZodString>; stale_days: z.ZodOptional<z.ZodNumber>; }, z.core.$strip>
```

#### `ruleSchema`

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

Run `src/__setup__/feature_flags.sql` once to create the
`feature_flags` + `feature_flag_targeting_rules` tables.
