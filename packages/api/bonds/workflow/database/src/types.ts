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
