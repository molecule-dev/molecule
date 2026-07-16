/**
 * React PaginationBar — page-window + "Showing X of Y" text + optional
 * page-size selector.
 *
 * Built on `<Button>` and `<Select>` from `@molecule/app-ui-react` so it
 * inherits the wired ClassMap styling. Apps drive the i18n noun via the
 * `showingKey` prop ("Showing 1 to 10 of 123 tags" vs. "…orders") — the key
 * takes `start`, `end`, and `total` interpolation values.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { PaginationBar } from '@molecule/app-pagination-bar-react'
 *
 * function OrderList({ total }: { total: number }) {
 *   const [page, setPage] = useState(1)
 *   const [pageSize, setPageSize] = useState(10)
 *   return (
 *     <PaginationBar
 *       page={page}
 *       totalPages={Math.max(1, Math.ceil(total / pageSize))}
 *       pageSize={pageSize}
 *       total={total}
 *       onPageChange={setPage}
 *       pageSizeOptions={[10, 25, 50]}
 *       onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-pagination-bar` (keys
 * `pagination.previous`, `pagination.next`, `pagination.pageSize`, plus your
 * `showingKey`). The page-size `<Select>` is hidden unless BOTH
 * `pageSizeOptions` and `onPageSizeChange` are supplied. KNOWN ISSUE: the
 * page-size selector currently wires the `<Select>`'s `onChange` (which
 * receives the DOM event) instead of `onValueChange`, so every selection
 * calls `onPageSizeChange` with `NaN` and corrupts the paginator — until the
 * tracked one-line code fix lands, omit `pageSizeOptions`/`onPageSizeChange`
 * (hiding the selector) rather than relying on it. Requires the app-react
 * i18n provider and a wired ClassMap bond. Distinct from
 * `@molecule/app-ui-react`'s lower-level `<Pagination>` (page window only —
 * no showing-text or size selector).
 *
 * @module
 */

export * from './PaginationBar.js'
