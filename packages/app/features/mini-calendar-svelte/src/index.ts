/**
 * Svelte mini month-view calendar.
 *
 * Exports `<MiniCalendar>` — compact day picker with prev/next navigation,
 * Intl-localized weekday + month names, controlled-optional `selected` +
 * `month` props, and an `isDisabled` day predicate. It is the Svelte
 * counterpart of `@molecule/app-mini-calendar-react`: same props (React
 * names), same DOM for the same input, same ClassMap tokens and the same
 * callbacks.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *   import { MiniCalendar } from '@molecule/app-mini-calendar-svelte'
 *
 *   setMoleculeContext({ i18n: i18nProvider })
 *
 *   let selected = $state<Date | undefined>(new Date(2026, 5, 15))
 * </script>
 *
 * <MiniCalendar
 *   {selected}
 *   onSelect={(date) => {
 *     selected = date
 *     console.log(date.toISOString())
 *   }}
 *   locale="en-US"
 * />
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond (`setClassMap(...)` at startup) —
 * `getClassMap()` throws before wiring, and the prev/next buttons come
 * from `@molecule/app-ui-svelte`.
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

export * from './components.js'
export * from './types.js'
