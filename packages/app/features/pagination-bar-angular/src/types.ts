/**
 * Types of `@molecule/app-pagination-bar-angular` — the Angular counterpart of
 * `@molecule/app-pagination-bar-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link PaginationBar} — the same props
 * `@molecule/app-pagination-bar-react` accepts. The callback props are inputs
 * of the same (React) name, so a host template binds them with
 * `[onPageChange]`.
 */
export interface PaginationBarProps {
  /** Current page (1-indexed). */
  page: number
  /** Total page count (>= 1). */
  totalPages: number
  /** Items per page. */
  pageSize: number
  /** Total item count across all pages. */
  total: number
  /** Called when the user changes page. */
  onPageChange: (page: number) => void
  /** Called when the user changes page-size (when allowed via `pageSizeOptions`). */
  onPageSizeChange?: (size: number) => void
  /** Available page-size options. When omitted, the size selector is hidden. */
  pageSizeOptions?: number[]
  /** i18n key for the "Showing X to Y of Z items" text — takes interpolation vars `start`, `end`, `total`. */
  showingKey?: string
  /** Default English fallback for the showing text. */
  showingDefault?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}
