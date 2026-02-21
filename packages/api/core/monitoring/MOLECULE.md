# @molecule/api-monitoring

Health monitoring interface for molecule.dev.

Defines MonitoringProvider and SystemHealth interfaces, plus composable
factory functions for common health checks (database, cache, HTTP probes,
bond registry checks, and custom checks).

## Type
`core`

## Installation
```bash
npm install @molecule/api-monitoring
```

## Usage

```typescript
import { setProvider, runAll, createDatabaseCheck, createHttpCheck } from '@molecule/api-monitoring'
import { provider } from '@molecule/api-monitoring-default'

setProvider(provider)

const monitoring = getProvider()
monitoring.register(createDatabaseCheck())
monitoring.register(createHttpCheck('https://api.stripe.com', { name: 'stripe', degradedThresholdMs: 1000 }))

const health = await runAll()
console.log(health.status) // 'operational' | 'degraded' | 'down'
```

## API

### Interfaces

#### `CheckEntry`

A named check result with timing metadata, as stored in SystemHealth.

```typescript
interface CheckEntry extends CheckResult {
  /** Check name, matches HealthCheck.name. */
  name: string
  /** Check category, matches HealthCheck.category. */
  category: string
  /** ISO 8601 timestamp when this check was last executed. */
  checkedAt: string
}
```

#### `CheckResult`

Result returned by a single health check function.

```typescript
interface CheckResult {
  /** Computed status for this check. */
  status: CheckStatus
  /** Round-trip time in milliseconds, if measured. */
  latencyMs?: number
  /** Human-readable detail message (especially on degraded/down). */
  message?: string
}
```

#### `HealthCheck`

A named, categorised health check.

Registered with a MonitoringProvider via `register()`. The check()
function is called on each `runAll()` invocation.

```typescript
interface HealthCheck {
  /** Unique identifier for this check (e.g. 'database', 'stripe'). */
  name: string
  /**
   * Logical category grouping related checks
   * (e.g. 'infrastructure', 'external', 'custom').
   */
  category: string
  /** Async function that performs the check and returns a CheckResult. */
  check(): Promise<CheckResult>
}
```

#### `HttpCheckOptions`

Options for createHttpCheck.

```typescript
interface HttpCheckOptions {
  /** Check name. Defaults to the URL hostname. */
  name?: string
  /** Check category. Defaults to 'external'. */
  category?: string
  /** Request timeout in milliseconds. Defaults to 5000. */
  timeoutMs?: number
  /** Expected HTTP status code range. Defaults to 200-299. */
  expectedStatus?: number
  /** Latency threshold in ms above which status degrades to 'degraded'. */
  degradedThresholdMs?: number
}
```

#### `MonitoringProvider`

Monitoring provider interface. All monitoring providers must implement this.

```typescript
interface MonitoringProvider {
  /**
   * Registers a health check. Duplicate names replace the previous entry.
   *
   * @param check - The health check to register.
   */
  register(check: HealthCheck): void

  /**
   * Removes a previously registered check by name.
   *
   * @param name - The check name to deregister.
   * @returns true if found and removed, false otherwise.
   */
  deregister(name: string): boolean

  /**
   * Runs all registered checks in parallel, stores results, and returns
   * the aggregated SystemHealth.
   *
   * @returns Resolved SystemHealth snapshot.
   */
  runAll(): Promise<SystemHealth>

  /**
   * Returns the most recently computed SystemHealth snapshot, or null if
   * runAll() has not yet been called.
   */
  getLatest(): SystemHealth | null

  /**
   * Returns all registered check names.
   */
  getRegisteredChecks(): string[]
}
```

#### `SystemHealth`

Aggregated health snapshot for the entire system.

```typescript
interface SystemHealth {
  /**
   * Overall status — the worst status across all individual checks.
   * 'operational' only when all checks are 'operational'.
   */
  status: CheckStatus
  /** Individual check results keyed by check name. */
  checks: Record<string, CheckEntry>
  /** ISO 8601 timestamp when runAll() completed. */
  timestamp: string
}
```

