/**
 * Angular PaginationBar — page-window + "Showing X of Y" text + optional
 * page-size selector.
 *
 * Built on the `Button` and `Select` components from
 * `@molecule/app-ui-angular` so it inherits the wired ClassMap styling. Apps
 * drive the i18n noun via the `showingKey` input ("Showing 1 to 10 of 123
 * tags" vs. "…orders") — the key takes `start`, `end`, and `total`
 * interpolation values. It is the Angular counterpart of
 * `@molecule/app-pagination-bar-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { PaginationBar } from '@molecule/app-pagination-bar-angular'
 *
 * @Component({
 *   selector: 'app-order-list',
 *   standalone: true,
 *   imports: [PaginationBar],
 *   template: `
 *     <div
 *       mol-pagination-bar
 *       [page]="page()"
 *       [totalPages]="totalPages()"
 *       [pageSize]="pageSize()"
 *       [total]="total()"
 *       [onPageChange]="setPage"
 *       [pageSizeOptions]="[10, 25, 50]"
 *       [onPageSizeChange]="changePageSize"
 *     ></div>
 *   `,
 * })
 * export class OrderList {
 *   readonly total = signal(123)
 *   readonly page = signal(1)
 *   readonly pageSize = signal(10)
 *   readonly totalPages = () => Math.max(1, Math.ceil(this.total() / this.pageSize()))
 *   readonly setPage = (next: number) => this.page.set(next)
 *   readonly changePageSize = (size: number) => {
 *     this.pageSize.set(size)
 *     this.page.set(1)
 *   }
 * }
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-pagination-bar` (keys
 * `pagination.previous`, `pagination.next`, `pagination.pageSize`, plus your
 * `showingKey`). The page-size `Select` is hidden unless BOTH
 * `pageSizeOptions` and `onPageSizeChange` are supplied; when shown it wires
 * the `Select`'s typed `valueChange` output and parses the selected value to a
 * number, so `onPageSizeChange` always receives a real page size (e.g. `25`),
 * never `NaN`. Requires the binding's i18n providers and a wired ClassMap
 * bond. Distinct from `@molecule/app-ui-angular`'s lower-level `Pagination`
 * (page window only — no showing-text or size selector).
 *
 * @module
 */

export * from './pagination-bar.component.js'
export * from './types.js'
