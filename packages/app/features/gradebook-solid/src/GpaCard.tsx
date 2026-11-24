/**
 * Solid GPA hero card — the counterpart of
 * `@molecule/app-gradebook-react`'s `GpaCard`: the same props (React names),
 * the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { GpaCardProps } from './types.js'
import { defaultGpaMax, formatGpa } from './utilities.js'

/**
 * Hero card displaying the user's GPA — large primary value, "out of"
 * caption, and optional trend chip. Pairs with `Gradebook` above / beside the
 * table view.
 *
 * Styling routes through `getClassMap()` and all text routes through `t()`
 * via the companion `@molecule/app-locales-gradebook` locale bond.
 *
 * @param props - Component props (see {@link GpaCardProps}).
 * @returns The rendered GPA hero card.
 */
export const GpaCard: Component<GpaCardProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const ceiling = (): number =>
    typeof props.max === 'number' && props.max > 0 ? props.max : defaultGpaMax(props.scale)
  const formatted = (): string => formatGpa(props.gpa, props.scale)
  const formattedMax = (): string => formatGpa(ceiling(), props.scale)
  const titleText = (): string => t('gradebook.gpa.title', {}, { defaultValue: 'GPA' })
  const outOfText = (): string =>
    t('gradebook.gpa.outOf', { max: formattedMax() }, { defaultValue: 'out of {{max}}' })

  const trendKey = (): string | null =>
    props.trend === 'up'
      ? 'gradebook.gpa.trend.up'
      : props.trend === 'down'
        ? 'gradebook.gpa.trend.down'
        : props.trend === 'flat'
          ? 'gradebook.gpa.trend.flat'
          : null
  const trendDefault = (): string =>
    props.trend === 'up' ? 'Trending up' : props.trend === 'down' ? 'Trending down' : 'Steady'
  const trendText = (): string | null => {
    const key = trendKey()
    return key ? t(key, {}, { defaultValue: trendDefault() }) : null
  }
  const trendGlyph = (): string => (props.trend === 'up' ? '↑' : props.trend === 'down' ? '↓' : '→')

  return (
    <Card className={props.className}>
      <div class={cm.cn(cm.stack(2))} data-mol-id="gpa-card" role="region" aria-label={titleText()}>
        <span
          class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          data-mol-id="gpa-card-title"
        >
          {titleText()}
        </span>
        <div class={cm.flex({ align: 'baseline', gap: 'sm' })}>
          <span
            class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
            data-mol-id="gpa-card-value"
          >
            {formatted()}
          </span>
          <span class={cm.textSize('sm')} data-mol-id="gpa-card-out-of">
            {outOfText()}
          </span>
        </div>
        <Show when={trendText()}>
          <div
            class={cm.flex({ align: 'center', gap: 'sm' })}
            data-mol-id="gpa-card-trend"
            data-trend={props.trend}
          >
            <span aria-hidden="true">{trendGlyph()}</span>
            <span class={cm.textSize('xs')} data-mol-id="gpa-card-trend-text">
              {trendText()}
            </span>
            <PresentWhileNode node={props.trendLabel}>
              {(trendLabel) => (
                <span class={cm.textSize('xs')} data-mol-id="gpa-card-trend-label">
                  {trendLabel()}
                </span>
              )}
            </PresentWhileNode>
          </div>
        </Show>
      </div>
    </Card>
  )
}
