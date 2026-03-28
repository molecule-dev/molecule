# @molecule/api-workflow

Workflow/state machine core interface for molecule.dev.

Defines the `WorkflowProvider` interface for managing workflow definitions,
instances, state transitions, and event history. Bond packages (database,
in-memory, etc.) implement this interface. Application code uses the
convenience functions which delegate to the bonded provider.

## Type
`core`

## Installation
```bash
npm install @molecule/api-workflow
```

## Usage

```typescript
import { setProvider, createWorkflow, startInstance, transition } from '@molecule/api-workflow'
import { provider as dbWorkflow } from '@molecule/api-workflow-database'

setProvider(dbWorkflow)

const workflow = await createWorkflow({
  name: 'order-lifecycle',
  initialState: 'pending',
  states: {
    pending: { transitions: { confirm: { target: 'confirmed' } } },
    confirmed: { transitions: { ship: { target: 'shipped' } }, final: false },
    shipped: { transitions: { deliver: { target: 'delivered' } } },
    delivered: { final: true, transitions: {} },
  },
})

const instance = await startInstance(workflow.id, { orderId: '123' })
await transition(instance.id, 'confirm')
```

## API

### Interfaces

#### `StateDefinition`

Definition of a single state within a workflow.

```typescript
interface StateDefinition {
  /** Map of action names to their transition definitions. */
  transitions: Record<string, TransitionDefinition>
  /** Optional hook identifier to execute when entering this state. */
  onEnter?: string
  /** Optional hook identifier to execute when exiting this state. */
  onExit?: string
  /** Whether this is a terminal state (no outgoing transitions expected). */
  final?: boolean
}
```

#### `TransitionDefinition`

Definition of a transition from one state to another.

```typescript
interface TransitionDefinition {
  /** The target state this transition leads to. */
  target: string
  /** Optional guard identifier — transition is allowed only if the guard passes. */
  guard?: string
  /** Optional action identifier to execute during the transition. */
  action?: string
}
```

#### `Workflow`

A persisted workflow definition with an assigned identifier.

