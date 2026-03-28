/**
 * Content moderation type definitions.
 *
 * Defines the contract for AI-powered content moderation and user reporting.
 * A bond implementation (e.g., using `@molecule/api-ai`) provides the
 * concrete checking logic and report persistence.
 *
 * @module
 */

/**
 * Category of content violation detected during moderation.
 */
export type ModerationCategory =
  | 'hate'
  | 'violence'
  | 'sexual'
  | 'self-harm'
  | 'harassment'
  | 'dangerous'
  | 'spam'
  | 'custom'

/**
 * Per-category result from a moderation check.
 */
export interface ModerationCategoryResult {
  /** The category that was evaluated. */
  category: string
  /** Whether the content was flagged in this category. */
  flagged: boolean
  /** Confidence score between 0 and 1. */
  score: number
}

/**
 * Result of checking content against moderation rules.
 */
export interface ModerationResult {
  /** Whether the content was flagged by any category. */
  flagged: boolean
  /** Per-category breakdown of the moderation result. */
  categories: ModerationCategoryResult[]
  /** Optional reasoning explaining why content was or was not flagged. */
  reasoning?: string
}

/**
 * Options for configuring a moderation check.
 */
export interface ModerationOptions {
  /** Limit checking to specific categories. Defaults to all categories. */
  categories?: string[]
  /** Score threshold above which content is flagged (0–1). Defaults to provider-specific value. */
  threshold?: number
  /** Additional context to help the moderation model make a decision. */
  context?: string
}

/**
 * Status of a user-submitted report.
 */
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'

/**
 * A user-submitted report against a resource.
 */
export interface Report {
  /** Unique report identifier. */
  id: string
  /** The type of resource being reported (e.g. 'comment', 'post'). */
  resourceType: string
  /** The ID of the resource being reported. */
  resourceId: string
  /** The ID of the user who submitted the report. */
  reporterId: string
  /** The reason for the report. */
  reason: string
  /** Current status of the report. */
  status: ReportStatus
  /** Resolution details, if resolved. */
  resolution?: string
  /** ID of the moderator who resolved the report. */
  resolvedBy?: string
  /** When the report was created (ISO 8601). */
  createdAt: string
  /** When the report was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Input for creating a new report.
 */
export interface CreateReportInput {
  /** The type of resource being reported. */
  resourceType: string
  /** The ID of the resource being reported. */
  resourceId: string
  /** The ID of the user submitting the report. */
  reporterId: string
  /** The reason for the report. */
  reason: string
}

/**
 * Resolution action for a moderation report.
 */
export interface Resolution {
  /** The action taken on the report. */
  action: 'approve' | 'reject' | 'dismiss'
  /** Optional reason for the resolution. */
  reason?: string
  /** ID of the moderator who resolved the report. */
  resolvedBy: string
}

/**
 * Query options for fetching reports.
 */
export interface ReportQuery {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
  /** Filter by report status. */
  status?: ReportStatus
  /** Filter by resource type. */
  resourceType?: string
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

/**
 * Content moderation provider interface.
 *
 * Implement this interface in a bond package to provide concrete
 * content moderation (e.g., via `@molecule/api-ai`) and report
 * management (e.g., via `@molecule/api-database`).
 */
export interface ContentModerationProvider {
  /** Provider name (e.g. 'ai-moderation', 'perspective-api'). */
  readonly name: string

  /**
   * Checks text content against moderation rules.
   *
   * @param content - The text content to check.
   * @param options - Optional moderation configuration.
   * @returns The moderation result with per-category scores.
   */
  check(content: string, options?: ModerationOptions): Promise<ModerationResult>

  /**
   * Checks image content against moderation rules.
   *
   * @param image - The image data as a byte array.
   * @param options - Optional moderation configuration.
   * @returns The moderation result with per-category scores.
   */
  checkImage(image: Uint8Array, options?: ModerationOptions): Promise<ModerationResult>

  /**
   * Submits a user report against a resource.
   *
   * @param input - The report creation input.
   * @returns The created report.
   */
  report(input: CreateReportInput): Promise<Report>

  /**
   * Retrieves reports with optional filtering and pagination.
   *
   * @param options - Query and pagination options.
   * @returns A paginated result of reports.
   */
  getReports(options?: ReportQuery): Promise<PaginatedResult<Report>>

  /**
   * Resolves a pending report with a moderation decision.
   *
   * @param reportId - The ID of the report to resolve.
   * @param resolution - The resolution action and details.
   */
  resolveReport(reportId: string, resolution: Resolution): Promise<void>
}

/**
 * Configuration for the content moderation provider.
 */
export interface ContentModerationConfig {
  /** Default score threshold above which content is flagged (0–1). */
  threshold?: number
  /** Categories to check by default. */
  defaultCategories?: string[]
  /** Whether to include reasoning in moderation results. */
  includeReasoning?: boolean
}
