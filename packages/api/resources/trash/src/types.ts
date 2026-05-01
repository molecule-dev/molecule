/**
 * Trash resource type definitions.
 *
 * Polymorphic soft-delete + restore + purge for any resource. Each trashed
 * item captures a snapshot of the original resource so it can be restored
 * verbatim. Active rows have `restoredAt = null` and `purgedAt = null`;
 * restored or purged rows are retained for audit but excluded from listings
 * by default.
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
 * A trashed (soft-deleted) item.
 *
 * Soft-delete writes a row here capturing a snapshot of the original
 * resource. Restore appends a `restoredAt` timestamp and re-creates the
 * resource from the snapshot via the caller's restore callback. Purge
 * stamps `purgedAt` and is irrecoverable.
 */
export interface TrashedItem {
  /** Unique trash row identifier. */
  id: string
  /** The type of resource that was trashed (e.g. `'document'`, `'project'`). */
  resourceType: string
  /** The original resource ID that was trashed. */
  resourceId: string
  /** The ID of the user who trashed the item, or `null` if system-generated. */
  userId: string | null
  /** Snapshot of the resource captured at the moment of trashing. */
  snapshot: JSONValue
  /** Optional human-readable reason (e.g. "user delete", "bulk cleanup"). */
  reason: string | null
  /** When the item was moved to trash (ISO 8601). */
  trashedAt: string
  /** Optional expiry timestamp; rows past this can be purged automatically. */
  expiresAt: string | null
  /** When the item was restored, or `null` if still in trash. */
  restoredAt: string | null
  /** ID of the user who restored the item, or `null`. */
  restoredBy: string | null
  /** When the item was permanently purged, or `null` if still recoverable. */
  purgedAt: string | null
}

/**
 * Input for soft-deleting (trashing) a resource.
 */
export interface TrashItemInput {
  /** The type of resource being trashed. */
  resourceType: string
  /** The ID of the resource being trashed. */
  resourceId: string
  /** Snapshot of the resource captured at trash time. */
  snapshot: JSONValue
  /** ID of the user trashing the item, or `null` for system-generated. */
  userId?: string | null
  /** Optional human-readable reason. */
  reason?: string | null
  /** Optional retention window in milliseconds; sets `expiresAt = now + ttl`. */
  ttlMs?: number | null
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
 * Filter options for listing trashed items.
 */
export interface ListTrashOptions extends PaginationOptions {
  /** Limit to a specific resource type. */
  resourceType?: string
  /** Limit to items trashed by a specific user. */
  userId?: string
  /**
   * Whether to include rows that have been restored or purged. Defaults to
   * `false` — only currently-trashed rows are returned.
   */
  includeInactive?: boolean
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

/**
 * A user-supplied callback that re-creates the original resource from a
 * snapshot during {@link restoreFromTrash}.
 *
 * The callback is responsible for whatever upsert logic the parent resource
 * needs (e.g. inserting via `@molecule/api-database`'s `create`, or calling
 * a domain-specific service). The trash service does not touch the parent
 * resource directly — it only manages the trash row's lifecycle.
 *
 * @param snapshot - The snapshot captured at trash time.
 * @param trashedItem - The trash row being restored, for context.
 * @returns Promise resolving when restoration is complete.
 */
export type RestoreCallback = (snapshot: JSONValue, trashedItem: TrashedItem) => Promise<void>

/**
 * Outcome of attempting to restore a trashed item.
 */
export interface RestoreResult {
  /** The trash row after `restoredAt` has been stamped. */
  trashedItem: TrashedItem
  /** Whether the supplied callback ran without throwing. */
  callbackSucceeded: boolean
}
