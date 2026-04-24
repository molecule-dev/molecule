import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

interface MiniCalendarProps {
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
  /** Extra classes. */
  className?: string
}

/**
 *
 * @param v
 */
function toDate(v: Date | string | undefined): Date | undefined {
  if (!v) return undefined
  if (v instanceof Date) return v
  const d = new Date(v)
  return isNaN(+d) ? undefined : d
}

/**
 *
 * @param d
 */
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/**
 *
 * @param a
 * @param b
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
 * @param root0
 * @param root0.selected
 * @param root0.onSelect
 * @param root0.month
 * @param root0.onMonthChange
 * @param root0.locale
 * @param root0.isDisabled
 * @param root0.className
 */
export function MiniCalendar({
  selected,
  onSelect,
  month: monthProp,
  onMonthChange,
  locale,
  isDisabled,
  className,
}: MiniCalendarProps) {
  const cm = getClassMap()
  const selectedDate = toDate(selected)
  const [internalMonth, setInternalMonth] = useState(
    startOfMonth(monthProp ?? selectedDate ?? new Date()),
  )
  const visibleMonth = monthProp ? startOfMonth(monthProp) : internalMonth

  /**
   *
   * @param delta
   */
  function navigate(delta: number) {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1)
    if (!monthProp) setInternalMonth(next)
    onMonthChange?.(next)
  }

  const monthFmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })

  // Build grid: 6 rows × 7 cols, starting from the Sunday before the 1st.
  const first = startOfMonth(visibleMonth)
  const gridStart = new Date(first)
  gridStart.setDate(1 - first.getDay())
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push(d)
  }
  // Weekday header derived from the first week
  const weekdayHeader = days.slice(0, 7)

  return (
    <div className={cm.cn(cm.stack(2), className)}>
      <header className={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Previous month">
          ‹
        </Button>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
          {monthFmt.format(visibleMonth)}
        </span>
        <Button variant="ghost" size="sm" onClick={() => navigate(1)} aria-label="Next month">
          ›
        </Button>
      </header>
      <div className={cm.grid({ cols: 7, gap: 'xs' })}>
        {weekdayHeader.map((d, i) => (
          <span
            key={i}
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter)}
          >
            {weekdayFmt.format(d)}
          </span>
        ))}
        {days.map((d, i) => {
          const outOfMonth = d.getMonth() !== visibleMonth.getMonth()
          const isSelected = selectedDate && isSameDay(d, selectedDate)
          const disabled = isDisabled?.(d) ?? false
          return (
            <button
              key={i}
              type="button"
              onClick={() => !disabled && onSelect?.(d)}
              disabled={disabled}
              aria-current={isSelected ? 'date' : undefined}
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('py', 1),
                cm.textCenter,
                cm.roundedFull,
                isSelected ? cm.fontWeight('bold') : cm.fontWeight('medium'),
              )}
              style={outOfMonth ? { opacity: 0.3 } : undefined}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
