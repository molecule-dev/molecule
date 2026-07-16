# @molecule/api-feature-flags-database

Database-backed feature flags provider for molecule.dev.

Persists feature flags using the abstract `DataStore` from
`@molecule/api-database`. Supports rule-based targeting, percentage
rollouts, and bulk user evaluation.

## Quick Start

```typescript
import { setProvider, isEnabled, setFlag } from '@molecule/api-feature-flags'
import { provider } from '@molecule/api-feature-flags-database'

// Wire the provider at startup (default table: 'feature_flags')
setProvider(provider)

// Or create with custom config
import { createProvider } from '@molecule/api-feature-flags-database'
const customProvider = createProvider({ tableName: 'flags' })
setProvider(customProvider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-feature-flags-database @molecule/api-database @molecule/api-feature-flags
```

## API

### Interfaces

#### `DatabaseFlagConfig`

Configuration options for the database-backed feature flags provider.

```typescript
interface DatabaseFlagConfig {
  /**
   * The database table name for storing feature flags.
   *
   * @default 'feature_flags'
   */
  tableName?: string
}
```

### Functions

#### `createProvider(config)`

Creates a database-backed feature flag provider.

```typescript
function createProvider(config?: DatabaseFlagConfig): FeatureFlagProvider
```

- `config` — Optional provider configuration.

**Returns:** A `FeatureFlagProvider` backed by the bonded `DataStore`.

### Constants

#### `provider`

Default database feature flags provider instance. Lazily initializes
on first property access with default options.

```typescript
const provider: FeatureFlagProvider
```

## Core Interface
Implements `@molecule/api-feature-flags` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-feature-flags'
import { provider } from '@molecule/api-feature-flags-database'

export function setupFeatureFlagsDatabase(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-feature-flags` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-feature-flags`

- **The flags table must already exist — this bond never creates it.** Add
  a migration for `feature_flags` (or your `config.tableName`) with columns:
  `id` (uuid/text, PK), `name` (text, unique), `enabled` (boolean/integer),
  `description` (text, nullable), `rules` (text — JSON-serialized, nullable),
  `percentage` (integer, nullable), `created_at` / `updated_at` (timestamp).
- **Wire the database bond first.** Every method delegates to the bonded
  `@molecule/api-database` DataStore; with no database bonded, calls throw.
- `isEnabled()` on an unknown flag returns `false` (fail-closed), but
  `deleteFlag()` on an unknown flag THROWS (`Feature flag not found: <name>`).
- Targeting rules are AND-combined (every rule must match); percentage
  rollout applies after rules and only when `context.userId` is present —
  see `@molecule/api-feature-flags` remarks for the no-context fallback.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] A flag actually GATES behavior: with the flag OFF the feature it
  guards is hidden/disabled in the UI; flip it ON from the admin screen (or
  `setFlag`) and reload — the feature appears with no code change or rebuild.
  Turn it back OFF and it disappears again.
- [ ] Targeting evaluates PER USER: for a rule- or percentage-flag, a user
  inside the segment (matching `attributes`/rollout) sees the feature and a
  user outside it does not — verify by signing in as each and via
  `isEnabled(flag, { userId, attributes })` / `evaluateForUser(userId)`
  returning the right boolean for each. The same user's result is sticky
  across reloads, not flickering between requests.
- [ ] An UNDEFINED flag (never created) evaluates to the SAFE default:
  `isEnabled('does-not-exist', ctx)` returns false and the guarded feature
  stays hidden — it does NOT throw or fall open.
- [ ] Flag reads are cheap on the hot path — evaluation is server-side and
  cached, not a DB round-trip per render — and a toggle propagates promptly
  (within a reload / short cache window), not only after a restart.
- [ ] The gate is enforced SERVER-SIDE, not just in the UI: calling the API
  route the flag protects with the flag OFF is rejected, not merely hidden
  (a client-side flag gate is UX, not security).
- [ ] ADMIN-ONLY writes: only an authorized admin can create/toggle/delete
  flags. A normal signed-in user hitting the flag-CRUD endpoints
  (`setFlag`/`deleteFlag`/`getAllFlags`) is rejected — they can't flip a flag
  or read raw flag definitions/rules through any exposed route.
