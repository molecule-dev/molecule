# @molecule/api-monitoring-default

Default in-process monitoring provider for molecule.dev.

Stores registered checks in memory and runs them in parallel on each
runAll() call. No external dependencies. Suitable for all deployment sizes.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-monitoring-default
```

## Usage

```typescript
import { setProvider } from '@molecule/api-monitoring'
import { provider, createProvider } from '@molecule/api-monitoring-default'

// Bond the default provider
setProvider(provider)

// Or create a custom instance with options
const customProvider = createProvider({ checkTimeoutMs: 5000 })
setProvider(customProvider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-monitoring` ^1.0.0
