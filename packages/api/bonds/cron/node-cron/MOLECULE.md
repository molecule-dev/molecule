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
npm install @molecule/api-cron-node-cron @molecule/api-cron @molecule/api-logger node-cron
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

## Core Interface
Implements `@molecule/api-cron` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-cron'
import { provider } from '@molecule/api-cron-node-cron'

export function setupCronNodeCron(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-cron` ^1.0.0
- `@molecule/api-logger` ^1.0.0

### Runtime Dependencies

- `@molecule/api-cron`
- `@molecule/api-logger`
- `node-cron`

- A handler that throws does NOT cancel the job: the error is logged (with
  the job id and name) and the job stays `active` for its next tick — the
  same keep-running semantics as the BullMQ bond and real crontab. Add your
  own retry/alerting inside the handler if a failure needs escalation.
- `schedule()` rejects a malformed cron expression up front with an error
  naming the job and the expression (raw node-cron would throw an opaque
  `TypeError`/`RangeError`). Both 5-field (`'0 3 * * *'`) and 6-field
  seconds-granularity (`'* * * * * *'` = every second) expressions work.
- Jobs are in-memory only: they are lost on process restart, so re-register
  them at startup. For persistent/distributed jobs use `@molecule/api-cron-bullmq`.
- `CronOptions.noOverlap: true` skips a tick that arrives while the
  previous execution of the same job is still running (node-cron logs
  `'task still running, new execution blocked by overlap prevention!'`
  itself). Default `false` — overlapping runs are allowed, unchanged from
  before this option existed.
- `CronOptions.maxRuns` is enforced both on scheduled ticks AND on manual
  `runNow()` calls — once the cap is reached (by either), the job is
  marked `'completed'` and stops ticking.

## E2E Tests

Integration checklist — drive the real flow (no mocks), adapt each item to
this app's actual scheduled jobs, and check every box off one by one. A box
you can't check is an integration bug to fix — not a skip:
- [ ] Every job the app defines is REGISTERED at startup: after bootstrap,
  `list()` returns each one (or its `schedule()` call ran without error) — a
  job that never registers never fires.
- [ ] Each job's REAL side effect happens when it runs — the digest row is
  written, the cleanup deletes, the report is generated. Trigger it now with
  `runNow(jobId)` (or invoke the handler directly) and assert the effect;
  never stub the body. COUNTERPARTY: the sandbox process is short-lived, so a
  real timed tick may never arrive — that is expected. Verify by direct
  invocation, not by waiting minutes for the schedule to fire.
- [ ] Re-running a job is safe: invoke it twice and confirm no double effect
  (no double-charge, double-send, or duplicate row) — the handler is
  idempotent or guards its own re-entry.
- [ ] A failing job is observable, not swallowed: force the handler to throw
  and confirm the error is logged/surfaced and the job's `status` reflects it.
- [ ] The cadence is correct: read each job's `cron` expression and confirm it
  matches the intended schedule (nightly, hourly, …) — verify by reading it,
  not by waiting for a tick.
- [ ] Any user-facing trigger is locked down: if the app exposes a manual
  "run now" or schedule-management endpoint, only an authorized caller can hit
  it — an anonymous request can't fire jobs or register arbitrary schedules.
