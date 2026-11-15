/**
 * Solid mini month-view calendar component (React parity).
 *
 * @module
 */

import { type Component, createMemo, createSignal } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

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
 * Compact month-view calendar. Supports controlled `selected` + `month`
 * props or runs uncontrolled. Weekday / month names come from
 * `Intl.DateTimeFormat` so locales render correctly without extra data.
 *
 * This is the Solid counterpart of `@molecule/app-mini-calendar-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link MiniCalendarProps}).
 * @returns The rendered calendar.
 */
export const MiniCalendar: Component<MiniCalendarProps> = (props) => {
  const cm = getClassMap()
  const selectedDate = (): Date | undefined => toDate(props.selected)
  const [internalMonth, setInternalMonth] = createSignal(
    startOfMonth(props.month ?? selectedDate() ?? new Date()),
  )
  const visibleMonth = createMemo(() => (props.month ? startOfMonth(props.month) : internalMonth()))

  /**
   * Advances the visible month by the given number of months (negative to go back).
   *
   * @param delta - Months to advance.
   */
  function navigate(delta: number): void {
    const current = visibleMonth()
    const next = new Date(current.getFullYear(), current.getMonth() + delta, 1)
    if (!props.month) setInternalMonth(next)
    props.onMonthChange?.(next)
  }

  const monthFmt = createMemo(
    () => new Intl.DateTimeFormat(props.locale, { month: 'long', year: 'numeric' }),
  )
  const weekdayFmt = createMemo(() => new Intl.DateTimeFormat(props.locale, { weekday: 'narrow' }))

  // Build grid: 6 rows × 7 cols, starting from the Sunday before the 1st.
  const days = createMemo((): Date[] => {
    const first = startOfMonth(visibleMonth())
    const gridStart = new Date(first)
    gridStart.setDate(1 - first.getDay())
    const out: Date[] = []
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart)
      d.setDate(gridStart.getDate() + i)
      out.push(d)
    }
    return out
  })
  const weekdayHeader = createMemo(() => days().slice(0, 7))

  const outOfMonth = (d: Date): boolean => d.getMonth() !== visibleMonth().getMonth()
  const isSelected = (d: Date): boolean => {
    const selected = selectedDate()
    return !!selected && isSameDay(d, selected)
  }
  const disabled = (d: Date): boolean => props.isDisabled?.(d) ?? false

  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      <header class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigate(-1)
          }}
          aria-label="Previous month"
        >
          ‹
        </Button>
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {monthFmt().format(visibleMonth())}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            navigate(1)
          }}
          aria-label="Next month"
        >
          ›
        </Button>
      </header>
      <div class={cm.grid({ cols: 7, gap: 'xs' })}>
        {weekdayHeader().map((d) => (
          <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter)}>
            {weekdayFmt().format(d)}
          </span>
        ))}
        {days().map((d) => (
          <button
            type="button"
            onClick={() => {
              if (!disabled(d)) props.onSelect?.(d)
            }}
            disabled={disabled(d)}
            aria-current={isSelected(d) ? 'date' : undefined}
            class={cm.cn(
              cm.textSize('xs'),
              cm.sp('py', 1),
              cm.textCenter,
              cm.roundedFull,
              isSelected(d) ? cm.fontWeight('bold') : cm.fontWeight('medium'),
            )}
            style={outOfMonth(d) ? 'opacity:0.3' : undefined}
          >
            {d.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}
