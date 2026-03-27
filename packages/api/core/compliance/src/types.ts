/**
 * Type definitions for the compliance core interface.
 *
 * Defines the `ComplianceProvider` interface for GDPR and data compliance
 * operations including user data export, deletion, consent management,
 * and data processing logs. Bond packages implement this interface to
 * provide concrete compliance frameworks (GDPR, CCPA, etc.).
 *
 * @module
 */

/**
 * Supported data export formats.
 */
export type ExportFormat = 'json' | 'csv'

/**
 * Categories of user data that can be managed for compliance purposes.
 */
export type DataCategory =
  | 'profile'
  | 'activity'
  | 'preferences'
  | 'communications'
  | 'billing'
  | 'analytics'
  | 'content'
  | 'authentication'

/**
 * Legal bases for data processing under regulations like GDPR.
 */
export type LegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests'

/**
 * Status of a data deletion request.
 */
export type DeletionStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial'

/**
 * Configuration options for a compliance provider.
 */
export interface ComplianceConfig {
  /** Data retention period in days. */
  retentionDays?: number

  /** Whether to automatically purge expired data. */
  autoPurge?: boolean

  /** Data categories managed by this provider. */
  categories?: DataCategory[]
}

/**
 * Exported user data package.
 */
export interface UserDataExport {
  /** The user whose data was exported. */
  userId: string

  /** Timestamp when the export was generated. */
  exportedAt: Date

  /** Format of the exported data. */
  format: ExportFormat

  /** Exported data organized by category. */
  data: Record<string, unknown>

  /** Categories included in the export. */
  categories: DataCategory[]
}

/**
 * Options for user data deletion requests.
 */
export interface DeletionOptions {
  /** Specific data categories to delete (defaults to all). */
  categories?: DataCategory[]

  /** Whether to retain data required by legal obligations. */
  retainLegalObligations?: boolean

  /** Reason for the deletion request. */
  reason?: string
}

/**
 * Result of a data deletion request.
 */
export interface DeletionResult {
  /** The user whose data was deleted. */
  userId: string

  /** Current status of the deletion. */
  status: DeletionStatus

  /** Categories that were deleted. */
  deletedCategories: DataCategory[]

  /** Categories that were retained (e.g., for legal reasons). */
  retainedCategories: DataCategory[]

  /** Timestamp when the deletion was requested. */
  requestedAt: Date

  /** Timestamp when the deletion was completed (if applicable). */
  completedAt?: Date
}

/**
 * A single consent entry for a specific data processing purpose.
 */
export interface ConsentEntry {
  /** The purpose or category of data processing. */
  purpose: string

  /** Whether consent has been granted. */
  granted: boolean

  /** When consent was last updated. */
  updatedAt: Date

  /** Legal basis for processing. */
  legalBasis?: LegalBasis
}

/**
 * Full consent record for a user.
 */
export interface ConsentRecord {
  /** The user this consent record belongs to. */
  userId: string

  /** Individual consent entries by purpose. */
  consents: ConsentEntry[]

  /** When the consent record was last modified. */
  updatedAt: Date
}

/**
 * Update payload for modifying user consent.
 */
export interface ConsentUpdate {
  /** The purpose or category of data processing. */
  purpose: string

  /** Whether consent is being granted or revoked. */
  granted: boolean

  /** Legal basis for processing. */
  legalBasis?: LegalBasis
}

/**
 * A log entry recording a data processing activity.
 */
export interface ProcessingLogEntry {
  /** Unique identifier for the log entry. */
  id: string

  /** The user whose data was processed. */
  userId: string

  /** Description of the processing activity. */
  activity: string

  /** Data category that was processed. */
  category: DataCategory

  /** Legal basis for the processing. */
  legalBasis: LegalBasis

  /** Who or what performed the processing. */
  processor: string

  /** When the processing occurred. */
  timestamp: Date

  /** Additional details about the processing. */
  details?: Record<string, unknown>
}

/**
 * Compliance provider interface.
 *
 * All compliance providers must implement this interface to provide
 * data export, deletion, consent management, and processing log
 * capabilities required by data protection regulations.
 */
export interface ComplianceProvider {
  /**
   * Exports all data associated with a user in a portable format.
   *
   * @param userId - The identifier of the user whose data to export.
   * @param format - The export format (defaults to 'json').
   * @returns The exported user data package.
   */
  exportUserData(userId: string, format?: ExportFormat): Promise<UserDataExport>

  /**
   * Deletes user data according to the specified options. May retain
   * certain categories if required by legal obligations.
   *
   * @param userId - The identifier of the user whose data to delete.
   * @param options - Optional deletion parameters.
   * @returns The result of the deletion request.
   */
  deleteUserData(userId: string, options?: DeletionOptions): Promise<DeletionResult>

  /**
   * Retrieves the current consent record for a user.
   *
   * @param userId - The identifier of the user.
   * @returns The user's consent record.
   */
  getConsent(userId: string): Promise<ConsentRecord>

  /**
   * Updates consent for a specific data processing purpose.
   *
   * @param userId - The identifier of the user.
   * @param consent - The consent update to apply.
   */
  setConsent(userId: string, consent: ConsentUpdate): Promise<void>

  /**
   * Retrieves the data processing log for a user, showing all
   * recorded processing activities on their data.
   *
   * @param userId - The identifier of the user.
   * @returns Array of processing log entries.
   */
  getDataProcessingLog(userId: string): Promise<ProcessingLogEntry[]>
}
