# @molecule/api-workflow-database

Database-backed workflow provider for molecule.dev.

Stores workflow definitions, instances, and event history using the
abstract `@molecule/api-database` DataStore. Wire this provider at
startup with `setProvider(provider)` from `@molecule/api-workflow`.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-workflow'
import { provider, registerGuard, registerHook } from '@molecule/api-workflow-database'

setProvider(provider)

// Gate + react to transitions by KEY (definition strings are never eval'd):
registerGuard('isPaid', (ctx) => ctx.data.paid === true)
registerHook('sendReceipt', async (ctx) => {
  await emailReceipt(ctx.instanceId)
})
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-workflow-database @molecule/api-database @molecule/api-i18n @molecule/api-workflow
```

## API

### Interfaces

#### `WorkflowContext`

Execution context threaded through a guard, transition action, and state
hooks during a single `transition()`. Handlers may READ every field; only
`data` is mutable — an action/hook may add or change fields and the final
value is what gets persisted to the instance. Guards should treat `data` as
read-only (mutations before a guard blocks the transition are discarded).

```typescript
interface WorkflowContext {
  /** The instance being transitioned. */
  instanceId: string
  /** The id of the workflow definition the instance belongs to. */
  workflowId: string
  /** The action name that triggered this transition. */
  action: string
  /** The state the instance is leaving. */
  fromState: string
  /** The state the instance is entering. */
  toState: string
  /**
   * The instance's merged data (existing instance data ∪ this transition's
   * `data`). Mutable: actions/hooks may add or change fields and the final
   * value is persisted.
   */
  data: Record<string, unknown>
  /** The full workflow definition (all states + metadata). */
  workflow: Workflow
}
```

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
  /**
   * The data snapshot, from a nullable JSONB column, or null. Returned ALREADY
   * PARSED (an object) on Postgres/MySQL but as a JSON string on SQLite — read
   * it through `parseMaybeJson`, never a bare `JSON.parse`.
   */
  data: string | Record<string, unknown> | null
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
  /**
   * The instance data, from a JSONB column. Returned ALREADY PARSED (an
   * object) on Postgres/MySQL but as a JSON string on SQLite — read it through
   * `parseMaybeJson`, never a bare `JSON.parse`.
   */
  data: string | Record<string, unknown>
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
  /**
   * The states definition, from a JSONB column. The bonded DataStore returns
   * this ALREADY PARSED (an object) on Postgres/MySQL but as a JSON string on
   * SQLite — read it through `parseMaybeJson`, never a bare `JSON.parse`.
   */
  states: string | Record<string, unknown>
  /** The initial state for new instances. */
  initialState: string
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

### Types

#### `WorkflowActionFn`

A side-effect handler for a transition `action` or a state `onEnter` /
`onExit` hook. Registered by key via `registerAction` / `registerHook`. May
mutate `context.data`; a thrown error aborts the transition before it is
persisted.

```typescript
type WorkflowActionFn = (context: WorkflowContext) => void | Promise<void>
```

#### `WorkflowGuardFn`

A guard predicate gating a transition. Registered by key via `registerGuard`
and referenced by a transition's `guard` identifier. Returning a falsy value
BLOCKS the transition (reported by `transition()` as a
`WorkflowGuardRejectedError`).

```typescript
type WorkflowGuardFn = (context: WorkflowContext) => boolean | Promise<boolean>
```

### Classes

#### `WorkflowGuardRejectedError`

Thrown by `transition()` when a registered guard returns a falsy value and
blocks the transition. Distinct from a generic transition error so callers
can react to a *denied* transition (e.g. respond 403) rather than treat it
as a server fault. Carries the instance, action, and guard that produced it.

### Functions

#### `clearWorkflowHandlers()`

Clears every registered guard, action, and hook. Primarily for tests and
for re-configuring handlers from a clean slate.

```typescript
function clearWorkflowHandlers(): void
```

#### `getAction(key)`

Looks up a registered transition action handler.

```typescript
function getAction(key: string): WorkflowActionFn | undefined
```

- `key` — The action identifier.

**Returns:** The registered handler, or `undefined` if none is registered.

#### `getGuard(key)`

Looks up a registered guard predicate.

```typescript
function getGuard(key: string): WorkflowGuardFn | undefined
```

- `key` — The guard identifier.

**Returns:** The registered predicate, or `undefined` if none is registered.

#### `getHook(key)`

Looks up a registered state hook handler.

```typescript
function getHook(key: string): WorkflowActionFn | undefined
```

- `key` — The hook identifier.

**Returns:** The registered handler, or `undefined` if none is registered.

#### `hasAction(key)`

Reports whether a transition action is registered under `key`.

```typescript
function hasAction(key: string): boolean
```

- `key` — The action identifier.

**Returns:** `true` if an action handler is registered.

#### `hasGuard(key)`

Reports whether a guard is registered under `key`.

```typescript
function hasGuard(key: string): boolean
```

- `key` — The guard identifier.

**Returns:** `true` if a guard is registered.

#### `hasHook(key)`

Reports whether a state hook is registered under `key`.

```typescript
function hasHook(key: string): boolean
```

- `key` — The hook identifier.

**Returns:** `true` if a hook handler is registered.

#### `registerAction(key, fn)`

Registers a transition action handler under `key`. A transition whose
`action` identifier matches `key` runs this handler during the transition.
Re-registering the same key replaces the previous handler.

```typescript
function registerAction(key: string, fn: WorkflowActionFn): void
```

- `key` — The action identifier used in workflow definitions.
- `fn` — The side-effect handler to run during the transition.

#### `registerGuard(key, fn)`

Registers a guard predicate under `key`. A transition whose `guard`
identifier matches `key` runs this predicate; a falsy result blocks the
transition. Re-registering the same key replaces the previous predicate.

```typescript
function registerGuard(key: string, fn: WorkflowGuardFn): void
```

- `key` — The guard identifier used in workflow definitions.
- `fn` — The predicate deciding whether the transition may proceed.

#### `registerHook(key, fn)`

Registers a state hook handler under `key`. A state whose `onEnter` or
`onExit` identifier matches `key` runs this handler when entered/exited.
Re-registering the same key replaces the previous handler.

```typescript
function registerHook(key: string, fn: WorkflowActionFn): void
```

- `key` — The hook identifier used in workflow definitions.
- `fn` — The side-effect handler to run on state enter/exit.

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
- `guard` / `action` / `onEnter` / `onExit` in workflow definitions are
  string IDENTIFIERS that `transition()` EVALUATES against a pluggable
  handler registry — they are keys, never executable strings (no `eval`).
  Register named handlers at startup with `registerGuard`, `registerAction`,
  and `registerHook`. On a transition, `transition()` first runs the guard
  (a falsy result BLOCKS the transition with a `WorkflowGuardRejectedError`),
  then on success invokes `onExit` → `action` → `onEnter` in that order,
  threading a mutable {@link WorkflowContext} whose `data` is persisted. A
  referenced identifier with no registered handler is a misconfiguration and
  throws — it is never silently skipped. A definition with no guard/action/
  hook identifiers transitions exactly as before.
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
