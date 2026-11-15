import type { Component } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { AchievementCardProps } from './types.js'

/**
 * Badge / achievement unlock card — icon + name + description + earned state.
 * Locked achievements render greyed-out.
 *
 * This is the Solid counterpart of `@molecule/app-achievement-card-react`: the
 * same props (React names), the same ClassMap tokens and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link AchievementCardProps}).
 * @returns The rendered achievement card.
 */
export const AchievementCard: Component<AchievementCardProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()

  const earnedText = (): string =>
    props.earnedLabel ?? t('achievementCard.earned', undefined, { defaultValue: 'Earned' })
  const lockedText = (): string =>
    props.lockedLabel ?? t('achievementCard.locked', undefined, { defaultValue: 'Locked' })
  const progressWidth = (): string | undefined =>
    props.progress
      ? `${Math.min(100, (props.progress.value / props.progress.max) * 100)}%`
      : undefined

  return (
    <Card
      className={props.className}
      style={props.earned ? undefined : { opacity: 0.5, filter: 'grayscale(0.6)' }}
    >
      <div class={cm.flex({ align: 'start', gap: 'md' })}>
        <div class={cm.shrink0} style={{ 'font-size': '36px' }}>
          {props.icon}
        </div>
        <div class={cm.cn(cm.flex1, cm.stack(1))}>
          <header class={cm.flex({ align: 'baseline', gap: 'sm' })}>
            <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>{props.name}</h3>
            {props.tier && (
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{props.tier}</span>
            )}
          </header>
          {props.description && <p class={cm.textSize('sm')}>{props.description}</p>}
          {props.earned ? (
            props.earnedAt && (
              <span class={cm.textSize('xs')}>
                {earnedText()} {props.earnedAt}
              </span>
            )
          ) : props.progress ? (
            <div class={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
              <div
                class={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
                style={{ width: progressWidth() }}
              />
            </div>
          ) : (
            <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{lockedText()}</span>
          )}
        </div>
      </div>
    </Card>
  )
}
