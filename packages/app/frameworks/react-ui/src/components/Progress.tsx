/**
 * Progress component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { BaseProps, ColorVariant, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

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
      automationId,
    },
    ref,
  ) => {
    const { t } = useTranslation()
    const cm = getClassMap()
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    return (
      <Box
        as="div"
        ref={ref}
        className={cm.cn(cm.progressWrapper, className)}
        webStyle={style}
        data-testid={testId}
        data-mol-id={automationId}
      >
        {(label || showValue) && (
          <Box as="div" className={cm.progressLabelContainer}>
            {label && (
              <Text as="span" className={cm.progressLabelText}>
                {label}
              </Text>
            )}
            {showValue && (
              <Text as="span" className={cm.progressLabelText}>
                {Math.round(percentage)}%
              </Text>
            )}
          </Box>
        )}
        <Box
          as="div"
          className={cm.cn(cm.progress(), cm.progressHeight(size))}
          role="progressbar"
          // Clamp like the visual bar does — aria-valuenow outside
          // [valuemin, valuemax] is invalid ARIA and screen readers may
          // announce nonsense percentages (e.g. value=150 of max=100).
          aria-valuenow={indeterminate ? undefined : Math.min(Math.max(value, 0), max)}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label ?? t('ui.progress.label', undefined, { defaultValue: 'Progress' })}
        >
          <Box
            as="div"
            className={cm.cn(
              cm.progressBar(),
              cm.progressColor(color),
              indeterminate && cm.progressIndeterminate,
            )}
            webStyle={
              indeterminate ? undefined : { transform: `translateX(-${100 - percentage}%)` }
            }
          />
        </Box>
      </Box>
    )
  },
)

Progress.displayName = 'Progress'
