/**
 * Angular vertical ordered-step status timeline.
 *
 * Exports `<StatusTimeline>` — render a list of steps with colored dots
 * indicating reached state and bolded label on the current step. Generic
 * for orders, workflows, kanban progressions, etc. It is the Angular
 * counterpart of `@molecule/app-status-timeline-react`: same props and the
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { StatusTimeline } from '@molecule/app-status-timeline-angular'
 *
 * @Component({
 *   selector: 'order-progress',
 *   standalone: true,
 *   imports: [StatusTimeline],
 *   template: `
 *     <ol
 *       mol-status-timeline
 *       [steps]="steps"
 *       [currentKey]="'shipped'"
 *       [ariaLabel]="'Order status'"
 *     ></ol>
 *   `,
 * })
 * export class OrderProgress {
 *   steps = [
 *     { key: 'placed', label: 'Order Placed' },
 *     { key: 'processing', label: 'Processing' },
 *     { key: 'shipped', label: 'Shipped' },
 *     { key: 'delivered', label: 'Delivered' },
 *   ]
 * }
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding). No i18n dependency — pass pre-translated `label` strings
 *   and a translated `ariaLabel`.
 * - If `currentKey` matches no step, EVERY step renders as unreached —
 *   there is no error; double-check the key values.
 * - Reached dots use `bg-primary` (works with the scaffold theme);
 *   unreached dots use `bg-outline-variant` and row spacing uses
 *   `space-y-2` — both are Material-3/raw utilities that the minimal
 *   scaffold theme does not generate, so unreached dots can be invisible
 *   and rows unspaced outside flagship-derived themes.
 * - Vertical list only; for a horizontal stage rail use
 *   `@molecule/app-stage-timeline-angular`.
 *
 * @module
 */

export * from './status-timeline.component.js'
export * from './types.js'
