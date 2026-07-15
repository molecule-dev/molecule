# @molecule/api-scheduler-default

Default in-process scheduler provider for molecule.dev.

Uses setInterval for periodic task execution with staggered startup
to prevent thundering herd.

## Quick Start

```typescript
import { schedule, setProvider, start } from '@molecule/api-scheduler'
import { provider } from '@molecule/api-scheduler-default'

setProvider(provider)

schedule({
  name: 'cleanup',
  intervalMs: 60000,
  async handler() {
    // ...
  },
})

// REQUIRED: nothing runs until start() — scheduling alone does not execute
// tasks. Tasks scheduled after start() begin automatically (staggered).
start()
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-scheduler-default @molecule/api-bond @molecule/api-scheduler
```

## API

### Interfaces

#### `DefaultSchedulerOptions`

Configuration options for the default scheduler provider.

```typescript
interface DefaultSchedulerOptions {
  /**
   * Stagger offset in milliseconds between task starts to prevent
   * thundering herd. Defaults to 2000.
   *
   * Each task's actual delay is `(index % currentEnabledTaskCount) * staggerMs`
   * — the index wraps at the current number of enabled tasks rather than
   * growing forever, so repeatedly calling `schedule()` at runtime (e.g. to
   * replace a task) never accrues an ever-larger startup delay. The worst
   * case is always `(enabledTaskCount - 1) * staggerMs`, whether the tasks
   * were all registered before `start()` or scheduled one at a time
   * afterward.
   */
  staggerMs?: number
}
```

### Functions

#### `createProvider(options)`

Creates a default in-process scheduler provider.

```typescript
function createProvider(options?: DefaultSchedulerOptions): SchedulerProvider
```

- `options` — Configuration options.

**Returns:** A SchedulerProvider implementation.

### Constants

#### `provider`

The provider implementation.

```typescript
const provider: SchedulerProvider
```

## Core Interface
Implements `@molecule/api-scheduler` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-scheduler'
import { provider } from '@molecule/api-scheduler-default'

export function setupSchedulerDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-scheduler` ^1.0.0
- `@molecule/api-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-scheduler`
