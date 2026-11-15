/**
 * Angular mini month-view calendar.
 *
 * Exports `MiniCalendar` — compact day picker with prev/next navigation,
 * Intl-localized weekday + month names, controlled-optional `selected` +
 * `month` inputs, and an `isDisabled` day predicate. It is the Angular
 * counterpart of `@molecule/app-mini-calendar-react`: same props (React
 * names), same DOM for the same input, same ClassMap tokens and the same
 * callbacks.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { MiniCalendar } from '@molecule/app-mini-calendar-angular'
 *
 * @Component({
 *   selector: 'app-calendar',
 *   standalone: true,
 *   imports: [MiniCalendar],
 *   template: `<div mol-mini-calendar
 *     [selected]="selected"
 *     [locale]="'en-US'"
 *     [onSelect]="pick"></div>`,
 * })
 * export class CalendarPage {
 *   selected = new Date(2026, 5, 15)
 *   pick = (date: Date) => {
 *     this.selected = date
 *     console.log(date.toISOString())
 *   }
 * }
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond (`setClassMap(...)` at startup) —
 * `getClassMap()` throws before wiring, and the prev/next buttons come
 * from `@molecule/app-ui-angular`.
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

export * from './mini-calendar.component.js'
export * from './types.js'
