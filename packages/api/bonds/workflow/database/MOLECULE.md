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
