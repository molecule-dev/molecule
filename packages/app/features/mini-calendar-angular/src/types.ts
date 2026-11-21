/**
 * Types of `@molecule/app-mini-calendar-angular` — the Angular counterpart of
 * `@molecule/app-mini-calendar-react`, same props and DOM.
 *
 * @module
 */

/** Props accepted by {@link MiniCalendar} — the same props `@molecule/app-mini-calendar-react` accepts. */
export interface MiniCalendarProps {
  /** Controlled selected date (ISO yyyy-mm-dd or Date). */
  selected?: Date | string
  /** Called when the user picks a day. */
  onSelect?: (date: Date) => void
  /** Controlled visible month. If omitted the component tracks its own. */
  month?: Date
  /** Called when the user navigates months. */
  onMonthChange?: (date: Date) => void
  /**
   * Locale for weekday + month name formatting. Defaults to the app's active
   * locale, which follows a locale switch; an explicit `locale` still wins.
   */
  locale?: string
  /** Optional day-disabled predicate. */
  isDisabled?: (date: Date) => boolean
  /** Extra classes. */
  className?: string
}
