/**
 * Svelte PaginationBar — page-window + "Showing X of Y" text + optional
 * page-size selector.
 *
 * Built on `Button` and `Select` from `@molecule/app-ui-svelte` so it inherits
 * the wired ClassMap styling. Apps drive the i18n noun via the `showingKey`
 * prop ("Showing 1 to 10 of 123 tags" vs. "…orders") — the key takes `start`,
 * `end`, and `total` interpolation values. It is the Svelte counterpart of
 * `@molecule/app-pagination-bar-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { PaginationBar } from '@molecule/app-pagination-bar-svelte'
 *
 *   let { total }: { total: number } = $props()
 *   let page = $state(1)
 *   let pageSize = $state(10)
 * </script>
 *
 * <PaginationBar
 *   {page}
 *   totalPages={Math.max(1, Math.ceil(total / pageSize))}
 *   {pageSize}
 *   {total}
 *   onPageChange={(next) => (page = next)}
 *   pageSizeOptions={[10, 25, 50]}
 *   onPageSizeChange={(size) => {
 *     pageSize = size
 *     page = 1
 *   }}
 * />
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-pagination-bar` (keys
 * `pagination.previous`, `pagination.next`, `pagination.pageSize`, plus your
 * `showingKey`). The page-size `Select` is hidden unless BOTH
 * `pageSizeOptions` and `onPageSizeChange` are supplied; when shown it wires
 * the `Select`'s typed `onValueChange` and parses the selected value to a
 * number, so `onPageSizeChange` always receives a real page size (e.g. `25`),
 * never `NaN`. Requires the Svelte binding's i18n context and a wired
 * ClassMap bond. Distinct from `@molecule/app-ui-svelte`'s lower-level
 * `Pagination` (page window only — no showing-text or size selector).
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
