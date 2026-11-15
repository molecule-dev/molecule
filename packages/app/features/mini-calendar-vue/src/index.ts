/**
 * Vue mini month-view calendar.
 *
 * Exports `<MiniCalendar>` — compact day picker with prev/next navigation,
 * Intl-localized weekday + month names, controlled-optional `selected` +
 * `month` props, and an `isDisabled` day predicate. It is the Vue counterpart
 * of `@molecule/app-mini-calendar-react`: same props (React names), same DOM
 * for the same input, same ClassMap tokens and the same callbacks.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { MiniCalendar } from '@molecule/app-mini-calendar-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const selected = ref(new Date(2026, 5, 15))
 *     return () =>
 *       h(MiniCalendar, {
 *         selected: selected.value,
 *         onSelect: (date: Date) => {
 *           selected.value = date
 *           console.log(date.toISOString())
 *         },
 *         locale: 'en-US',
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond (`setClassMap(...)` at startup) —
 * `getClassMap()` throws before wiring, and the prev/next buttons come
 * from `@molecule/app-ui-vue`.
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
export * from './types.js'
