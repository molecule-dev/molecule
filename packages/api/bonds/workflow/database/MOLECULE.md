# @molecule/api-workflow-database

Database-backed workflow provider for molecule.dev.

Stores workflow definitions, instances, and event history using the
abstract `@molecule/api-database` DataStore. Wire this provider at
startup with `setProvider(provider)` from `@molecule/api-workflow`.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-workflow'
import { provider } from '@molecule/api-workflow-database'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-workflow-database @molecule/api-database @molecule/api-i18n @molecule/api-workflow
```

## API

### Interfaces

#### `WorkflowEventRow`

Database row for a workflow event.

```typescript
interface WorkflowEventRow {
  /** Unique event identifier. */
  id: string
  /** The workflow instance this event belongs to. */
  instanceId: string
  /** The action that triggered this event. */
  action: string
  /** The state before the transition. */
  fromState: string
  /** The state after the transition. */
  toState: string
  /** JSON-serialized data snapshot, or null. */
  data: string | null
  /** Event timestamp. */
  createdAt: string
}
```

#### `WorkflowInstanceRow`

Database row for a workflow instance.

```typescript
interface WorkflowInstanceRow {
  /** Unique instance identifier. */
  id: string
  /** The workflow definition this instance belongs to. */
  workflowId: string
  /** Current state of the instance. */
  state: string
  /** JSON-serialized instance data. */
  data: string
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

#### `WorkflowRow`

Database row for a persisted workflow definition.

```typescript
interface WorkflowRow {
  /** Unique workflow identifier. */
  id: string
  /** Human-readable workflow name. */
  name: string
  /** JSON-serialized states definition. */
  states: string
  /** The initial state for new instances. */
  initialState: string
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

### Constants

#### `provider`

Database-backed workflow provider implementing the {@link WorkflowProvider} interface.

Stores workflow definitions, instances, and event history in the bonded DataStore.

```typescript
const provider: WorkflowProvider
```

## Core Interface
Implements `@molecule/api-workflow` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-workflow'
import { provider } from '@molecule/api-workflow-database'

export function setupWorkflowDatabase(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-workflow` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-workflow`

- **Requires its tables before first use.** This bond ships
  `__setup__/workflow.sql` (`workflows`, `workflow_instances`,
  `workflow_events`); molecule scaffolds replay the `.sql` files under
  `__setup__` on `migrate`, but adding this bond to an existing app means
  applying that DDL yourself first. The shipped DDL is PostgreSQL dialect.
- `guard` / `onEnter` / `onExit` identifiers in workflow definitions are
  DECLARATIVE ONLY here — this bond stores them but never evaluates or
  executes them. Enforce preconditions and side-effects in your handler
  around `transition()`.
- `transition()` is read-then-write with no lock or transaction: serialize
  concurrent transitions per instance yourself when a double-fire matters,
  and authorize server-side — nothing is user-scoped.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual workflow screens/flows, and check every box
off one by one. A box you can't check is an integration bug to fix — not a
skip:
- [ ] Starting an instance from the UI puts it in the workflow's
  `initialState`; each UI action drives one `transition()` and the instance
  advances ONLY along a transition defined for its current state. Walk the
  whole path front to back — the step/status shown in the UI matches
  `getState()` at every stage and `getHistory()` lists the fromState ->
  toState hops in the exact order they happened.
- [ ] A step whose work must succeed before advancing actually gates the
  next transition. `guard`/`action` identifiers are DECLARATIVE ONLY — the
  bundled bonds never evaluate or run them — so the handler enforces it
  around `transition()` (check, then transition, then act): a required
  approval or input holds the instance in its current state, the advancing
  action only appears in `getAvailableActions()` once the precondition is
  met, and the UI cannot move on until the real work succeeded.
- [ ] Branching routes correctly: an input that should take branch A takes
  A, not B. The handler picks which action to apply from the instance data
  and the instance lands in branch A's target state (confirm via
  `getState()`/history), never the other branch's.
- [ ] A failed step is handled per the definition — retry loops back, halt
  lands in the error/terminal state, compensate runs the rollback
  transition — never silently left in the pre-failure state as if it
  succeeded and never wedged with no available actions. `transition()`
  THROWS on an action illegal for the current state; the handler catches it
  and answers an error instead of pretending the step advanced.
- [ ] State is durable, not in-memory: reload the page (or come back later /
  restart the server) and re-fetch the instance — it is at the SAME step
  with its `data` intact, proving state lives in the workflow bond's store.
  Requires the `workflows`/`workflow_instances`/`workflow_events` tables to
  be migrated first.
- [ ] Integrity — a caller cannot POST an arbitrary action or target state
  to jump ahead or skip a required approval. `transition()` only honors
  actions defined for the instance's CURRENT state (throws otherwise), and
  the server authorizes ownership before every transition/list (nothing is
  user-scoped by default) so one user can neither advance nor read another's
  instance. Build the UI's buttons from `getAvailableActions()`, but enforce
  every transition server-side.
