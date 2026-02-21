# @molecule/api-scheduler

Task scheduler interface for molecule.dev.

Defines SchedulerProvider and ScheduledTask interfaces for periodic
background task execution.

## Type
`core`

## Installation
```bash
npm install @molecule/api-scheduler
```

## Usage

```typescript
import { setProvider, schedule } from '@molecule/api-scheduler'
import { provider } from '@molecule/api-scheduler-default'

setProvider(provider)

schedule({
  name: 'cleanup',
  intervalMs: 60000,
  async handler() {
    await cleanupExpiredRecords()
  },
})
```

## API

### Interfaces

#### `ScheduledTask`

A scheduled task definition.

```typescript
interface ScheduledTask {
  /** Unique identifier for this task. */
  name: string
  /** Interval in milliseconds between executions. */
  intervalMs: number
  /** Async function to execute on each tick. */
  handler(): Promise<void>
  /** Whether this task is enabled. Defaults to true. */
  enabled?: boolean
}
```

#### `SchedulerProvider`

Scheduler provider interface. All scheduler providers must implement this.

```typescript
interface SchedulerProvider {
  /**
   * Registers and starts a scheduled task.
   * If a task with the same name already exists, it is replaced.
   *
   * @param task - The task to schedule.
   */
  schedule(task: ScheduledTask): void

  /**
   * Stops and removes a scheduled task by name.
   *
   * @param name - The task name to unschedule.
   * @returns true if found and removed, false otherwise.
   */
  unschedule(name: string): boolean

  /**
   * Returns the runtime status of a specific task.
   *
   * @param name - The task name.
   * @returns The task status, or null if not found.
   */
  getStatus(name: string): TaskStatus | null

  /**
   * Returns the runtime status of all scheduled tasks.
   */
  getAllStatuses(): TaskStatus[]

  /**
   * Starts the scheduler. Tasks begin executing according to their intervals.
   */
  start(): void

  /**
   * Stops the scheduler. All tasks stop executing. Can be restarted with start().
   */
  stop(): void
}
```

#### `TaskStatus`

Runtime status of a scheduled task.

```typescript
interface TaskStatus {
  /** Task name. */
  name: string
  /** ISO 8601 timestamp of the last execution, or null if not yet run. */
  lastRunAt: string | null
  /** ISO 8601 timestamp of the next scheduled execution. */
  nextRunAt: string | null
  /** Whether the task is currently executing. */
  isRunning: boolean
  /** Error message from the last failed execution, if any. */
  lastError: string | null
  /** Duration in milliseconds of the last execution, or null if not yet run. */
  durationMs: number | null
  /** Total number of completed executions (both success and failure). */
  totalRuns: number
  /** Total number of failed executions. */
  totalFailures: number
  /** ISO 8601 timestamp of the last successful execution, or null. */
  lastSuccessAt: string | null
  /** Whether this task is enabled. */
  enabled: boolean
}
```

### Functions

#### `getAllStatuses()`

Returns the runtime status of all scheduled tasks.

```typescript
function getAllStatuses(): TaskStatus[]
```

**Returns:** An array of TaskStatus for every registered task.

#### `getOptionalProvider()`

Retrieves the bonded scheduler provider, returning null if none is bonded.

```typescript
function getOptionalProvider(): SchedulerProvider | null
```

**Returns:** The bonded scheduler provider, or null.

#### `getProvider()`

Retrieves the bonded scheduler provider, throwing if none is configured.

```typescript
function getProvider(): SchedulerProvider
```

**Returns:** The bonded scheduler provider.

#### `hasProvider()`

Checks whether a scheduler provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a scheduler provider is bonded.

#### `schedule(task)`

Registers and starts a scheduled task through the bonded provider.

```typescript
function schedule(task: ScheduledTask): void
```

- `task` — The task to schedule.

#### `setProvider(provider)`

Registers a scheduler provider as the active singleton.

```typescript
function setProvider(provider: SchedulerProvider): void
```

- `provider` — The scheduler provider implementation to bond.

#### `unschedule(name)`

Stops and removes a scheduled task by name.

```typescript
function unschedule(name: string): boolean
```

- `name` — The task name.

**Returns:** true if found and removed, false otherwise.

## Available Providers

| Provider | Package |
|----------|---------|
| Default (in-process) | `@molecule/api-scheduler-default` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-scheduler`.