```typescript
interface Workflow {
  /** Unique workflow identifier. */
  id: string
  /** Human-readable workflow name. */
  name: string
  /** The initial state for new instances. */
  initialState: string
  /** State definitions. */
  states: Record<string, StateDefinition>
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

#### `WorkflowConfig`

Configuration options for the workflow provider.

```typescript
interface WorkflowConfig {
  /** Optional table name prefix for database-backed providers. */
  tablePrefix?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
```

#### `WorkflowDefinition`

A complete workflow definition describing states and their transitions.

```typescript
interface WorkflowDefinition {
  /** Human-readable name for this workflow. */
  name: string
  /** The state in which new instances start. */
  initialState: string
  /** Map of state names to their definitions. */
  states: Record<string, StateDefinition>
}
```

#### `WorkflowEvent`

A recorded event in a workflow instance's history.

```typescript
interface WorkflowEvent {
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
  /** Optional data snapshot at the time of the event. */
  data?: Record<string, unknown>
  /** Event timestamp. */
  createdAt: string
}
```

#### `WorkflowInstance`

A running instance of a workflow.

```typescript
interface WorkflowInstance {
  /** Unique instance identifier. */
  id: string
  /** The workflow definition this instance belongs to. */
  workflowId: string
  /** Current state of the instance. */
  state: string
  /** Arbitrary data attached to this instance. */
  data: Record<string, unknown>
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

#### `WorkflowProvider`

Workflow provider interface.

All workflow providers must implement this interface to supply
workflow definition storage, instance management, and transition logic.

```typescript
interface WorkflowProvider {
  /** Provider name (e.g. 'database', 'memory'). */
  readonly name: string

  /**
   * Persists a new workflow definition.
   *
   * @param definition - The workflow definition to create.
   * @returns The persisted workflow with generated ID and timestamps.
   */
  createWorkflow(definition: WorkflowDefinition): Promise<Workflow>

  /**
   * Retrieves a workflow definition by ID.
   *
   * @param workflowId - The workflow identifier.
   * @returns The workflow, or `null` if not found.
   */
  getWorkflow(workflowId: string): Promise<Workflow | null>

  /**
   * Lists all persisted workflow definitions.
   *
   * @returns An array of all workflows.
   */
  listWorkflows(): Promise<Workflow[]>

  /**
   * Creates and starts a new instance of a workflow.
   *
   * @param workflowId - The workflow to instantiate.
   * @param data - Optional initial data for the instance.
   * @returns The newly created instance in the workflow's initial state.
   */
  startInstance(workflowId: string, data?: Record<string, unknown>): Promise<WorkflowInstance>

  /**
   * Retrieves a workflow instance by ID.
   *
   * @param instanceId - The instance identifier.
   * @returns The instance, or `null` if not found.
   */
  getInstance(instanceId: string): Promise<WorkflowInstance | null>

  /**
   * Applies an action to transition an instance from its current state.
   *
   * @param instanceId - The instance to transition.
   * @param action - The action name triggering the transition.
   * @param data - Optional data to merge into the instance.
   * @returns The updated instance in its new state.
   * @throws {Error} If the action is not valid for the current state.
   */
  transition(
    instanceId: string,
    action: string,
    data?: Record<string, unknown>,
  ): Promise<WorkflowInstance>

  /**
   * Returns the current state name of an instance.
   *
   * @param instanceId - The instance identifier.
   * @returns The current state name.
   */
  getState(instanceId: string): Promise<string>

  /**
   * Returns the transition history for an instance.
   *
   * @param instanceId - The instance identifier.
   * @returns An array of workflow events in chronological order.
   */
  getHistory(instanceId: string): Promise<WorkflowEvent[]>

  /**
   * Returns the list of action names available from the instance's current state.
   *
   * @param instanceId - The instance identifier.
   * @returns An array of available action names.
   */
  getAvailableActions(instanceId: string): Promise<string[]>
}
```

### Functions

#### `createWorkflow(definition)`

Persists a new workflow definition.

```typescript
function createWorkflow(definition: WorkflowDefinition): Promise<Workflow>
```

- `definition` — The workflow definition to create.

**Returns:** The persisted workflow with generated ID and timestamps.

#### `getAvailableActions(instanceId)`

Returns the list of action names available from the instance's current state.

```typescript
function getAvailableActions(instanceId: string): Promise<string[]>
```

- `instanceId` — The instance identifier.

**Returns:** An array of available action names.

#### `getHistory(instanceId)`

Returns the transition history for an instance.

```typescript
function getHistory(instanceId: string): Promise<WorkflowEvent[]>
```

- `instanceId` — The instance identifier.

**Returns:** An array of workflow events in chronological order.

#### `getInstance(instanceId)`

Retrieves a workflow instance by ID.

```typescript
function getInstance(instanceId: string): Promise<WorkflowInstance | null>
```

- `instanceId` — The instance identifier.

**Returns:** The instance, or `null` if not found.

#### `getProvider()`

Retrieves the bonded workflow provider, throwing if none is configured.

```typescript
function getProvider(): WorkflowProvider
```

**Returns:** The bonded workflow provider.

#### `getState(instanceId)`

Returns the current state name of an instance.

```typescript
function getState(instanceId: string): Promise<string>
```

- `instanceId` — The instance identifier.

**Returns:** The current state name.

#### `getWorkflow(workflowId)`

Retrieves a workflow definition by ID.

```typescript
function getWorkflow(workflowId: string): Promise<Workflow | null>
```

- `workflowId` — The workflow identifier.

**Returns:** The workflow, or `null` if not found.

#### `hasProvider()`

Checks whether a workflow provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a workflow provider is bonded.

#### `listWorkflows()`

Lists all persisted workflow definitions.

```typescript
function listWorkflows(): Promise<Workflow[]>
```

**Returns:** An array of all workflows.

#### `setProvider(provider)`

Registers a workflow provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: WorkflowProvider): void
```

- `provider` — The workflow provider implementation to bond.

#### `startInstance(workflowId, data)`

Creates and starts a new instance of a workflow.

```typescript
function startInstance(workflowId: string, data?: Record<string, unknown>): Promise<WorkflowInstance>
```

- `workflowId` — The workflow to instantiate.
- `data` — Optional initial data for the instance.

**Returns:** The newly created instance in the workflow's initial state.

#### `transition(instanceId, action, data)`

Applies an action to transition an instance from its current state.

```typescript
function transition(instanceId: string, action: string, data?: Record<string, unknown>): Promise<WorkflowInstance>
```

- `instanceId` — The instance to transition.
- `action` — The action name triggering the transition.
- `data` — Optional data to merge into the instance.

**Returns:** The updated instance in its new state.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
