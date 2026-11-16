/**
 * Solid habit / streak summary card — current streak, best streak, total
 * completions, and an optional per-day heatmap strip.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { For } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { HabitStreakCardProps, StreakDay } from './types.js'

/**
 * Returns a green rgba color whose opacity scales with completion intensity.
 *
 * @param count - The day's completion count.
 * @param max - The largest count in the rendered heatmap window.
 * @returns The CSS background color.
 */
function intensityColor(count: number, max: number): string {
  if (count === 0) return 'rgba(0,0,0,0.08)'
  const t = Math.min(1, count / Math.max(1, max))
  // simple green ramp
  return `rgba(34,197,94,${0.25 + 0.75 * t})`
}

/**
 * Habit / streak summary card with current + best streak, total completions,
 * and an optional heatmap strip.
 *
 * Solid counterpart of `@molecule/app-habit-streak-card-react`'s
 * `HabitStreakCard` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input. The stat labels and the heatmap's
 * strip and day labels go through `useTranslation()` with React's exact keys
 * and English defaults, and `heatmapDays` truncates `heatmap` from the end
 * (most recent days win).
 *
 * @param props - Component props (see {@link HabitStreakCardProps}).
 * @returns The rendered habit streak card.
 */
export const HabitStreakCard: Component<HabitStreakCardProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const days = (): StreakDay[] => (props.heatmap ?? []).slice(-(props.heatmapDays ?? 30))
  const max = (): number => days().reduce((m, d) => Math.max(m, d.count), 0)
  /**
   * One heatmap square's accessible label and tooltip (`<date>: <count>`).
   * @param day - The day.
   * @returns Its label.
   */
  const dayLabel = (day: StreakDay): string =>
    t(
      'habit.cell.tooltip',
      { date: day.date, count: day.count },
      {
        defaultValue: '{{date}}: {{count}}',
      },
    )

  return (
    <Card className={props.className}>
      <div class={cm.stack(3)}>
        <header class={cm.flex({ align: 'center', gap: 'sm' })}>
          {props.icon}
          <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.name}</h3>
        </header>
        <div class={cm.flex({ align: 'baseline', gap: 'lg' })}>
          <div>
            <div class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
              {props.currentStreak}
            </div>
            <div class={cm.textSize('xs')}>
              {t('habit.currentStreak', {}, { defaultValue: 'day streak' })}
            </div>
          </div>
          {props.bestStreak !== undefined && (
            <div>
              <div class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {props.bestStreak}
              </div>
              <div class={cm.textSize('xs')}>
                {t('habit.bestStreak', {}, { defaultValue: 'best' })}
              </div>
            </div>
          )}
          {props.totalCompletions !== undefined && (
            <div>
              <div class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {props.totalCompletions}
              </div>
              <div class={cm.textSize('xs')}>{t('habit.total', {}, { defaultValue: 'total' })}</div>
            </div>
          )}
        </div>
        {days().length > 0 && (
          <div
            class={cm.flex({ align: 'center', gap: 'xs' })}
            role="group"
            aria-label={t('habit.aria.recentActivity', {}, { defaultValue: 'Recent activity' })}
          >
            <For each={days()}>
              {(day) => (
                <span
                  role="img"
                  aria-label={dayLabel(day)}
                  title={dayLabel(day)}
                  style={{
                    width: '10px',
                    height: '10px',
                    'border-radius': '2px',
                    background: intensityColor(day.count, max()),
                  }}
                />
              )}
            </For>
          </div>
        )}
      </div>
    </Card>
  )
}
