import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Represents a single day's completion data for the heatmap strip. */
export interface StreakDay {
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** Completion count for the day (0 = not done, >0 = intensity). */
  count: number
}

/** Props for {@link HabitStreakCard}. */
export interface HabitStreakCardProps {
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
 * Returns a green rgba color whose opacity scales with completion intensity.
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
 * @param props - Component props (see {@link HabitStreakCardProps}).
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
}: HabitStreakCardProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const days = (heatmap ?? []).slice(-heatmapDays)
  const max = days.reduce((m, d) => Math.max(m, d.count), 0)
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
    <Card className={className}>
      <Box as="div" className={cm.stack(3)}>
        <Box as="header" className={cm.flex({ align: 'center', gap: 'sm' })}>
          {icon}
          <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {name}
          </Text>
        </Box>
        <Box as="div" className={cm.flex({ align: 'baseline', gap: 'lg' })}>
          <Box as="div">
            <Box as="div" className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
              {currentStreak}
            </Box>
            <Box as="div" className={cm.textSize('xs')}>
              {t('habit.currentStreak', {}, { defaultValue: 'day streak' })}
            </Box>
          </Box>
          {bestStreak !== undefined && (
            <Box as="div">
              <Box as="div" className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {bestStreak}
              </Box>
              <Box as="div" className={cm.textSize('xs')}>
                {t('habit.bestStreak', {}, { defaultValue: 'best' })}
              </Box>
            </Box>
          )}
          {totalCompletions !== undefined && (
            <Box as="div">
              <Box as="div" className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {totalCompletions}
              </Box>
              <Box as="div" className={cm.textSize('xs')}>
                {t('habit.total', {}, { defaultValue: 'total' })}
              </Box>
            </Box>
          )}
        </Box>
        {days.length > 0 && (
          <Box
            as="div"
            className={cm.flex({ align: 'center', gap: 'xs' })}
            role="group"
            aria-label={t('habit.aria.recentActivity', {}, { defaultValue: 'Recent activity' })}
          >
            {days.map((d) => (
              <Box
                as="span"
                key={d.date}
                role="img"
                aria-label={dayLabel(d)}
                title={dayLabel(d)}
                style={{ width: 10, height: 10, borderRadius: 2 }}
                webStyle={{ background: intensityColor(d.count, max) }}
              />
            ))}
          </Box>
        )}
      </Box>
    </Card>
  )
}
