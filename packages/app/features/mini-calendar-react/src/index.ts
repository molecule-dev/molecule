/**
 * React mini month-view calendar.
 *
 * Exports `<MiniCalendar>` — compact day picker with prev/next navigation,
 * Intl-localized weekday + month names, controlled-optional `selected` +
 * `month` props, and an `isDisabled` day predicate.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { MiniCalendar } from '@molecule/app-mini-calendar-react'
 *
 * export function AppointmentDatePicker() {
 *   const [date, setDate] = useState<Date>()
 *   const now = new Date()
 *   const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
 *   return (
 *     <div>
 *       <MiniCalendar
 *         selected={date} // pass the pick back — the calendar does not remember it
 *         onSelect={setDate}
 *         locale="en-US"
 *         isDisabled={(d) => d < startOfToday || d.getDay() === 0 || d.getDay() === 6}
 *       />
 *       {date && <p>Appointment on {date.toLocaleDateString('en-US', { dateStyle: 'full' })}</p>}
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * `selected` is display-only: the component does NOT store the picked day —
 * feed `onSelect`'s date back into `selected` (as above) or nothing looks
 * selected. The selected day is marked only by bold text and
 * `aria-current="date"`; there is no range selection.
 *
 * `onSelect` receives LOCAL midnight of the clicked day. Do not send it via
 * `toISOString()` (that converts to UTC and can land on the previous/next
 * day); format the local date yourself. Likewise a `selected` string like
 * `'2026-06-15'` is parsed by `new Date()` as UTC midnight and can show as
 * June 14 west of UTC — pass `new Date(2026, 5, 15)` instead. Weeks always
 * start on Sunday, whatever the `locale`.
 *
 * Requires a wired ClassMap bond (`setClassMap(...)` at startup) —
 * `getClassMap()` throws before wiring, and the prev/next buttons come
 * from `@molecule/app-ui-react`.
 *
 * Weekday and month names localize automatically through
 * `Intl.DateTimeFormat(locale)` — no locale bond involved. The prev/next
 * button aria-labels are currently English-only.
 *
 * When `month` is supplied the visible month is fully controlled —
 * wire `onMonthChange` too or the arrows will appear dead. The grid
 * always renders 6 weeks; days outside the visible month render dimmed
 * and remain clickable unless `isDisabled` filters them.
 *
 * @module
 */

export * from './MiniCalendar.js'
