# @molecule/app-bond

Runtime provider wiring system for molecule.dev app-side packages.

Enables swappable providers for state management, theming, routing, styling,
and any custom category — all through dynamic string-based keys. Most app
cores' own setup helpers (`setFont`, `setRouter`, `setClassMap`, each
`setProvider`) delegate INTO this registry, so `bond('theme', p)` and
`@molecule/app-theme`'s `setProvider(p)` write the same slot — use either.

## Quick Start

```typescript
import { bond, get, require as bondRequire, isBonded } from '@molecule/app-bond'
import { provider as routingProvider } from '@molecule/app-routing-react-router'
import type { StateProvider } from '@molecule/app-state'
import { provider as stateProvider } from '@molecule/app-state-zustand'
import type { ThemeProvider } from '@molecule/app-theme'
import { provider as themeProvider } from '@molecule/app-theme-css-variables'

// Singleton providers (one per category)
bond('state', stateProvider)
bond('theme', themeProvider)

// Named providers (multiple per category)
bond('routing', 'react', routingProvider)

// Retrieve providers
const state = get<StateProvider>('state')          // undefined if not bonded
const theme = bondRequire<ThemeProvider>('theme')  // throws if not bonded
const router = get('routing', 'react')

// Check before using
if (isBonded('routing', 'react')) {
  // ...
}
```

## Type
`infrastructure`

## Installation
```bash
npm install @molecule/app-bond
```

## API

### Interfaces

#### `BondConfig`

Options that control bond registration behavior.

```typescript
interface BondConfig {
  /**
   * When `true`, bonding a provider to a category that already has a bonded
   * provider throws an error instead of silently replacing it.
   * @default false
   */
  strict?: boolean

  /**
   * When `true`, bond and unbond operations emit diagnostic log output.
   * @default false
   */
  verbose?: boolean
}
```

#### `Provider`

Minimal base interface that every bondable provider can optionally satisfy.
Provider implementations may include a `name` for logging and debugging
but are not required to extend this interface.

```typescript
interface Provider {
  /**
   * Optional human-readable identifier for this provider, used in log
   * output and error messages.
   */
  readonly name?: string
}
```

#### `ProviderRegistry`

Internal data structure that holds all bonded providers at runtime.
The registry distinguishes between singleton providers (one per category)
and named providers (multiple per category, keyed by a string name).

```typescript
interface ProviderRegistry {
  /**
   * Map from category string (e.g. `'state'`, `'theme'`) to the single
   * active provider instance for that category.
   */
  singletons: Map<string, unknown>

  /**
   * Two-level map: outer key is the category string (e.g. `'routing'`),
   * inner key is the provider name (e.g. `'react'`), value is the provider instance.
   */
  named: Map<string, Map<string, unknown>>
}
```

### Functions

#### `bond(type, provider)`

Registers a provider at runtime. With two arguments, bonds a singleton
provider for the category. With three arguments, bonds a named provider
under the category.

```typescript
function bond(type: string, provider: unknown): void
```

- `type` — The provider category (e.g. `'state'`, `'theme'`, `'routing'`).
- `provider` — The provider instance to bond as a singleton.

#### `bondNamed(type, name, provider)`

Registers a named provider under a category. Named providers allow multiple
implementations per category (e.g. `bond('routing', 'react', reactProvider)`).
In strict mode, throws if that name is already bonded in the category.

```typescript
function bondNamed(type: string, name: string, provider: T): void
```

- `type` — The provider category (e.g. `'routing'`, `'oauth'`).
- `name` — The unique name within the category (e.g. `'react'`, `'github'`).
- `provider` — The provider instance to bond.

#### `bondSingleton(type, provider)`

Registers a singleton provider for the given category. If `provider` is null/undefined,
the existing singleton for that category is removed instead. In strict mode, throws
if a provider is already bonded to the category.

```typescript
function bondSingleton(type: string, provider: T): void
```

- `type` — The provider category (e.g. `'state'`, `'theme'`, `'routing'`).
- `provider` — The provider instance to bond, or null/undefined to remove.

#### `clearProviders(type)`

Removes all providers (both singleton and named) for a given category.

```typescript
function clearProviders(type: string): void
```

- `type` — The provider category to clear.

#### `configure(newConfig)`

Merges new configuration options into the current bond configuration.

```typescript
function configure(newConfig: Partial<BondConfig>): void
```

- `newConfig` — Partial configuration to merge. Unspecified fields retain their current values.

#### `get(type)`

Retrieves a bonded singleton provider by category, or undefined if not bonded.

```typescript
function get(type: string): T | undefined
```

- `type` — The provider category to look up.

**Returns:** The bonded provider instance, or `undefined` if not bonded.

#### `getAll(type)`

Retrieves all named providers bonded under a category. Returns an empty
Map if no named providers exist for the category.

```typescript
function getAll(type: string): Map<string, T>
```

- `type` — The provider category to look up.

