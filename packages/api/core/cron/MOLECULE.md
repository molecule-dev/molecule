# @molecule/api-cron

Provider-agnostic cron scheduling interface for molecule.dev.

Defines the `CronProvider` interface for scheduling, pausing, resuming,
cancelling, and manually triggering cron jobs. Bond packages (node-cron,
BullMQ, etc.) implement this interface. Application code uses the convenience
functions (`schedule`, `cancel`, `list`, `pause`, `resume`, `runNow`)
which delegate to the bonded provider.

## Type
`core`

## Installation
```bash
npm install @molecule/api-cron
```

## Usage

```typescript
import { setProvider, schedule, list } from '@molecule/api-cron'
import { provider as nodeCron } from '@molecule/api-cron-node-cron'

setProvider(nodeCron)

const jobId = await schedule('cleanup', '0 3 * * *', async () => {
  console.log('Running nightly cleanup...')
})

const jobs = await list()
```

## API

### Interfaces

#### `CronConfig`

Configuration options for cron providers.

```typescript
interface CronConfig {
  /** Default timezone for all jobs. */
  timezone?: string
}
```

#### `CronJob`

A scheduled cron job.

```typescript
interface CronJob {
  /** Unique job identifier. */
  id: string

  /** Human-readable job name. */
  name: string

  /** The cron expression (e.g., `'0 * * * *'` for every hour). */
  cron: string

  /** Current job status. */
  status: CronJobStatus

  /** Timestamp of the last execution, if any. */
  lastRun?: Date

  /** Timestamp of the next scheduled execution, if any. */
  nextRun?: Date

  /** Total number of times the job has been executed. */
  runCount: number
}
```

#### `CronOptions`

Options for scheduling a cron job.

```typescript
interface CronOptions {
  /** IANA timezone for the cron schedule (e.g., `'America/New_York'`). */
  timezone?: string

  /** Whether to run the job immediately on creation. Defaults to `false`. */
  runOnInit?: boolean

  /** Maximum number of times the job should run. `undefined` means unlimited. */
  maxRuns?: number

  /** Start date — the job will not run before this date. */
  startDate?: Date | string

  /** End date — the job will not run after this date. */
  endDate?: Date | string
}
```

#### `CronProvider`

Cron provider interface.

All cron providers must implement this interface. Bond packages
(node-cron, BullMQ, etc.) provide concrete implementations.

```typescript
interface CronProvider {
  /**
   * Schedules a new cron job.
   *
   * @param name - Human-readable name for the job.
   * @param cron - A cron expression defining the schedule.
   * @param handler - The async function to execute on each tick.
   * @param options - Optional scheduling configuration.
   * @returns The unique job identifier.
   */
  schedule(
    name: string,
    cron: string,
    handler: () => Promise<void>,
    options?: CronOptions,
  ): Promise<string>

  /**
   * Cancels and removes a scheduled job.
   *
   * @param jobId - The job identifier.
   */
  cancel(jobId: string): Promise<void>

  /**
   * Lists all registered cron jobs.
   *
   * @returns An array of cron job descriptors.
   */
  list(): Promise<CronJob[]>

  /**
   * Pauses a running cron job without removing it.
   *
   * @param jobId - The job identifier.
   */
  pause(jobId: string): Promise<void>

  /**
   * Resumes a previously paused cron job.
   *
   * @param jobId - The job identifier.
   */
  resume(jobId: string): Promise<void>

  /**
   * Triggers immediate execution of a job regardless of its schedule.
   *
   * @param jobId - The job identifier.
   */
  runNow(jobId: string): Promise<void>
}
```

### Types

#### `CronJobStatus`

Status of a cron job.

```typescript
type CronJobStatus = 'active' | 'paused' | 'completed' | 'failed'
```

### Functions

#### `cancel(jobId)`

Cancels and removes a scheduled job.

```typescript
function cancel(jobId: string): Promise<void>
```

- `jobId` — The job identifier.

**Returns:** Resolves when the job is cancelled.

#### `getProvider()`

Retrieves the bonded cron provider, throwing if none is configured.

```typescript
function getProvider(): CronProvider
```

**Returns:** The bonded cron provider.

#### `hasProvider()`

Checks whether a cron provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a cron provider is bonded.

#### `list()`

Lists all registered cron jobs.

```typescript
function list(): Promise<CronJob[]>
```

**Returns:** An array of cron job descriptors.

#### `pause(jobId)`

Pauses a running cron job without removing it.

```typescript
function pause(jobId: string): Promise<void>
```

- `jobId` — The job identifier.

**Returns:** Resolves when the job is paused.

#### `resume(jobId)`

Resumes a previously paused cron job.

```typescript
function resume(jobId: string): Promise<void>
```

- `jobId` — The job identifier.

**Returns:** Resolves when the job is resumed.

#### `runNow(jobId)`

Triggers immediate execution of a job regardless of its schedule.

```typescript
function runNow(jobId: string): Promise<void>
```

- `jobId` — The job identifier.

**Returns:** Resolves when the job execution completes.

#### `schedule(name, cron, handler, options)`

Schedules a new cron job.

```typescript
function schedule(name: string, cron: string, handler: () => Promise<void>, options?: CronOptions): Promise<string>
```

- `name` — Human-readable name for the job.
- `cron` — A cron expression defining the schedule.
- `handler` — The async function to execute on each tick.
- `options` — Optional scheduling configuration.

**Returns:** The unique job identifier.

#### `setProvider(provider)`

Registers a cron provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: CronProvider): void
```

- `provider` — The cron provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
