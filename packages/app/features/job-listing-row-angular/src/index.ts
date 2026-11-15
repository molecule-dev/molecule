/**
 * Angular job-board listing row — the counterpart of
 * `@molecule/app-job-listing-row-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `JobListingRow` — title + company + location + employment type +
 * salary + posted date, with optional leading logo, tag chips, and
 * right-side actions.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { JobListingRow } from '@molecule/app-job-listing-row-angular'
 *
 * @Component({
 *   selector: 'app-root',
 *   standalone: true,
 *   imports: [JobListingRow],
 *   template: `
 *     <div
 *       mol-job-listing-row
 *       title="Senior Frontend Engineer"
 *       company="Acme Corp"
 *       location="Remote · US"
 *       type="Full-time"
 *       salary="$130k–$160k"
 *       postedAt="2 days ago"
 *       [onClick]="openJob"
 *     >
 *       <button slot="actions" type="button">Apply</button>
 *     </div>
 *   `,
 * })
 * export class App {
 *   openJob(): void {
 *     // navigate to the job…
 *   }
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * The location value is prefixed with a hardcoded 📍 glyph and the meta
 * fields are joined with literal middle-dot separators; there is no prop to
 * change or localise those separators.
 *
 * `onClick` makes the whole row clickable but the root is a plain `<div>`
 * with no `role`, `tabIndex`, or keyboard handler — keyboard users can only
 * reach whatever you pass in `actions`. Put a real link or button in
 * `actions` when the row is the primary navigation affordance.
 *
 * Node-valued props are projected content: `title`, `company`, `location`,
 * `type`, `salary`, `postedAt`, `leading`, `tags` and `actions` are selected
 * by `[slot=<name>]`; string inputs render as text with React's truthiness
 * branch (an empty string renders nothing).
 *
 * @module
 */

export * from './job-listing-row.component.js'
export * from './types.js'
