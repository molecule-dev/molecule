/**
 * FullCalendar provider for the molecule calendar interface.
 *
 * Implements `CalendarProvider` from `@molecule/app-calendar` using
 * a FullCalendar-style state management approach. Framework bindings
 * connect the headless state to the actual FullCalendar DOM library.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-calendar-fullcalendar'
 * import { setProvider } from '@molecule/app-calendar'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
