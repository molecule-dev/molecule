import type { ReactElement, ReactNode } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

export interface AchievementCardProps {
  /** Achievement name. */
  name: ReactNode
  /** Description / what it took to earn. */
  description?: ReactNode
  /** Icon / illustration slot. */
  icon: ReactNode
  /** Whether the user has earned this achievement. */
  earned?: boolean
  /** Earned-at display. */
  earnedAt?: ReactNode
  /**
   * Label shown before `earnedAt` on earned achievements. Overrides the
   * translated / `defaultValue` `'Earned'` (prop > `t()` > default).
   */
  earnedLabel?: string
  /**
   * Label shown on locked achievements (not earned, no progress). Overrides
   * the translated / `defaultValue` `'Locked'` (prop > `t()` > default).
   */
  lockedLabel?: string
  /** Optional progress data (for in-progress achievements). */
  progress?: { value: number; max: number }
  /** Optional rarity / tier label ("Legendary", "Common"). */
  tier?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Badge / achievement unlock card — icon + name + description + earned
 * state. Locked achievements render greyed-out.
 * @param props - Component props (see {@link AchievementCardProps}).
 */
export function AchievementCard({
  name,
  description,
  icon,
  earned,
  earnedAt,
  earnedLabel,
  lockedLabel,
  progress,
  tier,
  className,
}: AchievementCardProps): ReactElement {
  const cm = getClassMap()
  const earnedText =
    earnedLabel ?? t('achievementCard.earned', undefined, { defaultValue: 'Earned' })
  const lockedText =
    lockedLabel ?? t('achievementCard.locked', undefined, { defaultValue: 'Locked' })
  return (
    <Card
      className={className}
      style={!earned ? { opacity: 0.5, filter: 'grayscale(0.6)' } : undefined}
    >
      <div className={cm.flex({ align: 'start', gap: 'md' })}>
        <div className={cm.shrink0} style={{ fontSize: 36 }}>
          {icon}
        </div>
        <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
          <header className={cm.flex({ align: 'baseline', gap: 'sm' })}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>{name}</h3>
            {tier && (
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{tier}</span>
            )}
          </header>
          {description && <p className={cm.textSize('sm')}>{description}</p>}
          {earned ? (
            earnedAt && (
              <span className={cm.textSize('xs')}>
                {earnedText} {earnedAt}
              </span>
            )
          ) : progress ? (
            <div className={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
              <div
                className={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
                style={{ width: `${Math.min(100, (progress.value / progress.max) * 100)}%` }}
              />
            </div>
          ) : (
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {lockedText}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
