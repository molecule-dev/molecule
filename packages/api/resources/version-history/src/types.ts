/**
 * Version history resource type definitions.
 *
 * Polymorphic, append-only snapshots of any resource. Each version captures
 * a full snapshot plus an optional shallow diff against the prior version,
 * so consumers can rebuild a timeline, render a diff, or restore a prior
 * snapshot without ever issuing raw SQL.
 *
 * @module
 */

/**
 * A JSON-serializable snapshot value. Constrained by what the underlying
 * `JSONB` column can accept.
 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }

/**
 * A point-in-time snapshot of a resource.
 *
 * Versions are append-only. A new row is created each time the resource
 * changes; old rows are never mutated.
 */
export interface Version {
  /** Unique version identifier. */
  id: string
  /** The type of resource this version belongs to (e.g. `'document'`, `'project'`). */
  resourceType: string
  /** The ID of the resource this version belongs to. */
  resourceId: string
  /** The monotonically-increasing version number for this resource (1-based). */
  version: number
  /** The ID of the user who created this version, or `null` if system-generated. */
  userId: string | null
  /** Full snapshot of the resource at this point in time. */
  snapshot: JSONValue
  /** Shallow diff against the previous version, or `null` if this is the first version. */
  changes: VersionChanges | null
  /** Optional human-readable reason for this version (e.g. commit message). */
  reason: string | null
  /** When this version was created (ISO 8601). */
  createdAt: string
}

/**
 * Per-field change record for a single key. `before` is the previous value,
 * `after` is the new value. Either may be `undefined` for added/removed fields.
 */
export interface VersionFieldChange {
  /** Previous value (`undefined` if the field was added). */
  before?: JSONValue
  /** New value (`undefined` if the field was removed). */
  after?: JSONValue
}

/**
 * Shallow per-field diff between two snapshots, keyed by field name.
 */
export type VersionChanges = Record<string, VersionFieldChange>

/**
 * Input for creating a new version.
 */
export interface CreateVersionInput {
  /** The type of resource being versioned. */
  resourceType: string
  /** The ID of the resource being versioned. */
  resourceId: string
  /** Full snapshot of the resource. */
  snapshot: JSONValue
  /** ID of the user creating this version, or `null` for system-generated versions. */
  userId?: string | null
  /** Optional human-readable reason. */
  reason?: string | null
}

/**
 * Result of comparing two versions of the same resource.
 */
export interface VersionDiff {
  /** The earlier version. */
  from: Version
  /** The later version. */
  to: Version
  /** Per-field changes between `from.snapshot` and `to.snapshot`. */
  changes: VersionChanges
}

/**
 * Options for paginated queries.
 */
export interface PaginationOptions {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
}

/**
 * A paginated result set.
 */
export interface PaginatedResult<T> {
  /** The result items for the current page. */
  data: T[]
  /** Total number of matching items across all pages. */
  total: number
  /** Maximum number of results per page. */
  limit: number
  /** Number of results skipped. */
  offset: number
}
