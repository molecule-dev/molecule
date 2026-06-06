/**
 * React mini month-view calendar.
 *
 * Exports `<MiniCalendar>` — compact day picker with prev/next navigation,
 * Intl-localized weekday + month names, controlled-optional `selected` +
 * `month` props.
 *
 * @example
 * ```tsx
 * import { MiniCalendar } from '@molecule/app-mini-calendar-react'
 *
 * <MiniCalendar
 *   selected={new Date('2026-06-15')}
 *   onSelect={(date) => console.log(date.toISOString())}
 *   locale="en-US"
 * />
 * ```
 * @module
 */

export * from './MiniCalendar.js'
