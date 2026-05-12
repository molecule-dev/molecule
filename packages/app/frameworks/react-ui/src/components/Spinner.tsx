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
 *
 * Extracts data-* and aria-* props from the rest spread so callers can
 * pass `data-mol-id`, custom `aria-*` overrides, etc. without forking.
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps & { 'data-mol-id'?: string }>(
  ({ size = 'md', color, label, className, style, testId, ...rest }, ref) => {
    const cm = getClassMap()
    const classes = cm.cn(cm.spinner({ size }), className)

    const colorStyle =
      color &&
      typeof color === 'string' &&
      !['primary', 'secondary', 'success', 'warning', 'error', 'info'].includes(color)
        ? { borderColor: color, borderTopColor: 'transparent' }
        : undefined

    const passthrough: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest as Record<string, unknown>)) {
      if (k.startsWith('data-') || k.startsWith('aria-')) passthrough[k] = v
    }

    return (
      <div
        ref={ref}
        role="status"
        aria-label={label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
        className={classes}
        style={{ ...style, ...colorStyle }}
        data-testid={testId}
        {...passthrough}
      >
        {label && <span className={cm.srOnly}>{label}</span>}
      </div>
    )
  },
)

Spinner.displayName = 'Spinner'
