/**
 * Vertical 24h day-of-events timeline — itinerary planner, daily agenda,
 * schedule view. Events are absolutely positioned by start/end hour and
 * scaled by `pxPerHour`.
 *
 * @example
 * ```tsx
 * import { DayTimeline } from '@molecule/app-day-timeline-react'
 *
 * <DayTimeline
 *   startHour={7}
 *   endHour={22}
 *   events={[
 *     { id: 'flight', title: 'Flight to LAX', startHour: 13, endHour: 16 },
 *     { id: 'dinner', title: 'Dinner', startHour: 19, endHour: 20.5 },
 *   ]}
 * />
 * ```
 *
 * @module
 */

export * from './DayTimeline.js'
export * from './types.js'
