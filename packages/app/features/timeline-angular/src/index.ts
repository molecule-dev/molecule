/**
 * Angular chronological timeline primitives.
 *
 * Exports:
 * - `<mol-timeline>` / `Timeline` — vertical list of events with optional date separators.
 * - `<div mol-timeline-event>` / `TimelineEvent` — one event row with rail (marker + connector) + content.
 * - `<div mol-timeline-rail>` / `TimelineRail` — standalone rail (marker + connector) for custom rows.
 * - `<div mol-timeline-date>` / `TimelineDate` — date separator rendered between groups.
 * - `TimelineEventData` type for event records.
 *
 * Use for activity chronologies, deal timelines, order tracking, audit logs.
 * It is the Angular counterpart of `@molecule/app-timeline-react`: the same
 * props (React names) and the same DOM for the same input, so switching
 * framework is changing the package name in the imports.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { Timeline, TimelineDate } from '@molecule/app-timeline-angular'
 *
 * @Component({
 *   selector: 'app-activity',
 *   standalone: true,
 *   imports: [Timeline, TimelineDate],
 *   template: `
 *     <mol-timeline [events]="events">
 *       <p slot="emptyState">No activity yet.</p>
 *     </mol-timeline>
 *   `,
 * })
 * export class Activity {
 *   events = [
 *     { id: '1', timestamp: '2 hours ago', title: 'Order placed' },
 *     { id: '2', timestamp: 'Yesterday', title: 'Payment confirmed', body: 'Visa ending 4242' },
 *     { id: '3', timestamp: 'Mar 12', title: 'Item shipped' },
 *   ]
 * }
 * ```
 *
 * @remarks
 * This is NOT the Angular binding for `@molecule/app-timeline` (the headless
 * provider core wired via `setProvider`) — it is standalone presentational
 * markup with no provider. For domain-specific rows see the sibling packages
 * `@molecule/app-activity-timeline-angular`, `@molecule/app-order-timeline-angular`,
 * `@molecule/app-status-timeline-angular`, `@molecule/app-stage-timeline-angular` and
 * `@molecule/app-day-timeline-angular`.
 *
 * `TimelineEventData.accent` is currently INERT — no component reads it, so
 * setting it changes nothing; color a row by passing a custom `marker` node
 * instead. `timestamp` is a display node — format/translate it before
 * passing. Node-valued props are `ng-template` references; `Timeline`'s root is
 * a fragment in its empty branch, so its content renders in the host's place
 * and the host itself leaves the page, and rows
 * are tracked by the event's `id`, like React's keys. The prop surface
 * (documented on the exported `TimelineProps`, `TimelineEventProps`,
 * `TimelineRailProps` and `TimelineDateProps` interfaces):
 * Timeline(events, renderDateSeparator, emptyState, className),
 * TimelineEvent(event, isLast, className), TimelineRail(marker, connector,
 * className), TimelineDate(children, className).
 *
 * @module
 */

export * from './timeline.component.js'
export * from './timeline-date.component.js'
export * from './timeline-event.component.js'
export * from './timeline-rail.component.js'
export * from './types.js'
