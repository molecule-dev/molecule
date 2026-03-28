# @molecule/api-workflow-database

Database-backed workflow provider for molecule.dev.

Stores workflow definitions, instances, and event history using the
abstract `@molecule/api-database` DataStore. Wire this provider at
startup with `setProvider(provider)` from `@molecule/api-workflow`.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-workflow-database
```

## Usage

```typescript
import { setProvider } from '@molecule/api-workflow'
import { provider } from '@molecule/api-workflow-database'

setProvider(provider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-workflow` ^1.0.0
