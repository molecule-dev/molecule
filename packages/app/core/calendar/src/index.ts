/**
 * Calendar core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for calendar widgets with month,
 * week, day, and agenda views. Bond a provider
 * (e.g. `@molecule/app-calendar-fullcalendar`) at startup, then use
 * {@link createCalendar} anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, createCalendar } from '@molecule/app-calendar'
 * import { provider } from '@molecule/app-calendar-fullcalendar'
 *
 * setProvider(provider)
 *
 * const calendar = createCalendar({
 *   events: [
 *     {
 *       id: '1',
 *       title: 'Meeting',
 *       start: new Date('2026-03-28T10:00:00'),
 *       end: new Date('2026-03-28T11:00:00'),
 *     },
 *   ],
 *   view: 'month',
 *   onEventClick: (event) => console.log('Clicked:', event.title),
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
