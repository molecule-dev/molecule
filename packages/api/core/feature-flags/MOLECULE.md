# @molecule/api-feature-flags

Feature flags core interface for molecule.dev.

Provides the `FeatureFlagProvider` interface for feature flag management
including flag evaluation, CRUD operations, rule-based targeting, and
percentage rollouts. Bond a concrete provider
(e.g. `@molecule/api-feature-flags-database`) at startup via `setProvider()`.

## Type
`core`

## Installation
```bash
npm install @molecule/api-feature-flags
```

## Usage

```typescript
import { setProvider, isEnabled, setFlag, evaluateForUser } from '@molecule/api-feature-flags'
import { provider } from '@molecule/api-feature-flags-database'

// Wire the provider at startup
setProvider(provider)

// Create a feature flag with percentage rollout
await setFlag({ name: 'new-dashboard', enabled: true, percentage: 50 })

// Check if a flag is enabled for a user
const enabled = await isEnabled('new-dashboard', { userId: 'user-123' })

// Evaluate all flags for a user
const flags = await evaluateForUser('user-123')
```

## API

### Interfaces

#### `FeatureFlag`

A feature flag definition.

```typescript
interface FeatureFlag {
  /** The unique flag name/key. */
  name: string

  /** Whether the flag is globally enabled. */
  enabled: boolean

  /** Human-readable description of the flag's purpose. */
  description?: string

  /** Targeting rules. When present, the flag is enabled only if all rules match. */
  rules?: FlagRule[]

  /** Percentage rollout (0–100). When set, only the given percentage of users see the flag. */
  percentage?: number

  /** When the flag was created. */
  createdAt: Date

  /** When the flag was last updated. */
  updatedAt: Date
}
```

#### `FeatureFlagProvider`

Feature flag provider interface.

All feature flag providers must implement this interface to provide
flag evaluation, CRUD operations, rule-based targeting, and
percentage rollouts.

```typescript
interface FeatureFlagProvider {
  /**
   * Checks whether a flag is enabled for the given context.
   * Evaluates targeting rules and percentage rollouts.
   *
   * @param flag - The flag name/key to check.
   * @param context - Optional evaluation context with user and attributes.
   * @returns `true` if the flag is enabled for the given context.
   */
  isEnabled(flag: string, context?: FlagContext): Promise<boolean>

  /**
   * Retrieves a flag definition by name.
   *
   * @param flag - The flag name/key.
   * @returns The flag definition, or `null` if not found.
   */
  getFlag(flag: string): Promise<FeatureFlag | null>

  /**
   * Creates or updates a feature flag.
   *
   * @param flag - The flag data to create or update.
   * @returns The created or updated flag definition.
   */
  setFlag(flag: FeatureFlagUpdate): Promise<FeatureFlag>

  /**
   * Retrieves all feature flags.
   *
   * @returns Array of all flag definitions.
   */
  getAllFlags(): Promise<FeatureFlag[]>

  /**
   * Deletes a feature flag.
   *
   * @param flag - The flag name/key to delete.
   */
  deleteFlag(flag: string): Promise<void>

  /**
   * Evaluates multiple flags for a specific user. Returns a map of
   * flag names to their enabled state.
   *
   * @param userId - The user identifier.
   * @param flags - Optional list of flag names to evaluate. If omitted, evaluates all flags.
   * @returns A record mapping flag names to their enabled state.
   */
  evaluateForUser(userId: string, flags?: string[]): Promise<Record<string, boolean>>
}
```

#### `FeatureFlagUpdate`

Payload for creating or updating a feature flag.

```typescript
interface FeatureFlagUpdate {
  /** The unique flag name/key. */
  name: string

  /** Whether the flag is globally enabled. */
  enabled: boolean

  /** Human-readable description of the flag's purpose. */
  description?: string

  /** Targeting rules. */
  rules?: FlagRule[]

  /** Percentage rollout (0–100). */
  percentage?: number
}
```

#### `FlagContext`

Evaluation context for feature flag checks. Provides user identity
and arbitrary attributes for rule-based targeting.

```typescript
interface FlagContext {
  /** The user identifier for user-specific targeting. */
  userId?: string

  /** Arbitrary attributes for rule evaluation. */
  attributes?: Record<string, unknown>
}
```

#### `FlagRule`

A targeting rule for a feature flag. Rules are evaluated against
the provided context to determine if a flag is enabled for a
specific user or request.

```typescript
interface FlagRule {
  /** The context attribute to evaluate (e.g. 'plan', 'country'). */
  attribute: string

  /** The comparison operator. */
  operator: FlagOperator

  /** The value to compare against. */
  value: unknown
}
```

### Types

#### `FlagOperator`

Comparison operators for flag targeting rules.

```typescript
type FlagOperator = 'eq' | 'neq' | 'in' | 'notIn' | 'gt' | 'lt'
```

### Functions

#### `deleteFlag(flag)`

Deletes a feature flag using the bonded provider.

```typescript
function deleteFlag(flag: string): Promise<void>
```

- `flag` — The flag name/key to delete.

#### `evaluateForUser(userId, flags)`

Evaluates multiple flags for a specific user using the bonded provider.

```typescript
function evaluateForUser(userId: string, flags?: string[]): Promise<Record<string, boolean>>
```

- `userId` — The user identifier.
- `flags` — Optional list of flag names to evaluate.

**Returns:** A record mapping flag names to their enabled state.

#### `getAllFlags()`

Retrieves all feature flags using the bonded provider.

```typescript
function getAllFlags(): Promise<FeatureFlag[]>
```

**Returns:** Array of all flag definitions.

#### `getFlag(flag)`

Retrieves a flag definition by name using the bonded provider.

```typescript
function getFlag(flag: string): Promise<FeatureFlag | null>
```

- `flag` — The flag name/key.

**Returns:** The flag definition, or `null` if not found.

#### `getProvider()`

Retrieves the bonded feature flag provider, throwing if none is configured.

```typescript
function getProvider(): FeatureFlagProvider
```

**Returns:** The bonded feature flag provider.

#### `hasProvider()`

Checks whether a feature flag provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a feature flag provider is bonded.

#### `isEnabled(flag, context)`

Checks whether a flag is enabled for the given context using the bonded provider.

```typescript
function isEnabled(flag: string, context?: FlagContext): Promise<boolean>
```

- `flag` — The flag name/key to check.
- `context` — Optional evaluation context.

**Returns:** `true` if the flag is enabled for the given context.

#### `setFlag(flag)`

Creates or updates a feature flag using the bonded provider.

```typescript
function setFlag(flag: FeatureFlagUpdate): Promise<FeatureFlag>
```

- `flag` — The flag data to create or update.

**Returns:** The created or updated flag definition.

#### `setProvider(provider)`

Registers a feature flag provider as the active singleton. Called by
bond packages during application startup.

```typescript
function setProvider(provider: FeatureFlagProvider): void
```

- `provider` — The feature flag provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
