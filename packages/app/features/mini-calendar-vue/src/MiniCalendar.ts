/**
 * Vue mini month-view calendar.
 *
 * Vue counterpart of `@molecule/app-mini-calendar-react`'s `MiniCalendar` —
 * the same props (React names), the same DOM for the same input, the same
 * `Intl`-localized weekday and month names and the same `isDisabled` day
 * predicate.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, ref, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'

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
 */
export const MiniCalendar = defineComponent({
  name: 'MiniCalendar',
  props: {
    selected: [Object, String] as PropType<Date | string>,
    onSelect: Function as PropType<(date: Date) => void>,
    month: Object as PropType<Date>,
    onMonthChange: Function as PropType<(date: Date) => void>,
    locale: String,
    isDisabled: Function as PropType<(date: Date) => boolean>,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const selectedDate = computed(() => toDate(props.selected))
    const internalMonth = ref(startOfMonth(props.month ?? selectedDate.value ?? new Date()))
    const visibleMonth = computed(() =>
      props.month ? startOfMonth(props.month) : internalMonth.value,
    )

    /**
     * Advances the visible month by the given number of months (negative to go back).
     *
     * @param delta - Months to advance.
     */
    function navigate(delta: number): void {
      const next = new Date(
        visibleMonth.value.getFullYear(),
        visibleMonth.value.getMonth() + delta,
        1,
      )
      if (!props.month) internalMonth.value = next
      props.onMonthChange?.(next)
    }

    return (): VNode => {
      const monthFmt = new Intl.DateTimeFormat(props.locale, { month: 'long', year: 'numeric' })
      const weekdayFmt = new Intl.DateTimeFormat(props.locale, { weekday: 'narrow' })

      // Build grid: 6 rows × 7 cols, starting from the Sunday before the 1st.
      const first = startOfMonth(visibleMonth.value)
      const gridStart = new Date(first)
      gridStart.setDate(1 - first.getDay())
      const days: Date[] = []
      for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart)
        d.setDate(gridStart.getDate() + i)
        days.push(d)
      }
      const weekdayHeader = days.slice(0, 7)
      const selectedValue = selectedDate.value

      return h('div', { class: cm.cn(cm.stack(2), props.className) }, [
        h('header', { class: cm.flex({ justify: 'between', align: 'center', gap: 'sm' }) }, [
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: () => {
                navigate(-1)
              },
              'aria-label': 'Previous month',
            },
            () => '‹',
          ),
          h(
            'span',
            { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
            monthFmt.format(visibleMonth.value),
          ),
          h(
            Button,
            {
              variant: 'ghost',
              size: 'sm',
              onClick: () => {
                navigate(1)
              },
              'aria-label': 'Next month',
            },
            () => '›',
          ),
        ]),
        h('div', { class: cm.grid({ cols: 7, gap: 'xs' }) }, [
          ...weekdayHeader.map((d, i) =>
            h(
              'span',
              {
                key: i,
                class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter),
              },
              weekdayFmt.format(d),
            ),
          ),
          ...days.map((d, i) => {
            const outOfMonth = d.getMonth() !== visibleMonth.value.getMonth()
            const isSelected = !!selectedValue && isSameDay(d, selectedValue)
            const disabled = props.isDisabled?.(d) ?? false
            return h(
              'button',
              {
                key: i,
                type: 'button',
                onClick: () => {
                  if (!disabled) props.onSelect?.(d)
                },
                disabled,
                'aria-current': isSelected ? 'date' : undefined,
                class: cm.cn(
                  cm.textSize('xs'),
                  cm.sp('py', 1),
                  cm.textCenter,
                  cm.roundedFull,
                  isSelected ? cm.fontWeight('bold') : cm.fontWeight('medium'),
                ),
                style: outOfMonth ? 'opacity:0.3' : undefined,
              },
              String(d.getDate()),
            )
          }),
        ]),
      ])
    }
  },
})
