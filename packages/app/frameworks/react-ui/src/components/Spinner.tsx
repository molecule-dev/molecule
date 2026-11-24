/**
 * Spinner component.
 *
 * @module
 */

import React, { forwardRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { SpinnerProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Text } from '@molecule/app-ui-react/elements'

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
      <Box
        as="div"
        ref={ref}
        role="status"
        aria-label={label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
        className={classes}
        webStyle={{ ...style, ...colorStyle }}
        data-testid={testId}
        {...rootProps(rest)}
      >
        {label && (
          <Text as="span" className={cm.srOnly}>
            {label}
          </Text>
        )}
      </Box>
    )
  },
)

Spinner.displayName = 'Spinner'
