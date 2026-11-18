/**
 * Angular vertical activity timeline — the counterpart of
 * `@molecule/app-activity-timeline-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * A vertical timeline of events (calls, emails, meetings, deal stages,
 * shipment hops, milestones).
 *
 * Sister package to `@molecule/app-activity-feed-angular` (which is a flat
 * avatar-prose list). Use this one when the chronological sequencing of events
 * is the main affordance — connector line + dots make ordering obvious at a
 * glance.
 *
 * Extracted from the crm and employee-onboarding flagships.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   ActivityTimeline,
 *   type TimelineEventData,
 * } from '@molecule/app-activity-timeline-angular'
 *
 * @Component({
 *   selector: 'app-activity',
 *   standalone: true,
 *   imports: [ActivityTimeline],
 *   template: `
 *     <div mol-activity-timeline [events]="events" [toneByKind]="tones">
 *       <header slot="header">Today</header>
 *     </div>
 *   `,
 * })
 * export class ActivityPage {
 *   events: TimelineEventData[] = []
 *   tones = {
 *     call: { icon: 'call', dotClass: 'bg-primary', iconClass: 'text-on-primary' },
 *     email: { icon: 'mail', dotClass: 'bg-secondary' },
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`); rendering throws otherwise.
 * - Node props are projected content (`[slot=header]`, `[slot=footer]`) or
 *   template-reference inputs; node-valued event fields (`title`,
 *   `description`, `meta`, `footer`) are template references or plain text.
 * - `rowWrapper` is a template reference called with the event (`a0`) and the
 *   row's own content (`a1`), as React's render prop is; its result replaces
 *   the row's content, so a wrapper that shows the row renders the `a1`
 *   template it is given.
 * - Rows are tracked by `event.id` (`@for (… ; track event.id)`), so a
 *   re-passed or re-ordered event list keeps each row's DOM the way React's
 *   `key` does.
 *
 * @module
 */

export * from './activity-timeline.component.js'
export * from './activity-timeline-dot.component.js'
export * from './activity-timeline-row.component.js'
export * from './types.js'
