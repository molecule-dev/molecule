/**
 * Database workflow provider types.
 *
 * Internal database row types used by the database-backed workflow provider.
 *
 * @module
 */

/**
 * Database row for a persisted workflow definition.
 */
export interface WorkflowRow {
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
  /** JSON-serialized instance data. */
  data: string
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
  /** JSON-serialized data snapshot, or null. */
  data: string | null
  /** Event timestamp. */
  createdAt: string
}
