<!--
  HabitStreakCard: the Svelte counterpart of
  `@molecule/app-habit-streak-card-react`'s `HabitStreakCard` — current streak,
  best streak, total completions, and an optional per-day heatmap strip. Same
  props, same DOM for the same input; `name` and `icon` are snippets (or plain
  strings), the stat labels and the heatmap's strip and day labels go through
  `useTranslation()` with React's exact keys and English defaults, and the
  heatmap squares carry React's inline styles exactly.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import type { HabitStreakCardProps, StreakDay } from './types.js'

  let {
    name,
    icon,
    currentStreak,
    bestStreak,
    totalCompletions,
    heatmap,
    heatmapDays = 30,
    className,
  }: HabitStreakCardProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const days = $derived((heatmap ?? []).slice(-heatmapDays))
  const max = $derived(days.reduce((m, d) => Math.max(m, d.count), 0))

  /**
   * Returns a green rgba color whose opacity scales with completion intensity.
   *
   * @param count - The day's completion count.
   * @param top - The largest count in the rendered heatmap window.
   * @returns The CSS background color.
   */
  function intensityColor(count: number, top: number): string {
    if (count === 0) return 'rgba(0,0,0,0.08)'
    const t = Math.min(1, count / Math.max(1, top))
    // simple green ramp
    return `rgba(34,197,94,${0.25 + 0.75 * t})`
  }

  /**
   * One heatmap square's accessible label and tooltip (`<date>: <count>`).
   *
   * @param day - The day.
   * @returns Its label.
   */
  function dayLabel(day: StreakDay): string {
    return t(
      'habit.cell.tooltip',
      { date: day.date, count: day.count },
      { defaultValue: '{{date}}: {{count}}' },
    )
  }
</script>

<Card {className}>
  <div class={cm.stack(3)}>
    <header class={cm.flex({ align: 'center', gap: 'sm' })}>
      {#if icon}{#if typeof icon === 'function'}{@render icon?.()}{:else}{icon}{/if}{/if}
      <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
        {#if typeof name === 'function'}{@render name?.()}{:else}{name}{/if}
      </h3>
    </header>
    <div class={cm.flex({ align: 'baseline', gap: 'lg' })}>
      <div>
        <div class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{currentStreak}</div>
        <div class={cm.textSize('xs')}>
          {t('habit.currentStreak', {}, { defaultValue: 'day streak' })}
        </div>
      </div>
      {#if bestStreak !== undefined}
        <div>
          <div class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{bestStreak}</div>
          <div class={cm.textSize('xs')}>
            {t('habit.bestStreak', {}, { defaultValue: 'best' })}
          </div>
        </div>
      {/if}
      {#if totalCompletions !== undefined}
        <div>
          <div class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{totalCompletions}</div>
          <div class={cm.textSize('xs')}>
            {t('habit.total', {}, { defaultValue: 'total' })}
          </div>
        </div>
      {/if}
    </div>
    {#if days.length > 0}
      <div
        class={cm.flex({ align: 'center', gap: 'xs' })}
        role="group"
        aria-label={t('habit.aria.recentActivity', {}, { defaultValue: 'Recent activity' })}
      >
        {#each days as day (day.date)}
          <span
            role="img"
            aria-label={dayLabel(day)}
            title={dayLabel(day)}
            style:width="10px"
            style:height="10px"
            style:border-radius="2px"
            style:background={intensityColor(day.count, max)}
          ></span>
        {/each}
      </div>
    {/if}
  </div>
</Card>
