/**
 * MiniCalendar component (React parity).
 *
 * @module
 */

import { Component, type OnInit, signal } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-angular'

import type { MiniCalendarProps } from './types.js'

/**
 * Coerces a Date or ISO string to a Date, returning undefined for invalid values.
 *
 * @param v - The selected value.
 * @returns The date, or undefined.
 */
function toDate(v: Date | string | undefined): Date | undefined {
  if (!v) return undefined
  if (v instanceof Date) return v
  const d = new Date(v)
  return isNaN(+d) ? undefined : d
}

/**
 * Returns a new Date set to the first day of the given date's month.
 *
 * @param d - The date.
 * @returns The first day of its month.
 */
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/**
 * Returns true if two Date values represent the same calendar day.
 *
 * @param a - One date.
 * @param b - The other date.
 * @returns Whether they are the same calendar day.
 */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Compact month-view calendar (React parity).
 *
 * The host IS React's root `<div>` (`div[mol-mini-calendar]`), carrying the
 * stack class plus `className`. Supports controlled `selected` + `month`
 * props or runs uncontrolled: the visible month is read once at init and
 * tracked internally when `month` is omitted. Weekday / month names come from
 * `Intl.DateTimeFormat` so locales render correctly without extra data. The
 * 6×7 grid starts on the Sunday before the 1st; days outside the visible month
 * render dimmed through the inline `opacity` style and stay clickable unless
 * `isDisabled` filters them.
 */
@Component({
  selector: 'div[mol-mini-calendar]',
  standalone: true,
  imports: [Button],
  inputs: ['selected', 'onSelect', 'month', 'onMonthChange', 'locale', 'isDisabled', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<header [class]="headerClasses()"><button mol-button [variant]="'ghost'" [size]="'sm'" aria-label="Previous month" (click)="navigate(-1)">‹</button><span [class]="monthClasses()">{{ monthLabel() }}</span><button mol-button [variant]="'ghost'" [size]="'sm'" aria-label="Next month" (click)="navigate(1)">›</button></header><div [class]="gridClasses()">@for (d of weekdayHeader(); track $index) {<span [class]="weekdayClasses()">{{ weekdayLabel(d) }}</span>}@for (d of days(); track $index) {<button type="button" (click)="selectDay(d)" [disabled]="disabled(d)" [attr.aria-current]="isSelected(d) ? 'date' : null" [class]="dayClasses(d)" [attr.style]="outOfMonth(d) ? 'opacity: 0.3' : null">{{ d.getDate() }}</button>}</div>`,
})
export class MiniCalendar implements OnInit, MiniCalendarProps {
  /** Controlled selected date (ISO yyyy-mm-dd or Date). */
  selected?: Date | string
  /** Called when the user picks a day. */
  onSelect?: (date: Date) => void
  /** Controlled visible month. If omitted the component tracks its own. */
  month?: Date
  /** Called when the user navigates months. */
  onMonthChange?: (date: Date) => void
  /** Locale for weekday + month name formatting. */
  locale?: string
  /** Optional day-disabled predicate. */
  isDisabled?: (date: Date) => boolean
  /** Extra classes on the root element. */
  className?: string

  /** The internally tracked visible month (uncontrolled mode). */
  private readonly internalMonth = signal<Date | null>(null)

  /**
   * Reads the initial visible month once — React's `useState` semantics.
   */
  ngOnInit(): void {
    this.internalMonth.set(startOfMonth(this.month ?? this.selectedDate() ?? new Date()))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root class list (stack plus `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The header row class list (between / center / small gap).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center', gap: 'sm' })
  }

  /**
   * The month label class list.
   * @returns The class string.
   */
  monthClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The grid class list (7 columns, extra-small gap).
   * @returns The class string.
   */
  gridClasses(): string {
    return this.cm().grid({ cols: 7, gap: 'xs' })
  }

  /**
   * A weekday header cell's class list.
   * @returns The class string.
   */
  weekdayClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
      this.cm().textCenter,
    )
  }

  /**
   * One day button's class list (selected days are bold, others medium).
   * @param d - The day.
   * @returns The class string.
   */
  dayClasses(d: Date): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('xs'),
      cm.sp('py', 1),
      cm.textCenter,
      cm.roundedFull,
      this.isSelected(d) ? cm.fontWeight('bold') : cm.fontWeight('medium'),
    )
  }

  /**
   * The selected date, coerced from the `selected` prop.
   * @returns The date, or undefined.
   */
  selectedDate(): Date | undefined {
    return toDate(this.selected)
  }

  /**
   * The visible month: the controlled prop, else the internal month.
   * @returns The first day of the visible month.
   */
  visibleMonth(): Date {
    if (this.month) return startOfMonth(this.month)
    return this.internalMonth() ?? startOfMonth(new Date())
  }

  /**
   * The visible month's formatted name.
   * @returns The month and year text (`March 2026`).
   */
  monthLabel(): string {
    return new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(
      this.visibleMonth(),
    )
  }

  /**
   * A weekday header cell's narrow name.
   * @param d - The day.
   * @returns The narrow weekday text.
   */
  weekdayLabel(d: Date): string {
    return new Intl.DateTimeFormat(this.locale, { weekday: 'narrow' }).format(d)
  }

  /**
   * The 42 days of the grid, starting on the Sunday before the 1st.
   * @returns The days, in render order.
   */
  days(): Date[] {
    const visible = this.visibleMonth()
    const first = startOfMonth(visible)
    const gridStart = new Date(first)
    gridStart.setDate(1 - first.getDay())
    const out: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      out.push(d)
    }
    return out
  }

  /**
   * The first week of the grid (the weekday header).
   * @returns Seven days.
   */
  weekdayHeader(): Date[] {
    return this.days().slice(0, 7)
  }

  /**
   * Whether the day falls outside the visible month (React dims it).
   * @param d - The day.
   * @returns True when the day is outside the visible month.
   */
  outOfMonth(d: Date): boolean {
    return d.getMonth() !== this.visibleMonth().getMonth()
  }

  /**
   * Whether the day is the selected one.
   * @param d - The day.
   * @returns True when selected.
   */
  isSelected(d: Date): boolean {
    const selected = this.selectedDate()
    return !!selected && isSameDay(d, selected)
  }

  /**
   * Whether the day is disabled by the predicate.
   * @param d - The day.
   * @returns True when disabled.
   */
  disabled(d: Date): boolean {
    return this.isDisabled?.(d) ?? false
  }

  /**
   * Picks a day (React's `onClick`): disabled days are ignored.
   * @param d - The clicked day.
   */
  selectDay(d: Date): void {
    if (this.disabled(d)) return
    this.onSelect?.(d)
  }

  /**
   * Advances the visible month by the given number of months (negative to go back).
   * @param delta - Months to advance.
   */
  navigate(delta: number): void {
    const current = this.visibleMonth()
    const next = new Date(current.getFullYear(), current.getMonth() + delta, 1)
    if (!this.month) this.internalMonth.set(next)
    this.onMonthChange?.(next)
  }
}
