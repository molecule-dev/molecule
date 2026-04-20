/**
 * Standardised response helpers for consistent API output shapes.
 *
 * @module
 */

/**
 * Shape of a paginated list response.
 */
export interface PaginatedResponse<T> {
  /** The page of results. */
  data: T[]
  /** Pagination metadata. */
  pagination: {
    /** Current page number. */
    page: number
    /** Items per page. */
    perPage: number
    /** Total number of items across all pages. */
    total: number
    /** Total number of pages. */
    totalPages: number
    /** Whether more pages exist after the current one. */
    hasMore: boolean
  }
}

/**
 * Wraps a list of items with pagination metadata.
 *
 * @param data - The items for the current page.
 * @param total - Total item count across all pages.
 * @param page - Current page number (1-based).
 * @param perPage - Number of items per page.
 * @returns A `PaginatedResponse` object.
 */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  perPage: number,
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      hasMore: page * perPage < total,
    },
  }
}

/**
 * Wraps a value in a standard `{ data }` envelope.
 *
 * @param data - The payload to wrap.
 * @returns An object with a single `data` key.
 */
export function success<T>(data: T): { data: T } {
  return { data }
}

/**
 * Creates a standard error response object.
 *
 * @param message - Top-level error message.
 * @param errors - Optional array of field-level errors.
 * @returns An error response object.
 */
export function error(
  message: string,
  errors?: Array<{ field: string; message: string }>,
): { error: string; errors?: Array<{ field: string; message: string }> } {
  return { error: message, ...(errors ? { errors } : {}) }
}