**Returns:** A Map from provider name to provider instance.

#### `getAllNamed(type)`

Retrieves all named providers bonded under a category as a Map keyed by provider name.
Returns an empty Map if no providers are bonded for the category.

```typescript
function getAllNamed(type: string): Map<string, T>
```

- `type` — The provider category to look up.

**Returns:** A Map from provider name to provider instance for the given category.

#### `getNamed(type, name)`

Retrieves a named provider from a category, or undefined if not bonded.

```typescript
function getNamed(type: string, name: string): T | undefined
```

- `type` — The provider category to look up.
- `name` — The provider name within the category.

**Returns:** The bonded provider instance cast to `T`, or `undefined` if not found.

#### `getSingleton(type)`

Retrieves the singleton provider for a category, or undefined if none is bonded.

```typescript
function getSingleton(type: string): T | undefined
```

- `type` — The provider category to look up.

**Returns:** The bonded provider instance cast to `T`, or `undefined` if not bonded.

#### `isBonded(type)`

Checks whether a singleton provider is bonded for a category.

```typescript
function isBonded(type: string): boolean
```

- `type` — The provider category to check.

**Returns:** `true` if a singleton provider is bonded for the category.

#### `require(type)`

Retrieves a bonded singleton provider, throwing if not bonded.
Use this when the provider is required for the application to function.

```typescript
function require(type: string): T
```

- `type` — The provider category to look up.

**Returns:** The bonded provider instance.

#### `requireNamed(type, name)`

Retrieves a named provider from a category, throwing if not bonded.
Use this when the provider is required for the application to function.

```typescript
function requireNamed(type: string, name: string): T
```

- `type` — The provider category to look up.
- `name` — The provider name within the category.

**Returns:** The bonded provider instance cast to `T`.

#### `requireSingleton(type)`

Retrieves the singleton provider for a category, throwing if none is bonded.
Use this when the provider is required for the application to function.

```typescript
function requireSingleton(type: string): T
```

- `type` — The provider category to look up.

**Returns:** The bonded provider instance cast to `T`.

#### `reset()`

Removes all bonded providers across all categories, restoring the registry
to its initial empty state. Primarily used in test teardown.

```typescript
function reset(): void
```

#### `unbond(type)`

Removes a bonded singleton provider from a category.

```typescript
function unbond(type: string): boolean
```

- `type` — The provider category to unbond.

**Returns:** `true` if a provider was removed, `false` if none was bonded.

#### `unbondAll(type)`

Removes all providers (both singleton and named) for a category.

```typescript
function unbondAll(type: string): void
```

- `type` — The provider category to clear entirely.

#### `unbondNamed(type, name)`

Removes a named provider from a category.

```typescript
function unbondNamed(type: string, name: string): boolean
```

- `type` — The provider category containing the named provider.
- `name` — The provider name to remove.

**Returns:** `true` if the provider was removed, `false` if it was not found.

#### `unbondSingleton(type)`

Removes a singleton provider from a category.

```typescript
function unbondSingleton(type: string): boolean
```

- `type` — The provider category to unbond.

**Returns:** `true` if a provider was removed, `false` if none was bonded.

### Constants

#### `config`

Current bond configuration controlling strict mode and verbosity.

```typescript
const config: BondConfig
```

#### `registry`

Global provider registry instance shared across all bond operations.
Contains both singleton providers (one per category) and named providers
(multiple per category, keyed by name).

```typescript
const registry: ProviderRegistry
```

## Injection Notes

- **Wire before ANY module evaluates a bond-backed accessor.** `get()`
  returns `undefined` and `require()` THROWS until a provider is bonded —
  and app modules are imported (module top-level runs) BEFORE your
  `setupProviders()`/`bonds/index.ts` executes. A module-scope
  `const cm = getClassMap()` or `const router = require('routing')` in a
  component file therefore runs pre-wiring and breaks the app at load.
  Call accessors inside components/functions, never at module top-level.
- **Not every core reads this registry.** These cores keep a module-local
  singleton instead, so `bond('<category>', p)` is a SILENT NO-OP for them —
  wire each with the core package's own `setProvider()`:
  ai-assistant, ai-copilot, ai-image-generator, ai-voice, audio,
  color-picker, date-range-picker, gallery, image-crop, keyboard-shortcuts,
  markdown, stepper, timeline, tour, tree-view (app/core), and battery,
  bluetooth, brightness, nfc, screen-orientation (app/native). When both
  APIs exist, the core's `setProvider()` is always correct.
- **Re-bonding a category silently replaces the provider** (last bond wins).
  Call `configure({ strict: true })` to make double-bonding throw instead.
  `bond(type, null)` / `bond(type, undefined)` REMOVES the singleton for
  that category. `BondConfig.verbose` is currently INERT (no code reads it).
- `require` collides with CommonJS — import it renamed:
  `import { require as bondRequire } from '@molecule/app-bond'`.
