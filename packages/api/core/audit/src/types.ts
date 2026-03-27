/**
 * Type definitions for the audit core interface.
 *
 * Defines the `AuditProvider` interface for recording and querying audit trail
 * entries. Bond packages implement this interface to provide concrete audit
 * storage (database, file, external service, etc.).
 *
 * @module
 */

/**
 * An audit trail entry to be recorded.
 */
export interface AuditEntry {
  /** The entity performing the action (e.g. user ID, system identifier). */
  actor: string

  /** The action performed (e.g. `create`, `update`, `delete`, `login`). */
  action: string

  /** The type of resource acted upon (e.g. `project`, `user`, `setting`). */
  resource: string

  /** Optional identifier of the specific resource instance. */
  resourceId?: string

  /** Optional additional details about the action. */
  details?: Record<string, unknown>

  /** Optional IP address of the request origin. */
  ip?: string

  /** Optional user agent string of the request origin. */
  userAgent?: string
}

/**
 * A persisted audit record with server-assigned metadata.
 */
export interface AuditRecord extends AuditEntry {
  /** Unique identifier for this audit record. */
  id: string

  /** Timestamp when the audit record was created. */
  timestamp: Date
}

/**
 * Query options for filtering and paginating audit records.
 */
export interface AuditQuery {
  /** Filter by actor identifier. */
  actor?: string

  /** Filter by action type. */
  action?: string

  /** Filter by resource type. */
  resource?: string

  /** Filter by specific resource instance identifier. */
  resourceId?: string

  /** Include only records created at or after this date. */
  startDate?: Date

  /** Include only records created at or before this date. */
  endDate?: Date

  /** Page number for pagination (1-based). */
  page?: number

  /** Number of records per page. */
  perPage?: number
}

/**
 * Paginated result set for audit queries.
 */
export interface PaginatedResult<T> {
  /** The records for the current page. */
  data: T[]

  /** Total number of records matching the query. */
  total: number

  /** Current page number (1-based). */
  page: number

  /** Number of records per page. */
  perPage: number

  /** Total number of pages. */
  totalPages: number
}

/**
 * Supported export formats for audit data.
 */
export type AuditExportFormat = 'csv' | 'json'

/**
 * Audit provider interface.
 *
 * All audit providers must implement this interface to provide audit trail
 * recording, querying, and export capabilities.
 */
export interface AuditProvider {
  /**
   * Records an audit trail entry.
   *
   * @param entry - The audit entry to record.
   */
  log(entry: AuditEntry): Promise<void>

  /**
   * Queries audit records with optional filtering and pagination.
   *
   * @param options - Query filters and pagination options.
   * @returns A paginated result set of audit records.
   */
  query(options: AuditQuery): Promise<PaginatedResult<AuditRecord>>

  /**
   * Exports audit records matching the query in the specified format.
   *
   * @param options - Query filters for the records to export.
   * @param format - The export format (`csv` or `json`).
   * @returns A `Buffer` containing the exported data.
   */
  export(options: AuditQuery, format: AuditExportFormat): Promise<Buffer>
}
