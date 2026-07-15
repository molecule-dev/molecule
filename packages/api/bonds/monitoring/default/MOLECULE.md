# @molecule/api-monitoring-default

Default in-process monitoring provider for molecule.dev.

Stores registered checks in memory and runs them in parallel on each
runAll() call. No external dependencies. Suitable for all deployment sizes.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-monitoring'
import { provider, createProvider } from '@molecule/api-monitoring-default'

// Bond the default provider
setProvider(provider)

// Or create a custom instance with options
const customProvider = createProvider({ checkTimeoutMs: 5000 })
setProvider(customProvider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-monitoring-default @molecule/api-bond @molecule/api-i18n @molecule/api-monitoring
```

## API

### Interfaces

#### `DefaultMonitoringOptions`

Configuration options for the default monitoring provider.

```typescript
interface DefaultMonitoringOptions {
  /**
   * Timeout in milliseconds for each individual check before it is
   * considered 'down'. Defaults to 10000.
   */
  checkTimeoutMs?: number
}
```

### Functions

#### `createProvider(options)`

Creates a default in-process monitoring provider.

```typescript
function createProvider(options?: DefaultMonitoringOptions): MonitoringProvider
```

- `options` — Configuration options.

**Returns:** A MonitoringProvider implementation.

### Constants

#### `provider`

The provider implementation.

```typescript
const provider: MonitoringProvider
```

## Core Interface
Implements `@molecule/api-monitoring` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-monitoring'
import { provider } from '@molecule/api-monitoring-default'

export function setupMonitoringDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-monitoring` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-monitoring`

- **`runAll()` never rejects.** A check that THROWS (easy with
  `createCustomCheck`) becomes a `'down'` entry carrying the thrown message;
  a check that exceeds `checkTimeoutMs` (default 10000) becomes a `'down'`
  entry with `Check timed out after {ms}ms.` — so callers can tell a hung
  dependency from a failing one, and one bad check never turns the whole
  /health endpoint into an opaque 500.
- The overall `status` is the worst individual status
  (`down` > `degraded` > `operational`); an empty registry reports
  `operational`.
- **`runAll()` logs a per-check line at `warn` only on a status
  TRANSITION** (comparing against the previous `runAll()` snapshot) —
  `operational → down`/`degraded`, or the reverse (`recovered`, at `info`).
  A steady-state repeat of an already-reported down/degraded check logs at
  `debug` instead, so polling a `/health` endpoint every few seconds with
  one persistently failing dependency does not flood `warn` with identical
  lines that bury the transition that actually matters.
