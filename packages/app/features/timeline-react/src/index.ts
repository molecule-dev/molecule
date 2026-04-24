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
 * @module
 */

export * from './Timeline.js'
export * from './TimelineDate.js'
export * from './TimelineEvent.js'
export * from './TimelineRail.js'
export * from './types.js'