### Types

#### `CheckStatus`

Operational status of a single health check.
- 'operational' — fully functional
- 'degraded' — functioning but below normal (high latency, partial failures)
- 'down' — unavailable

```typescript
type CheckStatus = 'operational' | 'degraded' | 'down'
```

### Functions

#### `createBondCheck(bondType, name, category)`

Creates a health check that verifies a bond is registered.

Purely synchronous registry introspection — no provider methods called.

```typescript
function createBondCheck(bondType: string, name?: string, category?: string): HealthCheck
```

- `bondType` — The bond type string to check (e.g. 'database', 'email').
- `name` — Check name. Defaults to `bond:{bondType}`.
- `category` — Check category. Defaults to 'bonds'.

**Returns:** A HealthCheck that verifies the bond is registered.

#### `createCacheCheck(name, category)`

Creates a health check that probes the cache bond.

Attempts a set/get/delete round-trip on a sentinel key to confirm the
cache is operational.

```typescript
function createCacheCheck(name?: string, category?: string): HealthCheck
```

- `name` — Check name. Defaults to 'cache'.
- `category` — Check category. Defaults to 'infrastructure'.

**Returns:** A HealthCheck that probes the cache bond.

#### `createCustomCheck(name, fn, category)`

Creates a custom health check from a user-provided async function.

```typescript
function createCustomCheck(name: string, fn: () => Promise<CheckResult>, category?: string): HealthCheck
```

- `name` — Unique check name.
- `fn` — Async function returning a CheckResult.
- `category` — Check category. Defaults to 'custom'.

**Returns:** A HealthCheck wrapping the user-provided function.

#### `createDatabaseCheck(name, category)`

Creates a health check that probes the database bond.

Uses the 'database' bond type via isBonded()/get(). Sends a lightweight
query (SELECT 1) to confirm connectivity.

```typescript
function createDatabaseCheck(name?: string, category?: string): HealthCheck
```

- `name` — Check name. Defaults to 'database'.
- `category` — Check category. Defaults to 'infrastructure'.

**Returns:** A HealthCheck that probes the database bond.

#### `createHttpCheck(url, options)`

Creates a health check that performs an HTTP GET probe against a URL.

Uses the global fetch API (Node 18+). Reports 'degraded' if the response
time exceeds degradedThresholdMs, 'down' if the request fails or the
response status is unexpected.

```typescript
function createHttpCheck(url: string, options?: HttpCheckOptions): HealthCheck
```

- `url` — The URL to probe.
- `options` — Optional configuration.

**Returns:** A HealthCheck that performs an HTTP GET probe.

#### `getLatest()`

Returns the most recently computed SystemHealth, or null if runAll()
has not been called yet.

```typescript
function getLatest(): SystemHealth | null
```

**Returns:** The most recent SystemHealth snapshot, or null.

#### `getOptionalProvider()`

Retrieves the bonded monitoring provider, returning null if none is bonded.
Prefer this over getProvider() in optional monitoring code paths.

```typescript
function getOptionalProvider(): MonitoringProvider | null
```

**Returns:** The bonded monitoring provider, or null.

#### `getProvider()`

Retrieves the bonded monitoring provider, throwing if none is configured.

```typescript
function getProvider(): MonitoringProvider
```

**Returns:** The bonded monitoring provider.

#### `hasProvider()`

Checks whether a monitoring provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a monitoring provider is bonded.

#### `runAll()`

Runs all registered checks through the bonded monitoring provider.

```typescript
function runAll(): Promise<SystemHealth>
```

**Returns:** Aggregated SystemHealth snapshot.

#### `setProvider(provider)`

Registers a monitoring provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: MonitoringProvider): void
```

- `provider` — The monitoring provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Default (in-process) | `@molecule/api-monitoring-default` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-monitoring`.
