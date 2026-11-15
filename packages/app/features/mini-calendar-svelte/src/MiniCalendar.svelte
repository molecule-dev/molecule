<!--
  MiniCalendar: the Svelte counterpart of `@molecule/app-mini-calendar-react`'s
  `MiniCalendar` — compact day picker with prev/next navigation,
  Intl-localized weekday + month names, controlled-optional `selected` +
  `month` props, and an `isDisabled` day predicate. Same props (React names),
  same DOM for the same input, same ClassMap tokens and the same callbacks.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { MiniCalendarProps } from './types.js'

  let {
    selected,
    onSelect,
    month,
    onMonthChange,
    locale,
    isDisabled,
    className,
  }: MiniCalendarProps = $props()

  const cm = $derived(getClassMap())

  /**
   * Coerces a Date or ISO string to a Date, returning undefined for invalid values.
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
   * @param d - The date.
   * @returns The first day of its month.
   */
  function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }

  /**
   * Returns true if two Date values represent the same calendar day.
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

  const selectedDate = $derived(toDate(selected))
  // React's `useState` initial value: read once, at mount (`untrack`
  // documents the one-shot read to the compiler).
  let internalMonth = $state(untrack(() => startOfMonth(month ?? selectedDate ?? new Date())))
  const visibleMonth = $derived(month ? startOfMonth(month) : internalMonth)

  const monthFmt = $derived(new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }))
  const weekdayFmt = $derived(new Intl.DateTimeFormat(locale, { weekday: 'narrow' }))

  // Build grid: 6 rows × 7 cols, starting from the Sunday before the 1st.
  // Each cell is built at its own calendar day (React's grid start offset plus
  // `i`), so no Date instance is mutated after construction.
  const days = $derived.by((): Date[] => {
    const visible = visibleMonth
    const year = visible.getFullYear()
    const month = visible.getMonth()
    const lead = new Date(year, month, 1).getDay()
    const out: Date[] = []
    for (let i = 0; i < 42; i++) out.push(new Date(year, month, 1 - lead + i))
    return out
  })
  const weekdayHeader = $derived(days.slice(0, 7))

  /**
   * Advances the visible month by the given number of months (negative to go back).
   * @param delta - Months to advance.
   */
  function navigate(delta: number): void {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1)
    if (!month) internalMonth = next
    onMonthChange?.(next)
  }

  /** Whether the day falls outside the visible month (React dims it). */
  const outOfMonth = (d: Date): boolean => d.getMonth() !== visibleMonth.getMonth()

  /** Whether the day is the selected one. */
  const isSelected = (d: Date): boolean => !!selectedDate && isSameDay(d, selectedDate)

  /** Whether the day is disabled by the predicate. */
  const disabled = (d: Date): boolean => isDisabled?.(d) ?? false
</script>

<div class={cm.cn(cm.stack(2), className)}>
  <header class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        navigate(-1)
      }}
      aria-label="Previous month">‹</Button
    >
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {monthFmt.format(visibleMonth)}
    </span>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        navigate(1)
      }}
      aria-label="Next month">›</Button
    >
  </header>
  <div class={cm.grid({ cols: 7, gap: 'xs' })}>
    {#each weekdayHeader as d (d.getTime())}
      <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter)}>
        {weekdayFmt.format(d)}
      </span>
    {/each}
    {#each days as d (d.getTime())}
      <button
        type="button"
        onclick={() => {
          if (!disabled(d)) onSelect?.(d)
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
        style={outOfMonth(d) ? 'opacity:0.3' : undefined}>{d.getDate()}</button
      >
    {/each}
  </div>
</div>
