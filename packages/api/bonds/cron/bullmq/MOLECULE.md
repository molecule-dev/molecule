# @molecule/api-cron-bullmq

BullMQ cron scheduling provider for molecule.dev.

Implements the `CronProvider` interface using BullMQ repeatable jobs backed
by Redis. Jobs are persistent and distributed — they survive process restarts
and can be processed by multiple workers. Ideal for production environments
requiring reliability.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-cron-bullmq
```

## Usage

```typescript
import { setProvider, schedule } from '@molecule/api-cron'
import { createProvider } from '@molecule/api-cron-bullmq'

const provider = createProvider({
  connection: { host: 'localhost', port: 6379 },
})
setProvider(provider)

await schedule('cleanup', '0 3 * * *', async () => {
  console.log('Nightly cleanup')
})
```

## API

### Interfaces

#### `BullMQCronConfig`

Configuration options for the BullMQ cron provider.

```typescript
interface BullMQCronConfig {
  /** Redis connection options. */
  connection: RedisConnectionOptions

  /** Queue name prefix. Defaults to `'molecule-cron'`. */
  queueName?: string

  /** Default timezone for all jobs. */
  timezone?: string
}
```

#### `RedisConnectionOptions`

Redis connection options for BullMQ.

```typescript
interface RedisConnectionOptions {
  /** Redis host. Defaults to `'localhost'`. */
  host?: string

  /** Redis port. Defaults to `6379`. */
  port?: number

  /** Redis password. */
  password?: string

  /** Redis database number. */
  db?: number

  /** TLS configuration. Set to `true` for default TLS or an object for custom options. */
  tls?: boolean | Record<string, unknown>
}
```

### Functions

#### `createProvider(config)`

Creates a BullMQ cron provider.

```typescript
function createProvider(config: BullMQCronConfig): CronProvider
```

- `config` — Provider configuration including Redis connection.

**Returns:** A `CronProvider` backed by BullMQ repeatable jobs.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-cron` ^1.0.0
