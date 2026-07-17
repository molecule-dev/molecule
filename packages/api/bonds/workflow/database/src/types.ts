/**
 * Database workflow provider types.
 *
 * Internal database row types plus the guard/action/hook evaluation contracts
 * used by the database-backed workflow provider.
 *
 * @module
 */

import type { Workflow } from '@molecule/api-workflow'

/**
 * Execution context threaded through a guard, transition action, and state
 * hooks during a single `transition()`. Handlers may READ every field; only
 * `data` is mutable — an action/hook may add or change fields and the final
 * value is what gets persisted to the instance. Guards should treat `data` as
 * read-only (mutations before a guard blocks the transition are discarded).
 */
export interface WorkflowContext {
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

/**
 * A guard predicate gating a transition. Registered by key via `registerGuard`
 * and referenced by a transition's `guard` identifier. Returning a falsy value
 * BLOCKS the transition (reported by `transition()` as a
 * `WorkflowGuardRejectedError`).
 *
 * @param context - The transition context.
 * @returns `true` to allow the transition, a falsy value to block it.
 */
export type WorkflowGuardFn = (context: WorkflowContext) => boolean | Promise<boolean>

/**
 * A side-effect handler for a transition `action` or a state `onEnter` /
 * `onExit` hook. Registered by key via `registerAction` / `registerHook`. May
 * mutate `context.data`; a thrown error aborts the transition before it is
 * persisted.
 *
 * @param context - The transition context.
 */
export type WorkflowActionFn = (context: WorkflowContext) => void | Promise<void>

/**
 * Database row for a persisted workflow definition.
 */
export interface WorkflowRow {
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

/**
 * Database row for a workflow instance.
 */
export interface WorkflowInstanceRow {
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

/**
 * Database row for a workflow event.
 */
export interface WorkflowEventRow {
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
