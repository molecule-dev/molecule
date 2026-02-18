/**
 * Spinner component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { t } from '@molecule/app-i18n'
import type { SpinnerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Spinner component.
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', color, label, className, style, testId }, ref) => {
    const cm = getClassMap()
    const classes = cm.cn(cm.spinner({ size }), className)

    const colorStyle =
      color &&
      typeof color === 'string' &&
      !['primary', 'secondary', 'success', 'warning', 'error', 'info'].includes(color)
        ? { borderColor: color, borderTopColor: 'transparent' }
        : undefined

    return (
      <div
        ref={ref}
        role="status"
        aria-label={label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
        className={classes}
        style={{ ...style, ...colorStyle }}
        data-testid={testId}
      >
        {label && <span className={cm.srOnly}>{label}</span>}
      </div>
    )
  },
)

Spinner.displayName = 'Spinner'
