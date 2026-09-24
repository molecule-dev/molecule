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
 *
 * import { PaginationBar } from '@molecule/app-pagination-bar-react'
 *
 * const orders = Array.from({ length: 123 }, (_, i) => ({ id: `ord-${i + 1}`, total: 20 + i }))
 *
 * export function OrderList() {
 *   const [page, setPage] = useState(1) // 1-indexed
 *   const [pageSize, setPageSize] = useState(10)
 *   const totalPages = Math.max(1, Math.ceil(orders.length / pageSize))
 *   const visible = orders.slice((page - 1) * pageSize, page * pageSize)
 *   return (
 *     <section>
 *       <ul>{visible.map((o) => <li key={o.id}>{`${o.id} — $${o.total}`}</li>)}</ul>
 *       <PaginationBar
 *         page={page}
 *         totalPages={totalPages}
 *         pageSize={pageSize}
 *         total={orders.length}
 *         onPageChange={setPage}
 *         pageSizeOptions={[10, 25, 50]}
 *         onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
 *       />
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * It is CONTROLLED and slices nothing: keep `page` (1-indexed, not 0) in your state, compute
 * `totalPages` yourself, and render only the current page's rows. It does not reset `page`
 * when the size changes — do that in `onPageSizeChange` as above. Needs an icon set
 * (`setIconSet(iconSet)` from `@molecule/app-icons`) when the size `<Select>` renders — its
 * chevron icon throws without one.
 *
 * Companion locale bond: `@molecule/app-locales-pagination-bar` (keys
 * `pagination.previous`, `pagination.next`, `pagination.pageSize`). It does NOT ship the
 * default `pagination.showing` key, so the "Showing X to Y of Z items" line stays English
 * unless your app registers that key (or passes its own `showingKey`). The page-size `<Select>` is hidden unless BOTH
 * `pageSizeOptions` and `onPageSizeChange` are supplied; when shown it wires
 * the `<Select>`'s typed `onValueChange` and parses the selected value to a
 * number, so `onPageSizeChange` always receives a real page size (e.g. `25`),
 * never `NaN`. Requires the app-react i18n provider and a wired ClassMap bond.
 * Distinct from `@molecule/app-ui-react`'s lower-level `<Pagination>` (page
 * window only — no showing-text or size selector).
 *
 * @module
 */

export * from './PaginationBar.js'
