/**
 * Progress component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { t } from '@molecule/app-i18n'
import type { BaseProps, ColorVariant,Size } from '@molecule/app-ui'
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

// sizeHeightMap removed — use cm.progressHeight(size) instead
// colorMap removed — use cm.progressColor(color) instead

/**
 * Progress component.
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value,
      max = 100,
      size = 'md',
      color = 'primary',
      showValue,
      label,
      indeterminate,
      className,
      style,
      testId,
    },
    ref,
  ) => {
    const cm = getClassMap()
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <div ref={ref} className={cm.cn(cm.progressWrapper, className)} style={style} data-testid={testId}>
        {(label || showValue) && (
          <div className={cm.progressLabelContainer}>
            {label && <span className={cm.progressLabelText}>{label}</span>}
            {showValue && (
              <span className={cm.progressLabelText}>{Math.round(percentage)}%</span>
            )}
          </div>
        )}
        <div
          className={cm.cn(cm.progress(), cm.progressHeight(size))}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label ?? t('ui.progress.label', undefined, { defaultValue: 'Progress' })}
        >
          <div
            className={cm.cn(
              cm.progressBar(),
              cm.progressColor(color),
              indeterminate && cm.progressIndeterminate,
            )}
            style={indeterminate ? undefined : { transform: `translateX(-${100 - percentage}%)` }}
          />
        </div>
      </div>
    )
  },
)

Progress.displayName = 'Progress'
