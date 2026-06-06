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
 *     { id: '1', timestamp: '2 hours ago', title: 'Order placed', accent: 'success' },
 *     { id: '2', timestamp: 'Yesterday', title: 'Payment confirmed', body: 'Visa ending 4242' },
 *     { id: '3', timestamp: 'Mar 12', title: 'Item shipped', accent: 'info' },
 *   ]}
 *   renderDateSeparator={(event, prev) =>
 *     !prev ? <TimelineDate>{event.timestamp}</TimelineDate> : null
 *   }
 *   emptyState={<p>No activity yet.</p>}
 * />
 * ```
 *
 * @module
 */

export * from './Timeline.js'
export * from './TimelineDate.js'
export * from './TimelineEvent.js'
export * from './TimelineRail.js'
export * from './types.js'
