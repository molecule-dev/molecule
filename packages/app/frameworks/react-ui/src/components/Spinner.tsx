/**
 * Spinner component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { SpinnerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { rootProps } from '../utilities/rootProps.js'

/**
 * Spinner component.
 *
 * `automationId` renders as `data-mol-id`; `data-*` and `aria-*` props on the rest reach
 * the status element (a caller's `aria-label` replaces the default).
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps & { 'data-mol-id'?: string }>(
  ({ size = 'md', color, label, className, style, testId, ...rest }, ref) => {
    const { t } = useTranslation()
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
        {...(rootProps(rest) as React.HTMLAttributes<HTMLDivElement>)}
      >
        {label && <span className={cm.srOnly}>{label}</span>}
      </div>
    )
  },
)

Spinner.displayName = 'Spinner'
