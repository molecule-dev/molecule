/**
 * React chronological timeline primitives.
 *
 * Exports:
 * - `<Timeline>` — vertical list of events with optional date separators.
 * - `<TimelineEvent>` — one event row with rail (marker + connector) + content.
 * - `<TimelineRail>` — standalone rail (marker + connector) for custom rows.
 * - `<TimelineDate>` — date separator rendered between groups.
 * - `TimelineEventData` type for event records.
 *
 * Use for activity chronologies, deal timelines, order tracking, audit logs.
 *
 * @example
 * ```tsx
 * import { Timeline, TimelineDate } from '@molecule/app-timeline-react'
 *
 * <Timeline
 *   events={[
 *     { id: '1', timestamp: '2 hours ago', title: 'Order placed' },
 *     { id: '2', timestamp: 'Yesterday', title: 'Payment confirmed', body: 'Visa ending 4242' },
 *     { id: '3', timestamp: 'Mar 12', title: 'Item shipped' },
 *   ]}
 *   renderDateSeparator={(event, prev) =>
 *     !prev ? <TimelineDate>{event.timestamp}</TimelineDate> : null
 *   }
 *   emptyState={<p>No activity yet.</p>}
 * />
 * ```
 *
 * @remarks
 * This is NOT the React binding for `@molecule/app-timeline` (the headless
 * provider core wired via `setProvider`) — it is standalone presentational
 * markup with no provider. For domain-specific rows see the sibling
 * `@molecule/app-{activity,order,status,stage,day}-timeline-react` packages.
 *
 * `TimelineEventData.accent` is currently INERT — no component reads it, so
 * setting it changes nothing; color a row by passing a custom `marker` node
 * instead. `timestamp` is a display node — format/translate it before
 * passing. The prop surface (documented on the exported `TimelineProps`,
 * `TimelineEventProps`, `TimelineRailProps` and `TimelineDateProps`
 * interfaces): Timeline(events, renderDateSeparator, emptyState, className),
 * TimelineEvent(event, isLast, className), TimelineRail(marker, connector,
 * className), TimelineDate(children, className).
 *
 * @module
 */

export * from './Timeline.js'
export * from './TimelineDate.js'
export * from './TimelineEvent.js'
export * from './TimelineRail.js'
export * from './types.js'
