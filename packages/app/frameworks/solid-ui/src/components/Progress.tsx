/**
 * Progress component.
 *
 * @module
 */

import { type Component, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { BaseProps, ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Props for the Progress component.
 */
export interface ProgressProps extends BaseProps {
  /**
   * Progress value (0-100).
   */
  value: number

  /**
   * Maximum value.
   */
  max?: number

  /**
   * Progress size.
   */
  size?: Size

  /**
   * Progress color.
   */
  color?: ColorVariant

  /**
   * Whether to show the value label.
   */
  showValue?: boolean

  /**
   * Accessible label.
   */
  label?: string

  /**
   * Whether the progress is indeterminate.
   */
  indeterminate?: boolean
}

/**
 * Progress component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Progress: Component<ProgressProps> = (props) => {
  const [local] = splitProps(props, [
    'value',
    'max',
    'size',
    'color',
    'showValue',
    'label',
    'indeterminate',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const max = (): number => local.max ?? 100
  const percentage = (): number => Math.min(Math.max((local.value / max()) * 100, 0), 100)

  return (
    <div class={cm.cn(cm.progressWrapper, local.className)} style={local.style} data-testid={local.testId}>
      <Show when={local.label || local.showValue}>
        <div class={cm.progressLabelContainer}>
          <Show when={local.label}>
            <span class={cm.progressLabelText}>{local.label}</span>
          </Show>
          <Show when={local.showValue}>
            <span class={cm.progressLabelText}>{Math.round(percentage())}%</span>
          </Show>
        </div>
      </Show>
      <div
        class={cm.cn(cm.progress(), cm.progressHeight(local.size || 'md'))}
        role="progressbar"
        aria-valuenow={local.indeterminate ? undefined : local.value}
        aria-valuemin={0}
        aria-valuemax={max()}
        aria-label={local.label ?? t('ui.progress.label', undefined, { defaultValue: 'Progress' })}
      >
        <div
          class={cm.cn(
            cm.progressBar(),
            cm.progressColor(local.color || 'primary'),
            local.indeterminate && cm.progressIndeterminate,
          )}
          style={
            local.indeterminate ? undefined : { transform: `translateX(-${100 - percentage()}%)` }
          }
        />
      </div>
    </div>
  )
}
