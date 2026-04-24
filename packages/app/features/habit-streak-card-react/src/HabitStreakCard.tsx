import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

/**
 *
 */
export interface StreakDay {
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** Completion count for the day (0 = not done, >0 = intensity). */
  count: number
}

interface HabitStreakCardProps {
  /** Habit name. */
  name: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Current streak (days). */
  currentStreak: number
  /** Best streak (days). */
  bestStreak?: number
  /** Total completions. */
  totalCompletions?: number
  /** Optional heatmap days — rendered as a strip of squares. */
  heatmap?: StreakDay[]
  /** Days the heatmap should display (truncates `heatmap` from the end). Defaults to 30. */
  heatmapDays?: number
  /** Extra classes. */
  className?: string
}

/**
 *
 * @param count
 * @param max
 */
function intensityColor(count: number, max: number): string {
  if (count === 0) return 'rgba(0,0,0,0.08)'
  const t = Math.min(1, count / Math.max(1, max))
  // simple green ramp
  return `rgba(34,197,94,${0.25 + 0.75 * t})`
}

/**
 * Habit / streak summary card with current + best streak, total
 * completions, and an optional heatmap strip. Use for habit trackers,
 * meditation streaks, daily-task widgets.
 * @param root0
 * @param root0.name
 * @param root0.icon
 * @param root0.currentStreak
 * @param root0.bestStreak
 * @param root0.totalCompletions
 * @param root0.heatmap
 * @param root0.heatmapDays
 * @param root0.className
 */
export function HabitStreakCard({
  name,
  icon,
  currentStreak,
  bestStreak,
  totalCompletions,
  heatmap,
  heatmapDays = 30,
  className,
}: HabitStreakCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const days = (heatmap ?? []).slice(-heatmapDays)
  const max = days.reduce((m, d) => Math.max(m, d.count), 0)
  return (
    <Card className={className}>
      <div className={cm.stack(3)}>
        <header className={cm.flex({ align: 'center', gap: 'sm' })}>
          {icon}
          <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{name}</h3>
        </header>
        <div className={cm.flex({ align: 'baseline', gap: 'lg' })}>
          <div>
            <div className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>{currentStreak}</div>
            <div className={cm.textSize('xs')}>
              {t('habit.currentStreak', {}, { defaultValue: 'day streak' })}
            </div>
          </div>
          {bestStreak !== undefined && (
            <div>
              <div className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {bestStreak}
              </div>
              <div className={cm.textSize('xs')}>
                {t('habit.bestStreak', {}, { defaultValue: 'best' })}
              </div>
            </div>
          )}
          {totalCompletions !== undefined && (
            <div>
              <div className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {totalCompletions}
              </div>
              <div className={cm.textSize('xs')}>
                {t('habit.total', {}, { defaultValue: 'total' })}
              </div>
            </div>
          )}
        </div>
        {days.length > 0 && (
          <div className={cm.flex({ align: 'center', gap: 'xs' })} aria-label="Recent activity">
            {days.map((d) => (
              <span
                key={d.date}
                aria-label={`${d.date}: ${d.count}`}
                title={`${d.date}: ${d.count}`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: intensityColor(d.count, max),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
