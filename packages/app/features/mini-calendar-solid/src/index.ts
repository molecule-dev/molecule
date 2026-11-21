/**
 * Solid mini month-view calendar.
 *
 * Exports `<MiniCalendar>` — compact day picker with prev/next navigation,
 * Intl-localized weekday + month names, controlled-optional `selected` +
 * `month` props, and an `isDisabled` day predicate. It is the Solid
 * counterpart of `@molecule/app-mini-calendar-react`: same props (React
 * names), same DOM for the same input, same ClassMap tokens and the same
 * callbacks.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { MiniCalendar } from '@molecule/app-mini-calendar-solid'
 *
 * export function Calendar() {
 *   const [selected, setSelected] = createSignal<Date | undefined>(
 *     new Date(2026, 5, 15),
 *   )
 *
 *   return (
 *     <MiniCalendar
 *       selected={selected()}
 *       onSelect={(date) => {
 *         setSelected(date)
 *         console.log(date.toISOString())
 *       }}
 *       locale="en-US"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond (`setClassMap(...)` at startup) —
 * `getClassMap()` throws before wiring, and the prev/next buttons come
 * from `@molecule/app-ui-solid`.
 *
 * Weekday and month names come from `Intl.DateTimeFormat(locale)` — an
 * explicit `locale` prop wins, otherwise the app's active locale, so they
 * follow a locale switch. The prev/next buttons' aria-labels go through
 * `t()` (`miniCalendar.aria.previousMonth` / `miniCalendar.aria.nextMonth`,
 * English `defaultValue`s); translations live in the
 * `@molecule/app-locales-mini-calendar` bond.
 *
 * When `month` is supplied the visible month is fully controlled —
 * wire `onMonthChange` too or the arrows will appear dead. The grid
 * always renders 6 weeks; days outside the visible month render dimmed
 * and remain clickable unless `isDisabled` filters them.
 *
 * @module
 */

export * from './MiniCalendar.jsx'
export * from './types.js'
