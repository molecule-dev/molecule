/**
 * Solid PaginationBar — page-window + "Showing X of Y" text + optional
 * page-size selector.
 *
 * Built on `Button` and `Select` from `@molecule/app-ui-solid` so it inherits
 * the wired ClassMap styling. Apps drive the i18n noun via the `showingKey`
 * prop ("Showing 1 to 10 of 123 tags" vs. "…orders") — the key takes `start`,
 * `end`, and `total` interpolation values. It is the Solid counterpart of
 * `@molecule/app-pagination-bar-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { PaginationBar } from '@molecule/app-pagination-bar-solid'
 *
 * function OrderList(props: { total: number }) {
 *   const [page, setPage] = createSignal(1)
 *   const [pageSize, setPageSize] = createSignal(10)
 *   return (
 *     <PaginationBar
 *       page={page()}
 *       totalPages={Math.max(1, Math.ceil(props.total / pageSize()))}
 *       pageSize={pageSize()}
 *       total={props.total}
 *       onPageChange={setPage}
 *       pageSizeOptions={[10, 25, 50]}
 *       onPageSizeChange={(size) => {
 *         setPageSize(size)
 *         setPage(1)
 *       }}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-pagination-bar` (keys
 * `pagination.previous`, `pagination.next`, `pagination.pageSize`, plus your
 * `showingKey`). The page-size `Select` is hidden unless BOTH
 * `pageSizeOptions` and `onPageSizeChange` are supplied; when shown it wires
 * the `Select`'s typed `onValueChange` and parses the selected value to a
 * number, so `onPageSizeChange` always receives a real page size (e.g. `25`),
 * never `NaN`. Requires the Solid binding's i18n provider and a wired
 * ClassMap bond. Distinct from `@molecule/app-ui-solid`'s lower-level
 * `Pagination` (page window only — no showing-text or size selector).
 *
 * @module
 */

export * from './PaginationBar.jsx'
export * from './types.js'
