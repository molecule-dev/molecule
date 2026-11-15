/**
 * Angular detail-page header — the counterpart of
 * `@molecule/app-detail-header-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<DetailHeader>` — leading slot + title/subtitle + status +
 * right-aligned actions, with an optional meta row and an optional search
 * slot. Different from `<PageHeader>` (top of list/index pages) in
 * prioritising status + search + stickiness for long-scrolling detail
 * screens.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { DetailHeader } from '@molecule/app-detail-header-angular'
 * import { StatusBadge } from '@molecule/app-status-badge-angular'
 *
 * @Component({
 *   selector: 'app-order-header',
 *   standalone: true,
 *   imports: [DetailHeader, StatusBadge],
 *   template: `
 *     <header mol-detail-header title="Project Alpha" subtitle="Last updated 2 hours ago" sticky>
 *       <app-status-badge slot="status" kind="success">Active</app-status-badge>
 *       <button slot="actions" type="button" (click)="handleEdit()">Edit</button>
 *       <span slot="meta">Owner: Alice</span>
 *     </header>
 *   `,
 * })
 * export class OrderHeader {}
 * ```
 *
 * @remarks
 * - `sticky` applies `position: sticky; top: 0` but adds NO background —
 *   pass a surface class via `className` (e.g. your ClassMap's surface
 *   helper) or content will scroll visibly through the header.
 * - There is no breadcrumb prop; put a breadcrumb in the `leading` slot or
 *   render one above the header (see
 *   `@molecule/app-detail-page-layout-react`, which has a breadcrumb slot).
 * - Node props are projected content: `title`, `subtitle`, `leading`,
 *   `status`, `actions`, `meta` and `search` are selected by
 *   `[slot=<name>]`; plain strings may also be passed as inputs.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup). No text of its own, so no locale
 *   bond is needed; translate the values you pass in.
 *
 * @module
 */

export * from './detail-header.component.js'
export * from './types.js'
