/**
 * Progress component.
 *
 * @module
 */

import { type Component, Show, splitProps } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { BaseProps, ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'

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
 * Renders the Progress component.
 * @param props - The component props.
 * @returns The rendered progress JSX.
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
  const { t } = useTranslation()
  const value = (): number => local.value
  const max = (): number => local.max ?? 100
  const percentage = (): number => Math.min(Math.max((value() / max()) * 100, 0), 100)

  return (
    <div
      class={cm.cn(cm.progressWrapper, local.className)}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
    >
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
        class={cm.cn(cm.progress(), cm.progressHeight(local.size ?? 'md'))}
        role="progressbar"
        // Clamp like the visual bar does — aria-valuenow outside
        // [valuemin, valuemax] is invalid ARIA and screen readers may
        // announce nonsense percentages (e.g. value=150 of max=100).
        aria-valuenow={local.indeterminate ? undefined : Math.min(Math.max(value(), 0), max())}
        aria-valuemin={0}
        aria-valuemax={max()}
        aria-label={local.label ?? t('ui.progress.label', undefined, { defaultValue: 'Progress' })}
      >
        <div
          class={cm.cn(
            cm.progressBar(),
            cm.progressColor(local.color ?? 'primary'),
            local.indeterminate && cm.progressIndeterminate,
          )}
          style={toStyleProps(
            local.indeterminate ? undefined : { transform: `translateX(-${100 - percentage()}%)` },
          )}
        />
      </div>
    </div>
  )
}
