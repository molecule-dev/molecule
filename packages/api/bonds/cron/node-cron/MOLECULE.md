# @molecule/api-cron-node-cron

node-cron scheduling provider for molecule.dev.

Implements the `CronProvider` interface using the `node-cron` library for
lightweight in-process cron scheduling. Supports standard cron expressions,
timezone configuration, pause/resume, and manual triggering. Jobs are
in-memory and do not persist across process restarts.

## Quick Start

```typescript
import { setProvider, schedule } from '@molecule/api-cron'
import { provider } from '@molecule/api-cron-node-cron'

setProvider(provider)

await schedule('cleanup', '0 3 * * *', async () => {
  console.log('Nightly cleanup')
})
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-cron-node-cron
```

## API

### Interfaces

#### `NodeCronConfig`

Configuration options for the node-cron provider.

```typescript
interface NodeCronConfig {
  /** Default IANA timezone for all jobs (e.g., `'America/New_York'`). */
  timezone?: string
}
```

### Functions

#### `createProvider(config)`

Creates a node-cron provider.

```typescript
function createProvider(config?: NodeCronConfig): CronProvider
```

- `config` — Provider configuration.

**Returns:** A `CronProvider` backed by node-cron.

### Constants

#### `provider`

The provider implementation with default configuration.

```typescript
const provider: CronProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-cron` ^1.0.0
