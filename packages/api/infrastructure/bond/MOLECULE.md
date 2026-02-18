# @molecule/api-bond

Runtime provider wiring system for molecule.dev.

Enables swappable providers for email, auth, payments, uploads, and any
custom category — all through dynamic string-based keys.

## Type
`infrastructure`

## Installation
```bash
npm install @molecule/api-bond
```

## Usage

```typescript
import { bond, require as bondRequire, get, isBonded, getLogger } from '@molecule/api-bond'
import { provider as sendgrid } from '@molecule/api-emails-sendgrid'
import { paymentProvider } from '@molecule/api-payments-stripe'
import { serverName as githubServerName, verify as githubVerify } from '@molecule/api-oauth-github'

// Wire providers at app startup (string-based categories)
bond('email', sendgrid)                                                          // singleton
bond('payments', 'stripe', paymentProvider)                                      // named
bond('oauth', 'github', { serverName: githubServerName, verify: githubVerify })  // named

// Use anywhere in the app
const email = bondRequire<EmailTransport>('email')  // throws if not bonded
await email.sendMail({ ... })

// Or check first
if (isBonded('email')) {
  const email = get<EmailTransport>('email')  // returns undefined if not bonded
}

// Named providers
const stripePayments = get<PaymentProvider>('payments', 'stripe')

// Safe logging (falls back to console if no logger bonded)
const logger = getLogger()
logger.info('Server started')
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
   * Map from category string (e.g. `'email'`, `'store'`) to the single
   * active provider instance for that category.
   */
  singletons: Map<string, unknown>

  /**
   * Two-level map: outer key is the category string (e.g. `'oauth'`,
   * `'payments'`), inner key is the provider name (e.g. `'github'`,
   * `'stripe'`), value is the provider instance.
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

- `type` — The provider category (e.g. `'email'`, `'payments'`, `'oauth'`).
- `provider` — The provider instance to bond as a singleton.

#### `bondNamed(type, name, provider)`

Registers a named provider under a category. Named providers allow multiple
implementations per category (e.g. `bond('oauth', 'github', githubProvider)`).
In strict mode, throws if that name is already bonded in the category.

```typescript
function bondNamed(type: string, name: string, provider: T): void
```

- `type` — The provider category (e.g. `'oauth'`, `'payments'`).
- `name` — The unique name within the category (e.g. `'github'`, `'stripe'`).
- `provider` — The provider instance to bond.

#### `bondSingleton(type, provider)`

Registers a singleton provider for the given category. If `provider` is null/undefined,
the existing singleton for that category is removed instead. In strict mode, throws
if a provider is already bonded to the category.

```typescript
function bondSingleton(type: string, provider: T): void
```

- `type` — The provider category (e.g. `'email'`, `'store'`, `'logger'`).
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

#### `getAnalytics()`

Get the bonded analytics provider, falling back to no-op.

Returns a lazy proxy that resolves the bonded analytics on each call,
so it's safe to call at module scope (`const analytics = getAnalytics()`).
If an analytics provider is bonded later, the proxy will pick it up automatically.

Safe to call even if `@molecule/api-analytics` isn't installed.
Provider bonds and resource handlers should use this instead of importing
from `@molecule/api-analytics` directly.

```typescript
function getAnalytics(): MinimalAnalytics
```

**Returns:** An analytics object whose methods delegate to the bonded analytics provider or no-op.

#### `getLogger()`

Get the bonded logger, falling back to console.

Returns a lazy proxy that resolves the bonded logger on each call,
so it's safe to call at module scope (`const logger = getLogger()`).
If a logger is bonded later, the proxy will pick it up automatically.

Safe to call even if `@molecule/api-logger` isn't installed.
Provider bonds should use this instead of importing from `@molecule/api-logger` directly.

```typescript
function getLogger(): MinimalLogger
```

**Returns:** A logger object whose methods delegate to the bonded logger or console.

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
