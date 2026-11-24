import { type Component, createUniqueId, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ProgressBarProps } from './types.js'

/** The fill percentage React computes: `max === 0 ? 0 : clamp(0, 100, value / max * 100)`. */
const fillPercent = (value: number, max: number): number =>
  max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))

/**
 * Labeled progress bar with optional value display.
 *
 * Renders a `[label ... valueLabel]` header row above a track. The track
 * itself uses the wired ClassMap progress tokens — swap the ClassMap bond
 * to restyle without touching this component.
 *
 * The track always carries an accessible name (`aria-progressbar-name`):
 * `labelledBy` when given, else the rendered `label`, else
 * `t('progressBar.label', undefined, { defaultValue: 'Progress' })`, read
 * through `useTranslation()` so it follows a locale switch.
 *
 * This is the Solid counterpart of `@molecule/app-progress-bar-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link ProgressBarProps}).
 * @returns The rendered progress bar.
 */
export const ProgressBar: Component<ProgressBarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const nameId = createUniqueId()
  const max = (): number => props.max ?? 100
  const size = (): 'sm' | 'md' | 'lg' => props.size ?? 'md'
  const color = (): 'primary' | 'success' | 'warning' | 'error' | 'info' => props.color ?? 'primary'

  return (
    <ResolveNode node={props.label}>
      {(label, hasLabel) => (
        <ResolveNode node={props.valueLabel}>
          {(valueLabel, hasValueLabel) => {
            // The rendered label is the track's name unless an explicit labelledBy wins.
            const namedByLabel = (): boolean => props.labelledBy === undefined && hasLabel()
            return (
              <div class={cm.cn(cm.stack(2), props.className)}>
                <Show when={hasLabel() || hasValueLabel()}>
                  <div class={cm.flex({ justify: 'between', align: 'center' })}>
                    {hasLabel() ? (
                      <span
                        id={namedByLabel() ? nameId : undefined}
                        class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                      >
                        {label()}
                      </span>
                    ) : null}
                    {hasValueLabel() ? <span class={cm.textSize('sm')}>{valueLabel()}</span> : null}
                  </div>
                </Show>
                <div
                  class={cm.cn(cm.progress(), cm.progressHeight(size()))}
                  role="progressbar"
                  aria-valuenow={props.value}
                  aria-valuemin={0}
                  aria-valuemax={max()}
                  aria-labelledby={props.labelledBy ?? (namedByLabel() ? nameId : undefined)}
                  aria-label={
                    props.labelledBy === undefined && !hasLabel()
                      ? t('progressBar.label', undefined, { defaultValue: 'Progress' })
                      : undefined
                  }
                  aria-describedby={props.describedBy}
                >
                  <div
                    class={cm.cn(cm.progressBar(), cm.progressColor(color()))}
                    style={{ width: `${fillPercent(props.value, max())}%` }}
                  />
                </div>
              </div>
            )
          }}
        </ResolveNode>
      )}
    </ResolveNode>
  )
}
