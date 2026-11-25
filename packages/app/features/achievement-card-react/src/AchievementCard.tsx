import type { ReactElement, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link AchievementCard}. */
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
  description: descriptionProp,
  icon,
  earned,
  earnedAt,
  earnedLabel,
  lockedLabel,
  progress,
  tier: tierProp,
  className,
}: AchievementCardProps): ReactElement {
  const description = slot(descriptionProp)
  const tier = slot(tierProp)
  const { t } = useTranslation()
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
      <Box as="div" className={cm.flex({ align: 'start', gap: 'md' })}>
        <Box as="div" className={cm.shrink0} webStyle={{ fontSize: 36 }}>
          {icon}
        </Box>
        <Box as="div" className={cm.cn(cm.flex1, cm.stack(1 as const))}>
          <Box as="header" className={cm.flex({ align: 'baseline', gap: 'sm' })}>
            <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
              {name}
            </Text>
            {tier && (
              <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                {tier}
              </Text>
            )}
          </Box>
          {description && (
            <Text as="p" className={cm.textSize('sm')}>
              {description}
            </Text>
          )}
          {earned ? (
            earnedAt && (
              <Text as="span" className={cm.textSize('xs')}>
                {earnedText} {earnedAt}
              </Text>
            )
          ) : progress ? (
            <Box as="div" className={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
              <Box
                as="div"
                className={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
                style={{ width: `${Math.min(100, (progress.value / progress.max) * 100)}%` }}
              />
            </Box>
          ) : (
            <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
              {lockedText}
            </Text>
          )}
        </Box>
      </Box>
    </Card>
  )
}
